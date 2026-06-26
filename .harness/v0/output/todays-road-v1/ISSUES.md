# ISSUES — 오늘의길 MVP v0 (develop-loop 산출)

> `/develop-loop` 랄프 루프 2라운드 수렴(CONVERGED, round=2, open_critical=0) 후 잔여 이슈.
> 라운드1 critical 2건(R1-1·R1-2)은 라운드2에서 해소. 아래는 이월된 major/minor + V1 게이트.

## 구현 상태 요약

- **검증**: 단위/통합/컴포넌트 테스트 **72개 통과**, `tsc` clean, 프로덕션 빌드 성공, dev 서버 부팅.
- **5모듈**(Course/Navigation/Voice/POI/MapAdapter) + UI 완성. 핵심 흐름(콜드스타트 추천 → 코스 선택 → 산책 네비) 동작.
- 보행은 기본 시뮬레이션(`VITE_SIMULATE_WALK=false`로 실 GPS `watchPosition` 전환).

## 라운드2에서 해소된 신규 이슈 (R2)

| ID | 내용 | 해소 |
|---|---|---|
| R2-1 | off-route 회복 latch (실 결함) | on-route+합리적 전진일 때만 단조 갱신, 전방 스파이크 거부. `navigation.offroute.test.ts` 회귀 |
| R2-2 | ko-KR TTS 부재 무고지 | `useWalkNavigation.voiceUnavailable` → NavOverlay 시각모드 고지 |
| R2-3 | 산책 중 GPS 실패 무표시 | `nav.gpsError` → NavOverlay role=alert |
| R2-4 | 죽은 카메라 버튼(거짓 어포던스) | 장식용 비대화 아이콘으로 변경 |
| R2-5 | 잡음 hit-rate 게이트 < AC-1 | 임계 ≥0.75(AC-1)로 상향 |
| R2-6 | 태그 텍스트 대비 AA 미달 | `--ink-soft`로 상향 |
| R2-8 | reduced-motion 부재 | `@media (prefers-reduced-motion)` 추가 |
| R2-9 | SIMULATE_WALK 하드코딩·timeout 불일치 | env 토글 + watchPosition timeout 5s 정렬 |
| R2-10(부분) | 동적 영역 aria-live | 도착/시각모드 영역에 aria-live 추가 |

## 잔여 이슈 (V1 이월)

### 접근성 (R2-7 / R2-10 잔여, R1-10)
- 전 컨트롤 44px hit-area 완전 적용은 미완(도트 30px·신고버튼은 확대했으나 일부 24px 미만 잔존).
- 모달 **포커스 트랩 + 배경 inert** 미구현(VoicePrompt는 초기 포커스만).
- WCAG AA 핵심 전수 감사(스크린리더 산책 시나리오 포함)는 V1.

### 검증 게이트 — 벽시계/현장검증 (단위테스트로 닫히지 않음)
- **AC-1 hit rate ≥75%(GA 90%)**: 합성 90° 격자 코스에서 hit-rate=1(clean)·≥0.75(noise) 확인했으나, **실 굽은 길/실측 GPS 트레이스** 일반화는 미검증. → 실측 좌표 코스 픽스처 + 현장 왕복 측정 필요.
- **AC-2 사용성테스트(5인 현지)**: 미수행.
- **AC-3 음성 턴 지연 ≤2초 / AC-4 GPS 락온 ≤5초**: 코드상 충족 설계이나 실기기 실측 0. (앱 기본이 시뮬레이션이므로 실 GPS 경로 런타임 미실행)

### TTS 엔진 미선택 (SPEC R6-2, 최우선)
- v0는 브라우저 Web Speech API(ko-KR) **placeholder**. 프로덕션 TTS(Google TTS / Naver Clova / 사전녹음 MP3)와 라이선스·월비용 미정. `VoiceController` 인터페이스로 교체 가능하게 격리됨.

### 디자인
- **코스 대표 사진 썸네일** 부재(현재 단색+이모지) — `DESIGN_SIMILARITY.md` 요소 9, 최대 단일 편차. 실 이미지 파이프라인 필요.
- 시각 회귀 자동화(Playwright 스냅샷 + pixelmatch)로 v0.jpg 유사도 게이트 자동화.

### 데이터/스케일 (SPEC R5-4)
- 큐레이션 코스가 합성 90° 격자 잠정 데이터. 실측 좌표·고도·POI 50m 검증으로 교체 필요(파일럿 3코스 → 로드맵).

### 백엔드 (범위 외 → 후속)
- Spring Boot + PostgreSQL 백엔드, POI 신고 SLA 서버 연동, 코스/신고 영속화 미구현(v0는 프론트 인메모리).

### SPEC §9 출시 전 필수 잔여 리스크 (그대로 유효)
- R6-1 게이트 실행계획(담당·일정·롤백), R6-3 현장검증 일반화(겨울/우천/야간/타지역), R6-5 약관·개인정보 법무, R6-6 저사양 실기기 부하, R6-9/R6-10 GPS 약신호 이탈률·위치 히스토리 정책.
