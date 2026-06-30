---
summary: "心跳轮询消息和通知规则"
title: "心跳"
sidebarTitle: "心跳"
read_when:
  - 调整心跳节奏或消息传递
  - 决定在心跳和 cron 之间选择哪个用于计划任务
---

<Note>
**心跳还是 cron？** 参见[自动化和任务](/automation)，了解何时使用各自的指南。
</Note>

心跳在主会话中运行**定期代理轮次**，使模型能够在不打扰你的情况下呈现任何需要注意的事项。

心跳是计划的主会话轮次 — 它**不**创建[后台任务](/automation/tasks)记录。任务记录用于分离的工作（ACP 运行、子代理、隔离的 cron 任务）。

故障排除：[计划任务](/automation/cron-jobs#troubleshooting)

## 快速开始（初学者）

<Steps>
  <Step title="选择节奏">
    保留心跳启用（默认是 `30m`，或 Anthropic OAuth/令牌认证时为 `1h`，包括 Claude CLI 重用）或设置你自己的节奏。
  </Step>
  <Step title="添加 HEARTBEAT.md（可选）">
    在代理工作区创建一个小的 `HEARTBEAT.md` 清单或 `tasks:` 块。
  </Step>
  <Step title="决定心跳消息应该去哪里">
    `target: "none"` 是默认值；设置 `target: "last"` 以路由到最后一个联系人。
  </Step>
  <Step title="可选调整">
    - 启用心跳推理传递以提高透明度。
    - 如果心跳运行只需要 `HEARTBEAT.md`，使用轻量级引导上下文。
    - 启用隔离会话以避免每次心跳都发送完整的对话历史。
    - 将心跳限制在活跃时段（本地时间）。

  </Step>
</Steps>

示例配置：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // 明确传递到最后一个联系人（默认是 "none"）
        directPolicy: "allow", // 默认：允许直接/DM 目标；设置 "block" 以抑制
        lightContext: true, // 可选：仅从引导文件注入 HEARTBEAT.md
        isolatedSession: true, // 可选：每次运行使用新会话（无对话历史）
        skipWhenBusy: true, // 可选：当子代理或嵌套通道忙时也延迟
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // 可选：也发送单独的 `Reasoning:` 消息
      },
    },
  },
}
```

## 默认值

- 间隔：`30m`（或当检测到认证模式为 Anthropic OAuth/令牌认证（包括 Claude CLI 重用）时为 `1h`）。设置 `agents.defaults.heartbeat.every` 或每代理 `agents.list[].heartbeat.every`；使用 `0m` 禁用。
- 提示正文（可通过 `agents.defaults.heartbeat.prompt` 配置）：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- 心跳提示**逐字**发送为用户消息。仅当默认代理启用了心跳，且运行在内部标记时，系统提示才包含"Heartbeat"部分。
- 用 `0m` 禁用心跳时，正常运行也会从引导上下文中省略 `HEARTBEAT.md`，使模型不会看到仅心跳的指令。
- 活跃小时（`heartbeat.activeHours`）在配置的时区中检查。窗口外，心跳被跳过，直到窗口内的下一个滴答。
- 当 cron 工作处于活跃或排队状态时，心跳自动延迟。设置 `heartbeat.skipWhenBusy: true` 以在额外的忙碌通道（子代理或嵌套命令工作）上延迟；这对本地 Ollama 和其他受约束的单运行时主机很有用。

## 心跳提示的用途

默认提示是有意宽泛的：

- **后台任务**："Consider outstanding tasks" 推动代理审查后续行动（收件箱、日历、提醒、排队的工作）并呈现任何紧急事项。
- **人类签到**："Checkup sometimes on your human during day time" 推动偶尔的轻量级"有什么需要吗？"消息，但通过使用你配置的本地时区（参见[时区](/concepts/timezone)）避免夜间垃圾消息。

心跳可以响应已完成的[后台任务](/automation/tasks)，但心跳运行本身不创建任务记录。

如果你想让心跳做非常具体的事情（例如"检查 Gmail PubSub 统计"或"验证网关健康"），将 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）设置为自定义正文（逐字发送）。

## 响应合约

- 如果没有需要注意的事项，回复 **`HEARTBEAT_OK`**。
- 支持工具的心跳运行可以改为调用 `heartbeat_respond`，带 `notify: false` 表示不可见更新，或带 `notify: true` 加 `notificationText` 表示警报。当存在时，结构化工具响应优先于文本回退。
- 在心跳运行期间，当 `HEARTBEAT_OK` 出现在回复的**开头或结尾**时，OpenClaw 将其视为确认。令牌被剥离，如果剩余内容 **≤ `ackMaxChars`**（默认：300）则回复被丢弃。
- 如果 `HEARTBEAT_OK` 出现在回复的**中间**，则不做特殊处理。
- 对于警报，**不要**包含 `HEARTBEAT_OK`；仅返回警报文本。

在心跳之外，消息开头/结尾的游离 `HEARTBEAT_OK` 被剥离并记录；仅为 `HEARTBEAT_OK` 的消息被丢弃。

## 配置

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 默认：30m（0m 禁用）
        model: "anthropic/claude-opus-4-6",
        includeReasoning: false, // 默认：false（可用时传递单独的 Reasoning: 消息）
        lightContext: false, // 默认：false；true 仅从工作区引导文件保留 HEARTBEAT.md
        isolatedSession: false, // 默认：false；true 在新会话中运行每次心跳（无对话历史）
        skipWhenBusy: false, // 默认：false；true 也等待子代理/嵌套通道
        target: "last", // 默认：none | 选项：last | none | <channel id>（核心或插件，例如 "bluebubbles"）
        to: "+15551234567", // 可选的渠道特定覆盖
        accountId: "ops-bot", // 可选的多账户渠道 id
        prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        ackMaxChars: 300, // HEARTBEAT_OK 后允许的最大字符数
      },
    },
  },
}
```

