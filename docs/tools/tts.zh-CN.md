---
summary: "出站回复的文字转语音——提供商、角色、slash 命令和每频道输出"
read_when:
  - 为回复启用文字转语音
  - 配置 TTS 提供商、回退链或角色
  - 使用 /tts 命令或指令
title: "文字转语音"
sidebarTitle: "文字转语音（TTS）"
---

OpenClaw 可以通过 **14 个语音提供商** 将出站回复转换为音频，并在 Feishu、Matrix、Telegram 和 WhatsApp 上发送原生语音消息，在其他地方发送音频附件，以及为电话和 Talk 发送 PCM/Ulaw 流。

## 快速开始

<Steps>
  <Step title="选择提供商">
    OpenAI 和 ElevenLabs 是最可靠的托管选项。Microsoft 和
    Local CLI 无需 API 密钥。查看[提供商矩阵](#supported-providers)
    了解完整列表。
  </Step>
  <Step title="设置 API 密钥">
    为你的提供商导出环境变量（例如 `OPENAI_API_KEY`、
    `ELEVENLABS_API_KEY`）。Microsoft 和 Local CLI 不需要密钥。
  </Step>
  <Step title="在配置中启用">
    设置 `messages.tts.auto: "always"` 和 `messages.tts.provider`：

    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "elevenlabs",
        },
      },
    }
    ```

  </Step>
  <Step title="在聊天中试用">
    `/tts status` 显示当前状态。`/tts audio Hello from OpenClaw`
    发送一次性音频回复。
  </Step>
</Steps>

<Note>
Auto-TTS 默认**关闭**。当 `messages.tts.provider` 未设置时，
OpenClaw 按注册表自动选择顺序选取第一个已配置的提供商。
内置的 `tts` 代理工具仅限明确意图：除非用户要求音频、使用 `/tts` 或启用 Auto-TTS/指令
语音，否则普通聊天保持文本。
</Note>

## 支持的提供商

| 提供商            | 认证                                                                                                            | 备注                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Azure Speech**  | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`（也支持 `AZURE_SPEECH_API_KEY`、`SPEECH_KEY`、`SPEECH_REGION`）      | 原生 Ogg/Opus 语音便条输出和电话。                                   |
| **DeepInfra**     | `DEEPINFRA_API_KEY`                                                                                             | OpenAI 兼容的 TTS。默认为 `hexgrad/Kokoro-82M`。                     |
| **ElevenLabs**    | `ELEVENLABS_API_KEY` 或 `XI_API_KEY`                                                                            | 语音克隆、多语言、通过 `seed` 确定性。                               |
| **Google Gemini** | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                                                                            | Gemini API TTS；通过 `promptTemplate: "audio-profile-v1"` 感知角色。 |
| **Gradium**       | `GRADIUM_API_KEY`                                                                                               | 语音便条和电话输出。                                                 |
| **Inworld**       | `INWORLD_API_KEY`                                                                                               | 流式 TTS API。原生 Opus 语音便条和 PCM 电话。                        |
| **Local CLI**     | 无                                                                                                              | 运行已配置的本地 TTS 命令。                                          |
| **Microsoft**     | 无                                                                                                              | 通过 `node-edge-tts` 的公共 Edge 神经 TTS。尽力而为，无 SLA。        |
| **MiniMax**       | `MINIMAX_API_KEY`（或 Token Plan：`MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`）    | T2A v2 API。默认为 `speech-2.8-hd`。                                 |
| **OpenAI**        | `OPENAI_API_KEY`                                                                                                | 也用于自动摘要；支持角色 `instructions`。                            |
| **OpenRouter**    | `OPENROUTER_API_KEY`（可复用 `models.providers.openrouter.apiKey`）                                             | 默认模型 `hexgrad/kokoro-82m`。                                      |
| **Volcengine**    | `VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY`（旧版 AppID/token：`VOLCENGINE_TTS_APPID`/`_TOKEN`） | BytePlus Seed Speech HTTP API。                                      |
| **Vydra**         | `VYDRA_API_KEY`                                                                                                 | 共享图像、视频和语音提供商。                                         |
| **xAI**           | `XAI_API_KEY`                                                                                                   | xAI 批量 TTS。**不**支持原生 Opus 语音便条输出。                     |
| **Xiaomi MiMo**   | `XIAOMI_API_KEY`                                                                                                | 通过小米聊天补全的 MiMo TTS。                                        |

如果配置了多个提供商，优先使用选定的提供商，其他作为回退选项。自动摘要使用 `summaryModel`（或 `agents.defaults.model.primary`），因此如果你保持摘要启用，该提供商也必须经过认证。

<Warning>
内置的 **Microsoft** 提供商通过 `node-edge-tts` 使用 Microsoft Edge 的在线神经 TTS
服务。这是一个没有已发布 SLA 或配额的公共 Web 服务——请视其为尽力而为。旧版提供商 id `edge` 被规范化为 `microsoft`，`openclaw doctor --fix` 会重写持久化配置；新配置应始终使用 `microsoft`。
</Warning>

## 配置

TTS 配置位于 `~/.openclaw/openclaw.json` 中的 `messages.tts` 下。选择一个预设并调整提供商块：

