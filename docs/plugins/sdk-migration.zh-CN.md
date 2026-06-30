---
summary: "从旧版向后兼容层迁移到现代插件 SDK"
title: "插件 SDK 迁移"
sidebarTitle: "迁移到 SDK"
read_when:
  - 你看到 OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED 警告
  - 你看到 OPENCLAW_EXTENSION_API_DEPRECATED 警告
  - 你在 OpenClaw 2026.4.25 之前使用了 api.registerEmbeddedExtensionFactory
  - 你正在将插件更新到现代插件架构
  - 你维护一个外部 OpenClaw 插件
---

OpenClaw 已从广泛的向后兼容层转向具有专注、有文档记录导入的现代插件架构。如果你的插件是在新架构之前构建的，本指南可以帮助你迁移。

## 正在变化的内容

旧插件系统提供了两个开放的接口，让插件可以从单一入口点导入任何所需的内容：

- **`openclaw/plugin-sdk/compat`** — 一个重新导出数十个助手的单一导入。它的引入是为了在构建新插件架构时保持旧版基于钩子的插件正常工作。
- **`openclaw/plugin-sdk/infra-runtime`** — 一个混合了系统事件、心跳状态、传递队列、获取/代理助手、文件助手、审批类型和不相关工具的宽运行时助手桶。
- **`openclaw/plugin-sdk/config-runtime`** — 一个在迁移窗口期间仍然携带已弃用的直接加载/写入助手的宽配置兼容性桶。
- **`openclaw/extension-api`** — 一个给插件直接访问宿主端助手（如嵌入式 agent 运行器）的桥接。
- **`api.registerEmbeddedExtensionFactory(...)`** — 一个已移除的仅 Pi 捆绑扩展钩子，可以观察嵌入式运行器事件（如 `tool_result`）。

宽导入接口现在**已弃用**。它们在运行时仍然有效，但新插件不能使用它们，现有插件应该在下一个主要版本删除它们之前迁移。仅 Pi 嵌入式扩展工厂注册 API 已被移除；请改用工具结果中间件。

OpenClaw 不会在引入替代方案的同一更改中删除或重新解释有文档记录的插件行为。破坏性合约更改必须首先通过兼容性适配器、诊断、文档和弃用窗口。这适用于 SDK 导入、清单字段、设置 API、钩子和运行时注册行为。

<Warning>
  向后兼容层将在未来的主要版本中移除。
  仍然从这些接口导入的插件在发生这种情况时将会中断。
  仅 Pi 嵌入式扩展工厂注册已不再加载。
</Warning>

## 为什么要改变

旧方式导致了问题：

- **启动缓慢** — 导入一个助手会加载数十个不相关的模块
- **循环依赖** — 广泛的重新导出使创建导入循环变得容易
- **不明确的 API 接口** — 无法区分哪些导出是稳定的还是内部的

现代插件 SDK 解决了这个问题：每个导入路径（`openclaw/plugin-sdk/\<subpath\>`）
是一个具有明确目的和有文档记录合约的小型自包含模块。

用于捆绑频道的旧版提供商便利接口也已消失。
频道品牌助手接口是私有单仓库快捷方式，不是稳定的
插件合约。请改用窄通用 SDK 子路径。在捆绑
插件工作区内，将提供商拥有的助手保留在该插件自己的 `api.ts` 或
`runtime-api.ts` 中。

当前捆绑提供商示例：

- Anthropic 在自己的 `api.ts` / `contract-api.ts` 接口中保留 Claude 特定的流助手
- OpenAI 在自己的 `api.ts` 中保留提供商构建器、默认模型助手和实时提供商构建器
- OpenRouter 在自己的 `api.ts` 中保留提供商构建器和加入/配置助手

## 兼容性策略

对于外部插件，兼容性工作按以下顺序进行：

1. 添加新合约
2. 通过兼容性适配器保持旧行为的连接
3. 发出诊断或警告，命名旧路径和替代方案
4. 在测试中涵盖两条路径
5. 记录弃用和迁移路径
6. 仅在公告的迁移窗口后删除，通常在主要版本中