### 范围和优先级

- `agents.defaults.heartbeat` 设置全局心跳行为。
- `agents.list[].heartbeat` 在顶部合并；如果任何代理有 `heartbeat` 块，**只有那些代理**运行心跳。
- `channels.defaults.heartbeat` 为所有渠道设置可见性默认值。
- `channels.<channel>.heartbeat` 覆盖渠道默认值。
- `channels.<channel>.accounts.<id>.heartbeat`（多账户渠道）覆盖每渠道设置。

### 每代理心跳

如果任何 `agents.list[]` 条目包含 `heartbeat` 块，**只有那些代理**运行心跳。每代理块合并在 `agents.defaults.heartbeat` 之上（因此你可以设置一次共享默认值并按代理覆盖）。

示例：两个代理，只有第二个代理运行心跳。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // 明确传递到最后一个联系人（默认是 "none"）
      },
    },
    list: [
      { id: "main", default: true },
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "whatsapp",
          to: "+15551234567",
          timeoutSeconds: 45,
          prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        },
      },
    ],
  },
}
```

### 活跃小时示例

将心跳限制在特定时区的工作时间：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // 明确传递到最后一个联系人（默认是 "none"）
        activeHours: {
          start: "09:00",
          end: "22:00",
          timezone: "America/New_York", // 可选；如果设置了 userTimezone 则使用它，否则使用主机时区
        },
      },
    },
  },
}
```

在此窗口外（东部时间早上 9 点之前或晚上 10 点之后），心跳被跳过。窗口内的下一个计划滴答将正常运行。

### 全天候设置

如果你想让心跳全天运行，使用以下模式之一：

- 完全省略 `activeHours`（无时间窗口限制；这是默认行为）。
- 设置全天窗口：`activeHours: { start: "00:00", end: "24:00" }`。

<Warning>
不要将相同的 `start` 和 `end` 时间（例如 `08:00` 到 `08:00`）。这被视为零宽度窗口，因此心跳总是被跳过。
</Warning>

### 多账户示例

使用 `accountId` 针对 Telegram 等多账户渠道上的特定账户：

```json5
{
  agents: {
    list: [
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "telegram",
          to: "12345678:topic:42", // 可选：路由到特定主题/线程
          accountId: "ops-bot",
        },
      },
    ],
  },
  channels: {
    telegram: {
      accounts: {
        "ops-bot": { botToken: "YOUR_TELEGRAM_BOT_TOKEN" },
      },
    },
  },
}
```

### 字段说明

<ParamField path="every" type="string">
  心跳间隔（持续时间字符串；默认单位 = 分钟）。
