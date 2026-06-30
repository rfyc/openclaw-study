---
summary: "为自主代理程序定义永久操作权限"
read_when:
  - 设置无需逐任务提示即可自主运行的代理工作流
  - 定义代理可独立执行的操作与需要人工审批的操作
  - 为具有明确边界和升级规则的多程序代理设计结构
title: "常设指令"
---

常设指令为你的代理授予针对特定程序的**永久操作权限**。你无需每次提供具体任务指令，而是定义具有明确范围、触发条件和升级规则的程序——代理在这些边界内自主执行。

这就好比每周五告诉助理"发送周报"，与授予常设权限"你负责周报。每周五编写并发送，只有出现异常时才需要上报"之间的区别。

## 为何需要常设指令

**没有常设指令时：**

- 每个任务都需要你主动提示代理
- 代理在请求之间处于空闲状态
- 例行工作容易被遗忘或延误
- 你成为瓶颈

**有了常设指令：**

- 代理在定义的边界内自主执行
- 例行工作按时进行，无需提示
- 只有异常情况和审批才需要你介入
- 代理在空闲时间高效工作

## 工作原理

常设指令定义在[代理工作区](/concepts/agent-workspace)文件中。推荐方式是直接写入 `AGENTS.md`（每次会话自动注入），确保代理始终能在上下文中获取。对于较大的配置，也可以放在 `standing-orders.md` 等专用文件中，并在 `AGENTS.md` 中引用。

每个程序需要指定：

1. **范围** — 代理被授权执行的操作
2. **触发条件** — 何时执行（调度、事件或条件）
3. **审批门控** — 哪些操作需要人工签字确认
4. **升级规则** — 何时停止并请求帮助

代理通过工作区启动文件（参见[代理工作区](/concepts/agent-workspace)了解自动注入文件的完整列表）在每次会话时加载这些指令并执行，结合[定时任务](/automation/cron-jobs)实现基于时间的执行。

<Tip>
将常设指令写入 `AGENTS.md` 以确保每次会话都能加载。工作区启动会自动注入 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 和 `MEMORY.md`——但不包括子目录中的任意文件。
</Tip>

## 常设指令的结构

```markdown
## Program: Weekly Status Report

**Authority:** Compile data, generate report, deliver to stakeholders
**Trigger:** Every Friday at 4 PM (enforced via cron job)
**Approval gate:** None for standard reports. Flag anomalies for human review.
**Escalation:** If data source is unavailable or metrics look unusual (>2σ from norm)

### Execution steps

1. Pull metrics from configured sources
2. Compare to prior week and targets
3. Generate report in Reports/weekly/YYYY-MM-DD.md
4. Deliver summary via configured channel
5. Log completion to Agent/Logs/

### What NOT to do

- Do not send reports to external parties
- Do not modify source data
- Do not skip delivery if metrics look bad — report accurately
```

## 常设指令与定时任务

常设指令定义代理**被授权执行什么**。[定时任务](/automation/cron-jobs)定义**何时**执行。二者协同工作：

```
常设指令："你负责每日收件箱分类"
    ↓
定时任务（每天 8 点）："按常设指令执行收件箱分类"
    ↓
代理：读取常设指令 → 执行步骤 → 报告结果
```

定时任务提示词应引用常设指令，而非重复其内容：

```bash
openclaw cron add \
  --name daily-inbox-triage \
  --cron "0 8 * * 1-5" \
  --tz America/New_York \
  --timeout-seconds 300 \
  --announce \
  --channel bluebubbles \
  --to "+1XXXXXXXXXX" \
  --message "Execute daily inbox triage per standing orders. Check mail for new alerts. Parse, categorize, and persist each item. Report summary to owner. Escalate unknowns."
```

## 示例

### 示例 1：内容与社交媒体（周期循环）

```markdown
## Program: Content & Social Media

**Authority:** Draft content, schedule posts, compile engagement reports
**Approval gate:** All posts require owner review for first 30 days, then standing approval
**Trigger:** Weekly cycle (Monday review → mid-week drafts → Friday brief)

### Weekly cycle

- **Monday:** Review platform metrics and audience engagement
- **Tuesday–Thursday:** Draft social posts, create blog content
- **Friday:** Compile weekly marketing brief → deliver to owner

### Content rules

- Voice must match the brand (see SOUL.md or brand voice guide)
- Never identify as AI in public-facing content
- Include metrics when available
- Focus on value to audience, not self-promotion
```

