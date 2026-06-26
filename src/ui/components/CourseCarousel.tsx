import type { Recommendation } from '../../modules/course/types'

interface Props {
  recommendations: Recommendation[]
  selectedId: string | null
  onSelect: (courseId: string) => void
}

/**
 * 추천 코스 전환기 — 컴팩트 숫자 도트(1~5).
 * 디자인 가이드(단일 카드 정돈)와 탐색 편의를 절충: 칩 스트립 대신 가벼운 도트.
 * 코스 전환은 지도 핀 탭과도 동기화된다.
 */
export function CourseCarousel({
  recommendations,
  selectedId,
  onSelect,
}: Props) {
  if (recommendations.length <= 1) return null
  return (
    <div className="tr-dots" role="tablist" aria-label="추천 코스 전환">
      {recommendations.map((r, i) => {
        const active = r.course.id === selectedId
        return (
          <button
            key={r.course.id}
            role="tab"
            aria-selected={active}
            aria-label={`${i + 1}순위 ${r.course.name}`}
            className={`tr-dot${active ? ' tr-dot--active' : ''}`}
            onClick={() => onSelect(r.course.id)}
          >
            {i + 1}
          </button>
        )
      })}
    </div>
  )
}
