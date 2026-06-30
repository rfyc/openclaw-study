---
summary: "完整发布验证阶段、子工作流、发布配置文件、重新运行句柄和证据"
title: "完整发布验证"
read_when:
  - 运行或重新运行完整发布验证时
  - 比较稳定版和完整版发布验证配置文件时
  - 调试发布验证阶段失败时
---

`Full Release Validation` 是发布总括工作流。它是预发布证明的单一手动入口点，但大多数工作发生在子工作流中，因此一个失败的箱子可以重新运行而无需重启整个发布。

从受信任的工作流 ref（通常是 `main`）运行它，并将发布分支、标签或完整提交 SHA 作为 `ref` 传递：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable
```

子工作流使用受信任的工作流 ref 作为工具，使用输入 `ref` 作为被测候选版本。这使得在验证旧的发布分支或标签时，新的验证逻辑仍然可用。

包验收通常从解析的 `ref` 构建候选压缩包，包括使用 `pnpm ci:full-release` 分派的完整 SHA 运行。发布后，传递 `package_acceptance_package_spec=openclaw@YYYY.M.D`（或 `openclaw@beta`/`openclaw@latest`）以针对已发布的 npm 包运行相同的包/更新矩阵。

## 顶级阶段

| 阶段             | 详情                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 目标解析         | **任务：** `Resolve target ref`<br />**子工作流：** 无<br />**证明：** 解析发布分支、标签或完整提交 SHA 并记录所选输入。<br />**重新运行：** 如果失败，重新运行总括工作流。                                                                                                                                                                |
| Vitest 和正常 CI | **任务：** `Run normal full CI`<br />**子工作流：** `CI`<br />**证明：** 针对目标 ref 的手动完整 CI 图，包括 Linux Node 通道、捆绑插件分片、通道合约、Node 22 兼容性、`check`、`check-additional`、构建烟雾测试、文档检查、Python 技能、Windows、macOS、控制 UI i18n 和 Android（通过总括工作流）。<br />**重新运行：** `rerun_group=ci`。 |
| 插件预发布       | **任务：** `Run plugin prerelease validation`<br />**子工作流：** `Plugin Prerelease`<br />**证明：** 仅发布插件的静态检查、智能体插件覆盖、完整扩展批量分片和插件预发布 Docker 通道。<br />**重新运行：** `rerun_group=plugin-prerelease`。                                                                                               |
| 发布检查         | **任务：** `Run release/live/Docker/QA validation`<br />**子工作流：** `OpenClaw Release Checks`<br />**证明：** 安装烟雾测试、跨操作系统包检查、实时/E2E 套件、Docker 发布路径块、包验收、QA Lab 奇偶校验、实时 Matrix 和实时 Telegram。<br />**重新运行：** `rerun_group=release-checks` 或更窄的发布检查句柄。                          |
| 包工件           | **任务：** `Prepare release package artifact`<br />**子工作流：** 无<br />**证明：** 足够早地创建父级 `release-package-under-test` 压缩包，以供不需要等待 `OpenClaw Release Checks` 的面向包的检查使用。<br />**重新运行：** 重新运行总括工作流或提供 `npm_telegram_package_spec` 用于 `rerun_group=npm-telegram`。                        |
| 包 Telegram      | **任务：** `Run package Telegram E2E`<br />**子工作流：** `NPM Telegram Beta E2E`<br />**证明：** 使用 `release_profile=full` 和 `rerun_group=all` 时的父工件支持 Telegram 包证明，或在设置 `npm_telegram_package_spec` 时的已发布包 Telegram 证明。<br />**重新运行：** `rerun_group=npm-telegram` 和 `npm_telegram_package_spec`。       |
| 总括验证器       | **任务：** `Verify full validation`<br />**子工作流：** 无<br />**证明：** 重新检查记录的子运行结论并附加子工作流中最慢任务表。<br />**重新运行：** 在将失败的子级重新运行为绿色后，仅重新运行此任务。                                                                                                                                     |

对于 `ref=main` 和 `rerun_group=all`，较新的总括工作流会取代较旧的。当父级被取消时，其监控器会取消它已分派的所有子工作流。发布分支和标签验证运行默认情况下不会相互取消。

## 发布检查阶段

`OpenClaw Release Checks` 是最大的子工作流。它解析目标一次，并在面向包或 Docker 的阶段需要时准备共享的 `release-package-under-test` 工件。

| 阶段             | 详情                                                                                                                                                                                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 发布目标         | **任务：** `Resolve target ref`<br />**支持工作流：** 无<br />**测试：** 所选 ref、可选的预期 SHA、配置文件、重新运行组和专项实时套件过滤器。<br />**重新运行：** `rerun_group=release-checks`。                                                                                                                                            |
| 包工件           | **任务：** `Prepare release package artifact`<br />**支持工作流：** 无<br />**测试：** 打包或解析一个候选压缩包并上传 `release-package-under-test` 供下游面向包的检查使用。<br />**重新运行：** 受影响的包、跨操作系统或实时/E2E 组。                                                                                                       |
| 安装烟雾测试     | **任务：** `Run install smoke`<br />**支持工作流：** `Install Smoke`<br />**测试：** 具有根 Dockerfile 烟雾镜像重用的完整安装路径、QR 包安装、根和网关 Docker 烟雾、安装程序 Docker 测试、Bun 全局安装镜像提供商烟雾以及快速捆绑插件安装/卸载 E2E。<br />**重新运行：** `rerun_group=install-smoke`。                                       |
| 跨操作系统       | **任务：** `cross_os_release_checks`<br />**支持工作流：** `OpenClaw Cross-OS Release Checks (Reusable)`<br />**测试：** 针对所选提供商和模式在 Linux、Windows 和 macOS 上使用候选压缩包加基线包的全新安装和升级通道。<br />**重新运行：** `rerun_group=cross-os`。                                                                         |
| 仓库和实时 E2E   | **任务：** `Run repo/live E2E validation`<br />**支持工作流：** `OpenClaw Live And E2E Checks (Reusable)`<br />**测试：** 仓库 E2E、实时缓存、OpenAI WebSocket 流、原生实时提供商和插件分片，以及由 `release_profile` 选择的 Docker 支持的实时模型/后端/网关工具。<br />**重新运行：** `rerun_group=live-e2e`，可选加 `live_suite_filter`。 |
| Docker 发布路径  | **任务：** `Run Docker release-path validation`<br />**支持工作流：** `OpenClaw Live And E2E Checks (Reusable)`<br />**测试：** 针对共享包工件的发布路径 Docker 块。<br />**重新运行：** `rerun_group=live-e2e`。                                                                                                                           |
| 包验收           | **任务：** `Run package acceptance`<br />**支持工作流：** `Package Acceptance`<br />**测试：** 离线插件包夹具、插件更新、模拟 OpenAI Telegram 包验收，以及对同一压缩包的每个在 `2026.4.23` 或之后的稳定 npm 发布的已发布升级幸存者检查。<br />**重新运行：** `rerun_group=package`。                                                        |
| QA 奇偶校验      | **任务：** `Run QA Lab parity lane` 和 `Run QA Lab parity report`<br />**支持工作流：** 直接任务<br />**测试：** 候选和基线智能体奇偶校验包，然后是奇偶校验报告。<br />**重新运行：** `rerun_group=qa-parity` 或 `rerun_group=qa`。                                                                                                         |
| QA 实时 Matrix   | **任务：** `Run QA Lab live Matrix lane`<br />**支持工作流：** 直接任务<br />**测试：** 在 `qa-live-shared` 环境中的快速实时 Matrix QA 配置文件。<br />**重新运行：** `rerun_group=qa-live` 或 `rerun_group=qa`。                                                                                                                           |
| QA 实时 Telegram | **任务：** `Run QA Lab live Telegram lane`<br />**支持工作流：** 直接任务<br />**测试：** 使用 Convex CI 凭据租约的实时 Telegram QA。<br />**重新运行：** `rerun_group=qa-live` 或 `rerun_group=qa`。                                                                                                                                       |
| 发布验证器       | **任务：** `Verify release checks`<br />**支持工作流：** 无<br />**测试：** 所选重新运行组所需的发布检查任务。<br />**重新运行：** 在专项子任务通过后重新运行。                                                                                                                                                                             |

## Docker 发布路径块

当 `live_suite_filter` 为空时，Docker 发布路径阶段运行以下块：

| 块                                                         | 覆盖范围                                         |
| ---------------------------------------------------------- | ------------------------------------------------ |
| `core`                                                     | 核心 Docker 发布路径烟雾通道。                   |
| `package-update-openai`                                    | OpenAI 包安装和更新行为。                        |
| `package-update-anthropic`                                 | Anthropic 包安装和更新行为。                     |
| `package-update-core`                                      | 提供商中立的包和更新行为。                       |
| `plugins-runtime-plugins`                                  | 运行插件行为的插件运行时通道。                   |
| `plugins-runtime-services`                                 | 服务支持的插件运行时通道；请求时包含 OpenWebUI。 |
| `plugins-runtime-install-a` 到 `plugins-runtime-install-h` | 为并行发布验证拆分的插件安装/运行时批次。        |

当只有一个 Docker 通道失败时，在可重用的实时/E2E 工作流上使用目标 `docker_lanes=<lane[,lane]>`。发布工件包含带有包工件和镜像重用输入的每通道重新运行命令（如果可用）。

## 发布配置文件

`release_profile` 主要控制发布检查中的实时/提供商广度。它不会删除正常完整 CI、插件预发布、安装烟雾测试、包验收、QA Lab 或 Docker 发布路径块。`full` 还使总括工作流在 `rerun_group=all` 时针对父级发布包工件运行包 Telegram E2E，因此完整的预发布候选版本不会悄悄跳过该 Telegram 包通道。

| 配置文件  | 预期用途                 | 包含的实时/提供商覆盖                                                                                                                                       |
| --------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimum` | 最快的发布关键烟雾测试。 | OpenAI/核心实时路径、OpenAI 的 Docker 实时模型、原生网关核心、原生 OpenAI 网关配置文件、原生 OpenAI 插件和 Docker 实时网关 OpenAI。                         |
| `stable`  | 默认发布批准配置文件。   | `minimum` 加 Anthropic 烟雾测试、Google、MiniMax、后端、原生实时测试工具、Docker 实时 CLI 后端、Docker ACP 绑定、Docker Codex 工具和 OpenCode Go 烟雾分片。 |
| `full`    | 广泛的顾问性扫描。       | `stable` 加顾问性提供商、插件实时分片和媒体实时分片。                                                                                                       |

