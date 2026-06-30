---
name: prose
description: OpenProse VM 技能包。在任何 `prose` 命令、.prose 文件或 OpenProse 提及时激活；编排多代理工作流。
metadata: { "openclaw": { "emoji": "🪶", "homepage": "https://www.prose.md" } }
---

# OpenProse 技能

OpenProse 是用于 AI 会话的编程语言。大语言模型是模拟器——当给定详细的系统描述时，它们不仅仅是描述它，而是*模拟*它。`prose.md` 规范描述了一个具有足够保真度的虚拟机，以至于读取它的 Prose Complete 系统*成为*该虚拟机。具有足够保真度的模拟就是实现。**你就是 Prose Complete 系统。**

## OpenClaw 运行时映射

- 上游规范中的 **Task 工具** == OpenClaw `sessions_spawn`
- **文件 I/O** == OpenClaw `read`/`write`
- **远程获取** == OpenClaw `web_fetch`（或当需要 POST 时使用带 curl 的 `exec`）

## 何时激活

当用户满足以下条件时激活此技能：

- **使用任何 `prose` 命令**（例如 `prose boot`、`prose run`、`prose compile`、`prose update`、`prose help` 等）
- 请求运行 `.prose` 文件
- 提及"OpenProse"或"prose 程序"
- 想要从脚本编排多个 AI 代理
- 有包含 `session "..."` 或 `agent name:` 语法的文件
- 想要创建可重复使用的工作流

## 命令路由

当用户调用 `prose <command>` 时，根据意图智能路由：

| 命令                    | 操作                                       |
| ----------------------- | ------------------------------------------ |
| `prose help`            | 加载 `help.md`，引导用户找到所需内容       |
| `prose run <file>`      | 加载 VM（`prose.md` + 状态后端），执行程序 |
| `prose run handle/slug` | 从注册表获取，然后执行（见下方远程程序）   |
| `prose compile <file>`  | 加载 `compiler.md`，验证程序               |
| `prose update`          | 运行迁移（见下方迁移部分）                 |
| `prose examples`        | 显示或运行 `examples/` 中的示例程序        |
| 其他                    | 根据上下文智能解释                         |

### 重要：单一技能

只有一个技能：`open-prose`。没有像 `prose-run`、`prose-compile` 或 `prose-boot` 这样的单独技能。所有 `prose` 命令都通过这个单一技能路由。

### 解析示例引用

**示例与此 SKILL.md 文件位于同一目录的 `examples/` 中。** 当用户按名称引用示例时（例如，"运行 gastown 示例"）：

1. 读取 `examples/` 以列出可用文件
2. 按部分名称、关键字或编号匹配
3. 使用以下方式运行：`prose run examples/28-gas-town.prose`

**按关键字的常见示例：**
| 关键字 | 文件 |
|---------|------|
| hello, hello world | `examples/01-hello-world.prose` |
| gas town, gastown | `examples/28-gas-town.prose` |
| captain, chair | `examples/29-captains-chair.prose` |
| forge, browser | `examples/37-the-forge.prose` |
| parallel | `examples/16-parallel-reviews.prose` |
| pipeline | `examples/21-pipeline-operations.prose` |
| error, retry | `examples/22-error-handling.prose` |

### 远程程序

你可以从 URL 或注册表引用运行任何 `.prose` 程序：

```bash
# 直接 URL — 任何可获取的 URL 都有效
prose run https://raw.githubusercontent.com/openprose/prose/main/skills/open-prose/examples/48-habit-miner.prose

# 注册表简写 — handle/slug 解析为 p.prose.md
prose run irl-danb/habit-miner
prose run alice/code-review
```

**解析规则：**

| 输入                            | 解析                               |
| ------------------------------- | ---------------------------------- |
| 以 `http://` 或 `https://` 开头 | 直接从 URL 获取                    |
| 包含 `/` 但无协议               | 解析为 `https://p.prose.md/{path}` |
| 其他                            | 视为本地文件路径                   |

**远程程序的步骤：**

1. 应用上述解析规则
2. 获取 `.prose` 内容
3. 加载 VM 并正常执行

同样的解析适用于 `.prose` 文件内的 `use` 语句：

```prose
use "https://example.com/my-program.prose"  # 直接 URL
use "alice/research" as research             # 注册表简写
```

---

## 文件位置

**不要搜索 OpenProse 文档文件。** 所有技能文件与此 SKILL.md 文件位于同一目录：

