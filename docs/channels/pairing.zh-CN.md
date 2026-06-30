---
summary: "配对概述：批准谁可以给您发私信 + 哪些节点可以加入"
read_when:
  - 设置私信访问控制
  - 配对新的 iOS/Android 节点
  - 审查 OpenClaw 安全状况
title: "配对"
---

"配对"是 OpenClaw 的明确访问批准步骤。
它用于两个地方：

1. **私信配对**（谁被允许与机器人对话）
2. **节点配对**（哪些设备/节点被允许加入网关网络）

安全上下文：[安全性](/gateway/security)

## 1) 私信配对（入站聊天访问）

当频道配置了私信策略 `pairing` 时，未知发送者会收到一个短码，他们的消息在您批准之前**不会被处理**。

默认私信策略记录在：[安全性](/gateway/security)

`dmPolicy: "open"` 仅在有效私信白名单包含 `"*"` 时才是公开的。设置和验证要求公开配置使用该通配符。如果现有状态包含带有具体 `allowFrom` 条目的 `open`，运行时仍然只接受这些发送者，配对存储批准不会扩大 `open` 访问权限。

配对码：

- 8 个字符，大写，无模糊字符（`0O1I`）。
- **1 小时后过期**。机器人仅在创建新请求时发送配对消息（每个发送者大约每小时一次）。
- 待处理的私信配对请求默认上限为每个频道 **3 个**；额外的请求将被忽略，直到一个过期或被批准。

### 批准发送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

如果尚未配置命令所有者，批准私信配对码也会将 `commands.ownerAllowFrom` 引导到已批准的发送者，例如 `telegram:123456789`。这为首次设置提供了用于特权命令和执行批准提示的明确所有者。在所有者存在之后，后续的配对批准只授予私信访问权限；它们不会添加更多所有者。

支持的频道：`bluebubbles`、`discord`、`feishu`、`googlechat`、`imessage`、`irc`、`line`、`matrix`、`mattermost`、`msteams`、`nextcloud-talk`、`nostr`、`openclaw-weixin`、`signal`、`slack`、`synology-chat`、`telegram`、`twitch`、`whatsapp`、`zalo`、`zalouser`。

### 可重用发送者组

当同一受信任发送者集应适用于多个消息频道，或同时适用于私信和群组白名单时，请使用顶级 `accessGroups`。

静态组使用 `type: "message.senders"`，并从频道白名单中使用 `accessGroup:<name>` 引用：

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
        whatsapp: ["+15551234567"],
      },
    },
  },
  channels: {
    telegram: { dmPolicy: "allowlist", allowFrom: ["accessGroup:operators"] },
    whatsapp: { groupPolicy: "allowlist", groupAllowFrom: ["accessGroup:operators"] },
  },
}
```

访问组在此详细记录：[访问组](/channels/access-groups)

### 状态存储位置

存储在 `~/.openclaw/credentials/` 下：

- 待处理请求：`<channel>-pairing.json`
- 已批准白名单存储：
  - 默认账户：`<channel>-allowFrom.json`
  - 非默认账户：`<channel>-<accountId>-allowFrom.json`

账户范围行为：

- 非默认账户只读写其范围的白名单文件。
- 默认账户使用频道范围的无范围白名单文件。

将这些视为敏感信息（它们控制对您的助手的访问）。

<Note>
配对白名单存储用于私信访问。群组授权是分开的。批准私信配对码不会自动允许该发送者在群组中运行命令或控制机器人。首次所有者引导是 `commands.ownerAllowFrom` 中独立的配置状态，群组聊天交付仍然遵循频道的群组白名单（例如 `groupAllowFrom`、`groups` 或每个群组或每个话题的覆盖，取决于频道）。
</Note>

## 2) 节点设备配对（iOS/Android/macOS/无头节点）

节点以 `role: node` 的**设备**身份连接到网关。网关创建一个设备配对请求，必须获得批准。

### 通过 Telegram 配对（推荐用于 iOS）

如果您使用 `device-pair` 插件，您可以完全从 Telegram 进行首次设备配对：

1. 在 Telegram 中，向您的机器人发送消息：`/pair`
2. 机器人回复两条消息：一条指令消息和一条单独的**设置码**消息（在 Telegram 中易于复制/粘贴）。
3. 在您的手机上，打开 OpenClaw iOS 应用 → 设置 → 网关。
4. 扫描 QR 码或粘贴设置码并连接。
5. 回到 Telegram：`/pair pending`（审查请求 ID、角色和范围），然后批准。

设置码是一个 base64 编码的 JSON 有效负载，包含：

- `url`：网关 WebSocket URL（`ws://...` 或 `wss://...`）
- `bootstrapToken`：用于初始配对握手的短期单设备引导令牌

