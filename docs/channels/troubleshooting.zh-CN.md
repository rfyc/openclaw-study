---
summary: "快速频道级故障排查，包含每个频道的故障特征和修复方法"
read_when:
  - 频道传输显示已连接但回复失败
  - 在深入阅读提供者文档之前需要频道特定检查
title: "频道故障排查"
---

当频道已连接但行为异常时，使用此页面。

## 命令梯形诊断

首先按顺序运行这些命令：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

健康基线：

- `Runtime: running`
- `Connectivity probe: ok`
- `Capability: read-only`、`write-capable` 或 `admin-capable`
- 频道探测显示传输已连接，在支持的地方显示 `works` 或 `audit ok`

## WhatsApp

### WhatsApp 故障特征

| 症状                  | 最快检查                                       | 修复                                                                               |
| --------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| 已连接但没有私信回复  | `openclaw pairing list whatsapp`               | 批准发件人或切换私信策略/白名单。                                                  |
| 群组消息被忽略        | 检查配置中的 `requireMention` + 提及模式       | 提及机器人或为该群组放宽提及策略。                                                 |
| QR 登录超时返回 408   | 检查网关 `HTTPS_PROXY` / `HTTP_PROXY` 环境变量 | 设置可达的代理；仅对绕过使用 `NO_PROXY`。                                          |
| 随机断开/重新登录循环 | `openclaw channels status --probe` + 日志      | 即使当前已连接也会标记最近的重新连接；观察日志，重启网关，如果继续抖动则重新链接。 |