维护者可以使用 `pnpm plugins:boundary-report` 审计当前的迁移队列。使用 `pnpm plugins:boundary-report:summary` 获取紧凑计数，使用 `--owner <id>` 获取一个插件或兼容性所有者，以及当 CI 门应该在到期兼容性记录、跨所有者保留的 SDK 导入或未使用保留的 SDK 子路径上失败时使用 `pnpm plugins:boundary-report:ci`。报告按删除日期对已弃用的兼容性记录进行分组，计算本地代码/文档引用，呈现跨所有者保留的 SDK 导入，并总结私有内存主机 SDK 桥接，以便兼容性清理保持明确而不是依赖临时搜索。保留的 SDK 子路径必须跟踪所有者使用情况；未使用的保留助手导出应从公共 SDK 中删除。

如果清单字段仍然被接受，插件作者可以继续使用它，直到文档和诊断另有说明。新代码应该优先使用有文档记录的替代方案，但现有插件在普通次要版本中不应该中断。

## 如何迁移

<Steps>
  <Step title="迁移运行时配置加载/写入助手">
    捆绑插件应该停止直接调用
    `api.runtime.config.loadConfig()` 和
    `api.runtime.config.writeConfigFile(...)`。优先使用已经
    传入活动调用路径的配置。需要当前进程快照的长期处理器可以使用 `api.runtime.config.current()`。长期
    agent 工具应该在 `execute` 内部使用工具上下文的 `ctx.getRuntimeConfig()`，
    以便配置写入之前创建的工具仍然看到刷新的运行时配置。

    配置写入必须通过事务助手并选择写后策略：

    ```typescript
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    当调用者知道更改需要干净的网关重启时使用 `afterWrite: { mode: "restart", reason: "..." }`，
    仅当调用者拥有后续操作并故意想要抑制重载规划器时才使用
    `afterWrite: { mode: "none", reason: "..." }`。
    变更结果包括用于测试和日志的类型化 `followUp` 摘要；
    网关负责应用或安排重启。
    `loadConfig` 和 `writeConfigFile` 在迁移窗口期间保留为
    外部插件的已弃用兼容性助手，并使用 `runtime-config-load-write` 兼容性代码警告一次。捆绑插件和仓库
    运行时代码受 `pnpm check:deprecated-internal-config-api` 和
    `pnpm check:no-runtime-action-load-config` 中的扫描器保护：新生产插件使用
    直接失败，直接配置写入失败，网关服务器方法必须使用
    请求运行时快照，运行时频道发送/操作/客户端助手
    必须从其边界接收配置，长期运行时模块允许零个环境 `loadConfig()` 调用。

    新插件代码还应避免导入宽
    `openclaw/plugin-sdk/config-runtime` 兼容性桶。使用与工作匹配的窄
    SDK 子路径：

    | 需求 | 导入 |
    | --- | --- |
    | 配置类型，如 `OpenClawConfig` | `openclaw/plugin-sdk/config-types` |
    | 已加载的配置断言和插件入口配置查找 | `openclaw/plugin-sdk/plugin-config-runtime` |
    | 当前运行时快照读取 | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | 配置写入 | `openclaw/plugin-sdk/config-mutation` |
    | 会话存储助手 | `openclaw/plugin-sdk/session-store-runtime` |
    | Markdown 表格配置 | `openclaw/plugin-sdk/markdown-table-runtime` |
    | 组策略运行时助手 | `openclaw/plugin-sdk/runtime-group-policy` |
    | 密钥输入解析 | `openclaw/plugin-sdk/secret-input-runtime` |
    | 模型/会话覆盖 | `openclaw/plugin-sdk/model-session-runtime` |

    捆绑插件及其测试受扫描器保护，不允许宽桶，因此导入和模拟保持
    局限于它们所需的行为。宽桶仍然存在用于外部兼容性，但新代码不应依赖它。

  </Step>

  <Step title="将 Pi 工具结果扩展迁移到中间件">
    捆绑插件必须用运行时中立的中间件替换仅 Pi 的
    `api.registerEmbeddedExtensionFactory(...)` 工具结果处理器。

    ```typescript
    // Pi and Codex runtime dynamic tools
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["pi", "codex"],
    });
    ```

    同时更新插件清单：

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["pi", "codex"]
      }
    }
    ```

    外部插件不能注册工具结果中间件，因为它可以在
    模型看到之前重写高信任的工具输出。

  </Step>

  <Step title="将审批原生处理器迁移到能力事实">
    具有审批能力的频道插件现在通过
    `approvalCapability.nativeRuntime` 加上共享运行时上下文注册表公开原生审批行为。

    关键更改：

    - 用 `approvalCapability.nativeRuntime` 替换 `approvalCapability.handler.loadRuntime(...)`
    - 从旧版 `plugin.auth` / `plugin.approvals` 连接中移除审批特定的认证/传递，将其放到 `approvalCapability` 上
    - `ChannelPlugin.approvals` 已从公共频道插件合约中移除；将传递/原生/渲染字段移到 `approvalCapability` 上
    - `plugin.auth` 仅用于频道登录/注销流程；审批认证
      钩子不再被核心从那里读取
    - 通过 `openclaw/plugin-sdk/channel-runtime-context` 注册频道拥有的运行时对象，如客户端、令牌或 Bolt 应用
    - 不要从原生审批处理器发送插件拥有的重路由通知；核心现在从实际传递结果拥有路由到其他地方的通知
    - 将 `channelRuntime` 传递到 `createChannelManager(...)` 时，提供真实的 `createPluginRuntime().channel` 接口。部分存根被拒绝。

    请参见 `/plugins/sdk-channel-plugins` 了解当前的审批能力布局。

  </Step>

  <Step title="审计 Windows 包装器回退行为">
    如果你的插件使用 `openclaw/plugin-sdk/windows-spawn`，未解析的 Windows
    `.cmd`/`.bat` 包装器现在会关闭失败，除非你明确传递
    `allowShellFallback: true`。

    ```typescript
    // Before
    const program = applyWindowsSpawnProgramPolicy({ candidate });

    // After
    const program = applyWindowsSpawnProgramPolicy({
      candidate,
      // Only set this for trusted compatibility callers that intentionally
      // accept shell-mediated fallback.
      allowShellFallback: true,
    });
    ```

    如果你的调用者不故意依赖 shell 回退，不要设置
    `allowShellFallback`，而是处理抛出的错误。

  </Step>

  <Step title="查找已弃用的导入">
    在你的插件中搜索来自任一已弃用接口的导入：

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/infra-runtime" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="替换为专注导入">
    旧接口中的每个导出都映射到特定的现代导入路径：

    ```typescript
    // Before (deprecated backwards-compatibility layer)
    import {
      createChannelReplyPipeline,
      createPluginRuntimeStore,
      resolveControlCommandGate,
    } from "openclaw/plugin-sdk/compat";

    // After (modern focused imports)
    import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import { resolveControlCommandGate } from "openclaw/plugin-sdk/command-auth";
    ```

    对于宿主端助手，请使用注入的插件运行时而不是直接导入：

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    相同的模式适用于其他旧版桥接助手：

    | 旧导入 | 现代等价 |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | 会话存储助手 | `api.runtime.agent.session.*` |

  </Step>

  <Step title="替换宽 infra-runtime 导入">
    `openclaw/plugin-sdk/infra-runtime` 仍然存在用于外部
    兼容性，但新代码应该导入它实际需要的专注助手接口：

    | 需求 | 导入 |
    | --- | --- |
    | 系统事件队列助手 | `openclaw/plugin-sdk/system-event-runtime` |
    | 心跳事件和可见性助手 | `openclaw/plugin-sdk/heartbeat-runtime` |
    | 挂起传递队列排空 | `openclaw/plugin-sdk/delivery-queue-runtime` |
    | 频道活动遥测 | `openclaw/plugin-sdk/channel-activity-runtime` |
    | 内存去重缓存 | `openclaw/plugin-sdk/dedupe-runtime` |
    | 安全本地文件/媒体路径助手 | `openclaw/plugin-sdk/file-access-runtime` |
    | 调度器感知获取 | `openclaw/plugin-sdk/runtime-fetch` |
    | 代理和防护获取助手 | `openclaw/plugin-sdk/fetch-runtime` |
    | SSRF 调度器策略类型 | `openclaw/plugin-sdk/ssrf-dispatcher` |
    | 审批请求/解析类型 | `openclaw/plugin-sdk/approval-runtime` |
    | 审批回复载荷和命令助手 | `openclaw/plugin-sdk/approval-reply-runtime` |
    | 错误格式化助手 | `openclaw/plugin-sdk/error-runtime` |
    | 传输就绪等待 | `openclaw/plugin-sdk/transport-ready-runtime` |
    | 安全令牌助手 | `openclaw/plugin-sdk/secure-random-runtime` |
    | 有界异步任务并发 | `openclaw/plugin-sdk/concurrency-runtime` |
    | 数字强制 | `openclaw/plugin-sdk/number-runtime` |
    | 进程本地异步锁 | `openclaw/plugin-sdk/async-lock-runtime` |
    | 文件锁 | `openclaw/plugin-sdk/file-lock` |

    捆绑插件受扫描器保护，不允许 `infra-runtime`，因此仓库代码
    无法退回到宽桶。

  </Step>

  <Step title="迁移频道路由助手">
    新的频道路由代码应该使用 `openclaw/plugin-sdk/channel-route`。
    较旧的路由键和可比较目标名称在迁移窗口期间保留为兼容性
    别名，但新插件应使用直接描述行为的路由名称：

    | 旧助手 | 现代助手 |
    | --- | --- |
    | `channelRouteIdentityKey(...)` | `channelRouteDedupeKey(...)` |
    | `channelRouteKey(...)` | `channelRouteCompactKey(...)` |
    | `ComparableChannelTarget` | `ChannelRouteParsedTarget` |
    | `resolveComparableTargetForChannel(...)` | `resolveRouteTargetForChannel(...)` |
    | `resolveComparableTargetForLoadedChannel(...)` | `resolveRouteTargetForLoadedChannel(...)` |
    | `comparableChannelTargetsMatch(...)` | `channelRouteTargetsMatchExact(...)` |
    | `comparableChannelTargetsShareRoute(...)` | `channelRouteTargetsShareConversation(...)` |

    现代路由助手在原生审批、回复抑制、入站去重、
    定时传递和会话路由中一致地规范化 `{ channel, to, accountId, threadId }`。
    如果你的插件拥有自定义目标语法，使用 `resolveChannelRouteTargetWithParser(...)` 将该
    解析器适配到相同的路由目标合约中。

  </Step>

  <Step title="构建和测试">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 导入路径参考

