---
summary: "Yuanbao 机器人概述、功能和配置"
read_when:
  - 您想连接 Yuanbao 机器人
  - 您正在配置 Yuanbao 频道
title: Yuanbao
---

# Yuanbao

腾讯元宝是腾讯的 AI 助手平台。OpenClaw 频道插件通过 WebSocket 将 Yuanbao 机器人连接到 OpenClaw，使它们能够通过私信和群聊与用户互动。

**状态：** 机器人私信 + 群聊已生产就绪。WebSocket 是唯一支持的连接模式。

---

## 快速开始

> **需要 OpenClaw 2026.4.10 或更高版本。** 运行 `openclaw --version` 检查。使用 `openclaw update` 升级。

<Steps>
  <Step title="使用您的凭据添加 Yuanbao 频道">
  ```bash
  openclaw channels add --channel yuanbao --token "appKey:appSecret"
  ```
  `--token` 值使用冒号分隔的 `appKey:appSecret` 格式。您可以通过在元宝 APP 的应用设置中创建机器人来获取这些信息。
  </Step>

  <Step title="设置完成后，重启网关以应用更改">
  ```bash
  openclaw gateway restart
  ```
  </Step>
</Steps>

### 交互式设置（替代方法）

您也可以使用交互式向导：

```bash
openclaw channels login --channel yuanbao
```

按提示输入您的 App ID 和 App Secret。

---

## 访问控制

### 私信

配置 `dmPolicy` 控制谁可以给机器人发私信：

- `"pairing"` — 未知用户收到配对码；通过 CLI 批准
- `"allowlist"` — 只有 `allowFrom` 中列出的用户可以聊天
- `"open"` — 允许所有用户（默认）
- `"disabled"` — 禁用所有私信

**批准配对请求：**

```bash
openclaw pairing list yuanbao
openclaw pairing approve yuanbao <CODE>
```

### 群聊

**提及要求**（`channels.yuanbao.requireMention`）：

- `true` — 需要 @ 提及（默认）
- `false` — 无需 @ 提及即可响应

在群聊中回复机器人的消息被视为隐式提及。

---

## 配置示例

### 开放私信策略的基本设置

```json5
{
  channels: {
    yuanbao: {
      appKey: "your_app_key",
      appSecret: "your_app_secret",
      dm: {
        policy: "open",
      },
    },
  },
}
```

### 限制私信到特定用户

```json5
{
  channels: {
    yuanbao: {
      appKey: "your_app_key",
      appSecret: "your_app_secret",
      dm: {
        policy: "allowlist",
        allowFrom: ["user_id_1", "user_id_2"],
      },
    },
  },
}
```

### 禁用群组中的 @ 提及要求

```json5
{
  channels: {
    yuanbao: {
      requireMention: false,
    },
  },
}
```

### 优化出站消息投递

```json5
{
  channels: {
    yuanbao: {
      // 立即发送每个块，不缓冲
      outboundQueueStrategy: "immediate",
    },
  },
}
```

### 调整合并文本策略

```json5
{
  channels: {
    yuanbao: {
      outboundQueueStrategy: "merge-text",
      minChars: 2800, // 缓冲直到达到此字符数
      maxChars: 3000, // 超过此限制强制分割
      idleMs: 5000, // 空闲超时后自动刷新（毫秒）
    },
  },
}
```

---

## 常用命令

| 命令       | 描述           |
| ---------- | -------------- |
| `/help`    | 显示可用命令   |
| `/status`  | 显示机器人状态 |
| `/new`     | 开始新会话     |
| `/stop`    | 停止当前运行   |
| `/restart` | 重启 OpenClaw  |
| `/compact` | 压缩会话上下文 |

> Yuanbao 支持原生斜杠命令菜单。网关启动时命令会自动同步到平台。

---

## 故障排查

### 机器人在群聊中不响应

1. 确保机器人已添加到群组
2. 确保您 @ 提及了机器人（默认必须）
3. 查看日志：`openclaw logs --follow`

### 机器人未收到消息

1. 确保机器人已在元宝 APP 中创建并获得批准
2. 确保 `appKey` 和 `appSecret` 配置正确
3. 确保网关正在运行：`openclaw gateway status`
4. 查看日志：`openclaw logs --follow`

### 机器人发送空的或后备回复

1. 检查 AI 模型是否返回有效内容
2. 默认后备回复是："暂时无法解答，你可以换个问题问问我哦"
3. 通过 `channels.yuanbao.fallbackReply` 自定义

### App Secret 泄露

1. 在元宝 APP 中重置 App Secret
2. 在配置中更新该值
3. 重启网关：`openclaw gateway restart`

---

## 高级配置

### 多账户

