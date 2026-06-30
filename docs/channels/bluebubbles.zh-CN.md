---
summary: "通过 BlueBubbles macOS 服务器实现 iMessage 集成（REST 收发、输入状态、反应、配对、高级操作）。"
read_when:
  - 设置 BlueBubbles 频道
  - 排查 webhook 配对问题
  - 在 macOS 上配置 iMessage
title: "BlueBubbles"
sidebarTitle: "BlueBubbles"
---

状态：捆绑插件，通过 HTTP 与 BlueBubbles macOS 服务器通信。**推荐用于 iMessage 集成**，与旧版 imsg 频道相比，其 API 更丰富且设置更简便。

<Note>
当前 OpenClaw 版本已捆绑 BlueBubbles，正常的打包版本无需单独执行 `openclaw plugins install` 步骤。
</Note>

## 概述

- 通过 BlueBubbles 辅助应用在 macOS 上运行（[bluebubbles.app](https://bluebubbles.app)）。
- 推荐/已测试版本：macOS Sequoia (15)。macOS Tahoe (26) 可用；但目前在 Tahoe 上编辑功能已损坏，群组图标更新可能报告成功但不同步。
- OpenClaw 通过其 REST API 与其通信（`GET /api/v1/ping`、`POST /message/text`、`POST /chat/:id/*`）。
- 入站消息通过 webhook 到达；出站回复、输入指示符、已读回执和轻触回应均为 REST 调用。
- 附件和贴纸作为入站媒体摄取（在可能的情况下呈现给智能体）。
- 自动合成 MP3 或 CAF 音频的 TTS 回复以 iMessage 语音备忘录气泡而非普通文件附件的形式发送。
- 配对/白名单工作方式与其他频道相同（`/channels/pairing` 等），使用 `channels.bluebubbles.allowFrom` 和配对码。
- 反应以系统事件的形式呈现，与 Slack/Telegram 一样，让智能体在回复前可以"提及"它们。
- 高级功能：编辑、撤回、回复线程、消息效果、群组管理。

## 快速开始

<Steps>
  <Step title="安装 BlueBubbles">
    在 Mac 上安装 BlueBubbles 服务器（请按照 [bluebubbles.app/install](https://bluebubbles.app/install) 上的说明操作）。
  </Step>
  <Step title="启用 Web API">
    在 BlueBubbles 配置中启用 Web API 并设置密码。
  </Step>
  <Step title="配置 OpenClaw">
    运行 `openclaw onboard` 并选择 BlueBubbles，或手动配置：

    ```json5
    {
      channels: {
        bluebubbles: {
          enabled: true,
          serverUrl: "http://192.168.1.100:1234",
          password: "example-password",
          webhookPath: "/bluebubbles-webhook",
        },
      },
    }
    ```

  </Step>
  <Step title="将 webhook 指向网关">
    将 BlueBubbles webhook 指向您的网关（示例：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）。
  </Step>
  <Step title="启动网关">
    启动网关；它将注册 webhook 处理程序并开始配对。
  </Step>
</Steps>

<Warning>
**安全性**

- 请务必设置 webhook 密码。
- Webhook 认证始终是必须的。无论回环/代理拓扑如何，OpenClaw 都会拒绝不包含与 `channels.bluebubbles.password` 匹配的密码/guid 的 BlueBubbles webhook 请求（例如 `?password=<password>` 或 `x-password`）。
- 密码认证在读取/解析完整 webhook 正文之前进行检查。

</Warning>

## 保持 Messages.app 活跃（虚拟机/无头设置）

某些 macOS 虚拟机/长期运行的设置可能导致 Messages.app 进入"空闲"状态（直到应用被打开/切换到前台，入站事件才会停止）。一个简单的解决方法是使用 AppleScript + LaunchAgent **每 5 分钟触发一次 Messages**。

<Steps>
  <Step title="保存 AppleScript">
    将其保存为 `~/Scripts/poke-messages.scpt`：

    ```applescript
    try
      tell application "Messages"
        if not running then
          launch
        end if

        -- Touch the scripting interface to keep the process responsive.
        set _chatCount to (count of chats)
      end tell
    on error
      -- Ignore transient failures (first-run prompts, locked session, etc).
    end try
    ```

  </Step>
  <Step title="安装 LaunchAgent">
    将其保存为 `~/Library/LaunchAgents/com.user.poke-messages.plist`：

    ```xml
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
      <dict>
        <key>Label</key>
        <string>com.user.poke-messages</string>

        <key>ProgramArguments</key>
        <array>
          <string>/bin/bash</string>
          <string>-lc</string>
          <string>/usr/bin/osascript &quot;$HOME/Scripts/poke-messages.scpt&quot;</string>
        </array>

        <key>RunAtLoad</key>
        <true/>

        <key>StartInterval</key>
        <integer>300</integer>

        <key>StandardOutPath</key>
        <string>/tmp/poke-messages.log</string>
        <key>StandardErrorPath</key>
        <string>/tmp/poke-messages.err</string>
      </dict>
    </plist>
    ```

    每 **300 秒**运行一次，**登录时**也运行。首次运行可能触发 macOS **自动化**提示（`osascript` → Messages）。在运行 LaunchAgent 的同一用户会话中批准这些提示。

  </Step>
  <Step title="加载">
    ```bash
    launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
    launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
    ```
  </Step>
</Steps>

## 引导配置

BlueBubbles 在交互式引导中可用：

```
openclaw onboard
```

向导提示输入：

<ParamField path="Server URL" type="string" required>
  BlueBubbles 服务器地址（例如 `http://192.168.1.100:1234`）。
</ParamField>
<ParamField path="Password" type="string" required>
  BlueBubbles 服务器设置中的 API 密码。
</ParamField>
<ParamField path="Webhook path" type="string" default="/bluebubbles-webhook">
  Webhook 端点路径。
</ParamField>
<ParamField path="DM policy" type="string">
  `pairing`、`allowlist`、`open` 或 `disabled`。
</ParamField>
<ParamField path="Allow list" type="string[]">
  电话号码、电子邮件或聊天目标。
</ParamField>

也可以通过 CLI 添加 BlueBubbles：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 访问控制（私信和群组）

<Tabs>
  <Tab title="私信">
    - 默认：`channels.bluebubbles.dmPolicy = "pairing"`。
    - 未知发送者收到配对码；消息将被忽略，直到获批准（码在 1 小时后过期）。
    - 通过以下方式审批：
      - `openclaw pairing list bluebubbles`
      - `openclaw pairing approve bluebubbles <CODE>`
    - 配对是默认的令牌交换方式。详情：[配对](/channels/pairing)

  </Tab>
  <Tab title="群组">
    - `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（默认：`allowlist`）。
    - 当设置为 `allowlist` 时，`channels.bluebubbles.groupAllowFrom` 控制哪些人可以在群组中触发。

  </Tab>
</Tabs>

### 联系人姓名丰富（macOS，可选）

BlueBubbles 群组 webhook 通常只包含原始参与者地址。如果您希望 `GroupMembers` 上下文显示本地联系人姓名而非原始地址，可以在 macOS 上启用本地联系人丰富功能：

- `channels.bluebubbles.enrichGroupParticipantsFromContacts = true` 启用查找。默认：`false`。
- 查找仅在群组访问、命令授权和提及门控允许消息通过后运行。
- 仅对未命名的电话参与者进行丰富。
- 未找到本地匹配时，原始电话号码仍作为回退。

```json5
{
  channels: {
    bluebubbles: {
      enrichGroupParticipantsFromContacts: true,
    },
  },
}
```

### 提及门控（群组）

BlueBubbles 支持群组聊天的提及门控，与 iMessage/WhatsApp 行为一致：

- 使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）检测提及。
- 当为群组启用 `requireMention` 时，智能体只在被提及时响应。
- 来自授权发送者的控制命令可绕过提及门控。

每个群组的配置：

```json5
{
  channels: {
    bluebubbles: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true }, // 所有群组的默认值
        "iMessage;-;chat123": { requireMention: false }, // 特定群组的覆盖
      },
    },
  },
}
```

### 命令门控

- 控制命令（如 `/config`、`/model`）需要授权。
- 使用 `allowFrom` 和 `groupAllowFrom` 确定命令授权。
- 授权发送者即使在群组中未提及也可以运行控制命令。

### 每个群组的系统提示

`channels.bluebubbles.groups.*` 下的每个条目都接受一个可选的 `systemPrompt` 字符串。该值会在处理该群组消息的每个轮次中注入到智能体的系统提示中，因此您可以设置每个群组的角色或行为规则，而无需编辑智能体提示：

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;-;chat123": {
          systemPrompt: "Keep responses under 3 sentences. Mirror the group's casual tone.",
        },
      },
    },
  },
}
```

