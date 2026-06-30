---
summary: "`openclaw node` 的 CLI 参考（无头节点主机）"
read_when:
  - 运行无头节点主机时
  - 为非 macOS 节点配对以使用 system.run 时
title: "Node"
---

# `openclaw node`

运行一个**无头节点主机**，连接到 Gateway WebSocket 并在此机器上公开 `system.run` / `system.which`。

## 为什么使用节点主机？

当你希望代理在网络中的**其他机器上运行命令**而不在那里安装完整的 macOS 伴侣应用时，使用节点主机。

常见使用场景：

- 在远程 Linux/Windows 机器（构建服务器、实验机器、NAS）上运行命令。
- 将执行**沙箱化**在 gateway 上，但将批准的运行委派给其他主机。
- 为自动化或 CI 节点提供轻量级、无头的执行目标。

执行仍然受到节点主机上的**执行审批**和每代理允许列表的保护，因此你可以保持命令访问的范围和明确性。

## 浏览器代理（零配置）

如果节点上未禁用 `browser.enabled`，节点主机会自动宣传浏览器代理。这让代理可以在该节点上使用浏览器自动化，无需额外配置。

默认情况下，代理公开节点的正常浏览器配置文件表面。如果你设置 `nodeHost.browserProxy.allowProfiles`，代理将变为限制性的：通过代理拒绝非允许列表的配置文件定位，并阻止持久配置文件创建/删除路由。

如果需要，在节点上禁用它：

```json5
{
  nodeHost: {
    browserProxy: {
      enabled: false,
    },
  },
}
```

## 运行（前台）

```bash
openclaw node run --host <gateway-host> --port 18789
```

选项：

- `--host <host>`：Gateway WebSocket 主机（默认：`127.0.0.1`）
- `--port <port>`：Gateway WebSocket 端口（默认：`18789`）
- `--tls`：使用 TLS 进行 gateway 连接
- `--tls-fingerprint <sha256>`：预期的 TLS 证书指纹（sha256）
- `--node-id <id>`：覆盖节点 ID（清除配对令牌）
- `--display-name <name>`：覆盖节点显示名称

## 节点主机的 Gateway 认证

`openclaw node run` 和 `openclaw node install` 从配置/环境解析 gateway 认证（节点命令上没有 `--token`/`--password` 标志）：

- 首先检查 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 然后本地配置回退：`gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机故意不继承 `gateway.remote.token` / `gateway.remote.password`。
- 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 明确配置且未解析，节点认证解析将失败关闭（无远程回退屏蔽）。
- 在 `gateway.mode=remote` 中，远程客户端字段（`gateway.remote.token` / `gateway.remote.password`）也根据远程优先级规则符合条件。
- 节点主机认证解析仅支持 `OPENCLAW_GATEWAY_*` 环境变量。

对于连接到受信任私有网络上的非回环 `ws://` Gateway 的节点，设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。没有它，节点启动将失败关闭并要求你使用 `wss://`、SSH 隧道或 Tailscale。这是进程环境的选择加入，不是 `openclaw.json` 配置键。`openclaw node install` 在安装命令环境中存在时将其持久化到受监督的节点服务中。

## 服务（后台）

将无头节点主机安装为用户服务。

```bash
openclaw node install --host <gateway-host> --port 18789
```

选项：

- `--host <host>`：Gateway WebSocket 主机（默认：`127.0.0.1`）
- `--port <port>`：Gateway WebSocket 端口（默认：`18789`）
- `--tls`：使用 TLS 进行 gateway 连接
- `--tls-fingerprint <sha256>`：预期的 TLS 证书指纹（sha256）
- `--node-id <id>`：覆盖节点 ID（清除配对令牌）
- `--display-name <name>`：覆盖节点显示名称
- `--runtime <runtime>`：服务运行时（`node` 或 `bun`）
- `--force`：如果已安装则重新安装/覆盖

管理服务：

```bash
openclaw node status
openclaw node start
openclaw node stop
openclaw node restart
openclaw node uninstall
```

使用 `openclaw node run` 进行前台节点主机（无服务）。

服务命令接受 `--json` 以获取机器可读输出。

节点主机在进程内重试 Gateway 重启和网络关闭。如果 Gateway 报告终端令牌/密码/引导认证暂停，节点主机记录关闭详细信息并以非零退出，以便 launchd/systemd 可以使用新鲜配置和凭据重新启动它。需要配对的暂停保留在前台流程中，以便可以批准待处理的请求。

## 配对

第一次连接在 Gateway 上创建待处理的设备配对请求（`role: node`）。通过以下方式批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

在严格控制的节点网络上，Gateway 操作员可以明确选择从受信任 CIDR 自动批准首次节点配对：

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

默认情况下禁用此功能。它仅适用于没有请求范围的全新 `role: node` 配对。操作员/浏览器客户端、Control UI、WebChat 以及角色、范围、元数据或公钥升级仍然需要手动批准。

如果节点使用更改的认证详细信息（角色/范围/公钥）重试配对，之前的待处理请求将被取代，并创建新的 `requestId`。在批准之前再次运行 `openclaw devices list`。

节点主机在 `~/.openclaw/node.json` 中存储其节点 ID、令牌、显示名称和 gateway 连接信息。

## 执行审批

`system.run` 受本地执行审批保护：

- `~/.openclaw/exec-approvals.json`
- [执行审批](/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>`（从 Gateway 编辑）

对于批准的异步节点执行，OpenClaw 在提示前准备一个规范的 `systemRunPlan`。后来批准的 `system.run` 转发重用该存储的计划，因此在审批请求创建后对命令/cwd/会话字段的编辑将被拒绝，而不是更改节点执行的内容。

## 相关

- [CLI 参考](/cli)
- [节点](/nodes)
