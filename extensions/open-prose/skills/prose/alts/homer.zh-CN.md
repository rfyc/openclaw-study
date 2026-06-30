---
role: experimental
summary: |
  OpenProse 的荷马语言方案——史诗/英雄主义备用关键词集。
  英雄、试炼、命运与荣耀。用于与功能性方案进行基准测试。
status: draft
requires: prose.md
---

# OpenProse 荷马语言方案

> **这是一个皮肤层。** 需要先加载 `prose.md`。所有执行语义、状态管理和 VM 行为均在那里定义。此文件仅提供关键词翻译。

OpenProse 的一个备选语言方案，从希腊史诗诗歌汲取灵感——《伊利亚特》、《奥德赛》和英雄传统。程序变成了探索。代理变成了英雄。输出变成了赢得的荣耀。

## 使用方法

1. 先加载 `prose.md`（执行语义）
2. 加载此文件（关键词翻译）
3. 解析 `.prose` 文件时，接受荷马关键词作为功能关键词的别名
4. 所有执行行为保持不变——仅表面语法改变

> **设计约束：** 仍以语言原则中"结构化但不言而喻"为目标——只是通过史诗视角实现自明性。

---

## 完整翻译对照表

### 核心构造

| 功能语言   | 荷马    | 参考                           |
| ---------- | ------- | ------------------------------ |
| `agent`    | `hero`  | 行动者，奋斗者                 |
| `session`  | `trial` | 每个任务都是一次劳动，一次考验 |
| `parallel` | `host`  | 如一的军队                     |
| `block`    | `book`  | 史诗的一个章节                 |

### 组合与绑定

| 功能语言  | 荷马      | 参考                        |
| --------- | --------- | --------------------------- |
| `use`     | `invoke`  | "歌唱吧，缪斯……"——呼唤      |
| `input`   | `omen`    | 神明的预兆，给定的征兆      |
| `output`  | `glory`   | Kleos——赢得的荣耀，永存之物 |
| `let`     | `decree`  | 命运宣告，言而成真          |
| `const`   | `fate`    | Moira——不可改变的命运       |
| `context` | `tidings` | 由传令官或信使带来的消息    |

### 控制流

| 功能语言   | 荷马               | 参考                   |
| ---------- | ------------------ | ---------------------- |
| `repeat N` | `N labors`         | 赫拉克勒斯的十二项劳动 |
| `for...in` | `for each...among` | 在军队之中             |
| `loop`     | `ordeal`           | 反复的考验，持续的磨难 |
| `until`    | `until`            | 不变                   |
| `while`    | `while`            | 不变                   |
| `choice`   | `crossroads`       | 命运分叉之处           |
| `option`   | `path`             | 众多道路之一           |
| `if`       | `should`           | 史诗条件               |
| `elif`     | `or should`        | 续接条件               |
| `else`     | `otherwise`        | 另一种命运             |

### 错误处理

| 功能语言  | 荷马               | 参考                      |
| --------- | ------------------ | ------------------------- |
| `try`     | `venture`          | 踏上旅程                  |
| `catch`   | `should ruin come` | Até——神明降下的毁灭、灾难 |
| `finally` | `in the end`       | 不可避免的结局            |
| `throw`   | `lament`           | 英雄的痛苦呐喊            |
| `retry`   | `persist`          | 坚忍，再次尝试            |

### 会话属性

| 功能语言 | 荷马     | 参考             |
| -------- | -------- | ---------------- |
| `prompt` | `charge` | 给予的任务       |
| `model`  | `muse`   | 哪位缪斯赐予灵感 |

### 共享附录

参见 [shared-appendix.md](./shared-appendix.md) 了解未变关键词和通用比较模式。

建议改写为荷马风格的示例目标：

- `session` 示例 -> `trial`
- `parallel` 示例 -> `host`
- `loop` 示例 -> `ordeal`
- `try/catch/finally` 示例 -> `venture` / `should ruin come` / `in the end`
- `choice` 示例 -> `crossroads` / `path`

```prose
# Homeric
should **has security issues**:
  trial "Fix security"
or should **has performance issues**:
  trial "Optimize"
otherwise:
  trial "Approve"
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
# Homeric
book review(topic):
  trial "Research {topic}"
  trial "Analyze {topic}"

do review("quantum computing")
```

### 固定迭代

```prose
# Functional
repeat 12:
  session "Complete task"
```

```prose
# Homeric
12 labors:
  trial "Complete task"
```

### 不可变绑定

```prose
# Functional
const config = { model: "opus", retries: 3 }
```

```prose
# Homeric
fate config = { muse: "opus", persist: 3 }
```

---

## 支持荷马方案的理由

1. **普遍认知。** 希腊史诗是西方文学的基石。
2. **英雄框架。** 将平凡任务转化为荣耀的试炼。
3. **自然契合。** 英雄面对试炼，接受消息，赢得荣耀——映射到 agent/session/output 非常自然。
4. **庄重感。** 当你想要程序感觉史诗般宏大、至关重要时。
5. **命运与法令。** `const` 作为 `fate`（不可改变的）对比 `let` 作为 `decree`（宣告的但可变的）直观自明。

## 反对荷马方案的理由

1. **宏大程度不匹配。** "12 labors" 用于简单循环可能显得过度。
2. **西方中心主义。** 希腊史诗传统具有文化特定性。
3. **词汇有限。** 与 Borges 或民俗方案相比，独特术语较少。
4. **可能显得滑稽。** 英雄语言用于平凡任务有适得其反的风险。

---

## 关键荷马概念

| 术语   | 含义                       | 用于                           |
| ------ | -------------------------- | ------------------------------ |
| Kleos  | 荣耀，流传后世的声名       | `output` → `glory`             |
| Moira  | 命运，一个人应得的份额     | `const` → `fate`               |
| Até    | 神明降下的毁灭，神赐的盲目 | `catch` → `should ruin come`   |
| Nostos | 归途                       | （未使用，但可以是 `finally`） |
| Xenia  | 宾客之谊，好客             | （未使用）                     |
| Muse   | 神圣灵感                   | `model` → `muse`               |

---

## 已考虑的替代方案

### 用于 `hero`（agent）

| 关键词     | 被拒绝原因                   |
| ---------- | ---------------------------- |
| `champion` | 更中世纪而非荷马风格         |
| `warrior`  | 太好战，不是所有任务都是战斗 |
| `wanderer` | 太被动                       |

### 用于 `trial`（session）

| 关键词  | 被拒绝原因                       |
| ------- | -------------------------------- |
| `labor` | 好，但保留用于 `repeat N labors` |
| `quest` | 更中世纪/RPG 风格                |
| `task`  | 太平淡                           |

### 用于 `host`（parallel）

| 关键词    | 被拒绝原因     |
| --------- | -------------- |
| `army`    | 太具体地军事化 |
| `fleet`   | 只适合海战比喻 |
| `phalanx` | 太技术化       |

---

## 结论

保留用于基准测试。荷马语言方案提供了庄重感和英雄主义框架。最适合：

- 感觉像史诗壮举的程序
- 欣赏古典引用的用户
- "荣耀"作为输出感觉恰当的场景

应用于平凡任务时可能造成意外的喜剧效果。
