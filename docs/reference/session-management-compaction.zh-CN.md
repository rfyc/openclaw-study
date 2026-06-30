---
summary: "深度剖析：会话存储 + 记录、生命周期和（自动）压缩内部机制"
read_when:
  - 您需要调试会话 id、记录 JSONL 或 sessions.json 字段时
  - 您正在更改自动压缩行为或添加"压缩前"预处理工作时
  - 您想实现记忆刷新或静默系统轮次时
title: "会话管理深度剖析"
---

OpenClaw 在以下各个领域端到端管理会话：

- **会话路由**（入站消息如何映射到 `sessionKey`）
- **会话存储**（`sessions.json`）及其跟踪内容
- **记录持久化**（`*.jsonl`）及其结构
- **记录清理**（在运行前进行提供商特定的修复）
- **上下文限制**（上下文窗口 vs 跟踪的 token）
- **压缩**（手动和自动压缩）以及钩接压缩前工作的位置
- **静默预处理**（不应产生用户可见输出的记忆写入）

如果您想先了解更高层次的概述，请从以下开始：

- [会话管理](/concepts/session)
- [压缩](/concepts/compaction)
- [记忆概述](/concepts/memory)
- [记忆搜索](/concepts/memory-search)
- [会话裁剪](/concepts/session-pruning)
- [记录清理](/reference/transcript-hygiene)

---

## 真相来源：Gateway

OpenClaw 设计围绕一个拥有会话状态的单一 **Gateway 进程**。

- UI（macOS 应用、Web 控制 UI、TUI）应查询 Gateway 以获取会话列表和 token 计数。
- 在远程模式下，会话文件在远程主机上；"检查本地 Mac 文件"不会反映 Gateway 正在使用的内容。

---

## 两个持久化层

OpenClaw 在两个层中持久化会话：

1. **会话存储（`sessions.json`）**
   - 键/值映射：`sessionKey -> SessionEntry`
   - 小型、可变、可以安全编辑（或删除条目）
   - 跟踪会话元数据（当前会话 id、最后活动、切换、token 计数器等）

2. **记录（`<sessionId>.jsonl`）**
   - 带树状结构的只追加记录（条目有 `id` + `parentId`）
   - 存储实际对话 + 工具调用 + 压缩摘要
   - 用于为未来的轮次重建模型上下文
   - 一旦活跃记录超过检查点大小上限，大型压缩前调试检查点就会被跳过，避免产生第二个巨大的 `.checkpoint.*.jsonl` 副本。

Gateway 历史读取器应避免具现化整个记录，除非界面明确需要任意历史访问。首页历史、嵌入式聊天历史、重启恢复和 token/使用检查使用有界尾读。完整记录扫描通过异步记录索引进行，该索引按文件路径加 `mtimeMs`/`size` 缓存，并在并发读取器之间共享。

---

## 磁盘位置

每个智能助手，在 Gateway 主机上：

- 存储：`~/.openclaw/agents/<agentId>/sessions/sessions.json`
- 记录：`~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram 主题会话：`.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw 通过 `src/config/sessions.ts` 解析这些路径。

---

## 存储维护和磁盘控制

会话持久化对 `sessions.json`、记录工件和轨迹侧车具有自动维护控制（`session.maintenance`）：

- `mode`：`warn`（默认）或 `enforce`
- `pruneAfter`：过期条目的年龄截止点（默认 `30d`）
- `maxEntries`：`sessions.json` 中的条目上限（默认 `500`）
- `resetArchiveRetention`：`*.reset.<timestamp>` 记录存档的保留期（默认：与 `pruneAfter` 相同；`false` 禁用清理）
- `maxDiskBytes`：可选的会话目录预算
- `highWaterBytes`：清理后的可选目标（默认为 `maxDiskBytes` 的 `80%`）

正常的 Gateway 写入通过每个存储的会话写入器流动，该写入器在不占用运行时文件锁的情况下序列化进程内变更。热路径补丁辅助函数在持有该写入器槽时借用经过验证的可变缓存，因此大型 `sessions.json` 文件不会为每次元数据更新克隆或重读。运行时代码应优先使用 `updateSessionStore(...)` 或 `updateSessionStoreEntry(...)`；直接保存整个存储是兼容性和离线维护工具。当 Gateway 可访问时，非空运行的 `openclaw sessions cleanup` 和 `openclaw agents delete` 将存储变更委托给 Gateway，使清理加入同一个写入器队列；`--store <path>` 是直接文件维护的明确离线修复路径。`maxEntries` 清理仍然针对生产规模的上限批量处理，因此存储可能在下一次高水位清理将其重写降低之前短暂超过配置的上限。会话存储读取在 Gateway 启动期间不裁剪或限制条目；使用写入或 `openclaw sessions cleanup --enforce` 进行清理。`openclaw sessions cleanup --enforce` 仍然立即应用配置的上限。

