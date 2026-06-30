---
summary: "OpenClaw 如何分离模型提供商、模型、频道和智能体运行时"
title: "智能体运行时"
read_when:
  - 你正在选择 PI、Codex、ACP 或其他原生智能体运行时
  - 你对状态或配置中的提供商/模型/运行时标签感到困惑
  - 你正在为原生测试工具记录支持对等性
---

**智能体运行时**是拥有一个已准备好的模型循环的组件：它接收提示、驱动模型输出、处理原生工具调用，并将完成的轮次返回给 OpenClaw。

运行时很容易与提供商混淆，因为两者都出现在模型配置附近。它们是不同的层次：

| 层次         | 示例                                  | 含义                                            |
| ------------ | ------------------------------------- | ----------------------------------------------- |
| 提供商       | `openai`, `anthropic`, `openai-codex` | OpenClaw 如何进行认证、发现模型和命名模型引用。 |
| 模型         | `gpt-5.5`, `claude-opus-4-6`          | 为智能体轮次选择的模型。                        |
| 智能体运行时 | `pi`, `codex`, `claude-cli`           | 执行已准备好的轮次的低级循环或后端。            |
| 频道         | Telegram, Discord, Slack, WhatsApp    | 消息进入和离开 OpenClaw 的地方。                |

在代码中你也会看到 **harness** 这个词。harness 是提供智能体运行时的实现。例如，内置的 Codex harness 实现了 `codex` 运行时。公共配置使用 `agentRuntime.id`；`openclaw doctor --fix` 将较旧的运行时策略键重写为该格式。

有两种运行时系列：

- **嵌入式 harness** 在 OpenClaw 的已准备好的智能体循环中运行。目前这是内置的 `pi` 运行时加上注册的插件 harness（如 `codex`）。
- **CLI 后端** 在保持模型引用规范的同时运行本地 CLI 进程。例如，`anthropic/claude-opus-4-7` 配合 `agentRuntime.id: "claude-cli"` 意味着"选择 Anthropic 模型，通过 Claude CLI 执行"。`claude-cli` 不是嵌入式 harness id，不得传递给 AgentHarness 选择。

## Codex 接口

大多数混淆来自于几个不同的接口共享 Codex 名称：

| 接口                                          | OpenClaw 名称/配置                       | 功能                                                                                  |
| --------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| 原生 Codex app-server 运行时                  | `openai/*` 加 `agentRuntime.id: "codex"` | 通过 Codex app-server 运行嵌入式智能体轮次。这是常见的 ChatGPT/Codex 订阅设置。       |
| Codex OAuth 提供商路由                        | `openai-codex/*` 模型引用                | 通过正常的 OpenClaw PI 运行器使用 ChatGPT/Codex 订阅 OAuth。                          |
| Codex ACP 适配器                              | `runtime: "acp"`, `agentId: "codex"`     | 通过外部 ACP/acpx 控制平面运行 Codex。仅在明确要求 ACP/acpx 时使用。                  |
| 原生 Codex 聊天控制命令集                     | `/codex ...`                             | 从聊天绑定、恢复、引导、停止和检查 Codex app-server 线程。                            |
| GPT/Codex 样式模型的 OpenAI Platform API 路由 | `openai/*` 模型引用                      | 使用 OpenAI API 密钥认证，除非运行时覆盖（如 `agentRuntime.id: "codex"`）运行该轮次。 |

这些接口是有意相互独立的。启用 `codex` 插件使原生 app-server 功能可用；它不会将 `openai-codex/*` 重写为 `openai/*`，不会更改现有会话，也不会使 ACP 成为 Codex 默认值。选择 `openai-codex/*` 意味着"使用 Codex OAuth 提供商路由"，除非你单独强制指定运行时。

