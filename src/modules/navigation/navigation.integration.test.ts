// 통합 테스트 — 실 큐레이션 COURSES를 navigation에 직접 통과시켜 AC-1을 정량 검증한다.
// (라운드1 리뷰 R1-6: 합성 L-경로만 테스트하던 공백 해소)
import { describe, expect, it } from 'vitest'
import { pathLengthMeters, pointAlongPath } from '../course/geo'
import { COURSES } from '../course/data/courses'
import type { Course } from '../course/types'
import { SilentVoice } from '../voice/voice'
import { createNavigation } from './navigation'

/** 코스를 깨끗한(잡음 0) 보행으로 종주하며 상태를 수집. */
function walkClean(course: Course, stepM = 8) {
  const voice = new SilentVoice()
  const nav = createNavigation({ course, voice })
  nav.start()
  const total = pathLengthMeters(course.pathCoordinates)
  let prevProgress = 0
  let monotonic = true
  for (let along = 0; along <= total; along += stepM) {
    const pos = pointAlongPath(course.pathCoordinates, Math.min(along, total))
    const s = nav.onLocationUpdate(pos.lat, pos.lng, 6)
    if (s.progress < prevProgress - 1e-9) monotonic = false
    prevProgress = s.progress
  }
  // 종점 정확히 1회 더.
  const end = pointAlongPath(course.pathCoordinates, total)
  nav.onLocationUpdate(end.lat, end.lng, 6)
  return { nav, voice, monotonic, total }
}

describe('navigation 통합 — 실 COURSES 종주', () => {
  it('모든 코스가 검출 가능한 턴을 가진다(AC-1 양성 사례 존재)', () => {
    for (const course of COURSES) {
      const { nav } = walkClean(course)
      expect(nav.getMetrics().totalTurns).toBeGreaterThan(0)
    }
  })

  it('깨끗한 보행에서 모든 턴을 누락 없이 발화(hit-rate=1)', () => {
    for (const course of COURSES) {
      const { nav } = walkClean(course)
      const m = nav.getMetrics()
      expect(m.missedTurns).toBe(0)
      expect(m.hitRate).toBe(1)
      expect(m.announcedTurns).toBe(m.totalTurns)
    }
  })

  it('진행률이 단조 비감소(루프 폐합 포함)', () => {
    for (const course of COURSES) {
      const { monotonic } = walkClean(course)
      expect(monotonic).toBe(true)
    }
  })

  it('종점에서 도착이 래치된다(루프 c1·c4 포함)', () => {
    for (const course of COURSES) {
      const { nav } = walkClean(course)
      expect(nav.getState().arrived).toBe(true)
    }
  })

  it('루프 코스에서 진행 중 도착이 조기 발화되지 않는다', () => {
    const loop = COURSES.find((c) => c.type === 'loop')!
    const voice = new SilentVoice()
    const nav = createNavigation({ course: loop, voice })
    nav.start()
    const total = pathLengthMeters(loop.pathCoordinates)
    // 점진 보행으로 절반 지점까지 — 시작점 근처로 돌아오지 않았으니 arrived=false여야.
    let s = nav.getState()
    for (let along = 0; along <= total / 2; along += 8) {
      const p = pointAlongPath(loop.pathCoordinates, along)
      s = nav.onLocationUpdate(p.lat, p.lng, 6)
    }
    expect(s.arrived).toBe(false)
    expect(s.progress).toBeGreaterThan(0.3)
    expect(s.progress).toBeLessThan(0.7)
  })
})
