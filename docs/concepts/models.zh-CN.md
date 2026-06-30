---
summary: "模型 CLI：列表、设置、别名、回退、扫描、状态"
read_when:
  - 添加或修改模型 CLI（models list/set/scan/aliases/fallbacks）
  - 更改模型回退行为或选择 UX
  - 更新模型扫描探测（工具/图像）
title: "模型 CLI"
sidebarTitle: "模型 CLI"
---

<CardGroup cols={2}>
  <Card title="模型故障转移" href="/concepts/model-failover">
    认证配置文件轮换、冷却以及如何与回退交互。
  </Card>
  <Card title="模型提供商" href="/concepts/model-providers">
    快速提供商概述和示例。
  </Card>
  <Card title="智能体运行时" href="/concepts/agent-runtimes">
    PI、Codex 和其他智能体循环运行时。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults">
    模型配置键。
  </Card>
</CardGroup>

模型引用选择提供商和模型。它们通常不选择低级智能体运行时。例如，`openai/gpt-5.5` 可以通过正常的 OpenAI 提供商路径运行，也可以通过 Codex 应用服务器运行时运行，具体取决于 `agents.defaults.agentRuntime.id`。在 Codex 运行时模式下，`openai/gpt-*` 引用不意味着 API 密钥计费；认证可以来自 Codex 账户或 `openai-codex` 认证配置文件。参见[智能体运行时](/concepts/agent-runtimes)。

## 模型选择工作原理

OpenClaw 按此顺序选择模型：

<Steps>
  <Step title="主模型">
    `agents.defaults.model.primary`（或 `agents.defaults.model`）。
  </Step>
  <Step title="回退">
    `agents.defaults.model.fallbacks`（按顺序）。
  </Step>
  <Step title="提供商认证故障转移">
    认证故障转移发生在提供商内部，然后再移到下一个模型。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="相关模型界面">
    - `agents.defaults.models` 是 OpenClaw 可以使用的模型允许列表/目录（加上别名）。
    - `agents.defaults.imageModel` 仅在主模型无法接受图像时使用。
    - `agents.defaults.pdfModel` 由 `pdf` 工具使用。如果省略，工具回退到 `agents.defaults.imageModel`，然后是解析的会话/默认模型。
    - `agents.defaults.imageGenerationModel` 由共享的图像生成能力使用。如果省略，`image_generate` 仍然可以推断认证支持的提供商默认值。它首先尝试当前默认提供商，然后按提供商 ID 顺序尝试其余注册的图像生成提供商。如果你设置了特定的提供商/模型，还要配置该提供商的认证/API 密钥。
    - `agents.defaults.musicGenerationModel` 由共享的音乐生成能力使用。如果省略，`music_generate` 仍然可以推断认证支持的提供商默认值。它首先尝试当前默认提供商，然后按提供商 ID 顺序尝试其余注册的音乐生成提供商。如果你设置了特定的提供商/模型，还要配置该提供商的认证/API 密钥。
    - `agents.defaults.videoGenerationModel` 由共享的视频生成能力使用。如果省略，`video_generate` 仍然可以推断认证支持的提供商默认值。它首先尝试当前默认提供商，然后按提供商 ID 顺序尝试其余注册的视频生成提供商。如果你设置了特定的提供商/模型，还要配置该提供商的认证/API 密钥。
    - 每智能体默认值可以通过 `agents.list[].model` 加上绑定覆盖 `agents.defaults.model`（参见[多智能体路由](/concepts/multi-agent)）。
  </Accordion>
</AccordionGroup>

## 选择来源和回退行为

相同的 `provider/model` 根据来源可能意味着不同的事情：

- 已配置的默认值（`agents.defaults.model.primary` 和特定智能体主模型）是正常的起始点，使用 `agents.defaults.model.fallbacks`。
- 自动回退选择是临时的恢复状态。它们以 `modelOverrideSource: "auto"` 存储，以便后续轮次可以继续使用回退链，而不必首先探测已知有问题的主模型。
- 用户会话选择是精确的。`/model`、模型选择器、`session_status(model=...)`，和 `sessions.patch` 存储 `modelOverrideSource: "user"`；如果该选择的提供商/模型无法访问，OpenClaw 可见地失败，而不是切换到另一个已配置的模型。
- Cron `--model` / 有效载荷 `model` 是每任务主模型。它仍然使用已配置的回退，除非任务提供显式有效载荷 `fallbacks`（使用 `fallbacks: []` 进行严格的 cron 运行）。
- CLI 默认模型和允许列表选择器通过列出显式 `models.providers.*.models` 而不是加载完整内置目录，来遵守 `models.mode: "replace"`。
- Control UI 模型选择器向网关请求其配置的模型视图：存在时为 `agents.defaults.models`，否则为显式 `models.providers.*.models` 加上具有可用认证的提供商。完整内置目录保留用于显式浏览视图，如带 `view: "all"` 的 `models.list` 或 `openclaw models list --all`。

