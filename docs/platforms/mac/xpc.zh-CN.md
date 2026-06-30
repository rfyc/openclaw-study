---
summary: "OpenClaw 应用、网关节点传输和 PeekabooBridge 的 macOS IPC 架构"
read_when:
  - 编辑 IPC 合约或菜单栏应用 IPC
title: "macOS IPC"
---

# OpenClaw macOS IPC 架构

**当前模型：** 本地 Unix 套接字将**节点主机服务**连接到 **macOS 应用**，用于执行批准 + `system.run`。`openclaw-mac` 调试 CLI 存在用于发现/连接检查；智能体操作仍通过 Gateway WebSocket 和 `node.invoke` 流动。UI 自动化使用 PeekabooBridge。

## 目标

- 单一 GUI 应用实例，拥有所有面向 TCC 的工作（通知、屏幕录制、麦克风、语音、AppleScript）。
- 小型自动化接口：Gateway + 节点命令，以及 PeekabooBridge 用于 UI 自动化。
- 可预测的权限：始终相同的签名包 ID，由 launchd 启动，因此 TCC 授予持久存在。

## 工作原理

### Gateway + 节点传输

- 应用运行 Gateway（本地模式）并作为节点连接到它。
- 智能体操作通过 `node.invoke` 执行（例如 `system.run`、`system.notify`、`canvas.*`）。

### 节点服务 + 应用 IPC

- 无头节点主机服务连接到 Gateway WebSocket。
- `system.run` 请求通过本地 Unix 套接字转发到 macOS 应用。
- 应用在 UI 上下文中执行，如需提示，并返回输出。

图表（SCI）：

```
Agent -> Gateway -> Node Service (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  Mac App (UI + TCC + system.run)
```

### PeekabooBridge（UI 自动化）

- UI 自动化使用名为 `bridge.sock` 的独立 UNIX 套接字和 PeekabooBridge JSON 协议。
- 主机偏好顺序（客户端侧）：Peekaboo.app → Claude.app → OpenClaw.app → 本地执行。
- 安全：桥接主机需要允许的 TeamID；DEBUG 模式下的同一 UID 逃生舱由 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（Peekaboo 约定）保护。
- 参见：[PeekabooBridge 用法](/platforms/mac/peekaboo) 了解详情。

## 操作流程

- 重启/重建：`SIGN_IDENTITY="Apple Development: <Developer Name> (<TEAMID>)" scripts/restart-mac.sh`
  - 终止现有实例
  - Swift 构建 + 打包
  - 写入/引导/启动 LaunchAgent
- 单实例：如果另一个具有相同捆绑包 ID 的实例正在运行，应用提前退出。

## 加固说明

- 优先为所有特权接口要求 TeamID 匹配。
- PeekabooBridge：`PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（仅限 DEBUG）可能允许同一 UID 调用者用于本地开发。
- 所有通信保持仅本地；不暴露网络套接字。
- TCC 提示仅来自 GUI 应用包；在重建之间保持签名的包 ID 稳定。
- IPC 加固：套接字模式 `0600`、令牌、对端 UID 检查、HMAC 挑战/响应、短 TTL。

## 相关

- [macOS 应用](/platforms/macos)
- [macOS IPC 流程（执行批准）](/tools/exec-approvals-advanced#macos-ipc-flow)
