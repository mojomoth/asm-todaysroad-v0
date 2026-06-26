// 감성태그 카탈로그 (SPEC §7 하이브리드 온톨로지).
// 객관축(objective): 거리 버킷/유형/시간대 → 랭킹 1.5배 가중.
// 주관 감성축(subjective): 조용/활기/강변/야경/카페/골목 등.
// 배타쌍(조용↔활기)은 칩 선택 UI/데이터 규칙으로 관리(코드 강제는 V1).
import type { SentimentTag } from './types'

export const TAGS: SentimentTag[] = [
  // 주관 감성축
  { id: 'quiet', label: '조용한', axis: 'subjective' },
  { id: 'lively', label: '활기찬', axis: 'subjective' },
  { id: 'riverside', label: '강변', axis: 'subjective' },
  { id: 'nightview', label: '야경', axis: 'subjective' },
  { id: 'cafe', label: '카페', axis: 'subjective' },
  { id: 'alley', label: '골목', axis: 'subjective' },
  { id: 'park', label: '공원', axis: 'subjective' },
  // 객관축
  { id: 'short', label: '짧은코스', axis: 'objective' },
  { id: 'long', label: '긴코스', axis: 'objective' },
  { id: 'flat', label: '평탄', axis: 'objective' },
]

/** 배타쌍 — 동시에 선택할 수 없는 태그(칩 UI에서 상호 해제). */
export const EXCLUSIVE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['quiet', 'lively'],
]

const TAG_BY_ID: Map<string, SentimentTag> = new Map(TAGS.map((t) => [t.id, t]))

export function getTag(id: string): SentimentTag | undefined {
  return TAG_BY_ID.get(id)
}

export function tagLabel(id: string): string {
  return TAG_BY_ID.get(id)?.label ?? id
}

/** 랭킹 가중치 — 객관축 1.5배, 주관축 1.0배. (미지정 태그는 1.0) */
export function tagWeight(id: string): number {
  return TAG_BY_ID.get(id)?.axis === 'objective' ? 1.5 : 1.0
}

/** id 목록이 배타쌍을 위반하면, 마지막 선택을 우선해 충돌 태그를 제거한다. */
export function resolveExclusive(selected: string[]): string[] {
  const result = [...selected]
  for (const [a, b] of EXCLUSIVE_PAIRS) {
    const ai = result.indexOf(a)
    const bi = result.indexOf(b)
    if (ai !== -1 && bi !== -1) {
      // 나중에 추가된(인덱스가 큰) 것을 남긴다.
      const removeId = ai < bi ? a : b
      const idx = result.indexOf(removeId)
      result.splice(idx, 1)
    }
  }
  return result
}
