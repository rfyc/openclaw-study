---
summary: "日志面、文件日志、WS 日志样式和控制台格式"
title: "网关日志"
read_when:
  - 更改日志输出或格式
  - 调试 CLI 或网关输出
---

# 日志

有关面向用户的概述（CLI + Control UI + 配置），参见 [/logging](/logging)。

OpenClaw 有两个日志"面"：

- **控制台输出**（你在终端/调试 UI 中看到的内容）。
- **文件日志**（JSON 行），由网关日志记录器写入。

## 基于文件的日志记录器

- 默认滚动日志文件在 `/tmp/openclaw/` 下（每天一个文件）：`openclaw-YYYY-MM-DD.log`
  - 日期使用网关主机的本地时区。
- 活跃日志文件在 `logging.maxFileBytes`（默认：100 MB）时轮换，保留最多五个编号存档并继续写入新的活跃文件。
- 可以通过 `~/.openclaw/openclaw.json` 配置日志文件路径和级别：
  - `logging.file`
  - `logging.level`

文件格式是每行一个 JSON 对象。

Control UI 日志选项卡通过网关（`logs.tail`）跟踪此文件。CLI 可以做同样的事情：

```bash
openclaw logs --follow
```

**详细级别与日志级别**

- **文件日志**完全由 `logging.level` 控制。
- `--verbose` 仅影响**控制台详细程度**（和 WS 日志样式）；它**不**提高文件日志级别。
- 要在文件日志中捕获仅详细的细节，将 `logging.level` 设置为 `debug` 或 `trace`。
- 跟踪日志还包括所选热路径的诊断时序摘要，例如插件工具工厂准备。参见 [/tools/plugin#slow-plugin-tool-setup](/tools/plugin#slow-plugin-tool-setup)。

## 控制台捕获

CLI 捕获 `console.log/info/warn/error/debug/trace` 并将其写入文件日志，同时仍打印到 stdout/stderr。

你可以通过以下方式独立调整控制台详细程度：

- `logging.consoleLevel`（默认 `info`）
- `logging.consoleStyle`（`pretty` | `compact` | `json`）

## 删除

OpenClaw 可以在日志或转录输出离开进程之前屏蔽敏感令牌。此日志删除策略在控制台、文件日志、OTLP 日志记录和会话转录文本接收器上应用，因此匹配的秘密值在 JSONL 行或消息写入磁盘之前被屏蔽。

- `logging.redactSensitive`：`off` | `tools`（默认：`tools`）
- `logging.redactPatterns`：正则表达式字符串数组（覆盖默认值）
  - 使用原始正则表达式字符串（自动 `gi`），或在需要自定义标志时使用 `/pattern/flags`。
  - 匹配通过保留前 6 + 后 4 个字符（长度 >= 18）进行屏蔽，否则为 `***`。
  - 默认值涵盖常见的键赋值、CLI 标志、JSON 字段、bearer 标头、PEM 块、流行的令牌前缀以及支付凭据字段名称，如卡号、CVC/CVV、共享支付令牌和支付凭据。

无论 `logging.redactSensitive` 如何，某些安全边界总是删除。这包括 Control UI 工具调用事件、`sessions_history` 工具输出、诊断支持导出、提供商错误观察、exec 批准命令显示以及网关 WebSocket 协议日志。这些面仍然可以使用 `logging.redactPatterns` 作为额外模式，但 `redactSensitive: "off"` 不会使它们发出原始秘密。

## 网关 WebSocket 日志

网关以两种模式打印 WebSocket 协议日志：

- **正常模式（无 `--verbose`）**：仅打印"有趣的" RPC 结果：
  - 错误（`ok=false`）
  - 慢调用（默认阈值：`>= 50ms`）
  - 解析错误
- **详细模式（`--verbose`）**：打印所有 WS 请求/响应流量。

### WS 日志样式

`openclaw gateway` 支持每网关样式切换：

- `--ws-log auto`（默认）：正常模式优化；详细模式使用紧凑输出
- `--ws-log compact`：详细时紧凑输出（配对请求/响应）
- `--ws-log full`：详细时完整的每帧输出
- `--compact`：`--ws-log compact` 的别名

示例：

```bash
# 优化（仅错误/慢）
openclaw gateway

# 显示所有 WS 流量（配对）
openclaw gateway --verbose --ws-log compact

# 显示所有 WS 流量（完整元数据）
openclaw gateway --verbose --ws-log full
```

## 控制台格式（子系统日志）

控制台格式化程序具有 **TTY 感知能力**，并打印一致的、带前缀的行。子系统日志记录器保持输出分组且可扫描。

行为：

- 每行的**子系统前缀**（例如 `[gateway]`、`[canvas]`、`[tailscale]`）
- **子系统颜色**（每个子系统稳定）加级别颜色
- 当输出是 TTY 或环境看起来像丰富的终端时**着色**（`TERM`/`COLORTERM`/`TERM_PROGRAM`），尊重 `NO_COLOR`
- **缩短的子系统前缀**：删除前导 `gateway/` + `channels/`，保留最后 2 个段（例如 `whatsapp/outbound`）
- **按子系统分类的子日志记录器**（自动前缀 + 结构化字段 `{ subsystem }`）
- 用于 QR/UX 输出的 **`logRaw()`**（无前缀，无格式化）
- **控制台样式**（例如 `pretty | compact | json`）
- **控制台日志级别**与文件日志级别分离（当 `logging.level` 设置为 `debug`/`trace` 时，文件保持完整细节）
- **WhatsApp 消息正文**在 `debug` 记录（使用 `--verbose` 查看它们）

这使现有文件日志保持稳定，同时使交互式输出可扫描。

## 相关链接

- [日志](/logging)
- [OpenTelemetry 导出](/gateway/opentelemetry)
- [诊断导出](/gateway/diagnostics)
