---
summary: "SenseAudio 批量语音转文字，用于入站语音消息"
read_when:
  - 你想使用 SenseAudio 对音频附件进行语音转文字
  - 你需要 SenseAudio API 密钥环境变量或音频配置路径
title: "SenseAudio"
---

# SenseAudio

SenseAudio 可以通过 OpenClaw 的共享 `tools.media.audio` 管道转录入站音频/语音消息附件。OpenClaw 将多部分音频发送到 OpenAI 兼容的转录端点，并将返回的文本注入为 `{{Transcript}}` 加上 `[Audio]` 块。

| 详情     | 值                                               |
| -------- | ------------------------------------------------ |
| 网站     | [senseaudio.cn](https://senseaudio.cn)           |
| 文档     | [senseaudio.cn/docs](https://senseaudio.cn/docs) |
| 认证     | `SENSEAUDIO_API_KEY`                             |
| 默认模型 | `senseaudio-asr-pro-1.5-260319`                  |
| 默认 URL | `https://api.senseaudio.cn/v1`                   |

## 快速开始

<Steps>
  <Step title="设置 API 密钥">
    ```bash
    export SENSEAUDIO_API_KEY="..."
    ```
  </Step>
  <Step title="启用音频提供商">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [{ provider: "senseaudio", model: "senseaudio-asr-pro-1.5-260319" }],
          },
        },
      },
    }
    ```
  </Step>
  <Step title="发送语音消息">
    通过任意连接的频道发送音频消息。OpenClaw 会将音频上传至 SenseAudio，并在回复管道中使用转录文本。
  </Step>
</Steps>

## 选项

| 选项       | 路径                                  | 说明                       |
| ---------- | ------------------------------------- | -------------------------- |
| `model`    | `tools.media.audio.models[].model`    | SenseAudio ASR 模型 id     |
| `language` | `tools.media.audio.models[].language` | 可选语言提示               |
| `prompt`   | `tools.media.audio.prompt`            | 可选转录提示               |
| `baseUrl`  | `tools.media.audio.baseUrl` 或模型    | 覆盖 OpenAI 兼容的基础地址 |
| `headers`  | `tools.media.audio.request.headers`   | 额外请求头                 |

<Note>
SenseAudio 在 OpenClaw 中仅支持批量 STT。语音通话实时转录继续使用支持流式 STT 的提供商。
</Note>
