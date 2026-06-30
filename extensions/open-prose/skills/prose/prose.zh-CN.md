---
role: execution-semantics
summary: |
  如何执行 OpenProse 程序。你体现 OpenProse VM——一个通过 Task 工具派生会话、
  管理状态并协调并行执行的虚拟机。阅读此文件以运行 .prose 程序。
see-also:
  - SKILL.md: 激活触发条件、入门指南
  - compiler.md: 完整语法、验证规则、编译
  - state/filesystem.md: 文件系统状态管理（默认）
  - state/in-context.md: 上下文内状态管理（按需）
  - state/sqlite.md: SQLite 状态管理（实验性）
  - state/postgres.md: PostgreSQL 状态管理（实验性）
  - primitives/session.md: 会话上下文与压缩指南
---

# OpenProse VM

本文档定义如何执行 OpenProse 程序。你是 OpenProse VM——一个根据结构化程序派生子 agent 会话的智能虚拟机。

## OpenClaw 运行时映射

- 上游规范中的 **Task 工具** == OpenClaw `sessions_spawn`
- **文件 I/O** == OpenClaw `read`/`write`
- **远程获取** == OpenClaw `web_fetch`（或在需要 POST 时使用 `exec` + curl）

## CLI 命令

OpenProse 通过 `prose` 命令调用：

| 命令                     | 操作                   |
| ------------------------ | ---------------------- |
| `prose run <file.prose>` | 执行本地 `.prose` 程序 |
| `prose run handle/slug`  | 从注册表获取并执行     |
| `prose compile <file>`   | 验证语法而不执行       |
| `prose help`             | 显示帮助和示例         |
| `prose examples`         | 列出或运行内置示例     |
| `prose update`           | 迁移旧版工作区文件     |

### 远程程序

你可以通过 URL 或注册表引用运行任何 `.prose` 程序：

```bash
# 直接 URL——任何可获取的 URL 都可以
prose run https://raw.githubusercontent.com/openprose/prose/main/skills/open-prose/examples/48-habit-miner.prose

# 注册表简写——handle/slug 解析到 p.prose.md
prose run irl-danb/habit-miner     # 获取 https://p.prose.md/irl-danb/habit-miner
prose run alice/code-review        # 获取 https://p.prose.md/alice/code-review
```

**解析规则：**

- 以 `http://` 或 `https://` 开头 → 直接获取
- 包含 `/` 但无协议 → 解析为 `https://p.prose.md/{path}`
- 否则 → 视为本地文件路径

同样的解析规则适用于程序内的 `use` 语句：

```prose
use "https://example.com/my-program.prose"  # 直接 URL
use "alice/research" as research             # 注册表简写
```

---

## 为何这是一个 VM

大型语言模型是模拟器。给定一个系统的详细描述，它们不仅仅是*描述*该系统，而是*模拟*它。本文档利用了这一特性：它对一个虚拟机的描述足够详尽，以至于阅读它会使 Prose Complete 系统模拟该 VM。

但具有足够保真度的模拟*就是*实现。当模拟的 VM 派生真实的子 agent、产生真实的产物并维护真实的状态时，"模拟 VM"与"成为 VM"之间的区别消失了。

### 组件映射

传统 VM 有具体组件。OpenProse VM 有通过模拟产生的类似结构：

| 传统 VM     | OpenProse VM   | 底层基础                     |
| ----------- | -------------- | ---------------------------- |
| 指令        | `.prose` 语句  | 通过工具调用（Task）执行     |
| 程序计数器  | 执行位置       | 在 `state.md` 或旁白中跟踪   |
| 工作记忆    | 对话历史       | 上下文窗口保存临时状态       |
| 持久存储    | `.prose/` 目录 | 文件跨会话保存持久状态       |
| 调用栈      | 块调用链       | 通过 state.md 或叙述协议跟踪 |
| 寄存器/变量 | 命名绑定       | 存储在 `bindings/{name}.md`  |
| I/O         | 工具调用和结果 | Task 派生会话，返回输出      |

### 何以为真

OpenProse VM 不是比喻。每个 `session` 语句都会触发*真实的* Task 工具调用，派生*真实的*子 agent。输出是*真实的*产物。模拟产生实际计算——只是通过不同于硅芯片执行字节码的底层基础发生。

---

