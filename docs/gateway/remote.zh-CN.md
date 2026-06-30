---
summary: "使用 SSH 隧道（网关 WS）和 tailnet 进行远程访问"
read_when:
  - 运行或排查远程网关设置问题
title: "远程访问"
---

本仓库通过将单个网关（主网关）运行在专用主机（桌面/服务器）上，并将客户端连接到该主机来支持"通过 SSH 远程"。

- 对于**操作员（你/macOS 应用）**：SSH 隧道是通用回退。
- 对于**节点（iOS/Android 和未来设备）**：连接到网关 **WebSocket**（根据需要使用 LAN/tailnet 或 SSH 隧道）。

## 核心思想

- 网关 WebSocket 绑定到你配置的端口（默认 18789）上的**环回**。
- 对于远程使用，你通过 SSH 转发该环回端口（或使用 tailnet/VPN 减少隧道需求）。

## 常见 VPN 和 tailnet 设置

将**网关主机**视为代理所在的地方。它拥有会话、认证配置文件、渠道和状态。你的笔记本电脑、桌面和节点连接到该主机。

### tailnet 中的始终在线网关

在持久主机（VPS 或家庭服务器）上运行网关，并通过 **Tailscale** 或 SSH 访问它。

- **最佳用户体验**：保持 `gateway.bind: "loopback"` 并使用 **Tailscale Serve** 用于 Control UI。
- **回退**：保持环回加任何需要访问的机器的 SSH 隧道。
- **示例**：[exe.dev](/install/exe-dev)（简单 VM）或 [Hetzner](/install/hetzner)（生产 VPS）。

当你的笔记本电脑经常睡眠但你希望代理始终在线时，这是理想选择。

### 家庭桌面运行网关

笔记本电脑**不**运行代理。它远程连接：

- 使用 macOS 应用的**通过 SSH 远程**模式（设置 → 常规 → OpenClaw 运行）。
- 应用打开并管理隧道，因此 WebChat 和健康检查可以正常工作。

运行手册：[macOS 远程访问](/platforms/mac/remote)。

### 笔记本电脑运行网关

在本地保持网关但安全暴露它：

- 通过 SSH 隧道从其他机器连接到笔记本电脑，或
- 用 Tailscale Serve 提供 Control UI 并保持网关仅环回。

指南：[Tailscale](/gateway/tailscale) 和 [Web 概述](/web)。

## 命令流（什么在哪里运行）

一个网关服务拥有状态 + 渠道。节点是外设。

流程示例（Telegram → 节点）：

- Telegram 消息到达**网关**。
- 网关运行**代理**并决定是否调用节点工具。
- 网关通过网关 WebSocket（`node.*` RPC）调用**节点**。
- 节点返回结果；网关回复回 Telegram。

注意事项：

- **节点不运行网关服务。** 除非你有意运行隔离的配置文件（参见[多网关](/gateway/multiple-gateways)），否则每台主机只应运行一个网关。
- macOS 应用"节点模式"只是通过网关 WebSocket 的节点客户端。

## SSH 隧道（CLI + 工具）

创建到远程网关 WS 的本地隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

隧道建立后：

- `openclaw health` 和 `openclaw status --deep` 现在通过 `ws://127.0.0.1:18789` 到达远程网关。
- `openclaw gateway status`、`openclaw gateway health`、`openclaw gateway probe` 和 `openclaw gateway call` 在需要时也可以通过 `--url` 针对转发的 URL。

<Note>
将 `18789` 替换为你配置的 `gateway.port`（或 `--port` 或 `OPENCLAW_GATEWAY_PORT`）。
</Note>

<Warning>
当你传递 `--url` 时，CLI 不会回退到配置或环境凭据。明确包含 `--token` 或 `--password`。缺少明确凭据是错误。
</Warning>

## CLI 远程默认值

你可以持久化远程目标，以便 CLI 命令默认使用它：

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://127.0.0.1:18789",
      token: "your-token",
    },
  },
}
```

当网关仅限环回时，将 URL 保持在 `ws://127.0.0.1:18789` 并先打开 SSH 隧道。在 macOS 应用的 SSH 隧道传输中，发现的网关主机名属于 `gateway.remote.sshTarget`；`gateway.remote.url` 仍然是本地隧道 URL。

## 凭据优先级

网关凭据解析在 call/probe/status 路径和 Discord exec 审批监控中遵循一个共享合约。节点主机使用相同的基本合约，但有一个本地模式例外（它有意忽略 `gateway.remote.*`）：

- 明确凭据（`--token`、`--password` 或工具 `gatewayToken`）在接受明确认证的调用路径上始终优先。
- URL 覆盖安全性：
  - CLI URL 覆盖（`--url`）从不重用隐式配置/环境凭据。
  - 环境变量 URL 覆盖（`OPENCLAW_GATEWAY_URL`）只能使用环境变量凭据（`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`）。
- 本地模式默认值：
  - 令牌：`OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token`（远程回退仅在本地认证令牌输入未设置时适用）
  - 密码：`OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password`（远程回退仅在本地认证密码输入未设置时适用）
