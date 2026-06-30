---
summary: "Gateway 的基于浏览器的控制 UI（聊天、节点、配置）"
read_when:
  - 你想从浏览器操作 Gateway
  - 你想要无需 SSH 隧道的 Tailnet 访问
title: "控制 UI"
sidebarTitle: "控制 UI"
---

控制 UI 是由 Gateway 提供服务的小型 **Vite + Lit** 单页应用：

- 默认：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

它直接通过同一端口与 **Gateway WebSocket** 通信。

## 快速打开（本地）

如果 Gateway 在同一台计算机上运行，打开：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/)）

如果页面加载失败，先启动 Gateway：`openclaw gateway`。

认证在 WebSocket 握手期间通过以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 当 `gateway.auth.allowTailscale: true` 时的 Tailscale Serve 身份标头
- 当 `gateway.auth.mode: "trusted-proxy"` 时的可信代理身份标头

仪表盘设置面板为当前浏览器标签页会话和选定的 gateway URL 保留一个令牌；密码不会持久化。入职通常会在首次连接时为共享密钥认证生成 gateway 令牌，但当 `gateway.auth.mode` 为 `"password"` 时密码认证也有效。

## 设备配对（首次连接）

当你从新浏览器或设备连接到控制 UI 时，Gateway 通常需要**一次性配对批准**。这是防止未授权访问的安全措施。

**你将看到：**"disconnected (1008): pairing required"

<Steps>
  <Step title="列出待处理请求">
    ```bash
    openclaw devices list
    ```
  </Step>
  <Step title="按请求 ID 批准">
    ```bash
    openclaw devices approve <requestId>
    ```
  </Step>
</Steps>

如果浏览器使用更改的认证详情（角色/范围/公钥）重试配对，之前的待处理请求将被取代，并创建新的 `requestId`。在批准之前重新运行 `openclaw devices list`。

如果浏览器已配对，并且你将其从读取访问更改为写入/管理访问，这将被视为批准升级，而不是静默重新连接。OpenClaw 保持旧批准活动，阻止更广泛的重新连接，并要求你明确批准新的范围集。

批准后，设备将被记住，无需重新批准，除非你使用 `openclaw devices revoke --device <id> --role <role>` 撤销它。有关令牌轮换和撤销，请参阅 [Devices CLI](/cli/devices)。

<Note>
- 直接本地回环浏览器连接（`127.0.0.1` / `localhost`）自动批准。
- 当 `gateway.auth.allowTailscale: true`、Tailscale 身份验证通过且浏览器提供其设备身份时，Tailscale Serve 可以跳过控制 UI 操作员会话的配对往返。
- 直接 Tailnet 绑定、LAN 浏览器连接和没有设备身份的浏览器配置文件仍然需要明确批准。
- 每个浏览器配置文件生成唯一的设备 ID，因此切换浏览器或清除浏览器数据将需要重新配对。

</Note>

## 个人身份（浏览器本地）

控制 UI 支持每浏览器个人身份（显示名称和头像），附加到用于共享会话中归属的出站消息。它存储在浏览器存储中，限定在当前浏览器配置文件范围内，不会同步到其他设备，也不会在服务器端持久化，超出你实际发送消息的正常转录本作者元数据。清除站点数据或切换浏览器会将其重置为空。

相同的浏览器本地模式适用于助手头像覆盖。上传的助手头像仅在本地浏览器上覆盖 gateway 解析的身份，不会通过 `config.patch` 往返。共享的 `ui.assistant.avatar` 配置字段仍然可用于直接写入字段的非 UI 客户端（如脚本化 gateway 或自定义仪表盘）。

## 运行时配置端点

控制 UI 从 `/__openclaw/control-ui-config.json` 获取其运行时设置。该端点受与 HTTP 界面其余部分相同的 gateway 认证保护：未认证的浏览器无法获取它，成功获取需要已有效的 gateway 令牌/密码、Tailscale Serve 身份或可信代理身份。

## 语言支持

控制 UI 可以在首次加载时根据你的浏览器语言设置自动本地化。要在以后覆盖它，打开 **Overview -> Gateway Access -> Language**。语言选择器位于 Gateway Access 卡片中，不在 Appearance 部分下。

