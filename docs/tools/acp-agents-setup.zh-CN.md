---
summary: "设置 ACP 代理：acpx 运行时配置、插件设置、权限"
read_when:
  - 为 Claude Code / Codex / Gemini CLI 安装或配置 acpx 运行时
  - 启用插件工具或 OpenClaw 工具 MCP 桥接
  - 配置 ACP 权限模式
title: "ACP 代理 — 设置"
---

如需了解概览、运维手册和概念，请参阅 [ACP 代理](/tools/acp-agents)。

以下章节涵盖 acpx 运行时配置、MCP 桥接插件设置以及权限配置。

仅在设置 ACP/acpx 路由时使用本页。如需配置原生 Codex 应用服务器运行时，请使用 [Codex 运行时](/plugins/codex-harness)。如需配置 OpenAI API 密钥或 Codex OAuth 模型提供商，请使用 [OpenAI](/providers/openai)。

Codex 有两种 OpenClaw 路由：

| 路由                  | 配置/命令                                              | 设置页面                               |
| --------------------- | ------------------------------------------------------ | -------------------------------------- |
| 原生 Codex 应用服务器 | `/codex ...`、`agentRuntime.id: "codex"`               | [Codex 运行时](/plugins/codex-harness) |
| 显式 Codex ACP 适配器 | `/acp spawn codex`、`runtime: "acp", agentId: "codex"` | 本页                                   |

除非明确需要 ACP/acpx 行为，否则请优先使用原生路由。

## acpx 运行时支持（当前）

当前 acpx 内置运行时别名：

- `claude`
- `codex`
- `copilot`
- `cursor`（Cursor CLI：`cursor-agent acp`）
- `droid`
- `gemini`
- `iflow`
- `kilocode`
- `kimi`
- `kiro`
- `openclaw`
- `opencode`
- `pi`
- `qwen`

当 OpenClaw 使用 acpx 后端时，除非您的 acpx 配置定义了自定义代理别名，否则请优先使用这些值作为 `agentId`。
如果您本地的 Cursor 安装仍通过 `agent acp` 暴露 ACP，请在 acpx 配置中覆盖 `cursor` 代理命令，而不是更改内置默认值。

直接使用 acpx CLI 也可以通过 `--agent <command>` 指向任意适配器，但这是 acpx CLI 的底层功能（不是正常的 OpenClaw `agentId` 路径）。

模型控制取决于适配器能力。Codex ACP 模型引用在启动前由 OpenClaw 规范化。其他运行时需要 ACP `models` 以及 `session/set_model` 支持；如果运行时既不暴露该 ACP 能力，也没有自己的启动模型标志，则 OpenClaw/acpx 无法强制选择模型。

## 必要配置

核心 ACP 基线：

```json5
{
  acp: {
    enabled: true,
    // 可选。默认为 true；设为 false 可在保留 /acp 控制的同时暂停 ACP 调度。
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: [
      "claude",
      "codex",
      "copilot",
      "cursor",
      "droid",
      "gemini",
      "iflow",
      "kilocode",
      "kimi",
      "kiro",
      "openclaw",
      "opencode",
      "pi",
      "qwen",
    ],
    maxConcurrentSessions: 8,
    stream: {
      coalesceIdleMs: 300,
      maxChunkChars: 1200,
    },
    runtime: {
      ttlMinutes: 120,
    },
  },
}
```

线程绑定配置因频道适配器而异。Discord 示例：

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        spawnSessions: true,
      },
    },
  },
}
```

如果基于线程的 ACP 生成不起作用，请先验证适配器功能标志：

- Discord：`channels.discord.threadBindings.spawnSessions=true`

当前对话绑定不需要创建子线程。它们需要一个活动的对话上下文，以及一个暴露 ACP 对话绑定的频道适配器。

参见[配置参考](/gateway/configuration-reference)。

## acpx 后端插件设置

打包安装使用官方 `@openclaw/acpx` 运行时插件来处理 ACP。
在使用 ACP 运行时会话之前，请先安装并启用它：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

源码检出也可以在 `pnpm install` 之后使用本地工作区插件。

从以下命令开始：

```text
/acp doctor
```

如果您禁用了 `acpx`、通过 `plugins.allow` / `plugins.deny` 拒绝了它，或者想切换回打包插件，请使用显式包路径：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

开发期间的本地工作区安装：

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

然后验证后端健康状态：

```text
/acp doctor
```

### acpx 命令和版本配置

默认情况下，`acpx` 插件在不于 Gateway 启动时生成 ACP 代理的前提下注册嵌入式 ACP 后端。运行 `/acp doctor` 可进行显式实时探测。仅在需要 Gateway 在启动时探测已配置代理时才设置 `OPENCLAW_ACPX_RUNTIME_STARTUP_PROBE=1`。

在插件配置中覆盖命令或版本：

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "command": "../acpx/dist/cli.js",
          "expectedVersion": "any"
        }
      }
    }
  }
}
```

