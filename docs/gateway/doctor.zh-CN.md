---
summary: "Doctor 命令：健康检查、配置迁移和修复步骤"
title: "Doctor"
sidebarTitle: "Doctor"
read_when:
  - 添加或修改 doctor 迁移
  - 引入破坏性配置更改
---

`openclaw doctor` 是 OpenClaw 的修复 + 迁移工具。它修复过时的配置/状态，检查健康状况，并提供可操作的修复步骤。

## 快速开始

```bash
openclaw doctor
```

### 无头和自动化模式

<Tabs>
  <Tab title="--yes">
    ```bash
    openclaw doctor --yes
    ```

    接受默认值而不提示（包括适用时的重启/服务/沙盒修复步骤）。

  </Tab>
  <Tab title="--repair">
    ```bash
    openclaw doctor --repair
    ```

    无需提示即应用推荐的修复（在安全的情况下修复 + 重启）。

  </Tab>
  <Tab title="--repair --force">
    ```bash
    openclaw doctor --repair --force
    ```

    也应用激进的修复（覆盖自定义监督程序配置）。

  </Tab>
  <Tab title="--non-interactive">
    ```bash
    openclaw doctor --non-interactive
    ```

    无需提示运行，仅应用安全迁移（配置规范化 + 磁盘状态移动）。跳过需要人工确认的重启/服务/沙盒操作。检测到旧版状态迁移时自动运行。

  </Tab>
  <Tab title="--deep">
    ```bash
    openclaw doctor --deep
    ```

    扫描系统服务以查找额外的网关安装（launchd/systemd/schtasks）。

  </Tab>
</Tabs>

如果你想在写入之前查看更改，请先打开配置文件：

```bash
cat ~/.openclaw/openclaw.json
```

## 它做什么（摘要）

<AccordionGroup>
  <Accordion title="健康、UI 和更新">
    - git 安装的可选预检更新（仅交互式）。
    - UI 协议新鲜度检查（当协议模式更新时重建 Control UI）。
    - 健康检查 + 重启提示。
    - 技能状态摘要（合格/缺失/被阻止）和插件状态。

  </Accordion>
  <Accordion title="配置和迁移">
    - 旧版值的配置规范化。
    - Talk 配置从旧版平面 `talk.*` 字段迁移到 `talk.provider` + `talk.providers.<provider>`。
    - 旧版 Chrome 扩展配置和 Chrome MCP 就绪性的浏览器迁移检查。
    - OpenCode 提供商覆盖警告（`models.providers.opencode` / `models.providers.opencode-go`）。
    - Codex OAuth 阴影警告（`models.providers.openai-codex`）。
    - OpenAI Codex OAuth 配置文件的 OAuth TLS 前提条件检查。
    - 当 `plugins.allow` 受限但工具策略仍要求通配符或插件拥有的工具时，显示插件/工具允许列表警告。
    - 旧版磁盘状态迁移（会话/代理目录/WhatsApp 认证）。
    - 旧版插件清单合同键迁移（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders` → `contracts`）。
    - 旧版 cron 存储迁移（`jobId`、`schedule.cron`、顶级传递/有效载荷字段、有效载荷 `provider`、简单的 `notify: true` webhook 回退任务）。
    - 旧版代理运行时策略迁移到 `agents.defaults.agentRuntime` 和 `agents.list[].agentRuntime`。
    - 插件启用时旧版插件配置清理；当 `plugins.enabled=false` 时，旧版插件引用被视为惰性容器配置并保留。

  </Accordion>
  <Accordion title="状态和完整性">
    - 会话锁文件检查和过时锁清理。
    - 修复受影响的 2026.4.24 构建创建的重复提示重写分支的会话转录。
    - 楔入的子代理重启恢复墓碑检测，支持 `--fix` 清除过时的中止恢复标志，使启动不再将子进程视为重启中止。
    - 状态完整性和权限检查（会话、转录、状态目录）。
    - 本地运行时的配置文件权限检查（chmod 600）。
    - 模型认证健康：检查 OAuth 过期，可以刷新即将过期的令牌，并报告认证配置文件冷却/禁用状态。
    - 额外工作区目录检测（`~/openclaw`）。

  </Accordion>
  <Accordion title="网关、服务和监督程序">
    - 沙盒启用时的沙盒镜像修复。
    - 旧版服务迁移和额外网关检测。
    - Matrix 渠道旧版状态迁移（在 `--fix` / `--repair` 模式下）。
    - 网关运行时检查（服务已安装但未运行；缓存的 launchd 标签）。
    - 渠道状态警告（从运行中的网关探测）。
    - 监督程序配置审计（launchd/systemd/schtasks），带有可选修复。
    - 网关服务的嵌入式代理环境清理，这些服务在安装或更新期间捕获了 shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` 值。
    - 网关运行时最佳实践检查（Node vs Bun，版本管理器路径）。
    - 网关端口冲突诊断（默认 `18789`）。

  </Accordion>
  <Accordion title="认证、安全和配对">
    - 开放 DM 策略的安全警告。
    - 本地令牌模式的网关认证检查（当不存在令牌源时提供令牌生成；不覆盖令牌 SecretRef 配置）。
    - 设备配对故障检测（待处理的首次配对请求、待处理的角色/范围升级、过时的本地设备令牌缓存漂移和已配对记录认证漂移）。

  </Accordion>
  <Accordion title="工作区和 Shell">
    - Linux 上的 systemd linger 检查。
    - 工作区引导文件大小检查（上下文文件的截断/接近限制警告）。
    - 默认代理的技能就绪性检查；报告缺少二进制文件、环境变量、配置或操作系统要求的允许技能，`--fix` 可以在 `skills.entries` 中禁用不可用的技能。
    - Shell 补全状态检查和自动安装/升级。
    - 内存搜索嵌入提供商就绪性检查（本地模型、远程 API 密钥或 QMD 二进制文件）。
    - 源码安装检查（pnpm 工作区不匹配、缺少 UI 资产、缺少 tsx 二进制文件）。
    - 写入更新的配置 + 向导元数据。

  </Accordion>