该引导令牌携带内置的配对引导配置文件：

- 主要的移交 `node` 令牌保持 `scopes: []`
- 任何移交的 `operator` 令牌都限制在引导白名单：
  `operator.approvals`、`operator.read`、`operator.talk.secrets`、`operator.write`
- 引导范围检查是角色前缀的，不是一个平面范围池：
  操作员范围条目只满足操作员请求，非操作员角色
  必须仍然在自己的角色前缀下请求范围
- 后续令牌轮换/撤销仍然受设备批准的角色合同和调用者会话的操作员范围的约束

将设置码视为有效时的密码。

对于 Tailscale、公共或其他非回环移动配对，请使用 Tailscale Serve/Funnel 或另一个 `wss://` 网关 URL。在 QR/设置码发放之前，直接非回环 `ws://` 设置 URL 被拒绝。明文 `ws://` 设置码限于回环 URL；私有网络 `ws://` 客户端仍然需要远程网关指南中描述的明确 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 紧急措施。

### 批准节点设备

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

当明确的批准因批准的配对设备会话以仅配对范围打开而被拒绝时，CLI 使用 `operator.admin` 重试相同的请求。这让现有的具有管理员功能的已配对设备可以恢复新的控制 UI/浏览器配对，而无需手动编辑 `devices/paired.json`。网关仍然验证重试的连接；无法用 `operator.admin` 认证的令牌仍然被阻止。

如果同一设备使用不同的认证详细信息重试（例如不同的角色/范围/公钥），之前的待处理请求将被取代，并创建新的 `requestId`。

<Note>
已配对的设备不会静默地获得更广泛的访问权限。如果它重新连接并请求更多范围或更广泛的角色，OpenClaw 保持现有的批准不变，并创建新的待处理升级请求。在批准之前，使用 `openclaw devices list` 比较当前批准的访问权限与新请求的访问权限。
</Note>

### 可选的受信任 CIDR 节点自动批准

设备配对默认保持手动。对于严格控制的节点网络，您可以通过明确的 CIDR 或确切 IP 选择首次节点自动批准：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

这仅适用于没有请求范围的全新 `role: node` 配对请求。操作员、浏览器、控制 UI 和 WebChat 客户端仍然需要手动批准。角色、范围、元数据和公钥更改仍然需要手动批准。

### 节点配对状态存储

存储在 `~/.openclaw/devices/` 下：

- `pending.json`（短暂的；待处理请求过期）
- `paired.json`（已配对的设备 + 令牌）

### 说明

- 旧版 `node.pair.*` API（CLI：`openclaw nodes pending|approve|reject|remove|rename`）是一个独立的网关拥有的配对存储。WS 节点仍然需要设备配对。
- 配对记录是已批准角色的持久真实来源。活动的设备令牌限定在该批准的角色集；批准的角色之外的游离令牌条目不会创建新的访问权限。

## 相关文档

- 安全模型 + 提示注入：[安全性](/gateway/security)
- 安全更新（运行 doctor）：[更新](/install/updating)
- 频道配置：
  - Telegram：[Telegram](/channels/telegram)
  - WhatsApp：[WhatsApp](/channels/whatsapp)
  - Signal：[Signal](/channels/signal)
  - BlueBubbles (iMessage)：[BlueBubbles](/channels/bluebubbles)
  - iMessage（旧版）：[iMessage](/channels/imessage)
  - Discord：[Discord](/channels/discord)
  - Slack：[Slack](/channels/slack)
