import { describe, expect, it } from 'vitest'
import { SilentVoice } from './voice'

describe('SilentVoice (MockTTS)', () => {
  it('enabled일 때 발화를 순서대로 기록', () => {
    const v = new SilentVoice()
    v.speak('좌회전')
    v.speak('도착')
    expect(v.spoken).toEqual(['좌회전', '도착'])
  })

  it('disabled면 발화하지 않는다', () => {
    const v = new SilentVoice()
    v.setEnabled(false)
    v.speak('무시됨')
    expect(v.spoken).toEqual([])
  })

  it('인접 발화가 잘리지 않고 모두 보존된다(cancel 남용 제거 검증)', () => {
    const v = new SilentVoice()
    // 같은 흐름에서 턴 직후 도착이 연속돼도 둘 다 큐잉.
    v.speak('30m 앞에서 좌회전')
    v.speak('목적지에 도착했습니다')
    expect(v.spoken.length).toBe(2)
  })
})
