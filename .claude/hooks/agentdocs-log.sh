#!/usr/bin/env bash
# .agentdocs 관측 로깅 훅 — Claude Code hooks 디스패처
# stdin 으로 들어온 훅 JSON 을 hook_event_name 으로 분기하여
# .agentdocs/{YYYY-MM-DD}/ 에 Markdown 으로 기록한다.
# 로깅 실패가 세션을 막지 않도록 항상 exit 0.

# LLM 요약 강화 시 무한 재귀 방지 가드 (claude -p 호출 시 AGENTDOCS_NOLOG=1 세팅)
[ "${AGENTDOCS_NOLOG:-}" = "1" ] && exit 0

INPUT=$(cat)

# jq 없으면 조용히 종료(세션은 정상)
command -v jq >/dev/null 2>&1 || exit 0

j() { jq -r "$1" <<<"$INPUT" 2>/dev/null; }

EVENT=$(j '.hook_event_name')
SID=$(j '.session_id'); [ -z "$SID" ] || [ "$SID" = "null" ] && SID="unknown"
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
DAY=$(date +%Y-%m-%d); TS=$(date +%H%M%S); NOW=$(date '+%Y-%m-%d %H:%M:%S')
BASE="$ROOT/.agentdocs/$DAY"
SESS="$BASE/session-$SID.md"
mkdir -p "$BASE/prompts" "$BASE/agents" "$BASE/plans" 2>/dev/null || exit 0

case "$EVENT" in
  SessionStart)
    {
      echo "# 세션 $SID"; echo
      echo "- 시작: $NOW"
      echo "- source: $(j '.source')"
      echo "- cwd: $(j '.cwd')"; echo
      echo "## 타임라인"; echo
    } >> "$SESS"
    ;;

  UserPromptSubmit)
    # 프롬프트 원본(verbatim) 보존
    {
      echo "# 프롬프트 ($NOW)"; echo
      echo '```'
      j '.prompt'
      echo '```'
    } > "$BASE/prompts/$TS-$SID.md"
    echo "- $NOW **PROMPT** → prompts/$TS-$SID.md" >> "$SESS"
    ;;

  PreToolUse)
    TOOL=$(j '.tool_name')
    if [ "$TOOL" = "Task" ]; then
      AT=$(j '.tool_input.subagent_type'); [ "$AT" = "null" ] && AT="agent"
      {
        echo "# 에이전트: $AT ($NOW)"; echo
        echo "## 설명"; echo
        j '.tool_input.description'; echo
        echo "## 지시 프롬프트"; echo
        echo '```'
        j '.tool_input.prompt'
        echo '```'
      } > "$BASE/agents/$TS-$AT.md"
      echo "- $NOW **AGENT** $AT → agents/$TS-$AT.md" >> "$SESS"
    elif [ "$TOOL" = "ExitPlanMode" ]; then
      # 플랜 모드 산출 플랜 전문 캡처
      {
        echo "# 플랜 ($NOW)"; echo
        j '.tool_input.plan'
      } > "$BASE/plans/$TS.md"
      echo "- $NOW **PLAN** → plans/$TS.md" >> "$SESS"
    fi
    ;;

  SubagentStop)
    echo "- $NOW **AGENT-DONE**" >> "$SESS"
    ;;

  Stop)
    # transcript(JSONL)에서 마지막 어시스턴트 텍스트 추출 → HANDOFF 요약
    TR=$(j '.transcript_path')
    LAST=$(tail -n 400 "$TR" 2>/dev/null \
      | jq -rc 'select(.type=="assistant") | .message.content[]?
                | select(.type=="text") | .text' 2>/dev/null | tail -n 50)
    {
      echo "# HANDOFF — $SID ($NOW)"; echo
      echo "## 마지막 응답 요약"; echo
      echo "$LAST"; echo
    } >> "$BASE/HANDOFF-$SID.md"
    echo "- $NOW **STOP** → HANDOFF-$SID.md" >> "$SESS"
    ;;

  SessionEnd)
    {
      echo
      echo "- 종료: $NOW (reason: $(j '.reason'))"
    } >> "$SESS"
    ;;
esac

exit 0
