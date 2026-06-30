---
summary: "集成浏览器控制服务 + 操作命令"
read_when:
  - 添加代理控制的浏览器自动化
  - 调试为什么 OpenClaw 干扰您自己的 Chrome
  - 在 macOS 应用中实现浏览器设置 + 生命周期
title: "浏览器（OpenClaw 托管）"
---

OpenClaw 可以运行一个**专用的 Chrome/Brave/Edge/Chromium 配置文件**，由代理控制。
它与您的个人浏览器隔离，通过 Gateway 内的一个小型本地控制服务管理（仅限回环）。

初学者视图：

- 将其视为一个**独立的、仅供代理使用的浏览器**。
- `openclaw` 配置文件**不**接触您的个人浏览器配置文件。
- 代理可以在安全通道中**打开标签页、阅读页面、点击和输入**。
- 内置的 `user` 配置文件通过 Chrome MCP 附加到您真实的已登录 Chrome 会话。

## 您获得的内容

- 一个名为 **openclaw** 的独立浏览器配置文件（默认橙色标记）。
- 确定性标签页控制（列出/打开/聚焦/关闭）。
- 代理操作（点击/输入/拖拽/选择）、快照、截图、PDF。
- 一个捆绑的 `browser-automation` 技能，当浏览器插件启用时，该技能会向代理传授快照、稳定标签页、过期引用以及手动阻止器恢复循环。
- 可选的多配置文件支持（`openclaw`、`work`、`remote` 等）。

这个浏览器**不是**您的日常使用浏览器。它是用于代理自动化和验证的安全隔离界面。

## 快速开始

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw doctor --deep
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

如果出现"Browser disabled"，请在配置中启用它（见下文）并重启 Gateway。

