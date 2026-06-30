---
summary: "为错误报告创建可共享的网关诊断捆绑包"
title: "诊断导出"
read_when:
  - 准备错误报告或支持请求
  - 调试网关崩溃、重启、内存压力或超大有效载荷
  - 查看记录或删除的诊断数据
---

OpenClaw 可以为错误报告创建本地诊断 zip 包。它结合了经过清理的网关状态、健康、日志、配置形状和最近的无有效载荷稳定性事件。

在审查诊断捆绑包之前，请将其视为秘密对待。它们的设计是省略或删除有效载荷和凭据，但仍然汇总了本地网关日志和主机级运行时状态。

## 快速开始

```bash
openclaw gateway diagnostics export
```

该命令打印写入的 zip 路径。要选择路径：

```bash
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
```

用于自动化：

```bash
openclaw gateway diagnostics export --json
```

## 聊天命令

所有者可以在聊天中使用 `/diagnostics [note]` 请求本地网关导出。当错误发生在真实对话中，并且你想要一个可复制粘贴的报告用于支持时，请使用此方法：

1. 在你注意到问题的对话中发送 `/diagnostics`。如果有帮助，添加一个简短的注释，例如 `/diagnostics bad tool choice`。
2. OpenClaw 发送诊断前导，并请求一次明确的 exec 批准。批准将运行 `openclaw gateway diagnostics export --json`。不要通过允许全部规则批准诊断。
3. 批准后，OpenClaw 回复一个包含本地捆绑包路径、清单摘要、隐私说明和相关会话 id 的可粘贴报告。

在群聊中，所有者仍然可以运行 `/diagnostics`，但 OpenClaw 不会将诊断详情发布到共享聊天中。它通过私有批准路由将前导、批准提示、网关导出结果和 Codex 会话/线程细分发送给所有者。群组只会收到一个简短通知，说明诊断流程已私密发送。如果 OpenClaw 找不到私有所有者路由，命令失败关闭并要求所有者从 DM 运行它。

当活跃的 OpenClaw 会话使用原生 OpenAI Codex 工具时，同一 exec 批准也涵盖 OpenClaw 知道的 Codex 运行时线程的 OpenAI 反馈上传。该上传与本地网关 zip 分开，仅出现在 Codex 工具会话中。批准前，提示解释批准诊断也将发送 Codex 反馈，但不会列出 Codex 会话或线程 id。批准后，聊天回复列出了发送到 OpenAI 服务器的渠道、OpenClaw 会话 id、Codex 线程 id 和线程的本地恢复命令。如果你拒绝或忽略批准，OpenClaw 不运行导出，不发送 Codex 反馈，也不打印 Codex id。

这使常见的 Codex 调试循环变得简短：在 Telegram、Discord 或其他渠道注意到错误行为，运行 `/diagnostics`，批准一次，与支持共享报告，然后如果你想在本地检查原生 Codex 线程，运行打印的 `codex resume <thread-id>` 命令。有关检查工作流，参见 [Codex 工具](/plugins/codex-harness#inspect-a-codex-thread-from-the-cli)。

## 导出包含的内容

zip 包包括：

- `summary.md`：供支持使用的人类可读概述。
- `diagnostics.json`：配置、日志、状态、健康和稳定性数据的机器可读摘要。
- `manifest.json`：导出元数据和文件列表。
- 经过清理的配置形状和非秘密配置详情。
- 经过清理的日志摘要和最近的已删除日志行。
- 尽力而为的网关状态和健康快照。
- `stability/latest.json`：最新持久化的稳定性捆绑包（当可用时）。

即使网关不健康，导出也很有用。如果网关无法响应状态或健康请求，当可用时仍然会收集本地日志、配置形状和最新稳定性捆绑包。

## 隐私模型

诊断设计为可共享。导出保留有助于调试的操作数据，例如：

- 子系统名称、插件 id、提供商 id、渠道 id 和已配置的模式
- 状态码、持续时间、字节计数、队列状态和内存读数
- 经过清理的日志元数据和已删除的操作消息
- 配置形状和非秘密功能设置

导出省略或删除：

- 聊天文本、提示、指令、webhook 正文和工具输出
- 凭据、API 密钥、令牌、Cookie 和秘密值
- 原始请求或响应正文
- 账户 id、消息 id、原始会话 id、主机名和本地用户名

当日志消息看起来像用户、聊天、提示或工具有效载荷文本时，导出只保留消息被省略的事实和字节计数。

## 稳定性记录器

当诊断启用时，网关默认记录有界的无有效载荷稳定性流。它用于操作事实，而不是内容。

当网关保持运行但 Node.js 事件循环或 CPU 看起来饱和时，同一诊断心跳记录活跃性样本。这些 `diagnostic.liveness.warning` 事件包含事件循环延迟、事件循环利用率、CPU 核心比率以及活跃/等待/排队的会话计数。空闲样本在 `info` 级别保留在遥测中。仅当工作正在等待或排队，或活跃工作与持续的事件循环延迟重叠时，活跃性样本才成为网关警告。在其他情况健康的后台工作期间的瞬态最大延迟峰值保留在调试日志中。它们本身不会重启网关。

检查实时记录器：

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --json
```

在致命退出、关闭超时或重启启动失败后检查最新持久化稳定性捆绑包：

```bash
openclaw gateway stability --bundle latest
```

从最新持久化捆绑包创建诊断 zip：

```bash
openclaw gateway stability --bundle latest --export
```

当事件存在时，持久化捆绑包位于 `~/.openclaw/logs/stability/` 下。

## 有用选项

```bash
openclaw gateway diagnostics export \
  --output openclaw-diagnostics.zip \
  --log-lines 5000 \
  --log-bytes 1000000
```

- `--output <path>`：写入特定的 zip 路径。
- `--log-lines <count>`：要包含的最大经过清理的日志行数。
- `--log-bytes <bytes>`：要检查的最大日志字节数。
- `--url <url>`：用于状态和健康快照的网关 WebSocket URL。
- `--token <token>`：用于状态和健康快照的网关令牌。
- `--password <password>`：用于状态和健康快照的网关密码。
- `--timeout <ms>`：状态和健康快照超时。
- `--no-stability-bundle`：跳过持久化稳定性捆绑包查找。
- `--json`：打印机器可读的导出元数据。

## 禁用诊断

诊断默认启用。要禁用稳定性记录器和诊断事件收集：

```json5
{
  diagnostics: {
    enabled: false,
  },
}
```

禁用诊断会减少错误报告的详细程度。它不影响正常的网关日志记录。

## 相关链接

- [健康检查](/gateway/health)
- [网关 CLI](/cli/gateway#gateway-diagnostics-export)
- [网关协议](/gateway/protocol#system-and-identity)
- [日志](/logging)
- [OpenTelemetry 导出](/gateway/opentelemetry) — 将诊断流式传输到收集器的单独流程
