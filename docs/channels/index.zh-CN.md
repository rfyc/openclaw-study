---
summary: "OpenClaw 可以连接的消息平台"
read_when:
  - 您想为 OpenClaw 选择聊天频道
  - 您需要快速了解支持的消息平台
title: "聊天频道"
---

OpenClaw 可以在您已经使用的任何聊天应用上与您交流。每个频道通过网关连接。
文本在任何地方都受支持；媒体和反应因频道而异。

## 交付说明

- 包含 Markdown 图片语法（如 `![alt](url)`）的 Telegram 回复在可能时会在最终出站路径上转换为媒体回复。
- Slack 多人私信作为群组聊天路由，因此群组策略、提及行为和群组会话规则适用于 MPIM 对话。
- WhatsApp 设置是按需安装：引导可以在安装插件包之前显示设置流程，网关仅在频道实际激活时加载 WhatsApp 运行时。

## 支持的频道

- [BlueBubbles](/channels/bluebubbles) — **推荐用于 iMessage**；使用 BlueBubbles macOS 服务器 REST API，功能完整（捆绑插件；编辑、撤回、效果、反应、群组管理——编辑在 macOS 26 Tahoe 上目前已损坏）。
- [Discord](/channels/discord) — Discord Bot API + 网关；支持服务器、频道和私信。
- [Feishu](/channels/feishu) — 通过 WebSocket 的飞书/Lark 机器人（捆绑插件）。
- [Google Chat](/channels/googlechat) — 通过 HTTP webhook 的 Google Chat API 应用（可下载插件）。
- [iMessage（旧版）](/channels/imessage) — 通过 imsg CLI 的旧版 macOS 集成（已弃用，新设置请使用 BlueBubbles）。
- [IRC](/channels/irc) — 经典 IRC 服务器；频道 + 私信，带配对/白名单控制。
- [LINE](/channels/line) — LINE Messaging API 机器人（可下载插件）。
- [Matrix](/channels/matrix) — Matrix 协议（可下载插件）。
- [Mattermost](/channels/mattermost) — Bot API + WebSocket；频道、群组、私信（可下载插件）。
- [Microsoft Teams](/channels/msteams) — Bot Framework；企业支持（捆绑插件）。
- [Nextcloud Talk](/channels/nextcloud-talk) — 通过 Nextcloud Talk 的自托管聊天（捆绑插件）。
- [Nostr](/channels/nostr) — 通过 NIP-04 的去中心化私信（捆绑插件）。
- [QQ Bot](/channels/qqbot) — QQ Bot API；私聊、群聊和富媒体（捆绑插件）。
- [Signal](/channels/signal) — signal-cli；注重隐私。
- [Slack](/channels/slack) — Bolt SDK；工作区应用。
- [Synology Chat](/channels/synology-chat) — 通过出站+入站 webhook 的 Synology NAS Chat（捆绑插件）。
- [Telegram](/channels/telegram) — 通过 grammY 的 Bot API；支持群组。
- [Tlon](/channels/tlon) — 基于 Urbit 的消息平台（捆绑插件）。
- [Twitch](/channels/twitch) — 通过 IRC 连接的 Twitch 聊天（捆绑插件）。
- [语音通话](/plugins/voice-call) — 通过 Plivo 或 Twilio 的电话（插件，单独安装）。
- [WebChat](/web/webchat) — 通过 WebSocket 的网关 WebChat UI。
- [WeChat](/channels/wechat) — 通过 QR 登录的腾讯 iLink Bot 插件；仅限私聊（外部插件）。
- [WhatsApp](/channels/whatsapp) — 最受欢迎；使用 Baileys 并需要 QR 配对。
- [元宝](/channels/yuanbao) — 腾讯元宝机器人（外部插件）。
- [Zalo](/channels/zalo) — Zalo Bot API；越南流行的消息平台（捆绑插件）。
- [Zalo 个人版](/channels/zalouser) — 通过 QR 登录的 Zalo 个人账户（捆绑插件）。

## 说明

- 频道可以同时运行；配置多个，OpenClaw 将按聊天路由。
- 最快的设置通常是 **Telegram**（简单的机器人令牌）。WhatsApp 需要 QR 配对，并在磁盘上存储更多状态。
- 群组行为因频道而异；请参阅[群组](/channels/groups)。
- 私信配对和白名单出于安全考虑强制执行；请参阅[安全性](/gateway/security)。
- 故障排查：[频道故障排查](/channels/troubleshooting)。
- 模型提供商单独记录；请参阅[模型提供商](/providers/models)。
