---
summary: "用于替换底层嵌入式 agent 执行器的插件的实验性 SDK 接口"
title: "Agent 执行器插件"
sidebarTitle: "Agent Harness"
read_when:
  - 你正在更改嵌入式 agent 运行时或执行器注册表
  - 你正在从内置或受信任插件注册 agent 执行器
  - 你需要了解 Codex 插件与模型提供商的关系
---

**agent 执行器**（agent harness）是一次准备好的 OpenClaw agent 轮次的底层执行器。它不是模型提供商、不是频道，也不是工具注册表。关于面向用户的心理模型，请参见 [Agent 运行时](/concepts/agent-runtimes)。

仅对内置或受信任的原生插件使用此接口。合约仍处于实验状态，因为参数类型有意镜像了当前的嵌入式运行器。

## 何时使用执行器

当模型族有自己的原生会话运行时，并且正常的 OpenClaw 提供商传输是错误的抽象时，注册一个 agent 执行器。

示例：

- 拥有线程和压缩的原生编码 agent 服务器
- 必须流式传输原生计划/推理/工具事件的本地 CLI 或守护进程
- 需要在 OpenClaw 会话转录之外使用自己的恢复 id 的模型运行时

**不要**仅仅为了添加新的 LLM API 而注册执行器。对于普通的 HTTP 或 WebSocket 模型 API，请构建[提供商插件](/plugins/sdk-provider-plugins)。

## 核心仍然拥有什么

在选择执行器之前，OpenClaw 已经解析了：

- 提供商和模型
- 运行时认证状态
- 思考级别和上下文预算
- OpenClaw 转录/会话文件
- 工作区、沙箱和工具策略
- 频道响应回调和流式传输回调
- 模型回退和实时模型切换策略

这种分工是有意为之的。执行器运行一次已准备的尝试；它不选择提供商、替换频道交付，也不会静默切换模型。

准备的尝试还包括 `params.runtimePlan`，这是 OpenClaw 拥有的策略包，用于在 PI 和原生执行器之间共享运行时决策：

- `runtimePlan.tools.normalize(...)` 和 `runtimePlan.tools.logDiagnostics(...)`，用于提供商感知的工具架构策略
- `runtimePlan.transcript.resolvePolicy(...)`，用于转录清理和工具调用修复策略
- `runtimePlan.delivery.isSilentPayload(...)`，用于共享的 `NO_REPLY` 和媒体交付抑制
- `runtimePlan.outcome.classifyRunResult(...)`，用于模型回退分类
- `runtimePlan.observability`，用于已解析的提供商/模型/执行器元数据

执行器可以将计划用于需要与 PI 行为匹配的决策，但仍应将其视为宿主拥有的尝试状态。不要在轮次中修改它或使用它来切换提供商/模型。

## 注册执行器

**导入：** `openclaw/plugin-sdk/agent-harness`

```typescript
import type { AgentHarness } from "openclaw/plugin-sdk/agent-harness";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const myHarness: AgentHarness = {
  id: "my-harness",
  label: "My native agent harness",

  supports(ctx) {
    return ctx.provider === "my-provider"
      ? { supported: true, priority: 100 }
      : { supported: false };
  },

  async runAttempt(params) {
    // Start or resume your native thread.
    // Use params.prompt, params.tools, params.images, params.onPartialReply,
    // params.onAgentEvent, and the other prepared attempt fields.
    return await runMyNativeTurn(params);
  },
};

export default definePluginEntry({
  id: "my-native-agent",
  name: "My Native Agent",
  description: "Runs selected models through a native agent daemon.",
  register(api) {
    api.registerAgentHarness(myHarness);
  },
});
```

## 选择策略

OpenClaw 在提供商/模型解析后选择执行器：

1. 现有会话记录的执行器 id 优先，因此配置/环境变更不会将该转录热切换到另一个运行时。
2. `OPENCLAW_AGENT_RUNTIME=<id>` 为未固定的会话强制使用具有该 id 的已注册执行器。
3. `OPENCLAW_AGENT_RUNTIME=pi` 强制使用内置 PI 执行器。
4. `OPENCLAW_AGENT_RUNTIME=auto` 询问已注册执行器是否支持已解析的提供商/模型。
5. 如果没有已注册的执行器匹配，除非禁用了 PI 回退，否则 OpenClaw 使用 PI。

