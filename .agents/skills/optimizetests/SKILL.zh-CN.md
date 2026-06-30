---
name: optimizetests
description: 在不降低覆盖率的情况下优化 OpenClaw 慢速测试、导入、错误放置的覆盖率和 CI 壁挂时间。
---

# 优化测试

目标：在保持覆盖率不变的情况下实现真正的 OpenClaw 测试/运行时加速。不要以添加分片、跳过断言、弱化门控或调整运行器标志作为主要修复方法。

## 操作手册

1. 阅读 `docs/help/testing.md`、`docs/ci.md` 以及你将编辑的任何子树的范围 `AGENTS.md` 文件。
2. 在编辑之前建立证据：
   - 完整排名：`pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/<name>.json`
   - 目标文件：`timeout 240 /usr/bin/time -l pnpm test <file> --maxWorkers=1 --reporter=verbose`
   - 导入嫌疑：添加 `OPENCLAW_VITEST_IMPORT_DURATIONS=1 OPENCLAW_VITEST_PRINT_IMPORT_BREAKDOWN=1`
3. 首先攻击回报最高的热点：
   - 热测试中的广泛桶或 `importActual()`
   - 每个测试的 `vi.resetModules()` 加上新的导入
   - 昂贵的网关/服务器/客户端设置（在重置/重用可以证明相同行为的情况下）
   - 断言扩展拥有行为的核心测试
   - 重复的固件构建或合约断言
4. 优先选择生产质量的修复：
   - 窄运行时接缝而非广泛模拟
   - 用于静态解析/元数据的纯辅助函数
   - 注入依赖而非模块重置
   - 用于捆绑插件/提供者/频道行为的扩展拥有测试
5. 每次变更后，重新运行相同的基准测试和证明测试通道。记录前后的壁挂时间、Vitest 持续时间和最大 RSS（如可用）。
6. 运行 `pnpm check:changed`；当修改的表面需要时，运行更宽泛的门控（`pnpm check`、`pnpm test`、`pnpm build`）。
7. 使用 `scripts/committer "<conventional message>" <paths...>` 提交范围变更。根据请求推送。如果 CI 为红色，用 `gh run list/view` 检查，修复，推送，重复，直到当前 CI 为绿色或阻塞问题被证明无关。

## 输出

以推送的提交、前后时序、运行的门控、当前 CI 状态以及需要单独优化的任何剩余尾部通道结束。
