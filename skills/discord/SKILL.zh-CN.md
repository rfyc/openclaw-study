---
name: discord
description: "通过 message 工具操作 Discord（channel=discord）。"
metadata: { "openclaw": { "emoji": "🎮", "requires": { "config": ["channels.discord.token"] } } }
allowed-tools: ["message"]
---

# Discord（通过 `message` 使用）

使用 `message` 工具。代理不直接暴露 `discord` 专属工具。

## 必须遵守

- 始终设置：`channel: "discord"`。
- 遵守门控设置：`channels.discord.actions.*`（部分默认关闭：`roles`、`moderation`、`presence`、`channels`）。
- 优先使用明确的 ID：`guildId`、`channelId`、`messageId`、`userId`。
- 多账户：可选 `accountId`。

## 指南

- 避免在对外 Discord 消息中使用 Markdown 表格。
- 提及用户时使用 `<@USER_ID>`。
- 优先使用 Discord 组件 v2（`components`）实现富 UI；仅在必要时使用旧版 `embeds`。

## 目标

- 发送类操作：`to: "channel:<id>"` 或 `to: "user:<id>"`。
- 消息特定操作：`channelId: "<id>"`（或 `to`）加 `messageId: "<id>"`。

## 常用操作（示例）

发送消息：

```json
{
  "action": "send",
  "channel": "discord",
  "to": "channel:123",
  "message": "hello",
  "silent": true
}
```

发送带媒体：

```json
{
  "action": "send",
  "channel": "discord",
  "to": "channel:123",
  "message": "see attachment",
  "media": "file:///tmp/example.png"
}
```

- 可选 `silent: true` 以抑制 Discord 通知。

使用组件 v2 发送（推荐用于富 UI）：

```json
{
  "action": "send",
  "channel": "discord",
  "to": "channel:123",
  "message": "Status update",
  "components": "[Carbon v2 components]"
}
```

- `components` 期望来自 JS/TS 集成的 Carbon 组件实例（Container、TextDisplay 等）。
- 不要将 `components` 与 `embeds` 混用（Discord 拒绝 v2 + embeds 组合）。

旧版嵌入（不推荐）：

```json
{
  "action": "send",
  "channel": "discord",
  "to": "channel:123",
  "message": "Status update",
  "embeds": [{ "title": "Legacy", "description": "Embeds are legacy." }]
}
```

- 存在 v2 组件时 `embeds` 会被忽略。

表情反应：

```json
{
  "action": "react",
  "channel": "discord",
  "channelId": "123",
  "messageId": "456",
  "emoji": "✅"
}
```

读取：

```json
{
  "action": "read",
  "channel": "discord",
  "to": "channel:123",
  "limit": 20
}
```

编辑 / 删除：

```json
{
  "action": "edit",
  "channel": "discord",
  "channelId": "123",
  "messageId": "456",
  "message": "fixed typo"
}
```

```json
{
  "action": "delete",
  "channel": "discord",
  "channelId": "123",
  "messageId": "456"
}
```

投票：

```json
{
  "action": "poll",
  "channel": "discord",
  "to": "channel:123",
  "pollQuestion": "Lunch?",
  "pollOption": ["Pizza", "Sushi", "Salad"],
  "pollMulti": false,
  "pollDurationHours": 24
}
```

置顶：

```json
{
  "action": "pin",
  "channel": "discord",
  "channelId": "123",
  "messageId": "456"
}
```

线程：

```json
{
  "action": "thread-create",
  "channel": "discord",
  "channelId": "123",
  "messageId": "456",
  "threadName": "bug triage"
}
```

搜索：

```json
{
  "action": "search",
  "channel": "discord",
  "guildId": "999",
  "query": "release notes",
  "channelIds": ["123", "456"],
  "limit": 10
}
```

在线状态（通常受门控）：

```json
{
  "action": "set-presence",
  "channel": "discord",
  "activityType": "playing",
  "activityName": "with fire",
  "status": "online"
}
```

## 写作风格（Discord）

- 简短、随意、低仪式感。
- 不使用 Markdown 表格。
- 提及用户时使用 `<@USER_ID>`。
