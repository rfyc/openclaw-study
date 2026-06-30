---
summary: "代理默认值、多代理路由、会话、消息和 Talk 配置"
read_when:
  - 调整代理默认值（模型、思考、工作区、心跳、媒体、技能）
  - 配置多代理路由和绑定
  - 调整会话、消息交付和 Talk 模式行为
title: "配置 — 代理"
---

`agents.*`、`multiAgent.*`、`session.*`、`messages.*` 和 `talk.*` 下的代理范围配置键。有关渠道、工具、网关运行时和其他顶级键，请参阅[配置参考](/gateway/configuration-reference)。

## 代理默认值

### `agents.defaults.workspace`

默认值：`~/.openclaw/workspace`。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

### `agents.defaults.repoRoot`

系统提示运行时行中显示的可选仓库根目录。如果未设置，OpenClaw 会从工作区向上走目录自动检测。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

代理的可选默认技能允许列表，适用于未设置 `agents.list[].skills` 的代理。

```json5
{
  agents: {
    defaults: { skills: ["github", "weather"] },
    list: [
      { id: "writer" }, // 继承 github, weather
      { id: "docs", skills: ["docs-search"] }, // 替换默认值
      { id: "locked-down", skills: [] }, // 无技能
    ],
  },
}
```

- 省略 `agents.defaults.skills` 以默认不限制技能。
- 省略 `agents.list[].skills` 以继承默认值。
- 将 `agents.list[].skills: []` 设置为无技能。
- 非空的 `agents.list[].skills` 列表是该代理的最终集合；它不会与默认值合并。

### `agents.defaults.skipBootstrap`

禁用工作区引导文件的自动创建（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.skipOptionalBootstrapFiles`

跳过选定可选工作区文件的创建，同时仍然写入必需的引导文件。有效值：`SOUL.md`、`USER.md`、`HEARTBEAT.md` 和 `IDENTITY.md`。

```json5
{
  agents: {
    defaults: {
      skipOptionalBootstrapFiles: ["SOUL.md", "USER.md"],
    },
  },
}
```

### `agents.defaults.contextInjection`

控制工作区引导文件何时注入系统提示。默认值：`"always"`。

- `"continuation-skip"`：安全的延续对话（在助手响应完成后）跳过工作区引导的重新注入，减少提示大小。心跳运行和压缩后重试仍然重建上下文。
- `"never"`：禁用每次对话的工作区引导和上下文文件注入。仅对完全拥有自己提示生命周期的代理使用（自定义上下文引擎、构建自己上下文的原生运行时，或专门的无引导工作流）。心跳和压缩恢复对话也跳过注入。

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

### `agents.defaults.bootstrapMaxChars`

截断前每个工作区引导文件的最大字符数。默认值：`12000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 12000 } },
}
```

### `agents.defaults.bootstrapTotalMaxChars`

跨所有工作区引导文件注入的总最大字符数。默认值：`60000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

控制当引导上下文被截断时对代理可见的系统提示通知。默认值：`"once"`。

- `"off"`：从不将截断通知文本注入系统提示。
- `"once"`：每个唯一截断签名注入一次简洁通知（推荐）。
- `"always"`：每次存在截断时都注入简洁通知。

详细的原始/注入计数和配置调整字段保留在诊断中，如上下文/状态报告和日志；常规 WebChat 用户/运行时上下文只会得到简洁的恢复通知。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### 上下文预算所有权映射

OpenClaw 有多个高容量提示/上下文预算，它们有意按子系统拆分，而不是全部流经一个通用旋钮。

- `agents.defaults.bootstrapMaxChars` / `agents.defaults.bootstrapTotalMaxChars`：正常工作区引导注入。
- `agents.defaults.startupContext.*`：一次性重置/启动模型运行序言，包括最近的每日 `memory/*.md` 文件。裸聊天 `/new` 和 `/reset` 命令在不调用模型的情况下被确认。
- `skills.limits.*`：注入系统提示的紧凑技能列表。
- `agents.defaults.contextLimits.*`：有界的运行时摘录和注入的运行时拥有块。
- `memory.qmd.limits.*`：索引记忆搜索片段和注入大小。

仅在一个代理需要不同预算时使用匹配的每代理覆盖：

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextLimits.*`

#### `agents.defaults.startupContext`

控制在重置/启动模型运行时注入的第一轮启动序言。裸聊天 `/new` 和 `/reset` 命令在不调用模型的情况下确认重置，因此它们不加载此序言。

```json5
{
  agents: {
    defaults: {
      startupContext: {
        enabled: true,
        applyOn: ["new", "reset"],
        dailyMemoryDays: 2,
        maxFileBytes: 16384,
        maxFileChars: 1200,
        maxTotalChars: 2800,
      },
    },
  },
}
```

#### `agents.defaults.contextLimits`

有界运行时上下文表面的共享默认值。

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        memoryGetDefaultLines: 120,
        toolResultMaxChars: 16000,
        postCompactionMaxChars: 1800,
      },
    },
  },
}
```

- `memoryGetMaxChars`：默认 `memory_get` 摘录上限，超过后添加截断元数据和延续通知。
- `memoryGetDefaultLines`：省略 `lines` 时的默认 `memory_get` 行窗口。
- `toolResultMaxChars`：用于持久化结果和溢出恢复的实时工具结果上限。
- `postCompactionMaxChars`：压缩后刷新注入期间使用的 AGENTS.md 摘录上限。

#### `agents.list[].contextLimits`

共享 `contextLimits` 旋钮的每代理覆盖。省略的字段从 `agents.defaults.contextLimits` 继承。

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        toolResultMaxChars: 16000,
      },
    },
    list: [
      {
        id: "tiny-local",
        contextLimits: {
          memoryGetMaxChars: 6000,
          toolResultMaxChars: 8000,
        },
      },
    ],
  },
}
```

#### `skills.limits.maxSkillsPromptChars`

注入系统提示的紧凑技能列表的全局上限。这不影响按需读取 `SKILL.md` 文件。

```json5
{
  skills: {
    limits: {
      maxSkillsPromptChars: 18000,
    },
  },
}
```

#### `agents.list[].skillsLimits.maxSkillsPromptChars`

技能提示预算的每代理覆盖。

```json5
{
  agents: {
    list: [
      {
        id: "tiny-local",
        skillsLimits: {
          maxSkillsPromptChars: 6000,
        },
      },
    ],
  },
}
```

### `agents.defaults.imageMaxDimensionPx`

提供商调用前脚本/工具图像块中最长图像边的最大像素大小。默认值：`1200`。

较低的值通常会减少截图密集型运行的视觉 token 使用量和请求有效载荷大小。较高的值保留更多视觉细节。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

系统提示上下文的时区（不是消息时间戳）。回退到主机时区。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

系统提示中的时间格式。默认值：`auto`（操作系统偏好）。

```json5
{
  agents: { defaults: { timeFormat: "auto" } }, // auto | 12 | 24
}
```

### `agents.defaults.model`

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "opus" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: ["openrouter/google/gemini-2.0-flash-vision:free"],
      },
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
        fallbacks: ["google/gemini-3.1-flash-image-preview"],
      },
      videoGenerationModel: {
        primary: "qwen/wan2.6-t2v",
        fallbacks: ["qwen/wan2.6-i2v"],
      },
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5.4-mini"],
      },
      params: { cacheRetention: "long" }, // 全局默认提供商参数
      agentRuntime: {
        id: "pi", // pi | auto | 已注册的套件 id，例如 codex
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
      thinkingDefault: "low",
      verboseDefault: "off",
      toolProgressDetail: "explain",
      reasoningDefault: "off",
      elevatedDefault: "on",
      timeoutSeconds: 600,
      mediaMaxMb: 5,
      contextTokens: 200000,
      maxConcurrent: 3,
    },
  },
}
```

