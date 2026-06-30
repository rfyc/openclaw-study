---
summary: "使用 vLLM（OpenAI 兼容本地服务器）运行 OpenClaw"
read_when:
  - 你想在本地 vLLM 服务器上运行 OpenClaw
  - 你想用自己的模型使用 OpenAI 兼容的 /v1 端点
title: "vLLM"
---

vLLM 可以通过 **OpenAI 兼容** HTTP API 提供开源（以及部分自定义）模型服务。OpenClaw 使用 `openai-completions` API 连接到 vLLM。

当你选择加入（设置 `VLLM_API_KEY`，任何值都可以，如果你的服务器不强制验证）且未定义显式的 `models.providers.vllm` 条目时，OpenClaw 还可以**自动发现** vLLM 中的可用模型。

OpenClaw 将 `vllm` 视为支持流式使用量核算的本地 OpenAI 兼容提供商，因此状态/上下文令牌计数可以从 `stream_options.include_usage` 响应中更新。

| 属性         | 值                                  |
| ------------ | ----------------------------------- |
| 提供商 ID    | `vllm`                              |
| API          | `openai-completions`（OpenAI 兼容） |
| 认证         | `VLLM_API_KEY` 环境变量             |
| 默认基础 URL | `http://127.0.0.1:8000/v1`          |

## 快速开始

<Steps>
  <Step title="使用 OpenAI 兼容服务器启动 vLLM">
    你的基础 URL 应暴露 `/v1` 端点（例如 `/v1/models`、`/v1/chat/completions`）。vLLM 通常运行在：

    ```
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step title="设置 API 密钥环境变量">
    如果你的服务器不强制认证，任何值都可以：

    ```bash
    export VLLM_API_KEY="vllm-local"
    ```

  </Step>
  <Step title="选择模型">
    替换为你的某个 vLLM 模型 id：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "vllm/your-model-id" },
        },
      },
    }
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider vllm
    ```
  </Step>
</Steps>

## 模型发现（隐式提供商）

当 `VLLM_API_KEY` 已设置（或存在认证配置文件）且你**未**定义 `models.providers.vllm` 时，OpenClaw 查询：

```
GET http://127.0.0.1:8000/v1/models
```

并将返回的 id 转换为模型条目。

<Note>
如果你显式设置了 `models.providers.vllm`，将跳过自动发现，你必须手动定义模型。
</Note>

## 显式配置（手动模型）

在以下情况下使用显式配置：

