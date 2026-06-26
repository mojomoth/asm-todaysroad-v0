// 테스트/스토리용 MapAdapter — 카카오 SDK 없이 호출만 기록한다.
import type { LatLng } from '../course/types'
import type { MapAdapter, MarkerSpec, PathStyle } from './mapAdapter'

export class MockMapAdapter implements MapAdapter {
  center: LatLng | null = null
  level = 4
  markers: MarkerSpec[] = []
  path: LatLng[] = []
  pathStyle: Partial<PathStyle> | undefined
  initialized = false
  current: LatLng | null = null
  /** setCurrentPosition 호출 횟수(현위치만 갱신되는지 검증용). */
  currentUpdates = 0
  readonly calls: string[] = []

  async init(_container: HTMLElement, center: LatLng, level = 4): Promise<void> {
    this.initialized = true
    this.center = center
    this.level = level
    this.calls.push('init')
  }
  setCenter(center: LatLng): void {
    this.center = center
    this.calls.push('setCenter')
  }
  setLevel(level: number): void {
    this.level = level
    this.calls.push('setLevel')
  }
  renderMarkers(markers: MarkerSpec[]): void {
    this.markers = markers
    this.calls.push('renderMarkers')
  }
  setCurrentPosition(pos: LatLng | null): void {
    this.current = pos
    this.currentUpdates++
    this.calls.push('setCurrentPosition')
  }
  drawPath(coords: LatLng[], style?: Partial<PathStyle>): void {
    this.path = coords
    this.pathStyle = style
    this.calls.push('drawPath')
  }
  clearPath(): void {
    this.path = []
    this.calls.push('clearPath')
  }
  fitBounds(coords: LatLng[]): void {
    this.calls.push('fitBounds')
    if (coords.length > 0) this.center = coords[0]
  }
  destroy(): void {
    this.initialized = false
    this.calls.push('destroy')
  }
}
