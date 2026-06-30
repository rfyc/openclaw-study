---
summary: "通过网关 HTTP 端点直接调用单个工具"
read_when:
  - 不运行完整代理轮次就调用工具时
  - 构建需要工具策略执行的自动化时
title: "工具调用 API"
---

# 工具调用（HTTP）

OpenClaw 的网关暴露了一个简单的 HTTP 端点，用于直接调用单个工具。它始终启用，并使用网关认证加上工具策略。与 OpenAI 兼容的 `/v1/*` 表面一样，共享密钥不记名认证被视为整个网关的受信任操作员访问。

- `POST /tools/invoke`
- 与网关相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/tools/invoke`

默认最大有效载荷大小为 2 MB。

## 认证

使用网关认证配置。

常见 HTTP 认证路径：

- 共享密钥认证（`gateway.auth.mode="token"` 或 `"password"`）：
  `Authorization: Bearer <token-or-password>`
- 受信任的身份承载 HTTP 认证（`gateway.auth.mode="trusted-proxy"`）：
  通过配置的身份感知代理路由，并让其注入所需的身份标头
- 私有入口开放认证（`gateway.auth.mode="none"`）：
  不需要认证标头

说明：

- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- 当 `gateway.auth.mode="trusted-proxy"` 时，HTTP 请求必须来自已配置的受信任代理源；同主机环回代理需要明确的 `gateway.auth.trustedProxy.allowLoopback = true`。
- 如果配置了 `gateway.auth.rateLimit` 且发生太多认证失败，端点将返回 `429` 并附带 `Retry-After`。

## 安全边界（重要）

将此端点视为网关实例的**完全操作员访问**表面。

- 此处的 HTTP 不记名认证不是狭窄的每用户范围模型。
- 此端点的有效网关令牌/密码应被视为所有者/操作员凭据。
- 对于共享密钥认证模式（`token` 和 `password`），即使调用者发送较窄的 `x-openclaw-scopes` 标头，端点也会恢复正常的完整操作员默认值。
- 共享密钥认证还将此端点上的直接工具调用视为所有者发送者轮次。
- 受信任的身份承载 HTTP 模式（例如受信任代理认证或私有入口上的 `gateway.auth.mode="none"`）在标头存在时遵循 `x-openclaw-scopes`，否则回退到正常操作员默认范围集。
- 仅在环回/tailnet/私有入口上保持此端点；不要将其直接暴露给公共互联网。

认证矩阵：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 证明拥有共享网关操作员密钥
  - 忽略较窄的 `x-openclaw-scopes`
  - 恢复完整的默认操作员范围集：
    `operator.admin`、`operator.approvals`、`operator.pairing`、
    `operator.read`、`operator.talk.secrets`、`operator.write`
  - 将此端点上的直接工具调用视为所有者发送者轮次
- 受信任的身份承载 HTTP 模式（例如受信任代理认证，或私有入口上的 `gateway.auth.mode="none"`）
  - 对某些外部受信任身份或部署边界进行身份验证
  - 当标头存在时遵循 `x-openclaw-scopes`
  - 当标头不存在时回退到正常操作员默认范围集
  - 只有当调用者明确缩小范围并省略 `operator.admin` 时才失去所有者语义

## 请求体

```json
{
  "tool": "sessions_list",
  "action": "json",
  "args": {},
  "sessionKey": "main",
  "dryRun": false
}
```

字段：

- `tool`（字符串，必须）：要调用的工具名称。
- `action`（字符串，可选）：如果工具架构支持 `action` 且 args 有效载荷省略了它，则映射到 args 中。
- `args`（对象，可选）：工具特定的参数。
- `sessionKey`（字符串，可选）：目标会话键。如果省略或为 `"main"`，网关使用配置的主会话键（遵循 `session.mainKey` 和默认代理，或全局范围中的 `global`）。
- `dryRun`（布尔值，可选）：保留供将来使用；目前被忽略。

## 策略 + 路由行为

工具可用性通过网关代理使用的相同策略链进行过滤：

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- 群组策略（如果会话键映射到群组或渠道）
- 子代理策略（使用子代理会话键调用时）

如果工具策略不允许某个工具，端点返回 **404**。

重要边界说明：

- Exec 批准是操作员护栏，而不是此 HTTP 端点的单独授权边界。如果通过网关认证 + 工具策略可以在此处访问工具，`/tools/invoke` 不会添加额外的每调用批准提示。
- 不要与不受信任的调用者共享网关不记名凭据。如果你需要跨信任边界的分离，请运行单独的网关（最好使用单独的操作系统用户/主机）。

网关 HTTP 默认还应用了硬拒绝列表（即使会话策略允许该工具）：

- `exec` — 直接命令执行（RCE 表面）
- `spawn` — 任意子进程创建（RCE 表面）
- `shell` — shell 命令执行（RCE 表面）
- `fs_write` — 主机上的任意文件变更
- `fs_delete` — 主机上的任意文件删除
- `fs_move` — 主机上的任意文件移动/重命名
- `apply_patch` — 补丁应用可以重写任意文件
- `sessions_spawn` — 会话编排；远程生成代理是 RCE
- `sessions_send` — 跨会话消息注入
- `cron` — 持久自动化控制平面
- `gateway` — 网关控制平面；通过 HTTP 防止重新配置
- `nodes` — 节点命令中继可以到达配对主机上的 system.run
- `whatsapp_login` — 需要终端 QR 扫描的交互式设置；在 HTTP 上挂起

你可以通过 `gateway.tools` 自定义此拒绝列表：

```json5
{
  gateway: {
    tools: {
      // 通过 HTTP /tools/invoke 阻止的其他工具
      deny: ["browser"],
      // 从默认拒绝列表中移除工具
      allow: ["gateway"],
    },
  },
}
```

要帮助群组策略解析上下文，你可以选择性地设置：

- `x-openclaw-message-channel: <channel>`（示例：`slack`、`telegram`）
- `x-openclaw-account-id: <accountId>`（当存在多个账户时）

## 响应

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }`（无效请求或工具输入错误）
- `401` → 未授权
- `429` → 认证速率限制（已设置 `Retry-After`）
- `404` → 工具不可用（未找到或不在允许列表中）
- `405` → 方法不允许
- `500` → `{ ok: false, error: { type, message } }`（意外的工具执行错误；已清理的消息）

## 示例

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer secret' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```

## 相关链接

- [网关协议](/gateway/protocol)
- [工具和插件](/tools)
