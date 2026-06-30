---
summary: "QA 堆栈概述：qa-lab、qa-channel、仓库支持的场景、实时传输通道、传输适配器和报告。"
read_when:
  - 了解 QA 堆栈如何组合在一起
  - 扩展 qa-lab、qa-channel 或传输适配器
  - 添加仓库支持的 QA 场景
  - 围绕网关仪表板构建更高真实感的 QA 自动化
title: "QA 概述"
---

私有 QA 堆栈旨在以比单个单元测试更真实、更贴近频道的方式测试 OpenClaw。

当前组件：

- `extensions/qa-channel`：具有私信、频道、线程、反应、编辑和删除界面的合成消息频道。
- `extensions/qa-lab`：调试器 UI 和 QA 总线，用于观察记录、注入入站消息和导出 Markdown 报告。
- `extensions/qa-matrix`，未来的运行器插件：在子 QA 网关内驱动真实频道的实时传输适配器。
- `qa/`：用于启动任务和基线 QA 场景的仓库支持的种子资产。
- [Mantis](/concepts/mantis)：针对需要真实传输、浏览器截图、VM 状态和 PR 证据的漏洞进行前后实时验证。

## 命令界面

每个 QA 流程都在 `pnpm openclaw qa <subcommand>` 下运行。许多有 `pnpm qa:*` 脚本别名；两种形式都受支持。

