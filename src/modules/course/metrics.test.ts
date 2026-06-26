import { describe, expect, it } from 'vitest'
import { destinationPoint } from './geo'
import { computeMetrics, STRIDE_M } from './metrics'
import type { LatLng } from './types'

const START: LatLng = { lat: 37.4979, lng: 127.0276 }

function straightPath(distanceM: number, points = 5): LatLng[] {
  const path: LatLng[] = [START]
  const step = distanceM / (points - 1)
  for (let i = 1; i < points; i++) {
    path.push(destinationPoint(START, 90, step * i))
  }
  return path
}

describe('computeMetrics', () => {
  it('평탄 1km 경로: 거리/걸음수/예상시간 결정론', () => {
    const m = computeMetrics(straightPath(1000))
    expect(m.distanceKm).toBeCloseTo(1.0, 1)
    // 걸음수 = 1000/0.68 ≈ 1471
    expect(m.stepCount).toBe(Math.round(1000 / STRIDE_M))
    // 평탄 4.5km/h → 1km = 13.3분 → 13
    expect(m.estimatedMin).toBe(13)
    expect(m.elevationGainM).toBe(0)
  })

  it('고도 상승이 있으면 예상시간이 늘고 elevationGain 반영', () => {
    const path = straightPath(1000, 3)
    const flat = computeMetrics(path)
    // 두 구간에 각 +50m 상승 → 총 +100m → 보정 +6분(상향속도까지 더 느려짐)
    const uphill = computeMetrics(path, [0, 50, 100])
    expect(uphill.elevationGainM).toBe(100)
    expect(uphill.estimatedMin).toBeGreaterThan(flat.estimatedMin)
  })

  it('빈/단일 좌표는 0 메트릭', () => {
    expect(computeMetrics([]).distanceKm).toBe(0)
    expect(computeMetrics([START]).stepCount).toBe(0)
  })
})