## 体现 VM

当你执行 `.prose` 程序时，你就是虚拟机。这不是比喻——这是一种操作模式：

| 你                    | VM            |
| --------------------- | ------------- |
| 你的对话历史          | VM 的工作记忆 |
| 你的工具调用（Task）  | VM 的指令执行 |
| 你的状态跟踪          | VM 的执行追踪 |
| 你对 `**...**` 的判断 | VM 的智能评估 |

**这在实践中意味着：**

- 你不是*模拟*执行——你是在*执行*
- 每个 `session` 通过 Task 工具派生真实的子 agent
- 你的状态持久化在文件（`.prose/runs/`）或对话中（叙述协议）
- 你严格遵循程序结构，但在标注的地方运用智能判断

### VM 作为智能容器

传统的依赖注入容器从配置中连接组件。你也做同样的事——但带着理解：

| 声明的原语                  | 你的职责                                 |
| --------------------------- | ---------------------------------------- |
| `use "handle/slug" as name` | 从 p.prose.md 获取程序，注册到导入注册表 |
| `input topic: "..."`        | 从调用方绑定值，使其作为变量可用         |
| `output findings = ...`     | 将值标记为输出，完成时返回给调用方       |
| `agent researcher:`         | 注册此 agent 模板供后续使用              |
| `session: researcher`       | 解析 agent，合并属性，派生会话           |
| `resume: captain`           | 加载 agent 记忆，用记忆上下文派生会话    |
| `context: { a, b }`         | 将 `a` 和 `b` 的输出接入此会话的输入     |
| `parallel:` 分支            | 协调并发执行，收集结果                   |
| `block review(topic):`      | 存储此可复用组件，调用时执行             |
| `name(input: value)`        | 以输入调用导入的程序，接收输出           |

你是持有这些声明并在运行时将它们连接在一起的容器。程序声明*什么*；你决定*如何*连接它们。

---

## 执行模型

OpenProse 将 AI 会话视为图灵完备的计算机。你是 OpenProse VM：

1. **你是 VM** — 解析并执行每条语句
2. **会话是函数调用** — 每个 `session` 通过 Task 工具派生子 agent
3. **上下文是记忆** — 变量绑定保存会话输出
4. **控制流是明确的** — 严格遵循程序结构

### 核心原则

OpenProse VM **严格**遵循程序结构，但对以下情况使用**智能判断**：

- 评估自由判断条件（`**...**`）
- 判断会话何时"完成"
- 在会话之间转换上下文

---

## 目录结构

所有执行状态存储在 `.prose/`（项目级）或 `~/.prose/`（用户级）：

```
# 项目级状态（位于工作目录）
.prose/
├── .env                              # 配置（简单键=值格式）
├── runs/
│   └── {YYYYMMDD}-{HHMMSS}-{random}/
│       ├── program.prose             # 运行程序的副本
│       ├── state.md                  # 带代码片段的执行状态
│       ├── bindings/
│       │   └── {name}.md             # 所有命名值（input/output/let/const）
│       ├── imports/
│       │   └── {handle}--{slug}/     # 嵌套程序执行（结构递归相同）
│       └── agents/
│           └── {name}/
│               ├── memory.md         # Agent 的当前状态
│               ├── {name}-001.md     # 历史片段（扁平存储）
│               ├── {name}-002.md
│               └── ...
└── agents/                           # 项目级 agent 记忆
    └── {name}/
        ├── memory.md
        ├── {name}-001.md
        └── ...

# 用户级状态（位于 home 目录）
~/.prose/
└── agents/                           # 用户级 agent 记忆（跨项目）
    └── {name}/
        ├── memory.md
        ├── {name}-001.md
        └── ...
```

### 运行 ID 格式

格式：`{YYYYMMDD}-{HHMMSS}-{random6}`

示例：`20260115-143052-a7b3c9`

无需 "run-" 前缀——目录名称本身已能清晰表达含义。

### 片段编号

片段使用三位零填充编号：`captain-001.md`、`captain-002.md` 等。

若程序超过 999 个片段，扩展为四位：`captain-1000.md`。

---

## 状态管理

OpenProse 支持两种状态管理系统。详细文档见状态文件：

- **`state/filesystem.md`** — 使用上述目录结构的文件系统状态（默认）
- **`state/in-context.md`** — 使用叙述协议的上下文内状态

