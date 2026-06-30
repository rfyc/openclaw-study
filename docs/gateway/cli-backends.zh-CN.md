---
summary: "CLI 后端：带可选 MCP 工具桥接的本地 AI CLI 回退"
read_when:
  - 当 API 提供商失败时需要可靠的回退方案
  - 正在运行 Codex CLI 或其他本地 AI CLI 并希望复用它们
  - 想了解 CLI 后端工具访问的 MCP 回环桥接
title: "CLI 后端"
---

OpenClaw 可以在 API 提供商宕机、被速率限制或暂时故障时，将**本地 AI CLI** 作为**纯文本回退**运行。这是有意保守的设计：

- **OpenClaw 工具不会直接注入**，但设置 `bundleMcp: true` 的后端可以通过回环 MCP 桥接接收网关工具。
- 支持 CLI 的 **JSONL 流式传输**。
- **支持会话**（因此后续对话保持连贯性）。
- 如果 CLI 接受图像路径，**可以传递图像**。

这被设计为**安全网**而非主要路径。当你希望在不依赖外部 API 的情况下获得"始终可用"的文本响应时使用它。

如果你需要带有 ACP 会话控制、后台任务、线程/对话绑定和持久外部编码会话的完整套件运行时，请改用 [ACP Agents](/tools/acp-agents)。CLI 后端不是 ACP。

## 适合初学者的快速开始

你可以在**不做任何配置**的情况下使用 Codex CLI（捆绑的 OpenAI 插件注册了默认后端）：

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.5
```

如果你的网关在 launchd/systemd 下运行且 PATH 较少，只需添加命令路径：

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
        },
      },
    },
  },
}
```

就这样。除了 CLI 本身所需的之外，无需密钥，无需额外的认证配置。

如果你将捆绑的 CLI 后端用作网关主机上的**主要消息提供商**，当你的配置在模型引用或 `agents.defaults.cliBackends` 下明确引用该后端时，OpenClaw 现在会自动加载拥有该后端的捆绑插件。

## 将其用作回退

将 CLI 后端添加到你的回退列表中，使其仅在主要模型失败时运行：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["codex-cli/gpt-5.5"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "codex-cli/gpt-5.5": {},
      },
    },
  },
}
```

注意事项：

- 如果你使用 `agents.defaults.models`（允许列表），你也必须在那里包含你的 CLI 后端模型。
- 如果主提供商失败（认证、速率限制、超时），OpenClaw 会接着尝试 CLI 后端。

## 配置概述

所有 CLI 后端都位于：

```
agents.defaults.cliBackends
```

每个条目以**提供商 id**（例如 `codex-cli`、`my-cli`）为键。提供商 id 成为模型引用的左侧：

```
<provider>/<model>
```

### 示例配置

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          input: "arg",
          modelArg: "--model",
          modelAliases: {
            "claude-opus-4-6": "opus",
            "claude-sonnet-4-6": "sonnet",
          },
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptArg: "--system",
          // 对于有专用提示文件标志的 CLI：
          // systemPromptFileArg: "--system-file",
          // Codex 风格的 CLI 可以指向提示文件：
          // systemPromptFileConfigArg: "-c",
          // systemPromptFileConfigKey: "model_instructions_file",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          serialize: true,
        },
      },
    },
  },
}
```

## 工作原理

1. 根据提供商前缀（`codex-cli/...`）**选择后端**。
2. 使用相同的 OpenClaw 提示 + 工作区上下文**构建系统提示**。
3. 使用会话 id（如果支持）**执行 CLI**，使历史保持一致。捆绑的 `claude-cli` 后端在每个 OpenClaw 会话中保持 Claude stdio 进程活跃，并通过 stream-json stdin 发送后续对话。
4. **解析输出**（JSON 或纯文本）并返回最终文本。
5. **持久化每个后端的会话 id**，以便后续对话复用相同的 CLI 会话。

