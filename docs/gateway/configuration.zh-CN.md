---
summary: "配置概述：常见任务、快速设置和完整参考的链接"
read_when:
  - 首次设置 OpenClaw
  - 寻找常见配置模式
  - 导航到特定配置部分
title: "配置"
---

OpenClaw 从 `~/.openclaw/openclaw.json` 读取可选的 <Tooltip tip="JSON5 支持注释和尾随逗号">**JSON5**</Tooltip> 配置。
活跃的配置路径必须是普通文件。符号链接的 `openclaw.json` 布局不受 OpenClaw 拥有的写入支持；原子写入可能会替换路径而不是保留符号链接。如果你将配置保存在默认状态目录之外，请将 `OPENCLAW_CONFIG_PATH` 直接指向真实文件。

如果文件缺失，OpenClaw 使用安全默认值。添加配置的常见原因：

- 连接渠道并控制谁可以向机器人发消息
- 设置模型、工具、沙盒或自动化（cron、hooks）
- 调整会话、媒体、网络或 UI

所有可用字段参见[完整参考](/gateway/configuration-reference)。

代理和自动化应在编辑配置前使用 `config.schema.lookup` 获取精确的字段级文档。使用本页进行任务导向指导，使用[配置参考](/gateway/configuration-reference)获取更广泛的字段映射和默认值。

<Tip>
**刚开始配置？** 从 `openclaw onboard` 开始进行交互式设置，或查看[配置示例](/gateway/configuration-examples)指南获取完整的可复制粘贴配置。
</Tip>

## 最小配置