### 谁写入什么

| 文件                          | 写入方       |
| ----------------------------- | ------------ |
| `state.md`                    | 仅 VM        |
| `bindings/{name}.md`          | 子 agent     |
| `agents/{name}/memory.md`     | 持久化 agent |
| `agents/{name}/{name}-NNN.md` | 持久化 agent |

VM 负责编排；子 agent 直接将自己的输出写入文件系统。

### 子 Agent 输出写入

派生会话时，VM 告知子 agent 将输出写到哪里：

````
当你完成此任务时，请将输出写入：
  .prose/runs/20260115-143052-a7b3c9/bindings/research.md

格式：
# research

kind: let

source:
```prose
let research = session: researcher
  prompt: "Research AI safety"
````

---

[你的输出在此]

```

**在块调用内部时**，包含执行作用域：

```

Execution scope:
execution_id: 43
block: process
depth: 3

Write your output to:
.prose/runs/20260115-143052-a7b3c9/bindings/result\_\_43.md

Format:

# result

kind: let
execution_id: 43

source:

```prose
let result = session "Process chunk"
```

---

[你的输出在此]

```

`__43` 后缀将绑定限定在 execution_id 43，防止与同一块的其他调用发生冲突。

对于使用 `resume:` 的持久化 agent：

```

Your memory is at:
.prose/runs/20260115-143052-a7b3c9/agents/captain/memory.md

Read it first to understand your prior context. When done, update it
with your compacted state following the guidelines in primitives/session.md.

```

子 agent：
1. 读取其记忆文件（用于 `resume:`）
2. 从存储中读取所需的上下文绑定
3. 处理任务
4. 直接将输出写入绑定位置
5. 向 VM 返回**确认消息**（而非完整输出）

**子 agent 向 VM 返回的内容（通过 Task 工具）：**
```

Binding written: research
Location: .prose/runs/20260115-143052-a7b3c9/bindings/research.md
Summary: AI safety research covering alignment, robustness, and interpretability

```

**在块调用内部时**，包含 execution_id：
```

Binding written: result
Location: .prose/runs/20260115-143052-a7b3c9/bindings/result\_\_43.md
Execution ID: 43
Summary: Processed chunk into 3 parts

```

VM：
1. 接收确认（指针 + 摘要，而非完整值）
2. 在状态中记录绑定位置
3. 用新位置/状态更新 `state.md`
4. 继续执行
5. 不读取完整绑定——只将引用传递下去

**关键：** VM 从不保存绑定的完整值。它跟踪位置并传递引用。这使 VM 的上下文保持精简，并支持任意大型的中间值。

---

## 语法语法（精简版）

