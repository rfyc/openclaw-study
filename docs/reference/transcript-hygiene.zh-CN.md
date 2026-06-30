---
summary: "参考：提供商特定的记录清理和修复规则"
read_when:
  - 调试与记录形状相关的提供商请求拒绝时
  - 更改记录清理或工具调用修复逻辑时
  - 调查跨提供商的工具调用 id 不匹配时
title: "记录清理"
---

OpenClaw 在运行之前（构建模型上下文）对记录应用**提供商特定的修复**。其中大多数是**内存中**的调整，用于满足严格的提供商要求。单独的会话文件修复过程也可能在会话加载之前重写存储的 JSONL，但仅针对格式不正确的行或无效的持久记录条目。已交付的助手回复在磁盘上被保留；提供商特定的助手预填充剥离仅在构建出站负载时发生。当发生修复时，原始文件与会话文件一起备份。

范围包括：

- 不进入用户可见记录轮次的运行时专用提示词上下文
- 工具调用 id 清理
- 工具调用输入验证
- 工具结果配对修复
- 轮次验证/排序
- 思考签名清理
- 推理签名清理
- 图像负载清理
- 提供商重播之前的空白文本块清理
- 用户输入来源标记（用于跨会话路由的提示词）
- Bedrock Converse 重播的空助手错误轮次修复

如果你需要记录存储细节，请参阅：

- [会话管理深度剖析](/reference/session-management-compaction)

---

## 全局规则：运行时上下文不是用户记录

运行时/系统上下文可以添加到轮次的模型提示词中，但它不是最终用户创作的内容。OpenClaw 为网关回复、排队的后续请求、ACP、CLI 和嵌入式 Pi 运行保留一个单独的面向记录的提示词主体。存储的可见用户轮次使用该记录主体而不是运行时丰富的提示词。

对于已经持久化运行时包装器的遗留会话，网关历史界面在将消息返回给 WebChat、TUI、REST 或 SSE 客户端之前应用显示投影。

---

## 运行位置

所有记录清理都集中在嵌入式运行器中：

- 策略选择：`src/agents/transcript-policy.ts`
- 清理/修复应用：`src/agents/pi-embedded-runner/replay-history.ts` 中的 `sanitizeSessionHistory`

策略使用 `provider`、`modelApi` 和 `modelId` 来决定应用什么。

与记录清理分开，如有需要，会话文件在加载之前会被修复：

- `src/agents/session-file-repair.ts` 中的 `repairSessionFileIfNeeded`
- 从 `run/attempt.ts` 和 `compact.ts`（嵌入式运行器）调用

---

## 全局规则：图像清理

图像负载始终被清理，以防止由于大小限制（缩小/重新压缩超大的 base64 图像）而导致提供商端拒绝。

这也有助于控制视觉能力模型的图像驱动 token 压力。
较低的最大尺寸通常减少 token 使用量；较高的尺寸保留细节。

实现：

- `src/agents/pi-embedded-helpers/images.ts` 中的 `sanitizeSessionMessagesImages`
- `src/agents/tool-images.ts` 中的 `sanitizeContentBlocksImages`
- 最大图像边长可通过 `agents.defaults.imageMaxDimensionPx` 配置（默认：`1200`）。
- 在此过程遍历重播内容时删除空白文本块。变为空的助手轮次从重播副本中删除；变为空的用户和工具结果轮次会收到非空的省略内容占位符。

---

## 全局规则：格式不正确的工具调用

缺少 `input` 和 `arguments` 的助手工具调用块在构建模型上下文之前被删除。这可以防止提供商因部分持久化的工具调用（例如在速率限制失败后）而拒绝。

实现：

- `src/agents/session-transcript-repair.ts` 中的 `sanitizeToolCallInputs`
- 在 `src/agents/pi-embedded-runner/replay-history.ts` 中的 `sanitizeSessionHistory` 中应用

---

## 全局规则：跨会话输入来源

当智能助手通过 `sessions_send` 将提示词发送到另一个会话（包括智能助手间的回复/宣布步骤）时，OpenClaw 使用以下内容持久化创建的用户轮次：

- `message.provenance.kind = "inter_session"`

OpenClaw 还在路由提示词文本之前在同一轮次中添加 `[Inter-session message ... isUser=false]` 标记，以便活跃的模型调用可以区分外部会话输出和外部最终用户指令。此标记包括源会话、通道和工具（如果可用）。记录仍然为提供商兼容性使用 `role: "user"`，但可见文本和来源元数据都将轮次标记为跨会话数据。

在上下文重建期间，OpenClaw 对仅具有来源元数据的旧版持久化跨会话用户轮次应用相同的标记。

