---
summary: "公共 OpenClaw App SDK API、事件分类、工件、审批和包结构的参考设计"
title: "OpenClaw App SDK API 设计"
sidebarTitle: "App SDK API 设计"
read_when:
  - 您正在实现提议的公共 OpenClaw 应用 SDK 时
  - 您需要应用 SDK 的草稿命名空间、事件、结果、工件、审批或安全合约时
  - 您正在比较 Gateway 协议资源与高级 OpenClaw App SDK 包装器时
---

本页是公共 [OpenClaw App SDK](/concepts/openclaw-sdk) 的详细 API 参考设计。它有意与[插件 SDK](/plugins/sdk-overview) 分开。

<Note>
  `@openclaw/sdk` 是用于与 Gateway 通信的外部应用/客户端包。`openclaw/plugin-sdk/*` 是进程内插件编写合约。不要从只需要运行智能助手的应用中导入插件 SDK 子路径。
</Note>

公共应用 SDK 应构建在两层上：

1. 低级生成的 Gateway 客户端。
2. 带有 `OpenClaw`、`Agent`、`Session`、`Run`、`Task`、`Artifact`、`Approval` 和 `Environment` 对象的高级人机工程学包装器。

## 命名空间设计

低级命名空间应紧密遵循 Gateway 资源：

```typescript
oc.agents.list();
oc.agents.get("main");
oc.agents.create(...);
oc.agents.update(...);

oc.sessions.list();
oc.sessions.create(...);
oc.sessions.resolve(...);
oc.sessions.send(...);
oc.sessions.messages(...);
oc.sessions.fork(...);
oc.sessions.compact(...);
oc.sessions.abort(...);

oc.runs.create(...);
oc.runs.get(runId);
oc.runs.events(runId, { after });
oc.runs.wait(runId);
oc.runs.cancel(runId);

oc.tasks.list(); // 未来 API：当前 SDK 抛出不支持
oc.tasks.get(taskId); // 未来 API：当前 SDK 抛出不支持
oc.tasks.cancel(taskId); // 未来 API：当前 SDK 抛出不支持
oc.tasks.events(taskId, { after }); // 未来 API

oc.models.list();
oc.models.status(); // Gateway models.authStatus

oc.tools.list();
oc.tools.invoke(...); // 未来 API：当前 SDK 抛出不支持

oc.artifacts.list({ runId }); // 未来 API：当前 SDK 抛出不支持
oc.artifacts.get(artifactId); // 未来 API：当前 SDK 抛出不支持
oc.artifacts.download(artifactId); // 未来 API：当前 SDK 抛出不支持

oc.approvals.list();
oc.approvals.respond(approvalId, ...);

oc.environments.list(); // 未来 API：当前 SDK 抛出不支持
oc.environments.create(...); // 未来 API：当前 SDK 抛出不支持
oc.environments.status(environmentId); // 未来 API：当前 SDK 抛出不支持
oc.environments.delete(environmentId); // 未来 API：当前 SDK 抛出不支持
```

高级包装器应返回使常见流程变得愉快的对象：

```typescript
const run = await agent.run(inputOrParams);
await run.cancel();
await run.wait();

for await (const event of run.events()) {
  // 规范化的事件流
}

const artifacts = await run.artifacts.list();
const session = await run.session();
```

## 事件合约

公共 SDK 应公开版本化的、可重放的、规范化的事件。

```typescript
type OpenClawEvent = {
  version: 1;
  id: string;
  ts: number;
  type: OpenClawEventType;
  runId?: string;
  sessionId?: string;
  sessionKey?: string;
  taskId?: string;
  agentId?: string;
  data: unknown;
  raw?: unknown;
};
```

`id` 是重放游标。消费者应该能够使用 `events({ after: id })` 重新连接，并在保留允许的情况下接收错过的事件。

推荐的规范化事件系列：

