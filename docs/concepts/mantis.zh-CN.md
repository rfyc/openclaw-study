---
summary: "Mantis 是用于在实时传输上重现 OpenClaw 漏洞、捕获前后证据并将产物附加到 PR 的可视化端到端验证系统。"
title: "Mantis"
read_when:
  - 为 OpenClaw 漏洞构建或运行实时可视化 QA
  - 为 pull request 添加前后验证
  - 添加 Discord、Slack、WhatsApp 或其他实时传输场景
  - 调试需要截图、浏览器自动化或 VNC 访问的 QA 运行
---

Mantis 是 OpenClaw 的端到端验证系统，用于需要真实运行时、真实传输和可见证明的漏洞。它针对已知有问题的引用运行场景，捕获证据，针对候选引用运行相同场景，并将比较结果作为产物发布，维护人员可以从 PR 或本地命令中检查。

Mantis 从 Discord 开始，因为 Discord 为我们提供了一个高价值的第一通道：真实的机器人认证、真实的服务器频道、反应、线程、原生命令，以及人类可以直观确认传输显示内容的浏览器 UI。

## 目标

- 从 GitHub issue 或 PR 重现漏洞，使用用户看到的相同传输形状。
- 在应用修复之前，在基线引用上捕获**之前**产物。
- 在应用修复之后，在候选引用上捕获**之后**产物。
- 尽可能使用确定性 oracle，例如 Discord REST 反应读取或频道记录检查。
- 当漏洞有可见 UI 接口时捕获截图。
- 从智能体控制的 CLI 本地运行，以及从 GitHub 远程运行。
- 当登录、浏览器自动化或提供商认证卡住时，为 VNC 救援保留足够的机器状态。
- 当运行被阻塞、需要手动 VNC 帮助或完成时，向操作者 Discord 频道发布简明状态。

## 非目标

- Mantis 不是单元测试的替代品。理解修复后，Mantis 运行通常应该成为更小的回归测试。
- Mantis 不是正常的快速 CI 门控。它更慢，使用实时凭证，保留给实时环境很重要的漏洞。
- Mantis 不应该需要人工进行正常操作。手动 VNC 是救援路径，不是正常路径。
- Mantis 不在产物、日志、截图、Markdown 报告或 PR 评论中存储原始密钥。

## 所有权

Mantis 位于 OpenClaw QA 堆栈中。

- OpenClaw 拥有场景运行时、传输适配器、证据模式和 `pnpm openclaw qa mantis` 下的本地 CLI。
- QA Lab 拥有实时传输测试工具部件、浏览器捕获助手和产物写入器。
- Crabbox 在需要远程 VM 时拥有预热的 Linux 机器。
- GitHub Actions 拥有远程工作流入口和产物保留。
- ClawSweeper 拥有 GitHub 评论路由：解析维护人员命令、调度工作流，以及发布最终 PR 评论。
- OpenClaw 智能体在场景需要智能体设置、调试或卡住状态报告时通过 Codex 驱动 Mantis。

这个边界将传输知识保留在 OpenClaw 中，机器调度保留在 Crabbox 中，维护人员工作流粘合代码保留在 ClawSweeper 中。

## 命令形式

第一个本地命令验证 Discord 机器人、服务器、频道、消息发送、反应发送和产物路径：

```bash
pnpm openclaw qa mantis discord-smoke \
  --output-dir .artifacts/qa-e2e/mantis/discord-smoke
```

本地前后运行器接受以下形式：

```bash
pnpm openclaw qa mantis run \
  --transport discord \
  --scenario discord-status-reactions-tool-only \
  --baseline origin/main \
  --candidate HEAD \
  --output-dir .artifacts/qa-e2e/mantis/local-discord-status-reactions
```

运行器在输出目录下创建分离的基线和候选工作树，安装依赖，构建每个引用，使用 `--allow-failures` 运行场景，然后写入 `baseline/`、`candidate/`、`comparison.json` 和 `mantis-report.md`。对于第一个 Discord 场景，成功验证意味着基线状态为 `fail`，候选状态为 `pass`。

第一个 VM/浏览器原语是桌面冒烟：

```bash
pnpm openclaw qa mantis desktop-browser-smoke \
  --output-dir .artifacts/qa-e2e/mantis/desktop-browser
```

