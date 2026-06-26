import { useEffect, useRef } from 'react'

interface Props {
  courseName: string
  onConfirm: (voiceOn: boolean) => void
}

/** 산책 시작 시 음성 on/off 1회 프롬프트 — 기본 ON(FR-6). */
export function VoicePrompt({ courseName, onConfirm }: Props) {
  const primaryRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    primaryRef.current?.focus()
  }, [])

  return (
    <div className="tr-modal-bg" role="dialog" aria-modal="true" aria-labelledby="tr-voice-title">
      <div className="tr-modal">
        <div className="tr-modal__title" id="tr-voice-title">
          음성 안내를 켤까요?
        </div>
        <div className="tr-modal__desc">
          «{courseName}» 산책을 시작합니다. 폰을 보지 않아도 갈림길에서 음성으로
          안내해 드려요. (걷는 중 언제든 끌 수 있어요.)
        </div>
        <div className="tr-modal__row">
          <button className="tr-cta tr-cta--ghost" onClick={() => onConfirm(false)}>
            음성 없이
          </button>
          <button ref={primaryRef} className="tr-cta" onClick={() => onConfirm(true)}>
            음성 켜고 시작
          </button>
        </div>
      </div>
    </div>
  )
}
