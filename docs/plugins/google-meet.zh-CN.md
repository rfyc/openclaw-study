---
summary: "Google Meet 插件：通过 Chrome 或 Twilio 加入显式 Meet URL，使用 agent 对话回复默认值"
read_when:
  - 你希望 OpenClaw agent 加入 Google Meet 通话
  - 你希望 OpenClaw agent 创建新的 Google Meet 通话
  - 你正在配置 Chrome、Chrome 节点或 Twilio 作为 Google Meet 传输方式
title: "Google Meet 插件"
---

OpenClaw 的 Google Meet 参与者支持——该插件在设计上是显式的：

- 它只加入显式的 `https://meet.google.com/...` URL。
- 它可以通过 Google Meet API 创建新的 Meet 空间，然后加入返回的 URL。
- `agent` 是默认的对话回复模式：实时转录监听，配置的 OpenClaw agent 回答，普通 OpenClaw TTS 通过 Meet 发言。
- `bidi` 仍作为回退的直接实时语音模型模式可用。
- Agent 使用 `mode` 选择加入行为：使用 `agent` 进行实时监听/对话回复，使用 `bidi` 进行直接实时语音回退，或使用 `transcribe` 在不使用对话回复桥接的情况下加入/控制浏览器。
- 认证从个人 Google OAuth 或已登录的 Chrome 配置文件开始。
- 没有自动同意公告。
- 默认 Chrome 音频后端是 `BlackHole 2ch`。
- Chrome 可以在本地或配对节点宿主上运行。
- Twilio 接受拨入号码加可选 PIN 或 DTMF 序列；它无法直接拨打 Meet URL。
- CLI 命令是 `googlemeet`；`meet` 保留用于更广泛的 agent 电话会议工作流。

## 快速入门

安装本地音频依赖，并配置实时转录提供商加普通 OpenClaw TTS。OpenAI 是默认转录提供商；Google Gemini Live 也可以作为单独的 `bidi` 语音回退，配合 `realtime.voiceProvider: "google"`：

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# 仅在 realtime.voiceProvider 为 bidi 模式的 "google" 时需要
export GEMINI_API_KEY=...
```

`blackhole-2ch` 安装 `BlackHole 2ch` 虚拟音频设备。Homebrew 的安装程序需要重启才能让 macOS 暴露该设备：

```bash
sudo reboot
```

重启后，验证两者：

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

启用插件：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {},
      },
    },
  },
}
```

检查设置：

```bash
openclaw googlemeet setup
```

设置输出旨在让 agent 可读且模式感知。它报告 Chrome 配置文件、节点固定以及对于实时 Chrome 加入，BlackHole/SoX 音频桥接和延迟实时介绍检查。对于仅观察加入，使用 `--mode transcribe` 检查相同的传输；该模式跳过实时音频先决条件，因为它不通过桥接监听或发言：

```bash
openclaw googlemeet setup --transport chrome-node --mode transcribe
```

当配置了 Twilio 委托时，setup 还报告 `voice-call` 插件、Twilio 凭据和公共 webhook 暴露是否就绪。在要求 agent 加入之前，将任何 `ok: false` 检查视为已检查传输和模式的阻塞项。使用 `openclaw googlemeet setup --json` 用于脚本或机器可读输出。使用 `--transport chrome`、`--transport chrome-node` 或 `--transport twilio` 在 agent 尝试之前预检特定传输。

对于 Twilio，当默认传输是 Chrome 时，始终明确预检传输：

```bash
openclaw googlemeet setup --transport twilio
```

这在 agent 尝试拨打会议之前捕获缺失的 `voice-call` 连接、Twilio 凭据或无法访问的 webhook 暴露。

加入会议：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

或让 agent 通过 `google_meet` 工具加入：

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "agent"
}
```

面向 agent 的 `google_meet` 工具在非 macOS 宿主上对于构件、日历、设置、转录、Twilio 和 `chrome-node` 流仍可用。本地 Chrome 对话回复操作在那里被阻止，因为捆绑的 Chrome 音频路径目前依赖 macOS `BlackHole 2ch`。在 Linux 上，使用 `mode: "transcribe"`、Twilio 拨入或 macOS `chrome-node` 宿主进行 Chrome 对话回复参与。

创建新会议并加入：

```bash
openclaw googlemeet create --transport chrome-node --mode agent
```

对于 API 创建的房间，当你希望房间的免敲门策略是显式的而非从 Google 账号默认值继承时，使用 Google Meet `SpaceConfig.accessType`：

```bash
openclaw googlemeet create --access-type OPEN --transport chrome-node --mode agent
```

`OPEN` 让任何拥有 Meet URL 的人无需敲门即可加入。`TRUSTED` 让宿主组织的受信任用户、受邀的外部用户和拨入用户无需敲门即可加入。`RESTRICTED` 将免敲门入场限制为受邀者。这些设置仅适用于官方 Google Meet API 创建路径，因此必须配置 OAuth 凭据。

如果你在此选项可用之前对 Google Meet 进行了认证，请在将 `meetings.space.settings` 范围添加到 Google OAuth 同意屏幕后重新运行 `openclaw googlemeet auth login --json`。

仅创建 URL 而不加入：

```bash
openclaw googlemeet create --no-join
```

`googlemeet create` 有两条路径：

- API 创建：当配置了 Google Meet OAuth 凭据时使用。这是最确定性的路径，不依赖浏览器 UI 状态。
- 浏览器回退：当 OAuth 凭据不存在时使用。OpenClaw 使用固定的 Chrome 节点，打开 `https://meet.google.com/new`，等待 Google 重定向到真实的会议代码 URL，然后返回该 URL。此路径需要节点上的 OpenClaw Chrome 配置文件已登录 Google。浏览器自动化处理 Meet 自己的首次运行麦克风提示；该提示不被视为 Google 登录失败。加入和创建流程也尝试在打开新标签页之前重用现有的 Meet 标签页。匹配忽略无害的 URL 查询字符串，如 `authuser`，因此 agent 重试应该聚焦到已打开的会议，而非创建第二个 Chrome 标签页。

命令/工具输出包括 `source` 字段（`api` 或 `browser`），以便 agent 可以解释使用了哪条路径。`create` 默认加入新会议并返回 `joined: true` 加上加入会话。要只铸造 URL，请在 CLI 上使用 `create --no-join` 或向工具传递 `"join": false`。

