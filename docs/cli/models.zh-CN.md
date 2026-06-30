---
summary: "`openclaw models` 的 CLI 参考（status/list/set/scan、别名、回退、认证）"
read_when:
  - 你想更改默认模型或查看提供商认证状态时
  - 你想扫描可用模型/提供商并调试认证配置文件时
title: "Models"
---

# `openclaw models`

模型发现、扫描和配置（默认模型、回退、认证配置文件）。

相关：

- 提供商 + 模型：[Models](/providers/models)
- 模型选择概念 + `/models` 斜线命令：[Models concept](/concepts/models)
- 提供商认证设置：[Getting started](/start/getting-started)

## 常用命令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 显示已解析的默认值/回退以及认证概览。
当提供商使用量快照可用时，OAuth/API 密钥状态部分包含提供商使用窗口和配额快照。
当前使用窗口提供商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI Codex、MiniMax、小米和 z.ai。使用认证来自提供商特定的 hooks（如果可用）；否则 OpenClaw 回退到来自认证配置文件、环境变量或配置的匹配 OAuth/API 密钥凭据。
在 `--json` 输出中，`auth.providers` 是环境/配置/存储感知的提供商概览，而 `auth.oauth` 仅是认证存储配置文件健康状态。
添加 `--probe` 以对每个已配置的提供商配置文件运行实时认证探测。探测是真实请求（可能消耗令牌并触发速率限制）。
使用 `--agent <id>` 检查已配置代理的模型/认证状态。省略时，命令使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（如果已设置），否则使用已配置的默认代理。
探测行可以来自认证配置文件、环境凭据或 `models.json`。

注意：

- `models set <model-or-alias>` 接受 `provider/model` 或别名。
- `models list` 是只读的：它读取配置、认证配置文件、现有目录状态和提供商拥有的目录行，但不重写 `models.json`。
- `Auth` 列是提供商级别的只读列。它从本地认证配置文件元数据、环境标记、已配置的提供商密钥、本地提供商标记、AWS Bedrock 环境/配置文件标记和插件合成认证元数据计算；它不加载提供商运行时、读取密钥链密钥、调用提供商 API 或证明确切的每模型执行就绪性。
- `models list --all --provider <id>` 可以包含来自插件清单或捆绑提供商目录元数据的提供商拥有的静态目录行，即使你尚未与该提供商进行认证。这些行在配置匹配认证之前仍显示为不可用。
- `models list` 在提供商目录发现缓慢时保持控制平面响应。默认和已配置的视图在短暂等待后回退到已配置或合成的模型行，并让发现在后台完成。当你需要精确的完整发现目录并愿意等待提供商发现时，使用 `--all`。
- 广泛的 `models list --all` 在不加载提供商运行时补充 hooks 的情况下将清单目录行合并到注册表行之上。仅标记为 `static` 的提供商使用提供商过滤的清单快速路径；标记为 `refreshable` 的提供商保持注册表/缓存支持并将清单行附加为补充，而标记为 `runtime` 的提供商保持注册表/运行时发现。
- `models list` 保持原生模型元数据和运行时上限不同。在表格输出中，`Ctx` 在有效运行时上限与原生上下文窗口不同时显示 `contextTokens/contextWindow`；当提供商公开该上限时，JSON 行包含 `contextTokens`。
- `models list --provider <id>` 按提供商 ID 过滤，如 `moonshot` 或 `openai-codex`。它不接受交互式提供商选择器中的显示标签，如 `Moonshot AI`。
- 模型引用通过在**第一个** `/` 上拆分来解析。如果模型 ID 包含 `/`（OpenRouter 风格），请包含提供商前缀（示例：`openrouter/moonshotai/kimi-k2`）。
- 如果你省略提供商，OpenClaw 首先将输入解析为别名，然后作为该确切模型 ID 的唯一已配置提供商匹配，最后才回退到已配置的默认提供商并发出弃用警告。如果该提供商不再公开已配置的默认模型，OpenClaw 回退到第一个已配置的提供商/模型，而不是显示过时的已移除提供商默认值。
- `models status` 可能在认证输出中显示 `marker(<value>)` 用于非密钥占位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`），而不是将它们屏蔽为密钥。

### models scan

`models scan` 读取 OpenRouter 的公开 `:free` 目录并对候选进行排名以供回退使用。目录本身是公开的，因此仅元数据扫描不需要 OpenRouter 密钥。

默认情况下，OpenClaw 尝试通过实时模型调用探测工具和图像支持。如果未配置 OpenRouter 密钥，命令回退到仅元数据输出，并解释 `:free` 模型仍然需要 `OPENROUTER_API_KEY` 才能进行探测和推理。

选项：

- `--no-probe`（仅元数据；无配置/密钥查找）
- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>`（目录请求和每次探测超时）
- `--concurrency <n>`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

