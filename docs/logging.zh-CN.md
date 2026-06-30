---
summary: "文件日志、控制台输出、CLI 跟踪和 Control UI 日志标签页"
read_when:
  - 需要对 OpenClaw 日志记录有友好的概述时
  - 想要配置日志级别、格式或脱敏时
  - 正在排查故障并需要快速查找日志时
title: "日志记录"
---

OpenClaw 有两个主要日志界面：

- **文件日志**（JSON 行格式），由网关写入。
- **控制台输出**，显示在终端和网关调试 UI 中。

Control UI 的**日志**标签页会跟踪网关文件日志。本页面说明日志的存储位置、如何阅读日志以及如何配置日志级别和格式。

## 日志存储位置

默认情况下，网关在以下路径写入滚动日志文件：

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

日期使用网关主机的本地时区。

每个文件在达到 `logging.maxFileBytes`（默认：100 MB）时轮转。
OpenClaw 在活动文件旁边保留最多五个编号的归档，例如
`openclaw-YYYY-MM-DD.1.log`，并继续写入新的活动日志而不是
抑制诊断信息。

你可以在 `~/.openclaw/openclaw.json` 中覆盖此设置：

```json
{
  "logging": {
    "file": "/path/to/openclaw.log"
  }
}
```

## 如何读取日志

### CLI：实时跟踪（推荐）

使用 CLI 通过 RPC 跟踪网关日志文件：

```bash
openclaw logs --follow
```

当前有用选项：

- `--local-time`：以本地时区渲染时间戳
- `--url <url>` / `--token <token>` / `--timeout <ms>`：标准网关 RPC 标志
- `--expect-final`：代理支持的 RPC 最终响应等待标志（通过共享客户端层在此处接受）

输出模式：

- **TTY 会话**：美观、彩色、结构化的日志行。
- **非 TTY 会话**：纯文本。
- `--json`：行分隔 JSON（每行一个日志事件）。
- `--plain`：在 TTY 会话中强制使用纯文本。
- `--no-color`：禁用 ANSI 颜色。

当你传递显式的 `--url` 时，CLI 不会自动应用配置或
环境凭证；如果目标网关需要认证，请自行包含 `--token`。

在 JSON 模式下，CLI 发出带 `type` 标签的对象：

- `meta`：流元数据（文件、游标、大小）
- `log`：已解析的日志条目
- `notice`：截断/轮转提示
- `raw`：未解析的日志行

如果隐式本地回环网关要求配对、在连接期间关闭，
或在 `logs.tail` 应答之前超时，`openclaw logs` 会自动回退到
已配置的网关文件日志。显式 `--url` 目标不使用此回退。

如果网关不可达，CLI 会打印一条简短提示，建议运行：

```bash
openclaw doctor
```

### Control UI（网页版）

Control UI 的**日志**标签页使用 `logs.tail` 跟踪相同的文件。
请参阅 [/web/control-ui](/web/control-ui) 了解如何打开它。

### 仅频道日志

要过滤频道活动（WhatsApp/Telegram 等），请使用：

```bash
openclaw channels logs --channel whatsapp
```

## 日志格式

### 文件日志（JSONL）

日志文件中的每一行都是一个 JSON 对象。CLI 和 Control UI 解析这些
条目以渲染结构化输出（时间、级别、子系统、消息）。

文件日志 JSONL 记录在可用时还包含机器可过滤的顶级字段：

- `hostname`：网关主机名。
- `message`：用于全文搜索的扁平化日志消息文本。
- `agent_id`：日志调用携带代理上下文时的活动代理 ID。
- `session_id`：日志调用携带会话上下文时的活动会话 ID/键。
- `channel`：日志调用携带频道上下文时的活动频道。

OpenClaw 在这些字段旁边保留原始结构化日志参数，
以便读取编号 tslog 参数键的现有解析器继续工作。

### 控制台输出

控制台日志是 **TTY 感知的**，格式化以提高可读性：

- 子系统前缀（例如 `gateway/channels/whatsapp`）
- 级别着色（info/warn/error）
- 可选的紧凑或 JSON 模式

控制台格式由 `logging.consoleStyle` 控制。

### 网关 WebSocket 日志

`openclaw gateway` 还有用于 RPC 流量的 WebSocket 协议日志记录：

- 普通模式：仅有趣的结果（错误、解析错误、慢调用）
- `--verbose`：所有请求/响应流量
- `--ws-log auto|compact|full`：选择详细渲染样式
- `--compact`：`--ws-log compact` 的别名

示例：

```bash
openclaw gateway
openclaw gateway --verbose --ws-log compact
openclaw gateway --verbose --ws-log full
```

## 配置日志记录

所有日志配置位于 `~/.openclaw/openclaw.json` 中的 `logging` 下。

```json
{
  "logging": {
    "level": "info",
    "file": "/tmp/openclaw/openclaw-YYYY-MM-DD.log",
    "consoleLevel": "info",
    "consoleStyle": "pretty",
    "redactSensitive": "tools",
    "redactPatterns": ["sk-.*"]
  }
}
```

### 日志级别

- `logging.level`：**文件日志**（JSONL）级别。
- `logging.consoleLevel`：**控制台**详细程度级别。

你可以通过 **`OPENCLAW_LOG_LEVEL`** 环境变量（例如 `OPENCLAW_LOG_LEVEL=debug`）覆盖两者。环境变量优先于配置文件，因此可以在不编辑 `openclaw.json` 的情况下提高单次运行的详细程度。你还可以传递全局 CLI 选项 **`--log-level <level>`**（例如，`openclaw --log-level debug gateway run`），该选项会为该命令覆盖环境变量。

