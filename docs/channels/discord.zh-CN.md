---
summary: "Discord 机器人支持状态、功能和配置"
read_when:
  - 正在开发 Discord 频道功能
title: "Discord"
---

通过官方 Discord 网关，支持私信和服务器频道。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Discord 私信默认使用配对模式。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="频道故障排查" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断和修复流程。
  </Card>
</CardGroup>

## 快速设置

您需要创建一个带机器人的新应用，将机器人添加到您的服务器，并将其配对到 OpenClaw。我们建议将机器人添加到您自己的私人服务器。如果您还没有，请先[创建一个](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（选择**为我和我的朋友创建**）。

<Steps>
  <Step title="创建 Discord 应用和机器人">
    前往 [Discord 开发者门户](https://discord.com/developers/applications)，点击**新建应用**。将其命名为类似"OpenClaw"的名称。

    点击侧边栏中的**机器人**。将**用户名**设置为您的 OpenClaw 智能体的名称。

  </Step>

  <Step title="启用特权意图">
    仍在**机器人**页面，向下滚动到**特权网关意图**并启用：

    - **消息内容意图**（必需）
    - **服务器成员意图**（推荐；角色白名单和名称到 ID 匹配所必需）
    - **状态意图**（可选；仅在需要状态更新时）

  </Step>

  <Step title="复制您的机器人令牌">
    在**机器人**页面向上滚动并点击**重置令牌**。

    <Note>
    尽管名称如此，这会生成您的第一个令牌——没有任何东西被"重置"。
    </Note>

    复制令牌并保存好。这是您的**机器人令牌**，您很快就需要它。

  </Step>

  <Step title="生成邀请 URL 并将机器人添加到您的服务器">
    点击侧边栏中的 **OAuth2**。您将生成一个具有正确权限的邀请 URL，以将机器人添加到您的服务器。

    向下滚动到 **OAuth2 URL 生成器**并启用：

    - `bot`
    - `applications.commands`

    下方将出现**机器人权限**部分。至少启用：

    **常规权限**
      - 查看频道
    **文字权限**
      - 发送消息
      - 读取消息历史
      - 嵌入链接
      - 附加文件
      - 添加反应（可选）

    这是普通文本频道的基准集。如果您计划在 Discord 线程中发布（包括创建或继续线程的论坛或媒体频道工作流），也请启用**在线程中发送消息**。
    复制底部生成的 URL，将其粘贴到浏览器中，选择您的服务器，然后点击**继续**进行连接。您现在应该可以在 Discord 服务器中看到您的机器人。

  </Step>

  <Step title="启用开发者模式并收集 ID">
    返回 Discord 应用，您需要启用开发者模式以便复制内部 ID。

    1. 点击**用户设置**（头像旁的齿轮图标）→ **高级** → 开启**开发者模式**
    2. 右键点击侧边栏中的**服务器图标** → **复制服务器 ID**
    3. 右键点击您的**头像** → **复制用户 ID**

    将您的**服务器 ID**和**用户 ID**与机器人令牌一起保存——您将在下一步中将这三者发送给 OpenClaw。

  </Step>

  <Step title="允许服务器成员发送私信">
    要使配对生效，Discord 需要允许您的机器人给您发私信。右键点击**服务器图标** → **隐私设置** → 开启**私信**。

    这允许服务器成员（包括机器人）给您发私信。如果您想在 Discord 中使用 OpenClaw 私信，请保持此选项启用。如果您只计划使用服务器频道，可以在配对后禁用私信。

  </Step>

  <Step title="安全设置您的机器人令牌（不要在聊天中发送它）">
    您的 Discord 机器人令牌是一个密钥（类似密码）。在向您的智能体发送消息之前，在运行 OpenClaw 的机器上设置它。

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
cat > discord.patch.json5 <<'JSON5'
{
  channels: {
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
    },
  },
}
JSON5
openclaw config patch --file ./discord.patch.json5 --dry-run
openclaw config patch --file ./discord.patch.json5
openclaw gateway
```

    如果 OpenClaw 已经作为后台服务运行，请通过 OpenClaw Mac 应用或停止并重启 `openclaw gateway run` 进程来重启它。
    对于托管服务安装，请在 `DISCORD_BOT_TOKEN` 存在的 shell 中运行 `openclaw gateway install`，或将变量存储在 `~/.openclaw/.env` 中，以便服务在重启后可以解析 env SecretRef。
    如果您的主机被 Discord 启动应用程序查找阻止或限流，请从开发者门户设置 Discord 应用/客户端 ID，以便启动时可以跳过该 REST 调用。对默认账户使用 `channels.discord.applicationId`，或在运行多个 Discord 机器人时使用 `channels.discord.accounts.<accountId>.applicationId`。

  </Step>

  <Step title="配置 OpenClaw 并配对">

    <Tabs>
      <Tab title="询问您的智能体">
        在任何现有频道（例如 Telegram）上与您的 OpenClaw 智能体聊天并告诉它。如果 Discord 是您的第一个频道，请使用 CLI/配置选项卡。

        > "我已经在配置中设置了我的 Discord 机器人令牌。请使用用户 ID `<user_id>` 和服务器 ID `<server_id>` 完成 Discord 设置。"
      </Tab>
      <Tab title="CLI / 配置">
        如果您更喜欢基于文件的配置，请设置：

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: {
        source: "env",
        provider: "default",
        id: "DISCORD_BOT_TOKEN",
      },
    },
  },
}
```

        默认账户的环境变量回退：

```bash
DISCORD_BOT_TOKEN=...
```

        对于脚本化或远程设置，使用 `openclaw config patch --file ./discord.patch.json5 --dry-run` 写入相同的 JSON5 块，然后在没有 `--dry-run` 的情况下重新运行。支持明文 `token` 值。`channels.discord.token` 也支持 env/file/exec 提供商的 SecretRef 值。请参阅[密钥管理](/gateway/secrets)。

        对于多个 Discord 机器人，请将每个机器人令牌和应用 ID 保存在其账户下。顶层 `channels.discord.applicationId` 由账户继承，因此仅在每个账户都应使用相同应用 ID 时在那里设置。

```json5
{
  channels: {
    discord: {
      enabled: true,
      accounts: {
        personal: {
          token: { source: "env", provider: "default", id: "DISCORD_PERSONAL_TOKEN" },
          applicationId: "111111111111111111",
        },
        work: {
          token: { source: "env", provider: "default", id: "DISCORD_WORK_TOKEN" },
          applicationId: "222222222222222222",
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="批准第一个私信配对">
    等待网关运行，然后在 Discord 中向您的机器人发送私信。它将回复配对码。

    <Tabs>
      <Tab title="询问您的智能体">
        在您现有的频道上向您的智能体发送配对码：

        > "批准这个 Discord 配对码：`<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配对码在 1 小时后过期。

    您现在应该可以通过私信在 Discord 中与您的智能体聊天了。

  </Step>
</Steps>

<Note>
令牌解析是账户感知的。配置令牌值优先于环境变量回退。`DISCORD_BOT_TOKEN` 仅用于默认账户。
如果两个已启用的 Discord 账户解析到相同的机器人令牌，OpenClaw 仅为该令牌启动一个网关监视器。配置来源的令牌优先于默认环境变量回退；否则第一个已启用的账户获胜，重复账户报告为禁用。
对于高级出站调用（消息工具/频道操作），显式的每次调用 `token` 用于该调用。这适用于发送和读取/探测式操作（例如读取/搜索/获取/线程/置顶/权限）。账户策略/重试设置仍然来自活动运行时快照中的选定账户。
</Note>

## 推荐：设置服务器工作区

私信正常工作后，您可以将 Discord 服务器设置为完整工作区，每个频道都有自己的智能体会话和上下文。这对只有您和机器人的私人服务器推荐使用。

<Steps>
  <Step title="将您的服务器添加到服务器白名单">
    这使您的智能体可以在服务器的任何频道中回复，而不仅仅是私信。

    <Tabs>
      <Tab title="询问您的智能体">
        > "将我的 Discord 服务器 ID `<server_id>` 添加到服务器白名单"
      </Tab>
      <Tab title="配置">

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: true,
          users: ["YOUR_USER_ID"],
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="允许无 @提及回复">
    默认情况下，您的智能体只在服务器频道中被 @提及时才回复。对于私人服务器，您可能希望它回复每条消息。

    在服务器频道中，普通助手最终回复默认保持私密。可见的 Discord 输出必须通过 `message` 工具明确发送，因此智能体默认可以潜伏，只在决定频道回复有用时才发布。

    这意味着所选模型必须可靠地调用工具。如果 Discord 显示正在输入且日志显示令牌使用但没有发布消息，请检查会话日志中 `didSendViaMessagingTool: false` 的助手文本。这意味着模型产生了私密的最终答案而不是调用 `message(action=send)`。切换到更强的工具调用模型，或使用下面的配置恢复旧版自动最终回复。

    <Tabs>
      <Tab title="询问您的智能体">
        > "允许我的智能体在这个服务器上回复而无需被 @提及"
      </Tab>
      <Tab title="配置">
        在您的服务器配置中设置 `requireMention: false`：

```json5
{
  channels: {
    discord: {
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: false,
        },
      },
    },
  },
}
```

        要为群组/频道房间恢复旧版自动最终回复，请设置 `messages.groupChat.visibleReplies: "automatic"`。

      </Tab>
    </Tabs>

  </Step>

  <Step title="规划服务器频道中的记忆">
    默认情况下，长期记忆（MEMORY.md）仅在私信会话中加载。服务器频道不会自动加载 MEMORY.md。

    <Tabs>
      <Tab title="询问您的智能体">
        > "当我在 Discord 频道中提问时，如果需要来自 MEMORY.md 的长期上下文，请使用 memory_search 或 memory_get。"
      </Tab>
      <Tab title="手动">
        如果您需要在每个频道中共享上下文，请将稳定的指令放在 `AGENTS.md` 或 `USER.md` 中（它们在每个会话中注入）。将长期笔记保存在 `MEMORY.md` 中，并使用记忆工具按需访问。
      </Tab>
    </Tabs>

  </Step>
</Steps>

现在在您的 Discord 服务器上创建一些频道并开始聊天。您的智能体可以看到频道名称，每个频道都有自己的隔离会话——因此您可以设置 `#coding`、`#home`、`#research` 或任何适合您工作流的频道。

## 运行时模型

- 网关拥有 Discord 连接。
- 回复路由是确定性的：Discord 入站消息回复到 Discord。
- Discord 服务器/频道元数据作为不可信上下文添加到模型提示中，而不是作为用户可见的回复前缀。如果模型复制了该封装，OpenClaw 会从出站回复和未来回放上下文中剥离复制的元数据。
- 默认情况下（`session.dmScope=main`），直接聊天共享智能体主会话（`agent:main:main`）。
- 服务器频道是隔离的会话键（`agent:<agentId>:discord:channel:<channelId>`）。
- 群组私信默认被忽略（`channels.discord.dm.groupEnabled=false`）。
- 原生斜杠命令在隔离命令会话（`agent:<agentId>:discord:slash:<userId>`）中运行，同时仍将 `CommandTargetSessionKey` 携带到路由的对话会话。
- 仅文本的 cron/心跳公告发送到 Discord 时，一次性使用最终助手可见答案。当智能体发出多个可投递有效负载时，媒体和结构化组件有效负载仍然是多消息。

## 论坛频道

Discord 论坛和媒体频道仅接受线程帖子。OpenClaw 支持两种创建方式：

- 向论坛父级发送消息（`channel:<forumId>`）以自动创建线程。线程标题使用消息的第一个非空行。
- 使用 `openclaw message thread create` 直接创建线程。不要为论坛频道传递 `--message-id`。

示例：向论坛父级发送以创建线程

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

示例：显式创建论坛线程

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

论坛父级不接受 Discord 组件。如果需要组件，请发送到线程本身（`channel:<threadId>`）。

## 交互组件

OpenClaw 支持 Discord 组件 v2 容器用于智能体消息。使用带 `components` 有效负载的消息工具。交互结果作为普通入站消息路由回智能体，并遵循现有的 Discord `replyToMode` 设置。

支持的块：

- `text`、`section`、`separator`、`actions`、`media-gallery`、`file`
- 操作行最多允许 5 个按钮或单个选择菜单
- 选择类型：`string`、`user`、`role`、`mentionable`、`channel`

默认情况下，组件是一次性的。设置 `components.reusable=true` 允许按钮、选择和表单在过期前被多次使用。

要限制谁可以点击按钮，请在该按钮上设置 `allowedUsers`（Discord 用户 ID、标签或 `*`）。配置后，不匹配的用户将收到临时拒绝。

`/model` 和 `/models` 斜杠命令会打开一个交互式模型选择器，包含提供商、模型和兼容运行时下拉菜单以及提交步骤。`/models add` 已弃用，现在返回弃用消息而不是从聊天注册模型。选择器回复是临时的，只有调用用户可以使用它。

文件附件：

- `file` 块必须指向附件引用（`attachment://<filename>`）
- 通过 `media`/`path`/`filePath` 提供附件（单文件）；多文件使用 `media-gallery`
- 使用 `filename` 在应匹配附件引用时覆盖上传名称

模态表单：

- 添加 `components.modal` 最多 5 个字段
- 字段类型：`text`、`checkbox`、`radio`、`select`、`role-select`、`user-select`
- OpenClaw 自动添加触发按钮

示例：

```json5
{
  channel: "discord",
  action: "send",
  to: "channel:123456789012345678",
  message: "Optional fallback text",
  components: {
    reusable: true,
    text: "Choose a path",
    blocks: [
      {
        type: "actions",
        buttons: [
          {
            label: "Approve",
            style: "success",
            allowedUsers: ["123456789012345678"],
          },
          { label: "Decline", style: "danger" },
        ],
      },
      {
        type: "actions",
        select: {
          type: "string",
          placeholder: "Pick an option",
          options: [
            { label: "Option A", value: "a" },
            { label: "Option B", value: "b" },
          ],
        },
      },
    ],
    modal: {
      title: "Details",
      triggerLabel: "Open form",
      fields: [
        { type: "text", label: "Requester" },
        {
          type: "select",
          label: "Priority",
          options: [
            { label: "Low", value: "low" },
            { label: "High", value: "high" },
          ],
        },
      ],
    },
  },
}
```

## 访问控制和路由

<Tabs>
  <Tab title="私信策略">
    `channels.discord.dmPolicy` 控制私信访问。`channels.discord.allowFrom` 是规范的私信白名单。

    - `pairing`（默认）
    - `allowlist`
    - `open`（需要 `channels.discord.allowFrom` 包含 `"*"`）
    - `disabled`

    如果私信策略不是开放的，未知用户将被阻止（或在 `pairing` 模式下提示配对）。

    多账户优先级：

    - `channels.discord.accounts.default.allowFrom` 仅适用于 `default` 账户。
    - 对于一个账户，`allowFrom` 优先于旧版 `dm.allowFrom`。
    - 当命名账户自身的 `allowFrom` 和旧版 `dm.allowFrom` 未设置时，它们继承 `channels.discord.allowFrom`。
    - 命名账户不继承 `channels.discord.accounts.default.allowFrom`。

    旧版 `channels.discord.dm.policy` 和 `channels.discord.dm.allowFrom` 仍然可读以兼容。`openclaw doctor --fix` 在不更改访问权限的情况下将它们迁移到 `dmPolicy` 和 `allowFrom`。

    投递的私信目标格式：

    - `user:<id>`
    - `<@id>` 提及

    当频道默认处于活动状态时，裸数字 ID 通常解析为频道 ID，但账户有效私信 `allowFrom` 中列出的 ID 被视为用户私信目标以实现兼容。

  </Tab>

  <Tab title="私信访问组">
    Discord 私信可以在 `channels.discord.allowFrom` 中使用动态 `accessGroup:<name>` 条目。

    访问组名称在消息频道之间共享。对于成员以每个频道正常 `allowFrom` 语法表示的静态组，使用 `type: "message.senders"`；当 Discord 频道的当前 `ViewChannel` 受众应动态定义成员资格时，使用 `type: "discord.channelAudience"`。共享访问组行为记录在：[访问组](/channels/access-groups)。

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        "*": ["global-owner-id"],
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
      },
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
  },
}
```

    Discord 文本频道没有单独的成员列表。`type: "discord.channelAudience"` 将成员资格建模为：私信发送者是已配置服务器的成员，并且在应用角色和频道覆盖后，当前对已配置频道具有有效的 `ViewChannel` 权限。

    示例：允许任何可以看到 `#maintainers` 的人给机器人发私信，同时对其他人保持私信关闭。

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
      membership: "canViewChannel",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers"],
    },
  },
}
```

    您可以混合动态和静态条目：

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers", "discord:123456789012345678"],
    },
  },
}
```

    查找失败时关闭。如果 Discord 返回 `Missing Access`、成员查找失败，或频道属于不同的服务器，则私信发送者被视为未授权。

    使用频道受众访问组时，请为机器人启用 Discord 开发者门户中的**服务器成员意图**。私信不包含服务器成员状态，因此 OpenClaw 在授权时通过 Discord REST 解析成员。

  </Tab>

  <Tab title="服务器策略">
    服务器处理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    当 `channels.discord` 存在时的安全基线是 `allowlist`。

    `allowlist` 行为：

    - 服务器必须匹配 `channels.discord.guilds`（首选 `id`，接受 slug）
    - 可选的发送者白名单：`users`（推荐稳定 ID）和 `roles`（仅角色 ID）；如果其中任一已配置，则发送者匹配 `users` 或 `roles` 时被允许
    - 直接名称/标签匹配默认禁用；仅作为紧急兼容模式启用 `channels.discord.dangerouslyAllowNameMatching: true`
    - `users` 支持名称/标签，但 ID 更安全；`openclaw security audit` 在使用名称/标签条目时发出警告
    - 如果服务器配置了 `channels`，未列出的频道将被拒绝
    - 如果服务器没有 `channels` 块，则该已允许服务器中的所有频道都被允许

    示例：

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "123456789012345678": {
          requireMention: true,
          ignoreOtherMentions: true,
          users: ["987654321098765432"],
          roles: ["123456789012345678"],
          channels: {
            general: { allow: true },
            help: { allow: true, requireMention: true },
          },
        },
      },
    },
  },
}
```

    如果您只设置了 `DISCORD_BOT_TOKEN` 而没有创建 `channels.discord` 块，运行时回退是 `groupPolicy="allowlist"`（日志中有警告），即使 `channels.defaults.groupPolicy` 是 `open`。

  </Tab>

  <Tab title="提及和群组私信">
    服务器消息默认有提及门控。

    提及检测包括：

    - 明确的机器人提及
    - 配置的提及模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 在支持的情况下隐式回复机器人行为

    在编写出站 Discord 消息时，使用规范的提及语法：用户用 `<@USER_ID>`，频道用 `<#CHANNEL_ID>`，角色用 `<@&ROLE_ID>`。不要使用旧版 `<@!USER_ID>` 昵称提及形式。

    `requireMention` 按服务器/频道配置（`channels.discord.guilds...`）。
    `ignoreOtherMentions` 可选地丢弃提及了其他用户/角色但不是机器人的消息（排除 @everyone/@here）。

    群组私信：

    - 默认：被忽略（`dm.groupEnabled=false`）
    - 通过 `dm.groupChannels` 可选白名单（频道 ID 或 slug）

  </Tab>
