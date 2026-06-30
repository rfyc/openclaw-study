---
summary: "网关 WebSocket 协议：握手、帧、版本控制"
read_when:
  - 实现或更新网关 WS 客户端
  - 调试协议不匹配或连接失败
  - 重新生成协议模式/模型
title: "网关协议"
---

网关 WS 协议是 OpenClaw 的**单一控制平面 + 节点传输**。所有客户端（CLI、Web UI、macOS 应用、iOS/Android 节点、无头节点）通过 WebSocket 连接，并在握手时声明其**角色** + **范围**。

## 传输

- WebSocket，带有 JSON 有效载荷的文本帧。
- 第一帧**必须**是 `connect` 请求。
- 连接前帧上限为 64 KiB。成功握手后，客户端应遵循 `hello-ok.policy.maxPayload` 和 `hello-ok.policy.maxBufferedBytes` 限制。启用诊断后，超大入站帧和慢速出站缓冲区在网关关闭或丢弃受影响帧之前发出 `payload.large` 事件。这些事件保留大小、限制、接口和安全原因码。它们不保留消息体、附件内容、原始帧体、令牌、Cookie 或密钥值。

## 握手（connect）

网关 → 客户端（连接前挑战）：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

客户端 → 网关：

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "cli",
      "version": "1.2.3",
      "platform": "macos",
      "mode": "operator"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-cli/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

网关 → 客户端：

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": {
    "type": "hello-ok",
    "protocol": 3,
    "server": { "version": "…", "connId": "…" },
    "features": { "methods": ["…"], "events": ["…"] },
    "snapshot": { "…": "…" },
    "auth": {
      "role": "operator",
      "scopes": ["operator.read", "operator.write"]
    },
    "policy": {
      "maxPayload": 26214400,
      "maxBufferedBytes": 52428800,
      "tickIntervalMs": 15000
    }
  }
}
```

当网关仍在完成启动附加进程时，`connect` 请求可能返回可重试的 `UNAVAILABLE` 错误，`details.reason` 设置为 `"startup-sidecars"` 以及 `retryAfterMs`。客户端应在其总体连接预算内重试该响应，而不是将其视为终端握手失败。

`server`、`features`、`snapshot` 和 `policy` 都是模式必需的（`src/gateway/protocol/schema/frames.ts`）。`auth` 也是必需的，报告协商的角色/范围。`canvasHostUrl` 是可选的。

当没有颁发设备令牌时，`hello-ok.auth` 报告协商的权限而没有令牌字段：

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

受信任的同进程后端客户端（`client.id: "gateway-client"`，`client.mode: "backend"`）在使用共享网关令牌/密码进行认证时，可以在直接环回连接上省略 `device`。此路径保留给内部控制平面 RPC，防止过时的 CLI/设备配对基线阻塞本地后端工作（如子代理会话更新）。远程客户端、浏览器来源客户端、节点客户端以及明确的设备令牌/设备身份客户端仍然使用正常的配对和范围升级检查。

当颁发设备令牌时，`hello-ok` 还包含：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

在受信任的引导移交期间，`hello-ok.auth` 可能在 `deviceTokens` 中还包含额外的有界角色条目：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "node",
    "scopes": [],
    "deviceTokens": [
      {
        "deviceToken": "…",
        "role": "operator",
        "scopes": ["operator.approvals", "operator.read", "operator.talk.secrets", "operator.write"]
      }
    ]
  }
}
```

对于内置节点/操作员引导流程，主要节点令牌保持 `scopes: []`，任何移交的操作员令牌保持绑定到引导操作员允许列表（`operator.approvals`、`operator.read`、`operator.talk.secrets`、`operator.write`）。引导范围检查保持角色前缀：操作员条目只满足操作员请求，非操作员角色仍然需要其自己角色前缀下的范围。

### 节点示例

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "ios-node",
      "version": "1.2.3",
      "platform": "ios",
      "mode": "node"
    },
    "role": "node",
    "scopes": [],
    "caps": ["camera", "canvas", "screen", "location", "voice"],
    "commands": ["camera.snap", "canvas.navigate", "screen.record", "location.get"],
    "permissions": { "camera.capture": true, "screen.record": false },
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-ios/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

## 帧

- **请求**：`{type:"req", id, method, params}`
- **响应**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

