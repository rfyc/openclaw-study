---
summary: "生成隔离的后台代理运行，将结果宣告回请求者聊天"
read_when:
  - 你想通过代理进行后台或并行工作
  - 你正在更改 sessions_spawn 或子代理工具策略
  - 你正在实现或排查线程绑定子代理会话
title: "子代理"
sidebarTitle: "子代理"
---

子代理是从现有代理运行生成的后台代理运行。它们在自己的会话（`agent:<agentId>:subagent:<uuid>`）中运行，完成后，将其结果**宣告**回请求者聊天频道。每个子代理运行都作为[后台任务](/automation/tasks)进行跟踪。

主要目标：

- 并行化"研究/长任务/慢工具"工作，而不阻塞主运行。
- 默认保持子代理隔离（会话分离 + 可选沙盒化）。
- 保持工具界面难以滥用：默认情况下子代理**不**获得会话工具。
- 支持可配置的嵌套深度以支持编排器模式。

<Note>
**成本说明：**每个子代理默认有其自己的上下文和 token 使用。对于繁重或重复的任务，为子代理设置更便宜的模型，并让主代理使用更高质量的模型。通过 `agents.defaults.subagents.model` 或每代理覆盖进行配置。当子代理真正需要请求者当前的转录时，代理可以在该生成上请求 `context: "fork"`。线程绑定的子代理会话默认为 `context: "fork"`，因为它们将当前对话分支到后续线程。
</Note>

## Slash 命令

使用 `/subagents` 检查或控制**当前会话**的子代理运行：

```text
/subagents list
/subagents kill <id|#|all>
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
/subagents send <id|#> <message>
/subagents steer <id|#> <message>
/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]
```

使用顶级 [`/steer <message>`](/tools/steer) 引导当前请求者会话的活动运行。当目标是子运行时使用 `/subagents steer <id|#> <message>`。

`/subagents info` 显示运行元数据（状态、时间戳、会话 id、转录路径、清理）。使用 `sessions_history` 获取有界的、安全过滤的召回视图；当需要完整的原始转录时，在磁盘上检查转录路径。

### 线程绑定控制

