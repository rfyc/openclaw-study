---
summary: "Bonjour/mDNS 发现与调试（网关信标、客户端及常见故障模式）"
read_when:
  - 调试 macOS/iOS 上的 Bonjour 发现问题
  - 更改 mDNS 服务类型、TXT 记录或发现用户体验
title: "Bonjour 发现"
---

# Bonjour / mDNS 发现

OpenClaw 可以使用 Bonjour（mDNS / DNS-SD）来发现活动的网关（WebSocket 端点）。
多播 `local.` 浏览是一种**仅限 LAN 的便利功能**。捆绑的 `bonjour` 插件拥有 LAN 广告。它在 macOS 主机上自动启动，在 Linux、Windows 和容器化网关部署中是可选的。对于跨网络发现，同一信标也可以通过配置的广域 DNS-SD 域发布。发现仍然是尽力而为，**不**取代基于 SSH 或 Tailnet 的连接。

## 广域 Bonjour（单播 DNS-SD）通过 Tailscale

如果节点和网关位于不同的网络，多播 mDNS 无法跨越边界。你可以通过切换到 Tailscale 上的**单播 DNS-SD**（"广域 Bonjour"）来保持相同的发现用户体验。

高层步骤：

1. 在网关主机上运行 DNS 服务器（可通过 Tailnet 访问）。
2. 在专用区域（例如：`openclaw.internal.`）下为 `_openclaw-gw._tcp` 发布 DNS-SD 记录。
3. 配置 Tailscale **分割 DNS**，使你选择的域通过该 DNS 服务器为客户端（包括 iOS）解析。

OpenClaw 支持任何发现域；`openclaw.internal.` 只是一个示例。
iOS/Android 节点同时浏览 `local.` 和你配置的广域域。

### 网关配置（推荐）

```json5
{
  gateway: { bind: "tailnet" }, // 仅 tailnet（推荐）
  discovery: { wideArea: { enabled: true } }, // 启用广域 DNS-SD 发布
}
```

### 一次性 DNS 服务器设置（网关主机）

```bash
openclaw dns setup --apply
```

这会安装 CoreDNS 并将其配置为：

- 仅在网关的 Tailscale 接口上监听端口 53
- 从 `~/.openclaw/dns/<domain>.db` 提供你选择的域（例如：`openclaw.internal.`）

从连接到 tailnet 的机器验证：

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Tailscale DNS 设置

在 Tailscale 管理控制台中：

- 添加指向网关 tailnet IP 的名称服务器（UDP/TCP 53）。
- 添加分割 DNS，使你的发现域使用该名称服务器。

一旦客户端接受 tailnet DNS，iOS 节点和 CLI 发现就可以在你的发现域中浏览 `_openclaw-gw._tcp`，无需多播。

### 网关监听器安全（推荐）

网关 WS 端口（默认 `18789`）默认绑定到回环地址。对于 LAN/tailnet 访问，请明确绑定并保持认证启用。

对于仅 tailnet 设置：

- 在 `~/.openclaw/openclaw.json` 中设置 `gateway.bind: "tailnet"`。
- 重启网关（或重启 macOS 菜单栏应用）。

## 什么在广告

只有网关广告 `_openclaw-gw._tcp`。LAN 多播广告由捆绑的 `bonjour` 插件在插件启用时提供；广域 DNS-SD 发布仍由网关拥有。

## 服务类型

- `_openclaw-gw._tcp` — 网关传输信标（由 macOS/iOS/Android 节点使用）。

## TXT 键（非秘密提示）

网关广告小型非秘密提示以使 UI 流程方便：

- `role=gateway`
- `displayName=<友好名称>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>`（网关 WS + HTTP）
- `gatewayTls=1`（仅在 TLS 启用时）
- `gatewayTlsSha256=<sha256>`（仅在 TLS 启用且指纹可用时）
- `canvasPort=<port>`（仅在 canvas 主机启用时；目前与 `gatewayPort` 相同）
- `transport=gateway`
- `tailnetDns=<magicdns>`（仅 mDNS 完整模式，当 Tailnet 可用时的可选提示）
- `sshPort=<port>`（仅 mDNS 完整模式；广域 DNS-SD 可能省略）
- `cliPath=<path>`（仅 mDNS 完整模式；广域 DNS-SD 仍将其作为远程安装提示写入）

安全注意事项：

