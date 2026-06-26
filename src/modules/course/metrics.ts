// 메트릭 결정론적 재계산 — SPEC §7 / PRD 공식 그대로 구현.
// 모든 값은 잠정값(베타 실측 ±15% 보정 예정, 미검증).
import { haversineMeters } from './geo'
import type { CourseMetrics, LatLng } from './types'

/** 보행 보폭(m). 걸음수 = 거리(m)/STRIDE_M. */
export const STRIDE_M = 0.68

/** 속도(km/h) — 경사도 임계 ±5%로 평탄/상향/하향 구분. */
export const SPEED_FLAT_KMH = 4.5
export const SPEED_UP_KMH = 3
export const SPEED_DOWN_KMH = 5
export const GRADE_THRESHOLD = 0.05

/** 고도보정 — 상승 100m당 +6분, 하강 100m당 -3분. */
export const UPHILL_MIN_PER_100M = 6
export const DOWNHILL_MIN_PER_100M = 3

function speedForGrade(grade: number): number {
  if (grade > GRADE_THRESHOLD) return SPEED_UP_KMH
  if (grade < -GRADE_THRESHOLD) return SPEED_DOWN_KMH
  return SPEED_FLAT_KMH
}

const round2 = (n: number): number => Math.round(n * 100) / 100

/**
 * 경로좌표(+선택 고도)에서 메트릭을 재계산한다.
 * - 거리: Haversine 누적.
 * - 예상시간: Σ(세그먼트거리/세그먼트속도) + 고도보정. (SPEC 공식)
 * - 걸음수: 거리(m)/0.68.
 * - 고도상승: 양(+) 고도차 합.
 */
export function computeMetrics(
  path: LatLng[],
  elevations?: number[],
): CourseMetrics {
  let distanceM = 0
  let baseMin = 0
  let gainM = 0
  let lossM = 0

  for (let i = 1; i < path.length; i++) {
    const segM = haversineMeters(path[i - 1], path[i])
    distanceM += segM

    let grade = 0
    if (elevations && elevations.length === path.length && segM > 0) {
      const dz = elevations[i] - elevations[i - 1]
      grade = dz / segM
      if (dz > 0) gainM += dz
      else lossM += -dz
    }
    const speed = speedForGrade(grade)
    baseMin += (segM / 1000 / speed) * 60
  }

  const elevationCorrectionMin =
    (gainM / 100) * UPHILL_MIN_PER_100M - (lossM / 100) * DOWNHILL_MIN_PER_100M

  const estimatedMin = Math.max(1, Math.round(baseMin + elevationCorrectionMin))
  const stepCount = Math.round(distanceM / STRIDE_M)

  return {
    distanceKm: round2(distanceM / 1000),
    estimatedMin,
    stepCount,
    elevationGainM: Math.round(gainM),
  }
}
