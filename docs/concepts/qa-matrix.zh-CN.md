---
summary: "Matrix 实时 QA 通道的维护者参考文档：CLI、配置文件、环境变量、场景和输出产物。"
read_when:
  - 本地运行 pnpm openclaw qa matrix
  - 添加或选择 Matrix QA 场景
  - 排查 Matrix QA 失败、超时或卡住的清理问题
title: "Matrix QA"
---

Matrix QA 通道在 Docker 中的一次性 Tuwunel 主服务器上运行捆绑的 `@openclaw/matrix` 插件，并使用临时的驱动、SUT 和观察者账户以及预设房间。它是 Matrix 的实时传输真实覆盖。

这是仅供维护者使用的工具。已打包的 OpenClaw 发布版本有意省略了 `qa-lab`，因此 `openclaw qa` 仅可从源码检出中获得。源码检出直接加载捆绑的运行器——不需要插件安装步骤。

有关更广泛的 QA 框架背景，请参见 [QA 概述](/concepts/qa-e2e-automation)。

## 快速入门

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

普通的 `pnpm openclaw qa matrix` 运行 `--profile all` 且不会在第一次失败时停止。使用 `--profile fast --fail-fast` 作为发布门控；在并行运行完整目录时，使用 `--profile transport|media|e2ee-smoke|e2ee-deep|e2ee-cli` 对目录进行分片。

## 该通道做什么

1. 在 Docker 中配置一次性 Tuwunel 主服务器（默认镜像 `ghcr.io/matrix-construct/tuwunel:v1.5.1`，服务器名称 `matrix-qa.test`，端口 `28008`）。
2. 注册三个临时用户——`driver`（发送入站流量）、`sut`（被测试的 OpenClaw Matrix 账户）、`observer`（第三方流量捕获）。
3. 为选定的场景（主、线程、媒体、重启、次要、允许列表、E2EE、验证 DM 等）预设所需的房间。
4. 启动一个子 OpenClaw 网关，该网关使用真实的 Matrix 插件，范围限定于 SUT 账户；`qa-channel` 不在子进程中加载。
5. 按顺序运行场景，通过驱动/观察者 Matrix 客户端观察事件。
6. 拆除主服务器，写入报告和摘要产物，然后退出。

## CLI

```text
pnpm openclaw qa matrix [options]
```

### 常用标志

