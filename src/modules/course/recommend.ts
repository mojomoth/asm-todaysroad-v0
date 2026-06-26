// 추천 엔진 — FR-1/FR-3/FR-4. 외부 호출 없는 순수 함수(SPEC 시임).
// 하드필터(반경) → 소프트 랭킹(시간 근접 + 가중 태그 자카드) → 항상 상위 K=5, 결과 0개 금지.
import { haversineMeters } from './geo'
import { tagWeight } from './tags'
import type { Course, LatLng, Recommendation, RecommendQuery } from './types'

/** 항상 노출할 상위 결과 수. */
export const K = 5
/** fallback로도 보장하는 최소 결과 수(AC-5). */
export const MIN_RESULTS = 3
/** 반경 fallback 단계(km). 1.5km 권역에서 시작해 단계 확대(FR-4). */
export const RADIUS_STEPS_KM = [1.5, 2, 3, 5, 10] as const

/** 시간 점수 가중. */
export const W_TIME = 1.0
/** 태그 점수 가중. */
export const W_TAG = 1.0

/** 원점에서 코스까지의 최단 접근 거리(m) — 경로 좌표 중 최소. */
export function distanceToCourseMeters(origin: LatLng, course: Course): number {
  let min = Infinity
  for (const c of course.pathCoordinates) {
    const d = haversineMeters(origin, c)
    if (d < min) min = d
  }
  return min === Infinity ? Infinity : min
}

/**
 * 시간 근접 점수 ∈ [0,1].
 * 가용시간과 코스 예상시간이 같으면 1, 차이가 커질수록 선형 감소.
 * |Δ| ≥ availableMin 이면 0.
 */
export function timeProximityScore(
  availableMin: number,
  estimatedMin: number,
): number {
  const denom = Math.max(availableMin, 1)
  const diff = Math.abs(availableMin - estimatedMin)
  return Math.max(0, 1 - diff / denom)
}

/**
 * 가중 태그 자카드 ∈ [0,1].
 * 교집합/합집합을 태그 가중치(객관축 1.5배)로 계산.
 * 선택 태그가 없으면 0(중립 — 랭킹은 시간 점수가 주도).
 */
export function weightedTagJaccard(
  selectedTagIds: string[],
  course: Course,
): number {
  if (selectedTagIds.length === 0) return 0
  const courseIds = new Set(course.sentimentTags.map((t) => t.id))
  const selected = new Set(selectedTagIds)

  const union = new Set<string>([...selected, ...courseIds])
  let interW = 0
  let unionW = 0
  for (const id of union) {
    const w = tagWeight(id)
    unionW += w
    if (selected.has(id) && courseIds.has(id)) interW += w
  }
  return unionW === 0 ? 0 : interW / unionW
}

/** 단일 코스의 랭킹 점수. */
export function scoreCourse(query: RecommendQuery, course: Course): number {
  const time = timeProximityScore(query.availableMin, course.metrics.estimatedMin)
  const tag = weightedTagJaccard(query.tagIds, course)
  return W_TIME * time + W_TAG * tag
}

/** 반경(km) 내 코스만 남기는 하드필터. */
export function hardFilterByRadius(
  courses: Course[],
  origin: LatLng,
  radiusKm: number,
): Course[] {
  const radiusM = radiusKm * 1000
  return courses.filter((c) => distanceToCourseMeters(origin, c) <= radiusM)
}

function rank(
  courses: Course[],
  query: RecommendQuery,
  matchedRadiusKm: number,
  tagsRelaxed: boolean,
): Recommendation[] {
  return courses
    .map((course) => ({
      course,
      score: scoreCourse(query, course),
      matchedRadiusKm,
      tagsRelaxed,
    }))
    .sort((a, b) => b.score - a.score)
}

/**
 * 추천 메인 — 항상 상위 K=5(최소 MIN_RESULTS=3) 반환, 결과 0개 금지.
 *
 * 단계:
 *  A. 반경 1.5km 하드필터 → ≥K 면 상위 K.
 *  B. 반경 fallback 2→3→5→10km 확대 → 처음으로 ≥K 되는 반경에서 상위 K.
 *  C. 10km로도 부족하면 태그 완화(이미 소프트) + 최근접 코스로 ≥3 보장(안전망).
 */
export function recommend(
  courses: Course[],
  query: RecommendQuery,
): Recommendation[] {
  if (courses.length === 0) return []

  // A + B: 반경 단계 확대
  for (const radiusKm of RADIUS_STEPS_KM) {
    const inRadius = hardFilterByRadius(courses, query.origin, radiusKm)
    if (inRadius.length >= K) {
      return rank(inRadius, query, radiusKm, false).slice(0, K)
    }
  }

  // 최대 반경(10km)으로도 K 미만 — 가능한 만큼 반환하되 ≥3 보장.
  const maxRadius = RADIUS_STEPS_KM[RADIUS_STEPS_KM.length - 1]
  const withinMax = hardFilterByRadius(courses, query.origin, maxRadius)
  if (withinMax.length >= MIN_RESULTS) {
    return rank(withinMax, query, maxRadius, true).slice(0, K)
  }

  // C(안전망): 반경 밖이라도 최근접 코스로 항상 min(K, 전체)개 반환 — AC-5 0개 금지.
  // 데이터 크기와 무관하게 대칭(코스가 3개 미만이면 가진 만큼, 그 이상이면 K개)(R1-9).
  const byNearest = [...courses].sort(
    (a, b) =>
      distanceToCourseMeters(query.origin, a) -
      distanceToCourseMeters(query.origin, b),
  )
  const safety = byNearest.slice(0, Math.min(K, courses.length))
  return rank(safety, query, maxRadius, true)
}
