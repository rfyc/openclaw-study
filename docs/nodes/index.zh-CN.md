---
summary: "节点：画布/摄像头/屏幕/设备/通知/系统的配对、功能、权限和 CLI 辅助工具"
read_when:
  - 将 iOS/Android 节点配对到网关
  - 使用节点画布/摄像头作为智能体上下文
  - 添加新的节点命令或 CLI 辅助工具
title: "节点"
---

**节点**是连接到 Gateway **WebSocket**（与运营商使用相同端口）的伴侣设备（macOS/iOS/Android/无头），使用 `role: "node"` 并通过 `node.invoke` 暴露命令接口（例如 `canvas.*`、`camera.*`、`device.*`、`notifications.*`、`system.*`）。协议详情：[Gateway 协议](/gateway/protocol)。

旧版传输：[Bridge 协议](/gateway/bridge-protocol)（TCP JSONL；
仅对当前节点保留历史记录）。

macOS 也可以在**节点模式**下运行：菜单栏应用连接到 Gateway 的
WS 服务器，并将其本地画布/摄像头命令暴露为节点（因此
`openclaw nodes …` 可以对这台 Mac 使用）。在远程网关模式下，浏览器
自动化由 CLI 节点主机（`openclaw node run` 或已安装的节点服务）处理，
而不是由原生应用节点处理。

注意：

- 节点是**外设**，不是网关。它们不运行网关服务。
- Telegram/WhatsApp 等消息到达**网关**，而不是节点。
- 故障排除手册：[/nodes/troubleshooting](/nodes/troubleshooting)

## 配对 + 状态

**WS 节点使用设备配对。** 节点在 `connect` 时提供设备身份；Gateway
为 `role: node` 创建设备配对请求。通过设备 CLI（或 UI）批准。

快速 CLI：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

如果节点以更改的认证详情（角色/范围/公钥）重试，先前的
待处理请求将被取代，并创建新的 `requestId`。在批准之前重新运行
`openclaw devices list`。

注意：

- `nodes status` 当设备配对角色包含 `node` 时将节点标记为**已配对**。
- 设备配对记录是持久的已批准角色合同。令牌
  轮换保留在该合同内；它不能将已配对的节点升级到
  配对批准从未授予的不同角色。
- `node.pair.*`（CLI：`openclaw nodes pending/approve/reject/remove/rename`）是一个独立的网关自有
  节点配对存储；它**不**控制 WS `connect` 握手。
- `openclaw nodes remove --node <id|name|ip>` 从那个
  独立的网关自有节点配对存储中删除过期条目。
- 批准范围遵循待处理请求声明的命令：
  - 无命令请求：`operator.pairing`
  - 非执行节点命令：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which`：`operator.pairing` + `operator.admin`

## 远程节点主机（system.run）

当你的 Gateway 在一台机器上运行，而你希望命令
在另一台机器上执行时，使用**节点主机**。模型仍然与**网关**通信；当选择 `host=node` 时，网关将 `exec` 调用转发到**节点主机**。

### 各处运行的内容

- **网关主机**：接收消息，运行模型，路由工具调用。
- **节点主机**：在节点机器上执行 `system.run`/`system.which`。
- **批准**：在节点主机上通过 `~/.openclaw/exec-approvals.json` 强制执行。

批准注意事项：

- 批准支持的节点运行绑定精确的请求上下文。
- 对于直接 shell/运行时文件执行，OpenClaw 也尽力绑定一个具体的本地
  文件操作数，如果该文件在执行前发生变化则拒绝运行。
- 如果 OpenClaw 无法为解释器/运行时命令精确识别一个具体的本地文件，
  则拒绝批准支持的执行，而不是假装完全覆盖运行时。使用沙盒、
  独立主机或显式受信任的允许列表/完整工作流来处理更广泛的解释器语义。

### 启动节点主机（前台）

在节点机器上：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### 通过 SSH 隧道连接远程网关（环回绑定）

如果 Gateway 绑定到环回（`gateway.bind=loopback`，本地模式默认），
远程节点主机无法直接连接。创建 SSH 隧道并将节点主机指向隧道的本地端。

示例（节点主机 -> 网关主机）：

```bash
# 终端 A（保持运行）：将本地 18790 转发到网关 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# 终端 B：导出网关令牌并通过隧道连接
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node"
```

注意：

- `openclaw node run` 支持令牌或密码认证。
- 优先使用环境变量：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 配置回退为 `gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机有意忽略 `gateway.remote.token` / `gateway.remote.password`。
- 在远程模式下，`gateway.remote.token` / `gateway.remote.password` 按远程优先规则生效。
- 如果已配置活跃的本地 `gateway.auth.*` SecretRefs 但未解析，节点主机认证会失败关闭。
- 节点主机认证解析仅使用 `OPENCLAW_GATEWAY_*` 环境变量。

