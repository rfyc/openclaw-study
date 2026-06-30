---
summary: "`secrets apply` 计划的合约：目标验证、路径匹配和 `auth-profiles.json` 目标范围"
read_when:
  - 生成或审查 `openclaw secrets apply` 计划时
  - 调试 `Invalid plan target path` 错误时
  - 了解目标类型和路径验证行为时
title: "Secrets apply 计划合约"
---

本页定义了 `openclaw secrets apply` 强制执行的严格合约。

如果目标不符合这些规则，apply 会在修改配置之前失败。

## 计划文件结构

`openclaw secrets apply --from <plan.json>` 期望一个包含计划目标的 `targets` 数组：

```json5
{
  version: 1,
  protocolVersion: 1,
  targets: [
    {
      type: "models.providers.apiKey",
      path: "models.providers.openai.apiKey",
      pathSegments: ["models", "providers", "openai", "apiKey"],
      providerId: "openai",
      ref: { source: "env", provider: "default", id: "OPENAI_API_KEY" },
    },
    {
      type: "auth-profiles.api_key.key",
      path: "profiles.openai:default.key",
      pathSegments: ["profiles", "openai:default", "key"],
      agentId: "main",
      ref: { source: "env", provider: "default", id: "OPENAI_API_KEY" },
    },
  ],
}
```

## 支持的目标范围

计划目标在以下受支持的凭据路径中被接受：

- [SecretRef 凭据面](/reference/secretref-credential-surface)

## 目标类型行为

通用规则：

- `target.type` 必须是已识别的，且必须与规范化的 `target.path` 形状匹配。

兼容性别名对现有计划仍然有效：

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

## 路径验证规则

每个目标都将通过以下所有验证：

- `type` 必须是已识别的目标类型。
- `path` 必须是非空的点路径。
- `pathSegments` 可以省略。如果提供，它必须规范化为与 `path` 完全相同的路径。
- 禁止的段会被拒绝：`__proto__`、`prototype`、`constructor`。
- 规范化路径必须与目标类型的已注册路径形状匹配。
- 如果设置了 `providerId` 或 `accountId`，它必须与路径中编码的 id 匹配。
- `auth-profiles.json` 目标需要 `agentId`。
- 创建新的 `auth-profiles.json` 映射时，需要包含 `authProfileProvider`。

## 失败行为

如果目标验证失败，apply 将以如下错误退出：

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

无效计划不会提交任何写入操作。

## Exec 提供者授权行为

- `--dry-run` 默认跳过 exec SecretRef 检查。
- 包含 exec SecretRefs/providers 的计划在写入模式下会被拒绝，除非设置了 `--allow-exec`。
- 验证/应用包含 exec 的计划时，在 dry-run 和写入命令中均需传递 `--allow-exec`。

## 运行时和审计范围说明

- 仅引用的 `auth-profiles.json` 条目（`keyRef`/`tokenRef`）包含在运行时解析和审计覆盖范围内。
- `secrets apply` 写入受支持的 `openclaw.json` 目标、受支持的 `auth-profiles.json` 目标和可选的清理目标。

## 操作员检查

```bash
# 在不写入的情况下验证计划
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run

# 然后正式应用
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json

# 对于包含 exec 的计划，在两种模式下都需要明确选择加入
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
```

如果 apply 失败并显示无效目标路径消息，请使用 `openclaw secrets configure` 重新生成计划，或将目标路径修复为上述受支持的形状。

## 相关文档

- [密钥管理](/gateway/secrets)
- [CLI `secrets`](/cli/secrets)
- [SecretRef 凭据面](/reference/secretref-credential-surface)
- [配置参考](/gateway/configuration-reference)
