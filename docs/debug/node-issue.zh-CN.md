---
summary: Node + tsx "__name is not a function" 崩溃说明和解决方案
read_when:
  - 调试仅 Node 的开发脚本或监视模式失败时
  - 调查 OpenClaw 中的 tsx/esbuild 加载器崩溃时
title: "Node + tsx 崩溃"
---

# Node + tsx "\_\_name is not a function" 崩溃

## 摘要

通过 Node 使用 `tsx` 运行 OpenClaw 时，在启动时以以下错误失败：

```
[openclaw] Failed to start CLI: TypeError: __name is not a function
    at createSubsystemLogger (.../src/logging/subsystem.ts:203:25)
    at .../src/agents/auth-profiles/constants.ts:25:20
```

这在将开发脚本从 Bun 切换到 `tsx`（提交 `2871657e`，2026-01-06）后开始出现。相同的运行时路径在 Bun 下正常工作。

## 环境

- Node：v25.x（在 v25.3.0 上观察到）
- tsx：4.21.0
- 操作系统：macOS（在运行 Node 25 的其他平台上也可能复现）

## 复现方式（仅 Node）

```bash
# 在仓库根目录
node --version
pnpm install
node --import tsx src/entry.ts status
```

## 仓库中的最小复现

```bash
node --import tsx scripts/repro/tsx-name-repro.ts
```

## Node 版本检查

- Node 25.3.0：失败
- Node 22.22.0（Homebrew `node@22`）：失败
- Node 24：尚未在此安装；需要验证

## 注意事项 / 假设

- `tsx` 使用 esbuild 转换 TS/ESM。esbuild 的 `keepNames` 发出 `__name` 辅助函数并用 `__name(...)` 包装函数定义。
- 崩溃表明 `__name` 存在但在运行时不是一个函数，这意味着辅助函数在 Node 25 加载器路径的此模块中缺失或被覆盖。
- 类似的 `__name` 辅助函数问题已在其他 esbuild 消费者中报告，当辅助函数缺失或被重写时。

## 回归历史

- `2871657e`（2026-01-06）：脚本从 Bun 改为 tsx，以使 Bun 成为可选项。
- 在此之前（Bun 路径），`openclaw status` 和 `gateway:watch` 正常工作。

## 解决方案

- 对开发脚本使用 Bun（当前临时恢复方案）。
- 使用 `tsgo` 进行仓库类型检查，然后运行已构建的输出：

  ```bash
  pnpm tsgo
  node openclaw.mjs status
  ```

- 历史说明：在调试此 Node/tsx 问题时使用了 `tsc`，但仓库类型检查通道现在使用 `tsgo`。
- 如果可能，在 TS 加载器中禁用 esbuild keepNames（防止 `__name` 辅助函数插入）；tsx 目前不公开此选项。
- 使用 Node LTS（22/24）测试 `tsx`，以查看该问题是否特定于 Node 25。

## 参考

- [https://opennext.js.org/cloudflare/howtos/keep_names](https://opennext.js.org/cloudflare/howtos/keep_names)
- [https://esbuild.github.io/api/#keep-names](https://esbuild.github.io/api/#keep-names)
- [https://github.com/evanw/esbuild/issues/1031](https://github.com/evanw/esbuild/issues/1031)

## 后续步骤

- 在 Node 22/24 上复现，以确认 Node 25 回归。
- 如果存在已知回归，测试 `tsx` 夜间版本或固定到较早版本。
- 如果在 Node LTS 上复现，使用 `__name` 堆栈跟踪在上游提交最小复现。

## 相关

- [Node.js 安装](/install/node)
- [网关故障排除](/gateway/troubleshooting)
