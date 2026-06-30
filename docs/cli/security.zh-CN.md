---
summary: "`openclaw security` 的 CLI 参考（审计并修复常见的安全问题）"
read_when:
  - 你想对配置/状态进行快速安全审计时
  - 你想应用安全的"fix"建议（权限、收紧默认值）时
title: "Security"
---

# `openclaw security`

安全工具（审计 + 可选修复）。

相关：

- 安全指南：[Security](/gateway/security)

## 审计

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

普通的 `security audit` 保持在冷配置/文件系统/只读路径上。它默认不发现插件运行时安全收集器，因此常规审计不会加载每个已安装的插件运行时。使用 `--deep` 包含尽力而为的实时 Gateway 探测和插件拥有的安全审计收集器；明确的内部调用者在已经有适当运行时范围时也可以选择加入这些插件拥有的收集器。

当多个 DM 发件人共享主会话时，审计会发出警告并推荐**安全 DM 模式**：`session.dmScope="per-channel-peer"`（或多账户频道的 `per-account-channel-peer`）用于共享收件箱。
这是用于协作/共享收件箱加固的。由相互不信任/对抗性运营商共享的单个 Gateway 不是推荐的设置；使用单独的 gateway（或单独的操作系统用户/主机）分割信任边界。
当配置暗示可能的共享用户入口（例如开放 DM/群组策略、已配置的群组目标或通配符发件人规则）时，它还会发出 `security.trust_model.multi_user_heuristic`，并提醒你 OpenClaw 默认是个人助手信任模型。
对于有意的共享用户设置，审计指导是对所有会话进行沙箱化，保持文件系统访问限于工作空间范围，并在该运行时上不存放个人/私人身份或凭据。
当使用没有沙箱且启用了网络/浏览器工具的小模型（`<=300B`）时，它也会发出警告。
对于 webhook 入口，当 `hooks.token` 重用 Gateway 令牌时、`hooks.token` 较短时、`hooks.path="/"` 时、`hooks.defaultSessionKey` 未设置时、`hooks.allowedAgentIds` 不受限制时、请求 `sessionKey` 覆盖已启用时，以及覆盖已启用但没有 `hooks.allowedSessionKeyPrefixes` 时，它会发出警告。
当沙箱 Docker 设置被配置但沙箱模式关闭时、`gateway.nodes.denyCommands` 使用无效的模式类/未知条目时（仅精确的节点命令名称匹配，不是 shell 文本过滤）、`gateway.nodes.allowCommands` 明确启用危险的节点命令时、全局 `tools.profile="minimal"` 被代理工具配置文件覆盖时、开放群组在没有沙箱/工作空间保护的情况下公开运行时/文件系统工具时，以及已安装的插件工具在宽松的工具策略下可能可达时，它也会发出警告。
它还标记 `gateway.allowRealIpFallback=true`（如果代理配置错误，存在头欺骗风险）和 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录的元数据泄漏）。
当沙箱浏览器使用没有 `sandbox.browser.cdpSourceRange` 的 Docker `bridge` 网络时，它也会发出警告。
它还标记危险的沙箱 Docker 网络模式（包括 `host` 和 `container:*` 命名空间加入）。
当现有的沙箱浏览器 Docker 容器有缺失/过时的哈希标签时（例如缺少 `openclaw.browserConfigEpoch` 的迁移前容器），它会发出警告并推荐 `openclaw sandbox recreate --browser --all`。
当基于 npm 的插件/hook 安装记录未锁定、缺少完整性元数据或与当前安装的包版本漂移时，它也会发出警告。
当频道允许列表依赖可变名称/电子邮件/标签而不是稳定 ID 时（适用的 Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 范围），它会发出警告。
当 `gateway.auth.mode="none"` 使 Gateway HTTP API 在没有共享密钥的情况下可达（`/tools/invoke` 加上任何已启用的 `/v1/*` 端点）时，它会发出警告。
带 `dangerous`/`dangerously` 前缀的设置是明确的应急操作员覆盖；启用其中一个本身不是安全漏洞报告。
有关完整的危险参数清单，请参阅 [Security](/gateway/security) 中的"不安全或危险标志摘要"部分。

SecretRef 行为：

- `security audit` 在只读模式下为其目标路径解析受支持的 SecretRef。
- 如果 SecretRef 在当前命令路径中不可用，审计继续并报告 `secretDiagnostics`（而不是崩溃）。
- `--token` 和 `--password` 仅覆盖该命令调用的深度探测认证；它们不重写配置或 SecretRef 映射。

## JSON 输出

使用 `--json` 进行 CI/策略检查：

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

如果 `--fix` 和 `--json` 结合使用，输出包括修复操作和最终报告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 更改的内容

`--fix` 应用安全、确定性的修复措施：

- 将常见的 `groupPolicy="open"` 翻转为 `groupPolicy="allowlist"`（包括支持频道中的账户变体）
- 当 WhatsApp 群组策略翻转为 `allowlist` 时，如果该列表存在且配置尚未定义 `allowFrom`，则从存储的 `allowFrom` 文件中为 `groupAllowFrom` 种子数据
- 将 `logging.redactSensitive` 从 `"off"` 设置为 `"tools"`
- 收紧状态/配置和常见敏感文件的权限（`credentials/*.json`、`auth-profiles.json`、`sessions.json`、会话 `*.jsonl`）
- 还收紧从 `openclaw.json` 引用的配置包含文件
- 在 POSIX 主机上使用 `chmod`，在 Windows 上使用 `icacls` 重置

`--fix` **不**：

- 轮换令牌/密码/API 密钥
- 禁用工具（`gateway`、`cron`、`exec` 等）
- 更改 gateway 绑定/认证/网络暴露选择
- 删除或重写插件/技能

## 相关

- [CLI 参考](/cli)
- [安全审计](/gateway/security)
