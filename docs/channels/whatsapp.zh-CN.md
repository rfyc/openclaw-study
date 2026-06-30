---
summary: "WhatsApp 频道支持、访问控制、投递行为和运维"
read_when:
  - 处理 WhatsApp/web 频道行为或收件箱路由
title: "WhatsApp"
---

状态：通过 WhatsApp Web (Baileys) 已生产就绪。网关拥有链接的会话。

## 安装（按需）

- 引导（`openclaw onboard`）和 `openclaw channels add --channel whatsapp` 在您第一次选择时提示安装 WhatsApp 插件。
- `openclaw channels login --channel whatsapp` 在插件尚未安装时也提供安装流程。
- 开发频道 + git 检出：默认使用本地插件路径。
- 稳定版/测试版：使用当前官方发行标签上的 npm 包 `@openclaw/whatsapp`。

手动安装仍然可用：

```bash
openclaw plugins install @openclaw/whatsapp
```

使用裸包以跟随当前的官方发行标签。仅在需要可重现安装时才固定精确版本。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    未知发件人的默认私信策略是配对。
  </Card>
  <Card title="频道故障排查" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断和修复手册。
  </Card>
  <Card title="网关配置" icon="settings" href="/gateway/configuration">
    完整的频道配置模式和示例。
  </Card>
</CardGroup>

## 快速设置

