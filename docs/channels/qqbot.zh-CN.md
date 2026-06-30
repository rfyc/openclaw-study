---
summary: "QQ Bot 设置、配置和使用"
read_when:
  - 您想将 OpenClaw 连接到 QQ
  - 您需要 QQ Bot 凭据设置
  - 您想要 QQ Bot 群聊或私聊支持
title: QQ Bot
---

QQ Bot 通过官方 QQ Bot API（WebSocket 网关）连接到 OpenClaw。
插件支持 C2C 私聊、群组 @消息和频道消息，以及富媒体（图片、语音、视频、文件）。

状态：可下载插件。支持私信、群聊、频道和媒体。不支持反应和线程。

## 安装

安装前先安装 QQ Bot：

```bash
openclaw plugins install @openclaw/qqbot
```

## 设置

1. 前往 [QQ 开放平台](https://q.qq.com/)，用手机 QQ 扫描二维码注册/登录。
2. 点击**创建机器人**以创建新的 QQ 机器人。
3. 在机器人的设置页面上找到 **AppID** 和 **AppSecret** 并复制它们。

> AppSecret 不以明文存储——如果您在未保存的情况下离开页面，您将不得不重新生成一个新的。

4. 添加频道：

```bash
openclaw channels add --channel qqbot --token "AppID:AppSecret"
```

5. 重启网关。

交互式设置路径：

```bash
openclaw channels add
openclaw configure --section channels
```

## 配置

最小配置：

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecret: "YOUR_APP_SECRET",
    },
  },
}
```

默认账户环境变量：

- `QQBOT_APP_ID`
- `QQBOT_CLIENT_SECRET`

文件支持的 AppSecret：

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecretFile: "/path/to/qqbot-secret.txt",
    },
  },
}
```

环境变量 SecretRef AppSecret：

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecret: { source: "env", provider: "default", id: "QQBOT_CLIENT_SECRET" },
    },
  },
}
```

说明：

- 环境变量回退仅适用于默认 QQ Bot 账户。
- `openclaw channels add --channel qqbot --token-file ...` 只提供 AppSecret；AppID 必须已在配置或 `QQBOT_APP_ID` 中设置。
- `clientSecret` 也接受 SecretRef 输入，而不仅仅是明文字符串。
- 旧版 `secretref:/...` 标记字符串不是有效的 `clientSecret` 值；使用如上例所示的结构化 SecretRef 对象。

### 多账户设置

在单个 OpenClaw 实例下运行多个 QQ 机器人：

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "111111111",
      clientSecret: "secret-of-bot-1",
      accounts: {
        bot2: {
          enabled: true,
          appId: "222222222",
          clientSecret: "secret-of-bot-2",
        },
      },
    },
  },
}
```

每个账户启动自己的 WebSocket 连接，并维护独立的令牌缓存（通过 `appId` 隔离）。

通过 CLI 添加第二个机器人：

```bash
openclaw channels add --channel qqbot --account bot2 --token "222222222:secret-of-bot-2"
```

### 群聊

QQ Bot 群聊支持使用 QQ 群 OpenID，而不是显示名称。将机器人添加到群组，然后提及它或将群组配置为不需要提及即可运行。

```json5
{
  channels: {
    qqbot: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["member_openid"],
      groups: {
        "*": {
          requireMention: true,
          historyLimit: 50,
          toolPolicy: "restricted",
        },
        GROUP_OPENID: {
          name: "发布房间",
          requireMention: false,
          ignoreOtherMentions: true,
          historyLimit: 20,
          prompt: "Keep replies short and operational.",
        },
      },
    },
  },
}
```

`groups["*"]` 为每个群组设置默认值，而具体的 `groups.GROUP_OPENID` 条目为一个群组覆盖这些默认值。群组设置包括：

- `requireMention`：要求 @提及才能让机器人回复。默认：`true`。
- `ignoreOtherMentions`：丢弃提及其他人但不是机器人的消息。
- `historyLimit`：保留最近的非提及群组消息作为下一个被提及轮次的上下文。设置 `0` 以禁用。
- `toolPolicy`：群组范围工具的 `full`、`restricted` 或 `none`。
- `name`：在日志和群组上下文中使用的友好标签。
- `prompt`：附加到智能体上下文的每群组行为提示。

激活模式是 `mention` 和 `always`。`requireMention: true` 映射到 `mention`；`requireMention: false` 映射到 `always`。会话级激活覆盖（如果存在）优先于配置。

入站队列按对等方划分。群组对等方有更大的队列上限，在满时保持人类消息优先于机器人创作的闲聊，并将正常群组消息的突发合并为一个归因轮次。斜杠命令仍然一个接一个地运行。

### 语音（STT/TTS）

STT 和 TTS 支持两级配置，带优先级回退：

| 设置 | 插件特定                                                 | 框架回退                      |
| ---- | -------------------------------------------------------- | ----------------------------- |
| STT  | `channels.qqbot.stt`                                     | `tools.media.audio.models[0]` |
| TTS  | `channels.qqbot.tts`、`channels.qqbot.accounts.<id>.tts` | `messages.tts`                |

```json5
{
  channels: {
    qqbot: {
      stt: {
        provider: "your-provider",
        model: "your-stt-model",
      },
      tts: {
        provider: "your-provider",
        model: "your-tts-model",
        voice: "your-voice",
      },
      accounts: {
        "qq-main": {
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
        },
      },
    },
  },
}
```