<Accordion title="常用导入路径表">
  | 导入路径 | 用途 | 关键导出 |
  | --- | --- | --- |
  | `plugin-sdk/plugin-entry` | 规范插件入口助手 | `definePluginEntry` |
  | `plugin-sdk/core` | 用于频道入口定义/构建器的旧版伞形重新导出 | `defineChannelPluginEntry`、`createChatChannelPlugin` |
  | `plugin-sdk/config-schema` | 根配置模式导出 | `OpenClawSchema` |
  | `plugin-sdk/provider-entry` | 单提供商入口助手 | `defineSingleProviderPluginEntry` |
  | `plugin-sdk/channel-core` | 专注的频道入口定义和构建器 | `defineChannelPluginEntry`、`defineSetupPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase` |
  | `plugin-sdk/setup` | 共享设置向导助手 | 允许列表提示、设置状态构建器 |
  | `plugin-sdk/setup-runtime` | 设置时运行时助手 | 导入安全的设置补丁适配器、查找笔记助手、`promptResolvedAllowFrom`、`splitSetupEntries`、委托设置代理 |
  | `plugin-sdk/setup-adapter-runtime` | 设置适配器助手 | `createEnvPatchedAccountSetupAdapter` |
  | `plugin-sdk/setup-tools` | 设置工具助手 | `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR` |
  | `plugin-sdk/account-core` | 多账户助手 | 账户列表/配置/操作门控助手 |
  | `plugin-sdk/account-id` | 账户 id 助手 | `DEFAULT_ACCOUNT_ID`、账户 id 规范化 |
  | `plugin-sdk/account-resolution` | 账户查找助手 | 账户查找 + 默认回退助手 |
  | `plugin-sdk/account-helpers` | 窄账户助手 | 账户列表/账户操作助手 |
  | `plugin-sdk/channel-setup` | 设置向导适配器 | `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`，加上 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` |
  | `plugin-sdk/channel-pairing` | DM 配对原语 | `createChannelPairingController` |
  | `plugin-sdk/channel-reply-pipeline` | 回复前缀、打字和源传递连接 | `createChannelReplyPipeline`、`resolveChannelSourceReplyDeliveryMode` |
  | `plugin-sdk/channel-config-helpers` | 配置适配器工厂和 DM 访问助手 | `createHybridChannelConfigAdapter`、`resolveChannelDmAccess`、`resolveChannelDmAllowFrom`、`resolveChannelDmPolicy`、`normalizeChannelDmPolicy`、`normalizeLegacyDmAliases` |
  | `plugin-sdk/channel-config-schema` | 配置模式构建器 | 共享频道配置模式原语和通用构建器 |
  | `plugin-sdk/bundled-channel-config-schema` | 捆绑配置模式 | 仅 OpenClaw 维护的捆绑插件；新插件必须定义插件本地模式 |
  | `plugin-sdk/channel-config-schema-legacy` | 已弃用的捆绑配置模式 | 仅兼容性别名；对于维护的捆绑插件使用 `plugin-sdk/bundled-channel-config-schema` |
  | `plugin-sdk/telegram-command-config` | Telegram 命令配置助手 | 命令名称规范化、描述修剪、重复/冲突验证 |
  | `plugin-sdk/channel-policy` | 组/DM 策略解析 | `resolveChannelGroupRequireMention` |
  | `plugin-sdk/channel-lifecycle` | 账户状态和草稿流生命周期助手 | `createAccountStatusSink`、草稿预览最终化助手 |
  | `plugin-sdk/inbound-envelope` | 入站信封助手 | 共享路由 + 信封构建器助手 |
  | `plugin-sdk/inbound-reply-dispatch` | 入站回复助手 | 共享记录和调度助手 |
  | `plugin-sdk/messaging-targets` | 消息传递目标解析 | 目标解析/匹配助手 |
  | `plugin-sdk/outbound-media` | 出站媒体助手 | 共享出站媒体加载 |
  | `plugin-sdk/outbound-send-deps` | 出站发送依赖助手 | 轻量级 `resolveOutboundSendDep` 查找，无需导入完整出站运行时 |
  | `plugin-sdk/outbound-runtime` | 出站运行时助手 | 出站传递、身份/发送委托、会话、格式化和载荷规划助手 |
  | `plugin-sdk/thread-bindings-runtime` | 线程绑定助手 | 线程绑定生命周期和适配器助手 |
  | `plugin-sdk/agent-media-payload` | 旧版媒体载荷助手 | 旧版字段布局的 Agent 媒体载荷构建器 |
  | `plugin-sdk/channel-runtime` | 已弃用的兼容性垫片 | 仅旧版频道运行时工具 |
  | `plugin-sdk/channel-send-result` | 发送结果类型 | 回复结果类型 |
  | `plugin-sdk/runtime-store` | 持久插件存储 | `createPluginRuntimeStore` |
  | `plugin-sdk/runtime` | 宽运行时助手 | 运行时/日志/备份/插件安装助手 |
  | `plugin-sdk/runtime-env` | 窄运行时环境助手 | 日志器/运行时环境、超时、重试和退避助手 |
  | `plugin-sdk/plugin-runtime` | 共享插件运行时助手 | 插件命令/钩子/HTTP/交互助手 |
  | `plugin-sdk/hook-runtime` | 钩子管道助手 | 共享 webhook/内部钩子管道助手 |
  | `plugin-sdk/lazy-runtime` | 懒运行时助手 | `createLazyRuntimeModule`、`createLazyRuntimeMethod`、`createLazyRuntimeMethodBinder`、`createLazyRuntimeNamedExport`、`createLazyRuntimeSurface` |
  | `plugin-sdk/process-runtime` | 进程助手 | 共享 exec 助手 |
  | `plugin-sdk/cli-runtime` | CLI 运行时助手 | 命令格式化、等待、版本助手 |
  | `plugin-sdk/gateway-runtime` | 网关助手 | 网关客户端、事件循环就绪启动助手和频道状态补丁助手 |
  | `plugin-sdk/config-runtime` | 已弃用的配置兼容性垫片 | 优先使用 `config-types`、`plugin-config-runtime`、`runtime-config-snapshot` 和 `config-mutation` |
  | `plugin-sdk/approval-runtime` | 审批提示助手 | Exec/插件审批载荷、审批能力/配置文件助手、原生审批路由/运行时助手和结构化审批显示路径格式化 |
  | `plugin-sdk/approval-auth-runtime` | 审批认证助手 | 审批者解析、同聊天操作认证 |
  | `plugin-sdk/approval-client-runtime` | 审批客户端助手 | 原生 exec 审批配置文件/过滤助手 |
  | `plugin-sdk/approval-delivery-runtime` | 审批传递助手 | 原生审批能力/传递适配器 |
  | `plugin-sdk/approval-gateway-runtime` | 审批网关助手 | 共享审批网关解析助手 |
  | `plugin-sdk/approval-handler-adapter-runtime` | 审批适配器助手 | 热频道入口点的轻量级原生审批适配器加载助手 |
  | `plugin-sdk/approval-handler-runtime` | 审批处理器助手 | 更广泛的审批处理器运行时助手；当它们足够时优先使用窄适配器/网关接口 |
  | `plugin-sdk/approval-native-runtime` | 审批目标助手 | 原生审批目标/账户绑定助手 |
  | `plugin-sdk/approval-reply-runtime` | 审批回复助手 | Exec/插件审批回复载荷助手 |
  | `plugin-sdk/channel-runtime-context` | 频道运行时上下文助手 | 通用频道运行时上下文注册/获取/监视助手 |
  | `plugin-sdk/security-runtime` | 安全助手 | 共享信任、DM 门控、外部内容和密钥收集助手 |
  | `plugin-sdk/testing` | 测试工具 | 旧版宽兼容性桶；优先使用专注的测试子路径，如 `plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/channel-target-testing`、`plugin-sdk/test-env` 和 `plugin-sdk/test-fixtures` |
</Accordion>

此表故意是常用迁移子集，而不是完整的 SDK
接口。200+ 个入口点的完整列表位于
`scripts/lib/plugin-sdk-entrypoints.json`。

保留的捆绑插件助手接口已从公共 SDK
导出映射中退休，除了明确记录的兼容性外观，如为已发布的
`@openclaw/discord@2026.3.13` 包保留的已弃用 `plugin-sdk/discord` 垫片。所有者特定的助手位于
拥有插件包内；共享宿主行为应通过通用 SDK
合约移动，如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime`
和 `plugin-sdk/plugin-config-runtime`。

