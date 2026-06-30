---
summary: "在已链接的聊天频道之间移动一个 OpenClaw 会话的回复路由"
title: "频道停靠"
read_when:
  - 你希望一个活跃会话的回复从 Telegram 移到 Discord、Slack、Mattermost 或另一个已链接的频道
  - 你正在为跨频道私信配置 session.identityLinks
  - /dock 命令提示发送者未链接或不存在活跃会话
---

频道停靠是一个 OpenClaw 会话的呼叫转移功能。

它保持相同的对话上下文，但改变该会话未来回复的投递位置。

## 示例

Alice 可以在 Telegram 和 Discord 上给 OpenClaw 发消息：

```json5
{
  session: {
    identityLinks: {
      alice: ["telegram:123", "discord:456"],
    },
  },
}
```

如果 Alice 从 Telegram 发送：

```text
/dock_discord
```

OpenClaw 保持当前会话上下文并更改回复路由：

| 停靠前                    | `/dock_discord` 之后     |
| ------------------------- | ------------------------ |
| 回复发送到 Telegram `123` | 回复发送到 Discord `456` |

会话不会被重新创建。记录历史仍然附加到同一个会话。

## 为何使用

当一个任务在某个聊天应用中开始，但下一个回复应该出现在其他地方时，使用停靠。

常见流程：

1. 从 Telegram 启动一个智能体任务。
2. 移动到你协调工作所在的 Discord。
3. 从 Telegram 会话发送 `/dock_discord`。
4. 保持同一个 OpenClaw 会话，但在 Discord 中接收未来的回复。

## 必需配置

停靠需要 `session.identityLinks`。源发送者和目标对等方必须在同一个身份组中：

```json5
{
  session: {
    identityLinks: {
      alice: ["telegram:123", "discord:456", "slack:U123"],
    },
  },
}
```

值是带频道前缀的对等方 id：

| 值             | 含义                        |
| -------------- | --------------------------- |
| `telegram:123` | Telegram 发送者 id `123`    |
| `discord:456`  | Discord 私信对等方 id `456` |
| `slack:U123`   | Slack 用户 id `U123`        |

规范键（上面的 `alice`）只是共享的身份组名称。停靠命令使用带频道前缀的值来证明源发送者和目标对等方是同一个人。

## 命令

停靠命令由支持原生命令的已加载频道插件生成。当前内置命令：

| 目标频道   | 命令               | 别名               |
| ---------- | ------------------ | ------------------ |
| Discord    | `/dock-discord`    | `/dock_discord`    |
| Mattermost | `/dock-mattermost` | `/dock_mattermost` |
| Slack      | `/dock-slack`      | `/dock_slack`      |
| Telegram   | `/dock-telegram`   | `/dock_telegram`   |

下划线别名在 Telegram 等原生命令接口上很有用。

## 什么会改变

停靠更新活跃会话的投递字段：

| 会话字段        | `/dock_discord` 之后的示例 |
| --------------- | -------------------------- |
| `lastChannel`   | `discord`                  |
| `lastTo`        | `456`                      |
| `lastAccountId` | 目标频道账户，或 `default` |

这些字段持久化到会话存储中，并由该会话后续的回复投递使用。

## 什么不会改变

停靠不会：

- 创建频道账户
- 连接新的 Discord、Telegram、Slack 或 Mattermost 机器人
- 向用户授予访问权限
- 绕过频道白名单或私信策略
- 将记录历史移动到另一个会话
- 让不相关的用户共享一个会话

它只改变当前会话的投递路由。

## 故障排除

**命令提示发送者未链接。**

将当前发送者和目标对等方都添加到同一个 `session.identityLinks` 组中。例如，如果 Telegram 发送者 `123` 应该停靠到 Discord 对等方 `456`，则同时包含 `telegram:123` 和 `discord:456`。

**命令提示不存在活跃会话。**

从现有的私信会话中进行停靠。该命令需要一个活跃的会话条目，以便可以持久化新路由。

**回复仍然发送到旧频道。**

检查命令是否回复了成功消息，并确认目标对等方 id 与该频道使用的 id 匹配。停靠只更改活跃会话路由；另一个会话可能仍然路由到其他地方。

**我需要切换回去。**

从已链接的发送者发送原始频道对应的命令，例如 `/dock_telegram` 或 `/dock-telegram`。
