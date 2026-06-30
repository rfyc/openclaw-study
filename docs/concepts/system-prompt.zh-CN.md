---
summary: "OpenClaw 系统提示包含的内容以及如何组装"
read_when:
  - 编辑系统提示文本、工具列表或时间/心跳部分
  - 更改工作区引导或技能注入行为
title: "系统提示"
---

OpenClaw 为每次智能体运行构建自定义系统提示。该提示是 **OpenClaw 拥有的**，不使用 pi-coding-agent 默认提示。

提示由 OpenClaw 组装并注入每次智能体运行。

提供商插件可以在不替换完整 OpenClaw 拥有的提示的情况下贡献缓存感知的提示指导。提供商运行时可以：

- 替换一小组命名的核心部分（`interaction_style`、`tool_call_style`、`execution_bias`）
- 在提示缓存边界上方注入**稳定前缀**
- 在提示缓存边界下方注入**动态后缀**

使用提供商拥有的贡献进行模型系列特定的调整。保留旧版 `before_prompt_build` 提示变更以保持兼容性或真正全局的提示变更，而不是正常的提供商行为。

OpenAI GPT-5 系列覆盖层保持核心执行规则小，并为角色锁定、简洁输出、工具规律、并行查找、可交付成果覆盖、验证、缺失上下文和终端工具卫生添加模型特定指导。

## 结构

提示有意紧凑并使用固定部分：

- **工具**：结构化工具真相来源提醒加上运行时工具使用指导。
- **执行偏置**：紧凑的跟进指导：在轮次中对可操作的请求采取行动，持续直到完成或阻塞，从弱工具结果中恢复，实时检查可变状态，并在最终化之前验证。
- **安全**：避免权力寻求行为或绕过监督的简短护栏提醒。
- **技能**（可用时）：告诉模型如何按需加载技能指令。
- **OpenClaw 自更新**：如何使用 `config.schema.lookup` 安全检查配置，使用 `config.patch` 修补配置，使用 `config.apply` 替换完整配置，以及仅在明确用户请求时运行 `update.run`。仅所有者的 `gateway` 工具还拒绝重写 `tools.exec.ask` / `tools.exec.security`，包括标准化到这些受保护 exec 路径的旧版 `tools.bash.*` 别名。
- **工作区**：工作目录（`agents.defaults.workspace`）。
- **文档**：本地 OpenClaw 文档路径（仓库或 npm 包）以及何时阅读它们。
- **工作区文件（已注入）**：指示引导文件包含在下面。
- **沙盒**（启用时）：指示沙盒运行时、沙盒路径以及是否可以使用提升的 exec。
- **当前日期和时间**：用户本地时间、时区和时间格式。
- **回复标签**：支持的提供商的可选回复标签语法。
- **心跳**：心跳提示和确认行为，当为默认智能体启用心跳时。
- **运行时**：主机、OS、node、模型、仓库根（检测到时）、思考级别（一行）。
- **推理**：当前可见级别 + /reasoning 切换提示。

OpenClaw 将大的稳定内容，包括**项目上下文**，保持在内部提示缓存边界上方。易变的频道/会话部分，如控制 UI 嵌入指导、**消息**、**语音**、**群聊上下文**、**反应**、**心跳**和**运行时**，附加在该边界下方，以便具有前缀缓存的本地后端可以跨频道轮次重用稳定的工作区前缀。工具描述同样应避免在可接受的模式已携带该运行时详情时嵌入当前频道名称。

工具部分还包括长时间运行工作的运行时指导：

- 使用 cron 进行未来跟进（`稍后回来查看`、提醒、定期工作），而不是 `exec` 睡眠循环、`yieldMs` 延迟技巧或重复的 `process` 轮询
- 仅将 `exec` / `process` 用于现在启动并在后台继续运行的命令
- 当启用自动完成唤醒时，启动命令一次并在其发出输出或失败时依赖基于推送的唤醒路径
- 当你需要检查运行中的命令时，使用 `process` 查看日志、状态、输入或干预
- 如果任务更大，优先使用 `sessions_spawn`；子智能体完成是基于推送的，并自动向请求者通知
- 不要在循环中轮询 `subagents list` / `sessions_list` 来等待完成

当实验性 `update_plan` 工具启用时，工具还告诉模型仅对非平凡的多步骤工作使用它，保持确切一个 `in_progress` 步骤，并避免在每次更新后重复整个计划。

