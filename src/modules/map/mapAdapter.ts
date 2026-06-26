// MapAdapter — 지도 SDK 추상화(SPEC: 외부 의존 격리, 교체 가능).
// 카카오 지도 JS SDK를 직접 부르지 않고 이 인터페이스로만 다룬다 → 테스트는 MockMapAdapter로 치환.
import type { LatLng } from '../course/types'

export type MarkerKind = 'recommend' | 'current' | 'poi'

export interface MarkerSpec {
  id: string
  kind: MarkerKind
  position: LatLng
  /** 클릭 콜백(추천 핀 → 코스 선택 등). */
  onClick?: () => void
  /** 마커 라벨/툴팁. */
  title?: string
}

export interface PathStyle {
  color: string
  weight: number
  opacity: number
}

export interface MapAdapter {
  /** 컨테이너에 지도를 초기화. */
  init(container: HTMLElement, center: LatLng, level?: number): Promise<void>
  setCenter(center: LatLng): void
  /** 지도 레벨(확대축소). 작을수록 확대. */
  setLevel(level: number): void
  /** 정적 마커 일괄 렌더(추천핀·POI 등 — 기존 정적 마커는 교체). 현위치는 제외. */
  renderMarkers(markers: MarkerSpec[]): void
  /**
   * 현위치 마커만 갱신(전체 재렌더 없이 위치만 이동).
   * 산책 중 고빈도 위치 갱신에서 정적 마커를 매번 재생성하지 않도록 분리.
   */
  setCurrentPosition(pos: LatLng | null): void
  /** 경로 폴리라인 그리기. */
  drawPath(coords: LatLng[], style?: Partial<PathStyle>): void
  clearPath(): void
  /** 좌표열 전체가 보이도록 뷰포트 맞춤. */
  fitBounds(coords: LatLng[]): void
  destroy(): void
}

export const DEFAULT_PATH_STYLE: PathStyle = {
  color: '#FF5A4D', // 코랄 레드(디자인 포인트 컬러)
  weight: 6,
  opacity: 0.9,
}