</ParamField>
<ParamField path="model" type="string">
  心跳运行的可选模型覆盖（`provider/model`）。
</ParamField>
<ParamField path="includeReasoning" type="boolean" default="false">
  启用时，可用时也传递单独的 `Reasoning:` 消息（与 `/reasoning on` 形状相同）。
</ParamField>
<ParamField path="lightContext" type="boolean" default="false">
  为 true 时，心跳运行使用轻量级引导上下文，仅从工作区引导文件保留 `HEARTBEAT.md`。
</ParamField>
<ParamField path="isolatedSession" type="boolean" default="false">
  为 true 时，每次心跳在没有先前对话历史的新会话中运行。使用与 cron `sessionTarget: "isolated"` 相同的隔离模式。显著降低每次心跳的令牌成本。与 `lightContext: true` 结合以最大节省。传递路由仍使用主会话上下文。
</ParamField>
<ParamField path="skipWhenBusy" type="boolean" default="false">
  为 true 时，心跳运行在额外的忙碌通道上延迟：子代理或嵌套命令工作。Cron 通道总是延迟心跳，即使没有此标志，因此本地模型主机不会同时运行 cron 和心跳提示。
</ParamField>
<ParamField path="session" type="string">
  心跳运行的可选会话键。

- `main`（默认）：代理主会话。
- 明确的会话键（从 `openclaw sessions --json` 或[会话 CLI](/cli/sessions) 复制）。
- 会话键格式：参见[会话](/concepts/session)和[群组](/channels/groups)。

</ParamField>
<ParamField path="target" type="string">
- `last`：传递到最后使用的外部渠道。
- 明确的渠道：任何已配置的渠道或插件 id，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
- `none`（默认）：运行心跳但**不**对外传递。

</ParamField>
<ParamField path="directPolicy" type='"allow" | "block"' default="allow">
  控制直接/DM 传递行为。`allow`：允许直接/DM 心跳传递。`block`：抑制直接/DM 传递（`reason=dm-blocked`）。

</ParamField>
<ParamField path="to" type="string">
  可选的收件人覆盖（渠道特定 id，例如 WhatsApp 的 E.164 或 Telegram 聊天 id）。对于 Telegram 主题/线程，使用 `<chatId>:topic:<messageThreadId>`。

</ParamField>
<ParamField path="accountId" type="string">
  多账户渠道的可选账户 id。当 `target: "last"` 时，账户 id 适用于解析的最后渠道（如果支持账户）；否则被忽略。如果账户 id 与解析渠道的已配置账户不匹配，则跳过传递。

</ParamField>
<ParamField path="prompt" type="string">
  覆盖默认提示正文（不合并）。

</ParamField>
<ParamField path="ackMaxChars" type="number" default="300">
  传递前 `HEARTBEAT_OK` 后允许的最大字符数。

</ParamField>
<ParamField path="suppressToolErrorWarnings" type="boolean">
  为 true 时，在心跳运行期间抑制工具错误警告有效载荷。

</ParamField>
<ParamField path="activeHours" type="object">
  将心跳运行限制在时间窗口内。具有 `start`（HH:MM，包含；使用 `00:00` 表示日初）、`end`（HH:MM，不含；允许 `24:00` 表示日末）以及可选的 `timezone` 的对象。

- 省略或 `"user"`：如果设置了 `agents.defaults.userTimezone` 则使用它，否则回退到主机系统时区。
- `"local"`：始终使用主机系统时区。
- 任何 IANA 标识符（例如 `America/New_York`）：直接使用；如果无效，回退到上面的 `"user"` 行为。
- `start` 和 `end` 对于活跃窗口不得相等；相等值被视为零宽度（始终在窗口外）。
- 在活跃窗口外，心跳被跳过，直到窗口内的下一个滴答。

</ParamField>

## 传递行为

