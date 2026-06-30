---
summary: "/think、/fast、/verbose、/trace 和推理可见性的指令语法"
read_when:
  - 调整思考、快速模式或详细指令解析或默认值
title: "思考级别"
---

## 功能

- 任何入站消息体中的内联指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 级别（别名）：`off | minimal | low | medium | high | xhigh | adaptive | max`
  - minimal → "think"
  - low → "think hard"
  - medium → "think harder"
  - high → "ultrathink"（最大预算）
  - xhigh → "ultrathink+"（GPT-5.2+ 和 Codex 模型，以及 Anthropic Claude Opus 4.7 effort）
  - adaptive → 提供商管理的自适应思考（支持 Anthropic/Bedrock 上的 Claude 4.6、Anthropic Claude Opus 4.7 和 Google Gemini 动态思考）
  - max → 提供商最大推理（Anthropic Claude Opus 4.7；Ollama 将此映射到其最高原生 `think` 努力）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 映射到 `xhigh`。
  - `highest` 映射到 `high`。
- 提供商说明：
  - 思考菜单和选择器由提供商配置文件驱动。提供商插件为所选模型声明确切的级别集，包括像二进制 `on` 这样的标签。
  - `adaptive`、`xhigh` 和 `max` 仅对支持它们的提供商/模型配置文件进行广告。不支持级别的输入指令将被拒绝，并显示该模型的有效选项。
  - 现有存储的不支持级别由提供商配置文件排名重新映射。`adaptive` 在非自适应模型上回退到 `medium`，而 `xhigh` 和 `max` 回退到所选模型支持的最大非 off 级别。
  - Anthropic Claude 4.6 模型在没有设置明确思考级别时默认为 `adaptive`。
  - Anthropic Claude Opus 4.7 不默认为自适应思考。其 API effort 默认保持提供商拥有，除非你明确设置思考级别。
  - Anthropic Claude Opus 4.7 将 `/think xhigh` 映射到自适应思考加 `output_config.effort: "xhigh"`，因为 `/think` 是思考指令，`xhigh` 是 Opus 4.7 effort 设置。
  - Anthropic Claude Opus 4.7 也暴露 `/think max`；它映射到相同的提供商拥有的最大努力路径。
  - DeepSeek V4 模型暴露 `/think xhigh|max`；两者都映射到 DeepSeek `reasoning_effort: "max"`，而较低的非 off 级别映射到 `high`。
  - Ollama 思考能力模型暴露 `/think low|medium|high|max`；`max` 映射到原生 `think: "high"` 因为 Ollama 的原生 API 接受 `low`、`medium` 和 `high` 努力字符串。
  - OpenAI GPT 模型通过模型特定的 Responses API effort 支持映射 `/think`。`/think off` 仅当目标模型支持时发送 `reasoning.effort: "none"`；否则 OpenClaw 省略禁用的推理载荷而非发送不支持的值。
  - 自定义 OpenAI 兼容目录条目可以通过将 `models.providers.<provider>.models[].compat.supportedReasoningEfforts` 设置为包含 `"xhigh"` 来选择加入 `/think xhigh`。这使用与出站 OpenAI 推理 effort 载荷映射相同的兼容元数据，因此菜单、会话验证、代理 CLI 和 `llm-task` 与传输行为一致。
  - 过时配置的 OpenRouter Hunter Alpha 引用跳过代理推理注入，因为该已停用路由可能通过推理字段返回最终答案文本。
  - Google Gemini 将 `/think adaptive` 映射到 Gemini 的提供商拥有的动态思考。Gemini 3 请求省略固定的 `thinkingLevel`，而 Gemini 2.5 请求发送 `thinkingBudget: -1`；固定级别仍然映射到该模型系列最接近的 Gemini `thinkingLevel` 或预算。
  - MiniMax（`minimax/*`）在 Anthropic 兼容的流式路径上默认为 `thinking: { type: "disabled" }`，除非你在模型参数或请求参数中明确设置思考。这避免了 MiniMax 非原生 Anthropic 流格式中泄漏的 `reasoning_content` 增量。
  - Z.AI（`zai/*`）仅支持二进制思考（`on`/`off`）。任何非 `off` 级别都被视为 `on`（映射到 `low`）。
  - Moonshot（`moonshot/*`）将 `/think off` 映射到 `thinking: { type: "disabled" }`，将任何非 `off` 级别映射到 `thinking: { type: "enabled" }`。启用思考时，Moonshot 只接受 `tool_choice` `auto|none`；OpenClaw 将不兼容的值归一化为 `auto`。