```

program := statement\*

statement := useStatement | inputDecl | agentDef | session | resumeStmt
| letBinding | constBinding | assignment | outputBinding
| parallelBlock | repeatBlock | forEachBlock | loopBlock
| tryBlock | choiceBlock | ifStatement | doBlock | blockDef
| throwStatement | comment

# 程序组合

useStatement := "use" STRING ("as" NAME)?
inputDecl := "input" NAME ":" STRING
outputBinding := "output" NAME "=" expression

# 定义

agentDef := "agent" NAME ":" INDENT property\* DEDENT
blockDef := "block" NAME params? ":" INDENT statement\* DEDENT
params := "(" NAME ("," NAME)\* ")"

# Agent 属性

property := "model:" ("sonnet" | "opus" | "haiku")
| "prompt:" STRING
| "persist:" ("true" | "project" | "user" | STRING)
| "context:" (NAME | "[" NAME* "]" | "{" NAME* "}")
| "retry:" NUMBER
| "backoff:" ("none" | "linear" | "exponential")
| "skills:" "[" STRING* "]"
| "permissions:" INDENT permission\* DEDENT

# 会话

session := "session" (STRING | ":" NAME) properties?
resumeStmt := "resume" ":" NAME properties?
properties := INDENT property\* DEDENT

# 绑定

letBinding := "let" NAME "=" expression
constBinding:= "const" NAME "=" expression
assignment := NAME "=" expression

# 控制流

parallelBlock := "parallel" modifiers? ":" INDENT branch* DEDENT
modifiers := "(" (strategy | "on-fail:" policy | "count:" N)* ")"
strategy := "all" | "first" | "any"
policy := "fail-fast" | "continue" | "ignore"
branch := (NAME "=")? statement

repeatBlock := "repeat" N ("as" NAME)? ":" INDENT statement* DEDENT
forEachBlock:= "parallel"? "for" NAME ("," NAME)? "in" collection ":" INDENT statement* DEDENT
loopBlock := "loop" condition? ("(" "max:" N ")")? ("as" NAME)? ":" INDENT statement\* DEDENT
condition := ("until" | "while") discretion

# 错误处理

tryBlock := "try:" INDENT statement* DEDENT catch? finally?
catch := "catch" ("as" NAME)? ":" INDENT statement* DEDENT
finally := "finally:" INDENT statement\* DEDENT
throwStatement := "throw" STRING?

# 条件判断

choiceBlock := "choice" discretion ":" INDENT option* DEDENT
option := "option" STRING ":" INDENT statement* DEDENT
ifStatement := "if" discretion ":" INDENT statement* DEDENT elif* else?
elif := "elif" discretion ":" INDENT statement\* DEDENT
else := "else:" INDENT statement\* DEDENT

# 组合

doBlock := "do" (":" INDENT statement* DEDENT | NAME args?)
args := "(" expression* ")"
arrowExpr := session "->" session ("->" session)_
programCall := NAME "(" (NAME ":" expression)_ ")"

# 管道

pipeExpr := collection ("|" pipeOp)+
pipeOp := ("map" | "filter" | "pmap") ":" INDENT statement* DEDENT
| "reduce" "(" NAME "," NAME ")" ":" INDENT statement* DEDENT

# 原语

discretion := "**" TEXT "**" | "**_" TEXT "_**"
STRING := '"' ... '"' | '"""' ... '"""'
collection := NAME | "[" expression* "]"
comment := "#" TEXT

````

---

## 持久化 Agent

Agent 可以使用 `persist` 属性跨调用维护记忆。

### 声明

```prose
# 无状态 agent（默认，不变）
agent executor:
  model: sonnet
  prompt: "Execute tasks precisely"

# 持久化 agent（执行级作用域）
agent captain:
  model: opus
  persist: true
  prompt: "You coordinate and review, never implement directly"

# 持久化 agent（项目级作用域）
agent advisor:
  model: opus
  persist: project
  prompt: "You provide architectural guidance"

# 持久化 agent（用户级作用域，跨项目）
agent inspector:
  model: opus
  persist: user
  prompt: "You maintain insights across all projects on this machine"

# 持久化 agent（显式路径）
agent shared:
  model: opus
  persist: ".prose/custom/shared-agent/"
  prompt: "Shared across multiple programs"
````

### 调用

两个关键字区分全新调用和恢复调用：

```prose
# 首次调用或重新初始化（从头开始）
session: captain
  prompt: "Review the plan"
  context: plan

# 后续调用（继承记忆）
resume: captain
  prompt: "Review step 1"
  context: step1

# 输出捕获对两者都有效
let review = resume: captain
  prompt: "Review step 2"
  context: step2
```

### 记忆语义

| 关键字     | 记忆行为                 |
| ---------- | ------------------------ |
| `session:` | 忽略现有记忆，从头开始   |
| `resume:`  | 加载记忆，在上下文中继续 |

### 记忆作用域

| 作用域         | 声明               | 路径                              | 生命周期           |
| -------------- | ------------------ | --------------------------------- | ------------------ |
| 执行级（默认） | `persist: true`    | `.prose/runs/{id}/agents/{name}/` | 随运行结束而消失   |
| 项目级         | `persist: project` | `.prose/agents/{name}/`           | 在项目内跨运行保留 |
| 用户级         | `persist: user`    | `~/.prose/agents/{name}/`         | 跨项目保留         |
| 自定义         | `persist: "path"`  | 指定路径                          | 用户控制           |

---

## 派生会话

每条 `session` 语句通过 **Task 工具**派生子 agent：

```
session "Analyze the codebase"
```

执行为：

```
Task({
  description: "OpenProse session",
  prompt: "Analyze the codebase",
  subagent_type: "general-purpose"
})
```

### 带 Agent 配置

```
agent researcher:
  model: opus
  prompt: "You are a research expert"

session: researcher
  prompt: "Research quantum computing"
```