对任一项设置 `enabled: false` 以禁用。
账户级 TTS 覆盖使用与 `messages.tts` 相同的形状，并在频道/全局 TTS 配置上深度合并。

入站 QQ 语音附件作为音频媒体元数据暴露给智能体，同时将原始语音文件排除在通用 `MediaPaths` 之外。`[[audio_as_voice]]` 纯文本回复在配置了 TTS 时合成 TTS 并发送原生 QQ 语音消息。

出站音频上传/转码行为也可以通过 `channels.qqbot.audioFormatPolicy` 调整：

- `sttDirectFormats`
- `uploadDirectFormats`
- `transcodeEnabled`

## 目标格式

| 格式                       | 描述        |
| -------------------------- | ----------- |
| `qqbot:c2c:OPENID`         | 私聊（C2C） |
| `qqbot:group:GROUP_OPENID` | 群聊        |
| `qqbot:channel:CHANNEL_ID` | 频道        |

> 每个机器人都有自己的一组用户 OpenID。Bot A 收到的 OpenID **不能**用于通过 Bot B 发送消息。

## 斜杠命令

在 AI 队列之前拦截的内置命令：

| 命令           | 描述                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| `/bot-ping`    | 延迟测试                                                                |
| `/bot-version` | 显示 OpenClaw 框架版本                                                  |
| `/bot-help`    | 列出所有命令                                                            |
| `/bot-me`      | 显示发送者的 QQ 用户 ID（openid）用于 `allowFrom`/`groupAllowFrom` 设置 |
| `/bot-upgrade` | 显示 QQBot 升级指南链接                                                 |
| `/bot-logs`    | 将最近的网关日志导出为文件                                              |
| `/bot-approve` | 批准待处理的 QQ Bot 操作（例如，通过原生流程确认 C2C 或群组上传）。     |

在任何命令后附加 `?` 以获取使用帮助（例如 `/bot-upgrade ?`）。

管理员命令（`/bot-me`、`/bot-upgrade`、`/bot-logs`、`/bot-clear-storage`、`/bot-streaming`、`/bot-approve`）仅限私信，并要求发送者的 openid 在明确的非通配符 `allowFrom` 列表中。通配符 `allowFrom: ["*"]` 允许聊天但不授予管理员命令访问权限。群组消息首先与 `groupAllowFrom` 匹配，然后回退到 `allowFrom`。在群组中运行管理员命令返回提示而不是静默丢弃。

## 引擎架构

QQ Bot 在插件内作为自包含引擎提供：

- 每个账户拥有独立的资源堆栈（WebSocket 连接、API 客户端、令牌缓存、媒体存储根），通过 `appId` 键控。账户从不共享入站/出站状态。
- 多账户记录器用拥有账户标记日志行，以便在一个网关下运行多个机器人时诊断保持可分离。
- 入站、出站和网关桥接路径在 `~/.openclaw/media` 下共享单个媒体有效负载根，因此上传、下载和转码缓存落在一个受保护的目录下，而不是每个子系统树。
- 富媒体交付通过一个 `sendMedia` 路径用于 C2C 和群组目标。超过大文件阈值的本地文件和缓冲区使用 QQ 的分块上传端点，而较小的有效负载使用单次媒体 API。
- 凭据可以作为标准 OpenClaw 凭据快照的一部分备份和恢复；引擎在恢复时重新附加每个账户的资源堆栈，无需重新进行 QR 码配对。

## QR 码引导配置

作为手动粘贴 `AppID:AppSecret` 的替代方案，引擎支持用于将 QQ Bot 链接到 OpenClaw 的 QR 码引导配置流程：

1. 运行 QQ Bot 设置路径（例如 `openclaw channels add --channel qqbot`），在提示时选择 QR 码流程。
2. 用与目标 QQ Bot 关联的手机应用扫描生成的 QR 码。
3. 在手机上批准配对。OpenClaw 将返回的凭据持久化到正确账户范围下的 `credentials/`。

机器人本身生成的批准提示（例如，QQ Bot API 公开的"允许此操作？"流程）作为原生 OpenClaw 提示呈现，您可以通过 `/bot-approve` 接受，而不是通过原始 QQ 客户端回复。

## 故障排查

- **机器人回复"gone to Mars"：** 凭据未配置或网关未启动。
- **没有入站消息：** 验证 `appId` 和 `clientSecret` 是否正确，以及机器人在 QQ 开放平台上是否已启用。
- **重复的自我回复：** OpenClaw 将 QQ 出站引用索引记录为机器人创作的，并忽略其当前 `msgIdx` 与同一机器人账户匹配的入站事件。这在防止平台回声循环的同时，仍允许用户引用或回复之前的机器人消息。
- **使用 `--token-file` 设置仍显示未配置：** `--token-file` 只设置 AppSecret。您仍然需要在配置或 `QQBOT_APP_ID` 中设置 `appId`。
- **主动消息未到达：** 如果用户最近没有互动，QQ 可能会拦截机器人发起的消息。
- **语音未转录：** 确保 STT 已配置且提供商可访问。

## 相关文档

- [配对](/channels/pairing)
- [群组](/channels/groups)
- [频道故障排查](/channels/troubleshooting)
