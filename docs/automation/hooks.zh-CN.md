---
summary: "Hooks：用于命令和生命周期事件的事件驱动自动化"
read_when:
  - 需要针对 /new、/reset、/stop 及代理生命周期事件实现事件驱动自动化
  - 需要构建、安装或调试 hooks
title: "Hooks"
---

Hooks 是在 Gateway 内部发生特定事件时运行的小型脚本。它们可以从目录中自动发现，并可通过 `openclaw hooks` 进行检查。只有在启用 hooks 或配置了至少一个 hook 条目、hook 包、遗留处理器或额外 hook 目录后，Gateway 才会加载内部 hooks。

OpenClaw 中有两种 hooks：

- **内部 hooks**（本页面）：在代理事件触发时运行于 Gateway 内部，如 `/new`、`/reset`、`/stop` 或生命周期事件。
- **Webhooks**：外部 HTTP 端点，允许其他系统在 OpenClaw 中触发工作。参见 [Webhooks](/automation/cron-jobs#webhooks)。

Hooks 也可以打包在插件内部。`openclaw hooks list` 会同时显示独立 hooks 和插件管理的 hooks。

## 快速开始

```bash
# 列出可用 hooks
openclaw hooks list

# 启用一个 hook
openclaw hooks enable session-memory

# 检查 hook 状态
openclaw hooks check

# 获取详细信息
openclaw hooks info session-memory
```

## 事件类型

| 事件                     | 触发时机                         |
| ------------------------ | -------------------------------- |
| `command:new`            | 发出 `/new` 命令时               |
| `command:reset`          | 发出 `/reset` 命令时             |
| `command:stop`           | 发出 `/stop` 命令时              |
| `command`                | 任意命令事件（通用监听器）       |
| `session:compact:before` | 压缩历史记录开始之前             |
| `session:compact:after`  | 压缩完成之后                     |
| `session:patch`          | 会话属性被修改时                 |
| `agent:bootstrap`        | 工作区启动文件注入之前           |
| `gateway:startup`        | 频道启动且 hooks 加载完成之后    |
| `gateway:shutdown`       | Gateway 开始关闭时               |
| `gateway:pre-restart`    | 预期 Gateway 重启之前            |
| `message:received`       | 从任意频道收到入站消息时         |
| `message:transcribed`    | 音频转录完成之后                 |
| `message:preprocessed`   | 媒体和链接预处理完成或已跳过之后 |
| `message:sent`           | 出站消息已投递时                 |

## 编写 hooks

### Hook 结构

每个 hook 是一个包含两个文件的目录：

```
my-hook/
├── HOOK.md          # 元数据 + 文档
└── handler.ts       # 处理器实现
```

### HOOK.md 格式

```markdown
---
name: my-hook
description: "Short description of what this hook does"
metadata:
  { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
---

# My Hook

Detailed documentation goes here.
```

**元数据字段**（`metadata.openclaw`）：

| 字段       | 说明                                             |
| ---------- | ------------------------------------------------ |
| `emoji`    | CLI 显示图标                                     |
| `events`   | 监听的事件数组                                   |
| `export`   | 使用的命名导出（默认为 `"default"`）             |
| `os`       | 必要平台（如 `["darwin", "linux"]`）             |
| `requires` | 必要的 `bins`、`anyBins`、`env` 或 `config` 路径 |
| `always`   | 绕过资格检查（布尔值）                           |
| `install`  | 安装方法                                         |

### 处理器实现

```typescript
const handler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log(`[my-hook] New command triggered`);
  // 你的逻辑

  // 可选：向用户发送消息
  event.messages.push("Hook executed!");
};

export default handler;
```

每个事件包含：`type`、`action`、`sessionKey`、`timestamp`、`messages`（push 以发送给用户）以及 `context`（事件特定数据）。代理和工具插件 hook 上下文还可包含 `trace`，这是一个只读的 W3C 兼容诊断追踪上下文，插件可将其传入结构化日志用于 OTEL 关联。

### 事件上下文要点

**命令事件**（`command:new`、`command:reset`）：`context.sessionEntry`、`context.previousSessionEntry`、`context.commandSource`、`context.workspaceDir`、`context.cfg`。

**消息事件**（`message:received`）：`context.from`、`context.content`、`context.channelId`、`context.metadata`（提供商特定数据，包括 `senderId`、`senderName`、`guildId`）。`context.content` 优先使用命令类消息的非空命令主体，其次回退到原始入站主体和通用主体；不包含仅供代理使用的补充信息（如线程历史或链接摘要）。

**消息事件**（`message:sent`）：`context.to`、`context.content`、`context.success`、`context.channelId`。

**消息事件**（`message:transcribed`）：`context.transcript`、`context.from`、`context.channelId`、`context.mediaPath`。

**消息事件**（`message:preprocessed`）：`context.bodyForAgent`（最终富化后的主体）、`context.from`、`context.channelId`。

**启动事件**（`agent:bootstrap`）：`context.bootstrapFiles`（可变数组）、`context.agentId`。

**会话补丁事件**（`session:patch`）：`context.sessionEntry`、`context.patch`（仅变更字段）、`context.cfg`。只有特权客户端才能触发补丁事件。

**压缩事件**：`session:compact:before` 包含 `messageCount`、`tokenCount`。`session:compact:after` 追加 `compactedCount`、`summaryLength`、`tokensBefore`、`tokensAfter`。

`command:stop` 用于观察用户发出 `/stop`；它是取消/命令生命周期事件，而非代理最终化门控。需要检查最终答复并请求代理再进行一轮的插件应使用类型化插件 hook `before_agent_finalize`。参见[插件 hooks](/plugins/hooks)。

**Gateway 生命周期事件**：`gateway:shutdown` 包含 `reason` 和 `restartExpectedMs`，在 gateway 开始关闭时触发。`gateway:pre-restart` 包含相同上下文，但只在关闭属于预期重启且提供了有限 `restartExpectedMs` 值时触发。关闭过程中，每个生命周期 hook 的等待是尽力而为且有时间限制的，以确保处理器卡住时关闭仍能继续。

## Hook 发现

Hooks 按以下目录顺序发现，后者优先级更高：

1. **内置 hooks**：随 OpenClaw 一起发布
2. **插件 hooks**：打包在已安装插件内部
3. **托管 hooks**：`~/.openclaw/hooks/`（用户安装，跨工作区共享）。`hooks.internal.load.extraDirs` 中的额外目录与此级别共享优先级。
4. **工作区 hooks**：`<workspace>/hooks/`（每代理，默认禁用，需显式启用）

工作区 hooks 可以添加新 hook 名称，但不能覆盖同名的内置、托管或插件提供的 hooks。

Gateway 在启动时会跳过内部 hook 发现，直到配置了内部 hooks。使用 `openclaw hooks enable <name>` 启用内置或托管 hook，安装 hook 包，或设置 `hooks.internal.enabled=true` 以启用。启用单个命名 hook 时，Gateway 只加载该 hook 的处理器；`hooks.internal.enabled=true`、额外 hook 目录和遗留处理器则启用广泛发现。

### Hook 包

Hook 包是通过 `package.json` 中的 `openclaw.hooks` 导出 hooks 的 npm 包。安装方式：

```bash
openclaw plugins install <path-or-spec>
```

Npm 规格仅限注册表（包名 + 可选精确版本或 dist-tag）。Git/URL/文件规格和语义化版本范围会被拒绝。

## 内置 hooks

| Hook                  | 事件                                              | 功能                                             |
| --------------------- | ------------------------------------------------- | ------------------------------------------------ |
| session-memory        | `command:new`、`command:reset`                    | 将会话上下文保存到 `<workspace>/memory/`         |
| bootstrap-extra-files | `agent:bootstrap`                                 | 从 glob 模式注入额外的启动文件                   |
| command-logger        | `command`                                         | 将所有命令记录到 `~/.openclaw/logs/commands.log` |
| compaction-notifier   | `session:compact:before`、`session:compact:after` | 在会话压缩开始/结束时发送可见的聊天通知          |
| boot-md               | `gateway:startup`                                 | Gateway 启动时运行 `BOOT.md`                     |

启用任意内置 hook：

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### session-memory 详情

提取最后 15 条用户/助手消息，通过 LLM 生成描述性文件名 slug，并使用宿主机本地日期保存到 `<workspace>/memory/YYYY-MM-DD-slug.md`。需要配置 `workspace.dir`。

<a id="bootstrap-extra-files"></a>

### bootstrap-extra-files 配置

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": ["packages/*/AGENTS.md", "packages/*/TOOLS.md"]
        }
      }
    }
  }
}
```

路径相对于工作区解析。只有已识别的启动文件基名才会被加载（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`、`MEMORY.md`）。