## 快速模型策略

- 将你的主模型设置为你可用的最强最新一代模型。
- 将回退用于成本/延迟敏感的任务和较低风险的聊天。
- 对于工具启用的智能体或不可信输入，避免使用较旧/较弱的模型层。

## 引导（推荐）

如果你不想手动编辑配置，运行引导：

```bash
openclaw onboard
```

它可以为常见提供商设置模型 + 认证，包括 **OpenAI Code（Codex）订阅**（OAuth）和 **Anthropic**（API 密钥或 Claude CLI）。

## 配置键（概述）

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` 和 `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` 和 `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` 和 `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models`（允许列表 + 别名 + 提供商参数）
- `models.providers`（写入 `models.json` 的自定义提供商）

<Note>
模型引用规范化为小写。`z.ai/*` 等提供商别名规范化为 `zai/*`。

提供商配置示例（包括 OpenCode）存在于 [OpenCode](/providers/opencode) 中。
</Note>

### 安全允许列表编辑

手动更新 `agents.defaults.models` 时使用附加写入：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
```

<AccordionGroup>
  <Accordion title="覆盖保护规则">
    `openclaw config set` 保护模型/提供商映射免受意外覆盖。当对 `agents.defaults.models`、`models.providers` 或 `models.providers.<id>.models` 的简单对象赋值会删除现有条目时，该赋值被拒绝。对附加更改使用 `--merge`；仅在提供的值应成为完整目标值时使用 `--replace`。

    交互式提供商设置和 `openclaw configure --section model` 也将提供商范围的选择合并到现有允许列表中，因此添加 Codex、Ollama 或另一个提供商不会删除不相关的模型条目。当重新应用提供商认证时，Configure 保留现有的 `agents.defaults.model.primary`。显式默认设置命令，如 `openclaw models auth login --provider <id> --set-default` 和 `openclaw models set <model>` 仍然替换 `agents.defaults.model.primary`。

  </Accordion>
</AccordionGroup>

## "模型不被允许"（以及为什么回复停止）

如果设置了 `agents.defaults.models`，它成为 `/model` 和会话覆盖的**允许列表**。当用户选择不在该允许列表中的模型时，OpenClaw 返回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

<Warning>
这发生在生成正常回复**之前**，所以消息可能感觉"没有响应"。解决方案是：

- 将模型添加到 `agents.defaults.models`，或
- 清除允许列表（删除 `agents.defaults.models`），或
- 从 `/model list` 中选择模型。
  </Warning>

对于本地/GGUF 模型，在允许列表中存储完整的提供商前缀引用，例如 `ollama/gemma4:26b`、`lmstudio/Gemma4-26b-a4-it-gguf`，或 `openclaw models list --provider <provider>` 显示的精确提供商/模型。当允许列表活跃时，裸本地文件名或显示名称是不够的。

示例允许列表配置：

```json5
{
  agent: {
    model: { primary: "anthropic/claude-sonnet-4-6" },
    models: {
      "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
      "anthropic/claude-opus-4-6": { alias: "Opus" },
    },
  },
}
```

## 在聊天中切换模型（`/model`）

你可以在不重启的情况下切换当前会话的模型：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

<AccordionGroup>
  <Accordion title="选择器行为">
    - `/model`（和 `/model list`）是一个紧凑的编号选择器（模型系列 + 可用提供商）。
    - 在 Discord 上，`/model` 和 `/models` 打开带有提供商和模型下拉菜单加提交步骤的交互式选择器。
    - 在 Telegram 上，`/models` 选择器选择是会话范围的；它们不更改智能体在 `openclaw.json` 中的持久默认值。
    - `/models add` 已弃用，现在返回弃用消息，而不是从聊天注册模型。
    - `/model <#>` 从该选择器中选择。
  </Accordion>
  <Accordion title="持久化和实时切换">
    - `/model` 立即持久化新的会话选择。
    - 如果智能体处于空闲状态，下一次运行立即使用新模型。
    - 如果运行已经活跃，OpenClaw 将实时切换标记为待处理，并仅在干净的重试点重启到新模型。
    - 如果工具活动或回复输出已经开始，待处理的切换可以保持队列，直到后续的重试机会或下一个用户轮次。
    - 用户选择的 `/model` 引用对该会话是严格的：如果选择的提供商/模型无法访问，回复可见地失败，而不是静默地从 `agents.defaults.model.fallbacks` 回答。这与已配置的默认值和 cron 任务主模型不同，后者仍然可以使用回退链。
    - `/model status` 是详细视图（认证候选和已配置时的提供商端点 `baseUrl` + `api` 模式）。
  </Accordion>
  <Accordion title="引用解析">
    - 模型引用通过在**第一个** `/` 上分割来解析。在输入 `/model <ref>` 时使用 `provider/model`。
    - 如果模型 ID 本身包含 `/`（OpenRouter 风格），你必须包含提供商前缀（例如：`/model openrouter/moonshotai/kimi-k2`）。
    - 如果你省略提供商，OpenClaw 按以下顺序解析输入：
      1. 别名匹配
      2. 该精确无前缀模型 id 的唯一已配置提供商匹配
      3. 已弃用的已配置默认提供商回退 — 如果该提供商不再公开已配置的默认模型，OpenClaw 改为回退到第一个已配置的提供商/模型，以避免暴露陈旧的已删除提供商默认值。
  </Accordion>
</AccordionGroup>

完整命令行为/配置：[斜杠命令](/tools/slash-commands)。

## CLI 命令

```bash
openclaw models list
openclaw models status
openclaw models set <provider/model>
openclaw models set-image <provider/model>

openclaw models aliases list
openclaw models aliases add <alias> <provider/model>
openclaw models aliases remove <alias>

openclaw models fallbacks list
openclaw models fallbacks add <provider/model>
openclaw models fallbacks remove <provider/model>
openclaw models fallbacks clear

openclaw models image-fallbacks list
openclaw models image-fallbacks add <provider/model>
openclaw models image-fallbacks remove <provider/model>
openclaw models image-fallbacks clear
```

`openclaw models`（无子命令）是 `models status` 的快捷方式。

### `models list`

默认显示已配置/认证可用的模型。有用的标志：

<ParamField path="--all" type="boolean">
  完整目录。在配置认证之前包括捆绑的提供商拥有的静态目录行，以便仅发现视图可以显示在添加匹配提供商凭证之前不可用的模型。
</ParamField>
<ParamField path="--local" type="boolean">
  仅本地提供商。
</ParamField>
<ParamField path="--provider <id>" type="string">
  按提供商 ID 过滤，例如 `moonshot`。不接受交互式选择器的显示标签。
</ParamField>
<ParamField path="--plain" type="boolean">
  每行一个模型。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读输出。
</ParamField>

### `models status`

显示解析的主模型、回退、图像模型以及已配置提供商的认证概述。它还显示在认证存储中找到的配置文件的 OAuth 到期状态（默认在 24 小时内警告）。`--plain` 仅打印解析的主模型。

<AccordionGroup>
  <Accordion title="认证和探测行为">
    - OAuth 状态始终显示（并包含在 `--json` 输出中）。如果已配置的提供商没有凭证，`models status` 打印**缺少认证**部分。
    - JSON 包含 `auth.oauth`（警告窗口 + 配置文件）和 `auth.providers`（每个提供商的有效认证，包括环境支持的凭证）。`auth.oauth` 仅是认证存储配置文件健康状况；仅环境变量的提供商不显示在那里。
    - 对自动化使用 `--check`（缺少/过期时退出 `1`，即将过期时退出 `2`）。
    - 对实时认证检查使用 `--probe`；探测行可以来自认证配置文件、环境变量凭证或 `models.json`。
    - 如果显式的 `auth.order.<provider>` 省略了存储的配置文件，探测报告 `excluded_by_auth_order` 而不是尝试它。如果认证存在但无法为该提供商解析可探测的模型，探测报告 `status: no_model`。
  </Accordion>
</AccordionGroup>

<Note>
认证选择取决于提供商/账户。对于始终开启的网关主机，API 密钥通常是最可预测的；Claude CLI 重用和现有的 Anthropic OAuth/令牌配置文件也受支持。
</Note>

示例（Claude CLI）：

```bash
claude auth login
openclaw models status
```

## 扫描（OpenRouter 免费模型）

`openclaw models scan` 检查 OpenRouter 的**免费模型目录**，并可选地探测模型的工具和图像支持。

<ParamField path="--no-probe" type="boolean">
  跳过实时探测（仅元数据）。
</ParamField>
<ParamField path="--min-params <b>" type="number">
  最小参数大小（十亿）。
</ParamField>
<ParamField path="--max-age-days <days>" type="number">
  跳过旧模型。
</ParamField>
<ParamField path="--provider <name>" type="string">
  提供商前缀过滤器。
</ParamField>
<ParamField path="--max-candidates <n>" type="number">
  回退列表大小。
</ParamField>
<ParamField path="--set-default" type="boolean">
  将 `agents.defaults.model.primary` 设置为第一个选择。
</ParamField>
<ParamField path="--set-image" type="boolean">
  将 `agents.defaults.imageModel.primary` 设置为第一个图像选择。
</ParamField>

<Note>
OpenRouter `/models` 目录是公开的，因此仅元数据扫描可以在没有密钥的情况下列出免费候选。探测和推理仍然需要 OpenRouter API 密钥（来自认证配置文件或 `OPENROUTER_API_KEY`）。如果没有可用密钥，`openclaw models scan` 回退到仅元数据输出并保持配置不变。使用 `--no-probe` 显式请求仅元数据模式。
</Note>

扫描结果按以下排名：

1. 图像支持
2. 工具延迟
3. 上下文大小
4. 参数数量

输入：

- OpenRouter `/models` 列表（过滤 `:free`）
- 实时探测需要来自认证配置文件或 `OPENROUTER_API_KEY` 的 OpenRouter API 密钥（参见[环境变量](/help/environment)）
- 可选过滤器：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 请求/探测控件：`--timeout`、`--concurrency`

当实时探测在 TTY 中运行时，你可以交互式地选择回退。在非交互模式下，传递 `--yes` 以接受默认值。仅元数据结果是信息性的；`--set-default` 和 `--set-image` 需要实时探测，以便 OpenClaw 不配置无法使用的无密钥 OpenRouter 模型。

## 模型注册表（`models.json`）

`models.providers` 中的自定义提供商写入智能体目录下的 `models.json`（默认 `~/.openclaw/agents/<agentId>/agent/models.json`）。除非 `models.mode` 设置为 `replace`，否则该文件默认合并。

<AccordionGroup>
  <Accordion title="合并模式优先级">
    匹配提供商 ID 的合并模式优先级：

    - 智能体 `models.json` 中已存在的非空 `baseUrl` 胜出。
    - 仅当该提供商在当前配置/认证配置文件上下文中不是 SecretRef 管理时，智能体 `models.json` 中的非空 `apiKey` 胜出。
    - SecretRef 管理的提供商 `apiKey` 值从源标记刷新（env 引用为 `ENV_VAR_NAME`，文件/exec 引用为 `secretref-managed`），而不是持久化已解析的密钥。
    - SecretRef 管理的提供商标头值从源标记刷新（env 引用为 `secretref-env:ENV_VAR_NAME`，文件/exec 引用为 `secretref-managed`）。
    - 空或缺少的智能体 `apiKey`/`baseUrl` 回退到配置 `models.providers`。
    - 其他提供商字段从配置和规范化的目录数据刷新。

  </Accordion>
</AccordionGroup>

<Note>
标记持久化是来源权威的：OpenClaw 从活跃的来源配置快照（预解析）写入标记，而不是从解析的运行时密钥值写入。这适用于 OpenClaw 重新生成 `models.json` 的任何时候，包括命令驱动的路径，如 `openclaw agent`。
</Note>

## 相关

- [智能体运行时](/concepts/agent-runtimes) — PI、Codex 和其他智能体循环运行时
- [配置参考](/gateway/config-agents#agent-defaults) — 模型配置键
- [图像生成](/tools/image-generation) — 图像模型配置
- [模型故障转移](/concepts/model-failover) — 回退链
- [模型提供商](/concepts/model-providers) — 提供商路由和认证
- [音乐生成](/tools/music-generation) — 音乐模型配置
- [视频生成](/tools/video-generation) — 视频模型配置