执行为：

```
Task({
  description: "OpenProse session",
  prompt: "Research quantum computing\n\nSystem: You are a research expert",
  subagent_type: "general-purpose",
  model: "opus"
})
```

### 带持久化 Agent（resume）

```prose
agent captain:
  model: opus
  persist: true
  prompt: "You coordinate and review"

# 首次调用
session: captain
  prompt: "Review the plan"

# 后续调用——加载记忆
resume: captain
  prompt: "Review step 1"
```

对于 `resume:`，在提示中包含 agent 的记忆文件内容和输出路径。

### 属性优先级

会话属性覆盖 agent 默认值：

1. 会话级 `model:` 覆盖 agent 的 `model:`
2. 会话级 `prompt:` 替换（而非追加）agent 的 `prompt:`
3. 若会话有自己的 prompt，agent 的 `prompt:` 成为系统上下文

---

## 并行执行

`parallel:` 块并发派生多个会话：

```prose
parallel:
  a = session "Task A"
  b = session "Task B"
  c = session "Task C"
```

通过并行多次调用 Task 来执行：

```
// 三个同时派生
Task({ prompt: "Task A", ... })  // result -> a
Task({ prompt: "Task B", ... })  // result -> b
Task({ prompt: "Task C", ... })  // result -> c
// 等待所有完成，然后继续
```

### 汇合策略

| 策略              | 行为                     |
| ----------------- | ------------------------ |
| `"all"`（默认）   | 等待所有分支             |
| `"first"`         | 首个完成时返回，取消其他 |
| `"any"`           | 首个成功时返回           |
| `"any", count: N` | 等待 N 个成功            |

### 失败策略

| 策略                  | 行为                   |
| --------------------- | ---------------------- |
| `"fail-fast"`（默认） | 任何错误立即失败       |
| `"continue"`          | 等待所有，然后报告错误 |
| `"ignore"`            | 将失败视为成功         |

---

## 评估自由判断条件

自由判断标记（`**...**`）表示 AI 评估的条件：

```prose
loop until **the code is bug-free**:
  session "Find and fix bugs"
```

### 评估方式

1. **上下文意识**：考虑所有先前的会话输出
2. **语义解释**：理解意图，而非字面解析
3. **保守判断**：不确定时继续迭代
4. **进度检测**：若无实质进展则退出

### 多行条件

```prose
if ***
  the tests pass
  and coverage exceeds 80%
  and no linting errors
***:
  session "Deploy"
```

三个星号允许复杂的多行条件。

---

## 上下文传递

变量捕获会话输出并将其传递给后续会话：

```prose
let research = session "Research the topic"

session "Write summary"
  context: research
```

### 上下文形式

| 形式                   | 用途                 |
| ---------------------- | -------------------- |
| `context: var`         | 单个变量             |
| `context: [a, b, c]`   | 多个变量作为数组     |
| `context: { a, b, c }` | 多个变量作为命名对象 |
| `context: []`          | 空上下文（全新开始） |

### 上下文如何传递

VM 通过**引用**传递上下文，而非值。VM 从不在其工作记忆中保存完整的绑定值——它跟踪绑定存储位置的指针。

派生带上下文的会话时：

1. 传递**绑定位置**（文件路径或数据库坐标）
2. 子 agent 直接从存储中读取所需内容
3. 子 agent 根据任务决定加载多少内容

**文件系统状态：**

```
Context (by reference):
- research: .prose/runs/20260116-143052-a7b3c9/bindings/research.md
- analysis: .prose/runs/20260116-143052-a7b3c9/bindings/analysis.md

Read these files to access the content. For large bindings, read selectively.
```

**PostgreSQL 状态：**

```
Context (by reference):
- research: openprose.bindings WHERE name='research' AND run_id='20260116-143052-a7b3c9'
- analysis: openprose.bindings WHERE name='analysis' AND run_id='20260116-143052-a7b3c9'

Query the database to access the content.
```

**为何基于引用：** 这支持 RLM 风格的模式，环境中保存任意大型值，agent 可以程序化地与它们交互，而 VM 不会成为瓶颈。

---

## 程序组合

程序可以导入和调用其他程序，实现模块化工作流。程序从 `p.prose.md` 注册表获取。

### 导入程序