- `model`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 字符串形式仅设置主模型。
  - 对象形式设置主模型和有序故障转移模型。
- `imageModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 用作 `image` 工具路径的视觉模型配置。
  - 也用作当选定/默认模型无法接受图像输入时的回退路由。
  - 优先使用显式 `provider/model` 引用。裸 ID 为兼容性接受；如果裸 ID 唯一匹配 `models.providers.*.models` 中已配置的支持图像的条目，OpenClaw 会将其限定到该提供商。模糊的已配置匹配需要显式的提供商前缀。
- `imageGenerationModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 用于共享图像生成功能和任何未来的工具/插件接口来生成图像。
  - 典型值：Google Gemini 原生图像生成使用 `google/gemini-3.1-flash-image-preview`，fal 使用 `fal/fal-ai/flux/dev`，OpenAI Images 使用 `openai/gpt-image-2`，透明背景 OpenAI PNG/WebP 输出使用 `openai/gpt-image-1.5`。
  - 如果你直接选择 provider/model，也要配置匹配的提供商认证（例如 Google `google/*` 需要 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，`openai/gpt-image-2` / `openai/gpt-image-1.5` 需要 `OPENAI_API_KEY` 或 OpenAI Codex OAuth，`fal/*` 需要 `FAL_KEY`）。
  - 如果省略，`image_generate` 仍然可以推断出有认证支持的提供商默认值。它先尝试当前默认提供商，然后按提供商 id 顺序尝试其余已注册的图像生成提供商。
- `musicGenerationModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 用于共享音乐生成功能和内置 `music_generate` 工具。
  - 典型值：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.6`。
  - 如果省略，`music_generate` 仍然可以推断出有认证支持的提供商默认值。它先尝试当前默认提供商，然后按提供商 id 顺序尝试其余已注册的音乐生成提供商。
  - 如果你直接选择 provider/model，也要配置匹配的提供商认证/API 密钥。
- `videoGenerationModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 用于共享视频生成功能和内置 `video_generate` 工具。
  - 典型值：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 如果省略，`video_generate` 仍然可以推断出有认证支持的提供商默认值。它先尝试当前默认提供商，然后按提供商 id 顺序尝试其余已注册的视频生成提供商。
  - 如果你直接选择 provider/model，也要配置匹配的提供商认证/API 密钥。
  - 捆绑的 Qwen 视频生成提供商最多支持 1 个输出视频、1 个输入图像、4 个输入视频、10 秒持续时间和提供商级别的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 选项。
- `pdfModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 用于 `pdf` 工具的模型路由。
  - 如果省略，PDF 工具回退到 `imageModel`，然后回退到已解析的会话/默认模型。
- `pdfMaxBytesMb`：`pdf` 工具在调用时未传递 `maxBytesMb` 时的默认 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具中提取回退模式考虑的默认最大页数。
- `verboseDefault`：代理的默认详细级别。值：`"off"`、`"on"`、`"full"`。默认值：`"off"`。
- `toolProgressDetail`：`/verbose` 工具摘要和进度草稿工具行的详情模式。值：`"explain"`（默认，紧凑人类标签）或 `"raw"`（可用时追加原始命令/详情）。每代理 `agents.list[].toolProgressDetail` 覆盖此默认值。
- `reasoningDefault`：代理的默认推理可见性。值：`"off"`、`"on"`、`"stream"`。每代理 `agents.list[].reasoningDefault` 覆盖此默认值。已配置的推理默认值仅在没有设置每消息或会话推理覆盖时，对所有者、授权发送者或操作员管理员网关上下文应用。
- `elevatedDefault`：代理的默认提升输出级别。值：`"off"`、`"on"`、`"ask"`、`"full"`。默认值：`"on"`。
- `model.primary`：格式 `provider/model`（例如，API 密钥访问使用 `openai/gpt-5.5`，Codex OAuth 使用 `openai-codex/gpt-5.5`）。如果省略提供商，OpenClaw 先尝试别名，然后是该精确模型 id 的唯一已配置提供商匹配，最后才回退到已配置的默认提供商（已弃用的兼容行为，因此优先使用显式 `provider/model`）。如果该提供商不再公开已配置的默认模型，OpenClaw 回退到第一个已配置的 provider/model，而不是暴露过时的已移除提供商默认值。
- `models`：`/model` 的已配置模型目录和允许列表。每个条目可以包含 `alias`（快捷方式）和 `params`（提供商特定，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`、`responsesServerCompaction`、`responsesCompactThreshold`、`chat_template_kwargs`、`extra_body`/`extraBody`）。
  - 安全编辑：使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 添加条目。`config set` 拒绝会删除现有允许列表条目的替换，除非你传递 `--replace`。
  - 提供商范围的配置/入门流程将选定的提供商模型合并到此映射中，并保留已配置的无关提供商。
  - 对于直接的 OpenAI Responses 模型，服务器端压缩自动启用。使用 `params.responsesServerCompaction: false` 停止注入 `context_management`，或使用 `params.responsesCompactThreshold` 覆盖阈值。参见 [OpenAI 服务器端压缩](/providers/openai#server-side-compaction-responses-api)。
- `params`：应用于所有模型的全局默认提供商参数。在 `agents.defaults.params` 设置（例如 `{ cacheRetention: "long" }`）。
- `params` 合并优先级（配置）：`agents.defaults.params`（全局基础）被 `agents.defaults.models["provider/model"].params`（每模型）覆盖，然后 `agents.list[].params`（匹配代理 id）按键覆盖。详情参见[提示缓存](/reference/prompt-caching)。
- `params.extra_body`/`params.extraBody`：高级传递 JSON，合并到 OpenAI 兼容代理的 `api: "openai-completions"` 请求体中。如果与生成的请求键冲突，额外正文获胜；非原生完成路由之后仍然剥离仅 OpenAI 的 `store`。
- `params.chat_template_kwargs`：合并到顶级 `api: "openai-completions"` 请求体的 vLLM/OpenAI 兼容聊天模板参数。对于思考关闭的 `vllm/nemotron-3-*`，捆绑的 vLLM 插件自动发送 `enable_thinking: false` 和 `force_nonempty_content: true`；显式 `chat_template_kwargs` 覆盖生成的默认值，`extra_body.chat_template_kwargs` 仍然具有最终优先级。对于 vLLM Qwen 思考控制，在该模型条目上将 `params.qwenThinkingFormat` 设置为 `"chat-template"` 或 `"top-level"`。
- `compat.supportedReasoningEfforts`：每模型 OpenAI 兼容推理努力列表。对于真正接受它的自定义端点包含 `"xhigh"`；OpenClaw 然后在命令菜单、网关会话行、会话修补验证、代理 CLI 验证和该已配置 provider/model 的 `llm-task` 验证中公开 `/think xhigh`。当后端对规范级别需要提供商特定值时使用 `compat.reasoningEffortMap`。
- `params.preserveThinking`：Z.AI 专用的保留思考选择加入。启用且思考开启时，OpenClaw 发送 `thinking.clear_thinking: false` 并重播先前的 `reasoning_content`；参见 [Z.AI 思考和保留思考](/providers/zai#thinking-and-preserved-thinking)。
- `agentRuntime`：默认低级代理运行时策略。省略 id 默认为 OpenClaw Pi。使用 `id: "pi"` 强制内置 PI 套件，`id: "auto"` 让已注册的插件套件声明支持的模型并在没有匹配时使用 PI，已注册的套件 id（如 `id: "codex"`）要求该套件，或支持的 CLI 后端别名（如 `id: "claude-cli"`）。显式插件运行时在套件不可用或失败时失败关闭。保持模型引用为规范的 `provider/model`；通过运行时配置而非传统运行时提供商前缀来选择 Codex、Claude CLI、Gemini CLI 和其他执行后端。参见[代理运行时](/concepts/agent-runtimes)了解这与 provider/model 选择的区别。
- 修改这些字段的配置写入器（例如 `/models set`、`/models set-image` 和回退添加/删除命令）保存规范对象形式，并在可能的情况下保留现有的回退列表。
- `maxConcurrent`：跨会话的最大并行代理运行（每个会话仍然序列化）。默认值：4。

### `agents.defaults.agentRuntime`

`agentRuntime` 控制哪个低级执行器运行代理对话。大多数部署应保留默认的 OpenClaw Pi 运行时。当受信任的插件提供原生套件（如捆绑的 Codex 应用服务器套件）或需要支持的 CLI 后端（如 Claude CLI）时使用它。关于心理模型，参见[代理运行时](/concepts/agent-runtimes)。

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
      },
    },
  },
}
```

