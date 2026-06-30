---
summary: "模型提供商概述，包含示例配置和 CLI 流程"
read_when:
  - 你需要逐提供商的模型设置参考
  - 你想要模型提供商的示例配置或 CLI 引导命令
title: "模型提供商"
sidebarTitle: "模型提供商"
---

**LLM/模型提供商**参考（不是 WhatsApp/Telegram 等聊天频道）。有关模型选择规则，参见[模型](/concepts/models)。

## 快速规则

<AccordionGroup>
  <Accordion title="模型引用和 CLI 助手">
    - 模型引用使用 `provider/model`（例如：`opencode/claude-opus-4-6`）。
    - `agents.defaults.models` 在设置时充当允许列表。
    - CLI 助手：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
    - `models.providers.*.contextWindow` / `contextTokens` / `maxTokens` 设置提供商级别的默认值；`models.providers.*.models[].contextWindow` / `contextTokens` / `maxTokens` 按模型覆盖它们。
    - 回退规则、冷却探测和会话覆盖持久化：[模型故障转移](/concepts/model-failover)。
  </Accordion>
  <Accordion title="添加提供商认证不会更改你的主模型">
    `openclaw configure` 在添加或重新认证提供商时保留现有的 `agents.defaults.model.primary`。提供商插件可能仍然在其认证配置补丁中返回推荐的默认模型，但当主模型已存在时，configure 将其视为"使该模型可用"，而不是"替换当前的主模型"。

    要有意切换默认模型，使用 `openclaw models set <provider/model>` 或 `openclaw models auth login --provider <id> --set-default`。

  </Accordion>
  <Accordion title="OpenAI 提供商/运行时分离">
    OpenAI 系列路由是特定前缀的：

    - `openai/<model>` 加上 `agents.defaults.agentRuntime.id: "codex"` 使用原生 Codex 应用服务器工具。这是通常的 ChatGPT/Codex 订阅设置。
    - `openai-codex/<model>` 在 PI 中使用 Codex OAuth。
    - `openai/<model>` 在没有 Codex 运行时覆盖的情况下在 PI 中使用直接 OpenAI API 密钥提供商。

    参见 [OpenAI](/providers/openai) 和 [Codex 工具](/plugins/codex-harness)。如果提供商/运行时分离令人困惑，先阅读[智能体运行时](/concepts/agent-runtimes)。

    插件自动启用遵循相同边界：`openai-codex/<model>` 属于 OpenAI 插件，而 Codex 插件由 `agentRuntime.id: "codex"` 或遗留 `codex/<model>` 引用启用。

    通过原生 Codex 应用服务器工具（设置 `agentRuntime.id: "codex"`），通过 PI 中的 Codex OAuth 使用 `openai-codex/gpt-5.5`，以及当你的账户公开时通过直接 API 密钥流量使用 PI 中的 `openai/gpt-5.5`，GPT-5.5 均可使用。

  </Accordion>
  <Accordion title="CLI 运行时">
    CLI 运行时使用相同的分离：选择规范模型引用，如 `anthropic/claude-*`、`google/gemini-*` 或 `openai/gpt-*`，然后在需要本地 CLI 后端时将 `agents.defaults.agentRuntime.id` 设置为 `claude-cli`、`google-gemini-cli` 或 `codex-cli`。

    遗留 `claude-cli/*`、`google-gemini-cli/*` 和 `codex-cli/*` 引用迁移回规范提供商引用，运行时单独记录。

  </Accordion>
</AccordionGroup>

## 插件拥有的提供商行为

大多数特定于提供商的逻辑存在于提供商插件（`registerProvider(...)`）中，而 OpenClaw 保持通用推理循环。插件拥有引导、模型目录、认证环境变量映射、传输/配置规范化、工具架构清理、故障转移分类、OAuth 刷新、使用报告、思考/推理配置文件等。

提供商 SDK 钩子和捆绑插件示例的完整列表存在于[提供商插件](/plugins/sdk-provider-plugins)中。需要完全自定义请求执行器的提供商是单独的、更深层的扩展界面。

<Note>
提供商拥有的运行器行为存在于显式的提供商钩子上，例如重放策略、工具架构规范化、流式传输包装和传输/请求助手。遗留的 `ProviderPlugin.capabilities` 静态包仅用于兼容性，不再被共享运行器逻辑读取。
</Note>

