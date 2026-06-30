---
summary: "在 OpenClaw 中使用 Mistral 模型和 Voxtral 转录"
read_when:
  - 你想在 OpenClaw 中使用 Mistral 模型
  - 你想使用 Voxtral 实时转录功能进行语音通话
  - 你需要 Mistral API 密钥引导和模型引用
title: "Mistral"
---

OpenClaw 支持 Mistral 用于文本/图像模型路由（`mistral/...`）以及通过媒体理解中的 Voxtral 进行音频转录。Mistral 也可用于记忆嵌入（`memorySearch.provider = "mistral"`）。

- 提供商：`mistral`
- 认证：`MISTRAL_API_KEY`
- API：Mistral Chat Completions（`https://api.mistral.ai/v1`）

## 快速开始

<Steps>
  <Step title="获取 API 密钥">
    在 [Mistral 控制台](https://console.mistral.ai/)创建 API 密钥。
  </Step>
  <Step title="运行引导程序">
    ```bash
    openclaw onboard --auth-choice mistral-api-key
    ```

    或直接传入密钥：

    ```bash
    openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
    ```

  </Step>
  <Step title="设置默认模型">
    ```json5
    {
      env: { MISTRAL_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
    }
    ```
  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider mistral
    ```
  </Step>
</Steps>

## 内置 LLM 目录

OpenClaw 目前内置了以下 Mistral 目录：

| 模型引用                         | 输入类型   | 上下文  | 最大输出 | 备注                                                    |
| -------------------------------- | ---------- | ------- | -------- | ------------------------------------------------------- |
| `mistral/mistral-large-latest`   | 文本、图像 | 262,144 | 16,384   | 默认模型                                                |
| `mistral/mistral-medium-2508`    | 文本、图像 | 262,144 | 8,192    | Mistral Medium 3.1                                      |
| `mistral/mistral-small-latest`   | 文本、图像 | 128,000 | 16,384   | Mistral Small 4；通过 API `reasoning_effort` 可调节推理 |
| `mistral/pixtral-large-latest`   | 文本、图像 | 128,000 | 32,768   | Pixtral                                                 |
| `mistral/codestral-latest`       | 文本       | 256,000 | 4,096    | 编程                                                    |
| `mistral/devstral-medium-latest` | 文本       | 262,144 | 32,768   | Devstral 2                                              |
| `mistral/magistral-small`        | 文本       | 128,000 | 40,000   | 启用推理                                                |

## 音频转录（Voxtral）

通过媒体理解流水线使用 Voxtral 进行批量音频转录。

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}
```

<Tip>
媒体转录路径使用 `/v1/audio/transcriptions`。Mistral 的默认音频模型是 `voxtral-mini-latest`。
</Tip>

## 语音通话流式 STT

捆绑的 `mistral` 插件将 Voxtral Realtime 注册为语音通话流式 STT 提供商。

| 设置     | 配置路径                                                               | 默认值                                  |
| -------- | ---------------------------------------------------------------------- | --------------------------------------- |
| API 密钥 | `plugins.entries.voice-call.config.streaming.providers.mistral.apiKey` | 回退到 `MISTRAL_API_KEY`                |
| 模型     | `...mistral.model`                                                     | `voxtral-mini-transcribe-realtime-2602` |
| 编码     | `...mistral.encoding`                                                  | `pcm_mulaw`                             |
| 采样率   | `...mistral.sampleRate`                                                | `8000`                                  |
| 目标延迟 | `...mistral.targetStreamingDelayMs`                                    | `800`                                   |

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "mistral",
            providers: {
              mistral: {
                apiKey: "${MISTRAL_API_KEY}",
                targetStreamingDelayMs: 800,
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>
OpenClaw 默认将 Mistral 实时 STT 设置为 8kHz 的 `pcm_mulaw`，这样语音通话可以直接转发 Twilio 媒体帧。仅当上游流已经是原始 PCM 时，才使用 `encoding: "pcm_s16le"` 和匹配的 `sampleRate`。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="可调节推理（mistral-small-latest）">
    `mistral/mistral-small-latest` 对应 Mistral Small 4，支持通过 Chat Completions API 的 `reasoning_effort` 参数进行[可调节推理](https://docs.mistral.ai/capabilities/reasoning/adjustable)（`none` 将输出中的额外思考降到最低；`high` 在最终回答前展示完整的思考过程）。

    OpenClaw 将会话**思考**级别映射到 Mistral 的 API：

    | OpenClaw 思考级别                          | Mistral `reasoning_effort` |
    | ------------------------------------------------ | -------------------------- |
    | **off** / **minimal**                            | `none`                     |
    | **low** / **medium** / **high** / **xhigh** / **adaptive** / **max** | `high`     |

    <Note>
    其他捆绑的 Mistral 目录模型不使用此参数。当你需要 Mistral 的原生推理优先行为时，请继续使用 `magistral-*` 模型。
    </Note>

  </Accordion>

  <Accordion title="记忆嵌入">
    Mistral 可通过 `/v1/embeddings` 提供记忆嵌入（默认模型：`mistral-embed`）。

    ```json5
    {
      memorySearch: { provider: "mistral" },
    }
    ```

  </Accordion>

  <Accordion title="认证和基础 URL">
    - Mistral 认证使用 `MISTRAL_API_KEY`。
    - 提供商基础 URL 默认为 `https://api.mistral.ai/v1`。
    - 引导程序默认模型为 `mistral/mistral-large-latest`。
    - Z.AI 使用 Bearer 认证加上你的 API 密钥。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="媒体理解" href="/nodes/media-understanding" icon="microphone">
    音频转录设置和提供商选择。
  </Card>
</CardGroup>
