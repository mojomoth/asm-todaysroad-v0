// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCourseById } from '../../modules/course/data/courses'
import type { Course } from '../../modules/course/types'
import { useWalkNavigation } from './useWalkNavigation'

const course = getCourseById('c2-gangnam-downtown') as Course

afterEach(() => vi.unstubAllGlobals())

describe('useWalkNavigation — 실 GPS(watchPosition) 배선 (R1-1 얇은 절반)', () => {
  it('watchPosition 좌표를 onLocationUpdate로 포워딩하고 정리 시 clearWatch', () => {
    let successCb: ((p: unknown) => void) | null = null
    const watchPosition = vi.fn((s: (p: unknown) => void) => {
      successCb = s
      return 7
    })
    const clearWatch = vi.fn()
    vi.stubGlobal('navigator', { geolocation: { watchPosition, clearWatch } })

    const { result, unmount } = renderHook(() =>
      useWalkNavigation(course, true, false, false),
    )

    expect(watchPosition).toHaveBeenCalledTimes(1)
    expect(result.current.state?.running).toBe(true)

    // GPS fix 1건 주입 → current 갱신 + 진행 상태 반영.
    const start = course.pathCoordinates[0]
    act(() => {
      successCb?.({ coords: { latitude: start.lat, longitude: start.lng, accuracy: 6 } })
    })
    expect(result.current.current).toEqual({ lat: start.lat, lng: start.lng })

    unmount()
    expect(clearWatch).toHaveBeenCalledWith(7)
  })

  it('geolocation 미지원이면 gpsError를 표면화', () => {
    vi.stubGlobal('navigator', {})
    const { result } = renderHook(() =>
      useWalkNavigation(course, true, false, false),
    )
    expect(result.current.gpsError).toMatch(/지원/)
  })
})
