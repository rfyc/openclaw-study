---
summary: "在 OpenClaw 中使用 ElevenLabs 语音合成、Scribe 语音转文本和实时转录"
read_when:
  - 您想在 OpenClaw 中使用 ElevenLabs 文本转语音
  - 您想使用 ElevenLabs Scribe 语音转文本处理音频附件
  - 您想使用 ElevenLabs 实时转录用于语音通话或 Google Meet
title: "ElevenLabs"
---

OpenClaw 使用 ElevenLabs 进行文本转语音、使用 Scribe v2 进行批量语音转文本，以及使用 Scribe v2 Realtime 进行流式语音转文本。

| 功能           | OpenClaw 接口                                                   | 默认值                   |
| -------------- | --------------------------------------------------------------- | ------------------------ |
| 文本转语音     | `messages.tts` / `talk`                                         | `eleven_multilingual_v2` |
| 批量语音转文本 | `tools.media.audio`                                             | `scribe_v2`              |
| 流式语音转文本 | 语音通话流式传输或 Google Meet `realtime.transcriptionProvider` | `scribe_v2_realtime`     |

## 认证

在环境中设置 `ELEVENLABS_API_KEY`。为了与现有 ElevenLabs 工具兼容，也接受 `XI_API_KEY`。

```bash
export ELEVENLABS_API_KEY="..."
```

## 文本转语音

```json5
{
  messages: {
    tts: {
      providers: {
        elevenlabs: {
          apiKey: "${ELEVENLABS_API_KEY}",
          voiceId: "pMsXgVXv3BLzUgSXRplE",
          modelId: "eleven_multilingual_v2",
        },
      },
    },
  },
}
```

将 `modelId` 设置为 `eleven_v3` 可使用 ElevenLabs v3 TTS。OpenClaw 对现有安装保持 `eleven_multilingual_v2` 作为默认值。

## 语音转文本

使用 Scribe v2 处理入站音频附件和短录制语音片段：

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "elevenlabs", model: "scribe_v2" }],
      },
    },
  },
}
```

OpenClaw 以 `model_id: "scribe_v2"` 向 ElevenLabs `/v1/speech-to-text` 发送多部分音频。存在语言提示时映射到 `language_code`。

## 流式语音转文本

内置的 `elevenlabs` 插件为语音通话和 Google Meet 代理模式流式转录注册了 Scribe v2 Realtime。

| 设置     | 配置路径                                                                  | 默认值                                     |
| -------- | ------------------------------------------------------------------------- | ------------------------------------------ |
| API 密钥 | `plugins.entries.voice-call.config.streaming.providers.elevenlabs.apiKey` | 回退到 `ELEVENLABS_API_KEY` / `XI_API_KEY` |
| 模型     | `...elevenlabs.modelId`                                                   | `scribe_v2_realtime`                       |
| 音频格式 | `...elevenlabs.audioFormat`                                               | `ulaw_8000`                                |
| 采样率   | `...elevenlabs.sampleRate`                                                | `8000`                                     |
| 提交策略 | `...elevenlabs.commitStrategy`                                            | `vad`                                      |
| 语言     | `...elevenlabs.languageCode`                                              | （未设置）                                 |

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "elevenlabs",
            providers: {
              elevenlabs: {
                apiKey: "${ELEVENLABS_API_KEY}",
                audioFormat: "ulaw_8000",
                commitStrategy: "vad",
                languageCode: "en",
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
语音通话以 8 kHz G.711 u-law 格式接收 Twilio 媒体。ElevenLabs 实时提供商默认使用 `ulaw_8000`，因此电话帧可以无需转码直接转发。
</Note>

对于 Google Meet 代理模式，将 `plugins.entries.google-meet.config.realtime.transcriptionProvider` 设置为 `"elevenlabs"`，并在 `plugins.entries.google-meet.config.realtime.providers.elevenlabs` 下配置相同的提供商块。

## 相关链接

- [文本转语音](/tools/tts)
- [Google Meet](/plugins/google-meet)
- [模型选择](/concepts/model-providers)
