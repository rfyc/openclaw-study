#!/bin/bash
# 将 .claude/chat-history/ 中的历史文件还原到 Claude Code 的本地历史目录
# 在另一台电脑上 clone 项目后运行此脚本，即可恢复对话历史

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CLAUDE_HOME="$HOME/.claude/projects"

# Claude Code 用项目绝对路径（/ 替换为 -）作为目录名
PROJECT_KEY=$(echo "$PROJECT_DIR" | sed 's|/|-|g')
TARGET_DIR="$CLAUDE_HOME/$PROJECT_KEY"

echo "项目路径:   $PROJECT_DIR"
echo "历史目录:   $TARGET_DIR"

mkdir -p "$TARGET_DIR"

COUNT=0
for f in "$SCRIPT_DIR/chat-history/"*.jsonl; do
  [ -f "$f" ] || continue
  cp "$f" "$TARGET_DIR/"
  echo "  已复制: $(basename "$f")"
  COUNT=$((COUNT + 1))
done

if [ "$COUNT" -eq 0 ]; then
  echo "未找到 .jsonl 历史文件"
else
  echo "完成：已还原 $COUNT 个历史文件"
fi
