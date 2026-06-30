---
summary: "上下文：模型看到什么、如何构建，以及如何检查"
read_when:
  - 你想了解 OpenClaw 中"上下文"的含义
  - 你正在调试为什么模型"知道"某事（或忘记了它）
  - 你想减少上下文开销（/context、/status、/compact）
title: "上下文"
---

"上下文"是 **OpenClaw 在一次运行中发送给模型的一切**。它受模型**上下文窗口**（令牌限制）的约束。

入门心智模型：

- **系统提示**（OpenClaw 构建的）：规则、工具、技能列表、时间/运行时，以及注入的工作区文件。
- **对话历史**：你的消息 + 助手在此会话中的消息。
- **工具调用/结果 + 附件**：命令输出、文件读取、图像/音频等。

上下文与"记忆"_不是同一回事_：记忆可以存储在磁盘上并在之后重新加载；上下文是模型当前窗口中的内容。

## 快速开始（检查上下文）

- `/status` → 快速"我的窗口有多满？"视图 + 会话设置。
- `/context list` → 已注入的内容 + 大致大小（每个文件 + 总计）。
- `/context detail` → 更深入的分解：每个文件、每个工具模式大小、每个技能条目大小，以及系统提示大小。
- `/usage tokens` → 向普通回复附加每次回复的用量脚注。
- `/compact` → 将旧历史压缩为紧凑条目以释放窗口空间。

另请参见：[斜线命令](/tools/slash-commands)、[令牌使用和成本](/reference/token-use)、[压缩](/concepts/compaction)。

## 示例输出

值因模型、提供商、工具策略和工作区内容而异。

### `/context list`

```
🧠 Context breakdown
Workspace: <workspaceDir>
Bootstrap max/file: 12,000 chars
Sandbox: mode=non-main sandboxed=false
System prompt (run): 38,412 chars (~9,603 tok) (Project Context 23,901 chars (~5,976 tok))

Injected workspace files:
- AGENTS.md: OK | raw 1,742 chars (~436 tok) | injected 1,742 chars (~436 tok)
- SOUL.md: OK | raw 912 chars (~228 tok) | injected 912 chars (~228 tok)
- TOOLS.md: TRUNCATED | raw 54,210 chars (~13,553 tok) | injected 20,962 chars (~5,241 tok)
- IDENTITY.md: OK | raw 211 chars (~53 tok) | injected 211 chars (~53 tok)
- USER.md: OK | raw 388 chars (~97 tok) | injected 388 chars (~97 tok)
- HEARTBEAT.md: MISSING | raw 0 | injected 0
- BOOTSTRAP.md: OK | raw 0 chars (~0 tok) | injected 0 chars (~0 tok)

Skills list (system prompt text): 2,184 chars (~546 tok) (12 skills)
Tools: read, edit, write, exec, process, browser, message, sessions_send, …
Tool list (system prompt text): 1,032 chars (~258 tok)
Tool schemas (JSON): 31,988 chars (~7,997 tok) (counts toward context; not shown as text)
Tools: (same as above)

Session tokens (cached): 14,250 total / ctx=32,000
```

### `/context detail`

```
🧠 Context breakdown (detailed)
…
Top skills (prompt entry size):
- frontend-design: 412 chars (~103 tok)
- oracle: 401 chars (~101 tok)
… (+10 more skills)

Top tools (schema size):
- browser: 9,812 chars (~2,453 tok)
- exec: 6,240 chars (~1,560 tok)
… (+N more tools)
```

## 什么计入上下文窗口

模型接收的所有内容都计算在内，包括：

- 系统提示（所有段落）。
- 对话历史。
- 工具调用 + 工具结果。
- 附件/记录（图像/音频/文件）。
- 压缩摘要和修剪产物。
- 提供商"包装器"或隐藏头部（不可见，但仍然计算）。

## OpenClaw 如何构建系统提示

系统提示是 **OpenClaw 拥有的**，每次运行时重建。它包括：

