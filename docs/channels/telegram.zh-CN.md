---
summary: "Telegram 机器人支持状态、功能和配置"
read_when:
  - 开发 Telegram 功能或 Webhook
title: "Telegram"
---

通过 grammY 实现机器人私信和群组，已生产就绪。长轮询是默认模式；Webhook 模式可选。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Telegram 私信的默认策略是配对。
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
  <Step title="在 BotFather 中创建机器人 Token">
    打开 Telegram 并与 **@BotFather** 聊天（确认句柄完全是 `@BotFather`）。

    运行 `/newbot`，按提示操作，并保存 Token。

  </Step>

  <Step title="配置 Token 和私信策略">

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

    环境变量回退：`TELEGRAM_BOT_TOKEN=...`（仅限默认账户）。
    Telegram **不**使用 `openclaw channels login telegram`；在配置/环境变量中配置 Token，然后启动网关。

  </Step>

  <Step title="启动网关并批准第一个私信">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配对码 1 小时后过期。

  </Step>

  <Step title="将机器人添加到群组">
    将机器人添加到您的群组，然后设置 `channels.telegram.groups` 和 `groupPolicy` 以匹配您的访问模型。
  </Step>
</Steps>

<Note>
Token 解析顺序是账户感知的。实际上，配置值优先于环境变量回退，`TELEGRAM_BOT_TOKEN` 仅适用于默认账户。
</Note>

## Telegram 端设置

<AccordionGroup>
  <Accordion title="隐私模式和群组可见性">
    Telegram 机器人默认开启**隐私模式**，限制它们接收的群组消息。

    如果机器人必须看到所有群组消息，请：

    - 通过 `/setprivacy` 禁用隐私模式，或
    - 将机器人设为群组管理员。

    切换隐私模式后，在每个群组中移除并重新添加机器人，以便 Telegram 应用更改。

  </Accordion>

  <Accordion title="群组权限">
    管理员状态在 Telegram 群组设置中控制。

    管理员机器人接收所有群组消息，对于始终在线的群组行为非常有用。

  </Accordion>

  <Accordion title="有用的 BotFather 切换">

    - `/setjoingroups` 允许/拒绝添加到群组
    - `/setprivacy` 用于群组可见性行为

  </Accordion>
</AccordionGroup>

## 访问控制和激活

