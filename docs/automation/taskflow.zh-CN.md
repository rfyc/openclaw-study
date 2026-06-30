---
summary: "任务流——位于后台任务之上的流编排层"
read_when:
  - 想了解任务流与后台任务的关系
  - 在发布说明或文档中遇到任务流或 openclaw tasks flow
  - 想检查或管理持久化流状态
title: "任务流"
---

任务流是位于[后台任务](/automation/tasks)之上的流编排基础设施。它管理具有独立状态、修订跟踪和同步语义的持久多步骤流，而各个任务仍然是后台工作的基本单元。

## 何时使用任务流

当工作跨越多个顺序或分支步骤，且需要在 gateway 重启后保持持久化进度跟踪时，请使用任务流。对于单个后台操作，普通[任务](/automation/tasks)即可满足需求。

| 场景                          | 使用方式           |
| ----------------------------- | ------------------ |
| 单个后台任务                  | 普通任务           |
| 多步骤管道（A 然后 B 然后 C） | 任务流（托管模式） |
| 观察外部创建的任务            | 任务流（镜像模式） |
| 一次性提醒                    | 定时任务           |

## 可靠计划工作流模式

对于市场情报简报等周期性工作流，将调度、编排和可靠性检查作为独立层分开处理：

1. 使用[计划任务](/automation/cron-jobs)控制时间。
2. 当工作流需要基于先前上下文构建时，使用持久 cron 会话。
3. 使用 [Lobster](/tools/lobster) 处理确定性步骤、审批门控和恢复 token。
4. 使用任务流跟踪跨子任务、等待、重试和 gateway 重启的多步骤运行。

示例 cron 形态：

```bash
openclaw cron add \
  --name "Market intelligence brief" \
  --cron "0 7 * * 1-5" \
  --tz "America/New_York" \
  --session session:market-intel \
  --message "Run the market-intel Lobster workflow. Verify source freshness before summarizing." \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

当周期性工作流需要有意保留历史记录、先前运行摘要或常设上下文时，使用 `session:<id>` 而非 `isolated`。当每次运行应从头开始且所有必要状态在工作流中已明确时，使用 `isolated`。

在工作流内部，将可靠性检查放在 LLM 汇总步骤之前：

```yaml
name: market-intel-brief
steps:
  - id: preflight
    command: market-intel check --json
  - id: collect
    command: market-intel collect --json
    stdin: $preflight.json
  - id: summarize
    command: market-intel summarize --json
    stdin: $collect.json
  - id: approve
    command: market-intel deliver --preview
    stdin: $summarize.json
    approval: required
  - id: deliver
    command: market-intel deliver --execute
    stdin: $summarize.json
    condition: $approve.approved
```

推荐的预检项目：

- 浏览器可用性和配置文件选择，例如使用 `openclaw` 管理状态，或当需要已登录的 Chrome 会话时使用 `user`。参见[浏览器](/tools/browser)。
- 每个数据源的 API 凭证和配额。
- 必要端点的网络可达性。
- 代理的必要工具是否已启用，如 `lobster`、`browser` 和 `llm-task`。
- cron 的失败目标是否已配置，以便预检失败可见。参见[计划任务](/automation/cron-jobs#delivery-and-output)。

每个收集项目推荐的数据来源字段：

```json
{
  "sourceUrl": "https://example.com/report",
  "retrievedAt": "2026-04-24T12:00:00Z",
  "asOf": "2026-04-24",
  "title": "Example report",
  "content": "..."
}
```

让工作流在汇总前拒绝或标记过期项目。LLM 步骤应只接收结构化 JSON，并被要求在输出中保留 `sourceUrl`、`retrievedAt` 和 `asOf`。当需要在工作流内部进行模式验证的模型步骤时，使用 [LLM Task](/tools/llm-task)。

对于可复用的团队或社区工作流，将 CLI、`.lobster` 文件和任何设置说明打包为技能或插件，并通过 [ClawHub](/tools/clawhub) 发布。将工作流特定的安全措施保留在该包中，除非插件 API 缺少所需的通用能力。

## 同步模式

### 托管模式

任务流端到端管理生命周期。它将流步骤创建为任务、驱动它们完成，并自动推进流状态。

示例：一个周报流，依次（1）收集数据、（2）生成报告、（3）投递报告。任务流将每个步骤创建为后台任务，等待完成后再进行下一步。

```
流：weekly-report
  步骤 1：gather-data     → 任务已创建 → 成功
  步骤 2：generate-report → 任务已创建 → 成功
  步骤 3：deliver         → 任务已创建 → 运行中
```

### 镜像模式

任务流观察外部创建的任务并同步流状态，不拥有任务创建权。当任务来自定时任务、CLI 命令或其他来源，且你希望以流的形式统一查看其进度时，镜像模式非常有用。

示例：三个独立的定时任务共同构成"晨间运营"例程。镜像流在不控制任务运行时间和方式的情况下跟踪它们的整体进度。

## 持久状态与修订跟踪

每个流持久化自身状态并跟踪修订记录，使进度在 gateway 重启后得以保留。修订跟踪可在多个来源尝试同时推进同一流时进行冲突检测。
流注册表使用 SQLite 并进行有界预写日志维护，包括定期和关闭时的检查点，因此长期运行的 gateway 不会保留无限增长的 `registry.sqlite-wal` 附属文件。

## 取消行为

`openclaw tasks flow cancel` 为流设置粘性取消意图。流内的活跃任务会被取消，不再启动新步骤。取消意图在重启后持续存在，因此即使 gateway 在所有子任务终止前重启，已取消的流仍保持取消状态。

## CLI 命令

```bash
# 列出活跃和最近的流
openclaw tasks flow list

# 显示特定流的详情
openclaw tasks flow show <lookup>

# 取消运行中的流及其活跃任务
openclaw tasks flow cancel <lookup>
```

| 命令                              | 说明                         |
| --------------------------------- | ---------------------------- |
| `openclaw tasks flow list`        | 显示带状态和同步模式的跟踪流 |
| `openclaw tasks flow show <id>`   | 按流 ID 或查找键检查单个流   |
| `openclaw tasks flow cancel <id>` | 取消运行中的流及其活跃任务   |

## 流与任务的关系

流协调任务，而非替代任务。单个流在其生命周期内可能驱动多个后台任务。使用 `openclaw tasks` 检查单个任务记录，使用 `openclaw tasks flow` 检查编排流。

## 相关文档

- [后台任务](/automation/tasks) — 流所协调的后台工作账本
- [CLI：tasks](/cli/tasks) — `openclaw tasks flow` 的 CLI 命令参考
- [自动化概览](/automation) — 所有自动化机制概览
- [定时任务](/automation/cron-jobs) — 可接入流的计划任务
