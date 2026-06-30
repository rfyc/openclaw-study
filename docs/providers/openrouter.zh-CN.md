---
summary: "在 OpenClaw 中使用 OpenRouter 的统一 API 访问众多模型"
read_when:
  - 你想用一个 API 密钥访问多个 LLM
  - 你想通过 OpenRouter 在 OpenClaw 中运行模型
  - 你想使用 OpenRouter 进行图像生成
  - 你想使用 OpenRouter 进行视频生成
title: "OpenRouter"
---

OpenRouter 提供一个**统一 API**，通过单一端点和 API 密钥将请求路由到众多模型。它兼容 OpenAI，因此大多数 OpenAI SDK 只需切换基础 URL 即可使用。

## 快速开始

<Steps>
  <Step title="获取 API 密钥">
    在 [openrouter.ai/keys](https://openrouter.ai/keys) 创建 API 密钥。
  </Step>
  <Step title="运行引导程序">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="（可选）切换到特定模型">
    引导程序默认使用 `openrouter/auto`。之后可以选择具体的模型：

    ```bash
    openclaw models set openrouter/<provider>/<model>
    ```

  </Step>
</Steps>

## 配置示例

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/auto" },
    },
  },
}
```

## 模型引用

<Note>
模型引用遵循 `openrouter/<provider>/<model>` 格式。有关可用提供商和模型的完整列表，请参见 [/concepts/model-providers](/concepts/model-providers)。
</Note>

捆绑的备用示例：

| 模型引用                          | 说明                         |
| --------------------------------- | ---------------------------- |
| `openrouter/auto`                 | OpenRouter 自动路由          |
| `openrouter/moonshotai/kimi-k2.6` | 通过 MoonshotAI 的 Kimi K2.6 |

## 图像生成

OpenRouter 还可以支持 `image_generate` 工具。在 `agents.defaults.imageGenerationModel` 下使用 OpenRouter 图像模型：

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openrouter/google/gemini-3.1-flash-image-preview",
        timeoutMs: 180_000,
      },
    },
  },
}
```

OpenClaw 使用 `modalities: ["image", "text"]` 将图像请求发送到 OpenRouter 的聊天补全图像 API。Gemini 图像模型通过 OpenRouter 的 `image_config` 接收支持的 `aspectRatio` 和 `resolution` 提示。对于较慢的 OpenRouter 图像模型，使用 `agents.defaults.imageGenerationModel.timeoutMs`；`image_generate` 工具的每次调用 `timeoutMs` 参数仍然优先。

## 视频生成

OpenRouter 还可以通过其异步 `/videos` API 支持 `video_generate` 工具。在 `agents.defaults.videoGenerationModel` 下使用 OpenRouter 视频模型：

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "openrouter/google/veo-3.1-fast",
      },
    },
  },
}
```

OpenClaw 向 OpenRouter 提交文本转视频和图像转视频作业，轮询返回的 `polling_url`，并从 OpenRouter 的 `unsigned_urls` 或已记录的作业内容端点下载完成的视频。参考图像默认作为首帧/末帧图像发送；标有 `reference_image` 的图像作为 OpenRouter 输入引用发送。捆绑的 `google/veo-3.1-fast` 默认声明当前支持的 4/6/8 秒时长、`720P`/`1080P` 分辨率和 `16:9`/`9:16` 宽高比。由于上游视频生成 API 目前仅接受文本和图像引用，视频转视频未为 OpenRouter 注册。

## 文本转语音

OpenRouter 还可以通过其 OpenAI 兼容的 `/audio/speech` 端点用作 TTS 提供商。

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openrouter",
      providers: {
        openrouter: {
          model: "hexgrad/kokoro-82m",
          voice: "af_alloy",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```

如果省略 `messages.tts.providers.openrouter.apiKey`，TTS 会复用 `models.providers.openrouter.apiKey`，然后是 `OPENROUTER_API_KEY`。

## 认证和请求头

