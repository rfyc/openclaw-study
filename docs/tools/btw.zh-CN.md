---
summary: "使用 /btw 提问临时侧边问题"
read_when:
  - 您想询问关于当前会话的快速侧边问题
  - 您正在跨客户端实现或调试 BTW 行为
title: "BTW 侧边问题"
---

`/btw` 让您询问关于**当前会话**的快速侧边问题，而不将该问题转变为正常的对话历史。`/side` 是其别名。

它模仿了 Claude Code 的 `/btw` 行为，但适配了 OpenClaw 的 Gateway 和多频道架构。

## 它的功能

当您发送：

```text
/btw what changed?
```

OpenClaw 会：

1. 对当前会话上下文进行快照，
2. 运行一个单独的**无工具**模型调用，
3. 仅回答侧边问题，
4. 让主运行保持不变，
5. **不**将 BTW 问题或答案写入会话历史，
6. 将答案作为**实时侧边结果**而非普通助手消息发出。

重要的思维模型是：

- 相同的会话上下文
- 独立的一次性侧边查询
- 无工具调用
- 不污染未来上下文
- 不持久化转录

## 它不做什么

`/btw` **不会**：

- 创建新的持久会话，
- 继续未完成的主任务，
- 运行工具或代理工具循环，
- 将 BTW 问题/答案数据写入转录历史，
- 出现在 `chat.history` 中，
- 在重新加载后仍然存在。

它是有意**临时的**。

## 上下文如何工作

BTW 仅将当前会话用作**背景上下文**。

如果主运行当前处于活动状态，OpenClaw 会对当前消息状态进行快照，并将进行中的主提示作为背景上下文包含，同时明确告诉模型：

- 只回答侧边问题，
- 不要恢复或完成未完成的主任务，
- 不要发出工具调用或伪工具调用。

这使 BTW 与主运行保持隔离，同时仍能了解会话的内容。

## 交付模型

BTW **不**作为普通助手转录消息交付。

在 Gateway 协议级别：

- 普通助手聊天使用 `chat` 事件
- BTW 使用 `chat.side_result` 事件

这种分离是有意为之的。如果 BTW 重用普通 `chat` 事件路径，客户端会将其视为常规对话历史。

由于 BTW 使用独立的实时事件且不从 `chat.history` 重放，它在重新加载后消失。

## 界面行为

### TUI

在 TUI 中，BTW 以内联方式在当前会话视图中渲染，但它仍然是临时的：

- 与普通助手回复视觉上有所区别
- 可以用 `Enter` 或 `Esc` 关闭
- 重新加载时不会重放

### 外部频道

在 Telegram、WhatsApp 和 Discord 等频道上，BTW 作为明确标记的一次性回复交付，因为这些界面没有本地临时叠加的概念。

答案仍然被视为侧边结果，而非普通会话历史。

### 控制 UI / 网页

Gateway 正确地将 BTW 作为 `chat.side_result` 发出，且 BTW 不包含在 `chat.history` 中，因此持久性合同对网页来说已经是正确的。

当前控制 UI 仍然需要专用的 `chat.side_result` 消费者在浏览器中实时渲染 BTW。在该客户端支持上线之前，BTW 是一个具有完整 TUI 和外部频道行为的 Gateway 级功能，但尚未有完整的浏览器 UX。

## 何时使用 BTW

当您想要以下内容时使用 `/btw`：

- 对当前工作的快速澄清，
- 在长时间运行仍在进行时需要事实性侧边答案，
- 不应成为未来会话上下文一部分的临时答案。

示例：

```text
/btw what file are we editing?
/side what changed while the main run continued?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## 何时不使用 BTW

当您希望答案成为会话未来工作上下文的一部分时，不要使用 `/btw`。

在这种情况下，请在主会话中正常提问，而不是使用 BTW。

## 相关

- [斜杠命令](/tools/slash-commands)
- [思考级别](/tools/thinking)
- [会话](/concepts/session)
