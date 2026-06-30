---
summary: "Gateway web 界面：控制 UI、绑定模式和安全性"
read_when:
  - 你想通过 Tailscale 访问 Gateway
  - 你想要浏览器控制 UI 和配置编辑
title: "Web"
---

Gateway 从与 Gateway WebSocket 相同的端口提供小型**浏览器控制 UI**（Vite + Lit）：

- 默认：`http://<host>:18789/`
- 当 `gateway.tls.enabled: true` 时：`https://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

功能详见[控制 UI](/web/control-ui)。本页其余部分重点介绍绑定模式、安全性和面向 Web 的界面。

## Webhooks

当 `hooks.enabled=true` 时，Gateway 还在同一 HTTP 服务器上暴露小型 webhook 端点。
有关认证和载荷，请参阅[Gateway 配置](/gateway/configuration) → `hooks`。

## 配置（默认开启）

当资产存在（`dist/control-ui`）时，控制 UI 默认**启用**。
你可以通过配置控制它：

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath 可选
  },
}
```

## Tailscale 访问

### 集成 Serve（推荐）

将 Gateway 保持在回环，让 Tailscale Serve 代理它：

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

然后启动 gateway：

```bash
openclaw gateway
```

打开：

- `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

### Tailnet 绑定 + 令牌

```json5
{
  gateway: {
    bind: "tailnet",
    controlUi: { enabled: true },
    auth: { mode: "token", token: "your-token" },
  },
}
```

然后启动 gateway（此非回环示例使用共享密钥令牌认证）：

```bash
openclaw gateway
```

打开：

- `http://<tailscale-ip>:18789/`（或你配置的 `gateway.controlUi.basePath`）

### 公共互联网（Funnel）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password" }, // 或 OPENCLAW_GATEWAY_PASSWORD
  },
}
```

## 安全说明

- 默认情况下需要 Gateway 认证（令牌、密码、可信代理，或启用时通过 Tailscale Serve 身份标头）。
- 非回环绑定仍然**需要** gateway 认证。实际上这意味着令牌/密码认证或带 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。
- 向导默认创建共享密钥认证，通常生成 gateway 令牌（即使在回环上）。
- 在共享密钥模式下，UI 发送 `connect.params.auth.token` 或 `connect.params.auth.password`。
- 当 `gateway.tls.enabled: true` 时，本地仪表盘和状态助手渲染 `https://` 仪表盘 URL 和 `wss://` WebSocket URL。
- 在 Tailscale Serve 或 `trusted-proxy` 等身份承载模式中，WebSocket 认证检查从请求标头满足。
- 对于非回环控制 UI 部署，明确设置 `gateway.controlUi.allowedOrigins`（完整来源）。没有它，默认情况下 gateway 启动被拒绝。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用 Host 标头来源回退模式，但这是危险的安全降级。
- 使用 Serve 时，当 `gateway.auth.allowTailscale` 为 `true` 时，Tailscale 身份标头可以满足控制 UI/WebSocket 认证（不需要令牌/密码）。HTTP API 端点不使用这些 Tailscale 身份标头；它们遵循 gateway 的正常 HTTP 认证模式。设置 `gateway.auth.allowTailscale: false` 以要求明确凭据。参阅 [Tailscale](/gateway/tailscale) 和[安全](/gateway/security)。此无令牌流假设 gateway 主机是受信任的。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共享密码）。

## 构建 UI

Gateway 从 `dist/control-ui` 提供静态文件。使用以下命令构建：

```bash
pnpm ui:build
```