- Bonjour/mDNS TXT 记录是**未经认证的**。客户端不得将 TXT 视为权威路由。
- 客户端应使用解析的服务端点（SRV + A/AAAA）进行路由。将 `lanHost`、`tailnetDns`、`gatewayPort` 和 `gatewayTlsSha256` 仅视为提示。
- SSH 自动定位同样应使用解析的服务主机，而不是仅依赖 TXT 提示。
- TLS 固定绝不能允许广告的 `gatewayTlsSha256` 覆盖先前存储的固定值。
- iOS/Android 节点应将基于发现的直连视为**仅 TLS**，并在第一次信任指纹之前要求明确的用户确认。

## 在 macOS 上调试

有用的内置工具：

- 浏览实例：

  ```bash
  dns-sd -B _openclaw-gw._tcp local.
  ```

- 解析一个实例（替换 `<instance>`）：

  ```bash
  dns-sd -L "<instance>" _openclaw-gw._tcp local.
  ```

如果浏览成功但解析失败，通常是遇到了 LAN 策略或 mDNS 解析器问题。

## 在网关日志中调试

网关写入滚动日志文件（在启动时打印为 `gateway log file: ...`）。查找 `bonjour:` 行，特别是：

- `bonjour: advertise failed ...`
- `bonjour: suppressing ciao cancellation ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`
- `bonjour: disabling advertiser after ... failed restarts ...`

当系统主机名是有效的 DNS 标签时，Bonjour 使用它作为广告的 `.local` 主机。如果系统主机名包含空格、下划线或其他无效的 DNS 标签字符，OpenClaw 会回退到 `openclaw.local`。在启动网关之前设置 `OPENCLAW_MDNS_HOSTNAME=<name>` 以使用显式主机标签。

## 在 iOS 节点上调试

iOS 节点使用 `NWBrowser` 来发现 `_openclaw-gw._tcp`。

捕获日志：

- 设置 → 网关 → 高级 → **发现调试日志**
- 设置 → 网关 → 高级 → **发现日志** → 重现 → **复制**

日志包含浏览器状态转换和结果集更改。

## 何时启用 Bonjour

对于 macOS 主机上的空配置网关启动，Bonjour 自动启动，因为本地应用程序和附近的 iOS/Android 节点通常依赖同一 LAN 发现。

当在 Linux、Windows 或其他非 macOS 主机上同一 LAN 自动发现有用时，显式启用 Bonjour：

```bash
openclaw plugins enable bonjour
```

启用后，Bonjour 使用 `discovery.mdns.mode` 决定发布多少 TXT 元数据。默认模式是 `minimal`；只有当本地客户端需要 `cliPath` 或 `sshPort` 提示时才使用 `full`，使用 `off` 可以在不更改插件启用状态的情况下抑制 LAN 多播。

## 何时禁用 Bonjour

当 LAN 多播广告不必要、不可用或有害时，保持 Bonjour 禁用。常见情况是非 macOS 服务器、Docker 桥接网络、WSL 或丢弃 mDNS 多播的网络策略。在这些环境中，网关仍然可以通过其发布的 URL、SSH、Tailnet 或广域 DNS-SD 访问，但 LAN 自动发现不可靠。

当问题是部署范围时，首选现有的环境覆盖：

```bash
OPENCLAW_DISABLE_BONJOUR=1
```

这会禁用 LAN 多播广告而不更改插件配置。对于 Docker 镜像、服务文件、启动脚本和一次性调试是安全的，因为该设置在环境消失时消失。

当你有意为该 OpenClaw 配置关闭捆绑的 LAN 发现插件时，使用插件配置：

```bash
openclaw plugins disable bonjour
```

## Docker 注意事项

当 `OPENCLAW_DISABLE_BONJOUR` 未设置时，捆绑的 Bonjour 插件在检测到的容器中自动禁用 LAN 多播广告。Docker 桥接网络通常不会在容器和 LAN 之间转发 mDNS 多播（`224.0.0.251:5353`），因此从容器广告很少使发现工作。

重要注意事项：

- Bonjour 在 macOS 主机上自动启动，在其他地方是可选的。禁用它不会停止网关；它只是跳过 LAN 多播广告。
- 禁用 Bonjour 不会更改 `gateway.bind`；Docker 仍然默认使用 `OPENCLAW_GATEWAY_BIND=lan`，以便发布的主机端口可以工作。
- 禁用 Bonjour 不会禁用广域 DNS-SD。当网关和节点不在同一 LAN 时，使用广域发现或 Tailnet。
- 在 Docker 外重用相同的 `OPENCLAW_CONFIG_DIR` 不会持久化容器自动禁用策略。
- 仅对主机网络、macvlan 或其他已知 mDNS 多播可通过的网络设置 `OPENCLAW_DISABLE_BONJOUR=0`；设置为 `1` 可强制禁用。