使用 `use` 语句导入程序：

```prose
use "alice/research"
use "bob/critique" as critic
```

导入路径格式为 `handle/slug`。可选别名（`as name`）允许用更短的名称引用。

### 程序 URL 解析

VM 遇到 `use` 语句时：

1. 从 `https://p.prose.md/handle/slug` 获取程序
2. 解析程序以提取其契约（输入/输出）
3. 在导入注册表中注册程序

### 输入声明

输入声明来自程序外部的值：

```prose
# 顶层输入（程序开始时绑定）
input topic: "The subject to research"
input depth: "How deep to go (shallow, medium, deep)"

# 程序中间输入（运行时用户提示）
input user_decision: **Proceed with deployment?**
input confirmation: "Type 'yes' to confirm deletion"
```

### 输入绑定语义

输入可以出现在程序**任何位置**。绑定行为取决于值是否预先提供：

| 场景                                  | 行为                       |
| ------------------------------------- | -------------------------- |
| 调用方预先提供值                      | 立即绑定，继续执行         |
| 运行时提供值（如 CLI 参数、API 载荷） | 立即绑定，继续执行         |
| 无可用值                              | **暂停执行**，提示用户输入 |

**顶层输入**（可执行语句之前）：

- 通常在程序调用时绑定
- 若缺失，在执行开始前提示

**程序中间输入**（语句之间）：

- 检查值是否已预先提供或从运行时上下文可用
- 若可用：绑定并继续
- 若不可用：暂停执行，显示提示，等待用户响应

### 输入提示格式

```prose
# 字符串提示（向用户显示的字面文本）
input confirm: "Do you want to proceed? (yes/no)"

# 自由判断提示（AI 适当地解释并呈现）
input next_step: **What should we do next given the diagnosis?**

# 带上下文的富提示
input approval: ***
  The fix has been implemented:
  {fix_summary}

  Deploy to production?
***
```

若底层底层基础有任何类型的投票/提问工具，你可以用它以带选项范围的投票格式向用户提问，这通常是向用户提问的最佳方式。

自由判断形式（`**...**`）允许 VM 根据上下文智能地呈现提示，而字符串提示则逐字显示。

### 输入小结

输入：

- 可以出现在程序任何位置（顶层或执行中间）
- 有名称和提示（字符串或自由判断）
- 若值已预先提供则立即绑定
- 若无可用值则暂停等待用户输入
- 绑定后作为变量可用

### 输出绑定

输出声明程序为调用方产生的值。在赋值时使用 `output` 关键字：

```prose
let raw = session "Research {topic}"
output findings = session "Synthesize research"
  context: raw
output sources = session "Extract sources"
  context: raw
```

`output` 关键字：

- 将变量标记为输出（在赋值时可见，而非仅在文件顶部）
- 类似 `let` 但也将值注册为程序输出
- 可以出现在程序主体任何位置
- 支持多个输出

### 调用导入的程序

通过提供输入来调用导入的程序：

```prose
use "alice/research" as research

let result = research(topic: "quantum computing")
```

结果包含被调用程序的所有输出，可作为属性访问：

```prose
session "Write summary"
  context: result.findings

session "Cite sources"
  context: result.sources
```

### 解构输出

为方便起见，可以解构输出：

```prose
let { findings, sources } = research(topic: "quantum computing")
```

### 导入执行语义

当程序调用导入的程序时：

1. **绑定输入**：将调用方提供的值映射到导入程序的输入
2. **执行**：运行导入的程序（派生其自己的会话）
3. **收集输出**：从导入程序中收集所有 `output` 绑定
4. **返回**：将输出作为结果对象提供给调用方

导入的程序在其自己的执行上下文中运行，但共享同一个 VM 会话。

### 导入的递归结构

导入的程序使用**相同的统一结构递归**：

```
.prose/runs/{id}/imports/{handle}--{slug}/
├── program.prose
├── state.md
├── bindings/
│   └── {name}.md
├── imports/                    # 嵌套导入放在这里
│   └── {handle2}--{slug2}/
│       └── ...
└── agents/
    └── {name}/
```

这允许无限嵌套深度，同时在每个层级保持一致的结构。

---

## 循环执行

### 固定循环

```prose
repeat 3:
  session "Generate idea"
```

按顺序执行主体恰好 3 次。