系统提示中的安全护栏是建议性的。它们指导模型行为，但不强制执行策略。使用工具策略、exec 审批、沙盒和频道允许列表进行硬执行；运营者可以按设计禁用这些。

在具有原生审批卡/按钮的频道上，运行时提示现在告诉智能体首先依赖该原生审批 UI。只有当工具结果表明聊天审批不可用或手动审批是唯一路径时，才应包含手动 `/approve` 命令。

## 提示模式

OpenClaw 可以为子智能体渲染更小的系统提示。运行时为每次运行设置 `promptMode`（不是面向用户的配置）：

- `full`（默认）：包含上面所有部分。
- `minimal`：用于子智能体；省略**技能**、**内存召回**、**OpenClaw 自更新**、**模型别名**、**用户身份**、**回复标签**、**消息**、**静默回复**和**心跳**。工具、**安全**、工作区、沙盒、当前日期和时间（已知时）、运行时和注入的上下文仍然可用。
- `none`：只返回基本身份行。

当 `promptMode=minimal` 时，额外注入的提示被标记为**子智能体上下文**而不是**群聊上下文**。

对于频道自动回复运行，当直接/群聊上下文已经包含解析的对话特定 `NO_REPLY` 行为时，OpenClaw 可以省略通用的**静默回复**部分。这避免了在全局系统提示和频道上下文中都重复令牌机制。

## 提示快照

OpenClaw 在 `test/fixtures/agents/prompt-snapshots/codex-runtime-happy-path/` 下为 Codex 运行时快乐路径保留已提交的提示快照。它们渲染选定的应用服务器线程/轮次参数，加上 Telegram 直接、Discord 群组和心跳轮次的重建模型绑定提示层堆栈。该堆栈包括从 Codex 的模型目录/缓存形状生成的固定 Codex `gpt-5.5` 模型提示夹具、Codex 快乐路径权限开发者文本、OpenClaw 开发者指令、当 OpenClaw 提供时的轮次范围协作模式指令、用户轮次输入，以及对动态工具规格的引用。

使用 `pnpm prompt:snapshots:sync-codex-model` 刷新固定的 Codex 模型提示夹具。默认情况下，脚本在 `$CODEX_HOME/models_cache.json`，然后 `~/.codex/models_cache.json`，然后才回退到维护者 Codex 检出约定 `~/code/codex/codex-rs/models-manager/models.json` 查找 Codex 的运行时缓存。如果这些来源都不存在，命令退出而不更改已提交的夹具。传递 `--catalog <path>` 从特定的 `models_cache.json` 或 `models.json` 文件刷新。

这些快照仍然不是逐字节的原始 OpenAI 请求捕获。Codex 可以在 OpenClaw 发送线程和轮次参数后，在 Codex 运行时内部添加运行时拥有的工作区上下文，如 `AGENTS.md`、环境上下文、内存、应用/插件指令和内置的默认协作模式指令。

使用 `pnpm prompt:snapshots:gen` 重新生成它们，并使用 `pnpm prompt:snapshots:check` 验证漂移。CI 在额外的边界分片中运行漂移检查，以便提示变更和快照更新附加到同一 PR。

## 工作区引导注入

引导文件被裁剪并附加到**项目上下文**下，以便模型无需显式读取就能看到身份和配置文件上下文：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅在全新工作区上）
- 存在时的 `MEMORY.md`

所有这些文件在每次轮次都**注入到上下文窗口**中，除非适用文件特定门控。当为默认智能体禁用心跳或 `agents.defaults.heartbeat.includeSystemPromptSection` 为 false 时，`HEARTBEAT.md` 在普通运行中被省略。保持注入的文件简洁——尤其是 `MEMORY.md`，它可能随时间增长并导致意外的高上下文使用和更频繁的压缩。

