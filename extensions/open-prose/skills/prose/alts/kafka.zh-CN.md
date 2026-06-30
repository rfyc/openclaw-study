---
role: experimental
summary: |
  OpenProse 的卡夫卡语言方案——官僚/荒诞主义备用关键词集。
  职员、程序、请愿书和法规。用于与功能性方案进行基准测试。
status: draft
requires: prose.md
---

# OpenProse 卡夫卡语言方案

> **这是一个皮肤层。** 需要先加载 `prose.md`。所有执行语义、状态管理和 VM 行为均在那里定义。此文件仅提供关键词翻译。

OpenProse 的一个备选语言方案，从弗兰茨·卡夫卡的作品汲取灵感——《审判》、《城堡》、《在流刑地》。程序变成了程序。代理变成了职员。一切都是一个过程，没有人完全知道规则。

## 使用方法

1. 先加载 `prose.md`（执行语义）
2. 加载此文件（关键词翻译）
3. 解析 `.prose` 文件时，接受卡夫卡关键词作为功能关键词的别名
4. 所有执行行为保持不变——仅表面语法改变

> **设计约束：** 仍以语言原则中"结构化但不言而喻"为目标——只是通过官僚视角实现自明性。（讽刺是有意为之。）

---

## 完整翻译对照表

### 核心构造

| 功能语言   | 卡夫卡        | 参考             |
| ---------- | ------------- | ---------------- |
| `agent`    | `clerk`       | 机器中的职员     |
| `session`  | `proceeding`  | 采取的官方行动   |
| `parallel` | `departments` | 多个部门同时行动 |
| `block`    | `regulation`  | 成文的程序       |

### 组合与绑定

| 功能语言  | 卡夫卡        | 参考             |
| --------- | ------------- | ---------------- |
| `use`     | `requisition` | 从档案馆申请     |
| `input`   | `petition`    | 提交供审议的内容 |
| `output`  | `verdict`     | 机器返回的结果   |
| `let`     | `file`        | 在系统中记录     |
| `const`   | `statute`     | 不可改变的法律   |
| `context` | `dossier`     | 案件的累积档案   |

### 控制流

| 功能语言   | 卡夫卡                        | 参考                       |
| ---------- | ----------------------------- | -------------------------- |
| `repeat N` | `N hearings`                  | 在法庭前反复出席           |
| `for...in` | `for each...in the matter of` | 官僚式迭代                 |
| `loop`     | `appeal`                      | 无休止的重新申请，程序继续 |
| `until`    | `until`                       | 不变                       |
| `while`    | `while`                       | 不变                       |
| `choice`   | `tribunal`                    | 作出判决的场所             |
| `option`   | `ruling`                      | 一种可能的判决             |
| `if`       | `in the event that`           | 官僚式条件                 |
| `elif`     | `or in the event that`        | 续接条件                   |
| `else`     | `otherwise`                   | 默认判决                   |

### 错误处理

| 功能语言  | 卡夫卡                | 参考                   |
| --------- | --------------------- | ---------------------- |
| `try`     | `submit`              | 提交处理               |
| `catch`   | `should it be denied` | 被机器拒绝             |
| `finally` | `regardless`          | 无论结果如何都会发生的 |
| `throw`   | `reject`              | 系统拒绝               |
| `retry`   | `resubmit`            | 再次尝试该过程         |

### 会话属性

| 功能语言 | 卡夫卡      | 参考           |
| -------- | ----------- | -------------- |
| `prompt` | `directive` | 官方指令       |
| `model`  | `authority` | 层级的哪个级别 |

### 不变的关键词

这些关键词已经可用，或功能性太强而不宜替换：

- `**...**` 自由裁量标记——机器难以捉摸的判断
- `until`、`while`——已经可用
- `map`、`filter`、`reduce`、`pmap`——管道运算符
- `max`——约束修饰符
- `as`——别名
- 模型名称：`sonnet`、`opus`、`haiku`——保留（或见上方"authority"）

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
# Kafka
requisition "@alice/research" as research
petition topic: "What to investigate"

clerk helper:
  authority: sonnet

file findings = proceeding: helper
  directive: "Research {topic}"

verdict summary = proceeding "Summarize"
  dossier: findings
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
# Kafka
departments:
  security = proceeding "Check security"
  perf = proceeding "Check performance"
  style = proceeding "Check style"

proceeding "Synthesize review"
  dossier: { security, perf, style }
```

### 带条件的循环

```prose
# Functional
loop until **the code is bug-free** (max: 5):
  session "Find and fix bugs"
