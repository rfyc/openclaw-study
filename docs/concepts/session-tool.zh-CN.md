---
summary: "用于跨会话状态、召回、消息传递和子智能体编排的智能体工具"
read_when:
  - 你想要了解智能体拥有哪些会话工具
  - 你想要配置跨会话访问或子智能体生成
  - 你想要检查状态或控制已生成的子智能体
title: "会话工具"
---

OpenClaw 为智能体提供了跨会话工作、检查状态和编排子智能体的工具。

## 可用工具

| 工具               | 功能                                                             |
| ------------------ | ---------------------------------------------------------------- |
| `sessions_list`    | 列出会话，带有可选过滤器（kind、label、agent、recency、preview） |
| `sessions_history` | 读取特定会话的记录                                               |
| `sessions_send`    | 向另一个会话发送消息，并可选择等待                               |
| `sessions_spawn`   | 生成一个用于后台工作的隔离子智能体会话                           |
| `sessions_yield`   | 结束当前轮次并等待后续的子智能体结果                             |
| `subagents`        | 列出、转向或终止此会话的已生成子智能体                           |
| `session_status`   | 显示 `/status` 风格的卡片，并可选择设置每个会话的模型覆盖        |

这些工具仍然受活跃工具配置文件和允许/拒绝策略的约束。`tools.profile: "coding"` 包含完整的会话编排集，包括 `sessions_spawn`、`sessions_yield` 和 `subagents`。`tools.profile: "messaging"` 包含跨会话消息传递工具（`sessions_list`、`sessions_history`、`sessions_send`、`session_status`），但不包含子智能体生成。要保持消息传递配置文件并仍然允许原生委派，添加：

```json5
{
  tools: {
    profile: "messaging",
    alsoAllow: ["sessions_spawn", "sessions_yield", "subagents"],
  },
}
```

群组、提供商、沙盒和每个智能体策略仍然可以在配置文件阶段之后删除这些工具。从受影响的会话使用 `/tools` 检查有效工具列表。

## 列出和读取会话

`sessions_list` 返回带有键、agentId、kind、channel、model、令牌计数和时间戳的会话。按 kind（`main`、`group`、`cron`、`hook`、`node`）、精确 `label`、精确 `agentId`、搜索文本或时效性（`activeMinutes`）过滤。当你需要邮件箱式分类时，它还可以为每行请求可见性范围的派生标题、最后消息预览片段或有界最近消息。派生标题和预览仅针对调用者在配置的会话工具可见性策略下已经可以看到的会话生成，因此无关的会话保持隐藏。

`sessions_history` 获取特定会话的对话记录。默认情况下，工具结果被排除——传递 `includeTools: true` 以查看它们。返回的视图是有意有界且经过安全过滤的：

- 助手文本在召回之前被规范化：
  - 思考标签被剥离
  - `<relevant-memories>` / `<relevant_memories>` 脚手架块被剥离
  - 纯文本工具调用 XML 有效载荷块（如 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和 `<function_calls>...</function_calls>`）被剥离，包括从未干净关闭的截断有效载荷
  - 降级的工具调用/结果脚手架（如 `[Tool Call: ...]`、`[Tool Result ...]` 和 `[Historical context ...]`）被剥离
  - 泄露的模型控制令牌（如 `<|assistant|>`、其他 ASCII `<|...|>` 令牌和全宽 `<｜...｜>` 变体）被剥离
  - 畸形的 MiniMax 工具调用 XML（如 `<invoke ...>` / `</minimax:tool_call>`）被剥离
- 凭据/令牌类文本在返回之前被编辑
- 长文本块被截断
- 非常大的历史记录可以丢弃较旧的行或用 `[sessions_history omitted: message too large]` 替换过大的行
- 该工具报告摘要标志，如 `truncated`、`droppedMessages`、`contentTruncated`、`contentRedacted` 和 `bytes`

两个工具都接受**会话键**（如 `"main"`）或来自先前列表调用的**会话 ID**。

如果你需要精确的逐字节记录，请检查磁盘上的记录文件，而不是将 `sessions_history` 视为原始转储。

