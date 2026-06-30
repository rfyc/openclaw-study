---
title: "Codex 工具套件上下文引擎移植"
summary: "使捆绑的 Codex 应用服务器工具套件支持 OpenClaw 上下文引擎插件的规范说明"
read_when:
  - 将上下文引擎生命周期行为接入 Codex 工具套件时
  - 需要让 lossless-claw 或其他上下文引擎插件与 codex/* 嵌入式工具套件会话一起工作时
  - 比较嵌入式 PI 和 Codex 应用服务器上下文行为时
---

## 状态

草稿实现规范。

## 目标

使捆绑的 Codex 应用服务器工具套件遵循嵌入式 PI 轮次已经遵循的相同 OpenClaw 上下文引擎生命周期合约。

使用 `agents.defaults.embeddedHarness.runtime: "codex"` 或 `codex/*` 模型的会话仍然应该允许所选的上下文引擎插件（如 `lossless-claw`）在 Codex 应用服务器边界允许的范围内控制上下文组装、轮次后摄取、维护和 OpenClaw 级别的压缩策略。

## 非目标

- 不重新实现 Codex 应用服务器内部。
- 不让 Codex 原生线程压缩产生 lossless-claw 摘要。
- 不要求非 Codex 模型使用 Codex 工具套件。
- 不更改 ACP/acpx 会话行为。本规范仅针对非 ACP 嵌入式代理工具套件路径。
- 不让第三方插件注册 Codex 应用服务器扩展工厂；现有的捆绑插件信任边界保持不变。

## 当前架构

嵌入式运行循环在选择具体的低级工具套件之前，每次运行解析一次已配置的上下文引擎：

- `src/agents/pi-embedded-runner/run.ts`
  - 初始化上下文引擎插件
  - 调用 `resolveContextEngine(params.config)`
  - 将 `contextEngine` 和 `contextTokenBudget` 传入
    `runEmbeddedAttemptWithBackend(...)`

`runEmbeddedAttemptWithBackend(...)` 委托给所选的代理工具套件：

- `src/agents/pi-embedded-runner/run/backend.ts`
- `src/agents/harness/selection.ts`

Codex 应用服务器工具套件由捆绑的 Codex 插件注册：

- `extensions/codex/index.ts`
- `extensions/codex/harness.ts`

Codex 工具套件实现接收与 PI 支持的尝试相同的 `EmbeddedRunAttemptParams`：

- `extensions/codex/src/app-server/run-attempt.ts`

这意味着所需的钩子点在 OpenClaw 控制的代码中。外部边界是 Codex 应用服务器协议本身：OpenClaw 可以控制发送到 `thread/start`、`thread/resume` 和 `turn/start` 的内容，可以观察通知，但不能更改 Codex 的内部线程存储或原生压缩器。

## 当前差距

嵌入式 PI 尝试直接调用上下文引擎生命周期：

- 尝试前的引导/维护
- 模型调用前的组装
- 尝试后的 afterTurn 或摄取
- 成功轮次后的维护
- 拥有压缩的引擎的上下文引擎压缩

相关 PI 代码：

- `src/agents/pi-embedded-runner/run/attempt.ts`
- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts`

Codex 应用服务器尝试目前运行通用代理工具套件 hook 并镜像转录，但不调用 `params.contextEngine.bootstrap`、`params.contextEngine.assemble`、`params.contextEngine.afterTurn`、`params.contextEngine.ingestBatch`、`params.contextEngine.ingest` 或 `params.contextEngine.maintain`。

相关 Codex 代码：

- `extensions/codex/src/app-server/run-attempt.ts`
- `extensions/codex/src/app-server/thread-lifecycle.ts`
- `extensions/codex/src/app-server/event-projector.ts`
- `extensions/codex/src/app-server/compact.ts`

## 期望行为

对于 Codex 工具套件轮次，OpenClaw 应该保留以下生命周期：

1. 读取镜像的 OpenClaw 会话转录。
2. 当存在之前的会话文件时，引导活动的上下文引擎。
3. 在可用时运行引导维护。
4. 使用活动上下文引擎组装上下文。
5. 将组装的上下文转换为 Codex 兼容的输入。
6. 使用包含任何上下文引擎 `systemPromptAddition` 的开发者指令启动或恢复 Codex 线程。
7. 使用组装的面向用户的提示词启动 Codex 轮次。
8. 将 Codex 结果镜像回 OpenClaw 转录。
9. 使用镜像的转录快照调用 `afterTurn`（如果实现），否则调用 `ingestBatch`/`ingest`。
10. 在成功的非中止轮次后运行轮次维护。
11. 保留 Codex 原生压缩信号和 OpenClaw 压缩 hook。

## 设计约束

### Codex 应用服务器对原生线程状态保持权威性

Codex 拥有其原生线程和任何内部扩展历史。OpenClaw 不应该尝试通过支持的协议调用以外的方式改变应用服务器的内部历史。

OpenClaw 的转录镜像保持为 OpenClaw 功能的来源：

- 聊天历史
- 搜索
- `/new` 和 `/reset` 书签
- 未来的模型或工具套件切换
- 上下文引擎插件状态

### 上下文引擎组装必须投影到 Codex 输入中

上下文引擎接口返回 OpenClaw `AgentMessage[]`，而非 Codex 线程补丁。Codex 应用服务器 `turn/start` 接受当前用户输入，而 `thread/start` 和 `thread/resume` 接受开发者指令。

因此实现需要一个投影层。安全的第一个版本应该避免假装可以替换 Codex 内部历史。它应该将组装的上下文作为当前轮次周围的确定性提示词/开发者指令材料注入。

### 提示词缓存稳定性很重要

对于像 lossless-claw 这样的引擎，组装的上下文对于相同的输入应该是确定性的。不要在生成的上下文文本中添加时间戳、随机 ID 或非确定性排序。

### 运行时选择语义不变

工具套件选择保持不变：

- `runtime: "pi"` 强制 PI
- `runtime: "codex"` 选择已注册的 Codex 工具套件
- `runtime: "auto"` 让插件工具套件声明支持的提供商
- 不匹配的 `auto` 运行使用 PI

这项工作改变了在选择 Codex 工具套件后发生的事情。

## 实现计划

### 1. 导出或重定位可复用的上下文引擎尝试辅助工具

目前，可复用的生命周期辅助工具位于 PI 运行器下：

- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/run/attempt.prompt-helpers.ts`
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts`

如果可以避免，Codex 不应该从名称暗示 PI 的实现路径导入。

创建一个工具套件中立的模块，例如：

- `src/agents/harness/context-engine-lifecycle.ts`

移动或重新导出：

- `runAttemptContextEngineBootstrap`
- `assembleAttemptContextEngine`
- `finalizeAttemptContextEngineTurn`
- `buildAfterTurnRuntimeContext`
- `buildAfterTurnRuntimeContextFromUsage`
- `runContextEngineMaintenance` 的小型包装器

通过从旧文件重新导出或在同一个 PR 中更新 PI 调用点来保持 PI 导入工作。

中立辅助工具名称不应提及 PI。

建议的名称：

- `bootstrapHarnessContextEngine`
- `assembleHarnessContextEngine`
- `finalizeHarnessContextEngineTurn`
- `buildHarnessContextEngineRuntimeContext`
- `runHarnessContextEngineMaintenance`

### 2. 添加 Codex 上下文投影辅助工具

添加一个新模块：

- `extensions/codex/src/app-server/context-engine-projection.ts`

职责：

- 接受组装的 `AgentMessage[]`、原始镜像历史和当前提示词。
- 确定哪些上下文属于开发者指令与当前用户输入。
- 将当前用户提示词保留为最终可操作请求。
- 以稳定、显式的格式渲染先前的消息。
- 避免易变的元数据。

建议的 API：

```ts
export type CodexContextProjection = {
  developerInstructionAddition?: string;
  promptText: string;
  assembledMessages: AgentMessage[];
  prePromptMessageCount: number;
};

export function projectContextEngineAssemblyForCodex(params: {
  assembledMessages: AgentMessage[];
  originalHistoryMessages: AgentMessage[];
  prompt: string;
  systemPromptAddition?: string;
}): CodexContextProjection;
```

建议的第一个投影：

- 将 `systemPromptAddition` 放入开发者指令。
- 在 `promptText` 中当前提示词之前放置组装的转录上下文。
- 将其清晰地标记为 OpenClaw 组装的上下文。
- 将当前提示词放在最后。
- 如果当前用户提示词已经出现在尾部，则排除重复的当前用户提示词。

示例提示词形状：

```text
OpenClaw assembled context for this turn:

<conversation_context>
[user]
...

[assistant]
...
</conversation_context>

Current user request:
...
```

这不如原生 Codex 历史手术优雅，但它在 OpenClaw 内部是可实现的，并且保留了上下文引擎语义。

未来改进：如果 Codex 应用服务器公开了替换或补充线程历史的协议，请将此投影层替换为使用该 API，并保持生命周期调用不变。

### 3. 在 Codex 线程启动前连接引导

在 `extensions/codex/src/app-server/run-attempt.ts` 中：

- 像今天一样读取镜像的会话历史。
- 确定会话文件在此运行之前是否存在。优先使用在镜像写入之前检查 `fs.stat(params.sessionFile)` 的辅助工具。
- 如果辅助工具需要，打开 `SessionManager` 或使用窄会话管理器适配器。
- 当 `params.contextEngine` 存在时，调用中立引导辅助工具。

伪代码流程：

```ts
const hadSessionFile = await fileExists(params.sessionFile);
const sessionManager = SessionManager.open(params.sessionFile);
const historyMessages = sessionManager.buildSessionContext().messages;

await bootstrapHarnessContextEngine({
  hadSessionFile,
  contextEngine: params.contextEngine,
  sessionId: params.sessionId,
  sessionKey: sandboxSessionKey,
  sessionFile: params.sessionFile,
  sessionManager,
  runtimeContext: buildHarnessContextEngineRuntimeContext(...),
  runMaintenance: runHarnessContextEngineMaintenance,
  warn,
});
```

使用与 Codex 工具桥和转录镜像相同的 `sessionKey` 约定。今天 Codex 从 `params.sessionKey` 或 `params.sessionId` 计算 `sandboxSessionKey`；除非有理由保留原始 `params.sessionKey`，否则一致地使用它。

### 4. 在 `thread/start` / `thread/resume` 和 `turn/start` 之前连接组装

在 `runCodexAppServerAttempt` 中：

1. 首先构建动态工具，以便上下文引擎看到实际可用的工具名称。
2. 读取镜像的会话历史。
3. 当 `params.contextEngine` 存在时，运行上下文引擎 `assemble(...)`。
4. 将组装的结果投影到：
   - 开发者指令添加
   - `turn/start` 的提示词文本

现有的 hook 调用：

```ts
resolveAgentHarnessBeforePromptBuildResult({
  prompt: params.prompt,
  developerInstructions: buildDeveloperInstructions(params),
  messages: historyMessages,
  ctx: hookContext,
});
```

应该变为上下文感知：

1. 使用 `buildDeveloperInstructions(params)` 计算基础开发者指令
2. 应用上下文引擎组装/投影
3. 使用投影的提示词/开发者指令运行 `before_prompt_build`

此顺序让通用提示词 hook 看到 Codex 将接收的相同提示词。如果需要严格的 PI 奇偶校验，在 hook 组合之前运行上下文引擎组装，因为 PI 在其提示词流水线之后将上下文引擎 `systemPromptAddition` 应用到最终系统提示词。重要的不变量是上下文引擎和 hook 都得到一个确定性的、有文档记录的顺序。

第一个实现的推荐顺序：

1. `buildDeveloperInstructions(params)`
2. 上下文引擎 `assemble()`
3. 将 `systemPromptAddition` 附加/前置到开发者指令
4. 将组装的消息投影到提示词文本中
5. `resolveAgentHarnessBeforePromptBuildResult(...)`
6. 将最终开发者指令传递给 `startOrResumeThread(...)`
7. 将最终提示词文本传递给 `buildTurnStartParams(...)`

规范应该编码在测试中，以便未来的更改不会意外地重新排序它。

### 5. 保留提示词缓存稳定格式

投影辅助工具必须为相同的输入产生字节稳定的输出：

- 稳定的消息顺序
- 稳定的角色标签
- 无生成的时间戳
- 无对象键顺序泄漏
- 无随机分隔符
- 无每次运行的 ID

使用固定分隔符和显式部分。

### 6. 在转录镜像后连接轮次后处理

Codex 的 `CodexAppServerEventProjector` 为当前轮次构建本地 `messagesSnapshot`。`mirrorTranscriptBestEffort(...)` 将该快照写入 OpenClaw 转录镜像。

镜像成功或失败后，使用最佳可用消息快照调用上下文引擎终结器：

- 首选写入后的完整镜像会话上下文，因为 `afterTurn` 期望会话快照，而不仅仅是当前轮次。
- 如果会话文件无法重新打开，则回退到 `historyMessages + result.messagesSnapshot`。

伪代码流程：

```ts
const prePromptMessageCount = historyMessages.length;
await mirrorTranscriptBestEffort(...);
const finalMessages = readMirroredSessionHistoryMessages(params.sessionFile)
  ?? [...historyMessages, ...result.messagesSnapshot];

await finalizeHarnessContextEngineTurn({
  contextEngine: params.contextEngine,
  promptError: Boolean(finalPromptError),
  aborted: finalAborted,
  yieldAborted,
  sessionIdUsed: params.sessionId,
  sessionKey: sandboxSessionKey,
  sessionFile: params.sessionFile,
  messagesSnapshot: finalMessages,
  prePromptMessageCount,
  tokenBudget: params.contextTokenBudget,
  runtimeContext: buildHarnessContextEngineRuntimeContextFromUsage({
    attempt: params,
    workspaceDir: effectiveWorkspace,
    agentDir,
    tokenBudget: params.contextTokenBudget,
    lastCallUsage: result.attemptUsage,
    promptCache: result.promptCache,
  }),
  runMaintenance: runHarnessContextEngineMaintenance,
  sessionManager,
  warn,
});
```

如果镜像失败，仍然使用回退快照调用 `afterTurn`，但记录上下文引擎正在从回退轮次数据摄取。

### 7. 规范化使用量和提示词缓存运行时上下文

Codex 结果包含从应用服务器令牌通知中规范化的使用量（当可用时）。将该使用量传递到上下文引擎运行时上下文中。

如果 Codex 应用服务器最终公开缓存读/写详情，将它们映射到 `ContextEnginePromptCacheInfo`。在此之前，省略 `promptCache` 而不是发明零值。

### 8. 压缩策略

有两个压缩系统：

1. OpenClaw 上下文引擎 `compact()`
2. Codex 应用服务器原生 `thread/compact/start`

不要悄悄地将它们混为一谈。

#### `/compact` 和显式 OpenClaw 压缩

当所选上下文引擎具有 `info.ownsCompaction === true` 时，显式 OpenClaw 压缩应该优先使用上下文引擎的 `compact()` 结果作为 OpenClaw 转录镜像和插件状态。

当所选 Codex 工具套件具有原生线程绑定时，我们可能还会请求 Codex 原生压缩以保持应用服务器线程健康，但这必须在详情中报告为单独的后端操作。

推荐行为：

- 如果 `contextEngine.info.ownsCompaction === true`：
  - 首先调用上下文引擎 `compact()`
  - 然后在存在线程绑定时尽力调用 Codex 原生压缩
  - 将上下文引擎结果作为主要结果返回
  - 在 `details.codexNativeCompaction` 中包含 Codex 原生压缩状态
- 如果活动上下文引擎不拥有压缩：
  - 保留当前 Codex 原生压缩行为

这可能需要更改 `extensions/codex/src/app-server/compact.ts` 或从通用压缩路径包装它，具体取决于 `maybeCompactAgentHarnessSession(...)` 被调用的位置。

#### 轮次内 Codex 原生 contextCompaction 事件

Codex 可能在轮次期间发出 `contextCompaction` 条目事件。在 `event-projector.ts` 中保留当前的压缩前/后 hook 发射，但不将其视为已完成的上下文引擎压缩。

对于拥有压缩的引擎，当 Codex 无论如何执行原生压缩时，发出显式诊断：

- 流/事件名称：现有的 `compaction` 流是可接受的
- 详情：`{ backend: "codex-app-server", ownsCompaction: true }`

这使拆分可审计。

### 9. 会话重置和绑定行为

现有的 Codex 工具套件 `reset(...)` 从 OpenClaw 会话文件中清除 Codex 应用服务器绑定。保留该行为。

还要确保上下文引擎状态清理通过现有的 OpenClaw 会话生命周期路径继续发生。除非上下文引擎生命周期当前对所有工具套件都遗漏了重置/删除事件，否则不要添加 Codex 特定的清理。

### 10. 错误处理

遵循 PI 语义：

- 引导失败警告并继续
- 组装失败警告并回退到未组装的流水线消息/提示词
- afterTurn/摄取失败警告并将轮次后最终化标记为不成功
- 维护仅在成功的非中止、非产出轮次后运行
- 压缩错误不应作为新鲜提示词重试

Codex 特定的添加：

- 如果上下文投影失败，警告并回退到原始提示词。
- 如果转录镜像失败，仍然尝试使用回退消息进行上下文引擎最终化。
- 如果 Codex 原生压缩在上下文引擎压缩成功后失败，当上下文引擎是主要的时，不要使整个 OpenClaw 压缩失败。

## 测试计划

### 单元测试

在 `extensions/codex/src/app-server` 下添加测试：

1. `run-attempt.context-engine.test.ts`
   - 当会话文件存在时，Codex 调用 `bootstrap`。
   - Codex 使用镜像消息、令牌预算、工具名称、引用模式、模型 ID 和提示词调用 `assemble`。
   - `systemPromptAddition` 包含在开发者指令中。
   - 组装的消息在当前请求之前投影到提示词中。
   - 转录镜像后，Codex 调用 `afterTurn`。
   - 没有 `afterTurn` 时，Codex 调用 `ingestBatch` 或每消息 `ingest`。
   - 成功轮次后运行轮次维护。
   - 提示词错误、中止或产出中止时不运行轮次维护。

2. `context-engine-projection.test.ts`
   - 对相同输入的稳定输出
   - 当组装历史包含它时，没有重复的当前提示词
   - 处理空历史
   - 保留角色顺序
   - 仅在开发者指令中包含系统提示词添加

3. `compact.context-engine.test.ts`
   - 拥有上下文引擎的主要结果胜出
   - 当也尝试时，Codex 原生压缩状态出现在详情中
   - Codex 原生失败不会使拥有上下文引擎的压缩失败
   - 非拥有上下文引擎保留当前原生压缩行为

### 需要更新的现有测试

- `extensions/codex/src/app-server/run-attempt.test.ts`（如果存在），否则是最近的 Codex 应用服务器运行测试。
- `extensions/codex/src/app-server/event-projector.test.ts` 仅在压缩事件详情发生变化时。
- `src/agents/harness/selection.test.ts` 不需要更改，除非配置行为发生变化；它应该保持稳定。
- PI 上下文引擎测试应该继续不变地通过。

### 集成/实时测试

添加或扩展实时 Codex 工具套件冒烟测试：

- 将 `plugins.slots.contextEngine` 配置为测试引擎
- 将 `agents.defaults.model` 配置为 `codex/*` 模型
- 将 `agents.defaults.embeddedHarness.runtime = "codex"` 配置
- 断言测试引擎观察到：
  - bootstrap
  - assemble
  - afterTurn 或 ingest
  - maintenance

避免在 OpenClaw 核心测试中需要 lossless-claw。使用仓库内的小型伪上下文引擎插件。

## 可观测性

在 Codex 上下文引擎生命周期调用周围添加调试日志：

- `codex context engine bootstrap started/completed/failed`
- `codex context engine assemble applied`
- `codex context engine finalize completed/failed`
- `codex context engine maintenance skipped` 带原因
- `codex native compaction completed alongside context-engine compaction`

避免记录完整的提示词或转录内容。

在有用的地方添加结构化字段：

- `sessionId`
- `sessionKey` 根据现有日志记录实践进行脱敏或省略
- `engineId`
- `threadId`
- `turnId`
- `assembledMessageCount`
- `estimatedTokens`
- `hasSystemPromptAddition`

## 迁移/兼容性

这应该向后兼容：

- 如果没有配置上下文引擎，旧版上下文引擎行为应该等同于今天的 Codex 工具套件行为。
- 如果上下文引擎 `assemble` 失败，Codex 应该继续使用原始提示词路径。
- 现有的 Codex 线程绑定应该保持有效。
- 动态工具指纹不应该包含上下文引擎输出；否则每次上下文更改都可能强制创建新的 Codex 线程。只有工具目录应该影响动态工具指纹。

## 开放问题

1. 组装的上下文应该完全注入用户提示词中、完全注入开发者指令中，还是拆分？

   建议：拆分。将 `systemPromptAddition` 放入开发者指令；将组装的转录上下文放入用户提示词包装器中。这最好地匹配当前的 Codex 协议，而不改变原生线程历史。

2. 当上下文引擎拥有压缩时，是否应该禁用 Codex 原生压缩？

   建议：不，至少一开始不。Codex 原生压缩可能仍然需要保持应用服务器线程健康。但它必须报告为原生 Codex 压缩，而不是上下文引擎压缩。

3. `before_prompt_build` 应该在上下文引擎组装之前还是之后运行？

   建议：在 Codex 的上下文引擎投影之后，以便通用工具套件 hook 看到 Codex 将接收的实际提示词/开发者指令。如果 PI 奇偶校验需要相反，请将所选顺序编码在测试中并在此处记录。

4. Codex 应用服务器能接受未来结构化的上下文/历史覆盖吗？

   未知。如果可以，用该协议替换文本投影层，并保持生命周期调用不变。

## 验收标准

- `codex/*` 嵌入式工具套件轮次调用所选上下文引擎的组装生命周期。
- 上下文引擎 `systemPromptAddition` 影响 Codex 开发者指令。
- 组装的上下文以确定性方式影响 Codex 轮次输入。
- 成功的 Codex 轮次调用 `afterTurn` 或摄取回退。
- 成功的 Codex 轮次运行上下文引擎轮次维护。
- 失败/中止/产出中止的轮次不运行轮次维护。
- 上下文引擎自有的压缩对于 OpenClaw/插件状态保持主要地位。
- Codex 原生压缩保持可审计为原生 Codex 行为。
- 现有的 PI 上下文引擎行为不变。
- 当没有选择非旧版上下文引擎或组装失败时，现有的 Codex 工具套件行为不变。
