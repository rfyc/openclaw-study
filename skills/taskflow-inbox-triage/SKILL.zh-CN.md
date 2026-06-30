---
name: taskflow-inbox-triage
description: TaskFlow 模式的具体示例，用于收件箱分类、意图路由、等待回复和后续摘要。
metadata: { "openclaw": { "emoji": "📥" } }
---

# TaskFlow 收件箱分类

这是一个关于如何使用 TaskFlow 的具体示例，无需将核心运行时转变为 DSL。

## 目标

使用单一所有者流程对收件箱条目进行分类：

- 业务相关 → 发布到 Slack 并等待回复
- 个人相关 → 立即通知所有者
- 其他所有内容 → 保留至当天结束时的摘要

## 模式

1. 为收件箱批次创建一个流程。
2. 运行一个独立任务来分类新条目。
3. 将路由状态持久化在 `stateJson` 中。
4. 仅当需要外部回复时才移至 `waiting` 状态。
5. 当分类或人工输入完成时恢复流程。
6. 当批次路由完成时结束流程。

## 建议的 `stateJson` 结构

```json
{
  "businessThreads": [],
  "personalItems": [],
  "eodSummary": []
}
```

等待 Slack 时建议的 `waitJson`：

```json
{
  "kind": "reply",
  "channel": "slack",
  "threadKey": "slack:thread-1"
}
```

## 最简运行时调用

```ts
const taskFlow = api.runtime.tasks.flow.fromToolContext(ctx);

const created = taskFlow.createManaged({
  controllerId: "my-plugin/inbox-triage",
  goal: "triage inbox",
  currentStep: "classify",
  stateJson: {
    businessThreads: [],
    personalItems: [],
    eodSummary: [],
  },
});

const child = taskFlow.runTask({
  flowId: created.flowId,
  runtime: "acp",
  childSessionKey: "agent:main:subagent:classifier",
  task: "Classify inbox messages",
  status: "running",
  startedAt: Date.now(),
  lastEventAt: Date.now(),
});

if (!child.created) {
  throw new Error(child.reason);
}

const waiting = taskFlow.setWaiting({
  flowId: created.flowId,
  expectedRevision: created.revision,
  currentStep: "await_business_reply",
  stateJson: {
    businessThreads: ["slack:thread-1"],
    personalItems: [],
    eodSummary: [],
  },
  waitJson: {
    kind: "reply",
    channel: "slack",
    threadKey: "slack:thread-1",
  },
});

if (!waiting.applied) {
  throw new Error(waiting.code);
}

const resumed = taskFlow.resume({
  flowId: waiting.flow.flowId,
  expectedRevision: waiting.flow.revision,
  status: "running",
  currentStep: "route_items",
  stateJson: waiting.flow.stateJson,
});

if (!resumed.applied) {
  throw new Error(resumed.code);
}

taskFlow.finish({
  flowId: resumed.flow.flowId,
  expectedRevision: resumed.flow.revision,
  stateJson: resumed.flow.stateJson,
});
```

## 相关示例

- `skills/taskflow/examples/inbox-triage.lobster`
