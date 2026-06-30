# OpenProse 帮助

当用户调用 `prose help` 或询问 OpenProse 时加载此文件。

---

## 欢迎

OpenProse 是一种用于 AI 会话的编程语言。你编写结构化程序来编排 AI 代理，VM（本 session）通过生成真实的子代理来执行它们。

**长时间运行的 AI session 是图灵完备的计算机。OpenProse 是它的编程语言。**

---

## 你想自动化什么？

当用户调用 `prose help` 时，引导他们明确想要构建什么。使用 AskUserQuestion 工具：

```
Question: "What would you like to automate with OpenProse?"
Header: "Goal"
Options:
  1. "Run a workflow" - "I have a .prose file to execute"
  2. "Build something new" - "Help me create a program for a specific task"
  3. "Learn the syntax" - "Show me examples and explain how it works"
  4. "Explore possibilities" - "What can OpenProse do?"
```

**用户响应后：**

- **运行工作流**：询问文件路径，然后加载 `prose.md` 并执行
- **构建新东西**：让他们描述任务，然后帮助编写 .prose 程序（加载 `guidance/patterns.md`）
- **学习语法**：从 `examples/` 展示示例，解释 VM 模型
- **探索可能性**：逐步介绍主要示例，如 `37-the-forge.prose` 或 `28-gas-town.prose`

---

## 可用命令

| 命令                   | 作用                       |
| ---------------------- | -------------------------- |
| `prose help`           | 此帮助——引导你找到所需内容 |
| `prose run <file>`     | 执行 .prose 程序           |
| `prose compile <file>` | 验证语法而不运行           |
| `prose update`         | 迁移旧版工作区文件         |
| `prose examples`       | 浏览并运行示例程序         |

---

## 快速开始

**运行示例：**

```
prose run examples/01-hello-world.prose
```

**创建你的第一个程序：**

```
prose help
→ Select "Build something new"
→ Describe what you want to automate
```

---

## 常见问题

### 支持哪些 AI 助手？

Claude Code、OpenCode 和 Amp。任何运行足够智能模型并支持子代理等原语的框架都被认为是"Prose Complete"。

### 这为何是 VM？

LLM 是模拟器——当给定详细的系统描述时，它们不仅仅是描述它，而是模拟它。`prose.md` 规范用足够高的保真度描述了一个 VM，以至于读取它会诱导模拟。但具有足够保真度的模拟就是实现：每个 session 生成一个真实的子代理，输出是真实的工件，状态持久化在对话历史或文件中。模拟就是执行。

### 什么是"智能 IoC"？

传统 IoC 容器（Spring、Guice）从配置文件中连接依赖关系。OpenProse 的容器是一个 AI session，它使用理解来连接代理。它不仅仅是匹配名称——它理解上下文、意图，并能做出关于执行的智能决策。

### 这看起来像 Python。

语法是有意熟悉的——Python 基于缩进的结构可读且不言而喻。但语义完全不同。OpenProse 没有函数、没有类、没有通用计算。它有代理、session 和控制流。设计原则：结构化但不言而喻，以最少的文档实现明确的解释。

### 为什么不用英语？

英语已经是一种代理框架——我们不是在替换它，而是在结构化它。普通英语不能区分顺序和并行，不指定重试次数，不限定变量作用域。OpenProse 在模糊性是特性时精确使用英语（在 `**...**` 内），在其他地方使用结构。第四堵墙语法让你在需要时精确地依赖 AI 判断。

### 为什么不用 YAML？

我们从 YAML 开始。问题是：循环、条件语句和变量声明在 YAML 中不言而喻——当你试图让它们不言而喻时，它变得冗长和丑陋。更根本的是，YAML 为机器可解析性优化。OpenProse 为智能机器可读性优化。它不需要被解析——它需要被理解。这是完全不同的设计目标。

### 为什么不用 LangChain/CrewAI/AutoGen？

这些是编排库——它们从外部协调代理。OpenProse 在代理 session 内部运行——session 本身就是 IoC 容器。这意味着零外部依赖，以及跨任何 AI 助手的可移植性。从 Claude Code 切换到 Codex？你的 .prose 文件仍然有效。

---

## 语法一览

```prose
session "prompt"              # Spawn subagent
agent name:                   # Define agent template
let x = session "..."         # Capture result
parallel:                     # Concurrent execution
repeat N:                     # Fixed loop
for x in items:               # Iteration
loop until **condition**:     # AI-evaluated loop
try: ... catch: ...           # Error handling
if **condition**: ...         # Conditional
choice **criteria**: option   # AI-selected branch
block name(params):           # Reusable block
do blockname(args)            # Invoke block
items | map: ...              # Pipeline
```

完整语法和验证规则请参见 `compiler.md`。

---

## 示例

`examples/` 目录包含 37 个示例程序：

| 范围  | 类别                                                      |
| ----- | --------------------------------------------------------- |
| 01-08 | 基础（hello world、研究、代码审查、调试）                 |
| 09-12 | 代理和技能                                                |
| 13-15 | 变量和组合                                                |
| 16-19 | 并行执行                                                  |
| 20-21 | 循环和流水线                                              |
| 22-23 | 错误处理                                                  |
| 24-27 | 高级（选择、条件语句、块、插值）                          |
| 28    | Gas Town（多代理编排）                                    |
| 29-31 | 船长椅模式（持久编排器）                                  |
| 33-36 | 生产工作流（PR 自动修复、内容流水线、功能工厂、Bug 猎手） |
| 37    | The Forge（从头构建浏览器）                               |

**推荐入门点：**

- `01-hello-world.prose` - 最简单的程序
- `16-parallel-reviews.prose` - 观察并行执行
- `37-the-forge.prose` - 观看 AI 构建 Web 浏览器
