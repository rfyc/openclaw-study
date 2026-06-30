---
summary: "OpenClaw 如何轮换认证配置文件并在模型间进行回退"
read_when:
  - 诊断认证配置文件轮换、冷却或模型回退行为
  - 更新认证配置文件或模型的故障转移规则
  - 了解会话模型覆盖如何与回退重试交互
title: "模型故障转移"
sidebarTitle: "模型故障转移"
---

OpenClaw 分两个阶段处理故障：

1. 在当前提供商内进行**认证配置文件轮换**。
2. **模型回退**到 `agents.defaults.model.fallbacks` 中的下一个模型。

本文档解释运行时规则和支持它们的数据。

## 运行时流程

对于正常的文本运行，OpenClaw 按此顺序评估候选：

<Steps>
  <Step title="解析会话状态">
    解析活跃的会话模型和认证配置文件偏好。
  </Step>
  <Step title="构建候选链">
    从当前模型选择和该选择来源的回退策略构建模型候选链。已配置的默认值、cron 任务主模型和自动选择的回退模型可以使用已配置的回退；显式用户会话选择是严格的。
  </Step>
  <Step title="尝试当前提供商">
    使用认证配置文件轮换/冷却规则尝试当前提供商。
  </Step>
  <Step title="在值得故障转移的错误上推进">
    如果该提供商以值得故障转移的错误耗尽，移到下一个模型候选。
  </Step>
  <Step title="在重试前持久化回退覆盖">
    在重试开始之前持久化选择的回退覆盖，以便其他会话读取者看到运行器即将使用的相同提供商/模型。持久化的模型覆盖标记为 `modelOverrideSource: "auto"`。
  </Step>
  <Step title="在失败时窄回滚">
    如果回退候选失败，仅在它们仍与该失败候选匹配时回滚回退拥有的会话覆盖字段。
  </Step>
  <Step title="耗尽时抛出 FallbackSummaryError">
    如果每个候选都失败，抛出带有每次尝试详情和最早冷却到期时间（已知时）的 `FallbackSummaryError`。
  </Step>
</Steps>

这有意比"保存并恢复整个会话"更窄。回复运行器只持久化它为回退拥有的模型选择字段：

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

这防止了失败的回退重试覆盖更新的不相关会话变更，例如在尝试运行时发生的手动 `/model` 更改或会话轮换更新。

## 选择来源策略

OpenClaw 将选择的提供商/模型与选择原因分开。该来源控制是否允许回退链：

- **已配置的默认值**：`agents.defaults.model.primary` 使用 `agents.defaults.model.fallbacks`。
- **智能体主模型**：`agents.list[].model` 是严格的，除非该智能体模型对象包含自己的 `fallbacks`。使用 `fallbacks: []` 使严格行为显式化，或提供非空列表以选择该智能体进入模型回退。
- **自动回退覆盖**：运行时回退在重试前写入 `providerOverride`、`modelOverride` 和 `modelOverrideSource: "auto"`。该自动覆盖可以继续沿配置的回退链走，并被 `/new`、`/reset` 和 `sessions.reset` 清除。
- **用户会话覆盖**：`/model`、模型选择器、`session_status(model=...)` 和 `sessions.patch` 写入 `modelOverrideSource: "user"`。这是一个精确的会话选择。如果选择的提供商/模型在产生回复之前失败，OpenClaw 报告失败而不是从不相关的已配置回退回答。
- **遗留会话覆盖**：旧版会话条目可能有 `modelOverride` 而没有 `modelOverrideSource`。OpenClaw 将它们视为用户覆盖，以便显式的旧选择不会静默转换为回退行为。
- **Cron 有效载荷模型**：cron 任务 `payload.model` / `--model` 是任务主模型，而不是用户会话覆盖。它使用已配置的回退，除非任务提供 `payload.fallbacks`；`payload.fallbacks: []` 使 cron 运行严格。

## 认证存储（密钥 + OAuth）

OpenClaw 对 API 密钥和 OAuth 令牌都使用**认证配置文件**。

- 密钥存储在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（遗留：`~/.openclaw/agent/auth-profiles.json`）。
- 运行时认证路由状态存储在 `~/.openclaw/agents/<agentId>/agent/auth-state.json`。
- 配置 `auth.profiles` / `auth.order` 仅是**元数据 + 路由**（无密钥）。
- 遗留仅导入的 OAuth 文件：`~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json`）。

更多详情：[OAuth](/concepts/oauth)

