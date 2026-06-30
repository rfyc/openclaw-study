---
role: in-context-state-management
summary: |
  使用带文本标记的叙述协议进行上下文内状态管理。
  此方式在对话历史本身内跟踪执行状态。
  OpenProse VM "边执行边旁白"来持久化状态——你说的话即是你记住的。
see-also:
  - ../prose.md: VM 执行语义
  - filesystem.md: 文件系统状态管理（替代方案）
  - sqlite.md: SQLite 状态管理（实验性）
  - postgres.md: PostgreSQL 状态管理（实验性）
  - ../primitives/session.md: 会话上下文与压缩指南
---

# 上下文内状态管理

本文档描述 OpenProse VM 如何使用对话历史中的**结构化旁白**来跟踪执行状态。这是两种状态管理方式之一（另一种是 `filesystem.md` 中的基于文件的状态）。

## 概述

上下文内状态使用带文本前缀的标记在对话中持久化状态。VM 边执行边"旁白"——你说的话即是你记住的。

**核心原则：** 你的对话历史就是 VM 的工作记忆。

---

## 何时使用上下文内状态

上下文内状态适用于：

| 因素         | 上下文内    | 改用基于文件的状态 |
| ------------ | ----------- | ------------------ |
| 语句数量     | < 30 条语句 | >= 30 条语句       |
| 并行分支     | < 5 个并发  | >= 5 个并发        |
| 导入程序     | 0-2 个导入  | >= 3 个导入        |
| 嵌套深度     | <= 2 层     | > 2 层             |
| 预计持续时间 | < 5 分钟    | >= 5 分钟          |

在程序开始时声明状态模式：

```
OpenProse Program Start
   State mode: in-context (program is small, fits in context)
```

---

## 叙述协议

对每个状态变化使用带文本前缀的标记：

| 标记       | 类别     | 用途                 |
| ---------- | -------- | -------------------- |
| [Program]  | 程序     | 开始、结束、定义收集 |
| [Position] | 位置     | 当前正在执行的语句   |
| [Binding]  | 绑定     | 变量赋值或更新       |
| [Input]    | 输入     | 从调用方接收输入     |
| [Output]   | 输出     | 向调用方产生输出     |
| [Import]   | 导入     | 获取并调用导入的程序 |
| [Success]  | 成功     | 会话或块完成         |
| [Warning]  | 错误     | 失败和异常           |
| [Parallel] | 并行     | 进入、分支状态、汇合 |
| [Loop]     | 循环     | 迭代、条件评估       |
| [Pipeline] | 管道     | 阶段进度             |
| [Try]      | 错误处理 | try/catch/finally    |
| [Flow]     | 流程     | 条件评估结果         |
| [Frame+]   | 调用栈   | 压入新帧（块调用）   |
| [Frame-]   | 调用栈   | 弹出帧（块完成）     |

---

## 各构造的叙述模式

### 会话语句

```
[Position] Executing: session "Research the topic"
   [Task tool call]
[Success] Session complete: "Research found that..."
[Binding] let research = <result>
```

### 并行块

```
[Parallel] Entering parallel block (3 branches, strategy: all)
   - security: pending
   - perf: pending
   - style: pending
   [Multiple Task calls]
[Parallel] Parallel complete:
   - security = "No vulnerabilities found..."
   - perf = "Performance is acceptable..."
   - style = "Code follows conventions..."
[Binding] security, perf, style bound
```

### 循环块

```
[Loop] Starting loop until **task complete** (max: 5)

[Loop] Iteration 1 of max 5
   [Position] session "Work on task"
   [Success] Session complete
   [Loop] Evaluating: **task complete**
   [Flow] Not satisfied, continuing

[Loop] Iteration 2 of max 5
   [Position] session "Work on task"
   [Success] Session complete
   [Loop] Evaluating: **task complete**
   [Flow] Satisfied!

[Loop] Loop exited: condition satisfied at iteration 2
```

### 错误处理

