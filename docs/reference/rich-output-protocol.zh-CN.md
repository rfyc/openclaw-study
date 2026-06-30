---
summary: "用于嵌入、媒体、音频提示和回复的富输出短代码协议"
read_when:
  - 更改控制 UI 中的助手输出渲染时
  - 调试 `[embed ...]`、`MEDIA:`、回复或音频呈现指令时
title: "富输出协议"
---

助手输出可以携带一小组交付/渲染指令：

- `MEDIA:`：用于附件交付
- `[[audio_as_voice]]`：用于音频呈现提示
- `[[reply_to_current]]` / `[[reply_to:<id>]]`：用于回复元数据
- `[embed ...]`：用于控制 UI 富渲染

远程 `MEDIA:` 附件必须是公开的 `https:` URL。纯 `http:`、回环、链路本地、私有和内部主机名作为附件指令被忽略；服务器端媒体抓取器仍然执行其自己的网络防护。

本地 `MEDIA:` 附件可以使用绝对路径、工作区相对路径或家目录相对的 `~/` 路径。它们在交付前仍然通过智能助手文件读取策略和媒体类型检查。

纯 Markdown 图像语法默认保留为文本。有意将 Markdown 图像回复映射到媒体附件的通道在其出站适配器中选择加入；Telegram 这样做，使 `![alt](url)` 仍然可以变成媒体回复。

这些指令是分开的。`MEDIA:` 和回复/语音标签保留交付元数据；`[embed ...]` 是仅限 Web 的富渲染路径。受信任的工具结果媒体在交付前使用相同的 `MEDIA:` / `[[audio_as_voice]]` 解析器，因此文本工具输出仍然可以将音频附件标记为语音笔记。

当启用块流时，`MEDIA:` 对于一个轮次保持单次交付元数据。如果相同的媒体 URL 在流式块和最终助手负载中重复发送，OpenClaw 交付附件一次并从最终负载中去除重复项。

## `[embed ...]`

`[embed ...]` 是控制 UI 唯一面向智能助手的富渲染语法。

自闭合示例：

```text
[embed ref="cv_123" title="Status" /]
```

规则：

- `[view ...]` 对于新输出不再有效。
- 嵌入短代码仅在助手消息界面中渲染。
- 仅渲染 URL 支持的嵌入。使用 `ref="..."` 或 `url="..."`。
- 块形式内联 HTML 嵌入短代码不被渲染。
- Web UI 从可见文本中去除短代码并内联渲染嵌入。
- `MEDIA:` 不是嵌入别名，不应用于富嵌入渲染。

## 存储渲染形状

规范化/存储的助手内容块是结构化的 `canvas` 项目：

```json
{
  "type": "canvas",
  "preview": {
    "kind": "canvas",
    "surface": "assistant_message",
    "render": "url",
    "viewId": "cv_123",
    "url": "/__openclaw__/canvas/documents/cv_123/index.html",
    "title": "Status",
    "preferredHeight": 320
  }
}
```

存储/渲染的富块直接使用此 `canvas` 形状。`present_view` 不被识别。

## 相关链接

- [RPC 适配器](/reference/rpc)
- [Typebox](/concepts/typebox)
