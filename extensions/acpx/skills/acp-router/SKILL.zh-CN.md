---
name: acp-router
description: 将针对 Pi、Claude Code、Cursor、Copilot、OpenClaw ACP、OpenCode、Gemini CLI、Qwen、Kiro、Kimi、iFlow、Factory Droid、Kilocode 的普通语言请求，或明确的 ACP 测试工作，路由到 OpenClaw ACP 运行时会话或直接的 acpx 驱动会话（"电话游戏"流程）。对于编码代理线程请求，先读取此技能，然后仅使用 `sessions_spawn` 创建线程。Codex 聊天绑定默认使用原生 Codex 应用服务器插件，除非明确指定 ACP 或后台生成需要 ACP。
user-invocable: false
---

# ACP 测试路由器

当用户意图是"在 Pi/Claude Code/Cursor/Copilot/OpenClaw/OpenCode/Gemini/Qwen/Kiro/Kimi/iFlow/Droid/Kilocode（ACP 测试）中运行此内容"时，不要使用子代理运行时或 PTY 抓取。通过 ACP 感知流程路由。

Codex 比较特殊：普通聊天/对话绑定和控制应使用原生 Codex 应用服务器插件（`/codex bind`、`/codex threads`、`/codex resume`），而不是默认的 ACP 路径。仅在以下情况下才使用 ACP 进行 Codex：用户明确指定 ACP/`/acp`/acpx，或通过 `sessions_spawn` 生成后台子会话且原生 Codex 运行时生成暂不可用时。

## 意图检测

当用户要求 OpenClaw 执行以下操作时触发此技能：

- 在 Pi / Claude Code / Cursor / Copilot / OpenClaw / OpenCode / Gemini / Qwen / Kiro / Kimi / iFlow / Droid / Kilocode 中运行某项内容
- 通过 ACP、`/acp` 或 acpx 明确运行 Codex
- 继续现有的测试工作
- 向外部编码测试转发指令
- 在类似线程的对话中保持外部测试对话

编码代理线程请求的强制预检：

- 在为 ACP 测试工作创建任何线程之前，请在同一轮次中先读取此技能。
- 读取后，遵循下面的 `OpenClaw ACP 运行时路径`；不要将 `message(action="thread-create")` 用于 ACP 测试线程生成。

## 模式选择

从以下路径中选择一个：

1. OpenClaw ACP 运行时路径（默认）：使用 `sessions_spawn` / ACP 运行时工具。
2. 直接 `acpx` 路径（电话游戏）：通过 `exec` 使用 `acpx` CLI 直接驱动测试会话。

满足以下任一条件时使用直接 `acpx`：

- 用户明确要求直接 `acpx` 驱动
- ACP 运行时/插件路径不可用或不健康
- 任务是"仅将提示转发到测试"且不需要 OpenClaw ACP 生命周期功能

不要使用：

- 用于测试控制的 `subagents` 运行时
- 要求用户运行斜线命令或 CLI 作为前提条件
- 当 `acpx` 可用时对支持的 ACP 测试 CLI 进行 PTY 抓取

## AgentId 映射

当用户直接命名测试时使用这些默认值：

- "pi" -> `agentId: "pi"`
- "openclaw" -> `agentId: "openclaw"`
- "claude" 或 "claude code" -> `agentId: "claude"`
- "codex" -> `agentId: "codex"` 仅用于明确的 ACP/acpx 请求或后台 ACP 运行时生成
- "copilot" 或 "github copilot" -> `agentId: "copilot"`
- "cursor" 或 "cursor cli" -> `agentId: "cursor"`
- "droid" 或 "factory droid" -> `agentId: "droid"`
- "opencode" -> `agentId: "opencode"`
- "gemini" 或 "gemini cli" -> `agentId: "gemini"`
- "iflow" -> `agentId: "iflow"`
- "kilocode" -> `agentId: "kilocode"`
- "kimi" 或 "kimi cli" -> `agentId: "kimi"`
- "kiro" 或 "kiro cli" -> `agentId: "kiro"`
- "qwen" 或 "qwen code" -> `agentId: "qwen"`

这些默认值与当前 acpx 内置别名匹配。

如果策略拒绝所选 id，清楚地报告策略错误并询问允许的 ACP 代理 id。

## OpenClaw ACP 运行时路径

必需行为：

1. 对于 ACP 测试线程生成请求，在调用工具之前先在同一轮次中读取此技能。
2. 使用 `sessions_spawn` 时配置：
   - `runtime: "acp"`
   - `thread: true`
   - `mode: "session"`（除非用户明确要求一次性）
3. 对于 ACP 测试线程创建，不要将 `message` 与 `action=thread-create` 一起使用；`sessions_spawn` 是唯一的线程创建路径。
4. 将请求的工作放入 `task` 中，以便 ACP 会话立即获取它。
5. 明确设置 `agentId`，除非知道 ACP 默认代理。
6. 当此路径直接工作时，不要要求用户运行斜线命令或 CLI。

示例：

用户："生成一个测试 codex ACP 会话到线程中，并让它说 hi"

调用：

```json
{
  "task": "Say hi.",
  "runtime": "acp",
  "agentId": "codex",
  "thread": true,
  "mode": "session"
}
```

## 线程生成恢复策略

当用户要求在线程中启动编码测试时，将其视为 ACP 运行时请求并尝试端对端满足它。

ACP 后端不可用时的必需行为：

1. 不要立即要求用户选择替代路径。
2. 首先尝试自动本地修复：
   - 确保插件本地固定的 acpx 已安装在 ACPX 插件包中
   - 验证 `${ACPX_CMD} --version`
