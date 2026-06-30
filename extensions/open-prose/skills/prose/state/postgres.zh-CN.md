---
role: postgres-state-management
status: experimental
summary: |
  OpenProse 程序的 PostgreSQL 状态管理。此方式将执行状态持久化到 PostgreSQL 数据库，
  支持真正的并发写入、网络访问、团队协作和高吞吐量工作负载。
requires: PATH 中需要有 psql CLI 工具，以及运行中的 PostgreSQL 服务器
see-also:
  - ../prose.md: VM 执行语义
  - filesystem.md: 基于文件的状态（默认，更简单）
  - sqlite.md: SQLite 状态（可查询，单文件）
  - in-context.md: 上下文内状态（适用于简单程序）
  - ../primitives/session.md: 会话上下文与压缩指南
---

# PostgreSQL 状态管理（实验性）

本文档描述 OpenProse VM 如何使用 **PostgreSQL 数据库**来跟踪执行状态。这是基于文件的状态（`filesystem.md`）、SQLite 状态（`sqlite.md`）和上下文内状态（`in-context.md`）的实验性替代方案。

## 前置条件

**需要：**

1. `psql` 命令行工具必须在你的 PATH 中可用
2. 运行中的 PostgreSQL 服务器（本地、Docker 或云端）

### 安装 psql

| 平台                  | 命令                                            | 说明               |
| --------------------- | ----------------------------------------------- | ------------------ |
| macOS（Homebrew）     | `brew install libpq && brew link --force libpq` | 仅客户端；无服务器 |
| macOS（Postgres.app） | 从 https://postgresapp.com 下载                 | 含 GUI 的完整安装  |
| Debian/Ubuntu         | `apt install postgresql-client`                 | 仅客户端           |
| Fedora/RHEL           | `dnf install postgresql`                        | 仅客户端           |
| Arch Linux            | `pacman -S postgresql-libs`                     | 仅客户端           |
| Windows               | `winget install PostgreSQL.PostgreSQL`          | 完整安装程序       |

安装后验证：

```bash
psql --version    # 应输出：psql (PostgreSQL) 16.x
```

若 `psql` 不可用，VM 将提供回退到 SQLite 状态的选项。

---

## 概述

PostgreSQL 状态提供：

- **真正的并发写入**：行级锁允许并行分支同时写入
- **网络访问**：可从任何机器、外部工具或仪表盘查询状态
- **团队协作**：多个开发者可共享运行状态
- **丰富的 SQL**：JSONB 查询、窗口函数、CTE 用于复杂状态分析
- **高吞吐量**：处理每分钟 1000+ 次写入、数 GB 的输出
- **持久性**：基于 WAL 的恢复，支持时间点还原

**核心原则：** 数据库是灵活的共享工作空间。VM 和子 agent 通过它进行协调，外部工具可实时观察和查询执行状态。

---

## 安全警告

**⚠️ 凭据对子 agent 可见。** `OPENPROSE_POSTGRES_URL` 连接字符串会传递给派生会话，以便其写入输出。这意味着：

- 数据库凭据会出现在子 agent 上下文中，可能被记录
- 将这些凭据视为**非敏感信息**
- 为 OpenProse 使用**专用数据库**，而非你的生产系统
- 创建**权限受限的用户**，仅能访问 `openprose` schema

**推荐设置：**

```sql
-- 创建具有最小权限的专用用户
CREATE USER openprose_agent WITH PASSWORD 'changeme';
CREATE SCHEMA openprose AUTHORIZATION openprose_agent;
GRANT ALL ON SCHEMA openprose TO openprose_agent;
-- 该用户只能访问 openprose schema，不能访问其他内容
```

---

## 何时使用 PostgreSQL 状态

PostgreSQL 状态适用于有特定规模或协作需求的**高级用户**：

| 需求                          | PostgreSQL 的优势              |
| ----------------------------- | ------------------------------ |
| > 5 个并行分支同时写入        | SQLite 会锁定；PostgreSQL 不会 |
| 外部仪表盘需要查询状态        | PostgreSQL 专为并发读取设计    |
| 团队在长时间工作流上协作      | 共享网络访问；无需文件同步     |
| 输出超过 1GB                  | 批量导入；无单文件瓶颈         |
| 关键任务工作流（数小时/数天） | 强大的持久性；时间点恢复       |

