import { describe, expect, it } from 'vitest'
import { MockMapAdapter } from './mockMapAdapter'
import type { MarkerSpec } from './mapAdapter'

describe('MapAdapter 현위치/정적 마커 분리 (churn 제거)', () => {
  const markers: MarkerSpec[] = [
    { id: 'c1', kind: 'recommend', position: { lat: 37.5, lng: 127 } },
    { id: 'p1', kind: 'poi', position: { lat: 37.5, lng: 127.001 } },
  ]

  it('setCurrentPosition은 정적 마커를 건드리지 않는다', () => {
    const m = new MockMapAdapter()
    m.renderMarkers(markers)
    const renderedOnce = m.markers
    // 산책 중 현위치만 여러 번 갱신.
    for (let i = 0; i < 20; i++) {
      m.setCurrentPosition({ lat: 37.5 + i * 0.0001, lng: 127 })
    }
    // 정적 마커는 그대로(재렌더 0회), 현위치만 20회 갱신.
    expect(m.markers).toBe(renderedOnce)
    expect(m.calls.filter((c) => c === 'renderMarkers').length).toBe(1)
    expect(m.currentUpdates).toBe(20)
    expect(m.current).toEqual({ lat: 37.5 + 19 * 0.0001, lng: 127 })
  })

  it('setCurrentPosition(null)은 현위치를 제거', () => {
    const m = new MockMapAdapter()
    m.setCurrentPosition({ lat: 37.5, lng: 127 })
    m.setCurrentPosition(null)
    expect(m.current).toBeNull()
  })
})
