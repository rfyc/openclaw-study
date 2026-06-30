---
name: coding-agent
description: '通过即时后台进程将编程任务委托给 Codex、Claude Code、OpenCode 或 Pi 代理。适用场景：(1) 构建或创建功能/应用；(2) 在临时克隆/工作树中审查 PR；(3) 重构大型代码库；(4) 需要文件探索的迭代编程。不适用于：简单单行修复（直接编辑）、读取代码（使用 read 工具）、聊天中绑定线程的 ACP harness 请求（使用带 runtime:"acp" 的 sessions_spawn）、或 ~/clawd 工作区中的任何工作（永远不要在此处生成代理）。所有 coding-agent 运行都以 background:true 立即启动。Claude Code：使用 --print --permission-mode bypassPermissions（无 PTY）。Codex/Pi/OpenCode：需要 pty:true。完成通知必须使用 openclaw message send，不得使用 system event/heartbeat。'
metadata:
  {
    "openclaw":
      {
        "emoji": "🧩",
        "requires":
          {
            "anyBins": ["claude", "codex", "opencode", "pi"],
            "config": ["skills.entries.coding-agent.enabled"],
          },
        "install":
          [
            {
              "id": "node-claude",
              "kind": "node",
              "package": "@anthropic-ai/claude-code",
              "bins": ["claude"],
              "label": "Install Claude Code CLI (npm)",
            },
            {
              "id": "node-codex",
              "kind": "node",
              "package": "@openai/codex",
              "bins": ["codex"],
              "label": "Install Codex CLI (npm)",
            },
          ],
      },
  }
---

# 编程代理（始终在后台运行）

所有编程代理工作均使用 **bash** 配合 **background:true**。
不要使用前台一次性路径。
启动代理，获取 `sessionId`，使用 `process` 监控，并要求工作进程在完成时直接通知用户。

## PTY 模式：Codex/Pi/OpenCode 需要，Claude Code 不需要

对于 **Codex、Pi 和 OpenCode**，需要 PTY：

```bash
# Codex/Pi/OpenCode 的正确方式
bash pty:true background:true command:"codex exec 'Your prompt'"
```

对于 **Claude Code**（`claude` CLI），使用 `--print --permission-mode bypassPermissions`。
不要为 Claude Code 使用 PTY。

```bash
# Claude Code 的正确方式
bash background:true command:"claude --permission-mode bypassPermissions --print 'Your task'"

# Claude Code 的错误方式（PTY、错误标志、无后台）
bash pty:true command:"claude --dangerously-skip-permissions 'task'"
```

### Bash 工具参数

| 参数         | 类型    | 描述                               |
| ------------ | ------- | ---------------------------------- |
| `command`    | string  | 要运行的 shell 命令                |
| `pty`        | boolean | 用于 Codex/Pi/OpenCode             |
| `workdir`    | string  | 工作目录                           |
| `background` | boolean | **此技能始终为 true**              |
| `timeout`    | number  | 超时时间（秒）                     |
| `elevated`   | boolean | 在宿主机而非沙箱中运行（如果允许） |

### Process 工具动作

| 动作        | 描述                                  |
| ----------- | ------------------------------------- |
| `list`      | 列出所有正在运行/最近的会话           |
| `poll`      | 检查会话是否仍在运行                  |
| `log`       | 获取会话输出（可选 offset/limit）     |
| `write`     | 向 stdin 发送原始数据                 |
| `submit`    | 发送数据 + 换行（如同输入后按 Enter） |
| `send-keys` | 发送按键标记或十六进制字节            |
| `paste`     | 粘贴文本（可选括号模式）              |
| `kill`      | 终止会话                              |

---

## 必须遵循的模式

每次 coding-agent 运行都遵循此模式：

1. 在生成代理之前，从当前对话捕获通知路由：
   - `notifyChannel`
   - `notifyTarget`
   - `notifyAccount`（如适用）
   - `notifyReplyTo`（如果希望回复特定消息）
   - `notifyThreadId`（Telegram 话题 / Slack 线程，如适用）
2. 立即以 `background:true` 启动编程 CLI。
3. 将通知路由包含在工作进程提示中，并要求工作进程在完成时调用 `openclaw message send`。
4. 使用 `process action:log` / `poll` 进行监控。
5. 如果工作进程需要输入或在通知前失败，请显式处理。不要依赖 heartbeat。

如果没有可信的通知路由，请说明并不要声称完成后会自动通知用户。

