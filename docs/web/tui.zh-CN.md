---
summary: "终端 UI（TUI）：连接到 Gateway 或在嵌入式模式下本地运行"
read_when:
  - 你想要 TUI 的入门友好演练
  - 你需要完整的 TUI 功能、命令和快捷键列表
title: "TUI"
---

## 快速开始

### Gateway 模式

1. 启动 Gateway。

```bash
openclaw gateway
```

2. 打开 TUI。

```bash
openclaw tui
```

3. 输入消息并按 Enter。

远程 Gateway：

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

如果你的 Gateway 使用密码认证，使用 `--password`。

### 本地模式

无需 Gateway 运行 TUI：

```bash
openclaw chat
# 或
openclaw tui --local
```

说明：

- `openclaw chat` 和 `openclaw terminal` 是 `openclaw tui --local` 的别名。
- `--local` 不能与 `--url`、`--token` 或 `--password` 组合使用。
- 本地模式直接使用嵌入式代理运行时。大多数本地工具有效，但 Gateway 专属功能不可用。
- `openclaw` 和 `openclaw crestodian` 也使用此 TUI shell，以 Crestodian 作为本地设置和修复聊天后端。

## 你看到的内容

- 标头：连接 URL、当前代理、当前会话。
- 聊天日志：用户消息、助手回复、系统通知、工具卡片。
- 状态行：连接/运行状态（连接中、运行中、流式传输、空闲、错误）。
- 页脚：连接状态 + 代理 + 会话 + 模型 + 思考/快速/详细/跟踪/推理 + 令牌计数 + 交付。
- 输入：带自动补全的文本编辑器。

## 心智模型：代理 + 会话

- 代理是唯一的 slug（例如 `main`、`research`）。Gateway 暴露列表。
- 会话属于当前代理。
- 会话键存储为 `agent:<agentId>:<sessionKey>`。
  - 如果你输入 `/session main`，TUI 将其扩展为 `agent:<currentAgent>:main`。
  - 如果你输入 `/session agent:other:main`，你明确切换到该代理会话。
- 会话范围：
  - `per-sender`（默认）：每个代理有多个会话。
  - `global`：TUI 始终使用 `global` 会话（选择器可能为空）。
- 当前代理 + 会话始终在页脚中可见。
- 不带 `--session` 启动时，如果该会话仍然存在，gateway 模式 TUI 恢复同一 gateway、代理和会话范围的上次选定会话。传递 `--session`、`/session`、`/new` 或 `/reset` 保持明确。

## 发送 + 交付

- 消息发送到 Gateway；默认情况下交付到提供商是关闭的。
- 开启交付：
  - `/deliver on`
  - 或设置面板
  - 或以 `openclaw tui --deliver` 启动

## 选择器 + 覆盖层

- 模型选择器：列出可用模型并设置会话覆盖。
- 代理选择器：选择不同的代理。
- 会话选择器：仅显示当前代理的会话。
- 设置：切换交付、工具输出展开和思考可见性。

## 键盘快捷键

- Enter：发送消息
- Esc：中止活动运行
- Ctrl+C：清除输入（按两次退出）
- Ctrl+D：退出
- Ctrl+L：模型选择器
- Ctrl+G：代理选择器
- Ctrl+P：会话选择器
- Ctrl+O：切换工具输出展开
- Ctrl+T：切换思考可见性（重新加载历史）

## Slash 命令

核心命令：

- `/help`
- `/status`
- `/agent <id>`（或 `/agents`）
- `/session <key>`（或 `/sessions`）
- `/model <provider/model>`（或 `/models`）

会话控制：

- `/think <off|minimal|low|medium|high>`
- `/fast <status|on|off>`
- `/verbose <on|full|off>`
- `/trace <on|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>`（别名：`/elev`）
- `/activation <mention|always>`
- `/deliver <on|off>`

会话生命周期：

- `/new` 或 `/reset`（重置会话）
- `/abort`（中止活动运行）
- `/settings`
- `/exit`

仅限本地模式：

- `/auth [provider]` 在 TUI 内打开提供商认证/登录流程。

其他 Gateway slash 命令（例如 `/context`）被转发到 Gateway 并显示为系统输出。参阅 [Slash 命令](/tools/slash-commands)。

## 本地 shell 命令

