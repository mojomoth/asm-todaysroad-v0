// 햅틱 2패턴(SPEC: 안내/도착). Vibration API 추상화 — 미지원 시 무동작.

export interface Haptic {
  /** 턴 안내 — 짧은 1회 진동. */
  guide(): void
  /** 도착 — 길게 2회 진동. */
  arrive(): void
}

export class NoopHaptic implements Haptic {
  guide(): void {}
  arrive(): void {}
}

export class VibrationHaptic implements Haptic {
  private vibrate(pattern: number | number[]): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }
  guide(): void {
    this.vibrate(40)
  }
  arrive(): void {
    this.vibrate([120, 80, 120])
  }
}
