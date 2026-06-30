---
summary: "密钥管理：SecretRef 合约、运行时快照行为和安全的单向清除"
read_when:
  - 为提供者凭据和 `auth-profiles.json` 引用配置 SecretRef 时
  - 在生产环境中安全操作密钥重载、审计、配置和应用时
  - 了解启动快速失败、非活跃表面过滤和最后已知良好状态行为时
title: "密钥管理"
sidebarTitle: "密钥管理"
---

OpenClaw 支持附加式 SecretRef，因此受支持的凭据无需以明文形式存储在配置中。

<Note>
明文仍然有效。SecretRef 是每个凭据的可选项。
</Note>

## 目标和运行时模型

密钥被解析为内存中的运行时快照。

- 解析在激活时是即时的，而非请求路径上的延迟加载。
- 当有效活跃的 SecretRef 无法解析时，启动会快速失败。
- 重载使用原子交换：要么全部成功，要么保留最后已知良好的快照。
- SecretRef 策略违规（例如 OAuth 模式认证配置文件与 SecretRef 输入结合）会在运行时交换之前导致激活失败。
- 运行时请求仅从活跃的内存快照读取。
- 在首次成功配置激活/加载后，运行时代码路径持续读取该活跃内存快照，直到成功重载将其替换。
- 出站传递路径也从该活跃快照读取（例如 Discord 回复/线程传递和 Telegram 动作发送）；它们不会在每次发送时重新解析 SecretRef。

这使密钥提供者的中断不影响热请求路径。

## 活跃表面过滤

SecretRef 仅在有效活跃的表面上进行验证。

- 已启用的表面：未解析的引用会阻止启动/重载。
- 非活跃表面：未解析的引用不会阻止启动/重载。
- 非活跃引用会以代码 `SECRETS_REF_IGNORED_INACTIVE_SURFACE` 发出非致命诊断信息。

<AccordionGroup>
  <Accordion title="非活跃表面示例">
    - 已禁用的渠道/账户条目。
    - 没有任何已启用账户继承的顶层渠道凭据。
    - 已禁用的工具/功能表面。
    - `tools.web.search.provider` 未选择的网络搜索提供者特定密钥。在自动模式（提供者未设置）下，密钥按优先级顺序被咨询以进行提供者自动检测，直到有一个解析成功。选定后，未选定的提供者密钥在被选定之前被视为非活跃。
    - 沙盒 SSH 认证材料（`agents.defaults.sandbox.ssh.identityData`、`certificateData`、`knownHostsData`，以及每代理覆盖）仅当默认代理或已启用代理的有效沙盒后端为 `ssh` 时才处于活跃状态。
    - `gateway.remote.token` / `gateway.remote.password` SecretRef 在满足以下条件之一时处于活跃状态：
      - `gateway.mode=remote`
      - 已配置 `gateway.remote.url`
      - `gateway.tailscale.mode` 为 `serve` 或 `funnel`
      - 在本地模式下没有这些远程表面时：
        - 当令牌认证可以胜出且没有配置 env/auth 令牌时，`gateway.remote.token` 处于活跃状态。
        - 只有当密码认证可以胜出且没有配置 env/auth 密码时，`gateway.remote.password` 才处于活跃状态。
    - 当设置了 `OPENCLAW_GATEWAY_TOKEN` 时，`gateway.auth.token` SecretRef 对启动认证解析处于非活跃状态，因为 env 令牌输入对该运行时优先。

  </Accordion>
</AccordionGroup>

## 网关认证表面诊断

当在 `gateway.auth.token`、`gateway.auth.password`、`gateway.remote.token` 或 `gateway.remote.password` 上配置了 SecretRef 时，网关启动/重载会明确记录表面状态：

- `active`：SecretRef 是有效认证表面的一部分，必须解析。
- `inactive`：由于另一个认证表面胜出，或因为远程认证已禁用/不活跃，SecretRef 对此运行时被忽略。

这些条目以 `SECRETS_GATEWAY_AUTH_SURFACE` 记录，并包含活跃表面策略使用的原因，因此你可以看到为何某个凭据被视为活跃或非活跃。

## 引导参考预检

当引导在交互模式下运行并选择 SecretRef 存储时，OpenClaw 在保存之前运行预检验证：

- Env 引用：验证 env 变量名，并确认在设置过程中可见非空值。
- 提供者引用（`file` 或 `exec`）：验证提供者选择，解析 `id`，并检查已解析的值类型。
- 快速启动重用路径：当 `gateway.auth.token` 已经是 SecretRef 时，引导会在探测/仪表板引导程序之前解析它（对于 `env`、`file` 和 `exec` 引用），使用相同的快速失败门控。

如果验证失败，引导程序会显示错误并允许你重试。

## SecretRef 合约

在任何地方使用同一对象形状：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

