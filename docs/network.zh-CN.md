---
summary: "网络中心：网关界面、配对、发现和安全性"
read_when:
  - 需要网络架构 + 安全概览时
  - 调试本地与 tailnet 访问或配对时
  - 想要规范的网络文档列表时
title: "网络"
---

# 网络中心

本中心链接了 OpenClaw 如何跨本地主机、局域网和 tailnet 连接、配对和保护设备的核心文档。

## 核心模型

大多数操作通过网关（`openclaw gateway`）流转，这是一个拥有频道连接和 WebSocket 控制平面的单一长运行进程。

- **回环优先**：网关 WS 默认为 `ws://127.0.0.1:18789`。非回环绑定需要有效的网关认证路径：共享密钥令牌/密码认证，或正确配置的非回环 `trusted-proxy` 部署。
- **每台主机一个网关**是推荐的。对于隔离，使用隔离配置文件和端口运行多个网关（[多个网关](/gateway/multiple-gateways)）。
- **Canvas 主机**在与网关相同的端口上提供服务（`/__openclaw__/canvas/`、`/__openclaw__/a2ui/`），当绑定超过回环时受网关认证保护。
- **远程访问**通常是 SSH 隧道或 Tailscale VPN（[远程访问](/gateway/remote)）。

关键参考：

- [网关架构](/concepts/architecture)
- [网关协议](/gateway/protocol)
- [网关手册](/gateway)
- [Web 界面 + 绑定模式](/web)

## 配对 + 身份

- [配对概览（DM + 节点）](/channels/pairing)
- [网关自有节点配对](/gateway/pairing)
- [设备 CLI（配对 + 令牌轮转）](/cli/devices)
- [配对 CLI（DM 审批）](/cli/pairing)

本地信任：

- 直接本地回环连接可以自动审批配对，以保持同主机 UX 的流畅性。
- OpenClaw 还有一个用于可信共享密钥辅助流的窄后端/容器本地自连接路径。
- Tailnet 和局域网客户端，包括同主机 tailnet 绑定，仍然需要明确的配对审批。

## 发现 + 传输

- [发现和传输](/gateway/discovery)
- [Bonjour / mDNS](/gateway/bonjour)
- [远程访问（SSH）](/gateway/remote)
- [Tailscale](/gateway/tailscale)

## 节点 + 传输

- [节点概览](/nodes)
- [桥接协议（传统节点，历史记录）](/gateway/bridge-protocol)
- [节点手册：iOS](/platforms/ios)
- [节点手册：Android](/platforms/android)

## 安全性

- [安全概览](/gateway/security)
- [网关配置参考](/gateway/configuration)
- [故障排除](/gateway/troubleshooting)
- [诊断工具](/gateway/doctor)

## 相关

- [网关网络模型](/gateway/network-model)
- [远程访问](/gateway/remote)
