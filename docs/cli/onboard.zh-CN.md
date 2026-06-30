---
summary: "`openclaw onboard` 的 CLI 参考（交互式入门引导）"
read_when:
  - 你想要 gateway、工作空间、认证、频道和技能的引导设置时
title: "Onboard"
---

# `openclaw onboard`

本地或远程 Gateway 设置的交互式入门引导。

## 相关指南

<CardGroup cols={2}>
  <Card title="CLI 入门引导中心" href="/start/wizard" icon="rocket">
    交互式 CLI 流程的演练。
  </Card>
  <Card title="入门引导概述" href="/start/onboarding-overview" icon="map">
    OpenClaw 入门引导如何组合在一起。
  </Card>
  <Card title="CLI 设置参考" href="/start/wizard-cli-reference" icon="book">
    输出、内部结构和每步行为。
  </Card>
  <Card title="CLI 自动化" href="/start/wizard-cli-automation" icon="terminal">
    非交互式标志和脚本化设置。
  </Card>
  <Card title="macOS 应用入门引导" href="/start/onboarding" icon="apple">
    macOS 菜单栏应用的入门引导流程。
  </Card>
</CardGroup>

## 示例

```bash
openclaw onboard
openclaw onboard --modern
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --flow import
openclaw onboard --import-from hermes --import-source ~/.hermes
openclaw onboard --skip-bootstrap
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

`--flow import` 使用插件拥有的迁移提供商（如 Hermes）。它仅在全新的 OpenClaw 设置下运行；如果存在现有的配置、凭据、会话或工作空间内存/身份文件，请在导入之前重置或选择全新设置。

`--modern` 启动 Crestodian 对话式入门引导预览。不使用 `--modern` 时，`openclaw onboard` 保持经典入门引导流程。

对于明文私有网络 `ws://` 目标（仅限受信任网络），在入门引导进程环境中设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。对于此客户端侧传输应急措施，没有 `openclaw.json` 等效项。

非交互式自定义提供商：

```bash
openclaw onboard --non-interactive \
  --auth-choice custom-api-key \
  --custom-base-url "https://llm.example.com/v1" \
  --custom-model-id "foo-large" \
  --custom-api-key "$CUSTOM_API_KEY" \
  --secret-input-mode plaintext \
  --custom-compatibility openai \
  --custom-image-input
```

在非交互模式下 `--custom-api-key` 是可选的。如果省略，入门引导会检查 `CUSTOM_API_KEY`。
OpenClaw 自动将常见的视觉模型 ID 标记为具有图像能力。对于未知的自定义视觉 ID 传递 `--custom-image-input`，或传递 `--custom-text-input` 强制纯文本元数据。

LM Studio 在非交互模式下也支持提供商特定的密钥标志：

```bash
openclaw onboard --non-interactive \
  --auth-choice lmstudio \
  --custom-base-url "http://localhost:1234/v1" \
  --custom-model-id "qwen/qwen3.5-9b" \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --accept-risk
```

非交互式 Ollama：

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

`--custom-base-url` 默认为 `http://127.0.0.1:11434`。`--custom-model-id` 是可选的；如果省略，入门引导使用 Ollama 的建议默认值。云模型 ID（如 `kimi-k2.5:cloud`）在此处也可以使用。

将提供商密钥存储为引用而不是明文：

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

使用 `--secret-input-mode ref`，入门引导写入环境支持的引用而不是明文密钥值。
对于认证配置文件支持的提供商，这会写入 `keyRef` 条目；对于自定义提供商，这会将 `models.providers.<id>.apiKey` 写入为环境引用（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。

非交互式 `ref` 模式合同：

- 在入门引导进程环境中设置提供商环境变量（例如 `OPENAI_API_KEY`）。
- 不要传递内联密钥标志（例如 `--openai-api-key`），除非同时设置了该环境变量。
- 如果在没有设置所需环境变量的情况下传递内联密钥标志，入门引导将快速失败并提供指导。

非交互模式下的 Gateway 令牌选项：