有副作用的方法需要**幂等键**（参见模式）。

## 角色 + 范围

有关完整的操作员范围模型、审批时检查和共享密钥语义，请参阅[操作员范围](/gateway/operator-scopes)。

### 角色

- `operator` = 控制平面客户端（CLI/UI/自动化）。
- `node` = 能力主机（camera/screen/canvas/system.run）。

### 范围（操作员）

常见范围：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

带 `includeSecrets: true` 的 `talk.config` 需要 `operator.talk.secrets`（或 `operator.admin`）。

插件注册的网关 RPC 方法可以请求自己的操作员范围，但保留的核心管理前缀（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）始终解析为 `operator.admin`。

方法范围只是第一道关卡。通过 `chat.send` 到达的某些斜杠命令还会在顶部应用更严格的命令级检查。例如，持久的 `/config set` 和 `/config unset` 写入需要 `operator.admin`。

`node.pair.approve` 还在基本方法范围之上有额外的审批时范围检查：

- 无命令请求：`operator.pairing`
- 带非 exec 节点命令的请求：`operator.pairing` + `operator.write`
- 包含 `system.run`、`system.run.prepare` 或 `system.which` 的请求：`operator.pairing` + `operator.admin`

### 能力/命令/权限（节点）

节点在连接时声明能力声明：

- `caps`：高级能力类别。
- `commands`：调用的命令允许列表。
- `permissions`：细粒度切换（例如 `screen.record`、`camera.capture`）。

网关将这些视为**声明**并强制执行服务器端允许列表。

## 存在

- `system-presence` 返回按设备身份键控的条目。
- 存在条目包含 `deviceId`、`roles` 和 `scopes`，以便 UI 可以为每个设备显示单行，即使它同时以**操作员**和**节点**身份连接。
- `node.list` 包含可选的 `lastSeenAtMs` 和 `lastSeenReason` 字段。已连接的节点将其当前连接时间报告为带有 `connect` 原因的 `lastSeenAtMs`；已配对的节点在受信任的节点事件更新其配对元数据时也可以报告持久的后台存在。

### 节点后台存活事件

节点可以调用带有 `event: "node.presence.alive"` 的 `node.event` 来记录已配对节点在后台唤醒期间存活，而不将其标记为已连接。

```json
{
  "event": "node.presence.alive",
  "payloadJSON": "{\"trigger\":\"silent_push\",\"sentAtMs\":1737264000000,\"displayName\":\"Peter's iPhone\",\"version\":\"2026.4.28\",\"platform\":\"iOS 18.4.0\",\"deviceFamily\":\"iPhone\",\"modelIdentifier\":\"iPhone17,1\",\"pushTransport\":\"relay\"}"
}
```

`trigger` 是一个封闭枚举：`background`、`silent_push`、`bg_app_refresh`、`significant_location`、`manual` 或 `connect`。未知触发器字符串在持久化之前被网关规范化为 `background`。该事件仅对经过认证的节点设备会话是持久的；无设备或未配对的会话返回 `handled: false`。

成功的网关返回结构化结果：

```json
{
  "ok": true,
  "event": "node.presence.alive",
  "handled": true,
  "reason": "persisted"
}
```

较旧的网关可能仍然为 `node.event` 返回 `{ "ok": true }`；客户端应将其视为已确认的 RPC，而不是持久的存在持久化。

## 广播事件范围

服务器推送的 WebSocket 广播事件受范围控制，以便配对范围或仅节点的会话不会被动接收会话内容。

- **聊天、代理和工具结果帧**（包括流式 `agent` 事件和工具调用结果）需要至少 `operator.read`。没有 `operator.read` 的会话完全跳过这些帧。
- **插件定义的 `plugin.*` 广播**根据插件注册方式控制为 `operator.write` 或 `operator.admin`。
- **状态和传输事件**（`heartbeat`、`presence`、`tick`、连接/断开生命周期等）保持不受限制，以便每个经过认证的会话都能观察传输健康状况。
- **未知广播事件族**默认受范围控制（失败关闭），除非注册的处理程序明确放宽。

每个客户端连接保持自己的每客户端序列号，以便即使不同客户端看到事件流的不同范围过滤子集，广播也能在该套接字上保持单调顺序。

## 常见 RPC 方法族

