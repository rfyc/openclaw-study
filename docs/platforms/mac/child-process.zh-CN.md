---
summary: "macOS 上的 Gateway 生命周期（launchd）"
read_when:
  - 将 Mac 应用与 Gateway 生命周期集成
title: "Gateway 生命周期"
---

# macOS 上的 Gateway 生命周期

macOS 应用默认**通过 launchd 管理 Gateway**，不将
Gateway 作为子进程启动。它首先尝试连接到配置端口上已运行的
Gateway；如果不可达，它通过外部 `openclaw` CLI 启用 launchd
服务（无嵌入运行时）。这为你提供可靠的登录自动启动和崩溃重启。

子进程模式（Gateway 由应用直接启动）**目前不在使用**。
如果你需要更紧密地与 UI 耦合，在终端中手动运行 Gateway。

## 默认行为（launchd）

- 应用安装标记为 `ai.openclaw.gateway` 的每用户 LaunchAgent
  （使用 `--profile`/`OPENCLAW_PROFILE` 时为 `ai.openclaw.<profile>`；支持旧版 `com.openclaw.*`）。
- 当启用本地模式时，应用确保 LaunchAgent 已加载并
  在需要时启动 Gateway。
- 日志写入 launchd 网关日志路径（在调试设置中可见）。

常用命令：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

运行命名配置文件时，将标签替换为 `ai.openclaw.<profile>`。

## 未签名的开发构建

`scripts/restart-mac.sh --no-sign` 用于当你没有
签名密钥时的快速本地构建。为了防止 launchd 指向未签名的中继二进制文件，它：

- 写入 `~/.openclaw/disable-launchagent`。

`scripts/restart-mac.sh` 的签名运行会在存在标记时清除此覆盖。要手动重置：

```bash
rm ~/.openclaw/disable-launchagent
```

## 仅附加模式

要强制 macOS 应用**永不安装或管理 launchd**，使用
`--attach-only`（或 `--no-launchd`）启动它。这会设置 `~/.openclaw/disable-launchagent`，
因此应用只连接到已运行的 Gateway。你可以在调试设置中切换相同的
行为。

## 远程模式

远程模式从不启动本地 Gateway。应用通过 SSH 隧道连接到
远程主机并通过该隧道连接。

## 为什么我们优先选择 launchd

- 登录时自动启动。
- 内置重启/KeepAlive 语义。
- 可预测的日志和监督。

如果将来再次需要真正的子进程模式，它应该作为
一个独立的、明确的仅开发模式来文档化。

## 相关

- [macOS 应用](/platforms/macos)
- [Gateway 运行手册](/gateway)
