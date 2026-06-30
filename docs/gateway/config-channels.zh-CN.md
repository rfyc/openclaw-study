---
summary: "渠道配置：Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 等的访问控制、配对和每渠道密钥"
read_when:
  - 配置渠道插件（认证、访问控制、多账户）
  - 排查每渠道配置键的问题
  - 审计 DM 策略、群组策略或提及门控
title: "配置 — 渠道"
---

`channels.*` 下的每渠道配置键。涵盖 DM 和群组访问、多账户设置、提及门控以及 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 和其他捆绑渠道插件的每渠道键。

有关代理、工具、网关运行时和其他顶级键，请参阅[配置参考](/gateway/configuration-reference)。

## 渠道

每个渠道在其配置部分存在时自动启动（除非 `enabled: false`）。

### DM 和群组访问

所有渠道都支持 DM 策略和群组策略：

| DM 策略           | 行为                                          |
| ----------------- | --------------------------------------------- |
| `pairing`（默认） | 未知发送者获得一次性配对码；所有者必须批准    |
| `allowlist`       | 只有 `allowFrom` 中的发送者（或配对允许存储） |
| `open`            | 允许所有入站 DM（需要 `allowFrom: ["*"]`）    |
| `disabled`        | 忽略所有入站 DM                               |

| 群组策略            | 行为                                 |
| ------------------- | ------------------------------------ |
| `allowlist`（默认） | 只有匹配已配置允许列表的群组         |
| `open`              | 绕过群组允许列表（提及门控仍然适用） |
| `disabled`          | 阻止所有群组/房间消息                |

<Note>
`channels.defaults.groupPolicy` 设置提供商的 `groupPolicy` 未设置时的默认值。
配对码在 1 小时后过期。待处理的 DM 配对请求每渠道上限为 **3 个**。
如果提供商块完全缺失（`channels.<provider>` 不存在），运行时群组策略回退到 `allowlist`（失败关闭）并显示启动警告。
</Note>

### 渠道模型覆盖

使用 `channels.modelByChannel` 将特定渠道 ID 固定到模型。值接受 `provider/model` 或已配置的模型别名。渠道映射在会话还没有模型覆盖（例如通过 `/model` 设置）时适用。

```json5
{
  channels: {
    modelByChannel: {
      discord: {
        "123456789012345678": "anthropic/claude-opus-4-6",
      },
      slack: {
        C1234567890: "openai/gpt-4.1",
      },
      telegram: {
        "-1001234567890": "openai/gpt-4.1-mini",
        "-1001234567890:topic:99": "anthropic/claude-sonnet-4-6",
      },
    },
  },
}
```

### 渠道默认值和心跳

使用 `channels.defaults` 设置跨提供商的共享群组策略和心跳行为：

```json5
{
  channels: {
    defaults: {
      groupPolicy: "allowlist", // open | allowlist | disabled
      contextVisibility: "all", // all | allowlist | allowlist_quote
      heartbeat: {
        showOk: false,
        showAlerts: true,
        useIndicator: true,
      },
    },
  },
}
```

- `channels.defaults.groupPolicy`：提供商级别 `groupPolicy` 未设置时的回退群组策略。
- `channels.defaults.contextVisibility`：所有渠道的默认补充上下文可见性模式。值：`all`（默认，包含所有引用/线程/历史上下文）、`allowlist`（仅包含来自允许列表发送者的上下文）、`allowlist_quote`（与 allowlist 相同，但保留显式引用/回复上下文）。每渠道覆盖：`channels.<channel>.contextVisibility`。
- `channels.defaults.heartbeat.showOk`：在心跳输出中包含健康的渠道状态。
- `channels.defaults.heartbeat.showAlerts`：在心跳输出中包含降级/错误状态。
- `channels.defaults.heartbeat.useIndicator`：渲染紧凑指示器风格的心跳输出。

### WhatsApp

WhatsApp 通过网关的 web 渠道（Baileys Web）运行。当存在已关联的会话时自动启动。

```json5
{
  web: {
    enabled: true,
    heartbeatSeconds: 60,
    whatsapp: {
      keepAliveIntervalMs: 25000,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    },
    reconnect: {
      initialMs: 2000,
      maxMs: 120000,
      factor: 1.4,
      jitter: 0.2,
      maxAttempts: 0,
    },
  },
  channels: {
    whatsapp: {
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
      allowFrom: ["+15555550123", "+447700900123"],
      textChunkLimit: 4000,
      chunkMode: "length", // length | newline
      mediaMaxMb: 50,
      sendReadReceipts: true, // 蓝色勾（在自聊天模式下为 false）
      groups: {
        "*": { requireMention: true },
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

<Accordion title="多账户 WhatsApp">

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        default: {},
        personal: {},
        biz: {
          // authDir: "~/.openclaw/credentials/whatsapp/biz",
        },
      },
    },
  },
}
```

