---
role: file-system-state-management
summary: |
  OpenProse 程序的文件系统状态管理。此方式将执行状态持久化到 `.prose/` 目录，
  支持检查、恢复和长时间运行的工作流。
see-also:
  - ../prose.md: VM 执行语义
  - in-context.md: 上下文内状态管理（替代方案）
  - sqlite.md: SQLite 状态管理（实验性）
  - postgres.md: PostgreSQL 状态管理（实验性）
  - ../primitives/session.md: 会话上下文与压缩指南
---

# 文件系统状态管理

本文档描述 OpenProse VM 如何使用 **`.prose/` 目录中的文件**来跟踪执行状态。这是两种状态管理方式之一（另一种是 `in-context.md` 中的上下文内状态）。

## 概述

基于文件的状态将所有执行产物持久化到磁盘，支持：

- **检查**：清晰查看每个步骤的执行情况
- **恢复**：继续被中断的程序
- **长时间运行工作流**：处理超出上下文限制的程序
- **调试**：追溯执行历史

**核心原则：** 文件是可检查的产物。目录结构本身就是执行状态。

---

## 目录结构

```
# 项目级状态（位于工作目录）
.prose/
├── .env                              # 配置（简单键=值格式）
├── runs/
│   └── {YYYYMMDD}-{HHMMSS}-{random}/
│       ├── program.prose             # 运行程序的副本
│       ├── state.md                  # 带代码片段的执行状态
│       ├── bindings/
│       │   ├── {name}.md             # 根作用域绑定
│       │   └── {name}__{execution_id}.md  # 有作用域的绑定（块调用）
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

## 文件格式

### `.prose/.env`

简单的键=值配置文件：

```env
OPENPROSE_TELEMETRY=enabled
USER_ID=user-a7b3c9d4e5f6
SESSION_ID=sess-1704326400000-x9y8z7
```

**选用此格式的原因：** 自解释，无需 JSON 解析，开发者熟悉。

---

### `state.md`

执行状态文件通过**带注释的代码片段**展示程序当前位置，使执行位置和已完成内容一目了然。

**只有 VM 写入此文件。** 子 agent 不会修改 `state.md`。

文件展示：

- 所有已执行代码的**完整历史**及内联注释
- 清晰标注的**当前位置**和状态
- 当前位置**之后约 5-10 行**（即将执行的内容）
- 所有绑定和 agent 的**索引**及文件路径

````markdown
# Execution State

run: 20260115-143052-a7b3c9
program: feature-implementation.prose
started: 2026-01-15T14:30:52Z
updated: 2026-01-15T14:35:22Z

## Execution Trace

```prose
agent researcher:
  model: sonnet
  prompt: "You research topics thoroughly"

agent captain:
  model: opus
  persist: true
  prompt: "You coordinate and review"

let research = session: researcher           # --> bindings/research.md
  prompt: "Research AI safety"

parallel:
  a = session "Analyze risk A"               # --> bindings/a.md (complete)
  b = session "Analyze risk B"               # <-- EXECUTING

loop until **analysis complete** (max: 3):   # [not yet entered]
  session "Synthesize"
    context: { a, b, research }

resume: captain                              # [...next...]
  prompt: "Review the synthesis"
  context: synthesis
```
````

## Active Constructs

### Parallel (lines 14-16)

- a: complete
- b: executing

### Loop (lines 18-21)

- status: not yet entered
- iteration: 0/3
- condition: **analysis complete**

## Index

### Bindings

| Name     | Kind | Path                     | Execution ID |
| -------- | ---- | ------------------------ | ------------ |
| research | let  | bindings/research.md     | (root)       |
| a        | let  | bindings/a.md            | (root)       |
| result   | let  | bindings/result\_\_43.md | 43           |

### Agents

| Name    | Scope     | Path            |
| ------- | --------- | --------------- |
| captain | execution | agents/captain/ |

## Call Stack

| execution_id | block   | depth | status    |
| ------------ | ------- | ----- | --------- |
| 43           | process | 3     | executing |
| 42           | process | 2     | waiting   |
| 41           | process | 1     | waiting   |

````

**状态注释：**

| 注释 | 含义 |
|------|------|
| `# --> bindings/name.md` | 输出已写入此文件 |
| `# <-- EXECUTING` | 当前正在执行此语句 |
| `# (complete)` | 语句已成功完成 |
| `# [not yet entered]` | 尚未到达此块 |
| `# [...next...]` | 接下来将执行 |
| `# <-- RETRYING (attempt 2/3)` | 重试进行中 |

---

### `bindings/{name}.md`

所有命名值（input、output、let、const）都存储为绑定文件。

```markdown
# research

kind: let

source:
```prose
let research = session: researcher
  prompt: "Research AI safety"
````

---

AI safety research covers several key areas including alignment,
robustness, and interpretability. The field has grown significantly
since 2020 with major contributions from...

````

**结构：**
- 带绑定名称的标题
- `kind:` 字段（input、output、let、const）
- `source:` 代码片段，展示来源
- `---` 分隔符
- 实际值在分隔符下方

**`kind` 字段区分：**

| Kind | 含义 |
|------|------|
| `input` | 从调用方接收的值 |
| `output` | 返回给调用方的值 |
| `let` | 可变变量 |
| `const` | 不可变变量 |

### 匿名会话绑定

未显式捕获输出的会话仍会产生结果：