维护保留持久的外部对话指针，如群组会话和线程范围的聊天会话，但当计划任务、钩子、心跳、ACP 和子智能助手的合成运行时条目超过配置的年龄、计数或磁盘预算时，这些条目仍然可以被删除。

OpenClaw 不再在 Gateway 写入期间创建自动的 `sessions.json.bak.*` 轮换备份。旧版 `session.maintenance.rotateBytes` 键被忽略，`openclaw doctor --fix` 从旧版配置中删除它。

记录变更使用记录文件上的会话写入锁。锁获取在呈现繁忙会话错误之前等待最多 `session.writeLock.acquireTimeoutMs` 毫秒；默认值为 `60000` 毫秒。仅当合法的准备、清理、压缩或记录镜像工作在慢速机器上争用更长时间时才提高此值。过期锁检测和最大保持警告是单独的策略。

磁盘预算清理的执行顺序（`mode: "enforce"`）：

1. 首先删除最旧的存档、孤立记录或孤立轨迹工件。
2. 如果仍然超过目标，逐出最旧的会话条目及其记录/轨迹文件。
3. 继续直到使用量在 `highWaterBytes` 以下。

在 `mode: "warn"` 中，OpenClaw 报告潜在的逐出，但不变更存储/文件。

按需运行维护：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## 计划任务会话和运行日志

隔离的计划任务运行也会创建会话条目/记录，它们有专用的保留控制：

- `cron.sessionRetention`（默认 `24h`）从会话存储中裁剪旧的隔离计划任务运行会话（`false` 禁用）。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 裁剪 `~/.openclaw/cron/runs/<jobId>.jsonl` 文件（默认值：`2_000_000` 字节和 `2000` 行）。

当计划任务强制创建新的隔离运行会话时，它会在写入新行之前清理之前的 `cron:<jobId>` 会话条目。它携带安全的偏好项，如思考/快速/详细设置、标签和明确的用户选择的模型/认证覆盖。它删除环境对话上下文，如通道/群组路由、发送或队列策略、权限提升、来源和 ACP 运行时绑定，以便全新的隔离运行不能从旧的运行继承过时的交付或运行时权限。

---

## 会话键（`sessionKey`）

`sessionKey` 标识您所在的*对话桶*（路由 + 隔离）。

常见模式：

