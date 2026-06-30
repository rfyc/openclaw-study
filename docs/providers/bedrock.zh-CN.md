---
summary: "在 OpenClaw 中使用 Amazon Bedrock（Converse API）模型"
read_when:
  - 您想在 OpenClaw 中使用 Amazon Bedrock 模型
  - 您需要为模型调用配置 AWS 凭据/区域
title: "Amazon Bedrock"
---

OpenClaw 可以通过 pi-ai 的 **Bedrock Converse** 流式提供商使用 **Amazon Bedrock** 模型。Bedrock 认证使用 **AWS SDK 默认凭据链**，而非 API 密钥。

| 属性   | 值                                                        |
| ------ | --------------------------------------------------------- |
| 提供商 | `amazon-bedrock`                                          |
| API    | `bedrock-converse-stream`                                 |
| 认证   | AWS 凭据（环境变量、共享配置或实例角色）                  |
| 区域   | `AWS_REGION` 或 `AWS_DEFAULT_REGION`（默认：`us-east-1`） |

## 快速开始

选择您偏好的认证方式并按步骤设置。

<Tabs>
  <Tab title="访问密钥 / 环境变量">
    **适合：** 开发机器、CI 或直接管理 AWS 凭据的主机。

    <Steps>
      <Step title="在网关主机上设置 AWS 凭据">
        ```bash
        export AWS_ACCESS_KEY_ID="AKIA..."
        export AWS_SECRET_ACCESS_KEY="..."
        export AWS_REGION="us-east-1"
        # 可选：
        export AWS_SESSION_TOKEN="..."
        export AWS_PROFILE="your-profile"
        # 可选（Bedrock API 密钥/Bearer token）：
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```
      </Step>
      <Step title="在配置中添加 Bedrock 提供商和模型">
        不需要 `apiKey`。使用 `auth: "aws-sdk"` 配置提供商：

        ```json5
        {
          models: {
            providers: {
              "amazon-bedrock": {
                baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
                api: "bedrock-converse-stream",
                auth: "aws-sdk",
                models: [
                  {
                    id: "us.anthropic.claude-opus-4-6-v1:0",
                    name: "Claude Opus 4.6 (Bedrock)",
                    reasoning: true,
                    input: ["text", "image"],
                    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                    contextWindow: 200000,
                    maxTokens: 8192,
                  },
                ],
              },
            },
          },
          agents: {
            defaults: {
              model: { primary: "amazon-bedrock/us.anthropic.claude-opus-4-6-v1:0" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Tip>
    通过环境变量标记认证（`AWS_ACCESS_KEY_ID`、`AWS_PROFILE` 或 `AWS_BEARER_TOKEN_BEDROCK`），OpenClaw 无需额外配置即可自动启用隐式 Bedrock 提供商进行模型发现。
    </Tip>

  </Tab>

  <Tab title="EC2 实例角色（IMDS）">
    **适合：** 附有 IAM 角色的 EC2 实例，使用实例元数据服务进行认证。

    <Steps>
      <Step title="显式启用发现">
        使用 IMDS 时，OpenClaw 无法单独从环境变量标记检测 AWS 认证，因此必须手动选择加入：

        ```bash
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1
        ```
      </Step>
      <Step title="可选：添加环境变量标记以启用自动模式">
        如果您还希望环境变量自动检测路径正常工作（例如，用于 `openclaw status` 状态界面）：

        ```bash
        export AWS_PROFILE=default
        export AWS_REGION=us-east-1
        ```

        您**不需要**伪造 API 密钥。
      </Step>
      <Step title="验证模型是否被发现">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Warning>
    附加到您 EC2 实例的 IAM 角色必须具有以下权限：

    - `bedrock:InvokeModel`
    - `bedrock:InvokeModelWithResponseStream`
    - `bedrock:ListFoundationModels`（用于自动发现）
    - `bedrock:ListInferenceProfiles`（用于推理配置文件发现）

    或附加托管策略 `AmazonBedrockFullAccess`。
    </Warning>

    <Note>
    仅当您明确需要自动模式或状态界面的环境变量标记时，才需要 `AWS_PROFILE=default`。实际的 Bedrock 运行时认证路径使用 AWS SDK 默认链，因此即使没有环境变量标记，IMDS 实例角色认证也能正常工作。
    </Note>

  </Tab>
</Tabs>

## 自动模型发现

OpenClaw 可以自动发现支持**流式传输**和**文本输出**的 Bedrock 模型。发现使用 `bedrock:ListFoundationModels` 和 `bedrock:ListInferenceProfiles`，结果会被缓存（默认：1 小时）。

隐式提供商的启用方式：

- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 为 `true`，即使没有 AWS 环境变量标记，OpenClaw 也会尝试发现。
- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 未设置，OpenClaw 仅在检测到以下 AWS 认证标记之一时才自动添加隐式 Bedrock 提供商：`AWS_BEARER_TOKEN_BEDROCK`、`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，或 `AWS_PROFILE`。
- 实际的 Bedrock 运行时认证路径仍使用 AWS SDK 默认链，因此即使发现需要 `enabled: true` 才能选择加入，共享配置、SSO 和 IMDS 实例角色认证也能正常工作。