键与 BlueBubbles 报告的该群组的 `chatGuid`/`chatIdentifier`/数字 `chatId` 匹配，`"*"` 通配符条目为每个没有精确匹配的群组提供默认值（与 `requireMention` 和每个群组工具策略使用相同的模式）。精确匹配始终优先于通配符。私信忽略此字段；请改用智能体级或帐户级提示自定义。

#### 示例：线程回复和轻触反应（私有 API）

启用 BlueBubbles 私有 API 后，入站消息带有短消息 ID（例如 `[[reply_to:5]]`），智能体可以调用 `action=reply` 线程进入特定消息，或调用 `action=react` 添加轻触反应。每个群组的 `systemPrompt` 是保持智能体选择正确工具的可靠方式：

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;+;chat-family": {
          systemPrompt: "When replying in this group, always call action=reply with the [[reply_to:N]] messageId from context so your response threads under the triggering message. Never send a new unlinked message. For short acknowledgements ('ok', 'got it', 'on it'), use action=react with an appropriate tapback emoji (❤️, 👍, 😂, ‼️, ❓) instead of sending a text reply.",
        },
      },
    },
  },
}
```

轻触反应和线程回复都需要 BlueBubbles 私有 API；请参阅[高级操作](#advanced-actions)和[消息 ID](#message-ids-short-vs-full)了解底层机制。

## ACP 对话绑定

BlueBubbles 聊天可以转换为持久 ACP 工作区，而无需更改传输层。

快速操作员流程：

- 在私信或允许的群组聊天中运行 `/acp spawn codex --bind here`。
- 同一 BlueBubbles 对话中的未来消息将路由到生成的 ACP 会话。
- `/new` 和 `/reset` 就地重置相同的绑定 ACP 会话。
- `/acp close` 关闭 ACP 会话并删除绑定。

还支持通过顶级 `bindings[]` 条目配置持久绑定，其中 `type: "acp"` 且 `match.channel: "bluebubbles"`。

`match.peer.id` 可以使用任何支持的 BlueBubbles 目标形式：

- 规范化的私信句柄，如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

对于稳定的群组绑定，优先使用 `chat_id:*` 或 `chat_identifier:*`。

示例：

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: { agent: "codex", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "bluebubbles",
        accountId: "default",
        peer: { kind: "dm", id: "+15555550123" },
      },
      acp: { label: "codex-imessage" },
    },
  ],
}
```