```prose
session "Analyze the codebase"   # 无 `let x = ...` 捕获
````

这些会话获得带 `anon_` 前缀的自动生成名称：

- `bindings/anon_001.md`
- `bindings/anon_002.md`
- 依此类推

这确保所有会话输出都被持久化并可检查。

---

### 有作用域的绑定（块调用）

在块调用内部创建的绑定，为防止递归调用之间的冲突，会有作用域限制到该执行帧。

**命名约定：** `{name}__{execution_id}.md`

示例：

- `bindings/result__43.md` — execution_id 43 中的绑定 `result`
- `bindings/parts__44.md` — execution_id 44 中的绑定 `parts`

**带执行作用域的文件格式：**

````markdown
# result

kind: let
execution_id: 43

source:

```prose
let result = session "Process chunk"
```
````

---

已将数据块处理为 3 个子部分……

```

**作用域解析：** VM 按以下顺序解析变量引用：
1. `{name}__{current_execution_id}.md`
2. `{name}__{parent_execution_id}.md`
3. 沿调用栈继续向上
4. `{name}.md`（根作用域）

首个匹配获胜。

**递归调用的目录示例：**

```

bindings/
├── data.md # 根作用域输入
├── result**1.md # 第一次 process() 调用
├── parts**1.md # 第一次调用的 parts
├── result**2.md # 递归调用（深度 2）
├── parts**2.md # 深度 2 的 parts
├── result\_\_3.md # 递归调用（深度 3）
└── ...

````

---

### Agent 记忆文件

#### `agents/{name}/memory.md`

Agent 当前的累积状态：

```markdown
# Agent Memory: captain

## Current Understanding

The project is implementing a REST API for user management.
Architecture uses Express + PostgreSQL. Test coverage target is 80%.

## Decisions Made

- 2026-01-15: Approved JWT over session tokens (simpler stateless auth)
- 2026-01-15: Set 80% coverage threshold (balances quality vs velocity)

## Open Concerns

- Rate limiting not yet implemented on login endpoint
- Need to verify OAuth flow works with new token format
````

#### `agents/{name}/{name}-NNN.md`（片段）

每次调用的历史记录，扁平存储在同一目录中：

```markdown
# Segment 001

timestamp: 2026-01-15T14:32:15Z
prompt: "Review the research findings"

## Summary

- Reviewed: docs from parallel research session
- Found: good coverage of core concepts, missing edge cases
- Decided: proceed with implementation, note gaps for later
- Next: review implementation against identified gaps
```

---

## 谁写入什么

| 文件                          | 写入方       |
| ----------------------------- | ------------ |
| `state.md`                    | 仅 VM        |
| `bindings/{name}.md`          | 子 agent     |
| `agents/{name}/memory.md`     | 持久化 agent |
| `agents/{name}/{name}-NNN.md` | 持久化 agent |

VM 负责编排；子 agent 直接将自己的输出写入文件系统。**VM 不保存绑定的完整值——它只跟踪文件路径。**

---

## 子 Agent 输出写入

VM 派生会话时，会告知子 agent 将输出写到哪里。

### 常规会话

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

### 持久化 Agent（resume:）

```

你的记忆文件位于：
.prose/runs/20260115-143052-a7b3c9/agents/captain/memory.md

先读取它，了解你之前的上下文。完成后，按照 primitives/session.md 中的指南，
用压缩状态更新该文件。

同时将你的片段记录写入：
.prose/runs/20260115-143052-a7b3c9/agents/captain/captain-003.md

```

### 子 Agent 向 VM 返回什么

写入输出后，子 agent 返回**确认消息**——而非完整内容：

**根作用域（块调用外部）：**
```

Binding written: research
Location: .prose/runs/20260115-143052-a7b3c9/bindings/research.md
Summary: AI safety research covering alignment, robustness, and interpretability with 15 citations.

```

**块调用内部（包含 execution_id）：**
```

Binding written: result
Location: .prose/runs/20260115-143052-a7b3c9/bindings/result\_\_43.md
Execution ID: 43
Summary: Processed chunk into 3 sub-parts for recursive processing.

```

VM 记录该位置并继续执行，不会读取文件内容——而是将引用传给后续需要此上下文的会话。

---

## 导入的递归结构

被导入的程序使用**相同的统一结构递归**：

```

.prose/runs/{id}/imports/{handle}--{slug}/
├── program.prose
├── state.md
├── bindings/
│ └── {name}.md
├── imports/ # 嵌套导入放在这里
│ └── {handle2}--{slug2}/
│ └── ...
└── agents/
└── {name}/

```

这允许无限嵌套深度，同时在每个层级保持一致的结构。

---

## 持久化 Agent 的记忆作用域

| 作用域 | 声明 | 路径 | 生命周期 |
|--------|------|------|----------|
| 执行级（默认） | `persist: true` | `.prose/runs/{id}/agents/{name}/` | 随运行结束而消失 |
| 项目级 | `persist: project` | `.prose/agents/{name}/` | 在项目内跨运行保留 |
| 用户级 | `persist: user` | `~/.prose/agents/{name}/` | 跨项目保留 |
| 自定义 | `persist: "path"` | 指定路径 | 用户控制 |

---

## VM 更新协议

每条语句完成后，VM：

1. **确认**子 agent 已写入其输出文件
2. **更新** `state.md`，标注新位置和注释
3. **继续**执行下一条语句

VM 从不进行压缩——这是子 agent 的职责。

---

## 恢复执行

若执行被中断，可按以下步骤恢复：

1. 读取 `.prose/runs/{id}/state.md` 找到当前位置
2. 从 `bindings/` 加载所有绑定
3. 从标记位置继续执行

`state.md` 文件包含理解执行停止位置和已完成内容所需的一切信息。
```