**若以上情况都不适用，请使用文件系统或 SQLite 状态。** 它们更简单，足以满足 99% 的程序需求。

### 决策树

```
程序是否少于 30 条语句且没有并行块？
  是 -> 使用上下文内状态（零摩擦）
  否 -> 继续……

外部工具（仪表盘、监控、分析）是否需要查询状态？
  是 -> 使用 PostgreSQL（需要网络访问）
  否 -> 继续……

多台机器或团队成员是否需要共享访问同一运行？
  是 -> 使用 PostgreSQL（协作）
  否 -> 继续……

是否有 >5 个并发并行分支同时写入？
  是 -> 使用 PostgreSQL（并发性）
  否 -> 继续……

输出是否超过 1GB 或每分钟写入是否超过 100 次？
  是 -> 使用 PostgreSQL（规模）
  否 -> 使用文件系统（默认）或 SQLite（如果需要 SQL 查询）
```

### 并发场景

选用 PostgreSQL 的主要动机是**并行执行中的并发写入**：

- SQLite 使用表级锁：并行分支串行化
- PostgreSQL 使用行级锁：并行分支同时写入

若程序有 10 个并行分支同时完成，PostgreSQL 在写入阶段比 SQLite 快 5-10 倍。

---

## 数据库设置

### 选项 1：Docker（推荐）

启动 PostgreSQL 实例最快的方式：

```bash
docker run -d \
  --name prose-pg \
  -e POSTGRES_DB=prose \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -p 5432:5432 \
  postgres:16
```

然后配置连接：

```bash
mkdir -p .prose
echo "OPENPROSE_POSTGRES_URL=postgresql://postgres@localhost:5432/prose" > .prose/.env
```

管理命令：

```bash
docker ps | grep prose-pg    # 检查是否在运行
docker logs prose-pg         # 查看日志
docker stop prose-pg         # 停止
docker start prose-pg        # 重新启动
docker rm -f prose-pg        # 完全删除
```

### 选项 2：本地 PostgreSQL

偏好原生 PostgreSQL 的用户：

**macOS（Homebrew）：**

```bash
brew install postgresql@16
brew services start postgresql@16
createdb myproject
echo "OPENPROSE_POSTGRES_URL=postgresql://localhost/myproject" >> .prose/.env
```

**Linux（Debian/Ubuntu）：**

```bash
sudo apt install postgresql
sudo systemctl start postgresql
sudo -u postgres createdb myproject
echo "OPENPROSE_POSTGRES_URL=postgresql:///myproject" >> .prose/.env
```

### 选项 3：云端 PostgreSQL

适用于团队协作或生产环境：

| 提供商       | 免费额度          | 冷启动 | 最适合                   |
| ------------ | ----------------- | ------ | ------------------------ |
| **Neon**     | 0.5GB，自动挂起   | 1-3s   | 开发、测试               |
| **Supabase** | 500MB，无自动挂起 | 无     | 需要 auth/storage 的项目 |
| **Railway**  | $5/月额度         | 无     | 简单的生产部署           |

```bash
# 示例：Neon
echo "OPENPROSE_POSTGRES_URL=postgresql://user:pass@ep-name.us-east-2.aws.neon.tech/neondb?sslmode=require" >> .prose/.env
```

---

## 数据库位置

连接字符串存储在 `.prose/.env` 中：

```
your-project/
├── .prose/
│   ├── .env                    # OPENPROSE_POSTGRES_URL=...
│   └── runs/                   # 执行元数据和附件
│       └── {YYYYMMDD}-{HHMMSS}-{random}/
│           ├── program.prose   # 运行程序的副本
│           └── attachments/    # 大型输出（可选）
├── .gitignore                  # 应排除 .prose/.env
└── your-program.prose
```

**运行 ID 格式：** `{YYYYMMDD}-{HHMMSS}-{random6}`

示例：`20260116-143052-a7b3c9`

### 环境变量优先级

VM 按以下顺序检查：

1. `.prose/.env` 中的 `OPENPROSE_POSTGRES_URL`
2. shell 环境中的 `OPENPROSE_POSTGRES_URL`
3. shell 环境中的 `DATABASE_URL`（常见回退）

