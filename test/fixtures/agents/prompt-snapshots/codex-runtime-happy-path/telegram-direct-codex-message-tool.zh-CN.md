# Telegram 直接聊天 Codex 消息工具回合

<!-- 由 `pnpm prompt:snapshots:gen` 生成。请勿手动编辑。-->

## 范围

- 默认正常路径：通过 Codex 框架/运行时使用 OpenAI 模型，Telegram 直接对话，仅消息工具可见回复。
- 安静的回合通过不调用 `message(action=send)` 来表示；普通的最终助手文本对 OpenClaw/Codex 来说是私密的。
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
  "toolSnapshot": "codex-dynamic-tools.telegram-direct.json",
  "trigger": "user"
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

（其余内容为与 discord-group 快照类似的线程/回合参数和重建的提示层，适用于 Telegram 直接聊天场景）
