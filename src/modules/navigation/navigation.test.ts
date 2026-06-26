import { describe, expect, it } from 'vitest'
import { destinationPoint, pathLengthMeters } from '../course/geo'
import { computeMetrics } from '../course/metrics'
import type { Course, LatLng } from '../course/types'
import { SilentVoice } from '../voice/voice'
import {
  ANNOUNCE_DISTANCE_M,
  createNavigation,
  WEAK_GPS_ACCURACY_M,
} from './navigation'

// L자 테스트 코스: A →(동 100m)→ B →(북 100m)→ C. B에서 좌회전.
const A: LatLng = { lat: 37.5, lng: 127.03 }
const B = destinationPoint(A, 90, 100)
const C = destinationPoint(B, 0, 100)
const PATH = [A, B, C]

function testCourse(): Course {
  return {
    id: 'test-L',
    name: '테스트 L코스',
    address: '테스트',
    type: 'a-b',
    source: 'curated',
    pathCoordinates: PATH,
    metrics: computeMetrics(PATH),
    sentimentTags: [],
    pois: [],
  }
}

/** alongM(경로 진행거리) 위치 좌표. */
function posAt(alongM: number): LatLng {
  if (alongM <= 100) return destinationPoint(A, 90, alongM)
  return destinationPoint(B, 0, alongM - 100)
}

describe('createNavigation — onLocationUpdate 시임', () => {
  it('시작 전에는 위치 갱신을 무시한다', () => {
    const nav = createNavigation({ course: testCourse() })
    const s = nav.onLocationUpdate(A.lat, A.lng, 5)
    expect(s.running).toBe(false)
  })

  it('FR-6: 턴 30m 전에 좌회전을 1회 발화한다', () => {
    const voice = new SilentVoice()
    const nav = createNavigation({ course: testCourse(), voice })
    nav.start()

    // 턴(alongM≈100)까지 25m 남은 지점 → 발화
    nav.onLocationUpdate(posAt(75).lat, posAt(75).lng, 5)
    const turnMsg = `${ANNOUNCE_DISTANCE_M}m 앞에서 좌회전`
    expect(voice.spoken).toContain(turnMsg)

    // 한 번 더 근접해도 중복 발화하지 않음
    const before = voice.spoken.filter((s) => s === turnMsg).length
    nav.onLocationUpdate(posAt(85).lat, posAt(85).lng, 5)
    const after = voice.spoken.filter((s) => s === turnMsg).length
    expect(after).toBe(before)
  })

  it('종료점 도착 시 arrived=true + 도착 안내', () => {
    const voice = new SilentVoice()
    const nav = createNavigation({ course: testCourse(), voice })
    nav.start()
    // 점진 보행으로 종점까지(현실적 GPS 스트림).
    let s = nav.getState()
    for (let along = 0; along <= 200; along += 20) {
      s = nav.onLocationUpdate(posAt(along).lat, posAt(along).lng, 5)
    }
    expect(s.arrived).toBe(true)
    expect(voice.spoken.some((t) => t.includes('도착'))).toBe(true)
  })

  it('FR-7: 약신호(정확도 나쁨)면 단순 시각모드로 자동 전환', () => {
    const nav = createNavigation({ course: testCourse() })
    nav.start()
    const good = nav.onLocationUpdate(posAt(10).lat, posAt(10).lng, 5)
    expect(good.mode).toBe('voice')
    const weak = nav.onLocationUpdate(
      posAt(20).lat,
      posAt(20).lng,
      WEAK_GPS_ACCURACY_M + 10,
    )
    expect(weak.mode).toBe('visual')
    expect(weak.weakGps).toBe(true)
  })

  it('음성 OFF(voiceMuted)면 시각모드 + 발화 없음', () => {
    const voice = new SilentVoice()
    const nav = createNavigation({
      course: testCourse(),
      voice,
      voiceMuted: true,
    })
    nav.start()
    nav.onLocationUpdate(posAt(75).lat, posAt(75).lng, 5)
    expect(nav.getState().mode).toBe('visual')
    expect(voice.spoken.length).toBe(0)
  })

  it('진행률/남은거리가 위치에 따라 갱신된다', () => {
    const total = pathLengthMeters(PATH)
    const nav = createNavigation({ course: testCourse() })
    nav.start()
    const mid = nav.onLocationUpdate(posAt(100).lat, posAt(100).lng, 5)
    expect(mid.progress).toBeCloseTo(0.5, 1)
    expect(mid.remainingM).toBeCloseTo(total - 100, -1)
  })
})