</Tabs>

### 基于角色的智能体路由

使用 `bindings[].match.roles` 按角色 ID 将 Discord 服务器成员路由到不同的智能体。基于角色的绑定仅接受角色 ID，在对等或父对等绑定之后、仅服务器绑定之前评估。如果绑定还设置了其他匹配字段（例如 `peer` + `guildId` + `roles`），则所有已配置字段必须匹配。

```json5
{
  bindings: [
    {
      agentId: "opus",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
        roles: ["111111111111111111"],
      },
    },
    {
      agentId: "sonnet",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
      },
    },
  ],
}
```

## 原生命令和命令认证

- `commands.native` 默认为 `"auto"` 并对 Discord 启用。
- 每频道覆盖：`channels.discord.commands.native`。
- `commands.native=false` 跳过 Discord 斜杠命令注册和启动时的清理。之前注册的命令可能在 Discord 中保持可见，直到您从 Discord 应用中移除它们。
- 原生命令认证使用与普通消息处理相同的 Discord 白名单/策略。
- 命令对未授权的用户在 Discord UI 中可能仍然可见；执行仍然强制执行 OpenClaw 认证并返回"未授权"。

请参阅[斜杠命令](/tools/slash-commands)了解命令目录和行为。

默认斜杠命令设置：

- `ephemeral: true`

