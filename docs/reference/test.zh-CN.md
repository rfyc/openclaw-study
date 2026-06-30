---
summary: "如何在本地运行测试（vitest）以及何时使用 force/coverage 模式"
read_when:
  - 运行或修复测试时
title: "测试"
---

- 完整测试套件（套件、实时测试、Docker）：[测试](/help/testing)
- 更新和插件包验证：[测试更新和插件](/help/testing-updates-plugins)

- `pnpm test:force`：杀死占用默认控制端口的任何残留网关进程，然后使用隔离的网关端口运行完整的 Vitest 套件，以便服务器测试不会与正在运行的实例冲突。当之前的网关运行占用了端口 18789 时使用此命令。
- `pnpm test:coverage`：使用 V8 覆盖率运行单元套件（通过 `vitest.unit.config.ts`）。这是一个加载文件的单元覆盖率门控，而不是整个仓库所有文件的覆盖率。阈值为 70% 行/函数/语句和 55% 分支。因为 `coverage.all` 为 false，门控测量单元覆盖率套件加载的文件，而不是将每个拆分通道源文件视为未覆盖。
- `pnpm test:coverage:changed`：仅对自 `origin/main` 以来更改的文件运行单元覆盖率。
- `pnpm test:changed`：廉价的智能变更测试运行。它对直接测试编辑、同级 `*.test.ts` 文件、明确的源映射和本地导入图运行精确目标。广泛/配置/包更改会被跳过，除非它们映射到精确的测试。
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`：明确的广泛变更测试运行。当测试工具/配置/包编辑应回退到 Vitest 更广泛的变更测试行为时使用它。
- `pnpm changed:lanes`：显示由与 `origin/main` 对比的差异触发的架构通道。
- `pnpm check:changed`：对与 `origin/main` 的差异运行智能变更检查门控。它运行受影响架构通道的类型检查、lint 和守卫命令，但不运行 Vitest 测试。使用 `pnpm test:changed` 或明确的 `pnpm test <target>` 进行测试证明。
- `pnpm test`：通过作用域 Vitest 通道路由明确的文件/目录目标。非目标运行使用固定的分片组并扩展到叶子配置以进行本地并行执行；扩展组始终扩展到每个扩展分片配置，而不是一个大型根项目进程。
- 测试封装器运行以简短的 `[test] passed|failed|skipped ... in ...` 摘要结束。Vitest 自己的持续时间行保持为每个分片的详细信息。
- 共享 OpenClaw 测试状态：当测试需要隔离的 `HOME`、`OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH`、配置夹具、工作区、智能助手目录或身份验证配置文件存储时，从 Vitest 使用 `src/test-utils/openclaw-test-state.ts`。
- 进程 E2E 辅助工具：当 Vitest 进程级 E2E 测试需要在一个地方运行网关、CLI 环境、日志捕获和清理时，使用 `test/helpers/openclaw-test-instance.ts`。
- Docker/Bash E2E 辅助工具：获取 `scripts/lib/docker-e2e-image.sh` 的通道可以将 `docker_e2e_test_state_shell_b64 <label> <scenario>` 传入容器，并使用 `scripts/lib/openclaw-e2e-instance.sh` 解码；多主机脚本可以传递 `docker_e2e_test_state_function_b64` 并在每个流中调用 `openclaw_test_state_create <label> <scenario>`。较低级别的调用者可以使用 `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` 获取容器内的 shell 代码片段，或使用 `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` 获取可 source 的主机环境文件。`--` 在 `create` 之前可防止较新的 Node 运行时将 `--env-file` 视为 Node 标志。在容器内启动网关的 Docker/Bash 通道可以在容器内 source `scripts/lib/openclaw-e2e-instance.sh`，用于入口点解析、模拟 OpenAI 启动、网关前台/后台启动、就绪探测、状态环境导出、日志转储和进程清理。
- 完整、扩展和包含模式的分片运行在 `.artifacts/vitest-shard-timings.json` 中更新本地时序数据；之后的整体配置运行使用这些时序来平衡慢速和快速分片。包含模式 CI 分片将分片名称附加到时序键，这使过滤后的分片时序可见而不会替换整体配置时序数据。设置 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 以忽略本地时序工件。
- 选定的 `plugin-sdk` 和 `commands` 测试文件现在通过专用的轻量级通道路由，该通道只保留 `test/setup.ts`，将运行时密集型情况留在其现有通道上。
- `src/channels/plugins/contracts/test-helpers`、`src/plugin-sdk/test-helpers` 和 `src/plugins/contracts` 下的帮助器编辑使用本地导入图来运行导入测试，而不是在依赖路径精确时广泛运行每个分片。
- `auto-reply` 现在也拆分为三个专用配置（`core`、`top-level`、`reply`），这样回复工具不会主导较轻量的顶级状态/token/帮助器测试。
- 基础 Vitest 配置现在默认为 `pool: "threads"` 和 `isolate: false`，并在整个仓库配置中启用了共享的非隔离运行器。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 运行所有扩展/插件分片。重型通道插件、浏览器插件和 OpenAI 作为专用分片运行；其他插件组保持批量。使用 `pnpm test extensions/<id>` 用于一个捆绑插件通道。
- `pnpm test:perf:imports`：启用 Vitest 导入持续时间 + 导入细分报告，同时仍对明确的文件/目录目标使用作用域通道路由。
- `pnpm test:perf:imports:changed`：相同的导入分析，但仅用于自 `origin/main` 以来更改的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 对同一提交 git 差异的本机根项目运行，对路由变更模式路径进行基准测试。
- `pnpm test:perf:changed:bench -- --worktree` 对当前工作树变更集进行基准测试，无需先提交。
- `pnpm test:perf:profile:main`：为 Vitest 主线程编写 CPU 配置文件（`.artifacts/vitest-main-profile`）。
- `pnpm test:perf:profile:runner`：为单元运行器编写 CPU + 堆配置文件（`.artifacts/vitest-runner-profile`）。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：串行运行每个完整套件 Vitest 叶子配置，并写入分组持续时间数据以及每个配置的 JSON/日志工件。测试性能智能助手在尝试慢速测试修复之前将此用作基线。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`：在以性能为重点的变更后比较分组报告。
- 网关集成：通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 选择加入。
- `pnpm test:e2e`：运行网关端到端冒烟测试（多实例 WS/HTTP/节点配对）。在 `vitest.e2e.config.ts` 中默认使用 `threads` + `isolate: false` 和自适应工作线程；使用 `OPENCLAW_E2E_WORKERS=<n>` 调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 获取详细日志。
- `pnpm test:live`：运行提供商实时测试（minimax/zai）。需要 API 密钥和 `LIVE=1`（或特定于提供商的 `*_LIVE_TEST=1`）才能取消跳过。
- `pnpm test:docker:all`：构建共享实时测试镜像，将 OpenClaw 一次打包为 npm tarball，构建/重用裸 Node/Git 运行器镜像以及将该 tarball 安装到 `/app` 的功能镜像，然后通过加权调度器使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行 Docker 冒烟通道。裸镜像（`OPENCLAW_DOCKER_E2E_BARE_IMAGE`）用于安装程序/更新/插件依赖通道；这些通道挂载预构建的 tarball，而不是使用复制的仓库源。功能镜像（`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`）用于正常构建应用功能通道。`scripts/package-openclaw-for-docker.mjs` 是单个本地/CI 包打包器，在 Docker 使用之前验证 tarball 和 `dist/postinstall-inventory.json`。Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；计划逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 执行所选计划。`node scripts/test-docker-all.mjs --plan-json` 为所选通道、镜像类型、包/实时镜像需求、状态场景和凭据检查发出调度器拥有的 CI 计划，而不构建或运行 Docker。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制进程槽位，默认为 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制提供商敏感的尾部池，默认为 10。重型通道上限默认为 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；提供商上限通过 `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`、`OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` 和 `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4` 默认为每个提供商一个重型通道。对较大的主机使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。如果一个通道在低并行主机上超过有效权重或资源上限，它仍然可以从空池开始，并在释放容量之前单独运行。默认情况下，通道启动之间相隔 2 秒，以避免本地 Docker 守护进程创建风暴；使用 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>` 覆盖。运行器默认预检 Docker，清理过时的 OpenClaw E2E 容器，每 30 秒发出活跃通道状态，在兼容通道之间共享提供商 CLI 工具缓存，默认重试一次瞬态实时提供商故障（`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`），并在 `.artifacts/docker-tests/lane-timings.json` 中存储通道时序，以便在后续运行中进行最长优先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 打印通道清单而不运行 Docker，`OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 调整状态输出，或 `OPENCLAW_DOCKER_ALL_TIMINGS=0` 禁用时序重用。使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` 仅用于确定性/本地通道，或 `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` 仅用于实时提供商通道；包别名为 `pnpm test:docker:local:all` 和 `pnpm test:docker:live:all`。仅实时模式将主要和尾部实时通道合并到一个最长优先池中，以便提供商桶可以一起打包 Claude、Codex 和 Gemini 工作。运行器在第一次失败后停止调度新的池化通道，除非设置了 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`，每个通道有一个 120 分钟的回退超时，可通过 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；选定的实时/尾部通道使用更严格的每通道上限。每个通道的日志、`summary.json`、`failures.json` 和阶段时序写在 `.artifacts/docker-tests/<run-id>/` 下；使用 `pnpm test:docker:timings <summary.json>` 检查慢速通道，使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 打印廉价的有针对性的重运行命令。
- `pnpm test:docker:browser-cdp-snapshot`：构建一个基于 Chromium 的源 E2E 容器，启动原始 CDP 以及隔离的网关，运行 `browser doctor --deep`，并验证 CDP 角色快照是否包含链接 URL、光标提升的可点击项、iframe 引用和帧元数据。
- CLI 后端实时 Docker 探测可以作为焦点通道运行，例如 `pnpm test:docker:live-cli-backend:codex`、`pnpm test:docker:live-cli-backend:codex:resume` 或 `pnpm test:docker:live-cli-backend:codex:mcp`。Claude 和 Gemini 有匹配的 `:resume` 和 `:mcp` 别名。
- `pnpm test:docker:openwebui`：启动 Dockerized OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions` 运行真实的代理聊天。需要可用的实时模型密钥（例如 `~/.profile` 中的 OpenAI），拉取外部 Open WebUI 镜像，并且不期望像正常单元/e2e 套件那样稳定。
- `pnpm test:docker:mcp-channels`：启动一个种子化的网关容器和一个第二客户端容器，该容器生成 `openclaw mcp serve`，然后通过真实的 stdio 桥验证路由对话发现、记录读取、附件元数据、实时事件队列行为、出站发送路由以及 Claude 风格的通道 + 权限通知。Claude 通知断言直接读取原始 stdio MCP 帧，以便冒烟测试反映桥接器实际发出的内容。
- `pnpm test:docker:upgrade-survivor`：在脏旧用户夹具上安装打包的 OpenClaw tarball，在没有实时提供商或通道密钥的情况下运行包更新加非交互式 doctor，然后启动回环网关，并检查智能助手、通道配置、插件允许列表、工作区/会话文件、过时的遗留插件依赖状态、启动和 RPC 状态是否能够存活。
- `pnpm test:docker:published-upgrade-survivor`：默认安装 `openclaw@latest`，在没有实时提供商或通道密钥的情况下种子化真实的现有用户文件，使用烘焙的 `openclaw config set` 命令配方配置该基线，将该已发布安装更新为打包的 OpenClaw tarball，运行非交互式 doctor，写入 `.artifacts/upgrade-survivor/summary.json`，然后启动回环网关并检查配置的意图、工作区/会话文件、过时的插件配置和遗留依赖状态、启动、`/healthz`、`/readyz` 和 RPC 状态是否能存活或干净修复。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖一个基线，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`（例如 `all-since-2026.4.23`）扩展确切的矩阵，或使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 添加场景夹具；reported-issues 集包括 `configured-plugin-installs` 以验证在升级期间配置的外部 OpenClaw 插件自动安装。包验收将这些公开为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`。
- `pnpm test:docker:update-migration`：在 `plugin-deps-cleanup` 场景中运行已发布升级存活工具，默认从 `openclaw@2026.4.23` 开始。单独的 `Update Migration` 工作流使用 `baselines=all-since-2026.4.23` 扩展此通道，以便从 `.23` 开始的每个稳定发布包都更新到候选版本，并在完整发布 CI 之外证明配置插件依赖清理。
- `pnpm test:docker:plugins`：为本地路径、`file:`、带有提升依赖的 npm 注册表包、git 移动引用、ClawHub 夹具、市场更新和 Claude-bundle 启用/检查运行安装/更新冒烟测试。

## 本地 PR 门控

对于本地 PR 落地/门控检查，运行：

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在高负载主机上出现不稳定，在将其视为回归之前重新运行一次，然后使用 `pnpm test <path/to/test>` 隔离。对于内存受限的主机，使用：

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## 模型延迟基准测试（本地密钥）

脚本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可选环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 默认提示：`"Reply with a single word: ok. No punctuation or extra text."`

最近一次运行（2025-12-31，20 次运行）：

- minimax 中位数 1279ms（最小 1114，最大 2431）
- opus 中位数 2454ms（最小 1224，最大 3170）

## CLI 启动基准测试

脚本：[`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

