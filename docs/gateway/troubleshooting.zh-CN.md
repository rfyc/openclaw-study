---
summary: "网关、渠道、自动化、节点和浏览器的深度故障排除运行手册"
read_when:
  - 故障排除中心将你指向此处进行更深入的诊断时
  - 你需要基于症状的稳定运行手册部分和精确命令时
title: "故障排除"
sidebarTitle: "故障排除"
---

本页是深度运行手册。如果你想先了解快速分类流程，请从 [/help/troubleshooting](/help/troubleshooting) 开始。

## 命令阶梯

首先按此顺序运行这些命令：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

预期的健康信号：

- `openclaw gateway status` 显示 `Runtime: running`、`Connectivity probe: ok` 和 `Capability: ...` 行。
- `openclaw doctor` 报告没有阻止配置/服务问题。
- `openclaw channels status --probe` 显示实时每账户传输状态，以及受支持的探测/审计结果（如 `works` 或 `audit ok`）。

## 分裂大脑安装和更新配置保护

当网关服务在更新后意外停止，或日志显示一个 `openclaw` 二进制文件比最后写入 `openclaw.json` 的版本更旧时使用此方法。

OpenClaw 使用 `meta.lastTouchedVersion` 标记配置写入。只读命令仍然可以检查由更新版本 OpenClaw 写入的配置，但进程和服务变更会拒绝从旧版本二进制文件继续。阻止的操作包括网关服务启动、停止、重启、卸载、强制服务重新安装、服务模式网关启动和 `gateway --force` 端口清理。

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step title="修复 PATH">
    修复 `PATH` 以便 `openclaw` 解析到更新的安装，然后重新运行该操作。
  </Step>
  <Step title="重新安装网关服务">
    从更新的安装重新安装预期的网关服务：

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="删除过时的包装器">
    删除仍然指向旧 `openclaw` 二进制文件的过时系统包或旧包装器条目。
  </Step>
</Steps>

<Warning>
仅用于有意降级或紧急恢复，为单个命令设置 `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1`。正常操作保持未设置。
</Warning>

## Anthropic 长上下文所需的 429 额外使用量

当日志/错误包含：`HTTP 429: rate_limit_error: Extra usage is required for long context requests` 时使用此方法。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

查找：

- 选定的 Anthropic Opus/Sonnet 模型具有 `params.context1m: true`。
- 当前 Anthropic 凭据不符合长上下文使用条件。
- 仅在需要 1M beta 路径的长会话/模型运行中请求失败。

修复选项：

<Steps>
  <Step title="禁用 context1m">
    为该模型禁用 `context1m` 以回退到正常的上下文窗口。
  </Step>
  <Step title="使用符合条件的凭据">
    使用符合长上下文请求条件的 Anthropic 凭据，或切换到 Anthropic API 密钥。
  </Step>
  <Step title="配置回退模型">
    配置回退模型，以便在 Anthropic 长上下文请求被拒绝时运行可以继续。
  </Step>
</Steps>

相关：

