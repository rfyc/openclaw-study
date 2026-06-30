---
summary: "从网关暴露 OpenAI 兼容的 /v1/chat/completions HTTP 端点"
read_when:
  - 集成期望 OpenAI Chat Completions 的工具
title: "OpenAI chat completions"
---

OpenClaw 的网关可以提供一个小型的 OpenAI 兼容 Chat Completions 端点。

此端点**默认禁用**。首先在配置中启用它。

- `POST /v1/chat/completions`
- 与网关相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/v1/chat/completions`

当网关的 OpenAI 兼容 HTTP 接口启用时，它还提供：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/responses`

在底层，请求作为正常的网关代理运行执行（与 `openclaw agent` 相同的代码路径），因此路由/权限/配置与你的网关匹配。

## 认证

使用网关认证配置。

常见的 HTTP 认证路径：

- 共享密钥认证（`gateway.auth.mode="token"` 或 `"password"`）：
  `Authorization: Bearer <token-or-password>`
- 受信任的身份承载 HTTP 认证（`gateway.auth.mode="trusted-proxy"`）：
  通过配置的身份感知代理路由，让其注入所需的身份标头
- 私有入口开放认证（`gateway.auth.mode="none"`）：
  不需要认证标头

注意事项：

- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- 当 `gateway.auth.mode="trusted-proxy"` 时，HTTP 请求必须来自配置的受信任代理源；同主机环回代理需要明确设置 `gateway.auth.trustedProxy.allowLoopback = true`。
- 如果配置了 `gateway.auth.rateLimit` 且发生太多认证失败，端点返回 `429` 并带有 `Retry-After`。

## 安全边界（重要）

将此端点视为网关实例的**完整操作员访问**接口。

- 此处的 HTTP bearer 认证不是窄范围的每用户范围模型。
- 此端点的有效网关令牌/密码应被视为所有者/操作员凭据。
- 请求通过与受信任操作员操作相同的控制平面代理路径运行。
- 此端点上没有单独的非所有者/每用户工具边界；一旦调用者通过此处的网关认证，OpenClaw 将该调用者视为此网关的受信任操作员。
- 对于共享密钥认证模式（`token` 和 `password`），即使调用者发送了更窄的 `x-openclaw-scopes` 标头，端点也会恢复正常的完整操作员默认值。
- 受信任的身份承载 HTTP 模式（例如受信任代理认证或 `gateway.auth.mode="none"`）在存在时遵守 `x-openclaw-scopes`，否则回退到正常的操作员默认范围集。
- 如果目标代理策略允许敏感工具，此端点可以使用它们。
- 仅将此端点保持在环回/tailnet/私有入口；不要将其直接暴露给公共互联网。

认证矩阵：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 证明拥有共享网关操作员密钥
  - 忽略更窄的 `x-openclaw-scopes`
  - 恢复完整的默认操作员范围集：
    `operator.admin`、`operator.approvals`、`operator.pairing`、
    `operator.read`、`operator.talk.secrets`、`operator.write`
  - 将此端点上的聊天轮次视为所有者发送者轮次
- 受信任的身份承载 HTTP 模式（例如受信任代理认证，或私有入口上的 `gateway.auth.mode="none"`）
  - 对某些外部受信任身份或部署边界进行认证
  - 当标头存在时遵守 `x-openclaw-scopes`
  - 当标头不存在时回退到正常的操作员默认范围集
  - 仅当调用者明确缩小范围并省略 `operator.admin` 时才失去所有者语义

参见[安全](/gateway/security)和[远程访问](/gateway/remote)。

## 代理优先模型合约

OpenClaw 将 OpenAI `model` 字段视为**代理目标**，而不是原始提供商模型 id。

- `model: "openclaw"` 路由到配置的默认代理。
- `model: "openclaw/default"` 也路由到配置的默认代理。
- `model: "openclaw/<agentId>"` 路由到特定代理。

可选请求标头：

- `x-openclaw-model: <provider/model-or-bare-id>` 覆盖所选代理的后端模型。
- `x-openclaw-agent-id: <agentId>` 作为兼容性覆盖仍然支持。
- `x-openclaw-session-key: <sessionKey>` 完全控制会话路由。
- `x-openclaw-message-channel: <channel>` 为渠道感知提示和策略设置合成入口渠道上下文。

仍然接受的兼容别名：

- `model: "openclaw:<agentId>"`
- `model: "agent:<agentId>"`

