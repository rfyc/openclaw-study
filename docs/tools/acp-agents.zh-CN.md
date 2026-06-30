---
summary: "通过 ACP 后端运行外部编码运行时（Claude Code、Cursor、Gemini CLI、显式 Codex ACP、OpenClaw ACP、OpenCode）"
read_when:
  - 通过 ACP 运行编码运行时
  - 在消息频道上设置对话绑定的 ACP 会话
  - 将消息频道对话绑定到持久 ACP 会话
  - 排查 ACP 后端、插件连接或完成交付问题
  - 从聊天中操作 /acp 命令
title: "ACP 代理"
sidebarTitle: "ACP 代理"
---

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 会话让 OpenClaw 通过 ACP 后端插件运行外部编码运行时（例如 Pi、Claude Code、Cursor、Copilot、Droid、OpenClaw ACP、OpenCode、Gemini CLI 以及其他受支持的 ACPX 运行时）。

每个 ACP 会话生成都作为[后台任务](/automation/tasks)进行跟踪。

<Note>
**ACP 是外部运行时路径，而非默认 Codex 路径。** 原生 Codex 应用服务器插件拥有 `/codex ...` 控制和 `agentRuntime.id: "codex"` 嵌入式运行时；ACP 拥有 `/acp ...` 控制和 `sessions_spawn({ runtime: "acp" })` 会话。

如果您希望 Codex 或 Claude Code 作为外部 MCP 客户端直接连接到现有 OpenClaw 频道对话，请使用 [`openclaw mcp serve`](/cli/mcp) 而非 ACP。
</Note>

## 我需要哪个页面？

| 您想要…                                                                       | 使用此项                          | 备注                                                                                                                             |
| ----------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 在当前对话中绑定或控制 Codex                                                  | `/codex bind`、`/codex threads`   | 当 `codex` 插件启用时的原生 Codex 应用服务器路径；包括绑定聊天回复、图片转发、模型/快速/权限、停止和引导控制。ACP 是显式回退方案 |
| 通过 OpenClaw _运行_ Claude Code、Gemini CLI、显式 Codex ACP 或其他外部运行时 | 本页                              | 聊天绑定会话、`/acp spawn`、`sessions_spawn({ runtime: "acp" })`、后台任务、运行时控制                                           |
| 将 OpenClaw Gateway 会话*暴露*为编辑器或客户端的 ACP 服务器                   | [`openclaw acp`](/cli/acp)        | 桥接模式。IDE/客户端通过 stdio/WebSocket 以 ACP 协议与 OpenClaw 通信                                                             |
| 将本地 AI CLI 作为纯文本回退模型重用                                          | [CLI 后端](/gateway/cli-backends) | 不是 ACP。没有 OpenClaw 工具、没有 ACP 控制、没有运行时                                                                          |

## 这是否开箱即用？

是的，安装官方 ACP 运行时插件后即可使用：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

源码检出可以在 `pnpm install` 之后使用本地 `extensions/acpx` 工作区插件。运行 `/acp doctor` 进行就绪检查。

OpenClaw 仅在 ACP **真正可用**时才向代理介绍 ACP 生成：ACP 必须已启用、调度不能被禁用、当前会话不能被沙箱阻止，且运行时后端必须已加载。如果这些条件未满足，ACP 插件技能和 `sessions_spawn` ACP 指南将保持隐藏，以避免代理建议使用不可用的后端。

<AccordionGroup>
  <Accordion title="首次运行注意事项">
    - 如果设置了 `plugins.allow`，则它是一个限制性插件清单，**必须**包含 `acpx`；否则已安装的 ACP 后端会被有意阻止，`/acp doctor` 会报告缺少允许列表条目。
    - Codex ACP 适配器随 `acpx` 插件打包，并在可能时在本地启动。
    - 其他目标运行时适配器可能仍会在首次使用时通过 `npx` 按需获取。
    - 供应商认证仍必须存在于该运行时的主机上。
    - 如果主机没有 npm 或网络访问权限，首次运行的适配器获取会失败，直到缓存被预热或适配器通过其他方式安装。
  </Accordion>
  <Accordion title="运行时先决条件">
    ACP 会启动一个真实的外部运行时进程。OpenClaw 负责路由、后台任务状态、交付、绑定和策略；运行时负责其提供商登录、模型目录、文件系统行为和原生工具。

    在认为是 OpenClaw 问题之前，请先验证：

    - `/acp doctor` 报告后端已启用且健康。
    - 目标 id 被 `acp.allowedAgents` 允许（当设置了该允许列表时）。
    - 运行时命令可以在 Gateway 主机上启动。
    - 该运行时的提供商认证已存在（`claude`、`codex`、`gemini`、`opencode`、`droid` 等）。
    - 所选模型对该运行时存在——模型 id 不能跨运行时通用。
    - 请求的 `cwd` 存在且可访问，或省略 `cwd` 让后端使用其默认值。
    - 权限模式与工作匹配。非交互式会话无法点击原生权限提示，因此写入/执行密集型编码通常需要一个可以无头执行的 ACPX 权限配置。

  </Accordion>
</AccordionGroup>

默认情况下，OpenClaw 插件工具和内置 OpenClaw 工具**不会**暴露给 ACP 运行时。仅在运行时需要直接调用这些工具时，才在 [ACP 代理 — 设置](/tools/acp-agents-setup) 中启用显式 MCP 桥接。