### 安全：添加到 .gitignore

```gitignore
# OpenProse 敏感文件
.prose/.env
.prose/runs/
```

---

## 职责分离

本节定义**谁负责什么**，这是 VM 与子 agent 之间的契约。

### VM 的职责

VM（运行 .prose 程序的编排 agent）负责：

| 职责              | 描述                                     |
| ----------------- | ---------------------------------------- |
| **Schema 初始化** | 在运行开始时创建 `openprose` schema 和表 |
| **运行注册**      | 存储程序源码和元数据                     |
| **执行跟踪**      | 随语句执行更新位置、状态和时间           |
| **子 agent 派生** | 通过 Task 工具派生会话并提供数据库指令   |
| **并行协调**      | 跟踪分支状态，实现汇合策略               |
| **循环管理**      | 跟踪迭代计数，评估条件                   |
| **错误聚合**      | 记录失败，管理重试状态                   |
| **上下文保存**    | 在主线程中维护足够的旁白                 |
| **完成检测**      | 在完成时将运行标记为已完成               |

**关键：** VM 必须在自己的对话中保留足够的上下文，以便在不重新读取整个数据库的情况下理解执行状态。数据库用于协调和持久化，不能替代工作记忆。

### 子 Agent 的职责

子 agent（VM 派生的会话）负责：

| 职责               | 描述                                                   |
| ------------------ | ------------------------------------------------------ |
| **写入自己的输出** | 在 `bindings` 表中插入/更新自己的绑定                  |
| **记忆管理**       | 对于持久化 agent：读取和更新自己的记忆记录             |
| **片段记录**       | 对于持久化 agent：追加片段历史                         |
| **附件处理**       | 将大型输出写入 `attachments/` 目录，在数据库中存储路径 |
| **原子写入**       | 更新多个相关记录时使用事务                             |

**关键：** 子 agent 只写入 `bindings`、`agents` 和 `agent_segments` 表。VM 完全拥有 `execution` 表。完成信号通过 substrate（Task 工具返回）发出，而非数据库更新。

**关键：** 子 agent 必须直接将输出写入数据库。VM 不写入子 agent 的输出——它只在子 agent 完成后读取它们。

**子 agent 向 VM 返回什么：** 包含绑定位置的确认消息——而非完整内容：

**根作用域：**

```
Binding written: research
Location: openprose.bindings WHERE name='research' AND run_id='20260116-143052-a7b3c9' AND execution_id IS NULL
Summary: AI safety research covering alignment, robustness, and interpretability with 15 citations.
```

**块调用内部：**

```
Binding written: result
Location: openprose.bindings WHERE name='result' AND run_id='20260116-143052-a7b3c9' AND execution_id=43
Execution ID: 43
Summary: Processed chunk into 3 sub-parts for recursive processing.
```

VM 跟踪位置而非值，这使 VM 的上下文保持精简，并支持任意大型的中间值。

### 共同关注点

| 关注点      | 由谁处理                                                         |
| ----------- | ---------------------------------------------------------------- |
| Schema 演进 | 任意一方（按需使用 `CREATE TABLE IF NOT EXISTS`、`ALTER TABLE`） |
| 自定义表    | 任意一方（扩展使用 `x_` 前缀）                                   |
| 索引        | 任意一方（为频繁查询的列添加索引）                               |
| 清理        | VM（在运行结束时，可选删除旧数据）                               |

---

## 核心 Schema

VM 使用 `openprose` schema 初始化这些表。这是**最小可行 schema**——可自由扩展。

