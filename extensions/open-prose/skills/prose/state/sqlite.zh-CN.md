---
role: sqlite-state-management
status: experimental
summary: |
  OpenProse 程序的 SQLite 状态管理。此方式将执行状态持久化到 SQLite 数据库，
  支持结构化查询、原子事务和灵活的 schema 演进。
requires: PATH 中需要有 sqlite3 CLI 工具
see-also:
  - ../prose.md: VM 执行语义
  - filesystem.md: 基于文件的状态（默认，更规范）
  - in-context.md: 上下文内状态（适用于简单程序）
  - ../primitives/session.md: 会话上下文与压缩指南
---

# SQLite 状态管理（实验性）

本文档描述 OpenProse VM 如何使用 **SQLite 数据库**来跟踪执行状态。这是基于文件的状态（`filesystem.md`）和上下文内状态（`in-context.md`）的实验性替代方案。

## 前置条件

**需要：** `sqlite3` 命令行工具必须在你的 PATH 中可用。

| 平台    | 安装方式                                            |
| ------- | --------------------------------------------------- |
| macOS   | 预装                                                |
| Linux   | `apt install sqlite3` / `dnf install sqlite3` / 等  |
| Windows | `winget install SQLite.SQLite` 或从 sqlite.org 下载 |

若 `sqlite3` 不可用，VM 将回退到文件系统状态并警告用户。

---

## 概述

SQLite 状态提供：

- **原子事务**：状态变化符合 ACID 规范
- **结构化查询**：按名称查找特定绑定、按状态过滤、聚合结果
- **灵活的 schema**：按需添加列和表
- **单文件可移植性**：整个运行状态保存在一个 `.db` 文件中
- **并发访问**：SQLite 自动处理锁定

**核心原则：** 数据库是灵活的工作空间。VM 和子 agent 将其作为协调机制共享，而非严格契约。

---

## 数据库位置

数据库位于标准运行目录内：

```
.prose/runs/{YYYYMMDD}-{HHMMSS}-{random}/
├── state.db          # SQLite 数据库（此文件）
├── program.prose     # 运行程序的副本
└── attachments/      # 无法放入数据库的大型输出（可选）
```

**运行 ID 格式：** 与文件系统状态相同：`{YYYYMMDD}-{HHMMSS}-{random6}`

示例：`.prose/runs/20260116-143052-a7b3c9/state.db`

### 项目级和用户级 Agent

执行级 agent（默认）存储在每次运行的 `state.db` 中。然而，**项目级 agent**（`persist: project`）和**用户级 agent**（`persist: user`）必须跨运行保留。

对于项目级 agent，使用独立数据库：

```
.prose/
├── agents.db                 # 项目级 agent 记忆（跨运行保留）
└── runs/
    └── {id}/
        └── state.db          # 执行级状态（随运行结束而消失）
```

对于用户级 agent，使用 home 目录中的数据库：

```
~/.prose/
└── agents.db                 # 用户级 agent 记忆（跨项目保留）
```

项目级 agent 的 `agents` 和 `agent_segments` 表位于 `.prose/agents.db`，用户级 agent 的对应表位于 `~/.prose/agents.db`。VM 在首次使用时初始化这些数据库，并向子 agent 提供正确路径。

---

## 职责分离