`--set-default` 和 `--set-image` 需要实时探测；仅元数据扫描结果是信息性的，不应用于配置。

### models status

选项：

- `--json`
- `--plain`
- `--check`（退出 1=过期/缺失，2=即将过期）
- `--probe`（对已配置的认证配置文件进行实时探测）
- `--probe-provider <name>`（探测一个提供商）
- `--probe-profile <id>`（重复或以逗号分隔的配置文件 ID）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`（已配置的代理 ID；覆盖 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`）

`--json` 保留 stdout 供 JSON 有效负载使用。认证配置文件、提供商和启动诊断路由到 stderr，以便脚本可以将 stdout 直接通过管道传输到 `jq` 等工具。

探测状态桶：

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

要预期的探测详细信息/原因码：

- `excluded_by_auth_order`：存储的配置文件存在，但明确的 `auth.order.<provider>` 省略了它，因此探测报告排除而不是尝试它。
- `missing_credential`、`invalid_expires`、`expired`、`unresolved_ref`：配置文件存在但不符合条件/无法解析。
- `no_model`：提供商认证存在，但 OpenClaw 无法为该提供商解析可探测的模型候选。

## 别名 + 回退

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## 认证配置文件

```bash
openclaw models auth add
openclaw models auth list [--provider <id>] [--json]
openclaw models auth login --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` 是交互式认证助手。它可以启动提供商认证流程（OAuth/API 密钥）或根据你选择的提供商指导你进行手动令牌粘贴。

`models auth list` 列出所选代理的已保存认证配置文件，而不打印令牌、API 密钥或 OAuth 密钥材料。使用 `--provider <id>` 过滤到一个提供商（如 `openai-codex`），使用 `--json` 进行脚本化。

`models auth login` 运行提供商插件的认证流程（OAuth/API 密钥）。使用 `openclaw plugins list` 查看已安装的提供商。
使用 `openclaw models auth --agent <id> <subcommand>` 将认证结果写入特定的已配置代理存储。父级 `--agent` 标志受 `add`、`list`、`login`、`setup-token`、`paste-token` 和 `login-github-copilot` 支持。

示例：

```bash
openclaw models auth login --provider openai-codex --set-default
openclaw models auth list --provider openai-codex
```

注意：

- `setup-token` 和 `paste-token` 对于公开令牌认证方法的提供商仍然是通用的令牌命令。
- `setup-token` 需要交互式 TTY 并运行提供商的令牌认证方法（默认为该提供商公开 `setup-token` 方法时）。
- `paste-token` 接受在其他地方生成的令牌字符串或来自自动化的令牌。
- `paste-token` 需要 `--provider`，提示输入令牌值，并将其写入默认配置文件 ID `<provider>:manual`，除非你传递 `--profile-id`。
- `paste-token --expires-in <duration>` 从相对持续时间（如 `365d` 或 `12h`）存储绝对令牌到期。
- Anthropic 注意：Anthropic 员工告诉我们 OpenClaw 风格的 Claude CLI 使用再次被允许，因此 OpenClaw 将 Claude CLI 重用和 `claude -p` 用法视为此集成的许可使用，除非 Anthropic 发布新策略。
- Anthropic `setup-token` / `paste-token` 作为受支持的 OpenClaw 令牌路径仍然可用，但 OpenClaw 现在在可用时优先选择 Claude CLI 重用和 `claude -p`。

## 相关

- [CLI 参考](/cli)
- [模型选择](/concepts/model-providers)
- [模型故障转移](/concepts/model-failover)
