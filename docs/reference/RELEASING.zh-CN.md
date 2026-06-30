---
summary: "发布通道、操作员检查表、验证箱、版本命名和发布节奏"
title: "发布策略"
read_when:
  - 查找公共发布通道定义时
  - 运行发布验证或包验收时
  - 查找版本命名和发布节奏时
---

OpenClaw 有三个公共发布通道：

- stable（稳定版）：标记的发布版本，默认发布到 npm `beta`，或在明确请求时发布到 npm `latest`
- beta（测试版）：预发布标签，发布到 npm `beta`
- dev（开发版）：`main` 分支的移动头

## 版本命名

- 稳定版本号：`YYYY.M.D`
  - Git 标签：`vYYYY.M.D`
- 稳定修正版本号：`YYYY.M.D-N`
  - Git 标签：`vYYYY.M.D-N`
- Beta 预发布版本号：`YYYY.M.D-beta.N`
  - Git 标签：`vYYYY.M.D-beta.N`
- 月份和日期不补零
- `latest` 表示当前已推广的稳定 npm 发布版本
- `beta` 表示当前的 beta 安装目标
- 稳定版和稳定修正版默认发布到 npm `beta`；发布操作员可以明确指定 `latest`，或之后推广经过验证的 beta 版本
- 每个稳定的 OpenClaw 发布版本同时发布 npm 包和 macOS 应用；beta 版本通常先验证并发布 npm/包路径，除非明确请求，否则 macOS 应用的构建/签名/公证保留给稳定版

## 发布节奏

- 发布先走 beta 通道
- 仅在最新 beta 经过验证后才发布稳定版
- 维护者通常从当前 `main` 创建的 `release/YYYY.M.D` 分支上切割发布版本，这样发布验证和修复不会阻塞 `main` 上的新开发
- 如果某个 beta 标签已推送或发布并需要修复，维护者切割下一个 `-beta.N` 标签，而不是删除或重新创建旧的 beta 标签
- 详细的发布程序、审批、凭据和恢复说明仅供维护者使用

## 发布操作员检查表

此检查表是发布流程的公开形式。私有凭据、签名、公证、dist-tag 恢复和紧急回滚详情保留在仅供维护者使用的发布手册中。