```sql
-- 为 OpenProse 状态创建专用 schema
CREATE SCHEMA IF NOT EXISTS openprose;

-- 运行元数据
CREATE TABLE IF NOT EXISTS openprose.run (
    id TEXT PRIMARY KEY,
    program_path TEXT,
    program_source TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'failed', 'interrupted')),
    state_mode TEXT NOT NULL DEFAULT 'postgres',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 执行位置和历史
CREATE TABLE IF NOT EXISTS openprose.execution (
    id SERIAL PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES openprose.run(id) ON DELETE CASCADE,
    statement_index INTEGER NOT NULL,
    statement_text TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'skipped')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    parent_id INTEGER REFERENCES openprose.execution(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 所有命名值（input、output、let、const）
CREATE TABLE IF NOT EXISTS openprose.bindings (
    name TEXT NOT NULL,
    run_id TEXT NOT NULL REFERENCES openprose.run(id) ON DELETE CASCADE,
    execution_id INTEGER,  -- 根作用域为 NULL，块调用则非空
    kind TEXT NOT NULL CHECK (kind IN ('input', 'output', 'let', 'const')),
    value TEXT,
    source_statement TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attachment_path TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (name, run_id, COALESCE(execution_id, -1))  -- 带作用域的复合键
);

-- 持久化 agent 记忆
CREATE TABLE IF NOT EXISTS openprose.agents (
    name TEXT NOT NULL,
    run_id TEXT,  -- 项目级和用户级 agent 为 NULL
    scope TEXT NOT NULL CHECK (scope IN ('execution', 'project', 'user', 'custom')),
    memory TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (name, COALESCE(run_id, '__project__'))
);

-- Agent 调用历史
CREATE TABLE IF NOT EXISTS openprose.agent_segments (
    id SERIAL PRIMARY KEY,
    agent_name TEXT NOT NULL,
    run_id TEXT,  -- 项目级 agent 为 NULL
    segment_number INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    prompt TEXT,
    summary TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE (agent_name, COALESCE(run_id, '__project__'), segment_number)
);

-- 导入注册表
CREATE TABLE IF NOT EXISTS openprose.imports (
    alias TEXT NOT NULL,
    run_id TEXT NOT NULL REFERENCES openprose.run(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    fetched_at TIMESTAMPTZ,
    inputs_schema JSONB,
    outputs_schema JSONB,
    content_hash TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (alias, run_id)
);

-- 常用查询的索引
CREATE INDEX IF NOT EXISTS idx_execution_run_id ON openprose.execution(run_id);
CREATE INDEX IF NOT EXISTS idx_execution_status ON openprose.execution(status);
CREATE INDEX IF NOT EXISTS idx_execution_parent_id ON openprose.execution(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_execution_metadata_gin ON openprose.execution USING GIN (metadata jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_bindings_run_id ON openprose.bindings(run_id);
CREATE INDEX IF NOT EXISTS idx_bindings_execution_id ON openprose.bindings(execution_id) WHERE execution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agents_run_id ON openprose.agents(run_id) WHERE run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agents_project_scoped ON openprose.agents(name) WHERE run_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_segments_lookup ON openprose.agent_segments(agent_name, run_id);
```

### Schema 约定

- **时间戳**：使用带时区感知的 `TIMESTAMPTZ` 和 `NOW()`
- **JSON 字段**：在 `metadata` 列中使用 `JSONB` 存储结构化数据（可查询、可索引）
- **大型值**：若绑定值超过 ~100KB，写入 `attachments/{name}.md` 并存储路径
- **扩展表**：使用 `x_` 前缀（如 `x_metrics`、`x_audit_log`）
- **匿名绑定**：未显式捕获的会话使用自动生成的名称：`anon_001`、`anon_002` 等
- **导入绑定**：使用导入别名作为作用域前缀：`research.findings`、`research.sources`
- **有作用域的绑定**：使用 `execution_id` 列——根作用域为 NULL，块调用则非空

### 作用域解析查询

对于递归块，绑定有作用域限制到其执行帧。通过遍历调用栈来解析变量：

```sql
-- 在运行 '20260116-143052-a7b3c9' 中从 execution_id 43 开始查找绑定 'result'
WITH RECURSIVE scope_chain AS (
  -- 从当前执行开始
  SELECT id, parent_id FROM openprose.execution WHERE id = 43
  UNION ALL
  -- 向上追溯父级
  SELECT e.id, e.parent_id
  FROM openprose.execution e
  JOIN scope_chain s ON e.id = s.parent_id
)
SELECT b.* FROM openprose.bindings b
WHERE b.name = 'result'
  AND b.run_id = '20260116-143052-a7b3c9'
  AND (b.execution_id IN (SELECT id FROM scope_chain) OR b.execution_id IS NULL)
ORDER BY
  CASE WHEN b.execution_id IS NULL THEN 1 ELSE 0 END,  -- 优先有作用域的而非根
  b.execution_id DESC NULLS LAST  -- 优先更深（更本地）的作用域
LIMIT 1;
```

