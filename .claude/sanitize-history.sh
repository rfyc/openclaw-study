#!/bin/bash
# 对 .claude/chat-history/ 目录下的 JSONL 对话历史进行脱敏处理
# 替换常见的 API Key / Token 格式，防止推送到 GitHub 时触发 Secret Scanning

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HISTORY_DIR="$SCRIPT_DIR/chat-history"

if [ ! -d "$HISTORY_DIR" ]; then
  echo "未找到目录: $HISTORY_DIR"
  exit 1
fi

CHANGED=0

for f in "$HISTORY_DIR"/*.jsonl; do
  [ -f "$f" ] || continue
  BEFORE=$(md5 -q "$f" 2>/dev/null || md5sum "$f" | awk '{print $1}')

  # GitHub PAT (classic): ghp_xxxx
  sed -i '' 's/ghp_[A-Za-z0-9]\{1,\}/[REDACTED_PAT]/g' "$f"
  # GitHub PAT (fine-grained): github_pat_xxxx
  sed -i '' 's/github_pat_[A-Za-z0-9_]\{1,\}/[REDACTED_PAT]/g' "$f"
  # Anthropic API Key: sk-ant-xxxx
  sed -i '' 's/sk-ant-[A-Za-z0-9_-]\{20,\}/[REDACTED_ANTHROPIC]/g' "$f"
  # OpenAI API Key: sk-proj-xxxx / sk-xxxx
  sed -i '' 's/sk-proj-[A-Za-z0-9_-]\{20,\}/[REDACTED_OPENAI]/g' "$f"
  sed -i '' 's/sk-[A-Za-z0-9]\{48\}/[REDACTED_OPENAI]/g' "$f"
  # 自定义 OpenAI 代理 Key 格式: 300000189:hex32
  sed -i '' 's/300000189:[a-f0-9]\{32\}/[REDACTED_APIKEY]/g' "$f"

  AFTER=$(md5 -q "$f" 2>/dev/null || md5sum "$f" | awk '{print $1}')
  if [ "$BEFORE" != "$AFTER" ]; then
    echo "  已脱敏: $(basename "$f")"
    CHANGED=$((CHANGED + 1))
  fi
done

if [ "$CHANGED" -eq 0 ]; then
  echo "无需脱敏，文件未发生变化"
else
  echo "完成：共脱敏 $CHANGED 个文件"
fi
