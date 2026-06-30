---
summary: "Exec 工具使用、stdin 模式和 TTY 支持"
read_when:
  - 使用或修改 exec 工具
  - 调试 stdin 或 TTY 行为
title: "Exec 工具"
---

在工作区中运行 shell 命令。通过 `process` 支持前台 + 后台执行。如果 `process` 被禁止，`exec` 将同步运行并忽略 `yieldMs`/`background`。后台会话按代理范围界定；`process` 只看到来自同一代理的会话。

## 参数

<ParamField path="command" type="string" required>
要运行的 Shell 命令。
</ParamField>

<ParamField path="workdir" type="string" default="cwd">
命令的工作目录。
</ParamField>

<ParamField path="env" type="object">
合并到继承环境之上的键/值环境覆盖。
</ParamField>

<ParamField path="yieldMs" type="number" default="10000">
在此延迟（ms）后自动将命令转为后台运行。
</ParamField>

<ParamField path="background" type="boolean" default="false">
立即将命令转为后台运行，而不是等待 `yieldMs`。
</ParamField>

<ParamField path="timeout" type="number" default="tools.exec.timeoutSec">
覆盖此次调用的配置 exec 超时。仅当命令应在没有 exec 进程超时的情况下运行时，才设置 `timeout: 0`。
</ParamField>

<ParamField path="pty" type="boolean" default="false">
在可用时在伪终端中运行。用于仅 TTY 的 CLI、编码代理和终端 UI。
</ParamField>

<ParamField path="host" type="'auto' | 'sandbox' | 'gateway' | 'node'" default="auto">
执行位置。当沙箱运行时处于活动状态时，`auto` 解析为 `sandbox`，否则解析为 `gateway`。
</ParamField>

<ParamField path="security" type="'deny' | 'allowlist' | 'full'">
`gateway` / `node` 执行的强制模式。
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
`gateway` / `node` 执行的批准提示行为。
</ParamField>

<ParamField path="node" type="string">
`host=node` 时的节点 id/名称。
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
请求提升模式——从沙箱逃逸到配置的主机路径。仅当提升解析为 `full` 时才强制 `security=full`。
</ParamField>

注意：

- `host` 默认为 `auto`：当沙箱运行时对该会话处于活动状态时为沙箱，否则为 gateway。
- `host` 只接受 `auto`、`sandbox`、`gateway` 或 `node`。它不是主机名选择器；类似主机名的值在命令运行前被拒绝。
- `auto` 是默认路由策略，不是通配符。来自 `auto` 的每次调用 `host=node` 是允许的；仅当没有沙箱运行时处于活动状态时，每次调用 `host=gateway` 才被允许。
- 无需额外配置，`host=auto` 仍然"直接工作"：没有沙箱意味着它解析为 `gateway`；活动的沙箱意味着它保持在沙箱中。
- `elevated` 将沙箱逃逸到配置的主机路径：默认为 `gateway`，或当 `tools.exec.host=node`（或会话默认值为 `host=node`）时为 `node`。仅当为当前会话/提供商启用了提升访问时才可用。
- `gateway`/`node` 批准由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要配对节点（伴侣应用或无头节点主机）。
- 如果有多个节点可用，请设置 `exec.node` 或 `tools.exec.node` 来选择一个。
- `exec host=node` 是节点唯一的 shell 执行路径；旧版 `nodes.run` 包装器已被移除。
- `timeout` 适用于前台、后台、`yieldMs`、gateway、沙箱和节点 `system.run` 执行。如果省略，OpenClaw 使用 `tools.exec.timeoutSec`；显式 `timeout: 0` 禁用该次调用的 exec 进程超时。
- 在非 Windows 主机上，exec 使用设置时的 `SHELL`；如果 `SHELL` 是 `fish`，它优先从 `PATH` 中选择 `bash`（或 `sh`）以避免 fish 不兼容的脚本，如果两者都不存在则回退到 `SHELL`。
- 在 Windows 主机上，exec 优先发现 PowerShell 7（`pwsh`）（Program Files、ProgramW6432，然后是 PATH），然后回退到 Windows PowerShell 5.1。
- 主机执行（`gateway`/`node`）拒绝 `env.PATH` 和加载器覆盖（`LD_*`/`DYLD_*`）以防止二进制劫持或注入代码。
- OpenClaw 在派生的命令环境中设置 `OPENCLAW_SHELL=exec`（包括 PTY 和沙箱执行），以便 shell/profile 规则可以检测 exec 工具上下文。
- `openclaw channels login` 被 `exec` 阻止，因为它是一个交互式频道认证流程；请在 gateway 主机上的终端中运行它，或在聊天中存在时使用特定于频道的原生登录工具。
- 重要：沙箱**默认是关闭的**。如果沙箱关闭，隐式的 `host=auto` 解析为 `gateway`。显式 `host=sandbox` 仍然以失败关闭而不是静默在 gateway 主机上运行。启用沙箱或使用带有批准的 `host=gateway`。
- 脚本预检（针对常见的 Python/Node shell 语法错误）仅检查有效 `workdir` 边界内的文件。如果脚本路径解析到 `workdir` 之外，则跳过该文件的预检。
- 对于现在开始的长时间运行工作，启动一次并在启用自动完成唤醒且命令发出输出或失败时依赖自动完成唤醒。使用 `process` 查看日志、状态、输入或干预；不要用睡眠循环、超时循环或重复轮询来模拟调度。
- 对于应该稍后或按计划发生的工作，使用 cron 而不是 `exec` 睡眠/延迟模式。

