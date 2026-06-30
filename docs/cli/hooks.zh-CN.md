---
summary: "`openclaw hooks` 的 CLI 参考（agent 钩子）"
read_when:
  - 你想管理 agent 钩子
  - 你想检查钩子可用性或启用工作区钩子
title: "Hooks"
---

# `openclaw hooks`

管理 agent 钩子（用于 `/new`、`/reset` 和 gateway 启动等命令的事件驱动自动化）。

不带子命令运行 `openclaw hooks` 等同于 `openclaw hooks list`。

相关：

- 钩子：[Hooks](/automation/hooks)
- 插件钩子：[Plugin hooks](/plugins/hooks)

## 列出所有钩子

```bash
openclaw hooks list
```

列出从工作区、托管、额外和捆绑目录中发现的所有钩子。
Gateway 启动不会加载内部钩子处理器，除非至少配置了一个内部钩子。

**选项：**

- `--eligible`：仅显示符合条件的钩子（满足要求）
- `--json`：以 JSON 格式输出
- `-v, --verbose`：显示包括缺少要求的详细信息

**示例输出：**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - Run BOOT.md on gateway startup
  📎 bootstrap-extra-files ✓ - Inject extra workspace bootstrap files during agent bootstrap
  📝 command-logger ✓ - Log all command events to a centralized audit file
  💾 session-memory ✓ - Save session context to memory when /new or /reset command is issued
```

**示例（详细）：**

```bash
openclaw hooks list --verbose
```

显示不符合条件的钩子缺少的要求。

**示例（JSON）：**

```bash
openclaw hooks list --json
```

返回结构化 JSON 用于程序化使用。

## 获取钩子信息

```bash
openclaw hooks info <name>
```

显示特定钩子的详细信息。

**参数：**

- `<name>`：钩子名称或钩子键（例如 `session-memory`）

**选项：**

- `--json`：以 JSON 格式输出

**示例：**

```bash
openclaw hooks info session-memory
```

**输出：**

```
💾 session-memory ✓ Ready

Save session context to memory when /new or /reset command is issued

Details:
  Source: openclaw-bundled
  Path: /path/to/openclaw/hooks/bundled/session-memory/HOOK.md
  Handler: /path/to/openclaw/hooks/bundled/session-memory/handler.ts
  Homepage: https://docs.openclaw.ai/automation/hooks#session-memory
  Events: command:new, command:reset

Requirements:
  Config: ✓ workspace.dir
```

## 检查钩子资格

```bash
openclaw hooks check
```

显示钩子资格状态摘要（就绪数量与未就绪数量）。

**选项：**

- `--json`：以 JSON 格式输出

**示例输出：**

```
Hooks Status

