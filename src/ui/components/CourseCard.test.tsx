// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getCourseById } from '../../modules/course/data/courses'
import type { Course } from '../../modules/course/types'
import { PoiReportStore } from '../../modules/poi/poi'
import { CourseCard } from './CourseCard'

const course = getCourseById('c1-sinnonhyeon-alley') as Course

function renderCard(expanded: boolean, over: Record<string, unknown> = {}) {
  const onStart = vi.fn()
  const onReport = vi.fn()
  const onToggleExpand = vi.fn()
  render(
    <CourseCard
      course={course}
      reportStore={new PoiReportStore()}
      reportedIds={new Set()}
      onReport={onReport}
      onStart={onStart}
      expanded={expanded}
      onToggleExpand={onToggleExpand}
      {...over}
    />,
  )
  return { onStart, onReport, onToggleExpand }
}

describe('CourseCard', () => {
  it('CTA "산책 시작"이 확장하지 않아도 항상 보인다(devex major 해소)', () => {
    const { onStart } = renderCard(false)
    const cta = screen.getByText('이 코스로 산책 시작')
    expect(cta).toBeInTheDocument()
    fireEvent.click(cta)
    expect(onStart).toHaveBeenCalledOnce()
  })

  it('메트릭(거리/걸음수/예상시간)을 표시', () => {
    renderCard(false)
    expect(screen.getByText(/km$/)).toBeInTheDocument()
    expect(screen.getByText(/걸음$/)).toBeInTheDocument()
    expect(screen.getByText(/분$/)).toBeInTheDocument()
  })

  it('접힌 상태에선 POI가 숨고, 펼치면 보인다', () => {
    renderCard(false)
    expect(screen.queryByText(course.pois[0].name)).not.toBeInTheDocument()
    renderCard(true)
    expect(screen.getByText(course.pois[0].name)).toBeInTheDocument()
  })

  it('확장 상태에서 오류 신고 버튼이 onReport를 호출', () => {
    const { onReport } = renderCard(true)
    const reportBtns = screen.getAllByText('오류 신고')
    fireEvent.click(reportBtns[0])
    expect(onReport).toHaveBeenCalledWith(course.pois[0].id)
  })

  it('카드 상단을 Enter로 펼칠 수 있다(키보드 접근성)', () => {
    const { onToggleExpand } = renderCard(false)
    const top = screen.getByRole('button', { name: /상세/ })
    fireEvent.keyDown(top, { key: 'Enter' })
    expect(onToggleExpand).toHaveBeenCalled()
  })
})
