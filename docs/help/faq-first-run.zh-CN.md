---
summary: "FAQ：快速入门和首次运行设置——安装、引导、身份验证、订阅、初始失败"
read_when:
  - 全新安装、引导卡住或首次运行出错
  - 选择身份验证和提供商订阅
  - 无法访问 docs.openclaw.ai、无法打开控制台、安装卡住
title: "FAQ：首次运行设置"
sidebarTitle: "首次运行 FAQ"
---

快速入门和首次运行问答。有关日常操作、模型、身份验证、会话和故障排除，请参阅主要 [FAQ](/help/faq)。

## 快速入门和首次运行设置

<AccordionGroup>
  <Accordion title="我卡住了，最快解决问题的方法">
    使用能**看到你机器**的本地 AI 代理。这比在 Discord 上提问有效得多，因为大多数"我卡住了"的情况是**本地配置或环境问题**，远程协助者无法检查。

    - **Claude Code**：[https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**：[https://openai.com/codex/](https://openai.com/codex/)

    这些工具可以读取仓库、运行命令、检查日志，并帮助修复你的机器级别设置（PATH、服务、权限、身份验证文件）。通过可修改的（git）安装方式，将**完整的源代码检出**提供给它们：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会从 git 检出安装 OpenClaw，因此代理可以读取代码和文档，并推理你正在运行的确切版本。你随时可以通过不带 `--install-method git` 重新运行安装程序来切换回稳定版本。

    提示：让代理**计划并监督**修复（逐步），然后仅执行必要的命令。这样可以使更改保持小范围且更易于审核。

    如果你发现真正的错误或修复方案，请提交 GitHub issue 或发送 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    从这些命令开始（寻求帮助时分享输出）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它们的作用：

    - `openclaw status`：Gateway/代理健康状况和基本配置的快速快照。
    - `openclaw models status`：检查提供商身份验证和模型可用性。
    - `openclaw doctor`：验证并修复常见的配置/状态问题。

    其他有用的 CLI 检查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速调试循环：[出现问题时的前 60 秒](/help/faq#first-60-seconds-if-something-is-broken)。
    安装文档：[安装](/install)、[安装程序标志](/install/installer)、[更新](/install/updating)。

  </Accordion>

  <Accordion title="心跳一直跳过。跳过原因是什么意思？">
    常见的心跳跳过原因：

    - `quiet-hours`：在配置的活跃时间窗口之外
    - `empty-heartbeat-file`：`HEARTBEAT.md` 存在但只包含空白/仅有标题的骨架内容
    - `no-tasks-due`：`HEARTBEAT.md` 任务模式已激活但没有任务间隔到期
    - `alerts-disabled`：所有心跳可见性均已禁用（`showOk`、`showAlerts` 和 `useIndicator` 全部关闭）

    在任务模式下，到期时间戳仅在真实心跳运行完成后才会推进。跳过的运行不会将任务标记为已完成。

    文档：[心跳](/gateway/heartbeat)、[自动化与任务](/automation)。

  </Accordion>

  <Accordion title="安装和设置 OpenClaw 的推荐方式">
    仓库建议从源代码运行并使用引导向导：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    向导也可以自动构建 UI 资源。引导完成后，你通常在端口 **18789** 上运行 Gateway。

    从源代码（贡献者/开发者）：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build
    openclaw onboard
    ```

    如果你还没有全局安装，通过 `pnpm openclaw onboard` 运行它。

  </Accordion>

  <Accordion title="引导后如何打开控制台？">
    向导会在引导完成后立即打开浏览器，显示干净（无令牌）的控制台 URL，并在摘要中打印链接。保持该标签页打开；如果没有自动启动，在同一台机器上复制/粘贴打印的 URL。
  </Accordion>

  <Accordion title="如何在本地与远程对控制台进行身份验证？">
    **本地（同一台机器）：**

    - 打开 `http://127.0.0.1:18789/`。
    - 如果要求共享密钥验证，将已配置的令牌或密码粘贴到 Control UI 设置中。
    - 令牌来源：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 密码来源：`gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果尚未配置共享密钥，使用 `openclaw doctor --generate-gateway-token` 生成令牌。

    **不在本地：**

    - **Tailscale Serve**（推荐）：保持环回绑定，运行 `openclaw gateway --tailscale serve`，打开 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 为 `true`，身份标头满足 Control UI/WebSocket 身份验证（无需粘贴共享密钥，假设受信任的 Gateway 主机）；HTTP API 仍然需要共享密钥身份验证，除非你特意使用私有入口 `none` 或受信任代理 HTTP 身份验证。
    - **Tailnet 绑定**：运行 `openclaw gateway --bind tailnet --token "<token>"`（或配置密码验证），打开 `http://<tailscale-ip>:18789/`，然后在控制台设置中粘贴匹配的共享密钥。
    - **身份感知反向代理**：将 Gateway 保持在受信任代理后面，配置 `gateway.auth.mode: "trusted-proxy"`，然后打开代理 URL。同主机环回代理需要显式设置 `gateway.auth.trustedProxy.allowLoopback = true`。
    - **SSH 隧道**：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/`。共享密钥验证仍通过隧道应用；如果提示，粘贴已配置的令牌或密码。

    有关绑定模式和身份验证详情，请参阅[控制台](/web/dashboard)和 [Web 界面](/web)。

  </Accordion>

  <Accordion title="为什么聊天审批有两个 exec 审批配置？">
    它们控制不同层级：

    - `approvals.exec`：将审批提示转发到聊天目标
    - `channels.<channel>.execApprovals`：使该频道作为 exec 审批的原生审批客户端

    主机 exec 策略仍然是真正的审批门控。聊天配置只控制审批提示出现的位置以及人们如何回答它们。

    在大多数设置中，你**不需要**两者都用：

    - 如果聊天已支持命令和回复，同聊天 `/approve` 通过共享路径有效。
    - 如果受支持的原生频道可以安全地推断审批者，OpenClaw 现在会在 `channels.<channel>.execApprovals.enabled` 未设置或为 `"auto"` 时自动启用 DM 优先的原生审批。
    - 当原生审批卡/按钮可用时，该原生 UI 是主要路径；仅当工具结果表示聊天审批不可用或手动审批是唯一路径时，代理才应包含手动 `/approve` 命令。
    - 仅当提示也必须转发到其他聊天或明确的运维房间时，才使用 `approvals.exec`。
    - 仅当你明确希望审批提示发布回原始房间/话题时，才使用 `channels.<channel>.execApprovals.target: "channel"` 或 `"both"`。
    - 插件审批再次独立：它们默认使用同聊天 `/approve`，可选的 `approvals.plugin` 转发，且仅部分原生频道在顶层保留插件审批原生处理。

    简而言之：转发用于路由，原生客户端配置用于更丰富的频道特定 UX。
    请参阅 [Exec 审批](/tools/exec-approvals)。

  </Accordion>

  <Accordion title="需要什么运行时？">
    需要 Node **>= 22**。推荐使用 `pnpm`。**不推荐** Bun 用于 Gateway。
  </Accordion>

  <Accordion title="可以在 Raspberry Pi 上运行吗？">
    可以。Gateway 很轻量——文档列出 **512MB-1GB 内存**、**1 核**和约 **500MB** 磁盘空间作为个人使用的最低要求，并注明 **Raspberry Pi 4 可以运行它**。

    如果你想要更多空间（日志、媒体、其他服务），**建议 2GB**，但这不是硬性最低要求。

    提示：小型 Pi/VPS 可以托管 Gateway，你可以在笔记本/手机上配对**节点**，用于本地屏幕/摄像头/画布或命令执行。请参阅[节点](/nodes)。

  </Accordion>

  <Accordion title="Raspberry Pi 安装有什么提示吗？">
    简短回答：可以工作，但预期会有一些粗糙之处。

    - 使用 **64 位** OS，保持 Node >= 22。
    - 优先选择**可修改的（git）安装**，这样你可以查看日志并快速更新。
    - 从无频道/技能开始，然后逐个添加。
    - 如果遇到奇怪的二进制问题，通常是 **ARM 兼容性**问题。

    文档：[Linux](/platforms/linux)、[安装](/install)。

  </Accordion>

<Accordion title="卡在"唤醒我的朋友"/引导无法启动。怎么办？">
该屏幕依赖于 Gateway 可达且已通过身份验证。TUI 也会在首次孵化时自动发送"Wake up, my friend!"。如果你看到该行**没有回复**且令牌保持为 0，则代理从未运行。

    1. 重启 Gateway：

    ```bash
    openclaw gateway restart
    ```

    2. 检查状态和身份验证：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. 如果仍然挂起，运行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway 是远程的，请确保隧道/Tailscale 连接正常，并且 UI 指向正确的 Gateway。请参阅[远程访问](/gateway/remote)。

  </Accordion>

  <Accordion title="我可以在不重新引导的情况下将我的设置迁移到新机器（Mac mini）吗？">
    可以。复制**状态目录**和**工作区**，然后运行一次 Doctor。这样可以保持你的机器人"完全相同"（内存、会话历史、身份验证和频道状态），只要你复制**两个**位置：

    1. 在新机器上安装 OpenClaw。
    2. 从旧机器复制 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）。
    3. 复制你的工作区（默认：`~/.openclaw/workspace`）。
    4. 运行 `openclaw doctor` 并重启 Gateway 服务。

    这会保留配置、身份验证配置文件、WhatsApp 凭证、会话和内存。如果你在远程模式下，请记住 Gateway 主机拥有会话存储和工作区。

    **重要：** 如果你只是将工作区提交/推送到 GitHub，你只是在备份**内存和引导文件**，而**不是**会话历史或身份验证。这些位于 `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相关：[迁移](/install/migrating)、[磁盘上的文件位置](/help/faq#where-things-live-on-disk)、[代理工作区](/concepts/agent-workspace)、[Doctor](/gateway/doctor)、[远程模式](/gateway/remote)。

  </Accordion>

  <Accordion title="在哪里查看最新版本的新内容？">
    查看 GitHub 更新日志：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新条目在顶部。如果顶部部分标记为 **Unreleased**，则下一个有日期的部分是最新发布的版本。条目按**亮点**、**变更**和**修复**分组（加上文档/其他部分）。

  </Accordion>

  <Accordion title="无法访问 docs.openclaw.ai（SSL 错误）">
    某些 Comcast/Xfinity 连接通过 Xfinity Advanced Security 错误地屏蔽了 `docs.openclaw.ai`。禁用它或将 `docs.openclaw.ai` 加入白名单，然后重试。
    请通过此处报告帮助我们解除屏蔽：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果你仍然无法访问该网站，文档在 GitHub 上有镜像：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="稳定版和测试版的区别">
    **稳定版**和**测试版**是 **npm dist-tags**，不是独立的代码线：

    - `latest` = 稳定版
    - `beta` = 用于测试的早期构建

    通常，稳定版本首先落在 **beta** 上，然后显式的升级步骤将同一版本移到 `latest`。维护者也可以在需要时直接发布到 `latest`。这就是为什么测试版和稳定版在升级后可能指向**同一版本**。

    查看更改内容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    有关安装一行命令以及测试版和开发版的区别，请参阅下面的折叠项。

  </Accordion>

  <Accordion title="如何安装测试版以及测试版和开发版的区别是什么？">
    **测试版**是 npm dist-tag `beta`（升级后可能与 `latest` 相同）。
    **开发版**是 `main` 的移动头（git）；发布时使用 npm dist-tag `dev`。

    一行命令（macOS/Linux）：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安装程序（PowerShell）：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多详情：[开发频道](/install/development-channels)和[安装程序标志](/install/installer)。

  </Accordion>

  <Accordion title="如何试用最新版本？">
    两个选项：

    1. **开发频道（git 检出）：**

    ```bash
    openclaw update --channel dev
    ```

    这会切换到 `main` 分支并从源代码更新。

    2. **可修改安装（从安装程序网站）：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会给你一个可以编辑的本地仓库，然后通过 git 更新。

    如果你更喜欢手动干净克隆，使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文档：[更新](/cli/update)、[开发频道](/install/development-channels)、[安装](/install)。

  </Accordion>

  <Accordion title="安装和引导通常需要多长时间？">
    粗略指南：

    - **安装：** 2-5 分钟
    - **引导：** 5-15 分钟，取决于你配置多少频道/模型

    如果挂起，使用[安装程序卡住](#quick-start-and-first-run-setup)和[我卡住了](#quick-start-and-first-run-setup)中的快速调试循环。

  </Accordion>

  <Accordion title="安装程序卡住？如何获取更多反馈？">
    使用**详细输出**重新运行安装程序：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    详细的测试版安装：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    对于可修改的（git）安装：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
    ```

    Windows（PowerShell）等效：

    ```powershell
    # install.ps1 目前没有专用的 -Verbose 标志。
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

    更多选项：[安装程序标志](/install/installer)。

  </Accordion>

  <Accordion title="Windows 安装提示找不到 git 或无法识别 openclaw">
    两个常见的 Windows 问题：

    **1) npm 错误 spawn git / 找不到 git**

    - 安装 **Git for Windows** 并确保 `git` 在你的 PATH 上。
    - 关闭并重新打开 PowerShell，然后重新运行安装程序。

    **2) 安装后无法识别 openclaw**

    - 你的 npm 全局 bin 文件夹不在 PATH 上。
    - 检查路径：

      ```powershell
      npm config get prefix
      ```

    - 将该目录添加到你的用户 PATH（Windows 上不需要 `\bin` 后缀；在大多数系统上是 `%AppData%\npm`）。
    - 更新 PATH 后关闭并重新打开 PowerShell。

    如果你想要最顺畅的 Windows 设置，请使用 **WSL2** 而不是原生 Windows。
    文档：[Windows](/platforms/windows)。

  </Accordion>

  <Accordion title="Windows exec 输出显示乱码中文——该怎么办？">
    这通常是原生 Windows shell 上的控制台代码页不匹配问题。

    症状：

    - `system.run`/`exec` 输出将中文渲染为乱码
    - 相同命令在另一个终端配置文件中看起来正常

    PowerShell 中的快速解决方法：

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```

    然后重启 Gateway 并重试你的命令：

    ```powershell
    openclaw gateway restart
    ```

    如果你在最新的 OpenClaw 上仍然可以重现此问题，请追踪/报告：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文档没有回答我的问题——如何获得更好的答案？">
    使用**可修改的（git）安装**，这样你本地有完整的源代码和文档，然后从该文件夹询问你的机器人（或 Claude/Codex），这样它可以读取仓库并精确回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多详情：[安装](/install)和[安装程序标志](/install/installer)。

  </Accordion>

  <Accordion title="如何在 Linux 上安装 OpenClaw？">
    简短回答：按照 Linux 指南操作，然后运行引导向导。

    - Linux 快速路径和服务安装：[Linux](/platforms/linux)。
    - 完整演练：[入门](/start/getting-started)。
    - 安装和更新：[安装和更新](/install/updating)。

  </Accordion>

  <Accordion title="如何在 VPS 上安装 OpenClaw？">
    任何 Linux VPS 都可以。在服务器上安装，然后使用 SSH/Tailscale 访问 Gateway。

    指南：[exe.dev](/install/exe-dev)、[Hetzner](/install/hetzner)、[Fly.io](/install/fly)。
    远程访问：[Gateway 远程](/gateway/remote)。

  </Accordion>

  <Accordion title="云/VPS 安装指南在哪里？">
    我们维护了一个**托管中心**，提供常见提供商的指南。选择一个并按照指南操作：

    - [VPS 托管](/vps)（所有提供商集中在一处）
    - [Fly.io](/install/fly)
    - [Hetzner](/install/hetzner)
    - [exe.dev](/install/exe-dev)

    在云端的工作方式：**Gateway 运行在服务器上**，你通过 Control UI（或 Tailscale/SSH）从笔记本/手机访问。你的状态和工作区存储在服务器上，因此将主机视为真相来源并备份它。

    你可以将**节点**（Mac/iOS/Android/无头）配对到该云 Gateway，以访问本地屏幕/摄像头/画布或在笔记本上运行命令，同时将 Gateway 保持在云端。

    中心：[平台](/platforms)。远程访问：[Gateway 远程](/gateway/remote)。
    节点：[节点](/nodes)、[节点 CLI](/cli/nodes)。

  </Accordion>

  <Accordion title="我可以让 OpenClaw 自我更新吗？">
    简短回答：**可能，但不推荐**。更新流程可能会重启 Gateway（会断开活动会话），可能需要干净的 git 检出，并且可能需要确认。更安全的方式：作为操作员从 shell 运行更新。

    使用 CLI：

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    如果必须从代理自动化：

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    文档：[更新](/cli/update)、[更新指南](/install/updating)。

  </Accordion>

  <Accordion title="引导实际上做了什么？">
    `openclaw onboard` 是推荐的设置路径。在**本地模式**下，它会引导你完成：

    - **模型/身份验证设置**（提供商 OAuth、API 密钥、Anthropic 设置令牌，以及 LM Studio 等本地模型选项）
    - **工作区**位置和引导文件
    - **Gateway 设置**（绑定/端口/身份验证/tailscale）
    - **频道**（WhatsApp、Telegram、Discord、Mattermost、Signal、iMessage，以及 QQ Bot 等捆绑频道插件）
    - **守护进程安装**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd 用户单元）
    - **健康检查**和**技能**选择

    如果你配置的模型未知或缺少身份验证，它也会发出警告。

  </Accordion>

  <Accordion title="运行此程序需要 Claude 或 OpenAI 订阅吗？">
    不需要。你可以使用 **API 密钥**（Anthropic/OpenAI/其他）或**仅本地模型**运行 OpenClaw，这样你的数据就留在你的设备上。订阅（Claude Pro/Max 或 OpenAI Codex）是对这些提供商进行身份验证的可选方式。

    对于 OpenClaw 中的 Anthropic，实际的划分是：

    - **Anthropic API 密钥**：正常的 Anthropic API 计费
    - **OpenClaw 中的 Claude CLI / Claude 订阅验证**：Anthropic 员工告诉我们此用法再次被允许，OpenClaw 将 `claude -p` 的使用视为此集成的授权用法，除非 Anthropic 发布新政策

    对于长期运行的 Gateway 主机，Anthropic API 密钥仍然是更可预测的设置。OpenAI Codex OAuth 明确支持 OpenClaw 等外部工具。

    OpenClaw 还支持其他托管订阅式选项，包括 **Qwen Cloud 编码计划**、**MiniMax 编码计划**和 **Z.AI / GLM 编码计划**。

    文档：[Anthropic](/providers/anthropic)、[OpenAI](/providers/openai)、[Qwen Cloud](/providers/qwen)、[MiniMax](/providers/minimax)、[GLM 模型](/providers/glm)、[本地模型](/gateway/local-models)、[模型](/concepts/models)。

  </Accordion>

  <Accordion title="可以在没有 API 密钥的情况下使用 Claude Max 订阅吗？">
    可以。

    Anthropic 员工告诉我们 OpenClaw 风格的 Claude CLI 用法再次被允许，因此 OpenClaw 将 Claude 订阅验证和 `claude -p` 的使用视为此集成的授权用法，除非 Anthropic 发布新政策。如果你想要最可预测的服务器端设置，请改用 Anthropic API 密钥。

  </Accordion>

  <Accordion title="支持 Claude 订阅验证（Claude Pro 或 Max）吗？">
    支持。

    Anthropic 员工告诉我们此用法再次被允许，因此 OpenClaw 将 Claude CLI 重用和 `claude -p` 的使用视为此集成的授权用法，除非 Anthropic 发布新政策。

    Anthropic 设置令牌仍然作为受支持的 OpenClaw 令牌路径提供，但 OpenClaw 现在在可用时优先使用 Claude CLI 重用和 `claude -p`。
    对于生产环境或多用户工作负载，Anthropic API 密钥验证仍然是更安全、更可预测的选择。如果你想要 OpenClaw 中其他订阅式托管选项，请参阅 [OpenAI](/providers/openai)、[Qwen / Model Cloud](/providers/qwen)、[MiniMax](/providers/minimax) 和 [GLM 模型](/providers/glm)。

  </Accordion>

</AccordionGroup>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>

<AccordionGroup>
  <Accordion title="为什么我看到来自 Anthropic 的 HTTP 429 rate_limit_error？">
    这意味着你的 **Anthropic 配额/速率限制**在当前窗口内已耗尽。如果你使用 **Claude CLI**，请等待窗口重置或升级你的计划。如果你使用 **Anthropic API 密钥**，请查看 Anthropic Console 中的使用量/账单并根据需要提高限制。

    如果消息具体为：
    `Extra usage is required for long context requests`，请求正在尝试使用 Anthropic 的 1M 上下文测试版（`context1m: true`）。这仅在你的凭证符合长上下文计费资格时有效（API 密钥计费或启用了额外使用量的 OpenClaw Claude 登录路径）。

    提示：设置**备用模型**，这样当提供商受到速率限制时 OpenClaw 可以继续回复。
    请参阅[模型](/cli/models)、[OAuth](/concepts/oauth) 和 [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

  <Accordion title="支持 AWS Bedrock 吗？">
    支持。OpenClaw 有一个捆绑的 **Amazon Bedrock (Converse)** 提供商。在存在 AWS 环境标记的情况下，OpenClaw 可以自动发现流式/文本 Bedrock 目录并将其合并为隐式 `amazon-bedrock` 提供商；否则，你可以显式启用 `plugins.entries.amazon-bedrock.config.discovery.enabled` 或添加手动提供商条目。请参阅 [Amazon Bedrock](/providers/bedrock) 和[模型提供商](/providers/models)。如果你更喜欢托管密钥流，在 Bedrock 前面使用与 OpenAI 兼容的代理仍然是有效选项。
  </Accordion>

  <Accordion title="Codex 验证是如何工作的？">
    OpenClaw 通过 OAuth（ChatGPT 登录）支持 **OpenAI Code (Codex)**。使用 `openai/gpt-5.5` 并配合 `agentRuntime.id: "codex"` 进行常见设置：ChatGPT/Codex 订阅验证加上原生 Codex 应用服务器执行。仅当你希望通过默认 PI 运行器使用 Codex OAuth 时，才使用 `openai-codex/gpt-5.5`。不带 Codex 运行时覆盖的 `openai/gpt-5.5` 用于直接 OpenAI API 密钥访问。
    请参阅[模型提供商](/concepts/model-providers)和[引导向导（CLI）](/start/wizard)。
  </Accordion>

  <Accordion title="为什么 OpenClaw 仍然提到 openai-codex？">
    `openai-codex` 是 ChatGPT/Codex OAuth 的提供商和验证配置文件 ID。它也是 Codex OAuth 的显式 PI 模型前缀：

    - `openai/gpt-5.5` + `agentRuntime.id: "codex"` = 带有原生 Codex 运行时的 ChatGPT/Codex 订阅验证
    - `openai-codex/gpt-5.5` = PI 中的 Codex OAuth 路由
    - 不带 Codex 运行时覆盖的 `openai/gpt-5.5` = PI 中的直接 OpenAI API 密钥路由
    - `openai-codex:...` = 验证配置文件 ID，不是模型引用

    如果你想要直接的 OpenAI 平台计费/限制路径，请设置 `OPENAI_API_KEY`。如果你想要 ChatGPT/Codex 订阅验证，请使用 `openclaw models auth login --provider openai-codex` 登录。对于原生 Codex 运行时，将模型引用保持为 `openai/gpt-5.5` 并设置 `agentRuntime.id: "codex"`。仅对 PI 运行使用 `openai-codex/*` 模型引用。

  </Accordion>

  <Accordion title="为什么 Codex OAuth 限制可能与 ChatGPT Web 不同？">
    Codex OAuth 使用 OpenAI 管理的、依赖计划的配额窗口。实际上，即使两者都绑定到同一账户，这些限制也可能与 ChatGPT 网站/应用体验不同。

    OpenClaw 可以在 `openclaw models status` 中显示当前可见的提供商使用量/配额窗口，但它不会将 ChatGPT-web 权益发明或规范化为直接 API 访问。如果你想要直接的 OpenAI 平台计费/限制路径，请使用带有 API 密钥的 `openai/*`。

  </Accordion>

  <Accordion title="支持 OpenAI 订阅验证（Codex OAuth）吗？">
    支持。OpenClaw 完全支持 **OpenAI Code (Codex) 订阅 OAuth**。
    OpenAI 明确允许在 OpenClaw 等外部工具/工作流中使用订阅 OAuth。引导向导可以为你运行 OAuth 流程。

    请参阅 [OAuth](/concepts/oauth)、[模型提供商](/concepts/model-providers)和[引导向导（CLI）](/start/wizard)。

  </Accordion>

  <Accordion title="如何设置 Gemini CLI OAuth？">
    Gemini CLI 使用**插件验证流程**，而不是 `openclaw.json` 中的客户端 ID 或密钥。

    步骤：

    1. 在本地安装 Gemini CLI，使 `gemini` 在 `PATH` 上
       - Homebrew：`brew install gemini-cli`
       - npm：`npm install -g @google/gemini-cli`
    2. 启用插件：`openclaw plugins enable google`
    3. 登录：`openclaw models auth login --provider google-gemini-cli --set-default`
    4. 登录后的默认模型：`google-gemini-cli/gemini-3-flash-preview`
    5. 如果请求失败，在 Gateway 主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`

    这会将 OAuth 令牌存储在 Gateway 主机上的验证配置文件中。详情：[模型提供商](/concepts/model-providers)。

  </Accordion>

  <Accordion title="本地模型适合日常聊天吗？">
    通常不适合。OpenClaw 需要大上下文和强安全性；小型模型会截断并泄漏。如果必须使用，在本地运行你能运行的**最大**模型（LM Studio），并参阅 [/gateway/local-models](/gateway/local-models)。较小/过度量化的模型会增加提示注入风险——请参阅[安全](/gateway/security)。
  </Accordion>

  <Accordion title="如何将托管模型流量保持在特定区域？">
    选择区域固定的端点。OpenRouter 为 MiniMax、Kimi 和 GLM 提供美国托管选项；选择美国托管变体可将数据保留在区域内。你仍然可以通过使用 `models.mode: "merge"` 在这些旁边列出 Anthropic/OpenAI，这样备用选项在你选择的区域提供商的同时仍然可用。
  </Accordion>

  <Accordion title="必须买 Mac Mini 才能安装吗？">
    不需要。OpenClaw 在 macOS 或 Linux（通过 WSL2 的 Windows）上运行。Mac mini 是可选的——有些人购买它作为始终在线的主机，但小型 VPS、家庭服务器或 Raspberry Pi 级别的设备也可以。

    只有在需要 **macOS 专用工具**时才需要 Mac。对于 iMessage，使用 [BlueBubbles](/channels/bluebubbles)（推荐）——BlueBubbles 服务器在任何 Mac 上运行，Gateway 可以在 Linux 或其他地方运行。如果你想要其他 macOS 专用工具，在 Mac 上运行 Gateway 或配对 macOS 节点。

    文档：[BlueBubbles](/channels/bluebubbles)、[节点](/nodes)、[Mac 远程模式](/platforms/mac/remote)。

  </Accordion>

  <Accordion title="iMessage 支持需要 Mac mini 吗？">
    你需要**某个**已登录 Messages 的 macOS 设备。它**不必**是 Mac mini——任何 Mac 都可以。**使用 [BlueBubbles](/channels/bluebubbles)**（推荐）获取 iMessage——BlueBubbles 服务器在 macOS 上运行，而 Gateway 可以在 Linux 或其他地方运行。

    常见设置：

    - 在 Linux/VPS 上运行 Gateway，在任何已登录 Messages 的 Mac 上运行 BlueBubbles 服务器。
    - 如果你想要最简单的单机设置，在 Mac 上运行所有内容。

    文档：[BlueBubbles](/channels/bluebubbles)、[节点](/nodes)、[Mac 远程模式](/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我买了 Mac mini 来运行 OpenClaw，可以将它连接到我的 MacBook Pro 吗？">
    可以。**Mac mini 可以运行 Gateway**，你的 MacBook Pro 可以作为**节点**（伴随设备）连接。节点不运行 Gateway——它们提供额外的功能，如屏幕/摄像头/画布和该设备上的 `system.run`。

    常见模式：

    - Mac mini 上的 Gateway（始终在线）。
    - MacBook Pro 运行 macOS 应用或节点主机并配对到 Gateway。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 查看它。

    文档：[节点](/nodes)、[节点 CLI](/cli/nodes)。

  </Accordion>

  <Accordion title="可以使用 Bun 吗？">
    **不推荐** Bun。我们看到了运行时错误，尤其是 WhatsApp 和 Telegram 方面。
    使用 **Node** 获得稳定的 Gateway。

    如果你仍然想尝试 Bun，请在没有 WhatsApp/Telegram 的非生产 Gateway 上进行。

  </Accordion>

  <Accordion title="Telegram：allowFrom 里填什么？">
    `channels.telegram.allowFrom` 是**人类发件人的 Telegram 用户 ID**（数字）。不是机器人用户名。

    设置只要求数字用户 ID。如果你的配置中已有旧版的 `@username` 条目，`openclaw doctor --fix` 可以尝试解析它们。

    更安全（无第三方机器人）：

    - 向你的机器人发送 DM，然后运行 `openclaw logs --follow` 并读取 `from.id`。

    官方 Bot API：

    - 向你的机器人发送 DM，然后调用 `https://api.telegram.org/bot<bot_token>/getUpdates` 并读取 `message.from.id`。

    第三方（隐私性较低）：

    - 向 `@userinfobot` 或 `@getidsbot` 发送 DM。

    请参阅 [/channels/telegram](/channels/telegram#access-control-and-activation)。

  </Accordion>

  <Accordion title="多人可以用一个 WhatsApp 号码使用不同的 OpenClaw 实例吗？">
    可以，通过**多代理路由**。将每个发件人的 WhatsApp **DM**（对等 `kind: "direct"`，发件人 E.164 格式如 `+15551234567`）绑定到不同的 `agentId`，这样每个人都有自己的工作区和会话存储。回复仍来自**同一个 WhatsApp 账户**，DM 访问控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）是全局的，每个 WhatsApp 账户一个。请参阅[多代理路由](/concepts/multi-agent)和 [WhatsApp](/channels/whatsapp)。
  </Accordion>

  <Accordion title='我可以运行"快速聊天"代理和"用于编码的 Opus"代理吗？'>
    可以。使用多代理路由：给每个代理其自己的默认模型，然后将入站路由（提供商账户或特定对等方）绑定到每个代理。配置示例在[多代理路由](/concepts/multi-agent)中。另请参阅[模型](/concepts/models)和[配置](/gateway/configuration)。
  </Accordion>

  <Accordion title="Homebrew 在 Linux 上可以工作吗？">
    可以。Homebrew 支持 Linux（Linuxbrew）。快速设置：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果你通过 systemd 运行 OpenClaw，请确保服务 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或你的 brew 前缀），这样 `brew` 安装的工具在非登录 shell 中可以解析。
    最新构建还会在 Linux systemd 服务上预先附加常见的用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），并在设置时遵循 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可修改 git 安装和 npm 安装的区别">
    - **可修改（git）安装：** 完整的源代码检出，可编辑，最适合贡献者。
      你在本地运行构建，可以修改代码/文档。
    - **npm 安装：** 全局 CLI 安装，没有仓库，最适合"直接运行"。
      更新来自 npm dist-tags。

    文档：[入门](/start/getting-started)、[更新](/install/updating)。

  </Accordion>

  <Accordion title="以后可以在 npm 和 git 安装之间切换吗？">
    可以。当 OpenClaw 已安装时，使用 `openclaw update --channel ...`。
    这**不会删除你的数据**——它只改变 OpenClaw 代码安装。
    你的状态（`~/.openclaw`）和工作区（`~/.openclaw/workspace`）保持不变。

    从 npm 到 git：

    ```bash
    openclaw update --channel dev
    ```

    从 git 到 npm：

    ```bash
    openclaw update --channel stable
    ```

    添加 `--dry-run` 可以首先预览计划的模式切换。更新器运行 Doctor 后续操作，刷新目标频道的插件源，并重启 Gateway，除非你传递 `--no-restart`。

    安装程序也可以强制任意一种模式：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
    ```

    备份提示：请参阅[备份策略](/help/faq#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我应该在笔记本上还是 VPS 上运行 Gateway？">
    简短回答：**如果你想要 24/7 的可靠性，请使用 VPS**。如果你接受睡眠/重启，并且想要最低的摩擦，请在本地运行。

    **笔记本（本地 Gateway）**

    - **优点：** 无服务器成本，直接访问本地文件，实时浏览器窗口。
    - **缺点：** 睡眠/网络中断 = 断开连接，OS 更新/重启会中断，必须保持唤醒。

    **VPS / 云**

    - **优点：** 始终在线，稳定网络，无笔记本睡眠问题，更容易保持运行。
    - **缺点：** 通常无头运行（使用截图），只能远程访问文件，更新时必须 SSH。

    **OpenClaw 特定说明：** WhatsApp/Telegram/Slack/Mattermost/Discord 都可以从 VPS 正常工作。唯一真正的权衡是**无头浏览器**与可见窗口。请参阅[浏览器](/tools/browser)。

    **推荐默认值：** 如果之前有 Gateway 断开连接，请使用 VPS。当你正在积极使用 Mac 并想要本地文件访问或带可见浏览器的 UI 自动化时，本地是很好的选择。

  </Accordion>

  <Accordion title="在专用机器上运行 OpenClaw 有多重要？">
    不是必需的，但**建议用于可靠性和隔离性**。

    - **专用主机（VPS/Mac mini/Pi）：** 始终在线，睡眠/重启中断更少，权限更干净，更容易保持运行。
    - **共享笔记本/台式机：** 对于测试和积极使用完全没问题，但当机器睡眠或更新时预期会有暂停。

    如果你想要两全其美，将 Gateway 保持在专用主机上，并将你的笔记本配对为**节点**，用于本地屏幕/摄像头/exec 工具。请参阅[节点](/nodes)。
    有关安全指导，请阅读[安全](/gateway/security)。

  </Accordion>

  <Accordion title="最低 VPS 要求是什么，推荐什么 OS？">
    OpenClaw 很轻量。对于基本 Gateway 和一个聊天频道：

    - **绝对最低：** 1 vCPU，1GB 内存，约 500MB 磁盘。
    - **推荐：** 1-2 vCPU，2GB 内存或更多，以获得空间余量（日志、媒体、多个频道）。节点工具和浏览器自动化可能需要大量资源。

    OS：使用 **Ubuntu LTS**（或任何现代 Debian/Ubuntu）。Linux 安装路径在此处经过最佳测试。

    文档：[Linux](/platforms/linux)、[VPS 托管](/vps)。

  </Accordion>

  <Accordion title="可以在虚拟机中运行 OpenClaw，有什么要求吗？">
    可以。将虚拟机视为与 VPS 相同：它需要始终在线、可达，并且有足够的 RAM 用于 Gateway 和你启用的任何频道。

    基准指导：

    - **绝对最低：** 1 vCPU，1GB 内存。
    - **推荐：** 2GB 内存或更多（如果你运行多个频道、浏览器自动化或媒体工具）。
    - **OS：** Ubuntu LTS 或另一个现代 Debian/Ubuntu。

    如果你在 Windows 上，**WSL2 是最简单的虚拟机式设置**，工具兼容性最好。请参阅[Windows](/platforms/windows)、[VPS 托管](/vps)。
    如果你在虚拟机中运行 macOS，请参阅 [macOS VM](/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 相关链接

- [FAQ](/help/faq) — 主要 FAQ（模型、会话、Gateway、安全等）
- [安装概述](/install)
- [入门](/start/getting-started)
- [故障排除](/help/troubleshooting)