或者告诉 agent："创建一个 Google Meet，使用 agent 对话回复模式加入它，并将链接发给我。" Agent 应使用 `action: "create"` 调用 `google_meet`，然后分享返回的 `meetingUri`。

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "agent"
}
```

对于仅观察/浏览器控制加入，设置 `"mode": "transcribe"`。这不启动双工实时语音桥接，不需要 BlackHole 或 SoX，也不会回复到会议中。此模式下的 Chrome 加入也避免了 OpenClaw 的麦克风/摄像头权限授予，并避免 Meet **使用麦克风**路径。如果 Meet 显示音频选择插页，自动化尝试无麦克风路径，否则报告手动操作而非打开本地麦克风。在转录模式下，托管 Chrome 传输还安装了一个尽力而为的 Meet 字幕观察器。`googlemeet status --json` 和 `googlemeet doctor` 暴露 `captioning`、`captionsEnabledAttempted`、`transcriptLines`、`lastCaptionAt`、`lastCaptionSpeaker`、`lastCaptionText` 以及短 `recentTranscript` 尾部，以便运营商可以判断浏览器是否加入了通话以及 Meet 字幕是否在生成文本。使用 `openclaw googlemeet test-listen <meet-url> --transport chrome-node` 当你需要是/否探测时：它以转录模式加入，等待新鲜的字幕或转录移动，并返回 `listenVerified`、`listenTimedOut`、手动操作字段以及最新字幕健康状态。

在实时会话期间，`google_meet` status 包括浏览器和音频桥接健康状态，如 `inCall`、`manualActionRequired`、`providerConnected`、`realtimeReady`、`audioInputActive`、`audioOutputActive`、最后输入/输出时间戳、字节计数器和桥接关闭状态。如果出现安全的 Meet 页面提示，浏览器自动化在可能时处理它。登录、宿主准入和浏览器/OS 权限提示作为带原因和消息的手动操作报告，供 agent 中继。托管 Chrome 会话仅在浏览器健康状态报告 `inCall: true` 后发出介绍或测试短语；否则状态报告 `speechReady: false`，语音尝试被阻止而非假装 agent 说进了会议。

本地 Chrome 通过登录的 OpenClaw 浏览器配置文件加入。实时模式需要 `BlackHole 2ch` 用于 OpenClaw 使用的麦克风/扬声器路径。对于干净的双工音频，使用单独的虚拟设备或 Loopback 风格的图；单个 BlackHole 设备对于第一次冒烟测试足够，但可能产生回声。

### 本地 Gateway + Parallels Chrome

你**不**需要在 macOS VM 内运行完整的 OpenClaw Gateway 或模型 API 密钥，只是为了让 VM 拥有 Chrome。在本地运行 Gateway 和 agent，然后在 VM 中运行节点宿主。在 VM 上一次性启用捆绑插件，以便节点宣传 Chrome 命令：

各处运行的内容：

- Gateway 宿主：OpenClaw Gateway、agent 工作区、模型/API 密钥、实时提供商和 Google Meet 插件配置。
- Parallels macOS VM：OpenClaw CLI/节点宿主、Google Chrome、SoX、BlackHole 2ch 以及已登录 Google 的 Chrome 配置文件。
- VM 中不需要：Gateway 服务、agent 配置、OpenAI/GPT 密钥或模型提供商设置。

在 VM 中安装依赖：

```bash
brew install blackhole-2ch sox
```

安装 BlackHole 后重启 VM，以便 macOS 暴露 `BlackHole 2ch`：

```bash
sudo reboot
```

重启后，验证 VM 可以看到音频设备和 SoX 命令：

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

在 VM 中安装或更新 OpenClaw，然后在那里启用捆绑插件：

```bash
openclaw plugins enable google-meet
```

在 VM 中启动节点宿主：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name parallels-macos
```

如果 `<gateway-host>` 是 LAN IP 且你没有使用 TLS，节点拒绝明文 WebSocket，除非你为受信任的私有网络选择加入：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

将节点安装为 LaunchAgent 时使用相同的环境变量：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install --host <gateway-lan-ip> --port 18789 --display-name parallels-macos --force
openclaw node restart
```

`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 是进程环境，而非 `openclaw.json` 设置。当安装命令中存在时，`openclaw node install` 将其存储在 LaunchAgent 环境中。

从 Gateway 宿主批准节点：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

确认 Gateway 看到节点，并且它宣传了 `googlemeet.chrome` 和浏览器能力/`browser.proxy`：

```bash
openclaw nodes status
```

在 Gateway 宿主上通过该节点路由 Meet：

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["googlemeet.chrome", "browser.proxy"],
    },
  },
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          defaultTransport: "chrome-node",
          chrome: {
            guestName: "OpenClaw Agent",
            autoJoin: true,
            reuseExistingTab: true,
          },
          chromeNode: {
            node: "parallels-macos",
          },
        },
      },
    },
  },
}
```

现在从 Gateway 宿主正常加入：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

或要求 agent 使用带 `transport: "chrome-node"` 的 `google_meet` 工具。

对于创建或重用会话、说出已知短语并打印会话健康状态的一命令冒烟测试：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij
```

在实时加入期间，OpenClaw 浏览器自动化填写来宾名称、点击加入/要求加入，并在出现提示时接受 Meet 的首次运行"使用麦克风"选择。在仅观察加入或仅浏览器会议创建期间，它在该提示可用时不使用麦克风继续。如果浏览器配置文件未登录、Meet 正在等待宿主准入、Chrome 需要实时加入的麦克风/摄像头权限，或 Meet 卡在自动化无法解决的提示上，加入/test-speech 结果报告 `manualActionRequired: true`，带有 `manualActionReason` 和 `manualActionMessage`。Agent 应停止重试加入，报告确切的消息加上当前的 `browserUrl`/`browserTitle`，并仅在手动浏览器操作完成后重试。

如果省略 `chromeNode.node`，仅当恰好一个连接的节点同时宣传 `googlemeet.chrome` 和浏览器控制时，OpenClaw 才自动选择。如果连接了多个有能力的节点，将 `chromeNode.node` 设置为节点 id、显示名称或远程 IP。

常见故障检查：

- `Configured Google Meet node ... is not usable: offline`：固定的节点对 Gateway 已知但不可用。Agent 应将该节点视为诊断状态而非可用的 Chrome 宿主，并报告设置阻塞项，而非回退到另一个传输，除非用户要求这样做。
- `No connected Google Meet-capable node`：在 VM 中启动 `openclaw node run`，批准配对，并确保 `openclaw plugins enable google-meet` 和 `openclaw plugins enable browser` 已在 VM 中运行。还要确认 Gateway 宿主允许两个节点命令，配合 `gateway.nodes.allowCommands: ["googlemeet.chrome", "browser.proxy"]`。
- `BlackHole 2ch audio device not found`：在被检查的宿主上安装 `blackhole-2ch` 并在使用本地 Chrome 音频之前重启。
- `BlackHole 2ch audio device not found on the node`：在 VM 中安装 `blackhole-2ch` 并重启 VM。
- Chrome 打开但无法加入：在 VM 内登录浏览器配置文件，或保持 `chrome.guestName` 设置以进行来宾加入。来宾自动加入通过节点浏览器代理使用 OpenClaw 浏览器自动化；确保节点浏览器配置指向你想要的配置文件，例如 `browser.defaultProfile: "user"` 或命名的现有会话配置文件。
- 重复的 Meet 标签页：保持 `chrome.reuseExistingTab: true` 启用。OpenClaw 在打开新标签页之前为相同的 Meet URL 激活现有标签页，浏览器会议创建在打开另一个标签页之前重用进行中的 `https://meet.google.com/new` 或 Google 账号提示标签页。
- 无音频：在 Meet 中，通过 OpenClaw 使用的虚拟音频设备路径路由麦克风/扬声器；使用单独的虚拟设备或 Loopback 风格的路由以获得干净的双工音频。

## 安装说明

Chrome 对话回复默认使用两个外部工具：

- `sox`：命令行音频工具。插件使用显式 CoreAudio 设备命令用于默认的 24 kHz PCM16 音频桥接。
- `blackhole-2ch`：macOS 虚拟音频驱动程序。它创建 Chrome/Meet 可以路由通过的 `BlackHole 2ch` 音频设备。

OpenClaw 不捆绑或重新分发任何一个包。文档要求用户通过 Homebrew 将它们作为宿主依赖安装。SoX 以 `LGPL-2.0-only AND GPL-2.0-only` 许可；BlackHole 以 GPL-3.0 许可。如果你构建了捆绑 BlackHole 与 OpenClaw 的安装程序或设备，请查看 BlackHole 的上游许可条款或从 Existential Audio 获取单独许可证。

## 传输方式

### Chrome