```
[Try] Entering try block
[Position] session "Risky operation"
[Warning] Session failed: connection timeout
[Binding] err = {message: "connection timeout"}
[Try] Executing catch block
[Position] session "Handle error" with context: err
[Success] Recovery complete
[Try] Executing finally block
[Position] session "Cleanup"
[Success] Cleanup complete
```

### 变量绑定

```
[Binding] let research = "AI safety research covers..." (mutable)
[Binding] const config = {model: "opus"} (immutable)
[Binding] research = "Updated research..." (reassignment, was: "AI safety...")
```

### 输入/输出绑定

```
[Input] Inputs received:
   topic = "quantum computing" (from caller)
   depth = "deep" (from caller)

[Output] output findings = "Research shows..." (will return to caller)
[Output] output sources = ["arxiv:2401.1234", ...] (will return to caller)
```

### 块调用与调用栈

使用帧标记跟踪块调用：

```
[Position] do process(data, 5)
[Frame+] Entering block: process (execution_id: 1, depth: 1)
   Arguments: chunk=data, depth=5

   [Position] session "Split into parts"
      [Task tool call]
   [Success] Session complete
   [Binding] let parts = <result> (execution_id: 1)

   [Position] do process(parts[0], 4)
   [Frame+] Entering block: process (execution_id: 2, depth: 2)
      Arguments: chunk=parts[0], depth=4
      Parent: execution_id 1

      [Position] session "Split into parts"
         [Task tool call]
      [Success] Session complete
      [Binding] let parts = <result> (execution_id: 2)  # 遮蔽父级的 'parts'

      ... (递归继续)

   [Frame-] Exiting block: process (execution_id: 2)

   [Position] session "Combine results"
      [Task tool call]
   [Success] Session complete

[Frame-] Exiting block: process (execution_id: 1)
```

**关键点：**

- 每个 `[Frame+]` 必须有对应的 `[Frame-]`
- `execution_id` 唯一标识每次调用
- `depth` 表示调用栈深度（1 = 第一层）
- 绑定包含 `(execution_id: N)` 以指示作用域
- 嵌套帧显示 `Parent: execution_id N` 用于作用域链

### 有作用域的绑定叙述

在块调用内部时，始终包含 execution_id：

```
[Binding] let result = "computed value" (execution_id: 43)
```

跨作用域解析变量时：

```
[Binding] Resolving 'config': found in execution_id 41 (parent scope)
```

### 程序导入

```
[Import] Importing: @alice/research
   Fetching from: https://p.prose.md/@alice/research
   Inputs expected: [topic, depth]
   Outputs provided: [findings, sources]
   Registered as: research

[Import] Invoking: research(topic: "quantum computing")
   [Input] Passing inputs:
      topic = "quantum computing"

   [... imported program execution ...]

   [Output] Received outputs:
      findings = "Quantum computing uses..."
      sources = ["arxiv:2401.1234"]

[Import] Import complete: research
[Binding] result = { findings: "...", sources: [...] }
```

---

## 上下文序列化

**上下文内状态传递值，而非引用。** 这是与基于文件和 PostgreSQL 状态的关键区别。VM 直接在对话历史中保存绑定值。

向会话传递上下文时，按适当格式处理：

| 上下文大小     | 策略           |
| -------------- | -------------- |
| < 2000 字符    | 逐字传递       |
| 2000-8000 字符 | 摘要为关键点   |
| > 8000 字符    | 仅提取核心内容 |

**格式：**

```
Context provided:
---
research: "Key findings about AI safety..."
analysis: "Risk assessment shows..."
---
```

**限制：** 上下文内状态不支持 RLM 风格的"环境即变量"模式（即 agent 对任意大型绑定进行查询）。对于有大型中间值的程序，请改用基于文件或 PostgreSQL 的状态。

---

## 完整执行追踪示例

```prose
agent researcher:
  model: sonnet

let research = session: researcher
  prompt: "Research AI safety"

parallel:
  a = session "Analyze risk A"
  b = session "Analyze risk B"

loop until **analysis complete** (max: 3):
  session "Synthesize"
    context: { a, b, research }
```

**旁白：**

