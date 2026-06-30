---
summary: "OpenClaw 的类型化工作流运行时，支持可恢复的审批门控。"
title: Lobster
read_when:
  - 你需要具有明确审批机制的确定性多步骤工作流
  - 你需要在不重新运行先前步骤的情况下恢复工作流
---

Lobster 是一个工作流 shell，让 OpenClaw 能够以单一确定性操作运行多步骤工具序列，并设有明确的审批检查点。

Lobster 是独立后台工作之上的一层编排层。对于单个任务之上的流程编排，请参阅 [Task Flow](/automation/taskflow)（`openclaw tasks flow`）。对于任务活动台账，请参阅 [`openclaw tasks`](/automation/tasks)。

## 钩子

你的助理可以构建管理自身的工具。请求一个工作流，30 分钟后你就得到了一个 CLI 加上作为单次调用运行的管道。Lobster 是缺失的拼图：确定性管道、明确审批和可恢复状态。

## 为什么需要它

目前，复杂工作流需要多次来回的工具调用。每次调用都会消耗 token，而 LLM 必须编排每个步骤。Lobster 将这种编排转移到类型化运行时中：

- **一次调用代替多次**：OpenClaw 运行一次 Lobster 工具调用并获得结构化结果。
- **内置审批**：副作用（发送邮件、发表评论）会暂停工作流，直到被明确批准。
- **可恢复**：暂停的工作流返回一个 token；批准后无需重新运行即可恢复。

## 为什么选择 DSL 而非普通程序？

Lobster 故意保持小巧。目标不是"一种新语言"，而是一个可预测的、AI 友好的管道规范，内置一流的审批和恢复 token。

- **审批/恢复是内置的**：普通程序可以提示人类，但无法在没有自己发明运行时的情况下*暂停并用持久化 token 恢复*。
- **确定性 + 可审计性**：管道是数据，因此易于记录、比较、重放和审查。
- **为 AI 约束的表面**：小型语法 + JSON 管道减少了"创意"代码路径并使验证变得现实。
- **安全策略内置**：超时、输出上限、沙箱检查和白名单由运行时强制执行，而非每个脚本。
- **仍可编程**：每个步骤都可以调用任何 CLI 或脚本。如果需要 JS/TS，可以从代码生成 `.lobster` 文件。

## 工作原理

OpenClaw 使用嵌入式运行器**在进程内**运行 Lobster 工作流。不会产生外部 CLI 子进程；工作流引擎在网关进程内执行并直接返回 JSON 信封。如果管道因审批而暂停，工具将返回 `resumeToken`，以便你稍后继续。

## 模式：小型 CLI + JSON 管道 + 审批

构建小型的 JSON 命令，然后将它们链接成单次 Lobster 调用。（下面的示例命令名称——请替换为你自己的。）

```bash
inbox list --json
inbox categorize --json
inbox apply --json
```

```json
{
  "action": "run",
  "pipeline": "exec --json --shell 'inbox list --json' | exec --stdin json --shell 'inbox categorize --json' | exec --stdin json --shell 'inbox apply --json' | approve --preview-from-stdin --limit 5 --prompt 'Apply changes?'",
  "timeoutMs": 30000
}
```

如果管道请求审批，使用 token 恢复：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

AI 触发工作流；Lobster 执行步骤。审批门控使副作用明确且可审计。

示例：将输入项映射到工具调用：

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## 纯 JSON LLM 步骤（llm-task）

对于需要**结构化 LLM 步骤**的工作流，启用可选的 `llm-task` 插件工具并从 Lobster 调用它。这保持了工作流的确定性，同时仍允许你使用模型进行分类/摘要/起草。

启用工具：

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "alsoAllow": ["llm-task"] }
      }
    ]
  }
}
```

在管道中使用：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "thinking": "low",
  "input": { "subject": "Hello", "body": "Can you help?" },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

详细信息和配置选项请参阅 [LLM 任务](/tools/llm-task)。

## 工作流文件（.lobster）

Lobster 可以运行包含 `name`、`args`、`steps`、`env`、`condition` 和 `approval` 字段的 YAML/JSON 工作流文件。在 OpenClaw 工具调用中，将 `pipeline` 设置为文件路径。

```yaml
name: inbox-triage
args:
  tag:
    default: "family"
steps:
  - id: collect
    command: inbox list --json
  - id: categorize
    command: inbox categorize --json
    stdin: $collect.stdout
  - id: approve
    command: inbox apply --approve
    stdin: $categorize.stdout
    approval: required
  - id: execute
    command: inbox apply --execute
    stdin: $categorize.stdout
    condition: $approve.approved
```

注意事项：

- `stdin: $step.stdout` 和 `stdin: $step.json` 传递先前步骤的输出。
- `condition`（或 `when`）可以基于 `$step.approved` 来控制步骤。

## 安装 Lobster

捆绑的 Lobster 工作流在进程内运行；不需要单独的 `lobster` 二进制文件。嵌入式运行器随 Lobster 插件一起发布。

如果你需要独立的 Lobster CLI 用于开发或外部管道，请从 [Lobster 仓库](https://github.com/openclaw/lobster) 安装并确保 `lobster` 在 `PATH` 中。

## 启用工具

Lobster 是一个**可选**插件工具（默认未启用）。

推荐方式（附加，安全）：

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

或按代理配置：

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "alsoAllow": ["lobster"]
        }
      }
    ]
  }
}
```