<a id="command-logger"></a>

### command-logger 详情

将每个斜杠命令记录到 `~/.openclaw/logs/commands.log`。

<a id="compaction-notifier"></a>

### compaction-notifier 详情

在 OpenClaw 开始和完成压缩会话转录时，向当前对话发送简短状态消息。这使聊天界面上的长轮次不那么令人困惑，因为用户可以看到助手正在汇总上下文，压缩完成后会继续对话。

<a id="boot-md"></a>

### boot-md 详情

Gateway 启动时运行活跃工作区中的 `BOOT.md`。

## 插件 hooks

插件可以通过 Plugin SDK 注册类型化 hooks，以实现更深度的集成：拦截工具调用、修改提示词、控制消息流等。当需要 `before_tool_call`、`before_agent_reply`、`before_install` 或其他进程内生命周期 hooks 时，请使用插件 hooks。

完整的插件 hook 参考，请参见[插件 hooks](/plugins/hooks)。

## 配置

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": { "enabled": true },
        "command-logger": { "enabled": false }
      }
    }
  }
}
```

每个 hook 的环境变量：

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "my-hook": {
          "enabled": true,
          "env": { "MY_CUSTOM_VAR": "value" }
        }
      }
    }
  }
}
```

额外 hook 目录：

```json
{
  "hooks": {
    "internal": {
      "load": {
        "extraDirs": ["/path/to/more/hooks"]
      }
    }
  }
}
```

