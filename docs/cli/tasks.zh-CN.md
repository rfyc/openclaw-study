---
summary: "`openclaw tasks` 的 CLI 参考（后台任务账本和 Task Flow 状态）"
read_when:
  - 你想检查、审计或取消后台任务记录时
  - 你在记录 `openclaw tasks flow` 下的 Task Flow 命令时
title: "`openclaw tasks`"
---

检查持久后台任务和 Task Flow 状态。没有子命令时，`openclaw tasks` 等价于 `openclaw tasks list`。

有关生命周期和交付模型，请参阅[后台任务](/automation/tasks)。

## 用法

```bash
openclaw tasks
openclaw tasks list
openclaw tasks list --runtime acp
openclaw tasks list --status running
openclaw tasks show <lookup>
openclaw tasks notify <lookup> state_changes
openclaw tasks cancel <lookup>
openclaw tasks audit
openclaw tasks maintenance
openclaw tasks maintenance --apply
openclaw tasks flow list
openclaw tasks flow show <lookup>
openclaw tasks flow cancel <lookup>
```

## 根选项

- `--json`：输出 JSON。
- `--runtime <name>`：按类型过滤：`subagent`、`acp`、`cron` 或 `cli`。
- `--status <name>`：按状态过滤：`queued`、`running`、`succeeded`、`failed`、`timed_out`、`cancelled` 或 `lost`。

## 子命令

### `list`

```bash
openclaw tasks list [--runtime <name>] [--status <name>] [--json]
```

按最新优先列出跟踪的后台任务。

### `show`

```bash
openclaw tasks show <lookup> [--json]
```

按任务 ID、运行 ID 或会话键显示一个任务。

### `notify`

```bash
openclaw tasks notify <lookup> <done_only|state_changes|silent>
```

更改运行中任务的通知策略。

### `cancel`

```bash
openclaw tasks cancel <lookup>
```

取消运行中的后台任务。

### `audit`

```bash
openclaw tasks audit [--severity <warn|error>] [--code <name>] [--limit <n>] [--json]
```

显示过时、丢失、交付失败或其他不一致的任务和 Task Flow 记录。保留到 `cleanupAfter` 的丢失任务是警告；过期或未加时间戳的丢失任务是错误。

### `maintenance`

```bash
openclaw tasks maintenance [--apply] [--json]
```

预览或应用任务和 Task Flow 协调、清理标记和修剪。
对于 cron 任务，协调在将旧的活跃任务标记为 `lost` 之前使用持久化的运行日志/作业状态，因此完成的 cron 运行不会因为内存中的 Gateway 运行时状态消失而变成错误的审计错误。离线 CLI 审计对于 Gateway 进程本地 cron 活跃作业集不具有权威性。

### `flow`

```bash
openclaw tasks flow list [--status <name>] [--json]
openclaw tasks flow show <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

检查或取消任务账本下的持久 Task Flow 状态。

## 相关

- [CLI 参考](/cli)
- [后台任务](/automation/tasks)
