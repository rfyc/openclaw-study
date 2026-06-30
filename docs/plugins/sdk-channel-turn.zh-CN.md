---
summary: "runtime.channel.turn -- 捆绑和第三方频道插件用于记录、调度和最终化 agent 轮次的共享入站轮次内核"
title: "频道轮次内核"
sidebarTitle: "频道轮次"
read_when:
  - 你正在构建频道插件并希望使用共享入站轮次生命周期
  - 你正在将频道监视器从手动编写的记录/调度胶水迁移出来
  - 你需要了解 admission、ingest、classify、preflight、resolve、record、dispatch 和 finalize 阶段
---

频道轮次内核是将标准化的平台事件转变为 agent 轮次的共享入站状态机。频道插件提供平台事实和传递回调。核心拥有编排：ingest、classify、preflight、resolve、authorize、assemble、record、dispatch 和 finalize。

当你的插件处于入站消息热路径时使用此功能。对于非消息事件（斜杠命令、模态框、按钮交互、生命周期事件、反应、语音状态），将它们保留在插件本地。内核只拥有可能成为 agent 文本轮次的事件。

<Info>
  内核通过注入的插件运行时以 `runtime.channel.turn.*` 访问。插件运行时类型从 `openclaw/plugin-sdk/core` 导出，因此第三方原生插件可以与捆绑的频道插件以相同方式使用这些入口点。
</Info>

## 为什么需要共享内核

频道插件重复相同的入站流程：规范化、路由、门控、构建上下文、记录会话元数据、调度 agent 轮次、最终化传递状态。没有共享内核，对提及门控、仅工具可见回复、会话元数据、挂起历史或调度最终化的更改必须逐频道应用。

内核故意将四个概念分开：

- `ConversationFacts`：消息来自哪里
- `RouteFacts`：哪个 agent 和会话应该处理它
- `ReplyPlanFacts`：可见回复应该去哪里
- `MessageFacts`：agent 应该看到什么正文和补充上下文

Slack DM、Telegram 话题、Matrix 线程和 Feishu 话题会话在实践中都区分这些。将它们视为一个标识符会随时间产生漂移。

## 阶段生命周期

无论频道如何，内核都运行相同的固定管道：

1. `ingest` — 适配器将原始平台事件转换为 `NormalizedTurnInput`
2. `classify` — 适配器声明此事件是否可以开始 agent 轮次
3. `preflight` — 适配器执行去重、自回显、水化、去抖、解密、部分事实预填充
4. `resolve` — 适配器返回完全组装的轮次（路由、回复计划、消息、传递）
5. `authorize` — 对组装的事实应用 DM、组、提及和命令策略
6. `assemble` — 通过 `buildContext` 从事实构建 `FinalizedMsgContext`
7. `record` — 持久化入站会话元数据和最后路由
8. `dispatch` — 通过缓冲块调度器执行 agent 轮次
9. `finalize` — 即使在调度错误时，适配器的 `onFinalize` 也会运行

