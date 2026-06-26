// 표시용 포맷 헬퍼.
import type { CourseMetrics } from '../modules/course/types'

export function formatKm(km: number): string {
  return `${km.toFixed(2)}km`
}

export function formatSteps(steps: number): string {
  return `${steps.toLocaleString('ko-KR')}걸음`
}

export function formatMin(min: number): string {
  return `${min}분`
}

/** 남은 거리 — 1km 미만은 m, 이상은 km. */
export function formatDistanceM(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10}m`
  return `${(m / 1000).toFixed(1)}km`
}

export interface FormattedMetrics {
  distance: string
  steps: string
  time: string
}

export function formatMetrics(m: CourseMetrics): FormattedMetrics {
  return {
    distance: formatKm(m.distanceKm),
    steps: formatSteps(m.stepCount),
    time: formatMin(m.estimatedMin),
  }
}
