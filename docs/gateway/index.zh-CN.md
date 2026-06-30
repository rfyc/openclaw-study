---
summary: "网关服务、生命周期和操作的运行手册"
title: "网关运行手册"
read_when:
  - 运行或调试网关进程
---

使用本页进行网关服务的第 1 天启动和第 2 天操作。

<CardGroup cols={2}>
  <Card title="深度故障排除" icon="siren" href="/gateway/troubleshooting">
    以症状为首的诊断，包含精确的命令步骤和日志特征。
  </Card>
  <Card title="配置" icon="sliders" href="/gateway/configuration">
    面向任务的设置指南 + 完整的配置参考。
  </Card>
  <Card title="秘密管理" icon="key-round" href="/gateway/secrets">
    SecretRef 合约、运行时快照行为和迁移/重载操作。
  </Card>
  <Card title="秘密计划合约" icon="shield-check" href="/gateway/secrets-plan-contract">
    精确的 `secrets apply` 目标/路径规则和仅引用的认证配置文件行为。
  </Card>
</CardGroup>

## 5 分钟本地启动

<Steps>
  <Step title="启动网关">

```bash
openclaw gateway --port 18789
# 调试/跟踪镜像到 stdio
openclaw gateway --port 18789 --verbose
# 强制终止所选端口上的监听器，然后启动
openclaw gateway --force
```

  </Step>

  <Step title="验证服务健康状况">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

健康基线：`Runtime: running`、`Connectivity probe: ok` 以及与你期望的匹配的 `Capability: ...`。当你需要读取范围的 RPC 证明而不仅仅是可达性时，使用 `openclaw gateway status --require-rpc`。

  </Step>

  <Step title="验证渠道就绪性">

```bash
openclaw channels status --probe
```

使用可达的网关，这会运行实时的每账户渠道探测和可选审计。如果网关不可达，CLI 会回退到仅配置的渠道摘要，而不是实时探测输出。

  </Step>
</Steps>

<Note>
网关配置重载监视活跃配置文件路径（从配置文件/状态默认值解析，或在设置时为 `OPENCLAW_CONFIG_PATH`）。默认模式是 `gateway.reload.mode="hybrid"`。第一次成功加载后，运行中的进程提供活跃的内存中配置快照；成功的重载以原子方式交换该快照。
</Note>

## 运行时模型

- 一个始终在线的路由、控制平面和渠道连接进程。
- 单一多路复用端口用于：
  - WebSocket 控制/RPC
  - HTTP APIs、OpenAI 兼容（`/v1/models`、`/v1/embeddings`、`/v1/chat/completions`、`/v1/responses`、`/tools/invoke`）
  - Control UI 和 hooks
- 默认绑定模式：`loopback`。
- 认证默认必需。共享密钥设置使用 `gateway.auth.token` / `gateway.auth.password`（或 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`），非环回反向代理设置可以使用 `gateway.auth.mode: "trusted-proxy"`。

## OpenAI 兼容端点

OpenClaw 最高价值的兼容面现在是：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

为什么这组端点重要：

- 大多数 Open WebUI、LobeChat 和 LibreChat 集成首先探测 `/v1/models`。
- 许多 RAG 和内存管道期望 `/v1/embeddings`。
- 代理原生客户端越来越倾向于 `/v1/responses`。

规划注意事项：

- `/v1/models` 是代理优先的：它返回 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`。
- `openclaw/default` 是始终映射到配置的默认代理的稳定别名。
- 当你想要后端提供商/模型覆盖时使用 `x-openclaw-model`；否则所选代理的正常模型和嵌入设置保持控制。

所有这些都在主网关端口上运行，并使用与其他网关 HTTP API 相同的受信任操作员认证边界。

### 端口和绑定优先级

| 设置     | 解析顺序                                                      |
| -------- | ------------------------------------------------------------- |
| 网关端口 | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| 绑定模式 | CLI/覆盖 → `gateway.bind` → `loopback`                        |

已安装的网关服务在监督程序元数据中记录解析的 `--port`。更改 `gateway.port` 后，运行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，使 launchd/systemd/schtasks 在新端口上启动进程。