## 解析顺序

1. 消息上的内联指令（仅适用于该消息）。
2. 会话覆盖（通过发送仅指令消息设置）。
3. 每代理默认值（配置中的 `agents.list[].thinkingDefault`）。
4. 全局默认值（配置中的 `agents.defaults.thinkingDefault`）。
5. 回退：提供商声明的默认值（如果可用）；否则推理能力模型解析为 `medium` 或该模型最近支持的非 `off` 级别，非推理模型保持 `off`。

## 设置会话默认值

- 发送**仅**指令的消息（允许空白），例如 `/think:medium` 或 `/t high`。
- 这对当前会话保持有效（默认按发送者）；由 `/think:off` 或会话空闲重置清除。
- 发送确认回复（`Thinking level set to high.` / `Thinking disabled.`）。如果级别无效（例如 `/thinking big`），命令被拒绝并给出提示，会话状态保持不变。
- 发送 `/think`（或 `/think:`）不带参数可查看当前思考级别。

## 按代理应用

- **嵌入式 Pi**：解析后的级别传递给进程内 Pi 代理运行时。

## 快速模式（/fast）

- 级别：`on|off`。
- 仅指令消息切换会话快速模式覆盖，并回复 `Fast mode enabled.` / `Fast mode disabled.`。
- 发送 `/fast`（或 `/fast status`）不带模式可查看当前有效的快速模式状态。
- OpenClaw 按此顺序解析快速模式：
  1. 内联/仅指令 `/fast on|off`
  2. 会话覆盖
  3. 每代理默认值（`agents.list[].fastModeDefault`）
  4. 每模型配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 回退：`off`
- 对于 `openai/*`，快速模式通过在支持的 Responses 请求上发送 `service_tier=priority` 映射到 OpenAI 优先处理。
- 对于 `openai-codex/*`，快速模式在 Codex Responses 上发送相同的 `service_tier=priority` 标志。OpenClaw 在两种认证路径上保持一个共享的 `/fast` 切换。
- 对于直接公共 `anthropic/*` 请求，包括发送到 `api.anthropic.com` 的 OAuth 认证流量，快速模式映射到 Anthropic 服务级别：`/fast on` 设置 `service_tier=auto`，`/fast off` 设置 `service_tier=standard_only`。
- 对于 Anthropic 兼容路径上的 `minimax/*`，`/fast on`（或 `params.fastMode: true`）将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
- 当两者都设置时，显式的 Anthropic `serviceTier` / `service_tier` 模型参数覆盖快速模式默认值。OpenClaw 仍然跳过非 Anthropic 代理基础 URL 的 Anthropic 服务级别注入。
- `/status` 仅在快速模式启用时显示 `Fast`。

## 详细指令（/verbose 或 /v）

- 级别：`on`（最小）| `full` | `off`（默认）。
- 仅指令消息切换会话详细并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效级别返回提示而不更改状态。
- `/verbose off` 存储显式会话覆盖；通过选择 `inherit` 在会话 UI 中清除它。
- 内联指令仅影响该消息；否则应用会话/全局默认值。
- 发送 `/verbose`（或 `/verbose:`）不带参数可查看当前详细级别。
- 当详细开启时，发出结构化工具结果的代理（Pi、其他 JSON 代理）将每个工具调用作为其自己的仅元数据消息发回，在可用时以 `<emoji> <tool-name>: <arg>` 为前缀。这些工具摘要在每个工具开始时立即发送（独立的气泡），而非作为流式增量。
- 工具失败摘要在正常模式下保持可见，但原始错误详情后缀被隐藏，除非详细为 `on` 或 `full`。
- 当详细为 `full` 时，工具输出也在完成后转发（独立的气泡，截断到安全长度）。如果你在运行进行中切换 `/verbose on|full|off`，后续工具气泡遵循新设置。
- `agents.defaults.toolProgressDetail` 控制 `/verbose` 工具摘要和进度草稿工具行的形状。使用 `"explain"`（默认）获得紧凑的人类标签，如 `🛠️ Exec: checking JS syntax`；当你也想附加原始命令/详情用于调试时使用 `"raw"`。每代理 `agents.list[].toolProgressDetail` 覆盖默认值。
  - `explain`：`🛠️ Exec: check JS syntax for /tmp/app.js`
  - `raw`：`🛠️ Exec: check JS syntax for /tmp/app.js, node --check /tmp/app.js`

