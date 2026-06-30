---
summary: "OpenClaw 中的 OAuth：令牌交换、存储和多账户模式"
read_when:
  - 你想了解 OpenClaw OAuth 的端到端流程
  - 你遇到了令牌失效/注销问题
  - 你想要 Claude CLI 或 OAuth 认证流程
  - 你想要多个账户或配置文件路由
title: "OAuth"
---

OpenClaw 通过 OAuth 支持"订阅认证"，适用于提供该功能的提供商（尤其是 **OpenAI Codex（ChatGPT OAuth）**）。对于 Anthropic，实际分法现在是：

- **Anthropic API 密钥**：正常的 Anthropic API 计费
- **Anthropic Claude CLI / OpenClaw 内的订阅认证**：Anthropic 员工告诉我们这种使用方式再次被允许

OpenAI Codex OAuth 明确支持在 OpenClaw 等外部工具中使用。本页面解释：

对于生产环境中的 Anthropic，API 密钥认证是更安全的推荐路径。

- OAuth **令牌交换**如何工作（PKCE）
- 令牌**存储**位置（以及原因）
- 如何处理**多个账户**（配置文件 + 每会话覆盖）

OpenClaw 还支持提供商插件，这些插件提供自己的 OAuth 或 API 密钥流程。通过以下方式运行它们：

```bash
openclaw models auth login --provider <id>
```

## 令牌接收器（它存在的原因）

OAuth 提供商通常在登录/刷新流程中铸造**新的刷新令牌**。某些提供商（或 OAuth 客户端）在为同一用户/应用发出新令牌时可能会使旧的刷新令牌失效。

实际症状：

- 你通过 OpenClaw _和_ Claude Code / Codex CLI 登录 → 其中一个在之后随机"注销"

为了减少这种情况，OpenClaw 将 `auth-profiles.json` 视为**令牌接收器**：

- 运行时从**一个地方**读取凭证
- 我们可以保存多个配置文件并确定性地路由它们
- 外部 CLI 重用是特定于提供商的：Codex CLI 可以引导一个空的 `openai-codex:default` 配置文件，但一旦 OpenClaw 有了本地 OAuth 配置文件，本地刷新令牌就是规范的；其他集成可以保持外部管理并重新读取其 CLI 认证存储
- 已知配置的提供商集的状态和启动路径将外部 CLI 发现限定在该集内，因此单提供商设置不会探测不相关的 CLI 登录存储

## 存储（令牌存储位置）

密钥存储在智能体认证存储中：

- 认证配置文件（OAuth + API 密钥 + 可选值级引用）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 遗留兼容文件：`~/.openclaw/agents/<agentId>/agent/auth.json`（发现时静态 `api_key` 条目被清除）

遗留仅导入文件（仍然支持，但不是主存储）：

- `~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json`）