## 功能详情

<AccordionGroup>
  <Accordion title="回复标签和原生回复">
    Discord 支持智能体输出中的回复标签：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off`（默认）
    - `first`
    - `all`
    - `batched`

    注意：`off` 禁用隐式回复线程。显式的 `[[reply_to_*]]` 标签仍然被遵守。
    `first` 始终将隐式原生回复引用附加到该轮次的第一条出站 Discord 消息。
    `batched` 仅在入站轮次是多条消息的防抖批次时才附加 Discord 的隐式原生回复引用。这在您主要为有歧义的突发聊天而不是每次单条消息轮次需要原生回复时很有用。

    消息 ID 在上下文/历史中展示，以便智能体可以针对特定消息。

  </Accordion>

  <Accordion title="实时流式预览">
    OpenClaw 可以通过发送临时消息并在文本到达时编辑它来流式传输草稿回复。`channels.discord.streaming` 取 `off`（默认）| `partial` | `block` | `progress`。`progress` 保持一个可编辑的状态草稿并用工具进度更新它，直到最终投递；`streamMode` 是旧版别名并自动迁移。

    默认保持 `off`，因为当多个机器人或网关共享一个账户时，Discord 预览编辑会很快达到速率限制。

```json5
{
  channels: {
    discord: {
      streaming: "block",
      draftChunk: {
        minChars: 200,
        maxChars: 800,
        breakPreference: "paragraph",
      },
    },
  },
}
```

    - `partial` 随着令牌到达编辑单个预览消息。
    - `block` 发出草稿大小的块（使用 `draftChunk` 调整大小和断点，上限为 `textChunkLimit`）。
    - 媒体、错误和显式回复最终结果取消待处理的预览编辑。
    - `streaming.preview.toolProgress`（默认 `true`）控制工具/进度更新是否重用预览消息。
    - `streaming.preview.commandText` / `streaming.progress.commandText` 控制紧凑进度行中命令/执行细节：`raw`（默认）或 `status`（仅工具标签）。

    隐藏原始命令/执行文本同时保持紧凑进度行：

    ```json
    {
      "channels": {
        "discord": {
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

    预览流式传输仅限文本；媒体回复回退到正常投递。当明确启用 `block` 流式传输时，OpenClaw 跳过预览流以避免双重流式传输。

  </Accordion>

  <Accordion title="历史、上下文和线程行为">
    服务器历史上下文：

    - `channels.discord.historyLimit` 默认 `20`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 禁用

    私信历史控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    线程行为：

    - Discord 线程作为频道会话路由，并继承父频道配置，除非被覆盖。
    - 线程会话继承父频道的会话级 `/model` 选择作为仅模型回退；线程本地 `/model` 选择仍然优先，父记录历史不会被复制，除非启用了记录继承。
    - `channels.discord.thread.inheritParent`（默认 `false`）将新的自动线程选入从父记录播种。每账户覆盖位于 `channels.discord.accounts.<id>.thread.inheritParent`。
    - 消息工具反应可以解析 `user:<id>` 私信目标。
    - `guilds.<guild>.channels.<channel>.requireMention: false` 在回复阶段激活回退期间被保留。

    频道主题作为**不可信**上下文注入。白名单限制谁可以触发智能体，而不是完整的补充上下文编辑边界。

  </Accordion>

  <Accordion title="子智能体的线程绑定会话">
    Discord 可以将线程绑定到会话目标，使该线程中的后续消息继续路由到相同的会话（包括子智能体会话）。

    命令：

    - `/focus <target>` 将当前/新线程绑定到子智能体/会话目标
    - `/unfocus` 移除当前线程绑定
    - `/agents` 显示活动运行和绑定状态
    - `/session idle <duration|off>` 检查/更新专注绑定的不活动自动取消绑定
    - `/session max-age <duration|off>` 检查/更新专注绑定的硬性最大寿命

    配置：

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        idleHours: 24,
        maxAgeHours: 0,
        spawnSessions: true,
        defaultSpawnContext: "fork",
      },
    },
  },
}
```

    说明：

    - `session.threadBindings.*` 设置全局默认值。
    - `channels.discord.threadBindings.*` 覆盖 Discord 行为。
    - `spawnSessions` 控制 `sessions_spawn({ thread: true })` 和 ACP 线程生成的自动创建/绑定线程。默认：`true`。
    - `defaultSpawnContext` 控制线程绑定生成的原生子智能体上下文。默认：`"fork"`。
    - 已弃用的 `spawnSubagentSessions`/`spawnAcpSessions` 键由 `openclaw doctor --fix` 迁移。
    - 如果为账户禁用了线程绑定，`/focus` 和相关的线程绑定操作不可用。

    请参阅[子智能体](/tools/subagents)、[ACP 智能体](/tools/acp-agents)和[配置参考](/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="持久 ACP 频道绑定">
    对于稳定的"始终在线"ACP 工作区，配置针对 Discord 对话的顶级类型化 ACP 绑定。

    配置路径：

    - `bindings[]` with `type: "acp"` and `match.channel: "discord"`

    示例：

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
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": {
              requireMention: false,
            },
          },
        },
      },
    },
  },
}
```

    说明：

    - `/acp spawn codex --bind here` 就地绑定当前频道或线程，并使未来消息保持在同一 ACP 会话上。线程消息继承父频道绑定。
    - 在绑定频道或线程中，`/new` 和 `/reset` 就地重置同一 ACP 会话。临时线程绑定可以在活动时覆盖目标解析。
    - `spawnSessions` 通过 `--thread auto|here` 控制子线程创建/绑定。

    请参阅 [ACP 智能体](/tools/acp-agents) 了解绑定行为详情。

  </Accordion>

  <Accordion title="反应通知">
    每服务器反应通知模式：

    - `off`
    - `own`（默认）
    - `all`
    - `allowlist`（使用 `guilds.<id>.users`）

    反应事件转换为系统事件并附加到路由的 Discord 会话。

  </Accordion>

  <Accordion title="确认反应">
    `ackReaction` 在 OpenClaw 处理入站消息时发送确认表情符号。

    解析顺序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 智能体身份表情符号回退（`agents.list[].identity.emoji`，否则"👀"）

    说明：

    - Discord 接受 unicode 表情符号或自定义表情符号名称。
    - 使用 `""` 为频道或账户禁用反应。

  </Accordion>

  <Accordion title="配置写入">
    频道发起的配置写入默认启用。

    这影响 `/config set|unset` 流程（当命令功能启用时）。

    禁用：