除非打算在限制性白名单模式下运行，否则避免使用 `tools.allow: ["lobster"]`。

<Note>
白名单对可选插件是可选的。`alsoAllow` 仅启用已命名的可选插件工具，同时保留正常的核心工具集。要限制核心工具，使用 `tools.allow` 加上你想要的核心工具或组。
</Note>

## 示例：邮件分类

没有 Lobster：

```
用户："检查我的邮件并起草回复"
→ openclaw 调用 gmail.list
→ LLM 摘要
→ 用户："起草 #2 和 #5 的回复"
→ LLM 起草
→ 用户："发送 #2"
→ openclaw 调用 gmail.send
（每天重复，没有已分类内容的记忆）
```

有了 Lobster：

```json
{
  "action": "run",
  "pipeline": "email.triage --limit 20",
  "timeoutMs": 30000
}
```

返回 JSON 信封（已截断）：

```json
{
  "ok": true,
  "status": "needs_approval",
  "output": [{ "summary": "5 need replies, 2 need action" }],
  "requiresApproval": {
    "type": "approval_request",
    "prompt": "Send 2 draft replies?",
    "items": [],
    "resumeToken": "..."
  }
}
```

用户批准 → 恢复：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

一个工作流。确定性。安全。

## 工具参数

### `run`

在工具模式下运行管道。

```json
{
  "action": "run",
  "pipeline": "gog.gmail.search --query 'newer_than:1d' | email.triage",
  "cwd": "workspace",
  "timeoutMs": 30000,
  "maxStdoutBytes": 512000
}
```

使用参数运行工作流文件：

```json
{
  "action": "run",
  "pipeline": "/path/to/inbox-triage.lobster",
  "argsJson": "{\"tag\":\"family\"}"
}
```

### `resume`

审批后继续暂停的工作流。

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

### 可选输入

- `cwd`：管道的相对工作目录（必须保持在网关工作目录内）。
- `timeoutMs`：如果工作流超过此时长则中止（默认：20000）。
- `maxStdoutBytes`：如果输出超过此大小则中止（默认：512000）。
- `argsJson`：传递给 `lobster run --args-json` 的 JSON 字符串（仅适用于工作流文件）。

## 输出信封

Lobster 返回具有以下三种状态之一的 JSON 信封：

- `ok` → 成功完成
- `needs_approval` → 已暂停；`requiresApproval.resumeToken` 是继续所必需的
- `cancelled` → 被明确拒绝或取消

工具在 `content`（格式化的 JSON）和 `details`（原始对象）中都提供信封。

## 审批

如果 `requiresApproval` 存在，检查提示并决定：

- `approve: true` → 恢复并继续副作用
- `approve: false` → 取消并完成工作流

使用 `approve --preview-from-stdin --limit N` 将 JSON 预览附加到审批请求，无需自定义 jq/heredoc。恢复 token 现在很紧凑：Lobster 将工作流恢复状态存储在其状态目录下并返回小型 token 密钥。

## OpenProse

OpenProse 与 Lobster 很好地配合：使用 `/prose` 编排多代理准备，然后运行 Lobster 管道进行确定性审批。如果 Prose 程序需要 Lobster，通过 `tools.subagents.tools` 为子代理允许 `lobster` 工具。参见 [OpenProse](/prose)。

## 安全

- **仅本地进程内** — 工作流在网关进程内执行；插件本身不进行网络调用。
- **无密钥** — Lobster 不管理 OAuth；它调用 OpenClaw 工具来处理这些。
- **沙箱感知** — 当工具上下文被沙箱化时禁用。
- **强化** — 超时和输出上限由嵌入式运行器强制执行。

## 故障排除

- **`lobster timed out`** → 增加 `timeoutMs`，或拆分较长的管道。
- **`lobster output exceeded maxStdoutBytes`** → 提高 `maxStdoutBytes` 或减少输出大小。
- **`lobster returned invalid JSON`** → 确保管道在工具模式下运行并只打印 JSON。
- **`lobster failed`** → 检查网关日志以获取嵌入式运行器错误详情。

## 了解更多

- [插件](/tools/plugin)
- [插件工具编写](/plugins/building-plugins#registering-agent-tools)

## 案例研究：社区工作流

一个公开示例："第二大脑"CLI + Lobster 管道，管理三个 Markdown 知识库（个人、伴侣、共享）。CLI 输出 JSON 统计数据、收件箱列表和过期扫描；Lobster 将这些命令链接成 `weekly-review`、`inbox-triage`、`memory-consolidation` 和 `shared-task-sync` 等工作流，每个都有审批门控。AI 在可用时处理判断（分类），不可用时回退到确定性规则。

- 帖子：[https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- 仓库：[https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

## 相关链接

- [自动化与任务](/automation) — 调度 Lobster 工作流
- [自动化概览](/automation) — 所有自动化机制
- [工具概览](/tools) — 所有可用代理工具