如果完全缺少 `openclaw browser`，或代理说浏览器工具不可用，请跳到[缺少浏览器命令或工具](/tools/browser#missing-browser-command-or-tool)。

## 插件控制

默认的 `browser` 工具是一个捆绑插件。禁用它以替换为另一个注册相同 `browser` 工具名称的插件：

```json5
{
  plugins: {
    entries: {
      browser: {
        enabled: false,
      },
    },
  },
}
```

默认值同时需要 `plugins.entries.browser.enabled` **和** `browser.enabled=true`。仅禁用插件会将 `openclaw browser` CLI、`browser.request` Gateway 方法、代理工具和控制服务作为一个单元删除；您的 `browser.*` 配置保持完整以供替换。

浏览器配置更改需要重启 Gateway，以便插件可以重新注册其服务。

## 代理指导

工具配置文件说明：`tools.profile: "coding"` 包含 `web_search` 和 `web_fetch`，但不包含完整的 `browser` 工具。如果代理或生成的子代理应使用浏览器自动化，请在配置文件阶段添加浏览器：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

对于单个代理，使用 `agents.list[].tools.alsoAllow: ["browser"]`。
`tools.subagents.tools.allow: ["browser"]` 单独使用是不够的，因为子代理策略在配置文件过滤之后应用。

浏览器插件提供两级代理指导：

- `browser` 工具描述带有始终开启的紧凑合同：选择正确的配置文件，将引用保留在同一标签页上，使用 `tabId`/标签进行标签页定位，并为多步骤工作加载浏览器技能。
- 捆绑的 `browser-automation` 技能带有更长的操作循环：先检查状态/标签页，标记任务标签页，操作前先快照，UI 更改后重新快照，过期引用只恢复一次，并将登录/两步验证/验证码或摄像头/麦克风阻断报告为手动操作而不是猜测。

插件捆绑的技能在插件启用时列在代理的可用技能中。完整的技能说明按需加载，因此常规轮次不需要支付完整的 token 成本。

## 缺少浏览器命令或工具

如果升级后 `openclaw browser` 不认识，`browser.request` 缺失，或代理报告浏览器工具不可用，通常原因是 `plugins.allow` 列表省略了 `browser` 且不存在根 `browser` 配置块。请添加：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

显式的根 `browser` 块（例如 `browser.enabled=true` 或 `browser.profiles.<name>`）即使在限制性 `plugins.allow` 下也会激活捆绑的浏览器插件，与频道配置行为相匹配。`plugins.entries.browser.enabled=true` 和 `tools.alsoAllow: ["browser"]` 本身不能替代允许列表成员资格。完全删除 `plugins.allow` 也可以恢复默认值。

## 配置文件：`openclaw` vs `user`

- `openclaw`：托管的、隔离的浏览器（不需要扩展）。
- `user`：用于您**真实已登录 Chrome** 会话的内置 Chrome MCP 附加配置文件。

对于代理浏览器工具调用：

- 默认：使用隔离的 `openclaw` 浏览器。
- 当现有的已登录会话很重要且用户在电脑旁可以点击/批准任何附加提示时，优先使用 `profile="user"`。
- `profile` 是您想要特定浏览器模式时的显式覆盖。

如果您希望默认使用托管模式，请设置 `browser.defaultProfile: "openclaw"`。

## 配置

浏览器设置位于 `~/.openclaw/openclaw.json`。

```json5
{
  browser: {
    enabled: true, // 默认：true
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // 仅在受信任的私有网络访问时选择启用
      // allowPrivateNetwork: true, // 旧版别名
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    // cdpUrl: "http://127.0.0.1:18792", // 旧版单配置文件覆盖
    remoteCdpTimeoutMs: 1500, // 远程 CDP HTTP 超时（毫秒）
    remoteCdpHandshakeTimeoutMs: 3000, // 远程 CDP WebSocket 握手超时（毫秒）
    localLaunchTimeoutMs: 15000, // 本地托管 Chrome 发现超时（毫秒）
    localCdpReadyTimeoutMs: 8000, // 本地托管启动后 CDP 就绪超时（毫秒）
    actionTimeoutMs: 60000, // 默认浏览器操作超时（毫秒）
    tabCleanup: {
      enabled: true, // 默认：true
      idleMinutes: 120, // 设为 0 禁用空闲清理
      maxTabsPerSession: 8, // 设为 0 禁用每会话限制
      sweepMinutes: 5,
    },
    defaultProfile: "openclaw",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: {
        cdpPort: 18801,
        color: "#0066CC",
        headless: true,
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
      user: {
        driver: "existing-session",
        attachOnly: true,
        color: "#00AA00",
      },
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
  },
}
```

<AccordionGroup>

<Accordion title="端口和可达性">

- 控制服务绑定到从 `gateway.port` 派生的端口上的回环（默认 `18791` = gateway + 2）。覆盖 `gateway.port` 或 `OPENCLAW_GATEWAY_PORT` 会在同一族中移动派生端口。
- 本地 `openclaw` 配置文件自动分配 `cdpPort`/`cdpUrl`；仅为远程 CDP 设置这些。`cdpUrl` 在未设置时默认为托管本地 CDP 端口。
- `remoteCdpTimeoutMs` 适用于远程和 `attachOnly` CDP HTTP 可达性检查以及标签页打开 HTTP 请求；`remoteCdpHandshakeTimeoutMs` 适用于其 CDP WebSocket 握手。
- `localLaunchTimeoutMs` 是本地启动的托管 Chrome 进程暴露其 CDP HTTP 端点的预算。`localCdpReadyTimeoutMs` 是进程发现后 CDP websocket 就绪的后续预算。在 Raspberry Pi、低端 VPS 或 Chromium 启动缓慢的旧硬件上增大这些值。值必须是不超过 `120000` 毫秒的正整数；无效的配置值会被拒绝。
- 每个配置文件的重复托管 Chrome 启动/就绪失败会进行熔断。经过几次连续失败后，OpenClaw 会短暂暂停新的启动尝试，而不是在每次浏览器工具调用时都生成 Chromium。修复启动问题，如果不需要浏览器则禁用它，或在修复后重启 Gateway。
- `actionTimeoutMs` 是当调用者不传递 `timeoutMs` 时浏览器 `act` 请求的默认预算。客户端传输添加了一个小的缓冲窗口，以便长时间等待可以完成而不是在 HTTP 边界超时。
- `tabCleanup` 是主代理浏览器会话打开的标签页的尽力清理。子代理、cron 和 ACP 生命周期清理仍然在会话结束时关闭其明确跟踪的标签页；主会话保持活动标签页可重用，然后在后台关闭空闲或超量的跟踪标签页。

</Accordion>

<Accordion title="SSRF 策略">

- 在导航前以及之后对最终的 `http(s)` URL 进行尽力重新检查，浏览器导航和打开标签页都受 SSRF 防护。
- 在严格 SSRF 模式下，远程 CDP 端点发现和 `/json/version` 探测（`cdpUrl`）也会被检查。
- Gateway/提供商的 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 和 `NO_PROXY` 环境变量不会自动代理 OpenClaw 托管的浏览器。托管 Chrome 默认直接启动，以便提供商代理设置不会削弱浏览器 SSRF 检查。
- 要代理托管浏览器本身，请通过 `browser.extraArgs` 传递显式的 Chrome 代理标志，例如 `--proxy-server=...` 或 `--proxy-pac-url=...`。除非有意启用私有网络浏览器访问，否则严格 SSRF 模式会阻止显式浏览器代理路由。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 默认关闭；仅在有意信任私有网络浏览器访问时启用。
- `browser.ssrfPolicy.allowPrivateNetwork` 作为旧版别名仍然支持。

</Accordion>

<Accordion title="配置文件行为">

- `attachOnly: true` 意味着永远不启动本地浏览器；只有在已有浏览器运行时才附加。
- `headless` 可以全局或每个本地托管配置文件设置。每个配置文件的值覆盖 `browser.headless`，因此一个本地启动的配置文件可以保持无头，而另一个保持可见。
- `POST /start?headless=true` 和 `openclaw browser start --headless` 为本地托管配置文件请求一次性无头启动，而不重写 `browser.headless` 或配置文件配置。现有会话、仅附加和远程 CDP 配置文件拒绝覆盖，因为 OpenClaw 不启动这些浏览器进程。
- 在没有 `DISPLAY` 或 `WAYLAND_DISPLAY` 的 Linux 主机上，当环境或配置文件/全局配置都没有显式选择有头模式时，本地托管配置文件会自动默认为无头模式。`openclaw browser status --json` 将 `headlessSource` 报告为 `env`、`profile`、`config`、`request`、`linux-display-fallback` 或 `default`。
- `OPENCLAW_BROWSER_HEADLESS=1` 强制当前进程的本地托管启动为无头。`OPENCLAW_BROWSER_HEADLESS=0` 强制普通启动的有头模式，并在没有显示服务器的 Linux 主机上返回可操作的错误；显式的 `start --headless` 请求仍然对该次启动有效。
- `executablePath` 可以全局或每个本地托管配置文件设置。每个配置文件的值覆盖 `browser.executablePath`，因此不同的托管配置文件可以启动不同的基于 Chromium 的浏览器。两种形式都接受 `~` 作为您的操作系统主目录。
- `color`（顶级和每个配置文件）为浏览器 UI 着色，以便您可以看到哪个配置文件处于活动状态。
- 默认配置文件是 `openclaw`（托管独立）。使用 `defaultProfile: "user"` 选择已登录的用户浏览器。
- 自动检测顺序：如果系统默认浏览器基于 Chromium 则使用它；否则 Chrome → Brave → Edge → Chromium → Chrome Canary。
- `driver: "existing-session"` 使用 Chrome DevTools MCP 而不是原始 CDP。不要为该驱动设置 `cdpUrl`。
- 当现有会话配置文件应附加到非默认 Chromium 用户配置文件（Brave、Edge 等）时，设置 `browser.profiles.<name>.userDataDir`。此路径也接受 `~` 作为您的操作系统主目录。

</Accordion>

</AccordionGroup>

## 使用 Brave 或其他基于 Chromium 的浏览器

如果您的**系统默认**浏览器基于 Chromium（Chrome/Brave/Edge 等），OpenClaw 会自动使用它。设置 `browser.executablePath` 以覆盖自动检测。顶级和每个配置文件的 `executablePath` 值接受 `~` 作为您的操作系统主目录：

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set browser.profiles.work.executablePath "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

或者在配置中按平台设置：

<Tabs>
  <Tab title="macOS">
```json5
{
  browser: {
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  },
}
```
  </Tab>
  <Tab title="Windows">
```json5
{
  browser: {
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  },
}
```
  </Tab>
  <Tab title="Linux">
```json5
{
  browser: {
    executablePath: "/usr/bin/brave-browser",
  },
}
```
  </Tab>
</Tabs>

每个配置文件的 `executablePath` 只影响 OpenClaw 启动的本地托管配置文件。`existing-session` 配置文件附加到已运行的浏览器，远程 CDP 配置文件使用 `cdpUrl` 后面的浏览器。

## 本地 vs 远程控制

- **本地控制（默认）：** Gateway 启动回环控制服务，可以启动本地浏览器。
- **远程控制（节点主机）：** 在拥有浏览器的机器上运行节点主机；Gateway 将浏览器操作代理到它。
- **远程 CDP：** 设置 `browser.profiles.<name>.cdpUrl`（或 `browser.cdpUrl`）以附加到远程基于 Chromium 的浏览器。在这种情况下，OpenClaw 不会启动本地浏览器。
- 对于发布到 `127.0.0.1` 的 Docker 中的外部托管 CDP 服务（例如 Browserless），还要设置 `attachOnly: true`。没有 `attachOnly` 的回环 CDP 被视为本地 OpenClaw 托管的浏览器配置文件。
- `headless` 只影响 OpenClaw 启动的本地托管配置文件。它不重启或更改现有会话或远程 CDP 浏览器。
- `executablePath` 遵循同样的本地托管配置文件规则。在运行的本地托管配置文件上更改它会将该配置文件标记为重启/协调，以便下次启动使用新的二进制文件。

不同配置文件模式的停止行为不同：

- 本地托管配置文件：`openclaw browser stop` 停止 OpenClaw 启动的浏览器进程
- 仅附加和远程 CDP 配置文件：`openclaw browser stop` 关闭活动控制会话并释放 Playwright/CDP 模拟覆盖（视口、配色方案、区域设置、时区、离线模式等），即使 OpenClaw 没有启动任何浏览器进程

远程 CDP URL 可以包含认证：

- 查询令牌（例如，`https://provider.example?token=<token>`）
- HTTP 基本认证（例如，`https://user:pass@provider.example`）

OpenClaw 在调用 `/json/*` 端点和连接 CDP WebSocket 时保留认证。优先使用环境变量或密钥管理器存储令牌，而不是将其提交到配置文件。

## 节点浏览器代理（零配置默认）

如果您在拥有浏览器的机器上运行**节点主机**，OpenClaw 可以自动将浏览器工具调用路由到该节点，无需任何额外的浏览器配置。这是远程 Gateway 的默认路径。

注意：

- 节点主机通过**代理命令**暴露其本地浏览器控制服务器。
- 配置文件来自节点自己的 `browser.profiles` 配置（与本地相同）。
- `nodeHost.browserProxy.allowProfiles` 是可选的。将其留空以获得旧版/默认行为：所有已配置的配置文件通过代理保持可访问，包括配置文件创建/删除路由。
- 如果您设置了 `nodeHost.browserProxy.allowProfiles`，OpenClaw 将其视为最小权限边界：只有允许列出的配置文件可以被定位，代理界面上的持久配置文件创建/删除路由被阻止。
- 如果不想要，请禁用：
  - 在节点上：`nodeHost.browserProxy.enabled=false`
  - 在 Gateway 上：`gateway.nodes.browser.mode="off"`

## Browserless（托管远程 CDP）

[Browserless](https://browserless.io) 是一个托管的 Chromium 服务，通过 HTTPS 和 WebSocket 暴露 CDP 连接 URL。OpenClaw 可以使用任一形式，但对于远程浏览器配置文件，最简单的选项是来自 Browserless 连接文档的直接 WebSocket URL。

示例：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    remoteCdpTimeoutMs: 2000,
    remoteCdpHandshakeTimeoutMs: 4000,
    profiles: {
      browserless: {
        cdpUrl: "wss://production-sfo.browserless.io?token=<BROWSERLESS_API_KEY>",
        color: "#00AA00",
      },
    },
  },
}
```

注意：

- 将 `<BROWSERLESS_API_KEY>` 替换为您的真实 Browserless 令牌。
- 选择与您的 Browserless 账户匹配的区域端点（参见他们的文档）。
- 如果 Browserless 给您提供 HTTPS 基础 URL，您可以将其转换为 `wss://` 以进行直接 CDP 连接，或保持 HTTPS URL 让 OpenClaw 发现 `/json/version`。