Chrome 传输通过 OpenClaw 浏览器控制打开 Meet URL，并作为登录的 OpenClaw 浏览器配置文件加入。在 macOS 上，插件在启动前检查 `BlackHole 2ch`。如果配置了，它还在打开 Chrome 之前运行音频桥接健康命令和启动命令。当 Chrome/音频在 Gateway 宿主上时使用 `chrome`；当 Chrome/音频在配对节点（如 Parallels macOS VM）上时使用 `chrome-node`。对于本地 Chrome，使用 `browser.defaultProfile` 选择配置文件；`chrome.browserProfile` 传递给 `chrome-node` 宿主。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome-node
```

通过本地 OpenClaw 音频桥接路由 Chrome 麦克风和扬声器音频。如果未安装 `BlackHole 2ch`，加入会因设置错误而失败，而非静默地加入而没有音频路径。

### Twilio

Twilio 传输是委托给 Voice Call 插件的严格拨号计划。它不解析 Meet 页面的电话号码。

当 Chrome 参与不可用或你想要电话拨入回退时使用此方式。Google Meet 必须为会议暴露电话拨入号码和 PIN；OpenClaw 不从 Meet 页面发现这些。

在 Gateway 宿主上启用 Voice Call 插件，而非 Chrome 节点：

```json5
{
  plugins: {
    allow: ["google-meet", "voice-call", "google"],
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          defaultTransport: "chrome-node",
          // 或者如果 Twilio 应该是默认值，设置 "twilio"
        },
      },
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          inboundPolicy: "allowlist",
          realtime: {
            enabled: true,
            provider: "google",
            instructions: "Join this Google Meet as an OpenClaw agent. Be brief.",
            toolPolicy: "safe-read-only",
            providers: {
              google: {
                silenceDurationMs: 500,
                startSensitivity: "high",
              },
            },
          },
        },
      },
      google: {
        enabled: true,
      },
    },
  },
}
```

通过环境或配置提供 Twilio 凭据。环境将秘密保留在 `openclaw.json` 之外：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
export GEMINI_API_KEY=...
```

如果那是你的实时语音提供商，改用带 OpenAI 提供商插件和 `OPENAI_API_KEY` 的 `realtime.provider: "openai"`。

启用 `voice-call` 后重启或重载 Gateway；插件配置更改在已运行的 Gateway 进程重载之前不会出现。

然后验证：

```bash
openclaw config validate
openclaw plugins list | grep -E 'google-meet|voice-call'
openclaw googlemeet setup
```

当 Twilio 委托连接时，`googlemeet setup` 包括成功的 `twilio-voice-call-plugin`、`twilio-voice-call-credentials` 和 `twilio-voice-call-webhook` 检查。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

当会议需要自定义序列时使用 `--dtmf-sequence`：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

## OAuth 和预检

OAuth 对于创建 Meet 链接是可选的，因为 `googlemeet create` 可以回退到浏览器自动化。当你需要官方 API 创建、空间解析或 Meet Media API 预检时配置 OAuth。

Google Meet API 访问使用用户 OAuth：创建 Google Cloud OAuth 客户端，请求所需范围，授权 Google 账号，然后将结果刷新令牌存储在 Google Meet 插件配置中或提供 `OPENCLAW_GOOGLE_MEET_*` 环境变量。

OAuth 不替代 Chrome 加入路径。Chrome 和 Chrome 节点传输仍通过登录的 Chrome 配置文件、BlackHole/SoX 和连接的节点进行浏览器参与。OAuth 仅用于官方 Google Meet API 路径：创建会议空间、解析空间和运行 Meet Media API 预检检查。

### 创建 Google 凭据

在 Google Cloud Console 中：

1. 创建或选择 Google Cloud 项目。
2. 为该项目启用 **Google Meet REST API**。
3. 配置 OAuth 同意屏幕。
   - **Internal** 对于 Google Workspace 组织最简单。
   - **External** 适用于个人/测试设置；当应用处于测试状态时，将每个将授权应用的 Google 账号添加为测试用户。
4. 添加 OpenClaw 请求的范围：
   - `https://www.googleapis.com/auth/meetings.space.created`
   - `https://www.googleapis.com/auth/meetings.space.readonly`
   - `https://www.googleapis.com/auth/meetings.space.settings`
   - `https://www.googleapis.com/auth/meetings.conference.media.readonly`
5. 创建 OAuth 客户端 ID。
   - 应用类型：**Web application**。
   - 授权的重定向 URI：

     ```text
     http://localhost:8085/oauth2callback
     ```

6. 复制客户端 ID 和客户端密钥。

`meetings.space.created` 是 Google Meet `spaces.create` 所需的。`meetings.space.readonly` 让 OpenClaw 将 Meet URL/代码解析为空间。`meetings.space.settings` 让 OpenClaw 在 API 房间创建期间传递 `SpaceConfig` 设置，如 `accessType`。`meetings.conference.media.readonly` 用于 Meet Media API 预检和媒体工作；Google 可能要求实际 Media API 使用的开发者预览注册。如果你只需要基于浏览器的 Chrome 加入，完全跳过 OAuth。

### 铸造刷新令牌

配置 `oauth.clientId` 和可选的 `oauth.clientSecret`，或将其作为环境变量传递，然后运行：

```bash
openclaw googlemeet auth login --json
```

该命令打印带刷新令牌的 `oauth` 配置块。它使用 PKCE、`http://localhost:8085/oauth2callback` 上的本地回调以及带 `--manual` 的手动复制/粘贴流程。

示例：

```bash
OPENCLAW_GOOGLE_MEET_CLIENT_ID="your-client-id" \
OPENCLAW_GOOGLE_MEET_CLIENT_SECRET="your-client-secret" \
openclaw googlemeet auth login --json
```

当浏览器无法访问本地回调时使用手动模式：

```bash
OPENCLAW_GOOGLE_MEET_CLIENT_ID="your-client-id" \
OPENCLAW_GOOGLE_MEET_CLIENT_SECRET="your-client-secret" \
openclaw googlemeet auth login --json --manual
```

JSON 输出包括：

```json
{
  "oauth": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "refreshToken": "refresh-token",
    "accessToken": "access-token",
    "expiresAt": 1770000000000
  },
  "scope": "..."
}
```

将 `oauth` 对象存储在 Google Meet 插件配置下：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          oauth: {
            clientId: "your-client-id",
            clientSecret: "your-client-secret",
            refreshToken: "refresh-token",
          },
        },
      },
    },
  },
}
```

当你不希望刷新令牌在配置中时，优先使用环境变量。如果配置和环境值都存在，插件首先解析配置，然后回退到环境。

OAuth 同意包括 Meet 空间创建、Meet 空间读取访问和 Meet 会议媒体读取访问。如果你在会议创建支持存在之前进行了认证，重新运行 `openclaw googlemeet auth login --json`，使刷新令牌具有 `meetings.space.created` 范围。

### 使用 doctor 验证 OAuth

当你需要快速、非秘密的健康检查时运行 OAuth doctor：

```bash
openclaw googlemeet doctor --oauth --json
```

这不加载 Chrome 运行时或需要连接的 Chrome 节点。它检查 OAuth 配置是否存在以及刷新令牌是否可以铸造访问令牌。JSON 报告仅包括状态字段，如 `ok`、`configured`、`tokenSource`、`expiresAt` 和检查消息；它不打印访问令牌、刷新令牌或客户端密钥。

常见结果：

| 检查                 | 含义                                                             |
| -------------------- | ---------------------------------------------------------------- |
| `oauth-config`       | `oauth.clientId` 加 `oauth.refreshToken`，或缓存的访问令牌存在。 |
| `oauth-token`        | 缓存的访问令牌仍有效，或刷新令牌铸造了新的访问令牌。             |
| `meet-spaces-get`    | 可选的 `--meeting` 检查解析了现有的 Meet 空间。                  |
| `meet-spaces-create` | 可选的 `--create-space` 检查创建了新的 Meet 空间。               |

要同时证明 Google Meet API 启用和 `spaces.create` 范围，运行有副作用的创建检查：

```bash
openclaw googlemeet doctor --oauth --create-space --json
openclaw googlemeet create --no-join --json
```

`--create-space` 创建一个临时 Meet URL。当你需要确认 Google Cloud 项目已启用 Meet API 且授权账号具有 `meetings.space.created` 范围时使用它。

要证明现有会议空间的读取访问权限：

```bash
openclaw googlemeet doctor --oauth --meeting https://meet.google.com/abc-defg-hij --json
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