- 以 `!` 为行前缀可在 TUI 主机上运行本地 shell 命令。
- TUI 每次会话提示一次以允许本地执行；拒绝将在该会话中保持 `!` 禁用。
- 命令在 TUI 工作目录的新的非交互式 shell 中运行（无持久 `cd`/环境）。
- 本地 shell 命令在其环境中接收 `OPENCLAW_SHELL=tui-local`。
- 单独的 `!` 作为普通消息发送；前导空格不触发本地 exec。

## 从本地 TUI 修复配置

当当前配置已验证通过，你想让嵌入式代理在同一台机器上检查它、将其与文档进行比较并帮助修复漂移而不依赖正在运行的 Gateway 时，使用本地模式。

如果 `openclaw config validate` 已经失败，先从 `openclaw configure` 或 `openclaw doctor --fix` 开始。`openclaw chat` 不绕过无效配置保护。

典型流程：

1. 启动本地模式：

```bash
openclaw chat
```

2. 询问代理你想检查的内容，例如：

```text
Compare my gateway auth config with the docs and suggest the smallest fix.
```

3. 使用本地 shell 命令获取确切证据和验证：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

4. 使用 `openclaw config set` 或 `openclaw configure` 应用窄范围更改，然后重新运行 `!openclaw config validate`。
5. 如果 Doctor 建议自动迁移或修复，检查它并运行 `!openclaw doctor --fix`。

提示：

- 优先使用 `openclaw config set` 或 `openclaw configure`，而非手动编辑 `openclaw.json`。
- `openclaw docs "<query>"` 从同一台机器搜索实时文档索引。
- `openclaw config validate --json` 在你想要结构化模式和 SecretRef/可解析性错误时很有用。

## 工具输出

- 工具调用显示为带参数 + 结果的卡片。
- Ctrl+O 在折叠/展开视图之间切换。
- 当工具运行时，部分更新流入同一卡片。

## 终端颜色

- TUI 将助手正文文本保持在你终端的默认前景色，以便深色和浅色终端都保持可读。
- 如果你的终端使用浅色背景且自动检测错误，在启动 `openclaw tui` 之前设置 `OPENCLAW_THEME=light`。
- 要强制使用原始深色调色板，设置 `OPENCLAW_THEME=dark`。

## 历史 + 流式传输

- 连接时，TUI 加载最新历史（默认 200 条消息）。
- 流式响应在就地更新直到最终确定。
- TUI 还监听代理工具事件以获取更丰富的工具卡片。

## 连接详情

- TUI 以 `mode: "tui"` 向 Gateway 注册。
- 重新连接显示系统消息；事件间隙在日志中显示。

## 选项

- `--local`：针对本地嵌入式代理运行时运行
- `--url <url>`：Gateway WebSocket URL（默认为配置或 `ws://127.0.0.1:<port>`）
- `--token <token>`：Gateway 令牌（如果需要）
- `--password <password>`：Gateway 密码（如果需要）
- `--session <key>`：会话键（默认：`main`，或当范围为全局时 `global`）
- `--deliver`：将助手回复交付给提供商（默认关闭）
- `--thinking <level>`：覆盖发送的思考级别
- `--message <text>`：连接后发送初始消息
- `--timeout-ms <ms>`：代理超时（毫秒）（默认为 `agents.defaults.timeoutSeconds`）
- `--history-limit <n>`：要加载的历史条目数（默认 `200`）

<Warning>
当你设置 `--url` 时，TUI 不回退到配置或环境凭据。明确传递 `--token` 或 `--password`。缺少明确凭据是错误。在本地模式下，不要传递 `--url`、`--token` 或 `--password`。
</Warning>

## 故障排除

发送消息后无输出：

- 在 TUI 中运行 `/status` 确认 Gateway 已连接且空闲/忙碌。
- 检查 Gateway 日志：`openclaw logs --follow`。
- 确认代理可以运行：`openclaw status` 和 `openclaw models status`。
- 如果你期望聊天频道中的消息，启用交付（`/deliver on` 或 `--deliver`）。

## 连接故障排除

- `disconnected`：确保 Gateway 正在运行，且你的 `--url/--token/--password` 正确。
- 选择器中没有代理：检查 `openclaw agents list` 和你的路由配置。
- 会话选择器为空：你可能处于全局范围或还没有会话。

## 相关链接

- [控制 UI](/web/control-ui) — 基于 Web 的控制界面
- [Config](/cli/config) — 检查、验证和编辑 `openclaw.json`
- [Doctor](/cli/doctor) — 引导式修复和迁移检查
- [CLI 参考](/cli) — 完整的 CLI 命令参考
