---
summary: "`openclaw browser` 的 CLI 参考（生命周期、配置文件、标签页、操作、状态和调试）"
read_when:
  - 你使用 `openclaw browser` 并想要常见任务的示例
  - 你想通过节点主机控制运行在另一台机器上的浏览器
  - 你想通过 Chrome MCP 附加到本地已登录的 Chrome
title: "Browser"
---

# `openclaw browser`

管理 OpenClaw 的浏览器控制界面，并运行浏览器操作（生命周期、配置文件、标签页、快照、截图、导航、输入、状态模拟和调试）。

相关：

- 浏览器工具 + API：[Browser tool](/tools/browser)

## 常用标志

- `--url <gatewayWsUrl>`：Gateway WebSocket URL（默认来自配置）。
- `--token <token>`：Gateway 令牌（如需要）。
- `--timeout <ms>`：请求超时（毫秒）。
- `--expect-final`：等待 Gateway 的最终响应。
- `--browser-profile <name>`：选择浏览器配置文件（默认来自配置）。
- `--json`：机器可读输出（在支持的地方）。

## 快速入门（本地）

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

Agent 可以用 `browser({ action: "doctor" })` 运行同样的就绪检查。

## 快速故障排除

如果 `start` 失败并显示 `not reachable after start`，请先排查 CDP 就绪问题。如果 `start` 和 `tabs` 成功但 `open` 或 `navigate` 失败，浏览器控制平面是健康的，失败通常是导航 SSRF 策略问题。

最小操作序列：

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