`doctor --oauth --meeting` 和 `resolve-space` 证明对授权 Google 账号可以访问的现有空间的读取访问权限。这些检查中的 `403` 通常意味着 Google Meet REST API 已禁用、已同意的刷新令牌缺少必需范围，或 Google 账号无法访问该 Meet 空间。刷新令牌错误意味着重新运行 `openclaw googlemeet auth login --json` 并存储新的 `oauth` 块。

浏览器回退不需要 OAuth 凭据。在该模式下，Google 认证来自所选节点上的已登录 Chrome 配置文件，而非 OpenClaw 配置。

这些环境变量作为回退被接受：

- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` 或 `GOOGLE_MEET_CLIENT_ID`
- `OPENCLAW_GOOGLE_MEET_CLIENT_SECRET` 或 `GOOGLE_MEET_CLIENT_SECRET`
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` 或 `GOOGLE_MEET_REFRESH_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` 或 `GOOGLE_MEET_ACCESS_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` 或 `GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT`
- `OPENCLAW_GOOGLE_MEET_DEFAULT_MEETING` 或 `GOOGLE_MEET_DEFAULT_MEETING`
- `OPENCLAW_GOOGLE_MEET_PREVIEW_ACK` 或 `GOOGLE_MEET_PREVIEW_ACK`

通过 `spaces.get` 解析 Meet URL、代码或 `spaces/{id}`：

```bash
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

在媒体工作之前运行预检：

```bash
openclaw googlemeet preflight --meeting https://meet.google.com/abc-defg-hij
```

Meet 创建会议记录后列出会议构件和出勤情况：

```bash
openclaw googlemeet artifacts --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet attendance --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet export --meeting https://meet.google.com/abc-defg-hij --output ./meet-export
```

使用 `--meeting` 时，`artifacts` 和 `attendance` 默认使用最新的会议记录。当你需要该会议的每个保留记录时，传递 `--all-conference-records`。

日历查找可以在读取 Meet 构件之前从 Google 日历解析会议 URL：

```bash
openclaw googlemeet latest --today
openclaw googlemeet calendar-events --today --json
openclaw googlemeet artifacts --event "Weekly sync"
openclaw googlemeet attendance --today --format csv --output attendance.csv
```

`--today` 搜索今天的 `primary` 日历中带有 Google Meet 链接的日历事件。使用 `--event <query>` 搜索匹配的事件文本，`--calendar <id>` 用于非主要日历。日历查找需要包含日历事件只读范围的新鲜 OAuth 登录。`calendar-events` 预览匹配的 Meet 事件，并标记 `latest`、`artifacts`、`attendance` 或 `export` 将选择的事件。

如果你已经知道会议记录 id，直接访问它：

```bash
openclaw googlemeet latest --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 --json
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 --json
```

当你想在通话后关闭房间时，结束 API 创建空间的活跃会议：

```bash
openclaw googlemeet end-active-conference https://meet.google.com/abc-defg-hij
```

这调用 Google Meet `spaces.endActiveConference`，需要对授权账号可以管理的空间具有 `meetings.space.created` 范围的 OAuth。OpenClaw 接受 Meet URL、会议代码或 `spaces/{id}` 输入，并在结束活跃会议之前将其解析为 API 空间资源。它与 `googlemeet leave` 分开：`leave` 停止 OpenClaw 的本地/会话参与，而 `end-active-conference` 要求 Google Meet 结束空间的活跃会议。

写入可读报告：

```bash
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 \
  --format markdown --output meet-artifacts.md
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 \
  --format markdown --output meet-attendance.md
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 \
  --format csv --output meet-attendance.csv
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --zip --output meet-export
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --dry-run
```

`artifacts` 返回会议记录元数据加上 Google 为会议暴露时的参与者、录音、转录、结构化转录条目和智能笔记资源元数据。使用 `--no-transcript-entries` 跳过大型会议的条目查找。`attendance` 将参与者展开为带首次/最后一次出现时间、总会话时长、迟到/早退标志的参与者会话行，并按已登录用户或显示名称合并重复的参与者资源。传递 `--no-merge-duplicates` 以保持原始参与者资源分开，`--late-after-minutes` 调整迟到检测，`--early-before-minutes` 调整早退检测。

`export` 写入包含 `summary.md`、`attendance.csv`、`transcript.md`、`artifacts.json`、`attendance.json` 和 `manifest.json` 的文件夹。`manifest.json` 记录选择的输入、导出选项、会议记录、输出文件、计数、令牌来源、使用的日历事件（如果有）以及任何部分检索警告。传递 `--zip` 也在文件夹旁边写一个可移植存档。传递 `--include-doc-bodies` 通过 Google Drive `files.export` 导出链接的转录和智能笔记 Google Docs 文本；这需要包含 Drive Meet 只读范围的新鲜 OAuth 登录。没有 `--include-doc-bodies`，导出仅包含 Meet 元数据和结构化转录条目。如果 Google 返回部分构件失败，如智能笔记列表、转录条目或 Drive 文档正文错误，摘要和清单保留警告而非使整个导出失败。使用 `--dry-run` 获取相同的构件/出勤数据并打印清单 JSON 而不创建文件夹或 ZIP。这在写入大型导出之前或当 agent 只需要计数、所选记录和警告时有用。

Agent 也可以通过 `google_meet` 工具创建相同的包：

```json
{
  "action": "export",
  "conferenceRecord": "conferenceRecords/abc123",
  "includeDocumentBodies": true,
  "outputDir": "meet-export",
  "zip": true
}
```

设置 `"dryRun": true` 仅返回导出清单并跳过文件写入。

Agent 也可以创建带显式访问策略的 API 支持的房间：

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "agent",
  "accessType": "OPEN"
}
```

还可以结束已知房间的活跃会议：

```json
{
  "action": "end_active_conference",
  "meeting": "https://meet.google.com/abc-defg-hij"
}
```

对于先监听验证，agent 应在声称会议有用之前使用 `test_listen`：

```json
{
  "action": "test_listen",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "timeoutMs": 30000
}
```

针对真实保留会议运行受保护的实时冒烟：

```bash
OPENCLAW_LIVE_TEST=1 \
OPENCLAW_GOOGLE_MEET_LIVE_MEETING=https://meet.google.com/abc-defg-hij \
pnpm test:live -- extensions/google-meet/google-meet.live.test.ts
```

针对有人会说话且 Meet 字幕可用的会议运行实时先监听浏览器探测：

```bash
openclaw googlemeet setup --transport chrome-node --mode transcribe
openclaw googlemeet test-listen https://meet.google.com/abc-defg-hij --transport chrome-node --timeout-ms 30000
```

实时冒烟环境：

- `OPENCLAW_LIVE_TEST=1` 启用受保护的实时测试。
- `OPENCLAW_GOOGLE_MEET_LIVE_MEETING` 指向保留的 Meet URL、代码或 `spaces/{id}`。
- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` 或 `GOOGLE_MEET_CLIENT_ID` 提供 OAuth 客户端 id。
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` 或 `GOOGLE_MEET_REFRESH_TOKEN` 提供刷新令牌。
- 可选：`OPENCLAW_GOOGLE_MEET_CLIENT_SECRET`、`OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` 和 `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` 使用没有 `OPENCLAW_` 前缀的相同回退名称。

