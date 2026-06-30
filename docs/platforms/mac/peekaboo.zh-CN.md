---
summary: "macOS UI 自动化的 PeekabooBridge 集成"
read_when:
  - 在 OpenClaw.app 中托管 PeekabooBridge
  - 通过 Swift Package Manager 集成 Peekaboo
  - 更改 PeekabooBridge 协议/路径
  - 在 PeekabooBridge、Codex Computer Use 和 cua-driver MCP 之间做选择
title: "Peekaboo 桥接"
---

OpenClaw 可以将 **PeekabooBridge** 托管为本地、权限感知的 UI 自动化
代理。这让 `peekaboo` CLI 可以驱动 UI 自动化，同时复用
macOS 应用的 TCC 权限。

## 这是什么（以及不是什么）

- **主机**：OpenClaw.app 可以作为 PeekabooBridge 主机。
- **客户端**：使用 `peekaboo` CLI（没有单独的 `openclaw ui ...` 接口）。
- **UI**：视觉叠加层保留在 Peekaboo.app 中；OpenClaw 是一个精简的代理主机。

## 与 Computer Use 的关系

OpenClaw 有三个桌面控制路径，它们有意保持独立：

- **PeekabooBridge 主机**：OpenClaw.app 可以托管本地 PeekabooBridge 套接字。
  `peekaboo` CLI 仍然是客户端，使用 OpenClaw.app 的 macOS
  权限来实现 Peekaboo 自动化原语，如截图、点击、
  菜单、对话框、Dock 操作和窗口管理。
- **Codex Computer Use**：内置的 `codex` 插件准备 Codex app-server，
  验证 Codex 的 `computer-use` MCP 服务器是否可用，然后让
  Codex 在 Codex 模式轮次期间拥有原生桌面控制工具调用。OpenClaw
  不通过 PeekabooBridge 代理这些操作。
- **直接 `cua-driver` MCP**：OpenClaw 可以将 TryCua 的上游
  `cua-driver mcp` 服务器注册为普通 MCP 服务器。这给智能体提供
  CUA 驱动程序自身的模式和 pid/window/element-index 工作流，无需通过
  Codex 市场或 PeekabooBridge 套接字路由。

当你想要广泛的 macOS 自动化接口和 OpenClaw.app 的
权限感知桥接主机时，使用 Peekaboo。当 Codex 模式智能体
应该依赖 Codex 的原生 computer-use 插件时，使用 Codex Computer Use。当你想要
CUA 驱动程序作为普通 MCP 服务器暴露给任何 OpenClaw 管理的运行时时，使用直接 `cua-driver mcp`。

## 启用桥接

在 macOS 应用中：

- 设置 → **启用 Peekaboo 桥接**

启用后，OpenClaw 启动本地 UNIX 套接字服务器。禁用后，主机
停止，`peekaboo` 将回退到其他可用主机。

## 客户端发现顺序

Peekaboo 客户端通常按以下顺序尝试主机：

1. Peekaboo.app（完整 UX）
2. Claude.app（如已安装）
3. OpenClaw.app（精简代理）

使用 `peekaboo bridge status --verbose` 查看哪个主机活跃以及
使用了哪个套接字路径。你可以通过以下方式覆盖：

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## 安全与权限

- 桥接验证**调用者代码签名**；强制执行 TeamID 允许列表（Peekaboo 主机 TeamID + OpenClaw 应用 TeamID）。
- 请求在约 10 秒后超时。
- 如果缺少所需权限，桥接返回清晰的错误消息
  而不是启动系统设置。

## 快照行为（自动化）

快照存储在内存中，并在短暂窗口后自动过期。
如果你需要更长时间保留，从客户端重新捕获。

## 故障排除

- 如果 `peekaboo` 报告"桥接客户端未授权"，确保客户端已
  正确签名，或仅在**调试**模式下以 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`
  运行主机。
- 如果找不到主机，打开其中一个主机应用（Peekaboo.app 或 OpenClaw.app）
  并确认已授予权限。

## 相关

- [macOS 应用](/platforms/macos)
- [macOS 权限](/platforms/mac/permissions)