凭证类型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }`（某些提供商还有 `projectId`/`enterpriseUrl`）

## 配置文件 ID

OAuth 登录创建不同的配置文件，以便多个账户可以共存。

- 默认：当没有可用电子邮件时为 `provider:default`。
- 带电子邮件的 OAuth：`provider:<email>`（例如 `google-antigravity:user@gmail.com`）。

配置文件存储在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 的 `profiles` 下。

## 轮换顺序

当提供商有多个配置文件时，OpenClaw 按以下顺序选择：

<Steps>
  <Step title="显式配置">
    `auth.order[provider]`（如果已设置）。
  </Step>
  <Step title="已配置的配置文件">
    按提供商过滤的 `auth.profiles`。
  </Step>
  <Step title="已存储的配置文件">
    提供商在 `auth-profiles.json` 中的条目。
  </Step>
</Steps>

如果没有配置显式顺序，OpenClaw 使用轮询顺序：

- **主键：** 配置文件类型（**OAuth 优先于 API 密钥**）。
- **次键：** `usageStats.lastUsed`（每种类型中，最旧的优先）。
- **冷却/禁用的配置文件**移到末尾，按最早到期排序。

### 会话粘性（缓存友好）

OpenClaw **每个会话固定选择的认证配置文件**以保持提供商缓存温热。它**不**在每个请求上轮换。固定的配置文件被重用，直到：

- 会话被重置（`/new` / `/reset`）
- 压缩完成（压缩计数递增）
- 配置文件在冷却/禁用状态

通过 `/model …@<profileId>` 手动选择为该会话设置**用户覆盖**，直到新会话开始才会自动轮换。

<Note>
自动固定的配置文件（由会话路由器选择）被视为**偏好**：它们首先被尝试，但 OpenClaw 可能在速率限制/超时时轮换到另一个配置文件。用户固定的配置文件锁定到该配置文件；如果它失败且配置了模型回退，OpenClaw 移到下一个模型而不是切换配置文件。
</Note>

### 为什么 OAuth 可能"看起来丢失"

如果你对同一提供商既有 OAuth 配置文件又有 API 密钥配置文件，轮询可能在消息之间切换它们，除非已固定。要强制使用单个配置文件：

- 用 `auth.order[provider] = ["provider:profileId"]` 固定，或
- 在支持的 UI/聊天界面上，通过 `/model …` 使用带配置文件覆盖的每会话覆盖。

## 冷却

当配置文件因认证/速率限制错误（或看起来像速率限制的超时）而失败时，OpenClaw 将其标记为冷却并移到下一个配置文件。

<AccordionGroup>
  <Accordion title="进入速率限制/超时桶的内容">
    该速率限制桶比普通 `429` 更宽：它还包括提供商消息，如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted`，以及周期性使用窗口限制，如 `weekly/monthly limit reached`。

    格式/无效请求错误（例如 Cloud Code Assist 工具调用 ID 验证失败）被视为值得故障转移，并使用相同的冷却。OpenAI 兼容的停止原因错误，如 `Unhandled stop reason: error`、`stop reason: error` 和 `reason: error` 被归类为超时/故障转移信号。

    当来源与已知的瞬态模式匹配时，通用服务器文本也可以进入该超时桶。例如，裸 pi-ai 流包装器消息 `An unknown error occurred` 对每个提供商都被视为值得故障转移，因为当提供商流以 `stopReason: "aborted"` 或 `stopReason: "error"` 结束而没有特定详情时，pi-ai 发出该消息。带有瞬态服务器文本的 JSON `api_error` 有效载荷，如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error` 也被视为值得故障转移的超时。

    仅当提供商上下文实际上是 OpenRouter 时，特定于 OpenRouter 的通用上游文本（如裸 `Provider returned error`）才被视为超时。通用内部回退文本（如 `LLM request failed with an unknown error.`）保持保守，本身不触发故障转移。

  </Accordion>
  <Accordion title="SDK 重试后等待上限">
    某些提供商 SDK 可能会在将控制权返回给 OpenClaw 之前为长时间的 `Retry-After` 窗口休眠。对于基于 Stainless 的 SDK（如 Anthropic 和 OpenAI），OpenClaw 默认将 SDK 内部 `retry-after-ms` / `retry-after` 等待上限设为 60 秒，并立即暴露更长的可重试响应，以便此故障转移路径可以运行。使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` 调整或禁用上限；参见[重试行为](/concepts/retry)。
  </Accordion>
  <Accordion title="模型范围的冷却">
    速率限制冷却也可以是模型范围的：

    - 当失败的模型 id 已知时，OpenClaw 为速率限制失败记录 `cooldownModel`。
    - 当冷却范围限定于不同模型时，同一提供商上的兄弟模型仍然可以被尝试。
    - 账单/禁用窗口仍然会在模型间阻止整个配置文件。

  </Accordion>
</AccordionGroup>

冷却使用指数退避：

- 1 分钟
- 5 分钟
- 25 分钟
- 1 小时（上限）

