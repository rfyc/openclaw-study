---
role: experimental
summary: |
  OpenProse 的《天方夜谭》语言方案——叙事/嵌套备用关键词集。
  精灵、故事中的故事、愿望与誓言。用于与功能性方案进行基准测试。
status: draft
requires: prose.md
---

# OpenProse 天方夜谭语言方案

> **这是一个皮肤层。** 需要先加载 `prose.md`。所有执行语义、状态管理和 VM 行为均在那里定义。此文件仅提供关键词翻译。

OpenProse 的一个备选语言方案，从《一千零一夜》汲取灵感。程序变成了谢赫拉莎德讲述的故事。递归变成了故事中的故事。代理变成了受命服务的精灵。

## 使用方法

1. 先加载 `prose.md`（执行语义）
2. 加载此文件（关键词翻译）
3. 解析 `.prose` 文件时，接受天方夜谭关键词作为功能关键词的别名
4. 所有执行行为保持不变——仅表面语法改变

> **设计约束：** 仍以语言原则中"结构化但不言而喻"为目标——只是通过叙事视角实现自明性。

---

## 完整翻译对照表

### 核心构造

| 功能语言   | 夜谭语言 | 参考                         |
| ---------- | -------- | ---------------------------- |
| `agent`    | `djinn`  | 受命服务的精灵，实现愿望     |
| `session`  | `tale`   | 一个讲述的故事，叙事单元     |
| `parallel` | `bazaar` | 众多声音，众多摊位，同时进行 |
| `block`    | `frame`  | 包含其他故事的故事           |

### 组合与绑定

| 功能语言  | 夜谭语言  | 参考                       |
| --------- | --------- | -------------------------- |
| `use`     | `conjure` | 从别处召唤                 |
| `input`   | `wish`    | 向精灵提出的请求           |
| `output`  | `gift`    | 作为回报所授予的           |
| `let`     | `name`    | 命名有力量（与 folk 相同） |
| `const`   | `oath`    | 不可打破的誓言，封印的     |
| `context` | `scroll`  | 书写并传递的内容           |

### 控制流

| 功能语言   | 夜谭语言           | 参考                   |
| ---------- | ------------------ | ---------------------- |
| `repeat N` | `N nights`         | "一千零一夜……"         |
| `for...in` | `for each...among` | 在商人之中，在故事之中 |
| `loop`     | `telling`          | 讲述继续               |
| `until`    | `until`            | 不变                   |
| `while`    | `while`            | 不变                   |
| `choice`   | `crossroads`       | 故事分叉之处           |
| `option`   | `path`             | 故事可能走的一条路     |
| `if`       | `should`           | 叙事条件               |
| `elif`     | `or should`        | 续接条件               |
| `else`     | `otherwise`        | 另一种讲述             |

### 错误处理

| 功能语言  | 夜谭语言                   | 参考           |
| --------- | -------------------------- | -------------- |
| `try`     | `venture`                  | 踏上旅途       |
| `catch`   | `should misfortune strike` | 故事转向黑暗   |
| `finally` | `and so it was`            | 不可避免的结局 |
| `throw`   | `curse`                    | 宣布厄运       |
| `retry`   | `persist`                  | 英雄再次尝试   |

### 会话属性

| 功能语言 | 夜谭语言  | 参考             |
| -------- | --------- | ---------------- |
| `prompt` | `command` | 向精灵发出的命令 |
| `model`  | `spirit`  | 哪个精灵回应     |

### 共享附录

参见 [shared-appendix.md](./shared-appendix.md) 了解未变关键词和通用比较模式。

建议改写为天方夜谭风格的示例目标：

- `session` 示例 -> `tale`
- `parallel` 示例 -> `bazaar`
- `loop` 示例 -> `telling`
- `try/catch/finally` 示例 -> `venture` / `should misfortune strike` / `and so it was`
- `choice` 示例 -> `crossroads` / `path`