它租用或重用 Crabbox 桌面机器，在 VNC 会话中启动可见浏览器，捕获桌面，将产物拉回本地输出目录，并将重新连接命令写入报告。该命令默认使用 Hetzner 提供商，因为它是 Mantis 通道中第一个具有可工作桌面/VNC 覆盖的提供商。使用 `--provider`、`--crabbox-bin` 或 `OPENCLAW_MANTIS_CRABBOX_PROVIDER` 覆盖它以针对另一个 Crabbox 机群运行。

有用的桌面冒烟标志：

- `--lease-id <cbx_...>` 或 `OPENCLAW_MANTIS_CRABBOX_LEASE_ID` 重用预热的桌面。
- `--browser-url <url>` 更改在可见浏览器中打开的页面。
- `--html-file <path>` 在可见浏览器中渲染仓库本地 HTML 产物。Mantis 用这个通过真实的 Crabbox 桌面捕获生成的 Discord 状态反应时间线。
- `--keep-lease` 或 `OPENCLAW_MANTIS_KEEP_VM=1` 在新创建的通过租约上保持 VNC 检查。默认情况下，失败的运行保留创建的租约，以便操作者可以重新连接。
- `--class`、`--idle-timeout` 和 `--ttl` 调整机器大小和租约生命周期。

第一个完整桌面传输原语是 Slack 桌面冒烟：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --output-dir .artifacts/qa-e2e/mantis/slack-desktop \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

它租用或重用 Crabbox 桌面机器，将当前检出同步到 VM 中，在该 VM 内运行 `pnpm openclaw qa slack`，在 VNC 浏览器中打开 Slack Web，捕获可见桌面，并将 Slack QA 产物和 VNC 截图复制回本地输出目录。这是第一个 Mantis 形状，其中 SUT OpenClaw 网关和浏览器都位于同一个 Linux 桌面 VM 中。

使用 `--gateway-setup`，该命令在 `$HOME/.openclaw-mantis/slack-openclaw` 准备一个持久的一次性 OpenClaw 主目录，为选定的频道修补 Slack Socket Mode 配置，在端口 `38973` 上启动 `openclaw gateway run`，并在 VNC 会话中保持 Chrome 运行。这是"给我一个安装了 Slack 和 claw 运行的 Linux 桌面"模式；省略 `--gateway-setup` 时，机器人对机器人的 Slack QA 通道仍然是默认值。

`--credential-source env` 的必需输入：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`
- 远程模型通道的 `OPENCLAW_LIVE_OPENAI_KEY`。如果本地只设置了 `OPENAI_API_KEY`，Mantis 在调用 Crabbox 之前将其映射到 `OPENCLAW_LIVE_OPENAI_KEY`，这样 Crabbox 的 `OPENCLAW_*` 环境转发就可以将其携带到 VM 中。

有用的 Slack 桌面标志：

- `--lease-id <cbx_...>` 针对操作者已通过 VNC 登录到 Slack Web 的机器重新运行。
- `--gateway-setup` 在 VM 中启动持久的 OpenClaw Slack 网关，而不是只运行机器人对机器人的 QA 通道。
- `--slack-url <url>` 打开特定的 Slack Web URL。如果没有，当 SUT 机器人令牌可用时，Mantis 从 Slack `auth.test` 派生 `https://app.slack.com/client/<team>/<channel>`。
- `--slack-channel-id <id>` 控制网关设置使用的 Slack 频道白名单。
- `OPENCLAW_MANTIS_SLACK_BROWSER_PROFILE_DIR` 控制 VM 内的持久 Chrome 配置文件。默认是 `$HOME/.config/openclaw-mantis/slack-chrome-profile`，因此手动 Slack Web 登录在同一租约的重新运行中可以存活。
- `--credential-source convex --credential-role ci` 使用共享凭证池而不是直接的 Slack 环境令牌。
- `--provider-mode`、`--model`、`--alt-model` 和 `--fast` 传递给 Slack 实时通道。

GitHub 冒烟工作流是 `Mantis Discord Smoke`。第一个真实场景的前后 GitHub 工作流是 `Mantis Discord Status Reactions`。它接受：

- `baseline_ref`：预期重现仅队列行为的引用。
- `candidate_ref`：预期显示 `queued -> thinking -> done` 的引用。

它检出工作流测试工具引用，构建单独的基线和候选工作树，针对每个工作树运行 `discord-status-reactions-tool-only`，并将 `baseline/`、`candidate/`、`comparison.json` 和 `mantis-report.md` 作为 Actions 产物上传。它还在 Crabbox 桌面浏览器中渲染每个通道的时间线 HTML，并在 PR 评论中与确定性时间线 PNG 并排发布这些 VNC 截图。该工作流从 `openclaw/crabbox` main 构建 Crabbox CLI，以便在下一个 Crabbox 二进制发布之前使用当前的桌面/浏览器租约标志。