<AccordionGroup>
  <Accordion title="会话和目标路由">
    - 默认情况下，心跳在代理的主会话（`agent:<id>:<mainKey>`）中运行，当 `session.scope = "global"` 时为 `global`。设置 `session` 以覆盖到特定的渠道会话（Discord/WhatsApp 等）。
    - `session` 仅影响运行上下文；传递由 `target` 和 `to` 控制。
    - 要传递到特定的渠道/收件人，设置 `target` + `to`。使用 `target: "last"` 时，传递使用该会话的最后外部渠道。
    - 心跳传递默认允许直接/DM 目标。设置 `directPolicy: "block"` 以抑制直接目标发送，同时仍运行心跳轮次。
    - 如果主队列、目标会话通道、cron 通道或活跃的 cron 任务繁忙，心跳被跳过并稍后重试。
    - 如果 `skipWhenBusy: true`，子代理和嵌套通道也延迟心跳运行。
    - 如果 `target` 解析到没有外部目标，运行仍然发生但不发送出站消息。

  </Accordion>
  <Accordion title="可见性和跳过行为">
    - 如果 `showOk`、`showAlerts` 和 `useIndicator` 全部禁用，运行预先以 `reason=alerts-disabled` 跳过。
    - 如果只禁用警报传递，OpenClaw 仍然可以运行心跳、更新到期任务时间戳、恢复会话空闲时间戳，并抑制向外的警报有效载荷。
    - 如果解析的心跳目标支持打字，心跳运行时 OpenClaw 显示打字。这使用心跳会发送聊天输出的同一目标，并通过 `typingMode: "never"` 禁用。

  </Accordion>
  <Accordion title="会话生命周期和审计">
    - 仅心跳的回复**不**保持会话存活。心跳元数据可能更新会话行，但空闲过期使用最后一条真实用户/渠道消息的 `lastInteractionAt`，每日过期使用 `sessionStartedAt`。
    - Control UI 和 WebChat 历史隐藏心跳提示和仅 OK 确认。底层会话转录仍然可以包含这些轮次用于审计/回放。
    - 分离的[后台任务](/automation/tasks)可以入队系统事件并唤醒心跳，当主会话应该快速注意某些事情时。该唤醒不会使心跳运行成为后台任务。

  </Accordion>
</AccordionGroup>

## 可见性控制

默认情况下，`HEARTBEAT_OK` 确认被抑制，而警报内容被传递。你可以按渠道或按账户调整此行为：

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false # 隐藏 HEARTBEAT_OK（默认）
      showAlerts: true # 显示警报消息（默认）
      useIndicator: true # 发出指示器事件（默认）
  telegram:
    heartbeat:
      showOk: true # 在 Telegram 上显示 OK 确认
  whatsapp:
    accounts:
      work:
        heartbeat:
          showAlerts: false # 为此账户抑制警报传递
```

优先级：每账户 → 每渠道 → 渠道默认值 → 内置默认值。

### 每个标志的作用

- `showOk`：当模型返回仅 OK 的回复时发送 `HEARTBEAT_OK` 确认。
- `showAlerts`：当模型返回非 OK 回复时发送警报内容。
- `useIndicator`：为 UI 状态面发出指示器事件。

如果**全部三个**都为 false，OpenClaw 完全跳过心跳运行（没有模型调用）。

### 每渠道与每账户示例

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false
      showAlerts: true
      useIndicator: true
  slack:
    heartbeat:
      showOk: true # 所有 Slack 账户
    accounts:
      ops:
        heartbeat:
          showAlerts: false # 仅为 ops 账户抑制警报
  telegram:
    heartbeat:
      showOk: true
```

### 常见模式

| 目标                          | 配置                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| 默认行为（静默 OK，警报开启） | _（无需配置）_                                                                           |
| 完全静默（无消息，无指示器）  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息）            | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 仅在一个渠道中显示 OK         | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md（可选）

如果工作区中存在 `HEARTBEAT.md` 文件，默认提示会告诉代理读取它。把它想象成你的"心跳清单"：小、稳定，每 30 分钟包含一次是安全的。

在正常运行时，`HEARTBEAT.md` 仅在默认代理启用了心跳指南时才注入。用 `0m` 禁用心跳节奏或设置 `includeSystemPromptSection: false` 会从正常引导上下文中省略它。

如果 `HEARTBEAT.md` 存在但实际上是空的（只有空白行和 Markdown 标题如 `# Heading`），OpenClaw 跳过心跳运行以节省 API 调用。该跳过报告为 `reason=empty-heartbeat-file`。如果文件丢失，心跳仍然运行，模型决定做什么。

保持它小（简短清单或提醒）以避免提示臃肿。

示例 `HEARTBEAT.md`：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it's daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### `tasks:` 块

