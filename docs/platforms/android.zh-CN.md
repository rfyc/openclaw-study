---
summary: "Android 应用（节点）：连接手册 + 连接/聊天/语音/画布命令接口"
read_when:
  - 配对或重新连接 Android 节点
  - 调试 Android 网关发现或认证
  - 验证跨客户端聊天历史记录一致性
title: "Android 应用"
---

<Note>
Android 应用尚未公开发布。源代码可在 [OpenClaw 仓库](https://github.com/openclaw/openclaw) 的 `apps/android` 下找到。你可以使用 Java 17 和 Android SDK 自行构建（`./gradlew :app:assemblePlayDebug`）。构建说明请参见 [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md)。
</Note>

## 支持概况

- 角色：伴侣节点应用（Android 不托管 Gateway）。
- 需要 Gateway：是（在 macOS、Linux 或通过 WSL2 的 Windows 上运行）。
- 安装：[入门指南](/start/getting-started) + [配对](/channels/pairing)。
- Gateway：[运行手册](/gateway) + [配置](/gateway/configuration)。
  - 协议：[Gateway 协议](/gateway/protocol)（节点 + 控制平面）。

## 系统控制

系统控制（launchd/systemd）位于 Gateway 主机。参见 [Gateway](/gateway)。

## 连接手册

Android 节点应用 ⇄（mDNS/NSD + WebSocket）⇄ **Gateway**

Android 直接连接到 Gateway WebSocket，并使用设备配对（`role: node`）。

对于 Tailscale 或公共主机，Android 需要安全端点：

- 推荐：Tailscale Serve / Funnel，使用 `https://<magicdns>` / `wss://<magicdns>`
- 也支持：任何其他带有真实 TLS 端点的 `wss://` Gateway URL
- 私有 LAN 地址 / `.local` 主机，以及 `localhost`、`127.0.0.1` 和 Android 模拟器桥接（`10.0.2.2`）仍支持明文 `ws://`

### 前提条件

- 你可以在"主"机器上运行 Gateway。
- Android 设备/模拟器可以访问网关 WebSocket：
  - 同一局域网通过 mDNS/NSD，**或**
  - 使用广域 Bonjour / 单播 DNS-SD 的同一 Tailscale 尾网（见下文），**或**
  - 手动网关主机/端口（回退）
- 尾网/公共移动配对**不使用**原始尾网 IP `ws://` 端点。改用 Tailscale Serve 或其他 `wss://` URL。
- 你可以在网关机器上（或通过 SSH）运行 CLI（`openclaw`）。

### 1) 启动 Gateway

```bash
openclaw gateway --port 18789 --verbose
```

在日志中确认你看到类似以下内容：

- `listening on ws://0.0.0.0:18789`

对于通过 Tailscale 的远程 Android 访问，优先使用 Serve/Funnel，而不是原始尾网绑定：

```bash
openclaw gateway --tailscale serve
```

这给 Android 提供一个安全的 `wss://` / `https://` 端点。普通的 `gateway.bind: "tailnet"` 设置对于首次远程 Android 配对来说是不够的，除非你也单独终止 TLS。

### 2) 验证发现（可选）

从网关机器：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多调试说明：[Bonjour](/gateway/bonjour)。

如果你也配置了广域发现域，与以下内容比较：

```bash
openclaw gateway discover --json
```

这在一次传递中显示 `local.` 加上配置的广域域，并使用解析的
服务端点而不是仅 TXT 提示。

#### 尾网（维也纳 ⇄ 伦敦）通过单播 DNS-SD 发现

Android NSD/mDNS 发现不会跨网络。如果你的 Android 节点和网关在不同的网络但通过 Tailscale 连接，请改用广域 Bonjour / 单播 DNS-SD。

仅发现对于尾网/公共 Android 配对是不够的。发现的路由仍然需要安全端点（`wss://` 或 Tailscale Serve）：

1. 在网关主机上设置 DNS-SD 区域（示例 `openclaw.internal.`）并发布 `_openclaw-gw._tcp` 记录。
2. 为你选择的域配置 Tailscale 分割 DNS，指向该 DNS 服务器。

详情和示例 CoreDNS 配置：[Bonjour](/gateway/bonjour)。

### 3) 从 Android 连接

在 Android 应用中：

- 应用通过**前台服务**（持久通知）保持网关连接活跃。
- 打开**连接**标签页。
- 使用**设置码**或**手动**模式。
- 如果发现被阻止，在**高级控件**中使用手动主机/端口。对于私有 LAN 主机，`ws://` 仍然可用。对于 Tailscale/公共主机，开启 TLS 并使用 `wss://` / Tailscale Serve 端点。

首次成功配对后，Android 在启动时自动重新连接：

- 手动端点（如果启用），否则
- 上次发现的网关（尽力而为）。

### 存在活跃信标

认证的节点会话连接后，以及应用在前台服务仍然连接时移到后台时，Android 调用 `node.event`，
`event: "node.presence.alive"`。仅在认证的节点设备身份已知后，
网关才将其记录为配对节点/设备元数据上的 `lastSeenAtMs`/`lastSeenReason`。

只有当网关响应包含 `handled: true` 时，应用才将信标计为成功记录。旧版网关可能以 `{ "ok": true }` 确认 `node.event`；该响应兼容但不算作持久的最后见到更新。

### 4) 批准配对（CLI）

在网关机器上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配对详情：[配对](/channels/pairing)。

可选：如果 Android 节点始终从严格控制的子网连接，
你可以选择加入首次节点自动批准，使用显式 CIDR 或精确 IP：

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

### 5) 验证节点已连接

- 通过节点状态：

  ```bash
  openclaw nodes status
  ```

- 通过 Gateway：

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) 聊天 + 历史记录