- 主/直接聊天（每个智能助手）：`agent:<agentId>:<mainKey>`（默认 `main`）
- 群组：`agent:<agentId>:<channel>:group:<id>`
- 房间/频道（Discord/Slack）：`agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- 计划任务：`cron:<job.id>`
- Webhook：`hook:<uuid>`（除非被覆盖）

规范规则在 [/concepts/session](/concepts/session) 处有文档说明。

---

## 会话 id（`sessionId`）

每个 `sessionKey` 指向当前的 `sessionId`（继续对话的记录文件）。

基本规则：

- **重置**（`/new`、`/reset`）为该 `sessionKey` 创建新的 `sessionId`。
- **每日重置**（Gateway 主机本地时间默认凌晨 4:00）在重置边界后的下一条消息到达时创建新的 `sessionId`。
- **空闲过期**（`session.reset.idleMinutes` 或旧版 `session.idleMinutes`）在空闲窗口后消息到达时创建新的 `sessionId`。当每日 + 空闲都已配置时，先到期的那个胜出。
- **系统事件**（心跳、计划任务唤醒、执行通知、网关预处理）可能会变更会话行，但不会延长每日/空闲重置的新鲜度。重置滚动在构建新的提示词之前丢弃前一个会话的排队系统事件通知。
- **父分叉策略**在创建线程或子智能助手分叉时使用 Pi 的活跃分支。如果该分支太大，OpenClaw 用隔离的上下文开始子级，而不是失败或继承不可用的历史记录。大小调整策略是自动的；旧版 `session.parentForkMaxTokens` 配置由 `openclaw doctor --fix` 删除。

实现细节：决策发生在 `src/auto-reply/reply/session.ts` 中的 `initSessionState()`。

---

## 会话存储架构（`sessions.json`）

存储的值类型是 `src/config/sessions.ts` 中的 `SessionEntry`。

关键字段（不详尽）：

- `sessionId`：当前记录 id（文件名由此派生，除非设置了 `sessionFile`）
- `sessionStartedAt`：当前 `sessionId` 的开始时间戳；每日重置新鲜度使用此值。旧版行可能从 JSONL 会话头部推导它。
- `lastInteractionAt`：最后一次真实用户/通道交互的时间戳；空闲重置新鲜度使用此值，以便心跳、计划任务和执行事件不会保持会话活跃。没有此字段的旧版行回退到恢复的会话开始时间用于空闲新鲜度。
- `updatedAt`：最后一次存储行变更时间戳，用于列表、裁剪和预处理。它不是每日/空闲重置新鲜度的权威。
- `sessionFile`：可选的明确记录路径覆盖
- `chatType`：`direct | group | room`（帮助 UI 和发送策略）
- `provider`、`subject`、`room`、`space`、`displayName`：群组/通道标签的元数据
- 切换：
  - `thinkingLevel`、`verboseLevel`、`reasoningLevel`、`elevatedLevel`
  - `sendPolicy`（每会话覆盖）
- 模型选择：
  - `providerOverride`、`modelOverride`、`authProfileOverride`
- Token 计数器（尽力而为/提供商相关）：
  - `inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`
- `compactionCount`：该会话键的自动压缩完成次数
- `memoryFlushAt`：最后一次压缩前记忆刷新的时间戳
- `memoryFlushCompactionCount`：最后一次刷新运行时的压缩计数

存储可以安全编辑，但 Gateway 是权威：它可能在会话运行时重写或重新水合条目。

---

## 记录结构（`*.jsonl`）

记录由 `@mariozechner/pi-coding-agent` 的 `SessionManager` 管理。

文件是 JSONL 格式：

- 第一行：会话头部（`type: "session"`，包含 `id`、`cwd`、`timestamp`、可选的 `parentSession`）
- 然后：带 `id` + `parentId` 的会话条目（树状）

值得注意的条目类型：

- `message`：用户/助手/工具结果消息
- `custom_message`：确实进入模型上下文的扩展注入消息（可以从 UI 隐藏）
- `custom`：*不*进入模型上下文的扩展状态
- `compaction`：带 `firstKeptEntryId` 和 `tokensBefore` 的持久化压缩摘要
- `branch_summary`：导航树分支时的持久化摘要

OpenClaw 有意**不**"修复"记录；Gateway 使用 `SessionManager` 读写它们。

---

## 上下文窗口 vs 跟踪的 token

两个不同的概念很重要：

1. **模型上下文窗口**：每个模型的硬上限（模型可见的 token）
2. **会话存储计数器**：写入 `sessions.json` 的滚动统计（用于 /status 和仪表板）

如果您在调整限制：

- 上下文窗口来自模型目录（可以通过配置覆盖）。
- 存储中的 `contextTokens` 是运行时估算/报告值；不要将其视为严格保证。

更多信息，请参阅 [/token-use](/reference/token-use)。

---

## 压缩：它是什么

压缩将较旧的对话汇总为记录中的持久化 `compaction` 条目，并保持最近的消息完整。

压缩后，未来的轮次看到：

- 压缩摘要
- `firstKeptEntryId` 之后的消息

压缩是**持久的**（与会话裁剪不同）。请参阅 [/concepts/session-pruning](/concepts/session-pruning)。

## 压缩块边界和工具配对

当 OpenClaw 将长记录分割为压缩块时，它保持助手工具调用与其匹配的 `toolResult` 条目配对。

- 如果 token 分享分割落在工具调用和其结果之间，OpenClaw 将边界移到助手工具调用消息，而不是分离配对。
- 如果尾部的工具结果块会使块超过目标，OpenClaw 保留该待处理的工具块并保持未汇总的尾部完整。
- 中止/错误的工具调用块不会保持待分割状态打开。

---

## 自动压缩何时发生（Pi 运行时）

在嵌入式 Pi 智能助手中，自动压缩在两种情况下触发：

1. **溢出恢复**：模型返回上下文溢出错误（`request_too_large`、`context length exceeded`、`input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`input is too long for the model`、`ollama error: context length exceeded` 和类似的提供商变体形式）→ 压缩 → 重试。
2. **阈值维护**：在成功的轮次后，当：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型的上下文窗口
- `reserveTokens` 是为提示词 + 下一个模型输出保留的余量

