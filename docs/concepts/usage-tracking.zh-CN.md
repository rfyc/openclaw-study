---
summary: "使用量追踪面和凭据要求"
read_when:
  - 你正在连接提供商使用量/配额面
  - 你需要解释使用量追踪行为或身份验证要求
title: "使用量追踪"
---

## 它是什么

- 直接从提供商的使用量端点拉取提供商使用量/配额。
- 没有估算成本；只有提供商报告的窗口。
- 人类可读的状态输出被规范化为 `X% left`，即使上游 API 报告的是已消耗配额、剩余配额或仅原始计数。
- 会话级 `/status` 和 `session_status` 可以在实时会话快照稀疏时回退到最新的记录使用条目。该回退填充缺失的令牌/缓存计数器，可以恢复活跃的运行时模型标签，并在会话元数据缺失或更小时优先选择较大的提示导向总计。现有的非零实时值仍然优先。

## 它显示在哪里

- 聊天中的 `/status`：带有会话令牌 + 估算成本的富表情状态卡（仅 API 密钥）。当可用时，提供商使用量以规范化的 `X% left` 窗口显示**当前模型提供商**。
- 聊天中的 `/usage off|tokens|full`：每次响应的使用量页脚（OAuth 仅显示令牌）。
- 聊天中的 `/usage cost`：从 OpenClaw 会话日志聚合的本地成本摘要。
- CLI：`openclaw status --usage` 打印完整的每提供商分解。
- CLI：`openclaw channels list` 在提供商配置旁边打印相同的使用量快照（使用 `--no-usage` 跳过）。
- macOS 菜单栏：上下文下的"使用量"部分（仅在可用时）。

## 提供商 + 凭据

- **Anthropic（Claude）**：身份验证配置文件中的 OAuth 令牌。
- **GitHub Copilot**：身份验证配置文件中的 OAuth 令牌。
- **Gemini CLI**：身份验证配置文件中的 OAuth 令牌。
  - JSON 使用量回退到 `stats`；`stats.cached` 被规范化为 `cacheRead`。
- **OpenAI Codex**：身份验证配置文件中的 OAuth 令牌（存在时使用 accountId）。
- **MiniMax**：API 密钥或 MiniMax OAuth 身份验证配置文件。OpenClaw 将 `minimax`、`minimax-cn` 和 `minimax-portal` 视为相同的 MiniMax 配额面，存在时优先使用存储的 MiniMax OAuth，否则回退到 `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`。使用量轮询在配置时从 `models.providers.minimax-portal.baseUrl` 或 `models.providers.minimax.baseUrl` 派生编码计划主机，否则使用 MiniMax CN 主机。MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示**剩余**配额，因此 OpenClaw 在显示之前将其反转；存在时基于计数的字段优先。
  - 编码计划窗口标签在存在时来自提供商小时/分钟字段，然后回退到 `start_time` / `end_time` 跨度。
  - 如果编码计划端点返回 `model_remains`，OpenClaw 优先使用聊天模型条目，在缺少显式 `window_hours` / `window_minutes` 字段时从时间戳派生窗口标签，并在计划标签中包含模型名称。
- **Xiaomi MiMo**：通过 env/配置/身份验证存储的 API 密钥（`XIAOMI_API_KEY`）。
- **z.ai**：通过 env/配置/身份验证存储的 API 密钥。

当没有可用的提供商使用量身份验证时，使用量被隐藏。提供商可以提供插件特定的使用量身份验证逻辑；否则 OpenClaw 回退到从身份验证配置文件、环境变量或配置匹配 OAuth/API 密钥凭据。

## 相关

- [令牌使用和成本](/reference/token-use)
- [API 使用和成本](/reference/api-usage-costs)
- [提示缓存](/reference/prompt-caching)
