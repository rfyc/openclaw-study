---
summary: "WhatsApp 群组消息处理的行为和配置（mentionPatterns 跨平台共享）"
read_when:
  - 更改群组消息规则或提及
title: "群组消息"
---

目标：让 Clawd 在 WhatsApp 群组中保持活跃，只在被 ping 时唤醒，并将该线程与个人私信会话分开。

<Note>
`agents.list[].groupChat.mentionPatterns` 也被 Telegram、Discord、Slack 和 iMessage 使用。本文档重点介绍 WhatsApp 特定行为。对于多智能体设置，请按智能体设置 `agents.list[].groupChat.mentionPatterns`，或使用 `messages.groupChat.mentionPatterns` 作为全局回退。
</Note>

## 当前实现（2025-12-03）

- 激活模式：`mention`（默认）或 `always`。`mention` 需要 ping（通过 `mentionedJids` 的真实 WhatsApp @提及、安全正则表达式模式，或文本中任意位置的机器人 E.164）。`always` 在每条消息时唤醒智能体，但它只应在能够增加有意义价值时回复；否则返回精确的静默令牌 `NO_REPLY`/`no_reply`。默认值可以在配置中设置（`channels.whatsapp.groups`）并通过 `/activation` 按群组覆盖。当设置了 `channels.whatsapp.groups` 时，它也充当群组白名单（包含 `"*"` 以允许所有群组）。
- 群组策略：`channels.whatsapp.groupPolicy` 控制是否接受群组消息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（回退：明确的 `channels.whatsapp.allowFrom`）。默认是 `allowlist`（在您添加发送者之前阻止）。
- 每个群组的会话：会话键看起来像 `agent:<agentId>:whatsapp:group:<jid>`，因此命令如 `/verbose on`、`/trace on` 或 `/think high`（作为独立消息发送）的范围限定在该群组；个人私信状态不受影响。群组线程跳过心跳。
- 上下文注入：**仅待处理**的群组消息（默认 50 条），即*未*触发运行的消息，在 `[Chat messages since your last reply - for context]` 下以前缀形式显示，触发行在 `[Current message - respond to this]` 下。已在会话中的消息不会重新注入。
- 发送者呈现：每个群组批次现在以 `[from: Sender Name (+E164)]` 结尾，以便 Pi 知道谁在说话。
- 临时/仅查看一次：在提取文本/提及之前展开这些，因此其中的 ping 仍然触发。
- 群组系统提示：在群组会话的第一个轮次（以及每当 `/activation` 更改模式时），我们向系统提示注入简短说明，如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.` 如果元数据不可用，我们仍然告诉智能体它在群组聊天中。

## 配置示例（WhatsApp）

在 `~/.openclaw/openclaw.json` 中添加 `groupChat` 块，以便即使 WhatsApp 在文本正文中删除可见的 `@` 时，显示名称 ping 也能正常工作：

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
      },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          historyLimit: 50,
          mentionPatterns: ["@?openclaw", "\\+?15555550123"],
        },
      },
    ],
  },
}
```

说明：

- 正则表达式不区分大小写，并使用与其他配置正则表达式表面相同的安全正则表达式防护；无效模式和不安全的嵌套重复被忽略。
- 当有人点击联系人时，WhatsApp 仍然通过 `mentionedJids` 发送规范提及，因此数字回退很少需要，但是一个有用的安全网。

### 激活命令（仅限所有者）

使用群组聊天命令：

- `/activation mention`
- `/activation always`

只有所有者号码（来自 `channels.whatsapp.allowFrom`，或未设置时机器人自己的 E.164）可以更改此设置。在群组中将 `/status` 作为独立消息发送，以查看当前激活模式。

## 使用方法

1. 将您的 WhatsApp 账户（运行 OpenClaw 的那个）添加到群组。
2. 说 `@openclaw …`（或包含号码）。只有白名单发送者才能触发它，除非您设置 `groupPolicy: "open"`。
3. 智能体提示将包含最近的群组上下文加上尾部 `[from: …]` 标记，以便它可以称呼正确的人。
4. 会话级指令（`/verbose on`、`/trace on`、`/think high`、`/new` 或 `/reset`、`/compact`）只适用于该群组的会话；将它们作为独立消息发送以便注册。您的个人私信会话保持独立。

## 测试/验证

- 手动冒烟测试：
  - 在群组中发送 `@openclaw` ping 并确认回复引用了发送者名称。
  - 发送第二个 ping 并验证历史块已包含，然后在下一个轮次清除。
- 检查网关日志（使用 `--verbose` 运行）以查看显示 `from: <groupJid>` 和 `[from: …]` 后缀的 `inbound web message` 条目。

## 已知注意事项

- 心跳对群组有意跳过，以避免嘈杂的广播。
- 回声抑制使用组合批次字符串；如果您不带提及发送相同文本两次，只有第一次会得到响应。
- 会话存储条目将在会话存储（默认 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）中显示为 `agent:<agentId>:whatsapp:group:<jid>`；缺少的条目只是意味着群组尚未触发运行。
- 群组中的输入指示符遵循 `agents.defaults.typingMode`。当可见回复使用默认的仅消息工具模式时，输入默认立即开始，以便群组成员可以看到智能体正在工作，即使没有自动最终回复发布。明确的输入模式配置仍然优先。

## 相关文档

- [群组](/channels/groups)
- [频道路由](/channels/channel-routing)
- [广播组](/channels/broadcast-groups)