- vLLM 运行在不同的主机或端口上
- 你想固定 `contextWindow` 或 `maxTokens` 值
- 你的服务器需要真实 API 密钥（或你想控制请求头）
- 你连接到受信任的本地回环、局域网或 Tailscale vLLM 端点

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        request: { allowPrivateNetwork: true },
        timeoutSeconds: 300, // 可选：延长连接/请求头/正文/请求超时，适用于较慢的本地模型
        models: [
          {
            id: "your-model-id",
            name: "Local vLLM Model",
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
    vLLM 被视为代理风格的 OpenAI 兼容 `/v1` 后端，而非原生 OpenAI 端点。这意味着：

    | 行为 | 是否适用 |
    |----------|----------|
    | 原生 OpenAI 请求整形 | 否 |
    | `service_tier` | 不发送 |
    | Responses `store` | 不发送 |
    | 提示缓存提示 | 不发送 |
    | OpenAI 推理兼容负载整形 | 不适用 |
    | 隐藏 OpenClaw 归属请求头 | 自定义基础 URL 不注入 |

  </Accordion>

  <Accordion title="Qwen 思考控制">
    对于通过 vLLM 提供的 Qwen 模型，当服务器需要 Qwen chat-template kwargs 时，在模型条目上设置 `params.qwenThinkingFormat: "chat-template"`。OpenClaw 将 `/think off` 映射为：

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "preserve_thinking": true
      }
    }
    ```

    非 `off` 思考级别发送 `enable_thinking: true`。如果你的端点期望 DashScope 风格的顶层标志，请使用 `params.qwenThinkingFormat: "top-level"` 在请求根部发送 `enable_thinking`。也接受蛇形命名 `params.qwen_thinking_format`。

  </Accordion>

  <Accordion title="Nemotron 3 思考控制">
    vLLM/Nemotron 3 可以使用 chat-template kwargs 控制推理是作为隐藏推理还是可见答案文本返回。当 OpenClaw 会话使用 `vllm/nemotron-3-*` 且思考关闭时，捆绑的 vLLM 插件发送：

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "force_nonempty_content": true
      }
    }
    ```

    要自定义这些值，在模型参数下设置 `chat_template_kwargs`。如果你也设置了 `params.extra_body.chat_template_kwargs`，该值拥有最终优先权，因为 `extra_body` 是最后的请求体覆盖。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "vllm/nemotron-3-super": {
              params: {
                chat_template_kwargs: {
                  enable_thinking: false,
                  force_nonempty_content: true,
                },
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Qwen 工具调用显示为文本">
    首先确保 vLLM 以正确的工具调用解析器和模型的聊天模板启动。例如，vLLM 文档中 Qwen2.5 模型使用 `hermes`，Qwen3-Coder 模型使用 `qwen3_xml`。

    症状：

    - 技能或工具从不运行
    - 助手打印原始 JSON/XML，如 `{"name":"read","arguments":...}`
    - 当 OpenClaw 发送 `tool_choice: "auto"` 时，vLLM 返回空的 `tool_calls` 数组

    某些 Qwen/vLLM 组合仅在请求使用 `tool_choice: "required"` 时返回结构化工具调用。对于这些模型条目，使用 `params.extra_body` 强制 OpenAI 兼容请求字段：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "vllm/Qwen-Qwen2.5-Coder-32B-Instruct": {
              params: {
                extra_body: {
                  tool_choice: "required",
                },
              },
            },
          },
        },
      },
    }
    ```

    将 `Qwen-Qwen2.5-Coder-32B-Instruct` 替换为以下命令返回的确切 id：

    ```bash
    openclaw models list --provider vllm
    ```

    你也可以通过 CLI 应用相同的覆盖：

    ```bash
    openclaw config set agents.defaults.models '{"vllm/Qwen-Qwen2.5-Coder-32B-Instruct":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
    ```

    这是一个可选加入的兼容性变通方案。它使每个带工具的模型轮次都需要工具调用，因此仅对可以接受该行为的专用本地模型条目使用。不要将其用作所有 vLLM 模型的全局默认值，也不要使用将任意助手文本盲目转换为可执行工具调用的代理。

  </Accordion>

  <Accordion title="自定义基础 URL">
    如果你的 vLLM 服务器在非默认主机或端口上运行，在显式提供商配置中设置 `baseUrl`：

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:9000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            request: { allowPrivateNetwork: true },
            timeoutSeconds: 300,
            models: [
              {
                id: "my-custom-model",
                name: "Remote vLLM Model",
                reasoning: false,
                input: ["text"],
                contextWindow: 64000,
                maxTokens: 4096,
              },
            ],
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## 故障排查

<AccordionGroup>
  <Accordion title="首次响应缓慢或远程服务器超时">
    对于大型本地模型、远程局域网主机或 Tailscale 链路，设置提供商范围的请求超时：

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:8000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            request: { allowPrivateNetwork: true },
            timeoutSeconds: 300,
            models: [{ id: "your-model-id", name: "Local vLLM Model" }],
          },
        },
      },
    }
    ```

    `timeoutSeconds` 仅适用于 vLLM 模型 HTTP 请求，包括连接建立、响应头、正文流式传输和总体保护性获取中止。在增加 `agents.defaults.timeoutSeconds`（控制整个代理运行）之前，优先使用此设置。

  </Accordion>

  <Accordion title="服务器不可达">
    检查 vLLM 服务器是否正在运行且可访问：

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    如果看到连接错误，请验证主机、端口，以及 vLLM 是否以 OpenAI 兼容服务器模式启动。
    对于显式的本地回环、局域网或 Tailscale 端点，还需设置 `models.providers.vllm.request.allowPrivateNetwork: true`；默认情况下，提供商请求会阻止私有网络 URL，除非提供商被明确信任。

  </Accordion>

  <Accordion title="请求的认证错误">
    如果请求因认证错误而失败，请设置与服务器配置匹配的真实 `VLLM_API_KEY`，或在 `models.providers.vllm` 下显式配置提供商。

    <Tip>
    如果你的 vLLM 服务器不强制认证，任何非空的 `VLLM_API_KEY` 值都足以作为 OpenClaw 的选择加入信号。
    </Tip>

  </Accordion>

  <Accordion title="未发现模型">
    自动发现需要 `VLLM_API_KEY` 已设置**且**没有显式的 `models.providers.vllm` 配置条目。如果你已手动定义了提供商，OpenClaw 会跳过发现，仅使用你声明的模型。
  </Accordion>

  <Accordion title="工具显示为原始文本">
    如果 Qwen 模型打印 JSON/XML 工具语法而不是执行技能，请查看上方高级配置中的 Qwen 指南。通常的修复方法是：

    - 为该模型使用正确的解析器/模板启动 vLLM
    - 用 `openclaw models list --provider vllm` 确认确切的模型 id
    - 仅在 `tool_choice: "auto"` 仍然返回空或纯文本工具调用时才添加专用的每模型 `params.extra_body.tool_choice: "required"` 覆盖

  </Accordion>
</AccordionGroup>

<Warning>
更多帮助：[故障排查](/help/troubleshooting) 和 [常见问题解答](/help/faq)。
</Warning>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="OpenAI" href="/providers/openai" icon="bolt">
    原生 OpenAI 提供商和 OpenAI 兼容路由行为。
  </Card>
  <Card title="OAuth 和认证" href="/gateway/authentication" icon="key">
    认证详情和凭据复用规则。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常见问题及解决方案。
  </Card>
</CardGroup>