```json5
// ~/.openclaw/openclaw.json
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

## 编辑配置

<Tabs>
  <Tab title="交互式向导">
    ```bash
    openclaw onboard       # 完整的入门流程
    openclaw configure     # 配置向导
    ```
  </Tab>
  <Tab title="CLI（单行命令）">
    ```bash
    openclaw config get agents.defaults.workspace
    openclaw config set agents.defaults.heartbeat.every "2h"
    openclaw config unset plugins.entries.brave.config.webSearch.apiKey
    ```
  </Tab>
  <Tab title="Control UI">
    打开 [http://127.0.0.1:18789](http://127.0.0.1:18789) 并使用 **Config** 选项卡。
    Control UI 从实时配置模式渲染表单，包括字段 `title`/`description` 文档元数据以及插件和渠道模式（如果可用），并以**原始 JSON** 编辑器作为转义通道。对于下钻 UI 和其他工具，网关还公开 `config.schema.lookup` 以获取一个路径范围的模式节点加上直接子摘要。
  </Tab>
  <Tab title="直接编辑">
    直接编辑 `~/.openclaw/openclaw.json`。网关监视该文件并自动应用更改（参见[热重载](#config-hot-reload)）。
  </Tab>
</Tabs>

## 严格验证

<Warning>
OpenClaw 只接受完全符合模式的配置。未知键、格式错误的类型或无效值会导致网关**拒绝启动**。唯一的根级别例外是 `$schema`（字符串），以便编辑器可以附加 JSON Schema 元数据。
</Warning>

`openclaw config schema` 打印 Control UI 和验证使用的规范 JSON Schema。`config.schema.lookup` 获取单个路径范围的节点加上子摘要，用于下钻工具。字段 `title`/`description` 文档元数据通过嵌套对象、通配符（`*`）、数组项（`[]`）和 `anyOf`/`oneOf`/`allOf` 分支传递。运行时插件和渠道模式在加载清单注册表时合并进来。

验证失败时：

- 网关不会启动
- 只有诊断命令有效（`openclaw doctor`、`openclaw logs`、`openclaw health`、`openclaw status`）
- 运行 `openclaw doctor` 查看确切问题
- 运行 `openclaw doctor --fix`（或 `--yes`）应用修复

每次成功启动后，网关保留一个受信的最后已知良好副本，但启动和热重载不会自动恢复它。如果 `openclaw.json` 验证失败（包括插件本地验证），网关启动失败或重载被跳过，当前运行时保留最后接受的配置。运行 `openclaw doctor --fix`（或 `--yes`）修复前缀/覆盖配置或恢复最后已知良好副本。当候选包含被修订的秘密占位符（如 `***`）时，跳过对最后已知良好的提升。

## 常见任务

<AccordionGroup>
  <Accordion title="设置渠道（WhatsApp、Telegram、Discord 等）">
    每个渠道在 `channels.<provider>` 下有自己的配置部分。参见专用渠道页面的设置步骤：

    - [WhatsApp](/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/channels/telegram) — `channels.telegram`
    - [Discord](/channels/discord) — `channels.discord`
    - [Feishu](/channels/feishu) — `channels.feishu`
    - [Google Chat](/channels/googlechat) — `channels.googlechat`
    - [Microsoft Teams](/channels/msteams) — `channels.msteams`
    - [Slack](/channels/slack) — `channels.slack`
    - [Signal](/channels/signal) — `channels.signal`
    - [iMessage](/channels/imessage) — `channels.imessage`
    - [Mattermost](/channels/mattermost) — `channels.mattermost`

    所有渠道共享相同的 DM 策略模式：

    ```json5
    {
      channels: {
        telegram: {
          enabled: true,
          botToken: "123:abc",
          dmPolicy: "pairing",   // pairing | allowlist | open | disabled
          allowFrom: ["tg:123"], // 仅用于 allowlist/open
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="选择和配置模型">
    设置主模型和可选回退：

    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-6",
            fallbacks: ["openai/gpt-5.4"],
          },
          models: {
            "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
            "openai/gpt-5.4": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` 定义模型目录并充当 `/model` 的允许列表。
    - 使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 添加允许列表条目而不删除现有模型。会删除条目的普通替换被拒绝，除非你传递 `--replace`。
    - 模型引用使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制脚本/工具图像降采样（默认 `1200`）；对于截图密集型运行，较低的值通常减少视觉 token 使用。
    - 参见[模型 CLI](/concepts/models) 了解在聊天中切换模型，以及[模型故障转移](/concepts/model-failover) 了解认证轮换和回退行为。
    - 对于自定义/自托管提供商，参见参考中的[自定义提供商](/gateway/config-tools#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制谁可以向机器人发消息">
    DM 访问通过每渠道的 `dmPolicy` 控制：

    - `"pairing"`（默认）：未知发送者获得一次性配对码进行批准
    - `"allowlist"`：只有 `allowFrom` 中的发送者（或配对允许存储）
    - `"open"`：允许所有入站 DM（需要 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有 DM

    对于群组，使用 `groupPolicy` + `groupAllowFrom` 或渠道特定的允许列表。

    参见[完整参考](/gateway/config-channels#dm-and-group-access)了解每渠道详情。

  </Accordion>

  <Accordion title="设置群聊提及门控">
    群组消息默认**需要提及**。按代理配置触发模式，并保持可见房间回复在默认的消息工具路径上，除非你有意希望旧版自动最终回复：

    ```json5
    {
      messages: {
        visibleReplies: "automatic", // 设置 "message_tool" 要求全局消息工具发送
        groupChat: {
          visibleReplies: "message_tool", // 默认；使用 "automatic" 获取旧版房间回复
        },
      },
      agents: {
        list: [
          {
            id: "main",
            groupChat: {
              mentionPatterns: ["@openclaw", "openclaw"],
            },
          },
        ],
      },
      channels: {
        whatsapp: {
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```

    - **元数据提及**：原生 @-提及（WhatsApp 点击提及、Telegram @bot 等）
    - **文本模式**：`mentionPatterns` 中的安全正则表达式模式
    - **可见回复**：`messages.visibleReplies` 可以全局要求消息工具发送；`messages.groupChat.visibleReplies` 为群组/渠道覆盖该值。
    - 参见[完整参考](/gateway/config-channels#group-chat-mention-gating)了解可见回复模式、每渠道覆盖和自聊天模式。

  </Accordion>

  <Accordion title="按代理限制技能">
    使用 `agents.defaults.skills` 作为共享基础，然后用 `agents.list[].skills` 覆盖特定代理：

    ```json5
    {
      agents: {
        defaults: {
          skills: ["github", "weather"],
        },
        list: [
          { id: "writer" }, // 继承 github, weather
          { id: "docs", skills: ["docs-search"] }, // 替换默认值
          { id: "locked-down", skills: [] }, // 无技能
        ],
      },
    }
    ```

    - 省略 `agents.defaults.skills` 以默认不限制技能。
    - 省略 `agents.list[].skills` 以继承默认值。
    - 将 `agents.list[].skills: []` 设置为无技能。
    - 参见[技能](/tools/skills)、[技能配置](/tools/skills-config) 和[配置参考](/gateway/config-agents#agents-defaults-skills)。

  </Accordion>

  <Accordion title="调整网关渠道健康监测">
    控制网关重启看起来过时的渠道的侵略性：

    ```json5
    {
      gateway: {
        channelHealthCheckMinutes: 5,
        channelStaleEventThresholdMinutes: 30,
        channelMaxRestartsPerHour: 10,
      },
      channels: {
        telegram: {
          healthMonitor: { enabled: false },
          accounts: {
            alerts: {
              healthMonitor: { enabled: true },
            },
          },
        },
      },
    }
    ```

    - 设置 `gateway.channelHealthCheckMinutes: 0` 全局禁用健康监测重启。
    - `channelStaleEventThresholdMinutes` 应大于或等于检查间隔。
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 为一个渠道或账户禁用自动重启，而不禁用全局监测器。
    - 参见[健康检查](/gateway/health)了解运营调试，以及[完整参考](/gateway/configuration-reference#gateway)了解所有字段。

  </Accordion>

  <Accordion title="调整网关 WebSocket 握手超时">
    给本地客户端更多时间在负载或低功率主机上完成预认证 WebSocket 握手：

    ```json5
    {
      gateway: {
        handshakeTimeoutMs: 30000,
      },
    }
    ```

    - 默认值为 `15000` 毫秒。
    - `OPENCLAW_HANDSHAKE_TIMEOUT_MS` 仍然对一次性服务或 shell 覆盖优先。
    - 优先修复启动/事件循环停滞；此旋钮适用于健康但启动时较慢的主机。

  </Accordion>

  <Accordion title="配置会话和重置">
    会话控制对话连续性和隔离：

    ```json5
    {
      session: {
        dmScope: "per-channel-peer",  // 推荐用于多用户
        threadBindings: {
          enabled: true,
          idleHours: 24,
          maxAgeHours: 0,
        },
        reset: {
          mode: "daily",
          atHour: 4,
          idleMinutes: 120,
        },
      },
    }
    ```

    - `dmScope`：`main`（共享）| `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`：线程绑定会话路由的全局默认值（Discord 支持 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`）。
    - 参见[会话管理](/concepts/session)了解范围、身份链接和发送策略。
    - 参见[完整参考](/gateway/config-agents#session)了解所有字段。

  </Accordion>

  <Accordion title="启用沙盒">
    在隔离的沙盒运行时中运行代理会话：

    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main",  // off | non-main | all
            scope: "agent",    // session | agent | shared
          },
        },
      },
    }
    ```

    先构建镜像 — 从源代码检出运行 `scripts/sandbox-setup.sh`，或从 npm 安装参见[沙盒 § 镜像和设置](/gateway/sandboxing#images-and-setup)中的内联 `docker build` 命令。

    参见[沙盒](/gateway/sandboxing)了解完整指南，以及[完整参考](/gateway/config-agents#agentsdefaultssandbox)了解所有选项。

  </Accordion>

  <Accordion title="为官方 iOS 构建启用中继支持的推送">
    中继支持的推送在 `openclaw.json` 中配置。

    在网关配置中设置：

    ```json5
    {
      gateway: {
        push: {
          apns: {
            relay: {
              baseUrl: "https://relay.example.com",
              // 可选。默认：10000
              timeoutMs: 10000,
            },
          },
        },
      },
    }
    ```

    等效的 CLI 命令：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    此操作的作用：

    - 让网关通过外部中继发送 `push.test`、唤醒提示和重连唤醒。
    - 使用已配对 iOS 应用转发的注册范围发送授权。网关不需要部署范围的中继 token。
    - 将每个中继支持的注册绑定到 iOS 应用配对的网关身份，因此另一个网关无法重用存储的注册。
    - 保持本地/手动 iOS 构建使用直接 APNs。中继支持的发送仅适用于通过中继注册的官方分发构建。
    - 必须与官方/TestFlight iOS 构建中烘焙的中继基础 URL 匹配，以便注册和发送流量到达同一个中继部署。

    端到端流程：

    1. 安装使用相同中继基础 URL 编译的官方/TestFlight iOS 构建。
    2. 在网关上配置 `gateway.push.apns.relay.baseUrl`。
    3. 将 iOS 应用配对到网关，让节点和操作员会话都连接。
    4. iOS 应用获取网关身份，使用 App Attest 加应用收据向中继注册，然后将中继支持的 `push.apns.register` 有效载荷发布到配对的网关。
    5. 网关存储中继句柄和发送授权，然后用于 `push.test`、唤醒提示和重连唤醒。

    操作注意事项：

    - 如果你将 iOS 应用切换到不同的网关，重新连接应用以便它可以发布绑定到该网关的新中继注册。
    - 如果你发布指向不同中继部署的新 iOS 构建，应用会刷新其缓存的中继注册，而不是重用旧的中继来源。

    兼容性说明：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍然作为临时环境覆盖有效。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍然是仅回环的开发转义通道；不要在配置中持久化 HTTP 中继 URL。

    参见 [iOS 应用](/platforms/ios#relay-backed-push-for-official-builds)了解端到端流程，以及[认证和信任流程](/platforms/ios#authentication-and-trust-flow)了解中继安全模型。

  </Accordion>

  <Accordion title="设置心跳（定期签到）">
    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "30m",
            target: "last",
          },
        },
      },
    }
    ```

    - `every`：持续时间字符串（`30m`、`2h`）。设置 `0m` 禁用。
    - `target`：`last` | `none` | `<channel-id>`（例如 `discord`、`matrix`、`telegram` 或 `whatsapp`）
    - `directPolicy`：DM 风格心跳目标的 `allow`（默认）或 `block`
    - 参见[心跳](/gateway/heartbeat)了解完整指南。

  </Accordion>

  <Accordion title="配置 cron 任务">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 2, // cron 调度 + 隔离的 cron 代理对话执行
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention`：从 `sessions.json` 中修剪已完成的隔离运行会话（默认 `24h`；设置 `false` 禁用）。
    - `runLog`：按大小和保留行数修剪 `cron/runs/<jobId>.jsonl`。
    - 参见 [Cron 任务](/automation/cron-jobs)了解功能概述和 CLI 示例。

  </Accordion>

  <Accordion title="设置 webhooks（hooks）">
    在网关上启用 HTTP webhook 端点：

    ```json5
    {
      hooks: {
        enabled: true,
        token: "shared-secret",
        path: "/hooks",
        defaultSessionKey: "hook:ingress",
        allowRequestSessionKey: false,
        allowedSessionKeyPrefixes: ["hook:"],
        mappings: [
          {
            match: { path: "gmail" },
            action: "agent",
            agentId: "main",
            deliver: true,
          },
        ],
      },
    }
    ```

    安全注意事项：
    - 将所有 hook/webhook 有效载荷内容视为不受信任的输入。
    - 使用专用的 `hooks.token`；不要重用共享的网关 token。
    - Hook 认证仅限于头部（`Authorization: Bearer ...` 或 `x-openclaw-token`）；查询字符串 token 被拒绝。
    - `hooks.path` 不能是 `/`；将 webhook 入口保留在专用子路径上，如 `/hooks`。
    - 保持不安全内容绕过标志禁用（`hooks.gmail.allowUnsafeExternalContent`、`hooks.mappings[].allowUnsafeExternalContent`），除非在进行严格范围的调试。
    - 如果你启用 `hooks.allowRequestSessionKey`，也设置 `hooks.allowedSessionKeyPrefixes` 以约束调用者选择的会话键。
    - 对于 hook 驱动的代理，优先使用强大的现代模型层和严格的工具策略（例如尽可能使用仅消息加沙盒）。

    参见[完整参考](/gateway/configuration-reference#hooks)了解所有映射选项和 Gmail 集成。

  </Accordion>

  <Accordion title="配置多代理路由">
    运行多个具有独立工作区和会话的隔离代理：

    ```json5
    {
      agents: {
        list: [
          { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
          { id: "work", workspace: "~/.openclaw/workspace-work" },
        ],
      },
      bindings: [
        { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
        { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
      ],
    }
    ```

    参见[多代理](/concepts/multi-agent)和[完整参考](/gateway/config-agents#multi-agent-routing)了解绑定规则和每代理访问配置文件。

  </Accordion>

  <Accordion title="将配置拆分为多个文件（$include）">
    使用 `$include` 组织大型配置：

    ```json5
    // ~/.openclaw/openclaw.json
    {
      gateway: { port: 18789 },
      agents: { $include: "./agents.json5" },
      broadcast: {
        $include: ["./clients/a.json5", "./clients/b.json5"],
      },
    }
    ```

    - **单个文件**：替换包含对象
    - **文件数组**：按顺序深度合并（后者获胜）
    - **兄弟键**：在 include 之后合并（覆盖 included 的值）
    - **嵌套 include**：支持最多 10 层深
    - **相对路径**：相对于包含文件解析
    - **OpenClaw 拥有的写入**：当写入仅更改由单文件 include 支持的一个顶级部分时（如 `plugins: { $include: "./plugins.json5" }`），OpenClaw 更新那个 included 文件并保持 `openclaw.json` 不变
    - **不支持的直写**：根 include、include 数组和带有兄弟覆盖的 include 对 OpenClaw 拥有的写入失败关闭，而不是展平配置
    - **限制**：`$include` 路径必须在持有 `openclaw.json` 的目录下解析。要跨机器或用户共享树，将 `OPENCLAW_INCLUDE_ROOTS` 设置为 include 可以引用的附加目录路径列表（POSIX 上为 `:`，Windows 上为 `;`）。符号链接被解析并重新检查，因此词法上位于配置目录中但其真实目标转义了每个允许根的路径仍然被拒绝。
    - **错误处理**：对缺少的文件、解析错误和循环 include 有清晰的错误

  </Accordion>
</AccordionGroup>

## 配置热重载

网关监视 `~/.openclaw/openclaw.json` 并自动应用更改 — 大多数设置不需要手动重启。

直接文件编辑被视为不受信任，直到它们通过验证。监视器等待编辑器临时写入/重命名变化稳定，读取最终文件，并拒绝无效的外部编辑而不重写 `openclaw.json`。OpenClaw 拥有的配置写入在写入之前使用相同的模式门；破坏性覆盖（如删除 `gateway.mode` 或将文件缩小超过一半）被拒绝并保存为 `.rejected.*` 以供检查。

如果你看到 `config reload skipped (invalid config)` 或启动报告 `Invalid config`，检查配置，运行 `openclaw config validate`，然后运行 `openclaw doctor --fix` 进行修复。参见[网关故障排除](/gateway/troubleshooting#gateway-rejected-invalid-config)了解检查清单。

### 重载模式

| 模式                 | 行为                                                |
| -------------------- | --------------------------------------------------- |
| **`hybrid`**（默认） | 立即热应用安全更改。自动重启处理关键更改。          |
| **`hot`**            | 仅热应用安全更改。当需要重启时记录警告 — 你来处理。 |
| **`restart`**        | 对任何配置更改重启网关，无论是否安全。              |
| **`off`**            | 禁用文件监视。更改在下次手动重启时生效。            |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 什么热应用，什么需要重启

大多数字段在没有停机的情况下热应用。在 `hybrid` 模式下，需要重启的更改会自动处理。

| 类别       | 字段                                                  | 需要重启？ |
| ---------- | ----------------------------------------------------- | ---------- |
| 渠道       | `channels.*`、`web`（WhatsApp）— 所有内置和插件渠道   | 否         |
| 代理和模型 | `agent`、`agents`、`models`、`routing`                | 否         |
| 自动化     | `hooks`、`cron`、`agent.heartbeat`                    | 否         |
| 会话和消息 | `session`、`messages`                                 | 否         |
| 工具和媒体 | `tools`、`browser`、`skills`、`mcp`、`audio`、`talk`  | 否         |
| UI 和其他  | `ui`、`logging`、`identity`、`bindings`               | 否         |
| 网关服务器 | `gateway.*`（端口、绑定、认证、tailscale、TLS、HTTP） | **是**     |
| 基础设施   | `discovery`、`canvasHost`、`plugins`                  | **是**     |

<Note>
`gateway.reload` 和 `gateway.remote` 是例外 — 更改它们**不会**触发重启。
</Note>

### 重载规划

当你编辑通过 `$include` 引用的源文件时，OpenClaw 从源作者布局规划重载，而不是从内存中展平的视图。即使单个顶级部分位于其自己的 included 文件中（如 `plugins: { $include: "./plugins.json5" }`），这也使热重载决策（热应用与重启）可预测。如果源布局不明确，重载规划会失败关闭。

## 配置 RPC（程序化更新）

对于通过网关 API 写入配置的工具，优先使用以下流程：

- `config.schema.lookup` 检查一个子树（浅模式节点 + 子摘要）
- `config.get` 获取当前快照加 `hash`
- `config.patch` 用于部分更新（JSON 合并补丁：对象合并，`null` 删除，数组替换）
- `config.apply` 仅当你打算替换整个配置时
- `update.run` 用于显式自我更新加重启；当重启后会话应运行一个后续对话时包含 `continuationMessage`
- `update.status` 检查最新的更新重启标记，并在重启后验证运行版本

代理应将 `config.schema.lookup` 作为精确字段级文档和约束的第一站。当它们需要更广泛的配置映射、默认值或专用子系统参考的链接时，使用[配置参考](/gateway/configuration-reference)。

<Note>
控制平面写入（`config.apply`、`config.patch`、`update.run`）每 `deviceId+clientIp` 每 60 秒限速 3 次请求。重启请求合并，然后强制执行重启周期之间 30 秒的冷却时间。`update.status` 是只读的，但受管理员范围限制，因为重启标记可以包含更新步骤摘要和命令输出尾部。
</Note>

部分补丁示例：

```bash
openclaw gateway call config.get --params '{}'  # 捕获 payload.hash
openclaw gateway call config.patch --params '{
  "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
  "baseHash": "<hash>"
}'
```

`config.apply` 和 `config.patch` 都接受 `raw`、`baseHash`、`sessionKey`、`note` 和 `restartDelayMs`。当配置已存在时，两种方法都需要 `baseHash`。

## 环境变量

OpenClaw 从父进程读取环境变量，加上：

- 当前工作目录中的 `.env`（如果存在）
- `~/.openclaw/.env`（全局回退）

两个文件都不会覆盖现有的环境变量。你也可以在配置中设置内联环境变量：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Shell 环境导入（可选）">
  如果启用且预期的键未设置，OpenClaw 运行你的登录 shell 并仅导入缺少的键：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

等效的环境变量：`OPENCLAW_LOAD_SHELL_ENV=1`
</Accordion>

<Accordion title="配置值中的环境变量替换">
  使用 `${VAR_NAME}` 在任何配置字符串值中引用环境变量：

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

规则：

- 仅匹配大写名称：`[A-Z_][A-Z0-9_]*`
- 缺少/空变量在加载时抛出错误
- 使用 `$${VAR}` 进行字面输出的转义
- 在 `$include` 文件中有效
- 内联替换：`"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="秘密引用（env、file、exec）">
  对于支持 SecretRef 对象的字段，你可以使用：

```json5
{
  models: {
    providers: {
      openai: { apiKey: { source: "env", provider: "default", id: "OPENAI_API_KEY" } },
    },
  },
  skills: {
    entries: {
      "image-lab": {
        apiKey: {
          source: "file",
          provider: "filemain",
          id: "/skills/entries/image-lab/apiKey",
        },
      },
    },
  },
  channels: {
    googlechat: {
      serviceAccountRef: {
        source: "exec",
        provider: "vault",
        id: "channels/googlechat/serviceAccount",
      },
    },
  },
}
```

SecretRef 详情（包括 `env`/`file`/`exec` 的 `secrets.providers`）在[秘密管理](/gateway/secrets)中。
支持的凭据路径在 [SecretRef 凭据接口](/reference/secretref-credential-surface) 中列出。
</Accordion>

参见[环境](/help/environment)了解完整的优先级和来源。

## 完整参考

有关完整的逐字段参考，参见**[配置参考](/gateway/configuration-reference)**。

---

_相关链接：[配置示例](/gateway/configuration-examples) · [配置参考](/gateway/configuration-reference) · [Doctor](/gateway/doctor)_

## 相关链接

- [配置参考](/gateway/configuration-reference)
- [配置示例](/gateway/configuration-examples)
- [网关运行手册](/gateway)