- 出站命令默认使用账户 `default`（如果存在）；否则使用第一个已配置的账户 id（排序后）。
- 可选的 `channels.whatsapp.defaultAccount` 在匹配已配置的账户 id 时覆盖该回退默认账户选择。
- 旧版单账户 Baileys 认证目录由 `openclaw doctor` 迁移到 `whatsapp/default`。
- 每账户覆盖：`channels.whatsapp.accounts.<id>.sendReadReceipts`、`channels.whatsapp.accounts.<id>.dmPolicy`、`channels.whatsapp.accounts.<id>.allowFrom`。

</Accordion>

### Telegram

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "your-bot-token",
      dmPolicy: "pairing",
      allowFrom: ["tg:123456789"],
      groups: {
        "*": { requireMention: true },
        "-1001234567890": {
          allowFrom: ["@admin"],
          systemPrompt: "Keep answers brief.",
          topics: {
            "99": {
              requireMention: false,
              skills: ["search"],
              systemPrompt: "Stay on topic.",
            },
          },
        },
      },
      customCommands: [
        { command: "backup", description: "Git backup" },
        { command: "generate", description: "Create an image" },
      ],
      historyLimit: 50,
      replyToMode: "first", // off | first | all | batched
      linkPreview: true,
      streaming: "partial", // off | partial | block | progress（默认：off；明确选择加入以避免预览编辑速率限制）
      actions: { reactions: true, sendMessage: true },
      reactionNotifications: "own", // off | own | all
      mediaMaxMb: 100,
      retry: {
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
      network: {
        autoSelectFamily: true,
        dnsResultOrder: "ipv4first",
      },
      apiRoot: "https://api.telegram.org",
      proxy: "socks5://localhost:9050",
      webhookUrl: "https://example.com/telegram-webhook",
      webhookSecret: "secret",
      webhookPath: "/telegram-webhook",
    },
  },
}
```

- Bot token：`channels.telegram.botToken` 或 `channels.telegram.tokenFile`（仅限普通文件；符号链接被拒绝），`TELEGRAM_BOT_TOKEN` 作为默认账户的回退。
- `apiRoot` 仅是 Telegram Bot API 根目录。使用 `https://api.telegram.org` 或你自托管/代理根目录，不是 `https://api.telegram.org/bot<TOKEN>`；`openclaw doctor --fix` 删除意外的尾随 `/bot<TOKEN>` 后缀。
- 可选的 `channels.telegram.defaultAccount` 在匹配已配置的账户 id 时覆盖默认账户选择。
- 在多账户设置（2+ 账户 id）中，设置明确的默认值（`channels.telegram.defaultAccount` 或 `channels.telegram.accounts.default`）以避免回退路由；`openclaw doctor` 在缺失或无效时发出警告。
- `configWrites: false` 阻止 Telegram 发起的配置写入（超级群组 ID 迁移、`/config set|unset`）。
- 带有 `type: "acp"` 的顶级 `bindings[]` 条目为论坛话题配置持久 ACP 绑定（在 `match.peer.id` 中使用规范的 `chatId:topic:topicId`）。字段语义在 [ACP Agents](/tools/acp-agents#persistent-channel-bindings) 中共享。
- Telegram 流预览使用 `sendMessage` + `editMessageText`（在直接和群组聊天中均有效）。
- 重试策略：参见[重试策略](/concepts/retry)。

### Discord

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "your-bot-token",
      mediaMaxMb: 100,
      allowBots: false,
      actions: {
        reactions: true,
        stickers: true,
        polls: true,
        permissions: true,
        messages: true,
        threads: true,
        pins: true,
        search: true,
        memberInfo: true,
        roleInfo: true,
        roles: false,
        channelInfo: true,
        voiceStatus: true,
        events: true,
        moderation: false,
      },
      replyToMode: "off", // off | first | all | batched
      dmPolicy: "pairing",
      allowFrom: ["1234567890", "123456789012345678"],
      dm: { enabled: true, groupEnabled: false, groupChannels: ["openclaw-dm"] },
      guilds: {
        "123456789012345678": {
          slug: "friends-of-openclaw",
          requireMention: false,
          ignoreOtherMentions: true,
          reactionNotifications: "own",
          users: ["987654321098765432"],
          channels: {
            general: { allow: true },
            help: {
              allow: true,
              requireMention: true,
              users: ["987654321098765432"],
              skills: ["docs"],
              systemPrompt: "Short answers only.",
            },
          },
        },
      },
      historyLimit: 20,
      textChunkLimit: 2000,
      chunkMode: "length", // length | newline
      streaming: "off", // off | partial | block | progress
      maxLinesPerMessage: 17,
      ui: {
        components: {
          accentColor: "#5865F2",
        },
      },
      threadBindings: {
        enabled: true,
        idleHours: 24,
        maxAgeHours: 0,
        spawnSessions: true,
        defaultSpawnContext: "fork",
      },
      voice: {
        enabled: true,
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        connectTimeoutMs: 30000,
        reconnectGraceMs: 15000,
        tts: {
          provider: "openai",
          openai: { voice: "alloy" },
        },
      },
      execApprovals: {
        enabled: "auto", // true | false | "auto"
        approvers: ["987654321098765432"],
        agentFilter: ["default"],
        sessionFilter: ["discord:"],
        target: "dm", // dm | channel | both
        cleanupAfterResolve: false,
      },
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
  },
}
```

- Token：`channels.discord.token`，`DISCORD_BOT_TOKEN` 作为默认账户的回退。
- 提供显式 Discord `token` 的直接出站调用使用该 token 进行调用；账户重试/策略设置仍然来自活跃运行时快照中的选定账户。
- 可选的 `channels.discord.defaultAccount` 在匹配已配置的账户 id 时覆盖默认账户选择。
- 使用 `user:<id>`（DM）或 `channel:<id>`（公会渠道）作为交付目标；裸数字 ID 被拒绝。
- 公会 slug 是小写的，空格替换为 `-`；渠道键使用 slug 名称（无 `#`）。优先使用公会 ID。
- 机器人撰写的消息默认被忽略。`allowBots: true` 启用它们；使用 `allowBots: "mentions"` 只接受提及机器人的机器人消息（自己的消息仍然被过滤）。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（以及渠道覆盖）丢弃提及其他用户或角色但不提及机器人的消息（不包括 @everyone/@here）。
- `channels.discord.mentionAliases` 在发送前将稳定的出站 `@handle` 文本映射到 Discord 用户 ID，以便即使瞬态目录缓存为空，也可以确定性地提及已知的队友。每账户覆盖在 `channels.discord.accounts.<accountId>.mentionAliases` 下。
- `maxLinesPerMessage`（默认 17）即使在低于 2000 字符时也会分割高消息。
- `channels.discord.threadBindings` 控制 Discord 线程绑定路由：
  - `enabled`：线程绑定会话功能的 Discord 覆盖（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 和绑定交付/路由）
  - `idleHours`：不活跃自动取消关注的 Discord 覆盖（小时）（`0` 禁用）
  - `maxAgeHours`：硬最大年龄的 Discord 覆盖（小时）（`0` 禁用）
  - `spawnSessions`：`sessions_spawn({ thread: true })` 和 ACP 线程生成自动线程创建/绑定的开关（默认：`true`）
  - `defaultSpawnContext`：线程绑定生成的原生子代理上下文（默认 `"fork"`）
