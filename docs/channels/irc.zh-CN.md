---
summary: "IRC 插件设置、访问控制和故障排查"
title: IRC
read_when:
  - 您想将 OpenClaw 连接到 IRC 频道或私信
  - 您正在配置 IRC 白名单、群组策略或提及门控
---

当您想在经典频道（`#room`）和私信中使用 OpenClaw 时，请使用 IRC。
IRC 作为捆绑插件提供，但在主配置的 `channels.irc` 下配置。

## 快速开始

1. 在 `~/.openclaw/openclaw.json` 中启用 IRC 配置。
2. 至少设置：

```json5
{
  channels: {
    irc: {
      enabled: true,
      host: "irc.example.com",
      port: 6697,
      tls: true,
      nick: "openclaw-bot",
      channels: ["#openclaw"],
    },
  },
}
```

对于机器人协调，建议使用私有 IRC 服务器。如果您有意使用公共 IRC 网络，常见选择包括 Libera.Chat、OFTC 和 Snoonet。避免将可预测的公共频道用于机器人或群体后台通道流量。

3. 启动/重启网关：

```bash
openclaw gateway run
```

## 安全默认值

- IRC 在 OpenClaw 操作员管理的转发代理路由之外使用原始 TCP/TLS 套接字。在需要所有出站流量通过该转发代理的部署中，除非明确批准直接 IRC 出站，否则设置 `channels.irc.enabled=false`。
- `channels.irc.dmPolicy` 默认为 `"pairing"`。
- `channels.irc.groupPolicy` 默认为 `"allowlist"`。
- 使用 `groupPolicy="allowlist"` 时，设置 `channels.irc.groups` 以定义允许的频道。
- 使用 TLS（`channels.irc.tls=true`），除非您有意接受明文传输。

## 访问控制

IRC 频道有两个独立的"门"：

1. **频道访问**（`groupPolicy` + `groups`）：机器人是否接受来自频道的消息。
2. **发送者访问**（`groupAllowFrom`/每频道 `groups["#channel"].allowFrom`）：谁被允许在该频道内触发机器人。

配置键：

- 私信白名单（私信发送者访问）：`channels.irc.allowFrom`
- 群组发送者白名单（频道发送者访问）：`channels.irc.groupAllowFrom`
- 每频道控制（频道 + 发送者 + 提及规则）：`channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` 允许未配置的频道（**默认仍受提及门控**）

白名单条目应使用稳定的发送者身份（`nick!user@host`）。
裸 nick 匹配是可变的，仅在 `channels.irc.dangerouslyAllowNameMatching: true` 时启用。

### 常见陷阱：`allowFrom` 用于私信，而非频道

如果您看到如下日志：

- `irc: drop group sender alice!ident@host (policy=allowlist)`

……这意味着该发送者未被允许发送**群组/频道**消息。通过以下方式修复：

- 设置 `channels.irc.groupAllowFrom`（对所有频道全局），或
- 设置每频道发送者白名单：`channels.irc.groups["#channel"].allowFrom`

示例（允许 `#tuirc-dev` 中的任何人与机器人对话）：

```json5
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#tuirc-dev": { allowFrom: ["*"] },
      },
    },
  },
}
```

## 回复触发（提及）

即使频道被允许（通过 `groupPolicy` + `groups`）且发送者被允许，OpenClaw 在群组上下文中也默认使用**提及门控**。

这意味着您可能看到日志 `drop channel … (missing-mention)`，除非消息包含与机器人匹配的提及模式。

要让机器人在 IRC 频道中**无需提及即可回复**，请为该频道禁用提及门控：

```json5
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#tuirc-dev": {
          requireMention: false,
          allowFrom: ["*"],
        },
      },
    },
  },
}
```

或者允许**所有** IRC 频道（无每频道白名单）并且仍然不需要提及时回复：

```json5
{
  channels: {
    irc: {
      groupPolicy: "open",
      groups: {
        "*": { requireMention: false, allowFrom: ["*"] },
      },
    },
  },
}
```

## 安全说明（公共频道推荐）

如果您在公共频道中允许 `allowFrom: ["*"]`，任何人都可以提示机器人。
为降低风险，请限制该频道的工具。

### 频道中所有人使用相同工具

```json5
{
  channels: {
    irc: {
      groups: {
        "#tuirc-dev": {
          allowFrom: ["*"],
          tools: {
            deny: ["group:runtime", "group:fs", "gateway", "nodes", "cron", "browser"],
          },
        },
      },
    },
  },
}
```

### 每发送者使用不同工具（所有者获得更多权限）

使用 `toolsBySender` 对 `"*"` 应用更严格的策略，对您的 nick 应用更宽松的策略：

```json5
{
  channels: {
    irc: {
      groups: {
        "#tuirc-dev": {
          allowFrom: ["*"],
          toolsBySender: {
            "*": {
              deny: ["group:runtime", "group:fs", "gateway", "nodes", "cron", "browser"],
            },
            "id:eigen": {
              deny: ["gateway", "nodes", "cron"],
            },
          },
        },
      },
    },
  },
}
```

说明：

- `toolsBySender` 键应使用 `id:` 作为 IRC 发送者身份值：
  `id:eigen` 或 `id:eigen!~eigen@174.127.248.171` 以进行更强匹配。
- 旧版无前缀键仍然被接受，仅匹配为 `id:`。
- 第一个匹配的发送者策略获胜；`"*"` 是通配符回退。

有关群组访问与提及门控（以及它们如何交互）的更多信息，请参阅：[/channels/groups](/channels/groups)。

## NickServ

连接后向 NickServ 认证：

```json5
{
  channels: {
    irc: {
      nickserv: {
        enabled: true,
        service: "NickServ",
        password: "your-nickserv-password",
      },
    },
  },
}
```

连接时可选的一次性注册：

```json5
{
  channels: {
    irc: {
      nickserv: {
        register: true,
        registerEmail: "bot@example.com",
      },
    },
  },
}
```

注册 nick 后禁用 `register` 以避免重复的 REGISTER 尝试。

## 环境变量

默认账户支持：

- `IRC_HOST`
- `IRC_PORT`
- `IRC_TLS`
- `IRC_NICK`
- `IRC_USERNAME`
- `IRC_REALNAME`
- `IRC_PASSWORD`
- `IRC_CHANNELS`（逗号分隔）
- `IRC_NICKSERV_PASSWORD`
- `IRC_NICKSERV_REGISTER_EMAIL`

`IRC_HOST` 不能从工作区 `.env` 设置；请参阅[工作区 `.env` 文件](/gateway/security)。

## 故障排查

- 如果机器人连接但从不在频道中回复，请验证 `channels.irc.groups` **以及**提及门控是否正在删除消息（`missing-mention`）。如果您希望它无需 ping 即可回复，请为该频道设置 `requireMention:false`。
- 如果登录失败，请验证 nick 可用性和服务器密码。
- 如果 TLS 在自定义网络上失败，请验证主机/端口和证书设置。

## 相关文档

- [频道概述](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私信认证和配对流程
- [群组](/channels/groups) — 群组聊天行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和安全加固
