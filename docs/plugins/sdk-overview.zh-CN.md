---
summary: "导入映射、注册 API 参考和 SDK 架构"
title: "插件 SDK 概览"
sidebarTitle: "插件 SDK 概览"
read_when:
  - 你需要知道从哪个 SDK 子路径导入
  - 你想要 OpenClawPluginApi 上所有注册方法的参考
  - 你正在查找特定的 SDK 导出
---

插件 SDK 是插件和核心之间的类型化合约。本页面是
**导入什么**和**可以注册什么**的参考。

<Note>
  本页面适用于在 OpenClaw 内部使用 `openclaw/plugin-sdk/*` 的插件作者。
  对于希望通过 Gateway 运行 agent 的外部应用、脚本、仪表板、CI 作业和 IDE 扩展，
  请改用 [OpenClaw App SDK](/concepts/openclaw-sdk) 和 `@openclaw/sdk` 包。
</Note>

<Tip>
寻找操作指南？从[构建插件](/plugins/building-plugins)开始，对于频道插件使用[频道插件](/plugins/sdk-channel-plugins)，对于提供商插件使用[提供商插件](/plugins/sdk-provider-plugins)，对于工具或生命周期钩子插件使用[插件钩子](/plugins/hooks)。
</Tip>

## 导入约定

始终从特定子路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

每个子路径是一个小型自包含模块。这使启动保持快速并防止循环依赖问题。对于频道特定的入口/构建助手，优先使用 `openclaw/plugin-sdk/channel-core`；将 `openclaw/plugin-sdk/core` 保留用于更广泛的伞形接口和共享助手，如 `buildChannelConfigSchema`。

对于频道配置，通过 `openclaw.plugin.json#channelConfigs` 发布频道拥有的 JSON Schema。`plugin-sdk/channel-config-schema` 子路径用于共享模式原语和通用构建器。OpenClaw 的捆绑插件将 `plugin-sdk/bundled-channel-config-schema` 用于保留的捆绑频道模式。已弃用的兼容性导出保留在 `plugin-sdk/channel-config-schema-legacy` 上；两个捆绑模式子路径都不是新插件的模式。

<Warning>
  不要导入提供商或频道品牌的便利接口（例如
  `openclaw/plugin-sdk/slack`、`.../discord`、`.../signal`、`.../whatsapp`）。
  捆绑插件在其自己的 `api.ts` / `runtime-api.ts` 桶内组合通用 SDK 子路径；核心消费者应该使用这些插件本地桶，或者在需求确实跨频道时添加窄通用 SDK 合约。

一小组捆绑插件助手接口在具有跟踪所有者使用情况时仍然出现在生成的导出映射中。它们仅用于捆绑插件维护，不是新第三方插件的推荐导入路径。

`openclaw/plugin-sdk/discord` 和 `openclaw/plugin-sdk/telegram-account` 也作为跟踪所有者使用的已弃用兼容性外观保留。不要将这些导入路径复制到新插件；改用注入的运行时助手和通用频道 SDK 子路径。
</Warning>

## 子路径参考

插件 SDK 作为一组按区域分组的窄子路径公开（插件入口、频道、提供商、认证、运行时、能力、内存和保留的捆绑插件助手）。有关完整目录（已分组和链接），请参见[插件 SDK 子路径](/plugins/sdk-subpaths)。

200+ 个子路径的生成列表位于 `scripts/lib/plugin-sdk-entrypoints.json`。

## 注册 API

`register(api)` 回调接收带有以下方法的 `OpenClawPluginApi` 对象：

### 能力注册

