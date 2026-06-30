---
summary: "OpenClaw CLI 索引：命令列表、全局标志和每命令页面链接"
read_when:
  - 查找合适的 `openclaw` 子命令
  - 查找全局标志或输出样式规则
title: "CLI 参考"
---

`openclaw` 是主 CLI 入口点。每个核心命令都有专用的参考页面或与其别名的命令一起记录；本索引列出了命令、全局标志以及适用于整个 CLI 的输出样式规则。

## 命令页面

| 区域           | 命令                                                                                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 设置和引导     | [`crestodian`](/cli/crestodian) · [`setup`](/cli/setup) · [`onboard`](/cli/onboard) · [`configure`](/cli/configure) · [`config`](/cli/config) · [`completion`](/cli/completion) · [`doctor`](/cli/doctor) · [`dashboard`](/cli/dashboard) |
| 重置和卸载     | [`backup`](/cli/backup) · [`reset`](/cli/reset) · [`uninstall`](/cli/uninstall) · [`update`](/cli/update)                                                                                                                                 |
| 消息和 agent   | [`message`](/cli/message) · [`agent`](/cli/agent) · [`agents`](/cli/agents) · [`acp`](/cli/acp) · [`mcp`](/cli/mcp)                                                                                                                       |
| 健康和会话     | [`status`](/cli/status) · [`health`](/cli/health) · [`sessions`](/cli/sessions)                                                                                                                                                           |
| Gateway 和日志 | [`gateway`](/cli/gateway) · [`logs`](/cli/logs) · [`system`](/cli/system)                                                                                                                                                                 |
| 模型和推理     | [`models`](/cli/models) · [`infer`](/cli/infer) · `capability`（[`infer`](/cli/infer) 的别名）· [`memory`](/cli/memory) · [`commitments`](/cli/commitments) · [`wiki`](/cli/wiki)                                                         |
| 网络和节点     | [`directory`](/cli/directory) · [`nodes`](/cli/nodes) · [`devices`](/cli/devices) · [`node`](/cli/node)                                                                                                                                   |
| 运行时和沙箱   | [`approvals`](/cli/approvals) · `exec-policy`（见 [`approvals`](/cli/approvals)）· [`sandbox`](/cli/sandbox) · [`tui`](/cli/tui) · `chat`/`terminal`（[`tui --local`](/cli/tui) 的别名）· [`browser`](/cli/browser)                       |
| 自动化         | [`cron`](/cli/cron) · [`tasks`](/cli/tasks) · [`hooks`](/cli/hooks) · [`webhooks`](/cli/webhooks)                                                                                                                                         |
| 发现和文档     | [`dns`](/cli/dns) · [`docs`](/cli/docs)                                                                                                                                                                                                   |
| 配对和频道     | [`pairing`](/cli/pairing) · [`qr`](/cli/qr) · [`channels`](/cli/channels)                                                                                                                                                                 |
| 安全和插件     | [`security`](/cli/security) · [`secrets`](/cli/secrets) · [`skills`](/cli/skills) · [`plugins`](/cli/plugins) · [`proxy`](/cli/proxy)                                                                                                     |
| 旧版别名       | [`daemon`](/cli/daemon)（gateway 服务）· [`clawbot`](/cli/clawbot)（命名空间）                                                                                                                                                            |
| 插件（可选）   | [`voicecall`](/cli/voicecall)（如已安装）                                                                                                                                                                                                 |

## 全局标志

| 标志                    | 用途                                                  |
| ----------------------- | ----------------------------------------------------- |
| `--dev`                 | 在 `~/.openclaw-dev` 下隔离状态并移动默认端口         |
| `--profile <name>`      | 在 `~/.openclaw-<name>` 下隔离状态                    |
| `--container <name>`    | 定向命名容器以执行                                    |
| `--no-color`            | 禁用 ANSI 颜色（也支持 `NO_COLOR=1`）                 |
| `--update`              | [`openclaw update`](/cli/update) 的简写（仅限源安装） |
| `-V`, `--version`, `-v` | 打印版本并退出                                        |

## 输出模式

- ANSI 颜色和进度指示器仅在 TTY 会话中渲染。
- OSC-8 超链接在支持的地方渲染为可点击链接；否则 CLI 回退到普通 URL。
- `--json`（以及支持的 `--plain`）禁用样式以获得干净的输出。
- 长时间运行的命令显示进度指示器（支持时为 OSC 9;4）。

调色板真相来源：`src/terminal/palette.ts`。

## 命令树

<Accordion title="完整命令树">