<Note>
捆绑的 Anthropic `claude-cli` 后端再次受到支持。Anthropic 工作人员告知我们 OpenClaw 风格的 Claude CLI 使用再次被允许，因此 OpenClaw 将 `claude -p` 使用视为此集成的授权用法，除非 Anthropic 发布新政策。
</Note>

捆绑的 OpenAI `codex-cli` 后端通过 Codex 的 `model_instructions_file` 配置覆盖（`-c model_instructions_file="..."`）传递 OpenClaw 的系统提示。Codex 不公开 Claude 风格的 `--append-system-prompt` 标志，因此 OpenClaw 为每个新的 Codex CLI 会话将组装好的提示写入临时文件。

捆绑的 Anthropic `claude-cli` 后端通过两种方式接收 OpenClaw 技能快照：附加系统提示中的紧凑 OpenClaw 技能目录，以及通过 `--plugin-dir` 传递的临时 Claude Code 插件。该插件仅包含该代理/会话的合格技能，因此 Claude Code 的原生技能解析器会看到 OpenClaw 在提示中发布的相同过滤集。技能环境/API 密钥覆盖仍由 OpenClaw 应用到运行时子进程环境中。

Claude CLI 也有自己的非交互式权限模式。OpenClaw 将其映射到现有的 exec 策略，而不是添加 Claude 特定的配置：当有效请求的 exec 策略是 YOLO（`tools.exec.security: "full"` 且 `tools.exec.ask: "off"`）时，OpenClaw 添加 `--permission-mode bypassPermissions`。每代理 `agents.list[].tools.exec` 设置会覆盖该代理的全局 `tools.exec`。要强制使用不同的 Claude 模式，请在 `agents.defaults.cliBackends.claude-cli.args` 和匹配的 `resumeArgs` 下设置显式的原始后端参数，例如 `--permission-mode default` 或 `--permission-mode acceptEdits`。

在 OpenClaw 可以使用捆绑的 `claude-cli` 后端之前，Claude Code 本身必须已经在同一主机上登录：

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

仅当 `claude` 二进制文件不在 `PATH` 上时才使用 `agents.defaults.cliBackends.claude-cli.command`。

## 会话

- 如果 CLI 支持会话，设置 `sessionArg`（例如 `--session-id`）或 `sessionArgs`（占位符 `{sessionId}`）（当 ID 需要插入多个标志时）。
- 如果 CLI 使用带有不同标志的**恢复子命令**，设置 `resumeArgs`（恢复时替换 `args`）以及可选的 `resumeOutput`（用于非 JSON 恢复）。
- `sessionMode`：
  - `always`：始终发送会话 id（如果没有存储则使用新 UUID）。
  - `existing`：仅在之前存储了会话 id 时才发送。
  - `none`：从不发送会话 id。
- `claude-cli` 默认使用 `liveSession: "claude-stdio"`、`output: "jsonl"` 和 `input: "stdin"`，因此后续对话在 Claude 进程处于活跃状态时复用实时 Claude 进程。热 stdio 现在是默认值，包括省略传输字段的自定义配置。如果网关重启或空闲进程退出，OpenClaw 会从存储的 Claude 会话 id 恢复。存储的会话 id 在恢复前会针对现有的可读项目脚本进行验证，因此幽灵绑定会以 `reason=transcript-missing` 清除，而不是静默启动 `--resume` 下的全新 Claude CLI 会话。
- Claude 实时会话保持有界的 JSONL 输出保护。默认每次对话允许最多 8 MiB 和 20,000 个原始 JSONL 行。工具密集型 Claude 对话可以通过 `agents.defaults.cliBackends.claude-cli.reliability.outputLimits.maxTurnRawChars` 和 `maxTurnLines` 在每个后端上提高这些限制；OpenClaw 将这些设置限制在 64 MiB 和 100,000 行。
- 存储的 CLI 会话是提供商拥有的连续性。隐式的每日会话重置不会切断它们；`/reset` 和显式 `session.reset` 策略仍然会。