请参阅 [ACP 智能体](/tools/acp-agents)了解共享的 ACP 绑定行为。

## 输入状态和已读回执

- **输入指示符**：在生成响应之前和期间自动发送。
- **已读回执**：由 `channels.bluebubbles.sendReadReceipts` 控制（默认：`true`）。
- **输入指示符**：OpenClaw 发送输入开始事件；BlueBubbles 在发送或超时时自动清除输入（通过 DELETE 手动停止不可靠）。

```json5
{
  channels: {
    bluebubbles: {
      sendReadReceipts: false, // 禁用已读回执
    },
  },
}
```

## 高级操作

BlueBubbles 在配置中启用时支持高级消息操作：

```json5
{
  channels: {
    bluebubbles: {
      actions: {
        reactions: true, // 轻触反应（默认：true）
        edit: true, // 编辑已发送的消息（macOS 13+，macOS 26 Tahoe 上已损坏）
        unsend: true, // 撤回消息（macOS 13+）
        reply: true, // 通过消息 GUID 进行回复线程
        sendWithEffect: true, // 消息效果（撞击、大声等）
        renameGroup: true, // 重命名群组聊天
        setGroupIcon: true, // 设置群组聊天图标/照片（macOS 26 Tahoe 上不稳定）
        addParticipant: true, // 向群组添加参与者
        removeParticipant: true, // 从群组中移除参与者
        leaveGroup: true, // 退出群组聊天
        sendAttachment: true, // 发送附件/媒体
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="可用操作">
    - **react**：添加/移除轻触反应（`messageId`、`emoji`、`remove`）。iMessage 的原生轻触集合为 `love`、`like`、`dislike`、`laugh`、`emphasize` 和 `question`。当智能体选择集合外的表情（例如 `👀`）时，反应工具会回退到 `love`，以确保轻触仍能渲染而不是使整个请求失败。已配置的确认反应仍然严格验证并在未知值上报错。
    - **edit**：编辑已发送的消息（`messageId`、`text`）。
    - **unsend**：撤回消息（`messageId`）。
    - **reply**：回复特定消息（`messageId`、`text`、`to`）。
    - **sendWithEffect**：带有 iMessage 效果发送（`text`、`to`、`effectId`）。
    - **renameGroup**：重命名群组聊天（`chatGuid`、`displayName`）。
    - **setGroupIcon**：设置群组聊天的图标/照片（`chatGuid`、`media`）——在 macOS 26 Tahoe 上不稳定（API 可能返回成功但图标不同步）。
    - **addParticipant**：将某人添加到群组（`chatGuid`、`address`）。
    - **removeParticipant**：从群组中移除某人（`chatGuid`、`address`）。
    - **leaveGroup**：退出群组聊天（`chatGuid`）。
    - **upload-file**：发送媒体/文件（`to`、`buffer`、`filename`、`asVoice`）。
      - 语音备忘录：将 `asVoice: true` 与 **MP3** 或 **CAF** 音频一起设置，以 iMessage 语音消息形式发送。BlueBubbles 在发送语音备忘录时将 MP3 转换为 CAF。
    - 旧别名：`sendAttachment` 仍然有效，但 `upload-file` 是规范操作名称。

  </Accordion>
</AccordionGroup>

### 消息 ID（短 ID vs 完整 ID）

OpenClaw 可能会显示*短*消息 ID（例如 `1`、`2`）以节省令牌。

- `MessageSid`/`ReplyToId` 可以是短 ID。
- `MessageSidFull`/`ReplyToIdFull` 包含提供商完整 ID。
- 短 ID 在内存中；重启或缓存逐出时可能会过期。
- 操作接受短或完整的 `messageId`，但如果短 ID 不再可用则会报错。

对持久自动化和存储使用完整 ID：

- 模板：`{{MessageSidFull}}`、`{{ReplyToIdFull}}`
- 上下文：入站有效负载中的 `MessageSidFull`/`ReplyToIdFull`

请参阅[配置](/gateway/configuration)了解模板变量。

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## 合并拆分发送的私信（命令和 URL 在同一次编写中）

当用户在 iMessage 中一起输入命令和 URL 时（例如 `Dump https://example.com/article`），Apple 会将发送拆分为**两个单独的 webhook 交付**：

