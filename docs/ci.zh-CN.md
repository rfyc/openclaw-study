---
summary: "CI 任务图、范围门控、发布总览及本地命令等效项"
title: "CI 流水线"
read_when:
  - 需要了解 CI 任务运行或未运行的原因时
  - 调试失败的 GitHub Actions 检查时
  - 协调发布验证运行或重新运行时
  - 更改 ClawSweeper 调度或 GitHub 活动转发时
---

OpenClaw CI 在每次推送到 `main` 以及每个拉取请求时运行。`preflight` 任务对差异进行分类，并在仅更改了不相关区域时关闭昂贵的通道。手动 `workflow_dispatch` 运行故意绕过智能范围限定，并为候选发布版本和广泛验证展开完整图。Android 通道通过 `include_android` 保持选择性加入。发布专用插件覆盖存在于单独的 [`Plugin Prerelease`](#plugin-prerelease) 工作流中，并且仅从 [`Full Release Validation`](#full-release-validation) 或显式手动调度中运行。

## 流水线概览

| 任务                             | 目的                                                                     | 运行时机                   |
| -------------------------------- | ------------------------------------------------------------------------ | -------------------------- |
| `preflight`                      | 检测仅文档更改、已更改范围、已更改扩展，并构建 CI 清单                   | 非草稿推送和 PR 时始终运行 |
| `security-scm-fast`              | 通过 `zizmor` 进行私钥检测和工作流审计                                   | 非草稿推送和 PR 时始终运行 |
| `security-dependency-audit`      | 针对 npm 安全公告的无依赖生产锁文件审计                                  | 非草稿推送和 PR 时始终运行 |
| `security-fast`                  | 快速安全任务的必需聚合                                                   | 非草稿推送和 PR 时始终运行 |
| `check-dependencies`             | 生产 Knip 仅依赖通过以及未使用文件允许列表守卫                           | Node 相关更改时            |
| `build-artifacts`                | 构建 `dist/`、Control UI、内置构件检查和可复用的下游构件                 | Node 相关更改时            |
| `checks-fast-core`               | 快速 Linux 正确性通道，例如捆绑/插件合约/协议检查                        | Node 相关更改时            |
| `checks-fast-contracts-channels` | 分片频道合约检查，带有稳定的聚合检查结果                                 | Node 相关更改时            |
| `checks-node-core-test`          | 核心 Node 测试分片，排除频道、捆绑、合约和扩展通道                       | Node 相关更改时            |
| `check`                          | 分片的主本地门控等效项：生产类型、lint、守卫、测试类型和严格冒烟测试     | Node 相关更改时            |
| `check-additional`               | 架构、分片边界/提示词漂移、扩展守卫、包边界和网关监视                    | Node 相关更改时            |
| `build-smoke`                    | 已构建 CLI 冒烟测试和启动内存冒烟测试                                    | Node 相关更改时            |
| `checks`                         | 内置构件频道测试验证器                                                   | Node 相关更改时            |
| `checks-node-compat-node22`      | Node 22 兼容性构建和冒烟通道                                             | 发布时手动 CI 调度         |
| `check-docs`                     | 文档格式、lint 和断链检查                                                | 文档更改时                 |
| `skills-python`                  | Python 支持技能的 Ruff + pytest                                          | Python 技能相关更改时      |
| `checks-windows`                 | Windows 特定的进程/路径测试以及共享运行时导入说明符回归                  | Windows 相关更改时         |
| `macos-node`                     | 使用共享构建构件的 macOS TypeScript 测试通道                             | macOS 相关更改时           |
| `macos-swift`                    | macOS 应用的 Swift lint、构建和测试                                      | macOS 相关更改时           |
| `android`                        | 两种 flavor 的 Android 单元测试加一个 debug APK 构建                     | Android 相关更改时         |
| `test-performance-agent`         | 在可信活动后每日进行 Codex 慢测试优化                                    | 主 CI 成功或手动调度时     |
| `openclaw-performance`           | 每日/按需 Kova 运行时性能报告，含模拟提供商、深度分析和 GPT 5.4 实时通道 | 计划和手动调度时           |

## 快速失败顺序

1. `preflight` 决定哪些通道存在。`docs-scope` 和 `changed-scope` 逻辑是此任务内的步骤，而非独立任务。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 在不等待较重的构件和平台矩阵任务的情况下快速失败。
3. `build-artifacts` 与快速 Linux 通道重叠，因此下游消费者可以在共享构建就绪后立即开始。
4. 更重的平台和运行时通道随后展开：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-core-test`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

当较新的推送落在同一 PR 或 `main` 引用上时，GitHub 可能会将被取代的任务标记为 `cancelled`。除非同一引用的最新运行也失败，否则将其视为 CI 噪音。聚合分片检查使用 `!cancelled() && always()`，因此它们仍会报告正常的分片失败，但在整个工作流已经被取代后不会排队。自动 CI 并发键是版本化的（`CI-v7-*`），因此旧队列组中的 GitHub 端僵尸不会无限期阻塞较新的主运行。手动完整套件运行使用 `CI-manual-v1-*` 且不取消进行中的运行。

## 范围和路由

范围逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。手动调度跳过更改范围检测，使预检清单表现得好像每个范围区域都已更改。

- **CI 工作流编辑**验证 Node CI 图以及工作流 lint，但本身不会强制 Windows、Android 或 macOS 原生构建；这些平台通道保持针对平台源更改的范围限定。
- **仅 CI 路由编辑、精选廉价核心测试夹具编辑和窄插件合约辅助/测试路由编辑**使用快速仅 Node 清单路径：`preflight`、安全性和单个 `checks-fast-core` 任务。该路径在更改仅限于快速任务直接练习的路由或辅助面时，跳过构建构件、Node 22 兼容性、频道合约、完整核心分片、捆绑插件分片和额外守卫矩阵。
- **Windows Node 检查**的范围仅限于 Windows 特定的进程/路径包装器、npm/pnpm/UI 运行器辅助工具、包管理器配置以及执行该通道的 CI 工作流面；不相关的源、插件、安装冒烟测试和纯测试更改保持在 Linux Node 通道上。

最慢的 Node 测试系列被拆分或平衡，以便每个任务在不过度保留运行器的情况下保持较小：频道合约作为三个加权分片运行，核心单元快速/支持通道单独运行，核心运行时基础设施在状态和进程/配置分片之间拆分，自动回复作为平衡工作者运行（回复子树拆分为代理运行器、调度和命令/状态路由分片），而代理网关/服务器配置在聊天/认证/模型/http-插件/运行时/启动通道之间拆分，而不是等待构建构件。广泛的浏览器、QA、媒体和杂项插件测试使用其专用 Vitest 配置，而非共享插件通用配置。包含模式分片使用 CI 分片名称记录计时条目，因此 `.artifacts/vitest-shard-timings.json` 可以区分整个配置和过滤分片。`check-additional` 将包边界编译/金丝雀工作放在一起，并将运行时拓扑架构与网关监视覆盖分离；边界守卫列表跨四个矩阵分片条纹，每个分片并发运行选定的独立守卫并打印每个检查的计时，包括 `pnpm prompt:snapshots:check`，以便 Codex 运行时快乐路径提示词漂移被固定到导致它的 PR。网关监视、频道测试和核心支持边界分片在 `build-artifacts` 中并发运行，此时 `dist/` 和 `dist-runtime/` 已经构建好。

Android CI 运行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然后构建 Play debug APK。第三方 flavor 没有单独的源集或清单；其单元测试通道仍然用 SMS/通话记录 BuildConfig 标志编译该 flavor，同时避免在每次 Android 相关推送时进行重复的 debug APK 打包任务。

`check-dependencies` 分片运行 `pnpm deadcode:dependencies`（使用最新 Knip 版本的生产 Knip 仅依赖通过，`dlx` 安装时禁用 pnpm 的最低发布年龄）和 `pnpm deadcode:unused-files`，后者将 Knip 的生产未使用文件发现与 `scripts/deadcode-unused-files.allowlist.mjs` 进行比较。当 PR 添加新的未审查的未使用文件或留下过时的允许列表条目时，未使用文件守卫失败，同时保留 Knip 无法静态解析的有意动态插件、生成的、构建的、实时测试的和包桥接面。

## ClawSweeper 活动转发

`.github/workflows/clawsweeper-dispatch.yml` 是从 OpenClaw 仓库活动到 ClawSweeper 的目标端桥接。它不检出或执行不受信任的拉取请求代码。工作流从 `CLAWSWEEPER_APP_PRIVATE_KEY` 创建 GitHub App 令牌，然后向 `openclaw/clawsweeper` 调度紧凑的 `repository_dispatch` 有效载荷。

工作流有四个通道：

- `clawsweeper_item` 用于精确的 issue 和拉取请求审查请求；
- `clawsweeper_comment` 用于 issue 评论中的显式 ClawSweeper 命令；
- `clawsweeper_commit_review` 用于 `main` 推送上的提交级审查请求；
- `github_activity` 用于 ClawSweeper 代理可能检查的一般 GitHub 活动。

`github_activity` 通道仅转发规范化的元数据：事件类型、操作、行为者、仓库、条目编号、URL、标题、状态，以及存在时评论或审查的简短摘录。它故意避免转发完整的 webhook 主体。`openclaw/clawsweeper` 中的接收工作流是 `.github/workflows/github-activity.yml`，它将规范化的事件发布到 ClawSweeper 代理的 OpenClaw Gateway hook 会话。

一般活动是观察，而非默认交付。ClawSweeper 代理在其提示词中接收 Discord 目标，仅在事件令人惊讶、可操作、有风险或具有运营价值时才应发布到 `#clawsweeper`。例行开启、编辑、机器人搅动、重复 webhook 噪音和正常审查流量应导致 `NO_REPLY`。

在此路径中，将 GitHub 标题、评论、正文、审查文本、分支名称和提交消息视为不受信任的数据。它们是用于摘要和分类的输入，而非工作流或代理运行时的指令。

## 手动调度

手动 CI 调度运行与普通 CI 相同的任务图，但强制开启所有非 Android 范围通道：Linux Node 分片、捆绑插件分片、频道合约、Node 22 兼容性、`check`、`check-additional`、构建冒烟测试、文档检查、Python 技能、Windows、macOS 和 Control UI i18n。独立的手动 CI 调度仅在 `include_android=true` 时运行 Android；完整发布总览通过传递 `include_android=true` 启用 Android。插件预发布静态检查、仅发布的 `agentic-plugins` 分片、完整扩展批次扫描和插件预发布 Docker 通道被排除在 CI 之外。Docker 预发布套件仅在 `Full Release Validation` 调度带有启用发布验证门控的单独 `Plugin Prerelease` 工作流时运行。

手动运行使用唯一的并发组，因此候选发布版本的完整套件不会被同一引用上的另一次推送或 PR 运行取消。可选的 `target_ref` 输入允许可信调用者对分支、标签或完整提交 SHA 运行该图，同时使用所选调度引用中的工作流文件。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 运行器

| 运行器                           | 任务                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`、快速安全任务和聚合（`security-scm-fast`、`security-dependency-audit`、`security-fast`）、快速协议/合约/捆绑检查、分片频道合约检查、`check` 分片（lint 除外）、`check-additional` 分片和聚合、Node 测试聚合验证器、文档检查、Python 技能、工作流健全性、标记器、自动响应；安装冒烟测试预检也使用 GitHub 托管的 Ubuntu，以便 Blacksmith 矩阵可以更早排队 |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`、较低权重的扩展分片、`checks-fast-core`、`checks-node-compat-node22`、`check-prod-types` 和 `check-test-types`                                                                                                                                                                                                                            |
| `blacksmith-8vcpu-ubuntu-2404`   | `build-artifacts`、构建冒烟测试、Linux Node 测试分片、捆绑插件测试分片、`android`                                                                                                                                                                                                                                                                                   |
| `blacksmith-16vcpu-ubuntu-2404`  | `check-lint`（CPU 敏感度足以使 8 个 vCPU 的成本超过节省的时间）；安装冒烟测试 Docker 构建（32 vCPU 队列时间成本超过节省的时间）                                                                                                                                                                                                                                     |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                    |
| `blacksmith-6vcpu-macos-latest`  | `openclaw/openclaw` 上的 `macos-node`；fork 回退到 `macos-latest`                                                                                                                                                                                                                                                                                                   |
| `blacksmith-12vcpu-macos-latest` | `openclaw/openclaw` 上的 `macos-swift`；fork 回退到 `macos-latest`                                                                                                                                                                                                                                                                                                  |

## 本地等效命令

```bash
pnpm changed:lanes                            # 检查 origin/main...HEAD 的本地已更改通道分类器
pnpm check:changed                            # 智能本地检查门控：按边界通道更改的类型检查/lint/守卫
pnpm check                                    # 快速本地门控：生产 tsgo + 分片 lint + 并行快速守卫
pnpm check:test-types
pnpm check:timed                              # 带每阶段计时的相同门控
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test                                     # vitest 测试
pnpm test:changed                             # 廉价的智能已更改 Vitest 目标
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs                               # 文档格式 + lint + 断链
pnpm build                                    # 当 CI 构件/构建冒烟通道重要时构建 dist
pnpm ci:timings                               # 汇总最新的 origin/main 推送 CI 运行
pnpm ci:timings:recent                        # 比较最近成功的主 CI 运行
node scripts/ci-run-timings.mjs <run-id>      # 汇总挂钟时间、队列时间和最慢任务
node scripts/ci-run-timings.mjs --latest-main # 忽略 issue/评论噪音，选择 origin/main 推送 CI
node scripts/ci-run-timings.mjs --recent 10   # 比较最近成功的主 CI 运行
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
pnpm perf:kova:summary --report .artifacts/kova/reports/mock-provider/report.json --output .artifacts/kova/summary.md
```

## OpenClaw 性能

`OpenClaw Performance` 是产品/运行时性能工作流。它每日在 `main` 上运行，也可以手动调度：

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_gpt54=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手动调度通常对工作流引用进行基准测试。设置 `target_ref` 以使用当前工作流实现对发布标签或另一个分支进行基准测试。发布的报告路径和最新指针以测试引用为键，每个 `index.md` 记录测试引用/SHA、工作流引用/SHA、Kova 引用、配置文件、通道认证模式、模型、重复次数和场景过滤器。

工作流从固定发布版本安装 OCM，并从 `openclaw/Kova` 在固定的 `kova_ref` 输入处安装 Kova，然后运行三个通道：

- `mock-provider`：针对具有确定性假 OpenAI 兼容认证的本地构建运行时的 Kova 诊断场景。
- `mock-deep-profile`：启动、网关和代理轮次热点的 CPU/堆/跟踪分析。
- `live-gpt54`：真实的 OpenAI `openai/gpt-5.4` 代理轮次，当 `OPENAI_API_KEY` 不可用时跳过。

模拟提供商通道在 Kova 通过之后还运行 OpenClaw 原生源探测：跨默认、hook 和 50 插件启动用例的网关启动计时和内存；针对已启动网关的重复模拟 OpenAI `channel-chat-baseline` hello 循环；以及针对已启动网关的 CLI 启动命令。源探测 Markdown 摘要位于报告包中的 `source/index.md`，原始 JSON 与之并列。

每个通道都上传 GitHub 构件。当配置了 `CLAWGRIT_REPORTS_TOKEN` 时，工作流还会将 `report.json`、`report.md`、包、`index.md` 和源探测构件提交到 `openclaw/clawgrit-reports` 下的 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`。当前测试引用指针写为 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整发布验证

`Full Release Validation` 是"在发布前运行所有内容"的手动总览工作流。它接受分支、标签或完整提交 SHA，使用该目标调度手动 `CI` 工作流，调度 `Plugin Prerelease` 以获取仅发布的插件/包/静态/Docker 证明，并调度 `OpenClaw Release Checks` 以获取安装冒烟测试、包验收、Docker 发布路径套件、实时/E2E、OpenWebUI、QA Lab 奇偶校验、Matrix 和 Telegram 通道。使用 `rerun_group=all` 和 `release_profile=full` 时，它还会针对发布检查中的 `release-package-under-test` 构件运行 `NPM Telegram Beta E2E`。发布后，传递 `npm_telegram_package_spec` 以针对已发布的 npm 包重新运行相同的 Telegram 包通道。

有关阶段矩阵、确切的工作流任务名称、配置文件差异、构件和集中重新运行句柄，请参阅[完整发布验证](/reference/full-release-validation)。

`OpenClaw Release Publish` 是手动变更发布工作流。在发布标签存在且 OpenClaw npm 预检成功后，从 `release/YYYY.M.D` 或 `main` 调度它。它验证 `pnpm plugins:sync:check`，为所有可发布的插件包调度 `Plugin NPM Release`，为相同的发布 SHA 调度 `Plugin ClawHub Release`，然后才使用保存的 `preflight_run_id` 调度 `OpenClaw NPM Release`。

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

对于快速移动分支上的固定提交证明，请使用辅助工具而非 `gh workflow run ... --ref main -f ref=<sha>`：

```bash
pnpm ci:full-release --sha <full-sha>
```

GitHub 工作流调度引用必须是分支或标签，而非原始提交 SHA。辅助工具在目标 SHA 处推送临时的 `release-ci/<sha>-...` 分支，从该固定引用调度 `Full Release Validation`，验证每个子工作流的 `headSha` 与目标匹配，并在运行完成时删除临时分支。总览验证器在任何子工作流在不同 SHA 处运行时也会失败。

`release_profile` 控制传入发布检查的实时/提供商广度。手动发布工作流默认为 `stable`；仅在故意需要广泛顾问提供商/媒体矩阵时才使用 `full`。

- `minimum` 保留最快的 OpenAI/核心发布关键通道。
- `stable` 添加稳定的提供商/后端集。
- `full` 运行广泛的顾问提供商/媒体矩阵。

总览记录已调度的子运行 ID，最终的 `Verify full validation` 任务重新检查当前子运行结论，并为每个子运行附加最慢任务表。如果子工作流重新运行并变为绿色，只需重新运行父验证器任务以刷新总览结果和计时摘要。

对于恢复，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。对候选发布版本使用 `all`，仅对普通完整 CI 子项使用 `ci`，仅对插件预发布子项使用 `plugin-prerelease`，对每个发布子项使用 `release-checks`，或对总览使用更窄的组：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。这使失败的发布箱在专注修复后的重新运行保持有界。

`OpenClaw Release Checks` 使用可信工作流引用将所选引用一次解析为 `release-package-under-test` 压缩包，然后将该构件传递给实时/E2E 发布路径 Docker 工作流和包验收分片。这使包字节在发布箱之间保持一致，并避免在多个子任务中重新打包相同的候选版本。

`ref=main` 和 `rerun_group=all` 的重复 `Full Release Validation` 运行会取代较旧的总览。父监视器在父项被取消时取消其已调度的任何子工作流，因此较新的主验证不会排在过时的两小时发布检查运行后面。发布分支/标签验证和集中重新运行组保持 `cancel-in-progress: false`。

## 实时和 E2E 分片

发布实时/E2E 子项保持广泛的原生 `pnpm test:live` 覆盖，但通过 `scripts/test-live-shard.mjs` 以命名分片的形式运行，而不是一个串行任务：

- `native-live-src-agents`
- `native-live-src-gateway-core`
- 提供商过滤的 `native-live-src-gateway-profiles` 任务
- `native-live-src-gateway-backends`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- 拆分的媒体音频/视频分片和提供商过滤的音乐分片

这在保持相同文件覆盖的同时，使缓慢的实时提供商失败更易于重新运行和诊断。聚合的 `native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名称对于手动一次性重新运行仍然有效。

原生实时媒体分片在 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04` 中运行，由 `Live Media Runner Image` 工作流构建。该镜像预安装了 `ffmpeg` 和 `ffprobe`；媒体任务在设置前仅验证这些二进制文件。将 Docker 支持的实时套件保留在普通 Blacksmith 运行器上——容器任务不是启动嵌套 Docker 测试的合适地方。

Docker 支持的实时模型/后端分片使用每个所选提交的单独共享 `ghcr.io/openclaw/openclaw-live-test:<sha>` 镜像。实时发布工作流构建并推送该镜像一次，然后 Docker 实时模型、提供商分片网关、CLI 后端、ACP 绑定和 Codex 工具套件分片使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行。网关 Docker 分片在工作流任务超时以下携带明确的脚本级 `timeout` 上限，以便卡住的容器或清理路径快速失败而不消耗整个发布检查预算。如果这些分片独立重建完整的源 Docker 目标，则发布运行配置错误，将在重复图像构建上浪费挂钟时间。

## 包验收

当问题是"这个可安装的 OpenClaw 包是否作为产品正常工作？"时，请使用 `Package Acceptance`。它与普通 CI 不同：普通 CI 验证源树，而包验收通过用户在安装或更新后执行的相同 Docker E2E 工具套件验证单个压缩包。

### 任务

1. `resolve_package` 检出 `workflow_ref`，解析一个包候选，写入 `.artifacts/docker-e2e-package/openclaw-current.tgz`，写入 `.artifacts/docker-e2e-package/package-candidate.json`，将两者作为 `package-under-test` 构件上传，并在 GitHub 步骤摘要中打印源、工作流引用、包引用、版本、SHA-256 和配置文件。
2. `docker_acceptance` 使用 `ref=workflow_ref` 和 `package_artifact_name=package-under-test` 调用 `openclaw-live-and-e2e-checks-reusable.yml`。可复用工作流下载该构件，验证压缩包清单，在需要时准备包摘要 Docker 镜像，并针对该包而非打包工作流检出运行所选 Docker 通道。当配置文件选择多个目标 `docker_lanes` 时，可复用工作流准备包和共享镜像一次，然后将这些通道作为具有唯一构件的并行目标 Docker 任务展开。
3. `package_telegram` 可选地调用 `NPM Telegram Beta E2E`。当 `telegram_mode` 不为 `none` 时运行，并在包验收解析了一个 `package-under-test` 构件时安装该构件；独立 Telegram 调度仍然可以安装已发布的 npm 规格。
4. `summary` 在包解析、Docker 验收或可选 Telegram 通道失败时使工作流失败。

### 候选来源

- `source=npm` 仅接受 `openclaw@beta`、`openclaw@latest` 或确切的 OpenClaw 发布版本，例如 `openclaw@2026.4.27-beta.2`。用于已发布的预发布/稳定验收。
- `source=ref` 打包可信的 `package_ref` 分支、标签或完整提交 SHA。解析器获取 OpenClaw 分支/标签，验证所选提交可从仓库分支历史或发布标签访问，在分离的工作树中安装依赖项，并使用 `scripts/package-openclaw-for-docker.mjs` 打包。
- `source=url` 下载 HTTPS `.tgz`；`package_sha256` 是必需的。
- `source=artifact` 从 `artifact_run_id` 和 `artifact_name` 下载一个 `.tgz`；`package_sha256` 是可选的，但对于外部共享的构件应该提供。

保持 `workflow_ref` 和 `package_ref` 分离。`workflow_ref` 是运行测试的可信工作流/工具套件代码。`package_ref` 是在 `source=ref` 时打包的源提交。这让当前测试工具套件验证旧的可信源提交，而不运行旧的工作流逻辑。

### 套件配置文件

- `smoke` — `npm-onboard-channel-agent`、`gateway-network`、`config-reload`
- `package` — `npm-onboard-channel-agent`、`doctor-switch`、`update-channel-switch`、`upgrade-survivor`、`published-upgrade-survivor`、`plugins-offline`、`plugin-update`
- `product` — `package` 加 `mcp-channels`、`cron-mcp-cleanup`、`openai-web-search-minimal`、`openwebui`
- `full` — 带 OpenWebUI 的完整 Docker 发布路径块
- `custom` — 确切的 `docker_lanes`；`suite_profile=custom` 时必需

`package` 配置文件使用离线插件覆盖，因此已发布包的验证不依赖于实时 ClawHub 可用性。可选的 Telegram 通道在 `NPM Telegram Beta E2E` 中重用 `package-under-test` 构件，独立调度的已发布 npm 规格路径保留用于独立调度。

有关专用更新和插件测试策略，包括本地命令、Docker 通道、包验收输入、发布默认值和失败分类，请参阅[测试更新和插件](/help/testing-updates-plugins)。

发布检查使用 `source=artifact`、准备好的发布包构件、`suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch upgrade-survivor published-upgrade-survivor plugins-offline plugin-update'`、`published_upgrade_survivor_baselines=all-since-2026.4.23`、`published_upgrade_survivor_scenarios=reported-issues` 和 `telegram_mode=mock-openai` 调用包验收。这将包迁移、更新、陈旧插件依赖项清理、已配置插件安装修复、离线插件、插件更新和 Telegram 证明保持在同一个已解析包压缩包上。在 Full Release Validation 或 OpenClaw Release Checks 上设置 `package_acceptance_package_spec`，以针对已发布的 npm 包而非 SHA 构建的构件运行相同的矩阵。跨 OS 发布检查仍然覆盖 OS 特定的引导、安装程序和平台行为；包/更新产品验证应从包验收开始。`published-upgrade-survivor` Docker 通道每次运行验证一个已发布的包基准。在包验收中，解析的 `package-under-test` 压缩包始终是候选版本，`published_upgrade_survivor_baseline` 选择回退已发布基准，默认为 `openclaw@latest`；失败通道重新运行命令保留该基准。设置 `published_upgrade_survivor_baselines=all-since-2026.4.23` 以将完整发布 CI 扩展到从 `2026.4.23` 到 `latest` 的每个稳定 npm 发布；`release-history` 仍然可用于使用旧的预日期锚点进行手动更广泛的采样。设置 `published_upgrade_survivor_scenarios=reported-issues` 以将相同基准扩展到 Feishu 配置、保留的引导/角色文件、已配置 OpenClaw 插件安装、波浪号日志路径和陈旧遗留插件依赖项根的 issue 形状夹具。单独的 `Update Migration` 工作流在问题是详尽的已发布更新清理而非普通完整发布 CI 广度时，使用 `update-migration` Docker 通道与 `all-since-2026.4.23` 和 `plugin-deps-cleanup`。本地聚合运行可以使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 传递确切的包规格，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`（例如 `openclaw@2026.4.15`）保留单个通道，或为场景矩阵设置 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`。已发布通道使用烘焙的 `openclaw config set` 命令配方配置基准，在 `summary.json` 中记录配方步骤，并在网关启动后探测 `/healthz`、`/readyz` 和 RPC 状态。Windows 打包和安装程序全新通道还验证已安装的包可以从原始绝对 Windows 路径导入浏览器控制覆盖。跨 OS 代理轮次冒烟测试的 OpenAI 默认使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`（如果设置），否则使用 `openai/gpt-5.4`，因此安装和网关证明保持在 GPT-5 测试模型上，同时避免 GPT-4.x 默认值。

### 遗留兼容性窗口

包验收对已发布的包有有界的遗留兼容性窗口。通过 `2026.4.25`（包括 `2026.4.25-beta.*`）的包可以使用兼容路径：

- `dist/postinstall-inventory.json` 中已知的私有 QA 条目可能指向压缩包省略的文件；
- 当包不公开该标志时，`doctor-switch` 可能跳过 `gateway install --wrapper` 持久性子情况；
- `update-channel-switch` 可能从压缩包派生的假 git 夹具中删除缺少的 `pnpm.patchedDependencies`，并可能记录缺少的持久化 `update.channel`；
- 插件冒烟测试可能读取遗留安装记录位置或接受缺少的市场安装记录持久性；
- `plugin-update` 可能在仍然要求安装记录和无重新安装行为保持不变的情况下允许配置元数据迁移。

已发布的 `2026.4.26` 包也可能对已经发布的本地构建元数据印章文件发出警告。后续包必须满足现代合约；相同的条件失败而不是警告或跳过。

### 示例

```bash
# 使用产品级覆盖验证当前 beta 包。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai

# 使用当前工具套件打包并验证发布分支。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=ref \
  -f package_ref=release/YYYY.M.D \
  -f suite_profile=package \
  -f telegram_mode=mock-openai

# 验证压缩包 URL。source=url 时 SHA-256 是必需的。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=url \
  -f package_url=https://example.com/openclaw-current.tgz \
  -f package_sha256=<64-char-sha256> \
  -f suite_profile=smoke

# 重用另一个 Actions 运行上传的压缩包。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=package-under-test \
  -f suite_profile=custom \
  -f docker_lanes='install-e2e plugin-update'
```

调试失败的包验收运行时，请从 `resolve_package` 摘要开始确认包源、版本和 SHA-256。然后检查 `docker_acceptance` 子运行及其 Docker 构件：`.artifacts/docker-tests/**/summary.json`、`failures.json`、通道日志、阶段计时和重新运行命令。优先重新运行失败的包配置文件或确切的 Docker 通道，而不是重新运行完整发布验证。

## 安装冒烟测试

单独的 `Install Smoke` 工作流通过其自己的 `preflight` 任务重用相同的范围脚本。它将冒烟覆盖拆分为 `run_fast_install_smoke` 和 `run_full_install_smoke`。

- **快速路径**适用于触及 Docker/包面、捆绑插件包/清单更改或 Docker 冒烟任务练习的核心插件/频道/网关/插件 SDK 面的拉取请求。仅源捆绑插件更改、纯测试编辑和仅文档编辑不保留 Docker 工作器。快速路径构建一次根 Dockerfile 镜像，检查 CLI，运行代理删除共享工作区 CLI 冒烟测试，运行容器网关网络 e2e，验证捆绑扩展构建参数，并在 240 秒聚合命令超时（每个场景的 Docker 运行单独封顶）下运行有界的捆绑插件 Docker 配置文件。
- **完整路径**为每夜计划运行、手动调度、工作流调用发布检查和真正触及安装程序/包/Docker 面的拉取请求保留 QR 包安装和安装程序 Docker/更新覆盖。在完整模式下，安装冒烟测试准备或重用一个目标 SHA GHCR 根 Dockerfile 冒烟镜像，然后将 QR 包安装、根 Dockerfile/网关冒烟测试、安装程序/更新冒烟测试和快速捆绑插件 Docker E2E 作为单独的任务运行，以便安装程序工作不必等待根镜像冒烟测试。

`main` 推送（包括合并提交）不强制执行完整路径；当更改范围逻辑将在推送时请求完整覆盖时，工作流保留快速 Docker 冒烟测试，并将完整安装冒烟测试留给每夜或发布验证。

慢速 Bun 全局安装镜像提供商冒烟测试由 `run_bun_global_install_smoke` 单独控制。它在每夜计划和发布检查工作流上运行，手动 `Install Smoke` 调度可以选择加入，但拉取请求和 `main` 推送不会。QR 和安装程序 Docker 测试保留其自己的安装专用 Dockerfile。

## 本地 Docker E2E

`pnpm test:docker:all` 预构建一个共享实时测试镜像，将 OpenClaw 一次打包为 npm 压缩包，并构建两个共享的 `scripts/e2e/Dockerfile` 镜像：

- 用于安装程序/更新/插件依赖项通道的裸 Node/Git 运行器；
- 将相同压缩包安装到 `/app` 中用于普通功能通道的功能镜像。

Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`，规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`，运行器仅执行所选计划。调度器使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 按通道选择镜像，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行通道。

### 可调参数

| 变量                                   | 默认值  | 用途                                                                          |
| -------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 普通通道的主池槽数。                                                          |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 提供商敏感尾部池槽数。                                                        |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 并发实时通道上限，以防提供商限流。                                            |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10      | 并发 npm 安装通道上限。                                                       |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 并发多服务通道上限。                                                          |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 通道启动之间的错开时间，以避免 Docker 守护程序创建风暴；设置 `0` 表示不错开。 |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每通道回退超时（120 分钟）；所选实时/尾部通道使用更严格的上限。               |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | 未设置  | `1` 打印调度器计划而不运行通道。                                              |
| `OPENCLAW_DOCKER_ALL_LANES`            | 未设置  | 逗号分隔的确切通道列表；跳过清理冒烟测试，以便代理可以重现一个失败通道。      |

重于有效上限的通道仍然可以从空池中启动，然后独自运行，直到释放容量。本地聚合预检 Docker，移除陈旧的 OpenClaw E2E 容器，发出活动通道状态，持久化通道计时以进行最长优先排序，并在第一次失败后默认停止调度新的池化通道。

### 可复用实时/E2E 工作流

可复用实时/E2E 工作流询问 `scripts/test-docker-all.mjs --plan-json` 需要哪个包、镜像类型、实时镜像、通道和凭证覆盖。`scripts/docker-e2e.mjs` 然后将该计划转换为 GitHub 输出和摘要。它通过 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw，下载当前运行包构件，或从 `package_artifact_run_id` 下载包构件；验证压缩包清单；在计划需要包安装通道时通过 Blacksmith 的 Docker 层缓存构建并推送包摘要标记的裸/功能 GHCR Docker E2E 镜像；并重用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 输入或现有的包摘要镜像而不重建。Docker 镜像拉取以有界的每次尝试 180 秒超时重试，因此卡住的注册表/缓存流会快速重试而不消耗大部分 CI 关键路径。

### 发布路径块

发布 Docker 覆盖使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行较小的分块任务，以便每个块只拉取它需要的镜像类型，并通过相同的加权调度器执行多个通道：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

当前发布 Docker 块是 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services` 和 `plugins-runtime-install-a` 到 `plugins-runtime-install-h`。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 保留为聚合插件/运行时别名。`install-e2e` 通道别名保留为两个提供商安装程序通道的聚合手动重新运行别名。

当完整发布路径覆盖请求时，OpenWebUI 被折叠进 `plugins-runtime-services`，并且仅对仅 OpenWebUI 的调度保留独立的 `openwebui` 块。捆绑频道更新通道对暂时性 npm 网络失败重试一次。

每个块都上传带有通道日志、计时、`summary.json`、`failures.json`、阶段计时、调度器计划 JSON、慢通道表和每通道重新运行命令的 `.artifacts/docker-tests/`。工作流 `docker_lanes` 输入针对准备好的镜像运行所选通道而不是块任务，这将失败通道调试限制在一个目标 Docker 任务，并为该运行准备、下载或重用包构件；如果所选通道是实时 Docker 通道，目标任务会为该重新运行在本地构建实时测试镜像。生成的每通道 GitHub 重新运行命令在这些值存在时包含 `package_artifact_run_id`、`package_artifact_name` 和准备好的镜像输入，因此失败通道可以重用失败运行中的确切包和镜像。

```bash
pnpm test:docker:rerun <run-id>      # 下载 Docker 构件并打印组合/每通道目标重新运行命令
pnpm test:docker:timings <summary>   # 慢通道和阶段关键路径摘要
```

计划的实时/E2E 工作流每日运行完整发布路径 Docker 套件。

## 插件预发布

`Plugin Prerelease` 是更昂贵的产品/包覆盖，因此它是由 `Full Release Validation` 或显式操作员调度的单独工作流。普通拉取请求、`main` 推送和独立手动 CI 调度保持该套件关闭。它在八个扩展工作器之间平衡捆绑插件测试；这些扩展分片任务一次运行最多两个插件配置组，每组一个 Vitest 工作器和更大的 Node 堆，以防止导入密集的插件批次创建额外的 CI 任务。仅发布的 Docker 预发布路径将目标 Docker 通道分批成小组，以避免为一到三分钟的任务保留数十个运行器。

## QA Lab

QA Lab 在主智能范围工作流之外有专用的 CI 通道。代理奇偶校验嵌套在广泛的 QA 和发布工具套件下，而不是独立的 PR 工作流。在奇偶校验应该伴随广泛验证运行时，使用带 `rerun_group=qa-parity` 的 `Full Release Validation`。

- `QA-Lab - All Lanes` 工作流每夜在 `main` 上运行以及手动调度时运行；它将模拟奇偶校验通道、实时 Matrix 通道和实时 Telegram 与 Discord 通道展开为并行任务。实时任务使用 `qa-live-shared` 环境，Telegram/Discord 使用 Convex 租约。

发布检查使用确定性模拟提供商和模拟限定模型（`mock-openai/gpt-5.5` 和 `mock-openai/gpt-5.5-alt`）运行 Matrix 和 Telegram 实时传输通道，以便频道合约与实时模型延迟和普通提供商插件启动隔离。实时传输网关禁用内存搜索，因为 QA 奇偶校验单独覆盖内存行为；提供商连接性由单独的实时模型、原生提供商和 Docker 提供商套件覆盖。

Matrix 对计划和发布门控使用 `--profile fast`，仅当检出的 CLI 支持时添加 `--fail-fast`。CLI 默认值和手动工作流输入保持为 `all`；手动 `matrix_profile=all` 调度始终将完整 Matrix 覆盖分片为 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 任务。

`OpenClaw Release Checks` 还在发布批准前运行发布关键的 QA Lab 通道；其 QA 奇偶校验门控将候选版本和基准包作为并行通道任务运行，然后将两个构件下载到最终奇偶校验比较的小报告任务中。

对于普通 PR，请遵循范围 CI/检查证据，而不是将奇偶校验视为必需状态。

## CodeQL

`CodeQL` 工作流故意是一个窄的第一遍安全扫描器，而非完整的仓库扫描。每日、手动和非草稿拉取请求守卫运行使用过滤到高/关键 `security-severity` 的高置信度安全查询扫描 Actions 工作流代码加上最高风险的 JavaScript/TypeScript 面。

拉取请求守卫保持轻量：它仅对 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages` 或 `src` 下的更改启动，并运行与计划工作流相同的高置信度安全矩阵。Android 和 macOS CodeQL 保留在 PR 默认之外。

### 安全类别

| 类别                                              | 面                                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | 认证、密钥、沙箱、cron 和网关基准                                           |
| `/codeql-security-high/channel-runtime-boundary`  | 核心频道实现合约加上频道插件运行时、网关、插件 SDK、密钥、审计接触点        |
| `/codeql-security-high/network-ssrf-boundary`     | 核心 SSRF、IP 解析、网络守卫、网络获取和插件 SDK SSRF 策略面                |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP 服务器、进程执行辅助工具、出站交付和代理工具执行门控                    |
| `/codeql-security-high/plugin-trust-boundary`     | 插件安装、加载器、清单、注册表、包管理器安装、源加载和插件 SDK 包合约信任面 |

### 平台特定安全分片

- `CodeQL Android Critical Security` — 计划的 Android 安全分片。在工作流健全性接受的最小 Blacksmith Linux 运行器上手动为 CodeQL 构建 Android 应用。上传到 `/codeql-critical-security/android`。
- `CodeQL macOS Critical Security` — 每周/手动 macOS 安全分片。在 Blacksmith macOS 上手动为 CodeQL 构建 macOS 应用，从上传的 SARIF 中过滤依赖项构建结果，并上传到 `/codeql-critical-security/macos`。保留在每日默认之外，因为即使在干净的情况下，macOS 构建也会占据主要运行时间。

### 关键质量类别

`CodeQL Critical Quality` 是匹配的非安全分片。它仅在较小的 Blacksmith Linux 运行器上针对窄高价值面运行仅错误严重级别的非安全 JavaScript/TypeScript 质量查询。其拉取请求守卫故意小于计划配置文件：非草稿 PR 仅对代理命令/模型/工具执行和回复调度代码、配置模式/迁移/IO 代码、认证/密钥/沙箱/安全代码、核心频道和捆绑频道插件运行时、网关协议/服务器方法、内存运行时/SDK 粘合剂、MCP/进程/出站交付、提供商运行时/模型目录、会话诊断/交付队列、插件加载器、插件 SDK/包合约或插件 SDK 回复运行时更改运行匹配的 `agent-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`channel-runtime-boundary`、`gateway-runtime-boundary`、`memory-runtime-boundary`、`mcp-process-runtime-boundary`、`provider-runtime-boundary`、`session-diagnostics-boundary`、`plugin-boundary`、`plugin-sdk-package-contract` 和 `plugin-sdk-reply-runtime` 分片。CodeQL 配置和质量工作流更改运行所有十二个 PR 质量分片。

手动调度接受：

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

窄配置文件是用于隔离运行一个质量分片的教学/迭代挂钩。

| 类别                                                    | 面                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/codeql-critical-quality/core-auth-secrets`            | 认证、密钥、沙箱、cron 和网关安全边界代码                                                              |
| `/codeql-critical-quality/config-boundary`              | 配置模式、迁移、规范化和 IO 合约                                                                       |
| `/codeql-critical-quality/gateway-runtime-boundary`     | 网关协议模式和服务器方法合约                                                                           |
| `/codeql-critical-quality/channel-runtime-boundary`     | 核心频道和捆绑频道插件实现合约                                                                         |
| `/codeql-critical-quality/agent-runtime-boundary`       | 命令执行、模型/提供商调度、自动回复调度和队列，以及 ACP 控制平面运行时合约                             |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP 服务器和工具桥接、进程监督辅助工具和出站交付合约                                                   |
| `/codeql-critical-quality/memory-runtime-boundary`      | 内存主机 SDK、内存运行时外观、内存插件 SDK 别名、内存运行时激活粘合剂和内存医生命令                    |
| `/codeql-critical-quality/session-diagnostics-boundary` | 回复队列内部、会话交付队列、出站会话绑定/交付辅助工具、诊断事件/日志包面和会话医生 CLI 合约            |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | 插件 SDK 入站回复调度、回复有效载荷/分块/运行时辅助工具、频道回复选项、交付队列和会话/线程绑定辅助工具 |
| `/codeql-critical-quality/provider-runtime-boundary`    | 模型目录规范化、提供商认证和发现、提供商运行时注册、提供商默认值/目录，以及网络/搜索/获取/嵌入注册表   |
| `/codeql-critical-quality/ui-control-plane`             | Control UI 引导、本地持久化、网关控制流和任务控制平面运行时合约                                        |
| `/codeql-critical-quality/web-media-runtime-boundary`   | 核心网络获取/搜索、媒体 IO、媒体理解、图像生成和媒体生成运行时合约                                     |
| `/codeql-critical-quality/plugin-boundary`              | 加载器、注册表、公共面和插件 SDK 入口点合约                                                            |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | 已发布的包端插件 SDK 源和插件包合约辅助工具                                                            |

质量与安全分离，以便可以安排、测量、禁用或扩展质量发现，而不会掩盖安全信号。Swift、Python 和捆绑插件 CodeQL 扩展应在窄配置文件具有稳定运行时和信号后，仅作为范围或分片后续工作添加回来。

## 维护工作流

### 文档代理

`Docs Agent` 工作流是一个事件驱动的 Codex 维护通道，用于保持现有文档与最近落地的更改一致。它没有纯计划：`main` 上成功的非机器人推送 CI 运行可以触发它，手动调度可以直接运行它。当 `main` 已经向前推进或在最后一小时内创建了另一个非跳过的文档代理运行时，工作流运行调用会跳过。运行时，它审查从前一个非跳过文档代理源 SHA 到当前 `main` 的提交范围，因此一次每小时运行可以覆盖自上次文档通过以来积累的所有主要更改。

### 测试性能代理

`Test Performance Agent` 工作流是一个用于慢测试的事件驱动 Codex 维护通道。它没有纯计划：`main` 上成功的非机器人推送 CI 运行可以触发它，但如果另一个工作流运行调用已经在当天 UTC 运行或正在运行，它会跳过。手动调度绕过该每日活动门控。该通道构建完整套件分组的 Vitest 性能报告，让 Codex 仅进行小型覆盖保留的测试性能修复而不是广泛的重构，然后重新运行完整套件报告，并拒绝降低通过基准测试数量的更改。如果基准有失败的测试，Codex 可能仅修复明显的失败，并且代理后完整套件报告在提交任何内容之前必须通过。当 `main` 在机器人推送落地前推进时，该通道变基验证的补丁，重新运行 `pnpm check:changed`，并重试推送；冲突的陈旧补丁被跳过。它使用 GitHub 托管的 Ubuntu，以便 Codex 操作可以保持与文档代理相同的去掉 sudo 安全姿势。

### 合并后重复 PR

`Duplicate PRs After Merge` 工作流是一个用于落地后重复清理的手动维护者工作流。它默认为干运行，仅在 `apply=true` 时关闭明确列出的 PR。在变更 GitHub 之前，它验证已落地的 PR 已合并，并且每个重复 PR 要么有共享引用的 issue，要么有重叠的更改块。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 本地检查门控和更改路由

本地更改通道逻辑位于 `scripts/changed-lanes.mjs` 中，由 `scripts/check-changed.mjs` 执行。该本地检查门控比广泛的 CI 平台范围对架构边界更严格：

- 核心生产更改运行核心生产和核心测试类型检查加上核心 lint/守卫；
- 仅核心测试更改仅运行核心测试类型检查加上核心 lint；
- 扩展生产更改运行扩展生产和扩展测试类型检查加上扩展 lint；
- 仅扩展测试更改运行扩展测试类型检查加上扩展 lint；
- 公共插件 SDK 或插件合约更改扩展到扩展类型检查，因为扩展依赖于这些核心合约（Vitest 扩展扫描保持为显式测试工作）；
- 仅发布元数据版本升级运行目标版本/配置/根依赖项检查；
- 未知根/配置更改安全回退到所有检查通道。

本地更改测试路由位于 `scripts/test-projects.test-support.mjs` 中，故意比 `check:changed` 更廉价：直接测试编辑运行自身，源编辑优先使用显式映射，然后是兄弟测试和导入图依赖项。共享群组房间交付配置是显式映射之一：对群组可见回复配置、源回复交付模式或消息工具系统提示词的更改通过核心回复测试加上 Discord 和 Slack 交付回归路由，以便共享默认更改在第一次 PR 推送前失败。仅当更改足够广泛以至于廉价映射集不是可信代理时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## Testbox 验证

从仓库根运行 Testbox，并为广泛证明选择新鲜的预热箱。在将慢速门控花在被重用、已过期或刚报告了意外大型同步的箱上之前，首先在箱内运行 `pnpm testbox:sanity`。

健全性检查在所需的根文件（如 `pnpm-lock.yaml`）消失或 `git status --short` 显示至少 200 个跟踪删除时快速失败。这通常意味着远程同步状态不是 PR 的可信副本；停止该箱并预热一个新的箱，而不是调试产品测试失败。对于有意的大型删除 PR，为该健全性运行设置 `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1`。

`pnpm testbox:run` 还终止在同步阶段停留超过五分钟而没有后同步输出的本地 Blacksmith CLI 调用。设置 `OPENCLAW_TESTBOX_SYNC_TIMEOUT_MS=0` 以禁用该守卫，或对异常大的本地差异使用更大的毫秒值。

Crabbox 是用于维护者 Linux 证明的仓库自有远程箱包装器。当检查对于本地编辑循环来说太广泛、CI 奇偶校验重要时，或者证明需要密钥、Docker、包通道、可重用箱或远程日志时，请使用它。普通 OpenClaw 后端是 `blacksmith-testbox`；拥有的 AWS/Hetzner 容量是 Blacksmith 中断、配额问题或显式拥有容量测试的回退。

首次运行前，从仓库根检查包装器：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

仓库包装器拒绝不宣传 `blacksmith-testbox` 的陈旧 Crabbox 二进制文件。即使 `.crabbox.yaml` 有拥有云默认值，也要显式传递提供商。

更改门控：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
```

集中测试重新运行：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm test <path-or-filter>"
```

完整套件：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm test"
```

阅读最终 JSON 摘要。有用的字段是 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。一次性 Blacksmith 支持的 Crabbox 运行应该自动停止 Testbox；如果运行被中断或清理不清楚，检查实时箱并只停止你创建的箱：

```bash
blacksmith testbox list
blacksmith testbox stop --id <tbx_id>
```

仅在故意需要在同一个水化箱上运行多个命令时才使用重用：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

如果 Crabbox 是损坏的层但 Blacksmith 本身有效，则使用直接 Blacksmith 作为窄回退：

```bash
blacksmith testbox warmup ci-check-testbox.yml --ref main --idle-timeout 90
blacksmith testbox run --id <tbx_id> "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
blacksmith testbox stop --id <tbx_id>
```

仅在 Blacksmith 宕机、配额受限、缺少所需环境或拥有容量明确是目标时，才升级到拥有的 Crabbox 容量：

```bash
pnpm crabbox:warmup -- --provider aws --class beast --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

`.crabbox.yaml` 拥有拥有云通道的提供商、同步和 GitHub Actions 水化默认值。它排除本地 `.git`，以便水化的 Actions 检出保留其自己的远程 Git 元数据，而不是同步维护者本地远程和对象存储，并且排除不应该传输的本地运行时/构建构件。`.github/workflows/crabbox-hydrate.yml` 拥有检出、Node/pnpm 设置、`origin/main` 获取和拥有云 `crabbox run --id <cbx_id>` 命令的非密钥环境交接。

## 相关

- [安装概览](/install)
- [开发频道](/install/development-channels)
