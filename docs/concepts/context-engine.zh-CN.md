---
summary: "上下文引擎：可插拔的上下文组装、压缩和子智能体生命周期"
read_when:
  - 你想了解 OpenClaw 如何组装模型上下文
  - 你正在切换遗留引擎和插件引擎
  - 你正在构建上下文引擎插件
title: "上下文引擎"
sidebarTitle: "上下文引擎"
---

**上下文引擎**控制 OpenClaw 如何为每次运行构建模型上下文：包含哪些消息、如何压缩旧历史，以及如何跨子智能体边界管理上下文。

OpenClaw 自带内置的 `legacy` 引擎，默认使用它——大多数用户永远不需要更改这个。只有当你需要不同的组装、压缩或跨会话召回行为时，才安装并选择插件引擎。

## 快速开始

<Steps>
  <Step title="检查哪个引擎处于活跃状态">
    ```bash
    openclaw doctor
    # 或者直接检查配置：
    cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
    ```
  </Step>
  <Step title="安装插件引擎">
    上下文引擎插件像其他 OpenClaw 插件一样安装。

    <Tabs>
      <Tab title="来自 npm">
        ```bash
        openclaw plugins install @martian-engineering/lossless-claw
        ```
      </Tab>
      <Tab title="来自本地路径">
        ```bash
        openclaw plugins install -l ./my-context-engine
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="启用并选择引擎">
    ```json5
    // openclaw.json
    {
      plugins: {
        slots: {
          contextEngine: "lossless-claw", // 必须匹配插件注册的引擎 id
        },
        entries: {
          "lossless-claw": {
            enabled: true,
            // 插件特定配置放这里（参见插件文档）
          },
        },
      },
    }
    ```

    安装和配置后重启网关。

  </Step>
  <Step title="切换回遗留引擎（可选）">
    将 `contextEngine` 设置为 `"legacy"`（或完全删除该键——`"legacy"` 是默认值）。
  </Step>
</Steps>

## 工作原理

每次 OpenClaw 运行模型提示时，上下文引擎在四个生命周期点参与：

<AccordionGroup>
  <Accordion title="1. 摄取">
    当新消息添加到会话时调用。引擎可以在自己的数据存储中存储或索引消息。
  </Accordion>
  <Accordion title="2. 组装">
    在每次模型运行之前调用。引擎返回一组有序的消息（以及可选的 `systemPromptAddition`），这些消息适合令牌预算。
  </Accordion>
  <Accordion title="3. 压缩">
    当上下文窗口已满时，或当用户运行 `/compact` 时调用。引擎压缩旧历史以释放空间。
  </Accordion>
  <Accordion title="4. 轮次后">
    运行完成后调用。引擎可以持久化状态、触发后台压缩或更新索引。
  </Accordion>
</AccordionGroup>

对于内置的非 ACP Codex harness，OpenClaw 通过将组装好的上下文投影到 Codex 开发者指令和当前轮次提示中来应用相同的生命周期。Codex 仍然拥有其原生线程历史和原生压缩器。

### 子智能体生命周期（可选）

OpenClaw 调用两个可选的子智能体生命周期钩子：

<ParamField path="prepareSubagentSpawn" type="method">
  在子运行开始之前准备共享上下文状态。该钩子接收父/子会话键、`contextMode`（`isolated` 或 `fork`）、可用的记录 id/文件和可选的 TTL。如果它返回回滚句柄，OpenClaw 在准备成功后 spawn 失败时调用它。
</ParamField>
<ParamField path="onSubagentEnded" type="method">
  当子智能体会话完成或被清除时进行清理。
</ParamField>

### 系统提示附加

`assemble` 方法可以返回一个 `systemPromptAddition` 字符串。OpenClaw 将其前置到运行的系统提示中。这让引擎可以注入动态召回指导、检索指令或上下文感知提示，而无需静态工作区文件。

## 遗留引擎

内置的 `legacy` 引擎保留了 OpenClaw 的原始行为：

- **摄取**：无操作（会话管理器直接处理消息持久化）。
- **组装**：透传（运行时中现有的清理 → 验证 → 限制管道处理上下文组装）。
- **压缩**：委托给内置的摘要压缩，它创建旧消息的单一摘要并保持最近消息完整。
- **轮次后**：无操作。

遗留引擎不注册工具，也不提供 `systemPromptAddition`。

当没有设置 `plugins.slots.contextEngine`（或设置为 `"legacy"`）时，自动使用此引擎。

## 插件引擎

插件可以使用插件 API 注册上下文引擎：

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function register(api) {
  api.registerContextEngine("my-engine", (ctx) => ({
    info: {
      id: "my-engine",
      name: "My Context Engine",
      ownsCompaction: true,
    },

    async ingest({ sessionId, message, isHeartbeat }) {
      // 在数据存储中存储消息
      return { ingested: true };
    },

    async assemble({ sessionId, messages, tokenBudget, availableTools, citationsMode }) {
      // 返回适合预算的消息
      return {
        messages: buildContext(messages, tokenBudget),
        estimatedTokens: countTokens(messages),
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },

    async compact({ sessionId, force }) {
      // 压缩旧上下文
      return { ok: true, compacted: true };
    },
  }));
}
```

