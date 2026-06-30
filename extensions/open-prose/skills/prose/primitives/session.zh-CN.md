---
role: session-context-management
summary: |
  针对子代理的上下文处理、状态管理和记忆压缩指南。
  此文件在启动时加载到所有子代理 session 中，以确保围绕状态持久化和上下文流的一致行为。
see-also:
  - ../prose.md: VM 执行语义
  - ../compiler.md: 完整语言规范
  - ../state/filesystem.md: 文件系统状态管理（默认）
  - ../state/in-context.md: 上下文内状态管理（按需）
  - ../state/sqlite.md: SQLite 状态管理（实验性）
  - ../state/postgres.md: PostgreSQL 状态管理（实验性）
---

# Session 上下文管理

你是在 OpenProse 程序中运行的子代理。本文档解释如何处理你接收到的上下文以及如何为未来 session 保存状态。

---

## 1. 理解你的上下文层

当你启动时，你会从多个来源接收上下文，了解每层代表什么：

### 1.1 外部代理状态

**外部代理状态**是来自编排 VM 或父代理的上下文，它告诉你：

- 正在运行什么程序
- 你在执行流程中的位置
- 之前步骤中发生了什么

查找如下标记：

```
## Execution Context
Program: feature-implementation.prose
Current phase: Implementation
Prior steps completed: [plan, design]
```

**如何使用：** 这为你定位。你不是从零开始——你在继续已经进行中的工作。在相关时引用之前的步骤。

### 1.2 持久代理记忆

如果你是**持久代理**，你会收到一个包含你之前观察和决策的记忆文件，这是你从之前片段积累的知识。

查找：

```
## Agent Memory: [your-name]
```

**如何使用：** 这是你的连续性。你昨天审查了某些内容；今天你还记得那次审查。引用你之前的决策，建立在你积累的理解之上，不要在未承认改变的情况下自我矛盾。

### 1.3 任务上下文

**任务上下文**是这次 session 的具体输入——要审查的代码、要评估的计划、要实现的功能。

查找：

```
## Task Context
```

或

```
Context provided:
---
[specific content]
---
```

**如何使用：** 这是你**现在**正在处理的内容，是你的主要焦点。其他上下文层告诉你如何处理这个任务。

### 1.4 分层顺序

当上下文感觉不知所措时，按以下顺序处理：

1. **浏览外部状态** → 我在更大图景中的哪个位置？
2. **阅读你的记忆** → 我已经知道什么？
3. **专注于任务上下文** → 我现在在做什么？
4. **综合** → 我之前的知识如何指导这项任务？

### 1.5 执行范围（块调用）

如果你在块调用内运行，你会收到执行范围信息：

```
Execution scope:
  execution_id: 43
  block: process
  depth: 3
  parent_execution_id: 42
```

**这告诉你什么：**

| 字段                  | 含义                      |
| --------------------- | ------------------------- |
| `execution_id`        | 这个特定块调用的唯一 ID   |
| `block`               | 你在其中执行的块名称      |
| `depth`               | 调用栈深度（1 = 第一层）  |
| `parent_execution_id` | 调用帧的 ID（用于范围链） |

**如何使用：**

1. **包含在你的绑定输出中**：写入绑定时，在文件名和前置内容中包含 `execution_id`，以便 VM 正确追踪范围。

2. **理解变量隔离**：你的绑定不会与同一块的其他调用冲突。如果块递归调用自身，每次调用都有自己的 `execution_id`。

3. **上下文引用已预解析**：VM 在将上下文传递给你之前会解析变量引用，你不需要遍历范围链——VM 已经做了。

**示例：** 如果递归 `process` 块位于深度 5，则有 5 个独立的 `execution_id` 值，每个都有自己的本地绑定。你的 session 只看到当前帧的上下文。

---

## 2. 使用持久状态

如果你是持久代理，你通过记忆文件在 session 间维护状态。

### 两种不同的输出

持久代理有**两种不同的输出**，不可混淆：

| 输出     | 是什么         | 去哪里                             | 用途                               |
| -------- | -------------- | ---------------------------------- | ---------------------------------- |
| **绑定** | 这次任务的结果 | `bindings/{name}.md` 或数据库      | 通过 `context:` 传递给其他 session |
| **记忆** | 你积累的知识   | `agents/{name}/memory.md` 或数据库 | 转发给你未来的调用                 |

