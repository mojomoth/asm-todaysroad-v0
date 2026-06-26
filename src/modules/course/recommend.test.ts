import { describe, expect, it } from 'vitest'
import { COURSES, GANGNAM_STATION, getCourseById } from './data/courses'
import {
  K,
  MIN_RESULTS,
  recommend,
  scoreCourse,
  timeProximityScore,
  weightedTagJaccard,
} from './recommend'
import type { Course, RecommendQuery } from './types'

const baseQuery = (over: Partial<RecommendQuery> = {}): RecommendQuery => ({
  origin: GANGNAM_STATION,
  availableMin: 30,
  tagIds: [],
  ...over,
})

describe('timeProximityScore', () => {
  it('동일 시간이면 1', () => {
    expect(timeProximityScore(30, 30)).toBe(1)
  })
  it('차이가 가용시간 이상이면 0', () => {
    expect(timeProximityScore(30, 60)).toBe(0)
    expect(timeProximityScore(30, 90)).toBe(0)
  })
  it('차이에 비례해 선형 감소', () => {
    expect(timeProximityScore(30, 45)).toBeCloseTo(0.5)
  })
})

describe('weightedTagJaccard', () => {
  const riverCourse = getCourseById('c3-yangjaecheon-river') as Course

  it('선택 태그가 없으면 0(중립)', () => {
    expect(weightedTagJaccard([], riverCourse)).toBe(0)
  })
  it('완전 불일치면 0', () => {
    expect(weightedTagJaccard(['nightview'], riverCourse)).toBe(0)
  })
  it('일치 태그가 있으면 양수', () => {
    expect(weightedTagJaccard(['riverside'], riverCourse)).toBeGreaterThan(0)
  })
  it('객관축(1.5배) 매칭이 동일 구성의 주관축 매칭보다 점수가 높다', () => {
    // riverCourse 태그: riverside(주관), quiet(주관), flat(객관), park(주관)
    const objMatch = weightedTagJaccard(['flat'], riverCourse) // 객관축
    const subMatch = weightedTagJaccard(['quiet'], riverCourse) // 주관축
    expect(objMatch).toBeGreaterThan(subMatch)
  })
})

describe('recommend — FR-1/3/4', () => {
  it('FR-1: 강남역 기준 항상 상위 K=5 노출, 결과 0개 없음', () => {
    const recs = recommend(COURSES, baseQuery())
    expect(recs.length).toBe(K)
    expect(recs.length).toBeGreaterThanOrEqual(MIN_RESULTS)
  })

  it('항상 K 이하로 반환', () => {
    const recs = recommend(COURSES, baseQuery({ availableMin: 60 }))
    expect(recs.length).toBeLessThanOrEqual(K)
  })

  it('점수 내림차순 정렬', () => {
    const recs = recommend(COURSES, baseQuery())
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score)
    }
  })

  it('FR-3: 가용시간에 맞는 코스가 상위로 랭킹', () => {
    // 15분 선택 → 가장 짧은 코스(c1)가 1위
    const recs = recommend(COURSES, baseQuery({ availableMin: 15 }))
    expect(recs[0].course.id).toBe('c1-sinnonhyeon-alley')
  })

  it('FR-3: 90분 선택 → 가장 긴 코스가 1위', () => {
    const recs = recommend(COURSES, baseQuery({ availableMin: 90 }))
    expect(recs[0].course.id).toBe('c5-hangang-nightview')
  })

  it('FR-3: 감성태그 선택이 동점 시간대에서 순위를 끌어올린다', () => {
    // riverside 선택 시, 동일 origin에서 강변 코스 점수가 태그 미선택 대비 상승
    const q = baseQuery({ availableMin: 45, tagIds: ['riverside'] })
    const withTag = scoreCourse(q, getCourseById('c3-yangjaecheon-river') as Course)
    const withoutTag = scoreCourse(
      baseQuery({ availableMin: 45 }),
      getCourseById('c3-yangjaecheon-river') as Course,
    )
    expect(withTag).toBeGreaterThan(withoutTag)
  })

  it('FR-4: 코스가 K개 미만이어도 가진 만큼(>=MIN) 반환', () => {
    const few = COURSES.slice(0, 4)
    const recs = recommend(few, baseQuery())
    expect(recs.length).toBe(4)
  })

  it('FR-4 안전망: 반경 밖(부산) 원점에서도 결과 0개 금지(최소 3개)', () => {
    const busan = { lat: 35.1796, lng: 129.0756 }
    const recs = recommend(COURSES, baseQuery({ origin: busan }))
    expect(recs.length).toBeGreaterThanOrEqual(MIN_RESULTS)
    expect(recs.every((r) => r.tagsRelaxed)).toBe(true)
  })

  it('FR-4 안전망 대칭: 먼 원점에서 항상 min(K, 전체)개 반환', () => {
    const busan = { lat: 35.1796, lng: 129.0756 }
    // 코스 5개 전부 권역 밖 → K=5개 모두 반환(이전엔 3개만 잘리던 비대칭 수정).
    const recs = recommend(COURSES, baseQuery({ origin: busan }))
    expect(recs.length).toBe(Math.min(K, COURSES.length))
  })

  it('소규모 카탈로그(2개)는 가진 만큼 반환(0개 금지)', () => {
    const two = COURSES.slice(0, 2)
    const busan = { lat: 35.1796, lng: 129.0756 }
    const recs = recommend(two, baseQuery({ origin: busan }))
    expect(recs.length).toBe(2)
  })

  it('AC-5: 빈 코스 목록만 빈 결과', () => {
    expect(recommend([], baseQuery())).toEqual([])
  })

  it('matchedRadiusKm는 결과를 얻은 반경을 기록', () => {
    const recs = recommend(COURSES, baseQuery())
    expect(recs[0].matchedRadiusKm).toBeGreaterThan(0)
  })
})