---

## 通知路由

不要依赖：

- `openclaw system event`
- `tools.exec.notifyOnExit`
- heartbeat 投递
- `HEARTBEAT.md`

改用直接出站完成消息：

```bash
openclaw message send --channel <channel> --target '<target>' --message '<text>'
```

仅在真实且适用时添加可选路由标志：

- `--account <id>`
- `--reply-to <messageId>`
- `--thread-id <threadId>`

`openclaw message send` 是直接出站发送，不依赖 heartbeat 是否启用。

### 完成提示片段

在每个工作进程提示中附加如下内容：

```text
Notification route for completion:
- channel: <notifyChannel>
- target: <notifyTarget>
- account: <notifyAccount or omit>
- reply_to: <notifyReplyTo or omit>
- thread_id: <notifyThreadId or omit>

When the task is completely finished, send exactly one completion message back to the user with openclaw message send using that route.
If the task fails fatally, send exactly one failure message back to the user with openclaw message send using that route.
Do not use openclaw system event. Do not rely on heartbeat. Do not skip the completion/failure message.
```

### 完成命令模板

```bash
openclaw message send \
  --channel <notifyChannel> \
  --target '<notifyTarget>' \
  --message 'Done: <brief summary>'
```

可选补充：

```bash
  --account <notifyAccount> \
  --reply-to <notifyReplyTo> \
  --thread-id <notifyThreadId>
```

---

## 快速开始

对于临时 Codex 工作，先创建临时 git 仓库，然后在后台启动工作进程，并将完成路由注入提示中：

```bash
SCRATCH=$(mktemp -d)
cd "$SCRATCH" && git init

bash pty:true workdir:$SCRATCH background:true command:"codex exec 'Your prompt here.

Notification route for completion:
- channel: <notifyChannel>
- target: <notifyTarget>
- account: <notifyAccount or omit>
- reply_to: <notifyReplyTo or omit>
- thread_id: <notifyThreadId or omit>

When the task is completely finished, send exactly one completion message back to the user with openclaw message send using that route.
If the task fails fatally, send exactly one failure message back to the user with openclaw message send using that route.
Do not use openclaw system event. Do not rely on heartbeat. Do not skip the completion/failure message.'"
```

Codex 拒绝在可信 git 目录之外运行。
在以下每个示例中复用相同的通知路由注入块；只有特定任务的提示正文应该改变。

---

## Codex CLI

**模型：** `gpt-5.2-codex` 为默认值（在 ~/.codex/config.toml 中设置）

### 标志

| 标志            | 效果                            |
| --------------- | ------------------------------- |
| `exec "prompt"` | 在工作进程 CLI 内执行一次性操作 |
| `--full-auto`   | 沙盒但在工作区内自动批准        |
| `--yolo`        | 无沙盒，无审批                  |

### 构建/创建

```bash
# 始终立即在后台运行
bash pty:true workdir:~/project background:true command:"codex exec --full-auto 'Build a dark mode toggle'"

# 更多自主性
bash pty:true workdir:~/project background:true command:"codex --yolo 'Refactor the auth module'"
```

### 审查 PR

**永远不要在 OpenClaw 自身项目文件夹中审查 PR。**
克隆到临时文件夹或使用工作树。

```bash
REVIEW_DIR=$(mktemp -d)
git clone https://github.com/user/repo.git $REVIEW_DIR
cd $REVIEW_DIR && gh pr checkout 130

bash pty:true workdir:$REVIEW_DIR background:true command:"codex review --base origin/main"
```

### 批量 PR 审查

```bash
git fetch origin '+refs/pull/*/head:refs/remotes/origin/pr/*'

bash pty:true workdir:~/project background:true command:"codex exec 'Review PR #86. git diff origin/main...origin/pr/86'"
bash pty:true workdir:~/project background:true command:"codex exec 'Review PR #87. git diff origin/main...origin/pr/87'"

process action:list
process action:log sessionId:XXX
```

---

## Claude Code

```bash
bash workdir:~/project background:true command:"claude --permission-mode bypassPermissions --print 'Your task'"
```

---

## OpenCode

```bash
bash pty:true workdir:~/project background:true command:"opencode run 'Your task'"
```

---

## Pi 编程代理

```bash
# 安装：npm install -g @mariozechner/pi-coding-agent
bash pty:true workdir:~/project background:true command:"pi 'Your task'"

# 非交互模式
bash pty:true workdir:~/project background:true command:"pi -p 'Summarize src/'"

# 不同的提供商/模型
bash pty:true workdir:~/project background:true command:"pi --provider openai --model gpt-4o-mini -p 'Your task'"
```

