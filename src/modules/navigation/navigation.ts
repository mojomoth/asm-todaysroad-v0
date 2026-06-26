// Navigation 모듈 — 최상위 시임 onLocationUpdate(lat, lon, accuracy).
// GPS 수신 → 맵매칭(단조 윈도우) → 턴 감지 → 음성/햅틱 안내 + 단순 시각모드 상태를 산출한다.
// 외부 의존(Voice/Haptic)은 인터페이스로 주입 → E2E 위치 시뮬레이션 + 단위 테스트 가능(SPEC).
//
// 실 GPS는 navigator.geolocation.watchPosition을 이 onLocationUpdate에 그대로 연결한다
// (useWalkNavigation 참조). 위치 입력이 잡음/sparse/비단조여도 동작하도록 설계했다(R1-1/R1-3).
import { pathLengthMeters, projectToPath } from '../course/geo'
import type { Course, LatLng } from '../course/types'
import { NoopHaptic, type Haptic } from './haptic'
import { SilentVoice, type VoiceController } from '../voice/voice'
import { extractTurns, type Turn, type TurnDirection } from './turns'

/** 턴 30m 전 발화(FR-6). */
export const ANNOUNCE_DISTANCE_M = 30
/** 종료점 도착 판정 거리(m). */
export const ARRIVE_DISTANCE_M = 20
/** 이 정확도(m)보다 나쁜(큰) GPS면 단순 시각모드로 자동 전환(FR-7). */
export const WEAK_GPS_ACCURACY_M = 25
/** 경로에서 이만큼(m) 벗어나면 경로 이탈로 보고 1회 안내(R1-5). */
export const OFF_ROUTE_M = 35
/** 단조 매처 윈도우 — 직전 세그먼트 기준 뒤로 1, 앞으로 12 세그먼트만 탐색(루프 스냅백 방지). */
export const BACK_WINDOW_SEG = 1
export const FWD_WINDOW_SEG = 12
/** 1회 갱신에서 허용하는 최대 전진(m). 전방 GPS 스파이크로 인한 조기 도착·턴 스킵 방어(R2-1). */
export const MAX_FORWARD_JUMP_M = 150
/** 턴을 "방금 지났다"로 보는 여유(m). 이 이상 지난 미발화 턴은 누락으로 집계. */
const PASS_TOLERANCE_M = 8

export type NavMode = 'voice' | 'visual'

export interface NextTurnView {
  direction: TurnDirection
  label: string
  /** 현재 위치에서 턴까지 남은 거리(m). */
  distanceM: number
}

export interface NavState {
  running: boolean
  /** voice: 음성 안내 중 / visual: 단순 시각모드(약신호 자동전환 또는 사용자 음성 off). */
  mode: NavMode
  totalM: number
  remainingM: number
  /** 진행률 0~1(단조 비감소). */
  progress: number
  /** 경로 이탈 수직거리(m). */
  offRouteM: number
  /** 경로 이탈 중인지(offRouteM > OFF_ROUTE_M). */
  offRoute: boolean
  weakGps: boolean
  nextTurn: NextTurnView | null
  arrived: boolean
}

/** 안내 품질 계측(AC-1 hit-rate, AC-3 검증용). */
export interface NavMetrics {
  totalTurns: number
  announcedTurns: number
  missedTurns: number
  /** 발화 성공률 = announced / total (턴 없으면 1). */
  hitRate: number
}

export interface NavigationDeps {
  course: Course
  voice?: VoiceController
  haptic?: Haptic
  /** 사용자가 음성 OFF를 선택했는지(산책 시작 시 1회 프롬프트). 기본 false=ON. */
  voiceMuted?: boolean
  onState?: (state: NavState) => void
}

export interface NavigationController {
  /** 최상위 시임 — GPS/시뮬레이션 위치 1건을 흘려보낸다. */
  onLocationUpdate(lat: number, lng: number, accuracyM: number): NavState
  start(): void
  stop(): void
  setVoiceMuted(muted: boolean): void
  getState(): NavState
  getMetrics(): NavMetrics
  readonly announcements: string[]
}

function roundTo10(m: number): number {
  return Math.round(m / 10) * 10
}

function turnPhrase(distanceM: number, label: string): string {
  if (distanceM <= 10) return `잠시 후 ${label}`
  return `${roundTo10(distanceM)}m 앞에서 ${label}`
}