- 带有 `type: "acp"` 的顶级 `bindings[]` 条目为渠道和线程配置持久 ACP 绑定（在 `match.peer.id` 中使用渠道/线程 id）。字段语义在 [ACP Agents](/tools/acp-agents#persistent-channel-bindings) 中共享。
- `channels.discord.ui.components.accentColor` 设置 Discord 组件 v2 容器的强调色。
- `channels.discord.voice` 启用 Discord 语音渠道对话和可选的自动加入 + LLM + TTS 覆盖。仅文字的 Discord 配置默认关闭语音；设置 `channels.discord.voice.enabled=true` 选择加入。
- `channels.discord.voice.model` 可选地覆盖用于 Discord 语音渠道响应的 LLM 模型。
- `channels.discord.voice.daveEncryption` 和 `channels.discord.voice.decryptionFailureTolerance` 传递到 `@discordjs/voice` DAVE 选项（默认 `true` 和 `24`）。
- `channels.discord.voice.connectTimeoutMs` 控制 `/vc join` 和自动加入尝试的初始 `@discordjs/voice` Ready 等待（默认 `30000`）。
- `channels.discord.voice.reconnectGraceMs` 控制断开连接的语音会话在 OpenClaw 销毁它之前可能进入重新连接信号的时间（默认 `15000`）。
- OpenClaw 还通过在重复解密失败后离开/重新加入语音会话来尝试语音接收恢复。
- `channels.discord.streaming` 是规范的流模式键。旧版 `streamMode` 和布尔 `streaming` 值会自动迁移。
- `channels.discord.autoPresence` 将运行时可用性映射到机器人状态（健康 => 在线，降级 => 空闲，耗尽 => 勿扰）并允许可选的状态文本覆盖。
- `channels.discord.dangerouslyAllowNameMatching` 重新启用可变名称/标签匹配（break-glass 兼容模式）。
- `channels.discord.execApprovals`：Discord 原生 exec 批准交付和批准者授权。
  - `enabled`：`true`、`false` 或 `"auto"`（默认）。在自动模式下，当可以从 `approvers` 或 `commands.ownerAllowFrom` 解析批准者时，exec 批准会激活。
  - `approvers`：允许批准 exec 请求的 Discord 用户 ID。省略时回退到 `commands.ownerAllowFrom`。
  - `agentFilter`：可选的代理 ID 允许列表。省略以转发所有代理的批准。
  - `sessionFilter`：可选的会话键模式（子字符串或正则表达式）。
  - `target`：发送批准提示的位置。`"dm"`（默认）发送到批准者 DM，`"channel"` 发送到原始渠道，`"both"` 两者都发送。当目标包含 `"channel"` 时，按钮只能由已解析的批准者使用。
  - `cleanupAfterResolve`：当为 `true` 时，在批准、拒绝或超时后删除批准 DM。

**反应通知模式：** `off`（无）、`own`（机器人的消息，默认）、`all`（所有消息）、`allowlist`（来自所有消息上的 `guilds.<id>.users`）。

### Google Chat

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      audienceType: "app-url", // app-url | project-number
      audience: "https://gateway.example.com/googlechat",
      webhookPath: "/googlechat",
      botUser: "users/1234567890",
      dm: {
        enabled: true,
        policy: "pairing",
        allowFrom: ["users/1234567890"],
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": { allow: true, requireMention: true },
      },
      actions: { reactions: true },
      typingIndicator: "message",
      mediaMaxMb: 20,
    },
  },
}
```

- 服务账户 JSON：内联（`serviceAccount`）或基于文件（`serviceAccountFile`）。
- 也支持服务账户 SecretRef（`serviceAccountRef`）。
- 环境回退：`GOOGLE_CHAT_SERVICE_ACCOUNT` 或 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`。
- 使用 `spaces/<spaceId>` 或 `users/<userId>` 作为交付目标。
- `channels.googlechat.dangerouslyAllowNameMatching` 重新启用可变电子邮件主体匹配（break-glass 兼容模式）。