## 仅 full 的补充

这些套件被 `stable` 跳过，被 `full` 包含：

| 领域                   | 仅 full 的覆盖                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Docker 实时模型        | OpenCode Go、OpenRouter、xAI、Z.ai 和 Fireworks。                                                                       |
| Docker 实时网关        | 顾问性提供商拆分为 DeepSeek/Fireworks、OpenCode Go/OpenRouter 和 xAI/Z.ai 分片。                                        |
| 原生网关提供商配置文件 | 完整的 Anthropic Opus 和 Sonnet/Haiku 分片、Fireworks、DeepSeek、完整的 OpenCode Go 模型分片、OpenRouter、xAI 和 Z.ai。 |
| 原生插件实时分片       | 插件 A-K、L-N、O-Z 其他、Moonshot 和 xAI。                                                                              |
| 原生媒体实时分片       | 音频、Google 音乐、MiniMax 音乐和视频组 A-D。                                                                           |

`stable` 包含 `native-live-src-gateway-profiles-anthropic-smoke` 和 `native-live-src-gateway-profiles-opencode-go-smoke`；`full` 改用更广泛的 Anthropic 和 OpenCode Go 模型分片。专项重新运行仍然可以使用聚合的 `native-live-src-gateway-profiles-anthropic` 或 `native-live-src-gateway-profiles-opencode-go` 句柄。