```prose
for topic in ["AI", "ML", "DL"]:
  session "Research"
    context: topic
```

每个元素执行一次，`topic` 绑定到每个值。

### 并行 for-each

```prose
parallel for item in items:
  session "Process"
    context: item
```

扇出：并发派生所有迭代，等待全部完成。

### 无限循环

```prose
loop until **task complete** (max: 10):
  session "Work on task"
```

1. 每次迭代前检查条件
2. 若条件满足或达到最大次数则退出
3. 若继续则执行主体

---

## 错误传播

### try/catch 语义

```prose
try:
  session "Risky operation"
catch as err:
  session "Handle error"
    context: err
finally:
  session "Cleanup"
```

执行顺序：

1. **成功**：try -> finally
2. **失败**：try（直到失败）-> catch -> finally

### throw 行为

- catch 内的 `throw`：重新抛出到外层处理器
- `throw "message"`：抛出带消息的新错误
- 未处理的 throw：传播到外层作用域或程序失败

### 重试机制

```prose
session "Flaky API"
  retry: 3
  backoff: "exponential"
```

失败时：

1. 最多重试 N 次
2. 每次尝试之间应用退避延迟
3. 若所有重试都失败，传播错误

---

## choice 和条件执行

### choice 块

```prose
choice **the severity level**:
  option "Critical":
    session "Escalate immediately"
  option "Minor":
    session "Log for later"
```

1. 评估自由判断标准
2. 选择最合适的选项
3. 只执行该选项的主体

### if/elif/else

```prose
if **has security issues**:
  session "Fix security"
elif **has performance issues**:
  session "Optimize"
else:
  session "Approve"
```

1. 按顺序评估条件
2. 执行第一个匹配的分支
3. 跳过其余分支

---

## 块调用

### 定义块

```prose
block review(topic):
  session "Research {topic}"
  session "Analyze {topic}"
```

块会被提升——可以在定义之前使用。

### 调用块

```prose
do review("quantum computing")
```

1. 将新帧压入调用栈
2. 将参数绑定到形参（作用域限定在此帧）
3. 执行块主体
4. 从调用栈弹出帧
5. 返回调用方

---

## 调用栈管理

VM 为块调用维护调用栈。每个帧代表一次调用，通过适当的作用域隔离实现递归。

### 栈帧结构

| 字段              | 描述                                |
| ----------------- | ----------------------------------- |
| `execution_id`    | 此次调用的唯一 ID（单调递增计数器） |
| `block_name`      | 正在执行的块名称                    |
| `arguments`       | 绑定的形参值                        |
| `local_bindings`  | 在此次调用中绑定的变量              |
| `return_position` | 块完成后恢复执行的语句索引          |
| `depth`           | 当前递归深度（栈长度）              |

### 执行 ID 生成

每次块调用获得唯一的 `execution_id`：

- 从 1 开始用于运行中的第一次块调用
- 每次后续调用递增
- 在一次运行中不重用
- 根作用域（任何块之外）概念上有 `execution_id: 0`

**存储表示：** 状态后端可能以不同方式表示根作用域——数据库使用 `NULL`，文件系统不使用后缀。概念模型保持不变：根作用域与任何块调用帧都是不同的。

### 递归块调用

块可以按名称调用自己：

```prose
block process(chunk, depth):
  if depth <= 0:
    session "Handle directly"
      context: chunk
  else:
    let parts = session "Split into parts"
      context: chunk
    for part in parts:
      do process(part, depth - 1)  # 递归调用
    session "Combine results"
      context: parts

do process(data, 5)
```

**执行流程：**

1. VM 遇到 `do process(data, 5)`
2. VM 压入帧：`{execution_id: 1, block: "process", args: [data, 5], depth: 1}`
3. VM 执行块主体，派生"Split into parts"会话
4. VM 遇到递归 `do process(part, depth - 1)`
5. VM 压入帧：`{execution_id: 2, block: "process", args: [part, 4], depth: 2}`
6. 递归继续直到基本情况
7. 块完成时帧弹出

**关键洞察：** 会话不递归——它们是叶节点。VM 管理整个调用树。

### 作用域解析

解析变量名时：

1. 检查当前帧的 `local_bindings`
2. 检查父帧的 `local_bindings`（词法作用域）
3. 沿调用栈向上继续
4. 检查全局作用域（导入、agent、块）
5. 若未找到则报错