<Note>
遗留的 `hooks.internal.handlers` 数组配置格式为向后兼容仍然受支持，但新 hooks 应使用基于发现的系统。
</Note>

## CLI 参考

```bash
# 列出所有 hooks（可添加 --eligible、--verbose 或 --json）
openclaw hooks list

# 显示某个 hook 的详细信息
openclaw hooks info <hook-name>

# 显示资格摘要
openclaw hooks check

# 启用/禁用
openclaw hooks enable <hook-name>
openclaw hooks disable <hook-name>
```

## 最佳实践

- **保持处理器高效。** Hooks 在命令处理期间运行。使用 `void processInBackground(event)` 异步执行繁重工作。
- **优雅处理错误。** 将高风险操作包装在 try/catch 中；不要抛出异常以免阻止其他处理器运行。
- **尽早过滤事件。** 若事件类型/动作不相关，立即返回。
- **使用具体的事件键。** 优先使用 `"events": ["command:new"]` 而非 `"events": ["command"]` 以减少开销。

## 故障排查

### Hook 未被发现

```bash
# 验证目录结构
ls -la ~/.openclaw/hooks/my-hook/
# 应显示：HOOK.md, handler.ts

# 列出所有已发现的 hooks
openclaw hooks list
```

### Hook 不符合资格

```bash
openclaw hooks info my-hook
```

检查是否缺少可执行文件（PATH）、环境变量、配置值或 OS 兼容性问题。

### Hook 未执行

1. 验证 hook 已启用：`openclaw hooks list`
2. 重启 gateway 进程以重新加载 hooks。
3. 检查 gateway 日志：`./scripts/clawlog.sh | grep hook`

## 相关文档

- [CLI 参考：hooks](/cli/hooks)
- [Webhooks](/automation/cron-jobs#webhooks)
- [插件 hooks](/plugins/hooks) — 进程内插件生命周期 hooks
- [配置](/gateway/configuration-reference#hooks)
