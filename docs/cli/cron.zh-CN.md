---
summary: "`openclaw cron` 的 CLI 参考（调度和运行后台作业）"
read_when:
  - 你想要计划任务和唤醒
  - 你正在调试 cron 执行和日志
title: "Cron"
---

# `openclaw cron`

管理 Gateway 调度器的 cron 作业。

<Tip>
运行 `openclaw cron --help` 获取完整的命令界面。请参阅 [Cron 作业](/automation/cron-jobs) 了解概念指南。
</Tip>

## 会话

`--session` 接受 `main`、`isolated`、`current` 或 `session:<id>`。

<AccordionGroup>
  <Accordion title="会话密钥">
    - `main` 绑定到 agent 的主会话。
    - `isolated` 为每次运行创建新的对话记录和会话 ID。
    - `current` 在创建时绑定到活动会话。
    - `session:<id>` 固定到显式的持久会话密钥。

  </Accordion>
  <Accordion title="隔离会话语义">
    隔离运行重置环境对话上下文。频道和群组路由、发送/排队策略、提权、来源和 ACP 运行时绑定会为新运行重置。安全偏好和显式用户选择的模型或认证覆盖可以跨运行保留。
  </Accordion>
</AccordionGroup>

## 投递

`openclaw cron list` 和 `openclaw cron show <job-id>` 预览已解析的投递路由。对于 `channel: "last"`，预览显示路由是从主会话还是当前会话解析的，或者将会关闭失败。

提供商前缀目标可以消除未解析的公告频道的歧义。例如，当省略 `delivery.channel` 或 `last` 时，`to: "telegram:123"` 会选择 Telegram。只有已加载插件公布的前缀才是提供商选择器。如果 `delivery.channel` 是显式的，前缀必须匹配该频道；带有 `to: "telegram:123"` 的 `channel: "whatsapp"` 会被拒绝。`imessage:` 和 `sms:` 等服务前缀仍然是频道拥有的目标语法。

<Note>
隔离的 `cron add` 作业默认为 `--announce` 投递。使用 `--no-deliver` 保持输出为内部。`--deliver` 作为 `--announce` 的已弃用别名仍然有效。
</Note>

### 投递所有权

隔离的 cron 聊天投递在 agent 和运行器之间共享：

- agent 可以在聊天路由可用时使用 `message` 工具直接发送。
- `announce` 回退投递仅在 agent 没有直接发送到已解析目标时才投递最终回复。
- `webhook` 将完成的有效载荷发布到 URL。
- `none` 禁用运行器回退投递。

`--announce` 是最终回复的运行器回退投递。`--no-deliver` 禁用该回退，但当聊天路由可用时不会删除 agent 的 `message` 工具。

从活动聊天创建的提醒会保留实时聊天投递目标用于回退公告投递。内部会话密钥可能是小写的；不要将它们用作大小写敏感提供商 ID（如 Matrix 房间 ID）的真相来源。

### 失败投递

失败通知按此顺序解析：

1. 作业上的 `delivery.failureDestination`。
2. 全局 `cron.failureDestination`。
3. 作业的主要公告目标（当没有设置显式失败目标时）。

<Note>
主会话作业只能在主要投递模式为 `webhook` 时使用 `delivery.failureDestination`。隔离作业在所有模式下都接受它。
</Note>

注意：隔离 cron 运行即使没有产生回复有效载荷，也会将运行级别的 agent 失败视为作业错误，因此模型/提供商失败仍然会增加错误计数器并触发失败通知。

## 调度

### 单次作业

`--at <datetime>` 调度单次运行。无偏移量的日期时间被视为 UTC，除非你还传递 `--tz <iana>`，这会将挂钟时间解释为给定时区。

<Note>
单次作业默认在成功后删除。使用 `--keep-after-run` 保留它们。
</Note>

### 重复作业

重复作业在连续错误后使用指数退避重试：30s、1m、5m、15m、60m。下一次成功运行后，调度恢复正常。

跳过的运行与执行错误分开跟踪。它们不影响重试退避，但 `openclaw cron edit <job-id> --failure-alert-include-skipped` 可以选择让失败警报包含重复的跳过运行通知。

对于针对本地配置模型提供商的隔离作业，cron 在启动 agent 回合之前运行轻量级提供商预检。回环、私有网络和 `.local` `api: "ollama"` 提供商在 `/api/tags` 处被探测；本地 OpenAI 兼容提供商（如 vLLM、SGLang 和 LM Studio）在 `/models` 处被探测。如果端点不可达，运行会被记录为 `skipped` 并在稍后的调度上重试；匹配的死亡端点会被缓存 5 分钟，以避免许多作业同时轰击同一本地服务器。

