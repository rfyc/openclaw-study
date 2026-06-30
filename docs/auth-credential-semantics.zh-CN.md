---
summary: "认证配置文件的凭证资格和解析语义规范"
title: "认证凭证语义"
read_when:
  - 处理认证配置文件解析或凭证路由时
  - 调试模型认证失败或配置文件顺序时
---

本文档定义了以下场景中使用的规范凭证资格和解析语义：

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

目标是保持选择时和运行时行为的一致性。

## 稳定的探测原因码

- `ok`
- `excluded_by_auth_order`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`
- `no_model`

## 令牌凭证

令牌凭证（`type: "token"`）支持内联 `token` 和/或 `tokenRef`。

### 资格规则

1. 当 `token` 和 `tokenRef` 均缺失时，令牌配置文件不符合资格。
2. `expires` 是可选的。
3. 如果存在 `expires`，它必须是大于 `0` 的有限数值。
4. 如果 `expires` 无效（`NaN`、`0`、负数、非有限值或类型错误），配置文件将以 `invalid_expires` 标记为不符合资格。
5. 如果 `expires` 已过期，配置文件将以 `expired` 标记为不符合资格。
6. `tokenRef` 不会绕过 `expires` 验证。

### 解析规则

1. 解析器语义与 `expires` 的资格语义相匹配。
2. 对于符合资格的配置文件，令牌材料可以从内联值或 `tokenRef` 解析。
3. 无法解析的引用会在 `models status --probe` 输出中产生 `unresolved_ref`。

## 代理副本可移植性

代理认证继承采用透读方式。当代理没有本地配置文件时，它可以在运行时从默认/主代理存储解析配置文件，而无需将密钥材料复制到自己的 `auth-profiles.json` 中。

显式复制流程（如 `openclaw agents add`）使用以下可移植性策略：

- `api_key` 配置文件是可移植的，除非 `copyToAgents: false`。
- `token` 配置文件是可移植的，除非 `copyToAgents: false`。
- `oauth` 配置文件默认不可移植，因为刷新令牌可能是单次使用或轮换敏感的。
- 提供商自有的 OAuth 流程可以通过 `copyToAgents: true` 选择加入，但仅在已知跨代理复制刷新材料是安全的情况下。

不可移植的配置文件仍可通过透读继承使用，除非目标代理单独登录并创建自己的本地配置文件。

## 显式认证顺序过滤

- 当为某个提供商设置了 `auth.order.<provider>` 或认证存储顺序覆盖时，`models status --probe` 只会探测该提供商已解析认证顺序中保留的配置文件 ID。
- 该提供商的存储配置文件如果被从显式顺序中排除，不会在之后悄悄尝试。探测输出会将其报告为 `reasonCode: excluded_by_auth_order`，详情为 `Excluded by auth.order for this provider.`

## 探测目标解析

- 探测目标可以来自认证配置文件、环境凭证或 `models.json`。
- 如果提供商有凭证但 OpenClaw 无法为其解析可探测的模型候选者，`models status --probe` 会报告 `status: no_model`，`reasonCode: no_model`。

## 外部 CLI 凭证发现

- 外部 CLI 拥有的运行时凭证仅在以下情况下被发现：提供商、运行时或认证配置文件在当前操作范围内，或者该外部源的存储本地配置文件已存在。
- 认证存储调用方应选择显式的外部 CLI 发现模式：`none` 仅用于持久化/插件认证，`existing` 用于刷新已存储的外部 CLI 配置文件，`scoped` 用于具体的提供商/配置文件集。
- 只读/状态路径传递 `allowKeychainPrompt: false`；它们仅使用文件支持的外部 CLI 凭证，不读取或重用 macOS 钥匙串结果。

## OAuth SecretRef 策略守卫

- SecretRef 输入仅用于静态凭证。
- 如果配置文件凭证为 `type: "oauth"`，则该配置文件凭证材料不支持 SecretRef 对象。
- 如果 `auth.profiles.<id>.mode` 为 `"oauth"`，则该配置文件的 SecretRef 支持的 `keyRef`/`tokenRef` 输入将被拒绝。
- 违规行为在启动/重新加载认证解析路径中是硬失败。

## 遗留兼容消息

为了脚本兼容性，探测错误保持第一行不变：

`Auth profile credentials are missing or expired.`

对人友好的详情和稳定的原因码可以添加在后续行中。

## 相关

- [密钥管理](/gateway/secrets)
- [认证存储](/concepts/oauth)