这些是 Pi 运行时语义（OpenClaw 消费事件，但 Pi 决定何时压缩）。

当 `agents.defaults.compaction.maxActiveTranscriptBytes` 已设置且活跃记录文件达到该大小时，OpenClaw 还可以在打开下一次运行之前触发预检本地压缩。这是针对本地重新打开成本的文件大小防护，而非原始存档：OpenClaw 仍然运行正常的语义压缩，并且需要 `truncateAfterCompaction` 以便压缩摘要可以成为新的后继记录。

对于嵌入式 Pi 运行，`agents.defaults.compaction.midTurnPrecheck.enabled: true` 添加了一个可选的工具循环防护。在工具结果被追加且在下一次模型调用之前，OpenClaw 使用轮次开始时使用的相同预检预算逻辑估算提示词压力。如果上下文不再适合，防护不会在 Pi 的 `transformContext` 钩子内压缩。它发出一个结构化的轮次中预检信号，停止当前的提示词提交，并让外部运行循环使用现有的恢复路径：当足够时截断过大的工具结果，或触发配置的压缩模式并重试。该选项默认禁用，适用于 `default` 和 `safeguard` 两种压缩模式，包括提供商支持的保护性压缩。这与 `maxActiveTranscriptBytes` 是独立的：字节大小防护在轮次开始前运行，而轮次中预检在嵌入式 Pi 工具循环中较晚运行，在追加了新的工具结果之后。

---

## 压缩设置（`reserveTokens`、`keepRecentTokens`）

Pi 的压缩设置位于 Pi 设置中：

```json5
{
  compaction: {
    enabled: true,
    reserveTokens: 16384,
    keepRecentTokens: 20000,
  },
}
```

OpenClaw 还为嵌入式运行强制执行安全底限：

- 如果 `compaction.reserveTokens < reserveTokensFloor`，OpenClaw 将其提升。
- 默认底限为 `20000` token。
- 设置 `agents.defaults.compaction.reserveTokensFloor: 0` 以禁用底限。
- 如果已经更高，OpenClaw 不做更改。
- 手动 `/compact` 遵守明确的 `agents.defaults.compaction.keepRecentTokens` 并保持 Pi 的最近尾部截点。如果没有明确的保留预算，手动压缩仍然是一个硬检查点，重建的上下文从新摘要开始。
- 设置 `agents.defaults.compaction.midTurnPrecheck.enabled: true` 以在新的工具结果之后和下一次模型调用之前运行可选的工具循环预检。这只是一个触发器；摘要生成仍然使用配置的压缩路径。它与 `maxActiveTranscriptBytes` 是独立的，后者是一个轮次开始活跃记录字节大小防护。
- 设置 `agents.defaults.compaction.maxActiveTranscriptBytes` 为字节值或如 `"20mb"` 的字符串，以在活跃记录变大时在轮次前运行本地压缩。此防护仅在 `truncateAfterCompaction` 也启用时有效。设置为 `0` 或不设置以禁用。
- 当 `agents.defaults.compaction.truncateAfterCompaction` 启用时，OpenClaw 在压缩后将活跃记录旋转到一个压缩后继 JSONL。旧的完整记录保留存档，并从压缩检查点链接，而不是被就地重写。

原因：在压缩变得不可避免之前，为多轮"预处理"（如记忆写入）留出足够的余量。

实现：`src/agents/pi-settings.ts` 中的 `ensurePiCompactionReserveTokens()`（从 `src/agents/pi-embedded-runner.ts` 调用）。

---

## 可插拔压缩提供商

插件可以通过插件 API 上的 `registerCompactionProvider()` 注册压缩提供商。当 `agents.defaults.compaction.provider` 设置为已注册提供商 id 时，保护性扩展将汇总委托给该提供商，而不是内置的 `summarizeInStages` 管道。