**若已知作用域链的简化版本：**

```sql
-- 直接查找：依次检查当前作用域（43）、父级（42）、根（NULL）
SELECT * FROM openprose.bindings
WHERE name = 'result'
  AND run_id = '20260116-143052-a7b3c9'
  AND (execution_id = 43 OR execution_id = 42 OR execution_id IS NULL)
ORDER BY execution_id DESC NULLS LAST
LIMIT 1;
```

---

## 数据库交互

VM 和子 agent 都通过 `psql` CLI 进行交互。

### 来自 VM

```bash
# 初始化 schema
psql "$OPENPROSE_POSTGRES_URL" -f schema.sql

# 注册新运行
psql "$OPENPROSE_POSTGRES_URL" -c "
  INSERT INTO openprose.run (id, program_path, program_source, status)
  VALUES ('20260116-143052-a7b3c9', '/path/to/program.prose', 'program source...', 'running')
"

# 更新执行位置
psql "$OPENPROSE_POSTGRES_URL" -c "
  INSERT INTO openprose.execution (run_id, statement_index, statement_text, status, started_at)
  VALUES ('20260116-143052-a7b3c9', 3, 'session \"Research AI safety\"', 'executing', NOW())
"

# 读取绑定
psql "$OPENPROSE_POSTGRES_URL" -t -A -c "
  SELECT value FROM openprose.bindings WHERE name = 'research' AND run_id = '20260116-143052-a7b3c9'
"

# 检查并行分支状态
psql "$OPENPROSE_POSTGRES_URL" -c "
  SELECT metadata->>'branch' AS branch, status FROM openprose.execution
  WHERE run_id = '20260116-143052-a7b3c9' AND metadata->>'parallel_id' = 'p1'
"
```

### 来自子 Agent

VM 在派生会话时提供数据库路径和指令：

**根作用域（块调用外部）：**

```
Your output goes to PostgreSQL state.

| Property | Value |
|----------|-------|
| Connection | `postgresql://user:***@host:5432/db` |
| Schema | `openprose` |
| Run ID | `20260116-143052-a7b3c9` |
| Binding | `research` |
| Execution ID | (root scope) |

When complete, write your output:

psql "$OPENPROSE_POSTGRES_URL" -c "
  INSERT INTO openprose.bindings (name, run_id, execution_id, kind, value, source_statement)
  VALUES (
    'research',
    '20260116-143052-a7b3c9',
    NULL,  -- root scope
    'let',
    E'AI safety research covers alignment, robustness...',
    'let research = session: researcher'
  )
  ON CONFLICT (name, run_id, COALESCE(execution_id, -1)) DO UPDATE
  SET value = EXCLUDED.value, updated_at = NOW()
"
```

**块调用内部（包含 execution_id）：**

```
Your output goes to PostgreSQL state.

| Property | Value |
|----------|-------|
| Connection | `postgresql://user:***@host:5432/db` |
| Schema | `openprose` |
| Run ID | `20260116-143052-a7b3c9` |
| Binding | `result` |
| Execution ID | `43` |
| Block | `process` |
| Depth | `3` |

When complete, write your output:

psql "$OPENPROSE_POSTGRES_URL" -c "
  INSERT INTO openprose.bindings (name, run_id, execution_id, kind, value, source_statement)
  VALUES (
    'result',
    '20260116-143052-a7b3c9',
    43,  -- scoped to this execution
    'let',
    E'Processed chunk into 3 sub-parts...',
    'let result = session \"Process chunk\"'
  )
  ON CONFLICT (name, run_id, COALESCE(execution_id, -1)) DO UPDATE
  SET value = EXCLUDED.value, updated_at = NOW()
"
```

对于持久化 agent（执行级）：

```
Your memory is in the database:

Read your current state:
  psql "$OPENPROSE_POSTGRES_URL" -t -A -c "SELECT memory FROM openprose.agents WHERE name = 'captain' AND run_id = '20260116-143052-a7b3c9'"

