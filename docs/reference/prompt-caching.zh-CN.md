---
summary: "提示词缓存旋钮、合并顺序、提供商行为和调优模式"
title: "提示词缓存"
read_when:
  - 您想通过缓存保留来降低提示词 token 费用时
  - 您需要多智能助手设置中的每个智能助手的缓存行为时
  - 您正在一起调整心跳和缓存 TTL 裁剪时
---

提示词缓存意味着模型提供商可以在多轮之间重用未更改的提示词前缀（通常是系统/开发者指令和其他稳定上下文），而不是每次都重新处理。OpenClaw 将提供商使用量规范化为 `cacheRead` 和 `cacheWrite`（当上游 API 直接公开这些计数器时）。

当实时会话快照缺少这些计数器时，状态界面还可以从最近的记录使用日志中恢复缓存计数器，因此 `/status` 可以在部分会话元数据丢失后继续显示缓存行。现有的非零实时缓存值仍优先于记录回退值。

为什么这很重要：降低 token 费用、更快的响应和更可预测的长期会话性能。如果没有缓存，即使大多数输入没有更改，重复的提示词每次也要支付完整的提示词费用。

以下部分涵盖影响提示词重用和 token 费用的每个缓存相关配置项。

提供商参考：

- Anthropic 提示词缓存：[https://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- OpenAI 提示词缓存：[https://developers.openai.com/api/docs/guides/prompt-caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- OpenAI API 标头和请求 ID：[https://developers.openai.com/api/reference/overview](https://developers.openai.com/api/reference/overview)
- Anthropic 请求 ID 和错误：[https://platform.claude.com/docs/en/api/errors](https://platform.claude.com/docs/en/api/errors)

## 主要配置项

### `cacheRetention`（全局默认、模型和每智能助手）

为所有模型设置全局默认的缓存保留：

```yaml
agents:
  defaults:
    params:
      cacheRetention: "long" # none | short | long
```

按模型覆盖：

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # none | short | long
```

每个智能助手的覆盖：

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

配置合并顺序：

1. `agents.defaults.params`（全局默认——适用于所有模型）
2. `agents.defaults.models["provider/model"].params`（每个模型的覆盖）
3. `agents.list[].params`（匹配的智能助手 id；按键覆盖）

### `contextPruning.mode: "cache-ttl"`

在缓存 TTL 窗口后裁剪旧的工具结果上下文，以便空闲后的请求不会重新缓存过大的历史记录。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

完整行为请参阅[会话裁剪](/concepts/session-pruning)。

### 心跳保温

心跳可以保持缓存窗口温暖，并在空闲间隙后减少重复的缓存写入。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

`agents.list[].heartbeat` 支持每个智能助手的心跳。

## 提供商行为

### Anthropic（直接 API）

- 支持 `cacheRetention`。
- 对于 Anthropic API 密钥认证配置文件，当未设置时，OpenClaw 为 Anthropic 模型引用播种 `cacheRetention: "short"`。
- Anthropic 原生消息响应同时公开 `cache_read_input_tokens` 和 `cache_creation_input_tokens`，因此 OpenClaw 可以同时显示 `cacheRead` 和 `cacheWrite`。
- 对于原生 Anthropic 请求，`cacheRetention: "short"` 映射到默认的 5 分钟临时缓存，而 `cacheRetention: "long"` 仅在直接 `api.anthropic.com` 主机上升级到 1 小时 TTL。

### OpenAI（直接 API）

- 在支持的近期模型上，提示词缓存是自动的。OpenClaw 不需要注入块级缓存标记。
- OpenClaw 使用 `prompt_cache_key` 在轮次之间保持缓存路由稳定，并仅在直接 OpenAI 主机上选择 `cacheRetention: "long"` 时使用 `prompt_cache_retention: "24h"`。
- 仅当其模型配置明确设置 `compat.supportsPromptCacheKey: true` 时，OpenAI 兼容的补全提供商才会收到 `prompt_cache_key`；`cacheRetention: "none"` 仍然会抑制它。
- OpenAI 响应通过 `usage.prompt_tokens_details.cached_tokens`（或 Responses API 事件上的 `input_tokens_details.cached_tokens`）公开缓存的提示词 token。OpenClaw 将其映射到 `cacheRead`。
- OpenAI 不公开单独的缓存写入 token 计数器，因此即使提供商正在预热缓存，OpenAI 路径上的 `cacheWrite` 也保持为 `0`。
- OpenAI 返回有用的跟踪和速率限制标头，如 `x-request-id`、`openai-processing-ms` 和 `x-ratelimit-*`，但缓存命中核算应来自使用负载，而不是来自标头。
- 实际上，OpenAI 的行为通常更像初始前缀缓存而非 Anthropic 风格的移动完整历史重用。在当前的实时探测中，稳定的长前缀文本轮次可以达到接近 `4864` 缓存 token 的平台，而工具密集型或 MCP 风格的记录即使在精确重复的情况下也通常达到接近 `4608` 缓存 token 的平台。

### Anthropic Vertex

- Vertex AI 上的 Anthropic 模型（`anthropic-vertex/*`）与直接 Anthropic 一样支持 `cacheRetention`。
- `cacheRetention: "long"` 映射到 Vertex AI 端点上真正的 1 小时提示词缓存 TTL。
- `anthropic-vertex` 的默认缓存保留与直接 Anthropic 默认值匹配。
- Vertex 请求通过边界感知的缓存整形进行路由，以保持缓存重用与提供商实际接收的内容对齐。

### Amazon Bedrock

- Anthropic Claude 模型引用（`amazon-bedrock/*anthropic.claude*`）支持明确的 `cacheRetention` 透传。
- 非 Anthropic Bedrock 模型在运行时被强制设置为 `cacheRetention: "none"`。

### OpenRouter 模型

对于 `openrouter/anthropic/*` 模型引用，OpenClaw 仅在请求仍然针对已验证的 OpenRouter 路由（`openrouter` 在其默认端点，或解析为 `openrouter.ai` 的任何提供商/基础 URL）时，才在系统/开发者提示词块上注入 Anthropic `cache_control` 以改善提示词缓存重用。

对于 `openrouter/deepseek/*`、`openrouter/moonshot*/*` 和 `openrouter/zai/*` 模型引用，允许 `contextPruning.mode: "cache-ttl"`，因为 OpenRouter 自动处理提供商侧提示词缓存。OpenClaw 不会向这些请求注入 Anthropic `cache_control` 标记。

DeepSeek 缓存构建是尽力而为的，可能需要几秒钟。立即的后续请求可能仍然显示 `cached_tokens: 0`；在短暂延迟后使用重复的相同前缀请求进行验证，并使用 `usage.prompt_tokens_details.cached_tokens` 作为缓存命中信号。

如果您将模型重新指向任意的 OpenAI 兼容代理 URL，OpenClaw 将停止注入那些 OpenRouter 特定的 Anthropic 缓存标记。

### 其他提供商

如果提供商不支持此缓存模式，`cacheRetention` 无效。

### Google Gemini 直接 API

- 直接 Gemini 传输（`api: "google-generative-ai"`）通过上游 `cachedContentTokenCount` 报告缓存命中；OpenClaw 将其映射到 `cacheRead`。
- 当在直接 Gemini 模型上设置 `cacheRetention` 时，OpenClaw 会自动为 Google AI Studio 运行上的系统提示词创建、重用和刷新 `cachedContents` 资源。这意味着您不再需要手动预创建缓存内容句柄。
- 您仍然可以通过配置模型上的 `params.cachedContent`（或旧版 `params.cached_content`）传递预先存在的 Gemini 缓存内容句柄。
- 这与 Anthropic/OpenAI 提示词前缀缓存不同。对于 Gemini，OpenClaw 管理提供商原生的 `cachedContents` 资源，而不是将缓存标记注入请求中。

### Gemini CLI JSON 使用

- Gemini CLI JSON 输出还可以通过 `stats.cached` 呈现缓存命中；OpenClaw 将其映射到 `cacheRead`。
- 如果 CLI 省略了直接的 `stats.input` 值，OpenClaw 从 `stats.input_tokens - stats.cached` 推导输入 token 数。
- 这只是使用规范化。它不意味着 OpenClaw 正在为 Gemini CLI 创建 Anthropic/OpenAI 风格的提示词缓存标记。

## 系统提示词缓存边界

OpenClaw 将系统提示词分为**稳定前缀**和**易变后缀**，通过内部缓存前缀边界分隔。边界上方的内容（工具定义、技能元数据、工作区文件和其他相对静态的上下文）被排序以在轮次之间保持字节相同。边界下方的内容（例如 `HEARTBEAT.md`、运行时时间戳和其他每轮元数据）被允许更改，而不会使缓存的前缀失效。

关键设计选择：

- 稳定的工作区项目上下文文件在 `HEARTBEAT.md` 之前排序，以便心跳变动不会破坏稳定前缀。
- 边界应用于 Anthropic 系列、OpenAI 系列、Google 和 CLI 传输整形，因此所有支持的提供商都受益于相同的前缀稳定性。
- Codex Responses 和 Anthropic Vertex 请求通过边界感知的缓存整形路由，以保持缓存重用与提供商实际接收的内容对齐。
- 系统提示词指纹被规范化（空白、行尾、钩子添加的上下文、运行时功能排序），以便语义上未更改的提示词在轮次之间共享 KV/缓存。

如果您在配置或工作区更改后看到意外的 `cacheWrite` 峰值，检查更改是否落在缓存边界的上方或下方。将易变内容移至边界下方（或稳定它）通常可以解决此问题。

## OpenClaw 缓存稳定性防护

OpenClaw 还使几个对缓存敏感的负载形状在请求到达提供商之前保持确定性：

- Bundle MCP 工具目录在工具注册之前被确定性地排序，以便 `listTools()` 顺序的更改不会搅动工具块并破坏提示词缓存前缀。
- 具有持久化图像块的旧版会话保持**最近 3 个已完成轮次**完整；旧的已处理图像块可能被替换为标记，以便图像密集型后续不会继续重新发送大型过时负载。

## 调优模式

### 混合流量（推荐默认）

在主智能助手上保持长期基线，对突发通知智能助手禁用缓存：

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m"
    - id: "alerts"
      params:
        cacheRetention: "none"
```

### 费用优先基线

- 设置基线 `cacheRetention: "short"`。
- 启用 `contextPruning.mode: "cache-ttl"`。
- 仅对受益于温暖缓存的智能助手将心跳保持在 TTL 以下。

## 缓存诊断

OpenClaw 为嵌入式智能助手运行公开专用的缓存跟踪诊断。

对于正常的面向用户的诊断，当实时会话条目没有这些计数器时，`/status` 和其他使用摘要可以使用最新的记录使用条目作为 `cacheRead`/`cacheWrite` 的回退源。

## 实时回归测试

OpenClaw 为重复前缀、工具轮次、图像轮次、MCP 风格工具记录和 Anthropic 无缓存控制保持一个组合的实时缓存回归门控。

- `src/agents/live-cache-regression.live.test.ts`
- `src/agents/live-cache-regression-baseline.ts`

使用以下命令运行窄的实时门控：

```sh
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache
```

基线文件存储最近观察到的实时数字以及测试使用的提供商特定回归底限。运行器还使用每次运行的新会话 ID 和提示词命名空间，以便之前的缓存状态不会污染当前的回归样本。

这些测试有意不在提供商之间使用相同的成功标准。

### Anthropic 实时期望

- 期望通过 `cacheWrite` 的明确预热写入。
- 期望在重复轮次上接近完整历史重用，因为 Anthropic 缓存控制在对话中推进缓存断点。
- 当前实时断言仍然对稳定、工具和图像路径使用高命中率阈值。

### OpenAI 实时期望

- 仅期望 `cacheRead`。`cacheWrite` 保持为 `0`。
- 将重复轮次缓存重用视为提供商特定的平台，而非 Anthropic 风格的移动完整历史重用。
- 当前实时断言对 `gpt-5.4-mini` 上观察到的实时行为使用保守的底限检查：
  - 稳定前缀：`cacheRead >= 4608`，命中率 `>= 0.90`
  - 工具记录：`cacheRead >= 4096`，命中率 `>= 0.85`
  - 图像记录：`cacheRead >= 3840`，命中率 `>= 0.82`
  - MCP 风格记录：`cacheRead >= 4096`，命中率 `>= 0.85`

2026-04-04 的最新组合实时验证结果：

- 稳定前缀：`cacheRead=4864`，命中率 `0.966`
- 工具记录：`cacheRead=4608`，命中率 `0.896`
- 图像记录：`cacheRead=4864`，命中率 `0.954`
- MCP 风格记录：`cacheRead=4608`，命中率 `0.891`

最近本地墙钟时间组合门控约为 `88s`。

为什么断言不同：

- Anthropic 公开明确的缓存断点和移动对话历史重用。
- OpenAI 提示词缓存仍然对精确前缀敏感，但实时 Responses 流量中有效可重用前缀可能比完整提示词更早达到平台。
- 因此，通过单一的跨提供商百分比阈值比较 Anthropic 和 OpenAI 会造成假回归。

### `diagnostics.cacheTrace` 配置

```yaml
diagnostics:
  cacheTrace:
    enabled: true
    filePath: "~/.openclaw/logs/cache-trace.jsonl" # 可选
    includeMessages: false # 默认 true
    includePrompt: false # 默认 true
    includeSystem: false # 默认 true
```

默认值：

- `filePath`：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`
- `includeMessages`：`true`
- `includePrompt`：`true`
- `includeSystem`：`true`

### 环境变量切换（一次性调试）

- `OPENCLAW_CACHE_TRACE=1` 启用缓存跟踪。
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 覆盖输出路径。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切换完整消息负载捕获。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切换提示词文本捕获。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切换系统提示词捕获。

### 需要检查的内容

- 缓存跟踪事件是 JSONL 格式，包含阶段快照，如 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after`。
- 每轮缓存 token 影响通过 `cacheRead` 和 `cacheWrite` 在正常使用界面中可见（例如 `/usage full` 和会话使用摘要）。
- 对于 Anthropic，当缓存处于活跃状态时，期望同时有 `cacheRead` 和 `cacheWrite`。
- 对于 OpenAI，缓存命中时期望 `cacheRead`，`cacheWrite` 保持为 `0`；OpenAI 不发布单独的缓存写入 token 字段。
- 如果需要请求跟踪，请将请求 ID 和速率限制标头与缓存指标分开记录。OpenClaw 当前的缓存跟踪输出专注于提示词/会话形状和规范化的 token 使用，而非原始提供商响应标头。

## 快速故障排查

- 大多数轮次的高 `cacheWrite`：检查易变的系统提示词输入，并验证模型/提供商是否支持您的缓存设置。
- Anthropic 上的高 `cacheWrite`：通常意味着缓存断点落在每次请求都会更改的内容上。
- 低 OpenAI `cacheRead`：验证稳定前缀在最前面，重复前缀至少有 1024 个 token，以及应共享缓存的轮次重用了相同的 `prompt_cache_key`。
- `cacheRetention` 无效：确认模型键与 `agents.defaults.models["provider/model"]` 匹配。
- 带有缓存设置的 Bedrock Nova/Mistral 请求：运行时预期强制为 `none`。

相关文档：

- [Anthropic](/providers/anthropic)
- [Token 使用与费用](/reference/token-use)
- [会话裁剪](/concepts/session-pruning)
- [Gateway 配置参考](/gateway/configuration-reference)

## 相关链接

- [Token 使用与费用](/reference/token-use)
- [API 使用与费用](/reference/api-usage-costs)
