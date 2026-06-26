import { describe, expect, it } from 'vitest'
import { destinationPoint } from '../course/geo'
import type { LatLng } from '../course/types'
import { extractTurns, signedTurn } from './turns'

const A: LatLng = { lat: 37.5, lng: 127.03 }

describe('signedTurn', () => {
  it('동→북은 좌회전(-90)', () => {
    expect(signedTurn(90, 0)).toBeCloseTo(-90)
  })
  it('동→남은 우회전(+90)', () => {
    expect(signedTurn(90, 180)).toBeCloseTo(90)
  })
  it('직진은 0 근처', () => {
    expect(Math.abs(signedTurn(90, 92))).toBeLessThan(5)
  })
})

describe('extractTurns', () => {
  it('L자 경로에서 좌회전 1개를 alongM≈100으로 추출', () => {
    const B = destinationPoint(A, 90, 100) // 동 100m
    const C = destinationPoint(B, 0, 100) // 북 100m
    const turns = extractTurns([A, B, C])
    expect(turns.length).toBe(1)
    expect(turns[0].direction).toBe('left')
    expect(turns[0].alongM).toBeCloseTo(100, -1)
    expect(turns[0].label).toBe('좌회전')
  })

  it('완만한(임계 미만) 꺾임은 턴으로 보지 않는다', () => {
    const B = destinationPoint(A, 90, 100)
    const C = destinationPoint(B, 100, 100) // 10도만 꺾임
    expect(extractTurns([A, B, C]).length).toBe(0)
  })
})