工厂 `ctx` 包含可选的 `config`、`agentDir` 和 `workspaceDir` 值，这样插件可以在第一个生命周期钩子运行之前初始化每个智能体或每个工作区的状态。

然后在配置中启用它：

```json5
{
  plugins: {
    slots: {
      contextEngine: "my-engine",
    },
    entries: {
      "my-engine": {
        enabled: true,
      },
    },
  },
}
```

### ContextEngine 接口

必需成员：

| 成员               | 类型 | 用途                                          |
| ------------------ | ---- | --------------------------------------------- |
| `info`             | 属性 | 引擎 id、名称、版本，以及是否拥有压缩         |
| `ingest(params)`   | 方法 | 存储单个消息                                  |
| `assemble(params)` | 方法 | 为模型运行构建上下文（返回 `AssembleResult`） |
| `compact(params)`  | 方法 | 压缩/减少上下文                               |

`assemble` 返回一个 `AssembleResult`，包含：

<ParamField path="messages" type="Message[]" required>
  发送给模型的有序消息。
</ParamField>
<ParamField path="estimatedTokens" type="number" required>
  引擎对组装上下文中总令牌数的估计。OpenClaw 使用此值进行压缩阈值决策和诊断报告。
</ParamField>
<ParamField path="systemPromptAddition" type="string">
  前置到系统提示中。
</ParamField>
<ParamField path="promptAuthority" type='"assembled" | "preassembly_may_overflow"'>
  控制运行器用于预防性溢出预检的令牌估计。默认为 `"assembled"`，意味着只检查组装提示的估计——适用于返回有窗口的、自包含上下文的引擎。仅当你的组装视图可能在底层记录中隐藏溢出风险时才设置为 `"preassembly_may_overflow"`；此时运行器在决定是否预先压缩时取组装估计和预组装（未加窗口）会话历史估计的最大值。无论哪种方式，你返回的消息仍然是模型看到的——`promptAuthority` 只影响预检。
</ParamField>

`compact` 返回一个 `CompactResult`。当压缩轮换活跃记录时，`result.sessionId` 和 `result.sessionFile` 标识下一次重试或轮次必须使用的后继会话。

可选成员：

| 成员                           | 类型 | 用途                                                                     |
| ------------------------------ | ---- | ------------------------------------------------------------------------ |
| `bootstrap(params)`            | 方法 | 为会话初始化引擎状态。在引擎第一次看到会话时调用一次（例如，导入历史）。 |
| `ingestBatch(params)`          | 方法 | 将完成的轮次作为批次摄取。在运行完成后调用，包含该轮次的所有消息。       |
| `afterTurn(params)`            | 方法 | 运行后生命周期工作（持久化状态、触发后台压缩）。                         |
| `prepareSubagentSpawn(params)` | 方法 | 在子会话开始之前为其设置共享状态。                                       |
| `onSubagentEnded(params)`      | 方法 | 子智能体结束后进行清理。                                                 |
| `dispose()`                    | 方法 | 释放资源。在网关关闭或插件重新加载时调用——不是每会话调用。               |

### ownsCompaction

`ownsCompaction` 控制 Pi 的内置运行内自动压缩是否对该运行保持启用：