这些命令适用于支持持久线程绑定的频道。参阅下面的[支持线程的频道](#thread-supporting-channels)。

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### 生成行为

`/subagents spawn` 作为用户命令（而非内部中继）启动后台子代理，并在运行结束时向请求者聊天发送一个最终完成更新。

<AccordionGroup>
  <Accordion title="非阻塞、推送式完成">
    - 生成命令是非阻塞的；它立即返回运行 id。
    - 完成时，子代理将摘要/结果消息宣告回请求者聊天频道。
    - 完成是推送式的。一旦生成，**不要**在循环中轮询 `/subagents list`、`sessions_list` 或 `sessions_history` 只是为了等待完成；仅在需要调试或干预时按需检查状态。
    - 完成时，OpenClaw 在宣告清理流程继续之前尽力关闭该子代理会话打开的跟踪的浏览器标签/进程。

  </Accordion>
  <Accordion title="手动生成交付弹性">
    - OpenClaw 首先尝试使用稳定的幂等键进行直接 `agent` 交付。
    - 如果请求者代理完成轮次失败、没有产生可见输出或返回明显不完整的捕获子结果前缀，OpenClaw 回退到从捕获的子结果直接完成交付。
    - 如果无法使用直接交付，则回退到队列路由。
    - 如果队列路由仍然不可用，宣告在最终放弃之前以短指数退避重试。
    - 完成交付保留已解析的请求者路由：可用时线程绑定或对话绑定的完成路由胜出；如果完成来源只提供频道，OpenClaw 从请求者会话的已解析路由（`lastChannel` / `lastTo` / `lastAccountId`）填充缺失的目标/账户，使直接交付仍然有效。

  </Accordion>
  <Accordion title="完成切换元数据">
    到请求者会话的完成切换是运行时生成的内部上下文（不是用户编写的文本），包括：

    - `Result` — 最新可见的 `assistant` 回复文本，否则是清理后的最新工具/工具结果文本。终端失败的运行不重用捕获的回复文本。
    - `Status` — `completed successfully` / `failed` / `timed out` / `unknown`。
    - 紧凑的运行时/token 统计。
    - 告诉请求者代理以正常助手声音重写（不要转发原始内部元数据）的交付指令。

  </Accordion>
  <Accordion title="模式和 ACP 运行时">
    - `--model` 和 `--thinking` 覆盖该特定运行的默认值。
    - 完成后使用 `info`/`log` 检查详情和输出。
    - `/subagents spawn` 是单次模式（`mode: "run"`）。对于持久线程绑定会话，使用带 `thread: true` 和 `mode: "session"` 的 `sessions_spawn`。
    - 对于 ACP 工具会话（Claude Code、Gemini CLI、OpenCode 或显式 Codex ACP/acpx），当工具广告该运行时时，使用带 `runtime: "acp"` 的 `sessions_spawn`。参阅 [ACP 交付模型](/tools/acp-agents#delivery-model)以调试完成或代理间循环。当 `codex` 插件启用时，Codex 聊天/线程控制应优先使用 `/codex ...` 而非 ACP，除非用户明确请求 ACP/acpx。
    - OpenClaw 隐藏 `runtime: "acp"` 直到 ACP 启用、请求者未沙盒化且加载了像 `acpx` 这样的后端插件。`runtime: "acp"` 期望外部 ACP 工具 id，或带 `runtime.type="acp"` 的 `agents.list[]` 条目；对于 `agents_list` 中的普通 OpenClaw 配置代理，使用默认子代理运行时。

  </Accordion>
</AccordionGroup>

## 上下文模式

原生子代理默认隔离启动，除非调用者明确请求 fork 当前转录。

| 模式       | 何时使用                                                             | 行为                                                |
| ---------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| `isolated` | 新鲜的研究、独立的实现、慢工具工作，或任何可以在任务文本中简报的内容 | 创建干净的子转录。这是默认值，保持 token 使用较低。 |
| `fork`     | 依赖当前对话、先前工具结果或请求者转录中已存在的细微指令的工作       | 在子代理开始之前将请求者转录分支到子会话中。        |

谨慎使用 `fork`。它用于上下文敏感的委托，而非编写清晰任务提示的替代品。

## 工具：`sessions_spawn`

以全局 `subagent` 通道上的 `deliver: false` 启动子代理运行，然后运行宣告步骤并将宣告回复发布到请求者聊天频道。

可用性取决于调用者的有效工具策略。`coding` 和 `full` 配置文件默认暴露 `sessions_spawn`。`messaging` 配置文件不；为应委托工作的代理添加 `tools.alsoAllow: ["sessions_spawn", "sessions_yield", "subagents"]` 或使用 `tools.profile: "coding"`。频道/群组、提供商、沙盒和每代理允许/拒绝策略在配置文件阶段之后仍然可以删除工具。从同一会话使用 `/tools` 确认有效工具列表。

**默认值：**

- **模型：**除非你设置 `agents.defaults.subagents.model`（或每代理 `agents.list[].subagents.model`），否则继承调用者；显式的 `sessions_spawn.model` 仍然胜出。
- **思考：**除非你设置 `agents.defaults.subagents.thinking`（或每代理 `agents.list[].subagents.thinking`），否则继承调用者；显式的 `sessions_spawn.thinking` 仍然胜出。
- **运行超时：**如果省略 `sessions_spawn.runTimeoutSeconds`，OpenClaw 在设置时使用 `agents.defaults.subagents.runTimeoutSeconds`；否则回退到 `0`（无超时）。

### 工具参数

<ParamField path="task" type="string" required>
  子代理的任务描述。
</ParamField>
<ParamField path="label" type="string">
  可选的人类可读标签。
</ParamField>
<ParamField path="agentId" type="string">
  在 `subagents.allowAgents` 允许时在另一个代理 id 下生成。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 仅用于外部 ACP 工具（`claude`、`droid`、`gemini`、`opencode` 或显式请求的 Codex ACP/acpx）以及 `runtime.type` 为 `acp` 的 `agents.list[]` 条目。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  仅 ACP。当 `runtime: "acp"` 时恢复现有的 ACP 工具会话；对原生子代理生成忽略。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  仅 ACP。当 `runtime: "acp"` 时将 ACP 运行输出流式传输到父会话；对原生子代理生成省略。
</ParamField>
<ParamField path="model" type="string">
  覆盖子代理模型。无效值被跳过，子代理在默认模型上运行并在工具结果中显示警告。
</ParamField>
<ParamField path="thinking" type="string">
  覆盖子代理运行的思考级别。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  设置时默认为 `agents.defaults.subagents.runTimeoutSeconds`，否则为 `0`。设置后，子代理运行在 N 秒后中止。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  为 `true` 时，为此子代理会话请求频道线程绑定。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  如果 `thread: true` 且省略 `mode`，默认变为 `session`。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 在宣告后立即存档（仍通过重命名保留转录）。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` 拒绝生成，除非目标子运行时是沙盒化的。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` 将请求者的当前转录分支到子会话中。仅限原生子代理。线程绑定生成默认为 `fork`；非线程生成默认为 `isolated`。
</ParamField>

<Warning>
`sessions_spawn` **不**接受频道交付参数（`target`、`channel`、`to`、`threadId`、`replyTo`、`transport`）。对于交付，在生成的运行中使用 `message`/`sessions_send`。
</Warning>

## 线程绑定会话

当为频道启用线程绑定时，子代理可以保持绑定到线程，使该线程中的后续用户消息继续路由到同一子代理会话。

### 支持线程的频道

**Discord** 目前是唯一支持的频道。它支持持久线程绑定子代理会话（带 `thread: true` 的 `sessions_spawn`）、手动线程控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）以及适配器键 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSessions`。

### 快速流程

<Steps>
  <Step title="生成">
    带 `thread: true`（以及可选的 `mode: "session"`）的 `sessions_spawn`。
  </Step>
  <Step title="绑定">
    OpenClaw 在活动频道中创建或绑定线程到该会话目标。
  </Step>
  <Step title="路由后续">
    该线程中的回复和后续消息路由到绑定的会话。
  </Step>
  <Step title="检查超时">
    使用 `/session idle` 检查/更新不活动自动取消绑定，使用 `/session max-age` 控制硬上限。
  </Step>
  <Step title="分离">
    使用 `/unfocus` 手动分离。
  </Step>
</Steps>

### 手动控制

| 命令               | 效果                                                 |
| ------------------ | ---------------------------------------------------- |
| `/focus <target>`  | 将当前线程（或创建一个）绑定到子代理/会话目标        |
| `/unfocus`         | 删除当前绑定线程的绑定                               |
| `/agents`          | 列出活动运行和绑定状态（`thread:<id>` 或 `unbound`） |
| `/session idle`    | 检查/更新空闲自动取消绑定（仅限聚焦绑定线程）        |
| `/session max-age` | 检查/更新硬上限（仅限聚焦绑定线程）                  |

### 配置开关

- **全局默认：**`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- **频道覆盖和生成自动绑定键**是特定于适配器的。参阅上面的[支持线程的频道](#thread-supporting-channels)。

参阅[配置参考](/gateway/configuration-reference)和[Slash 命令](/tools/slash-commands)了解当前适配器详情。

### 允许列表

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  可以通过显式 `agentId` 定位的代理 id 列表（`["*"]` 允许任何）。默认：仅请求者代理。如果你设置了列表并且仍然希望请求者使用 `agentId` 生成自身，请在列表中包含请求者 id。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  当请求者代理没有设置自己的 `subagents.allowAgents` 时使用的默认目标代理允许列表。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式配置文件选择）。每代理覆盖：`agents.list[].subagents.requireAgentId`。
</ParamField>

如果请求者会话是沙盒化的，`sessions_spawn` 拒绝将在非沙盒化环境中运行的目标。

### 发现

使用 `agents_list` 查看当前允许 `sessions_spawn` 的代理 id。响应包括每个列出代理的有效模型和嵌入的运行时元数据，使调用者可以区分 PI、Codex 应用服务器和其他配置的原生运行时。

### 自动存档

- 子代理会话在 `agents.defaults.subagents.archiveAfterMinutes`（默认 `60`）后自动存档。
- 存档使用 `sessions.delete` 并将转录重命名为 `*.deleted.<timestamp>`（同一文件夹）。
- `cleanup: "delete"` 在宣告后立即存档（仍通过重命名保留转录）。
- 自动存档是尽力而为的；如果 gateway 重启，待处理的定时器会丢失。
- `runTimeoutSeconds` **不**自动存档；它只停止运行。会话保留到自动存档。
- 自动存档同样适用于深度 1 和深度 2 会话。
- 浏览器清理与存档清理是分开的：跟踪的浏览器标签/进程在运行完成时尽力关闭，即使转录/会话记录被保留。

## 嵌套子代理

默认情况下，子代理无法生成自己的子代理（`maxSpawnDepth: 1`）。设置 `maxSpawnDepth: 2` 以启用一层嵌套——**编排器模式**：主 → 编排器子代理 → 工作者子子代理。

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // 允许子代理生成子代理（默认：1）
        maxChildrenPerAgent: 5, // 每个代理会话的最大活动子代理数（默认：5）
        maxConcurrent: 8, // 全局并发通道上限（默认：8）
        runTimeoutSeconds: 900, // sessions_spawn 省略时的默认超时（0 = 无超时）
      },
    },
  },
}
```

### 深度级别

| 深度 | 会话键形状                                   | 角色                            | 可以生成？                |
| ---- | -------------------------------------------- | ------------------------------- | ------------------------- |
| 0    | `agent:<id>:main`                            | 主代理                          | 始终                      |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理（允许深度 2 时的编排器） | 仅当 `maxSpawnDepth >= 2` |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（叶工作者）            | 从不                      |

### 宣告链

结果沿链向上流动：

1. 深度 2 工作者完成 → 宣告到其父代理（深度 1 编排器）。
2. 深度 1 编排器接收宣告，合成结果，完成 → 宣告到主代理。
3. 主代理接收宣告并传递给用户。

每个级别只看到来自其直接子代的宣告。

<Note>
**操作指导：**一次启动子代理工作并等待完成事件，而非围绕 `sessions_list`、`sessions_history`、`/subagents list` 或 `exec` sleep 命令构建轮询循环。`sessions_list` 和 `/subagents list` 将子会话关系专注于实时工作——活动子代理保持附加，已结束的子代理在短暂的最近窗口内保持可见，在其新鲜度窗口之后忽略过时的仅存储子链接。这防止旧的 `spawnedBy` / `parentSessionKey` 元数据在重启后复活幽灵子代理。如果子完成事件在你已经发送最终答案后到达，正确的后续是确切的静默令牌 `NO_REPLY` / `no_reply`。
</Note>

### 按深度的工具策略

- 角色和控制范围在生成时写入会话元数据。这使扁平或恢复的会话键无法意外重新获得编排器权限。
- **深度 1（编排器，当 `maxSpawnDepth >= 2`）：**获得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history` 以便管理其子代理。其他会话/系统工具仍然被拒绝。
- **深度 1（叶，当 `maxSpawnDepth == 1`）：**无会话工具（当前默认行为）。
- **深度 2（叶工作者）：**无会话工具——`sessions_spawn` 在深度 2 始终被拒绝。无法生成进一步的子代理。