| 事件                  | 含义                                 |
| --------------------- | ------------------------------------ |
| `run.created`         | 运行已接受。                         |
| `run.queued`          | 运行正在等待会话通道、运行时或环境。 |
| `run.started`         | 运行时已开始执行。                   |
| `run.completed`       | 运行成功完成。                       |
| `run.failed`          | 运行以错误结束。                     |
| `run.cancelled`       | 运行已取消。                         |
| `run.timed_out`       | 运行超过其超时时间。                 |
| `assistant.delta`     | 助手文本增量。                       |
| `assistant.message`   | 完整的助手消息或替换。               |
| `thinking.delta`      | 推理或计划增量，当策略允许公开时。   |
| `tool.call.started`   | 工具调用开始。                       |
| `tool.call.delta`     | 工具调用流式进度或部分输出。         |
| `tool.call.completed` | 工具调用成功返回。                   |
| `tool.call.failed`    | 工具调用失败。                       |
| `approval.requested`  | 运行或工具需要审批。                 |
| `approval.resolved`   | 审批已授予、拒绝、过期或取消。       |
| `question.requested`  | 运行时向用户或宿主应用请求输入。     |
| `question.answered`   | 宿主应用提供了答案。                 |
| `artifact.created`    | 新工件可用。                         |
| `artifact.updated`    | 现有工件已更改。                     |
| `session.created`     | 会话已创建。                         |
| `session.updated`     | 会话元数据已更改。                   |
| `session.compacted`   | 会话压缩已发生。                     |
| `task.updated`        | 后台任务状态已更改。                 |
| `git.branch`          | 运行时观察到或更改了分支状态。       |
| `git.diff`            | 运行时产生或更改了差异。             |
| `git.pr`              | 运行时打开、更新或链接了拉取请求。   |

运行时原生负载应通过 `raw` 获得，但应用不应该为了正常 UI 而解析 `raw`。

## 结果合约

`Run.wait()` 应返回稳定的结果信封：

```typescript
type RunResult = {
  runId: string;
  status: "accepted" | "completed" | "failed" | "cancelled" | "timed_out";
  sessionId?: string;
  sessionKey?: string;
  taskId?: string;
  startedAt?: string | number;
  endedAt?: string | number;
  output?: {
    text?: string;
    messages?: SDKMessage[];
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    costUsd?: number;
  };
  artifacts?: ArtifactSummary[];
  error?: SDKError;
};
```

结果应该是无聊且稳定的。时间戳值保留 Gateway 形状，因此当前基于生命周期的运行通常报告纪元毫秒数，而适配器可能仍然呈现 ISO 字符串。丰富的 UI、工具跟踪和运行时原生细节属于事件和工件。

`accepted` 是非终止的等待结果：意味着 Gateway 等待截止日期在运行产生生命周期结束/错误之前到期。它不得被视为 `timed_out`；`timed_out` 保留给超过其自身运行时超时的运行。

## 审批和问题

审批必须是一等公民，因为编程智能助手不断跨越安全边界。

```typescript
run.onApproval(async (request) => {
  if (request.kind === "tool" && request.toolName === "exec") {
    return request.approveOnce({ reason: "CI command allowed by policy" });
  }

  return request.askUser();
});
```

审批事件应携带：

- 审批 id
- 运行 id 和会话 id
- 请求类型
- 请求操作摘要
- 工具名称或环境操作
- 风险级别
- 可用决策
- 过期时间
- 决策是否可以重用

问题与审批不同。问题向用户或宿主应用请求信息。审批请求执行操作的权限。

## ToolSpace 模型

应用需要了解工具界面，而无需导入插件内部。

```typescript
const tools = await run.toolSpace();

for (const tool of tools.list()) {
  console.log(tool.name, tool.source, tool.requiresApproval);
}
```

SDK 应公开：

- 规范化的工具元数据
- 来源：OpenClaw、MCP、插件、通道、运行时或应用
- 架构摘要
- 审批策略
- 运行时兼容性
- 工具是否隐藏、只读、可写或具备宿主能力

通过 SDK 调用工具应该是明确且有范围的。大多数应用应该运行智能助手，而不是直接调用任意工具。

## 工件模型

工件应涵盖的不仅仅是文件。

```typescript
type ArtifactSummary = {
  id: string;
  runId?: string;
  sessionId?: string;
  type:
    | "file"
    | "patch"
    | "diff"
    | "log"
    | "media"
    | "screenshot"
    | "trajectory"
    | "pull_request"
    | "workspace";
  title?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
  expiresAt?: string;
};
```

