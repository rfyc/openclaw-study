# Plugin SDK 边界

此目录是插件与核心之间的公共契约。此处的变更可能影响捆绑插件和第三方插件。

## 真实来源

- 文档：
  - `docs/plugins/sdk-overview.md`
  - `docs/plugins/sdk-entrypoints.md`
  - `docs/plugins/sdk-runtime.md`
  - `docs/plugins/sdk-migration.md`
  - `docs/plugins/architecture.md`
- 定义文件：
  - `package.json`
  - `scripts/lib/plugin-sdk-entrypoints.json`
  - `src/plugin-sdk/entrypoints.ts`
  - `src/plugin-sdk/api-baseline.ts`
  - `src/plugin-sdk/plugin-entry.ts`
  - `src/plugin-sdk/core.ts`
  - `src/plugin-sdk/provider-entry.ts`

## 边界规则

- 宿主加载插件；插件不应通过 SDK 访问任意宿主内部实现。
- 优先使用小型版本化的宿主/内核接缝加上窄型文档化 SDK 入口点，而非宽泛的便利桶文件。
- 优先使用窄型、专用子路径，而非宽泛的便利重新导出。
- 除非有意推广受支持的公共契约，否则不要从 `src/channels/**`、`src/agents/**`、`src/plugins/**` 或其他内部实现中暴露实现便利。
- 保持公共 SDK 入口点在模块加载时的成本低廉。如果辅助工具只在发送、监控、探测、目录实时、登录或设置等异步路径上需要，优先使用窄型 `*.runtime` 子路径，而非通过热通道入口点在启动时导入的宽泛 SDK 桶文件。
- 保持 SDK 外观无循环依赖。不要添加将轻量级契约文件路由回更重的策略或运行时模块的反向边重新导出。
- 在塑造 SDK 接缝时，不要混用对同一运行时层面的静态和动态导入。如果层面必须保持惰性，则在轻量级契约文件上保持急切部分，在专用运行时子路径上保持延迟部分。
- 优先使用 `api.runtime` 或专注的 SDK 外观，而非告知扩展直接访问宿主内部实现。
- 当核心或测试需要捆绑插件辅助工具时，优先使用插件包的 `api.ts` 或 `runtime-api.ts` 加通用 SDK 能力。不要仅为使核心了解捆绑通道的私有辅助工具而添加提供商命名的 `src/plugin-sdk/<id>.ts` 接缝。
- 解析器/外观加载器测试是宽泛源 API 覆盖的例外：为 `api.js` / `runtime-api.js` 回退行为使用生成的微型插件固件。不要将那些测试指向真实捆绑插件源 API。
- 对于提供商工作，优先使用系列级接缝而非特定提供商的接缝。共享辅助工具应描述可复用的行为，例如重放策略、工具 schema 兼容性、负载规范化、流包装组合或传输装饰。避免添加仅包装一个提供商本地实现的新 SDK 导出，除非已有第二个消费者。
- 当选项编码稳定契约时，优先使用命名辅助工具而非原始选项对象。示例：为"OpenAI 风格的 Anthropic 工具负载兼容性"导出一个辅助工具，而非让每个插件传递相同的模式标志。
- 保持传输/运行时策略和面向插件的辅助工具对齐。如果在插件注册和核心运行时路径中使用相同行为，暴露一个共享辅助工具而非让两条路径产生分歧。
- SDK 子路径应帮助调用者一次解决一个能力或运行时需求。不要扩展将广泛运行时注册表访问作为默认路径的新层面。
- 如果提议的 SDK 导出主要是为了让设置/配置/控制平面代码执行插件运行时，这通常是边界问题的信号。优先使用元数据或描述符驱动的控制平面接缝。

## 验证

- 如果修改影响惰性加载、热通道入口点或捆绑插件导入拓扑的 SDK 接缝，运行 `pnpm build`。
- 如果变更可能改变捆绑通道的启动成本，还需运行受影响插件的隔离入口点分析器：
  `OPENCLAW_LOCAL_CHECK=0 node scripts/profile-extension-memory.mjs --extension <id> --skip-combined --concurrency 1`

## 扩展边界

- 默认为增量、向后兼容的变更。
- 添加或更改公共子路径时，保持以下内容对齐：
  - `docs/plugins/*` 中的文档
  - `scripts/lib/plugin-sdk-entrypoints.json`
  - `src/plugin-sdk/entrypoints.ts`
  - `package.json` 导出
  - API 基准和导出检查
- 如果捆绑通道/辅助工具的需求跨越包边界，首先问这个需求是否真正通用。如果是，添加窄型通用子路径。如果不是，通过 `api.ts` / `runtime-api.ts` 保持插件本地。
- 扩展面向提供商的接缝时，更新或添加锁定契约的匹配窄型测试：公共子路径的 Plugin SDK 基准/导出检查，以及你正在集中化的行为的最直接提供商/插件测试。
- 破坏性删除或重命名是主版本工作，而非顺便清理。
