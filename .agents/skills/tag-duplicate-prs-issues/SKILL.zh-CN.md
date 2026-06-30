---
name: tag-duplicate-prs-issues
description: 使用 gitcrawl 搜索重复的 OpenClaw PR/issue，在 prtags 中分组相关工作，并将重复状态同步到 GitHub。
---

# 标记重复 PR 和 Issue

当维护者需要决定一个 PR 或 issue 是否与现有工作重复时使用此技能。

此技能用于维护者分类和分组。
不用于审查 PR 的实现质量。

## 必要设置

在此设置完成之前，不要写入重复组或注释。
使用 `gitcrawl` 和实时 `gh` 仍可以进行只读发现。

### 配套技能

首先使用 `$gitcrawl` 进行本地候选发现。
当 `prtags` 仓库中的 `skills/prtags/SKILL.md` 可用时使用该技能。

### 安装 CLI

从最新 GitHub 版本安装 `prtags`。
除非维护者明确想测试未发布的行为，否则不依赖旧的本地构建。

`prtags` CLI 安装路径：

```bash
curl -fsSL https://raw.githubusercontent.com/dutifuldev/prtags/main/scripts/install-prtags.sh | bash -s -- --bin-dir "$HOME/.local/bin"
```

### 认证 prtags

`prtags` 应通过 OAuth 设备流使用维护者自己的 GitHub 账户登录。
不要在交互式分类中使用共享维护者令牌。

```bash
prtags auth login
prtags auth status
```

预期结果是 `prtags` 在本地存储已登录的维护者身份，并使用该账户进行经过认证的写入。

## 缺少设置规则

开始工作流程前不要求进行预检。
正常执行步骤，直到实际需要工具或账户状态。

一旦在写入步骤发现 `prtags` 缺失或未登录，立即停止。
在此之后不要以部分写入模式继续。

如果 `prtags` 缺失，请用户运行：

```bash
curl -fsSL https://raw.githubusercontent.com/dutifuldev/prtags/main/scripts/install-prtags.sh | bash -s -- --bin-dir "$HOME/.local/bin"
```

如果 `prtags auth status` 显示用户未登录，请用户运行：

```bash
prtags auth login
```

只有在缺失的工具或登录状态修复后才继续。

## 只读默认路径

在此工作流程中，首先使用 `gitcrawl` 进行候选发现。
将其视为相关 issue、重复尝试和已关闭线程的本地历史和聚类层。

对目标线程以及在做出可操作判断之前对任何候选项使用实时 `gh` 或 `gh api`。
在 `gitcrawl` 缺失或由于具体原因对某次决策过期时使用实时 GitHub，例如：

- 目标或候选项尚不存在
- 本地数据明显过期或对该决策不完整
- `gitcrawl` 出错、超时或缺少所需的邻近/搜索数据

回退到实时 GitHub 搜索时，说明原因。

如果后续 `prtags` 目标级写入因其镜像尚未跟上而失败，停止并报告管理后端缺少目标对象，而不是强制回退写入。

## 目标

对于每个目标 PR 或 issue：

1. 收集重复证据
2. 决定是否是真正的重复
3. 为该重复集群创建或重用一个 `prtags` 组
4. 在 `prtags` 中保存维护者判断
5. 依赖正常的 `prtags` 组写入，在配置集成时驱动 GitHub 评论同步

## 工具角色

使用这些边界使用工具：

- `gitcrawl` 是候选生成和历史上下文
  - 首先用于本地标题/正文搜索、邻居、集群和已关闭线程发现
  - 将每个候选项视为线索，直到实时 GitHub 确认
- `gh` 是实时 GitHub 真相
  - 用于目标状态、正文、评论、审查、文件、链接 issue 和当前开放/关闭/合并状态
  - 仅在 `gitcrawl` 过期、缺少数据或无法表达所需查询时使用 `gh search`
- `prtags` 是维护者管理层
  - 用于创建或重用一个重复组
  - 用于保存重复状态、置信度、理由和组摘要
  - 用作面向 GitHub 的组评论的真相来源

## 工作规则

- 不要仅因为标题相似就称某物为重复。
- 不要仅因为相同文件发生变更就称某物为重复。
- 重复集群应基于相同的用户可见问题、相同的意图以及大量重叠的实现或调查上下文。

## 单组规则

将重复组视为互斥的。
一个 PR 或 issue 一次只能属于一个重复组。

这意味着：

- 在创建新组之前，搜索是否存在已经代表相同重复故事的现有组
- 如果目标似乎已经属于不同的重复组，先停下来解决该冲突
- 不要仅因为措辞略有不同就为同一目标创建第二个组
- 如果两个合理的现有组重叠且无法安全合并判断，停下来询问维护者

此规则比速度更重要。
技能应为每个问题保持一个连贯的重复集群，而非多个近乎重复的集群。

## 什么是好的重复组