```
openclaw [--dev] [--profile <name>] <command>
  crestodian
  setup
  onboard
  configure
  config
    get
    set
    unset
    file
    schema
    validate
  completion
  doctor
  dashboard
  backup
    create
    verify
  security
    audit
  secrets
    reload
    audit
    configure
    apply
  reset
  uninstall
  update
    wizard
    status
  channels
    list
    status
    capabilities
    resolve
    logs
    add
    remove
    login
    logout
  directory
    self
    peers list
    groups list|members
  skills
    search
    install
    update
    list
    info
    check
  plugins
    list
    inspect
    install
    uninstall
    update
    enable
    disable
    doctor
    marketplace list
  memory
    status
    index
    search
  commitments
    list
    dismiss
  wiki
    status
    doctor
    init
    ingest
    compile
    lint
    search
    get
    apply
    bridge import
    unsafe-local import
    obsidian status|search|open|command|daily
  message
    send
    broadcast
    poll
    react
    reactions
    read
    edit
    delete
    pin
    unpin
    pins
    permissions
    search
    thread create|list|reply
    emoji list|upload
    sticker send|upload
    role info|add|remove
    channel info|list
    member info
    voice status
    event list|create
    timeout
    kick
    ban
  agent
  agents
    list
    add
    delete
    bindings
    bind
    unbind
    set-identity
  acp
  mcp
    serve
    list
    show
    set
    unset
  status
  health
  sessions
    cleanup
  tasks
    list
    audit
    maintenance
    show
    notify
    cancel
    flow list|show|cancel
  gateway
    call
    usage-cost
    health
    status
    probe
    discover
    install
    uninstall
    start
    stop
    restart
    run
  daemon
    status
    install
    uninstall
    start
    stop
    restart
  logs
  system
    event
    heartbeat last|enable|disable
    presence
  models
    list
    status
    set
    set-image
    aliases list|add|remove
    fallbacks list|add|remove|clear
    image-fallbacks list|add|remove|clear
    scan
  infer (alias: capability)
    list
    inspect
    model run|list|inspect|providers|auth login|logout|status
    image generate|edit|describe|describe-many|providers
    audio transcribe|providers
    tts convert|voices|providers|status|enable|disable|set-provider
    video generate|describe|providers
    web search|fetch|providers
    embedding create|providers
    auth add|login|login-github-copilot|setup-token|paste-token
    auth order get|set|clear
  sandbox
    list
    recreate
    explain
  cron
    status
    list
    add
    edit
    rm
    enable
    disable
    runs
    run
  nodes
    status
    describe
    list
    pending
    approve
    reject
    rename
    invoke
    notify
    push
    canvas snapshot|present|hide|navigate|eval
    canvas a2ui push|reset
    camera list|snap|clip
    screen record
    location get
  devices
    list
    remove
    clear
    approve
    reject
    rotate
    revoke
  node
    run
    status
    install
    uninstall
    stop
    restart
  approvals
    get
    set
    allowlist add|remove
  exec-policy
    show
    preset
    set
  browser
    status
    start
    stop
    reset-profile
    tabs
    open
    focus
    close
    profiles
    create-profile
    delete-profile
    screenshot
    snapshot
    navigate
    resize
    click
    type
    press
    hover
    drag
    select
    upload
    fill
    dialog
    wait
    evaluate
    console
    pdf
  hooks
    list
    info
    check
    enable
    disable
    install
    update
  webhooks
    gmail setup|run
  proxy
    start
    run
    coverage
    sessions
    query
    blob
    purge
  pairing
    list
    approve
  qr
  clawbot
    qr
  docs
  dns
    setup
  tui
  chat (alias: tui --local)
  terminal (alias: tui --local)
```

插件可以添加额外的顶级命令（例如 `openclaw voicecall`）。

</Accordion>

## 聊天斜杠命令

聊天消息支持 `/...` 命令。参见 [斜杠命令](/tools/slash-commands)。

重点：

- `/status` — 快速诊断。
- `/trace` — 会话范围的插件跟踪/调试行。
- `/config` — 持久化配置更改。
- `/debug` — 仅运行时配置覆盖（内存，不是磁盘；需要 `commands.debug: true`）。

## 使用量跟踪

`openclaw status --usage` 和控制界面在 OAuth/API 凭证可用时显示提供商使用量/配额。数据直接来自提供商使用量端点，并规范化为 `X% left`。有当前使用窗口的提供商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI Codex、MiniMax、Xiaomi 和 z.ai。

详情参见 [使用量跟踪](/concepts/usage-tracking)。

## 相关

- [斜杠命令](/tools/slash-commands)
- [配置](/gateway/configuration)
- [环境](/help/environment)