Total hooks: 4
Ready: 4
Not ready: 0
```

## 启用钩子

```bash
openclaw hooks enable <name>
```

通过将其添加到配置（默认为 `~/.openclaw/openclaw.json`）来启用特定钩子。

**注意：** 工作区钩子默认禁用，直到在此处或在配置中启用。由插件管理的钩子在 `openclaw hooks list` 中显示 `plugin:<id>`，不能在此处启用/禁用。请改为启用/禁用插件。

**参数：**

- `<name>`：钩子名称（例如 `session-memory`）

**示例：**

```bash
openclaw hooks enable session-memory
```

**输出：**

```
✓ Enabled hook: 💾 session-memory
```

**它做什么：**

- 检查钩子是否存在且符合条件
- 在配置中更新 `hooks.internal.entries.<name>.enabled = true`
- 将配置保存到磁盘

如果钩子来自 `<workspace>/hooks/`，在 Gateway 加载它之前需要此选择加入步骤。

**启用后：**

- 重启 gateway 以便钩子重新加载（macOS 上的菜单栏应用重启，或在开发中重启你的 gateway 进程）。

## 禁用钩子

```bash
openclaw hooks disable <name>
```

通过更新配置来禁用特定钩子。

**参数：**

- `<name>`：钩子名称（例如 `command-logger`）

**示例：**

```bash
openclaw hooks disable command-logger
```

**输出：**

```
⏸ Disabled hook: 📝 command-logger
```

**禁用后：**

- 重启 gateway 以便钩子重新加载

## 备注

- `openclaw hooks list --json`、`info --json` 和 `check --json` 直接将结构化 JSON 写入 stdout。
- 插件管理的钩子不能在此处启用或禁用；请改为启用或禁用拥有该钩子的插件。

## 安装钩子包

```bash
openclaw plugins install <package>        # 默认为 npm
openclaw plugins install npm:<package>    # 仅 npm
openclaw plugins install <package> --pin  # 固定版本
openclaw plugins install <path>           # 本地路径
```

通过统一的插件安装程序安装钩子包。

`openclaw hooks install` 作为兼容性别名仍然有效，但它打印弃用警告并转发到 `openclaw plugins install`。

Npm 规格仅限**注册表**（包名 + 可选的**精确版本**或**分发标签**）。Git/URL/文件规格和 semver 范围被拒绝。为了安全，依赖安装以 `--ignore-scripts` 在项目本地运行，即使你的 shell 有全局 npm 安装设置。

裸规格和 `@latest` 保持在稳定轨道上。如果 npm 将这两者中的任何一个解析为预发布版本，OpenClaw 会停止并要求你用预发布标签（如 `@beta`/`@rc`）或精确的预发布版本明确选择加入。

**它做什么：**

- 将钩子包复制到 `~/.openclaw/hooks/<id>`
- 在 `hooks.internal.entries.*` 中启用已安装的钩子
- 在 `hooks.internal.installs` 下记录安装

**选项：**

- `-l, --link`：链接本地目录而不是复制（将其添加到 `hooks.internal.load.extraDirs`）
- `--pin`：将 npm 安装记录为 `hooks.internal.installs` 中精确已解析的 `name@version`

**支持的存档：** `.zip`、`.tgz`、`.tar.gz`、`.tar`

**示例：**

```bash
# 本地目录
openclaw plugins install ./my-hook-pack

# 本地存档
openclaw plugins install ./my-hook-pack.zip

# NPM 包
openclaw plugins install @openclaw/my-hook-pack

# 链接本地目录而不复制
openclaw plugins install -l ./my-hook-pack
```

链接的钩子包被视为来自操作员配置目录的托管钩子，而不是工作区钩子。

## 更新钩子包

```bash
openclaw plugins update <id>
openclaw plugins update --all
```

通过统一的插件更新程序更新被跟踪的基于 npm 的钩子包。

`openclaw hooks update` 作为兼容性别名仍然有效，但它打印弃用警告并转发到 `openclaw plugins update`。

**选项：**

- `--all`：更新所有被跟踪的钩子包
- `--dry-run`：显示会更改的内容而不写入

当存储的完整性哈希存在且获取的工件哈希发生变化时，OpenClaw 打印警告并在继续之前请求确认。在 CI/非交互式运行中使用全局 `--yes` 跳过提示。

## 捆绑钩子

### session-memory

当你发出 `/new` 或 `/reset` 时将会话上下文保存到记忆中。

**启用：**

```bash
openclaw hooks enable session-memory
```

**输出：** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**参见：** [session-memory 文档](/automation/hooks#session-memory)

### bootstrap-extra-files

在 `agent:bootstrap` 期间注入额外的引导文件（例如 monorepo 本地的 `AGENTS.md` / `TOOLS.md`）。

**启用：**

```bash
openclaw hooks enable bootstrap-extra-files
```

**参见：** [bootstrap-extra-files 文档](/automation/hooks#bootstrap-extra-files)

### command-logger

将所有命令事件记录到集中式审计文件。

**启用：**

```bash
openclaw hooks enable command-logger
```

**输出：** `~/.openclaw/logs/commands.log`

**查看日志：**

```bash
# 最近命令
tail -n 20 ~/.openclaw/logs/commands.log

# 美化打印
cat ~/.openclaw/logs/commands.log | jq .

# 按操作过滤
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```

**参见：** [command-logger 文档](/automation/hooks#command-logger)

### boot-md

在 gateway 启动时（频道启动后）运行 `BOOT.md`。

**事件**：`gateway:startup`

**启用**：

```bash
openclaw hooks enable boot-md
```

**参见：** [boot-md 文档](/automation/hooks#boot-md)

## 相关

- [CLI 参考](/cli)
- [自动化钩子](/automation/hooks)
