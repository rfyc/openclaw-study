---
summary: "OpenClaw 浏览器控制 API、CLI 参考和脚本操作"
read_when:
  - 通过本地控制 API 编写脚本或调试代理浏览器
  - 查找 `openclaw browser` CLI 参考
  - 使用快照和引用添加自定义浏览器自动化
title: "浏览器控制 API"
---

有关设置、配置和故障排除，请参阅[浏览器](/tools/browser)。
本页是本地控制 HTTP API、`openclaw browser` CLI 以及脚本模式（快照、引用、等待、调试流程）的参考。

## 控制 API（可选）

仅用于本地集成，Gateway 提供一个小型回环 HTTP API：

- 状态/启动/停止：`GET /`、`POST /start`、`POST /stop`
- 标签页：`GET /tabs`、`POST /tabs/open`、`POST /tabs/focus`、`DELETE /tabs/:targetId`
- 快照/截图：`GET /snapshot`、`POST /screenshot`
- 操作：`POST /navigate`、`POST /act`
- 钩子：`POST /hooks/file-chooser`、`POST /hooks/dialog`
- 下载：`POST /download`、`POST /wait/download`
- 权限：`POST /permissions/grant`
- 调试：`GET /console`、`POST /pdf`
- 调试：`GET /errors`、`GET /requests`、`POST /trace/start`、`POST /trace/stop`、`POST /highlight`
- 网络：`POST /response/body`
- 状态：`GET /cookies`、`POST /cookies/set`、`POST /cookies/clear`
- 状态：`GET /storage/:kind`、`POST /storage/:kind/set`、`POST /storage/:kind/clear`
- 设置：`POST /set/offline`、`POST /set/headers`、`POST /set/credentials`、`POST /set/geolocation`、`POST /set/media`、`POST /set/timezone`、`POST /set/locale`、`POST /set/device`

所有端点接受 `?profile=<name>`。`POST /start?headless=true` 为本地托管配置文件请求一次性无头启动，而不更改持久化的浏览器配置；仅附加、远程 CDP 和现有会话配置文件会拒绝该覆盖，因为 OpenClaw 不启动这些浏览器进程。

如果配置了共享密钥 Gateway 认证，浏览器 HTTP 路由也需要认证：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或使用该密码的 HTTP 基本认证

注意：

- 这个独立的回环浏览器 API **不**消费受信任代理或 Tailscale Serve 身份标头。
- 如果 `gateway.auth.mode` 为 `none` 或 `trusted-proxy`，这些回环浏览器路由不继承这些带身份标记的模式；请保持它们仅限回环。

### `/act` 错误合同

`POST /act` 对路由级验证和策略失败使用结构化错误响应：

```json
{ "error": "<message>", "code": "ACT_*" }
```

当前 `code` 值：

- `ACT_KIND_REQUIRED`（HTTP 400）：`kind` 缺失或无法识别。
- `ACT_INVALID_REQUEST`（HTTP 400）：操作负载规范化或验证失败。
- `ACT_SELECTOR_UNSUPPORTED`（HTTP 400）：`selector` 与不支持的操作类型一起使用。
- `ACT_EVALUATE_DISABLED`（HTTP 403）：`evaluate`（或 `wait --fn`）被配置禁用。
- `ACT_TARGET_ID_MISMATCH`（HTTP 403）：顶级或批处理 `targetId` 与请求目标冲突。
- `ACT_EXISTING_SESSION_UNSUPPORTED`（HTTP 501）：现有会话配置文件不支持该操作。

其他运行时失败仍可能返回不带 `code` 字段的 `{ "error": "<message>" }`。

### Playwright 要求

某些功能（导航/操作/AI 快照/角色快照、元素截图、PDF）需要 Playwright。如果未安装 Playwright，这些端点会返回清晰的 501 错误。

不使用 Playwright 仍然有效的功能：

