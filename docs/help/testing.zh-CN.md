---
summary: "测试套件：单元/e2e/实时套件、Docker 运行器以及各测试覆盖的内容"
read_when:
  - 在本地或 CI 中运行测试
  - 为模型/提供商 bug 添加回归测试
  - 调试 Gateway + 代理行为
title: "测试"
---

OpenClaw 有三个 Vitest 套件（单元/集成、e2e、实时）和一小组 Docker 运行器。本文档是"我们如何测试"指南：

- 每个套件覆盖的内容（以及它故意*不*覆盖的内容）。
- 常见工作流（本地、预推送、调试）运行哪些命令。
- 实时测试如何发现凭证并选择模型/提供商。
- 如何为真实世界的模型/提供商问题添加回归测试。

<Note>
**QA 栈（qa-lab、qa-channel、实时传输通道）**单独记录：

- [QA 概述](/concepts/qa-e2e-automation) — 架构、命令界面、场景编写。
- [矩阵 QA](/concepts/qa-matrix) — `pnpm openclaw qa matrix` 参考。
- [QA 频道](/channels/qa-channel) — 仓库支持场景使用的合成传输插件。

本页涵盖运行常规测试套件和 Docker/Parallels 运行器。下面的 QA 特定运行器部分（[QA 特定运行器](#qa-specific-runners)）列出了具体的 `qa` 调用并指回上述参考资料。
</Note>

## 快速入门

大多数情况下：

- 完整门控（推送前预期）：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 在宽裕机器上更快的本地全套运行：`pnpm test:max`
- 直接 Vitest 监视循环：`pnpm test:watch`
- 直接文件定位现在也路由扩展/频道路径：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 在单个失败上迭代时，优先进行目标运行。
- Docker 支持的 QA 站点：`pnpm qa:lab:up`
- Linux VM 支持的 QA 通道：`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

当您修改测试或需要额外信心时：

- 覆盖率门控：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

调试真实提供商/模型时（需要真实凭证）：

- 实时套件（模型 + Gateway 工具/图像探针）：`pnpm test:live`
- 静默地针对一个实时文件：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- 运行时性能报告：使用 `live_gpt54=true` 分发 `OpenClaw Performance` 以进行真实 `openai/gpt-5.4` 代理轮次，或使用 `deep_profile=true` 获取 Kova CPU/堆/追踪产物。每日计划运行在配置了 `CLAWGRIT_REPORTS_TOKEN` 时将模拟提供商、深度配置文件和 GPT 5.4 通道产物发布到 `openclaw/clawgrit-reports`。模拟提供商报告还包括源代码级 Gateway 启动、内存、插件压力、重复假模型 hello 循环和 CLI 启动数字。
- Docker 实时模型扫描：`pnpm test:docker:live-models`
  - 现在每个选定的模型运行一个文本轮次加一个小型文件读取样式探针。其元数据通告 `image` 输入的模型还运行一个小型图像轮次。在隔离提供商失败时使用 `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` 或 `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` 禁用额外探针。
  - CI 覆盖：每日 `OpenClaw Scheduled Live And E2E Checks` 和手动 `OpenClaw Release Checks` 都使用 `include_live_suites: true` 调用可重用的实时/E2E 工作流，其中包括按提供商分片的独立 Docker 实时模型矩阵作业。
  - 对于重点 CI 重新运行，使用 `include_live_suites: true` 和 `live_models_only: true` 分发 `OpenClaw Live And E2E Checks (Reusable)`。
  - 将新的高信号提供商密钥添加到 `scripts/ci-hydrate-live-auth.sh` 加上 `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` 及其计划/发布调用者。
- 原生 Codex 绑定聊天冒烟：`pnpm test:docker:live-codex-bind`
  - 针对 Codex 应用服务器路径运行 Docker 实时通道，用 `/codex bind` 绑定合成 Slack DM，执行 `/codex fast` 和 `/codex permissions`，然后验证普通回复和图像附件通过原生插件绑定而不是 ACP 路由。
- Codex 应用服务器框架冒烟：`pnpm test:docker:live-codex-harness`
  - 通过插件拥有的 Codex 应用服务器框架运行 Gateway 代理轮次，验证 `/codex status` 和 `/codex models`，并默认执行图像、cron MCP、子代理和 Guardian 探针。使用 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` 在隔离其他 Codex 应用服务器失败时禁用子代理探针。对于重点子代理检查，禁用其他探针：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`。除非设置了 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0`，否则在子代理探针后退出。
- Crestodian 救援命令冒烟：`pnpm test:live:crestodian-rescue-channel`
  - 消息频道救援命令界面的可选安全带检查。它执行 `/crestodian status`，排队持久模型更改，回复 `/crestodian yes`，并验证审计/配置写入路径。
- Crestodian 规划器 Docker 冒烟：`pnpm test:docker:crestodian-planner`
  - 在具有 `PATH` 上假 Claude CLI 的无配置容器中运行 Crestodian，并验证模糊规划器回退转换为经审计的类型化配置写入。
- Crestodian 首次运行 Docker 冒烟：`pnpm test:docker:crestodian-first-run`
  - 从空的 OpenClaw 状态目录开始，将裸 `openclaw` 路由到 Crestodian，应用设置/模型/代理/Discord 插件 + SecretRef 写入，验证配置，并验证审计条目。相同的 Ring 0 设置路径也在 QA Lab 中由 `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup` 覆盖。
- Moonshot/Kimi 成本冒烟：在设置了 `MOONSHOT_API_KEY` 的情况下，运行 `openclaw models list --provider moonshot --json`，然后针对 `moonshot/kimi-k2.6` 运行隔离的 `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`。验证 JSON 报告 Moonshot/K2.6 以及助手脚本存储了规范化的 `usage.cost`。

<Tip>
当您只需要一个失败案例时，优先通过下面描述的白名单环境变量缩小实时测试范围。
</Tip>

## QA 特定运行器 {#qa-specific-runners}

当您需要 QA 实验室真实性时，这些命令位于主测试套件旁边：

CI 在专用工作流中运行 QA Lab。代理兼容性嵌套在 `QA-Lab - All Lanes` 和发布验证下，而不是独立的 PR 工作流。广泛验证应使用带 `rerun_group=qa-parity` 的 `Full Release Validation` 或发布检查 QA 组。`QA-Lab - All Lanes` 每晚在 `main` 上运行，并从手动分发运行，其中包含模拟兼容性通道、实时矩阵通道、Convex 托管的实时 Telegram 通道和 Convex 托管的实时 Discord 通道作为并行作业。计划 QA 和发布检查明确传递矩阵 `--profile fast`，而矩阵 CLI 和手动工作流输入默认仍为 `all`；手动分发可以将 `all` 分片为 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作业。`OpenClaw Release Checks` 在发布批准之前运行兼容性加快速矩阵和 Telegram 通道，使用 `mock-openai/gpt-5.5` 进行发布传输检查，以使其保持确定性并避免正常提供商插件启动。这些实时传输网关禁用内存搜索；内存行为仍由 QA 兼容性套件覆盖。

完整发布实时媒体分片使用 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`，其中已经有 `ffmpeg` 和 `ffprobe`。Docker 实时模型/后端分片使用每次选定提交构建一次的共享 `ghcr.io/openclaw/openclaw-live-test:<sha>` 镜像，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 拉取它，而不是在每个分片内重新构建。

- `pnpm openclaw qa suite`
  - 直接在主机上运行仓库支持的 QA 场景。
  - 默认情况下与隔离的 Gateway 工作进程并行运行多个选定场景。`qa-channel` 默认并发数为 4（受所选场景数量限制）。使用 `--concurrency <count>` 调整工作进程数量，或使用 `--concurrency 1` 进行旧串行通道。
  - 当任何场景失败时以非零退出。当您想要产物但不想有失败退出码时，使用 `--allow-failures`。
  - 支持提供商模式 `live-frontier`、`mock-openai` 和 `aimock`。`aimock` 启动本地 AIMock 支持的提供商服务器，用于实验性固件和协议模拟覆盖，而不替换场景感知的 `mock-openai` 通道。
- `pnpm test:gateway:cpu-scenarios`
  - 运行 Gateway 启动基准加上一个小型模拟 QA Lab 场景包（`channel-chat-baseline`、`memory-failure-fallback`、`gateway-restart-inflight-run`），并在 `.artifacts/gateway-cpu-scenarios/` 下写入组合 CPU 观察摘要。
  - 默认情况下仅标记持续的热 CPU 观察（`--cpu-core-warn` 加 `--hot-wall-warn-ms`），因此短暂的启动突发被记录为指标而不看起来像分钟级 Gateway 钉住回归。
  - 使用构建的 `dist` 产物；当检出没有新鲜运行时输出时，先运行构建。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux VM 内运行相同的 QA 套件。
  - 保持与主机上 `qa suite` 相同的场景选择行为。
  - 重用与 `qa suite` 相同的提供商/模型选择标志。
  - 实时运行转发对 guest 实际可行的受支持 QA 认证输入：基于环境的提供商密钥、QA 实时提供商配置路径，以及存在时的 `CODEX_HOME`。
  - 输出目录必须保持在仓库根目录下，以便 guest 可以通过挂载的工作区写回。
  - 在 `.artifacts/qa-e2e/...` 下写入正常的 QA 报告 + 摘要加上 Multipass 日志。
- `pnpm qa:lab:up`
  - 启动 Docker 支持的 QA 站点用于操作员式 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 从当前检出构建 npm tarball，在 Docker 中全局安装它，运行非交互式 OpenAI API 密钥引导，默认配置 Telegram，验证打包的插件运行时在没有启动依赖项修复的情况下加载，运行 doctor，并针对模拟的 OpenAI 端点运行一次本地代理轮次。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 以使用 Discord 运行相同的打包安装通道。
- `pnpm test:docker:session-runtime-context`
  - 运行嵌入式运行时上下文脚本的确定性构建应用 Docker 冒烟。它验证隐藏的 OpenClaw 运行时上下文作为非显示自定义消息持久化，而不是泄漏到可见的用户轮次中，然后播种受影响的损坏会话 JSONL 并验证 `openclaw doctor --fix` 将其重写为带有备份的活动分支。
- `pnpm test:docker:npm-telegram-live`
  - 在 Docker 中安装 OpenClaw 包候选版本，运行已安装包的引导，通过已安装的 CLI 配置 Telegram，然后使用该已安装包作为 SUT Gateway 重用实时 Telegram QA 通道。
  - 默认为 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`；设置 `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` 或 `OPENCLAW_CURRENT_PACKAGE_TGZ` 以测试已解析的本地 tarball 而不是从注册表安装。
  - 使用与 `pnpm openclaw qa telegram` 相同的 Telegram 环境凭证或 Convex 凭证来源。对于 CI/发布自动化，设置 `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` 加上 `OPENCLAW_QA_CONVEX_SITE_URL` 和角色密钥。如果 CI 中存在 `OPENCLAW_QA_CONVEX_SITE_URL` 和 Convex 角色密钥，Docker 包装器会自动选择 Convex。
  - 包装器在 Docker 构建/安装工作之前在主机上验证 Telegram 或 Convex 凭证环境。仅在故意调试预凭证设置时设置 `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1`。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 仅针对此通道覆盖共享的 `OPENCLAW_QA_CREDENTIAL_ROLE`。
  - GitHub Actions 将此通道公开为手动维护者工作流 `NPM Telegram Beta E2E`。它不在合并时运行。工作流使用 `qa-live-shared` 环境和 Convex CI 凭证租约。
- GitHub Actions 还为针对一个候选包的侧运行产品验证公开 `Package Acceptance`。它接受受信任的 ref、已发布的 npm 规范、HTTPS tarball URL 加 SHA-256，或来自另一个运行的 tarball 产物，将规范化的 `openclaw-current.tgz` 上传为 `package-under-test`，然后使用冒烟、包、产品、完整或自定义通道配置文件运行现有的 Docker E2E 调度器。设置 `telegram_mode=mock-openai` 或 `live-frontier` 以针对相同的 `package-under-test` 产物运行 Telegram QA 工作流。
  - 最新 beta 产品验证：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- 确切的 tarball URL 验证需要摘要：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- 产物验证从另一个 Actions 运行下载 tarball 产物：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:plugins`
  - 在 Docker 中打包和安装当前的 OpenClaw 构建，使用配置的 OpenAI 启动 Gateway，然后通过配置编辑启用捆绑的频道/插件。
  - 验证设置发现将未配置的可下载插件保留为缺失，第一次配置的 doctor 修复明确安装每个缺失的可下载插件，第二次重启不运行隐藏的依赖项修复。
  - 还安装已知的较旧 npm 基准，在运行 `openclaw update --tag <candidate>` 之前启用 Telegram，并验证候选版本的更新后 doctor 清理旧版插件依赖项碎片，而无需框架侧 postinstall 修复。
- `pnpm test:parallels:npm-update`
  - 跨 Parallels guest 运行原生打包安装更新冒烟。每个选定平台首先安装请求的基准包，然后在同一 guest 中运行已安装的 `openclaw update` 命令，并验证已安装版本、更新状态、Gateway 就绪状态和一次本地代理轮次。
  - 在一个 guest 上迭代时使用 `--platform macos`、`--platform windows` 或 `--platform linux`。使用 `--json` 获取摘要产物路径和每通道状态。
  - OpenAI 通道默认使用 `openai/gpt-5.5` 进行实时代理轮次验证。在故意验证另一个 OpenAI 模型时传递 `--model <provider/model>` 或设置 `OPENCLAW_PARALLELS_OPENAI_MODEL`。
  - 将长本地运行包装在主机超时中，以防 Parallels 传输停顿消耗剩余的测试窗口：

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - 脚本在 `/tmp/openclaw-parallels-npm-update.*` 下写入嵌套通道日志。在假设外部包装器挂起之前，先检查 `windows-update.log`、`macos-update.log` 或 `linux-update.log`。
  - Windows 更新在冷 guest 上可能会在更新后 doctor 和包更新工作中花费 10 到 15 分钟；当嵌套的 npm 调试日志还在推进时，这仍然是正常的。
  - 不要与单独的 Parallels macOS、Windows 或 Linux 冒烟通道并行运行此聚合包装器。它们共享 VM 状态，可能会在快照恢复、包服务或 guest Gateway 状态上发生冲突。
  - 更新后验证运行正常的捆绑插件界面，因为语音、图像生成和媒体理解等功能外观通过捆绑的运行时 API 加载，即使代理轮次本身只检查简单的文本响应。

- `pnpm openclaw qa aimock`
  - 仅为直接协议冒烟测试启动本地 AIMock 提供商服务器。
- `pnpm openclaw qa matrix`
  - 针对一次性 Docker 支持的 Tuwunel 家庭服务器运行矩阵实时 QA 通道。仅限源检出——打包安装不附带 `qa-lab`。
  - 完整 CLI、配置文件/场景目录、环境变量和产物布局：[矩阵 QA](/concepts/qa-matrix)。
- `pnpm openclaw qa telegram`
  - 使用来自环境的驱动程序和 SUT 机器人令牌针对真实私有群组运行 Telegram 实时 QA 通道。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。群组 ID 必须是数字 Telegram 聊天 ID。
  - 支持 `--credential-source convex` 用于共享池凭证。默认使用环境模式，或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以选择池租约。
  - 当任何场景失败时以非零退出。当您想要产物但不想有失败退出码时，使用 `--allow-failures`。
  - 需要同一私有群组中的两个不同机器人，SUT 机器人公开 Telegram 用户名。
  - 对于稳定的机器人到机器人观察，在 `@BotFather` 中为两个机器人启用机器人到机器人通信模式，并确保驱动程序机器人可以观察群组机器人流量。
  - 在 `.artifacts/qa-e2e/...` 下写入 Telegram QA 报告、摘要和观察到的消息产物。回复场景包括从驱动程序发送请求到观察到的 SUT 回复的 RTT。

实时传输通道共享一个标准合同，以便新传输不会漂移；每通道覆盖矩阵位于 [QA 概述 → 实时传输覆盖](/concepts/qa-e2e-automation#live-transport-coverage)。`qa-channel` 是广泛的合成套件，不属于该矩阵。

### 通过 Convex 共享 Telegram 凭证（v1）

当为 `openclaw qa telegram` 启用 `--credential-source convex`（或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）时，QA 实验室从 Convex 支持的池中获取独占租约，在通道运行时对该租约进行心跳，并在关闭时释放租约。

参考 Convex 项目脚手架：

- `qa/convex-credential-broker/`

必需的环境变量：

- `OPENCLAW_QA_CONVEX_SITE_URL`（例如 `https://your-deployment.convex.site`）
- 所选角色的一个密钥：
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 用于 `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` 用于 `ci`
- 凭证角色选择：
  - CLI：`--credential-role maintainer|ci`
  - 环境默认值：`OPENCLAW_QA_CREDENTIAL_ROLE`（在 CI 中默认为 `ci`，否则为 `maintainer`）

可选的环境变量：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS`（默认 `1200000`）
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS`（默认 `30000`）
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS`（默认 `90000`）
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS`（默认 `15000`）
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX`（默认 `/qa-credentials/v1`）
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID`（可选追踪 ID）
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允许仅用于本地开发的回环 `http://` Convex URL。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常操作中应使用 `https://`。

维护者管理命令（池添加/删除/列表）特别需要 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

维护者的 CLI 助手：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在实时运行之前使用 `doctor` 检查 Convex 站点 URL、代理密钥、端点前缀、HTTP 超时和管理员/列表可达性，而不打印密钥值。使用 `--json` 获取脚本和 CI 实用程序中的机器可读输出。

默认端点合同（`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`）：

- `POST /acquire`
  - 请求：`{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功：`{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 已耗尽/可重试：`{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功：`{ status: "ok" }`（或空 `2xx`）
- `POST /release`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功：`{ status: "ok" }`（或空 `2xx`）
- `POST /admin/add`（仅限维护者密钥）
  - 请求：`{ kind, actorId, payload, note?, status? }`
  - 成功：`{ status: "ok", credential }`
- `POST /admin/remove`（仅限维护者密钥）
  - 请求：`{ credentialId, actorId }`
  - 成功：`{ status: "ok", changed, credential }`
  - 活动租约保护：`{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list`（仅限维护者密钥）
  - 请求：`{ kind?, status?, includePayload?, limit? }`
  - 成功：`{ status: "ok", credentials, count }`

Telegram 类型的负载形状：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必须是数字 Telegram 聊天 ID 字符串。
- `admin/add` 为 `kind: "telegram"` 验证此形状，并拒绝格式错误的负载。

### 向 QA 添加频道

新频道适配器的架构和场景助手名称位于 [QA 概述 → 添加频道](/concepts/qa-e2e-automation#adding-a-channel)。最低要求：在共享 `qa-lab` 主机接缝上实现传输运行器，在插件清单中声明 `qaRunners`，作为 `openclaw qa <runner>` 挂载，并在 `qa/scenarios/` 下编写场景。

## 测试套件（在哪里运行什么）

将套件视为"增加的真实性"（以及增加的不稳定性/成本）：

### 单元 / 集成（默认）

- 命令：`pnpm test`
- 配置：无目标运行使用 `vitest.full-*.config.ts` 分片集，可能会将多项目分片展开为每项目配置以进行并行调度
- 文件：`src/**/*.test.ts`、`packages/**/*.test.ts` 和 `test/**/*.test.ts` 下的核心/单元清单；UI 单元测试在专用 `unit-ui` 分片中运行
- 范围：
  - 纯单元测试
  - 进程内集成测试（Gateway 认证、路由、工具、解析、配置）
  - 已知 bug 的确定性回归
- 期望：
  - 在 CI 中运行
  - 不需要真实密钥
  - 应该快速稳定
  - 解析器和公共界面加载器测试必须使用生成的小型插件固件而不是真实的捆绑插件源 API 来证明广泛的 `api.js` 和 `runtime-api.js` 回退行为。真实的插件 API 加载属于插件拥有的合同/集成套件。

<AccordionGroup>
  <Accordion title="项目、分片和范围通道">

    - 无目标的 `pnpm test` 运行十二个较小的分片配置（`core-unit-fast`、`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一个巨大的原生根项目进程。这减少了高负载机器上的峰值 RSS，并避免自动回复/扩展工作使不相关的套件饥饿。
    - `pnpm test --watch` 仍然使用原生根 `vitest.config.ts` 项目图，因为多分片监视循环不实用。
    - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 首先通过范围通道路由显式文件/目录目标，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 避免支付完整根项目启动税。
    - `pnpm test:changed` 默认将更改的 git 路径展开到廉价的范围通道中：直接测试编辑、同级 `*.test.ts` 文件、显式源映射和本地导入图依赖项。配置/设置/包编辑不会广泛运行测试，除非您明确使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm check:changed` 是用于窄工作的正常智能本地检查门控。它将差异分类为核心、核心测试、扩展、扩展测试、应用、文档、发布元数据、实时 Docker 工具和工具，然后运行匹配的类型检查、lint 和保护命令。它不运行 Vitest 测试；调用 `pnpm test:changed` 或显式 `pnpm test <target>` 进行测试验证。仅版本字段版本更新运行目标版本/配置/根依赖项检查，以及拒绝顶级版本字段之外的包更改的保护。
    - 实时 Docker ACP 框架编辑运行重点检查：实时 Docker 认证脚本的 Shell 语法和实时 Docker 调度器空运行。`package.json` 更改仅在差异仅限于 `scripts["test:docker:live-*"]` 时包含；依赖项、导出、版本和其他包界面编辑仍使用更广泛的保护。
    - 来自代理、命令、插件、自动回复助手、`plugin-sdk` 和类似纯实用程序区域的轻量导入单元测试通过 `unit-fast` 通道路由，该通道跳过 `test/setup-openclaw-runtime.ts`；有状态/运行时繁重的文件保持在现有通道上。
    - 所选 `plugin-sdk` 和 `commands` 助手源文件还将更改模式运行映射到那些轻量通道中的显式同级测试，因此助手编辑避免为该目录重新运行完整的繁重套件。
    - `auto-reply` 对顶级核心助手、顶级 `reply.*` 集成测试和 `src/auto-reply/reply/**` 子树有专用桶。CI 进一步将 reply 子树分割为 agent-runner、dispatch 和 commands/state-routing 分片，以避免一个导入繁重的桶拥有完整的 Node 尾部。
    - 正常的 PR/main CI 有意跳过扩展批量扫描和仅发布的 `agentic-plugins` 分片。完整发布验证为发布候选版本分发单独的 `Plugin Prerelease` 子工作流用于那些插件/扩展繁重的套件。

  </Accordion>

  <Accordion title="嵌入式运行器覆盖">

    - 当您更改消息工具发现输入或压缩运行时上下文时，保持两个级别的覆盖。
    - 为纯路由和规范化边界添加重点助手回归。
    - 保持嵌入式运行器集成套件健康：`src/agents/pi-embedded-runner/compact.hooks.test.ts`、`src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和 `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
    - 那些套件验证范围 ID 和压缩行为仍通过真实的 `run.ts` / `compact.ts` 路径流动；仅助手测试不足以替代那些集成路径。

  </Accordion>

  <Accordion title="Vitest 池和隔离默认值">

    - 基础 Vitest 配置默认为 `threads`。
    - 共享 Vitest 配置在根项目、e2e 和实时配置中固定 `isolate: false` 并使用非隔离运行器。
    - 根 UI 通道保持其 `jsdom` 设置和优化器，但也在共享非隔离运行器上运行。
    - 每个 `pnpm test` 分片从共享 Vitest 配置继承相同的 `threads` + `isolate: false` 默认值。
    - `scripts/run-vitest.mjs` 默认为 Vitest 子 Node 进程添加 `--no-maglev` 以减少大型本地运行期间的 V8 编译流失。设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 以与标准 V8 行为进行比较。

  </Accordion>

  <Accordion title="快速本地迭代">

    - `pnpm changed:lanes` 显示差异触发哪些架构通道。
    - 预提交钩子仅格式化。它重新暂存已格式化的文件，不运行 lint、类型检查或测试。
    - 在切换或推送前明确运行 `pnpm check:changed`，当您需要智能本地检查门控时。
    - `pnpm test:changed` 默认通过廉价的范围通道路由。仅当代理决定框架、配置、包或合同编辑真的需要更广泛的 Vitest 覆盖时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行为，只是具有更高的工作进程上限。
    - 本地工作进程自动缩放故意保守，并在主机负载平均值已经很高时退出，因此多个并发 Vitest 运行默认危害较小。
    - 基础 Vitest 配置将项目/配置文件标记为 `forceRerunTriggers`，以便当测试连接更改时，更改模式重新运行保持正确。
    - 配置在受支持的主机上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 启用；如果您想要一个用于直接分析的明确缓存位置，设置 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。

  </Accordion>

  <Accordion title="性能调试">

    - `pnpm test:perf:imports` 启用 Vitest 导入持续时间报告加上导入分解输出。
    - `pnpm test:perf:imports:changed` 将相同的分析视图限定为自 `origin/main` 以来更改的文件。
    - 分片计时数据写入 `.artifacts/vitest-shard-timings.json`。整个配置运行使用配置路径作为键；包含模式 CI 分片附加分片名称，以便过滤的分片可以单独跟踪。
    - 当一个热测试仍然将其大部分时间花在启动导入上时，将繁重的依赖项保持在一个窄的本地 `*.runtime.ts` 接缝后面，并直接模拟该接缝，而不是深度导入运行时助手只是为了将它们传递给 `vi.mock(...)`。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 比较路由的 `test:changed` 与该提交差异的原生根项目路径，并打印挂钟时间加上 macOS 最大 RSS。
    - `pnpm test:perf:changed:bench -- --worktree` 通过 `scripts/test-projects.mjs` 和根 Vitest 配置路由更改的文件列表来基准测试当前脏树。
    - `pnpm test:perf:profile:main` 为 Vitest/Vite 启动和转换开销写入主线程 CPU 配置文件。
    - `pnpm test:perf:profile:runner` 在禁用文件并行的情况下为单元套件写入运行器 CPU+堆配置文件。

  </Accordion>
</AccordionGroup>

### 稳定性（Gateway）

- 命令：`pnpm test:stability:gateway`
- 配置：`vitest.gateway.config.ts`，强制为一个工作进程
- 范围：
  - 使用默认启用诊断的真实回环 Gateway 启动
  - 通过诊断事件路径驱动合成 Gateway 消息、内存和大负载流失
  - 通过 Gateway WS RPC 查询 `diagnostics.stability`
  - 覆盖诊断稳定性捆绑持久性助手
  - 断言记录器保持有界，合成 RSS 样本保持在压力预算下，每会话队列深度排干回零
- 期望：
  - CI 安全且无需密钥
  - 用于稳定性回归跟进的窄通道，不是完整 Gateway 套件的替代品

### E2E（Gateway 冒烟）

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts` 和 `extensions/` 下的捆绑插件 E2E 测试
- 运行时默认值：
  - 使用 Vitest `threads` 加 `isolate: false`，与仓库其余部分匹配。
  - 使用自适应工作进程（CI：最多 2 个，本地：默认 1 个）。
  - 默认以静默模式运行以减少控制台 I/O 开销。
- 有用的覆盖：
  - `OPENCLAW_E2E_WORKERS=<n>` 强制工作进程数量（上限为 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 重新启用详细控制台输出。
- 范围：
  - 多实例 Gateway 端到端行为
  - WebSocket/HTTP 界面、节点配对和较繁重的网络
- 期望：
  - 在 CI 中运行（在管道中启用时）
  - 不需要真实密钥
  - 比单元测试有更多活动部件（可能更慢）

### E2E：OpenShell 后端冒烟

- 命令：`pnpm test:e2e:openshell`
- 文件：`extensions/openshell/src/backend.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动隔离的 OpenShell Gateway
  - 从临时本地 Dockerfile 创建沙箱
  - 通过真实的 `sandbox ssh-config` + SSH exec 在 OpenClaw 的 OpenShell 后端上执行
  - 通过沙箱 fs 桥验证远程规范文件系统行为
- 期望：
  - 仅可选加入；不是默认 `pnpm test:e2e` 运行的一部分
  - 需要本地 `openshell` CLI 加上工作的 Docker 守护进程
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试 Gateway 和沙箱
- 有用的覆盖：
  - `OPENCLAW_E2E_OPENSHELL=1` 在手动运行更广泛的 e2e 套件时启用测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 指向非默认 CLI 二进制文件或包装脚本

### 实时（真实提供商 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`、`test/**/*.live.test.ts` 和 `extensions/` 下的捆绑插件实时测试
- 默认：由 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - "这个提供商/模型今天真的用真实凭证工作吗？"
  - 捕获提供商格式更改、工具调用怪癖、认证问题和速率限制行为
- 期望：
  - 设计上不是 CI 稳定的（真实网络、真实提供商策略、配额、中断）
  - 花费金钱/使用速率限制
  - 优先运行缩小的子集而不是"所有内容"
- 实时运行来源 `~/.profile` 以获取缺少的 API 密钥。
- 默认情况下，实时运行仍然隔离 `HOME` 并将配置/认证材料复制到临时测试主目录，以便单元固件不会改变您真实的 `~/.openclaw`。
- 仅当您故意需要实时测试使用您真实的主目录时，设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 现在默认为更安静的模式：保持 `[live] ...` 进度输出，但抑制额外的 `~/.profile` 通知并静默 Gateway 启动日志/Bonjour 噪音。如果您想要完整的启动日志，设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（特定于提供商）：使用逗号/分号格式设置 `*_API_KEYS`，或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或通过 `OPENCLAW_LIVE_*_KEY` 进行每次实时覆盖；测试在速率限制响应时重试。
- 进度/心跳输出：
  - 实时套件现在向 stderr 发出进度行，以便即使 Vitest 控制台捕获安静时，长时间的提供商调用也可见地处于活动状态。
  - `vitest.live.config.ts` 禁用 Vitest 控制台拦截，以便提供商/Gateway 进度行在实时运行期间立即流式传输。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整 Gateway/探针心跳。

## 我应该运行哪个套件？

使用此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果更改了很多，还有 `pnpm test:coverage`）
- 修改 Gateway 网络 / WS 协议 / 配对：添加 `pnpm test:e2e`
- 调试"我的机器人故障"/ 特定提供商故障 / 工具调用：运行缩小的 `pnpm test:live`

## 实时（触及网络）测试

有关实时模型矩阵、CLI 后端冒烟、ACP 冒烟、Codex 应用服务器框架和所有媒体提供商实时测试（Deepgram、BytePlus、ComfyUI、图像、音乐、视频、媒体框架）——加上实时运行的凭证处理——请参阅[实时测试套件](/help/testing-live)。有关专用更新和插件验证清单，请参阅[测试更新和插件](/help/testing-updates-plugins)。

## Docker 运行器（可选的"在 Linux 上运行"检查）

这些 Docker 运行器分为两个桶：

- 实时模型运行器：`test:docker:live-models` 和 `test:docker:live-gateway` 仅在仓库 Docker 镜像中运行其匹配的配置文件密钥实时文件（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），挂载您的本地配置目录和工作区（如果已挂载，则来源 `~/.profile`）。匹配的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 实时运行器默认为更小的冒烟上限，以便完整的 Docker 扫描保持实用：`test:docker:live-models` 默认为 `OPENCLAW_LIVE_MAX_MODELS=12`，`test:docker:live-gateway` 默认为 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、`OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、`OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和 `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。当您明确需要更大的详尽扫描时，覆盖那些环境变量。
- `test:docker:all` 通过 `test:docker:live-build` 构建一次实时 Docker 镜像，通过 `scripts/package-openclaw-for-docker.mjs` 将 OpenClaw 打包一次为 npm tarball，然后构建/重用两个 `scripts/e2e/Dockerfile` 镜像。裸镜像只是安装/更新/插件依赖通道的 Node/Git 运行器；那些通道挂载预构建的 tarball。功能镜像将相同的 tarball 安装到 `/app` 用于构建应用功能通道。Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 执行所选计划。聚合使用加权本地调度器：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制进程槽，而资源上限防止繁重的实时、npm 安装和多服务通道全部同时启动。如果单个通道比活动上限更重，调度器仍然可以在池为空时启动它，然后让它单独运行直到容量再次可用。默认值为 10 个槽、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；仅当 Docker 主机有更多余量时才调整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。运行器默认执行 Docker 预飞检查，删除陈旧的 OpenClaw E2E 容器，每 30 秒打印状态，将成功的通道计时存储在 `.artifacts/docker-tests/lane-timings.json` 中，并在以后的运行中使用那些计时首先启动较长的通道。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 打印加权通道清单而不构建或运行 Docker，或使用 `node scripts/test-docker-all.mjs --plan-json` 打印所选通道、包/镜像需求和凭证的 CI 计划。
- `Package Acceptance` 是 GitHub 原生包门控，用于"这个可安装的 tarball 作为产品工作吗？"它从 `source=npm`、`source=ref`、`source=url` 或 `source=artifact` 解析一个候选包，将其上传为 `package-under-test`，然后针对该确切 tarball 运行可重用的 Docker E2E 通道，而不是重新打包所选 ref。配置文件按广度排序：`smoke`、`package`、`product` 和 `full`。有关包/更新/插件合同、已发布升级幸存者矩阵、发布默认值和故障分类，请参阅[测试更新和插件](/help/testing-updates-plugins)。
- 构建和发布检查在 tsdown 之后运行 `scripts/check-cli-bootstrap-imports.mjs`。保护从 `dist/entry.js` 和 `dist/cli/run-main.js` 遍历静态构建图，如果预分发启动导入在命令分发之前的包依赖项（如 Commander、prompt UI、undici 或日志记录）则失败；它还将捆绑的 Gateway 运行块保持在预算内，并拒绝已知冷 Gateway 路径的静态导入。打包的 CLI 冒烟还覆盖根帮助、引导帮助、doctor 帮助、状态、配置模式和模型列表命令。
- 包验收旧版兼容性上限为 `2026.4.25`（包括 `2026.4.25-beta.*`）。通过该截止日期，框架仅容忍已发布包的元数据缺口：省略的私有 QA 清单条目、缺少 `gateway install --wrapper`、tarball 派生 git 固件中缺少补丁文件、缺少持久化的 `update.channel`、旧版插件安装记录位置、缺少市场安装记录持久化，以及 `plugins update` 期间的配置元数据迁移。对于 `2026.4.25` 之后的包，那些路径是严格失败。
- 容器冒烟运行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:update-channel-switch`、`test:docker:upgrade-survivor`、`test:docker:published-upgrade-survivor`、`test:docker:session-runtime-context`、`test:docker:agents-delete-shared-workspace`、`test:docker:gateway-network`、`test:docker:browser-cdp-snapshot`、`test:docker:mcp-channels`、`test:docker:pi-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update`、`test:docker:plugin-lifecycle-matrix` 和 `test:docker:config-reload` 启动一个或多个真实容器并验证更高级别的集成路径。

实时模型 Docker 运行器还仅绑定挂载所需的 CLI 认证主目录（或当运行没有缩小时挂载所有受支持的目录），然后在测试开始之前将它们复制到容器主目录，以便外部 CLI OAuth 可以刷新令牌而不改变主机认证存储：

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- ACP 绑定冒烟：`pnpm test:docker:live-acp-bind`（脚本：`scripts/test-live-acp-bind-docker.sh`；默认覆盖 Claude、Codex 和 Gemini，通过 `pnpm test:docker:live-acp-bind:droid` 和 `pnpm test:docker:live-acp-bind:opencode` 进行严格的 Droid/OpenCode 覆盖）
- CLI 后端冒烟：`pnpm test:docker:live-cli-backend`（脚本：`scripts/test-live-cli-backend-docker.sh`）
- Codex 应用服务器框架冒烟：`pnpm test:docker:live-codex-harness`（脚本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- 可观察性冒烟：`pnpm qa:otel:smoke` 是私有 QA 源检出通道。它有意不属于包 Docker 发布通道，因为 npm tarball 省略了 QA Lab。
- Open WebUI 实时冒烟：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 引导向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Npm tarball 引导/频道/代理冒烟：`pnpm test:docker:npm-onboard-channel-agent` 在 Docker 中全局安装打包的 OpenClaw tarball，通过环境引用引导加上默认 Telegram 配置 OpenAI，运行 doctor，并针对模拟的 OpenAI 端点运行一次本地代理轮次。使用 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用预构建的 tarball，使用 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳过主机重建，或使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 切换频道。
- 更新频道切换冒烟：`pnpm test:docker:update-channel-switch` 在 Docker 中全局安装打包的 OpenClaw tarball，从包 `stable` 切换到 git `dev`，验证持久化的频道和插件更新后工作，然后切换回包 `stable` 并检查更新状态。
- 升级幸存者冒烟：`pnpm test:docker:upgrade-survivor` 在具有代理、频道配置、插件白名单、陈旧插件依赖状态和现有工作区/会话文件的脏旧用户固件上安装打包的 OpenClaw tarball。它在没有实时提供商或频道密钥的情况下运行包更新加非交互式 doctor，然后启动回环 Gateway 并检查配置/状态保留加启动/状态预算。
- 已发布升级幸存者冒烟：`pnpm test:docker:published-upgrade-survivor` 默认安装 `openclaw@latest`，播种真实现有用户文件，用烘焙的命令方案配置该基准，验证结果配置，将该已发布安装更新到候选 tarball，运行非交互式 doctor，写入 `.artifacts/upgrade-survivor/summary.json`，然后启动回环 Gateway 并检查配置的意图、状态保留、启动、`/healthz`、`/readyz` 和 RPC 状态预算。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖一个基准，要求聚合调度器使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`（如 `all-since-2026.4.23`）展开确切基准，并使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`（如 `reported-issues`）展开问题形状固件；报告问题集包括 `configured-plugin-installs` 用于自动外部 OpenClaw 插件安装修复。包验收将那些公开为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`。
- 会话运行时上下文冒烟：`pnpm test:docker:session-runtime-context` 验证隐藏运行时上下文脚本持久化加上受影响的重复提示重写分支的 doctor 修复。
- Bun 全局安装冒烟：`bash scripts/e2e/bun-global-install-smoke.sh` 打包当前树，在隔离的主目录中使用 `bun install -g` 安装它，并验证 `openclaw infer image providers --json` 返回捆绑的图像提供商而不是挂起。使用 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用预构建的 tarball，使用 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳过主机构建，或使用 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 从构建的 Docker 镜像复制 `dist/`。
- 安装程序 Docker 冒烟：`bash scripts/test-install-sh-docker.sh` 在其根、更新和直接 npm 容器之间共享一个 npm 缓存。更新冒烟默认在升级到候选 tarball 之前以 npm `latest` 作为稳定基准。在本地使用 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` 覆盖，或在 GitHub 上使用安装冒烟工作流的 `update_baseline_version` 输入。非根安装程序检查保持隔离的 npm 缓存，以便根拥有的缓存条目不会掩盖用户本地安装行为。设置 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` 以在本地重新运行之间重用根/更新/直接 npm 缓存。
- 安装冒烟 CI 使用 `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳过重复的直接 npm 全局更新；在本地不使用该环境运行脚本，当需要直接 `npm install -g` 覆盖时。
- 代理删除共享工作区 CLI 冒烟：`pnpm test:docker:agents-delete-shared-workspace`（脚本：`scripts/e2e/agents-delete-shared-workspace-docker.sh`）默认构建根 Dockerfile 镜像，在隔离的容器主目录中播种两个具有一个工作区的代理，运行 `agents delete --json`，并验证有效的 JSON 加上保留的工作区行为。使用 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 重用安装冒烟镜像。
- Gateway 网络（两个容器，WS 认证 + 健康）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 浏览器 CDP 快照冒烟：`pnpm test:docker:browser-cdp-snapshot`（脚本：`scripts/e2e/browser-cdp-snapshot-docker.sh`）构建源 E2E 镜像加上 Chromium 层，使用原始 CDP 启动 Chromium，运行 `browser doctor --deep`，并验证 CDP 角色快照覆盖链接 URL、光标提升的可点击项、iframe 引用和框架元数据。
- OpenAI Responses web_search 最小推理回归：`pnpm test:docker:openai-web-search-minimal`（脚本：`scripts/e2e/openai-web-search-minimal-docker.sh`）通过 Gateway 运行模拟的 OpenAI 服务器，验证 `web_search` 将 `reasoning.effort` 从 `minimal` 提高到 `low`，然后强制提供商模式拒绝并检查原始详情出现在 Gateway 日志中。
- MCP 频道桥（播种的 Gateway + stdio 桥 + 原始 Claude 通知帧冒烟）：`pnpm test:docker:mcp-channels`（脚本：`scripts/e2e/mcp-channels-docker.sh`）
- Pi 捆绑 MCP 工具（真实 stdio MCP 服务器 + 嵌入式 Pi 配置文件允许/拒绝冒烟）：`pnpm test:docker:pi-bundle-mcp-tools`（脚本：`scripts/e2e/pi-bundle-mcp-tools-docker.sh`）
- Cron/子代理 MCP 清理（真实 Gateway + 隔离 cron 和一次性子代理运行后的 stdio MCP 子进程拆除）：`pnpm test:docker:cron-mcp-cleanup`（脚本：`scripts/e2e/cron-mcp-cleanup-docker.sh`）
- 插件（本地路径、`file:`、带提升依赖项的 npm 注册表、git 移动引用、ClawHub 厨房水槽、市场更新和 Claude 捆绑包启用/检查的安装/更新冒烟）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 跳过 ClawHub 块，或使用 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆盖默认的厨房水槽包/运行时对。如果没有 `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`，测试使用封闭的本地 ClawHub 固件服务器。
- 插件更新不变冒烟：`pnpm test:docker:plugin-update`（脚本：`scripts/e2e/plugin-update-unchanged-docker.sh`）
- 插件生命周期矩阵冒烟：`pnpm test:docker:plugin-lifecycle-matrix` 在裸容器中安装打包的 OpenClaw tarball，安装 npm 插件，切换启用/禁用，通过本地 npm 注册表升级和降级它，删除已安装的代码，然后验证卸载仍然删除陈旧状态，同时记录每个生命周期阶段的 RSS/CPU 指标。
- 配置重新加载元数据冒烟：`pnpm test:docker:config-reload`（脚本：`scripts/e2e/config-reload-source-docker.sh`）

手动预构建和重用共享功能镜像：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

套件特定的镜像覆盖（如 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`）在设置时仍然优先。当 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向远程共享镜像时，脚本在镜像不在本地时拉取它。QR 和安装程序 Docker 测试保留自己的 Dockerfile，因为它们验证包/安装行为，而不是共享的构建应用运行时。

实时模型 Docker 运行器还以只读方式绑定挂载当前检出，并将其分阶段放入容器内的临时工作目录。这使运行时镜像保持精简，同时仍然针对您确切的本地源/配置运行 Vitest。分阶段步骤跳过大型本地缓存和应用构建输出，如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__` 和应用本地 `.build` 或 Gradle 输出目录，因此 Docker 实时运行不会花费几分钟复制机器特定的产物。它们还设置 `OPENCLAW_SKIP_CHANNELS=1`，以便 Gateway 实时探针不会在容器内启动真实的 Telegram/Discord/etc. 频道工作进程。`test:docker:live-models` 仍然运行 `pnpm test:live`，因此当您需要从该 Docker 通道缩小或排除 Gateway 实时覆盖时，也传递 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是更高级别的兼容性冒烟：它使用启用的 OpenAI 兼容 HTTP 端点启动 OpenClaw Gateway 容器，针对该 Gateway 启动固定的 Open WebUI 容器，通过 Open WebUI 登录，验证 `/api/models` 公开 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送真实的聊天请求。第一次运行可能明显较慢，因为 Docker 可能需要拉取 Open WebUI 镜像，而 Open WebUI 可能需要完成自己的冷启动设置。此通道需要可用的实时模型密钥，`OPENCLAW_PROFILE_FILE`（默认 `~/.profile`）是在 Dockerized 运行中提供它的主要方式。成功的运行打印一个小型 JSON 负载，如 `{ "ok": true, "model": "openclaw/default", ... }`。`test:docker:mcp-channels` 有意是确定性的，不需要真实的 Telegram、Discord 或 iMessage 帐户。它启动一个播种的 Gateway 容器，启动第二个生成 `openclaw mcp serve` 的容器，然后验证路由对话发现、脚本读取、附件元数据、实时事件队列行为、出站发送路由，以及通过真实 stdio MCP 桥的 Claude 样式频道 + 权限通知。通知检查直接检查原始 stdio MCP 帧，因此冒烟验证桥实际发出的内容，而不仅仅是特定客户端 SDK 碰巧公开的内容。`test:docker:pi-bundle-mcp-tools` 是确定性的，不需要实时模型密钥。它构建仓库 Docker 镜像，在容器内启动一个真实的 stdio MCP 探针服务器，通过嵌入式 Pi 捆绑 MCP 运行时实例化该服务器，执行工具，然后验证 `coding` 和 `messaging` 保留 `bundle-mcp` 工具，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 过滤它们。`test:docker:cron-mcp-cleanup` 是确定性的，不需要实时模型密钥。它使用真实的 stdio MCP 探针服务器启动播种的 Gateway，运行隔离的 cron 轮次和 `/subagents spawn` 一次性子轮次，然后验证 MCP 子进程在每次运行后退出。

手动 ACP 纯语言线程冒烟（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此脚本用于回归/调试工作流。它可能再次需要用于 ACP 线程路由验证，因此不要删除它。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试之前来源
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 仅验证从 `OPENCLAW_PROFILE_FILE` 来源的环境变量，使用临时配置/工作区目录且没有外部 CLI 认证挂载
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认：`~/.cache/openclaw/docker-cli-tools`）挂载到 `/home/node/.npm-global` 用于 Docker 内缓存的 CLI 安装
- `$HOME` 下的外部 CLI 认证目录/文件以只读方式挂载在 `/host-auth...` 下，然后在测试开始之前复制到 `/home/node/...`
  - 默认目录：`.minimax`
  - 默认文件：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 缩小的提供商运行仅挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断的所需目录/文件
  - 手动覆盖使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗号列表如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 缩小运行
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 过滤容器内的提供商
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 重用现有的 `openclaw:local-live` 镜像用于不需要重建的重新运行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 确保凭证来自配置文件存储（非环境）
- `OPENCLAW_OPENWEBUI_MODEL=...` 选择 Gateway 为 Open WebUI 冒烟公开的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 覆盖 Open WebUI 冒烟使用的 nonce 检查提示
- `OPENWEBUI_IMAGE=...` 覆盖固定的 Open WebUI 镜像标签

## 文档健全性

在文档编辑后运行文档检查：`pnpm check:docs`。当您还需要页内标题检查时，运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## 离线回归（CI 安全）

这些是"真实管道"回归，没有真实提供商：

- Gateway 工具调用（模拟 OpenAI，真实 Gateway + 代理循环）：`src/gateway/gateway.test.ts`（案例："通过 Gateway 代理循环端到端运行模拟的 OpenAI 工具调用"）
- Gateway 向导（WS `wizard.start`/`wizard.next`，写入配置 + 强制认证）：`src/gateway/gateway.test.ts`（案例："通过 ws 运行向导并写入认证令牌配置"）

## 代理可靠性评估（技能）

我们已经有一些表现得像"代理可靠性评估"的 CI 安全测试：

- 通过真实 Gateway + 代理循环的模拟工具调用（`src/gateway/gateway.test.ts`）。
- 验证会话连接和配置效果的端到端向导流程（`src/gateway/gateway.test.ts`）。

技能仍然缺少的内容（参见[技能](/tools/skills)）：

- **决策：**当技能列在提示中时，代理是否选择了正确的技能（或避免了不相关的技能）？
- **合规性：**代理在使用前是否读取 `SKILL.md` 并遵循必需的步骤/参数？
- **工作流合同：**断言工具顺序、会话历史延续和沙箱边界的多轮场景。

未来的评估应该首先保持确定性：

- 使用模拟提供商断言工具调用 + 顺序、技能文件读取和会话连接的场景运行器。
- 一小套以技能为重点的场景（使用与避免、门控、提示注入）。
- 可选的实时评估（可选加入，环境门控）仅在 CI 安全套件到位后。

## 合同测试（插件和频道形状）

合同测试验证每个注册的插件和频道是否符合其接口合同。它们迭代所有已发现的插件并运行一套形状和行为断言。默认的 `pnpm test` 单元通道有意跳过这些共享接缝和冒烟文件；当您修改共享频道或提供商界面时，明确运行合同命令。

### 命令

- 所有合同：`pnpm test:contracts`
- 仅频道合同：`pnpm test:contracts:channels`
- 仅提供商合同：`pnpm test:contracts:plugins`

### 频道合同

位于 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** — 基本插件形状（ID、名称、能力）
- **setup** — 设置向导合同
- **session-binding** — 会话绑定行为
- **outbound-payload** — 消息负载结构
- **inbound** — 入站消息处理
- **actions** — 频道动作处理程序
- **threading** — 线程 ID 处理
- **directory** — 目录/花名册 API
- **group-policy** — 群组策略执行

### 提供商状态合同

位于 `src/plugins/contracts/*.contract.test.ts`：

- **status** — 频道状态探针
- **registry** — 插件注册表形状

### 提供商合同

位于 `src/plugins/contracts/*.contract.test.ts`：

- **auth** — 认证流程合同
- **auth-choice** — 认证选择/选择
- **catalog** — 模型目录 API
- **discovery** — 插件发现
- **loader** — 插件加载
- **runtime** — 提供商运行时
- **shape** — 插件形状/接口
- **wizard** — 设置向导

### 何时运行

- 更改 plugin-sdk 导出或子路径后
- 添加或修改频道或提供商插件后
- 重构插件注册或发现后

合同测试在 CI 中运行，不需要真实的 API 密钥。

## 添加回归（指南）

修复在实时中发现的提供商/模型问题时：

- 如果可能，添加 CI 安全回归（模拟/存根提供商，或捕获确切的请求形状转换）
- 如果本质上只是实时（速率限制、认证策略），保持实时测试窄且通过环境变量可选加入
- 优先针对捕获 bug 的最小层：
  - 提供商请求转换/重放 bug → 直接模型测试
  - Gateway 会话/历史/工具管道 bug → Gateway 实时冒烟或 CI 安全 Gateway 模拟测试
- SecretRef 遍历护栏：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据（`listSecretTargetRegistryEntries()`）中为每个 SecretRef 类派生一个采样目标，然后断言遍历段 exec ID 被拒绝。
  - 如果您在 `src/secrets/target-registry-data.ts` 中添加新的 `includeInPlan` SecretRef 目标族，请在该测试中更新 `classifyTargetClass`。测试有意在未分类的目标 ID 上失败，以便新类不会被静默跳过。

## 相关链接

- [实时测试](/help/testing-live)
- [测试更新和插件](/help/testing-updates-plugins)
- [CI](/ci)
