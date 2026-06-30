---
summary: "Feishu 机器人概述、功能和配置"
read_when:
  - 您想连接 Feishu/Lark 机器人
  - 您正在配置 Feishu 频道
title: Feishu
---

# Feishu / Lark

Feishu/Lark 是一个一体化协作平台，团队可以在其中聊天、共享文档、管理日历并共同完成工作。

**状态：** 机器人私信 + 群聊生产就绪。WebSocket 是默认模式；Webhook 模式可选。

---

## 快速开始

<Note>
需要 OpenClaw 2026.4.25 或更高版本。运行 `openclaw --version` 检查。使用 `openclaw update` 升级。
</Note>

<Steps>
  <Step title="运行频道设置向导">
  ```bash
  openclaw channels login --channel feishu
  ```
  使用您的 Feishu/Lark 手机应用扫描二维码以自动创建 Feishu/Lark 机器人。
  </Step>
  
  <Step title="设置完成后，重启网关以应用更改">
  ```bash
  openclaw gateway restart
  ```
  </Step>
</Steps>

---

## 访问控制

### 私信

配置 `dmPolicy` 控制谁可以给机器人发私信：

- `"pairing"` — 未知用户收到配对码；通过 CLI 批准
- `"allowlist"` — 只有 `allowFrom` 中列出的用户可以聊天（默认：仅机器人所有者）
- `"open"` — 仅当 `allowFrom` 包含 `"*"` 时允许公开私信；有限制性条目时，只有匹配的用户可以聊天
- `"disabled"` — 禁用所有私信

**批准配对请求：**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### 群聊

**群组策略**（`channels.feishu.groupPolicy`）：

| 值            | 行为                                                                     |
| ------------- | ------------------------------------------------------------------------ |
| `"open"`      | 回复群组中的所有消息                                                     |
| `"allowlist"` | 只回复 `groupAllowFrom` 中的群组或在 `groups.<chat_id>` 下明确配置的群组 |
| `"disabled"`  | 禁用所有群组消息；明确的 `groups.<chat_id>` 条目不会覆盖此设置           |

默认：`allowlist`

**提及要求**（`channels.feishu.requireMention`）：

- `true` — 要求 @ 提及（默认）
- `false` — 无需 @ 提及即可响应
- 每群组覆盖：`channels.feishu.groups.<chat_id>.requireMention`
- 仅广播的 `@all` 和 `@_all` 不被视为机器人提及。同时提及 `@all` 和直接提及机器人的消息仍然算作机器人提及。

---

## 群组配置示例

### 允许所有群组，无需 @ 提及

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
    },
  },
}
```

### 允许所有群组，仍需 @ 提及

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
      requireMention: true,
    },
  },
}
```

### 只允许特定群组

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      // 群组 ID 格式如：oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
    },
  },
}
```

在 `allowlist` 模式下，您也可以通过添加明确的 `groups.<chat_id>` 条目来允许群组。明确条目不会覆盖 `groupPolicy: "disabled"`。`groups.*` 下的通配符默认值配置匹配的群组，但它们本身不允许群组。

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groups: {
        oc_xxx: {
          requireMention: false,
        },
      },
    },
  },
}
```

