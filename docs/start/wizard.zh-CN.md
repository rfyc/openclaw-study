---
summary: "CLI 入门：gateway、工作区、渠道和技能的引导设置"
read_when:
  - 运行或配置 CLI 入门
  - 设置新机器
title: "入门（CLI）"
sidebarTitle: "入门：CLI"
---

CLI 入门是在 macOS、Linux 或 Windows（通过 WSL2；强烈推荐）上设置 OpenClaw 的**推荐**方式。
它在一个引导流程中配置本地 Gateway 或远程 Gateway 连接，以及渠道、技能和工作区默认值。

```bash
openclaw onboard
```

<Info>
最快的第一次聊天：打开 Control UI（无需渠道设置）。运行 `openclaw dashboard` 并在浏览器中聊天。文档：[仪表盘](/web/dashboard)。
</Info>

稍后重新配置：

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` 不意味着非交互式模式。对于脚本，使用 `--non-interactive`。
</Note>

<Tip>
CLI 入门包含一个网络搜索步骤，您可以在其中选择提供商，例如 Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG 或 Tavily。某些提供商需要 API 密钥，而其他提供商不需要密钥。您也可以稍后使用 `openclaw configure --section web` 进行配置。文档：[Web 工具](/tools/web)。
</Tip>

## 快速开始 vs 高级

入门以**快速开始**（默认值）vs **高级**（完全控制）开始。

<Tabs>
  <Tab title="快速开始（默认值）">
    - 本地 gateway（回环）
    - 工作区默认（或现有工作区）
    - Gateway 端口 **18789**
    - Gateway 认证**令牌**（自动生成，即使在回环上）
    - 新本地设置的工具策略默认值：`tools.profile: "coding"`（保留现有的显式配置文件）
    - DM 隔离默认：本地入门在未设置时写入 `session.dmScope: "per-channel-peer"`。详情：[CLI 设置参考](/start/wizard-cli-reference#outputs-and-internals)
    - Tailscale 暴露**关闭**
    - Telegram + WhatsApp DM 默认为**允许列表**（将提示您输入电话号码）

  </Tab>
  <Tab title="高级（完全控制）">
    - 公开每个步骤（模式、工作区、gateway、渠道、守护进程、技能）。

  </Tab>
</Tabs>

## 入门配置的内容

**本地模式（默认）**引导您完成以下步骤：

1. **模型/认证** — 选择任何受支持的提供商/认证流程（API 密钥、OAuth 或特定提供商的手动认证），包括自定义提供商（OpenAI 兼容、Anthropic 兼容或未知自动检测）。选择默认模型。
   安全说明：如果此智能体将运行工具或处理 webhook/hooks 内容，请优先使用最强的最新一代可用模型并保持严格的工具策略。较弱/较旧的层更容易受到提示注入。
   对于非交互式运行，`--secret-input-mode ref` 在认证配置文件中存储环境支持的引用，而不是明文 API 密钥值。
   在非交互式 `ref` 模式下，提供商环境变量必须设置；在没有该环境变量的情况下传递内联密钥标志会快速失败。
   在交互式运行中，选择秘密引用模式可让您指向环境变量或配置的提供商引用（`file` 或 `exec`），并在保存之前进行快速预检验证。
   对于 Anthropic，交互式入门/配置提供 **Anthropic Claude CLI** 作为首选本地路径，以及 **Anthropic API 密钥**作为推荐的生产路径。Anthropic 设置令牌作为受支持的令牌认证路径也仍然可用。
2. **工作区** — 智能体文件的位置（默认 `~/.openclaw/workspace`）。播种引导文件。
3. **Gateway** — 端口、绑定地址、认证模式、Tailscale 暴露。
   在交互式令牌模式下，选择默认明文令牌存储或选择 SecretRef。
   非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
4. **渠道** — 内置和捆绑的聊天渠道，如 BlueBubbles、Discord、Feishu、Google Chat、Mattermost、Microsoft Teams、QQ Bot、Signal、Slack、Telegram、WhatsApp 等。
5. **守护进程** — 安装 LaunchAgent（macOS）、systemd 用户单元（Linux/WSL2）或带每用户启动文件夹回退的原生 Windows 计划任务。
   如果令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理，守护进程安装会验证它，但不会将解析的令牌持久化到监督服务环境元数据中。
   如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，守护进程安装会被阻止并提供可操作的指导。
   如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且 `gateway.auth.mode` 未设置，守护进程安装会被阻止，直到明确设置模式。
6. **健康检查** — 启动 Gateway 并验证它正在运行。
7. **技能** — 安装推荐的技能和可选依赖项。

<Note>
重新运行入门**不**会清除任何内容，除非您明确选择**重置**（或传递 `--reset`）。
CLI `--reset` 默认为配置、凭据和会话；使用 `--reset-scope full` 包括工作区。
如果配置无效或包含旧版密钥，入门会要求您先运行 `openclaw doctor`。
</Note>

**远程模式**仅将本地客户端配置为连接到其他地方的 Gateway。
它**不**会在远程主机上安装或更改任何内容。

## 添加另一个智能体

使用 `openclaw agents add <name>` 创建一个具有自己工作区、会话和认证配置文件的独立智能体。不使用 `--workspace` 运行时会启动入门。

设置的内容：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

注意：

- 默认工作区遵循 `~/.openclaw/workspace-<agentId>`。
- 添加 `bindings` 以路由入站消息（入门可以做到这一点）。
- 非交互式标志：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 完整参考

有关详细的逐步分解和配置输出，请参见[CLI 设置参考](/start/wizard-cli-reference)。
有关非交互式示例，请参见 [CLI 自动化](/start/wizard-cli-automation)。
有关更深入的技术参考，包括 RPC 详情，请参见[入门参考](/reference/wizard)。

## 相关文档

- CLI 命令参考：[`openclaw onboard`](/cli/onboard)
- 入门概述：[入门概述](/start/onboarding-overview)
- macOS 应用入门：[入门](/start/onboarding)
- 智能体首次运行仪式：[智能体引导](/start/bootstrapping)