### 同一主机上的 Browserless Docker

当 Browserless 在 Docker 中自托管且 OpenClaw 在主机上运行时，将 Browserless 视为外部托管的 CDP 服务：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    profiles: {
      browserless: {
        cdpUrl: "ws://127.0.0.1:3000",
        attachOnly: true,
        color: "#00AA00",
      },
    },
  },
}
```

`browser.profiles.browserless.cdpUrl` 中的地址必须从 OpenClaw 进程可到达。Browserless 还必须通告匹配的可到达端点；将 Browserless `EXTERNAL` 设置为对 OpenClaw 相同的公开 WebSocket 基础，例如 `ws://127.0.0.1:3000`、`ws://browserless:3000` 或稳定的私有 Docker 网络地址。如果 `/json/version` 返回的 `webSocketDebuggerUrl` 指向 OpenClaw 无法到达的地址，CDP HTTP 可能看起来健康，但 WebSocket 附加仍然会失败。

不要为回环 Browserless 配置文件不设置 `attachOnly`。没有 `attachOnly`，OpenClaw 会将回环端口视为本地托管的浏览器配置文件，并可能报告该端口已在使用但不属于 OpenClaw。

## 直接 WebSocket CDP 提供商

一些托管浏览器服务提供**直接 WebSocket** 端点，而不是标准的基于 HTTP 的 CDP 发现（`/json/version`）。OpenClaw 接受三种 CDP URL 形状并自动选择正确的连接策略：

