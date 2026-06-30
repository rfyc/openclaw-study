# 共享测试辅助工具边界

此目录存放核心和捆绑插件测试复用的共享测试辅助工具。

## 捆绑插件导入

- 此目录树中的共享辅助工具不得将硬编码的仓库相对导入写入 `extensions/**`。
- 当辅助工具需要捆绑插件的公共层面时，通过 `src/test-utils/bundled-plugin-public-surface.ts` 处理。
- 优先使用 `loadBundledPluginApiSync(...)`、
  `loadBundledPluginRuntimeApiSync(...)`、
  `loadBundledPluginContractApiSync(...)` 和
  `loadBundledPluginTestApiSync(...)` 来急切访问导出的层面。
- 当辅助工具需要用于动态导入、mock 或加载插件入口点（如 `index.js`）的模块 id 或文件系统路径时，优先使用 `resolveRelativeBundledPluginPublicModuleId(...)` 或
  `resolveBundledPluginPublicModulePath(...)`。
- 如果涉及 `vi.hoisted(...)`，不要在提升的回调中调用导入的辅助函数。在回调外解析模块 id，或切换到 `vi.doMock(...)`。
- 不要在共享辅助工具中保留插件本地的深度 mock 或私有 `src/**` 知识。将这些辅助工具移至拥有它们的捆绑插件包中。

## 意图

- 保持共享辅助工具与生产代码使用的相同公共/插件边界对齐。
- 避免使核心测试通道依赖捆绑插件私有布局的共享辅助工具债务。
