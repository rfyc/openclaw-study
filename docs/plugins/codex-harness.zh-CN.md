---
summary: "通过捆绑的 Codex app-server 线束运行 OpenClaw 嵌入式 agent 轮次"
title: "Codex 线束"
read_when:
  - 你想使用捆绑的 Codex app-server 线束
  - 你需要 Codex 线束配置示例
  - 你希望仅 Codex 部署在失败时不回退到 PI
---

捆绑的 `codex` 插件让 OpenClaw 通过 Codex app-server 而非内置 PI 线束运行嵌入式 agent 轮次。

当你希望 Codex 拥有低级 agent 会话时使用此功能：模型发现、原生线程恢复、原生压缩和 app-server 执行。OpenClaw 仍拥有聊天频道、会话文件、模型选择、工具、审批、媒体交付和可见的转录镜像。

当源聊天轮次通过 Codex 线束运行时，如果部署未显式配置 `messages.visibleReplies`，可见回复默认使用 OpenClaw `message` 工具。agent 仍可以私下完成其 Codex 轮次；仅在调用 `message(action="send")` 时发布到频道。设置 `messages.visibleReplies: "automatic"` 以在旧版自动交付路径上保留直接聊天最终回复。

Codex 心跳轮次默认也获得 `heartbeat_respond` 工具，因此 agent 可以记录唤醒是应保持静默还是通知，而无需在最终文本中编码该控制流。

心跳特定的主动性指导在心跳轮次本身作为 Codex 协作模式开发者指令发送。普通聊天轮次恢复 Codex 默认模式，而非在其普通运行时提示中携带心跳哲学。

如果你正在尝试定向，请从 [Agent 运行时](/concepts/agent-runtimes) 开始。简短版本是：`openai/gpt-5.5` 是模型引用，`codex` 是运行时，Telegram、Discord、Slack 或另一个频道仍是通信接口。

## 快速配置

大多数想要"OpenClaw 中的 Codex"的用户需要此路线：使用 ChatGPT/Codex 订阅登录，然后通过原生 Codex app-server 运行时运行嵌入式 agent 轮次。模型引用仍保持规范的 `openai/gpt-*`；订阅认证来自 Codex 账号/配置文件，而非 `openai-codex/*` 模型前缀。

如果尚未登录，先使用 Codex OAuth 登录：

```bash
openclaw models auth login --provider openai-codex
```

然后启用捆绑的 `codex` 插件并强制使用 Codex 运行时：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
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

如果你的配置使用 `plugins.allow`，也在那里包含 `codex`：

