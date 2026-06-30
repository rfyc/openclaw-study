---
summary: "消息频道的可复用发送者白名单"
read_when:
  - 跨多个消息频道配置相同白名单
  - 共享私信和群组发送者访问规则
  - 审查消息频道访问控制
title: "访问组"
---

访问组是命名的发送者列表，定义一次后可通过 `accessGroup:<name>` 在频道白名单中引用。

当同一批人需要被多个消息频道允许，或同一个受信任的集合应同时适用于私信和群组发送者授权时，可使用访问组。

访问组本身不授予访问权限。只有当白名单字段引用某个组时，该组才会生效。

## 静态消息发送者组

静态发送者组使用 `type: "message.senders"`。

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        "*": ["global-owner-id"],
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
        whatsapp: ["+15551234567"],
      },
    },
  },
}
```

成员列表以消息频道 ID 为键：

| 键         | 含义                                           |
| ---------- | ---------------------------------------------- |
| `"*"`      | 对每个引用该组的消息频道均进行检查的共享条目。 |
| `discord`  | 仅用于 Discord 白名单匹配的条目。              |
| `telegram` | 仅用于 Telegram 白名单匹配的条目。             |
| `whatsapp` | 仅用于 WhatsApp 白名单匹配的条目。             |

条目与目标频道正常的 `allowFrom` 规则进行匹配。OpenClaw 不会在频道之间转换发送者 ID。如果 Alice 同时拥有 Telegram ID 和 Discord ID，请在相应键下分别列出两个 ID。

## 从白名单引用组

在消息频道路径支持发送者白名单的任何位置，使用 `accessGroup:<name>` 引用组。

私信白名单示例：

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
      },
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
    telegram: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
  },
}
```

群组发送者白名单示例：

```json5
{
  accessGroups: {
    oncall: {
      type: "message.senders",
      members: {
        whatsapp: ["+15551234567"],
        googlechat: ["users/1234567890"],
      },
    },
  },
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["accessGroup:oncall"],
    },
    googlechat: {
      spaces: {
        "spaces/AAA": {
          users: ["accessGroup:oncall"],
        },
      },
    },
  },
}
```

可以混合使用组和直接条目：

```json5
{
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators", "discord:123456789012345678"],
    },
  },
}
```

## 支持的消息频道路径

访问组可在共享消息频道授权路径中使用，包括：

- 私信发送者白名单，例如 `channels.<channel>.allowFrom`
- 群组发送者白名单，例如 `channels.<channel>.groupAllowFrom`
- 使用相同发送者匹配规则的频道特定单间发送者白名单
- 复用消息频道发送者白名单的命令授权路径

频道支持情况取决于该频道是否通过共享 OpenClaw 发送者授权辅助工具接入。目前内置支持包括 Discord、Google Chat、Nostr、WhatsApp、Zalo 和 Zalo Personal。静态 `message.senders` 组设计为频道无关，因此新消息频道应通过使用共享插件 SDK 辅助工具（而非自定义白名单展开）来支持它们。

## Discord 频道受众

Discord 还支持动态访问组类型：

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
      membership: "canViewChannel",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers"],
    },
  },
}
```

`discord.channelAudience` 表示"允许当前可查看该服务器频道的 Discord 私信发送者"。OpenClaw 在授权时通过 Discord 解析发送者并应用 Discord `ViewChannel` 权限规则。

当 Discord 频道已是团队的权威来源（例如 `#maintainers` 或 `#on-call`）时，可使用此功能。

要求与失败行为：

- 机器人需要访问服务器和频道。
- 机器人需要 Discord 开发者门户的**服务器成员意图（Server Members Intent）**。
- 当 Discord 返回 `Missing Access`、发送者无法解析为服务器成员，或频道属于另一个服务器时，访问组将失败关闭（fail closed）。

更多 Discord 特定示例：[Discord 访问控制](/channels/discord#access-control-and-routing)

## 安全说明

- 访问组是白名单别名，不是角色。它们本身不会创建所有者、批准配对请求或授予工具权限。
- `dmPolicy: "open"` 仍然需要在有效的私信白名单中包含 `"*"`。引用访问组与公开访问不同。
- 缺失的组名将失败关闭。如果 `allowFrom` 包含 `accessGroup:operators` 但 `accessGroups.operators` 不存在，该条目不会授权任何人。
- 保持频道 ID 稳定。当频道同时支持数字/用户 ID 和显示名称时，优先使用前者。

## 故障排查

如果某发送者应该匹配但被阻止：

1. 确认白名单字段包含准确的 `accessGroup:<name>` 引用。
2. 确认 `accessGroups.<name>.type` 正确。
3. 确认发送者 ID 列在匹配的频道键下或 `"*"` 下。
4. 确认该条目使用了该频道正常的白名单语法。
5. 对于 Discord 频道受众，确认机器人可以查看服务器频道并已启用服务器成员意图。

编辑访问控制配置后运行 `openclaw doctor`。它会在运行时之前捕获许多无效的白名单和策略组合。