| 方法                                             | 注册内容                |
| ------------------------------------------------ | ----------------------- |
| `api.registerProvider(...)`                      | 文本推理（LLM）         |
| `api.registerAgentHarness(...)`                  | 实验性低级 agent 执行器 |
| `api.registerCliBackend(...)`                    | 本地 CLI 推理后端       |
| `api.registerChannel(...)`                       | 消息频道                |
| `api.registerSpeechProvider(...)`                | 文本转语音 / STT 合成   |
| `api.registerRealtimeTranscriptionProvider(...)` | 流式实时转录            |
| `api.registerRealtimeVoiceProvider(...)`         | 双工实时语音会话        |
| `api.registerMediaUnderstandingProvider(...)`    | 图像/音频/视频分析      |
| `api.registerImageGenerationProvider(...)`       | 图像生成                |
| `api.registerMusicGenerationProvider(...)`       | 音乐生成                |
| `api.registerVideoGenerationProvider(...)`       | 视频生成                |
| `api.registerWebFetchProvider(...)`              | Web 获取 / 抓取提供商   |
| `api.registerWebSearchProvider(...)`             | Web 搜索                |

### 工具和命令

| 方法                            | 注册内容                                  |
| ------------------------------- | ----------------------------------------- |
| `api.registerTool(tool, opts?)` | Agent 工具（必需或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自定义命令（绕过 LLM）                    |

插件命令可以在 agent 需要简短的命令拥有路由提示时设置 `agentPromptGuidance`。保持该文本关于命令本身；不要将提供商或插件特定的策略添加到核心提示构建器。

### 基础设施

| 方法                                           | 注册内容                |
| ---------------------------------------------- | ----------------------- |
| `api.registerHook(events, handler, opts?)`     | 事件钩子                |
| `api.registerHttpRoute(params)`                | 网关 HTTP 端点          |
| `api.registerGatewayMethod(name, handler)`     | 网关 RPC 方法           |
| `api.registerGatewayDiscoveryService(service)` | 本地 Gateway 发现广播器 |
| `api.registerCli(registrar, opts?)`            | CLI 子命令              |
| `api.registerService(service)`                 | 后台服务                |
| `api.registerInteractiveHandler(registration)` | 交互处理器              |
| `api.registerAgentToolResultMiddleware(...)`   | 运行时工具结果中间件    |
| `api.registerMemoryPromptSupplement(builder)`  | 附加内存邻近提示部分    |
| `api.registerMemoryCorpusSupplement(adapter)`  | 附加内存搜索/读取语料库 |

### 工作流插件的宿主钩子

宿主钩子是需要参与宿主生命周期而不仅仅是添加提供商、频道或工具的插件的 SDK 接口。它们是通用合约；计划模式可以使用它们，但审批工作流、工作区策略门控、后台监视器、设置向导和 UI 伴侣插件也可以。

| 方法                                                                     | 拥有的合约                                                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `api.registerSessionExtension(...)`                                      | 插件拥有的、JSON 兼容的会话状态通过 Gateway 会话投影                                                    |
| `api.enqueueNextTurnInjection(...)`                                      | 持久的精确一次上下文注入到一个会话的下一个 agent 轮次                                                   |
| `api.registerTrustedToolPolicy(...)`                                     | 可以阻止或重写工具参数的捆绑/受信任预插件工具策略                                                       |
| `api.registerToolMetadata(...)`                                          | 不改变工具实现的工具目录显示元数据                                                                      |
| `api.registerCommand(...)`                                               | 范围化插件命令；命令结果可以设置 `continueAgent: true`；Discord 原生命令支持 `descriptionLocalizations` |
| `api.registerControlUiDescriptor(...)`                                   | 控制 UI 为会话、工具、运行或设置接口贡献描述符                                                          |
| `api.registerRuntimeLifecycle(...)`                                      | 插件拥有的运行时资源在重置/删除/重加载路径上的清理回调                                                  |
| `api.registerAgentEventSubscription(...)`                                | 工作流状态和监视器的净化事件订阅                                                                        |
| `api.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)` | 在终端运行生命周期上清除的每次运行插件临时状态                                                          |
| `api.registerSessionSchedulerJob(...)`                                   | 带有确定性清理的插件拥有会话调度器作业记录                                                              |

合约故意分割权限：

