---
summary: "Agent 运行时、工作空间契约与会话引导"
read_when:
  - 修改 agent 运行时、工作空间引导或会话行为时
title: "Agent 运行时"
---

OpenClaw 运行一个**单一嵌入式 agent 运行时** —— 每个 Gateway 一个 agent 进程，拥有自己的工作空间、引导文件和会话存储。本页介绍该运行时契约：工作空间必须包含哪些内容、哪些文件会被注入，以及会话如何针对它进行引导。

## 工作空间（必需）

OpenClaw 使用单一 agent 工作空间目录（`agents.defaults.workspace`）作为 agent 的**唯一**工作目录（`cwd`），供工具和上下文使用。

推荐做法：如果 `~/.openclaw/openclaw.json` 不存在，使用 `openclaw setup` 创建并初始化工作空间文件。

完整工作空间布局及备份指南：[Agent 工作空间](/concepts/agent-workspace)

如果启用了 `agents.defaults.sandbox`，非主会话可以在 `agents.defaults.sandbox.workspaceRoot` 下使用各自的会话工作空间（详见 [Gateway 配置](/gateway/configuration)）。

## 引导文件（注入式）

在 `agents.defaults.workspace` 内部，OpenClaw 期望存在以下用户可编辑的文件：

- `AGENTS.md` —— 操作指令 + "记忆"
- `SOUL.md` —— 人格、边界、语气
- `TOOLS.md` —— 用户维护的工具说明（例如 `imsg`、`sag`、使用约定）
- `BOOTSTRAP.md` —— 一次性首次运行仪式（完成后删除）
- `IDENTITY.md` —— agent 名称/风格/emoji
- `USER.md` —— 用户画像 + 首选称呼

在新会话的第一轮，OpenClaw 将这些文件的内容注入系统提示词的"项目上下文"部分。

空白文件会被跳过。大文件会被裁剪和截断，并附带标记，以保持提示词精简（读取完整内容请使用 read 工具）。

如果某个文件缺失，OpenClaw 会注入一行"文件缺失"标记（`openclaw setup` 会创建安全的默认模板）。

`BOOTSTRAP.md` 仅在**全新工作空间**（无其他引导文件）时创建。在其待处理期间，OpenClaw 将其保留在项目上下文中，并在系统提示词中添加初次仪式引导，而不是将其复制到用户消息中。如果你在完成仪式后将其删除，后续重启时不应被重新创建。

如需完全禁用引导文件创建（适用于预填充的工作空间），请设置：

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## 内置工具

核心工具（read/exec/edit/write 及相关系统工具）始终可用，受工具策略约束。`apply_patch` 是可选工具，由 `tools.exec.applyPatch` 控制。`TOOLS.md` **不**控制工具的存在与否；它只是关于*你*希望如何使用这些工具的指导说明。

## 技能（Skills）

OpenClaw 从以下位置加载技能（优先级从高到低）：

- 工作空间：`<workspace>/skills`
- 项目 agent 技能：`<workspace>/.agents/skills`
- 个人 agent 技能：`~/.agents/skills`
- 托管/本地：`~/.openclaw/skills`
- 内置（随安装一起提供）
- 额外技能目录：`skills.load.extraDirs`

技能可通过 config/env 进行条件控制（详见 [Gateway 配置](/gateway/configuration) 中的 `skills`）。

## 运行时边界

嵌入式 agent 运行时基于 Pi agent 核心（模型、工具和提示词管道）构建。会话管理、服务发现、工具接线和渠道交付是 OpenClaw 在此核心之上的自有层。

## 会话

会话记录以 JSONL 格式存储于：

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

会话 ID 由 OpenClaw 选定且保持稳定。来自其他工具的旧版会话文件夹不会被读取。

## 流式过程中的引导

当队列模式为 `steer` 时，入站消息会被注入到当前运行中。排队的引导消息在**当前助手轮次完成其工具调用之后**、下一次 LLM 调用之前交付。Pi 会一次性排空所有待处理的引导消息；旧版 `queue` 模式每次模型边界只排空一条消息。引导操作不再跳过当前助手消息中剩余的工具调用。

当队列模式为 `followup` 或 `collect` 时，入站消息会被保留直到当前轮次结束，然后以排队的内容启动新的 agent 轮次。详见 [队列](/concepts/queue) 和 [引导队列](/concepts/queue-steering) 了解模式和边界行为。

块流式（Block streaming）会在助手块完成后立即发送；默认**关闭**（`agents.defaults.blockStreamingDefault: "off"`）。通过 `agents.defaults.blockStreamingBreak` 调整边界（`text_end` vs `message_end`；默认为 `text_end`）。通过 `agents.defaults.blockStreamingChunk` 控制软块分割（默认 800~1200 字符；优先段落换行，其次换行符，最后句子）。通过 `agents.defaults.blockStreamingCoalesce` 合并流式块以减少单行刷屏（基于空闲时间的发送前合并）。非 Telegram 渠道需要显式设置 `*.blockStreaming: true` 才能启用块回复。详细说明：[流式传输与分块](/concepts/streaming)。

## 模型引用

配置中的模型引用（例如 `agents.defaults.model` 和 `agents.defaults.models`）通过拆分**第一个** `/` 来解析。

- 配置模型时使用 `provider/model` 格式。
- 如果模型 ID 本身包含 `/`（OpenRouter 风格），请包含 provider 前缀（例如 `openrouter/moonshotai/kimi-k2`）。
- 如果省略 provider，OpenClaw 会先尝试别名，再进行唯一已配置 provider 的精确模型 ID 匹配，最后才回退到已配置的默认 provider。如果该 provider 不再提供已配置的默认模型，OpenClaw 会回退到第一个已配置的 provider/model，而不是暴露过时的已删除 provider 默认值。

## 配置（最小必需）

至少需要设置：

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom`（强烈推荐）

---

_下一篇：[群组聊天](/channels/group-messages)_ 🦞

## 相关文档

- [Agent 工作空间](/concepts/agent-workspace)
- [多 agent 路由](/concepts/multi-agent)
- [会话管理](/concepts/session)
