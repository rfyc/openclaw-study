---
summary: "Slash 命令：文本与原生、配置和支持的命令"
read_when:
  - 使用或配置聊天命令
  - 调试命令路由或权限
title: "Slash 命令"
sidebarTitle: "Slash 命令"
---

命令由 Gateway 处理。大多数命令必须以**独立**消息形式发送，以 `/` 开头。仅限主机的 bash 聊天命令使用 `! <cmd>`（`/bash <cmd>` 作为别名）。

当对话或线程绑定到 ACP 会话时，正常的后续文本路由到该 ACP 工具。Gateway 管理命令仍保持本地：`/acp ...` 始终到达 OpenClaw ACP 命令处理器，`/status` 加 `/unfocus` 在启用了命令处理的界面上保持本地。

有两个相关系统：

<AccordionGroup>
  <Accordion title="命令">
    独立的 `/...` 消息。
  </Accordion>
  <Accordion title="指令">
    `/think`、`/fast`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。

    - 指令在模型看到消息之前从消息中剥离。
    - 在正常聊天消息（非仅指令）中，它们被视为"内联提示"，**不**持久化会话设置。
    - 在仅指令消息（消息只包含指令）中，它们持久化到会话并回复确认。
    - 指令仅对**授权发送者**有效。如果设置了 `commands.allowFrom`，它是唯一使用的允许列表；否则授权来自频道允许列表/配对加 `commands.useAccessGroups`。未授权的发送者看到指令被当作普通文本处理。

  </Accordion>
  <Accordion title="内联快捷方式">
    仅限允许列表/授权发送者：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。

    它们立即运行，在模型看到消息之前被剥离，剩余文本继续正常流程。

  </Accordion>
</AccordionGroup>

## 配置

