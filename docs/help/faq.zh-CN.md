---
summary: "关于 OpenClaw 设置、配置和使用的常见问题解答"
read_when:
  - 回答常见的设置、安装、引导或运行时支持问题
  - 在深入调试之前对用户报告的问题进行分类
title: "FAQ"
---

快速解答加上真实场景（本地开发、VPS、多代理、OAuth/API 密钥、模型故障转移）的深入故障排除。有关运行时诊断，请参阅[故障排除](/gateway/troubleshooting)。有关完整的配置参考，请参阅[配置](/gateway/configuration)。

## 出问题时的前 60 秒

1. **快速状态（首次检查）**

   ```bash
   openclaw status
   ```

   快速本地摘要：操作系统 + 更新、Gateway/服务可达性、代理/会话、提供商配置 + 运行时问题（当 Gateway 可达时）。

2. **可粘贴的报告（可安全共享）**

   ```bash
   openclaw status --all
   ```

   带有日志尾部的只读诊断（令牌已编辑）。

3. **守护进程 + 端口状态**

   ```bash
   openclaw gateway status
   ```

   显示监督器运行时与 RPC 可达性、探针目标 URL 以及服务可能使用的配置。

4. **深度探针**

   ```bash
   openclaw status --deep
   ```

   运行实时 Gateway 健康探针，包括支持时的频道探针（需要可达的 Gateway）。请参阅[健康](/gateway/health)。

5. **跟踪最新日志**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 已关闭，回退到：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日志与服务日志是分开的；请参阅[日志记录](/logging)和[故障排除](/gateway/troubleshooting)。

6. **运行 doctor（修复）**

   ```bash
   openclaw doctor
   ```

   修复/迁移配置/状态 + 运行健康检查。请参阅 [Doctor](/gateway/doctor)。