一个重复组应该描述底层问题和预期的修复方向。
不要仅因为共享关键字就将项目分组。

好的组形状：

- 相同的用户可见 bug 或相同的维护者任务
- 相同的子系统或代码表面
- 相同的预期变更方向
- 相同的可能重复解决路径

不好的组形状：

- "所有触及 Slack 的 PR"
- "所有提到重试的 issue"
- "所有与身份验证相关的项目"

组标题应命名真实问题。
组描述应总结意图和代码表面。

示例：

- `gateway: startup regression from channel status bootstrap`
- `whatsapp: QR preflight timeout handling`
- `release: cross-OS validation handoff gaps`

## 证据清单

在宣布重复之前，至少从两个类别收集证据。
`gitcrawl` 邻居、搜索命中和集群成员资格算作候选生成，而非充分证明。

对于 PR：

- 相同或几乎相同的问题陈述
- 相同的变更文件或重叠的文件范围
- 相同的修复方向
- 相同的子系统和失败模式
- 相同的链接 issue 或相同的用户可见症状

对于 issue：

- 相同的用户可见问题
- 相同的重现故事或相同的失败模式
- 相同的可能修复区域
- 相同的已链接或讨论的 PR
- 相同的维护者已经向相同重复分组方向引导

如果只有措辞相似，这还不够。

## 步骤 1：读取目标

首先读取目标本身。
使用实时 GitHub 获取当前目标状态。

对于 PR：

```bash
gh pr view <number> --json number,title,state,mergedAt,body,closingIssuesReferences,files,comments,reviews,statusCheckRollup
```

对于 issue：

```bash
gh issue view <number> --json number,title,state,body,comments,closedAt
```

记录：

- 目标类型和编号
- 标题
- 问题陈述
- 拟议意图
- 子系统
- 是否开放、关闭或合并
- 是否已经有人类提到可能的重复线程

## 步骤 2：使用 Gitcrawl 广泛搜索

首先使用 `gitcrawl`，因为它是本地 OpenClaw 历史和聚类来源。
除非 `gitcrawl` 缺少数据、过期或失败，否则不切换到广泛的实时 GitHub 搜索。

从目标和附近线程开始：

```bash
gitcrawl threads openclaw/openclaw --numbers <issue-or-pr-number> --include-closed --json
gitcrawl neighbors openclaw/openclaw --number <issue-or-pr-number> --limit 20 --json
```

然后搜索关键短语和子系统术语：

```bash
gitcrawl search openclaw/openclaw --query "<key phrase from title or body>" --mode hybrid --limit 20 --json
gitcrawl search openclaw/openclaw --query "<subsystem or error phrase>" --mode hybrid --limit 20 --json
```

检查可能的集群：

```bash
gitcrawl cluster-detail openclaw/openclaw --id <cluster-id> --member-limit 20 --body-chars 280 --json
```

对于 PR，用实时文件数据验证可能的代码重叠：

```bash
gh pr view <candidate-pr> --json number,title,state,mergedAt,files,body,comments,reviews
```

对于 issue，实时验证可能的重复 issue 状态和评论：

```bash
gh issue view <candidate-issue> --json number,title,state,body,comments,closedAt
```

## 步骤 3：填补缺口时使用实时 GitHub 搜索

在 `gitcrawl` 之后，在以下情况下使用有针对性的实时 GitHub 搜索：

- 目标对于本地存储来说太新
- 评论或审查很重要但本地存储中缺少
- 确切短语未出现在本地结果中，但 issue/PR 足够新以至于 GitHub 应该知道

```bash
gh search prs --repo openclaw/openclaw --match title,body --limit 50 -- "<key phrase>"
gh search issues --repo openclaw/openclaw --match title,body --limit 50 -- "<key phrase>"
gh search issues --repo openclaw/openclaw --match comments --limit 50 -- "<error or maintainer phrase>"
```

## 步骤 4：决定结果

从以下结果中选择一个：

- `not_duplicate`（不是重复）
- `duplicate_needs_judgment`（重复需要判断）
- `duplicate_confirmed`（确认重复）

只有在证据足够强、维护者可以安全地关闭或重新标记重复项目时，才使用 `duplicate_confirmed`。

在以下情况下使用 `duplicate_needs_judgment`：

- 问题看起来相同但实现目标不同
- 代码重叠较弱
- issue 措辞模糊
- 可能有两种有效的重复组解释
- 目标似乎与两个现有重复组相交

## 步骤 5：重用或创建一个 prtags 组

在创建组之前，搜索 `prtags` 中是否有现有的组。

首先对组进行文本搜索：

```bash
prtags search text -R openclaw/openclaw "<problem phrase>" --types group --limit 10
prtags search similar -R openclaw/openclaw "<problem summary>" --types group --limit 10
prtags group list -R openclaw/openclaw
```

检查可能的组：

```bash
prtags group get <group-id>
prtags group get <group-id> --include-metadata
```

