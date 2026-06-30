---
summary: "macOS 应用通过 SSH 控制远程 OpenClaw 网关的流程"
read_when:
  - 设置或调试远程 Mac 控制
title: "远程控制"
---

# 远程 OpenClaw（macOS ⇄ 远程主机）

此流程让 macOS 应用充当在另一台主机（桌面/服务器）上运行的 OpenClaw 网关的完整远程控制。这是应用的**通过 SSH 远程**（远程运行）功能。所有功能——健康检查、语音唤醒转发和 Web Chat——都重用来自*设置 → 通用*的相同远程 SSH 配置。

## 模式

- **本地（此 Mac）**：一切在笔记本电脑上运行。不涉及 SSH。
- **通过 SSH 远程（默认）**：OpenClaw 命令在远程主机上执行。Mac 应用使用 `-o BatchMode` 以及你选择的身份/密钥和本地端口转发打开 SSH 连接。
- **远程直连（ws/wss）**：无 SSH 隧道。Mac 应用直接连接到网关 URL（例如，通过 Tailscale Serve 或公共 HTTPS 反向代理）。

## 远程传输

远程模式支持两种传输：

- **SSH 隧道**（默认）：使用 `ssh -N -L ...` 将网关端口转发到本地主机。网关将看到节点的 IP 为 `127.0.0.1`，因为隧道是环回的。
- **直连（ws/wss）**：直接连接到网关 URL。网关看到真实的客户端 IP。

在 SSH 隧道模式下，发现的 LAN/尾网主机名被保存为
`gateway.remote.sshTarget`。应用将 `gateway.remote.url` 保留在本地
隧道端点，例如 `ws://127.0.0.1:18789`，因此 CLI、Web Chat 和
本地节点主机服务都使用相同的安全环回传输。

远程模式中的浏览器自动化由 CLI 节点主机拥有，而不是由
原生 macOS 应用节点拥有。当可能时，应用启动已安装的节点主机服务；如果你需要来自那台 Mac 的浏览器控制，使用
`openclaw node install ...` 和 `openclaw node start`（或在前台运行
`openclaw node run ...`）安装/启动它，然后以该浏览器能力节点为目标。

## 远程主机的前提条件

1. 安装 Node + pnpm 并构建/安装 OpenClaw CLI（`pnpm install && pnpm build && pnpm link --global`）。
2. 确保 `openclaw` 在非交互式 shell 的 PATH 上（如需要，将其符号链接到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 使用密钥认证打开 SSH。我们推荐使用 **Tailscale** IP 以便在局域网外稳定访问。

## macOS 应用设置

1. 打开*设置 → 通用*。
2. 在 **OpenClaw 运行**下，选择**通过 SSH 远程**并设置：
   - **传输**：**SSH 隧道**或**直连（ws/wss）**。
   - **SSH 目标**：`user@host`（可选 `:port`）。
     - 如果网关在同一局域网上并通告 Bonjour，从发现列表中选择它以自动填充此字段。
   - **网关 URL**（仅直连）：`wss://gateway.example.ts.net`（或 `ws://...` 用于本地/LAN）。
   - **身份文件**（高级）：密钥路径。
   - **项目根目录**（高级）：用于命令的远程检出路径。
   - **CLI 路径**（高级）：可运行的 `openclaw` 入口点/二进制文件的可选路径（通告时自动填充）。
3. 点击**测试远程**。成功表示远程 `openclaw status --json` 正确运行。失败通常意味着 PATH/CLI 问题；退出码 127 表示 CLI 在远程未找到。
4. 健康检查和 Web Chat 现在将通过此 SSH 隧道自动运行。

## Web Chat

- **SSH 隧道**：Web Chat 通过转发的 WebSocket 控制端口（默认 18789）连接到网关。
- **直连（ws/wss）**：Web Chat 直接连接到配置的网关 URL。
- 不再有单独的 WebChat HTTP 服务器。

## 权限

- 远程主机需要与本地相同的 TCC 批准（自动化、辅助功能、屏幕录制、麦克风、语音识别、通知）。在那台机器上运行引导程序以一次性授予它们。
- 节点通过 `node.list` / `node.describe` 通告其权限状态，以便智能体知道什么可用。

## 安全说明

- 在远程主机上优先使用环回绑定，并通过 SSH 或 Tailscale 连接。
- SSH 隧道使用严格的主机密钥检查；首先信任主机密钥使其存在于 `~/.ssh/known_hosts` 中。
- 如果你将 Gateway 绑定到非环回接口，需要有效的 Gateway 认证：令牌、密码或带有 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。
- 参见[安全](/gateway/security)和 [Tailscale](/gateway/tailscale)。

## WhatsApp 登录流程（远程）

- 在**远程主机**上运行 `openclaw channels login --verbose`。用手机的 WhatsApp 扫描二维码。
- 如果认证过期，在那台主机上重新运行登录。健康检查将显示链接问题。

## 故障排除

- **退出码 127 / 未找到**：`openclaw` 不在非登录 shell 的 PATH 上。将其添加到 `/etc/paths`、你的 shell rc 或符号链接到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **健康探测失败**：检查 SSH 可达性、PATH 以及 Baileys 是否已登录（`openclaw status --json`）。
- **Web Chat 卡住**：确认网关在远程主机上运行，转发端口与网关 WS 端口匹配；UI 需要健康的 WS 连接。
- **节点 IP 显示 127.0.0.1**：SSH 隧道的预期行为。如果你想让网关看到真实的客户端 IP，切换**传输**到**直连（ws/wss）**（参见 [macOS 远程访问](/platforms/mac/remote)）。
- **仪表板正常但 Mac 功能离线**：这意味着应用的运营商/控制连接是健康的，但伴侣节点连接未连接或缺少其命令接口。打开菜单栏设备部分，检查 Mac 是否显示 `paired · disconnected`。对于 `wss://*.ts.net` Tailscale Serve 端点，应用在证书轮换后检测到过期的旧版 TLS 叶证书固定，当 macOS 信任新证书时清除过期的固定，并自动重试。如果证书不受系统信任或主机不是 Tailscale Serve 名称，请检查证书或切换到**通过 SSH 远程**。
- **语音唤醒**：触发短语在远程模式下自动转发；不需要单独的转发器。

## 通知声音

使用 `openclaw` 和 `node.invoke` 通过脚本为每个通知选择声音，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

应用中不再有全局"默认声音"切换；调用者为每个请求选择声音（或无声音）。

## 相关

- [macOS 应用](/platforms/macos)
- [远程访问](/gateway/remote)
