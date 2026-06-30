---
name: session-memory
description: "在执行 /new 或 /reset 命令时将会话上下文保存到记忆"
homepage: https://docs.openclaw.ai/automation/hooks#session-memory
metadata:
  {
    "openclaw":
      {
        "emoji": "💾",
        "events": ["command:new", "command:reset"],
        "requires": { "config": ["workspace.dir"] },
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with OpenClaw" }],
      },
  }
---

# 会话记忆 Hook

当你执行 `/new` 或 `/reset` 时，自动将会话上下文保存到工作区记忆中。

## 功能说明

当你运行 `/new` 或 `/reset` 开始新会话时：

1. **查找前一个会话** —— 使用重置前的会话条目定位正确的对话记录
2. **提取对话** —— 从会话中读取最后 N 条用户/助手消息（默认：15，可配置）
3. **生成描述性 slug** —— 使用 LLM 根据对话内容创建有意义的文件名 slug
4. **保存到记忆** —— 在 `<workspace>/memory/YYYY-MM-DD-slug.md` 创建新文件

## 输出格式

记忆文件以以下格式创建：

```markdown
# Session: 2026-01-16 14:30:00 EST

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram
```

## 文件名示例

LLM 根据你的对话生成描述性 slug：

- `2026-01-16-vendor-pitch.md` —— 关于供应商评估的讨论
- `2026-01-16-api-design.md` —— API 架构规划
- `2026-01-16-bug-fix.md` —— 调试会话
- `2026-01-16-1430.md` —— slug 生成失败时的本地时间戳回退

## 要求

- **配置**：必须设置 `workspace.dir`（设置过程中会自动配置）

该 hook 使用你配置的 LLM 提供商生成 slug，因此适用于任何提供商（Anthropic、OpenAI 等）。

## 配置

该 hook 支持可选配置：

| 选项       | 类型   | 默认值 | 描述                                  |
| ---------- | ------ | ------ | ------------------------------------- |
| `messages` | number | 15     | 要包含在记忆文件中的用户/助手消息数量 |

示例配置：

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "session-memory": {
          "enabled": true,
          "messages": 25
        }
      }
    }
  }
}
```

该 hook 会自动：

- 使用你的工作区目录（默认为 `~/.openclaw/workspace`）
- 使用你配置的 LLM 生成 slug
- 在 LLM 不可用时回退到时间戳 slug

## 禁用

要禁用此 hook：

```bash
openclaw hooks disable session-memory
```

或从配置中移除：

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "session-memory": { "enabled": false }
      }
    }
  }
}
```
