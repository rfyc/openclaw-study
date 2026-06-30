---
summary: "`openclaw secrets` 的 CLI 参考（reload、audit、configure、apply）"
read_when:
  - 在运行时重新解析密钥引用时
  - 审计明文残留和未解析的引用时
  - 配置 SecretRef 并应用单向清除更改时
title: "Secrets"
---

# `openclaw secrets`

使用 `openclaw secrets` 管理 SecretRef 并保持活跃运行时快照健康。

命令角色：

- `reload`：gateway RPC（`secrets.reload`），仅在完全成功时重新解析引用并交换运行时快照（不写配置）。
- `audit`：配置/认证/生成模型存储和遗留残留的只读扫描，用于查找明文、未解析的引用和优先级漂移（除非设置了 `--allow-exec`，否则跳过执行引用）。
- `configure`：提供商设置、目标映射和预检的交互式规划器（需要 TTY）。
- `apply`：执行已保存的计划（`--dry-run` 仅用于验证；预演默认跳过执行检查，写入模式拒绝包含执行的计划，除非设置了 `--allow-exec`），然后清除目标的明文残留。

推荐的运营商操作循环：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

如果你的计划包含 `exec` SecretRef/提供商，在预演和写入应用命令上都传递 `--allow-exec`。

CI/门控的退出码说明：

- `audit --check` 在有发现时返回 `1`。
- 未解析的引用返回 `2`。

相关：

- 密钥指南：[Secrets Management](/gateway/secrets)
- 凭据界面：[SecretRef Credential Surface](/reference/secretref-credential-surface)
- 安全指南：[Security](/gateway/security)

## 重新加载运行时快照

重新解析密钥引用并原子地交换运行时快照。

```bash
openclaw secrets reload
openclaw secrets reload --json
openclaw secrets reload --url ws://127.0.0.1:18789 --token <token>
```

注意：

- 使用 gateway RPC 方法 `secrets.reload`。
- 如果解析失败，gateway 保持上次已知的良好快照并返回错误（无部分激活）。
- JSON 响应包含 `warningCount`。

选项：

- `--url <url>`
- `--token <token>`
- `--timeout <ms>`
- `--json`

## 审计

扫描 OpenClaw 状态以查找：

- 明文密钥存储
- 未解析的引用
- 优先级漂移（`auth-profiles.json` 凭据遮蔽 `openclaw.json` 引用）
- 生成的 `agents/*/agent/models.json` 残留（提供商 `apiKey` 值和敏感提供商头）
- 遗留残留（遗留认证存储条目、OAuth 提醒）

头部残留说明：

- 敏感提供商头检测基于名称启发式（常见的认证/凭据头名称和片段，如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

退出行为：

- `--check` 在有发现时以非零退出。
- 未解析的引用以更高优先级的非零代码退出。

报告形状要点：

- `status`：`clean | findings | unresolved`
- `resolution`：`refsChecked`、`skippedExecRefs`、`resolvabilityComplete`
- `summary`：`plaintextCount`、`unresolvedRefCount`、`shadowedRefCount`、`legacyResidueCount`
- 发现码：
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## 配置（交互式助手）

以交互方式构建提供商和 SecretRef 更改，运行预检，并可选择应用：

```bash
openclaw secrets configure
openclaw secrets configure --plan-out /tmp/openclaw-secrets-plan.json
openclaw secrets configure --apply --yes
openclaw secrets configure --providers-only
openclaw secrets configure --skip-provider-setup
openclaw secrets configure --agent ops
openclaw secrets configure --json
```

流程：

- 首先是提供商设置（`secrets.providers` 别名的 `add/edit/remove`）。
- 其次是凭据映射（选择字段并分配 `{source, provider, id}` 引用）。
- 最后是预检和可选应用。

标志：

- `--providers-only`：仅配置 `secrets.providers`，跳过凭据映射。
- `--skip-provider-setup`：跳过提供商设置，将凭据映射到现有提供商。
- `--agent <id>`：将 `auth-profiles.json` 目标发现和写入限定到一个代理存储。
- `--allow-exec`：允许预检/应用期间的执行 SecretRef 检查（可能执行提供商命令）。

注意：

- 需要交互式 TTY。
- 不能将 `--providers-only` 与 `--skip-provider-setup` 结合使用。
- `configure` 针对 `openclaw.json` 中的密钥承载字段以及所选代理范围的 `auth-profiles.json`。
- `configure` 支持在选择器流程中直接创建新的 `auth-profiles.json` 映射。
- 规范支持的界面：[SecretRef 凭据界面](/reference/secretref-credential-surface)。
- 在应用之前执行预检解析。
- 如果预检/应用包含执行引用，两个步骤都保持 `--allow-exec` 设置。
- 生成的计划默认为清除选项（`scrubEnv`、`scrubAuthProfilesForProviderTargets`、`scrubLegacyAuthJson` 全部启用）。
- 应用路径对于已清除的明文值是单向的。
- 不使用 `--apply` 时，CLI 仍然在预检后提示 `Apply this plan now?`。
- 使用 `--apply`（且没有 `--yes`）时，CLI 提示额外的不可逆确认。
- `--json` 打印计划 + 预检报告，但命令仍然需要交互式 TTY。

执行提供商安全说明：

- Homebrew 安装通常在 `/opt/homebrew/bin/*` 下公开符号链接的二进制文件。
- 仅在可信的包管理器路径需要时设置 `allowSymlinkCommand: true`，并配合 `trustedDirs`（例如 `["/opt/homebrew"]`）。
- 在 Windows 上，如果提供商路径的 ACL 验证不可用，OpenClaw 失败关闭。仅对受信任的路径，在该提供商上设置 `allowInsecurePath: true` 以绕过路径安全检查。

## 应用已保存的计划

应用或预检之前生成的计划：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

执行行为：

- `--dry-run` 验证预检而不写入文件。
- 在预演中默认跳过执行 SecretRef 检查。
- 写入模式拒绝包含执行 SecretRef/提供商的计划，除非设置了 `--allow-exec`。
- 使用 `--allow-exec` 选择加入两种模式中的执行提供商检查/执行。

计划合同详细信息（允许的目标路径、验证规则和失败语义）：

- [Secrets Apply 计划合同](/gateway/secrets-plan-contract)

`apply` 可能更新的内容：

- `openclaw.json`（SecretRef 目标 + 提供商更新/删除）
- `auth-profiles.json`（提供商目标清除）
- 遗留 `auth.json` 残留
- `~/.openclaw/.env` 值已迁移的已知密钥

## 为什么没有回滚备份

`secrets apply` 故意不写入包含旧明文值的回滚备份。

安全性来自严格的预检 + 在失败时尝试内存中恢复的原子化应用。

## 示例

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

如果 `audit --check` 仍然报告明文发现，更新剩余报告的目标路径并重新运行审计。

## 相关

- [CLI 参考](/cli)
- [密钥管理](/gateway/secrets)
