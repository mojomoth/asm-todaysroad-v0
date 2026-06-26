// 현위치 획득 훅 — 권한 미허용/오류 시 강남역 기본값으로 fallback(FR-8 콜드스타트).
import { useCallback, useEffect, useState } from 'react'
import { GANGNAM_STATION } from '../../modules/course/data/courses'
import type { LatLng } from '../../modules/course/types'

export type GeoStatus =
  | 'locating'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'unsupported'

export interface GeoState {
  status: GeoStatus
  /** 항상 사용 가능한 좌표(미허용 시 강남역). */
  position: LatLng
  /** 실제 현위치를 얻었는지(아니면 기본값). */
  isReal: boolean
  retry: () => void
}

export function useGeolocation(): GeoState {
  const [status, setStatus] = useState<GeoStatus>('locating')
  const [position, setPosition] = useState<LatLng>(GANGNAM_STATION)
  const [isReal, setIsReal] = useState(false)

  const locate = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unsupported')
      return
    }
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setIsReal(true)
        setStatus('granted')
      },
      (err) => {
        // 권한 거부(1) vs 위치불가(2)/타임아웃(3) 구분.
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable')
        setPosition(GANGNAM_STATION)
        setIsReal(false)
      },
      // maximumAge:0 → 묵은 캐시 측위 대신 5초 내 신선한 락온만 인정(AC-4, R1-8).
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
    )
  }, [])

  useEffect(() => {
    locate()
  }, [locate])

  return { status, position, isReal, retry: locate }
}