</AccordionGroup>

## 梦境 UI 回填和重置

Control UI 梦境场景包括用于落地梦境工作流的**回填**、**重置**和**清除落地**操作。这些操作使用类似网关 doctor 的 RPC 方法，但它们**不是** `openclaw doctor` CLI 修复/迁移的一部分。

它们做什么：

- **回填**扫描活跃工作区中历史的 `memory/YYYY-MM-DD.md` 文件，运行落地 REM 日记传递，并将可逆的回填条目写入 `DREAMS.md`。
- **重置**仅从 `DREAMS.md` 中删除那些标记的回填日记条目。
- **清除落地**仅删除来自历史回放且尚未积累实时召回或每日支持的暂存落地专用短期条目。

它们本身**不**做什么：

- 它们不编辑 `MEMORY.md`
- 它们不运行完整的 doctor 迁移
- 它们不自动将落地候选项暂存到实时短期推广存储，除非你先明确运行暂存 CLI 路径

如果你想要落地历史回放影响正常的深度推广通道，请改用 CLI 流程：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

这将落地持久候选项暂存到短期梦境存储，同时保留 `DREAMS.md` 作为审查面。

## 详细行为和原理

<AccordionGroup>
  <Accordion title="0. 可选更新（git 安装）">
    如果这是 git 检出且 doctor 以交互方式运行，它会在运行 doctor 之前提供更新（fetch/rebase/build）。
  </Accordion>
  <Accordion title="1. 配置规范化">
    如果配置包含旧版值形状（例如没有渠道特定覆盖的 `messages.ackReaction`），doctor 将它们规范化为当前模式。

    这包括旧版 Talk 平面字段。当前公开的 Talk 配置是 `talk.provider` + `talk.providers.<provider>`。Doctor 将旧的 `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` 形状重写到提供商映射中。

    当 `plugins.allow` 非空且工具策略使用通配符或插件拥有的工具条目时，Doctor 也会发出警告。`tools.allow: ["*"]` 仅匹配实际加载的插件中的工具；它不会绕过排他性插件允许列表。

  </Accordion>
  <Accordion title="2. 旧版配置键迁移">
    当配置包含已弃用的键时，其他命令拒绝运行并要求你运行 `openclaw doctor`。

    Doctor 将：

    - 解释发现了哪些旧版键。
    - 显示它应用的迁移。
    - 用更新的模式重写 `~/.openclaw/openclaw.json`。

    网关还会在检测到旧版配置格式时在启动时自动运行 doctor 迁移，因此过时的配置无需手动干预即可修复。Cron 任务存储迁移由 `openclaw doctor --fix` 处理。

    当前迁移：

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - 缺少可见回复策略的已配置渠道配置 → `messages.groupChat.visibleReplies: "message_tool"`
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → 顶级 `bindings`
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - 旧版 `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
    - `routing.agentToAgent` → `tools.agentToAgent`
    - `routing.transcribeAudio` → `tools.media.audio.models`
    - `messages.tts.<provider>`（`openai`/`elevenlabs`/`microsoft`/`edge`）→ `messages.tts.providers.<provider>`
    - `messages.tts.provider: "edge"` 和 `messages.tts.providers.edge` → `messages.tts.provider: "microsoft"` 和 `messages.tts.providers.microsoft`
    - `channels.discord.voice.tts.<provider>`（`openai`/`elevenlabs`/`microsoft`/`edge`）→ `channels.discord.voice.tts.providers.<provider>`
    - `channels.discord.accounts.<id>.voice.tts.<provider>`（`openai`/`elevenlabs`/`microsoft`/`edge`）→ `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.<provider>`（`openai`/`elevenlabs`/`microsoft`/`edge`）→ `plugins.entries.voice-call.config.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.provider: "edge"` 和 `plugins.entries.voice-call.config.tts.providers.edge` → `provider: "microsoft"` 和 `providers.microsoft`
    - `plugins.entries.voice-call.config.provider: "log"` → `"mock"`
    - `plugins.entries.voice-call.config.twilio.from` → `plugins.entries.voice-call.config.fromNumber`
    - `plugins.entries.voice-call.config.streaming.sttProvider` → `plugins.entries.voice-call.config.streaming.provider`
    - `plugins.entries.voice-call.config.streaming.openaiApiKey|sttModel|silenceDurationMs|vadThreshold` → `plugins.entries.voice-call.config.streaming.providers.openai.*`
    - `bindings[].match.accountID` → `bindings[].match.accountId`
    - 对于具有命名 `accounts` 但仍保留单账户顶级渠道值的渠道，将这些账户范围的值移到为该渠道选择的推广账户中（大多数渠道的 `accounts.default`；Matrix 可以保留现有匹配的命名/默认目标）
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*`（工具/elevated/exec/沙盒/子代理）
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - 删除 `agents.defaults.llm`；对慢速提供商/模型超时使用 `models.providers.<id>.timeoutSeconds`
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - 删除 `browser.relayBindHost`（旧版扩展中继设置）
    - 旧版 `models.providers.*.api: "openai"` → `"openai-completions"`（网关启动时也跳过 `api` 设置为未来或未知枚举值的提供商，而不是失败关闭）

    Doctor 警告还包括多账户渠道的账户默认值指南：

    - 如果配置了两个或更多 `channels.<channel>.accounts` 条目而没有 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 警告回退路由可能选择意外的账户。
    - 如果 `channels.<channel>.defaultAccount` 设置为未知的账户 ID，doctor 警告并列出已配置的账户 ID。

  </Accordion>
  <Accordion title="2b. OpenCode 提供商覆盖">
    如果你手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它会覆盖来自 `@mariozechner/pi-ai` 的内置 OpenCode 目录。这可能会强制模型使用错误的 API 或将成本归零。Doctor 警告，这样你可以删除覆盖并恢复每个模型的 API 路由 + 成本。
  </Accordion>
  <Accordion title="2c. 浏览器迁移和 Chrome MCP 就绪性">
    如果你的浏览器配置仍然指向已删除的 Chrome 扩展路径，doctor 将其规范化为当前主机本地 Chrome MCP 附加模型：

    - `browser.profiles.*.driver: "extension"` 变为 `"existing-session"`
    - `browser.relayBindHost` 被删除

    当你使用 `defaultProfile: "user"` 或配置的 `existing-session` 配置文件时，Doctor 还会审计主机本地 Chrome MCP 路径：

    - 检查 Google Chrome 是否安装在同一主机上，用于默认自动连接配置文件
    - 检查检测到的 Chrome 版本，并在低于 Chrome 144 时发出警告
    - 提醒你在浏览器检查页面中启用远程调试（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

    Doctor 不能为你启用 Chrome 端设置。主机本地 Chrome MCP 仍需要：

    - 网关/节点主机上基于 Chromium 的浏览器 144+
    - 在本地运行的浏览器
    - 在该浏览器中启用远程调试
    - 批准浏览器中的第一个附加同意提示

    这里的就绪性仅关于本地附加先决条件。Existing-session 保持当前 Chrome MCP 路由限制；高级路由如 `responsebody`、PDF 导出、下载拦截和批量操作仍然需要托管浏览器或原始 CDP 配置文件。

    此检查**不**适用于 Docker、沙盒、远程浏览器或其他无头流。这些继续使用原始 CDP。

  </Accordion>
  <Accordion title="2d. OAuth TLS 前提条件">
    当配置了 OpenAI Codex OAuth 配置文件时，doctor 探测 OpenAI 授权端点以验证本地 Node/OpenSSL TLS 堆栈可以验证证书链。如果探测因证书错误而失败（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、过期证书或自签名证书），doctor 打印特定平台的修复指南。在使用 Homebrew Node 的 macOS 上，修复通常是 `brew postinstall ca-certificates`。使用 `--deep`，即使网关健康，探测也会运行。
  </Accordion>
  <Accordion title="2e. Codex OAuth 提供商覆盖">
    如果你之前在 `models.providers.openai-codex` 下手动添加了旧版 OpenAI 传输设置，它们可能会阴影新版本自动使用的内置 Codex OAuth 提供商路径。当 Doctor 看到这些旧传输设置与 Codex OAuth 一起时发出警告，这样你可以删除或重写旧传输覆盖并获取内置路由/回退行为。自定义代理和仅标头覆盖仍然受支持，不会触发此警告。
  </Accordion>
  <Accordion title="2f. Codex 插件路由警告">
    当捆绑的 Codex 插件启用时，doctor 还检查 `openai-codex/*` 主模型引用是否仍然通过默认 PI 运行器解析。当你想通过 PI 使用 Codex OAuth/订阅认证时，这种组合是有效的，但很容易与原生 Codex 应用服务器工具混淆。Doctor 发出警告并指向明确的应用服务器形状：`openai/*` 加 `agentRuntime.id: "codex"` 或 `OPENCLAW_AGENT_RUNTIME=codex`。

    Doctor 不会自动修复这个，因为两条路由都是有效的：

    - `openai-codex/*` + PI 意味着"通过正常 OpenClaw 运行器使用 Codex OAuth/订阅认证。"
    - `openai/*` + `agentRuntime.id: "codex"` 意味着"通过原生 Codex 应用服务器运行嵌入式轮次。"
    - `/codex ...` 意味着"从聊天控制或绑定原生 Codex 对话。"
    - `/acp ...` 或 `runtime: "acp"` 意味着"使用外部 ACP/acpx 适配器。"

    如果出现警告，选择你想要的路由并手动编辑配置。当 PI Codex OAuth 是有意的时，保持警告不变。

  </Accordion>
  <Accordion title="3. 旧版状态迁移（磁盘布局）">
    Doctor 可以将较旧的磁盘布局迁移到当前结构：

    - 会话存储 + 转录：
      - 从 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
    - 代理目录：
      - 从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
    - WhatsApp 认证状态（Baileys）：
      - 从旧版 `~/.openclaw/credentials/*.json`（除 `oauth.json` 外）
      - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（默认账户 id：`default`）

    这些迁移是尽力而为且幂等的；当它将任何旧版文件夹作为备份留下时，doctor 会发出警告。网关/CLI 还会在启动时自动迁移旧版会话 + 代理目录，因此历史/认证/模型无需手动 doctor 运行即可落入每代理路径。WhatsApp 认证有意只通过 `openclaw doctor` 迁移。Talk 提供商/提供商映射规范化现在通过结构相等性比较，因此仅键顺序差异不再触发重复的无操作 `doctor --fix` 更改。

  </Accordion>
  <Accordion title="3a. 旧版插件清单迁移">
    Doctor 扫描所有已安装的插件清单，查找已弃用的顶级功能键（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders`）。当发现时，它提议将它们移到 `contracts` 对象并原地重写清单文件。此迁移是幂等的；如果 `contracts` 键已经有相同的值，旧版键被删除而不复制数据。
  </Accordion>
  <Accordion title="3b. 旧版 cron 存储迁移">
    Doctor 还检查 cron 任务存储（默认 `~/.openclaw/cron/jobs.json`，或覆盖时的 `cron.store`）中的旧版任务形状，调度程序仍然接受这些形状以兼容。

    当前 cron 清理包括：

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - 顶级有效载荷字段（`message`、`model`、`thinking`...）→ `payload`
    - 顶级传递字段（`deliver`、`channel`、`to`、`provider`...）→ `delivery`
    - 有效载荷 `provider` 传递别名 → 明确的 `delivery.channel`
    - 简单的旧版 `notify: true` webhook 回退任务 → 明确的 `delivery.mode="webhook"` 加 `delivery.to=cron.webhook`

    Doctor 只在可以不改变行为的情况下自动迁移 `notify: true` 任务。如果任务将旧版通知回退与现有非 webhook 传递模式组合，doctor 警告并将该任务留给手动审查。

    在 Linux 上，当用户的 crontab 仍然调用旧版 `~/.openclaw/bin/ensure-whatsapp.sh` 时，doctor 也会发出警告。该主机本地脚本不由当前 OpenClaw 维护，当 cron 无法到达 systemd 用户总线时，它可能向 `~/.openclaw/logs/whatsapp-health.log` 写入错误的 `Gateway inactive` 消息。使用 `crontab -e` 删除过时的 crontab 条目；使用 `openclaw channels status --probe`、`openclaw doctor` 和 `openclaw gateway status` 进行当前健康检查。

  </Accordion>
  <Accordion title="3c. 会话锁清理">
    Doctor 扫描每个代理会话目录中的过时写锁文件 — 会话异常退出时留下的文件。对于找到的每个锁文件，它报告：路径、PID、PID 是否仍然存活、锁年龄以及是否被认为是过时的（死亡 PID 或超过 30 分钟）。在 `--fix` / `--repair` 模式下，它自动删除过时的锁文件；否则它打印注释并指示你使用 `--fix` 重新运行。
  </Accordion>
  <Accordion title="3d. 会话转录分支修复">
    Doctor 扫描代理会话 JSONL 文件，查找 2026.4.24 提示转录重写错误创建的重复分支形状：一个带有 OpenClaw 内部运行时上下文的废弃用户轮次，加上一个包含相同可见用户提示的活跃兄弟。在 `--fix` / `--repair` 模式下，doctor 在原始文件旁边备份每个受影响的文件，并将转录重写为活跃分支，这样网关历史和内存读取器不再看到重复的轮次。
  </Accordion>
  <Accordion title="4. 状态完整性检查（会话持久性、路由和安全性）">
    状态目录是操作大脑。如果它消失，你会失去会话、凭据、日志和配置（除非你在其他地方有备份）。

    Doctor 检查：

    - **状态目录丢失**：警告灾难性状态丢失，提示重新创建目录，并提醒你它无法恢复丢失的数据。
    - **状态目录权限**：验证可写性；提议修复权限（当检测到所有者/组不匹配时发出 `chown` 提示）。
    - **macOS 云同步状态目录**：当状态解析在 iCloud Drive（`~/Library/Mobile Documents/com~apple~CloudDocs/...`）或 `~/Library/CloudStorage/...` 下时发出警告，因为同步支持的路径可能导致更慢的 I/O 和锁/同步竞争。
    - **Linux SD 或 eMMC 状态目录**：当状态解析到 `mmcblk*` 挂载源时发出警告，因为 SD 或 eMMC 支持的随机 I/O 在会话和凭据写入下可能更慢并且磨损更快。
    - **会话目录丢失**：`sessions/` 和会话存储目录是持久化历史和避免 `ENOENT` 崩溃所必需的。
    - **转录不匹配**：当最近的会话条目缺少转录文件时发出警告。
    - **主会话"1 行 JSONL"**：当主转录只有一行时标记（历史未积累）。
    - **多个状态目录**：当多个 `~/.openclaw` 文件夹存在于主目录中或 `OPENCLAW_STATE_DIR` 指向其他地方时发出警告（历史可能在安装之间分裂）。
    - **远程模式提醒**：如果 `gateway.mode=remote`，doctor 提醒你在远程主机上运行它（状态在那里）。
    - **配置文件权限**：如果 `~/.openclaw/openclaw.json` 是组/世界可读的，发出警告并提议收紧到 `600`。

  </Accordion>
  <Accordion title="5. 模型认证健康（OAuth 过期）">
    Doctor 检查认证存储中的 OAuth 配置文件，在令牌即将过期/已过期时发出警告，并可以在安全时刷新它们。如果 Anthropic OAuth/令牌配置文件过时，它建议使用 Anthropic API 密钥或 Anthropic 设置令牌路径。刷新提示仅在交互式运行时出现（TTY）；`--non-interactive` 跳过刷新尝试。

    当 OAuth 刷新永久失败时（例如 `refresh_token_reused`、`invalid_grant` 或提供商告诉你重新登录），doctor 报告需要重新认证并打印要运行的确切 `openclaw models auth login --provider ...` 命令。

    Doctor 还报告因以下原因暂时无法使用的认证配置文件：

    - 短暂冷却（速率限制/超时/认证失败）
    - 较长的禁用（计费/信用失败）

  </Accordion>
  <Accordion title="6. Hooks 模型验证">
    如果设置了 `hooks.gmail.model`，doctor 根据目录和允许列表验证模型引用，并在无法解析或不允许时发出警告。
  </Accordion>
  <Accordion title="7. 沙盒镜像修复">
    启用沙盒时，doctor 检查 Docker 镜像，并在当前镜像丢失时提议构建或切换到旧版名称。
  </Accordion>
  <Accordion title="7b. 插件安装清理">
    Doctor 在 `openclaw doctor --fix` / `openclaw doctor --repair` 模式下删除旧版 OpenClaw 生成的插件依赖暂存状态。这涵盖过时的生成依赖根目录、旧安装阶段目录、早期捆绑插件依赖修复代码的包本地残余，以及可能屏蔽当前捆绑清单的孤立或恢复的托管 `@openclaw/*` 插件 npm 副本。

    当配置引用已配置的可下载插件但本地插件注册表找不到它们时，Doctor 还可以重新安装它们。对于 2026.5.2 捆绑插件外部化，doctor 自动安装现有配置已使用的可下载插件，然后依赖 `meta.lastTouchedVersion` 只运行一次该版本传递。网关启动和配置重载不运行包管理器；插件安装仍然是明确的 doctor/安装/更新工作。

  </Accordion>
  <Accordion title="8. 网关服务迁移和清理提示">
    Doctor 检测旧版网关服务（launchd/systemd/schtasks），并提议使用当前网关端口删除它们并安装 OpenClaw 服务。它还可以扫描额外的类似网关的服务并打印清理提示。配置文件命名的 OpenClaw 网关服务被视为一等服务，不被标记为"额外"。

    在 Linux 上，如果用户级网关服务丢失但存在系统级 OpenClaw 网关服务，doctor 不会自动安装第二个用户级服务。使用 `openclaw gateway status --deep` 或 `openclaw doctor --deep` 检查，然后删除重复项或在系统监督程序拥有网关生命周期时设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Accordion>
  <Accordion title="8b. 启动 Matrix 迁移">
    当 Matrix 渠道账户有待处理或可操作的旧版状态迁移时，doctor（在 `--fix` / `--repair` 模式下）创建预迁移快照，然后运行尽力而为的迁移步骤：旧版 Matrix 状态迁移和旧版加密状态准备。两个步骤都是非致命的；错误被记录且启动继续。在只读模式下（不带 `--fix` 的 `openclaw doctor`），此检查被完全跳过。
  </Accordion>
  <Accordion title="8c. 设备配对和认证漂移">
    Doctor 现在作为正常健康传递的一部分检查设备配对状态。

    它报告什么：

    - 待处理的首次配对请求
    - 已配对设备的待处理角色升级
    - 已配对设备的待处理范围升级
    - 设备 id 仍然匹配但设备身份不再与批准记录匹配的公钥不匹配修复
    - 缺少已批准角色活跃令牌的已配对记录
    - 范围漂移超出批准的配对基线的已配对令牌
    - 当前机器的本地缓存设备令牌条目，早于网关端令牌轮换或携带过时的范围元数据

    Doctor 不自动批准配对请求或自动轮换设备令牌。它打印确切的后续步骤：

    - 用 `openclaw devices list` 检查待处理请求
    - 用 `openclaw devices approve <requestId>` 批准确切的请求
    - 用 `openclaw devices rotate --device <deviceId> --role <role>` 轮换新令牌
    - 用 `openclaw devices remove <deviceId>` 删除并重新批准过时记录

    这关闭了常见的"已配对但仍然收到需要配对"漏洞：doctor 现在区分首次配对、待处理角色/范围升级和过时的令牌/设备身份漂移。

  </Accordion>
  <Accordion title="9. 安全警告">
    当提供商对没有允许列表的 DM 开放，或当策略以危险方式配置时，Doctor 发出警告。
  </Accordion>
  <Accordion title="10. systemd linger（Linux）">
    如果作为 systemd 用户服务运行，doctor 确保启用了 lingering，使网关在注销后保持存活。
  </Accordion>
  <Accordion title="11. 工作区状态（技能、插件和旧版目录）">
    Doctor 打印默认代理的工作区状态摘要：

    - **技能状态**：计算符合条件、缺少要求和允许列表阻止的技能。
    - **旧版工作区目录**：当 `~/openclaw` 或其他旧版工作区目录与当前工作区并存时发出警告。
    - **插件状态**：计算启用/禁用/错误的插件；列出任何错误的插件 ID；报告捆绑插件功能。
    - **插件兼容性警告**：标记与当前运行时有兼容性问题的插件。
    - **插件诊断**：呈现插件注册表发出的任何加载时警告或错误。

  </Accordion>
  <Accordion title="11b. 引导文件大小">
    Doctor 检查工作区引导文件（例如 `AGENTS.md`、`CLAUDE.md` 或其他注入的上下文文件）是否接近或超过配置的字符预算。它报告每个文件的原始 vs. 注入字符数、截断百分比、截断原因（`max/file` 或 `max/total`）以及注入字符总数占总预算的比例。当文件被截断或接近限制时，doctor 打印调整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。
  </Accordion>
  <Accordion title="11d. 过时渠道插件清理">
    当 `openclaw doctor --fix` 删除丢失的渠道插件时，它还会删除引用该插件的悬空渠道范围配置：`channels.<id>` 条目、命名该渠道的心跳目标以及 `agents.*.models["<channel>/*"]` 覆盖。这防止了网关启动循环，即渠道运行时已消失但配置仍要求网关绑定到它。
  </Accordion>
  <Accordion title="11c. Shell 补全">
    Doctor 检查当前 shell（zsh、bash、fish 或 PowerShell）是否安装了 Tab 补全：

    - 如果 shell 配置文件使用慢速动态补全模式（`source <(openclaw completion ...)`），doctor 将其升级为更快的缓存文件变体。
    - 如果补全在配置文件中配置但缓存文件丢失，doctor 自动重新生成缓存。
    - 如果根本没有配置补全，doctor 提示安装它（仅交互模式；使用 `--non-interactive` 跳过）。

    运行 `openclaw completion --write-state` 手动重新生成缓存。

  </Accordion>
  <Accordion title="12. 网关认证检查（本地令牌）">
    Doctor 检查本地网关令牌认证就绪性。

    - 如果令牌模式需要令牌但不存在令牌源，doctor 提议生成一个。
    - 如果 `gateway.auth.token` 是 SecretRef 管理的但不可用，doctor 发出警告且不用明文覆盖它。
    - `openclaw doctor --generate-gateway-token` 仅在未配置令牌 SecretRef 时强制生成。

  </Accordion>
  <Accordion title="12b. 只读 SecretRef 感知修复">
    某些修复流程需要在不削弱运行时快速失败行为的情况下检查已配置的凭据。

    - `openclaw doctor --fix` 现在使用与状态族命令相同的只读 SecretRef 摘要模型进行目标配置修复。
    - 示例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修复在可用时尝试使用已配置的机器人凭据。
    - 如果 Telegram 机器人令牌通过 SecretRef 配置但在当前命令路径中不可用，doctor 报告凭据已配置但不可用，并跳过自动解析而不是崩溃或错误报告令牌丢失。

  </Accordion>
  <Accordion title="13. 网关健康检查 + 重启">
    Doctor 运行健康检查，并在网关看起来不健康时提议重启网关。
  </Accordion>
  <Accordion title="13b. 内存搜索就绪性">
    Doctor 检查配置的内存搜索嵌入提供商是否为默认代理做好准备。行为取决于配置的后端和提供商：

    - **QMD 后端**：探测 `qmd` 二进制文件是否可用且可启动。如果不行，打印修复指南，包括 npm 包和手动二进制路径选项。
    - **明确的本地提供商**：检查本地模型文件或已识别的远程/可下载模型 URL。如果丢失，建议切换到远程提供商。
    - **明确的远程提供商**（`openai`、`voyage` 等）：验证环境或认证存储中是否存在 API 密钥。如果丢失，打印可操作的修复提示。
    - **自动提供商**：首先检查本地模型可用性，然后按自动选择顺序尝试每个远程提供商。

    当缓存的网关探测结果可用时（检查时网关是健康的），doctor 将其结果与 CLI 可见配置交叉参考，并注意任何差异。Doctor 不在默认路径上启动新的嵌入 ping；当你想要实时提供商检查时使用深度内存状态命令。

    使用 `openclaw memory status --deep` 在运行时验证嵌入就绪性。

  </Accordion>
  <Accordion title="14. 渠道状态警告">
    如果网关健康，doctor 运行渠道状态探测并报告带有建议修复的警告。
  </Accordion>
  <Accordion title="15. 监督程序配置审计 + 修复">
    Doctor 检查已安装的监督程序配置（launchd/systemd/schtasks），查找缺少或过时的默认值（例如 systemd 网络在线依赖和重启延迟）。当发现不匹配时，它建议更新，并可以将服务文件/任务重写为当前默认值。

    注意：

    - `openclaw doctor` 在重写监督程序配置前提示。
    - `openclaw doctor --yes` 接受默认修复提示。
    - `openclaw doctor --repair` 无需提示即应用推荐的修复。
    - `openclaw doctor --repair --force` 覆盖自定义监督程序配置。
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` 使 doctor 对网关服务生命周期保持只读。它仍然报告服务健康并运行非服务修复，但跳过服务安装/启动/重启/引导、监督程序配置重写和旧版服务清理，因为外部监督程序拥有该生命周期。
    - 在 Linux 上，当匹配的 systemd 网关单元处于活跃状态时，doctor 不会重写命令/入口点元数据。它还会在重复服务扫描期间忽略非活跃的非旧版额外类似网关的单元，以避免伴随服务文件产生清理噪音。
    - 如果令牌认证需要令牌且 `gateway.auth.token` 是 SecretRef 管理的，doctor 服务安装/修复验证 SecretRef 但不会将已解析的明文令牌值持久化到监督程序服务环境元数据中。
    - Doctor 检测较旧的 LaunchAgent、systemd 或 Windows 计划任务安装内联嵌入的托管 `.env`/SecretRef 支持的服务环境值，并重写服务元数据，使这些值从运行时源而不是监督程序定义加载。
    - Doctor 检测服务命令在 `gateway.port` 更改后是否仍固定旧的 `--port`，并将服务元数据重写为当前端口。
    - 如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，doctor 使用可操作的指南阻止安装/修复路径。
    - 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且 `gateway.auth.mode` 未设置，doctor 在明确设置模式之前阻止安装/修复。
    - 对于 Linux 用户 systemd 单元，doctor 令牌漂移检查现在在比较服务认证元数据时包括 `Environment=` 和 `EnvironmentFile=` 源。
    - 当配置最后由更新版本写入时，Doctor 服务修复拒绝从较旧的 OpenClaw 二进制文件重写、停止或重启网关服务。参见[网关故障排除](/gateway/troubleshooting#split-brain-installs-and-newer-config-guard)。
    - 你始终可以通过 `openclaw gateway install --force` 强制完全重写。

  </Accordion>
  <Accordion title="16. 网关运行时 + 端口诊断">
    Doctor 检查服务运行时（PID，最后退出状态），并在服务已安装但实际未运行时发出警告。它还检查网关端口（默认 `18789`）上的端口冲突，并报告可能的原因（网关已运行、SSH 隧道）。
  </Accordion>
  <Accordion title="17. 网关运行时最佳实践">
    当网关服务在 Bun 或版本管理的 Node 路径（`nvm`、`fnm`、`volta`、`asdf` 等）上运行时，Doctor 发出警告。WhatsApp + Telegram 渠道需要 Node，版本管理器路径在升级后可能会中断，因为服务不加载你的 shell 初始化。Doctor 在可用时提议迁移到系统 Node 安装（Homebrew/apt/choco）。

    新安装或修复的 macOS LaunchAgents 使用规范系统 PATH（`/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`）而不是复制交互式 shell PATH，因此 Volta、asdf、fnm、pnpm 和其他版本管理器目录不会更改子进程解析哪个 Node。Linux 服务仍然保留明确的环境根目录（`NVM_DIR`、`FNM_DIR`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`BUN_INSTALL`、`PNPM_HOME`）和稳定的用户 bin 目录，但猜测的版本管理器回退目录仅在这些目录在磁盘上存在时才写入服务 PATH。

  </Accordion>
  <Accordion title="18. 配置写入 + 向导元数据">
    Doctor 持久化任何配置更改并记录向导元数据以记录 doctor 运行。
  </Accordion>
  <Accordion title="19. 工作区提示（备份 + 内存系统）">
    当缺少时，Doctor 建议工作区内存系统，如果工作区尚未在 git 下，则打印备份提示。

    有关工作区结构和 git 备份的完整指南，参见 [/concepts/agent-workspace](/concepts/agent-workspace)（推荐私有 GitHub 或 GitLab）。

  </Accordion>
</AccordionGroup>

## 相关链接

- [网关运行手册](/gateway)
- [网关故障排除](/gateway/troubleshooting)