- **HTTP(S) 发现** — `http://host[:port]` 或 `https://host[:port]`。OpenClaw 调用 `/json/version` 以发现 WebSocket 调试器 URL，然后连接。没有 WebSocket 回退。
- **直接 WebSocket 端点** — `ws://host[:port]/devtools/<kind>/<id>` 或带有 `/devtools/browser|page|worker|shared_worker|service_worker/<id>` 路径的 `wss://...`。OpenClaw 通过 WebSocket 握手直接连接，完全跳过 `/json/version`。
- **裸 WebSocket 根** — `ws://host[:port]` 或无 `/devtools/...` 路径的 `wss://host[:port]`（例如 [Browserless](https://browserless.io)、[Browserbase](https://www.browserbase.com)）。OpenClaw 首先尝试 HTTP `/json/version` 发现（将方案规范化为 `http`/`https`）；如果发现返回 `webSocketDebuggerUrl` 则使用它，否则 OpenClaw 回退到裸根的直接 WebSocket 握手。如果通告的 WebSocket 端点拒绝 CDP 握手但配置的裸根接受它，OpenClaw 也回退到该根。这使得指向本地 Chrome 的裸 `ws://` 仍然可以连接，因为 Chrome 只接受来自 `/json/version` 的特定目标路径上的 WebSocket 升级，而托管提供商在其发现端点通告短暂 URL 不适合 Playwright CDP 时，仍然可以使用其根 WebSocket 端点。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一个用于运行无头浏览器的云平台，内置验证码解决、隐身模式和住宅代理。

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserbase",
    remoteCdpTimeoutMs: 3000,
    remoteCdpHandshakeTimeoutMs: 5000,
    profiles: {
      browserbase: {
        cdpUrl: "wss://connect.browserbase.com?apiKey=<BROWSERBASE_API_KEY>",
        color: "#F97316",
      },
    },
  },
}
```

注意：

- [注册](https://www.browserbase.com/sign-up)并从[概览控制台](https://www.browserbase.com/overview)复制您的 **API 密钥**。
- 将 `<BROWSERBASE_API_KEY>` 替换为您的真实 Browserbase API 密钥。
- Browserbase 在 WebSocket 连接时自动创建浏览器会话，因此不需要手动会话创建步骤。
- 免费层允许一个并发会话和每月一个浏览器小时。有关付费计划限制，请参见[定价](https://www.browserbase.com/pricing)。
- 有关完整 API 参考、SDK 指南和集成示例，请参见 [Browserbase 文档](https://docs.browserbase.com)。

## 安全

关键要点：

- 浏览器控制仅限回环；访问通过 Gateway 的认证或节点配对流动。
- 独立的回环浏览器 HTTP API 使用**仅共享密钥认证**：Gateway 令牌承载认证、`x-openclaw-password` 或配置的 Gateway 密码的 HTTP 基本认证。
- Tailscale Serve 身份标头和 `gateway.auth.mode: "trusted-proxy"` **不**对这个独立的回环浏览器 API 进行认证。
- 如果启用了浏览器控制且没有配置共享密钥认证，OpenClaw 会在启动时自动生成 `gateway.auth.token` 并将其持久化到配置中。
- 当 `gateway.auth.mode` 已经是 `password`、`none` 或 `trusted-proxy` 时，OpenClaw **不**自动生成该令牌。
- 将 Gateway 和任何节点主机保持在私有网络（Tailscale）上；避免公开暴露。
- 将远程 CDP URL/令牌视为机密；优先使用环境变量或密钥管理器。

远程 CDP 提示：

- 尽可能优先使用加密端点（HTTPS 或 WSS）和短期令牌。
- 避免将长期令牌直接嵌入配置文件。

## 配置文件（多浏览器）

OpenClaw 支持多个命名配置文件（路由配置）。配置文件可以是：

- **OpenClaw 托管**：具有自己用户数据目录 + CDP 端口的专用基于 Chromium 的浏览器实例
- **远程**：显式 CDP URL（在其他地方运行的基于 Chromium 的浏览器）
- **现有会话**：通过 Chrome DevTools MCP 自动连接的您现有 Chrome 配置文件

默认值：

- 如果缺少 `openclaw` 配置文件，则自动创建。
- `user` 配置文件内置用于 Chrome MCP 现有会话附加。
- 现有会话配置文件超出 `user` 范围的是可选的；使用 `--driver existing-session` 创建它们。
- 本地 CDP 端口默认从 **18800-18899** 分配。
- 删除配置文件会将其本地数据目录移到回收站。

所有控制端点接受 `?profile=<name>`；CLI 使用 `--browser-profile`。

## 通过 Chrome DevTools MCP 的现有会话

OpenClaw 还可以通过官方 Chrome DevTools MCP 服务器附加到运行中的基于 Chromium 的浏览器配置文件。这重用了该浏览器配置文件中已打开的标签页和登录状态。

官方背景和设置参考：

- [面向开发者的 Chrome：使用 Chrome DevTools MCP 和您的浏览器会话](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

内置配置文件：

- `user`

可选：如果您想要不同的名称、颜色或浏览器数据目录，可以创建自己的自定义现有会话配置文件。

默认行为：

- 内置 `user` 配置文件使用 Chrome MCP 自动连接，以默认本地 Google Chrome 配置文件为目标。

对于 Brave、Edge、Chromium 或非默认 Chrome 配置文件，使用 `userDataDir`。`~` 展开为您的操作系统主目录：

```json5
{
  browser: {
    profiles: {
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
    },
  },
}
```

然后在匹配的浏览器中：

1. 打开该浏览器的用于远程调试的检查页面。
2. 启用远程调试。
3. 保持浏览器运行，并在 OpenClaw 附加时批准连接提示。

常见检查页面：

- Chrome：`chrome://inspect/#remote-debugging`
- Brave：`brave://inspect/#remote-debugging`
- Edge：`edge://inspect/#remote-debugging`