## 支持的运行时目标

使用 `acpx` 后端时，将以下运行时 id 用作 `/acp spawn <id>` 或 `sessions_spawn({ runtime: "acp", agentId: "<id>" })` 的目标：

| 运行时 id  | 典型后端                                     | 备注                                                         |
| ---------- | -------------------------------------------- | ------------------------------------------------------------ |
| `claude`   | Claude Code ACP 适配器                       | 需要主机上的 Claude Code 认证。                              |
| `codex`    | Codex ACP 适配器                             | 仅在原生 `/codex` 不可用或明确请求 ACP 时作为显式 ACP 回退。 |
| `copilot`  | GitHub Copilot ACP 适配器                    | 需要 Copilot CLI/运行时认证。                                |
| `cursor`   | Cursor CLI ACP（`cursor-agent acp`）         | 如果本地安装暴露了不同的 ACP 入口点，请覆盖 acpx 命令。      |
| `droid`    | Factory Droid CLI                            | 需要 Factory/Droid 认证或运行时环境中的 `FACTORY_API_KEY`。  |
| `gemini`   | Gemini CLI ACP 适配器                        | 需要 Gemini CLI 认证或 API 密钥设置。                        |
| `iflow`    | iFlow CLI                                    | 适配器可用性和模型控制取决于已安装的 CLI。                   |
| `kilocode` | Kilo Code CLI                                | 适配器可用性和模型控制取决于已安装的 CLI。                   |
| `kimi`     | Kimi/Moonshot CLI                            | 需要主机上的 Kimi/Moonshot 认证。                            |
| `kiro`     | Kiro CLI                                     | 适配器可用性和模型控制取决于已安装的 CLI。                   |
| `opencode` | OpenCode ACP 适配器                          | 需要 OpenCode CLI/提供商认证。                               |
| `openclaw` | 通过 `openclaw acp` 的 OpenClaw Gateway 桥接 | 让支持 ACP 的运行时与 OpenClaw Gateway 会话通信。            |
| `pi`       | Pi/嵌入式 OpenClaw 运行时                    | 用于 OpenClaw 原生运行时实验。                               |
| `qwen`     | Qwen Code / Qwen CLI                         | 需要主机上的 Qwen 兼容认证。                                 |

可以在 acpx 本身中配置自定义 acpx 代理别名，但 OpenClaw 策略仍会在调度前检查 `acp.allowedAgents` 和任何 `agents.list[].runtime.acp.agent` 映射。

## 运维手册

从聊天中快速使用 `/acp` 流程：

