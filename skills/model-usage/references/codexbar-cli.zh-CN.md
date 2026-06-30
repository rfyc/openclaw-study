# CodexBar CLI 快速参考（使用情况 + 成本）

## 安装

- 应用：偏好设置 -> 高级 -> 安装 CLI
- 仓库：./bin/install-codexbar-cli.sh

## 命令

- 使用情况快照（网页/CLI 来源）：
  - codexbar usage --format json --pretty
  - codexbar --provider all --format json
- 本地成本使用情况（仅 Codex + Claude）：
  - codexbar cost --format json --pretty
  - codexbar cost --provider codex|claude --format json

## 成本 JSON 字段

载荷为数组（每个提供商一项）。

- provider、source、updatedAt
- sessionTokens、sessionCostUSD
- last30DaysTokens、last30DaysCostUSD
- daily[]：date、inputTokens、outputTokens、cacheReadTokens、cacheCreationTokens、totalTokens、totalCost、modelsUsed、modelBreakdowns[]
- modelBreakdowns[]：modelName、cost
- totals：totalInputTokens、totalOutputTokens、cacheReadTokens、cacheCreationTokens、totalTokens、totalCost

## 注意事项

- 成本使用情况为本地专用。它读取以下位置的 JSONL 日志：
  - Codex: ~/.codex/sessions/\*_/_.jsonl
  - Claude: ~/.config/claude/projects/**/\*.jsonl 或 ~/.claude/projects/**/\*.jsonl
- 如需网页使用情况（非本地），使用 codexbar usage（不是 cost）。
