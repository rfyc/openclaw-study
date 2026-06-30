---
summary: "从网关暴露 OpenResponses 兼容的 /v1/responses HTTP 端点"
read_when:
  - 集成使用 OpenResponses API 的客户端
  - 你想要基于项目的输入、客户端工具调用或 SSE 事件
title: "OpenResponses API"
---

OpenClaw 的网关可以提供 OpenResponses 兼容的 `POST /v1/responses` 端点。

此端点**默认禁用**。首先在配置中启用它。

- `POST /v1/responses`
- 与网关相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/v1/responses`

在底层，请求作为正常的网关代理运行执行（与 `openclaw agent` 相同的代码路径），因此路由/权限/配置与你的网关匹配。

## 认证、安全和路由

操作行为与 [OpenAI Chat Completions](/gateway/openai-http-api) 匹配：

- 使用匹配的网关 HTTP 认证路径：
  - 共享密钥认证（`gateway.auth.mode="token"` 或 `"password"`）：`Authorization: Bearer <token-or-password>`
  - 受信任代理认证（`gateway.auth.mode="trusted-proxy"`）：来自配置的受信任代理源的身份感知代理标头；同主机环回代理需要明确设置 `gateway.auth.trustedProxy.allowLoopback = true`
  - 私有入口开放认证（`gateway.auth.mode="none"`）：不需要认证标头
- 将端点视为网关实例的完整操作员访问
- 对于共享密钥认证模式（`token` 和 `password`），忽略更窄的 bearer 声明的 `x-openclaw-scopes` 值，恢复正常的完整操作员默认值
- 对于受信任的身份承载 HTTP 模式（例如受信任代理认证或 `gateway.auth.mode="none"`），在存在时遵守 `x-openclaw-scopes`，否则回退到正常的操作员默认范围集
- 使用 `model: "openclaw"`、`model: "openclaw/default"`、`model: "openclaw/<agentId>"` 或 `x-openclaw-agent-id` 选择代理
- 当你想要覆盖所选代理的后端模型时使用 `x-openclaw-model`
- 使用 `x-openclaw-session-key` 进行明确的会话路由
- 当你想要非默认的合成入口渠道上下文时使用 `x-openclaw-message-channel`

认证矩阵：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 证明拥有共享网关操作员密钥
  - 忽略更窄的 `x-openclaw-scopes`
  - 恢复完整的默认操作员范围集：
    `operator.admin`、`operator.approvals`、`operator.pairing`、
    `operator.read`、`operator.talk.secrets`、`operator.write`
  - 将此端点上的聊天轮次视为所有者发送者轮次
- 受信任的身份承载 HTTP 模式（例如受信任代理认证，或私有入口上的 `gateway.auth.mode="none"`）
  - 在标头存在时遵守 `x-openclaw-scopes`
  - 标头不存在时回退到正常的操作员默认范围集
  - 仅当调用者明确缩小范围并省略 `operator.admin` 时才失去所有者语义

使用 `gateway.http.endpoints.responses.enabled` 启用或禁用此端点。

相同的兼容性接口还包括：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`

