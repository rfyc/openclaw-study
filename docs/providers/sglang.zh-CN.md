---
summary: "使用 SGLang（OpenAI 兼容自托管服务器）运行 OpenClaw"
read_when:
  - 你想在本地 SGLang 服务器上运行 OpenClaw
  - 你想用自己的模型使用 OpenAI 兼容的 /v1 端点
title: "SGLang"
---

SGLang 可以通过 **OpenAI 兼容** HTTP API 提供开源模型服务。OpenClaw 可以使用 `openai-completions` API 连接到 SGLang。

当你选择加入（设置 `SGLANG_API_KEY`，任何值都可以，如果你的服务器不强制验证）且未定义显式的 `models.providers.sglang` 条目时，OpenClaw 还可以**自动发现** SGLang 中的可用模型。

OpenClaw 将 `sglang` 视为支持流式使用量核算的本地 OpenAI 兼容提供商，因此状态/上下文令牌计数可以从 `stream_options.include_usage` 响应中更新。

## 快速开始

<Steps>
  <Step title="启动 SGLang">
    使用 OpenAI 兼容服务器启动 SGLang。你的基础 URL 应暴露 `/v1` 端点（例如 `/v1/models`、`/v1/chat/completions`）。SGLang 通常运行在：

    - `http://127.0.0.1:30000/v1`

  </Step>
  <Step title="设置 API 密钥">
    如果服务器未配置认证，任何值都可以：

    ```bash
    export SGLANG_API_KEY="sglang-local"
    ```

  </Step>
  <Step title="运行引导程序或直接设置模型">
    ```bash
    openclaw onboard
    ```

    或手动配置模型：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "sglang/your-model-id" },
        },
      },
    }
    ```

  </Step>
</Steps>

## 模型发现（隐式提供商）

当 `SGLANG_API_KEY` 已设置（或存在认证配置文件）且你**未**定义 `models.providers.sglang` 时，OpenClaw 将查询：

- `GET http://127.0.0.1:30000/v1/models`

并将返回的 id 转换为模型条目。

<Note>
如果你显式设置了 `models.providers.sglang`，将跳过自动发现，你必须手动定义模型。
</Note>

## 显式配置（手动模型）

在以下情况下使用显式配置：

- SGLang 运行在不同的主机/端口上。
- 你想固定 `contextWindow`/`maxTokens` 值。
- 你的服务器需要真实 API 密钥（或你想控制请求头）。

```json5
{
  models: {
    providers: {
      sglang: {
        baseUrl: "http://127.0.0.1:30000/v1",
        apiKey: "${SGLANG_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "Local SGLang Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="代理风格行为">
    SGLang 被视为代理风格的 OpenAI 兼容 `/v1` 后端，而非原生 OpenAI 端点。

    | 行为 | SGLang |
    |----------|--------|
    | OpenAI 专属请求整形 | 不适用 |
    | `service_tier`、Responses `store`、提示缓存提示 | 不发送 |
    | 推理兼容负载整形 | 不适用 |
    | 隐藏归属请求头（`originator`、`version`、`User-Agent`）| 自定义 SGLang 基础 URL 不注入 |

  </Accordion>

  <Accordion title="故障排查">
    **服务器不可达**

    验证服务器是否正在运行并响应：

    ```bash
    curl http://127.0.0.1:30000/v1/models
    ```

    **认证错误**

    如果请求因认证错误而失败，请设置与服务器配置匹配的真实 `SGLANG_API_KEY`，或在 `models.providers.sglang` 下显式配置提供商。

    <Tip>
    如果你的 SGLang 服务器不强制认证，任何非空的 `SGLANG_API_KEY` 值都足以选择加入模型发现。
    </Tip>

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包含提供商条目的完整配置架构。
  </Card>
</CardGroup>
