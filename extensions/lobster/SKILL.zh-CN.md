# Lobster

Lobster 以审批检查点执行多步骤工作流。以下情况使用它：

- 用户需要可重复的自动化（分类、监控、同步）
- 操作在执行前需要人工审批（发送、发布、删除）
- 多个工具调用应作为一个确定性操作运行

## 何时使用 Lobster

| 用户意图                               | 使用 Lobster？                 |
| -------------------------------------- | ------------------------------ |
| "分类我的邮件"                         | 是——多步骤，可能发送回复       |
| "发送一条消息"                         | 否——单一操作，直接使用消息工具 |
| "每天早上检查我的邮件，回复前先询问我" | 是——带审批的定时工作流         |
| "天气怎么样？"                         | 否——简单查询                   |
| "监控此 PR 并通知我变更"               | 是——有状态、周期性             |

## 基本用法

### 运行流水线

```json
{
  "action": "run",
  "pipeline": "gog.gmail.search --query 'newer_than:1d' --max 20 | email.triage"
}
```

返回结构化结果：

```json
{
  "protocolVersion": 1,
  "ok": true,
  "status": "ok",
  "output": [{ "summary": {...}, "items": [...] }],
  "requiresApproval": null
}
```

### 处理审批

如果工作流需要审批：

```json
{
  "status": "needs_approval",
  "output": [],
  "requiresApproval": {
    "prompt": "发送 3 个草稿回复？",
    "items": [...],
    "resumeToken": "..."
  }
}
```

将提示呈现给用户。如果他们批准：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

## 示例工作流

### 邮件分类

```
gog.gmail.search --query 'newer_than:1d' --max 20 | email.triage
```

获取最近的邮件，分类到桶中（needs_reply、needs_action、fyi）。

### 带审批门的邮件分类

```
gog.gmail.search --query 'newer_than:1d' | email.triage | approve --prompt '处理这些邮件？'
```

与上述相同，但在返回之前暂停等待审批。

## 关键行为

- **确定性**：相同输入 → 相同输出（流水线执行中无 LLM 方差）
- **审批门**：`approve` 命令暂停执行，返回令牌
- **可恢复**：使用带令牌的 `resume` 操作继续
- **结构化输出**：始终返回带有 `protocolVersion` 的 JSON 信封

## 不要对以下情况使用 Lobster

- 简单的单一操作请求（直接使用工具）
- 需要 LLM 在流程中间进行解释的查询
- 不会重复的一次性任务