<Steps>
  <Step title="生成">
    `/acp spawn claude --bind here`、
    `/acp spawn gemini --mode persistent --thread auto`，或显式
    `/acp spawn codex --bind here`。
  </Step>
  <Step title="工作">
    在绑定的对话或线程中继续（或显式指定会话密钥）。
  </Step>
  <Step title="检查状态">
    `/acp status`
  </Step>
  <Step title="调整">
    `/acp model <provider/model>`、
    `/acp permissions <profile>`、
    `/acp timeout <seconds>`。
  </Step>
  <Step title="引导">
    不替换上下文：`/acp steer tighten logging and continue`。
  </Step>
  <Step title="停止">
    `/acp cancel`（当前轮次）或 `/acp close`（会话 + 绑定）。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="生命周期详情">
    - 生成操作会创建或恢复 ACP 运行时会话，在 OpenClaw 会话存储中记录 ACP 元数据，并在运行由父任务拥有时可能创建后台任务。
    - 父任务拥有的 ACP 会话即使运行时会话是持久的，也会被视为后台工作；完成和跨界面交付通过父任务通知器进行，而不是像普通面向用户的聊天会话那样运行。
    - 任务维护会关闭终止或孤立的父任务拥有的一次性 ACP 会话。持久 ACP 会话在存在活动对话绑定时得以保留；没有活动绑定的过期持久会话会被关闭，以防止在拥有任务完成或其任务记录消失后被静默恢复。
    - 绑定的后续消息会直接发送到 ACP 会话，直到绑定被关闭、取消焦点、重置或过期。
    - Gateway 命令保持本地。`/acp ...`、`/status` 和 `/unfocus` 永远不会作为普通提示文本发送到绑定的 ACP 运行时。
    - `cancel` 在后端支持取消时中止活动轮次；它不会删除绑定或会话元数据。
    - `close` 从 OpenClaw 的角度结束 ACP 会话并删除绑定。如果运行时支持恢复，它可能仍保留自己的上游历史记录。
    - 空闲运行时工作器在 `acp.runtime.ttlMinutes` 后有资格被清理；存储的会话元数据仍可用于 `/acp sessions`。
  </Accordion>
  <Accordion title="原生 Codex 路由规则">
    当原生 Codex 插件启用时，应路由到**原生 Codex 插件**的自然语言触发器：

    - "将此 Discord 频道绑定到 Codex。"
    - "将此聊天附加到 Codex 线程 `<id>`。"
    - "显示 Codex 线程，然后绑定这个。"

    原生 Codex 对话绑定是默认的聊天控制路径。OpenClaw 动态工具仍通过 OpenClaw 执行，而 Codex 原生工具（如 shell/apply-patch）在 Codex 内部执行。对于 Codex 原生工具事件，OpenClaw 注入一个每轮原生钩子中继，使插件钩子可以阻止 `before_tool_call`、观察 `after_tool_call`，并通过 OpenClaw 批准路由 Codex `PermissionRequest` 事件。Codex `Stop` 钩子被中继到 OpenClaw `before_agent_finalize`，插件可以在 Codex 最终确定其答案之前请求再进行一次模型通过。该中继保持故意保守：它不会改变 Codex 原生工具参数或重写 Codex 线程记录。仅在需要 ACP 运行时/会话模型时才使用显式 ACP。嵌入式 Codex 支持边界记录在 [Codex 运行时 v1 支持合同](/plugins/codex-harness#v1-support-contract) 中。

  </Accordion>
  <Accordion title="模型/提供商/运行时选择速查表">
    - `openai-codex/*` — PI Codex OAuth/订阅路由。
    - `openai/*` 加 `agentRuntime.id: "codex"` — 原生 Codex 应用服务器嵌入式运行时。
    - `/codex ...` — 原生 Codex 对话控制。
    - `/acp ...` 或 `runtime: "acp"` — 显式 ACP/acpx 控制。
  </Accordion>
  <Accordion title="ACP 路由自然语言触发器">
    应路由到 ACP 运行时的触发器：

    - "将此作为一次性 Claude Code ACP 会话运行并总结结果。"
    - "使用 Gemini CLI 在线程中处理此任务，然后将后续跟进保留在同一线程中。"
    - "在后台线程中通过 ACP 运行 Codex。"

    OpenClaw 选择 `runtime: "acp"`，解析运行时 `agentId`，在受支持的情况下绑定到当前对话或线程，并将后续跟进路由到该会话直到关闭/过期。只有在 ACP/acpx 是显式的或原生 Codex 插件不可用于请求的操作时，Codex 才会遵循此路径。

    对于 `sessions_spawn`，只有在 ACP 已启用、请求者未被沙箱隔离且 ACP 运行时后端已加载时，才会通告 `runtime: "acp"`。`acp.dispatch.enabled=false` 会暂停自动 ACP 线程调度，但不会隐藏或阻止显式 `sessions_spawn({ runtime: "acp" })` 调用。它目标 ACP 运行时 id，如 `codex`、`claude`、`droid`、`gemini` 或 `opencode`。不要传递来自 `agents_list` 的普通 OpenClaw 配置代理 id，除非该条目明确配置了 `agents.list[].runtime.type="acp"`；否则使用默认子代理运行时。当 OpenClaw 代理配置了 `runtime.type="acp"` 时，OpenClaw 使用 `runtime.acp.agent` 作为底层运行时 id。

  </Accordion>
</AccordionGroup>

## ACP 与子代理的对比

当您需要外部运行时时使用 ACP。当 `codex` 插件启用时，对于 Codex 对话绑定/控制使用**原生 Codex 应用服务器**。当您需要 OpenClaw 原生委托运行时使用**子代理**。

| 区域     | ACP 会话                            | 子代理运行                        |
| -------- | ----------------------------------- | --------------------------------- |
| 运行时   | ACP 后端插件（例如 acpx）           | OpenClaw 原生子代理运行时         |
| 会话密钥 | `agent:<agentId>:acp:<uuid>`        | `agent:<agentId>:subagent:<uuid>` |
| 主要命令 | `/acp ...`                          | `/subagents ...`                  |
| 生成工具 | `sessions_spawn` 带 `runtime:"acp"` | `sessions_spawn`（默认运行时）    |

另请参阅[子代理](/tools/subagents)。

## ACP 如何运行 Claude Code

通过 ACP 运行 Claude Code 的技术栈为：

1. OpenClaw ACP 会话控制平面。
2. 官方 `@openclaw/acpx` 运行时插件。
3. Claude ACP 适配器。
4. Claude 端运行时/会话机制。

ACP Claude 是一个具有 ACP 控制、会话恢复、后台任务跟踪以及可选对话/线程绑定的**运行时会话**。

CLI 后端是独立的仅文本本地回退运行时——参见 [CLI 后端](/gateway/cli-backends)。

对于运营者，实际规则是：

- **需要 `/acp spawn`、可绑定会话、运行时控制或持久运行时工作？** 使用 ACP。
- **需要通过原始 CLI 进行简单的本地文本回退？** 使用 CLI 后端。

## 绑定会话

### 概念模型

- **聊天界面** — 人们持续交谈的地方（Discord 频道、Telegram 话题、iMessage 聊天）。
- **ACP 会话** — OpenClaw 路由到的持久 Codex/Claude/Gemini 运行时状态。
- **子线程/话题** — 仅由 `--thread ...` 创建的可选额外消息界面。
- **运行时工作区** — 运行时运行的文件系统位置（`cwd`、代码库检出、后端工作区）。独立于聊天界面。

### 当前对话绑定

`/acp spawn <harness> --bind here` 将当前对话固定到生成的 ACP 会话——没有子线程，使用相同的聊天界面。OpenClaw 继续拥有传输、认证、安全和交付。该对话中的后续消息路由到同一会话；`/new` 和 `/reset` 就地重置会话；`/acp close` 删除绑定。

示例：

```text
/codex bind                                              # 原生 Codex 绑定，将未来消息路由到此处
/codex model gpt-5.4                                     # 调整绑定的原生 Codex 线程
/codex stop                                              # 控制活动的原生 Codex 轮次
/acp spawn codex --bind here                             # Codex 的显式 ACP 回退
/acp spawn codex --thread auto                           # 可能创建子线程/话题并在那里绑定
/acp spawn codex --bind here --cwd /workspace/repo       # 相同的聊天绑定，Codex 在 /workspace/repo 中运行
```

<AccordionGroup>
  <Accordion title="绑定规则和排他性">
    - `--bind here` 和 `--thread ...` 互斥。
    - `--bind here` 仅在暴露当前对话绑定支持的频道上有效；否则 OpenClaw 返回清晰的不支持消息。绑定在 Gateway 重启后持续存在。
    - 在 Discord 上，`spawnSessions` 控制 `--thread auto|here` 的子线程创建——而不是 `--bind here`。
    - 如果您在没有 `--cwd` 的情况下生成到不同的 ACP 代理，OpenClaw 默认继承**目标代理**的工作区。缺失的继承路径（`ENOENT`/`ENOTDIR`）回退到后端默认值；其他访问错误（例如 `EACCES`）会作为生成错误暴露。
    - Gateway 管理命令在绑定对话中保持本地——即使普通后续文本路由到绑定的 ACP 会话，`/acp ...` 命令也由 OpenClaw 处理；`/status` 和 `/unfocus` 也在为该界面启用命令处理时保持本地。
  </Accordion>
  <Accordion title="线程绑定会话">
    当为频道适配器启用线程绑定时：

    - OpenClaw 将线程绑定到目标 ACP 会话。
    - 该线程中的后续消息路由到绑定的 ACP 会话。
    - ACP 输出交付回同一线程。
    - 取消焦点/关闭/归档/空闲超时或最大年龄过期会删除绑定。
    - `/acp close`、`/acp cancel`、`/acp status`、`/status` 和 `/unfocus` 是 Gateway 命令，不是发送给 ACP 运行时的提示。

    线程绑定 ACP 所需的功能标志：

    - `acp.enabled=true`
    - `acp.dispatch.enabled` 默认开启（设为 `false` 可暂停自动 ACP 线程调度；显式 `sessions_spawn({ runtime: "acp" })` 调用仍然有效）。
    - 频道适配器线程会话生成已启用（默认：`true`）：
      - Discord：`channels.discord.threadBindings.spawnSessions=true`
      - Telegram：`channels.telegram.threadBindings.spawnSessions=true`

    线程绑定支持因适配器而异。如果活动频道适配器不支持线程绑定，OpenClaw 返回清晰的不支持/不可用消息。

  </Accordion>
  <Accordion title="支持线程的频道">
    - 任何暴露会话/线程绑定能力的频道适配器。
    - 当前内置支持：**Discord** 线程/频道、**Telegram** 话题（群组/超级群组中的论坛话题和 DM 话题）。
    - 插件频道可通过相同的绑定接口添加支持。
  </Accordion>
</AccordionGroup>

## 持久频道绑定

对于非临时工作流，在顶级 `bindings[]` 条目中配置持久 ACP 绑定。

### 绑定模型

<ParamField path="bindings[].type" type='"acp"'>
  标记持久 ACP 对话绑定。
</ParamField>
<ParamField path="bindings[].match" type="object">
  标识目标对话。每个频道的形状：

- **Discord 频道/线程：** `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
- **Telegram 论坛话题：** `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- **BlueBubbles DM/群组：** `match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`。对于稳定的群组绑定，优先使用 `chat_id:*` 或 `chat_identifier:*`。
- **iMessage DM/群组：** `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`。对于稳定的群组绑定，优先使用 `chat_id:*`。

</ParamField>
<ParamField path="bindings[].agentId" type="string">
  拥有的 OpenClaw 代理 id。
</ParamField>
<ParamField path="bindings[].acp.mode" type='"persistent" | "oneshot"'>
  可选的 ACP 覆盖。
</ParamField>
<ParamField path="bindings[].acp.label" type="string">
  可选的运营者标签。
</ParamField>
<ParamField path="bindings[].acp.cwd" type="string">
  可选的运行时工作目录。
</ParamField>
<ParamField path="bindings[].acp.backend" type="string">
  可选的后端覆盖。
</ParamField>

### 每个代理的运行时默认值

使用 `agents.list[].runtime` 为每个代理定义一次 ACP 默认值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent`（运行时 id，例如 `codex` 或 `claude`）
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

**ACP 绑定会话的覆盖优先级：**

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. 全局 ACP 默认值（例如 `acp.backend`）

### 示例

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
      {
        id: "claude",
        runtime: {
          type: "acp",
          acp: { agent: "claude", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
    {
      type: "acp",
      agentId: "claude",
      match: {
        channel: "telegram",
        accountId: "default",
        peer: { kind: "group", id: "-1001234567890:topic:42" },
      },
      acp: { cwd: "/workspace/repo-b" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "discord", accountId: "default" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "telegram", accountId: "default" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": { requireMention: false },
          },
        },
      },
    },
    telegram: {
      groups: {
        "-1001234567890": {
          topics: { "42": { requireMention: false } },
        },
      },
    },
  },
}
```

### 行为

- OpenClaw 在使用前确保配置的 ACP 会话存在。
- 该频道或话题中的消息路由到配置的 ACP 会话。
- 在绑定对话中，`/new` 和 `/reset` 就地重置相同的 ACP 会话密钥。
- 临时运行时绑定（例如由线程焦点流创建的）在存在的情况下仍然适用。
- 对于没有显式 `cwd` 的跨代理 ACP 生成，OpenClaw 从代理配置继承目标代理工作区。
- 缺失的继承工作区路径回退到后端默认 cwd；非缺失访问失败作为生成错误暴露。

## 启动 ACP 会话

启动 ACP 会话有两种方式：

<Tabs>
  <Tab title="通过 sessions_spawn">
    使用 `runtime: "acp"` 从代理轮次或工具调用中启动 ACP 会话。

    ```json
    {
      "task": "打开代码库并总结失败的测试",
      "runtime": "acp",
      "agentId": "codex",
      "thread": true,
      "mode": "session"
    }
    ```

    <Note>
    `runtime` 默认为 `subagent`，因此 ACP 会话需要显式设置 `runtime: "acp"`。如果省略 `agentId`，OpenClaw 在配置了 `acp.defaultAgent` 时使用该值。`mode: "session"` 需要 `thread: true` 以保持持久绑定对话。
    </Note>

  </Tab>
  <Tab title="通过 /acp 命令">
    使用 `/acp spawn` 从聊天中进行显式运营者控制。

    ```text
    /acp spawn codex --mode persistent --thread auto
    /acp spawn codex --mode oneshot --thread off
    /acp spawn codex --bind here
    /acp spawn codex --thread here
    ```

    主要标志：

    - `--mode persistent|oneshot`
    - `--bind here|off`
    - `--thread auto|here|off`
    - `--cwd <absolute-path>`
    - `--label <name>`

    参见[斜杠命令](/tools/slash-commands)。

  </Tab>
</Tabs>

### `sessions_spawn` 参数

<ParamField path="task" type="string" required>
  发送到 ACP 会话的初始提示。
</ParamField>
<ParamField path="runtime" type='"acp"' required>
  ACP 会话必须为 `"acp"`。
</ParamField>
<ParamField path="agentId" type="string">
  ACP 目标运行时 id。如果设置了 `acp.defaultAgent` 则回退到该值。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  在受支持的情况下请求线程绑定流。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  `"run"` 是一次性的；`"session"` 是持久的。如果 `thread: true` 且省略了 `mode`，OpenClaw 可能根据运行时路径默认为持久行为。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cwd" type="string">
  请求的运行时工作目录（由后端/运行时策略验证）。如果省略，ACP 生成在配置时继承目标代理工作区；缺失的继承路径回退到后端默认值，而真实的访问错误会被返回。
</ParamField>
<ParamField path="label" type="string">
  会话/横幅文本中使用的运营者标签。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  恢复现有 ACP 会话而非创建新会话。代理通过 `session/load` 重放其对话历史。需要 `runtime: "acp"`。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  `"parent"` 将初始 ACP 运行进度摘要作为系统事件流回请求者会话。接受的响应包括 `streamLogPath`，指向会话范围的 JSONL 日志（`<sessionId>.acp-stream.jsonl`），您可以跟踪完整的中继历史。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  N 秒后中止 ACP 子轮次。`0` 使轮次保持在 Gateway 的无超时路径上。相同的值应用于 Gateway 运行和 ACP 运行时，以防止停滞/配额耗尽的运行时无限期占用父代理通道。
</ParamField>
<ParamField path="model" type="string">
  ACP 子会话的显式模型覆盖。Codex ACP 生成在 `session/new` 之前将 OpenClaw Codex 引用（如 `openai-codex/gpt-5.4`）规范化为 Codex ACP 启动配置；斜杠形式（如 `openai-codex/gpt-5.4/high`）也设置 Codex ACP 推理努力度。其他运行时必须通告 ACP `models` 并支持 `session/set_model`；否则 OpenClaw/acpx 会清晰地失败，而不是静默回退到目标代理默认值。
</ParamField>
<ParamField path="thinking" type="string">
  显式思考/推理努力度。对于 Codex ACP，`minimal` 映射到低努力度，`low`/`medium`/`high`/`xhigh` 直接映射，`off` 省略推理努力度启动覆盖。
</ParamField>

## 生成绑定和线程模式

<Tabs>
  <Tab title="--bind here|off">
    | 模式   | 行为                                                                   |
    | ------ | ---------------------------------------------------------------------- |
    | `here` | 就地绑定当前活动对话；如果没有活动对话则失败。                          |
    | `off`  | 不创建当前对话绑定。                                                    |

    注意：

    - `--bind here` 是"让此频道或聊天由 Codex 支持"的最简单运营者路径。
    - `--bind here` 不创建子线程。
    - `--bind here` 仅在暴露当前对话绑定支持的频道上可用。
    - `--bind` 和 `--thread` 不能在同一个 `/acp spawn` 调用中组合使用。

  </Tab>
  <Tab title="--thread auto|here|off">
    | 模式   | 行为                                                                                                  |
    | ------ | ----------------------------------------------------------------------------------------------------- |
    | `auto` | 在活动线程中：绑定该线程。在线程外：在受支持的情况下创建/绑定子线程。                                  |
    | `here` | 需要当前活动线程；如果不在线程中则失败。                                                               |
    | `off`  | 无绑定。会话启动时未绑定。                                                                             |

    注意：

    - 在非线程绑定界面上，默认行为实际上是 `off`。
    - 线程绑定生成需要频道策略支持：
      - Discord：`channels.discord.threadBindings.spawnSessions=true`
      - Telegram：`channels.telegram.threadBindings.spawnSessions=true`
    - 当您想在不创建子线程的情况下固定当前对话时，请使用 `--bind here`。

  </Tab>
</Tabs>

## 交付模型

ACP 会话可以是交互式工作区或父任务拥有的后台工作。交付路径取决于该形式。

<AccordionGroup>
  <Accordion title="交互式 ACP 会话">
    交互式会话旨在在可见的聊天界面上持续交谈：

    - `/acp spawn ... --bind here` 将当前对话绑定到 ACP 会话。
    - `/acp spawn ... --thread ...` 将频道线程/话题绑定到 ACP 会话。
    - 持久配置的 `bindings[].type="acp"` 将匹配的对话路由到相同的 ACP 会话。

    绑定对话中的后续消息直接路由到 ACP 会话，ACP 输出交付回同一频道/线程/话题。

    OpenClaw 发送给运行时的内容：

    - 普通绑定后续跟进作为提示文本发送，附件仅在运行时/后端支持时发送。
    - `/acp` 管理命令和本地 Gateway 命令在 ACP 调度前被拦截。
    - 运行时生成的完成事件按目标具体化。OpenClaw 代理获得 OpenClaw 的内部运行时上下文信封；外部 ACP 运行时获得带有子结果和指令的纯提示。原始 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>` 信封不应发送给外部运行时或作为 ACP 用户转录文本持久化。
    - ACP 转录条目使用用户可见的触发文本或纯完成提示。内部事件元数据尽可能保持在 OpenClaw 中结构化，不被视为用户创作的聊天内容。

  </Accordion>
  <Accordion title="父任务拥有的一次性 ACP 会话">
    由另一个代理运行生成的一次性 ACP 会话是后台子任务，类似于子代理：

    - 父任务通过 `sessions_spawn({ runtime: "acp", mode: "run" })` 请求工作。
    - 子任务在其自己的 ACP 运行时会话中运行。
    - 子轮次在原生子代理生成使用的相同后台通道上运行，因此缓慢的 ACP 运行时不会阻塞无关的主会话工作。
    - 完成通过任务完成通告路径报告。OpenClaw 在将内部完成元数据发送到外部运行时之前将其转换为纯 ACP 提示，因此运行时不会看到 OpenClaw 专用的运行时上下文标记。
    - 当用户可见的回复有用时，父任务以正常助手语气重写子任务结果。

    **不要**将此路径视为父子之间的点对点聊天。子任务已经有一个回报父任务的完成通道。

  </Accordion>
  <Accordion title="sessions_send 和 A2A 交付">
    `sessions_send` 可以在生成后定位另一个会话。对于普通对等会话，OpenClaw 在注入消息后使用代理到代理（A2A）后续路径：

    - 等待目标会话的回复。
    - 可选地让请求者和目标交换有界数量的后续轮次。
    - 要求目标生成通告消息。
    - 将该通告交付到可见的频道或线程。

    该 A2A 路径是对等发送的回退，当发送者需要可见的后续跟进时使用。当无关会话可以看到并向 ACP 目标发送消息时（例如在广泛的 `tools.sessions.visibility` 设置下），它保持启用。

    OpenClaw 仅在请求者是其自己的父任务拥有的一次性 ACP 子任务的父任务时跳过 A2A 后续跟进。在这种情况下，在任务完成之上运行 A2A 可能会用子任务的结果唤醒父任务，将父任务的回复转发回子任务，并创建父/子回声循环。对于该拥有的子任务情况，`sessions_send` 结果报告 `delivery.status="skipped"`，因为完成路径已经负责结果。

  </Accordion>
  <Accordion title="恢复现有会话">
    使用 `resumeSessionId` 继续之前的 ACP 会话而不是重新开始。代理通过 `session/load` 重放其对话历史，因此它可以完整地了解之前发生的事情。

    ```json
    {
      "task": "从上次离开的地方继续——修复剩余的测试失败",
      "runtime": "acp",
      "agentId": "codex",
      "resumeSessionId": "<previous-session-id>"
    }
    ```

    常见用例：

    - 将 Codex 会话从笔记本电脑移交到手机——告诉您的代理从上次停止的地方继续。
    - 继续您在 CLI 中交互式开始的编码会话，现在通过您的代理以无头方式进行。
    - 恢复被 Gateway 重启或空闲超时中断的工作。

    注意：

    - `resumeSessionId` 仅在 `runtime: "acp"` 时适用；默认子代理运行时会忽略此 ACP 专用字段。
    - `streamTo` 仅在 `runtime: "acp"` 时适用；默认子代理运行时会忽略此 ACP 专用字段。
    - `resumeSessionId` 是主机本地的 ACP/运行时恢复 id，不是 OpenClaw 频道会话密钥；OpenClaw 在调度前仍会检查 ACP 生成策略和目标代理策略，而 ACP 后端或运行时拥有加载该上游 id 的授权。
    - `resumeSessionId` 恢复上游 ACP 对话历史；`thread` 和 `mode` 仍正常应用于您创建的新 OpenClaw 会话，因此 `mode: "session"` 仍需要 `thread: true`。
    - 目标代理必须支持 `session/load`（Codex 和 Claude Code 支持）。
    - 如果找不到会话 id，生成会以清晰的错误失败——不会静默回退到新会话。

  </Accordion>
  <Accordion title="部署后冒烟测试">
    在 Gateway 部署后，进行实时端到端检查，而不是信任单元测试：

    1. 验证目标主机上已部署的 Gateway 版本和提交。
    2. 向实时代理打开一个临时 ACPX 桥接会话。
    3. 要求该代理调用 `sessions_spawn`，带 `runtime: "acp"`、`agentId: "codex"`、`mode: "run"` 和任务 `Reply with exactly LIVE-ACP-SPAWN-OK`。
    4. 验证 `accepted=yes`、真实的 `childSessionKey` 且无验证器错误。
    5. 清理临时桥接会话。

    将门控保持在 `mode: "run"` 上并跳过 `streamTo: "parent"`——线程绑定的 `mode: "session"` 和流中继路径是独立的更丰富的集成通过。

  </Accordion>
</AccordionGroup>

## 沙箱兼容性

ACP 会话当前在主机运行时上运行，**不在** OpenClaw 沙箱内。

<Warning>
**安全边界：**

- 外部运行时可以根据自己的 CLI 权限和所选 `cwd` 进行读写。
- OpenClaw 的沙箱策略**不**包装 ACP 运行时执行。
- OpenClaw 仍然执行 ACP 功能门控、允许的代理、会话所有权、频道绑定和 Gateway 交付策略。
- 对于沙箱强制的 OpenClaw 原生工作，请使用 `runtime: "subagent"`。
  </Warning>

当前限制：

- 如果请求者会话被沙箱隔离，则 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 的 ACP 生成都会被阻止。
- 带 `runtime: "acp"` 的 `sessions_spawn` 不支持 `sandbox: "require"`。

## 会话目标解析

大多数 `/acp` 操作接受可选的会话目标（`session-key`、`session-id` 或 `session-label`）。

**解析顺序：**

1. 显式目标参数（或 `/acp steer` 的 `--session`）
   - 尝试密钥
   - 然后 UUID 形式的会话 id
   - 然后标签
2. 当前线程绑定（如果此对话/线程绑定到 ACP 会话）。
3. 当前请求者会话回退。

当前对话绑定和线程绑定都参与第 2 步。

如果没有目标解析成功，OpenClaw 返回清晰的错误（`Unable to resolve session target: ...`）。

## ACP 控制

| 命令                 | 功能                                     | 示例                                                          |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 创建 ACP 会话；可选当前绑定或线程绑定。  | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目标会话的进行中轮次。               | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 向运行中的会话发送引导指令。             | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 关闭会话并解除线程目标绑定。             | `/acp close`                                                  |
| `/acp status`        | 显示后端、模式、状态、运行时选项、能力。 | `/acp status`                                                 |
| `/acp set-mode`      | 为目标会话设置运行时模式。               | `/acp set-mode plan`                                          |
| `/acp set`           | 通用运行时配置选项写入。                 | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | 设置运行时工作目录覆盖。                 | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 设置审批策略配置文件。                   | `/acp permissions strict`                                     |
| `/acp timeout`       | 设置运行时超时（秒）。                   | `/acp timeout 120`                                            |
| `/acp model`         | 设置运行时模型覆盖。                     | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除会话运行时选项覆盖。                 | `/acp reset-options`                                          |
| `/acp sessions`      | 从存储中列出最近的 ACP 会话。            | `/acp sessions`                                               |
| `/acp doctor`        | 后端健康状态、能力、可操作的修复建议。   | `/acp doctor`                                                 |
| `/acp install`       | 打印确定性安装和启用步骤。               | `/acp install`                                                |

`/acp status` 显示有效的运行时选项以及运行时级和后端级会话标识符。当后端缺少某项能力时，不支持的控制错误会清晰地暴露。`/acp sessions` 读取当前绑定或请求者会话的存储；目标令牌（`session-key`、`session-id` 或 `session-label`）通过 Gateway 会话发现解析，包括每个代理的自定义 `session.store` 根目录。

### 运行时选项映射

`/acp` 有便利命令和通用设置器。等效操作：

| 命令                         | 映射到                         | 备注                                                                                                                                                    |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/acp model <id>`            | 运行时配置键 `model`           | 对于 Codex ACP，OpenClaw 将 `openai-codex/<model>` 规范化为适配器模型 id，并将斜杠推理后缀（如 `openai-codex/gpt-5.4/high`）映射到 `reasoning_effort`。 |
| `/acp set thinking <level>`  | 运行时配置键 `thinking`        | 对于 Codex ACP，在适配器支持时，OpenClaw 发送相应的 `reasoning_effort`。                                                                                |
| `/acp permissions <profile>` | 运行时配置键 `approval_policy` | —                                                                                                                                                       |
| `/acp timeout <seconds>`     | 运行时配置键 `timeout`         | —                                                                                                                                                       |
| `/acp cwd <path>`            | 运行时 cwd 覆盖                | 直接更新。                                                                                                                                              |
| `/acp set <key> <value>`     | 通用                           | `key=cwd` 使用 cwd 覆盖路径。                                                                                                                           |
| `/acp reset-options`         | 清除所有运行时覆盖             | —                                                                                                                                                       |

## acpx 运行时、插件设置和权限

有关 acpx 运行时配置（Claude Code / Codex / Gemini CLI 别名）、插件工具和 OpenClaw 工具 MCP 桥接以及 ACP 权限模式，请参阅 [ACP 代理 — 设置](/tools/acp-agents-setup)。

## 故障排除

| 症状                                                                        | 可能原因                                                                  | 修复方案                                                                                                                                                |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | 后端插件缺失、禁用或被 `plugins.allow` 阻止。                             | 安装并启用后端插件，当设置了该允许列表时在 `plugins.allow` 中包含 `acpx`，然后运行 `/acp doctor`。                                                      |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 全局禁用。                                                            | 设置 `acp.enabled=true`。                                                                                                                               |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 来自普通线程消息的自动调度已禁用。                                        | 设置 `acp.dispatch.enabled=true` 以恢复自动线程路由；显式 `sessions_spawn({ runtime: "acp" })` 调用仍然有效。                                           |
| `ACP agent "<id>" is not allowed by policy`                                 | 代理不在允许列表中。                                                      | 使用允许的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                       |
| 启动后立即 `/acp doctor` 报告后端未就绪                                     | 后端插件缺失、禁用、被允许/拒绝策略阻止，或其配置的可执行文件不可用。     | 安装/启用后端插件，重新运行 `/acp doctor`，如果仍然不健康则检查后端安装或策略错误。                                                                     |
| 运行时命令未找到                                                            | 适配器 CLI 未安装、外部插件缺失，或非 Codex 适配器的首次 `npx` 获取失败。 | 运行 `/acp doctor`，在 Gateway 主机上安装/预热适配器，或显式配置 acpx 代理命令。                                                                        |
| 来自运行时的模型未找到                                                      | 模型 id 对另一个提供商/运行时有效，但对此 ACP 目标无效。                  | 使用该运行时列出的模型，在运行时中配置模型，或省略覆盖。                                                                                                |
| 来自运行时的供应商认证错误                                                  | OpenClaw 健康，但目标 CLI/提供商未登录。                                  | 在 Gateway 主机环境中登录或提供所需的提供商密钥。                                                                                                       |
| `Unable to resolve session target: ...`                                     | 错误的密钥/id/标签令牌。                                                  | 运行 `/acp sessions`，复制精确的密钥/标签，重试。                                                                                                       |
| `--bind here requires running /acp spawn inside an active ... conversation` | 在没有活动可绑定对话的情况下使用了 `--bind here`。                        | 移到目标聊天/频道并重试，或使用未绑定的生成。                                                                                                           |
| `Conversation bindings are unavailable for <channel>.`                      | 适配器缺少当前对话 ACP 绑定能力。                                         | 在受支持的情况下使用 `/acp spawn ... --thread ...`，配置顶级 `bindings[]`，或移到受支持的频道。                                                         |
| `--thread here requires running /acp spawn inside an active ... thread`     | 在线程上下文之外使用了 `--thread here`。                                  | 移到目标线程或使用 `--thread auto`/`off`。                                                                                                              |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 另一个用户拥有活动绑定目标。                                              | 以所有者身份重新绑定或使用不同的对话或线程。                                                                                                            |
| `Thread bindings are unavailable for <channel>.`                            | 适配器缺少线程绑定能力。                                                  | 使用 `--thread off` 或移到受支持的适配器/频道。                                                                                                         |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 运行时在主机端；请求者会话被沙箱隔离。                                | 从沙箱隔离的会话使用 `runtime="subagent"`，或从非沙箱隔离的会话运行 ACP 生成。                                                                          |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | 为 ACP 运行时请求了 `sandbox="require"`。                                 | 对需要沙箱的工作使用 `runtime="subagent"`，或从非沙箱隔离的会话使用带 `sandbox="inherit"` 的 ACP。                                                      |
| `Cannot apply --model ... did not advertise model support`                  | 目标运行时不暴露通用 ACP 模型切换。                                       | 使用通告 ACP `models`/`session/set_model` 的运行时，使用 Codex ACP 模型引用，或者如果运行时有自己的启动标志，直接在运行时中配置模型。                   |
| 绑定会话缺少 ACP 元数据                                                     | 过期/已删除的 ACP 会话元数据。                                            | 用 `/acp spawn` 重新创建，然后重新绑定/聚焦线程。                                                                                                       |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 在非交互式 ACP 会话中阻止写入/执行。                     | 将 `plugins.entries.acpx.config.permissionMode` 设置为 `approve-all` 并重启 Gateway。参见[权限配置](/tools/acp-agents-setup#permission-configuration)。 |
| ACP 会话在输出很少的情况下提前失败                                          | 权限提示被 `permissionMode`/`nonInteractivePermissions` 阻止。            | 检查 Gateway 日志中的 `AcpRuntimeError`。对于完整权限，设置 `permissionMode=approve-all`；对于优雅降级，设置 `nonInteractivePermissions=deny`。         |
| ACP 会话在完成工作后无限期停滞                                              | 运行时进程完成但 ACP 会话未报告完成。                                     | 用 `ps aux \| grep acpx` 监控；手动终止过期进程。                                                                                                       |
| 运行时看到 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`                          | 内部事件信封跨越 ACP 边界泄漏。                                           | 更新 OpenClaw 并重新运行完成流；外部运行时应只接收纯完成提示。                                                                                          |

## 相关

- [ACP 代理 — 设置](/tools/acp-agents-setup)
- [代理发送](/tools/agent-send)
- [CLI 后端](/gateway/cli-backends)
- [Codex 运行时](/plugins/codex-harness)
- [多代理沙箱工具](/tools/multi-agent-sandbox-tools)
- [`openclaw acp`（桥接模式）](/cli/acp)
- [子代理](/tools/subagents)
