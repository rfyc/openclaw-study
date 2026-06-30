# 通道边界

`src/channels/**` 是核心通道实现。插件作者不应直接从此目录树导入。

## 公共契约

- 文档：
  - `docs/plugins/sdk-channel-plugins.md`
  - `docs/plugins/architecture.md`
  - `docs/plugins/sdk-overview.md`
- 定义文件：
  - `src/channels/plugins/types.plugin.ts`
  - `src/channels/plugins/types.core.ts`
  - `src/channels/plugins/types.adapters.ts`
  - `src/plugin-sdk/core.ts`
  - `src/plugin-sdk/channel-contract.ts`

## 边界规则

- 保持面向扩展的通道层面通过 `openclaw/plugin-sdk/*` 流转，而非直接从 `src/channels/**` 导入。
- 当捆绑或第三方通道需要新的接缝时，先添加类型化的 SDK 契约或外观。
- 将通道入口点（如 `channel.ts`、`shared.ts`、`channel.setup.ts`、`gateway.ts` 和 `outbound.ts`）视为热导入路径。除非启动真正需要，不要将仅用于异步路径的层面（如发送、监控、探测、目录实时、设置/登录流程或大型 `runtime-api.ts` 桶文件）静态拉入这些文件。
- 优先使用小型本地接缝（如 `channel-api.ts`、`*.runtime.ts` 或 `*.runtime-api.ts`）将繁重的运行时代码保持在热路径之外。
- 对于 Gateway 或智能体工具使用的核心发现路径，优先使用轻量级捆绑插件产物，仅在回退时才使用完整通道插件加载。
- 当调用者只需要测试中已注册的插件固件时，提供仅加载插件的模式，而非悄悄回退到捆绑运行时实例化。
- 将目标解析、线程绑定提示、原生命令描述符、消息工具描述符、gateway 认证绕过路径和设置提升提示放在小型插件拥有的辅助工具中，由完整通道插件和任何轻量级产物复用。
- 如果辅助工具被测试反复调用，在与运行时重置相同的生命周期范围内安装/重置测试插件注册表。`beforeAll` 注册表配合 `afterEach` 运行时重置是一个信号，后续测试可能会回退到捆绑/默认运行时加载。
- 不要在通道边界变更中混用对同一重型模块系列的静态和动态导入。如果路径应保持惰性，则从头到尾保持惰性。
- 记住，共享通道变更会影响内置通道和扩展通道。检查路由、配对、允许列表、命令门控、入职和跨所有通道集合的回复行为。

## 验证

- 如果修改了热通道入口点或惰性加载接缝，运行 `pnpm build`。
- 对于可能影响启动/导入成本的捆绑插件通道变更，运行：
  `OPENCLAW_LOCAL_CHECK=0 node scripts/profile-extension-memory.mjs --extension <id> --skip-combined --concurrency 1`
