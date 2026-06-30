---
summary: "`openclaw message` 的 CLI 参考（发送 + 频道操作）"
read_when:
  - 添加或修改消息 CLI 操作时
  - 更改出站频道行为时
title: "Message"
---

# `openclaw message`

用于发送消息和频道操作的单一出站命令
（Discord/Google Chat/iMessage/Matrix/Mattermost（插件）/Microsoft Teams/Signal/Slack/Telegram/WhatsApp）。

## 用法

```
openclaw message <subcommand> [flags]
```

频道选择：

- 如果配置了多个频道，`--channel` 是必填的。
- 如果只配置了一个频道，它将成为默认值。
- 值：`discord|googlechat|imessage|matrix|mattermost|msteams|signal|slack|telegram|whatsapp`（Mattermost 需要插件）
- 当 `--channel` 或带频道前缀的目标（如 `discord:...`）存在时，`openclaw message` 将所选频道解析为其拥有的插件；否则加载已配置的频道插件进行默认频道推断。

目标格式（`--target`）：

- WhatsApp：E.164、群组 JID 或 WhatsApp 频道/Newsletter JID（`...@newsletter`）
- Telegram：聊天 ID、`@username` 或论坛话题目标（`-1001234567890:topic:42`，或 `--thread-id 42`）
- Discord：`channel:<id>` 或 `user:<id>`（或 `<@id>` 提及；原始数字 ID 被视为频道）
- Google Chat：`spaces/<spaceId>` 或 `users/<userId>`
- Slack：`channel:<id>` 或 `user:<id>`（接受原始频道 ID）
- Mattermost（插件）：`channel:<id>`、`user:<id>` 或 `@username`（裸 ID 被视为频道）
- Signal：`+E.164`、`group:<id>`、`signal:+E.164`、`signal:group:<id>` 或 `username:<name>`/`u:<name>`
- iMessage：句柄、`chat_id:<id>`、`chat_guid:<guid>` 或 `chat_identifier:<id>`
- Matrix：`@user:server`、`!room:server` 或 `#alias:server`
- Microsoft Teams：对话 ID（`19:...@thread.tacv2`）或 `conversation:<id>` 或 `user:<aad-object-id>`

名称查找：

- 对于支持的提供商（Discord/Slack 等），频道名称（如 `Help` 或 `#help`）通过目录缓存解析。
- 在缓存未命中时，如果提供商支持，OpenClaw 将尝试实时目录查找。

## 通用标志

- `--channel <name>`
- `--account <id>`
- `--target <dest>`（发送/轮询/读取等的目标频道或用户）
- `--targets <name>`（重复；仅广播）
- `--json`
- `--dry-run`
- `--verbose`

## SecretRef 行为

- `openclaw message` 在运行所选操作之前解析支持的频道 SecretRef。
- 解析在可能时限定到活跃操作目标：
  - 当设置 `--channel`（或从带前缀的目标（如 `discord:...`）推断）时，限定到频道
  - 当设置 `--account` 时，限定到账户（频道全局 + 所选账户表面）
  - 当省略 `--account` 时，OpenClaw 不强制 `default` 账户 SecretRef 范围
- 不相关频道上未解析的 SecretRef 不会阻止有针对性的消息操作。
- 如果所选频道/账户 SecretRef 未解析，命令对该操作失败关闭。

## 操作

### 核心

- `send`
  - 频道：WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（插件）/Signal/iMessage/Matrix/Microsoft Teams
  - 必填：`--target`，加上 `--message`、`--media` 或 `--presentation`
  - 可选：`--media`、`--presentation`、`--delivery`、`--pin`、`--reply-to`、`--thread-id`、`--gif-playback`、`--force-document`、`--silent`
  - 共享展示内容：`--presentation` 发送语义块（`text`、`context`、`divider`、`buttons`、`select`），核心通过所选频道的声明能力进行渲染。请参阅[消息展示](/plugins/message-presentation)。
  - 通用交付偏好：`--delivery` 接受交付提示，如 `{ "pin": true }`；`--pin` 是频道支持时固定交付的简写。
  - 仅 Telegram：`--force-document`（将图像和 GIF 作为文档发送以避免 Telegram 压缩）
  - 仅 Telegram：`--thread-id`（论坛话题 ID）
  - 仅 Slack：`--thread-id`（线程时间戳；`--reply-to` 使用相同字段）
  - Telegram + Discord：`--silent`
  - 仅 WhatsApp：`--gif-playback`；WhatsApp 频道/Newsletter 使用其原生 `@newsletter` JID 寻址。

- `poll`
  - 频道：WhatsApp/Telegram/Discord/Matrix/Microsoft Teams
  - 必填：`--target`、`--poll-question`、`--poll-option`（重复）
  - 可选：`--poll-multi`
  - 仅 Discord：`--poll-duration-hours`、`--silent`、`--message`
  - 仅 Telegram：`--poll-duration-seconds`（5-600）、`--silent`、`--poll-anonymous` / `--poll-public`、`--thread-id`

- `react`
  - 频道：Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/Matrix
  - 必填：`--message-id`、`--target`
  - 可选：`--emoji`、`--remove`、`--participant`、`--from-me`、`--target-author`、`--target-author-uuid`
  - 注意：`--remove` 需要 `--emoji`（省略 `--emoji` 以在支持时清除自己的反应；请参阅 /tools/reactions）
  - 仅 WhatsApp：`--participant`、`--from-me`
  - Signal 群组反应：需要 `--target-author` 或 `--target-author-uuid`

- `reactions`
  - 频道：Discord/Google Chat/Slack/Matrix
  - 必填：`--message-id`、`--target`
  - 可选：`--limit`

