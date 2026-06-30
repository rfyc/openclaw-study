---
summary: "流式传输 + 分块行为（块回复、频道预览流式传输、模式映射）"
read_when:
  - 解释流式传输或分块在频道上的工作方式
  - 更改块流式传输或频道分块行为
  - 调试重复/提早的块回复或频道预览流式传输
title: "流式传输和分块"
---

OpenClaw 有两个独立的流式传输层：

- **块流式传输（频道）：** 在助手写作时发出已完成的**块**。这些是正常的频道消息（不是令牌增量）。
- **预览流式传输（Telegram/Discord/Slack）：** 在生成时更新临时**预览消息**。

目前没有向频道消息**真正的令牌增量流式传输**。预览流式传输是基于消息的（发送 + 编辑/追加）。

## 块流式传输（频道消息）

块流式传输在输出变得可用时以粗粒度块发送助手输出。

```
Model output
  └─ text_delta/events
       ├─ (blockStreamingBreak=text_end)
       │    └─ chunker emits blocks as buffer grows
       └─ (blockStreamingBreak=message_end)
            └─ chunker flushes at message_end
                   └─ channel send (block replies)
```

图例：

- `text_delta/events`：模型流事件（非流式传输模型可能稀疏）。
- `chunker`：`EmbeddedBlockChunker` 应用最小/最大边界 + 分割偏好。
- `channel send`：实际出站消息（块回复）。

**控制：**

- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（默认关闭）。
- 频道覆盖：`*.blockStreaming`（和每账户变体）以强制每个频道 `"on"`/`"off"`。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`：`{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`：`{ minChars?, maxChars?, idleMs? }`（在发送前合并流式传输的块）。
- 频道硬上限：`*.textChunkLimit`（例如 `channels.whatsapp.textChunkLimit`）。
- 频道分块模式：`*.chunkMode`（`length` 默认，`newline` 在长度分块之前在空白行（段落边界）处分割）。
- Discord 软上限：`channels.discord.maxLinesPerMessage`（默认 17）分割高回复以避免 UI 截断。

**边界语义：**

- `text_end`：分块器发出后立即流式传输块；在每个 `text_end` 时刷新。
- `message_end`：等待助手消息完成，然后刷新缓冲输出。

`message_end` 如果缓冲文本超过 `maxChars` 仍然使用分块器，因此它可以在末尾发出多个块。

### 块流式传输的媒体投递

`MEDIA:` 指令是正常的投递元数据。当块流式传输提前发送媒体块时，OpenClaw 为该轮次记住该投递。如果最终助手有效载荷重复相同的媒体 URL，最终投递会剥离重复的媒体，而不是再次发送附件。

完全重复的最终有效载荷被抑制。如果最终有效载荷在已流式传输的媒体周围添加了不同的文本，OpenClaw 仍然发送新文本，同时保持媒体单次投递。这防止了当智能体在流式传输期间发出 `MEDIA:` 且提供商也在完成的回复中包含它时，在 Telegram 等频道上出现重复的语音备注或文件。

## 分块算法（低/高边界）

块分块由 `EmbeddedBlockChunker` 实现：

- **低边界：** 在缓冲区 >= `minChars` 之前不发出（除非强制）。
- **高边界：** 优先在 `maxChars` 之前分割；如果强制，在 `maxChars` 处分割。
- **分割偏好：** `paragraph` → `newline` → `sentence` → `whitespace` → 硬分割。
- **代码围栏：** 永不在围栏内分割；当在 `maxChars` 处强制时，关闭 + 重新打开围栏以保持 Markdown 有效。

`maxChars` 被限制为频道 `textChunkLimit`，因此你不能超过每频道上限。

## 合并（合并流式传输的块）

当块流式传输启用时，OpenClaw 可以在发送之前**合并连续的块块**。这减少了"单行垃圾邮件"，同时仍提供渐进式输出。

- 合并等待**空闲间隙**（`idleMs`）然后刷新。
- 缓冲区受 `maxChars` 限制，如果超过则刷新。
- `minChars` 防止微小片段在足够文本积累之前发送（最终刷新始终发送剩余文本）。
- 连接符从 `blockStreamingChunk.breakPreference` 派生（`paragraph` → `\n\n`，`newline` → `\n`，`sentence` → 空格）。
- 频道覆盖可通过 `*.blockStreamingCoalesce` 获得（包括每账户配置）。
- 默认合并 `minChars` 对 Signal/Slack/Discord 提升为 1500，除非被覆盖。

## 块之间的类人节奏

当块流式传输启用时，你可以在块回复之间添加**随机暂停**（在第一个块之后）。这使多气泡响应感觉更自然。

- 配置：`agents.defaults.humanDelay`（通过 `agents.list[].humanDelay` 按智能体覆盖）。
- 模式：`off`（默认）、`natural`（800–2500 毫秒）、`custom`（`minMs`/`maxMs`）。
- 仅适用于**块回复**，不适用于最终回复或工具摘要。

## "流式传输块还是全部"

这映射到：

- **流式传输块：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"`（随时发出）。非 Telegram 频道还需要 `*.blockStreaming: true`。
- **末尾流式传输所有内容：** `blockStreamingBreak: "message_end"`（一次刷新，如果非常长则可能多个块）。
- **无块流式传输：** `blockStreamingDefault: "off"`（仅最终回复）。

**频道说明：** 块流式传输**关闭，除非** `*.blockStreaming` 明确设置为 `true`。频道可以流式传输实时预览（`channels.<channel>.streaming`）而无需块回复。

配置位置提醒：`blockStreaming*` 默认值位于 `agents.defaults` 下，而不是根配置。

## 预览流式传输模式

规范键：`channels.<channel>.streaming`

模式：

- `off`：禁用预览流式传输。
- `partial`：单个预览，用最新文本替换。
- `block`：预览以分块/追加步骤更新。
- `progress`：生成期间的进度/状态预览，完成时的最终答案。

`streaming.mode: "block"` 是用于支持编辑的频道（如 Discord 和 Telegram）的预览流式传输模式。它不在那里启用频道块投递。当你想要正常的块回复时，使用 `streaming.block.enabled` 或旧版 `blockStreaming` 频道键。Microsoft Teams 是例外：它没有草稿预览块传输，因此 `streaming.mode: "block"` 映射到 Teams 块投递，而不是原生部分/进度流式传输。

### 频道映射

| 频道       | `off` | `partial` | `block` | `progress`     |
| ---------- | ----- | --------- | ------- | -------------- |
| Telegram   | ✅    | ✅        | ✅      | 可编辑进度草稿 |
| Discord    | ✅    | ✅        | ✅      | 可编辑进度草稿 |
| Slack      | ✅    | ✅        | ✅      | ✅             |
| Mattermost | ✅    | ✅        | ✅      | ✅             |
| MS Teams   | ✅    | ✅        | ✅      | 原生进度流     |

仅 Slack：

- `channels.slack.streaming.nativeTransport` 在 `channels.slack.streaming.mode="partial"` 时切换 Slack 原生流式传输 API 调用（默认：`true`）。
- Slack 原生流式传输和 Slack 助手线程状态需要回复线程目标。顶层 DM 不显示该线程样式的预览，但它们仍然可以使用 Slack 草稿预览帖子和编辑。

旧版键迁移：

- Telegram：旧版 `streamMode` 和标量/布尔 `streaming` 值由 doctor/配置兼容性路径检测并迁移到 `streaming.mode`。
- Discord：`streamMode` + 布尔 `streaming` 自动迁移到 `streaming` 枚举。
- Slack：`streamMode` 自动迁移到 `streaming.mode`；布尔 `streaming` 自动迁移到 `streaming.mode` 加 `streaming.nativeTransport`；旧版 `nativeStreaming` 自动迁移到 `streaming.nativeTransport`。

### 运行时行为

Telegram：

- 跨 DM 和群组/主题使用 `sendMessage` + `editMessageText` 预览更新。
- 当预览已可见约一分钟时发送全新最终消息，而不是就地编辑，然后清理预览，以便 Telegram 的时间戳反映回复完成时间。
- 当 Telegram 块流式传输被明确启用时，跳过预览流式传输（以避免双重流式传输）。
- `/reasoning stream` 可以将推理写入在最终投递后删除的瞬时预览。

Discord：

- 使用发送 + 编辑预览消息。
- `block` 模式使用草稿分块（`draftChunk`）。
- 当 Discord 块流式传输被明确启用时，跳过预览流式传输。
- 最终媒体、错误和显式回复目标有效载荷在不刷新新草稿的情况下取消待处理的预览，然后使用正常投递。

Slack：

- `partial` 可在可用时使用 Slack 原生流式传输（`chat.startStream`/`append`/`stop`）。
- `block` 使用追加式草稿预览。
- `progress` 使用状态预览文本，然后是最终答案。
- 没有回复线程的顶层 DM 使用草稿预览帖子和编辑，而不是 Slack 原生流式传输。
- 原生和草稿预览流式传输为该轮次抑制块回复，因此 Slack 回复只由一个投递路径流式传输。
- 最终媒体/错误有效载荷和进度最终不创建一次性草稿消息；只有可以编辑预览的文本/块最终才刷新待处理的草稿文本。

Mattermost：

- 将思考、工具活动和部分回复文本流式传输到单个草稿预览帖子中，当最终答案可以安全发送时就地最终化。
- 如果预览帖子在最终化时被删除或不可用，则回退到发送全新最终帖子。
- 最终媒体/错误有效载荷在正常投递之前取消待处理的预览更新，而不是刷新临时预览帖子。

Matrix：

- 当最终文本可以重用预览事件时，草稿预览就地最终化。
- 仅媒体、错误和回复目标不匹配的最终在正常投递之前取消待处理的预览更新；已可见的过时预览被编辑删除。

### 工具进度预览更新

预览流式传输还可以包含**工具进度**更新——短状态行，如"正在搜索网络"、"正在读取文件"或"正在调用工具"——在工具运行时出现在同一预览消息中，在最终回复之前。这使多步骤工具轮次在视觉上保持活跃，而不是在第一个思考预览和最终答案之间静默。

支持的面：

- **Discord**、**Slack**、**Telegram** 和 **Matrix** 在预览流式传输活跃时默认将工具进度流式传输到实时预览编辑中。Microsoft Teams 在个人聊天中使用其原生进度流。
- Telegram 自 `v2026.4.22` 以来已启用工具进度预览更新；保持启用可保留该发布行为。
- **Mattermost** 已经将工具活动折叠到其单个草稿预览帖子中（见上文）。
- 工具进度编辑遵循活跃的预览流式传输模式；当预览流式传输为 `off` 或块流式传输已接管消息时跳过它们。在 Telegram 上，`streaming.mode: "off"` 是仅最终：通用进度聊天也被抑制，而不是作为独立状态消息投递，而审批提示、媒体有效载荷和错误仍然正常路由。
- 要在保持预览流式传输的同时隐藏工具进度行，将该频道的 `streaming.preview.toolProgress` 设置为 `false`。要在隐藏命令/exec 文本的同时保持工具进度行可见，将 `streaming.preview.commandText` 设置为 `"status"` 或将 `streaming.progress.commandText` 设置为 `"status"`；默认值为 `"raw"` 以保留发布行为。此策略由使用 OpenClaw 紧凑进度渲染器的草稿/进度频道共享，包括 Discord、Matrix、Microsoft Teams、Mattermost、Slack 草稿预览和 Telegram。要完全禁用预览编辑，将 `streaming.mode` 设置为 `off`。
- Telegram 选定引用回复是例外：当 `replyToMode` 不为 `"off"` 且存在选定引用文本时，OpenClaw 为该轮次跳过答案预览流，以防工具进度预览行渲染。没有选定引用文本的当前消息回复仍然保持预览流式传输。有关详情，请参见 [Telegram 频道文档](/channels/telegram)。

保持进度行可见但隐藏原始命令/exec 文本：

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "partial",
        "preview": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

在另一个紧凑进度频道键下使用相同的形状，例如 `channels.discord`、`channels.matrix`、`channels.msteams`、`channels.mattermost` 或 Slack 草稿预览。对于进度草稿模式，将相同的策略放在 `streaming.progress` 下：

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "progress",
        "progress": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

## 相关

- [进度草稿](/concepts/progress-drafts) — 在长轮次期间更新的可见工作进行中消息
- [消息](/concepts/messages) — 消息生命周期和投递
- [重试](/concepts/retry) — 投递失败时的重试行为
- [频道](/channels) — 每个频道的流式传输支持