### 每代理生成限制

每个代理会话（任何深度）一次最多可以有 `maxChildrenPerAgent`（默认 `5`）个活动子代理。这防止单个编排器的失控扇出。

### 级联停止

停止深度 1 编排器会自动停止其所有深度 2 子代理：

- 主聊天中的 `/stop` 停止所有深度 1 代理并级联到其深度 2 子代理。
- `/subagents kill <id>` 停止特定子代理并级联到其子代理。
- `/subagents kill all` 停止请求者的所有子代理并级联。

## 认证

子代理认证按**代理 id**解析，而非会话类型：

- 子代理会话键为 `agent:<agentId>:subagent:<uuid>`。
- 认证存储从该代理的 `agentDir` 加载。
- 主代理的认证配置文件作为**回退**合并；代理配置文件在冲突时覆盖主配置文件。

合并是加法的，因此主配置文件始终可作为回退使用。目前不支持每代理完全隔离的认证。

## 宣告

子代理通过宣告步骤报告：

- 宣告步骤在子代理会话中运行（不在请求者会话中）。
- 如果子代理回复恰好为 `ANNOUNCE_SKIP`，则不发布任何内容。
- 如果最新的助手文本是确切的静默令牌 `NO_REPLY` / `no_reply`，即使之前存在可见进度，宣告输出也被抑制。

