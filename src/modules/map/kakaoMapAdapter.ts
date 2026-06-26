// 카카오 지도 JS SDK 래퍼 — MapAdapter 구현체.
import type { LatLng } from '../course/types'
import { loadKakaoSdk } from './loadKakao'
import {
  DEFAULT_PATH_STYLE,
  type MapAdapter,
  type MarkerSpec,
  type PathStyle,
} from './mapAdapter'
import { createMarkerElement } from './markerContent'

export class KakaoMapAdapter implements MapAdapter {
  private map: any = null
  private overlays: any[] = []
  private polyline: any = null
  private currentOverlay: any = null

  async init(container: HTMLElement, center: LatLng, level = 4): Promise<void> {
    await loadKakaoSdk()
    const kakao = window.kakao
    this.map = new kakao.maps.Map(container, {
      center: new kakao.maps.LatLng(center.lat, center.lng),
      level,
    })
  }

  private get kakao() {
    return window.kakao
  }

  setCenter(center: LatLng): void {
    if (!this.map) return
    this.map.setCenter(new this.kakao.maps.LatLng(center.lat, center.lng))
  }

  setLevel(level: number): void {
    this.map?.setLevel(level)
  }

  setCurrentPosition(pos: LatLng | null): void {
    if (!this.map) return
    if (!pos) {
      this.currentOverlay?.setMap(null)
      this.currentOverlay = null
      return
    }
    const latLng = new this.kakao.maps.LatLng(pos.lat, pos.lng)
    if (this.currentOverlay) {
      this.currentOverlay.setPosition(latLng)
      return
    }
    this.currentOverlay = new this.kakao.maps.CustomOverlay({
      position: latLng,
      content: createMarkerElement('current'),
      yAnchor: 1, // teardrop 핀 tip이 좌표에 오도록
      zIndex: 6,
    })
    this.currentOverlay.setMap(this.map)
  }

  renderMarkers(markers: MarkerSpec[]): void {
    if (!this.map) return
    this.overlays.forEach((o) => o.setMap(null))
    this.overlays = markers.map((m) => {
      const el = createMarkerElement(m.kind, m.onClick)
      if (m.title) el.title = m.title
      const overlay = new this.kakao.maps.CustomOverlay({
        position: new this.kakao.maps.LatLng(m.position.lat, m.position.lng),
        content: el,
        yAnchor: m.kind === 'recommend' ? 1 : 0.5,
        zIndex: m.kind === 'current' ? 5 : m.kind === 'recommend' ? 4 : 3,
      })
      overlay.setMap(this.map)
      return overlay
    })
  }

  drawPath(coords: LatLng[], style: Partial<PathStyle> = {}): void {
    if (!this.map) return
    this.clearPath()
    const s = { ...DEFAULT_PATH_STYLE, ...style }
    this.polyline = new this.kakao.maps.Polyline({
      path: coords.map((c) => new this.kakao.maps.LatLng(c.lat, c.lng)),
      strokeWeight: s.weight,
      strokeColor: s.color,
      strokeOpacity: s.opacity,
      strokeStyle: 'solid',
    })
    this.polyline.setMap(this.map)
  }

  clearPath(): void {
    this.polyline?.setMap(null)
    this.polyline = null
  }

  fitBounds(coords: LatLng[]): void {
    if (!this.map || coords.length === 0) return
    const bounds = new this.kakao.maps.LatLngBounds()
    coords.forEach((c) =>
      bounds.extend(new this.kakao.maps.LatLng(c.lat, c.lng)),
    )
    this.map.setBounds(bounds)
  }

  destroy(): void {
    this.overlays.forEach((o) => o.setMap(null))
    this.overlays = []
    this.currentOverlay?.setMap(null)
    this.currentOverlay = null
    this.clearPath()
    this.map = null
  }
}