Android 聊天标签页支持会话选择（默认 `main`，以及其他现有会话）：

- 历史记录：`chat.history`（显示规范化；内联指令标签从可见文本中剥离，纯文本工具调用 XML 载荷（包括
  `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、
  `<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和
  截断的工具调用块）和泄露的 ASCII/全宽模型控制令牌被剥离，纯静默令牌助手行如精确的 `NO_REPLY` /
  `no_reply` 被省略，超大行可被占位符替换）
- 发送：`chat.send`
- 推送更新（尽力而为）：`chat.subscribe` → `event:"chat"`

### 7) 画布 + 摄像头

#### Gateway 画布主机（推荐用于 Web 内容）

如果你想让节点显示智能体可以在磁盘上编辑的真实 HTML/CSS/JS，将节点指向 Gateway 画布主机。

<Note>
节点从 Gateway HTTP 服务器加载画布（与 `gateway.port` 相同的端口，默认 `18789`）。
</Note>

1. 在网关主机上创建 `~/.openclaw/workspace/canvas/index.html`。

2. 将节点导航到该位置（LAN）：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

尾网（可选）：如果两台设备都在 Tailscale 上，使用 MagicDNS 名称或尾网 IP 而不是 `.local`，例如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

该服务器向 HTML 注入实时重载客户端，并在文件更改时重新加载。
A2UI 主机位于 `http://<gateway-host>:18789/__openclaw__/a2ui/`。

画布命令（仅限前台）：

- `canvas.eval`、`canvas.snapshot`、`canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 返回默认脚手架）。`canvas.snapshot` 返回 `{ format, base64 }`（默认 `format="jpeg"`）。
- A2UI：`canvas.a2ui.push`、`canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 旧版别名）

摄像头命令（仅限前台；权限门控）：

- `camera.snap`（jpg）
- `camera.clip`（mp4）

参数和 CLI 辅助工具请参见[摄像头节点](/nodes/camera)。

### 8) 语音 + 扩展的 Android 命令接口

- 语音标签页：Android 有两种显式捕获模式。**麦克风**是手动语音标签页会话，将每次停顿作为聊天轮次发送，并在应用离开前台或用户离开语音标签页时停止。**Talk** 是连续 Talk 模式，保持监听直到关闭或节点断开连接。
- Talk 模式在捕获开始前将现有前台服务从 `dataSync` 提升到 `dataSync|microphone`，Talk 模式停止时降级。Android 14+ 需要 `FOREGROUND_SERVICE_MICROPHONE` 声明、`RECORD_AUDIO` 运行时授权以及运行时的麦克风服务类型。
- 口语回复通过配置的网关 Talk 提供商使用 `talk.speak`。仅当 `talk.speak` 不可用时才使用本地系统 TTS。
- 语音唤醒在 Android UX/运行时中仍然禁用。
- 其他 Android 命令系列（可用性取决于设备 + 权限）：
  - `device.status`、`device.info`、`device.permissions`、`device.health`
  - `notifications.list`、`notifications.actions`（参见下面的[通知转发](#通知转发)）
  - `photos.latest`
  - `contacts.search`、`contacts.add`
  - `calendar.events`、`calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`、`motion.pedometer`

## 助手入口点

Android 支持从系统助手触发器（Google 助手）启动 OpenClaw。
配置后，按住主页按钮或说"Hey Google，问 OpenClaw..."会打开应用
并将提示传递到聊天输入框。

这使用应用清单中声明的 Android **应用操作**元数据。网关端
不需要额外配置——助手意图完全由 Android 应用处理
并作为普通聊天消息转发。

<Note>
应用操作可用性取决于设备、Google Play 服务版本，
以及用户是否将 OpenClaw 设置为默认助手应用。
</Note>

## 通知转发

Android 可以将设备通知作为事件转发到网关。多个控件允许你确定转发哪些通知以及何时转发。

| 键                               | 类型           | 描述                                                      |
| -------------------------------- | -------------- | --------------------------------------------------------- |
| `notifications.allowPackages`    | string[]       | 仅转发来自这些包名的通知。如果设置，所有其他包都被忽略。  |
| `notifications.denyPackages`     | string[]       | 永不转发来自这些包名的通知。在 `allowPackages` 之后应用。 |
| `notifications.quietHours.start` | string (HH:mm) | 静默时段开始时间（设备本地时间）。此时段内通知被抑制。    |
| `notifications.quietHours.end`   | string (HH:mm) | 静默时段结束时间。                                        |
| `notifications.rateLimit`        | number         | 每个包每分钟最大转发通知数。超出的通知被丢弃。            |

通知选择器还对转发的通知事件使用更安全的行为，防止意外转发敏感的系统通知。

配置示例：

```json5
{
  notifications: {
    allowPackages: ["com.slack", "com.whatsapp"],
    denyPackages: ["com.android.systemui"],
    quietHours: {
      start: "22:00",
      end: "07:00",
    },
    rateLimit: 5,
  },
}
```

<Note>
通知转发需要 Android 通知监听器权限。应用在设置期间提示此权限。
</Note>

## 相关

- [iOS 应用](/platforms/ios)
- [节点](/nodes)
- [Android 节点故障排除](/nodes/troubleshooting)