交付取决于请求者深度：

- 顶级请求者会话使用带外部交付（`deliver=true`）的后续 `agent` 调用。
- 嵌套请求者子代理会话接收内部后续注入（`deliver=false`），使编排器可以在会话中合成子结果。
- 如果嵌套请求者子代理会话消失，OpenClaw 在可用时回退到该会话的请求者。

对于顶级请求者会话，完成模式直接交付首先解析任何绑定的对话/线程路由和钩子覆盖，然后从请求者会话的存储路由填充缺失的频道目标字段。即使完成来源只识别频道，这也使完成保持在正确的聊天/主题上。

子完成聚合的范围限于当前请求者运行，在构建嵌套完成发现时，防止过时的先前运行子输出泄漏到当前宣告中。宣告回复在频道适配器上可用时保留线程/主题路由。

### 宣告上下文

宣告上下文归一化为稳定的内部事件块：

| 字段     | 来源                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| 来源     | `subagent` 或 `cron`                                                                 |
| 会话 id  | 子会话键/id                                                                          |
| 类型     | 宣告类型 + 任务标签                                                                  |
| 状态     | 从运行时结果派生（`success`、`error`、`timeout` 或 `unknown`）——**不**从模型文本推断 |
| 结果内容 | 最新可见的助手文本，否则是清理后的最新工具/工具结果文本                              |
| 后续     | 描述何时回复与保持静默的指令                                                         |