## 排查禁用 Bonjour 的问题

如果节点在 Docker 设置后不再自动发现网关：

1. 确认网关是在自动、强制开启还是强制关闭模式下运行：

   ```bash
   docker compose config | grep OPENCLAW_DISABLE_BONJOUR
   ```

2. 确认网关本身可以通过发布的端口访问：

   ```bash
   curl -fsS http://127.0.0.1:18789/healthz
   ```

3. 当 Bonjour 禁用时使用直连目标：
   - Control UI 或本地工具：`http://127.0.0.1:18789`
   - LAN 客户端：`http://<gateway-host>:18789`
   - 跨网络客户端：Tailnet MagicDNS、Tailnet IP、SSH 隧道或广域 DNS-SD

4. 如果你在 Docker 中故意启用了 Bonjour 插件并用 `OPENCLAW_DISABLE_BONJOUR=0` 强制广告，从主机测试多播：

   ```bash
   dns-sd -B _openclaw-gw._tcp local.
   ```

   如果浏览为空或网关日志显示 ciao watchdog 重复取消，请恢复 `OPENCLAW_DISABLE_BONJOUR=1` 并使用直连或 Tailnet 路由。

## 常见故障模式

- **Bonjour 无法跨网络**：使用 Tailnet 或 SSH。
- **多播被阻止**：某些 Wi-Fi 网络禁用 mDNS。
- **广告商卡在探测/公告状态**：多播被阻止的主机、容器桥接、WSL 或接口抖动可能会让 ciao 广告商处于未公告状态。OpenClaw 重试几次，然后为当前网关进程禁用 Bonjour，而不是永远重启广告商。
- **Docker 桥接网络**：Bonjour 在检测到的容器中自动禁用。仅对主机、macvlan 或其他支持 mDNS 的网络设置 `OPENCLAW_DISABLE_BONJOUR=0`。
- **睡眠/接口抖动**：macOS 可能暂时删除 mDNS 结果；重试。
- **浏览成功但解析失败**：保持机器名称简单（避免表情符号或标点符号），然后重启网关。服务实例名称派生自主机名，因此过于复杂的名称可能会混淆某些解析器。

## 转义的实例名称（`\032`）

Bonjour/DNS-SD 通常将服务实例名称中的字节转义为十进制 `\DDD` 序列（例如，空格变为 `\032`）。

- 这在协议层面是正常的。
- UI 应为显示解码（iOS 使用 `BonjourEscapes.decode`）。

## 启用/禁用/配置

- macOS 主机默认自动启动捆绑的 LAN 发现插件。
- `openclaw plugins enable bonjour` 在非默认启用的主机上启用捆绑的 LAN 发现插件。
- `openclaw plugins disable bonjour` 通过禁用捆绑的插件来禁用 LAN 多播广告。
- `OPENCLAW_DISABLE_BONJOUR=1` 在不更改插件配置的情况下禁用 LAN 多播广告；接受的真值为 `1`、`true`、`yes` 和 `on`（旧版：`OPENCLAW_DISABLE_BONJOUR`）。
- `OPENCLAW_DISABLE_BONJOUR=0` 强制开启 LAN 多播广告，包括在检测到的容器内；接受的假值为 `0`、`false`、`no` 和 `off`。
- 当 Bonjour 插件启用且 `OPENCLAW_DISABLE_BONJOUR` 未设置时，Bonjour 在正常主机上广告并在检测到的容器内自动禁用。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制网关绑定模式。
- `OPENCLAW_SSH_PORT` 在广告 `sshPort` 时覆盖 SSH 端口（旧版：`OPENCLAW_SSH_PORT`）。
- `OPENCLAW_TAILNET_DNS` 在启用 mDNS 完整模式时在 TXT 中发布 MagicDNS 提示（旧版：`OPENCLAW_TAILNET_DNS`）。
- `OPENCLAW_CLI_PATH` 覆盖广告的 CLI 路径（旧版：`OPENCLAW_CLI_PATH`）。

## 相关文档

- 发现策略和传输选择：[发现](/gateway/discovery)
- 节点配对 + 审批：[网关配对](/gateway/pairing)
