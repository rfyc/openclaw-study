---
summary: "iOS 节点应用：连接到 Gateway、配对、画布和故障排除"
read_when:
  - 配对或重新连接 iOS 节点
  - 从源代码运行 iOS 应用
  - 调试网关发现或画布命令
title: "iOS 应用"
---

可用性：内部预览版。iOS 应用尚未公开分发。

## 功能

- 通过 WebSocket（LAN 或尾网）连接到 Gateway。
- 暴露节点功能：画布、屏幕快照、摄像头拍摄、位置、Talk 模式、语音唤醒。
- 接收 `node.invoke` 命令并报告节点状态事件。

## 要求

- 在另一台设备上运行的 Gateway（macOS、Linux 或通过 WSL2 的 Windows）。
- 网络路径：
  - 通过 Bonjour 的同一 LAN，**或**
  - 通过单播 DNS-SD 的尾网（示例域：`openclaw.internal.`），**或**
  - 手动主机/端口（回退）。

## 快速开始（配对 + 连接）

1. 启动 Gateway：

```bash
openclaw gateway --port 18789
```

2. 在 iOS 应用中，打开设置并选择发现的网关（或启用手动主机并输入主机/端口）。

3. 在网关主机上批准配对请求：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

如果应用使用更改的认证详情（角色/范围/公钥）重试配对，
之前的待处理请求将被取代，并创建新的 `requestId`。
在批准之前再次运行 `openclaw devices list`。

可选：如果 iOS 节点始终从严格控制的子网连接，你
可以选择加入首次节点自动批准，使用显式 CIDR 或精确 IP：

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

这默认禁用。它仅适用于没有请求范围的全新 `role: node` 配对。运营商/浏览器配对以及任何角色、范围、元数据或
公钥更改仍需要手动批准。

4. 验证连接：

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## 官方构建的中继支持的推送

官方分发的 iOS 构建使用外部推送中继而不是将原始 APNs
令牌发布到网关。

网关端要求：

```json5
{
  gateway: {
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
        },
      },
    },
  },
}
```

流程工作原理：

- iOS 应用使用 App Attest 和 StoreKit 应用交易 JWS 向中继注册。
- 中继返回一个不透明的中继句柄和一个注册范围的发送授权。
- iOS 应用获取配对的网关身份并将其包含在中继注册中，因此中继支持的注册委托给该特定网关。
- 应用通过 `push.apns.register` 将中继支持的注册转发给配对的网关。
- 网关使用存储的中继句柄进行 `push.test`、后台唤醒和唤醒提示。
- 网关中继基础 URL 必须与官方/TestFlight iOS 构建中内置的中继 URL 匹配。
- 如果应用之后连接到不同的网关或具有不同中继基础 URL 的构建，它将刷新中继注册而不是重用旧绑定。

此路径网关**不需要**：

- 无需部署级别的中继令牌。
- 无需用于官方/TestFlight 中继支持发送的直接 APNs 密钥。

预期运营商流程：

1. 安装官方/TestFlight iOS 构建。
2. 在网关上设置 `gateway.push.apns.relay.baseUrl`。
3. 将应用配对到网关并让其完成连接。
4. 应用在拥有 APNs 令牌、运营商会话已连接且中继注册成功后自动发布 `push.apns.register`。
5. 之后，`push.test`、重新连接唤醒和唤醒提示可以使用存储的中继支持注册。

## 后台活跃信标

当 iOS 唤醒应用进行静默推送、后台刷新或重大位置事件时，应用
尝试短暂的节点重连，然后调用 `node.event`，`event: "node.presence.alive"`。
仅在认证的节点设备身份已知后，
网关才将其记录为配对节点/设备元数据上的 `lastSeenAtMs`/`lastSeenReason`。

只有当网关响应包含 `handled: true` 时，应用才将后台唤醒视为成功记录。旧版网关可能以 `{ "ok": true }` 确认 `node.event`；该响应兼容但不算作持久的最后见到更新。

兼容性说明：

- `OPENCLAW_APNS_RELAY_BASE_URL` 仍作为网关的临时环境覆盖有效。

## 认证与信任流程

中继的存在是为了强制执行直接 APNs 网关无法为
官方 iOS 构建提供的两个约束：

- 只有通过 Apple 分发的真正 OpenClaw iOS 构建才能使用托管中继。
- 网关只能为与该特定
  网关配对的 iOS 设备发送中继支持的推送。

逐跳说明：

1. `iOS 应用 -> 网关`
   - 应用首先通过正常的 Gateway 认证流程与网关配对。
   - 这给应用提供一个认证的节点会话和一个认证的运营商会话。
   - 运营商会话用于调用 `gateway.identity.get`。

2. `iOS 应用 -> 中继`
   - 应用通过 HTTPS 调用中继注册端点。
   - 注册包括 App Attest 证明和 StoreKit 应用交易 JWS。
   - 中继验证包 ID、App Attest 证明和 Apple 分发证明，并要求
     官方/生产分发路径。
   - 这就是阻止本地 Xcode/开发构建使用托管中继的原因。本地构建可能已签名，但它不满足中继期望的官方 Apple 分发证明。

