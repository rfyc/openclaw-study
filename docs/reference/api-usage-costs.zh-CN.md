---
summary: "审计哪些功能会产生费用、使用哪些密钥以及如何查看使用情况"
read_when:
  - 您想了解哪些功能可能调用付费 API 时
  - 您需要审计密钥、费用和使用可见性时
  - 您在解释 /status 或 /usage 费用报告时
title: "API 使用与费用"
---

# API 使用与费用

本文列出了**可能调用 API 密钥的功能**及其费用显示位置。重点介绍可能产生提供商使用量或付费 API 调用的 OpenClaw 功能。

## 费用显示位置（聊天 + CLI）

**每会话费用快照**

- `/status` 显示当前会话模型、上下文使用情况和最后一次响应的 token 数。
- 如果模型使用 **API 密钥认证**，`/status` 还会显示最后一次回复的**估算费用**。
- 如果实时会话元数据不足，`/status` 可以从最新的记录使用条目中恢复 token/缓存计数器和活跃运行时模型标签。现有的非零实时值仍优先使用，当存储的总计缺失或更小时，提示大小的记录总计可以胜出。

**每条消息费用页脚**

- `/usage full` 在每条回复后附加使用页脚，包括**估算费用**（仅 API 密钥）。
- `/usage tokens` 仅显示 token；订阅式 OAuth/token 和 CLI 流程隐藏美元费用。
- Gemini CLI 说明：当 CLI 返回 JSON 输出时，OpenClaw 从 `stats` 读取使用情况，将 `stats.cached` 规范化为 `cacheRead`，并在需要时从 `stats.input_tokens - stats.cached` 推导输入 token 数。

Anthropic 说明：Anthropic 员工告知我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此 OpenClaw 将 Claude CLI 重用和 `claude -p` 使用视为此集成的受认可方式，除非 Anthropic 发布新政策。Anthropic 目前仍未提供 OpenClaw 可在 `/usage full` 中显示的每条消息美元估算。

**CLI 使用窗口（提供商配额）**

- `openclaw status --usage` 和 `openclaw channels list` 显示提供商**使用窗口**（配额快照，而非每条消息费用）。
- 人类可读输出规范化为各提供商的 `X% left`。
- 当前支持使用窗口的提供商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI Codex、MiniMax、小米和 z.ai。
- MiniMax 说明：其原始 `usage_percent` / `usagePercent` 字段表示剩余配额，因此 OpenClaw 在显示前将其反转。存在时，基于计数的字段仍优先。如果提供商返回 `model_remains`，OpenClaw 优先选择聊天模型条目，在需要时从时间戳推导窗口标签，并在计划标签中包含模型名称。
- 这些配额窗口的使用认证来自提供商特定的钩子（如果可用）；否则 OpenClaw 回退到从认证配置文件、环境变量或配置中匹配 OAuth/API 密钥凭据。

详情和示例请参阅 [Token 使用与费用](/reference/token-use)。

## 密钥的发现方式

OpenClaw 可以从以下来源获取凭据：

