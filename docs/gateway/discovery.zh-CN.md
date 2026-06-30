---
summary: "节点发现和传输（Bonjour、Tailscale、SSH）用于查找网关"
title: "发现和传输"
read_when:
  - 实现或更改 Bonjour 发现/广告
  - 调整远程连接模式（直连与 SSH）
  - 为远程节点设计节点发现 + 配对
---

# 发现和传输

OpenClaw 有两个表面上看起来相似的不同问题：

1. **操作员远程控制**：macOS 菜单栏应用控制在其他地方运行的网关。
2. **节点配对**：iOS/Android（和未来的节点）查找网关并安全配对。

设计目标是将所有网络发现/广告保留在**节点网关**（`openclaw gateway`）中，并将客户端（Mac 应用、iOS）作为消费者。

## 术语

- **网关**：单个长时间运行的网关进程，拥有状态（会话、配对、节点注册表）并运行渠道。大多数设置每台主机使用一个；隔离的多网关设置也是可能的。
- **网关 WS（控制平面）**：默认在 `127.0.0.1:18789` 上的 WebSocket 端点；可以通过 `gateway.bind` 绑定到 LAN/tailnet。
- **直接 WS 传输**：面向 LAN/tailnet 的网关 WS 端点（无 SSH）。
- **SSH 传输（回退）**：通过 SSH 转发 `127.0.0.1:18789` 进行远程控制。
- **旧版 TCP 桥接（已删除）**：较旧的节点传输（参见[桥接协议](/gateway/bridge-protocol)）；不再为发现广告，也不再是当前构建的一部分。

协议详情：

- [网关协议](/gateway/protocol)
- [桥接协议（旧版）](/gateway/bridge-protocol)

## 为什么同时保留"直连"和 SSH

- **直接 WS** 在同一网络和 tailnet 内提供最佳用户体验：
  - 通过 Bonjour 在 LAN 上自动发现
  - 网关拥有配对令牌 + ACL
  - 不需要 shell 访问；协议面可以保持紧凑和可审计
- **SSH** 仍然是通用回退：
  - 只要有 SSH 访问就可以工作（甚至跨无关网络）
  - 在多播/mDNS 问题中存活
  - 除了 SSH 外不需要新的入站端口

## 发现输入（客户端如何了解网关位置）

### 1）Bonjour / DNS-SD 发现

多播 Bonjour 是尽力而为的，不能跨网络。OpenClaw 还可以通过配置的广域 DNS-SD 域浏览相同的网关信标，因此发现可以涵盖：

- 同一 LAN 上的 `local.`
- 跨网络发现的已配置单播 DNS-SD 域

目标方向：

- 当捆绑的 `bonjour` 插件启用时，**网关**通过 Bonjour 广告其 WS 端点。插件在 macOS 主机上自动启动，在其他地方需要选择加入。
- 客户端浏览并显示"选择网关"列表，然后存储所选端点。

故障排除和信标详情：[Bonjour](/gateway/bonjour)。

#### 服务信标详情

- 服务类型：
  - `_openclaw-gw._tcp`（网关传输信标）
- TXT 键（非秘密）：
  - `role=gateway`
  - `transport=gateway`
  - `displayName=<friendly name>`（操作员配置的显示名称）
  - `lanHost=<hostname>.local`
  - `gatewayPort=18789`（网关 WS + HTTP）
  - `gatewayTls=1`（仅当 TLS 启用时）
  - `gatewayTlsSha256=<sha256>`（仅当 TLS 启用且指纹可用时）
  - `canvasPort=<port>`（canvas 主机端口；当 canvas 主机启用时当前与 `gatewayPort` 相同）
  - `tailnetDns=<magicdns>`（可选提示；Tailscale 可用时自动检测）
  - `sshPort=<port>`（仅 mDNS 完整模式；广域 DNS-SD 可能省略它，在这种情况下 SSH 默认保持 `22`）
  - `cliPath=<path>`（仅 mDNS 完整模式；广域 DNS-SD 仍将其写为远程安装提示）

安全说明：

