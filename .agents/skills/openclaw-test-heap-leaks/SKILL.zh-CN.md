---
name: openclaw-test-heap-leaks
description: 调查 OpenClaw pnpm test 内存增长、Vitest OOM、RSS 峰值和堆快照差异。
---

# OpenClaw 测试堆内存泄漏

使用此技能进行测试内存调查。当堆快照可用时，不要仅凭 RSS 进行猜测。将快照名称差异视为分类证据，而非最终结论，直到有保留者或支配节点支持该判断。

对于**运行时修复**（例如，Gateway 等长期运行服务中的闭包泄漏），请参阅下方的[验证运行时修复](#验证运行时修复（非测试内存）)——该部分使用专用测试框架，而不是测试并行快照机制。

## 工作流

1. 首先重现失败的形态。
   - 尽可能匹配真实入口点。对于 Linux CI 风格的单元失败，从以下开始：
   - `pnpm canvas:a2ui:bundle && OPENCLAW_TEST_MEMORY_TRACE=1 OPENCLAW_TEST_HEAPSNAPSHOT_INTERVAL_MS=60000 OPENCLAW_TEST_HEAPSNAPSHOT_DIR=.tmp/heapsnap OPENCLAW_TEST_WORKERS=2 OPENCLAW_TEST_MAX_OLD_SPACE_SIZE_MB=6144 pnpm test`
   - 保持 `OPENCLAW_TEST_MEMORY_TRACE=1` 启用，以便封装器打印每个文件的 RSS 摘要以及快照。
   - 如果报告涉及特定分片或工作进程预算，保留该形态。
   - 在分析快照之前，从 `[test-parallel] start ...` 行或 `pnpm test --plan` 识别真实的通道名称。不要假设只有一个 `unit-fast` 通道；本地计划通常会分成 `unit-fast-batch-*`。

2. 在得出任何结论之前等待重复快照。
   - 从同一通道至少获取两个间隔。
   - 比较同一通道目录（例如 `.tmp/heapsnap/unit-fast-batch-2/`）内同一 PID 的快照。
   - 使用 `.agents/skills/openclaw-test-heap-leaks/scripts/heapsnapshot-delta.mjs` 直接比较两个文件，或比较一个通道目录中每个 PID 的最早/最新对。
   - 如果辅助工具建议存在已转换模块保留，在称其为已解决之前，在 DevTools 保留者/支配节点中确认最多条目。

3. 在选择修复方案之前对增长进行分类。
   - 如果增长主要由 Vite/Vitest 转换源字符串、`Module`、`system / Context`、字节码、描述符数组或属性映射主导，将其视为长期工作进程中可能的保留模块图增长。
   - 如果增长主要由应用对象、缓存、缓冲区、服务器句柄、定时器、模拟状态、sqlite 状态或类似运行时对象主导，将其视为可能的清理或生命周期泄漏。
   - 如果名称不明确，停止使用自信标签，并在 DevTools 中检查顶部差异的保留者/支配节点。

4. 修复正确的层。
   - 对于共享工作进程中可能的保留转换模块增长：
   - 优先考虑基于时序和热点驱动的调度修复。检查文件是否已在 `test/fixtures/test-timings.unit.json` 中表示，以及在手动编辑行为覆盖之前是否应刷新测量的热点清单。
   - 仅在时序驱动的剥离不足时，通过更新 `test/fixtures/test-parallel.behavior.json` 将热点文件移出真实共享通道。
   - 对于单独安全但会使共享工作进程堆膨胀的文件，优先使用 `singletonIsolated`。
   - 对于真实泄漏：
   - 修补涉及的测试或运行时清理路径。
   - 查找缺失的 `afterEach`/`afterAll`、模块重置缺口、保留的全局状态、未释放的 DB 句柄，或在文件后仍存在的监听器/定时器。

5. 使用最直接的证据进行验证。
   - 如果套件仍能在合理时间内完成，使用堆快照重新运行目标通道或文件。
   - 如果快照开销导致测试超过 Vitest 超时，回退到不带快照的同一通道，并确认 RSS 趋势或 OOM 已减少。
   - 对于仅封装器的变更，至少验证预期通道已启动并写入快照文件。

## 启发式规则

- 不要把所有问题都称为泄漏。在此仓库中，大型 `unit-fast` 或 `unit-fast-batch-*` 增长可能是工作进程生命周期问题，而非应用对象泄漏。
- `scripts/test-parallel.mjs` 和 `scripts/test-parallel-memory.mjs` 是封装器诊断的主要控制点。
- `[test-parallel] start ...` 和 `[test-parallel][mem] summary ...` 打印的通道名称告诉你应该关注的位置。
- 当一两个文件占增量的大部分且它们在时序中缺失时，通过隔离它们来减少影响通常是第一个实用修复。
- 当相同的保留对象族在同一工作进程 PID 的多个间隔内增长时，信任快照而非直觉，然后用保留者证据确认不明确的判断。

## 快照比较

- 直接比较：
  - `node .agents/skills/openclaw-test-heap-leaks/scripts/heapsnapshot-delta.mjs before.heapsnapshot after.heapsnapshot`
- 自动选择一个通道内每个 PID 的最早/最新快照：
  - `node .agents/skills/openclaw-test-heap-leaks/scripts/heapsnapshot-delta.mjs --lane-dir .tmp/heapsnap/unit-fast-batch-2`
- 有用标志：
  - `--top 40`
  - `--min-kb 32`
  - `--pid 16133`

首先读取最大正增量。模块转换产物的大量正增长表明需要通道隔离；运行时对象的大量正增长表明存在真实泄漏。如果名称本身无法解决问题，在 DevTools 中打开相同的快照对，并在声明根本原因之前检查顶部行的保留者/支配节点。

## 验证运行时修复（非测试内存）

上述工作流用于诊断 Vitest 工作进程内存增长。要验证运行时/闭包修复是否真正释放了捕获的状态，请使用专用测试框架：

- `pnpm leak:embedded-run` — 运行 `scripts/embedded-run-abort-leak.ts`。在模拟 `runEmbeddedAttempt` 的函数作用域内循环 N 次中止运行，写入堆快照，并使用 `FinalizationRegistry` 进行跟踪实例计数加上 RSS 增量来报告保留增长的 PASS/FAIL 结论。

模式：

- `closure-extracted`（默认）— 生产修复形态（模块作用域的辅助函数）。
- `closure-inline` — 修复前形态（运行器作用域内的闭包）。作为敏感性检查使用：如果通过，说明你破坏了测试框架，而不是修复了 bug。
- `synthetic-leak` — 通过模块级桶故意保留。用于在信任真实修复的 PASS 之前确认测试框架能够检测泄漏。

快照保存在 `.tmp/embedded-run-abort-leak/`。用相同脚本进行差异比较：

```bash
node .agents/skills/openclaw-test-heap-leaks/scripts/heapsnapshot-delta.mjs \
  .tmp/embedded-run-abort-leak/baseline-*.heapsnapshot \
  .tmp/embedded-run-abort-leak/batch-N-*.heapsnapshot --top 30
```

修复不同的运行时泄漏时，在此旁边添加新的测试框架而不是改造它。测试固件函数应模拟泄漏所在函数的词法作用域，而不是通用的中止循环。

## 输出预期

使用此技能时，报告：

- 确切的重现命令。
- 比较的通道和 PID。
- 快照差异中主要保留的对象族。
- 问题是可能的真实泄漏还是可能的共享工作进程保留模块增长，以及保留者/支配节点是否确认了这一点。
- 具体的修复或影响减少补丁。
- 你验证了什么，以及快照开销阻止你验证了什么。
