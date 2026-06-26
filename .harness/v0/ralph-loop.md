# Ralph Loop — 루프 엔지니어링 프리미티브

## 1. 정의

**랄프 루프**는 동일한 목표를 향해 **같은 루프 본문을 수렴할 때까지 반복**하는 패턴이다.
한 번의 호출로 완성을 노리지 않고, **생성자(generator) → 비평자(critic) → 중재(reduce)** 를
반복하며 매 회차 직전 결과를 입력으로 되먹인다. 핵심은 루프 본문의 멱등성과 명확한 **수렴 판정**이다.

```
state ← 초기 입력(기획)
round ← 0
repeat
    round ← round + 1
    opinions ← GENERATE(state)          # 패널 6인 (병렬)
    issues   ← CRITIQUE(state, opinions) # devil: 등급화된 문제점
    state    ← REDUCE(opinions, issues)  # moderator: 종합 + 다음 의제
until CONVERGED(round, issues, state)
```

## 2. debate-loop에서의 적용

한 라운드 = 다음 3단계.

1. **GENERATE — 패널 의견.** `ceo·eng·design·devex·pm·domain` 6명을 `Task`로 **병렬** 호출.
   각자 페르소나 출력 스키마대로 기획(+직전 라운드 미해결 쟁점)을 평가·보강한다.
2. **CRITIQUE — devil 비판.** devil을 `Task`로 호출. 기획 + 이번 라운드 패널 의견을 적대적으로 검증해
   `critical/major/minor` 등급의 문제점 리스트(각 `R{round}-{n}` ID)를 산출한다.
3. **REDUCE — moderator 종합.** moderator를 `Task`로 호출. 합의/대립을 정리하고, devil의 미해결
   쟁점을 **다음 라운드 의제**로 변환하며, 수렴 여부를 판정한다.

다음 라운드의 입력 `state`는 moderator가 넘긴 **미해결 쟁점 + 현재까지의 합의안**이다.

## 3. 수렴 판정 알고리즘 (의사코드)

```
function CONVERGED(round, issues, prevIssues):
    if round < 3:                      # 최소 3라운드 강제
        return false
    open_critical = count(issues where grade == "critical" and status == "open")
    new_issues    = count(issues where id not in prevIssues.ids)
    if open_critical == 0:             # 치명 이슈 모두 해소
        return true
    if new_issues == 0:                # 신규 이슈 없음(델타 0) → 더 돌려도 무의미
        return true
    if round >= 6:                     # 상한 → 강제 종료(잔여 리스크 명시)
        return true
    return false
```

- `open_critical == 0`이지만 `major`가 남아 있어도 종료한다(스펙에 잔여 항목으로 기재).
- `round == 6` 강제 종료 시 산출물(DEBATE.md/SPEC.md)에 **미해결 잔여 리스크** 섹션을 반드시 채운다.

## 4. 상태 누적

오케스트레이터는 라운드마다 다음을 메모리에 누적해 DEBATE.md 작성에 사용한다.

- 라운드 번호, 각 패널의 핵심 발언, devil 문제점(ID·등급·상태), moderator 종합·의제.
- 이슈 생애주기: `open → resolved`(다음 라운드에서 해소) 추적.
