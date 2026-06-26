// Voice 모듈 — 음성 턴안내(SPEC FR-6). TTS 엔진은 인터페이스로 추상화(교체 가능).
//
// 잔여 리스크 R6-2: 프로덕션 TTS 엔진(Google TTS / Naver Clova / 사전녹음 MP3)은 미선택.
// v0 목업은 무비용·무라이선스인 브라우저 Web Speech API(SpeechSynthesis)를 placeholder로 사용한다.
// 실제 출시 시 사전생성 MP3 캐시 재생(VoiceController 구현체 교체)으로 대체한다.

export interface VoiceController {
  /** 한국어 안내 문장을 발화한다. enabled=false면 무시. */
  speak(text: string): void
  /** 음성 on/off (산책 시작 시 1회 프롬프트로 설정, 기본 ON). */
  setEnabled(enabled: boolean): void
  readonly enabled: boolean
  /** 대기 중인 발화 취소. */
  cancel(): void
}

/** 테스트/무음 환경용 — 발화 내용을 기록만 한다. (MockTTS) */
export class SilentVoice implements VoiceController {
  enabled = true
  readonly spoken: string[] = []

  speak(text: string): void {
    if (!this.enabled) return
    this.spoken.push(text)
  }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }
  cancel(): void {}
}

/** 브라우저 Web Speech API 기반 음성 안내(ko-KR). 미지원/보이스 부재 환경에서는 무음 동작. */
export class WebSpeechVoice implements VoiceController {
  enabled = true
  private readonly synth: SpeechSynthesis | null
  private koVoice: SpeechSynthesisVoice | null = null

  constructor() {
    this.synth =
      typeof window !== 'undefined' && 'speechSynthesis' in window
        ? window.speechSynthesis
        : null
    // 보이스 목록은 비동기 로드 — 즉시 + onvoiceschanged 양쪽에서 ko-KR을 고른다(R1-4).
    if (this.synth) {
      this.pickKoVoice()
      this.synth.onvoiceschanged = () => this.pickKoVoice()
    }
  }

  private pickKoVoice(): void {
    if (!this.synth) return
    const voices = this.synth.getVoices()
    this.koVoice =
      voices.find((v) => v.lang === 'ko-KR') ??
      voices.find((v) => v.lang?.startsWith('ko')) ??
      null
  }

  /** ko-KR 보이스가 실제로 사용 가능한지(없으면 발화가 무음일 수 있음 — 호출부 폴백 판단용). */
  get hasKoreanVoice(): boolean {
    return this.koVoice !== null
  }

  get supported(): boolean {
    return this.synth !== null
  }

  speak(text: string): void {
    if (!this.enabled || !this.synth) return
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'ko-KR'
    utt.rate = 1.0
    if (this.koVoice) utt.voice = this.koVoice
    // cancel()을 매번 부르지 않는다 — 인접한 턴/도착 안내가 잘리지 않도록 큐잉(R1-4).
    this.synth.speak(utt)
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) this.cancel()
  }

  cancel(): void {
    this.synth?.cancel()
  }
}