Update when done:
  psql "$OPENPROSE_POSTGRES_URL" -c "UPDATE openprose.agents SET memory = '...', updated_at = NOW() WHERE name = 'captain' AND run_id = '20260116-143052-a7b3c9'"

Record this segment:
  psql "$OPENPROSE_POSTGRES_URL" -c "INSERT INTO openprose.agent_segments (agent_name, run_id, segment_number, prompt, summary) VALUES ('captain', '20260116-143052-a7b3c9', 3, '...', '...')"
```

对于项目级 agent，在查询中使用 `run_id IS NULL`：

```sql
-- 读取项目级 agent 记忆
SELECT memory FROM openprose.agents WHERE name = 'advisor' AND run_id IS NULL;

-- 更新项目级 agent 记忆
UPDATE openprose.agents SET memory = '...' WHERE name = 'advisor' AND run_id IS NULL;
```

---

## 主线程的上下文保存

**这一点至关重要。** 数据库用于持久化和协调，但 VM 仍必须维护对话上下文。

### VM 必须旁白的内容

即使使用 PostgreSQL 状态，VM 也应在对话中旁白关键事件：

```
[Position] Statement 3: let research = session: researcher
   Spawning session, will write to state database
   [Task tool call]
[Success] Session complete, binding written to DB
[Binding] research = <stored in openprose.bindings>
```

### 为何两者都需要？

| 目的              | 机制                                            |
| ----------------- | ----------------------------------------------- |
| **工作记忆**      | 对话旁白（VM 无需重新查询即能"记住"的内容）     |
| **持久状态**      | PostgreSQL 数据库（跨上下文限制存活，支持恢复） |
| **子 agent 协调** | PostgreSQL 数据库（共享访问点）                 |
| **调试/检查**     | PostgreSQL 数据库（可查询历史）                 |

旁白是 VM 对执行的"心理模型"，数据库是用于恢复和检查的"真实来源"。

---

## 并行执行

对于并行块，VM 使用 `metadata` JSONB 字段跟踪分支。**只有 VM 写入 `execution` 表。**

```sql
-- VM 标记并行开始
INSERT INTO openprose.execution (run_id, statement_index, statement_text, status, started_at, metadata)
VALUES ('20260116-143052-a7b3c9', 5, 'parallel:', 'executing', NOW(),
  '{"parallel_id": "p1", "strategy": "all", "branches": ["a", "b", "c"]}'::jsonb)
RETURNING id;  -- 保存为 parent_id（如 42）

-- VM 为每个分支创建执行记录
INSERT INTO openprose.execution (run_id, statement_index, statement_text, status, started_at, parent_id, metadata)
VALUES
  ('20260116-143052-a7b3c9', 6, 'a = session "Task A"', 'executing', NOW(), 42, '{"parallel_id": "p1", "branch": "a"}'::jsonb),
  ('20260116-143052-a7b3c9', 7, 'b = session "Task B"', 'executing', NOW(), 42, '{"parallel_id": "p1", "branch": "b"}'::jsonb),
  ('20260116-143052-a7b3c9', 8, 'c = session "Task C"', 'executing', NOW(), 42, '{"parallel_id": "p1", "branch": "c"}'::jsonb);

-- 子 agent 将输出写入 bindings 表（见"来自子 Agent"部分）
-- Task 工具通过 substrate 向 VM 发出完成信号

-- Task 返回后，VM 将分支标记为完成
UPDATE openprose.execution SET status = 'completed', completed_at = NOW()
WHERE run_id = '20260116-143052-a7b3c9' AND metadata->>'parallel_id' = 'p1' AND metadata->>'branch' = 'a';

-- VM 检查所有分支是否完成
SELECT COUNT(*) AS pending FROM openprose.execution
WHERE run_id = '20260116-143052-a7b3c9'
  AND metadata->>'parallel_id' = 'p1'
  AND parent_id IS NOT NULL
  AND status NOT IN ('completed', 'failed', 'skipped');
```

### 并发优势

每个子 agent 写入 `openprose.bindings` 中的不同行。PostgreSQL 的行级锁意味着**无阻塞**：

```
SQLite（表级锁）：
  分支 1 写入 -------|
                     分支 2 等待 ------|
                                       分支 3 等待 -----|
  总时间：3 * write_time（串行）