<AccordionGroup>
  <Accordion title="ownsCompaction: true">
    引擎拥有压缩行为。OpenClaw 为该运行禁用 Pi 的内置自动压缩，引擎的 `compact()` 实现负责 `/compact`、溢出恢复压缩以及它希望在 `afterTurn()` 中进行的任何主动压缩。OpenClaw 可能仍然运行预提示溢出保护；当它预测完整记录会溢出时，恢复路径在提交另一个提示之前调用活跃引擎的 `compact()`。
  </Accordion>
  <Accordion title="ownsCompaction: false 或未设置">
    Pi 的内置自动压缩在提示执行期间可能仍然运行，但活跃引擎的 `compact()` 方法仍然被调用用于 `/compact` 和溢出恢复。
  </Accordion>
</AccordionGroup>

<Warning>
`ownsCompaction: false` **不**意味着 OpenClaw 自动回退到遗留引擎的压缩路径。
</Warning>

这意味着有两种有效的插件模式：

<Tabs>
  <Tab title="拥有模式">
    实现你自己的压缩算法并设置 `ownsCompaction: true`。
  </Tab>
  <Tab title="委托模式">
    设置 `ownsCompaction: false`，并让 `compact()` 从 `openclaw/plugin-sdk/core` 调用 `delegateCompactionToRuntime(...)` 以使用 OpenClaw 的内置压缩行为。
  </Tab>
</Tabs>

对于活跃的非拥有引擎，空操作的 `compact()` 是不安全的，因为它会禁用该引擎槽的正常 `/compact` 和溢出恢复压缩路径。

## 配置参考

```json5
{
  plugins: {
    slots: {
      // 选择活跃的上下文引擎。默认："legacy"。
      // 设置为插件 id 以使用插件引擎。
      contextEngine: "legacy",
    },
  },
}
```

<Note>
该槽在运行时是独占的——对于给定的运行或压缩操作，只会解析一个注册的上下文引擎。其他启用的 `kind: "context-engine"` 插件仍然可以加载并运行其注册代码；`plugins.slots.contextEngine` 只选择 OpenClaw 在需要上下文引擎时解析哪个注册的引擎 id。
</Note>

<Note>
**插件卸载：** 当你卸载当前选定为 `plugins.slots.contextEngine` 的插件时，OpenClaw 将该槽重置回默认值（`legacy`）。同样的重置行为也适用于 `plugins.slots.memory`。不需要手动编辑配置。
</Note>

## 与压缩和记忆的关系

<AccordionGroup>
  <Accordion title="压缩">
    压缩是上下文引擎的一个职责。遗留引擎委托给 OpenClaw 的内置摘要。插件引擎可以实现任何压缩策略（DAG 摘要、向量检索等）。
  </Accordion>
  <Accordion title="记忆插件">
    记忆插件（`plugins.slots.memory`）与上下文引擎是分离的。记忆插件提供搜索/检索；上下文引擎控制模型看到什么。它们可以一起工作——上下文引擎可以在组装过程中使用记忆插件数据。想要活跃记忆提示路径的插件引擎应该优先使用 `openclaw/plugin-sdk/core` 中的 `buildMemorySystemPromptAddition(...)`，它将活跃记忆提示段落转换为准备好的 `systemPromptAddition` 前置内容。如果引擎需要更低级别的控制，它仍然可以通过 `buildActiveMemoryPromptSection(...)` 从 `openclaw/plugin-sdk/memory-host-core` 提取原始行。
  </Accordion>
  <Accordion title="会话修剪">
    无论哪个上下文引擎处于活跃状态，内存中修剪旧工具结果的操作仍然运行。
  </Accordion>
</AccordionGroup>

## 提示

- 使用 `openclaw doctor` 验证你的引擎是否正确加载。
- 如果切换引擎，现有会话继续使用其当前历史。新引擎接管未来的运行。
- 引擎错误会被记录并在诊断中显示。如果插件引擎注册失败或选定的引擎 id 无法解析，OpenClaw 不会自动回退；运行将失败，直到你修复插件或将 `plugins.slots.contextEngine` 切换回 `"legacy"`。
- 开发时，使用 `openclaw plugins install -l ./my-engine` 链接本地插件目录而无需复制。

## 相关

- [压缩](/concepts/compaction) — 压缩长对话
- [上下文](/concepts/context) — 如何为智能体轮次构建上下文
- [插件架构](/plugins/architecture) — 注册上下文引擎插件
- [插件清单](/plugins/manifest) — 插件清单字段
- [插件](/tools/plugin) — 插件概述
