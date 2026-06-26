// 경로에서 턴(회전 지점)을 추출하는 순수 함수. 단위 테스트 대상.
import { bearingDegrees } from '../course/geo'
import type { LatLng } from '../course/types'

/** 회전으로 간주하는 최소 각도(도). */
export const TURN_THRESHOLD_DEG = 30

/**
 * 각도 분류 결정성 보장 — 부동소수 잡음(예: 30.0000001 vs 29.9999999)으로
 * 기하학적으로 동일한 턴의 분류가 뒤집히지 않도록 0.1° 단위로 양자화한다(R1-2).
 */
function quantizeAngle(deg: number): number {
  return Math.round(deg * 10) / 10
}

export type TurnDirection = 'left' | 'right' | 'straight'

export interface Turn {
  /** path 상의 정점 인덱스. */
  index: number
  position: LatLng
  /** 경로 시작점부터 이 정점까지의 누적 거리(m). */
  alongM: number
  /** 부호 있는 회전각(도). +우회전 / -좌회전. */
  turnAngle: number
  direction: TurnDirection
  /** 음성 안내 문구의 방향 부분. */
  label: string
}

import { haversineMeters } from '../course/geo'

/** 두 방위각 사이의 부호 있는 회전각(-180~180, +는 우회전). */
export function signedTurn(inBearing: number, outBearing: number): number {
  return ((outBearing - inBearing + 540) % 360) - 180
}

function directionOf(turnAngle: number): TurnDirection {
  const a = quantizeAngle(turnAngle)
  if (a >= TURN_THRESHOLD_DEG) return 'right'
  if (a <= -TURN_THRESHOLD_DEG) return 'left'
  return 'straight'
}

const LABELS: Record<TurnDirection, string> = {
  left: '좌회전',
  right: '우회전',
  straight: '직진',
}

/** 경로의 모든 회전 지점을 추출(직진 구간 제외). */
export function extractTurns(path: LatLng[]): Turn[] {
  const turns: Turn[] = []
  let along = 0
  for (let i = 1; i < path.length - 1; i++) {
    along += haversineMeters(path[i - 1], path[i])
    const inB = bearingDegrees(path[i - 1], path[i])
    const outB = bearingDegrees(path[i], path[i + 1])
    const angle = quantizeAngle(signedTurn(inB, outB))
    const dir = directionOf(angle)
    if (dir === 'straight') continue
    turns.push({
      index: i,
      position: path[i],
      alongM: along,
      turnAngle: angle,
      direction: dir,
      label: LABELS[dir],
    })
  }
  return turns
}