实时附加冒烟测试：

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

成功的样子：

- `status` 显示 `driver: existing-session`
- `status` 显示 `transport: chrome-mcp`
- `status` 显示 `running: true`
- `tabs` 列出您已打开的浏览器标签页
- `snapshot` 从所选的实时标签页返回引用

如果附加不起作用，请检查：

- 目标基于 Chromium 的浏览器版本为 `144+`
- 该浏览器的检查页面已启用远程调试
- 浏览器显示了附加同意提示并且您已接受
- `openclaw doctor` 迁移旧的基于扩展的浏览器配置并检查本地是否安装了 Chrome 以供默认自动连接配置文件使用，但无法为您启用浏览器端的远程调试

代理使用：

- 当您需要用户的已登录浏览器状态时，使用 `profile="user"`。
- 如果您使用自定义现有会话配置文件，请传递该显式配置文件名称。
- 仅当用户在电脑旁可以批准附加提示时才选择此模式。
- Gateway 或节点主机可以生成 `npx chrome-devtools-mcp@latest --autoConnect`

注意：

- 此路径比隔离的 `openclaw` 配置文件风险更高，因为它可以在您的已登录浏览器会话中操作。
- OpenClaw 不为此驱动启动浏览器；它只是附加。
- OpenClaw 在这里使用官方 Chrome DevTools MCP `--autoConnect` 流程。如果设置了 `userDataDir`，它会通过以定位该用户数据目录。
- 现有会话可以在所选主机上或通过已连接的浏览器节点附加。如果 Chrome 在其他地方且没有连接浏览器节点，请改用远程 CDP 或节点主机。