```

```prose
# Kafka
appeal until **the code is bug-free** (max: 5):
  proceeding "Find and fix bugs"
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
# Kafka
submit:
  proceeding "Risky operation"
should it be denied as err:
  proceeding "Handle error"
    dossier: err
regardless:
  proceeding "Cleanup"
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
# Kafka
tribunal **the severity level**:
  ruling "Critical":
    proceeding "Escalate immediately"
  ruling "Minor":
    proceeding "Log for later"
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
# Kafka
in the event that **has security issues**:
  proceeding "Fix security"
or in the event that **has performance issues**:
  proceeding "Optimize"
otherwise:
  proceeding "Approve"
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
# Kafka
regulation review(topic):
  proceeding "Research {topic}"
  proceeding "Analyze {topic}"

invoke review("quantum computing")
```

### 固定迭代

```prose
# Functional
repeat 3:
  session "Attempt connection"
```

```prose
# Kafka
3 hearings:
  proceeding "Attempt connection"
```

### 不可变绑定

```prose
# Functional
const config = { model: "opus", retries: 3 }
```

```prose
# Kafka
statute config = { authority: "opus", resubmit: 3 }
```

---

## 支持卡夫卡方案的理由

1. **黑色幽默。** 程序作为官僚机构既有趣又令人感同身受。
2. **出奇地贴切。** 软件往往*确实*是一个难以捉摸的机器。
3. **映射清晰。** Petition/verdict、file/dossier、clerk/proceeding 都很好用。
4. **Appeal 用于循环。** 无休止的上诉过程是重试逻辑的完美比喻。
5. **文化共鸣。** "卡夫卡式"是一个广为理解的形容词。
6. **自我认知。** 将卡夫卡用于编程语言承认了荒诞性。

## 反对卡夫卡方案的理由

1. **基调阴郁。** 不是每个人都想要自己的程序感觉像《审判》。
2. **关键词冗长。** "In the event that"和"should it be denied"太长。
3. **可能引发焦虑。** 对于认为官僚机构令人压力的用户来说可能不好玩。
4. **讽刺可能不奏效。** 一些用户可能字面理解并觉得令人不快。

---

## 关键卡夫卡概念

| 术语     | 含义               | 用于                     |
| -------- | ------------------ | ------------------------ |
| 机器     | 难以捉摸的系统     | VM 本身                  |
| K.       | 主角，从未完整命名 | 用户                     |
| 《审判》 | 没有明确规则的过程 | 程序执行                 |
| 《城堡》 | 无法到达的权威     | 更高层的系统             |
| 职员     | 处理事务的职员     | `agent` → `clerk`        |
| 程序     | 官方行动           | `session` → `proceeding` |
| 档案     | 累积的文件         | `context` → `dossier`    |

---

## 已考虑的替代方案

### 用于 `clerk`（agent）

| 关键词        | 被拒绝原因    |
| ------------- | ------------- |
| `official`    | 太泛化        |
| `functionary` | 难以拼写      |
| `bureaucrat`  | 太贬义        |
| `advocate`    | 太正面/有帮助 |

### 用于 `proceeding`（session）

| 关键词    | 被拒绝原因                   |
| --------- | ---------------------------- |
| `case`    | 含义过载（switch case）      |
| `hearing` | 保留用于 `repeat N hearings` |
| `trial`   | 荷马语言方案中已使用         |
| `process` | 太技术化                     |

### 用于 `departments`（parallel）

| 关键词       | 被拒绝原因           |
| ------------ | -------------------- |
| `bureaus`    | 好的替代，略不清晰   |
| `offices`    | 太平凡               |
| `ministries` | 更像奥威尔而非卡夫卡 |

### 用于 `appeal`（loop）

| 关键词     | 被拒绝原因     |
| ---------- | -------------- |
| `recourse` | 太法律技术性   |
| `petition` | 已用于 `input` |
| `process`  | 太泛化         |

---

## 结论

保留用于基准测试。卡夫卡语言方案提供了一种黑色幽默、自我认知的框架，承认了软件系统的官僚性质。讽刺本身就是目的。

最适合：

- 对软件复杂性有幽默感的用户
- 真正感觉像在穿越官僚机构的程序
- 欢迎承认荒诞性的场景

不推荐用于：

- 认为官僚比喻令人有压力的用户
- 需要真诚、积极框架的场景
- 需要显得平易近人的文档

---

## 结语

> "一定有人诽谤了约瑟夫·K，因为一天早晨，他在没有做任何坏事的情况下被逮捕了。"
> ——《审判》

在卡夫卡语言方案中，你的程序就是约瑟夫·K。机器将处理它。无论成功还是失败，没有人能确定。但程序将继续进行。