序列化注意事项：

- `serialize: true` 保持同一通道运行的顺序。
- 大多数 CLI 在一个提供商通道上序列化。
- 当所选认证身份发生更改时，OpenClaw 会丢弃存储的 CLI 会话复用，包括更改的认证配置文件 id、静态 API 密钥、静态 token 或 CLI 公开的 OAuth 账户身份。OAuth 访问和刷新 token 轮换不会切断存储的 CLI 会话。如果 CLI 不公开稳定的 OAuth 账户 id，OpenClaw 让该 CLI 强制执行恢复权限。

## 来自 claude-cli 会话的回退前言

当 `claude-cli` 尝试在 [`agents.defaults.model.fallbacks`](/concepts/model-failover) 中切换到非 CLI 候选时，OpenClaw 会从 `~/.claude/projects/` 中的 Claude Code 本地 JSONL 脚本中收集上下文前言来填充下一次尝试。如果没有这个种子，回退提供商会从冷状态开始，因为 OpenClaw 自己的会话脚本对 `claude-cli` 运行来说是空的。

- 前言优先选取最新的 `/compact` 摘要或 `compact_boundary` 标记，然后在字符预算内追加最近的边界后对话。边界前的对话会被丢弃，因为摘要已经代表了它们。
- 工具块被合并为紧凑的 `(tool call: name)` 和 `(tool result: …)` 提示，以保持提示预算的准确性。如果摘要溢出，会被标记为 `(truncated)`。
- 相同提供商的 `claude-cli` 到 `claude-cli` 回退依赖 Claude 自己的 `--resume` 并跳过前言。
- 种子复用现有的 Claude 会话文件路径验证，因此无法读取任意路径。

## 图像（传递）

如果你的 CLI 接受图像路径，设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图像写入临时文件。如果设置了 `imageArg`，这些路径将作为 CLI 参数传递。如果 `imageArg` 缺失，OpenClaw 会将文件路径追加到提示中（路径注入），这对于从普通路径自动加载本地文件的 CLI 已经足够。

## 输入/输出

- `output: "json"`（默认）尝试解析 JSON 并提取文本 + 会话 id。
- 对于 Gemini CLI JSON 输出，当 `usage` 缺失或为空时，OpenClaw 从 `response` 读取回复文本，从 `stats` 读取使用情况。
- `output: "jsonl"` 解析 JSONL 流（例如 Codex CLI `--json`）并提取最终代理消息以及存在时的会话标识符。
- `output: "text"` 将 stdout 视为最终响应。

输入模式：

- `input: "arg"`（默认）将提示作为最后一个 CLI 参数传递。
- `input: "stdin"` 通过 stdin 发送提示。
- 如果提示很长且设置了 `maxPromptArgChars`，则使用 stdin。

## 默认值（插件拥有）

捆绑的 OpenAI 插件还为 `codex-cli` 注册了默认值：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","-c","sandbox_mode=\"workspace-write\"","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

捆绑的 Google 插件还为 `google-gemini-cli` 注册了默认值：

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

前提条件：本地 Gemini CLI 必须已安装并在 `PATH` 上可用（`brew install gemini-cli` 或 `npm install -g @google/gemini-cli`）。

Gemini CLI JSON 注意事项：

- 回复文本从 JSON `response` 字段读取。
- 当 `usage` 缺失或为空时，使用情况回退到 `stats`。
- `stats.cached` 被标准化为 OpenClaw `cacheRead`。
- 如果 `stats.input` 缺失，OpenClaw 从 `stats.input_tokens - stats.cached` 推导输入 token。

仅在需要时覆盖（常见：绝对 `command` 路径）。

## 插件拥有的默认值

CLI 后端默认值现在是插件接口的一部分：

