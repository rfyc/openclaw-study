---
role: experimental
summary: |
  OpenProse 的民俗语言方案——文学/民间故事备用关键词集。
  奇妙、戏剧化，植根于童话和神话。用于与功能性方案进行基准测试。
status: draft
requires: prose.md
---

# OpenProse 民俗语言方案

> **这是一个皮肤层。** 需要先加载 `prose.md`。所有执行语义、状态管理和 VM 行为均在那里定义。此文件仅提供关键词翻译。

OpenProse 的一个备选语言方案，融入了文学、戏剧和民间故事的术语。功能性方案优先考虑实用性和清晰度；民俗方案优先考虑奇趣性和叙事流畅性。

## 使用方法

1. 先加载 `prose.md`（执行语义）
2. 加载此文件（关键词翻译）
3. 解析 `.prose` 文件时，接受民俗关键词作为功能关键词的别名
4. 所有执行行为保持不变——仅表面语法改变

> **设计约束：** 仍以语言原则中"结构化但不言而喻"为目标——只是面向不同的感受性实现自明性。

---

## 完整翻译对照表

### 核心构造

| 功能语言   | 民俗语言   | 来源     | 含义                       |
| ---------- | ---------- | -------- | -------------------------- |
| `agent`    | `sprite`   | 民间故事 | 快捷、轻盈、短暂的精灵助手 |
| `session`  | `scene`    | 戏剧     | 行动的时刻，戏剧性框架     |
| `parallel` | `ensemble` | 戏剧     | 所有人同时表演             |
| `block`    | `act`      | 戏剧     | 戏剧行动的可重用单元       |

### 组合与绑定

| 功能语言  | 民俗语言  | 来源      | 含义                       |
| --------- | --------- | --------- | -------------------------- |
| `use`     | `summon`  | 民间故事  | 从别处召唤                 |
| `input`   | `given`   | 童话      | "给定一把魔法剑……"         |
| `output`  | `yield`   | 农业/魔法 | 咒语产生的东西             |
| `let`     | `name`    | 民间故事  | 命名有力量（真名）         |
| `const`   | `seal`    | 中世纪    | 不可改变，法令上的封蜡印章 |
| `context` | `bearing` | 纹章学    | 使者携带的内容             |

### 控制流

| 功能语言   | 民俗语言           | 来源     | 含义               |
| ---------- | ------------------ | -------- | ------------------ |
| `repeat N` | `N times`          | 童话     | "她呼唤了三次……"   |
| `for...in` | `for each...among` | 叙事     | 略带故事讲述的风格 |
| `loop`     | `loop`             | —        | 已有诗意，不变     |
| `until`    | `until`            | —        | 已可用，不变       |
| `while`    | `while`            | —        | 已可用，不变       |
| `choice`   | `crossroads`       | 民间故事 | 十字路口的命运抉择 |
| `option`   | `path`             | 旅程     | 选择哪条路         |
| `if`       | `when`             | 叙事     | "当月亮升起时……"   |
| `elif`     | `or when`          | 叙事     | 续接条件           |
| `else`     | `otherwise`        | 故事讲述 | 自然的叙事替代     |

### 错误处理

| 功能语言  | 民俗语言         | 来源 | 含义               |
| --------- | ---------------- | ---- | ------------------ |
| `try`     | `venture`        | 冒险 | 尝试不确定的事     |
| `catch`   | `should it fail` | 叙事 | 条件失败处理       |
| `finally` | `ever after`     | 童话 | "从此以后……"       |
| `throw`   | `cry`            | 戏剧 | 发出警报，大声呼叫 |
| `retry`   | `persist`        | 探险 | 不顾艰难继续尝试   |

### 会话属性

| 功能语言 | 民俗语言 | 来源     | 含义           |
| -------- | -------- | -------- | -------------- |
| `prompt` | `charge` | 骑士精神 | 给予任务或职责 |
| `model`  | `voice`  | 戏剧     | 哪个声音说话   |

### 不变的关键词

这些关键词已具有诗意或功能性太强而不宜替换：

- `**...**` 自由裁量标记——已经在"打破第四堵墙"
- `loop`、`until`、`while`——已有叙事效果
- `map`、`filter`、`reduce`、`pmap`——管道运算符，功能性的即可
- `max`——约束修饰符
- `as`——别名
- 模型名称：`sonnet`、`opus`、`haiku`——已具诗意

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
# Folk
summon "@alice/research" as research
given topic: "What to investigate"

