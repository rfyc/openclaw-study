---
summary: "OpenClaw 何时显示输入指示器以及如何调整它们"
read_when:
  - 更改输入指示器行为或默认值
title: "输入指示器"
---

输入指示器在运行活跃时发送到聊天频道。使用 `agents.defaults.typingMode` 控制输入**何时开始**，并使用 `typingIntervalSeconds` 控制**刷新频率**。

## 默认值

当 `agents.defaults.typingMode` **未设置**时，OpenClaw 保持旧版行为：

- **私信**：模型循环开始后立即开始输入。
- **带提及的群聊**：立即开始输入。
- **不带提及的群聊**：仅在消息文本开始流式传输时才开始输入。
- **心跳运行**：如果解析的心跳目标是支持输入的聊天且未禁用输入，则在心跳运行开始时开始输入。

## 模式

将 `agents.defaults.typingMode` 设置为以下之一：

- `never` — 从不显示输入指示器。
- `instant` — 在**模型循环开始时立即**开始输入，即使运行后来只返回静默回复令牌。
- `thinking` — 在**第一个推理增量**时开始输入（需要运行的 `reasoningLevel: "stream"`）。
- `message` — 在**第一个非静默文本增量**时开始输入（忽略 `NO_REPLY` 静默令牌）。

"触发时机"的顺序：
`never` → `message` → `thinking` → `instant`

## 配置

```json5
{
  agent: {
    typingMode: "thinking",
    typingIntervalSeconds: 6,
  },
}
```

你可以按会话覆盖模式或节奏：

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## 注意事项

- 当整个有效载荷是确切的静默令牌时（例如 `NO_REPLY` / `no_reply`，不区分大小写匹配），`message` 模式不会为仅静默的回复显示输入。
- `thinking` 仅在运行流式传输推理（`reasoningLevel: "stream"`）时触发。如果模型不发出推理增量，输入不会开始。
- 心跳输入是解析的投递目标的活跃信号。它在心跳运行开始时启动，而不是遵循 `message` 或 `thinking` 流时序。设置 `typingMode: "never"` 以禁用它。
- 当 `target: "none"` 时、目标无法解析时、为心跳禁用聊天投递时，或频道不支持输入时，心跳不显示输入。
- `typingIntervalSeconds` 控制**刷新节奏**，而不是开始时间。默认值为 6 秒。

## 相关

- [在线状态](/concepts/presence)
- [流式传输和分块](/concepts/streaming)