### 自定义 Chrome MCP 启动

当默认 `npx chrome-devtools-mcp@latest` 流程不满足您的需求时（离线主机、固定版本、打包的二进制文件），可以按配置文件覆盖生成的 Chrome DevTools MCP 服务器：

| 字段         | 功能                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `mcpCommand` | 要生成的可执行文件，替代 `npx`。按原样解析；绝对路径受支持。                                     |
| `mcpArgs`    | 逐字传递给 `mcpCommand` 的参数数组。替换默认的 `chrome-devtools-mcp@latest --autoConnect` 参数。 |

当 `cdpUrl` 在现有会话配置文件上设置时，OpenClaw 跳过 `--autoConnect` 并自动将端点转发给 Chrome MCP：

- `http(s)://...` → `--browserUrl <url>`（DevTools HTTP 发现端点）。
- `ws(s)://...` → `--wsEndpoint <url>`（直接 CDP WebSocket）。

端点标志和 `userDataDir` 不能组合：当设置了 `cdpUrl` 时，Chrome MCP 启动会忽略 `userDataDir`，因为 Chrome MCP 附加到端点后面的运行中的浏览器，而不是打开配置文件目录。

<Accordion title="现有会话功能限制">

与托管的 `openclaw` 配置文件相比，现有会话驱动受到更多限制：

