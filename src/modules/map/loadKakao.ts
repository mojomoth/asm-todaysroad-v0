// 카카오 지도 JS SDK 동적 로더. autoload=false → kakao.maps.load 콜백으로 준비 완료를 보장한다.
// 키는 vite.config가 .env(KAKAO_MAP_PLATFORM_JAVASCRIPT_KEY)에서 주입한 import.meta.env.VITE_KAKAO_JS_KEY.

declare global {
  interface Window {
    // 카카오 SDK는 타입 패키지를 두지 않고 런타임 글로벌로 다룬다(어댑터 내부에서만 접근).
    kakao: any
  }
}

let loadPromise: Promise<void> | null = null

export function getKakaoJsKey(): string {
  return import.meta.env.VITE_KAKAO_JS_KEY ?? ''
}

export function loadKakaoSdk(appKey = getKakaoJsKey()): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('window 없음(SSR/테스트) — 카카오 SDK 로드 불가'))
      return
    }
    if (!appKey) {
      reject(
        new Error(
          '카카오 JS 키 없음. .env의 KAKAO_MAP_PLATFORM_JAVASCRIPT_KEY 를 확인하세요.',
        ),
      )
      return
    }
    if (window.kakao?.maps) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`
    script.onload = () => {
      window.kakao.maps.load(() => resolve())
    }
    script.onerror = () =>
      reject(new Error('카카오 지도 SDK 스크립트 로드 실패'))
    document.head.appendChild(script)
  })

  return loadPromise
}