- 远程模式默认值：
  - 令牌：`gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - 密码：`OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- 节点主机本地模式例外：`gateway.remote.token` / `gateway.remote.password` 被忽略。
- 远程 probe/status 令牌检查默认严格：针对远程模式时只使用 `gateway.remote.token`（没有本地令牌回退）。
- 网关环境变量覆盖只使用 `OPENCLAW_GATEWAY_*`。

## 通过 SSH 的聊天 UI

WebChat 不再使用单独的 HTTP 端口。SwiftUI 聊天 UI 直接连接到网关 WebSocket。

- 通过 SSH 转发 `18789`（参见上文），然后将客户端连接到 `ws://127.0.0.1:18789`。
- 在 macOS 上，优先使用应用的"通过 SSH 远程"模式，它会自动管理隧道。

## macOS 应用通过 SSH 远程

macOS 菜单栏应用可以端到端驱动相同的设置（远程状态检查、WebChat 和语音唤醒转发）。

运行手册：[macOS 远程访问](/platforms/mac/remote)。

## 安全规则（远程/VPN）

简短版本：**保持网关仅环回**，除非你确定需要绑定。

- **环回 + SSH/Tailscale Serve** 是最安全的默认值（没有公共暴露）。
- 明文 `ws://` 默认仅限环回。对于受信任的私有网络，在进行 WebSocket 连接的客户端进程上设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作为应急措施。没有 `openclaw.json` 等效项；这必须是进行 WebSocket 连接的客户端的进程环境。
- **非环回绑定**（`lan`/`tailnet`/`custom`，或环回不可用时的 `auto`）必须使用网关认证：令牌、密码或带有 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。
- `gateway.remote.token` / `.password` 是客户端凭据来源。它们本身**不**配置服务器认证。
- 本地调用路径只有在 `gateway.auth.*` 未设置时才能使用 `gateway.remote.*` 作为回退。
- 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 明确配置且未解析，解析失败关闭（没有远程回退屏蔽）。
- `gateway.remote.tlsFingerprint` 在使用 `wss://` 时固定远程 TLS 证书。
- **Tailscale Serve** 可以在 `gateway.auth.allowTailscale: true` 时通过身份标头对 Control UI/WebSocket 流量进行认证；HTTP API 端点不使用该 Tailscale 标头认证，而是遵循网关的正常 HTTP 认证模式。此无令牌流假设网关主机是可信任的。如果你想到处使用共享密钥认证，请将其设置为 `false`。
- **受信任代理**认证默认期望非环回身份感知代理设置。同主机环回反向代理需要明确设置 `gateway.auth.trustedProxy.allowLoopback = true`。
- 将浏览器控制视为操作员访问：仅 tailnet + 刻意的节点配对。

深入了解：[安全](/gateway/security)。

### macOS：通过 LaunchAgent 的持久 SSH 隧道

对于连接到远程网关的 macOS 客户端，最简单的持久设置使用 SSH `LocalForward` 配置条目加 LaunchAgent 在重启和崩溃后保持隧道活跃。

#### 第 1 步：添加 SSH 配置

编辑 `~/.ssh/config`：

```ssh
Host remote-gateway
    HostName <REMOTE_IP>
    User <REMOTE_USER>
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

将 `<REMOTE_IP>` 和 `<REMOTE_USER>` 替换为你的值。

#### 第 2 步：复制 SSH 密钥（一次性）

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

#### 第 3 步：配置网关令牌

将令牌存储在配置中以便在重启时持久化：

```bash
openclaw config set gateway.remote.token "<your-token>"
```

#### 第 4 步：创建 LaunchAgent

将此文件保存为 `~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.ssh-tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/ssh</string>
        <string>-N</string>
        <string>remote-gateway</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

#### 第 5 步：加载 LaunchAgent

```bash
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist
```

隧道将在登录时自动启动，崩溃时重启，并保持转发端口活跃。

<Note>
如果你有旧设置中遗留的 `com.openclaw.ssh-tunnel` LaunchAgent，请将其卸载并删除。
</Note>

#### 故障排除

检查隧道是否运行：

```bash
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789
```

重启隧道：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.ssh-tunnel
```

停止隧道：

```bash
launchctl bootout gui/$UID/ai.openclaw.ssh-tunnel
```

| 配置条目                             | 作用                                  |
| ------------------------------------ | ------------------------------------- |
| `LocalForward 18789 127.0.0.1:18789` | 将本地端口 18789 转发到远程端口 18789 |
| `ssh -N`                             | 不执行远程命令的 SSH（仅端口转发）    |
| `KeepAlive`                          | 隧道崩溃时自动重启                    |
| `RunAtLoad`                          | 登录时 LaunchAgent 加载时启动隧道     |

## 相关链接

- [Tailscale](/gateway/tailscale)
- [认证](/gateway/authentication)
- [远程网关设置](/gateway/remote-gateway-readme)
