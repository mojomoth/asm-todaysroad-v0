// 산책 네비게이션 훅 — 동일한 onLocationUpdate 시임에 위치를 흘려보낸다.
//  - simulate=true(데모): 코스 경로를 따라 setInterval로 합성 위치 주입.
//  - simulate=false(실기기): navigator.geolocation.watchPosition을 그대로 연결(R1-1 실 GPS 연동).
import { useEffect, useRef, useState } from 'react'
import { pathLengthMeters, pointAlongPath } from '../../modules/course/geo'
import type { Course, LatLng } from '../../modules/course/types'
import {
  createNavigation,
  type NavState,
  type NavigationController,
} from '../../modules/navigation/navigation'
import { VibrationHaptic } from '../../modules/navigation/haptic'
import { WebSpeechVoice } from '../../modules/voice/voice'

/** 시뮬레이션 보행 속도(m/tick). 데모용 가속. */
const STEP_M = 12
const TICK_MS = 350

export interface WalkNav {
  state: NavState | null
  voiceMuted: boolean
  toggleVoice: () => void
  current: LatLng | null
  /** 실 GPS 모드에서 위치 추적 실패(권한/미지원). */
  gpsError: string | null
  /** 음성 ON인데 이 기기에 한국어 TTS가 없어 무음일 때(시각 모드 안내, R2-2). */
  voiceUnavailable: boolean
}

export function useWalkNavigation(
  course: Course | null,
  active: boolean,
  initialVoiceOn: boolean,
  simulate = true,
): WalkNav {
  const [state, setState] = useState<NavState | null>(null)
  const [voiceMuted, setVoiceMuted] = useState(!initialVoiceOn)
  const [current, setCurrent] = useState<LatLng | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [voiceUnavailable, setVoiceUnavailable] = useState(false)
  const ctrlRef = useRef<NavigationController | null>(null)

  useEffect(() => {
    if (!active || !course) {
      setState(null)
      setCurrent(null)
      setGpsError(null)
      setVoiceUnavailable(false)
      return
    }
    setVoiceMuted(!initialVoiceOn)
    const voice = new WebSpeechVoice()
    const ctrl = createNavigation({
      course,
      voice,
      haptic: new VibrationHaptic(),
      voiceMuted: !initialVoiceOn,
      onState: setState,
    })
    ctrlRef.current = ctrl
    ctrl.start()

    // 음성 ON인데 ko-KR TTS가 없으면 고지(보이스 목록은 async 로드 → 잠시 후 확인, R2-2).
    let voiceCheck: ReturnType<typeof setTimeout> | undefined
    if (initialVoiceOn) {
      voiceCheck = setTimeout(() => {
        setVoiceUnavailable(!(voice.supported && voice.hasKoreanVoice))
      }, 800)
    }

    let cleanup = () => {}

    if (simulate) {
      const total = pathLengthMeters(course.pathCoordinates)
      let along = 0
      const timer = setInterval(() => {
        along = Math.min(total, along + STEP_M)
        const pos = pointAlongPath(course.pathCoordinates, along)
        setCurrent(pos)
        // 중반(40~55%)은 약신호로 시뮬레이션 → 단순 시각모드 자동 전환(FR-7 데모).
        const ratio = total > 0 ? along / total : 1
        const accuracy = ratio > 0.4 && ratio < 0.55 ? 40 : 6
        ctrl.onLocationUpdate(pos.lat, pos.lng, accuracy)
        if (along >= total) clearInterval(timer)
      }, TICK_MS)
      cleanup = () => clearInterval(timer)
    } else if (
      typeof navigator !== 'undefined' &&
      'geolocation' in navigator
    ) {
      // 실 GPS: 동일 시임에 watchPosition을 연결. 잡음/sparse/비단조는 navigation이 흡수.
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const here = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setCurrent(here)
          ctrl.onLocationUpdate(here.lat, here.lng, pos.coords.accuracy ?? 20)
        },
        (err) => setGpsError(err.message),
        // AC-4(락온 ≤5초)에 맞춰 timeout 정렬(R2-9).
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 },
      )
      cleanup = () => navigator.geolocation.clearWatch(watchId)
    } else {
      setGpsError('이 기기에서 위치 추적을 지원하지 않습니다.')
    }

    return () => {
      if (voiceCheck) clearTimeout(voiceCheck)
      cleanup()
      ctrl.stop()
      ctrlRef.current = null
    }
  }, [course, active, initialVoiceOn, simulate])

  const toggleVoice = () => {
    setVoiceMuted((m) => {
      const next = !m
      ctrlRef.current?.setVoiceMuted(next)
      return next
    })
  }

  return { state, voiceMuted, toggleVoice, current, gpsError, voiceUnavailable }
}