## 启用端点

将 `gateway.http.endpoints.chatCompletions.enabled` 设置为 `true`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true },
      },
    },
  },
}
```

## 禁用端点

将 `gateway.http.endpoints.chatCompletions.enabled` 设置为 `false`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: false },
      },
    },
  },
}
```

## 会话行为

默认情况下，端点是**每请求无状态**的（每次调用生成一个新的会话键）。

如果请求包含 OpenAI `user` 字符串，网关从中派生一个稳定的会话键，因此重复调用可以共享代理会话。

## 为什么这个接口很重要

这是自托管前端和工具的最高价值兼容性集：

- 大多数 Open WebUI、LobeChat 和 LibreChat 设置期望 `/v1/models`。
- 许多 RAG 系统期望 `/v1/embeddings`。
- 现有的 OpenAI 聊天客户端通常可以从 `/v1/chat/completions` 开始。
- 更多代理原生客户端越来越倾向于 `/v1/responses`。

## 模型列表和代理路由

<AccordionGroup>
  <Accordion title="`/v1/models` 返回什么？">
    OpenClaw 代理目标列表。

    返回的 id 是 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>` 条目。
    直接将它们用作 OpenAI `model` 值。

  </Accordion>
  <Accordion title="`/v1/models` 是否列出代理或子代理？">
    它列出顶级代理目标，而不是后端提供商模型，也不是子代理。

    子代理仍然是内部执行拓扑。它们不显示为伪模型。

  </Accordion>
  <Accordion title="为什么包含 `openclaw/default`？">
    `openclaw/default` 是配置的默认代理的稳定别名。

    这意味着即使实际默认代理 id 在环境之间更改，客户端也可以继续使用一个可预测的 id。

  </Accordion>
  <Accordion title="如何覆盖后端模型？">
    使用 `x-openclaw-model`。

    示例：
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    如果省略，所选代理以其正常配置的模型选择运行。

  </Accordion>
  <Accordion title="嵌入如何符合此合约？">
    `/v1/embeddings` 使用相同的代理目标 `model` id。

    使用 `model: "openclaw/default"` 或 `model: "openclaw/<agentId>"`。
    当你需要特定的嵌入模型时，在 `x-openclaw-model` 中发送它。
    没有该标头时，请求传递到所选代理的正常嵌入设置。

  </Accordion>
</AccordionGroup>

## 流式传输（SSE）

设置 `stream: true` 以接收服务器发送事件（SSE）：

- `Content-Type: text/event-stream`
- 每个事件行是 `data: <json>`
- 流以 `data: [DONE]` 结束

## Open WebUI 快速设置

基本的 Open WebUI 连接：

- 基础 URL：`http://127.0.0.1:18789/v1`
- macOS 上 Docker 的基础 URL：`http://host.docker.internal:18789/v1`
- API 密钥：你的网关 bearer 令牌
- 模型：`openclaw/default`

预期行为：

- `GET /v1/models` 应列出 `openclaw/default`
- Open WebUI 应使用 `openclaw/default` 作为聊天模型 id
- 如果你想要该代理的特定后端提供商/模型，设置代理的正常默认模型或发送 `x-openclaw-model`

快速测试：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

如果返回 `openclaw/default`，大多数 Open WebUI 设置可以使用相同的基础 URL 和令牌连接。

## 示例

非流式：

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

流式：

```bash
curl -N http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-model: openai/gpt-5.4' \
  -d '{
    "model": "openclaw/research",
    "stream": true,
    "messages": [{"role":"user","content":"hi"}]
  }'
```

列出模型：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

获取单个模型：

```bash
curl -sS http://127.0.0.1:18789/v1/models/openclaw%2Fdefault \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

创建嵌入：

```bash
curl -sS http://127.0.0.1:18789/v1/embeddings \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-model: openai/text-embedding-3-small' \
  -d '{
    "model": "openclaw/default",
    "input": ["alpha", "beta"]
  }'
```

注意事项：

- `/v1/models` 返回 OpenClaw 代理目标，而不是原始提供商目录。
- `openclaw/default` 始终存在，因此一个稳定的 id 可以在所有环境中使用。
- 后端提供商/模型覆盖属于 `x-openclaw-model`，而不是 OpenAI `model` 字段。
- `/v1/embeddings` 支持 `input` 作为字符串或字符串数组。

## 相关链接

- [配置参考](/gateway/configuration-reference)
- [OpenAI](/providers/openai)
