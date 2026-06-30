---
summary: "`openclaw sessions` 的 CLI 参考（列出已存储的会话 + 使用情况）"
read_when:
  - 你想列出已存储的会话并查看最近活动时
title: "Sessions"
---

# `openclaw sessions`

列出已存储的对话会话。

会话列表不是频道/提供商活跃性检查。它们显示来自会话存储的持久化对话行。安静的 Discord、Slack、Telegram 或其他频道可以在不创建新会话行的情况下成功重新连接，直到处理消息为止。当你需要实时频道连接性时，使用 `openclaw channels status --probe`、`openclaw status --deep` 或 `openclaw health --verbose`。

Gateway `sessions.list` 响应默认是有界的，因此大型长期存储不能垄断 Gateway 事件循环。当需要不同的结果窗口时，从 RPC 客户端传递明确的正 `limit`；当调用者需要显示存在更多行时，响应包含 `totalCount`、`limitApplied` 和 `hasMore`。

```bash
openclaw sessions
openclaw sessions --agent work
openclaw sessions --all-agents
openclaw sessions --active 120
openclaw sessions --verbose
openclaw sessions --json
```

范围选择：

- 默认：已配置的默认代理存储
- `--verbose`：详细日志
- `--agent <id>`：一个已配置的代理存储
- `--all-agents`：聚合所有已配置的代理存储
- `--store <path>`：明确的存储路径（不能与 `--agent` 或 `--all-agents` 结合使用）

导出存储会话的轨迹包：

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --output bug-123 --json
```

这是所有者批准执行请求后 `/export-trajectory` 斜线命令使用的命令路径。输出目录始终在所选工作空间下的 `.openclaw/trajectory-exports/` 中解析。

`openclaw sessions --all-agents` 读取已配置的代理存储。Gateway 和 ACP 会话发现范围更广：它们还包括在默认 `agents/` 根目录或模板化的 `session.store` 根目录下找到的仅磁盘存储。这些发现的存储必须解析为代理根目录内的常规 `sessions.json` 文件；符号链接和根目录外的路径被跳过。

JSON 示例：

`openclaw sessions --all-agents --json`：

```json
{
  "path": null,
  "stores": [
    { "agentId": "main", "path": "/home/user/.openclaw/agents/main/sessions/sessions.json" },
    { "agentId": "work", "path": "/home/user/.openclaw/agents/work/sessions/sessions.json" }
  ],
  "allAgents": true,
  "count": 2,
  "activeMinutes": null,
  "sessions": [
    { "agentId": "main", "key": "agent:main:main", "model": "gpt-5" },
    { "agentId": "work", "key": "agent:work:main", "model": "claude-opus-4-6" }
  ]
}
```

## 清理维护

立即运行维护（而不是等待下一个写入周期）：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --agent work --dry-run
openclaw sessions cleanup --all-agents --dry-run
openclaw sessions cleanup --enforce
openclaw sessions cleanup --enforce --active-key "agent:main:telegram:direct:123"
openclaw sessions cleanup --json
```

`openclaw sessions cleanup` 使用配置中的 `session.maintenance` 设置：

- 范围说明：`openclaw sessions cleanup` 维护会话存储、转录和轨迹附属文件。它不清除 cron 运行日志（`cron/runs/<jobId>.jsonl`），这些日志由 `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 在 [Cron 配置](/automation/cron-jobs#configuration) 中管理，并在 [Cron 维护](/automation/cron-jobs#maintenance) 中说明。

- `--dry-run`：预览将清除/限制的条目数，不写入。
  - 在文本模式下，预演打印每会话操作表（`Action`、`Key`、`Age`、`Model`、`Flags`），以便你可以看到将保留与删除的内容。
- `--enforce`：即使 `session.maintenance.mode` 为 `warn` 也应用维护。
- `--fix-missing`：删除转录文件缺失的条目，即使它们通常不会因年龄/数量而被删除。
- `--active-key <key>`：保护特定的活跃键免于磁盘预算驱逐。持久的外部对话指针（如群组会话和线程范围的聊天会话）也按年龄/数量/磁盘预算维护保留。
- `--agent <id>`：对一个已配置的代理存储运行清理。
- `--all-agents`：对所有已配置的代理存储运行清理。
- `--store <path>`：对特定的 `sessions.json` 文件运行。
- `--json`：打印 JSON 摘要。使用 `--all-agents` 时，输出包含每个存储的一个摘要。

当 Gateway 可达时，已配置代理存储的非预演清理通过 Gateway 发送，以便与运行时流量共享相同的会话存储写入器。使用 `--store <path>` 对存储文件进行明确的离线修复。

`openclaw sessions cleanup --all-agents --dry-run --json`：

```json
{
  "allAgents": true,
  "mode": "warn",
  "dryRun": true,
  "stores": [
    {
      "agentId": "main",
      "storePath": "/home/user/.openclaw/agents/main/sessions/sessions.json",
      "beforeCount": 120,
      "afterCount": 80,
      "pruned": 40,
      "capped": 0
    },
    {
      "agentId": "work",
      "storePath": "/home/user/.openclaw/agents/work/sessions/sessions.json",
      "beforeCount": 18,
      "afterCount": 18,
      "pruned": 0,
      "capped": 0
    }
  ]
}
```

相关：

- 会话配置：[配置参考](/gateway/config-agents#session)

## 相关

- [CLI 参考](/cli)
- [会话管理](/concepts/session)