1. 文本消息（`"Dump"`）。
2. 带有 OG 预览图片附件的 URL 预览气泡（`"https://..."`）。

两个 webhook 在大多数设置上间隔约 0.8-2.0 秒到达 OpenClaw。没有合并时，智能体在第 1 轮单独接收命令并回复（通常是"发给我 URL"），只有在第 2 轮才看到 URL——此时命令上下文已经丢失。

`channels.bluebubbles.coalesceSameSenderDms` 将私信选择为将连续的同发送者 webhook 合并为单个智能体轮次。群组聊天继续按消息键，以便保留多用户轮次结构。

<Tabs>
  <Tab title="何时启用">
    在以下情况下启用：

    - 您发布的技能期望在一条消息中接收 `command + payload`（dump、paste、save、queue 等）。
    - 您的用户将 URL、图片或长内容与命令一起粘贴。
    - 您可以接受增加的私信轮次延迟（见下文）。

    在以下情况下保持禁用：

    - 您需要最低命令延迟用于单词私信触发器。
    - 您所有的流程都是不带有效负载后续的一次性命令。

  </Tab>
  <Tab title="启用">
    ```json5
    {
      channels: {
        bluebubbles: {
          coalesceSameSenderDms: true, // 选择启用（默认：false）
        },
      },
    }
    ```

    启用该标志且没有明确的 `messages.inbound.byChannel.bluebubbles` 时，防抖窗口扩大到 **2500 毫秒**（非合并的默认值为 500 毫秒）。更宽的窗口是必需的——Apple 0.8-2.0 秒的拆分发送节奏不适合更紧的默认值。

    要自行调整窗口：

    ```json5
    {
      messages: {
        inbound: {
          byChannel: {
            // 2500 毫秒适合大多数设置；如果您的 Mac 速度慢
            // 或内存压力大，请提高到 4000 毫秒（观察到的间隔可能超过 2 秒）。
            bluebubbles: 2500,
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="权衡">
    - **私信控制命令的延迟增加。** 启用该标志后，私信控制命令消息（如 `Dump`、`Save` 等）现在会等待最多防抖窗口时间再调度，以防有效负载 webhook 即将到来。群组聊天命令保持即时调度。
    - **合并输出有上限**——合并文本上限为 4000 个字符，带有明确的 `…[truncated]` 标记；附件上限为 20 个；来源条目上限为 10 个（超过时保留第一个和最新的）。每个来源 `messageId` 仍然到达入站去重，因此任何单个事件的后续 MessagePoller 重播都被识别为重复。
    - **选择启用，每频道。** 其他频道（Telegram、WhatsApp、Slack……）不受影响。

  </Tab>
</Tabs>

### 场景及智能体所见内容

| 用户编写                                       | Apple 交付                | 标志关闭（默认）                       | 标志开启 + 2500 毫秒窗口                                  |
| ---------------------------------------------- | ------------------------- | -------------------------------------- | --------------------------------------------------------- |
| `Dump https://example.com`（一次发送）         | 2 个 webhook，间隔约 1 秒 | 两个智能体轮次："Dump"单独，然后是 URL | 一个轮次：合并文本 `Dump https://example.com`             |
| `Save this 📎image.jpg caption`（附件 + 文本） | 2 个 webhook              | 两个轮次                               | 一个轮次：文本 + 图片                                     |
| `/status`（独立命令）                          | 1 个 webhook              | 即时调度                               | **等待最多窗口时间，然后调度**                            |
| 单独粘贴 URL                                   | 1 个 webhook              | 即时调度                               | 即时调度（桶中只有一个条目）                              |
| 文本 + URL 作为两条独立消息发送，间隔数分钟    | 2 个 webhook，超出窗口    | 两个轮次                               | 两个轮次（窗口在它们之间过期）                            |
| 快速洪流（窗口内 >10 条小私信）                | N 个 webhook              | N 个轮次                               | 一个轮次，有界输出（第一个和最新的，文本/附件上限已应用） |

