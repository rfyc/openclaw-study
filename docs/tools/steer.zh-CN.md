---
summary: "在不改变队列模式的情况下引导活动运行"
read_when:
  - 在代理已在运行时使用 /steer 或 /tell
  - 比较 /steer 与 /queue steer
  - 决定是否引导当前运行、子代理或 ACP 会话
title: "Steer"
sidebarTitle: "Steer"
---

`/steer` 向已活跃的运行发送指导。它适用于"在仍在工作时调整此运行"的时刻，而非用于开始新轮次。

## 当前会话

使用顶级 `/steer` 定位当前会话的活动运行：

```text
/steer prefer the smaller patch and keep the tests focused
/tell summarize before making the next tool call
```

行为：

- 仅定位当前会话的活动运行。
- 独立于会话的 `/queue` 模式工作。
- 当会话空闲时不启动新运行。
- 当没有活动运行可引导时回复警告。
- 使用活动运行时的引导路径，因此模型在下一个支持的运行时边界看到指导。

## Steer 与队列

`/queue steer` 改变当运行活跃时收到正常入站消息的行为方式。`/steer <message>` 是一个显式命令，尝试在下一个支持的运行时边界将该命令的消息注入活动运行，无论存储的 `/queue` 设置如何。

使用：

- `/steer <message>`：当你想立即引导活动运行时。
- `/queue steer`：当你想让未来的正常消息默认引导活动运行时。
- `/queue collect` 或 `/queue followup`：当新消息应等待稍后的轮次而非引导活动运行时。

有关队列模式和回退行为，参阅[命令队列](/concepts/queue)和[引导队列](/concepts/queue-steering)。

## 子代理

当目标是子运行时，使用 `/subagents steer`：

```text
/subagents steer 2 focus only on the API surface
```

顶级 `/steer` 不按 id 或列表索引选择子代理。它始终定位当前会话的活动运行。参阅[子代理](/tools/subagents)了解子代理 id、标签和控制命令。

## ACP 会话

当目标是 ACP 工具会话时，使用 `/acp steer`：

```text
/acp steer --session agent:main:acp:codex tighten the repro
```

参阅 [ACP 代理](/tools/acp-agents)了解 ACP 会话选择和运行时行为。

## 相关链接

- [Slash 命令](/tools/slash-commands)
- [命令队列](/concepts/queue)
- [引导队列](/concepts/queue-steering)
- [子代理](/tools/subagents)
