// 큐레이션 고정 코스 (MVP 파일럿). 강남역 권역.
// 경로는 실측 가능한 지오메트리로 생성(destinationPoint)하고 metrics는 computeMetrics로 재계산한다.
// 좌표·POI는 v0 목업용 잠정 데이터(미검증) — 현장검증 후 실측 좌표로 교체 예정.
import { destinationPoint } from '../geo'
import { computeMetrics } from '../metrics'
import { getTag } from '../tags'
import type { Course, LatLng, Poi, PoiKind, PoiSegment } from '../types'

/** 강남역 중심 좌표(현위치 미허용 시 콜드스타트 기본값). */
export const GANGNAM_STATION: LatLng = { lat: 37.4979, lng: 127.0276 }

interface Seg {
  bearing: number
  length: number
}

/** 시작점에서 (방위,길이) 세그먼트열을 따라 걸어 경로 좌표를 생성. */
function walk(start: LatLng, segs: Seg[]): LatLng[] {
  const path: LatLng[] = [start]
  let cur = start
  for (const s of segs) {
    cur = destinationPoint(cur, s.bearing, s.length)
    path.push(cur)
  }
  return path
}

const E = 90
const N = 0
const W = 270
const S = 180

/** 등길이 세그먼트열. 모든 코스를 명확한 90° 턴(검출 결정적)으로 구성. */
function uniform(bearings: number[], length: number): Seg[] {
  return bearings.map((bearing) => ({ bearing, length }))
}

function repeat(pattern: number[], times: number): number[] {
  const out: number[] = []
  for (let i = 0; i < times; i++) out.push(...pattern)
  return out
}

function tags(...ids: string[]) {
  return ids.map((id) => {
    const t = getTag(id)
    if (!t) throw new Error(`unknown tag id: ${id}`)
    return t
  })
}

/** 경로 분위 지점(1/3·2/3·end) 좌표를 뽑아 POI 위치로 사용(경로 위 → ≤50m 보장). */
function poiAt(path: LatLng[], segment: PoiSegment): LatLng {
  const last = path.length - 1
  const idx =
    segment === '1/3'
      ? Math.round(last / 3)
      : segment === '2/3'
        ? Math.round((2 * last) / 3)
        : last
  return path[idx]
}

function buildPois(
  path: LatLng[],
  specs: Array<{ name: string; kind: PoiKind; segment: PoiSegment }>,
  prefix: string,
): Poi[] {
  return specs.map((s, i) => ({
    id: `${prefix}-poi-${i + 1}`,
    name: s.name,
    kind: s.kind,
    segment: s.segment,
    position: poiAt(path, s.segment),
  }))
}

interface CourseSeed {
  id: string
  name: string
  address: string
  type: Course['type']
  start: LatLng
  segs: Seg[]
  tagIds: string[]
  pois: Array<{ name: string; kind: PoiKind; segment: PoiSegment }>
  thumbnailColor: string
}

function buildCourse(seed: CourseSeed): Course {
  const pathCoordinates = walk(seed.start, seed.segs)
  return {
    id: seed.id,
    name: seed.name,
    address: seed.address,
    type: seed.type,
    source: 'curated',
    pathCoordinates,
    metrics: computeMetrics(pathCoordinates),
    sentimentTags: tags(...seed.tagIds),
    pois: buildPois(pathCoordinates, seed.pois, seed.id),
    thumbnailColor: seed.thumbnailColor,
  }
}

const SEEDS: CourseSeed[] = [
  {
    id: 'c1-sinnonhyeon-alley',
    name: '신논현 카페골목 한바퀴',
    address: '서울특별시 강남구 봉은사로 일대',
    type: 'loop',
    start: { lat: 37.5042, lng: 127.0248 },
    // 계단형 폐합 루프: E,N×2 후 W,S×2 → 정확히 시작점 복귀. 7개 90° 턴. ~1.1km
    segs: uniform([E, N, E, N, W, S, W, S], 140),
    tagIds: ['cafe', 'alley', 'quiet', 'short'],
    pois: [
      { name: '논현 로스터스', kind: 'cafe', segment: '1/3' },
      { name: '골목집 밥상', kind: 'restaurant', segment: '2/3' },
      { name: '코너 베이커리', kind: 'cafe', segment: 'end' },
    ],
    thumbnailColor: '#E8B4A0',
  },
  {
    id: 'c2-gangnam-downtown',
    name: '강남 도심 30분 산책',
    address: '서울특별시 강남구 강남대로 일대',
    type: 'a-b',
    start: GANGNAM_STATION,
    // N/E 계단(북동 진행). 11개 90° 턴. ~2.3km
    segs: uniform(repeat([N, E], 6), 190),
    tagIds: ['lively', 'cafe'],
    pois: [
      { name: '강남 북카페', kind: 'cafe', segment: '1/3' },
      { name: '테헤란 분식', kind: 'restaurant', segment: '2/3' },
      { name: '역삼 라운지', kind: 'cafe', segment: 'end' },
    ],
    thumbnailColor: '#A0C4E8',
  },
  {
    id: 'c3-yangjaecheon-river',
    name: '양재천 강변 따라 걷기',
    address: '서울특별시 강남구 양재천로 일대',
    type: 'a-b',
    start: { lat: 37.4885, lng: 127.042 },
    // W/S 계단(천변 따라 남서 진행). 17개 90° 턴. ~3.4km
    segs: uniform(repeat([W, S], 9), 190),
    tagIds: ['riverside', 'quiet', 'flat', 'park'],
    pois: [
      { name: '천변 커피', kind: 'cafe', segment: '1/3' },
      { name: '강변 국수', kind: 'restaurant', segment: '2/3' },
      { name: '버드나무 카페', kind: 'cafe', segment: 'end' },
    ],
    thumbnailColor: '#9FCBA8',
  },
  {
    id: 'c4-seolleung-park',
    name: '선릉 공원 둘레 한바퀴',
    address: '서울특별시 강남구 선릉로 일대',
    type: 'loop',
    start: { lat: 37.5045, lng: 127.049 },
    // 큰 직사각 둘레(E,N×6 후 W,S×6 → 폐합). 23개 90° 턴. ~4.6km
    segs: uniform([...repeat([E, N], 6), ...repeat([W, S], 6)], 190),
    tagIds: ['park', 'quiet', 'long'],
    pois: [
      { name: '선릉 티하우스', kind: 'cafe', segment: '1/3' },
      { name: '능안 한정식', kind: 'restaurant', segment: '2/3' },
      { name: '왕릉 베이커리', kind: 'cafe', segment: 'end' },
    ],
    thumbnailColor: '#B8A8D9',
  },
  {
    id: 'c5-hangang-nightview',
    name: '한강 야경 라이트 워크',
    address: '서울특별시 강남구 압구정로 일대',
    type: 'a-b',
    start: { lat: 37.505, lng: 127.024 },
    // N/E 계단(한강 향해 북동 진행). 33개 90° 턴. ~6.5km
    segs: uniform(repeat([N, E], 17), 190),
    tagIds: ['nightview', 'riverside', 'lively', 'long'],
    pois: [
      { name: '압구정 루프탑', kind: 'cafe', segment: '1/3' },
      { name: '한강뷰 다이닝', kind: 'restaurant', segment: '2/3' },
      { name: '야경 포차', kind: 'restaurant', segment: 'end' },
    ],
    thumbnailColor: '#D9A8C0',
  },
]

export const COURSES: Course[] = SEEDS.map(buildCourse)

export function getCourseById(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id)
}
