---
summary: "跨平台群组聊天行为（Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo）"
read_when:
  - 更改群组聊天行为或提及门控
title: "群组"
sidebarTitle: "群组"
---

OpenClaw 跨平台一致地处理群组聊天：Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo。

## 入门介绍（2 分钟）

OpenClaw "生活"在您自己的消息账户上。没有单独的 WhatsApp 机器人用户。如果**您**在一个群组中，OpenClaw 可以看到该群组并在那里响应。

默认行为：

- 群组受限（`groupPolicy: "allowlist"`）。
- 回复需要提及，除非您明确禁用提及门控。
- 群组/频道中的正常最终回复默认为私密。可见的房间输出使用 `message` 工具。

翻译：白名单发送者可以通过提及 OpenClaw 来触发它。

<Note>
**概要**

- **私信访问**由 `*.allowFrom` 控制。
- **群组访问**由 `*.groupPolicy` + 白名单（`*.groups`、`*.groupAllowFrom`）控制。
- **回复触发**由提及门控（`requireMention`、`/activation`）控制。

</Note>

快速流程（群组消息发生什么）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

## 可见回复

对于群组/频道房间，OpenClaw 默认为 `messages.groupChat.visibleReplies: "message_tool"`。
`openclaw doctor --fix` 将此默认值写入省略它的已配置频道配置中。
这意味着智能体仍然处理轮次并可以更新内存/会话状态，但其正常的最终答案不会自动发布回房间。要可见地发言，智能体使用 `message(action=send)`。

此默认值取决于可靠调用工具的模型/运行时。如果日志显示助手文本但 `didSendViaMessagingTool: false`，则模型私下回答而不是调用消息工具。这不是 Discord/Slack/Telegram 发送失败。对于群组/频道会话，使用工具调用可靠的模型，或设置 `messages.groupChat.visibleReplies: "automatic"` 恢复旧版可见最终回复。

如果消息工具在活动工具策略下不可用，OpenClaw 会回退到自动可见回复，而不是静默压制响应。`openclaw doctor` 会警告此不匹配。

对于直接聊天和任何其他来源轮次，使用 `messages.visibleReplies: "message_tool"` 全局应用相同的仅工具可见回复行为。线束也可以选择此作为未设置的默认值；Codex 线束对 Codex 模式直接聊天执行此操作。`messages.groupChat.visibleReplies` 仍然是群组/频道房间更具体的覆盖。

这取代了强制模型在大多数潜伏模式轮次中回答 `NO_REPLY` 的旧模式。在仅工具模式下，什么都不做可见的只意味着不调用消息工具。

输入指示符在智能体以仅工具模式工作时仍然发送。默认群组输入模式从这些轮次的"message"升级为"instant"，因为在智能体决定是否调用消息工具之前可能永远不会有正常的助手消息文本。明确的输入模式配置仍然优先。