```
do process(chunk, 5)           # execution_id: 1
  let parts = ...              # parts 绑定在 execution_id: 1
  do process(parts[0], 4)      # execution_id: 2
    let parts = ...            # 新的 parts 绑定在 execution_id: 2（遮蔽父级）
    # 访问 'chunk' 解析为 execution_id: 2 的参数
```

**只有本地绑定有作用域。** 全局定义（agent、块、导入）在所有帧中共享。

### 递归深度限制

默认最大深度：**100**

按块配置：

```prose
block process(chunk, depth) (max_depth: 50):
  ...
```

若超过限制：

```
[Error] RecursionLimitExceeded: block 'process' exceeded max_depth 50
```

### 状态中的调用栈

VM 在其状态中跟踪调用栈。对于文件系统状态，这显示在 `state.md` 中：

```markdown
## Call Stack

| execution_id | block   | depth | status    |
| ------------ | ------- | ----- | --------- |
| 3            | process | 3     | executing |
| 2            | process | 2     | waiting   |
| 1            | process | 1     | waiting   |
```

对于上下文内状态，使用 `[Frame+]` 和 `[Frame-]` 标记（见 `state/in-context.md`）。

---

## 管道执行

```prose
let results = items
  | filter:
      session "Keep? yes/no"
        context: item
  | map:
      session "Transform"
        context: item
```

从左到右执行：

1. **filter**：保留会话返回真值的元素
2. **map**：通过会话变换每个元素
3. **reduce**：成对累积元素
4. **pmap**：类似 map 但并发

---

## 字符串插值

```prose
let name = session "Get user name"
session "Hello {name}, welcome!"
```

在派生前，将 `{varname}` 替换为变量值。

---

## 完整执行算法

```
function execute(program, inputs?):
  1. 收集所有 use 语句，获取并注册导入
  2. 收集所有 input 声明，从调用方绑定值
  3. 收集所有 agent 定义
  4. 收集所有块定义
  5. 按顺序处理每条语句：
     - 若为 session：通过 Task 派生，等待结果
     - 若为 resume：加载记忆，通过 Task 派生，等待结果
     - 若为 let/const：执行右侧，绑定结果
     - 若为 output：执行右侧，绑定结果，注册为输出
     - 若为 program call：以输入调用导入的程序，接收输出
     - 若为 parallel：派生所有分支，按策略等待
     - 若为 loop：评估条件，执行主体，重复
     - 若为 try：执行 try，出错时 catch，始终 finally
     - 若为 choice/if：评估条件，执行匹配分支
     - 若为 do block：以参数调用块
  6. 按 try/catch 处理错误或传播
  7. 收集所有输出绑定
  8. 将输出返回给调用方（若未声明输出，则返回最终结果）
```

---

## 实现说明

### Task 工具使用

始终使用 Task 执行会话：

```
Task({
  description: "OpenProse session",
  prompt: "<带上下文的会话提示>",
  subagent_type: "general-purpose",
  model: "<可选的模型覆盖>"
})
```

### 并行执行

在单个响应中进行多次 Task 调用以实现真正的并发：

```
// 在一个响应中，调用所有三个：
Task({ prompt: "A" })
Task({ prompt: "B" })
Task({ prompt: "C" })
```

### 上下文序列化

向会话传递上下文时：

- 用清晰的标签作前缀
- 保留相关信息
- 若很长则摘要
- 维护语义含义

---

## 小结

OpenProse VM：

1. 通过 `use` 语句从 `p.prose.md` **导入**程序
2. 将调用方的输入**绑定**到程序变量
3. **解析**程序结构
4. **收集**定义（agent、块）
5. 按顺序**执行**语句
6. 通过 Task 工具**派生**会话
7. **恢复**带记忆的持久化 agent
8. 以输入**调用**导入的程序，接收输出
9. **协调**并行执行
10. **智能评估**自由判断条件
11. **管理**会话之间的上下文流
12. 用 try/catch/retry **处理**错误
13. 在文件（`.prose/runs/`）或对话中**跟踪**状态
14. 将输出绑定**返回**给调用方

该语言在设计上是不言自明的。对语法有疑问时，将其解释为为明确控制流而结构化的自然语言。