### Slack

```json5
{
  channels: {
    slack: {
      enabled: true,
      botToken: "xoxb-...",
      appToken: "xapp-...",
      socketMode: {
        clientPingTimeout: 15000,
        serverPingTimeout: 30000,
        pingPongLoggingEnabled: false,
      },
      dmPolicy: "pairing",
      allowFrom: ["U123", "U456", "*"],
      dm: { enabled: true, groupEnabled: false, groupChannels: ["G123"] },
      channels: {
        C123: { allow: true, requireMention: true, allowBots: false },
        "#general": {
          allow: true,
          requireMention: true,
          allowBots: false,
          users: ["U123"],
          skills: ["docs"],
          systemPrompt: "Short answers only.",
        },
      },
      historyLimit: 50,
      allowBots: false,
      reactionNotifications: "own",
      reactionAllowlist: ["U123"],
      replyToMode: "off", // off | first | all | batched
      thread: {
        historyScope: "thread", // thread | channel
        inheritParent: false,
      },
      actions: {
        reactions: true,
        messages: true,
        pins: true,
        memberInfo: true,
        emojiList: true,
      },
      slashCommand: {
        enabled: true,
        name: "openclaw",
        sessionPrefix: "slack:slash",
        ephemeral: true,
      },
      typingReaction: "hourglass_flowing_sand",
      textChunkLimit: 4000,
      chunkMode: "length",
      streaming: {
        mode: "partial", // off | partial | block | progress
        nativeTransport: true, // 当 mode=partial 时使用 Slack 原生流 API
      },
      mediaMaxMb: 20,
      execApprovals: {
        enabled: "auto", // true | false | "auto"
        approvers: ["U123"],
        agentFilter: ["default"],
        sessionFilter: ["slack:"],
        target: "dm", // dm | channel | both
      },
    },
  },
}
```

