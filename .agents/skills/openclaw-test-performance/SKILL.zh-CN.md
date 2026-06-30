---
name: openclaw-test-performance
description: 基准测试、诊断和优化 OpenClaw 测试及插件套件运行时、导入热点、CPU/RSS、堆增长和慢速覆盖路径。
---

# OpenClaw 测试性能

以证据为先。目标是在保持覆盖率不变的情况下，真正改善 `pnpm test`、插件套件和插件检查器的速度/RSS，而非依靠猜测来调整运行器。

## 工作流

1. 编辑前先阅读相关的本地 `AGENTS.md` 文件：
   - `src/agents/AGENTS.md`：智能体/导入热点。
   - `src/channels/AGENTS.md` 和 `src/plugins/AGENTS.md`：插件/频道惰性加载。
   - `src/gateway/AGENTS.md`：服务器生命周期测试。
   - `test/helpers/AGENTS.md` 和 `test/helpers/channels/AGENTS.md`：共享合约辅助函数。
   - `src/infra/outbound/AGENTS.md`：出站/媒体/操作测试。
2. 修改代码前先建立基线：
   - 优先使用 `pnpm test:perf:groups --full-suite --allow-failures --output <file>` 进行完整套件排名。
   - 对于捆绑插件广度，在跳转到完整扩展扫描之前，运行最小相关的 `pnpm test:extensions:batch <plugin[,plugin...]>` 或插件检查器命令。
   - 对于范围热点，使用：`/usr/bin/time -l pnpm test <file-or-files> --maxWorkers=1 --reporter=verbose`
   - 对于导入密集型嫌疑，添加：`OPENCLAW_VITEST_IMPORT_DURATIONS=1 OPENCLAW_VITEST_PRINT_IMPORT_BREAKDOWN=1`。
3. 将运行器/壁挂噪声与真实文件成本分开：
   - 比较 Vitest 持续时间、测试体时序、导入明细、壁挂时间和最大 RSS。
   - 当分组/完整套件数字看起来过时或嘈杂时，重新运行单个文件。
   - 如果完整套件分组运行报告通道失败但 JSON 显示测试通过，将其记录为框架/噪声并直接验证可疑文件。
4. 按回报和风险选择下一个攻击目标：
   - 高回报：一个文件/测试占主导地位的秒数或 RSS，且有明确的根本原因。
   - 高杠杆：一个插件或 SDK 桶导致每次插件检查器或扩展批次运行都加载大量运行时。
   - 较低风险：静态描述符、目标解析、路由、身份验证绕过、设置提示、注册表固件或测试服务器生命周期。
   - 较高风险：真实的内存/运行时行为、实时提供者、协议合约或广泛的生产重构。
5. 修复根本原因，而非症状：
   - 将静态元数据/解析移入窄辅助函数或被完整运行时和快速路径重用的轻量产物中。
   - 优先使用依赖注入、已加载插件的查找、显式固件和纯辅助函数，而非广泛模拟。
   - 当新握手无关时，重用套件级服务器/客户端。
   - 除非测试证明需要调度，否则不启动调度器/后台循环。
   - 在插件路径中，将静态元数据移入清单/轻量产物，并将运行时插件加载保留在显式执行边界之后。
6. 保持覆盖率形态：
   - 除非将确切的生产组合提取到命名辅助函数中并进行测试，否则不要删除慢速集成证明。
   - 当跨组件连接很重要时，保留一个廉价的集成冒烟测试。
   - 如有移除附带覆盖率，明确说明移除了什么。
7. 更改后对相同命令重新进行基准测试，并计算秒数和百分比增益。
8. 在请求时或当此线程正在跟踪报告时更新运行报告。包括前后命令、产物、覆盖率说明、验证和下一个攻击顺序。

## 插件套件工作流

当性能工作涉及捆绑插件、插件检查器、SDK 桶、包边界测试或扩展套件时，使用此部分。

1. 首先映射套件形态：
   - 源测试：`pnpm test extensions/<id>` 或 `pnpm test:extensions:batch <id>`
   - 包边界：`pnpm run test:extensions:package-boundary:canary` 和 `pnpm run test:extensions:package-boundary:compile`
   - 所有捆绑源测试：`pnpm test:extensions`
   - 插件导入内存：`pnpm test:extensions:memory -- --json .artifacts/test-perf/extensions-memory.json`
2. 从窄范围开始，然后扩大：
   - 单个插件变更：运行该插件的测试和插件检查器切片。
   - SDK/公共桶变更：添加代表性的提供者、频道、内存和功能插件。
   - 加载器/运行时镜像变更：根据需要添加包边界检查和构建/包验证。
   - 未知的共享插件行为：在 `pnpm test:extensions` 之前运行 `test:extensions:batch` 组。
3. 将插件检查器失败视为产品信号：
   - JSON 必须可解析。
   - 警告/错误必须分类，不能隐藏。
   - 运行时捕获应安静且对配置容错。
   - 命令输出应包括壁挂时间、退出代码和峰值 RSS（如可用）。

## 度量指标收集

在变更前后至少收集一个稳定的度量指标。优先使用相同机器和相同命令。

| 度量指标        | 用途                       | 首选来源                               |
| --------------- | -------------------------- | -------------------------------------- |
| 壁挂时间        | 用户可见的套件成本         | `/usr/bin/time -l`、测试封装器持续时间 |
| Vitest 持续时间 | 测试体/导入成本            | 每个文件/分片的 Vitest 输出            |
| 导入持续时间    | 广泛桶/运行时加载          | `OPENCLAW_VITEST_IMPORT_DURATIONS=1`   |
| 最大 RSS        | 内存压力和 OOM 风险        | `/usr/bin/time -l`、内存封装器摘要     |
| CPU/用户/系统   | CPU 密集型与等待密集型分拆 | `/usr/bin/time -l` 本地                |
| 堆快照          | 真实泄漏与保留模块图       | `openclaw-test-heap-leaks` 工作流      |

本地范围命令（含 CPU/RSS）：

```bash
timeout 240 /usr/bin/time -l pnpm test <file> --maxWorkers=1 --reporter=verbose
```

## 验证

- 始终运行证明变更的目标测试面。
- 对于源代码变更，推送前运行 `pnpm check:changed`；在维护者 Testbox 模式下，在预热的 Testbox 中运行。
- 对于仅测试变更，运行 `pnpm test:changed` 或确切的已编辑测试。
- 当涉及惰性加载、捆绑产物、包边界、动态导入、构建输出或公共界面时，运行 `pnpm build`。

## 移交

保持最终报告简洁：

- 根本原因。
- 套件/插件范围。
- 更改的文件。
- 前后的壁挂、Vitest/导入、CPU 和 RSS 数字（如可用）。
- 内存泄漏分类（如涉及内存）：真实泄漏、保留模块图或不确定。
- 保留的覆盖率。
- 验证命令。
- 远程证明的 Testbox ID 或工作流 URL。
- 提交哈希和推送状态。