- `id`：`"auto"`、`"pi"`、已注册的插件套件 id 或支持的 CLI 后端别名。捆绑的 Codex 插件注册 `codex`；捆绑的 Anthropic 插件提供 `claude-cli` CLI 后端。
- `id: "auto"` 让已注册的插件套件声明支持的对话，在没有套件匹配时使用 PI。显式插件运行时如 `id: "codex"` 要求该套件，在套件不可用或失败时失败关闭。
- 环境覆盖：`OPENCLAW_AGENT_RUNTIME=<id|auto|pi>` 覆盖该进程的 `id`。
- 对于仅 Codex 的部署，设置 `model: "openai/gpt-5.5"` 和 `agentRuntime.id: "codex"`。
- 对于 Claude CLI 部署，优先使用 `model: "anthropic/claude-opus-4-7"` 加 `agentRuntime.id: "claude-cli"`。传统的 `claude-cli/claude-opus-4-7` 模型引用仍然有效以保持兼容性，但新配置应保持 provider/model 选择规范，并将执行后端放在 `agentRuntime.id` 中。
- 旧版运行时策略键由 `openclaw doctor --fix` 重写为 `agentRuntime`。
- 套件选择在第一次嵌入式运行后按会话 id 固定。配置/环境更改影响新的或重置的会话，不影响现有脚本。有脚本历史记录但没有记录固定的旧版会话被视为 PI 固定。`/status` 报告有效运行时，例如 `Runtime: OpenClaw Pi Default` 或 `Runtime: OpenAI Codex`。
- 这只控制文本代理对话执行。媒体生成、视觉、PDF、音乐、视频和 TTS 仍然使用其 provider/model 设置。

**内置别名简写**（仅在模型在 `agents.defaults.models` 中时适用）：

| 别名                | 模型                                       |
| ------------------- | ------------------------------------------ |
| `opus`              | `anthropic/claude-opus-4-6`                |
| `sonnet`            | `anthropic/claude-sonnet-4-6`              |
| `gpt`               | `openai/gpt-5.5` 或 `openai-codex/gpt-5.5` |
| `gpt-mini`          | `openai/gpt-5.4-mini`                      |
| `gpt-nano`          | `openai/gpt-5.4-nano`                      |
| `gemini`            | `google/gemini-3.1-pro-preview`            |
| `gemini-flash`      | `google/gemini-3-flash-preview`            |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview`     |

你配置的别名总是优先于默认值。

Z.AI GLM-4.x 模型会自动启用思考模式，除非你设置 `--thinking off` 或自己定义 `agents.defaults.models["zai/<model>"].params.thinking`。
Z.AI 模型默认为工具调用流启用 `tool_stream`。将 `agents.defaults.models["zai/<model>"].params.tool_stream` 设置为 `false` 可禁用它。
Anthropic Claude 4.6 模型在没有设置明确思考级别时默认为 `adaptive` 思考。

### `agents.defaults.cliBackends`

可选的 CLI 后端，用于纯文本回退运行（无工具调用）。在 API 提供商失败时作为备份非常有用。

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          modelArg: "--model",
          sessionArg: "--session",
          sessionMode: "existing",
          systemPromptArg: "--system",
          // 或者当 CLI 接受提示文件标志时使用 systemPromptFileArg。
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
        },
      },
    },
  },
}
```

- CLI 后端是文本优先的；工具总是禁用的。
- 设置 `sessionArg` 时支持会话。
- 当 `imageArg` 接受文件路径时支持图像传递。

### `agents.defaults.systemPromptOverride`

用固定字符串替换整个 OpenClaw 组装的系统提示。在默认级别（`agents.defaults.systemPromptOverride`）或每代理（`agents.list[].systemPromptOverride`）设置。每代理值优先；空或仅含空白的值被忽略。对于受控提示实验很有用。

```json5
{
  agents: {
    defaults: {
      systemPromptOverride: "You are a helpful assistant.",
    },
  },
}
```

### `agents.defaults.promptOverlays`

按模型系列应用的提供商无关提示叠加层。GPT-5 系列模型 id 跨提供商接收共享的行为契约；`personality` 只控制友好的交互风格层。

```json5
{
  agents: {
    defaults: {
      promptOverlays: {
        gpt5: {
          personality: "friendly", // friendly | on | off
        },
      },
    },
  },
}
```

- `"friendly"`（默认）和 `"on"` 启用友好的交互风格层。
- `"off"` 只禁用友好层；标记的 GPT-5 行为契约保持启用。
- 当此共享设置未设置时，仍然读取旧版 `plugins.entries.openai.config.personality`。

