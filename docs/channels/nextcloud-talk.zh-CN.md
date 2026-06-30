---
summary: "Nextcloud Talk 支持状态、功能和配置"
read_when:
  - 正在开发 Nextcloud Talk 频道功能
title: "Nextcloud Talk"
---

状态：捆绑插件（Webhook 机器人）。支持私信、房间、反应和 Markdown 消息。

## 捆绑插件

当前 OpenClaw 版本将 Nextcloud Talk 作为捆绑插件提供，因此正常的打包版本不需要单独安装。

如果您使用的是旧版本或不包含 Nextcloud Talk 的自定义安装，请直接安装 npm 包：

通过 CLI 安装（npm 仓库）：

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

使用裸包以跟随当前官方发布标签。仅在需要可重现安装时才固定确切版本。

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/nextcloud-talk-plugin
```

详情：[插件](/tools/plugin)

## 快速设置（初学者）

1. 确保 Nextcloud Talk 插件可用。
   - 当前打包的 OpenClaw 版本已捆绑它。
   - 旧版/自定义安装可以使用上述命令手动添加。
2. 在您的 Nextcloud 服务器上创建机器人：

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature reaction
   ```

3. 在目标房间设置中启用机器人。
4. 配置 OpenClaw：
   - 配置：`channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - 或环境变量：`NEXTCLOUD_TALK_BOT_SECRET`（仅默认账户）

   CLI 设置：

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --url https://cloud.example.com \
     --token "<shared-secret>"
   ```

   等效的显式字段：

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --base-url https://cloud.example.com \
     --secret "<shared-secret>"
   ```

   文件支持的密钥：

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --base-url https://cloud.example.com \
     --secret-file /path/to/nextcloud-talk-secret
   ```

5. 重启网关（或完成设置）。

最小配置：

```json5
{
  channels: {
    "nextcloud-talk": {
      enabled: true,
      baseUrl: "https://cloud.example.com",
      botSecret: "shared-secret",
      dmPolicy: "pairing",
    },
  },
}
```

## 说明

- 机器人不能主动发起私信。用户必须先向机器人发送消息。
- Webhook URL 必须可由网关访问；如果在代理后面，请设置 `webhookPublicUrl`。
- 机器人 API 不支持媒体上传；媒体以 URL 形式发送。
- Webhook 有效负载不区分私信和房间；设置 `apiUser` + `apiPassword` 以启用房间类型查找（否则私信将被视为房间）。

## 访问控制（私信）

- 默认：`channels.nextcloud-talk.dmPolicy = "pairing"`。未知发送者获得配对码。
- 通过以下方式批准：
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- 公开私信：`channels.nextcloud-talk.dmPolicy="open"` 加上 `channels.nextcloud-talk.allowFrom=["*"]`。
- `allowFrom` 仅匹配 Nextcloud 用户 ID；显示名称被忽略。

## 房间（群组）

- 默认：`channels.nextcloud-talk.groupPolicy = "allowlist"`（提及门控）。
- 使用 `channels.nextcloud-talk.rooms` 将房间加入白名单：

```json5
{
  channels: {
    "nextcloud-talk": {
      rooms: {
        "room-token": { requireMention: true },
      },
    },
  },
}
```

- 要禁止所有房间，保持白名单为空或设置 `channels.nextcloud-talk.groupPolicy="disabled"`。

## 功能

| 功能     | 状态   |
| -------- | ------ |
| 私信     | 支持   |
| 房间     | 支持   |
| 线程     | 不支持 |
| 媒体     | 仅 URL |
| 反应     | 支持   |
| 原生命令 | 不支持 |

## 配置参考（Nextcloud Talk）

完整配置：[配置](/gateway/configuration)

提供商选项：

- `channels.nextcloud-talk.enabled`：启用/禁用频道启动。
- `channels.nextcloud-talk.baseUrl`：Nextcloud 实例 URL。
- `channels.nextcloud-talk.botSecret`：机器人共享密钥。
- `channels.nextcloud-talk.botSecretFile`：常规文件密钥路径。符号链接被拒绝。
- `channels.nextcloud-talk.apiUser`：用于房间查找的 API 用户（私信检测）。
- `channels.nextcloud-talk.apiPassword`：用于房间查找的 API/应用密码。
- `channels.nextcloud-talk.apiPasswordFile`：API 密码文件路径。
- `channels.nextcloud-talk.webhookPort`：Webhook 监听端口（默认：8788）。
- `channels.nextcloud-talk.webhookHost`：Webhook 主机（默认：0.0.0.0）。
- `channels.nextcloud-talk.webhookPath`：Webhook 路径（默认：/nextcloud-talk-webhook）。
- `channels.nextcloud-talk.webhookPublicUrl`：外部可访问的 Webhook URL。
- `channels.nextcloud-talk.dmPolicy`：`pairing | allowlist | open | disabled`。
- `channels.nextcloud-talk.allowFrom`：私信白名单（用户 ID）。`open` 需要 `"*"`。
- `channels.nextcloud-talk.groupPolicy`：`allowlist | open | disabled`。
- `channels.nextcloud-talk.groupAllowFrom`：群组白名单（用户 ID）。
- `channels.nextcloud-talk.rooms`：每房间设置和白名单。
- `channels.nextcloud-talk.historyLimit`：群组历史限制（0 禁用）。
- `channels.nextcloud-talk.dmHistoryLimit`：私信历史限制（0 禁用）。
- `channels.nextcloud-talk.dms`：每私信覆盖（historyLimit）。
- `channels.nextcloud-talk.textChunkLimit`：出站文本块大小（字符）。
- `channels.nextcloud-talk.chunkMode`：`length`（默认）或 `newline` 在长度分块之前按空行（段落边界）分割。
- `channels.nextcloud-talk.blockStreaming`：禁用此频道的块流式传输。
- `channels.nextcloud-talk.blockStreamingCoalesce`：块流式传输合并调优。
- `channels.nextcloud-talk.mediaMaxMb`：入站媒体上限（MB）。

## 相关文档

- [频道概述](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私信认证和配对流程
- [群组](/channels/groups) — 群组聊天行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和安全加固