公共 WS 接口比上面的握手/认证示例更广泛。这不是生成的转储 — `hello-ok.features.methods` 是从 `src/gateway/server-methods-list.ts` 加上加载的插件/渠道方法导出构建的保守发现列表。将其视为功能发现，而不是 `src/gateway/server-methods/*.ts` 的完整枚举。

<AccordionGroup>
  <Accordion title="系统和身份">
    - `health` 返回缓存的或新鲜探测的网关健康快照。
    - `diagnostics.stability` 返回最近的有界诊断稳定性记录器。它保留操作元数据，如事件名称、计数、字节大小、内存读数、队列/会话状态、渠道/插件名称和会话 id。它不保留聊天文本、webhook 正文、工具输出、原始请求或响应正文、令牌、Cookie 或密钥值。需要操作员读取范围。
    - `status` 返回 `/status` 风格的网关摘要；敏感字段仅包含在管理员范围的操作员客户端中。
    - `gateway.identity.get` 返回中继和配对流使用的网关设备身份。
    - `system-presence` 返回已连接操作员/节点设备的当前存在快照。
    - `system-event` 追加系统事件并可以更新/广播存在上下文。
    - `last-heartbeat` 返回最新持久化的心跳事件。
    - `set-heartbeats` 切换网关上的心跳处理。

  </Accordion>

  <Accordion title="模型和使用情况">
    - `models.list` 返回运行时允许的模型目录。传递 `{ "view": "configured" }` 获取选择器大小的已配置模型（`agents.defaults.models` 优先，然后是 `models.providers.*.models`），或传递 `{ "view": "all" }` 获取完整目录。
    - `usage.status` 返回提供商使用窗口/剩余配额摘要。
    - `usage.cost` 返回日期范围的聚合成本使用摘要。
    - `doctor.memory.status` 返回活跃默认代理工作区的向量内存/缓存嵌入就绪状态。仅当调用者明确需要实时嵌入提供商 ping 时才传递 `{ "probe": true }` 或 `{ "deep": true }`。
    - `doctor.memory.remHarness` 返回远程控制平面客户端的有界只读 REM harness 预览。它可以包含工作区路径、内存片段、渲染的有根 markdown 和深层提升候选者，因此调用者需要 `operator.read`。
    - `sessions.usage` 返回每会话使用摘要。
    - `sessions.usage.timeseries` 返回一个会话的时间序列使用情况。
    - `sessions.usage.logs` 返回一个会话的使用日志条目。

  </Accordion>

  <Accordion title="渠道和登录助手">
    - `channels.status` 返回内置 + 捆绑渠道/插件状态摘要。
    - `channels.logout` 在渠道支持登出的地方登出特定渠道/账户。
    - `web.login.start` 为当前支持 QR 的 Web 渠道提供商启动 QR/Web 登录流程。
    - `web.login.wait` 等待该 QR/Web 登录流程完成并在成功时启动渠道。
    - `push.test` 向注册的 iOS 节点发送测试 APNs 推送。
    - `voicewake.get` 返回存储的唤醒词触发器。
    - `voicewake.set` 更新唤醒词触发器并广播更改。

  </Accordion>

  <Accordion title="消息和日志">
    - `send` 是用于渠道/账户/线程目标发送的直接出站传递 RPC，在聊天运行器之外。
    - `logs.tail` 返回具有光标/限制和最大字节控制的配置网关文件日志尾部。

  </Accordion>

  <Accordion title="Talk 和 TTS">
    - `talk.config` 返回有效的 Talk 配置有效载荷；`includeSecrets` 需要 `operator.talk.secrets`（或 `operator.admin`）。
    - `talk.mode` 为 WebChat/Control UI 客户端设置/广播当前 Talk 模式状态。
    - `talk.speak` 通过活跃的 Talk 语音提供商合成语音。
    - `tts.status` 返回 TTS 启用状态、活跃提供商、回退提供商和提供商配置状态。
    - `tts.providers` 返回可见的 TTS 提供商清单。
    - `tts.enable` 和 `tts.disable` 切换 TTS 偏好状态。
    - `tts.setProvider` 更新首选 TTS 提供商。
    - `tts.convert` 运行一次性文本转语音转换。

  </Accordion>

  <Accordion title="密钥、配置、更新和向导">
    - `secrets.reload` 重新解析活跃的 SecretRef 并仅在完全成功时交换运行时密钥状态。
    - `secrets.resolve` 为特定命令/目标集解析命令目标密钥分配。
    - `config.get` 返回当前配置快照和哈希。
    - `config.set` 写入经过验证的配置有效载荷。
    - `config.patch` 合并部分配置更新。
    - `config.apply` 验证 + 替换完整配置有效载荷。
    - `config.schema` 返回 Control UI 和 CLI 工具使用的实时配置模式有效载荷：模式、`uiHints`、版本和生成元数据，包括运行时可以加载时的插件 + 渠道模式元数据。模式包括从 UI 使用的相同标签和帮助文本派生的字段 `title` / `description` 元数据，包括嵌套对象、通配符、数组项以及当匹配字段文档存在时的 `anyOf` / `oneOf` / `allOf` 组合分支。
    - `config.schema.lookup` 返回一个配置路径的路径范围查找有效载荷：规范化路径、浅层模式节点、匹配的 hint + `hintPath` 以及 UI/CLI 钻取的直接子摘要。查找模式节点保留面向用户的文档和常见验证字段（`title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、数字/字符串/数组/对象边界以及如 `additionalProperties`、`deprecated`、`readOnly`、`writeOnly` 等标志）。子摘要暴露 `key`、规范化 `path`、`type`、`required`、`hasChildren`，加上匹配的 `hint` / `hintPath`。
    - `update.run` 运行网关更新流程，仅在更新本身成功时安排重启；具有会话的调用者可以包含 `continuationMessage`，以便启动在重启后通过重启延续队列恢复一次后续代理轮次。包管理器更新在包交换后强制非延迟、无冷却时间的更新重启，防止旧网关进程继续从替换的 `dist` 树延迟加载。
    - `update.status` 返回最新缓存的更新重启标记，包括可用时重启后运行的版本。
    - `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 通过 WS RPC 暴露入门向导。

  </Accordion>

  <Accordion title="代理和工作区助手">
    - `agents.list` 返回配置的代理条目，包括有效模型和运行时元数据。
    - `agents.create`、`agents.update` 和 `agents.delete` 管理代理记录和工作区连接。
    - `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理为代理暴露的引导工作区文件。
    - `artifacts.list`、`artifacts.get` 和 `artifacts.download` 为明确的 `sessionKey`、`runId` 或 `taskId` 范围暴露转录派生的制品摘要和下载。运行和任务查询在服务器端解析拥有的会话，仅返回具有匹配来源的转录媒体；不安全或本地 URL 源返回不支持的下载而不是服务器端获取。
    - `agent.identity.get` 返回代理或会话的有效助手身份。
    - `agent.wait` 等待运行完成并在可用时返回终端快照。

  </Accordion>

  <Accordion title="会话控制">
    - `sessions.list` 返回当前会话索引，包括配置代理运行时后端时的每行 `agentRuntime` 元数据。
    - `sessions.subscribe` 和 `sessions.unsubscribe` 切换当前 WS 客户端的会话更改事件订阅。
    - `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 切换一个会话的转录/消息事件订阅。
    - `sessions.preview` 返回特定会话键的有界转录预览。
    - `sessions.describe` 返回精确会话键的一个网关会话行。
    - `sessions.resolve` 解析或规范化会话目标。
    - `sessions.create` 创建新会话条目。
    - `sessions.send` 将消息发送到现有会话。
    - `sessions.steer` 是活跃会话的中断和引导变体。
    - `sessions.abort` 中止会话的活跃工作。调用者可以传递 `key` 加上可选的 `runId`，或单独传递网关可以解析到会话的活跃运行的 `runId`。
    - `sessions.patch` 更新会话元数据/覆盖并报告解析的规范模型加有效的 `agentRuntime`。
    - `sessions.reset`、`sessions.delete` 和 `sessions.compact` 执行会话维护。
    - `sessions.get` 返回完整的存储会话行。
    - 聊天执行仍然使用 `chat.history`、`chat.send`、`chat.abort` 和 `chat.inject`。`chat.history` 为 UI 客户端显示规范化：从可见文本中剥离内联指令标签，剥离纯文本工具调用 XML 有效载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及截断的工具调用块）和泄露的 ASCII/全角模型控制令牌，省略纯静默令牌助手行如精确的 `NO_REPLY` / `no_reply`，超大行可以被占位符替换。

  </Accordion>

  <Accordion title="设备配对和设备令牌">
    - `device.pair.list` 返回待处理和已批准的配对设备。
    - `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 管理设备配对记录。
    - `device.token.rotate` 在其批准的角色和调用者范围边界内轮换配对设备令牌。
    - `device.token.revoke` 在其批准的角色和调用者范围边界内撤销配对设备令牌。

  </Accordion>

  <Accordion title="节点配对、调用和待处理工作">
    - `node.pair.request`、`node.pair.list`、`node.pair.approve`、`node.pair.reject`、`node.pair.remove` 和 `node.pair.verify` 涵盖节点配对和引导验证。
    - `node.list` 和 `node.describe` 返回已知/已连接的节点状态。
    - `node.rename` 更新已配对节点标签。
    - `node.invoke` 将命令转发到已连接的节点。
    - `node.invoke.result` 返回调用请求的结果。
    - `node.event` 将节点发起的事件带回网关。
    - `node.canvas.capability.refresh` 刷新范围的 canvas 能力令牌。
    - `node.pending.pull` 和 `node.pending.ack` 是已连接节点队列 API。
    - `node.pending.enqueue` 和 `node.pending.drain` 管理离线/断开节点的持久待处理工作。

  </Accordion>

  <Accordion title="审批族">
    - `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和 `exec.approval.resolve` 涵盖一次性 exec 审批请求加待处理审批查找/重放。
    - `exec.approval.waitDecision` 等待一个待处理的 exec 审批并返回最终决定（或超时时 `null`）。
    - `exec.approvals.get` 和 `exec.approvals.set` 管理网关 exec 审批策略快照。
    - `exec.approvals.node.get` 和 `exec.approvals.node.set` 通过节点中继命令管理节点本地 exec 审批策略。
    - `plugin.approval.request`、`plugin.approval.list`、`plugin.approval.waitDecision` 和 `plugin.approval.resolve` 涵盖插件定义的审批流程。

  </Accordion>

  <Accordion title="自动化、技能和工具">
    - 自动化：`wake` 安排立即或下一次心跳唤醒文本注入；`cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、`cron.run`、`cron.runs` 管理计划工作。
    - 技能和工具：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective`、`tools.invoke`。

  </Accordion>
