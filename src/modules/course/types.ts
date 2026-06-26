// Course 도메인 타입 — SPEC §7 도메인 용어 / PRD 코스 엔티티 단일 스키마 기준.
// 코스(Course)는 추천/네비/검색의 원자 단위다.

export interface LatLng {
  lat: number
  lng: number
}

/** 코스 토폴로지 — A-B(시작≠끝) 또는 루프(시작=끝). 별개 엔티티가 아니라 속성. */
export type CourseType = 'loop' | 'a-b'

/** 코스 출처 — MVP는 큐레이션 고정 코스만. (UGC는 Out of scope) */
export type CourseSource = 'curated'

/**
 * 감성태그 온톨로지(하이브리드, SPEC §7).
 * - axis 'objective': 거리 버킷/유형/시간대 등 객관축 → 랭킹에서 1.5배 가중.
 * - axis 'subjective': 조용/활기/강변/야경/카페/골목 등 주관 감성축.
 * 배타쌍(조용↔활기)은 데이터 작성 규칙으로 관리(코드 강제는 V1).
 */
export type TagAxis = 'objective' | 'subjective'

export interface SentimentTag {
  id: string
  label: string // 칩에 노출되는 한글 라벨 (예: '조용한', '강변')
  axis: TagAxis
}

/** 경로좌표에서 결정론적으로 재계산되는 메트릭 (SPEC §7 / PRD). */
export interface CourseMetrics {
  distanceKm: number
  estimatedMin: number
  stepCount: number
  elevationGainM: number
}

/** 경로상 대표 카페/식당 — 큐레이션 메타데이터(실시간 조회 아님, SPEC). */
export type PoiKind = 'cafe' | 'restaurant'

/** 경로 위 부착 위치 — 1/3·2/3·종료 지점(SPEC: 경로 50m내). */
export type PoiSegment = '1/3' | '2/3' | 'end'

export interface Poi {
  id: string
  name: string
  kind: PoiKind
  position: LatLng
  segment: PoiSegment
}

export interface Course {
  id: string
  name: string
  /** 행정 주소 — 코스 카드 부제(디자인 레퍼런스). */
  address: string
  type: CourseType
  source: CourseSource
  /** 경로 좌표열(GeoJSON LineString 대응). metrics는 여기서 재계산한다. */
  pathCoordinates: LatLng[]
  /** 좌표별 고도(m). 없으면 평탄 가정(0). (mock 단계 — 실측 미검증) */
  elevations?: number[]
  metrics: CourseMetrics
  sentimentTags: SentimentTag[]
  /** 대표 POI 3개 (경로 1/3·2/3·종료). */
  pois: Poi[]
  /** 카드 썸네일(원형). v0 목업은 placeholder/색상. */
  thumbnailColor?: string
}

/** 추천 질의 — 현위치 + 가용시간 + 선택 감성태그(FR-2). */
export interface RecommendQuery {
  origin: LatLng
  /** 가용 시간(분). 15/30/45/60/90 중 하나(슬라이더). 미입력 시 기본값은 호출부에서 적용. */
  availableMin: number
  /** 사용자가 선택한 감성태그 id 목록. 빈 배열 허용(미입력). */
  tagIds: string[]
}

/** 추천 결과 1건 — 코스 + 점수 + 적용된 fallback 진단. */
export interface Recommendation {
  course: Course
  /** 0~ 양수. 클수록 상위. (시간 근접 + 가중 태그 매칭) */
  score: number
  /** 이 결과를 얻기 위해 실제 적용된 반경(km). fallback 추적용. */
  matchedRadiusKm: number
  /** 태그 완화가 적용되었는지(결과 부족 fallback). */
  tagsRelaxed: boolean
}
