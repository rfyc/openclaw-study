---
summary: "通过 API 密钥或 Claude CLI 在 OpenClaw 中使用 Anthropic Claude"
read_when:
  - 您想在 OpenClaw 中使用 Anthropic 模型
title: "Anthropic"
---

Anthropic 构建了 **Claude** 模型系列。OpenClaw 支持两种认证方式：

- **API 密钥** — 按使用量计费的直接 Anthropic API 访问（`anthropic/*` 模型）
- **Claude CLI** — 在同一主机上复用现有的 Claude CLI 登录

<Warning>
Anthropic 员工告知我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此 OpenClaw 将 Claude CLI 复用和 `claude -p` 使用视为被认可的方式，除非 Anthropic 发布新政策。

对于长期运行的网关主机，Anthropic API 密钥仍然是最清晰、最可预期的生产路径。

Anthropic 当前的公开文档：

- [Claude Code CLI 参考](https://code.claude.com/docs/en/cli-reference)
- [Claude Agent SDK 概述](https://platform.claude.com/docs/en/agent-sdk/overview)
- [使用 Claude Code 的 Pro 或 Max 套餐](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [使用 Claude Code 的 Team 或 Enterprise 套餐](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

</Warning>

## 快速开始

<Tabs>
  <Tab title="API 密钥">
    **适合：** 标准 API 访问和按使用量计费。

    <Steps>
      <Step title="获取 API 密钥">
        在 [Anthropic Console](https://console.anthropic.com/) 中创建 API 密钥。
      </Step>
      <Step title="运行引导程序">
        ```bash
        openclaw onboard
        # 选择：Anthropic API key
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    ### 配置示例

    ```json5
    {
      env: { ANTHROPIC_API_KEY: "sk-ant-..." },
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **适合：** 复用现有的 Claude CLI 登录，无需单独的 API 密钥。

    <Steps>
      <Step title="确保 Claude CLI 已安装并已登录">
        验证方式：

        ```bash
        claude --version
        ```
      </Step>
      <Step title="运行引导程序">
        ```bash
        openclaw onboard
        # 选择：Claude CLI
        ```

        OpenClaw 会检测并复用现有的 Claude CLI 凭据。
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    <Note>
    Claude CLI 后端的设置和运行时详情，请参见 [CLI 后端](/gateway/cli-backends)。
    </Note>

    ### 配置示例

    推荐使用规范的 Anthropic 模型引用，并添加 CLI 运行时覆盖：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-7" },
          agentRuntime: { id: "claude-cli" },
        },
      },
    }
    ```

    旧版 `claude-cli/claude-opus-4-7` 模型引用仍支持兼容性，但新配置应将提供商/模型选择保留为 `anthropic/*`，并将执行后端放在 `agentRuntime.id` 中。

    <Tip>
    如果您希望有最清晰的计费路径，请使用 Anthropic API 密钥。OpenClaw 也支持来自 [OpenAI Codex](/providers/openai)、[Qwen 云](/providers/qwen)、[MiniMax](/providers/minimax) 和 [Z.AI / GLM](/providers/glm) 的订阅式选项。
    </Tip>

  </Tab>
</Tabs>

## 思考默认值（Claude 4.6）

当未设置明确的思考级别时，Claude 4.6 模型在 OpenClaw 中默认使用 `adaptive` 思考模式。

通过 `/think:<level>` 或模型参数按消息覆盖：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { thinking: "adaptive" },
        },
      },
    },
  },
}
```

<Note>
相关 Anthropic 文档：
- [自适应思考](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [扩展思考](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

</Note>

## 提示词缓存

OpenClaw 支持 Anthropic 的提示词缓存功能，适用于 API 密钥认证。

| 值                | 缓存时长 | 描述                   |
| ----------------- | -------- | ---------------------- |
| `"short"`（默认） | 5 分钟   | API 密钥认证时自动应用 |
| `"long"`          | 1 小时   | 扩展缓存               |
| `"none"`          | 无缓存   | 禁用提示词缓存         |

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { cacheRetention: "long" },
        },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="按代理缓存覆盖">
    使用模型级参数作为基准，然后通过 `agents.list[].params` 覆盖特定代理：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": {
              params: { cacheRetention: "long" },
            },
          },
        },
        list: [
          { id: "research", default: true },
          { id: "alerts", params: { cacheRetention: "none" } },
        ],
      },
    }
    ```

    配置合并顺序：

    1. `agents.defaults.models["provider/model"].params`
    2. `agents.list[].params`（匹配 `id`，按键覆盖）

    这使一个代理可以保持长效缓存，而同一模型上的另一个代理可以为突发/低复用流量禁用缓存。

  </Accordion>

  <Accordion title="Bedrock Claude 说明">
    - Bedrock 上的 Anthropic Claude 模型（`amazon-bedrock/*anthropic.claude*`）在配置时接受 `cacheRetention` 直传。
    - 非 Anthropic 的 Bedrock 模型在运行时强制设为 `cacheRetention: "none"`。
    - API 密钥智能默认值在未设置明确值时，也会为 Claude-on-Bedrock 引用设置 `cacheRetention: "short"`。

  </Accordion>
</AccordionGroup>

## 高级配置

<AccordionGroup>
  <Accordion title="快速模式">
    OpenClaw 的共享 `/fast` 切换支持直接 Anthropic 流量（API 密钥和 OAuth 到 `api.anthropic.com`）。

    | 命令        | 映射到                     |
    |-------------|--------------------------|
    | `/fast on`  | `service_tier: "auto"`   |
    | `/fast off` | `service_tier: "standard_only"` |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-sonnet-4-6": {
              params: { fastMode: true },
            },
          },
        },
      },
    }
    ```

    <Note>
    - 仅为直接 `api.anthropic.com` 请求注入。代理路由不会修改 `service_tier`。
    - 当两者同时设置时，显式的 `serviceTier` 或 `service_tier` 参数会覆盖 `/fast`。
    - 在没有优先级层容量的账户上，`service_tier: "auto"` 可能解析为 `standard`。

    </Note>

  </Accordion>

  <Accordion title="媒体理解（图像和 PDF）">
    内置的 Anthropic 插件注册了图像和 PDF 理解功能。OpenClaw 会从配置的 Anthropic 认证自动解析媒体功能——无需额外配置。

    | 属性          | 值                     |
    | -------------- | -------------------- |
    | 默认模型       | `claude-opus-4-6`    |
    | 支持的输入     | 图像、PDF 文档        |

    当对话中附有图像或 PDF 时，OpenClaw 会自动通过 Anthropic 媒体理解提供商路由处理。

  </Accordion>

  <Accordion title="1M 上下文窗口（测试版）">
    Anthropic 的 1M 上下文窗口受测试版限制。按模型启用：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": {
              params: { context1m: true },
            },
          },
        },
      },
    }
    ```

    OpenClaw 将其映射到请求中的 `anthropic-beta: context-1m-2025-08-07`。

    `params.context1m: true` 也适用于 Claude CLI 后端（`claude-cli/*`）中符合条件的 Opus 和 Sonnet 模型，将这些 CLI 会话的运行时上下文窗口扩展至与直接 API 行为一致。

    <Warning>
    需要您的 Anthropic 凭据具有长上下文访问权限。旧版 token 认证（`sk-ant-oat-*`）对 1M 上下文请求会被拒绝——OpenClaw 会记录警告并回退到标准上下文窗口。
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 4.7 的 1M 上下文">
    `anthropic/claude-opus-4.7` 及其 `claude-cli` 变体默认具有 1M 上下文窗口——无需设置 `params.context1m: true`。
  </Accordion>
</AccordionGroup>

## 故障排查

<AccordionGroup>
  <Accordion title="401 错误 / token 突然失效">
    Anthropic token 认证会过期且可被吊销。对于新设置，请改用 Anthropic API 密钥。
  </Accordion>

  <Accordion title='找不到提供商 "anthropic" 的 API 密钥'>
    Anthropic 认证是**按代理**配置的——新代理不会继承主代理的密钥。重新为该代理运行引导程序（或在网关主机上配置 API 密钥），然后使用 `openclaw models status` 验证。
  </Accordion>

  <Accordion title='找不到配置文件 "anthropic:default" 的凭据'>
    运行 `openclaw models status` 查看当前活动的认证配置文件。重新运行引导程序，或为该配置文件路径配置 API 密钥。
  </Accordion>

  <Accordion title="没有可用的认证配置文件（所有配置文件均处于冷却期）">
    检查 `openclaw models status --json` 中的 `auth.unusableProfiles`。Anthropic 速率限制冷却期可能按模型划定范围，因此同一 Anthropic 的其他模型可能仍可用。添加另一个 Anthropic 配置文件或等待冷却结束。
  </Accordion>
</AccordionGroup>

<Note>
更多帮助：[故障排查](/help/troubleshooting) 和 [常见问题](/help/faq)。
</Note>

## 相关链接

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="CLI 后端" href="/gateway/cli-backends" icon="terminal">
    Claude CLI 后端设置和运行时详情。
  </Card>
  <Card title="提示词缓存" href="/reference/prompt-caching" icon="database">
    提示词缓存在各提供商中的工作原理。
  </Card>
  <Card title="OAuth 和认证" href="/gateway/authentication" icon="key">
    认证详情和凭据复用规则。
  </Card>
</CardGroup>