</AccordionGroup>

### 常见事件族

- `chat`：UI 聊天更新，如 `chat.inject` 和其他仅转录的聊天事件。
- `session.message` 和 `session.tool`：已订阅会话的转录/事件流更新。
- `sessions.changed`：会话索引或元数据已更改。
- `presence`：系统存在快照更新。
- `tick`：定期保活/活跃事件。
- `health`：网关健康快照更新。
- `heartbeat`：心跳事件流更新。
- `cron`：cron 运行/作业更改事件。
- `shutdown`：网关关闭通知。
- `node.pair.requested` / `node.pair.resolved`：节点配对生命周期。
- `node.invoke.request`：节点调用请求广播。
- `device.pair.requested` / `device.pair.resolved`：配对设备生命周期。
- `voicewake.changed`：唤醒词触发器配置已更改。
- `exec.approval.requested` / `exec.approval.resolved`：exec 审批生命周期。
- `plugin.approval.requested` / `plugin.approval.resolved`：插件审批生命周期。

### 节点辅助方法

- 节点可以调用 `skills.bins` 获取当前技能可执行文件列表以进行自动允许检查。

### 操作员辅助方法

- 操作员可以调用 `commands.list`（`operator.read`）获取代理的运行时命令清单。
  - `agentId` 是可选的；省略它以读取默认代理工作区。
  - `scope` 控制主要 `name` 的目标接口：
    - `text` 返回不带前导 `/` 的主要文本命令令牌
    - `native` 和默认的 `both` 路径在可用时返回提供商感知的原生名称
  - `textAliases` 携带精确的斜杠别名，如 `/model` 和 `/m`。
  - `nativeName` 携带存在时的提供商感知原生命令名称。
  - `provider` 是可选的，仅影响原生命名加原生插件命令可用性。
  - `includeArgs=false` 从响应中省略序列化的参数元数据。
