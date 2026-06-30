---
summary: "OpenClaw 如何管理对话会话"
read_when:
  - 你想要了解会话路由和隔离
  - 你想要为多用户设置配置 DM 范围
  - 你正在调试每日或空闲会话重置
title: "会话管理"
---

OpenClaw 将对话组织到**会话**中。每条消息根据其来源（DM、群聊、cron 作业等）被路由到会话。

## 消息如何被路由

| 来源      | 行为           |
| --------- | -------------- |
| 私信      | 默认共享会话   |
| 群聊      | 每个群组隔离   |
| 房间/频道 | 每个房间隔离   |
| Cron 作业 | 每次运行新会话 |
| Webhook   | 每个钩子隔离   |

## DM 隔离

默认情况下，所有 DM 共享一个会话以保持连续性。这对于单用户设置很好。

<Warning>
如果多个人可以给你的智能体发消息，启用 DM 隔离。没有它，所有用户共享相同的对话上下文——Alice 的私信会对 Bob 可见。
</Warning>

**解决方法：**

```json5
{
  session: {
    dmScope: "per-channel-peer", // 按频道 + 发送者隔离
  },
}
```

其他选项：

- `main`（默认）— 所有 DM 共享一个会话。
- `per-peer` — 按发送者隔离（跨频道）。
- `per-channel-peer` — 按频道 + 发送者隔离（推荐）。
- `per-account-channel-peer` — 按账户 + 频道 + 发送者隔离。

<Tip>
如果同一个人通过多个频道联系你，使用 `session.identityLinks` 链接他们的身份，以便他们共享一个会话。
</Tip>

### 停靠链接频道

停靠命令让用户将当前私信会话的回复路由移动到另一个链接的频道，而无需启动新会话。有关示例、配置和故障排除，请参见[频道停靠](/concepts/channel-docking)。

使用 `openclaw security audit` 验证你的设置。

## 会话生命周期

会话被重用，直到它们过期：

- **每日重置**（默认）— 在网关主机本地时间凌晨 4:00 启动新会话。每日新鲜度基于当前 `sessionId` 开始的时间，而不是后来的元数据写入。
- **空闲重置**（可选）— 在一段不活动之后启动新会话。设置 `session.reset.idleMinutes`。空闲新鲜度基于最后真实的用户/频道交互，因此心跳、cron 和 exec 系统事件不会保持会话存活。
- **手动重置** — 在聊天中输入 `/new` 或 `/reset`。`/new <model>` 还会切换模型。

当配置了每日和空闲重置时，以最先过期的为准。心跳、cron、exec 和其他系统事件轮次可能写入会话元数据，但这些写入不延长每日或空闲重置新鲜度。当重置滚动会话时，旧会话的已排队系统事件通知被丢弃，以便过时的后台更新不会被预置到新会话的第一个提示中。

具有活跃提供商拥有的 CLI 会话的会话不会被隐式每日默认切断。当这些会话应该在计时器上过期时，使用 `/reset` 或明确配置 `session.reset`。

## 状态存储在哪里

所有会话状态由**网关**拥有。UI 客户端向网关查询会话数据。

- **存储：** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **记录：** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

`sessions.json` 保留单独的生命周期时间戳：

- `sessionStartedAt`：当前 `sessionId` 开始的时间；每日重置使用此值。
- `lastInteractionAt`：延长空闲生命周期的最后用户/频道交互。
- `updatedAt`：最后存储行变更；对于列出和修剪很有用，但不是每日/空闲重置新鲜度的权威依据。

没有 `sessionStartedAt` 的旧行在可用时从记录 JSONL 会话头解析。如果旧行也缺少 `lastInteractionAt`，空闲新鲜度回退到该会话开始时间，而不是后来的记账写入。

## 会话维护

OpenClaw 随时间自动限制会话存储。默认情况下，它以 `warn` 模式运行（报告将要清理的内容）。将 `session.maintenance.mode` 设置为 `"enforce"` 以进行自动清理：

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "30d",
      maxEntries: 500,
    },
  },
}
```

对于生产规模的 `maxEntries` 限制，网关运行时写入使用小高水位缓冲区，并以批次方式清理回配置的上限。网关启动期间，会话存储读取不修剪或限制条目。这避免了在每次启动或隔离 cron 会话时运行完整的存储清理。`openclaw sessions cleanup --enforce` 立即应用上限。

维护保留持久的外部对话指针，包括群组会话和线程范围的聊天会话，同时仍允许合成的 cron、钩子、心跳、ACP 和子智能体条目老化。

使用 `openclaw sessions cleanup --dry-run` 预览。

## 检查会话

- `openclaw status` — 会话存储路径和最近活动。
- `openclaw sessions --json` — 所有会话（使用 `--active <minutes>` 过滤）。
- 聊天中的 `/status` — 上下文使用、模型和切换。
- `/context list` — 系统提示中的内容。

## 延伸阅读

- [会话修剪](/concepts/session-pruning) — 裁剪工具结果
- [压缩](/concepts/compaction) — 摘要长对话
- [会话工具](/concepts/session-tool) — 用于跨会话工作的智能体工具
- [会话管理深度解析](/reference/session-management-compaction) — 存储模式、记录、发送策略、来源元数据和高级配置
- [多智能体](/concepts/multi-agent) — 跨智能体的路由和会话隔离
- [后台任务](/automation/tasks) — 分离工作如何创建带有会话引用的任务记录
- [频道路由](/channels/channel-routing) — 入站消息如何被路由到会话

## 相关

- [会话修剪](/concepts/session-pruning)
- [会话工具](/concepts/session-tool)
- [命令队列](/concepts/queue)
