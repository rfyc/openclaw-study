---
summary: "Mattermost 机器人设置和 OpenClaw 配置"
read_when:
  - 设置 Mattermost
  - 调试 Mattermost 路由
title: "Mattermost"
sidebarTitle: "Mattermost"
---

状态：可下载插件（机器人令牌 + WebSocket 事件）。支持频道、群组和私信。Mattermost 是一个可自托管的团队消息平台；请访问官方网站 [mattermost.com](https://mattermost.com) 了解产品详情和下载。

## 安装

在配置频道之前安装 Mattermost：

<Tabs>
  <Tab title="npm 仓库">
    ```bash
    openclaw plugins install @openclaw/mattermost
    ```
  </Tab>
  <Tab title="本地检出">
    ```bash
    openclaw plugins install ./path/to/local/mattermost-plugin
    ```
  </Tab>
</Tabs>

详情：[插件](/tools/plugin)

## 快速设置

<Steps>
  <Step title="确保插件可用">
    当前打包的 OpenClaw 版本已捆绑它。旧版/自定义安装可以使用上述命令手动添加。
  </Step>
  <Step title="创建 Mattermost 机器人">
    创建 Mattermost 机器人账户并复制**机器人令牌**。
  </Step>
  <Step title="复制基础 URL">
    复制 Mattermost **基础 URL**（例如 `https://chat.example.com`）。
  </Step>
  <Step title="配置 OpenClaw 并启动网关">
    最小配置：

    ```json5
    {
      channels: {
        mattermost: {
          enabled: true,
          botToken: "mm-token",
          baseUrl: "https://chat.example.com",
          dmPolicy: "pairing",
        },
      },
    }
    ```

  </Step>
</Steps>

## 原生斜杠命令

原生斜杠命令是可选启用的。启用后，OpenClaw 通过 Mattermost API 注册 `oc_*` 斜杠命令，并在网关 HTTP 服务器上接收回调 POST。

```json5
{
  channels: {
    mattermost: {
      commands: {
        native: true,
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost/command",
        // 当 Mattermost 无法直接访问网关时使用（反向代理/公共 URL）。
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="行为说明">
    - `native: "auto"` 对 Mattermost 默认禁用。设置 `native: true` 以启用。
    - 如果省略 `callbackUrl`，OpenClaw 从网关主机/端口 + `callbackPath` 派生一个。
    - 对于多账户设置，`commands` 可以在顶层设置或在 `channels.mattermost.accounts.<id>.commands` 下设置（账户值覆盖顶层字段）。
    - 命令回调使用 Mattermost 在 OpenClaw 注册 `oc_*` 命令时返回的每命令令牌进行验证。
    - OpenClaw 在接受每个回调之前刷新当前 Mattermost 命令注册，因此已删除或重新生成的斜杠命令的过时令牌将停止被接受，无需重启网关。
    - 当注册失败、启动部分完成或回调令牌与已解析命令的注册令牌不匹配时，回调验证失败关闭；验证失败短暂缓存，并发查找合并，每命令的新鲜查找启动速率受限以限制重放压力。
    - 当注册失败、启动部分完成或回调令牌与已解析命令的注册令牌不匹配时，斜杠回调失败关闭（某个命令的有效令牌无法到达不同命令的上游验证）。

  </Accordion>
  <Accordion title="可达性要求">
    回调端点必须可从 Mattermost 服务器访问。

    - 除非 Mattermost 与 OpenClaw 在同一主机/网络命名空间上运行，否则不要将 `callbackUrl` 设置为 `localhost`。
    - 除非该 URL 将 `/api/channels/mattermost/command` 反向代理到 OpenClaw，否则不要将 `callbackUrl` 设置为 Mattermost 基础 URL。
    - 快速检查：`curl https://<gateway-host>/api/channels/mattermost/command`；GET 应从 OpenClaw 返回 `405 Method Not Allowed`，而不是 `404`。

  </Accordion>
  <Accordion title="Mattermost 出口白名单">
    如果您的回调目标是私有/tailnet/内部地址，请将 Mattermost `ServiceSettings.AllowedUntrustedInternalConnections` 设置为包含回调主机/域名。

    使用主机/域名条目，而不是完整 URL。

    - 正确：`gateway.tailnet-name.ts.net`
    - 错误：`https://gateway.tailnet-name.ts.net`

  </Accordion>
</AccordionGroup>

## 环境变量（默认账户）

如果您更喜欢使用环境变量，请在网关主机上设置：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

<Note>
环境变量仅适用于**默认**账户（`default`）。其他账户必须使用配置值。

`MATTERMOST_URL` 不能从工作区 `.env` 设置；请参阅[工作区 `.env` 文件](/gateway/security)。
</Note>

## 聊天模式

Mattermost 自动回复私信。频道行为由 `chatmode` 控制：

<Tabs>
  <Tab title="oncall（默认）">
    仅在频道中被 @ 提及时回复。
  </Tab>
  <Tab title="onmessage">
    回复每条频道消息。
  </Tab>
  <Tab title="onchar">
    当消息以触发前缀开头时回复。
  </Tab>
</Tabs>

配置示例：

```json5
{
  channels: {
    mattermost: {
      chatmode: "onchar",
      oncharPrefixes: [">", "!"],
    },
  },
}
```

说明：

- `onchar` 仍然响应明确的 @ 提及。
- `channels.mattermost.requireMention` 对旧版配置有效，但首选 `chatmode`。

## 线程和会话

使用 `channels.mattermost.replyToMode` 控制频道和群组回复是留在主频道中还是在触发帖子下启动线程。

- `off`（默认）：仅在入站帖子已经在线程中时才在线程中回复。
- `first`：对于顶级频道/群组帖子，在该帖子下启动线程，并将对话路由到线程范围的会话。
- `all`：目前与 `first` 对 Mattermost 行为相同。
- 私信忽略此设置，保持非线程化。

配置示例：

```json5
{
  channels: {
    mattermost: {
      replyToMode: "all",
    },
  },
}
```

说明：

- 线程范围的会话使用触发帖子 id 作为线程根。
- `first` 和 `all` 目前等效，因为一旦 Mattermost 有了线程根，后续的块和媒体将继续在同一线程中。

## 访问控制（私信）

- 默认：`channels.mattermost.dmPolicy = "pairing"`（未知发送者获得配对码）。
- 通过以下方式批准：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公开私信：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`。

## 频道（群组）

- 默认：`channels.mattermost.groupPolicy = "allowlist"`（提及门控）。
- 使用 `channels.mattermost.groupAllowFrom` 将发送者加入白名单（推荐使用用户 ID）。
- 每频道提及覆盖位于 `channels.mattermost.groups.<channelId>.requireMention` 下，或 `channels.mattermost.groups["*"].requireMention` 作为默认值。
- `@username` 匹配是可变的，仅在 `channels.mattermost.dangerouslyAllowNameMatching: true` 时启用。
- 开放频道：`channels.mattermost.groupPolicy="open"`（提及门控）。
- 运行时说明：如果 `channels.mattermost` 完全缺失，运行时回退到 `groupPolicy="allowlist"` 进行群组检查（即使设置了 `channels.defaults.groupPolicy`）。

示例：

```json5
{
  channels: {
    mattermost: {
      groupPolicy: "open",
      groups: {
        "*": { requireMention: true },
        "team-channel-id": { requireMention: false },
      },
    },
  },
}
```

## 出站投递目标

在 `openclaw message send` 或 cron/webhooks 中使用这些目标格式：

- `channel:<id>` 用于频道
- `user:<id>` 用于私信
- `@username` 用于私信（通过 Mattermost API 解析）

<Warning>
裸不透明 ID（如 `64ifufp...`）在 Mattermost 中**有歧义**（用户 ID 与频道 ID）。

OpenClaw **优先解析为用户**：

- 如果该 ID 作为用户存在（`GET /api/v4/users/<id>` 成功），OpenClaw 通过 `/api/v4/channels/direct` 解析直接频道发送**私信**。
- 否则该 ID 被视为**频道 ID**。

如果您需要确定性行为，请始终使用显式前缀（`user:<id>` / `channel:<id>`）。
</Warning>

## 私信频道重试

当 OpenClaw 向 Mattermost 私信目标发送时，需要先解析直接频道，默认情况下会重试短暂的直接频道创建失败。

使用 `channels.mattermost.dmChannelRetry` 全局调整 Mattermost 插件的该行为，或使用 `channels.mattermost.accounts.<id>.dmChannelRetry` 针对某个账户。

```json5
{
  channels: {
    mattermost: {
      dmChannelRetry: {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        timeoutMs: 30000,
      },
    },
  },
}
```

说明：

- 这仅适用于私信频道创建（`/api/v4/channels/direct`），而不是每个 Mattermost API 调用。
- 重试适用于短暂失败，例如速率限制、5xx 响应以及网络或超时错误。
- `429` 以外的 4xx 客户端错误被视为永久性的，不会重试。

## 预览流式传输

Mattermost 将思考、工具活动和部分回复文本流式传输到单个**草稿预览帖子**中，当最终答案可以安全发送时，该帖子就地完成。预览在同一帖子 id 上更新，而不是用每块消息刷屏频道。媒体/错误最终结果取消待处理的预览编辑，并使用正常投递，而不是刷新一个临时预览帖子。

通过 `channels.mattermost.streaming` 启用：

```json5
{
  channels: {
    mattermost: {
      streaming: "partial", // off | partial | block | progress
    },
  },
}
```

<AccordionGroup>
  <Accordion title="流式传输模式">
    - `partial` 是通常的选择：一个预览帖子，随着回复增长而被编辑，然后用完整答案完成。
    - `block` 在预览帖子内使用追加样式的草稿块。
    - `progress` 在生成时显示状态预览，并仅在完成时发布最终答案。
    - `off` 禁用预览流式传输。

  </Accordion>
  <Accordion title="流式传输行为说明">
    - 如果流式传输无法就地完成（例如帖子在流式传输过程中被删除），OpenClaw 回退到发送新的最终帖子，确保回复不会丢失。
    - 仅推理的有效负载从频道帖子中抑制，包括作为 `> Reasoning:` 块引用到达的文本。设置 `/reasoning on` 以在其他界面中查看思考；Mattermost 最终帖子仅保留答案。
    - 请参阅[流式传输](/concepts/streaming#preview-streaming-modes)了解频道映射矩阵。

  </Accordion>
</AccordionGroup>

## 反应（消息工具）

- 使用 `message action=react` 和 `channel=mattermost`。
- `messageId` 是 Mattermost 帖子 id。
- `emoji` 接受 `thumbsup` 或 `:+1:`（冒号可选）等名称。
- 设置 `remove=true`（布尔值）以移除反应。
- 反应添加/移除事件作为系统事件转发到路由的智能体会话。

示例：

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

配置：

- `channels.mattermost.actions.reactions`：启用/禁用反应操作（默认 true）。
- 每账户覆盖：`channels.mattermost.accounts.<id>.actions.reactions`。

## 交互按钮（消息工具）

发送带有可点击按钮的消息。当用户点击按钮时，智能体接收选择并可以响应。

通过向频道功能添加 `inlineButtons` 来启用按钮：

```json5
{
  channels: {
    mattermost: {
      capabilities: ["inlineButtons"],
    },
  },
}
```

使用带有 `buttons` 参数的 `message action=send`。按钮是一个二维数组（按钮行）：

```
message action=send channel=mattermost target=channel:<channelId> buttons=[[{"text":"Yes","callback_data":"yes"},{"text":"No","callback_data":"no"}]]
```

按钮字段：

<ParamField path="text" type="string" required>
  显示标签。
</ParamField>
<ParamField path="callback_data" type="string" required>
  点击时发回的值（用作操作 ID）。
</ParamField>
<ParamField path="style" type='"default" | "primary" | "danger"'>
  按钮样式。
</ParamField>

当用户点击按钮时：

<Steps>
  <Step title="按钮替换为确认信息">
    所有按钮替换为确认行（例如，"✓ **Yes** selected by @user"）。
  </Step>
  <Step title="智能体接收选择">
    智能体将选择作为入站消息接收并响应。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="实现说明">
    - 按钮回调使用 HMAC-SHA256 验证（自动，无需配置）。
    - Mattermost 从其 API 响应中剥离回调数据（安全功能），因此点击时所有按钮都被移除——部分移除是不可能的。
    - 包含连字符或下划线的操作 ID 会自动清理（Mattermost 路由限制）。

  </Accordion>
  <Accordion title="配置和可达性">
    - `channels.mattermost.capabilities`：功能字符串数组。添加 `"inlineButtons"` 以在智能体系统提示中启用按钮工具描述。
    - `channels.mattermost.interactions.callbackBaseUrl`：按钮回调的可选外部基础 URL（例如 `https://gateway.example.com`）。当 Mattermost 无法直接访问网关的绑定主机时使用。
    - 在多账户设置中，您也可以在 `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下设置相同字段。
    - 如果省略 `interactions.callbackBaseUrl`，OpenClaw 从 `gateway.customBindHost` + `gateway.port` 派生回调 URL，然后回退到 `http://localhost:<port>`。
    - 可达性规则：按钮回调 URL 必须可从 Mattermost 服务器访问。`localhost` 仅在 Mattermost 和 OpenClaw 在同一主机/网络命名空间上运行时有效。
    - 如果您的回调目标是私有/tailnet/内部地址，请将其主机/域名添加到 Mattermost `ServiceSettings.AllowedUntrustedInternalConnections`。

  </Accordion>
</AccordionGroup>

### 直接 API 集成（外部脚本）

外部脚本和 webhooks 可以直接通过 Mattermost REST API 发布按钮，而不是通过智能体的 `message` 工具。尽可能使用插件中的 `buildButtonAttachments()`；如果发布原始 JSON，请遵循以下规则：

**有效负载结构：**

```json5
{
  channel_id: "<channelId>",
  message: "Choose an option:",
  props: {
    attachments: [
      {
        actions: [
          {
            id: "mybutton01", // 仅字母数字——见下文
            type: "button", // 必填，否则点击被静默忽略
            name: "Approve", // 显示标签
            style: "primary", // 可选："default"、"primary"、"danger"
            integration: {
              url: "https://gateway.example.com/mattermost/interactions/default",
              context: {
                action_id: "mybutton01", // 必须匹配按钮 id（用于名称查找）
                action: "approve",
                // ... 任何自定义字段 ...
                _token: "<hmac>", // 见下面的 HMAC 部分
              },
            },
          },
        ],
      },
    ],
  },
}
```

<Warning>
**关键规则**

1. 附件放在 `props.attachments` 中，而不是顶级 `attachments`（静默忽略）。
2. 每个操作都需要 `type: "button"` — 没有它，点击将被静默吞噬。
3. 每个操作都需要 `id` 字段 — Mattermost 忽略没有 ID 的操作。
4. 操作 `id` 必须**仅为字母数字**（`[a-zA-Z0-9]`）。连字符和下划线会破坏 Mattermost 的服务器端操作路由（返回 404）。使用前先去除它们。
5. `context.action_id` 必须匹配按钮的 `id`，以便确认消息显示按钮名称（例如"Approve"）而不是原始 ID。
6. `context.action_id` 是必填的 — 没有它，交互处理程序返回 400。

</Warning>

**HMAC 令牌生成**

网关使用 HMAC-SHA256 验证按钮点击。外部脚本必须生成与网关验证逻辑匹配的令牌：

<Steps>
  <Step title="从机器人令牌派生密钥">
    `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`
  </Step>
  <Step title="构建上下文对象">
    构建包含所有字段（除 `_token` 外）的上下文对象。
  </Step>
  <Step title="使用排序键序列化">
    使用**排序键**和**无空格**序列化（网关使用带排序键的 `JSON.stringify`，生成紧凑输出）。
  </Step>
  <Step title="签名有效负载">
    `HMAC-SHA256(key=secret, data=serializedContext)`
  </Step>
  <Step title="添加令牌">
    将生成的十六进制摘要作为 `_token` 添加到上下文中。
  </Step>
</Steps>

Python 示例：

```python
import hmac, hashlib, json

secret = hmac.new(
    b"openclaw-mattermost-interactions",
    bot_token.encode(), hashlib.sha256
).hexdigest()

ctx = {"action_id": "mybutton01", "action": "approve"}
payload = json.dumps(ctx, sort_keys=True, separators=(",", ":"))
token = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

context = {**ctx, "_token": token}
```

<AccordionGroup>
  <Accordion title="常见 HMAC 陷阱">
    - Python 的 `json.dumps` 默认添加空格（`{"key": "val"}`）。使用 `separators=(",", ":")` 匹配 JavaScript 的紧凑输出（`{"key":"val"}`）。
    - 始终签名**所有**上下文字段（减去 `_token`）。网关先剥离 `_token` 然后签名剩余的所有内容。签名子集会导致静默验证失败。
    - 使用 `sort_keys=True` — 网关在签名前对键进行排序，Mattermost 在存储有效负载时可能会重新排序上下文字段。
    - 从机器人令牌派生密钥（确定性的），而不是随机字节。创建按钮的进程和验证它的网关之间的密钥必须相同。

  </Accordion>
</AccordionGroup>

## 目录适配器

Mattermost 插件包含一个目录适配器，通过 Mattermost API 解析频道和用户名称。这使得 `openclaw message send` 和 cron/webhook 投递中的 `#channel-name` 和 `@username` 目标成为可能。

无需配置——适配器使用账户配置中的机器人令牌。

## 多账户

Mattermost 在 `channels.mattermost.accounts` 下支持多个账户：

```json5
{
  channels: {
    mattermost: {
      accounts: {
        default: { name: "Primary", botToken: "mm-token", baseUrl: "https://chat.example.com" },
        alerts: { name: "Alerts", botToken: "mm-token-2", baseUrl: "https://alerts.example.com" },
      },
    },
  },
}
```

## 故障排查

<AccordionGroup>
  <Accordion title="频道中没有回复">
    确保机器人在频道中并提及它（oncall），使用触发前缀（onchar），或设置 `chatmode: "onmessage"`。
  </Accordion>
  <Accordion title="认证或多账户错误">
    - 检查机器人令牌、基础 URL 以及账户是否已启用。
    - 多账户问题：环境变量仅适用于 `default` 账户。

  </Accordion>
  <Accordion title="原生斜杠命令失败">
    - `Unauthorized: invalid command token.`：OpenClaw 未接受回调令牌。典型原因：
      - 斜杠命令注册失败或在启动时只部分完成
      - 回调指向了错误的网关/账户
      - Mattermost 仍有指向之前回调目标的旧命令
      - 网关在未重新激活斜杠命令的情况下重启
    - 如果原生斜杠命令停止工作，请检查日志中的 `mattermost: failed to register slash commands` 或 `mattermost: native slash commands enabled but no commands could be registered`。
    - 如果省略 `callbackUrl` 并且日志警告回调解析为 `http://127.0.0.1:18789/...`，该 URL 可能只在 Mattermost 与 OpenClaw 在同一主机/网络命名空间上运行时才可访问。改为设置显式的外部可访问 `commands.callbackUrl`。

  </Accordion>
  <Accordion title="按钮问题">
    - 按钮显示为白框：智能体可能发送了格式错误的按钮数据。检查每个按钮是否同时具有 `text` 和 `callback_data` 字段。
    - 按钮渲染但点击无效：验证 Mattermost 服务器配置中的 `AllowedUntrustedInternalConnections` 是否包含 `127.0.0.1 localhost`，以及 ServiceSettings 中的 `EnablePostActionIntegration` 是否为 `true`。
    - 按钮点击返回 404：按钮 `id` 可能包含连字符或下划线。Mattermost 的操作路由器在非字母数字 ID 上出现问题。仅使用 `[a-zA-Z0-9]`。
    - 网关日志 `invalid _token`：HMAC 不匹配。检查您是否签名了所有上下文字段（不是子集），使用了排序键，并使用了紧凑 JSON（无空格）。请参阅上面的 HMAC 部分。
    - 网关日志 `missing _token in context`：`_token` 字段不在按钮的上下文中。确保在构建集成有效负载时包含它。
    - 确认显示原始 ID 而不是按钮名称：`context.action_id` 与按钮的 `id` 不匹配。将两者设置为相同的清理后值。
    - 智能体不知道按钮：将 `capabilities: ["inlineButtons"]` 添加到 Mattermost 频道配置中。

  </Accordion>
</AccordionGroup>

## 相关文档

- [频道路由](/channels/channel-routing) — 消息的会话路由
- [频道概述](/channels) — 所有支持的频道
- [群组](/channels/groups) — 群组聊天行为和提及门控
- [配对](/channels/pairing) — 私信认证和配对流程
- [安全性](/gateway/security) — 访问模型和安全加固