```json5
{
  channels: {
    discord: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

  <Accordion title="网关代理">
    通过 `channels.discord.proxy` 将 Discord 网关 WebSocket 流量和启动 REST 查找（应用 ID + 白名单解析）通过 HTTP(S) 代理路由。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    每账户覆盖：

```json5
{
  channels: {
    discord: {
      accounts: {
        primary: {
          proxy: "http://proxy.example:8080",
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="PluralKit 支持">
    启用 PluralKit 解析以将代理消息映射到系统成员身份：

```json5
{
  channels: {
    discord: {
      pluralkit: {
        enabled: true,
        token: "pk_live_...", // 可选；私人系统需要
      },
    },
  },
}
```

    说明：

    - 白名单可以使用 `pk:<memberId>`
    - 成员显示名称仅在 `channels.discord.dangerouslyAllowNameMatching: true` 时按名称/slug 匹配
    - 查找使用原始消息 ID 并受时间窗口约束
    - 如果查找失败，代理消息被视为机器人消息并被丢弃，除非 `allowBots=true`

  </Accordion>

  <Accordion title="出站提及别名">
    当智能体需要已知 Discord 用户的确定性出站提及时，使用 `mentionAliases`。键是不带前导 `@` 的句柄；值是 Discord 用户 ID。未知句柄、`@everyone`、`@here` 和 Markdown 代码块中的提及保持不变。

```json5
{
  channels: {
    discord: {
      mentionAliases: {
        Vladislava: "123456789012345678",
      },
      accounts: {
        ops: {
          mentionAliases: {
            OpsLead: "234567890123456789",
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="在线状态配置">
    当您设置状态或活动字段，或启用自动状态时，将应用在线状态更新。

    仅状态示例：

```json5
{
  channels: {
    discord: {
      status: "idle",
    },
  },
}
```

    活动示例（自定义状态是默认活动类型）：

```json5
{
  channels: {
    discord: {
      activity: "Focus time",
      activityType: 4,
    },
  },
}
```

    流式传输示例：

```json5
{
  channels: {
    discord: {
      activity: "Live coding",
      activityType: 1,
      activityUrl: "https://twitch.tv/openclaw",
    },
  },
}
```

    活动类型映射：

    - 0: 游戏
    - 1: 流式传输（需要 `activityUrl`）
    - 2: 收听
    - 3: 观看
    - 4: 自定义（使用活动文本作为状态说明；表情符号可选）
    - 5: 竞技

    自动状态示例（运行时健康信号）：

```json5
{
  channels: {
    discord: {
      autoPresence: {
        enabled: true,
        intervalMs: 30000,
        minUpdateIntervalMs: 15000,
        exhaustedText: "token exhausted",
      },
    },
  },
}
```

    自动状态将运行时可用性映射到 Discord 状态：健康 => 在线，降级或未知 => 空闲，耗尽或不可用 => 请勿打扰。可选文本覆盖：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText`（支持 `{reason}` 占位符）

  </Accordion>

  <Accordion title="Discord 中的审批">
    Discord 支持私信中基于按钮的审批处理，并可以选择在原始频道中发布审批提示。

    配置路径：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`（可选；无法时回退到 `commands.ownerAllowFrom`）
    - `channels.discord.execApprovals.target`（`dm` | `channel` | `both`，默认：`dm`）
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`

    当 `enabled` 未设置或为 `"auto"` 且至少一个审批者可以解析时，Discord 自动启用原生执行审批，可以来自 `execApprovals.approvers` 或来自 `commands.ownerAllowFrom`。Discord 不从频道 `allowFrom`、旧版 `dm.allowFrom` 或直接消息 `defaultTo` 推断执行审批者。显式设置 `enabled: false` 以明确禁用 Discord 作为原生审批客户端。

    对于敏感的仅所有者群组命令（如 `/diagnostics` 和 `/export-trajectory`），OpenClaw 私密发送审批提示和最终结果。当调用所有者有 Discord 所有者路由时，它首先尝试 Discord 私信；如果不可用，则回退到 `commands.ownerAllowFrom` 中的第一个可用所有者路由，例如 Telegram。

    当 `target` 为 `channel` 或 `both` 时，审批提示在频道中可见。只有已解析的审批者可以使用按钮；其他用户收到临时拒绝。审批提示包含命令文本，因此仅在受信任的频道中启用频道投递。如果无法从会话键推导出频道 ID，OpenClaw 回退到私信投递。

    Discord 还渲染其他聊天频道使用的共享审批按钮。原生 Discord 适配器主要添加审批者私信路由和频道扇出。
    当这些按钮存在时，它们是主要的审批用户体验；OpenClaw 应该只在工具结果表明聊天审批不可用或手动审批是唯一路径时才包含手动 `/approve` 命令。
    如果 Discord 原生审批运行时未激活，OpenClaw 保持本地确定性 `/approve <id> <decision>` 提示可见。如果运行时处于活动状态但无法将原生卡片投递到任何目标，OpenClaw 在同一聊天中发送回退通知，包含待处理审批中的确切 `/approve` 命令。

    网关认证和审批解析遵循共享的网关客户端合同（`plugin:` ID 通过 `plugin.approval.resolve` 解析；其他 ID 通过 `exec.approval.resolve` 解析）。审批默认在 30 分钟后过期。

    请参阅[执行审批](/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 工具和操作门控

Discord 消息操作包括消息传递、频道管理、管理、在线状态和元数据操作。

核心示例：

- 消息传递：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- 反应：`react`、`reactions`、`emojiList`
- 管理：`timeout`、`kick`、`ban`
- 在线状态：`setPresence`

`event-create` 操作接受可选的 `image` 参数（URL 或本地文件路径）以设置预定活动封面图片。

操作门控位于 `channels.discord.actions.*` 下。

默认门控行为：

| 操作组                                                                                                                                                                   | 默认 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| reactions、messages、threads、pins、polls、search、memberInfo、roleInfo、channelInfo、channels、voiceStatus、events、stickers、emojiUploads、stickerUploads、permissions | 启用 |
| roles                                                                                                                                                                    | 禁用 |
| moderation                                                                                                                                                               | 禁用 |
| presence                                                                                                                                                                 | 禁用 |

## 组件 v2 UI

OpenClaw 对执行审批和跨上下文标记使用 Discord 组件 v2。Discord 消息操作也可以接受自定义 UI 的 `components`（高级；需要通过 discord 工具构建组件有效负载），而旧版 `embeds` 仍然可用但不推荐。

- `channels.discord.ui.components.accentColor` 设置 Discord 组件容器使用的强调色（十六进制）。
- 每账户设置：`channels.discord.accounts.<id>.ui.components.accentColor`。
- 当组件 v2 存在时，`embeds` 被忽略。

示例：

```json5
{
  channels: {
    discord: {
      ui: {
        components: {
          accentColor: "#5865F2",
        },
      },
    },
  },
}
```

## 语音

Discord 有两种不同的语音界面：实时**语音频道**（持续对话）和**语音消息附件**（波形预览格式）。网关两种都支持。

### 语音频道

设置清单：

1. 在 Discord 开发者门户中启用消息内容意图。
2. 使用角色/用户白名单时启用服务器成员意图。
3. 以 `bot` 和 `applications.commands` 范围邀请机器人。
4. 在目标语音频道中授予连接、说话、发送消息和读取消息历史权限。
5. 启用原生命令（`commands.native` 或 `channels.discord.commands.native`）。
6. 配置 `channels.discord.voice`。

使用 `/vc join|leave|status` 控制会话。命令使用账户默认智能体，并遵循与其他 Discord 命令相同的白名单和群组策略规则。

```bash
/vc join channel:<voice-channel-id>
/vc status
/vc leave
```

自动加入示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai/gpt-5.4-mini",
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
          openai: { voice: "onyx" },
        },
      },
    },
  },
}
```

说明：

- `voice.tts` 仅覆盖语音播放的 `messages.tts`。
- `voice.model` 仅覆盖 Discord 语音频道响应使用的 LLM。不设置则继承路由的智能体模型。
- STT 使用 `tools.media.audio`；`voice.model` 不影响转录。
- 每频道 Discord `systemPrompt` 覆盖适用于该语音频道的语音转录轮次。
- 语音转录轮次从 Discord `allowFrom`（或 `dm.allowFrom`）派生所有者状态；非所有者发言者无法访问仅所有者工具（例如 `gateway` 和 `cron`）。
- Discord 语音对仅文本配置是选择性的；设置 `channels.discord.voice.enabled=true`（或保留现有的 `channels.discord.voice` 块）以启用 `/vc` 命令、语音运行时和 `GuildVoiceStates` 网关意图。
- `channels.discord.intents.voiceStates` 可以明确覆盖语音状态意图订阅。不设置则意图跟随有效语音启用。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 传递给 `@discordjs/voice` 加入选项。
- 如果未设置，`@discordjs/voice` 默认是 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- `voice.connectTimeoutMs` 控制 `/vc join` 和自动加入尝试的初始 `@discordjs/voice` 就绪等待。默认：`30000`。
- `voice.reconnectGraceMs` 控制 OpenClaw 等待断开连接的语音会话开始重新连接的时间，然后销毁它。默认：`15000`。
- OpenClaw 还监视接收解密失败，并在短时间内重复失败后通过离开/重新加入语音频道自动恢复。
- 如果接收日志反复显示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)` 更新后，请收集依赖报告和日志。捆绑的 `@discordjs/voice` 行包含来自 discord.js PR #11449 的上游填充修复，该修复关闭了 discord.js issue #11419。

语音频道管道：

- Discord PCM 捕获转换为 WAV 临时文件。
- `tools.media.audio` 处理 STT，例如 `openai/gpt-4o-mini-transcribe`。
- 转录通过 Discord 入口和路由发送，同时响应 LLM 以语音输出策略运行，该策略隐藏智能体 `tts` 工具并要求返回文本，因为 Discord 语音拥有最终 TTS 播放。
- `voice.model` 设置时，仅覆盖此语音频道轮次的响应 LLM。
- `voice.tts` 合并到 `messages.tts`；生成的音频在加入的频道中播放。

凭据按组件解析：LLM 路由认证用于 `voice.model`，STT 认证用于 `tools.media.audio`，TTS 认证用于 `messages.tts`/`voice.tts`。

### 语音消息

Discord 语音消息显示波形预览，需要 OGG/Opus 音频。OpenClaw 自动生成波形，但需要网关主机上的 `ffmpeg` 和 `ffprobe` 来检查和转换。

- 提供**本地文件路径**（URL 被拒绝）。
- 省略文本内容（Discord 拒绝同一有效负载中同时包含文本和语音消息）。
- 接受任何音频格式；OpenClaw 根据需要转换为 OGG/Opus。

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 故障排查

<AccordionGroup>
  <Accordion title="使用了不允许的意图或机器人看不到服务器消息">

    - 启用消息内容意图
    - 依赖用户/成员解析时启用服务器成员意图
    - 更改意图后重启网关

  </Accordion>

  <Accordion title="服务器消息意外被阻止">

    - 验证 `groupPolicy`
    - 验证 `channels.discord.guilds` 下的服务器白名单
    - 如果服务器 `channels` 映射存在，只有列出的频道被允许
    - 验证 `requireMention` 行为和提及模式

    有用的检查：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="requireMention 为 false 但仍被阻止">
    常见原因：

    - `groupPolicy="allowlist"` 没有匹配的服务器/频道白名单
    - `requireMention` 配置在错误的位置（必须在 `channels.discord.guilds` 或频道条目下）
    - 发送者被服务器/频道 `users` 白名单阻止

  </Accordion>

  <Accordion title="Discord 轮次长时间运行或重复回复">

    典型日志：

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`

    Discord 网关队列调节：

    - 单账户：`channels.discord.eventQueue.listenerTimeout`
    - 多账户：`channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`
    - 这只控制 Discord 网关监听器工作，而不是智能体轮次生命周期

    Discord 不对排队的智能体轮次应用频道拥有的超时。消息监听器立即移交，排队的 Discord 运行保持每会话顺序，直到会话/工具/运行时生命周期完成或中止工作。

```json5
{
  channels: {
    discord: {
      accounts: {
        default: {
          eventQueue: {
            listenerTimeout: 120000,
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="网关元数据查找超时警告">
    OpenClaw 在连接前获取 Discord `/gateway/bot` 元数据。短暂失败回退到 Discord 的默认网关 URL，并在日志中进行速率限制。

    元数据超时调节：

    - 单账户：`channels.discord.gatewayInfoTimeoutMs`
    - 多账户：`channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - 配置未设置时的环境变量回退：`OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - 默认：`30000`（30 秒），最大：`120000`

  </Accordion>

  <Accordion title="网关 READY 超时重启">
    OpenClaw 在启动期间和运行时重新连接后等待 Discord 的网关 `READY` 事件。具有启动交错的多账户设置可能需要比默认值更长的启动 READY 窗口。

    READY 超时调节：

    - 启动单账户：`channels.discord.gatewayReadyTimeoutMs`
    - 启动多账户：`channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - 启动环境变量回退：`OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - 启动默认：`15000`（15 秒），最大：`120000`
    - 运行时单账户：`channels.discord.gatewayRuntimeReadyTimeoutMs`
    - 运行时多账户：`channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - 运行时环境变量回退：`OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - 运行时默认：`30000`（30 秒），最大：`120000`

  </Accordion>

  <Accordion title="权限审计不匹配">
    `channels status --probe` 权限检查只对数字频道 ID 有效。

    如果您使用 slug 键，运行时匹配可能仍然有效，但探测无法完全验证权限。

  </Accordion>

  <Accordion title="私信和配对问题">

    - 私信禁用：`channels.discord.dm.enabled=false`
    - 私信策略禁用：`channels.discord.dmPolicy="disabled"`（旧版：`channels.discord.dm.policy`）
    - 在 `pairing` 模式下等待配对批准

  </Accordion>

  <Accordion title="机器人间循环">
    默认情况下，机器人撰写的消息被忽略。

    如果您设置了 `channels.discord.allowBots=true`，请使用严格的提及和白名单规则以避免循环行为。
    首选 `channels.discord.allowBots="mentions"` 以只接受提及机器人的机器人消息。

```json5
{
  channels: {
    discord: {
      accounts: {
        mantis: {
          // Mantis 只在其他机器人提及她时才收听。
          allowBots: "mentions",
        },
        molty: {
          // Molty 收听所有机器人撰写的 Discord 消息。
          allowBots: true,
          mentionAliases: {
            // 让 Molty 写 "@Mantis" 并发送真正的 Discord 提及。
            Mantis: "MANTIS_DISCORD_USER_ID",
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="语音 STT 因 DecryptionFailed(...) 中断">

    - 保持 OpenClaw 为最新（`openclaw update`）以确保 Discord 语音接收恢复逻辑存在
    - 确认 `channels.discord.voice.daveEncryption=true`（默认）
    - 从 `channels.discord.voice.decryptionFailureTolerance=24`（上游默认）开始，仅在需要时调整
    - 监视日志中：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果自动重新加入后失败继续，请收集日志并与 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 和 [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449) 中的上游 DAVE 接收历史进行比较

  </Accordion>
</AccordionGroup>

## 配置参考

主要参考：[配置参考 - Discord](/gateway/config-channels#discord)。

<Accordion title="Discord 高信号字段">

- 启动/认证：`enabled`、`token`、`accounts.*`、`allowBots`
- 策略：`groupPolicy`、`dm.*`、`guilds.*`、`guilds.*.channels.*`
- 命令：`commands.native`、`commands.useAccessGroups`、`configWrites`、`slashCommand.*`
- 事件队列：`eventQueue.listenerTimeout`（监听器预算）、`eventQueue.maxQueueSize`、`eventQueue.maxConcurrency`
- 网关：`gatewayInfoTimeoutMs`、`gatewayReadyTimeoutMs`、`gatewayRuntimeReadyTimeoutMs`
- 回复/历史：`replyToMode`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
- 投递：`textChunkLimit`、`chunkMode`、`maxLinesPerMessage`
- 流式传输：`streaming`（旧版别名：`streamMode`）、`streaming.preview.toolProgress`、`draftChunk`、`blockStreaming`、`blockStreamingCoalesce`
- 媒体/重试：`mediaMaxMb`（上限出站 Discord 上传，默认 `100MB`）、`retry`
- 操作：`actions.*`
- 在线状态：`activity`、`status`、`activityType`、`activityUrl`
- UI：`ui.components.accentColor`
- 功能：`threadBindings`、顶级 `bindings[]`（`type: "acp"`）、`pluralkit`、`execApprovals`、`intents`、`agentComponents`、`heartbeat`、`responsePrefix`

</Accordion>

## 安全和运营

- 将机器人令牌视为密钥（受监督环境首选 `DISCORD_BOT_TOKEN`）。
- 授予最小权限的 Discord 权限。
- 如果命令部署/状态过时，重启网关并使用 `openclaw channels status --probe` 重新检查。

## 相关文档

<CardGroup cols={2}>
  <Card title="配对" icon="link" href="/channels/pairing">
    将 Discord 用户配对到网关。
  </Card>
  <Card title="群组" icon="users" href="/channels/groups">
    群组聊天和白名单行为。
  </Card>
  <Card title="频道路由" icon="route" href="/channels/channel-routing">
    将入站消息路由到智能体。
  </Card>
  <Card title="安全性" icon="shield" href="/gateway/security">
    威胁模型和加固。
  </Card>
  <Card title="多智能体路由" icon="sitemap" href="/concepts/multi-agent">
    将服务器和频道映射到智能体。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/tools/slash-commands">
    原生命令行为。
  </Card>
</CardGroup>
