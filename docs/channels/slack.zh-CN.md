---
summary: "Slack 设置和运行时行为（Socket Mode + HTTP Request URLs）"
read_when:
  - 设置 Slack 或调试 Slack socket/HTTP 模式
title: "Slack"
---

通过 Slack 应用集成，私信和频道均已生产就绪。默认模式是 Socket Mode；也支持 HTTP Request URLs。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Slack 私信默认使用配对模式。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="频道故障排查" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断和修复手册。
  </Card>
</CardGroup>

## 快速设置

<Tabs>
  <Tab title="Socket Mode（默认）">
    <Steps>
      <Step title="创建新的 Slack 应用">
        在 Slack 应用设置中点击 **[创建新应用](https://api.slack.com/apps/new)** 按钮：

        - 选择**从清单创建**并为您的应用选择工作区
        - 粘贴下面的[示例清单](#manifest-and-scope-checklist)并继续创建
        - 生成具有 `connections:write` 权限的**应用级 Token**（`xapp-...`）
        - 安装应用并复制显示的 **Bot Token**（`xoxb-...`）

      </Step>

      <Step title="配置 OpenClaw">

        推荐的 SecretRef 设置：

```bash
export SLACK_APP_TOKEN=xapp-...
export SLACK_BOT_TOKEN=xoxb-...
cat > slack.socket.patch.json5 <<'JSON5'
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
    },
  },
}
JSON5
openclaw config patch --file ./slack.socket.patch.json5 --dry-run
openclaw config patch --file ./slack.socket.patch.json5
```

        环境变量回退（仅限默认账户）：

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="启动网关">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP Request URLs">
    <Steps>
      <Step title="创建新的 Slack 应用">
        在 Slack 应用设置中点击 **[创建新应用](https://api.slack.com/apps/new)** 按钮：

        - 选择**从清单创建**并为您的应用选择工作区
        - 粘贴[示例清单](#manifest-and-scope-checklist)并在创建前更新 URL
        - 保存**签名密钥**用于请求验证
        - 安装应用并复制显示的 **Bot Token**（`xoxb-...`）

      </Step>

      <Step title="配置 OpenClaw">

        推荐的 SecretRef 设置：

```bash
export SLACK_BOT_TOKEN=xoxb-...
export SLACK_SIGNING_SECRET=...
cat > slack.http.patch.json5 <<'JSON5'
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      signingSecret: { source: "env", provider: "default", id: "SLACK_SIGNING_SECRET" },
      webhookPath: "/slack/events",
    },
  },
}
JSON5
openclaw config patch --file ./slack.http.patch.json5 --dry-run
openclaw config patch --file ./slack.http.patch.json5
```

        <Note>
        多账户 HTTP 模式请使用唯一的 Webhook 路径

        为每个账户设置不同的 `webhookPath`（默认 `/slack/events`），以避免注册冲突。
        </Note>

      </Step>

      <Step title="启动网关">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>
</Tabs>

## Socket Mode 传输调优

OpenClaw 默认将 Slack SDK 客户端 pong 超时设置为 Socket Mode 的 15 秒。仅在需要针对特定工作区或主机进行调优时才覆盖传输设置：

```json5
{
  channels: {
    slack: {
      mode: "socket",
      socketMode: {
        clientPingTimeout: 20000,
        serverPingTimeout: 30000,
        pingPongLoggingEnabled: false,
      },
    },
  },
}
```

仅在 Socket Mode 工作区记录 Slack WebSocket pong/服务器 ping 超时或在已知事件循环饥饿的主机上运行时使用此选项。`clientPingTimeout` 是 SDK 发送客户端 ping 后等待 pong 的时间；`serverPingTimeout` 是等待 Slack 服务器 ping 的时间。应用消息和事件是应用状态，不是传输活跃信号。

## 清单和权限范围检查清单

Slack 应用的基础清单对 Socket Mode 和 HTTP Request URLs 相同。只有 `settings` 块（以及斜杠命令的 `url`）不同。

基础清单（Socket Mode 默认）：

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "app_mentions:read",
        "assistant:write",
        "channels:history",
        "channels:read",
        "chat:write",
        "commands",
        "emoji:read",
        "files:read",
        "files:write",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "pins:read",
        "pins:write",
        "reactions:read",
        "reactions:write",
        "usergroups:read",
        "users:read"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_home_opened",
        "app_mention",
        "channel_rename",
        "member_joined_channel",
        "member_left_channel",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "pin_added",
        "pin_removed",
        "reaction_added",
        "reaction_removed"
      ]
    }
  }
}
```

对于 **HTTP Request URLs 模式**，将 `settings` 替换为 HTTP 变体，并为每个斜杠命令添加 `url`。需要公共 URL：

```json
{
  "features": {
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false,
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": [
        "app_home_opened",
        "app_mention",
        "channel_rename",
        "member_joined_channel",
        "member_left_channel",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "pin_added",
        "pin_removed",
        "reaction_added",
        "reaction_removed"
      ]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

### 其他清单设置

展示扩展上述默认值的不同功能。

默认清单启用 Slack App Home 的 **Home** 标签并订阅 `app_home_opened`。当工作区成员打开 Home 标签时，OpenClaw 使用 `views.publish` 发布一个安全的默认 Home 视图；不包含对话内容或私有配置。**Messages** 标签保持启用状态用于 Slack 私信。

<AccordionGroup>
  <Accordion title="可选的原生斜杠命令">

    可以使用多个[原生斜杠命令](#commands-and-slash-behavior)替代单个配置的命令：

    - 使用 `/agentstatus` 而不是 `/status`，因为 `/status` 命令已被保留。
    - 一次最多可以提供 25 个斜杠命令。

    将现有的 `features.slash_commands` 部分替换为[可用命令](/tools/slash-commands#command-list)的子集：

    <Tabs>
      <Tab title="Socket Mode（默认）">

```json
{
  "slash_commands": [
    {
      "command": "/new",
      "description": "Start a new session",
      "usage_hint": "[model]"
    },
    {
      "command": "/reset",
      "description": "Reset the current session"
    },
    {
      "command": "/compact",
      "description": "Compact the session context",
      "usage_hint": "[instructions]"
    },
    {
      "command": "/stop",
      "description": "Stop the current run"
    },
    {
      "command": "/session",
      "description": "Manage thread-binding expiry",
      "usage_hint": "idle <duration|off> or max-age <duration|off>"
    },
    {
      "command": "/think",
      "description": "Set the thinking level",
      "usage_hint": "<level>"
    },
    {
      "command": "/verbose",
      "description": "Toggle verbose output",
      "usage_hint": "on|off|full"
    },
    {
      "command": "/fast",
      "description": "Show or set fast mode",
      "usage_hint": "[status|on|off]"
    },
    {
      "command": "/reasoning",
      "description": "Toggle reasoning visibility",
      "usage_hint": "[on|off|stream]"
    },
    {
      "command": "/elevated",
      "description": "Toggle elevated mode",
      "usage_hint": "[on|off|ask|full]"
    },
    {
      "command": "/exec",
      "description": "Show or set exec defaults",
      "usage_hint": "host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>"
    },
    {
      "command": "/model",
      "description": "Show or set the model",
      "usage_hint": "[name|#|status]"
    },
    {
      "command": "/models",
      "description": "List providers/models",
      "usage_hint": "[provider] [page] [limit=<n>|size=<n>|all]"
    },
    {
      "command": "/help",
      "description": "Show the short help summary"
    },
    {
      "command": "/commands",
      "description": "Show the generated command catalog"
    },
    {
      "command": "/tools",
      "description": "Show what the current agent can use right now",
      "usage_hint": "[compact|verbose]"
    },
    {
      "command": "/agentstatus",
      "description": "Show runtime status, including provider usage/quota when available"
    },
    {
      "command": "/tasks",
      "description": "List active/recent background tasks for the current session"
    },
    {
      "command": "/context",
      "description": "Explain how context is assembled",
      "usage_hint": "[list|detail|json]"
    },
    {
      "command": "/whoami",
      "description": "Show your sender identity"
    },
    {
      "command": "/skill",
      "description": "Run a skill by name",
      "usage_hint": "<name> [input]"
    },
    {
      "command": "/btw",
      "description": "Ask a side question without changing session context",
      "usage_hint": "<question>"
    },
    {
      "command": "/side",
      "description": "Ask a side question without changing session context",
      "usage_hint": "<question>"
    },
    {
      "command": "/usage",
      "description": "Control the usage footer or show cost summary",
      "usage_hint": "off|tokens|full|cost"
    }
  ]
}
```

      </Tab>
      <Tab title="HTTP Request URLs">
        使用与上面 Socket Mode 相同的 `slash_commands` 列表，并在每个条目中添加 `"url": "https://gateway-host.example.com/slack/events"`。示例：

```json
{
  "slash_commands": [
    {
      "command": "/new",
      "description": "Start a new session",
      "usage_hint": "[model]",
      "url": "https://gateway-host.example.com/slack/events"
    },
    {
      "command": "/help",
      "description": "Show the short help summary",
      "url": "https://gateway-host.example.com/slack/events"
    }
  ]
}
```

        在列表中的每个命令上重复该 `url` 值。

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion title="可选的作者权限范围（写操作）">
    如果您希望出站消息使用活动智能体身份（自定义用户名和图标）而不是默认的 Slack 应用身份，请添加 `chat:write.customize` bot 权限范围。

    如果您使用表情符号图标，Slack 需要 `:emoji_name:` 语法。

  </Accordion>
  <Accordion title="可选的用户 Token 权限范围（读操作）">
    如果您配置了 `channels.slack.userToken`，典型的读取权限范围包括：

    - `channels:history`、`groups:history`、`im:history`、`mpim:history`
    - `channels:read`、`groups:read`、`im:read`、`mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read`（如果依赖 Slack 搜索读取）

  </Accordion>
</AccordionGroup>

## Token 模型

- Socket Mode 需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受明文字符串或 SecretRef 对象。
- 配置中的 Token 会覆盖环境变量回退。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 环境变量回退仅适用于默认账户。
- `userToken`（`xoxp-...`）仅限配置（无环境变量回退），默认为只读行为（`userTokenReadOnly: true`）。

状态快照行为：

- Slack 账户检查跟踪每个凭据的 `*Source` 和 `*Status` 字段（`botToken`、`appToken`、`signingSecret`、`userToken`）。
- 状态为 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示账户通过 SecretRef 或其他非内联密钥源配置，但当前命令/运行时路径无法解析实际值。
- 在 HTTP 模式下，包含 `signingSecretStatus`；在 Socket Mode 下，必需对是 `botTokenStatus` + `appTokenStatus`。

<Tip>
对于操作/目录读取，配置了用户 Token 时可以优先使用。对于写入，Bot Token 仍然优先；仅在 `userTokenReadOnly: false` 且 Bot Token 不可用时才允许用户 Token 写入。
</Tip>

## 操作和门控

Slack 操作由 `channels.slack.actions.*` 控制。

当前 Slack 工具中可用的操作组：

| 组         | 默认 |
| ---------- | ---- |
| messages   | 启用 |
| reactions  | 启用 |
| pins       | 启用 |
| memberInfo | 启用 |
| emojiList  | 启用 |

当前 Slack 消息操作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。`download-file` 接受入站文件占位符中显示的 Slack 文件 ID，并为图片返回图片预览，为其他文件类型返回本地文件元数据。

## 访问控制和路由

<Tabs>
  <Tab title="私信策略">
    `channels.slack.dmPolicy` 控制私信访问。`channels.slack.allowFrom` 是规范的私信白名单。

    - `pairing`（默认）
    - `allowlist`
    - `open`（需要 `channels.slack.allowFrom` 包含 `"*"`）
    - `disabled`

    私信标志：

    - `dm.enabled`（默认 true）
    - `channels.slack.allowFrom`
    - `dm.allowFrom`（旧版）
    - `dm.groupEnabled`（群组私信默认 false）
    - `dm.groupChannels`（可选的 MPIM 白名单）

    多账户优先级：

    - `channels.slack.accounts.default.allowFrom` 仅适用于 `default` 账户。
    - 命名账户在未设置自己的 `allowFrom` 时继承 `channels.slack.allowFrom`。
    - 命名账户不继承 `channels.slack.accounts.default.allowFrom`。

    旧版 `channels.slack.dm.policy` 和 `channels.slack.dm.allowFrom` 仍可读取以保持兼容。`openclaw doctor --fix` 会在不改变访问权限的情况下将它们迁移到 `dmPolicy` 和 `allowFrom`。

    私信配对使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="频道策略">
    `channels.slack.groupPolicy` 控制频道处理：

    - `open`
    - `allowlist`
    - `disabled`

    频道白名单位于 `channels.slack.channels` 下，**必须使用稳定的 Slack 频道 ID**（例如 `C12345678`）作为配置键。

    运行时说明：如果 `channels.slack` 完全缺失（仅环境变量设置），运行时回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    名称/ID 解析：

    - 频道白名单条目和私信白名单条目在启动时解析（如果 Token 访问允许）
    - 未解析的频道名称条目保持配置但默认忽略路由
    - 入站授权和频道路由默认以 ID 优先；直接用户名/slug 匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    基于名称的键（`#channel-name` 或 `channel-name`）在 `groupPolicy: "allowlist"` 下**不匹配**。频道查找默认以 ID 优先，因此基于名称的键永远无法成功路由，该频道中的所有消息都会被静默阻止。这与 `groupPolicy: "open"` 不同，在 `open` 模式下不需要频道键进行路由，基于名称的键看起来可以工作。

    始终使用 Slack 频道 ID 作为键。查找方法：在 Slack 中右键点击频道 → **复制链接** — URL 末尾会出现 ID（`C...`）。

    正确：

    ```json5
    {
      channels: {
        slack: {
          groupPolicy: "allowlist",
          channels: {
            C12345678: { allow: true, requireMention: true },
          },
        },
      },
    }
    ```

    错误（在 `groupPolicy: "allowlist"` 下被静默阻止）：

    ```json5
    {
      channels: {
        slack: {
          groupPolicy: "allowlist",
          channels: {
            "#eng-my-channel": { allow: true, requireMention: true },
          },
        },
      },
    }
    ```
    </Warning>

  </Tab>

  <Tab title="提及和频道用户">
    频道消息默认由提及门控。

    提及来源：

    - 显式应用提及（`<@botId>`）
    - 当 Bot 用户是该用户组成员时，Slack 用户组提及（`<!subteam^S...>`）；需要 `usergroups:read`
    - 提及正则模式（`agents.list[].groupChat.mentionPatterns`，回退到 `messages.groupChat.mentionPatterns`）
    - 隐式回复机器人线程行为（当 `thread.requireExplicitMention` 为 `true` 时禁用）

    每频道控制（`channels.slack.channels.<id>`；名称仅通过启动解析或 `dangerouslyAllowNameMatching`）：

    - `requireMention`
    - `users`（白名单）
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`、`toolsBySender`
    - `toolsBySender` 键格式：`id:`、`e164:`、`username:`、`name:` 或 `"*"` 通配符
      （旧版无前缀键仍映射到 `id:` 仅匹配）

    对于频道和私有频道，`allowBots` 是保守的：仅当发送机器人明确列在该房间的 `users` 白名单中，或至少一个来自 `channels.slack.allowFrom` 的显式 Slack 所有者 ID 当前是房间成员时，才接受机器人作者的房间消息。通配符和显示名称所有者条目不满足所有者存在条件。所有者存在使用 Slack `conversations.members`；确保应用具有该房间类型的匹配读取权限范围（公共频道为 `channels:read`，私有频道为 `groups:read`）。如果成员查找失败，OpenClaw 会丢弃机器人作者的房间消息。

  </Tab>
</Tabs>

## 线程、会话和回复标签

- 私信路由为 `direct`；频道为 `channel`；MPIM 为 `group`。
- Slack 路由绑定接受原始对等 ID 以及 Slack 目标形式，如 `channel:C12345678`、`user:U12345678` 和 `<@U12345678>`。
- 使用默认 `session.dmScope=main` 时，Slack 私信折叠到智能体主会话。
- 频道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 线程回复可以创建线程会话后缀（`:thread:<threadTs>`）。
- `channels.slack.thread.historyScope` 默认为 `thread`；`thread.inheritParent` 默认为 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制新线程会话开始时获取的现有线程消息数量（默认 `20`；设为 `0` 禁用）。
- `channels.slack.thread.requireExplicitMention`（默认 `false`）：当为 `true` 时，抑制隐式线程提及，即使机器人已参与线程，也只响应线程中的显式 `@bot` 提及。否则，机器人参与的线程中的回复会绕过 `requireMention` 门控。

回复线程控制：

- `channels.slack.replyToMode`：`off|first|all|batched`（默认 `off`）
- `channels.slack.replyToModeByChatType`：按 `direct|group|channel` 设置
- 直接聊天的旧版回退：`channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

<Note>
`replyToMode="off"` 禁用 Slack 中的**所有**回复线程，包括显式的 `[[reply_to_*]]` 标签。这与 Telegram 不同，Telegram 在 `"off"` 模式下仍然遵守显式标签。Slack 线程会从频道中隐藏消息，而 Telegram 回复在内联中保持可见。
</Note>

## 确认反应

`ackReaction` 在 OpenClaw 处理入站消息时发送确认 emoji。

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 智能体身份 emoji 回退（`agents.list[].identity.emoji`，否则为 "👀"）

说明：

- Slack 需要短代码（例如 `"eyes"`）。
- 使用 `""` 禁用 Slack 账户或全局的反应。

## 文本流式传输

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流式传输。
- `partial`（默认）：用最新的部分输出替换预览文本。
- `block`：追加分块预览更新。
- `progress`：生成时显示进度状态文本，然后发送最终文本。
- `streaming.preview.toolProgress`：当草稿预览激活时，将工具/进度更新路由到同一个编辑预览消息中（默认：`true`）。设为 `false` 保留单独的工具/进度消息。
- `streaming.preview.commandText` / `streaming.progress.commandText`：设为 `status` 保留紧凑的工具进度行同时隐藏原始命令/exec 文本（默认：`raw`）。

隐藏原始命令/exec 文本同时保留紧凑进度行：

```json
{
  "channels": {
    "slack": {
      "streaming": {
        "mode": "progress",
        "progress": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

`channels.slack.streaming.nativeTransport` 控制当 `channels.slack.streaming.mode` 为 `partial` 时的 Slack 原生文本流式传输（默认：`true`）。

- 回复线程必须可用，才能显示原生文本流式传输和 Slack 助手线程状态。线程选择仍遵循 `replyToMode`。
- 频道、群组聊天和顶级私信根仍可在原生流式传输不可用或没有回复线程时使用正常草稿预览。
- 顶级 Slack 私信默认无线程，因此不显示 Slack 的线程式原生流/状态预览；OpenClaw 在私信中发布和编辑草稿预览。
- 媒体和非文本有效负载回退到正常投递。
- 媒体/错误最终结果取消待处理的预览编辑；符合条件的文本/块最终结果仅在能够就地编辑预览时才刷新。
- 如果流式传输在回复中途失败，OpenClaw 回退到剩余有效负载的正常投递。

使用草稿预览而不是 Slack 原生文本流式传输：

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "partial",
        nativeTransport: false,
      },
    },
  },
}
```

旧版键：

- `channels.slack.streamMode`（`replace | status_final | append`）自动迁移到 `channels.slack.streaming.mode`。
- 布尔型 `channels.slack.streaming` 自动迁移到 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport`。
- 旧版 `channels.slack.nativeStreaming` 自动迁移到 `channels.slack.streaming.nativeTransport`。

## 输入反应回退

`typingReaction` 在 OpenClaw 处理回复时为入站 Slack 消息添加临时反应，完成后删除。这在线程回复之外最有用，因为线程回复使用默认的"正在输入..."状态指示器。

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

说明：

- Slack 需要短代码（例如 `"hourglass_flowing_sand"`）。
- 反应是尽力而为的，回复或失败路径完成后会自动尝试清理。

## 媒体、分块和投递

<AccordionGroup>
  <Accordion title="入站附件">
    Slack 文件附件从 Slack 托管的私有 URL（Token 认证请求流）下载，在获取成功且大小限制允许的情况下写入媒体存储。文件占位符包含 Slack `fileId`，以便智能体可以使用 `download-file` 获取原始文件。

    下载使用有界的空闲超时和总超时。如果 Slack 文件检索停止或失败，OpenClaw 继续处理消息并回退到文件占位符。

    运行时入站大小上限默认为 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

  <Accordion title="出站文本和文件">
    - 文本块使用 `channels.slack.textChunkLimit`（默认 4000）
    - `channels.slack.chunkMode="newline"` 启用段落优先分割
    - 文件发送使用 Slack 上传 API，可以包含线程回复（`thread_ts`）
    - 出站媒体上限遵循配置的 `channels.slack.mediaMaxMb`；否则频道发送使用媒体管道中的 MIME 类型默认值

  </Accordion>

  <Accordion title="投递目标">
    推荐的显式目标：

    - `user:<id>` 用于私信
    - `channel:<id>` 用于频道

    纯文本/块 Slack 私信可以直接发布到用户 ID；文件上传和线程发送首先通过 Slack 对话 API 打开私信，因为这些路径需要具体的对话 ID。

  </Accordion>
</AccordionGroup>

## 命令和斜杠行为

斜杠命令在 Slack 中显示为单个配置的命令或多个原生命令。配置 `channels.slack.slashCommand` 更改命令默认值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

原生命令需要 Slack 应用中的[其他清单设置](#additional-manifest-settings)，并通过 `channels.slack.commands.native: true` 或全局配置中的 `commands.native: true` 启用。

- 原生命令自动模式对 Slack **关闭**，因此 `commands.native: "auto"` 不启用 Slack 原生命令。

```txt
/help
```

原生参数菜单使用自适应渲染策略，在分发选定的选项值之前显示确认模态框：

- 最多 5 个选项：按钮块
- 6-100 个选项：静态选择菜单
- 超过 100 个选项：当交互选项处理程序可用时，使用带异步选项过滤的外部选择
- 超过 Slack 限制：编码的选项值回退到按钮

```txt
/think
```

斜杠会话使用独立键，如 `agent:<agentId>:slack:slash:<userId>`，并仍使用 `CommandTargetSessionKey` 将命令执行路由到目标对话会话。

## 交互式回复

Slack 可以渲染智能体创作的交互式回复控件，但此功能默认禁用。

全局启用：

```json5
{
  channels: {
    slack: {
      capabilities: {
        interactiveReplies: true,
      },
    },
  },
}
```

或仅为一个 Slack 账户启用：

```json5
{
  channels: {
    slack: {
      accounts: {
        ops: {
          capabilities: {
            interactiveReplies: true,
          },
        },
      },
    },
  },
}
```

启用后，智能体可以发出 Slack 专用回复指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

这些指令编译为 Slack Block Kit，并通过现有的 Slack 交互事件路径路由点击或选择。

说明：

- 这是 Slack 专用 UI。其他频道不将 Slack Block Kit 指令转换为自己的按钮系统。
- 交互回调值是 OpenClaw 生成的不透明 Token，而不是智能体创作的原始值。
- 如果生成的交互块会超过 Slack Block Kit 限制，OpenClaw 回退到原始文本回复，而不是发送无效的块有效负载。

## Slack 中的 Exec 审批

Slack 可以充当具有交互按钮和交互的原生审批客户端，而不是回退到 Web UI 或终端。

- Exec 审批使用 `channels.slack.execApprovals.*` 进行原生私信/频道路由。
- 当请求已经落在 Slack 中且审批 ID 类型为 `plugin:` 时，插件审批仍然可以通过同一个 Slack 原生按钮界面解决。
- 审批者授权仍然强制执行：只有被识别为审批者的用户才能通过 Slack 批准或拒绝请求。

这使用与其他频道相同的共享审批按钮界面。当 Slack 应用设置中启用了 `interactivity` 时，审批提示直接在对话中渲染为 Block Kit 按钮。
当这些按钮存在时，它们是主要的审批 UX；OpenClaw
仅当工具结果表明聊天审批不可用或手动审批是唯一路径时，才应包含手动 `/approve` 命令。

配置路径：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers`（可选；无法使用时回退到 `commands.ownerAllowFrom`）
- `channels.slack.execApprovals.target`（`dm` | `channel` | `both`，默认：`dm`）
- `agentFilter`、`sessionFilter`

当 `enabled` 未设置或为 `"auto"` 且至少一个审批者解析成功时，Slack 自动启用原生 exec 审批。将 `enabled: false` 明确禁用 Slack 作为原生审批客户端。
将 `enabled: true` 强制在审批者解析时打开原生审批。

没有显式 Slack exec 审批配置时的默认行为：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有在需要覆盖审批者、添加过滤器或选择来源聊天投递时，才需要显式的 Slack 原生配置：

```json5
{
  channels: {
    slack: {
      execApprovals: {
        enabled: true,
        approvers: ["U12345678"],
        target: "both",
      },
    },
  },
}
```

共享的 `approvals.exec` 转发是独立的。仅在 exec 审批提示还必须路由到其他聊天或显式带外目标时使用它。共享的 `approvals.plugin` 转发也是独立的；当这些请求已经落在 Slack 中时，Slack 原生按钮仍然可以解决插件审批。

同一聊天中的 `/approve` 也适用于已支持命令的 Slack 频道和私信。请参阅 [Exec 审批](/tools/exec-approvals) 了解完整的审批转发模型。

## 事件和运行时行为

- 消息编辑/删除映射为系统事件。
- 线程广播（"同时发送到频道"的线程回复）作为普通用户消息处理。
- 反应添加/删除事件映射为系统事件。
- 成员加入/离开、频道创建/重命名和图钉添加/删除事件映射为系统事件。
- 当 `configWrites` 启用时，`channel_id_changed` 可以迁移频道配置键。
- 频道话题/用途元数据被视为不可信上下文，可以注入到路由上下文中。
- 线程发起者和初始线程历史上下文填充在适用时由配置的发件人白名单过滤。
- 块操作和模态交互发出结构化的 `Slack interaction: ...` 系统事件，包含丰富的有效负载字段：
  - 块操作：选定值、标签、选择器值和 `workflow_*` 元数据
  - 模态 `view_submission` 和 `view_closed` 事件，包含路由的频道元数据和表单输入

## 配置参考

主要参考：[配置参考 - Slack](/gateway/config-channels#slack)。

<Accordion title="高信号 Slack 字段">

- 模式/认证：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
- 私信访问：`dm.enabled`、`dmPolicy`、`allowFrom`（旧版：`dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
- 兼容性切换：`dangerouslyAllowNameMatching`（紧急模式；除非需要否则保持关闭）
- 频道访问：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
- 线程/历史：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
- 投递：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`streaming.nativeTransport`、`streaming.preview.toolProgress`
- 操作/功能：`configWrites`、`commands.native`、`slashCommand.*`、`actions.*`、`userToken`、`userTokenReadOnly`

</Accordion>

## 故障排查

<AccordionGroup>
  <Accordion title="频道中没有回复">
    按顺序检查：

    - `groupPolicy`
    - 频道白名单（`channels.slack.channels`）— **键必须是频道 ID**（`C12345678`），而不是名称（`#channel-name`）。基于名称的键在 `groupPolicy: "allowlist"` 下静默失败，因为频道路由默认以 ID 优先。查找 ID 的方法：在 Slack 中右键点击频道 → **复制链接** — URL 末尾的 `C...` 值就是频道 ID。
    - `requireMention`
    - 每频道 `users` 白名单

    有用的命令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="私信消息被忽略">
    检查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy`（或旧版 `channels.slack.dm.policy`）
    - 配对审批/白名单条目
    - Slack 助手私信事件：详细日志中提到 `drop message_changed` 通常意味着 Slack 发送了一个编辑的助手线程事件，消息元数据中没有可恢复的人工发件人

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode 无法连接">
    验证 Bot Token + 应用 Token 以及 Slack 应用设置中的 Socket Mode 启用状态。

    如果 `openclaw channels status --probe --json` 显示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，表示 Slack 账户已配置但当前运行时无法解析 SecretRef 支持的值。

  </Accordion>

  <Accordion title="HTTP 模式未接收事件">
    验证：

    - 签名密钥
    - Webhook 路径
    - Slack Request URLs（事件 + 交互性 + 斜杠命令）
    - 每个 HTTP 账户的唯一 `webhookPath`

    如果账户快照中出现 `signingSecretStatus: "configured_unavailable"`，表示 HTTP 账户已配置但当前运行时无法解析 SecretRef 支持的签名密钥。

  </Accordion>

  <Accordion title="原生/斜杠命令未触发">
    验证是否打算：

    - 原生命令模式（`channels.slack.commands.native: true`）以及在 Slack 中注册的匹配斜杠命令
    - 或单一斜杠命令模式（`channels.slack.slashCommand.enabled: true`）

    还需检查 `commands.useAccessGroups` 以及频道/用户白名单。

  </Accordion>
</AccordionGroup>

## 附件视觉参考

当 Slack 文件下载成功且大小限制允许时，Slack 可以将下载的媒体附加到智能体轮次。图像文件可以通过媒体理解路径或直接传递给支持视觉的回复模型；其他文件保留为可下载的文件上下文，而不是作为图像输入处理。

### 支持的媒体类型

| 媒体类型                     | 来源            | 当前行为                                                   | 说明                                                  |
| ---------------------------- | --------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| JPEG / PNG / GIF / WebP 图像 | Slack 文件 URL  | 下载并附加到轮次用于视觉处理                               | 每文件上限：`channels.slack.mediaMaxMb`（默认 20 MB） |
| PDF 文件                     | Slack 文件 URL  | 下载并作为文件上下文暴露给 `download-file` 或 `pdf` 等工具 | Slack 入站不会自动将 PDF 转换为图像视觉输入           |
| 其他文件                     | Slack 文件 URL  | 尽可能下载并作为文件上下文暴露                             | 二进制文件不作为图像输入处理                          |
| 线程回复                     | 线程发起者文件  | 当回复没有直接媒体时，根消息文件可以作为上下文水化         | 仅文件的发起者使用附件占位符                          |
| 多图像消息                   | 多个 Slack 文件 | 每个文件独立评估                                           | Slack 处理每条消息上限为八个文件                      |

### 入站管道

当带有文件附件的 Slack 消息到达时：

1. OpenClaw 使用 Bot Token（`xoxb-...`）从 Slack 的私有 URL 下载文件。
2. 成功时将文件写入媒体存储。
3. 下载的媒体路径和内容类型添加到入站上下文。
4. 支持图像的模型/工具路径可以使用该上下文中的图像附件。
5. 非图像文件保留为文件元数据或工具可处理的媒体引用。

### 线程根附件继承

当消息到达线程中时（有 `thread_ts` 父级）：

- 如果回复本身没有直接媒体，且包含的根消息有文件，Slack 可以将根文件作为线程发起者上下文水化。
- 直接回复附件优先于根消息附件。
- 仅有文件没有文本的根消息用附件占位符表示，这样回退仍然可以包含其文件。

### 多附件处理

当单条 Slack 消息包含多个文件附件时：

- 每个附件通过媒体管道独立处理。
- 下载的媒体引用聚合到消息上下文中。
- 处理顺序遵循 Slack 事件有效负载中的文件顺序。
- 一个附件下载失败不会阻止其他附件。

### 大小、下载和模型限制

- **大小上限**：每文件默认 20 MB。可通过 `channels.slack.mediaMaxMb` 配置。
- **下载失败**：Slack 无法服务的文件、过期 URL、无法访问的文件、超大文件以及 Slack 认证/登录 HTML 响应被跳过，而不是报告为不支持的格式。
- **视觉模型**：图像分析使用支持视觉的活动回复模型，或 `agents.defaults.imageModel` 处配置的图像模型。

### 已知限制

| 场景                         | 当前行为                                      | 解决方案                                                      |
| ---------------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| 过期的 Slack 文件 URL        | 文件被跳过；不显示错误                        | 在 Slack 中重新上传文件                                       |
| 未配置视觉模型               | 图像附件存储为媒体引用，但不作为图像分析      | 配置 `agents.defaults.imageModel` 或使用支持视觉的回复模型    |
| 非常大的图像（默认 > 20 MB） | 按大小上限跳过                                | 如果 Slack 允许，增加 `channels.slack.mediaMaxMb`             |
| 转发/共享的附件              | 文本和 Slack 托管的图像/文件媒体是尽力而为的  | 直接在 OpenClaw 线程中重新分享                                |
| PDF 附件                     | 存储为文件/媒体上下文，不自动通过图像视觉路由 | 使用 `download-file` 获取文件元数据或 `pdf` 工具进行 PDF 分析 |

### 相关文档

- [媒体理解管道](/nodes/media-understanding)
- [PDF 工具](/tools/pdf)
- Epic：[#51349](https://github.com/openclaw/openclaw/issues/51349) — Slack 附件视觉启用
- 回归测试：[#51353](https://github.com/openclaw/openclaw/issues/51353)
- 实时验证：[#51354](https://github.com/openclaw/openclaw/issues/51354)

## 相关

<CardGroup cols={2}>
  <Card title="配对" icon="link" href="/channels/pairing">
    将 Slack 用户配对到网关。
  </Card>
  <Card title="群组" icon="users" href="/channels/groups">
    频道和群组私信行为。
  </Card>
  <Card title="频道路由" icon="route" href="/channels/channel-routing">
    将入站消息路由到智能体。
  </Card>
  <Card title="安全性" icon="shield" href="/gateway/security">
    威胁模型和加固。
  </Card>
  <Card title="配置" icon="sliders" href="/gateway/configuration">
    配置布局和优先级。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/tools/slash-commands">
    命令目录和行为。
  </Card>
</CardGroup>