你也可以直接从 PR 评论触发状态反应运行：

```text
@Mantis discord status reactions
```

评论触发是有意限制的。它只在具有写入、维护或管理员访问权限的用户的 pull request 评论上运行，并且只识别 Discord 状态反应请求。默认情况下使用已知有问题的基线引用和当前 PR 头部 SHA 作为候选。维护人员可以覆盖任一引用：

```text
@Mantis discord status reactions baseline=origin/main candidate=HEAD
```

ClawSweeper 命令示例：

```text
@clawsweeper mantis discord discord-status-reactions-tool-only
@clawsweeper verify e2e discord
```

第一个命令是明确的，以场景为中心。第二个命令稍后可以从标签、更改的文件和 ClawSweeper 审查发现中将 PR 或 issue 映射到推荐的 Mantis 场景。

## 运行生命周期

1. 获取凭证。
2. 分配或重用 VM。
3. 当场景需要 UI 证据时准备桌面/浏览器配置文件。
4. 为基线引用准备干净的检出。
5. 只安装场景需要的依赖并进行构建。
6. 启动一个带有隔离状态目录的子 OpenClaw 网关。
7. 配置实时传输、提供商、模型和浏览器配置文件。
8. 运行场景并捕获基线证据。
9. 停止网关并保留日志。
10. 在同一 VM 中准备候选引用。
11. 运行相同场景并捕获候选证据。
12. 比较 oracle 结果和视觉证据。
13. 写入 Markdown、JSON、日志、截图和可选的追踪产物。
14. 上传 GitHub Actions 产物。
15. 发布简明的 PR 或 Discord 状态消息。

场景应该能以两种不同方式失败：

- **漏洞已重现**：基线以预期方式失败。
- **测试工具失败**：环境设置、凭证、Discord API、浏览器或提供商在漏洞 oracle 有意义之前失败。

最终报告必须区分这些情况，以便维护人员不会将不稳定的环境与产品行为混淆。

## Discord MVP

第一个场景应该针对服务器频道中的 Discord 状态反应，其中源回复投递模式是 `message_tool_only`。

为什么这是一个好的 Mantis 种子：

- 它在 Discord 中作为触发消息的反应可见。
- 它通过 Discord 消息反应状态有一个强大的 REST oracle。
- 它演练真实的 OpenClaw 网关、Discord 机器人认证、消息调度、源回复投递模式、状态反应状态和模型轮次生命周期。
- 它足够窄，使第一个实现保持诚实。

预期场景形状：

```yaml
id: discord-status-reactions-tool-only
transport: discord
baseline:
  expect:
    reproduced: true
candidate:
  expect:
    fixed: true
config:
  messages:
    ackReaction: "👀"
    ackReactionScope: "group-mentions"
    groupChat:
      visibleReplies: "message_tool"
    statusReactions:
      enabled: true
      timing:
        debounceMs: 0
discord:
  requireMention: true
  notifyChannel: operator-notify
evidence:
  rest:
    messageReactions: true
  browser:
    screenshotMessageRow: true
```

基线证据应该显示排队确认反应，但在仅工具模式下没有生命周期转换。候选证据应该显示当 `messages.statusReactions.enabled` 明确为 true 时运行的生命周期状态反应。

可执行的第一个切片是选择加入的 Discord 实时 QA 场景：

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --fast \
  --output-dir .artifacts/qa-e2e/mantis/discord-status-reactions-candidate