```prose
# Nights
should **has security issues**:
  tale "Fix security"
or should **has performance issues**:
  tale "Optimize"
otherwise:
  tale "Approve"
```

### 可重用块（框架故事）

```prose
# Functional
block review(topic):
  session "Research {topic}"
  session "Analyze {topic}"

do review("quantum computing")
```

```prose
# Nights
frame review(topic):
  tale "Research {topic}"
  tale "Analyze {topic}"

tell review("quantum computing")
```

### 固定迭代

```prose
# Functional
repeat 1001:
  session "Tell a story"
```

```prose
# Nights
1001 nights:
  tale "Tell a story"
```

### 不可变绑定

```prose
# Functional
const config = { model: "opus", retries: 3 }
```

```prose
# Nights
oath config = { spirit: "opus", persist: 3 }
```

---

## 支持天方夜谭的理由

1. **框架叙事即递归。** 故事中的故事完美映射到嵌套程序调用。
2. **精灵/愿望/礼物。** 代理/输入/输出的映射极为自然。
3. **丰富传统。** 《一千零一夜》广为人知。
4. **集市用于并行。** 众多商人，众多摊位，同时活跃——生动的比喻。
5. **誓言用于 const。** 不可打破的誓言是不变性的完美比喻。
6. **"1001 夜"** 作为循环计数非常有趣。

## 反对天方夜谭的理由

1. **文化敏感性。** 必须谨慎处理，避免东方主义刻板印象。
2. **"Djinn" 发音。** 不熟悉的用户可能不确定（jinn? djinn? genie?）。
3. **部分映射感觉牵强。** "Bazaar" 用于并行生动但不直观。
4. **"Should misfortune strike"** 用于 `catch` 太长。

---

## 天方夜谭核心概念

| 术语         | 含义                   | 用于                  |
| ------------ | ---------------------- | --------------------- |
| Scheherazade | 为生存而讲故事的叙述者 | （程序作者）          |
| Djinn        | 超自然精灵，受命服务   | `agent` → `djinn`     |
| 框架故事     | 包含其他故事的故事     | `block` → `frame`     |
| 愿望         | 向精灵提出的请求       | `input` → `wish`      |
| 誓言         | 不可打破的承诺         | `const` → `oath`      |
| 集市         | 市场，众多摊主         | `parallel` → `bazaar` |

---

## 已考虑的替代方案

### 用于 `djinn`（agent）

| 关键词     | 被拒绝原因                    |
| ---------- | ----------------------------- |
| `genie`    | 迪士尼联想，不够文学          |
| `spirit`   | 已用于 `model`                |
| `ifrit`    | 太具体（精灵的一种类型）      |
| `narrator` | 太元叙事，Scheherazade 是用户 |

### 用于 `tale`（session）

| 关键词    | 被拒绝原因                   |
| --------- | ---------------------------- |
| `story`   | 好，但 `tale` 感觉更具文学性 |
| `night`   | 保留用于 `repeat N nights`   |
| `chapter` | 更具西方/小说风格            |

### 用于 `bazaar`（parallel）

| 关键词    | 被拒绝原因               |
| --------- | ------------------------ |
| `caravan` | 有顺序含义（一个接一个） |
| `chorus`  | 希腊风格，传统不对       |
| `souk`    | 知名度较低               |

### 用于 `scroll`（context）

| 关键词    | 被拒绝原因  |
| --------- | ----------- |
| `letter`  | 太小/太私人 |
| `tome`    | 太大        |
| `message` | 太普通      |

---

## 结论

保留用于基准测试。天方夜谭语言方案提供了一种叙事框架，自然映射到递归的嵌套程序。精灵/愿望/礼物三重映射尤为优雅。

最适合：

- 深层嵌套的程序（故事中的故事）
- 感觉像实现愿望的工作流
- 喜欢叙事框架的用户

`frame` 关键词用于可重用块尤为贴切——谢赫拉莎德的框架故事包含了一千个故事。
