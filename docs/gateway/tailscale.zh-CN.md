---
summary: "为网关仪表板集成 Tailscale Serve/Funnel"
read_when:
  - 在 localhost 之外暴露网关 Control UI 时
  - 自动化 tailnet 或公共仪表板访问时
title: "Tailscale"
---

OpenClaw 可以为网关仪表板和 WebSocket 端口自动配置 Tailscale **Serve**（tailnet）或 **Funnel**（公共）。这使网关保持绑定到环回，同时 Tailscale 提供 HTTPS、路由以及（对于 Serve）身份标头。

## 模式

- `serve`：通过 `tailscale serve` 的仅 tailnet Serve。网关保持在 `127.0.0.1`。
- `funnel`：通过 `tailscale funnel` 的公共 HTTPS。OpenClaw 需要共享密码。
- `off`：默认（无 Tailscale 自动化）。

状态和审计输出对这种 OpenClaw Serve/Funnel 模式使用 **Tailscale 暴露**。`off` 表示 OpenClaw 不管理 Serve 或 Funnel；它不表示本地 Tailscale 守护进程已停止或已退出。

## 认证

设置 `gateway.auth.mode` 来控制握手：

- `none`（仅私有入口）
- `token`（当 `OPENCLAW_GATEWAY_TOKEN` 已设置时默认）
- `password`（通过 `OPENCLAW_GATEWAY_PASSWORD` 或配置的共享密钥）
- `trusted-proxy`（身份感知反向代理；参见[受信任代理认证](/gateway/trusted-proxy-auth)）

当 `tailscale.mode = "serve"` 且 `gateway.auth.allowTailscale` 为 `true` 时，Control UI/WebSocket 认证可以使用 Tailscale 身份标头（`tailscale-user-login`），无需提供令牌/密码。OpenClaw 通过本地 Tailscale 守护进程（`tailscale whois`）解析 `x-forwarded-for` 地址并将其与标头匹配来验证身份，然后才接受它。OpenClaw 只有在请求从带有 Tailscale 的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host` 标头的环回到达时，才将请求视为 Serve。对于包含浏览器设备身份的 Control UI 操作员会话，此经过验证的 Serve 路径还跳过了设备配对往返。它不绕过浏览器设备身份：无设备客户端仍然被拒绝，节点角色或非 Control UI WebSocket 连接仍然遵循正常的配对和认证检查。HTTP API 端点（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`）**不**使用 Tailscale 身份标头认证。它们仍然遵循网关的正常 HTTP 认证模式：默认为共享密钥认证，或有意配置的受信任代理/私有入口 `none` 设置。此无令牌流假设网关主机是受信任的。如果不受信任的本地代码可能在同一主机上运行，请禁用 `gateway.auth.allowTailscale` 并改为要求令牌/密码认证。要求明确共享密钥凭据，请设置 `gateway.auth.allowTailscale: false` 并使用 `gateway.auth.mode: "token"` 或 `"password"`。

## 配置示例

### 仅 tailnet（Serve）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

打开：`https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

### 仅 tailnet（绑定到 Tailnet IP）

当你想要网关直接监听 Tailnet IP（无 Serve/Funnel）时使用此方法。

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

从另一个 Tailnet 设备连接：

- Control UI：`http://<tailscale-ip>:18789/`
- WebSocket：`ws://<tailscale-ip>:18789`

<Note>
在此模式下，环回（`http://127.0.0.1:18789`）将**无法**工作。
</Note>

### 公共互联网（Funnel + 共享密码）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password", password: "replace-me" },
  },
}
```

优先使用 `OPENCLAW_GATEWAY_PASSWORD` 而不是将密码提交到磁盘。

## CLI 示例

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## 说明

- Tailscale Serve/Funnel 需要安装 `tailscale` CLI 并登录。
- 除非认证模式为 `password` 以避免公共暴露，否则 `tailscale.mode: "funnel"` 会拒绝启动。
- 如果你想要 OpenClaw 在关闭时撤销 `tailscale serve` 或 `tailscale funnel` 配置，请设置 `gateway.tailscale.resetOnExit`。
- `gateway.bind: "tailnet"` 是直接 Tailnet 绑定（无 HTTPS，无 Serve/Funnel）。
- `gateway.bind: "auto"` 优先环回；如果你想要仅 Tailnet，请使用 `tailnet`。
- Serve/Funnel 只暴露**网关 Control UI + WS**。节点通过相同的网关 WS 端点连接，因此 Serve 可以用于节点访问。

## 浏览器控制（远程网关 + 本地浏览器）

如果你在一台机器上运行网关，但想要驱动另一台机器上的浏览器，请在浏览器机器上运行**节点主机**，并让两者保持在同一 tailnet 上。网关将代理浏览器操作到节点；不需要单独的控制服务器或 Serve URL。

避免将 Funnel 用于浏览器控制；将节点配对视为操作员访问。

## Tailscale 先决条件 + 限制

- Serve 需要为你的 tailnet 启用 HTTPS；如果缺少，CLI 会提示。
- Serve 注入 Tailscale 身份标头；Funnel 不注入。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、启用 HTTPS 和 funnel 节点属性。
- Funnel 只支持 TLS 上的端口 `443`、`8443` 和 `10000`。
- macOS 上的 Funnel 需要开源 Tailscale 应用变体。

## 了解更多

- Tailscale Serve 概述：[https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- `tailscale serve` 命令：[https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Tailscale Funnel 概述：[https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- `tailscale funnel` 命令：[https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

## 相关链接

- [远程访问](/gateway/remote)
- [发现](/gateway/discovery)
- [认证](/gateway/authentication)
