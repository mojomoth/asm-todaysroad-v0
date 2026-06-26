---
name: debate-loop
description: 입력된 기획을 A2A 에이전트 토론(랄프 루프)으로 검증하고 SPEC.md·PRD.md·DEBATE.md를 산출한다. moderator가 진행하고 devil이 적대적으로 비판하며 최소 3라운드 반복한다.
argument-hint: "<기획 텍스트 또는 파일 경로>"
triggers:
  - debate-loop
  - 토론 루프
  - 디베이트 루프
allowed-tools:
  - Task
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# /debate-loop — A2A 토론 루프

입력된 기획을 6인 전문가 패널 + devil(적대적 관찰자) + moderator(중재자)의 **A2A 토론**으로 검증한다.
`.harness/v0/`의 가이드·가드레일·랄프 루프를 따른다. 단일 세션에서 메인 에이전트가 `Task` 도구로
서브에이전트를 라운드마다 띄워 오케스트레이션한다.

## 0. 하네스 로드 (반드시 먼저)

다음 파일을 Read 해서 규칙을 머리에 담는다. 이 규칙들은 이후 모든 단계를 지배한다.

- `.harness/v0/GUARDRAILS.md` — 행동 규칙·출력 규율·**루프 종료 조건**·한글 규칙
- `.harness/v0/ralph-loop.md` — 라운드 구조·**수렴 판정 알고리즘(CONVERGED)**
- `.harness/v0/agents/moderator.md`, `.harness/v0/agents/devil.md`
- `.harness/v0/agents/{ceo,eng,design,devex,pm,domain}.md`
- `.harness/v0/templates/{SPEC,PRD,DEBATE}.template.md`

## 1. 입력 수집

1. 인자(`$ARGUMENTS`)를 본다.
   - 인자가 **파일 경로처럼** 보이고 존재하면 Read 해서 기획 본문으로 쓴다.
   - 인자가 텍스트면 그 텍스트를 기획으로 쓴다.
   - 인자가 없으면 `AskUserQuestion`으로 "검증할 기획"을 물어 받는다.
2. 기획에서 짧은 **slug**(영문 kebab-case, 예: `parking-app-v1`)를 만든다.
3. 산출 폴더를 만든다: `mkdir -p .harness/v0/output/<slug>`.

## 2. 랄프 루프 (round = 1 …, 최소 3 · 최대 6)

각 라운드는 GENERATE → CRITIQUE → REDUCE 3단계다. 라운드 결과는 모두 메모리에 누적한다.

### 2a. GENERATE — 패널 6인 (병렬)

`Task`를 **한 메시지에서 6개 병렬 호출**한다(ceo·eng·design·devex·pm·domain).
각 호출 프롬프트에 다음을 넣는다:

- 해당 페르소나 파일 내용(역할·출력 스키마)
- 원본 기획
- **직전 라운드 moderator가 넘긴 의제/미해결 쟁점**(라운드 1은 없음)
- "가드레일(`GUARDRAILS.md`)을 준수하고, 페르소나 출력 스키마로만, 한글로 응답하라" 지시

서브에이전트는 파일을 수정하지 않는다(읽기/탐색만). `subagent_type`은 `Explore`(읽기전용) 또는
`general-purpose`를 쓰되, 토론 단계에서는 **쓰기 금지**를 프롬프트에 명시한다.

### 2b. CRITIQUE — devil

`Task`로 devil을 1회 호출한다. 프롬프트에 devil 페르소나 + 원본 기획 + **이번 라운드 패널 6인의 의견** +
직전 라운드 이슈 목록을 넣는다. devil은 문제점을 `critical/major/minor`로 등급화하고 각 항목에
`R{round}-{n}` ID를 부여한다. 직전 이슈의 해소 여부도 재평가한다.

### 2c. REDUCE — moderator

`Task`로 moderator를 1회 호출한다. 프롬프트에 moderator 페르소나 + 원본 기획 + 이번 라운드 패널 의견 +
devil 문제점 + 직전 라운드들의 미해결 쟁점을 넣는다. moderator는:

- 합의/대립 정리, 이슈 상태 업데이트(open/resolved)
- **다음 라운드 의제** 도출
- `ralph-loop.md`의 `CONVERGED(round, issues, prevIssues)`로 **수렴 판정** 출력
  (`CONTINUE` / `CONVERGED` / `FORCE_STOP`)

### 2d. 루프 제어

- moderator 판정이 `CONVERGED` 또는 `FORCE_STOP`이고 `round >= 3` → 루프 종료.
- 그렇지 않으면 다음 라운드로. moderator의 다음 의제를 2a의 입력으로 넘긴다.
- **안전장치**: `round`가 6에 도달하면 무조건 종료(가드레일 G4).

## 3. 산출물 작성 (루프 종료 후에만)

`.harness/v0/templates/`의 3개 템플릿을 기반으로, 누적된 토론 내용을 채워 다음을 Write 한다.
경로는 모두 `.harness/v0/output/<slug>/` 안이며 그 외 경로는 절대 건드리지 않는다.

1. `DEBATE.md` — 전 라운드 기록(패널 발언 / devil 문제점 / moderator 종합) + 이슈 생애주기 표 +
   최종 수렴 요약 + 미해결 잔여 리스크.
2. `SPEC.md` — 토론으로 확정된 실행 가능한 스펙.
3. `PRD.md` — `to-prd` 템플릿 기반 PRD.

미해결 `major`가 남았거나 `FORCE_STOP`이면 SPEC·DEBATE·PRD의 "미해결 잔여 리스크" 섹션을 반드시 채운다.

## 4. 요약 보고

사용자에게 한글로 보고한다: 수행 라운드 수, 수렴 여부, devil이 끝까지 남긴 핵심 리스크,
산출물 3종 경로(`.harness/v0/output/<slug>/`).

## 가드레일 요약 (전 단계 적용)

- 토론 중 파일 수정 금지 — 쓰기는 3단계에서 `output/<slug>/`에만.
- 지어내지 않기 — 미검증은 "미검증" 표기.
- 최소 3 · 최대 6 라운드. 무한 루프 금지.
- 모든 산출물·응답은 한글.
