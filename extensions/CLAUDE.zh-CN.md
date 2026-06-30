# 插件边界

此目录包含已打包的插件。将其视为第三方插件所看到的相同边界。

## 公共契约

- 文档：
  - `docs/plugins/building-plugins.md`
  - `docs/plugins/architecture.md`
  - `docs/plugins/sdk-overview.md`
  - `docs/plugins/sdk-entrypoints.md`
  - `docs/plugins/sdk-runtime.md`
  - `docs/plugins/sdk-channel-plugins.md`
  - `docs/plugins/sdk-provider-plugins.md`
  - `docs/plugins/manifest.md`
- 定义文件：
  - `src/plugin-sdk/plugin-entry.ts`
  - `src/plugin-sdk/core.ts`
  - `src/plugin-sdk/provider-entry.ts`
  - `src/plugin-sdk/channel-contract.ts`
  - `scripts/lib/plugin-sdk-entrypoints.json`
  - `package.json`

## 边界规则

- 插件生产代码应从 `openclaw/plugin-sdk/*` 及其本地桶文件（如 `./api.ts` 和 `./runtime-api.ts`）中导入。
- 不得从 `src/**`、`src/channels/**`、`src/plugin-sdk-internal/**` 或其他插件的 `src/**` 中导入核心内部实现。
- 不得使用超出当前插件包根目录的相对路径导入。
- 在 `openclaw.plugin.json` 和包的 `openclaw` 块中保持插件元数据准确，以便无需执行插件代码即可完成发现和设置。
- 插件运行时依赖属于其所有者插件包。如果插件依赖项有运行时对等体，应在该插件的 `package.json` 中声明/提供；除非根/包发行版拥有该导入，否则不要将其移至根目录。运行时从不安装依赖；安装/更新/doctor 是修复点。
- 在通用契约（`package-manifest.contract.test.ts`、`extension-runtime-dependencies.contract.test.ts`）中保留插件依赖断言，而不是在插件 e2e 测试中，当它们表达包所有权时。
- 将 `src/**`、`onboard.ts` 等本地辅助文件视为私有，除非通过 `api.ts` 以及（如需要）匹配的 `src/plugin-sdk/<id>.ts` 外观有意提升它们。
- 如果核心或核心测试需要打包插件的辅助功能，首先从 `api.ts` 导出它，而不是让它们深度导入插件内部实现。
- 对于 provider 插件，将身份验证、引导、目录选择和仅供应商的产品行为保留在插件本地。不要仅因为两个 provider 看起来类似就将它们移入核心。
- 在添加新的 provider 本地 `wrapStreamFn`、`buildReplayPolicy`、`normalizeToolSchemas`、`inspectToolSchemas` 或兼容补丁辅助工具之前，检查同样的行为是否已通过 `openclaw/plugin-sdk/*` 存在。优先复用共享家族辅助工具。
- 如果两个打包 provider 共享相同的重放策略形状、工具模式兼容重写、载荷补丁或流包装链，停止复制逻辑。在同一次更改中提取一个共享辅助工具并迁移两个调用点。
- 优先使用命名的 provider 家族辅助工具，而不是重复原始选项包。如果 provider 需要 OpenAI 风格的 Anthropic 工具载荷兼容、Gemini 模式清理或 XAI 兼容补丁，使用命名的共享辅助工具，而不是再次内联策略旋钮。
- 将控制平面元数据与运行时逻辑分离。发现、配置验证、设置提示、引导提示和激活规划应尽可能从清单/描述符中表达。
- 如果设置确实需要运行时执行，应在插件的声明设置/运行时表面中明确表示，而不是让元数据流意外导入运行时代码。
- 不要依赖急切的全局注册表种子或导入时副作用使插件"可用"。插件可用性应来自清单所有权加上有针对性的激活。
- 当核心需要热路径上插件拥有的静态数据时，公开一个轻量级顶级工件，如 `gateway-auth-api.ts`、`message-tool-api.ts` 或类似的窄 `*-api.ts`。从工件和完整插件中复用同一本地辅助工具，以便快速路径不偏离运行时行为。

## 扩展边界

- 如果插件需要新的接缝，添加类型化的 Plugin SDK 子路径或附加导出，而不是进入核心。
- 保持新的插件接缝向后兼容并有版本控制。第三方插件使用此表面。
- 当有意扩展契约时，在同一次更改中更新文档、导出的子路径列表、包导出以及 API/契约检查。
