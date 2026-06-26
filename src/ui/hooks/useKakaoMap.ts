// 카카오 지도 초기화 훅. 키 미설정/도메인 미등록 등 실패 시 status='error' → UI fallback.
import { useEffect, useRef, useState } from 'react'
import type { LatLng } from '../../modules/course/types'
import { KakaoMapAdapter } from '../../modules/map/kakaoMapAdapter'
import type { MapAdapter } from '../../modules/map/mapAdapter'

export type MapStatus = 'loading' | 'ready' | 'error'

export interface UseKakaoMap {
  containerRef: React.RefObject<HTMLDivElement>
  adapter: MapAdapter | null
  status: MapStatus
  error: string | null
}

export function useKakaoMap(center: LatLng, level = 4): UseKakaoMap {
  const containerRef = useRef<HTMLDivElement>(null)
  const adapterRef = useRef<MapAdapter | null>(null)
  const [status, setStatus] = useState<MapStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  // center를 effect 의존성에서 빼기 위해 최초값만 사용(이후 이동은 adapter.setCenter로).
  const initialCenter = useRef(center)

  useEffect(() => {
    let cancelled = false
    const adapter = new KakaoMapAdapter()
    const el = containerRef.current
    if (!el) return

    adapter
      .init(el, initialCenter.current, level)
      .then(() => {
        if (cancelled) {
          adapter.destroy()
          return
        }
        adapterRef.current = adapter
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : '지도 로드 실패')
        setStatus('error')
      })

    return () => {
      cancelled = true
      adapterRef.current?.destroy()
      adapterRef.current = null
    }
  }, [level])

  return { containerRef, adapter: adapterRef.current, status, error }
}