用法：

- `pnpm test:startup:bench`
- `pnpm test:startup:bench:smoke`
- `pnpm test:startup:bench:save`
- `pnpm test:startup:bench:update`
- `pnpm test:startup:bench:check`
- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --case gatewayStatus --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case tasksJson --case tasksListJson --case tasksAuditJson --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

预设：

- `startup`：`--version`、`--help`、`health`、`health --json`、`status --json`、`status`
- `real`：`health`、`status`、`status --json`、`sessions`、`sessions --json`、`tasks --json`、`tasks list --json`、`tasks audit --json`、`agents list --json`、`gateway status`、`gateway status --json`、`gateway health --json`、`config get gateway.port`
- `all`：两个预设

输出包括每个命令的 `sampleCount`、平均值、p50、p95、最小值/最大值、退出代码/信号分布和最大 RSS 摘要。可选的 `--cpu-prof-dir` / `--heap-prof-dir` 为每次运行写入 V8 配置文件，以便时序和配置文件捕获使用相同的工具。

保存的输出约定：

- `pnpm test:startup:bench:smoke` 将目标烟雾工件写入 `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` 使用 `runs=5` 和 `warmup=1` 将完整套件工件写入 `.artifacts/cli-startup-bench-all.json`
- `pnpm test:startup:bench:update` 使用 `runs=5` 和 `warmup=1` 刷新 `test/fixtures/cli-startup-bench.json` 中已签入的基线夹具

已签入的夹具：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 刷新
- 使用 `pnpm test:startup:bench:check` 将当前结果与夹具进行比较

## 引导 E2E（Docker）

Docker 是可选的；这只是容器化引导冒烟测试所需的。

在干净的 Linux 容器中完整冷启动流：

```bash
scripts/e2e/onboard-docker.sh
```

此脚本通过伪终端驱动交互式向导，验证配置/工作区/会话文件，然后启动网关并运行 `openclaw health`。

## QR 导入冒烟（Docker）

确保维护的 QR 运行时辅助工具在受支持的 Docker Node 运行时下加载（默认 Node 24，Node 22 兼容）：

```bash
pnpm test:docker:qr
```

## 相关

- [测试](/help/testing)
- [实时测试](/help/testing-live)
- [测试更新和插件](/help/testing-updates-plugins)