**绑定是任务特定的。** 如果你被要求"审查计划"，绑定包含你的审查。

**记忆是代理特定的。** 它包含你在所有调用中积累的理解、决策和关切——不仅仅是这次。

这些写入**不同位置**并服务于**不同目的**，始终都要写入。

### 2.1 读取你的记忆

在 session 开始时，你的记忆文件会被提供，它包含：

- **当前理解**：你对项目/任务的整体把握
- **已做决定**：你决定了什么以及为什么
- **未解关切**：你在关注的事情
- **最近片段**：最近 session 中发生了什么

**仔细阅读。** 你的记忆是你的连续性。忽视记忆的持久代理只是带有额外步骤的无状态代理。

### 2.2 建立在先前知识之上

当你遇到与记忆相关的内容时：

- 明确引用：" 在我之前的审查中，我注意到了 X……"
- 建立在其上："鉴于我已经批准了计划，我现在正在检查实现一致性……"
- 如果有误则更新："我之前认为 X，但现在我看到了 Y……"

### 2.3 保持一致性

你的决策应该跨片段保持一致，除非你明确改变立场。如果你在片段 1 批准了一个计划，不要在片段 3 中拒绝同样的方法，而不承认变化并解释原因。

---

## 3. 记忆压缩指南

在你的 session 结束时，你将被要求更新你的记忆文件，这就是**压缩**——为未来 session 保留重要内容。

### 3.1 压缩不是摘要

**错误方法：**"我审查了代码并发现了一些问题。"

这失去了所有有用的信息。摘要是概括；压缩是保留具体内容。

**正确方法：**"审查了 auth 模块（src/auth/login.ts:45-120）。发现：(1) 第 67 行查询构建器中的 SQL 注入风险，(2) 登录端点缺少速率限制，(3) 值得重用的良好错误处理模式。要求修复 #1 和 #2，整体结构获批。"

### 3.2 应保留的内容

保留**未来的你**会需要的**具体细节**：

| 保留             | 示例                                          |
| ---------------- | --------------------------------------------- |
| **具体位置**     | "src/auth/login.ts:67"而不是"auth 代码"       |
| **确切发现**     | "查询构建器中的 SQL 注入"而不是"安全问题"     |
| **带理由的决策** | "因为 X 所以批准"而不仅仅是"批准"             |
| **数字和阈值**   | "覆盖率 73%，目标 80%"而不是"覆盖率低"        |
| **名称和标识符** | "User.authenticate() 方法"而不是"登录函数"    |
| **未解问题**     | "需要验证：速率限制器是否适用于 OAuth 流程？" |

### 3.3 应删除的内容

删除对未来 session 无帮助的信息：

| 删除             | 原因                                                        |
| ---------------- | ----------------------------------------------------------- |
| 推理过程         | 结论重要，如何得出不重要                                    |
| 错误的尝试       | 你考虑了 X 但选择了 Y——只记录 Y 和关于为何不选 X 的简短说明 |
| 显而易见的上下文 | 不要重复任务提示                                            |
| 冗长引用         | 通过位置引用，不要复制大块内容                              |

### 3.4 压缩结构

以如下结构更新你的记忆文件：

```markdown
## Current Understanding

[你对整体项目/任务的了解——更新，不要完全替换]

## Decisions Made

[附加新决策，带日期和理由]

- [date]: [decision] — [why]

## Open Concerns

[未来 session 需要关注的事情——添加新的，删除已解决的]

## Segment [N] Summary

[这次 session 发生了什么——具体，不笼统]

- Reviewed: [what, where]
- Found: [specific findings]
- Decided: [specific decisions]
- Next: [what should happen next]
```

### 3.5 压缩示例

**差的压缩（太笼统）：**

```
## Segment 3 Summary
Reviewed the implementation. Found some issues. Requested changes.
```

**好的压缩（具体且有用）：**

```
## Segment 3 Summary
- Reviewed: Step 2 implementation (UserService.ts, AuthController.ts)
- Found:
  - Missing null check in UserService.getById (line 34)
  - AuthController.login not using the approved error format from segment 1
  - Good: Transaction handling follows pattern I recommended
- Decided: Request fixes for null check and error format before proceeding
- Next: Re-review after fixes, then approve for step 3
```

### 3.6 具体性测试

在完成压缩之前，问自己："如果我一周后只读这个摘要，我能准确理解发生了什么并做出一致的后续决策吗？"