- `--gateway-auth token --gateway-token <token>` 存储明文令牌。
- `--gateway-auth token --gateway-token-ref-env <name>` 将 `gateway.auth.token` 存储为环境 SecretRef。
- `--gateway-token` 和 `--gateway-token-ref-env` 是互斥的。
- `--gateway-token-ref-env` 需要入门引导进程环境中的非空环境变量。
- 使用 `--install-daemon` 时，当令牌认证需要令牌时，SecretRef 管理的 gateway 令牌会被验证但不会作为解析的明文持久化在监督服务环境元数据中。
- 使用 `--install-daemon` 时，如果令牌模式需要令牌而配置的令牌 SecretRef 未解析，入门引导将关闭失败并提供修复指导。
- 使用 `--install-daemon` 时，如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且 `gateway.auth.mode` 未设置，入门引导将阻止安装直到明确设置模式。
- 本地入门引导将 `gateway.mode="local"` 写入配置。如果后来的配置文件缺少 `gateway.mode`，将其视为配置损坏或不完整的手动编辑，而不是有效的本地模式快捷方式。
- 本地入门引导在所选设置路径需要时安装选定的可下载插件。
- 远程入门引导仅写入远程 Gateway 的连接信息，不安装本地插件包。
- `--allow-unconfigured` 是一个单独的 gateway 运行时应急开关。它不意味着入门引导可以省略 `gateway.mode`。

示例：

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN \
  --accept-risk
```

非交互式本地 gateway 健康：

- 除非你传递 `--skip-health`，否则入门引导在成功退出之前会等待可达的本地 gateway。
- `--install-daemon` 首先启动托管的 gateway 安装路径。没有它，你必须已经有一个运行的本地 gateway，例如 `openclaw gateway run`。
- 如果你只想在自动化中进行配置/工作空间/引导写入，使用 `--skip-health`。
- 如果你自己管理工作空间文件，传递 `--skip-bootstrap` 以设置 `agents.defaults.skipBootstrap: true` 并跳过创建 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 和 `BOOTSTRAP.md`。
- 在原生 Windows 上，`--install-daemon` 首先尝试计划任务，如果任务创建被拒绝则回退到每用户启动文件夹登录项。

使用引用模式的交互式入门引导行为：

- 在提示时选择**使用密钥引用**。
- 然后选择以下任一：
  - 环境变量
  - 已配置的密钥提供商（`file` 或 `exec`）
- 入门引导在保存引用之前执行快速预检验证。
  - 如果验证失败，入门引导显示错误并让你重试。

### 非交互式 Z.AI 端点选择

<Note>
`--auth-choice zai-api-key` 自动检测你的密钥的最佳 Z.AI 端点（优先使用带有 `zai/glm-5.1` 的通用 API）。如果你特别想要 GLM Coding Plan 端点，请选择 `zai-coding-global` 或 `zai-coding-cn`。
</Note>

```bash
# 无提示端点选择
openclaw onboard --non-interactive \
  --auth-choice zai-coding-global \
  --zai-api-key "$ZAI_API_KEY"

# 其他 Z.AI 端点选择：
# --auth-choice zai-coding-cn
# --auth-choice zai-global
# --auth-choice zai-cn
```

非交互式 Mistral 示例：

```bash
openclaw onboard --non-interactive \
  --auth-choice mistral-api-key \
  --mistral-api-key "$MISTRAL_API_KEY"
```

## 流程说明

<AccordionGroup>
  <Accordion title="流程类型">
    - `quickstart`：最少提示，自动生成 gateway 令牌。
    - `manual`：完整的端口、绑定和认证提示（`advanced` 的别名）。
    - `import`：运行检测到的迁移提供商，预览计划，然后在确认后应用。

  </Accordion>
  <Accordion title="提供商预过滤">
    当认证选择暗示首选提供商时，入门引导会将默认模型和允许列表选择器预过滤到该提供商。对于 Volcengine 和 BytePlus，这也匹配编码计划变体（`volcengine-plan/*`、`byteplus-plan/*`）。

    如果首选提供商过滤器没有产生已加载的模型，入门引导会回退到未过滤的目录而不是留下空的选择器。

  </Accordion>
  <Accordion title="网络搜索后续">
    一些网络搜索提供商会触发提供商特定的后续提示：

    - **Grok** 可以使用相同的 `XAI_API_KEY` 提供可选的 `x_search` 设置和 `x_search` 模型选择。
    - **Kimi** 可以询问 Moonshot API 区域（`api.moonshot.ai` 与 `api.moonshot.cn`）和默认的 Kimi 网络搜索模型。

  </Accordion>
  <Accordion title="其他行为">
    - 本地入门引导 DM 范围行为：[CLI 设置参考](/start/wizard-cli-reference#outputs-and-internals)。
    - 最快的第一次聊天：`openclaw dashboard`（Control UI，无需频道设置）。
    - 自定义提供商：连接任何 OpenAI 或 Anthropic 兼容端点，包括未列出的托管提供商。使用 Unknown 自动检测。
    - 如果检测到 Hermes 状态，入门引导会提供迁移流程。使用 [Migrate](/cli/migrate) 进行预演计划、覆盖模式、报告和精确映射。

  </Accordion>
</AccordionGroup>

## 常用后续命令

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` 不意味着非交互模式。对于脚本使用 `--non-interactive`。
</Note>