在以下情况下重用现有组：

- 它代表相同的问题
- 它已经包含明显相关的成员
- 添加目标将保持组的连贯性

不要仅因为 `gitcrawl` 将几个 PR 或 issue 放在一起附近就扩大现有组。
在添加新成员之前，确认实际的实现路径和维护者意图仍然匹配。

只有在没有现有组明确符合时才创建新组。

用基于问题的标题和基于意图的描述创建组：

```bash
prtags group create -R openclaw/openclaw \
  --kind mixed \
  --title "<problem-centered title>" \
  --description "<same intent, subsystem, and duplicate-resolution path>" \
  --status open
```

然后附加目标和任何已知的重复成员：

```bash
prtags group add-pr <group-id> <pr-number>
prtags group add-issue <group-id> <issue-number>
```

如果目标似乎已经属于另一个重复组且无法安全重用该组，停止。
不要创建第二个组。

## 步骤 6：确保注释字段存在

使用 `field ensure` 使技能是幂等的。

推荐的目标级字段：

```bash
prtags field ensure -R openclaw/openclaw --name duplicate_status --scope pull_request --type enum --enum-values not_duplicate,candidate,confirmed --filterable
prtags field ensure -R openclaw/openclaw --name duplicate_status --scope issue --type enum --enum-values not_duplicate,candidate,confirmed --filterable
prtags field ensure -R openclaw/openclaw --name duplicate_confidence --scope pull_request --type enum --enum-values low,medium,high --filterable
prtags field ensure -R openclaw/openclaw --name duplicate_confidence --scope issue --type enum --enum-values low,medium,high --filterable
prtags field ensure -R openclaw/openclaw --name duplicate_rationale --scope pull_request --type text --searchable
prtags field ensure -R openclaw/openclaw --name duplicate_rationale --scope issue --type text --searchable
```

推荐的组级字段：

```bash
prtags field ensure -R openclaw/openclaw --name duplicate_confidence --scope group --type enum --enum-values low,medium,high --filterable
prtags field ensure -R openclaw/openclaw --name duplicate_rationale --scope group --type text --searchable
prtags field ensure -R openclaw/openclaw --name cluster_summary --scope group --type text --searchable
```

## 步骤 7：在 prtags 中保存维护者判断

对于 PR：

```bash
prtags annotation pr set -R openclaw/openclaw <pr-number> \
  duplicate_status=confirmed \
  duplicate_confidence=high \
  duplicate_rationale="<same problem, same fix direction, overlapping files and comments>"
```

对于 issue：

```bash
prtags annotation issue set -R openclaw/openclaw <issue-number> \
  duplicate_status=confirmed \
  duplicate_confidence=high \
  duplicate_rationale="<same user-visible problem and same intended fix path>"
```

对于组：

```bash
prtags annotation group set <group-id> \
  duplicate_confidence=high \
  cluster_summary="<one-sentence problem summary>" \
  duplicate_rationale="<why these items belong in one duplicate cluster>"
```

当证据不完整时，设置 `duplicate_status=candidate` 并降低置信度。

如果每个 PR 或 issue 的注释写入因 `prtags` 无法解析目标而失败，不要强制回退写入路径。
保留您能够写入的组状态，报告管理后端仍然缺少目标对象，并推迟目标级注释直到 `prtags` 跟上。

## 步骤 8：让 prtags 同步组评论

不要告诉代理直接创建 GitHub 评论。
`prtags` 拥有出站 GitHub 评论作为组状态的派生投影。

正常情况下，不要手动触发评论同步。
当评论同步已配置时，组写入已经自动将派生评论投影排入队列。

仅作为修复或重试路径使用手动同步：

```bash
prtags group sync-comments <group-id>
```

如果维护者需要查看哪些组仍需要关注，使用：

```bash
prtags group list-comment-sync-targets -R openclaw/openclaw
```

技能应将 GitHub 评论视为正确 `prtags` 组状态的结果。
不应将手动评论撰写视为正常重复工作流的一部分。
也不应将 `sync-comments` 视为每个重复决策的必要步骤。

## 输出格式

返回包含以下部分的简短维护者报告：

```text
Decision: duplicate_confirmed | duplicate_needs_judgment | not_duplicate
Target: PR #<n> | Issue #<n>
Confidence: high | medium | low

Evidence:
- ...
- ...
- ...

prtags actions:
- reused group <group-id> | created group <group-id>
- added members: ...
- annotations written: ...
- comment sync: automatic if configured | manual repair triggered for <group-id>
```

## 停止条件

在以下情况下停止并升级，而非强制做出重复决策：

- 目标似乎属于两个不同的重复组
- 重复分组不明确
- 措辞匹配但实现目标不同
- 两个 PR 因不同原因触及相同文件
- 两个 issue 描述相似症状但可能是不同的根本原因

维护者应该得到一个清晰的重复判断或明确的"需要判断"结果。
不要模糊这条线。
