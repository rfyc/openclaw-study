---
summary: "插件钩子：拦截 agent、工具、消息、会话和 Gateway 生命周期事件"
title: "插件钩子"
read_when:
  - 你正在构建需要 before_tool_call、before_agent_reply、消息钩子或生命周期钩子的插件
  - 你需要从插件阻止、重写或要求审批工具调用
  - 你正在决定使用内部钩子还是插件钩子
---

插件钩子是 OpenClaw 插件的进程内扩展点。当插件需要检查或更改 agent 运行、工具调用、消息流、会话生命周期、子 agent 路由、安装或 Gateway 启动时，使用它们。

当你想要一个小型运营商安装的 `HOOK.md` 脚本用于命令和 Gateway 事件（如 `/new`、`/reset`、`/stop`、`agent:bootstrap` 或 `gateway:startup`）时，改用[内部钩子](/automation/hooks)。

## 快速开始

使用插件入口中的 `api.on(...)` 注册类型化的插件钩子：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "tool-preflight",
  name: "Tool Preflight",
  register(api) {
    api.on(
      "before_tool_call",
      async (event) => {
        if (event.toolName !== "web_search") {
          return;
        }

        return {
          requireApproval: {
            title: "Run web search",
            description: `Allow search query: ${String(event.params.query ?? "")}`,
            severity: "info",
            timeoutMs: 60_000,
            timeoutBehavior: "deny",
          },
        };
      },
      { priority: 50 },
    );
  },
});
```

钩子处理程序按 `priority` 降序依次运行。相同优先级的钩子保持注册顺序。

`api.on(name, handler, opts?)` 接受：

- `priority` — 处理程序排序（越高越先运行）。
- `timeoutMs` — 可选的每钩子预算。设置后，钩子运行器在预算耗尽时终止该处理程序并继续执行下一个，而不是让缓慢的设置或回调工作消耗调用者配置的模型超时。省略则使用钩子运行器通用应用的默认观察/决策超时。

运营商也可以在不修改插件代码的情况下设置钩子预算：

```json
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "hooks": {
          "timeoutMs": 30000,
          "timeouts": {
            "before_prompt_build": 90000,
            "agent_end": 60000
          }
        }
      }
    }
  }
}
```

`hooks.timeouts.<hookName>` 覆盖 `hooks.timeoutMs`，`hooks.timeoutMs` 覆盖插件编写的 `api.on(..., { timeoutMs })` 值。每个配置值必须是不超过 600000 毫秒的正整数。对已知的缓慢钩子优先使用每钩子覆盖，避免一个插件在所有地方获得更长的预算。

每个钩子接收 `event.context.pluginConfig`，即注册该处理程序的插件的已解析配置。用它做需要当前插件选项的钩子决策；OpenClaw 按处理程序注入它，不会修改其他插件看到的共享事件对象。

## 钩子目录

钩子按其扩展的表面分组。**粗体**名称接受决策结果（阻止、取消、覆盖或要求审批）；其他都是仅观察。

**Agent 轮次**

- `before_model_resolve` — 在会话消息加载之前覆盖提供商或模型
- `agent_turn_prepare` — 消费排队的插件轮次注入，并在提示钩子之前添加同轮上下文
- `before_prompt_build` — 在模型调用之前添加动态上下文或系统提示文本
- `before_agent_start` — 仅兼容性的组合阶段；优先使用上面两个钩子
- **`before_agent_reply`** — 用合成回复或静默短路模型轮次
- **`before_agent_finalize`** — 检查自然最终答案并请求一次额外的模型轮次
- `agent_end` — 观察最终消息、成功状态和运行持续时间
- `heartbeat_prompt_contribution` — 为后台监控和生命周期插件添加仅心跳的上下文

**对话观察**

- `model_call_started` / `model_call_ended` — 观察经过净化的提供商/模型调用元数据、时机、结果和有界请求 id 哈希，不包含提示或响应内容
- `llm_input` — 观察提供商输入（系统提示、提示、历史）
- `llm_output` — 观察提供商输出

**工具**

- **`before_tool_call`** — 重写工具参数、阻止执行或要求审批
- `after_tool_call` — 观察工具结果、错误和持续时间
- **`tool_result_persist`** — 重写从工具结果产生的助手消息
- **`before_message_write`** — 检查或阻止进行中的消息写入（少见）

**消息和投递**

- **`inbound_claim`** — 在 agent 路由之前声明入站消息（合成回复）
- `message_received` — 观察入站内容、发送者、线程和元数据
- **`message_sending`** — 重写出站内容或取消投递
- `message_sent` — 观察出站投递成功或失败
- **`before_dispatch`** — 在频道交接之前检查或重写出站调度
- **`reply_dispatch`** — 参与最终回复调度管道

**会话和压缩**

- `session_start` / `session_end` — 跟踪会话生命周期边界
- `before_compaction` / `after_compaction` — 观察或注释压缩周期
- `before_reset` — 观察会话重置事件（`/reset`、程序化重置）

**子 agent**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` — 协调子 agent 路由和完成投递

