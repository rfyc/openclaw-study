---
summary: "各频道的路由规则（WhatsApp、Telegram、Discord、Slack）及共享上下文"
read_when:
  - 更改频道路由或收件箱行为
title: "频道路由"
---

# 频道与路由

OpenClaw 将回复**路由回消息来源的频道**。模型不选择频道；路由是确定性的，由主机配置控制。

## 关键术语

- **频道**：`telegram`、`whatsapp`、`discord`、`irc`、`googlechat`、`slack`、`signal`、`imessage`、`line`，以及插件频道。`webchat` 是内部 WebChat UI 频道，不是可配置的出站频道。
- **AccountId**：每个频道的账户实例（支持时）。
- 可选的频道默认账户：`channels.<channel>.defaultAccount` 选择当出站路径未指定 `accountId` 时使用哪个账户。
  - 在多账户设置中，当配置了两个或多个账户时，设置明确的默认值（`defaultAccount` 或 `accounts.default`）。没有它，回退路由可能会选择第一个规范化的账户 ID。
- **AgentId**：隔离的工作区 + 会话存储（"大脑"）。
- **SessionKey**：用于存储上下文和控制并发的桶键。

## 出站目标前缀

明确的出站目标可以包含提供商前缀，例如 `telegram:123` 或 `tg:123`。仅当所选频道为 `last` 或其他未解析时，核心才将该前缀视为频道选择提示，并且仅当加载的插件宣传该前缀时。如果调用者已经选择了明确的频道，提供商前缀必须与该频道匹配；像 WhatsApp 交付到 `telegram:123` 这样的跨频道组合在插件特定的目标规范化之前就会失败。

目标类型和服务前缀（如 `channel:<id>`、`user:<id>`、`room:<id>`、`thread:<id>`、`imessage:<handle>` 和 `sms:<number>`）保留在所选频道的语法中。它们本身不选择提供商。

## 会话键形状（示例）

默认情况下，私信折叠到智能体的**主**会话：

- `agent:<agentId>:<mainKey>`（默认：`agent:main:main`）

即使私信对话历史与主会话共享，沙盒和工具策略也会为外部私信使用派生的每账户直接聊天运行时键，以便频道发起的消息不被视为本地主会话运行。

群组和频道按频道保持隔离：

- 群组：`agent:<agentId>:<channel>:group:<id>`
- 频道/房间：`agent:<agentId>:<channel>:channel:<id>`

线程：

- Slack/Discord 线程在基键后附加 `:thread:<threadId>`。
- Telegram 论坛话题在群组键中嵌入 `:topic:<topicId>`。

示例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 主私信路由固定

当 `session.dmScope` 为 `main` 时，私信可以共享一个主会话。为了防止会话的 `lastRoute` 被非所有者私信覆盖，当以下所有条件都成立时，OpenClaw 从 `allowFrom` 推断固定所有者：

- `allowFrom` 只有一个非通配符条目。
- 该条目可以规范化为该频道的具体发送者 ID。
- 入站私信发送者与该固定所有者不匹配。

在该不匹配情况下，OpenClaw 仍然记录入站会话元数据，但跳过更新主会话 `lastRoute`。

## 守护的入站记录

频道插件可以将入站会话记录标记为 `createIfMissing: false`，当守护路径不得创建新的 OpenClaw 会话时。在该模式下，OpenClaw 可以为现有会话更新元数据和 `lastRoute`，但不会仅仅因为观察到消息就创建仅路由的会话条目。

## 路由规则（如何选择智能体）

路由为每条入站消息选择**一个智能体**：

1. **精确对等匹配**（带 `peer.kind` + `peer.id` 的 `bindings`）。
2. **父对等匹配**（线程继承）。
3. **服务器 + 角色匹配**（Discord）通过 `guildId` + `roles`。
4. **服务器匹配**（Discord）通过 `guildId`。
5. **团队匹配**（Slack）通过 `teamId`。
6. **账户匹配**（频道上的 `accountId`）。
7. **频道匹配**（该频道上的任何账户，`accountId: "*"`）。
8. **默认智能体**（`agents.list[].default`，否则为第一个列表条目，回退到 `main`）。

当绑定包含多个匹配字段（`peer`、`guildId`、`teamId`、`roles`）时，**必须所有提供的字段都匹配**，该绑定才会应用。

匹配的智能体决定使用哪个工作区和会话存储。

## 广播组（运行多个智能体）

广播组允许在 OpenClaw **正常情况下会回复时**（例如：在 WhatsApp 群组中，在提及/激活门控之后）为同一对等方运行**多个智能体**。

配置：

```json5
{
  broadcast: {
    strategy: "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"],
    "+15555550123": ["support", "logger"],
  },
}
```

请参阅：[广播组](/channels/broadcast-groups)。

## 配置概述

- `agents.list`：命名的智能体定义（工作区、模型等）。
- `bindings`：将入站频道/账户/对等方映射到智能体。

示例：

```json5
{
  agents: {
    list: [{ id: "support", name: "Support", workspace: "~/.openclaw/workspace-support" }],
  },
  bindings: [
    { match: { channel: "slack", teamId: "T123" }, agentId: "support" },
    { match: { channel: "telegram", peer: { kind: "group", id: "-100123" } }, agentId: "support" },
  ],
}
```

## 会话存储

会话存储位于状态目录下（默认 `~/.openclaw`）：

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL 转录本与存储并排

您可以通过 `session.store` 和 `{agentId}` 模板覆盖存储路径。

网关和 ACP 会话发现也扫描默认 `agents/` 根目录下和模板化 `session.store` 根目录下的磁盘支持的智能体存储。发现的存储必须保持在解析的智能体根目录内，并使用常规的 `sessions.json` 文件。符号链接和根目录外的路径被忽略。

## WebChat 行为

WebChat 附加到**所选智能体**，默认为智能体的主会话。因此，WebChat 让您可以在一个地方看到该智能体的跨频道上下文。

## 回复上下文

入站回复包括：

- 可用时的 `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`。
- 引用上下文以 `[Replying to ...]` 块的形式附加到 `Body`。

这在各频道间是一致的。

## 相关文档

- [群组](/channels/groups)
- [广播组](/channels/broadcast-groups)
- [配对](/channels/pairing)
