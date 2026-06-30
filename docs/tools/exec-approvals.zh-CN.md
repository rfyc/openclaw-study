---
summary: "主机 exec 批准：策略旋钮、允许列表和 YOLO/严格工作流"
read_when:
  - 配置 exec 批准或允许列表
  - 在 macOS 应用中实现 exec 批准 UX
  - 审查沙箱逃逸提示及其含义
title: "Exec 批准"
sidebarTitle: "Exec 批准"
---

Exec 批准是**伴侣应用 / 节点主机防护**，用于让沙箱代理在真实主机（`gateway` 或 `node`）上运行命令。这是一个安全联锁：只有当策略 + 允许列表 + （可选的）用户批准三者都同意时，命令才被允许。Exec 批准**叠加在**工具策略和提升门控之上（除非提升被设置为 `full`，这会跳过批准）。

<Note>
有效策略是 `tools.exec.*` 和批准默认值中较**严格**的那个；如果批准字段被省略，则使用 `tools.exec` 值。主机 exec 也使用该机器上的本地批准状态——`~/.openclaw/exec-approvals.json` 中的主机本地 `ask: "always"` 会持续提示，即使会话或配置默认值请求 `ask: "on-miss"`。
</Note>

## 检查有效策略

| 命令                                                             | 显示内容                                         |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | 请求的策略、主机策略来源以及有效结果。           |
| `openclaw exec-policy show`                                      | 本地机器合并视图。                               |
| `openclaw exec-policy set` / `preset`                            | 在一步中将本地请求的策略与本地主机批准文件同步。 |

当本地范围请求 `host=node` 时，`exec-policy show` 将该范围报告为运行时由节点管理，而不是假装本地批准文件是真相的来源。

如果伴侣应用 UI **不可用**，任何通常会提示的请求都会通过**问询回退**（默认值：`deny`）解决。

<Tip>
原生聊天批准客户端可以在待处理批准消息上植入特定于频道的提示。例如，Matrix 植入反应快捷键（`✅` 允许一次，`❌` 拒绝，`♾️` 始终允许），同时仍在消息中留下 `/approve ...` 命令作为回退。
</Tip>

## 适用范围

Exec 批准在执行主机上本地执行：

- **Gateway 主机** → gateway 机器上的 `openclaw` 进程。
- **Node 主机** → 节点运行器（macOS 伴侣应用或无头节点主机）。

### 信任模型

- 经 Gateway 认证的调用者是该 Gateway 的受信任操作员。
- 配对节点将该受信任的操作员能力扩展到节点主机上。
- Exec 批准降低意外执行风险，但**不是**每用户的身份验证边界。
- 批准的节点主机运行绑定规范执行上下文：规范 cwd、精确 argv、存在时的环境绑定，以及适用时的固定可执行路径。
- 对于 shell 脚本和直接解释器/运行时文件调用，OpenClaw 还会尝试绑定一个具体的本地文件操作数。如果该绑定文件在批准后但执行前发生变化，则运行被拒绝而不是执行漂移的内容。
- 文件绑定有意是尽力而为的，**不是**每个解释器/运行时加载器路径的完整语义模型。如果批准模式无法识别出恰好一个具体的本地文件进行绑定，它拒绝创建批准支持的运行，而不是假装完全覆盖。

### macOS 分离

- **节点主机服务**通过本地 IPC 将 `system.run` 转发给 **macOS 应用**。
- **macOS 应用**在 UI 上下文中执行批准和命令。

## 设置和存储

批准存储在执行主机上的本地 JSON 文件中：

```text
~/.openclaw/exec-approvals.json
```