**生命周期**

- `gateway_start` / `gateway_stop` — 随 Gateway 启动或停止插件自有服务
- `cron_changed` — 观察 Gateway 自有的 cron 生命周期变化（已添加、已更新、已删除、已启动、已完成、已调度）
- **`before_install`** — 检查技能或插件安装扫描并可选地阻止

## 工具调用策略

`before_tool_call` 接收：

- `event.toolName`
- `event.params`
- 可选的 `event.runId`
- 可选的 `event.toolCallId`
- 上下文字段，如 `ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId`、`ctx.runId`、`ctx.jobId`（在 cron 驱动的运行中设置）和诊断 `ctx.trace`

它可以返回：

```typescript
type BeforeToolCallResult = {
  params?: Record<string, unknown>;
  block?: boolean;
  blockReason?: string;
  requireApproval?: {
    title: string;
    description: string;
    severity?: "info" | "warning" | "critical";
    timeoutMs?: number;
    timeoutBehavior?: "allow" | "deny";
    pluginId?: string;
    onResolution?: (
      decision: "allow-once" | "allow-always" | "deny" | "timeout" | "cancelled",
    ) => Promise<void> | void;
  };
};
```

规则：

- `block: true` 是终止性的，跳过低优先级处理程序。
- `block: false` 被视为无决策。
- `params` 重写工具参数用于执行。
- `requireApproval` 暂停 agent 运行，并通过插件审批向用户提问。`/approve` 命令可以批准 exec 和插件审批。
- 较低优先级的 `block: true` 仍然可以在较高优先级钩子请求审批后阻止。
- `onResolution` 接收已解析的审批决策——`allow-once`、`allow-always`、`deny`、`timeout` 或 `cancelled`。

需要主机级策略的捆绑插件可以用 `api.registerTrustedToolPolicy(...)` 注册受信任的工具策略。这些在普通 `before_tool_call` 钩子之前以及外部插件决策之前运行。仅对主机受信任的门控（如工作区策略、预算执行或保留的工作流安全）使用它们。外部插件应使用普通的 `before_tool_call` 钩子。

### 工具结果持久化

工具结果可以包含结构化的 `details`，用于 UI 渲染、诊断、媒体路由或插件自有元数据。将 `details` 视为运行时元数据，而非提示内容：

- OpenClaw 在提供商重放和压缩输入之前剥离 `toolResult.details`，以使元数据不会成为模型上下文。
- 持久化的会话条目仅保留有界的 `details`。过大的 details 被替换为紧凑摘要和 `persistedDetailsTruncated: true`。
- `tool_result_persist` 和 `before_message_write` 在最终持久化上限之前运行。钩子仍应保持返回的 `details` 小，并避免将提示相关文本仅放在 `details` 中；将模型可见的工具输出放在 `content` 中。

## 提示和模型钩子