```json5
{
  commands: {
    native: "auto",
    nativeSkills: "auto",
    text: true,
    bash: false,
    bashForegroundMs: 2000,
    config: false,
    mcp: false,
    plugins: false,
    debug: false,
    restart: true,
    ownerAllowFrom: ["discord:123456789012345678"],
    ownerDisplay: "raw",
    ownerDisplaySecret: "${OWNER_ID_HASH_SECRET}",
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

<ParamField path="commands.text" type="boolean" default="true">
  启用在聊天消息中解析 `/...`。在没有原生命令的界面（WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams）上，即使你将此设置为 `false`，文本命令也能工作。
</ParamField>
<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  注册原生命令。Auto：Discord/Telegram 开启；Slack 关闭（直到你添加 slash 命令）；不支持原生支持的提供商忽略。设置 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 覆盖每个提供商（布尔值或 `"auto"`）。在 Discord 上，`false` 在启动时跳过 slash 命令注册和清理；之前注册的命令可能在你从 Discord 应用中删除它们之前仍然可见。Slack 命令在 Slack 应用中管理，不会自动删除。
</ParamField>
在 Discord 上，原生命令规范可以包含 `descriptionLocalizations`，OpenClaw 将其作为 Discord `description_localizations` 发布并包含在对比比较中。
<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  支持时原生注册**技能**命令。Auto：Discord/Telegram 开启；Slack 关闭（Slack 需要为每个技能创建一个 slash 命令）。设置 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 覆盖每个提供商（布尔值或 `"auto"`）。
</ParamField>
<ParamField path="commands.bash" type="boolean" default="false">
  启用 `! <cmd>` 运行主机 shell 命令（`/bash <cmd>` 是别名；需要 `tools.elevated` 允许列表）。
</ParamField>
<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  控制 bash 在切换到后台模式之前等待多久（`0` 立即后台）。
</ParamField>
<ParamField path="commands.config" type="boolean" default="false">
  启用 `/config`（读/写 `openclaw.json`）。
</ParamField>
<ParamField path="commands.mcp" type="boolean" default="false">
  启用 `/mcp`（读/写 `mcp.servers` 下 OpenClaw 管理的 MCP 配置）。
</ParamField>
<ParamField path="commands.plugins" type="boolean" default="false">
  启用 `/plugins`（插件发现/状态加安装 + 启用/禁用控制）。
</ParamField>
<ParamField path="commands.debug" type="boolean" default="false">
  启用 `/debug`（仅运行时覆盖）。
</ParamField>
<ParamField path="commands.restart" type="boolean" default="true">
  启用 `/restart` 加 gateway 重启工具操作。
</ParamField>
<ParamField path="commands.ownerAllowFrom" type="string[]">
  为仅限所有者的命令/工具界面设置显式所有者允许列表。这是可以批准危险操作并运行 `/diagnostics`、`/export-trajectory` 和 `/config` 等命令的人工操作者账户。它与 `commands.allowFrom` 和 DM 配对访问分开。
</ParamField>
<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  每频道：使仅限所有者的命令需要**所有者身份**才能在该界面上运行。为 `true` 时，发送者必须与已解析的所有者候选人（例如 `commands.ownerAllowFrom` 中的条目或提供商原生所有者元数据）匹配，或在内部消息频道上持有内部 `operator.admin` 范围。频道 `allowFrom` 中的通配符条目，或空/未解析的所有者候选人列表，**不**足够——仅限所有者的命令在该频道上关闭失败。如果你只想通过 `ownerAllowFrom` 和标准命令允许列表对仅限所有者的命令进行门控，请保持此选项关闭。
</ParamField>
<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  控制所有者 id 在系统提示中的显示方式。
</ParamField>
<ParamField path="commands.ownerDisplaySecret" type="string">
  可选地设置当 `commands.ownerDisplay="hash"` 时使用的 HMAC 密钥。
</ParamField>
<ParamField path="commands.allowFrom" type="object">
  命令授权的每提供商允许列表。配置后，它是命令和指令的唯一授权来源（频道允许列表/配对和 `commands.useAccessGroups` 被忽略）。使用 `"*"` 作为全局默认值；提供商特定键覆盖它。
</ParamField>
<ParamField path="commands.useAccessGroups" type="boolean" default="true">
  当未设置 `commands.allowFrom` 时对命令强制执行允许列表/策略。
</ParamField>

## 命令列表

当前权威来源：

- 核心内置命令来自 `src/auto-reply/commands-registry.shared.ts`
- 生成的 dock 命令来自 `src/auto-reply/commands-registry.data.ts`
- 插件命令来自插件 `registerCommand()` 调用
- 你的 gateway 上的实际可用性仍取决于配置标志、频道界面和已安装/启用的插件

### 核心内置命令

<AccordionGroup>
  <Accordion title="会话和运行">
    - `/new [model]` 开始新会话；`/reset` 是重置别名。
    - Control UI 拦截键入的 `/new` 以创建并切换到新的仪表板会话；键入的 `/reset` 仍然运行 Gateway 的原地重置。
    - `/reset soft [message]` 保留当前转录，删除重用的 CLI 后端会话 id，并原地重新运行启动/系统提示加载。
    - `/compact [instructions]` 压缩会话上下文。参阅[压缩](/concepts/compaction)。
    - `/stop` 中止当前运行。
    - `/session idle <duration|off>` 和 `/session max-age <duration|off>` 管理线程绑定过期。
    - `/export-session [path]` 将当前会话导出为 HTML。别名：`/export`。
    - `/export-trajectory [path]` 请求 exec 批准，然后为当前会话导出 JSONL [轨迹束](/tools/trajectory)。在群聊中，批准提示和导出结果私下发送给所有者。别名：`/trajectory`。

  </Accordion>
  <Accordion title="模型和运行控制">
    - `/think <level>` 设置思考级别。选项来自活动模型的提供商配置文件；常见级别为 `off`、`minimal`、`low`、`medium` 和 `high`，自定义级别如 `xhigh`、`adaptive`、`max` 或仅在支持的地方使用二进制 `on`。别名：`/thinking`、`/t`。
    - `/verbose on|off|full` 切换详细输出。别名：`/v`。
    - `/trace on|off` 切换当前会话的插件跟踪输出。
    - `/fast [status|on|off]` 显示或设置快速模式。
    - `/reasoning [on|off|stream]` 切换推理可见性。别名：`/reason`。
    - `/elevated [on|off|ask|full]` 切换提升模式。别名：`/elev`。
    - `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` 显示或设置 exec 默认值。
    - `/model [name|#|status]` 显示或设置模型。
    - `/models [provider] [page] [limit=<n>|size=<n>|all]` 列出已配置/已认证可用的提供商或提供商的模型；添加 `all` 浏览该提供商的完整目录。
    - `/queue <mode>` 管理队列行为（`steer`、旧版 `queue`、`followup`、`collect`、`steer-backlog`、`interrupt`）加上选项如 `debounce:0.5s cap:25 drop:summarize`；`/queue default` 或 `/queue reset` 清除会话覆盖。参阅[命令队列](/concepts/queue)和[引导队列](/concepts/queue-steering)。
    - `/steer <message>` 将指导注入当前会话的活动运行，独立于 `/queue` 模式。当会话空闲时不启动新运行。别名：`/tell`。参阅 [Steer](/tools/steer)。

  </Accordion>
  <Accordion title="发现和状态">
    - `/help` 显示简短帮助摘要。
    - `/commands` 显示生成的命令目录。
    - `/tools [compact|verbose]` 显示当前代理现在可以使用什么。
    - `/status` 显示执行/运行时状态，包括 `Execution`/`Runtime` 标签和可用时的提供商使用情况/配额。
    - `/diagnostics [note]` 是 Gateway 错误和 Codex 工具运行的仅所有者支持报告流程。每次运行前都需要明确的 exec 批准，然后才运行 `openclaw gateway diagnostics export --json`；不要使用允许全部规则批准诊断。批准后，它发送一个包含本地包路径、清单摘要、隐私说明和相关会话 id 的可粘贴报告。在群聊中，批准提示和报告私下发送给所有者。参阅[诊断导出](/gateway/diagnostics)。
    - `/crestodian <request>` 从所有者 DM 运行 Crestodian 设置和修复助手。
    - `/tasks` 列出当前会话的活动/最近后台任务。
    - `/context [list|detail|json]` 解释上下文如何组装。
    - `/whoami` 显示你的发送者 id。别名：`/id`。
    - `/usage off|tokens|full|cost` 控制每响应使用情况页脚或打印本地成本摘要。

  </Accordion>
  <Accordion title="技能、允许列表、批准">
    - `/skill <name> [input]` 按名称运行技能。
    - `/allowlist [list|add|remove] ...` 管理允许列表条目。仅文本。
    - `/approve <id> <decision>` 解决 exec 批准提示。
    - `/btw <question>` 提出不改变未来会话上下文的旁问。别名：`/side`。参阅 [BTW](/tools/btw)。

  </Accordion>
  <Accordion title="子代理和 ACP">
    - `/subagents list|kill|log|info|send|steer|spawn` 管理当前会话的子代理运行。
    - `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` 管理 ACP 会话和运行时选项。
    - `/focus <target>` 将当前 Discord 线程或 Telegram 主题/对话绑定到会话目标。
    - `/unfocus` 移除当前绑定。
    - `/agents` 列出当前会话的线程绑定代理。
    - `/kill <id|#|all>` 中止一个或所有运行中的子代理。
    - `/subagents steer <id|#> <message>` 向运行中的子代理发送引导。参阅 [Steer](/tools/steer)。

  </Accordion>
  <Accordion title="仅所有者写入和管理">
    - `/config show|get|set|unset` 读取或写入 `openclaw.json`。仅所有者。需要 `commands.config: true`。
    - `/mcp show|get|set|unset` 在 `mcp.servers` 下读取或写入 OpenClaw 管理的 MCP 服务器配置。仅所有者。需要 `commands.mcp: true`。
    - `/plugins list|inspect|show|get|install|enable|disable` 检查或改变插件状态。`/plugin` 是别名。写入仅限所有者。需要 `commands.plugins: true`。
    - `/debug show|set|unset|reset` 管理仅运行时的配置覆盖。仅所有者。需要 `commands.debug: true`。
    - `/restart` 在启用时重启 OpenClaw。默认：启用；设置 `commands.restart: false` 禁用它。
    - `/send on|off|inherit` 设置发送策略。仅所有者。

  </Accordion>
  <Accordion title="语音、TTS、频道控制">
    - `/tts on|off|status|chat|latest|provider|limit|summary|audio|help` 控制 TTS。参阅 [TTS](/tools/tts)。
    - `/activation mention|always` 设置群组激活模式。
    - `/bash <command>` 运行主机 shell 命令。仅文本。别名：`! <command>`。需要 `commands.bash: true` 加 `tools.elevated` 允许列表。
    - `!poll [sessionId]` 检查后台 bash 作业。
    - `!stop [sessionId]` 停止后台 bash 作业。

  </Accordion>
</AccordionGroup>

### 生成的 dock 命令

Dock 命令将当前会话的回复路由切换到另一个链接的频道。参阅[频道 docking](/concepts/channel-docking)了解设置、示例和故障排除。

Dock 命令由支持原生命令的频道插件生成。当前内置集：

- `/dock-discord`（别名：`/dock_discord`）
- `/dock-mattermost`（别名：`/dock_mattermost`）
- `/dock-slack`（别名：`/dock_slack`）
- `/dock-telegram`（别名：`/dock_telegram`）

从直接聊天使用 dock 命令将当前会话的回复路由切换到另一个链接的频道。代理保持相同的会话上下文，但该会话的未来回复将传递到所选的频道对等点。

Dock 命令需要 `session.identityLinks`。源发送者和目标对等点必须在同一身份组中，例如 `["telegram:123", "discord:456"]`。如果 id 为 `123` 的 Telegram 用户发送 `/dock_discord`，OpenClaw 在活动会话上存储 `lastChannel: "discord"` 和 `lastTo: "456"`。如果发送者未链接到 Discord 对等点，命令回复设置提示而非透传到正常聊天。

Docking 仅更改活动会话路由。它不创建频道账户、授予访问权限、绕过频道允许列表或将转录历史移动到另一个会话。使用 `/dock-telegram`、`/dock-slack`、`/dock-mattermost` 或另一个生成的 dock 命令再次切换路由。

### 内置插件命令

内置插件可以添加更多 slash 命令。此仓库中当前内置命令：

- `/dreaming [on|off|status|help]` 切换记忆梦境。参阅[梦境](/concepts/dreaming)。
- `/pair [qr|status|pending|approve|cleanup|notify]` 管理设备配对/设置流程。参阅[配对](/channels/pairing)。
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` 临时激活高风险电话节点命令。
- `/voice status|list [limit]|set <voiceId|name>` 管理 Talk 语音配置。在 Discord 上，原生命令名称为 `/talkvoice`。
- `/card ...` 发送 LINE 富卡预设。参阅 [LINE](/channels/line)。
- `/codex status|models|threads|resume|compact|review|diagnostics|account|mcp|skills` 检查并控制内置 Codex 应用服务器工具。参阅 [Codex 工具](/plugins/codex-harness)。
- 仅限 QQBot 的命令：
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### 动态技能命令

用户可调用的技能也作为 slash 命令暴露：

- `/skill <name> [input]` 始终作为通用入口点工作。
- 技能可能也作为直接命令出现，如当技能/插件注册它们时的 `/prose`。
- 原生技能命令注册由 `commands.nativeSkills` 和 `channels.<provider>.commands.nativeSkills` 控制。
- 命令规范可以为支持本地化描述的原生界面提供 `descriptionLocalizations`，包括 Discord。

<AccordionGroup>
  <Accordion title="参数和解析器说明">
    - 命令接受命令和参数之间的可选 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
    - `/new <model>` 接受模型别名、`provider/model` 或提供商名称（模糊匹配）；如果没有匹配，文本被视为消息体。
    - 对于完整的提供商使用情况明细，使用 `openclaw status --usage`。
    - `/allowlist add|remove` 需要 `commands.config=true` 并遵循频道 `configWrites`。
    - 在多账户频道中，配置目标的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也遵循目标账户的 `configWrites`。
    - `/usage` 控制每响应使用情况页脚；`/usage cost` 从 OpenClaw 会话日志打印本地成本摘要。
    - `/restart` 默认启用；设置 `commands.restart: false` 禁用它。
    - `/plugins install <spec>` 接受与 `openclaw plugins install` 相同的插件规范：本地路径/存档、npm 包、`git:<repo>` 或 `clawhub:<pkg>`，然后请求 Gateway 重启，因为插件源模块已更改。
    - `/plugins enable|disable` 更新插件配置并为新代理轮次触发 Gateway 插件重新加载。

  </Accordion>
  <Accordion title="特定频道行为">
    - 仅限 Discord 的原生命令：`/vc join|leave|status` 控制语音频道（不作为文本使用）。`join` 需要服务器和选定的语音/舞台频道。需要 `channels.discord.voice` 和原生命令。
    - Discord 线程绑定命令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要启用有效的线程绑定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
    - ACP 命令参考和运行时行为：[ACP 代理](/tools/acp-agents)。

  </Accordion>
  <Accordion title="Verbose / trace / fast / reasoning 安全性">
    - `/verbose` 用于调试和额外可见性；正常使用时保持**关闭**。
    - `/trace` 比 `/verbose` 更窄：它只显示插件拥有的 trace/debug 行，并保持正常详细工具噪声关闭。
    - `/fast on|off` 持久化会话覆盖。使用会话 UI `inherit` 选项清除它并回退到配置默认值。
    - `/fast` 是特定于提供商的：OpenAI/OpenAI Codex 在原生 Responses 端点上将其映射到 `service_tier=priority`，而直接公共 Anthropic 请求，包括发送到 `api.anthropic.com` 的 OAuth 认证流量，将其映射到 `service_tier=auto` 或 `standard_only`。参阅 [OpenAI](/providers/openai) 和 [Anthropic](/providers/anthropic)。
    - 工具失败摘要在相关时仍然显示，但仅当 `/verbose` 为 `on` 或 `full` 时才包含详细失败文本。
    - 在群组设置中 `/reasoning`、`/verbose` 和 `/trace` 有风险：它们可能暴露你不打算暴露的内部推理、工具输出或插件诊断。建议保持关闭，尤其是在群聊中。

  </Accordion>
  <Accordion title="模型切换">
    - `/model` 立即持久化新的会话模型。
    - 如果代理空闲，下一次运行立即使用它。
    - 如果运行已经活跃，OpenClaw 将实时切换标记为待处理，并仅在干净的重试点重新启动到新模型。
    - 如果工具活动或回复输出已经开始，待处理切换可以一直排队等到稍后的重试机会或下一个用户轮次。
    - 在本地 TUI 中，`/crestodian [request]` 从正常代理 TUI 返回到 Crestodian。这与消息频道救援模式不同，不授予远程配置权限。

  </Accordion>
  <Accordion title="快速路径和内联快捷方式">
    - **快速路径：**来自允许列表发送者的仅命令消息立即处理（绕过队列 + 模型）。
    - **群组提及门控：**来自允许列表发送者的仅命令消息绕过提及要求。
    - **内联快捷方式（仅限允许列表发送者）：**某些命令在嵌入正常消息时也有效，在模型看到剩余文本之前被剥离。
      - 示例：`hey /status` 触发状态回复，剩余文本继续正常流程。
    - 当前：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
    - 未授权的仅命令消息被静默忽略，内联 `/...` 标记被视为普通文本。

  </Accordion>
  <Accordion title="技能命令和原生参数">
    - **技能命令：**`user-invocable` 技能作为 slash 命令暴露。名称被清理为 `a-z0-9_`（最多 32 个字符）；冲突获得数字后缀（例如 `_2`）。
      - `/skill <name> [input]` 按名称运行技能（当原生命令限制阻止每技能命令时很有用）。
      - 默认情况下，技能命令作为正常请求转发到模型。
      - 技能可以选择性地声明 `command-dispatch: tool` 以将命令直接路由到工具（确定性，无模型）。
      - 示例：`/prose`（OpenProse 插件）——参阅 [OpenProse](/prose)。
    - **原生命令参数：**Discord 使用自动完成进行动态选项（以及当你省略必填参数时使用按钮菜单）。当命令支持选择且你省略参数时，Telegram 和 Slack 显示按钮菜单。动态选择根据目标会话模型解析，因此模型特定选项（如 `/think` 级别）遵循该会话的 `/model` 覆盖。

  </Accordion>
</AccordionGroup>

## `/tools`

`/tools` 回答一个运行时问题，而非配置问题：**此代理现在在此对话中可以使用什么**。

- 默认 `/tools` 紧凑且针对快速扫描进行了优化。
- `/tools verbose` 添加简短描述。
- 支持参数的原生命令界面暴露相同的 `compact|verbose` 模式切换。
- 结果是会话范围的，因此更改代理、频道、线程、发送者授权或模型可以更改输出。
- `/tools` 包括在运行时实际可访问的工具，包括核心工具、已连接插件工具和频道拥有的工具。

对于配置文件和覆盖编辑，使用 Control UI Tools 面板或配置/目录界面，而非将 `/tools` 视为静态目录。

## 使用界面（什么显示在哪里）

- **提供商使用情况/配额**（示例："Claude 80% left"）在启用使用情况跟踪时显示在当前模型提供商的 `/status` 中。OpenClaw 将提供商窗口归一化为 `% left`；对于 MiniMax，剩余百分比字段在显示前被反转，`model_remains` 响应优先选择聊天模型条目加上模型标记的计划标签。
- `/status` 中的**Token/缓存行**在实时会话快照稀少时可以回退到最新的转录使用条目。现有的非零实时值仍然胜出，转录回退也可以在存储总数缺失或更小时恢复活动运行时模型标签加上更大的面向提示的总数。
- **执行与运行时：**`/status` 报告 `Execution` 用于有效沙盒路径，`Runtime` 用于实际运行会话的人：`OpenClaw Pi Default`、`OpenAI Codex`、CLI 后端或 ACP 后端。
- **每响应 token/成本**由 `/usage off|tokens|full` 控制（附加到正常回复）。
- `/model status` 是关于**模型/认证/端点**的，而非使用情况。

## 模型选择（`/model`）

`/model` 作为指令实现。

示例：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model opus@anthropic:default
/model status
```

说明：

- `/model` 和 `/model list` 显示紧凑、编号的选择器（模型系列 + 可用提供商）。
- 在 Discord 上，`/model` 和 `/models` 打开带有提供商和模型下拉菜单加提交步骤的交互选择器。
- `/model <#>` 从该选择器中选择（尽可能优先选择当前提供商）。
- `/model status` 显示详细视图，包括配置的提供商端点（`baseUrl`）和 API 模式（`api`）（如果可用）。

## 调试覆盖

`/debug` 让你设置**仅运行时**配置覆盖（内存，非磁盘）。仅所有者。默认禁用；用 `commands.debug: true` 启用。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

<Note>
覆盖立即应用于新的配置读取，但**不**写入 `openclaw.json`。使用 `/debug reset` 清除所有覆盖并返回到磁盘上的配置。
</Note>

## 插件跟踪输出

`/trace` 让你切换**会话范围的插件跟踪/调试行**，而无需开启完整详细模式。

示例：

```text
/trace
/trace on
/trace off
```

说明：

- `/trace` 无参数显示当前会话跟踪状态。
- `/trace on` 为当前会话启用插件跟踪行。
- `/trace off` 再次禁用它们。
- 插件跟踪行可以出现在 `/status` 中以及正常助手回复后的后续诊断消息中。
- `/trace` 不取代 `/debug`；`/debug` 仍然管理仅运行时的配置覆盖。
- `/trace` 不取代 `/verbose`；正常详细工具/状态输出仍属于 `/verbose`。

## 配置更新

`/config` 写入你的磁盘配置（`openclaw.json`）。仅所有者。默认禁用；用 `commands.config: true` 启用。

示例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

<Note>
配置在写入前经过验证；无效更改被拒绝。`/config` 更新在重启后持久化。
</Note>

## MCP 更新

`/mcp` 在 `mcp.servers` 下写入 OpenClaw 管理的 MCP 服务器定义。仅所有者。默认禁用；用 `commands.mcp: true` 启用。

示例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

<Note>
`/mcp` 将配置存储在 OpenClaw 配置中，而非 Pi 拥有的项目设置中。运行时适配器决定哪些传输实际上可执行。
</Note>

## 插件更新

`/plugins` 让操作者检查发现的插件并在配置中切换启用状态。只读流程可以使用 `/plugin` 作为别名。默认禁用；用 `commands.plugins: true` 启用。

示例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

<Note>
- `/plugins list` 和 `/plugins show` 对当前工作区加磁盘配置使用真实的插件发现。
- `/plugins install` 从 ClawHub、npm、git、本地目录和存档安装。
- `/plugins enable|disable` 仅更新插件配置；它不安装或卸载插件。
- 启用和禁用更改为新代理轮次热重载 Gateway 插件运行时界面；安装请求 Gateway 重启，因为插件源模块已更改。

</Note>

## 界面说明

<AccordionGroup>
  <Accordion title="每界面的会话">
    - **文本命令**在正常聊天会话中运行（DM 共享 `main`，群组有自己的会话）。
    - **原生命令**使用隔离的会话：
      - Discord：`agent:<agentId>:discord:slash:<userId>`
      - Slack：`agent:<agentId>:slack:slash:<userId>`（前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置）
      - Telegram：`telegram:slash:<userId>`（通过 `CommandTargetSessionKey` 定位聊天会话）
    - **`/stop`**定位活动聊天会话，以便中止当前运行。

  </Accordion>
  <Accordion title="Slack 特性">
    `channels.slack.slashCommand` 仍然支持单个 `/openclaw` 风格命令。如果你启用 `commands.native`，你必须为每个内置命令创建一个 Slack slash 命令（与 `/help` 相同的名称）。Slack 的命令参数菜单作为临时 Block Kit 按钮传递。

    Slack 原生例外：注册 `/agentstatus`（而非 `/status`）因为 Slack 保留了 `/status`。文本 `/status` 在 Slack 消息中仍然有效。

  </Accordion>
</AccordionGroup>

## BTW 旁问

`/btw` 是关于当前会话的快速**旁问**。`/side` 是别名。

与正常聊天不同：

- 它使用当前会话作为背景上下文，
- 它作为单独的**无工具**单次调用运行，
- 它不改变未来的会话上下文，
- 它不写入转录历史，
- 它作为实时旁结果而非正常助手消息传递。

这使 `/btw` 在你想要临时澄清同时主要任务继续进行时很有用。

示例：

```text
/btw what are we doing right now?
/side what changed while the main run continued?
```

参阅 [BTW 旁问](/tools/btw)了解完整行为和客户端 UX 详情。

## 相关链接

- [创建技能](/tools/creating-skills)
- [技能](/tools/skills)
- [技能配置](/tools/skills-config)