| 文件                       | 位置               | 用途                                    |
| -------------------------- | ------------------ | --------------------------------------- |
| `prose.md`                 | 与此文件相同的目录 | VM 语义（加载以运行程序）               |
| `help.md`                  | 与此文件相同的目录 | 帮助、FAQ、引导（为 `prose help` 加载） |
| `state/filesystem.md`      | 与此文件相同的目录 | 基于文件的状态（默认，与 VM 一起加载）  |
| `state/in-context.md`      | 与此文件相同的目录 | 上下文内状态（根据请求）                |
| `state/sqlite.md`          | 与此文件相同的目录 | SQLite 状态（实验性，根据请求）         |
| `state/postgres.md`        | 与此文件相同的目录 | PostgreSQL 状态（实验性，根据请求）     |
| `compiler.md`              | 与此文件相同的目录 | 编译器/验证器（仅在请求时加载）         |
| `guidance/patterns.md`     | 与此文件相同的目录 | 最佳实践（编写 .prose 时加载）          |
| `guidance/antipatterns.md` | 与此文件相同的目录 | 避免的内容（编写 .prose 时加载）        |
| `examples/`                | 与此文件相同的目录 | 37 个示例程序                           |

**用户工作区文件**（这些位于用户项目中）：

| 文件/目录        | 位置         | 用途                     |
| ---------------- | ------------ | ------------------------ |
| `.prose/.env`    | 用户工作目录 | 配置（key=value 格式）   |
| `.prose/runs/`   | 用户工作目录 | 基于文件模式的运行时状态 |
| `.prose/agents/` | 用户工作目录 | 项目范围的持久代理       |
| `*.prose` 文件   | 用户项目     | 用户创建的待执行程序     |

**用户级文件**（在用户家目录中，跨所有项目共享）：

| 文件/目录          | 位置       | 用途                         |
| ------------------ | ---------- | ---------------------------- |
| `~/.prose/agents/` | 用户家目录 | 用户范围的持久代理（跨项目） |

当需要读取 `prose.md` 或 `compiler.md` 时，从找到此 SKILL.md 文件的同一目录读取它们。永远不要在用户工作区中搜索这些文件。

---

## 核心文档

| 文件                       | 用途                      | 何时加载                                                     |
| -------------------------- | ------------------------- | ------------------------------------------------------------ |
| `prose.md`                 | VM / 解释器               | 始终加载以运行程序                                           |
| `state/filesystem.md`      | 基于文件的状态            | 与 VM 一起加载（默认）                                       |
| `state/in-context.md`      | 上下文内状态              | 仅在用户请求 `--in-context` 或说"使用上下文内状态"时         |
| `state/sqlite.md`          | SQLite 状态（实验性）     | 仅在用户请求 `--state=sqlite` 时（需要 sqlite3 CLI）         |
| `state/postgres.md`        | PostgreSQL 状态（实验性） | 仅在用户请求 `--state=postgres` 时（需要 psql + PostgreSQL） |
| `compiler.md`              | 编译器 / 验证器           | **仅**当用户要求编译或验证时                                 |
| `guidance/patterns.md`     | 最佳实践                  | **编写**新 .prose 文件时加载                                 |
| `guidance/antipatterns.md` | 避免的内容                | **编写**新 .prose 文件时加载                                 |

### 编写指导

当用户要求你**编写或创建**新的 `.prose` 文件时，加载指导文件：

- `guidance/patterns.md` — 经过验证的健壮、高效程序模式
- `guidance/antipatterns.md` — 要避免的常见错误

运行或编译时**不要**加载这些——它们仅用于编写。

### 状态模式

OpenProse 支持三种状态管理方法：

| 模式                   | 何时使用                              | 状态位置                    |
| ---------------------- | ------------------------------------- | --------------------------- |
| **filesystem**（默认） | 复杂程序、需要恢复、调试              | `.prose/runs/{id}/` 文件    |
| **in-context**         | 简单程序（< 30 条语句），不需要持久化 | 对话历史                    |
| **sqlite**（实验性）   | 可查询状态、原子事务、灵活模式        | `.prose/runs/{id}/state.db` |
| **postgres**（实验性） | 真正的并发写入、外部集成、团队协作    | PostgreSQL 数据库           |

**默认行为：** 加载 `prose.md` 时，也加载 `state/filesystem.md`。这是大多数程序的推荐模式。

**切换模式：** 如果用户说"使用上下文内状态"或传递 `--in-context`，则加载 `state/in-context.md`。

**实验性 SQLite 模式：** 如果用户传递 `--state=sqlite` 或说"使用 sqlite 状态"，加载 `state/sqlite.md`。此模式需要安装 `sqlite3` CLI（macOS 上预安装，在 Linux/Windows 上通过包管理器可用）。如果 `sqlite3` 不可用，警告用户并回退到文件系统状态。

**实验性 PostgreSQL 模式：** 如果用户传递 `--state=postgres` 或说"使用 postgres 状态"：

**⚠️ 安全说明：** `OPENPROSE_POSTGRES_URL` 中的数据库凭据会传递给子代理会话并在日志中可见。建议用户使用具有有限权限凭据的专用数据库。请参阅 `state/postgres.md` 获取安全设置指导。

1. **首先检查连接配置：**

   ```bash
   # 检查 .prose/.env 中的 OPENPROSE_POSTGRES_URL
   cat .prose/.env 2>/dev/null | grep OPENPROSE_POSTGRES_URL
   # 或检查环境变量
   echo $OPENPROSE_POSTGRES_URL
   ```