当提供 `log` 回调时，每个阶段都会发出结构化日志事件。请参见[可观察性](#observability)。

## 准入类型

当轮次被门控时，内核不会抛出异常。它返回 `ChannelTurnAdmission`：

| 类型          | 何时                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------- |
| `dispatch`    | 轮次已准入。Agent 轮次运行，并执行可见回复路径。                                             |
| `observeOnly` | 轮次端到端运行，但传递适配器不发送任何可见内容。用于广播观察者 agent 和其他被动多 agent 流。 |
| `handled`     | 平台事件在本地被消费（生命周期、反应、按钮、模态框）。内核跳过调度。                         |
| `drop`        | 跳过路径。可选的 `recordHistory: true` 将消息保存在挂起的组历史中，以便将来的提及有上下文。  |

准入可以来自 `classify`（事件类别表示无法开始轮次）、来自 `preflight`（去重、自回显、缺少提及但有历史记录）或来自 `resolveTurn` 本身。

## 入口点

运行时公开三个首选入口点，以便适配器可以在与频道匹配的级别上选择加入。

```typescript
runtime.channel.turn.run(...)             // adapter-driven full pipeline
runtime.channel.turn.runPrepared(...)     // channel owns dispatch; kernel runs record + finalize
runtime.channel.turn.buildContext(...)    // pure facts to FinalizedMsgContext mapping
```

两个较旧的运行时助手保留用于插件 SDK 兼容性：

```typescript
runtime.channel.turn.runResolved(...)      // deprecated compatibility alias; prefer run
runtime.channel.turn.dispatchAssembled(...) // deprecated compatibility alias; prefer run or runPrepared
```

### run

当你的频道可以将入站流表达为 `ChannelTurnAdapter<TRaw>` 时使用。适配器具有 `ingest`、可选的 `classify`、可选的 `preflight`、必需的 `resolveTurn` 和可选的 `onFinalize` 回调。

```typescript
await runtime.channel.turn.run({
  channel: "tlon",
  accountId,
  raw: platformEvent,
  adapter: {
    ingest(raw) {
      return {
        id: raw.messageId,
        timestamp: raw.timestamp,
        rawText: raw.body,
        textForAgent: raw.body,
      };
    },
    classify(input) {
      return { kind: "message", canStartAgentTurn: input.rawText.length > 0 };
    },
    async preflight(input, eventClass) {
      if (await isDuplicate(input.id)) {
        return { admission: { kind: "drop", reason: "dedupe" } };
      }
      return {};
    },
    resolveTurn(input) {
      return buildAssembledTurn(input);
    },
    onFinalize(result) {
      clearPendingGroupHistory(result);
    },
  },
});
```

当频道具有小适配器逻辑并从通过钩子拥有生命周期中受益时，`run` 是正确的形状。

### runPrepared

当频道具有必须保持频道拥有的复杂本地调度器（带有预览、重试、编辑或线程引导）时使用。内核仍然在调度之前记录入站会话，并提供统一的 `DispatchedChannelTurnResult`。

```typescript
const { dispatchResult } = await runtime.channel.turn.runPrepared({
  channel: "matrix",
  accountId,
  routeSessionKey,
  storePath,
  ctxPayload,
  recordInboundSession,
  record: {
    onRecordError,
    updateLastRoute,
  },
  onPreDispatchFailure: async (err) => {
    await stopStatusReactions();
  },
  runDispatch: async () => {
    return await runMatrixOwnedDispatcher();
  },
});
```

富频道（Matrix、Mattermost、Microsoft Teams、Feishu、QQ Bot）使用 `runPrepared`，因为它们的调度器编排了内核不应了解的平台特定行为。

### buildContext

将事实包映射到 `FinalizedMsgContext` 的纯函数。当你的频道手动编写部分管道但想要一致的上下文形状时使用。

```typescript
const ctxPayload = runtime.channel.turn.buildContext({
  channel: "googlechat",
  accountId,
  messageId,
  timestamp,
  from,
  sender,
  conversation,
  route,
  reply,
  message,
  access,
  media,
  supplemental,
});
```

`buildContext` 在 `resolveTurn` 回调中为 `run` 组装轮次时也很有用。

<Note>
  已弃用的 SDK 助手（如 `dispatchInboundReplyWithBase`）仍然通过组装轮次助手桥接。新插件代码应使用 `run` 或 `runPrepared`。
</Note>

## 事实类型

内核从你的适配器消费的事实是平台无关的。在将平台对象传递给内核之前，将其转换为这些形状。

### NormalizedTurnInput

| 字段              | 用途                                            |
| ----------------- | ----------------------------------------------- |
| `id`              | 用于去重和日志的稳定消息 id                     |
| `timestamp`       | 可选的纪元毫秒                                  |
| `rawText`         | 从平台接收的正文                                |
| `textForAgent`    | 可选的为 agent 清理的正文（提及剥离、打字修剪） |
| `textForCommands` | 用于 `/command` 解析的可选正文                  |
| `raw`             | 需要原始对象的适配器回调的可选传递引用          |

### ChannelEventClass

| 字段                   | 用途                                                                    |
| ---------------------- | ----------------------------------------------------------------------- |
| `kind`                 | `message`、`command`、`interaction`、`reaction`、`lifecycle`、`unknown` |
| `canStartAgentTurn`    | 如果为 false，内核返回 `{ kind: "handled" }`                            |
| `requiresImmediateAck` | 适配器在调度之前需要 ACK 的提示                                         |

### SenderFacts

| 字段           | 用途                                          |
| -------------- | --------------------------------------------- |
| `id`           | 稳定的平台发送者 id                           |
| `name`         | 显示名称                                      |
| `username`     | 如果与 `name` 不同则为句柄                    |
| `tag`          | Discord 风格的判别符或平台标签                |
| `roles`        | 角色 id，用于成员角色允许列表匹配             |
| `isBot`        | 当发送者是已知机器人时为 true（内核用于丢弃） |
| `isSelf`       | 当发送者是配置的 agent 本身时为 true          |
| `displayLabel` | 用于信封文本的预渲染标签                      |

### ConversationFacts

| 字段              | 用途                                                    |
| ----------------- | ------------------------------------------------------- |
| `kind`            | `direct`、`group` 或 `channel`                          |
| `id`              | 用于路由的对话 id                                       |
| `label`           | 信封的人类标签                                          |
| `spaceId`         | 可选的外部空间标识符（Slack 工作区、Matrix 家庭服务器） |
| `parentId`        | 当这是线程时的外部对话 id                               |
| `threadId`        | 当此消息在线程内时的线程 id                             |
| `nativeChannelId` | 与路由 id 不同时的平台原生频道 id                       |
| `routePeer`       | 用于 `resolveAgentRoute` 查找的对等方                   |

### RouteFacts

| 字段                    | 用途                               |
| ----------------------- | ---------------------------------- |
| `agentId`               | 应处理此轮次的 agent               |
| `accountId`             | 可选覆盖（多账户频道）             |
| `routeSessionKey`       | 用于路由的会话键                   |
| `dispatchSessionKey`    | 与路由键不同时在调度中使用的会话键 |
| `persistedSessionKey`   | 写入持久化会话元数据的会话键       |
| `parentSessionKey`      | 分支/线程化会话的父级              |
| `modelParentSessionKey` | 分支会话的模型端父级               |
| `mainSessionKey`        | 直接对话的主 DM 所有者固定         |
| `createIfMissing`       | 允许记录步骤创建缺失的会话行       |

### ReplyPlanFacts

| 字段                      | 用途                                             |
| ------------------------- | ------------------------------------------------ |
| `to`                      | 写入上下文 `To` 的逻辑回复目标                   |
| `originatingTo`           | 发起上下文目标（`OriginatingTo`）                |
| `nativeChannelId`         | 用于传递的平台原生频道 id                        |
| `replyTarget`             | 与 `to` 不同时的最终可见回复目的地               |
| `deliveryTarget`          | 较低级别的传递覆盖                               |
| `replyToId`               | 引用/锚定消息 id                                 |
| `replyToIdFull`           | 平台同时具有两者时的完整形式引用 id              |
| `messageThreadId`         | 传递时的线程 id                                  |
| `threadParentId`          | 线程的父消息 id                                  |
| `sourceReplyDeliveryMode` | `thread`、`reply`、`channel`、`direct` 或 `none` |

### AccessFacts

`AccessFacts` 携带授权阶段需要的布尔值。身份匹配留在频道中：内核只消费结果。

| 字段       | 用途                                             |
| ---------- | ------------------------------------------------ |
| `dm`       | DM 允许/配对/拒绝决定和 `allowFrom` 列表         |
| `group`    | 组策略、路由允许、发送者允许、允许列表、提及要求 |
| `commands` | 跨配置授权者的命令授权                           |
| `mentions` | 是否可以检测提及以及是否提及了 agent             |

### MessageFacts

| 字段             | 用途                                 |
| ---------------- | ------------------------------------ |
| `body`           | 最终信封正文（格式化）               |
| `rawBody`        | 原始入站正文                         |
| `bodyForAgent`   | agent 看到的正文                     |
| `commandBody`    | 用于命令解析的正文                   |
| `envelopeFrom`   | 信封的预渲染发送者标签               |
| `senderLabel`    | 渲染发送者的可选覆盖                 |
| `preview`        | 用于日志的短编辑预览                 |
| `inboundHistory` | 当频道保留缓冲区时的最近入站历史条目 |

### SupplementalContextFacts

补充上下文涵盖引用、转发和线程引导上下文。内核应用配置的 `contextVisibility` 策略。频道适配器只提供事实和 `senderAllowed` 标志，以便跨频道策略保持一致。

### InboundMediaFacts

媒体是事实形状的。平台下载、认证、SSRF 策略、CDN 规则和解密保留在频道本地。内核将事实映射到 `MediaPath`、`MediaUrl`、`MediaType`、`MediaPaths`、`MediaUrls`、`MediaTypes` 和 `MediaTranscribedIndexes`。

## 适配器合约

对于完整的 `run`，适配器形状为：

```typescript
type ChannelTurnAdapter<TRaw> = {
  ingest(raw: TRaw): Promise<NormalizedTurnInput | null> | NormalizedTurnInput | null;
  classify?(input: NormalizedTurnInput): Promise<ChannelEventClass> | ChannelEventClass;
  preflight?(
    input: NormalizedTurnInput,
    eventClass: ChannelEventClass,
  ): Promise<PreflightFacts | ChannelTurnAdmission | null | undefined>;
  resolveTurn(
    input: NormalizedTurnInput,
    eventClass: ChannelEventClass,
    preflight: PreflightFacts,
  ): Promise<ChannelTurnResolved> | ChannelTurnResolved;
  onFinalize?(result: ChannelTurnResult): Promise<void> | void;
};
```

`resolveTurn` 返回 `ChannelTurnResolved`，这是带有可选准入类型的 `AssembledChannelTurn`。返回 `{ admission: { kind: "observeOnly" } }` 运行轮次但不产生可见输出。适配器仍然拥有传递回调；它只是在那个轮次变成无操作。

`onFinalize` 在每个结果上运行，包括调度错误。使用它来清除挂起的组历史、移除 ack 反应、停止状态指示器和刷新本地状态。

## 传递适配器

内核不直接调用平台。频道向内核传递 `ChannelTurnDeliveryAdapter`：

```typescript
type ChannelTurnDeliveryAdapter = {
  deliver(payload: ReplyPayload, info: ChannelDeliveryInfo): Promise<ChannelDeliveryResult | void>;
  onError?(err: unknown, info: { kind: string }): void;
};

type ChannelDeliveryResult = {
  messageIds?: string[];
  threadId?: string;
  replyToId?: string;
  visibleReplySent?: boolean;
};
```

每个缓冲的回复块调用一次 `deliver`。当频道有平台消息 id 时返回它们，以便调度器可以保留线程锚点并稍后编辑后续块。对于仅观察轮次，返回 `{ visibleReplySent: false }` 或使用 `createNoopChannelTurnDeliveryAdapter()`。

## 记录选项

记录阶段封装 `recordInboundSession`。大多数频道可以使用默认值。通过 `record` 覆盖：

```typescript
record: {
  groupResolution,
  createIfMissing: true,
  updateLastRoute,
  onRecordError: (err) => log.warn("record failed", err),
  trackSessionMetaTask: (task) => pendingTasks.push(task),
}
```

调度器等待记录阶段。如果记录抛出，内核运行 `onPreDispatchFailure`（当提供给 `runPrepared` 时）并重新抛出。

## 可观察性

当提供 `log` 回调时，每个阶段都会发出结构化事件：

```typescript
await runtime.channel.turn.run({
  channel: "twitch",
  accountId,
  raw,
  adapter,
  log: (event) => {
    runtime.log?.debug?.(`turn.${event.stage}:${event.event}`, {
      channel: event.channel,
      accountId: event.accountId,
      messageId: event.messageId,
      sessionKey: event.sessionKey,
      admission: event.admission,
      reason: event.reason,
    });
  },
});
```

记录的阶段：`ingest`、`classify`、`preflight`、`resolve`、`authorize`、`assemble`、`record`、`dispatch`、`finalize`。避免记录原始正文；使用 `MessageFacts.preview` 进行短编辑预览。

## 保留在频道本地的内容

内核拥有编排。频道仍然拥有：

- 平台传输（网关、REST、websocket、轮询、webhooks）
- 身份解析和显示名称匹配
- 原生命令、斜杠命令、自动完成、模态框、按钮、语音状态
- 卡片、模态框和自适应卡片渲染
- 媒体认证、CDN 规则、加密媒体、转录
- 编辑、反应、编辑和在线状态 API
- 回填和平台端历史获取
- 需要平台特定验证的配对流程

如果两个频道开始需要这些内容之一的相同助手，请提取共享 SDK 助手，而不是将其推入内核。

## 稳定性

`runtime.channel.turn.*` 是公共插件运行时接口的一部分。事实类型（`SenderFacts`、`ConversationFacts`、`RouteFacts`、`ReplyPlanFacts`、`AccessFacts`、`MessageFacts`、`SupplementalContextFacts`、`InboundMediaFacts`）和准入形状（`ChannelTurnAdmission`、`ChannelEventClass`）可通过 `openclaw/plugin-sdk/core` 中的 `PluginRuntime` 访问。

向后兼容规则适用：新事实字段是追加的，准入类型不重命名，入口点名称保持稳定。需要非追加更改的新频道需求必须通过插件 SDK 迁移流程。

## 相关文档

- [构建频道插件](/plugins/sdk-channel-plugins)，了解更广泛的频道插件合约
- [插件运行时助手](/plugins/sdk-runtime)，了解其他 `runtime.*` 接口
- [插件内部](/plugins/architecture-internals)，了解加载管道和注册表机制
