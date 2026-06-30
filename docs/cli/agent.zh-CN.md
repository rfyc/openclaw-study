---
summary: "`openclaw agent` 的 CLI 参考（通过 Gateway 发送单次 agent 回合）"
read_when:
  - 你想从脚本中运行一次 agent 回合（可选择投递回复）
title: "Agent"
---

# `openclaw agent`

通过 Gateway 运行一次 agent 回合（使用 `--local` 进行嵌入式运行）。
使用 `--agent <id>` 直接定向已配置的 agent。

至少传递一个会话选择器：

- `--to <dest>`
- `--session-id <id>`
- `--agent <id>`

相关：

- Agent 发送工具：[Agent send](/tools/agent-send)

## 选项

- `-m, --message <text>`：必填消息正文
- `-t, --to <dest>`：用于派生会话密钥的收件人
- `--session-id <id>`：显式会话 ID
- `--agent <id>`：agent ID；覆盖路由绑定
- `--model <id>`：本次运行的模型覆盖（`provider/model` 或模型 ID）
- `--thinking <level>`：agent 思考等级（`off`、`minimal`、`low`、`medium`、`high`，以及提供商支持的自定义等级，如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`：为会话持久化详细等级
- `--channel <channel>`：投递频道；省略则使用主会话频道
- `--reply-to <target>`：投递目标覆盖
- `--reply-channel <channel>`：投递频道覆盖
- `--reply-account <id>`：投递账户覆盖
- `--local`：直接运行嵌入式 agent（插件注册表预加载之后）
- `--deliver`：将回复发回到所选频道/目标
- `--timeout <seconds>`：覆盖 agent 超时时间（默认 600 或配置值）
- `--json`：输出 JSON

## 示例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## 备注

- Gateway 模式在 Gateway 请求失败时会回退到嵌入式 agent。使用 `--local` 强制从一开始就使用嵌入式执行。
- `--local` 仍然会先预加载插件注册表，因此插件提供的提供商、工具和频道在嵌入式运行期间仍然可用。
- `--local` 和嵌入式回退运行被视为单次运行。为该本地进程打开的捆绑 MCP 回环资源和暖 Claude stdio 会话在回复后会被清理，因此脚本调用不会保留本地子进程。
- Gateway 支持的运行将 Gateway 拥有的 MCP 回环资源保留在运行中的 Gateway 进程下；较旧的客户端可能仍会发送历史清理标志，但 Gateway 将其作为兼容性空操作接受。
- `--channel`、`--reply-channel` 和 `--reply-account` 影响回复投递，不影响会话路由。
- `--json` 将 stdout 保留用于 JSON 响应。Gateway、插件和嵌入式回退诊断会路由到 stderr，以便脚本可以直接解析 stdout。
- 嵌入式回退 JSON 包含 `meta.transport: "embedded"` 和 `meta.fallbackFrom: "gateway"`，以便脚本区分回退运行和 Gateway 运行。
- 如果 Gateway 接受了 agent 运行但 CLI 等待最终回复超时，嵌入式回退会使用一个新的显式 `gateway-fallback-*` 会话/运行 ID，并报告 `meta.fallbackReason: "gateway_timeout"` 加上回退会话字段。这避免了竞争 Gateway 拥有的对话记录锁，或静默替换原始路由的对话会话。
- 当此命令触发 `models.json` 重新生成时，SecretRef 管理的提供商凭证会持久化为非密钥标记（例如 env 变量名 `secretref-env:ENV_VAR_NAME` 或 `secretref-managed`），而不是解析后的密钥明文。
- 标记写入是源权威的：OpenClaw 从活动源配置快照持久化标记，而不是从解析后的运行时密钥值。

## 相关

- [CLI 参考](/cli)
- [Agent 运行时](/concepts/agent)