状态存储在 `auth-state.json` 的 `usageStats` 下：

```json
{
  "usageStats": {
    "provider:profile": {
      "lastUsed": 1736160000000,
      "cooldownUntil": 1736160600000,
      "errorCount": 2
    }
  }
}
```

## 账单禁用

账单/信用失败（例如"余额不足"/"信用余额太低"）被视为值得故障转移，但它们通常不是瞬态的。OpenClaw 不是短暂冷却，而是将配置文件标记为**禁用**（具有更长的退避），并轮换到下一个配置文件/提供商。

<Note>
并非每个账单形状的响应都是 `402`，并非每个 HTTP `402` 都落在这里。即使提供商返回 `401` 或 `403` 而不是，OpenClaw 也会将明确的账单文本保留在账单通道中，但特定于提供商的匹配器仍然限定在拥有它们的提供商（例如 OpenRouter `403 Key limit exceeded`）。

同时，当消息看起来可重试时（例如 `weekly usage limit exhausted`、`daily limit reached, resets tomorrow` 或 `organization spending limit exceeded`），临时 `402` 使用窗口和组织/工作区支出限制错误被归类为 `rate_limit`。这些保留在短冷却/故障转移路径上，而不是长账单禁用路径上。
</Note>

状态存储在 `auth-state.json` 中：

```json
{
  "usageStats": {
    "provider:profile": {
      "disabledUntil": 1736178000000,
      "disabledReason": "billing"
    }
  }
}
```

默认值：

- 账单退避从 **5 小时**开始，每次账单失败翻倍，上限为 **24 小时**。
- 如果配置文件 **24 小时**内没有失败，退避计数器重置（可配置）。
- 过载重试在模型回退前允许 **1 次同提供商配置文件轮换**。
- 过载重试默认使用 **0ms 退避**。

## 模型回退

如果提供商的所有配置文件都失败，OpenClaw 移到 `agents.defaults.model.fallbacks` 中的下一个模型。这适用于认证失败、速率限制和耗尽配置文件轮换的超时（其他错误不推进回退）。未公开足够详情的提供商错误仍然在回退状态中被精确标记：`empty_response` 意味着提供商没有返回可用消息或状态，`no_error_details` 意味着提供商明确返回了 `Unknown error (no error details in response)`，`unclassified` 意味着 OpenClaw 保留了原始预览但没有分类器匹配它。

过载和速率限制错误比账单冷却处理得更积极。默认情况下，OpenClaw 允许一次同提供商认证配置文件重试，然后无等待切换到下一个配置的模型回退。提供商忙信号（如 `ModelNotReadyException`）落入该过载桶。使用 `auth.cooldowns.overloadedProfileRotations`、`auth.cooldowns.overloadedBackoffMs` 和 `auth.cooldowns.rateLimitedProfileRotations` 调整。

当运行从已配置的默认主模型、cron 任务主模型、带显式回退的智能体主模型或自动选择的回退覆盖开始时，OpenClaw 可以沿匹配的已配置回退链走。没有显式回退的智能体主模型和显式用户选择（例如 `/model ollama/qwen3.5:27b`、模型选择器、`sessions.patch` 或一次性 CLI 提供商/模型覆盖）是严格的：如果该提供商/模型无法访问或在产生回复之前失败，OpenClaw 报告失败而不是从不相关的回退回答。

### 候选链规则

OpenClaw 从当前请求的 `provider/model` 加上已配置的回退构建候选列表。

<AccordionGroup>
  <Accordion title="规则">
    - 请求的模型始终是第一个。
    - 显式配置的回退被去重但不被模型允许列表过滤。它们被视为显式运营商意图。
    - 如果当前运行已经在同一提供商系列中的已配置回退上，OpenClaw 继续使用完整的已配置链。
    - 如果当前运行在与配置不同的提供商上，并且该当前模型还不是已配置回退链的一部分，OpenClaw 不会从另一个提供商附加不相关的已配置回退。
    - 当没有向回退运行器提供显式回退覆盖时，已配置的主模型被附加到末尾，以便链可以在较早的候选耗尽后恢复到正常默认值。
    - 当调用者提供 `fallbacksOverride` 时，运行器使用精确的请求模型加上该覆盖列表。空列表禁用模型回退，并防止已配置的主模型作为隐藏重试目标被附加。
  </Accordion>
</AccordionGroup>

### 哪些错误推进回退

<Tabs>
  <Tab title="继续于">
    - 认证失败
    - 速率限制和冷却耗尽
    - 过载/提供商忙错误
    - 超时形状的故障转移错误
    - 账单禁用
    - `LiveSessionModelSwitchError`，被规范化为故障转移路径，以便陈旧的持久化模型不会创建外部重试循环
    - 当仍有剩余候选时的其他无法识别错误
  </Tab>
  <Tab title="不继续于">
    - 不是超时/故障转移形状的显式中止
    - 应该停留在压缩/重试逻辑内的上下文溢出错误（例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`The input is too long for the model` 或 `ollama error: context length exceeded`）
    - 没有剩余候选时的最终未知错误
  </Tab>