VM/子 agent 契约与 [postgres.md](./postgres.md#responsibility-separation) 相同。

SQLite 特有差异：

- VM 创建 `state.db` 而非 `openprose` schema
- 子 agent 确认消息指向本地数据库路径，例如 `.prose/runs/<runId>/state.db`
- 清理通常是 `VACUUM` 或文件删除，而非删除 schema 对象

返回值示例：

```text
Binding written: research
Location: .prose/runs/20260116-143052-a7b3c9/state.db (bindings table, name='research', execution_id=NULL)
```

```text
Binding written: result
Location: .prose/runs/20260116-143052-a7b3c9/state.db (bindings table, name='result', execution_id=43)
Execution ID: 43
```

VM 跟踪位置，而非完整值。

---

## 核心 Schema

VM 初始化这些表。这是**最小可行 schema**——可自由扩展。

```sql
-- 运行元数据
CREATE TABLE IF NOT EXISTS run (
    id TEXT PRIMARY KEY,
    program_path TEXT,
    program_source TEXT,
    started_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'running',  -- running, completed, failed, interrupted
    state_mode TEXT DEFAULT 'sqlite'
);

-- 执行位置和历史
CREATE TABLE IF NOT EXISTS execution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    statement_index INTEGER,
    statement_text TEXT,
    status TEXT,  -- pending, executing, completed, failed, skipped
    started_at TEXT,
    completed_at TEXT,
    error_message TEXT,
    parent_id INTEGER REFERENCES execution(id),  -- 用于嵌套块
    metadata TEXT  -- JSON，用于特定构造的数据（循环迭代、并行分支等）
);

-- 所有命名值（input、output、let、const）
CREATE TABLE IF NOT EXISTS bindings (
    name TEXT,
    execution_id INTEGER,  -- 根作用域为 NULL，块调用则非空
    kind TEXT,  -- input, output, let, const
    value TEXT,
    source_statement TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    attachment_path TEXT,  -- 若值过大，存储文件路径
    PRIMARY KEY (name, IFNULL(execution_id, -1))  -- IFNULL 处理根作用域的 NULL
);

-- 持久化 agent 记忆
CREATE TABLE IF NOT EXISTS agents (
    name TEXT PRIMARY KEY,
    scope TEXT,  -- execution, project, user, custom
    memory TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Agent 调用历史
CREATE TABLE IF NOT EXISTS agent_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_name TEXT REFERENCES agents(name),
    segment_number INTEGER,
    timestamp TEXT DEFAULT (datetime('now')),
    prompt TEXT,
    summary TEXT,
    UNIQUE(agent_name, segment_number)
);

-- 导入注册表
CREATE TABLE IF NOT EXISTS imports (
    alias TEXT PRIMARY KEY,
    source_url TEXT,
    fetched_at TEXT,
    inputs_schema TEXT,  -- JSON
    outputs_schema TEXT  -- JSON
);
```

### Schema 约定

- **时间戳**：使用 ISO 8601 格式（`datetime('now')`）
- **JSON 字段**：在 `metadata`、`*_schema` 列中将结构化数据存储为 JSON 文本
- **大型值**：若绑定值超过 ~100KB，写入 `attachments/{name}.md` 并存储路径
- **扩展表**：使用 `x_` 前缀（如 `x_metrics`、`x_audit_log`）
- **匿名绑定**：未显式捕获的会话使用自动生成的名称：`anon_001`、`anon_002` 等
- **导入绑定**：使用导入别名作为作用域前缀：`research.findings`、`research.sources`
- **有作用域的绑定**：使用 `execution_id` 列——根作用域为 NULL，块调用则非空

### 作用域解析查询

对于递归块，绑定有作用域限制到其执行帧。通过遍历调用栈来解析变量：

```sql
-- 从 execution_id 43 开始查找绑定 'result'
WITH RECURSIVE scope_chain AS (
  -- 从当前执行开始
  SELECT id, parent_id FROM execution WHERE id = 43
  UNION ALL
  -- 向上追溯父级
  SELECT e.id, e.parent_id
  FROM execution e
  JOIN scope_chain s ON e.id = s.parent_id
)
SELECT b.* FROM bindings b
LEFT JOIN scope_chain s ON b.execution_id = s.id
WHERE b.name = 'result'
  AND (b.execution_id IN (SELECT id FROM scope_chain) OR b.execution_id IS NULL)
ORDER BY
  CASE WHEN b.execution_id IS NULL THEN 1 ELSE 0 END,  -- 优先有作用域的而非根
  s.id DESC NULLS LAST  -- 优先更深（更本地）的作用域
LIMIT 1;
```

**若已知作用域链的简化版本：**

```sql
-- 直接查找：依次检查当前作用域、父级、根
SELECT * FROM bindings
WHERE name = 'result'
  AND (execution_id = 43 OR execution_id = 42 OR execution_id IS NULL)
ORDER BY execution_id DESC NULLS LAST
LIMIT 1;
```

---

## 数据库交互

VM 和子 agent 都通过 `sqlite3` CLI 进行交互。

### 来自 VM

```bash
# 初始化数据库
sqlite3 .prose/runs/20260116-143052-a7b3c9/state.db "CREATE TABLE IF NOT EXISTS..."

# 更新执行位置
sqlite3 .prose/runs/20260116-143052-a7b3c9/state.db "
  INSERT INTO execution (statement_index, statement_text, status, started_at)
  VALUES (3, 'session \"Research AI safety\"', 'executing', datetime('now'))
"

# 读取绑定
sqlite3 -json .prose/runs/20260116-143052-a7b3c9/state.db "
  SELECT value FROM bindings WHERE name = 'research'
"

# 检查并行分支状态
sqlite3 .prose/runs/20260116-143052-a7b3c9/state.db "
  SELECT statement_text, status FROM execution
  WHERE json_extract(metadata, '$.parallel_id') = 'p1'
"
```

### 来自子 Agent

VM 在派生会话时提供数据库路径和指令：

**根作用域（块调用外部）：**

```
Your output database is:
  .prose/runs/20260116-143052-a7b3c9/state.db

When complete, write your output:

sqlite3 .prose/runs/20260116-143052-a7b3c9/state.db "
  INSERT OR REPLACE INTO bindings (name, execution_id, kind, value, source_statement, updated_at)
  VALUES (
    'research',
    NULL,  -- root scope
    'let',
    'AI safety research covers alignment, robustness...',
    'let research = session: researcher',
    datetime('now')
  )
"
```

**块调用内部（包含 execution_id）：**

```
Execution scope:
  execution_id: 43
  block: process
  depth: 3

Your output database is:
  .prose/runs/20260116-143052-a7b3c9/state.db

When complete, write your output:

sqlite3 .prose/runs/20260116-143052-a7b3c9/state.db "
  INSERT OR REPLACE INTO bindings (name, execution_id, kind, value, source_statement, updated_at)
  VALUES (
    'result',
    43,  -- scoped to this execution
    'let',
    'Processed chunk into 3 sub-parts...',
    'let result = session \"Process chunk\"',
    datetime('now')
  )
"
```

对于持久化 agent（执行级）：

```
Your memory is in the database:
  .prose/runs/20260116-143052-a7b3c9/state.db

Read your current state:
  sqlite3 -json .prose/runs/20260116-143052-a7b3c9/state.db "SELECT memory FROM agents WHERE name = 'captain'"

Update when done:
  sqlite3 .prose/runs/20260116-143052-a7b3c9/state.db "UPDATE agents SET memory = '...', updated_at = datetime('now') WHERE name = 'captain'"

Record this segment:
  sqlite3 .prose/runs/20260116-143052-a7b3c9/state.db "INSERT INTO agent_segments (agent_name, segment_number, prompt, summary) VALUES ('captain', 3, '...', '...')"
```

对于项目级 agent，使用 `.prose/agents.db`。对于用户级 agent，使用 `~/.prose/agents.db`。

---

## 主线程的上下文保存

**这一点至关重要。** 数据库用于持久化和协调，但 VM 仍必须维护对话上下文。

### VM 必须旁白的内容

即使使用 SQLite 状态，VM 也应在对话中旁白关键事件：

```
[Position] Statement 3: let research = session: researcher
   Spawning session, will write to state.db
   [Task tool call]
[Success] Session complete, binding written to DB
[Binding] research = <stored in state.db>
```

### 为何两者都需要？

| 目的              | 机制                                        |
| ----------------- | ------------------------------------------- |
| **工作记忆**      | 对话旁白（VM 无需重新查询即能"记住"的内容） |
| **持久状态**      | SQLite 数据库（跨上下文限制存活，支持恢复） |
| **子 agent 协调** | SQLite 数据库（共享访问点）                 |
| **调试/检查**     | SQLite 数据库（可查询历史）                 |

旁白是 VM 对执行的"心理模型"，数据库是用于恢复和检查的"真实来源"。

---

## 并行执行

对于并行块，VM 使用 `metadata` JSON 字段跟踪分支。**只有 VM 写入 `execution` 表。**

```sql
-- VM 标记并行开始
INSERT INTO execution (statement_index, statement_text, status, metadata)
VALUES (5, 'parallel:', 'executing', '{"parallel_id": "p1", "strategy": "all", "branches": ["a", "b", "c"]}');

-- VM 为每个分支创建执行记录
INSERT INTO execution (statement_index, statement_text, status, parent_id, metadata)
VALUES (6, 'a = session "Task A"', 'executing', 5, '{"parallel_id": "p1", "branch": "a"}');

-- 子 agent 将输出写入 bindings 表（见"来自子 Agent"部分）
-- Task 工具通过 substrate 向 VM 发出完成信号

-- Task 返回后，VM 将分支标记为完成
UPDATE execution SET status = 'completed', completed_at = datetime('now')
WHERE json_extract(metadata, '$.parallel_id') = 'p1' AND json_extract(metadata, '$.branch') = 'a';

-- VM 检查所有分支是否完成
SELECT COUNT(*) as pending FROM execution
WHERE json_extract(metadata, '$.parallel_id') = 'p1' AND status != 'completed';
```

---

## 循环跟踪

```sql
-- 循环元数据跟踪迭代状态
INSERT INTO execution (statement_index, statement_text, status, metadata)
VALUES (10, 'loop until **analysis complete** (max: 5):', 'executing',
  '{"loop_id": "l1", "max_iterations": 5, "current_iteration": 0, "condition": "**analysis complete**"}');

-- 更新迭代
UPDATE execution
SET metadata = json_set(metadata, '$.current_iteration', 2),
    updated_at = datetime('now')
WHERE json_extract(metadata, '$.loop_id') = 'l1';
```

---

## 错误处理

```sql
-- 记录失败
UPDATE execution
SET status = 'failed',
    error_message = 'Connection timeout after 30s',
    completed_at = datetime('now')
WHERE id = 15;

-- 在元数据中跟踪重试次数
UPDATE execution
SET metadata = json_set(metadata, '$.retry_attempt', 2, '$.max_retries', 3)
WHERE id = 15;
```

---

## 大型输出

当绑定值对于数据库存储来说过大（>100KB）时：

1. 将内容写入 `attachments/{binding_name}.md`
2. 在 `attachment_path` 列中存储路径
3. 将 `value` 留为摘要或 null

```sql
INSERT INTO bindings (name, kind, value, attachment_path, source_statement)
VALUES (
  'full_report',
  'let',
  'Full analysis report (847KB) - see attachment',
  'attachments/full_report.md',
  'let full_report = session "Generate comprehensive report"'
);
```

---

## 恢复执行

若要恢复被中断的运行：

```sql
-- 查找当前位置
SELECT statement_index, statement_text, status
FROM execution
WHERE status = 'executing'
ORDER BY id DESC LIMIT 1;

-- 获取所有已完成的绑定
SELECT name, kind, value, attachment_path FROM bindings;

-- 获取 agent 记忆状态
SELECT name, memory FROM agents;

-- 检查并行块状态
SELECT json_extract(metadata, '$.branch') as branch, status
FROM execution
WHERE json_extract(metadata, '$.parallel_id') IS NOT NULL
  AND parent_id = (SELECT id FROM execution WHERE status = 'executing' AND statement_text LIKE 'parallel:%');
```

---

## 灵活性鼓励

与文件系统状态不同，SQLite 状态故意**减少约束**。核心 schema 只是起点。鼓励你：

- 按需**添加列**到现有表
- **创建扩展表**（使用 `x_` 前缀）
- **存储自定义指标**（时间、token 数量、模型信息）
- 为你的查询模式**构建索引**
- 使用 **JSON 函数**处理半结构化数据

扩展示例：

```sql
-- 自定义指标表
CREATE TABLE x_metrics (
    execution_id INTEGER REFERENCES execution(id),
    metric_name TEXT,
    metric_value REAL,
    recorded_at TEXT DEFAULT (datetime('now'))
);

-- 添加自定义列
ALTER TABLE bindings ADD COLUMN token_count INTEGER;

-- 为常用查询创建索引
CREATE INDEX idx_execution_status ON execution(status);
```

数据库是你的工作空间，尽情使用。

---

## 与其他模式的比较

| 方面              | filesystem.md            | in-context.md    | sqlite.md                   |
| ----------------- | ------------------------ | ---------------- | --------------------------- |
| **状态位置**      | `.prose/runs/{id}/` 文件 | 对话历史         | `.prose/runs/{id}/state.db` |
| **可查询**        | 通过文件读取             | 否               | 是（SQL）                   |
| **原子更新**      | 否                       | N/A              | 是（事务）                  |
| **schema 灵活性** | 固定文件结构             | N/A              | 灵活（可添加表/列）         |
| **恢复**          | 读取 state.md            | 重读对话         | 查询数据库                  |
| **复杂度上限**    | 高                       | 低（<30 条语句） | 高                          |
| **依赖**          | 无                       | 无               | sqlite3 CLI                 |
| **状态**          | 稳定                     | 稳定             | **实验性**                  |

---

## 小结

SQLite 状态管理：

1. 每次运行使用**单一数据库文件**
2. 提供 VM 与子 agent 之间**清晰的职责分离**
3. 支持用于状态检查的**结构化查询**
4. 支持可靠更新的**原子事务**
5. 按需进行**灵活的 schema 演进**
6. 需要 **sqlite3 CLI** 工具
7. 是**实验性**功能——预期会有变化

核心契约：VM 管理执行流程并派生子 agent；子 agent 直接将自己的输出写入数据库。两者都遵循这一原则：所发生的事情被记录下来，被记录的内容可以被查询。
