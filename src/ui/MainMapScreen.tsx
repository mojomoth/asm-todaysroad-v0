import { useEffect, useMemo, useRef, useState } from 'react'
import { COURSES } from '../modules/course/data/courses'
import { recommend } from '../modules/course/recommend'
import { resolveExclusive } from '../modules/course/tags'
import type { Course, LatLng } from '../modules/course/types'
import type { MarkerSpec } from '../modules/map/mapAdapter'
import { PoiReportStore } from '../modules/poi/poi'
import { CourseCard } from './components/CourseCard'
import { CourseCarousel } from './components/CourseCarousel'
import { FloatingHeader } from './components/FloatingHeader'
import { NavOverlay } from './components/NavOverlay'
import { RecommendSheet } from './components/RecommendSheet'
import { VoicePrompt } from './components/VoicePrompt'
import { useGeolocation } from './hooks/useGeolocation'
import { useKakaoMap } from './hooks/useKakaoMap'
import { useWalkNavigation } from './hooks/useWalkNavigation'

type Phase = 'browse' | 'prompt' | 'navigating'

const DEFAULT_MIN = 30
// 보행 모드: 기본은 시뮬레이션 데모. 실기기 필드 테스트는 VITE_SIMULATE_WALK=false로
// 재빌드 없이 navigator.geolocation.watchPosition 사용(R2-9).
const SIMULATE_WALK = import.meta.env.VITE_SIMULATE_WALK !== 'false'

function courseStart(course: Course): LatLng {
  return course.pathCoordinates[0]
}

