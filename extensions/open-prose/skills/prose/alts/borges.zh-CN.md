---
role: experimental
summary: |
  OpenProse 的 Borges 语言方案——学术/形而上学备用关键词集。
  迷宫、梦想者、分岔路径和无限图书馆。用于与功能性方案进行基准测试。
status: draft
requires: prose.md
---

# OpenProse Borges 语言方案

> **这是一个皮肤层。** 需要先加载 `prose.md`。所有执行语义、状态管理和 VM 行为均在那里定义。此文件仅提供关键词翻译。

OpenProse 的一个备选语言方案，从豪尔赫·路易斯·博尔赫斯的作品汲取灵感。功能性方案追求实用与清晰；Borges 方案追求学术与形而上学——一切都感觉像是来自虚构百科全书的引用。

## 使用方法

1. 先加载 `prose.md`（执行语义）
2. 加载此文件（关键词翻译）
3. 解析 `.prose` 文件时，接受 Borges 关键词作为功能关键词的别名
4. 所有执行行为保持不变——仅表面语法改变

> **设计约束：** 仍以语言原则中"结构化但不言而喻"为目标——只是通过博尔赫斯视角实现自明性。

---

## 完整翻译对照表

### 核心构造

| 功能语言   | Borges    | 参考                               |
| ---------- | --------- | ---------------------------------- |
| `agent`    | `dreamer` | 《环形废墟》——梦想者将世界梦想成真 |
| `session`  | `dream`   | 每次执行都是梦想者中的梦           |
| `parallel` | `forking` | 《小径分岔的花园》——分支时间线     |
| `block`    | `chapter` | 书中之书，自我指涉的结构           |

### 组合与绑定

| 功能语言  | Borges     | 参考                                     |
| --------- | ---------- | ---------------------------------------- |
| `use`     | `retrieve` | 《巴别图书馆》——从无限书架中取回         |
| `input`   | `axiom`    | 给定前提（博尔赫斯的学术/数学语调）      |
| `output`  | `theorem`  | 从公理推导出的结论                       |
| `let`     | `inscribe` | 将某物写入存在                           |
| `const`   | `zahir`    | 《扎伊尔》——难以忘怀，不可改变，固定于心 |
| `context` | `memory`   | 《博闻强记的富内斯》——完美、全面的记忆   |

### 控制流

| 功能语言   | Borges              | 参考                   |
| ---------- | ------------------- | ---------------------- |
| `repeat N` | `N mirrors`         | 相对的无限镜像反射     |
| `for...in` | `for each...within` | 略带博尔赫斯风格的介词 |
| `loop`     | `labyrinth`         | 折叠回自身的迷宫       |
| `until`    | `until`             | 不变                   |
| `while`    | `while`             | 不变                   |
| `choice`   | `bifurcation`       | 路径的分叉             |
| `option`   | `branch`            | 分岔时间的一个分支     |
| `if`       | `should`            | 学术条件               |
| `elif`     | `or should`         | 续接条件               |
| `else`     | `otherwise`         | 自然替代               |

### 错误处理

| 功能语言  | Borges       | 参考                           |
| --------- | ------------ | ------------------------------ |
| `try`     | `venture`    | 进入迷宫                       |
| `catch`   | `lest`       | "以免失败……"（古风，学术语气） |
| `finally` | `ultimately` | 不可避免的结论                 |
| `throw`   | `shatter`    | 打破镜子，结束梦境             |
| `retry`   | `recur`      | 无限回归，再次尝试             |

### 会话属性

| 功能语言 | Borges   | 参考               |
| -------- | -------- | ------------------ |
| `prompt` | `query`  | 向图书馆提问       |
| `model`  | `author` | 哪位作者写出这个梦 |

### 不变的关键词

这些关键词已经可用，或功能性太强而不宜替换：

- `**...**` 自由裁量标记——已经在"打破第四堵墙"
- `until`、`while`——已经可用
- `map`、`filter`、`reduce`、`pmap`——管道运算符
- `max`——约束修饰符
- `as`——别名
- 模型名称：`sonnet`、`opus`、`haiku`——已具文学性

---

## 对比示例

### 简单程序

```prose
# Functional
use "@alice/research" as research
input topic: "What to investigate"

agent helper:
  model: sonnet

let findings = session: helper
  prompt: "Research {topic}"

output summary = session "Summarize"
  context: findings
```

```prose
# Borges
retrieve "@alice/research" as research
axiom topic: "What to investigate"

dreamer helper:
  author: sonnet

inscribe findings = dream: helper
  query: "Research {topic}"

theorem summary = dream "Summarize"
  memory: findings
```

### 并行执行

```prose
# Functional
parallel:
  security = session "Check security"
  perf = session "Check performance"
  style = session "Check style"

session "Synthesize review"
  context: { security, perf, style }
```

```prose
# Borges
forking:
  security = dream "Check security"
  perf = dream "Check performance"
  style = dream "Check style"

dream "Synthesize review"
  memory: { security, perf, style }
```

### 带条件的循环

```prose
# Functional
loop until **the code is bug-free** (max: 5):
  session "Find and fix bugs"
```

```prose
# Borges
labyrinth until **the code is bug-free** (max: 5):
  dream "Find and fix bugs"
```

### 错误处理

