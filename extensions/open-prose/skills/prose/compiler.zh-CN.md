---
role: language-specification
summary: |
  OpenProse 的完整语法、验证规则和编译语义。
  在编译、验证或解决语法歧义时阅读此文件。假设
  prose.md 已在上下文中用于执行语义。
see-also:
  - SKILL.md: 激活触发条件、入门指南
  - prose.md: 执行语义，如何运行程序
  - state/filesystem.md: 文件系统状态管理（默认）
  - state/in-context.md: 上下文内状态管理（按需）
---

# OpenProse 语言参考

OpenProse 是一种用于 AI 会话的编程语言。AI 会话是一台图灵完备的计算机；本文档提供语言语法、语义和执行模型的完整文档。

---

## 文档目的：编译器 + 验证器

本文档具有双重作用：

### 作为编译器

被要求"编译" `.prose` 文件时，使用此规范：

1. 根据语法**解析**程序
2. **验证**程序是否格式正确且语义有效
3. 将程序**转换**为"最佳实践"规范形式：
   - 在适当时展开语法糖
   - 规范化格式和结构
   - 应用优化（例如，提升块定义）

### 作为验证器

验证标准：**只有 `prose.md` 的空白 agent 能否将此程序理解为不言自明？**

验证时检查：

- 语法正确性（所有构造符合语法）
- 语义有效性（引用可解析，类型匹配）
- 自解释性（程序在没有完整规范的情况下清晰）

如果某个构造是模糊或非显而易见的，应将其标记或转换为更清晰的形式。

### 何时阅读此文档

- **请求编译**：完整阅读以应用所有规则
- **请求验证**：完整阅读以检查所有约束
- **遇到语法歧义**：参考特定章节
- **仅解释**：改用 `prose.md`（更小，更快）

---

## 目录