- 操作员可以调用 `tools.catalog`（`operator.read`）获取代理的运行时工具目录。响应包括分组工具和来源元数据：
  - `source`：`core` 或 `plugin`
  - `pluginId`：`source="plugin"` 时的插件所有者
  - `optional`：插件工具是否可选
- 操作员可以调用 `tools.effective`（`operator.read`）获取会话的运行时有效工具清单。
  - `sessionKey` 是必需的。
  - 网关在服务器端从会话派生受信任的运行时上下文，而不是接受调用者提供的认证或传递上下文。
  - 响应是会话范围的，反映活跃对话现在可以使用的内容，包括核心、插件和渠道工具。
- 操作员可以调用 `tools.invoke`（`operator.write`）通过与 `/tools/invoke` 相同的网关策略路径调用一个可用工具。
  - `name` 是必需的。`args`、`sessionKey`、`agentId`、`confirm` 和 `idempotencyKey` 是可选的。
  - 如果 `sessionKey` 和 `agentId` 都存在，解析的会话代理必须与 `agentId` 匹配。
  - 响应是带有 `ok`、`toolName`、可选 `output` 和类型化 `error` 字段的 SDK 面向信封。审批或策略拒绝在有效载荷中返回 `ok:false`，而不是绕过网关工具策略管道。
