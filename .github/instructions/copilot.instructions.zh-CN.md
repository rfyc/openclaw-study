# OpenClaw 代码库规范

**始终重用现有代码 - 不要冗余！**

## 技术栈

- **运行时**：Node 22+（开发/脚本也支持 Bun）
- **语言**：TypeScript（ESM，严格模式）
- **包管理器**：pnpm（保持 `pnpm-lock.yaml` 同步）
- **Lint/格式化**：Oxlint、Oxfmt（`pnpm check`）
- **测试**：Vitest 配合 V8 覆盖率
- **CLI 框架**：Commander + clack/prompts
- **构建**：tsdown（输出到 `dist/`）

## 反冗余规则

- 避免只是从另一个文件重新导出的文件。直接从原始来源导入。
- 如果函数已经存在，导入它 - 不要在另一个文件中创建副本。
- 在创建任何格式化器、工具函数或辅助函数之前，首先搜索现有实现。

## 真相来源位置

### 格式化工具（`src/infra/`）

- **时间格式化**：`src\infra\format-time`

**永远不要创建本地 `formatAge`、`formatDuration`、`formatElapsedTime` 函数 - 从集中模块导入。**

### 终端输出（`src/terminal/`）

- 表格：`src/terminal/table.ts`（`renderTable`）
- 主题/颜色：`src/terminal/theme.ts`（`theme.success`、`theme.muted` 等）
- 进度：`src/cli/progress.ts`（旋转器、进度条）

### CLI 规范

- CLI 选项连接：`src/cli/`
- 命令：`src/commands/`
- 通过 `createDefaultDeps` 进行依赖注入

## 导入约定

- 跨包导入使用 `.js` 扩展名（ESM）
- 仅直接导入 - 无重导出包装文件
- 类型：仅类型导入使用 `import type { X }`

## 代码质量

- TypeScript（ESM），严格类型，避免 `any`
- 文件保持在 ~700 行以内 - 更大时提取辅助函数
- 协同测试：`*.test.ts` 紧邻源文件
- 提交前运行 `pnpm check`（生产类型检查 + lint + 格式化）
- 需要测试类型覆盖时运行 `pnpm check:test-types`，或运行 `pnpm tsgo:all` 进行完整的生产加测试类型扫描

## 技术栈与命令

- **包管理器**：pnpm（`pnpm install`）
- **开发**：`pnpm openclaw ...` 或 `pnpm dev`
- **类型检查**：`pnpm tsgo`（核心生产），`pnpm tsgo:prod`（核心 + 扩展生产），`pnpm check:test-types`（测试）
- **Lint/格式化**：`pnpm check`
- **测试**：`pnpm test`
- **构建**：`pnpm build`

如果您正在与人类一起编码，不要使用 scripts/committer，而是直接使用 git，并手动运行上述命令以确保质量。
