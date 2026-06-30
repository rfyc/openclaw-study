---
summary: "插件兼容性合约、弃用元数据和迁移预期"
title: "插件兼容性"
read_when:
  - 你维护一个 OpenClaw 插件
  - 你看到插件兼容性警告
  - 你正在规划插件 SDK 或清单迁移
---

OpenClaw 在移除旧版插件合约之前，通过命名兼容性适配器保持旧合约连接。这在 SDK、清单、设置、配置和 agent 运行时合约演化的同时，保护了现有的捆绑和外部插件。

## 兼容性注册表

插件兼容性合约在核心注册表 `src/plugins/compat/registry.ts` 中跟踪。

每条记录包含：

- 稳定的兼容性代码
- 状态：`active`、`deprecated`、`removal-pending` 或 `removed`
- 所有者：SDK、配置、设置、频道、提供商、插件执行、agent 运行时或核心
- 适用时的引入和弃用日期
- 替换指南
- 涵盖旧行为和新行为的文档、诊断和测试

注册表是维护者规划和未来插件检查器检查的来源。如果面向插件的行为发生变化，在添加适配器的同一变更中添加或更新兼容性记录。

Doctor 修复和迁移兼容性在 `src/commands/doctor/shared/deprecation-compat.ts` 中单独跟踪。这些记录涵盖旧配置形态、安装账本布局以及在运行时兼容性路径被移除后可能仍需保留的修复垫片。

发布扫描应同时检查两个注册表。不要仅因为匹配的运行时或配置兼容性记录过期就删除 doctor 迁移；首先验证没有仍需修复的受支持升级路径。在发布规划期间还要重新验证每个替换注解，因为随着提供商和频道移出核心，插件所有权和配置占用可能会发生变化。

## 插件检查器包

插件检查器应作为单独的包/仓库存在于核心 OpenClaw 仓库之外，以版本化的兼容性和清单合约为基础。

第一天的 CLI 应该是：

```sh
openclaw-plugin-inspector ./my-plugin
```

它应该输出：

- 清单/模式验证
- 正在检查的合约兼容性版本
- 安装/源元数据检查
- 冷路径导入检查
- 弃用和兼容性警告

使用 `--json` 获取 CI 注解中的稳定机器可读输出。OpenClaw 核心应暴露检查器可以消费的合约和固定装置，但不应从主 `openclaw` 包发布检查器二进制文件。

### 维护者验收通道

在验证外部检查器对 OpenClaw 插件包时，使用 Blacksmith Testbox 进行可安装包验收通道。在包构建后从干净的 OpenClaw 检出运行：

```sh
blacksmith testbox warmup ci-check-testbox.yml --ref main --idle-timeout 90
blacksmith testbox run --id <tbx_id> "pnpm install && pnpm build && npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/telegram --json"
blacksmith testbox run --id <tbx_id> "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/discord --json"
blacksmith testbox run --id <tbx_id> "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- <clawhub-plugin-dir> --json"
blacksmith testbox stop <tbx_id>
```

保持此通道对维护者可选，因为它安装了外部 npm 包，并可能检查在仓库外克隆的插件包。本地仓库守卫涵盖 SDK 导出映射、兼容性注册表元数据、已弃用 SDK 导入消耗以及捆绑扩展导入边界；Testbox 检查器证明涵盖外部插件作者使用的包。

## 弃用策略

OpenClaw 不应在引入替换的同一版本中移除已记录的插件合约。

迁移序列为：

1. 添加新合约。
2. 通过命名兼容性适配器保持旧行为连接。
3. 在插件作者可以采取行动时发出诊断或警告。
4. 记录替换和时间表。
5. 测试旧路径和新路径。
6. 等待宣布的迁移窗口。
7. 仅在明确的重大发布批准下才移除。

已弃用的记录必须包括警告开始日期、替换、文档链接以及警告开始后不超过三个月的最终移除日期。不要添加具有开放式移除窗口的已弃用兼容性路径，除非维护者明确决定它是永久兼容性并将其标记为 `active`。

## 当前兼容性领域

当前兼容性记录包括：

- 传统广泛 SDK 导入，如 `openclaw/plugin-sdk/compat`
- 传统仅钩子插件形态和 `before_agent_start`
- 传统 `activate(api)` 插件入口点，同时插件迁移到 `register(api)`
- 传统 SDK 别名，如 `openclaw/extension-api`、`openclaw/plugin-sdk/channel-runtime`、`openclaw/plugin-sdk/command-auth` 状态构建器、`openclaw/plugin-sdk/test-utils`（由专注的 `openclaw/plugin-sdk/*` 测试子路径替换）以及 `ClawdbotConfig` / `OpenClawSchemaType` 类型别名
- 捆绑插件允许列表和启用行为
- 传统提供商/频道环境变量清单元数据
- 传统提供商插件钩子和类型别名，同时提供商迁移到显式目录、认证、思考、重放和传输钩子
- 传统运行时别名，如 `api.runtime.taskFlow`、`api.runtime.subagent.getSession`、`api.runtime.stt` 以及已弃用的 `api.runtime.config.loadConfig()` / `api.runtime.config.writeConfigFile(...)`
- 传统内存插件分割注册，同时内存插件迁移到 `registerMemoryCapability`
- 用于原生消息模式、@提及门控、入站信封格式化和审批能力嵌套的传统频道 SDK 帮助函数
- 传统频道路由键和可比较目标帮助函数别名，同时插件迁移到 `openclaw/plugin-sdk/channel-route`
- 正被清单贡献所有权替换的激活提示
- `setup-api` 运行时回退，同时设置描述符迁移到冷 `setup.requiresRuntime: false` 元数据
- `discovery` 钩子提供商，同时提供商目录钩子迁移到 `catalog.run(...)`
- 频道 `showConfigured` / `showInSetup` 元数据，同时频道包迁移到 `openclaw.channel.exposure`
- 传统运行时策略配置键，同时 doctor 将运营商迁移到 `agentRuntime`
- 生成的捆绑频道配置元数据回退，同时注册表优先的 `channelConfigs` 元数据落地
- 持久化插件注册表禁用和安装迁移环境标志，同时修复流将运营商迁移到 `openclaw plugins registry --refresh` 和 `openclaw doctor --fix`
- 传统插件拥有的 Web 搜索、Web 抓取和 x_search 配置路径，同时 doctor 将它们迁移到 `plugins.entries.<plugin>.config`
- 传统 `plugins.installs` 创作配置和捆绑插件加载路径别名，同时安装元数据移入状态管理的插件账本

新的插件代码应优先使用注册表和具体迁移指南中列出的替换。现有插件可以继续使用兼容性路径，直到文档、诊断和发布说明宣布移除窗口。

## 发布说明

发布说明应包括即将到来的插件弃用及目标日期和迁移文档链接。该警告需要在兼容性路径移动到 `removal-pending` 或 `removed` 之前发生。
