---
summary: "`openclaw commitments` 的 CLI 参考（检查和解除推断的后续承诺）"
read_when:
  - 你想检查推断的后续承诺
  - 你想解除待处理的签到
  - 你正在审计心跳可能投递的内容
title: "`openclaw commitments`"
---

列出并管理推断的后续承诺。

承诺是从对话上下文创建的可选的、短期的后续记忆。请参阅 [推断承诺](/concepts/commitments) 了解概念指南。

不带子命令时，`openclaw commitments` 列出待处理的承诺。

## 用法

```bash
openclaw commitments [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments list [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments dismiss <id...> [--json]
```

## 选项

- `--all`：显示所有状态，而不仅仅是待处理的承诺。
- `--agent <id>`：过滤到一个 agent ID。
- `--status <status>`：按状态过滤。值：`pending`、`sent`、`dismissed`、`snoozed` 或 `expired`。
- `--json`：输出机器可读的 JSON。

## 示例

列出待处理承诺：

```bash
openclaw commitments
```

列出所有已存储的承诺：

```bash
openclaw commitments --all
```

过滤到一个 agent：

```bash
openclaw commitments --agent main
```

查找已暂停的承诺：

```bash
openclaw commitments --status snoozed
```

解除一个或多个承诺：

```bash
openclaw commitments dismiss cm_abc123 cm_def456
```

导出为 JSON：

```bash
openclaw commitments --all --json
```

## 输出

文本输出包括：

- 承诺 ID
- 状态
- 类型
- 最早到期时间
- 范围
- 建议的签到文本

JSON 输出还包括承诺存储路径和完整的已存储记录。

## 相关

- [推断承诺](/concepts/commitments)
- [记忆概览](/concepts/memory)
- [心跳](/gateway/heartbeat)
- [计划任务](/automation/cron-jobs)