### 拆分发送合并故障排查

如果标志已开启但拆分发送仍作为两个轮次到达，请检查每一层：

<AccordionGroup>
  <Accordion title="配置实际已加载">
    ```
    grep coalesceSameSenderDms ~/.openclaw/openclaw.json
    ```

    然后 `openclaw gateway restart`——该标志在防抖注册表创建时读取。

  </Accordion>
  <Accordion title="防抖窗口对您的设置足够宽">
    查看 BlueBubbles 服务器日志 `~/Library/Logs/bluebubbles-server/main.log`：

    ```
    grep -E "Dispatching event to webhook" main.log | tail -20
    ```

    测量 `"Dump"` 类型的文本调度和随后的 `"https://..."; Attachments:` 调度之间的间隔。将 `messages.inbound.byChannel.bluebubbles` 提高到能舒适覆盖该间隔的值。

  </Accordion>
  <Accordion title="会话 JSONL 时间戳 ≠ webhook 到达时间">
    会话事件时间戳（`~/.openclaw/agents/<id>/sessions/*.jsonl`）反映的是网关将消息交给智能体的时间，**而非** webhook 到达时间。标记为 `[Queued messages while agent was busy]` 的排队第二条消息意味着第一个轮次在第二个 webhook 到达时仍在运行——合并桶已经清空。根据 BB 服务器日志而非会话日志调整窗口。
  </Accordion>
  <Accordion title="内存压力减慢回复调度">
    在较小的机器（8 GB）上，智能体轮次可能花费很长时间，以至于合并桶在回复完成之前清空，URL 作为排队的第二个轮次到达。检查 `memory_pressure` 和 `ps -o rss -p $(pgrep openclaw-gateway)`；如果网关超过约 500 MB RSS 且压缩器处于活动状态，请关闭其他重型进程或升级到更大的主机。
  </Accordion>
  <Accordion title="回复引用发送是不同的路径">
    如果用户将 `Dump` 作为对现有 URL 气泡的**回复**点击（iMessage 在 Dump 气泡上显示"1 Reply"徽章），URL 位于 `replyToBody` 中，而不是在第二个 webhook 中。合并不适用——这是技能/提示问题，而非防抖器问题。
  </Accordion>
