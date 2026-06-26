import type { KeyboardEvent } from 'react'
import type { Course } from '../../modules/course/types'
import {
  poiKindLabel,
  poiSegmentLabel,
  type PoiReportStore,
} from '../../modules/poi/poi'
import { formatMetrics } from '../format'
import { CafeIcon, ClockIcon, ForkIcon, PinIcon, StepsIcon } from '../icons'

interface Props {
  course: Course
  reportStore: PoiReportStore
  /** 신고된 POI id 집합(리렌더 트리거용). */
  reportedIds: ReadonlySet<string>
  onReport: (poiId: string) => void
  onStart: () => void
  expanded: boolean
  onToggleExpand: () => void
}

/** 하단 선택 코스 카드 — 썸네일/제목/주소/태그/메트릭 + 항상 보이는 CTA, 확장 시 POI. */
export function CourseCard({
  course,
  reportedIds,
  onReport,
  onStart,
  expanded,
  onToggleExpand,
}: Props) {
  const m = formatMetrics(course.metrics)

  const onTopKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggleExpand()
    }
  }

  return (
    <div className="tr-card">
      <div
        className="tr-card__top"
        onClick={onToggleExpand}
        onKeyDown={onTopKey}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${course.name} 상세 ${expanded ? '접기' : '펼치기'}`}
      >
        <div
          className="tr-card__thumb"
          style={{ background: course.thumbnailColor ?? '#cbd5e1' }}
          aria-hidden
        >
          {course.type === 'loop' ? '↻' : '→'}
        </div>
        <div className="tr-card__body">
          <div className="tr-card__title">{course.name}</div>
          <div className="tr-card__addr">{course.address}</div>
          <div className="tr-tags">
            {course.sentimentTags.slice(0, 4).map((t) => (
              <span
                key={t.id}
                className={`tr-tag${t.axis === 'objective' ? ' tr-tag--obj' : ''}`}
              >
                #{t.label}
              </span>
            ))}
          </div>
        </div>
        <span className={`tr-card__chev${expanded ? ' tr-card__chev--up' : ''}`} aria-hidden>
          ⌄
        </span>
      </div>

      <div className="tr-card__metrics">
        <span className="tr-metric">
          <PinIcon /> {m.distance}
        </span>
        <span className="tr-metric">
          <StepsIcon /> {m.steps}
        </span>
        <span className="tr-metric">
          <ClockIcon /> {m.time}
        </span>
      </div>

      {expanded && (
        <div className="tr-pois">
          {course.pois.map((p) => {
            const reported = reportedIds.has(p.id)
            return (
              <div
                key={p.id}
                className={`tr-poi${reported ? ' tr-poi--reported' : ''}`}
              >
                <span className="tr-poi__icon">
                  {p.kind === 'cafe' ? <CafeIcon /> : <ForkIcon />}
                </span>
                <span className="tr-poi__meta">
                  <span className="tr-poi__name">{p.name}</span>
                  <span className="tr-poi__sub">
                    {poiKindLabel(p.kind)} · {poiSegmentLabel(p.segment)}
                  </span>
                </span>
                <button
                  className="tr-poi__report"
                  onClick={() => onReport(p.id)}
                  disabled={reported}
                >
                  {reported ? '신고됨' : '오류 신고'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <button className="tr-cta" onClick={onStart}>
        이 코스로 산책 시작
      </button>
    </div>
  )
}