OpenRouter 在后台使用带有 API 密钥的 Bearer 令牌。

对于真实 OpenRouter 请求（`https://openrouter.ai/api/v1`），OpenClaw 还会添加 OpenRouter 文档中的应用归属请求头：

| 请求头                    | 值                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `HTTP-Referer`            | `https://openclaw.ai`                                                                                  |
| `X-OpenRouter-Title`      | `OpenClaw`                                                                                             |
| `X-OpenRouter-Categories` | `cli-agent,cloud-agent,programming-app,creative-writing,writing-assistant,general-chat,personal-agent` |

<Warning>
如果你将 OpenRouter 提供商重新指向其他代理或基础 URL，OpenClaw **不会**注入这些 OpenRouter 特有的请求头或 Anthropic 缓存标记。
</Warning>

## 高级配置

<AccordionGroup>
  <Accordion title="响应缓存">
    OpenRouter 响应缓存是可选启用的。使用模型参数为每个 OpenRouter 模型启用它：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openrouter/auto": {
              params: {
                responseCache: true,
                responseCacheTtlSeconds: 300,
              },
            },
          },
        },
      },
    }
    ```

    OpenClaw 发送 `X-OpenRouter-Cache: true`，配置时还发送 `X-OpenRouter-Cache-TTL`。`responseCacheClear: true` 会强制刷新当前请求并存储替换响应。也接受蛇形命名别名（`response_cache`、`response_cache_ttl_seconds` 和 `response_cache_clear`）。

    这与提供商提示缓存和 OpenRouter 的 Anthropic `cache_control` 标记是分开的。它仅应用于经过验证的 `openrouter.ai` 路由，不适用于自定义代理基础 URL。

  </Accordion>

  <Accordion title="Anthropic 缓存标记">
    在经过验证的 OpenRouter 路由上，Anthropic 模型引用保留 OpenRouter 特有的 Anthropic `cache_control` 标记，OpenClaw 将其用于系统/开发者提示块的更好提示缓存复用。
  </Accordion>

  <Accordion title="Anthropic 推理预填充">
    在经过验证的 OpenRouter 路由上，启用推理的 Anthropic 模型引用在请求到达 OpenRouter 之前会删除末尾的助手预填充轮次，以符合 Anthropic 关于推理对话以用户轮次结束的要求。
  </Accordion>

  <Accordion title="思考/推理注入">
    在支持的非 `auto` 路由上，OpenClaw 将选定的思考级别映射到 OpenRouter 代理推理负载。不支持的模型提示和 `openrouter/auto` 会跳过该推理注入。Hunter Alpha 也会跳过已配置的过时模型引用的代理推理，因为 OpenRouter 可能会在推理字段中为该已退役路由返回最终答案文本。
  </Accordion>

  <Accordion title="DeepSeek V4 推理重放">
    在经过验证的 OpenRouter 路由上，`openrouter/deepseek/deepseek-v4-flash` 和 `openrouter/deepseek/deepseek-v4-pro` 在重放的助手轮次上填充缺失的 `reasoning_content`，使思考/工具对话保持 DeepSeek V4 所需的后续形态。
  </Accordion>

  <Accordion title="仅 OpenAI 请求整形">
    OpenRouter 仍然通过代理风格的 OpenAI 兼容路径运行，因此不会转发仅 OpenAI 的请求整形，例如 `serviceTier`、Responses `store`、OpenAI 推理兼容负载和提示缓存提示。
  </Accordion>

  <Accordion title="Gemini 支持的路由">
    Gemini 支持的 OpenRouter 引用保留在代理 Gemini 路径上：OpenClaw 在那里保留 Gemini 思考签名净化，但不启用原生 Gemini 重放验证或引导重写。
  </Accordion>

  <Accordion title="提供商路由元数据">
    如果你在模型参数下传递 OpenRouter 提供商路由，OpenClaw 会在共享流包装器运行之前将其作为 OpenRouter 路由元数据转发。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>