1. 从当前 `main` 开始：拉取最新代码，确认目标提交已推送，并确认当前 `main` CI 足够绿色可以从其创建分支。
2. 使用 `/changelog` 从真实提交历史重写顶部 `CHANGELOG.md` 部分，保持条目面向用户，提交并推送，然后在创建分支前再次变基/拉取。
3. 查看 `src/plugins/compat/registry.ts` 和 `src/commands/doctor/shared/deprecation-compat.ts` 中的发布兼容性记录。仅在升级路径仍然覆盖时移除过期的兼容性，否则记录为什么故意保留它。
4. 从当前 `main` 创建 `release/YYYY.M.D`；不要在 `main` 上直接进行正常发布工作。
5. 为预期标签更新所有必需的版本位置，运行 `pnpm plugins:sync` 使可发布的插件包共享发布版本和兼容性元数据，然后运行本地确定性预检：`pnpm check:test-types`、`pnpm check:architecture`、`pnpm build && pnpm ui:build`、`pnpm plugins:sync:check` 和 `pnpm release:check`。
6. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`。在标签存在之前，允许使用完整的 40 个字符的发布分支 SHA 进行仅验证的预检。保存成功的 `preflight_run_id`。
7. 使用 `Full Release Validation` 为发布分支、标签或完整提交 SHA 启动所有预发布测试。这是四个大型发布测试箱的唯一手动入口点：Vitest、Docker、QA Lab 和包。
8. 如果验证失败，在发布分支上修复并重新运行能够证明修复的最小失败文件、通道、工作流任务、包配置文件、提供商或模型允许列表。仅当更改的界面使之前的证据过时时，才重新运行完整的总括工作流。
9. 对于 beta，标记 `vYYYY.M.D-beta.N`，然后从匹配的 `release/YYYY.M.D` 分支运行 `OpenClaw Release Publish`。它验证 `pnpm plugins:sync:check`，首先将所有可发布的插件包发布到 npm，然后作为 ClawPack npm-pack 压缩包将同一组发布到 ClawHub，最后用匹配的 dist-tag 推广准备好的 OpenClaw npm 预检工件。发布后，针对已发布的 `openclaw@YYYY.M.D-beta.N` 或 `openclaw@beta` 包运行发布后包验收。如果已推送或已发布的预发布版本需要修复，切割下一个匹配的预发布编号；不要删除或重写旧的预发布版本。
10. 对于稳定版，仅在经过验证的 beta 或候选版本具有所需的验证证据后才继续。稳定 npm 发布也通过 `OpenClaw Release Publish` 进行，通过 `preflight_run_id` 重用成功的预检工件；稳定 macOS 发布就绪还需要 `main` 上打包好的 `.zip`、`.dmg`、`.dSYM.zip` 和更新后的 `appcast.xml`。
11. 发布后，运行 npm 发布后验证器、可选的独立已发布 npm Telegram E2E（当需要发布后通道证明时）、所需时的 dist-tag 推广、来自完整匹配 `CHANGELOG.md` 部分的 GitHub 发布/预发布说明以及发布公告步骤。

## 发布预检

- 在发布预检之前运行 `pnpm check:test-types`，使测试 TypeScript 在更快的本地 `pnpm check` 门控之外保持覆盖
- 在发布预检之前运行 `pnpm check:architecture`，使更广泛的导入循环和架构边界检查在更快的本地门控之外保持绿色
- 在 `pnpm release:check` 之前运行 `pnpm build && pnpm ui:build`，以便预期的 `dist/*` 发布工件和控制 UI 包存在于包验证步骤中
- 在根版本更新后且标记之前运行 `pnpm plugins:sync`。它更新可发布的插件包版本、OpenClaw 对等/API 兼容性元数据、构建元数据和插件变更日志存根以匹配核心发布版本。`pnpm plugins:sync:check` 是非变更的发布防护；如果遗忘了此步骤，发布工作流在任何注册表变更之前就会失败。
- 在发布批准之前运行手动 `Full Release Validation` 工作流，从一个入口点启动所有预发布测试箱。它接受分支、标签或完整提交 SHA，分派手动 `CI`，并为安装烟雾测试、包验收、Docker 发布路径套件、实时/E2E、OpenWebUI、QA Lab 奇偶校验、Matrix 和 Telegram 通道分派 `OpenClaw Release Checks`。使用 `release_profile=full` 和 `rerun_group=all` 时，它还针对发布检查中的 `release-package-under-test` 工件运行包 Telegram E2E。发布后提供 `npm_telegram_package_spec` 时，相同的 Telegram E2E 也应证明已发布的 npm 包。发布后提供 `package_acceptance_package_spec` 时，包验收应针对已发布的 npm 包而非基于 SHA 构建的工件运行其包/更新矩阵。当私有证据报告应证明验证匹配已发布的 npm 包而不强制运行 Telegram E2E 时，提供 `evidence_package_spec`。示例：`gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- 当需要在发布工作继续进行时对包候选进行旁路证明时，运行手动 `Package Acceptance` 工作流。使用 `source=npm` 对应 `openclaw@beta`、`openclaw@latest` 或精确的发布版本；使用 `source=ref` 用当前 `workflow_ref` 工具打包受信任的 `package_ref` 分支/标签/SHA；使用 `source=url` 对应具有所需 SHA-256 的 HTTPS 压缩包；或使用 `source=artifact` 对应由另一个 GitHub Actions 运行上传的压缩包。工作流将候选解析为 `package-under-test`，针对该压缩包重用 Docker E2E 发布调度器，并可以使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 针对同一压缩包运行 Telegram QA。当所选的 Docker 通道包含 `published-upgrade-survivor` 时，包工件是候选，`published_upgrade_survivor_baseline` 选择已发布的基线。示例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  常见配置文件：
  - `smoke`：安装/通道/智能助手、网关网络和配置重载通道
  - `package`：无实时 ClawHub 的工件原生包/更新/插件通道
  - `product`：包配置文件加 MCP 通道、计划任务/子智能助手清理、OpenAI 网络搜索和 OpenWebUI
  - `full`：带 OpenWebUI 的 Docker 发布路径块
  - `custom`：用于专项重新运行的精确 `docker_lanes` 选择
- 当只需要针对候选版本的完整正常 CI 覆盖时，直接运行手动 `CI` 工作流。手动 CI 分派绕过已更改的范围，强制执行正常测试图，包含 Linux Node 分片、捆绑插件分片、通道合约、Node 22 兼容性、`check`、`check-additional`、构建烟雾测试、文档检查、Python 技能、Windows、macOS、Android 和控制 UI i18n 通道。示例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 在验证发布遥测时运行 `pnpm qa:otel:smoke`。它通过本地 OTLP/HTTP 接收器对 QA Lab 进行测试，并验证导出的跟踪 span 名称、有界属性和内容/标识符编辑，无需 Opik、Langfuse 或其他外部收集器。
- 在每次标记发布之前运行 `pnpm release:check`
- 在标签存在后，运行 `OpenClaw Release Publish` 进行变更性发布序列。从 `release/YYYY.M.D`（或在发布主分支可达标签时从 `main`）分派它，传递发布标签和成功的 OpenClaw npm `preflight_run_id`，并保持默认插件发布范围 `all-publishable`，除非您故意运行专项修复。工作流序列化插件 npm 发布、插件 ClawHub 发布和 OpenClaw npm 发布，以确保核心包在其外部化插件之前不会发布。
- 发布检查现在在单独的手动工作流中运行：`OpenClaw Release Checks`
- `OpenClaw Release Checks` 还在发布批准前运行 QA Lab 模拟奇偶校验通道以及快速实时 Matrix 配置文件和 Telegram QA 通道。实时通道使用 `qa-live-shared` 环境；Telegram 还使用 Convex CI 凭据租约。当需要在并行中进行完整 Matrix 传输、媒体和 E2EE 清单时，使用 `matrix_profile=all` 和 `matrix_shards=true` 运行手动 `QA-Lab - All Lanes` 工作流。
- 跨操作系统安装和升级运行时验证是公共 `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它们直接调用可重用工作流 `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 这种拆分是有意为之：保持真实 npm 发布路径简短、确定且专注于工件，而较慢的实时检查保留在其自己的通道中，以便它们不会停滞或阻塞发布
- 带密钥的发布检查应通过 `Full Release Validation` 或从 `main`/release 工作流 ref 分派，以便工作流逻辑和密钥保持受控
- `OpenClaw Release Checks` 接受分支、标签或完整提交 SHA，只要解析的提交可从 OpenClaw 分支或发布标签访问
- `OpenClaw NPM Release` 仅验证预检还接受当前完整 40 字符工作流分支提交 SHA，无需推送的标签
- 该 SHA 路径仅供验证，无法提升为真实发布
- 在 SHA 模式下，工作流仅为包元数据检查合成 `v<package.json version>`；真实发布仍需要真实的发布标签
- 两个工作流都将真实发布和推广路径保留在 GitHub 托管的运行器上，而非变更性验证路径可以使用更大的 Blacksmith Linux 运行器
- 该工作流使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流密钥运行 `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
- npm 发布预检不再等待单独的发布检查通道
- 在批准前运行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`（或匹配的 beta/修正标签）
- npm 发布后，运行 `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`（或匹配的 beta/修正版本）以在新的临时前缀中验证已发布的注册表安装路径
- beta 发布后，运行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live` 以使用共享租赁 Telegram 凭据池对已发布的 npm 包验证已安装包的入门引导、Telegram 设置和真实的 Telegram E2E。本地维护者一次性操作可以省略 Convex 变量并直接传递三个 `OPENCLAW_QA_TELEGRAM_*` 环境凭据。
- 要从维护者机器运行完整的发布后 beta 烟雾测试，使用 `pnpm release:beta-smoke -- --beta betaN`。该辅助函数运行 Parallels npm 更新/全新目标验证，分派 `NPM Telegram Beta E2E`，轮询精确的工作流运行，下载工件并打印 Telegram 报告。
- 维护者可以通过手动 `NPM Telegram Beta E2E` 工作流从 GitHub Actions 运行相同的发布后检查。它有意只能手动触发，不在每次合并时运行。
- 维护者发布自动化现在使用预检然后推广的方式：
  - 真实 npm 发布必须通过成功的 npm `preflight_run_id`
  - 真实 npm 发布必须从与成功预检运行相同的 `main` 或 `release/YYYY.M.D` 分支分派
  - 稳定 npm 发布默认为 `beta`
  - 稳定 npm 发布可以通过工作流输入明确指定 `latest`
  - 基于 token 的 npm dist-tag 变更现在位于 `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml` 以确保安全，因为 `npm dist-tag add` 仍需要 `NPM_TOKEN`，而公共仓库仅保留 OIDC 发布
  - 公共 `macOS Release` 仅供验证；当标签仅存在于发布分支但工作流从 `main` 分派时，设置 `public_release_branch=release/YYYY.M.D`
  - 真实的私有 mac 发布必须通过成功的私有 mac `preflight_run_id` 和 `validate_run_id`
  - 真实的发布路径推广准备好的工件，而不是重新构建它们
- 对于 `YYYY.M.D-N` 等稳定修正发布，发布后验证器还检查从 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同临时前缀升级路径，以确保发布修正不会悄悄地让旧的全局安装停留在基本稳定有效载荷上
- npm 发布预检会在压缩包不包含 `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 有效载荷时关闭，以确保我们不会再次发布空的浏览器控制台
- 发布后验证还检查已安装注册表布局中是否存在已发布的插件入口点和包元数据。发布了缺失插件运行时有效载荷的版本会导致发布后验证器失败，无法推广到 `latest`。
- `pnpm test:install:smoke` 还对候选更新压缩包强制执行 npm pack `unpackedSize` 预算，以便安装程序 e2e 在发布发布路径之前捕获意外的包膨胀
- 如果发布工作涉及 CI 规划、扩展时序清单或扩展测试矩阵，在批准之前从 `.github/workflows/plugin-prerelease.yml` 重新生成并审查规划器拥有的 `plugin-prerelease-extension-shard` 矩阵输出，以确保发布说明不描述过时的 CI 布局
- 稳定 macOS 发布就绪还包括更新程序界面：
  - GitHub 发布必须最终包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - 发布后 `main` 上的 `appcast.xml` 必须指向新的稳定 zip
  - 打包好的应用必须保留非调试包 ID、非空的 Sparkle 订阅源 URL，以及在该发布版本的规范 Sparkle 构建底限之上的 `CFBundleVersion`

## 发布测试箱

`Full Release Validation` 是操作员从一个入口点启动所有预发布测试的方式。对于在快速移动分支上的固定提交证明，使用辅助函数，使每个子工作流都从固定在目标 SHA 的临时分支运行：

```bash
pnpm ci:full-release --sha <full-sha>
```

该辅助函数推送 `release-ci/<sha>-...`，从该分支分派带有 `ref=<sha>` 的 `Full Release Validation`，验证每个子工作流的 `headSha` 是否与目标匹配，然后删除临时分支。这避免了意外证明更新的 `main` 子运行。

对于发布分支或标签验证，从受信任的 `main` 工作流 ref 运行它，并将发布分支或标签作为 `ref` 传递：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

工作流解析目标 ref，使用 `target_ref=<release-ref>` 分派手动 `CI`，分派 `OpenClaw Release Checks`，为面向包的检查准备父级 `release-package-under-test` 工件，并在 `release_profile=full` 和 `rerun_group=all` 或设置了 `npm_telegram_package_spec` 时分派独立的包 Telegram E2E。`OpenClaw Release Checks` 然后扇出到安装烟雾测试、跨操作系统发布检查、实时/E2E Docker 发布路径覆盖、带有 Telegram 包 QA 的包验收、QA Lab 奇偶校验、实时 Matrix 和实时 Telegram。只有当 `Full Release Validation` 摘要显示 `normal_ci` 和 `release_checks` 均成功时，完整运行才可接受。在 full/all 模式下，`npm_telegram` 子级也必须成功；在 full/all 模式之外，除非提供了已发布的 `npm_telegram_package_spec`，否则将跳过它。最终验证器摘要包括每个子运行的最慢任务表，以便发布管理员无需下载日志就能看到当前关键路径。请参阅[完整发布验证](/reference/full-release-validation)了解完整的阶段矩阵、精确的工作流任务名称、稳定与完整配置文件差异、工件和专项重新运行句柄。子工作流从运行 `Full Release Validation` 的受信任 ref 分派，通常是 `--ref main`，即使目标 `ref` 指向旧的发布分支或标签。没有单独的 Full Release Validation 工作流 ref 输入；通过选择工作流运行 ref 来选择受信任的工具。对于在移动 `main` 上精确提交的证明，不要使用 `--ref main -f ref=<sha>`；原始提交 SHA 不能作为工作流分派 ref，因此使用 `pnpm ci:full-release --sha <sha>` 创建固定的临时分支。

使用 `release_profile` 选择实时/提供商广度：

- `minimum`：最快的发布关键 OpenAI/核心实时和 Docker 路径
- `stable`：minimum 加上发布批准的稳定提供商/后端覆盖
- `full`：stable 加上广泛的顾问性提供商/媒体覆盖

`OpenClaw Release Checks` 使用受信任的工作流 ref 将目标 ref 解析一次为 `release-package-under-test`，并在发布路径 Docker 检查和包验收中重用该工件。这使所有面向包的箱子都使用相同的字节，并避免重复构建包。跨操作系统 OpenAI 安装烟雾测试在设置了仓库/组织变量时使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则使用 `openai/gpt-5.4`，因为此通道是在证明包安装、入门引导、网关启动和一次实时智能助手轮次，而非对最慢的默认模型进行基准测试。更广泛的实时提供商矩阵仍然是特定模型覆盖的地方。

根据发布阶段使用这些变体：

```bash
# 验证未发布的候选版本分支。
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable

# 验证精确推送的提交。
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=<40-char-sha> \
  -f provider=openai \
  -f mode=both

# 发布 beta 后，添加已发布包的 Telegram E2E。
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=full \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

专项修复后，不要将完整总括工作流作为首次重新运行。如果某个箱子失败，使用失败的子工作流、任务、Docker 通道、包配置文件、模型提供商或 QA 通道进行下一次证明。仅当修复更改了共享发布编排或使之前所有箱子的证据过时时，才重新运行完整总括工作流。总括工作流的最终验证器重新检查记录的子工作流运行 id，因此在子工作流成功重新运行后，只需重新运行失败的 `Verify full validation` 父任务即可。

对于有限恢复，将 `rerun_group` 传递给总括工作流。`all` 是真正的候选版本运行，`ci` 仅运行正常 CI 子级，`plugin-prerelease` 仅运行仅发布插件子级，`release-checks` 运行所有发布箱子，更窄的发布组是 `install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 和 `npm-telegram`。专项 `npm-telegram` 重新运行需要 `npm_telegram_package_spec`；使用 `release_profile=full` 的 full/all 运行使用发布检查包工件。

### Vitest

Vitest 箱子是手动 `CI` 子工作流。手动 CI 有意绕过已更改的范围，并强制执行候选版本的正常测试图：Linux Node 分片、捆绑插件分片、通道合约、Node 22 兼容性、`check`、`check-additional`、构建烟雾测试、文档检查、Python 技能、Windows、macOS、Android 和控制 UI i18n。

使用此箱子回答"源代码树是否通过了完整的正常测试套件？"它与发布路径产品验证不同。需要保留的证据：

- `Full Release Validation` 摘要，显示分派的 `CI` 运行 URL
- `CI` 在精确目标 SHA 上为绿色
- 调查回归时 CI 任务中失败或缓慢的分片名称
- 当运行需要性能分析时，Vitest 计时工件（如 `.artifacts/vitest-shard-timings.json`）

仅当发布需要确定性正常 CI 但不需要 Docker、QA Lab、实时、跨操作系统或包箱子时，才直接运行手动 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

Docker 箱子通过 `openclaw-live-and-e2e-checks-reusable.yml` 位于 `OpenClaw Release Checks` 中，以及发布模式的 `install-smoke` 工作流。它通过打包好的 Docker 环境而非仅通过源代码级测试来验证候选版本。

发布 Docker 覆盖包括：

- 启用慢速 Bun 全局安装烟雾测试的完整安装烟雾
- 按目标 SHA 进行根 Dockerfile 烟雾镜像准备/重用，QR、根/网关和安装程序/Bun 烟雾任务作为单独的安装烟雾分片运行
- 仓库 E2E 通道
- 发布路径 Docker 块：`core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services`、`plugins-runtime-install-a`、`plugins-runtime-install-b`、`plugins-runtime-install-c`、`plugins-runtime-install-d`、`plugins-runtime-install-e`、`plugins-runtime-install-f`、`plugins-runtime-install-g` 和 `plugins-runtime-install-h`
- 请求时在 `plugins-runtime-services` 块内的 OpenWebUI 覆盖
- 分割的捆绑插件安装/卸载通道 `bundled-plugin-install-uninstall-0` 到 `bundled-plugin-install-uninstall-23`
- 当发布检查包含实时套件时，实时/E2E 提供商套件和 Docker 实时模型覆盖

重新运行前使用 Docker 工件。发布路径调度器上传 `.artifacts/docker-tests/`，包含通道日志、`summary.json`、`failures.json`、阶段计时、调度器计划 JSON 和重新运行命令。对于专项恢复，在可重用的实时/E2E 工作流上使用 `docker_lanes=<lane[,lane]>` 而不是重新运行所有发布块。生成的重新运行命令在可用时包含之前的 `package_artifact_run_id` 和准备好的 Docker 镜像输入，以便失败的通道可以重用相同的压缩包和 GHCR 镜像。

### QA Lab

QA Lab 箱子也是 `OpenClaw Release Checks` 的一部分。它是智能体行为和通道级发布门控，独立于 Vitest 和 Docker 包机制。

发布 QA Lab 覆盖包括：

- 使用智能体奇偶校验包将 OpenAI 候选通道与 Opus 4.6 基线进行比较的模拟奇偶校验通道
- 使用 `qa-live-shared` 环境的快速实时 Matrix QA 配置文件
- 使用 Convex CI 凭据租约的实时 Telegram QA 通道
- 当发布遥测需要明确的本地证明时运行 `pnpm qa:otel:smoke`

使用此箱子回答"发布在 QA 场景和实时通道流中是否正确运行？"批准发布时保留奇偶校验、Matrix 和 Telegram 通道的工件 URL。完整 Matrix 覆盖仍可作为手动分片 QA-Lab 运行，而非默认的发布关键通道。

### Package

Package 箱子是可安装产品的门控。它由 `Package Acceptance` 和解析器 `scripts/resolve-openclaw-package-candidate.mjs` 支持。解析器将候选规范化为 Docker E2E 使用的 `package-under-test` 压缩包，验证包清单，记录包版本和 SHA-256，并将工作流工具 ref 与包源 ref 分开。

支持的候选来源：

- `source=npm`：`openclaw@beta`、`openclaw@latest` 或精确的 OpenClaw 发布版本
- `source=ref`：用所选 `workflow_ref` 工具打包受信任的 `package_ref` 分支、标签或完整提交 SHA
- `source=url`：下载带有必需 `package_sha256` 的 HTTPS `.tgz`
- `source=artifact`：重用由另一个 GitHub Actions 运行上传的 `.tgz`

`OpenClaw Release Checks` 使用 `source=artifact`、准备好的发布包工件、`suite_profile=custom`、`docker_lanes=doctor-switch update-channel-switch upgrade-survivor published-upgrade-survivor plugins-offline plugin-update`、`published_upgrade_survivor_baselines=all-since-2026.4.23`、`published_upgrade_survivor_scenarios=reported-issues` 和 `telegram_mode=mock-openai` 运行包验收。包验收针对相同解析的压缩包保留迁移、更新、过时插件依赖清理、离线插件夹具、插件更新和 Telegram 包 QA。升级矩阵涵盖从 `2026.4.23` 到 `latest` 的每个稳定 npm 发布基线；对于已发布的候选版本使用 `source=npm`，对于发布前基于 SHA 的本地 npm 压缩包使用 `source=ref`/`source=artifact`。它是以前需要 Parallels 的大多数包/更新覆盖的 GitHub 原生替代方案。跨操作系统发布检查对于操作系统特定的入门引导、安装程序和平台行为仍然很重要，但包/更新产品验证应优先使用包验收。

更新和插件验证的规范检查表是[测试更新和插件](/help/testing-updates-plugins)。在决定哪个本地、Docker、包验收或发布检查通道证明插件安装/更新、doctor 清理或已发布包迁移变更时使用它。从每个稳定 `2026.4.23+` 包进行详尽的已发布更新迁移是一个单独的手动 `Update Migration` 工作流，不是完整发布 CI 的一部分。

旧版包验收宽限期是有意设置时间限制的。通过 `2026.4.25` 的包可以使用已发布到 npm 的元数据差距的兼容路径：私有 QA 清单条目缺失于压缩包、缺失 `gateway install --wrapper`、压缩包派生的 git 夹具中缺失补丁文件、缺失持久化的 `update.channel`、旧版插件安装记录位置、缺失市场安装记录持久化，以及 `plugins update` 期间的配置元数据迁移。已发布的 `2026.4.26` 包可能会对已发布的本地构建元数据戳文件发出警告。以后的包必须满足现代包合约；那些相同的差距在发布验证中会失败。

当发布问题涉及实际可安装包时，使用更广泛的包验收配置文件：

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f published_upgrade_survivor_baseline=openclaw@2026.4.26
```

常见包配置文件：

- `smoke`：快速包安装/通道/智能助手、网关网络和配置重载通道
- `package`：无实时 ClawHub 的安装/更新/插件包合约；这是发布检查默认值
- `product`：`package` 加 MCP 通道、计划任务/子智能助手清理、OpenAI 网络搜索和 OpenWebUI
- `full`：带 OpenWebUI 的 Docker 发布路径块
- `custom`：用于专项重新运行的精确 `docker_lanes` 列表

对于包候选版本的 Telegram 证明，在包验收上启用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier`。工作流将解析的 `package-under-test` 压缩包传递到 Telegram 通道；独立的 Telegram 工作流仍然接受用于发布后检查的已发布 npm 规范。

## 发布自动化

`OpenClaw Release Publish` 是正常的变更性发布入口点。它按发布所需的顺序编排受信任的发布者工作流：

1. 检出发布标签并解析其提交 SHA。
2. 验证标签可从 `main` 或 `release/*` 访问。
3. 运行 `pnpm plugins:sync:check`。
4. 使用 `publish_scope=all-publishable` 和 `ref=<release-sha>` 分派 `Plugin NPM Release`。
5. 使用相同的范围和 SHA 分派 `Plugin ClawHub Release`。
6. 使用发布标签、npm dist-tag 和保存的 `preflight_run_id` 分派 `OpenClaw NPM Release`。

Beta 发布示例：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

稳定发布到默认 beta dist-tag：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

稳定版直接推广到 `latest` 是明确的：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=latest
```

仅将较低级别的 `Plugin NPM Release` 和 `Plugin ClawHub Release` 工作流用于专项修复或重新发布工作。对于所选插件修复，将 `plugin_publish_scope=selected` 和 `plugins=@openclaw/name` 传递给 `OpenClaw Release Publish`，或在不应发布 OpenClaw 包时直接分派子工作流。

## NPM 工作流输入

`OpenClaw NPM Release` 接受以下操作员控制的输入：

- `tag`：必需的发布标签，如 `v2026.4.2`、`v2026.4.2-1` 或 `v2026.4.2-beta.1`；当 `preflight_only=true` 时，也可以是当前完整的 40 字符工作流分支提交 SHA，用于仅验证预检
- `preflight_only`：`true` 表示仅验证/构建/打包，`false` 表示真实发布路径
- `preflight_run_id`：在真实发布路径上是必需的，以便工作流重用成功预检运行中的准备好的压缩包
- `npm_dist_tag`：发布路径的 npm 目标标签；默认为 `beta`

`OpenClaw Release Publish` 接受以下操作员控制的输入：

- `tag`：必需的发布标签；必须已存在
- `preflight_run_id`：成功的 `OpenClaw NPM Release` 预检运行 id；当 `publish_openclaw_npm=true` 时是必需的
- `npm_dist_tag`：OpenClaw 包的 npm 目标标签
- `plugin_publish_scope`：默认为 `all-publishable`；仅用于专项修复工作时使用 `selected`
- `plugins`：当 `plugin_publish_scope=selected` 时，以逗号分隔的 `@openclaw/*` 包名
- `publish_openclaw_npm`：默认为 `true`；仅在将工作流用作仅插件修复编排器时设置为 `false`

`OpenClaw Release Checks` 接受以下操作员控制的输入：

- `ref`：要验证的分支、标签或完整提交 SHA。带密钥的检查要求解析的提交可从 OpenClaw 分支或发布标签访问。

规则：

- 稳定版和修正标签可以发布到 `beta` 或 `latest`
- Beta 预发布标签只能发布到 `beta`
- 对于 `OpenClaw NPM Release`，仅当 `preflight_only=true` 时才允许完整提交 SHA 输入
- `OpenClaw Release Checks` 和 `Full Release Validation` 始终仅供验证
- 真实发布路径必须使用与预检期间相同的 `npm_dist_tag`；工作流在发布继续之前验证该元数据

## 稳定 npm 发布序列

切割稳定 npm 发布时：

1. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`
   - 在标签存在之前，您可以使用当前完整的工作流分支提交 SHA 进行预检工作流的仅验证演习
2. 对于正常的 beta 优先流程选择 `npm_dist_tag=beta`，或仅在有意直接进行稳定发布时选择 `latest`
3. 当您希望从一个手动工作流获得正常 CI 加实时提示词缓存、Docker、QA Lab、Matrix 和 Telegram 覆盖时，在发布分支、发布标签或完整提交 SHA 上运行 `Full Release Validation`
4. 如果您只需要确定性的正常测试图，请在发布 ref 上运行手动 `CI` 工作流
5. 保存成功的 `preflight_run_id`
6. 使用相同的 `tag`、相同的 `npm_dist_tag` 和保存的 `preflight_run_id` 运行 `OpenClaw Release Publish`；它在推广 OpenClaw npm 包之前将外部化插件发布到 npm 和 ClawHub
7. 如果发布已落在 `beta`，使用私有 `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml` 工作流将该稳定版本从 `beta` 推广到 `latest`
8. 如果发布有意直接发布到 `latest` 并且 `beta` 应立即跟随相同的稳定版本，使用同一个私有工作流将两个 dist-tag 都指向该稳定版本，或者让其定期自我修复同步稍后移动 `beta`

dist-tag 变更位于私有仓库以确保安全，因为它仍然需要 `NPM_TOKEN`，而公共仓库仅保留 OIDC 发布。

这使直接发布路径和 beta 优先推广路径都有文档记录且对操作员可见。

如果维护者必须回退到本地 npm 认证，仅在专用的 tmux 会话中运行任何 1Password CLI (`op`) 命令。不要直接从主智能助手 shell 调用 `op`；将其保留在 tmux 中使提示、提醒和 OTP 处理可观察，并防止重复的宿主提醒。

## 公共参考

- [`.github/workflows/full-release-validation.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/full-release-validation.yml)
- [`.github/workflows/package-acceptance.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/package-acceptance.yml)
- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/resolve-openclaw-package-candidate.mjs`](https://github.com/openclaw/openclaw/blob/main/scripts/resolve-openclaw-package-candidate.mjs)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

维护者使用 [`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md) 中的私有发布文档作为实际手册。

## 相关链接

- [发布通道](/install/development-channels)