- **Socket 模式**需要 `botToken` 和 `appToken`（默认账户环境回退为 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`）。
- **HTTP 模式**需要 `botToken` 加 `signingSecret`（在根或每账户）。
- `socketMode` 通过公共 Bolt 接收器 API 传递 Slack SDK Socket 模式传输调整。仅在调查 ping/pong 超时或过时 websocket 行为时使用。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受纯文本字符串或 SecretRef 对象。
- Slack 账户快照公开每凭据来源/状态字段，如 `botTokenSource`、`botTokenStatus`、`appTokenStatus`，以及在 HTTP 模式下的 `signingSecretStatus`。`configured_unavailable` 表示账户通过 SecretRef 配置，但当前命令/运行时路径无法解析秘密值。
- `configWrites: false` 阻止 Slack 发起的配置写入。
- 可选的 `channels.slack.defaultAccount` 在匹配已配置的账户 id 时覆盖默认账户选择。
- `channels.slack.streaming.mode` 是规范的 Slack 流模式键。`channels.slack.streaming.nativeTransport` 控制 Slack 的原生流传输。旧版 `streamMode`、布尔 `streaming` 和 `nativeStreaming` 值会自动迁移。
- 使用 `user:<id>`（DM）或 `channel:<id>` 作为交付目标。

**反应通知模式：** `off`、`own`（默认）、`all`、`allowlist`（来自 `reactionAllowlist`）。

**线程会话隔离：** `thread.historyScope` 是每线程（默认）或跨渠道共享。`thread.inheritParent` 将父渠道脚本复制到新线程。

- Slack 原生流加 Slack 助手风格的"正在输入..."线程状态需要回复线程目标。顶级 DM 默认情况下不在线程中，因此它们仍然可以通过 Slack 草稿发布和编辑预览流式传输，而不是显示线程风格的原生流/状态预览。
- `typingReaction` 在回复运行时为入站 Slack 消息添加临时反应，然后在完成时删除它。使用 Slack 表情简码，如 `"hourglass_flowing_sand"`。
- `channels.slack.execApprovals`：Slack 原生 exec 批准交付和批准者授权。与 Discord 相同的架构：`enabled`（`true`/`false`/`"auto"`）、`approvers`（Slack 用户 ID）、`agentFilter`、`sessionFilter` 和 `target`（`"dm"`、`"channel"` 或 `"both"`）。

| 动作组     | 默认 | 注意                |
| ---------- | ---- | ------------------- |
| reactions  | 启用 | 添加反应 + 列出反应 |
| messages   | 启用 | 读取/发送/编辑/删除 |
| pins       | 启用 | 固定/取消固定/列出  |
| memberInfo | 启用 | 成员信息            |
| emojiList  | 启用 | 自定义表情列表      |

### Mattermost

Mattermost 在当前 OpenClaw 版本中作为捆绑插件提供。旧版或自定义构建可以用 `openclaw plugins install @openclaw/mattermost` 安装当前 npm 包。固定版本前请查看 [npmjs.com/package/@openclaw/mattermost](https://www.npmjs.com/package/@openclaw/mattermost) 的当前 dist-tags。

```json5
{
  channels: {
    mattermost: {
      enabled: true,
      botToken: "mm-token",
      baseUrl: "https://chat.example.com",
      dmPolicy: "pairing",
      chatmode: "oncall", // oncall | onmessage | onchar
      oncharPrefixes: [">", "!"],
      groups: {
        "*": { requireMention: true },
        "team-channel-id": { requireMention: false },
      },
      commands: {
        native: true, // 选择加入
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost/command",
        // 反向代理/公共部署的可选显式 URL
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
      textChunkLimit: 4000,
      chunkMode: "length",
    },
  },
}
```

聊天模式：`oncall`（@-提及时响应，默认）、`onmessage`（每条消息）、`onchar`（以触发前缀开头的消息）。

启用 Mattermost 原生命令时：

- `commands.callbackPath` 必须是路径（例如 `/api/channels/mattermost/command`），不是完整 URL。
- `commands.callbackUrl` 必须解析到 OpenClaw 网关端点并可从 Mattermost 服务器访问。
- 原生斜线回调使用 Mattermost 在斜线命令注册期间返回的每命令 token 进行认证。如果注册失败或没有激活的命令，OpenClaw 以 `Unauthorized: invalid command token.` 拒绝回调。
- 对于私人/tailnet/内部回调主机，Mattermost 可能需要 `ServiceSettings.AllowedUntrustedInternalConnections` 包含回调主机/域。使用主机/域值，不是完整 URL。
- `channels.mattermost.configWrites`：允许或拒绝 Mattermost 发起的配置写入。
- `channels.mattermost.requireMention`：在渠道中回复前需要 `@mention`。
- `channels.mattermost.groups.<channelId>.requireMention`：每渠道提及门控覆盖（`"*"` 为默认）。
- 可选的 `channels.mattermost.defaultAccount` 在匹配已配置的账户 id 时覆盖默认账户选择。

### Signal

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15555550123", // 可选的账户绑定
      dmPolicy: "pairing",
      allowFrom: ["+15551234567", "uuid:123e4567-e89b-12d3-a456-426614174000"],
      configWrites: true,
      reactionNotifications: "own", // off | own | all | allowlist
      reactionAllowlist: ["+15551234567", "uuid:123e4567-e89b-12d3-a456-426614174000"],
      historyLimit: 50,
    },
  },
}
```

**反应通知模式：** `off`、`own`（默认）、`all`、`allowlist`（来自 `reactionAllowlist`）。

- `channels.signal.account`：将渠道启动固定到特定的 Signal 账户身份。
- `channels.signal.configWrites`：允许或拒绝 Signal 发起的配置写入。
- 可选的 `channels.signal.defaultAccount` 在匹配已配置的账户 id 时覆盖默认账户选择。

### BlueBubbles

BlueBubbles 是推荐的 iMessage 路径（插件支持，在 `channels.bluebubbles` 下配置）。

```json5
{
  channels: {
    bluebubbles: {
      enabled: true,
      dmPolicy: "pairing",
      // serverUrl, password, webhookPath, group controls, and advanced actions:
      // see /channels/bluebubbles
    },
  },
}
```

- 此处涵盖的核心键路径：`channels.bluebubbles`、`channels.bluebubbles.dmPolicy`。
- 可选的 `channels.bluebubbles.defaultAccount` 在匹配已配置的账户 id 时覆盖默认账户选择。
- 带有 `type: "acp"` 的顶级 `bindings[]` 条目可以将 BlueBubbles 对话绑定到持久 ACP 会话。在 `match.peer.id` 中使用 BlueBubbles 句柄或目标字符串（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共享字段语义：[ACP Agents](/tools/acp-agents#persistent-channel-bindings)。
- 完整的 BlueBubbles 渠道配置在 [BlueBubbles](/channels/bluebubbles) 中记录。

### iMessage

OpenClaw 生成 `imsg rpc`（通过 stdio 的 JSON-RPC）。不需要守护进程或端口。

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "imsg",
      dbPath: "~/Library/Messages/chat.db",
      remoteHost: "user@gateway-host",
      dmPolicy: "pairing",
      allowFrom: ["+15555550123", "user@example.com", "chat_id:123"],
      historyLimit: 50,
      includeAttachments: false,
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      mediaMaxMb: 16,
      service: "auto",
      region: "US",
    },
  },
}
```

- 可选的 `channels.imessage.defaultAccount` 在匹配已配置的账户 id 时覆盖默认账户选择。

- 需要对 Messages DB 的完全磁盘访问权限。
- 优先使用 `chat_id:<id>` 目标。使用 `imsg chats --limit 20` 列出聊天。
- `cliPath` 可以指向 SSH 包装器；设置 `remoteHost`（`host` 或 `user@host`）用于 SCP 附件获取。
- `attachmentRoots` 和 `remoteAttachmentRoots` 限制入站附件路径（默认：`/Users/*/Library/Messages/Attachments`）。
- SCP 使用严格主机密钥检查，因此确保中继主机密钥已存在于 `~/.ssh/known_hosts`。
- `channels.imessage.configWrites`：允许或拒绝 iMessage 发起的配置写入。
- 带有 `type: "acp"` 的顶级 `bindings[]` 条目可以将 iMessage 对话绑定到持久 ACP 会话。在 `match.peer.id` 中使用规范化句柄或显式聊天目标（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共享字段语义：[ACP Agents](/tools/acp-agents#persistent-channel-bindings)。

<Accordion title="iMessage SSH 包装器示例">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Matrix

Matrix 由插件支持并在 `channels.matrix` 下配置。

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_bot_xxx",
      proxy: "http://127.0.0.1:7890",
      encryption: true,
      initialSyncLimit: 20,
      defaultAccount: "ops",
      accounts: {
        ops: {
          name: "Ops",
          userId: "@ops:example.org",
          accessToken: "syt_ops_xxx",
        },
        alerts: {
          userId: "@alerts:example.org",
          password: "secret",
          proxy: "http://127.0.0.1:7891",
        },
      },
    },
  },
}
```

- Token 认证使用 `accessToken`；密码认证使用 `userId` + `password`。
- `channels.matrix.proxy` 通过显式 HTTP(S) 代理路由 Matrix HTTP 流量。命名账户可以用 `channels.matrix.accounts.<id>.proxy` 覆盖它。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允许私有/内部主服务器。`proxy` 和此网络选择加入是独立的控制。
- `channels.matrix.defaultAccount` 在多账户设置中选择首选账户。
- `channels.matrix.autoJoin` 默认为 `off`，因此受邀房间和新的 DM 风格邀请被忽略，直到你用 `autoJoinAllowlist` 设置 `autoJoin: "allowlist"` 或 `autoJoin: "always"`。
- `channels.matrix.execApprovals`：Matrix 原生 exec 批准交付和批准者授权。
  - `enabled`：`true`、`false` 或 `"auto"`（默认）。在自动模式下，当可以从 `approvers` 或 `commands.ownerAllowFrom` 解析批准者时，exec 批准会激活。
  - `approvers`：允许批准 exec 请求的 Matrix 用户 ID（例如 `@owner:example.org`）。
  - `agentFilter`：可选的代理 ID 允许列表。省略以转发所有代理的批准。
  - `sessionFilter`：可选的会话键模式（子字符串或正则表达式）。
  - `target`：发送批准提示的位置。`"dm"`（默认）、`"channel"`（原始房间）或 `"both"`。
  - 每账户覆盖：`channels.matrix.accounts.<id>.execApprovals`。
- `channels.matrix.dm.sessionScope` 控制 Matrix DM 如何分组到会话：`per-user`（默认）按路由 peer 共享，而 `per-room` 隔离每个 DM 房间。
- Matrix 状态探测和实时目录查找使用与运行时流量相同的代理策略。
- 完整的 Matrix 配置、目标规则和设置示例在 [Matrix](/channels/matrix) 中记录。

### Microsoft Teams

Microsoft Teams 由插件支持并在 `channels.msteams` 下配置。

```json5
{
  channels: {
    msteams: {
      enabled: true,
      configWrites: true,
      // appId, appPassword, tenantId, webhook, team/channel policies:
      // see /channels/msteams
    },
  },
}
```

- 此处涵盖的核心键路径：`channels.msteams`、`channels.msteams.configWrites`。
- 完整的 Teams 配置（凭据、webhook、DM/群组策略、每团队/每渠道覆盖）在 [Microsoft Teams](/channels/msteams) 中记录。

### IRC

IRC 由插件支持并在 `channels.irc` 下配置。

```json5
{
  channels: {
    irc: {
      enabled: true,
      dmPolicy: "pairing",
      configWrites: true,
      nickserv: {
        enabled: true,
        service: "NickServ",
        password: "${IRC_NICKSERV_PASSWORD}",
        register: false,
        registerEmail: "bot@example.com",
      },
    },
  },
}
```

- 此处涵盖的核心键路径：`channels.irc`、`channels.irc.dmPolicy`、`channels.irc.configWrites`、`channels.irc.nickserv.*`。
- 可选的 `channels.irc.defaultAccount` 在匹配已配置的账户 id 时覆盖默认账户选择。
- 完整的 IRC 渠道配置（主机/端口/TLS/渠道/允许列表/提及门控）在 [IRC](/channels/irc) 中记录。

### 多账户（所有渠道）

每个渠道运行多个账户（每个有自己的 `accountId`）：

```json5
{
  channels: {
    telegram: {
      accounts: {
        default: {
          name: "Primary bot",
          botToken: "123456:ABC...",
        },
        alerts: {
          name: "Alerts bot",
          botToken: "987654:XYZ...",
        },
      },
    },
  },
}
```

- 省略 `accountId` 时使用 `default`（CLI + 路由）。
- 环境 token 仅适用于**默认**账户。
- 基础渠道设置适用于所有账户，除非每账户覆盖。
- 使用 `bindings[].match.accountId` 将每个账户路由到不同的代理。
- 如果在仍使用单账户顶级渠道配置时通过 `openclaw channels add`（或渠道入门）添加非默认账户，OpenClaw 首先将账户范围的顶级单账户值提升到渠道账户映射中，以便原始账户继续工作。大多数渠道将它们移动到 `channels.<channel>.accounts.default`；Matrix 可以保留现有的匹配命名/默认目标。
- 现有的仅渠道绑定（无 `accountId`）继续匹配默认账户；账户范围绑定仍然是可选的。
- `openclaw doctor --fix` 也通过将账户范围的顶级单账户值移动到为该渠道选择的提升账户中来修复混合形状。大多数渠道使用 `accounts.default`；Matrix 可以保留现有的匹配命名/默认目标。

### 其他插件渠道

许多插件渠道配置为 `channels.<id>` 并在其专用渠道页面中记录（例如 Feishu、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat 和 Twitch）。
参见完整渠道索引：[渠道](/channels)。

### 群聊提及门控

群组消息默认**需要提及**（元数据提及或安全正则表达式模式）。适用于 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群聊。

可见回复单独控制。群组/渠道房间默认为 `messages.groupChat.visibleReplies: "message_tool"`：OpenClaw 仍然处理该对话，但普通最终回复保持私密，可见房间输出需要 `message(action=send)`。仅当你希望普通回复发布回房间的旧版行为时才设置 `"automatic"`。要将相同的仅工具可见回复行为也应用于直接聊天，设置 `messages.visibleReplies: "message_tool"`；Codex 套件也将该仅工具行为用作其未设置的直接聊天默认值。

仅工具可见回复需要可靠调用工具的模型/运行时。如果会话日志显示 `didSendViaMessagingTool: false` 的助手文本，模型产生了私密最终答案而不是调用消息工具。为该渠道切换到更强的工具调用模型，或设置 `messages.groupChat.visibleReplies: "automatic"` 以恢复旧版可见最终回复。

如果消息工具在活跃工具策略下不可用，OpenClaw 回退到自动可见回复，而不是静默抑制响应。`openclaw doctor` 警告此不匹配。

网关在文件保存后热重载 `messages` 配置。仅在部署中禁用文件监视或配置重载时重启。

**提及类型：**

- **元数据提及**：原生平台 @-提及。在 WhatsApp 自聊天模式下被忽略。
- **文本模式**：`agents.list[].groupChat.mentionPatterns` 中的安全正则表达式模式。无效模式和不安全的嵌套重复被忽略。
- 提及门控仅在检测可行时强制执行（原生提及或至少一个模式）。

```json5
{
  messages: {
    visibleReplies: "automatic", // 直接/来源聊天的全局默认值；Codex 套件将未设置的直接聊天默认为 message_tool
    groupChat: {
      historyLimit: 50,
      visibleReplies: "message_tool", // 默认；使用 "automatic" 获取旧版最终回复
    },
  },
  agents: {
    list: [{ id: "main", groupChat: { mentionPatterns: ["@openclaw", "openclaw"] } }],
  },
}
```

`messages.groupChat.historyLimit` 设置全局默认值。渠道可以用 `channels.<channel>.historyLimit`（或每账户）覆盖。设置 `0` 禁用。

`messages.visibleReplies` 是全局来源对话默认值；`messages.groupChat.visibleReplies` 为群组/渠道来源对话覆盖它。当 `messages.visibleReplies` 未设置时，套件可以提供自己的直接/来源默认值；Codex 套件默认为 `message_tool`。渠道允许列表和提及门控仍然决定是否处理某个对话。

#### DM 历史限制

```json5
{
  channels: {
    telegram: {
      dmHistoryLimit: 30,
      dms: {
        "123456789": { historyLimit: 50 },
      },
    },
  },
}
```

解析顺序：每 DM 覆盖 → 提供商默认值 → 无限制（全部保留）。

支持：`telegram`、`whatsapp`、`discord`、`slack`、`signal`、`imessage`、`msteams`。

#### 自聊天模式

在 `allowFrom` 中包含你自己的号码以启用自聊天模式（忽略原生 @-提及，只响应文本模式）：

```json5
{
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: { mentionPatterns: ["reisponde", "@openclaw"] },
      },
    ],
  },
}
```

### 命令（聊天命令处理）

```json5
{
  commands: {
    native: "auto", // 支持时注册原生命令
    nativeSkills: "auto", // 支持时注册原生技能命令
    text: true, // 解析聊天消息中的 /commands
    bash: false, // 允许 !（别名：/bash）
    bashForegroundMs: 2000,
    config: false, // 允许 /config
    mcp: false, // 允许 /mcp
    plugins: false, // 允许 /plugins
    debug: false, // 允许 /debug
    restart: true, // 允许 /restart + 网关重启工具
    ownerAllowFrom: ["discord:123456789012345678"],
    ownerDisplay: "raw", // raw | hash
    ownerDisplaySecret: "${OWNER_ID_HASH_SECRET}",
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

<Accordion title="命令详情">

- 此块配置命令接口。有关当前内置 + 捆绑命令目录，参见[斜线命令](/tools/slash-commands)。
- 此页面是**配置键参考**，而不是完整的命令目录。渠道/插件拥有的命令（如 QQ Bot `/bot-ping` `/bot-help` `/bot-logs`、LINE `/card`、设备配对 `/pair`、记忆 `/dreaming`、电话控制 `/phone` 和 Talk `/voice`）在其渠道/插件页面和[斜线命令](/tools/slash-commands)中记录。
- 文本命令必须是带有前导 `/` 的**独立**消息。
- `native: "auto"` 为 Discord/Telegram 打开原生命令，保持 Slack 关闭。
- `nativeSkills: "auto"` 为 Discord/Telegram 打开原生技能命令，保持 Slack 关闭。
- 每渠道覆盖：`channels.discord.commands.native`（布尔值或 `"auto"`）。对于 Discord，`false` 在启动期间跳过原生命令注册和清理。
- 用 `channels.<provider>.commands.nativeSkills` 覆盖每渠道原生技能注册。
- `channels.telegram.customCommands` 添加额外的 Telegram 机器人菜单条目。
- `bash: true` 为主机 shell 启用 `! <cmd>`。需要 `tools.elevated.enabled` 和 `tools.elevated.allowFrom.<channel>` 中的发送者。
- `config: true` 启用 `/config`（读取/写入 `openclaw.json`）。对于网关 `chat.send` 客户端，持久的 `/config set|unset` 写入还需要 `operator.admin`；只读 `/config show` 仍然对正常写入范围的操作员客户端可用。
- `mcp: true` 启用 `/mcp` 用于 `mcp.servers` 下 OpenClaw 管理的 MCP 服务器配置。
- `plugins: true` 启用 `/plugins` 用于插件发现、安装和启用/禁用控制。
- `channels.<provider>.configWrites` 每渠道门控配置变更（默认：true）。
- 对于多账户渠道，`channels.<provider>.accounts.<id>.configWrites` 也门控针对该账户的写入（例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`）。
- `restart: false` 禁用 `/restart` 和网关重启工具动作。默认：`true`。
- `ownerAllowFrom` 是仅所有者命令/工具的显式所有者允许列表。它与 `allowFrom` 分开。
- `ownerDisplay: "hash"` 在系统提示中哈希所有者 id。设置 `ownerDisplaySecret` 控制哈希。
- `allowFrom` 是每提供商的。设置时，它是**唯一的**授权来源（渠道允许列表/配对和 `useAccessGroups` 被忽略）。
- `useAccessGroups: false` 允许命令在未设置 `allowFrom` 时绕过访问组策略。
- 命令文档映射：
  - 内置 + 捆绑目录：[斜线命令](/tools/slash-commands)
  - 渠道特定命令接口：[渠道](/channels)
  - QQ Bot 命令：[QQ Bot](/channels/qqbot)
  - 配对命令：[配对](/channels/pairing)
  - LINE 卡片命令：[LINE](/channels/line)
  - 记忆梦境：[梦境](/concepts/dreaming)

</Accordion>

---

## 相关链接

- [配置参考](/gateway/configuration-reference) — 顶级键
- [配置 — 代理](/gateway/config-agents)
- [渠道概述](/channels)