- Bonjour/mDNS TXT 记录是**未经认证的**。客户端必须将 TXT 值仅视为 UI 提示。
- 路由（主机/端口）应优先使用**已解析的服务端点**（SRV + A/AAAA）而不是 TXT 提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS 固定绝不能允许广告的 `gatewayTlsSha256` 覆盖先前存储的固定。
- iOS/Android 节点在所选路由是安全/TLS 的情况下，在首次存储固定之前（带外验证）应要求明确的"信任此指纹"确认。

启用/禁用/覆盖：

- `openclaw plugins enable bonjour` 启用 LAN 多播广告。
- `OPENCLAW_DISABLE_BONJOUR=1` 禁用广告。
- 当 Bonjour 插件启用且 `OPENCLAW_DISABLE_BONJOUR` 未设置时，Bonjour 在普通主机上广告，并在检测到容器内自动禁用。空配置 macOS 网关启动自动启用插件；Linux、Windows 和容器化部署需要明确启用。在主机、macvlan 或其他支持 mDNS 的网络上使用 `0`；使用 `1` 强制禁用。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制网关绑定模式。
- `OPENCLAW_SSH_PORT` 覆盖发出 `sshPort` 时广告的 SSH 端口。
- `OPENCLAW_TAILNET_DNS` 发布 `tailnetDns` 提示（MagicDNS）。
- `OPENCLAW_CLI_PATH` 覆盖广告的 CLI 路径。

### 2）Tailnet（跨网络）

对于伦敦/维也纳风格的设置，Bonjour 无法帮助。推荐的"直连"目标是：

- Tailscale MagicDNS 名称（首选）或稳定的 tailnet IP。

如果网关可以检测到它在 Tailscale 下运行，它会将 `tailnetDns` 作为客户端的可选提示发布（包括广域信标）。

macOS 应用现在优先使用 MagicDNS 名称而不是原始 Tailscale IP 进行网关发现。这提高了当 tailnet IP 改变时（例如节点重启或 CGNAT 重新分配后）的可靠性，因为 MagicDNS 名称自动解析到当前 IP。

对于移动节点配对，发现提示不会在 tailnet/公开路由上放宽传输安全：

- iOS/Android 仍然需要安全的首次 tailnet/公开连接路径（`wss://` 或 Tailscale Serve/Funnel）。
- 发现的原始 tailnet IP 是路由提示，而不是使用明文远程 `ws://` 的许可。
- 私有 LAN 直连 `ws://` 仍然受支持。
- 如果你想要移动节点最简单的 Tailscale 路径，使用 Tailscale Serve，这样发现和设置代码都解析到相同的安全 MagicDNS 端点。

### 3）手动 / SSH 目标

当没有直接路由（或直连被禁用）时，客户端始终可以通过 SSH 连接，方法是转发环回网关端口。

参见[远程访问](/gateway/remote)。

## 传输选择（客户端策略）

推荐的客户端行为：

1. 如果已配置配对的直接端点且可达，使用它。
2. 否则，如果发现在 `local.` 或配置的广域域上找到网关，提供一个单击"使用此网关"选项并将其保存为直接端点。
3. 否则，如果配置了 tailnet DNS/IP，尝试直连。对于 tailnet/公开路由上的移动节点，直连意味着安全端点，而不是明文远程 `ws://`。
4. 否则，回退到 SSH。

## 配对 + 认证（直接传输）

网关是节点/客户端准入的真相来源。

- 配对请求在网关中创建/批准/拒绝（参见[网关配对](/gateway/pairing)）。
- 网关强制执行：
  - 认证（令牌/密钥对）
  - 范围/ACL（网关不是每个方法的原始代理）
  - 速率限制

## 按组件划分的职责

- **网关**：广播发现信标，拥有配对决策，并托管 WS 端点。
- **macOS 应用**：帮助你选择网关，显示配对提示，仅将 SSH 用作回退。
- **iOS/Android 节点**：将 Bonjour 作为便利浏览，并连接到已配对的网关 WS。

## 相关链接

- [远程访问](/gateway/remote)
- [Tailscale](/gateway/tailscale)
- [Bonjour 发现](/gateway/bonjour)
