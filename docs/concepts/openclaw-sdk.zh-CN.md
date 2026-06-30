---
summary: "用于外部应用、脚本、仪表板、CI 任务和 IDE 扩展的公开 OpenClaw App SDK"
title: "OpenClaw App SDK"
sidebarTitle: "App SDK"
read_when:
  - 你正在构建与 OpenClaw 通信的外部应用、脚本、仪表板、CI 任务或 IDE 扩展
  - 你在 App SDK 和 Plugin SDK 之间做选择
  - 你在集成网关智能体运行、会话、事件、审批、模型或工具
---

**OpenClaw App SDK** 是用于 OpenClaw 进程外应用的公开客户端 API。当脚本、仪表板、CI 任务、IDE 扩展或其他外部应用想要连接网关、启动智能体运行、流式传输事件、等待结果、取消工作或检查网关资源时，使用 `@openclaw/sdk`。

<Note>
  App SDK 不同于 [Plugin SDK](/plugins/sdk-overview)。
  `@openclaw/sdk` 从 OpenClaw 外部与网关通信。
  `openclaw/plugin-sdk/*` 仅用于在 OpenClaw 内部运行并注册提供商、频道、工具、钩子或可信运行时的插件。
</Note>

## 当前提供的功能

`@openclaw/sdk` 附带：

| 界面                      | 状态 | 功能                                                       |
| ------------------------- | ---- | ---------------------------------------------------------- |
| `OpenClaw`                | 就绪 | 主客户端入口点。拥有传输、连接、请求和事件。               |
| `GatewayClientTransport`  | 就绪 | 由网关客户端支持的 WebSocket 传输。                        |
| `oc.agents`               | 就绪 | 列出、创建、更新、删除和获取智能体句柄。                   |
| `Agent.run()`             | 就绪 | 启动网关 `agent` 运行并返回一个 `Run`。                    |
| `oc.runs`                 | 就绪 | 创建、获取、等待、取消和流式传输运行。                     |
| `Run.events()`            | 就绪 | 流式传输归一化的每次运行事件，对快速运行进行重放。         |
| `Run.wait()`              | 就绪 | 调用 `agent.wait` 并返回稳定的 `RunResult`。               |
| `Run.cancel()`            | 就绪 | 按运行 id 调用 `sessions.abort`，当可用时使用会话键。      |
| `oc.sessions`             | 就绪 | 创建、解析、发送到、修补、压缩和获取会话句柄。             |
| `Session.send()`          | 就绪 | 调用 `sessions.send` 并返回一个 `Run`。                    |
| `oc.models`               | 就绪 | 调用 `models.list` 和当前的 `models.authStatus` 状态 RPC。 |
| `oc.tools`                | 就绪 | 通过策略管道列出、范围限制和调用网关工具。                 |
| `oc.artifacts`            | 就绪 | 列出、获取和下载网关记录产物。                             |
| `oc.approvals`            | 就绪 | 通过网关审批 RPC 列出和解析执行审批。                      |
| `oc.rawEvents()`          | 就绪 | 为高级消费者公开原始网关事件。                             |
| `normalizeGatewayEvent()` | 就绪 | 将原始网关事件转换为稳定的 SDK 事件形状。                  |

SDK 还导出这些界面使用的核心类型：`AgentRunParams`、`RunResult`、`RunStatus`、`OpenClawEvent`、`OpenClawEventType`、`GatewayEvent`、`OpenClawTransport`、`GatewayRequestOptions`、`SessionCreateParams`、`SessionSendParams`、`ArtifactSummary`、`ArtifactQuery`、`ArtifactsListResult`、`ArtifactsGetResult`、`ArtifactsDownloadResult`、`RuntimeSelection`、`EnvironmentSelection`、`WorkspaceSelection`、`ApprovalMode` 和相关结果类型。

## 连接到网关

使用显式的网关 URL 创建客户端，或注入用于测试和嵌入式应用运行时的自定义传输。

```typescript
import { OpenClaw } from "@openclaw/sdk";

const oc = new OpenClaw({
  url: "ws://127.0.0.1:14565",
  token: process.env.OPENCLAW_GATEWAY_TOKEN,
  requestTimeoutMs: 30_000,
});

await oc.connect();
```

`new OpenClaw({ gateway: "ws://..." })` 等同于 `url`。构造函数接受 `gateway: "auto"` 选项，但自动网关发现还不是单独的 SDK 功能；当应用还不知道如何发现网关时，传递 `url`。

对于测试，传递一个实现 `OpenClawTransport` 的对象：

```typescript
const oc = new OpenClaw({
  transport: {
    async request(method, params) {
      return { method, params };
    },
    async *events() {},
  },
});
```

## 运行智能体

当应用想要智能体句柄时，使用 `oc.agents.get(id)`，然后调用 `agent.run()`。

```typescript
const agent = await oc.agents.get("main");

const run = await agent.run({
  input: "Review this pull request and suggest the smallest safe fix.",
  model: "openai/gpt-5.5",
  sessionKey: "main",
  timeoutMs: 30_000,
});

for await (const event of run.events()) {
  const data = event.data as { delta?: unknown };
  if (event.type === "assistant.delta" && typeof data.delta === "string") {
    process.stdout.write(data.delta);
  }
}

const result = await run.wait({ timeoutMs: 120_000 });
console.log(result.status);
```

提供商限定的模型引用，如 `openai/gpt-5.5`，被分割为网关 `provider` 和 `model` 覆盖。`timeoutMs` 在 SDK 中保持毫秒，并为 `agent` RPC 转换为网关超时秒数。