要为群组/频道房间恢复旧版自动最终回复：

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "automatic",
    },
  },
}
```

网关在文件保存后热重载 `messages` 配置。仅当文件监视或配置重载在部署中禁用时才重启。

要求可见输出对每个来源聊天都通过消息工具：

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

原生斜杠命令（Discord、Telegram 和其他具有原生命令支持的平台）绕过 `visibleReplies: "message_tool"` 并始终可见地回复，以便频道原生命令 UI 获得它期望的响应。这仅适用于经过验证的原生命令轮次；文本输入的 `/...` 命令和普通聊天轮次仍然遵循配置的群组默认值。

## 上下文可见性和白名单

群组安全涉及两个不同的控制：

- **触发授权**：谁可以触发智能体（`groupPolicy`、`groups`、`groupAllowFrom`、频道特定白名单）。
- **上下文可见性**：注入模型的补充上下文（回复文本、引用、线程历史、转发元数据）。

默认情况下，OpenClaw 优先考虑正常的聊天行为，并保持上下文基本按接收到的方式。这意味着白名单主要决定谁可以触发操作，而不是每个引用或历史片段的通用编辑边界。

<AccordionGroup>
  <Accordion title="当前行为因频道而异">
    - 某些频道已经对特定路径中的补充上下文应用基于发送者的过滤（例如 Slack 线程种子、Matrix 回复/线程查找）。
    - 其他频道仍然按接收到的方式传递引用/回复/转发上下文。

  </Accordion>
  <Accordion title="加固方向（计划中）">
    - `contextVisibility: "all"`（默认）保持当前按接收到的方式的行为。
    - `contextVisibility: "allowlist"` 将补充上下文过滤为白名单发送者。
    - `contextVisibility: "allowlist_quote"` 是 `allowlist` 加上一个明确的引用/回复例外。

    在此加固模型跨频道一致实现之前，预期各平台之间存在差异。

  </Accordion>
</AccordionGroup>

![群组消息流程](/images/groups-flow.svg)

如果您想...

| 目标                           | 设置什么                                                   |
| ------------------------------ | ---------------------------------------------------------- |
| 允许所有群组但只在 @提及时回复 | `groups: { "*": { requireMention: true } }`                |
| 禁用所有群组回复               | `groupPolicy: "disabled"`                                  |
| 只允许特定群组                 | `groups: { "<group-id>": { ... } }`（无 `"*"` 键）         |
| 只有您才能在群组中触发         | `groupPolicy: "allowlist"`，`groupAllowFrom: ["+1555..."]` |
| 跨频道重用一个受信任的发送者集 | `groupAllowFrom: ["accessGroup:operators"]`                |

有关可重用发送者白名单，请参阅[访问组](/channels/access-groups)。

## 会话键

- 群组会话使用 `agent:<agentId>:<channel>:group:<id>` 会话键（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 论坛话题将 `:topic:<threadId>` 添加到群组 id，以便每个话题都有自己的会话。
- 直接聊天使用主会话（或每发送者配置的）。
- 群组会话跳过心跳。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：个人私信 + 公共群组（单智能体）

是的——如果您的"个人"流量是**私信**，而您的"公共"流量是**群组**，这很有效。

原因：在单智能体模式下，私信通常落在**主**会话键（`agent:main:main`），而群组始终使用**非主**会话键（`agent:main:<channel>:group:<id>`）。如果您启用 `mode: "non-main"` 沙盒，这些群组会话在配置的沙盒后端运行，而您的主私信会话保持在主机上。Docker 是您不选择时的默认后端。

这给您一个智能体"大脑"（共享工作区 + 内存），但两种执行态势：

- **私信**：完整工具（主机）
- **群组**：沙盒 + 受限工具

<Note>
如果您需要真正独立的工作区/人格（"个人"和"公共"绝不能混合），请使用第二个智能体 + 绑定。请参阅[多智能体路由](/concepts/multi-agent)。
</Note>

<Tabs>
  <Tab title="私信在主机，群组在沙盒">
    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main", // 群组/频道是非主 -> 沙盒
            scope: "session", // 最强隔离（每个群组/频道一个容器）
            workspaceAccess: "none",
          },
        },
      },
      tools: {
        sandbox: {
          tools: {
            // 如果 allow 非空，其他所有内容都被阻止（deny 仍然优先）。
            allow: ["group:messaging", "group:sessions"],
            deny: ["group:runtime", "group:fs", "group:ui", "nodes", "cron", "gateway"],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="群组只能看到白名单文件夹">
    想要"群组只能看到文件夹 X"而不是"无主机访问"？保持 `workspaceAccess: "none"` 并仅将白名单路径挂载到沙盒中：

    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main",
            scope: "session",
            workspaceAccess: "none",
            docker: {
              binds: [
                // hostPath:containerPath:mode
                "/home/user/FriendsShared:/data:ro",
              ],
            },
          },
        },
      },
    }
    ```

  </Tab>
</Tabs>

相关：