</AccordionGroup>

## 块流

控制响应是作为单条消息发送还是以块流传输：

```json5
{
  channels: {
    bluebubbles: {
      blockStreaming: true, // 启用块流（默认关闭）
    },
  },
}
```

## 媒体和限制

- 入站附件被下载并存储在媒体缓存中。
- 通过 `channels.bluebubbles.mediaMaxMb` 控制入站和出站媒体的媒体上限（默认：8 MB）。
- 出站文本按 `channels.bluebubbles.textChunkLimit` 分块（默认：4000 个字符）。

## 配置参考

完整配置：[配置](/gateway/configuration)

<AccordionGroup>
  <Accordion title="连接和 Webhook">
    - `channels.bluebubbles.enabled`：启用/禁用频道。
    - `channels.bluebubbles.serverUrl`：BlueBubbles REST API 基础 URL。
    - `channels.bluebubbles.password`：API 密码。
    - `channels.bluebubbles.webhookPath`：Webhook 端点路径（默认：`/bluebubbles-webhook`）。

  </Accordion>
  <Accordion title="访问策略">
    - `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（默认：`pairing`）。
    - `channels.bluebubbles.allowFrom`：私信白名单（句柄、电子邮件、E.164 号码、`chat_id:*`、`chat_guid:*`）。
    - `channels.bluebubbles.groupPolicy`：`open | allowlist | disabled`（默认：`allowlist`）。
    - `channels.bluebubbles.groupAllowFrom`：群组发送者白名单。
    - `channels.bluebubbles.enrichGroupParticipantsFromContacts`：在 macOS 上，门控通过后可选择从本地联系人丰富未命名的群组参与者。默认：`false`。
    - `channels.bluebubbles.groups`：每个群组的配置（`requireMention` 等）。

  </Accordion>
  <Accordion title="交付和分块">
    - `channels.bluebubbles.sendReadReceipts`：发送已读回执（默认：`true`）。
    - `channels.bluebubbles.blockStreaming`：启用块流（默认：`false`；流式回复必需）。
    - `channels.bluebubbles.textChunkLimit`：出站块大小，以字符为单位（默认：4000）。
    - `channels.bluebubbles.sendTimeoutMs`：通过 `/api/v1/message/text` 出站文本发送的每个请求超时（毫秒）（默认：30000）。在 macOS 26 设置上，私有 API iMessage 发送可能在 iMessage 框架内停止超过 60 秒，此时可提高，例如 `45000` 或 `60000`。探测、聊天查找、反应、编辑和健康检查目前保留较短的 10 秒默认值；计划在后续扩展对反应和编辑的覆盖。每账户覆盖：`channels.bluebubbles.accounts.<accountId>.sendTimeoutMs`。
    - `channels.bluebubbles.chunkMode`：`length`（默认）仅在超过 `textChunkLimit` 时分割；`newline` 在长度分块之前按空行（段落边界）分割。

  </Accordion>
  <Accordion title="媒体和历史">
    - `channels.bluebubbles.mediaMaxMb`：入站/出站媒体上限（MB）（默认：8）。
    - `channels.bluebubbles.mediaLocalRoots`：出站本地媒体路径允许的绝对本地目录的明确白名单。默认情况下，除非配置了此项，否则拒绝本地路径发送。每账户覆盖：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
    - `channels.bluebubbles.coalesceSameSenderDms`：将连续的同发送者私信 webhook 合并为一个智能体轮次，以便 Apple 的文本+URL 拆分发送作为单条消息到达（默认：`false`）。查看[合并拆分发送的私信](#coalescing-split-send-dms-command--url-in-one-composition)了解场景、窗口调整和权衡。在没有明确 `messages.inbound.byChannel.bluebubbles` 的情况下启用时，将默认入站防抖窗口从 500 毫秒扩大到 2500 毫秒。
    - `channels.bluebubbles.historyLimit`：上下文的最大群组消息数（0 表示禁用）。
    - `channels.bluebubbles.dmHistoryLimit`：私信历史限制。
    - `channels.bluebubbles.replyContextApiFallback`：当入站回复没有 `replyToBody`/`replyToSender` 且内存中的回复上下文缓存未命中时，从 BlueBubbles HTTP API 获取原始消息作为尽力而为的回退（默认：`false`）。适用于共享一个 BlueBubbles 帐户的多实例部署、进程重启后或长期 TTL/LRU 缓存逐出后。获取受与每个其他 BlueBubbles 客户端请求相同的策略的 SSRF 保护，从不抛出，并填充缓存以便后续回复摊销。每账户覆盖：`channels.bluebubbles.accounts.<accountId>.replyContextApiFallback`。频道级设置传播到省略该标志的账户。

  </Accordion>
  <Accordion title="操作和账户">
    - `channels.bluebubbles.actions`：启用/禁用特定操作。
    - `channels.bluebubbles.accounts`：多账户配置。

  </Accordion>
</AccordionGroup>

相关全局选项：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。

## 寻址/交付目标

优先使用 `chat_guid` 进行稳定路由：

- `chat_guid:iMessage;-;+15555550123`（群组首选）
- `chat_id:123`
- `chat_identifier:...`
- 直接句柄：`+15555550123`、`user@example.com`
  - 如果直接句柄没有现有的私信聊天，OpenClaw 将通过 `POST /api/v1/chat/new` 创建一个。这需要启用 BlueBubbles 私有 API。

### iMessage vs SMS 路由

当同一句柄在 Mac 上同时有 iMessage 和 SMS 聊天（例如已注册 iMessage 的电话号码但也有绿色气泡回退），OpenClaw 优先选择 iMessage 聊天，从不静默降级到 SMS。要强制使用 SMS 聊天，请使用明确的 `sms:` 目标前缀（例如 `sms:+15555550123`）。没有匹配 iMessage 聊天的句柄仍通过 BlueBubbles 报告的任何聊天发送。

## 安全性

- Webhook 请求通过将 `guid`/`password` 查询参数或标头与 `channels.bluebubbles.password` 进行比较来认证。
- 保持 API 密码和 webhook 端点的保密性（将其视为凭据）。
- BlueBubbles webhook 认证没有 localhost 旁路。如果您代理 webhook 流量，请在请求端到端上保留 BlueBubbles 密码。`gateway.trustedProxies` 在这里不能替代 `channels.bluebubbles.password`。请参阅[网关安全性](/gateway/security#reverse-proxy-configuration)。
- 如果将 BlueBubbles 服务器暴露在本地局域网之外，请启用 HTTPS + 防火墙规则。

## 故障排查

- 如果输入/已读事件停止工作，请检查 BlueBubbles webhook 日志并验证网关路径与 `channels.bluebubbles.webhookPath` 是否匹配。
- 配对码一小时后过期；使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反应需要 BlueBubbles 私有 API（`POST /api/v1/message/react`）；确保服务器版本公开了该 API。
- 编辑/撤回需要 macOS 13+ 和兼容的 BlueBubbles 服务器版本。在 macOS 26 (Tahoe) 上，由于私有 API 更改，编辑目前已损坏。
- 群组图标更新在 macOS 26 (Tahoe) 上可能不稳定：API 可能返回成功但新图标不同步。
- OpenClaw 根据 BlueBubbles 服务器的 macOS 版本自动隐藏已知损坏的操作。如果编辑仍出现在 macOS 26 (Tahoe) 上，请使用 `channels.bluebubbles.actions.edit=false` 手动禁用它。
- `coalesceSameSenderDms` 已启用但拆分发送（例如 `Dump` + URL）仍作为两个轮次到达：请参阅[拆分发送合并故障排查](#split-send-coalescing-troubleshooting)清单——常见原因是防抖窗口太窄、会话日志时间戳被误读为 webhook 到达，或回复引用发送（使用 `replyToBody`，而非第二个 webhook）。
- 状态/健康信息：`openclaw status --all` 或 `openclaw status --deep`。

有关一般频道工作流参考，请参阅[频道](/channels)和[插件](/tools/plugin)指南。

## 相关文档

- [频道路由](/channels/channel-routing) — 消息的会话路由
- [频道概述](/channels) — 所有支持的频道
- [群组](/channels/groups) — 群组聊天行为和提及门控
- [配对](/channels/pairing) — 私信认证和配对流程
- [安全性](/gateway/security) — 访问模型和安全加固