3. 重新安装/修复后，重启网关并明确提出为用户运行该重启。
4. 修复后重试一次 ACP 线程生成。
5. 仅当修复+重试失败时，报告具体错误，然后提供回退选项。

提供回退时，保持 ACP 优先：

- 选项 1：显示确切失败步骤后重试 ACP 生成
- 选项 2：直接 acpx 电话游戏流程

不要将子代理运行时默认用于这些请求。

## ACPX 安装和版本策略（直接 acpx 路径）

对于此仓库，直接 `acpx` 调用必须遵循与 `@openclaw/acpx` 插件包相同的固定策略。

1. 优先使用插件本地二进制文件，而不是全局 PATH：
   - `${ACPX_PLUGIN_ROOT}/node_modules/.bin/acpx`
2. 从插件依赖中解析固定版本：
   - `node -e "console.log(require(process.env.ACPX_PLUGIN_ROOT + '/package.json').dependencies.acpx)"`
3. 如果二进制文件缺失或版本不匹配，安装插件本地固定版本：
   - `cd "$ACPX_PLUGIN_ROOT" && npm install --omit=dev --no-save acpx@<pinnedVersion>`
4. 使用前验证：
   - `${ACPX_PLUGIN_ROOT}/node_modules/.bin/acpx --version`
5. 如果安装/修复更改了 ACPX 工件，重启网关并提出运行重启。
6. 除非用户明确要求全局安装，否则不要运行 `npm install -g acpx`。

设置并复用：

```bash
ACPX_PLUGIN_ROOT="<bundled-acpx-plugin-root>"
ACPX_CMD="$ACPX_PLUGIN_ROOT/node_modules/.bin/acpx"
```

## 直接 acpx 路径（"电话游戏"）

使用此路径在不使用 `/acp` 或子代理运行时的情况下驱动测试会话。

### 规则

1. 使用调用 `${ACPX_CMD}` 的 `exec` 命令。
2. 每次对话复用稳定的会话名称，以便后续提示保持在相同的测试上下文中。
3. 优先使用 `--format quiet` 获取干净的助手文本以转发给用户。
4. 仅当用户想要一次性行为时才使用 `exec`（一次性）。
5. 当任务范围依赖于仓库上下文时，保持工作目录明确（`--cwd`）。

### 会话命名

使用确定性名称，例如：

- `oc-<harness>-<conversationId>`

其中 `conversationId` 是可用时的线程 id，否则是频道/对话 id。

### 命令模板

持久会话（如果不存在则创建，然后提示）：

```bash
${ACPX_CMD} codex sessions show oc-codex-<conversationId> \
  || ${ACPX_CMD} codex sessions new --name oc-codex-<conversationId>

${ACPX_CMD} codex -s oc-codex-<conversationId> --cwd <workspacePath> --format quiet "<prompt>"
```

一次性：

```bash
${ACPX_CMD} codex exec --cwd <workspacePath> --format quiet "<prompt>"
```

取消正在进行的轮次：

```bash
${ACPX_CMD} codex cancel -s oc-codex-<conversationId>
```

关闭会话：

```bash
${ACPX_CMD} codex sessions close oc-codex-<conversationId>
```

### acpx 中的测试别名

- `claude`
- `codex`
- `copilot`
- `cursor`
- `droid`
- `gemini`
- `iflow`
- `kilocode`
- `kimi`
- `kiro`
- `openclaw`
- `opencode`
- `pi`
- `qwen`

### acpx 中的内置适配器命令

默认值为：

- `openclaw -> openclaw acp`
- `claude -> npx -y @agentclientprotocol/claude-agent-acp@^0.31.0`
- `codex -> bundled @zed-industries/codex-acp@0.12.0 through OpenClaw's isolated CODEX_HOME wrapper`
- `copilot -> copilot --acp --stdio`
- `cursor -> cursor-agent acp`
- `droid -> droid exec --output-format acp`
- `gemini -> gemini --acp`
- `iflow -> iflow --experimental-acp`
- `kilocode -> npx -y @kilocode/cli acp`
- `kimi -> kimi acp`
- `kiro -> kiro-cli acp`
- `opencode -> npx -y opencode-ai acp`
- `pi -> npx pi-acp@^0.0.22`
- `qwen -> qwen --acp`

如果 `~/.acpx/config.json` 覆盖了 `agents`，这些覆盖会替换默认值。
如果你的本地 Cursor 安装仍将 ACP 公开为 `agent acp`，请将其明确设置为 `cursor` 代理覆盖。

### 故障处理

- `acpx: command not found`：
  - 对于线程生成 ACP 请求，立即在 ACPX 插件包中安装插件本地固定的 acpx
  - 安装后重启网关并提出自动运行重启
  - 然后重试一次
  - 除非策略明确要求，否则不要先请求安装权限
  - 除非明确要求，否则不要安装全局 `acpx`
- 适配器命令缺失（例如 `claude-agent-acp` 未找到）：
  - 对于线程生成 ACP 请求，首先通过删除损坏的 `~/.acpx/config.json` 代理覆盖来恢复内置默认值
  - 在提供回退之前重试一次
  - 如果用户想要基于二进制的覆盖，安装确切配置的适配器二进制文件
- `NO_SESSION`：运行 `${ACPX_CMD} <agent> sessions new --name <sessionName>` 然后重试提示。
- 队列繁忙：等待完成（默认）或在明确需要异步行为时使用 `--no-wait`。

### 输出转发

向用户转发时，返回 `acpx` 命令结果中的最终助手文本输出。除非用户要求详细日志，否则避免转发原始本地工具噪音。
