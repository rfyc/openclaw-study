---
summary: "`openclaw dashboard` 的 CLI 参考（打开控制界面）"
read_when:
  - 你想用当前令牌打开控制界面
  - 你想打印 URL 而不启动浏览器
title: "Dashboard"
---

# `openclaw dashboard`

使用你的当前认证打开控制界面。

```bash
openclaw dashboard
openclaw dashboard --no-open
```

备注：

- `dashboard` 在可能时解析已配置的 `gateway.auth.token` SecretRef。
- `dashboard` 遵循 `gateway.tls.enabled`：启用 TLS 的 gateway 会打印/打开 `https://` 控制界面 URL 并通过 `wss://` 连接。
- 对于 SecretRef 管理的令牌（已解析或未解析），`dashboard` 会打印/复制/打开无令牌 URL，以避免在终端输出、剪贴板历史或浏览器启动参数中暴露外部密钥。
- 如果 `gateway.auth.token` 由 SecretRef 管理但在此命令路径中未解析，命令会打印无令牌 URL 和明确的修复指导，而不是嵌入无效的令牌占位符。

## 相关

- [CLI 参考](/cli)
- [Dashboard](/web/dashboard)