- 工具列表 + 简短描述。
- 技能列表（仅元数据；见下文）。
- 工作区位置。
- 时间（UTC + 如果已配置，则转换为用户时间）。
- 运行时元数据（主机/OS/模型/思考）。
- 在**项目上下文**下注入的工作区启动文件。

完整分解：[系统提示](/concepts/system-prompt)。

## 注入的工作区文件（项目上下文）

默认情况下，OpenClaw 注入一组固定的工作区文件（如果存在）：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅首次运行）

使用 `agents.defaults.bootstrapMaxChars`（默认 `12000` 字符）按文件截断大型文件。OpenClaw 还使用 `agents.defaults.bootstrapTotalMaxChars`（默认 `60000` 字符）跨文件强制执行总启动注入上限。`/context` 显示**原始 vs 注入**大小以及是否发生了截断。

当发生截断时，运行时可以在项目上下文下注入提示内警告块。使用 `agents.defaults.bootstrapPromptTruncationWarning`（`off`、`once`、`always`；默认 `once`）配置此项。

## 技能：注入 vs 按需加载

系统提示包含一个紧凑的**技能列表**（名称 + 描述 + 位置）。这个列表有实际开销。

默认情况下**不**包含技能指令。模型只有在需要时才被期望 `read` 技能的 `SKILL.md`。

## 工具：有两种成本

工具以两种方式影响上下文：

1. 系统提示中的**工具列表文本**（你看到的"工具"部分）。
2. **工具模式**（JSON）。这些发送给模型以便它可以调用工具。即使你看不到它们的纯文本，它们也会计入上下文。

`/context detail` 分解最大的工具模式，这样你就可以看到什么占主导。

## 命令、指令和"内联快捷方式"

斜线命令由网关处理。有几种不同的行为：

- **独立命令**：只有 `/...` 的消息作为命令运行。
- **指令**：`/think`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/model`、`/queue` 在模型看到消息之前被剥离。
  - 仅指令消息持久化会话设置。
  - 普通消息中的内联指令作为每条消息的提示。
- **内联快捷方式**（仅白名单发送者）：普通消息中的某些 `/...` 令牌可以立即运行（示例："hey /status"），并在模型看到剩余文本之前被剥离。

详情：[斜线命令](/tools/slash-commands)。

## 会话、压缩和修剪（什么会持久化）

跨消息持久化的内容取决于机制：

- **普通历史**在会话记录中持久化，直到被策略压缩/修剪。
- **压缩**将摘要持久化到记录中，并保持最近消息完整。
- **修剪**从*内存*提示中删除旧工具结果以释放上下文窗口空间，但不重写会话记录——完整历史仍然可以在磁盘上检查。

文档：[会话](/concepts/session)、[压缩](/concepts/compaction)、[会话修剪](/concepts/session-pruning)。

默认情况下，OpenClaw 使用内置的 `legacy` 上下文引擎进行组装和压缩。如果你安装了提供 `kind: "context-engine"` 的插件并用 `plugins.slots.contextEngine` 选择它，OpenClaw 会将上下文组装、`/compact` 和相关子智能体上下文生命周期钩子委托给该引擎。`ownsCompaction: false` 不会自动回退到遗留引擎；活跃引擎仍然必须正确实现 `compact()`。参见[上下文引擎](/concepts/context-engine)了解完整的可插拔接口、生命周期钩子和配置。

## `/context` 实际报告的内容

`/context` 在可用时优先选择最新的**运行构建**的系统提示报告：

- `System prompt (run)` = 从最后一次嵌入式（支持工具的）运行中捕获，并持久化在会话存储中。
- `System prompt (estimate)` = 当不存在运行报告时（或通过不生成报告的 CLI 后端运行时）即时计算。

无论哪种方式，它都报告大小和主要贡献者；它**不**转储完整的系统提示或工具模式。

## 相关

- [上下文引擎](/concepts/context-engine) — 通过插件自定义上下文注入
- [压缩](/concepts/compaction) — 压缩长对话
- [系统提示](/concepts/system-prompt) — 如何构建系统提示
- [智能体循环](/concepts/agent-loop) — 完整的智能体执行周期