7. **Gateway 快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # 在错误时显示目标 URL + 配置路径
   ```

   向正在运行的 Gateway 请求完整快照（仅 WS）。请参阅[健康](/gateway/health)。

## 快速入门和首次运行设置

首次运行问答——安装、引导、认证路由、订阅、初始失败——位于[首次运行 FAQ](/help/faq-first-run)。

## OpenClaw 是什么？

<AccordionGroup>
  <Accordion title="一段话介绍 OpenClaw">
    OpenClaw 是一个您在自己设备上运行的个人 AI 助手。它在您已经使用的消息平台上回复（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat 以及捆绑的频道插件如 QQ Bot），在受支持的平台上还可以进行语音 + 实时 Canvas。**Gateway** 是始终在线的控制平面；助手是产品。
  </Accordion>

  <Accordion title="价值主张">
    OpenClaw 不是"只是一个 Claude 包装器"。它是一个**本地优先的控制平面**，让您可以在**自己的硬件**上运行强大的助手，从您已经使用的聊天应用中访问，具有有状态的会话、记忆和工具——而不需要将您的工作流控制权交给托管 SaaS。

    亮点：

    - **您的设备，您的数据：**在您想要的地方运行 Gateway（Mac、Linux、VPS），并将工作区 + 会话历史保留在本地。
    - **真实频道，不是网络沙箱：**WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，加上受支持平台上的移动语音和 Canvas。
    - **模型无关：**使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，具有每代理路由和故障转移。
    - **仅限本地选项：**运行本地模型，如果您想要，**所有数据都可以保留在您的设备上**。
    - **多代理路由：**每个频道、账户或任务的独立代理，每个都有自己的工作区和默认值。
    - **开源且可扩展：**检查、扩展和自托管，无供应商锁定。

    文档：[Gateway](/gateway)、[频道](/channels)、[多代理](/concepts/multi-agent)、[记忆](/concepts/memory)。

  </Accordion>

  <Accordion title="我刚设置好——我应该先做什么？">
    好的入门项目：

    - 构建网站（WordPress、Shopify 或简单的静态网站）。
    - 原型移动应用（大纲、屏幕、API 计划）。
    - 整理文件和文件夹（清理、命名、标记）。
    - 连接 Gmail 并自动化摘要或跟进。

    它可以处理大型任务，但当您将它们分成阶段并使用子代理进行并行工作时效果最好。

  </Accordion>

  <Accordion title="OpenClaw 的五大日常使用场景是什么？">
    日常成功通常是这样的：

    - **个人简报：**收件箱、日历和您关心的新闻摘要。
    - **研究和起草：**快速研究、摘要以及电子邮件或文档的初稿。
    - **提醒和跟进：**由 cron 或心跳驱动的提醒和清单。
    - **浏览器自动化：**填写表单、收集数据和重复网络任务。
    - **跨设备协调：**从手机发送任务，让 Gateway 在服务器上运行，并在聊天中获取结果。

  </Accordion>

  <Accordion title="OpenClaw 可以帮助 SaaS 的潜在客户开发、外联、广告和博客吗？">
    是的，用于**研究、资格认定和起草**。它可以扫描网站、建立候选名单、总结潜在客户以及撰写外联或广告文案草稿。

    对于**外联或广告投放**，保持人工参与。避免垃圾邮件，遵守当地法律和平台政策，并在发送之前审查任何内容。最安全的模式是让 OpenClaw 起草，由您批准。

    文档：[安全](/gateway/security)。

  </Accordion>

  <Accordion title="与 Claude Code 相比，OpenClaw 在 Web 开发方面有哪些优势？">
    OpenClaw 是一个**个人助手**和协调层，不是 IDE 替代品。对于仓库内最快的直接编码循环，使用 Claude Code 或 Codex。当您想要持久记忆、跨设备访问和工具编排时，使用 OpenClaw。

    优势：

    - **跨会话的持久记忆 + 工作区**
    - **多平台访问**（WhatsApp、Telegram、TUI、WebChat）
    - **工具编排**（浏览器、文件、调度、钩子）
    - **始终在线的 Gateway**（在 VPS 上运行，从任何地方交互）
    - **节点**用于本地浏览器/屏幕/摄像头/执行

    展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## 技能和自动化

<AccordionGroup>
  <Accordion title="如何在不使仓库变脏的情况下自定义技能？">
    使用托管覆盖而不是编辑仓库副本。将您的更改放在 `~/.openclaw/skills/<name>/SKILL.md`（或通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加文件夹）。优先级是 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → 捆绑 → `skills.load.extraDirs`，因此托管覆盖仍然优先于捆绑技能，而无需修改 git。如果您需要全局安装技能但只对某些代理可见，将共享副本保留在 `~/.openclaw/skills` 中，并使用 `agents.defaults.skills` 和 `agents.list[].skills` 控制可见性。只有值得上游提交的编辑才应该存在于仓库中并以 PR 形式提出。
  </Accordion>

  <Accordion title="我可以从自定义文件夹加载技能吗？">
    可以。通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加额外目录（最低优先级）。默认优先级是 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → 捆绑 → `skills.load.extraDirs`。`clawhub` 默认安装到 `./skills`，OpenClaw 在下一个会话中将其视为 `<workspace>/skills`。如果技能应该只对某些代理可见，请与 `agents.defaults.skills` 或 `agents.list[].skills` 配合使用。
  </Accordion>

  <Accordion title="如何对不同任务使用不同的模型？">
    目前支持的模式有：

    - **Cron 作业**：隔离的作业可以为每个作业设置 `model` 覆盖。
    - **子代理**：将任务路由到具有不同默认模型的独立代理。
    - **按需切换**：使用 `/model` 随时切换当前会话模型。

    请参阅 [Cron 作业](/automation/cron-jobs)、[多代理路由](/concepts/multi-agent)和[斜线命令](/tools/slash-commands)。

  </Accordion>

  <Accordion title="机器人在做繁重工作时冻结。我如何卸载？">
    使用**子代理**处理长期或并行任务。子代理在自己的会话中运行，返回摘要，并保持您的主聊天响应。

    让您的机器人"为此任务生成一个子代理"或使用 `/subagents`。使用聊天中的 `/status` 查看 Gateway 现在正在做什么（以及它是否忙）。

    令牌提示：长任务和子代理都消耗令牌。如果成本是个问题，通过 `agents.defaults.subagents.model` 为子代理设置更便宜的模型。

    文档：[子代理](/tools/subagents)、[后台任务](/automation/tasks)。

  </Accordion>

  <Accordion title="线程绑定的子代理会话在 Discord 上如何工作？">
    使用线程绑定。您可以将 Discord 线程绑定到子代理或会话目标，以便该线程中的后续消息保留在该绑定的会话上。

    基本流程：

    - 使用 `sessions_spawn` 带 `thread: true` 生成（以及可选的 `mode: "session"` 用于持久跟进）。
    - 或使用 `/focus <target>` 手动绑定。
    - 使用 `/agents` 检查绑定状态。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自动取消聚焦。
    - 使用 `/unfocus` 分离线程。

    所需配置：

    - 全局默认值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆盖：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成时自动绑定：`channels.discord.threadBindings.spawnSessions` 默认为 `true`；设置为 `false` 以禁用线程绑定会话生成。

    文档：[子代理](/tools/subagents)、[Discord](/channels/discord)、[配置参考](/gateway/configuration-reference)、[斜线命令](/tools/slash-commands)。

  </Accordion>

  <Accordion title="子代理已完成，但完成更新发送到了错误的地方或从未发布。我应该检查什么？">
    首先检查已解析的请求者路由：

    - 完成模式子代理送达优先于任何存在的绑定线程或对话路由。
    - 如果完成来源只携带一个频道，OpenClaw 回退到请求者会话存储的路由（`lastChannel` / `lastTo` / `lastAccountId`），以便直接送达仍然可以成功。
    - 如果既没有绑定路由也没有可用的存储路由，直接送达可能会失败，结果回退到排队会话送达，而不是立即发布到聊天。
    - 无效或陈旧的目标仍然可以强制排队回退或最终送达失败。
    - 如果子代理的最后可见助手回复是确切的静默令牌 `NO_REPLY` / `no_reply`，或确切是 `ANNOUNCE_SKIP`，OpenClaw 有意抑制公告，而不是发布陈旧的早期进度。
    - 如果子代理在只有工具调用后超时，公告可以将其折叠成短暂的部分进度摘要，而不是重放原始工具输出。

    调试：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[子代理](/tools/subagents)、[后台任务](/automation/tasks)、[会话工具](/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒未触发。我应该检查什么？">
    Cron 在 Gateway 进程内运行。如果 Gateway 没有持续运行，计划作业将不会运行。

    清单：

    - 确认 cron 已启用（`cron.enabled`）且 `OPENCLAW_SKIP_CRON` 未设置。
    - 检查 Gateway 是否 24/7 运行（无睡眠/重启）。
    - 验证作业的时区设置（`--tz` 与主机时区）。

    调试：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文档：[Cron 作业](/automation/cron-jobs)、[自动化和任务](/automation)。

  </Accordion>

  <Accordion title="Cron 已触发，但没有发送到频道。为什么？">
    首先检查送达模式：

    - `--no-deliver` / `delivery.mode: "none"` 表示预期没有运行器回退发送。
    - 缺少或无效的公告目标（`channel` / `to`）表示运行器跳过了出站送达。
    - 频道认证失败（`unauthorized`、`Forbidden`）表示运行器尝试送达但凭证阻止了它。
    - 静默隔离结果（仅 `NO_REPLY` / `no_reply`）被视为有意不可送达，因此运行器也抑制了排队的回退送达。

    对于隔离的 cron 作业，代理仍然可以在聊天路由可用时直接使用 `message` 工具发送。`--announce` 仅控制代理尚未发送的最终文本的运行器回退路径。

    调试：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[Cron 作业](/automation/cron-jobs)、[后台任务](/automation/tasks)。

  </Accordion>

  <Accordion title="为什么隔离的 cron 运行切换了模型或重试了一次？">
    这通常是实时模型切换路径，而不是重复调度。

    当活动运行抛出 `LiveSessionModelSwitchError` 时，隔离 cron 可以持久化运行时模型切换并重试。重试保持切换的提供商/模型，如果切换携带新的认证配置文件覆盖，cron 在重试之前也会持久化它。

    相关选择规则：

    - Gmail 钩子模型覆盖在适用时首先获胜。
    - 然后是每作业的 `model`。
    - 然后是任何存储的 cron 会话模型覆盖。
    - 然后是正常的代理/默认模型选择。

    重试循环是有界的。在初始尝试加 2 次切换重试之后，cron 中止而不是永远循环。

    调试：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[Cron 作业](/automation/cron-jobs)、[cron CLI](/cli/cron)。

  </Accordion>

  <Accordion title="如何在 Linux 上安装技能？">
    使用原生 `openclaw skills` 命令或将技能放入您的工作区。macOS 技能 UI 在 Linux 上不可用。在 [https://clawhub.ai](https://clawhub.ai) 浏览技能。

    ```bash
    openclaw skills search "calendar"
    openclaw skills search --limit 20
    openclaw skills install <skill-slug>
    openclaw skills install <skill-slug> --version <version>
    openclaw skills install <skill-slug> --force
    openclaw skills update --all
    openclaw skills list --eligible
    openclaw skills check
    ```

    原生 `openclaw skills install` 写入活动工作区 `skills/` 目录。仅在想要发布或同步自己的技能时才安装单独的 `clawhub` CLI。对于跨代理的共享安装，将技能放在 `~/.openclaw/skills` 下，如果您想缩小哪些代理可以看到它，使用 `agents.defaults.skills` 或 `agents.list[].skills`。

  </Accordion>

  <Accordion title="OpenClaw 可以按计划或在后台持续运行任务吗？">
    可以。使用 Gateway 调度器：

    - **Cron 作业**用于计划或重复任务（跨重启持久化）。
    - **心跳**用于"主会话"定期检查。
    - **隔离作业**用于发布摘要或向聊天送达的自主代理。

    文档：[Cron 作业](/automation/cron-jobs)、[自动化和任务](/automation)、[心跳](/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以从 Linux 运行仅限 Apple macOS 的技能吗？">
    不能直接运行。macOS 技能由 `metadata.openclaw.os` 加上所需的二进制文件门控，技能只有在 **Gateway 主机**上有资格时才出现在系统提示中。在 Linux 上，`darwin` 专属技能（如 `apple-notes`、`apple-reminders`、`things-mac`）将不会加载，除非您覆盖门控。

    您有三种受支持的模式：

    **选项 A — 在 Mac 上运行 Gateway（最简单）。**
    在 macOS 二进制文件所在的地方运行 Gateway，然后在[远程模式](#gateway-ports-already-running-and-remote-mode)或通过 Tailscale 从 Linux 连接。技能正常加载，因为 Gateway 主机是 macOS。

    **选项 B — 使用 macOS 节点（无 SSH）。**
    在 Linux 上运行 Gateway，配对 macOS 节点（菜单栏应用），并在 Mac 上将**节点运行命令**设置为"始终询问"或"始终允许"。当所需的二进制文件存在于节点上时，OpenClaw 可以将仅限 macOS 的技能视为有资格的。代理通过 `nodes` 工具运行这些技能。如果您选择"始终询问"，在提示中批准"始终允许"会将该命令添加到白名单。

    **选项 C — 通过 SSH 代理 macOS 二进制文件（高级）。**
    将 Gateway 保留在 Linux 上，但使所需的 CLI 二进制文件解析为在 Mac 上运行的 SSH 包装器。然后覆盖技能以允许 Linux，使其保持有资格。

    1. 为二进制文件创建 SSH 包装器（示例：Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 将包装器放在 Linux 主机的 `PATH` 上（例如 `~/bin/memo`）。
    3. 覆盖技能元数据（工作区或 `~/.openclaw/skills`）以允许 Linux：

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. 启动新会话以刷新技能快照。

  </Accordion>

  <Accordion title="你们有 Notion 或 HeyGen 集成吗？">
    今天没有内置的。

    选项：

    - **自定义技能/插件：**最适合可靠的 API 访问（Notion/HeyGen 都有 API）。
    - **浏览器自动化：**无需代码即可工作，但速度较慢且更脆弱。

    如果您想要每个客户端保留上下文（代理机构工作流），一个简单的模式是：

    - 每个客户端一个 Notion 页面（上下文 + 偏好 + 活跃工作）。
    - 要求代理在会话开始时获取该页面。

    如果您想要原生集成，请打开功能请求或构建针对这些 API 的技能。

    安装技能：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安装落在活动工作区 `skills/` 目录中。对于跨代理的共享技能，将它们放在 `~/.openclaw/skills/<name>/SKILL.md` 中。如果只有某些代理应该看到共享安装，请配置 `agents.defaults.skills` 或 `agents.list[].skills`。一些技能期望通过 Homebrew 安装的二进制文件；在 Linux 上这意味着 Linuxbrew（请参阅上面的 Homebrew Linux FAQ 条目）。请参阅[技能](/tools/skills)、[技能配置](/tools/skills-config)和 [ClawHub](/tools/clawhub)。

  </Accordion>

  <Accordion title="如何将我现有的已登录 Chrome 与 OpenClaw 一起使用？">
    使用内置的 `user` 浏览器配置文件，它通过 Chrome DevTools MCP 附加：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果您想要自定义名称，请创建一个显式的 MCP 配置文件：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路径可以使用本地主机浏览器或连接的浏览器节点。如果 Gateway 在其他地方运行，要么在浏览器机器上运行节点主机，要么改用远程 CDP。

    `existing-session` / `user` 的当前限制：

    - 操作由引用驱动，而不是 CSS 选择器驱动
    - 上传需要 `ref` / `inputRef`，目前每次支持一个文件
    - `responsebody`、PDF 导出、下载拦截和批量操作仍然需要托管浏览器或原始 CDP 配置文件

  </Accordion>
</AccordionGroup>

## 沙箱和记忆

<AccordionGroup>
  <Accordion title="有专门的沙箱文档吗？">
    有。请参阅[沙箱](/gateway/sandboxing)。有关 Docker 特定设置（Docker 中的完整 Gateway 或沙箱镜像），请参阅 [Docker](/install/docker)。
  </Accordion>

  <Accordion title="Docker 感觉受限——如何启用完整功能？">
    默认镜像是安全优先的，以 `node` 用户身份运行，因此不包括系统包、Homebrew 或捆绑的浏览器。对于更完整的设置：

    - 使用 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，使缓存能够存活。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 将系统依赖烘焙到镜像中。
    - 通过捆绑的 CLI 安装 Playwright 浏览器：`node /app/node_modules/playwright-core/cli.js install chromium`
    - 设置 `PLAYWRIGHT_BROWSERS_PATH` 并确保路径被持久化。

    文档：[Docker](/install/docker)、[浏览器](/tools/browser)。

  </Accordion>

  <Accordion title="我可以保持 DM 私密但让群组使用一个代理公开/沙箱化吗？">
    可以——如果您的私人流量是 **DM**，您的公共流量是**群组**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，以便群组/频道会话（非主键）在配置的沙箱后端中运行，而主 DM 会话保留在主机上。如果您不选择后端，Docker 是默认后端。然后通过 `tools.sandbox.tools` 限制沙箱会话中可用的工具。

    设置演练 + 示例配置：[群组：个人 DM + 公共群组](/channels/groups#pattern-personal-dms-public-groups-single-agent)

    关键配置参考：[Gateway 配置](/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何将主机文件夹绑定到沙箱中？">
    将 `agents.defaults.sandbox.docker.binds` 设置为 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全局 + 每代理绑定合并；当 `scope: "shared"` 时忽略每代理绑定。对任何敏感内容使用 `:ro`，并记住绑定会绕过沙箱文件系统墙。

    OpenClaw 根据规范化路径和通过最深现有祖先解析的规范路径验证绑定来源。这意味着即使最后一个路径段尚不存在，符号链接父级逃逸也会失败关闭，并且允许的根检查在符号链接解析后仍然适用。

    请参阅[沙箱](/gateway/sandboxing#custom-bind-mounts)和[沙箱与工具策略与提升](/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)以获取示例和安全说明。

  </Accordion>

  <Accordion title="记忆如何工作？">
    OpenClaw 记忆只是代理工作区中的 Markdown 文件：

    - `memory/YYYY-MM-DD.md` 中的每日笔记
    - `MEMORY.md` 中精心策划的长期笔记（仅限主/私人会话）

    OpenClaw 还在自动压缩之前运行**静默预压缩记忆刷新**，提醒模型写入持久笔记。这仅在工作区可写时运行（只读沙箱跳过它）。请参阅[记忆](/concepts/memory)。

  </Accordion>

  <Accordion title="记忆一直在忘记事情。如何让它粘住？">
    让机器人**将事实写入记忆**。长期笔记属于 `MEMORY.md`，短期上下文进入 `memory/YYYY-MM-DD.md`。

    这仍然是我们正在改进的领域。提醒模型存储记忆有帮助；它会知道该怎么做。如果它一直忘记，验证 Gateway 在每次运行时是否使用相同的工作区。

    文档：[记忆](/concepts/memory)、[代理工作区](/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="记忆是否永久持久？有哪些限制？">
    记忆文件存储在磁盘上，直到您删除它们才会持久。限制是您的存储，而不是模型。**会话上下文**仍然受到模型上下文窗口的限制，因此长时间对话可以压缩或截断。这就是为什么存在记忆搜索——它只将相关部分拉回上下文。

    文档：[记忆](/concepts/memory)、[上下文](/concepts/context)。

  </Accordion>

  <Accordion title="语义记忆搜索需要 OpenAI API 密钥吗？">
    仅当您使用 **OpenAI 嵌入**时。Codex OAuth 涵盖 chat/completions，**不**授予嵌入访问权限，因此**使用 Codex 登录（OAuth 或 Codex CLI 登录）**对于语义记忆搜索没有帮助。OpenAI 嵌入仍然需要真实的 API 密钥（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果您没有显式设置提供商，OpenClaw 在可以解析 API 密钥时自动选择提供商（认证配置文件、`models.providers.*.apiKey` 或环境变量）。如果 OpenAI 密钥解析，它优先选择 OpenAI，否则如果 Gemini 密钥解析则选择 Gemini，然后是 Voyage，然后是 Mistral。如果没有远程密钥可用，记忆搜索保持禁用，直到您配置它。如果您配置了本地模型路径并且存在，OpenClaw 优先选择 `local`。当您显式设置 `memorySearch.provider = "ollama"` 时，支持 Ollama。

    如果您更喜欢保持本地，设置 `memorySearch.provider = "local"`（以及可选的 `memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，设置 `memorySearch.provider = "gemini"` 并提供 `GEMINI_API_KEY`（或 `memorySearch.remote.apiKey`）。我们支持 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本地**嵌入模型——请参阅[记忆](/concepts/memory)了解设置详情。

  </Accordion>
