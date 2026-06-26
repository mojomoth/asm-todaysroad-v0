// POI 모듈 — 경로 부착 큐레이션 메타데이터. 실시간 카카오 API 미사용(SPEC: 법적 리스크 회피).
// FR-8: 오류 신고 버튼 → 폐업/이전 신고 시 영업일 1~2일 내 검증·숨김(운영 SLA).
// v0 목업은 신고를 인메모리로 기록(백엔드 연동은 후속).
import type { Course, Poi } from '../course/types'

export type ReportReason = 'closed' | 'moved' | 'wrong-info'

export interface PoiReport {
  poiId: string
  reason: ReportReason
}

/** 신고된 POI를 추적하는 인메모리 스토어. */
export class PoiReportStore {
  private readonly reports = new Map<string, ReportReason>()
  private readonly listeners = new Set<() => void>()

  report(poiId: string, reason: ReportReason = 'closed'): void {
    this.reports.set(poiId, reason)
    this.listeners.forEach((l) => l())
  }

  isReported(poiId: string): boolean {
    return this.reports.has(poiId)
  }

  /** 신고된 POI는 목록에서 숨긴다(검증 전 임시 숨김). */
  visiblePois(course: Course): Poi[] {
    return course.pois.filter((p) => !this.reports.has(p.id))
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

const SEGMENT_LABEL: Record<Poi['segment'], string> = {
  '1/3': '코스 초반',
  '2/3': '코스 중반',
  end: '코스 종료점',
}

export function poiSegmentLabel(segment: Poi['segment']): string {
  return SEGMENT_LABEL[segment]
}

const KIND_LABEL: Record<Poi['kind'], string> = {
  cafe: '카페',
  restaurant: '식당',
}

export function poiKindLabel(kind: Poi['kind']): string {
  return KIND_LABEL[kind]
}
