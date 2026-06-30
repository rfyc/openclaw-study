---
summary: "`openclaw logs` 的 CLI 参考（通过 RPC 查看 gateway 日志）"
read_when:
  - 你需要远程查看 Gateway 日志（不使用 SSH）
  - 你想要 JSON 日志行用于工具链
title: "Logs"
---

# `openclaw logs`

通过 RPC 查看 Gateway 文件日志（在远程模式下有效）。

相关：

- 日志概览：[Logging](/logging)
- Gateway CLI：[gateway](/cli/gateway)

## 选项

- `--limit <n>`：返回的最大日志行数（默认 `200`）
- `--max-bytes <n>`：从日志文件读取的最大字节数（默认 `250000`）
- `--follow`：跟踪日志流
- `--interval <ms>`：跟踪时的轮询间隔（默认 `1000`）
- `--json`：发出按行分隔的 JSON 事件
- `--plain`：不带样式格式的纯文本输出
- `--no-color`：禁用 ANSI 颜色
- `--local-time`：以你的本地时区渲染时间戳

## 共享 Gateway RPC 选项

`openclaw logs` 还接受标准 Gateway 客户端标志：

- `--url <url>`：Gateway WebSocket URL
- `--token <token>`：Gateway 令牌
- `--timeout <ms>`：超时时间（毫秒，默认 `30000`）
- `--expect-final`：当 Gateway 调用由 agent 支持时等待最终响应

当你传递 `--url` 时，CLI 不会自动应用配置或环境凭证。如果目标 Gateway 需要认证，请显式包含 `--token`。

## 示例

```bash
openclaw logs
openclaw logs --follow
openclaw logs --follow --interval 2000
openclaw logs --limit 500 --max-bytes 500000
openclaw logs --json
openclaw logs --plain
openclaw logs --no-color
openclaw logs --limit 500
openclaw logs --local-time
openclaw logs --follow --local-time
openclaw logs --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

## 备注

- 使用 `--local-time` 以你的本地时区渲染时间戳。
- 如果隐式本地回环 Gateway 请求配对、在连接期间关闭或在 `logs.tail` 响应之前超时，`openclaw logs` 会自动回退到配置的 Gateway 文件日志。显式的 `--url` 目标不使用此回退。
- 使用 `--follow` 时，瞬时 gateway 断开连接（WebSocket 关闭、超时、连接丢失）会触发带指数退避的自动重连（最多 8 次重试，每次尝试之间最多 30 秒）。每次重试都会向 stderr 打印警告，一旦轮询成功就打印 `[logs] gateway reconnected` 通知。在 `--json` 模式下，重试警告和重连转换都作为 `{"type":"notice"}` 记录发送到 stderr。不可恢复的错误（认证失败、错误配置）仍然立即退出。

## 相关

- [CLI 参考](/cli)
- [Gateway 日志](/gateway/logging)