- 操作员可以调用 `skills.status`（`operator.read`）获取代理的可见技能清单。
  - `agentId` 是可选的；省略它以读取默认代理工作区。
  - 响应包括资格、缺少的要求、配置检查以及不暴露原始密钥值的清理安装选项。
- 操作员可以调用 `skills.search` 和 `skills.detail`（`operator.read`）获取 ClawHub 发现元数据。
- 操作员可以调用 `skills.install`（`operator.admin`）以两种模式：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 将技能文件夹安装到默认代理工作区 `skills/` 目录。
  - 网关安装程序模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }` 在网关主机上运行声明的 `metadata.openclaw.install` 操作。
- 操作员可以调用 `skills.update`（`operator.admin`）以两种模式：
  - ClawHub 模式更新一个跟踪的 slug 或默认代理工作区中所有跟踪的 ClawHub 安装。
  - 配置模式修补 `skills.entries.<skillKey>` 值，如 `enabled`、`apiKey` 和 `env`。

### `models.list` 视图

`models.list` 接受可选的 `view` 参数：

- 省略或 `"default"`：当前运行时行为。如果配置了 `agents.defaults.models`，响应是允许的目录；否则响应是完整的网关目录。
- `"configured"`：选择器大小行为。如果配置了 `agents.defaults.models`，它仍然优先。否则响应使用明确的 `models.providers.*.models` 条目，仅在没有配置的模型行存在时才回退到完整目录。
- `"all"`：完整的网关目录，绕过 `agents.defaults.models`。用于诊断和发现 UI，而不是正常的模型选择器。

## Exec 审批

- 当 exec 请求需要审批时，网关广播 `exec.approval.requested`。
- 操作员客户端通过调用 `exec.approval.resolve` 来解析（需要 `operator.approvals` 范围）。
- 对于 `host=node`，`exec.approval.request` 必须包含 `systemRunPlan`（规范的 `argv`/`cwd`/`rawCommand`/会话元数据）。缺少 `systemRunPlan` 的请求被拒绝。
- 审批后，转发的 `node.invoke system.run` 调用重用该规范的 `systemRunPlan` 作为权威命令/cwd/会话上下文。
- 如果调用者在准备和最终批准的 `system.run` 转发之间修改了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，网关拒绝该运行而不是信任修改的有效载荷。

## 代理传递回退

- `agent` 请求可以包含 `deliver=true` 以请求出站传递。
- `bestEffortDeliver=false` 保持严格行为：未解析或仅内部传递目标返回 `INVALID_REQUEST`。
- `bestEffortDeliver=true` 允许在无法解析外部可传递路由时回退到仅会话执行（例如内部/webchat 会话或不明确的多渠道配置）。

## 版本控制

- `PROTOCOL_VERSION` 位于 `src/gateway/protocol/schema/protocol-schemas.ts`。
- 客户端发送 `minProtocol` + `maxProtocol`；服务器拒绝不匹配。
- 模式 + 模型从 TypeBox 定义生成：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 客户端常量

`src/gateway/client.ts` 中的参考客户端使用这些默认值。这些值在协议 v3 中保持稳定，是第三方客户端的预期基线。

| 常量                               | 默认值                                        | 来源                                                                            |
| ---------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| `PROTOCOL_VERSION`                 | `3`                                           | `src/gateway/protocol/schema/protocol-schemas.ts`                               |
| 请求超时（每个 RPC）               | `30_000` ms                                   | `src/gateway/client.ts`（`requestTimeoutMs`）                                   |
| 预认证/连接挑战超时                | `15_000` ms                                   | `src/gateway/handshake-timeouts.ts`（配置/环境可以提高配对的服务器/客户端预算） |
| 初始重连退避                       | `1_000` ms                                    | `src/gateway/client.ts`（`backoffMs`）                                          |
| 最大重连退避                       | `30_000` ms                                   | `src/gateway/client.ts`（`scheduleReconnect`）                                  |
| 设备令牌关闭后的快速重试限制       | `250` ms                                      | `src/gateway/client.ts`                                                         |
| `terminate()` 之前的强制停止宽限期 | `250` ms                                      | `FORCE_STOP_TERMINATE_GRACE_MS`                                                 |
| `stopAndWait()` 默认超时           | `1_000` ms                                    | `STOP_AND_WAIT_TIMEOUT_MS`                                                      |
| 默认滴答间隔（`hello-ok` 之前）    | `30_000` ms                                   | `src/gateway/client.ts`                                                         |
| 滴答超时关闭                       | 当静默超过 `tickIntervalMs * 2` 时代码 `4000` | `src/gateway/client.ts`                                                         |
| `MAX_PAYLOAD_BYTES`                | `25 * 1024 * 1024`（25 MB）                   | `src/gateway/server-constants.ts`                                               |

服务器在 `hello-ok` 中广告有效的 `policy.tickIntervalMs`、`policy.maxPayload` 和 `policy.maxBufferedBytes`；客户端应遵守这些值而不是握手前的默认值。

## 认证

- 共享密钥网关认证使用 `connect.params.auth.token` 或 `connect.params.auth.password`，取决于配置的认证模式。
- 身份承载模式，如 Tailscale Serve（`gateway.auth.allowTailscale: true`）或非环回 `gateway.auth.mode: "trusted-proxy"`，从请求标头而不是 `connect.params.auth.*` 满足连接认证检查。
- 私有入口 `gateway.auth.mode: "none"` 完全跳过共享密钥连接认证；不要在公共/不受信任的入口上暴露该模式。
- 配对后，网关颁发一个**设备令牌**，范围限于连接角色 + 范围。它在 `hello-ok.auth.deviceToken` 中返回，客户端应为将来的连接持久化它。
- 客户端应在任何成功的连接后持久化主要的 `hello-ok.auth.deviceToken`。
- 使用该**存储的**设备令牌重新连接还应重用该令牌的存储已批准范围集。这保留了已授予的读取/探测/状态访问，并避免悄悄将重新连接折叠到更窄的隐式仅管理员范围。
- 客户端连接认证组装（`src/gateway/client.ts` 中的 `selectConnectAuth`）：
  - `auth.password` 是正交的，设置时始终转发。
  - `auth.token` 按优先顺序填充：首先是明确的共享令牌，然后是明确的 `deviceToken`，然后是存储的每设备令牌（按 `deviceId` + `role` 键控）。
  - `auth.bootstrapToken` 仅在以上都没有解析 `auth.token` 时发送。共享令牌或任何解析的设备令牌都会抑制它。
  - 一次性 `AUTH_TOKEN_MISMATCH` 重试时自动提升存储的设备令牌仅限于**受信任的端点** — 环回，或带有固定 `tlsFingerprint` 的 `wss://`。没有固定的公共 `wss://` 不符合资格。
