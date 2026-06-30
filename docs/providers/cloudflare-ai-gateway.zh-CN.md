---
summary: "Cloudflare AI Gateway 设置（认证 + 模型选择）"
title: "Cloudflare AI 网关"
read_when:
  - 您想在 OpenClaw 中使用 Cloudflare AI Gateway
  - 您需要账户 ID、网关 ID 或 API 密钥环境变量
---

Cloudflare AI Gateway 位于提供商 API 前端，可让您添加分析、缓存和控制功能。对于 Anthropic，OpenClaw 通过您的 Gateway 端点使用 Anthropic Messages API。

| 属性     | 值                                                                         |
| -------- | -------------------------------------------------------------------------- |
| 提供商   | `cloudflare-ai-gateway`                                                    |
| 基础 URL | `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic` |
| 默认模型 | `cloudflare-ai-gateway/claude-sonnet-4-6`                                  |
| API 密钥 | `CLOUDFLARE_AI_GATEWAY_API_KEY`（通过 Gateway 发送请求的提供商 API 密钥）  |

<Note>
对于通过 Cloudflare AI Gateway 路由的 Anthropic 模型，请使用您的 **Anthropic API 密钥**作为提供商密钥。
</Note>

当为 Anthropic Messages 模型启用思考功能时，OpenClaw 会在通过 Cloudflare AI Gateway 发送载荷之前去除尾部的助手预填充轮次。Anthropic 拒绝使用扩展思考进行响应预填充，而普通的非思考预填充仍然可用。

## 快速开始

<Steps>
  <Step title="设置提供商 API 密钥和 Gateway 详情">
    运行引导程序并选择 Cloudflare AI Gateway 认证选项：

    ```bash
    openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
    ```

    这将提示您输入账户 ID、网关 ID 和 API 密钥。

  </Step>
  <Step title="设置默认模型">
    将模型添加到您的 OpenClaw 配置中：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "cloudflare-ai-gateway/claude-sonnet-4-6" },
        },
      },
    }
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider cloudflare-ai-gateway
    ```
  </Step>
</Steps>

## 非交互式示例

对于脚本化或 CI 设置，在命令行中传入所有值：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY"
```

## 高级配置

<AccordionGroup>
  <Accordion title="已认证的网关">
    如果您在 Cloudflare 中启用了网关认证，请添加 `cf-aig-authorization` 标头。这是对提供商 API 密钥的**额外补充**。

    ```json5
    {
      models: {
        providers: {
          "cloudflare-ai-gateway": {
            headers: {
              "cf-aig-authorization": "Bearer <cloudflare-ai-gateway-token>",
            },
          },
        },
      },
    }
    ```

    <Tip>
    `cf-aig-authorization` 标头用于与 Cloudflare Gateway 本身进行认证，而提供商 API 密钥（例如您的 Anthropic 密钥）用于与上游提供商进行认证。
    </Tip>

  </Accordion>

  <Accordion title="环境说明">
    如果网关作为守护进程运行（launchd/systemd），请确保 `CLOUDFLARE_AI_GATEWAY_API_KEY` 对该进程可用。

    <Warning>
    仅在 `~/.profile` 中设置的密钥对 launchd/systemd 守护进程没有帮助，除非该环境也被导入到那里。请在 `~/.openclaw/.env` 中设置密钥或通过 `env.shellEnv` 确保网关进程可以读取它。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相关链接

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    通用故障排查和常见问题。
  </Card>
</CardGroup>