### 示例 2：财务运营（事件触发）

```markdown
## Program: Financial Processing

**Authority:** Process transaction data, generate reports, send summaries
**Approval gate:** None for analysis. Recommendations require owner approval.
**Trigger:** New data file detected OR scheduled monthly cycle

### When new data arrives

1. Detect new file in designated input directory
2. Parse and categorize all transactions
3. Compare against budget targets
4. Flag: unusual items, threshold breaches, new recurring charges
5. Generate report in designated output directory
6. Deliver summary to owner via configured channel

### Escalation rules

- Single item > $500: immediate alert
- Category > budget by 20%: flag in report
- Unrecognizable transaction: ask owner for categorization
- Failed processing after 2 retries: report failure, do not guess
```

### 示例 3：监控与告警（持续运行）

```markdown
## Program: System Monitoring

**Authority:** Check system health, restart services, send alerts
**Approval gate:** Restart services automatically. Escalate if restart fails twice.
**Trigger:** Every heartbeat cycle

### Checks

- Service health endpoints responding
- Disk space above threshold
- Pending tasks not stale (>24 hours)
- Delivery channels operational

### Response matrix

| Condition        | Action                   | Escalate?                |
| ---------------- | ------------------------ | ------------------------ |
| Service down     | Restart automatically    | Only if restart fails 2x |
| Disk space < 10% | Alert owner              | Yes                      |
| Stale task > 24h | Remind owner             | No                       |
| Channel offline  | Log and retry next cycle | If offline > 2 hours     |
```

## 执行-验证-报告模式

与严格的执行纪律结合时，常设指令效果最佳。常设指令中的每个任务都应遵循以下循环：

1. **执行** — 完成实际工作（不只是确认指令）
2. **验证** — 确认结果正确（文件存在、消息已投递、数据已解析）
3. **报告** — 告知负责人完成了什么以及验证情况

```markdown
### Execution rules

- Every task follows Execute-Verify-Report. No exceptions.
- "I'll do that" is not execution. Do it, then report.
- "Done" without verification is not acceptable. Prove it.
- If execution fails: retry once with adjusted approach.
- If still fails: report failure with diagnosis. Never silently fail.
- Never retry indefinitely — 3 attempts max, then escalate.
```

这种模式可以防止最常见的代理失败模式：确认任务但没有真正完成。

## 多程序架构

对于管理多个关注点的代理，将常设指令组织为具有明确边界的独立程序：

```markdown
## Program 1: [Domain A] (Weekly)

...

## Program 2: [Domain B] (Monthly + On-Demand)

...

## Program 3: [Domain C] (As-Needed)

...

## Escalation Rules (All Programs)

- [Common escalation criteria]
- [Approval gates that apply across programs]
```

每个程序应该有：

- 独立的**触发节奏**（每周、每月、事件驱动、持续）
- 独立的**审批门控**（部分程序需要更多监督）
- 明确的**边界**（代理应知道一个程序在哪里结束、另一个在哪里开始）

## 最佳实践

### 应该做

- 从有限权限开始，随着信任建立逐步扩展
- 为高风险操作定义明确的审批门控
- 添加"禁止事项"章节——边界与权限同等重要
- 结合定时任务实现可靠的基于时间的执行
- 每周回顾代理日志，验证常设指令是否被遵守
- 随着需求变化更新常设指令——它们是活的文档

### 应该避免

- 一开始就授予宽泛权限（"做你认为最好的事"）
- 跳过升级规则——每个程序都需要"何时停下来请求帮助"的条款
- 假设代理会记住口头指令——把所有内容写入文件
- 在单个程序中混合关注点——不同领域使用不同程序
- 忘记用定时任务强制执行——没有触发器的常设指令只是建议

## 相关文档

- [自动化与任务](/automation)：所有自动化机制概览。
- [定时任务](/automation/cron-jobs)：常设指令的调度执行。
- [Hooks](/automation/hooks)：用于代理生命周期事件的事件驱动脚本。
- [Webhooks](/automation/cron-jobs#webhooks)：入站 HTTP 事件触发器。
- [代理工作区](/concepts/agent-workspace)：常设指令的存放位置，包括自动注入启动文件的完整列表（`AGENTS.md`、`SOUL.md` 等）。
