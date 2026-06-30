---
summary: "OpenClaw.app 连接到远程网关的 SSH 隧道设置"
read_when: "通过 SSH 将 macOS 应用连接到远程网关"
title: "远程网关设置"
---

> 此内容已合并到[远程访问](/gateway/remote#macos-persistent-ssh-tunnel-via-launchagent)。请参阅该页面获取当前指南。

# 使用远程网关运行 OpenClaw.app

OpenClaw.app 使用 SSH 隧道连接到远程网关。本指南展示如何设置。

## 概述

```mermaid
flowchart TB
    subgraph Client["客户端机器"]
        direction TB
        A["OpenClaw.app"]
        B["ws://127.0.0.1:18789\n(本地端口)"]
        T["SSH 隧道"]

        A --> B
        B --> T
    end
    subgraph Remote["远程机器"]
        direction TB
        C["网关 WebSocket"]
        D["ws://127.0.0.1:18789"]

        C --> D
    end
    T --> C
```

## 快速设置

### 第 1 步：添加 SSH 配置

编辑 `~/.ssh/config` 并添加：

```ssh
Host remote-gateway
    HostName <REMOTE_IP>          # 例如，172.27.187.184
    User <REMOTE_USER>            # 例如，jefferson
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

将 `<REMOTE_IP>` 和 `<REMOTE_USER>` 替换为你的值。

### 第 2 步：复制 SSH 密钥

将你的公钥复制到远程机器（输入一次密码）：

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

### 第 3 步：配置远程网关认证

```bash
openclaw config set gateway.remote.token "<your-token>"
```

如果你的远程网关使用密码认证，请改用 `gateway.remote.password`。`OPENCLAW_GATEWAY_TOKEN` 仍然作为 shell 级别覆盖有效，但持久的远程客户端设置是 `gateway.remote.token` / `gateway.remote.password`。

### 第 4 步：启动 SSH 隧道

```bash
ssh -N remote-gateway &
```

### 第 5 步：重启 OpenClaw.app

```bash
# 退出 OpenClaw.app（⌘Q），然后重新打开：
open /path/to/OpenClaw.app
```

应用现在将通过 SSH 隧道连接到远程网关。

---

## 登录时自动启动隧道

要在登录时自动启动 SSH 隧道，请创建一个 Launch Agent。

### 创建 PLIST 文件

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

### 加载 Launch Agent

```bash
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist
```

隧道现在将：

- 登录时自动启动
- 崩溃时重启
- 在后台保持运行

旧版注意事项：如果存在任何旧的 `com.openclaw.ssh-tunnel` LaunchAgent，请将其删除。

---

## 故障排除

**检查隧道是否运行：**

```bash
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789
```

**重启隧道：**

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.ssh-tunnel
```

**停止隧道：**

```bash
launchctl bootout gui/$UID/ai.openclaw.ssh-tunnel
```

---

## 工作原理

| 组件                                 | 作用                                  |
| ------------------------------------ | ------------------------------------- |
| `LocalForward 18789 127.0.0.1:18789` | 将本地端口 18789 转发到远程端口 18789 |
| `ssh -N`                             | 不执行远程命令的 SSH（仅端口转发）    |
| `KeepAlive`                          | 隧道崩溃时自动重启                    |
| `RunAtLoad`                          | 代理加载时启动隧道                    |

OpenClaw.app 连接到客户端机器上的 `ws://127.0.0.1:18789`。SSH 隧道将该连接转发到运行网关的远程机器上的端口 18789。

## 相关链接

- [远程访问](/gateway/remote)
- [Tailscale](/gateway/tailscale)
