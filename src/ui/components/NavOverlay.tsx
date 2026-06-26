import type { NavState } from '../../modules/navigation/navigation'
import { formatDistanceM } from '../format'
import { TurnArrow, VoiceOffIcon, VoiceOnIcon } from '../icons'

interface Props {
  state: NavState
  voiceMuted: boolean
  onToggleVoice: () => void
  onStop: () => void
  /** 실 GPS 추적 실패(R2-3). */
  gpsError?: string | null
  /** 음성 ON인데 ko-KR TTS 없음 → 시각 모드 안내(R2-2). */
  voiceUnavailable?: boolean
}

/** 산책 중 오버레이 — 음성모드 상단 턴바 / 약신호·음성off 시 단순 시각모드 + 하단 진행 패널. */
export function NavOverlay({
  state,
  voiceMuted,
  onToggleVoice,
  onStop,
  gpsError,
  voiceUnavailable,
}: Props) {
  const { nextTurn, mode, progress, remainingM, arrived, weakGps, offRoute } =
    state

  return (
    <div className="tr-nav">
      {/* GPS 추적 실패(R2-3) */}
      {gpsError && (
        <div className="tr-nav__offroute" role="alert">
          📡 위치 신호를 받지 못했습니다. 잠시 후 다시 시도해 주세요
        </div>
      )}

      {/* 음성 미지원 고지(R2-2) */}
      {voiceUnavailable && !voiceMuted && (
        <div className="tr-nav__notice" role="status">
          이 기기에는 한국어 음성이 없어 화면(시각 모드)으로 안내해요
        </div>
      )}

      {/* 경로 이탈 경고(R1-5) */}
      {!arrived && offRoute && (
        <div className="tr-nav__offroute" role="alert">
          ⚠️ 경로를 벗어났습니다. 길로 돌아가세요
        </div>
      )}

      {/* 음성 모드 + 다가오는 턴: 상단 안내바 */}
      {!arrived && mode === 'voice' && nextTurn && (
        <div className="tr-nav__top" aria-live="polite">
          <span className="tr-nav__arrow">
            <TurnArrow direction={nextTurn.direction} color="#fff" />
          </span>
          <span>
            <div className="tr-nav__instr">{nextTurn.label}</div>
            <div className="tr-nav__dist">
              {formatDistanceM(nextTurn.distanceM)} 앞
            </div>
          </span>
        </div>
      )}

      {/* 단순 시각모드: 큰 화살표 + 남은 거리 (FR-7) */}
      {!arrived && mode === 'visual' && (
        <div className="tr-badge-visual" aria-live="polite">
          <div className="tr-badge-visual__arrow">
            <TurnArrow
              direction={nextTurn?.direction ?? 'straight'}
              width={120}
              height={120}
            />
          </div>
          <div className="tr-badge-visual__dist">
            {formatDistanceM(nextTurn?.distanceM ?? remainingM)}
          </div>
          {weakGps && (
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
              GPS 약신호 — 시각 안내 모드
            </div>
          )}
        </div>
      )}

      <div className="tr-nav__bottom">
        <div className="tr-nav__panel">
          {arrived ? (
            <div
              style={{ textAlign: 'center', fontWeight: 800, fontSize: 16 }}
              role="status"
              aria-live="assertive"
            >
              🎉 도착했어요! 수고하셨습니다
            </div>
          ) : (
            <>
              <div className="tr-nav__stats" aria-live="polite">
                <span>남은 거리 {formatDistanceM(remainingM)}</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="tr-nav__progress">
                <span style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            </>
          )}

          <div className="tr-nav__actions">
            {!arrived && (
              <button
                className={`tr-toggle${!voiceMuted ? ' tr-toggle--on' : ''}`}
                onClick={onToggleVoice}
                aria-pressed={!voiceMuted}
              >
                {voiceMuted ? <VoiceOffIcon /> : <VoiceOnIcon />}
                음성 {voiceMuted ? 'OFF' : 'ON'}
              </button>
            )}
            <button className="tr-toggle" onClick={onStop}>
              {arrived ? '완료' : '산책 종료'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
