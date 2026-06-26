/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 카카오 지도 JS SDK 키 (vite.config가 .env에서 주입). */
  readonly VITE_KAKAO_JS_KEY: string
  /** 'false'면 실 GPS(watchPosition) 사용, 그 외(기본)는 시뮬레이션 보행. */
  readonly VITE_SIMULATE_WALK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
