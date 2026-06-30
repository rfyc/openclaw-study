---
summary: "Synology Chat Webhook 设置和 OpenClaw 配置"
read_when:
  - 在 OpenClaw 中设置 Synology Chat
  - 调试 Synology Chat Webhook 路由
title: "Synology Chat"
---

状态：使用 Synology Chat Webhook 的捆绑插件直接消息频道。
该插件接受来自 Synology Chat 传出 Webhook 的入站消息，并通过 Synology Chat 传入 Webhook 发送回复。

## 捆绑插件

Synology Chat 作为当前 OpenClaw 发行版中的捆绑插件提供，因此正常打包构建不需要单独安装。

如果您使用的是旧版构建或不包含 Synology Chat 的自定义安装，请手动安装：

从本地检出安装：

```bash
openclaw plugins install ./path/to/local/synology-chat-plugin
```

详情：[插件](/tools/plugin)

## 快速设置

1. 确保 Synology Chat 插件可用。
   - 当前打包的 OpenClaw 发行版已捆绑它。
   - 旧版/自定义安装可以使用上述命令从源码检出手动添加。
   - `openclaw onboard` 现在在与 `openclaw channels add` 相同的频道设置列表中显示 Synology Chat。
   - 非交互式设置：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
2. 在 Synology Chat 集成中：
   - 创建传入 Webhook 并复制其 URL。
   - 使用您的密钥 Token 创建传出 Webhook。
3. 将传出 Webhook URL 指向您的 OpenClaw 网关：
   - 默认为 `https://gateway-host/webhook/synology`。
   - 或您的自定义 `channels.synology-chat.webhookPath`。
4. 在 OpenClaw 中完成设置。
   - 引导式：`openclaw onboard`
   - 直接：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
5. 重启网关并向 Synology Chat 机器人发送私信。

Webhook 认证详情：

- OpenClaw 按以下顺序接受传出 Webhook Token：`body.token`，然后 `?token=...`，然后请求头。
- 接受的请求头格式：
  - `x-synology-token`
  - `x-webhook-token`
  - `x-openclaw-token`
  - `Authorization: Bearer <token>`
- 空或缺失的 Token 会拒绝失败。

最小配置：

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      token: "synology-outgoing-token",
      incomingUrl: "https://nas.example.com/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token=...",
      webhookPath: "/webhook/synology",
      dmPolicy: "allowlist",
      allowedUserIds: ["123456"],
      rateLimitPerMinute: 30,
      allowInsecureSsl: false,
    },
  },
}
```

## 环境变量

对于默认账户，您可以使用环境变量：

- `SYNOLOGY_CHAT_TOKEN`
- `SYNOLOGY_CHAT_INCOMING_URL`
- `SYNOLOGY_NAS_HOST`
- `SYNOLOGY_ALLOWED_USER_IDS`（逗号分隔）
- `SYNOLOGY_RATE_LIMIT`
- `OPENCLAW_BOT_NAME`

配置值会覆盖环境变量。

`SYNOLOGY_CHAT_INCOMING_URL` 不能从工作区 `.env` 文件设置；请参阅[工作区 `.env` 文件](/gateway/security)。

## 私信策略和访问控制

- 推荐默认使用 `dmPolicy: "allowlist"`。
- `allowedUserIds` 接受 Synology 用户 ID 列表（或逗号分隔的字符串）。
- 在 `allowlist` 模式下，空的 `allowedUserIds` 列表被视为错误配置，Webhook 路由不会启动（使用 `dmPolicy: "open"` 加 `allowedUserIds: ["*"]` 允许所有人）。
- `dmPolicy: "open"` 仅在 `allowedUserIds` 包含 `"*"` 时允许公开私信；有限制性条目时，只有匹配的用户可以聊天。
- `dmPolicy: "disabled"` 阻止私信。
- 回复接收者绑定默认使用稳定的数字 `user_id`。`channels.synology-chat.dangerouslyAllowNameMatching: true` 是紧急兼容模式，重新启用可变用户名/昵称查找用于回复投递。
- 配对审批适用于：
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## 出站投递

使用数字 Synology Chat 用户 ID 作为目标。

示例：

```bash
openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
openclaw message send --channel synology-chat --target synology:123456 --text "Short prefix"
```

支持基于 URL 的文件投递媒体发送。
出站文件 URL 必须使用 `http` 或 `https`，私有或其他被阻止的网络目标在 OpenClaw 将 URL 转发到 NAS Webhook 之前会被拒绝。

## 多账户

`channels.synology-chat.accounts` 下支持多个 Synology Chat 账户。
每个账户可以覆盖 Token、传入 URL、Webhook 路径、私信策略和限制。
直接消息会话按账户和用户隔离，因此两个不同 Synology 账户上相同的数字 `user_id` 不共享对话状态。
为每个启用的账户设置不同的 `webhookPath`。OpenClaw 现在拒绝重复的精确路径，并拒绝在多账户设置中仅继承共享 Webhook 路径的命名账户启动。
如果您确实需要命名账户的旧版继承，请在该账户或 `channels.synology-chat` 处设置 `dangerouslyAllowInheritedWebhookPath: true`，但重复的精确路径仍会被拒绝失败。推荐使用显式的每账户路径。

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      accounts: {
        default: {
          token: "token-a",
          incomingUrl: "https://nas-a.example.com/...token=...",
        },
        alerts: {
          token: "token-b",
          incomingUrl: "https://nas-b.example.com/...token=...",
          webhookPath: "/webhook/synology-alerts",
          dmPolicy: "allowlist",
          allowedUserIds: ["987654"],
        },
      },
    },
  },
}
```

## 安全说明

- 保持 `token` 机密，如果泄露请轮换。
- 保持 `allowInsecureSsl: false`，除非您明确信任自签名的本地 NAS 证书。
- 入站 Webhook 请求经过 Token 验证，并对每个发件人进行速率限制。
- 无效 Token 检查使用常量时间密钥比较，失败关闭。
- 生产环境推荐使用 `dmPolicy: "allowlist"`。
- 除非明确需要基于旧版用户名的回复投递，否则保持 `dangerouslyAllowNameMatching` 关闭。
- 除非在多账户设置中明确接受共享路径路由风险，否则保持 `dangerouslyAllowInheritedWebhookPath` 关闭。

## 故障排查

- `Missing required fields (token, user_id, text)`：
  - 传出 Webhook 有效负载缺少必填字段之一
  - 如果 Synology 在请求头中发送 Token，确保网关/代理保留这些请求头
- `Invalid token`：
  - 传出 Webhook 密钥与 `channels.synology-chat.token` 不匹配
  - 请求命中了错误的账户/Webhook 路径
  - 反向代理在请求到达 OpenClaw 之前剥离了 Token 请求头
- `Rate limit exceeded`：
  - 来自同一来源的过多无效 Token 尝试可能暂时锁定该来源
  - 经过认证的发件人也有单独的每用户消息速率限制
- `Allowlist is empty. Configure allowedUserIds or use dmPolicy=open with allowedUserIds=["*"].`：
  - `dmPolicy="allowlist"` 已启用但未配置任何用户
- `User not authorized`：
  - 发件人的数字 `user_id` 不在 `allowedUserIds` 中

## 相关

- [频道概述](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私信认证和配对流程
- [群组](/channels/groups) — 群组聊天行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和安全加固