基础构件/出勤实时冒烟需要 `https://www.googleapis.com/auth/meetings.space.readonly` 和 `https://www.googleapis.com/auth/meetings.conference.media.readonly`。日历查找需要 `https://www.googleapis.com/auth/calendar.events.readonly`。Drive 文档正文导出需要 `https://www.googleapis.com/auth/drive.meet.readonly`。

创建新的 Meet 空间：

```bash
openclaw googlemeet create
```

命令打印新的 `meeting uri`、来源和加入会话。有 OAuth 凭据时使用官方 Google Meet API。没有 OAuth 凭据时使用固定 Chrome 节点的已登录浏览器配置文件作为回退。Agent 可以使用带 `action: "create"` 的 `google_meet` 工具一步创建并加入。仅 URL 创建时传递 `"join": false`。

来自浏览器回退的示例 JSON 输出：

```json
{
  "source": "browser",
  "meetingUri": "https://meet.google.com/abc-defg-hij",
  "joined": true,
  "browser": {
    "nodeId": "ba0f4e4bc...",
    "targetId": "tab-1"
  },
  "join": {
    "session": {
      "id": "meet_...",
      "url": "https://meet.google.com/abc-defg-hij"
    }
  }
}
```

如果浏览器回退在创建 URL 之前遇到 Google 登录或 Meet 权限阻塞器，Gateway 方法返回失败响应，`google_meet` 工具返回结构化详情而非普通字符串：

```json
{
  "source": "browser",
  "error": "google-login-required: Sign in to Google in the OpenClaw browser profile, then retry meeting creation.",
  "manualActionRequired": true,
  "manualActionReason": "google-login-required",
  "manualActionMessage": "Sign in to Google in the OpenClaw browser profile, then retry meeting creation.",
  "browser": {
    "nodeId": "ba0f4e4bc...",
    "targetId": "tab-1",
    "browserUrl": "https://accounts.google.com/signin",
    "browserTitle": "Sign in - Google Accounts"
  }
}
```

当 agent 看到 `manualActionRequired: true` 时，它应该报告 `manualActionMessage` 加上浏览器节点/标签上下文，并在运营商完成浏览器步骤之前停止打开新的 Meet 标签页。

来自 API 创建的示例 JSON 输出：

```json
{
  "source": "api",
  "meetingUri": "https://meet.google.com/abc-defg-hij",
  "joined": true,
  "space": {
    "name": "spaces/abc-defg-hij",
    "meetingCode": "abc-defg-hij",
    "meetingUri": "https://meet.google.com/abc-defg-hij"
  },
  "join": {
    "session": {
      "id": "meet_...",
      "url": "https://meet.google.com/abc-defg-hij"
    }
  }
}
```

创建 Meet 默认加入。Chrome 或 Chrome 节点传输仍需要已登录的 Google Chrome 配置文件通过浏览器加入。如果配置文件已退出，OpenClaw 报告 `manualActionRequired: true` 或浏览器回退错误，并要求运营商在重试之前完成 Google 登录。

仅在确认你的 Cloud 项目、OAuth 主体和会议参与者已注册 Meet 媒体 API 的 Google Workspace 开发者预览计划后，设置 `preview.enrollmentAcknowledged: true`。

## 配置

常见的 Chrome agent 路径只需要启用插件、BlackHole、SoX、实时转录提供商密钥和配置的 OpenClaw TTS 提供商。OpenAI 是默认转录提供商；设置 `realtime.voiceProvider` 为 `"google"` 和 `realtime.model` 以在不更改默认 agent 模式转录提供商的情况下使用 Google Gemini Live 进行 `bidi` 模式：

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# 或
export GEMINI_API_KEY=...
```

在 `plugins.entries.google-meet.config` 下设置插件配置：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {},
      },
    },
  },
}
```

默认值：

- `defaultTransport: "chrome"`
- `defaultMode: "agent"`（`"realtime"` 仅作为 `"agent"` 的传统兼容性别名被接受；新工具调用应说 `"agent"`）
- `chromeNode.node`：`chrome-node` 的可选节点 id/名称/IP
- `chrome.audioBackend: "blackhole-2ch"`
- `chrome.guestName: "OpenClaw Agent"`：在未登录的 Meet 来宾屏幕上使用的名称
- `chrome.autoJoin: true`：通过 `chrome-node` 上的 OpenClaw 浏览器自动化进行尽力而为的来宾名称填写和立即加入点击
- `chrome.reuseExistingTab: true`：激活现有的 Meet 标签页而非打开重复标签页
- `chrome.waitForInCallMs: 20000`：等待 Meet 标签页报告通话中，然后触发对话回复介绍
- `chrome.audioFormat: "pcm16-24khz"`：命令对音频格式。仅对仍发出电话音频的传统/自定义命令对使用 `"g711-ulaw-8khz"`。
- `chrome.audioBufferBytes: 4096`：生成的 Chrome 命令对音频命令的 SoX 处理缓冲区。这是 SoX 默认 8192 字节缓冲区的一半，在减少默认管道延迟的同时留有余地在繁忙宿主上提高。低于 SoX 最小值的值被钳制到 17 字节。
- `chrome.audioInputCommand`：从 CoreAudio `BlackHole 2ch` 读取并以 `chrome.audioFormat` 写入音频的 SoX 命令
- `chrome.audioOutputCommand`：以 `chrome.audioFormat` 读取音频并写入 CoreAudio `BlackHole 2ch` 的 SoX 命令
- `chrome.bargeInInputCommand`：可选的本地麦克风命令，在助手播放活跃时写入有符号 16 位小端单声道 PCM 用于人类插入检测。目前适用于 Gateway 托管的 `chrome` 命令对桥接。
- `chrome.bargeInRmsThreshold: 650`：在 `chrome.bargeInInputCommand` 上计为人类中断的 RMS 级别
- `chrome.bargeInPeakThreshold: 2500`：在 `chrome.bargeInInputCommand` 上计为人类中断的峰值级别
- `chrome.bargeInCooldownMs: 900`：重复人类中断清除之间的最小延迟
- `mode: "agent"`：默认对话回复模式。参与者语音由配置的实时转录提供商转录，发送到每会议子 agent 会话中的配置 OpenClaw agent，并通过普通 OpenClaw TTS 运行时回复发言。
- `mode: "bidi"`：回退的直接双向实时模型模式。实时语音提供商直接回答参与者语音，可能调用 `openclaw_agent_consult` 进行更深/工具支持的回答。
- `mode: "transcribe"`：没有对话回复桥接的仅观察模式。
- `realtime.provider: "openai"`：当下面的范围提供商字段未设置时使用的兼容性回退。
- `realtime.transcriptionProvider: "openai"`：`agent` 模式用于实时转录的提供商 id。
- `realtime.voiceProvider`：`bidi` 模式用于直接实时语音的提供商 id。将其设置为 `"google"` 以在保持 agent 模式转录在 OpenAI 的同时使用 Gemini Live。
- `realtime.toolPolicy: "safe-read-only"`
- `realtime.instructions`：简短的口头回复，用 `openclaw_agent_consult` 进行更深入的回答
- `realtime.introMessage`：实时桥接连接时的简短口头准备检查；设置为 `""` 以静默加入
- `realtime.agentId`：`openclaw_agent_consult` 的可选 OpenClaw agent id；默认为 `main`

可选覆盖：

```json5
{
  defaults: {
    meeting: "https://meet.google.com/abc-defg-hij",
  },
  browser: {
    defaultProfile: "openclaw",
  },
  chrome: {
    guestName: "OpenClaw Agent",
    waitForInCallMs: 30000,
    bargeInInputCommand: [
      "sox",
      "-q",
      "-t",
      "coreaudio",
      "External Microphone",
      "-r",
      "24000",
      "-c",
      "1",
      "-b",
      "16",
      "-e",
      "signed-integer",
      "-t",
      "raw",
      "-",
    ],
  },
  chromeNode: {
    node: "parallels-macos",
  },
  defaultMode: "agent",
  realtime: {
    provider: "openai",
    transcriptionProvider: "openai",
    voiceProvider: "google",
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    agentId: "jay",
    toolPolicy: "owner",
    introMessage: "Say exactly: I'm here.",
    providers: {
      google: {
        voice: "Kore",
      },
    },
  },
}
```

