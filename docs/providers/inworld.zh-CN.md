---
summary: "用于 OpenClaw 回复的 Inworld 流式文本转语音"
read_when:
  - 您想使用 Inworld 语音合成外发回复
  - 您需要 Inworld 的 PCM 电话通信或 OGG_OPUS 语音备注输出
title: "Inworld"
---

Inworld 是一个流式文本转语音（TTS）提供商。在 OpenClaw 中，它将外发回复音频合成为 MP3（默认）或语音备注的 OGG_OPUS，以及电话通信频道（如语音通话）的 PCM 音频。

OpenClaw 向 Inworld 的流式 TTS 端点发送请求，将返回的 base64 音频块连接成单个缓冲区，然后传递给标准回复音频管道。

| 详情     | 值                                                         |
| -------- | ---------------------------------------------------------- |
| 网站     | [inworld.ai](https://inworld.ai)                           |
| 文档     | [docs.inworld.ai/tts/tts](https://docs.inworld.ai/tts/tts) |
| 认证     | `INWORLD_API_KEY`（HTTP Basic，Base64 控制台凭据）         |
| 默认语音 | `Sarah`                                                    |
| 默认模型 | `inworld-tts-1.5-max`                                      |

## 快速开始

<Steps>
  <Step title="设置 API 密钥">
    从您的 Inworld 控制台（工作区 > API Keys）复制凭据，并将其设置为环境变量。该值作为 HTTP Basic 凭据直接发送，请不要再次进行 Base64 编码，也不要将其转换为 Bearer token。

    ```
    INWORLD_API_KEY=<base64-credential-from-dashboard>
    ```

  </Step>
  <Step title="在 messages.tts 中选择 Inworld">
    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "inworld",
          providers: {
            inworld: {
              voiceId: "Sarah",
              modelId: "inworld-tts-1.5-max",
            },
          },
        },
      },
    }
    ```
  </Step>
  <Step title="发送消息">
    通过任何已连接的频道发送回复。OpenClaw 使用 Inworld 合成音频，并以 MP3 格式传递（当频道期望语音备注时以 OGG_OPUS 传递）。
  </Step>
</Steps>

## 配置选项

| 选项          | 路径                                         | 描述                                                         |
| ------------- | -------------------------------------------- | ------------------------------------------------------------ |
| `apiKey`      | `messages.tts.providers.inworld.apiKey`      | Base64 控制台凭据。回退到 `INWORLD_API_KEY`。                |
| `baseUrl`     | `messages.tts.providers.inworld.baseUrl`     | 覆盖 Inworld API 基础 URL（默认 `https://api.inworld.ai`）。 |
| `voiceId`     | `messages.tts.providers.inworld.voiceId`     | 语音标识符（默认 `Sarah`）。                                 |
| `modelId`     | `messages.tts.providers.inworld.modelId`     | TTS 模型 ID（默认 `inworld-tts-1.5-max`）。                  |
| `temperature` | `messages.tts.providers.inworld.temperature` | 采样温度 `0..2`（可选）。                                    |

## 说明

<AccordionGroup>
  <Accordion title="认证">
    Inworld 使用 HTTP Basic 认证，采用单个 Base64 编码的凭据字符串。请从 Inworld 控制台原封不动地复制它。提供商以 `Authorization: Basic <apiKey>` 的形式发送，无需进一步编码，请不要自行进行 Base64 编码，也不要传递 Bearer 风格的 token。请参见 [TTS 认证说明](/tools/tts#inworld-primary)中的相同提示。
  </Accordion>
  <Accordion title="模型">
    支持的模型 ID：`inworld-tts-1.5-max`（默认）、`inworld-tts-1.5-mini`、`inworld-tts-1-max`、`inworld-tts-1`。
  </Accordion>
  <Accordion title="音频输出">
    回复默认使用 MP3。当频道目标为 `voice-note` 时，OpenClaw 向 Inworld 请求 `OGG_OPUS`，使音频以原生语音气泡形式播放。电话通信合成使用原始 `PCM` 在 22050 Hz 下馈送电话通信桥接。
  </Accordion>
  <Accordion title="自定义端点">
    使用 `messages.tts.providers.inworld.baseUrl` 覆盖 API 主机。发送请求前会去掉尾部斜杠。
  </Accordion>
</AccordionGroup>

## 相关链接

<CardGroup cols={2}>
  <Card title="文本转语音" href="/tools/tts" icon="waveform-lines">
    TTS 概述、提供商和 `messages.tts` 配置。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    包含 `messages.tts` 设置的完整配置参考。
  </Card>
  <Card title="提供商" href="/providers" icon="grid">
    所有内置 OpenClaw 提供商。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
</CardGroup>
