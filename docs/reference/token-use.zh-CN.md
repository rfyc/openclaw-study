---
summary: "OpenClaw 如何构建提示词上下文以及报告 token 使用量和成本"
read_when:
  - 解释 token 使用量、成本或上下文窗口时
  - 调试上下文增长或压缩行为时
title: "Token 使用与成本"
---

# Token 使用与成本

OpenClaw 跟踪 **token**，而不是字符。Token 是特定于模型的，但大多数 OpenAI 风格的模型对于英文文本平均每个 token 约 4 个字符。

## 系统提示词的构建方式

OpenClaw 在每次运行时组装自己的系统提示词。它包含：

- 工具列表 + 简短描述
- 技能列表（仅元数据；指令按需使用 `read` 加载）。
  紧凑的技能块由 `skills.limits.maxSkillsPromptChars` 限制，
  在 `agents.list[].skillsLimits.maxSkillsPromptChars` 有可选的每智能助手覆盖。
- 自更新指令
- 工作区 + 引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、新的 `BOOTSTRAP.md`，以及存在时的 `MEMORY.md`）。小写根目录 `memory.md` 不被注入；当与 `MEMORY.md` 配对时，它是 `openclaw doctor --fix` 的遗留修复输入。大型文件由 `agents.defaults.bootstrapMaxChars` 截断（默认：12000），总引导注入由 `agents.defaults.bootstrapTotalMaxChars` 限制（默认：60000）。`memory/*.md` 每日文件不是正常引导提示词的一部分；它们在普通轮次中通过记忆工具按需保留，但重置/启动模型运行可以在第一轮前添加包含最近每日记忆的一次性启动上下文块。裸聊天 `/new` 和 `/reset` 命令在不调用模型的情况下被确认。启动前言由 `agents.defaults.startupContext` 控制。
- 时间（UTC + 用户时区）
- 回复标签 + 心跳行为
- 运行时元数据（主机/操作系统/模型/思考）

在[系统提示词](/concepts/system-prompt)中查看完整细分。

## 上下文窗口中计算什么

模型接收的所有内容都计入上下文限制：

- 系统提示词（上面列出的所有部分）
- 对话历史（用户 + 助手消息）
- 工具调用和工具结果
- 附件/记录（图像、音频、文件）
- 压缩摘要和裁剪工件
- 提供商包装器或安全标头（不可见，但仍被计算）

某些运行时密集型界面有自己的明确上限：

- `agents.defaults.contextLimits.memoryGetMaxChars`
- `agents.defaults.contextLimits.memoryGetDefaultLines`
- `agents.defaults.contextLimits.toolResultMaxChars`
- `agents.defaults.contextLimits.postCompactionMaxChars`

每个智能助手的覆盖位于 `agents.list[].contextLimits` 下。这些旋钮用于有界的运行时摘录和注入的运行时拥有的块。它们与引导限制、启动上下文限制和技能提示词限制是分开的。

对于图像，OpenClaw 在提供商调用之前缩小记录/工具图像负载。
使用 `agents.defaults.imageMaxDimensionPx`（默认：`1200`）调整：

- 较低的值通常减少视觉 token 使用量和负载大小。
- 较高的值为 OCR/UI 密集型截图保留更多视觉细节。

对于实际细分（每个注入的文件、工具、技能和系统提示词大小），使用 `/context list` 或 `/context detail`。参见[上下文](/concepts/context)。

## 如何查看当前 token 使用量

在聊天中使用这些：

- `/status` → **表情符号丰富的状态卡**，包含会话模型、上下文使用量、上次响应输入/输出 token 以及**估计成本**（仅限 API 密钥）。
- `/usage off|tokens|full` → 在每个回复后附加**每响应使用量页脚**。
  - 按会话持久保存（存储为 `responseUsage`）。
  - OAuth 认证**隐藏成本**（仅显示 token）。
- `/usage cost` → 显示来自 OpenClaw 会话日志的本地成本摘要。

其他界面：

