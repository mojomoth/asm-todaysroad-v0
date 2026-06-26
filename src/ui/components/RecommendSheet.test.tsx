// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecommendSheet } from './RecommendSheet'

function renderSheet(over: Record<string, unknown> = {}) {
  const onChangeTime = vi.fn()
  const onToggleTag = vi.fn()
  const onSubmit = vi.fn()
  render(
    <RecommendSheet
      availableMin={30}
      selectedTagIds={[]}
      onChangeTime={onChangeTime}
      onToggleTag={onToggleTag}
      onSubmit={onSubmit}
      resultCount={5}
      {...over}
    />,
  )
  return { onChangeTime, onToggleTag, onSubmit }
}

describe('RecommendSheet (FR-2 입력)', () => {
  it('시간 옵션 15/30/45/60/90을 노출하고 선택 콜백', () => {
    const { onChangeTime } = renderSheet()
    for (const t of ['15분', '30분', '45분', '60분', '90분']) {
      expect(screen.getByRole('button', { name: t })).toBeInTheDocument()
    }
    fireEvent.click(screen.getByRole('button', { name: '45분' }))
    expect(onChangeTime).toHaveBeenCalledWith(45)
  })

  it('현재 시간(30분) 칩이 pressed 상태', () => {
    renderSheet()
    expect(screen.getByRole('button', { name: '30분' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('감성 칩 토글이 onToggleTag 호출', () => {
    const { onToggleTag } = renderSheet()
    fireEvent.click(screen.getByRole('button', { name: '강변' }))
    expect(onToggleTag).toHaveBeenCalledWith('riverside')
  })

  it('CTA가 결과 개수를 반영하고 onSubmit 호출', () => {
    const { onSubmit } = renderSheet({ resultCount: 5 })
    const cta = screen.getByText('코스 5개 추천받기')
    fireEvent.click(cta)
    expect(onSubmit).toHaveBeenCalledOnce()
  })
})
