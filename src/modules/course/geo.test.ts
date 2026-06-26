import { describe, expect, it } from 'vitest'
import {
  angleDelta,
  bearingDegrees,
  destinationPoint,
  haversineMeters,
  pathLengthMeters,
  projectToPath,
} from './geo'
import type { LatLng } from './types'

const GANGNAM: LatLng = { lat: 37.4979, lng: 127.0276 }

describe('haversineMeters', () => {
  it('같은 점은 0', () => {
    expect(haversineMeters(GANGNAM, GANGNAM)).toBe(0)
  })

  it('약 1km 떨어진 점을 ±2% 이내로 계산', () => {
    const north = destinationPoint(GANGNAM, 0, 1000)
    expect(haversineMeters(GANGNAM, north)).toBeCloseTo(1000, -1)
  })
})

describe('destinationPoint', () => {
  it('지정한 거리만큼 떨어진 좌표를 만든다(왕복 일치)', () => {
    for (const bearing of [0, 90, 180, 270, 45]) {
      const p = destinationPoint(GANGNAM, bearing, 500)
      expect(haversineMeters(GANGNAM, p)).toBeCloseTo(500, 0)
    }
  })
})

describe('bearingDegrees / angleDelta', () => {
  it('정북 방위는 ~0도', () => {
    const north = destinationPoint(GANGNAM, 0, 200)
    expect(bearingDegrees(GANGNAM, north)).toBeCloseTo(0, 0)
  })
  it('정동 방위는 ~90도', () => {
    const east = destinationPoint(GANGNAM, 90, 200)
    expect(bearingDegrees(GANGNAM, east)).toBeCloseTo(90, 0)
  })
  it('angleDelta는 0~180 범위로 정규화', () => {
    expect(angleDelta(10, 350)).toBeCloseTo(20)
    expect(angleDelta(0, 180)).toBe(180)
  })
})

describe('pathLengthMeters', () => {
  it('직선 2구간 길이 합', () => {
    const a = GANGNAM
    const b = destinationPoint(a, 90, 300)
    const c = destinationPoint(b, 90, 200)
    expect(pathLengthMeters([a, b, c])).toBeCloseTo(500, 0)
  })
})

describe('projectToPath', () => {
  it('경로 위 점은 거의 0의 수직거리', () => {
    const a = GANGNAM
    const b = destinationPoint(a, 90, 400)
    const onPath = destinationPoint(a, 90, 200)
    const r = projectToPath(onPath, [a, b])
    expect(r.distanceM).toBeLessThan(2)
    expect(r.alongM).toBeCloseTo(200, -1)
  })

  it('경로에서 벗어난 점의 수직거리·진행거리 추정', () => {
    const a = GANGNAM
    const b = destinationPoint(a, 90, 400) // 동쪽 400m
    const mid = destinationPoint(a, 90, 200)
    const off = destinationPoint(mid, 0, 50) // 북쪽 50m 이탈
    const r = projectToPath(off, [a, b])
    expect(r.distanceM).toBeCloseTo(50, -1)
    expect(r.alongM).toBeCloseTo(200, -1)
    expect(r.segmentIndex).toBe(0)
  })

  it('다중 세그먼트에서 올바른 세그먼트·진행거리', () => {
    const a = GANGNAM
    const b = destinationPoint(a, 90, 200)
    const c = destinationPoint(b, 0, 200)
    const d = destinationPoint(c, 90, 200)
    const onThird = destinationPoint(c, 90, 100) // 3번째 세그먼트 중간
    const r = projectToPath(onThird, [a, b, c, d])
    expect(r.segmentIndex).toBe(2)
    expect(r.alongM).toBeCloseTo(500, -1)
  })

  it('윈도우 range를 주면 종점이 시작점 근처인 루프에서 스냅백을 막는다', () => {
    // 사각 루프: 종점이 시작점과 동일.
    const a = GANGNAM
    const b = destinationPoint(a, 90, 200)
    const c = destinationPoint(b, 0, 200)
    const d = destinationPoint(c, 270, 200)
    const loop = [a, b, c, d, a] // 마지막=시작
    // 종점 근처 점. 윈도우 없으면 전역최단이 segment 0(시작)으로 스냅될 수 있음.
    const nearEnd = destinationPoint(a, 0, 30) // 시작점 북쪽 30m = 마지막 세그먼트(d→a) 위 근처
    const windowed = projectToPath(nearEnd, loop, { from: 2, to: 3 })
    // 윈도우 [2,3]이면 마지막 세그먼트(3: d→a)에서 매칭 → alongM이 거의 전체.
    expect(windowed.segmentIndex).toBeGreaterThanOrEqual(2)
    expect(windowed.alongM).toBeGreaterThan(500)
  })

  it('range는 alongM을 절대 진행거리로 유지한다', () => {
    const a = GANGNAM
    const b = destinationPoint(a, 90, 200)
    const c = destinationPoint(b, 90, 200)
    const onSecond = destinationPoint(b, 90, 100)
    const r = projectToPath(onSecond, [a, b, c], { from: 1, to: 1 })
    expect(r.segmentIndex).toBe(1)
    expect(r.alongM).toBeCloseTo(300, -1)
  })
})