示例模式：

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64url-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": true,
      "allowlist": [
        {
          "id": "B0C8C0B3-2C2D-4F8A-9A3C-5A4B3C2D1E0F",
          "pattern": "~/Projects/**/bin/rg",
          "source": "allow-always",
          "commandText": "rg -n TODO",
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## 策略旋钮

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` — 阻止所有主机 exec 请求。
  - `allowlist` — 只允许已列入允许列表的命令。
  - `full` — 允许所有内容（等同于提升模式）。

</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` — 永不提示。
  - `on-miss` — 仅在允许列表不匹配时提示。
  - `always` — 对每个命令提示。当有效的问询模式为 `always` 时，`allow-always` 持久信任**不会**抑制提示。

</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  需要提示但没有 UI 可达时的解决方案。

- `deny` — 阻止。
- `allowlist` — 仅在允许列表匹配时允许。
- `full` — 允许。

</ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  当为 `true` 时，OpenClaw 将内联代码评估形式视为仅批准，即使解释器二进制文件本身已被列入允许列表。对于无法干净地映射到一个稳定文件操作数的解释器加载器的深度防御。
</ParamField>

严格模式捕获的示例：

- `python -c`
- `node -e`、`node --eval`、`node -p`
- `ruby -e`
- `perl -e`、`perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

在严格模式下，这些命令仍然需要显式批准，`allow-always` 不会自动为它们持久化新的允许列表条目。

## YOLO 模式（无批准）

如果您希望主机 exec 在没有批准提示的情况下运行，您必须打开**两个**策略层——OpenClaw 配置中请求的 exec 策略（`tools.exec.*`）**和** `~/.openclaw/exec-approvals.json` 中的主机本地批准策略。

YOLO 是默认的主机行为，除非您明确收紧它：

| 层级                  | YOLO 设置                    |
| --------------------- | ---------------------------- |
| `tools.exec.security` | `gateway`/`node` 上的 `full` |
| `tools.exec.ask`      | `off`                        |
| 主机 `askFallback`    | `full`                       |

<Warning>
**重要区别：**

- `tools.exec.host=auto` 选择 exec 运行的**位置**：有沙箱时在沙箱中，否则在 gateway 上。
- YOLO 选择主机 exec 如何**被批准**：`security=full` 加上 `ask=off`。
- 在 YOLO 模式下，OpenClaw **不会**在配置的主机 exec 策略之上额外添加启发式命令混淆批准门或脚本预检拒绝层。
- `auto` 不会使 gateway 路由成为来自沙箱会话的免费覆盖。来自 `auto` 的每次调用 `host=node` 请求是允许的；当没有活动的沙箱运行时，`host=gateway` 才从 `auto` 允许。对于稳定的非自动默认值，请显式设置 `tools.exec.host` 或使用 `/exec host=...`。

</Warning>

公开其自身非交互式权限模式的 CLI 支持的提供商可以遵循此策略。当 OpenClaw 请求的 exec 策略是 YOLO 时，Claude CLI 会添加 `--permission-mode bypassPermissions`。通过 `agents.defaults.cliBackends.claude-cli.args` / `resumeArgs` 下的显式 Claude 参数覆盖该后端行为——例如 `--permission-mode default`、`acceptEdits` 或 `bypassPermissions`。

如果您需要更保守的设置，请将任一层收紧回 `allowlist` / `on-miss` 或 `deny`。

### 持久 gateway 主机"从不提示"设置

<Steps>
  <Step title="设置请求的配置策略">
    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```
  </Step>
  <Step title="匹配主机批准文件">
    ```bash
    openclaw approvals set --stdin <<'EOF'
    {
      version: 1,
      defaults: {
        security: "full",
        ask: "off",
        askFallback: "full"
      }
    }
    EOF
    ```
  </Step>
</Steps>

### 本地快捷方式

```bash
openclaw exec-policy preset yolo
```

该本地快捷方式同时更新：

- 本地 `tools.exec.host/security/ask`。
- 本地 `~/.openclaw/exec-approvals.json` 默认值。

它有意仅限本地。要远程更改 gateway 主机或节点主机批准，请使用 `openclaw approvals set --gateway` 或 `openclaw approvals set --node <id|name|ip>`。

### 节点主机

对于节点主机，请在该节点上应用相同的批准文件：

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

<Note>
**仅本地限制：**

- `openclaw exec-policy` 不同步节点批准。
- `openclaw exec-policy set --host node` 被拒绝。
- 节点 exec 批准在运行时从节点获取，因此针对节点的更新必须使用 `openclaw approvals --node ...`。

</Note>

### 仅会话快捷方式

- `/exec security=full ask=off` 仅更改当前会话。
- `/elevated full` 是一个紧急快捷方式，也会跳过该会话的 exec 批准。

如果主机批准文件比配置更严格，则更严格的主机策略仍然优先。

## 允许列表（每代理）

允许列表是**每代理**的。如果存在多个代理，请在 macOS 应用中切换您正在编辑的代理。模式是 glob 匹配。

模式可以是解析的二进制路径 glob 或裸命令名 glob。裸名称只匹配通过 `PATH` 调用的命令，因此当命令是 `rg` 时，`rg` 可以匹配 `/opt/homebrew/bin/rg`，但**不**匹配 `./rg` 或 `/tmp/rg`。当您想信任一个特定的二进制位置时，请使用路径 glob。

旧版 `agents.default` 条目在加载时会迁移到 `agents.main`。Shell 链（如 `echo ok && pwd`）仍然需要每个顶级段都满足允许列表规则。

示例：

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每个允许列表条目跟踪：

| 字段               | 含义                    |
| ------------------ | ----------------------- |
| `id`               | 用于 UI 标识的稳定 UUID |
| `lastUsedAt`       | 最后使用的时间戳        |
| `lastUsedCommand`  | 最后匹配的命令          |
| `lastResolvedPath` | 最后解析的二进制路径    |

## 自动允许技能 CLI

当启用**自动允许技能 CLI** 时，已知技能引用的可执行文件在节点上（macOS 节点或无头节点主机）被视为已列入允许列表。这使用 Gateway RPC 上的 `skills.bins` 来获取技能 bin 列表。如果您需要严格的手动允许列表，请禁用此功能。

<Warning>
- 这是一个**隐式便利允许列表**，与手动路径允许列表条目分开。
- 它适用于 Gateway 和节点在同一信任边界内的受信任操作员环境。
- 如果您需要严格的显式信任，请保持 `autoAllowSkills: false` 并仅使用手动路径允许列表条目。

</Warning>

## 安全 bins 和批准转发

有关安全 bins（仅 stdin 快速路径）、解释器绑定详细信息，以及如何将批准提示转发到 Slack/Discord/Telegram（或将其作为原生批准客户端运行），请参阅 [Exec 批准 — 高级](/tools/exec-approvals-advanced)。

## Control UI 编辑

使用 **Control UI → 节点 → Exec 批准**卡来编辑默认值、每代理覆盖和允许列表。选择范围（默认值或代理），调整策略，添加/删除允许列表模式，然后**保存**。UI 按模式显示最后使用的元数据，以便您保持列表整洁。

目标选择器选择 **Gateway**（本地批准）或**节点**。节点必须宣传 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。如果节点尚未宣传 exec 批准，请直接编辑其本地 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支持 gateway 或节点编辑——参见 [批准 CLI](/cli/approvals)。

## 批准流程

当需要提示时，gateway 会将 `exec.approval.requested` 广播到操作员客户端。Control UI 和 macOS 应用通过 `exec.approval.resolve` 解决它，然后 gateway 将批准的请求转发到节点主机。

对于 `host=node`，批准请求包括规范的 `systemRunPlan` 有效载荷。gateway 在转发批准的 `system.run` 请求时使用该计划作为权威的命令/cwd/会话上下文。

这对异步批准延迟很重要：

- 节点 exec 路径预先准备一个规范计划。
- 批准记录存储该计划及其绑定元数据。
- 批准后，最终转发的 `system.run` 调用重用存储的计划，而不是信任后续调用者的编辑。
- 如果调用者在批准请求创建后更改了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，gateway 会将转发的运行拒绝为批准不匹配。

## 系统事件

Exec 生命周期作为系统消息呈现：

- `Exec running`（仅在命令超过运行通知阈值时）。
- `Exec finished`。
- `Exec denied`。

这些在节点报告事件后发布到代理的会话。当命令完成时（以及在超过阈值运行时可选地），gateway 主机 exec 批准发出相同的生命周期事件。批准门控的 exec 将批准 id 重用为这些消息中的 `runId`，以便于关联。

## 被拒绝的批准行为

当异步 exec 批准被拒绝时，OpenClaw 阻止代理重用会话中同一命令的任何早期运行的输出。拒绝原因会传递明确的指导，说明没有命令输出可用，这会阻止代理声称有新输出或使用之前成功运行的陈旧结果重复被拒绝的命令。

## 影响

- **`full`** 功能强大；尽可能优先使用允许列表。
- **`ask`** 让您保持在循环中，同时仍然允许快速批准。
- 每代理允许列表防止一个代理的批准泄漏到其他代理。
- 批准只适用于来自**授权发送者**的主机 exec 请求。未授权的发送者无法发出 `/exec`。
- `/exec security=full` 是授权操作员的会话级便利功能，并按设计跳过批准。要硬性阻止主机 exec，请通过工具策略拒绝它（`tools.deny: ["exec"]` 或每代理）。除非您显式设置 `security=full` 和 `ask=off`，否则主机批准仍然适用。

## 相关

<CardGroup cols={2}>
  <Card title="Exec 批准 — 高级" href="/tools/exec-approvals-advanced" icon="gear">
    安全 bins、解释器绑定和批准转发到聊天。
  </Card>
  <Card title="Exec 工具" href="/tools/exec" icon="terminal">
    Shell 命令执行工具。
  </Card>
  <Card title="提升模式" href="/tools/elevated" icon="shield-exclamation">
    也跳过批准的紧急路径。
  </Card>
  <Card title="沙箱" href="/gateway/sandboxing" icon="box">
    沙箱模式和工作区访问。
  </Card>
  <Card title="安全" href="/gateway/security" icon="lock">
    安全模型和加固。
  </Card>
  <Card title="沙箱 vs 工具策略 vs 提升" href="/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    何时使用每种控制。
  </Card>
  <Card title="技能" href="/tools/skills" icon="sparkles">
    技能支持的自动允许行为。
  </Card>
</CardGroup>