有关代理目标模型、`openclaw/default`、嵌入传递和后端模型覆盖如何组合的规范说明，请参阅 [OpenAI Chat Completions](/gateway/openai-http-api#agent-first-model-contract) 和[模型列表和代理路由](/gateway/openai-http-api#model-list-and-agent-routing)。

## 会话行为

默认情况下，端点是**每请求无状态**的（每次调用生成一个新的会话键）。

如果请求包含 OpenResponses `user` 字符串，网关从中派生一个稳定的会话键，因此重复调用可以共享代理会话。

## 请求结构（支持的）

请求遵循带有基于项目输入的 OpenResponses API。当前支持：

- `input`：字符串或项目对象数组。
- `instructions`：合并到系统提示中。
- `tools`：客户端工具定义（函数工具）。
- `tool_choice`：过滤或要求客户端工具。
- `stream`：启用 SSE 流式传输。
- `max_output_tokens`：尽力而为的输出限制（取决于提供商）。
- `user`：稳定的会话路由。

已接受但**当前忽略**：

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `truncation`

支持：

- `previous_response_id`：当请求保持在同一代理/用户/请求会话范围内时，OpenClaw 重用之前的响应会话。

## 项目（输入）

### `message`

角色：`system`、`developer`、`user`、`assistant`。

- `system` 和 `developer` 追加到系统提示。
- 最近的 `user` 或 `function_call_output` 项目成为"当前消息"。
- 之前的用户/助手消息作为历史上下文包含在内。

### `function_call_output`（基于轮次的工具）

将工具结果发送回模型：

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` 和 `item_reference`

接受以满足模式兼容性，但在构建提示时被忽略。

## 工具（客户端函数工具）

使用 `tools: [{ type: "function", function: { name, description?, parameters? } }]` 提供工具。

如果代理决定调用工具，响应返回一个 `function_call` 输出项目。然后你发送带有 `function_call_output` 的后续请求以继续轮次。

## 图像（`input_image`）

支持 base64 或 URL 源：

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

允许的 MIME 类型（当前）：`image/jpeg`、`image/png`、`image/gif`、`image/webp`、`image/heic`、`image/heif`。
最大大小（当前）：10MB。

## 文件（`input_file`）

支持 base64 或 URL 源：

```json
{
  "type": "input_file",
  "source": {
    "type": "base64",
    "media_type": "text/plain",
    "data": "SGVsbG8gV29ybGQh",
    "filename": "hello.txt"
  }
}
```

允许的 MIME 类型（当前）：`text/plain`、`text/markdown`、`text/html`、`text/csv`、
`application/json`、`application/pdf`。

最大大小（当前）：5MB。

当前行为：

- 文件内容被解码并添加到**系统提示**，而不是用户消息，因此它保持临时性（不在会话历史中持久化）。
- 解码的文件文本在添加之前被包装为**不受信任的外部内容**，因此文件字节被视为数据，而不是受信任的指令。
- 注入的块使用明确的边界标记，如 `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` / `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>` 并包含 `Source: External` 元数据行。
- 此文件输入路径有意省略了长的 `SECURITY NOTICE:` 横幅以节省提示预算；边界标记和元数据仍然保留。
- PDF 首先解析文本。如果找到的文本很少，前几页被光栅化为图像并传递给模型，注入的文件块使用占位符 `[PDF content rendered to images]`。

PDF 解析由捆绑的 `document-extract` 插件提供，它使用 Node 友好的 `pdfjs-dist` 旧版构建（无 worker）。现代 PDF.js 构建期望浏览器 workers/DOM 全局变量，因此不在网关中使用。

URL 获取默认值：

- `files.allowUrl`：`true`
- `images.allowUrl`：`true`
- `maxUrlParts`：`8`（每个请求总计基于 URL 的 `input_file` + `input_image` 部分）
- 请求受到保护（DNS 解析、私有 IP 阻断、重定向上限、超时）。
- 支持每输入类型的可选主机名允许列表（`files.urlAllowlist`、`images.urlAllowlist`）。
  - 精确主机：`"cdn.example.com"`
  - 通配符子域：`"*.assets.example.com"`（不匹配顶级域）
  - 空或省略的允许列表意味着没有主机名允许列表限制。
- 要完全禁用基于 URL 的获取，设置 `files.allowUrl: false` 和/或 `images.allowUrl: false`。

## 文件 + 图像限制（配置）

可以在 `gateway.http.endpoints.responses` 下调整默认值：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: {
          enabled: true,
          maxBodyBytes: 20000000,
          maxUrlParts: 8,
          files: {
            allowUrl: true,
            urlAllowlist: ["cdn.example.com", "*.assets.example.com"],
            allowedMimes: [
              "text/plain",
              "text/markdown",
              "text/html",
              "text/csv",
              "application/json",
              "application/pdf",
            ],
            maxBytes: 5242880,
            maxChars: 200000,
            maxRedirects: 3,
            timeoutMs: 10000,
            pdf: {
              maxPages: 4,
              maxPixels: 4000000,
              minTextChars: 200,
            },
          },
          images: {
            allowUrl: true,
            urlAllowlist: ["images.example.com"],
            allowedMimes: [
              "image/jpeg",
              "image/png",
              "image/gif",
              "image/webp",
              "image/heic",
              "image/heif",
            ],
            maxBytes: 10485760,
            maxRedirects: 3,
            timeoutMs: 10000,
          },
        },
      },
    },
  },
}
```

省略时的默认值：

- `maxBodyBytes`：20MB
- `maxUrlParts`：8
- `files.maxBytes`：5MB
- `files.maxChars`：200k
- `files.maxRedirects`：3
- `files.timeoutMs`：10s
- `files.pdf.maxPages`：4
- `files.pdf.maxPixels`：4,000,000
- `files.pdf.minTextChars`：200
- `images.maxBytes`：10MB
- `images.maxRedirects`：3
- `images.timeoutMs`：10s
- HEIC/HEIF `input_image` 源被接受，并在提供商交付之前规范化为 JPEG。

安全注意事项：

- URL 允许列表在获取和重定向跳转之前强制执行。
- 将主机名加入允许列表不会绕过私有/内部 IP 阻断。
- 对于面向互联网的网关，除了应用级保护外，还要应用网络出口控制。
  参见[安全](/gateway/security)。

## 流式传输（SSE）

设置 `stream: true` 以接收服务器发送事件（SSE）：

- `Content-Type: text/event-stream`
- 每个事件行是 `event: <type>` 和 `data: <json>`
- 流以 `data: [DONE]` 结束

当前发出的事件类型：

- `response.created`
- `response.in_progress`
- `response.output_item.added`
- `response.content_part.added`
- `response.output_text.delta`
- `response.output_text.done`
- `response.content_part.done`
- `response.output_item.done`
- `response.completed`
- `response.failed`（出错时）

## 使用情况

当底层提供商报告令牌计数时，`usage` 会被填充。OpenClaw 在这些计数器到达下游状态/会话接口之前规范化常见的 OpenAI 样式别名，包括 `input_tokens` / `output_tokens` 和 `prompt_tokens` / `completion_tokens`。

## 错误

错误使用如下 JSON 对象：

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

常见情况：

- `401` 缺少/无效认证
- `400` 无效请求体
- `405` 错误的方法

## 示例

非流式：

```bash
curl -sS http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "input": "hi"
  }'
```

流式：

```bash
curl -N http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "stream": true,
    "input": "hi"
  }'
```

## 相关链接

- [OpenAI chat completions](/gateway/openai-http-api)
- [OpenAI](/providers/openai)