### `agents.defaults.heartbeat`

周期性心跳运行。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 0m 禁用
        model: "openai/gpt-5.4-mini",
        includeReasoning: false,
        includeSystemPromptSection: true, // 默认：true；false 从系统提示中省略 Heartbeat 部分
        lightContext: false, // 默认：false；true 只保留工作区引导文件中的 HEARTBEAT.md
        isolatedSession: false, // 默认：false；true 在全新会话中运行每次心跳（无对话历史）
        skipWhenBusy: false, // 默认：false；true 也等待子代理/嵌套通道
        session: "main",
        to: "+15555550123",
        directPolicy: "allow", // allow（默认）| block
        target: "none", // 默认：none | 选项：last | whatsapp | telegram | discord | ...
        prompt: "Read HEARTBEAT.md if it exists...",
        ackMaxChars: 300,
        suppressToolErrorWarnings: false,
        timeoutSeconds: 45,
      },
    },
  },
}
```

- `every`：持续时间字符串（ms/s/m/h）。默认值：`30m`（API 密钥认证）或 `1h`（OAuth 认证）。设置为 `0m` 可禁用。
- `includeSystemPromptSection`：当为 false 时，从系统提示中省略 Heartbeat 部分，并跳过将 `HEARTBEAT.md` 注入引导上下文。默认值：`true`。
- `suppressToolErrorWarnings`：当为 true 时，在心跳运行期间抑制工具错误警告有效载荷。
- `timeoutSeconds`：心跳代理对话在被中止前允许的最大时间（秒）。不设置则使用 `agents.defaults.timeoutSeconds`。
- `directPolicy`：直接/DM 交付策略。`allow`（默认）允许直接目标交付。`block` 抑制直接目标交付并发出 `reason=dm-blocked`。
- `lightContext`：当为 true 时，心跳运行使用轻量级引导上下文，仅保留工作区引导文件中的 `HEARTBEAT.md`。
- `isolatedSession`：当为 true 时，每次心跳在无先前对话历史的全新会话中运行。与 cron `sessionTarget: "isolated"` 相同的隔离模式。将每次心跳 token 成本从约 100K 减少到约 2-5K token。
- `skipWhenBusy`：当为 true 时，心跳运行在额外繁忙的通道上延迟：子代理或嵌套命令工作。即使没有此标志，Cron 通道始终延迟心跳。
- 每代理：设置 `agents.list[].heartbeat`。当任何代理定义了 `heartbeat`，**只有那些代理**运行心跳。
- 心跳运行完整的代理对话 — 较短的间隔消耗更多 token。

### `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        mode: "safeguard", // default | safeguard
        provider: "my-provider", // 已注册的压缩提供商插件 id（可选）
        timeoutSeconds: 900,
        reserveTokensFloor: 24000,
        keepRecentTokens: 50000,
        identifierPolicy: "strict", // strict | off | custom
        identifierInstructions: "Preserve deployment IDs, ticket IDs, and host:port pairs exactly.", // 当 identifierPolicy=custom 时使用
        qualityGuard: { enabled: true, maxRetries: 1 },
        midTurnPrecheck: { enabled: false }, // 可选的 Pi 工具循环压力检查
        postCompactionSections: ["Session Startup", "Red Lines"], // [] 禁用重新注入
        model: "openrouter/anthropic/claude-sonnet-4-6", // 可选的仅压缩模型覆盖
        truncateAfterCompaction: true, // 压缩后轮换到更小的后继 JSONL
        maxActiveTranscriptBytes: "20mb", // 可选的预检本地压缩触发
        notifyUser: true, // 压缩开始和完成时发送简短通知（默认：false）
        memoryFlush: {
          enabled: true,
          model: "ollama/qwen3:8b", // 可选的仅内存刷新模型覆盖
          softThresholdTokens: 6000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with the exact silent token NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

- `mode`：`default` 或 `safeguard`（长历史的分块摘要）。参见[压缩](/concepts/compaction)。
- `provider`：已注册的压缩提供商插件 id。设置后，将调用提供商的 `summarize()` 而不是内置 LLM 摘要。失败时回退到内置。设置提供商会强制 `mode: "safeguard"`。参见[压缩](/concepts/compaction)。
- `timeoutSeconds`：OpenClaw 中止前允许单个压缩操作的最大秒数。默认值：`900`。
- `keepRecentTokens`：Pi 切点预算，用于保持最近的脚本尾部逐字。手动 `/compact` 在明确设置时遵守此设置；否则手动压缩是一个硬检查点。
- `identifierPolicy`：`strict`（默认）、`off` 或 `custom`。`strict` 在压缩摘要期间前置内置的不透明标识符保留指导。
- `identifierInstructions`：`identifierPolicy=custom` 时使用的可选自定义标识符保留文本。
- `qualityGuard`：保护模式摘要的格式错误输出重试检查。在保护模式下默认启用；设置 `enabled: false` 跳过审计。
- `midTurnPrecheck`：可选的 Pi 工具循环压力检查。当 `enabled: true` 时，OpenClaw 在工具结果追加后和下一次模型调用前检查上下文压力。如果上下文不再合适，它在提交提示前中止当前尝试，并复用现有的预检恢复路径来截断工具结果或压缩并重试。与 `default` 和 `safeguard` 压缩模式都兼容。默认：禁用。
- `postCompactionSections`：压缩后重新注入的可选 AGENTS.md H2/H3 部分名称。默认为 `["Session Startup", "Red Lines"]`；设置 `[]` 禁用重新注入。未设置或显式设置为该默认对时，旧版 `Every Session`/`Safety` 标题也作为旧版回退被接受。
- `model`：仅用于压缩摘要的可选 `provider/model-id` 覆盖。当主会话应保持一个模型但压缩摘要应在另一个模型上运行时使用；未设置时，压缩使用会话的主模型。
- `maxActiveTranscriptBytes`：可选字节阈值（`number` 或 `"20mb"` 等字符串），当活跃 JSONL 超过阈值时，在运行前触发正常的本地压缩。需要 `truncateAfterCompaction` 以便成功的压缩可以轮换到更小的后继脚本。未设置或 `0` 时禁用。
- `notifyUser`：当为 `true` 时，在压缩开始和完成时向用户发送简短通知（例如"正在压缩上下文..."和"压缩完成"）。默认禁用以保持压缩静默。
- `memoryFlush`：自动压缩前的静默代理对话，用于存储持久记忆。当此内务对话应保持在本地模型上时，将 `model` 设置为精确的 provider/model，如 `ollama/qwen3:8b`；覆盖不继承活跃会话的回退链。当工作区只读时跳过。

### `agents.defaults.contextPruning`

在发送到 LLM 之前从内存中上下文**剪枝旧工具结果**。**不会**修改磁盘上的会话历史。

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl", // off | cache-ttl
        ttl: "1h", // 持续时间（ms/s/m/h），默认单位：分钟
        keepLastAssistants: 3,
        softTrimRatio: 0.3,
        hardClearRatio: 0.5,
        minPrunableToolChars: 50000,
        softTrim: { maxChars: 4000, headChars: 1500, tailChars: 1500 },
        hardClear: { enabled: true, placeholder: "[Old tool result content cleared]" },
        tools: { deny: ["browser", "canvas"] },
      },
    },
  },
}
```

<Accordion title="cache-ttl 模式行为">

- `mode: "cache-ttl"` 启用剪枝通道。
- `ttl` 控制剪枝可以再次运行的频率（在最后一次缓存触碰后）。
- 剪枝首先软修剪过大的工具结果，然后在需要时硬清除旧的工具结果。

**软修剪**保留开头 + 结尾并在中间插入 `...`。

**硬清除**用占位符替换整个工具结果。

注意事项：

- 图像块永远不会被修剪/清除。
- 比率基于字符（近似），而不是精确的 token 数量。
- 如果存在的助手消息少于 `keepLastAssistants`，则跳过剪枝。

</Accordion>

行为详情参见[会话剪枝](/concepts/session-pruning)。

### 块流式传输

```json5
{
  agents: {
    defaults: {
      blockStreamingDefault: "off", // on | off
      blockStreamingBreak: "text_end", // text_end | message_end
      blockStreamingChunk: { minChars: 800, maxChars: 1200 },
      blockStreamingCoalesce: { idleMs: 1000 },
      humanDelay: { mode: "natural" }, // off | natural | custom（使用 minMs/maxMs）
    },
  },
}
```

- 非 Telegram 渠道需要显式 `*.blockStreaming: true` 来启用块回复。
- 渠道覆盖：`channels.<channel>.blockStreamingCoalesce`（以及每账户变体）。Signal/Slack/Discord/Google Chat 默认 `minChars: 1500`。
- `humanDelay`：块回复之间的随机暂停。`natural` = 800-2500ms。每代理覆盖：`agents.list[].humanDelay`。

行为 + 分块详情参见[流式传输](/concepts/streaming)。

### 打字指示器

```json5
{
  agents: {
    defaults: {
      typingMode: "instant", // never | instant | thinking | message
      typingIntervalSeconds: 6,
    },
  },
}
```

- 默认值：直接聊天/提及为 `instant`，未提及的群聊为 `message`。
- 每会话覆盖：`session.typingMode`、`session.typingIntervalSeconds`。

参见[打字指示器](/concepts/typing-indicators)。

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

嵌入式代理的可选沙盒。完整指南参见[沙盒](/gateway/sandboxing)。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        backend: "docker", // docker | ssh | openshell
        scope: "agent", // session | agent | shared
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          containerPrefix: "openclaw-sbx-",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256,
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
          binds: ["/home/user/source:/source:rw"],
        },
        ssh: {
          target: "user@gateway-host:22",
          command: "ssh",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // 也支持 SecretRefs / 内联内容：
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
        browser: {
          enabled: false,
          image: "openclaw-sandbox-browser:bookworm-slim",
          network: "openclaw-sandbox-browser",
          cdpPort: 9222,
          cdpSourceRange: "172.21.0.1/32",
          vncPort: 5900,
          noVncPort: 6080,
          headless: false,
          enableNoVnc: true,
          allowHostControl: false,
          autoStart: true,
          autoStartTimeoutMs: 12000,
        },
        prune: {
          idleHours: 24,
          maxAgeDays: 7,
        },
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        allow: [
          "exec",
          "process",
          "read",
          "write",
          "edit",
          "apply_patch",
          "sessions_list",
          "sessions_history",
          "sessions_send",
          "sessions_spawn",
          "session_status",
        ],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

<Accordion title="沙盒详情">

**后端：**

- `docker`：本地 Docker 运行时（默认）
- `ssh`：通用 SSH 支持的远程运行时
- `openshell`：OpenShell 运行时

当选择 `backend: "openshell"` 时，运行时特定设置移动到 `plugins.entries.openshell.config`。

**SSH 后端配置：**

- `target`：`user@host[:port]` 形式的 SSH 目标
- `command`：SSH 客户端命令（默认：`ssh`）
- `workspaceRoot`：用于每范围工作区的绝对远程根目录
- `identityFile` / `certificateFile` / `knownHostsFile`：传递给 OpenSSH 的现有本地文件
- `identityData` / `certificateData` / `knownHostsData`：OpenClaw 在运行时实现到临时文件中的内联内容或 SecretRefs

**SSH 认证优先级：**

- `identityData` 优先于 `identityFile`
- `certificateData` 优先于 `certificateFile`
- `knownHostsData` 优先于 `knownHostsFile`
- SecretRef 支持的 `*Data` 值在沙盒会话开始前从活跃的秘密运行时快照中解析

**SSH 后端行为：**

- 在创建或重新创建后一次性初始化远程工作区
- 然后保持远程 SSH 工作区规范
- 通过 SSH 路由 `exec`、文件工具和媒体路径
- 不自动将远程更改同步回主机
- 不支持沙盒浏览器容器

**工作区访问：**

- `none`：`~/.openclaw/sandboxes` 下的每范围沙盒工作区
- `ro`：沙盒工作区在 `/workspace`，代理工作区以只读方式挂载在 `/agent`
- `rw`：代理工作区以读/写方式挂载在 `/workspace`

**范围：**

- `session`：每会话容器 + 工作区
- `agent`：每代理一个容器 + 工作区（默认）
- `shared`：共享容器和工作区（无跨会话隔离）

**OpenShell 插件配置：**

```json5
{
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          mode: "mirror", // mirror | remote
          from: "openclaw",
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
          gateway: "lab", // 可选
          gatewayEndpoint: "https://lab.example", // 可选
          policy: "strict", // 可选的 OpenShell 策略 id
          providers: ["openai"], // 可选
          autoProviders: true,
          timeoutSeconds: 120,
        },
      },
    },
  },
}
```

**OpenShell 模式：**

- `mirror`：exec 前从本地初始化远程，exec 后同步回来；本地工作区保持规范
- `remote`：沙盒创建时一次性初始化远程，然后保持远程工作区规范

在 `remote` 模式下，在初始化步骤后，在 OpenClaw 外部进行的主机本地编辑不会自动同步到沙盒中。传输是 SSH 到 OpenShell 沙盒，但插件拥有沙盒生命周期和可选的镜像同步。

**`setupCommand`** 在容器创建后运行一次（通过 `sh -lc`）。需要网络出口、可写根目录、root 用户。

**容器默认 `network: "none"`** — 如果代理需要出站访问，设置为 `"bridge"`（或自定义桥接网络）。`"host"` 被阻止。`"container:<id>"` 默认被阻止，除非你显式设置 `sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（break-glass）。

