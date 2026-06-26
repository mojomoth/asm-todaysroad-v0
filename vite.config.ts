import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// 카카오 지도 JS SDK 키는 루트 .env의 KAKAO_MAP_PLATFORM_JAVASCRIPT_KEY 에 있다.
// Vite는 VITE_ 접두사만 클라이언트에 노출하므로, loadEnv로 전체를 읽어 define으로 주입한다.
// (JS 키는 카카오 설계상 브라우저 노출용 클라이언트 키다.)
export default defineConfig(({ mode }) => {
  // envDir='.' → 프로젝트 루트의 .env 로드(접두사 제한 없이 전체).
  const env = loadEnv(mode, '.', '')
  const kakaoJsKey =
    env.KAKAO_MAP_PLATFORM_JAVASCRIPT_KEY ?? env.VITE_KAKAO_JS_KEY ?? ''

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_KAKAO_JS_KEY': JSON.stringify(kakaoJsKey),
    },
    test: {
      environment: 'node',
      globals: true,
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: [],
    },
  }
})