终端失败的运行报告失败状态而不重放捕获的回复文本。超时时，如果子代理只完成了工具调用，宣告可以将该历史折叠为短暂的部分进度摘要，而非重放原始工具输出。

### 统计行

宣告载荷末尾包含统计行（即使包装时）：

- 运行时（例如 `runtime 5m12s`）。
- Token 使用（输入/输出/总计）。
- 配置模型定价时的估计成本（`models.providers.*.models[].cost`）。
- `sessionKey`、`sessionId` 和转录路径，使主代理可以通过 `sessions_history` 获取历史或在磁盘上检查文件。

内部元数据仅用于编排；用户面向回复应以正常助手声音重写。

### 为什么优先使用 `sessions_history`

`sessions_history` 是更安全的编排路径：

- 助手召回首先归一化：剥离思考标签；剥离 `<relevant-memories>` / `<relevant_memories>` 脚手架；剥离纯文本工具调用 XML 载荷块（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`），包括从未干净关闭的截断载荷；剥离降级的工具调用/结果脚手架和历史上下文标记；剥离泄漏的模型控制令牌（`<|assistant|>`、其他 ASCII `<|...|>`、全宽 `<｜...｜>`）；剥离格式不正确的 MiniMax 工具调用 XML。
- 凭据/令牌类文本被编辑。
- 长块可以被截断。
- 非常大的历史可以删除较旧的行或用 `[sessions_history omitted: message too large]` 替换过大的行。
- 当需要完整的逐字节转录时，磁盘上的原始转录检查是回退。

## 工具策略

子代理首先使用与父代理或目标代理相同的配置文件和工具策略管道。之后，OpenClaw 应用子代理限制层。

没有限制性 `tools.profile` 时，子代理获得**除会话工具和系统工具之外的所有工具**：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` 在这里也仍然是有界的、清理的召回视图——它不是原始转录转储。