- 插件通过 `api.registerCliBackend(...)` 注册它们。
- 后端 `id` 成为模型引用中的提供商前缀。
- `agents.defaults.cliBackends.<id>` 中的用户配置仍然覆盖插件默认值。
- 后端特定的配置清理通过可选的 `normalizeConfig` 钩子保持插件拥有。

需要微小提示/消息兼容性垫片的插件可以声明双向文本转换，而无需替换提供商或 CLI 后端：

```typescript
api.registerTextTransforms({
  input: [
    { from: /red basket/g, to: "blue basket" },
    { from: /paper ticket/g, to: "digital ticket" },
    { from: /left shelf/g, to: "right shelf" },
  ],
  output: [
    { from: /blue basket/g, to: "red basket" },
    { from: /digital ticket/g, to: "paper ticket" },
    { from: /right shelf/g, to: "left shelf" },
  ],
});
```

`input` 重写传递给 CLI 的系统提示和用户提示。`output` 在 OpenClaw 处理自己的控制标记和渠道交付之前重写流式助手增量和解析的最终文本。

对于发出 Claude Code stream-json 兼容 JSONL 的 CLI，在该后端配置上设置 `jsonlDialect: "claude-stream-json"`。

## Bundle MCP 叠加层

CLI 后端**不会直接**接收 OpenClaw 工具调用，但后端可以通过 `bundleMcp: true` 选择加入生成的 MCP 配置叠加层。

当前捆绑行为：

- `claude-cli`：生成的严格 MCP 配置文件
- `codex-cli`：`mcp_servers` 的内联配置覆盖；生成的 OpenClaw 回环服务器标记有 Codex 的每服务器工具批准模式，以防止 MCP 调用因本地审批提示而停滞
- `google-gemini-cli`：生成的 Gemini 系统设置文件

启用 bundle MCP 时，OpenClaw：

- 生成一个回环 HTTP MCP 服务器，向 CLI 进程公开网关工具
- 使用每会话 token（`OPENCLAW_MCP_TOKEN`）验证桥接
- 将工具访问范围限制到当前会话、账户和渠道上下文
- 为当前工作区加载已启用的 bundle-MCP 服务器
- 将它们与任何现有的后端 MCP 配置/设置形状合并
- 使用拥有该扩展的后端拥有的集成模式重写启动配置

如果没有启用 MCP 服务器，当后端选择 bundle MCP 时，OpenClaw 仍然注入严格配置，以保持后台运行的隔离。

会话范围的捆绑 MCP 运行时在会话内缓存以供复用，然后在 `mcp.sessionIdleTtlMs` 毫秒的空闲时间后回收（默认 10 分钟；设置 `0` 可禁用）。一次性嵌入式运行（如认证探测、slug 生成和主动记忆召回）在运行结束时请求清理，以防止 stdio 子进程和 Streamable HTTP/SSE 流超过运行时间。

## 限制

- **没有直接的 OpenClaw 工具调用。** OpenClaw 不向 CLI 后端协议注入工具调用。只有当后端选择 `bundleMcp: true` 时，才能看到网关工具。
- **流式传输是后端特定的。** 一些后端以 JSONL 流式传输；其他的在退出前缓冲。
- **结构化输出**取决于 CLI 的 JSON 格式。
- **Codex CLI 会话**通过文本输出恢复（没有 JSONL），这比初始的 `--json` 运行结构化程度低。OpenClaw 会话仍然正常工作。

## 故障排除

- **找不到 CLI**：将 `command` 设置为完整路径。
- **错误的模型名称**：使用 `modelAliases` 将 `provider/model` 映射到 CLI 模型。
- **没有会话连续性**：确保已设置 `sessionArg` 且 `sessionMode` 不是 `none`（Codex CLI 目前无法使用 JSON 输出恢复）。
- **忽略图像**：设置 `imageArg`（并验证 CLI 支持文件路径）。

## 相关链接

- [网关运行手册](/gateway)
- [本地模型](/gateway/local-models)