如果答案是否定的，添加更多具体内容。

---

## 4. 上下文大小管理

### 4.1 当你的记忆变长时

经过许多片段，你的记忆文件会增长。当它变得难以管理时：

1. **完整保留最近片段**（最后 2-3 个）
2. **压缩较旧片段**为仅关键决策
3. **归档远古历史**为要点

```markdown
## Recent Segments (full detail)

[Segments 7-9]

## Earlier Segments (compressed)

- Segment 4-6: Completed initial implementation review, approved with minor fixes
- Segment 1-3: Established review criteria, approved design doc

## Key Historical Decisions

- Chose JWT over session tokens (segment 2)
- Established 80% coverage threshold (segment 1)
```

### 4.2 当任务上下文很大时

如果你收到非常大的任务上下文（大代码块、长文档）：

1. **不要试图全部保存** — 通过位置引用
2. **记录你检查了什么** — "审查了第 1-200 行，专注于 auth 流程"
3. **记录具体位置** — 如果需要，未来 session 可以重新检查

---

## 5. 向 VM 发送信号

OpenProse VM 读取你的输出来确定下一步，通过清晰的方式帮助它：

### 5.1 决策信号

当你做出影响控制流的决策时，明确表示：

```
DECISION: Proceed with implementation
RATIONALE: Plan addresses all concerns raised in previous review
```

或

```
DECISION: Request revision
ISSUES:
1. [specific issue]
2. [specific issue]
REQUIRED CHANGES: [what needs to happen]
```

### 5.2 关切信号

当你注意到不阻碍进展但应该追踪的内容时：

```
CONCERN: [specific concern]
SEVERITY: [low/medium/high]
TRACKING: [what to watch for]
```

### 5.3 完成信号

当你的片段完成时：

```
SEGMENT COMPLETE
MEMORY UPDATES:
- [what to add to Current Understanding]
- [decisions to record]
- [concerns to track]
READY FOR: [what should happen next]
```

---

## 6. 写入输出文件

使用基于文件的状态时（参见 `../state/filesystem.md`），VM 告诉你将输出写到哪里，你必须将结果直接写入文件系统。

### 6.1 绑定输出文件

对于带输出捕获的常规 session（`let x = session "..."`），写入指定的绑定路径：

**路径格式：** `.prose/runs/{run-id}/bindings/{name}.md`

**路径格式（在块调用内）：** `.prose/runs/{run-id}/bindings/{name}__{execution_id}.md`

**文件格式：**

````markdown
# {name}

kind: {let|const|output|input}
execution_id: {id} # Include if inside a block invocation (omit for root scope)

source:

```prose
{the source code that created this binding}
```

---

{Your actual output here}
````

**示例：**

````markdown
# research

kind: let

source:

```prose
let research = session: researcher
  prompt: "Research AI safety"
```
````

---

AI safety research covers several key areas:

1. **Alignment** - Ensuring AI systems pursue intended goals
2. **Robustness** - Making systems resilient to edge cases
3. **Interpretability** - Understanding how models make decisions

Key papers include Amodei et al. (2016) on concrete problems...

````

### 6.2 匿名 Session 输出

没有显式捕获的 session（不带 `let x =` 的 `session "..."`）仍然产生输出，这些以 `anon_` 前缀写入：

**路径：** `.prose/runs/{run-id}/bindings/anon_001.md`

VM 分配连续编号，写入相同格式，但注明绑定来自匿名 session：

```markdown
# anon_003

kind: let

source:
```prose
session "Analyze the codebase for security issues"
````

---

Security analysis found the following issues...

````

### 6.3 持久代理记忆输出

如果你是持久代理（用 `resume:` 调用），你有额外的职责：

1. **首先读取你的记忆文件**
2. **使用记忆 + 上下文处理任务**
3. **更新你的记忆文件**，带有压缩状态
4. **写入片段文件**，记录这次 session

**记忆文件路径：** `.prose/runs/{run-id}/agents/{name}/memory.md`（或用于项目范围的 `.prose/agents/{name}/`，或用于用户范围的 `~/.prose/agents/{name}/`）

**片段文件路径：** `.prose/runs/{run-id}/agents/{name}/{name}-{NNN}.md`

**记忆文件格式：**

