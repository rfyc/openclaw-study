---
summary: "网关、节点和 canvas 主机的连接方式。"
read_when:
  - 你想要简洁了解网关网络模型
title: "网络模型"
---

> 此内容已合并到 [网络](/network#core-model)。请参阅该页面获取当前指南。

大多数操作通过网关（`openclaw gateway`）流动，这是一个拥有渠道连接和 WebSocket 控制平面的单一长期运行进程。

## 核心规则

- 每台主机建议使用一个网关。它是唯一允许拥有 WhatsApp Web 会话的进程。对于救援机器人或严格隔离，请使用隔离的配置文件和端口运行多个网关。参见[多网关](/gateway/multiple-gateways)。
- 环回优先：网关 WS 默认为 `ws://127.0.0.1:18789`。向导默认创建共享密钥认证，通常会生成令牌，即使是环回也是如此。对于非环回访问，使用有效的网关认证路径：共享密钥令牌/密码认证，或正确配置的非环回 `trusted-proxy` 部署。Tailnet/移动设置通常通过 Tailscale Serve 或另一个 `wss://` 端点而不是原始 tailnet `ws://` 效果最好。
- 节点根据需要通过 LAN、tailnet 或 SSH 连接到网关 WS。旧版 TCP bridge 已被移除。
- Canvas 主机由网关 HTTP 服务器在与网关**相同端口**上提供服务（默认 `18789`）：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    当配置了 `gateway.auth` 且网关绑定超出环回时，这些路由受网关认证保护。节点客户端使用绑定到其活跃 WS 会话的节点范围功能 URL。参见[网关配置](/gateway/configuration)（`canvasHost`、`gateway`）。
- 远程使用通常通过 SSH 隧道或 tailnet VPN。参见[远程访问](/gateway/remote)和[发现](/gateway/discovery)。

## 相关链接

- [远程访问](/gateway/remote)
- [受信任代理认证](/gateway/trusted-proxy-auth)
- [网关协议](/gateway/protocol)