### 限制群组内的发送者

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["oc_xxx"],
      groups: {
        oc_xxx: {
          // 用户 open_id 格式如：ou_xxx
          allowFrom: ["ou_user1", "ou_user2"],
        },
      },
    },
  },
}
```

---

<a id="get-groupuser-ids"></a>

## 获取群组/用户 ID

### 群组 ID（`chat_id`，格式：`oc_xxx`）

在 Feishu/Lark 中打开群组，点击右上角的菜单图标，然后转到**设置**。群组 ID（`chat_id`）列在设置页面上。

![获取群组 ID](/images/feishu-get-group-id.png)

### 用户 ID（`open_id`，格式：`ou_xxx`）

启动网关，向机器人发送私信，然后查看日志：

```bash
openclaw logs --follow
```

在日志输出中查找 `open_id`。您也可以查看待处理的配对请求：

```bash
openclaw pairing list feishu
```

---

## 常用命令

| 命令      | 描述               |
| --------- | ------------------ |
| `/status` | 显示机器人状态     |
| `/reset`  | 重置当前会话       |
| `/model`  | 显示或切换 AI 模型 |

<Note>
Feishu/Lark 不支持原生斜杠命令菜单，因此请将这些命令作为纯文本消息发送。
</Note>

---

## 故障排查

### 机器人在群聊中不响应

1. 确保机器人已添加到群组
2. 确保您 @ 提及了机器人（默认必须）
3. 验证 `groupPolicy` 不是 `"disabled"`
4. 查看日志：`openclaw logs --follow`

### 机器人未收到消息

1. 确保机器人在 Feishu 开放平台/Lark 开发者中已发布并获得批准
2. 确保事件订阅包含 `im.message.receive_v1`
3. 确保选择了**持久连接**（WebSocket）
4. 确保所有必需的权限范围已授予
5. 确保网关正在运行：`openclaw gateway status`
6. 查看日志：`openclaw logs --follow`

### App Secret 泄露

1. 在 Feishu 开放平台/Lark 开发者中重置 App Secret
2. 在配置中更新该值
3. 重启网关：`openclaw gateway restart`

---

## 高级配置

### 多账户

```json5
{
  channels: {
    feishu: {
      defaultAccount: "main",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          name: "Primary bot",
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
        },
        backup: {
          appId: "cli_yyy",
          appSecret: "yyy",
          name: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

`defaultAccount` 控制出站 API 未指定 `accountId` 时使用哪个账户。
`accounts.<id>.tts` 使用与 `messages.tts` 相同的形式，并在全局 TTS 配置上深度合并，因此多机器人 Feishu 设置可以在全局保留共享提供商凭据，同时仅按账户覆盖语音、模型、角色或自动模式。

### 消息限制

- `textChunkLimit` — 出站文本块大小（默认：`2000` 字符）
- `mediaMaxMb` — 媒体上传/下载限制（默认：`30` MB）

### 流式传输

Feishu/Lark 支持通过交互式卡片流式传输回复。启用后，机器人在生成文本时实时更新卡片。

```json5
{
  channels: {
    feishu: {
      streaming: true, // 启用流式卡片输出（默认：true）
      blockStreaming: true, // 选择完成块流式传输
    },
  },
}
```

设置 `streaming: false` 以一条消息发送完整回复。`blockStreaming` 默认关闭；仅在希望在最终回复前刷新已完成的助手块时启用。

### 配额优化

使用两个可选标志减少 Feishu/Lark API 调用数量：

- `typingIndicator`（默认 `true`）：设置 `false` 跳过输入反应调用
- `resolveSenderNames`（默认 `true`）：设置 `false` 跳过发送者资料查找

```json5
{
  channels: {
    feishu: {
      typingIndicator: false,
      resolveSenderNames: false,
    },
  },
}
```

### ACP 会话

Feishu/Lark 支持私信和群组线程消息的 ACP。Feishu/Lark ACP 是文本命令驱动的——没有原生斜杠命令菜单，因此直接在对话中使用 `/acp ...` 消息。

#### 持久 ACP 绑定

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "direct", id: "ou_1234567890" },
      },
    },
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "group", id: "oc_group_chat:topic:om_topic_root" },
      },
      acp: { label: "codex-feishu-topic" },
    },
  ],
}
```

#### 从聊天生成 ACP

在 Feishu/Lark 私信或线程中：

```text
/acp spawn codex --thread here
```

`--thread here` 适用于私信和 Feishu/Lark 线程消息。绑定对话中的后续消息直接路由到该 ACP 会话。

### 多智能体路由

使用 `bindings` 将 Feishu/Lark 私信或群组路由到不同的智能体。

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
        channel: "feishu",
        peer: { kind: "direct", id: "ou_xxx" },
      },
    },
    {
      agentId: "agent-b",
      match: {
        channel: "feishu",
        peer: { kind: "group", id: "oc_zzz" },
      },
    },
  ],
}
```

路由字段：

- `match.channel`：`"feishu"`
- `match.peer.kind`：`"direct"`（私信）或 `"group"`（群聊）
- `match.peer.id`：用户 Open ID（`ou_xxx`）或群组 ID（`oc_xxx`）