- ARIA 快照
- 当每个标签页的 CDP WebSocket 可用时，角色样式无障碍快照（`--interactive`、`--compact`、`--depth`、`--efficient`）。这是用于检查和引用发现的后备方案；Playwright 仍是主要操作引擎。
- 当每个标签页的 CDP WebSocket 可用时，托管 `openclaw` 浏览器的页面截图
- `existing-session` / Chrome MCP 配置文件的页面截图
- 来自快照输出的 `existing-session` 基于引用的截图（`--ref`）

仍需要 Playwright 的功能：

- `navigate`
- `act`
- 依赖 Playwright 原生 AI 快照格式的 AI 快照
- CSS 选择器元素截图（`--element`）
- 完整浏览器 PDF 导出

元素截图也拒绝 `--full-page`；路由返回 `fullPage is not supported for element screenshots`。

如果您看到 `Playwright is not available in this gateway build`，则打包的 Gateway 缺少核心浏览器运行时依赖项。重新安装或更新 OpenClaw，然后重启 Gateway。对于 Docker，还需按如下所示安装 Chromium 浏览器二进制文件。

#### Docker Playwright 安装

如果您的 Gateway 在 Docker 中运行，请避免使用 `npx playwright`（npm 覆盖冲突）。改用捆绑的 CLI：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

要持久化浏览器下载，请设置 `PLAYWRIGHT_BROWSERS_PATH`（例如，`/home/node/.cache/ms-playwright`），并确保通过 `OPENCLAW_HOME_VOLUME` 或绑定挂载持久化 `/home/node`。参见 [Docker](/install/docker)。

## 工作原理（内部）

一个小型回环控制服务器接受 HTTP 请求，并通过 CDP 连接到基于 Chromium 的浏览器。高级操作（点击/输入/快照/PDF）通过 CDP 之上的 Playwright 进行；当 Playwright 缺失时，只有非 Playwright 操作可用。代理看到一个稳定的接口，而本地/远程浏览器和配置文件在底层自由切换。

## CLI 快速参考

所有命令接受 `--browser-profile <name>` 以指定特定配置文件，以及 `--json` 用于机器可读输出。

<AccordionGroup>

<Accordion title="基础：状态、标签页、打开/聚焦/关闭">

```bash
openclaw browser status
openclaw browser start
openclaw browser start --headless # 一次性本地托管无头启动
openclaw browser stop            # 也会清除附加专用/远程 CDP 上的模拟设置
openclaw browser tabs
openclaw browser tab             # 当前标签页的快捷方式
openclaw browser tab new
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://example.com
openclaw browser focus abcd1234
openclaw browser close abcd1234
```

</Accordion>