- 外部插件可以拥有会话扩展、UI 描述符、命令、工具元数据、下一轮次注入和普通钩子。
- 受信任的工具策略在普通的 `before_tool_call` 钩子之前运行，并且仅限捆绑的，因为它们参与宿主安全策略。
- 保留的命令所有权仅限捆绑的。外部插件应使用自己的命令名称或别名。
- `allowPromptInjection=false` 禁用包括 `agent_turn_prepare`、`before_prompt_build`、`heartbeat_prompt_contribution`、来自旧版 `before_agent_start` 的提示字段和 `enqueueNextTurnInjection` 在内的提示变更钩子。

非计划消费者的例子：

| 插件原型            | 使用的钩子                                                                         |
| ------------------- | ---------------------------------------------------------------------------------- |
| 审批工作流          | 会话扩展、命令续集、下一轮次注入、UI 描述符                                        |
| 预算/工作区策略门控 | 受信任的工具策略、工具元数据、会话投影                                             |
| 后台生命周期监视器  | 运行时生命周期清理、agent 事件订阅、会话调度器所有权/清理、心跳提示贡献、UI 描述符 |
| 设置或加入向导      | 会话扩展、范围化命令、控制 UI 描述符                                               |

<Note>
  保留的核心管理员命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、
  `update.*`）始终保持 `operator.admin`，即使插件尝试分配
  更窄的网关方法范围。对于插件拥有的方法优先使用插件特定前缀。
</Note>

<Accordion title="何时使用工具结果中间件">
  当捆绑插件需要在执行后和运行时将结果反馈给模型之前重写工具结果时，可以使用 `api.registerAgentToolResultMiddleware(...)`。这是用于异步输出减少器（如 tokenjuice）的受信任运行时中立接口。

捆绑插件必须为每个目标运行时声明 `contracts.agentToolResultMiddleware`，例如 `["pi", "codex"]`。外部插件不能注册此中间件；对于不需要预模型工具结果时机的工作，保留普通的 OpenClaw 插件钩子。旧的仅 Pi 嵌入式扩展工厂注册路径已被移除。
</Accordion>

### 网关发现注册

`api.registerGatewayDiscoveryService(...)` 让插件在本地发现传输（如 mDNS/Bonjour）上广播活动的 Gateway。OpenClaw 在启用本地发现时在 Gateway 启动期间调用服务，传递当前的 Gateway 端口和非密钥 TXT 提示数据，并在 Gateway 关闭期间调用返回的 `stop` 处理器。

```typescript
api.registerGatewayDiscoveryService({
  id: "my-discovery",
  async advertise(ctx) {
    const handle = await startMyAdvertiser({
      gatewayPort: ctx.gatewayPort,
      tls: ctx.gatewayTlsEnabled,
      displayName: ctx.machineDisplayName,
    });
    return { stop: () => handle.stop() };
  },
});
```

网关发现插件不得将广播的 TXT 值视为密钥或认证。发现是路由提示；网关认证和 TLS 固定仍然拥有信任。

### CLI 注册元数据

`api.registerCli(registrar, opts?)` 接受两种顶级元数据：

- `commands`：由注册器拥有的显式命令根
- `descriptors`：用于根 CLI 帮助、路由和懒加载插件 CLI 注册的解析时命令描述符

如果你希望插件命令在正常的根 CLI 路径中保持懒加载，请提供覆盖该注册器公开的每个顶级命令根的 `descriptors`。

```typescript
api.registerCli(
  async ({ program }) => {
    const { registerMatrixCli } = await import("./src/cli.js");
    registerMatrixCli({ program });
  },
  {
    descriptors: [
      {
        name: "matrix",
        description: "Manage Matrix accounts, verification, devices, and profile state",
        hasSubcommands: true,
      },
    ],
  },
);
```

仅当不需要懒加载根 CLI 注册时单独使用 `commands`。该急加载兼容性路径仍然受支持，但它不安装用于解析时懒加载的描述符支持占位符。

### CLI 后端注册

`api.registerCliBackend(...)` 让插件拥有本地 AI CLI 后端（如 `codex-cli`）的默认配置。

