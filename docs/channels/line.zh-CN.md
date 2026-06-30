---
summary: "LINE Messaging API 插件设置、配置和使用"
read_when:
  - 您想将 OpenClaw 连接到 LINE
  - 您需要 LINE webhook + 凭据设置
  - 您想了解 LINE 特定的消息选项
title: LINE
---

LINE 通过 LINE Messaging API 连接到 OpenClaw。插件作为网关上的 webhook 接收器运行，并使用您的频道访问令牌 + 频道密钥进行认证。

状态：可下载插件。支持私信、群组聊天、媒体、位置、Flex 消息、模板消息和快速回复。不支持反应和线程。

## 安装

在配置频道之前先安装 LINE：

```bash
openclaw plugins install @openclaw/line
```

从本地检出安装（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/line-plugin
```

## 设置

1. 创建 LINE 开发者账户并打开控制台：
   [https://developers.line.biz/console/](https://developers.line.biz/console/)
2. 创建（或选择）一个提供商并添加 **Messaging API** 频道。
3. 从频道设置中复制**频道访问令牌**和**频道密钥**。
4. 在 Messaging API 设置中启用**使用 Webhook**。
5. 将 Webhook URL 设置为您的网关端点（需要 HTTPS）：

```
https://gateway-host/line/webhook
```

网关响应 LINE 的 webhook 验证（GET）和入站事件（POST）。
如果您需要自定义路径，请设置 `channels.line.webhookPath` 或 `channels.line.accounts.<id>.webhookPath` 并相应更新 URL。

安全说明：

- LINE 签名验证依赖于正文（对原始正文的 HMAC），因此 OpenClaw 在验证之前应用严格的预认证正文限制和超时。
- OpenClaw 从已验证的原始请求字节处理 webhook 事件。上游中间件转换的 `req.body` 值出于签名完整性安全原因被忽略。

## 配置

最小配置：

```json5
{
  channels: {
    line: {
      enabled: true,
      channelAccessToken: "LINE_CHANNEL_ACCESS_TOKEN",
      channelSecret: "LINE_CHANNEL_SECRET",
      dmPolicy: "pairing",
    },
  },
}
```

环境变量（仅默认账户）：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

令牌/密钥文件：

```json5
{
  channels: {
    line: {
      tokenFile: "/path/to/line-token.txt",
      secretFile: "/path/to/line-secret.txt",
    },
  },
}
```

`tokenFile` 和 `secretFile` 必须指向常规文件。拒绝符号链接。

多账户：

```json5
{
  channels: {
    line: {
      accounts: {
        marketing: {
          channelAccessToken: "...",
          channelSecret: "...",
          webhookPath: "/line/marketing",
        },
      },
    },
  },
}
```

## 访问控制

私信默认使用配对。未知发送者获得配对码，其消息在批准之前被忽略。

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

白名单和策略：

- `channels.line.dmPolicy`：`pairing | allowlist | open | disabled`
- `channels.line.allowFrom`：私信的白名单 LINE 用户 ID
- `channels.line.groupPolicy`：`allowlist | open | disabled`
- `channels.line.groupAllowFrom`：群组的白名单 LINE 用户 ID
- 每群组覆盖：`channels.line.groups.<groupId>.allowFrom`
- 运行时说明：如果 `channels.line` 完全缺失，运行时回退到 `groupPolicy="allowlist"` 进行群组检查（即使设置了 `channels.defaults.groupPolicy`）。

LINE ID 区分大小写。有效 ID 看起来像：

- 用户：`U` + 32 个十六进制字符
- 群组：`C` + 32 个十六进制字符
- 房间：`R` + 32 个十六进制字符

## 消息行为

- 文本在 5000 个字符处分块。
- Markdown 格式被删除；代码块和表格在可能时转换为 Flex 卡片。
- 流式响应被缓冲；LINE 接收完整块，同时智能体工作时显示加载动画。
- 媒体下载上限为 `channels.line.mediaMaxMb`（默认 10）。
- 入站媒体在传递给智能体之前保存在 `~/.openclaw/media/inbound/` 下，与其他捆绑频道插件使用的共享媒体存储匹配。

## 频道数据（富消息）

使用 `channelData.line` 发送快速回复、位置、Flex 卡片或模板消息。

```json5
{
  text: "Here you go",
  channelData: {
    line: {
      quickReplies: ["Status", "Help"],
      location: {
        title: "Office",
        address: "123 Main St",
        latitude: 35.681236,
        longitude: 139.767125,
      },
      flexMessage: {
        altText: "Status card",
        contents: {
          /* Flex payload */
        },
      },
      templateMessage: {
        type: "confirm",
        text: "Proceed?",
        confirmLabel: "Yes",
        confirmData: "yes",
        cancelLabel: "No",
        cancelData: "no",
      },
    },
  },
}
```

LINE 插件还提供 `/card` 命令用于 Flex 消息预设：

```
/card info "Welcome" "Thanks for joining!"
```

## ACP 支持

LINE 支持 ACP（Agent Communication Protocol）对话绑定：

- `/acp spawn <agent> --bind here` 将当前 LINE 聊天绑定到 ACP 会话，而不创建子线程。
- 配置的 ACP 绑定和活动的对话绑定 ACP 会话在 LINE 上与其他对话频道一样工作。

详情请参阅 [ACP 智能体](/tools/acp-agents)。

## 出站媒体

LINE 插件支持通过智能体消息工具发送图片、视频和音频文件。媒体通过 LINE 特定的交付路径发送，并带有适当的预览和跟踪处理：

- **图片**：作为 LINE 图片消息发送，自动生成预览。
- **视频**：带有明确的预览和内容类型处理发送。
- **音频**：作为 LINE 音频消息发送。

出站媒体 URL 必须是公共 HTTPS URL。OpenClaw 在将 URL 传递给 LINE 之前验证目标主机名，并拒绝回环、链路本地和私有网络目标。

当 LINE 特定路径不可用时，通用媒体发送回退到仅图片路由。

## 故障排查

- **Webhook 验证失败：** 确保 Webhook URL 是 HTTPS，并且 `channelSecret` 与 LINE 控制台匹配。
- **没有入站事件：** 确认 Webhook 路径与 `channels.line.webhookPath` 匹配，并且网关可从 LINE 访问。
- **媒体下载错误：** 如果媒体超过默认限制，请提高 `channels.line.mediaMaxMb`。

## 相关文档

- [频道概述](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私信认证和配对流程
- [群组](/channels/groups) — 群组聊天行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和安全加固
