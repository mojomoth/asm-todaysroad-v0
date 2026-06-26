// 경로 이탈(R1-5) 동작 + 회복 latch 방어(R2-1) 회귀 테스트.
import { describe, expect, it } from 'vitest'
import {
  destinationPoint,
  pathLengthMeters,
  pointAlongPath,
} from '../course/geo'
import { COURSES } from '../course/data/courses'
import { SilentVoice } from '../voice/voice'
import { createNavigation, OFF_ROUTE_M } from './navigation'

const course = COURSES.find((c) => c.id === 'c2-gangnam-downtown')!
const path = course.pathCoordinates
const total = pathLengthMeters(path)

function navAt() {
  const voice = new SilentVoice()
  const nav = createNavigation({ course, voice })
  nav.start()
  return { nav, voice }
}

/** alongM까지 점진 보행으로 도달. */
function walkTo(nav: ReturnType<typeof navAt>['nav'], alongM: number) {
  for (let a = 0; a <= alongM; a += 8) {
    const p = pointAlongPath(path, a)
    nav.onLocationUpdate(p.lat, p.lng, 6)
  }
}

describe('경로 이탈 감지 + 회복 (R1-5 / R2-1)', () => {
  it('임계(35m) 초과 시 offRoute=true + 1회 안내', () => {
    const { nav, voice } = navAt()
    walkTo(nav, total * 0.3)
    const onPath = pointAlongPath(path, total * 0.3)
    const off = destinationPoint(onPath, 0, OFF_ROUTE_M + 30) // 65m 이탈
    const s = nav.onLocationUpdate(off.lat, off.lng, 6)
    expect(s.offRoute).toBe(true)
    expect(voice.spoken.some((t) => t.includes('경로를 벗어'))).toBe(true)
  })

  it('이탈 중 진행도가 고착되지 않고, 복귀하면 offRoute 해제 + 진행 지속(latch 방어)', () => {
    const { nav } = navAt()
    walkTo(nav, total * 0.3)
    const beforeProgress = nav.getState().progress

    // 멀리 이탈(전방으로 80m 튐) — 진행 고착/조기도착 유발 시도.
    const onPath = pointAlongPath(path, total * 0.3)
    const off = destinationPoint(onPath, 0, 80)
    const offState = nav.onLocationUpdate(off.lat, off.lng, 6)
    expect(offState.offRoute).toBe(true)
    // 이탈 점은 진행을 전진시키지 않는다(고착 없음).
    expect(offState.progress).toBeCloseTo(beforeProgress, 5)
    expect(offState.arrived).toBe(false)

    // 정상 경로로 복귀 → offRoute 해제, 진행 계속.
    const back = pointAlongPath(path, total * 0.35)
    const backState = nav.onLocationUpdate(back.lat, back.lng, 6)
    expect(backState.offRoute).toBe(false)
    expect(backState.progress).toBeGreaterThan(beforeProgress)
  })

  it('전방 GPS 스파이크(과도한 점프)는 조기 도착을 유발하지 않는다', () => {
    const { nav } = navAt()
    walkTo(nav, total * 0.2)
    // 종점 부근으로 순간이동하는 on-route 스파이크.
    const spike = pointAlongPath(path, total - 5)
    const s = nav.onLocationUpdate(spike.lat, spike.lng, 6)
    expect(s.arrived).toBe(false)
    expect(s.progress).toBeLessThan(0.5)
  })
})
