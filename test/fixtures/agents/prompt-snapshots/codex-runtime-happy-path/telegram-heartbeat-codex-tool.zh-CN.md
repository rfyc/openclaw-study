# Telegram 直接聊天 Codex 心跳工具回合

<!-- 由 `pnpm prompt:snapshots:gen` 生成。请勿手动编辑。-->

## 范围

- 心跳正常路径：由于 `messages.visibleReplies` 为 `message_tool`，Codex 接收结构化的 `heartbeat_respond` 动态工具。
- 心跳工具携带通知/不通知的决定、结果、摘要和可选的通知文本，而不仅仅依赖最终文本解析。
- 这捕获了 OpenClaw 拥有的 Codex 应用服务器输入，并从已提交的 Codex 提示夹具重建稳定的 Codex 模型/权限层。
- 这还模拟了通过 Codex `config.instructions` 转发的工作区启动文件：`SOUL.md`、`TOOLS.md` 和 `HEARTBEAT.md`。

## 场景元数据

```json
{
  "channel": "telegram",
  "chatType": "direct",
  "codexModelInstructionsFixture": "test/fixtures/agents/prompt-snapshots/codex-model-catalog/gpt-5.5.pragmatic.instructions.md",
  "harness": "codex",
  "model": "gpt-5.5",
  "modelProvider": "openai",
  "runtime": "codex_app_server",
  "simulatedWorkspaceBootstrapFiles": [
    "/tmp/openclaw-happy-path/workspace/SOUL.md",
    "/tmp/openclaw-happy-path/workspace/TOOLS.md",
    "/tmp/openclaw-happy-path/workspace/HEARTBEAT.md"
  ],
  "sourceReplyDeliveryMode": "message_tool_only",
  "toolSnapshot": "codex-dynamic-tools.heartbeat-turn.json",
  "trigger": "heartbeat"
}
```

## 生效的 OpenClaw 配置

```json
{
  "agents": {
    "defaults": {
      "heartbeat": {
        "enabled": true,
        "every": "30m"
      }
    }
  },
  "messages": {
    "groupChat": {
      "visibleReplies": "message_tool"
    },
    "visibleReplies": "message_tool"
  },
  "tools": {
    "profiles": {
      "coding": {
        "allow": [
          "message",
          "heartbeat_respond",
          "sessions_spawn",
          "sessions_list",
          "sessions_yield",
          "cron",
          "memory_search",
          "memory_get",
          "session_status"
        ]
      }
    }
  }
}
```

（其余内容为心跳回合的线程/回合参数和重建的提示层，包含 `heartbeat_respond` 工具和心跳触发器特有的说明）
