---
summary: "CLI 引导的完整参考：每个步骤、标志和配置字段"
read_when:
  - 查找特定的引导步骤或标志时
  - 使用非交互模式自动化引导时
  - 调试引导行为时
title: "引导参考"
sidebarTitle: "引导参考"
---

这是 `openclaw onboard` 的完整参考。
有关高级概述，请参阅[引导（CLI）](/start/wizard)。

## 流程详情（本地模式）

<Steps>
  <Step title="现有配置检测">
    - 如果 `~/.openclaw/openclaw.json` 存在，选择**保留 / 修改 / 重置**。
    - 重新运行引导**不会**清除任何内容，除非你明确选择**重置**
      （或传入 `--reset`）。
    - CLI `--reset` 默认为 `config+creds+sessions`；使用 `--reset-scope full`
      也可以删除工作区。
    - 如果配置无效或包含遗留键，向导会停止并要求
      你在继续之前运行 `openclaw doctor`。
    - 重置使用 `trash`（从不使用 `rm`）并提供范围：
      - 仅配置
      - 配置 + 凭据 + 会话
      - 完全重置（也删除工作区）

  </Step>
  <Step title="模型/认证">
    - **Anthropic API 密钥**：如果存在 `ANTHROPIC_API_KEY` 则使用，否则提示输入密钥，然后为守护进程使用保存它。
    - **Anthropic API 密钥**：在引导/配置中首选 Anthropic 助手选择。
    - **Anthropic 设置 token**：在引导/配置中仍然可用，尽管 OpenClaw 现在在可用时偏好重用 Claude CLI。
    - **OpenAI Code（Codex）订阅（OAuth）**：浏览器流程；粘贴 `code#state`。
      - 当模型未设置或已经是 OpenAI 系列时，将 `agents.defaults.model` 设置为 `openai-codex/gpt-5.5`。
    - **OpenAI Code（Codex）订阅（设备配对）**：带有短期设备代码的浏览器配对流程。
      - 当模型未设置或已经是 OpenAI 系列时，将 `agents.defaults.model` 设置为 `openai-codex/gpt-5.5`。
    - **OpenAI API 密钥**：如果存在 `OPENAI_API_KEY` 则使用，否则提示输入密钥，然后将其存储在认证配置文件中。
      - 当模型未设置、`openai/*` 或 `openai-codex/*` 时，将 `agents.defaults.model` 设置为 `openai/gpt-5.5`。
    - **xAI（Grok）API 密钥**：提示输入 `XAI_API_KEY` 并将 xAI 配置为模型提供商。
    - **OpenCode**：提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`，在 https://opencode.ai/auth 获取），并让你选择 Zen 或 Go 目录。
    - **Ollama**：首先提供**云 + 本地**、**仅云**或**仅本地**选项。`仅云`提示输入 `OLLAMA_API_KEY` 并使用 `https://ollama.com`；主机支持的模式提示输入 Ollama 基础 URL，发现可用模型，并在需要时自动拉取选定的本地模型；`云 + 本地` 也检查该 Ollama 主机是否已登录以进行云访问。
    - 更多细节：[Ollama](/providers/ollama)
    - **API 密钥**：为你存储密钥。
    - **Vercel AI Gateway（多模型代理）**：提示输入 `AI_GATEWAY_API_KEY`。
    - 更多细节：[Vercel AI Gateway](/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**：提示输入账户 ID、网关 ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    - 更多细节：[Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)
    - **MiniMax**：自动写入配置；托管默认值为 `MiniMax-M2.7`。
      API 密钥设置使用 `minimax/...`，OAuth 设置使用
      `minimax-portal/...`。
    - 更多细节：[MiniMax](/providers/minimax)
    - **StepFun**：自动为中国或全球端点上的 StepFun 标准或 Step Plan 写入配置。
    - 标准目前包括 `step-3.5-flash`，Step Plan 还包括 `step-3.5-flash-2603`。
    - 更多细节：[StepFun](/providers/stepfun)
    - **Synthetic（Anthropic 兼容）**：提示输入 `SYNTHETIC_API_KEY`。
    - 更多细节：[Synthetic](/providers/synthetic)
    - **Moonshot（Kimi K2）**：自动写入配置。
    - **Kimi Coding**：自动写入配置。
    - 更多细节：[Moonshot AI（Kimi + Kimi Coding）](/providers/moonshot)
    - **跳过**：尚未配置认证。
    - 从检测到的选项中选择默认模型（或手动输入 provider/model）。为获得最佳质量和更低的提示词注入风险，选择你的提供商栈中可用的最强最新一代模型。
    - 引导运行模型检查，如果已配置的模型未知或缺少认证，则发出警告。
    - API 密钥存储模式默认为纯文本认证配置文件值。使用 `--secret-input-mode ref` 来存储 env 支持的引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）。
    - 认证配置文件位于 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（API 密钥 + OAuth）。`~/.openclaw/credentials/oauth.json` 是遗留仅导入来源。
    - 更多细节：[/concepts/oauth](/concepts/oauth)
    <Note>
    无头/服务器提示：在有浏览器的机器上完成 OAuth，然后将
    该智能助手的 `auth-profiles.json`（例如
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`，或匹配的
    `$OPENCLAW_STATE_DIR/...` 路径）复制到网关主机。`credentials/oauth.json`
    只是遗留的导入来源。
    </Note>
  </Step>
  <Step title="工作区">
    - 默认 `~/.openclaw/workspace`（可配置）。
    - 为智能助手引导仪式所需的工作区文件播种。
    - 完整工作区布局 + 备份指南：[智能助手工作区](/concepts/agent-workspace)

  </Step>
  <Step title="网关">
    - 端口、绑定、认证模式、tailscale 暴露。
    - 认证建议：即使对于回环也保持 **Token**，以便本地 WS 客户端必须认证。
    - 在 token 模式下，交互式设置提供：
      - **生成/存储纯文本 token**（默认）
      - **使用 SecretRef**（选择加入）
      - 快速启动在引导探测/仪表板引导中重用现有的 `gateway.auth.token` SecretRefs，跨 `env`、`file` 和 `exec` 提供商。
      - 如果该 SecretRef 已配置但无法解析，引导会提前失败并给出明确的修复消息，而不是静默降级运行时认证。
    - 在密码模式下，交互式设置还支持纯文本或 SecretRef 存储。
    - 非交互式 token SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要引导进程环境中的非空 env 变量。
      - 不能与 `--gateway-token` 组合。
    - 仅在你完全信任每个本地进程时禁用认证。
    - 非回环绑定仍然需要认证。

  </Step>
  <Step title="通道">
    - [WhatsApp](/channels/whatsapp)：可选的二维码登录。
    - [Telegram](/channels/telegram)：机器人 token。
    - [Discord](/channels/discord)：机器人 token。
    - [Google Chat](/channels/googlechat)：服务账户 JSON + webhook 受众。
    - [Mattermost](/channels/mattermost)（插件）：机器人 token + 基础 URL。
    - [Signal](/channels/signal)：可选的 `signal-cli` 安装 + 账户配置。
    - [BlueBubbles](/channels/bluebubbles)：**iMessage 推荐**；服务器 URL + 密码 + webhook。
    - [iMessage](/channels/imessage)：遗留 `imsg` CLI 路径 + 数据库访问。
    - 私信安全：默认为配对。第一条私信发送代码；通过 `openclaw pairing approve <channel> <code>` 批准或使用允许列表。

  </Step>
  <Step title="网络搜索">
    - 选择受支持的提供商，如 Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG 或 Tavily（或跳过）。
    - 支持 API 的提供商可以使用 env 变量或现有配置进行快速设置；免密钥提供商使用其提供商特定的先决条件。
    - 使用 `--skip-search` 跳过。
    - 稍后配置：`openclaw configure --section web`。

  </Step>
  <Step title="守护进程安装">
    - macOS：LaunchAgent
      - 需要登录的用户会话；对于无头模式，使用自定义 LaunchDaemon（未附带）。
    - Linux（以及通过 WSL2 的 Windows）：systemd 用户单元
      - 引导尝试通过 `loginctl enable-linger <user>` 启用持久化，以便网关在注销后保持运行。
      - 可能提示 sudo（写入 `/var/lib/systemd/linger`）；首先在不使用 sudo 的情况下尝试。
    - **运行时选择：** Node（推荐；WhatsApp/Telegram 必需）。不推荐 Bun。
    - 如果 token 认证需要 token 且 `gateway.auth.token` 由 SecretRef 管理，守护进程安装会验证它，但不会将解析的纯文本 token 值持久化到监督器服务环境元数据中。
    - 如果 token 认证需要 token 且配置的 token SecretRef 未解析，守护进程安装会被阻止并提供可操作的指导。
    - 如果 `gateway.auth.token` 和 `gateway.auth.password` 都已配置且 `gateway.auth.mode` 未设置，守护进程安装会被阻止，直到明确设置模式。

  </Step>
  <Step title="健康检查">
    - 启动网关（如需）并运行 `openclaw health`。
    - 提示：`openclaw status --deep` 将实时网关健康探测添加到状态输出，包括支持时的通道探测（需要可访问的网关）。

  </Step>
  <Step title="技能（推荐）">
    - 读取可用技能并检查要求。
    - 让你选择节点管理器：**npm / pnpm**（不推荐 bun）。
    - 安装可选依赖（某些在 macOS 上使用 Homebrew）。

  </Step>
  <Step title="完成">
    - 摘要 + 后续步骤，包括用于额外功能的 iOS/Android/macOS 应用。

  </Step>
</Steps>

<Note>
如果未检测到 GUI，引导会打印控制 UI 的 SSH 端口转发指令，而不是打开浏览器。
如果控制 UI 资产缺失，引导会尝试构建它们；回退是 `pnpm ui:build`（自动安装 UI 依赖）。
</Note>

## 非交互模式

使用 `--non-interactive` 自动化或脚本化引导：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback \
  --install-daemon \
  --daemon-runtime node \
  --skip-skills
```

添加 `--json` 以获得机器可读的摘要。

非交互模式下的网关 token SecretRef：

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

`--gateway-token` 和 `--gateway-token-ref-env` 互斥。

<Note>
`--json` **不**隐含非交互模式。对于脚本使用 `--non-interactive`（和 `--workspace`）。
</Note>

特定于提供商的命令示例位于[CLI 自动化](/start/wizard-cli-automation#provider-specific-examples)。
使用此参考页面了解标志语义和步骤顺序。

### 添加智能助手（非交互模式）

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.5 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## 网关向导 RPC

网关通过 RPC（`wizard.start`、`wizard.next`、`wizard.cancel`、`wizard.status`）公开引导流程。
客户端（macOS 应用、控制 UI）可以在不重新实现引导逻辑的情况下渲染步骤。

## Signal 设置（signal-cli）

引导可以从 GitHub releases 安装 `signal-cli`：

- 下载适当的发布资产。
- 将其存储在 `~/.openclaw/tools/signal-cli/<version>/` 下。
- 将 `channels.signal.cliPath` 写入你的配置。

注意：

- JVM 构建需要 **Java 21**。
- 可用时使用原生构建。
- Windows 使用 WSL2；signal-cli 安装在 WSL 内部遵循 Linux 流程。

## 向导写入的内容

`~/.openclaw/openclaw.json` 中的典型字段：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers`（如果选择了 Minimax）
- `tools.profile`（本地引导默认为 `"coding"`（如未设置）；现有明确值被保留）
- `gateway.*`（模式、绑定、认证、tailscale）
- `session.dmScope`（行为详情：[CLI 设置参考](/start/wizard-cli-reference#outputs-and-internals)）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.matrix.*`、`channels.signal.*`、`channels.imessage.*`
- 通道允许列表（Slack/Discord/Matrix/Microsoft Teams），当你在提示中选择加入时（名称在可能的情况下解析为 ID）。
- `skills.install.nodeManager`
  - `setup --node-manager` 接受 `npm`、`pnpm` 或 `bun`。
  - 手动配置仍然可以通过直接设置 `skills.install.nodeManager` 使用 `yarn`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 写入 `agents.list[]` 和可选的 `bindings`。

WhatsApp 凭据位于 `~/.openclaw/credentials/whatsapp/<accountId>/` 下。
会话存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。

某些通道作为插件交付。当你在设置期间选择其中一个时，引导
会提示安装它（npm 或本地路径），然后才能配置。

## 相关文档

- 引导概述：[引导（CLI）](/start/wizard)
- macOS 应用引导：[引导](/start/onboarding)
- 配置参考：[网关配置](/gateway/configuration)
- 提供商：[WhatsApp](/channels/whatsapp)、[Telegram](/channels/telegram)、[Discord](/channels/discord)、[Google Chat](/channels/googlechat)、[Signal](/channels/signal)、[BlueBubbles](/channels/bluebubbles)（iMessage）、[iMessage](/channels/imessage)（遗留）
- 技能：[技能](/tools/skills)、[技能配置](/tools/skills-config)
