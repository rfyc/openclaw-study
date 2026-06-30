---
summary: "后台 exec 执行与进程管理"
read_when:
  - 添加或修改后台 exec 行为
  - 调试长时间运行的 exec 任务
title: "后台 exec 与进程工具"
---

# 后台 Exec 与进程工具

OpenClaw 通过 `exec` 工具运行 shell 命令，并在内存中保存长时间运行的任务。`process` 工具管理这些后台会话。

## exec 工具

关键参数：

- `command`（必填）
- `yieldMs`（默认 10000）：超过此延迟后自动进入后台
- `background`（布尔值）：立即进入后台
- `timeout`（秒，默认 `tools.exec.timeoutSec`）：超时后终止进程；仅在该调用需要禁用 exec 进程超时时才将 `timeout: 0`
- `elevated`（布尔值）：在启用/允许提升模式时在沙盒外运行（默认 `gateway`，当 exec 目标是 `node` 时为 `node`）
- 需要真实 TTY？设置 `pty: true`。
- `workdir`、`env`

行为：

- 前台运行直接返回输出。
- 当进入后台（显式或超时），工具返回 `status: "running"` + `sessionId` 和简短的尾部输出。
- 后台和 `yieldMs` 运行继承 `tools.exec.timeoutSec`，除非调用提供了显式的 `timeout`。
- 输出保存在内存中，直到会话被轮询或清除。
- 如果 `process` 工具被禁止，`exec` 同步运行并忽略 `yieldMs`/`background`。
- 已生成的 exec 命令接收 `OPENCLAW_SHELL=exec` 用于上下文感知的 shell/配置文件规则。
- 对于现在开始的长时间工作，启动一次并在命令触发输出或失败时依赖自动完成唤醒（如果已启用）。
- 如果自动完成唤醒不可用，或者你需要对无输出干净退出的命令进行静默成功确认，请使用 `process` 确认完成。
- 不要用 `sleep` 循环或重复轮询来模拟提醒或延迟跟进；对未来的工作使用 cron。

## 子进程桥接

在 exec/process 工具之外生成长时间运行的子进程时（例如 CLI 重新生成或网关辅助程序），请附加子进程桥接辅助程序，以便转发终止信号并在退出/错误时分离监听器。这避免了 systemd 上的孤立进程，并保持跨平台关闭行为的一致性。

环境覆盖：

- `PI_BASH_YIELD_MS`：默认 yield（毫秒）
- `PI_BASH_MAX_OUTPUT_CHARS`：内存输出上限（字符）
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`：每流待处理的 stdout/stderr 上限（字符）
- `PI_BASH_JOB_TTL_MS`：已完成会话的 TTL（毫秒，限制在 1m–3h 之间）

配置（首选）：

- `tools.exec.backgroundMs`（默认 10000）
- `tools.exec.timeoutSec`（默认 1800）
- `tools.exec.cleanupMs`（默认 1800000）
- `tools.exec.notifyOnExit`（默认 true）：当后台 exec 退出时入队系统事件并请求心跳。
- `tools.exec.notifyOnExitEmptySuccess`（默认 false）：当为 true 时，也为无输出的成功后台运行入队完成事件。

## process 工具

操作：

- `list`：列出运行中和已完成的会话
- `poll`：获取会话的新输出（也报告退出状态）
- `log`：读取聚合输出（支持 `offset` + `limit`）
- `write`：发送 stdin（`data`，可选 `eof`）
- `send-keys`：向 PTY 支持的会话发送显式按键令牌或字节
- `submit`：向 PTY 支持的会话发送 Enter/回车
- `paste`：发送文字文本，可选包裹在括号粘贴模式中
- `kill`：终止后台会话
- `clear`：从内存中移除已完成的会话
- `remove`：如果运行中则终止，否则清除已完成的会话

注意事项：

- 只有后台会话才会被列出/保存在内存中。
- 会话在进程重启时丢失（无磁盘持久化）。
- 会话日志仅在你运行 `process poll/log` 且工具结果被记录时才保存到聊天历史记录。
- `process` 按代理范围限定；它只能看到该代理启动的会话。
- 使用 `poll`/`log` 进行状态查询、日志读取、静默成功确认或在自动完成唤醒不可用时确认完成。
- 使用 `write`/`send-keys`/`submit`/`paste`/`kill` 进行输入或干预。
- `process list` 包含用于快速扫描的派生 `name`（命令动词 + 目标）。
- `process log` 使用基于行的 `offset`/`limit`。
- 当 `offset` 和 `limit` 都省略时，返回最后 200 行并包含分页提示。
- 当提供 `offset` 且省略 `limit` 时，从 `offset` 返回到末尾（不限制在 200 行）。
- 轮询用于按需状态查询，而不是等待循环调度。如果工作应该稍后发生，请改用 cron。

## 示例

运行长时间任务并稍后轮询：

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
```

立即在后台启动：

```json
{ "tool": "exec", "command": "npm run build", "background": true }
```

发送 stdin：

```json
{ "tool": "process", "action": "write", "sessionId": "<id>", "data": "y\n" }
```

发送 PTY 按键：

```json
{ "tool": "process", "action": "send-keys", "sessionId": "<id>", "keys": ["C-c"] }
```

提交当前行：

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

粘贴文字文本：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## 相关链接

- [Exec 工具](/tools/exec)
- [Exec 审批](/tools/exec-approvals)
