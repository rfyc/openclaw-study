---
summary: "模型认证：OAuth、API 密钥、Claude CLI 复用及 Anthropic setup-token"
read_when:
  - 调试模型认证或 OAuth 过期问题
  - 文档化认证或凭据存储
title: "认证"
---

<Note>
本页是**模型提供商**认证参考（API 密钥、OAuth、Claude CLI 复用及 Anthropic setup-token）。关于**网关连接**认证（token、密码、trusted-proxy），请参见[配置](/gateway/configuration)和[受信代理认证](/gateway/trusted-proxy-auth)。
</Note>

OpenClaw 支持模型提供商的 OAuth 和 API 密钥认证。对于常驻网关主机，API 密钥通常是最可预测的选项。当符合你的提供商账户模型时，也支持订阅/OAuth 流程。

完整的 OAuth 流程和存储布局，请参见 [/concepts/oauth](/concepts/oauth)。
基于 SecretRef 的认证（`env`/`file`/`exec` 提供商），请参见[密钥管理](/gateway/secrets)。
`models status --probe` 使用的凭据资格/原因码规则，请参见[认证凭据语义](/auth-credential-semantics)。

## 推荐设置（API 密钥，任何提供商）

如果你运行的是长期网关，从你所选提供商的 API 密钥开始。
对于 Anthropic，API 密钥认证仍然是最可预测的服务器设置，但 OpenClaw 也支持复用本地 Claude CLI 登录。

1. 在你的提供商控制台创建 API 密钥。
2. 将其放在**网关主机**（运行 `openclaw gateway` 的机器）上。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果网关在 systemd/launchd 下运行，优先将密钥放入 `~/.openclaw/.env` 以便守护进程读取：

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

然后重启守护进程（或重启你的网关进程）并重新检查：

```bash
openclaw models status
openclaw doctor
```

如果你不想自己管理环境变量，引导流程可以为守护进程存储 API 密钥：`openclaw onboard`。

环境变量继承的详情（`env.shellEnv`、`~/.openclaw/.env`、systemd/launchd），请参见[帮助](/help)。

## Anthropic：Claude CLI 和 token 兼容性

Anthropic setup-token 认证在 OpenClaw 中仍然作为受支持的 token 路径可用。Anthropic 工作人员已告知我们 OpenClaw 风格的 Claude CLI 使用再次被允许，因此 OpenClaw 将 Claude CLI 复用和 `claude -p` 使用视为此集成的授权用法，除非 Anthropic 发布新政策。当主机上可用 Claude CLI 复用时，这现在是首选路径。

对于长期网关主机，Anthropic API 密钥仍然是最可预测的设置。如果你想在同一主机上复用现有的 Claude 登录，请在引导/配置中使用 Anthropic Claude CLI 路径。

Claude CLI 复用的推荐主机设置：