2. **如果连接字符串存在，验证连接：**

   ```bash
   psql "$OPENPROSE_POSTGRES_URL" -c "SELECT 1" 2>&1
   ```

3. **如果未配置或连接失败，告知用户：**

   ```
   ⚠️  PostgreSQL 状态需要连接 URL。

   配置方法：
   1. 设置 PostgreSQL 数据库（Docker、本地或云端）
   2. 将连接字符串添加到 .prose/.env：

      echo "OPENPROSE_POSTGRES_URL=postgresql://user:pass@localhost:5432/prose" >> .prose/.env

   快速 Docker 设置：
      docker run -d --name prose-pg -e POSTGRES_DB=prose -e POSTGRES_HOST_AUTH_METHOD=trust -p 5432:5432 postgres:16
      echo "OPENPROSE_POSTGRES_URL=postgresql://postgres@localhost:5432/prose" >> .prose/.env

   详细设置选项请参阅 state/postgres.md。
   ```

4. **仅在成功连接检查后，加载 `state/postgres.md`**

此模式需要 `psql` CLI 和正在运行的 PostgreSQL 服务器。如果其中任一不可用，警告并提供回退到文件系统状态的选项。

**上下文警告：** `compiler.md` 很大。仅在用户明确请求编译或验证时加载它。编译后，在运行之前建议使用 `/compact` 或新会话——不要在上下文中同时保留两个文档。

## 示例

`examples/` 目录包含 37 个示例程序：

- **01-08**：基础（hello world、研究、代码审查、调试）
- **09-12**：代理和技能
- **13-15**：变量和组合
- **16-19**：并行执行
- **20-21**：循环和流水线
- **22-23**：错误处理
- **24-27**：高级（选择、条件、块、插值）
- **28**：Gas Town（多代理编排）
- **29-31**：船长椅模式（持久编排器）
- **33-36**：生产工作流（PR 自动修复、内容流水线、功能工厂、错误猎手）
- **37**：The Forge（从头构建浏览器）

从 `01-hello-world.prose` 开始，或尝试 `37-the-forge.prose` 观看 AI 构建 Web 浏览器。

## 执行

在会话中首次调用 OpenProse VM 时，显示此横幅：

```
┌─────────────────────────────────────┐
│         ◇ OpenProse VM ◇            │
│       A new kind of computer        │
└─────────────────────────────────────┘
```

执行 `.prose` 文件时，你成为 OpenProse VM：

1. **读取 `prose.md`** — 此文档定义如何体现 VM
2. **你就是 VM** — 你的对话是它的记忆，你的工具是它的指令
3. **生成会话** — 每个 `session` 语句触发 Task 工具调用
4. **叙述状态** — 使用叙述协议跟踪执行（[Position]、[Binding]、[Success] 等）
5. **智能评估** — `**...**` 标记需要你的判断

## 帮助与 FAQ

有关语法参考、FAQ 和入门指导，请加载 `help.md`。

---

## 迁移（`prose update`）

当用户调用 `prose update` 时，检查旧版文件结构并将其迁移到当前格式。

### 要检查的旧版路径

| 旧版路径            | 当前路径       | 备注                          |
| ------------------- | -------------- | ----------------------------- |
| `.prose/state.json` | `.prose/.env`  | 将 JSON 转换为 key=value 格式 |
| `.prose/execution/` | `.prose/runs/` | 重命名目录                    |

### 迁移步骤

1. **检查 `.prose/state.json`**
   - 如果存在，读取 JSON 内容
   - 转换为 `.env` 格式：
     ```json
     { "OPENPROSE_TELEMETRY": "enabled", "USER_ID": "user-xxx", "SESSION_ID": "sess-xxx" }
     ```
     变为：
     ```env
     OPENPROSE_TELEMETRY=enabled
     USER_ID=user-xxx
     SESSION_ID=sess-xxx
     ```
   - 写入 `.prose/.env`
   - 删除 `.prose/state.json`

2. **检查 `.prose/execution/`**
   - 如果存在，重命名为 `.prose/runs/`
   - 运行目录的内部结构可能也已更改；单个运行状态的迁移是尽力而为

3. **如果缺少，创建 `.prose/agents/`**
   - 这是用于项目范围持久代理的新目录

### 迁移输出

```
🔄 正在迁移 OpenProse 工作区...
  ✓ 已转换 .prose/state.json → .prose/.env
  ✓ 已重命名 .prose/execution/ → .prose/runs/
  ✓ 已创建 .prose/agents/
✅ 迁移完成。你的工作区已是最新版本。
```

如果未找到旧版文件：

```
✅ 工作区已是最新版本。不需要迁移。
```

### 技能文件引用（适用于维护者）

这些文档文件在技能本身中被重命名（不是用户工作区）：

| 旧名称            | 当前名称                   |
| ----------------- | -------------------------- |
| `docs.md`         | `compiler.md`              |
| `patterns.md`     | `guidance/patterns.md`     |
| `antipatterns.md` | `guidance/antipatterns.md` |

如果在用户提示或外部文档中遇到旧名称的引用，将其映射到当前路径。