<Accordion title="检查：截图、快照、控制台、错误、请求">

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref 12        # 或 --ref e12
openclaw browser screenshot --labels
openclaw browser snapshot
openclaw browser snapshot --format aria --limit 200
openclaw browser snapshot --interactive --compact --depth 6
openclaw browser snapshot --efficient
openclaw browser snapshot --labels
openclaw browser snapshot --urls
openclaw browser snapshot --selector "#main" --interactive
openclaw browser snapshot --frame "iframe#main" --interactive
openclaw browser console --level error
openclaw browser errors --clear
openclaw browser requests --filter api --clear
openclaw browser pdf
openclaw browser responsebody "**/api" --max-chars 5000
```

</Accordion>

<Accordion title="操作：导航、点击、输入、拖拽、等待、执行">

```bash
openclaw browser navigate https://example.com
openclaw browser resize 1280 720
openclaw browser click 12 --double           # 或 e12 用于角色引用
openclaw browser click-coords 120 340        # 视口坐标
openclaw browser type 23 "hello" --submit
openclaw browser press Enter
openclaw browser hover 44
openclaw browser scrollintoview e12
openclaw browser drag 10 11
openclaw browser select 9 OptionA OptionB
openclaw browser download e12 report.pdf
openclaw browser waitfordownload report.pdf
openclaw browser upload /tmp/openclaw/uploads/file.pdf
openclaw browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'
openclaw browser dialog --accept
openclaw browser wait --text "Done"
openclaw browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"
openclaw browser evaluate --fn '(el) => el.textContent' --ref 7
openclaw browser highlight e12
openclaw browser trace start
openclaw browser trace stop
```

</Accordion>

<Accordion title="状态：Cookie、存储、离线、标头、地理位置、设备">

```bash
openclaw browser cookies
openclaw browser cookies set session abc123 --url "https://example.com"
openclaw browser cookies clear
openclaw browser storage local get
openclaw browser storage local set theme dark
openclaw browser storage session clear
openclaw browser set offline on
openclaw browser set headers --headers-json '{"X-Debug":"1"}'
openclaw browser set credentials user pass            # --clear 用于移除
openclaw browser set geo 37.7749 -122.4194 --origin "https://example.com"
openclaw browser set media dark
openclaw browser set timezone America/New_York
openclaw browser set locale en-US
openclaw browser set device "iPhone 14"
```

</Accordion>

</AccordionGroup>

注意：

- `upload` 和 `dialog` 是**准备**调用；在触发选择器/对话框的点击/按键之前运行它们。
- `click`/`type` 等操作需要来自 `snapshot` 的 `ref`（数字 `12`、角色引用 `e12` 或可操作的 ARIA 引用 `ax12`）。操作不支持 CSS 选择器。当可见视口位置是唯一可靠目标时，使用 `click-coords`。
- 下载、跟踪和上传路径受限于 OpenClaw 临时根目录：`/tmp/openclaw{,/downloads,/uploads}`（回退：`${os.tmpdir()}/openclaw/...`）。
- `upload` 也可以通过 `--input-ref` 或 `--element` 直接设置文件输入。

当 OpenClaw 能够证明替换标签页时（例如相同 URL，或表单提交后单个旧标签页变为单个新标签页），稳定的标签页 id 和标签在 Chromium 原始目标替换后仍然存在。原始目标 id 仍然是不稳定的；在脚本中优先使用 `tabs` 中的 `suggestedTargetId`。

快照标志一览：

- `--format ai`（Playwright 默认）：带数字引用的 AI 快照（`aria-ref="<n>"`）。
- `--format aria`：带 `axN` 引用的无障碍树。当 Playwright 可用时，OpenClaw 通过后端 DOM id 将引用绑定到实时页面，以便后续操作可以使用它们；否则将输出视为仅供检查。
- `--efficient`（或 `--mode efficient`）：紧凑角色快照预设。设置 `browser.snapshotDefaults.mode: "efficient"` 使其成为默认值（参见 [Gateway 配置](/gateway/configuration-reference#browser)）。
- `--interactive`、`--compact`、`--depth`、`--selector` 强制使用 `ref=e12` 引用的角色快照。`--frame "<iframe>"` 将角色快照范围限制到 iframe。
- `--labels` 添加带有叠加引用标签的仅视口截图（打印 `MEDIA:<path>`）。
- `--urls` 将发现的链接目的地附加到 AI 快照。

## 快照和引用

OpenClaw 支持两种"快照"样式：

- **AI 快照（数字引用）**：`openclaw browser snapshot`（默认；`--format ai`）
  - 输出：包含数字引用的文本快照。
  - 操作：`openclaw browser click 12`、`openclaw browser type 23 "hello"`。
  - 内部通过 Playwright 的 `aria-ref` 解析引用。

- **角色快照（如 `e12` 的角色引用）**：`openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 输出：带 `[ref=e12]`（和可选 `[nth=1]`）的基于角色的列表/树。
  - 操作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 内部通过 `getByRole(...)` 解析引用（重复元素加 `nth()`）。
  - 添加 `--labels` 以包含带叠加 `e12` 标签的视口截图。
  - 当链接文本不明确且代理需要具体导航目标时，添加 `--urls`。

- **ARIA 快照（如 `ax12` 的 ARIA 引用）**：`openclaw browser snapshot --format aria`
  - 输出：结构化节点形式的无障碍树。
  - 操作：当快照路径可以通过 Playwright 和 Chrome 后端 DOM id 绑定引用时，`openclaw browser click ax12` 有效。