**入站附件**存放在活跃工作区的 `media/inbound/*` 中。

**`docker.binds`** 挂载额外的主机目录；全局和每代理绑定被合并。

**沙盒浏览器**（`sandbox.browser.enabled`）：容器中的 Chromium + CDP。noVNC URL 注入系统提示。不需要 `openclaw.json` 中的 `browser.enabled`。noVNC 观察者访问默认使用 VNC 认证，OpenClaw 发出短期 token URL（而不是在共享 URL 中暴露密码）。

- `allowHostControl: false`（默认）阻止沙盒会话以主机浏览器为目标。
- `network` 默认为 `openclaw-sandbox-browser`（专用桥接网络）。仅当你明确想要全局桥接连接时设置为 `bridge`。
- `cdpSourceRange` 可选地将容器边缘的 CDP 入口限制到 CIDR 范围（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 仅将额外的主机目录挂载到沙盒浏览器容器中。设置时（包括 `[]`），它替换浏览器容器的 `docker.binds`。
- 启动默认值在 `scripts/sandbox-browser-entrypoint.sh` 中定义，针对容器主机进行调整：
  - `--remote-debugging-address=127.0.0.1`
  - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
  - `--user-data-dir=${HOME}/.chrome`
  - `--no-first-run`
  - `--no-default-browser-check`
  - `--disable-3d-apis`
  - `--disable-gpu`
  - `--disable-software-rasterizer`
  - `--disable-dev-shm-usage`
  - `--disable-background-networking`
  - `--disable-features=TranslateUI`
  - `--disable-breakpad`
  - `--disable-crash-reporter`
  - `--renderer-process-limit=2`
  - `--no-zygote`
  - `--metrics-recording-only`
  - `--disable-extensions`（默认启用）
  - `--disable-3d-apis`、`--disable-software-rasterizer` 和 `--disable-gpu` 默认启用，如果 WebGL/3D 使用需要，可以用 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 禁用。
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 如果你的工作流依赖扩展则重新启用扩展。
  - `--renderer-process-limit=2` 可以用 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 更改；设置 `0` 使用 Chromium 的默认进程限制。
  - 加上启用 `noSandbox` 时的 `--no-sandbox`。
  - 默认值是容器镜像基线；使用带有自定义入口点的自定义浏览器镜像来更改容器默认值。

