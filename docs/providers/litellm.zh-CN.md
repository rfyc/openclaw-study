---
summary: "通过 LiteLLM 代理运行 OpenClaw，实现统一模型访问和成本追踪"
title: "LiteLLM"
read_when:
  - 您想通过 LiteLLM 代理路由 OpenClaw
  - 您需要通过 LiteLLM 进行成本追踪、日志记录或模型路由
---

[LiteLLM](https://litellm.ai) 是一个开源 LLM 网关，为 100+ 模型提供商提供统一 API。通过 LiteLLM 路由 OpenClaw，可以获得集中化的成本追踪、日志记录，以及无需更改 OpenClaw 配置即可切换后端的灵活性。

<Tip>
**为什么在 OpenClaw 中使用 LiteLLM？**

- **成本追踪** — 精确查看 OpenClaw 在所有模型上的开销
- **模型路由** — 无需更改配置即可在 Claude、GPT-4、Gemini、Bedrock 之间切换
- **虚拟密钥** — 为 OpenClaw 创建带消费限额的密钥
- **日志记录** — 完整的请求/响应日志用于调试
- **故障转移** — 当主要提供商宕机时自动切换

</Tip>

## 快速开始

<Tabs>
  <Tab title="引导程序（推荐）">
    **适合：** 最快速地完成 LiteLLM 设置。

    <Steps>
      <Step title="运行引导程序">
        ```bash
        openclaw onboard --auth-choice litellm-api-key
        ```

        对于针对远程代理的非交互式设置，请明确传入代理 URL：

        ```bash
        openclaw onboard --non-interactive --auth-choice litellm-api-key --litellm-api-key "$LITELLM_API_KEY" --custom-base-url "https://litellm.example/v1"
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="手动设置">
    **适合：** 完全控制安装和配置。

    <Steps>
      <Step title="启动 LiteLLM 代理">
        ```bash
        pip install 'litellm[proxy]'
        litellm --model claude-opus-4-6
        ```
      </Step>
      <Step title="将 OpenClaw 指向 LiteLLM">
        ```bash
        export LITELLM_API_KEY="your-litellm-key"

        openclaw
        ```

        就这样。OpenClaw 现在通过 LiteLLM 路由。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 配置

### 环境变量

```bash
export LITELLM_API_KEY="sk-litellm-key"
```

### 配置文件

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "claude-opus-4-6",
            name: "Claude Opus 4.6",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 200000,
            maxTokens: 64000,
          },
          {
            id: "gpt-4o",
            name: "GPT-4o",
            reasoning: false,
            input: ["text", "image"],
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "litellm/claude-opus-4-6" },
    },
  },
}
```

## 高级配置

### 图像生成

LiteLLM 也可以通过 OpenAI 兼容的 `/images/generations` 和 `/images/edits` 路由支持 `image_generate` 工具。在 `agents.defaults.imageGenerationModel` 下配置 LiteLLM 图像模型：

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
      },
    },
  },
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "litellm/gpt-image-2",
        timeoutMs: 180_000,
      },
    },
  },
}
```

本地回环 LiteLLM URL（如 `http://localhost:4000`）无需全局私有网络覆盖即可工作。对于局域网托管的代理，请设置 `models.providers.litellm.request.allowPrivateNetwork: true`，因为 API 密钥将被发送到已配置的代理主机。

<AccordionGroup>
  <Accordion title="虚拟密钥">
    为 OpenClaw 创建带消费限额的专用密钥：

    ```bash
    curl -X POST "http://localhost:4000/key/generate" \
      -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "key_alias": "openclaw",
        "max_budget": 50.00,
        "budget_duration": "monthly"
      }'
    ```

    使用生成的密钥作为 `LITELLM_API_KEY`。

  </Accordion>

  <Accordion title="模型路由">
    LiteLLM 可以将模型请求路由到不同的后端。在您的 LiteLLM `config.yaml` 中配置：

    ```yaml
    model_list:
      - model_name: claude-opus-4-6
        litellm_params:
          model: claude-opus-4-6
          api_key: os.environ/ANTHROPIC_API_KEY

      - model_name: gpt-4o
        litellm_params:
          model: gpt-4o
          api_key: os.environ/OPENAI_API_KEY
    ```

    OpenClaw 继续请求 `claude-opus-4-6`——LiteLLM 处理路由。

  </Accordion>

  <Accordion title="查看使用情况">
    检查 LiteLLM 的控制台或 API：

    ```bash
    # 密钥信息
    curl "http://localhost:4000/key/info" \
      -H "Authorization: Bearer sk-litellm-key"

    # 消费日志
    curl "http://localhost:4000/spend/logs" \
      -H "Authorization: Bearer $LITELLM_MASTER_KEY"
    ```

  </Accordion>

  <Accordion title="代理行为说明">
    - LiteLLM 默认运行在 `http://localhost:4000`
    - OpenClaw 通过 LiteLLM 的代理式 OpenAI 兼容 `/v1` 端点连接
    - 通过 LiteLLM 时不适用原生 OpenAI 专属请求格式：无 `service_tier`、无 Responses `store`、无提示词缓存提示，也无 OpenAI 推理兼容载荷格式
    - 自定义 LiteLLM 基础 URL 上不注入隐藏的 OpenClaw 归因标头（`originator`、`version`、`User-Agent`）
  </Accordion>
</AccordionGroup>

<Note>
有关通用提供商配置和故障转移行为，请参见[模型提供商](/concepts/model-providers)。
</Note>

## 相关链接

<CardGroup cols={2}>
  <Card title="LiteLLM 文档" href="https://docs.litellm.ai" icon="book">
    LiteLLM 官方文档和 API 参考。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为概述。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
  <Card title="模型选择" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
</CardGroup>
