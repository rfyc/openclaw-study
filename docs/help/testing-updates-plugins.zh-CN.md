---
summary: "OpenClaw 如何验证更新路径、包迁移和插件安装/更新行为"
read_when:
  - 更改 OpenClaw 更新、doctor、包验收或插件安装行为
  - 准备或批准发布候选版本
  - 调试包更新、插件依赖清理或插件安装回归
title: "测试：更新和插件"
sidebarTitle: "更新和插件测试"
---

这是更新和插件验证的专用清单。目标很简单：证明可安装包能够更新真实用户状态，通过 `doctor` 修复陈旧的旧版状态，并且仍然能够从受支持的来源安装、加载、更新和卸载插件。

有关更广泛的测试运行器地图，请参阅[测试](/help/testing)。有关实时提供商密钥和触及网络的套件，请参阅[实时测试](/help/testing-live)。

## 我们保护的内容

更新和插件测试保护以下合同：

- 包 tarball 是完整的，有一个有效的 `dist/postinstall-inventory.json`，并且不依赖于未打包的仓库文件。
- 用户可以从较旧的已发布包迁移到候选包，而不会丢失配置、代理、会话、工作区、插件白名单或频道配置。
- `openclaw doctor --fix --non-interactive` 拥有旧版清理和修复路径。启动时不应为陈旧的插件状态增加隐藏的兼容性迁移。
- 插件安装可从本地目录、git 仓库、npm 包和 ClawHub 注册表路径运行。
- 插件 npm 依赖项安装在托管 npm 根目录中，在信任之前进行扫描，并在卸载期间通过 npm 删除，以避免提升的依赖项残留。
- 当没有任何更改时，插件更新是稳定的：安装记录、解析的来源、已安装的依赖项布局和启用状态保持不变。

## 开发期间的本地验证

从最小范围开始：

```bash
pnpm changed:lanes --json
pnpm check:changed
pnpm test:changed
```

对于插件安装、卸载、依赖项或包清单更改，还要运行覆盖已编辑接缝的重点测试：

```bash
pnpm test src/plugins/uninstall.test.ts src/infra/package-dist-inventory.test.ts test/scripts/package-acceptance-workflow.test.ts
```

在任何包 Docker 通道使用 tarball 之前，先验证包产物：

```bash
pnpm release:check
```

`release:check` 运行配置/文档/API 漂移检查，写入包分发清单，运行 `npm pack --dry-run`，拒绝禁止的打包文件，将 tarball 安装到临时前缀，运行 postinstall，并冒烟测试捆绑的频道入口点。

## Docker 通道

Docker 通道是产品级别的验证。它们在 Linux 容器内安装或更新真实包，并通过 CLI 命令、Gateway 启动、HTTP 探针、RPC 状态和文件系统状态断言行为。

在迭代时使用重点通道：

```bash
pnpm test:docker:plugins
pnpm test:docker:plugin-lifecycle-matrix
pnpm test:docker:plugin-update
pnpm test:docker:upgrade-survivor
pnpm test:docker:published-upgrade-survivor
pnpm test:docker:update-migration
```

重要通道：

- `test:docker:plugins` 验证插件安装冒烟、本地文件夹安装、本地文件夹更新跳过行为、具有预装依赖项的本地文件夹、`file:` 包安装、带 CLI 执行的 git 安装、git 移动引用更新、带提升传递依赖项的 npm 注册表安装、npm 更新无操作、本地 ClawHub 固件安装和更新无操作、市场更新行为，以及 Claude 捆绑包启用/检查。设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 以保持 ClawHub 块离线运行。
- `test:docker:plugin-lifecycle-matrix` 在裸容器中安装候选包，通过安装、检查、禁用、启用、显式升级、显式降级和删除插件代码后卸载来运行 npm 插件。它记录每个阶段的 RSS 和 CPU 指标。
- `test:docker:plugin-update` 验证当没有任何更改时，已安装的插件在 `openclaw plugins update` 期间不会重新安装或丢失安装元数据。
- `test:docker:upgrade-survivor` 在脏旧用户固件上安装候选 tarball，运行包更新加非交互式 doctor，然后启动回环 Gateway 并检查状态保留。
- `test:docker:published-upgrade-survivor` 首先安装已发布的基准版本，通过烘焙的 `openclaw config set` 方案配置它，将其更新到候选 tarball，运行 doctor，检查旧版清理，启动 Gateway，并探测 `/healthz`、`/readyz` 和 RPC 状态。
- `test:docker:update-migration` 是清理密集型已发布更新通道。它从配置的 Discord/Telegram 样式用户状态开始，运行基准 doctor 以便配置的插件依赖项有机会实例化，为配置的打包插件播种旧版插件依赖项碎片，更新到候选 tarball，并要求更新后的 doctor 删除旧版依赖项根目录。

有用的已发布升级幸存者变体：

```bash
OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@2026.4.23 \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=versioned-runtime-deps \
pnpm test:docker:published-upgrade-survivor

OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@latest \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=bootstrap-persona \
pnpm test:docker:published-upgrade-survivor
```