- 如果 Playwright 不可用，ARIA 快照仍可用于检查，但引用可能无法操作。当需要操作引用时，使用 `--format ai` 或 `--interactive` 重新快照。
- 原始 CDP 回退路径的 Docker 验证：`pnpm test:docker:browser-cdp-snapshot` 会使用 CDP 启动 Chromium，运行 `browser doctor --deep`，并验证角色快照包含链接 URL、光标提升的可点击元素和 iframe 元数据。

引用行为：

- 引用**在导航之间不稳定**；如果出现失败，请重新运行 `snapshot` 并使用新引用。
- `/act` 在能证明替换标签页时，在操作触发的替换后返回当前原始 `targetId`。继续使用稳定的标签页 id/标签进行后续命令。
- 如果角色快照是使用 `--frame` 拍摄的，角色引用会限定在该 iframe 范围内，直到下一次角色快照。
- 未知或过期的 `axN` 引用会快速失败，而不会落入 Playwright 的 `aria-ref` 选择器。发生这种情况时，在同一标签页上重新获取快照。

## 等待增强

您可以等待不仅仅是时间/文本的条件：

- 等待 URL（Playwright 支持 glob 模式）：
  - `openclaw browser wait --url "**/dash"`
- 等待加载状态：
  - `openclaw browser wait --load networkidle`
- 等待 JS 谓词：
  - `openclaw browser wait --fn "window.ready===true"`
- 等待选择器变为可见：
  - `openclaw browser wait "#main"`

这些可以组合：

```bash
openclaw browser wait "#main" \
  --url "**/dash" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000
```

## 调试工作流

当操作失败时（例如"不可见"、"严格模式违规"、"被覆盖"）：

1. `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>`（交互模式下优先使用角色引用）
3. 如果仍然失败：`openclaw browser highlight <ref>` 查看 Playwright 的目标元素
4. 如果页面行为异常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 对于深度调试：记录跟踪：
   - `openclaw browser trace start`
   - 重现问题
   - `openclaw browser trace stop`（打印 `TRACE:<path>`）

## JSON 输出

`--json` 用于脚本和结构化工具。

示例：

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

JSON 中的角色快照包含 `refs` 加上一个小 `stats` 块（行数/字符数/引用数/交互元素数），以便工具推理负载大小和密度。

## 状态和环境设置

这些对"让网站表现得像 X"的工作流很有用：

- Cookie：`cookies`、`cookies set`、`cookies clear`
- 存储：`storage local|session get|set|clear`
- 离线：`set offline on|off`
- 标头：`set headers --headers-json '{"X-Debug":"1"}'`（旧版 `set headers --json '{"X-Debug":"1"}'` 仍然支持）
- HTTP 基本认证：`set credentials user pass`（或 `--clear`）
- 地理位置：`set geo <lat> <lon> --origin "https://example.com"`（或 `--clear`）
- 媒体：`set media dark|light|no-preference|none`
- 时区/区域设置：`set timezone ...`、`set locale ...`
- 设备/视口：
  - `set device "iPhone 14"`（Playwright 设备预设）
  - `set viewport 1280 720`

## 安全和隐私

- OpenClaw 浏览器配置文件可能包含已登录的会话；请将其视为敏感信息。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn` 在页面上下文中执行任意 JavaScript。提示注入可以引导这一过程。如果不需要，请用 `browser.evaluateEnabled=false` 禁用它。
- 有关登录和防机器人说明（X/Twitter 等），请参阅[浏览器登录 + X/Twitter 发帖](/tools/browser-login)。
- 保持 Gateway/节点主机私有（仅回环或 tailnet）。
- 远程 CDP 端点功能强大；请对其进行隧道保护。

严格模式示例（默认阻止私有/内部目标）：

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com", "example.com"],
      allowedHostnames: ["localhost"], // 可选精确允许
    },
  },
}
```

## 相关

- [浏览器](/tools/browser) — 概览、配置、配置文件、安全
- [浏览器登录](/tools/browser-login) — 登录网站
- [浏览器 Linux 故障排除](/tools/browser-linux-troubleshooting)
- [浏览器 WSL2 故障排除](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
