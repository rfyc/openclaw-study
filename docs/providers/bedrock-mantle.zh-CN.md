---
summary: "在 OpenClaw 中使用 Amazon Bedrock Mantle（OpenAI 兼容）模型"
read_when:
  - 您想在 OpenClaw 中使用 Bedrock Mantle 托管的开源模型
  - 您需要 Mantle 的 OpenAI 兼容端点，用于 GPT-OSS、Qwen、Kimi 或 GLM
title: "Amazon Bedrock Mantle"
---

OpenClaw 内置了 **Amazon Bedrock Mantle** 提供商，用于连接 Mantle 的 OpenAI 兼容端点。Mantle 通过标准的 `/v1/chat/completions` 接口托管开源和第三方模型（GPT-OSS、Qwen、Kimi、GLM 等），底层基于 Bedrock 基础设施。

| 属性      | 值                                                                                    |
| --------- | ------------------------------------------------------------------------------------- |
| 提供商 ID | `amazon-bedrock-mantle`                                                               |
| API       | `openai-completions`（OpenAI 兼容）或 `anthropic-messages`（Anthropic Messages 路由） |
| 认证      | 显式 `AWS_BEARER_TOKEN_BEDROCK` 或 IAM 凭据链 Bearer token 生成                       |
| 默认区域  | `us-east-1`（通过 `AWS_REGION` 或 `AWS_DEFAULT_REGION` 覆盖）                         |

## 快速开始

选择您偏好的认证方式并按步骤设置。

<Tabs>
  <Tab title="显式 Bearer token">
    **适合：** 已有 Mantle Bearer token 的环境。

    <Steps>
      <Step title="在网关主机上设置 Bearer token">
        ```bash
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```

        可选择设置区域（默认为 `us-east-1`）：

        ```bash
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="验证模型是否被发现">
        ```bash
        openclaw models list
        ```

        已发现的模型显示在 `amazon-bedrock-mantle` 提供商下。除非您想覆盖默认值，否则无需其他配置。
      </Step>
    </Steps>

  </Tab>

  <Tab title="IAM 凭据">
    **适合：** 使用 AWS SDK 兼容凭据（共享配置、SSO、Web 身份、实例或任务角色）。

    <Steps>
      <Step title="在网关主机上配置 AWS 凭据">
        任何 AWS SDK 兼容的认证来源均可使用：

        ```bash
        export AWS_PROFILE="default"
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="验证模型是否被发现">
        ```bash
        openclaw models list
        ```

        OpenClaw 会自动从凭据链生成 Mantle Bearer token。
      </Step>
    </Steps>

    <Tip>
    当未设置 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 会从 AWS 默认凭据链（包括共享凭据/配置文件、SSO、Web 身份以及实例或任务角色）为您生成 Bearer token。
    </Tip>

  </Tab>
</Tabs>

## 自动模型发现

当设置了 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 会直接使用它。否则，OpenClaw 会尝试从 AWS 默认凭据链生成 Mantle Bearer token，然后通过查询该区域的 `/v1/models` 端点来发现可用的 Mantle 模型。

| 行为           | 详情            |
| -------------- | --------------- |
| 发现缓存       | 结果缓存 1 小时 |
| IAM token 刷新 | 每小时          |

<Note>
Bearer token 与标准 [Amazon Bedrock](/providers/bedrock) 提供商使用的 `AWS_BEARER_TOKEN_BEDROCK` 相同。
</Note>

### 支持的区域

`us-east-1`、`us-east-2`、`us-west-2`、`ap-northeast-1`、
`ap-south-1`、`ap-southeast-3`、`eu-central-1`、`eu-west-1`、`eu-west-2`、
`eu-south-1`、`eu-north-1`、`sa-east-1`。

## 手动配置

如果您希望使用显式配置而非自动发现：

```json5
{
  models: {
    providers: {
      "amazon-bedrock-mantle": {
        baseUrl: "https://bedrock-mantle.us-east-1.api.aws/v1",
        api: "openai-completions",
        auth: "api-key",
        apiKey: "env:AWS_BEARER_TOKEN_BEDROCK",
        models: [
          {
            id: "gpt-oss-120b",
            name: "GPT-OSS 120B",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 32000,
            maxTokens: 4096,
          },
        ],
      },
    },
  },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="推理支持">
    推理支持从包含 `thinking`、`reasoner` 或 `gpt-oss-120b` 等模式的模型 ID 中推断。OpenClaw 在发现期间为匹配的模型自动设置 `reasoning: true`。
  </Accordion>

  <Accordion title="端点不可用">
    如果 Mantle 端点不可用或未返回模型，该提供商将被静默跳过。OpenClaw 不会报错；其他已配置的提供商将继续正常工作。
  </Accordion>

  <Accordion title="通过 Anthropic Messages 路由使用 Claude Opus 4.7">
    Mantle 还提供了一条 Anthropic Messages 路由，通过相同的 Bearer 认证流式传输路径承载 Claude 模型。Claude Opus 4.7（`amazon-bedrock-mantle/claude-opus-4.7`）可通过此路由调用，使用提供商原生流式传输，因此 AWS Bearer token 不会被视为 Anthropic API 密钥。

    当您在 Mantle 提供商上固定 Anthropic Messages 模型时，OpenClaw 会对该模型使用 `anthropic-messages` API 接口，而非 `openai-completions`。认证仍来自 `AWS_BEARER_TOKEN_BEDROCK`（或已铸造的 IAM Bearer token）。

    ```json5
    {
      models: {
        providers: {
          "amazon-bedrock-mantle": {
            models: [
              {
                id: "claude-opus-4.7",
                name: "Claude Opus 4.7",
                api: "anthropic-messages",
                reasoning: true,
                input: ["text", "image"],
                contextWindow: 1000000,
                maxTokens: 32000,
              },
            ],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="与 Amazon Bedrock 提供商的关系">
    Bedrock Mantle 是与标准 [Amazon Bedrock](/providers/bedrock) 提供商分离的提供商。Mantle 使用 OpenAI 兼容的 `/v1` 接口，而标准 Bedrock 提供商使用原生 Bedrock API。

    当存在 `AWS_BEARER_TOKEN_BEDROCK` 凭据时，两个提供商共享同一凭据。

  </Accordion>
</AccordionGroup>

## 相关链接

<CardGroup cols={2}>
  <Card title="Amazon Bedrock" href="/providers/bedrock" icon="cloud">
    用于 Anthropic Claude、Titan 和其他模型的原生 Bedrock 提供商。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="OAuth 和认证" href="/gateway/authentication" icon="key">
    认证详情和凭据复用规则。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常见问题及解决方法。
  </Card>
</CardGroup>