<Note>
对于显式 `models.providers["amazon-bedrock"]` 条目，OpenClaw 仍可从 AWS 环境变量（如 `AWS_BEARER_TOKEN_BEDROCK`）早期解析 Bedrock 环境变量认证，而无需强制完全加载运行时认证。实际的模型调用认证路径仍使用 AWS SDK 默认链。
</Note>

<AccordionGroup>
  <Accordion title="发现配置选项">
    配置选项位于 `plugins.entries.amazon-bedrock.config.discovery` 下：

    ```json5
    {
      plugins: {
        entries: {
          "amazon-bedrock": {
            config: {
              discovery: {
                enabled: true,
                region: "us-east-1",
                providerFilter: ["anthropic", "amazon"],
                refreshInterval: 3600,
                defaultContextWindow: 32000,
                defaultMaxTokens: 4096,
              },
            },
          },
        },
      },
    }
    ```

    | 选项                     | 默认值 | 描述 |
    | ------ | ------- | ----------- |
    | `enabled` | 自动 | 在自动模式下，OpenClaw 仅在检测到受支持的 AWS 环境变量标记时才启用隐式 Bedrock 提供商。设为 `true` 可强制发现。 |
    | `region` | `AWS_REGION` / `AWS_DEFAULT_REGION` / `us-east-1` | 用于发现 API 调用的 AWS 区域。 |
    | `providerFilter` | （全部） | 匹配 Bedrock 提供商名称（例如 `anthropic`、`amazon`）。 |
    | `refreshInterval` | `3600` | 缓存持续时间（秒）。设为 `0` 可禁用缓存。 |
    | `defaultContextWindow` | `32000` | 用于已发现模型的上下文窗口（如果您了解模型限制，可覆盖此值）。 |
    | `defaultMaxTokens` | `4096` | 用于已发现模型的最大输出 token（如果您了解模型限制，可覆盖此值）。 |

  </Accordion>
</AccordionGroup>

## 快速设置（AWS 路径）

此演示创建 IAM 角色、附加 Bedrock 权限、关联实例配置文件，并在 EC2 主机上启用 OpenClaw 发现。

```bash
# 1. 创建 IAM 角色和实例配置文件
aws iam create-role --role-name EC2-Bedrock-Access \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy --role-name EC2-Bedrock-Access \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

aws iam create-instance-profile --instance-profile-name EC2-Bedrock-Access
aws iam add-role-to-instance-profile \
  --instance-profile-name EC2-Bedrock-Access \
  --role-name EC2-Bedrock-Access

# 2. 附加到您的 EC2 实例
aws ec2 associate-iam-instance-profile \
  --instance-id i-xxxxx \
  --iam-instance-profile Name=EC2-Bedrock-Access

# 3. 在 EC2 实例上，显式启用发现
openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1

# 4. 可选：如果需要无需显式启用的自动模式，添加环境变量标记
echo 'export AWS_PROFILE=default' >> ~/.bashrc
echo 'export AWS_REGION=us-east-1' >> ~/.bashrc
source ~/.bashrc

# 5. 验证模型是否被发现
openclaw models list
```

## 高级配置