注意：cron 作业定义存储在 `jobs.json` 中，而待处理的运行时状态存储在 `jobs-state.json` 中。如果 `jobs.json` 被外部编辑，Gateway 会重新加载更改的调度并清除陈旧的待处理槽；仅格式化的重写不会清除待处理槽。

### 手动运行

`openclaw cron run` 一旦手动运行排队就返回。成功响应包括 `{ ok: true, enqueued: true, runId }`。使用 `openclaw cron runs --id <job-id>` 跟踪最终结果。

<Note>
`openclaw cron run <job-id>` 默认强制运行。使用 `--due` 保留旧的"仅在到期时运行"行为。
</Note>

## 模型

`cron add|edit --model <ref>` 为作业选择允许的模型。

<Warning>
如果模型不被允许或无法解析，cron 会以明确的验证错误使运行失败，而不是回退到作业的 agent 或默认模型选择。
</Warning>

Cron `--model` 是**作业主要模型**，而不是聊天会话 `/model` 覆盖。这意味着：

- 当所选作业模型失败时，配置的模型回退仍然适用。
- 每作业有效载荷 `fallbacks` 在存在时替换配置的回退列表。
- 空的每作业回退列表（作业有效载荷/API 中的 `fallbacks: []`）使 cron 运行严格化。
- 当作业有 `--model` 但没有配置回退列表时，OpenClaw 传递显式的空回退覆盖，这样 agent 主要模型就不会作为隐藏的重试目标被追加。

### 隔离 cron 模型优先级

隔离 cron 按此顺序解析活动模型：

1. Gmail 钩子覆盖。
2. 每作业 `--model`。
3. 存储的 cron 会话模型覆盖（当用户选择了一个时）。
4. Agent 或默认模型选择。

### 快速模式

隔离 cron 快速模式遵循已解析的实时模型选择。模型配置 `params.fastMode` 默认适用，但存储的会话 `fastMode` 覆盖仍然优先于配置。

### 实时模型切换重试

如果隔离运行抛出 `LiveSessionModelSwitchError`，cron 会在重试之前为活动运行持久化切换的提供商和模型（以及切换的认证配置文件覆盖，如果存在）。外部重试循环在初始尝试后限制为两次切换重试，然后中止而不是无限循环。

## 运行输出和拒绝

### 陈旧确认抑制

隔离 cron 回合会抑制陈旧的仅确认回复。如果第一个结果只是中间状态更新，且没有后代子 agent 运行负责最终答案，cron 会在投递之前再次提示以获得真实结果。

### 静默令牌抑制

如果隔离 cron 运行只返回静默令牌（`NO_REPLY` 或 `no_reply`），cron 会同时抑制直接出站投递和回退排队摘要路径，这样聊天中就不会发布任何内容。

### 结构化拒绝

隔离 cron 运行优先使用嵌入式运行中的结构化执行拒绝元数据，然后回退到最终输出中的已知拒绝标记，如 `SYSTEM_RUN_DENIED`、`INVALID_REQUEST` 和审批绑定拒绝短语。

`cron list` 和运行历史会显示拒绝原因，而不是将被阻止的命令报告为 `ok`。

## 保留

保留和修剪在配置中控制：

- `cron.sessionRetention`（默认 `24h`）修剪已完成的隔离运行会话。
- `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 修剪 `~/.openclaw/cron/runs/<jobId>.jsonl`。

## 迁移旧作业

<Note>
如果你有当前投递和存储格式之前的 cron 作业，运行 `openclaw doctor --fix`。Doctor 会规范化遗留 cron 字段（`jobId`、`schedule.cron`、顶级投递字段（包括遗留 `threadId`）、有效载荷 `provider` 投递别名），并在配置了 `cron.webhook` 时将简单的 `notify: true` webhook 回退作业迁移到显式 webhook 投递。
</Note>

## 常见编辑

更新投递设置而不更改消息：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

为隔离作业禁用投递：

```bash
openclaw cron edit <job-id> --no-deliver
```

为隔离作业启用轻量级引导上下文：

```bash
openclaw cron edit <job-id> --light-context
```

公告到特定频道：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

公告到 Telegram 论坛话题：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "-1001234567890" --thread-id 42
```

创建带轻量级引导上下文的隔离作业：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 仅适用于隔离的 agent 回合作业。对于 cron 运行，轻量级模式保持引导上下文为空，而不是注入完整的工作区引导集。

## 常见管理命令

手动运行和检查：

```bash
openclaw cron list
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

`cron runs` 条目包含投递诊断，包含预期的 cron 目标、已解析的目标、消息工具发送、回退使用和已投递状态。

Agent 和会话重定向：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

`openclaw cron add` 在 agent 回合作业中省略 `--agent` 时会发出警告，并回退到默认 agent（`main`）。在创建时传递 `--agent <id>` 以固定特定 agent。

投递调整：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

## 相关

- [CLI 参考](/cli)
- [计划任务](/automation/cron-jobs)
