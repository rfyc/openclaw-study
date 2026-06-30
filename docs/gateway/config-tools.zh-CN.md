---
summary: "工具配置（策略、实验性切换、提供商支持的工具）和自定义提供商/基础 URL 设置"
read_when:
  - 配置 `tools.*` 策略、允许列表或实验性功能
  - 注册自定义提供商或覆盖基础 URL
  - 设置 OpenAI 兼容的自托管端点
title: "配置 — 工具和自定义提供商"
sidebarTitle: "工具和自定义提供商"
---

`tools.*` 配置键和自定义提供商 / 基础 URL 设置。有关代理、渠道和其他顶级配置键，请参阅[配置参考](/gateway/configuration-reference)。

## 工具

### 工具配置文件

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置基础允许列表：

<Note>
本地入门默认在未设置时将新的本地配置设置为 `tools.profile: "coding"`（保留现有的显式配置文件）。
</Note>

| 配置文件    | 包含                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | 仅 `session_status`                                                                                                             |
| `coding`    | `group:fs`、`group:runtime`、`group:web`、`group:sessions`、`group:memory`、`cron`、`image`、`image_generate`、`video_generate` |
| `messaging` | `group:messaging`、`sessions_list`、`sessions_history`、`sessions_send`、`session_status`                                       |
| `full`      | 无限制（与未设置相同）                                                                                                          |

### 工具组

| 组                 | 工具                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`、`process`、`code_execution`（`bash` 作为 `exec` 的别名被接受）                                                  |
| `group:fs`         | `read`、`write`、`edit`、`apply_patch`                                                                                  |
| `group:sessions`   | `sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`sessions_yield`、`subagents`、`session_status` |
| `group:memory`     | `memory_search`、`memory_get`                                                                                           |
| `group:web`        | `web_search`、`x_search`、`web_fetch`                                                                                   |
| `group:ui`         | `browser`、`canvas`                                                                                                     |
| `group:automation` | `cron`、`gateway`                                                                                                       |
| `group:messaging`  | `message`                                                                                                               |
| `group:nodes`      | `nodes`                                                                                                                 |
| `group:agents`     | `agents_list`                                                                                                           |
| `group:media`      | `image`、`image_generate`、`video_generate`、`tts`                                                                      |
| `group:openclaw`   | 所有内置工具（不包括提供商插件）                                                                                        |

### `tools.allow` / `tools.deny`

全局工具允许/拒绝策略（拒绝获胜）。不区分大小写，支持 `*` 通配符。即使 Docker 沙盒关闭也会应用。

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

`write` 和 `apply_patch` 是单独的工具 id。`allow: ["write"]` 也为兼容模型启用 `apply_patch`，但 `deny: ["write"]` 不会拒绝 `apply_patch`。要阻止所有文件变更，拒绝 `group:fs` 或显式列出每个变更工具：

```json5
{
  tools: { deny: ["write", "edit", "apply_patch"] },
}
```

### `tools.byProvider`

进一步限制特定提供商或模型的工具。顺序：基础配置文件 → 提供商配置文件 → 允许/拒绝。

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
      "openai/gpt-5.4": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

### `tools.elevated`

控制沙盒外的提升 exec 访问：

```json5
{
  tools: {
    elevated: {
      enabled: true,
      allowFrom: {
        whatsapp: ["+15555550123"],
        discord: ["1234567890123", "987654321098765432"],
      },
    },
  },
}
```

- 每代理覆盖（`agents.list[].tools.elevated`）只能进一步限制。
- `/elevated on|off|ask|full` 每会话存储状态；内联指令适用于单个消息。
- 提升的 `exec` 绕过沙盒并使用配置的逃逸路径（默认 `gateway`，或当 exec 目标为 `node` 时为 `node`）。

### `tools.exec`

```json5
{
  tools: {
    exec: {
      backgroundMs: 10000,
      timeoutSec: 1800,
      cleanupMs: 1800000,
      notifyOnExit: true,
      notifyOnExitEmptySuccess: false,
      applyPatch: {
        enabled: false,
        allowModels: ["gpt-5.5"],
      },
    },
  },
}
```

### `tools.loopDetection`

工具循环安全检查**默认禁用**。设置 `enabled: true` 激活检测。设置可以在 `tools.loopDetection` 中全局定义，并在 `agents.list[].tools.loopDetection` 中每代理覆盖。

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