- 额外的 `hello-ok.auth.deviceTokens` 条目是引导移交令牌。仅当连接使用了受信任传输（如 `wss://` 或环回/本地配对）上的引导认证时才持久化它们。
- 如果客户端提供**明确的** `deviceToken` 或明确的 `scopes`，该调用者请求的范围集保持权威；仅当客户端重用存储的每设备令牌时才重用缓存的范围。
- 设备令牌可以通过 `device.token.rotate` 和 `device.token.revoke` 轮换/撤销（需要 `operator.pairing` 范围）。
- `device.token.rotate` 返回轮换元数据。它仅为已使用该设备令牌认证的同设备调用回显替换的 bearer 令牌，以便仅令牌客户端可以在重新连接之前持久化其替换。共享/管理员轮换不回显 bearer 令牌。
- 令牌颁发、轮换和撤销保持绑定到该设备配对条目中记录的已批准角色集；令牌变更不能扩展或针对配对审批从未授予的设备角色。
- 对于配对设备令牌会话，设备管理是自范围的，除非调用者也有 `operator.admin`：非管理员调用者只能移除/撤销/轮换**自己的**设备条目。
- `device.token.rotate` 和 `device.token.revoke` 还根据调用者的当前会话范围检查目标操作员令牌范围集。非管理员调用者不能轮换或撤销比他们已持有的更广泛的操作员令牌。
- 认证失败包含 `error.details.code` 加恢复提示：
  - `error.details.canRetryWithDeviceToken`（布尔值）
  - `error.details.recommendedNextStep`（`retry_with_device_token`、`update_auth_configuration`、`update_auth_credentials`、`wait_then_retry`、`review_auth_configuration`）
