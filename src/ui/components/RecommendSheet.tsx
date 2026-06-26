import { TAGS } from '../../modules/course/tags'

export const TIME_OPTIONS = [15, 30, 45, 60, 90] as const

interface Props {
  availableMin: number
  selectedTagIds: string[]
  onChangeTime: (min: number) => void
  onToggleTag: (tagId: string) => void
  onSubmit: () => void
  resultCount: number
}

/** 추천 입력 시트 — 시간 선택(15/30/45/60/90) + 감성 칩 + CTA (FR-2). */
export function RecommendSheet({
  availableMin,
  selectedTagIds,
  onChangeTime,
  onToggleTag,
  onSubmit,
  resultCount,
}: Props) {
  return (
    <div className="tr-recommend">
      <div className="tr-recommend__title">지금, 어떤 길을 걸을까요?</div>
      <div className="tr-recommend__sub">
        현위치 주변에서 시간·기분에 맞는 산책 코스를 찾아드려요.
      </div>

      <div className="tr-section-label">얼마나 걸을까요?</div>
      <div className="tr-time-row">
        {TIME_OPTIONS.map((t) => (
          <button
            key={t}
            className={`tr-time${availableMin === t ? ' tr-time--active' : ''}`}
            onClick={() => onChangeTime(t)}
            aria-pressed={availableMin === t}
          >
            {t}분
          </button>
        ))}
      </div>

      <div className="tr-section-label">어떤 기분인가요? (선택)</div>
      <div className="tr-chips">
        {TAGS.map((tag) => {
          const on = selectedTagIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              className={`tr-chip${tag.axis === 'objective' ? ' tr-chip--obj' : ''}${
                on ? ' tr-chip--on' : ''
              }`}
              onClick={() => onToggleTag(tag.id)}
              aria-pressed={on}
            >
              {tag.label}
            </button>
          )
        })}
      </div>

      <button className="tr-cta" onClick={onSubmit}>
        코스 {resultCount}개 추천받기
      </button>
    </div>
  )
}