- **截图** — 页面捕获和 `--ref` 元素捕获有效；CSS `--element` 选择器不行。`--full-page` 不能与 `--ref` 或 `--element` 组合。Playwright 不是页面或基于引用的元素截图所必需的。
- **操作** — `click`、`type`、`hover`、`scrollIntoView`、`drag` 和 `select` 需要快照引用（不支持 CSS 选择器）。`click-coords` 点击可见视口坐标，不需要快照引用。`click` 仅限左键。`type` 不支持 `slowly=true`；使用 `fill` 或 `press`。`press` 不支持 `delayMs`。`type`、`hover`、`scrollIntoView`、`drag`、`select`、`fill` 和 `evaluate` 不支持每次调用的超时。`select` 接受单个值。
- **等待/上传/对话框** — `wait --url` 支持精确、子字符串和 glob 模式；不支持 `wait --load networkidle`。上传钩子需要 `ref` 或 `inputRef`，一次一个文件，不支持 CSS `element`。对话框钩子不支持超时覆盖。
- **仅限托管的功能** — 批量操作、PDF 导出、下载拦截和 `responsebody` 仍然需要托管浏览器路径。

</Accordion>

## 隔离保证

- **专用用户数据目录**：永远不接触您的个人浏览器配置文件。
- **专用端口**：避免使用 `9222` 以防止与开发工作流冲突。
- **确定性标签页控制**：`tabs` 首先返回 `suggestedTargetId`，然后返回稳定的 `tabId` 句柄（如 `t1`）、可选标签和原始 `targetId`。代理应重用 `suggestedTargetId`；原始 id 仍可用于调试和兼容性。

## 浏览器选择

本地启动时，OpenClaw 选择第一个可用的：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

您可以使用 `browser.executablePath` 覆盖。

平台：

