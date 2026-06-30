---
summary: "macOS 应用如何报告 gateway/Baileys 健康状态"
read_when:
  - 调试 Mac 应用健康指示器
title: "健康检查（macOS）"
---

# macOS 上的健康检查

如何从菜单栏应用查看链接的频道是否健康。

## 菜单栏

- 状态点现在反映 Baileys 健康状态：
  - 绿色：已链接 + 最近打开了套接字。
  - 橙色：连接中/重试中。
  - 红色：已注销或探测失败。
- 辅助行显示"linked · auth 12m"或显示失败原因。
- "运行健康检查"菜单项触发按需探测。

## 设置

- 通用标签页增加了一个健康卡，显示：链接认证时间、会话存储路径/数量、上次检查时间、上次错误/状态码，以及"运行健康检查"/"显示日志"按钮。
- 使用缓存快照，UI 加载即时，离线时优雅降级。
- **频道标签页**显示 WhatsApp/Telegram 的频道状态 + 控件（登录二维码、注销、探测、上次断开/错误）。

## 探测工作原理

- 应用每约 60 秒通过 `ShellExecutor` 运行 `openclaw health --json` 以及按需运行。探测加载凭据并报告状态，不发送消息。
- 分别缓存最后的好快照和最后的错误，避免闪烁；显示每个的时间戳。

## 如有疑问

- 你仍然可以使用 [Gateway 健康](/gateway/health) 中的 CLI 流程（`openclaw status`、`openclaw status --deep`、`openclaw health --json`）并跟踪 `/tmp/openclaw/openclaw-*.log` 中的 `web-heartbeat` / `web-reconnect`。

## 相关

- [Gateway 健康](/gateway/health)
- [macOS 应用](/platforms/macos)