`run.wait()` 使用网关 `agent.wait` RPC。在运行仍然活跃时到期的等待截止时间返回 `status: "accepted"`，而不是假装运行本身超时了。运行时超时、中止的运行和取消的运行被规范化为 `timed_out` 或 `cancelled`。

## 创建和重用会话

当应用想要持久的记录状态时使用会话。

```typescript
const session = await oc.sessions.create({
  agentId: "main",
  label: "release-review",
});

const run = await session.send("Prepare release notes from the current diff.");
await run.wait();
```

`Session.send()` 调用 `sessions.send` 并返回一个 `Run`。会话句柄还支持：

```typescript
await session.abort(run.id);
await session.patch({ label: "renamed-session" });
await session.compact({ maxLines: 200 });
```

## 流式传输事件

SDK 将原始网关事件规范化为稳定的 `OpenClawEvent` 信封：

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
  raw?: GatewayEvent;
};
```

常见事件类型包括：

| 事件类型              | 来源网关事件                 |
| --------------------- | ---------------------------- |
| `run.started`         | `agent` 生命周期开始         |
| `run.completed`       | `agent` 生命周期结束         |
| `run.failed`          | `agent` 生命周期错误         |
| `run.cancelled`       | 中止/取消的生命周期结束      |
| `run.timed_out`       | 超时的生命周期结束           |
| `assistant.delta`     | 助手流式传输增量             |
| `assistant.message`   | 助手消息                     |
| `thinking.delta`      | 思考或计划流                 |
| `tool.call.started`   | 工具/项目/命令开始           |
| `tool.call.delta`     | 工具/项目/命令更新           |
| `tool.call.completed` | 工具/项目/命令完成           |
| `tool.call.failed`    | 工具/项目/命令失败或阻止状态 |
| `approval.requested`  | 执行或插件审批请求           |
| `approval.resolved`   | 执行或插件审批解析           |
| `session.created`     | `sessions.changed` 创建      |
| `session.updated`     | `sessions.changed` 更新      |
| `session.compacted`   | `sessions.changed` 压缩      |
| `task.updated`        | 任务更新事件                 |
| `artifact.updated`    | 补丁流事件                   |
| `raw`                 | 任何尚无稳定 SDK 映射的事件  |

`Run.events()` 将事件过滤到一个运行 id，并为快速运行重放已见事件。这意味着记录的流程是安全的：

```typescript
const run = await agent.run("Summarize the latest session.");

for await (const event of run.events()) {
  if (event.type === "run.completed") {
    break;
  }
}
```

对于应用范围的流，使用 `oc.events()`。对于原始网关帧，使用 `oc.rawEvents()`。

## 模型、工具、产物和审批

模型助手映射到当前的网关方法：

```typescript
await oc.models.list();
await oc.models.status({ probe: false }); // 调用 models.authStatus
```

工具助手公开网关目录、有效工具视图和直接的网关工具调用。`oc.tools.invoke()` 返回一个类型信封，而不是为策略或审批拒绝抛出异常。

```typescript
await oc.tools.list();
await oc.tools.effective({ sessionKey: "main" });
await oc.tools.invoke("tool-name", {
  args: { input: "value" },
  sessionKey: "main",
  confirm: false,
  idempotencyKey: "tool-call-1",
});
```

产物助手公开会话、运行或任务上下文的网关产物投影。每次调用需要一个显式的 `sessionKey`、`runId` 或 `taskId` 范围：

```typescript
const { artifacts } = await oc.artifacts.list({ sessionKey: "main" });
const first = artifacts[0];

if (first) {
  const { artifact } = await oc.artifacts.get(first.id, { sessionKey: "main" });
  const download = await oc.artifacts.download(artifact.id, { sessionKey: "main" });
  console.log(download.encoding, download.url);
}
```

审批助手使用执行审批 RPC：

```typescript
const approvals = await oc.approvals.list();
await oc.approvals.respond("approval-id", { decision: "approve" });
```

## 当前明确不支持的功能

SDK 包含我们想要的产品模型的名称，但不会静默假装网关 RPC 存在。这些调用当前抛出明确的不支持错误：

```typescript
await oc.tasks.list();
await oc.tasks.get("task-id");
await oc.tasks.cancel("task-id");

await oc.environments.list();
await oc.environments.create({});
await oc.environments.status("environment-id");
await oc.environments.delete("environment-id");
```

每次运行的 `workspace`、`runtime`、`environment` 和 `approvals` 字段被类型化为未来形状，但当前网关不支持 `agent` RPC 上的这些覆盖。如果调用者传递它们，SDK 在提交运行之前抛出，以防工作意外地以默认的工作区、运行时、环境或审批行为执行。

## App SDK 与 Plugin SDK

当代码位于 OpenClaw 外部时使用 App SDK：

- 启动或观察智能体运行的 Node 脚本
- 调用网关的 CI 任务
- 仪表板和管理面板
- IDE 扩展
- 不需要成为频道插件的外部桥接
- 带假或真实网关传输的集成测试

当代码在 OpenClaw 内部运行时使用 Plugin SDK：

- 提供商插件
- 频道插件
- 工具或生命周期钩子
- 智能体工具插件
- 可信运行时助手

App SDK 代码应该从 `@openclaw/sdk` 导入。插件代码应该从记录的 `openclaw/plugin-sdk/*` 子路径导入。不要混用这两个合约。

## 相关文档

- [OpenClaw App SDK API 设计](/reference/openclaw-sdk-api-design)
- [网关 RPC 参考](/reference/rpc)
- [智能体循环](/concepts/agent-loop)
- [智能体运行时](/concepts/agent-runtimes)
- [会话](/concepts/session)
- [后台任务](/automation/tasks)
- [ACP 智能体](/tools/acp-agents)
- [Plugin SDK 概述](/plugins/sdk-overview)