</Tabs>

### 冷却跳过与探测行为

当提供商的所有认证配置文件都已在冷却中时，OpenClaw 不会自动永远跳过该提供商。它做出每个候选的决定：

<AccordionGroup>
  <Accordion title="每个候选的决定">
    - 持久认证失败立即跳过整个提供商。
    - 账单禁用通常跳过，但主候选仍然可以在节流时被探测，以便无需重启即可恢复。
    - 主候选可以在接近冷却到期时被探测，每个提供商有节流。
    - 当失败看起来是瞬态的（`rate_limit`、`overloaded` 或未知）时，尽管冷却，仍然可以尝试同提供商回退兄弟。当速率限制是模型范围的且兄弟模型可能立即恢复时，这尤其相关。
    - 瞬态冷却探测被限制为每次回退运行每个提供商一次，以便单个提供商不会停止跨提供商回退。
  </Accordion>
</AccordionGroup>

## 会话覆盖和实时模型切换

会话模型更改是共享状态。活跃运行器、`/model` 命令、压缩/会话更新和实时会话协调都读取或写入相同会话条目的部分。

这意味着回退重试必须与实时模型切换协调：

- 只有显式用户驱动的模型更改才会标记待处理的实时切换。这包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系统驱动的模型更改，如回退轮换、心跳覆盖或压缩，本身不会标记待处理的实时切换。
- 用户驱动的模型覆盖被视为回退策略的精确选择，因此无法访问的已选提供商作为失败出现，而不是被 `agents.defaults.model.fallbacks` 掩盖。
- 在回退重试开始之前，回复运行器将选择的回退覆盖字段持久化到会话条目。
- 自动回退覆盖在后续轮次上保持选择，以便 OpenClaw 不会在每条消息上探测已知有问题的主模型。`/new`、`/reset` 和 `sessions.reset` 清除自动来源的覆盖，并将会话返回到已配置的默认值。
- `/status` 显示所选模型，以及当回退状态不同时，活跃的回退模型和原因。
- 实时会话协调优先于陈旧的运行时模型字段使用持久化的会话覆盖。
- 如果实时切换错误指向活跃回退链中的后续候选，OpenClaw 直接跳到该选择的模型，而不是首先遍历不相关的候选。
- 如果回退尝试失败，运行器只回滚它写的覆盖字段，并且只在它们仍与该失败候选匹配时。

这防止了经典的竞争条件：

<Steps>
  <Step title="主模型失败">
    选择的主模型失败。
  </Step>
  <Step title="内存中选择了回退">
    在内存中选择了回退候选。
  </Step>
  <Step title="会话存储仍然显示旧主模型">
    会话存储仍然反映旧的主模型。
  </Step>
  <Step title="实时协调读取陈旧状态">
    实时会话协调读取陈旧的会话状态。
  </Step>
  <Step title="重试被快照回">
    在回退尝试开始之前，重试被快照回旧模型。
  </Step>
</Steps>

持久化的回退覆盖关闭了该窗口，窄回滚保持了更新的手动或运行时会话更改完整。

## 可观察性和失败摘要

`runWithModelFallback(...)` 记录每次尝试的详情，供日志和面向用户的冷却消息使用：

- 尝试的提供商/模型
- 原因（`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 和类似的故障转移原因）
- 可选的状态/代码
- 人类可读的错误摘要

结构化的 `model_fallback_decision` 日志当候选失败、被跳过或后续回退成功时也包含扁平的 `fallbackStep*` 字段。这些字段使尝试的转换显式化（`fallbackStepFromModel`、`fallbackStepToModel`、`fallbackStepFromFailureReason`、`fallbackStepFromFailureDetail`、`fallbackStepFinalOutcome`），以便即使终端回退也失败，日志和诊断导出器也可以重建主要失败。

当每个候选都失败时，OpenClaw 抛出 `FallbackSummaryError`。外部回复运行器可以使用它来构建更具体的消息，例如"所有模型暂时受速率限制"，并在已知时包含最早的冷却到期。

该冷却摘要是模型感知的：

- 不相关的模型范围速率限制对尝试的提供商/模型链被忽略
- 如果剩余的阻止是匹配的模型范围速率限制，OpenClaw 报告仍然阻止该模型的最后匹配到期

## 相关配置

有关以下内容，参见[网关配置](/gateway/configuration)：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

有关更广泛的模型选择和回退概述，参见[模型](/concepts/models)。