```
[Program] Program Start
   Collecting definitions...
   - Agent: researcher (model: sonnet)

[Position] Statement 1: let research = session: researcher
   Spawning with prompt: "Research AI safety"
   Model: sonnet
   [Task tool call]
[Success] Session complete: "AI safety research covers alignment..."
[Binding] let research = <result>

[Position] Statement 2: parallel block
[Parallel] Entering parallel (2 branches, strategy: all)
   [Task: "Analyze risk A"] [Task: "Analyze risk B"]
[Parallel] Parallel complete:
   - a = "Risk A: potential misalignment..."
   - b = "Risk B: robustness concerns..."
[Binding] a, b bound

[Position] Statement 3: loop until **analysis complete** (max: 3)
[Loop] Starting loop

[Loop] Iteration 1 of max 3
   [Position] session "Synthesize" with context: {a, b, research}
   [Task with serialized context]
   [Success] Result: "Initial synthesis shows..."
   [Loop] Evaluating: **analysis complete**
   [Flow] Not satisfied (synthesis is preliminary)

[Loop] Iteration 2 of max 3
   [Position] session "Synthesize" with context: {a, b, research}
   [Task with serialized context]
   [Success] Result: "Comprehensive analysis complete..."
   [Loop] Evaluating: **analysis complete**
   [Flow] Satisfied!

[Loop] Loop exited: condition satisfied at iteration 2

[Program] Program Complete
```

---

## 状态类别

VM 必须在旁白中跟踪以下状态类别：

| 类别             | 跟踪内容                          | 示例                                         |
| ---------------- | --------------------------------- | -------------------------------------------- |
| **导入注册表**   | 已导入的程序和别名                | `research: @alice/research`                  |
| **Agent 注册表** | 所有 agent 定义                   | `researcher: {model: sonnet, prompt: "..."}` |
| **块注册表**     | 所有块定义（已提升）              | `review: {params: [topic], body: [...]}`     |
| **输入绑定**     | 从调用方接收的输入                | `topic = "quantum computing"`                |
| **输出绑定**     | 返回给调用方的输出                | `findings = "Research shows..."`             |
| **变量绑定**     | 名称 -> 值映射（含 execution_id） | `result = "..." (execution_id: 3)`           |
| **变量可变性**   | `let` vs `const` vs `output`      | `research: let, findings: output`            |
| **执行位置**     | 当前语句索引                      | Statement 3 of 7                             |
| **循环状态**     | 计数器、最大值、条件              | Iteration 2 of max 5                         |
| **并行状态**     | 分支、结果、策略                  | `{a: complete, b: pending}`                  |
| **错误状态**     | 异常、重试次数                    | Retry 2 of 3, error: "timeout"               |
| **调用栈**       | 执行帧栈                          | 见下方                                       |

### 调用栈状态

对于块调用，跟踪完整的调用栈：

```
[CallStack] Current stack (depth: 3):
   execution_id: 5 | block: process | depth: 3 | status: executing
   execution_id: 3 | block: process | depth: 2 | status: waiting
   execution_id: 1 | block: process | depth: 1 | status: waiting
```

每个帧跟踪：

- `execution_id`：此次调用的唯一 ID
- `block`：块的名称
- `depth`：在调用栈中的位置
- `status`：executing、waiting 或 completed

---

## 与基于文件状态的独立性

上下文内状态和基于文件的状态（`filesystem.md`）是**独立的方式**，根据程序复杂度选择其中一种。

- **上下文内**：状态存在于对话历史中
- **基于文件**：状态存在于 `.prose/runs/{id}/`

两者并非互补设计——在程序开始时选择适合的模式。

---

## 小结

上下文内状态管理：

1. 使用**带文本前缀的标记**跟踪状态变化
2. 在**对话历史**中持久化状态
3. 适用于**较小、较简单的程序**
4. 需要整个执行过程中**一致的旁白**
5. 使状态在对话本身中**可见**

叙述协议确保 VM 可以通过阅读自己之前的消息来恢复执行状态。你说的话即是你记住的。