| 标志                  | 默认值                                        | 描述                                                                              |
| --------------------- | --------------------------------------------- | --------------------------------------------------------------------------------- |
| `--profile <profile>` | `all`                                         | 场景配置文件。参见[配置文件](#profiles)。                                         |
| `--fail-fast`         | 关闭                                          | 在第一次失败的检查或场景后停止。                                                  |
| `--scenario <id>`     | —                                             | 仅运行此场景。可重复。参见[场景](#scenarios)。                                    |
| `--output-dir <path>` | `<repo>/.artifacts/qa-e2e/matrix-<timestamp>` | 报告、摘要、观察到的事件和输出日志的写入位置。相对路径相对于 `--repo-root` 解析。 |
| `--repo-root <path>`  | `process.cwd()`                               | 从中性工作目录调用时的仓库根目录。                                                |
| `--sut-account <id>`  | `sut`                                         | QA 网关配置中的 Matrix 账户 id。                                                  |

### 提供商标志

该通道使用真实的 Matrix 传输，但模型提供商是可配置的：

| 标志                     | 默认值          | 描述                                                                                                         |
| ------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------ |
| `--provider-mode <mode>` | `live-frontier` | 用于确定性模拟分发的 `mock-openai` 或用于实时前沿提供商的 `live-frontier`。旧版别名 `live-openai` 仍然有效。 |
| `--model <ref>`          | 提供商默认值    | 主要 `provider/model` 引用。                                                                                 |
| `--alt-model <ref>`      | 提供商默认值    | 场景中途切换时的备用 `provider/model` 引用。                                                                 |
| `--fast`                 | 关闭            | 在支持的情况下启用提供商快速模式。                                                                           |

Matrix QA 不接受 `--credential-source` 或 `--credential-role`。该通道在本地配置一次性用户；没有共享凭据池可供租用。

## 配置文件

选定的配置文件决定运行哪些场景。

| 配置文件      | 适用场景                                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `all`（默认） | 完整目录。慢但详尽。                                                                                                                     |
| `fast`        | 覆盖实时传输合约的发布门控子集：金丝雀、提及门控、允许列表阻止、回复形状、重启恢复、线程跟进、线程隔离、反应观察和 exec 审批元数据投递。 |
| `transport`   | 传输层线程、DM、房间、自动加入、提及/允许列表、审批和反应场景。                                                                          |
| `media`       | 图像、音频、视频、PDF、EPUB 附件覆盖。                                                                                                   |
| `e2ee-smoke`  | 最小 E2EE 覆盖——基本加密回复、线程跟进、引导成功。                                                                                       |
| `e2ee-deep`   | 详尽的 E2EE 状态丢失、备份、密钥和恢复场景。                                                                                             |
| `e2ee-cli`    | 通过 QA 测试框架驱动的 `openclaw matrix encryption setup` 和 `verify *` CLI 场景。                                                       |

确切的映射位于 `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts`。

## 场景

完整的场景 id 列表是 `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts:15` 中的 `MatrixQaScenarioId` 联合类型。类别包括：

- 线程——`matrix-thread-*`、`matrix-subagent-thread-spawn`
- 顶层 / DM / 房间——`matrix-top-level-reply-shape`、`matrix-room-*`、`matrix-dm-*`
- 流式传输和工具进度——`matrix-room-partial-streaming-preview`、`matrix-room-quiet-streaming-preview`、`matrix-room-tool-progress-*`、`matrix-room-block-streaming`
- 媒体——`matrix-media-type-coverage`、`matrix-room-image-understanding-attachment`、`matrix-attachment-only-ignored`、`matrix-unsupported-media-safe`
- 路由——`matrix-room-autojoin-invite`、`matrix-secondary-room-*`
- 反应——`matrix-reaction-*`
- 审批——`matrix-approval-*`（exec/插件元数据、分块回退、拒绝反应、线程和 `target: "both"` 路由）
- 重启和重放——`matrix-restart-*`、`matrix-stale-sync-replay-dedupe`、`matrix-room-membership-loss`、`matrix-homeserver-restart-resume`、`matrix-initial-catchup-then-incremental`
- 提及门控、机器人对机器人和允许列表——`matrix-mention-*`、`matrix-allowbots-*`、`matrix-allowlist-*`、`matrix-multi-actor-ordering`、`matrix-inbound-edit-*`、`matrix-mxid-prefixed-command-block`、`matrix-observer-allowlist-override`
- E2EE——`matrix-e2ee-*`（基本回复、线程跟进、引导、恢复密钥生命周期、状态丢失变体、服务器备份行为、设备卫生、SAS / QR / DM 验证、重启、产物编辑）
- E2EE CLI——`matrix-e2ee-cli-*`（加密设置、幂等设置、引导失败、恢复密钥生命周期、多账户、网关回复往返、自我验证）

传递 `--scenario <id>`（可重复）来运行手动选择的集合；与 `--profile all` 结合使用以忽略配置文件门控。

## 环境变量

| 变量                                    | 默认值                                    | 作用                                                                                                                         |
| --------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_QA_MATRIX_TIMEOUT_MS`         | `1800000`（30 分钟）                      | 整个运行的硬上限。                                                                                                           |
| `OPENCLAW_QA_MATRIX_CANARY_TIMEOUT_MS`  | `45000`                                   | 初始金丝雀回复的边界。发布 CI 在共享运行器上提高此值，以便缓慢的第一个网关轮次在场景覆盖开始前不会失败。                     |
| `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS` | `8000`                                    | 负面无回复断言的静默窗口。夹紧为 `≤` 运行超时。                                                                              |
| `OPENCLAW_QA_MATRIX_CLEANUP_TIMEOUT_MS` | `90000`                                   | Docker 拆除的边界。失败面包括恢复 `docker compose ... down --remove-orphans` 命令。                                          |
| `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE`      | `ghcr.io/matrix-construct/tuwunel:v1.5.1` | 在针对不同 Tuwunel 版本进行验证时覆盖主服务器镜像。                                                                          |
| `OPENCLAW_QA_MATRIX_PROGRESS`           | 开启                                      | `0` 静默标准错误输出中的 `[matrix-qa] ...` 进度行。`1` 强制开启。                                                            |
| `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT`    | 已编辑                                    | `1` 在 `matrix-qa-observed-events.json` 中保留消息正文和 `formatted_body`。默认编辑以保持 CI 产物安全。                      |
| `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT` | 关闭                                      | `1` 跳过产物写入后的确定性 `process.exit`。默认强制退出，因为 matrix-js-sdk 的原生加密句柄可以在产物完成后保持事件循环存活。 |
| `OPENCLAW_RUN_NODE_OUTPUT_LOG`          | 未设置                                    | 当由外部启动器（例如 `scripts/run-node.mjs`）设置时，Matrix QA 重用该日志路径，而不是启动自己的 tee。                        |

## 输出产物

写入 `--output-dir`：

- `matrix-qa-report.md` — Markdown 协议报告（通过、失败、跳过的内容以及原因）。
- `matrix-qa-summary.json` — 适合 CI 解析和仪表板的结构化摘要。
- `matrix-qa-observed-events.json` — 来自驱动和观察者客户端的观察到的 Matrix 事件。除非 `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1`，否则正文被编辑；审批元数据用选定的安全字段汇总，命令预览被截断。
- `matrix-qa-output.log` — 运行中的合并标准输出/标准错误。如果设置了 `OPENCLAW_RUN_NODE_OUTPUT_LOG`，则重用外部启动器的日志。

默认输出目录是 `<repo>/.artifacts/qa-e2e/matrix-<timestamp>`，因此连续运行不会互相覆盖。

## 排查技巧

- **运行在接近结束时挂起：** `matrix-js-sdk` 原生加密句柄可能比测试框架存活更久。默认在产物写入后强制执行干净的 `process.exit`；如果你已取消设置 `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT=1`，预期进程会停留。
- **清理错误：** 查找打印的恢复命令（一个 `docker compose ... down --remove-orphans` 调用）并手动运行它以释放主服务器端口。
- **CI 中不稳定的负面断言窗口：** 当 CI 快速时降低 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS`（默认 8 秒）；在慢速共享运行器上提高它。
- **需要编辑的正文用于错误报告：** 使用 `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1` 重新运行并附上 `matrix-qa-observed-events.json`。将结果产物视为敏感信息。
- **不同的 Tuwunel 版本：** 将 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 指向被测版本。该通道仅检入固定的默认镜像。

## 实时传输合约

Matrix 是三个实时传输通道之一（Matrix、Telegram、Discord），它们共享 [QA 概述 → 实时传输覆盖](/concepts/qa-e2e-automation#live-transport-coverage) 中定义的单一合约清单。`qa-channel` 仍然是广泛的合成套件，有意不属于该 matrix。

## 相关

- [QA 概述](/concepts/qa-e2e-automation) — 整体 QA 堆栈和实时传输合约
- [QA Channel](/channels/qa-channel) — 用于仓库支持场景的合成频道适配器
- [测试](/help/testing) — 运行测试和添加 QA 覆盖
- [Matrix](/channels/matrix) — 被测频道插件