<Tabs>
  <Tab title="Azure Speech">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "azure-speech",
      providers: {
        "azure-speech": {
          apiKey: "${AZURE_SPEECH_KEY}",
          region: "eastus",
          voice: "en-US-JennyNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
          voiceNoteOutputFormat: "ogg-24khz-16bit-mono-opus",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="ElevenLabs">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "elevenlabs",
      providers: {
        elevenlabs: {
          apiKey: "${ELEVENLABS_API_KEY}",
          model: "eleven_multilingual_v2",
          voiceId: "EXAVITQu4vr4xnSDxMaL",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Google Gemini">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "google",
      providers: {
        google: {
          apiKey: "${GEMINI_API_KEY}",
          model: "gemini-3.1-flash-tts-preview",
          voiceName: "Kore",
          // 可选的自然语言风格提示：
          // audioProfile: "Speak in a calm, podcast-host tone.",
          // speakerName: "Alex",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Gradium">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "gradium",
      providers: {
        gradium: {
          apiKey: "${GRADIUM_API_KEY}",
          voiceId: "YTpq7expH9539ERJ",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Inworld">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "inworld",
      providers: {
        inworld: {
          apiKey: "${INWORLD_API_KEY}",
          modelId: "inworld-tts-1.5-max",
          voiceId: "Sarah",
          temperature: 0.7,
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Local CLI">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "tts-local-cli",
      providers: {
        "tts-local-cli": {
          command: "say",
          args: ["-o", "{{OutputPath}}", "{{Text}}"],
          outputFormat: "wav",
          timeoutMs: 120000,
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Microsoft（无密钥）">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "microsoft",
      providers: {
        microsoft: {
          enabled: true,
          voice: "en-US-MichelleNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
          rate: "+0%",
          pitch: "+0%",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="MiniMax">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "minimax",
      providers: {
        minimax: {
          apiKey: "${MINIMAX_API_KEY}",
          model: "speech-2.8-hd",
          voiceId: "English_expressive_narrator",
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="OpenAI + ElevenLabs">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openai",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: { enabled: true },
      providers: {
        openai: {
          apiKey: "${OPENAI_API_KEY}",
          model: "gpt-4o-mini-tts",
          voice: "alloy",
        },
        elevenlabs: {
          apiKey: "${ELEVENLABS_API_KEY}",
          model: "eleven_multilingual_v2",
          voiceId: "EXAVITQu4vr4xnSDxMaL",
          voiceSettings: { stability: 0.5, similarityBoost: 0.75, style: 0.0, useSpeakerBoost: true, speed: 1.0 },
          applyTextNormalization: "auto",
          languageCode: "en",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="OpenRouter">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openrouter",
      providers: {
        openrouter: {
          apiKey: "${OPENROUTER_API_KEY}",
          model: "hexgrad/kokoro-82m",
          voice: "af_alloy",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Volcengine">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "volcengine",
      providers: {
        volcengine: {
          apiKey: "${VOLCENGINE_TTS_API_KEY}",
          resourceId: "seed-tts-1.0",
          voice: "en_female_anna_mars_bigtts",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="xAI">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xai",
      providers: {
        xai: {
          apiKey: "${XAI_API_KEY}",
          voiceId: "eve",
          language: "en",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Xiaomi MiMo">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xiaomi",
      providers: {
        xiaomi: {
          apiKey: "${XIAOMI_API_KEY}",
          model: "mimo-v2.5-tts",
          voice: "mimo_default",
          format: "mp3",
        },
      },
    },
  },
}
```
  </Tab>
</Tabs>

### 每代理语音覆盖

当一个代理需要使用不同的提供商、声音、模型、角色或 auto-TTS 模式时，使用 `agents.list[].tts`。代理块会深度合并到 `messages.tts` 上，因此提供商凭据可以保留在全局提供商配置中：

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "elevenlabs",
      providers: {
        elevenlabs: { apiKey: "${ELEVENLABS_API_KEY}", model: "eleven_multilingual_v2" },
      },
    },
  },
  agents: {
    list: [
      {
        id: "reader",
        tts: {
          providers: {
            elevenlabs: { voiceId: "EXAVITQu4vr4xnSDxMaL" },
          },
        },
      },
    ],
  },
}
```

要固定每代理角色，在提供商配置旁边设置 `agents.list[].tts.persona`——它仅针对该代理覆盖全局 `messages.tts.persona`。

自动回复、`/tts audio`、`/tts status` 和 `tts` 代理工具的优先级顺序：

1. `messages.tts`
2. 活动的 `agents.list[].tts`
3. 频道覆盖，当频道支持 `channels.<channel>.tts` 时
4. 账户覆盖，当频道传递 `channels.<channel>.accounts.<id>.tts` 时
5. 此主机的本地 `/tts` 偏好
6. 启用[模型覆盖](#model-driven-directives)时的内联 `[[tts:...]]` 指令

频道和账户覆盖使用与 `messages.tts` 相同的形状并深度合并到前面的层上，因此共享的提供商凭据可以保留在 `messages.tts` 中，而频道或机器人账户只更改声音、模型、角色或自动模式：

```json5
{
  messages: {
    tts: {
      provider: "openai",
      providers: {
        openai: { apiKey: "${OPENAI_API_KEY}", model: "gpt-4o-mini-tts" },
      },
    },
  },
  channels: {
    feishu: {
      accounts: {
        english: {
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
        },
      },
    },
  },
}
```

## 角色

**角色**是一种稳定的语音身份，可以跨提供商确定性地应用。它可以偏好一个提供商、定义提供商中立的提示意图，并携带提供商特定的语音、模型、提示模板、种子和语音设置绑定。

### 最简角色

```json5
{
  messages: {
    tts: {
      auto: "always",
      persona: "narrator",
      personas: {
        narrator: {
          label: "Narrator",
          provider: "elevenlabs",
          providers: {
            elevenlabs: { voiceId: "EXAVITQu4vr4xnSDxMaL", modelId: "eleven_multilingual_v2" },
          },
        },
      },
    },
  },
}
```

### 完整角色（提供商中立提示）

```json5
{
  messages: {
    tts: {
      auto: "always",
      persona: "alfred",
      personas: {
        alfred: {
          label: "Alfred",
          description: "Dry, warm British butler narrator.",
          provider: "google",
          fallbackPolicy: "preserve-persona",
          prompt: {
            profile: "A brilliant British butler. Dry, witty, warm, charming, emotionally expressive, never generic.",
            scene: "A quiet late-night study. Close-mic narration for a trusted operator.",
            sampleContext: "The speaker is answering a private technical request with concise confidence and dry warmth.",
            style: "Refined, understated, lightly amused.",
            accent: "British English.",
            pacing: "Measured, with short dramatic pauses.",
            constraints: ["Do not read configuration values aloud.", "Do not explain the persona."],
          },
          providers: {
            google: {
              model: "gemini-3.1-flash-tts-preview",
              voiceName: "Algieba",
              promptTemplate: "audio-profile-v1",
            },
            openai: { model: "gpt-4o-mini-tts", voice: "cedar" },
            elevenlabs: {
              voiceId: "voice_id",
              modelId: "eleven_multilingual_v2",
              seed: 42,
              voiceSettings: {
                stability: 0.65,
                similarityBoost: 0.8,
                style: 0.25,
                useSpeakerBoost: true,
                speed: 0.95,
              },
            },
          },
        },
      },
    },
  },
}
```

### 角色解析

活动角色以确定性方式选择：

1. `/tts persona <id>` 本地偏好，如果已设置。
2. `messages.tts.persona`，如果已设置。
3. 无角色。

提供商选择按显式优先运行：

1. 直接覆盖（CLI、gateway、Talk、允许的 TTS 指令）。
2. `/tts provider <id>` 本地偏好。
3. 活动角色的 `provider`。
4. `messages.tts.provider`。
5. 注册表自动选择。

对于每次提供商尝试，OpenClaw 按此顺序合并配置：

1. `messages.tts.providers.<id>`
2. `messages.tts.personas.<persona>.providers.<id>`
3. 可信请求覆盖
4. 允许的模型发出的 TTS 指令覆盖

### 提供商如何使用角色提示

角色提示字段（`profile`、`scene`、`sampleContext`、`style`、`accent`、`pacing`、`constraints`）是**提供商中立的**。每个提供商决定如何使用它们：

<AccordionGroup>
  <Accordion title="Google Gemini">
    **仅当**有效的 Google 提供商配置设置了 `promptTemplate: "audio-profile-v1"`
    或 `personaPrompt` 时，才将角色提示字段包装到 Gemini TTS 提示结构中。旧版 `audioProfile` 和 `speakerName` 字段仍然作为 Google 特定提示文本前置。`[[tts:text]]` 块内的内联音频标签（如 `[whispers]` 或 `[laughs]`）会保留在 Gemini 转录本中；OpenClaw 不生成这些标签。
  </Accordion>
  <Accordion title="OpenAI">
    **仅当**没有配置显式 OpenAI `instructions` 时，才将角色提示字段映射到请求 `instructions` 字段。显式 `instructions` 始终优先。
  </Accordion>
  <Accordion title="其他提供商">
    仅使用 `personas.<id>.providers.<provider>` 下的提供商特定角色绑定。除非提供商实现了自己的角色提示映射，否则角色提示字段被忽略。
  </Accordion>
</AccordionGroup>

### 回退策略

`fallbackPolicy` 控制当角色对尝试的提供商**没有绑定**时的行为：

| 策略                | 行为                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `preserve-persona`  | **默认。** 提供商中立的提示字段保持可用；提供商可以使用它们或忽略它们。                                 |
| `provider-defaults` | 该尝试中角色从提示准备中省略；提供商使用其中性默认值，同时继续回退到其他提供商。                        |
| `fail`              | 以 `reasonCode: "not_configured"` 和 `personaBinding: "missing"` 跳过该提供商尝试。仍然尝试回退提供商。 |

仅当**每个**尝试的提供商都被跳过或失败时，整个 TTS 请求才会失败。

## 模型驱动指令

默认情况下，助手**可以**发出 `[[tts:...]]` 指令来覆盖单次回复的语音、模型或速度，以及可选的 `[[tts:text]]...[[/tts:text]]` 块，用于应仅出现在音频中的富有表现力的提示：

```text
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

当 `messages.tts.auto` 为 `"tagged"` 时，**需要指令**才能触发音频。流式块交付会在频道看到之前从可见文本中剥离指令，即使在相邻块间分割也是如此。

除非 `modelOverrides.allowProvider: true`，否则 `provider=...` 被忽略。当回复声明 `provider=...` 时，该指令中的其他键仅由该提供商解析；不支持的键被剥离并作为 TTS 指令警告报告。

**可用指令键：**

- `provider`（注册的提供商 id；需要 `allowProvider: true`）
- `voice` / `voiceName` / `voice_name` / `google_voice` / `voiceId`
- `model` / `google_model`
- `stability`、`similarityBoost`、`style`、`speed`、`useSpeakerBoost`
- `vol` / `volume`（MiniMax 音量，0–10）
- `pitch`（MiniMax 整数音调，-12 到 12；小数值被截断）
- `emotion`（Volcengine 情感标签）
- `applyTextNormalization`（`auto|on|off`）
- `languageCode`（ISO 639-1）
- `seed`

**完全禁用模型覆盖：**

```json5
{ messages: { tts: { modelOverrides: { enabled: false } } } }
```

**允许提供商切换同时保持其他旋钮可配置：**

```json5
{ messages: { tts: { modelOverrides: { enabled: true, allowProvider: true, allowSeed: false } } } }
```

## Slash 命令

单个命令 `/tts`。在 Discord 上，OpenClaw 还注册 `/voice`，因为 `/tts` 是 Discord 的内置命令——文本 `/tts ...` 仍然有效。

```text
/tts off | on | status
/tts chat on | off | default
/tts latest
/tts provider <id>
/tts persona <id> | off
/tts limit <chars>
/tts summary off
/tts audio <text>
```

<Note>
命令需要已授权的发送者（允许列表/所有者规则适用），且必须启用 `commands.text` 或原生命令注册。
</Note>

行为说明：

- `/tts on` 将本地 TTS 偏好写入 `always`；`/tts off` 将其写入 `off`。
- `/tts chat on|off|default` 为当前聊天写入会话范围的 auto-TTS 覆盖。
- `/tts persona <id>` 写入本地角色偏好；`/tts persona off` 清除它。
- `/tts latest` 从当前会话转录本读取最新的助手回复并作为音频发送一次。它仅在会话条目上存储该回复的哈希以抑制重复的语音发送。
- `/tts audio` 生成一次性音频回复（**不**切换 TTS 开启）。
- `limit` 和 `summary` 存储在**本地偏好**中，而非主配置中。
- `/tts status` 包括最新尝试的回退诊断——`Fallback: <primary> -> <used>`、`Attempts: ...` 和每次尝试的详情（`provider:outcome(reasonCode) latency`）。
- `/status` 显示活动的 TTS 模式以及配置的提供商、模型、语音，以及启用 TTS 时的经过消毒的自定义端点元数据。

## 每用户偏好

Slash 命令将本地覆盖写入 `prefsPath`。默认值为 `~/.openclaw/settings/tts.json`；通过 `OPENCLAW_TTS_PREFS` 环境变量或 `messages.tts.prefsPath` 覆盖。

| 存储字段    | 效果                                     |
| ----------- | ---------------------------------------- |
| `auto`      | 本地 auto-TTS 覆盖（`always`、`off` 等） |
| `provider`  | 本地主提供商覆盖                         |
| `persona`   | 本地角色覆盖                             |
| `maxLength` | 摘要阈值（默认 `1500` 字符）             |
| `summarize` | 摘要开关（默认 `true`）                  |

这些覆盖该主机 `messages.tts` 加活动 `agents.list[].tts` 块的有效配置。

## 输出格式（固定）

TTS 语音交付由频道能力驱动。频道插件声明语音风格的 TTS 是否应要求提供商使用原生 `voice-note` 目标，或保持正常的 `audio-file` 合成并仅将兼容输出标记为语音交付。

- **支持语音便条的频道**：语音便条回复偏好 Opus（来自 ElevenLabs 的 `opus_48000_64`，来自 OpenAI 的 `opus`）。
  - 48kHz / 64kbps 是语音消息的良好权衡。
- **Feishu / WhatsApp**：当语音便条回复以 MP3/WebM/WAV/M4A 或其他可能的音频文件形式生成时，频道插件在发送原生语音消息之前使用 `ffmpeg` 将其转码为 48kHz Ogg/Opus。WhatsApp 通过 Baileys `audio` 载荷以 `ptt: true` 和 `audio/ogg; codecs=opus` 发送结果。如果转换失败，Feishu 将原始文件作为附件接收；WhatsApp 发送失败，而不是发布不兼容的 PTT 载荷。
- **BlueBubbles**：保持提供商在正常音频文件路径上合成；MP3 和 CAF 输出被标记为 iMessage 语音备忘录交付。
- **其他频道**：MP3（来自 ElevenLabs 的 `mp3_44100_128`，来自 OpenAI 的 `mp3`）。
  - 44.1kHz / 128kbps 是语音清晰度的默认平衡。
- **MiniMax**：正常音频附件使用 MP3（`speech-2.8-hd` 模型，32kHz 采样率）。对于频道声明的语音便条目标，当频道声明转码时，OpenClaw 在交付之前使用 `ffmpeg` 将 MiniMax MP3 转码为 48kHz Opus。
- **Xiaomi MiMo**：默认 MP3，或配置时使用 WAV。对于频道声明的语音便条目标，当频道声明转码时，OpenClaw 在交付之前使用 `ffmpeg` 将小米输出转码为 48kHz Opus。
- **Local CLI**：使用配置的 `outputFormat`。语音便条目标转换为 Ogg/Opus，电话输出使用 `ffmpeg` 转换为原始 16 kHz 单声道 PCM。
- **Google Gemini**：Gemini API TTS 返回原始 24kHz PCM。OpenClaw 将其包装为音频附件的 WAV，转码为语音便条目标的 48kHz Opus，并直接为 Talk/电话返回 PCM。
- **Gradium**：音频附件使用 WAV，语音便条目标使用 Opus，电话使用 8 kHz 的 `ulaw_8000`。
- **Inworld**：正常音频附件使用 MP3，语音便条目标使用原生 `OGG_OPUS`，Talk/电话使用 22050 Hz 的原始 `PCM`。
- **xAI**：默认 MP3；`responseFormat` 可以是 `mp3`、`wav`、`pcm`、`mulaw` 或 `alaw`。OpenClaw 使用 xAI 的批量 REST TTS 端点并返回完整的音频附件；此提供商路径不使用 xAI 的流式 TTS WebSocket。此路径不支持原生 Opus 语音便条格式。
- **Microsoft**：使用 `microsoft.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。
  - 内置传输接受 `outputFormat`，但并非所有格式都可从服务获得。
  - 输出格式值遵循 Microsoft Speech 输出格式（包括 Ogg/WebM Opus）。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果需要保证 Opus 语音消息，请使用 OpenAI/ElevenLabs。
  - 如果配置的 Microsoft 输出格式失败，OpenClaw 使用 MP3 重试。

OpenAI/ElevenLabs 输出格式按频道固定（见上文）。

## Auto-TTS 行为

当 `messages.tts.auto` 启用时，OpenClaw：

- 如果回复已包含媒体或 `MEDIA:` 指令，则跳过 TTS。
- 跳过非常短的回复（10 个字符以下）。
- 启用摘要时，使用 `summaryModel`（或 `agents.defaults.model.primary`）摘要长回复。
- 将生成的音频附加到回复中。
- 在 `mode: "final"` 中，流式最终回复在文本流完成后仍然发送仅音频 TTS；生成的媒体经过与普通回复附件相同的频道媒体规范化。

如果回复超过 `maxLength` 且摘要关闭（或摘要模型没有 API 密钥），则跳过音频并发送普通文本回复。

```text
回复 -> TTS 启用？
  否  -> 发送文本
  是  -> 有媒体 / MEDIA: / 太短？
          是  -> 发送文本
          否  -> 长度 > 限制？
                   否  -> TTS -> 附加音频
                   是  -> 摘要启用？
                            否  -> 发送文本
                            是  -> 摘要 -> TTS -> 附加音频
```

## 按频道的输出格式

| 目标                                  | 格式                                                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Feishu / Matrix / Telegram / WhatsApp | 语音便条回复偏好 **Opus**（来自 ElevenLabs 的 `opus_48000_64`，来自 OpenAI 的 `opus`）。48 kHz / 64 kbps 平衡清晰度和大小。 |
| 其他频道                              | **MP3**（来自 ElevenLabs 的 `mp3_44100_128`，来自 OpenAI 的 `mp3`）。44.1 kHz / 128 kbps 语音默认。                         |
| Talk / 电话                           | 提供商原生 **PCM**（Inworld 22050 Hz，Google 24 kHz），或 Gradium 的电话 `ulaw_8000`。                                      |

每提供商说明：

- **Feishu / WhatsApp 转码：** 当语音便条回复以 MP3/WebM/WAV/M4A 形式到达时，频道插件使用 `ffmpeg` 转码为 48 kHz Ogg/Opus。WhatsApp 通过 Baileys 以 `ptt: true` 和 `audio/ogg; codecs=opus` 发送。如果转换失败：Feishu 回退到附加原始文件；WhatsApp 发送失败，而不是发布不兼容的 PTT 载荷。
- **MiniMax / Xiaomi MiMo：** 默认 MP3（MiniMax `speech-2.8-hd` 为 32 kHz）；通过 `ffmpeg` 为语音便条目标转码为 48 kHz Opus。
- **Local CLI：** 使用配置的 `outputFormat`。语音便条目标转换为 Ogg/Opus，电话输出转换为原始 16 kHz 单声道 PCM。
- **Google Gemini：** 返回原始 24 kHz PCM。OpenClaw 包装为附件 WAV，为语音便条目标转码为 48 kHz Opus，为 Talk/电话直接返回 PCM。
- **Inworld：** MP3 附件，原生 `OGG_OPUS` 语音便条，Talk/电话原始 `PCM` 22050 Hz。
- **xAI：** 默认 MP3；`responseFormat` 可以是 `mp3|wav|pcm|mulaw|alaw`。使用 xAI 批量 REST 端点——**不**使用流式 WebSocket TTS。**不**支持原生 Opus 语音便条格式。
- **Microsoft：** 使用 `microsoft.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。Telegram `sendVoice` 接受 OGG/MP3/M4A；如需保证 Opus 语音消息，请使用 OpenAI/ElevenLabs。如果配置的 Microsoft 格式失败，OpenClaw 使用 MP3 重试。

OpenAI 和 ElevenLabs 输出格式按上方列出的频道固定。

## 字段参考

<AccordionGroup>
  <Accordion title="顶级 messages.tts.*">
    <ParamField path="auto" type='"off" | "always" | "inbound" | "tagged"'>
      Auto-TTS 模式。`inbound` 仅在入站语音消息后发送音频；`tagged` 仅在回复包含 `[[tts:...]]` 指令或 `[[tts:text]]` 块时发送音频。
    </ParamField>
    <ParamField path="enabled" type="boolean" deprecated>
      旧版开关。`openclaw doctor --fix` 将其迁移到 `auto`。
    </ParamField>
    <ParamField path="mode" type='"final" | "all"' default="final">
      `"all"` 除最终回复外还包括工具/块回复。
    </ParamField>
    <ParamField path="provider" type="string">
      语音提供商 id。未设置时，OpenClaw 按注册表自动选择顺序使用第一个配置的提供商。旧版 `provider: "edge"` 由 `openclaw doctor --fix` 重写为 `"microsoft"`。
    </ParamField>
    <ParamField path="persona" type="string">
      来自 `personas` 的活动角色 id。规范化为小写。
    </ParamField>
    <ParamField path="personas.<id>" type="object">
      稳定的语音身份。字段：`label`、`description`、`provider`、`fallbackPolicy`、`prompt`、`providers.<provider>`。参阅[角色](#personas)。
    </ParamField>
    <ParamField path="summaryModel" type="string">
      用于自动摘要的廉价模型；默认为 `agents.defaults.model.primary`。接受 `provider/model` 或已配置的模型别名。
    </ParamField>
    <ParamField path="modelOverrides" type="object">
      允许模型发出 TTS 指令。`enabled` 默认为 `true`；`allowProvider` 默认为 `false`。
    </ParamField>
    <ParamField path="providers.<id>" type="object">
      按语音提供商 id 键入的提供商拥有设置。旧版直接块（`messages.tts.openai`、`.elevenlabs`、`.microsoft`、`.edge`）由 `openclaw doctor --fix` 重写；仅提交 `messages.tts.providers.<id>`。
    </ParamField>
    <ParamField path="maxTextLength" type="number">
      TTS 输入字符的硬上限。如果超过，`/tts audio` 失败。
    </ParamField>
    <ParamField path="timeoutMs" type="number">
      请求超时（毫秒）。
    </ParamField>
    <ParamField path="prefsPath" type="string">
      覆盖本地偏好 JSON 路径（提供商/限制/摘要）。默认 `~/.openclaw/settings/tts.json`。
    </ParamField>
  </Accordion>

  <Accordion title="Azure Speech">
    <ParamField path="apiKey" type="string">环境变量：`AZURE_SPEECH_KEY`、`AZURE_SPEECH_API_KEY` 或 `SPEECH_KEY`。</ParamField>
    <ParamField path="region" type="string">Azure Speech 区域（例如 `eastus`）。环境变量：`AZURE_SPEECH_REGION` 或 `SPEECH_REGION`。</ParamField>
    <ParamField path="endpoint" type="string">可选的 Azure Speech 端点覆盖（别名 `baseUrl`）。</ParamField>
    <ParamField path="voice" type="string">Azure 语音简称。默认 `en-US-JennyNeural`。</ParamField>
    <ParamField path="lang" type="string">SSML 语言代码。默认 `en-US`。</ParamField>
    <ParamField path="outputFormat" type="string">标准音频的 Azure `X-Microsoft-OutputFormat`。默认 `audio-24khz-48kbitrate-mono-mp3`。</ParamField>
    <ParamField path="voiceNoteOutputFormat" type="string">语音便条输出的 Azure `X-Microsoft-OutputFormat`。默认 `ogg-24khz-16bit-mono-opus`。</ParamField>
  </Accordion>

  <Accordion title="ElevenLabs">
    <ParamField path="apiKey" type="string">回退到 `ELEVENLABS_API_KEY` 或 `XI_API_KEY`。</ParamField>
    <ParamField path="model" type="string">模型 id（例如 `eleven_multilingual_v2`、`eleven_v3`）。</ParamField>
    <ParamField path="voiceId" type="string">ElevenLabs 语音 id。</ParamField>
    <ParamField path="voiceSettings" type="object">
      `stability`、`similarityBoost`、`style`（各 `0..1`），`useSpeakerBoost`（`true|false`），`speed`（`0.5..2.0`，`1.0` = 正常）。
    </ParamField>
    <ParamField path="applyTextNormalization" type='"auto" | "on" | "off"'>文本规范化模式。</ParamField>
    <ParamField path="languageCode" type="string">2 字母 ISO 639-1（例如 `en`、`de`）。</ParamField>
    <ParamField path="seed" type="number">整数 `0..4294967295`，用于尽力而为的确定性。</ParamField>
    <ParamField path="baseUrl" type="string">覆盖 ElevenLabs API 基础 URL。</ParamField>
  </Accordion>

  <Accordion title="Google Gemini">
    <ParamField path="apiKey" type="string">回退到 `GEMINI_API_KEY` / `GOOGLE_API_KEY`。如果省略，TTS 可以在环境变量回退之前复用 `models.providers.google.apiKey`。</ParamField>
    <ParamField path="model" type="string">Gemini TTS 模型。默认 `gemini-3.1-flash-tts-preview`。</ParamField>
    <ParamField path="voiceName" type="string">Gemini 预构建语音名称。默认 `Kore`。别名：`voice`。</ParamField>
    <ParamField path="audioProfile" type="string">在朗读文本之前前置的自然语言风格提示。</ParamField>
    <ParamField path="speakerName" type="string">当你的提示使用命名说话者时，在朗读文本之前前置的可选说话者标签。</ParamField>
    <ParamField path="promptTemplate" type='"audio-profile-v1"'>设置为 `audio-profile-v1` 以将活动角色提示字段包装到确定性 Gemini TTS 提示结构中。</ParamField>
    <ParamField path="personaPrompt" type="string">附加到模板导演说明的 Google 特定额外角色提示文本。</ParamField>
    <ParamField path="baseUrl" type="string">仅接受 `https://generativelanguage.googleapis.com`。</ParamField>
  </Accordion>

  <Accordion title="Gradium">
    <ParamField path="apiKey" type="string">环境变量：`GRADIUM_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认 `https://api.gradium.ai`。</ParamField>
    <ParamField path="voiceId" type="string">默认 Emma（`YTpq7expH9539ERJ`）。</ParamField>
  </Accordion>

  <Accordion title="Inworld">
    ### Inworld 主要

    <ParamField path="apiKey" type="string">环境变量：`INWORLD_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认 `https://api.inworld.ai`。</ParamField>
    <ParamField path="modelId" type="string">默认 `inworld-tts-1.5-max`。也支持：`inworld-tts-1.5-mini`、`inworld-tts-1-max`、`inworld-tts-1`。</ParamField>
    <ParamField path="voiceId" type="string">默认 `Sarah`。</ParamField>
    <ParamField path="temperature" type="number">采样温度 `0..2`。</ParamField>

  </Accordion>

  <Accordion title="Local CLI (tts-local-cli)">
    <ParamField path="command" type="string">CLI TTS 的本地可执行文件或命令字符串。</ParamField>
    <ParamField path="args" type="string[]">命令参数。支持 `{{Text}}`、`{{OutputPath}}`、`{{OutputDir}}`、`{{OutputBase}}` 占位符。</ParamField>
    <ParamField path="outputFormat" type='"mp3" | "opus" | "wav"'>预期的 CLI 输出格式。音频附件默认为 `mp3`。</ParamField>
    <ParamField path="timeoutMs" type="number">命令超时（毫秒）。默认 `120000`。</ParamField>
    <ParamField path="cwd" type="string">可选的命令工作目录。</ParamField>
    <ParamField path="env" type="Record<string, string>">命令的可选环境覆盖。</ParamField>
  </Accordion>

  <Accordion title="Microsoft（无 API 密钥）">
    <ParamField path="enabled" type="boolean" default="true">允许使用 Microsoft 语音。</ParamField>
    <ParamField path="voice" type="string">Microsoft 神经语音名称（例如 `en-US-MichelleNeural`）。</ParamField>
    <ParamField path="lang" type="string">语言代码（例如 `en-US`）。</ParamField>
    <ParamField path="outputFormat" type="string">Microsoft 输出格式。默认 `audio-24khz-48kbitrate-mono-mp3`。内置 Edge 后端传输并非支持所有格式。</ParamField>
    <ParamField path="rate / pitch / volume" type="string">百分比字符串（例如 `+10%`、`-5%`）。</ParamField>
    <ParamField path="saveSubtitles" type="boolean">在音频文件旁边写入 JSON 字幕。</ParamField>
    <ParamField path="proxy" type="string">Microsoft 语音请求的代理 URL。</ParamField>
    <ParamField path="timeoutMs" type="number">请求超时覆盖（毫秒）。</ParamField>
    <ParamField path="edge.*" type="object" deprecated>旧版别名。运行 `openclaw doctor --fix` 将持久化配置重写为 `providers.microsoft`。</ParamField>
  </Accordion>

  <Accordion title="MiniMax">
    <ParamField path="apiKey" type="string">回退到 `MINIMAX_API_KEY`。通过 `MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_CODING_API_KEY` 进行 Token Plan 认证。</ParamField>
    <ParamField path="baseUrl" type="string">默认 `https://api.minimax.io`。环境变量：`MINIMAX_API_HOST`。</ParamField>
    <ParamField path="model" type="string">默认 `speech-2.8-hd`。环境变量：`MINIMAX_TTS_MODEL`。</ParamField>
    <ParamField path="voiceId" type="string">默认 `English_expressive_narrator`。环境变量：`MINIMAX_TTS_VOICE_ID`。</ParamField>
    <ParamField path="speed" type="number">`0.5..2.0`。默认 `1.0`。</ParamField>
    <ParamField path="vol" type="number">`(0, 10]`。默认 `1.0`。</ParamField>
    <ParamField path="pitch" type="number">整数 `-12..12`。默认 `0`。小数值在请求前被截断。</ParamField>
  </Accordion>

  <Accordion title="OpenAI">
    <ParamField path="apiKey" type="string">回退到 `OPENAI_API_KEY`。</ParamField>
    <ParamField path="model" type="string">OpenAI TTS 模型 id（例如 `gpt-4o-mini-tts`）。</ParamField>
    <ParamField path="voice" type="string">语音名称（例如 `alloy`、`cedar`）。</ParamField>
    <ParamField path="instructions" type="string">显式 OpenAI `instructions` 字段。设置后，角色提示字段**不**自动映射。</ParamField>
    <ParamField path="extraBody / extra_body" type="Record<string, unknown>">在生成的 OpenAI TTS 字段之后合并到 `/audio/speech` 请求体中的额外 JSON 字段。用于需要 `lang` 等提供商特定键的 OpenAI 兼容端点（如 Kokoro）；不安全的原型键被忽略。</ParamField>
    <ParamField path="baseUrl" type="string">
      覆盖 OpenAI TTS 端点。解析顺序：config → `OPENAI_TTS_BASE_URL` → `https://api.openai.com/v1`。非默认值被视为 OpenAI 兼容的 TTS 端点，因此接受自定义模型和语音名称。
    </ParamField>
  </Accordion>

  <Accordion title="OpenRouter">
    <ParamField path="apiKey" type="string">环境变量：`OPENROUTER_API_KEY`。可以复用 `models.providers.openrouter.apiKey`。</ParamField>
    <ParamField path="baseUrl" type="string">默认 `https://openrouter.ai/api/v1`。旧版 `https://openrouter.ai/v1` 被规范化。</ParamField>
    <ParamField path="model" type="string">默认 `hexgrad/kokoro-82m`。别名：`modelId`。</ParamField>
    <ParamField path="voice" type="string">默认 `af_alloy`。别名：`voiceId`。</ParamField>
    <ParamField path="responseFormat" type='"mp3" | "pcm"'>默认 `mp3`。</ParamField>
    <ParamField path="speed" type="number">提供商原生速度覆盖。</ParamField>
  </Accordion>

  <Accordion title="Volcengine（BytePlus Seed Speech）">
    <ParamField path="apiKey" type="string">环境变量：`VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY`。</ParamField>
    <ParamField path="resourceId" type="string">默认 `seed-tts-1.0`。环境变量：`VOLCENGINE_TTS_RESOURCE_ID`。当你的项目有 TTS 2.0 授权时使用 `seed-tts-2.0`。</ParamField>
    <ParamField path="appKey" type="string">应用密钥头。默认 `aGjiRDfUWi`。环境变量：`VOLCENGINE_TTS_APP_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">覆盖 Seed Speech TTS HTTP 端点。环境变量：`VOLCENGINE_TTS_BASE_URL`。</ParamField>
    <ParamField path="voice" type="string">语音类型。默认 `en_female_anna_mars_bigtts`。环境变量：`VOLCENGINE_TTS_VOICE`。</ParamField>
    <ParamField path="speedRatio" type="number">提供商原生速度比。</ParamField>
    <ParamField path="emotion" type="string">提供商原生情感标签。</ParamField>
    <ParamField path="appId / token / cluster" type="string" deprecated>旧版 Volcengine Speech Console 字段。环境变量：`VOLCENGINE_TTS_APPID`、`VOLCENGINE_TTS_TOKEN`、`VOLCENGINE_TTS_CLUSTER`（默认 `volcano_tts`）。</ParamField>
  </Accordion>

  <Accordion title="xAI">
    <ParamField path="apiKey" type="string">环境变量：`XAI_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认 `https://api.x.ai/v1`。环境变量：`XAI_BASE_URL`。</ParamField>
    <ParamField path="voiceId" type="string">默认 `eve`。实时语音：`ara`、`eve`、`leo`、`rex`、`sal`、`una`。</ParamField>
    <ParamField path="language" type="string">BCP-47 语言代码或 `auto`。默认 `en`。</ParamField>
    <ParamField path="responseFormat" type='"mp3" | "wav" | "pcm" | "mulaw" | "alaw"'>默认 `mp3`。</ParamField>
    <ParamField path="speed" type="number">提供商原生速度覆盖。</ParamField>
  </Accordion>

  <Accordion title="Xiaomi MiMo">
    <ParamField path="apiKey" type="string">环境变量：`XIAOMI_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认 `https://api.xiaomimimo.com/v1`。环境变量：`XIAOMI_BASE_URL`。</ParamField>
    <ParamField path="model" type="string">默认 `mimo-v2.5-tts`。环境变量：`XIAOMI_TTS_MODEL`。也支持 `mimo-v2-tts`。</ParamField>
    <ParamField path="voice" type="string">默认 `mimo_default`。环境变量：`XIAOMI_TTS_VOICE`。</ParamField>
    <ParamField path="format" type='"mp3" | "wav"'>默认 `mp3`。环境变量：`XIAOMI_TTS_FORMAT`。</ParamField>
    <ParamField path="style" type="string">可选的自然语言风格指令，作为用户消息发送；不朗读。</ParamField>
  </Accordion>
</AccordionGroup>

## 代理工具

`tts` 工具将文本转换为语音，并返回用于回复交付的音频附件。在 Feishu、Matrix、Telegram 和 WhatsApp 上，音频作为语音消息而非文件附件交付。当 `ffmpeg` 可用时，Feishu 和 WhatsApp 可以在此路径上转码非 Opus TTS 输出。

WhatsApp 通过 Baileys 将音频作为 PTT 语音便条发送（带 `ptt: true` 的 `audio`），并将可见文本与 PTT 音频**分开**发送，因为客户端在语音便条上渲染字幕不一致。

该工具接受可选的 `channel` 和 `timeoutMs` 字段；`timeoutMs` 是每次调用的提供商请求超时（毫秒）。

## Gateway RPC

| 方法              | 用途                            |
| ----------------- | ------------------------------- |
| `tts.status`      | 读取当前 TTS 状态和最新尝试。   |
| `tts.enable`      | 将本地自动偏好设置为 `always`。 |
| `tts.disable`     | 将本地自动偏好设置为 `off`。    |
| `tts.convert`     | 一次性文本 → 音频。             |
| `tts.setProvider` | 设置本地提供商偏好。            |
| `tts.setPersona`  | 设置本地角色偏好。              |
| `tts.providers`   | 列出已配置的提供商和状态。      |

## 服务链接

- [OpenAI 文字转语音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI Audio API 参考](https://platform.openai.com/docs/api-reference/audio)
- [Azure Speech REST 文字转语音](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech)
- [Azure Speech 提供商](/providers/azure-speech)
- [ElevenLabs 文字转语音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs 认证](https://elevenlabs.io/docs/api-reference/authentication)
- [Gradium](/providers/gradium)
- [Inworld TTS API](https://docs.inworld.ai/tts/tts)
- [MiniMax T2A v2 API](https://platform.minimaxi.com/document/T2A%20V2)
- [Volcengine TTS HTTP API](/providers/volcengine#text-to-speech)
- [Xiaomi MiMo 语音合成](/providers/xiaomi#text-to-speech)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft Speech 输出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)
- [xAI 文字转语音](https://docs.x.ai/developers/rest-api-reference/inference/voice#text-to-speech-rest)

## 相关链接

- [媒体概述](/tools/media-overview)
- [音乐生成](/tools/music-generation)
- [视频生成](/tools/video-generation)
- [Slash 命令](/tools/slash-commands)
- [语音通话插件](/plugins/voice-call)
