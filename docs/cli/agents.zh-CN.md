---
summary: "`openclaw agents` 的 CLI 参考（列表/添加/删除/绑定/解绑/设置身份）"
read_when:
  - 你需要多个隔离的 agent（工作区 + 路由 + 认证）
title: "Agents"
---

# `openclaw agents`

管理隔离的 agent（工作区 + 认证 + 路由）。

相关：

- [多 agent 路由](/concepts/multi-agent)
- [Agent 工作区](/concepts/agent-workspace)
- [技能配置](/tools/skills-config)：技能可见性配置。

## 示例

```bash
openclaw agents list
openclaw agents list --bindings
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents add ops --workspace ~/.openclaw/workspace-ops --bind telegram:ops --non-interactive
openclaw agents bindings
openclaw agents bind --agent work --bind telegram:ops
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
openclaw agents set-identity --agent main --avatar avatars/openclaw.png
openclaw agents delete work
```

## 路由绑定

使用路由绑定将入站频道流量固定到特定 agent。

如果你还想让每个 agent 有不同的可见技能，请在 `openclaw.json` 中配置 `agents.defaults.skills` 和 `agents.list[].skills`。参见 [技能配置](/tools/skills-config) 和 [配置参考](/gateway/config-agents#agents-defaults-skills)。

列出绑定：

```bash
openclaw agents bindings
openclaw agents bindings --agent work
openclaw agents bindings --json
```

添加绑定：

```bash
openclaw agents bind --agent work --bind telegram:ops --bind discord:guild-a
```

如果省略 `accountId`（`--bind <channel>`），OpenClaw 会在可用时从频道默认值和插件设置钩子中解析它。

如果为 `bind` 或 `unbind` 省略 `--agent`，OpenClaw 会以当前默认 agent 为目标。

### 绑定作用域行为

- 没有 `accountId` 的绑定仅匹配频道默认账户。
- `accountId: "*"` 是全频道回退（所有账户），比显式账户绑定的特异性低。
- 如果同一 agent 已经有不带 `accountId` 的匹配频道绑定，而你之后用显式或解析的 `accountId` 进行绑定，OpenClaw 会就地升级该现有绑定，而不是添加重复项。

示例：

```bash
# 初始仅频道绑定
openclaw agents bind --agent work --bind telegram

# 之后升级为账户范围绑定
openclaw agents bind --agent work --bind telegram:ops
```

升级后，该绑定的路由范围为 `telegram:ops`。如果你还想要默认账户路由，请显式添加（例如 `--bind telegram:default`）。

删除绑定：

```bash
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents unbind --agent work --all
```

`unbind` 接受 `--all` 或一个或多个 `--bind` 值，但不能同时使用两者。

## 命令界面

### `agents`

不带子命令运行 `openclaw agents` 等同于 `openclaw agents list`。

### `agents list`

选项：

- `--json`
- `--bindings`：包含完整路由规则，而不仅仅是每 agent 的计数/摘要

### `agents add [name]`

选项：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>`（可重复）
- `--non-interactive`
- `--json`

备注：

- 传递任何显式添加标志会将命令切换到非交互式路径。
- 非交互式模式需要 agent 名称和 `--workspace`。
- `main` 是保留名称，不能用作新 agent ID。
- 在交互式模式下，认证种子仅复制可移植的静态配置文件（默认为 `api_key` 和静态 `token`）。OAuth 刷新令牌配置文件仍然只能通过从真实 `main` agent 存储的读穿继承获得。如果配置的默认 agent 不是 `main`，请为新 agent 的 OAuth 配置文件单独登录。

### `agents bindings`

选项：

- `--agent <id>`
- `--json`

### `agents bind`

选项：

- `--agent <id>`（默认为当前默认 agent）
- `--bind <channel[:accountId]>`（可重复）
- `--json`

### `agents unbind`

选项：

- `--agent <id>`（默认为当前默认 agent）
- `--bind <channel[:accountId]>`（可重复）
- `--all`
- `--json`

### `agents delete <id>`

选项：

- `--force`
- `--json`

备注：

- `main` 不能被删除。
- 没有 `--force` 时，需要交互式确认。
- 工作区、agent 状态和会话对话记录目录会被移到回收站，而不是硬删除。
- 当 Gateway 可达时，删除操作通过 Gateway 发送，以便配置和会话存储清理与运行时流量共享相同的写入者。如果 Gateway 无法到达，CLI 会回退到离线本地路径。
- 如果另一个 agent 的工作区与此工作区相同路径、在此工作区内，或包含此工作区，则工作区会被保留，`--json` 会报告 `workspaceRetained`、`workspaceRetainedReason` 和 `workspaceSharedWith`。

## 身份文件

每个 agent 工作区可以在工作区根目录包含一个 `IDENTITY.md`：

- 示例路径：`~/.openclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` 从工作区根目录（或显式的 `--identity-file`）读取

头像路径相对于工作区根目录解析。

## 设置身份

`set-identity` 将字段写入 `agents.list[].identity`：

- `name`
- `theme`
- `emoji`
- `avatar`（相对于工作区的路径、http(s) URL 或 data URI）

选项：

- `--agent <id>`
- `--workspace <dir>`
- `--identity-file <path>`
- `--from-identity`
- `--name <name>`
- `--theme <theme>`
- `--emoji <emoji>`
- `--avatar <value>`
- `--json`

备注：

- `--agent` 或 `--workspace` 均可用于选择目标 agent。
- 如果你依赖 `--workspace` 并且多个 agent 共享该工作区，命令会失败并要求你传递 `--agent`。
- 如果没有提供明确的身份字段，命令会从 `IDENTITY.md` 读取身份数据。

从 `IDENTITY.md` 加载：

```bash
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
```

显式覆盖字段：

```bash
openclaw agents set-identity --agent main --name "OpenClaw" --emoji "🦞" --avatar avatars/openclaw.png
```

配置示例：

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "OpenClaw",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/openclaw.png",
        },
      },
    ],
  },
}
```

## 相关

- [CLI 参考](/cli)
- [多 agent 路由](/concepts/multi-agent)
- [Agent 工作区](/concepts/agent-workspace)