### 启动节点主机（服务）

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node start
openclaw node restart
```

### 配对 + 命名

在网关主机上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

如果节点以更改的认证详情重试，重新运行 `openclaw devices list`
并批准当前的 `requestId`。

命名选项：

- `openclaw node run` / `openclaw node install` 上的 `--display-name`（持久化到节点上的 `~/.openclaw/node.json`）。
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"`（网关覆盖）。

### 将命令加入允许列表

执行批准是**每个节点主机**的。从网关添加允许列表条目：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

批准存储在节点主机的 `~/.openclaw/exec-approvals.json`。

### 将执行指向节点

配置默认值（网关配置）：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或每个会话：

```
/exec host=node security=allowlist node=<id-or-name>
```

一旦设置，任何带 `host=node` 的 `exec` 调用都在节点主机上运行（受
节点允许列表/批准约束）。

`host=auto` 不会自行隐式选择节点，但来自 `auto` 的显式每次调用 `host=node` 请求是允许的。如果你想让节点 exec 成为会话的默认值，请显式设置 `tools.exec.host=node` 或 `/exec host=node ...`。

相关：

- [节点主机 CLI](/cli/node)
- [执行工具](/tools/exec)
- [执行批准](/tools/exec-approvals)

## 调用命令

低级别（原始 RPC）：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

对于常见的"给智能体一个 MEDIA 附件"工作流，存在更高级别的辅助工具。

## 命令策略

节点命令在被调用前必须通过两个门控：

1. 节点必须在其 WebSocket `connect.commands` 列表中声明该命令。
2. 网关的平台策略必须允许声明的命令。

Windows 和 macOS 伴侣节点默认允许安全声明的命令，例如
`canvas.*`、`camera.list`、`location.get` 和 `screen.snapshot`。
危险或隐私敏感的命令，例如 `camera.snap`、`camera.clip` 和
`screen.record` 仍需要通过 `gateway.nodes.allowCommands` 显式选择加入。`gateway.nodes.denyCommands` 始终优先于默认值和额外的允许列表条目。

插件拥有的节点命令可以添加 Gateway 节点调用策略。该策略
在允许列表检查之后、转发到节点之前运行，因此原始
`node.invoke`、CLI 辅助工具和专用智能体工具共享相同的插件
权限边界。危险的插件节点命令仍需要显式的
`gateway.nodes.allowCommands` 选择加入。

节点更改其声明的命令列表后，拒绝旧的设备配对
并批准新请求，以便网关存储更新后的命令快照。

## 截图（画布快照）

如果节点正在显示画布（WebView），`canvas.snapshot` 返回 `{ format, base64 }`。

CLI 辅助工具（写入临时文件并打印 `MEDIA:<path>`）：

```bash
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format png
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format jpg --max-width 1200 --quality 0.9
```

### 画布控件

```bash
openclaw nodes canvas present --node <idOrNameOrIp> --target https://example.com
openclaw nodes canvas hide --node <idOrNameOrIp>
openclaw nodes canvas navigate https://example.com --node <idOrNameOrIp>
openclaw nodes canvas eval --node <idOrNameOrIp> --js "document.title"
```

注意：

- `canvas present` 接受 URL 或本地文件路径（`--target`），以及可选的 `--x/--y/--width/--height` 用于定位。
- `canvas eval` 接受内联 JS（`--js`）或位置参数。

### A2UI（画布）

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

注意：

- 仅支持 A2UI v0.8 JSONL（v0.9/createSurface 被拒绝）。

## 照片 + 视频（节点摄像头）