ElevenLabs 同时用于 agent 模式监听和发言：

```json5
{
  messages: {
    tts: {
      provider: "elevenlabs",
      providers: {
        elevenlabs: {
          modelId: "eleven_v3",
          voiceId: "pMsXgVXv3BLzUgSXRplE",
        },
      },
    },
  },
  plugins: {
    entries: {
      "google-meet": {
        config: {
          realtime: {
            transcriptionProvider: "elevenlabs",
            providers: {
              elevenlabs: {
                modelId: "scribe_v2_realtime",
                audioFormat: "ulaw_8000",
                sampleRate: 8000,
                commitStrategy: "vad",
              },
            },
          },
        },
      },
    },
  },
}
```

持久的 Meet 语音来自 `messages.tts.providers.elevenlabs.voiceId`。Agent 回复也可以在启用 TTS 模型覆盖时使用每回复的 `[[tts:voiceId=... model=eleven_v3]]` 指令，但配置是会议的确定性默认值。加入时，日志应显示 `transcriptionProvider=elevenlabs`，每个口头回复应记录 `provider=elevenlabs model=eleven_v3 voice=<voiceId>`。

仅 Twilio 配置：

```json5
{
  defaultTransport: "twilio",
  twilio: {
    defaultDialInNumber: "+15551234567",
    defaultPin: "123456",
  },
  voiceCall: {
    gatewayUrl: "ws://127.0.0.1:18789",
  },
}
```

`voiceCall.enabled` 默认为 `true`；使用 Twilio 传输时，它将实际 PSTN 通话、DTMF 和介绍问候委托给 Voice Call 插件。Voice Call 在打开实时媒体流之前播放 DTMF 序列，然后使用保存的介绍文本作为初始实时问候。如果 `voice-call` 未启用，Google Meet 仍可以验证和记录拨号计划，但无法发起 Twilio 通话。

## 工具

Agent 可以使用 `google_meet` 工具：

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "agent"
}
```

当 Chrome 在 Gateway 宿主上运行时使用 `transport: "chrome"`。当 Chrome 在配对节点（如 Parallels VM）上运行时使用 `transport: "chrome-node"`。在两种情况下，模型提供商和 `openclaw_agent_consult` 都在 Gateway 宿主上运行，因此模型凭据保留在那里。使用默认的 `mode: "agent"` 时，实时转录提供商处理监听，配置的 OpenClaw agent 产生答案，普通 OpenClaw TTS 将其说入 Meet。当你希望实时语音模型直接回答时使用 `mode: "bidi"`。原始 `mode: "realtime"` 仍作为 `mode: "agent"` 的传统兼容性别名被接受，但在 agent 工具模式中不再宣传。Agent 模式日志在桥接启动时包括解析的转录提供商/模型，以及每次合成回复后的 TTS 提供商、模型、语音、输出格式和采样率。

使用 `action: "status"` 列出活跃会话或检查会话 ID。使用带 `sessionId` 和 `message` 的 `action: "speak"` 立即让实时 agent 发言。使用 `action: "test_speech"` 创建或重用会话，触发已知短语，并在 Chrome 宿主可以报告时返回 `inCall` 健康状态。`test_speech` 始终强制 `mode: "agent"`，并在被要求以 `mode: "transcribe"` 运行时失败，因为仅观察会话有意不能发出语音。其 `speechOutputVerified` 结果基于该测试调用期间实时音频输出字节增加，因此具有更旧音频的重用会话不计为新鲜的成功语音检查。使用 `action: "leave"` 将会话标记为结束。

`status` 在可用时包括 Chrome 健康状态：

- `inCall`：Chrome 似乎在 Meet 通话内
- `micMuted`：尽力而为的 Meet 麦克风状态
- `manualActionRequired` / `manualActionReason` / `manualActionMessage`：浏览器配置文件在语音可以工作之前需要手动登录、Meet 宿主准入、权限或浏览器控制修复
- `speechReady` / `speechBlockedReason` / `speechBlockedMessage`：托管 Chrome 语音现在是否被允许。`speechReady: false` 意味着 OpenClaw 没有将介绍/测试短语发送到音频桥接。
- `providerConnected` / `realtimeReady`：实时语音桥接状态
- `lastInputAt` / `lastOutputAt`：最后一次从桥接接收到或发送到桥接的音频
- `audioOutputRouted` / `audioOutputDeviceLabel`：Meet 标签页的媒体输出是否被主动路由到桥接使用的 BlackHole 设备
- `lastSuppressedInputAt` / `suppressedInputBytes`：助手播放活跃时忽略的环回输入

```json
{
  "action": "speak",
  "sessionId": "meet_...",
  "message": "Say exactly: I'm here and listening."
}
```

## Agent 和 Bidi 模式

Chrome `agent` 模式针对"我的 agent 在会议中"行为进行了优化。实时转录提供商听取会议音频，最终参与者转录通过配置的 OpenClaw agent 路由，答案通过普通 OpenClaw TTS 运行时发言。当你希望实时语音模型直接回答时设置 `mode: "bidi"`。附近的最终转录片段在咨询之前合并，以便一个口头轮次不会产生几个过时的部分答案。在排队的助手音频仍在播放时，实时输入也被抑制，最近的类助手转录回声在 agent 咨询之前被忽略，以便 BlackHole 环回不会使 agent 回答自己的话。

| 模式    | 谁决定答案            | 语音输出路径             | 使用场景                          |
| ------- | --------------------- | ------------------------ | --------------------------------- |
| `agent` | 配置的 OpenClaw agent | 普通 OpenClaw TTS 运行时 | 你想要"我的 agent 在会议中"的行为 |
| `bidi`  | 实时语音模型          | 实时语音提供商音频响应   | 你想要最低延迟的对话语音循环      |

在 `bidi` 模式下，当实时模型需要更深的推理、当前信息或普通 OpenClaw 工具时，它可以调用 `openclaw_agent_consult`。

咨询工具在后台运行带有最近会议转录上下文的常规 OpenClaw agent，并返回简洁的口头答案。在 `agent` 模式下，OpenClaw 将该答案直接发送到 TTS 运行时；在 `bidi` 模式下，实时语音模型可以将咨询结果说回会议中。它使用与 Voice Call 相同的共享咨询机制。

默认情况下，咨询针对 `main` agent 运行。当 Meet 通道应咨询专用的 OpenClaw agent 工作区、模型默认值、工具策略、内存和会话历史时，设置 `realtime.agentId`。

Agent 模式咨询使用每会议的 `agent:<id>:subagent:google-meet:<session>` 会话键，以便后续问题在继承配置 agent 的普通 agent 策略的同时保留会议上下文。

`realtime.toolPolicy` 控制咨询运行：

- `safe-read-only`：暴露咨询工具并将常规 agent 限制为 `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和 `memory_get`。
- `owner`：暴露咨询工具并让常规 agent 使用普通 agent 工具策略。
- `none`：不向实时语音模型暴露咨询工具。

咨询会话键按 Meet 会话范围，因此后续咨询调用可以在同一会议期间重用先前的咨询上下文。

要在 Chrome 完全加入通话后强制口头准备检查：

```bash
openclaw googlemeet speak meet_... "Say exactly: I'm here and listening."
```