</AccordionGroup>

## 事物在磁盘上的位置

<AccordionGroup>
  <Accordion title="OpenClaw 使用的所有数据都本地保存吗？">
    不——**OpenClaw 的状态是本地的**，但**外部服务仍然看到您发送给它们的内容**。

    - **默认本地：**会话、记忆文件、配置和工作区位于 Gateway 主机上（`~/.openclaw` + 您的工作区目录）。
    - **出于必要的远程：**您发送给模型提供商（Anthropic/OpenAI 等）的消息发送到他们的 API，聊天平台（WhatsApp/Telegram/Slack 等）在其服务器上存储消息数据。
    - **您控制占用空间：**使用本地模型将提示保留在您的机器上，但频道流量仍然通过频道服务器。

    相关：[代理工作区](/concepts/agent-workspace)、[记忆](/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 在哪里存储数据？">
    所有内容都存储在 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）下：

    | 路径                                                              | 用途                                                               |
    | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                               | 主配置（JSON5）                                                     |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                      | 旧版 OAuth 导入（首次使用时复制到认证配置文件）                        |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json`   | 认证配置文件（OAuth、API 密钥和可选的 `keyRef`/`tokenRef`）           |
    | `$OPENCLAW_STATE_DIR/secrets.json`                                | 可选的文件支持的 `file` SecretRef 提供商的密钥负载                     |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`            | 旧版兼容性文件（已清除静态 `api_key` 条目）                           |
    | `$OPENCLAW_STATE_DIR/credentials/`                                | 提供商状态（例如 `whatsapp/<accountId>/creds.json`）                  |
    | `$OPENCLAW_STATE_DIR/agents/`                                     | 每代理状态（agentDir + 会话）                                        |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                  | 对话历史和状态（每代理）                                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`     | 会话元数据（每代理）                                                  |

    旧版单代理路径：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）。

    您的**工作区**（AGENTS.md、记忆文件、技能等）是独立的，通过 `agents.defaults.workspace`（默认：`~/.openclaw/workspace`）配置。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里？">
    这些文件位于**代理工作区**中，而不是 `~/.openclaw`。

    - **工作区（每代理）**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、`MEMORY.md`、`memory/YYYY-MM-DD.md`、可选的 `HEARTBEAT.md`。小写根 `memory.md` 仅用于旧版修复输入；当两个文件都存在时，`openclaw doctor --fix` 可以将其合并到 `MEMORY.md`。
    - **状态目录（`~/.openclaw`）**：配置、频道/提供商状态、认证配置文件、会话、日志和共享技能（`~/.openclaw/skills`）。

    默认工作区是 `~/.openclaw/workspace`，可通过以下方式配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果机器人在重启后"忘记"，请确认 Gateway 在每次启动时使用相同的工作区（并记住：远程模式使用的是**Gateway 主机**的工作区，而不是您本地的笔记本电脑）。

    提示：如果您想要持久的行为或偏好，让机器人**将其写入 AGENTS.md 或 MEMORY.md**，而不是依赖聊天历史。

    请参阅[代理工作区](/concepts/agent-workspace)和[记忆](/concepts/memory)。

  </Accordion>

  <Accordion title="推荐的备份策略">
    将您的**代理工作区**放在**私有** git 仓库中，并将其备份到某个私有位置（例如 GitHub 私有）。这会捕获记忆 + AGENTS/SOUL/USER 文件，并让您稍后恢复助手的"思维"。

    **不要**提交 `~/.openclaw` 下的任何内容（凭证、会话、令牌或加密的密钥负载）。如果您需要完整恢复，请分别备份工作区和状态目录（请参阅上面的迁移问题）。

    文档：[代理工作区](/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="如何完全卸载 OpenClaw？">
    请参阅专用指南：[卸载](/install/uninstall)。
  </Accordion>

  <Accordion title="代理可以在工作区外工作吗？">
    可以。工作区是**默认 cwd** 和记忆锚点，不是硬沙箱。相对路径在工作区内解析，但绝对路径可以访问其他主机位置，除非启用了沙箱。如果您需要隔离，使用 [`agents.defaults.sandbox`](/gateway/sandboxing) 或每代理沙箱设置。如果您想要一个仓库作为默认工作目录，将该代理的 `workspace` 指向仓库根目录。OpenClaw 仓库只是源代码；除非您有意希望代理在其中工作，否则请将工作区分开。

    示例（仓库作为默认 cwd）：

    ```json5
    {
      agents: {
        defaults: {
          workspace: "~/Projects/my-repo",
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="远程模式：会话存储在哪里？">
    会话状态由 **Gateway 主机**拥有。如果您处于远程模式，您关心的会话存储在远程机器上，而不是您的本地笔记本电脑。请参阅[会话管理](/concepts/session)。
  </Accordion>
</AccordionGroup>

## 配置基础

<AccordionGroup>
  <Accordion title="配置是什么格式的？在哪里？">
    OpenClaw 从 `$OPENCLAW_CONFIG_PATH`（默认：`~/.openclaw/openclaw.json`）读取可选的 **JSON5** 配置：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果文件缺失，它使用相对安全的默认值（包括默认工作区 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我设置了 gateway.bind: "lan"（或 "tailnet"），现在什么都不监听 / UI 显示未授权'>
    非回环绑定**需要有效的 Gateway 认证路径**。实际上这意味着：

    - 共享密钥认证：令牌或密码
    - `gateway.auth.mode: "trusted-proxy"` 在正确配置的身份感知反向代理后面

    ```json5
    {
      gateway: {
        bind: "lan",
        auth: {
          mode: "token",
          token: "replace-me",
        },
      },
    }
    ```

    注意：

    - `gateway.remote.token` / `.password` 本身**不**启用本地 Gateway 认证。
    - 仅当 `gateway.auth.*` 未设置时，本地调用路径可以使用 `gateway.remote.*` 作为回退。
    - 对于密码认证，设置 `gateway.auth.mode: "password"` 加上 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置且未解析，解析失败关闭（没有远程回退掩盖）。
    - 共享密钥 Control UI 设置通过 `connect.params.auth.token` 或 `connect.params.auth.password`（存储在应用/UI 设置中）进行认证。Tailscale Serve 或 `trusted-proxy` 等携带身份的模式改用请求头。避免将共享密钥放在 URL 中。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 时，同主机回环反向代理需要显式的 `gateway.auth.trustedProxy.allowLoopback = true` 和 `gateway.trustedProxies` 中的回环条目。

  </Accordion>

  <Accordion title="为什么现在 localhost 需要令牌？">
    OpenClaw 默认强制执行 Gateway 认证，包括回环。在正常默认路径中，这意味着令牌认证：如果没有配置显式认证路径，Gateway 启动解析为令牌模式并自动生成一个，将其保存到 `gateway.auth.token`，因此**本地 WS 客户端必须进行认证**。这阻止其他本地进程调用 Gateway。

    如果您更喜欢不同的认证路径，您可以显式选择密码模式（或者对于身份感知反向代理，选择 `trusted-proxy`）。如果您**真的**想要开放回环，在您的配置中显式设置 `gateway.auth.mode: "none"`。Doctor 随时可以为您生成令牌：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="更改配置后是否需要重启？">
    Gateway 监视配置并支持热重载：

    - `gateway.reload.mode: "hybrid"`（默认）：热应用安全更改，对关键更改重启
    - `hot`、`restart`、`off` 也受支持

  </Accordion>

  <Accordion title="如何禁用有趣的 CLI 标语？">
    在配置中设置 `cli.banner.taglineMode`：

    ```json5
    {
      cli: {
        banner: {
          taglineMode: "off", // random | default | off
        },
      },
    }
    ```

    - `off`：隐藏标语文本但保留横幅标题/版本行。
    - `default`：每次使用 `All your chats, one OpenClaw.`。
    - `random`：旋转有趣/季节性标语（默认行为）。
    - 如果您想完全没有横幅，设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何启用网络搜索（和网络抓取）？">
    `web_fetch` 无需 API 密钥即可工作。`web_search` 取决于您选择的提供商：

    - Brave、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Perplexity 和 Tavily 等 API 支持的提供商需要其正常的 API 密钥设置。
    - Ollama Web Search 无需密钥，但使用您配置的 Ollama 主机并需要 `ollama signin`。
    - DuckDuckGo 无需密钥，但它是基于非官方 HTML 的集成。
    - SearXNG 无需密钥/自托管；配置 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **推荐：**运行 `openclaw configure --section web` 并选择提供商。
    环境变量替代方案：

    - Brave：`BRAVE_API_KEY`
    - Exa：`EXA_API_KEY`
    - Firecrawl：`FIRECRAWL_API_KEY`
    - Gemini：`GEMINI_API_KEY`
    - Grok：`XAI_API_KEY`
    - Kimi：`KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
    - MiniMax Search：`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`
    - Perplexity：`PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`
    - SearXNG：`SEARXNG_BASE_URL`
    - Tavily：`TAVILY_API_KEY`

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "BRAVE_API_KEY_HERE",
              },
            },
          },
        },
        },
        tools: {
          web: {
            search: {
              enabled: true,
              provider: "brave",
              maxResults: 5,
            },
            fetch: {
              enabled: true,
              provider: "firecrawl", // 可选；省略以自动检测
            },
          },
        },
    }
    ```

    提供商特定的 web 搜索配置现在位于 `plugins.entries.<plugin>.config.webSearch.*` 下。旧版 `tools.web.search.*` 提供商路径仍然临时加载以保持兼容性，但不应该用于新配置。Firecrawl web 抓取回退配置位于 `plugins.entries.firecrawl.config.webFetch.*` 下。

    注意：

    - 如果您使用白名单，添加 `web_search`/`web_fetch`/`x_search` 或 `group:web`。
    - `web_fetch` 默认启用（除非显式禁用）。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 从可用凭证中自动检测第一个就绪的抓取回退提供商。今天捆绑的提供商是 Firecrawl。
    - 守护进程从 `~/.openclaw/.env`（或服务环境）读取环境变量。

    文档：[Web 工具](/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清空了我的配置。如何恢复以及如何避免？">
    `config.apply` 替换**整个配置**。如果您发送部分对象，其他所有内容都会被删除。

    当前 OpenClaw 保护许多意外覆盖：

    - OpenClaw 拥有的配置写入在写入之前验证完整的后更改配置。
    - 无效或破坏性的 OpenClaw 拥有的写入被拒绝并保存为 `openclaw.json.rejected.*`。
    - 如果直接编辑破坏了启动或热重载，Gateway 失败关闭或跳过重载；它不会重写 `openclaw.json`。
    - `openclaw doctor --fix` 拥有修复，可以在将拒绝的文件保存为 `openclaw.json.clobbered.*` 的同时恢复最后已知良好的状态。

    恢复：

    - 检查 `openclaw logs --follow` 中的 `Invalid config at`、`Config write rejected:` 或 `config reload skipped (invalid config)`。
    - 检查活动配置旁边最新的 `openclaw.json.clobbered.*` 或 `openclaw.json.rejected.*`。
    - 运行 `openclaw config validate` 和 `openclaw doctor --fix`。
    - 使用 `openclaw config set` 或 `config.patch` 仅复制回预期的键。
    - 如果您没有最后已知良好或拒绝的负载，从备份恢复，或重新运行 `openclaw doctor` 并重新配置频道/模型。
    - 如果这是意外的，请提交 bug 并包含您最后已知的配置或任何备份。
    - 本地编码代理通常可以从日志或历史记录中重建工作配置。

    避免：

    - 使用 `openclaw config set` 进行小更改。
    - 使用 `openclaw configure` 进行交互式编辑。
    - 在不确定确切路径或字段形状时，先使用 `config.schema.lookup`；它返回浅模式节点加上用于向下钻取的直接子摘要。
    - 使用 `config.patch` 进行部分 RPC 编辑；仅将 `config.apply` 用于完整配置替换。
    - 如果您从代理运行中使用所有者专属的 `gateway` 工具，它仍然会拒绝对 `tools.exec.ask` / `tools.exec.security` 的写入（包括规范化为相同受保护 exec 路径的旧版 `tools.bash.*` 别名）。

    文档：[配置](/cli/config)、[Configure](/cli/configure)、[Gateway 故障排除](/gateway/troubleshooting#gateway-rejected-invalid-config)、[Doctor](/gateway/doctor)。

  </Accordion>

  <Accordion title="如何跨设备运行具有专业工作进程的中央 Gateway？">
    常见模式是**一个 Gateway**（例如 Raspberry Pi）加上**节点**和**代理**：

    - **Gateway（中央）：**拥有频道（Signal/WhatsApp）、路由和会话。
    - **节点（设备）：**Mac/iOS/Android 作为外围设备连接，公开本地工具（`system.run`、`canvas`、`camera`）。
    - **代理（工作进程）：**特殊角色的独立大脑/工作区（例如"Hetzner 运维"、"个人数据"）。
    - **子代理：**当您想要并行处理时，从主代理生成后台工作。
    - **TUI：**连接到 Gateway 并切换代理/会话。

    文档：[节点](/nodes)、[远程访问](/gateway/remote)、[多代理路由](/concepts/multi-agent)、[子代理](/tools/subagents)、[TUI](/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 浏览器可以无头运行吗？">
    可以。这是一个配置选项：

    ```json5
    {
      browser: { headless: true },
      agents: {
        defaults: {
          sandbox: { browser: { headless: true } },
        },
      },
    }
    ```

    默认是 `false`（有界面）。无头模式在某些网站上更容易触发反机器人检查。请参阅[浏览器](/tools/browser)。

    无头使用**相同的 Chromium 引擎**，适用于大多数自动化（表单、点击、抓取、登录）。主要区别：

    - 没有可见的浏览器窗口（如果您需要视觉，使用截图）。
    - 一些网站对无头模式下的自动化更严格（验证码、反机器人）。例如，X/Twitter 经常阻止无头会话。

  </Accordion>

  <Accordion title="如何使用 Brave 进行浏览器控制？">
    将 `browser.executablePath` 设置为您的 Brave 二进制文件（或任何基于 Chromium 的浏览器）并重启 Gateway。请参阅[浏览器](/tools/browser#use-brave-or-another-chromium-based-browser)中的完整配置示例。
  </Accordion>
</AccordionGroup>

## 远程 Gateway 和节点

<AccordionGroup>
  <Accordion title="命令如何在 Telegram、Gateway 和节点之间传播？">
    Telegram 消息由 **Gateway** 处理。Gateway 运行代理，只有在需要节点工具时才通过 **Gateway WebSocket** 调用节点：

    Telegram → Gateway → 代理 → `node.*` → 节点 → Gateway → Telegram

    节点不看到入站提供商流量；它们只接收节点 RPC 调用。

  </Accordion>

  <Accordion title="如果 Gateway 是远程托管的，我的代理如何访问我的计算机？">
    简短回答：**将您的计算机配对为节点**。Gateway 在其他地方运行，但它可以通过 Gateway WebSocket 在您的本地机器上调用 `node.*` 工具（屏幕、摄像头、系统）。

    典型设置：

    1. 在始终在线的主机（VPS/家庭服务器）上运行 Gateway。
    2. 将 Gateway 主机和您的计算机放在同一个 tailnet 上。
    3. 确保 Gateway WS 可达（tailnet 绑定或 SSH 隧道）。
    4. 在本地打开 macOS 应用，以**通过 SSH 远程**模式（或直接 tailnet）连接，以便它可以注册为节点。
    5. 在 Gateway 上批准节点：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要单独的 TCP 桥；节点通过 Gateway WebSocket 连接。

    安全提醒：配对 macOS 节点允许在该机器上运行 `system.run`。只配对您信任的设备，并审阅[安全](/gateway/security)。

    文档：[节点](/nodes)、[Gateway 协议](/gateway/protocol)、[macOS 远程模式](/platforms/mac/remote)、[安全](/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已连接但没有回复。现在怎么办？">
    检查基础知识：

    - Gateway 正在运行：`openclaw gateway status`
    - Gateway 健康：`openclaw status`
    - 频道健康：`openclaw channels status`

    然后验证认证和路由：

    - 如果您使用 Tailscale Serve，确保 `gateway.auth.allowTailscale` 设置正确。
    - 如果您通过 SSH 隧道连接，确认本地隧道已启动并指向正确的端口。
    - 确认您的白名单（DM 或群组）包含您的账户。

    文档：[Tailscale](/gateway/tailscale)、[远程访问](/gateway/remote)、[频道](/channels)。

  </Accordion>

  <Accordion title="两个 OpenClaw 实例可以互相通话（本地 + VPS）吗？">
    可以。没有内置的"机器人到机器人"桥，但您可以通过几种可靠的方式连接它：

    **最简单：**使用两个机器人都可以访问的普通聊天频道（Telegram/Slack/WhatsApp）。让机器人 A 向机器人 B 发送消息，然后让机器人 B 像往常一样回复。

    **CLI 桥（通用）：**运行一个脚本，使用 `openclaw agent --message ... --deliver` 调用另一个 Gateway，针对另一个机器人监听的聊天。如果一个机器人在远程 VPS 上，通过 SSH/Tailscale 将您的 CLI 指向该远程 Gateway（请参阅[远程访问](/gateway/remote)）。

    示例模式（从可以访问目标 Gateway 的机器运行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：添加防护栏以防止两个机器人无休止地循环（仅限提及、频道白名单或"不回复机器人消息"规则）。

    文档：[远程访问](/gateway/remote)、[代理 CLI](/cli/agent)、[代理发送](/tools/agent-send)。

  </Accordion>

  <Accordion title="多个代理需要独立的 VPS 吗？">
    不需要。一个 Gateway 可以托管多个代理，每个代理都有自己的工作区、模型默认值和路由。这是正常的设置，比每个代理运行一个 VPS 便宜且简单得多。

    只有在需要硬隔离（安全边界）或非常不同的您不想共享的配置时，才使用独立的 VPS。否则，保留一个 Gateway 并使用多个代理或子代理。

  </Accordion>

  <Accordion title="在个人笔记本电脑上使用节点比从 VPS SSH 有什么好处？">
    是的——节点是从远程 Gateway 访问笔记本电脑的第一类方式，它们解锁的不仅仅是 shell 访问。Gateway 在 macOS/Linux（通过 WSL2 的 Windows）上运行，重量轻（小型 VPS 或树莓派级别的盒子就可以；4 GB RAM 够用），因此常见的设置是始终在线的主机加上您的笔记本电脑作为节点。

    - **不需要入站 SSH。**节点连接到 Gateway WebSocket 并使用设备配对。
    - **更安全的执行控制。**`system.run` 由该笔记本电脑上的节点白名单/批准门控。
    - **更多设备工具。**节点除了 `system.run` 外还公开 `canvas`、`camera` 和 `screen`。
    - **本地浏览器自动化。**将 Gateway 保留在 VPS 上，但通过笔记本电脑上的节点主机在本地运行 Chrome，或通过 Chrome MCP 附加到主机上的本地 Chrome。

    SSH 适合临时 shell 访问，但节点对于持续的代理工作流和设备自动化更简单。

    文档：[节点](/nodes)、[节点 CLI](/cli/nodes)、[浏览器](/tools/browser)。

  </Accordion>

  <Accordion title="节点运行 Gateway 服务吗？">
    不。每个主机只应该运行**一个 Gateway**，除非您有意运行隔离的配置文件（请参阅[多个 Gateway](/gateway/multiple-gateways)）。节点是连接到 Gateway 的外围设备（iOS/Android 节点，或菜单栏应用中的 macOS"节点模式"）。对于无头节点主机和 CLI 控制，请参阅[节点主机 CLI](/cli/node)。

    `gateway`、`discovery` 和 `canvasHost` 更改需要完全重启。

  </Accordion>

  <Accordion title="有 API / RPC 方式应用配置吗？">
    有。

    - `config.schema.lookup`：在写入之前检查一个配置子树，包含其浅模式节点、匹配的 UI 提示和直接子摘要
    - `config.get`：获取当前快照 + 哈希
    - `config.patch`：安全的部分更新（大多数 RPC 编辑的首选）；在可能时热重载，在需要时重启
    - `config.apply`：验证 + 替换完整配置；在可能时热重载，在需要时重启
    - 所有者专属的 `gateway` 运行时工具仍然拒绝重写 `tools.exec.ask` / `tools.exec.security`；旧版 `tools.bash.*` 别名规范化为相同的受保护 exec 路径

  </Accordion>

  <Accordion title="首次安装的最小合理配置">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    这设置了您的工作区并限制了谁可以触发机器人。

  </Accordion>

  <Accordion title="如何在 VPS 上设置 Tailscale 并从 Mac 连接？">
    最小步骤：

    1. **在 VPS 上安装 + 登录**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在 Mac 上安装 + 登录**
       - 使用 Tailscale 应用并登录到同一个 tailnet。
    3. **启用 MagicDNS（推荐）**
       - 在 Tailscale 管理控制台中，启用 MagicDNS，以便 VPS 有稳定的名称。
    4. **使用 tailnet 主机名**
       - SSH：`ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS：`ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您想要没有 SSH 的 Control UI，在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    这将 Gateway 绑定到回环并通过 Tailscale 公开 HTTPS。请参阅 [Tailscale](/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何将 Mac 节点连接到远程 Gateway（Tailscale Serve）？">
    Serve 公开 **Gateway Control UI + WS**。节点通过相同的 Gateway WS 端点连接。

    推荐设置：

    1. **确保 VPS + Mac 在同一个 tailnet 上**。
    2. **以远程模式使用 macOS 应用**（SSH 目标可以是 tailnet 主机名）。应用将隧道 Gateway 端口并作为节点连接。
    3. **在 Gateway 上批准节点**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文档：[Gateway 协议](/gateway/protocol)、[发现](/gateway/discovery)、[macOS 远程模式](/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我应该在第二台笔记本电脑上安装还是只添加一个节点？">
    如果您只需要第二台笔记本电脑上的**本地工具**（屏幕/摄像头/执行），将其添加为**节点**。这样可以保持单一 Gateway 并避免重复配置。本地节点工具目前仅限 macOS，但我们计划将其扩展到其他操作系统。

    仅当您需要**硬隔离**或两个完全独立的机器人时才安装第二个 Gateway。

    文档：[节点](/nodes)、[节点 CLI](/cli/nodes)、[多个 Gateway](/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 环境变量和 .env 加载

<AccordionGroup>
  <Accordion title="OpenClaw 如何加载环境变量？">
    OpenClaw 从父进程（shell、launchd/systemd、CI 等）读取环境变量，并额外加载：

    - 当前工作目录中的 `.env`
    - `~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`）中的全局回退 `.env`

    这两个 `.env` 文件都不会覆盖现有的环境变量。

    您还可以在配置中定义内联环境变量（仅在进程环境中缺失时应用）：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    请参阅 [/environment](/help/environment) 了解完整优先级和来源。

  </Accordion>

  <Accordion title="我通过服务启动了 Gateway，我的环境变量消失了。现在怎么办？">
    两种常见修复：

    1. 将缺少的密钥放在 `~/.openclaw/.env` 中，这样即使服务不继承您的 shell 环境，它们也会被获取。
    2. 启用 shell 导入（可选加入的便利功能）：

    ```json5
    {
      env: {
        shellEnv: {
          enabled: true,
          timeoutMs: 15000,
        },
      },
    }
    ```

    这会运行您的登录 shell 并仅导入缺少的预期密钥（永不覆盖）。等效的环境变量：`OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我设置了 COPILOT_GITHUB_TOKEN，但 models status 显示 "Shell env: off"。为什么？'>
    `openclaw models status` 报告**shell 环境导入**是否已启用。"Shell env: off"**并不**意味着您的环境变量缺失——它只是意味着 OpenClaw 不会自动加载您的登录 shell。

    如果 Gateway 作为服务运行（launchd/systemd），它不会继承您的 shell 环境。通过以下任一方式修复：

    1. 将令牌放在 `~/.openclaw/.env` 中：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或启用 shell 导入（`env.shellEnv.enabled: true`）。
    3. 或将其添加到您的配置 `env` 块（仅在缺失时应用）。

    然后重启 Gateway 并重新检查：

    ```bash
    openclaw models status
    ```

    Copilot 令牌从 `COPILOT_GITHUB_TOKEN`（也包括 `GH_TOKEN` / `GITHUB_TOKEN`）读取。请参阅 [/concepts/model-providers](/concepts/model-providers) 和 [/environment](/help/environment)。

  </Accordion>
</AccordionGroup>

## 会话和多个聊天

<AccordionGroup>
  <Accordion title="如何开始新对话？">
    将 `/new` 或 `/reset` 作为独立消息发送。请参阅[会话管理](/concepts/session)。
  </Accordion>

  <Accordion title="如果我从不发送 /new，会话会自动重置吗？">
    会话可以在 `session.idleMinutes` 后过期，但这**默认禁用**（默认 **0**）。将其设置为正值以启用空闲过期。当启用时，空闲期之后的**下一条**消息为该聊天键启动新的会话 ID。这不会删除脚本——它只是启动新会话。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有办法组建一个 OpenClaw 实例团队（一个 CEO 和多个代理）吗？">
    有，通过**多代理路由**和**子代理**。您可以创建一个协调器代理和几个具有自己工作区和模型的工作者代理。

    话虽如此，这最好被视为**有趣的实验**。它令牌消耗很大，通常比使用一个具有独立会话进行并行工作的机器人效率低。我们设想的典型模式是一个您与之交谈的机器人，具有用于并行工作的不同会话。该机器人在需要时也可以生成子代理。

    文档：[多代理路由](/concepts/multi-agent)、[子代理](/tools/subagents)、[代理 CLI](/cli/agents)。

  </Accordion>

  <Accordion title="为什么上下文在任务中途被截断？如何防止？">
    会话上下文受到模型窗口的限制。长聊天、大量工具输出或许多文件可能触发压缩或截断。

    有帮助的做法：

    - 让机器人总结当前状态并将其写入文件。
    - 在长任务之前使用 `/compact`，在切换主题时使用 `/new`。
    - 将重要上下文保留在工作区中，让机器人将其读回。
    - 对长期或并行工作使用子代理，以保持主聊天更小。
    - 如果这种情况经常发生，选择具有更大上下文窗口的模型。

  </Accordion>

  <Accordion title="如何在保持安装的情况下完全重置 OpenClaw？">
    使用重置命令：

    ```bash
    openclaw reset
    ```

    非交互式完全重置：

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    然后重新运行设置：

    ```bash
    openclaw onboard --install-daemon
    ```

    注意：

    - 如果引导程序看到现有配置，也会提供**重置**选项。请参阅[引导（CLI）](/start/wizard)。
    - 如果您使用了配置文件（`--profile` / `OPENCLAW_PROFILE`），重置每个状态目录（默认是 `~/.openclaw-<profile>`）。
    - 开发重置：`openclaw gateway --dev --reset`（仅限开发；清除开发配置 + 凭证 + 会话 + 工作区）。

  </Accordion>

  <Accordion title='我遇到了 "context too large" 错误——如何重置或压缩？'>
    使用以下任一方式：

    - **压缩**（保留对话但总结旧轮次）：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 来指导摘要。

    - **重置**（相同聊天键的新会话 ID）：

      ```
      /new
      /reset
      ```

    如果这种情况持续发生：

    - 启用或调整**会话修剪**（`agents.defaults.contextPruning`）以修剪旧工具输出。
    - 使用具有更大上下文窗口的模型。

    文档：[压缩](/concepts/compaction)、[会话修剪](/concepts/session-pruning)、[会话管理](/concepts/session)。

  </Accordion>

  <Accordion title='为什么我看到 "LLM request rejected: messages.content.tool_use.input field required"？'>
    这是提供商验证错误：模型发出了没有所需 `input` 的 `tool_use` 块。这通常意味着会话历史陈旧或损坏（通常在长线程或工具/模式更改后）。

    修复：使用 `/new`（独立消息）开始新会话。

  </Accordion>

  <Accordion title="为什么每 30 分钟我会收到心跳消息？">
    默认情况下心跳每 **30 分钟**运行一次（使用 OAuth 认证时为 **1 小时**）。调整或禁用它们：

    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "2h", // 或 "0m" 以禁用
          },
        },
      },
    }
    ```

    如果 `HEARTBEAT.md` 存在但实际上为空（只有空行和 `# 标题` 等 markdown 标题），OpenClaw 会跳过心跳运行以节省 API 调用。如果文件缺失，心跳仍然运行，模型决定做什么。

    每代理覆盖使用 `agents.list[].heartbeat`。文档：[心跳](/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我需要在 WhatsApp 群组中添加"机器人账户"吗？'>
    不需要。OpenClaw 在**您自己的账户**上运行，所以如果您在群组中，OpenClaw 可以看到它。默认情况下，群组回复被阻止，直到您允许发送者（`groupPolicy: "allowlist"`）。

    如果您只想让**您自己**能够触发群组回复：

    ```json5
    {
      channels: {
        whatsapp: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="如何获取 WhatsApp 群组的 JID？">
    选项 1（最快）：尾随日志并在群组中发送测试消息：

    ```bash
    openclaw logs --follow --json
    ```

    查找以 `@g.us` 结尾的 `chatId`（或 `from`），如：`1234567890-1234567890@g.us`。

    选项 2（如果已配置/白名单）：从配置中列出群组：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文档：[WhatsApp](/channels/whatsapp)、[目录](/cli/directory)、[日志](/cli/logs)。

  </Accordion>

  <Accordion title="为什么 OpenClaw 不在群组中回复？">
    两个常见原因：

    - 提及门控已开启（默认）。您必须 @提及机器人（或匹配 `mentionPatterns`）。
    - 您配置了 `channels.whatsapp.groups` 但没有 `"*"`，且该群组未在白名单中。

    请参阅[群组](/channels/groups)和[群组消息](/channels/group-messages)。

  </Accordion>

  <Accordion title="群组/线程与 DM 共享上下文吗？">
    直接聊天默认折叠为主会话。群组/频道有自己的会话键，Telegram 话题 / Discord 线程是独立的会话。请参阅[群组](/channels/groups)和[群组消息](/channels/group-messages)。
  </Accordion>

  <Accordion title="我可以创建多少个工作区和代理？">
    没有硬性限制。几十个（甚至几百个）都可以，但请注意：

    - **磁盘增长：**会话 + 脚本存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **令牌成本：**更多代理意味着更多并发模型使用。
    - **运维开销：**每代理认证配置文件、工作区和频道路由。

    提示：

    - 每代理保留一个**活动**工作区（`agents.defaults.workspace`）。
    - 如果磁盘增长，修剪旧会话（删除 JSONL 或存储条目）。
    - 使用 `openclaw doctor` 发现杂散工作区和配置文件不匹配。

  </Accordion>

  <Accordion title="我可以同时运行多个机器人或聊天（Slack）吗？如何设置？">
    可以。使用**多代理路由**来运行多个隔离的代理，并按频道/账户/对等方路由入站消息。Slack 作为频道受支持，可以绑定到特定代理。

    浏览器访问功能强大，但不是"做人类可以做的任何事"——反机器人、验证码和 MFA 仍然可以阻止自动化。对于最可靠的浏览器控制，在主机上使用本地 Chrome MCP，或在实际运行浏览器的机器上使用 CDP。

    最佳实践设置：

    - 始终在线的 Gateway 主机（VPS/Mac mini）。
    - 每个角色一个代理（绑定）。
    - 绑定到这些代理的 Slack 频道。
    - 在需要时通过 Chrome MCP 或节点使用本地浏览器。

    文档：[多代理路由](/concepts/multi-agent)、[Slack](/channels/slack)、[浏览器](/tools/browser)、[节点](/nodes)。

  </Accordion>
</AccordionGroup>

## 模型、故障转移和认证配置文件

模型问答——默认值、选择、别名、切换、故障转移、认证配置文件——位于[模型 FAQ](/help/faq-models)。

## Gateway：端口、"已在运行"和远程模式

<AccordionGroup>
  <Accordion title="Gateway 使用什么端口？">
    `gateway.port` 控制 WebSocket + HTTP（Control UI、钩子等）的单一多路复用端口。

    优先级：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > 默认 18789
    ```

  </Accordion>

  <Accordion title='为什么 openclaw gateway status 显示 "Runtime: running" 但 "Connectivity probe: failed"？'>
    因为"running"是**监督器**的视图（launchd/systemd/schtasks）。连接探针是 CLI 实际连接到 Gateway WebSocket。

    使用 `openclaw gateway status` 并信任这些行：

    - `Probe target:`（探针实际使用的 URL）
    - `Listening:`（端口上实际绑定的内容）
    - `Last gateway error:`（进程活着但端口未监听时的常见根本原因）

  </Accordion>

  <Accordion title='为什么 openclaw gateway status 显示 "Config (cli)" 和 "Config (service)" 不同？'>
    您正在编辑一个配置文件，而服务正在运行另一个（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修复：

    ```bash
    openclaw gateway install --force
    ```

    从您想要服务使用的相同 `--profile` / 环境运行它。

  </Accordion>

  <Accordion title='"another gateway instance is already listening" 是什么意思？'>
    OpenClaw 通过在启动时立即绑定 WebSocket 监听器（默认 `ws://127.0.0.1:18789`）强制执行运行时锁。如果绑定因 `EADDRINUSE` 失败，它会抛出 `GatewayLockError`，表示另一个实例已经在监听。

    修复：停止另一个实例，释放端口，或使用 `openclaw gateway --port <port>` 运行。

  </Accordion>

  <Accordion title="如何在远程模式下运行 OpenClaw（客户端连接到其他地方的 Gateway）？">
    设置 `gateway.mode: "remote"` 并指向远程 WebSocket URL，可选带共享密钥远程凭证：

    ```json5
    {
      gateway: {
        mode: "remote",
        remote: {
          url: "ws://gateway.tailnet:18789",
          token: "your-token",
          password: "your-password",
        },
      },
    }
    ```

    注意：

    - `openclaw gateway` 只有在 `gateway.mode` 为 `local` 时才启动（或者您传递覆盖标志）。
    - macOS 应用监视配置文件，当这些值更改时实时切换模式。
    - `gateway.remote.token` / `.password` 只是客户端侧的远程凭证；它们本身不启用本地 Gateway 认证。

  </Accordion>

  <Accordion title='Control UI 显示 "unauthorized"（或持续重连）。现在怎么办？'>
    您的 Gateway 认证路径和 UI 的认证方法不匹配。

    事实（来自代码）：

    - Control UI 在当前浏览器标签会话和所选 Gateway URL 的 `sessionStorage` 中保持令牌，因此同一标签的刷新保持工作，而不需要恢复长期 localStorage 令牌持久化。
    - 在 `AUTH_TOKEN_MISMATCH` 时，当 Gateway 返回重试提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）时，受信任的客户端可以尝试使用缓存设备令牌进行一次有界重试。
    - 该缓存令牌重试现在重用与设备令牌一起存储的缓存批准范围。显式 `deviceToken` / 显式 `scopes` 调用者仍然保留其请求的范围集，而不是继承缓存的范围。
    - 在该重试路径之外，连接认证优先级是显式共享令牌/密码首先，然后是显式 `deviceToken`，然后是存储的设备令牌，然后是引导令牌。
    - 引导令牌范围检查有角色前缀。内置引导操作员白名单只满足操作员请求；节点或其他非操作员角色仍然需要其自己角色前缀下的范围。

    修复：

    - 最快：`openclaw dashboard`（打印 + 复制 dashboard URL，尝试打开；如果无界面，显示 SSH 提示）。
    - 如果您还没有令牌：`openclaw doctor --generate-gateway-token`。
    - 如果是远程，先建立隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/`。
    - 共享密钥模式：设置 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然后在 Control UI 设置中粘贴匹配的密钥。
    - Tailscale Serve 模式：确保 `gateway.auth.allowTailscale` 已启用，并且您打开的是 Serve URL，而不是绕过 Tailscale 身份头的原始回环/tailnet URL。
    - 受信任代理模式：确保您通过配置的身份感知代理来访问，而不是原始 Gateway URL。同主机回环代理还需要 `gateway.auth.trustedProxy.allowLoopback = true`。
    - 如果一次重试后不匹配仍然存在，轮换/重新批准配对的设备令牌：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果该轮换调用说被拒绝，检查两件事：
      - 配对设备会话只能轮换**自己的**设备，除非他们也有 `operator.admin`
      - 显式 `--scope` 值不能超过调用者的当前操作员范围
    - 仍然卡住？运行 `openclaw status --all` 并跟随[故障排除](/gateway/troubleshooting)。请参阅 [Dashboard](/web/dashboard) 了解认证详情。

  </Accordion>

  <Accordion title="我设置了 gateway.bind tailnet 但它无法绑定且没有任何监听">
    `tailnet` 绑定从您的网络接口选择 Tailscale IP（100.64.0.0/10）。如果机器不在 Tailscale 上（或接口已关闭），就没有可绑定的内容。

    修复：

    - 在该主机上启动 Tailscale（使其具有 100.x 地址），或
    - 切换到 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是显式的。`auto` 优先选择回环；当您只想要 tailnet 绑定时，使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="我可以在同一台主机上运行多个 Gateway 吗？">
    通常不可以——一个 Gateway 可以运行多个消息频道和代理。只有在需要冗余（例如：救援机器人）或硬隔离时才使用多个 Gateway。

    可以，但您必须隔离：

    - `OPENCLAW_CONFIG_PATH`（每实例配置）
    - `OPENCLAW_STATE_DIR`（每实例状态）
    - `agents.defaults.workspace`（工作区隔离）
    - `gateway.port`（唯一端口）

    快速设置（推荐）：

    - 每个实例使用 `openclaw --profile <name> ...`（自动创建 `~/.openclaw-<name>`）。
    - 在每个配置文件配置中设置唯一的 `gateway.port`（或为手动运行传递 `--port`）。
    - 安装每配置文件服务：`openclaw --profile <name> gateway install`。

    配置文件还后缀服务名称（`ai.openclaw.<profile>`；旧版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。完整指南：[多个 Gateway](/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='"invalid handshake" / 代码 1008 是什么意思？'>
    Gateway 是一个 **WebSocket 服务器**，它期望第一条消息是 `connect` 帧。如果它收到其他任何内容，它会以**代码 1008**（策略违规）关闭连接。

    常见原因：

    - 您在浏览器中打开了 **HTTP** URL（`http://...`）而不是 WS 客户端。
    - 您使用了错误的端口或路径。
    - 代理或隧道剥离了认证头或发送了非 Gateway 请求。

    快速修复：

    1. 使用 WS URL：`ws://<host>:18789`（或如果是 HTTPS，使用 `wss://...`）。
    2. 不要在普通浏览器标签中打开 WS 端口。
    3. 如果认证已开启，在 `connect` 帧中包含令牌/密码。

    如果您使用 CLI 或 TUI，URL 应该如下所示：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    协议详情：[Gateway 协议](/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 日志记录和调试

<AccordionGroup>
  <Accordion title="日志在哪里？">
    文件日志（结构化）：

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    您可以通过 `logging.file` 设置稳定路径。文件日志级别由 `logging.level` 控制。控制台详细程度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快的日志跟踪：

    ```bash
    openclaw logs --follow
    ```

    服务/监督器日志（当 Gateway 通过 launchd/systemd 运行时）：

    - macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（默认：`~/.openclaw/logs/...`；配置文件使用 `~/.openclaw-<profile>/logs/...`）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    请参阅[故障排除](/gateway/troubleshooting)了解更多。

  </Accordion>

  <Accordion title="如何启动/停止/重启 Gateway 服务？">
    使用 Gateway 助手：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手动运行 Gateway，`openclaw gateway --force` 可以重新获取端口。请参阅 [Gateway](/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上关闭了终端——如何重启 OpenClaw？">
    有**两种 Windows 安装模式**：

    **1) WSL2（推荐）：**Gateway 在 Linux 内运行。

    打开 PowerShell，进入 WSL，然后重启：

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您从未安装过服务，在前台启动它：

    ```bash
    openclaw gateway run
    ```

    **2) 原生 Windows（不推荐）：**Gateway 直接在 Windows 中运行。

    打开 PowerShell 并运行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手动运行它（没有服务），使用：

    ```powershell
    openclaw gateway run
    ```

    文档：[Windows（WSL2）](/platforms/windows)、[Gateway 服务运行手册](/gateway)。

  </Accordion>

  <Accordion title="Gateway 已启动但回复从未到达。我应该检查什么？">
    从快速健康扫描开始：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常见原因：

    - 模型认证未在 **Gateway 主机**上加载（检查 `models status`）。
    - 频道配对/白名单阻止了回复（检查频道配置 + 日志）。
    - WebChat/Dashboard 打开时没有正确的令牌。

    如果您是远程的，确认隧道/Tailscale 连接已启动，并且 Gateway WebSocket 可达。

    文档：[频道](/channels)、[故障排除](/gateway/troubleshooting)、[远程访问](/gateway/remote)。

  </Accordion>

  <Accordion title='"Disconnected from gateway: no reason" — 现在怎么办？'>
    这通常意味着 UI 失去了 WebSocket 连接。检查：

    1. Gateway 是否在运行？`openclaw gateway status`
    2. Gateway 是否健康？`openclaw status`
    3. UI 是否有正确的令牌？`openclaw dashboard`
    4. 如果是远程，隧道/Tailscale 链接是否已启动？

    然后跟踪日志：

    ```bash
    openclaw logs --follow
    ```

    文档：[Dashboard](/web/dashboard)、[远程访问](/gateway/remote)、[故障排除](/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失败。我应该检查什么？">
    从日志和频道状态开始：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然后匹配错误：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 菜单的条目太多。OpenClaw 已经修剪到 Telegram 限制并以更少的命令重试，但一些菜单条目仍然需要删除。减少插件/技能/自定义命令，或者如果您不需要菜单，禁用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或类似的网络错误：如果您在 VPS 上或在代理后面，确认允许出站 HTTPS，并且 DNS 适用于 `api.telegram.org`。

    如果 Gateway 是远程的，确保您在 Gateway 主机上查看日志。

    文档：[Telegram](/channels/telegram)、[频道故障排除](/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 没有输出。我应该检查什么？">
    首先确认 Gateway 可达且代理可以运行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 查看当前状态。如果您期望在聊天频道中回复，确保送达已启用（`/deliver on`）。

    文档：[TUI](/web/tui)、[斜线命令](/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何完全停止然后启动 Gateway？">
    如果您安装了服务：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    这会停止/启动**监督服务**（macOS 上的 launchd，Linux 上的 systemd）。当 Gateway 作为守护进程在后台运行时使用此方式。

    如果您在前台运行，使用 Ctrl-C 停止，然后：

    ```bash
    openclaw gateway run
    ```

    文档：[Gateway 服务运行手册](/gateway)。

  </Accordion>

  <Accordion title="ELI5：openclaw gateway restart 与 openclaw gateway 的区别">
    - `openclaw gateway restart`：重启**后台服务**（launchd/systemd）。
    - `openclaw gateway`：在此终端会话中**在前台**运行 Gateway。

    如果您安装了服务，使用 gateway 命令。当您想要一次性、前台运行时，使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="出现故障时获取更多详情的最快方法">
    使用 `--verbose` 启动 Gateway 以获得更多控制台详情。然后检查日志文件中的频道认证、模型路由和 RPC 错误。
  </Accordion>
</AccordionGroup>

## 媒体和附件

<AccordionGroup>
  <Accordion title="我的技能生成了图像/PDF，但没有发送任何内容">
    来自代理的出站附件必须包含 `MEDIA:<path-or-url>` 行（在自己的行上）。请参阅 [OpenClaw 助手设置](/start/openclaw) 和[代理发送](/tools/agent-send)。

    CLI 发送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    还要检查：

    - 目标频道支持出站媒体且未被白名单阻止。
    - 文件在提供商的大小限制内（图像调整大小到最大 2048px）。
    - `tools.fs.workspaceOnly=true` 将本地路径发送限制在工作区、临时/媒体存储和沙箱验证的文件。
    - `tools.fs.workspaceOnly=false` 允许 `MEDIA:` 发送代理已经可以读取的主机本地文件，但仅限于媒体加安全文档类型（图像、音频、视频、PDF 和 Office 文档）。纯文本和类密钥文件仍然被阻止。

    请参阅[图像](/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全和访问控制

<AccordionGroup>
  <Accordion title="将 OpenClaw 暴露给入站 DM 是否安全？">
    将入站 DM 视为不受信任的输入。默认值旨在降低风险：

    - DM 支持频道上的默认行为是**配对**：
      - 未知发送者收到配对码；机器人不处理他们的消息。
      - 批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 待处理请求每个频道上限为 **3 个**；如果代码未到达，检查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公开打开 DM 需要显式选择加入（`dmPolicy: "open"` 和白名单 `"*"`）。

    运行 `openclaw doctor` 以发现有风险的 DM 策略。

  </Accordion>

  <Accordion title="提示注入只是公共机器人的问题吗？">
    不。提示注入是关于**不受信任的内容**，而不仅仅是谁可以向机器人发送 DM。如果您的助手读取外部内容（网络搜索/抓取、浏览器页面、电子邮件、文档、附件、粘贴的日志），该内容可能包含试图劫持模型的指令。即使**您是唯一的发送者**，这也可能发生。

    最大的风险是当工具已启用时：模型可能被欺骗以代表您泄露上下文或调用工具。通过以下方式减少爆炸半径：

    - 使用只读或禁用工具的"读取者"代理来总结不受信任的内容
    - 对支持工具的代理保持 `web_search` / `web_fetch` / `browser` 关闭
    - 将解码的文件/文档文本也视为不受信任：OpenResponses `input_file` 和媒体附件提取都将提取的文本包装在明确的外部内容边界标记中，而不是传递原始文件文本
    - 沙箱和严格的工具白名单

    详情：[安全](/gateway/security)。

  </Accordion>

  <Accordion title="我的机器人应该有自己的电子邮件、GitHub 账户或电话号码吗？">
    是的，对于大多数设置。用单独的账户和电话号码隔离机器人可以在出错时减少爆炸半径。这也使轮换凭证或撤销访问权限而不影响您的个人账户变得更容易。

    从小开始。只授予对您实际需要的工具和账户的访问权限，如果需要，稍后再扩展。

    文档：[安全](/gateway/security)、[配对](/channels/pairing)。

  </Accordion>

  <Accordion title="我可以让它对我的短信有自主权吗？这安全吗？">
    我们**不**建议对您的个人消息有完全自主权。最安全的模式是：

    - 将 DM 保持在**配对模式**或严格的白名单中。
    - 如果您希望它代表您发送消息，使用**单独的号码或账户**。
    - 让它起草，然后**在发送之前批准**。

    如果您想实验，在专用账户上进行并保持隔离。请参阅[安全](/gateway/security)。

  </Accordion>

  <Accordion title="我可以对个人助手任务使用更便宜的模型吗？">
    可以，**如果**代理只有聊天且输入受信任的话。较小的层级更容易受到指令劫持，因此避免在支持工具的代理或读取不受信任内容时使用它们。如果必须使用较小的模型，锁定工具并在沙箱内运行。请参阅[安全](/gateway/security)。
  </Accordion>

  <Accordion title="我在 Telegram 中运行了 /start 但没有收到配对码">
    配对码**只在**未知发送者向机器人发送消息且启用了 `dmPolicy: "pairing"` 时发送。`/start` 本身不生成代码。

    检查待处理请求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您想立即访问，将您的发送者 ID 加入白名单或设置该账户的 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它会给我的联系人发消息吗？配对如何工作？">
    不会。默认 WhatsApp DM 策略是**配对**。未知发送者只收到配对码，他们的消息**不被处理**。OpenClaw 只回复它收到的聊天或您触发的显式发送。

    批准配对：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待处理请求：

    ```bash
    openclaw pairing list whatsapp
    ```

    向导电话号码提示：它用于设置您的**白名单/所有者**，以便您自己的 DM 被允许。它不用于自动发送。如果您在个人 WhatsApp 号码上运行，使用该号码并启用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天命令、中止任务和"它不会停止"

<AccordionGroup>
  <Accordion title="如何阻止内部系统消息显示在聊天中？">
    大多数内部或工具消息只在为该会话启用了**verbose**、**trace** 或 **reasoning** 时出现。

    在您看到它的聊天中修复：

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    如果还是嘈杂，检查 Control UI 中的会话设置并将 verbose 设置为 **inherit**。还确认您没有使用配置中将 `verboseDefault` 设置为 `on` 的机器人配置文件。

    文档：[思考和 verbose](/tools/thinking)、[安全](/gateway/security/index#reasoning-and-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在运行的任务？">
    将以下任何内容作为**独立消息**发送（不带斜线）：

    ```
    stop
    stop action
    stop current action
    stop run
    stop current run
    stop agent
    stop the agent
    stop openclaw
    openclaw stop
    stop don't do anything
    stop do not do anything
    stop doing anything
    please stop
    stop please
    abort
    esc
    wait
    exit
    interrupt
    ```

    这些是中止触发器（不是斜线命令）。

    对于后台进程（来自 exec 工具），您可以要求代理运行：

    ```
    process action:kill sessionId:XXX
    ```

    斜线命令概述：请参阅[斜线命令](/tools/slash-commands)。

    大多数命令必须作为以 `/` 开头的**独立**消息发送，但一些快捷方式（如 `/status`）也适用于白名单发送者的内联。

  </Accordion>

  <Accordion title='如何从 Telegram 发送 Discord 消息？（"Cross-context messaging denied"）'>
    OpenClaw 默认阻止**跨提供商**消息。如果工具调用绑定到 Telegram，它不会发送到 Discord，除非您明确允许它。

    为代理启用跨提供商消息：

    ```json5
    {
      tools: {
        message: {
          crossContext: {
            allowAcrossProviders: true,
            marker: { enabled: true, prefix: "[from {channel}] " },
          },
        },
      },
    }
    ```

    编辑配置后重启 Gateway。

  </Accordion>

  <Accordion title='为什么感觉机器人"忽略"了快速发送的消息？'>
    队列模式控制新消息如何与正在进行的运行交互。使用 `/queue` 更改模式：

    - `steer` — 在当前运行的下一个模型边界排队所有待处理的引导
    - `queue` — 旧版逐一引导
    - `followup` — 一次运行一条消息
    - `collect` — 批量消息并一次性回复
    - `steer-backlog` — 现在引导，然后处理积压
    - `interrupt` — 中止当前运行并重新开始

    默认模式是 `steer`。您可以添加选项，如 `debounce:0.5s cap:25 drop:summarize` 用于跟进模式。请参阅[命令队列](/concepts/queue)和[引导队列](/concepts/queue-steering)。

  </Accordion>
</AccordionGroup>

## 杂项

<AccordionGroup>
  <Accordion title='使用 API 密钥时 Anthropic 的默认模型是什么？'>
    在 OpenClaw 中，凭证和模型选择是分开的。设置 `ANTHROPIC_API_KEY`（或在认证配置文件中存储 Anthropic API 密钥）启用认证，但实际的默认模型是您在 `agents.defaults.model.primary` 中配置的内容（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，这意味着 Gateway 无法在正在运行的代理的预期 `auth-profiles.json` 中找到 Anthropic 凭证。
  </Accordion>
</AccordionGroup>

---

仍然卡住？在 [Discord](https://discord.com/invite/clawd) 中提问或打开 [GitHub 讨论](https://github.com/openclaw/openclaw/discussions)。

## 相关链接

- [首次运行 FAQ](/help/faq-first-run) — 安装、引导、认证、订阅、早期失败
- [模型 FAQ](/help/faq-models) — 模型选择、故障转移、认证配置文件
- [故障排除](/help/troubleshooting) — 症状优先分类