```bash
# 在网关主机上运行
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

这是两步设置：

1. 在网关主机上将 Claude Code 本身登录到 Anthropic。
2. 告知 OpenClaw 将 Anthropic 模型选择切换到本地 `claude-cli` 后端，并存储匹配的 OpenClaw 认证配置文件。

如果 `claude` 不在 `PATH` 中，请先安装 Claude Code，或将 `agents.defaults.cliBackends.claude-cli.command` 设置为真实的二进制路径。

手动 token 输入（任何提供商；写入 `auth-profiles.json` + 更新配置）：

```bash
openclaw models auth paste-token --provider openrouter
```

`auth-profiles.json` 仅存储凭据。其规范形状为：

```json
{
  "version": 1,
  "profiles": {
    "openrouter:default": {
      "type": "api_key",
      "provider": "openrouter",
      "key": "OPENROUTER_API_KEY"
    }
  }
}
```

OpenClaw 在运行时期望规范的 `version` + `profiles` 形状。如果旧安装仍有扁平文件（如 `{ "openrouter": { "apiKey": "..." } }`），请运行 `openclaw doctor --fix` 将其重写为 `openrouter:default` API 密钥配置文件；doctor 会在原始文件旁边保留 `.legacy-flat.*.bak` 副本。`baseUrl`、`api`、模型 ID、headers 和超时等端点详情属于 `openclaw.json` 或 `models.json` 中的 `models.providers.<id>`，而不是 `auth-profiles.json`。

认证配置文件引用也支持静态凭据：

- `api_key` 凭据可以使用 `keyRef: { source, provider, id }`
- `token` 凭据可以使用 `tokenRef: { source, provider, id }`
- OAuth 模式配置文件不支持 SecretRef 凭据；如果 `auth.profiles.<id>.mode` 设置为 `"oauth"`，该配置文件的 SecretRef 支持的 `keyRef`/`tokenRef` 输入将被拒绝。

自动化友好的检查（过期/缺失时退出 `1`，即将过期时退出 `2`）：

```bash
openclaw models status --check
```

实时认证探测：

```bash
openclaw models status --probe
```

注意事项：

- 探测行可以来自认证配置文件、环境变量凭据或 `models.json`。
- 如果显式的 `auth.order.<provider>` 省略了存储的配置文件，探测会为该配置文件报告 `excluded_by_auth_order`，而不是尝试它。
- 如果认证存在但 OpenClaw 无法为该提供商解析可探测的模型候选，探测会报告 `status: no_model`。
- 速率限制冷却时间可以针对特定模型。一个配置文件在一个模型上冷却时，仍然可以用于同一提供商的兄弟模型。

可选的操作脚本（systemd/Termux）记录在此：
[认证监控脚本](/help/scripts#auth-monitoring-scripts)

## Anthropic 注意事项

Anthropic `claude-cli` 后端再次受到支持。

- Anthropic 工作人员告知我们此 OpenClaw 集成路径再次被允许。
- 因此，OpenClaw 将 Claude CLI 复用和 `claude -p` 使用视为 Anthropic 支持的运行方式，除非 Anthropic 发布新政策。
- Anthropic API 密钥对于长期网关主机和明确的服务器端计费控制仍然是最可预测的选择。

## 检查模型认证状态

```bash
openclaw models status
openclaw doctor
```

## API 密钥轮换行为（网关）

某些提供商支持在 API 调用触及提供商速率限制时，使用备用密钥重试请求。

- 优先级顺序：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个覆盖）
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Google 提供商还包括 `GOOGLE_API_KEY` 作为额外的回退。
- 使用前对相同的密钥列表进行去重。
- OpenClaw 仅在速率限制错误时使用下一个密钥重试（例如 `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached` 或 `workers_ai ... quota limit exceeded`）。
- 非速率限制错误不会使用备用密钥重试。
- 如果所有密钥都失败，将返回最后一次尝试的最终错误。

## 控制使用哪个凭据

### 每会话（聊天命令）

使用 `/model <alias-or-id>@<profileId>` 为当前会话固定特定的提供商凭据（示例配置文件 ID：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`）获取紧凑的选择器；使用 `/model status` 获取完整视图（候选项 + 下一个认证配置文件，以及已配置时的提供商端点详情）。

### 每代理（CLI 覆盖）

为代理设置显式的认证配置文件顺序覆盖（存储在该代理的 `auth-state.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 指定特定代理；省略则使用已配置的默认代理。
调试顺序问题时，`openclaw models status --probe` 会将被省略的存储配置文件显示为 `excluded_by_auth_order`，而不是静默跳过它们。
调试冷却问题时，请记住速率限制冷却可能与一个模型 ID 绑定，而不是整个提供商配置文件。

## 故障排除

### "未找到凭据"

如果 Anthropic 配置文件缺失，请在**网关主机**上配置 Anthropic API 密钥或设置 Anthropic setup-token 路径，然后重新检查：

```bash
openclaw models status
```

### token 即将过期/已过期

运行 `openclaw models status` 确认哪个配置文件即将过期。如果 Anthropic token 配置文件缺失或过期，请通过 setup-token 刷新该设置，或迁移到 Anthropic API 密钥。

## 相关链接

- [密钥管理](/gateway/secrets)
- [远程访问](/gateway/remote)
- [认证存储](/concepts/oauth)
