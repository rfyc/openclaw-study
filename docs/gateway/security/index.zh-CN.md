---
summary: "运行具有 shell 访问权限的 AI 网关的安全注意事项和威胁模型"
read_when:
  - 添加扩大访问权限或自动化的功能时
title: "安全"
---

<Warning>
  **个人助手信任模型。** 本指南假设每个网关有一个受信任的操作员边界（单用户、个人助手模型）。OpenClaw **不是**多个对抗性用户共享一个代理或网关的敌意多租户安全边界。如果你需要混合信任或对抗性用户操作，请拆分信任边界（单独的网关 + 凭据，理想情况下是单独的操作系统用户或主机）。
</Warning>

## 首先明确范围：个人助手安全模型

OpenClaw 安全指南假定**个人助手**部署：一个受信任的操作员边界，可能有多个代理。

- 受支持的安全态势：每个网关一个用户/信任边界（优先每个边界一个操作系统用户/主机/VPS）。
- 不受支持的安全边界：多个相互不信任或对抗性用户共享的一个网关/代理。
- 如果需要对抗性用户隔离，请按信任边界拆分（单独的网关 + 凭据，理想情况下是单独的操作系统用户/主机）。
- 如果多个不受信任的用户可以向一个启用了工具的代理发送消息，请将它们视为共享该代理的同等委托工具权限。

本页解释**在该模型内**的加固方法。它不声称在一个共享网关上实现敌意多租户隔离。

## 快速检查：`openclaw security audit`

另请参阅：[正式验证（安全模型）](/security/formal-verification)

定期运行（尤其是在更改配置或暴露网络表面后）：

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
openclaw security audit --json
```

`security audit --fix` 故意保持狭窄范围：它将常见的开放群组策略翻转为允许列表，恢复 `logging.redactSensitive: "tools"`，收紧状态/配置/包含文件权限，并在 Windows 上使用 Windows ACL 重置而非 POSIX `chmod`。

它会标记常见的陷阱（网关认证暴露、浏览器控制暴露、提升的允许列表、文件系统权限、宽松的 exec 批准以及开放渠道工具暴露）。

OpenClaw 既是一个产品，也是一个实验：你正在将前沿模型行为连接到真实的消息传递表面和真实的工具。**没有"完全安全"的设置。** 目标是有意识地考虑：

- 谁可以与你的机器人交谈
- 机器人被允许在哪里行动
- 机器人可以接触什么

从仍然有效的最小访问权限开始，然后随着信心的增长逐步扩大。

### 部署和主机信任

OpenClaw 假设主机和配置边界是受信任的：

- 如果某人可以修改网关主机状态/配置（`~/.openclaw`，包括 `openclaw.json`），则将其视为受信任的操作员。
- 为多个相互不信任/对抗性操作员运行一个网关是**不推荐的设置**。
- 对于混合信任团队，请使用单独的网关拆分信任边界（或至少使用单独的操作系统用户/主机）。
- 推荐默认值：每台机器/主机（或 VPS）一个用户，该用户一个网关，该网关中一个或多个代理。
- 在一个网关实例内，经过身份验证的操作员访问是受信任的控制平面角色，而不是每用户的租户角色。
- 会话标识符（`sessionKey`、会话 ID、标签）是路由选择器，而不是授权令牌。
- 如果几个人可以向一个启用了工具的代理发送消息，他们每个人都可以控制同一套权限集。每用户会话/内存隔离有助于隐私，但不会将共享代理转换为每用户主机授权。

### 共享 Slack 工作区：真实风险

如果"Slack 中的每个人都可以给机器人发消息"，核心风险是委托工具权限：

- 任何允许的发送者都可以在代理的策略范围内触发工具调用（`exec`、浏览器、网络/文件工具）；
- 来自一个发送者的提示/内容注入可能导致影响共享状态、设备或输出的操作；
- 如果一个共享代理有敏感的凭据/文件，任何允许的发送者都可能通过工具使用来驱动数据外泄。

对团队工作流使用具有最少工具的单独代理/网关；保持个人数据代理的私密性。

### 公司共享代理：可接受的模式

当使用该代理的所有人都在同一信任边界内（例如一个公司团队）且代理严格以业务为范围时，这是可以接受的。

- 在专用机器/VM/容器上运行；
- 为该运行时使用专用操作系统用户 + 专用浏览器/配置文件/账户；
- 不要将该运行时签入个人 Apple/Google 账户或个人密码管理器/浏览器配置文件。

如果你在同一运行时上混用个人和公司身份，你会破坏分离并增加个人数据暴露风险。

## 网关和节点信任概念

将网关和节点视为一个操作员信任域，具有不同的角色：

- **网关**是控制平面和策略表面（`gateway.auth`、工具策略、路由）。
- **节点**是配对到该网关的远程执行表面（命令、设备操作、主机本地功能）。
- 经过网关身份验证的调用者在网关范围内是受信任的。配对后，节点操作是该节点上的受信任操作员操作。
- 操作员范围级别和批准时检查在[操作员范围](/gateway/operator-scopes)中总结。
- 使用共享网关令牌/密码进行身份验证的直接环回后端客户端可以在不提供用户设备身份的情况下进行内部控制平面 RPC。这不是远程或浏览器配对绕过：网络客户端、节点客户端、设备令牌客户端和显式设备身份仍然通过配对和范围升级执行。
- `sessionKey` 是路由/上下文选择，而不是每用户认证。
- Exec 批准（允许列表 + 询问）是操作员意图的护栏，而不是敌意多租户隔离。
- OpenClaw 对于受信任的单操作员设置的产品默认值是，`gateway`/`node` 上的主机 exec 无需批准提示即可被允许（`security="full"`，`ask="off"` 除非你收紧它）。该默认值是有意为之的 UX，本身不是漏洞。
- Exec 批准绑定确切的请求上下文和尽力的直接本地文件操作数；它们不会语义上模拟每个运行时/解释器加载器路径。使用沙盒化和主机隔离来实现强边界。

如果你需要敌意用户隔离，请按操作系统用户/主机拆分信任边界并运行单独的网关。

## 信任边界矩阵

在分类风险时，将此作为快速模型使用：

| 边界或控制                                      | 含义                            | 常见误解                                           |
| ----------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| `gateway.auth`（令牌/密码/受信任代理/设备认证） | 对网关 API 的调用者进行身份验证 | "需要每帧的每消息签名才能安全"                     |
| `sessionKey`                                    | 上下文/会话选择的路由键         | "会话密钥是用户认证边界"                           |
| 提示/内容护栏                                   | 减少模型滥用风险                | "仅提示注入就能证明认证绕过"                       |
| `canvas.eval` / 浏览器评估                      | 启用时的有意操作员功能          | "任何 JS eval 原语在此信任模型中都自动是漏洞"      |
| 本地 TUI `!` shell                              | 明确的操作员触发本地执行        | "本地 shell 便利命令是远程注入"                    |
| 节点配对和节点命令                              | 配对设备上的操作员级别远程执行  | "远程设备控制默认情况下应被视为不受信任的用户访问" |
| `gateway.nodes.pairing.autoApproveCidrs`        | 可选的受信任网络节点注册策略    | "默认禁用的允许列表是自动配对漏洞"                 |

## 设计上非漏洞

<Accordion title="超出范围的常见发现">

这些模式经常被报告，除非证明了真正的边界绕过，否则通常会被关闭为不采取行动：

- 仅提示注入链，没有策略、认证或沙盒绕过。
- 假设在一个共享主机或配置上进行敌意多租户操作的声明。
- 将正常的操作员读取路径访问（例如 `sessions.list` / `sessions.preview` / `chat.history`）分类为共享网关设置中的 IDOR 的声明。
- 仅限本地主机部署发现（例如仅限环回网关上的 HSTS）。
- Discord 入站 webhook 签名发现，针对此仓库中不存在的入站路径。
- 将节点配对元数据视为 `system.run` 隐藏的第二个每命令批准层的报告，而真正的执行边界仍然是网关的全局节点命令策略加上节点自己的 exec 批准。
- 将已配置的 `gateway.nodes.pairing.autoApproveCidrs` 视为漏洞本身的报告。此设置默认禁用，需要明确的 CIDR/IP 条目，仅适用于没有请求范围的首次 `role: node` 配对，不自动批准 operator/browser/Control UI、WebChat、角色升级、范围升级、元数据更改、公钥更改或相同主机环回受信任代理标头路径，除非明确启用了环回受信任代理认证。
- 将 `sessionKey` 视为认证令牌的"缺少每用户授权"发现。

</Accordion>

## 60 秒加固基线

首先使用此基线，然后根据每个受信任代理有选择地重新启用工具：

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    auth: { mode: "token", token: "replace-with-long-random-token" },
  },
  session: {
    dmScope: "per-channel-peer",
  },
  tools: {
    profile: "messaging",
    deny: ["group:automation", "group:runtime", "group:fs", "sessions_spawn", "sessions_send"],
    fs: { workspaceOnly: true },
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
  channels: {
    whatsapp: { dmPolicy: "pairing", groups: { "*": { requireMention: true } } },
  },
}
```

