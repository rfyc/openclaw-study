---
summary: "插件 SDK 子路径目录：按区域分组的导入位置"
read_when:
  - 为插件导入选择正确的 plugin-sdk 子路径
  - 审计捆绑插件子路径和助手界面
title: "插件 SDK 子路径"
---

插件 SDK 以 `openclaw/plugin-sdk/` 下的一组窄子路径形式公开。
本页面按用途分组列出常用子路径。完整的 200+ 子路径生成列表
位于 `scripts/lib/plugin-sdk-entrypoints.json`；保留的捆绑插件助手
子路径出现在那里，但除非文档页面明确推广它们，否则它们是实现细节。
维护者可以使用 `pnpm plugins:boundary-report:summary` 审计活跃的保留助手子路径；
未使用的保留助手导出会导致 CI 报告失败，而不是作为休眠的兼容性债务留在公共 SDK 中。

有关插件编写指南，请参见[插件 SDK 概览](/plugins/sdk-overview)。

## 插件入口

| 子路径                                    | 关键导出                                                                                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`                 | `definePluginEntry`                                                                                                                                                    |
| `plugin-sdk/core`                         | `defineChannelPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase`、`defineSetupPluginEntry`、`buildChannelConfigSchema`、`buildJsonChannelConfigSchema` |
| `plugin-sdk/config-schema`                | `OpenClawSchema`                                                                                                                                                       |
| `plugin-sdk/provider-entry`               | `defineSingleProviderPluginEntry`                                                                                                                                      |
| `plugin-sdk/testing`                      | 旧版插件测试的宽兼容性桶；新扩展测试优先使用专注的测试子路径                                                                                                           |
| `plugin-sdk/plugin-test-api`              | 用于直接插件注册单元测试的最小 `OpenClawPluginApi` mock 构建器                                                                                                         |
| `plugin-sdk/agent-runtime-test-contracts` | 用于认证配置文件、传递抑制、回退分类、工具钩子、提示覆盖、schemas 和转录修复的原生 agent 运行时适配器合约夹具                                                          |
| `plugin-sdk/channel-test-helpers`         | 频道账户生命周期、目录、发送配置、运行时 mock、钩子、捆绑频道入口、信封时间戳、配对回复和通用频道合约测试助手                                                          |
| `plugin-sdk/channel-target-testing`       | 用于频道的共享频道目标解析错误用例测试套件                                                                                                                             |
| `plugin-sdk/plugin-test-contracts`        | 插件注册、包清单、公共制品、运行时 API、导入副作用和直接导入合约助手                                                                                                   |
| `plugin-sdk/plugin-test-runtime`          | 用于测试的插件运行时、注册表、提供商注册、设置向导和运行时任务流夹具                                                                                                   |
| `plugin-sdk/provider-test-contracts`      | 提供商运行时、认证、发现、引导、目录、媒体能力、重放策略、实时 STT 实时音频、Web 搜索/获取和向导合约助手                                                               |
| `plugin-sdk/provider-http-test-mocks`     | 用于测试使用 `plugin-sdk/provider-http` 的提供商的可选 Vitest HTTP/认证 mock                                                                                           |
| `plugin-sdk/test-env`                     | 测试环境、fetch/网络、一次性 HTTP 服务器、传入请求、实时测试、临时文件系统和时间控制夹具                                                                               |
| `plugin-sdk/test-fixtures`                | 通用 CLI、沙箱、技能、agent 消息、系统事件、模块重载、捆绑插件路径、终端、分块、认证令牌和类型化用例测试夹具                                                           |
| `plugin-sdk/test-node-mocks`              | 用于 Vitest `vi.mock("node:*")` 工厂内部的专注 Node 内置 mock 助手                                                                                                     |
| `plugin-sdk/migration`                    | 迁移提供商项目助手，如 `createMigrationItem`、原因常量、项目状态标记、编辑助手和 `summarizeMigrationItems`                                                             |
| `plugin-sdk/migration-runtime`            | 运行时迁移助手，如 `copyMigrationFileItem`、`withCachedMigrationConfigRuntime` 和 `writeMigrationReport`                                                               |

<AccordionGroup>
  <Accordion title="频道子路径">
    | 子路径 | 关键导出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`、`defineSetupPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod schema 导出（`OpenClawSchema`） |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`，以及 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` |
    | `plugin-sdk/setup` | 共享设置向导助手、允许列表提示、设置状态构建器 |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`、`createEnvPatchedAccountSetupAdapter`、`createSetupInputPresenceValidator`、`noteChannelLookupFailure`、`noteChannelLookupSummary`、`promptResolvedAllowFrom`、`splitSetupEntries`、`createAllowlistSetupWizardProxy`、`createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多账户配置/操作门助手、默认账户回退助手 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、账户 id 规范化助手 |
    | `plugin-sdk/account-resolution` | 账户查找 + 默认回退助手 |
    | `plugin-sdk/account-helpers` | 窄账户列表/账户操作助手 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline`、`resolveChannelSourceReplyDeliveryMode` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`、`resolveChannelDmAccess`、`resolveChannelDmAllowFrom`、`resolveChannelDmPolicy`、`normalizeChannelDmPolicy`、`normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | 共享频道配置 schema 原语加上 Zod 和直接 JSON/TypeBox 构建器 |
    | `plugin-sdk/bundled-channel-config-schema` | 仅供已维护捆绑插件使用的捆绑 OpenClaw 频道配置 schemas |
    | `plugin-sdk/channel-config-schema-legacy` | 捆绑频道配置 schemas 的已弃用兼容性别名 |
    | `plugin-sdk/telegram-command-config` | 带有捆绑合约回退的 Telegram 自定义命令规范化/验证助手 |
    | `plugin-sdk/command-gating` | 窄命令授权门助手 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`、`createChannelRunQueue`、草稿流生命周期/最终化助手 |
    | `plugin-sdk/inbound-envelope` | 共享入站路由 + 信封构建器助手 |
    | `plugin-sdk/inbound-reply-dispatch` | 共享入站记录和分发助手 |
    | `plugin-sdk/messaging-targets` | 目标解析/匹配助手 |
    | `plugin-sdk/outbound-media` | 共享出站媒体加载助手 |
    | `plugin-sdk/outbound-send-deps` | 用于频道适配器的轻量级出站发送依赖查找 |
    | `plugin-sdk/outbound-runtime` | 出站传递、身份、发送委托、会话、格式化和有效载荷规划助手 |
    | `plugin-sdk/poll-runtime` | 窄轮询规范化助手 |
    | `plugin-sdk/thread-bindings-runtime` | 线程绑定生命周期和适配器助手 |
    | `plugin-sdk/agent-media-payload` | 旧版 agent 媒体有效载荷构建器 |
    | `plugin-sdk/conversation-runtime` | 会话/线程绑定、配对和已配置绑定助手 |
    | `plugin-sdk/runtime-config-snapshot` | 运行时配置快照助手 |
    | `plugin-sdk/runtime-group-policy` | 运行时组策略解析助手 |
    | `plugin-sdk/channel-status` | 共享频道状态快照/摘要助手 |
    | `plugin-sdk/channel-config-primitives` | 窄频道配置 schema 原语 |
    | `plugin-sdk/channel-config-writes` | 频道配置写入授权助手 |
    | `plugin-sdk/channel-plugin-common` | 共享频道插件前言导出 |
    | `plugin-sdk/allowlist-config-edit` | 允许列表配置编辑/读取助手 |
    | `plugin-sdk/group-access` | 共享组访问决策助手 |
    | `plugin-sdk/direct-dm` | 共享直接 DM 认证/保护助手 |
    | `plugin-sdk/discord` | 已发布的 `@openclaw/discord@2026.3.13` 和跟踪所有者兼容性的已弃用 Discord 兼容性外观；新插件应使用通用频道 SDK 子路径 |
    | `plugin-sdk/telegram-account` | 跟踪所有者兼容性的已弃用 Telegram 账户解析兼容性外观；新插件应使用注入的运行时助手或通用频道 SDK 子路径 |
    | `plugin-sdk/zalouser` | 仍然导入发送方命令授权的已发布 Lark/Zalo 包的已弃用 Zalo Personal 兼容性外观；新插件应使用 `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | 语义消息呈现、传递和旧版交互回复助手。参见[消息呈现](/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 入站防抖、提及匹配、提及策略助手和信封助手的兼容性桶 |
    | `plugin-sdk/channel-inbound-debounce` | 窄入站防抖助手 |
    | `plugin-sdk/channel-mention-gating` | 窄提及策略、提及标记和提及文本助手，不含更宽的入站运行时界面 |
    | `plugin-sdk/channel-envelope` | 窄入站信封格式化助手 |
    | `plugin-sdk/channel-location` | 频道位置上下文和格式化助手 |
    | `plugin-sdk/channel-logging` | 用于入站丢弃和打字/确认失败的频道日志助手 |
    | `plugin-sdk/channel-send-result` | 回复结果类型 |
    | `plugin-sdk/channel-actions` | 频道消息操作助手，以及为插件兼容性保留的已弃用原生 schema 助手 |
    | `plugin-sdk/channel-route` | 共享路由规范化、解析器驱动的目标解析、线程 id 字符串化、去重/紧凑路由键、解析目标类型和路由/目标比较助手 |
    | `plugin-sdk/channel-targets` | 目标解析助手；路由比较调用者应使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | 频道合约类型 |
    | `plugin-sdk/channel-feedback` | 反馈/反应连接 |
    | `plugin-sdk/channel-secret-runtime` | 窄密钥合约助手，如 `collectSimpleChannelFieldAssignments`、`getChannelSurface`、`pushAssignment` 和密钥目标类型 |
  </Accordion>

  <Accordion title="提供商子路径">
    | 子路径 | 关键导出 |
    | --- | --- |
    | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` |
    | `plugin-sdk/lmstudio` | 用于设置、目录发现和运行时模型准备的受支持 LM Studio 提供商外观 |
    | `plugin-sdk/lmstudio-runtime` | 用于本地服务器默认值、模型发现、请求头和已加载模型助手的受支持 LM Studio 运行时外观 |
    | `plugin-sdk/provider-setup` | 策划的本地/自托管提供商设置助手 |
    | `plugin-sdk/self-hosted-provider-setup` | 专注的 OpenAI 兼容自托管提供商设置助手 |
    | `plugin-sdk/cli-backend` | CLI 后端默认值 + 看门狗常量 |
    | `plugin-sdk/provider-auth-runtime` | 用于提供商插件的运行时 API 密钥解析助手 |
    | `plugin-sdk/provider-auth-api-key` | API 密钥引导/配置文件写入助手，如 `upsertApiKeyProfile` |
    | `plugin-sdk/provider-auth-result` | 标准 OAuth 认证结果构建器 |
    | `plugin-sdk/provider-auth-login` | 用于提供商插件的共享交互式登录助手 |
    | `plugin-sdk/provider-env-vars` | 提供商认证环境变量查找助手 |
    | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials` |
    | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共享重放策略构建器、提供商端点助手和模型 id 规范化助手如 `normalizeNativeXaiModelId` |
    | `plugin-sdk/provider-catalog-runtime` | 提供商目录增强运行时钩子和用于合约测试的插件提供商注册表接口 |
    | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` |
    | `plugin-sdk/provider-http` | 通用提供商 HTTP/端点能力助手、提供商 HTTP 错误和音频转录多部分表单助手 |
    | `plugin-sdk/provider-web-fetch-contract` | 窄 Web 获取配置/选择合约助手，如 `enablePluginInConfig` 和 `WebFetchProviderPlugin` |
    | `plugin-sdk/provider-web-fetch` | Web 获取提供商注册/缓存助手 |
    | `plugin-sdk/provider-web-search-config-contract` | 用于不需要插件启用连接的提供商的窄 Web 搜索配置/凭据助手 |
    | `plugin-sdk/provider-web-search-contract` | 窄 Web 搜索配置/凭据合约助手，如 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 和范围化凭据 setter/getter |
    | `plugin-sdk/provider-web-search` | Web 搜索提供商注册/缓存/运行时助手 |
    | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`、Gemini schema 清理 + 诊断，以及 xAI 兼容助手如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` |
    | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 等 |
    | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、流包装器类型，以及共享的 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器助手 |
    | `plugin-sdk/provider-transport-runtime` | 原生提供商传输助手，如保护的 fetch、传输消息转换和可写传输事件流 |
    | `plugin-sdk/provider-onboard` | 引导配置补丁助手 |
    | `plugin-sdk/global-singleton` | 进程本地单例/映射/缓存助手 |
    | `plugin-sdk/group-activation` | 窄组激活模式和命令解析助手 |
  </Accordion>

  <Accordion title="认证和安全子路径">
    | 子路径 | 关键导出 |
    | --- | --- |
    | `plugin-sdk/command-auth` | `resolveControlCommandGate`、命令注册表助手（包括动态参数菜单格式化）、发送方授权助手 |
    | `plugin-sdk/command-status` | 命令/帮助消息构建器，如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` |
    | `plugin-sdk/approval-auth-runtime` | 审批者解析和同聊天操作认证助手 |
    | `plugin-sdk/approval-client-runtime` | 原生 exec 审批配置文件/过滤器助手 |
    | `plugin-sdk/approval-delivery-runtime` | 原生审批能力/传递适配器 |
    | `plugin-sdk/approval-gateway-runtime` | 共享审批网关解析助手 |
    | `plugin-sdk/approval-handler-adapter-runtime` | 用于热频道入口的轻量级原生审批适配器加载助手 |
    | `plugin-sdk/approval-handler-runtime` | 更宽的审批处理器运行时助手；当窄适配器/网关接口足够时优先使用它们 |
    | `plugin-sdk/approval-native-runtime` | 原生审批目标 + 账户绑定助手 |
    | `plugin-sdk/approval-reply-runtime` | Exec/插件审批回复有效载荷助手 |
    | `plugin-sdk/approval-runtime` | Exec/插件审批有效载荷助手、原生审批路由/运行时助手，以及结构化审批显示助手如 `formatApprovalDisplayPath` |
    | `plugin-sdk/reply-dedupe` | 窄入站回复去重重置助手 |
    | `plugin-sdk/channel-contract-testing` | 不含宽测试桶的窄频道合约测试助手 |
    | `plugin-sdk/command-auth-native` | 原生命令认证、动态参数菜单格式化和原生会话目标助手 |
    | `plugin-sdk/command-detection` | 共享命令检测助手 |
    | `plugin-sdk/command-primitives-runtime` | 用于热频道路径的轻量级命令文本谓词 |
    | `plugin-sdk/command-surface` | 命令体规范化和命令界面助手 |
    | `plugin-sdk/allow-from` | `formatAllowFromLowercase` |
    | `plugin-sdk/channel-secret-runtime` | 用于频道/插件密钥界面的窄密钥合约收集助手 |
    | `plugin-sdk/secret-ref-runtime` | 用于密钥合约/配置解析的窄 `coerceSecretRef` 和 SecretRef 类型助手 |
    | `plugin-sdk/security-runtime` | 共享信任、DM 门控、外部内容、敏感文本编辑、恒时密钥比较和密钥收集助手 |
    | `plugin-sdk/ssrf-policy` | 主机允许列表和私有网络 SSRF 策略助手 |
    | `plugin-sdk/ssrf-dispatcher` | 不含宽基础设施运行时界面的窄固定分发器助手 |
    | `plugin-sdk/ssrf-runtime` | 固定分发器、SSRF 保护 fetch、SSRF 错误和 SSRF 策略助手 |
    | `plugin-sdk/secret-input` | 密钥输入解析助手 |
    | `plugin-sdk/webhook-ingress` | Webhook 请求/目标助手和原始 websocket/体强制转换 |
    | `plugin-sdk/webhook-request-guards` | 请求体大小/超时助手 |
  </Accordion>

  <Accordion title="运行时和存储子路径">
    | 子路径 | 关键导出 |
    | --- | --- |
    | `plugin-sdk/runtime` | 宽运行时/日志/备份/插件安装助手 |
    | `plugin-sdk/runtime-env` | 窄运行时环境、日志器、超时、重试和退避助手 |
    | `plugin-sdk/browser-config` | 用于规范化配置文件/默认值、CDP URL 解析和浏览器控制认证助手的受支持浏览器配置外观 |
    | `plugin-sdk/channel-runtime-context` | 通用频道运行时上下文注册和查找助手 |
    | `plugin-sdk/matrix` | 用于仍直接导入 `plugin-sdk/run-command` 的旧版第三方频道包的已弃用 Matrix 兼容性外观；新插件应直接导入 `plugin-sdk/run-command` |
    | `plugin-sdk/mattermost` | 用于旧版第三方频道包的已弃用 Mattermost 兼容性外观；新插件应直接导入通用 SDK 子路径 |
    | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` |
    | `plugin-sdk/plugin-runtime` | 共享插件命令/钩子/HTTP/交互助手 |
    | `plugin-sdk/hook-runtime` | 共享 webhook/内部钩子管道助手 |
    | `plugin-sdk/lazy-runtime` | 懒运行时导入/绑定助手，如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` |
    | `plugin-sdk/process-runtime` | 进程 exec 助手 |
    | `plugin-sdk/cli-runtime` | CLI 格式化、等待、版本、参数调用和懒命令组助手 |
    | `plugin-sdk/gateway-runtime` | 网关客户端、事件循环就绪客户端启动助手、网关 CLI RPC、网关协议错误和频道状态补丁助手 |
    | `plugin-sdk/config-types` | 用于插件配置形状（如 `OpenClawConfig` 和频道/提供商配置类型）的仅类型配置界面 |
    | `plugin-sdk/plugin-config-runtime` | 运行时插件配置查找助手，如 `requireRuntimeConfig`、`resolvePluginConfigObject` 和 `resolveLivePluginConfigObject` |
    | `plugin-sdk/config-mutation` | 事务性配置变更助手，如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` |
    | `plugin-sdk/runtime-config-snapshot` | 当前进程配置快照助手，如 `getRuntimeConfig`、`getRuntimeConfigSnapshot` 和测试快照 setter |
    | `plugin-sdk/telegram-command-config` | Telegram 命令名称/描述规范化和重复/冲突检查，即使捆绑的 Telegram 合约界面不可用 |
    | `plugin-sdk/text-autolink-runtime` | 不含宽文本运行时桶的文件引用自动链接检测 |
    | `plugin-sdk/approval-runtime` | Exec/插件审批助手、审批能力构建器、认证/配置文件助手、原生路由/运行时助手和结构化审批显示路径格式化 |
    | `plugin-sdk/reply-runtime` | 共享入站/回复运行时助手、分块、分发、心跳、回复规划器 |
    | `plugin-sdk/reply-dispatch-runtime` | 窄回复分发/最终化和会话标签助手 |
    | `plugin-sdk/reply-history` | 共享短窗口回复历史助手和标记，如 `buildHistoryContext`、`HISTORY_CONTEXT_MARKER`、`recordPendingHistoryEntry` 和 `clearHistoryEntriesIfEnabled` |
    | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` |
    | `plugin-sdk/reply-chunking` | 窄文本/markdown 分块助手 |
    | `plugin-sdk/session-store-runtime` | 会话存储路径、会话键、updated-at 和存储变更助手 |
    | `plugin-sdk/cron-store-runtime` | Cron 存储路径/加载/保存助手 |
    | `plugin-sdk/state-paths` | 状态/OAuth 目录路径助手 |
    | `plugin-sdk/routing` | 路由/会话键/账户绑定助手，如 `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` |
    | `plugin-sdk/status-helpers` | 共享频道/账户状态摘要助手、运行时状态默认值和问题元数据助手 |
    | `plugin-sdk/target-resolver-runtime` | 共享目标解析器助手 |
    | `plugin-sdk/string-normalization-runtime` | Slug/字符串规范化助手 |
    | `plugin-sdk/request-url` | 从 fetch/请求类输入中提取字符串 URL |
    | `plugin-sdk/run-command` | 带规范化 stdout/stderr 结果的定时命令运行器 |
    | `plugin-sdk/param-readers` | 常用工具/CLI 参数读取器 |
    | `plugin-sdk/tool-payload` | 从工具结果对象中提取规范化有效载荷 |
    | `plugin-sdk/tool-send` | 从工具参数中提取规范发送目标字段 |
    | `plugin-sdk/temp-path` | 共享临时下载路径助手 |
    | `plugin-sdk/logging-core` | 子系统日志器和编辑助手 |
    | `plugin-sdk/markdown-table-runtime` | Markdown 表格模式和转换助手 |
    | `plugin-sdk/model-session-runtime` | 模型/会话覆盖助手，如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` |
    | `plugin-sdk/talk-config-runtime` | Talk 提供商配置解析助手 |
    | `plugin-sdk/json-store` | 小型 JSON 状态读/写助手 |
    | `plugin-sdk/file-lock` | 可重入文件锁助手 |
    | `plugin-sdk/persistent-dedupe` | 磁盘支持的去重缓存助手 |
    | `plugin-sdk/acp-runtime` | ACP 运行时/会话和回复分发助手 |
    | `plugin-sdk/acp-runtime-backend` | 用于启动加载插件的轻量级 ACP 后端注册和回复分发助手 |
    | `plugin-sdk/acp-binding-resolve-runtime` | 不含生命周期启动导入的只读 ACP 绑定解析 |
    | `plugin-sdk/agent-config-primitives` | 窄 agent 运行时配置 schema 原语 |
    | `plugin-sdk/boolean-param` | 宽松布尔参数读取器 |
    | `plugin-sdk/dangerous-name-runtime` | 危险名称匹配解析助手 |
    | `plugin-sdk/device-bootstrap` | 设备引导和配对令牌助手 |
    | `plugin-sdk/extension-shared` | 共享被动频道、状态和环境代理助手原语 |
    | `plugin-sdk/models-provider-runtime` | `/models` 命令/提供商回复助手 |
    | `plugin-sdk/skill-commands-runtime` | 技能命令列表助手 |
    | `plugin-sdk/native-command-registry` | 原生命令注册表/构建/序列化助手 |
    | `plugin-sdk/agent-harness` | 用于低级 agent 执行器的实验性受信任插件界面：执行器类型、活动运行引导/中止助手、OpenClaw 工具桥接助手、运行时计划工具策略助手、终端结果分类、工具进度格式化/详情助手和尝试结果工具 |
    | `plugin-sdk/provider-zai-endpoint` | Z.AI 端点检测助手 |
    | `plugin-sdk/async-lock-runtime` | 用于小型运行时状态文件的进程本地异步锁助手 |
    | `plugin-sdk/channel-activity-runtime` | 频道活动遥测助手 |
    | `plugin-sdk/concurrency-runtime` | 有界异步任务并发助手 |
    | `plugin-sdk/dedupe-runtime` | 内存去重缓存助手 |
    | `plugin-sdk/delivery-queue-runtime` | 出站待传递排空助手 |
    | `plugin-sdk/file-access-runtime` | 安全本地文件和媒体源路径助手 |
    | `plugin-sdk/heartbeat-runtime` | 心跳事件和可见性助手 |
    | `plugin-sdk/number-runtime` | 数字强制转换助手 |
    | `plugin-sdk/secure-random-runtime` | 安全令牌/UUID 助手 |
    | `plugin-sdk/system-event-runtime` | 系统事件队列助手 |
    | `plugin-sdk/transport-ready-runtime` | 传输就绪等待助手 |
    | `plugin-sdk/infra-runtime` | 已弃用兼容性垫片；使用上面专注的运行时子路径 |
    | `plugin-sdk/collection-runtime` | 小型有界缓存助手 |
    | `plugin-sdk/diagnostic-runtime` | 诊断标志、事件和跟踪上下文助手 |
    | `plugin-sdk/error-runtime` | 错误图、格式化、共享错误分类助手、`isApprovalNotFoundError` |
    | `plugin-sdk/fetch-runtime` | 包装的 fetch、代理、EnvHttpProxyAgent 选项和固定查找助手 |
    | `plugin-sdk/runtime-fetch` | 不含代理/保护 fetch 导入的分发器感知运行时 fetch |
    | `plugin-sdk/response-limit-runtime` | 不含宽媒体运行时界面的有界响应体读取器 |
    | `plugin-sdk/session-binding-runtime` | 不含已配置绑定路由或配对存储的当前会话绑定状态 |
    | `plugin-sdk/session-store-runtime` | 不含宽配置写入/维护导入的会话存储助手 |
    | `plugin-sdk/context-visibility-runtime` | 不含宽配置/安全导入的上下文可见性解析和补充上下文过滤 |
    | `plugin-sdk/string-coerce-runtime` | 不含 markdown/日志导入的窄原始记录/字符串强制转换和规范化助手 |
    | `plugin-sdk/host-runtime` | 主机名和 SCP 主机规范化助手 |
    | `plugin-sdk/retry-runtime` | 重试配置和重试运行器助手 |
    | `plugin-sdk/agent-runtime` | Agent 目录/身份/工作区助手 |
    | `plugin-sdk/directory-runtime` | 配置支持的目录查询/去重 |
    | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
  </Accordion>

  <Accordion title="能力和测试子路径">
    | 子路径 | 关键导出 |
    | --- | --- |
    | `plugin-sdk/media-runtime` | 共享媒体获取/转换/存储助手、ffprobe 支持的视频尺寸探测和媒体有效载荷构建器 |
    | `plugin-sdk/media-store` | 窄媒体存储助手，如 `saveMediaBuffer` |
    | `plugin-sdk/media-generation-runtime` | 共享媒体生成故障转移助手、候选选择和缺少模型消息 |
    | `plugin-sdk/media-understanding` | 媒体理解提供商类型加上面向提供商的图像/音频助手导出 |
    | `plugin-sdk/text-runtime` | 共享文本/markdown/日志助手，如助手可见文本剥离、markdown 渲染/分块/表格助手、编辑助手、指令标签助手和安全文本工具 |
    | `plugin-sdk/text-chunking` | 出站文本分块助手 |
    | `plugin-sdk/speech` | 语音提供商类型加上面向提供商的指令、注册表、验证、OpenAI 兼容 TTS 构建器和语音助手导出 |
    | `plugin-sdk/speech-core` | 共享语音提供商类型、注册表、指令、规范化和语音助手导出 |
    | `plugin-sdk/realtime-transcription` | 实时转录提供商类型、注册表助手和共享 WebSocket 会话助手 |
    | `plugin-sdk/realtime-voice` | 实时语音提供商类型和注册表助手 |
    | `plugin-sdk/image-generation` | 图像生成提供商类型加上图像资产/数据 URL 助手和 OpenAI 兼容图像提供商构建器 |
    | `plugin-sdk/image-generation-core` | 共享图像生成类型、故障转移、认证和注册表助手 |
    | `plugin-sdk/music-generation` | 音乐生成提供商/请求/结果类型 |
    | `plugin-sdk/music-generation-core` | 共享音乐生成类型、故障转移助手、提供商查找和模型引用解析 |
    | `plugin-sdk/video-generation` | 视频生成提供商/请求/结果类型 |
    | `plugin-sdk/video-generation-core` | 共享视频生成类型、故障转移助手、提供商查找和模型引用解析 |
    | `plugin-sdk/webhook-targets` | Webhook 目标注册表和路由安装助手 |
    | `plugin-sdk/webhook-path` | Webhook 路径规范化助手 |
    | `plugin-sdk/web-media` | 共享远程/本地媒体加载助手 |
    | `plugin-sdk/zod` | 为插件 SDK 消费者重新导出的 `zod` |
    | `plugin-sdk/testing` | 旧版插件测试的宽兼容性桶。新扩展测试应导入专注的 SDK 子路径，如 `plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures`，而不是此兼容性桶 |
    | `plugin-sdk/plugin-test-api` | 用于直接插件注册单元测试而不导入仓库测试助手桥接的最小 `createTestPluginApi` 助手 |
    | `plugin-sdk/agent-runtime-test-contracts` | 用于认证、传递、回退、工具钩子、提示覆盖、schema 和转录投影测试的原生 agent 运行时适配器合约夹具 |
    | `plugin-sdk/channel-test-helpers` | 用于通用操作/设置/状态合约、目录断言、账户启动生命周期、发送配置线程、运行时 mock、状态问题、出站传递和钩子注册的频道测试助手 |
    | `plugin-sdk/channel-target-testing` | 用于频道测试的共享目标解析错误用例套件 |
    | `plugin-sdk/plugin-test-contracts` | 插件包、注册、公共制品、直接导入、运行时 API 和导入副作用合约助手 |
    | `plugin-sdk/provider-test-contracts` | 提供商运行时、认证、发现、引导、目录、向导、媒体能力、重放策略、实时 STT 实时音频、Web 搜索/获取和流合约助手 |
    | `plugin-sdk/provider-http-test-mocks` | 用于测试使用 `plugin-sdk/provider-http` 的提供商的可选 Vitest HTTP/认证 mock |
    | `plugin-sdk/test-fixtures` | 通用 CLI 运行时捕获、沙箱上下文、技能写入器、agent 消息、系统事件、模块重载、捆绑插件路径、终端文本、分块、认证令牌和类型化用例夹具 |
    | `plugin-sdk/test-node-mocks` | 用于 Vitest `vi.mock("node:*")` 工厂内部的专注 Node 内置 mock 助手 |
  </Accordion>

  <Accordion title="内存子路径">
    | 子路径 | 关键导出 |
    | --- | --- |
    | `plugin-sdk/memory-core` | 用于管理器/配置/文件/CLI 助手的捆绑内存核心助手界面 |
    | `plugin-sdk/memory-core-engine-runtime` | 内存索引/搜索运行时外观 |
    | `plugin-sdk/memory-core-host-engine-foundation` | 内存宿主基础引擎导出 |
    | `plugin-sdk/memory-core-host-engine-embeddings` | 内存宿主嵌入合约、注册表访问、本地提供商和通用批处理/远程助手 |
    | `plugin-sdk/memory-core-host-engine-qmd` | 内存宿主 QMD 引擎导出 |
    | `plugin-sdk/memory-core-host-engine-storage` | 内存宿主存储引擎导出 |
    | `plugin-sdk/memory-core-host-multimodal` | 内存宿主多模态助手 |
    | `plugin-sdk/memory-core-host-query` | 内存宿主查询助手 |
    | `plugin-sdk/memory-core-host-secret` | 内存宿主密钥助手 |
    | `plugin-sdk/memory-core-host-events` | 内存宿主事件日志助手 |
    | `plugin-sdk/memory-core-host-status` | 内存宿主状态助手 |
    | `plugin-sdk/memory-core-host-runtime-cli` | 内存宿主 CLI 运行时助手 |
    | `plugin-sdk/memory-core-host-runtime-core` | 内存宿主核心运行时助手 |
    | `plugin-sdk/memory-core-host-runtime-files` | 内存宿主文件/运行时助手 |
    | `plugin-sdk/memory-host-core` | 内存宿主核心运行时助手的供应商中立别名 |
    | `plugin-sdk/memory-host-events` | 内存宿主事件日志助手的供应商中立别名 |
    | `plugin-sdk/memory-host-files` | 内存宿主文件/运行时助手的供应商中立别名 |
    | `plugin-sdk/memory-host-markdown` | 用于内存相邻插件的共享托管 markdown 助手 |
    | `plugin-sdk/memory-host-search` | 用于搜索管理器访问的活跃内存运行时外观 |
    | `plugin-sdk/memory-host-status` | 内存宿主状态助手的供应商中立别名 |
  </Accordion>

  <Accordion title="保留的捆绑助手子路径">
    目前没有保留的捆绑助手 SDK 子路径。所有者特定的助手位于拥有它们的插件包内，而可复用的宿主合约使用通用 SDK 子路径，如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和 `plugin-sdk/plugin-config-runtime`。
  </Accordion>
</AccordionGroup>

## 相关文档

- [插件 SDK 概览](/plugins/sdk-overview)
- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