```prose
# Functional
try:
  session "Risky operation"
catch as err:
  session "Handle error"
    context: err
finally:
  session "Cleanup"
```

```prose
# Borges
venture:
  dream "Risky operation"
lest as err:
  dream "Handle error"
    memory: err
ultimately:
  dream "Cleanup"
```

### 选择块

```prose
# Functional
choice **the severity level**:
  option "Critical":
    session "Escalate immediately"
  option "Minor":
    session "Log for later"
```

```prose
# Borges
bifurcation **the severity level**:
  branch "Critical":
    dream "Escalate immediately"
  branch "Minor":
    dream "Log for later"
```

### 条件语句

```prose
# Functional
if **has security issues**:
  session "Fix security"
elif **has performance issues**:
  session "Optimize"
else:
  session "Approve"
```

```prose
# Borges
should **has security issues**:
  dream "Fix security"
or should **has performance issues**:
  dream "Optimize"
otherwise:
  dream "Approve"
```

### 可重用块

```prose
# Functional
block review(topic):
  session "Research {topic}"
  session "Analyze {topic}"

do review("quantum computing")
```

```prose
# Borges
chapter review(topic):
  dream "Research {topic}"
  dream "Analyze {topic}"

do review("quantum computing")
```

### 固定迭代

```prose
# Functional
repeat 3:
  session "Generate idea"
```

```prose
# Borges
3 mirrors:
  dream "Generate idea"
```

### 不可变绑定

```prose
# Functional
const config = { model: "opus", retries: 3 }
```

```prose
# Borges
zahir config = { author: "opus", recur: 3 }
```

---

## 支持 Borges 的理由

1. **形而上学共鸣。** AI 会话梦想出子代理的存在，与《环形废墟》相呼应。
2. **学术语调。** `axiom`/`theorem` 将程序框架为逻辑推导。
3. **难忘的比喻。** 无法改变的扎伊尔。无法逃脱的迷宫。从中取回的图书馆。
4. **主题连贯。** 博尔赫斯写了无限、递归和分支时间——都是计算的核心。
5. **文学声望。** 博尔赫斯广为人读；引用对许多用户来说能够引起共鸣。

## 反对 Borges 的理由

1. **需要熟悉。** "扎伊尔"和"富内斯"对没有读过博尔赫斯的人来说很晦涩。
2. **可能显得卖弄。** 可能感觉像是炫耀而非沟通。
3. **翻译开销。** 用户必须在脑中将 `labyrinth` 映射到 `loop`。
4. **文化特定性。** 不如民间/童话故事那样普适。

---

## 关键 Borges 参考

对于不熟悉原作的读者：

| 作品                                | 使用的概念                         | 摘要                                                   |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| 《环形废墟》                        | `dreamer`、`dream`                 | 一个人梦想另一个人进入存在，却发现自己也是被梦想出来的 |
| 《小径分岔的花园》                  | `forking`、`bifurcation`、`branch` | 一个既是迷宫也是书的花园；时间不断分叉成分歧的未来     |
| 《巴别图书馆》                      | `retrieve`                         | 一个包含所有可能书籍的无限图书馆                       |
| 《博闻强记的富内斯》                | `memory`                           | 一个拥有完美记忆、无法忘记任何事情的人                 |
| 《扎伊尔》                          | `zahir`                            | 一个一旦被看见就无法被忘记或忽视的物体                 |
| 《阿莱夫》                          | （未使用）                         | 空间中包含所有其他点的一个点                           |
| 《特隆、乌克巴尔、奥比斯·特蒂乌斯》 | （未使用）                         | 一个逐渐成为现实的虚构世界                             |

---

## 已考虑的替代方案

### 用于 `dreamer`（agent）

| 关键词      | 被拒绝原因           |
| ----------- | -------------------- |
| `author`    | 已用于 `model`       |
| `scribe`    | 太被动，只是记录     |
| `librarian` | 更像策展者而非创造者 |

### 用于 `labyrinth`（loop）

| 关键词           | 被拒绝原因   |
| ---------------- | ------------ |
| `recursion`      | 太技术性     |
| `eternal return` | 太长         |
| `ouroboros`      | 神话来源不对 |

### 用于 `zahir`（const）

| 关键词    | 被拒绝原因                   |
| --------- | ---------------------------- |
| `aleph`   | 阿莱夫关于全体性，不是不变性 |
| `fixed`   | 太平淡                       |
| `eternal` | 使用过度                     |

### 用于 `memory`（context）

| 关键词    | 被拒绝原因               |
| --------- | ------------------------ |
| `funes`   | 作为独立关键词太晦涩     |
| `recall`  | 听起来像函数调用         |
| `archive` | 更像巴别图书馆而非富内斯 |

---

## 结论

保留用于与功能性和民俗语言方案进行基准测试。Borges 语言方案提供了一种鲜明的知性/形而上学风格，可能与欣赏文学计算的用户产生共鸣。

潜在的基准测试问题：

1. **可学习性** — `labyrinth` 对循环是否直观？
2. **记忆性** — `zahir` 是否比 `const` 更令人印象深刻？
3. **理解性** — 用户是否能立即理解 `dreamer`/`dream`？
4. **偏好** — 用户最喜欢哪种语言方案？
5. **错误率** — 隐喻式映射是否会导致错误？