</Accordion>

浏览器沙盒和 `sandbox.docker.binds` 仅限 Docker。

构建镜像（从源代码检出）：

```bash
scripts/sandbox-setup.sh           # 主沙盒镜像
scripts/sandbox-browser-setup.sh   # 可选的浏览器镜像
```

对于没有源代码检出的 npm 安装，请参阅[沙盒 § 镜像和设置](/gateway/sandboxing#images-and-setup)了解内联 `docker build` 命令。

### `agents.list`（每代理覆盖）

使用 `agents.list[].tts` 为代理提供自己的 TTS 提供商、声音、模型、风格或自动 TTS 模式。代理块在全局 `messages.tts` 上深度合并，因此共享凭据可以放在一个地方，而单个代理只覆盖它们需要的声音或提供商字段。活跃代理的覆盖适用于自动语音回复、`/tts audio`、`/tts status` 和 `tts` 代理工具。提供商示例和优先级参见[文字转语音](/tools/tts#per-agent-voice-overrides)。

```json5
{
  agents: {
    list: [
      {
        id: "main",
        default: true,
        name: "Main Agent",
        workspace: "~/.openclaw/workspace",
        agentDir: "~/.openclaw/agents/main/agent",
        model: "anthropic/claude-opus-4-6", // 或 { primary, fallbacks }
        thinkingDefault: "high", // 每代理思考级别覆盖
        reasoningDefault: "on", // 每代理推理可见性覆盖
        fastModeDefault: false, // 每代理快速模式覆盖
        agentRuntime: { id: "auto" },
        params: { cacheRetention: "none" }, // 按键覆盖匹配的 defaults.models params
        tts: {
          providers: {
            elevenlabs: { voiceId: "EXAVITQu4vr4xnSDxMaL" },
          },
        },
        skills: ["docs-search"], // 设置时替换 agents.defaults.skills
        identity: {
          name: "Samantha",
          theme: "helpful sloth",
          emoji: "🦥",
          avatar: "avatars/samantha.png",
        },
        groupChat: { mentionPatterns: ["@openclaw"] },
        sandbox: { mode: "off" },
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
        subagents: { allowAgents: ["*"] },
        tools: {
          profile: "coding",
          allow: ["browser"],
          deny: ["canvas"],
          elevated: { enabled: true },
        },
      },
    ],
  },
}
```

- `id`：稳定的代理 id（必填）。
- `default`：当设置了多个时，第一个获胜（记录警告）。如果没有设置，第一个列表条目是默认值。
- `model`：字符串形式设置严格的每代理主模型且无模型回退；对象形式 `{ primary }` 也是严格的，除非你添加 `fallbacks`。使用 `{ primary, fallbacks: [...] }` 让该代理选择加入回退，或 `{ primary, fallbacks: [] }` 使严格行为明确。只覆盖 `primary` 的 Cron 作业仍然继承默认回退，除非你设置 `fallbacks: []`。
- `params`：每代理流参数，合并到 `agents.defaults.models` 中所选模型条目之上。使用此参数进行代理特定的覆盖，如 `cacheRetention`、`temperature` 或 `maxTokens`，而无需复制整个模型目录。
- `tts`：可选的每代理文字转语音覆盖。块在 `messages.tts` 上深度合并，因此将共享提供商凭据和回退策略保留在 `messages.tts` 中，只在此处设置特定于角色的值，如提供商、声音、模型、风格或自动模式。
- `skills`：可选的每代理技能允许列表。如果省略，代理在设置 `agents.defaults.skills` 时继承它；显式列表替换默认值而不是合并，`[]` 表示无技能。
- `thinkingDefault`：可选的每代理默认思考级别（`off | minimal | low | medium | high | xhigh | adaptive | max`）。在没有设置每消息或会话覆盖时覆盖该代理的 `agents.defaults.thinkingDefault`。选定的 provider/model 配置文件控制哪些值有效；对于 Google Gemini，`adaptive` 保持提供商拥有的动态思考（在 Gemini 3/3.1 上省略 `thinkingLevel`，在 Gemini 2.5 上 `thinkingBudget: -1`）。
- `reasoningDefault`：可选的每代理默认推理可见性（`on | off | stream`）。在没有设置每消息或会话推理覆盖时覆盖该代理的 `agents.defaults.reasoningDefault`。
- `fastModeDefault`：可选的每代理快速模式默认值（`true | false`）。在没有设置每消息或会话快速模式覆盖时应用。
- `agentRuntime`：可选的每代理低级运行时策略覆盖。使用 `{ id: "codex" }` 让一个代理仅 Codex，而其他代理在 `auto` 模式下保留默认 PI 回退。
- `runtime`：可选的每代理运行时描述符。当代理应默认为 ACP 套件会话时，使用 `type: "acp"` 和 `runtime.acp` 默认值（`agent`、`backend`、`mode`、`cwd`）。
- `identity.avatar`：工作区相对路径、`http(s)` URL 或 `data:` URI。
- `identity` 推导默认值：`ackReaction` 来自 `emoji`，`mentionPatterns` 来自 `name`/`emoji`。
- `subagents.allowAgents`：显式 `sessions_spawn.agentId` 目标的代理 id 允许列表（`["*"]` = 任何；默认：仅同一代理）。当允许自我目标的 `agentId` 调用时，包含请求者 id。
- 沙盒继承保护：如果请求者会话是沙盒化的，`sessions_spawn` 拒绝会在非沙盒化状态下运行的目标。
- `subagents.requireAgentId`：当为 true 时，阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式配置文件选择；默认：false）。

---

## 多代理路由

在一个网关内运行多个隔离的代理。参见[多代理](/concepts/multi-agent)。

```json5
{
  agents: {
    list: [
      { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
      { id: "work", workspace: "~/.openclaw/workspace-work" },
    ],
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
  ],
}
```

### 绑定匹配字段

- `type`（可选）：正常路由使用 `route`（缺少 type 默认为 route），持久 ACP 对话绑定使用 `acp`。
- `match.channel`（必填）
- `match.accountId`（可选；`*` = 任何账户；省略 = 默认账户）
- `match.peer`（可选；`{ kind: direct|group|channel, id }`）
- `match.guildId` / `match.teamId`（可选；渠道特定）
- `acp`（可选；仅用于 `type: "acp"`）：`{ mode, label, cwd, backend }`

**确定性匹配顺序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId`（精确，无 peer/guild/team）
5. `match.accountId: "*"`（渠道范围）
6. 默认代理

在每个层级内，第一个匹配的 `bindings` 条目获胜。

对于 `type: "acp"` 条目，OpenClaw 通过精确的对话身份（`match.channel` + 账户 + `match.peer.id`）解析，不使用上面的路由绑定层级顺序。

### 每代理访问配置文件

<Accordion title="完全访问（无沙盒）">

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="只读工具 + 工作区">

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "ro" },
        tools: {
          allow: [
            "read",
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
          ],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="无文件系统访问（仅消息）">

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "none" },
        tools: {
          allow: [
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
            "whatsapp",
            "telegram",
            "slack",
            "discord",
            "gateway",
          ],
          deny: [
            "read",
            "write",
            "edit",
            "apply_patch",
            "exec",
            "process",
            "browser",
            "canvas",
            "nodes",
            "cron",
            "gateway",
            "image",
          ],
        },
      },
    ],
  },
}
```

</Accordion>

优先级详情参见[多代理沙盒和工具](/tools/multi-agent-sandbox-tools)。

---

## 会话

```json5
{
  session: {
    scope: "per-sender",
    dmScope: "main", // main | per-peer | per-channel-peer | per-account-channel-peer
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      mode: "daily", // daily | idle
      atHour: 4,
      idleMinutes: 60,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      direct: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.openclaw/agents/{agentId}/sessions/sessions.json",
    maintenance: {
      mode: "warn", // warn | enforce
      pruneAfter: "30d",
      maxEntries: 500,
      resetArchiveRetention: "30d", // 持续时间或 false
      maxDiskBytes: "500mb", // 可选的硬预算
      highWaterBytes: "400mb", // 可选的清理目标
    },
    threadBindings: {
      enabled: true,
      idleHours: 24, // 默认不活跃自动取消关注（小时）（`0` 禁用）
      maxAgeHours: 0, // 默认硬最大年龄（小时）（`0` 禁用）
    },
    mainKey: "main", // 旧版（运行时始终使用 "main"）
    agentToAgent: { maxPingPongTurns: 5 },
    sendPolicy: {
      rules: [{ action: "deny", match: { channel: "discord", chatType: "group" } }],
      default: "allow",
    },
  },
}
```

<Accordion title="会话字段详情">

- **`scope`**：群聊上下文的基础会话分组策略。
  - `per-sender`（默认）：每个发送者在渠道上下文中获得隔离会话。
  - `global`：渠道上下文中的所有参与者共享单个会话（仅在打算共享上下文时使用）。
- **`dmScope`**：如何对 DM 进行分组。
  - `main`：所有 DM 共享主会话。
  - `per-peer`：按跨渠道的发送者 id 隔离。
  - `per-channel-peer`：按渠道 + 发送者隔离（推荐用于多用户收件箱）。
  - `per-account-channel-peer`：按账户 + 渠道 + 发送者隔离（推荐用于多账户）。
- **`identityLinks`**：将规范 id 映射到提供商前缀的 peer 以进行跨渠道会话共享。停靠命令（如 `/dock_discord`）使用相同的映射将活跃会话的回复路由切换到另一个关联的渠道 peer；参见[渠道停靠](/concepts/channel-docking)。
- **`reset`**：主要重置策略。`daily` 在本地时间 `atHour` 重置；`idle` 在 `idleMinutes` 后重置。当两者都配置时，先到期的获胜。每日重置新鲜度使用会话行的 `sessionStartedAt`；空闲重置新鲜度使用 `lastInteractionAt`。后台/系统事件写入（如心跳、cron 唤醒、exec 通知和网关记账）可以更新 `updatedAt`，但它们不会保持每日/空闲会话新鲜。
- **`resetByType`**：每类型覆盖（`direct`、`group`、`thread`）。旧版 `dm` 作为 `direct` 的别名被接受。
- **`mainKey`**：旧版字段。运行时始终对主直接聊天桶使用 `"main"`。
- **`agentToAgent.maxPingPongTurns`**：代理间交换期间代理之间的最大回复对话数（整数，范围：`0`-`5`）。`0` 禁用乒乓链式调用。
- **`sendPolicy`**：按 `channel`、`chatType`（`direct|group|channel`，带旧版 `dm` 别名）、`keyPrefix` 或 `rawKeyPrefix` 匹配。第一个拒绝获胜。
- **`maintenance`**：会话存储清理 + 保留控制。
  - `mode`：`warn` 仅发出警告；`enforce` 应用清理。
  - `pruneAfter`：过时条目的年龄截止值（默认 `30d`）。
  - `maxEntries`：`sessions.json` 中的最大条目数（默认 `500`）。运行时写入批量清理，生产规模上限有小高水位缓冲区；`openclaw sessions cleanup --enforce` 立即应用上限。
  - `rotateBytes`：已弃用并被忽略；`openclaw doctor --fix` 从旧配置中删除它。
  - `resetArchiveRetention`：`*.reset.<timestamp>` 脚本存档的保留期。默认为 `pruneAfter`；设置 `false` 禁用。
  - `maxDiskBytes`：可选的会话目录磁盘预算。在 `warn` 模式下记录警告；在 `enforce` 模式下首先删除最旧的人工制品/会话。
  - `highWaterBytes`：预算清理后的可选目标。默认为 `maxDiskBytes` 的 `80%`。
- **`threadBindings`**：线程绑定会话功能的全局默认值。
  - `enabled`：主默认开关（提供商可以覆盖；Discord 使用 `channels.discord.threadBindings.enabled`）
  - `idleHours`：默认不活跃自动取消关注（小时）（`0` 禁用；提供商可以覆盖）
  - `maxAgeHours`：默认硬最大年龄（小时）（`0` 禁用；提供商可以覆盖）
  - `spawnSessions`：从 `sessions_spawn` 和 ACP 线程生成创建线程绑定工作会话的默认门控。当线程绑定启用时默认为 `true`；提供商/账户可以覆盖。
  - `defaultSpawnContext`：线程绑定生成的默认原生子代理上下文（`"fork"` 或 `"isolated"`）。默认为 `"fork"`。

</Accordion>

---

## 消息

```json5
{
  messages: {
    responsePrefix: "🦞", // 或 "auto"
    ackReaction: "👀",
    ackReactionScope: "group-mentions", // group-mentions | group-all | direct | all
    removeAckAfterReply: false,
    queue: {
      mode: "steer", // steer | queue（旧版一次一个）| followup | collect | steer-backlog | steer+backlog | interrupt
      debounceMs: 500,
      cap: 20,
      drop: "summarize", // old | new | summarize
      byChannel: {
        whatsapp: "steer",
        telegram: "steer",
      },
    },
    inbound: {
      debounceMs: 2000, // 0 禁用
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
      },
    },
  },
}
```

### 响应前缀

每渠道/账户覆盖：`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。

解析（最具体的获胜）：账户 → 渠道 → 全局。`""` 禁用并停止级联。`"auto"` 推导 `[{identity.name}]`。

**模板变量：**

| 变量              | 描述           | 示例                        |
| ----------------- | -------------- | --------------------------- |
| `{model}`         | 简短模型名称   | `claude-opus-4-6`           |
| `{modelFull}`     | 完整模型标识符 | `anthropic/claude-opus-4-6` |
| `{provider}`      | 提供商名称     | `anthropic`                 |
| `{thinkingLevel}` | 当前思考级别   | `high`、`low`、`off`        |
| `{identity.name}` | 代理身份名称   | （与 `"auto"` 相同）        |

变量不区分大小写。`{think}` 是 `{thinkingLevel}` 的别名。

### 确认反应

- 默认为活跃代理的 `identity.emoji`，否则为 `"👀"`。设置 `""` 禁用。
- 每渠道覆盖：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析顺序：账户 → 渠道 → `messages.ackReaction` → 身份回退。
- 范围：`group-mentions`（默认）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：在支持反应的渠道（如 Slack、Discord、Telegram、WhatsApp 和 BlueBubbles）回复后删除确认。
- `messages.statusReactions.enabled`：在 Slack、Discord 和 Telegram 上启用生命周期状态反应。在 Slack 和 Discord 上，未设置时在确认反应活跃时保持状态反应启用。在 Telegram 上，显式设置为 `true` 以启用生命周期状态反应。

### 入站防抖

将来自同一发送者的快速纯文本消息批处理为单个代理对话。媒体/附件立即刷新。控制命令绕过防抖。

### TTS（文字转语音）

```json5
{
  messages: {
    tts: {
      auto: "always", // off | always | inbound | tagged
      mode: "final", // final | all
      provider: "elevenlabs",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: { enabled: true },
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.openclaw/settings/tts.json",
      providers: {
        elevenlabs: {
          apiKey: "elevenlabs_api_key",
          baseUrl: "https://api.elevenlabs.io",
          voiceId: "voice_id",
          modelId: "eleven_multilingual_v2",
          seed: 42,
          applyTextNormalization: "auto",
          languageCode: "en",
          voiceSettings: {
            stability: 0.5,
            similarityBoost: 0.75,
            style: 0.0,
            useSpeakerBoost: true,
            speed: 1.0,
          },
        },
        microsoft: {
          voice: "en-US-AvaMultilingualNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        },
        openai: {
          apiKey: "openai_api_key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini-tts",
          voice: "alloy",
        },
      },
    },
  },
}
```

- `auto` 控制默认的自动 TTS 模式：`off`、`always`、`inbound` 或 `tagged`。`/tts on|off` 可以覆盖本地偏好，`/tts status` 显示有效状态。
- `summaryModel` 覆盖 `agents.defaults.model.primary` 用于自动摘要。
- `modelOverrides` 默认启用；`modelOverrides.allowProvider` 默认为 `false`（选择加入）。
- API 密钥回退到 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- 捆绑的语音提供商是插件拥有的。如果设置了 `plugins.allow`，包含你想使用的每个 TTS 提供商插件，例如 Edge TTS 使用 `microsoft`。旧版 `edge` 提供商 id 作为 `microsoft` 的别名被接受。
- `providers.openai.baseUrl` 覆盖 OpenAI TTS 端点。解析顺序是配置，然后 `OPENAI_TTS_BASE_URL`，然后 `https://api.openai.com/v1`。
- 当 `providers.openai.baseUrl` 指向非 OpenAI 端点时，OpenClaw 将其视为 OpenAI 兼容的 TTS 服务器并放宽模型/声音验证。

---

## Talk

Talk 模式的默认值（macOS/iOS/Android）。

```json5
{
  talk: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "elevenlabs_voice_id",
        voiceAliases: {
          Clawd: "EXAVITQu4vr4xnSDxMaL",
          Roger: "CwhRBWXzGAHq8TQ4Fs17",
        },
        modelId: "eleven_v3",
        outputFormat: "mp3_44100_128",
        apiKey: "elevenlabs_api_key",
      },
      mlx: {
        modelId: "mlx-community/Soprano-80M-bf16",
      },
      system: {},
    },
    speechLocale: "ru-RU",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

- `talk.provider` 在配置了多个 Talk 提供商时，必须匹配 `talk.providers` 中的键。
- 旧版扁平 Talk 键（`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`）仅用于兼容性，自动迁移到 `talk.providers.<provider>` 中。
- 声音 ID 回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `providers.*.apiKey` 接受纯文本字符串或 SecretRef 对象。
- `ELEVENLABS_API_KEY` 回退仅在没有配置 Talk API 密钥时适用。
- `providers.*.voiceAliases` 让 Talk 指令使用友好名称。
- `providers.mlx.modelId` 选择 macOS 本地 MLX 助手使用的 Hugging Face 仓库。如果省略，macOS 使用 `mlx-community/Soprano-80M-bf16`。
- macOS MLX 播放通过捆绑的 `openclaw-mlx-tts` 助手（如果存在）或 `PATH` 上的可执行文件运行；`OPENCLAW_MLX_TTS_BIN` 覆盖开发环境的助手路径。
- `speechLocale` 设置 iOS/macOS Talk 语音识别使用的 BCP 47 语言 id。不设置则使用设备默认值。
- `silenceTimeoutMs` 控制 Talk 模式在用户沉默后发送脚本前等待的时间。不设置则保持平台默认暂停窗口（macOS 和 Android 上 `700 ms`，iOS 上 `900 ms`）。

---

## 相关链接

- [配置参考](/gateway/configuration-reference) — 所有其他配置键
- [配置](/gateway/configuration) — 常见任务和快速设置
- [配置示例](/gateway/configuration-examples)