<Tabs>
  <Tab title="env">
    ```json5
    { source: "env", provider: "default", id: "OPENAI_API_KEY" }
    ```

    验证：

    - `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必须匹配 `^[A-Z][A-Z0-9_]{0,127}$`

  </Tab>
  <Tab title="file">
    ```json5
    { source: "file", provider: "filemain", id: "/providers/openai/apiKey" }
    ```

    验证：

    - `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必须是绝对 JSON 指针（`/...`）
    - 段中的 RFC6901 转义：`~` => `~0`，`/` => `~1`

  </Tab>
  <Tab title="exec">
    ```json5
    { source: "exec", provider: "vault", id: "providers/openai/apiKey" }
    ```

    验证：

    - `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必须匹配 `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
    - `id` 不得包含 `.` 或 `..` 作为斜杠分隔的路径段（例如 `a/../b` 会被拒绝）

  </Tab>
</Tabs>

## 提供者配置

在 `secrets.providers` 下定义提供者：

```json5
{
  secrets: {
    providers: {
      default: { source: "env" },
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json", // 或 "singleValue"
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        args: ["--profile", "prod"],
        passEnv: ["PATH", "VAULT_ADDR"],
        jsonOnly: true,
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
    resolution: {
      maxProviderConcurrency: 4,
      maxRefsPerProvider: 512,
      maxBatchBytes: 262144,
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Env 提供者">
    - 通过 `allowlist` 配置可选的允许列表。
    - 缺失/空的 env 值会导致解析失败。

  </Accordion>
  <Accordion title="File 提供者">
    - 从 `path` 读取本地文件。
    - `mode: "json"` 期望 JSON 对象有效载荷，并将 `id` 作为指针解析。
    - `mode: "singleValue"` 期望引用 id 为 `"value"`，并返回文件内容。
    - 路径必须通过所有权/权限检查。
    - Windows 关闭失败说明：如果路径的 ACL 验证不可用，解析会失败。对于仅受信任的路径，在该提供者上设置 `allowInsecurePath: true` 以跳过路径安全检查。

  </Accordion>
  <Accordion title="Exec 提供者">
    - 运行已配置的绝对二进制路径，无 shell。
    - 默认情况下，`command` 必须指向常规文件（非符号链接）。
    - 设置 `allowSymlinkCommand: true` 以允许符号链接命令路径（例如 Homebrew shims）。OpenClaw 会验证已解析的目标路径。
    - 将 `allowSymlinkCommand` 与 `trustedDirs` 配对用于包管理器路径（例如 `["/opt/homebrew"]`）。
    - 支持超时、无输出超时、输出字节限制、env 允许列表和可信目录。
    - Windows 关闭失败说明：如果命令路径的 ACL 验证不可用，解析会失败。对于仅受信任的路径，在该提供者上设置 `allowInsecurePath: true` 以跳过路径安全检查。

    请求有效载荷（stdin）：

    ```json
    { "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
    ```

    响应有效载荷（stdout）：

    ```jsonc
    { "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
    ```

    可选的每 id 错误：

    ```json
    {
      "protocolVersion": 1,
      "values": {},
      "errors": { "providers/openai/apiKey": { "message": "not found" } }
    }
    ```

  </Accordion>
</AccordionGroup>

## Exec 集成示例

<AccordionGroup>
  <Accordion title="1Password CLI">
    ```json5
    {
      secrets: {
        providers: {
          onepassword_openai: {
            source: "exec",
            command: "/opt/homebrew/bin/op",
            allowSymlinkCommand: true, // Homebrew 符号链接二进制文件所需
            trustedDirs: ["/opt/homebrew"],
            args: ["read", "op://Personal/OpenClaw QA API Key/password"],
            passEnv: ["HOME"],
            jsonOnly: false,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: { source: "exec", provider: "onepassword_openai", id: "value" },
          },
        },
      },
    }
    ```
  </Accordion>
  <Accordion title="HashiCorp Vault CLI">
    ```json5
    {
      secrets: {
        providers: {
          vault_openai: {
            source: "exec",
            command: "/opt/homebrew/bin/vault",
            allowSymlinkCommand: true, // Homebrew 符号链接二进制文件所需
            trustedDirs: ["/opt/homebrew"],
            args: ["kv", "get", "-field=OPENAI_API_KEY", "secret/openclaw"],
            passEnv: ["VAULT_ADDR", "VAULT_TOKEN"],
            jsonOnly: false,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: { source: "exec", provider: "vault_openai", id: "value" },
          },
        },
      },
    }
    ```
  </Accordion>
  <Accordion title="sops">
    ```json5
    {
      secrets: {
        providers: {
          sops_openai: {
            source: "exec",
            command: "/opt/homebrew/bin/sops",
            allowSymlinkCommand: true, // Homebrew 符号链接二进制文件所需
            trustedDirs: ["/opt/homebrew"],
            args: ["-d", "--extract", '["providers"]["openai"]["apiKey"]', "/path/to/secrets.enc.json"],
            passEnv: ["SOPS_AGE_KEY_FILE"],
            jsonOnly: false,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: { source: "exec", provider: "sops_openai", id: "value" },
          },
        },
      },
    }
    ```
  </Accordion>
</AccordionGroup>

## MCP 服务器环境变量

通过 `plugins.entries.acpx.config.mcpServers` 配置的 MCP 服务器 env 变量支持 SecretInput。这使 API 密钥和令牌不出现在明文配置中：

```json5
{
  plugins: {
    entries: {
      acpx: {
        enabled: true,
        config: {
          mcpServers: {
            github: {
              command: "npx",
              args: ["-y", "@modelcontextprotocol/server-github"],
              env: {
                GITHUB_PERSONAL_ACCESS_TOKEN: {
                  source: "env",
                  provider: "default",
                  id: "MCP_GITHUB_PAT",
                },
              },
            },
          },
        },
      },
    },
  },
}
```

明文字符串值仍然有效。像 `${MCP_SERVER_API_KEY}` 这样的 Env 模板引用和 SecretRef 对象在 MCP 服务器进程生成之前会在网关激活期间解析。与其他 SecretRef 表面一样，未解析的引用只有在 `acpx` 插件有效活跃时才会阻止激活。

## 沙盒 SSH 认证材料

核心 `ssh` 沙盒后端也支持 SSH 认证材料的 SecretRef：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        ssh: {
          target: "user@gateway-host:22",
          identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

运行时行为：

- OpenClaw 在沙盒激活期间解析这些引用，而非在每次 SSH 调用时延迟解析。
- 已解析的值被写入具有限制性权限的临时文件，并用于生成的 SSH 配置。
- 如果有效的沙盒后端不是 `ssh`，这些引用保持非活跃状态，不会阻止启动。

## 受支持的凭据表面

规范的受支持和不受支持凭据列在：

- [SecretRef 凭据面](/reference/secretref-credential-surface)

<Note>
运行时生成或轮换的凭据以及 OAuth 刷新材料有意从只读 SecretRef 解析中排除。
</Note>

## 必要行为和优先级

- 没有引用的字段：保持不变。
- 有引用的字段：在激活期间对活跃表面是必须的。
- 如果同时存在明文和引用，引用在受支持的优先级路径上优先。
- 编辑哨兵 `__OPENCLAW_REDACTED__` 保留用于内部配置编辑/恢复，作为字面提交的配置数据会被拒绝。

警告和审计信号：

- `SECRETS_REF_OVERRIDES_PLAINTEXT`（运行时警告）
- `REF_SHADOWED`（`auth-profiles.json` 凭据优先于 `openclaw.json` 引用时的审计发现）

Google Chat 兼容性行为：

- `serviceAccountRef` 优先于明文 `serviceAccount`。
- 当兄弟引用已设置时，明文值会被忽略。

## 激活触发器

密钥激活运行于：

- 启动（预检加最终激活）
- 配置热应用重载路径
- 配置重载重启检查路径
- 通过 `secrets.reload` 手动重载
- 网关配置写入 RPC 预检（`config.set` / `config.apply` / `config.patch`），在持久化编辑之前对提交的配置有效载荷中的活跃表面 SecretRef 可解析性进行检查

激活合约：

- 成功时以原子方式交换快照。
- 启动失败会中止网关启动。
- 运行时重载失败会保留最后已知良好的快照。
- 写入 RPC 预检失败会拒绝提交的配置，并保持磁盘配置和活跃运行时快照不变。
- 向出站辅助工具/工具调用提供明确的每次调用渠道令牌不会触发 SecretRef 激活；激活点仍然是启动、重载和显式 `secrets.reload`。

## 降级和恢复信号

当重载时激活在健康状态后失败时，OpenClaw 进入降级密钥状态。

一次性系统事件和日志代码：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行为：

- 降级：运行时保留最后已知良好的快照。
- 恢复：在下次成功激活后发出一次。
- 已处于降级状态时重复失败会记录警告，但不会产生事件垃圾。
- 启动快速失败不会发出降级事件，因为运行时从未变为活跃状态。

## 命令路径解析

命令路径可以通过网关快照 RPC 选择支持的 SecretRef 解析。

有两种广泛的行为：

<Tabs>
  <Tab title="严格命令路径">
    例如 `openclaw memory` 远程内存路径，以及需要远程共享密钥引用时的 `openclaw qr --remote`。它们从活跃快照读取，并在所需的 SecretRef 不可用时快速失败。
  </Tab>
  <Tab title="只读命令路径">
    例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit` 和只读 doctor/配置修复流程。它们也优先使用活跃快照，但在目标 SecretRef 在该命令路径中不可用时会降级而非中止。

    只读行为：

    - 当网关运行时，这些命令首先从活跃快照读取。
    - 如果网关解析不完整或网关不可用，它们会尝试针对特定命令表面的目标本地回退。
    - 如果目标 SecretRef 仍然不可用，命令将继续并提供降级的只读输出，并附有明确的诊断信息，例如"已配置但在此命令路径中不可用"。
    - 这种降级行为仅限于该命令。它不会削弱运行时启动、重载或发送/认证路径。

  </Tab>
</Tabs>

其他说明：

- 后端密钥轮换后的快照刷新由 `openclaw secrets reload` 处理。
- 这些命令路径使用的网关 RPC 方法：`secrets.resolve`。

## 审计和配置工作流

默认操作员流程：

<Steps>
  <Step title="审计当前状态">
    ```bash
    openclaw secrets audit --check
    ```
  </Step>
  <Step title="配置 SecretRef">
    ```bash
    openclaw secrets configure
    ```
  </Step>
  <Step title="重新审计">
    ```bash
    openclaw secrets audit --check
    ```
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="secrets audit">
    发现内容包括：

    - 静态明文值（`openclaw.json`、`auth-profiles.json`、`.env` 和生成的 `agents/*/agent/models.json`）
    - 生成的 `models.json` 条目中的明文敏感提供者标头残留
    - 未解析的引用
    - 优先级遮蔽（`auth-profiles.json` 优先于 `openclaw.json` 引用）
    - 旧版残留（`auth.json`、OAuth 提示）

    Exec 说明：

    - 默认情况下，审计跳过 exec SecretRef 可解析性检查以避免命令副作用。
    - 使用 `openclaw secrets audit --allow-exec` 在审计期间执行 exec 提供者。

    标头残留说明：

    - 敏感提供者标头检测基于名称启发式（常见的认证/凭据标头名称和片段，如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

  </Accordion>
  <Accordion title="secrets configure">
    交互式助手，可：

    - 首先配置 `secrets.providers`（`env`/`file`/`exec`，添加/编辑/删除）
    - 让你在 `openclaw.json` 中选择受支持的密钥字段，以及一个代理范围的 `auth-profiles.json`
    - 可以直接在目标选择器中创建新的 `auth-profiles.json` 映射
    - 捕获 SecretRef 详细信息（`source`、`provider`、`id`）
    - 运行预检解析
    - 可以立即应用

    Exec 说明：

    - 除非设置了 `--allow-exec`，否则预检会跳过 exec SecretRef 检查。
    - 如果你直接从 `configure --apply` 应用且计划包含 exec 引用/提供者，在应用步骤中也要保持 `--allow-exec` 设置。

    有用的模式：

    - `openclaw secrets configure --providers-only`
    - `openclaw secrets configure --skip-provider-setup`
    - `openclaw secrets configure --agent <id>`

    `configure` 应用默认值：

    - 从 `auth-profiles.json` 中清除目标提供者的匹配静态凭据
    - 从 `auth.json` 中清除旧版静态 `api_key` 条目
    - 从 `<config-dir>/.env` 中清除匹配的已知密钥行

  </Accordion>
  <Accordion title="secrets apply">
    应用已保存的计划：

    ```bash
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
    ```

    Exec 说明：

    - 除非设置了 `--allow-exec`，否则 dry-run 会跳过 exec 检查。
    - 写入模式会拒绝包含 exec SecretRefs/提供者的计划，除非设置了 `--allow-exec`。

    有关严格的目标/路径合约详细信息和确切的拒绝规则，请参阅 [Secrets Apply 计划合约](/gateway/secrets-plan-contract)。

  </Accordion>
</AccordionGroup>

## 单向安全策略

<Warning>
OpenClaw 有意不写入包含历史明文密钥值的回滚备份。
</Warning>

安全模型：

- 预检必须在写入模式前成功
- 在提交前验证运行时激活
- apply 使用原子文件替换更新文件，失败时尽力恢复

## 旧版认证兼容性说明

对于静态凭据，运行时不再依赖于明文旧版认证存储。

- 运行时凭据来源是已解析的内存快照。
- 旧版静态 `api_key` 条目在被发现时会被清除。
- OAuth 相关兼容性行为保持独立。

## Web UI 说明

某些 SecretInput 联合类型在原始编辑器模式下比在表单模式下更容易配置。

## 相关链接

- [认证](/gateway/authentication) — 认证设置
- [CLI: secrets](/cli/secrets) — CLI 命令
- [环境变量](/help/environment) — 环境优先级
- [SecretRef 凭据面](/reference/secretref-credential-surface) — 凭据表面
- [Secrets Apply 计划合约](/gateway/secrets-plan-contract) — 计划合约详情
- [安全](/gateway/security) — 安全态势
