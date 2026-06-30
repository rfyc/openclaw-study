---
summary: "Gateway 调度器的计划任务、Webhook 与 Gmail PubSub 触发器"
read_when:
  - 调度后台任务或唤醒操作
  - 将外部触发器（Webhook、Gmail）接入 OpenClaw
  - 在计划任务中选择心跳还是定时任务
title: "计划任务"
sidebarTitle: "计划任务"
---

Cron 是 Gateway 内置的调度器。它能持久化任务、在合适的时间唤醒代理，并可将输出结果发送回聊天频道或 Webhook 端点。

## 快速开始

<Steps>
  <Step title="添加一次性提醒">
    ```bash
    openclaw cron add \
      --name "Reminder" \
      --at "2026-02-01T16:00:00Z" \
      --session main \
      --system-event "Reminder: check the cron docs draft" \
      --wake now \
      --delete-after-run
    ```
  </Step>
  <Step title="查看任务列表">
    ```bash
    openclaw cron list
    openclaw cron show <job-id>
    ```
  </Step>
  <Step title="查看运行历史">
    ```bash
    openclaw cron runs --id <job-id>
    ```
  </Step>
</Steps>

## Cron 的工作原理

- Cron 运行在 **Gateway 进程内**（而非模型内部）。
- 任务定义持久化于 `~/.openclaw/cron/jobs.json`，重启后调度不会丢失。
- 运行时执行状态持久化于同目录的 `~/.openclaw/cron/jobs-state.json`。若用 git 跟踪 cron 定义，请跟踪 `jobs.json` 并将 `jobs-state.json` 加入 gitignore。
- 拆分后，旧版 OpenClaw 能读取 `jobs.json`，但可能将任务视为全新任务，因为运行时字段现在存于 `jobs-state.json`。
- 当 Gateway 运行或停止时若手动编辑 `jobs.json`，OpenClaw 会比对修改后的调度字段与待处理运行时槽位元数据，并清除过期的 `nextRunAtMs` 值。纯格式化或仅调整键序的改写会保留待处理槽位。
- 所有 cron 执行均会创建[后台任务](/automation/tasks)记录。
- Gateway 启动时，逾期的隔离代理轮次任务会在频道连接窗口之外重新调度，而非立即重放，从而保证重启后 Discord/Telegram 的启动和原生命令设置保持响应。
- 一次性任务（`--at`）默认在成功后自动删除。
- 隔离 cron 运行在完成后会尽力关闭其 `cron:<jobId>` 会话所跟踪的浏览器标签/进程，避免后台浏览器自动化留下孤立进程。
- 隔离 cron 运行还会防范过期确认回复。若首次结果仅是临时状态更新（如"正在处理"、"汇总中"等提示词），且没有后续子代理运行负责最终答复，OpenClaw 会再次请求一次实际结果后再投递。
- 隔离 cron 运行优先使用嵌入式运行中的结构化拒绝执行元数据，再回退到已知的最终摘要/输出标记（如 `SYSTEM_RUN_DENIED` 和 `INVALID_REQUEST`），确保被阻止的命令不被报告为成功运行。
- 隔离 cron 运行还会将运行级代理故障视为任务错误，即使没有产生回复载荷，从而使模型/提供商故障能增加错误计数器并触发失败通知，而不是将任务清除为成功。
- 当隔离代理轮次任务达到 `timeoutSeconds` 时，cron 会中止底层代理运行并给予短暂清理窗口。若运行未能及时排空，Gateway 拥有的清理逻辑会在 cron 记录超时之前强制清除该运行的会话所有权，避免排队的聊天工作被滞留于过期的处理会话之后。

<a id="maintenance"></a>

<Note>
Cron 的任务对账以运行时为主、持久化历史为辅：在 cron 运行时仍将该任务标记为运行中时，活跃的 cron 任务会保持存活，即使旧的子会话行仍然存在。一旦运行时不再持有该任务且 5 分钟宽限期届满，维护检查会参照持久化运行日志和任务状态中的匹配 `cron:<jobId>:<startedAt>` 运行记录。若持久化历史显示终止结果，任务账本将据此完结；否则 Gateway 拥有的维护逻辑可将任务标记为 `lost`。离线 CLI 审计可从持久化历史中恢复，但不会将自身进程内的活跃任务集为空视为 Gateway 拥有的 cron 运行已消失的证明。
</Note>