对于完整的加入和发言冒烟：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: I'm here and listening."
```

## 实时测试清单

在将会议交给无人值守的 agent 之前使用以下序列：

```bash
openclaw googlemeet setup
openclaw nodes status
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: Google Meet speech test complete."
```

预期的 Chrome 节点状态：

- `googlemeet setup` 全绿。
- 当 Chrome 节点是默认传输或节点被固定时，`googlemeet setup` 包括 `chrome-node-connected`。
- `nodes status` 显示所选节点已连接。
- 所选节点宣传 `googlemeet.chrome` 和 `browser.proxy`。
- Meet 标签页加入通话，`test-speech` 返回带 `inCall: true` 的 Chrome 健康状态。

对于 Parallels macOS VM 等远程 Chrome 宿主，这是更新 Gateway 或 VM 后的最短安全检查：

```bash
openclaw googlemeet setup
openclaw nodes status --connected
openclaw nodes invoke \
  --node parallels-macos \
  --command googlemeet.chrome \
  --params '{"action":"setup"}'
```

这证明 Gateway 插件已加载、VM 节点以当前令牌连接，以及在 agent 打开真实会议标签页之前 Meet 音频桥接可用。

对于 Twilio 冒烟，使用暴露电话拨入详情的会议：

```bash
openclaw googlemeet setup
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

预期的 Twilio 状态：

- `googlemeet setup` 包括绿色的 `twilio-voice-call-plugin`、`twilio-voice-call-credentials` 和 `twilio-voice-call-webhook` 检查。
- `voicecall` 在 Gateway 重载后在 CLI 中可用。
- 返回的会话有 `transport: "twilio"` 和 `twilio.voiceCallId`。
- `openclaw logs --follow` 显示 DTMF TwiML 在实时 TwiML 之前提供，然后是带初始问候排队的实时桥接。
- `googlemeet leave <sessionId>` 挂断委托的语音通话。

## 故障排除

### Agent 看不到 Google Meet 工具

确认插件在 Gateway 配置中已启用并重载 Gateway：

```bash
openclaw plugins list | grep google-meet
openclaw googlemeet setup
```

如果你刚刚编辑了 `plugins.entries.google-meet`，重启或重载 Gateway。运行中的 agent 只看到当前 Gateway 进程注册的插件工具。

在非 macOS Gateway 宿主上，面向 agent 的 `google_meet` 工具保持可见，但本地 Chrome 对话回复操作在到达音频桥接之前被阻止。本地 Chrome 对话回复音频目前依赖 macOS `BlackHole 2ch`，因此 Linux agent 应使用 `mode: "transcribe"`、Twilio 拨入或 macOS `chrome-node` 宿主而非默认的本地 Chrome agent 路径。

### 没有连接的 Google Meet 能力节点

在节点宿主上运行：

```bash
openclaw plugins enable google-meet
openclaw plugins enable browser
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

在 Gateway 宿主上批准节点并验证命令：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

节点必须已连接并列出 `googlemeet.chrome` 加 `browser.proxy`。Gateway 配置必须允许这些节点命令：

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["browser.proxy", "googlemeet.chrome"],
    },
  },
}
```

如果 `googlemeet setup` 在 `chrome-node-connected` 上失败或 Gateway 日志报告 `gateway token mismatch`，使用当前 Gateway 令牌重新安装或重启节点。对于 LAN Gateway，这通常意味着：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install \
  --host <gateway-lan-ip> \
  --port 18789 \
  --display-name parallels-macos \
  --force
```

然后重载节点服务并重新运行：

```bash
openclaw googlemeet setup
openclaw nodes status --connected
```

### 浏览器打开但 agent 无法加入

对于仅观察加入运行 `googlemeet test-listen`，对于实时加入运行 `googlemeet test-speech`，然后检查返回的 Chrome 健康状态。如果任一探测报告 `manualActionRequired: true`，向运营商显示 `manualActionMessage` 并在浏览器操作完成之前停止重试。

常见手动操作：

- 登录 Chrome 配置文件。
- 从 Meet 宿主账号准入来宾。
- 当 Chrome 的原生权限提示出现时授予 Chrome 麦克风/摄像头权限。
- 关闭或修复卡住的 Meet 权限对话框。

不要仅仅因为 Meet 显示"你想让人们在会议中听到你吗？"就报告"未登录"。这是 Meet 的音频选择插页；OpenClaw 在可用时通过浏览器自动化点击**使用麦克风**，并继续等待真实的会议状态。对于仅创建浏览器回退，OpenClaw 可能点击**不使用麦克风继续**，因为创建 URL 不需要实时音频路径。

### 会议创建失败

`googlemeet create` 首先在配置了 OAuth 凭据时使用 Google Meet API `spaces.create` 端点。没有 OAuth 凭据时回退到固定 Chrome 节点浏览器。确认：

- 对于 API 创建：`oauth.clientId` 和 `oauth.refreshToken` 已配置，或存在匹配的 `OPENCLAW_GOOGLE_MEET_*` 环境变量。
- 对于 API 创建：刷新令牌在添加创建支持后铸造。较旧的令牌可能缺少 `meetings.space.created` 范围；重新运行 `openclaw googlemeet auth login --json` 并更新插件配置。
- 对于浏览器回退：`defaultTransport: "chrome-node"` 和 `chromeNode.node` 指向带 `browser.proxy` 和 `googlemeet.chrome` 的连接节点。
- 对于浏览器回退：该节点上的 OpenClaw Chrome 配置文件已登录 Google，可以打开 `https://meet.google.com/new`。
- 对于浏览器回退：重试在打开新标签页之前重用现有的 `https://meet.google.com/new` 或 Google 账号提示标签页。如果 agent 超时，重试工具调用而非手动打开另一个 Meet 标签页。
- 对于浏览器回退：如果工具返回 `manualActionRequired: true`，使用返回的 `browser.nodeId`、`browser.targetId`、`browserUrl` 和 `manualActionMessage` 指导运营商。在该操作完成之前不要循环重试。
- 对于浏览器回退：如果 Meet 显示"你想让人们在会议中听到你吗？"，保持标签页打开。OpenClaw 应通过浏览器自动化点击**使用麦克风**，或对于仅创建回退点击**不使用麦克风继续**，并继续等待生成的 Meet URL。如果不能，错误应提到 `meet-audio-choice-required`，而非 `google-login-required`。

### Agent 加入但不说话

检查实时路径：

```bash
openclaw googlemeet setup
openclaw googlemeet doctor
```

对于普通的 STT -> OpenClaw agent -> TTS 对话回复路径使用 `mode: "agent"`，对于直接实时语音回退使用 `mode: "bidi"`。`mode: "transcribe"` 有意不启动对话回复桥接。对于仅观察调试，在参与者发言后运行 `openclaw googlemeet status --json <session-id>` 并检查 `captioning`、`transcriptLines` 和 `lastCaptionText`。如果 `inCall` 为 true 但 `transcriptLines` 保持 `0`，Meet 字幕可能被禁用，自观察器安装以来没有人发言，Meet UI 已更改，或实时字幕不适用于会议语言/账号。

`googlemeet test-speech` 始终检查实时路径并报告该调用是否观察到桥接输出字节。如果 `speechOutputVerified` 为 false 且 `speechOutputTimedOut` 为 true，实时提供商可能接受了话语，但 OpenClaw 没有看到新的输出字节到达 Chrome 音频桥接。

还要验证：

- 实时提供商密钥在 Gateway 宿主上可用，如 `OPENAI_API_KEY` 或 `GEMINI_API_KEY`。
- `BlackHole 2ch` 在 Chrome 宿主上可见。
- `sox` 存在于 Chrome 宿主上。
- Meet 麦克风和扬声器通过 OpenClaw 使用的虚拟音频路径路由。对于本地 Chrome 实时加入，`doctor` 应显示 `meet output routed: yes`。