sprite helper:
  voice: sonnet

name findings = scene: helper
  charge: "Research {topic}"

yield summary = scene "Summarize"
  bearing: findings
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
# Folk
ensemble:
  security = scene "Check security"
  perf = scene "Check performance"
  style = scene "Check style"

scene "Synthesize review"
  bearing: { security, perf, style }
```

### 带条件的循环

```prose
# Functional
loop until **the code is bug-free** (max: 5):
  session "Find and fix bugs"
```

```prose
# Folk
loop until **the code is bug-free** (max: 5):
  scene "Find and fix bugs"
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
# Folk
venture:
  scene "Risky operation"
should it fail as err:
  scene "Handle error"
    bearing: err
ever after:
  scene "Cleanup"
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
# Folk
crossroads **the severity level**:
  path "Critical":
    scene "Escalate immediately"
  path "Minor":
    scene "Log for later"
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
# Folk
when **has security issues**:
  scene "Fix security"
or when **has performance issues**:
  scene "Optimize"
otherwise:
  scene "Approve"
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
# Folk
act review(topic):
  scene "Research {topic}"
  scene "Analyze {topic}"

perform review("quantum computing")
```

---

## 支持民俗方案的理由

1. **"OpenProse"具有文学性。** Prose 是一种文学形式——为何不充分利用？
2. **第四堵墙是戏剧性的。** `**...**` 已经使用了戏剧术语。
3. **彰显差异。** 文学术语表明"这不是你典型的 DSL"。
4. **内部一致。** 所有内容都来自民间故事/戏剧/叙事。
5. **令人难忘。** `sprite`、`scene`、`crossroads` 在脑海中挥之不去。
6. **模型名称已经契合。** `sonnet`、`opus`、`haiku` 是诗歌形式。

## 反对民俗方案的理由

1. **需要文化知识。** 不是每个人都了解民间故事套路。
2. **更难搜索。** "OpenProse summon" 对比 "OpenProse import"。
3. **可能显得矫情。** 有些用户需要实用性工具。
4. **翻译开销。** 需要在脑中映射到熟悉的概念。

---

## 已考虑的替代方案

### 用于 `sprite`（临时代理）

| 关键词    | 来源 | 被拒绝原因                 |
| --------- | ---- | -------------------------- |
| `spark`   | 英语 | 好，但民俗性不够           |
| `wisp`    | 英语 | 太虚无缥缈                 |
| `herald`  | 英语 | 更像信使而非工作者         |
| `courier` | 法语 | 好的功能性替代，但不够文学 |
| `envoy`   | 法语 | 正式，外交风格             |

### 用于 `shade`（持久代理，如已实现）

| 关键词    | 来源      | 被拒绝原因            |
| --------- | --------- | --------------------- |
| `daemon`  | 希腊/Unix | Unix "始终运行"的联想 |
| `oracle`  | 希腊      | 感觉太"只读"          |
| `spirit`  | 拉丁      | 太接近 `sprite`       |
| `specter` | 拉丁      | 负面/恐怖联想         |
| `genius`  | 罗马      | 含义过载（聪明人）    |

### 用于 `ensemble`（parallel）

| 关键词    | 来源 | 被拒绝原因                     |
| --------- | ---- | ------------------------------ |
| `chorus`  | 希腊 | 每个人说同样的话，而不是不同的 |
| `troupe`  | 法语 | 好的替代，略不清晰             |
| `company` | 戏剧 | 含义过载（企业）               |

### 用于 `crossroads`（choice）

| 关键词       | 来源 | 被拒绝原因           |
| ------------ | ---- | -------------------- |
| `fork`       | 路径 | 太技术化（git fork） |
| `branch`     | 树   | 也太技术化           |
| `divergence` | 拉丁 | 太抽象               |

---

## 结论

保留用于与功能性方案进行基准测试。功能性方案仍然是主要路径，但民俗方案提供了一个有趣的数据点，用于：

1. **可学习性** — 哪个对新手更容易？
2. **记忆性** — 哪个更令人印象深刻？
3. **错误率** — 哪个导致的错误更少？
4. **偏好** — 用户实际更喜欢哪个？

未来的实验可以呈现两种方案并测量结果。