- [Anthropic](/providers/anthropic)
- [令牌使用和成本](/reference/token-use)
- [为什么我看到来自 Anthropic 的 HTTP 429？](/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 本地 OpenAI 兼容后端通过直接探测但代理运行失败

在以下情况下使用：

- `curl ... /v1/models` 有效
- 小型直接 `/v1/chat/completions` 调用有效
- OpenClaw 模型运行仅在正常代理轮次时失败

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

查找：

- 直接的小型调用成功，但 OpenClaw 运行仅在较大提示时失败
- 即使直接 `/v1/chat/completions` 使用相同的裸模型 id 也有效时出现 `model_not_found` 或 404 错误
- 关于 `messages[].content` 期望字符串的后端错误
- 使用 OpenAI 兼容本地后端时的间歇性 `incomplete turn detected ... stopReason=stop payloads=0` 警告
- 仅在较大提示令牌计数或完整代理运行时提示时出现的后端崩溃

<AccordionGroup>
  <Accordion title="常见特征">
    - `model_not_found`（带本地 MLX/vLLM 风格服务器）→ 验证 `baseUrl` 包含 `/v1`，`api` 对于 `/v1/chat/completions` 后端为 `"openai-completions"`，且 `models.providers.<provider>.models[].id` 是裸的提供者本地 id。使用提供者前缀选择一次，例如 `mlx/mlx-community/Qwen3-30B-A3B-6bit`；将目录条目保留为 `mlx-community/Qwen3-30B-A3B-6bit`。
    - `messages[...].content: invalid type: sequence, expected a string` → 后端拒绝结构化的 Chat Completions 内容部分。修复：设置 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
    - `incomplete turn detected ... stopReason=stop payloads=0` → 后端完成了 Chat Completions 请求但该轮次没有返回用户可见的助手文本。OpenClaw 为空的 OpenAI 兼容轮次重试一次重放安全；持续失败通常意味着后端正在发出空/非文本内容或抑制最终答案文本。
    - 直接小型请求成功，但 OpenClaw 代理运行在后端/模型崩溃时失败（例如某些 `inferrs` 构建上的 Gemma）→ OpenClaw 传输可能已经正确；后端在较大的代理运行时提示形状上失败。
    - 禁用工具后失败减少但没有消失 → 工具模式是压力的一部分，但剩余问题仍然是上游模型/服务器容量或后端错误。

  </Accordion>
  <Accordion title="修复选项">
    1. 为仅字符串 Chat Completions 后端设置 `compat.requiresStringContent: true`。
    2. 为无法可靠处理 OpenClaw 工具模式表面的模型/后端设置 `compat.supportsTools: false`。
    3. 尽可能降低提示压力：较小的工作区引导、较短的会话历史、较轻的本地模型，或具有更强长上下文支持的后端。
    4. 如果小型直接请求继续通过而 OpenClaw 代理轮次仍在后端崩溃，将其视为上游服务器/模型限制，并在那里提交接受有效载荷形状的复现。
  </Accordion>
</AccordionGroup>

相关：

- [配置](/gateway/configuration)
- [本地模型](/gateway/local-models)
- [OpenAI 兼容端点](/gateway/configuration-reference#openai-compatible-endpoints)

## 无回复

如果渠道已启动但没有任何回应，在重新连接任何内容之前请检查路由和策略。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

查找：

- 私信发送者的配对待处理。
- 群组提及门控（`requireMention`、`mentionPatterns`）。
- 渠道/群组允许列表不匹配。

常见特征：

- `drop guild message (mention required` → 群组消息被忽略，直到提及。
- `pairing request` → 发送者需要批准。
- `blocked` / `allowlist` → 发送者/渠道被策略过滤。

相关：

- [渠道故障排除](/channels/troubleshooting)
- [群组](/channels/groups)
- [配对](/channels/pairing)

## 仪表板 Control UI 连接性

当仪表板/Control UI 无法连接时，验证 URL、认证模式和安全上下文假设。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

查找：

- 正确的探测 URL 和仪表板 URL。
- 客户端和网关之间的认证模式/令牌不匹配。
- 需要设备身份时使用 HTTP。

<AccordionGroup>
  <Accordion title="连接/认证特征">
    - `device identity required` → 非安全上下文或缺少设备认证。
    - `origin not allowed` → 浏览器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中（或你从非环回浏览器来源连接，没有明确的允许列表）。
    - `device nonce required` / `device nonce mismatch` → 客户端没有完成基于挑战的设备认证流（`connect.challenge` + `device.nonce`）。
    - `device signature invalid` / `device signature expired` → 客户端为当前握手签署了错误的有效载荷（或过时的时间戳）。
    - `AUTH_TOKEN_MISMATCH` 且 `canRetryWithDeviceToken=true` → 客户端可以使用缓存的设备令牌进行一次受信任的重试。
    - 该缓存令牌重试重用与配对设备令牌一起存储的缓存范围集。显式 `deviceToken` / 显式 `scopes` 调用者保留其请求的范围集。
    - 在该重试路径之外，连接认证优先级是：明确的共享令牌/密码优先，然后是明确的 `deviceToken`，然后是存储的设备令牌，然后是引导令牌。
    - 在异步 Tailscale Serve Control UI 路径上，来自同一 `{scope, ip}` 的失败尝试在限速器记录失败之前被串行化。来自同一客户端的两次坏的并发重试因此可能在第二次尝试上显示 `retry later` 而不是两个普通不匹配。
    - 来自浏览器来源环回客户端的 `too many failed authentication attempts (retry later)` → 来自同一规范化 `Origin` 的重复失败被暂时锁定；另一个 localhost 来源使用单独的桶。
    - 该重试后反复出现 `unauthorized` → 共享令牌/设备令牌漂移；如果需要，刷新令牌配置并重新批准/轮换设备令牌。
    - `gateway connect failed:` → 错误的主机/端口/URL 目标。

  </Accordion>
</AccordionGroup>

### 认证详情码快速映射

使用失败的 `connect` 响应中的 `error.details.code` 来选择下一步操作：

| 详情码                       | 含义                                                                                                                                                                     | 推荐操作                                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AUTH_TOKEN_MISSING`         | 客户端没有发送必需的共享令牌。                                                                                                                                           | 在客户端粘贴/设置令牌并重试。对于仪表板路径：`openclaw config get gateway.auth.token` 然后粘贴到 Control UI 设置中。                                                                                                                 |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌与网关认证令牌不匹配。                                                                                                                                           | 如果 `canRetryWithDeviceToken=true`，允许一次受信任的重试。缓存令牌重试重用存储的已批准范围；显式 `deviceToken` / `scopes` 调用者保留请求的范围。如果仍然失败，运行[令牌漂移恢复清单](/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 缓存的每设备令牌过期或已撤销。                                                                                                                                           | 使用 [devices CLI](/cli/devices) 轮换/重新批准设备令牌，然后重新连接。                                                                                                                                                               |
| `PAIRING_REQUIRED`           | 设备身份需要批准。检查 `error.details.reason` 中的 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，并在存在时使用 `requestId` / `remediationHint`。 | 批准待处理请求：`openclaw devices list` 然后 `openclaw devices approve <requestId>`。范围/角色升级在你审查请求的访问后使用相同的流程。                                                                                               |

<Note>
使用共享网关令牌/密码进行身份验证的直接环回后端 RPC 不应依赖 CLI 的已配对设备范围基线。如果子代理或其他内部调用仍然以 `scope-upgrade` 失败，验证调用者是否使用 `client.id: "gateway-client"` 和 `client.mode: "backend"`，并且没有强制使用显式的 `deviceIdentity` 或设备令牌。
</Note>

设备认证 v2 迁移检查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日志显示 nonce/签名错误，请更新连接客户端并验证它：

<Steps>
  <Step title="等待 connect.challenge">
    客户端等待网关发出的 `connect.challenge`。
  </Step>
  <Step title="签署有效载荷">
    客户端签署绑定挑战的有效载荷。
  </Step>
  <Step title="发送设备 nonce">
    客户端发送带有相同挑战 nonce 的 `connect.params.device.nonce`。
  </Step>
</Steps>

如果 `openclaw devices rotate` / `revoke` / `remove` 意外被拒绝：

- 配对设备令牌会话只能管理**自己的**设备，除非调用者也有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能请求调用者会话已经持有的操作员范围

相关：

- [配置](/gateway/configuration)（网关认证模式）
- [Control UI](/web/control-ui)
- [设备](/cli/devices)
- [远程访问](/gateway/remote)
- [受信任代理认证](/gateway/trusted-proxy-auth)

## 网关服务未运行

当服务已安装但进程不持续运行时使用此方法。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # 也扫描系统级服务
```

查找：

- `Runtime: stopped` 并附带退出提示。
- 服务配置不匹配（`Config (cli)` 与 `Config (service)`）。
- 端口/监听器冲突。
- 使用 `--deep` 时额外的 launchd/systemd/schtasks 安装。
- `Other gateway-like services detected (best effort)` 清理提示。

<AccordionGroup>
  <Accordion title="常见特征">
    - `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 本地网关模式未启用，或配置文件被覆盖并丢失了 `gateway.mode`。修复：在配置中设置 `gateway.mode="local"`，或重新运行 `openclaw onboard --mode local` / `openclaw setup` 以重新标记预期的本地模式配置。如果你通过 Podman 运行 OpenClaw，默认配置路径是 `~/.openclaw/openclaw.json`。
    - `refusing to bind gateway ... without auth` → 非环回绑定没有有效的网关认证路径（令牌/密码，或配置的受信任代理）。
    - `another gateway instance is already listening` / `EADDRINUSE` → 端口冲突。
    - `Other gateway-like services detected (best effort)` → 存在过时或并行的 launchd/systemd/schtasks 单元。大多数设置应该每台机器保留一个网关；如果你确实需要多个，请隔离端口 + 配置/状态/工作区。参见 [/gateway#multiple-gateways-same-host](/gateway#multiple-gateways-same-host)。
    - doctor 中出现 `System-level OpenClaw gateway service detected` → 系统级 systemd 单元存在，而用户级服务缺失。在允许 doctor 安装用户服务之前，删除或禁用重复项，或者如果系统单元是预期的监督者，则设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。
    - `Gateway service port does not match current gateway config` → 已安装的监督者仍然固定旧的 `--port`。运行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，然后重启网关服务。

  </Accordion>
</AccordionGroup>

相关：

- [后台 exec 和进程工具](/gateway/background-process)
- [配置](/gateway/configuration)
- [Doctor](/gateway/doctor)

## 网关拒绝无效配置

当网关启动以 `Invalid config` 失败，或热重载日志显示跳过了无效编辑时使用此方法。

```bash
openclaw logs --follow
openclaw config file
openclaw config validate
openclaw doctor
```

查找：

- `Invalid config at ...`
- `config reload skipped (invalid config): ...`
- `Config write rejected: ...`
- 活跃配置旁边带时间戳的 `openclaw.json.rejected.*` 文件
- 如果 `doctor --fix` 修复了破损的直接编辑，则带时间戳的 `openclaw.json.clobbered.*` 文件

<AccordionGroup>
  <Accordion title="发生了什么">
    - 配置在启动、热重载或 OpenClaw 拥有的写入期间未能验证。
    - 网关启动关闭失败，而不是重写 `openclaw.json`。
    - 热重载跳过无效的外部编辑并保持当前运行时配置活跃。
    - OpenClaw 拥有的写入在提交之前拒绝无效/破坏性有效载荷，并保存 `.rejected.*`。
    - `openclaw doctor --fix` 拥有修复权。它可以删除非 JSON 前缀或恢复最后已知良好的副本，同时将拒绝的有效载荷保存为 `.clobbered.*`。

  </Accordion>
  <Accordion title="检查和修复">
    ```bash
    CONFIG="$(openclaw config file)"
    ls -lt "$CONFIG".clobbered.* "$CONFIG".rejected.* 2>/dev/null | head
    diff -u "$CONFIG" "$(ls -t "$CONFIG".clobbered.* 2>/dev/null | head -n 1)"
    openclaw config validate
    openclaw doctor
    ```
  </Accordion>
  <Accordion title="常见特征">
    - `.clobbered.*` 存在 → doctor 在修复活跃配置时保留了破损的外部编辑。
    - `.rejected.*` 存在 → OpenClaw 拥有的配置写入在提交之前失败了模式或覆盖检查。
    - `Config write rejected:` → 写入试图丢弃必需的形状、显著缩小文件，或持久化无效配置。
    - `config reload skipped (invalid config):` → 直接编辑验证失败，被运行中的网关忽略。
    - `Invalid config at ...` → 网关服务引导之前启动失败。
    - `missing-meta-vs-last-good`、`gateway-mode-missing-vs-last-good` 或 `size-drop-vs-last-good:*` → OpenClaw 拥有的写入被拒绝，因为它与最后已知良好备份相比丢失了字段或大小。
    - `Config last-known-good promotion skipped` → 候选包含编辑的密钥占位符，如 `***`。

  </Accordion>
  <Accordion title="修复选项">
    1. 运行 `openclaw doctor --fix` 以让 doctor 修复前缀/覆盖的配置或恢复最后已知良好的配置。
    2. 仅从 `.clobbered.*` 或 `.rejected.*` 复制预期的键，然后使用 `openclaw config set` 或 `config.patch` 应用它们。
    3. 重启之前运行 `openclaw config validate`。
    4. 如果你手动编辑，请保留完整的 JSON5 配置，而不仅仅是你想要更改的部分对象。
  </Accordion>
</AccordionGroup>

相关：

- [Config](/cli/config)
- [配置：热重载](/gateway/configuration#config-hot-reload)
- [配置：严格验证](/gateway/configuration#strict-validation)
- [Doctor](/gateway/doctor)

## 网关探测警告

当 `openclaw gateway probe` 到达某个地方，但仍然打印警告块时使用此方法。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

查找：

- JSON 输出中的 `warnings[].code` 和 `primaryTargetId`。
- 警告是否关于 SSH 回退、多个网关、缺少范围或未解析的认证引用。

常见特征：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 设置失败，但命令仍然尝试了直接配置/环回目标。
- `multiple reachable gateways detected` → 多个目标回应了。通常这意味着有意的多网关设置或过时/重复的监听器。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → 连接有效，但详情 RPC 受范围限制；配对设备身份或使用具有 `operator.read` 的凭据。
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed` → 连接有效，但完整的诊断 RPC 集超时或失败。将其视为可达的网关，但诊断降级；比较 `--json` 输出中的 `connect.ok` 和 `connect.rpcOk`。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → 网关回应了，但此客户端在正常操作员访问之前仍然需要配对/批准。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文本 → 认证材料在此命令路径中对于失败目标不可用。

相关：

- [网关](/cli/gateway)
- [同一主机上的多个网关](/gateway#multiple-gateways-same-host)
- [远程访问](/gateway/remote)

## 渠道已连接，消息未流动

如果渠道状态已连接但消息流死了，请专注于策略、权限和渠道特定的传递规则。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

查找：

- 私信策略（`pairing`、`allowlist`、`open`、`disabled`）。
- 群组允许列表和提及要求。
- 缺少渠道 API 权限/范围。

常见特征：

- `mention required` → 群组提及策略忽略消息。
- `pairing` / 待批准跟踪 → 发送者未被批准。
- `missing_scope`、`not_in_channel`、`Forbidden`、`401/403` → 渠道认证/权限问题。

相关：

- [渠道故障排除](/channels/troubleshooting)
- [Discord](/channels/discord)
- [Telegram](/channels/telegram)
- [WhatsApp](/channels/whatsapp)

## Cron 和心跳传递

如果 cron 或心跳未运行或未传递，请首先验证调度器状态，然后验证传递目标。

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

查找：

- Cron 已启用且下次唤醒存在。
- 作业运行历史状态（`ok`、`skipped`、`error`）。
- 心跳跳过原因（`quiet-hours`、`requests-in-flight`、`cron-in-progress`、`lanes-busy`、`alerts-disabled`、`empty-heartbeat-file`、`no-tasks-due`）。

<AccordionGroup>
  <Accordion title="常见特征">
    - `cron: scheduler disabled; jobs will not run automatically` → cron 已禁用。
    - `cron: timer tick failed` → 调度器 tick 失败；检查文件/日志/运行时错误。
    - `heartbeat skipped` 且 `reason=quiet-hours` → 在活跃时间窗口之外。
    - `heartbeat skipped` 且 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在但只包含空行/markdown 标题，因此 OpenClaw 跳过模型调用。
    - `heartbeat skipped` 且 `reason=no-tasks-due` → `HEARTBEAT.md` 包含 `tasks:` 块，但没有任何任务在此 tick 到期。
    - `heartbeat: unknown accountId` → 心跳传递目标的账户 id 无效。
    - `heartbeat skipped` 且 `reason=dm-blocked` → 心跳目标解析为私信风格的目的地，而 `agents.defaults.heartbeat.directPolicy`（或每代理覆盖）设置为 `block`。

  </Accordion>
</AccordionGroup>

相关：

- [心跳](/gateway/heartbeat)
- [计划任务](/automation/cron-jobs)
- [计划任务：故障排除](/automation/cron-jobs#troubleshooting)

## 节点已配对，工具失败

如果节点已配对但工具失败，请隔离前台、权限和批准状态。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

查找：

- 节点在线，具有预期功能。
- 相机/麦克风/位置/屏幕的操作系统权限授予。
- Exec 批准和允许列表状态。

常见特征：

- `NODE_BACKGROUND_UNAVAILABLE` → 节点应用必须在前台。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少操作系统权限。
- `SYSTEM_RUN_DENIED: approval required` → exec 批准待处理。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被允许列表阻止。

相关：

- [Exec 批准](/tools/exec-approvals)
- [节点故障排除](/nodes/troubleshooting)
- [节点](/nodes/index)

## 浏览器工具失败

当浏览器工具操作失败，即使网关本身是健康的，也使用此方法。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

查找：

- `plugins.allow` 是否已设置并包含 `browser`。
- 有效的浏览器可执行路径。
- CDP 配置文件可达性。
- `existing-session` / `user` 配置文件的本地 Chrome 可用性。

<AccordionGroup>
  <Accordion title="插件/可执行文件特征">
    - `unknown command "browser"` 或 `unknown command 'browser'` → 捆绑的浏览器插件被 `plugins.allow` 排除。
    - 浏览器工具缺失/不可用，而 `browser.enabled=true` → `plugins.allow` 排除了 `browser`，因此插件从未加载。
    - `Failed to start Chrome CDP on port` → 浏览器进程启动失败。
    - `browser.executablePath not found` → 配置的路径无效。
    - `browser.cdpUrl must be http(s) or ws(s)` → 配置的 CDP URL 使用了不受支持的方案，如 `file:` 或 `ftp:`。
    - `browser.cdpUrl has invalid port` → 配置的 CDP URL 有错误或超出范围的端口。
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 当前网关安装缺少核心浏览器运行时依赖；重新安装或更新 OpenClaw，然后重启网关。ARIA 快照和基本页面截图仍然可以工作，但导航、AI 快照、CSS 选择器元素截图和 PDF 导出仍然不可用。

  </Accordion>
  <Accordion title="Chrome MCP / existing-session 特征">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP existing-session 还无法附加到所选浏览器数据目录。打开浏览器检查页面，启用远程调试，保持浏览器打开，批准第一个附加提示，然后重试。如果不需要登录状态，优先使用托管的 `openclaw` 配置文件。
    - `No Chrome tabs found for profile="user"` → Chrome MCP 附加配置文件没有打开的本地 Chrome 标签页。
    - `Remote CDP for profile "<name>" is not reachable` → 从网关主机无法访问配置的远程 CDP 端点。
    - `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 仅附加配置文件没有可达的目标，或 HTTP 端点已回应但 CDP WebSocket 仍然无法打开。

  </Accordion>
  <Accordion title="元素/截图/上传特征">
    - `fullPage is not supported for element screenshots` → 截图请求混合了 `--full-page` 和 `--ref` 或 `--element`。
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 截图调用必须使用页面捕获或快照 `--ref`，而不是 CSS `--element`。
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上传钩子需要快照引用，而不是 CSS 选择器。
    - `existing-session file uploads currently support one file at a time.` → 在 Chrome MCP 配置文件上每次调用发送一个上传。
    - `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 配置文件上的对话框钩子不支持超时覆盖。
    - `existing-session type does not support timeoutMs overrides.` → 对 `profile="user"` / Chrome MCP existing-session 配置文件的 `act:type` 省略 `timeoutMs`，或在需要自定义超时时使用托管/CDP 浏览器配置文件。
    - `existing-session evaluate does not support timeoutMs overrides.` → 对 `profile="user"` / Chrome MCP existing-session 配置文件的 `act:evaluate` 省略 `timeoutMs`，或在需要自定义超时时使用托管/CDP 浏览器配置文件。
    - `response body is not supported for existing-session profiles yet.` → `responsebody` 仍然需要托管浏览器或原始 CDP 配置文件。
    - 仅附加或远程 CDP 配置文件上过期的视口/暗模式/区域设置/离线覆盖 → 运行 `openclaw browser stop --browser-profile <name>` 关闭活跃控制会话并释放 Playwright/CDP 模拟状态，而不重启整个网关。

  </Accordion>
</AccordionGroup>

相关：

- [浏览器（OpenClaw 管理）](/tools/browser)
- [浏览器故障排除](/tools/browser-linux-troubleshooting)

## 如果你升级后某些东西突然崩溃了

大多数升级后的崩溃是配置漂移或现在强制执行更严格的默认值。

<AccordionGroup>
  <Accordion title="1. 认证和 URL 覆盖行为已更改">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    检查内容：

    - 如果 `gateway.mode=remote`，CLI 调用可能正在针对远程，而你的本地服务是正常的。
    - 显式 `--url` 调用不回退到存储的凭据。

    常见特征：

    - `gateway connect failed:` → URL 目标错误。
    - `unauthorized` → 端点可达但认证错误。

  </Accordion>
  <Accordion title="2. 绑定和认证护栏更严格了">
    ```bash
    openclaw config get gateway.bind
    openclaw config get gateway.auth.mode
    openclaw config get gateway.auth.token
    openclaw gateway status
    openclaw logs --follow
    ```

    检查内容：

    - 非环回绑定（`lan`、`tailnet`、`custom`）需要有效的网关认证路径：共享令牌/密码认证，或正确配置的非环回 `trusted-proxy` 部署。
    - 旧键如 `gateway.token` 不替换 `gateway.auth.token`。

    常见特征：

    - `refusing to bind gateway ... without auth` → 非环回绑定没有有效的网关认证路径。
    - 运行时运行时 `Connectivity probe: failed` → 网关活跃但当前认证/URL 无法访问。

  </Accordion>
  <Accordion title="3. 配对和设备身份状态已更改">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    检查内容：

    - 仪表板/节点的待处理设备批准。
    - 策略或身份更改后的待处理私信配对批准。

    常见特征：

    - `device identity required` → 设备认证未满足。
    - `pairing required` → 发送者/设备必须被批准。

  </Accordion>
</AccordionGroup>

如果检查后服务配置和运行时仍然不一致，请从同一配置文件/状态目录重新安装服务元数据：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相关：

- [认证](/gateway/authentication)
- [后台 exec 和进程工具](/gateway/background-process)
- [网关拥有的配对](/gateway/pairing)

## 相关链接

- [Doctor](/gateway/doctor)
- [FAQ](/help/faq)
- [网关运行手册](/gateway)