- macOS：检查 `/Applications` 和 `~/Applications`。
- Linux：检查 `/usr/bin`、`/snap/bin`、`/opt/google`、`/opt/brave.com`、`/usr/lib/chromium` 和 `/usr/lib/chromium-browser` 下的常见 Chrome/Brave/Edge/Chromium 位置。
- Windows：检查常见的安装位置。

## 控制 API（可选）

用于脚本和调试，Gateway 提供一个小型**仅限回环的 HTTP 控制 API** 以及匹配的 `openclaw browser` CLI（快照、引用、等待增强、JSON 输出、调试工作流）。完整参考请参见[浏览器控制 API](/tools/browser-control)。

## 故障排除

有关 Linux 特定问题（尤其是 snap Chromium），请参见[浏览器故障排除](/tools/browser-linux-troubleshooting)。

有关 WSL2 Gateway + Windows Chrome 分离主机设置，请参见 [WSL2 + Windows + 远程 Chrome CDP 故障排除](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

### CDP 启动失败 vs 导航 SSRF 阻断

这是不同的失败类别，它们指向不同的代码路径。

- **CDP 启动或就绪失败**意味着 OpenClaw 无法确认浏览器控制平面是健康的。
- **导航 SSRF 阻断**意味着浏览器控制平面是健康的，但页面导航目标被策略拒绝。

常见示例：

- CDP 启动或就绪失败：
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
  - `Port <port> is in use for profile "<name>" but not by openclaw`，当回环外部 CDP 服务配置时没有 `attachOnly: true`
- 导航 SSRF 阻断：
  - `open`、`navigate`、快照或标签页打开流以浏览器/网络策略错误失败，而 `start` 和 `tabs` 仍然工作

使用这个最小序列来分离两者：

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

如何读取结果：

- 如果 `start` 以 `not reachable after start` 失败，首先排查 CDP 就绪问题。
- 如果 `start` 成功但 `tabs` 失败，控制平面仍然不健康。将其视为 CDP 可达性问题，而不是页面导航问题。
- 如果 `start` 和 `tabs` 成功但 `open` 或 `navigate` 失败，浏览器控制平面已启动，失败在导航策略或目标页面中。
- 如果 `start`、`tabs` 和 `open` 都成功，基本的托管浏览器控制路径是健康的。

重要行为细节：

- 即使您没有配置 `browser.ssrfPolicy`，浏览器配置也默认为关闭失败的 SSRF 策略对象。
- 对于本地回环 `openclaw` 托管配置文件，CDP 健康检查特意跳过浏览器 SSRF 可达性强制，用于 OpenClaw 自己的本地控制平面。
- 导航保护是单独的。成功的 `start` 或 `tabs` 结果不意味着后续的 `open` 或 `navigate` 目标被允许。

安全指导：

- **不要**默认放宽浏览器 SSRF 策略。
- 优先使用窄主机例外（如 `hostnameAllowlist` 或 `allowedHostnames`）而不是广泛的私有网络访问。
- 仅在需要并已审查私有网络浏览器访问的有意信任环境中使用 `dangerouslyAllowPrivateNetwork: true`。

## 代理工具 + 控制如何工作

代理获得**一个工具**用于浏览器自动化：

- `browser` — doctor/status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

映射方式：

- `browser snapshot` 返回稳定的 UI 树（AI 或 ARIA）。
- `browser act` 使用快照 `ref` ID 来点击/输入/拖拽/选择。
- `browser screenshot` 捕获像素（全页、元素或带标签的引用）。
- `browser doctor` 检查 Gateway、插件、配置文件、浏览器和标签页就绪状态。
- `browser` 接受：
  - `profile` 以选择命名的浏览器配置文件（openclaw、chrome 或远程 CDP）。
  - `target`（`sandbox` | `host` | `node`）以选择浏览器所在位置。
  - 在沙箱会话中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略 `target`：沙箱会话默认为 `sandbox`，非沙箱会话默认为 `host`。
  - 如果连接了支持浏览器的节点，工具可能自动路由到它，除非您固定 `target="host"` 或 `target="node"`。

这使代理保持确定性并避免脆弱的选择器。

## 相关

- [工具概览](/tools) — 所有可用的代理工具
- [沙箱](/gateway/sandboxing) — 沙箱环境中的浏览器控制
- [安全](/gateway/security) — 浏览器控制风险和加固