<AccordionGroup>
  <Accordion title="推理配置文件">
    OpenClaw 与基础模型一起发现**区域和全局推理配置文件**。当配置文件映射到已知基础模型时，该配置文件会继承该模型的功能（上下文窗口、最大 token、推理、视觉），并自动注入正确的 Bedrock 请求区域。这意味着跨区域 Claude 配置文件无需手动覆盖提供商即可工作。

    推理配置文件 ID 如 `us.anthropic.claude-opus-4-6-v1:0`（区域）或 `anthropic.claude-opus-4-6-v1:0`（全局）。如果支撑模型已在发现结果中，配置文件将继承其完整功能集；否则应用安全默认值。

    无需额外配置。只要发现已启用且 IAM 主体具有 `bedrock:ListInferenceProfiles` 权限，配置文件就会与基础模型一起出现在 `openclaw models list` 中。

  </Accordion>

  <Accordion title="Claude Opus 4.7 温度参数">
    Bedrock 拒绝 Claude Opus 4.7 的 `temperature` 参数。OpenClaw 会自动为所有 Opus 4.7 Bedrock 引用省略 `temperature`，包括基础模型 ID、命名推理配置文件、通过 `bedrock:GetInferenceProfile` 将底层模型解析为 Opus 4.7 的应用推理配置文件，以及带有可选区域前缀（`us.`、`eu.`、`ap.`、`apac.`、`au.`、`jp.`、`global.`）的点分 `opus-4.7` 变体。无需配置开关，省略操作同时适用于请求选项对象和 `inferenceConfig` 载荷字段。
  </Accordion>

  <Accordion title="防护栏">
    您可以通过向 `amazon-bedrock` 插件配置添加 `guardrail` 对象，将 [Amazon Bedrock 防护栏](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)应用于所有 Bedrock 模型调用。防护栏可用于强制执行内容过滤、主题拒绝、词语过滤、敏感信息过滤和上下文基础检查。

    ```json5
    {
      plugins: {
        entries: {
          "amazon-bedrock": {
            config: {
              guardrail: {
                guardrailIdentifier: "abc123", // 防护栏 ID 或完整 ARN
                guardrailVersion: "1", // 版本号或 "DRAFT"
                streamProcessingMode: "sync", // 可选："sync" 或 "async"
                trace: "enabled", // 可选："enabled"、"disabled" 或 "enabled_full"
              },
            },
          },
        },
      },
    }
    ```

    | 选项 | 是否必需 | 描述 |
    | ------ | -------- | ----------- |
    | `guardrailIdentifier` | 是 | 防护栏 ID（如 `abc123`）或完整 ARN（如 `arn:aws:bedrock:us-east-1:123456789012:guardrail/abc123`）。 |
    | `guardrailVersion` | 是 | 已发布的版本号，或 `"DRAFT"` 表示工作草稿。 |
    | `streamProcessingMode` | 否 | `"sync"` 或 `"async"`，用于流式传输期间的防护栏评估。如省略，Bedrock 使用其默认值。 |
    | `trace` | 否 | `"enabled"` 或 `"enabled_full"` 用于调试；生产环境省略或设为 `"disabled"`。 |

    <Warning>
    网关使用的 IAM 主体除了标准调用权限外，还必须具有 `bedrock:ApplyGuardrail` 权限。
    </Warning>

  </Accordion>

  <Accordion title="用于内存搜索的嵌入">
    Bedrock 也可以作为[内存搜索](/concepts/memory-search)的嵌入提供商。这与推理提供商分开配置——将 `agents.defaults.memorySearch.provider` 设为 `"bedrock"`：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "bedrock",
            model: "amazon.titan-embed-text-v2:0", // 默认值
          },
        },
      },
    }
    ```

    Bedrock 嵌入与推理使用相同的 AWS SDK 凭据链（实例角色、SSO、访问密钥、共享配置和 Web 身份）。不需要 API 密钥。当 `provider` 为 `"auto"` 时，如果凭据链成功解析，Bedrock 会被自动检测。

    支持的嵌入模型包括 Amazon Titan Embed（v1、v2）、Amazon Nova Embed、Cohere Embed（v3、v4）和 TwelveLabs Marengo。请参见[内存配置参考——Bedrock](/reference/memory-config#bedrock-embedding-config)获取完整模型列表和维度选项。

  </Accordion>

  <Accordion title="注意事项">
    - Bedrock 需要在您的 AWS 账户/区域中启用**模型访问权限**。
    - 自动发现需要 `bedrock:ListFoundationModels` 和 `bedrock:ListInferenceProfiles` 权限。
    - 如果依赖自动模式，请在网关主机上设置一个受支持的 AWS 认证环境变量标记。如果您希望使用 IMDS/共享配置认证而不设置环境变量标记，请将 `plugins.entries.amazon-bedrock.config.discovery.enabled: true` 设为 `true`。
    - OpenClaw 按以下顺序显示凭据来源：`AWS_BEARER_TOKEN_BEDROCK`，然后是 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，然后是 `AWS_PROFILE`，最后是默认 AWS SDK 链。
    - 推理支持取决于模型；请查看 Bedrock 模型卡了解当前功能。
    - 如果您希望使用托管密钥流程，也可以在 Bedrock 前放置一个 OpenAI 兼容代理，并将其配置为 OpenAI 提供商。
  </Accordion>
</AccordionGroup>

## 相关链接

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="内存搜索" href="/concepts/memory-search" icon="magnifying-glass">
    用于内存搜索配置的 Bedrock 嵌入。
  </Card>
  <Card title="内存配置参考" href="/reference/memory-config#bedrock-embedding-config" icon="database">
    完整的 Bedrock 嵌入模型列表和维度选项。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    通用故障排查和常见问题。
  </Card>
</CardGroup>
