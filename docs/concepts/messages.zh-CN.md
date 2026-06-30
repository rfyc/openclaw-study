---
summary: "消息流、会话、队列和推理可见性"
read_when:
  - 解释入站消息如何变成回复
  - 澄清会话、队列模式或流式传输行为
  - 记录推理可见性和使用含义
title: "消息"
---

OpenClaw 通过会话解析、队列、流式传输、工具执行和推理可见性的管道处理入站消息。本页面描述从入站消息到回复的路径。

## 消息流（高层）

```
入站消息
  -> 路由/绑定 -> 会话键
  -> 队列（如果运行正在进行）
  -> 智能体运行（流式传输 + 工具）
  -> 出站回复（频道限制 + 分块）
```

关键配置项：

- `messages.*` 用于前缀、队列和群组行为。
- `agents.defaults.*` 用于块流式传输和分块默认值。
- 频道覆盖（`channels.whatsapp.*`、`channels.telegram.*` 等）用于限制和流式传输切换。

有关完整架构，参见[配置](/gateway/configuration)。

## 入站去重

频道在重新连接后可能会重新投递相同的消息。OpenClaw 保留一个以频道/账户/对端/会话/消息 id 为键的短期缓存，以防止重复投递触发另一次智能体运行。

## 入站防抖

来自**同一发送者**的快速连续消息可以通过 `messages.inbound` 批处理到单个智能体轮次中。防抖按每频道 + 对话范围，并使用最近的消息进行回复线程/ID。

配置（全局默认 + 每频道覆盖）：

```json5
{
  messages: {
    inbound: {
      debounceMs: 2000,
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
        discord: 1500,
      },
    },
  },
}
```

注意：