PostgreSQL（行级锁）：
  分支 1 写入  --|
  分支 2 写入  --|  （并发）
  分支 3 写入  --|
  总时间：~1 * write_time（并行）
```

---

## 循环跟踪

```sql
-- 循环元数据跟踪迭代状态
INSERT INTO openprose.execution (run_id, statement_index, statement_text, status, started_at, metadata)
VALUES ('20260116-143052-a7b3c9', 10, 'loop until **analysis complete** (max: 5):', 'executing', NOW(),
  '{"loop_id": "l1", "max_iterations": 5, "current_iteration": 0, "condition": "**analysis complete**"}'::jsonb);

-- 更新迭代
UPDATE openprose.execution
SET metadata = jsonb_set(metadata, '{current_iteration}', '2')
WHERE run_id = '20260116-143052-a7b3c9' AND metadata->>'loop_id' = 'l1' AND parent_id IS NULL;
```

---

## 错误处理

```sql
-- 记录失败
UPDATE openprose.execution
SET status = 'failed',
    error_message = 'Connection timeout after 30s',
    completed_at = NOW()
WHERE id = 15;

-- 在元数据中跟踪重试次数
UPDATE openprose.execution
SET metadata = jsonb_set(jsonb_set(metadata, '{retry_attempt}', '2'), '{max_retries}', '3')
WHERE id = 15;

-- 将运行标记为失败
UPDATE openprose.run SET status = 'failed' WHERE id = '20260116-143052-a7b3c9';
```

---

## 项目级和用户级 Agent

执行级 agent（默认）使用 `run_id = 具体值`。**项目级 agent**（`persist: project`）和**用户级 agent**（`persist: user`）使用 `run_id IS NULL`，跨运行保留。

对于用户级 agent，VM 维护独立连接或使用命名约定在同一数据库中区分它们。一种方式是在同一数据库中为用户级 agent 名称添加 `__user__` 前缀，或使用通过 `OPENPROSE_POSTGRES_USER_URL` 配置的独立用户级数据库。

### run_id 方案

主键中的 `COALESCE` 技巧允许在同一张表中同时存储两种作用域：

```sql
PRIMARY KEY (name, COALESCE(run_id, '__project__'))
```

这意味着：

- `name='advisor', run_id=NULL` 的主键为 `('advisor', '__project__')`
- `name='advisor', run_id='20260116-143052-a7b3c9'` 的主键为 `('advisor', '20260116-143052-a7b3c9')`

同一 agent 名称可以同时作为项目级和执行级存在，不会冲突。

### 查询模式

| 作用域 | 查询                                             |
| ------ | ------------------------------------------------ |
| 执行级 | `WHERE name = 'captain' AND run_id = '{RUN_ID}'` |
| 项目级 | `WHERE name = 'advisor' AND run_id IS NULL`      |

### 项目级记忆指南

项目级 agent 应存储可积累的通用知识：

**应存储：** 用户偏好、项目上下文、已学习的模式、决策依据
**不应存储：** 特定运行的细节、时效性信息、大型数据

### Agent 清理

- **执行级：** 运行完成或保留期后可删除
- **项目级：** 仅在用户明确请求时删除

```sql
-- 删除已完成运行的执行级 agent
DELETE FROM openprose.agents WHERE run_id = '20260116-143052-a7b3c9';

-- 删除特定项目级 agent（用户发起）
DELETE FROM openprose.agents WHERE name = 'old_advisor' AND run_id IS NULL;
```

---

## 大型输出

当绑定值对于数据库存储来说过大（>100KB）时：

1. 将内容写入 `attachments/{binding_name}.md`
2. 在 `attachment_path` 列中存储路径
3. 将 `value` 留为摘要

```sql
INSERT INTO openprose.bindings (name, run_id, kind, value, attachment_path, source_statement)
VALUES (
  'full_report',
  '20260116-143052-a7b3c9',
  'let',
  'Full analysis report (847KB) - see attachment',
  'attachments/full_report.md',
  'let full_report = session "Generate comprehensive report"'
)
ON CONFLICT (name, run_id) DO UPDATE
SET value = EXCLUDED.value, attachment_path = EXCLUDED.attachment_path, updated_at = NOW();
```

---

## 恢复执行

若要恢复被中断的运行：

```sql
-- 查找当前位置
SELECT statement_index, statement_text, status
FROM openprose.execution
WHERE run_id = '20260116-143052-a7b3c9' AND status = 'executing'
ORDER BY id DESC LIMIT 1;