- `command` 接受绝对路径、相对路径（从 OpenClaw 工作区解析）或命令名称。
- `expectedVersion: "any"` 禁用严格版本匹配。
- 自定义 `command` 路径会禁用插件本地自动安装。

参见[插件](/tools/plugin)。

### 自动依赖安装

当您使用 `npm install -g openclaw` 全局安装 OpenClaw 时，acpx 运行时依赖项（平台特定的二进制文件）会通过 postinstall 钩子自动安装。如果自动安装失败，Gateway 仍会正常启动，并通过 `openclaw acp doctor` 报告缺失的依赖项。

### 插件工具 MCP 桥接

默认情况下，ACPX 会话**不会**将 OpenClaw 插件注册的工具暴露给 ACP 运行时。

如果您希望 ACP 代理（如 Codex 或 Claude Code）调用已安装的 OpenClaw 插件工具（如记忆召回/存储），请启用专用桥接：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

此操作的效果：

- 在 ACPX 会话引导中注入一个名为 `openclaw-plugin-tools` 的内置 MCP 服务器。
- 暴露已安装并启用的 OpenClaw 插件已注册的插件工具。
- 保持功能显式且默认关闭。

安全和信任注意事项：

- 这会扩展 ACP 运行时的工具范围。
- ACP 代理只能访问 Gateway 中已激活的插件工具。
- 请将此视为与允许这些插件在 OpenClaw 本身中执行相同的信任边界。
- 启用前请检查已安装的插件。

自定义 `mcpServers` 仍按之前的方式工作。内置插件工具桥接是一个额外的可选便利功能，而非通用 MCP 服务器配置的替代品。

### OpenClaw 工具 MCP 桥接

默认情况下，ACPX 会话也**不会**通过 MCP 暴露 OpenClaw 内置工具。当 ACP 代理需要访问特定内置工具（如 `cron`）时，请启用独立的核心工具桥接：

```bash
openclaw config set plugins.entries.acpx.config.openClawToolsMcpBridge true
```

此操作的效果：

- 在 ACPX 会话引导中注入一个名为 `openclaw-tools` 的内置 MCP 服务器。
- 暴露选定的 OpenClaw 内置工具。初始服务器暴露 `cron`。
- 保持核心工具暴露显式且默认关闭。

### 运行时超时配置

`acpx` 插件默认将嵌入式运行时轮次的超时时间设为 120 秒。这为较慢的运行时（如 Gemini CLI）提供了足够的时间来完成 ACP 启动和初始化。如果您的主机需要不同的运行时限制，请覆盖此值：

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

更改此值后请重启 Gateway。

### 健康探测代理配置

当 `/acp doctor` 或可选的启动探测检查后端时，捆绑的 `acpx` 插件会探测一个运行时代理。如果设置了 `acp.allowedAgents`，则默认探测第一个允许的代理；否则默认为 `codex`。如果您的部署需要使用不同的 ACP 代理进行健康检查，请显式设置探测代理：

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

更改此值后请重启 Gateway。

## 权限配置

ACP 会话以非交互方式运行——没有 TTY 来批准或拒绝文件写入和 shell 执行权限提示。acpx 插件提供两个配置键来控制权限处理方式：

这些 ACPX 运行时权限与 OpenClaw exec 批准以及 CLI 后端供应商绕过标志（如 Claude CLI `--permission-mode bypassPermissions`）是分开的。ACPX `approve-all` 是 ACP 会话的运行时级应急开关。

### `permissionMode`

控制运行时代理可以在不提示的情况下执行哪些操作。

| 值              | 行为                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自动批准所有文件写入和 shell 命令。  |
| `approve-reads` | 仅自动批准读取；写入和执行需要提示。 |
| `deny-all`      | 拒绝所有权限提示。                   |

### `nonInteractivePermissions`

控制在没有可用的交互式 TTY 时（ACP 会话始终如此）显示权限提示时的行为。

| 值     | 行为                                          |
| ------ | --------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止会话。**（默认）** |
| `deny` | 静默拒绝权限并继续（优雅降级）。              |

### 配置

通过插件配置设置：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

更改这些值后请重启 Gateway。

<Warning>
OpenClaw 默认为 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非交互式 ACP 会话中，任何触发权限提示的写入或执行操作都可能以 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 失败。

如果您需要限制权限，请将 `nonInteractivePermissions` 设置为 `deny`，以便会话优雅降级而不是崩溃。
</Warning>

## 相关

- [ACP 代理](/tools/acp-agents) — 概览、运维手册、概念
- [子代理](/tools/subagents)
- [多代理路由](/concepts/multi-agent)