- `provider`：已注册压缩提供商插件的 id。不设置则使用默认 LLM 汇总。
- 设置 `provider` 会强制 `mode: "safeguard"`。
- 提供商接收与内置路径相同的压缩指令和标识符保留策略。
- 保护性压缩仍然在提供商输出之后保留最近轮次和分割轮次后缀上下文。
- 内置保护性汇总用新消息重新提炼之前的摘要，而非原封不动地保留完整的之前摘要。
- 保护性模式默认启用摘要质量审计；设置 `qualityGuard.enabled: false` 以跳过输出格式错误时的重试行为。
- 如果提供商失败或返回空结果，OpenClaw 自动回退到内置 LLM 汇总。
- 中止/超时信号被重新抛出（不被吞没）以尊重调用者取消。

来源：`src/plugins/compaction-provider.ts`、`src/agents/pi-hooks/compaction-safeguard.ts`。

---

## 用户可见界面

您可以通过以下方式观察压缩和会话状态：

- `/status`（在任何聊天会话中）
- `openclaw status`（CLI）
- `openclaw sessions` / `sessions --json`
- 详细模式：`🧹 Auto-compaction complete` + 压缩计数

---

## 静默预处理（`NO_REPLY`）

OpenClaw 支持后台任务的"静默"轮次，用户不应该看到中间输出。

约定：

- 助手以精确的静默 token `NO_REPLY` / `no_reply` 开始输出，表示"不向用户交付回复"。
- OpenClaw 在交付层去除/抑制此内容。
- 精确的静默 token 抑制不区分大小写，因此当整个负载只是静默 token 时，`NO_REPLY` 和 `no_reply` 都算数。
- 这仅用于真正的后台/无交付轮次；它不是普通可操作用户请求的快捷方式。

从 `2026.1.10` 开始，当部分块以 `NO_REPLY` 开头时，OpenClaw 还抑制**草稿/打字流式传输**，以便静默操作不会在轮次中途泄漏部分输出。

---

## 压缩前"记忆刷新"（已实现）

目标：在自动压缩发生之前，运行一个静默的智能体轮次，将持久状态写入磁盘（例如智能助手工作区中的 `memory/YYYY-MM-DD.md`），以便压缩不会删除关键上下文。

OpenClaw 使用**预阈值刷新**方法：

1. 监控会话上下文使用情况。
2. 当它超过"软阈值"（低于 Pi 的压缩阈值）时，向智能助手运行一个静默的"立即写入记忆"指令。
3. 使用精确的静默 token `NO_REPLY` / `no_reply`，使用户看不到任何内容。

配置（`agents.defaults.compaction.memoryFlush`）：

- `enabled`（默认：`true`）
- `model`（可选的刷新轮次的确切提供商/模型覆盖，例如 `ollama/qwen3:8b`）
- `softThresholdTokens`（默认：`4000`）
- `prompt`（刷新轮次的用户消息）
- `systemPrompt`（为刷新轮次追加的额外系统提示词）

注意：

- 默认的提示词/系统提示词包含 `NO_REPLY` 提示以抑制交付。
- 当设置了 `model` 时，刷新轮次使用该模型而不继承活跃会话回退链，以便仅本地预处理不会悄悄回退到付费的对话模型。
- 刷新每个压缩周期运行一次（在 `sessions.json` 中跟踪）。
- 刷新仅对嵌入式 Pi 会话运行（CLI 后端跳过它）。
- 当会话工作区是只读的（`workspaceAccess: "ro"` 或 `"none"`）时跳过刷新。
- 有关工作区文件布局和写入模式，请参阅[记忆](/concepts/memory)。

Pi 还在扩展 API 中公开了 `session_before_compact` 钩子，但 OpenClaw 的刷新逻辑今天位于 Gateway 侧。

---

## 故障排查清单

- 会话键错误？从 [/concepts/session](/concepts/session) 开始，并在 `/status` 中确认 `sessionKey`。
- 存储与记录不匹配？从 `openclaw status` 确认 Gateway 主机和存储路径。
- 压缩频繁？检查：
  - 模型上下文窗口（太小）
  - 压缩设置（对于模型窗口 `reserveTokens` 太高可能导致更早的压缩）
  - 工具结果膨胀：启用/调整会话裁剪
- 静默轮次泄漏？确认回复以 `NO_REPLY`（不区分大小写的精确 token）开头，并且您使用的是包含流式传输抑制修复的版本。

## 相关链接

- [会话管理](/concepts/session)
- [会话裁剪](/concepts/session-pruning)
- [上下文引擎](/concepts/context-engine)