3. `网关身份委托`
   - 在中继注册之前，应用从
     `gateway.identity.get` 获取配对的网关身份。
   - 应用将该网关身份包含在中继注册载荷中。
   - 中继返回委托给该网关身份的中继句柄和注册范围发送授权。

4. `网关 -> 中继`
   - 网关存储来自 `push.apns.register` 的中继句柄和发送授权。
   - 在 `push.test`、重新连接唤醒和唤醒提示时，网关用其
     自己的设备身份签署发送请求。
   - 中继根据注册中委托的网关身份验证存储的发送授权和网关签名。
   - 另一个网关不能重用该存储的注册，即使它以某种方式获取了句柄。

5. `中继 -> APNs`
   - 中继拥有官方构建的生产 APNs 凭据和原始 APNs 令牌。
   - 网关从不存储中继支持的官方构建的原始 APNs 令牌。
   - 中继代表配对的网关向 APNs 发送最终推送。

此设计的创建原因：

- 使生产 APNs 凭据不存储在用户网关上。
- 避免在网关上存储原始官方构建 APNs 令牌。
- 仅允许官方/TestFlight OpenClaw 构建使用托管中继。
- 防止一个网关向属于不同网关的 iOS 设备发送唤醒推送。

本地/手动构建保留在直接 APNs 上。如果你正在测试那些不带中继的构建，
网关仍然需要直接 APNs 凭据：

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

这些是网关主机运行时环境变量，不是 Fastlane 设置。`apps/ios/fastlane/.env` 仅存储
App Store Connect / TestFlight 认证，如 `ASC_KEY_ID` 和 `ASC_ISSUER_ID`；它不配置
本地 iOS 构建的直接 APNs 传递。

推荐的网关主机存储：

```bash
mkdir -p ~/.openclaw/credentials/apns
chmod 700 ~/.openclaw/credentials/apns
mv /path/to/AuthKey_KEYID.p8 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
chmod 600 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
export OPENCLAW_APNS_PRIVATE_KEY_PATH="$HOME/.openclaw/credentials/apns/AuthKey_KEYID.p8"
```

不要提交 `.p8` 文件或将其放在仓库检出下。

## 发现路径

### Bonjour（LAN）

iOS 应用浏览 `local.` 上的 `_openclaw-gw._tcp`，以及在配置时浏览
相同的广域 DNS-SD 发现域。同一 LAN 的网关从 `local.` 自动出现；
跨网络发现可以使用配置的广域域，无需更改信标类型。

### 尾网（跨网络）

如果 mDNS 被阻止，使用单播 DNS-SD 区域（选择一个域；示例：
`openclaw.internal.`）和 Tailscale 分割 DNS。
CoreDNS 示例请参见 [Bonjour](/gateway/bonjour)。

### 手动主机/端口

在设置中，启用**手动主机**并输入网关主机 + 端口（默认 `18789`）。

## 画布 + A2UI

iOS 节点渲染 WKWebView 画布。使用 `node.invoke` 驱动它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

注意：

- Gateway 画布主机提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`。
- 它从 Gateway HTTP 服务器提供（与 `gateway.port` 相同的端口，默认 `18789`）。
- 当通告了画布主机 URL 时，iOS 节点在连接时自动导航到 A2UI。
- 用 `canvas.navigate` 和 `{"url":""}` 返回内置脚手架。

## 与 Computer Use 的关系

iOS 应用是移动节点接口，不是 Codex Computer Use 后端。Codex
Computer Use 和 `cua-driver mcp` 通过 MCP 工具控制本地 macOS 桌面；iOS 应用通过 OpenClaw 节点命令
（如 `canvas.*`、`camera.*`、`screen.*`、`location.*` 和 `talk.*`）暴露 iPhone 功能。

智能体仍然可以通过 OpenClaw 调用节点命令来操作 iOS 应用，
但这些调用通过网关节点协议进行，并遵循 iOS
前台/后台限制。对于本地桌面控制使用 [Codex Computer Use](/plugins/codex-computer-use)，本页用于 iOS 节点功能。

### 画布 eval / 快照

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 语音唤醒 + Talk 模式

- 语音唤醒和 Talk 模式可在设置中使用。
- iOS 可能会挂起后台音频；当应用不活跃时，将语音功能视为尽力而为。

## 常见错误

- `NODE_BACKGROUND_UNAVAILABLE`：将 iOS 应用切换到前台（画布/摄像头/屏幕命令需要前台）。
- `A2UI_HOST_NOT_CONFIGURED`：Gateway 未通告画布主机 URL；检查 [Gateway 配置](/gateway/configuration)中的 `canvasHost`。
- 配对提示从未出现：运行 `openclaw devices list` 并手动批准。
- 重装后重连失败：Keychain 配对令牌被清除；重新配对节点。

## 相关文档

- [配对](/channels/pairing)
- [发现](/gateway/discovery)
- [Bonjour](/gateway/bonjour)
