// 잡음 replay 테스트 — 실 GPS의 측위오차/sparse fix/backward jitter를 모사해
// navigation의 강건성(AC-1 hit-rate, 진행 단조성, 도착 래치)을 정량 검증한다(R1-1).
import { describe, expect, it } from 'vitest'
import {
  destinationPoint,
  pathLengthMeters,
  pointAlongPath,
} from '../course/geo'
import { COURSES } from '../course/data/courses'
import type { Course } from '../course/types'
import { SilentVoice } from '../voice/voice'
import { createNavigation } from './navigation'

/** 결정론적 의사난수(LCG) — 테스트 재현성. */
function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

interface NoiseOpts {
  accuracyM: number // 측위오차 크기
  stepM: number // 평균 전진
  dropProb: number // sparse: 샘플 누락 확률
  seed: number
}

function walkNoisy(course: Course, o: NoiseOpts) {
  const rand = lcg(o.seed)
  const voice = new SilentVoice()
  const nav = createNavigation({ course, voice })
  nav.start()
  const total = pathLengthMeters(course.pathCoordinates)
  let along = 0
  let prevProgress = 0
  let monotonic = true
  let guard = 0
  while (along < total && guard++ < 5000) {
    // 전진 + 가끔 약간의 후퇴 jitter.
    const jitter = (rand() - 0.35) * o.stepM
    along = Math.max(0, Math.min(total, along + o.stepM + jitter))
    if (rand() < o.dropProb) continue // sparse: 이 fix는 누락

    const onPath = pointAlongPath(course.pathCoordinates, along)
    // 경로에 수직 잡음(±accuracy).
    const bearing = rand() * 360
    const noiseM = rand() * o.accuracyM
    const noisy = destinationPoint(onPath, bearing, noiseM)
    const s = nav.onLocationUpdate(noisy.lat, noisy.lng, o.accuracyM)
    if (s.progress < prevProgress - 1e-9) monotonic = false
    prevProgress = s.progress
  }
  // 종점 보장 fix.
  const end = pointAlongPath(course.pathCoordinates, total)
  nav.onLocationUpdate(end.lat, end.lng, o.accuracyM)
  return { nav, voice, monotonic }
}

describe('navigation 잡음 replay — 실 GPS 모사', () => {
  it('±15m 측위오차 + 10% sparse에서도 진행 단조 + 도착 래치', () => {
    for (const course of COURSES) {
      const { nav, monotonic } = walkNoisy(course, {
        accuracyM: 15,
        stepM: 10,
        dropProb: 0.1,
        seed: 42,
      })
      expect(monotonic).toBe(true)
      expect(nav.getState().arrived).toBe(true)
    }
  })

  it('잡음 하에서도 모든 턴이 발화 또는 누락으로 집계(영구 재검출/무한루프 없음)', () => {
    for (const course of COURSES) {
      const { nav } = walkNoisy(course, {
        accuracyM: 15,
        stepM: 10,
        dropProb: 0.1,
        seed: 7,
      })
      const m = nav.getMetrics()
      expect(m.announcedTurns + m.missedTurns).toBe(m.totalTurns)
    }
  })

  it('적당한 잡음에서 hit-rate가 AC-1 임계(≥0.75) 이상', () => {
    // a-b 다턴 코스로 측정. (NFR-2의 0.90은 실 GPS 현장검증으로 닫는 게이트 — ISSUES 참조)
    const course = COURSES.find((c) => c.id === 'c2-gangnam-downtown')!
    const { nav } = walkNoisy(course, {
      accuracyM: 12,
      stepM: 8,
      dropProb: 0.05,
      seed: 123,
    })
    const m = nav.getMetrics()
    expect(m.totalTurns).toBeGreaterThan(5)
    expect(m.hitRate).toBeGreaterThanOrEqual(0.75)
  })
})