1. [概述](#overview)
2. [文件格式](#file-format)
3. [注释](#comments)
4. [字符串字面量](#string-literals)
5. [use 语句](#use-statements-program-composition)
6. [输入声明](#input-declarations)
7. [输出绑定](#output-bindings)
8. [程序调用](#program-invocation)
9. [Agent 定义](#agent-definitions)
10. [session 语句](#session-statement)
11. [resume 语句](#resume-statement)
12. [变量与上下文](#variables--context)
13. [组合块](#composition-blocks)
14. [并行块](#parallel-blocks)
15. [固定循环](#fixed-loops)
16. [无限循环](#unbounded-loops)
17. [管道操作](#pipeline-operations)
18. [错误处理](#error-handling)
19. [choice 块](#choice-blocks)
20. [条件语句](#conditional-statements)
21. [执行模型](#execution-model)
22. [验证规则](#validation-rules)
23. [示例](#examples)
24. [未来特性](#future-features)

---

## 概述

OpenProse 提供声明式语法用于定义多 agent 工作流。程序由顺序执行的语句组成，每条 `session` 语句派生一个子 agent 来完成任务。

### 设计原则

- **模式而非框架**：最简单的解决方案几乎什么都不需要——只是为英语提供结构
- **自解释**：程序应在最少文档的情况下可理解
- **OpenProse VM 是智能的**：为理解而设计，而非为解析
- **框架无关**：适用于 Claude Code、OpenCode 和任何未来的 agent 框架
- **文件即产物**：`.prose` 是工作的可移植单元

### 当前实现状态

以下特性已实现：

| 特性              | 状态   | 描述                                         |
| ----------------- | ------ | -------------------------------------------- |
| 注释              | 已实现 | `# comment` 语法                             |
| 单行字符串        | 已实现 | `"string"` 带转义                            |
| 简单会话          | 已实现 | `session "prompt"`                           |
| Agent 定义        | 已实现 | `agent name:` 带 model/prompt 属性           |
| 带 agent 的会话   | 已实现 | `session: agent` 带属性覆盖                  |
| use 语句          | 已实现 | `use "@handle/slug" as name`                 |
| Agent 技能        | 已实现 | `skills: ["skill1", "skill2"]`               |
| Agent 权限        | 已实现 | `permissions:` 块带规则                      |
| let 绑定          | 已实现 | `let name = session "..."`                   |
| const 绑定        | 已实现 | `const name = session "..."`                 |
| 变量重新赋值      | 已实现 | `name = session "..."` （仅用于 let）        |
| context 属性      | 已实现 | `context: var` 或 `context: [a, b, c]`       |
| do: 块            | 已实现 | 显式顺序块                                   |
| 内联序列          | 已实现 | `session "A" -> session "B"`                 |
| 命名块            | 已实现 | `block name:` 带 `do name` 调用              |
| 并行块            | 已实现 | `parallel:` 用于并发执行                     |
| 命名并行结果      | 已实现 | parallel 内的 `x = session "..."`            |
| 对象上下文        | 已实现 | `context: { a, b, c }` 简写                  |
| 汇合策略          | 已实现 | `parallel ("first"):` 或 `parallel ("any"):` |
| 失败策略          | 已实现 | `parallel (on-fail: "continue"):`            |
| repeat 块         | 已实现 | `repeat N:` 固定迭代                         |
| 带索引的 repeat   | 已实现 | `repeat N as i:` 带索引变量                  |
| for-each 块       | 已实现 | `for item in items:` 迭代                    |
| 带索引的 for-each | 已实现 | `for item, i in items:` 带索引               |
| 并行 for-each     | 已实现 | `parallel for item in items:` 扇出           |
| 无限循环          | 已实现 | `loop:` 带可选最大迭代次数                   |
| loop until        | 已实现 | `loop until **condition**:` AI 评估          |
| loop while        | 已实现 | `loop while **condition**:` AI 评估          |
| 带索引的 loop     | 已实现 | `loop as i:` 或 `loop until ... as i:`       |
| map 管道          | 已实现 | `items \| map:` 变换每个元素                 |
| filter 管道       | 已实现 | `items \| filter:` 保留匹配元素              |
| reduce 管道       | 已实现 | `items \| reduce(acc, item):` 累积           |
| 并行 map          | 已实现 | `items \| pmap:` 并发变换                    |
| 管道链接          | 已实现 | `\| filter: ... \| map: ...`                 |
| try/catch 块      | 已实现 | `try:` 带 `catch:` 错误处理                  |
| try/catch/finally | 已实现 | `finally:` 用于清理                          |
| 错误变量          | 已实现 | `catch as err:` 访问错误上下文               |
| throw 语句        | 已实现 | `throw` 或 `throw "message"`                 |
| retry 属性        | 已实现 | `retry: 3` 失败时自动重试                    |
| 退避策略          | 已实现 | `backoff: exponential` 重试之间的延迟        |
| 输入声明          | 已实现 | `input name: "description"`                  |
| 输出绑定          | 已实现 | `output name = expression`                   |
| 程序调用          | 已实现 | `name(input: value)` 调用导入的程序          |
| 多行字符串        | 已实现 | `"""..."""` 保留空白                         |
| 字符串插值        | 已实现 | `"Hello {name}"` 变量替换                    |
| 块参数            | 已实现 | `block name(param):` 带参数                  |
| 块调用参数        | 已实现 | `do name(arg)` 传递参数                      |
| choice 块         | 已实现 | `choice **criteria**: option "label":`       |
| if/elif/else      | 已实现 | `if **condition**:` 条件分支                 |
| 持久化 agent      | 已实现 | `persist: true` 或 `persist: project`        |
| resume 语句       | 已实现 | `resume: agent` 继承记忆继续                 |

---

## 文件格式

| 属性       | 值                  |
| ---------- | ------------------- |
| 扩展名     | `.prose`            |
| 编码       | UTF-8               |
| 大小写敏感 | 区分大小写          |
| 缩进       | 空格（类似 Python） |
| 行结束符   | LF 或 CRLF          |

---

## 注释

注释在程序中提供文档，执行时忽略。

### 语法

```prose
# 这是独立注释

session "Hello"  # 这是内联注释
```

### 规则

1. 注释以 `#` 开始，延伸到行尾
2. 注释可以单独一行，或在语句后面
3. 空注释有效：`#`
4. 字符串字面量中的 `#` **不是**注释

### 示例

```prose
# 程序头注释
# Author: Example

session "Do something"  # 解释这里做了什么

# 此注释在语句之间
session "Do another thing"
```

### 编译行为

注释在**编译时被删除**。OpenProse VM 从不看到它们。它们对执行没有影响，仅用于人类文档。

### 重要说明

- **字符串内的注释不是注释**：

  ```prose
  session "Say hello # this is part of the string"
  ```

  字符串字面量中的 `#` 是提示的一部分，不是注释。

- **缩进块内允许注释**：
  ```prose
  agent researcher:
      # 此注释在块内
      model: sonnet
  # 此注释在块外
  ```

---

## 字符串字面量

字符串字面量表示文本值，主要用于会话提示。

### 语法

字符串用双引号括起来：

```prose
"This is a string"
```

### 转义序列

支持以下转义序列：

| 序列 | 含义   |
| ---- | ------ |
| `\\` | 反斜杠 |
| `\"` | 双引号 |
| `\n` | 换行   |
| `\t` | 制表符 |

### 示例

```prose
session "Hello world"
session "Line one\nLine two"
session "She said \"hello\""
session "Path: C:\\Users\\name"
session "Column1\tColumn2"
```

### 规则

1. 单行字符串必须以关闭的 `"` 正确终止
2. 未知转义序列是错误
3. 空字符串 `""` 有效，但用作提示时会产生警告

### 多行字符串

多行字符串使用三重双引号（`"""`），保留内部空白和换行：

```prose
session """
This is a multi-line prompt.
It preserves:
  - Indentation
  - Line breaks
  - All internal whitespace
"""
```

#### 多行字符串规则

1. 开头的 `"""` 后必须跟换行
2. 内容继续直到关闭的 `"""`
3. 转义序列与单行字符串相同
4. 分隔符内的前导/尾随空白被保留

### 字符串插值

字符串可以使用 `{varname}` 语法嵌入变量引用：

```prose
let name = session "Get the user's name"

session "Hello {name}, welcome to the system!"
```

#### 插值语法

- 变量通过将变量名括在大括号中来引用：`{varname}`
- 在单行和多行字符串中都有效
- 空大括号 `{}` 被视为字面文本，不是插值
- 不支持嵌套大括号

#### 示例

```prose
let research = session "Research the topic"
let analysis = session "Analyze findings"

# 单变量插值
session "Based on {research}, provide recommendations"

# 多重插值
session "Combining {research} with {analysis}, synthesize insights"

# 带插值的多行
session """
Review Summary:
- Research: {research}
- Analysis: {analysis}
Please provide final recommendations.
"""
```

#### 插值规则

1. 变量名必须是有效标识符
2. 引用的变量必须在作用域内
3. 空大括号 `{}` 是字面文本
4. 反斜杠可以转义大括号：`\{` 产生字面 `{`

### 验证

| 检查             | 结果 |
| ---------------- | ---- |
| 未终止的字符串   | 错误 |
| 未知转义序列     | 错误 |
| 空字符串作为提示 | 警告 |
| 未定义的插值变量 | 错误 |

---

## use 语句（程序组合）

use 语句从 `p.prose.md` 注册表导入其他 OpenProse 程序，实现模块化工作流。

### 语法

```prose
use "@handle/slug"
use "@handle/slug" as alias
```

### 路径格式

导入路径格式为 `@handle/slug`：

- `@handle` 标识程序作者/组织
- `slug` 是程序名称

可选别名（`as name`）允许用更短的名称引用。

### 示例

```prose
# 导入程序
use "@alice/research"

# 带别名导入
use "@bob/critique" as critic
```

### 程序 URL 解析

OpenProse VM 遇到 `use` 语句时：

1. 从 `https://p.prose.md/@handle/slug` 获取程序
2. 解析程序以提取其契约（输入/输出）
3. 在导入注册表中注册程序

### 验证规则

| 检查           | 严重性 | 消息                                   |
| -------------- | ------ | -------------------------------------- |
| 空路径         | 错误   | Use path cannot be empty               |
| 路径格式无效   | 错误   | Path must be @handle/slug format       |
| 重复导入       | 错误   | Program already imported               |
| 重复时缺少别名 | 错误   | Alias required when importing multiple |

### 执行语义

use 语句在任何 agent 定义或会话之前处理。OpenProse VM：

1. 在执行开始时获取并验证所有导入的程序
2. 从每个程序提取输入/输出契约
3. 在导入注册表中注册程序供后续调用

---

## 输入声明

输入声明程序从调用方期望的值。

### 语法

```prose
input name: "description"
```

### 示例

```prose
input topic: "The subject to research"
input depth: "How deep to go (shallow, medium, deep)"
```

### 语义

输入：

- 声明在程序顶部（可执行语句之前）
- 有名称和描述（用于文档）
- 在程序主体内作为变量可用
- 调用程序时必须由调用方提供

### 验证规则

| 检查                 | 严重性 | 消息                                                 |
| -------------------- | ------ | ---------------------------------------------------- |
| 空输入名称           | 错误   | Input name cannot be empty                           |
| 空描述               | 警告   | Consider adding a description                        |
| 重复输入名称         | 错误   | Input already declared                               |
| 可执行语句之后的输入 | 错误   | Inputs must be declared before executable statements |

---

## 输出绑定

输出声明程序为调用方产生的值。

### 语法

```prose
output name = expression
```

### 示例

```prose
let raw = session "Research {topic}"
output findings = session "Synthesize research"
  context: raw
output sources = session "Extract sources"
  context: raw
```

### 语义

`output` 关键字：

- 将变量标记为输出（在赋值时可见，而非仅在文件顶部）
- 类似 `let` 但也将值注册为程序输出
- 可以出现在程序主体任何位置
- 支持多个输出

### 验证规则

| 检查         | 严重性 | 消息                                |
| ------------ | ------ | ----------------------------------- |
| 空输出名称   | 错误   | Output name cannot be empty         |
| 重复输出名称 | 错误   | Output already declared             |
| 输出名称冲突 | 错误   | Output name conflicts with variable |

---

## 程序调用

通过提供输入来调用导入的程序。

### 语法

```prose
name(input1: value1, input2: value2)
```

### 示例

```prose
use "@alice/research" as research

let result = research(topic: "quantum computing")
```

### 访问输出

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

### 执行语义

当程序调用导入的程序时：

1. **绑定输入**：将调用方提供的值映射到导入程序的输入
2. **执行**：运行导入的程序（派生其自己的会话）
3. **收集输出**：从导入程序中收集所有 `output` 绑定
4. **返回**：将输出作为结果对象提供给调用方

导入的程序在其自己的执行上下文中运行，但共享同一个 VM 会话。

### 验证规则

| 检查         | 严重性 | 消息                           |
| ------------ | ------ | ------------------------------ |
| 未知程序     | 错误   | Program not imported           |
| 缺少必需输入 | 错误   | Required input not provided    |
| 未知输入名称 | 错误   | Input not declared in program  |
| 未知输出属性 | 错误   | Output not declared in program |

---

## Agent 定义

Agent 是配置子 agent 行为的可复用模板。一旦定义，agent 可以在 session 语句中引用。

### 语法

```prose
agent name:
  model: sonnet
  prompt: "System prompt for this agent"
  skills: ["skill1", "skill2"]
  permissions:
    read: ["*.md"]
    bash: deny
```

### 属性

| 属性          | 类型   | 值                          | 描述                    |
| ------------- | ------ | --------------------------- | ----------------------- |
| `model`       | 标识符 | `sonnet`、`opus`、`haiku`   | 使用的 Claude 模型      |
| `prompt`      | 字符串 | 任意字符串                  | Agent 的系统提示/上下文 |
| `persist`     | 值     | `true`、`project` 或 STRING | 为 agent 启用持久记忆   |
| `skills`      | 数组   | 字符串数组                  | 分配给此 agent 的技能   |
| `permissions` | 块     | 权限规则                    | Agent 的访问控制        |

### persist 属性

`persist` 属性允许 agent 跨调用维护记忆：

```prose
# 执行级持久化（记忆随运行结束而消失）
agent captain:
  model: opus
  persist: true
  prompt: "You coordinate and review"

# 项目级持久化（记忆跨运行保留）
agent advisor:
  model: opus
  persist: project
  prompt: "You provide architectural guidance"

# 自定义路径持久化
agent shared:
  model: opus
  persist: ".prose/custom/shared-agent/"
  prompt: "Shared across programs"
```

| 值        | 记忆位置                          | 生命周期         |
| --------- | --------------------------------- | ---------------- |
| `true`    | `.prose/runs/{id}/agents/{name}/` | 随执行结束而消失 |
| `project` | `.prose/agents/{name}/`           | 跨执行保留       |
| STRING    | 指定路径                          | 用户控制         |

### skills 属性

`skills` 属性将导入的技能分配给 agent：

```prose
use "@anthropic/web-search"
use "@anthropic/summarizer" as summarizer

agent researcher:
  skills: ["web-search", "summarizer"]
```

技能必须先导入才能分配。引用未导入的技能会产生警告。

### permissions 属性

`permissions` 属性控制 agent 访问：

```prose
agent secure-agent:
  permissions:
    read: ["*.md", "*.txt"]
    write: ["output/"]
    bash: deny
    network: allow
```

#### 权限类型

| 类型      | 描述                                    |
| --------- | --------------------------------------- |
| `read`    | Agent 可读取的文件（glob 模式）         |
| `write`   | Agent 可写入的文件（glob 模式）         |
| `execute` | Agent 可执行的文件（glob 模式）         |
| `bash`    | Shell 访问：`allow`、`deny` 或 `prompt` |
| `network` | 网络访问：`allow`、`deny` 或 `prompt`   |

#### 权限值

| 值       | 描述                                      |
| -------- | ----------------------------------------- |
| `allow`  | 授予权限                                  |
| `deny`   | 拒绝权限                                  |
| `prompt` | 询问用户权限                              |
| Array    | 允许的模式列表（用于 read/write/execute） |

### 示例

```prose
# 定义研究 agent
agent researcher:
  model: sonnet
  prompt: "You are a research assistant skilled at finding and synthesizing information"

# 定义写作 agent
agent writer:
  model: opus
  prompt: "You are a technical writer who creates clear, concise documentation"

# 仅有模型的 agent
agent quick:
  model: haiku

# 仅有提示的 agent
agent expert:
  prompt: "You are a domain expert"

# 带技能的 agent
agent web-researcher:
  model: sonnet
  skills: ["web-search", "summarizer"]

# 带权限的 agent
agent file-handler:
  permissions:
    read: ["*.md", "*.txt"]
    write: ["output/"]
    bash: deny
```

### 模型选择

| 模型     | 适用场景                   |
| -------- | -------------------------- |
| `haiku`  | 快速、简单的任务；快速响应 |
| `sonnet` | 均衡性能；通用目的         |
| `opus`   | 复杂推理；详细分析         |

### 执行语义

当会话引用 agent 时：

1. Agent 的 `model` 属性决定使用哪个 Claude 模型
2. Agent 的 `prompt` 属性作为系统上下文包含
3. 会话属性可以覆盖 agent 默认值

### 验证规则

| 检查            | 严重性 | 消息                           |
| --------------- | ------ | ------------------------------ |
| 重复 agent 名称 | 错误   | Agent already defined          |
| 无效模型值      | 错误   | Must be sonnet, opus, or haiku |
| 空 prompt 属性  | 警告   | Consider providing a prompt    |
| 重复属性        | 错误   | Property already specified     |

---

## session 语句

session 语句是 OpenProse 中主要的可执行构造。它派生子 agent 来完成任务。

### 语法变体

#### 简单会话（带内联提示）

```prose
session "prompt text"
```

#### 带 agent 引用的会话

```prose
session: agentName
```

#### 带 agent 的命名会话

```prose
session sessionName: agentName
```

#### 带属性的会话

```prose
session: agentName
  prompt: "Override the agent's default prompt"
  model: opus  # 覆盖 agent 的模型
```

### 属性覆盖

当会话引用 agent 时，可以覆盖 agent 的属性：

```prose
agent researcher:
  model: sonnet
  prompt: "You are a research assistant"

# 使用不同模型的 researcher
session: researcher
  model: opus

# 使用不同提示的 researcher
session: researcher
  prompt: "Research this specific topic in depth"

# 同时覆盖
session: researcher
  model: opus
  prompt: "Specialized research task"
```

### 执行语义

OpenProse VM 遇到 `session` 语句时：

1. **解析配置**：合并 agent 默认值与会话覆盖
2. **派生子 agent**：使用解析后的配置创建新的 Claude 子 agent
3. **发送提示**：将提示字符串传递给子 agent
4. **等待完成**：阻塞直到子 agent 完成
5. **继续**：继续执行下一条语句

### 执行流程图

```
OpenProse VM                    子 Agent
    |                              |
    |  派生会话                    |
    |----------------------------->|
    |                              |
    |  发送提示                    |
    |----------------------------->|
    |                              |
    |  [处理中...]                 |
    |                              |
    |  会话完成                    |
    |<-----------------------------|
    |                              |
    |  继续下一条语句              |
    v                              v
```

### 顺序执行

多个会话按顺序执行：

```prose
session "First task"
session "Second task"
session "Third task"
```

每个会话等待前一个完成后才开始。

### 使用 Claude Code 的 Task 工具

执行会话时，使用 Task 工具：

```typescript
// 简单会话
Task({
  description: "OpenProse session",
  prompt: "The prompt from the session statement",
  subagent_type: "general-purpose",
});

// 带 agent 配置的会话
Task({
  description: "OpenProse session",
  prompt: "The session prompt",
  subagent_type: "general-purpose",
  model: "opus", // 来自 agent 或覆盖
});
```

### 验证规则

| 检查                | 严重性 | 消息                                         |
| ------------------- | ------ | -------------------------------------------- |
| 缺少提示和 agent    | 错误   | Session requires a prompt or agent reference |
| 未定义的 agent 引用 | 错误   | Agent not defined                            |
| 空提示 `""`         | 警告   | Session has empty prompt                     |
| 仅空白的提示        | 警告   | Session prompt contains only whitespace      |
| 提示 > 10,000 字符  | 警告   | Consider breaking into smaller tasks         |
| 重复属性            | 错误   | Property already specified                   |

### 示例

```prose
# 简单会话
session "Hello world"

# 带 agent 的会话
agent researcher:
  model: sonnet
  prompt: "You research topics thoroughly"

session: researcher
  prompt: "Research quantum computing applications"

# 命名会话
session analysis: researcher
  prompt: "Analyze the competitive landscape"
```

### 规范形式

编译输出保留结构：

```
Input:
agent researcher:
  model: sonnet

session: researcher
  prompt: "Do research"

Output:
agent researcher:
  model: sonnet
session: researcher
  prompt: "Do research"
```

---

## resume 语句

`resume` 语句继续带有积累记忆的持久化 agent。

### 语法

```prose
resume: agentName
  prompt: "Continue from where we left off"
```

### 语义

| 关键字     | 行为                     |
| ---------- | ------------------------ |
| `session:` | 忽略现有记忆，从头开始   |
| `resume:`  | 加载记忆，在上下文中继续 |

### 示例

```prose
agent captain:
  model: opus
  persist: true
  prompt: "You coordinate and review"

# 首次调用——创建记忆
session: captain
  prompt: "Review the plan"
  context: plan

# 后续调用——加载记忆
resume: captain
  prompt: "Review step 1 of the plan"
  context: step1

# 输出捕获与 resume 一起使用
let review = resume: captain
  prompt: "Final review of all steps"
```

### 验证规则

| 检查                                | 严重性 | 消息                                                                 |
| ----------------------------------- | ------ | -------------------------------------------------------------------- |
| `resume:` 用于非持久化 agent        | 错误   | Agent must have `persist:` property to use `resume:`                 |
| `resume:` 但无现有记忆              | 错误   | No memory file exists for agent; use `session:` for first invocation |
| `session:` 用于有记忆的持久化 agent | 警告   | Will ignore existing memory; use `resume:` to continue               |
| 未定义的 agent 引用                 | 错误   | Agent not defined                                                    |

---

## 变量与上下文

变量允许你捕获会话结果，并将其作为上下文传递给后续会话。

### let 绑定

`let` 关键字创建绑定到会话结果的可变变量：

```prose
let research = session "Research the topic thoroughly"

# research 现在保存该会话的输出
```

变量可以重新赋值：

```prose
let draft = session "Write initial draft"

# 修改草稿
draft = session "Improve the draft"
  context: draft
```

### const 绑定

`const` 关键字创建不可变变量：

```prose
const config = session "Get configuration settings"

# 这将是错误：
# config = session "Try to change"
```

### context 属性

`context` 属性将之前的会话输出传递给新会话：

#### 单一上下文

```prose
let research = session "Research quantum computing"

session "Write summary"
  context: research
```

#### 多重上下文

```prose
let research = session "Research the topic"
let analysis = session "Analyze the findings"

session "Write final report"
  context: [research, analysis]
```

#### 空上下文（全新开始）

使用空数组开启不继承上下文的会话：

```prose
session "Independent task"
  context: []
```

#### 对象上下文简写

传递多个命名结果（特别是来自并行块的），使用对象简写：

```prose
parallel:
  a = session "Task A"
  b = session "Task B"

session "Combine results"
  context: { a, b }
```

这等价于传递一个每个属性都是变量引用的对象。

### 完整示例

```prose
agent researcher:
  model: sonnet
  prompt: "You are a research assistant"

agent writer:
  model: opus
  prompt: "You are a technical writer"

# 收集研究
let research = session: researcher
  prompt: "Research quantum computing developments"

# 分析发现
let analysis = session: researcher
  prompt: "Analyze the key findings"
  context: research

# 使用两个上下文写最终报告
const report = session: writer
  prompt: "Write a comprehensive report"
  context: [research, analysis]
```

### 验证规则

| 检查                   | 严重性 | 消息                                               |
| ---------------------- | ------ | -------------------------------------------------- |
| 重复变量名称           | 错误   | Variable already defined                           |
| const 重新赋值         | 错误   | Cannot reassign const variable                     |
| 未定义的变量引用       | 错误   | Undefined variable                                 |
| 变量与 agent 冲突      | 错误   | Variable name conflicts with agent name            |
| 未定义的上下文变量     | 错误   | Undefined variable in context                      |
| 上下文数组中的非标识符 | 错误   | Context array elements must be variable references |

### 平坦命名空间要求

所有变量名在程序内必须**唯一**。不允许跨作用域遮蔽。

**这是编译错误：**

```prose
let result = session "Outer task"

for item in items:
  let result = session "Inner task"   # 错误：'result' 已定义
    context: item
```

**此约束的原因：** 由于绑定存储为 `bindings/{name}.md`，同名的两个变量会在文件系统上冲突。我们强制唯一性而非引入复杂的作用域规则。

**此约束防止的冲突场景：**

1. 循环内的变量遮蔽循环外的变量
2. 不同 `if`/`elif`/`else` 分支中同名变量
3. 块参数遮蔽外部变量
4. 并行分支复用外部变量名

**例外：** 导入的程序在隔离的命名空间中运行。主程序中的变量 `result` 不与导入程序中的 `result` 冲突（它们写入不同的 `imports/{handle}--{slug}/bindings/` 目录）。

---

## 组合块

组合块允许你将程序组织为可复用的命名单元，并以内联方式表达操作序列。

### do: 块（匿名顺序块）

`do:` 关键字创建显式顺序块。块中的所有语句按顺序执行。

#### 语法

```prose
do:
  statement1
  statement2
  ...
```

#### 示例

```prose
# 显式顺序块
do:
  session "Research the topic"
  session "Analyze findings"
  session "Write summary"

# 将结果赋值给变量
let result = do:
  session "Gather data"
  session "Process data"
```

### 块定义

命名块创建可复用的工作流组件。定义一次，多次调用。

#### 语法

```prose
block name:
  statement1
  statement2
  ...
```

#### 调用块

使用 `do` 后跟块名称来调用定义的块：

```prose
do blockname
```

#### 示例

```prose
# 定义审查流水线
block review-pipeline:
  session "Security review"
  session "Performance review"
  session "Synthesize reviews"

# 定义另一个块
block final-check:
  session "Final verification"
  session "Sign off"

# 使用这些块
do review-pipeline
session "Make fixes based on review"
do final-check
```

### 块参数

块可以接受参数，使其更灵活和可复用。

#### 语法

```prose
block name(param1, param2):
  # param1 和 param2 在此处可用
  statement1
  statement2
```

#### 带参数调用

传递参数来调用参数化块：

```prose
do name(arg1, arg2)
```

#### 示例

```prose
# 定义参数化块
block review(topic):
  session "Research {topic} thoroughly"
  session "Analyze key findings about {topic}"
  session "Summarize {topic} analysis"

# 以不同参数调用
do review("quantum computing")
do review("machine learning")
do review("blockchain")
```

#### 多个参数

```prose
block process-item(item, mode):
  session "Process {item} using {mode} mode"
  session "Verify {item} processing"

do process-item("data.csv", "strict")
do process-item("config.json", "lenient")
```

#### 参数作用域

- 参数作用域限定在块主体内
- 参数遮蔽同名的外部变量（带警告）
- 参数在块内隐式为 `const`

#### 验证规则

| 检查             | 严重性 | 消息                                           |
| ---------------- | ------ | ---------------------------------------------- |
| 参数数量不匹配   | 警告   | Block expects N parameters but got M arguments |
| 参数遮蔽外部变量 | 警告   | Parameter shadows outer variable               |

### 内联序列（箭头操作符）

`->` 操作符将会话链接为单行序列。这是顺序执行的语法糖。

#### 语法

```prose
session "A" -> session "B" -> session "C"
```

等价于：

```prose
session "A"
session "B"
session "C"
```

#### 示例

```prose
# 快速流水线
session "Plan" -> session "Execute" -> session "Review"

# 赋值结果
let workflow = session "Draft" -> session "Edit" -> session "Finalize"
```

### 块提升

块定义会被提升——你可以在定义之前使用块：

```prose
# 在定义之前使用
do validation-checks

# 定义在后面
block validation-checks:
  session "Check syntax"
  session "Check semantics"
```

### 嵌套组合

块和 do: 块可以嵌套：

```prose
block outer-workflow:
  session "Start"
  do:
    session "Sub-task 1"
    session "Sub-task 2"
  session "End"

do:
  do outer-workflow
  session "Final step"
```

### 块与上下文

块与上下文系统一起工作：

```prose
# 捕获 do 块结果
let research = do:
  session "Gather information"
  session "Analyze patterns"

# 在后续会话中使用
session "Write report"
  context: research
```

### 验证规则

| 检查                | 严重性 | 消息                                 |
| ------------------- | ------ | ------------------------------------ |
| 未定义的块引用      | 错误   | Block not defined                    |
| 重复块定义          | 错误   | Block already defined                |
| 块名称与 agent 冲突 | 错误   | Block name conflicts with agent name |
| 空块名称            | 错误   | Block definition must have a name    |

---

## 并行块

并行块允许多个会话并发运行。所有分支同时执行，块等待所有完成后才继续。

### 基本语法

```prose
parallel:
  session "Security review"
  session "Performance review"
  session "Style review"
```

所有三个会话同时开始并发运行。程序等待所有完成后才继续。

### 命名并行结果

将并行分支的结果捕获到变量中：

```prose
parallel:
  security = session "Security review"
  perf = session "Performance review"
  style = session "Style review"
```

这些变量之后可以在后续会话中使用。

### 对象上下文简写

使用对象简写将多个并行结果传递给会话：

```prose
parallel:
  security = session "Security review"
  perf = session "Performance review"
  style = session "Style review"

session "Synthesize all reviews"
  context: { security, perf, style }
```

对象简写 `{ a, b, c }` 等价于传递具有属性 `a`、`b` 和 `c` 的对象，每个属性的值是对应的变量。

### 混合组合

#### 顺序中的并行

```prose
do:
  session "Setup"
  parallel:
    session "Task A"
    session "Task B"
  session "Cleanup"
```

先运行 setup，然后 Task A 和 Task B 并行运行，最后运行 cleanup。

#### 并行中的顺序

```prose
parallel:
  do:
    session "Multi-step task 1a"
    session "Multi-step task 1b"
  do:
    session "Multi-step task 2a"
    session "Multi-step task 2b"
```

每个并行分支包含一个顺序工作流。两个工作流并发运行。

### 将并行块赋值给变量

```prose
let results = parallel:
  session "Task A"
  session "Task B"
```

### 完整示例

```prose
agent reviewer:
  model: sonnet

# 运行并行审查
parallel:
  sec = session: reviewer
    prompt: "Review for security issues"
  perf = session: reviewer
    prompt: "Review for performance issues"
  style = session: reviewer
    prompt: "Review for style issues"

# 合并所有审查
session "Create unified review report"
  context: { sec, perf, style }
```

### 汇合策略

默认情况下，并行块等待所有分支完成。你可以指定替代汇合策略：

#### first（竞速）

第一个分支完成时立即返回，取消其他：

```prose
parallel ("first"):
  session "Try approach A"
  session "Try approach B"
  session "Try approach C"
```

第一个成功结果获胜。其他分支被取消。

#### any（N 个中的 M 个）

当任意 N 个分支成功完成时返回：

```prose
# 默认：任意 1 个成功
parallel ("any"):
  session "Attempt 1"
  session "Attempt 2"

# 特定数量：等待 2 个成功
parallel ("any", count: 2):
  session "Attempt 1"
  session "Attempt 2"
  session "Attempt 3"
```

#### all（默认）

等待所有分支完成：

```prose
# 隐式——这是默认值
parallel:
  session "Task A"
  session "Task B"

# 显式
parallel ("all"):
  session "Task A"
  session "Task B"
```

### 失败策略

控制并行块如何处理分支失败：

#### fail-fast（默认）

若任何分支失败，立即失败并取消其他分支：

```prose
parallel:  # 隐式 fail-fast
  session "Critical task 1"
  session "Critical task 2"

# 显式
parallel (on-fail: "fail-fast"):
  session "Critical task 1"
  session "Critical task 2"
```

#### continue

让所有分支完成，然后报告所有失败：

```prose
parallel (on-fail: "continue"):
  session "Task 1"
  session "Task 2"
  session "Task 3"

# 无论哪些分支失败，都继续
session "Process results, including failures"
```

#### ignore

忽略所有失败，始终成功：

```prose
parallel (on-fail: "ignore"):
  session "Optional enrichment 1"
  session "Optional enrichment 2"

# 即使所有分支都失败，这也始终运行
session "Continue regardless"
```

### 组合修饰符

汇合策略和失败策略可以组合：

```prose
# 带弹性的竞速
parallel ("first", on-fail: "continue"):
  session "Fast but unreliable"
  session "Slow but reliable"

# 获取任意 2 个结果，忽略失败
parallel ("any", count: 2, on-fail: "ignore"):
  session "Approach 1"
  session "Approach 2"
  session "Approach 3"
  session "Approach 4"
```

### 执行语义

OpenProse VM 遇到 `parallel:` 块时：

1. **分叉**：并发启动所有分支
2. **执行**：每个分支独立运行
3. **汇合**：按汇合策略等待：
   - `"all"`（默认）：等待所有分支
   - `"first"`：第一个完成时返回
   - `"any"`：第一个成功时返回（或 N 个成功时带 `count`）
4. **处理失败**：按 on-fail 策略：
   - `"fail-fast"`（默认）：取消剩余并立即失败
   - `"continue"`：等待所有，然后报告失败
   - `"ignore"`：将失败视为成功
5. **继续**：用可用结果继续执行下一条语句

### 验证规则

| 检查                    | 严重性 | 消息                                         |
| ----------------------- | ------ | -------------------------------------------- |
| 无效汇合策略            | 错误   | Must be "all", "first", or "any"             |
| 无效 on-fail 策略       | 错误   | Must be "fail-fast", "continue", or "ignore" |
| 没有 "any" 却使用 count | 错误   | Count is only valid with "any" strategy      |
| count 小于 1            | 错误   | Count must be at least 1                     |
| count 超过分支数        | 警告   | Count exceeds number of parallel branches    |
| 并行中重复变量          | 错误   | Variable already defined                     |
| 变量与 agent 冲突       | 错误   | Variable name conflicts with agent name      |
| 对象上下文中未定义变量  | 错误   | Undefined variable in context                |

---

## 固定循环

固定循环提供对固定次数或集合的有限迭代。

### repeat 块

`repeat` 块将其主体执行固定次数。

#### 基本语法

```prose
repeat 3:
  session "Generate a creative idea"
```

#### 带索引变量

使用 `as` 访问当前迭代索引：

```prose
repeat 5 as i:
  session "Process item"
    context: i
```

索引变量 `i` 作用域限定在循环主体内，从 0 开始。

### for-each 块

`for` 块遍历集合。

#### 基本语法

```prose
let fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
  session "Describe this fruit"
    context: fruit
```

#### 带内联数组

```prose
for topic in ["AI", "climate", "space"]:
  session "Research this topic"
    context: topic
```

#### 带索引变量

同时访问元素及其索引：

```prose
let items = ["a", "b", "c"]
for item, i in items:
  session "Process item with index"
    context: [item, i]
```

### 并行 for-each

`parallel for` 块并发运行所有迭代（扇出模式）：

```prose
let topics = ["AI", "climate", "space"]
parallel for topic in topics:
  session "Research this topic"
    context: topic

session "Combine all research"
```

等价于：

```prose
parallel:
  session "Research AI" context: "AI"
  session "Research climate" context: "climate"
  session "Research space" context: "space"
```

但更简洁且动态。

### 变量作用域

循环变量作用域限定在循环主体内：

- 在每次迭代中隐式为 `const`
- 遮蔽同名外部变量（带警告）
- 循环外不可访问

```prose
let item = session "outer"
for item in ["a", "b"]:
  # 这里的 'item' 是循环变量
  session "process loop item"
    context: item
# 这里的 'item' 再次引用外部变量
session "use outer item"
  context: item
```

### 嵌套

循环可以嵌套：

```prose
repeat 2:
  repeat 3:
    session "Inner task"
```

不同类型的循环可以组合：

```prose
let items = ["a", "b"]
repeat 2:
  for item in items:
    session "Process item"
      context: item
```

### 完整示例

```prose
# 生成多个创意变体
repeat 3:
  session "Generate a creative startup idea"

session "Select the best idea from the options above"

# 从多个角度研究选定的创意
let angles = ["market", "technology", "competition"]
parallel for angle in angles:
  session "Research this angle of the startup idea"
    context: angle

session "Synthesize all research into a business plan"
```

### 验证规则

| 检查                  | 严重性 | 消息                                 |
| --------------------- | ------ | ------------------------------------ |
| repeat 计数必须为正数 | 错误   | Repeat count must be positive        |
| repeat 计数必须为整数 | 错误   | Repeat count must be an integer      |
| 未定义的集合变量      | 错误   | Undefined collection variable        |
| 循环变量遮蔽外部变量  | 警告   | Loop variable shadows outer variable |

---

## 无限循环

无限循环提供带 AI 评估终止条件的迭代。与固定循环不同，迭代次数事先不知道——OpenProse VM 在运行时使用智能判断来决定何时停止。

### 自由判断标记

无限循环使用**自由判断标记**（`**...**`）来包装 AI 评估的条件。这些标记表示封闭的文本应在运行时由 OpenProse VM 智能解释，而非作为字面布尔表达式。

```prose
# **...** 内的文本由 AI 评估
loop until **the poem has vivid imagery and flows smoothly**:
  session "Review and improve the poem"
```

对于多行条件，使用三重星号：

```prose
loop until ***
  the document is complete
  all sections have been reviewed
  and formatting is consistent
***:
  session "Continue working on the document"
```

### 基本循环

最简单的无限循环无限运行直到明确限制：

```prose
loop:
  session "Process next item"
```

**警告**：没有终止条件或最大迭代次数的循环会产生警告。始终包含安全限制：

```prose
loop (max: 50):
  session "Process next item"
```

### loop until

`loop until` 变体运行直到条件变为真：

```prose
loop until **the task is complete**:
  session "Continue working on the task"
```

OpenProse VM 在每次迭代后评估自由判断条件，当判断条件满足时退出。

### loop while

`loop while` 变体在条件保持为真时运行：

```prose
loop while **there are still items to process**:
  session "Process the next item"
```

语义上，`loop while **X**` 等价于 `loop until **not X**`。

### 迭代变量

使用 `as` 跟踪当前迭代次数：

```prose
loop until **done** as attempt:
  session "Try approach"
    context: attempt
```

迭代变量：

- 从 0 开始
- 每次迭代递增 1
- 作用域限定在循环主体内
- 在每次迭代中隐式为 `const`

### 安全限制

使用 `(max: N)` 指定最大迭代次数：

```prose
# 即使条件未满足也在 10 次迭代后停止
loop until **all bugs fixed** (max: 10):
  session "Find and fix a bug"
```

循环在以下情况退出：

1. 条件满足（对于 `until`/`while` 变体），或
2. 达到最大迭代次数

### 完整语法

所有选项可以组合：

```prose
loop until **condition** (max: N) as i:
  body...
```

顺序很重要：条件在修饰符之前，修饰符在 `as` 之前。

### 示例

#### 迭代改进

```prose
session "Write an initial draft"

loop until **the draft is polished and ready for review** (max: 5):
  session "Review the current draft and identify issues"
  session "Revise the draft to address the issues"

session "Present the final draft"
```

#### 调试工作流

```prose
session "Run tests to identify failures"

loop until **all tests pass** (max: 20) as attempt:
  session "Identify the failing test"
  session "Fix the bug causing the failure"
  session "Run tests again"

session "Confirm all tests pass and summarize fixes"
```

#### 共识构建

```prose
parallel:
  opinion1 = session "Get first expert opinion"
  opinion2 = session "Get second expert opinion"

loop until **experts have reached consensus** (max: 5):
  session "Identify points of disagreement"
    context: { opinion1, opinion2 }
  session "Facilitate discussion to resolve differences"

session "Document the final consensus"
```

#### 质量阈值

```prose
let draft = session "Create initial document"

loop while **quality score is below threshold** (max: 10):
  draft = session "Review and improve the document"
    context: draft
  session "Calculate new quality score"

session "Finalize the document"
  context: draft
```

### 执行语义

OpenProse VM 遇到无限循环时：

1. **初始化**：将迭代计数器设置为 0
2. **检查条件**（对于 `until`/`while`）：
   - 对于 `until`：若条件满足则退出
   - 对于 `while`：若条件不满足则退出
3. **检查限制**：若迭代次数 >= 最大迭代次数则退出
4. **执行主体**：运行循环主体中的所有语句
5. **递增**：增加迭代计数器
6. **重复**：回到步骤 2

对于没有条件的基本 `loop:`：

- 只有最大迭代限制可以导致退出
- 没有最大值，循环无限运行（发出警告）

### 条件评估

OpenProse VM 使用其智能来评估自由判断条件：

1. **上下文意识**：条件在迄今为止会话中发生的事情的上下文中评估
2. **语义理解**：条件文本从语义上解释，而非字面意义
3. **不确定性处理**：不确定时，OpenProse VM 可能：
   - 若有进展则继续迭代
   - 若检测到收益递减则提前退出
   - 基于条件语义使用启发式方法

### 嵌套

无限循环可以与其他循环类型嵌套：

```prose
# 固定中的无限
repeat 3:
  loop until **sub-task complete** (max: 10):
    session "Work on sub-task"

# 无限中的固定
loop until **all batches processed** (max: 5):
  repeat 3:
    session "Process batch item"

# 多个无限
loop until **outer condition** (max: 5):
  loop until **inner condition** (max: 10):
    session "Deep iteration"
```

### 变量作用域

循环变量遵循与固定循环相同的作用域规则：

```prose
let i = session "outer"
loop until **done** as i:
  # 这里的 'i' 是循环变量（遮蔽外部）
  session "use loop i"
    context: i
# 这里的 'i' 再次引用外部变量
session "use outer i"
  context: i
```

### 验证规则

| 检查                   | 严重性 | 消息                                  |
| ---------------------- | ------ | ------------------------------------- |
| 没有最大值或条件的循环 | 警告   | Unbounded loop without max iterations |
| 最大迭代次数 <= 0      | 错误   | Max iterations must be positive       |
| 最大迭代次数不是整数   | 错误   | Max iterations must be an integer     |
| 空自由判断条件         | 错误   | Discretion condition cannot be empty  |
| 条件很短               | 警告   | Discretion condition may be ambiguous |
| 循环变量遮蔽外部变量   | 警告   | Loop variable shadows outer variable  |

---

## 管道操作

管道操作提供函数式风格的集合变换。它们允许你使用管道操作符（`|`）链接 map、filter 和 reduce 等操作。

### 管道操作符

管道操作符（`|`）将集合传递给变换操作：

```prose
let items = ["a", "b", "c"]
let results = items | map:
  session "Process this item"
    context: item
```

### map

`map` 操作变换集合中的每个元素：

```prose
let articles = ["article1", "article2", "article3"]

let summaries = articles | map:
  session "Summarize this article in one sentence"
    context: item
```

在 map 主体内，隐式变量 `item` 引用当前正在处理的元素。

### filter

`filter` 操作保留匹配条件的元素：

```prose
let items = ["one", "two", "three", "four", "five"]

let short = items | filter:
  session "Does this word have 4 or fewer letters? Answer yes or no."
    context: item
```

filter 主体中的会话应返回 OpenProse VM 可解释为真/假的内容（如"yes"/"no"）。

### reduce

`reduce` 操作将元素累积为单个结果：

```prose
let ideas = ["AI assistant", "smart home", "health tracker"]

let combined = ideas | reduce(summary, idea):
  session "Add this idea to the summary, creating a cohesive concept"
    context: [summary, idea]
```

reduce 操作需要显式变量名：

- 第一个变量（`summary`）：累积器
- 第二个变量（`idea`）：当前元素

集合中的第一个元素成为初始累积器值。

### 并行 map（pmap）

`pmap` 操作类似 `map` 但并发运行所有变换：

```prose
let tasks = ["task1", "task2", "task3"]

let results = tasks | pmap:
  session "Process this task in parallel"
    context: item

session "Aggregate all results"
  context: results
```

这类似于 `parallel for`，但使用管道语法。

### 链接

管道操作可以链接以组合复杂变换：

```prose
let topics = ["quantum computing", "blockchain", "machine learning", "IoT"]

let result = topics
  | filter:
      session "Is this topic trending? Answer yes or no."
        context: item
  | map:
      session "Write a one-line startup pitch for this topic"
        context: item

session "Present the startup pitches"
  context: result
```

操作从左到右执行：先 filter，然后 map。

### 完整示例

```prose
# 定义集合
let articles = ["AI breakthroughs", "Climate solutions", "Space exploration"]

# 用链接操作处理
let summaries = articles
  | filter:
      session "Is this topic relevant to technology? Answer yes or no."
        context: item
  | map:
      session "Write a compelling one-paragraph summary"
        context: item
  | reduce(combined, summary):
      session "Merge this summary into the combined document"
        context: [combined, summary]

# 呈现最终结果
session "Format and present the combined summaries"
  context: summaries
```

### 隐式变量

| 操作     | 可用变量                             |
| -------- | ------------------------------------ |
| `map`    | `item` — 当前元素                    |
| `filter` | `item` — 当前元素                    |
| `pmap`   | `item` — 当前元素                    |
| `reduce` | 显式命名：`reduce(accVar, itemVar):` |

### 执行语义

OpenProse VM 遇到管道时：

1. **输入**：从输入集合开始
2. **对每个操作**：
   - **map**：变换每个元素，产生新集合
   - **filter**：保留会话返回真值的元素
   - **reduce**：将元素累积为单个值
   - **pmap**：并发变换所有元素
3. **输出**：返回最终变换后的集合/值

### 变量作用域

管道变量作用域限定在其操作主体内：

```prose
let item = "outer"
let items = ["a", "b"]

let results = items | map:
  # 这里的 'item' 是管道变量（遮蔽外部）
  session "process"
    context: item

# 这里的 'item' 再次引用外部变量
session "use outer"
  context: item
```

### 验证规则

| 检查                 | 严重性 | 消息                                               |
| -------------------- | ------ | -------------------------------------------------- |
| 未定义的输入集合     | 错误   | Undefined collection variable                      |
| 无效管道操作符       | 错误   | Expected pipe operator (map, filter, reduce, pmap) |
| reduce 没有变量      | 错误   | Expected accumulator and item variables            |
| 管道变量遮蔽外部变量 | 警告   | Implicit/explicit variable shadows outer variable  |

---

## 错误处理

OpenProse 提供结构化错误处理，包含 try/catch/finally 块、throw 语句和重试机制，用于弹性工作流。

### try/catch 块

`try:` 块包装可能失败的操作。`catch:` 块处理错误。

```prose
try:
  session "Attempt risky operation"
catch:
  session "Handle the error gracefully"
```

#### 错误变量访问

使用 `catch as err:` 为错误处理器捕获错误上下文：

```prose
try:
  session "Call external API"
catch as err:
  session "Log and handle the error"
    context: err
```

错误变量（`err`）包含出错信息的上下文，只在 catch 块内可访问。

### try/catch/finally

`finally:` 块无论 try 块成功还是失败都始终执行：

```prose
try:
  session "Acquire and use resource"
catch:
  session "Handle any errors"
finally:
  session "Always clean up resource"
```

#### 执行顺序

1. **try 成功**：try 主体 → finally 主体
2. **try 失败**：try 主体（直到失败）→ catch 主体 → finally 主体

### try/finally（无 catch）

清理但不处理错误时，使用 try/finally：

```prose
try:
  session "Open connection and do work"
finally:
  session "Close connection"
```

### throw 语句

`throw` 语句抛出或重新抛出错误。

#### 重新抛出

在 catch 块内，不带参数的 `throw` 将捕获的错误重新抛出给外层处理器：

```prose
try:
  try:
    session "Inner operation"
  catch:
    session "Partial handling"
    throw  # 重新抛出给外层处理器
catch:
  session "Handle re-raised error"
```

#### 带消息的 throw

抛出带自定义消息的新错误：

```prose
session "Check preconditions"
throw "Precondition not met"
```

### 嵌套错误处理

try 块可以嵌套。内层 catch 块不会触发外层处理器，除非它们重新抛出：

```prose
try:
  session "Outer operation"
  try:
    session "Inner risky operation"
  catch:
    session "Handle inner error"  # 外层 catch 不会运行
  session "Continue outer operation"
catch:
  session "Handle outer error only"
```

### 并行中的错误处理

每个并行分支可以有自己的错误处理：

```prose
parallel:
  try:
    session "Branch A might fail"
  catch:
    session "Recover branch A"
  try:
    session "Branch B might fail"
  catch:
    session "Recover branch B"

session "Continue with recovered results"
```

这与 `on-fail:` 策略不同，后者控制未处理错误发生时的行为。

### retry 属性

`retry:` 属性使会话在失败时自动重试：

```prose
session "Call flaky API"
  retry: 3
```

#### 带退避的重试

添加 `backoff:` 控制重试之间的延迟：

```prose
session "Rate-limited API"
  retry: 5
  backoff: exponential
```

**退避策略：**

| 策略          | 行为                         |
| ------------- | ---------------------------- |
| `none`        | 立即重试（默认）             |
| `linear`      | 重试之间固定延迟             |
| `exponential` | 延迟加倍（1s、2s、4s、8s……） |

#### 带上下文的重试

重试与其他会话属性一起工作：

```prose
let data = session "Get input"
session "Process data"
  context: data
  retry: 3
  backoff: linear
```

### 组合模式

重试和 try/catch 一起工作以实现最大弹性：

```prose
try:
  session "Call external service"
    retry: 3
    backoff: exponential
catch:
  session "All retries failed, use fallback"
```

### 验证规则

| 检查                      | 严重性 | 消息                                                |
| ------------------------- | ------ | --------------------------------------------------- |
| try 没有 catch 或 finally | 错误   | Try block must have at least "catch:" or "finally:" |
| 错误变量遮蔽外部变量      | 警告   | Error variable shadows outer variable               |
| 空 throw 消息             | 警告   | Throw message is empty                              |
| 非正数重试次数            | 错误   | Retry count must be positive                        |
| 非整数重试次数            | 错误   | Retry count must be an integer                      |
| 高重试次数（>10）         | 警告   | Retry count is unusually high                       |
| 无效退避策略              | 错误   | Must be none, linear, or exponential                |
| 在 agent 定义上使用 retry | 警告   | Retry property is only valid in session statements  |

### 语法参考

```
try_block ::= "try" ":" NEWLINE INDENT statement+ DEDENT
              [catch_block]
              [finally_block]

catch_block ::= "catch" ["as" identifier] ":" NEWLINE INDENT statement+ DEDENT

finally_block ::= "finally" ":" NEWLINE INDENT statement+ DEDENT

throw_statement ::= "throw" [string_literal]

retry_property ::= "retry" ":" number_literal

backoff_property ::= "backoff" ":" ( "none" | "linear" | "exponential" )
```

---

## choice 块

choice 块允许 OpenProse VM 根据标准从多个带标签的选项中选择。这对于最佳路径取决于运行时分析的分支工作流很有用。

### 语法

```prose
choice **criteria**:
  option "Label A":
    statements...
  option "Label B":
    statements...
```

### 标准

标准用自由判断标记（`**...**`）包装，由 OpenProse VM 评估以选择执行哪个选项：

```prose
choice **the best approach for the current situation**:
  option "Quick fix":
    session "Apply a quick temporary fix"
  option "Full refactor":
    session "Perform a complete code refactor"
```

### 多行标准

对于复杂标准，使用三重星号：

```prose
choice ***
  which strategy is most appropriate
  given the current project constraints
  and timeline requirements
***:
  option "MVP approach":
    session "Build minimum viable product"
  option "Full feature set":
    session "Build complete feature set"
```

### 示例

#### 简单 choice

```prose
let analysis = session "Analyze the code quality"

choice **the severity of issues found in the analysis**:
  option "Critical":
    session "Stop deployment and fix critical issues"
      context: analysis
  option "Minor":
    session "Log issues for later and proceed"
      context: analysis
  option "None":
    session "Proceed with deployment"
```

#### 每个选项有多条语句的 choice

```prose
choice **the user's experience level**:
  option "Beginner":
    session "Explain basic concepts first"
    session "Provide step-by-step guidance"
    session "Include helpful tips and warnings"
  option "Expert":
    session "Provide concise technical summary"
    session "Include advanced configuration options"
```

#### 嵌套 choice

```prose
choice **the type of request**:
  option "Bug report":
    choice **the bug severity**:
      option "Critical":
        session "Escalate immediately"
      option "Normal":
        session "Add to sprint backlog"
  option "Feature request":
    session "Add to feature backlog"
```

### 执行语义

OpenProse VM 遇到 `choice` 块时：

1. **评估标准**：在当前上下文中解释自由判断标准
2. **选择选项**：选择最合适的带标签选项
3. **执行**：运行所选选项主体中的所有语句
4. **继续**：继续执行 choice 块之后的下一条语句

每个 choice 块只执行一个选项。

### 验证规则

| 检查            | 严重性 | 消息                                       |
| --------------- | ------ | ------------------------------------------ |
| choice 没有选项 | 错误   | Choice block must have at least one option |
| 空标准          | 错误   | Choice criteria cannot be empty            |
| 重复选项标签    | 警告   | Duplicate option label                     |
| 空选项主体      | 警告   | Option has empty body                      |

### 语法参考

```
choice_block ::= "choice" discretion ":" NEWLINE INDENT option+ DEDENT

option ::= "option" string ":" NEWLINE INDENT statement+ DEDENT

discretion ::= "**" text "**" | "***" text "***"
```

---

## 条件语句

if/elif/else 语句提供基于 AI 评估条件（使用自由判断标记）的条件分支。

### if 语句

```prose
if **condition**:
  statements...
```

### if/else

```prose
if **condition**:
  statements...
else:
  statements...
```

### if/elif/else

```prose
if **first condition**:
  statements...
elif **second condition**:
  statements...
elif **third condition**:
  statements...
else:
  statements...
```

### 自由判断条件

条件用自由判断标记（`**...**`）包装用于 AI 评估：

```prose
let analysis = session "Analyze the codebase"

if **the code has security vulnerabilities**:
  session "Fix security issues immediately"
    context: analysis
elif **the code has performance issues**:
  session "Optimize performance bottlenecks"
    context: analysis
else:
  session "Proceed with normal review"
    context: analysis
```

### 多行条件

使用三重星号表示复杂条件：

```prose
if ***
  the test suite passes
  and the code coverage is above 80%
  and there are no linting errors
***:
  session "Deploy to production"
else:
  session "Fix issues before deploying"
```

### 示例

#### 简单 if

```prose
session "Check system health"

if **the system is healthy**:
  session "Continue with normal operations"
```

#### if/else

```prose
let review = session "Review the pull request"

if **the code changes are safe and well-tested**:
  session "Approve and merge the PR"
    context: review
else:
  session "Request changes"
    context: review
```

#### 多个 elif

```prose
let status = session "Check project status"

if **the project is on track**:
  session "Continue as planned"
elif **the project is slightly delayed**:
  session "Adjust timeline and communicate"
elif **the project is significantly delayed**:
  session "Escalate to management"
  session "Create recovery plan"
else:
  session "Assess project viability"
```

#### 嵌套条件

```prose
if **the request is authenticated**:
  if **the user has admin privileges**:
    session "Process admin request"
  else:
    session "Process standard user request"
else:
  session "Return authentication error"
```

### 与其他构造组合

#### 与 try/catch

```prose
try:
  session "Attempt operation"
  if **operation succeeded partially**:
    session "Complete remaining steps"
catch as err:
  if **error is recoverable**:
    session "Apply recovery procedure"
      context: err
  else:
    throw "Unrecoverable error"
```

#### 与循环

```prose
loop until **task complete** (max: 10):
  session "Work on task"
  if **encountered blocker**:
    session "Resolve blocker"
```

### 执行语义

OpenProse VM 遇到 `if` 语句时：

1. **评估条件**：解释第一个自由判断条件
2. **若为真**：执行 then 主体并跳过其余子句
3. **若为假**：按顺序检查每个 `elif` 条件
4. **elif 匹配**：执行该 elif 的主体并跳过其余
5. **无匹配**：执行 `else` 主体（若存在）
6. **继续**：继续执行下一条语句

### 验证规则

| 检查         | 严重性 | 消息                              |
| ------------ | ------ | --------------------------------- |
| 空条件       | 错误   | If/elif condition cannot be empty |
| elif 没有 if | 错误   | Elif must follow if               |
| else 没有 if | 错误   | Else must follow if or elif       |
| 多个 else    | 错误   | Only one else clause allowed      |
| 空主体       | 警告   | Condition has empty body          |

### 语法参考

```
if_statement ::= "if" discretion ":" NEWLINE INDENT statement+ DEDENT
                 elif_clause*
                 [else_clause]

elif_clause ::= "elif" discretion ":" NEWLINE INDENT statement+ DEDENT

else_clause ::= "else" ":" NEWLINE INDENT statement+ DEDENT

discretion ::= "**" text "**" | "***" text "***"
```

---

## 执行模型

OpenProse 使用两阶段执行模型。

### 阶段 1：编译（静态）

编译阶段处理确定性预处理：

1. **解析**：将源代码转换为 AST
2. **验证**：检查语法和语义错误
3. **展开**：规范化语法糖（在实现时）
4. **输出**：生成规范程序

### 阶段 2：运行时（智能）

OpenProse VM 执行已编译的程序：

1. **加载**：接收已编译的程序
2. **收集 agent**：注册所有 agent 定义
3. **执行**：按顺序处理每条语句
4. **派生**：使用解析后的配置创建子 agent
5. **协调**：管理会话之间的上下文传递

### OpenProse VM 行为

| 方面       | 行为                     |
| ---------- | ------------------------ |
| 执行顺序   | 严格——严格遵循程序       |
| 会话创建   | 严格——创建程序指定的内容 |
| Agent 解析 | 严格——确定性地合并属性   |
| 上下文传递 | 智能——按需摘要/变换      |
| 完成检测   | 智能——判断会话何时"完成" |

### 状态管理

对于当前实现，状态在上下文中跟踪（对话历史）：

| 状态类型     | 跟踪方式                           |
| ------------ | ---------------------------------- |
| Agent 定义   | 在程序开始时收集                   |
| 执行流程     | 隐式推理（"完成了 X，现在执行 Y"） |
| 会话输出     | 保存在对话历史中                   |
| 程序中的位置 | 由 OpenProse VM 跟踪               |

---

## 验证规则

验证器在执行前检查程序是否有错误和警告。

### 错误（阻止执行）

| 代码 | 描述                       |
| ---- | -------------------------- |
| E001 | 未终止的字符串字面量       |
| E002 | 字符串中的未知转义序列     |
| E003 | session 缺少提示或 agent   |
| E004 | 意外的 token               |
| E005 | 无效语法                   |
| E006 | 重复的 agent 定义          |
| E007 | 未定义的 agent 引用        |
| E008 | 无效的模型值               |
| E009 | 重复属性                   |
| E010 | 重复的 use 语句            |
| E011 | 空 use 路径                |
| E012 | 无效的 use 路径格式        |
| E013 | skills 必须是数组          |
| E014 | 技能名称必须是字符串       |
| E015 | permissions 必须是块       |
| E016 | 权限模式必须是字符串       |
| E017 | `resume:` 需要持久化 agent |
| E018 | `resume:` 但无现有记忆     |
| E019 | 重复变量名（平坦命名空间） |
| E020 | 空输入名称                 |
| E021 | 重复的 input 声明          |
| E022 | 可执行语句之后的 input     |
| E023 | 空输出名称                 |
| E024 | 重复的 output 声明         |
| E025 | 调用中的未知程序           |
| E026 | 缺少必需输入               |
| E027 | 调用中的未知输入名称       |
| E028 | 未知输出属性访问           |

### 警告（非阻塞）

| 代码 | 描述                                    |
| ---- | --------------------------------------- |
| W001 | 空会话提示                              |
| W002 | 仅空白的会话提示                        |
| W003 | 会话提示超过 10,000 字符                |
| W004 | 空 prompt 属性                          |
| W005 | 未知属性名称                            |
| W006 | 未知导入源格式                          |
| W007 | 技能未导入                              |
| W008 | 未知权限类型                            |
| W009 | 未知权限值                              |
| W010 | 空技能数组                              |
| W011 | `session:` 用于有现有记忆的持久化 agent |

### 错误消息格式

错误包含位置信息：

```
Error at line 5, column 12: Unterminated string literal
  session "Hello
          ^
```

---

## 示例

### 最简程序

```prose
session "Hello world"
```

### 带 agent 的研究流水线

```prose
# 定义专业 agent
agent researcher:
  model: sonnet
  prompt: "You are a research assistant"

agent writer:
  model: opus
  prompt: "You are a technical writer"

# 执行工作流
session: researcher
  prompt: "Research recent developments in quantum computing"

session: writer
  prompt: "Write a summary of the research findings"
```

### 代码审查工作流

```prose
agent reviewer:
  model: sonnet
  prompt: "You are an expert code reviewer"

session: reviewer
  prompt: "Read the code in src/ and identify potential bugs"

session: reviewer
  prompt: "Suggest fixes for each bug found"

session: reviewer
  prompt: "Create a summary of all changes needed"
```

### 带模型覆盖的多步骤任务

```prose
agent analyst:
  model: haiku
  prompt: "You analyze data quickly"

# 快速初始分析
session: analyst
  prompt: "Scan the data for obvious patterns"

# 使用更强大模型的详细分析
session: analyst
  model: opus
  prompt: "Perform deep analysis on the patterns found"
```

### 带文档的注释

```prose
# Project: Quarterly Report Generator
# Author: Team Lead
# Date: 2024-01-01

agent data-collector:
  model: sonnet
  prompt: "You gather and organize data"

agent analyst:
  model: opus
  prompt: "You analyze data and create insights"

# 步骤 1：收集数据
session: data-collector
  prompt: "Collect all sales data from the past quarter"

# 步骤 2：分析
session: analyst
  prompt: "Perform trend analysis on the collected data"

# 步骤 3：报告生成
session: analyst
  prompt: "Generate a formatted quarterly report with charts"
```

### 带技能和权限的工作流

```prose
# 导入外部程序
use "@anthropic/web-search"
use "@anthropic/file-writer" as file-writer

# 定义安全研究 agent
agent researcher:
  model: sonnet
  prompt: "You are a research assistant"
  skills: ["web-search"]
  permissions:
    read: ["*.md", "*.txt"]
    bash: deny

# 定义写作 agent
agent writer:
  model: opus
  prompt: "You create documentation"
  skills: ["file-writer"]
  permissions:
    write: ["docs/"]
    bash: deny

# 执行工作流
session: researcher
  prompt: "Research AI safety topics"

session: writer
  prompt: "Write a summary document"
```

---

## 未来特性

所有核心特性（直到第 12 层）已全部实现。潜在的未来增强：

### 第 13 层：扩展特性

- 带返回值的自定义函数
- 代码组织的模块系统
- 验证的类型注释
- 高级并发的 async/await 模式

### 第 14 层：工具

- 语言服务器协议（LSP）支持
- VS Code 扩展
- 交互式调试器
- 性能分析

---

## 语法（已实现）

```
program     → statement* EOF
statement   → useStatement | inputDecl | agentDef | session | resumeStmt
            | letBinding | constBinding | assignment | outputBinding
            | parallelBlock | repeatBlock | forEachBlock | loopBlock
            | tryBlock | choiceBlock | ifStatement | doBlock | blockDef
            | throwStatement | comment

# 程序组合
useStatement → "use" string ( "as" IDENTIFIER )?
inputDecl   → "input" IDENTIFIER ":" string
outputBinding → "output" IDENTIFIER "=" expression
programCall → IDENTIFIER "(" ( IDENTIFIER ":" expression )* ")"

# 定义
agentDef    → "agent" IDENTIFIER ":" NEWLINE INDENT agentProperty* DEDENT
agentProperty → "model:" ( "sonnet" | "opus" | "haiku" )
              | "prompt:" string
              | "persist:" ( "true" | "project" | string )
              | "context:" ( IDENTIFIER | array | objectContext )
              | "retry:" NUMBER
              | "backoff:" ( "none" | "linear" | "exponential" )
              | "skills:" "[" string* "]"
              | "permissions:" NEWLINE INDENT permission* DEDENT
blockDef    → "block" IDENTIFIER params? ":" NEWLINE INDENT statement* DEDENT
params      → "(" IDENTIFIER ( "," IDENTIFIER )* ")"

# 控制流
parallelBlock → "parallel" parallelMods? ":" NEWLINE INDENT parallelBranch* DEDENT
parallelMods  → "(" ( joinStrategy | onFail | countMod ) ( "," ( joinStrategy | onFail | countMod ) )* ")"
joinStrategy  → string                              # "all" | "first" | "any"
onFail        → "on-fail" ":" string                # "fail-fast" | "continue" | "ignore"
countMod      → "count" ":" NUMBER                  # 仅对 "any" 有效
parallelBranch → ( IDENTIFIER "=" )? statement

# 循环
repeatBlock → "repeat" NUMBER ( "as" IDENTIFIER )? ":" NEWLINE INDENT statement* DEDENT
forEachBlock → "parallel"? "for" IDENTIFIER ( "," IDENTIFIER )? "in" collection ":" NEWLINE INDENT statement* DEDENT
loopBlock   → "loop" ( ( "until" | "while" ) discretion )? loopMods? ( "as" IDENTIFIER )? ":" NEWLINE INDENT statement* DEDENT
loopMods    → "(" "max" ":" NUMBER ")"

# 错误处理
tryBlock    → "try" ":" NEWLINE INDENT statement+ DEDENT catchBlock? finallyBlock?
catchBlock  → "catch" ( "as" IDENTIFIER )? ":" NEWLINE INDENT statement+ DEDENT
finallyBlock → "finally" ":" NEWLINE INDENT statement+ DEDENT
throwStatement → "throw" string?

# 条件
choiceBlock → "choice" discretion ":" NEWLINE INDENT choiceOption+ DEDENT
choiceOption → "option" string ":" NEWLINE INDENT statement+ DEDENT
ifStatement → "if" discretion ":" NEWLINE INDENT statement+ DEDENT elifClause* elseClause?
elifClause  → "elif" discretion ":" NEWLINE INDENT statement+ DEDENT
elseClause  → "else" ":" NEWLINE INDENT statement+ DEDENT

# 组合
doBlock     → "do" ( ":" NEWLINE INDENT statement* DEDENT | IDENTIFIER args? )
args        → "(" expression ( "," expression )* ")"
arrowExpr   → session ( "->" session )+

# 会话
session     → "session" ( string | ":" IDENTIFIER | IDENTIFIER ":" IDENTIFIER )
              ( NEWLINE INDENT sessionProperty* DEDENT )?
resumeStmt  → "resume" ":" IDENTIFIER ( NEWLINE INDENT sessionProperty* DEDENT )?
sessionProperty → "model:" ( "sonnet" | "opus" | "haiku" )
                | "prompt:" string
                | "context:" ( IDENTIFIER | array | objectContext )
                | "retry:" NUMBER
                | "backoff:" ( "none" | "linear" | "exponential" )

# 绑定
letBinding  → "let" IDENTIFIER "=" expression
constBinding → "const" IDENTIFIER "=" expression
assignment  → IDENTIFIER "=" expression

# 表达式
expression  → session | doBlock | parallelBlock | repeatBlock | forEachBlock
            | loopBlock | arrowExpr | pipeExpr | programCall | string | IDENTIFIER | array | objectContext

# 管道
pipeExpr    → ( IDENTIFIER | array ) ( "|" pipeOp )+
pipeOp      → ( "map" | "filter" | "pmap" ) ":" NEWLINE INDENT statement* DEDENT
            | "reduce" "(" IDENTIFIER "," IDENTIFIER ")" ":" NEWLINE INDENT statement* DEDENT

# 属性
property    → ( "model" | "prompt" | "context" | "retry" | "backoff" | IDENTIFIER )
            ":" ( IDENTIFIER | string | array | objectContext | NUMBER )

# 原语
discretion  → "**" text "**" | "***" text "***"
collection  → IDENTIFIER | array
array       → "[" ( expression ( "," expression )* )? "]"
objectContext → "{" ( IDENTIFIER ( "," IDENTIFIER )* )? "}"
comment     → "#" text NEWLINE

# 字符串
string      → singleString | tripleString | interpolatedString
singleString → '"' character* '"'
tripleString → '"""' ( character | NEWLINE )* '"""'
interpolatedString → string containing "{" IDENTIFIER "}"
character   → escape | non-quote
escape      → "\\" | "\"" | "\n" | "\t"
```

---

## 编译器 API

当用户调用 `/prose-compile` 或请求编译 `.prose` 文件时：

1. **完整阅读此文档**（`compiler.md`）以了解所有语法和验证规则
2. 根据语法**解析**程序
3. **验证**语法正确性、语义有效性和自解释性
4. **转换**为规范形式（展开语法糖，规范化结构）
5. **输出**编译后的程序或报告带行号的错误/警告

对于无需编译的直接解释，读取 `prose.md` 并按 Session Statement 章节描述执行语句。
