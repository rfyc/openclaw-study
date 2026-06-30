---
name: taskflow
description: 将多步骤独立任务协调为具有所有者上下文、状态、等待和子任务的单一持久化 TaskFlow 作业。
metadata: { "openclaw": { "emoji": "🪝" } }
---

# TaskFlow

当一个作业需要超出单次提示或单次独立运行的生命周期，但你仍希望保持单一所有者会话、单一返回上下文以及单一检查或恢复工作的位置时，使用 TaskFlow。

## 使用时机

- 具有单一所有者的多步骤后台工作
- 等待独立 ACP 或子代理任务的工作
- 可能需要向所有者发送一条明确更新的作业
- 需要在各步骤之间保存少量持久化状态的作业
- 必须能够干净地从重启和版本冲突中恢复的插件或工具工作

## TaskFlow 管理的内容

- 流程标识
- 所有者会话和请求者来源
- `currentStep`、`stateJson` 和 `waitJson`
- 关联的子任务及其父流程 id
- 完成、失败、取消、等待和阻塞状态
- 用于无冲突变更的版本跟踪

它**不**管理分支或业务逻辑。请将这些内容放在 Lobster、acpx 或调用代码中。

## 当前运行时结构

规范的插件/运行时入口点：

- `api.runtime.tasks.flow`
- `api.runtime.taskFlow` 仍作为别名存在，但 `api.runtime.tasks.flow` 是规范形式

绑定方式：

- `api.runtime.tasks.flow.fromToolContext(ctx)` —— 当你已有包含 `sessionKey` 的可信工具上下文时使用
- `api.runtime.tasks.flow.bindSession({ sessionKey, requesterOrigin })` —— 当你的绑定层已解析会话和交付上下文时使用

托管流程生命周期：

1. `createManaged(...)`
2. `runTask(...)`
3. `setWaiting(...)` —— 等待人工或外部系统时
4. `resume(...)` —— 工作可以继续时
5. `finish(...)` 或 `fail(...)`
6. `requestCancel(...)` 或 `cancel(...)` —— 整个作业需要停止时

## 设计约束

- 当你的代码负责编排时，使用**托管** TaskFlow。
- 单任务**镜像**流程由核心运行时为独立 ACP/子代理工作创建；本 skill 主要关注托管流程。
- 将 `stateJson` 视为持久化状态包。没有单独的 `setFlowOutput` 或 `appendFlowOutput` API。
- 创建后的每个变更方法都会进行版本检查。每次成功变更后携带最新的 `flow.revision`。
- `runTask(...)` 将子任务链接到流程。当你想要父级编排时，使用它来替代手动创建独立任务。

## 示例结构

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

const classify = taskFlow.runTask({
  flowId: created.flowId,
  runtime: "acp",
  childSessionKey: "agent:main:subagent:classifier",
  runId: "inbox-classify-1",
  task: "Classify inbox messages",
  status: "running",
  startedAt: Date.now(),
  lastEventAt: Date.now(),
});

if (!classify.created) {
  throw new Error(classify.reason);
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
  currentStep: "finalize",
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

## 将条件逻辑置于运行时之上

使用流程运行时管理状态和任务链接。将决策保留在编写层：

- `business` → 发布到 Slack 并等待
- `personal` → 立即通知所有者
- `later` → 追加到当天结束时的摘要桶

## 操作模式

- 只存储恢复所需的最少状态。
- 在 `blockedSummary` 中放置人类可读的等待原因，或在 `waitJson` 中放置结构化的等待元数据。
- 当编排器需要子工作的简洁健康视图时，使用 `getTaskSummary(flowId)`。
- 当调用者希望流程立即停止调度时，使用 `requestCancel(...)`。
- 当你还想取消活跃的关联子任务时，使用 `cancel(...)`。

## 示例

- 参见 `skills/taskflow/examples/inbox-triage.lobster`
- 参见 `skills/taskflow/examples/pr-intake.lobster`
- 参见 `skills/taskflow-inbox-triage/SKILL.md` 了解具体路由模式