- 支持的语言：`en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`、`ja-JP`、`ko`、`fr`、`ar`、`it`、`tr`、`uk`、`id`、`pl`、`th`、`vi`、`nl`、`fa`
- 非英语翻译在浏览器中延迟加载。
- 选定的语言保存在浏览器存储中，并在以后的访问中重复使用。
- 缺失的翻译键回退到英语。

文档翻译为相同的非英语语言集生成，但文档站点内置的 Mintlify 语言选择器仅限于 Mintlify 接受的语言代码。泰语（`th`）和波斯语（`fa`）文档仍然在发布仓库中生成；在 Mintlify 支持这些代码之前，它们可能不会出现在该选择器中。

## 外观主题

外观面板保留内置的 Claw、Knot 和 Dash 主题，以及一个浏览器本地的 tweakcn 导入槽。要导入主题，打开 [tweakcn 编辑器](https://tweakcn.com/editor/theme)，选择或创建主题，单击 **Share**，然后将复制的主题链接粘贴到外观中。导入器还接受 `https://tweakcn.com/r/themes/<id>` 注册表 URL、编辑器 URL（如 `https://tweakcn.com/editor/theme?theme=amethyst-haze`）、相对 `/themes/<id>` 路径、原始主题 ID 和默认主题名称（如 `amethyst-haze`）。

导入的主题仅存储在当前浏览器配置文件中。它们不写入 gateway 配置，不跨设备同步。替换导入的主题会更新一个本地槽；清除它会在选择导入主题时将活动主题切换回 Claw。

## 今天可以做什么

<AccordionGroup>
  <Accordion title="聊天和 Talk">
    - 通过 Gateway WS 与模型聊天（`chat.history`、`chat.send`、`chat.abort`、`chat.inject`）。
    - 通过浏览器实时会话进行 Talk。OpenAI 使用直接 WebRTC，Google Live 使用受约束的一次性浏览器令牌通过 WebSocket，仅后端实时语音插件使用 Gateway 中继传输。中继在浏览器通过 `talk.realtime.relay*` RPC 流式传输麦克风 PCM 以及通过 `chat.send` 将 `openclaw_agent_consult` 工具调用发送回更大的配置 OpenClaw 模型时，将提供商凭据保留在 Gateway 上。
    - 在聊天中流式工具调用 + 实时工具输出卡片（代理事件）。

  </Accordion>
  <Accordion title="频道、实例、会话、梦想">
    - 频道：内置加捆绑/外部插件频道状态、QR 登录和每频道配置（`channels.status`、`web.login.*`、`config.patch`）。
    - 实例：存在列表 + 刷新（`system-presence`）。
    - 会话：列表 + 每会话模型/思考/快速/详细/跟踪/推理覆盖（`sessions.list`、`sessions.patch`）。
    - 梦想：梦想状态、启用/禁用切换和梦想日记阅读器（`doctor.memory.status`、`doctor.memory.dreamDiary`、`config.patch`）。

  </Accordion>
  <Accordion title="Cron 任务、技能、节点、exec 批准">
    - Cron 任务：列表/添加/编辑/运行/启用/禁用 + 运行历史（`cron.*`）。
    - 技能：状态、启用/禁用、安装、API 密钥更新（`skills.*`）。
    - 节点：列表 + 能力（`node.list`）。
    - Exec 批准：编辑 gateway 或节点允许列表 + `exec host=gateway/node` 的询问策略（`exec.approvals.*`）。

  </Accordion>
  <Accordion title="配置">
    - 查看/编辑 `~/.openclaw/openclaw.json`（`config.get`、`config.set`）。
    - 应用 + 通过验证重启（`config.apply`）并唤醒最后活动的会话。
    - 写入包括基础哈希保护以防止覆盖并发编辑。
    - 写入（`config.set`/`config.apply`/`config.patch`）为提交的配置载荷中的 ref 预检活动 SecretRef 解析；未解析的活动提交 ref 在写入之前被拒绝。
    - 模式 + 表单渲染（`config.schema` / `config.schema.lookup`，包括字段 `title` / `description`、匹配的 UI 提示、直接子级摘要、嵌套对象/通配符/数组/组合节点上的文档元数据，以及可用时的插件 + 频道模式）；仅当快照具有安全的原始往返时，原始 JSON 编辑器才可用。
    - 如果快照无法安全地往返原始文本，控制 UI 强制进入表单模式并为该快照禁用原始模式。
    - 原始 JSON 编辑器的"Reset to saved"保留原始作者的形状（格式、注释、`$include` 布局）而不是重新渲染扁平快照，因此当快照可以安全往返时，外部编辑在重置后仍然有效。
    - 结构化 SecretRef 对象值在表单文本输入中呈现为只读，以防止意外的对象转字符串损坏。

  </Accordion>
  <Accordion title="调试、日志、更新">
    - 调试：状态/健康/模型快照 + 事件日志 + 手动 RPC 调用（`status`、`health`、`models.list`）。
    - 事件日志包括控制 UI 刷新/RPC 计时以及浏览器响应条目，用于长动画帧或当浏览器暴露这些 PerformanceObserver 条目类型时的长任务。
    - 日志：带过滤器/导出的 gateway 文件日志的实时跟踪（`logs.tail`）。
    - 更新：运行包/git 更新 + 重启（`update.run`）并带重启报告，然后在重新连接后轮询 `update.status` 以验证运行的 gateway 版本。

  </Accordion>
  <Accordion title="Cron 任务面板说明">
    - 对于隔离的任务，交付默认为通知摘要。如果你想要仅内部运行，可以切换为无。
    - 选择通知时出现频道/目标字段。
    - Webhook 模式使用 `delivery.mode = "webhook"`，其中 `delivery.to` 设置为有效的 HTTP(S) webhook URL。
    - 对于主会话任务，webhook 和无交付模式可用。
    - 高级编辑控件包括运行后删除、清除代理覆盖、cron 精确/交错选项、代理模型/思考覆盖和尽力而为的交付切换。
    - 表单验证是内联的，带有字段级错误；无效值在修复前禁用保存按钮。
    - 设置 `cron.webhookToken` 发送专用的承载令牌，如果省略，webhook 不带认证标头发送。
    - 弃用的回退：带有 `notify: true` 的存储旧版任务仍然可以在迁移之前使用 `cron.webhook`。

  </Accordion>
</AccordionGroup>

## 聊天行为

<AccordionGroup>
  <Accordion title="发送和历史语义">
    - `chat.send` 是**非阻塞的**：它立即以 `{ runId, status: "started" }` 确认，响应通过 `chat` 事件流式传输。
    - 聊天上传接受图像加非视频文件。图像保留原生图像路径；其他文件存储为托管媒体，并在历史中显示为附件链接。
    - 使用相同 `idempotencyKey` 重新发送在运行时返回 `{ status: "in_flight" }`，完成后返回 `{ status: "ok" }`。
    - `chat.history` 响应有大小限制以确保 UI 安全。当转录条目太大时，Gateway 可能截断长文本字段、省略重元数据块，并用占位符替换过大的消息（`[chat.history omitted: message too large]`）。
    - 助手/生成的图像持久化为托管媒体引用，并通过经认证的 Gateway 媒体 URL 返回，因此重新加载不依赖于聊天历史响应中保留原始 base64 图像载荷。
    - `chat.history` 还从可见的助手文本中剥离仅显示的内联指令标签（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截断的工具调用块）以及泄漏的 ASCII/全宽模型控制令牌，并省略整个可见文本仅为精确静默令牌 `NO_REPLY` / `no_reply` 的助手条目。
    - 在活动发送和最终历史刷新期间，如果 `chat.history` 暂时返回较旧的快照，聊天视图保持本地乐观的用户/助手消息可见；一旦 Gateway 历史赶上，规范转录就会替换这些本地消息。
    - 实时 `chat` 事件是交付状态，而 `chat.history` 是从持久会话转录本重建的。在工具最终事件之后，控制 UI 重新加载历史并仅合并一个小的乐观尾部；转录本边界在 [WebChat](/web/webchat) 中有记录。
    - `chat.inject` 将助手注释附加到会话转录本，并广播 `chat` 事件用于仅 UI 更新（无代理运行，无频道交付）。
    - 聊天标头在会话选择器之前显示代理过滤器，会话选择器由选定的代理限定范围。切换代理仅显示与该代理绑定的会话，并在尚无保存的仪表盘会话时回退到该代理的主会话。
    - 在桌面宽度上，聊天控件保持在一个紧凑行上，向下滚动转录本时折叠；向上滚动、返回顶部或到达底部时恢复控件。
    - 连续的重复纯文本消息渲染为一个带计数徽章的气泡。携带图像、附件、工具输出或画布预览的消息保持展开。
    - 聊天标头模型和思考选择器立即通过 `sessions.patch` 修补活动会话；它们是持久会话覆盖，而不是一次性发送选项。
    - 在控制 UI 中输入 `/new` 会创建并切换到与新聊天相同的新鲜仪表盘会话。输入 `/reset` 保持 Gateway 对当前会话的显式原地重置。
    - 聊天模型选择器请求 Gateway 的已配置模型视图。如果存在 `agents.defaults.models`，该允许列表驱动选择器。否则选择器显示显式 `models.providers.*.models` 条目加具有可用认证的提供商。完整目录通过带 `view: "all"` 的调试 `models.list` RPC 保持可用。
    - 当新鲜 Gateway 会话使用报告显示高上下文压力时，聊天编辑器区域显示上下文通知，并在推荐压缩级别显示运行正常会话压缩路径的压缩按钮。过时的令牌快照在 Gateway 再次报告新鲜使用之前被隐藏。

  </Accordion>
  <Accordion title="Talk 模式（浏览器实时）">
    Talk 模式使用注册的实时语音提供商。使用 `talk.provider: "openai"` 加 `talk.providers.openai.apiKey` 配置 OpenAI，或使用 `talk.provider: "google"` 加 `talk.providers.google.apiKey` 配置 Google；Voice Call 实时提供商配置仍可作为回退复用。浏览器从不接收标准提供商 API 密钥。OpenAI 接收 WebRTC 的临时 Realtime 客户端密钥。Google Live 接收用于浏览器 WebSocket 会话的一次性受约束的 Live API 认证令牌，指令和工具声明被锁定到令牌中由 Gateway 处理。仅暴露后端实时桥接的提供商通过 Gateway 中继传输运行，因此凭据和供应商套接字保留在服务器端，而浏览器音频通过经认证的 Gateway RPC 传输。实时会话提示由 Gateway 组装；`talk.realtime.session` 不接受调用者提供的指令覆盖。

    在聊天编辑器中，Talk 控件是听写麦克风按钮旁边的波浪按钮。Talk 启动时，编辑器状态行显示 `Connecting Talk...`，音频连接时显示 `Talk live`，或实时工具调用通过 `chat.send` 咨询配置的较大模型时显示 `Asking OpenClaw...`。

    维护者实时冒烟测试：`OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` 验证 OpenAI 浏览器 WebRTC SDP 交换、Google Live 受约束令牌浏览器 WebSocket 设置和带假麦克风媒体的 Gateway 中继浏览器适配器。命令仅打印提供商状态，不记录密钥。

  </Accordion>
  <Accordion title="停止和中止">
    - 单击 **Stop**（调用 `chat.abort`）。
    - 当运行处于活动状态时，正常的后续消息排队。在排队的消息上单击 **Steer** 将该后续注入到运行的轮次中。
    - 键入 `/stop`（或独立的中止短语，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）进行带外中止。
    - `chat.abort` 支持 `{ sessionKey }`（无 `runId`）以中止该会话的所有活动运行。

  </Accordion>
  <Accordion title="中止部分保留">
    - 当运行被中止时，部分助手文本仍然可以在 UI 中显示。
    - 当存在缓冲输出时，Gateway 将中止的部分助手文本持久化到转录本历史中。
    - 持久化条目包含中止元数据，以便转录本消费者可以区分中止部分和正常完成输出。

  </Accordion>
</AccordionGroup>

## PWA 安装和 Web 推送

控制 UI 包含 `manifest.webmanifest` 和 service worker，因此现代浏览器可以将其安装为独立 PWA。Web 推送让 Gateway 即使标签页或浏览器窗口不打开时也能用通知唤醒已安装的 PWA。

| 界面                                             | 功能                                             |
| ------------------------------------------------ | ------------------------------------------------ |
| `ui/public/manifest.webmanifest`                 | PWA 清单。一旦可访问，浏览器提供"安装应用"。     |
| `ui/public/sw.js`                                | 处理 `push` 事件和通知单击的 Service Worker。    |
| `push/vapid-keys.json`（在 OpenClaw 状态目录下） | 自动生成的 VAPID 密钥对，用于签署 Web 推送载荷。 |
| `push/web-push-subscriptions.json`               | 持久化的浏览器订阅端点。                         |

当你想固定密钥时（用于多主机部署、密钥轮换或测试），通过 Gateway 进程上的环境变量覆盖 VAPID 密钥对：

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT`（默认为 `mailto:openclaw@localhost`）

控制 UI 使用这些范围门控的 Gateway 方法来注册和测试浏览器订阅：

- `push.web.vapidPublicKey` — 获取活动的 VAPID 公钥。
- `push.web.subscribe` — 注册 `endpoint` 加 `keys.p256dh`/`keys.auth`。
- `push.web.unsubscribe` — 删除注册的端点。
- `push.web.test` — 向调用者的订阅发送测试通知。

<Note>
Web 推送独立于 iOS APNS 中继路径（参阅[配置](/gateway/configuration)了解中继支持的推送）和现有的 `push.test` 方法，后者针对原生移动配对。
</Note>

## 托管嵌入

助手消息可以用 `[embed ...]` 简码内联渲染托管的 Web 内容。iframe 沙盒策略由 `gateway.controlUi.embedSandbox` 控制：

<Tabs>
  <Tab title="strict">
    禁用托管嵌入内的脚本执行。
  </Tab>
  <Tab title="scripts（默认）">
    允许交互式嵌入同时保持来源隔离；这是默认值，通常对自包含的浏览器游戏/小部件足够。
  </Tab>
  <Tab title="trusted">
    在 `allow-scripts` 之上添加 `allow-same-origin`，用于有意需要更强权限的同站文档。
  </Tab>
</Tabs>

示例：

```json5
{
  gateway: {
    controlUi: {
      embedSandbox: "scripts",
    },
  },
}
```

<Warning>
仅当嵌入文档真正需要同源行为时才使用 `trusted`。对于大多数代理生成的游戏和交互式画布，`scripts` 是更安全的选择。
</Warning>

绝对外部 `http(s)` 嵌入 URL 默认被阻止。如果你有意想让 `[embed url="https://..."]` 加载第三方页面，设置 `gateway.controlUi.allowExternalEmbedUrls: true`。

## 聊天消息宽度

分组聊天消息使用可读的默认最大宽度。宽屏显示器部署可以通过设置 `gateway.controlUi.chatMessageMaxWidth` 来覆盖它，无需修补捆绑的 CSS：

```json5
{
  gateway: {
    controlUi: {
      chatMessageMaxWidth: "min(1280px, 82%)",
    },
  },
}
```

该值在到达浏览器之前经过验证。支持的值包括纯长度和百分比（如 `960px` 或 `82%`），以及受约束的 `min(...)`、`max(...)`、`clamp(...)`、`calc(...)` 和 `fit-content(...)` 宽度表达式。

## Tailnet 访问（推荐）

<Tabs>
  <Tab title="集成 Tailscale Serve（首选）">
    将 Gateway 保持在回环，让 Tailscale Serve 用 HTTPS 代理它：

    ```bash
    openclaw gateway --tailscale serve
    ```

    打开：

    - `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

    默认情况下，当 `gateway.auth.allowTailscale` 为 `true` 时，控制 UI/WebSocket Serve 请求可以通过 Tailscale 身份标头（`tailscale-user-login`）进行认证。OpenClaw 通过用 `tailscale whois` 解析 `x-forwarded-for` 地址并将其与标头匹配来验证身份，仅当请求使用 Tailscale 的 `x-forwarded-*` 标头到达回环时才接受。对于带有浏览器设备身份的控制 UI 操作员会话，这条经验证的 Serve 路径也跳过了设备配对往返；没有设备的浏览器和节点角色连接仍然遵循正常的设备检查。如果你希望即使是 Serve 流量也需要明确的共享密钥凭据，设置 `gateway.auth.allowTailscale: false`。然后使用 `gateway.auth.mode: "token"` 或 `"password"`。

    对于该异步 Serve 身份路径，同一客户端 IP 和认证范围的失败认证尝试在速率限制写入之前被序列化。来自同一浏览器的并发错误重试因此可能在第二个请求上显示 `retry later` 而不是两个普通不匹配并行竞争。

    <Warning>
    无令牌 Serve 认证假设 gateway 主机是受信任的。如果不受信任的本地代码可能在该主机上运行，需要令牌/密码认证。
    </Warning>

  </Tab>
  <Tab title="绑定到 tailnet + 令牌">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    然后打开：

    - `http://<tailscale-ip>:18789/`（或你配置的 `gateway.controlUi.basePath`）

    将匹配的共享密钥粘贴到 UI 设置中（作为 `connect.params.auth.token` 或 `connect.params.auth.password` 发送）。

  </Tab>
</Tabs>

## 不安全的 HTTP

如果你通过普通 HTTP（`http://<lan-ip>` 或 `http://<tailscale-ip>`）打开仪表盘，浏览器在**非安全上下文**中运行，并阻止 WebCrypto。默认情况下，OpenClaw **阻止**没有设备身份的控制 UI 连接。

记录的例外：

- 使用 `gateway.controlUi.allowInsecureAuth=true` 的 localhost 不安全 HTTP 兼容性
- 通过 `gateway.auth.mode: "trusted-proxy"` 成功的操作员控制 UI 认证
- 紧急 `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**推荐修复：** 使用 HTTPS（Tailscale Serve）或在本地打开 UI：

- `https://<magicdns>/`（Serve）
- `http://127.0.0.1:18789/`（在 gateway 主机上）

<AccordionGroup>
  <Accordion title="不安全认证切换行为">
    ```json5
    {
      gateway: {
        controlUi: { allowInsecureAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    `allowInsecureAuth` 仅是本地兼容性切换：

    - 它允许 localhost 控制 UI 会话在非安全 HTTP 上下文中无需设备身份继续。
    - 它不绕过配对检查。
    - 它不放宽远程（非 localhost）设备身份要求。

  </Accordion>
  <Accordion title="仅紧急使用">
    ```json5
    {
      gateway: {
        controlUi: { dangerouslyDisableDeviceAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    <Warning>
    `dangerouslyDisableDeviceAuth` 禁用控制 UI 设备身份检查，是严重的安全降级。紧急使用后请迅速恢复。
    </Warning>

  </Accordion>
  <Accordion title="可信代理说明">
    - 成功的可信代理认证可以在没有设备身份的情况下接受**操作员**控制 UI 会话。
    - 这**不**扩展到节点角色控制 UI 会话。
    - 同主机回环反向代理仍然不满足可信代理认证；参阅[可信代理认证](/gateway/trusted-proxy-auth)。

  </Accordion>
</AccordionGroup>

有关 HTTPS 设置指南，请参阅 [Tailscale](/gateway/tailscale)。

## 内容安全策略

控制 UI 附带严格的 `img-src` 策略：仅允许**同源**资产、`data:` URL 和本地生成的 `blob:` URL。远程 `http(s)` 和协议相对图像 URL 被浏览器拒绝，不发出网络请求。

实际意义：

- 在相对路径下提供的头像和图像（例如 `/avatars/<id>`）仍然渲染，包括 UI 获取并转换为本地 `blob:` URL 的经认证头像路由。
- 内联 `data:image/...` URL 仍然渲染（对协议内载荷有用）。
- 控制 UI 创建的本地 `blob:` URL 仍然渲染。
- 频道元数据发出的远程头像 URL 在控制 UI 的头像助手处被剥离，并替换为内置徽标/徽章，因此被入侵或恶意的频道无法强制从操作员浏览器进行任意远程图像获取。

你不需要更改任何内容来获得此行为——它始终开启且不可配置。

## 头像路由认证

当配置了 gateway 认证时，控制 UI 头像端点需要与其他 API 相同的 gateway 令牌：

- `GET /avatar/<agentId>` 仅向经认证的调用者返回头像图像。`GET /avatar/<agentId>?meta=1` 在相同规则下返回头像元数据。
- 对任一路由的未认证请求被拒绝（匹配兄弟助手媒体路由）。这防止头像路由在其他受保护的主机上泄漏代理身份。
- 控制 UI 本身在获取头像时将 gateway 令牌作为承载标头转发，并使用经认证的 blob URL，以便图像仍然在仪表盘中渲染。

如果你禁用 gateway 认证（不推荐在共享主机上），头像路由也变为未认证，与其他 gateway 一致。

## 助手媒体路由认证

当配置了 gateway 认证时，助手本地媒体预览使用两步路由：

- `GET /__openclaw__/assistant-media?meta=1&source=<path>` 需要正常的控制 UI 操作员认证。浏览器在检查可用性时将 gateway 令牌作为承载标头发送。
- 成功的元数据响应包括一个范围为该确切源路径的短期 `mediaTicket`。
- 浏览器渲染的图像、音频、视频和文档 URL 使用 `mediaTicket=<ticket>` 而不是活动的 gateway 令牌或密码。票据快速过期，无法授权不同的源。

这使正常媒体渲染与浏览器原生媒体元素兼容，而不会将可重用的 gateway 凭据放在可见的媒体 URL 中。

## 构建 UI

Gateway 从 `dist/control-ui` 提供静态文件。使用以下命令构建：

```bash
pnpm ui:build
```

可选的绝对基础（当你想要固定资产 URL 时）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用于本地开发（单独的开发服务器）：

```bash
pnpm ui:dev
```

然后将 UI 指向你的 Gateway WS URL（例如 `ws://127.0.0.1:18789`）。

## 调试/测试：开发服务器 + 远程 Gateway

控制 UI 是静态文件；WebSocket 目标是可配置的，可以不同于 HTTP 来源。这在你想要本地 Vite 开发服务器但 Gateway 在其他地方运行时很方便。

<Steps>
  <Step title="启动 UI 开发服务器">
    ```bash
    pnpm ui:dev
    ```
  </Step>
  <Step title="用 gatewayUrl 打开">
    ```text
    http://localhost:5173/?gatewayUrl=ws%3A%2F%2F<gateway-host>%3A18789
    ```

    可选的一次性认证（如果需要）：

    ```text
    http://localhost:5173/?gatewayUrl=wss%3A%2F%2F<gateway-host>%3A18789#token=<gateway-token>
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="说明">
    - `gatewayUrl` 在加载后存储在 localStorage 中并从 URL 中删除。
    - 如果你通过 `gatewayUrl` 传递完整的 `ws://` 或 `wss://` 端点，URL 编码 `gatewayUrl` 值，以便浏览器正确解析查询字符串。
    - 尽可能通过 URL 片段（`#token=...`）传递 `token`。片段不发送到服务器，避免了请求日志和 Referer 泄露。旧版 `?token=` 查询参数为了兼容性仍然导入一次，但仅作为回退，并在引导后立即被剥离。
    - `password` 仅保留在内存中。
    - 当设置了 `gatewayUrl` 时，UI 不回退到配置或环境凭据。明确提供 `token`（或 `password`）。缺少明确凭据是错误。
    - 当 Gateway 在 TLS 后面时使用 `wss://`（Tailscale Serve、HTTPS 代理等）。
    - `gatewayUrl` 仅在顶级窗口中接受（不在嵌入中），以防止点击劫持。
    - 非回环控制 UI 部署必须明确设置 `gateway.controlUi.allowedOrigins`（完整来源）。这包括远程开发设置。
    - Gateway 启动可能从有效运行时绑定和端口中植入本地来源，如 `http://localhost:<port>` 和 `http://127.0.0.1:<port>`，但远程浏览器来源仍然需要明确条目。
    - 除了严格控制的本地测试外，不要使用 `gateway.controlUi.allowedOrigins: ["*"]`。它意味着允许任何浏览器来源，而不是"匹配我正在使用的任何主机"。
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用 Host 标头来源回退模式，但这是危险的安全模式。

  </Accordion>
</AccordionGroup>

示例：

```json5
{
  gateway: {
    controlUi: {
      allowedOrigins: ["http://localhost:5173"],
    },
  },
}
```

远程访问设置详情：[远程访问](/gateway/remote)。

## 相关链接

- [Dashboard](/web/dashboard) — gateway 仪表盘
- [健康检查](/gateway/health) — gateway 健康监控
- [TUI](/web/tui) — 终端用户界面
- [WebChat](/web/webchat) — 基于浏览器的聊天界面
