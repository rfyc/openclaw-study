---
summary: "出站频道的 Markdown 格式化管道"
read_when:
  - 你正在更改出站频道的 Markdown 格式化或分块
  - 你正在添加新的频道格式化器或样式映射
  - 你正在调试跨频道的格式化回归
title: "Markdown 格式化"
---

OpenClaw 通过将 Markdown 转换为共享的中间表示（IR）来格式化出站 Markdown，然后再渲染特定频道的输出。IR 保持源文本完整，同时携带样式/链接范围，这样分块和渲染就可以在各频道之间保持一致。

## 目标

- **一致性：** 一次解析步骤，多个渲染器。
- **安全分块：** 在渲染之前对文本进行分块，这样内联格式就不会在块间断裂。
- **频道适配：** 将相同的 IR 映射到 Slack mrkdwn、Telegram HTML 和 Signal 样式范围，而无需重新解析 Markdown。

## 管道

1. **解析 Markdown -> IR**
   - IR 是纯文本加上样式范围（粗体/斜体/删除线/代码/剧透）和链接范围。
   - 偏移量是 UTF-16 代码单元，这样 Signal 样式范围就与其 API 对齐。
   - 只有当频道选择加入表格转换时才解析表格。
2. **分块 IR（格式优先）**
   - 分块在渲染之前对 IR 文本进行。
   - 内联格式不会在块间分裂；范围按块切片。
3. **按频道渲染**
   - **Slack：** mrkdwn 令牌（粗体/斜体/删除线/代码），链接为 `<url|label>`。
   - **Telegram：** HTML 标签（`<b>`、`<i>`、`<s>`、`<code>`、`<pre><code>`、`<a href>`）。
   - **Signal：** 纯文本 + `text-style` 范围；当标签不同于 URL 时，链接变为 `label (url)`。

## IR 示例

输入 Markdown：

```markdown
Hello **world** — see [docs](https://docs.openclaw.ai).
```

IR（示意）：

```json
{
  "text": "Hello world — see docs.",
  "styles": [{ "start": 6, "end": 11, "style": "bold" }],
  "links": [{ "start": 19, "end": 23, "href": "https://docs.openclaw.ai" }]
}
```

## 使用场景

- Slack、Telegram 和 Signal 出站适配器从 IR 渲染。
- 其他频道（WhatsApp、iMessage、Microsoft Teams、Discord）仍然使用纯文本或它们自己的格式化规则，当启用时在分块之前应用 Markdown 表格转换。

## 表格处理

Markdown 表格在各聊天客户端之间没有统一支持。使用 `markdown.tables` 按频道（和按账户）控制转换。

- `code`：将表格渲染为代码块（大多数频道的默认值）。
- `bullets`：将每行转换为要点（Signal + WhatsApp 的默认值）。
- `off`：禁用表格解析和转换；原始表格文本直接通过。

配置键：

```yaml
channels:
  discord:
    markdown:
      tables: code
    accounts:
      work:
        markdown:
          tables: off
```

## 分块规则

- 块限制来自频道适配器/配置，并应用于 IR 文本。
- 代码栅栏作为单个块保留，带有尾随换行符，这样频道可以正确渲染它们。
- 列表前缀和块引用前缀是 IR 文本的一部分，因此分块不会在前缀中间分裂。
- 内联样式（粗体/斜体/删除线/内联代码/剧透）从不在块间分裂；渲染器在每个块中重新打开样式。

如果你需要更多关于跨频道分块行为的信息，参见[流式传输 + 分块](/concepts/streaming)。

## 链接策略

- **Slack：** `[label](url)` -> `<url|label>`；裸 URL 保持裸露。解析期间禁用自动链接以避免双重链接。
- **Telegram：** `[label](url)` -> `<a href="url">label</a>`（HTML 解析模式）。
- **Signal：** `[label](url)` -> `label (url)`，除非标签与 URL 匹配。

## 剧透

剧透标记（`||spoiler||`）只为 Signal 解析，在那里它们映射到 SPOILER 样式范围。其他频道将它们视为纯文本。

## 如何添加或更新频道格式化器

1. **一次性解析：** 使用共享的 `markdownToIR(...)` 助手，带有特定频道的选项（自动链接、标题样式、块引用前缀）。
2. **渲染：** 使用 `renderMarkdownWithMarkers(...)` 和样式标记映射（或 Signal 样式范围）实现渲染器。
3. **分块：** 在渲染之前调用 `chunkMarkdownIR(...)`；渲染每个块。
4. **连接适配器：** 更新频道出站适配器以使用新的分块器和渲染器。
5. **测试：** 添加或更新格式测试，如果频道使用分块，则添加出站投递测试。

## 常见陷阱

- Slack 尖括号令牌（`<@U123>`、`<#C123>`、`<https://...>`）必须保留；安全地转义原始 HTML。
- Telegram HTML 需要转义标签外的文本以避免标记损坏。
- Signal 样式范围依赖 UTF-16 偏移量；不要使用代码点偏移量。
- 为代码围栏保留尾随换行符，这样关闭标记就落在自己的行上。

## 相关

- [流式传输和分块](/concepts/streaming)
- [系统提示](/concepts/system-prompt)
