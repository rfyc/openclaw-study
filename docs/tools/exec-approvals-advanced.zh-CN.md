---
summary: "高级 exec 批准：安全 bins、解释器绑定、批准转发、原生传递"
read_when:
  - 配置安全 bins 或自定义安全 bin 配置文件
  - 将批准转发到 Slack/Discord/Telegram 或其他聊天频道
  - 为频道实现原生批准客户端
title: "Exec 批准 — 高级"
---

高级 exec 批准主题：`safeBins` 快速路径、解释器/运行时绑定，以及将批准转发到聊天频道（包括原生传递）。有关核心策略和批准流程，请参阅 [Exec 批准](/tools/exec-approvals)。

## 安全 bins（仅 stdin）

`tools.exec.safeBins` 定义了一小组**仅 stdin** 的二进制文件（例如 `cut`），这些文件可以在允许列表模式下运行，**无需**显式的允许列表条目。安全 bins 拒绝位置文件参数和路径类标记，因此它们只能对传入流进行操作。将其视为流过滤器的狭义快速路径，而非通用信任列表。

<Warning>
**不要**将解释器或运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）添加到 `safeBins`。如果命令可以评估代码、执行子命令或按设计读取文件，请优先使用显式允许列表条目并保持批准提示启用状态。自定义安全 bins 必须在 `tools.exec.safeBinProfiles.<bin>` 中定义明确的配置文件。
</Warning>

默认安全 bins：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在默认列表中。如果您选择加入，请为其非 stdin 工作流保留显式允许列表条目。对于安全 bin 模式下的 `grep`，请使用 `-e`/`--regexp` 提供模式；位置模式形式被拒绝，因此文件操作数不能以模糊位置参数的形式被夹带。

### Argv 验证和被拒绝的标志

验证仅基于 argv 形状（无主机文件系统存在性检查），这可防止允许/拒绝差异导致文件存在 oracle 行为。默认安全 bins 拒绝面向文件的选项；长选项以失败关闭方式验证（未知标志和模糊缩写被拒绝）。

按安全 bin 配置文件列出的被拒绝标志：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`: `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

安全 bins 还强制在执行时将 argv 标记视为**字面量文本**（仅 stdin 段无 glob 扩展和 `$VARS` 扩展），因此像 `*` 或 `$HOME/...` 这样的模式不能用于夹带文件读取。

### 受信任的二进制目录

安全 bins 必须从受信任的二进制目录（系统默认值加上可选的 `tools.exec.safeBinTrustedDirs`）解析。`PATH` 条目永远不会被自动信任。默认受信任目录有意保持最小：`/bin`、`/usr/bin`。如果您的安全 bin 可执行文件位于包管理器/用户路径中（例如 `/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），请将它们明确添加到 `tools.exec.safeBinTrustedDirs`。

### Shell 链接、包装器和多路复用器

当每个顶级段都满足允许列表（包括安全 bins 或技能自动允许）时，Shell 链接（`&&`、`||`、`;`）被允许。重定向在允许列表模式下仍不受支持。在允许列表解析期间，命令替换（`$()` / 反引号）被拒绝，包括在双引号内；如果需要字面 `$()` 文本，请使用单引号。

在 macOS 伴侣应用批准上，包含 shell 控制或扩展语法（`&&`、`||`、`;`、`|`、`` ` ``、`$`、`<`、`>`、`(`、`)`）的原始 shell 文本被视为允许列表未命中，除非 shell 二进制文件本身已被允许列表。

对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围内的环境覆盖被简化为一个小的显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。

对于允许列表模式下的 `allow-always` 决策，已知的调度包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）将内部可执行路径而非包装器路径持久化。Shell 多路复用器（`busybox`、`toybox`）对 shell 小程序（`sh`、`ash` 等）以相同方式展开。如果包装器或多路复用器无法安全展开，则不会自动持久化允许列表条目。