为新插件使用特定阶段的钩子：

- `before_model_resolve`：仅接收当前提示和附件元数据。返回 `providerOverride` 或 `modelOverride`。
- `agent_turn_prepare`：接收当前提示、准备好的会话消息，以及为该会话排干的任何精确一次性排队注入。返回 `prependContext` 或 `appendContext`。
- `before_prompt_build`：接收当前提示和会话消息。返回 `prependContext`、`appendContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。
- `heartbeat_prompt_contribution`：仅在心跳轮次运行，并返回 `prependContext` 或 `appendContext`。它适用于需要汇总当前状态而不改变用户发起轮次的后台监控器。

`before_agent_start` 保留用于兼容性。优先使用上面的显式钩子，避免插件依赖于旧版组合阶段。

`before_agent_start` 和 `agent_end` 在 OpenClaw 能够识别活动运行时包含 `event.runId`。相同的值也可从 `ctx.runId` 获取。Cron 驱动的运行还暴露 `ctx.jobId`（原始 cron 作业 id），以便插件钩子可以将指标、副作用或状态限定到特定的调度作业。

对于频道发起的运行，`ctx.messageProvider` 是提供商表面，如 `discord` 或 `telegram`，而 `ctx.channelId` 是当 OpenClaw 能够从会话键或投递元数据推导出时的会话目标标识符。

`agent_end` 是观察钩子，在轮次后异步运行。钩子运行器应用 30 秒超时，以防卡住的插件或嵌入端点无限期挂起钩子 promise。超时被记录日志，OpenClaw 继续运行；它不会取消插件自有的网络工作，除非插件也使用自己的中止信号。

使用 `model_call_started` 和 `model_call_ended` 进行不应接收原始提示、历史、响应、头部、请求体或提供商请求 ID 的提供商调用遥测。这些钩子包含稳定的元数据，如 `runId`、`callId`、`provider`、`model`、可选的 `api`/`transport`、终端 `durationMs`/`outcome`，以及 OpenClaw 能够推导出有界提供商请求 id 哈希时的 `upstreamRequestIdHash`。

`before_agent_finalize` 仅在 harness 即将接受自然最终助手答案时运行。它不是 `/stop` 取消路径，在用户中止轮次时不运行。返回 `{ action: "revise", reason }` 要求 harness 在最终化之前再运行一次模型，返回 `{ action: "finalize", reason? }` 强制最终化，或省略结果继续。Codex 原生 `Stop` 钩子作为 OpenClaw `before_agent_finalize` 决策被中继到此钩子。

需要 `llm_input`、`llm_output`、`before_agent_finalize` 或 `agent_end` 的非捆绑插件必须设置：

```json
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "hooks": {
          "allowConversationAccess": true
        }
      }
    }
  }
}
```

提示变更钩子和持久的下一轮注入可以通过 `plugins.entries.<id>.hooks.allowPromptInjection=false` 按插件禁用。

### 会话扩展和下一轮注入

工作流插件可以用 `api.registerSessionExtension(...)` 持久化小型 JSON 兼容的会话状态，并通过 Gateway `sessions.pluginPatch` 方法更新它。会话行通过 `pluginExtensions` 投影已注册的扩展状态，让 Control UI 和其他客户端在不了解插件内部的情况下渲染插件自有状态。

当插件需要持久上下文恰好一次到达下一个模型轮次时，使用 `api.enqueueNextTurnInjection(...)`。OpenClaw 在提示钩子之前排干排队的注入，丢弃过期的注入，并按插件的 `idempotencyKey` 去重。这是审批恢复、策略摘要、后台监控增量和命令延续的正确接缝，这些内容应在下一轮对模型可见，但不应成为永久系统提示文本。

清理语义是合约的一部分。会话扩展清理和运行时生命周期清理回调接收 `reset`、`delete`、`disable` 或 `restart`。主机删除重置/删除/禁用的所有者插件的持久会话扩展状态和待处理的下一轮注入；重启保留持久会话状态，同时清理回调让插件释放调度器作业、运行上下文和旧运行时代的其他带外资源。

## 消息钩子

使用消息钩子进行频道级路由和投递策略：

- `message_received`：观察入站内容、发送者、`threadId`、`messageId`、`senderId`、可选的运行/会话关联和元数据。
- `message_sending`：重写 `content` 或返回 `{ cancel: true }`。
- `message_sent`：观察最终成功或失败。

对于仅音频的 TTS 回复，即使频道负载没有可见的文本/字幕，`content` 也可能包含隐藏的口语转录。重写该 `content` 仅更新钩子可见的转录；它不会作为媒体字幕渲染。

消息钩子上下文在可用时暴露稳定的关联字段：`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。在读取旧版元数据之前，优先使用这些第一类字段。

