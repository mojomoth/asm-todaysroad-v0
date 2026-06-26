# Harness v0

이 폴더는 AI 에이전트 워크플로우를 위한 **하네스(harness)** 다. 하네스는 에이전트의 작업을
**가이드(무엇을·어떻게 할지)** 와 **가드레일(하지 말 것)** 로 감싸 결과 품질을 보장하는 골격이다.
또한 **루프 엔지니어링**을 위한 **랄프 루프(Ralph loop)** 프리미티브를 제공한다.

## 구성

| 파일 | 역할 |
|------|------|
| [`GUIDE.md`](./GUIDE.md) | 하네스 철학, 루프 엔지니어링 개념, 사용법, 에이전트 출처 매핑 |
| [`GUARDRAILS.md`](./GUARDRAILS.md) | 에이전트 행동 규칙 · 출력 규율 · 금지사항 · 루프 종료 조건 |
| [`ralph-loop.md`](./ralph-loop.md) | 랄프 루프 스펙 + debate-loop 적용법 + 수렴 판정 알고리즘 |
| [`agents/`](./agents/) | 토론 참여 에이전트 페르소나 (moderator · devil + 6 패널) |
| [`templates/`](./templates/) | SPEC / PRD / DEBATE 출력 템플릿 |
| [`output/`](./output/) | 산출물 디렉터리 (런타임 생성, `output/<slug>/`) |

## 진입점

```
/debate-loop <기획 텍스트 또는 파일 경로>
```

입력된 기획을 A2A(에이전트 간) 토론으로 검증한다. moderator가 회의를 진행하고 devil이 적대적으로
비판하며, 최소 3라운드의 랄프 루프를 돌린 뒤 `.harness/v0/output/<slug>/`에 다음 3종을 출력한다.

- `SPEC.md` — 최종 스펙
- `PRD.md` — 제품 요구 문서
- `DEBATE.md` — 라운드별 토론 전체 기록

명령 정의는 [`.claude/skills/debate-loop/SKILL.md`](../../.claude/skills/debate-loop/SKILL.md)에 있다.