`HEARTBEAT.md` 还支持一个小型结构化 `tasks:` 块，用于心跳内部的基于间隔的检查。

示例：

```md
tasks:

- name: inbox-triage
  interval: 30m
  prompt: "Check for urgent unread emails and flag anything time sensitive."
- name: calendar-scan
  interval: 2h
  prompt: "Check for upcoming meetings that need prep or follow-up."

# Additional instructions

- Keep alerts short.
- If nothing needs attention after all due tasks, reply HEARTBEAT_OK.
```

<AccordionGroup>
  <Accordion title="行为">
    - OpenClaw 解析 `tasks:` 块并根据每个任务的 `interval` 检查到期时间。
    - 只有**到期**的任务被包含在该滴答的心跳提示中。
    - 如果没有任务到期，心跳完全跳过（`reason=no-tasks-due`）以避免浪费模型调用。
    - `HEARTBEAT.md` 中的非任务内容被保留，并在到期任务列表之后作为附加上下文追加。
    - 任务上次运行时间戳存储在会话状态（`heartbeatTaskState`）中，因此间隔在正常重启后存活。
    - 任务时间戳仅在心跳运行完成其正常回复路径后才前进。跳过的 `empty-heartbeat-file` / `no-tasks-due` 运行不将任务标记为已完成。

  </Accordion>
</AccordionGroup>

任务模式在你想要一个心跳文件包含几个定期检查而不是每次滴答都支付所有费用时很有用。

### 代理可以更新 HEARTBEAT.md 吗？

可以 — 如果你要求它。

`HEARTBEAT.md` 只是代理工作区中的普通文件，所以你可以（在普通聊天中）告诉代理类似这样的话：

- "更新 `HEARTBEAT.md` 以添加每日日历检查。"
- "重写 `HEARTBEAT.md` 使其更短并专注于收件箱后续行动。"

如果你想让这主动发生，你也可以在你的心跳提示中包含一行明确的内容，如："如果清单变得过时，用更好的内容更新 HEARTBEAT.md。"

<Warning>
不要把秘密（API 密钥、电话号码、私人令牌）放入 `HEARTBEAT.md` — 它会成为提示上下文的一部分。
</Warning>

## 手动唤醒（按需）

你可以排队系统事件并立即触发心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果多个代理配置了 `heartbeat`，手动唤醒立即运行每个代理的心跳。

使用 `--mode next-heartbeat` 等待下一个计划滴答。

## 推理传递（可选）

默认情况下，心跳只传递最终的"答案"有效载荷。

如果你想要透明度，启用：

- `agents.defaults.heartbeat.includeReasoning: true`

启用时，心跳还将传递一个带有 `Reasoning:` 前缀的单独消息（与 `/reasoning on` 形状相同）。当代理管理多个会话/codex 时，这很有用，你想了解它决定向你发 ping 的原因 — 但它也可能泄露比你想要的更多内部细节。在群聊中最好保持关闭。

## 成本意识

心跳运行完整的代理轮次。较短的间隔消耗更多令牌。为降低成本：

- 使用 `isolatedSession: true` 以避免发送完整的对话历史（每次运行从约 10 万令牌降至约 2-5 千）。
- 使用 `lightContext: true` 将引导文件限制为仅 `HEARTBEAT.md`。
- 设置更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 小。
- 如果你只想要内部状态更新，使用 `target: "none"`。

## 心跳后的上下文溢出

如果心跳之前在较小的本地模型（例如 32k 窗口的 Ollama 模型）上留下了现有会话，且下一个主会话轮次报告上下文溢出，请将会话运行时模型重置为配置的主要模型。当最后的运行时模型与配置的 `heartbeat.model` 匹配时，OpenClaw 的重置消息会指出这一点。

当前心跳在运行完成后保留共享会话的现有运行时模型。你仍然可以使用 `isolatedSession: true` 在新会话中运行心跳，将其与 `lightContext: true` 结合以获得最小提示，或选择上下文窗口足够大以适应共享会话的心跳模型。

## 相关链接

- [自动化和任务](/automation) — 一览所有自动化机制
- [后台任务](/automation/tasks) — 分离工作的跟踪方式
- [时区](/concepts/timezone) — 时区如何影响心跳调度
- [故障排除](/automation/cron-jobs#troubleshooting) — 调试自动化问题