如果您将像 `python3` 或 `node` 这样的解释器列入允许列表，请优先使用 `tools.exec.strictInlineEval=true`，这样内联 eval 仍然需要显式批准。在严格模式下，`allow-always` 仍然可以持久化良性的解释器/脚本调用，但内联 eval 载体不会自动持久化。

### 安全 bins 与允许列表对比

| 主题     | `tools.exec.safeBins`                 | 允许列表（`exec-approvals.json`）                          |
| -------- | ------------------------------------- | ---------------------------------------------------------- |
| 目标     | 自动允许狭义 stdin 过滤器             | 显式信任特定可执行文件                                     |
| 匹配类型 | 可执行文件名 + 安全 bin argv 策略     | 解析的可执行文件路径 glob，或 PATH 调用命令的裸命令名 glob |
| 参数范围 | 受安全 bin 配置文件和字面标记规则限制 | 仅路径匹配；参数否则是您的责任                             |
| 典型示例 | `head`、`tail`、`tr`、`wc`            | `jq`、`python3`、`node`、`ffmpeg`、自定义 CLI              |
| 最佳用途 | 管道中的低风险文本转换                | 任何具有更广泛行为或副作用的工具                           |

配置位置：

- `safeBins` 来自配置（`tools.exec.safeBins` 或每代理 `agents.list[].tools.exec.safeBins`）。
- `safeBinTrustedDirs` 来自配置（`tools.exec.safeBinTrustedDirs` 或每代理 `agents.list[].tools.exec.safeBinTrustedDirs`）。
- `safeBinProfiles` 来自配置（`tools.exec.safeBinProfiles` 或每代理 `agents.list[].tools.exec.safeBinProfiles`）。每代理配置文件键覆盖全局键。
- 允许列表条目位于主机本地 `~/.openclaw/exec-approvals.json` 的 `agents.<id>.allowlist` 下（或通过 Control UI / `openclaw approvals allowlist ...`）。
- 当解释器/运行时 bins 出现在没有显式配置文件的 `safeBins` 中时，`openclaw security audit` 会以 `tools.exec.safe_bins_interpreter_unprofiled` 发出警告。
- `openclaw doctor --fix` 可以将缺失的自定义 `safeBinProfiles.<bin>` 条目脚手架为 `{}`（之后查看并收紧）。解释器/运行时 bins 不会自动脚手架。

自定义配置文件示例：

```json5
{
  tools: {
    exec: {
      safeBins: ["jq", "myfilter"],
      safeBinProfiles: {
        myfilter: {
          minPositional: 0,
          maxPositional: 0,
          allowedValueFlags: ["-n", "--limit"],
          deniedFlags: ["-f", "--file", "-c", "--command"],
        },
      },
    },
  },
}
```

如果您将 `jq` 明确加入 `safeBins`，OpenClaw 仍会拒绝安全 bin 模式下的 `env` 内置，因此 `jq -n env` 无法在没有显式允许列表路径或批准提示的情况下转储主机进程环境。

## 解释器/运行时命令

批准支持的解释器/运行时运行有意保守：

- 精确的 argv/cwd/env 上下文始终被绑定。
- 直接 shell 脚本和直接运行时文件形式会尽力绑定到一个具体的本地文件快照。
- 仍然解析为一个直接本地文件的常见包管理器包装器形式（例如 `pnpm exec`、`pnpm node`、`npm exec`、`npx`）在绑定之前会被展开。
- 如果 OpenClaw 无法为解释器/运行时命令标识出恰好一个具体的本地文件（例如包脚本、eval 形式、特定于运行时的加载器链或模糊的多文件形式），批准支持的执行将被拒绝，而不是声称其没有的语义覆盖。
- 对于这些工作流，优先使用沙箱、单独的主机边界，或操作员接受更广泛运行时语义的显式受信任允许列表/完整工作流。

当需要批准时，exec 工具立即返回批准 id。使用该 id 关联后续系统事件（`Exec finished` / `Exec denied`）。如果在超时之前没有决定到达，则该请求被视为批准超时并作为拒绝原因呈现。

