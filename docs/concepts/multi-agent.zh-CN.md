---
summary: "多 agent 路由：隔离 agent、渠道账户与绑定"
title: "多 agent 路由"
sidebarTitle: "多 agent 路由"
read_when: "需要在一个 gateway 进程中运行多个隔离 agent（工作空间 + 认证）时。"
status: active
---

在一个运行中的 Gateway 里运行多个*隔离* agent —— 每个 agent 拥有自己的工作空间、状态目录（`agentDir`）和会话历史 —— 以及多个渠道账户（例如两个 WhatsApp）。入站消息通过绑定（bindings）路由到正确的 agent。

**agent** 是完整的每人格作用域：工作空间文件、认证配置、模型注册表和会话存储。`agentDir` 是磁盘上保存每个 agent 配置的状态目录，路径为 `~/.openclaw/agents/<agentId>/`。**绑定**将一个渠道账户（例如 Slack 工作区或 WhatsApp 号码）映射到其中一个 agent。

## 什么是"一个 agent"？

一个 **agent** 是一个完全独立的大脑，拥有：

- **工作空间**（文件、AGENTS.md/SOUL.md/USER.md、本地笔记、人格规则）。
- **状态目录**（`agentDir`），用于认证配置、模型注册表和每个 agent 的配置。
- **会话存储**（聊天历史 + 路由状态），位于 `~/.openclaw/agents/<agentId>/sessions`。

认证配置是**每 agent 独立**的。每个 agent 从自己的路径读取：

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

<Note>
这里 `sessions_history` 也是更安全的跨会话回溯路径：它返回有边界的、经过清洗的视图，而非原始记录转储。助手回溯会剥离思考标签、`<relevant-memories>` 脚手架、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和被截断的工具调用块）、降级的工具调用脚手架、泄露的 ASCII/全角模型控制 token，以及格式错误的 MiniMax 工具调用 XML，然后再进行编辑/截断。
</Note>

<Warning>
永远不要在多个 agent 之间复用 `agentDir`（这会导致认证/会话冲突）。当没有本地配置时，agent 可以读取默认/主 agent 的认证配置作为回退，但 OpenClaw 不会将 OAuth 刷新 token 克隆到次级 agent 存储中。如果需要独立的 OAuth 账户，请从该 agent 登录；如果手动复制凭据，只复制可移植的静态 `api_key` 或 `token` 配置。
</Warning>

