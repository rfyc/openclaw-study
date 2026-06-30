---
summary: "FAQ：模型默认值、选择、别名、切换、故障转移和验证配置文件"
read_when:
  - 选择或切换模型、配置别名
  - 调试模型故障转移/"所有模型失败"
  - 了解验证配置文件及其管理方式
title: "FAQ：模型和身份验证"
sidebarTitle: "模型 FAQ"
---

模型和验证配置文件问答。有关设置、会话、Gateway、频道和故障排除，请参阅主要 [FAQ](/help/faq)。

## 模型：默认值、选择、别名、切换

<AccordionGroup>
  <Accordion title='"默认模型"是什么？'>
    OpenClaw 的默认模型是你设置为以下内容的任何模型：

    ```
    agents.defaults.model.primary
    ```

    模型以 `provider/model` 的形式引用（例如：`openai/gpt-5.5` 或 `openai-codex/gpt-5.5`）。如果省略提供商，OpenClaw 首先尝试别名，然后对该精确模型 ID 的唯一配置提供商进行匹配，最后仅作为已弃用的兼容性路径退回到配置的默认提供商。如果该提供商不再公开配置的默认模型，OpenClaw 会退回到第一个配置的提供商/模型，而不是显示陈旧的已删除提供商默认值。你仍然应该**明确**设置 `provider/model`。

  </Accordion>

  <Accordion title="你推荐什么模型？">
    **推荐的默认值：** 使用你的提供商栈中最强大的最新一代模型。
    **对于启用工具或不受信任输入的代理：** 优先考虑模型强度而非成本。
    **对于常规/低风险聊天：** 使用更便宜的备用模型，并按代理角色路由。

    MiniMax 有自己的文档：[MiniMax](/providers/minimax) 和[本地模型](/gateway/local-models)。

    经验法则：对于高风险工作，使用你**能负担得起的最佳模型**；对于常规聊天或摘要，使用更便宜的模型。你可以按代理路由模型，并使用子代理并行化长任务（每个子代理消耗令牌）。请参阅[模型](/concepts/models)和[子代理](/tools/subagents)。

    强烈警告：较弱/过度量化的模型更容易受到提示注入和不安全行为的影响。请参阅[安全](/gateway/security)。

    更多上下文：[模型](/concepts/models)。

  </Accordion>

  <Accordion title="如何切换模型而不清除我的配置？">
    使用**模型命令**或仅编辑**模型**字段。避免完整配置替换。

    安全选项：

    - 聊天中的 `/model`（快速，每会话）
    - `openclaw models set ...`（仅更新模型配置）
    - `openclaw configure --section model`（交互式）
    - 在 `~/.openclaw/openclaw.json` 中编辑 `agents.defaults.model`

    避免使用部分对象的 `config.apply`，除非你打算替换整个配置。
    对于 RPC 编辑，首先使用 `config.schema.lookup` 检查，并优先使用 `config.patch` 进行部分更新。查找负载提供规范化路径、浅层架构文档/约束和即时子摘要。
    如果你确实覆盖了配置，请从备份中恢复或重新运行 `openclaw doctor` 进行修复。

    文档：[模型](/concepts/models)、[配置](/cli/configure)、[Config](/cli/config)、[Doctor](/gateway/doctor)。

  </Accordion>

  <Accordion title="可以使用自托管模型（llama.cpp、vLLM、Ollama）吗？">
    可以。Ollama 是本地模型的最简单路径。

    最快设置：

    1. 从 `https://ollama.com/download` 安装 Ollama
    2. 拉取本地模型，如 `ollama pull gemma4`
    3. 如果你也想要云模型，运行 `ollama signin`
    4. 运行 `openclaw onboard` 并选择 `Ollama`
    5. 选择 `Local` 或 `Cloud + Local`

    注意：

    - `Cloud + Local` 为你提供云模型加上本地 Ollama 模型
    - 云模型如 `kimi-k2.5:cloud` 不需要本地拉取
    - 对于手动切换，使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全说明：较小或重度量化的模型更容易受到提示注入的影响。我们强烈建议任何可以使用工具的机器人使用**大型模型**。如果你仍然想要小型模型，请启用沙箱和严格的工具白名单。

    文档：[Ollama](/providers/ollama)、[本地模型](/gateway/local-models)、[模型提供商](/concepts/model-providers)、[安全](/gateway/security)、[沙箱](/gateway/sandboxing)。

  </Accordion>

  <Accordion title="OpenClaw、Flawd 和 Krill 使用什么模型？">
    - 这些部署可能不同，并且可能随时间变化；没有固定的提供商建议。
    - 使用 `openclaw models status` 检查每个 Gateway 上的当前运行时设置。
    - 对于安全敏感/启用工具的代理，使用可用的最强大的最新一代模型。

  </Accordion>

  <Accordion title="如何动态切换模型（不重启）？">
    将 `/model` 命令作为独立消息使用：

    ```
    /model sonnet
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    /model gemini-flash-lite
    ```

    这些是内置别名。可以通过 `agents.defaults.models` 添加自定义别名。

    你可以用 `/model`、`/model list` 或 `/model status` 列出可用模型。

    `/model`（和 `/model list`）显示紧凑的编号选择器。按数字选择：

    ```
    /model 3
    ```

    你也可以为提供商强制使用特定的验证配置文件（每会话）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 显示哪个代理处于活动状态、正在使用哪个 `auth-profiles.json` 文件，以及接下来会尝试哪个验证配置文件。
    在可用时，它还显示配置的提供商端点（`baseUrl`）和 API 模式（`api`）。

    **如何取消用 @profile 设置的配置文件？**

    重新运行 `/model` **不带** `@profile` 后缀：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果你想返回默认值，从 `/model` 中选择它（或发送 `/model <default provider/model>`）。
    使用 `/model status` 确认哪个验证配置文件处于活动状态。

  </Accordion>

  <Accordion title="我可以使用 GPT 5.5 处理日常任务，使用 Codex 5.5 进行编码吗？">
    可以。将模型选择和运行时选择分开对待：

    - **原生 Codex 编码代理：** 将 `agents.defaults.model.primary` 设置为 `openai/gpt-5.5`，将 `agents.defaults.agentRuntime.id` 设置为 `"codex"`。当你想要 ChatGPT/Codex 订阅验证时，使用 `openclaw models auth login --provider openai-codex` 登录。
    - **通过 PI 的直接 OpenAI API 任务：** 使用 `/model openai/gpt-5.5` 不带 Codex 运行时覆盖，并配置 `OPENAI_API_KEY`。
    - **通过 PI 的 Codex OAuth：** 仅当你有意希望使用带 Codex OAuth 的普通 PI 运行器时，才使用 `/model openai-codex/gpt-5.5`。
    - **子代理：** 将编码任务路由到具有自己模型和 `agentRuntime` 默认值的 Codex 专用代理。

    请参阅[模型](/concepts/models)和[斜杠命令](/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何为 GPT 5.5 配置快速模式？">
    使用会话切换或配置默认值：

    - **每会话：** 在使用 `openai/gpt-5.5` 或 `openai-codex/gpt-5.5` 的会话中发送 `/fast on`。
    - **每模型默认值：** 将 `agents.defaults.models["openai/gpt-5.5"].params.fastMode` 或 `agents.defaults.models["openai-codex/gpt-5.5"].params.fastMode` 设置为 `true`。

    示例：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: {
                fastMode: true,
              },
            },
          },
        },
      },
    }
    ```

    对于 OpenAI，快速模式在受支持的原生 Responses 请求上映射为 `service_tier = "priority"`。会话 `/fast` 覆盖优先于配置默认值。

    请参阅[思考和快速模式](/tools/thinking)和 [OpenAI 快速模式](/providers/openai#fast-mode)。

  </Accordion>

  <Accordion title='为什么我看到"Model ... is not allowed"然后没有回复？'>
    如果设置了 `agents.defaults.models`，它会成为 `/model` 和任何会话覆盖的**白名单**。选择不在该列表中的模型会返回：

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    该错误**代替**正常回复返回。修复：将模型添加到 `agents.defaults.models`，删除白名单，或从 `/model list` 中选择模型。

  </Accordion>

  <Accordion title='为什么我看到"Unknown model: minimax/MiniMax-M2.7"？'>
    这意味着**提供商未配置**（未找到 MiniMax 提供商配置或验证配置文件），因此无法解析模型。

    修复清单：

    1. 升级到当前的 OpenClaw 版本（或从源代码 `main` 运行），然后重启 Gateway。
    2. 确保 MiniMax 已配置（向导或 JSON），或者 env/验证配置文件中存在 MiniMax 验证，以便可以注入匹配的提供商（`MINIMAX_API_KEY` 用于 `minimax`，`MINIMAX_OAUTH_TOKEN` 或存储的 MiniMax OAuth 用于 `minimax-portal`）。
    3. 使用精确的模型 ID（区分大小写）对应你的验证路径：
       API 密钥设置使用 `minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`，OAuth 设置使用 `minimax-portal/MiniMax-M2.7` / `minimax-portal/MiniMax-M2.7-highspeed`。
    4. 运行：

       ```bash
       openclaw models list
       ```

       并从列表中选择（或在聊天中使用 `/model list`）。

    请参阅 [MiniMax](/providers/minimax) 和[模型](/concepts/models)。

  </Accordion>

  <Accordion title="我可以使用 MiniMax 作为默认值，OpenAI 用于复杂任务吗？">
    可以。使用 **MiniMax 作为默认值**，并在需要时**每会话**切换模型。
    备用用于**错误**，而不是"复杂任务"，所以使用 `/model` 或单独的代理。

    **选项 A：每会话切换**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "minimax" },
            "openai/gpt-5.5": { alias: "gpt" },
          },
        },
      },
    }
    ```

    然后：

    ```
    /model gpt
    ```

    **选项 B：独立代理**

    - 代理 A 默认：MiniMax
    - 代理 B 默认：OpenAI
    - 按代理路由或使用 `/agent` 切换

    文档：[模型](/concepts/models)、[多代理路由](/concepts/multi-agent)、[MiniMax](/providers/minimax)、[OpenAI](/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是内置快捷方式吗？">
    是的。OpenClaw 附带了一些默认简写（仅在 `agents.defaults.models` 中存在模型时应用）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → API 密钥设置为 `openai/gpt-5.5`，或配置为 Codex OAuth 时为 `openai-codex/gpt-5.5`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果你设置了与同名的自定义别名，你的值优先。

  </Accordion>

  <Accordion title="如何定义/覆盖模型快捷方式（别名）？">
    别名来自 `agents.defaults.models.<modelId>.alias`。示例：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": { alias: "opus" },
            "anthropic/claude-sonnet-4-6": { alias: "sonnet" },
            "anthropic/claude-haiku-4-5": { alias: "haiku" },
          },
        },
      },
    }
    ```

    然后 `/model sonnet`（或支持时的 `/<alias>`）解析为该模型 ID。

  </Accordion>

  <Accordion title="如何从 OpenRouter 或 Z.AI 等其他提供商添加模型？">
    OpenRouter（按令牌付费；许多模型）：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
          models: { "openrouter/anthropic/claude-sonnet-4-6": {} },
        },
      },
      env: { OPENROUTER_API_KEY: "sk-or-..." },
    }
    ```

    Z.AI（GLM 模型）：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-5" },
          models: { "zai/glm-5": {} },
        },
      },
      env: { ZAI_API_KEY: "..." },
    }
    ```

    如果你引用了提供商/模型但缺少所需的提供商密钥，你会得到运行时验证错误（例如 `No API key found for provider "zai"`）。

    **添加新代理后找不到提供商的 API 密钥**

    这通常意味着**新代理**有一个空的验证存储。验证是每个代理的，存储在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修复选项：

    - 运行 `openclaw agents add <id>` 并在向导过程中配置验证。
    - 或者仅将可移植的静态 `api_key` / `token` 配置文件从主代理的验证存储复制到新代理的验证存储中。
    - 对于 OAuth 配置文件，当新代理需要自己的账户时，从该代理登录；否则 OpenClaw 可以读取默认/主代理，而无需克隆刷新令牌。

    不要跨代理重用 `agentDir`；这会导致验证/会话冲突。

  </Accordion>
</AccordionGroup>

## 模型故障转移和"所有模型失败"

<AccordionGroup>
  <Accordion title="故障转移是如何工作的？">
    故障转移分两个阶段进行：

    1. 同一提供商内的**验证配置文件轮换**。
    2. **模型回退**到 `agents.defaults.model.fallbacks` 中的下一个模型。

    冷却时间适用于失败的配置文件（指数退避），因此即使提供商受到速率限制或暂时失败，OpenClaw 也可以继续响应。

    速率限制桶不仅包括普通的 `429` 响应。OpenClaw 还将 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`resource exhausted` 和定期使用窗口限制（`weekly/monthly limit reached`）等消息视为值得故障转移的速率限制。

    某些看起来像计费的响应不是 `402`，某些 HTTP `402` 响应也保留在该瞬态桶中。如果提供商在 `401` 或 `403` 上返回明确的计费文本，OpenClaw 仍可以将其保留在计费通道中，但特定于提供商的文本匹配器仍然限定在拥有它们的提供商（例如 OpenRouter `Key limit exceeded`）。如果 `402` 消息看起来像可重试的使用窗口或组织/工作区消费限制（`daily limit reached, resets tomorrow`、`organization spending limit exceeded`），OpenClaw 将其视为 `rate_limit`，而不是长时间的计费禁用。

    上下文溢出错误有所不同：`request_too_large`、`input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`input is too long for the model` 或 `ollama error: context length exceeded` 等签名仍然在压缩/重试路径上，而不是推进模型回退。

    通用服务器错误文本故意比"任何包含 unknown/error 的内容"更窄。OpenClaw 确实将特定于提供商的瞬态形状视为值得故障转移的超时/过载信号，当提供商上下文匹配时，包括 Anthropic 裸 `An unknown error occurred`、OpenRouter 裸 `Provider returned error`、停止原因错误如 `Unhandled stop reason: error`、带有瞬态服务器文本的 JSON `api_error` 负载（`internal server error`、`unknown error, 520`、`upstream error`、`backend error`）以及提供商繁忙错误如 `ModelNotReadyException`。
    通用内部回退文本如 `LLM request failed with an unknown error.` 保持保守，不会单独触发模型回退。

  </Accordion>

  <Accordion title='"No credentials found for profile anthropic:default" 是什么意思？'>
    这意味着系统尝试使用验证配置文件 ID `anthropic:default`，但在预期的验证存储中找不到其凭证。

    **修复清单：**

    - **确认验证配置文件的存储位置**（新路径与旧路径）
      - 当前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 旧版：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）
    - **确认你的环境变量已被 Gateway 加载**
      - 如果你在 shell 中设置了 `ANTHROPIC_API_KEY` 但通过 systemd/launchd 运行 Gateway，它可能不会继承它。将其放在 `~/.openclaw/.env` 中或启用 `env.shellEnv`。
    - **确保你正在编辑正确的代理**
      - 多代理设置意味着可能有多个 `auth-profiles.json` 文件。
    - **检查模型/验证状态**
      - 使用 `openclaw models status` 查看已配置的模型以及提供商是否已通过验证。

    **"No credentials found for profile anthropic"的修复清单**

    这意味着运行被固定到 Anthropic 验证配置文件，但 Gateway 在其验证存储中找不到它。

    - **使用 Claude CLI**
      - 在 Gateway 主机上运行 `openclaw models auth login --provider anthropic --method cli --set-default`。
    - **如果你想改用 API 密钥**
      - 将 `ANTHROPIC_API_KEY` 放在 **Gateway 主机**的 `~/.openclaw/.env` 中。
      - 清除任何强制缺失配置文件的固定顺序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **确认你在 Gateway 主机上运行命令**
      - 在远程模式下，验证配置文件位于 Gateway 机器上，而不是你的笔记本上。

  </Accordion>

  <Accordion title="为什么它也尝试了 Google Gemini 并失败了？">
    如果你的模型配置包含 Google Gemini 作为备用（或你切换到了 Gemini 简写），OpenClaw 会在模型回退期间尝试它。如果你没有配置 Google 凭证，你会看到 `No API key found for provider "google"`。

    修复：要么提供 Google 验证，要么在 `agents.defaults.model.fallbacks` / 别名中删除/避免 Google 模型，使备用不路由到那里。

    **LLM 请求被拒绝：需要思考签名（Google Antigravity）**

    原因：会话历史包含**没有签名的思考块**（通常来自中止/部分流）。Google Antigravity 要求思考块的签名。

    修复：OpenClaw 现在为 Google Antigravity Claude 去除未签名的思考块。如果仍然出现，开始一个**新会话**或为该代理设置 `/thinking off`。

  </Accordion>