以上所有也遵守 `$OPENCLAW_STATE_DIR`（状态目录覆盖）。完整参考：[/gateway/configuration](/gateway/configuration-reference#auth-storage)

有关静态密钥引用和运行时快照激活行为，参见[密钥管理](/gateway/secrets)。

当次级智能体没有本地认证配置文件时，OpenClaw 使用来自默认/主智能体存储的读透继承。它不在读取时克隆主智能体的 `auth-profiles.json`。OAuth 刷新令牌特别敏感：正常的复制流程默认跳过它们，因为某些提供商在使用后轮换或使刷新令牌失效。当智能体需要独立账户时，为其配置单独的 OAuth 登录。

## Anthropic 遗留令牌兼容性

<Warning>
Anthropic 的公开 Claude Code 文档说直接的 Claude Code 使用保持在 Claude 订阅限制内，Anthropic 员工告诉我们 OpenClaw 风格的 Claude CLI 使用再次被允许。因此 OpenClaw 将 Claude CLI 重用和 `claude -p` 使用视为此集成的获批使用，除非 Anthropic 发布新政策。

有关 Anthropic 当前直接 Claude Code 计划文档，参见[使用 Claude Code 与你的 Pro 或 Max 计划](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)和[使用 Claude Code 与你的 Team 或 Enterprise 计划](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)。

如果你想要 OpenClaw 中的其他订阅风格选项，参见 [OpenAI Codex](/providers/openai)、[Qwen Cloud 编码计划](/providers/qwen)、[MiniMax 编码计划](/providers/minimax)和 [Z.AI / GLM 编码计划](/providers/glm)。
</Warning>

OpenClaw 还将 Anthropic 设置令牌作为受支持的令牌认证路径公开，但现在在可用时优先使用 Claude CLI 重用和 `claude -p`。

## Anthropic Claude CLI 迁移

OpenClaw 再次支持 Anthropic Claude CLI 重用。如果主机上已经有本地 Claude 登录，引导/configure 可以直接重用它。

## OAuth 交换（登录如何工作）

OpenClaw 的交互式登录流程在 `@mariozechner/pi-ai` 中实现，并连接到向导/命令中。

### Anthropic 设置令牌

流程形状：

1. 从 OpenClaw 启动 Anthropic 设置令牌或粘贴令牌
2. OpenClaw 将生成的 Anthropic 凭证存储在认证配置文件中
3. 模型选择保持在 `anthropic/...`
4. 现有的 Anthropic 认证配置文件仍然可用于回滚/顺序控制

### OpenAI Codex（ChatGPT OAuth）

OpenAI Codex OAuth 明确支持在 Codex CLI 之外使用，包括 OpenClaw 工作流。

流程形状（PKCE）：

1. 生成 PKCE 验证器/质询 + 随机 `state`
2. 打开 `https://auth.openai.com/oauth/authorize?...`
3. 尝试在 `http://127.0.0.1:1455/auth/callback` 捕获回调
4. 如果回调无法绑定（或你是远程/无头的），粘贴重定向 URL/代码
5. 在 `https://auth.openai.com/oauth/token` 交换
6. 从访问令牌提取 `accountId` 并存储 `{ access, refresh, expires, accountId }`

向导路径是 `openclaw onboard` → 认证选择 `openai-codex`。

## 刷新 + 到期

配置文件存储 `expires` 时间戳。

在运行时：

- 如果 `expires` 在未来 → 使用存储的访问令牌
- 如果过期 → 刷新（在文件锁下）并覆盖存储的凭证
- 如果次级智能体读取继承的主智能体 OAuth 配置文件，刷新写回主智能体存储，而不是将刷新令牌复制到次级智能体存储
- 例外：某些外部 CLI 凭证保持外部管理；OpenClaw 重新读取那些 CLI 认证存储，而不是消耗复制的刷新令牌。Codex CLI 引导有意更窄：它播种一个空的 `openai-codex:default` 配置文件，然后 OpenClaw 拥有的刷新保持本地配置文件规范。

刷新流程是自动的；你通常不需要手动管理令牌。

## 多账户（配置文件）+ 路由

两种模式：

### 1）首选：单独的智能体

如果你想要"个人"和"工作"永不交互，使用隔离的智能体（单独的会话 + 凭证 + 工作区）：

```bash
openclaw agents add work
openclaw agents add personal
```

然后按智能体配置认证（向导）并将聊天路由到正确的智能体。

### 2）高级：一个智能体中的多个配置文件

`auth-profiles.json` 支持同一提供商的多个配置文件 ID。

选择使用哪个配置文件：

- 通过配置排序全局（`auth.order`）
- 通过 `/model ...@<profileId>` 按会话

示例（会话覆盖）：

- `/model Opus@anthropic:work`

如何查看存在哪些配置文件 ID：

- `openclaw channels list --json`（显示 `auth[]`）

相关文档：

- [模型故障转移](/concepts/model-failover)（轮换 + 冷却规则）
- [斜杠命令](/tools/slash-commands)（命令界面）

## 相关

- [认证](/gateway/authentication) — 模型提供商认证概述
- [密钥](/gateway/secrets) — 凭证存储和 SecretRef
- [配置参考](/gateway/configuration-reference#auth-storage) — 认证配置键