常见示例：

- 文件编辑和生成的文件
- 补丁包
- VCS 差异
- 截图和媒体输出
- 日志和跟踪包
- 拉取请求链接
- 运行时轨迹
- 托管环境工作区快照

工件访问应支持编辑、保留和下载 URL，而不假设每个工件都是普通的本地文件。

## 安全模型

应用 SDK 必须明确权限。

推荐的令牌范围：

| 范围                | 允许                                 |
| ------------------- | ------------------------------------ |
| `agent.read`        | 列出和检查智能助手。                 |
| `agent.run`         | 启动运行。                           |
| `session.read`      | 读取会话元数据和消息。               |
| `session.write`     | 创建、发送到、分叉、压缩和中止会话。 |
| `task.read`         | 读取后台任务状态。                   |
| `task.write`        | 取消或修改任务通知策略。             |
| `approval.respond`  | 批准或拒绝请求。                     |
| `tools.invoke`      | 直接调用公开的工具。                 |
| `artifacts.read`    | 列出和下载工件。                     |
| `environment.write` | 创建或销毁托管环境。                 |
| `admin`             | 管理操作。                           |

默认值：

- 默认情况下不转发密钥
- 不允许无限制的环境变量透传
- 使用密钥引用而非密钥值
- 明确的沙盒和网络策略
- 明确的远程环境保留
- 宿主执行需要审批，除非策略另有证明
- 原始运行时事件在离开 Gateway 之前经过编辑，除非调用者拥有更强的诊断范围

## 托管环境提供商

托管智能助手应实现为环境提供商。

```typescript
type EnvironmentProvider = {
  id: string;
  capabilities: {
    checkout?: boolean;
    sandbox?: boolean;
    networkPolicy?: boolean;
    secrets?: boolean;
    artifacts?: boolean;
    logs?: boolean;
    pullRequests?: boolean;
    longRunning?: boolean;
  };
};
```

第一个实现不需要是托管的 SaaS。它可以针对现有节点主机、临时工作区、CI 风格运行器或 Testbox 风格环境。重要的合约是：

1. 准备工作区
2. 绑定安全环境和密钥
3. 启动运行
4. 流式传输事件
5. 收集工件
6. 根据策略清理或保留

一旦这稳定下来，托管云服务就可以实现相同的提供商合约。

## 包结构

推荐的包：

| 包                      | 用途                                            |
| ----------------------- | ----------------------------------------------- |
| `@openclaw/sdk`         | 公共高级 SDK 和生成的低级 Gateway 客户端。      |
| `@openclaw/sdk-react`   | 用于仪表板和应用构建者的可选 React 钩子。       |
| `@openclaw/sdk-testing` | 用于应用集成的测试辅助函数和伪 Gateway 服务器。 |

该仓库已经有 `openclaw/plugin-sdk/*` 用于插件。保持该命名空间分开，以避免将插件作者与应用开发者混淆。

## 生成客户端策略

低级客户端应从版本化的 Gateway 协议架构生成，然后由手写的人机工程学类包装。

分层：

1. Gateway 架构真相来源。
2. 生成的低级 TypeScript 客户端。
3. 外部输入和事件负载的运行时验证器。
4. 高级 `OpenClaw`、`Agent`、`Session`、`Run`、`Task` 和 `Artifact` 包装器。
5. 食谱示例和集成测试。

优点：

- 协议漂移是可见的
- 测试可以将生成的方法与 Gateway 导出进行比较
- App SDK 与插件 SDK 内部保持独立
- 低级消费者仍然拥有完整的协议访问权限
- 高级消费者获得小型产品 API

## 相关文档

- [OpenClaw App SDK](/concepts/openclaw-sdk)
- [Gateway RPC 参考](/reference/rpc)
- [智能助手循环](/concepts/agent-loop)
- [智能助手运行时](/concepts/agent-runtimes)
- [后台任务](/automation/tasks)
- [ACP 智能助手](/tools/acp-agents)
- [插件 SDK 概述](/plugins/sdk-overview)