export function createNavigation(deps: NavigationDeps): NavigationController {
  const course = deps.course
  const voice = deps.voice ?? new SilentVoice()
  const haptic = deps.haptic ?? new NoopHaptic()
  const path = course.pathCoordinates
  const totalM = pathLengthMeters(path)
  const turns: Turn[] = extractTurns(path)
  const announced = new Set<number>()
  const announcements: string[] = []

  let voiceMuted = deps.voiceMuted ?? false
  voice.setEnabled(!voiceMuted)

  // 단조 매처 상태.
  let lastSegment = 0
  let lastAlongM = 0
  let arrivedLatched = false
  let offRouteAnnounced = false
  let announcedTurns = 0
  let missedTurns = 0

  let state: NavState = {
    running: false,
    mode: voiceMuted ? 'visual' : 'voice',
    totalM,
    remainingM: totalM,
    progress: 0,
    offRouteM: 0,
    offRoute: false,
    weakGps: false,
    nextTurn: null,
    arrived: false,
  }

  const emit = () => deps.onState?.(state)

  function announce(text: string): void {
    announcements.push(text)
    voice.speak(text)
  }

  function onLocationUpdate(
    lat: number,
    lng: number,
    accuracyM: number,
  ): NavState {
    if (!state.running) return state
    const here: LatLng = { lat, lng }

    // 단조 윈도우 정사영 — 직전 진행도 근방에서만 매칭(루프/자기근접 스냅백 방지).
    const proj = projectToPath(here, path, {
      from: Math.max(0, lastSegment - BACK_WINDOW_SEG),
      to: lastSegment + FWD_WINDOW_SEG,
    })

    // 경로 이탈(R1-5) — 임계 초과면 off-route.
    const onRoute = proj.distanceM <= OFF_ROUTE_M
    const forwardJump = proj.alongM - lastAlongM

    // 진행은 on-route + 합리적 전진(0~MAX_JUMP)일 때만 수용해 단조 갱신(R2-1):
    //  - off-route 점은 진행을 고착시키지 않는다 → 정상 경로 복귀 시 자연 회복.
    //  - 전방 스파이크(과도한 점프)는 거부 → 조기 도착·턴 스킵 방어.
    if (onRoute && forwardJump >= 0 && forwardJump <= MAX_FORWARD_JUMP_M) {
      lastAlongM = proj.alongM
      lastSegment = Math.max(lastSegment, proj.segmentIndex)
    }
    const alongM = lastAlongM

    const remainingM = Math.max(0, totalM - alongM)
    const weakGps = accuracyM > WEAK_GPS_ACCURACY_M
    const mode: NavMode = weakGps || voiceMuted ? 'visual' : 'voice'

    const offRoute = !onRoute
    if (offRoute && !offRouteAnnounced) {
      offRouteAnnounced = true
      haptic.guide()
      announce('경로를 벗어났습니다. 길로 돌아가세요')
    } else if (!offRoute) {
      offRouteAnnounced = false
    }

    // 1) 이미 지나친 미발화 턴은 누락으로 집계(sparse fix/backward jump 대비, R1-10).
    for (const t of turns) {
      if (!announced.has(t.index) && t.alongM < alongM - PASS_TOLERANCE_M) {
        announced.add(t.index)
        missedTurns++
      }
    }

    // 2) 다가오는 턴 = 진행도 이후 첫 미발화 턴.
    let nextTurn: NextTurnView | null = null
    let pendingTurn: Turn | null = null
    for (const t of turns) {
      if (!announced.has(t.index) && t.alongM >= alongM - PASS_TOLERANCE_M) {
        const distToTurn = Math.max(0, Math.round(t.alongM - alongM))
        nextTurn = { direction: t.direction, label: t.label, distanceM: distToTurn }
        pendingTurn = t
        break
      }
    }

    // 3) 턴 30m 전 1회 발화(FR-6). 실거리 기반 문구(R1-10).
    if (pendingTurn && nextTurn && nextTurn.distanceM <= ANNOUNCE_DISTANCE_M) {
      announced.add(pendingTurn.index)
      announcedTurns++
      haptic.guide()
      announce(turnPhrase(nextTurn.distanceM, pendingTurn.label))
    }

    // 도착 래치 — 한 번 도착하면 유지.
    if (!arrivedLatched && remainingM <= ARRIVE_DISTANCE_M) {
      arrivedLatched = true
      haptic.arrive()
      announce('목적지에 도착했습니다')
    }

    state = {
      running: true,
      mode,
      totalM,
      remainingM,
      progress: totalM > 0 ? Math.min(1, alongM / totalM) : 0,
      offRouteM: Math.round(proj.distanceM),
      offRoute,
      weakGps,
      nextTurn: arrivedLatched ? null : nextTurn,
      arrived: arrivedLatched,
    }
    emit()
    return state
  }

  function resetProgress(): void {
    lastSegment = 0
    lastAlongM = 0
    arrivedLatched = false
    offRouteAnnounced = false
    announcedTurns = 0
    missedTurns = 0
    announced.clear()
  }

  return {
    onLocationUpdate,
    start() {
      resetProgress()
      state = {
        ...state,
        running: true,
        arrived: false,
        progress: 0,
        remainingM: totalM,
      }
      if (!voiceMuted) announce(`${course.name} 안내를 시작합니다`)
      emit()
    },
    stop() {
      state = { ...state, running: false }
      voice.cancel()
      emit()
    },
    setVoiceMuted(muted: boolean) {
      voiceMuted = muted
      voice.setEnabled(!muted)
      state = { ...state, mode: muted ? 'visual' : state.mode }
      emit()
    },
    getState: () => state,
    getMetrics() {
      const total = turns.length
      return {
        totalTurns: total,
        announcedTurns,
        missedTurns,
        hitRate: total === 0 ? 1 : announcedTurns / total,
      }
    },
    announcements,
  }
}