这使网关仅限本地，隔离私信，并默认禁用控制平面/运行时工具。

## 共享收件箱快速规则

如果超过一个人可以向你的机器人发送私信：

- 设置 `session.dmScope: "per-channel-peer"`（对于多账户渠道则设置 `"per-account-channel-peer"`）。
- 保持 `dmPolicy: "pairing"` 或严格的允许列表。
- 永远不要将共享私信与广泛的工具访问结合起来。
- 这可以加固合作/共享收件箱，但不是在用户共享主机/配置写入访问权限时针对敌意共同租户的隔离设计。

## 上下文可见性模型

OpenClaw 分离两个概念：

- **触发授权**：谁可以触发代理（`dmPolicy`、`groupPolicy`、允许列表、提及门控）。
- **上下文可见性**：哪些补充上下文被注入到模型输入中（回复正文、引用文本、线程历史、转发元数据）。

允许列表门控触发器和命令授权。`contextVisibility` 设置控制如何过滤补充上下文（引用回复、线程根、获取的历史记录）：

- `contextVisibility: "all"`（默认）按接收到的方式保留补充上下文。
- `contextVisibility: "allowlist"` 将补充上下文过滤为活跃允许列表检查允许的发送者。
- `contextVisibility: "allowlist_quote"` 行为类似于 `allowlist`，但仍然保留一个明确的引用回复。