## 插件跟踪指令（/trace）

- 级别：`on` | `off`（默认）。
- 仅指令消息切换会话插件跟踪输出并回复 `Plugin trace enabled.` / `Plugin trace disabled.`。
- 内联指令仅影响该消息；否则应用会话/全局默认值。
- 发送 `/trace`（或 `/trace:`）不带参数可查看当前跟踪级别。
- `/trace` 比 `/verbose` 更窄：它只暴露插件拥有的跟踪/调试行，如 Active Memory 调试摘要。
- 跟踪行可以出现在 `/status` 中以及正常助手回复后的后续诊断消息中。

## 推理可见性（/reasoning）

- 级别：`on|off|stream`。
- 仅指令消息切换是否在回复中显示思考块。
- 启用时，推理作为**独立消息**发送，以 `Reasoning:` 为前缀。
- `stream`（仅限 Telegram）：在回复生成时将推理流入 Telegram 草稿气泡，然后发送不含推理的最终答案。
- 别名：`/reason`。
- 发送 `/reasoning`（或 `/reasoning:`）不带参数可查看当前推理级别。
- 解析顺序：内联指令，然后会话覆盖，然后每代理默认值（`agents.list[].reasoningDefault`），然后回退（`off`）。

格式不正确的本地模型推理标记被保守处理。封闭的 `<think>...</think>` 块在正常回复中保持隐藏，已可见文本之后的未封闭推理也被隐藏。如果回复完全包装在单个未封闭开放标记中，否则将作为空文本传递，OpenClaw 删除格式不正确的开放标记并传递剩余文本。

## 相关链接

- 提升模式文档在[提升模式](/tools/elevated)中。

## 心跳

- 心跳探测体是配置的心跳提示（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳消息中的内联指令照常应用（但避免从心跳更改会话默认值）。
- 心跳传递默认只传递最终载荷。要同时发送独立的 `Reasoning:` 消息（如果可用），设置 `agents.defaults.heartbeat.includeReasoning: true` 或每代理 `agents.list[].heartbeat.includeReasoning: true`。

## Web 聊天 UI

- Web 聊天思考选择器在页面加载时镜像入站会话存储/配置中的会话存储级别。
- 选择另一个级别通过 `sessions.patch` 立即写入会话覆盖；它不等待下一次发送，也不是一次性的 `thinkingOnce` 覆盖。
- 第一个选项始终是 `Default (<resolved level>)`，其中解析后的默认值来自活动会话模型的提供商思考配置文件加上 `/status` 和 `session_status` 使用的相同回退逻辑。
- 选择器使用 gateway 会话行/默认值返回的 `thinkingLevels`，将 `thinkingOptions` 保持为旧版标签列表。浏览器 UI 不保留自己的提供商正则表达式列表；插件拥有模型特定的级别集。
- `/think:<level>` 仍然有效并更新相同的存储会话级别，因此聊天指令和选择器保持同步。

## 提供商配置文件

- 提供商插件可以暴露 `resolveThinkingProfile(ctx)` 来定义模型支持的级别和默认值。
- 代理 Claude 模型的提供商插件应从 `openclaw/plugin-sdk/provider-model-shared` 复用 `resolveClaudeThinkingProfile(modelId)`，使直接 Anthropic 和代理目录保持一致。
- 每个配置文件级别都有一个存储的规范 `id`（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive` 或 `max`），并可能包含显示 `label`。二进制提供商使用 `{ id: "low", label: "on" }`。
- 需要验证显式思考覆盖的工具插件应使用 `api.runtime.agent.resolveThinkingPolicy({ provider, model })` 加 `api.runtime.agent.normalizeThinkingLevel(...)`；它们不应保留自己的提供商/模型级别列表。
- 可以访问配置自定义模型元数据的工具插件可以将 `catalog` 传递到 `resolveThinkingPolicy`，以便 `compat.supportedReasoningEfforts` 选择加入反映在插件端验证中。
- 发布的旧版钩子（`supportsXHighThinking`、`isBinaryThinking` 和 `resolveDefaultThinkingLevel`）作为兼容性适配器保留，但新的自定义级别集应使用 `resolveThinkingProfile`。
- Gateway 行/默认值暴露 `thinkingLevels`、`thinkingOptions` 和 `thinkingDefault`，使 ACP/聊天客户端渲染与运行时验证使用的相同配置文件 id 和标签。
