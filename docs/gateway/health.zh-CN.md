---
summary: "健康检查命令和网关健康监控"
title: "健康检查"
read_when:
  - 诊断渠道连接性或网关健康状况
  - 了解健康检查 CLI 命令和选项
---

无需猜测即可验证渠道连接性的简短指南。

## 快速检查

- `openclaw status` — 本地摘要：网关可达性/模式、更新提示、链接的渠道认证年龄、会话 + 最近活动。
- `openclaw status --all` — 完整的本地诊断（只读、彩色、可安全粘贴用于调试）。
- `openclaw status --deep` — 向运行中的网关请求实时健康探测（带 `probe:true` 的 `health`），包括支持时的每账户渠道探测。
- `openclaw health` — 向运行中的网关请求其健康快照（仅 WS；CLI 没有直接的渠道套接字）。
- `openclaw health --verbose` — 强制实时健康探测并打印网关连接详情。
- `openclaw health --json` — 机器可读的健康快照输出。
- 在 WhatsApp/WebChat 中发送 `/status` 作为独立消息，在不调用代理的情况下获取状态回复。
- 日志：跟踪 `/tmp/openclaw/openclaw-*.log` 并过滤 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

对于 Discord 和其他聊天提供商，会话行不是套接字活跃性。`openclaw sessions`、网关 `sessions.list` 和代理 `sessions_list` 工具读取存储的对话状态。提供商可以在任何新会话行具体化之前重新连接并显示健康的渠道状态。使用上面的渠道状态和健康命令进行实时连接检查。

## 深度诊断

- 磁盘上的凭据：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（mtime 应该是最近的）。
- 会话存储：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路径可以在配置中覆盖）。计数和最近收件人通过 `status` 显示。
- 重新链接流程：当日志中出现状态码 409–515 或 `loggedOut` 时，运行 `openclaw channels logout && openclaw channels login --verbose`。（注意：配对后 QR 登录流程在状态 515 后自动重启一次。）
- 诊断默认启用。网关记录操作事实，除非设置 `diagnostics.enabled: false`。内存事件记录 RSS/堆字节计数、阈值压力和增长压力。当进程运行但饱和时，活跃性警告记录事件循环延迟、事件循环利用率、CPU 核心比率以及活跃/等待/排队的会话计数。超大有效载荷事件记录被拒绝、截断或分块的内容，以及可用时的大小和限制。它们不记录消息文本、附件内容、webhook 正文、原始请求或响应正文、令牌、Cookie 或秘密值。同一心跳启动有界稳定性记录器，可通过 `openclaw gateway stability` 或 `diagnostics.stability` 网关 RPC 获取。致命网关退出、关闭超时和重启启动失败在事件存在时将最新记录器快照保存在 `~/.openclaw/logs/stability/` 下；使用 `openclaw gateway stability --bundle latest` 检查最新保存的捆绑包。
- 对于错误报告，运行 `openclaw gateway diagnostics export` 并附上生成的 zip。导出组合了 Markdown 摘要、最新稳定性捆绑包、经过清理的日志元数据、经过清理的网关状态/健康快照和配置形状。它可以共享：聊天文本、webhook 正文、工具输出、凭据、Cookie、账户/消息标识符和秘密值被省略或删除。参见[诊断导出](/gateway/diagnostics)。

## 健康监测配置

- `gateway.channelHealthCheckMinutes`：网关检查渠道健康的频率。默认：`5`。设置 `0` 以全局禁用健康监测器重启。
- `gateway.channelStaleEventThresholdMinutes`：连接的渠道在健康监测器将其视为过时并重启之前可以保持空闲的时长。默认：`30`。保持大于或等于 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`：每渠道/账户的滚动一小时内健康监测器重启上限。默认：`10`。
- `channels.<provider>.healthMonitor.enabled`：在保持全局监控启用的同时，禁用特定渠道的健康监测器重启。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：优先于渠道级设置的多账户覆盖。
- 这些每渠道覆盖适用于今天公开它们的内置渠道监测器：Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

## 出现问题时

- `logged out` 或状态 409–515 → 使用 `openclaw channels logout` 然后 `openclaw channels login` 重新链接。
- 网关不可达 → 启动它：`openclaw gateway --port 18789`（如果端口繁忙使用 `--force`）。
- 没有入站消息 → 确认已链接的手机在线且发送者被允许（`channels.whatsapp.allowFrom`）；对于群聊，确保允许列表 + 提及规则匹配（`channels.whatsapp.groups`、`agents.list[].groupChat.mentionPatterns`）。

## 专用"health"命令

`openclaw health` 向运行中的网关请求其健康快照（CLI 没有直接的渠道套接字）。默认情况下它可以返回新鲜的缓存网关快照；网关然后在后台刷新该缓存。`openclaw health --verbose` 强制实时探测。该命令报告链接凭据/认证年龄（如果可用）、每渠道探测摘要、会话存储摘要和探测持续时间。如果网关不可达或探测失败/超时，以非零退出。

选项：

- `--json`：机器可读的 JSON 输出
- `--timeout <ms>`：覆盖默认的 10 秒探测超时
- `--verbose`：强制实时探测并打印网关连接详情
- `--debug`：`--verbose` 的别名

健康快照包括：`ok`（布尔值）、`ts`（时间戳）、`durationMs`（探测时间）、每渠道状态、代理可用性和会话存储摘要。

## 相关链接

- [网关运行手册](/gateway)
- [诊断导出](/gateway/diagnostics)
- [网关故障排除](/gateway/troubleshooting)