网关启动在为非环回绑定设置本地 Control UI 来源时使用相同的有效端口和绑定。例如，`--bind lan --port 3000` 在运行时验证之前设置 `http://localhost:3000` 和 `http://127.0.0.1:3000`。将任何远程浏览器来源（如 HTTPS 代理 URL）明确添加到 `gateway.controlUi.allowedOrigins`。

### 热重载模式

| `gateway.reload.mode` | 行为                     |
| --------------------- | ------------------------ |
| `off`                 | 没有配置重载             |
| `hot`                 | 仅应用热安全的更改       |
| `restart`             | 在需要重载的更改时重启   |
| `hybrid`（默认）      | 安全时热应用，需要时重启 |

## 操作员命令集

```bash
openclaw gateway status
openclaw gateway status --deep   # 添加系统级服务扫描
openclaw gateway status --json
openclaw gateway install
openclaw gateway restart
openclaw gateway stop
openclaw secrets reload
openclaw logs --follow
openclaw doctor
```

`gateway status --deep` 用于额外的服务发现（LaunchDaemons/systemd 系统单元/schtasks），不是更深入的 RPC 健康探测。

## 多网关（同一主机）

大多数安装应该在每台机器上运行一个网关。单个网关可以托管多个代理和渠道。

只有当你有意想要隔离或救援机器人时，才需要多个网关。

有用的检查：

```bash
openclaw gateway status --deep
openclaw gateway probe
```

预期内容：

- `gateway status --deep` 可以报告 `Other gateway-like services detected (best effort)` 并在仍然存在过时的 launchd/systemd/schtasks 安装时打印清理提示。
- 当多个目标响应时，`gateway probe` 可以警告 `multiple reachable gateways`。
- 如果这是有意的，每个网关隔离端口、配置/状态和工作区根。

每个实例的清单：

- 唯一的 `gateway.port`
- 唯一的 `OPENCLAW_CONFIG_PATH`
- 唯一的 `OPENCLAW_STATE_DIR`
- 唯一的 `agents.defaults.workspace`

示例：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002
```

详细设置：[/gateway/multiple-gateways](/gateway/multiple-gateways)。

## VoiceClaw 实时大脑端点

OpenClaw 在 `/voiceclaw/realtime` 暴露 VoiceClaw 兼容的实时 WebSocket 端点。当 VoiceClaw 桌面客户端应该直接与实时 OpenClaw 大脑通话而不是通过单独的中继进程时使用它。

端点使用 Gemini Live 进行实时音频，并通过直接向 Gemini Live 暴露 OpenClaw 工具来将 OpenClaw 作为大脑调用。工具调用返回即时的 `working` 结果以保持语音轮次响应，然后 OpenClaw 异步执行实际工具并将结果注入回实时会话。在网关进程环境中设置 `GEMINI_API_KEY`。如果启用了网关认证，桌面客户端在其第一个 `session.config` 消息中发送网关令牌或密码。

实时大脑访问运行所有者授权的 OpenClaw 代理命令。将 `gateway.auth.mode: "none"` 限制为仅环回测试实例。非本地实时大脑连接需要网关认证。

对于隔离的测试网关，使用自己的端口、配置和状态运行单独的实例：

```bash
OPENCLAW_CONFIG_PATH=/path/to/openclaw-realtime/openclaw.json \
OPENCLAW_STATE_DIR=/path/to/openclaw-realtime/state \
OPENCLAW_SKIP_CHANNELS=1 \
GEMINI_API_KEY=... \
openclaw gateway --port 19789
```

然后配置 VoiceClaw 使用：

```text
ws://127.0.0.1:19789/voiceclaw/realtime
```

## 远程访问

首选：Tailscale/VPN。
回退：SSH 隧道。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

然后在本地将客户端连接到 `ws://127.0.0.1:18789`。

<Warning>
SSH 隧道不绕过网关认证。对于共享密钥认证，客户端即使通过隧道也必须发送 `token`/`password`。对于身份承载模式，请求仍然必须满足该认证路径。
</Warning>

参见：[远程网关](/gateway/remote)、[认证](/gateway/authentication)、[Tailscale](/gateway/tailscale)。

## 监督和服务生命周期

对于类似生产的可靠性，使用监督运行。

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