插件执行器失败会作为运行失败暴露。在 `auto` 模式下，PI 回退仅在没有已注册的插件执行器支持已解析的提供商/模型时使用。一旦插件执行器声明了运行，OpenClaw 不会通过 PI 重放同一轮次，因为这可能改变认证/运行时语义或产生重复的副作用。

选择的执行器 id 在嵌入式运行后与会话 id 一起持久化。在有转录历史之后，在执行器固定之前创建的旧版会话被视为 PI 固定。在 PI 和原生插件执行器之间切换时，请使用新的/重置的会话。`/status` 在 `Fast` 旁边显示非默认执行器 id（如 `codex`）；PI 保持隐藏，因为它是默认兼容路径。如果选择的执行器令人意外，请启用 `agents/harness` 调试日志，并检查 gateway 的结构化 `agent harness selected` 记录。它包括选择的执行器 id、选择原因、运行时/回退策略，以及在 `auto` 模式下每个插件候选的支持结果。

内置 Codex 插件将 `codex` 注册为其执行器 id。核心将其视为普通的插件执行器 id；Codex 特定的别名属于插件或运营商配置，而不是共享运行时选择器。

## 提供商加执行器配对

大多数执行器还应注册一个提供商。提供商使模型引用、认证状态、模型元数据和 `/model` 选择对 OpenClaw 的其余部分可见。然后执行器在 `supports(...)` 中声明该提供商。

内置 Codex 插件遵循此模式：

- 首选用户模型引用：`openai/gpt-5.5` 加上 `agentRuntime.id: "codex"`
- 兼容性引用：旧版 `codex/gpt-*` 引用仍然被接受，但新配置不应将其用作普通的提供商/模型引用
- 执行器 id：`codex`
- 认证：合成提供商可用性，因为 Codex 执行器拥有原生 Codex 登录/会话
- 应用服务器请求：OpenClaw 向 Codex 发送裸模型 id，让执行器与原生应用服务器协议通信

Codex 插件是增量的。普通的 `openai/gpt-*` 引用继续使用正常的 OpenClaw 提供商路径，除非你用 `agentRuntime.id: "codex"` 强制使用 Codex 执行器。旧版 `codex/gpt-*` 引用仍然为了兼容性而选择 Codex 提供商和执行器。

有关运营商设置、模型前缀示例和仅 Codex 配置，请参见 [Codex Harness](/plugins/codex-harness)。

OpenClaw 需要 Codex 应用服务器 `0.125.0` 或更新版本。Codex 插件检查应用服务器初始化握手并阻止旧版或无版本的服务器，以便 OpenClaw 只针对经过测试的协议接口运行。`0.125.0` 版本底线包括在 Codex `0.124.0` 中着陆的原生 MCP 钩子载荷支持，同时将 OpenClaw 固定到经过测试的更新稳定线。

### 工具结果中间件

内置插件可以通过 `api.registerAgentToolResultMiddleware(...)` 附加运行时中立的工具结果中间件，当其清单在 `contracts.agentToolResultMiddleware` 中声明目标运行时 id 时。此受信任接口用于异步工具结果转换，这些转换必须在 PI 或 Codex 将工具输出反馈给模型之前运行。

旧版内置插件仍然可以使用 `api.registerCodexAppServerExtensionFactory(...)` 用于仅 Codex 应用服务器中间件，但新的结果转换应使用运行时中立 API。仅 PI 的 `api.registerEmbeddedExtensionFactory(...)` 钩子已被删除；PI 工具结果转换必须使用运行时中立中间件。

### 终端结果分类

拥有自己协议投影的原生执行器可以使用 `openclaw/plugin-sdk/agent-harness-runtime` 中的 `classifyAgentHarnessTerminalOutcome(...)` 当完成的轮次没有产生可见的助手文本时。该帮助器返回 `empty`、`reasoning-only` 或 `planning-only`，以便 OpenClaw 的回退策略可以决定是否在不同的模型上重试。它有意不对提示词错误、进行中的轮次和有意的静默响应（如 `NO_REPLY`）进行分类。

### 原生 Codex 执行器模式