- 后端 `id` 成为模型引用（如 `codex-cli/gpt-5`）中的提供商前缀。
- 后端 `config` 使用与 `agents.defaults.cliBackends.<id>` 相同的形状。
- 用户配置仍然优先。OpenClaw 在运行 CLI 之前将 `agents.defaults.cliBackends.<id>` 与插件默认值合并。
- 当后端在合并后需要兼容性重写时（例如规范化旧的标志形状），使用 `normalizeConfig`。

### 独占槽

| 方法                                       | 注册内容                                                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次只有一个活动）。`assemble()` 回调接收 `availableTools` 和 `citationsMode`，以便引擎可以调整提示添加。 |
| `api.registerMemoryCapability(capability)` | 统一内存能力                                                                                                          |
| `api.registerMemoryPromptSection(builder)` | 内存提示部分构建器                                                                                                    |
| `api.registerMemoryFlushPlan(resolver)`    | 内存刷新计划解析器                                                                                                    |
| `api.registerMemoryRuntime(runtime)`       | 内存运行时适配器                                                                                                      |

### 内存嵌入适配器

| 方法                                           | 注册内容                 |
| ---------------------------------------------- | ------------------------ |
| `api.registerMemoryEmbeddingProvider(adapter)` | 活动插件的内存嵌入适配器 |

- `registerMemoryCapability` 是首选的独占内存插件 API。
- `registerMemoryCapability` 还可以公开 `publicArtifacts.listArtifacts(...)`，以便伴侣插件可以通过 `openclaw/plugin-sdk/memory-host-core` 消费导出的内存工件，而不是进入特定内存插件的私有布局。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和 `registerMemoryRuntime` 是旧版兼容的独占内存插件 API。
- `MemoryFlushPlan.model` 可以将刷新轮次固定到精确的 `provider/model` 引用（如 `ollama/qwen3:8b`），而无需继承活动的回退链。
- `registerMemoryEmbeddingProvider` 让活动内存插件注册一个或多个嵌入适配器 id（例如 `openai`、`gemini` 或自定义插件定义的 id）。
- 用户配置（如 `agents.defaults.memorySearch.provider` 和 `agents.defaults.memorySearch.fallback`）根据这些注册的适配器 id 进行解析。

### 事件和生命周期

| 方法                                         | 作用               |
| -------------------------------------------- | ------------------ |
| `api.on(hookName, handler, opts?)`           | 类型化生命周期钩子 |
| `api.onConversationBindingResolved(handler)` | 对话绑定回调       |

请参见[插件钩子](/plugins/hooks)了解示例、常用钩子名称和门控语义。

### 钩子决策语义

- `before_tool_call`：返回 `{ block: true }` 是终止的。一旦任何处理器设置它，低优先级处理器就会被跳过。
- `before_tool_call`：返回 `{ block: false }` 被视为无决策（与省略 `block` 相同），不是覆盖。
- `before_install`：返回 `{ block: true }` 是终止的。一旦任何处理器设置它，低优先级处理器就会被跳过。
- `before_install`：返回 `{ block: false }` 被视为无决策（与省略 `block` 相同），不是覆盖。
- `reply_dispatch`：返回 `{ handled: true, ... }` 是终止的。一旦任何处理器声明调度，低优先级处理器和默认模型调度路径就会被跳过。
- `message_sending`：返回 `{ cancel: true }` 是终止的。一旦任何处理器设置它，低优先级处理器就会被跳过。
- `message_sending`：返回 `{ cancel: false }` 被视为无决策（与省略 `cancel` 相同），不是覆盖。
- `message_received`：当你需要入站线程/话题路由时使用类型化的 `threadId` 字段。将 `metadata` 用于频道特定的额外内容。
- `message_sending`：在回退到频道特定的 `metadata` 之前使用类型化的 `replyToId` / `threadId` 路由字段。
- `gateway_start`：使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 获取网关拥有的启动状态，而不是依赖内部 `gateway:startup` 钩子。
- `cron_changed`：观察网关拥有的定时任务生命周期变化。在同步外部唤醒调度器时使用 `event.job?.state?.nextRunAtMs` 和 `ctx.getCron?.()`，并将 OpenClaw 作为到期检查和执行的可信来源。