使用与工作匹配的最窄导入。如果找不到导出，
请在 `src/plugin-sdk/` 检查源代码或询问维护者哪个通用合约应该拥有它。

## 活动弃用

适用于插件 SDK、提供商合约、运行时接口和清单的较窄弃用。每个今天仍然有效，但将在未来的主要版本中移除。每个项目下面的条目将旧 API 映射到其规范替代方案。

<AccordionGroup>
  <Accordion title="command-auth 帮助构建器 → command-status">
    **旧（`openclaw/plugin-sdk/command-auth`）**: `buildCommandsMessage`、
    `buildCommandsMessagePaginated`、`buildHelpMessage`。

    **新（`openclaw/plugin-sdk/command-status`）**: 相同的签名，相同的
    导出 — 只是从更窄的子路径导入。`command-auth`
    将它们作为兼容性存根重新导出。

    ```typescript
    // Before
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-auth";

    // After
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-status";
    ```

  </Accordion>

  <Accordion title="提及门控助手 → resolveInboundMentionDecision">
    **旧**: 来自 `openclaw/plugin-sdk/channel-inbound` 或
    `openclaw/plugin-sdk/channel-mention-gating` 的 `resolveInboundMentionRequirement({ facts, policy })` 和
    `shouldDropInboundForMention(...)`。

    **新**: `resolveInboundMentionDecision({ facts, policy })` — 返回
    一个单一决策对象，而不是两个分开的调用。

    下游频道插件（Slack、Discord、Matrix、MS Teams）已经切换。

  </Accordion>

  <Accordion title="频道运行时垫片和频道操作助手">
    `openclaw/plugin-sdk/channel-runtime` 是旧版
    频道插件的兼容性垫片。不要从新代码中导入它；使用
    `openclaw/plugin-sdk/channel-runtime-context` 注册运行时对象。

    `openclaw/plugin-sdk/channel-actions` 中的 `channelActions*` 助手与原始"操作"频道导出一起被弃用。通过语义 `presentation` 接口公开能力 — 频道插件声明它们渲染什么（卡片、按钮、选择框），而不是它们接受哪些原始操作名称。

  </Accordion>

  <Accordion title="Web 搜索提供商 tool() 助手 → 插件上的 createTool()">
    **旧**: 来自 `openclaw/plugin-sdk/provider-web-search` 的 `tool()` 工厂。

    **新**: 直接在提供商插件上实现 `createTool(...)`。
    OpenClaw 不再需要 SDK 助手来注册工具包装器。

  </Accordion>

  <Accordion title="纯文本频道信封 → BodyForAgent">
    **旧**: `formatInboundEnvelope(...)` （和
    `ChannelMessageForAgent.channelEnvelope`）从入站频道消息构建平面纯文本提示信封。

    **新**: `BodyForAgent` 加上结构化用户上下文块。频道
    插件将路由元数据（线程、主题、回复至、反应）作为
    类型化字段附加，而不是将它们连接成提示字符串。
    `formatAgentEnvelope(...)` 助手仍然支持合成的
    面向助手的信封，但入站纯文本信封正在逐步淘汰。

    影响区域：`inbound_claim`、`message_received` 和任何后处理
    `channelEnvelope` 文本的自定义频道插件。

  </Accordion>

  <Accordion title="提供商发现类型 → 提供商目录类型">
    四个发现类型别名现在是
    目录时代类型的薄包装器：

    | 旧别名 | 新类型 |
    | --- | --- |
    | `ProviderDiscoveryOrder` | `ProviderCatalogOrder` |
    | `ProviderDiscoveryContext` | `ProviderCatalogContext` |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult` |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog` |

    加上旧版 `ProviderCapabilities` 静态包 — 提供商插件
    应该使用显式提供商钩子，如 `buildReplayPolicy`、
    `normalizeToolSchemas` 和 `wrapStreamFn`，而不是静态对象。

  </Accordion>

  <Accordion title="思考策略钩子 → resolveThinkingProfile">
    **旧**（`ProviderThinkingPolicy` 上的三个独立钩子）：
    `isBinaryThinking(ctx)`、`supportsXHighThinking(ctx)` 和
    `resolveDefaultThinkingLevel(ctx)`。

    **新**: 单个 `resolveThinkingProfile(ctx)`，返回
    带有规范 `id`、可选 `label` 和
    排名级别列表的 `ProviderThinkingProfile`。OpenClaw 自动按配置文件
    排名降级旧存储的值。

    实现一个钩子而不是三个。旧版钩子在弃用窗口期间继续有效，但不会与配置文件结果组合。

  </Accordion>

  <Accordion title="外部 OAuth 提供商回退 → contracts.externalAuthProviders">
    **旧**: 在未在插件清单中声明提供商的情况下实现 `resolveExternalOAuthProfiles(...)`。

    **新**: 在插件清单中声明 `contracts.externalAuthProviders`
    **并且**实现 `resolveExternalAuthProfiles(...)`。旧的"认证
    回退"路径在运行时发出警告，并将被移除。

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="提供商环境变量查找 → setup.providers[].envVars">
    **旧**清单字段：`providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`。

    **新**: 将相同的环境变量查找镜像到清单上的 `setup.providers[].envVars`。
    这在一个地方整合了设置/状态环境元数据，并避免
    仅为了回答环境变量查找而引导插件运行时。

    `providerAuthEnvVars` 通过兼容性适配器继续支持，直到弃用窗口关闭。

  </Accordion>

  <Accordion title="内存插件注册 → registerMemoryCapability">
    **旧**: 三个独立的调用 —
    `api.registerMemoryPromptSection(...)`、
    `api.registerMemoryFlushPlan(...)`、
    `api.registerMemoryRuntime(...)`。

    **新**: 内存状态 API 上的一个调用 —
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`。

    相同的槽，单个注册调用。附加的内存助手
    （`registerMemoryPromptSupplement`、`registerMemoryCorpusSupplement`、
    `registerMemoryEmbeddingProvider`）不受影响。

  </Accordion>

  <Accordion title="子 agent 会话消息类型重命名">
    从 `src/plugins/runtime/types.ts` 仍然导出的两个旧版类型别名：

    | 旧 | 新 |
    | --- | --- |
    | `SubagentReadSessionParams` | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult` | `SubagentGetSessionMessagesResult` |

    运行时方法 `readSession` 已被弃用，改用
    `getSessionMessages`。相同的签名；旧方法调用到新方法。

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.managedFlows">
    **旧**: `runtime.tasks.flow`（单数）返回活动任务流访问器。

    **新**: `runtime.tasks.managedFlows` 为从流中创建、更新、取消或运行子任务的插件保持托管 TaskFlow 变更运行时。仅当插件需要基于 DTO 的读取时使用 `runtime.tasks.flows`。

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow.fromToolContext(ctx);
    // After
    const flow = api.runtime.tasks.managedFlows.fromToolContext(ctx);
    ```

  </Accordion>

  <Accordion title="嵌入式扩展工厂 → agent 工具结果中间件">
    已在上面的"如何迁移 → 将 Pi 工具结果扩展迁移到中间件"中涵盖。这里包含以便完整：已移除的仅 Pi 的
    `api.registerEmbeddedExtensionFactory(...)` 路径被 `api.registerAgentToolResultMiddleware(...)` 替换，在 `contracts.agentToolResultMiddleware` 中有显式运行时列表。
  </Accordion>

  <Accordion title="OpenClawSchemaType 别名 → OpenClawConfig">
    从 `openclaw/plugin-sdk` 重新导出的 `OpenClawSchemaType` 现在是
    `OpenClawConfig` 的一行别名。优先使用规范名称。

    ```typescript
    // Before
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // After
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>
扩展级别的弃用（在 `extensions/` 下的捆绑频道/提供商插件内）在其自己的 `api.ts` 和 `runtime-api.ts` 桶中跟踪。它们不影响第三方插件合约，此处未列出。如果你直接使用捆绑插件的本地桶，请在升级之前阅读该桶中的弃用注释。
</Note>

## 移除时间线

| 时间               | 发生什么                                       |
| ------------------ | ---------------------------------------------- |
| **现在**           | 已弃用的接口发出运行时警告                     |
| **下一个主要版本** | 已弃用的接口将被移除；仍然使用它们的插件将失败 |

所有核心插件已经迁移完成。外部插件应该在下一个主要版本之前迁移。

## 临时抑制警告

在迁移工作期间设置这些环境变量：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

这是一个临时的逃生口，而不是永久的解决方案。

## 相关文档

- [入门指南](/plugins/building-plugins) — 构建你的第一个插件
- [SDK 概览](/plugins/sdk-overview) — 完整的子路径导入参考
- [频道插件](/plugins/sdk-channel-plugins) — 构建频道插件
- [提供商插件](/plugins/sdk-provider-plugins) — 构建提供商插件
- [插件内部](/plugins/architecture) — 架构深度剖析
- [插件清单](/plugins/manifest) — 清单模式参考