完整故障排查：[WhatsApp 故障排查](/channels/whatsapp#troubleshooting)

## Telegram

### Telegram 故障特征

| 症状                          | 最快检查                               | 修复                                                                                                   |
| ----------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/start` 但没有可用的回复流   | `openclaw pairing list telegram`       | 批准配对或更改私信策略。                                                                               |
| 机器人在线但群组保持沉默      | 验证提及要求和机器人隐私模式           | 禁用隐私模式以获得群组可见性或提及机器人。                                                             |
| 发送失败伴随网络错误          | 检查日志中的 Telegram API 调用失败     | 修复到 `api.telegram.org` 的 DNS/IPv6/代理路由。                                                       |
| 启动报告 `getMe returned 401` | 检查配置的 Token 来源                  | 重新复制或重新生成 BotFather Token，并更新 `botToken`、`tokenFile` 或默认账户的 `TELEGRAM_BOT_TOKEN`。 |
| 轮询停止或重新连接缓慢        | `openclaw logs --follow` 查看轮询诊断  | 升级；如果重启是误报，调整 `pollingStallThresholdMs`。持续停止仍然指向代理/DNS/IPv6 问题。             |
| 启动时 `setMyCommands` 被拒绝 | 检查日志中的 `BOT_COMMANDS_TOO_MUCH`   | 减少插件/技能/自定义 Telegram 命令或禁用原生菜单。                                                     |
| 升级后白名单阻止您            | `openclaw security audit` 和配置白名单 | 运行 `openclaw doctor --fix` 或将 `@username` 替换为数字发件人 ID。                                    |

完整故障排查：[Telegram 故障排查](/channels/telegram#troubleshooting)

## Discord

### Discord 故障特征

| 症状                                 | 最快检查                                                   | 修复                                                                                                                       |
| ------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 机器人在线但没有服务器回复           | `openclaw channels status --probe`                         | 允许服务器/频道并验证消息内容 intent。                                                                                     |
| 群组消息被忽略                       | 检查日志中的提及门控丢弃                                   | 提及机器人或设置服务器/频道 `requireMention: false`。                                                                      |
| 输入/Token 被使用但没有 Discord 消息 | 会话日志显示带 `didSendViaMessagingTool: false` 的助手文本 | 模型私下回答而不是调用消息工具。使用可靠调用工具的模型，或设置 `messages.groupChat.visibleReplies: "automatic"` 自动发布。 |
| 私信回复缺失                         | `openclaw pairing list discord`                            | 批准私信配对或调整私信策略。                                                                                               |

完整故障排查：[Discord 故障排查](/channels/discord#troubleshooting)

## Slack

### Slack 故障特征

| 症状                         | 最快检查                           | 修复                                                                                                                                  |
| ---------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Socket mode 已连接但没有响应 | `openclaw channels status --probe` | 验证应用 Token + bot Token 和所需权限范围；注意 SecretRef 支持设置上的 `botTokenStatus` / `appTokenStatus = configured_unavailable`。 |
| 私信被阻止                   | `openclaw pairing list slack`      | 批准配对或放宽私信策略。                                                                                                              |
| 频道消息被忽略               | 检查 `groupPolicy` 和频道白名单    | 允许频道或将策略切换为 `open`。                                                                                                       |

完整故障排查：[Slack 故障排查](/channels/slack#troubleshooting)

## iMessage 和 BlueBubbles

### iMessage 和 BlueBubbles 故障特征

| 症状                          | 最快检查                                                                | 修复                                         |
| ----------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| 没有入站事件                  | 验证 Webhook/服务器可达性和应用权限                                     | 修复 Webhook URL 或 BlueBubbles 服务器状态。 |
| 可以发送但在 macOS 上无法接收 | 检查 Messages 自动化的 macOS 隐私权限                                   | 重新授予 TCC 权限并重启频道进程。            |
| 私信发件人被阻止              | `openclaw pairing list imessage` 或 `openclaw pairing list bluebubbles` | 批准配对或更新白名单。                       |

完整故障排查：

- [iMessage 故障排查](/channels/imessage#troubleshooting)
- [BlueBubbles 故障排查](/channels/bluebubbles#troubleshooting)

## Signal

### Signal 故障特征

| 症状                     | 最快检查                           | 修复                                            |
| ------------------------ | ---------------------------------- | ----------------------------------------------- |
| 守护进程可达但机器人沉默 | `openclaw channels status --probe` | 验证 `signal-cli` 守护进程 URL/账户和接收模式。 |
| 私信被阻止               | `openclaw pairing list signal`     | 批准发件人或调整私信策略。                      |
| 群组回复不触发           | 检查群组白名单和提及模式           | 添加发件人/群组或放宽门控。                     |

完整故障排查：[Signal 故障排查](/channels/signal#troubleshooting)

## QQ Bot

### QQ Bot 故障特征

| 症状                     | 最快检查                               | 修复                                                |
| ------------------------ | -------------------------------------- | --------------------------------------------------- |
| 机器人回复"gone to Mars" | 验证配置中的 `appId` 和 `clientSecret` | 设置凭据或重启网关。                                |
| 没有入站消息             | `openclaw channels status --probe`     | 在 QQ 开放平台验证凭据。                            |
| 语音未被转录             | 检查 STT 提供者配置                    | 配置 `channels.qqbot.stt` 或 `tools.media.audio`。  |
| 主动消息未到达           | 检查 QQ 平台互动要求                   | QQ 可能在没有最近互动的情况下阻止机器人发起的消息。 |

完整故障排查：[QQ Bot 故障排查](/channels/qqbot#troubleshooting)

## Matrix

### Matrix 故障特征

| 症状                    | 最快检查                               | 修复                                                                  |
| ----------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| 已登录但忽略房间消息    | `openclaw channels status --probe`     | 检查 `groupPolicy`、房间白名单和提及门控。                            |
| 私信不处理              | `openclaw pairing list matrix`         | 批准发件人或调整私信策略。                                            |
| 加密房间失败            | `openclaw matrix verify status`        | 重新验证设备，然后检查 `openclaw matrix verify backup status`。       |
| 备份还原待处理/损坏     | `openclaw matrix verify backup status` | 运行 `openclaw matrix verify backup restore` 或使用恢复密钥重新运行。 |
| 交叉签名/引导看起来错误 | `openclaw matrix verify bootstrap`     | 一次性修复密钥存储、交叉签名和备份状态。                              |

完整设置和配置：[Matrix](/channels/matrix)

## 相关

- [配对](/channels/pairing)
- [频道路由](/channels/channel-routing)
- [网关故障排查](/gateway/troubleshooting)