- **TUI/Web TUI：** 支持 `/status` + `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 显示
  规范化的提供商配额窗口（`X% 剩余`，而非每响应成本）。
  当前使用量窗口提供商：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、Xiaomi 和 z.ai。

使用量界面在显示前规范化常见的提供商原生字段别名。
对于 OpenAI 系列 Responses 流量，包括 `input_tokens` /
`output_tokens` 和 `prompt_tokens` / `completion_tokens`，因此特定于传输的
字段名称不会更改 `/status`、`/usage` 或会话摘要。
Gemini CLI JSON 使用量也被规范化：回复文本来自 `response`，
`stats.cached` 映射到 `cacheRead`，当 CLI 省略明确的 `stats.input` 字段时
使用 `stats.input_tokens - stats.cached`。
对于原生 OpenAI 系列 Responses 流量，WebSocket/SSE 使用量别名被
以相同方式规范化，当 `total_tokens` 缺失或为 `0` 时，总计回退到规范化的输入 + 输出。
当当前会话快照稀疏时，`/status` 和 `session_status` 也可以
从最近的记录使用日志恢复 token/缓存计数器和活跃运行时模型标签。现有的非零实时值仍优先于记录回退值，较大的面向提示词的
记录总计可以在存储总计缺失或较小时赢得。
提供商配额窗口的使用量认证来自特定于提供商的钩子（如果可用）；否则 OpenClaw 回退到匹配来自认证配置文件、env 或配置的 OAuth/API 密钥凭据。
助手记录条目保持相同的规范化使用量形状，包括
当活跃模型配置了定价且提供商返回使用量元数据时的 `usage.cost`。这为 `/usage cost` 和记录支持的会话状态提供了一个稳定来源，即使在实时运行时状态消失之后。

OpenClaw 将提供商使用量核算与当前上下文快照分开保留。提供商 `usage.total` 可以包括缓存输入、输出和多个工具循环模型调用，因此它对成本和遥测有用，但可能会高估实时上下文窗口。上下文显示和诊断使用最新的提示词快照（`promptTokens`，或当没有提示词快照可用时最后的模型调用）作为 `context.used`。

## 成本估算（显示时）

成本从你的模型定价配置中估算：

```
models.providers.<provider>.models[].cost
```

这些是 `input`、`output`、`cacheRead` 和 `cacheWrite` 的**每 100 万 token 美元价格**。如果定价缺失，OpenClaw 仅显示 token。OAuth token 永远不会显示美元成本。

侧车和通道到达网关就绪路径后，OpenClaw 为尚未具有本地定价的已配置模型引用启动可选的后台定价引导。该引导获取远程 OpenRouter 和 LiteLLM 定价目录。设置 `models.pricing.enabled: false` 以在离线或受限网络上跳过这些目录获取；明确的 `models.providers.*.models[].cost` 条目继续驱动本地成本估算。

## 缓存 TTL 和裁剪影响

提供商提示词缓存仅在缓存 TTL 窗口内适用。OpenClaw 可以可选地运行**缓存 TTL 裁剪**：一旦缓存 TTL 过期，它就裁剪会话，然后重置缓存窗口，以便后续请求可以重用新缓存的上下文，而不是重新缓存完整历史。当会话在 TTL 之后空闲时，这会降低缓存写入成本。

在[网关配置](/gateway/configuration)中配置它，并在[会话裁剪](/concepts/session-pruning)中查看行为详情。

心跳可以在空闲间隙保持缓存**温暖**。如果你的模型缓存 TTL 是 `1h`，将心跳间隔设置在其以下（例如 `55m`）可以避免重新缓存完整提示词，从而降低缓存写入成本。

在多智能助手设置中，你可以保持一个共享的模型配置，并使用 `agents.list[].params.cacheRetention` 按智能助手调整缓存行为。

有关详细的旋钮指南，请参阅[提示词缓存](/reference/prompt-caching)。

有关 Anthropic API 定价，缓存读取明显比输入 token 便宜，而缓存写入以更高的倍数计费。有关最新费率和 TTL 倍数，请参阅 Anthropic 的提示词缓存定价：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### 示例：使用心跳保持 1 小时缓存温暖

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
    heartbeat:
      every: "55m"
```

### 示例：混合流量与每智能助手缓存策略

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long" # 大多数智能助手的默认基线
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m" # 为深度会话保持长缓存温暖
    - id: "alerts"
      params:
        cacheRetention: "none" # 避免为突发通知写缓存
```

`agents.list[].params` 叠加在所选模型的 `params` 之上，因此你可以仅覆盖 `cacheRetention` 并继承其他模型默认值不变。

### 示例：启用 Anthropic 1M 上下文 beta 标头

Anthropic 的 1M 上下文窗口目前处于 beta 门控状态。当你在支持的 Opus 或 Sonnet 模型上启用 `context1m` 时，OpenClaw 可以注入所需的 `anthropic-beta` 值。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

这映射到 Anthropic 的 `context-1m-2025-08-07` beta 标头。

这仅在该模型条目上设置了 `context1m: true` 时适用。

要求：凭据必须有资格使用长上下文。如果没有，Anthropic 会对该请求以提供商侧速率限制错误响应。

如果你使用 OAuth/订阅 token（`sk-ant-oat-*`）认证 Anthropic，OpenClaw 会跳过 `context-1m-*` beta 标头，因为 Anthropic 目前以 HTTP 401 拒绝该组合。

## 减少 token 压力的技巧

- 使用 `/compact` 总结长会话。
- 在你的工作流中修剪大型工具输出。
- 为截图密集型会话降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述简短（技能列表被注入到提示词中）。
- 对冗长的探索性工作偏好使用较小的模型。

有关精确的技能列表开销公式，请参阅[技能](/tools/skills)。

## 相关

- [API 使用与成本](/reference/api-usage-costs)
- [提示词缓存](/reference/prompt-caching)
- [使用量跟踪](/concepts/usage-tracking)