内置 `codex` 执行器是嵌入式 OpenClaw agent 轮次的原生 Codex 模式。首先启用内置 `codex` 插件，如果你的配置使用限制性允许列表，请在 `plugins.allow` 中包含 `codex`。原生应用服务器配置应使用 `openai/gpt-*` 加上 `agentRuntime.id: "codex"`。对于通过 PI 的 Codex OAuth，使用 `openai-codex/*`。旧版 `codex/*` 模型引用仍然是原生执行器的兼容别名。

当此模式运行时，Codex 拥有原生线程 id、恢复行为、压缩和应用服务器执行。OpenClaw 仍然拥有聊天频道、可见转录镜像、工具策略、审批、媒体交付和会话选择。当你需要证明只有 Codex 应用服务器路径可以声明运行时，使用 `agentRuntime.id: "codex"`。显式插件运行时失败关闭；Codex 应用服务器选择失败和运行时失败不会通过 PI 重试。

## 运行时严格性

默认情况下，OpenClaw 使用 OpenClaw Pi 运行嵌入式 agent。在 `auto` 模式下，已注册的插件执行器可以声明提供商/模型对，当没有匹配时 PI 处理轮次。当缺少执行器选择应该失败而不是通过 PI 路由时，使用显式插件运行时（如 `agentRuntime.id: "codex"`）。选择的插件执行器失败始终会硬失败。这不会阻止显式的 `agentRuntime.id: "pi"` 或 `OPENCLAW_AGENT_RUNTIME=pi`。

对于仅 Codex 的嵌入式运行：

```json
{
  "agents": {
    "defaults": {
      "model": "openai/gpt-5.5",
      "agentRuntime": {
        "id": "codex"
      }
    }
  }
}
```

如果你希望任何已注册的插件执行器声明匹配的模型，否则使用 PI，请设置 `id: "auto"`：

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "auto"
      }
    }
  }
}
```

每个 agent 的覆盖使用相同的形状：

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": { "id": "auto" }
    },
    "list": [
      {
        "id": "codex-only",
        "model": "openai/gpt-5.5",
        "agentRuntime": { "id": "codex" }
      }
    ]
  }
}
```

`OPENCLAW_AGENT_RUNTIME` 仍然覆盖已配置的运行时。

```bash
OPENCLAW_AGENT_RUNTIME=codex openclaw gateway run
```

使用显式插件运行时时，当请求的执行器未注册、不支持已解析的提供商/模型，或在产生轮次副作用之前失败时，会话会提前失败。这对于仅 Codex 部署和必须证明 Codex 应用服务器路径实际正在使用的实时测试是有意为之的。

此设置仅控制嵌入式 agent 执行器。它不禁用图像、视频、音乐、TTS、PDF 或其他特定于提供商的模型路由。

## 原生会话和转录镜像

执行器可以保留原生会话 id、线程 id 或守护进程端恢复令牌。将该绑定明确与 OpenClaw 会话关联，并继续将用户可见的助手/工具输出镜像到 OpenClaw 转录中。

OpenClaw 转录仍然是以下内容的兼容层：

- 频道可见的会话历史
- 转录搜索和索引
- 在后续轮次中切换回内置 PI 执行器
- 通用的 `/new`、`/reset` 和会话删除行为

如果你的执行器存储了一个附属绑定，请实现 `reset(...)`，以便 OpenClaw 在拥有的 OpenClaw 会话被重置时可以清除它。

## 工具和媒体结果

核心构建 OpenClaw 工具列表并将其传递到准备的尝试中。当执行器执行动态工具调用时，通过执行器结果形状返回工具结果，而不是自己发送频道媒体。

这样可以将文本、图像、视频、音乐、TTS、审批和消息工具输出保持在与 PI 支持的运行相同的交付路径上。

## 当前限制

- 公共导入路径是通用的，但一些尝试/结果类型别名仍然带有 `Pi` 名称以保持兼容性。
- 第三方执行器安装是实验性的。在需要原生会话运行时之前，优先使用提供商插件。
- 支持跨轮次的执行器切换。在原生工具、审批、助手文本或消息发送开始后，不要在轮次中间切换执行器。

## 相关文档

- [SDK 概览](/plugins/sdk-overview)
- [运行时帮助器](/plugins/sdk-runtime)
- [提供商插件](/plugins/sdk-provider-plugins)
- [Codex Harness](/plugins/codex-harness)
- [模型提供商](/concepts/model-providers)
