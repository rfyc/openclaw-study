---
summary: "所有支持频道的反应工具语义"
read_when:
  - 在任何频道中使用反应
  - 了解 emoji 反应在不同平台的差异
title: "反应"
---

代理可以使用 `message` 工具的 `react` 动作在消息上添加和删除 emoji 反应。反应行为因频道和传输方式而异。

## 工作原理

```json
{
  "action": "react",
  "messageId": "msg-123",
  "emoji": "thumbsup"
}
```

- 添加反应时 `emoji` 是必填的。
- 将 `emoji` 设置为空字符串（`""`）以删除机器人的反应。
- 设置 `remove: true` 以删除特定 emoji（需要非空 `emoji`）。
- 在支持状态反应的频道上，对反应设置 `trackToolCalls: true` 可以让运行时使用该反应的消息在同一轮次中进行后续工具进度反应。

## 频道行为

<AccordionGroup>
  <Accordion title="Discord 和 Slack">
    - 空 `emoji` 删除机器人在消息上的所有反应。
    - `remove: true` 仅删除指定的 emoji。

  </Accordion>

  <Accordion title="Google Chat">
    - 空 `emoji` 删除应用在消息上的反应。
    - `remove: true` 仅删除指定的 emoji。

  </Accordion>

  <Accordion title="Telegram">
    - 空 `emoji` 删除机器人的反应。
    - `remove: true` 也删除反应，但工具验证仍需非空 `emoji`。

  </Accordion>

  <Accordion title="WhatsApp">
    - 空 `emoji` 删除机器人反应。
    - `remove: true` 在内部映射为空 emoji（工具调用中仍需要 `emoji`）。

  </Accordion>

  <Accordion title="Zalo Personal（zalouser）">
    - 需要非空 `emoji`。
    - `remove: true` 删除该特定 emoji 反应。

  </Accordion>

  <Accordion title="Feishu/Lark">
    - 使用带有 `add`、`remove` 和 `list` 动作的 `feishu_reaction` 工具。
    - 添加/删除需要 `emoji_type`；删除还需要 `reaction_id`。

  </Accordion>

  <Accordion title="Signal">
    - 入站反应通知由 `channels.signal.reactionNotifications` 控制：`"off"` 禁用它们，`"own"`（默认）在用户对机器人消息反应时发出事件，`"all"` 发出所有反应的事件。

  </Accordion>
</AccordionGroup>

## 反应级别

每个频道的 `reactionLevel` 配置控制代理使用反应的广泛程度。值通常为 `off`、`ack`、`minimal` 或 `extensive`。

- [Telegram reactionLevel](/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [WhatsApp reactionLevel](/channels/whatsapp#reaction-level) — `channels.whatsapp.reactionLevel`

在各个频道上设置 `reactionLevel` 以调整代理在每个平台上积极反应消息的程度。

## 相关链接

- [代理发送](/tools/agent-send) — 包含 `react` 的 `message` 工具
- [频道](/channels) — 频道特定配置