### API 对象字段

| 字段                     | 类型                      | 描述                                                            |
| ------------------------ | ------------------------- | --------------------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 id                                                         |
| `api.name`               | `string`                  | 显示名称                                                        |
| `api.version`            | `string?`                 | 插件版本（可选）                                                |
| `api.description`        | `string?`                 | 插件描述（可选）                                                |
| `api.source`             | `string`                  | 插件源路径                                                      |
| `api.rootDir`            | `string?`                 | 插件根目录（可选）                                              |
| `api.config`             | `OpenClawConfig`          | 当前配置快照（可用时的活动内存运行时快照）                      |
| `api.pluginConfig`       | `Record<string, unknown>` | 来自 `plugins.entries.<id>.config` 的插件特定配置               |
| `api.runtime`            | `PluginRuntime`           | [运行时助手](/plugins/sdk-runtime)                              |
| `api.logger`             | `PluginLogger`            | 范围化日志器（`debug`、`info`、`warn`、`error`）                |
| `api.registrationMode`   | `PluginRegistrationMode`  | 当前加载模式；`"setup-runtime"` 是轻量级预完整入口启动/设置窗口 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相对于插件根的路径                                          |

## 内部模块约定

在你的插件内部，使用本地桶文件进行内部导入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  永远不要从生产代码中通过 `openclaw/plugin-sdk/<your-plugin>` 导入你自己的插件。
  通过 `./api.ts` 或 `./runtime-api.ts` 路由内部导入。SDK 路径仅是外部合约。
</Warning>

门面加载的捆绑插件公共接口（`api.ts`、`runtime-api.ts`、`index.ts`、`setup-entry.ts` 和类似的公共入口文件）在 OpenClaw 已经运行时优先使用活动运行时配置快照。如果还没有运行时快照，它们回退到磁盘上已解析的配置文件。
打包的捆绑插件门面应该通过 OpenClaw 的插件门面加载器加载；直接从 `dist/extensions/...` 导入会绕过打包安装用于插件拥有代码的清单和运行时附属检查。

当助手故意是提供商特定的且还不属于通用 SDK 子路径时，提供商插件可以公开窄的插件本地合约桶。捆绑示例：

- **Anthropic**：用于 Claude beta 头和 `service_tier` 流助手的公共 `api.ts` / `contract-api.ts` 接口。
- **`@openclaw/openai-provider`**：`api.ts` 导出提供商构建器、默认模型助手和实时提供商构建器。
- **`@openclaw/openrouter-provider`**：`api.ts` 导出提供商构建器加上加入/配置助手。

<Warning>
  扩展生产代码也应该避免 `openclaw/plugin-sdk/<other-plugin>` 导入。
  如果一个助手确实是共享的，请将其提升到中立的 SDK 子路径，
  如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他
  面向能力的接口，而不是将两个插件耦合在一起。
</Warning>

## 相关文档

<CardGroup cols={2}>
  <Card title="入口点" icon="door-open" href="/plugins/sdk-entrypoints">
    `definePluginEntry` 和 `defineChannelPluginEntry` 选项。
  </Card>
  <Card title="运行时助手" icon="gears" href="/plugins/sdk-runtime">
    完整的 `api.runtime` 命名空间参考。
  </Card>
  <Card title="设置和配置" icon="sliders" href="/plugins/sdk-setup">
    打包、清单和配置模式。
  </Card>
  <Card title="测试" icon="vial" href="/plugins/sdk-testing">
    测试工具和 lint 规则。
  </Card>
  <Card title="SDK 迁移" icon="arrows-turn-right" href="/plugins/sdk-migration">
    从已弃用接口迁移。
  </Card>
  <Card title="插件内部" icon="diagram-project" href="/plugins/architecture">
    深度架构和能力模型。
  </Card>
</CardGroup>