```json5
{
  channels: {
    yuanbao: {
      defaultAccount: "main",
      accounts: {
        main: {
          appKey: "key_xxx",
          appSecret: "secret_xxx",
          name: "Primary bot",
        },
        backup: {
          appKey: "key_yyy",
          appSecret: "secret_yyy",
          name: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

`defaultAccount` 控制出站 API 未指定 `accountId` 时使用哪个账户。

### 消息限制

- `maxChars` — 单条消息最大字符数（默认：`3000` 字符）
- `mediaMaxMb` — 媒体上传/下载限制（默认：`20` MB）
- `overflowPolicy` — 消息超出限制时的行为：`"split"`（默认）或 `"stop"`

### 流式传输

Yuanbao 支持块级流式传输输出。启用后，机器人在生成文本时分块发送。

```json5
{
  channels: {
    yuanbao: {
      disableBlockStreaming: false, // 块流式传输启用（默认）
    },
  },
}
```

将 `disableBlockStreaming: true` 设置为一条消息发送完整回复。

### 群聊历史上下文

控制群聊的 AI 上下文中包含多少历史消息：

```json5
{
  channels: {
    yuanbao: {
      historyLimit: 100, // 默认：100，设为 0 禁用
    },
  },
}
```

### 回复模式

控制机器人在群聊中回复时如何引用消息：

```json5
{
  channels: {
    yuanbao: {
      replyToMode: "first", // "off" | "first" | "all"（默认："first"）
    },
  },
}
```

| 值        | 行为                                 |
| --------- | ------------------------------------ |
| `"off"`   | 无引用回复                           |
| `"first"` | 每条入站消息仅引用第一个回复（默认） |
| `"all"`   | 引用每个回复                         |

### Markdown 提示注入

默认情况下，机器人在系统提示中注入指令，以防止 AI 模型将整个回复包装在 Markdown 代码块中。

```json5
{
  channels: {
    yuanbao: {
      markdownHintEnabled: true, // 默认：true
    },
  },
}
```

### 调试模式

为特定机器人 ID 启用未净化的日志输出：

```json5
{
  channels: {
    yuanbao: {
      debugBotIds: ["bot_user_id_1", "bot_user_id_2"],
    },
  },
}
```

### 多智能体路由

使用 `bindings` 将 Yuanbao 私信或群组路由到不同的智能体。

```json5
{
  agents: {
    list: [
      { id: "main" },
      { id: "agent-a", workspace: "/home/user/agent-a" },
      { id: "agent-b", workspace: "/home/user/agent-b" },
    ],
  },
  bindings: [
    {
      agentId: "agent-a",
      match: {
        channel: "yuanbao",
        peer: { kind: "direct", id: "user_xxx" },
      },
    },
    {
      agentId: "agent-b",
      match: {
        channel: "yuanbao",
        peer: { kind: "group", id: "group_zzz" },
      },
    },
  ],
}
```

路由字段：

- `match.channel`：`"yuanbao"`
- `match.peer.kind`：`"direct"`（私信）或 `"group"`（群聊）
- `match.peer.id`：用户 ID 或群组代码

---

## 配置参考

完整配置：[网关配置](/gateway/configuration)

| 设置                                       | 描述                                      | 默认值                                 |
| ------------------------------------------ | ----------------------------------------- | -------------------------------------- |
| `channels.yuanbao.enabled`                 | 启用/禁用频道                             | `true`                                 |
| `channels.yuanbao.defaultAccount`          | 出站路由的默认账户                        | `default`                              |
| `channels.yuanbao.accounts.<id>.appKey`    | App Key（用于签名和工单生成）             | —                                      |
| `channels.yuanbao.accounts.<id>.appSecret` | App Secret（用于签名）                    | —                                      |
| `channels.yuanbao.accounts.<id>.token`     | 预签名 Token（跳过自动工单签名）          | —                                      |
| `channels.yuanbao.accounts.<id>.name`      | 账户显示名称                              | —                                      |
| `channels.yuanbao.accounts.<id>.enabled`   | 启用/禁用特定账户                         | `true`                                 |
| `channels.yuanbao.dm.policy`               | 私信策略                                  | `open`                                 |
| `channels.yuanbao.dm.allowFrom`            | 私信白名单（用户 ID 列表）                | —                                      |
| `channels.yuanbao.requireMention`          | 群组中需要 @ 提及                         | `true`                                 |
| `channels.yuanbao.overflowPolicy`          | 长消息处理（`split` 或 `stop`）           | `split`                                |
| `channels.yuanbao.replyToMode`             | 群组回复引用策略（`off`、`first`、`all`） | `first`                                |
| `channels.yuanbao.outboundQueueStrategy`   | 出站策略（`merge-text` 或 `immediate`）   | `merge-text`                           |
| `channels.yuanbao.minChars`                | 合并文本：触发发送的最小字符数            | `2800`                                 |
| `channels.yuanbao.maxChars`                | 合并文本：每条消息最大字符数              | `3000`                                 |
| `channels.yuanbao.idleMs`                  | 合并文本：自动刷新前的空闲超时（毫秒）    | `5000`                                 |
| `channels.yuanbao.mediaMaxMb`              | 媒体大小限制（MB）                        | `20`                                   |
| `channels.yuanbao.historyLimit`            | 群聊历史上下文条数                        | `100`                                  |
| `channels.yuanbao.disableBlockStreaming`   | 禁用块级流式传输输出                      | `false`                                |
| `channels.yuanbao.fallbackReply`           | AI 未返回内容时的后备回复                 | `暂时无法解答，你可以换个问题问问我哦` |
| `channels.yuanbao.markdownHintEnabled`     | 注入 Markdown 防包装指令                  | `true`                                 |
| `channels.yuanbao.debugBotIds`             | 调试白名单机器人 ID（未净化日志）         | `[]`                                   |

---

## 支持的消息类型

### 接收

- ✅ 文本
- ✅ 图片
- ✅ 文件
- ✅ 音频/语音
- ✅ 视频
- ✅ 贴纸/自定义表情
- ✅ 自定义元素（链接卡片等）

### 发送

- ✅ 文本（支持 Markdown）
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频
- ✅ 贴纸

### 线程和回复

- ✅ 引用回复（通过 `replyToMode` 配置）
- ❌ 线程回复（平台不支持）

---

## 相关

- [频道概述](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私信认证和配对流程
- [群组](/channels/groups) — 群组聊天行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和安全加固