`googlemeet doctor [session-id]` 打印会话、节点、通话内状态、手动操作原因、实时提供商连接、`realtimeReady`、音频输入/输出活动、最后音频时间戳、字节计数器和浏览器 URL。当你需要原始 JSON 时使用 `googlemeet status [session-id] --json`。当你需要在不暴露令牌的情况下验证 Google Meet OAuth 刷新时使用 `googlemeet doctor --oauth`；当你还需要 Google Meet API 证明时添加 `--meeting` 或 `--create-space`。

如果 agent 超时且你可以看到已打开的 Meet 标签页，在不打开另一个标签页的情况下检查该标签页：

```bash
openclaw googlemeet recover-tab
openclaw googlemeet recover-tab https://meet.google.com/abc-defg-hij
```

等效的工具操作是 `recover_current_tab`。它聚焦并检查所选传输的现有 Meet 标签页。使用 `chrome` 时，它通过 Gateway 使用本地浏览器控制；使用 `chrome-node` 时，它使用配置的 Chrome 节点。它不打开新标签页或创建新会话；它报告当前阻塞项，如登录、准入、权限或音频选择状态。CLI 命令与配置的 Gateway 通信，因此 Gateway 必须在运行；`chrome-node` 还需要 Chrome 节点已连接。

### Twilio 设置检查失败

当 `voice-call` 未被允许或未启用时，`twilio-voice-call-plugin` 失败。将其添加到 `plugins.allow`，启用 `plugins.entries.voice-call`，然后重载 Gateway。

当 Twilio 后端缺少账号 SID、认证令牌或呼叫方号码时，`twilio-voice-call-credentials` 失败。在 Gateway 宿主上设置这些：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

当 `voice-call` 没有公共 webhook 暴露，或 `publicUrl` 指向环回或私有网络空间时，`twilio-voice-call-webhook` 失败。将 `plugins.entries.voice-call.config.publicUrl` 设置为公共提供商 URL，或配置 `voice-call` 隧道/Tailscale 暴露。

环回和私有 URL 对运营商回调无效。不要将 `localhost`、`127.0.0.1`、`0.0.0.0`、`10.x`、`172.16.x`-`172.31.x`、`192.168.x`、`169.254.x`、`fc00::/7` 或 `fd00::/8` 作为 `publicUrl`。

对于稳定的公共 URL：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          fromNumber: "+15550001234",
          publicUrl: "https://voice.example.com/voice/webhook",
        },
      },
    },
  },
}
```

对于本地开发，使用隧道或 Tailscale 暴露而非私有宿主 URL：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tunnel: { provider: "ngrok" },
          // 或
          tailscale: { mode: "funnel", path: "/voice/webhook" },
        },
      },
    },
  },
}
```

然后重启或重载 Gateway 并运行：

```bash
openclaw googlemeet setup --transport twilio
openclaw voicecall setup
openclaw voicecall smoke
```

`voicecall smoke` 默认仅进行准备就绪检查。要对特定号码进行空运行：

```bash
openclaw voicecall smoke --to "+15555550123"
```

仅在你有意想要发起实时出站通知通话时才添加 `--yes`：

```bash
openclaw voicecall smoke --to "+15555550123" --yes
```

### Twilio 通话开始但从未进入会议

确认 Meet 事件暴露电话拨入详情。传递确切的拨入号码和 PIN 或自定义 DTMF 序列：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

如果提供商在输入 PIN 之前需要暂停，在 `--dtmf-sequence` 中使用前导 `w` 或逗号。

如果电话通话已创建但 Meet 名单从未显示拨入参与者：

- 运行 `openclaw googlemeet doctor <session-id>` 确认委托的 Twilio 通话 ID、DTMF 是否已排队以及介绍问候是否已请求。
- 运行 `openclaw voicecall status --call-id <id>` 并确认通话仍在活跃。
- 运行 `openclaw voicecall tail` 并检查 Twilio webhook 是否到达 Gateway。
- 运行 `openclaw logs --follow` 并查找 Twilio Meet 序列：Google Meet 委托加入，Voice Call 启动电话腿，Google Meet 等待 `voiceCall.dtmfDelayMs`，使用 `voicecall.dtmf` 发送 DTMF，等待 `voiceCall.postDtmfSpeechDelayMs`，然后使用 `voicecall.speak` 请求介绍语音。
- 重新运行 `openclaw googlemeet setup --transport twilio`；绿色设置检查是必要的，但不能证明会议 PIN 序列是正确的。
- 确认拨入号码属于与 PIN 相同的 Meet 邀请和地区。
- 如果 Meet 回复缓慢或通话转录在发送 DTMF 后仍显示要求 PIN 的提示，增加 `voiceCall.dtmfDelayMs`。
- 如果参与者加入但你没有听到问候，检查 `openclaw logs --follow` 中 DTMF 后的 `voicecall.speak` 请求以及媒体流 TTS 播放或 Twilio `<Say>` 回退。如果通话转录仍包含"输入会议 PIN"，电话腿尚未加入 Meet 房间，因此会议参与者不会听到语音。

如果 webhook 没有到达，先调试 Voice Call 插件：提供商必须能访问 `plugins.entries.voice-call.config.publicUrl` 或配置的隧道。请参见 [Voice call 故障排除](/plugins/voice-call#troubleshooting)。

## 说明

Google Meet 的官方媒体 API 是面向接收的，因此向 Meet 通话中发言仍需要参与者路径。此插件保持该边界可见：Chrome 处理浏览器参与和本地音频路由；Twilio 处理电话拨入参与。

Chrome 对话回复模式需要 `BlackHole 2ch` 加上以下之一：

- `chrome.audioInputCommand` 加 `chrome.audioOutputCommand`：OpenClaw 拥有桥接，并在这些命令和所选提供商之间以 `chrome.audioFormat` 传输音频。Agent 模式使用实时转录加普通 TTS；bidi 模式使用实时语音提供商。默认 Chrome 路径是 24 kHz PCM16，`chrome.audioBufferBytes: 4096`；8 kHz G.711 mu-law 仍可用于传统命令对。
- `chrome.audioBridgeCommand`：外部桥接命令拥有整个本地音频路径，必须在启动或验证其守护进程后退出。这仅对 `bidi` 有效，因为 `agent` 模式需要直接命令对访问以进行 TTS。

当 agent 在 agent 模式下调用 `google_meet` 工具时，会议咨询会话在回答参与者语音之前分叉调用方的当前转录。Meet 会话仍保持分开（`agent:<agentId>:subagent:google-meet:<sessionId>`），因此会议后续内容不会直接修改调用方转录。

对于干净的双工音频，通过单独的虚拟设备或 Loopback 风格的虚拟设备图路由 Meet 输出和 Meet 麦克风。单个共享 BlackHole 设备可以将其他参与者回声到通话中。

使用命令对 Chrome 桥接时，`chrome.bargeInInputCommand` 可以监听单独的本地麦克风，并在人类开始说话时清除助手播放。这使人类语音保持在助手输出之前，即使在助手播放期间共享 BlackHole 环回输入被临时抑制。与 `chrome.audioInputCommand` 和 `chrome.audioOutputCommand` 一样，它是运营商配置的本地命令。使用显式的受信任命令路径或参数列表，不要将其指向来自不受信任位置的脚本。

`googlemeet speak` 触发 Chrome 会话的活跃对话回复音频桥接。`googlemeet leave` 停止该桥接。对于通过 Voice Call 插件委托的 Twilio 会话，`leave` 也挂断底层语音通话。当你还想关闭 API 管理空间的活跃 Google Meet 会议时，使用 `googlemeet end-active-conference`。

## 相关文档

- [Voice call 插件](/plugins/voice-call)
- [对话模式](/nodes/talk)
- [构建插件](/plugins/building-plugins)