---

## 使用 git 工作树并行修复 Issue

```bash
git worktree add -b fix/issue-78 /tmp/issue-78 main
git worktree add -b fix/issue-99 /tmp/issue-99 main

bash pty:true workdir:/tmp/issue-78 background:true command:"pnpm install && codex --yolo 'Fix issue #78: <description>. Commit and push after review. Send the completion message with openclaw message send using the provided notify route.'"
bash pty:true workdir:/tmp/issue-99 background:true command:"pnpm install && codex --yolo 'Fix issue #99 from the approved ticket summary. Implement only the in-scope edits. Send the completion message with openclaw message send using the provided notify route.'"

process action:list
process action:log sessionId:XXX
```

---

## 规则

1. **根据代理使用正确的执行模式**：
   - Codex/Pi/OpenCode：`pty:true`
   - Claude Code：`--print --permission-mode bypassPermissions`（无需 PTY）
2. **遵守工具选择**——如果用户要求 Codex，就使用 Codex。
   - 编排模式：不要自己手动打补丁。
   - 如果代理失败/挂起，重新生成或询问用户，不要悄悄接管。
3. **要有耐心**——不要因为"太慢"就终止会话
4. **用 process:log 监控**——在不干扰的情况下检查进度
5. **构建时用 --full-auto**——自动批准更改
6. **审查时用原始模式**——无需特殊标志
7. **并行没问题**——可以同时运行多个 Codex 进程处理批量工作
8. **永远不要在 OpenClaw 状态目录中启动 Codex**（`$OPENCLAW_STATE_DIR`，默认 `~/.openclaw`）——它会读取你的 soul 文档，并对组织架构产生奇怪的想法！
9. **永远不要在 ~/Projects/openclaw/ 中切换分支**——那是运行中的 OpenClaw 实例！
10. **始终将完成提示片段注入**工作进程提示中。下面的简化示例为简洁起见省略了它——永远不要在没有它的情况下生成工作进程。

---

## 进度更新（关键）

在后台生成编程代理时，让用户了解进度。

- 启动时发送 1 条简短消息：正在运行什么以及在哪里运行。
- 只在发生变化时更新：
  - 完成了一个里程碑
  - 工作进程提问
  - 遇到错误或需要用户操作
  - 工作进程完成
- 如果终止了会话，立即说明原因。
- 如果期望工作进程使用 `openclaw message send` 自行通知，请在开始更新时明确说明。

这可以防止用户只看到空回复而不知道发生了什么。

---

## 规则

1. **始终立即在后台运行。**
   - 每次 coding-agent 启动都使用 `background:true`。
   - 不要使用此技能中的前台一次性路径。
2. **根据代理使用正确的执行模式。**
   - Codex/Pi/OpenCode：`pty:true`
   - Claude Code：`--print --permission-mode bypassPermissions`
3. **遵守工具选择。**
   - 如果用户要求 Codex，就使用 Codex。
   - 编排模式：不要自己手动打补丁来替代所请求的编程代理。
4. **在生成前捕获通知路由。**
   - 完成消息传递必须有真实的路由。
5. **使用直接完成消息传递。**
   - 要求使用 `openclaw message send`。
   - 不要依赖 `openclaw system event` 或 heartbeat。
6. **不要悄悄接管。**
   - 如果工作进程失败或挂起，重新生成或询问方向。不要悄悄切换到手动编辑。
7. **使用 `process` 监控。**
   - `process action:log` 是默认的低干扰检查方式。
8. **要有耐心。**
   - 不要因为速度慢就终止会话。
9. **并行没问题。**
   - 可以同时运行多个后台 Codex 会话。
10. **永远不要在 `~/.openclaw/` 中启动 Codex。**
11. **永远不要在 `~/Projects/openclaw/` 中切换分支。**

---

## 经验总结

- **PTY 对 Codex/Pi/OpenCode 至关重要**。
- **需要 Git 仓库**：Codex 需要可信的 git 目录。
- **在后台编排下使用 `exec`**：短任务和长任务现在遵循相同的路径。
- **`submit` vs `write`**：使用 `submit` 发送输入加 Enter。
- **直接消息发送比 heartbeat 更适合完成通知**——当用户必须立即得到通知且 heartbeat 可能被禁用时。