<ParamField path="historySize" type="number">
  为循环分析保留的最大工具调用历史。
</ParamField>
<ParamField path="warningThreshold" type="number">
  警告的重复无进展模式阈值。
</ParamField>
<ParamField path="criticalThreshold" type="number">
  阻止关键循环的更高重复阈值。
</ParamField>
<ParamField path="globalCircuitBreakerThreshold" type="number">
  任何无进展运行的硬停止阈值。
</ParamField>
<ParamField path="detectors.genericRepeat" type="boolean">
  对重复的相同工具/相同参数调用发出警告。
</ParamField>
<ParamField path="detectors.knownPollNoProgress" type="boolean">
  对已知轮询工具（`process.poll`、`command_status` 等）发出警告/阻止。
</ParamField>
<ParamField path="detectors.pingPong" type="boolean">
  对交替的无进展对模式发出警告/阻止。
</ParamField>

<Warning>
如果 `warningThreshold >= criticalThreshold` 或 `criticalThreshold >= globalCircuitBreakerThreshold`，验证失败。
</Warning>

### `tools.web`

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "brave_api_key", // 或 BRAVE_API_KEY 环境变量
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
      fetch: {
        enabled: true,
        provider: "firecrawl", // 可选；省略为自动检测
        maxChars: 50000,
        maxCharsCap: 50000,
        maxResponseBytes: 2000000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        readability: true,
        userAgent: "custom-ua",
      },
    },
  },
}
```

### `tools.media`

配置入站媒体理解（图像/音频/视频）：

```json5
{
  tools: {
    media: {
      concurrency: 2,
      asyncCompletion: {
        directSend: false, // 选择加入：设置为 true 可直接将完成的异步视频发送到渠道
      },
      audio: {
        enabled: true,
        maxBytes: 20971520,
        scope: {
          default: "deny",
          rules: [{ action: "allow", match: { chatType: "direct" } }],
        },
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          { type: "cli", command: "whisper", args: ["--model", "base", "{{MediaPath}}"] },
        ],
      },
      image: {
        enabled: true,
        timeoutSeconds: 180,
        models: [{ provider: "ollama", model: "gemma4:26b", timeoutSeconds: 300 }],
      },
      video: {
        enabled: true,
        maxBytes: 52428800,
        models: [{ provider: "google", model: "gemini-3-flash-preview" }],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="媒体模型条目字段">
    **提供商条目**（`type: "provider"` 或省略）：

    - `provider`：API 提供商 id（`openai`、`anthropic`、`google`/`gemini`、`groq` 等）
    - `model`：模型 id 覆盖
    - `profile` / `preferredProfile`：`auth-profiles.json` 配置文件选择

    **CLI 条目**（`type: "cli"`）：

    - `command`：要运行的可执行文件
    - `args`：模板化参数（支持 `{{MediaPath}}`、`{{Prompt}}`、`{{MaxChars}}` 等；`openclaw doctor --fix` 将已弃用的 `{input}` 占位符迁移到 `{{MediaPath}}`）

    **公共字段：**

    - `capabilities`：可选列表（`image`、`audio`、`video`）。默认值：`openai`/`anthropic`/`minimax` → image，`google` → image+audio+video，`groq` → audio。
    - `prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`：每条目覆盖。
    - `tools.media.image.timeoutSeconds` 和匹配的图像模型 `timeoutSeconds` 条目也在代理调用显式 `image` 工具时应用。
    - 失败回退到下一个条目。

    提供商认证遵循标准顺序：`auth-profiles.json` → 环境变量 → `models.providers.*.apiKey`。

    **异步完成字段：**

    - `asyncCompletion.directSend`：当为 `true` 时，支持直接完成交付的完成异步媒体任务首先尝试直接渠道交付。默认：`false`（请求者会话唤醒/模型交付路径）。目前这适用于异步 `video_generate`；异步 `music_generate` 完成即使启用此设置也保持请求者会话中介。

  </Accordion>
</AccordionGroup>

### `tools.agentToAgent`

```json5
{
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["home", "work"],
    },
  },
}
```

### `tools.sessions`

控制哪些会话可以被会话工具（`sessions_list`、`sessions_history`、`sessions_send`）以目标。

默认值：`tree`（当前会话 + 由其生成的会话，如子代理）。

```json5
{
  tools: {
    sessions: {
      // "self" | "tree" | "agent" | "all"
      visibility: "tree",
    },
  },
}
```

<AccordionGroup>
  <Accordion title="可见性范围">
    - `self`：仅当前会话键。
    - `tree`：当前会话 + 由当前会话生成的会话（子代理）。
    - `agent`：属于当前代理 id 的任何会话（如果在同一代理 id 下运行每发送者会话，可能包括其他用户）。
    - `all`：任何会话。跨代理目标仍然需要 `tools.agentToAgent`。
    - 沙盒钳制：当当前会话是沙盒化的且 `agents.defaults.sandbox.sessionToolsVisibility="spawned"` 时，即使 `tools.sessions.visibility="all"`，可见性也会被强制为 `tree`。

  </Accordion>
</AccordionGroup>

### `tools.sessions_spawn`

控制 `sessions_spawn` 的内联附件支持。

```json5
{
  tools: {
    sessions_spawn: {
      attachments: {
        enabled: false, // 选择加入：设置为 true 以允许内联文件附件
        maxTotalBytes: 5242880, // 所有文件总计 5 MB
        maxFiles: 50,
        maxFileBytes: 1048576, // 每文件 1 MB
        retainOnSessionKeep: false, // 当 cleanup="keep" 时保留附件
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="附件注意事项">
    - 附件仅支持 `runtime: "subagent"`。ACP 运行时拒绝它们。
    - 文件在 `.openclaw/attachments/<uuid>/` 处实现到子工作区，带有 `.manifest.json`。
    - 附件内容自动从脚本持久化中删除。
    - Base64 输入使用严格的字母/填充检查和预解码大小保护进行验证。
    - 文件权限：目录 `0700`，文件 `0600`。
    - 清理遵循 `cleanup` 策略：`delete` 始终删除附件；`keep` 仅在 `retainOnSessionKeep: true` 时保留它们。

  </Accordion>
</AccordionGroup>

<a id="toolsexperimental"></a>

### `tools.experimental`

实验性内置工具标志。默认关闭，除非适用严格代理 GPT-5 自动启用规则。

```json5
{
  tools: {
    experimental: {
      planTool: true, // 启用实验性 update_plan
    },
  },
}
```

- `planTool`：为非平凡的多步工作跟踪启用结构化 `update_plan` 工具。
- 默认：`false`，除非 `agents.defaults.embeddedPi.executionContract`（或每代理覆盖）对 OpenAI 或 OpenAI Codex GPT-5 系列运行设置为 `"strict-agentic"`。设置 `true` 在该范围外强制打开工具，或设置 `false` 即使对严格代理 GPT-5 运行也保持关闭。
- 启用时，系统提示也添加使用指导，使模型仅在大量工作时使用它，并最多保持一个步骤 `in_progress`。

### `agents.defaults.subagents`

```json5
{
  agents: {
    defaults: {
      subagents: {
        allowAgents: ["research"],
        model: "minimax/MiniMax-M2.7",
        maxConcurrent: 8,
        runTimeoutSeconds: 900,
        archiveAfterMinutes: 60,
      },
    },
  },
}
```

- `model`：生成的子代理的默认模型。如果省略，子代理继承调用者的模型。
- `allowAgents`：当请求者代理未设置自己的 `subagents.allowAgents` 时，`sessions_spawn` 的目标代理 id 默认允许列表（`["*"]` = 任何；默认：仅同一代理）。
- `runTimeoutSeconds`：工具调用省略 `runTimeoutSeconds` 时 `sessions_spawn` 的默认超时（秒）。`0` 表示无超时。
- 每子代理工具策略：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

---

## 自定义提供商和基础 URL

OpenClaw 使用内置模型目录。通过 `models.providers` 在配置或 `~/.openclaw/agents/<agentId>/agent/models.json` 中添加自定义提供商。

```json5
{
  models: {
    mode: "merge", // merge（默认）| replace
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "LITELLM_KEY",
        api: "openai-completions", // openai-completions | openai-responses | anthropic-messages | google-generative-ai
        models: [
          {
            id: "llama-3.1-8b",
            name: "Llama 3.1 8B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            contextTokens: 96000,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="认证和合并优先级">
    - 对自定义认证需求使用 `authHeader: true` + `headers`。
    - 用 `OPENCLAW_AGENT_DIR`（或 `PI_CODING_AGENT_DIR`，旧版环境变量别名）覆盖代理配置根目录。
    - 匹配提供商 ID 的合并优先级：
      - 非空代理 `models.json` `baseUrl` 值获胜。
      - 非空代理 `apiKey` 值仅在当前配置/认证配置文件上下文中该提供商不是 SecretRef 管理时获胜。
      - SecretRef 管理的提供商 `apiKey` 值从来源标记（env 引用为 `ENV_VAR_NAME`，file/exec 引用为 `secretref-managed`）刷新，而不是持久化已解析的秘密。
      - SecretRef 管理的提供商头值从来源标记（env 引用为 `secretref-env:ENV_VAR_NAME`，file/exec 引用为 `secretref-managed`）刷新。
      - 空或缺少的代理 `apiKey`/`baseUrl` 回退到配置中的 `models.providers`。
      - 匹配的模型 `contextWindow`/`maxTokens` 使用显式配置和隐式目录值之间的较高值。
      - 匹配的模型 `contextTokens` 在存在时保留显式运行时上限；使用它在不更改原生模型元数据的情况下限制有效上下文预算。
      - 当你希望配置完全重写 `models.json` 时使用 `models.mode: "replace"`。
      - 标记持久化是来源权威的：标记从活跃来源配置快照（解析前）写入，而不是从解析的运行时秘密值写入。

  </Accordion>
</AccordionGroup>

### 提供商字段详情

<AccordionGroup>
  <Accordion title="顶级目录">
    - `models.mode`：提供商目录行为（`merge` 或 `replace`）。
    - `models.providers`：自定义提供商映射，以提供商 id 为键。
      - 安全编辑：使用 `openclaw config set models.providers.<id> '<json>' --strict-json --merge` 或 `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge` 进行添加更新。`config set` 拒绝破坏性替换，除非你传递 `--replace`。

  </Accordion>
  <Accordion title="提供商连接和认证">
    - `models.providers.*.api`：请求适配器（`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等）。对于自托管 `/v1/chat/completions` 后端（如 MLX、vLLM、SGLang 和大多数 OpenAI 兼容本地服务器），使用 `openai-completions`。带 `baseUrl` 但无 `api` 的自定义提供商默认为 `openai-completions`；仅当后端支持 `/v1/responses` 时设置 `openai-responses`。
    - `models.providers.*.apiKey`：提供商凭据（优先使用 SecretRef/env 替换）。
    - `models.providers.*.auth`：认证策略（`api-key`、`token`、`oauth`、`aws-sdk`）。
    - `models.providers.*.contextWindow`：当模型条目未设置 `contextWindow` 时，该提供商下模型的默认原生上下文窗口。
    - `models.providers.*.contextTokens`：当模型条目未设置 `contextTokens` 时，该提供商下模型的默认有效运行时上下文上限。
    - `models.providers.*.maxTokens`：当模型条目未设置 `maxTokens` 时，该提供商下模型的默认输出 token 上限。
    - `models.providers.*.timeoutSeconds`：可选的每提供商模型 HTTP 请求超时（秒），包括连接、头部、正文和总请求中止处理。
    - `models.providers.*.injectNumCtxForOpenAICompat`：对于 Ollama + `openai-completions`，在请求中注入 `options.num_ctx`（默认：`true`）。
    - `models.providers.*.authHeader`：需要时强制在 `Authorization` 头中传输凭据。
    - `models.providers.*.baseUrl`：上游 API 基础 URL。
    - `models.providers.*.headers`：代理/租户路由的额外静态头。

  </Accordion>
  <Accordion title="请求传输覆盖">
    `models.providers.*.request`：模型提供商 HTTP 请求的传输覆盖。

    - `request.headers`：额外头（与提供商默认值合并）。值接受 SecretRef。
    - `request.auth`：认证策略覆盖。模式：`"provider-default"`（使用提供商的内置认证）、`"authorization-bearer"`（带 `token`）、`"header"`（带 `headerName`、`value`、可选 `prefix`）。
    - `request.proxy`：HTTP 代理覆盖。模式：`"env-proxy"`（使用 `HTTP_PROXY`/`HTTPS_PROXY` 环境变量）、`"explicit-proxy"`（带 `url`）。两种模式都接受可选的 `tls` 子对象。
    - `request.tls`：直连的 TLS 覆盖。字段：`ca`、`cert`、`key`、`passphrase`（都接受 SecretRef）、`serverName`、`insecureSkipVerify`。
    - `request.allowPrivateNetwork`：当为 `true` 时，通过提供商 HTTP 获取保护允许 HTTPS 到 `baseUrl` 当 DNS 解析到私有、CGNAT 或类似范围（运营商选择加入信任的自托管 OpenAI 兼容端点）。回环模型提供商流 URL 如 `localhost`、`127.0.0.1` 和 `[::1]` 自动允许，除非此设置明确为 `false`；LAN、tailnet 和私有 DNS 主机仍然需要选择加入。WebSocket 对头部/TLS 使用相同的 `request` 但不是该获取 SSRF 门。默认 `false`。

  </Accordion>
  <Accordion title="模型目录条目">
    - `models.providers.*.models`：显式提供商模型目录条目。
    - `models.providers.*.models.*.input`：模型输入模态。使用 `["text"]` 表示纯文本模型，`["text", "image"]` 表示原生图像/视觉模型。图像附件仅在选定模型标记为支持图像时才注入代理对话。
    - `models.providers.*.models.*.contextWindow`：原生模型上下文窗口元数据。这为该模型覆盖提供商级别的 `contextWindow`。
    - `models.providers.*.models.*.contextTokens`：可选的运行时上下文上限。这覆盖提供商级别的 `contextTokens`；当你想要比模型的原生 `contextWindow` 更小的有效上下文预算时使用它；`openclaw models list` 在两者不同时显示两个值。
    - `models.providers.*.models.*.compat.supportsDeveloperRole`：可选的兼容性提示。对于带有非空非原生 `baseUrl`（主机不是 `api.openai.com`）的 `api: "openai-completions"`，OpenClaw 在运行时将其强制为 `false`。空/省略的 `baseUrl` 保持默认 OpenAI 行为。
    - `models.providers.*.models.*.compat.requiresStringContent`：仅字符串 OpenAI 兼容聊天端点的可选兼容性提示。当为 `true` 时，OpenClaw 在发送请求前将纯文本 `messages[].content` 数组展平为普通字符串。

  </Accordion>
  <Accordion title="Amazon Bedrock 发现">
    - `plugins.entries.amazon-bedrock.config.discovery`：Bedrock 自动发现设置根目录。
    - `plugins.entries.amazon-bedrock.config.discovery.enabled`：打开/关闭隐式发现。
    - `plugins.entries.amazon-bedrock.config.discovery.region`：发现的 AWS 区域。
    - `plugins.entries.amazon-bedrock.config.discovery.providerFilter`：目标发现的可选提供商 id 过滤。
    - `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`：发现刷新的轮询间隔。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`：发现模型的回退上下文窗口。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`：发现模型的回退最大输出 token。

  </Accordion>
</AccordionGroup>

交互式自定义提供商入门为常见视觉模型 ID（如 GPT-4o、Claude、Gemini、Qwen-VL、LLaVA、Pixtral、InternVL、Mllama、MiniCPM-V 和 GLM-4V）推断图像输入，并跳过已知纯文本家族的额外问题。未知的模型 ID 仍然提示图像支持。非交互式入门使用相同的推断；传递 `--custom-image-input` 强制图像能力元数据，或 `--custom-text-input` 强制仅文本元数据。

### 提供商示例

<AccordionGroup>
  <Accordion title="Cerebras（GLM 4.7 / GPT OSS）">
    捆绑的 `cerebras` 提供商插件可以通过 `openclaw onboard --auth-choice cerebras-api-key` 配置此项。仅在覆盖默认值时使用显式提供商配置。

    ```json5
    {
      env: { CEREBRAS_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: {
            primary: "cerebras/zai-glm-4.7",
            fallbacks: ["cerebras/gpt-oss-120b"],
          },
          models: {
            "cerebras/zai-glm-4.7": { alias: "GLM 4.7 (Cerebras)" },
            "cerebras/gpt-oss-120b": { alias: "GPT OSS 120B (Cerebras)" },
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          cerebras: {
            baseUrl: "https://api.cerebras.ai/v1",
            apiKey: "${CEREBRAS_API_KEY}",
            api: "openai-completions",
            models: [
              { id: "zai-glm-4.7", name: "GLM 4.7 (Cerebras)" },
              { id: "gpt-oss-120b", name: "GPT OSS 120B (Cerebras)" },
            ],
          },
        },
      },
    }
    ```

    Cerebras 使用 `cerebras/zai-glm-4.7`；Z.AI 直连使用 `zai/glm-4.7`。

  </Accordion>
  <Accordion title="Kimi Coding">
    ```json5
    {
      env: { KIMI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "kimi/kimi-code" },
          models: { "kimi/kimi-code": { alias: "Kimi Code" } },
        },
      },
    }
    ```

    Anthropic 兼容，内置提供商。快捷方式：`openclaw onboard --auth-choice kimi-code-api-key`。

  </Accordion>
  <Accordion title="本地模型（LM Studio）">
    参见[本地模型](/gateway/local-models)。简介：在严肃硬件上通过 LM Studio Responses API 运行大型本地模型；保持托管模型合并以进行回退。
  </Accordion>
  <Accordion title="MiniMax M2.7（直连）">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "Minimax" },
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "MiniMax-M2.7",
                name: "MiniMax M2.7",
                reasoning: true,
                input: ["text"],
                cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    设置 `MINIMAX_API_KEY`。快捷方式：`openclaw onboard --auth-choice minimax-global-api` 或 `openclaw onboard --auth-choice minimax-cn-api`。模型目录默认仅 M2.7。在 Anthropic 兼容流路径上，OpenClaw 默认禁用 MiniMax 思考，除非你自己明确设置 `thinking`。`/fast on` 或 `params.fastMode: true` 将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。

  </Accordion>
  <Accordion title="Moonshot AI（Kimi）">
    ```json5
    {
      env: { MOONSHOT_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "moonshot/kimi-k2.6" },
          models: { "moonshot/kimi-k2.6": { alias: "Kimi K2.6" } },
        },
      },
      models: {
        mode: "merge",
        providers: {
          moonshot: {
            baseUrl: "https://api.moonshot.ai/v1",
            apiKey: "${MOONSHOT_API_KEY}",
            api: "openai-completions",
            models: [
              {
                id: "kimi-k2.6",
                name: "Kimi K2.6",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
            ],
          },
        },
      },
    }
    ```

    对于中国端点：`baseUrl: "https://api.moonshot.cn/v1"` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`。

    原生 Moonshot 端点在共享 `openai-completions` 传输上公布流使用情况兼容性，OpenClaw 仅根据端点功能而非内置提供商 id 来确定这一点。

  </Accordion>
  <Accordion title="OpenCode">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "opencode/claude-opus-4-6" },
          models: { "opencode/claude-opus-4-6": { alias: "Opus" } },
        },
      },
    }
    ```

    设置 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）。使用 `opencode/...` 引用 Zen 目录，或 `opencode-go/...` 引用 Go 目录。快捷方式：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

  </Accordion>
  <Accordion title="Synthetic（Anthropic 兼容）">
    ```json5
    {
      env: { SYNTHETIC_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" },
          models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.5": { alias: "MiniMax M2.5" } },
        },
      },
      models: {
        mode: "merge",
        providers: {
          synthetic: {
            baseUrl: "https://api.synthetic.new/anthropic",
            apiKey: "${SYNTHETIC_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "hf:MiniMaxAI/MiniMax-M2.5",
                name: "MiniMax M2.5",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 192000,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```

    基础 URL 应省略 `/v1`（Anthropic 客户端会追加它）。快捷方式：`openclaw onboard --auth-choice synthetic-api-key`。

  </Accordion>
  <Accordion title="Z.AI（GLM-4.7）">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-4.7" },
          models: { "zai/glm-4.7": {} },
        },
      },
    }
    ```

    设置 `ZAI_API_KEY`。`z.ai/*` 和 `z-ai/*` 是接受的别名。快捷方式：`openclaw onboard --auth-choice zai-api-key`。

    - 通用端点：`https://api.z.ai/api/paas/v4`
    - 编程端点（默认）：`https://api.z.ai/api/coding/paas/v4`
    - 对于通用端点，定义带有基础 URL 覆盖的自定义提供商。

  </Accordion>
</AccordionGroup>

---

## 相关链接

- [配置 — 代理](/gateway/config-agents)
- [配置 — 渠道](/gateway/config-channels)
- [配置参考](/gateway/configuration-reference) — 其他顶级键
- [工具和插件](/tools)