```

它将 SUT 配置为始终开启的服务器处理、`visibleReplies: "message_tool"`、`ackReaction: "👀"` 和显式状态反应。oracle 轮询真实的 Discord 触发消息并期望观察到的序列 `👀 -> 🤔 -> 👍`。产物包括 `discord-qa-reaction-timelines.json`、`discord-status-reactions-tool-only-timeline.html` 和 `discord-status-reactions-tool-only-timeline.png`。

## 现有 QA 组件

Mantis 应该建立在现有的私有 QA 堆栈上，而不是从零开始：

- `pnpm openclaw qa discord` 已经运行带有驱动程序和 SUT 机器人的实时 Discord 通道。
- 实时传输运行器已经在 `.artifacts/qa-e2e/` 下写入报告和观察到的消息产物。
- Convex 凭证租约已经提供对共享实时传输凭证的独占访问。
- 浏览器控制服务已经支持截图、快照、无头托管配置文件和远程 CDP 配置文件。
- QA Lab 已经有一个调试器 UI 和用于传输形状测试的总线。

第一个 Mantis 实现可以是这些组件上的薄前后运行器，加上一个视觉证据层。

## 证据模型

每次运行写入一个稳定的产物目录：

```text
.artifacts/qa-e2e/mantis/<run-id>/
  mantis-report.md
  mantis-summary.json
  baseline/
    summary.json
    discord-message.json
    screenshot-message-row.png
    gateway-debug/
  candidate/
    summary.json
    discord-message.json
    screenshot-message-row.png
    gateway-debug/
  comparison.json
  run.log
```

`mantis-summary.json` 应该是机器可读的真相来源。Markdown 报告用于 PR 评论和人工审查。

摘要必须包含：

- 测试的引用和 SHA
- 传输和场景 id
- 机器提供商和机器 id 或租约 id
- 不含密钥值的凭证来源
- 基线结果
- 候选结果
- 漏洞是否在基线上重现
- 候选是否修复了它
- 产物路径
- 已清理的设置或清理问题

截图是证据，不是密钥。它们仍然需要编辑规范：私有频道名称、用户名或消息内容可能出现。对于公共 PR，在编辑故事更强之前，优先使用 GitHub Actions 产物链接而不是内联图像。

## 浏览器和 VNC

浏览器通道有两种模式：

- **无头自动化**：CI 的默认模式。Chrome 在启用 CDP 的情况下运行，Playwright 或 OpenClaw 浏览器控制捕获截图。
- **VNC 救援**：当登录、MFA、Discord 反自动化或视觉调试需要人工时，在同一 VM 上启用。

Discord 观察者浏览器配置文件应该足够持久以避免每次运行都登录，但与个人浏览器状态隔离。配置文件属于 Mantis 机器池，不属于开发者笔记本电脑。

当 Mantis 卡住时，它发布一条 Discord 状态消息，包含：

- 运行 id
- 场景 id
- 机器提供商
- 产物目录
- 如果可用，VNC 或 noVNC 连接指令
- 简短的阻塞文本

第一个私有部署可以将这些消息发布到现有的操作者频道，稍后再移到专用的 Mantis 频道。

## 机器

Mantis 应该通过 Crabbox 优先选择 AWS 进行第一个远程实现。Crabbox 给我们提供预热机器、租约追踪、水化、日志、结果和清理。如果 AWS 容量太慢或不可用，在同一机器接口后面添加 Hetzner 提供商。

最低 VM 要求：

- Linux，带桌面能力的 Chrome 或 Chromium 安装
- 用于浏览器自动化的 CDP 访问
- 用于救援的 VNC 或 noVNC
- Node 22 和 pnpm
- OpenClaw 检出和依赖缓存
- 使用 Playwright 时的 Playwright Chromium 浏览器缓存
- 足够的 CPU 和内存用于一个 OpenClaw 网关、一个浏览器和一个模型运行
- 对 Discord、GitHub、模型提供商和凭证代理的出站访问

VM 不应该在预期的凭证或浏览器配置文件存储之外保留长期存活的原始密钥。

## 密钥

密钥存储在 GitHub 组织或仓库密钥中用于远程运行，以及在操作者控制的本地密钥文件中用于本地运行。

推荐的密钥名称：

- `OPENCLAW_QA_DISCORD_MANTIS_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_NOTIFY_CHANNEL_ID`
- `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1` 用于公共 GitHub 产物上传
- `OPENCLAW_QA_CONVEX_SITE_URL`
- `OPENCLAW_QA_CONVEX_SECRET_CI`
- `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR`
- `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR_TOKEN`

长期来看，Convex 凭证池应该保持为实时传输凭证的正常来源。GitHub 密钥引导代理和回退通道。Discord 状态反应工作流将 Mantis Crabbox 密钥映射回 Crabbox CLI 期望的 `CRABBOX_COORDINATOR` 和 `CRABBOX_COORDINATOR_TOKEN` 环境变量。普通的 `CRABBOX_*` GitHub 密钥名称作为兼容性回退仍然被接受。

Mantis 运行器绝不能打印：

- Discord 机器人令牌
- 提供商 API 密钥
- 浏览器 cookie
- 认证配置文件内容
- VNC 密码
- 原始凭证有效载荷

公共产物上传还应该编辑 Discord 目标元数据，例如机器人、服务器、频道和消息 id。GitHub 冒烟工作流为此启用 `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1`。

如果令牌意外粘贴到 issue、PR、聊天或日志中，在新密钥存储后轮换它。

## GitHub 产物和 PR 评论

Mantis 工作流应该将完整的证据包作为短期 Actions 产物上传。当工作流为漏洞报告或修复 PR 运行时，它还应该将编辑后的 PNG 截图发布到 `qa-artifacts` 分支，并在该漏洞或修复 PR 上插入或更新带有内联前后截图的评论。不要只在通用 QA 自动化 PR 上发布主要证明。原始日志、观察到的消息和其他大型证据保留在 Actions 产物中。

生产工作流应该用 Mantis GitHub App 而不是 `github-actions[bot]` 发布这些评论。将应用 id 和私钥存储为 `MANTIS_GITHUB_APP_ID` 和 `MANTIS_GITHUB_APP_PRIVATE_KEY` GitHub Actions 密钥。工作流使用隐藏标记作为插入更新键，当令牌可以编辑时更新该评论，当旧的机器人拥有的标记无法编辑时创建新的 Mantis 拥有的评论。

PR 评论应该简短且直观：

```md
Mantis Discord Status Reactions QA

