---
summary: "工具被阻止的原因：沙盒运行时、工具允许/拒绝策略和提升的 exec 关卡"
title: 沙盒 vs 工具策略 vs 提升权限
read_when: "你遇到'sandbox jail'或看到工具/提升拒绝，想知道要更改的确切配置键。"
status: active
---

OpenClaw 有三个相关（但不同）的控制：

1. **沙盒**（`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`）决定**工具在哪里运行**（沙盒后端 vs 主机）。
2. **工具策略**（`tools.*`、`tools.sandbox.tools.*`、`agents.list[].tools.*`）决定**哪些工具可用/被允许**。
3. **提升权限**（`tools.elevated.*`、`agents.list[].tools.elevated.*`）是一个**仅限 exec 的逃生舱口**，在你处于沙盒模式时在沙盒外运行（默认为 `gateway`，或者当 exec 目标配置为 `node` 时为 `node`）。

## 快速调试

使用检查器查看 OpenClaw *实际*在做什么：

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

它打印：

- 有效的沙盒模式/范围/工作区访问
- 会话当前是否处于沙盒中（主会话 vs 非主会话）
- 有效的沙盒工具允许/拒绝（以及它是来自代理/全局/默认）
- 提升关卡和修复键路径

## 沙盒：工具在哪里运行

沙盒由 `agents.defaults.sandbox.mode` 控制：

- `"off"`：所有内容在主机上运行。
- `"non-main"`：只有非主会话被沙盒化（常见的群组/渠道"惊喜"）。
- `"all"`：所有内容都被沙盒化。

完整矩阵（范围、工作区挂载、镜像）参见[沙盒](/gateway/sandboxing)。

### 绑定挂载（安全快速检查）

- `docker.binds` *穿透*沙盒文件系统：你挂载的任何内容都以你设置的模式（`:ro` 或 `:rw`）在容器内可见。
- 如果省略模式，默认是读写；对于源代码/密钥优先使用 `:ro`。
- `scope: "shared"` 忽略每代理绑定（只应用全局绑定）。
- OpenClaw 对绑定源进行两次验证：首先在规范化的源路径上，然后在通过最深现有祖先解析后再次验证。符号链接父目录逃逸不会绕过被阻止路径或允许的根检查。
- 不存在的叶路径仍然安全检查。如果 `/workspace/alias-out/new-file` 通过符号链接的父目录解析到被阻止的路径或配置允许根之外，绑定被拒绝。
- 绑定 `/var/run/docker.sock` 实际上将主机控制权交给了沙盒；只有在有意时才这样做。
- 工作区访问（`workspaceAccess: "ro"`/`"rw"`）独立于绑定模式。

## 工具策略：哪些工具存在/可调用

两层很重要：

- **工具配置文件**：`tools.profile` 和 `agents.list[].tools.profile`（基本允许列表）
- **提供商工具配置文件**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **全局/每代理工具策略**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **提供商工具策略**：`tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙盒工具策略**（仅在沙盒时应用）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

经验法则：

- `deny` 始终优先。
- 如果 `allow` 非空，其他所有内容都被视为已阻止。
- 工具策略是硬停止：`/exec` 不能覆盖被拒绝的 `exec` 工具。
- `/exec` 只为授权发送者更改每会话的 exec 默认值；它不授予工具访问权限。
  提供商工具键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.4`）。

### 工具组（简写）

工具策略（全局、代理、沙盒）支持扩展为多个工具的 `group:*` 条目：

```json5
{
  tools: {
    sandbox: {
      tools: {
        allow: ["group:runtime", "group:fs", "group:sessions", "group:memory"],
      },
    },
  },
}
```

可用的组：

- `group:runtime`：`exec`、`process`、`code_execution`（`bash` 作为 `exec` 的别名被接受）
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`sessions_yield`、`subagents`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:web`：`web_search`、`x_search`、`web_fetch`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:agents`：`agents_list`
- `group:media`：`image`、`image_generate`、`video_generate`、`tts`
- `group:openclaw`：所有内置 OpenClaw 工具（不包括提供商插件）

## 提升权限：仅限 exec 的"在主机上运行"

提升权限**不**授予额外的工具；它只影响 `exec`。

- 如果你处于沙盒中，`/elevated on`（或带 `elevated: true` 的 `exec`）在沙盒外运行（可能仍然应用审批）。
- 使用 `/elevated full` 跳过会话的 exec 审批。
- 如果你已经在直接运行，提升权限实际上是无操作（仍然受控）。
- 提升权限**不**是技能范围的，**不**覆盖工具允许/拒绝。
- 提升权限不从 `host=auto` 授予任意跨主机覆盖；它遵循正常的 exec 目标规则，仅在配置/会话目标已经是 `node` 时才保留 `node`。
- `/exec` 与提升权限分开。它只为授权发送者调整每会话的 exec 默认值。

关卡：

- 启用：`tools.elevated.enabled`（以及可选的 `agents.list[].tools.elevated.enabled`）
- 发送者允许列表：`tools.elevated.allowFrom.<provider>`（以及可选的 `agents.list[].tools.elevated.allowFrom.<provider>`）

参见[提升模式](/tools/elevated)。

## 常见"sandbox jail"修复

### "工具 X 被沙盒工具策略阻止"

修复键（选择一个）：

- 禁用沙盒：`agents.defaults.sandbox.mode=off`（或每代理 `agents.list[].sandbox.mode=off`）
- 在沙盒内允许工具：
  - 从 `tools.sandbox.tools.deny` 中删除它（或每代理 `agents.list[].tools.sandbox.tools.deny`）
  - 或将其添加到 `tools.sandbox.tools.allow`（或每代理允许）

### "我以为这是主会话，为什么它被沙盒化了？"

在 `"non-main"` 模式下，群组/渠道键*不是*主会话。使用 `sandbox explain` 显示的主会话键，或将模式切换为 `"off"`。

## 相关链接

- [沙盒](/gateway/sandboxing) — 完整沙盒参考（模式、范围、后端、镜像）
- [多代理沙盒和工具](/tools/multi-agent-sandbox-tools) — 每代理覆盖和优先级
- [提升模式](/tools/elevated)
