---
summary: "`openclaw voicecall` 的 CLI 参考（语音通话插件命令界面）"
read_when:
  - 你使用语音通话插件并想了解 CLI 入口点时
  - 你想要 `voicecall setup|smoke|call|continue|dtmf|status|tail|expose` 的快速示例时
title: "Voicecall"
---

# `openclaw voicecall`

`voicecall` 是插件提供的命令。仅当安装并启用了语音通话插件时才会出现。

当 Gateway 运行时，操作命令（`call`、`start`、`continue`、`speak`、`dtmf`、`end` 和 `status`）被发送到该 Gateway 的语音通话运行时。如果没有 Gateway 可达，它们会回退到独立的 CLI 运行时。

主要文档：

- 语音通话插件：[Voice Call](/plugins/voice-call)

## 常用命令

```bash
openclaw voicecall setup
openclaw voicecall smoke
openclaw voicecall status --json
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
```

`setup` 默认打印人类可读的就绪检查。对于脚本使用 `--json`：

```bash
openclaw voicecall setup --json
```

`status` 默认以 JSON 格式打印活跃通话。传递 `--call-id <id>` 检查一个通话。

对于外部提供商（`twilio`、`telnyx`、`plivo`），setup 必须从 `publicUrl`、隧道或 Tailscale 暴露中解析公共 webhook URL。回环/私有服务回退被拒绝，因为运营商无法访问它。

`smoke` 运行相同的就绪检查。除非同时存在 `--to` 和 `--yes`，否则不会拨打真实电话：

```bash
openclaw voicecall smoke --to "+15555550123"        # 预演
openclaw voicecall smoke --to "+15555550123" --yes  # 实时通知通话
```

## 暴露 webhook（Tailscale）

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

安全说明：仅将 webhook 端点暴露给你信任的网络。尽可能优先使用 Tailscale Serve 而不是 Funnel。

## 相关

- [CLI 参考](/cli)
- [语音通话插件](/plugins/voice-call)