<Tabs>
  <Tab title="私信策略">
    `channels.telegram.dmPolicy` 控制直接消息访问：

    - `pairing`（默认）
    - `allowlist`（需要 `allowFrom` 中至少有一个发件人 ID）
    - `open`（需要 `allowFrom` 包含 `"*"`）
    - `disabled`

    `dmPolicy: "open"` 加 `allowFrom: ["*"]` 允许任何找到或猜到机器人用户名的 Telegram 账户控制机器人。仅对有严格工具限制的有意公开机器人使用；单所有者机器人应使用 `allowlist` 加数字用户 ID。

    `channels.telegram.allowFrom` 接受数字 Telegram 用户 ID。`telegram:` / `tg:` 前缀被接受并规范化。
    在多账户配置中，限制性的顶级 `channels.telegram.allowFrom` 被视为安全边界：账户级别的 `allowFrom: ["*"]` 条目不会使该账户公开，除非合并后的有效账户白名单仍包含显式通配符。
    `dmPolicy: "allowlist"` 加空 `allowFrom` 阻止所有私信，并被配置验证拒绝。
    设置仅需要数字用户 ID。
    如果您已升级且配置中包含 `@username` 白名单条目，运行 `openclaw doctor --fix` 解析它们（尽力而为；需要 Telegram 机器人 Token）。
    如果您之前依赖配对存储白名单文件，`openclaw doctor --fix` 可以在白名单流中将条目恢复到 `channels.telegram.allowFrom`（例如当 `dmPolicy: "allowlist"` 尚无显式 ID 时）。

    对于单所有者机器人，推荐使用 `dmPolicy: "allowlist"` 加显式数字 `allowFrom` ID，以在配置中保持访问策略的持久性（而不是依赖之前的配对审批）。

    常见混淆：私信配对审批不意味着"该发件人在所有地方都被授权"。
    配对授予私信访问权。如果还没有命令所有者，第一个批准的配对也会设置 `commands.ownerAllowFrom`，使所有者专用命令和 exec 审批有显式的操作账户。
    群组发件人授权仍来自显式配置白名单。
    如果您想要"我授权一次，私信和群组命令都能工作"，请将您的数字 Telegram 用户 ID 放入 `channels.telegram.allowFrom`；对于所有者专用命令，确保 `commands.ownerAllowFrom` 包含 `telegram:<您的用户 ID>`。

    ### 查找您的 Telegram 用户 ID

    更安全（无第三方机器人）：

    1. 给您的机器人发私信。
    2. 运行 `openclaw logs --follow`。
    3. 读取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法（隐私性较差）：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="群组策略和白名单">
    两个控制共同起作用：

    1. **允许哪些群组**（`channels.telegram.groups`）
       - 无 `groups` 配置：
         - `groupPolicy: "open"` 时：任何群组都可以通过群组 ID 检查
         - `groupPolicy: "allowlist"`（默认）时：群组被阻止，直到您添加 `groups` 条目（或 `"*"`）
       - 已配置 `groups`：作为白名单（显式 ID 或 `"*"`）

    2. **允许群组中的哪些发件人**（`channels.telegram.groupPolicy`）
       - `open`
       - `allowlist`（默认）
       - `disabled`

    `groupAllowFrom` 用于群组发件人过滤。如果未设置，Telegram 回退到 `allowFrom`。
    `groupAllowFrom` 条目应为数字 Telegram 用户 ID（`telegram:` / `tg:` 前缀被规范化）。
    不要将 Telegram 群组或超级群组聊天 ID 放入 `groupAllowFrom`。负的聊天 ID 属于 `channels.telegram.groups` 下。
    非数字条目被忽略用于发件人授权。
    安全边界（`2026.2.25+`）：群组发件人认证**不**继承私信配对存储审批。
    配对仅限于私信。对于群组，设置 `groupAllowFrom` 或每群组/每话题 `allowFrom`。
    如果 `groupAllowFrom` 未设置，Telegram 回退到配置 `allowFrom`，而不是配对存储。
    单所有者机器人的实用模式：将您的用户 ID 设置在 `channels.telegram.allowFrom` 中，将 `groupAllowFrom` 留空，并在 `channels.telegram.groups` 下允许目标群组。
    运行时说明：如果 `channels.telegram` 完全缺失，运行时默认为失败关闭的 `groupPolicy="allowlist"`，除非显式设置了 `channels.defaults.groupPolicy`。

    示例：允许一个特定群组中的任何成员：

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          groupPolicy: "open",
          requireMention: false,
        },
      },
    },
  },
}
```

    示例：仅允许一个特定群组中的特定用户：

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          requireMention: true,
          allowFrom: ["8734062810", "745123456"],
        },
      },
    },
  },
}
```

    <Warning>
      常见错误：`groupAllowFrom` 不是 Telegram 群组白名单。

      - 将像 `-1001234567890` 这样的负 Telegram 群组或超级群组聊天 ID 放在 `channels.telegram.groups` 下。
      - 将像 `8734062810` 这样的 Telegram 用户 ID 放在 `groupAllowFrom` 下，当您想限制允许群组中哪些人触发机器人时。
      - 仅在您希望允许群组中的任何成员与机器人交谈时才使用 `groupAllowFrom: ["*"]`。

    </Warning>

  </Tab>

  <Tab title="提及行为">
    群组回复默认需要提及。

    提及可以来自：

    - 原生 `@botusername` 提及，或
    - 以下位置的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    会话级命令切换：

    - `/activation always`
    - `/activation mention`

    这些仅更新会话状态。使用配置实现持久化。

    持久配置示例：

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: false },
      },
    },
  },
}
```

    获取群组聊天 ID：

    - 将群组消息转发给 `@userinfobot` / `@getidsbot`
    - 或从 `openclaw logs --follow` 读取 `chat.id`
    - 或检查 Bot API `getUpdates`

  </Tab>
</Tabs>

## 运行时行为

- Telegram 由网关进程拥有。
- 路由是确定性的：Telegram 入站回复到 Telegram（模型不选择频道）。
- 入站消息规范化为共享频道信封，包含回复元数据和媒体占位符。
- 群组会话按群组 ID 隔离。论坛话题追加 `:topic:<threadId>` 以保持话题隔离。
- 私信消息可以携带 `message_thread_id`；OpenClaw 为回复保留线程 ID，但默认将私信保持在平坦会话中。当您有意需要私信话题会话隔离时，配置 `channels.telegram.dm.threadReplies: "inbound"`、`channels.telegram.direct.<chatId>.threadReplies: "inbound"`、`requireTopic: true` 或匹配的话题配置。
- 长轮询使用 grammY runner，具有每聊天/每线程排序。总体 runner sink 并发使用 `agents.defaults.maxConcurrent`。
- 长轮询在每个网关进程内受到保护，因此每次只有一个活动轮询器可以使用机器人 Token。如果您仍然看到 `getUpdates` 409 冲突，很可能是另一个 OpenClaw 网关、脚本或外部轮询器使用相同的 Token。
- 默认在 120 秒内没有完成 `getUpdates` 活跃度后触发长轮询看门狗重启。仅当您的部署在长时间运行的工作期间仍然看到误报轮询停止重启时，才增加 `channels.telegram.pollingStallThresholdMs`。该值以毫秒为单位，允许范围 `30000` 到 `600000`；支持每账户覆盖。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 不适用）。

## 功能参考

<AccordionGroup>
  <Accordion title="实时流预览（消息编辑）">
    OpenClaw 可以实时流式传输部分回复：

    - 直接聊天：预览消息 + `editMessageText`
    - 群组/话题：预览消息 + `editMessageText`

    要求：

    - `channels.telegram.streaming` 为 `off | partial | block | progress`（默认：`partial`）
    - `progress` 保留一个可编辑的状态草稿，并用工具进度更新它，直到最终投递
    - `streaming.preview.toolProgress` 控制工具/进度更新是否复用同一个编辑预览消息（默认：当预览流激活时为 `true`）
    - `streaming.preview.commandText` 控制这些工具进度行内的命令/exec 详情：`raw`（默认，保留已发布行为）或 `status`（仅工具标签）
    - 旧版 `channels.telegram.streamMode` 和布尔型 `streaming` 值被检测；运行 `openclaw doctor --fix` 将它们迁移到 `channels.telegram.streaming.mode`

    工具进度预览更新是工具运行时显示的短状态行，例如命令执行、文件读取、计划更新或补丁摘要。Telegram 默认保持这些启用，以匹配从 `v2026.4.22` 及更高版本发布的 OpenClaw 行为。要保留回答文本的编辑预览但隐藏工具进度行，设置：

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": {
              "toolProgress": false
            }
          }
        }
      }
    }
    ```

    要保持工具进度可见但隐藏命令/exec 文本，设置：

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": {
              "commandText": "status"
            }
          }
        }
      }
    }
    ```

    对于进度草稿模式，将相同的命令文本策略放在 `streaming.progress` 下：

    ```json
    {
      "channels": {
        "telegram": {
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

    仅当您需要纯最终投递时才使用 `streaming.mode: "off"`：Telegram 预览编辑被禁用，通用工具/进度噪声被抑制而不是作为独立状态消息发送。审批提示、媒体有效负载和错误仍通过正常最终投递路由。当您只想保留回答预览编辑同时隐藏工具进度状态行时，使用 `streaming.preview.toolProgress: false`。

    <Note>
      Telegram 选定引用回复是例外。当 `replyToMode` 为 `"first"`、`"all"` 或 `"batched"` 且入站消息包含选定引用文本时，OpenClaw 通过 Telegram 的原生引用回复路径发送最终回答，而不是编辑回答预览，因此 `streaming.preview.toolProgress` 无法显示该轮次的短状态行。没有选定引用文本的当前消息回复仍然保留预览流式传输。当工具进度可见性比原生引用回复更重要时，设置 `replyToMode: "off"`，或设置 `streaming.preview.toolProgress: false` 来认可这种权衡。
    </Note>

    仅文本回复：

    - 短私信/群组/话题预览：OpenClaw 保留相同的预览消息并在原地执行最终编辑，除非在预览出现后发送了可见的非预览消息
    - 预览后跟可见的非预览输出：OpenClaw 将完成的回复作为新的最终消息发送并清理旧预览，使最终回答出现在中间输出之后
    - 超过约一分钟的预览：OpenClaw 将完成的回复作为新的最终消息发送，然后清理预览，以便 Telegram 的可见时间戳反映完成时间而不是预览创建时间

    对于复杂回复（例如媒体有效负载），OpenClaw 回退到正常最终投递，然后清理预览消息。

    预览流式传输与块流式传输是独立的。当为 Telegram 显式启用块流式传输时，OpenClaw 跳过预览流以避免双重流式传输。

    Telegram 专用推理流：

    - `/reasoning stream` 在生成时将推理发送到实时预览
    - 推理预览在最终投递后被删除；当推理应保持可见时使用 `/reasoning on`
    - 最终回答不含推理文本发送

  </Accordion>

  <Accordion title="格式化和 HTML 回退">
    出站文本使用 Telegram `parse_mode: "HTML"`。

    - 类 Markdown 文本渲染为 Telegram 安全 HTML。
    - 原始模型 HTML 被转义以减少 Telegram 解析失败。
    - 如果 Telegram 拒绝解析的 HTML，OpenClaw 重试为纯文本。

    链接预览默认启用，可以通过 `channels.telegram.linkPreview: false` 禁用。

  </Accordion>

  <Accordion title="原生命令和自定义命令">
    Telegram 命令菜单注册在启动时通过 `setMyCommands` 处理。

    原生命令默认值：

    - `commands.native: "auto"` 为 Telegram 启用原生命令

    添加自定义命令菜单条目：

```json5
{
  channels: {
    telegram: {
      customCommands: [
        { command: "backup", description: "Git backup" },
        { command: "generate", description: "Create an image" },
      ],
    },
  },
}
```

    规则：

    - 名称被规范化（去除前导 `/`，小写）
    - 有效模式：`a-z`、`0-9`、`_`，长度 `1..32`
    - 自定义命令不能覆盖原生命令
    - 冲突/重复被跳过并记录

    说明：

    - 自定义命令仅是菜单条目；它们不自动实现行为
    - 插件/技能命令即使未在 Telegram 菜单中显示，输入时仍然有效

    如果原生命令被禁用，内置命令被移除。如果已配置，自定义/插件命令可能仍然注册。

    常见设置失败：

    - `setMyCommands failed` 带 `BOT_COMMANDS_TOO_MUCH` 意味着 Telegram 菜单在修剪后仍然溢出；减少插件/技能/自定义命令或禁用 `channels.telegram.commands.native`。
    - `deleteWebhook`、`deleteMyCommands` 或 `setMyCommands` 失败带 `404: Not Found` 而直接 Bot API curl 命令有效，可能意味着 `channels.telegram.apiRoot` 被设置为完整的 `/bot<TOKEN>` 端点。`apiRoot` 必须只是 Bot API 根，`openclaw doctor --fix` 会删除意外的尾部 `/bot<TOKEN>`。
    - `getMe returned 401` 意味着 Telegram 拒绝了配置的机器人 Token。使用当前 BotFather Token 更新 `botToken`、`tokenFile` 或 `TELEGRAM_BOT_TOKEN`；OpenClaw 在轮询前停止，因此这不被报告为 Webhook 清理失败。
    - `setMyCommands failed` 带网络/fetch 错误通常意味着到 `api.telegram.org` 的出站 DNS/HTTPS 被阻止。

    ### 设备配对命令（`device-pair` 插件）

    当 `device-pair` 插件安装后：

    1. `/pair` 生成设置码
    2. 在 iOS 应用中粘贴代码
    3. `/pair pending` 列出待处理请求（包括角色/权限范围）
    4. 批准请求：
       - `/pair approve <requestId>` 用于显式审批
       - `/pair approve` 当只有一个待处理请求时
       - `/pair approve latest` 用于最新的

    设置码携带短期引导 Token。内置引导传递保持主节点 Token 在 `scopes: []`；任何传递的操作员 Token 受限于 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`。引导范围检查带角色前缀，因此操作员白名单仅满足操作员请求；非操作员角色仍需要其自己角色前缀下的权限范围。

    如果设备以更改的认证详情（例如角色/权限范围/公钥）重试，之前的待处理请求被取代，新请求使用不同的 `requestId`。在批准前重新运行 `/pair pending`。

    更多详情：[配对](/channels/pairing#pair-via-telegram-recommended-for-ios)。

  </Accordion>

  <Accordion title="内联按钮">
    配置内联键盘范围：

```json5
{
  channels: {
    telegram: {
      capabilities: {
        inlineButtons: "allowlist",
      },
    },
  },
}
```

    每账户覆盖：

```json5
{
  channels: {
    telegram: {
      accounts: {
        main: {
          capabilities: {
            inlineButtons: "allowlist",
          },
        },
      },
    },
  },
}
```

    范围：

    - `off`
    - `dm`
    - `group`
    - `all`
    - `allowlist`（默认）

    旧版 `capabilities: ["inlineButtons"]` 映射到 `inlineButtons: "all"`。

    消息操作示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "Choose an option:",
  buttons: [
    [
      { text: "Yes", callback_data: "yes" },
      { text: "No", callback_data: "no" },
    ],
    [{ text: "Cancel", callback_data: "cancel" }],
  ],
}
```

    回调点击作为文本传递给智能体：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="智能体和自动化的 Telegram 消息操作">
    Telegram 工具操作包括：

    - `sendMessage`（`to`、`content`、可选 `mediaUrl`、`replyToMessageId`、`messageThreadId`）
    - `react`（`chatId`、`messageId`、`emoji`）
    - `deleteMessage`（`chatId`、`messageId`）
    - `editMessage`（`chatId`、`messageId`、`content`）
    - `createForumTopic`（`chatId`、`name`、可选 `iconColor`、`iconCustomEmojiId`）

    频道消息操作暴露符合人体工程学的别名（`send`、`react`、`delete`、`edit`、`sticker`、`sticker-search`、`topic-create`）。

    门控控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker`（默认：禁用）

    注意：`edit` 和 `topic-create` 当前默认启用，没有单独的 `channels.telegram.actions.*` 切换。
    运行时发送使用活动配置/密钥快照（启动/重载），因此操作路径不会每次发送都执行临时 SecretRef 重新解析。

    反应移除语义：[/tools/reactions](/tools/reactions)

  </Accordion>

  <Accordion title="回复线程标签">
    Telegram 支持在生成的输出中显式回复线程标签：

    - `[[reply_to_current]]` 回复触发消息
    - `[[reply_to:<id>]]` 回复特定 Telegram 消息 ID

    `channels.telegram.replyToMode` 控制处理：

    - `off`（默认）
    - `first`
    - `all`

    当启用回复线程且原始 Telegram 文本或标题可用时，OpenClaw 自动包含原生 Telegram 引用摘要。Telegram 将原生引用文本上限限制为 1024 个 UTF-16 码元，因此较长的消息从开头引用，如果 Telegram 拒绝引用则回退到纯回复。

    注意：`off` 禁用隐式回复线程。显式的 `[[reply_to_*]]` 标签仍然被遵守。

  </Accordion>

  <Accordion title="论坛话题和线程行为">
    论坛超级群组：

    - 话题会话键追加 `:topic:<threadId>`
    - 回复和输入目标话题线程
    - 话题配置路径：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    通用话题（`threadId=1`）特殊情况：

    - 消息发送省略 `message_thread_id`（Telegram 拒绝 `sendMessage(...thread_id=1)`）
    - 输入操作仍包含 `message_thread_id`

    话题继承：话题条目继承群组设置，除非覆盖（`requireMention`、`allowFrom`、`skills`、`systemPrompt`、`enabled`、`groupPolicy`）。
    `agentId` 仅限话题，不从群组默认值继承。

    **每话题智能体路由**：每个话题可以通过在话题配置中设置 `agentId` 来路由到不同的智能体。这为每个话题提供了独立的工作区、内存和会话。示例：

    ```json5
    {
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              topics: {
                "1": { agentId: "main" },      // 通用话题 → 主智能体
                "3": { agentId: "zu" },        // 开发话题 → zu 智能体
                "5": { agentId: "coder" }      // 代码审查 → coder 智能体
              }
            }
          }
        }
      }
    }
    ```

    每个话题有自己的会话键：`agent:zu:telegram:group:-1001234567890:topic:3`

    **持久 ACP 话题绑定**：论坛话题可以通过顶级类型化 ACP 绑定（`bindings[]` 带 `type: "acp"` 和 `match.channel: "telegram"`、`peer.kind: "group"`，以及像 `-1001234567890:topic:42` 这样的话题限定 ID）固定 ACP harness 会话。当前范围限于群组/超级群组中的论坛话题。请参阅 [ACP 智能体](/tools/acp-agents)。

    **从聊天生成线程绑定 ACP**：`/acp spawn <agent> --thread here|auto` 将当前话题绑定到新的 ACP 会话；后续消息直接路由到那里。OpenClaw 在话题中固定生成确认。需要 `channels.telegram.threadBindings.spawnSessions` 保持启用（默认：`true`）。

    模板上下文暴露 `MessageThreadId` 和 `IsForum`。带 `message_thread_id` 的私信聊天默认保持私信路由和平坦会话上的回复元数据；仅在使用 `threadReplies: "inbound"`、`threadReplies: "always"`、`requireTopic: true` 或匹配的话题配置时才使用线程感知会话键。使用顶级 `channels.telegram.dm.threadReplies` 作为账户默认值，或使用 `direct.<chatId>.threadReplies` 用于单个私信。

  </Accordion>

  <Accordion title="音频、视频和贴纸">
    ### 音频消息

    Telegram 区分语音备忘录和音频文件。

    - 默认：音频文件行为
    - 在智能体回复中标记 `[[audio_as_voice]]` 强制发送语音备忘录
    - 入站语音备忘录转录在智能体上下文中被标记为机器生成的不可信文本；提及检测仍然使用原始转录，因此带提及门控的语音消息继续有效。

    消息操作示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/voice.ogg",
  asVoice: true,
}
```

    ### 视频消息

    Telegram 区分视频文件和视频备忘录。

    消息操作示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/video.mp4",
  asVideoNote: true,
}
```

    视频备忘录不支持标题；提供的消息文本单独发送。

    ### 贴纸

    入站贴纸处理：

    - 静态 WEBP：下载并处理（占位符 `<media:sticker>`）
    - 动画 TGS：跳过
    - 视频 WEBM：跳过

    贴纸上下文字段：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    贴纸缓存文件：

    - `~/.openclaw/telegram/sticker-cache.json`

    贴纸被描述一次（如果可能）并缓存以减少重复的视觉调用。

    启用贴纸操作：

```json5
{
  channels: {
    telegram: {
      actions: {
        sticker: true,
      },
    },
  },
}
```

    发送贴纸操作：

```json5
{
  action: "sticker",
  channel: "telegram",
  to: "123456789",
  fileId: "CAACAgIAAxkBAAI...",
}
```

    搜索缓存贴纸：

```json5
{
  action: "sticker-search",
  channel: "telegram",
  query: "cat waving",
  limit: 5,
}
```

  </Accordion>

  <Accordion title="反应通知">
    Telegram 反应作为 `message_reaction` 更新到达（与消息有效负载分开）。

    启用时，OpenClaw 将系统事件加入队列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    配置：

    - `channels.telegram.reactionNotifications`：`off | own | all`（默认：`own`）
    - `channels.telegram.reactionLevel`：`off | ack | minimal | extensive`（默认：`minimal`）

    说明：

    - `own` 表示用户对机器人发送消息的反应（通过已发送消息缓存尽力而为）。
    - 反应事件仍然遵守 Telegram 访问控制（`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`）；未授权的发件人被丢弃。
    - Telegram 不在反应更新中提供线程 ID。
      - 非论坛群组路由到群组聊天会话
      - 论坛群组路由到群组通用话题会话（`:topic:1`），而不是确切的原始话题

    轮询/Webhook 的 `allowed_updates` 自动包含 `message_reaction`。

  </Accordion>

  <Accordion title="确认反应">
    `ackReaction` 在 OpenClaw 处理入站消息时发送确认 emoji。

    解析顺序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 智能体身份 emoji 回退（`agents.list[].identity.emoji`，否则为 "👀"）

    说明：

    - Telegram 需要 Unicode emoji（例如 "👀"）。
    - 使用 `""` 禁用频道或账户的反应。

  </Accordion>

  <Accordion title="来自 Telegram 事件和命令的配置写入">
    频道配置写入默认启用（`configWrites !== false`）。

    Telegram 触发的写入包括：

    - 群组迁移事件（`migrate_to_chat_id`）以更新 `channels.telegram.groups`
    - `/config set` 和 `/config unset`（需要命令启用）

    禁用：

```json5
{
  channels: {
    telegram: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

  <Accordion title="长轮询 vs Webhook">
    默认是长轮询。对于 Webhook 模式，设置 `channels.telegram.webhookUrl` 和 `channels.telegram.webhookSecret`；可选的 `webhookPath`、`webhookHost`、`webhookPort`（默认 `/telegram-webhook`、`127.0.0.1`、`8787`）。

    本地侦听器绑定到 `127.0.0.1:8787`。对于公共入口，要么在本地端口前放置反向代理，要么有意设置 `webhookHost: "0.0.0.0"`。

    Webhook 模式验证请求守卫、Telegram 密钥 Token 和 JSON 正文，然后返回 `200` 给 Telegram。
    OpenClaw 然后通过与长轮询使用的相同的每聊天/每话题机器人通道异步处理更新，因此慢速智能体轮次不会占用 Telegram 的投递 ACK。

  </Accordion>

  <Accordion title="限制、重试和 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认为 4000。
    - `channels.telegram.chunkMode="newline"` 在长度分割前优先选择段落边界（空行）。
    - `channels.telegram.mediaMaxMb`（默认 100）限制入站和出站 Telegram 媒体大小。
    - `channels.telegram.mediaGroupFlushMs`（默认 500）控制 Telegram 相册/媒体组在 OpenClaw 将它们作为一条入站消息分发之前缓冲的时间。如果相册部分到达较晚则增加；减少以降低相册回复延迟。
    - `channels.telegram.timeoutSeconds` 覆盖 Telegram API 客户端超时（如果未设置，使用 grammY 默认值）。机器人客户端将配置值钳制在 60 秒出站文本/输入请求守卫以下，以便 grammY 不会在 OpenClaw 的传输守卫和回退运行之前中止可见回复投递。长轮询仍然使用 45 秒的 `getUpdates` 请求守卫，以便空闲轮询不会被无限期放弃。
    - `channels.telegram.pollingStallThresholdMs` 默认为 `120000`；仅对误报轮询停止重启在 `30000` 到 `600000` 之间调整。
    - 群组上下文历史使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（默认 50）；`0` 禁用。
    - 回复/引用/转发补充上下文当前按接收状态传递。
    - Telegram 白名单主要门控谁可以触发智能体，而不是完整的补充上下文编辑边界。
    - 私信历史控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 配置适用于 Telegram 发送辅助函数（CLI/工具/操作）用于可恢复的出站 API 错误。入站最终回复投递也对 Telegram 预连接失败使用有界安全发送重试，但不重试可能重复可见消息的模糊后发送网络信封。

    CLI 和消息工具发送目标可以是数字聊天 ID、用户名或论坛话题目标：

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
openclaw message send --channel telegram --target -1001234567890:topic:42 --message "hi topic"
```

    Telegram 轮询使用 `openclaw message poll`，支持论坛话题：

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300 --poll-public
```

    Telegram 专用轮询标志：

    - `--poll-duration-seconds`（5-600）
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用于论坛话题（或使用 `:topic:` 目标）

    Telegram 发送还支持：

    - `--presentation` 带 `buttons` 块用于内联键盘（当 `channels.telegram.capabilities.inlineButtons` 允许时）
    - `--pin` 或 `--delivery '{"pin":true}'` 在机器人可以在该聊天中固定时请求固定投递
    - `--force-document` 将出站图像和 GIF 作为文档发送而不是压缩照片或动画媒体上传

    操作门控：

    - `channels.telegram.actions.sendMessage=false` 禁用出站 Telegram 消息，包括轮询
    - `channels.telegram.actions.poll=false` 禁用 Telegram 轮询创建，同时保持正常发送启用

  </Accordion>

  <Accordion title="Telegram 中的 Exec 审批">
    Telegram 支持在审批者私信中进行 exec 审批，并且可以选择在原始聊天或话题中发布提示。审批者必须是数字 Telegram 用户 ID。

    配置路径：

    - `channels.telegram.execApprovals.enabled`（当至少一个审批者可解析时自动启用）
    - `channels.telegram.execApprovals.approvers`（回退到 `commands.ownerAllowFrom` 中的数字所有者 ID）
    - `channels.telegram.execApprovals.target`：`dm`（默认）| `channel` | `both`
    - `agentFilter`、`sessionFilter`

    `channels.telegram.allowFrom`、`groupAllowFrom` 和 `defaultTo` 控制谁可以与机器人交谈以及它在哪里发送正常回复。它们不使某人成为 exec 审批者。第一个批准的私信配对在没有命令所有者时引导 `commands.ownerAllowFrom`，因此单所有者设置仍然有效，无需在 `execApprovals.approvers` 下重复 ID。

    频道投递在聊天中显示命令文本；仅在受信任的群组/话题中启用 `channel` 或 `both`。当提示落在论坛话题中时，OpenClaw 为审批提示和后续保留话题。Exec 审批默认在 30 分钟后过期。

    内联审批按钮还需要 `channels.telegram.capabilities.inlineButtons` 允许目标界面（`dm`、`group` 或 `all`）。以 `plugin:` 为前缀的审批 ID 通过插件审批解决；其他的首先通过 exec 审批解决。

    请参阅 [Exec 审批](/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 错误回复控制

当智能体遇到投递或提供者错误时，Telegram 可以回复错误文本或抑制它。两个配置键控制此行为：

| 键                                  | 值                | 默认    | 描述                                                           |
| ----------------------------------- | ----------------- | ------- | -------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`、`silent` | `reply` | `reply` 向聊天发送友好的错误消息。`silent` 完全抑制错误回复。  |
| `channels.telegram.errorCooldownMs` | 数字（毫秒）      | `60000` | 同一聊天中错误回复之间的最短时间。防止中断期间的错误垃圾邮件。 |

支持每账户、每群组和每话题覆盖（与其他 Telegram 配置键的继承相同）。

```json5
{
  channels: {
    telegram: {
      errorPolicy: "reply",
      errorCooldownMs: 120000,
      groups: {
        "-1001234567890": {
          errorPolicy: "silent", // 抑制此群组中的错误
        },
      },
    },
  },
}
```

## 故障排查

<AccordionGroup>
  <Accordion title="机器人不响应未提及的群组消息">

    - 如果 `requireMention=false`，Telegram 隐私模式必须允许完整可见性。
      - BotFather：`/setprivacy` -> 禁用
      - 然后从群组中移除并重新添加机器人
    - 当配置期望未提及的群组消息时，`openclaw channels status` 会发出警告。
    - `openclaw channels status --probe` 可以检查显式数字群组 ID；通配符 `"*"` 无法进行成员身份探测。
    - 快速会话测试：`/activation always`。

  </Accordion>

  <Accordion title="机器人根本看不到群组消息">

    - 当 `channels.telegram.groups` 存在时，群组必须被列出（或包含 `"*"`）
    - 验证机器人是否是群组成员
    - 查看日志：`openclaw logs --follow` 查找跳过原因

  </Accordion>

  <Accordion title="命令部分或完全不起作用">

    - 授权您的发件人身份（配对和/或数字 `allowFrom`）
    - 即使群组策略为 `open`，命令授权仍然适用
    - `setMyCommands failed` 带 `BOT_COMMANDS_TOO_MUCH` 意味着原生菜单条目过多；减少插件/技能/自定义命令或禁用原生菜单
    - `deleteMyCommands` / `setMyCommands` 启动调用和 `sendChatAction` 输入调用在请求超时时有界并重试一次通过 Telegram 的传输回退。持续的网络/fetch 错误通常表明主机和 `api.telegram.org` 之间的 DNS/HTTPS 可达性问题

  </Accordion>

  <Accordion title="启动报告未授权的 Token">

    - `getMe returned 401` 是配置机器人 Token 的 Telegram 认证失败。
    - 在 BotFather 中重新复制或重新生成机器人 Token，然后更新 `channels.telegram.botToken`、`channels.telegram.tokenFile`、`channels.telegram.accounts.<id>.botToken` 或默认账户的 `TELEGRAM_BOT_TOKEN`。
    - 启动期间的 `deleteWebhook 401 Unauthorized` 也是认证失败；将其视为"没有 Webhook 存在"只会将相同的错误 Token 失败推迟到后续 API 调用。

  </Accordion>

  <Accordion title="轮询或网络不稳定">

    - Node 22+ 加自定义 fetch/代理在 AbortSignal 类型不匹配时可能触发立即中止行为。
    - 某些主机首先将 `api.telegram.org` 解析为 IPv6；损坏的 IPv6 出口可能导致间歇性 Telegram API 失败。
    - 如果日志包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 现在将这些作为可恢复的网络错误重试。
    - 在轮询启动期间，OpenClaw 为 grammY 复用成功的启动 `getMe` 探测，以便 runner 在第一次 `getUpdates` 之前不需要第二次 `getMe`。
    - 如果 `deleteWebhook` 在轮询启动期间因瞬态网络错误失败，OpenClaw 继续进入长轮询，而不是发出另一个预轮询控制平面调用。仍然活跃的 Webhook 表现为 `getUpdates` 冲突；OpenClaw 然后重建 Telegram 传输并重试 Webhook 清理。
    - 如果 Telegram 套接字在短固定节奏上循环，检查低 `channels.telegram.timeoutSeconds`；机器人客户端将配置值钳制在出站和 `getUpdates` 请求守卫以下，但旧版本可能会在此设置低于这些守卫时在每次轮询或回复时中止。
    - 如果日志包含 `Polling stall detected`，OpenClaw 在默认 120 秒内没有完成长轮询活跃度后重启轮询并重建 Telegram 传输。
    - `openclaw channels status --probe` 和 `openclaw doctor` 在以下情况发出警告：运行中的轮询账户在启动宽限期后没有完成 `getUpdates`，运行中的 Webhook 账户在启动宽限期后没有完成 `setWebhook`，或最后成功的轮询传输活动已过时。
    - 仅当长时间运行的 `getUpdates` 调用正常但您的主机仍然报告误报轮询停止重启时，才增加 `channels.telegram.pollingStallThresholdMs`。持续停止通常指向主机和 `api.telegram.org` 之间的代理、DNS、IPv6 或 TLS 出口问题。
    - Telegram 也遵守 Bot API 传输的进程代理环境，包括 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 及其小写变体。`NO_PROXY` / `no_proxy` 仍然可以绕过 `api.telegram.org`。
    - 如果通过 `OPENCLAW_PROXY_URL` 为服务环境配置了 OpenClaw 管理代理且没有标准代理环境，Telegram 也将该 URL 用于 Bot API 传输。
    - 在出口/TLS 不稳定的 VPS 主机上，通过 `channels.telegram.proxy` 路由 Telegram API 调用：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 默认为 `autoSelectFamily=true`（WSL2 除外）。Telegram DNS 结果顺序遵守 `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`，然后 `channels.telegram.network.dnsResultOrder`，然后进程默认如 `NODE_OPTIONS=--dns-result-order=ipv4first`；如果都不适用，Node 22+ 回退到 `ipv4first`。
    - 如果您的主机是 WSL2 或明确在仅 IPv4 行为下工作更好，强制家族选择：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基准范围答案（`198.18.0.0/15`）默认情况下已允许用于 Telegram 媒体下载。如果受信任的假 IP 或透明代理在媒体下载期间将 `api.telegram.org` 重写为某些其他私有/内部/特殊用途地址，您可以选择加入 Telegram 专用绕过：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 相同的选择加入在每账户的 `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 处可用。
    - 如果您的代理将 Telegram 媒体主机解析为 `198.18.x.x`，首先保持危险标志关闭。Telegram 媒体默认已允许 RFC 2544 基准范围。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 削弱了 Telegram 媒体 SSRF 保护。仅在受信任的操作员控制的代理环境（如 Clash、Mihomo 或 Surge 假 IP 路由）合成 RFC 2544 基准范围之外的私有或特殊用途答案时使用它。正常公共互联网 Telegram 访问保持关闭。
    </Warning>

    - 环境覆盖（临时）：
      - `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`
    - 验证 DNS 答案：

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

更多帮助：[频道故障排查](/channels/troubleshooting)。

## 配置参考

主要参考：[配置参考 - Telegram](/gateway/config-channels#telegram)。

<Accordion title="高信号 Telegram 字段">

- 启动/认证：`enabled`、`botToken`、`tokenFile`、`accounts.*`（`tokenFile` 必须指向普通文件；符号链接被拒绝）
- 访问控制：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`groups.*.topics.*`、顶级 `bindings[]`（`type: "acp"`）
- exec 审批：`execApprovals`、`accounts.*.execApprovals`
- 命令/菜单：`commands.native`、`commands.nativeSkills`、`customCommands`
- 线程/回复：`replyToMode`、`dm.threadReplies`、`direct.*.threadReplies`
- 流式传输：`streaming`（预览）、`streaming.preview.toolProgress`、`blockStreaming`
- 格式化/投递：`textChunkLimit`、`chunkMode`、`linkPreview`、`responsePrefix`
- 媒体/网络：`mediaMaxMb`、`mediaGroupFlushMs`、`timeoutSeconds`、`pollingStallThresholdMs`、`retry`、`network.autoSelectFamily`、`network.dangerouslyAllowPrivateNetwork`、`proxy`
- 自定义 API 根：`apiRoot`（仅 Bot API 根；不包含 `/bot<TOKEN>`）
- Webhook：`webhookUrl`、`webhookSecret`、`webhookPath`、`webhookHost`
- 操作/功能：`capabilities.inlineButtons`、`actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反应：`reactionNotifications`、`reactionLevel`
- 错误：`errorPolicy`、`errorCooldownMs`
- 写入/历史：`configWrites`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`

</Accordion>

<Note>
多账户优先级：当配置了两个或多个账户 ID 时，设置 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）使默认路由明确。否则 OpenClaw 回退到第一个规范化账户 ID，`openclaw doctor` 会发出警告。命名账户继承 `channels.telegram.allowFrom` / `groupAllowFrom`，但不继承 `accounts.default.*` 值。
</Note>

## 相关

<CardGroup cols={2}>
  <Card title="配对" icon="link" href="/channels/pairing">
    将 Telegram 用户配对到网关。
  </Card>
  <Card title="群组" icon="users" href="/channels/groups">
    群组和话题白名单行为。
  </Card>
  <Card title="频道路由" icon="route" href="/channels/channel-routing">
    将入站消息路由到智能体。
  </Card>
  <Card title="安全性" icon="shield" href="/gateway/security">
    威胁模型和加固。
  </Card>
  <Card title="多智能体路由" icon="sitemap" href="/concepts/multi-agent">
    将群组和话题映射到智能体。
  </Card>
  <Card title="故障排查" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断。
  </Card>
</CardGroup>
