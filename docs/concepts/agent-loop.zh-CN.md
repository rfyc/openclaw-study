---
summary: "智能体循环生命周期、流和等待语义"
read_when:
  - 你需要智能体循环或生命周期事件的详细说明
  - 你正在修改会话排队、记录写入或会话写锁行为
title: "智能体循环"
---

一个智能体循环是智能体的完整"真实"运行：接收 → 上下文组装 → 模型推理 → 工具执行 → 流式回复 → 持久化。它是将消息转化为动作和最终回复、同时保持会话状态一致的权威路径。

在 OpenClaw 中，一个循环是每个会话单次串行运行，在模型思考、调用工具和流式输出时发出生命周期和流事件。本文档介绍该真实循环如何端到端连接。

## 入口点

- 网关 RPC：`agent` 和 `agent.wait`。
- CLI：`agent` 命令。

## 工作原理（高层次）

1. `agent` RPC 验证参数，解析会话（sessionKey/sessionId），持久化会话元数据，立即返回 `{ runId, acceptedAt }`。
2. `agentCommand` 运行智能体：
   - 解析模型 + 思考/verbose/trace 默认值
   - 加载技能快照
   - 调用 `runEmbeddedPiAgent`（pi-agent-core 运行时）
   - 如果嵌入式循环未发出生命周期 end/error 事件，则发出**生命周期 end/error**
3. `runEmbeddedPiAgent`：
   - 通过每会话 + 全局队列串行化运行
   - 解析模型 + 认证配置文件并构建 pi 会话
   - 订阅 pi 事件并流式传输助手/工具增量
   - 强制执行超时 -> 超时时中止运行
   - 对于 Codex app-server 轮次，中止在终端事件之前停止产生 app-server 进度的已接受轮次
   - 返回有效载荷 + 用量元数据
4. `subscribeEmbeddedPiSession` 将 pi-agent-core 事件桥接到 OpenClaw `agent` 流：
   - 工具事件 => `stream: "tool"`
   - 助手增量 => `stream: "assistant"`
   - 生命周期事件 => `stream: "lifecycle"`（`phase: "start" | "end" | "error"`）
5. `agent.wait` 使用 `waitForAgentRun`：
   - 等待 `runId` 的**生命周期 end/error**
   - 返回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 排队 + 并发

- 运行按会话键（会话通道）串行化，并可选地通过全局通道。
- 这防止了工具/会话竞争，并保持会话历史的一致性。
- 消息频道可以选择影响此通道系统的队列模式（collect/steer/followup）。
  参见[命令队列](/concepts/queue)。
- 记录写入也由会话文件上的会话写锁保护。该锁是进程感知的和基于文件的，因此可以捕获绕过进程内队列或来自另一个进程的写入者。会话记录写入者在报告会话繁忙之前等待最多 `session.writeLock.acquireTimeoutMs`；默认为 `60000` ms。
- 默认情况下，会话写锁是不可重入的。如果辅助程序有意在保留一个逻辑写入者的同时嵌套获取相同锁，必须使用 `allowReentrant: true` 显式选择加入。

## 会话 + 工作区准备

- 工作区被解析和创建；沙箱化运行可能重定向到沙箱工作区根目录。
- 技能被加载（或从快照重用）并注入到环境和提示中。
- 启动/上下文文件被解析并注入到系统提示报告中。
- 获取会话写锁；`SessionManager` 在流式传输之前被打开和准备好。任何后续的记录重写、压缩或截断路径必须在打开或修改记录文件之前获取相同的锁。

## 提示组装 + 系统提示

- 系统提示由 OpenClaw 的基础提示、技能提示、启动上下文和每次运行的覆盖构建。
- 模型特定的限制和压缩预留令牌被强制执行。
- 参见[系统提示](/concepts/system-prompt)了解模型看到的内容。

## 钩子点（可拦截的地方）

OpenClaw 有两套钩子系统：

- **内部钩子**（网关钩子）：用于命令和生命周期事件的事件驱动脚本。
- **插件钩子**：智能体/工具生命周期和网关管道中的扩展点。

### 内部钩子（网关钩子）

- **`agent:bootstrap`**：在构建启动文件时、系统提示最终确定之前运行。用于添加/删除启动上下文文件。
- **命令钩子**：`/new`、`/reset`、`/stop` 和其他命令事件（参见 Hooks 文档）。

参见[钩子](/automation/hooks)了解设置和示例。

### 插件钩子（智能体 + 网关生命周期）

这些在智能体循环或网关管道中运行：

- **`before_model_resolve`**：在会话前运行（无 `messages`），用于在模型解析之前确定性地覆盖提供商/模型。
- **`before_prompt_build`**：在会话加载后运行（带 `messages`），在提示提交前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。使用 `prependContext` 处理每轮动态文本，使用系统上下文字段处理应在系统提示空间中的稳定指导。
- **`before_agent_start`**：可能在任一阶段运行的遗留兼容性钩子；优先使用上面的显式钩子。
- **`before_agent_reply`**：在内联动作之后和 LLM 调用之前运行，允许插件认领该轮次并返回合成回复或完全静默该轮次。
- **`agent_end`**：在完成后检查最终消息列表和运行元数据。
- **`before_compaction` / `after_compaction`**：观察或注释压缩周期。
- **`before_tool_call` / `after_tool_call`**：拦截工具参数/结果。
- **`before_install`**：检查内置扫描结果，并可选地阻止技能或插件安装。
- **`tool_result_persist`**：在工具结果写入 OpenClaw 拥有的会话记录之前同步转换它们。
- **`message_received` / `message_sending` / `message_sent`**：入站 + 出站消息钩子。
- **`session_start` / `session_end`**：会话生命周期边界。
- **`gateway_start` / `gateway_stop`**：网关生命周期事件。