---

## 提供商矩阵（当前行为）

**OpenAI / OpenAI Codex**

- 仅图像清理。
- 删除孤立的推理签名（没有后续内容块的独立推理项）用于 OpenAI Responses/Codex 记录，并在模型路由切换后删除可重播的 OpenAI 推理。
- 保留可重播的 OpenAI Responses 推理项负载，包括加密的空摘要项，以便手动/WebSocket 重播保持所需的 `rs_*` 状态与助手输出项配对。
- 无工具调用 id 清理。
- 工具结果配对修复可能会移动真实匹配的输出，并为缺失的工具调用合成 Codex 风格的 `aborted` 输出。
- 无轮次验证或重排序。
- 缺失的 OpenAI Responses 系列工具输出被合成为 `aborted`，以匹配 Codex 重播规范化。
- 无思考签名剥离。

**OpenAI 兼容的 Gemma 4**

- 历史助手思考/推理块在重播之前被剥离，以便本地
  OpenAI 兼容的 Gemma 4 服务器不接收之前轮次的推理内容。
- 当前同一轮次的工具调用延续保持助手推理块
  附加到工具调用，直到工具结果被重播为止。

**Google（Generative AI / Gemini CLI / Antigravity）**

- 工具调用 id 清理：严格字母数字。
- 工具结果配对修复和合成工具结果。
- 轮次验证（Gemini 风格的轮次交替）。
- Google 轮次排序修复（如果历史以助手开始，则在前面添加一个小的用户引导）。
- Antigravity Claude：规范化思考签名；删除未签名的思考块。

**Anthropic / Minimax（Anthropic 兼容）**

- 工具结果配对修复和合成工具结果。
- 轮次验证（合并连续的用户轮次以满足严格的交替要求）。
- 当启用思考时，从出站 Anthropic Messages 负载（包括 Cloudflare AI Gateway 路由）中剥离尾部助手预填充轮次。
- 具有缺失、空或空白重播签名的思考块在提供商转换之前被剥离。如果这使助手轮次为空，OpenClaw 保持带有非空省略推理文本的轮次形状。
- 必须剥离的旧版仅思考助手轮次被替换为非空省略推理文本，以便提供商适配器不会删除重播轮次。

**Amazon Bedrock（Converse API）**

- 空助手流错误轮次在重播之前被修复为非空回退文本块。Bedrock Converse 拒绝具有 `content: []` 的助手消息，因此具有 `stopReason: "error"` 和空内容的持久化助手轮次也在加载之前在磁盘上被修复。
- 仅包含空白文本块的助手流错误轮次从内存中的重播副本中删除，而不是重播无效的空白块。
- 具有缺失、空或空白重播签名的 Claude 思考块在 Converse 重播之前被剥离。如果这使助手轮次为空，OpenClaw 保持带有非空省略推理文本的轮次形状。
- 必须剥离的旧版仅思考助手轮次被替换为非空省略推理文本，以便 Converse 重播保持严格的轮次形状。
- 重播过滤 OpenClaw 交付镜像和网关注入的助手轮次。
- 图像清理通过全局规则应用。

**Mistral（包括基于模型 id 的检测）**

- 工具调用 id 清理：严格 9（字母数字长度 9）。

**OpenRouter Gemini**

- 思考签名清理：剥离非 base64 的 `thought_signature` 值（保留 base64）。

**OpenRouter Anthropic**

- 当推理启用时，从已验证的 OpenRouter OpenAI 兼容 Anthropic 模型负载中剥离尾部助手预填充轮次，与直接 Anthropic 和 Cloudflare Anthropic 重播行为一致。

**其他所有**

- 仅图像清理。

---

## 历史行为（2026.1.22 之前）

在 2026.1.22 版本之前，OpenClaw 应用了多层记录清理：

- **记录清理扩展**在每次上下文构建时运行，可以：
  - 修复工具使用/结果配对。
  - 清理工具调用 id（包括保留 `_`/`-` 的非严格模式）。
- 运行器还执行了提供商特定的清理，这重复了工作。
- 在提供商策略之外还发生了额外的变更，包括：
  - 在持久化之前从助手文本中剥离 `<final>` 标签。
  - 删除空的助手错误轮次。
  - 在工具调用后修剪助手内容。

这种复杂性导致了跨提供商的回归（特别是 `openai-responses`
`call_id|fc_id` 配对）。2026.1.22 的清理删除了扩展，将
逻辑集中在运行器中，并使 OpenAI 除图像清理之外**不触碰**。

## 相关

- [会话管理](/concepts/session)
- [会话裁剪](/concepts/session-pruning)