当 `maxSpawnDepth >= 2` 时，深度 1 编排器子代理还接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history` 以便管理其子代理。

### 通过配置覆盖

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxConcurrent: 1,
      },
    },
  },
  tools: {
    subagents: {
      tools: {
        // deny 胜出
        deny: ["gateway", "cron"],
        // 如果设置了 allow，它变为仅允许（deny 仍然胜出）
        // allow: ["read", "exec", "process"]
      },
    },
  },
}
```

`tools.subagents.tools.allow` 是最终的仅允许过滤器。它可以缩小已解析的工具集，但它**不能**添加回被 `tools.profile` 删除的工具。例如，`tools.profile: "coding"` 包括 `web_search`/`web_fetch` 但不包括 `browser` 工具。要让编码配置文件子代理使用浏览器自动化，请在配置文件阶段添加 browser：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

当只有一个代理应该获得浏览器自动化时，使用每代理 `agents.list[].tools.alsoAllow: ["browser"]`。

## 并发

子代理使用专用的进程内队列通道：

- **通道名称：**`subagent`
- **并发：**`agents.defaults.subagents.maxConcurrent`（默认 `8`）

## 活跃性和恢复

OpenClaw 不将 `endedAt` 缺失视为子代理仍然存活的永久证明。比陈旧运行窗口更旧的未结束运行在 `/subagents list`、状态摘要、后代完成门控和每会话并发检查中停止计为活动/待处理。

gateway 重启后，陈旧的未结束恢复运行被修剪，除非其子会话被标记为 `abortedLastRun: true`。这些重启中止的子会话通过子代理孤儿恢复流程保持可恢复，该流程在清除中止标记之前发送合成的恢复消息。

自动重启恢复在每个子会话有界。如果相同的子代理子代在快速重楔窗口内被反复接受进行孤儿恢复，OpenClaw 在该会话上保留恢复墓碑并停止在以后的重启中自动恢复它。运行 `openclaw tasks maintenance --apply` 协调任务记录，或运行 `openclaw doctor --fix` 清除墓碑会话上的陈旧中止恢复标志。

<Note>
如果子代理生成失败并显示 Gateway `PAIRING_REQUIRED` / `scope-upgrade`，在编辑配对状态之前检查 RPC 调用者。内部 `sessions_spawn` 协调应以 `client.id: "gateway-client"` 加 `client.mode: "backend"` 通过直接回环共享令牌/密码认证连接；该路径不依赖 CLI 的配对设备范围基线。远程调用者、显式 `deviceIdentity`、显式设备令牌路径和浏览器/节点客户端仍然需要正常的设备批准以升级范围。
</Note>

## 停止

- 在请求者聊天中发送 `/stop` 中止请求者会话并停止从中生成的任何活动子代理运行，级联到嵌套子代理。
- `/subagents kill <id>` 停止特定子代理并级联到其子代理。

## 限制

- 子代理宣告是**尽力而为**的。如果 gateway 重启，待处理的"宣告回"工作丢失。
- 子代理仍然共享相同的 gateway 进程资源；将 `maxConcurrent` 视为安全阀。
- `sessions_spawn` 始终是非阻塞的：它立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文仅注入 `AGENTS.md` + `TOOLS.md`（无 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大嵌套深度为 5（`maxSpawnDepth` 范围：1–5）。大多数用例建议深度 2。
- `maxChildrenPerAgent` 每会话限制活动子代理数（默认 `5`，范围 `1–20`）。

## 相关链接

- [ACP 代理](/tools/acp-agents)
- [代理发送](/tools/agent-send)
- [后台任务](/automation/tasks)
- [多代理沙盒工具](/tools/multi-agent-sandbox-tools)
