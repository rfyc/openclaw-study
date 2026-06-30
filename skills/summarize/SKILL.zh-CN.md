---
name: summarize
description: 总结或转录 URL、YouTube/视频、播客、文章、对话记录、PDF 和本地文件。
homepage: https://summarize.sh
metadata:
  {
    "openclaw":
      {
        "emoji": "🧾",
        "requires": { "bins": ["summarize"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "steipete/tap/summarize",
              "bins": ["summarize"],
              "label": "Install summarize (brew)",
            },
          ],
      },
  }
---

# Summarize

快速 CLI，用于总结 URL、本地文件和 YouTube 链接。

## 使用时机（触发短语）

当用户询问以下任何内容时，立即使用此 skill：

- "use summarize.sh"
- "这个链接/视频是关于什么的？"
- "总结这个 URL/文章"
- "转录这个 YouTube/视频"（尽力提取对话记录；不需要 `yt-dlp`）

## 快速入门

```bash
summarize "https://example.com" --model google/gemini-3-flash-preview
summarize "/path/to/file.pdf" --model google/gemini-3-flash-preview
summarize "https://youtu.be/dQw4w9WgXcQ" --youtube auto
```

## YouTube：总结 vs 转录

尽力提取对话记录（仅限 URL）：

```bash
summarize "https://youtu.be/dQw4w9WgXcQ" --youtube auto --extract-only
```

如果用户请求转录但内容很长，先返回精简摘要，然后询问要展开哪个章节/时间段。

## 模型 + 密钥

为所选提供商设置 API 密钥：

- OpenAI：`OPENAI_API_KEY`
- Anthropic：`ANTHROPIC_API_KEY`
- xAI：`XAI_API_KEY`
- Google：`GEMINI_API_KEY`（别名：`GOOGLE_GENERATIVE_AI_API_KEY`、`GOOGLE_API_KEY`）

未设置时默认模型为 `google/gemini-3-flash-preview`。

## 常用参数

- `--length short|medium|long|xl|xxl|<chars>`
- `--max-output-tokens <count>`
- `--extract-only`（仅限 URL）
- `--json`（机器可读格式）
- `--firecrawl auto|off|always`（回退提取）
- `--youtube auto`（设置 `APIFY_API_TOKEN` 后使用 Apify 回退）

## 配置

可选配置文件：`~/.summarize/config.json`

```json
{ "model": "openai/gpt-5.2" }
```

可选服务：

- `FIRECRAWL_API_KEY` 用于访问受限网站
- `APIFY_API_TOKEN` 用于 YouTube 回退
