import { BrandIcon, CameraIcon, LogoMark } from '../icons'

interface Props {
  /** 추천 조건(시간·기분) 변경 시트 열기. */
  onOpenRecommend?: () => void
}

/**
 * 상단 플로팅 헤더 — 흰 pill, 좌측 로고마크 / 우측 아이콘(텍스트 없이, 디자인 가이드).
 * 카메라 아이콘은 레퍼런스 유사도를 위해 장식으로만 표시(v0 기능 없음 → 죽은 어포던스 제거, R2-4).
 */
export function FloatingHeader({ onOpenRecommend }: Props) {
  return (
    <header className="tr-header">
      <div className="tr-header__logo" aria-label="오늘의길">
        <span className="tr-header__mark">
          <LogoMark />
        </span>
      </div>
      <div className="tr-header__icons">
        <span className="tr-iconbtn tr-iconbtn--deco" aria-hidden>
          <CameraIcon />
        </span>
        <button
          className="tr-iconbtn tr-iconbtn--brand"
          onClick={onOpenRecommend}
          aria-label="추천 조건 변경"
        >
          <BrandIcon />
        </button>
      </div>
    </header>
  )
}
