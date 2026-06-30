---
summary: "`openclaw channels` 的 CLI 参考（账户、状态、登录/注销、日志）"
read_when:
  - 你想添加/删除频道账户（WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（插件）/Signal/iMessage/Matrix）
  - 你想检查频道状态或查看频道日志
title: "Channels"
---

# `openclaw channels`

管理聊天频道账户及其在 Gateway 上的运行时状态。

相关文档：

- 频道指南：[Channels](/channels)
- Gateway 配置：[Configuration](/gateway/configuration)

## 常用命令

```bash
openclaw channels list
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

## 状态/能力/解析/日志

- `channels status`：`--probe`、`--timeout <ms>`、`--json`
- `channels capabilities`：`--channel <name>`、`--account <id>`（仅与 `--channel` 一起使用）、`--target <dest>`、`--timeout <ms>`、`--json`
- `channels resolve`：`<entries...>`、`--channel <name>`、`--account <id>`、`--kind <auto|user|group>`、`--json`
- `channels logs`：`--channel <name|all>`、`--lines <n>`、`--json`

`channels status --probe` 是实时路径：在可达的 gateway 上，它运行每账户的 `probeAccount` 和可选的 `auditAccount` 检查，因此输出可以包含传输状态加上探测结果，如 `works`、`probe failed`、`audit ok` 或 `audit failed`。
如果 gateway 不可达，`channels status` 会回退到仅配置摘要，而不是实时探测输出。

不要使用 `openclaw sessions`、Gateway `sessions.list` 或 agent `sessions_list` 工具作为频道套接字健康信号。这些界面报告存储的对话行，而不是提供商运行时状态。Discord 提供商重启后，已连接但安静的账户可能是健康的，但在下一个入站或出站对话事件之前不会出现 Discord 会话行。

## 添加/删除账户

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

<Tip>
`openclaw channels add --help` 显示每频道标志（令牌、私钥、应用令牌、signal-cli 路径等）。
</Tip>

`channels remove` 仅对已安装/已配置的频道插件有效。对于可安装的目录频道，请先使用 `channels add`。
对于由运行时支持的频道插件，`channels remove` 还会要求正在运行的 Gateway 停止所选账户，然后再更新配置，这样禁用或删除账户就不会在重启前保留旧的监听器。

常见的非交互式添加界面包括：

- 机器人令牌频道：`--token`、`--bot-token`、`--app-token`、`--token-file`
- Signal/iMessage 传输字段：`--signal-number`、`--cli-path`、`--http-url`、`--http-host`、`--http-port`、`--db-path`、`--service`、`--region`
- Google Chat 字段：`--webhook-path`、`--webhook-url`、`--audience-type`、`--audience`
- Matrix 字段：`--homeserver`、`--user-id`、`--access-token`、`--password`、`--device-name`、`--initial-sync-limit`
- Nostr 字段：`--private-key`、`--relay-urls`
- Tlon 字段：`--ship`、`--url`、`--code`、`--group-channels`、`--dm-allowlist`、`--auto-discover-channels`
- `--use-env` 用于支持的默认账户 env 支持认证

如果在标志驱动的添加命令期间需要安装频道插件，OpenClaw 会使用频道的默认安装源，而不会打开交互式插件安装提示。

当你不带标志运行 `openclaw channels add` 时，交互式向导可以提示：

- 每个所选频道的账户 ID
- 这些账户的可选显示名称
- `立即将已配置的频道账户绑定到 agent？`

如果你确认立即绑定，向导会询问哪个 agent 应该拥有每个已配置的频道账户，并写入账户范围的路由绑定。

你也可以稍后使用 `openclaw agents bindings`、`openclaw agents bind` 和 `openclaw agents unbind` 管理相同的路由规则（参见 [agents](/cli/agents)）。

当你向仍使用单账户顶级设置的频道添加非默认账户时，OpenClaw 会将账户范围的顶级值提升到频道的账户映射中，然后再写入新账户。大多数频道将这些值放在 `channels.<channel>.accounts.default` 中，但捆绑频道可以保留现有的匹配提升账户。Matrix 是当前的示例：如果已经存在一个命名账户，或者 `defaultAccount` 指向现有命名账户，提升会保留该账户，而不是创建新的 `accounts.default`。

路由行为保持一致：

- 现有的仅频道绑定（无 `accountId`）继续匹配默认账户。
- 非交互式模式下，`channels add` 不会自动创建或重写绑定。
- 交互式设置可以选择性地添加账户范围的绑定。

如果你的配置已处于混合状态（存在命名账户且顶级单账户值仍然设置），请运行 `openclaw doctor --fix` 将账户范围的值移动到为该频道选择的提升账户中。大多数频道提升到 `accounts.default`；Matrix 可以保留现有的命名/默认目标。

## 登录和注销（交互式）

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

- `channels login` 支持 `--verbose`。
- 当只配置了一个支持的登录目标时，`channels login` 和 `logout` 可以自动推断频道。
- `channels logout` 在可达时优先使用实时 Gateway 路径，这样注销会在清除频道认证状态之前停止任何活跃的监听器。如果本地 Gateway 不可达，则回退到本地认证清理。
- 从 gateway 主机上的终端运行 `channels login`。Agent `exec` 会阻止此交互式登录流程；如果可用，应从聊天中使用频道原生 agent 登录工具（如 `whatsapp_login`）。

## 故障排除

- 运行 `openclaw status --deep` 进行广泛探测。
- 使用 `openclaw doctor` 进行引导修复。
- `openclaw channels list` 打印 `Claude: HTTP 403 ... user:profile` → 使用量快照需要 `user:profile` 范围。使用 `--no-usage`，或提供 claude.ai 会话密钥（`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`），或通过 Claude CLI 重新认证。
- 当 gateway 不可达时，`openclaw channels status` 回退到仅配置摘要。如果支持的频道凭证通过 SecretRef 配置但在当前命令路径中不可用，它会将该账户报告为已配置但带有降级说明，而不是显示为未配置。

## 能力探测

获取提供商能力提示（可用时的意图/范围）加上静态功能支持：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

备注：

- `--channel` 是可选的；省略它可列出所有频道（包括扩展）。
- `--account` 仅与 `--channel` 一起有效。
- `--target` 接受 `channel:<id>` 或原始数字频道 ID，仅适用于 Discord。
- 探测特定于提供商：Discord 意图 + 可选频道权限；Slack 机器人 + 用户范围；Telegram 机器人标志 + webhook；Signal 守护进程版本；Microsoft Teams 应用令牌 + Graph 角色/范围（已知时注明）。没有探测的频道报告 `Probe: unavailable`。

## 将名称解析为 ID

使用提供商目录将频道/用户名称解析为 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

备注：

- 使用 `--kind user|group|auto` 强制目标类型。
- 当多个条目共享相同名称时，解析优先选择活跃匹配。
- `channels resolve` 是只读的。如果所选账户通过 SecretRef 配置但该凭证在当前命令路径中不可用，命令会返回降级的未解析结果并附带说明，而不是中止整个运行。
- `channels resolve` 不安装频道插件。在解析可安装目录频道的名称之前，使用 `channels add --channel <name>`。

## 相关

- [CLI 参考](/cli)
- [频道概览](/channels)