常见的 ChatGPT/Codex 订阅设置使用 Codex OAuth 进行认证，但将模型引用保留为 `openai/*` 并选择 `codex` 运行时：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
      },
    },
  },
}
```

这意味着 OpenClaw 选择 OpenAI 模型引用，然后请求 Codex app-server 运行时执行嵌入式智能体轮次。它不意味着"使用 API 计费"，也不意味着频道、模型提供商目录或 OpenClaw 会话存储变成 Codex。

当内置的 `codex` 插件启用时，自然语言 Codex 控制应使用原生 `/codex` 命令接口（`/codex bind`、`/codex threads`、`/codex resume`、`/codex steer`、`/codex stop`），而不是 ACP。仅当用户明确要求 ACP/acpx 或正在测试 ACP 适配器路径时才将 ACP 用于 Codex。Claude Code、Gemini CLI、OpenCode、Cursor 和类似的外部 harness 仍然使用 ACP。

这是面向智能体的决策树：

1. 如果用户要求 **Codex 绑定/控制/线程/恢复/引导/停止**，在内置 `codex` 插件启用时使用原生 `/codex` 命令接口。
2. 如果用户要求 **Codex 作为嵌入式运行时**或想要正常的订阅支持的 Codex 智能体体验，使用 `openai/<model>` 加 `agentRuntime.id: "codex"`。
3. 如果用户要求**在正常 OpenClaw 运行器上使用 Codex OAuth/订阅认证**，使用 `openai-codex/<model>` 并将运行时保留为 PI。
4. 如果用户明确说 **ACP**、**acpx** 或 **Codex ACP 适配器**，使用 ACP 配合 `runtime: "acp"` 和 `agentId: "codex"`。
5. 如果请求针对 **Claude Code、Gemini CLI、OpenCode、Cursor、Droid 或另一个外部 harness**，使用 ACP/acpx，而不是原生子智能体运行时。

| 你的意思是...                       | 使用...                              |
| ----------------------------------- | ------------------------------------ |
| Codex app-server 聊天/线程控制      | 来自内置 `codex` 插件的 `/codex ...` |
| Codex app-server 嵌入式智能体运行时 | `agentRuntime.id: "codex"`           |
| PI 运行器上的 OpenAI Codex OAuth    | `openai-codex/*` 模型引用            |
| Claude Code 或其他外部 harness      | ACP/acpx                             |

关于 OpenAI 系列前缀拆分，参见 [OpenAI](/providers/openai) 和[模型提供商](/concepts/model-providers)。关于 Codex 运行时支持合同，参见 [Codex harness](/plugins/codex-harness#v1-support-contract)。

## 运行时所有权

不同的运行时拥有不同程度的循环。

| 接口                  | OpenClaw PI 嵌入式            | Codex app-server                             |
| --------------------- | ----------------------------- | -------------------------------------------- |
| 模型循环所有者        | OpenClaw 通过 PI 嵌入式运行器 | Codex app-server                             |
| 规范线程状态          | OpenClaw 记录                 | Codex 线程，加上 OpenClaw 记录镜像           |
| OpenClaw 动态工具     | 原生 OpenClaw 工具循环        | 通过 Codex 适配器桥接                        |
| 原生 shell 和文件工具 | PI/OpenClaw 路径              | Codex 原生工具，在支持的地方通过原生钩子桥接 |
| 上下文引擎            | 原生 OpenClaw 上下文组装      | OpenClaw 将组装好的上下文项目到 Codex 轮次中 |
| 压缩                  | OpenClaw 或选定的上下文引擎   | Codex 原生压缩，带 OpenClaw 通知和镜像维护   |
| 频道投递              | OpenClaw                      | OpenClaw                                     |

这种所有权拆分是主要设计规则：

- 如果 OpenClaw 拥有该接口，OpenClaw 可以提供正常的插件钩子行为。
- 如果原生运行时拥有该接口，OpenClaw 需要运行时事件或原生钩子。
- 如果原生运行时拥有规范线程状态，OpenClaw 应该镜像和项目上下文，而不是重写不支持的内部。

## 运行时选择

在提供商和模型解析之后，OpenClaw 选择嵌入式运行时：

1. 会话已记录的运行时优先。配置更改不会将现有记录热切换到不同的原生线程系统。
2. `OPENCLAW_AGENT_RUNTIME=<id>` 为新会话或重置会话强制指定该运行时。
3. `agents.defaults.agentRuntime.id` 或 `agents.list[].agentRuntime.id` 可以设置 `auto`、`pi`、注册的嵌入式 harness id（如 `codex`）或支持的 CLI 后端别名（如 `claude-cli`）。
4. 在 `auto` 模式下，注册的插件运行时可以认领支持的提供商/模型对。
5. 如果在 `auto` 模式下没有运行时认领轮次，OpenClaw 使用 PI 作为兼容性运行时。当运行必须严格时，使用显式运行时 id。

显式插件运行时按失败关闭方式工作。例如，`agentRuntime.id: "codex"` 意味着 Codex 或明确的选择/运行时错误；它不会静默路由回 PI。

CLI 后端别名与嵌入式 harness id 不同。首选的 Claude CLI 形式是：

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-7",
      agentRuntime: { id: "claude-cli" },
    },
  },
}
```

像 `claude-cli/claude-opus-4-7` 这样的遗留引用保持兼容性支持，但新配置应保持提供商/模型规范，并将执行后端放在 `agentRuntime.id` 中。

`auto` 模式是有意保守的。插件运行时可以认领它们理解的提供商/模型对，但 Codex 插件在 `auto` 模式下不认领 `openai-codex` 提供商。这将 `openai-codex/*` 保留为显式 PI Codex OAuth 路由，并避免静默地将订阅认证配置移到原生 app-server harness 上。

如果 `openclaw doctor` 警告说 `codex` 插件已启用而 `openai-codex/*` 仍然通过 PI 路由，将此视为诊断，而不是迁移。当 PI Codex OAuth 是你想要的时候，保持配置不变。仅当你想要原生 Codex app-server 执行时，才切换到 `openai/<model>` 加 `agentRuntime.id: "codex"`。

## 兼容性合同

当运行时不是 PI 时，它应该记录其支持哪些 OpenClaw 接口。使用以下形式记录运行时：

| 问题                         | 为什么重要                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------- |
| 谁拥有模型循环？             | 决定重试、工具续接和最终答案决策发生的地方。                                      |
| 谁拥有规范线程历史？         | 决定 OpenClaw 是否可以编辑历史或只能镜像它。                                      |
| OpenClaw 动态工具有效吗？    | 消息、会话、cron 和 OpenClaw 拥有的工具依赖于此。                                 |
| 动态工具钩子有效吗？         | 插件期望 `before_tool_call`、`after_tool_call` 和围绕 OpenClaw 拥有工具的中间件。 |
| 原生工具钩子有效吗？         | Shell、patch 和运行时拥有的工具需要原生钩子支持以进行策略和观察。                 |
| 上下文引擎生命周期是否运行？ | 记忆和上下文插件依赖于组装、摄取、轮次后和压缩生命周期。                          |
| 暴露了什么压缩数据？         | 一些插件只需要通知，而另一些需要保留/丢弃的元数据。                               |
| 什么是有意不支持的？         | 用户不应该在原生运行时拥有更多状态的地方假设 PI 等价性。                          |

Codex 运行时支持合同记录在 [Codex harness](/plugins/codex-harness#v1-support-contract) 中。

## 状态标签

状态输出可能同时显示 `Execution` 和 `Runtime` 标签。将它们作为诊断信息阅读，而不是提供商名称。

- 像 `openai/gpt-5.5` 这样的模型引用告诉你选定的提供商/模型。
- 像 `codex` 这样的运行时 id 告诉你哪个循环正在执行轮次。
- 像 Telegram 或 Discord 这样的频道标签告诉你对话发生在哪里。

如果在更改运行时配置后会话仍显示 PI，用 `/new` 启动新会话或用 `/reset` 清除当前会话。现有会话保留其记录的运行时，这样记录就不会通过两个不兼容的原生会话系统重放。

## 相关

- [Codex harness](/plugins/codex-harness)
- [OpenAI](/providers/openai)
- [智能体 harness 插件](/plugins/sdk-agent-harness)
- [智能体循环](/concepts/agent-loop)
- [模型](/concepts/models)
- [状态](/cli/status)