| 命令                                                | 目的                                                                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | 捆绑的 QA 自检；写入 Markdown 报告。                                                                                                               |
| `qa suite`                                          | 对 QA 网关通道运行仓库支持的场景。别名：`pnpm openclaw qa suite --runner multipass` 用于一次性 Linux VM。                                          |
| `qa coverage`                                       | 打印 markdown 场景覆盖率清单（`--json` 用于机器输出）。                                                                                            |
| `qa parity-report`                                  | 比较两个 `qa-suite-summary.json` 文件并写入智能体对等报告。                                                                                        |
| `qa character-eval`                                 | 跨多个实时模型运行角色 QA 场景，并生成评判报告。参见[报告](#报告)。                                                                                |
| `qa manual`                                         | 对选定的提供商/模型通道运行一次性提示。                                                                                                            |
| `qa ui`                                             | 启动 QA 调试器 UI 和本地 QA 总线（别名：`pnpm qa:lab:ui`）。                                                                                       |
| `qa docker-build-image`                             | 构建预烘焙的 QA Docker 镜像。                                                                                                                      |
| `qa docker-scaffold`                                | 为 QA 仪表板 + 网关通道写入 docker-compose 脚手架。                                                                                                |
| `qa up`                                             | 构建 QA 网站，启动 Docker 支持的堆栈，打印 URL（别名：`pnpm qa:lab:up`；`:fast` 变体添加 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`）。 |
| `qa aimock`                                         | 仅启动 AIMock 提供商服务器。                                                                                                                       |
| `qa mock-openai`                                    | 仅启动场景感知的 `mock-openai` 提供商服务器。                                                                                                      |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共享的 Convex 凭证池。                                                                                                                         |
| `qa matrix`                                         | 对一次性 Tuwunel 主服务器进行实时传输通道。参见 [Matrix QA](/concepts/qa-matrix)。                                                                 |
| `qa telegram`                                       | 对真实私有 Telegram 群组进行实时传输通道。                                                                                                         |
| `qa discord`                                        | 对真实私有 Discord 公会频道进行实时传输通道。                                                                                                      |
| `qa slack`                                          | 对真实私有 Slack 频道进行实时传输通道。                                                                                                            |
| `qa mantis`                                         | 用于实时传输漏洞的前后验证运行器，具有 Discord 状态反应证据、Crabbox 桌面/浏览器冒烟和 Slack-in-VNC 冒烟。参见 [Mantis](/concepts/mantis)。        |

## 运营者流程

当前 QA 运营者流程是一个双窗格 QA 网站：

- 左侧：带智能体的网关仪表板（Control UI）。
- 右侧：QA Lab，显示类 Slack 记录和场景计划。

运行：

```bash
pnpm qa:lab:up
```

这构建 QA 网站，启动 Docker 支持的网关通道，并公开 QA Lab 页面，运营者或自动化循环可以在其中给智能体 QA 任务、观察真实频道行为，并记录什么有效、失败或保持阻塞。

对于更快的 QA Lab UI 迭代，而不必每次重建 Docker 镜像，使用绑定挂载的 QA Lab 包启动堆栈：

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` 在预构建的镜像上保持 Docker 服务，并将 `extensions/qa-lab/web/dist` 绑定挂载到 `qa-lab` 容器中。`qa:lab:watch` 在更改时重建该包，并在 QA Lab 资产哈希更改时浏览器自动重新加载。

对于本地 OpenTelemetry 追踪冒烟，运行：

```bash
pnpm qa:otel:smoke
```

该脚本启动本地 OTLP/HTTP 追踪接收器，启用 `diagnostics-otel` 插件运行 `otel-trace-smoke` QA 场景，然后解码导出的 protobuf span 并断言发布关键形状：`openclaw.run`、`openclaw.harness.run`、`openclaw.model.call`、`openclaw.context.assembled` 和 `openclaw.message.delivery` 必须存在；成功轮次的模型调用不得导出 `StreamAbandoned`；原始诊断 ID 和 `openclaw.content.*` 属性必须不在追踪中。它在 QA 套件产物旁写入 `otel-smoke-summary.json`。

可观察性 QA 仅限于源代码检出。npm tarball 有意省略 QA Lab，因此包 Docker 发布通道不运行 `qa` 命令。在更改诊断仪器时，从构建的源代码检出使用 `pnpm qa:otel:smoke`。

对于传输真实的 Matrix 冒烟通道，运行：

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

此通道的完整 CLI 参考、配置文件/场景目录、环境变量和产物布局存在于 [Matrix QA](/concepts/qa-matrix) 中。简而言之：它在 Docker 中配置一个一次性的 Tuwunel 主服务器，注册临时驱动程序/SUT/观察者用户，在限定于该传输的子 QA 网关内运行真实的 Matrix 插件（无 `qa-channel`），然后在 `.artifacts/qa-e2e/matrix-<timestamp>/` 下写入 Markdown 报告、JSON 摘要、观察到的事件产物和合并输出日志。

对于传输真实的 Telegram、Discord 和 Slack 冒烟通道：

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
pnpm openclaw qa slack
```

它们针对有两个机器人（驱动程序 + SUT）的预先存在的真实频道。所需的环境变量、场景列表、输出产物和 Convex 凭证池在下面的 [Telegram、Discord 和 Slack QA 参考](#telegram-discord-和-slack-qa-参考) 中记录。

对于带 VNC 救援的完整 Slack 桌面 VM 运行，运行：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

该命令租用一个 Crabbox 桌面/浏览器机器，在 VM 内运行 Slack 实时通道，在 VNC 浏览器中打开 Slack Web，捕获桌面，并将 `slack-qa/` 加上 `slack-desktop-smoke.png` 复制回 Mantis 产物目录。在通过 VNC 手动登录到 Slack Web 后，使用 `--lease-id <cbx_...>` 重用。使用 `--gateway-setup` 时，Mantis 在 VM 内的端口 `38973` 上保留一个持久的 OpenClaw Slack 网关运行；没有它，该命令运行正常的机器人对机器人的 Slack QA 通道并在产物捕获后退出。

在使用共享的实时凭证之前，运行：

```bash
pnpm openclaw qa credentials doctor
```

doctor 检查 Convex 代理环境、验证端点设置，并在维护人员密钥存在时验证管理员/列表可访问性。它只报告密钥的设置/缺失状态。

## 实时传输覆盖率

实时传输通道共享一个合约，而不是每个都发明自己的场景列表形状。`qa-channel` 是广泛的合成产品行为套件，不是实时传输覆盖矩阵的一部分。

| 通道     | 金丝雀 | 提及门控 | 机器人对机器人 | 允许列表阻止 | 顶级回复 | 重启恢复 | 线程跟进 | 线程隔离 | 反应观察 | 帮助命令 | 原生命令注册 |
| -------- | ------ | -------- | -------------- | ------------ | -------- | -------- | -------- | -------- | -------- | -------- | ------------ |
| Matrix   | x      | x        | x              | x            | x        | x        | x        | x        | x        |          |              |
| Telegram | x      | x        | x              |              |          |          |          |          |          | x        |              |
| Discord  | x      | x        | x              |              |          |          |          |          |          |          | x            |
| Slack    | x      | x        | x              |              |          |          |          |          |          |          |              |

这使 `qa-channel` 保持作为广泛的产品行为套件，而 Matrix、Telegram 和未来的实时传输共享一个明确的传输合约清单。

对于不将 Docker 引入 QA 路径的一次性 Linux VM 通道，运行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

这启动一个新的 Multipass 客户机，安装依赖项，在客户机内构建 OpenClaw，运行 `qa suite`，然后将正常的 QA 报告和摘要复制回主机上的 `.artifacts/qa-e2e/...`。它重用与主机上的 `qa suite` 相同的场景选择行为。主机和 Multipass 套件运行默认情况下使用隔离的网关工作者并行执行多个选定的场景。`qa-channel` 默认并发数为 4，受选定的场景数限制。使用 `--concurrency <count>` 调整工作者数量，或使用 `--concurrency 1` 进行串行执行。当任何场景失败时，命令退出非零。当你想要不带失败退出代码的产物时，使用 `--allow-failures`。实时运行转发对客户机实际可行的受支持 QA 认证输入：基于环境变量的提供商密钥、QA 实时提供商配置路径，以及存在时的 `CODEX_HOME`。将 `--output-dir` 保持在仓库根目录下，以便客户机可以通过挂载的工作区写回。

## Telegram、Discord 和 Slack QA 参考

Matrix 有一个[专用页面](/concepts/qa-matrix)，因为它的场景数量和 Docker 支持的主服务器配置。Telegram、Discord 和 Slack 更小 — 每个只有几个场景，没有配置文件系统，针对预先存在的真实频道 — 所以它们的参考在这里。

### 共享 CLI 标志

这些通道通过 `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` 注册，并接受相同的标志：

| 标志                                  | 默认值                                                          | 描述                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `--scenario <id>`                     | —                                                               | 只运行此场景。可重复。                                                                                     |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord,slack}-<timestamp>` | 写入报告/摘要/观察到的消息和输出日志的位置。相对路径相对于 `--repo-root` 解析。                            |
| `--repo-root <path>`                  | `process.cwd()`                                                 | 从中性 cwd 调用时的仓库根目录。                                                                            |
| `--sut-account <id>`                  | `sut`                                                           | QA 网关配置内的临时账户 id。                                                                               |
| `--provider-mode <mode>`              | `live-frontier`                                                 | `mock-openai` 用于确定性模拟调度，或 `live-frontier` 用于实时前沿提供商。遗留别名 `live-openai` 仍然有效。 |
| `--model <ref>` / `--alt-model <ref>` | 提供商默认值                                                    | 主要/备用模型引用。                                                                                        |
| `--fast`                              | 关闭                                                            | 在支持的地方启用提供商快速模式。                                                                           |
| `--credential-source <env\|convex>`   | `env`                                                           | 参见 [Convex 凭证池](#convex-凭证池)。                                                                     |
| `--credential-role <maintainer\|ci>`  | CI 中为 `ci`，否则为 `maintainer`                               | 当 `--credential-source convex` 时使用的角色。                                                             |

每个通道在任何失败的场景时退出非零。`--allow-failures` 在不设置失败退出代码的情况下写入产物。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

针对有两个不同机器人（驱动程序 + SUT）的一个真实私有 Telegram 群组。SUT 机器人必须有 Telegram 用户名；当两个机器人都在 `@BotFather` 中启用了**机器人对机器人通信模式**时，机器人对机器人的观察效果最佳。

`--credential-source env` 时的必需环境变量：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` — 数字聊天 id（字符串）。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

可选：

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` 在观察到的消息产物中保留消息正文（默认编辑）。

场景（`extensions/qa-lab/src/live-transports/telegram/telegram-live.runtime.ts:44`）：

- `telegram-canary`
- `telegram-mention-gating`
- `telegram-mentioned-message-reply`
- `telegram-help-command`
- `telegram-commands-command`
- `telegram-tools-compact-command`
- `telegram-whoami-command`
- `telegram-context-command`

输出产物：

- `telegram-qa-report.md`
- `telegram-qa-summary.json` — 从金丝雀开始，包括每次回复的 RTT（驱动程序发送 → 观察到的 SUT 回复）。
- `telegram-qa-observed-messages.json` — 正文已编辑，除非 `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`。

### Discord QA

```bash
pnpm openclaw qa discord
```

针对有两个机器人的一个真实私有 Discord 公会频道：一个由测试框架控制的驱动机器人，以及一个由子 OpenClaw 网关通过捆绑的 Discord 插件启动的 SUT 机器人。验证频道提及处理，SUT 机器人已向 Discord 注册原生 `/help` 命令，以及选择加入的 Mantis 证据场景。

`--credential-source env` 时的必需环境变量：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` — 必须与 Discord 返回的 SUT 机器人用户 id 匹配（否则通道会快速失败）。

可选：

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` 在观察到的消息产物中保留消息正文。

场景（`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`）：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-status-reactions-tool-only` — 选择加入的 Mantis 场景。单独运行，因为它将 SUT 切换到始终开启、仅工具的公会回复，带 `messages.statusReactions.enabled=true`，然后捕获 REST 反应时间线加上 HTML/PNG 视觉产物。

显式运行 Mantis 状态反应场景：

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --fast
```

输出产物：

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` — 正文已编辑，除非 `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`。
- `discord-qa-reaction-timelines.json` 和 `discord-status-reactions-tool-only-timeline.png`（当状态反应场景运行时）。

### Slack QA

```bash
pnpm openclaw qa slack
```

针对有两个不同机器人的一个真实私有 Slack 频道：一个由测试框架控制的驱动机器人，以及一个由子 OpenClaw 网关通过捆绑的 Slack 插件启动的 SUT 机器人。

`--credential-source env` 时的必需环境变量：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

可选：

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` 在观察到的消息产物中保留消息正文。

场景（`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts:39`）：

- `slack-canary`
- `slack-mention-gating`

输出产物：

- `slack-qa-report.md`
- `slack-qa-summary.json`
- `slack-qa-observed-messages.json` — 正文已编辑，除非 `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`。

### Convex 凭证池

Telegram、Discord 和 Slack 通道可以从共享的 Convex 池租用凭证，而不是读取上述环境变量。传递 `--credential-source convex`（或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 获取独占租约，在运行期间对其进行心跳，并在关闭时释放它。池类型是 `"telegram"`、`"discord"` 和 `"slack"`。

代理在 `admin/add` 上验证的有效载荷形状：

- Telegram（`kind: "telegram"`）：`{ groupId: string, driverToken: string, sutToken: string }` — `groupId` 必须是数字聊天 id 字符串。
- Discord（`kind: "discord"`）：`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。

操作环境变量和 Convex 代理端点合约在[测试 → 通过 Convex 共享 Telegram 凭证](/help/testing#shared-telegram-credentials-via-convex-v1)中记录（该节名称早于 Discord 支持；代理语义对两种类型都相同）。

## 仓库支持的种子

种子资产存在于 `qa/` 中：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

这些有意在 git 中，以便 QA 计划对人类和智能体都可见。

`qa-lab` 应该保持作为通用 markdown 运行器。每个场景 markdown 文件是一次测试运行的真相来源，应该定义：

- 场景元数据
- 可选的类别、能力、通道和风险元数据
- 文档和代码引用
- 可选的插件要求
- 可选的网关配置补丁
- 可执行的 `qa-flow`

支持 `qa-flow` 的可重用运行时界面可以保持通用和横向切割。例如，markdown 场景可以将传输侧助手与浏览器侧助手结合，这些助手通过网关 `browser.request` 接口驱动嵌入的 Control UI，而不添加特殊情况运行器。

场景文件应该按产品能力而不是源代码树文件夹分组。当文件移动时保持场景 ID 稳定；使用 `docsRefs` 和 `codeRefs` 进行实现可追溯性。

基线列表应该足够广泛以涵盖：

- 私信和频道聊天
- 线程行为
- 消息动作生命周期
- cron 回调
- 记忆召回
- 模型切换
- 子智能体交接
- 仓库读取和文档读取
- 一个小构建任务，如 Lobster Invaders

## 提供商模拟通道

`qa suite` 有两个本地提供商模拟通道：

- `mock-openai` 是 OpenClaw 场景感知的模拟。它仍然是仓库支持的 QA 和对等门控的默认确定性模拟通道。
- `aimock` 启动一个 AIMock 支持的提供商服务器，用于实验性协议、fixture、记录/重放和混沌覆盖。它是附加的，不替换 `mock-openai` 场景调度器。

提供商通道实现存在于 `extensions/qa-lab/src/providers/` 下。每个提供商拥有其默认值、本地服务器启动、网关模型配置、认证配置文件暂存需求和实时/模拟能力标志。共享套件和网关代码应该通过提供商注册表路由，而不是在提供商名称上分支。

## 传输适配器

`qa-lab` 为 markdown QA 场景拥有通用的传输接口。`qa-channel` 是该接口上的第一个适配器，但设计目标更宽：未来的真实或合成频道应该插入同一套件运行器，而不是添加传输特定的 QA 运行器。

在架构层面，分离是：

- `qa-lab` 拥有通用的场景执行、工作者并发、产物写入和报告。
- 传输适配器拥有网关配置、就绪性、入站和出站观察、传输动作和归一化的传输状态。
- `qa/scenarios/` 下的 Markdown 场景文件定义测试运行；`qa-lab` 提供执行它们的可重用运行时界面。

### 添加频道

将频道添加到 markdown QA 系统只需要两件事：

1. 频道的传输适配器。
2. 测试频道合约的场景包。

当共享的 `qa-lab` 主机可以拥有流程时，不要添加新的顶级 QA 命令根。

`qa-lab` 拥有共享的主机机制：

- `openclaw qa` 命令根
- 套件启动和关闭
- 工作者并发
- 产物写入
- 报告生成
- 场景执行
- 旧版 `qa-channel` 场景的兼容性别名

运行器插件拥有传输合约：

- `openclaw qa <runner>` 如何挂载在共享 `qa` 根目录下
- 如何为该传输配置网关
- 如何检查就绪性
- 如何注入入站事件
- 如何观察出站消息
- 如何公开记录和归一化的传输状态
- 如何执行传输支持的动作
- 如何处理传输特定的重置或清理

新频道的最低采用标准：

1. 将 `qa-lab` 保持为共享 `qa` 根的所有者。
2. 在共享的 `qa-lab` 主机接口上实现传输运行器。
3. 将传输特定的机制保留在运行器插件或频道工具内部。
4. 将运行器挂载为 `openclaw qa <runner>`，而不是注册竞争根命令。运行器插件应该在 `openclaw.plugin.json` 中声明 `qaRunners`，并从 `runtime-api.ts` 导出匹配的 `qaRunnerCliRegistrations` 数组。保持 `runtime-api.ts` 轻量；惰性 CLI 和运行器执行应该保留在单独的入口点后面。
5. 在主题化的 `qa/scenarios/` 目录下编写或适配 markdown 场景。
6. 对新场景使用通用场景助手。
7. 保持现有的兼容性别名工作，除非仓库在进行有意的迁移。

决策规则是严格的：

- 如果行为可以在 `qa-lab` 中表达一次，将其放在 `qa-lab` 中。
- 如果行为依赖于一个频道传输，将其保留在该运行器插件或插件工具中。
- 如果场景需要多个频道可以使用的新能力，添加通用助手而不是 `suite.ts` 中的频道特定分支。
- 如果行为只对一个传输有意义，保持场景传输特定并在场景合约中明确表示。

### 场景助手名称

新场景的首选通用助手：

- `waitForTransportReady`
- `waitForChannelReady`
- `injectInboundMessage`
- `injectOutboundMessage`
- `waitForTransportOutboundMessage`
- `waitForChannelOutboundMessage`
- `waitForNoTransportOutbound`
- `getTransportSnapshot`
- `readTransportMessage`
- `readTransportTranscript`
- `formatTransportTranscript`
- `resetTransport`

兼容性别名对现有场景仍然可用 — `waitForQaChannelReady`、`waitForOutboundMessage`、`waitForNoOutbound`、`formatConversationTranscript`、`resetBus` — 但新场景编写应该使用通用名称。别名的存在是为了避免标志日迁移，而不是作为未来的模型。

## 报告

`qa-lab` 从观察到的总线时间线导出 Markdown 协议报告。报告应该回答：

- 什么有效
- 什么失败
- 什么保持阻塞
- 值得添加哪些后续场景

对于可用场景的清单 — 在确定后续工作规模或连接新传输时有用 — 运行 `pnpm openclaw qa coverage`（添加 `--json` 用于机器可读输出）。

对于角色和风格检查，跨多个实时模型引用运行相同的场景，并写入评判的 Markdown 报告：

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.5,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-6,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.5,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-6,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

该命令运行本地 QA 网关子进程，而不是 Docker。角色评估场景应该通过 `SOUL.md` 设置人格，然后运行普通的用户轮次，如聊天、工作区帮助和小文件任务。候选模型不应该被告知它正在被评估。该命令保留每个完整记录，记录基本的运行统计信息，然后在快速模式下向评判模型询问，在支持的地方使用 `xhigh` 推理，按自然度、氛围和幽默对运行进行排名。使用 `--blind-judge-models` 时在比较提供商：评判提示仍然获得每个记录和运行状态，但候选引用被替换为中性标签，如 `candidate-01`；报告在解析后将排名映射回真实引用。候选运行默认为 `high` 思考，GPT-5.5 为 `medium`，支持它的旧版 OpenAI 评估引用为 `xhigh`。用 `--model provider/model,thinking=<level>` 内联覆盖特定候选。`--thinking <level>` 仍然设置全局回退，旧版 `--model-thinking <provider/model=level>` 形式保留以兼容。OpenAI 候选引用默认使用快速模式，以便在提供商支持的地方使用优先处理。当单个候选或评判需要覆盖时，内联添加 `,fast`、`,no-fast` 或 `,fast=false`。只有当你想在每个候选模型上强制开启快速模式时，才传递 `--fast`。候选和评判持续时间记录在报告中用于基准分析，但评判提示明确说不按速度排名。候选和评判模型运行均默认并发 16。当提供商限制或本地网关压力使运行过于嘈杂时，降低 `--concurrency` 或 `--judge-concurrency`。当没有传递候选 `--model` 时，角色评估默认为 `openai/gpt-5.5`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-6`、`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、`moonshot/kimi-k2.5` 和 `google/gemini-3.1-pro-preview`。当没有传递 `--judge-model` 时，评判默认为 `openai/gpt-5.5,thinking=xhigh,fast` 和 `anthropic/claude-opus-4-6,thinking=high`。

## 相关文档

- [Matrix QA](/concepts/qa-matrix)
- [QA Channel](/channels/qa-channel)
- [测试](/help/testing)
- [仪表板](/web/dashboard)
