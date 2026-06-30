---
name: slack
description: 使用 Slack 工具进行消息回应、消息置顶/取消置顶、发送、编辑、删除，或获取 Slack 成员信息。
metadata: { "openclaw": { "emoji": "💬", "requires": { "config": ["channels.slack"] } } }
---

# Slack 操作

## 概述

使用 `slack` 进行消息回应、管理置顶、发送/编辑/删除消息以及获取成员信息。该工具使用为 OpenClaw 配置的 bot token。

## 需要收集的输入

- `channelId` 和 `messageId`（Slack 消息时间戳，例如 `1712023032.1234`）。
- 对于回应，需要 `emoji`（Unicode 或 `:name:` 格式）。
- 对于发送消息，需要 `to` 目标（`channel:<id>` 或 `user:<id>`）和 `content`。

消息上下文行包含可以直接复用的 `slack message id` 和 `channel` 字段。

## 操作

### 操作分组

| 操作分组   | 默认状态 | 说明                   |
| ---------- | -------- | ---------------------- |
| reactions  | 已启用   | 添加回应 + 列出回应    |
| messages   | 已启用   | 读取/发送/编辑/删除    |
| pins       | 已启用   | 置顶/取消置顶/列出置顶 |
| memberInfo | 已启用   | 成员信息               |
| emojiList  | 已启用   | 自定义 emoji 列表      |

### 对消息添加回应

```json
{
  "action": "react",
  "channelId": "C123",
  "messageId": "1712023032.1234",
  "emoji": "✅"
}
```

### 列出回应

```json
{
  "action": "reactions",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

### 发送消息

```json
{
  "action": "sendMessage",
  "to": "channel:C123",
  "content": "Hello from OpenClaw"
}
```

### 编辑消息

```json
{
  "action": "editMessage",
  "channelId": "C123",
  "messageId": "1712023032.1234",
  "content": "Updated text"
}
```

### 删除消息

```json
{
  "action": "deleteMessage",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

### 读取最近消息

```json
{
  "action": "readMessages",
  "channelId": "C123",
  "limit": 20
}
```

### 置顶消息

```json
{
  "action": "pinMessage",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

### 取消置顶消息

```json
{
  "action": "unpinMessage",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

### 列出置顶内容

```json
{
  "action": "listPins",
  "channelId": "C123"
}
```

### 成员信息

```json
{
  "action": "memberInfo",
  "userId": "U123"
}
```

### Emoji 列表

```json
{
  "action": "emojiList"
}
```

## 使用建议

- 使用 ✅ 回应来标记已完成的任务。
- 置顶关键决策或每周状态更新。