使用 `openclaw gateway restart` 进行重启。不要链接 `openclaw gateway stop` 和 `openclaw gateway start`；在 macOS 上，`gateway stop` 在停止之前有意禁用 LaunchAgent。

LaunchAgent 标签是 `ai.openclaw.gateway`（默认）或 `ai.openclaw.<profile>`（命名配置文件）。`openclaw doctor` 审计和修复服务配置漂移。

  </Tab>

  <Tab title="Linux (systemd user)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

为了在注销后持久化，启用 lingering：

```bash
sudo loginctl enable-linger <user>
```

当你需要自定义安装路径时的手动用户单元示例：

```ini
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group

[Install]
WantedBy=default.target
```

  </Tab>

  <Tab title="Windows（原生）">

```powershell
openclaw gateway install
openclaw gateway status --json
openclaw gateway restart
openclaw gateway stop
```

Windows 原生托管启动使用名为 `OpenClaw Gateway`（或命名配置文件的 `OpenClaw Gateway (<profile>)`）的计划任务。如果计划任务创建被拒绝，OpenClaw 回退到指向状态目录中 `gateway.cmd` 的每用户启动文件夹启动器。

  </Tab>

  <Tab title="Linux（系统服务）">

对于多用户/始终在线的主机使用系统单元。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

使用与用户单元相同的服务体，但将其安装在 `/etc/systemd/system/openclaw-gateway[-<profile>].service` 下，如果你的 `openclaw` 二进制文件在其他地方，调整 `ExecStart=`。

不要让 `openclaw doctor --fix` 为同一配置文件/端口也安装用户级网关服务。当 Doctor 发现系统级 OpenClaw 网关服务时，拒绝自动安装；当系统单元拥有生命周期时使用 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Tab>
</Tabs>

## 开发配置文件快速路径

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

默认值包括隔离的状态/配置和基础网关端口 `19001`。

## 协议快速参考（操作员视图）

- 第一个客户端帧必须是 `connect`。
- 网关返回 `hello-ok` 快照（`presence`、`health`、`stateVersion`、`uptimeMs`、限制/策略）。
- `hello-ok.features.methods` / `events` 是保守的发现列表，不是每个可调用辅助路由的生成转储。
- 请求：`req(method, params)` → `res(ok/payload|error)`。
- 常见事件包括 `connect.challenge`、`agent`、`chat`、`session.message`、`session.tool`、`sessions.changed`、`presence`、`tick`、`health`、`heartbeat`、配对/批准生命周期事件和 `shutdown`。

代理运行是两阶段的：

1. 立即接受确认（`status:"accepted"`）
2. 最终完成响应（`status:"ok"|"error"`），中间有流式 `agent` 事件。

参见完整协议文档：[网关协议](/gateway/protocol)。

## 操作检查

### 活跃性

- 打开 WS 并发送 `connect`。
- 期望收到带快照的 `hello-ok` 响应。

### 就绪性

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 间隙恢复

事件不被重放。在序列间隙上，在继续之前刷新状态（`health`、`system-presence`）。

## 常见失败特征

| 特征                                                           | 可能的问题                                         |
| -------------------------------------------------------------- | -------------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | 非环回绑定没有有效的网关认证路径                   |
| `another gateway instance is already listening` / `EADDRINUSE` | 端口冲突                                           |
| `Gateway start blocked: set gateway.mode=local`                | 配置设置为远程模式，或损坏的配置中缺少本地模式标记 |
| 连接期间出现 `unauthorized`                                    | 客户端和网关之间的认证不匹配                       |

有关完整的诊断步骤，使用[网关故障排除](/gateway/troubleshooting)。

## 安全保证

- 网关不可用时，网关协议客户端快速失败（没有隐式的直接渠道回退）。
- 无效/非 connect 的第一帧被拒绝并关闭。
- 优雅关闭在套接字关闭之前发出 `shutdown` 事件。

---

相关：

- [故障排除](/gateway/troubleshooting)
- [后台进程](/gateway/background-process)
- [配置](/gateway/configuration)
- [健康](/gateway/health)
- [Doctor](/gateway/doctor)
- [认证](/gateway/authentication)

## 相关链接

- [配置](/gateway/configuration)
- [网关故障排除](/gateway/troubleshooting)
- [远程访问](/gateway/remote)
- [秘密管理](/gateway/secrets)