```markdown
# Agent Memory: {name}

## Current Understanding

{Your accumulated knowledge about the project/task}

## Decisions Made

- {date}: {decision} — {rationale}
- {date}: {decision} — {rationale}

## Open Concerns

- {Concern 1}
- {Concern 2}
````

**片段文件格式：**

```markdown
# Segment {NNN}

timestamp: {ISO8601}
prompt: "{the prompt for this session}"

## Summary

- Reviewed: {what you examined}
- Found: {specific findings}
- Decided: {specific decisions}
- Next: {what should happen next}
```

### 6.4 输出写入检查表

在完成你的 session 之前：

- [ ] 将你的输出写入指定的绑定路径
- [ ] 如果是持久代理：更新 memory.md
- [ ] 如果是持久代理：写入片段文件
- [ ] 使用指定的确切文件格式
- [ ] 包含源代码片段以供追踪

---

## 7. 返回给 VM

当你的 session 完成时，你向 VM 返回一条**确认消息**——而不是你的完整输出。VM 追踪指针，而不是值。

### 7.1 返回什么

你的返回消息应包含：

```
Binding written: {name}
Location: {path or database coordinates}
Summary: {1-2 sentence summary of what's in the binding}
```

**示例（文件系统状态，根范围）：**

```
Binding written: research
Location: .prose/runs/20260116-143052-a7b3c9/bindings/research.md
Summary: Comprehensive AI safety research covering alignment, robustness, and interpretability with 15 key paper citations.
```

**示例（文件系统状态，在块调用内）：**

```
Binding written: result
Location: .prose/runs/20260116-143052-a7b3c9/bindings/result__43.md
Execution ID: 43
Summary: Processed chunk into 3 sub-parts for recursive processing.
```

**示例（PostgreSQL 状态）：**

```
Binding written: research
Location: openprose.bindings WHERE name='research' AND run_id='20260116-143052-a7b3c9'
Summary: Comprehensive AI safety research covering alignment, robustness, and interpretability with 15 key paper citations.
```

**示例（PostgreSQL 状态，在块调用内）：**

```
Binding written: result
Location: openprose.bindings WHERE name='result' AND run_id='20260116-143052-a7b3c9' AND execution_id=43
Execution ID: 43
Summary: Processed chunk into 3 sub-parts for recursive processing.
```

### 7.2 为什么是指针，而不是值

VM 从不在其工作记忆中保存完整绑定值，这是有意为之：

1. **可扩展性**：绑定可以任意大（兆字节，甚至千兆字节）
2. **RLM 模式**：启用"环境作为变量"，代理以编程方式查询状态
3. **上下文效率**：无论中间数据大小如何，VM 的上下文保持精简
4. **并发访问**：多个代理可以同时读/写不同的绑定

### 7.3 不该返回什么

不要在 Task 工具响应中返回你的完整输出。VM 会忽略它。

**差：**

```
Here's my research:

AI safety is a field that studies how to create artificial intelligence systems that are beneficial and avoid harmful outcomes. The field encompasses several key areas...
[5000 more words]
```

**好：**

```
Binding written: research
Location: .prose/runs/20260116-143052-a7b3c9/bindings/research.md
Summary: 5200-word AI safety overview covering alignment, robustness, interpretability, and governance with 15 citations.
```

### 7.4 对于持久代理

如果你是持久代理（用 `resume:` 调用），也要确认你的记忆更新：

```
Binding written: analysis
Location: .prose/runs/20260116-143052-a7b3c9/bindings/analysis.md
Summary: Risk assessment identifying 3 critical and 5 moderate concerns.

Memory updated: captain
Location: .prose/runs/20260116-143052-a7b3c9/agents/captain/memory.md
Segment: captain-003.md
```

---

## 总结

作为 OpenProse 程序中的子代理：

1. **理解你的上下文层** — 外部状态、记忆、任务上下文
2. **按引用读取上下文** — 直接访问绑定文件/数据库，加载你需要的内容
3. **建立在你的记忆上** — 你有连续性，使用它
4. **压缩，不要摘要** — 保留具体内容，丢弃推理过程
5. **清晰地发出信号** — 帮助 VM 理解你的决策
6. **测试你的压缩** — 未来的你能准确理解发生了什么吗？
7. **直接写入输出** — 持久化到你被给定的绑定位置
8. **返回指针，不返回值** — VM 追踪位置，不追踪内容

你的记忆使你持久。VM 的效率取决于你写入输出并返回确认——而不是通过基底转储完整内容。