`--verbose` 仅影响控制台输出和 WS 日志详细程度；它不会更改文件日志级别。

### 追踪关联

文件日志是 JSONL 格式。当日志调用携带有效的诊断追踪上下文时，
OpenClaw 将追踪字段写为顶级 JSON 键（`traceId`、`spanId`、
`parentSpanId`、`traceFlags`），以便外部日志处理器可以将该行
与 OTEL span 和提供商 `traceparent` 传播关联。

网关 HTTP 请求和网关 WebSocket 帧建立内部请求追踪范围。在该异步范围内发出的日志和诊断事件在不传递显式追踪上下文时继承请求追踪。代理运行和模型调用追踪成为活动请求追踪的子项，因此本地日志、诊断快照、OTEL span 和可信提供商 `traceparent` 标头可以通过 `traceId` 关联，而不会记录原始请求或模型内容。

### 模型调用大小和计时

模型调用诊断记录有界的请求/响应测量，而不捕获原始提示词或响应内容：

- `requestPayloadBytes`：最终模型请求有效载荷的 UTF-8 字节大小
- `responseStreamBytes`：流式模型响应事件的 UTF-8 字节大小
- `timeToFirstByteMs`：第一个流式响应事件之前的经过时间
- `durationMs`：总模型调用持续时间

这些字段可用于诊断快照、模型调用插件 hook 以及启用诊断导出时的 OTEL 模型调用 span/指标。

### 控制台样式

`logging.consoleStyle`：

- `pretty`：人性化、彩色、带时间戳。
- `compact`：更紧凑的输出（最适合长会话）。
- `json`：每行 JSON（用于日志处理器）。

### 脱敏

OpenClaw 可以在敏感令牌到达控制台输出、文件日志、
OTLP 日志记录、持久化会话转录文本或 Control UI 工具
事件有效载荷（工具启动参数、部分/最终结果有效载荷、派生
执行输出和补丁摘要）之前将其脱敏：

- `logging.redactSensitive`：`off` | `tools`（默认：`tools`）
- `logging.redactPatterns`：覆盖默认集的正则字符串列表。自定义模式在 Control UI 工具有效载荷的内置默认值之上应用，因此添加模式永远不会削弱已被默认值捕获的值的脱敏。

文件日志和会话转录保持 JSONL 格式，但匹配的密钥值在写入磁盘之前被屏蔽。脱敏是尽力而为的：它适用于承载文本的消息内容和日志字符串，而不是每个标识符或二进制有效载荷字段。

内置默认值涵盖常见的 API 凭证和支付凭证字段名称，例如卡号、CVC/CVV、共享支付令牌，以及在 JSON 字段、URL 参数、CLI 标志或赋值中出现的支付凭证。

`logging.redactSensitive: "off"` 仅禁用此一般日志/转录策略。OpenClaw 仍然会脱敏可以向 UI 客户端、支持包、诊断观察者、审批提示或代理工具显示的安全边界有效载荷。示例包括 Control UI 工具调用事件、`sessions_history` 输出、诊断支持导出、提供商错误观察、执行审批命令显示和网关 WebSocket 协议日志。自定义 `logging.redactPatterns` 仍然可以在这些界面上添加项目特定的模式。

## 诊断和 OpenTelemetry

诊断是用于模型运行和消息流遥测（webhook、排队、会话状态）的结构化、机器可读事件。它们**不**取代日志——它们为指标、追踪和导出器提供数据。无论是否导出，事件都在进程内发出。

两个相邻界面：

- **OpenTelemetry 导出** — 通过 OTLP/HTTP 将指标、追踪和日志发送到任何 OpenTelemetry 兼容的收集器或后端（Grafana、Datadog、Honeycomb、New Relic、Tempo 等）。完整配置、信号目录、指标/span 名称、环境变量和隐私模型在专用页面上：[OpenTelemetry 导出](/gateway/opentelemetry)。
- **诊断标志** — 目标调试日志标志，将额外日志路由到 `logging.file` 而不提高 `logging.level`。标志不区分大小写并支持通配符（`telegram.*`、`*`）。在 `diagnostics.flags` 下配置或通过 `OPENCLAW_DIAGNOSTICS=...` 环境覆盖配置。完整指南：[诊断标志](/diagnostics/flags)。

要为插件或自定义接收器启用诊断事件而不使用 OTLP 导出：

```json5
{
  diagnostics: { enabled: true },
}
```

有关 OTLP 导出到收集器，请参阅 [OpenTelemetry 导出](/gateway/opentelemetry)。

## 故障排除提示

- **网关无法访问？** 首先运行 `openclaw doctor`。
- **日志为空？** 检查网关是否正在运行并写入 `logging.file` 中的文件路径。
- **需要更多详情？** 将 `logging.level` 设置为 `debug` 或 `trace` 并重试。

## 相关

- [OpenTelemetry 导出](/gateway/opentelemetry) — OTLP/HTTP 导出、指标/span 目录、隐私模型
- [诊断标志](/diagnostics/flags) — 目标调试日志标志
- [网关日志内部](/gateway/logging) — WS 日志样式、子系统前缀和控制台捕获
- [配置参考](/gateway/configuration-reference#diagnostics) — 完整的 `diagnostics.*` 字段参考