照片（`jpg`）：

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # 默认：两个方向（2 行 MEDIA）
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
```

视频剪辑（`mp4`）：

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

注意：

- `canvas.*` 和 `camera.*` 需要节点处于**前台**（后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 剪辑时长被限制（目前 `<= 60s`）以避免 base64 载荷过大。
- Android 会在可能时提示 `CAMERA`/`RECORD_AUDIO` 权限；被拒绝的权限以 `*_PERMISSION_REQUIRED` 失败。

## 屏幕录制（节点）

支持的节点暴露 `screen.record`（mp4）。示例：

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

注意：

- `screen.record` 可用性取决于节点平台。
- 屏幕录制被限制为 `<= 60s`。
- `--no-audio` 在支持的平台上禁用麦克风捕获。
- 当多个屏幕可用时，使用 `--screen <index>` 选择显示器。

## 位置（节点）

当在设置中启用位置时，节点暴露 `location.get`。

CLI 辅助工具：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

注意：

- 位置默认**关闭**。
- "始终"需要系统权限；后台获取为尽力而为。
- 响应包含纬度/经度、精度（米）和时间戳。

## 短信（Android 节点）

当用户授予**短信**权限且设备支持电话功能时，Android 节点可以暴露 `sms.send`。

低级别调用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

注意：

- 必须在 Android 设备上接受权限提示才能通告该功能。
- 没有电话功能的纯 WiFi 设备不会通告 `sms.send`。

## Android 设备 + 个人数据命令

当启用相应功能时，Android 节点可以通告额外的命令系列。

可用系列：

- `device.status`、`device.info`、`device.permissions`、`device.health`
- `notifications.list`、`notifications.actions`
- `photos.latest`
- `contacts.search`、`contacts.add`
- `calendar.events`、`calendar.add`
- `callLog.search`
- `sms.search`
- `motion.activity`、`motion.pedometer`

调用示例：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

注意：

- 运动命令受可用传感器的功能门控。

## 系统命令（节点主机 / Mac 节点）

macOS 节点暴露 `system.run`、`system.notify` 和 `system.execApprovals.get/set`。
无头节点主机暴露 `system.run`、`system.which` 和 `system.execApprovals.get/set`。

示例：

```bash
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
openclaw nodes invoke --node <idOrNameOrIp> --command system.which --params '{"name":"git"}'
```

注意：

- `system.run` 在载荷中返回 stdout/stderr/退出代码。
- Shell 执行现在通过带 `host=node` 的 `exec` 工具进行；`nodes` 仍然是显式节点命令的直接 RPC 接口。
- `nodes invoke` 不暴露 `system.run` 或 `system.run.prepare`；这些仅在 exec 路径上可用。
- exec 路径在批准前准备规范的 `systemRunPlan`。一旦
  批准被授予，网关转发存储的计划，而不是任何后来的
  调用者编辑的 command/cwd/session 字段。
- `system.notify` 在 macOS 应用上尊重通知权限状态。
- 无法识别的节点 `platform` / `deviceFamily` 元数据使用保守的默认允许列表，排除 `system.run` 和 `system.which`。如果你有意需要这些命令用于未知平台，请通过 `gateway.nodes.allowCommands` 显式添加它们。
- `system.run` 支持 `--cwd`、`--env KEY=VAL`、`--command-timeout` 和 `--needs-screen-recording`。
- 对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围的 `--env` 值被减少为显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 对于允许列表模式下的始终允许决策，已知的调度包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）持久化内部可执行文件路径而不是包装器路径。如果解包不安全，则不会自动持久化允许列表条目。
- 在允许列表模式下的 Windows 节点主机上，通过 `cmd.exe /c` 的 shell 包装器运行需要批准（仅允许列表条目不会自动允许包装器形式）。
- `system.notify` 支持 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- 节点主机忽略 `PATH` 覆盖并剥离危险的启动/shell 键（`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`）。如果你需要额外的 PATH 条目，请配置节点主机服务环境（或在标准位置安装工具），而不是通过 `--env` 传递 `PATH`。
- 在 macOS 节点模式下，`system.run` 由 macOS 应用中的执行批准控制（设置 → 执行批准）。Ask/allowlist/full 与无头节点主机行为相同；被拒绝的提示返回 `SYSTEM_RUN_DENIED`。
- 在无头节点主机上，`system.run` 由执行批准（`~/.openclaw/exec-approvals.json`）控制。

## 执行节点绑定

当多个节点可用时，你可以将 exec 绑定到特定节点。
这设置了 `exec host=node` 的默认节点（可以按智能体覆盖）。

全局默认值：

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

每个智能体覆盖：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

取消设置以允许任何节点：

```bash
openclaw config unset tools.exec.node
openclaw config unset agents.list[0].tools.exec.node
```

## 权限映射

节点可以在 `node.list` / `node.describe` 中包含 `permissions` 映射，以权限名称（例如 `screenRecording`、`accessibility`）为键，以布尔值（`true` = 已授予）为值。

## 无头节点主机（跨平台）

OpenClaw 可以运行**无头节点主机**（无 UI），它连接到 Gateway
WebSocket 并暴露 `system.run` / `system.which`。这在 Linux/Windows
或与服务器一起运行最小节点时很有用。

启动：

```bash
openclaw node run --host <gateway-host> --port 18789
```

注意：

- 仍然需要配对（Gateway 将显示设备配对提示）。
- 节点主机将其节点 ID、令牌、显示名称和网关连接信息存储在 `~/.openclaw/node.json`。
- 执行批准通过 `~/.openclaw/exec-approvals.json` 在本地强制执行
  （参见[执行批准](/tools/exec-approvals)）。
- 在 macOS 上，无头节点主机默认在本地执行 `system.run`。设置
  `OPENCLAW_NODE_EXEC_HOST=app` 以通过伴侣应用执行主机路由 `system.run`；添加
  `OPENCLAW_NODE_EXEC_FALLBACK=0` 以要求应用主机，如果不可用则失败关闭。
- 当 Gateway WS 使用 TLS 时添加 `--tls` / `--tls-fingerprint`。

## Mac 节点模式

- macOS 菜单栏应用作为节点连接到 Gateway WS 服务器（因此 `openclaw nodes …` 可以对这台 Mac 使用）。
- 在远程模式下，应用为 Gateway 端口打开 SSH 隧道并连接到 `localhost`。
