---
summary: "Vercel AI Gateway 设置（认证 + 模型选择）"
title: "Vercel AI gateway"
read_when:
  - 你想在 OpenClaw 中使用 Vercel AI Gateway
  - 你需要 API 密钥环境变量或 CLI 认证选择
---

[Vercel AI Gateway](https://vercel.com/ai-gateway) 通过单一端点提供访问数百个模型的统一 API。

| 属性     | 值                         |
| -------- | -------------------------- |
| 提供商   | `vercel-ai-gateway`        |
| 认证     | `AI_GATEWAY_API_KEY`       |
| API      | Anthropic Messages 兼容    |
| 模型目录 | 通过 `/v1/models` 自动发现 |

<Tip>
OpenClaw 自动发现 Gateway 的 `/v1/models` 目录，因此 `/models vercel-ai-gateway` 包含当前的模型引用，如 `vercel-ai-gateway/openai/gpt-5.5` 和 `vercel-ai-gateway/moonshotai/kimi-k2.6`。
</Tip>

## 快速开始

<Steps>
  <Step title="设置 API 密钥">
    运行引导程序并选择 AI Gateway 认证选项：

    ```bash
    openclaw onboard --auth-choice ai-gateway-api-key
    ```

  </Step>
  <Step title="设置默认模型">
    将模型添加到你的 OpenClaw 配置中：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.6" },
        },
      },
    }
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider vercel-ai-gateway
    ```
  </Step>
</Steps>

## 非交互式示例

对于脚本或 CI 设置，在命令行传入所有值：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## 模型 ID 简写

OpenClaw 接受 Vercel Claude 简写模型引用，并在运行时进行规范化：

| 简写输入                            | 规范化模型引用                                |
| ----------------------------------- | --------------------------------------------- |
| `vercel-ai-gateway/claude-opus-4.6` | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| `vercel-ai-gateway/opus-4.6`        | `vercel-ai-gateway/anthropic/claude-opus-4-6` |

<Tip>
你可以在配置中使用简写或完整限定的模型引用。OpenClaw 会自动解析规范形式。
</Tip>

## 高级配置

<AccordionGroup>
  <Accordion title="守护进程的环境变量">
    如果 OpenClaw Gateway 作为守护进程（launchd/systemd）运行，请确保 `AI_GATEWAY_API_KEY` 对该进程可用。

    <Warning>
    仅在 `~/.profile` 中设置的密钥对 launchd/systemd 守护进程不可见，除非明确导入了该环境。在 `~/.openclaw/.env` 中设置密钥或通过 `env.shellEnv` 确保网关进程可以读取它。
    </Warning>

  </Accordion>

  <Accordion title="提供商路由">
    Vercel AI Gateway 根据模型引用前缀将请求路由到上游提供商。例如，`vercel-ai-gateway/anthropic/claude-opus-4.6` 通过 Anthropic 路由，`vercel-ai-gateway/openai/gpt-5.5` 通过 OpenAI 路由，`vercel-ai-gateway/moonshotai/kimi-k2.6` 通过 MoonshotAI 路由。你的单个 `AI_GATEWAY_API_KEY` 负责所有上游提供商的认证。
  </Accordion>
  <Accordion title="思考级别">
    `/think` 选项在 OpenClaw 知道上游提供商合约时遵循受信任的上游模型前缀。`vercel-ai-gateway/anthropic/...` 使用 Claude 思考配置文件，包括 Claude 4.6 模型的自适应默认值。`vercel-ai-gateway/openai/gpt-5.4`、`gpt-5.5` 和 Codex 风格的引用与直接 OpenAI/OpenAI Codex 提供商一样暴露 `/think xhigh`。除非目录元数据声明更多，其他命名空间引用保持正常推理级别。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    通用故障排查和常见问题解答。
  </Card>
</CardGroup>
