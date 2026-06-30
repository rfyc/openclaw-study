---
summary: "目标调试日志的诊断标志"
read_when:
  - 需要在不提高全局日志级别的情况下进行目标调试日志时
  - 需要为支持捕获子系统特定日志时
title: "诊断标志"
---

诊断标志允许你在不打开全局详细日志记录的情况下启用目标调试日志。标志是可选加入的，除非子系统检查它们，否则没有效果。

## 工作原理

- 标志是字符串（不区分大小写）。
- 你可以在配置中或通过环境变量覆盖启用标志。
- 支持通配符：
  - `telegram.*` 匹配 `telegram.http`
  - `*` 启用所有标志

## 通过配置启用

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

多个标志：

```json
{
  "diagnostics": {
    "flags": ["telegram.http", "brave.http", "gateway.*"]
  }
}
```

更改标志后重启网关。

## 环境变量覆盖（一次性）

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

禁用所有标志：

```bash
OPENCLAW_DIAGNOSTICS=0
```

## 时间线构件

`timeline` 标志为外部 QA 工具套件写入结构化的启动和运行时计时事件：

```bash
OPENCLAW_DIAGNOSTICS=timeline \
OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=/tmp/openclaw-timeline.jsonl \
openclaw gateway run
```

你也可以在配置中启用它：

```json
{
  "diagnostics": {
    "flags": ["timeline"]
  }
}
```

时间线文件路径仍然来自
`OPENCLAW_DIAGNOSTICS_TIMELINE_PATH`。当 `timeline` 仅从配置中启用时，最早的配置加载 span 不会发出，因为 OpenClaw 尚未读取配置；后续启动 span 使用配置标志。

`OPENCLAW_DIAGNOSTICS=1`、`OPENCLAW_DIAGNOSTICS=all` 和
`OPENCLAW_DIAGNOSTICS=*` 也启用时间线，因为它们启用所有诊断标志。当你只想要 JSONL 计时构件时，优先使用 `timeline`。

时间线记录使用 `openclaw.diagnostics.v1` 信封。事件可以包含进程 ID、阶段名称、span 名称、持续时间、插件 ID、依赖项数量、事件循环延迟样本、提供商操作名称、子进程退出状态以及启动错误名称/消息。将时间线文件视为本地诊断构件；在分享到机器外之前先审查它们。

## 日志去向

标志将日志发送到标准诊断日志文件。默认情况下：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

如果设置了 `logging.file`，请使用该路径。日志是 JSONL 格式（每行一个 JSON 对象）。基于 `logging.redactSensitive` 的脱敏仍然适用。

## 提取日志

选择最新的日志文件：

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

过滤 Telegram HTTP 诊断：

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

过滤 Brave Search HTTP 诊断：

```bash
rg "brave http" /tmp/openclaw/openclaw-*.log
```

或者在复现时跟踪：

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

对于远程网关，你还可以使用 `openclaw logs --follow`（参见 [/cli/logs](/cli/logs)）。

## 注意事项

- 如果 `logging.level` 设置高于 `warn`，这些日志可能会被抑制。默认 `info` 是可以的。
- `brave.http` 记录 Brave Search 请求 URL/查询参数、响应状态/计时和缓存命中/未命中/写入事件。它不记录 API 密钥或响应正文，但搜索查询可能是敏感的。
- 标志可以安全地保持启用状态；它们只影响特定子系统的日志量。
- 使用 [/logging](/logging) 更改日志目标、级别和脱敏。

## 相关

- [网关诊断](/gateway/diagnostics)
- [网关故障排除](/gateway/troubleshooting)