- `read`
  - 频道：Discord/Slack/Matrix
  - 必填：`--target`
  - 可选：`--limit`、`--message-id`、`--before`、`--after`
  - 仅 Slack：`--message-id` 读取特定的 Slack 消息时间戳；结合 `--thread-id` 读取精确的线程回复。
  - 仅 Discord：`--around`

- `edit`
  - 频道：Discord/Slack/Matrix
  - 必填：`--message-id`、`--message`、`--target`

- `delete`
  - 频道：Discord/Slack/Telegram/Matrix
  - 必填：`--message-id`、`--target`

- `pin` / `unpin`
  - 频道：Discord/Slack/Matrix
  - 必填：`--message-id`、`--target`

- `pins`（列出）
  - 频道：Discord/Slack/Matrix
  - 必填：`--target`

- `permissions`
  - 频道：Discord/Matrix
  - 必填：`--target`
  - 仅 Matrix：当 Matrix 加密启用且允许验证操作时可用

- `search`
  - 频道：Discord
  - 必填：`--guild-id`、`--query`
  - 可选：`--channel-id`、`--channel-ids`（重复）、`--author-id`、`--author-ids`（重复）、`--limit`

### 线程

- `thread create`
  - 频道：Discord
  - 必填：`--thread-name`、`--target`（频道 ID）
  - 可选：`--message-id`、`--message`、`--auto-archive-min`

- `thread list`
  - 频道：Discord
  - 必填：`--guild-id`
  - 可选：`--channel-id`、`--include-archived`、`--before`、`--limit`

- `thread reply`
  - 频道：Discord
  - 必填：`--target`（线程 ID）、`--message`
  - 可选：`--media`、`--reply-to`

### 表情符号

- `emoji list`
  - Discord：`--guild-id`
  - Slack：无额外标志

- `emoji upload`
  - 频道：Discord
  - 必填：`--guild-id`、`--emoji-name`、`--media`
  - 可选：`--role-ids`（重复）

### 贴纸

- `sticker send`
  - 频道：Discord
  - 必填：`--target`、`--sticker-id`（重复）
  - 可选：`--message`

- `sticker upload`
  - 频道：Discord
  - 必填：`--guild-id`、`--sticker-name`、`--sticker-desc`、`--sticker-tags`、`--media`

### 角色 / 频道 / 成员 / 语音

- `role info`（Discord）：`--guild-id`
- `role add` / `role remove`（Discord）：`--guild-id`、`--user-id`、`--role-id`
- `channel info`（Discord）：`--target`
- `channel list`（Discord）：`--guild-id`
- `member info`（Discord/Slack）：`--user-id`（Discord 还需要 `--guild-id`）
- `voice status`（Discord）：`--guild-id`、`--user-id`

### 活动

- `event list`（Discord）：`--guild-id`
- `event create`（Discord）：`--guild-id`、`--event-name`、`--start-time`
  - 可选：`--end-time`、`--desc`、`--channel-id`、`--location`、`--event-type`

### 管理（Discord）

- `timeout`：`--guild-id`、`--user-id`（可选 `--duration-min` 或 `--until`；两者都省略以清除超时）
- `kick`：`--guild-id`、`--user-id`（+ `--reason`）
- `ban`：`--guild-id`、`--user-id`（+ `--delete-days`、`--reason`）
  - `timeout` 还支持 `--reason`

### 广播

- `broadcast`
  - 频道：任何已配置的频道；使用 `--channel all` 针对所有提供商
  - 必填：`--targets <target...>`
  - 可选：`--message`、`--media`、`--dry-run`

## 示例

发送 Discord 回复：

```
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

发送带有语义按钮的消息：

```
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Approve","value":"approve","style":"success"},{"label":"Decline","value":"decline","style":"danger"}]}]}'
```

核心将相同的 `presentation` 内容根据频道能力渲染为 Discord 组件、Slack 块、Telegram 内联按钮、Mattermost props 或 Teams/Feishu 卡片。有关完整合同和回退规则，请参阅[消息展示](/plugins/message-presentation)。

发送更丰富的展示内容：

```bash
openclaw message send --channel googlechat --target spaces/AAA... \
  --message "Choose:" \
  --presentation '{"title":"Deploy approval","tone":"warning","blocks":[{"type":"text","text":"Choose a path"},{"type":"buttons","buttons":[{"label":"Approve","value":"approve"},{"label":"Decline","value":"decline"}]}]}'
```

创建 Discord 投票：

```
openclaw message poll --channel discord \
  --target channel:123 \
  --poll-question "Snack?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-multi --poll-duration-hours 48
```

创建 Telegram 投票（2 分钟后自动关闭）：

```
openclaw message poll --channel telegram \
  --target @mychat \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-duration-seconds 120 --silent
```

发送 Teams 主动消息：

```
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 --message "hi"
```

创建 Teams 投票：

```
openclaw message poll --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi
```

在 Slack 中添加反应：

```
openclaw message react --channel slack \
  --target C123 --message-id 456 --emoji "✅"
```

在 Signal 群组中添加反应：

```
openclaw message react --channel signal \
  --target signal:group:abc123 --message-id 1737630212345 \
  --emoji "✅" --target-author-uuid 123e4567-e89b-12d3-a456-426614174000
```

通过通用展示发送 Telegram 内联按钮：

```
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Yes","value":"cmd:yes"},{"label":"No","value":"cmd:no"}]}]}'
```

通过通用展示发送 Teams 卡片：

```bash
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --presentation '{"title":"Status update","blocks":[{"type":"text","text":"Build completed"}]}'
```

将 Telegram 图像作为文档发送以避免压缩：

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```

## 相关

- [CLI 参考](/cli)
- [代理发送](/tools/agent-send)