详细指南：[浏览器故障排除](/tools/browser#cdp-startup-failure-vs-navigation-ssrf-block)

## 生命周期

```bash
openclaw browser status
openclaw browser doctor
openclaw browser doctor --deep
openclaw browser start
openclaw browser start --headless
openclaw browser stop
openclaw browser --browser-profile openclaw reset-profile
```

备注：

- `doctor --deep` 添加实时快照探测。当基本 CDP 就绪状态为绿色，但你想证明当前标签页可以被检查时，此选项很有用。
- 对于 `attachOnly` 和远程 CDP 配置文件，`openclaw browser stop` 会关闭活动控制会话并清除临时模拟覆盖，即使 OpenClaw 本身没有启动浏览器进程。
- 对于本地托管配置文件，`openclaw browser stop` 会停止已生成的浏览器进程。
- `openclaw browser start --headless` 仅适用于该启动请求，且仅当 OpenClaw 启动本地托管浏览器时有效。它不会重写 `browser.headless` 或配置文件配置，对已运行的浏览器是空操作。
- 在没有 `DISPLAY` 或 `WAYLAND_DISPLAY` 的 Linux 主机上，本地托管配置文件会自动以无头模式运行，除非 `OPENCLAW_BROWSER_HEADLESS=0`、`browser.headless=false` 或 `browser.profiles.<name>.headless=false` 明确请求可见浏览器。

## 如果命令缺失

如果 `openclaw browser` 是未知命令，请检查 `~/.openclaw/openclaw.json` 中的 `plugins.allow`。

当 `plugins.allow` 存在时，除非配置中已经有根 `browser` 块，否则请显式列出捆绑的浏览器插件：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

显式的根 `browser` 块（例如 `browser.enabled=true` 或 `browser.profiles.<name>`）在限制性插件允许列表下也会激活捆绑的浏览器插件。

相关：[Browser tool](/tools/browser#missing-browser-command-or-tool)

## 配置文件

配置文件是命名的浏览器路由配置。在实践中：

- `openclaw`：启动或附加到专用的 OpenClaw 托管 Chrome 实例（隔离的用户数据目录）。
- `user`：通过 Chrome DevTools MCP 控制你现有的已登录 Chrome 会话。
- 自定义 CDP 配置文件：指向本地或远程 CDP 端点。

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name remote --cdp-url https://browser-host.example.com
openclaw browser delete-profile --name work
```

使用特定配置文件：

```bash
openclaw browser --browser-profile work tabs
```

## 标签页

```bash
openclaw browser tabs
openclaw browser tab new --label docs
openclaw browser tab label t1 docs
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://docs.openclaw.ai --label docs
openclaw browser focus docs
openclaw browser close t1
```

`tabs` 首先返回 `suggestedTargetId`，然后是稳定的 `tabId`（如 `t1`）、可选标签和原始 `targetId`。Agent 应将 `suggestedTargetId` 传回 `focus`、`close`、快照和操作中。你可以用 `open --label`、`tab new --label` 或 `tab label` 分配标签；标签、标签页 ID、原始目标 ID 和唯一目标 ID 前缀都被接受。
当 Chromium 在导航或表单提交期间替换底层原始目标时，如果 OpenClaw 能够证明匹配，它会将稳定的 `tabId`/标签附加到替换标签页。原始目标 ID 仍然是易变的；建议使用 `suggestedTargetId`。

## 快照/截图/操作

快照：

```bash
openclaw browser snapshot
openclaw browser snapshot --urls
```

截图：

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref e12
openclaw browser screenshot --labels
```

备注：

- `--full-page` 仅用于页面捕获；不能与 `--ref` 或 `--element` 组合。
- `existing-session` / `user` 配置文件支持页面截图和来自快照输出的 `--ref` 截图，但不支持 CSS `--element` 截图。
- `--labels` 在截图上叠加当前快照引用。
- `snapshot --urls` 将发现的链接目标附加到 AI 快照，以便 agent 可以选择直接导航目标，而不是仅从链接文字猜测。

导航/点击/输入（基于引用的 UI 自动化）：

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser click-coords 120 340
openclaw browser type <ref> "hello"
openclaw browser press Enter
openclaw browser hover <ref>
openclaw browser scrollintoview <ref>
openclaw browser drag <startRef> <endRef>
openclaw browser select <ref> OptionA OptionB
openclaw browser fill --fields '[{"ref":"1","value":"Ada"}]'
openclaw browser wait --text "Done"
openclaw browser evaluate --fn '(el) => el.textContent' --ref <ref>
```

当 OpenClaw 能够证明替换标签页时，操作响应会在操作触发页面替换后返回当前原始 `targetId`。脚本仍应存储并传递 `suggestedTargetId`/标签以用于长期工作流。

文件 + 对话框辅助工具：

```bash
openclaw browser upload /tmp/openclaw/uploads/file.pdf --ref <ref>
openclaw browser waitfordownload
openclaw browser download <ref> report.pdf
openclaw browser dialog --accept
```

托管 Chrome 配置文件将普通点击触发的下载保存到 OpenClaw 下载目录（默认为 `/tmp/openclaw/downloads`，或配置的临时根目录）。当 agent 需要等待特定文件并返回其路径时，使用 `waitfordownload` 或 `download`；这些显式等待器拥有下一次下载。

## 状态和存储

视口 + 模拟：

```bash
openclaw browser resize 1280 720
openclaw browser set viewport 1280 720
openclaw browser set offline on
openclaw browser set media dark
openclaw browser set timezone Europe/London
openclaw browser set locale en-GB
openclaw browser set geo 51.5074 -0.1278 --accuracy 25
openclaw browser set device "iPhone 14"
openclaw browser set headers '{"x-test":"1"}'
openclaw browser set credentials myuser mypass
```

Cookies + 存储：

```bash
openclaw browser cookies
openclaw browser cookies set session abc123 --url https://example.com
openclaw browser cookies clear
openclaw browser storage local get
openclaw browser storage local set token abc123
openclaw browser storage session clear
```

## 调试

```bash
openclaw browser console --level error
openclaw browser pdf
openclaw browser responsebody "**/api"
openclaw browser highlight <ref>
openclaw browser errors --clear
openclaw browser requests --filter api
openclaw browser trace start
openclaw browser trace stop --out trace.zip
```

## 通过 MCP 使用现有 Chrome

使用内置的 `user` 配置文件，或创建你自己的 `existing-session` 配置文件：

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

此路径仅限主机。对于 Docker、无头服务器、Browserless 或其他远程设置，请改用 CDP 配置文件。

当前 existing-session 的限制：

- 基于快照驱动的操作使用引用，而不是 CSS 选择器
- 当调用者省略 `timeoutMs` 时，`browser.actionTimeoutMs` 默认将支持的 `act` 请求超时设为 60000 毫秒；每次调用的 `timeoutMs` 仍然优先。
- `click` 仅支持左键点击
- `type` 不支持 `slowly=true`
- `press` 不支持 `delayMs`
- `hover`、`scrollintoview`、`drag`、`select`、`fill` 和 `evaluate` 拒绝每次调用的超时覆盖
- `select` 仅支持一个值
- 不支持 `wait --load networkidle`
- 文件上传需要 `--ref` / `--input-ref`，不支持 CSS `--element`，目前一次只支持一个文件
- 对话框钩子不支持 `--timeout`
- 截图支持页面捕获和 `--ref`，但不支持 CSS `--element`
- `responsebody`、下载拦截、PDF 导出和批量操作仍然需要托管浏览器或原始 CDP 配置文件

## 远程浏览器控制（节点主机代理）

如果 Gateway 运行在与浏览器不同的机器上，请在拥有 Chrome/Brave/Edge/Chromium 的机器上运行**节点主机**。Gateway 会将浏览器操作代理到该节点（不需要单独的浏览器控制服务器）。

使用 `gateway.nodes.browser.mode` 控制自动路由，使用 `gateway.nodes.browser.node` 在连接了多个节点时固定特定节点。

安全 + 远程设置：[Browser tool](/tools/browser)、[远程访问](/gateway/remote)、[Tailscale](/gateway/tailscale)、[安全](/gateway/security)

## 相关

- [CLI 参考](/cli)
- [Browser](/tools/browser)