- 客户端对 `AUTH_TOKEN_MISMATCH` 的行为：
  - 受信任的客户端可以尝试使用缓存的每设备令牌进行一次有界重试。
  - 如果该重试失败，客户端应停止自动重连循环并呈现操作员操作指导。

## 设备身份 + 配对

- 节点应包含从密钥对指纹派生的稳定设备身份（`device.id`）。
- 网关按设备 + 角色颁发令牌。
- 除非启用了本地自动审批，否则新设备 ID 需要配对审批。
- 配对自动审批以直接本地环回连接为中心。
- OpenClaw 还有一个用于受信任共享密钥辅助流程的窄后端/容器本地自连接路径。
- 同主机 tailnet 或 LAN 连接仍然被视为远程连接，需要审批。
- WS 客户端通常在 `connect` 期间包含 `device` 身份（操作员 + 节点）。唯一的无设备操作员例外是明确的信任路径：
  - `gateway.controlUi.allowInsecureAuth=true` 用于仅环回不安全 HTTP 兼容性。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` 操作员 Control UI 认证。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true`（应急，严重的安全降级）。
  - 使用共享网关令牌/密码认证的直接环回 `gateway-client` 后端 RPC。
- 所有连接必须签名服务器提供的 `connect.challenge` nonce。

### 设备认证迁移诊断

对于仍然使用预挑战签名行为的旧版客户端，`connect` 现在在 `error.details.code` 下返回带有稳定 `error.details.reason` 的 `DEVICE_AUTH_*` 详细代码。

常见迁移失败：

| 消息                        | details.code                     | details.reason           | 含义                                          |
| --------------------------- | -------------------------------- | ------------------------ | --------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客户端省略了 `device.nonce`（或发送了空白）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客户端使用了过时/错误的 nonce 签名。          |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 签名有效载荷与 v2 有效载荷不匹配。            |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 签名时间戳超出允许的偏差。                    |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 与公钥指纹不匹配。                |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公钥格式/规范化失败。                         |

迁移目标：

- 始终等待 `connect.challenge`。
- 签名包含服务器 nonce 的 v2 有效载荷。
- 在 `connect.params.device.nonce` 中发送相同的 nonce。
- 首选签名有效载荷是 `v3`，它在设备/客户端/角色/范围/令牌/nonce 字段之外还绑定 `platform` 和 `deviceFamily`。
- 旧版 `v2` 签名为了兼容性仍然被接受，但配对设备元数据固定仍然控制重新连接时的命令策略。

## TLS + 固定

- 支持 WS 连接的 TLS。
- 客户端可以选择固定网关证书指纹（参见 `gateway.tls` 配置加 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 范围

此协议暴露**完整的网关 API**（状态、渠道、模型、聊天、代理、会话、节点、审批等）。确切的接口由 `src/gateway/protocol/schema.ts` 中的 TypeBox 模式定义。

## 相关链接

- [Bridge 协议](/gateway/bridge-protocol)
- [网关运行手册](/gateway)