-- 获取所有已完成的绑定
SELECT name, kind, value, attachment_path FROM openprose.bindings
WHERE run_id = '20260116-143052-a7b3c9';

-- 获取 agent 记忆状态
SELECT name, scope, memory FROM openprose.agents
WHERE run_id = '20260116-143052-a7b3c9' OR run_id IS NULL;

-- 检查并行块状态
SELECT metadata->>'branch' AS branch, status
FROM openprose.execution
WHERE run_id = '20260116-143052-a7b3c9'
  AND metadata->>'parallel_id' IS NOT NULL
  AND parent_id IS NOT NULL;
```

---

## 灵活性鼓励

PostgreSQL 状态故意**灵活**。核心 schema 只是起点。鼓励你：

- 按需**添加列**到现有表
- **创建扩展表**（使用 `x_` 前缀）
- **存储自定义指标**（时间、token 数量、模型信息）
- 为你的查询模式**构建索引**
- 使用 **JSONB 操作符**进行半结构化数据查询

扩展示例：

```sql
-- 自定义指标表
CREATE TABLE IF NOT EXISTS openprose.x_metrics (
    id SERIAL PRIMARY KEY,
    run_id TEXT REFERENCES openprose.run(id) ON DELETE CASCADE,
    execution_id INTEGER REFERENCES openprose.execution(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 添加自定义列
ALTER TABLE openprose.bindings ADD COLUMN IF NOT EXISTS token_count INTEGER;

-- 为常用查询创建索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bindings_created ON openprose.bindings(created_at);
```

数据库是你的工作空间，尽情使用。

---

## 与其他模式的比较

| 方面              | filesystem.md            | in-context.md    | sqlite.md                   | postgres.md           |
| ----------------- | ------------------------ | ---------------- | --------------------------- | --------------------- |
| **状态位置**      | `.prose/runs/{id}/` 文件 | 对话历史         | `.prose/runs/{id}/state.db` | PostgreSQL 数据库     |
| **可查询**        | 通过文件读取             | 否               | 是（SQL）                   | 是（SQL）             |
| **原子更新**      | 否                       | N/A              | 是（事务）                  | 是（ACID）            |
| **并发写入**      | 是（不同文件）           | N/A              | **否（表级锁）**            | **是（行级锁）**      |
| **网络访问**      | 否                       | 否               | 否                          | **是**                |
| **团队协作**      | 通过文件同步             | 否               | 通过文件同步                | **是**                |
| **schema 灵活性** | 固定文件结构             | N/A              | 灵活                        | 非常灵活（JSONB）     |
| **恢复**          | 读取 state.md            | 重读对话         | 查询数据库                  | 查询数据库            |
| **复杂度上限**    | 高                       | 低（<30 条语句） | 高                          | **非常高**            |
| **依赖**          | 无                       | 无               | sqlite3 CLI                 | psql CLI + PostgreSQL |
| **设置难度**      | 零                       | 零               | 低                          | 中-高                 |
| **状态**          | 稳定                     | 稳定             | 实验性                      | **实验性**            |

---

## 小结

PostgreSQL 状态管理：

1. 使用**共享 PostgreSQL 数据库**管理所有运行
2. 通过行级锁提供**真正的并发写入**
3. 为外部工具和仪表盘提供**网络访问**
4. 支持在共享运行状态上的**团队协作**
5. 通过 JSONB 和自定义表允许**灵活的 schema 演进**
6. 需要 **psql CLI** 和运行中的 PostgreSQL 服务器
7. 是**实验性**功能——预期会有变化

核心契约：VM 管理执行流程并派生子 agent；子 agent 直接将自己的输出写入数据库。完成信号通过 Task 工具返回发出，而非数据库更新。外部工具可实时查询执行状态。

**PostgreSQL 状态适用于高级用户。** 若不需要并发写入、网络访问或团队协作，文件系统或 SQLite 状态将更简单且足够满足需求。