技能从每个 agent 工作空间及共享根目录（如 `~/.openclaw/skills`）加载，然后在配置了有效 agent 技能允许列表时进行过滤。使用 `agents.defaults.skills` 设置共享基线，使用 `agents.list[].skills` 进行每 agent 替换。详见 [技能：每 agent vs 共享](/tools/skills#per-agent-vs-shared-skills) 和 [技能：agent 技能允许列表](/tools/skills#agent-skill-allowlists)。

Gateway 可以只托管**一个 agent**（默认）或**多个 agent** 并行运行。

<Note>
**工作空间说明：** 每个 agent 的工作空间是**默认 cwd**，而非硬隔离的沙箱。相对路径在工作空间内解析，但绝对路径仍可访问主机上的其他位置，除非启用了沙箱。详见 [沙箱](/gateway/sandboxing)。
</Note>

## 路径（快速概览）

- 配置文件：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 状态目录：`~/.openclaw`（或 `OPENCLAW_STATE_DIR`）
- 工作空间：`~/.openclaw/workspace`（或 `~/.openclaw/workspace-<agentId>`）
- Agent 目录：`~/.openclaw/agents/<agentId>/agent`（或 `agents.list[].agentDir`）
- 会话：`~/.openclaw/agents/<agentId>/sessions`

### 单 agent 模式（默认）

如果不做任何配置，OpenClaw 运行单个 agent：

- `agentId` 默认为 **`main`**。
- 会话键格式为 `agent:main:<mainKey>`。
- 工作空间默认为 `~/.openclaw/workspace`（或在设置了 `OPENCLAW_PROFILE` 时为 `~/.openclaw/workspace-<profile>`）。
- 状态默认为 `~/.openclaw/agents/main/agent`。

## Agent 管理助手

使用 agent 向导添加新的隔离 agent：

```bash
openclaw agents add work
```

然后添加 `bindings`（或让向导完成）以路由入站消息。

验证方法：

```bash
openclaw agents list --bindings
```

## 快速开始

<Steps>
  <Step title="创建每个 agent 的工作空间">
    使用向导或手动创建工作空间：

    ```bash
    openclaw agents add coding
    openclaw agents add social
    ```

    每个 agent 都会得到自己的工作空间（包含 `SOUL.md`、`AGENTS.md` 和可选的 `USER.md`），以及专用的 `agentDir` 和位于 `~/.openclaw/agents/<agentId>` 下的会话存储。

  </Step>
  <Step title="创建渠道账户">
    为每个 agent 在首选渠道上创建一个账户：

    - Discord：每个 agent 一个 bot，启用 Message Content Intent，复制各自的 token。
    - Telegram：通过 BotFather 为每个 agent 创建一个 bot，复制各自的 token。
    - WhatsApp：为每个账户绑定一个手机号。

    ```bash
    openclaw channels login --channel whatsapp --account work
    ```

    渠道指南：[Discord](/channels/discord)、[Telegram](/channels/telegram)、[WhatsApp](/channels/whatsapp)。

  </Step>
  <Step title="添加 agent、账户和绑定">
    在 `agents.list` 下添加 agent，在 `channels.<channel>.accounts` 下添加渠道账户，并用 `bindings` 将它们连接起来（示例见下文）。
  </Step>
  <Step title="重启并验证">
    ```bash
    openclaw gateway restart
    openclaw agents list --bindings
    openclaw channels status --probe
    ```
  </Step>
</Steps>

## 多 agent = 多人格，多身份

通过**多 agent**，每个 `agentId` 成为一个**完全隔离的人格**：

- **不同的手机号/账户**（每个渠道 `accountId` 独立）。
- **不同的个性**（每个 agent 的工作空间文件，如 `AGENTS.md` 和 `SOUL.md`）。
- **独立的认证 + 会话**（除非明确启用，否则互不干扰）。

这让**多个用户**可以共享一个 Gateway 服务器，同时保持各自 AI "大脑"和数据的隔离。

## 跨 agent 的 QMD 记忆搜索

如果一个 agent 需要搜索另一个 agent 的 QMD 会话记录，可在 `agents.list[].memorySearch.qmd.extraCollections` 下添加额外集合。只有当每个 agent 都需要继承相同的共享记录集合时，才使用 `agents.defaults.memorySearch.qmd.extraCollections`。

```json5
{
  agents: {
    defaults: {
      workspace: "~/workspaces/main",
      memorySearch: {
        qmd: {
          extraCollections: [{ path: "~/agents/family/sessions", name: "family-sessions" }],
        },
      },
    },
    list: [
      {
        id: "main",
        workspace: "~/workspaces/main",
        memorySearch: {
          qmd: {
            extraCollections: [{ path: "notes" }], // 解析到工作空间内 -> 集合名为 "notes-main"
          },
        },
      },
      { id: "family", workspace: "~/workspaces/family" },
    ],
  },
  memory: {
    backend: "qmd",
    qmd: { includeDefaultMemory: false },
  },
}
```

当路径在 agent 工作空间之外时，额外集合路径可以跨 agent 共享，但集合名称必须显式指定。工作空间内的路径保持 agent 作用域，确保每个 agent 拥有自己独立的记录搜索集合。

## 一个 WhatsApp 号码，多个用户（DM 分流）

你可以将**不同的 WhatsApp 私信**路由到不同 agent，同时只使用**一个 WhatsApp 账户**。通过 `peer.kind: "direct"` 和发送方 E.164（如 `+15551234567`）进行匹配。回复仍来自同一个 WhatsApp 号码（没有每 agent 的发送方身份）。

<Note>
私信会汇聚到 agent 的**主会话键**，因此真正的隔离需要**每人一个 agent**。
</Note>

示例：

```json5
{
  agents: {
    list: [
      { id: "alex", workspace: "~/.openclaw/workspace-alex" },
      { id: "mia", workspace: "~/.openclaw/workspace-mia" },
    ],
  },
  bindings: [
    {
      agentId: "alex",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230001" } },
    },
    {
      agentId: "mia",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230002" } },
    },
  ],
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551230001", "+15551230002"],
    },
  },
}
```

说明：

- DM 访问控制是**每个 WhatsApp 账户全局**的（配对/允许列表），而非每 agent。
- 对于共享群组，将群组绑定到一个 agent 或使用 [广播群组](/channels/broadcast-groups)。

## 路由规则（消息如何选择 agent）

绑定是**确定性的**，**最具体的规则优先**：

<Steps>
  <Step title="peer 匹配">
    精确的私信/群组/渠道 id。
  </Step>
  <Step title="parentPeer 匹配">
    线程继承。
  </Step>
  <Step title="guildId + roles">
    Discord 角色路由。
  </Step>
  <Step title="guildId">
    Discord。
  </Step>
  <Step title="teamId">
    Slack。
  </Step>
  <Step title="某渠道的 accountId 匹配">
    每账户回退。
  </Step>
  <Step title="渠道级匹配">
    `accountId: "*"`。
  </Step>
  <Step title="默认 agent">
    回退到 `agents.list[].default`，否则为列表第一个条目，默认值：`main`。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="平局处理与 AND 语义">
    - 如果多个绑定在同一层级匹配，配置顺序中的第一个优先。
    - 如果一个绑定设置了多个匹配字段（例如 `peer` + `guildId`），所有指定字段均为必须条件（`AND` 语义）。
  </Accordion>
  <Accordion title="账户作用域细节">
    - 省略 `accountId` 的绑定只匹配默认账户。
    - `accountId: "*"` 是渠道范围内所有账户的回退，比显式账户绑定的特异性低。
    - 如果后来为同一 agent 和同一绑定添加了带显式 accountId 的版本，OpenClaw 会将现有的渠道级绑定升级为账户作用域，而非重复添加。
  </Accordion>
</AccordionGroup>

## 多账户/手机号码

支持**多账户**的渠道（如 WhatsApp）使用 `accountId` 来标识每次登录。每个 `accountId` 可以路由到不同的 agent，因此一台服务器可以托管多个手机号码而不混淆会话。

如需在省略 `accountId` 时为渠道设置默认账户，可设置 `channels.<channel>.defaultAccount`（可选）。未设置时，如果存在 `default`，OpenClaw 会使用它；否则使用第一个已配置的账户 id（按字母顺序）。

支持此模式的常见渠道包括：

- `whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`
- `irc`、`line`、`googlechat`、`mattermost`、`matrix`、`nextcloud-talk`
- `bluebubbles`、`zalo`、`zalouser`、`nostr`、`feishu`

## 核心概念

- `agentId`：一个"大脑"（工作空间、每 agent 认证、每 agent 会话存储）。
- `accountId`：一个渠道账户实例（例如 WhatsApp 账户 `"personal"` vs `"biz"`）。
- `binding`：通过 `(channel, accountId, peer)` 以及可选的 guild/team id 将入站消息路由到 `agentId`。
- 私信汇聚到 `agent:<agentId>:<mainKey>`（每 agent 的"主"键；`session.mainKey`）。

## 平台示例

<AccordionGroup>
  <Accordion title="每个 agent 对应一个 Discord bot">
    每个 Discord bot 账户映射到唯一的 `accountId`。将每个账户绑定到一个 agent，并为每个 bot 保持独立的允许列表。

    ```json5
    {
      agents: {
        list: [
          { id: "main", workspace: "~/.openclaw/workspace-main" },
          { id: "coding", workspace: "~/.openclaw/workspace-coding" },
        ],
      },
      bindings: [
        { agentId: "main", match: { channel: "discord", accountId: "default" } },
        { agentId: "coding", match: { channel: "discord", accountId: "coding" } },
      ],
      channels: {
        discord: {
          groupPolicy: "allowlist",
          accounts: {
            default: {
              token: "DISCORD_BOT_TOKEN_MAIN",
              guilds: {
                "123456789012345678": {
                  channels: {
                    "222222222222222222": { allow: true, requireMention: false },
                  },
                },
              },
            },
            coding: {
              token: "DISCORD_BOT_TOKEN_CODING",
              guilds: {
                "123456789012345678": {
                  channels: {
                    "333333333333333333": { allow: true, requireMention: false },
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

    - 将每个 bot 邀请到 guild 并启用 Message Content Intent。
    - Token 存储在 `channels.discord.accounts.<id>.token`（默认账户可使用 `DISCORD_BOT_TOKEN`）。

  </Accordion>
  <Accordion title="每个 agent 对应一个 Telegram bot">
    ```json5
    {
      agents: {
        list: [
          { id: "main", workspace: "~/.openclaw/workspace-main" },
          { id: "alerts", workspace: "~/.openclaw/workspace-alerts" },
        ],
      },
      bindings: [
        { agentId: "main", match: { channel: "telegram", accountId: "default" } },
        { agentId: "alerts", match: { channel: "telegram", accountId: "alerts" } },
      ],
      channels: {
        telegram: {
          accounts: {
            default: {
              botToken: "123456:ABC...",
              dmPolicy: "pairing",
            },
            alerts: {
              botToken: "987654:XYZ...",
              dmPolicy: "allowlist",
              allowFrom: ["tg:123456789"],
            },
          },
        },
      },
    }
    ```

    - 通过 BotFather 为每个 agent 创建一个 bot，复制各自的 token。
    - Token 存储在 `channels.telegram.accounts.<id>.botToken`（默认账户可使用 `TELEGRAM_BOT_TOKEN`）。

  </Accordion>
  <Accordion title="每个 agent 对应不同 WhatsApp 号码">
    在启动 gateway 之前先登录每个账户：

    ```bash
    openclaw channels login --channel whatsapp --account personal
    openclaw channels login --channel whatsapp --account biz
    ```

    `~/.openclaw/openclaw.json`（JSON5）：

    ```js
    {
      agents: {
        list: [
          {
            id: "home",
            default: true,
            name: "Home",
            workspace: "~/.openclaw/workspace-home",
            agentDir: "~/.openclaw/agents/home/agent",
          },
          {
            id: "work",
            name: "Work",
            workspace: "~/.openclaw/workspace-work",
            agentDir: "~/.openclaw/agents/work/agent",
          },
        ],
      },

      // 确定性路由：第一个匹配的规则优先（最具体的规则放前面）。
      bindings: [
        { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
        { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },

        // 可选的每 peer 覆盖（示例：将特定群组发送到 work agent）。
        {
          agentId: "work",
          match: {
            channel: "whatsapp",
            accountId: "personal",
            peer: { kind: "group", id: "1203630...@g.us" },
          },
        },
      ],

      // 默认关闭：agent 间通信必须显式启用 + 加入允许列表。
      tools: {
        agentToAgent: {
          enabled: false,
          allow: ["home", "work"],
        },
      },

      channels: {
        whatsapp: {
          accounts: {
            personal: {
              // 可选覆盖。默认：~/.openclaw/credentials/whatsapp/personal
              // authDir: "~/.openclaw/credentials/whatsapp/personal",
            },
            biz: {
              // 可选覆盖。默认：~/.openclaw/credentials/whatsapp/biz
              // authDir: "~/.openclaw/credentials/whatsapp/biz",
            },
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## 常见模式

<Tabs>
  <Tab title="WhatsApp 日常 + Telegram 深度工作">
    按渠道分流：WhatsApp 路由到快速日常 agent，Telegram 路由到 Opus agent。

    ```json5
    {
      agents: {
        list: [
          {
            id: "chat",
            name: "Everyday",
            workspace: "~/.openclaw/workspace-chat",
            model: "anthropic/claude-sonnet-4-6",
          },
          {
            id: "opus",
            name: "Deep Work",
            workspace: "~/.openclaw/workspace-opus",
            model: "anthropic/claude-opus-4-6",
          },
        ],
      },
      bindings: [
        { agentId: "chat", match: { channel: "whatsapp" } },
        { agentId: "opus", match: { channel: "telegram" } },
      ],
    }
    ```

    说明：

    - 如果一个渠道有多个账户，在绑定中添加 `accountId`（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
    - 若要将特定的私信/群组路由到 Opus，同时其余保持在 chat 上，为该 peer 添加 `match.peer` 绑定；peer 匹配总是优先于渠道级规则。

  </Tab>
  <Tab title="同一渠道，单个 peer 路由到 Opus">
    WhatsApp 保持使用快速 agent，但将特定私信路由到 Opus：

    ```json5
    {
      agents: {
        list: [
          {
            id: "chat",
            name: "Everyday",
            workspace: "~/.openclaw/workspace-chat",
            model: "anthropic/claude-sonnet-4-6",
          },
          {
            id: "opus",
            name: "Deep Work",
            workspace: "~/.openclaw/workspace-opus",
            model: "anthropic/claude-opus-4-6",
          },
        ],
      },
      bindings: [
        {
          agentId: "opus",
          match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551234567" } },
        },
        { agentId: "chat", match: { channel: "whatsapp" } },
      ],
    }
    ```

    Peer 绑定总是优先，因此请将其放在渠道级规则之前。

  </Tab>
  <Tab title="家庭 agent 绑定到 WhatsApp 群组">
    将专用家庭 agent 绑定到单个 WhatsApp 群组，启用 @提及门控并设置更严格的工具策略：

    ```json5
    {
      agents: {
        list: [
          {
            id: "family",
            name: "Family",
            workspace: "~/.openclaw/workspace-family",
            identity: { name: "Family Bot" },
            groupChat: {
              mentionPatterns: ["@family", "@familybot", "@Family Bot"],
            },
            sandbox: {
              mode: "all",
              scope: "agent",
            },
            tools: {
              allow: [
                "exec",
                "read",
                "sessions_list",
                "sessions_history",
                "sessions_send",
                "sessions_spawn",
                "session_status",
              ],
              deny: ["write", "edit", "apply_patch", "browser", "canvas", "nodes", "cron"],
            },
          },
        ],
      },
      bindings: [
        {
          agentId: "family",
          match: {
            channel: "whatsapp",
            peer: { kind: "group", id: "120363999999999999@g.us" },
          },
        },
      ],
    }
    ```

    说明：

    - 工具允许/拒绝列表控制的是**工具**，而非技能。如果某个技能需要运行二进制程序，请确保 `exec` 在允许列表中，且该二进制程序存在于沙箱中。
    - 若需要更严格的门控，设置 `agents.list[].groupChat.mentionPatterns` 并为渠道启用群组允许列表。

  </Tab>
</Tabs>

## 每 agent 的沙箱与工具配置

每个 agent 可以有自己的沙箱和工具限制：

```js
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: {
          mode: "off",  // 个人 agent 无沙箱
        },
        // 无工具限制 - 所有工具可用
      },
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",     // 始终沙箱化
          scope: "agent",  // 每个 agent 一个容器
          docker: {
            // 容器创建后的可选一次性设置
            setupCommand: "apt-get update && apt-get install -y git curl",
          },
        },
        tools: {
          allow: ["read"],                    // 只允许 read 工具
          deny: ["exec", "write", "edit", "apply_patch"],    // 拒绝其他
        },
      },
    ],
  },
}
```

<Note>
`setupCommand` 位于 `sandbox.docker` 下，在容器创建时运行一次。当解析的作用域为 `"shared"` 时，每 agent 的 `sandbox.docker.*` 覆盖会被忽略。
</Note>

**优势：**

- **安全隔离**：为不受信任的 agent 限制工具。
- **资源控制**：沙箱化特定 agent，同时让其他 agent 运行在主机上。
- **灵活策略**：每个 agent 拥有不同的权限。

<Note>
`tools.elevated` 是**全局**的、基于发送方的；不可按 agent 配置。如果需要每 agent 的边界，使用 `agents.list[].tools` 来拒绝 `exec`。对于群组定向，使用 `agents.list[].groupChat.mentionPatterns` 使 @提及能清晰映射到目标 agent。
</Note>

详细示例见 [多 agent 沙箱与工具](/tools/multi-agent-sandbox-tools)。

## 相关文档

- [ACP agents](/tools/acp-agents) —— 运行外部编码工具链
- [渠道路由](/channels/channel-routing) —— 消息如何路由到 agent
- [在线状态](/concepts/presence) —— agent 在线状态与可用性
- [会话](/concepts/session) —— 会话隔离与路由
- [子 agent](/tools/subagents) —— 生成后台 agent 运行
