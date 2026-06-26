// 마커 DOM 콘텐츠 생성 — 디자인 레퍼런스(docs/ref/v0.jpg) 재현.
// 추천: 코랄 레드 핀 + 중앙 흰 원 / 현위치: 파란 핀 + 흰 원 + 그림자 / POI: 작은 점.
import type { MarkerKind } from './mapAdapter'

const CORAL = '#FF5A4D'
const BLUE = '#3B82F6'

function pinSvg(color: string): string {
  // 단순 지도 핀 형태 + 중앙 흰 원(디자인 가이드: 마커를 복잡하게 만들지 않는다).
  return `
    <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 43C17 43 32 26.5 32 16C32 7.7 25.3 1 17 1C8.7 1 2 7.7 2 16C2 26.5 17 43 17 43Z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="17" cy="16" r="6" fill="white"/>
    </svg>`
}

export function createMarkerElement(
  kind: MarkerKind,
  onClick?: () => void,
): HTMLElement {
  const el = document.createElement('div')
  el.className = `tr-marker tr-marker--${kind}`

  if (kind === 'current') {
    // 레퍼런스(docs/ref/v0.jpg): 파란 teardrop 핀 + 중앙 흰 원 + 아래 작은 그림자.
    el.innerHTML = `
      <div class="tr-current">
        <span class="tr-current__pulse"></span>
        ${pinSvg(BLUE)}
        <span class="tr-current__shadow"></span>
      </div>`
  } else if (kind === 'poi') {
    el.innerHTML = `<span class="tr-poi-dot"></span>`
  } else {
    el.innerHTML = pinSvg(CORAL)
    el.style.cursor = 'pointer'
  }

  if (onClick) {
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      onClick()
    })
  }
  return el
}

export const MARKER_COLORS = { CORAL, BLUE }