在使用特定频道的元数据之前，优先使用类型化的 `threadId` 和 `replyToId` 字段。

决策规则：

- `message_sending` 中的 `cancel: true` 是终止性的。
- `message_sending` 中的 `cancel: false` 被视为无决策。
- 重写的 `content` 继续传递给低优先级钩子，除非后续钩子取消投递。

## 安装钩子

`before_install` 在技能和插件安装的内置扫描之后运行。返回附加的发现结果或 `{ block: true, blockReason }` 以停止安装。

`block: true` 是终止性的。`block: false` 被视为无决策。

## Gateway 生命周期

对需要 Gateway 自有状态的插件服务使用 `gateway_start`。上下文暴露 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 用于 cron 检查和更新。使用 `gateway_stop` 清理长时间运行的资源。

不要依赖内部 `gateway:startup` 钩子来管理插件自有的运行时服务。

`cron_changed` 为 Gateway 自有的 cron 生命周期事件触发，带有类型化的事件负载，涵盖 `added`、`updated`、`removed`、`started`、`finished` 和 `scheduled` 原因。事件携带 `PluginHookGatewayCronJob` 快照（包括 `state.nextRunAtMs`、`state.lastRunStatus`，以及存在时的 `state.lastError`）加上 `PluginHookGatewayCronDeliveryStatus`（`not-requested` | `delivered` | `not-delivered` | `unknown`）。删除事件仍然携带已删除的作业快照，以便外部调度器可以协调状态。在同步外部唤醒调度器时使用运行时上下文中的 `ctx.getCron?.()` 和 `ctx.config`，并保持 OpenClaw 作为到期检查和执行的真实来源。

## 即将到来的弃用

一些钩子相邻的表面已被弃用但仍受支持。在下一个主要版本发布之前迁移：

- **`inbound_claim` 和 `message_received` 处理程序中的纯文本频道信封**。读取 `BodyForAgent` 和结构化用户上下文块，而不是解析平面信封文本。参见[纯文本频道信封 → BodyForAgent](/plugins/sdk-migration#active-deprecations)。
- **`before_agent_start`** 保留用于兼容性。新插件应使用 `before_model_resolve` 和 `before_prompt_build`，而不是组合阶段。
- **`before_tool_call` 中的 `onResolution`** 现在使用类型化的 `PluginApprovalResolution` 联合类型（`allow-once` / `allow-always` / `deny` / `timeout` / `cancelled`），而不是自由格式的 `string`。

有关完整列表——内存能力注册、提供商思考配置文件、外部认证提供商、提供商发现类型、任务运行时访问器以及 `command-auth` → `command-status` 重命名——请参见[插件 SDK 迁移 → 活跃弃用](/plugins/sdk-migration#active-deprecations)。

## 相关

- [插件 SDK 迁移](/plugins/sdk-migration) — 活跃弃用和移除时间表
- [构建插件](/plugins/building-plugins)
- [插件 SDK 概述](/plugins/sdk-overview)
- [插件入口点](/plugins/sdk-entrypoints)
- [内部钩子](/automation/hooks)
- [插件架构内部](/plugins/architecture-internals)