- 配置键和默认值：[网关配置](/gateway/config-agents#agentsdefaultssandbox)
- 调试工具为何被阻止：[沙盒 vs 工具策略 vs 提升](/gateway/sandbox-vs-tool-policy-vs-elevated)
- 绑定挂载详情：[沙盒](/gateway/sandboxing#custom-bind-mounts)

## 显示标签

- UI 标签在可用时使用 `displayName`，格式为 `<channel>:<token>`。
- `#room` 保留用于房间/频道；群组聊天使用 `g-<slug>`（小写，空格 -> `-`，保留 `#@+._-`）。

## 群组策略

控制每个频道如何处理群组/房间消息：

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "disabled", // "open" | "disabled" | "allowlist"
      groupAllowFrom: ["+15551234567"],
    },
    telegram: {
      groupPolicy: "disabled",
      groupAllowFrom: ["123456789"], // 数字 Telegram 用户 id（向导可以解析 @username）
    },
    signal: {
      groupPolicy: "disabled",
      groupAllowFrom: ["+15551234567"],
    },
    imessage: {
      groupPolicy: "disabled",
      groupAllowFrom: ["chat_id:123"],
    },
    msteams: {
      groupPolicy: "disabled",
      groupAllowFrom: ["user@org.com"],
    },
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        GUILD_ID: { channels: { help: { allow: true } } },
      },
    },
    slack: {
      groupPolicy: "allowlist",
      channels: { "#general": { allow: true } },
    },
    matrix: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["@owner:example.org"],
      groups: {
        "!roomId:example.org": { enabled: true },
        "#alias:example.org": { enabled: true },
      },
    },
  },
}
```

| 策略          | 行为                                  |
| ------------- | ------------------------------------- |
| `"open"`      | 群组绕过白名单；提及门控仍然适用。    |
| `"disabled"`  | 完全阻止所有群组消息。                |
| `"allowlist"` | 只允许与配置的白名单匹配的群组/房间。 |

<AccordionGroup>
  <Accordion title="每频道说明">
    - `groupPolicy` 与提及门控（需要 @提及）分开。
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（回退：明确的 `allowFrom`）。
    - Signal：`groupAllowFrom` 可以匹配入站 Signal 群组 id 或发送者电话/UUID。
    - 私信配对批准（`*-allowFrom` 存储条目）仅适用于私信访问；群组发送者授权明确使用群组白名单。
    - Discord：白名单使用 `channels.discord.guilds.<id>.channels`。
    - Slack：白名单使用 `channels.slack.channels`。
    - Matrix：白名单使用 `channels.matrix.groups`。优先使用房间 ID 或别名；已加入房间的名称查找是尽力而为，运行时忽略未解析的名称。使用 `channels.matrix.groupAllowFrom` 限制发送者；也支持每房间 `users` 白名单。
    - 群组私信分别控制（`channels.discord.dm.*`、`channels.slack.dm.*`）。
    - Telegram 白名单可以匹配用户 ID（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
    - 默认是 `groupPolicy: "allowlist"`；如果您的群组白名单为空，群组消息将被阻止。
    - 运行时安全：当提供商块完全缺失（`channels.<provider>` 不存在）时，群组策略回退到失败关闭模式（通常是 `allowlist`），而不是继承 `channels.defaults.groupPolicy`。

  </Accordion>
</AccordionGroup>

群组消息评估顺序的快速思维模型：

<Steps>
  <Step title="groupPolicy">
    `groupPolicy`（open/disabled/allowlist）。
  </Step>
  <Step title="群组白名单">
    群组白名单（`*.groups`、`*.groupAllowFrom`、频道特定白名单）。
  </Step>
  <Step title="提及门控">
    提及门控（`requireMention`、`/activation`）。
  </Step>
</Steps>

## 提及门控（默认）

群组消息需要提及，除非按群组覆盖。默认值在每个子系统下的 `*.groups."*"` 中。

当频道支持回复元数据时，回复机器人消息算作隐式提及。在公开引用元数据的频道上，引用机器人消息也可以算作隐式提及。当前内置情况包括 Telegram、WhatsApp、Slack、Discord、Microsoft Teams 和 ZaloUser。

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
        "123@g.us": { requireMention: false },
      },
    },
    telegram: {
      groups: {
        "*": { requireMention: true },
        "123456789": { requireMention: false },
      },
    },
    imessage: {
      groups: {
        "*": { requireMention: true },
        "123": { requireMention: false },
      },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          mentionPatterns: ["@openclaw", "openclaw", "\\+15555550123"],
          historyLimit: 50,
        },
      },
    ],
  },
}
```

<AccordionGroup>
  <Accordion title="提及门控说明">
    - `mentionPatterns` 是不区分大小写的安全正则表达式模式；无效模式和不安全的嵌套重复形式被忽略。
    - 提供明确提及的平台仍然通过；模式是回退。
    - 每智能体覆盖：`agents.list[].groupChat.mentionPatterns`（当多个智能体共享一个群组时有用）。
    - 提及门控仅在可能进行提及检测时强制执行（原生提及或已配置 `mentionPatterns`）。
    - 将群组或发送者加入白名单不会禁用提及门控；当所有消息都应触发时，将该群组的 `requireMention` 设置为 `false`。
    - 群组聊天提示上下文每个轮次携带已解析的静默回复指令；工作区文件不应重复 `NO_REPLY` 机制。
    - 允许静默回复的群组将干净的空或仅推理的模型轮次视为静默，等同于 `NO_REPLY`。直接聊天只有在明确允许直接静默回复时才这样做；否则空回复仍然是失败的智能体轮次。
    - Discord 默认值位于 `channels.discord.guilds."*"`（可按服务器/频道覆盖）。
    - 群组历史上下文跨频道统一包装，为**仅待处理**（由于提及门控而跳过的消息）；使用 `messages.groupChat.historyLimit` 作为全局默认值，`channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）作为覆盖。设置 `0` 以禁用。

  </Accordion>
</AccordionGroup>

## 群组/频道工具限制（可选）

某些频道配置支持限制**特定群组/房间/频道内**哪些工具可用。

- `tools`：为整个群组允许/拒绝工具。
- `toolsBySender`：群组内每发送者的覆盖。使用明确的键前缀：`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 通配符。旧版无前缀键仍然被接受，仅匹配为 `id:`。

