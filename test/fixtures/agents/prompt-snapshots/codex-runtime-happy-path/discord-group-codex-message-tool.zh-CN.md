# Discord 群组 Codex 消息工具回合

<!-- 由 `pnpm prompt:snapshots:gen` 生成。请勿手动编辑。-->

## 范围

- 默认正常路径：同一 Codex 智能体在 Discord 群组/频道中被提及，而 Telegram 仍可以是用户的主要直接界面。
- 群组可见输出必须通过消息工具明确；模型还被告知除非被直接点名或明显有用，否则主要潜伏。
- 这捕获了 OpenClaw 拥有的 Codex 应用服务器输入，并从已提交的 Codex 提示夹具重建稳定的 Codex 模型/权限层。
- 这还模拟了通过 Codex `config.instructions` 转发的工作区启动文件：`SOUL.md`、`TOOLS.md` 和 `HEARTBEAT.md`。

## 场景元数据

```json
{
  "channel": "discord",
  "chatType": "group",
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
  "toolSnapshot": "codex-dynamic-tools.discord-group.json",
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

## 线程启动参数

```json
{
  "approvalPolicy": "never",
  "approvalsReviewer": "user",
  "config": {
    "instructions": "OpenClaw loaded these user-editable workspace files. Treat them as project/user context. Codex loads AGENTS.md natively, so AGENTS.md is not repeated here.\n\n# Project Context\n\nThe following project context files have been loaded:\nIf SOUL.md is present, embody its persona and tone. Avoid stiff, generic replies; follow its guidance unless higher-priority instructions override it.\n\n## /tmp/openclaw-happy-path/workspace/SOUL.md\n\n<SOUL.md contents will be here>\n\n## /tmp/openclaw-happy-path/workspace/TOOLS.md\n\n<TOOLS.md contents will be here>\n\n## /tmp/openclaw-happy-path/workspace/HEARTBEAT.md\n\n<HEARTBEAT.md contents will be here>"
  },
  "cwd": "/tmp/openclaw-happy-path/workspace",
  "developerInstructions": "<see Reconstructed Model-Bound Prompt Layers>",
  "dynamicTools": [
    "canvas",
    "nodes",
    "cron",
    "message",
    "tts",
    "gateway",
    "agents_list",
    "sessions_list",
    "sessions_history",
    "sessions_send",
    "sessions_spawn",
    "sessions_yield",
    "subagents",
    "session_status",
    "web_search",
    "web_fetch"
  ],
  "experimentalRawEvents": true,
  "model": "gpt-5.5",
  "persistExtendedHistory": true,
  "sandbox": "danger-full-access",
  "serviceName": "OpenClaw"
}
```

## 线程恢复参数

```json
{
  "approvalPolicy": "never",
  "approvalsReviewer": "user",
  "config": {
    "instructions": "OpenClaw loaded these user-editable workspace files. Treat them as project/user context. Codex loads AGENTS.md natively, so AGENTS.md is not repeated here.\n\n# Project Context\n\nThe following project context files have been loaded:\nIf SOUL.md is present, embody its persona and tone. Avoid stiff, generic replies; follow its guidance unless higher-priority instructions override it.\n\n## /tmp/openclaw-happy-path/workspace/SOUL.md\n\n<SOUL.md contents will be here>\n\n## /tmp/openclaw-happy-path/workspace/TOOLS.md\n\n<TOOLS.md contents will be here>\n\n## /tmp/openclaw-happy-path/workspace/HEARTBEAT.md\n\n<HEARTBEAT.md contents will be here>"
  },
  "developerInstructions": "<see Reconstructed Model-Bound Prompt Layers>",
  "model": "gpt-5.5",
  "persistExtendedHistory": true,
  "sandbox": "danger-full-access",
  "threadId": "thread-discord-group-codex-message-tool"
}
```

## 回合启动参数

```json
{
  "approvalPolicy": "never",
  "approvalsReviewer": "user",
  "collaborationMode": {
    "mode": "default",
    "settings": {
      "developer_instructions": null,
      "model": "gpt-5.5",
      "reasoning_effort": "medium"
    }
  },
  "cwd": "/tmp/openclaw-happy-path/workspace",
  "effort": "medium",
  "input": [
    {
      "text": "<see Reconstructed Model-Bound Prompt Layers>",
      "text_elements": [],
      "type": "text"
    }
  ],
  "model": "gpt-5.5",
  "sandboxPolicy": {
    "type": "dangerFullAccess"
  },
  "threadId": "thread-discord-group-codex-message-tool"
}
```

## 重建的模型绑定提示层

这是 OpenClaw 可以为 Codex 正常路径快照的确定性模型绑定层堆栈。它使用从 Codex 模型目录/缓存形状生成的固定 Codex `gpt-5.5` 提示夹具，然后添加 Codex 权限开发者文本、模拟的 OpenClaw 工作区启动配置说明、OpenClaw 开发者说明、OpenClaw 提供时的回合范围协作模式说明、回合输入和 OpenClaw 动态工具目录。Codex 仍然可以在 Codex 运行时内添加运行时拥有的上下文，如原生工作区 `AGENTS.md`、环境上下文、记忆、应用/插件说明和内置协作模式说明。

### 层元数据

```json
{
  "codexModelInstructions": {
    "fixture": "test/fixtures/agents/prompt-snapshots/codex-model-catalog/gpt-5.5.pragmatic.instructions.md",
    "source": {
      "model": "gpt-5.5",
      "personality": "pragmatic",
      "source": {
        "catalogKind": "models_cache",
        "catalogPath": "<codex-home>/models_cache.json",
        "field": "model_messages.instructions_template + model_messages.instructions_variables.personality_pragmatic"
      }
    }
  },
  "codexPermissions": {
    "approvalPolicy": "never",
    "networkAccess": "enabled",
    "sandbox": "danger-full-access"
  },
  "limitations": [
    "这是重建的提示层快照，不是从 Codex 核心捕获的逐字节原始 OpenAI 请求。",
    "Codex 拥有的工作区 AGENTS.md、环境上下文、记忆、应用/插件说明、内置默认协作模式说明以及提供商工具序列化仍然是运行时拥有的差距，直到 Codex 公开渲染提示检查 API。"
  ],
  "openClawRuntime": {
    "collaborationModeDeveloperInstructionsFrom": "extensions/codex app-server turn/start collaborationMode.settings.developer_instructions",
    "configInstructionsFrom": "extensions/codex app-server thread/start config.instructions",
    "developerInstructionsFrom": "extensions/codex app-server thread/start developerInstructions",
    "dynamicToolsFrom": "codex-dynamic-tools.discord-group.json",
    "userInputFrom": "extensions/codex app-server turn/start input"
  }
}
```

### 粗略文本 Token 估算

```json
{
  "codexCollaborationModeDeveloperInstructions": {
    "chars": 0,
    "roughTokens": 0
  },
  "codexModelInstructions": {
    "chars": 21335,
    "roughTokens": 5334
  },
  "codexPermissionDeveloperInstructions": {
    "chars": 307,
    "roughTokens": 77
  },
  "codexWorkspaceBootstrapConfigInstructions": {
    "chars": 632,
    "roughTokens": 158
  },
  "dynamicToolsJson": {
    "chars": 50457,
    "roughTokens": 12615
  },
  "openClawDeveloperInstructions": {
    "chars": 5870,
    "roughTokens": 1468
  },
  "totalTextOnly": {
    "chars": 29022,
    "roughTokens": 7256
  },
  "totalWithDynamicToolsJson": {
    "chars": 79481,
    "roughTokens": 19871
  },
  "userInputText": {
    "chars": 870,
    "roughTokens": 218
  }
}
```

### 系统：Codex 模型说明（gpt-5.5，务实型）

（内容与 `gpt-5.5.pragmatic.instructions.md` 相同，此处省略以避免重复）

### 开发者：Codex 权限说明

```text
Filesystem sandboxing defines which files can be read or written. `sandbox_mode` is `danger-full-access`: No filesystem sandboxing - all commands are permitted. Network access is enabled.
Approval policy is currently never. Do not provide the `sandbox_permissions` for any reason, commands will be rejected.
```

### 用户：Codex 配置说明（OpenClaw 工作区启动上下文）

（内容为 OpenClaw 加载的用户可编辑工作区文件，包含 SOUL.md、TOOLS.md 和 HEARTBEAT.md 的占位内容）

### 开发者：OpenClaw 运行时说明

（内容为 OpenClaw 运行时配置，包含角色锁定、执行策略、工具规范等，以及 Discord 群组聊天特定的行为说明）

### 开发者：Codex 协作模式说明

此回合要求 Codex 应用服务器在运行时解析其内置的默认协作模式说明。

### 用户：回合输入文本

（包含对话信息、发送者元数据、历史聊天记录和用户请求）

### 工具：动态工具目录

完整 JSON：`codex-dynamic-tools.discord-group.json`

## 动态工具名称

```json
[
  "canvas",
  "nodes",
  "cron",
  "message",
  "tts",
  "gateway",
  "agents_list",
  "sessions_list",
  "sessions_history",
  "sessions_send",
  "sessions_spawn",
  "sessions_yield",
  "subagents",
  "session_status",
  "web_search",
  "web_fetch"
]
```
