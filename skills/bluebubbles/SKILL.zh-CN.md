---
name: bluebubbles
description: 通过 BlueBubbles 发送和管理 iMessage，包括附件、tapbacks、编辑、回复和群组。
metadata: { "openclaw": { "emoji": "🫧", "requires": { "config": ["channels.bluebubbles"] } } }
---

# BlueBubbles 动作

## 概述

BlueBubbles 是 OpenClaw 推荐的 iMessage 集成方案。使用带 `channel: "bluebubbles"` 的 `message` 工具来发送消息并管理 iMessage 对话：发送文字和附件、发送表情回应（tapbacks）、编辑/撤回，在线程中回复，以及管理群组成员/名称/图标。

## 需要收集的输入

- `target`（优先使用 `chat_guid:...`；也支持 E.164 格式的 `+15551234567` 或 `user@example.com`）
- `message` 发送/编辑/回复的文本内容
- `messageId` 用于反应/编辑/撤回/回复
- 本地文件的附件 `path`，或 base64 的 `buffer` + `filename`

如果用户描述模糊（如"给我妈发消息"），请询问收件人的句柄或聊天 guid 以及具体消息内容。

## 动作

### 发送消息

```json
{
  "action": "send",
  "channel": "bluebubbles",
  "target": "+15551234567",
  "message": "hello from OpenClaw"
}
```

### 表情回应（tapback）

```json
{
  "action": "react",
  "channel": "bluebubbles",
  "target": "+15551234567",
  "messageId": "<message-guid>",
  "emoji": "❤️"
}
```

### 撤销回应

```json
{
  "action": "react",
  "channel": "bluebubbles",
  "target": "+15551234567",
  "messageId": "<message-guid>",
  "emoji": "❤️",
  "remove": true
}
```

### 编辑已发送的消息

```json
{
  "action": "edit",
  "channel": "bluebubbles",
  "target": "+15551234567",
  "messageId": "<message-guid>",
  "message": "更新后的文字"
}
```

### 撤回消息

```json
{
  "action": "unsend",
  "channel": "bluebubbles",
  "target": "+15551234567",
  "messageId": "<message-guid>"
}
```

### 回复特定消息

```json
{
  "action": "reply",
  "channel": "bluebubbles",
  "target": "+15551234567",
  "replyTo": "<message-guid>",
  "message": "回复该消息"
}
```

### 发送附件

```json
{
  "action": "sendAttachment",
  "channel": "bluebubbles",
  "target": "+15551234567",
  "path": "/tmp/photo.jpg",
  "caption": "给你看看"
}
```

### 带 iMessage 特效发送

```json
{
  "action": "sendWithEffect",
  "channel": "bluebubbles",
  "target": "+15551234567",
  "message": "重大消息",
  "effect": "balloons"
}
```

## 注意事项

- 需要 gateway 配置 `channels.bluebubbles`（serverUrl/password/webhookPath）。
- 有 `chat_guid` 时优先使用（尤其是群聊）。
- BlueBubbles 支持丰富的动作，但某些动作依赖 macOS 版本（例如，编辑在 macOS 26 Tahoe 上可能无法使用）。
- gateway 可能同时暴露短 ID 和完整消息 ID；完整 ID 在重启后更持久。
- 底层插件的开发者参考文档位于 BlueBubbles 插件包 README 中。

## 可尝试的用法

- 用 tapback 确认请求。
- 当用户引用特定消息时，在线程中回复。
- 发送带简短说明的文件附件。