请参阅[获取群组/用户 ID](#get-groupuser-ids)了解查找技巧。

---

## 配置参考

完整配置：[网关配置](/gateway/configuration)

| 设置                                              | 描述                                                  | 默认值           |
| ------------------------------------------------- | ----------------------------------------------------- | ---------------- |
| `channels.feishu.enabled`                         | 启用/禁用频道                                         | `true`           |
| `channels.feishu.domain`                          | API 域名（`feishu` 或 `lark`）                        | `feishu`         |
| `channels.feishu.connectionMode`                  | 事件传输（`websocket` 或 `webhook`）                  | `websocket`      |
| `channels.feishu.defaultAccount`                  | 出站路由的默认账户                                    | `default`        |
| `channels.feishu.verificationToken`               | Webhook 模式必填                                      | —                |
| `channels.feishu.encryptKey`                      | Webhook 模式必填                                      | —                |
| `channels.feishu.webhookPath`                     | Webhook 路由路径                                      | `/feishu/events` |
| `channels.feishu.webhookHost`                     | Webhook 绑定主机                                      | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | Webhook 绑定端口                                      | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | App ID                                                | —                |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                                            | —                |
| `channels.feishu.accounts.<id>.domain`            | 每账户域名覆盖                                        | `feishu`         |
| `channels.feishu.accounts.<id>.tts`               | 每账户 TTS 覆盖                                       | `messages.tts`   |
| `channels.feishu.dmPolicy`                        | 私信策略                                              | `allowlist`      |
| `channels.feishu.allowFrom`                       | 私信白名单（open_id 列表）                            | [机器人所有者]   |
| `channels.feishu.groupPolicy`                     | 群组策略                                              | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | 群组白名单                                            | —                |
| `channels.feishu.requireMention`                  | 群组中要求 @ 提及                                     | `true`           |
| `channels.feishu.groups.<chat_id>.requireMention` | 每群组 @ 提及覆盖；明确 ID 在白名单模式下也允许该群组 | 继承             |
| `channels.feishu.groups.<chat_id>.enabled`        | 启用/禁用特定群组                                     | `true`           |
| `channels.feishu.textChunkLimit`                  | 消息块大小                                            | `2000`           |
| `channels.feishu.mediaMaxMb`                      | 媒体大小限制                                          | `30`             |
| `channels.feishu.streaming`                       | 流式卡片输出                                          | `true`           |
| `channels.feishu.blockStreaming`                  | 完成块回复流式传输                                    | `false`          |
| `channels.feishu.typingIndicator`                 | 发送输入反应                                          | `true`           |
| `channels.feishu.resolveSenderNames`              | 解析发送者显示名称                                    | `true`           |

---

## 支持的消息类型

### 接收

- ✅ 文本
- ✅ 富文本（post）
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频/媒体
- ✅ 贴纸

入站 Feishu/Lark 音频消息被规范化为媒体占位符而不是原始 `file_key` JSON。当配置了 `tools.media.audio` 时，OpenClaw 下载语音备忘录资源并在智能体轮次之前运行共享音频转录，因此智能体接收口语转录文本。如果 Feishu 在音频有效负载中直接包含转录文本，则使用该文本而无需再次 ASR 调用。没有音频转录提供商时，智能体仍然接收 `<media:audio>` 占位符加上保存的附件，而不是原始 Feishu 资源有效负载。

### 发送

- ✅ 文本
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频/媒体
- ✅ 交互式卡片（包括流式更新）
- ⚠️ 富文本（post 样式格式；不支持完整的 Feishu/Lark 编写功能）

原生 Feishu/Lark 音频气泡使用 Feishu `audio` 消息类型，需要 Ogg/Opus 上传媒体（`file_type: "opus"`）。现有的 `.opus` 和 `.ogg` 媒体直接作为原生音频发送。MP3/WAV/M4A 和其他可能的音频格式仅在回复请求语音投递时（`audioAsVoice` / 消息工具 `asVoice`，包括 TTS 语音备忘录回复）使用 `ffmpeg` 转码为 48kHz Ogg/Opus。普通 MP3 附件保持为普通文件。如果 `ffmpeg` 缺失或转换失败，OpenClaw 回退到文件附件并记录原因。

### 线程和回复

- ✅ 行内回复
- ✅ 线程回复
- ✅ 回复线程消息时媒体回复保持线程感知

对于 `groupSessionScope: "group_topic"` 和 `"group_topic_sender"`，原生 Feishu/Lark 话题群组使用事件 `thread_id`（`omt_*`）作为规范话题会话键。OpenClaw 将普通群组回复转换为线程时，继续使用回复根消息 ID（`om_*`），以便第一轮次和后续轮次保持在同一会话中。

---

## 相关文档

- [频道概述](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私信认证和配对流程
- [群组](/channels/groups) — 群组聊天行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和安全加固