- 防抖仅适用于**纯文本**消息；媒体/附件立即刷新。
- 控制命令绕过防抖以保持独立 — **除非**频道明确选择加入同一发送者私信合并（例如 [BlueBubbles `coalesceSameSenderDms`](/channels/bluebubbles#coalescing-split-send-dms-command--url-in-one-composition)），其中私信命令在防抖窗口内等待，以便分批发送的有效载荷可以加入同一智能体轮次。

## 会话和设备

会话由网关拥有，而不是由客户端拥有。

- 私信折叠到智能体主会话键。
- 群组/频道获得自己的会话键。
- 会话存储和记录存在于网关主机上。

多个设备/频道可以映射到同一会话，但历史不会完全同步回每个客户端。建议：对于长对话，使用一个主要设备以避免上下文分歧。Control UI 和 TUI 始终显示网关支持的会话记录，因此它们是真相来源。

详情：[会话管理](/concepts/session)。

## 工具结果元数据

工具结果 `content` 是模型可见的结果。工具结果 `details` 是用于 UI 渲染、诊断、媒体投递和插件的运行时元数据。

OpenClaw 明确保持该边界：

- `toolResult.details` 在提供商重放和压缩输入之前被剥离。
- 持久化的会话记录只保留有界的 `details`；超大元数据被替换为标记 `persistedDetailsTruncated: true` 的紧凑摘要。
- 插件和工具应将模型必须读取的文本放在 `content` 中，而不仅仅放在 `details` 中。

## 入站正文和历史上下文

OpenClaw 将**提示正文**与**命令正文**分离：

- `BodyForAgent`：当前消息的主要面向模型的文本。频道插件应将其集中在发送者当前携带提示的文本上。
- `Body`：遗留提示回退。这可能包括频道信封和可选的历史包装器，但当前频道在 `BodyForAgent` 可用时不应依赖它作为主要模型输入。
- `CommandBody`：用于指令/命令解析的原始用户文本。
- `RawBody`：`CommandBody` 的遗留别名（保留以兼容）。

当频道提供历史时，它使用共享包装器：

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

对于**非直接聊天**（群组/频道/房间），**当前消息正文**以发送者标签为前缀（与历史条目使用相同样式）。这使实时和队列/历史消息在智能体提示中保持一致。

历史缓冲区是**仅待处理的**：它们包括未触发运行的群组消息（例如基于提及门控的消息），并且**排除**已经在会话记录中的消息。

指令剥离仅适用于**当前消息**部分，以便历史保持完整。包装历史的频道应将 `CommandBody`（或 `RawBody`）设置为原始消息文本，并将 `Body` 保留为组合提示。结构化历史、回复、转发和频道元数据在提示组装期间渲染为用户角色不可信上下文块。历史缓冲区可通过 `messages.groupChat.historyLimit`（全局默认）和每频道覆盖如 `channels.slack.historyLimit` 或 `channels.telegram.accounts.<id>.historyLimit` 配置（设置 `0` 禁用）。

## 队列和跟进

如果运行已经活跃，入站消息可以排队、引导到当前运行或收集到跟进轮次中。

- 通过 `messages.queue`（和 `messages.queue.byChannel`）配置。
- 默认模式是 `steer`，当引导回退到队列跟进投递时，有 500ms 跟进防抖。
- 模式：`steer`、`followup`、`collect`、`steer-backlog`、`interrupt`，以及遗留的一次一个 `queue` 模式。

详情：[命令队列](/concepts/queue)和[引导队列](/concepts/queue-steering)。

## 频道运行所有权

频道插件可以在消息进入会话队列之前保持排序、防抖输入并施加传输背压。它们不应该在智能体轮次本身周围施加单独的超时。一旦消息被路由到会话，长时间运行的工作由会话、工具和运行时生命周期管理，以便所有频道一致地报告和从慢速轮次恢复。

## 流式传输、分块和批处理

块流式传输在模型生成文本块时发送部分回复。分块遵守频道文本限制，避免分割围栏代码。

关键设置：

- `agents.defaults.blockStreamingDefault`（`on|off`，默认关闭）
- `agents.defaults.blockStreamingBreak`（`text_end|message_end`）
- `agents.defaults.blockStreamingChunk`（`minChars|maxChars|breakPreference`）
- `agents.defaults.blockStreamingCoalesce`（基于空闲的批处理）
- `agents.defaults.humanDelay`（块回复之间的类人暂停）
- 频道覆盖：`*.blockStreaming` 和 `*.blockStreamingCoalesce`（非 Telegram 频道需要显式 `*.blockStreaming: true`）

详情：[流式传输 + 分块](/concepts/streaming)。

## 推理可见性和令牌

OpenClaw 可以暴露或隐藏模型推理：

- `/reasoning on|off|stream` 控制可见性。
- 当模型生成推理内容时，它仍然计入令牌使用量。
- Telegram 支持将推理流式传输到短暂的草稿气泡中，在最终投递后删除；使用 `/reasoning on` 进行持久推理输出。

详情：[思考 + 推理指令](/tools/thinking)和[令牌使用](/reference/token-use)。

## 前缀、线程和回复

出站消息格式在 `messages` 中集中化：

- `messages.responsePrefix`、`channels.<channel>.responsePrefix` 和 `channels.<channel>.accounts.<id>.responsePrefix`（出站前缀级联），加上 `channels.whatsapp.messagePrefix`（WhatsApp 入站前缀）
- 通过 `replyToMode` 和每频道默认值进行回复线程

详情：[配置](/gateway/config-agents#messages)和频道文档。

## 静默回复

精确的静默令牌 `NO_REPLY` / `no_reply` 意味着"不要投递用户可见的回复"。当一个轮次还有待处理的工具媒体，例如生成的 TTS 音频时，OpenClaw 剥离静默文本但仍然投递媒体附件。OpenClaw 按对话类型解析该行为：

- 直接对话默认不允许静默，并将裸静默回复重写为简短的可见回退。
- 群组/频道默认允许静默。
- 内部编排默认允许静默。

OpenClaw 还对发生在非直接聊天中、在任何助手回复之前的内部运行器失败使用静默回复，这样群组/频道就不会看到网关错误样板文字。直接聊天默认显示紧凑的失败副本；原始运行器详情仅在 `/verbose` 为 `on` 或 `full` 时显示。

默认值存在于 `agents.defaults.silentReply` 和 `agents.defaults.silentReplyRewrite` 下；`surfaces.<id>.silentReply` 和 `surfaces.<id>.silentReplyRewrite` 可以按界面覆盖它们。

当父会话有一个或多个待处理的派生子智能体运行时，裸静默回复在所有界面上被丢弃，而不是被重写，这样父智能体在子完成事件投递真实回复之前保持安静。

## 相关

- [流式传输](/concepts/streaming) — 实时消息投递
- [重试](/concepts/retry) — 消息投递重试行为
- [队列](/concepts/queue) — 消息处理队列
- [频道](/channels) — 消息平台集成
