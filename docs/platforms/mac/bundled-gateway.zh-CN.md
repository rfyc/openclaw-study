---
summary: "macOS 上的 Gateway 运行时（外部 launchd 服务）"
read_when:
  - 打包 OpenClaw.app
  - 调试 macOS gateway launchd 服务
  - 为 macOS 安装 gateway CLI
title: "macOS 上的 Gateway"
---

OpenClaw.app 不再捆绑 Node/Bun 或 Gateway 运行时。macOS 应用
需要**外部** `openclaw` CLI 安装，不将 Gateway 作为子进程启动，并管理每用户 launchd 服务以保持 Gateway 运行（或在已有本地 Gateway 运行时连接到它）。

## 安装 CLI（本地模式必需）

Mac 的默认运行时是 Node 24。Node 22 LTS，当前 `22.14+`，仍支持兼容性。然后全局安装 `openclaw`：

```bash
npm install -g openclaw@<version>
```

macOS 应用的**安装 CLI** 按钮运行与应用内部使用的相同全局安装流程：它优先使用 npm，然后 pnpm，然后如果 bun 是唯一检测到的包管理器则使用 bun。Node 仍然是推荐的 Gateway 运行时。

## Launchd（Gateway 作为 LaunchAgent）

标签：

- `ai.openclaw.gateway`（或 `ai.openclaw.<profile>`；旧版 `com.openclaw.*` 可能仍然存在）

Plist 位置（每用户）：

- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
  （或 `~/Library/LaunchAgents/ai.openclaw.<profile>.plist`）

管理器：

- macOS 应用在本地模式下拥有 LaunchAgent 安装/更新。
- CLI 也可以安装它：`openclaw gateway install`。

行为：

- "OpenClaw 活跃"启用/禁用 LaunchAgent。
- 应用退出**不会**停止网关（launchd 保持其运行）。
- 如果 Gateway 已经在配置的端口上运行，应用会连接到它
  而不是启动新的。

日志：

- launchd stdout/err：`/tmp/openclaw/openclaw-gateway.log`

## 版本兼容性

macOS 应用根据其自身版本检查网关版本。如果它们不
兼容，更新全局 CLI 以匹配应用版本。

## 烟雾测试

```bash
openclaw --version

OPENCLAW_SKIP_CHANNELS=1 \
OPENCLAW_SKIP_CANVAS_HOST=1 \
openclaw gateway --port 18999 --bind loopback
```

然后：

```bash
openclaw gateway call health --url ws://127.0.0.1:18999 --timeout 3000
```

## 相关

- [macOS 应用](/platforms/macos)
- [Gateway 运行手册](/gateway)