- **认证配置文件**（每个智能助手，存储在 `auth-profiles.json` 中）。
- **环境变量**（例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`）。
- **配置**（`models.providers.*.apiKey`、`plugins.entries.*.config.webSearch.apiKey`、`plugins.entries.firecrawl.config.webFetch.apiKey`、`memorySearch.*`、`talk.providers.*.apiKey`）。
- **技能**（`skills.entries.<name>.apiKey`），可将密钥导出到技能进程环境。

## 可能消耗密钥的功能

### 1) 核心模型响应（聊天 + 工具）

每次回复或工具调用都使用**当前模型提供商**（OpenAI、Anthropic 等）。这是使用量和费用的主要来源。

这也包括仍在 OpenClaw 本地 UI 之外计费的订阅式托管提供商，例如 **OpenAI Codex**、**阿里云模型工作室编程计划**、**MiniMax 编程计划**、**Z.AI / GLM 编程计划**，以及启用了**额外使用**的 Anthropic OpenClaw Claude 登录路径。

定价配置请参阅 [模型](/providers/models)，显示方式请参阅 [Token 使用与费用](/reference/token-use)。

### 2) 媒体理解（音频/图像/视频）

入站媒体可以在回复运行前进行摘要/转录。这使用模型/提供商 API。

- 音频：OpenAI / Groq / Deepgram / DeepInfra / Google / Mistral。
- 图像：OpenAI / OpenRouter / Anthropic / DeepInfra / Google / MiniMax / Moonshot / Qwen / Z.AI。
- 视频：Google / Qwen / Moonshot。

请参阅 [媒体理解](/nodes/media-understanding)。

### 3) 图像和视频生成

共享生成功能也可能消耗提供商密钥：

- 图像生成：OpenAI / Google / DeepInfra / fal / MiniMax
- 视频生成：DeepInfra / Qwen

当 `agents.defaults.imageGenerationModel` 未设置时，图像生成可以推断认证支持的提供商默认值。视频生成目前需要明确的 `agents.defaults.videoGenerationModel`，例如 `qwen/wan2.6-t2v`。

请参阅 [图像生成](/tools/image-generation)、[Qwen Cloud](/providers/qwen) 和 [模型](/concepts/models)。

### 4) 记忆嵌入 + 语义搜索

为远程提供商配置语义记忆搜索时使用**嵌入 API**：

- `memorySearch.provider = "openai"` → OpenAI 嵌入
- `memorySearch.provider = "gemini"` → Gemini 嵌入
- `memorySearch.provider = "voyage"` → Voyage 嵌入
- `memorySearch.provider = "mistral"` → Mistral 嵌入
- `memorySearch.provider = "deepinfra"` → DeepInfra 嵌入
- `memorySearch.provider = "lmstudio"` → LM Studio 嵌入（本地/自托管）
- `memorySearch.provider = "ollama"` → Ollama 嵌入（本地/自托管；通常无托管 API 计费）
- 可选回退到远程提供商（当本地嵌入失败时）

可使用 `memorySearch.provider = "local"` 保持本地化（无 API 使用）。

请参阅 [记忆](/concepts/memory)。

### 5) 网络搜索工具

`web_search` 可能根据您的提供商产生使用费用：

- **Brave Search API**：`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
- **Exa**：`EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey`
- **Firecrawl**：`FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
- **Gemini（Google 搜索）**：`GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**：`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi（Moonshot）**：`KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
- **MiniMax 搜索**：`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、`MINIMAX_API_KEY` 或 `plugins.entries.minimax.config.webSearch.apiKey`
- **Ollama 网络搜索**：对可访问的已登录本地 Ollama 主机免费；直接 `https://ollama.com` 搜索使用 `OLLAMA_API_KEY`，受认证保护的主机可重用普通 Ollama 提供商不记名认证
- **Perplexity Search API**：`PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
- **Tavily**：`TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`
- **DuckDuckGo**：无需密钥的回退（无 API 计费，但非官方且基于 HTML）
- **SearXNG**：`SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`（无密钥/自托管；无托管 API 计费）

旧版 `tools.web.search.*` 提供商路径仍通过临时兼容性垫片加载，但不再是推荐的配置界面。

**Brave Search 免费积分：** 每个 Brave 计划每月包含 \$5 的可续期免费积分。搜索计划每 1,000 次请求收费 \$5，因此该积分每月可免费覆盖 1,000 次请求。在 Brave 控制台中设置使用限额以避免意外费用。

请参阅 [网络工具](/tools/web)。

### 5) 网络抓取工具（Firecrawl）

当存在 API 密钥时，`web_fetch` 可以调用 **Firecrawl**：

- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webFetch.apiKey`

如果未配置 Firecrawl，该工具将回退到直接抓取加上捆绑的 `web-readability` 插件（无付费 API）。禁用 `plugins.entries.web-readability.enabled` 可跳过本地 Readability 提取。

请参阅 [网络工具](/tools/web)。

### 6) 提供商使用快照（状态/健康）

某些状态命令调用**提供商使用端点**以显示配额窗口或认证健康状态。这些通常是低频调用，但仍会访问提供商 API：

- `openclaw status --usage`
- `openclaw models status --json`

请参阅 [模型 CLI](/cli/models)。

### 7) 压缩保护汇总

压缩保护可以使用**当前模型**汇总会话历史，这会在运行时调用提供商 API。

请参阅 [会话管理 + 压缩](/reference/session-management-compaction)。

### 8) 模型扫描/探测

`openclaw models scan` 可以探测 OpenRouter 模型，启用探测时使用 `OPENROUTER_API_KEY`。

请参阅 [模型 CLI](/cli/models)。

### 9) 语音对话（Talk）

配置了 **ElevenLabs** 时，语音对话模式可以调用它：

- `ELEVENLABS_API_KEY` 或 `talk.providers.elevenlabs.apiKey`

请参阅 [语音对话模式](/nodes/talk)。

### 10) 技能（第三方 API）

技能可以在 `skills.entries.<name>.apiKey` 中存储 `apiKey`。如果技能将该密钥用于外部 API，则可能根据技能的提供商产生费用。

请参阅 [技能](/tools/skills)。

## 相关链接

- [Token 使用与费用](/reference/token-use)
- [提示词缓存](/reference/prompt-caching)
- [使用量跟踪](/concepts/usage-tracking)