当会话在原生 Codex 测试框架上运行时，Codex 通过其自己的项目文档发现加载 `AGENTS.md`。OpenClaw 仍然解析剩余的引导文件并将它们作为 Codex 配置指令转发，因此 `SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 和 `MEMORY.md` 在不重复 `AGENTS.md` 的情况下保持相同的工作区上下文角色。

<Note>
`memory/*.md` 每日文件**不**是正常引导项目上下文的一部分。在普通轮次中，它们通过 `memory_search` 和 `memory_get` 工具按需访问，因此除非模型显式读取它们，否则不计入上下文窗口。裸 `/new` 和 `/reset` 轮次是例外：运行时可以为该第一轮次预置最近的每日内存作为一次性启动上下文块。
</Note>

大文件被截断，带有标记。每文件最大大小由 `agents.defaults.bootstrapMaxChars`（默认：12000）控制。跨文件注入的引导内容总量受 `agents.defaults.bootstrapTotalMaxChars`（默认：60000）限制。缺失的文件注入简短的缺失文件标记。当发生截断时，OpenClaw 可以注入简洁的系统提示警告通知；使用 `agents.defaults.bootstrapPromptTruncationWarning`（`off`、`once`、`always`；默认：`once`）控制。详细的原始/注入计数保留在诊断中，如 `/context`、`/status`、doctor 和日志。

子智能体会话只注入 `AGENTS.md` 和 `TOOLS.md`（其他引导文件被过滤掉以保持子智能体上下文小）。

内部钩子可以通过 `agent:bootstrap` 拦截此步骤以变更或替换注入的引导文件（例如将 `SOUL.md` 换成备用角色）。

如果你想让智能体听起来不那么通用，从 [SOUL.md 个性指南](/concepts/soul) 开始。

要检查每个注入文件贡献了多少（原始与注入、截断，加上工具模式开销），使用 `/context list` 或 `/context detail`。参见[上下文](/concepts/context)。

## 时间处理

当用户时区已知时，系统提示包含专用的**当前日期和时间**部分。为保持提示缓存稳定，它现在只包含**时区**（没有动态时钟或时间格式）。

当智能体需要当前时间时使用 `session_status`；状态卡包含时间戳行。同一工具还可以选择设置每个会话的模型覆盖（`model=default` 清除它）。

配置：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat`（`auto` | `12` | `24`）

有关完整行为详情，请参见[日期和时间](/date-time)。

## 技能

当符合条件的技能存在时，OpenClaw 注入一个紧凑的**可用技能列表**（`formatSkillsForPrompt`），其中包含每个技能的**文件路径**。提示指示模型使用 `read` 在列出的位置（工作区、托管或捆绑）加载 SKILL.md。如果没有符合条件的技能，技能部分被省略。

资格包括技能元数据门控、运行时环境/配置检查以及在配置 `agents.defaults.skills` 或 `agents.list[].skills` 时有效的智能体技能允许列表。

捆绑的插件技能仅在其拥有的插件启用时才符合条件。这让工具插件可以公开更深入的操作指南，而无需将所有这些指导直接嵌入每个工具描述中。

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

这保持基本提示小，同时仍然支持有针对性的技能使用。

技能列表预算由技能子系统拥有：

- 全局默认值：`skills.limits.maxSkillsPromptChars`
- 每个智能体覆盖：`agents.list[].skillsLimits.maxSkillsPromptChars`

通用有界运行时摘录使用不同的面：

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

这种分割使技能大小与运行时读取/注入大小（如 `memory_get`、实时工具结果和压缩后 AGENTS.md 刷新）分开。

## 文档

系统提示包含**文档**部分。当本地文档可用时，它指向本地 OpenClaw 文档目录（Git 检出中的 `docs/` 或捆绑的 npm 包文档）。如果本地文档不可用，它回退到 [https://docs.openclaw.ai](https://docs.openclaw.ai)。

同一部分还包含 OpenClaw 源位置。Git 检出公开本地源根，以便智能体可以直接检查代码。包安装包括 GitHub 源 URL，并告诉智能体在文档不完整或过时时在那里审查源。提示还提到公共文档镜像、社区 Discord 和 ClawHub（[https://clawhub.ai](https://clawhub.ai)）用于技能发现。它告诉模型首先查阅文档以获取 OpenClaw 行为、命令、配置或架构，并在可能时自行运行 `openclaw status`（仅在缺乏访问权限时询问用户）。对于配置，它将智能体指向 `gateway` 工具操作 `config.schema.lookup` 获取确切的字段级文档和约束，然后指向 `docs/gateway/configuration.md` 和 `docs/gateway/configuration-reference.md` 获取更广泛的指导。

## 相关

- [智能体运行时](/concepts/agent)
- [智能体工作区](/concepts/agent-workspace)
- [上下文引擎](/concepts/context-engine)