export function MainMapScreen() {
  const geo = useGeolocation()
  const map = useKakaoMap(geo.position)

  const [availableMin, setAvailableMin] = useState(DEFAULT_MIN)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [bottomMode, setBottomMode] = useState<'card' | 'recommend'>('card')
  const [cardExpanded, setCardExpanded] = useState(false)
  const [phase, setPhase] = useState<Phase>('browse')
  const [voiceOn, setVoiceOn] = useState(true)

  const reportStoreRef = useRef(new PoiReportStore())
  const [reportedIds, setReportedIds] = useState<ReadonlySet<string>>(new Set())

  const recommendations = useMemo(
    () => recommend(COURSES, { origin: geo.position, availableMin, tagIds }),
    [geo.position, availableMin, tagIds],
  )

  // 추천 결과가 바뀌면 선택을 1위로 동기화(현재 선택이 결과에 없을 때).
  useEffect(() => {
    if (recommendations.length === 0) {
      setSelectedId(null)
      return
    }
    if (!recommendations.some((r) => r.course.id === selectedId)) {
      setSelectedId(recommendations[0].course.id)
    }
  }, [recommendations, selectedId])

  const selectedCourse =
    recommendations.find((r) => r.course.id === selectedId)?.course ??
    recommendations[0]?.course ??
    null

  const nav = useWalkNavigation(
    selectedCourse,
    phase === 'navigating',
    voiceOn,
    SIMULATE_WALK,
  )

  const currentPos =
    phase === 'navigating' && nav.current ? nav.current : geo.position

  // (1) 정적 마커 — 추천핀 + 선택코스 POI. 현위치는 별도(아래)로 분리해 churn 제거.
  useEffect(() => {
    if (map.status !== 'ready' || !map.adapter) return
    const markers: MarkerSpec[] = []
    if (phase === 'browse') {
      for (const r of recommendations) {
        markers.push({
          id: r.course.id,
          kind: 'recommend',
          position: courseStart(r.course),
          title: r.course.name,
          onClick: () => {
            setSelectedId(r.course.id)
            setBottomMode('card')
          },
        })
      }
    }
    if (selectedCourse) {
      for (const p of reportStoreRef.current.visiblePois(selectedCourse)) {
        markers.push({ id: p.id, kind: 'poi', position: p.position, title: p.name })
      }
    }
    map.adapter.renderMarkers(markers)
  }, [map.status, map.adapter, recommendations, selectedCourse, phase, reportedIds])

  // (2) 현위치 마커 — 위치만 갱신(정적 마커 재생성 없음).
  useEffect(() => {
    if (map.status !== 'ready' || !map.adapter) return
    map.adapter.setCurrentPosition(currentPos)
  }, [map.status, map.adapter, currentPos])

  // (3) 선택 코스 경로 + 뷰포트.
  useEffect(() => {
    if (map.status !== 'ready' || !map.adapter) return
    if (!selectedCourse) {
      map.adapter.clearPath()
      return
    }
    map.adapter.drawPath(selectedCourse.pathCoordinates)
    if (phase === 'browse') map.adapter.fitBounds(selectedCourse.pathCoordinates)
  }, [map.status, map.adapter, selectedCourse, phase])

  // (4) 산책 중 현위치 추적(중심 이동).
  useEffect(() => {
    if (map.status !== 'ready' || !map.adapter) return
    if (phase === 'navigating' && nav.current) {
      map.adapter.setCenter(nav.current)
    }
  }, [map.status, map.adapter, phase, nav.current])

  const handleToggleTag = (tagId: string) => {
    setTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : resolveExclusive([...prev, tagId]),
    )
  }

  const handleReport = (poiId: string) => {
    reportStoreRef.current.report(poiId)
    setReportedIds(new Set([...reportedIds, poiId]))
  }

  const handleStartWalk = () => setPhase('prompt')
  const handleConfirmVoice = (on: boolean) => {
    setVoiceOn(on)
    setPhase('navigating')
  }
  const handleStopWalk = () => {
    setPhase('browse')
    setCardExpanded(false)
  }

  const fallbackBanner =
    phase === 'browse' && !geo.isReal && geo.status !== 'locating'

  return (
    <div className="tr-app">
      <div className="tr-map" ref={map.containerRef}>
        {map.status === 'error' && (
          <div className="tr-map__fallback">
            <div style={{ fontSize: 28 }}>🗺️</div>
            <div>
              지도를 불러오지 못했어요.
              <br />
              카카오 JS 키/도메인 등록을 확인하세요. (코스 추천은 정상 동작)
            </div>
          </div>
        )}
        {map.status === 'loading' && (
          <div className="tr-loading">지도를 불러오는 중…</div>
        )}
      </div>

      <FloatingHeader onOpenRecommend={() => setBottomMode('recommend')} />

      {fallbackBanner && (
        <div className="tr-banner" role="status">
          {geo.status === 'denied'
            ? '위치 권한이 없어 강남역 기준으로 추천 중이에요.'
            : '위치를 확인할 수 없어 강남역 기준으로 추천 중이에요.'}
          <button onClick={geo.retry}>위치 켜기</button>
        </div>
      )}

      {phase === 'navigating' && nav.state && (
        <NavOverlay
          state={nav.state}
          voiceMuted={nav.voiceMuted}
          onToggleVoice={nav.toggleVoice}
          onStop={handleStopWalk}
          gpsError={nav.gpsError}
          voiceUnavailable={nav.voiceUnavailable}
        />
      )}

      {phase === 'prompt' && selectedCourse && (
        <VoicePrompt
          courseName={selectedCourse.name}
          onConfirm={handleConfirmVoice}
        />
      )}

      {phase === 'browse' && (
        <div className="tr-sheet">
          {bottomMode === 'recommend' ? (
            <RecommendSheet
              availableMin={availableMin}
              selectedTagIds={tagIds}
              onChangeTime={setAvailableMin}
              onToggleTag={handleToggleTag}
              onSubmit={() => setBottomMode('card')}
              resultCount={recommendations.length}
            />
          ) : (
            selectedCourse && (
              <>
                <div className="tr-sheet__topbar">
                  <button
                    className="tr-condbtn"
                    onClick={() => setBottomMode('recommend')}
                  >
                    {availableMin}분
                    {tagIds.length > 0 ? ` · ${tagIds.length}개 기분` : ''} · 조건 변경
                  </button>
                  <CourseCarousel
                    recommendations={recommendations}
                    selectedId={selectedId}
                    onSelect={(id) => {
                      setSelectedId(id)
                      setCardExpanded(false)
                    }}
                  />
                </div>
                <CourseCard
                  course={selectedCourse}
                  reportStore={reportStoreRef.current}
                  reportedIds={reportedIds}
                  onReport={handleReport}
                  onStart={handleStartWalk}
                  expanded={cardExpanded}
                  onToggleExpand={() => setCardExpanded((e) => !e)}
                />
              </>
            )
          )}
        </div>
      )}
    </div>
  )
}