```json5
{
  plugins: {
    allow: ["codex"],
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

当你指的是原生 Codex 运行时时，不要使用 `openai-codex/gpt-*`。该前缀是明确的"通过 PI 使用 Codex OAuth"路线。配置更改适用于新的或重置的会话；现有会话保持其记录的运行时。

## 此插件更改的内容

捆绑的 `codex` 插件贡献几种独立的能力：

| 能力                         | 使用方式                                            | 作用                                                    |
| ---------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| 原生嵌入式运行时             | `agentRuntime.id: "codex"`                          | 通过 Codex app-server 运行 OpenClaw 嵌入式 agent 轮次。 |
| 原生聊天控制命令             | `/codex bind`, `/codex resume`, `/codex steer`, ... | 从消息对话绑定和控制 Codex app-server 线程。            |
| Codex app-server 提供商/目录 | `codex` 内部，通过线束暴露                          | 让运行时发现和验证 app-server 模型。                    |
| Codex 媒体理解路径           | `codex/*` 图像模型兼容路径                          | 为支持的图像理解模型运行有界 Codex app-server 轮次。    |
| 原生钩子中继                 | 围绕 Codex 原生事件的插件钩子                       | 让 OpenClaw 观察/阻止支持的 Codex 原生工具/终结事件。   |

启用插件使这些能力可用。它**不会**：

- 开始对每个 OpenAI 模型使用 Codex
- 将 `openai-codex/*` 模型引用转换为原生运行时
- 将 ACP/acpx 设置为默认 Codex 路径
- 热切换已经记录了 PI 运行时的现有会话
- 替换 OpenClaw 频道交付、会话文件、认证配置文件存储或消息路由

同一插件还拥有原生 `/codex` 聊天控制命令接口。如果插件已启用，用户要求从聊天绑定、恢复、引导、停止或检查 Codex 线程，agent 应优先使用 `/codex ...` 而非 ACP。当用户明确请求 ACP/acpx 或正在测试 ACP Codex 适配器时，ACP 仍是明确的回退。

原生 Codex 轮次将 OpenClaw 插件钩子保留为公开兼容层。这些是进程内 OpenClaw 钩子，而非 Codex `hooks.json` 命令钩子：

- `before_prompt_build`
- `before_compaction`、`after_compaction`
- `llm_input`、`llm_output`
- `before_tool_call`、`after_tool_call`
- `before_message_write`（用于镜像转录记录）
- 通过 Codex `Stop` 中继的 `before_agent_finalize`
- `agent_end`

插件还可以注册运行时中立的工具结果中间件，在 OpenClaw 执行工具之后、将结果返回给 Codex 之前重写 OpenClaw 动态工具结果。这与公开的 `tool_result_persist` 插件钩子是分开的，后者转换 OpenClaw 拥有的转录工具结果写入。

有关插件钩子语义本身，请参见[插件钩子](/plugins/hooks)和[插件守卫行为](/tools/plugin)。

线束默认关闭。新配置应将 OpenAI 模型引用保持规范为 `openai/gpt-*`，并在需要原生 app-server 执行时显式强制 `agentRuntime.id: "codex"` 或 `OPENCLAW_AGENT_RUNTIME=codex`。传统 `codex/*` 模型引用仍为兼容性自动选择线束，但运行时支持的传统提供商前缀不作为正常模型/提供商选择显示。

如果 `codex` 插件已启用但主模型仍是 `openai-codex/*`，`openclaw doctor` 会警告而非更改路线。这是有意为之：`openai-codex/*` 仍是 PI Codex OAuth/订阅路径，原生 app-server 执行仍是明确的运行时选择。

## 路线图

更改配置前使用此表：

| 期望行为                                   | 模型引用             | 运行时配置                           | 认证/配置文件路线         | 预期状态标签                   |
| ------------------------------------------ | -------------------- | ------------------------------------ | ------------------------- | ------------------------------ |
| 使用原生 Codex 运行时的 ChatGPT/Codex 订阅 | `openai/gpt-*`       | `agentRuntime.id: "codex"`           | Codex OAuth 或 Codex 账号 | `Runtime: OpenAI Codex`        |
| 通过普通 OpenClaw 运行器的 OpenAI API      | `openai/gpt-*`       | 省略或 `runtime: "pi"`               | OpenAI API 密钥           | `Runtime: OpenClaw Pi Default` |
| 通过 PI 的 ChatGPT/Codex 订阅              | `openai-codex/gpt-*` | 省略或 `runtime: "pi"`               | OpenAI Codex OAuth 提供商 | `Runtime: OpenClaw Pi Default` |
| 保守自动模式的混合提供商                   | 提供商特定引用       | `agentRuntime.id: "auto"`            | 按选定提供商              | 取决于选定运行时               |
| 明确 Codex ACP 适配器会话                  | ACP 提示/模型依赖    | `sessions_spawn` 加 `runtime: "acp"` | ACP 后端认证              | ACP 任务/会话状态              |

重要区别是提供商与运行时：

- `openai-codex/*` 回答"PI 应使用哪个提供商/认证路线？"
- `agentRuntime.id: "codex"` 回答"哪个循环应执行此嵌入式轮次？"
- `/codex ...` 回答"哪个原生 Codex 对话应绑定或控制此聊天？"
- ACP 回答"哪个外部线束进程应由 acpx 启动？"

## 选择正确的模型前缀

OpenAI 系列路线是前缀特定的。对于常见的订阅加原生 Codex 运行时设置，使用带 `agentRuntime.id: "codex"` 的 `openai/*`。仅在你有意想要通过 PI 使用 Codex OAuth 时使用 `openai-codex/*`：

| 模型引用                                      | 运行时路径                             | 使用场景                                                     |
| --------------------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| `openai/gpt-5.4`                              | 通过 OpenClaw/PI 管道的 OpenAI 提供商  | 你想使用 `OPENAI_API_KEY` 当前直接访问 OpenAI Platform API。 |
| `openai-codex/gpt-5.5`                        | 通过 OpenClaw/PI 的 OpenAI Codex OAuth | 你想使用带默认 PI 运行器的 ChatGPT/Codex 订阅认证。          |
| `openai/gpt-5.5` + `agentRuntime.id: "codex"` | Codex app-server 线束                  | 你想使用带原生 Codex 执行的 ChatGPT/Codex 订阅认证。         |

当你的账号暴露它们时，GPT-5.5 可以出现在直接 OpenAI API 密钥和 Codex 订阅路线上。使用带 Codex app-server 线束的 `openai/gpt-5.5` 获取原生 Codex 运行时，`openai-codex/gpt-5.5` 用于 PI OAuth，或不带 Codex 运行时覆盖的 `openai/gpt-5.5` 用于直接 API 密钥流量。

传统 `codex/gpt-*` 引用仍作为兼容别名被接受。Doctor 兼容迁移将传统主运行时引用重写为规范模型引用并单独记录运行时策略，而仅回退的传统引用保持不变，因为运行时为整个 agent 容器配置。新的 PI Codex OAuth 配置应使用 `openai-codex/gpt-*`；新的原生 app-server 线束配置应使用 `openai/gpt-*` 加 `agentRuntime.id: "codex"`。

`agents.defaults.imageModel` 遵循相同的前缀分割。当图像理解应通过 OpenAI Codex OAuth 提供商路径运行时，使用 `openai-codex/gpt-*`。当图像理解应通过有界 Codex app-server 轮次运行时，使用 `codex/gpt-*`。Codex app-server 模型必须宣传图像输入支持；仅文本的 Codex 模型在媒体轮次开始前失败。

使用 `/status` 确认当前会话的有效线束。如果选择出乎意料，为 `agents/harness` 子系统启用调试日志记录，并检查 Gateway 的结构化 `agent harness selected` 记录。它包括选定的线束 id、选择原因、运行时/回退策略，以及在 `auto` 模式下每个插件候选的支持结果。

### doctor 警告的含义

当以下所有条件为真时，`openclaw doctor` 发出警告：

- 捆绑的 `codex` 插件已启用或被允许
- agent 的主模型是 `openai-codex/*`
- 该 agent 的有效运行时不是 `codex`

该警告的存在是因为用户通常期望"Codex 插件已启用"意味着"原生 Codex app-server 运行时"。OpenClaw 不会做出这种跳跃。警告的含义：

- **不需要更改**如果你有意选择通过 PI 使用 ChatGPT/Codex OAuth。
- 如果你有意选择原生 app-server 执行，将模型更改为 `openai/<model>` 并设置 `agentRuntime.id: "codex"`。
- 现有会话在运行时更改后仍需要 `/new` 或 `/reset`，因为会话运行时固定是粘性的。

线束选择不是实时会话控制。当嵌入式轮次运行时，OpenClaw 在该会话上记录选定的线束 id，并继续在同一会话 id 的后续轮次中使用它。当你希望未来会话使用另一个线束时，更改 `agentRuntime` 配置或 `OPENCLAW_AGENT_RUNTIME`；在切换现有对话的 PI 和 Codex 之前，使用 `/new` 或 `/reset` 开始新会话。这避免了通过两个不兼容的原生会话系统重播一个转录。

在具有转录历史之前创建的旧版会话，一旦拥有历史，就被视为 PI 固定。使用 `/new` 或 `/reset` 在更改配置后将该对话选择加入 Codex。

`/status` 显示有效的模型运行时。默认 PI 线束显示为 `Runtime: OpenClaw Pi Default`，Codex app-server 线束显示为 `Runtime: OpenAI Codex`。

## 要求

- OpenClaw 带有可用的捆绑 `codex` 插件。
- Codex app-server `0.125.0` 或更新版本。捆绑插件默认管理兼容的 Codex app-server 二进制文件，因此 `PATH` 上的本地 `codex` 命令不影响普通线束启动。
- Codex 认证对 app-server 进程或 OpenClaw 的 Codex 认证桥可用。本地 app-server 启动为每个 agent 使用 OpenClaw 管理的 Codex 主目录和隔离的子 `HOME`，因此默认不会读取你的个人 `~/.codex` 账号、技能、插件、配置、线程状态或原生 `$HOME/.agents/skills`。

插件阻止较旧或未版本化的 app-server 握手。这使 OpenClaw 保持在已测试的协议接口上。

对于实时和 Docker 冒烟测试，认证通常来自 Codex CLI 账号或 OpenClaw `openai-codex` 认证配置文件。本地 stdio app-server 启动也可以在没有账号存在且仍需要 OpenAI 认证时回退到 `CODEX_API_KEY` / `OPENAI_API_KEY`。

## 工作区引导文件

Codex 通过原生项目文档发现自行处理 `AGENTS.md`。OpenClaw 不写入合成 Codex 项目文档文件或依赖 Codex 回退文件名作为人格文件，因为 Codex 回退仅在 `AGENTS.md` 缺失时适用。

为了 OpenClaw 工作区对等性，Codex 线束解析其他引导文件（`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 以及存在时的 `MEMORY.md`），并通过 `thread/start` 和 `thread/resume` 上的 Codex 配置指令转发它们。这使 `SOUL.md` 和相关工作区人格/配置文件上下文可见，而无需复制 `AGENTS.md`。

## 在其他模型旁添加 Codex

如果同一个 agent 应在 Codex 和非 Codex 提供商模型之间自由切换，不要全局设置 `agentRuntime.id: "codex"`。强制运行时适用于该 agent 或会话的每个嵌入式轮次。如果在该运行时被强制时选择 Anthropic 模型，OpenClaw 仍会尝试 Codex 线束并失败关闭，而非静默地通过 PI 路由该轮次。

改用以下形态之一：

- 将 Codex 放在专用 agent 上，带 `agentRuntime.id: "codex"`。
- 将默认 agent 保留在 `agentRuntime.id: "auto"` 和 PI 回退上，用于正常混合提供商使用。
- 仅将传统 `codex/*` 引用用于兼容性。新配置应优先使用 `openai/*` 加上明确的 Codex 运行时策略。

例如，这将默认 agent 保持在正常自动选择上，并添加单独的 Codex agent：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      agentRuntime: {
        id: "auto",
      },
    },
    list: [
      {
        id: "main",
        default: true,
        model: "anthropic/claude-opus-4-6",
      },
      {
        id: "codex",
        name: "Codex",
        model: "openai/gpt-5.5",
        agentRuntime: {
          id: "codex",
        },
      },
    ],
  },
}
```

使用此形态：

- 默认 `main` agent 使用正常提供商路径和 PI 兼容回退。
- `codex` agent 使用 Codex app-server 线束。
- 如果 `codex` agent 的 Codex 缺失或不受支持，轮次会失败而非静默使用 PI。

## Agent 命令路由

Agent 应按意图而非仅凭"Codex"一词路由用户请求：

| 用户请求...                                       | Agent 应使用...                               |
| ------------------------------------------------- | --------------------------------------------- |
| "将此聊天绑定到 Codex"                            | `/codex bind`                                 |
| "在此处恢复 Codex 线程 `<id>`"                    | `/codex resume <id>`                          |
| "显示 Codex 线程"                                 | `/codex threads`                              |
| "为糟糕的 Codex 运行提交支持报告"                 | `/diagnostics [note]`                         |
| "仅为此附加线程发送 Codex 反馈"                   | `/codex diagnostics [note]`                   |
| "使用我的 ChatGPT/Codex 订阅和 Codex 运行时"      | `openai/*` 加 `agentRuntime.id: "codex"`      |
| "通过 PI 使用我的 ChatGPT/Codex 订阅"             | `openai-codex/*` 模型引用                     |
| "通过 ACP/acpx 运行 Codex"                        | ACP `sessions_spawn({ runtime: "acp", ... })` |
| "在线程中启动 Claude Code/Gemini/OpenCode/Cursor" | ACP/acpx，而非 `/codex` 和非原生子 agent      |

OpenClaw 仅在 ACP 已启用、可调度且由已加载的运行时后端支持时，才向 agent 宣传 ACP 生成指南。如果 ACP 不可用，系统提示和插件技能不应教导 agent 有关 ACP 路由的内容。

## 仅 Codex 部署

当你需要证明每个嵌入式 agent 轮次都使用 Codex 时，强制使用 Codex 线束。明确的插件运行时失败关闭，从不静默地通过 PI 重试：

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

环境覆盖：

```bash
OPENCLAW_AGENT_RUNTIME=codex openclaw gateway run
```

强制 Codex 后，如果 Codex 插件被禁用、app-server 太旧或 app-server 无法启动，OpenClaw 会提前失败。

## 每 agent 的 Codex

你可以将一个 agent 设为仅 Codex，同时默认 agent 保持正常自动选择：

```json5
{
  agents: {
    defaults: {
      agentRuntime: {
        id: "auto",
      },
    },
    list: [
      {
        id: "main",
        default: true,
        model: "anthropic/claude-opus-4-6",
      },
      {
        id: "codex",
        name: "Codex",
        model: "openai/gpt-5.5",
        agentRuntime: {
          id: "codex",
        },
      },
    ],
  },
}
```

使用正常会话命令切换 agent 和模型。`/new` 创建新的 OpenClaw 会话，Codex 线束根据需要创建或恢复其 sidecar app-server 线程。`/reset` 清除该线程的 OpenClaw 会话绑定，让下一次轮次从当前配置再次解析线束。

## 模型发现

默认情况下，Codex 插件向 app-server 询问可用模型。如果发现失败或超时，它使用以下捆绑回退目录：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

你可以在 `plugins.entries.codex.config.discovery` 下调整发现：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: true,
            timeoutMs: 2500,
          },
        },
      },
    },
  },
}
```

当你希望启动避免探测 Codex 并坚持使用回退目录时，禁用发现：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: false,
          },
        },
      },
    },
  },
}
```

## App-server 连接和策略

默认情况下，插件使用以下命令在本地启动 OpenClaw 的托管 Codex 二进制文件：

```bash
codex app-server --listen stdio://
```

托管的二进制文件随 `codex` 插件包一起发布。这使 app-server 版本与捆绑插件绑定，而非与本地安装的任何独立 Codex CLI 绑定。仅在你有意运行不同可执行文件时设置 `appServer.command`。

默认情况下，OpenClaw 在 YOLO 模式下启动本地 Codex 线束会话：`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和 `sandbox: "danger-full-access"`。这是用于自主心跳的受信任本地运营商姿态：Codex 可以使用 shell 和网络工具，而无需停止等待无人回答的原生审批提示。

要选择加入 Codex 守护者审查审批，设置 `appServer.mode: "guardian"`：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            serviceTier: "fast",
          },
        },
      },
    },
  },
}
```

守护者模式使用 Codex 的原生自动审查审批路径。当 Codex 请求离开沙盒、在工作区外写入或添加网络访问等权限时，Codex 将该审批请求路由到原生审查者，而非人工提示。审查者应用 Codex 的风险框架并批准或拒绝特定请求。在需要比 YOLO 模式更多护栏但仍需要无人值守 agent 取得进展时，使用守护者模式。

`guardian` 预设扩展为 `approvalPolicy: "on-request"`、`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。单独的策略字段仍覆盖 `mode`，因此高级部署可以将预设与明确选择混合。较旧的 `guardian_subagent` 审查者值仍作为兼容别名被接受，但新配置应使用 `auto_review`。

对于已运行的 app-server，使用 WebSocket 传输：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://127.0.0.1:39175",
            authToken: "${CODEX_APP_SERVER_TOKEN}",
            requestTimeoutMs: 60000,
          },
        },
      },
    },
  },
}
```

Stdio app-server 启动默认继承 OpenClaw 的进程环境，但 OpenClaw 拥有 Codex app-server 账号桥接，并将 `CODEX_HOME` 和 `HOME` 都设置为该 agent 的 OpenClaw 状态下的每 agent 目录。Codex 自己的技能加载器读取 `$CODEX_HOME/skills` 和 `$HOME/.agents/skills`，因此两个值对本地 app-server 启动都是隔离的。这使 Codex 原生技能、插件、配置、账号和线程状态范围限定在 OpenClaw agent，而非从运营商的个人 Codex CLI 主目录泄漏。

OpenClaw 插件和 OpenClaw 技能快照仍通过 OpenClaw 自己的插件注册表和技能加载器流转。个人 Codex CLI 资产则不然。如果你有有用的 Codex CLI 技能或插件，应成为 OpenClaw agent 的一部分，请明确清点它们：

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

Codex 迁移提供商将技能复制到当前 OpenClaw agent 工作区。Codex 原生插件、钩子和配置文件被报告或存档以供手动审查，而非自动激活，因为它们可以执行命令、暴露 MCP 服务器或携带凭据。

认证按以下顺序选择：

1. agent 的明确 OpenClaw Codex 认证配置文件。
2. app-server 在该 agent 的 Codex 主目录中的现有账号。
3. 仅对于本地 stdio app-server 启动，当没有账号存在且仍需要 OpenAI 认证时，`CODEX_API_KEY`，然后 `OPENAI_API_KEY`。

当 OpenClaw 看到 ChatGPT 订阅风格的 Codex 认证配置文件时，它从生成的 Codex 子进程中删除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。这使 Gateway 级别的 API 密钥可用于嵌入或直接 OpenAI 模型，而不会意外地使原生 Codex app-server 轮次通过 API 计费。明确的 Codex API 密钥配置文件和本地 stdio 环境密钥回退使用 app-server 登录，而非继承的子进程环境。WebSocket app-server 连接不接收 Gateway 环境 API 密钥回退；使用明确的认证配置文件或远程 app-server 自己的账号。

如果部署需要额外的环境隔离，将那些变量添加到 `appServer.clearEnv`：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            clearEnv: ["CODEX_API_KEY", "OPENAI_API_KEY"],
          },
        },
      },
    },
  },
}
```

`appServer.clearEnv` 只影响生成的 Codex app-server 子进程。

Codex 动态工具默认使用 `native-first` 配置文件。在该模式下，OpenClaw 不暴露与 Codex 原生工作区操作重复的动态工具：`read`、`write`、`edit`、`apply_patch`、`exec`、`process` 和 `update_plan`。OpenClaw 集成工具（如消息、会话、媒体、cron、浏览器、节点、Gateway、`heartbeat_respond` 和 `web_search`）仍可用。

支持的顶级 Codex 插件字段：

| 字段                       | 默认值           | 含义                                                                          |
| -------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| `codexDynamicToolsProfile` | `"native-first"` | 使用 `"openclaw-compat"` 向 Codex app-server 暴露完整的 OpenClaw 动态工具集。 |
| `codexDynamicToolsExclude` | `[]`             | 从 Codex app-server 轮次中省略的额外 OpenClaw 动态工具名称。                  |

支持的 `appServer` 字段：

| 字段                | 默认值                                   | 含义                                                                                                                                                    |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`         | `"stdio"`                                | `"stdio"` 生成 Codex；`"websocket"` 连接到 `url`。                                                                                                      |
| `command`           | 托管的 Codex 二进制文件                  | stdio 传输的可执行文件。保持未设置以使用托管的二进制文件；仅为明确覆盖时设置它。                                                                        |
| `args`              | `["app-server", "--listen", "stdio://"]` | stdio 传输的参数。                                                                                                                                      |
| `url`               | 未设置                                   | WebSocket app-server URL。                                                                                                                              |
| `authToken`         | 未设置                                   | WebSocket 传输的 Bearer 令牌。                                                                                                                          |
| `headers`           | `{}`                                     | 额外的 WebSocket 标头。                                                                                                                                 |
| `clearEnv`          | `[]`                                     | OpenClaw 构建其继承环境后从生成的 stdio app-server 进程中删除的额外环境变量名称。`CODEX_HOME` 和 `HOME` 保留给 OpenClaw 本地启动的每 agent Codex 隔离。 |
| `requestTimeoutMs`  | `60000`                                  | app-server 控制平面调用的超时。                                                                                                                         |
| `mode`              | `"yolo"`                                 | YOLO 或守护者审查执行的预设。                                                                                                                           |
| `approvalPolicy`    | `"never"`                                | 发送到线程 start/resume/turn 的原生 Codex 审批策略。                                                                                                    |
| `sandbox`           | `"danger-full-access"`                   | 发送到线程 start/resume 的原生 Codex 沙盒模式。                                                                                                         |
| `approvalsReviewer` | `"user"`                                 | 使用 `"auto_review"` 让 Codex 审查原生审批提示。`guardian_subagent` 仍是旧版别名。                                                                      |
| `serviceTier`       | 未设置                                   | 可选的 Codex app-server 服务层：`"fast"`、`"flex"` 或 `null`。无效的旧版值被忽略。                                                                      |

OpenClaw 拥有的动态工具调用独立于 `appServer.requestTimeoutMs` 有界：每个 Codex `item/tool/call` 请求必须在 30 秒内收到 OpenClaw 响应。超时时，OpenClaw 在支持的地方中止工具信号，并向 Codex 返回失败的动态工具响应，以便轮次可以继续，而不是让会话停留在 `processing`。

OpenClaw 响应 Codex 轮次范围的 app-server 请求后，线束还期望 Codex 以 `turn/completed` 完成原生轮次。如果 app-server 在该响应后 60 秒内保持安静，OpenClaw 会尽力中断 Codex 轮次，记录诊断超时，并释放 OpenClaw 会话通道，以便后续聊天消息不会在过时的原生轮次后面排队。

环境覆盖仍可用于本地测试：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当 `appServer.command` 未设置时，`OPENCLAW_CODEX_APP_SERVER_BIN` 绕过托管的二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 用于一次性本地测试。对于可重复的部署，配置是首选，因为它将插件行为保留在与其余 Codex 线束设置相同的已审查文件中。

## Computer Use

Computer Use 在其专属设置指南中介绍：[Codex Computer Use](/plugins/codex-computer-use)。

简短版本：OpenClaw 不自行提供桌面控制应用或执行桌面操作。它准备 Codex app-server，验证 `computer-use` MCP 服务器可用，然后让 Codex 在 Codex 模式轮次中处理原生 MCP 工具调用。

对于 Codex 市场流程之外的直接 TryCua 驱动程序访问，用 `openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'` 注册 `cua-driver mcp`。有关 Codex 拥有的 Computer Use 和直接 MCP 注册之间的区别，请参见 [Codex Computer Use](/plugins/codex-computer-use)。

最小配置：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          computerUse: {
            autoInstall: true,
          },
        },
      },
    },
  },
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

设置可以从命令接口检查或安装：

- `/codex computer-use status`
- `/codex computer-use install`
- `/codex computer-use install --source <marketplace-source>`
- `/codex computer-use install --marketplace-path <path>`

Computer Use 是 macOS 特定的，在 Codex MCP 服务器控制应用之前可能需要本地 OS 权限。如果 `computerUse.enabled` 为 true 且 MCP 服务器不可用，Codex 模式轮次在线程开始之前失败，而非在没有原生 Computer Use 工具的情况下静默运行。有关市场选择、远程目录限制、状态原因和故障排除，请参见 [Codex Computer Use](/plugins/codex-computer-use)。

当 `computerUse.autoInstall` 为 true 时，如果 Codex 尚未发现本地市场，OpenClaw 可以从 `/Applications/Codex.app/Contents/Resources/plugins/openai-bundled` 注册标准捆绑 Codex Desktop 市场。在更改运行时或 Computer Use 配置后使用 `/new` 或 `/reset`，以防现有会话保留旧的 PI 或 Codex 线程绑定。

## 常见配方

本地 Codex，默认 stdio 传输：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

仅 Codex 线束验证：

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
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

守护者审查的 Codex 审批：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            approvalPolicy: "on-request",
            approvalsReviewer: "auto_review",
            sandbox: "workspace-write",
          },
        },
      },
    },
  },
}
```

带明确标头的远程 app-server：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://gateway-host:39175",
            headers: {
              "X-OpenClaw-Agent": "main",
            },
          },
        },
      },
    },
  },
}
```

模型切换保持 OpenClaw 控制。当 OpenClaw 会话附加到现有 Codex 线程时，下一次轮次再次向 app-server 发送当前选定的 OpenAI 模型、提供商、审批策略、沙盒和服务层。从 `openai/gpt-5.5` 切换到 `openai/gpt-5.2` 保持线程绑定，但要求 Codex 继续使用新选定的模型。

## Codex 命令

捆绑插件将 `/codex` 注册为授权斜杠命令。它是通用的，适用于支持 OpenClaw 文本命令的任何频道。

常见形式：

- `/codex status` 显示实时 app-server 连接、模型、账号、速率限制、MCP 服务器和技能。
- `/codex models` 列出实时 Codex app-server 模型。
- `/codex threads [filter]` 列出最近的 Codex 线程。
- `/codex resume <thread-id>` 将当前 OpenClaw 会话附加到现有 Codex 线程。
- `/codex compact` 要求 Codex app-server 压缩附加的线程。
- `/codex review` 为附加的线程启动 Codex 原生审查。
- `/codex diagnostics [note]` 在发送附加线程的 Codex 诊断反馈之前询问。
- `/codex computer-use status` 检查配置的 Computer Use 插件和 MCP 服务器。
- `/codex computer-use install` 安装配置的 Computer Use 插件并重新加载 MCP 服务器。
- `/codex account` 显示账号和速率限制状态。
- `/codex mcp` 列出 Codex app-server MCP 服务器状态。
- `/codex skills` 列出 Codex app-server 技能。

### 常见调试工作流

当 Codex 支持的 agent 在 Telegram、Discord、Slack 或其他频道中做了令人惊讶的事情时，从出现问题的对话开始：

1. 运行 `/diagnostics bad tool choice after image upload` 或描述你所看到内容的另一个简短说明。
2. 批准一次诊断请求。批准会创建本地 Gateway 诊断 zip，并且由于会话使用 Codex 线束，还会向 OpenAI 服务器发送相关的 Codex 反馈包。
3. 将完成的诊断回复复制到错误报告或支持线程中。它包括本地包路径、隐私摘要、OpenClaw 会话 id、Codex 线程 id 以及每个 Codex 线程的 `Inspect locally` 行。
4. 如果你想自己调试运行，在终端中运行打印的 `Inspect locally` 命令。它看起来像 `codex resume <thread-id>`，打开原生 Codex 线程，以便你检查对话、在本地继续它，或询问 Codex 为何选择特定工具或计划。

仅在你特别希望上传当前附加线程的 Codex 反馈，而不需要完整的 OpenClaw Gateway 诊断包时，使用 `/codex diagnostics [note]`。对于大多数支持报告，`/diagnostics [note]` 是更好的起点，因为它在一个回复中将本地 Gateway 状态和 Codex 线程 id 关联在一起。有关完整隐私模型和群聊行为，请参见[诊断导出](/gateway/diagnostics)。

### 从 CLI 检查 Codex 线程

理解糟糕的 Codex 运行的最快方法通常是直接打开原生 Codex 线程：

```sh
codex resume <thread-id>
```

当你在频道对话中注意到错误，想要检查有问题的 Codex 会话、在本地继续它或询问 Codex 为何做出特定工具或推理选择时，使用此命令。最简单的路径通常是先运行 `/diagnostics [note]`：批准后，完成的报告会列出每个 Codex 线程并打印 `Inspect locally` 命令，例如 `codex resume <thread-id>`。你可以将该命令直接复制到终端中。

你也可以从当前聊天的 `/codex binding` 或最近 Codex app-server 线程的 `/codex threads [filter]` 获取线程 id，然后在 shell 中运行相同的 `codex resume` 命令。

命令接口需要 Codex app-server `0.125.0` 或更新版本。如果未来或自定义 app-server 不暴露该 JSON-RPC 方法，单独的控制方法会报告为 `unsupported by this Codex app-server`。

## 钩子边界

Codex 线束有三个钩子层：

| 层                          | 所有者            | 目的                                                 |
| --------------------------- | ----------------- | ---------------------------------------------------- |
| OpenClaw 插件钩子           | OpenClaw          | 跨 PI 和 Codex 线束的产品/插件兼容性。               |
| Codex app-server 扩展中间件 | OpenClaw 捆绑插件 | 围绕 OpenClaw 动态工具的每轮次适配器行为。           |
| Codex 原生钩子              | Codex             | 来自 Codex 配置的低级 Codex 生命周期和原生工具策略。 |

OpenClaw 不使用项目或全局 Codex `hooks.json` 文件来路由 OpenClaw 插件行为。对于支持的原生工具和权限桥接，OpenClaw 为 `PreToolUse`、`PostToolUse`、`PermissionRequest` 和 `Stop` 注入每线程 Codex 配置。其他 Codex 钩子（如 `SessionStart` 和 `UserPromptSubmit`）仍是 Codex 级别的控制；它们在 v1 合约中不作为 OpenClaw 插件钩子暴露。

对于 OpenClaw 动态工具，OpenClaw 在 Codex 请求调用后执行工具，因此 OpenClaw 在线束适配器中触发它拥有的插件和中间件行为。对于 Codex 原生工具，Codex 拥有规范的工具记录。OpenClaw 可以镜像选定的事件，但无法重写原生 Codex 线程，除非 Codex 通过 app-server 或原生钩子回调暴露该操作。

压缩和 LLM 生命周期投影来自 Codex app-server 通知和 OpenClaw 适配器状态，而非原生 Codex 钩子命令。OpenClaw 的 `before_compaction`、`after_compaction`、`llm_input` 和 `llm_output` 事件是适配器级别的观察，而非 Codex 内部请求或压缩有效载荷的逐字节捕获。

Codex 原生 `hook/started` 和 `hook/completed` app-server 通知被投影为 `codex_app_server.hook` agent 事件，用于轨迹和调试。它们不调用 OpenClaw 插件钩子。

## V1 支持合约

Codex 模式不是底层使用不同模型调用的 PI。Codex 拥有更多原生模型循环，OpenClaw 围绕该边界调整其插件和会话接口。

Codex 运行时 v1 中支持的内容：

| 接口                              | 支持                 | 原因                                                                                                                                                      |
| --------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 通过 Codex 的 OpenAI 模型循环     | 支持                 | Codex app-server 拥有 OpenAI 轮次、原生线程恢复和原生工具延续。                                                                                           |
| OpenClaw 频道路由和交付           | 支持                 | Telegram、Discord、Slack、WhatsApp、iMessage 和其他频道保留在模型运行时之外。                                                                             |
| OpenClaw 动态工具                 | 支持                 | Codex 要求 OpenClaw 执行这些工具，因此 OpenClaw 保留在执行路径中。                                                                                        |
| 提示和上下文插件                  | 支持                 | OpenClaw 在启动或恢复线程之前构建提示覆盖并将上下文投影到 Codex 轮次中。                                                                                  |
| 上下文引擎生命周期                | 支持                 | 组装、摄取或轮次后维护以及上下文引擎压缩协调在 Codex 轮次中运行。                                                                                         |
| 动态工具钩子                      | 支持                 | `before_tool_call`、`after_tool_call` 和工具结果中间件围绕 OpenClaw 拥有的动态工具运行。                                                                  |
| 生命周期钩子                      | 作为适配器观察支持   | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 以诚实的 Codex 模式有效载荷触发。                                       |
| 最终答案修订门                    | 通过原生钩子中继支持 | Codex `Stop` 中继到 `before_agent_finalize`；`revise` 在终结之前要求 Codex 进行一次以上的模型传递。                                                       |
| 原生 shell、补丁和 MCP 阻止或观察 | 通过原生钩子中继支持 | Codex `PreToolUse` 和 `PostToolUse` 针对已提交的原生工具接口中继，包括 Codex app-server `0.125.0` 或更新版本上的 MCP 有效载荷。支持阻止；不支持参数重写。 |
| 原生权限策略                      | 通过原生钩子中继支持 | Codex `PermissionRequest` 可以在运行时暴露它的地方通过 OpenClaw 策略路由。如果 OpenClaw 不返回决定，Codex 通过其正常的守护者或用户审批路径继续。          |
| App-server 轨迹捕获               | 支持                 | OpenClaw 记录发送到 app-server 的请求和接收到的 app-server 通知。                                                                                         |

Codex 运行时 v1 中不支持的内容：

| 接口                                       | V1 边界                                                                                       | 未来路径                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 原生工具参数变异                           | Codex 原生预工具钩子可以阻止，但 OpenClaw 不重写 Codex 原生工具参数。                         | 需要 Codex 钩子/模式对替换工具输入的支持。                 |
| 可编辑的 Codex 原生转录历史                | Codex 拥有规范的原生线程历史。OpenClaw 拥有镜像并可以投影未来上下文，但不应变异不支持的内部。 | 如果需要原生线程手术，添加明确的 Codex app-server API。    |
| Codex 原生工具记录的 `tool_result_persist` | 该钩子转换 OpenClaw 拥有的转录写入，而非 Codex 原生工具记录。                                 | 可以镜像转换后的记录，但规范重写需要 Codex 支持。          |
| 丰富的原生压缩元数据                       | OpenClaw 观察压缩开始和完成，但不接收稳定的保留/丢弃列表、令牌增量或摘要有效载荷。            | 需要更丰富的 Codex 压缩事件。                              |
| 压缩干预                                   | 当前 OpenClaw 压缩钩子在 Codex 模式下是通知级别的。                                           | 如果插件需要否决或重写原生压缩，添加 Codex 压缩前/后钩子。 |
| 逐字节模型 API 请求捕获                    | OpenClaw 可以捕获 app-server 请求和通知，但 Codex 核心在内部构建最终 OpenAI API 请求。        | 需要 Codex 模型请求跟踪事件或调试 API。                    |

## 工具、媒体和压缩

Codex 线束仅更改低级嵌入式 agent 执行器。

OpenClaw 仍然构建工具列表并从线束接收动态工具结果。文本、图像、视频、音乐、TTS、审批和消息工具输出通过正常的 OpenClaw 交付路径继续。

原生钩子中继有意地是通用的，但 v1 支持合约限于 OpenClaw 测试的 Codex 原生工具和权限路径。在 Codex 运行时中，这包括 shell、补丁和 MCP `PreToolUse`、`PostToolUse` 和 `PermissionRequest` 有效载荷。在运行时合约命名它之前，不要假设每个未来的 Codex 钩子事件都是 OpenClaw 插件接口。

对于 `PermissionRequest`，OpenClaw 仅在策略决定时返回明确的允许或拒绝决定。无决定结果不是允许。Codex 将其视为无钩子决定，并通过其自己的守护者或用户审批路径继续。

当 Codex 将 `_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具审批诱导通过 OpenClaw 的插件审批流程路由。Codex `request_user_input` 提示被发送回始发聊天，下一个排队的后续消息回答该原生服务器请求，而非作为额外上下文被引导。其他 MCP 诱导请求仍然失败关闭。

活跃运行队列引导映射到 Codex app-server `turn/steer`。使用默认的 `messages.queue.mode: "steer"`，OpenClaw 批量处理配置的安静窗口内排队的聊天消息，并按到达顺序将它们作为一个 `turn/steer` 请求发送。旧版 `queue` 模式发送单独的 `turn/steer` 请求。Codex 审查和手动压缩轮次可以拒绝同轮次引导，在这种情况下，当选定模式允许回退时，OpenClaw 使用后续队列。请参见[引导队列](/concepts/queue-steering)。

当选定模型使用 Codex 线束时，原生线程压缩委托给 Codex app-server。OpenClaw 为频道历史、搜索、`/new`、`/reset` 和未来模型或线束切换保留转录镜像。镜像包括用户提示、最终助手文本以及 app-server 发出时的轻量级 Codex 推理或计划记录。今天，OpenClaw 只记录原生压缩开始和完成信号。它还没有暴露人类可读的压缩摘要或 Codex 压缩后保留哪些条目的可审计列表。

由于 Codex 拥有规范的原生线程，`tool_result_persist` 目前不重写 Codex 原生工具结果记录。它仅在 OpenClaw 写入 OpenClaw 拥有的会话转录工具结果时适用。

媒体生成不需要 PI。图像、视频、音乐、PDF、TTS 和媒体理解继续使用匹配的提供商/模型设置，如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

## 故障排除

**Codex 未作为普通 `/model` 提供商出现：** 这对于新配置是预期的。选择带 `agentRuntime.id: "codex"` 的 `openai/gpt-*` 模型（或传统 `codex/*` 引用），启用 `plugins.entries.codex.enabled`，并检查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用 PI 而非 Codex：** `agentRuntime.id: "auto"` 在没有 Codex 线束声明运行时仍可以使用 PI 作为兼容后端。在测试时设置 `agentRuntime.id: "codex"` 强制 Codex 选择。强制的 Codex 运行时失败而非回退到 PI。一旦选择了 Codex app-server，其失败直接显现。

**app-server 被拒绝：** 升级 Codex，使 app-server 握手报告版本 `0.125.0` 或更新。`0.125.0-alpha.2` 或 `0.125.0+custom` 等同版本预发布或带构建后缀的版本被拒绝，因为稳定的 `0.125.0` 协议底线是 OpenClaw 测试的内容。

**模型发现缓慢：** 降低 `plugins.entries.codex.config.discovery.timeoutMs` 或禁用发现。

**WebSocket 传输立即失败：** 检查 `appServer.url`、`authToken` 以及远程 app-server 是否使用相同的 Codex app-server 协议版本。

**非 Codex 模型使用 PI：** 这是预期的，除非你为该 agent 强制 `agentRuntime.id: "codex"` 或选择了传统 `codex/*` 引用。普通 `openai/gpt-*` 和其他提供商引用在 `auto` 模式下保留在其正常提供商路径上。如果你强制 `agentRuntime.id: "codex"`，该 agent 的每个嵌入式轮次都必须是 Codex 支持的 OpenAI 模型。

**Computer Use 已安装但工具未运行：** 从新会话检查 `/codex computer-use status`。如果工具报告 `Native hook relay unavailable`，使用 `/new` 或 `/reset`；如果持续存在，重启 Gateway 以清除过时的原生钩子注册。如果 `computer-use.list_apps` 超时，重启 Codex Computer Use 或 Codex Desktop 并重试。

## 相关文档

- [Agent 线束插件](/plugins/sdk-agent-harness)
- [Agent 运行时](/concepts/agent-runtimes)
- [模型提供商](/concepts/model-providers)
- [OpenAI 提供商](/providers/openai)
- [状态](/cli/status)
- [插件钩子](/plugins/hooks)
- [配置参考](/gateway/configuration-reference)
- [测试](/help/testing-live#live-codex-app-server-harness-smoke)