## 配置

- `tools.exec.notifyOnExit`（默认：true）：当为 true 时，后台化的 exec 会话在退出时排队一个系统事件并请求心跳。
- `tools.exec.approvalRunningNoticeMs`（默认：10000）：当批准门控的 exec 运行时间超过此时间（0 禁用）时发出单个"正在运行"通知。
- `tools.exec.timeoutSec`（默认：1800）：默认每命令 exec 超时（秒）。每次调用的 `timeout` 覆盖它；每次调用的 `timeout: 0` 禁用该次调用的 exec 进程超时。
- `tools.exec.host`（默认：`auto`；当沙箱运行时处于活动状态时解析为 `sandbox`，否则解析为 `gateway`）
- `tools.exec.security`（默认：沙箱为 `deny`，gateway + node 未设置时为 `full`）
- `tools.exec.ask`（默认：`off`）
- 无批准的主机 exec 是 gateway + node 的默认值。如果您需要批准/允许列表行为，请同时收紧 `tools.exec.*` 和主机 `~/.openclaw/exec-approvals.json`；参见 [Exec 批准](/tools/exec-approvals#yolo-mode-no-approval)。
- YOLO 来自主机策略默认值（`security=full`、`ask=off`），而不是来自 `host=auto`。如果您想强制 gateway 或节点路由，请设置 `tools.exec.host` 或使用 `/exec host=...`。
- 在 `security=full` 加 `ask=off` 模式下，主机 exec 直接遵循配置的策略；没有额外的启发式命令混淆预过滤器或脚本预检拒绝层。
- `tools.exec.node`（默认：未设置）
- `tools.exec.strictInlineEval`（默认：false）：当为 true 时，内联解释器 eval 形式（如 `python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e` 和 `osascript -e`）始终需要显式批准。`allow-always` 仍然可以持久化良性的解释器/脚本调用，但内联 eval 形式每次仍会提示。
- `tools.exec.pathPrepend`：要预置到 exec 运行（仅 gateway + 沙箱）的 `PATH` 的目录列表。
- `tools.exec.safeBins`：可以在没有显式允许列表条目的情况下运行的仅 stdin 安全二进制文件。有关行为详细信息，参见 [安全 bins](/tools/exec-approvals-advanced#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`：为 `safeBins` 路径检查显式受信任的额外目录。`PATH` 条目永远不会被自动信任。内置默认值是 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`：每个安全 bin 的可选自定义 argv 策略（`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`）。

示例：

```json5
{
  tools: {
    exec: {
      pathPrepend: ["~/bin", "/opt/oss/bin"],
    },
  },
}
```

### PATH 处理

- `host=gateway`：将您的登录 shell `PATH` 合并到 exec 环境中。`env.PATH` 覆盖对于主机执行被拒绝。守护进程本身仍然以最小 `PATH` 运行：
  - macOS：`/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`
  - Linux：`/usr/local/bin`、`/usr/bin`、`/bin`
- `host=sandbox`：在容器内运行 `sh -lc`（登录 shell），因此 `/etc/profile` 可能会重置 `PATH`。OpenClaw 通过内部环境变量（无 shell 插值）在 profile 来源后预置 `env.PATH`；`tools.exec.pathPrepend` 也在此处适用。
- `host=node`：只有您传递的非阻止环境覆盖会发送到节点。`env.PATH` 覆盖对于主机执行被拒绝，节点主机会忽略它们。如果您在节点上需要额外的 PATH 条目，请配置节点主机服务环境（systemd/launchd）或将工具安装在标准位置。

每代理节点绑定（在配置中使用代理列表索引）：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

Control UI：节点选项卡包含相同设置的小型"Exec 节点绑定"面板。

## 会话覆盖（`/exec`）

使用 `/exec` 为 `host`、`security`、`ask` 和 `node` 设置**每会话**默认值。发送不带参数的 `/exec` 以显示当前值。

示例：

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## 授权模型

`/exec` 仅对**授权发送者**（频道允许列表/配对加上 `commands.useAccessGroups`）生效。它仅更新**会话状态**，不写入配置。要硬性禁用 exec，请通过工具策略拒绝它（`tools.deny: ["exec"]` 或每代理）。除非您显式设置 `security=full` 和 `ask=off`，否则主机批准仍然适用。

## Exec 批准（伴侣应用 / 节点主机）

沙箱代理可能需要在 `exec` 在 gateway 或节点主机上运行之前进行每次请求的批准。有关策略、允许列表和 UI 流程，请参阅 [Exec 批准](/tools/exec-approvals)。

当需要批准时，exec 工具立即返回 `status: "approval-pending"` 和批准 id。一旦批准（或拒绝/超时），Gateway 会发出系统事件（`Exec finished` / `Exec denied`）。如果命令在 `tools.exec.approvalRunningNoticeMs` 后仍在运行，则发出单个 `Exec running` 通知。在具有原生批准卡/按钮的频道上，代理应首先依赖该原生 UI，仅当工具结果明确表示聊天批准不可用或手动批准是唯一路径时才包含手动 `/approve` 命令。

## 允许列表 + 安全 bins

手动允许列表执行匹配解析的二进制路径 glob 和裸命令名 glob。裸名称只匹配通过 PATH 调用的命令，因此当命令是 `rg` 时，`rg` 可以匹配 `/opt/homebrew/bin/rg`，但不匹配 `./rg` 或 `/tmp/rg`。当 `security=allowlist` 时，只有每个管道段都已列入允许列表或是安全 bin 时，shell 命令才自动被允许。链接（`;`、`&&`、`||`）和重定向在允许列表模式下被拒绝，除非每个顶级段都满足允许列表（包括安全 bins）。重定向仍不受支持。持久的 `allow-always` 信任不会绕过该规则：链接命令仍然需要每个顶级段都匹配。

`autoAllowSkills` 是 exec 批准中的一个单独便利路径。它与手动路径允许列表条目不同。对于严格的显式信任，请保持 `autoAllowSkills` 禁用。

对两个控制使用不同的用途：

- `tools.exec.safeBins`：小型、仅 stdin 的流过滤器。
- `tools.exec.safeBinTrustedDirs`：安全 bin 可执行文件路径的显式额外受信任目录。
- `tools.exec.safeBinProfiles`：自定义安全 bins 的显式 argv 策略。
- 允许列表：可执行文件路径的显式信任。

不要将 `safeBins` 视为通用允许列表，也不要添加解释器/运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`）。如果您需要这些，请使用显式允许列表条目并保持批准提示启用。当解释器/运行时 `safeBins` 条目缺少显式配置文件时，`openclaw security audit` 会发出警告，`openclaw doctor --fix` 可以脚手架缺少的自定义 `safeBinProfiles` 条目。当您将 `jq` 等具有广泛行为的 bin 明确添加回 `safeBins` 时，`openclaw security audit` 和 `openclaw doctor` 也会发出警告。如果您明确将解释器列入允许列表，请启用 `tools.exec.strictInlineEval`，以便内联代码 eval 形式仍然需要新的批准。

有关完整的策略详细信息和示例，请参阅 [Exec 批准](/tools/exec-approvals-advanced#safe-bins-stdin-only) 和 [安全 bins 与允许列表对比](/tools/exec-approvals-advanced#safe-bins-versus-allowlist)。

## 示例

前台：

```json
{ "tool": "exec", "command": "ls -la" }
```

后台 + 轮询：

```json
{"tool":"exec","command":"npm run build","yieldMs":1000}
{"tool":"process","action":"poll","sessionId":"<id>"}
```

轮询用于按需状态，而非等待循环。如果启用了自动完成唤醒，命令在发出输出或失败时可以唤醒会话。

发送按键（tmux 风格）：

```json
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Enter"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["C-c"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Up","Up","Enter"]}
```

提交（仅发送 CR）：

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

粘贴（默认为括号模式）：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch

`apply_patch` 是 `exec` 的子工具，用于结构化多文件编辑。默认情况下为 OpenAI 和 OpenAI Codex 模型启用。仅当您想禁用它或将其限制为特定模型时才使用配置：

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.5"] },
    },
  },
}
```

注意：

- 仅适用于 OpenAI/OpenAI Codex 模型。
- 工具策略仍然适用；`allow: ["write"]` 隐式允许 `apply_patch`。
- `deny: ["write"]` 不拒绝 `apply_patch`；当补丁写入也应该被阻止时，请显式拒绝 `apply_patch` 或使用 `deny: ["group:fs"]`。
- 配置在 `tools.exec.applyPatch` 下。
- `tools.exec.applyPatch.enabled` 默认为 `true`；将其设置为 `false` 以禁用 OpenAI 模型的该工具。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（仅限工作区）。仅当您有意希望 `apply_patch` 在工作区目录之外写入/删除时，才将其设置为 `false`。

## 相关

- [Exec 批准](/tools/exec-approvals) — shell 命令的批准门
- [沙箱](/gateway/sandboxing) — 在沙箱环境中运行命令
- [后台进程](/gateway/background-process) — 长时间运行的 exec 和进程工具
- [安全](/gateway/security) — 工具策略和提升访问
