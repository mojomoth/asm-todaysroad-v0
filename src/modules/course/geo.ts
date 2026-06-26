// 순수 지오메트리 헬퍼 — 외부 의존 없음. 단위 테스트 대상.
import type { LatLng } from './types'

const EARTH_RADIUS_M = 6371008.8

const toRad = (deg: number): number => (deg * Math.PI) / 180

/** 두 좌표 간 대원거리(미터) — Haversine. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** 경로(좌표열)의 누적 길이(미터). */
export function pathLengthMeters(path: LatLng[]): number {
  let total = 0
  for (let i = 1; i < path.length; i++) {
    total += haversineMeters(path[i - 1], path[i])
  }
  return total
}

/** 경로 시작점부터 alongM(미터)만큼 진행한 지점의 좌표. E2E 위치 시뮬레이션에 사용. */
export function pointAlongPath(path: LatLng[], alongM: number): LatLng {
  if (path.length === 0) throw new Error('empty path')
  if (path.length === 1 || alongM <= 0) return path[0]
  let remaining = alongM
  for (let i = 1; i < path.length; i++) {
    const segM = haversineMeters(path[i - 1], path[i])
    if (remaining <= segM) {
      const t = segM === 0 ? 0 : remaining / segM
      const a = path[i - 1]
      const b = path[i]
      return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }
    }
    remaining -= segM
  }
  return path[path.length - 1]
}

/** 두 좌표 간 방위각(도, 0=북, 시계방향). 턴 감지에 사용. */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const dLng = toRad(b.lng - a.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  const deg = (Math.atan2(y, x) * 180) / Math.PI
  return (deg + 360) % 360
}

/** 두 방위각 사이의 최소 회전 각도(0~180). */
export function angleDelta(b1: number, b2: number): number {
  const d = Math.abs(b1 - b2) % 360
  return d > 180 ? 360 - d : d
}

/** 시작점에서 방위(도)·거리(m)만큼 떨어진 좌표. 코스 데이터 생성에 사용. */
export function destinationPoint(
  from: LatLng,
  bearingDeg: number,
  distanceM: number,
): LatLng {
  const ang = distanceM / EARTH_RADIUS_M
  const brng = toRad(bearingDeg)
  const lat1 = toRad(from.lat)
  const lng1 = toRad(from.lng)
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(ang) +
      Math.cos(lat1) * Math.sin(ang) * Math.cos(brng),
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(ang) * Math.cos(lat1),
      Math.cos(ang) - Math.sin(lat1) * Math.sin(lat2),
    )
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI }
}

export interface ProjectionResult {
  /** 경로 위 가장 가까운 점. */
  point: LatLng
  /** 그 점까지의 수직 거리(미터) — 맵매칭 오차 추정. */
  distanceM: number
  /** 경로 시작점부터 그 점까지의 누적 거리(미터). */
  alongM: number
  /** 가장 가까운 세그먼트 인덱스(path[segIndex] → path[segIndex+1]). */
  segmentIndex: number
}

/** 정사영 탐색 범위 — 직전 진행도 기준 세그먼트 윈도우(단조 진행 제약). */
export interface ProjectionRange {
  /** 탐색 시작 세그먼트 인덱스(이전 진행도 직전, 약간의 backward jitter 허용). */
  from: number
  /** 탐색 끝 세그먼트 인덱스(lookahead). */
  to: number
}

/**
 * 점을 경로(폴리라인)에 정사영(map-matching).
 * 로컬 평면 근사(소규모 영역, 강남역 반경 1.5km에서 충분).
 *
 * range를 주면 해당 세그먼트 윈도우 안에서만 최단점을 찾는다 — 루프/자기근접 경로에서
 * 종점이 시작점 근처라도 직전 진행도 기준으로 단조 전진을 유지(전역 최단 스냅백 방지, R1-3).
 */
export function projectToPath(
  p: LatLng,
  path: LatLng[],
  range?: ProjectionRange,
): ProjectionResult {
  if (path.length === 0) {
    return { point: p, distanceM: 0, alongM: 0, segmentIndex: 0 }
  }
  if (path.length === 1) {
    return {
      point: path[0],
      distanceM: haversineMeters(p, path[0]),
      alongM: 0,
      segmentIndex: 0,
    }
  }

  const lastSeg = path.length - 2
  const from = range ? Math.max(0, Math.min(range.from, lastSeg)) : 0
  const to = range ? Math.max(from, Math.min(range.to, lastSeg)) : lastSeg

  // 위경도 → 로컬 미터 평면(경로 시작점 기준 등거리 근사).
  const origin = path[0]
  const mPerDegLat = 111_320
  const mPerDegLng = 111_320 * Math.cos(toRad(origin.lat))
  const toXY = (q: LatLng) => ({
    x: (q.lng - origin.lng) * mPerDegLng,
    y: (q.lat - origin.lat) * mPerDegLat,
  })
  const toLatLng = (xy: { x: number; y: number }): LatLng => ({
    lat: origin.lat + xy.y / mPerDegLat,
    lng: origin.lng + xy.x / mPerDegLng,
  })

  const pp = toXY(p)
  let best: ProjectionResult | null = null
  let cumBefore = 0

  // cumBefore는 전체를 누적해 alongM(경로 시작 기준 절대 진행거리)을 정확히 유지하되,
  // best 갱신은 [from,to] 윈도우 안에서만 한다.
  for (let i = 0; i < path.length - 1; i++) {
    const a = toXY(path[i])
    const b = toXY(path[i + 1])
    const abx = b.x - a.x
    const aby = b.y - a.y
    const segLen = Math.hypot(abx, aby)
    if (i >= from && i <= to) {
      let t = 0
      if (segLen > 1e-9) {
        t = ((pp.x - a.x) * abx + (pp.y - a.y) * aby) / (segLen * segLen)
        t = Math.max(0, Math.min(1, t))
      }
      const proj = { x: a.x + t * abx, y: a.y + t * aby }
      const dist = Math.hypot(pp.x - proj.x, pp.y - proj.y)
      if (best === null || dist < best.distanceM) {
        best = {
          point: toLatLng(proj),
          distanceM: dist,
          alongM: cumBefore + t * segLen,
          segmentIndex: i,
        }
      }
    }
    cumBefore += segLen
  }
  return best as ProjectionResult
}
