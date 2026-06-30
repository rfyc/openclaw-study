---
name: command-logger
description: "将所有命令事件记录到集中的审计文件"
homepage: https://docs.openclaw.ai/automation/hooks#command-logger
metadata:
  {
    "openclaw":
      {
        "emoji": "📝",
        "events": ["command"],
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with OpenClaw" }],
      },
  }
---

# 命令日志 Hook

将所有命令事件（`/new`、`/reset`、`/stop` 等）记录到集中的审计日志文件，用于调试和监控目的。

## 功能说明

每次向智能体发出命令时：

1. **捕获事件详情** —— 命令操作、时间戳、会话键、发送者 ID、来源
2. **追加到日志文件** —— 将 JSON 行写入 `~/.openclaw/logs/commands.log`
3. **静默操作** —— 在后台运行，不向用户发送通知

## 输出格式

日志条目以 JSONL（JSON Lines）格式写入：

```json
{"timestamp":"2026-01-16T14:30:00.000Z","action":"new","sessionKey":"agent:main:main","senderId":"+1234567890","source":"telegram"}
{"timestamp":"2026-01-16T15:45:22.000Z","action":"stop","sessionKey":"agent:main:main","senderId":"user@example.com","source":"whatsapp"}
```

## 使用场景

- **调试**：跟踪命令何时发出以及来自哪个来源
- **审计**：监控不同通道的命令使用情况
- **分析**：分析命令模式和频率
- **故障排除**：通过查看命令历史记录排查问题

## 日志文件位置

`~/.openclaw/logs/commands.log`

## 要求

无要求——此 hook 在所有平台上开箱即用。

## 配置

无需配置。该 hook 会自动：

- 如果目录不存在则创建日志目录
- 追加到日志文件（不覆盖）
- 静默处理错误，不中断命令执行

## 禁用

要禁用此 hook：

```bash
openclaw hooks disable command-logger
```

或通过配置：

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "command-logger": { "enabled": false }
      }
    }
  }
}
```

## 日志轮转

该 hook 不会自动轮转日志。要管理日志大小，可以：

1. **手动轮转**：

   ```bash
   mv ~/.openclaw/logs/commands.log ~/.openclaw/logs/commands.log.old
   ```

2. **使用 logrotate**（Linux）：
   创建 `/etc/logrotate.d/openclaw`：
   ```
   /home/username/.openclaw/logs/commands.log {
       weekly
       rotate 4
       compress
       missingok
       notifempty
   }
   ```

## 查看日志

查看最近命令：

```bash
tail -n 20 ~/.openclaw/logs/commands.log
```

使用 jq 美化输出：

```bash
cat ~/.openclaw/logs/commands.log | jq .
```

按操作过滤：

```bash
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```