## 调度类型

| 类型    | CLI 标志  | 说明                                          |
| ------- | --------- | --------------------------------------------- |
| `at`    | `--at`    | 一次性时间戳（ISO 8601 或相对时间，如 `20m`） |
| `every` | `--every` | 固定间隔                                      |
| `cron`  | `--cron`  | 5 字段或 6 字段 cron 表达式，可附加 `--tz`    |

不带时区的时间戳被视为 UTC。使用 `--tz America/New_York` 可按本地墙钟时间调度。

每小时整点的周期性表达式会自动随机延迟最多 5 分钟以减少负载峰值。使用 `--exact` 强制精确计时，或使用 `--stagger 30s` 指定明确的随机窗口。

### 日期字段与星期字段使用 OR 逻辑

Cron 表达式由 [croner](https://github.com/Hexagon/croner) 解析。当日期字段和星期字段均为非通配符时，croner 在**任一**字段匹配时触发——而非两者都匹配。这是标准 Vixie cron 的行为。

```
# 本意："15 号且为周一的 9 点"
# 实际："每个 15 号的 9 点，以及每个周一的 9 点"
0 9 15 * 1
```

这样每月会触发约 5–6 次，而非 0–1 次。OpenClaw 使用 Croner 的默认 OR 行为。若需要两个条件同时满足，请使用 Croner 的 `+` 星期修饰符（`0 9 15 * +1`），或只在一个字段中设置条件，并在任务提示词或命令中判断另一个条件。

## 执行风格

| 风格       | `--session` 值      | 运行于                   | 最适合                   |
| ---------- | ------------------- | ------------------------ | ------------------------ |
| 主会话     | `main`              | 下一次心跳轮次           | 提醒、系统事件           |
| 隔离       | `isolated`          | 专用 `cron:<jobId>` 会话 | 报告、后台杂务           |
| 当前会话   | `current`           | 创建时绑定的会话         | 上下文感知的周期性工作   |
| 自定义会话 | `session:custom-id` | 持久命名会话             | 依赖历史记录积累的工作流 |

<AccordionGroup>
  <Accordion title="主会话 vs 隔离 vs 自定义">
    **主会话**任务将系统事件入队，并可选地唤醒心跳（`--wake now` 或 `--wake next-heartbeat`）。这些系统事件不会延长目标会话的每日/空闲重置新鲜度。**隔离**任务以全新会话运行专用代理轮次。**自定义会话**（`session:xxx`）跨运行保留上下文，可实现每日站会等依赖历史摘要积累的工作流。
  </Accordion>
  <Accordion title="隔离任务的"全新会话"含义">
    对于隔离任务，"全新会话"是指每次运行使用新的转录/会话 ID。OpenClaw 可携带安全偏好设置（如思考/快速/详细模式设置、标签以及用户明确选择的模型/认证覆盖），但不会从旧 cron 行继承环境会话上下文：频道/分组路由、发送或队列策略、权限提升、来源或 ACP 运行时绑定。若周期性任务需要有意延续同一对话上下文，请使用 `current` 或 `session:<id>`。
  </Accordion>
  <Accordion title="运行时清理">
    对于隔离任务，运行时拆卸现在包括对该 cron 会话尽力进行浏览器清理。清理失败会被忽略，实际 cron 结果仍然有效。

    隔离 cron 运行还会通过共享运行时清理路径释放为该任务创建的捆绑 MCP 运行时实例。这与主会话和自定义会话 MCP 客户端的拆卸方式一致，因此隔离 cron 任务不会在各次运行之间泄漏 stdio 子进程或长期存活的 MCP 连接。

  </Accordion>
  <Accordion title="子代理与 Discord 投递">
    当隔离 cron 运行编排子代理时，投递也会优先使用最终子代理输出，而非过时的父级临时文本。若子代理仍在运行，OpenClaw 会抑制该父级的部分更新，而不是直接公布。

    对于纯文本 Discord 公告目标，OpenClaw 只发送一次最终助手文本，而不会同时重放流式/中间文本载荷和最终答复。媒体和结构化 Discord 载荷仍作为单独载荷投递，以确保附件和组件不丢失。

  </Accordion>
</AccordionGroup>

### 隔离任务的载荷选项

<ParamField path="--message" type="string" required>
  提示词文本（隔离任务必填）。
</ParamField>
<ParamField path="--model" type="string">
  模型覆盖；使用该任务已选定的允许模型。
</ParamField>
<ParamField path="--thinking" type="string">
  思考级别覆盖。
</ParamField>
<ParamField path="--light-context" type="boolean">
  跳过工作区启动文件注入。
</ParamField>
<ParamField path="--tools" type="string">
  限制任务可使用的工具，例如 `--tools exec,read`。
</ParamField>

`--model` 将已选定的允许模型作为该任务的主要模型。这与聊天会话的 `/model` 覆盖不同：当任务主模型失败时，已配置的回退链仍然生效。若请求的模型不被允许或无法解析，cron 会以明确的验证错误使运行失败，而不是静默地回退到任务的代理/默认模型选择。

Cron 任务还可携带载荷级 `fallbacks`。若存在，该列表将替换任务的已配置回退链。在任务载荷/API 中使用 `fallbacks: []` 可使 cron 运行仅尝试所选模型。若任务有 `--model` 但既无载荷回退也无已配置回退，OpenClaw 会传递明确的空回退覆盖，防止代理主模型被作为隐式的额外重试目标追加。

隔离任务的模型选择优先级：

1. Gmail hook 模型覆盖（当运行来自 Gmail 且该覆盖被允许时）
2. 每个任务载荷中的 `model`
3. 用户存储的 cron 会话模型覆盖
4. 代理/默认模型选择

快速模式同样遵循已解析的实时选择。若所选模型配置有 `params.fastMode`，隔离 cron 默认使用该模式。存储的会话 `fastMode` 覆盖仍优先于配置，无论方向如何。

若隔离运行遇到实时模型切换，cron 会使用切换后的提供商/模型重试，并在重试前将该实时选择持久化到当前活跃运行。若切换同时携带新的认证配置，cron 也会将该认证配置覆盖持久化到当前活跃运行。重试次数有限制：初始尝试加 2 次切换重试后，cron 会中止而非无限循环。

在隔离 cron 运行进入代理执行器之前，OpenClaw 会对已配置 `api: "ollama"` 和 `api: "openai-completions"` 且 `baseUrl` 为回环地址、私有网络或 `.local` 的本地提供商端点进行可达性检查。若端点不可用，运行将被记录为 `skipped` 并附带明确的提供商/模型错误，而不是发起模型调用。端点结果缓存 5 分钟，使得使用同一个宕机本地 Ollama、vLLM、SGLang 或 LM Studio 服务器的多个到期任务共享一次小探测，而非发起请求风暴。跳过的提供商预检运行不增加执行错误退避计数；若需要重复跳过通知，请启用 `failureAlert.includeSkipped`。

## 投递与输出

| 模式       | 说明                                         |
| ---------- | -------------------------------------------- |
| `announce` | 若代理未发送，则将最终文本作为回退投递到目标 |
| `webhook`  | 将完成事件载荷 POST 到某个 URL               |
| `none`     | 不进行运行器回退投递                         |

使用 `--announce --channel telegram --to "-1001234567890"` 进行频道投递。对于 Telegram 论坛话题，使用 `-1001234567890:topic:123`；直接 RPC/配置调用方也可以将 `delivery.threadId` 作为字符串或数字传递。Slack/Discord/Mattermost 目标应使用明确的前缀（`channel:<id>`、`user:<id>`）。Matrix 房间 ID 区分大小写；请使用 Matrix 中的精确房间 ID 或 `room:!room:server` 格式。

当公告投递使用 `channel: "last"` 或省略 `channel` 时，形如 `telegram:123` 的带提供商前缀目标可在 cron 回退到会话历史或单一已配置频道之前先选定频道。只有已加载插件公示的前缀才是提供商选择器。若 `delivery.channel` 已明确指定，目标前缀必须指向同一提供商；例如，`channel: "whatsapp"` 配合 `to: "telegram:123"` 会被拒绝，而不是让 WhatsApp 将 Telegram ID 解释为电话号码。`channel:<id>`、`user:<id>`、`imessage:<handle>` 和 `sms:<number>` 等目标类型和服务前缀仍是频道自有的目标语法，而非提供商选择器。

对于隔离任务，聊天投递是共享的。若聊天路由可用，即使任务使用了 `--no-deliver`，代理也可以使用 `message` 工具。若代理向已配置/当前目标发送，OpenClaw 会跳过回退公告。否则 `announce`、`webhook` 和 `none` 仅控制代理轮次结束后运行器对最终回复的处理方式。

当代理在活跃聊天中创建隔离提醒时，OpenClaw 会为回退公告路由存储保留的实时投递目标。内部会话键可能为小写；当前聊天上下文可用时，提供商投递目标不会从这些键重建。

隐式公告投递使用已配置的频道允许列表来验证并重新路由过期目标。DM 配对存储审批不是回退自动化收件人；若计划任务需要主动发送至 DM，请设置 `delivery.to` 或配置频道的 `allowFrom` 条目。

失败通知遵循独立的目标路径：

- `cron.failureDestination` 为失败通知设置全局默认目标。
- `job.delivery.failureDestination` 可针对单个任务覆盖该设置。
- 若两者均未设置且任务已通过 `announce` 进行投递，失败通知现在会回退到该主要公告目标。
- `delivery.failureDestination` 仅在 `sessionTarget="isolated"` 的任务上受支持，除非主要投递模式为 `webhook`。
- `failureAlert.includeSkipped: true` 可为任务或全局 cron 告警策略启用重复跳过运行告警。跳过运行有独立的连续跳过计数器，不影响执行错误退避。

## CLI 示例

<Tabs>
  <Tab title="一次性提醒">
    ```bash
    openclaw cron add \
      --name "Calendar check" \
      --at "20m" \
      --session main \
      --system-event "Next heartbeat: check calendar." \
      --wake now
    ```
  </Tab>
  <Tab title="周期性隔离任务">
    ```bash
    openclaw cron add \
      --name "Morning brief" \
      --cron "0 7 * * *" \
      --tz "America/Los_Angeles" \
      --session isolated \
      --message "Summarize overnight updates." \
      --announce \
      --channel slack \
      --to "channel:C1234567890"
    ```
  </Tab>
  <Tab title="模型与思考覆盖">
    ```bash
    openclaw cron add \
      --name "Deep analysis" \
      --cron "0 6 * * 1" \
      --tz "America/Los_Angeles" \
      --session isolated \
      --message "Weekly deep analysis of project progress." \
      --model "opus" \
      --thinking high \
      --announce
    ```
  </Tab>
</Tabs>

## Webhooks

Gateway 可以暴露 HTTP Webhook 端点供外部触发。在配置中启用：

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
  },
}
```

### 认证

每个请求必须通过请求头包含 hook token：

- `Authorization: Bearer <token>`（推荐）
- `x-openclaw-token: <token>`

查询字符串 token 会被拒绝。

<AccordionGroup>
  <Accordion title="POST /hooks/wake">
    为主会话入队一个系统事件：

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/wake \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"text":"New email received","mode":"now"}'
    ```

    <ParamField path="text" type="string" required>
      事件描述。
    </ParamField>
    <ParamField path="mode" type="string" default="now">
      `now` 或 `next-heartbeat`。
    </ParamField>

  </Accordion>
  <Accordion title="POST /hooks/agent">
    运行一个隔离代理轮次：

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/agent \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4"}'
    ```

    字段：`message`（必填）、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`fallbacks`、`thinking`、`timeoutSeconds`。

  </Accordion>
  <Accordion title="映射 hook（POST /hooks/<name>）">
    自定义 hook 名称通过配置中的 `hooks.mappings` 解析。映射可通过模板或代码转换将任意载荷转为 `wake` 或 `agent` 动作。
  </Accordion>
</AccordionGroup>

<Warning>
请将 hook 端点置于回环地址、tailnet 或可信反向代理之后。

- 使用专用 hook token；不要复用 gateway 认证 token。
- 将 `hooks.path` 设置在专用子路径；`/` 会被拒绝。
- 设置 `hooks.allowedAgentIds` 以限制显式 `agentId` 路由。
- 保持 `hooks.allowRequestSessionKey=false`，除非需要调用方自选会话。
- 若启用 `hooks.allowRequestSessionKey`，还需设置 `hooks.allowedSessionKeyPrefixes` 以约束允许的会话键格式。
- 默认情况下，hook 载荷会被安全边界封装。

</Warning>

## Gmail PubSub 集成

通过 Google PubSub 将 Gmail 收件箱触发器接入 OpenClaw。

<Note>
**前提条件：** `gcloud` CLI、`gog`（gogcli）、OpenClaw hooks 已启用、Tailscale 用于公共 HTTPS 端点。
</Note>

### 向导设置（推荐）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

此命令会写入 `hooks.gmail` 配置、启用 Gmail 预设，并使用 Tailscale Funnel 作为推送端点。

### Gateway 自动启动

当 `hooks.enabled=true` 且 `hooks.gmail.account` 已设置时，Gateway 会在启动时运行 `gog gmail watch serve` 并自动续约 watch。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 可选择退出。

### 手动一次性设置

<Steps>
  <Step title="选择 GCP 项目">
    选择拥有 `gog` 所使用 OAuth 客户端的 GCP 项目：

    ```bash
    gcloud auth login
    gcloud config set project <project-id>
    gcloud services enable gmail.googleapis.com pubsub.googleapis.com
    ```

  </Step>
  <Step title="创建主题并授予 Gmail 推送访问权限">
    ```bash
    gcloud pubsub topics create gog-gmail-watch
    gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
      --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
      --role=roles/pubsub.publisher
    ```
  </Step>
  <Step title="启动 watch">
    ```bash
    gog gmail watch start \
      --account openclaw@gmail.com \
      --label INBOX \
      --topic projects/<project-id>/topics/gog-gmail-watch
    ```
  </Step>
</Steps>

### Gmail 模型覆盖

```json5
{
  hooks: {
    gmail: {
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

## 管理任务

```bash
# 列出所有任务
openclaw cron list

# 显示单个任务（含已解析的投递路由）
openclaw cron show <jobId>

# 编辑任务
openclaw cron edit <jobId> --message "Updated prompt" --model "opus"

# 立即强制运行某个任务
openclaw cron run <jobId>

# 仅在到期时运行
openclaw cron run <jobId> --due

# 查看运行历史
openclaw cron runs --id <jobId> --limit 50

# 删除任务
openclaw cron remove <jobId>

# 代理选择（多代理场景）
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops
openclaw cron edit <jobId> --clear-agent
```

<Note>
模型覆盖说明：

- `openclaw cron add|edit --model ...` 会修改任务的已选模型。
- 若模型被允许，该精确的提供商/模型将到达隔离代理运行。
- 若不被允许或无法解析，cron 会以明确的验证错误使运行失败。
- 已配置的回退链仍然生效，因为 cron `--model` 是任务主模型，而非会话 `/model` 覆盖。
- 载荷 `fallbacks` 会替换该任务的已配置回退；`fallbacks: []` 禁用回退，使运行严格执行。
- 仅有 `--model` 而无显式或已配置回退列表时，不会将代理主模型作为静默的额外重试目标追加。

</Note>

## 配置

```json5
{
  cron: {
    enabled: true,
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 1,
    retry: {
      maxAttempts: 3,
      backoffMs: [60000, 120000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "server_error"],
    },
    webhookToken: "replace-with-dedicated-webhook-token",
    sessionRetention: "24h",
    runLog: { maxBytes: "2mb", keepLines: 2000 },
  },
}
```

`maxConcurrentRuns` 限制计划 cron 调度和隔离代理轮次执行的并发数。隔离 cron 代理轮次在内部使用队列专用的 `cron-nested` 执行通道，因此提高此值可让独立的 cron LLM 运行并行推进，而不仅仅是启动其外部 cron 封装器。此设置不会扩展共享的非 cron `nested` 通道。

运行时状态附属文件由 `cron.store` 派生：形如 `~/clawd/cron/jobs.json` 的 `.json` 存储使用 `~/clawd/cron/jobs-state.json`，而不以 `.json` 结尾的存储路径则追加 `-state.json`。

若手动编辑 `jobs.json`，请将 `jobs-state.json` 排除在版本控制之外。OpenClaw 使用该附属文件存储待处理槽位、活跃标记、最后运行元数据，以及调度标识（用于告知调度器何时需要为外部编辑的任务重新生成 `nextRunAtMs`）。

禁用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

<AccordionGroup>
  <Accordion title="重试行为">
    **一次性重试**：瞬时错误（速率限制、过载、网络、服务器错误）最多重试 3 次，采用指数退避。永久性错误立即停用。

    **周期性重试**：重试之间使用指数退避（30 秒至 60 分钟）。下次成功运行后退避重置。

  </Accordion>
  <Accordion title="维护">
    `cron.sessionRetention`（默认 `24h`）会清除隔离运行会话条目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 会自动修剪运行日志文件。
  </Accordion>
</AccordionGroup>

## 故障排查

### 诊断命令

```bash
openclaw status
openclaw gateway status
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
openclaw doctor
```

<AccordionGroup>
  <Accordion title="Cron 未触发">
    - 检查 `cron.enabled` 和 `OPENCLAW_SKIP_CRON` 环境变量。
    - 确认 Gateway 持续运行。
    - 对于 `cron` 调度，核实时区（`--tz`）与宿主机时区是否一致。
    - 运行输出中出现 `reason: not-due` 表示使用 `openclaw cron run <jobId> --due` 手动运行时任务尚未到期。

  </Accordion>
  <Accordion title="Cron 已触发但无投递">
    - 投递模式 `none` 表示不期望运行器进行回退发送。当聊天路由可用时，代理仍可直接使用 `message` 工具发送。
    - 投递目标缺失/无效（`channel`/`to`）表示出站已跳过。
    - 对于 Matrix，复制或遗留任务中小写的 `delivery.to` 房间 ID 可能失败，因为 Matrix 房间 ID 区分大小写。请将任务编辑为 Matrix 中的精确 `!room:server` 或 `room:!room:server` 值。
    - 频道认证错误（`unauthorized`、`Forbidden`）表示投递被凭证阻止。
    - 若隔离运行仅返回静默 token（`NO_REPLY` / `no_reply`），OpenClaw 会抑制直接出站投递，同时抑制回退队列摘要路径，不会向聊天发布任何内容。
    - 若代理应主动向用户发消息，请检查任务是否有可用路由（`channel: "last"` 加上之前的聊天记录，或显式频道/目标）。

  </Accordion>
  <Accordion title="Cron 或心跳似乎阻止了 /new 风格的轮转">
    - 每日和空闲重置新鲜度不基于 `updatedAt`；参见[会话管理](/concepts/session#session-lifecycle)。
    - Cron 唤醒、心跳运行、执行通知和 gateway 记账可能会更新会话行（用于路由/状态），但不会延长 `sessionStartedAt` 或 `lastInteractionAt`。
    - 对于在这些字段存在之前创建的遗留行，当文件仍可用时，OpenClaw 可从转录 JSONL 会话头中恢复 `sessionStartedAt`。没有 `lastInteractionAt` 的遗留空闲行会将恢复的启动时间用作空闲基线。

  </Accordion>
  <Accordion title="时区陷阱">
    - 不带 `--tz` 的 cron 使用 gateway 宿主机时区。
    - 不带时区的 `at` 调度被视为 UTC。
    - 心跳 `activeHours` 使用已配置的时区解析。

  </Accordion>
</AccordionGroup>

## 相关文档

- [自动化与任务](/automation) — 所有自动化机制概览
- [后台任务](/automation/tasks) — cron 执行的任务账本
- [心跳](/gateway/heartbeat) — 定期主会话轮次
- [时区](/concepts/timezone) — 时区配置