出站/工具守卫的钩子决策规则：

- `before_tool_call`：`{ block: true }` 是终止的，会停止低优先级处理器。
- `before_tool_call`：`{ block: false }` 是空操作，不会清除之前的块。
- `before_install`：`{ block: true }` 是终止的，会停止低优先级处理器。
- `before_install`：`{ block: false }` 是空操作，不会清除之前的块。
- `message_sending`：`{ cancel: true }` 是终止的，会停止低优先级处理器。
- `message_sending`：`{ cancel: false }` 是空操作，不会清除之前的取消。

参见[插件钩子](/plugins/hooks)了解钩子 API 和注册详情。

不同测试工具可能以不同方式适配这些钩子。Codex app-server 测试工具将 OpenClaw 插件钩子保留为有文档记录的镜像接口的兼容性约定，而 Codex 原生钩子仍是独立的低级 Codex 机制。

## 流式传输 + 部分回复

- 助手增量从 pi-agent-core 流式传输并作为 `assistant` 事件发出。
- 块流式传输可以在 `text_end` 或 `message_end` 时发出部分回复。
- 推理流式传输可以作为独立流或块回复发出。
- 参见[流式传输](/concepts/streaming)了解分块和块回复行为。

## 工具执行 + 消息工具

- 工具开始/更新/结束事件在 `tool` 流上发出。
- 工具结果在记录/发出之前会按大小和图像有效载荷清理。
- 消息工具发送被追踪以抑制重复的助手确认。

## 回复整形 + 抑制

- 最终有效载荷由以下内容组装：
  - 助手文本（以及可选的推理）
  - 内联工具摘要（当 verbose + 允许时）
  - 模型出错时的助手错误文本
- 精确的静默令牌 `NO_REPLY` / `no_reply` 从出站有效载荷中过滤。
- 消息工具重复项从最终有效载荷列表中删除。
- 如果没有可渲染的有效载荷且工具出错，将发出回退工具错误回复（除非消息工具已发送了用户可见的回复）。

## 压缩 + 重试

- 自动压缩发出 `compaction` 流事件并可以触发重试。
- 重试时，内存缓冲区和工具摘要被重置以避免重复输出。
- 参见[压缩](/concepts/compaction)了解压缩管道。

## 事件流（当前）

- `lifecycle`：由 `subscribeEmbeddedPiSession`（以及作为回退的 `agentCommand`）发出
- `assistant`：来自 pi-agent-core 的流式增量
- `tool`：来自 pi-agent-core 的流式工具事件

## 聊天频道处理

- 助手增量被缓冲到聊天 `delta` 消息中。
- 在**生命周期 end/error** 时发出聊天 `final`。

## 超时

- `agent.wait` 默认：30秒（仅等待）。`timeoutMs` 参数可覆盖。
- 智能体运行时：`agents.defaults.timeoutSeconds` 默认 172800秒（48小时）；在 `runEmbeddedPiAgent` 中通过中止定时器强制执行。
- Cron 运行时：隔离的智能体轮次 `timeoutSeconds` 由 cron 拥有。调度器在执行开始时启动该定时器，在配置的截止时间中止底层运行，然后在记录超时之前运行有界清理，这样过时的子会话就不会使通道卡住。
- 会话活跃性诊断：启用诊断后，`diagnostics.stuckSessionWarnMs` 对没有观察到回复、工具、状态、块或 ACP 进度的长时间 `processing` 会话进行分类。活跃的嵌入式运行、模型调用和工具调用报告为 `session.long_running`；有活跃工作但最近没有进度的报告为 `session.stalled`；`session.stuck` 保留给没有活跃工作的过时会话记账。过时的会话记账立即释放受影响的会话通道；停滞的嵌入式运行仅在扩展的无进度窗口（至少10分钟和5倍警告阈值）后才被中止排空，这样排队的工作就可以恢复而不切断仅仅速度慢的运行。重复的 `session.stuck` 诊断在会话保持不变期间会退避。
- 模型空闲超时：当没有响应块在空闲窗口前到达时，OpenClaw 中止模型请求。`models.providers.<id>.timeoutSeconds` 为慢速本地/自托管提供商扩展此空闲看门狗；否则 OpenClaw 使用 `agents.defaults.timeoutSeconds`（如果配置了的话），默认上限为120秒。没有显式模型或智能体超时的 cron 触发运行禁用空闲看门狗并依赖 cron 外部超时。
- 提供商 HTTP 请求超时：`models.providers.<id>.timeoutSeconds` 适用于该提供商的模型 HTTP 获取，包括连接、头部、主体、SDK 请求超时、总守护获取中止处理和模型流空闲看门狗。在提高整个智能体运行时超时之前，对慢速本地/自托管提供商（如 Ollama）使用此项。

## 可能提前结束的地方

- 智能体超时（中止）
- AbortSignal（取消）
- 网关断开或 RPC 超时
- `agent.wait` 超时（仅等待，不停止智能体）

## 相关

- [工具](/tools) — 可用的智能体工具
- [钩子](/automation/hooks) — 由智能体生命周期事件触发的事件驱动脚本
- [压缩](/concepts/compaction) — 如何压缩长对话
- [执行审批](/tools/exec-approvals) — Shell 命令的审批门控
- [思考](/tools/thinking) — 思考/推理级别配置