可用场景有 `base`、`feishu-channel`、`bootstrap-persona`、`plugin-deps-cleanup`、`configured-plugin-installs`、`tilde-log-path` 和 `versioned-runtime-deps`。在聚合运行中，`OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 展开为所有报告的问题形状场景，包括配置插件安装迁移。

完整更新迁移有意与完整发布 CI 分开。当发布问题是"从 2026.4.23 开始的每个已发布稳定版本是否都可以更新到此候选版本并清理插件依赖项碎片？"时，使用手动 `Update Migration` 工作流：

```bash
gh workflow run update-migration.yml \
  --ref main \
  -f workflow_ref=main \
  -f package_ref=main \
  -f baselines=all-since-2026.4.23 \
  -f scenarios=plugin-deps-cleanup
```

## 包验收

包验收是 GitHub 原生包门控。它将一个候选包解析为 `package-under-test` tarball，记录版本和 SHA-256，然后针对该确切 tarball 运行可重用的 Docker E2E 通道。工作流框架引用与包来源引用是分开的，因此当前测试逻辑可以验证较旧的受信任版本。

候选来源：

- `source=npm`：验证 `openclaw@beta`、`openclaw@latest` 或确切的已发布版本。
- `source=ref`：使用所选的当前框架打包受信任的分支、标签或提交。
- `source=url`：使用所需的 `package_sha256` 验证 HTTPS tarball。
- `source=artifact`：重用另一个 Actions 运行上传的 tarball。

完整发布验证默认使用 `source=artifact`，从解析的发布 SHA 构建。对于发布后验证，传递 `package_acceptance_package_spec=openclaw@YYYY.M.D` 以便相同的升级矩阵针对已发布的 npm 包而不是候选版本。

发布检查使用包/更新/插件集调用包验收：

```text
doctor-switch update-channel-switch upgrade-survivor published-upgrade-survivor plugins-offline plugin-update
```

它们还传递：

```text
published_upgrade_survivor_baselines=all-since-2026.4.23
published_upgrade_survivor_scenarios=reported-issues
telegram_mode=mock-openai
```

这将包迁移、更新频道切换、陈旧插件依赖项清理、离线插件覆盖、插件更新行为和 Telegram 包 QA 保留在同一个已解析的产物上。

`all-since-2026.4.23` 是完整发布 CI 升级样本：从 `2026.4.23` 到 `latest` 的每个 npm 已发布稳定版本。对于详尽的已发布更新迁移覆盖，在单独的更新迁移工作流中使用 `all-since-2026.4.23`，而不是完整发布 CI。`release-history` 仍然可用于手动更广泛的采样，当您还想要旧版预日期锚点时。

在发布前验证候选版本时，手动运行包配置文件：

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=package \
  -f published_upgrade_survivor_baselines=all-since-2026.4.23 \
  -f published_upgrade_survivor_scenarios=reported-issues \
  -f telegram_mode=mock-openai
```

当发布问题包括 MCP 频道、cron/子代理清理、OpenAI 网络搜索或 OpenWebUI 时，使用 `suite_profile=product`。仅在需要完整 Docker 发布路径覆盖时才使用 `suite_profile=full`。

## 发布默认值

对于发布候选版本，默认验证栈是：

1. `pnpm check:changed` 和 `pnpm test:changed` 用于源代码级别的回归。
2. `pnpm release:check` 用于包产物完整性。
3. 包验收 `package` 配置文件或发布检查自定义包通道，用于安装/更新/插件合同。
4. 跨 OS 发布检查，用于 OS 特定的安装程序、引导和平台行为。
5. 仅当更改的内容涉及提供商或托管服务行为时，才使用实时套件。

在维护者机器上，广泛的门控和 Docker/包产品验证应在 Testbox 中运行，除非明确需要本地验证。

## 旧版兼容性

兼容性宽容度很窄且有时间限制：

- 通过 `2026.4.25` 的包（包括 `2026.4.25-beta.*`）可能会在包验收中容忍已发布包的元数据缺口。
- 已发布的 `2026.4.26` 包可能会警告已发布的本地构建元数据戳文件。
- 较新的包必须满足现代合同。相同的缺口会失败而不是警告或跳过。

不要为这些旧形状添加新的启动迁移。添加或扩展 doctor 修复，然后用 `upgrade-survivor` 或 `published-upgrade-survivor` 验证它。

## 添加覆盖

更改更新或插件行为时，在能够因正确原因而失败的最低层添加覆盖：

- 纯路径或元数据逻辑：源代码旁边的单元测试。
- 包清单或打包文件行为：`package-dist-inventory` 或 tarball 检查器测试。
- CLI 安装/更新行为：Docker 通道断言或固件。
- 已发布版本迁移行为：`published-upgrade-survivor` 场景。
- 注册表/包来源行为：`test:docker:plugins` 固件或 ClawHub 固件服务器。
- 依赖项布局或清理行为：同时断言运行时执行和文件系统边界。npm 依赖项可能被提升到托管 npm 根目录下，因此测试应该证明根目录被扫描/清理，而不是假设有包本地 `node_modules` 树。

默认情况下保持新的 Docker 固件是封闭的。使用本地固件注册表和假包，除非测试的重点是实时注册表行为。

## 失败分类

从产物身份开始：

- 包验收 `resolve_package` 摘要：来源、版本、SHA-256 和产物名称。
- Docker 产物：`.artifacts/docker-tests/**/summary.json`、`failures.json`、通道日志和重新运行命令。
- 升级幸存者摘要：`.artifacts/upgrade-survivor/summary.json`，包括基准版本、候选版本、场景、阶段时间和方案步骤。

优先使用相同的包产物重新运行失败的确切通道，而不是重新运行整个发布总集。
