---
summary: "通过 NIP-04 加密消息的 Nostr 私信频道"
read_when:
  - 您想让 OpenClaw 通过 Nostr 接收私信
  - 您正在设置去中心化消息
title: "Nostr"
---

**状态：** 可选捆绑插件（默认禁用，直到配置为止）。

Nostr 是一个用于社交网络的去中心化协议。此频道使 OpenClaw 能够通过 NIP-04 接收和响应加密的私信（DM）。

## 捆绑插件

当前 OpenClaw 版本将 Nostr 作为捆绑插件提供，因此正常的打包版本不需要单独安装。

### 旧版/自定义安装

- 引导配置（`openclaw onboard`）和 `openclaw channels add` 仍然从共享频道目录中显示 Nostr。
- 如果您的版本不包含捆绑的 Nostr，请直接安装 npm 包。

```bash
openclaw plugins install @openclaw/nostr
```

使用裸包以跟随当前官方发布标签。仅在需要可重现安装时才固定确切版本。

使用本地检出（开发工作流）：

```bash
openclaw plugins install --link <path-to-local-nostr-plugin>
```

安装或启用插件后重启网关。

### 非交互式设置

```bash
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY" --relay-urls "wss://relay.damus.io,wss://relay.primal.net"
```

使用 `--use-env` 将 `NOSTR_PRIVATE_KEY` 保留在环境中，而不是将密钥存储在配置中。

## 快速设置

1. 生成 Nostr 密钥对（如果需要）：

```bash
# 使用 nak
nak key generate
```

2. 添加到配置：

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
    },
  },
}
```

3. 导出密钥：

```bash
export NOSTR_PRIVATE_KEY="nsec1..."
```

4. 重启网关。

## 配置参考

| 键           | 类型     | 默认值                                      | 描述                        |
| ------------ | -------- | ------------------------------------------- | --------------------------- |
| `privateKey` | 字符串   | 必填                                        | `nsec` 或十六进制格式的私钥 |
| `relays`     | 字符串[] | `['wss://relay.damus.io', 'wss://nos.lol']` | 中继 URL（WebSocket）       |
| `dmPolicy`   | 字符串   | `pairing`                                   | 私信访问策略                |
| `allowFrom`  | 字符串[] | `[]`                                        | 允许的发送者公钥            |
| `enabled`    | 布尔值   | `true`                                      | 启用/禁用频道               |
| `name`       | 字符串   | -                                           | 显示名称                    |
| `profile`    | 对象     | -                                           | NIP-01 个人资料元数据       |

## 个人资料元数据

个人资料数据作为 NIP-01 `kind:0` 事件发布。您可以从控制 UI（频道 -> Nostr -> 个人资料）管理它，或直接在配置中设置它。

示例：

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      profile: {
        name: "openclaw",
        displayName: "OpenClaw",
        about: "Personal assistant DM bot",
        picture: "https://example.com/avatar.png",
        banner: "https://example.com/banner.png",
        website: "https://example.com",
        nip05: "openclaw@example.com",
        lud16: "openclaw@example.com",
      },
    },
  },
}
```

说明：

- 个人资料 URL 必须使用 `https://`。
- 从中继导入会合并字段并保留本地覆盖。

## 访问控制

### 私信策略

- **pairing**（默认）：未知发送者获得配对码。
- **allowlist**：只有 `allowFrom` 中的公钥可以发送私信。
- **open**：公开入站私信（需要 `allowFrom: ["*"]`）。
- **disabled**：忽略入站私信。

执行说明：

- 入站事件签名在发送者策略和 NIP-04 解密之前验证，因此伪造的事件会被提前拒绝。
- 配对回复在不处理原始私信正文的情况下发送。
- 入站私信受速率限制，超大有效负载在解密之前被丢弃。

### 白名单示例

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      dmPolicy: "allowlist",
      allowFrom: ["npub1abc...", "npub1xyz..."],
    },
  },
}
```

## 密钥格式

接受的格式：

- **私钥：** `nsec...` 或 64 字符十六进制
- **公钥（`allowFrom`）：** `npub...` 或十六进制

## 中继

默认：`relay.damus.io` 和 `nos.lol`。

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      relays: ["wss://relay.damus.io", "wss://relay.primal.net", "wss://nostr.wine"],
    },
  },
}
```

提示：

- 使用 2-3 个中继以实现冗余。
- 避免太多中继（延迟、重复）。
- 付费中继可以提高可靠性。
- 本地中继适合测试（`ws://localhost:7777`）。

## 协议支持

| NIP    | 状态   | 描述                          |
| ------ | ------ | ----------------------------- |
| NIP-01 | 已支持 | 基本事件格式 + 个人资料元数据 |
| NIP-04 | 已支持 | 加密私信（`kind:4`）          |
| NIP-17 | 计划中 | 礼品包装私信                  |
| NIP-44 | 计划中 | 版本化加密                    |

## 测试

### 本地中继

```bash
# 启动 strfry
docker run -p 7777:7777 ghcr.io/hoytech/strfry
```

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      relays: ["ws://localhost:7777"],
    },
  },
}
```

### 手动测试

1. 从日志中记录机器人公钥（npub）。
2. 打开 Nostr 客户端（Damus、Amethyst 等）。
3. 向机器人公钥发送私信。
4. 验证响应。

## 故障排查

### 未收到消息

- 验证私钥是否有效。
- 确保中继 URL 可访问，并使用 `wss://`（或本地使用 `ws://`）。
- 确认 `enabled` 不是 `false`。
- 检查网关日志中的中继连接错误。

### 未发送响应

- 检查中继是否接受写入。
- 验证出站连接。
- 注意中继速率限制。

### 重复响应

- 使用多个中继时预期会出现。
- 消息通过事件 ID 去重；只有第一次交付触发响应。

## 安全性

- 永远不要提交私钥。
- 使用环境变量存储密钥。
- 对于生产机器人，考虑使用 `allowlist`。
- 签名在发送者策略之前验证，发送者策略在解密之前执行，因此伪造的事件会被提前拒绝，未知发送者无法强制进行完整的加密工作。

## 限制（MVP）

- 仅限私信（没有群聊）。
- 无媒体附件。
- 仅 NIP-04（计划支持 NIP-17 礼品包装）。

## 相关文档

- [频道概述](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私信认证和配对流程
- [群组](/channels/groups) — 群组聊天行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和安全加固