## 发送跨会话消息

`sessions_send` 将消息传递到另一个会话，并可选择等待响应：

- **即发即忘：** 设置 `timeoutSeconds: 0` 以入队并立即返回。
- **等待回复：** 设置超时并内联获取响应。

线程范围的聊天会话（如以 `:thread:<id>` 结尾的 Slack 或 Discord 键）不是有效的 `sessions_send` 目标。使用父频道会话键进行智能体间协调，以便工具路由的消息不会出现在活跃的面向用户的线程内。

消息和 A2A 后续回复在接收提示中标记为会话间数据（`[Inter-session message ... isUser=false]`）和记录来源。接收智能体应将它们视为工具路由数据，而不是直接的最终用户编写的指令。

目标响应后，OpenClaw 可以运行**回复循环**，其中智能体交替发送消息（最多 5 轮）。目标智能体可以回复 `REPLY_SKIP` 以提前停止。

## 状态和编排助手

`session_status` 是当前或另一个可见会话的轻量级 `/status` 等效工具。它报告使用情况、时间、模型/运行时状态，以及存在时链接的后台任务上下文。与 `/status` 一样，它可以从最新记录使用条目回填稀疏令牌/缓存计数器，`model=default` 清除每个会话的覆盖。对调用者的当前会话使用 `sessionKey="current"`；像 `openclaw-tui` 这样的可见客户端标签不是会话键。

`sessions_yield` 有意结束当前轮次，以便下一条消息可以是你正在等待的后续事件。在生成子智能体后使用它，当你希望完成结果作为下一条消息到达，而不是构建轮询循环时。

`subagents` 是已生成 OpenClaw 子智能体的控制平面助手。它支持：

- `action: "list"` 检查活跃/最近的运行
- `action: "steer"` 向运行中的子智能体发送后续指导
- `action: "kill"` 停止一个子智能体或 `all`

## 生成子智能体

`sessions_spawn` 默认为后台任务创建一个隔离的会话。它始终是非阻塞的——它立即返回带有 `runId` 和 `childSessionKey` 的结果。

关键选项：

- `runtime: "subagent"`（默认）或 `"acp"` 用于外部测试框架智能体。
- 子会话的 `model` 和 `thinking` 覆盖。
- `thread: true` 将生成绑定到聊天线程（Discord、Slack 等）。
- `sandbox: "require"` 在子智能体上强制执行沙盒。
- `context: "fork"` 用于原生子智能体，当子智能体需要当前请求者记录时；省略它或使用 `context: "isolated"` 创建干净的子智能体。线程绑定的原生子智能体默认为 `context: "fork"`，除非 `threadBindings.defaultSpawnContext` 另有说明。

默认叶子子智能体不获得会话工具。当 `maxSpawnDepth >= 2` 时，深度 1 的协调者子智能体额外接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们可以管理自己的子智能体。叶子运行仍然不获得递归编排工具。

完成后，公告步骤将结果发布到请求者的频道。完成投递在可用时保留绑定的线程/主题路由，如果完成来源仅标识 OpenClaw 可以重用请求者会话存储路由（`lastChannel` / `lastTo`）的频道，则直接投递。

有关 ACP 特定行为，请参见 [ACP 智能体](/tools/acp-agents)。

## 可见性

会话工具的范围限制了智能体可以看到的内容：

| 级别    | 范围                           |
| ------- | ------------------------------ |
| `self`  | 仅当前会话                     |
| `tree`  | 当前会话 + 已生成的子智能体    |
| `agent` | 此智能体的所有会话             |
| `all`   | 所有会话（如果配置则跨智能体） |

默认为 `tree`。无论配置如何，沙盒会话都被限制为 `tree`。

## 延伸阅读

- [会话管理](/concepts/session) — 路由、生命周期、维护
- [ACP 智能体](/tools/acp-agents) — 外部测试框架生成
- [多智能体](/concepts/multi-agent) — 多智能体架构
- [网关配置](/gateway/configuration) — 会话工具配置旋钮

## 相关

- [会话管理](/concepts/session)
- [会话修剪](/concepts/session-pruning)