解析顺序（最具体的获胜）：

<Steps>
  <Step title="群组 toolsBySender">
    群组/频道 `toolsBySender` 匹配。
  </Step>
  <Step title="群组工具">
    群组/频道 `tools`。
  </Step>
  <Step title="默认 toolsBySender">
    默认（`"*"`）`toolsBySender` 匹配。
  </Step>
  <Step title="默认工具">
    默认（`"*"`）`tools`。
  </Step>
</Steps>

示例（Telegram）：

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { tools: { deny: ["exec"] } },
        "-1001234567890": {
          tools: { deny: ["exec", "read", "write"] },
          toolsBySender: {
            "id:123456789": { alsoAllow: ["exec"] },
          },
        },
      },
    },
  },
}
```

<Note>
群组/频道工具限制是在全局/智能体工具策略之外应用的（deny 仍然优先）。某些频道对房间/频道使用不同的嵌套（例如 Discord `guilds.*.channels.*`，Slack `channels.*`，Microsoft Teams `teams.*.channels.*`）。
</Note>

## 群组白名单

当配置了 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，键充当群组白名单。使用 `"*"` 允许所有群组，同时仍设置默认提及行为。

<Warning>
常见混淆：私信配对批准与群组授权不同。对于支持私信配对的频道，配对存储只解锁私信。群组命令仍然需要来自配置白名单（如 `groupAllowFrom` 或该频道文档化的配置回退）的明确群组发送者授权。
</Warning>

常见意图（复制/粘贴）：

<Tabs>
  <Tab title="禁用所有群组回复">
    ```json5
    {
      channels: { whatsapp: { groupPolicy: "disabled" } },
    }
    ```
  </Tab>
  <Tab title="只允许特定群组（WhatsApp）">
    ```json5
    {
      channels: {
        whatsapp: {
          groups: {
            "123@g.us": { requireMention: true },
            "456@g.us": { requireMention: false },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="允许所有群组但需要提及">
    ```json5
    {
      channels: {
        whatsapp: {
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```
  </Tab>
  <Tab title="所有者专属触发（WhatsApp）">
    ```json5
    {
      channels: {
        whatsapp: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15551234567"],
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```
  </Tab>
</Tabs>

## 激活（仅限所有者）

群组所有者可以切换每个群组的激活：

- `/activation mention`
- `/activation always`

所有者由 `channels.whatsapp.allowFrom` 确定（未设置时为机器人的自身 E.164）。将命令作为独立消息发送。其他平台目前忽略 `/activation`。

## 上下文字段

群组入站有效负载设置：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及门控结果）
- Telegram 论坛话题还包括 `MessageThreadId` 和 `IsForum`。

频道特定说明：

- BlueBubbles 可以在正常群组门控通过后，可选择从本地联系人数据库丰富未命名的 macOS 群组参与者，然后填充 `GroupMembers`。默认关闭。

智能体系统提示在新群组会话的第一个轮次中包含群组介绍。它提醒模型像人类一样回应，避免 Markdown 表格，最小化空行并遵循正常的聊天间距，避免输入字面 `\n` 序列。频道来源的群组名称和参与者标签渲染为围栏的不受信任元数据，而不是内联系统指令。

## iMessage 特定说明

- 路由或白名单时优先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群组回复始终返回同一 `chat_id`。

## WhatsApp 系统提示

请参阅 [WhatsApp](/channels/whatsapp#system-prompts) 了解规范的 WhatsApp 系统提示规则，包括群组和直接提示解析、通配符行为和账户覆盖语义。

## WhatsApp 特定说明

请参阅[群组消息](/channels/group-messages)了解 WhatsApp 专有行为（历史注入、提及处理详情）。

## 相关文档

- [广播组](/channels/broadcast-groups)
- [频道路由](/channels/channel-routing)
- [群组消息](/channels/group-messages)
- [配对](/channels/pairing)