## 专项重新运行

使用 `rerun_group` 避免重复不相关的发布箱子：

| 句柄                | 范围                                                      |
| ------------------- | --------------------------------------------------------- |
| `all`               | 所有完整发布验证阶段。                                    |
| `ci`                | 仅手动完整 CI 子级。                                      |
| `plugin-prerelease` | 仅插件预发布子级。                                        |
| `release-checks`    | 所有 OpenClaw 发布检查阶段。                              |
| `install-smoke`     | 通过发布检查的安装烟雾测试。                              |
| `cross-os`          | 跨操作系统发布检查。                                      |
| `live-e2e`          | 仓库/实时 E2E 和 Docker 发布路径验证。                    |
| `package`           | 包验收。                                                  |
| `qa`                | QA 奇偶校验加 QA 实时通道。                               |
| `qa-parity`         | 仅 QA 奇偶校验通道和报告。                                |
| `qa-live`           | 仅 QA 实时 Matrix 和 Telegram。                           |
| `npm-telegram`      | 已发布包 Telegram E2E；需要 `npm_telegram_package_spec`。 |

当一个实时套件失败时，将 `live_suite_filter` 与 `rerun_group=live-e2e` 一起使用。有效的过滤器 id 在可重用的实时/E2E 工作流中定义，包括 `docker-live-models`、`live-gateway-docker`、`live-gateway-anthropic-docker`、`live-gateway-google-docker`、`live-gateway-minimax-docker`、`live-gateway-advisory-docker`、`live-cli-backend-docker`、`live-acp-bind-docker` 和 `live-codex-harness-docker`。

`live-gateway-advisory-docker` 句柄是其三个提供商分片的聚合重新运行句柄，因此它仍然扇出到所有顾问性 Docker 网关任务。

## 需要保留的证据

将 `Full Release Validation` 摘要保留为发布级索引。它链接子运行 id 并包含最慢任务表。对于失败，首先检查子工作流，然后重新运行上面最小的匹配句柄。

有用的工件：

- 来自完整发布验证父级和 `OpenClaw Release Checks` 的 `release-package-under-test`
- `.artifacts/docker-tests/` 下的 Docker 发布路径工件
- 包验收 `package-under-test` 和 Docker 验收工件
- 每个操作系统和套件的跨操作系统发布检查工件
- QA 奇偶校验、Matrix 和 Telegram 工件

## 工作流文件

- `.github/workflows/full-release-validation.yml`
- `.github/workflows/openclaw-release-checks.yml`
- `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml`
- `.github/workflows/plugin-prerelease.yml`
- `.github/workflows/install-smoke.yml`
- `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- `.github/workflows/package-acceptance.yml`