为每个渠道或每个房间/对话设置 `contextVisibility`。有关设置详情，请参阅[群组聊天](/channels/groups#context-visibility-and-allowlists)。

建议分类指南：

- 仅显示"模型可以看到来自非允许列表发送者的引用或历史文本"的声明是可以使用 `contextVisibility` 解决的加固发现，而不是认证或沙盒边界绕过。
- 要具有安全影响，报告仍然需要展示信任边界绕过（认证、策略、沙盒、批准或其他有记录的边界）。

## 审计检查（高层次）

- **入站访问**（私信策略、群组策略、允许列表）：陌生人可以触发机器人吗？
- **工具爆炸半径**（提升的工具 + 开放房间）：提示注入是否会变成 shell/文件/网络操作？
- **Exec 批准漂移**（`security=full`、`autoAllowSkills`、没有 `strictInlineEval` 的解释器允许列表）：主机 exec 护栏是否仍然按你的预期运行？
  - `security="full"` 是广泛的态势警告，而非错误的证明。它是受信任的个人助手设置的选定默认值；只有在你的威胁模型需要批准或允许列表护栏时才收紧它。
- **网络暴露**（网关绑定/认证、Tailscale Serve/Funnel、弱/短认证令牌）。
- **浏览器控制暴露**（远程节点、中继端口、远程 CDP 端点）。
- **本地磁盘卫生**（权限、符号链接、配置包含、"同步文件夹"路径）。
- **插件**（没有明确允许列表的情况下加载插件）。
- **策略漂移/配置错误**（已配置沙盒 Docker 设置但沙盒模式关闭；无效的 `gateway.nodes.denyCommands` 模式，因为匹配仅是精确命令名称（例如 `system.run`）且不检查 shell 文本；危险的 `gateway.nodes.allowCommands` 条目；每代理配置文件覆盖的全局 `tools.profile="minimal"`；在宽松工具策略下可达的插件拥有工具）。
- **运行时期望漂移**（例如假设隐式 exec 仍然意味着 `sandbox`，当 `tools.exec.host` 现在默认为 `auto`，或在沙盒模式关闭时显式设置 `tools.exec.host="sandbox"`）。
- **模型卫生**（当配置的模型看起来像旧版时发出警告；不是硬阻止）。

如果你运行 `--deep`，OpenClaw 还会尝试尽力而为的实时网关探测。

## 凭据存储图

在审计访问或决定备份什么时使用：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram 机器人令牌**：配置/env 或 `channels.telegram.tokenFile`（仅常规文件；拒绝符号链接）
- **Discord 机器人令牌**：配置/env 或 SecretRef（env/file/exec 提供者）
- **Slack 令牌**：配置/env（`channels.slack.*`）
- **配对允许列表**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（默认账户）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非默认账户）
- **模型认证配置文件**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **Codex 运行时状态**：`~/.openclaw/agents/<agentId>/agent/codex-home/`
- **文件支持的密钥有效载荷（可选）**：`~/.openclaw/secrets.json`
- **旧版 OAuth 导入**：`~/.openclaw/credentials/oauth.json`

## 安全审计清单

当审计打印发现时，将此作为优先级顺序：

1. **任何"开放" + 启用工具**：首先锁定私信/群组（配对/允许列表），然后收紧工具策略/沙盒。
2. **公共网络暴露**（LAN 绑定、Funnel、缺少认证）：立即修复。
3. **浏览器控制远程暴露**：像操作员访问一样对待（仅 tailnet，有意配对节点，避免公共暴露）。
4. **权限**：确保状态/配置/凭据/认证对组/所有人不可读。
5. **插件**：只加载你明确信任的内容。
6. **模型选择**：对于任何带工具的机器人，优先选择现代指令加固的模型。

## 安全审计术语表

每个审计发现都由结构化的 `checkId` 键（例如 `gateway.bind_no_auth` 或 `tools.exec.security_full_configured`）标识。常见的关键严重性类：

- `fs.*` — 状态、配置、凭据、认证配置文件的文件系统权限。
- `gateway.*` — 绑定模式、认证、Tailscale、Control UI、受信任代理设置。
- `hooks.*`、`browser.*`、`sandbox.*`、`tools.exec.*` — 每表面加固。
- `plugins.*`、`skills.*` — 插件/技能供应链和扫描发现。
- `security.exposure.*` — 访问策略与工具爆炸半径相交的跨领域检查。

查看完整目录，包括严重性级别、修复键和自动修复支持，请访问[安全审计检查](/gateway/security/audit-checks)。

## 通过 HTTP 的 Control UI

Control UI 需要**安全上下文**（HTTPS 或 localhost）来生成设备身份。`gateway.controlUi.allowInsecureAuth` 是一个本地兼容性切换：

- 在 localhost 上，当页面通过非安全 HTTP 加载时，允许没有设备身份的 Control UI 认证。
- 它不会绕过配对检查。
- 它不会放宽远程（非 localhost）设备身份要求。

优先使用 HTTPS（Tailscale Serve）或在 `127.0.0.1` 上打开 UI。

仅在紧急情况下，`gateway.controlUi.dangerouslyDisableDeviceAuth` 会完全禁用设备身份检查。这是严重的安全降级；保持关闭，除非你正在积极调试并且可以快速还原。

与这些危险标志分开，成功的 `gateway.auth.mode: "trusted-proxy"` 可以接受**操作员** Control UI 会话而无需设备身份。这是有意的认证模式行为，而不是 `allowInsecureAuth` 的捷径，它仍然不扩展到节点角色的 Control UI 会话。

`openclaw security audit` 在启用此设置时发出警告。

## 不安全或危险标志摘要

当已知的不安全/危险调试开关被启用时，`openclaw security audit` 会引发 `config.insecure_or_dangerous_flags`。在生产中保持这些设置未设置。

<AccordionGroup>
  <Accordion title="今天审计跟踪的标志">
    - `gateway.controlUi.allowInsecureAuth=true`
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`
    - `gateway.controlUi.dangerouslyDisableDeviceAuth=true`
    - `hooks.gmail.allowUnsafeExternalContent=true`
    - `hooks.mappings[<index>].allowUnsafeExternalContent=true`
    - `tools.exec.applyPatch.workspaceOnly=false`
    - `plugins.entries.acpx.config.permissionMode=approve-all`

  </Accordion>

  <Accordion title="配置架构中所有 `dangerous*` / `dangerously*` 键">
    Control UI 和浏览器：

    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`
    - `gateway.controlUi.dangerouslyDisableDeviceAuth`
    - `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`

    渠道名称匹配（捆绑和插件渠道；也可在适用的 `accounts.<accountId>` 处使用）：

    - `channels.discord.dangerouslyAllowNameMatching`
    - `channels.slack.dangerouslyAllowNameMatching`
    - `channels.googlechat.dangerouslyAllowNameMatching`
    - `channels.msteams.dangerouslyAllowNameMatching`
    - `channels.synology-chat.dangerouslyAllowNameMatching`（插件渠道）
    - `channels.synology-chat.dangerouslyAllowInheritedWebhookPath`（插件渠道）
    - `channels.zalouser.dangerouslyAllowNameMatching`（插件渠道）
    - `channels.irc.dangerouslyAllowNameMatching`（插件渠道）
    - `channels.mattermost.dangerouslyAllowNameMatching`（插件渠道）

    网络暴露：

    - `channels.telegram.network.dangerouslyAllowPrivateNetwork`（也可按账户）

    沙盒 Docker（默认值 + 每代理）：

    - `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets`
    - `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources`
    - `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin`

  </Accordion>
</AccordionGroup>

## 反向代理配置

如果你在反向代理（nginx、Caddy、Traefik 等）后面运行网关，请配置 `gateway.trustedProxies` 以正确处理转发的客户端 IP。

当网关从**不在** `trustedProxies` 中的地址检测到代理标头时，它**不会**将连接视为本地客户端。如果禁用了网关认证，这些连接将被拒绝。这可以防止代理连接本来看起来来自 localhost 并获得自动信任而绕过认证。

`gateway.trustedProxies` 也供 `gateway.auth.mode: "trusted-proxy"` 使用，但该认证模式更严格：

- 受信任代理认证**默认对环回源代理关闭失败**
- 同主机环回反向代理可以使用 `gateway.trustedProxies` 进行本地客户端检测和转发 IP 处理
- 同主机环回反向代理只有在 `gateway.auth.trustedProxy.allowLoopback = true` 时才能满足 `gateway.auth.mode: "trusted-proxy"`；否则使用令牌/密码认证

```yaml
gateway:
  trustedProxies:
    - "10.0.0.1" # 反向代理 IP
  # 可选。默认 false。
  # 仅当你的代理无法提供 X-Forwarded-For 时才启用。
  allowRealIpFallback: false
  auth:
    mode: password
    password: ${OPENCLAW_GATEWAY_PASSWORD}
```

配置 `trustedProxies` 后，网关使用 `X-Forwarded-For` 确定客户端 IP。默认情况下忽略 `X-Real-IP`，除非明确设置 `gateway.allowRealIpFallback: true`。

受信任的代理标头不会使节点设备配对自动受信任。`gateway.nodes.pairing.autoApproveCidrs` 是一个单独的、默认禁用的操作员策略。即使启用后，环回源受信任代理标头路径也被排除在节点自动批准之外，因为本地调用者可以伪造这些标头，包括明确启用了环回受信任代理认证时。

好的反向代理行为（覆盖传入的转发标头）：

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
```

坏的反向代理行为（追加/保留不受信任的转发标头）：

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## HSTS 和来源说明

- OpenClaw 网关首先是本地/环回的。如果你在反向代理上终止 TLS，请在代理面向的 HTTPS 域上设置 HSTS。
- 如果网关本身终止 HTTPS，你可以设置 `gateway.http.securityHeaders.strictTransportSecurity` 以从 OpenClaw 响应中发出 HSTS 标头。
- 详细的部署指南在[受信任代理认证](/gateway/trusted-proxy-auth#tls-termination-and-hsts)中。
- 对于非环回 Control UI 部署，默认情况下需要 `gateway.controlUi.allowedOrigins`。
- `gateway.controlUi.allowedOrigins: ["*"]` 是明确的允许所有浏览器来源策略，而不是加固默认值。避免在严格控制的本地测试以外使用它。
- 即使启用了通用环回豁免，环回上的浏览器来源认证失败仍然受到速率限制，但锁定键按规范化的 `Origin` 值而非一个共享的 localhost 桶进行范围确定。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用 Host 标头来源回退模式；将其视为危险的操作员选定策略。
- 将 DNS 重绑定和代理主机标头行为视为部署加固问题；保持 `trustedProxies` 紧密，避免将网关直接暴露在公共互联网上。

## 本地会话日志存储在磁盘上

OpenClaw 在 `~/.openclaw/agents/<agentId>/sessions/*.jsonl` 下的磁盘上存储会话记录。这对于会话连续性（以及可选的会话内存索引）是必需的，但这也意味着**任何具有文件系统访问权限的进程/用户都可以读取这些日志**。将磁盘访问视为信任边界，并锁定 `~/.openclaw` 上的权限（参见下面的审计部分）。如果你需要代理之间更强的隔离，请在单独的操作系统用户或单独的主机下运行它们。

## 节点执行（system.run）

如果配对了 macOS 节点，网关可以在该节点上调用 `system.run`。这是 Mac 上的**远程代码执行**：

- 需要节点配对（批准 + 令牌）。
- 网关节点配对不是每命令批准表面。它建立节点身份/信任和令牌颁发。
- 网关通过 `gateway.nodes.allowCommands` / `denyCommands` 应用粗略的全局节点命令策略。
- 在 Mac 上通过**设置 → Exec 批准**（安全 + 询问 + 允许列表）控制。
- 每节点的 `system.run` 策略是节点自己的 exec 批准文件（`exec.approvals.node.*`），可以比网关的全局命令 ID 策略更严格或更宽松。
- 使用 `security="full"` 和 `ask="off"` 运行的节点遵循默认的受信任操作员模型。除非你的部署明确需要更严格的批准或允许列表立场，否则将其视为预期行为。
- 批准模式绑定确切的请求上下文，并在可能的情况下绑定一个具体的本地脚本/文件操作数。如果 OpenClaw 无法为解释器/运行时命令确定确切的一个直接本地文件，则拒绝批准支持的执行，而不是承诺完整的语义覆盖。
- 对于 `host=node`，批准支持的运行也会存储规范的准备好的 `systemRunPlan`；后来批准的转发重用该存储的计划，网关验证在批准请求创建后拒绝调用者对命令/cwd/会话上下文的编辑。
- 如果你不想要远程执行，将安全设置为**deny** 并删除该 Mac 的节点配对。

这种区别对于分类很重要：

- 如果网关全局策略和节点的本地 exec 批准仍然强制执行实际的执行边界，则重新连接的配对节点宣传不同的命令列表本身不是漏洞。
- 将节点配对元数据视为第二个隐藏的每命令批准层的报告通常是策略/用户体验混淆，而不是安全边界绕过。

## 动态技能（观察者/远程节点）

OpenClaw 可以在会话中期刷新技能列表：

- **技能观察者**：对 `SKILL.md` 的更改可以在下一个代理轮次更新技能快照。
- **远程节点**：连接 macOS 节点可以使仅 macOS 技能合格（基于二进制文件探测）。

将技能文件夹视为**受信任的代码**，并限制可以修改它们的人。

## 威胁模型

你的 AI 助手可以：

- 执行任意 shell 命令
- 读/写文件
- 访问网络服务
- 向任何人发送消息（如果你给它 WhatsApp 访问权限）

给你发消息的人可以：

- 试图欺骗你的 AI 做坏事
- 社会工程获取你的数据
- 探测基础设施细节

## 核心概念：智能前的访问控制

这里的大多数失败不是花哨的利用——它们是"有人给机器人发消息，机器人做了他们要求的事情"。

OpenClaw 的立场：

- **身份优先：** 决定谁可以与机器人交谈（私信配对/允许列表/显式"开放"）。
- **范围其次：** 决定机器人被允许在哪里行动（群组允许列表 + 提及门控、工具、沙盒、设备权限）。
- **模型最后：** 假设模型可以被操纵；设计使操纵的爆炸半径有限。

## 命令授权模型

斜杠命令和指令只对**授权发送者**有效。授权来自渠道允许列表/配对加上 `commands.useAccessGroups`（参见[配置](/gateway/configuration)和[斜杠命令](/tools/slash-commands)）。如果渠道允许列表为空或包含 `"*"`，该渠道的命令实际上是开放的。

`/exec` 是授权操作员的仅会话便利。它**不**写入配置或更改其他会话。

## 控制平面工具风险

两个内置工具可以进行持久的控制平面更改：

- `gateway` 可以使用 `config.schema.lookup` / `config.get` 检查配置，并可以使用 `config.apply`、`config.patch` 和 `update.run` 进行持久更改。
- `cron` 可以创建在原始聊天/任务结束后继续运行的计划作业。

仅所有者的 `gateway` 运行时工具仍然拒绝重写 `tools.exec.ask` 或 `tools.exec.security`；旧版 `tools.bash.*` 别名在写入之前被规范化到相同的受保护 exec 路径。代理驱动的 `gateway config.apply` 和 `gateway config.patch` 编辑默认是关闭失败的：只有一组有限的提示、模型和提及门控路径是代理可调整的。因此，新的敏感配置树是受保护的，除非它们被有意添加到允许列表中。

对于任何处理不受信任内容的代理/表面，默认拒绝这些：

```json5
{
  tools: {
    deny: ["gateway", "cron", "sessions_spawn", "sessions_send"],
  },
}
```

`commands.restart=false` 只阻止重启操作。它不禁用 `gateway` 配置/更新操作。

## 插件

插件与网关**在同一进程**中运行。将其视为受信任的代码：

- 只从你信任的来源安装插件。
- 优先使用明确的 `plugins.allow` 允许列表。
- 在启用之前审查插件配置。
- 插件更改后重启网关。
- 如果你安装或更新插件（`openclaw plugins install <package>`、`openclaw plugins update <id>`），将其视为运行不受信任的代码：
  - 安装路径是活跃插件安装根目录下的每插件目录。
  - OpenClaw 在安装/更新之前运行内置的危险代码扫描。默认情况下，`critical` 发现会阻止操作。
  - npm 和 git 插件安装仅在显式安装/更新流程中运行包管理器依赖汇聚。本地路径和存档被视为自包含的插件包；OpenClaw 复制/引用它们而不运行 `npm install`。
  - 优先使用固定的精确版本（`@scope/pkg@1.2.3`），并在启用之前检查磁盘上解包的代码。
  - `--dangerously-force-unsafe-install` 仅在插件安装/更新流程中的内置扫描误报时才用于紧急情况。它不绕过插件 `before_install` 钩子策略块，也不绕过扫描失败。
  - 网关支持的技能依赖安装遵循相同的危险/可疑拆分：内置的 `critical` 发现会阻止操作，除非调用者明确设置 `dangerouslyForceUnsafeInstall`，而可疑发现仍然只发出警告。`openclaw skills install` 仍然是单独的 ClawHub 技能下载/安装流程。

详情：[插件](/tools/plugin)

## 私信访问模型：配对、允许列表、开放、禁用

所有当前支持私信的渠道都支持一个私信策略（`dmPolicy` 或 `*.dm.policy`），它在处理消息**之前**门控入站私信：

- `pairing`（默认）：未知发送者收到短配对码，机器人忽略他们的消息直到获批准。代码在 1 小时后过期；重复的私信不会重新发送代码，直到创建新请求。默认情况下，待处理请求的上限为**每个渠道 3 个**。
- `allowlist`：未知发送者被阻止（没有配对握手）。
- `open`：允许任何人私信（公开）。**需要**渠道允许列表包含 `"*"`（明确选择加入）。
- `disabled`：完全忽略入站私信。

通过 CLI 批准：

```bash
openclaw pairing list <channel>
openclaw pairing approve <channel> <code>
```

详情 + 磁盘上的文件：[配对](/channels/pairing)

## 私信会话隔离（多用户模式）

默认情况下，OpenClaw 将**所有私信路由到主会话**，以便你的助手在设备和渠道间具有连续性。如果**多人**可以私信机器人（开放私信或多人允许列表），请考虑隔离私信会话：

```json5
{
  session: { dmScope: "per-channel-peer" },
}
```

这可以防止跨用户上下文泄漏，同时保持群组聊天隔离。

这是消息传递上下文边界，而不是主机管理员边界。如果用户是相互对抗的，并且共享同一网关主机/配置，请为每个信任边界运行单独的网关。

### 安全私信模式（推荐）

将上面的代码片段视为**安全私信模式**：

- 默认值：`session.dmScope: "main"`（所有私信共享一个会话以实现连续性）。
- 本地 CLI 引导默认值：未设置时写入 `session.dmScope: "per-channel-peer"`（保留现有的显式值）。
- 安全私信模式：`session.dmScope: "per-channel-peer"`（每个渠道+发送者对获得隔离的私信上下文）。
- 跨渠道对等隔离：`session.dmScope: "per-peer"`（每个发送者在同类型的所有渠道中获得一个会话）。

如果你在同一渠道上运行多个账户，请改用 `per-account-channel-peer`。如果同一个人在多个渠道上联系你，请使用 `session.identityLinks` 将这些私信会话折叠成一个规范身份。请参阅[会话管理](/concepts/session)和[配置](/gateway/configuration)。

## 私信和群组的允许列表

OpenClaw 有两个独立的"谁可以触发我？"层：

- **私信允许列表**（`allowFrom` / `channels.discord.allowFrom` / `channels.slack.allowFrom`；旧版：`channels.discord.dm.allowFrom`、`channels.slack.dm.allowFrom`）：谁被允许在私信中与机器人交谈。
  - 当 `dmPolicy="pairing"` 时，批准被写入 `~/.openclaw/credentials/` 下的账户范围配对允许列表存储（默认账户的 `<channel>-allowFrom.json`，非默认账户的 `<channel>-<accountId>-allowFrom.json`），并与配置允许列表合并。
- **群组允许列表**（渠道特定）：机器人将接受哪些群组/渠道/服务器的消息。
  - 常见模式：
    - `channels.whatsapp.groups`、`channels.telegram.groups`、`channels.imessage.groups`：每群组默认值，如 `requireMention`；设置时也充当群组允许列表（包含 `"*"` 以保持允许所有行为）。
    - `groupPolicy="allowlist"` + `groupAllowFrom`：限制谁可以在群组会话中触发机器人（WhatsApp/Telegram/Signal/iMessage/Microsoft Teams）。
    - `channels.discord.guilds` / `channels.slack.channels`：每表面允许列表 + 提及默认值。
  - 群组检查按此顺序运行：`groupPolicy`/群组允许列表优先，提及/回复激活其次。
  - 回复机器人消息（隐式提及）**不**绕过发送者允许列表（如 `groupAllowFrom`）。
  - **安全说明：** 将 `dmPolicy="open"` 和 `groupPolicy="open"` 视为最后手段设置。它们应该很少使用；除非你完全信任房间中的每个成员，否则优先使用配对 + 允许列表。

详情：[配置](/gateway/configuration)和[群组](/channels/groups)

## 提示注入（是什么，为什么重要）

提示注入是当攻击者精心设计一条消息，以操纵模型做一些不安全的事情（"忽略你的指令"、"转储你的文件系统"、"打开这个链接并运行命令"等）。

即使有强大的系统提示，**提示注入也没有得到解决**。系统提示护栏只是软指导；硬执行来自工具策略、exec 批准、沙盒和渠道允许列表（操作员可以按设计禁用这些）。在实践中有助于：

- 保持入站私信锁定（配对/允许列表）。
- 在群组中优先使用提及门控；避免公共房间中"始终在线"的机器人。
- 默认将链接、附件和粘贴的指令视为敌意。
- 在沙盒中运行敏感的工具执行；将密钥保存在代理可访问的文件系统之外。
- 注意：沙盒是可选的。如果沙盒模式关闭，隐式 `host=auto` 解析为网关主机。显式 `host=sandbox` 仍然会关闭失败，因为没有沙盒运行时可用。如果你想让该行为在配置中明确，请设置 `host=gateway`。
- 将高风险工具（`exec`、`browser`、`web_fetch`、`web_search`）限制为受信任的代理或明确的允许列表。
- 如果你允许解释器（`python`、`node`、`ruby`、`perl`、`php`、`lua`、`osascript`），启用 `tools.exec.strictInlineEval`，使内联 eval 形式仍然需要明确批准。
- Shell 批准分析还拒绝**未引用的 heredoc** 中的 POSIX 参数扩展形式（`$VAR`、`$?`、`$$`、`$1`、`$@`、`${…}`），因此允许列表的 heredoc 正文不能将 shell 扩展作为纯文本绕过允许列表审查。引用 heredoc 终止符（例如 `<<'EOF'`）以选择字面正文语义；否则，将扩展变量的未引用 heredoc 会被拒绝。
- **模型选择很重要：** 较旧/较小/旧版模型对提示注入和工具误用的抵抗力明显较弱。对于启用了工具的代理，使用可用的最强最新一代指令加固模型。

视为不受信任的危险信号：

- "读取此文件/URL，并完全按照其说的做。"
- "忽略你的系统提示或安全规则。"
- "揭示你的隐藏指令或工具输出。"
- "粘贴 ~/.openclaw 或你的日志的全部内容。"

## 外部内容特殊令牌清理

OpenClaw 在将常见的自托管 LLM 聊天模板特殊令牌字面值送达模型之前，从包装的外部内容和元数据中剥离它们。覆盖的标记族包括 Qwen/ChatML、Llama、Gemma、Mistral、Phi 和 GPT-OSS 角色/转换令牌。

原因：

- 托管自托管模型的 OpenAI 兼容后端有时会保留出现在用户文本中的特殊令牌，而不是对其进行屏蔽。能够写入入站外部内容（获取的页面、电子邮件正文、文件内容工具输出）的攻击者可以注入合成的 `assistant` 或 `system` 角色边界，并逃逸包装内容护栏。
- 清理在外部内容包装层进行，因此它均匀地应用于获取/读取工具和入站渠道内容，而不是每提供商的。
- 出站模型响应已经有单独的清理器，在最终渠道传递边界从用户可见回复中剥离泄漏的 `<tool_call>`、`<function_calls>`、`<system-reminder>`、`<previous_response>` 和类似的内部运行时脚手架。外部内容清理器是入站对应物。

这不能取代本页上的其他加固——`dmPolicy`、允许列表、exec 批准、沙盒化和 `contextVisibility` 仍然做主要工作。它关闭了针对将用户文本与完整特殊令牌一起转发的自托管堆栈的一个特定令牌化器层绕过。

## 不安全外部内容绕过标志

OpenClaw 包含明确的绕过标志，禁用外部内容安全包装：

- `hooks.mappings[].allowUnsafeExternalContent`
- `hooks.gmail.allowUnsafeExternalContent`
- Cron 有效载荷字段 `allowUnsafeExternalContent`

指南：

- 在生产中保持这些未设置/false。
- 仅暂时为严格范围的调试启用。
- 如果启用，请隔离该代理（沙盒 + 最少工具 + 专用会话命名空间）。

Hook 风险说明：

- 即使传递来自你控制的系统（邮件/文档/网页内容可以携带提示注入），Hook 有效载荷也是不受信任的内容。
- 较弱的模型层会增加此风险。对于 hook 驱动的自动化，优先选择强大的现代模型层，并保持工具策略紧密（`tools.profile: "messaging"` 或更严格），加上可能的沙盒。

### 提示注入不需要公共私信

即使**只有你**可以给机器人发消息，提示注入仍然可以通过机器人读取的任何**不受信任的内容**（网络搜索/获取结果、浏览器页面、电子邮件、文档、附件、粘贴的日志/代码）发生。换句话说：发送者不是唯一的威胁表面；**内容本身**可以携带对抗性指令。

当启用工具时，典型的风险是外泄上下文或触发工具调用。通过以下方式减少爆炸半径：

- 使用只读或禁用工具的**读取代理**来总结不受信任的内容，然后将摘要传递给你的主代理。
- 除非需要，否则对启用了工具的代理关闭 `web_search` / `web_fetch` / `browser`。
- 对于 OpenResponses URL 输入（`input_file` / `input_image`），设置严格的 `gateway.http.endpoints.responses.files.urlAllowlist` 和 `gateway.http.endpoints.responses.images.urlAllowlist`，并保持 `maxUrlParts` 低。空的允许列表被视为未设置；如果你想完全禁用 URL 获取，请使用 `files.allowUrl: false` / `images.allowUrl: false`。
- 对于 OpenResponses 文件输入，解码的 `input_file` 文本仍然被注入为**不受信任的外部内容**。不要仅因为网关在本地解码了文件就依赖文件文本是受信任的。注入的块仍然携带明确的 `<<<EXTERNAL_UNTRUSTED_CONTENT ...>>>` 边界标记加上 `Source: External` 元数据，即使此路径省略了较长的 `SECURITY NOTICE:` 横幅。
- 当媒体理解在将文本附加到媒体提示之前从附加文档中提取文本时，也应用相同的基于标记的包装。
- 对任何接触不受信任输入的代理启用沙盒和严格的工具允许列表。
- 将密钥保留在提示之外；改为通过网关主机上的 env/配置传递它们。

### 自托管 LLM 后端

OpenAI 兼容的自托管后端（如 vLLM、SGLang、TGI、LM Studio 或自定义 Hugging Face 令牌化器堆栈）在处理聊天模板特殊令牌方面可能与托管提供者不同。如果后端将 `<|im_start|>`、`<|start_header_id|>` 或 `<start_of_turn>` 等字面字符串作为用户内容中的结构化聊天模板令牌进行令牌化，则不受信任的文本可以尝试在令牌化器层伪造角色边界。

OpenClaw 在将常见模型族特殊令牌字面值分发给模型之前，从包装的外部内容中剥离它们。保持外部内容包装启用，并在可用时优先使用在用户提供的内容中分割或转义特殊令牌的后端设置。托管提供商（如 OpenAI 和 Anthropic）已经应用了自己的请求端清理。

### 模型强度（安全说明）

提示注入抵抗力在模型层之间**并不统一**。较小/较便宜的模型通常更容易受到工具误用和指令劫持的影响，尤其是在对抗性提示下。

<Warning>
对于启用了工具的代理或读取不受信任内容的代理，较旧/较小模型的提示注入风险通常太高。不要在弱模型层上运行这些工作负载。
</Warning>

建议：

- 对于任何可以运行工具或接触文件/网络的机器人，**使用最新一代、最佳层模型**。
- 对于启用了工具的代理或不受信任的收件箱，**不要使用较旧/较弱/较小的层**；提示注入风险太高。
- 如果必须使用较小的模型，**减少爆炸半径**（只读工具、强大的沙盒、最少的文件系统访问、严格的允许列表）。
- 运行小型模型时，**为所有会话启用沙盒**，并**禁用 web_search/web_fetch/browser**，除非输入受到严格控制。
- 对于带受信任输入且没有工具的仅聊天个人助手，较小的模型通常是可以的。

## 群组中的推理和详细输出

`/reasoning`、`/verbose` 和 `/trace` 可以暴露未打算用于公共渠道的内部推理、工具输出或插件诊断。在群组设置中，将它们视为**仅限调试**，除非你明确需要它们，否则关闭它们。

指南：

- 在公共房间中保持 `/reasoning`、`/verbose` 和 `/trace` 禁用。
- 如果你启用它们，只在受信任的私信或严格控制的房间中这样做。
- 记住：详细和跟踪输出可以包括工具参数、URL、插件诊断以及模型看到的数据。

## 配置加固示例

### 文件权限

在网关主机上保持配置 + 状态私有：

- `~/.openclaw/openclaw.json`：`600`（仅用户读/写）
- `~/.openclaw`：`700`（仅用户）

`openclaw doctor` 可以警告并提供收紧这些权限的选项。

### 网络暴露（绑定、端口、防火墙）

网关在单个端口上多路复用 **WebSocket + HTTP**：

- 默认值：`18789`
- 配置/标志/env：`gateway.port`、`--port`、`OPENCLAW_GATEWAY_PORT`

此 HTTP 表面包括 Control UI 和 canvas 主机：

- Control UI（SPA 资产）（默认基础路径 `/`）
- Canvas 主机：`/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`（任意 HTML/JS；视为不受信任的内容）

如果你在普通浏览器中加载 canvas 内容，将其视为任何其他不受信任的网页：

- 不要将 canvas 主机暴露给不受信任的网络/用户。
- 不要让 canvas 内容与特权 Web 表面共享相同的来源，除非你完全理解影响。

绑定模式控制网关监听的位置：

- `gateway.bind: "loopback"`（默认）：只有本地客户端可以连接。
- 非环回绑定（`"lan"`、`"tailnet"`、`"custom"`）扩大了攻击表面。只有在有网关认证（共享令牌/密码或正确配置的受信任代理）和真实防火墙的情况下才使用它们。

经验法则：

- 优先使用 Tailscale Serve 而不是 LAN 绑定（Serve 将网关保持在环回，Tailscale 处理访问）。
- 如果必须绑定到 LAN，请将端口防火墙化为严格的源 IP 允许列表；不要广泛端口转发它。
- 永远不要在 `0.0.0.0` 上未经身份验证地暴露网关。

### 使用 UFW 的 Docker 端口发布

如果你在 VPS 上使用 Docker 运行 OpenClaw，记住发布的容器端口（`-p HOST:CONTAINER` 或 Compose `ports:`）通过 Docker 的转发链路由，而不仅仅是主机 `INPUT` 规则。

要使 Docker 流量与你的防火墙策略保持一致，请在 `DOCKER-USER` 中强制执行规则（该链在 Docker 自己的接受规则之前评估）。在许多现代发行版上，`iptables`/`ip6tables` 使用 `iptables-nft` 前端，并且仍然将这些规则应用于 nftables 后端。

最小允许列表示例（IPv4）：

```bash
# /etc/ufw/after.rules（作为其自己的 *filter 部分追加）
*filter
:DOCKER-USER - [0:0]
-A DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
-A DOCKER-USER -s 127.0.0.0/8 -j RETURN
-A DOCKER-USER -s 10.0.0.0/8 -j RETURN
-A DOCKER-USER -s 172.16.0.0/12 -j RETURN
-A DOCKER-USER -s 192.168.0.0/16 -j RETURN
-A DOCKER-USER -s 100.64.0.0/10 -j RETURN
-A DOCKER-USER -p tcp --dport 80 -j RETURN
-A DOCKER-USER -p tcp --dport 443 -j RETURN
-A DOCKER-USER -m conntrack --ctstate NEW -j DROP
-A DOCKER-USER -j RETURN
COMMIT
```

IPv6 有单独的表。如果启用了 Docker IPv6，请在 `/etc/ufw/after6.rules` 中添加匹配策略。

避免在文档片段中硬编码接口名称，如 `eth0`。接口名称在 VPS 镜像中各不相同（`ens3`、`enp*` 等），不匹配可能会意外跳过你的拒绝规则。

重新加载后快速验证：

```bash
ufw reload
iptables -S DOCKER-USER
ip6tables -S DOCKER-USER
nmap -sT -p 1-65535 <public-ip> --open
```

预期的外部端口应该只是你有意暴露的内容（对于大多数设置：SSH + 你的反向代理端口）。

### mDNS/Bonjour 发现

当捆绑的 `bonjour` 插件启用时，网关通过 mDNS（端口 5353 上的 `_openclaw-gw._tcp`）广播其存在以进行本地设备发现。在完整模式下，这包括可能暴露操作细节的 TXT 记录：

- `cliPath`：CLI 二进制文件的完整文件系统路径（揭示用户名和安装位置）
- `sshPort`：在主机上广播 SSH 可用性
- `displayName`、`lanHost`：主机名信息

**操作安全考虑：** 广播基础设施细节使本地网络上的任何人更容易进行侦察。即使是"无害"的信息，如文件系统路径和 SSH 可用性，也有助于攻击者映射你的环境。

**建议：**

1. **除非需要 LAN 发现，否则保持 Bonjour 禁用。** Bonjour 在 macOS 主机上自动启动，在其他地方是可选的；直接网关 URL、Tailnet、SSH 或广域 DNS-SD 避免本地多播。

2. **最小模式**（Bonjour 启用时默认，推荐用于暴露的网关）：从 mDNS 广播中省略敏感字段：

   ```json5
   {
     discovery: {
       mdns: { mode: "minimal" },
     },
   }
   ```

3. **禁用 mDNS 模式**，如果你想保持插件启用但抑制本地设备发现：

   ```json5
   {
     discovery: {
       mdns: { mode: "off" },
     },
   }
   ```

4. **完整模式**（可选加入）：在 TXT 记录中包含 `cliPath` + `sshPort`：

   ```json5
   {
     discovery: {
       mdns: { mode: "full" },
     },
   }
   ```

5. **环境变量**（替代方案）：设置 `OPENCLAW_DISABLE_BONJOUR=1` 以在不更改配置的情况下禁用 mDNS。

当 Bonjour 在最小模式下启用时，网关广播足够的设备发现（`role`、`gatewayPort`、`transport`），但省略 `cliPath` 和 `sshPort`。需要 CLI 路径信息的应用可以通过经过身份验证的 WebSocket 连接获取它。

### 锁定网关 WebSocket（本地认证）

网关认证**默认是必需的**。如果没有配置有效的网关认证路径，网关会拒绝 WebSocket 连接（关闭失败）。

引导默认会生成令牌（即使对于环回），因此本地客户端必须进行身份验证。

设置令牌以便**所有** WS 客户端必须进行身份验证：

```json5
{
  gateway: {
    auth: { mode: "token", token: "your-token" },
  },
}
```

Doctor 可以为你生成一个：`openclaw doctor --generate-gateway-token`。

<Note>
`gateway.remote.token` 和 `gateway.remote.password` 是客户端凭据来源。它们本身**不**保护本地 WS 访问。本地调用路径只有在 `gateway.auth.*` 未设置时才能使用 `gateway.remote.*` 作为回退。如果 `gateway.auth.token` 或 `gateway.auth.password` 通过 SecretRef 明确配置且未解析，解析失败关闭（没有远程回退屏蔽）。
</Note>
可选：使用 `wss://` 时，使用 `gateway.remote.tlsFingerprint` 固定远程 TLS 证书。明文 `ws://` 默认仅限环回。对于受信任的私有网络路径，在客户端进程上将 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 设置为应急措施。这有意仅适用于进程环境，而不是 `openclaw.json` 配置键。移动配对和 Android 手动或扫描的网关路由更严格：环回接受明文，但私有 LAN、链路本地、`.local` 和无点主机名必须使用 TLS，除非你明确选择使用受信任的私有网络明文路径。

本地设备配对：

- 设备配对对直接本地环回连接自动批准，以保持同主机客户端顺畅。
- OpenClaw 还为受信任的共享密钥辅助流程设有一个狭窄的后端/容器本地自连接路径。
- Tailnet 和 LAN 连接，包括同主机 tailnet 绑定，被视为远程用于配对，仍然需要批准。
- 环回请求上的转发标头证据取消环回本地性资格。元数据升级自动批准范围很窄。请参阅[网关配对](/gateway/pairing)了解两个规则。

认证模式：

- `gateway.auth.mode: "token"`：共享不记名令牌（推荐用于大多数设置）。
- `gateway.auth.mode: "password"`：密码认证（优先通过 env 设置：`OPENCLAW_GATEWAY_PASSWORD`）。
- `gateway.auth.mode: "trusted-proxy"`：信任身份感知反向代理来对用户进行身份验证并通过标头传递身份（参见[受信任代理认证](/gateway/trusted-proxy-auth)）。

轮换清单（令牌/密码）：

1. 生成/设置新密钥（`gateway.auth.token` 或 `OPENCLAW_GATEWAY_PASSWORD`）。
2. 重启网关（如果 macOS 应用管理网关，则重启 macOS 应用）。
3. 更新任何远程客户端（调用网关的机器上的 `gateway.remote.token` / `.password`）。
4. 验证你不能再使用旧凭据连接。

### Tailscale Serve 身份标头

当 `gateway.auth.allowTailscale` 为 `true`（Serve 的默认值）时，OpenClaw 接受 Tailscale Serve 身份标头（`tailscale-user-login`）用于 Control UI/WebSocket 身份验证。OpenClaw 通过本地 Tailscale 守护进程（`tailscale whois`）解析 `x-forwarded-for` 地址并将其与标头匹配来验证身份。这仅对到达环回并包含 Tailscale 注入的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host` 的请求触发。对于此异步身份检查路径，在限速器记录失败之前，来自同一 `{scope, ip}` 的失败尝试会被串行化。来自一个 Serve 客户端的并发错误重试因此可能会立即锁定第二次尝试，而不是作为两个普通不匹配竞争通过。HTTP API 端点（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`）**不**使用 Tailscale 身份标头认证。它们仍然遵循网关配置的 HTTP 认证模式。

重要边界说明：

- 网关 HTTP 不记名认证实际上是全有或全无的操作员访问。
- 将可以调用 `/v1/chat/completions`、`/v1/responses` 或 `/api/channels/*` 的凭据视为该网关的完全访问操作员密钥。
- 在 OpenAI 兼容的 HTTP 表面上，共享密钥不记名认证恢复完整的默认操作员范围（`operator.admin`、`operator.approvals`、`operator.pairing`、`operator.read`、`operator.talk.secrets`、`operator.write`）和代理轮次的所有者语义；较窄的 `x-openclaw-scopes` 值不会减少该共享密钥路径。
- HTTP 上的每请求范围语义仅当请求来自身份承载模式（如受信任代理认证或私有入口上的 `gateway.auth.mode="none"`）时才适用。
- 在这些身份承载模式中，省略 `x-openclaw-scopes` 将回退到正常操作员默认范围集；当你想要较窄的范围集时，请明确发送标头。
- `/tools/invoke` 遵循相同的共享密钥规则：令牌/密码不记名认证也被视为完整的操作员访问，而身份承载模式仍然遵守声明的范围。
- 不要与不受信任的调用者共享这些凭据；优先选择每个信任边界的单独网关。

**信任假设：** 无令牌 Serve 认证假设网关主机是受信任的。不要将其视为对同主机上敌意进程的保护。如果不受信任的本地代码可能在网关主机上运行，请禁用 `gateway.auth.allowTailscale` 并使用 `gateway.auth.mode: "token"` 或 `"password"` 要求明确的共享密钥认证。

**安全规则：** 不要从你自己的反向代理转发这些标头。如果你在网关前面终止 TLS 或代理，请禁用 `gateway.auth.allowTailscale` 并改用共享密钥认证（`gateway.auth.mode: "token"` 或 `"password"`）或[受信任代理认证](/gateway/trusted-proxy-auth)。

受信任的代理：

- 如果你在网关前面终止 TLS，请将 `gateway.trustedProxies` 设置为你的代理 IP。
- OpenClaw 将信任来自这些 IP 的 `x-forwarded-for`（或 `x-real-ip`）来确定客户端 IP，用于本地配对检查和 HTTP 认证/本地检查。
- 确保你的代理**覆盖** `x-forwarded-for` 并阻止对网关端口的直接访问。

参见 [Tailscale](/gateway/tailscale) 和 [Web 概述](/web)。

### 通过节点主机进行浏览器控制（推荐）

如果你的网关是远程的，但浏览器在另一台机器上运行，请在浏览器机器上运行**节点主机**，让网关代理浏览器操作（参见[浏览器工具](/tools/browser)）。将节点配对视为管理员访问。

推荐模式：

- 将网关和节点主机保持在同一 tailnet（Tailscale）上。
- 有意配对节点；如果你不需要，请禁用浏览器代理路由。

避免：

- 通过 LAN 或公共互联网暴露中继/控制端口。
- 用于浏览器控制端点的 Tailscale Funnel（公共暴露）。

### 磁盘上的密钥

假设 `~/.openclaw/`（或 `$OPENCLAW_STATE_DIR/`）下的任何内容可能包含密钥或私人数据：

- `openclaw.json`：配置可能包括令牌（网关、远程网关）、提供者设置和允许列表。
- `credentials/**`：渠道凭据（例如：WhatsApp 凭据）、配对允许列表、旧版 OAuth 导入。
- `agents/<agentId>/agent/auth-profiles.json`：API 密钥、令牌配置文件、OAuth 令牌以及可选的 `keyRef`/`tokenRef`。
- `agents/<agentId>/agent/codex-home/**`：每代理 Codex 应用服务器账户、配置、技能、插件、原生线程状态和诊断。
- `secrets.json`（可选）：`file` SecretRef 提供者使用的文件支持密钥有效载荷（`secrets.providers`）。
- `agents/<agentId>/agent/auth.json`：旧版兼容性文件。静态 `api_key` 条目在被发现时会被清除。
- `agents/<agentId>/sessions/**`：会话记录（`*.jsonl`）+ 路由元数据（`sessions.json`），可以包含私人消息和工具输出。
- 捆绑的插件包：已安装的插件（加上它们的 `node_modules/`）。
- `sandboxes/**`：工具沙盒工作区；可以在沙盒内积累你读/写的文件副本。

加固技巧：

- 保持权限紧密（目录 `700`，文件 `600`）。
- 在网关主机上使用全磁盘加密。
- 如果主机是共享的，优先为网关使用专用操作系统用户账户。

### 工作区 `.env` 文件

OpenClaw 为代理和工具加载工作区本地 `.env` 文件，但不允许这些文件静默覆盖网关运行时控制。

- 任何以 `OPENCLAW_*` 开头的键都被阻止来自不受信任的工作区 `.env` 文件。
- Matrix、Mattermost、IRC 和 Synology Chat 的渠道端点设置也被阻止来自工作区 `.env` 覆盖，因此克隆的工作区不能通过本地端点配置重定向捆绑连接器流量。端点 env 键（如 `MATRIX_HOMESERVER`、`MATTERMOST_URL`、`IRC_HOST`、`SYNOLOGY_CHAT_INCOMING_URL`）必须来自网关进程环境或 `env.shellEnv`，而不是来自工作区加载的 `.env`。
- 阻止是关闭失败的：将来版本中添加的新运行时控制变量不能从签入或攻击者提供的 `.env` 继承；键被忽略，网关保留自己的值。
- 受信任的进程/OS 环境变量（网关自己的 shell、launchd/systemd 单元、应用捆绑包）仍然适用——这只约束 `.env` 文件加载。

原因：工作区 `.env` 文件经常位于代理代码旁边，被意外提交，或被工具写入。阻止整个 `OPENCLAW_*` 前缀意味着以后添加新的 `OPENCLAW_*` 标志不会退回到来自工作区状态的静默继承。

### 日志和记录（编辑和保留）

即使访问控制是正确的，日志和记录也可能泄漏敏感信息：

- 网关日志可能包括工具摘要、错误和 URL。
- 会话记录可以包括粘贴的密钥、文件内容、命令输出和链接。

建议：

- 保持日志和记录编辑启用（`logging.redactSensitive: "tools"`；默认）。
- 通过 `logging.redactPatterns` 为你的环境添加自定义模式（令牌、主机名、内部 URL）。
- 共享诊断时，优先使用 `openclaw status --all`（可粘贴，密钥已编辑）而不是原始日志。
- 如果不需要长时间保留，请清理旧的会话记录和日志文件。

详情：[日志记录](/gateway/logging)

### 私信：默认配对

```json5
{
  channels: { whatsapp: { dmPolicy: "pairing" } },
}
```

### 群组：在任何地方都需要提及

```json
{
  "channels": {
    "whatsapp": {
      "groups": {
        "*": { "requireMention": true }
      }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "groupChat": { "mentionPatterns": ["@openclaw", "@mybot"] }
      }
    ]
  }
}
```

在群组聊天中，只有被明确提及时才响应。

### 单独的号码（WhatsApp、Signal、Telegram）

对于基于电话号码的渠道，考虑在与个人号码不同的单独电话号码上运行你的 AI：

- 个人号码：你的对话保持私密
- 机器人号码：AI 处理这些，具有适当的边界

### 只读模式（通过沙盒和工具）

你可以通过组合以下内容构建只读配置文件：

- `agents.defaults.sandbox.workspaceAccess: "ro"`（或 `"none"` 无工作区访问）
- 阻止 `write`、`edit`、`apply_patch`、`exec`、`process` 等的工具允许/拒绝列表

其他加固选项：

- `tools.exec.applyPatch.workspaceOnly: true`（默认）：确保即使沙盒关闭，`apply_patch` 也不能在工作区目录之外写入/删除。只有在你有意想要 `apply_patch` 接触工作区外的文件时才设置为 `false`。
- `tools.fs.workspaceOnly: true`（可选）：将 `read`/`write`/`edit`/`apply_patch` 路径和原生提示图像自动加载路径限制到工作区目录（如果你今天允许绝对路径且想要单一护栏，这很有用）。
- 保持文件系统根目录狭窄：避免为代理工作区/沙盒工作区使用你主目录等宽泛的根目录。宽泛的根目录可以将敏感的本地文件（例如 `~/.openclaw` 下的状态/配置）暴露给文件系统工具。

### 安全基线（复制/粘贴）

一个"安全默认"配置，保持网关私有，需要私信配对，并避免始终在线的群组机器人：

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    port: 18789,
    auth: { mode: "token", token: "your-long-random-token" },
  },
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

如果你也想要"默认更安全"的工具执行，请为任何非所有者代理添加沙盒 + 拒绝危险工具（以下示例在"每代理访问配置文件"下）。

内置的聊天驱动代理轮次基线：非所有者发送者不能使用 `cron` 或 `gateway` 工具。

## 沙盒（推荐）

专用文档：[沙盒](/gateway/sandboxing)

两种互补方法：

- **在 Docker 中运行完整网关**（容器边界）：[Docker](/install/docker)
- **工具沙盒**（`agents.defaults.sandbox`，主机网关 + 沙盒隔离的工具；Docker 是默认后端）：[沙盒](/gateway/sandboxing)

<Note>
为了防止跨代理访问，将 `agents.defaults.sandbox.scope` 保持在 `"agent"`（默认）或 `"session"` 以进行更严格的每会话隔离。`scope: "shared"` 使用单个容器或工作区。
</Note>

还要考虑沙盒内的代理工作区访问：

- `agents.defaults.sandbox.workspaceAccess: "none"`（默认）使代理工作区禁止访问；工具针对 `~/.openclaw/sandboxes` 下的沙盒工作区运行
- `agents.defaults.sandbox.workspaceAccess: "ro"` 在 `/agent` 以只读方式挂载代理工作区（禁用 `write`/`edit`/`apply_patch`）
- `agents.defaults.sandbox.workspaceAccess: "rw"` 在 `/workspace` 以读/写方式挂载代理工作区
- 额外的 `sandbox.docker.binds` 针对规范化和规范化的源路径进行验证。父符号链接技巧和规范的主目录别名如果解析到阻止的根（如 `/etc`、`/var/run` 或操作系统主目录下的凭据目录），仍然会关闭失败。

<Warning>
`tools.elevated` 是全局基线逃生舱口，在沙盒外运行 exec。有效主机默认为 `gateway`，或当 exec 目标配置为 `node` 时为 `node`。保持 `tools.elevated.allowFrom` 严格，不要为陌生人启用它。你可以通过 `agents.list[].tools.elevated` 进一步限制每代理的提升。参见[提升模式](/tools/elevated)。
</Warning>

### 子代理委托护栏

如果你允许会话工具，将委托的子代理运行视为另一个边界决策：

- 除非代理真正需要委托，否则拒绝 `sessions_spawn`。
- 将 `agents.defaults.subagents.allowAgents` 和任何每代理 `agents.list[].subagents.allowAgents` 覆盖限制为已知安全的目标代理。
- 对于任何必须保持沙盒的工作流，使用 `sandbox: "require"` 调用 `sessions_spawn`（默认为 `inherit`）。
- 当目标子运行时未沙盒化时，`sandbox: "require"` 会快速失败。

## 浏览器控制风险

启用浏览器控制使模型能够驱动真实的浏览器。如果该浏览器配置文件已经包含登录会话，模型可以访问这些账户和数据。将浏览器配置文件视为**敏感状态**：

- 优先为代理使用专用配置文件（默认 `openclaw` 配置文件）。
- 避免将代理指向你的个人日常驱动配置文件。
- 对沙盒代理禁用主机浏览器控制，除非你信任它们。
- 独立环回浏览器控制 API 只遵循共享密钥认证（网关令牌不记名认证或网关密码）。它不使用受信任代理或 Tailscale Serve 身份标头。
- 将浏览器下载视为不受信任的输入；优先使用隔离的下载目录。
- 如果可能，在代理配置文件中禁用浏览器同步/密码管理器（减少爆炸半径）。
- 对于远程网关，假设"浏览器控制"等同于该配置文件可以访问的任何内容的"操作员访问"。
- 将网关和节点主机仅保留在 tailnet；避免将浏览器控制端口暴露给 LAN 或公共互联网。
- 不需要时禁用浏览器代理路由（`gateway.nodes.browser.mode="off"`）。
- Chrome MCP 现有会话模式**不**"更安全"；它可以以该主机 Chrome 配置文件所能访问的方式行动。

### 浏览器 SSRF 策略（默认严格）

OpenClaw 的浏览器导航策略默认是严格的：私有/内部目标保持阻止，除非你明确选择加入。

- 默认值：`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 未设置，因此浏览器导航保持私有/内部/特殊用途目标阻止。
- 旧版别名：`browser.ssrfPolicy.allowPrivateNetwork` 仍然为兼容性接受。
- 可选加入模式：设置 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` 以允许私有/内部/特殊用途目标。
- 在严格模式下，使用 `hostnameAllowlist`（像 `*.example.com` 这样的模式）和 `allowedHostnames`（精确的主机例外，包括阻止的名称如 `localhost`）进行明确例外。
- 在请求之前检查导航，并在导航到最终 `http(s)` URL 后尽力重新检查，以减少基于重定向的枢转。

严格策略示例：

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com", "example.com"],
      allowedHostnames: ["localhost"],
    },
  },
}
```

## 每代理访问配置文件（多代理）

使用多代理路由，每个代理可以有自己的沙盒 + 工具策略：使用这个为每个代理提供**完全访问**、**只读**或**无访问**。有关完整详情和优先级规则，请参阅[多代理沙盒与工具](/tools/multi-agent-sandbox-tools)。

常见用例：

- 个人代理：完全访问，无沙盒
- 家庭/工作代理：沙盒化 + 只读工具
- 公共代理：沙盒化 + 无文件系统/shell 工具

### 示例：完全访问（无沙盒）

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    ],
  },
}
```

### 示例：只读工具 + 只读工作区

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "ro",
        },
        tools: {
          allow: ["read"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

### 示例：无文件系统/shell 访问（允许提供者消息）

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "none",
        },
        // 会话工具可以从记录中揭示敏感数据。默认情况下，OpenClaw 将这些工具限制
        // 为当前会话 + 生成的子代理会话，但如果需要，你可以进一步限制。
        // 请参阅配置参考中的 `tools.sessions.visibility`。
        tools: {
          sessions: { visibility: "tree" }, // self | tree | agent | all
          allow: [
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
            "whatsapp",
            "telegram",
            "slack",
            "discord",
          ],
          deny: [
            "read",
            "write",
            "edit",
            "apply_patch",
            "exec",
            "process",
            "browser",
            "canvas",
            "nodes",
            "cron",
            "gateway",
            "image",
          ],
        },
      },
    ],
  },
}
```

## 事件响应

如果你的 AI 做了坏事：

### 遏制

1. **停止它：** 停止 macOS 应用（如果它管理网关）或终止你的 `openclaw gateway` 进程。
2. **关闭暴露：** 设置 `gateway.bind: "loopback"`（或禁用 Tailscale Funnel/Serve），直到你了解发生了什么。
3. **冻结访问：** 将有风险的私信/群组切换为 `dmPolicy: "disabled"` / 需要提及，并删除 `"*"` 允许全部条目（如果你有的话）。

### 轮换（如果密钥泄漏则假设已被入侵）

1. 轮换网关认证（`gateway.auth.token` / `OPENCLAW_GATEWAY_PASSWORD`）并重启。
2. 在任何可以调用网关的机器上轮换远程客户端密钥（`gateway.remote.token` / `.password`）。
3. 轮换提供者/API 凭据（WhatsApp 凭据、Slack/Discord 令牌、`auth-profiles.json` 中的模型/API 密钥，以及使用时的加密密钥有效载荷值）。

### 审计

1. 检查网关日志：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`（或 `logging.file`）。
2. 审查相关记录：`~/.openclaw/agents/<agentId>/sessions/*.jsonl`。
3. 审查最近的配置更改（任何可能扩大访问权限的内容：`gateway.bind`、`gateway.auth`、私信/群组策略、`tools.elevated`、插件更改）。
4. 重新运行 `openclaw security audit --deep` 并确认关键发现已解决。

### 收集报告

- 时间戳、网关主机操作系统 + OpenClaw 版本
- 会话记录 + 简短的日志尾部（编辑后）
- 攻击者发送的内容 + 代理做了什么
- 网关是否暴露在环回之外（LAN/Tailscale Funnel/Serve）

## 密钥扫描

CI 在仓库上运行 pre-commit `detect-private-key` 钩子。如果它失败，请删除或轮换提交的密钥材料，然后在本地重现：

```bash
pre-commit run --all-files detect-private-key
```

## 报告安全问题

在 OpenClaw 中发现了漏洞？请负责任地报告：

1. 邮件：[security@openclaw.ai](mailto:security@openclaw.ai)
2. 修复之前不要公开发布
3. 我们会感谢你（除非你更喜欢匿名）
