---
summary: "`openclaw system` 的 CLI 参考（系统事件、心跳、在线状态）"
read_when:
  - 你想在不创建 cron 作业的情况下将系统事件加入队列时
  - 你需要启用或禁用心跳时
  - 你想检查系统在线状态条目时
title: "System"
---

# `openclaw system`

Gateway 的系统级助手：将系统事件加入队列、控制心跳和查看在线状态。

所有 `system` 子命令使用 Gateway RPC 并接受共享的客户端标志：

- `--url <url>`
- `--token <token>`
- `--timeout <ms>`
- `--expect-final`

## 常用命令

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system event --text "Check for urgent follow-ups" --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

在**主**会话上将系统事件加入队列。下一次心跳将在提示中以 `System:` 行注入它。使用 `--mode now` 立即触发心跳；`next-heartbeat` 等待下一个计划的滴答。

标志：

- `--text <text>`：必填的系统事件文本。
- `--mode <mode>`：`now` 或 `next-heartbeat`（默认）。
- `--json`：机器可读输出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共享的 Gateway RPC 标志。

## `system heartbeat last|enable|disable`

心跳控制：

- `last`：显示最后一次心跳事件。
- `enable`：重新开启心跳（如果它们被禁用，使用此命令）。
- `disable`：暂停心跳。

标志：

- `--json`：机器可读输出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共享的 Gateway RPC 标志。

## `system presence`

列出 Gateway 知道的当前系统在线状态条目（节点、实例和类似的状态行）。

标志：

- `--json`：机器可读输出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共享的 Gateway RPC 标志。

## 注意

- 需要通过当前配置（本地或远程）可达的运行中 Gateway。
- 系统事件是临时的，不会跨重启持久化。

## 相关

- [CLI 参考](/cli)