Summary: Mantis reran the reported Discord status-reaction bug against the known
bad baseline and the candidate fix. The baseline reproduced the bug, while the
candidate showed the expected queued -> thinking -> done sequence.

- Scenario: `discord-status-reactions-tool-only`
- Run: <workflow run link>
- Artifact: <artifact link>
- Baseline: `<status>` at `<sha>`
- Candidate: `<status>` at `<sha>`

| Baseline            | Candidate           |
| ------------------- | ------------------- |
| <inline screenshot> | <inline screenshot> |
```

当运行因测试工具失败而失败时，评论必须说明这一点，而不是暗示候选失败了。

## 私有部署说明

私有部署可能已经有一个 Mantis Discord 应用程序。当该应用程序有正确的机器人权限并且可以安全轮换时，重用该应用程序而不是创建另一个应用。

通过密钥或部署配置设置初始操作者通知频道。它可以首先指向现有的维护人员或操作频道，然后在专用 Mantis 频道存在后移动。

不要将服务器 id、频道 id、机器人令牌、浏览器 cookie 或 VNC 密码放入此文档中。将它们存储在 GitHub 密钥、凭证代理或操作者的本地密钥存储中。

## 添加场景

Mantis 场景应该声明：

- id 和标题
- 传输
- 必需凭证
- 基线引用策略
- 候选引用策略
- OpenClaw 配置补丁
- 设置步骤
- 刺激
- 预期基线 oracle
- 预期候选 oracle
- 视觉捕获目标
- 超时预算
- 清理步骤

场景应该优先选择小型、类型化的 oracle：

- Discord 反应状态用于反应漏洞
- Discord 消息引用用于线程漏洞
- Slack 线程 ts 和反应 API 状态用于 Slack 漏洞
- 电子邮件消息 id 和头部用于电子邮件漏洞
- 当 UI 是唯一可靠的可观察项时，使用浏览器截图

视觉检查应该是补充性的。如果平台 API 可以证明漏洞，使用 API 作为通过/失败 oracle，并将截图用于人类信心。

## 提供商扩展

Discord 之后，相同的运行器可以添加：

- Slack：反应、线程、应用提及、模态、文件上传。
- 电子邮件：Gmail 认证和使用 `gog` 的消息线程，其中连接器不够用。
- WhatsApp：QR 登录、重新识别、消息投递、媒体、反应。
- Telegram：群组提及门控、命令、可用时的反应。
- Matrix：加密房间、线程或回复关系、重启恢复。

每个传输应该有一个便宜的冒烟场景和一个或多个漏洞类场景。昂贵的视觉场景应该保持选择加入。

## 开放问题

- 当现有 Mantis 机器人被重用时，哪个 Discord 机器人应该是驱动程序，哪个应该是 SUT？
- 在第一阶段，观察者浏览器登录应该使用人工 Discord 账户、测试账户还是只有机器人可读的 REST 证据？
- GitHub 应该为 PR 保留 Mantis 产物多长时间？
- ClawSweeper 什么时候应该自动推荐 Mantis 而不是等待维护人员命令？
- 截图在上传到公共 PR 之前是否应该编辑或裁剪？