<Steps>
  <Step title="配置 WhatsApp 访问策略">

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      allowFrom: ["+15551234567"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

  </Step>

  <Step title="链接 WhatsApp（QR）">

```bash
openclaw channels login --channel whatsapp
```

    对于特定账户：

```bash
openclaw channels login --channel whatsapp --account work
```

    在登录前附加现有/自定义的 WhatsApp Web 认证目录：

```bash
openclaw channels add --channel whatsapp --account work --auth-dir /path/to/wa-auth
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="启动网关">

```bash
openclaw gateway
```

  </Step>

  <Step title="批准第一个配对请求（如果使用配对模式）">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配对请求 1 小时后过期。每个频道最多有 3 个待处理请求。

  </Step>
</Steps>

<Note>
OpenClaw 建议尽可能在单独的号码上运行 WhatsApp。（频道元数据和设置流程针对该设置进行了优化，但也支持个人号码设置。）
</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="专用号码（推荐）">
    这是最简洁的操作模式：

    - OpenClaw 的单独 WhatsApp 身份
    - 更清晰的私信白名单和路由边界
    - 降低自聊天混淆的可能性

    最小策略模式：

    ```json5
    {
      channels: {
        whatsapp: {
          dmPolicy: "allowlist",
          allowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="个人号码回退">
    引导支持个人号码模式并写入友好自聊天的基线：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的个人号码
    - `selfChatMode: true`

    在运行时，自聊天保护以链接的自身号码和 `allowFrom` 为键。

  </Accordion>

  <Accordion title="仅 WhatsApp Web 频道范围">
    当前 OpenClaw 频道架构中的消息平台频道基于 WhatsApp Web（`Baileys`）。

    内置聊天频道注册表中没有单独的 Twilio WhatsApp 消息频道。

  </Accordion>
</AccordionGroup>

## 运行时模型

- 网关拥有 WhatsApp 套接字和重连循环。
- 重连看门狗使用 WhatsApp Web 传输活动，而不仅仅是入站应用消息量，因此安静的链接设备会话不会仅仅因为最近没有人发送消息而重启。较长的应用静默上限在传输帧持续到达但在看门狗窗口内没有处理应用消息时仍然强制重连；在最近活跃会话的瞬态重连后，该应用静默检查在第一个恢复窗口使用正常消息超时。
- Baileys 套接字时序在 `web.whatsapp.*` 下是显式的：`keepAliveIntervalMs` 控制 WhatsApp Web 应用 ping，`connectTimeoutMs` 控制开头握手超时，`defaultQueryTimeoutMs` 控制 Baileys 查询超时。
- 出站发送需要目标账户有活动的 WhatsApp 侦听器。
- 当 Token 匹配当前 WhatsApp 参与者元数据（包括 LID 支持的群组）时，群组发送为文本和媒体标题中的 `@+<digits>` 和 `@<digits>` Token 附加原生提及元数据。
- 状态和广播聊天被忽略（`@status`、`@broadcast`）。
- 重连看门狗遵循 WhatsApp Web 传输活动，不仅仅是入站应用消息量：安静的链接设备会话在传输帧持续时保持连接，但传输停止会在稍后的远程断连路径之前强制重连。
- 直接聊天使用私信会话规则（`session.dmScope`；默认 `main` 将私信折叠到智能体主会话）。
- 群组会话是隔离的（`agent:<agentId>:whatsapp:group:<jid>`）。
- WhatsApp 频道/Newsletter 可以是带原生 `@newsletter` JID 的显式出站目标。出站 Newsletter 发送使用频道会话元数据（`agent:<agentId>:whatsapp:channel:<jid>`）而不是私信会话语义。
- WhatsApp Web 传输遵守网关主机上的标准代理环境变量（`HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY` / 小写变体）。推荐使用主机级代理配置而不是 WhatsApp 特定的频道代理设置。
- 当 `messages.removeAckAfterReply` 启用时，OpenClaw 在可见回复投递后清除 WhatsApp 确认反应。

## 插件钩子和隐私

WhatsApp 入站消息可能包含个人消息内容、电话号码、群组标识符、发件人姓名和会话关联字段。因此，除非您显式选择加入，否则 WhatsApp 不会向插件广播入站 `message_received` 钩子有效负载：

```json5
{
  channels: {
    whatsapp: {
      pluginHooks: {
        messageReceived: true,
      },
    },
  },
}
```

您可以将选择加入范围限定为一个账户：

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        work: {
          pluginHooks: {
            messageReceived: true,
          },
        },
      },
    },
  },
}
```

仅为您信任接收入站 WhatsApp 消息内容和标识符的插件启用此功能。

## 访问控制和激活

<Tabs>
  <Tab title="私信策略">
    `channels.whatsapp.dmPolicy` 控制直接聊天访问：

    - `pairing`（默认）
    - `allowlist`
    - `open`（需要 `allowFrom` 包含 `"*"`）
    - `disabled`

    `allowFrom` 接受 E.164 格式的号码（内部规范化）。

    `allowFrom` 是私信发件人访问控制列表。它不门控对 WhatsApp 群组 JID 或 `@newsletter` 频道 JID 的显式出站发送。

    多账户覆盖：`channels.whatsapp.accounts.<id>.dmPolicy`（和 `allowFrom`）对该账户优先于频道级默认值。

    运行时行为详情：

    - 配对持久保存在频道允许存储中，并与配置的 `allowFrom` 合并
    - 计划自动化和心跳接收者回退使用显式投递目标或配置的 `allowFrom`；私信配对审批不是隐式的定时任务或心跳接收者
    - 如果未配置白名单，链接的自身号码默认被允许
    - OpenClaw 从不自动配对出站 `fromMe` 私信（您从链接设备发送给自己的消息）

  </Tab>

  <Tab title="群组策略 + 白名单">
    群组访问有两层：

    1. **群组成员白名单**（`channels.whatsapp.groups`）
       - 如果省略 `groups`，所有群组都有资格
       - 如果存在 `groups`，它作为群组白名单（允许 `"*"`）

    2. **群组发件人策略**（`channels.whatsapp.groupPolicy` + `groupAllowFrom`）
       - `open`：绕过发件人白名单
       - `allowlist`：发件人必须匹配 `groupAllowFrom`（或 `*`）
       - `disabled`：阻止所有群组入站

    发件人白名单回退：

    - 如果未设置 `groupAllowFrom`，运行时在可用时回退到 `allowFrom`
    - 发件人白名单在提及/回复激活之前评估

    注意：如果根本没有 `channels.whatsapp` 块，运行时群组策略回退为 `allowlist`（带警告日志），即使设置了 `channels.defaults.groupPolicy`。

  </Tab>

  <Tab title="提及 + /activation">
    群组回复默认需要提及。

    提及检测包括：

    - 机器人身份的显式 WhatsApp 提及
    - 配置的提及正则模式（`agents.list[].groupChat.mentionPatterns`，回退到 `messages.groupChat.mentionPatterns`）
    - 授权群组消息的入站语音备忘录转录
    - 隐式回复机器人检测（回复发件人匹配机器人身份）

    安全说明：

    - 引用/回复仅满足提及门控；它**不**授予发件人授权
    - 使用 `groupPolicy: "allowlist"` 时，非白名单发件人即使回复白名单用户的消息也仍然被阻止

    会话级激活命令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新会话状态（不是全局配置）。它受所有者门控。

  </Tab>
</Tabs>

## 个人号码和自聊天行为

当链接的自身号码也存在于 `allowFrom` 时，WhatsApp 自聊天保护激活：

- 跳过自聊天轮次的已读回执
- 忽略否则会 ping 自己的提及 JID 自动触发行为
- 如果未设置 `messages.responsePrefix`，自聊天回复默认为 `[{identity.name}]` 或 `[openclaw]`

## 消息规范化和上下文

<AccordionGroup>
  <Accordion title="入站信封 + 回复上下文">
    传入的 WhatsApp 消息被包装在共享的入站信封中。

    如果存在引用回复，上下文以此形式追加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回复元数据字段在可用时也填充（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、发件人 JID/E.164）。
    当引用回复目标是可下载媒体时，OpenClaw 通过正常入站媒体存储保存它，并将其作为 `MediaPath`/`MediaType` 暴露，以便智能体可以检查引用的图像而不仅仅看到 `<media:image>`。

  </Accordion>

  <Accordion title="媒体占位符和位置/联系人提取">
    仅媒体的入站消息使用以下占位符规范化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    当正文仅为 `<media:audio>` 时，授权的群组语音备忘录在提及门控之前被转录，因此在语音备忘录中说机器人提及可以触发回复。如果转录仍然没有提及机器人，转录保留在待处理的群组历史中，而不是原始占位符。

    位置正文使用简洁的坐标文本。位置标签/注释和联系人/vCard 详细信息渲染为有围栏的不可信元数据，而不是内联提示文本。

  </Accordion>

  <Accordion title="待处理群组历史注入">
    对于群组，未处理的消息可以被缓冲，并在机器人最终被触发时作为上下文注入。

    - 默认限制：`50`
    - 配置：`channels.whatsapp.historyLimit`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 禁用

    注入标记：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="已读回执">
    对于已接受的入站 WhatsApp 消息，已读回执默认启用。

    全局禁用：

    ```json5
    {
      channels: {
        whatsapp: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    每账户覆盖：

    ```json5
    {
      channels: {
        whatsapp: {
          accounts: {
            work: {
              sendReadReceipts: false,
            },
          },
        },
      },
    }
    ```

    即使全局启用，自聊天轮次也跳过已读回执。

  </Accordion>
</AccordionGroup>

## 投递、分块和媒体

<AccordionGroup>
  <Accordion title="文本分块">
    - 默认块限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式优先选择段落边界（空行），然后回退到长度安全分块

  </Accordion>

  <Accordion title="出站媒体行为">
    - 支持图像、视频、音频（PTT 语音备忘录）和文档有效负载
    - 音频媒体通过带 `ptt: true` 的 Baileys `audio` 有效负载发送，因此 WhatsApp 客户端将其渲染为一键通语音备忘录
    - 回复有效负载保留 `audioAsVoice`；即使提供者返回 MP3 或 WebM，WhatsApp 的 TTS 语音备忘录输出也保持在此 PTT 路径上
    - 原生 Ogg/Opus 音频作为 `audio/ogg; codecs=opus` 发送以实现语音备忘录兼容性
    - 非 Ogg 音频，包括 Microsoft Edge TTS MP3/WebM 输出，在 PTT 投递前使用 `ffmpeg` 转码为 48kHz 单声道 Ogg/Opus
    - `/tts latest` 将最新的助手回复作为一条语音备忘录发送，并抑制相同回复的重复发送；`/tts chat on|off|default` 控制当前 WhatsApp 聊天的自动 TTS
    - 通过视频发送的 `gifPlayback: true` 支持动画 GIF 播放
    - 在发送多媒体回复有效负载时，标题应用于第一个媒体项，但 PTT 语音备忘录先发送音频然后单独发送可见文本，因为 WhatsApp 客户端不一致地渲染语音备忘录标题
    - 媒体来源可以是 HTTP(S)、`file://` 或本地路径

  </Accordion>

  <Accordion title="媒体大小限制和回退行为">
    - 入站媒体保存上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 出站媒体发送上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 每账户覆盖使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 图像自动优化（调整大小/质量扫描）以适应限制
    - 媒体发送失败时，第一项回退发送文本警告而不是静默丢弃响应

  </Accordion>
</AccordionGroup>

## 回复引用

WhatsApp 支持原生回复引用，出站回复可见地引用入站消息。使用 `channels.whatsapp.replyToMode` 控制它。

| 值          | 行为                                         |
| ----------- | -------------------------------------------- |
| `"off"`     | 从不引用；作为普通消息发送                   |
| `"first"`   | 仅引用第一个出站回复块                       |
| `"all"`     | 引用每个出站回复块                           |
| `"batched"` | 引用队列中的批量回复，同时保持即时回复不引用 |

默认为 `"off"`。每账户覆盖使用 `channels.whatsapp.accounts.<id>.replyToMode`。

```json5
{
  channels: {
    whatsapp: {
      replyToMode: "first",
    },
  },
}
```

## 反应级别

`channels.whatsapp.reactionLevel` 控制智能体在 WhatsApp 上使用 emoji 反应的范围：

| 级别          | 确认反应 | 智能体发起的反应 | 描述                          |
| ------------- | -------- | ---------------- | ----------------------------- |
| `"off"`       | 否       | 否               | 完全没有反应                  |
| `"ack"`       | 是       | 否               | 仅确认反应（回复前回执）      |
| `"minimal"`   | 是       | 是（保守）       | 确认 + 带保守指导的智能体反应 |
| `"extensive"` | 是       | 是（鼓励）       | 确认 + 带鼓励指导的智能体反应 |

默认：`"minimal"`。

每账户覆盖使用 `channels.whatsapp.accounts.<id>.reactionLevel`。

```json5
{
  channels: {
    whatsapp: {
      reactionLevel: "ack",
    },
  },
}
```

## 确认反应

WhatsApp 通过 `channels.whatsapp.ackReaction` 支持对入站接收的即时确认反应。
确认反应受 `reactionLevel` 门控 — 当 `reactionLevel` 为 `"off"` 时被抑制。

```json5
{
  channels: {
    whatsapp: {
      ackReaction: {
        emoji: "👀",
        direct: true,
        group: "mentions", // always | mentions | never
      },
    },
  },
}
```

行为说明：

- 在入站被接受后立即发送（回复前）
- 失败被记录但不阻止正常回复投递
- 群组模式 `mentions` 在提及触发的轮次上反应；群组激活 `always` 作为此检查的绕过
- WhatsApp 使用 `channels.whatsapp.ackReaction`（旧版 `messages.ackReaction` 在这里不使用）

## 多账户和凭据

<AccordionGroup>
  <Accordion title="账户选择和默认值">
    - 账户 ID 来自 `channels.whatsapp.accounts`
    - 默认账户选择：如果存在则为 `default`，否则为第一个配置的账户 ID（排序后）
    - 账户 ID 在内部规范化以供查找

  </Accordion>

  <Accordion title="凭据路径和旧版兼容性">
    - 当前认证路径：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 备份文件：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的旧版默认认证仍然被识别/迁移用于默认账户流程

  </Accordion>

  <Accordion title="注销行为">
    `openclaw channels logout --channel whatsapp [--account <id>]` 清除该账户的 WhatsApp 认证状态。

    当网关可达时，注销首先停止所选账户的实时 WhatsApp 侦听器，以便链接的会话在下次重启前不继续接收消息。`openclaw channels remove --channel whatsapp` 在禁用或删除账户配置之前也停止实时侦听器。

    在旧版认证目录中，`oauth.json` 被保留而 Baileys 认证文件被删除。

  </Accordion>
</AccordionGroup>

## 工具、操作和配置写入

- 智能体工具支持包括 WhatsApp 反应操作（`react`）。
- 操作门控：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 频道发起的配置写入默认启用（通过 `channels.whatsapp.configWrites=false` 禁用）。

## 故障排查

<AccordionGroup>
  <Accordion title="未链接（需要 QR）">
    症状：频道状态报告未链接。

    修复：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已链接但断开 / 重连循环">
    症状：带重复断开或重连尝试的已链接账户。

    安静的账户可以在正常消息超时之后保持连接；当 WhatsApp Web 传输活动停止、套接字关闭或应用级活动在较长的安全窗口内保持静默时，看门狗重启。

    如果日志显示重复的 `status=408 Request Time-out Connection was lost`，在 `web.whatsapp` 下调整 Baileys 套接字时序。首先将 `keepAliveIntervalMs` 缩短到低于您网络的空闲超时，并在慢速或有损连接上增加 `connectTimeoutMs`：

    ```json5
    {
      web: {
        whatsapp: {
          keepAliveIntervalMs: 15000,
          connectTimeoutMs: 60000,
          defaultQueryTimeoutMs: 60000,
        },
      },
    }
    ```

    修复：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如果 `~/.openclaw/logs/whatsapp-health.log` 显示 `Gateway inactive` 但 `openclaw gateway status` 和 `openclaw channels status --probe` 显示网关和 WhatsApp 健康，运行 `openclaw doctor`。在 Linux 上，doctor 会警告仍然调用 `~/.openclaw/bin/ensure-whatsapp.sh` 的旧版 crontab 条目；使用 `crontab -e` 删除这些过时条目，因为 cron 可能缺少 systemd 用户总线环境并使旧脚本错误报告网关健康。

    如果需要，使用 `channels login` 重新链接。

  </Accordion>

  <Accordion title="在代理后面 QR 登录超时">
    症状：`openclaw channels login --channel whatsapp` 在显示可用 QR 码之前失败，显示 `status=408 Request Time-out` 或 TLS 套接字断开。

    WhatsApp Web 登录使用网关主机的标准代理环境（`HTTPS_PROXY`、`HTTP_PROXY`、小写变体和 `NO_PROXY`）。验证网关进程是否继承代理环境，以及 `NO_PROXY` 是否不匹配 `mmg.whatsapp.net`。

  </Accordion>

  <Accordion title="发送时没有活动侦听器">
    当目标账户没有活动网关侦听器时，出站发送快速失败。

    确保网关正在运行且账户已链接。

  </Accordion>

  <Accordion title="回复出现在对话记录中但不在 WhatsApp 中">
    对话记录行记录智能体生成的内容。WhatsApp 投递单独检查：OpenClaw 仅在 Baileys 为至少一个可见文本或媒体发送返回出站消息 ID 后才将自动回复视为已发送。

    确认反应是独立的回复前回执。成功的反应不证明后续文本或媒体回复被 WhatsApp 接受。

    检查网关日志中的 `auto-reply delivery failed` 或 `auto-reply was not accepted by WhatsApp provider`。

  </Accordion>

  <Accordion title="群组消息意外被忽略">
    按此顺序检查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 白名单条目
    - 提及门控（`requireMention` + 提及模式）
    - `openclaw.json`（JSON5）中的重复键：后面的条目覆盖前面的条目，因此每个范围保留一个 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 运行时警告">
    WhatsApp 网关运行时应使用 Node。Bun 被标记为不兼容稳定的 WhatsApp/Telegram 网关操作。
  </Accordion>
</AccordionGroup>

## 系统提示

WhatsApp 通过 `groups` 和 `direct` 映射支持类似 Telegram 风格的群组和直接聊天系统提示。

群组消息的解析层次结构：

首先确定有效的 `groups` 映射：如果账户定义了自己的 `groups`，它完全替换根 `groups` 映射（不深度合并）。然后在生成的单一映射上运行提示查找：

1. **群组特定系统提示**（`groups["<groupId>"].systemPrompt`）：当特定群组条目**存在**于映射中**且**其 `systemPrompt` 键已定义时使用。如果 `systemPrompt` 是空字符串（`""`），通配符被抑制，不应用系统提示。
2. **群组通配符系统提示**（`groups["*"].systemPrompt`）：当特定群组条目完全不在映射中，或当它存在但未定义 `systemPrompt` 键时使用。

直接消息的解析层次结构：

首先确定有效的 `direct` 映射：如果账户定义了自己的 `direct`，它完全替换根 `direct` 映射（不深度合并）。然后在生成的单一映射上运行提示查找：

1. **直接特定系统提示**（`direct["<peerId>"].systemPrompt`）：当特定对等条目**存在**于映射中**且**其 `systemPrompt` 键已定义时使用。如果 `systemPrompt` 是空字符串（`""`），通配符被抑制，不应用系统提示。
2. **直接通配符系统提示**（`direct["*"].systemPrompt`）：当特定对等条目完全不在映射中，或当它存在但未定义 `systemPrompt` 键时使用。

<Note>
`dms` 保持轻量级的每私信历史覆盖桶（`dms.<id>.historyLimit`）。提示覆盖位于 `direct` 下。
</Note>

**与 Telegram 多账户行为的差异：** 在 Telegram 中，根 `groups` 在多账户设置中对所有账户都被有意抑制 — 即使是没有定义自己 `groups` 的账户 — 以防止机器人接收它不属于的群组的群组消息。WhatsApp 不应用此保护：根 `groups` 和根 `direct` 始终被未定义账户级覆盖的账户继承，无论配置了多少个账户。在多账户 WhatsApp 设置中，如果您需要每账户群组或直接提示，请在每个账户下明确定义完整映射，而不是依赖根级默认值。

重要行为：

- `channels.whatsapp.groups` 既是每群组配置映射，也是聊天级群组白名单。在根或账户范围内，`groups["*"]` 意味着"该范围内的所有群组都被允许"。
- 仅在您已经希望该范围允许所有群组时才添加通配符群组 `systemPrompt`。如果您仍然只希望固定一组群组 ID 有资格，请不要将 `groups["*"]` 用于提示默认值。相反，在每个显式白名单的群组条目上重复提示。
- 群组准入和发件人授权是独立的检查。`groups["*"]` 扩大了可以到达群组处理的群组集合，但它本身不授权这些群组中的每个发件人。发件人访问仍然由 `channels.whatsapp.groupPolicy` 和 `channels.whatsapp.groupAllowFrom` 单独控制。
- `channels.whatsapp.direct` 对私信没有相同的副作用。`direct["*"]` 仅在私信已经被 `dmPolicy` 加 `allowFrom` 或配对存储规则接受后提供默认直接聊天配置。

示例：

```json5
{
  channels: {
    whatsapp: {
      groups: {
        // 仅在根范围内应允许所有群组时使用。
        // 适用于未定义自己 groups 映射的所有账户。
        "*": { systemPrompt: "Default prompt for all groups." },
      },
      direct: {
        // 适用于未定义自己 direct 映射的所有账户。
        "*": { systemPrompt: "Default prompt for all direct chats." },
      },
      accounts: {
        work: {
          groups: {
            // 此账户定义了自己的 groups，因此根 groups 被完全替换。
            // 要保留通配符，也在这里显式定义 "*"。
            "120363406415684625@g.us": {
              requireMention: false,
              systemPrompt: "Focus on project management.",
            },
            // 仅在此账户中应允许所有群组时使用。
            "*": { systemPrompt: "Default prompt for work groups." },
          },
          direct: {
            // 此账户定义了自己的 direct 映射，因此根 direct 条目被完全替换。
            // 要保留通配符，也在这里显式定义 "*"。
            "+15551234567": { systemPrompt: "Prompt for a specific work direct chat." },
            "*": { systemPrompt: "Default prompt for work direct chats." },
          },
        },
      },
    },
  },
}
```

## 配置参考指针

主要参考：

- [配置参考 - WhatsApp](/gateway/config-channels#whatsapp)

高信号 WhatsApp 字段：

- 访问：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`
- 投递：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`sendReadReceipts`、`ackReaction`、`reactionLevel`
- 多账户：`accounts.<id>.enabled`、`accounts.<id>.authDir`、账户级覆盖
- 运维：`configWrites`、`debounceMs`、`web.enabled`、`web.heartbeatSeconds`、`web.reconnect.*`、`web.whatsapp.*`
- 会话行为：`session.dmScope`、`historyLimit`、`dmHistoryLimit`、`dms.<id>.historyLimit`
- 提示：`groups.<id>.systemPrompt`、`groups["*"].systemPrompt`、`direct.<id>.systemPrompt`、`direct["*"].systemPrompt`

## 相关

- [配对](/channels/pairing)
- [群组](/channels/groups)
- [安全性](/gateway/security)
- [频道路由](/channels/channel-routing)
- [多智能体路由](/concepts/multi-agent)
- [故障排查](/channels/troubleshooting)
