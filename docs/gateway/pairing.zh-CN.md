---
summary: "iOS 和其他远程节点的网关拥有节点配对（选项 B）"
read_when:
  - 在没有 macOS UI 的情况下实现节点配对审批
  - 为批准远程节点添加 CLI 流程
  - 使用节点管理扩展网关协议
title: "网关拥有配对"
---

在网关拥有配对中，**网关**是哪些节点被允许加入的真实来源。UI（macOS 应用、未来的客户端）只是批准或拒绝待处理请求的前端。

**重要提示**：WS 节点在 `connect` 期间使用**设备配对**（角色 `node`）。`node.pair.*` 是独立的配对存储，**不**控制 WS 握手。只有明确调用 `node.pair.*` 的客户端使用此流程。

## 概念

- **待处理请求**：节点请求加入；需要审批。
- **已配对节点**：具有颁发的认证令牌的已批准节点。
- **传输**：网关 WS 端点转发请求，但不决定成员资格。（旧版 TCP bridge 支持已被移除。）

## 配对工作原理

1. 节点连接到网关 WS 并请求配对。
2. 网关存储**待处理请求**并发出 `node.pair.requested`。
3. 你批准或拒绝请求（CLI 或 UI）。
4. 批准后，网关颁发**新令牌**（令牌在重新配对时轮换）。
5. 节点使用令牌重新连接，现在处于"已配对"状态。

待处理请求在 **5 分钟**后自动过期。

## CLI 工作流（无头友好）

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` 显示已配对/已连接的节点及其能力。

## API 接口（网关协议）

事件：

- `node.pair.requested` — 创建新待处理请求时发出。
- `node.pair.resolved` — 请求被批准/拒绝/过期时发出。

方法：

- `node.pair.request` — 创建或重用待处理请求。
- `node.pair.list` — 列出待处理 + 已配对节点（`operator.pairing`）。
- `node.pair.approve` — 批准待处理请求（颁发令牌）。
- `node.pair.reject` — 拒绝待处理请求。
- `node.pair.remove` — 移除过时的已配对节点条目。
- `node.pair.verify` — 验证 `{ nodeId, token }`。

注意事项：

- `node.pair.request` 对每个节点是幂等的：重复调用返回相同的待处理请求。
- 对同一待处理节点的重复请求还会刷新存储的节点元数据和最新的白名单声明命令快照以供操作员可见性使用。
- 批准**始终**生成新鲜令牌；`node.pair.request` 永远不返回令牌。
- 操作员范围级别和审批时检查在[操作员范围](/gateway/operator-scopes)中汇总。
- 请求可以包含 `silent: true` 作为自动审批流程的提示。
- `node.pair.approve` 使用待处理请求的声明命令来强制执行额外的审批范围：
  - 无命令请求：`operator.pairing`
  - 非 exec 命令请求：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which` 请求：`operator.pairing` + `operator.admin`

<Warning>
节点配对是信任和身份流程以及令牌颁发。它**不**固定每个节点的实时节点命令接口。

- 实时节点命令来自节点在连接时声明的内容，在网关的全局节点命令策略（`gateway.nodes.allowCommands` 和 `denyCommands`）应用之后。
- 每节点 `system.run` 允许和询问策略存在于节点上的 `exec.approvals.node.*` 中，而不在配对记录中。

</Warning>

## 节点命令控制（2026.3.31+）

<Warning>
**重大更改**：从 `2026.3.31` 开始，节点命令在节点配对被批准之前被禁用。仅设备配对不再足以暴露声明的节点命令。
</Warning>

当节点首次连接时，自动请求配对。在配对请求被批准之前，来自该节点的所有待处理节点命令都被过滤，不会执行。一旦通过配对审批建立信任，节点的声明命令在正常命令策略下变得可用。

这意味着：

- 之前仅依靠设备配对来暴露命令的节点现在必须完成节点配对。
- 在配对审批之前排队的命令被丢弃，而不是延迟执行。

## 节点事件信任边界（2026.3.31+）

<Warning>
**重大更改**：节点发起的运行现在保持在缩减的受信任接口上。
</Warning>

节点发起的摘要和相关会话事件被限制在预期的受信任接口。之前依赖更广泛的主机或会话工具访问的通知驱动或节点触发流程可能需要调整。这种加固确保节点事件不能超越节点信任边界允许的范围升级为主机级工具访问。

持久节点存在更新遵循相同的身份边界。`node.presence.alive` 事件仅从经过认证的节点设备会话接受，并且仅在设备/节点身份已经配对时更新配对元数据。自声明的 `client.id` 值不足以写入最后见到状态。

## 自动审批（macOS 应用）

当以下情况时，macOS 应用可以选择性地尝试**静默审批**：

- 请求标记为 `silent`，且
- 应用可以使用相同用户验证到网关主机的 SSH 连接。

如果静默审批失败，它回退到正常的"批准/拒绝"提示。

## 受信任 CIDR 设备自动审批

`role: node` 的 WS 设备配对默认保持手动。对于网关已经信任网络路径的私有节点网络，操作员可以通过明确的 CIDR 或精确 IP 选择加入：

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

安全边界：

- 当 `gateway.nodes.pairing.autoApproveCidrs` 未设置时禁用。
- 不存在全局 LAN 或私有网络自动审批模式。
- 只有没有请求范围的新鲜 `role: node` 设备配对才符合资格。
- 操作员、浏览器、Control UI 和 WebChat 客户端保持手动。
- 角色、范围、元数据和公钥升级保持手动。
- 同主机环回受信任代理标头路径不符合资格，因为该路径可能被本地调用者欺骗。

## 元数据升级自动审批

当已配对设备仅使用非敏感元数据更改重新连接时（例如，显示名称或客户端平台提示），OpenClaw 将其视为 `metadata-upgrade`。静默自动审批是窄范围的：它仅适用于已经证明了本地或共享凭据的受信任非浏览器本地重新连接，包括操作系统版本元数据更改后的同主机原生应用重新连接。浏览器/Control UI 客户端和远程客户端仍然使用明确的重新审批流程。范围升级（从读取到写入/管理员）和公钥更改**不**符合元数据升级自动审批资格 — 它们保持为明确的重新审批请求。

## QR 配对辅助工具

`/pair qr` 将配对有效载荷渲染为结构化媒体，以便移动和浏览器客户端可以直接扫描。

删除设备还会清除该设备 id 的任何过时待处理配对请求，因此撤销后 `nodes pending` 不显示孤立行。

## 局部性和转发标头

网关配对仅在原始套接字和任何上游代理证据都同意时才将连接视为环回。如果请求到达环回但携带指向非本地来源的 `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` 标头，该转发标头证据使环回局部性声明失效。配对路径然后需要明确审批，而不是悄悄将请求视为同主机连接。有关操作员认证的等效规则，参见[受信任代理认证](/gateway/trusted-proxy-auth)。

## 存储（本地，私有）

配对状态存储在网关状态目录下（默认 `~/.openclaw`）：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

如果你覆盖 `OPENCLAW_STATE_DIR`，`nodes/` 文件夹随之移动。

安全注意事项：

- 令牌是密钥；将 `paired.json` 视为敏感信息。
- 轮换令牌需要重新审批（或删除节点条目）。

## 传输行为

- 传输是**无状态**的；它不存储成员资格。
- 如果网关处于离线状态或配对被禁用，节点无法配对。
- 如果网关处于远程模式，配对仍然针对远程网关的存储发生。

## 相关链接

- [渠道配对](/channels/pairing)
- [节点](/nodes)
- [设备 CLI](/cli/devices)