</AccordionGroup>

## 验证配置文件：它们是什么以及如何管理

相关：[/concepts/oauth](/concepts/oauth)（OAuth 流程、令牌存储、多账户模式）

<AccordionGroup>
  <Accordion title="什么是验证配置文件？">
    验证配置文件是绑定到提供商的命名凭证记录（OAuth 或 API 密钥）。配置文件存储在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="典型的配置文件 ID 是什么？">
    OpenClaw 使用提供商前缀的 ID，如：

    - `anthropic:default`（没有电子邮件身份时的常见情况）
    - `anthropic:<email>` 用于 OAuth 身份
    - 你选择的自定义 ID（例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我可以控制首先尝试哪个验证配置文件吗？">
    可以。配置支持配置文件的可选元数据以及每个提供商的排序（`auth.order.<provider>`）。这**不会**存储密钥；它将 ID 映射到提供商/模式并设置轮换顺序。

    如果配置文件处于短暂的**冷却**状态（速率限制/超时/验证失败）或更长的**禁用**状态（计费/积分不足），OpenClaw 可能暂时跳过该配置文件。要检查此项，运行 `openclaw models status --json` 并检查 `auth.unusableProfiles`。调优：`auth.cooldowns.billingBackoffHours*`。

    速率限制冷却可以限定于模型范围。针对一个模型冷却的配置文件仍然可用于同一提供商上的兄弟模型，而计费/禁用窗口仍然会阻止整个配置文件。

    你还可以通过 CLI 设置**每代理**顺序覆盖（存储在该代理的 `auth-state.json` 中）：

    ```bash
    # 默认为配置的默认代理（省略 --agent）
    openclaw models auth order get --provider anthropic

    # 将轮换锁定到单个配置文件（只尝试这一个）
    openclaw models auth order set --provider anthropic anthropic:default

    # 或设置明确的顺序（提供商内的回退）
    openclaw models auth order set --provider anthropic anthropic:work anthropic:default

    # 清除覆盖（退回到配置的 auth.order / 轮询）
    openclaw models auth order clear --provider anthropic
    ```

    要针对特定代理：

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

    要验证实际将尝试什么，使用：

    ```bash
    openclaw models status --probe
    ```

    如果存储的配置文件从显式顺序中被省略，探针会报告该配置文件的 `excluded_by_auth_order`，而不是静默尝试它。

  </Accordion>

  <Accordion title="OAuth 与 API 密钥——有什么区别？">
    OpenClaw 两者都支持：

    - **OAuth** 通常利用订阅访问（如果适用）。
    - **API 密钥**使用按令牌计费。

    向导明确支持 Anthropic Claude CLI、OpenAI Codex OAuth 和 API 密钥。

  </Accordion>
</AccordionGroup>

## 相关链接

- [FAQ](/help/faq) — 主要 FAQ
- [FAQ — 快速入门和首次运行设置](/help/faq-first-run)
- [模型选择](/concepts/model-providers)
- [模型故障转移](/concepts/model-failover)
