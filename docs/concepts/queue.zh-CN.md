---
summary: "自动回复队列模式、默认值和每个会话的覆盖"
read_when:
  - 更改自动回复执行或并发
  - 解释 /queue 模式或消息转向行为
title: "命令队列"
---

我们通过一个微小的进程内队列序列化入站自动回复运行（所有频道），以防止多个智能体运行发生冲突，同时仍允许跨会话的安全并行性。

## 为什么

- 自动回复运行可能很昂贵（LLM 调用），并且当多个入站消息紧密到达时可能发生冲突。
- 序列化避免了对共享资源（会话文件、日志、CLI 标准输入）的竞争，并减少了上游速率限制的可能性。

## 工作原理

- 一个感知通道的 FIFO 队列以可配置的并发上限清空每个通道（未配置通道默认为 1；main 默认为 4，subagent 为 8）。
- `runEmbeddedPiAgent` 按**会话键**（通道 `session:<key>`）入队，以保证每个会话只有一个活跃运行。
- 然后每个会话运行进入**全局通道**（默认为 `main`），以便总并行性受 `agents.defaults.maxConcurrent` 限制。
- 当启用详细日志记录时，如果等待超过约 2 秒才启动，已排队的运行会发出简短通知。
- 输入指示器在入队时仍然立即触发（当频道支持时），因此在等待轮到时用户体验不变。

## 默认值

未设置时，所有入站频道使用：

- `mode: "steer"`
- `debounceMs: 500`
- `cap: 20`
- `drop: "summarize"`

`steer` 是默认值，因为它在不启动第二个会话运行的情况下保持活跃模型轮次的响应性。它在下一个模型边界之前清空所有到达的转向消息。如果当前运行无法接受转向，OpenClaw 回退到后续队列条目。

## 队列模式

入站消息可以转向当前运行、等待后续轮次，或两者兼有：

- `steer`：将转向消息排入活跃运行时。Pi 在**当前助手轮次完成执行其工具调用之后**、下一次 LLM 调用之前投递所有待处理的转向消息；Codex 应用服务器接收一个批处理的 `turn/steer`。如果运行没有活跃流式传输或转向不可用，OpenClaw 回退到后续队列条目。
- `queue`（旧版）：旧版逐一转向。Pi 在每个模型边界投递一条已排队的转向消息；Codex 应用服务器接收单独的 `turn/steer` 请求。除非你需要以前的序列化行为，否则优先使用 `steer`。
- `followup`：将每条消息排入当前运行结束后的后续智能体轮次。
- `collect`：在静默窗口后将已排队的消息合并到**单个**后续轮次中。如果消息针对不同的频道/线程，它们单独清空以保留路由。
- `steer-backlog`（又名 `steer+backlog`）：现在转向**并且**为后续轮次保留相同的消息。
- `interrupt`（旧版）：中止该会话的活跃运行，然后运行最新的消息。

steer-backlog 意味着你可以在转向运行之后得到后续响应，因此流式传输面可能看起来像重复的。如果你想要每条入站消息只有一个响应，优先使用 `collect`/`steer`。

有关运行时特定的时序和依赖行为，请参见[转向队列](/concepts/queue-steering)。有关显式的 `/steer <message>` 命令，请参见 [Steer](/tools/steer)。

通过 `messages.queue` 进行全局或每个频道的配置：

```json5
{
  messages: {
    queue: {
      mode: "steer",
      debounceMs: 500,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" },
    },
  },
}
```

## 队列选项

选项适用于 `followup`、`collect` 和 `steer-backlog`（以及当转向回退到 followup 时的 `steer` 或旧版 `queue`）：

- `debounceMs`：清空已排队的后续跟进之前的静默窗口。纯数字为毫秒；`/queue` 选项接受 `ms`、`s`、`m`、`h` 和 `d` 单位。
- `cap`：每个会话的最大排队消息数。低于 `1` 的值被忽略。
- `drop: "summarize"`：默认。根据需要丢弃最旧的已排队条目，保留简洁的摘要，并将它们作为合成的后续提示注入。
- `drop: "old"`：根据需要丢弃最旧的已排队条目，不保留摘要。
- `drop: "new"`：当队列已满时拒绝最新的消息。

默认值：`debounceMs: 500`，`cap: 20`，`drop: summarize`。

## 优先级

对于模式选择，OpenClaw 解析：

1. 内联或存储的每个会话 `/queue` 覆盖。
2. `messages.queue.byChannel.<channel>`。
3. `messages.queue.mode`。
4. 默认 `steer`。

对于选项，内联或存储的 `/queue` 选项优先于配置。然后应用频道特定的防抖（`messages.queue.debounceMsByChannel`）、插件防抖默认值、全局 `messages.queue` 选项和内置默认值。`cap` 和 `drop` 是全局/会话选项，不是每个频道的配置键。

## 每个会话的覆盖

- 发送 `/queue <mode>` 作为独立命令以存储当前会话的模式。
- 选项可以组合：`/queue collect debounce:0.5s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 清除会话覆盖。

## 范围和保证

- 适用于使用网关回复管道的所有入站频道的自动回复智能体运行（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）。
- 默认通道（`main`）对入站 + 主心跳是进程范围的；设置 `agents.defaults.maxConcurrent` 以允许多个会话并行运行。
- 可能存在其他通道（例如 `cron`、`cron-nested`、`nested`、`subagent`），以便后台作业可以并行运行而不阻塞入站回复。隔离的 cron 智能体轮次持有一个 `cron` 槽，而它们的内部智能体执行使用 `cron-nested`；两者都使用 `cron.maxConcurrentRuns`。共享的非 cron `nested` 流保持其自己的通道行为。这些分离的运行被追踪为[后台任务](/automation/tasks)。
- 每个会话的通道保证一次只有一个智能体运行触及给定会话。
- 没有外部依赖或后台工作线程；纯 TypeScript + Promise。

## 故障排除

- 如果命令看起来卡住了，启用详细日志并查找"queued for …ms"行以确认队列正在清空。
- 如果你需要队列深度，启用详细日志并观察队列时序行。
- 接受轮次然后停止发出进度的 Codex 应用服务器运行会被 Codex 适配器中断，以便活跃会话通道可以释放，而不是等待外部运行超时。
- 当启用诊断时，在没有观察到回复、工具、状态、块或 ACP 进度的情况下，超过 `diagnostics.stuckSessionWarnMs` 仍处于 `processing` 状态的会话会按当前活动进行分类。活跃工作记录为 `session.long_running`；没有最近进度的活跃工作记录为 `session.stalled`；`session.stuck` 保留给没有活跃工作的过时会话记账，只有该路径可以释放受影响的会话通道，以便已排队的工作清空。重复的 `session.stuck` 诊断在会话保持不变时退避。

## 相关

- [会话管理](/concepts/session)
- [转向队列](/concepts/queue-steering)
- [Steer](/tools/steer)
- [重试策略](/concepts/retry)