### 跟进传递行为

在批准的异步 exec 完成后，OpenClaw 向同一会话发送跟进 `agent` 轮。

- 如果存在有效的外部传递目标（可传递的频道加目标 `to`），跟进传递将使用该频道。
- 在仅 webchat 或没有外部目标的内部会话流中，跟进传递保持仅会话（`deliver: false`）。
- 如果调用者明确请求严格外部传递但没有可解析的外部频道，则请求失败并显示 `INVALID_REQUEST`。
- 如果 `bestEffortDeliver` 已启用且无法解析外部频道，则传递降级为仅会话而不是失败。

## 将批准转发到聊天频道

您可以将 exec 批准提示转发到任何聊天频道（包括插件频道），并使用 `/approve` 批准它们。这使用正常的出站传递管道。

配置：

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session", // "session" | "targets" | "both"
      agentFilter: ["main"],
      sessionFilter: ["discord"], // 子字符串或正则表达式
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

在聊天中回复：

```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

`/approve` 命令同时处理 exec 批准和插件批准。如果 ID 不匹配待处理的 exec 批准，它会自动检查插件批准。

### 插件批准转发

插件批准转发使用与 exec 批准相同的传递管道，但在 `approvals.plugin` 下有其自己的独立配置。启用或禁用其中一个不会影响另一个。

```json5
{
  approvals: {
    plugin: {
      enabled: true,
      mode: "targets",
      agentFilter: ["main"],
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

配置形状与 `approvals.exec` 相同：`enabled`、`mode`、`agentFilter`、`sessionFilter` 和 `targets` 的工作方式相同。

支持共享交互式回复的频道为 exec 和插件批准都呈现相同的批准按钮。没有共享交互式 UI 的频道会退回到带有 `/approve` 指令的纯文本。

### 任何频道上的同聊天批准

当 exec 或插件批准请求来自可传递的聊天界面时，同一聊天现在可以默认使用 `/approve` 批准它。除了现有的 Web UI 和终端 UI 流程之外，这还适用于 Slack、Matrix 和 Microsoft Teams 等频道。

此共享文本命令路径使用该对话的正常频道身份验证模型。如果原始聊天已经可以发送命令并接收回复，批准请求不再需要单独的原生传递适配器才能保持待处理状态。

Discord 和 Telegram 也支持同聊天 `/approve`，但即使原生批准传递被禁用，这些频道仍使用其解析的批准者列表进行授权。

对于直接调用 Gateway 的 Telegram 和其他原生批准客户端，此回退有意限制为"未找到批准"失败。真正的 exec 批准拒绝/错误不会静默重试为插件批准。

### 原生批准传递

某些频道也可以充当原生批准客户端。原生客户端在共享的同聊天 `/approve` 流程之上添加批准者 DM、原始聊天扇出和特定于频道的交互式批准 UX。

当原生批准卡/按钮可用时，该原生 UI 是主要的面向代理的路径。代理不应该同时回显重复的纯聊天 `/approve` 命令，除非工具结果说聊天批准不可用或手动批准是唯一剩余的路径。

如果配置了原生批准客户端但原始频道没有活动的原生运行时，OpenClaw 保持本地确定性的 `/approve` 提示可见。如果原生运行时处于活动状态并尝试传递但没有目标接收到卡片，OpenClaw 会发送一个同聊天回退通知，其中包含精确的 `/approve <id> <decision>` 命令，以便请求仍然可以解决。

通用模型：

- 主机 exec 策略仍然决定是否需要 exec 批准
- `approvals.exec` 控制将批准提示转发到其他聊天目标
- `channels.<channel>.execApprovals` 控制该频道是否充当原生批准客户端

当以下所有条件为真时，原生批准客户端自动启用 DM 优先传递：

- 该频道支持原生批准传递
- 批准者可以从显式 `execApprovals.approvers` 或所有者身份（如 `commands.ownerAllowFrom`）解析
- `channels.<channel>.execApprovals.enabled` 未设置或为 `"auto"`

将 `enabled: false` 设置为明确禁用原生批准客户端。当批准者解析时，将 `enabled: true` 设置为强制启用。公开的原始聊天传递通过 `channels.<channel>.execApprovals.target` 保持明确。

FAQ：[为什么聊天批准有两个 exec 批准配置？](/help/faq-first-run#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord：`channels.discord.execApprovals.*`
- Slack：`channels.slack.execApprovals.*`
- Telegram：`channels.telegram.execApprovals.*`

这些原生批准客户端在共享的同聊天 `/approve` 流程和共享批准按钮之上添加 DM 路由和可选的频道扇出。

共享行为：

- Slack、Matrix、Microsoft Teams 和类似的可传递聊天使用正常频道身份验证模型进行同聊天 `/approve`
- 当原生批准客户端自动启用时，默认原生传递目标是批准者 DM
- 对于 Discord 和 Telegram，只有已解析的批准者才能批准或拒绝
- Discord 批准者可以是显式的（`execApprovals.approvers`）或从 `commands.ownerAllowFrom` 推断
- Telegram 批准者可以是显式的（`execApprovals.approvers`）或从 `commands.ownerAllowFrom` 推断
- Slack 批准者可以是显式的（`execApprovals.approvers`）或从 `commands.ownerAllowFrom` 推断
- Slack 原生按钮保留批准 id 类型，因此 `plugin:` id 可以解析插件批准，无需第二个 Slack 本地回退层
- Matrix 原生 DM/频道路由和反应快捷方式同时处理 exec 和插件批准；插件授权仍然来自 `channels.matrix.dm.allowFrom`
- Matrix 原生提示在第一个提示事件上包含 `com.openclaw.approval` 自定义事件内容，因此 OpenClaw 感知的 Matrix 客户端可以读取结构化批准状态，而普通客户端保持纯文本 `/approve` 回退
- 请求者不需要是批准者
- 当该聊天已经支持命令和回复时，原始聊天可以直接使用 `/approve` 批准
- 原生 Discord 批准按钮按批准 id 类型路由：`plugin:` id 直接进入插件批准，其他所有内容进入 exec 批准
- 原生 Telegram 批准按钮遵循与 `/approve` 相同的有界 exec 到插件回退
- 当原生 `target` 启用原始聊天传递时，批准提示包含命令文本
- 待处理的 exec 批准默认在 30 分钟后过期
- 如果没有操作员 UI 或配置的批准客户端可以接受请求，提示将回退到 `askFallback`

敏感的仅所有者群组命令（如 `/diagnostics` 和 `/export-trajectory`）使用私人所有者路由进行批准提示和最终结果。OpenClaw 首先在所有者运行命令的同一界面上尝试私人路由。如果该界面没有私人所有者路由，它将回退到来自 `commands.ownerAllowFrom` 的第一个可用所有者路由，因此 Discord 群组命令仍然可以在 Telegram 是配置的主要私人界面时将批准和结果发送到所有者的 Telegram DM。群组聊天只会收到简短的确认。

Telegram 默认为批准者 DM（`target: "dm"`）。当您希望批准提示也出现在原始 Telegram 聊天/话题中时，可以切换到 `channel` 或 `both`。对于 Telegram 论坛话题，OpenClaw 保留批准提示和批准后跟进的话题。

参见：

- [Discord](/channels/discord)
- [Telegram](/channels/telegram)

### macOS IPC 流

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全说明：

- Unix socket 模式 `0600`，令牌存储在 `exec-approvals.json` 中。
- 同 UID 对等检查。
- 挑战/响应（nonce + HMAC token + 请求哈希）+ 短 TTL。

## 相关

- [Exec 批准](/tools/exec-approvals) — 核心策略和批准流程
- [Exec 工具](/tools/exec)
- [提升模式](/tools/elevated)
- [技能](/tools/skills) — 技能支持的自动允许行为