## API 密钥轮换

<AccordionGroup>
  <Accordion title="密钥来源和优先级">
    通过以下方式配置多个密钥：

    - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个实时覆盖，最高优先级）
    - `<PROVIDER>_API_KEYS`（逗号或分号列表）
    - `<PROVIDER>_API_KEY`（主密钥）
    - `<PROVIDER>_API_KEY_*`（编号列表，例如 `<PROVIDER>_API_KEY_1`）

    对于 Google 提供商，`GOOGLE_API_KEY` 也作为回退包含。密钥选择顺序保持优先级并去重值。

  </Accordion>
  <Accordion title="轮换何时启动">
    - 请求仅在速率限制响应时使用下一个密钥重试（例如 `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 或周期性使用限制消息）。
    - 非速率限制失败立即失败；不尝试密钥轮换。
    - 当所有候选密钥失败时，从最后一次尝试返回最终错误。
  </Accordion>
</AccordionGroup>

## 内置提供商（pi-ai 目录）

OpenClaw 附带 pi-ai 目录。这些提供商**不需要** `models.providers` 配置；只需设置认证并选择模型。

### OpenAI

- 提供商：`openai`
- 认证：`OPENAI_API_KEY`
- 可选轮换：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，加上 `OPENCLAW_LIVE_OPENAI_KEY`（单个覆盖）
- 示例模型：`openai/gpt-5.5`、`openai/gpt-5.4-mini`
- 如果特定安装或 API 密钥行为不同，用 `openclaw models list --provider openai` 验证账户/模型可用性
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 默认传输是 `auto`（WebSocket 优先，SSE 回退）
- 通过 `agents.defaults.models["openai/<model>"].params.transport` 按模型覆盖（`"sse"`、`"websocket"` 或 `"auto"`）
- OpenAI Responses WebSocket 预热默认通过 `params.openaiWsWarmup` 启用（`true`/`false`）
- 可通过 `agents.defaults.models["openai/<model>"].params.serviceTier` 启用 OpenAI 优先处理
- `/fast` 和 `params.fastMode` 将直接的 `openai/*` Responses 请求映射到 `api.openai.com` 上的 `service_tier=priority`
- 当你想要显式层而不是共享 `/fast` 切换时，使用 `params.serviceTier`
- 隐藏的 OpenClaw 归因标头（`originator`、`version`、`User-Agent`）仅适用于到 `api.openai.com` 的原生 OpenAI 流量，不适用于通用 OpenAI 兼容代理
- 原生 OpenAI 路由还保留 Responses `store`、提示缓存提示和 OpenAI 推理兼容有效载荷整形；代理路由不保留
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被有意抑制，因为实时 OpenAI API 请求拒绝它，而当前 Codex 目录不公开它

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
}
```

### Anthropic

- 提供商：`anthropic`
- 认证：`ANTHROPIC_API_KEY`
- 可选轮换：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，加上 `OPENCLAW_LIVE_ANTHROPIC_KEY`（单个覆盖）
- 示例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice apiKey`
- 发送到 `api.anthropic.com` 的直接公开 Anthropic 请求（包括 API 密钥和 OAuth 认证流量）支持共享 `/fast` 切换和 `params.fastMode`；OpenClaw 将其映射到 Anthropic `service_tier`（`auto` vs `standard_only`）
- 首选的 Claude CLI 配置保持模型引用规范并单独选择 CLI 后端：`anthropic/claude-opus-4-7` 配合 `agents.defaults.agentRuntime.id: "claude-cli"`。遗留的 `claude-cli/claude-opus-4-7` 引用仍然支持兼容。

<Note>
Anthropic 员工告诉我们 OpenClaw 风格的 Claude CLI 使用再次被允许，因此 OpenClaw 将 Claude CLI 重用和 `claude -p` 使用视为此集成的获批使用，除非 Anthropic 发布新政策。Anthropic 设置令牌仍然作为受支持的 OpenClaw 令牌路径可用，但 OpenClaw 现在在可用时优先使用 Claude CLI 重用和 `claude -p`。
</Note>

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Codex OAuth

- 提供商：`openai-codex`
- 认证：OAuth（ChatGPT）
- PI 模型引用：`openai-codex/gpt-5.5`
- 原生 Codex 应用服务器工具引用：`openai/gpt-5.5` 配合 `agents.defaults.agentRuntime.id: "codex"`
- 原生 Codex 应用服务器工具文档：[Codex 工具](/plugins/codex-harness)
- 遗留模型引用：`codex/gpt-*`
- 插件边界：`openai-codex/*` 加载 OpenAI 插件；原生 Codex 应用服务器插件仅由 Codex 工具运行时或遗留 `codex/*` 引用选择。
- CLI：`openclaw onboard --auth-choice openai-codex` 或 `openclaw models auth login --provider openai-codex`
- 默认传输是 `auto`（WebSocket 优先，SSE 回退）
- 通过 `agents.defaults.models["openai-codex/<model>"].params.transport` 按 PI 模型覆盖（`"sse"`、`"websocket"` 或 `"auto"`）
- `params.serviceTier` 也在原生 Codex Responses 请求（`chatgpt.com/backend-api`）上转发
- 隐藏的 OpenClaw 归因标头（`originator`、`version`、`User-Agent`）仅附加在到 `chatgpt.com/backend-api` 的原生 Codex 流量上，不适用于通用 OpenAI 兼容代理
- 与直接 `openai/*` 共享相同的 `/fast` 切换和 `params.fastMode` 配置；OpenClaw 将其映射到 `service_tier=priority`
- `openai-codex/gpt-5.5` 使用 Codex 目录原生 `contextWindow = 400000` 和默认运行时 `contextTokens = 272000`；用 `models.providers.openai-codex.models[].contextTokens` 覆盖运行时上限
- 政策说明：OpenAI Codex OAuth 明确支持用于 OpenClaw 等外部工具/工作流。
- 对于常见的订阅加原生 Codex 运行时路由，使用 `openai-codex` 认证登录，但配置 `openai/gpt-5.5` 加上 `agents.defaults.agentRuntime.id: "codex"`。
- 仅当你想要通过 PI 的 Codex OAuth/订阅路由时使用 `openai-codex/gpt-5.5`；当你的 API 密钥设置和本地目录公开公共 API 路由时，不带 Codex 运行时覆盖地使用 `openai/gpt-5.5`。

```json5
{
  plugins: { entries: { codex: { enabled: true } } },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.5" },
      agentRuntime: { id: "codex" },
    },
  },
}
```

```json5
{
  models: {
    providers: {
      "openai-codex": {
        models: [{ id: "gpt-5.5", contextTokens: 160000 }],
      },
    },
  },
}
```

### 其他订阅式托管选项

<CardGroup cols={3}>
  <Card title="GLM 模型" href="/providers/glm">
    Z.AI 编码计划或通用 API 端点。
  </Card>
  <Card title="MiniMax" href="/providers/minimax">
    MiniMax 编码计划 OAuth 或 API 密钥访问。
  </Card>
  <Card title="Qwen Cloud" href="/providers/qwen">
    Qwen Cloud 提供商界面加上阿里云 DashScope 和编码计划端点映射。
  </Card>
</CardGroup>

### OpenCode

- 认证：`OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）
- Zen 运行时提供商：`opencode`
- Go 运行时提供商：`opencode-go`
- 示例模型：`opencode/claude-opus-4-6`、`opencode-go/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini（API 密钥）

- 提供商：`google`
- 认证：`GEMINI_API_KEY`
- 可选轮换：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 回退，和 `OPENCLAW_LIVE_GEMINI_KEY`（单个覆盖）
- 示例模型：`google/gemini-3.1-pro-preview`、`google/gemini-3-flash-preview`
- 兼容性：使用 `google/gemini-3.1-flash-preview` 的遗留 OpenClaw 配置规范化为 `google/gemini-3-flash-preview`
- 别名：`google/gemini-3.1-pro` 被接受并规范化为 Google 实时 Gemini API id，`google/gemini-3.1-pro-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`
- 思考：`/think adaptive` 使用 Google 动态思考。Gemini 3/3.1 省略固定的 `thinkingLevel`；Gemini 2.5 发送 `thinkingBudget: -1`。
- 直接 Gemini 运行还接受 `agents.defaults.models["google/<model>"].params.cachedContent`（或遗留 `cached_content`）来转发提供商原生的 `cachedContents/...` 句柄；Gemini 缓存命中显示为 OpenClaw `cacheRead`

### Google Vertex 和 Gemini CLI

- 提供商：`google-vertex`、`google-gemini-cli`
- 认证：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程

<Warning>
OpenClaw 中的 Gemini CLI OAuth 是非官方集成。一些用户报告使用第三方客户端后 Google 账户受到限制。如果你选择继续，请查看 Google 条款并使用非关键账户。
</Warning>

Gemini CLI OAuth 作为捆绑 `google` 插件的一部分提供。

<Steps>
  <Step title="安装 Gemini CLI">
    <Tabs>
      <Tab title="brew">
        ```bash
        brew install gemini-cli
        ```
      </Tab>
      <Tab title="npm">
        ```bash
        npm install -g @google/gemini-cli
        ```
      </Tab>
    </Tabs>
  </Step>
  <Step title="启用插件">
    ```bash
    openclaw plugins enable google
    ```
  </Step>
  <Step title="登录">
    ```bash
    openclaw models auth login --provider google-gemini-cli --set-default
    ```

    默认模型：`google-gemini-cli/gemini-3-flash-preview`。你**不**需要将客户端 id 或密钥粘贴到 `openclaw.json` 中。CLI 登录流程将令牌存储在网关主机上的认证配置文件中。

  </Step>
  <Step title="设置项目（如果需要）">
    如果登录后请求失败，在网关主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`。
  </Step>
</Steps>

Gemini CLI JSON 回复从 `response` 解析；使用量回退到 `stats`，`stats.cached` 规范化为 OpenClaw `cacheRead`。

### Z.AI（GLM）

- 提供商：`zai`
- 认证：`ZAI_API_KEY`
- 示例模型：`zai/glm-5.1`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 别名：`z.ai/*` 和 `z-ai/*` 规范化为 `zai/*`
  - `zai-api-key` 自动检测匹配的 Z.AI 端点；`zai-coding-global`、`zai-coding-cn`、`zai-global` 和 `zai-cn` 强制特定界面

### Vercel AI Gateway

- 提供商：`vercel-ai-gateway`
- 认证：`AI_GATEWAY_API_KEY`
- 示例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`、`vercel-ai-gateway/moonshotai/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- 提供商：`kilocode`
- 认证：`KILOCODE_API_KEY`
- 示例模型：`kilocode/kilo/auto`
- CLI：`openclaw onboard --auth-choice kilocode-api-key`
- 基础 URL：`https://api.kilo.ai/api/gateway/`
- 静态回退目录提供 `kilocode/kilo/auto`；实时 `https://api.kilo.ai/api/gateway/models` 发现可以进一步扩展运行时目录。
- `kilocode/kilo/auto` 背后的精确上游路由由 Kilo Gateway 拥有，在 OpenClaw 中未硬编码。

有关设置详情，参见 [/providers/kilocode](/providers/kilocode)。

### 其他捆绑提供商插件

| 提供商                  | ID                               | 认证环境变量                                                 | 示例模型                                      |
| ----------------------- | -------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| BytePlus                | `byteplus` / `byteplus-plan`     | `BYTEPLUS_API_KEY`                                           | `byteplus-plan/ark-code-latest`               |
| Cerebras                | `cerebras`                       | `CEREBRAS_API_KEY`                                           | `cerebras/zai-glm-4.7`                        |
| Cloudflare AI Gateway   | `cloudflare-ai-gateway`          | `CLOUDFLARE_AI_GATEWAY_API_KEY`                              | —                                             |
| DeepInfra               | `deepinfra`                      | `DEEPINFRA_API_KEY`                                          | `deepinfra/deepseek-ai/DeepSeek-V3.2`         |
| DeepSeek                | `deepseek`                       | `DEEPSEEK_API_KEY`                                           | `deepseek/deepseek-v4-flash`                  |
| GitHub Copilot          | `github-copilot`                 | `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`         | —                                             |
| Groq                    | `groq`                           | `GROQ_API_KEY`                                               | —                                             |
| Hugging Face Inference  | `huggingface`                    | `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`                        | `huggingface/deepseek-ai/DeepSeek-R1`         |
| Kilo Gateway            | `kilocode`                       | `KILOCODE_API_KEY`                                           | `kilocode/kilo/auto`                          |
| Kimi Coding             | `kimi`                           | `KIMI_API_KEY` 或 `KIMICODE_API_KEY`                         | `kimi/kimi-code`                              |
| MiniMax                 | `minimax` / `minimax-portal`     | `MINIMAX_API_KEY` / `MINIMAX_OAUTH_TOKEN`                    | `minimax/MiniMax-M2.7`                        |
| Mistral                 | `mistral`                        | `MISTRAL_API_KEY`                                            | `mistral/mistral-large-latest`                |
| Moonshot                | `moonshot`                       | `MOONSHOT_API_KEY`                                           | `moonshot/kimi-k2.6`                          |
| NVIDIA                  | `nvidia`                         | `NVIDIA_API_KEY`                                             | `nvidia/nvidia/nemotron-3-super-120b-a12b`    |
| OpenRouter              | `openrouter`                     | `OPENROUTER_API_KEY`                                         | `openrouter/auto`                             |
| Qianfan                 | `qianfan`                        | `QIANFAN_API_KEY`                                            | `qianfan/deepseek-v3.2`                       |
| Qwen Cloud              | `qwen`                           | `QWEN_API_KEY` / `MODELSTUDIO_API_KEY` / `DASHSCOPE_API_KEY` | `qwen/qwen3.5-plus`                           |
| StepFun                 | `stepfun` / `stepfun-plan`       | `STEPFUN_API_KEY`                                            | `stepfun/step-3.5-flash`                      |
| Together                | `together`                       | `TOGETHER_API_KEY`                                           | `together/moonshotai/Kimi-K2.5`               |
| Venice                  | `venice`                         | `VENICE_API_KEY`                                             | —                                             |
| Vercel AI Gateway       | `vercel-ai-gateway`              | `AI_GATEWAY_API_KEY`                                         | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| Volcano Engine (Doubao) | `volcengine` / `volcengine-plan` | `VOLCANO_ENGINE_API_KEY`                                     | `volcengine-plan/ark-code-latest`             |
| xAI                     | `xai`                            | `XAI_API_KEY`                                                | `xai/grok-4.3`                                |
| Xiaomi                  | `xiaomi`                         | `XIAOMI_API_KEY`                                             | `xiaomi/mimo-v2-flash`                        |

#### 值得了解的特殊情况

<AccordionGroup>
  <Accordion title="OpenRouter">
    仅在经过验证的 `openrouter.ai` 路由上应用其应用归因标头和 Anthropic `cache_control` 标记。DeepSeek、Moonshot 和 ZAI 引用符合 OpenRouter 管理的提示缓存的缓存 TTL，但不接收 Anthropic 缓存标记。作为代理式 OpenAI 兼容路径，它跳过原生 OpenAI 专用整形（`serviceTier`、Responses `store`、提示缓存提示、OpenAI 推理兼容）。Gemini 支持的引用仅保留代理 Gemini 思维签名净化。
  </Accordion>
  <Accordion title="Kilo Gateway">
    Gemini 支持的引用遵循相同的代理 Gemini 净化路径；`kilocode/kilo/auto` 和其他代理推理不支持的引用跳过代理推理注入。
  </Accordion>
  <Accordion title="MiniMax">
    API 密钥引导写入明确的纯文本 M2.7 聊天模型定义；图像理解保留在插件拥有的 `MiniMax-VL-01` 媒体提供商上。
  </Accordion>
  <Accordion title="NVIDIA">
    模型 ID 使用 `nvidia/<vendor>/<model>` 命名空间（例如 `nvidia/nvidia/nemotron-...` 与 `nvidia/moonshotai/kimi-k2.5`）；选择器保留字面量 `<provider>/<model-id>` 组合，而发送到 API 的规范键保持单前缀。
  </Accordion>
  <Accordion title="xAI">
    使用 xAI Responses 路径。`grok-4.3` 是捆绑的默认聊天模型。`/fast on` 或 `params.fastMode: true` 将 `grok-3`、`grok-3-mini`、`grok-4` 和 `grok-4-0709` 重写为它们的 `*-fast` 变体。`tool_stream` 默认开启；通过 `agents.defaults.models["xai/<model>"].params.tool_stream=false` 禁用。
  </Accordion>
  <Accordion title="Cerebras">
    作为捆绑的 `cerebras` 提供商插件提供。GLM 使用 `zai-glm-4.7`；OpenAI 兼容基础 URL 是 `https://api.cerebras.ai/v1`。
  </Accordion>
</AccordionGroup>

## 通过 `models.providers` 的提供商（自定义/基础 URL）

使用 `models.providers`（或 `models.json`）添加**自定义**提供商或 OpenAI/Anthropic 兼容代理。

下面许多捆绑的提供商插件已经发布了默认目录。仅在需要覆盖默认基础 URL、标头或模型列表时，使用显式 `models.providers.<id>` 条目。

网关模型能力检查也读取显式的 `models.providers.<id>.models[]` 元数据。如果自定义或代理模型接受图像，在该模型上设置 `input: ["text", "image"]`，以便 WebChat 和节点来源附件路径将图像作为原生模型输入传递，而不是纯文本媒体引用。

### Moonshot AI（Kimi）

Moonshot 作为捆绑的提供商插件提供。默认使用内置提供商，仅在需要覆盖基础 URL 或模型元数据时添加显式 `models.providers.moonshot` 条目：

- 提供商：`moonshot`
- 认证：`MOONSHOT_API_KEY`
- 示例模型：`moonshot/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice moonshot-api-key` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`

Kimi K2 模型 ID：

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.6`
- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
- `moonshot/kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-model-refs:end"

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.6" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.6", name: "Kimi K2.6" }],
      },
    },
  },
}
```

### Kimi 编程

Kimi 编程使用 Moonshot AI 的 Anthropic 兼容端点：

- 提供商：`kimi`
- 认证：`KIMI_API_KEY`
- 示例模型：`kimi/kimi-code`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-code" } },
  },
}
```

遗留的 `kimi/k2p5` 作为兼容模型 ID 仍然被接受。

### Volcano Engine（Doubao）

Volcano Engine（火山引擎）为中国用户提供 Doubao 和其他模型的访问。

- 提供商：`volcengine`（编程：`volcengine-plan`）
- 认证：`VOLCANO_ENGINE_API_KEY`
- 示例模型：`volcengine-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine-plan/ark-code-latest" } },
  },
}
```

引导默认为编程界面，但通用 `volcengine/*` 目录同时注册。

在引导/配置模型选择器中，Volcengine 认证选择偏好 `volcengine/*` 和 `volcengine-plan/*` 行。如果这些模型尚未加载，OpenClaw 回退到未过滤的目录，而不是显示空的提供商范围选择器。

<Tabs>
  <Tab title="标准模型">
    - `volcengine/doubao-seed-1-8-251228`（Doubao Seed 1.8）
    - `volcengine/doubao-seed-code-preview-251028`
    - `volcengine/kimi-k2-5-260127`（Kimi K2.5）
    - `volcengine/glm-4-7-251222`（GLM 4.7）
    - `volcengine/deepseek-v3-2-251201`（DeepSeek V3.2 128K）
  </Tab>
  <Tab title="编程模型（volcengine-plan）">
    - `volcengine-plan/ark-code-latest`
    - `volcengine-plan/doubao-seed-code`
    - `volcengine-plan/kimi-k2.5`
    - `volcengine-plan/kimi-k2-thinking`
    - `volcengine-plan/glm-4.7`
  </Tab>
</Tabs>

### BytePlus（国际版）

BytePlus ARK 为国际用户提供与 Volcano Engine 相同的模型访问。

- 提供商：`byteplus`（编程：`byteplus-plan`）
- 认证：`BYTEPLUS_API_KEY`
- 示例模型：`byteplus-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

引导默认为编程界面，但通用 `byteplus/*` 目录同时注册。

<Tabs>
  <Tab title="标准模型">
    - `byteplus/seed-1-8-251228`（Seed 1.8）
    - `byteplus/kimi-k2-5-260127`（Kimi K2.5）
    - `byteplus/glm-4-7-251222`（GLM 4.7）
  </Tab>
  <Tab title="编程模型（byteplus-plan）">
    - `byteplus-plan/ark-code-latest`
    - `byteplus-plan/doubao-seed-code`
    - `byteplus-plan/kimi-k2.5`
    - `byteplus-plan/kimi-k2-thinking`
    - `byteplus-plan/glm-4.7`
  </Tab>
</Tabs>

### Synthetic

Synthetic 在 `synthetic` 提供商后面提供 Anthropic 兼容的模型：

- 提供商：`synthetic`
- 认证：`SYNTHETIC_API_KEY`
- 示例模型：`synthetic/hf:MiniMaxAI/MiniMax-M2.5`
- CLI：`openclaw onboard --auth-choice synthetic-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" } },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [{ id: "hf:MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5" }],
      },
    },
  },
}
```

### MiniMax

MiniMax 通过 `models.providers` 配置，因为它使用自定义端点：

- MiniMax OAuth（全球）：`--auth-choice minimax-global-oauth`
- MiniMax OAuth（中国）：`--auth-choice minimax-cn-oauth`
- MiniMax API 密钥（全球）：`--auth-choice minimax-global-api`
- MiniMax API 密钥（中国）：`--auth-choice minimax-cn-api`
- 认证：`minimax` 的 `MINIMAX_API_KEY`；`minimax-portal` 的 `MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY`

有关设置详情、模型选项和配置片段，参见 [/providers/minimax](/providers/minimax)。

<Note>
在 MiniMax 的 Anthropic 兼容流式传输路径上，OpenClaw 默认禁用思考，除非你显式设置它，并且 `/fast on` 将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
</Note>

插件拥有的能力分离：

- 文本/聊天默认保留在 `minimax/MiniMax-M2.7`
- 图像生成是 `minimax/image-01` 或 `minimax-portal/image-01`
- 图像理解是两个 MiniMax 认证路径上的插件拥有的 `MiniMax-VL-01`
- Web 搜索保留在提供商 ID `minimax` 上

### LM Studio

LM Studio 作为使用原生 API 的捆绑提供商插件提供：

- 提供商：`lmstudio`
- 认证：`LM_API_TOKEN`
- 默认推理基础 URL：`http://localhost:1234/v1`

然后设置模型（替换为 `http://localhost:1234/api/v1/models` 返回的 ID 之一）：

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw 使用 LM Studio 的原生 `/api/v1/models` 和 `/api/v1/models/load` 进行发现和自动加载，默认使用 `/v1/chat/completions` 进行推理。如果你想让 LM Studio JIT 加载、TTL 和自动驱逐拥有模型生命周期，设置 `models.providers.lmstudio.params.preload: false`。有关设置和故障排除，参见 [/providers/lmstudio](/providers/lmstudio)。

### Ollama

Ollama 作为使用 Ollama 原生 API 的捆绑提供商插件提供：

- 提供商：`ollama`
- 认证：不需要（本地服务器）
- 示例模型：`ollama/llama3.3`
- 安装：[https://ollama.com/download](https://ollama.com/download)

```bash
# 安装 Ollama，然后拉取模型：
ollama pull llama3.3
```

```json5
{
  agents: {
    defaults: { model: { primary: "ollama/llama3.3" } },
  },
}
```

当你使用 `OLLAMA_API_KEY` 选择加入时，Ollama 在 `http://127.0.0.1:11434` 本地检测，捆绑的提供商插件将 Ollama 直接添加到 `openclaw onboard` 和模型选择器。有关引导、云/本地模式和自定义配置，参见 [/providers/ollama](/providers/ollama)。

### vLLM

vLLM 作为用于本地/自托管 OpenAI 兼容服务器的捆绑提供商插件提供：

- 提供商：`vllm`
- 认证：可选（取决于你的服务器）
- 默认基础 URL：`http://127.0.0.1:8000/v1`

要在本地选择加入自动发现（如果你的服务器不强制认证，任何值都可以）：

```bash
export VLLM_API_KEY="vllm-local"
```

然后设置模型（替换为 `/v1/models` 返回的 ID 之一）：

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

有关详情，参见 [/providers/vllm](/providers/vllm)。

### SGLang

SGLang 作为用于快速自托管 OpenAI 兼容服务器的捆绑提供商插件提供：

- 提供商：`sglang`
- 认证：可选（取决于你的服务器）
- 默认基础 URL：`http://127.0.0.1:30000/v1`

要在本地选择加入自动发现（如果服务器不强制认证，任何值都可以）：

```bash
export SGLANG_API_KEY="sglang-local"
```

然后设置模型（替换为 `/v1/models` 返回的 ID 之一）：

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

有关详情，参见 [/providers/sglang](/providers/sglang)。

### 本地代理（LM Studio、vLLM、LiteLLM 等）

示例（OpenAI 兼容）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: { "lmstudio/my-local-model": { alias: "Local" } },
    },
  },
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "${LM_API_TOKEN}",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="默认可选字段">
    对于自定义提供商，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 是可选的。省略时，OpenClaw 默认为：

    - `reasoning: false`
    - `input: ["text"]`
    - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
    - `contextWindow: 200000`
    - `maxTokens: 8192`

    建议：设置与你的代理/模型限制匹配的显式值。

  </Accordion>
  <Accordion title="代理路由整形规则">
    - 对于非原生端点上的 `api: "openai-completions"`（任何主机不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 强制 `compat.supportsDeveloperRole: false` 以避免不支持的 `developer` 角色的提供商 400 错误。
    - 代理式 OpenAI 兼容路由也跳过原生 OpenAI 专用请求整形：无 `service_tier`、无 Responses `store`、无 Completions `store`、无提示缓存提示、无 OpenAI 推理兼容有效载荷整形，以及无隐藏的 OpenClaw 归因标头。
    - 对于需要特定供应商字段的 OpenAI 兼容 Completions 代理，设置 `agents.defaults.models["provider/model"].params.extra_body`（或 `extraBody`）以将额外的 JSON 合并到出站请求体中。
    - 对于 vLLM 聊天模板控件，设置 `agents.defaults.models["provider/model"].params.chat_template_kwargs`。当会话思考级别关闭时，捆绑的 vLLM 插件自动为 `vllm/nemotron-3-*` 发送 `enable_thinking: false` 和 `force_nonempty_content: true`。
    - 对于慢速本地模型或远程 LAN/tailnet 主机，设置 `models.providers.<id>.timeoutSeconds`。这扩展了提供商模型 HTTP 请求处理，包括连接、标头、正文流式传输和总受保护获取中止，而不增加整个智能体运行时超时。
    - 模型提供商 HTTP 调用仅对已配置的提供商 `baseUrl` 主机名允许 `198.18.0.0/15` 和 `fc00::/7` 中的 Surge、Clash 和 sing-box 假 IP DNS 答案。其他私有、回环、链路本地和元数据目标仍然需要显式的 `models.providers.<id>.request.allowPrivateNetwork: true` 选择加入。
    - 如果 `baseUrl` 为空/省略，OpenClaw 保持默认的 OpenAI 行为（解析为 `api.openai.com`）。
    - 为了安全，在非原生 `openai-completions` 端点上，显式的 `compat.supportsDeveloperRole: true` 仍然被覆盖。
    - 对于非直接端点上的 `api: "anthropic-messages"`（除规范 `anthropic` 之外的任何提供商，或主机不是公共 `api.anthropic.com` 端点的自定义 `models.providers.anthropic.baseUrl`），OpenClaw 抑制隐式的 Anthropic beta 标头，如 `claude-code-20250219`、`interleaved-thinking-2025-05-14` 和 OAuth 标记，以便自定义 Anthropic 兼容代理不会拒绝不支持的 beta 标志。如果你的代理需要特定的 beta 功能，显式设置 `models.providers.<id>.headers["anthropic-beta"]`。
  </Accordion>
</AccordionGroup>

## CLI 示例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另请参见：[配置](/gateway/configuration)以获取完整的配置示例。

## 相关

- [配置参考](/gateway/config-agents#agent-defaults) — 模型配置键
- [模型故障转移](/concepts/model-failover) — 回退链和重试行为
- [模型](/concepts/models) — 模型配置和别名
- [提供商](/providers) — 每个提供商的设置指南
