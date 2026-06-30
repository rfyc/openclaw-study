---
summary: "使用原生提供商支持和提取回退分析一个或多个 PDF 文档"
title: "PDF 工具"
read_when:
  - 你想从代理中分析 PDF
  - 你需要确切的 pdf 工具参数和限制
  - 你正在调试原生 PDF 模式与提取回退
---

`pdf` 分析一个或多个 PDF 文档并返回文本。

快速行为：

- 适用于 Anthropic 和 Google 模型提供商的原生提供商模式。
- 其他提供商的提取回退模式（先提取文本，必要时提取页面图片）。
- 支持单个（`pdf`）或多个（`pdfs`）输入，每次调用最多 10 个 PDF。

## 可用性

仅当 OpenClaw 可以为代理解析 PDF 能力的模型配置时才注册该工具：

1. `agents.defaults.pdfModel`
2. 回退到 `agents.defaults.imageModel`
3. 回退到代理解析的会话/默认模型
4. 如果原生 PDF 提供商有认证支持，则优先于通用图像回退候选

如果无法解析可用的模型，`pdf` 工具不会暴露。

可用性说明：

- 回退链是认证感知的。配置的 `provider/model` 仅在 OpenClaw 确实能够为代理认证该提供商时才有效。
- 原生 PDF 提供商目前是 **Anthropic** 和 **Google**。
- 如果解析的会话/默认提供商已经有配置的视觉/PDF 模型，PDF 工具会在回退到其他认证支持的提供商之前复用该模型。

## 输入参考

<ParamField path="pdf" type="string">
一个 PDF 路径或 URL。
</ParamField>

<ParamField path="pdfs" type="string[]">
多个 PDF 路径或 URL，总计最多 10 个。
</ParamField>

<ParamField path="prompt" type="string" default="Analyze this PDF document.">
分析提示。
</ParamField>

<ParamField path="pages" type="string">
页面过滤器，如 `1-5` 或 `1,3,7-9`。
</ParamField>

<ParamField path="model" type="string">
可选的模型覆盖，格式为 `provider/model`。
</ParamField>

<ParamField path="maxBytesMb" type="number">
每个 PDF 的大小限制（MB）。默认为 `agents.defaults.pdfMaxBytesMb` 或 `10`。
</ParamField>

输入说明：

- `pdf` 和 `pdfs` 在加载前会被合并和去重。
- 如果未提供 PDF 输入，工具报错。
- `pages` 解析为基于 1 的页码，去重、排序并限制到配置的最大页数。
- `maxBytesMb` 默认为 `agents.defaults.pdfMaxBytesMb` 或 `10`。

## 支持的 PDF 引用

- 本地文件路径（包括 `~` 扩展）
- `file://` URL
- `http://` 和 `https://` URL
- OpenClaw 管理的入站引用，如 `media://inbound/<id>`

引用说明：

- 其他 URI 方案（如 `ftp://`）会被拒绝并返回 `unsupported_pdf_reference`。
- 在沙箱模式下，远程 `http(s)` URL 会被拒绝。
- 启用仅工作区文件策略时，允许根目录之外的本地文件路径会被拒绝。
- 在 OpenClaw 入站媒体存储下的受管理入站引用和重放路径允许使用仅工作区文件策略。

## 执行模式

### 原生提供商模式

原生模式用于提供商 `anthropic` 和 `google`。工具直接向提供商 API 发送原始 PDF 字节。

原生模式限制：

- 不支持 `pages`。如果设置，工具返回错误。
- 支持多 PDF 输入；每个 PDF 在提示之前作为原生文档块/内联 PDF 部分发送。

### 提取回退模式

回退模式用于非原生提供商。

流程：

1. 从选定页面提取文本（最多 `agents.defaults.pdfMaxPages`，默认 `20`）。
2. 如果提取的文本长度低于 `200` 字符，则渲染选定页面为 PNG 图像并包含它们。
3. 将提取的内容加上提示发送到选定的模型。

回退详情：

- 页面图像提取使用 `4,000,000` 的像素预算。
- 如果目标模型不支持图像输入且没有可提取的文本，工具报错。
- 如果文本提取成功但图像提取需要仅文本模型上的视觉，OpenClaw 会丢弃渲染的图像并继续处理提取的文本。
- 提取回退使用捆绑的 `document-extract` 插件。该插件拥有 `pdfjs-dist`；`@napi-rs/canvas` 仅在图像渲染回退可用时使用。

## 配置

```json5
{
  agents: {
    defaults: {
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5.4-mini"],
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
    },
  },
}
```

完整的字段详情请参阅[配置参考](/gateway/configuration-reference)。

## 输出详情

工具在 `content[0].text` 中返回文本，在 `details` 中返回结构化元数据。

常见 `details` 字段：

- `model`：已解析的模型引用（`provider/model`）
- `native`：原生提供商模式为 `true`，回退为 `false`
- `attempts`：成功前失败的回退尝试

路径字段：

- 单个 PDF 输入：`details.pdf`
- 多个 PDF 输入：带有 `pdf` 条目的 `details.pdfs[]`
- 沙箱路径重写元数据（适用时）：`rewrittenFrom`

## 错误行为

- 缺少 PDF 输入：抛出 `pdf required: provide a path or URL to a PDF document`
- PDF 过多：在 `details.error = "too_many_pdfs"` 中返回结构化错误
- 不支持的引用方案：返回 `details.error = "unsupported_pdf_reference"`
- 使用 `pages` 的原生模式：抛出明确的 `pages is not supported with native PDF providers` 错误

## 示例

单个 PDF：

```json
{
  "pdf": "/tmp/report.pdf",
  "prompt": "Summarize this report in 5 bullets"
}
```

多个 PDF：

```json
{
  "pdfs": ["/tmp/q1.pdf", "/tmp/q2.pdf"],
  "prompt": "Compare risks and timeline changes across both documents"
}
```

页面过滤的回退模型：

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5.4-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

## 相关链接

- [工具概览](/tools) — 所有可用代理工具
- [配置参考](/gateway/config-agents#agent-defaults) — pdfMaxBytesMb 和 pdfMaxPages 配置
