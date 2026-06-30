---
summary: "通过 Twilio、Telnyx 或 Plivo 拨打出站和接受入站语音通话，支持可选的实时语音和流式转录"
read_when:
  - 你想从 OpenClaw 拨打出站语音通话
  - 你正在配置或开发 voice-call 插件
  - 你需要在电话上使用实时语音或流式转录
title: "Voice call 插件"
sidebarTitle: "Voice call"
---

通过插件为 OpenClaw 提供语音通话。支持出站通知、多轮对话、全双工实时语音、流式转录和具有允许列表策略的入站通话。

**当前提供商：** `twilio`（Programmable Voice + Media Streams）、`telnyx`（Call Control v2）、`plivo`（Voice API + XML transfer + GetInput speech）、`mock`（开发/无网络）。

<Note>
Voice Call 插件**在 Gateway 进程内**运行。如果你使用远程 Gateway，请在运行 Gateway 的机器上安装和配置插件，然后重启 Gateway 以加载它。
</Note>

## 快速开始

<Steps>
  <Step title="安装插件">
    <Tabs>
      <Tab title="从 npm">
        ```bash
        openclaw plugins install @openclaw/voice-call
        ```
      </Tab>
      <Tab title="从本地文件夹（开发）">
        ```bash
        PLUGIN_SRC=./path/to/local/voice-call-plugin
        openclaw plugins install "$PLUGIN_SRC"
        cd "$PLUGIN_SRC" && pnpm install
        ```
      </Tab>
    </Tabs>

    使用裸包以遵循当前的官方发布标签。仅在需要可重现安装时才固定确切版本。

    之后重启 Gateway 以加载插件。

  </Step>
  <Step title="配置提供商和 webhook">
    在 `plugins.entries.voice-call.config` 下设置配置（请参见下面的[配置](#configuration)了解完整形状）。至少需要：`provider`、提供商凭据、`fromNumber` 和可公开访问的 webhook URL。
  </Step>
  <Step title="验证设置">
    ```bash
    openclaw voicecall setup
    ```

    默认输出在聊天日志和终端中可读。它检查插件启用状态、提供商凭据、webhook 暴露，以及只有一个音频模式（`streaming` 或 `realtime`）处于活跃状态。使用 `--json` 进行脚本处理。

  </Step>
  <Step title="冒烟测试">
    ```bash
    openclaw voicecall smoke
    openclaw voicecall smoke --to "+15555550123"
    ```

    默认情况下都是演习。添加 `--yes` 以实际拨打一个简短的出站通知电话：

    ```bash
    openclaw voicecall smoke --to "+15555550123" --yes
    ```

  </Step>
</Steps>

<Warning>
对于 Twilio、Telnyx 和 Plivo，设置必须解析到**公共 webhook URL**。
如果 `publicUrl`、隧道 URL、Tailscale URL 或服务回退解析到环回或私有网络空间，设置会失败，而不是启动无法接收运营商 webhook 的提供商。
</Warning>

## 配置

如果 `enabled: true` 但所选提供商缺少凭据，Gateway 启动时会记录设置不完整的警告（包含缺少的密钥）并跳过启动运行时。命令、RPC 调用和 agent 工具在使用时仍会返回确切缺少的提供商配置。

<Note>
Voice-call 凭据接受 SecretRef。`plugins.entries.voice-call.config.twilio.authToken`、`plugins.entries.voice-call.config.realtime.providers.*.apiKey`、`plugins.entries.voice-call.config.streaming.providers.*.apiKey` 和 `plugins.entries.voice-call.config.tts.providers.*.apiKey` 通过标准 SecretRef 界面解析；请参见 [SecretRef 凭据界面](/reference/secretref-credential-surface)。
</Note>

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio", // or "telnyx" | "plivo" | "mock"
          fromNumber: "+15550001234", // or TWILIO_FROM_NUMBER for Twilio
          toNumber: "+15550005678",
          sessionScope: "per-phone", // per-phone | per-call
          numbers: {
            "+15550009999": {
              inboundGreeting: "Silver Fox Cards, how can I help?",
              responseSystemPrompt: "You are a concise baseball card specialist.",
              tts: {
                providers: {
                  openai: { voice: "alloy" },
                },
              },
            },
          },

          twilio: {
            accountSid: "ACxxxxxxxx",
            authToken: "...",
          },
          telnyx: {
            apiKey: "...",
            connectionId: "...",
            // Telnyx webhook public key from the Mission Control Portal
            // (Base64; can also be set via TELNYX_PUBLIC_KEY).
            publicKey: "...",
          },
          plivo: {
            authId: "MAxxxxxxxxxxxxxxxxxxxx",
            authToken: "...",
          },

          // Webhook server
          serve: {
            port: 3334,
            path: "/voice/webhook",
          },

          // Webhook security (recommended for tunnels/proxies)
          webhookSecurity: {
            allowedHosts: ["voice.example.com"],
            trustedProxyIPs: ["100.64.0.1"],
          },

          // Public exposure (pick one)
          // publicUrl: "https://example.ngrok.app/voice/webhook",
          // tunnel: { provider: "ngrok" },
          // tailscale: { mode: "funnel", path: "/voice/webhook" },

          outbound: {
            defaultMode: "notify", // notify | conversation
          },

          streaming: { enabled: true /* see Streaming transcription */ },
          realtime: { enabled: false /* see Realtime voice */ },
        },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="提供商暴露和安全说明">
    - Twilio、Telnyx 和 Plivo 都需要**可公开访问**的 webhook URL。
    - `mock` 是本地开发提供商（无网络调用）。
    - Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`），除非 `skipSignatureVerification` 为 true。
    - `skipSignatureVerification` 仅用于本地测试。
    - 在 ngrok 免费层上，将 `publicUrl` 设置为确切的 ngrok URL；始终强制执行签名验证。
    - `tunnel.allowNgrokFreeTierLoopbackBypass: true` 仅**当** `tunnel.provider="ngrok"` 且 `serve.bind` 为环回（ngrok 本地代理）时，允许使用无效签名的 Twilio webhook。仅限本地开发。
    - ngrok 免费层 URL 可能更改或添加中间页面行为；如果 `publicUrl` 漂移，Twilio 签名会失败。生产环境：优先使用稳定域名或 Tailscale funnel。

  </Accordion>
  <Accordion title="流式连接上限">
    - `streaming.preStartTimeoutMs` 关闭从未发送有效 `start` 帧的套接字。
    - `streaming.maxPendingConnections` 限制总未认证预启动套接字。
    - `streaming.maxPendingConnectionsPerIp` 按源 IP 限制未认证预启动套接字。
    - `streaming.maxConnections` 限制总打开的媒体流套接字（待处理 + 活跃）。

  </Accordion>
  <Accordion title="旧版配置迁移">
    使用 `provider: "log"`、`twilio.from` 或旧版 `streaming.*` OpenAI 密钥的旧配置由 `openclaw doctor --fix` 重写。运行时回退目前仍接受旧的 voice-call 密钥，但重写路径是 `openclaw doctor --fix`，兼容性垫片是临时的。

    自动迁移的流式密钥：

    - `streaming.sttProvider` → `streaming.provider`
    - `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
    - `streaming.sttModel` → `streaming.providers.openai.model`
    - `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
    - `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

  </Accordion>
</AccordionGroup>

## 会话范围

默认情况下，Voice Call 使用 `sessionScope: "per-phone"`，因此来自同一呼叫者的重复电话保留对话记忆。当每个运营商通话应以新鲜上下文开始时，设置 `sessionScope: "per-call"`，例如接待、预订、IVR 或 Google Meet 桥接流程，其中同一电话号码可能代表不同的会议。

## 实时语音对话

`realtime` 为实时通话音频选择全双工实时语音提供商。它与 `streaming` 分离，后者只将音频转发到实时转录提供商。

<Warning>
`realtime.enabled` 不能与 `streaming.enabled` 结合使用。每次通话选择一种音频模式。
</Warning>

当前运行时行为：

- `realtime.enabled` 支持 Twilio Media Streams。
- `realtime.provider` 是可选的。如果未设置，Voice Call 使用第一个注册的实时语音提供商。
- 捆绑的实时语音提供商：Google Gemini Live（`google`）和 OpenAI（`openai`），由其提供商插件注册。
- 提供商拥有的原始配置位于 `realtime.providers.<providerId>` 下。
- Voice Call 默认公开共享的 `openclaw_agent_consult` 实时工具。当呼叫者需要更深入的推理、当前信息或正常的 OpenClaw 工具时，实时模型可以调用它。
- `realtime.fastContext.enabled` 默认关闭。启用后，Voice Call 首先在 `realtime.fastContext.timeoutMs` 内搜索索引的记忆/会话上下文，并将这些片段返回给实时模型，然后仅在 `realtime.fastContext.fallbackToConsult` 为 true 时才回退到完整的咨询 agent。
- 如果 `realtime.provider` 指向未注册的提供商，或根本没有注册实时语音提供商，Voice Call 会记录警告并跳过实时媒体，而不是导致整个插件失败。
- 咨询会话密钥在可用时复用存储的通话会话，然后回退到已配置的 `sessionScope`（默认 `per-phone`，或隔离通话的 `per-call`）。

### 工具策略

`realtime.toolPolicy` 控制咨询运行：

| 策略             | 行为                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `safe-read-only` | 公开咨询工具并将常规 agent 限制为 `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和 `memory_get`。 |
| `owner`          | 公开咨询工具并让常规 agent 使用正常的 agent 工具策略。                                                             |
| `none`           | 不公开咨询工具。自定义 `realtime.tools` 仍然传递到实时提供商。                                                     |

### 实时提供商示例

<Tabs>
  <Tab title="Google Gemini Live">
    默认值：API 密钥来自 `realtime.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_GENERATIVE_AI_API_KEY`；模型 `gemini-2.5-flash-native-audio-preview-12-2025`；语音 `Kore`。`sessionResumption` 和 `contextWindowCompression` 默认开启，用于更长、可重连的通话。使用 `silenceDurationMs`、`startSensitivity` 和 `endSensitivity` 调整电话音频的更快轮次切换。

    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              provider: "twilio",
              inboundPolicy: "allowlist",
              allowFrom: ["+15550005678"],
              realtime: {
                enabled: true,
                provider: "google",
                instructions: "Speak briefly. Call openclaw_agent_consult before using deeper tools.",
                toolPolicy: "safe-read-only",
                providers: {
                  google: {
                    apiKey: "${GEMINI_API_KEY}",
                    model: "gemini-2.5-flash-native-audio-preview-12-2025",
                    voice: "Kore",
                    silenceDurationMs: 500,
                    startSensitivity: "high",
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="OpenAI">
    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              realtime: {
                enabled: true,
                provider: "openai",
                providers: {
                  openai: { apiKey: "${OPENAI_API_KEY}" },
                },
              },
            },
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

有关提供商特定的实时语音选项，请参见 [Google 提供商](/providers/google)和 [OpenAI 提供商](/providers/openai)。

## 流式转录

`streaming` 为实时通话音频选择实时转录提供商。

当前运行时行为：

- `streaming.provider` 是可选的。如果未设置，Voice Call 使用第一个注册的实时转录提供商。
- 捆绑的实时转录提供商：Deepgram（`deepgram`）、ElevenLabs（`elevenlabs`）、Mistral（`mistral`）、OpenAI（`openai`）和 xAI（`xai`），由其提供商插件注册。
- 提供商拥有的原始配置位于 `streaming.providers.<providerId>` 下。
- Twilio 发送接受的流 `start` 消息后，Voice Call 立即注册流，在提供商连接时通过转录提供商排队入站媒体，并在实时转录就绪后才开始初始问候。
- 如果 `streaming.provider` 指向未注册的提供商，或没有注册提供商，Voice Call 会记录警告并跳过媒体流，而不是导致整个插件失败。

### 流式提供商示例

<Tabs>
  <Tab title="OpenAI">
    默认值：API 密钥 `streaming.providers.openai.apiKey` 或 `OPENAI_API_KEY`；模型 `gpt-4o-transcribe`；`silenceDurationMs: 800`；`vadThreshold: 0.5`。

    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              streaming: {
                enabled: true,
                provider: "openai",
                streamPath: "/voice/stream",
                providers: {
                  openai: {
                    apiKey: "sk-...", // optional if OPENAI_API_KEY is set
                    model: "gpt-4o-transcribe",
                    silenceDurationMs: 800,
                    vadThreshold: 0.5,
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="xAI">
    默认值：API 密钥 `streaming.providers.xai.apiKey` 或 `XAI_API_KEY`；端点 `wss://api.x.ai/v1/stt`；编码 `mulaw`；采样率 `8000`；`endpointingMs: 800`；`interimResults: true`。

    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              streaming: {
                enabled: true,
                provider: "xai",
                streamPath: "/voice/stream",
                providers: {
                  xai: {
                    apiKey: "${XAI_API_KEY}", // optional if XAI_API_KEY is set
                    endpointingMs: 800,
                    language: "en",
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

  </Tab>
</Tabs>

## 通话的 TTS

Voice Call 使用核心 `messages.tts` 配置进行通话中的流式语音。你可以在插件配置下使用**相同形状**覆盖它——它与 `messages.tts` 深度合并。

```json5
{
  tts: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "pMsXgVXv3BLzUgSXRplE",
        modelId: "eleven_multilingual_v2",
      },
    },
  },
}
```

<Warning>
**Microsoft 语音对语音通话被忽略。** 电话音频需要 PCM；当前 Microsoft 传输不公开电话 PCM 输出。
</Warning>

行为说明：

- 插件配置中的旧版 `tts.<provider>` 密钥（`openai`、`elevenlabs`、`microsoft`、`edge`）由 `openclaw doctor --fix` 修复；已提交的配置应使用 `tts.providers.<provider>`。
- 当 Twilio 媒体流启用时使用核心 TTS；否则通话回退到提供商原生语音。
- 如果 Twilio 媒体流已经处于活跃状态，Voice Call 不会回退到 TwiML `<Say>`。如果在该状态下电话 TTS 不可用，播放请求会失败而不是混合两个播放路径。
- 当电话 TTS 回退到辅助提供商时，Voice Call 会记录带有提供商链（`from`、`to`、`attempts`）的警告，以便调试。
- 当 Twilio 插话或流拆除清除待处理的 TTS 队列时，排队的播放请求会解决而不是让等待播放完成的呼叫者挂起。

### TTS 示例

<Tabs>
  <Tab title="仅核心 TTS">
```json5
{
  messages: {
    tts: {
      provider: "openai",
      providers: {
        openai: { voice: "alloy" },
      },
    },
  },
}
```
  </Tab>
  <Tab title="覆盖到 ElevenLabs（仅通话）">
```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            provider: "elevenlabs",
            providers: {
              elevenlabs: {
                apiKey: "elevenlabs_key",
                voiceId: "pMsXgVXv3BLzUgSXRplE",
                modelId: "eleven_multilingual_v2",
              },
            },
          },
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="OpenAI 模型覆盖（深度合并）">
```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            providers: {
              openai: {
                model: "gpt-4o-mini-tts",
                voice: "marin",
              },
            },
          },
        },
      },
    },
  },
}
```
  </Tab>
</Tabs>

## 入站通话

入站策略默认为 `disabled`。要启用入站通话，请设置：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

<Warning>
`inboundPolicy: "allowlist"` 是低保证的主叫方 ID 过滤。插件规范化提供商提供的 `From` 值并将其与 `allowFrom` 比较。Webhook 验证对提供商传递和有效载荷完整性进行身份验证，但**不**证明 PSTN/VoIP 主叫号码所有权。将 `allowFrom` 视为主叫方 ID 过滤，而不是强身份验证。
</Warning>

自动响应使用 agent 系统。使用 `responseModel`、`responseSystemPrompt` 和 `responseTimeoutMs` 进行调整。

### 按号码路由

当一个 Voice Call 插件接收多个电话号码的通话，且每个号码应表现为不同的线路时，使用 `numbers`。例如，一个号码可以使用随意的个人助手，而另一个使用商业角色、不同的响应 agent 和不同的 TTS 语音。

路由从提供商提供的已拨打 `To` 号码中选择。键必须是 E.164 号码。当通话到来时，Voice Call 解析匹配的路由一次，将匹配的路由存储在通话记录上，并为问候、经典自动响应路径、实时咨询路径和 TTS 播放复用该有效配置。如果没有匹配的路由，则使用全局 Voice Call 配置。出站通话不使用 `numbers`；在发起通话时显式传递出站目标、消息和会话。

路由覆盖当前支持：

- `inboundGreeting`
- `tts`
- `agentId`
- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

`tts` 路由值在全局 Voice Call `tts` 配置上深度合并，因此你通常只能覆盖提供商语音：

```json5
{
  inboundGreeting: "Hello from the main line.",
  responseSystemPrompt: "You are the default voice assistant.",
  tts: {
    provider: "openai",
    providers: {
      openai: { voice: "coral" },
    },
  },
  numbers: {
    "+15550001111": {
      inboundGreeting: "Silver Fox Cards, how can I help?",
      responseSystemPrompt: "You are a concise baseball card specialist.",
      tts: {
        providers: {
          openai: { voice: "alloy" },
        },
      },
    },
  },
}
```

### 口语输出合约

对于自动响应，Voice Call 将严格的口语输出合约附加到系统提示：

```text
{"spoken":"..."}
```

Voice Call 防御性地提取语音文本：

- 忽略标记为推理/错误内容的有效载荷。
- 解析直接 JSON、围栏 JSON 或内联 `"spoken"` 键。
- 回退到纯文本并删除可能的规划/元导语段落。

这使口语播放专注于面向呼叫者的文本，并避免将规划文本泄漏到音频中。

### 对话启动行为

对于出站 `conversation` 通话，第一条消息处理与实时播放状态绑定：

- 仅在初始问候正在播放时才抑制插话队列清除和自动响应。
- 如果初始播放失败，通话返回到 `listening` 状态，初始消息保持排队等待重试。
- Twilio 流式的初始播放在流连接时启动，无需额外延迟。
- 插话会中止活跃播放并清除排队但尚未播放的 Twilio TTS 条目。已清除的条目解析为已跳过，因此后续响应逻辑可以在不等待永远不会播放的音频的情况下继续。
- 实时语音对话使用实时流自己的开场轮次。Voice Call **不**为该初始消息发布旧版 `<Say>` TwiML 更新，因此出站 `<Connect><Stream>` 会话保持附加状态。

### Twilio 流断开宽限期

当 Twilio 媒体流断开时，Voice Call 等待 **2000 毫秒**再自动结束通话：

- 如果流在该窗口内重新连接，自动结束会被取消。
- 如果在宽限期后没有流重新注册，通话结束以防止活跃通话卡住。

## 过时通话收割器

使用 `staleCallReaperSeconds` 结束从未收到终端 webhook 的通话（例如，从未完成的通知模式通话）。默认值为 `0`（禁用）。

推荐范围：

- **生产环境：** 通知风格流程 `120`–`300` 秒。
- 保持此值**高于 `maxDurationSeconds`**，以便正常通话可以完成。好的起始点是 `maxDurationSeconds + 30–60` 秒。

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          maxDurationSeconds: 300,
          staleCallReaperSeconds: 360,
        },
      },
    },
  },
}
```

## Webhook 安全

当代理或隧道位于 Gateway 前面时，插件会重建公共 URL 进行签名验证。这些选项控制哪些转发头是受信任的：

<ParamField path="webhookSecurity.allowedHosts" type="string[]">
  来自转发头的允许列表主机。
</ParamField>
<ParamField path="webhookSecurity.trustForwardingHeaders" type="boolean">
  不使用允许列表信任转发头。
</ParamField>
<ParamField path="webhookSecurity.trustedProxyIPs" type="string[]">
  仅当请求远程 IP 匹配列表时才信任转发头。
</ParamField>

附加保护：

- 对于 Twilio 和 Plivo 启用了 Webhook **重放保护**。重放的有效 webhook 请求被确认但副作用会被跳过。
- Twilio 对话轮次在 `<Gather>` 回调中包含每轮令牌，因此过期/重放的语音回调无法满足更新的待处理转录轮次。
- 当所需的提供商签名头缺失时，未经认证的 webhook 请求在读取正文之前被拒绝。
- voice-call webhook 在签名验证之前使用共享的预认证正文配置文件（64 KB / 5 秒）加上每 IP 飞行中上限。

使用稳定公共主机的示例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          publicUrl: "https://voice.example.com/voice/webhook",
          webhookSecurity: {
            allowedHosts: ["voice.example.com"],
          },
        },
      },
    },
  },
}
```

## CLI

```bash
openclaw voicecall call --to "+15555550123" --message "Hello from OpenClaw"
openclaw voicecall start --to "+15555550123"   # alias for call
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall speak --call-id <id> --message "One moment"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw voicecall latency                      # summarize turn latency from logs
openclaw voicecall expose --mode funnel
```

当 Gateway 已经在运行时，操作性 `voicecall` 命令委托给 Gateway 拥有的 voice-call 运行时，因此 CLI 不会绑定第二个 webhook 服务器。如果没有 Gateway 可访问，命令回退到独立的 CLI 运行时。

`latency` 从默认的 voice-call 存储路径读取 `calls.jsonl`。使用 `--file <path>` 指向不同的日志，使用 `--last <n>` 将分析限制为最后 N 条记录（默认 200）。输出包括轮次延迟和监听等待时间的 p50/p90/p99。

## Agent 工具

工具名称：`voice_call`。

| 操作            | 参数                                       |
| --------------- | ------------------------------------------ |
| `initiate_call` | `message`, `to?`, `mode?`, `dtmfSequence?` |
| `continue_call` | `callId`, `message`                        |
| `speak_to_user` | `callId`, `message`                        |
| `send_dtmf`     | `callId`, `digits`                         |
| `end_call`      | `callId`                                   |
| `get_status`    | `callId`                                   |

本仓库附带一个匹配的技能文档，位于 `skills/voice-call/SKILL.md`。

## Gateway RPC

| 方法                 | 参数                                       |
| -------------------- | ------------------------------------------ |
| `voicecall.initiate` | `to?`, `message`, `mode?`, `dtmfSequence?` |
| `voicecall.continue` | `callId`, `message`                        |
| `voicecall.speak`    | `callId`, `message`                        |
| `voicecall.dtmf`     | `callId`, `digits`                         |
| `voicecall.end`      | `callId`                                   |
| `voicecall.status`   | `callId`                                   |

`dtmfSequence` 仅对 `mode: "conversation"` 有效。通知模式通话应在通话存在后使用 `voicecall.dtmf`，如果它们需要连接后 DTMF 的话。

## 故障排除

### 设置无法通过 webhook 暴露

从运行 Gateway 的同一环境运行设置：

```bash
openclaw voicecall setup
openclaw voicecall setup --json
```

对于 `twilio`、`telnyx` 和 `plivo`，`webhook-exposure` 必须是绿色。即使 `publicUrl` 已配置，当它指向本地或私有网络空间时也会失败，因为运营商无法回调这些地址。不要将 `localhost`、`127.0.0.1`、`0.0.0.0`、`10.x`、`172.16.x`-`172.31.x`、`192.168.x`、`169.254.x`、`fc00::/7` 或 `fd00::/8` 用作 `publicUrl`。

Twilio 通知模式出站通话在 create-call 请求中直接发送初始 `<Say>` TwiML，因此第一条口语消息不依赖 Twilio 获取 webhook TwiML。对于状态回调、对话通话、预连接 DTMF、实时流和连接后通话控制，仍然需要公共 webhook。

使用一个公共暴露路径：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          publicUrl: "https://voice.example.com/voice/webhook",
          // or
          tunnel: { provider: "ngrok" },
          // or
          tailscale: { mode: "funnel", path: "/voice/webhook" },
        },
      },
    },
  },
}
```

更改配置后，重启或重载 Gateway，然后运行：

```bash
openclaw voicecall setup
openclaw voicecall smoke
```

`voicecall smoke` 是演习，除非你传递 `--yes`。

### 提供商凭据失败

检查所选提供商和所需的凭据字段：

- Twilio：`twilio.accountSid`、`twilio.authToken` 和 `fromNumber`，或 `TWILIO_ACCOUNT_SID`、`TWILIO_AUTH_TOKEN` 和 `TWILIO_FROM_NUMBER`。
- Telnyx：`telnyx.apiKey`、`telnyx.connectionId`、`telnyx.publicKey` 和 `fromNumber`。
- Plivo：`plivo.authId`、`plivo.authToken` 和 `fromNumber`。

凭据必须存在于 Gateway 主机上。编辑本地 shell 配置文件不会影响已经运行的 Gateway，直到它重启或重新加载其环境。

### 通话开始但提供商 webhook 未到达

确认提供商控制台指向确切的公共 webhook URL：

```text
https://voice.example.com/voice/webhook
```

然后检查运行时状态：

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw logs --follow
```

常见原因：

- `publicUrl` 指向与 `serve.path` 不同的路径。
- 隧道 URL 在 Gateway 启动后发生了变化。
- 代理转发请求但剥离或重写了 host/proto 头。
- 防火墙或 DNS 将公共主机名路由到 Gateway 以外的地方。
- Gateway 在未启用 Voice Call 插件的情况下重启。

当反向代理或隧道位于 Gateway 前面时，将 `webhookSecurity.allowedHosts` 设置为公共主机名，或对已知代理地址使用 `webhookSecurity.trustedProxyIPs`。仅当代理边界在你的控制之下时才使用 `webhookSecurity.trustForwardingHeaders`。

### 签名验证失败

提供商签名是根据 OpenClaw 从传入请求重建的公共 URL 进行检查的。如果签名失败：

- 确认提供商 webhook URL 与 `publicUrl` 完全匹配，包括 scheme、主机和路径。
- 对于 ngrok 免费层 URL，当隧道主机名更改时更新 `publicUrl`。
- 确保代理保留原始主机和 proto 头，或配置 `webhookSecurity.allowedHosts`。
- 不要在本地测试之外启用 `skipSignatureVerification`。

### Google Meet Twilio 加入失败

Google Meet 使用此插件进行 Twilio 拨入加入。首先验证 Voice Call：

```bash
openclaw voicecall setup
openclaw voicecall smoke --to "+15555550123"
```

然后明确验证 Google Meet 传输：

```bash
openclaw googlemeet setup --transport twilio
```

如果 Voice Call 正常但 Meet 参与者从未加入，请检查 Meet 拨入号码、PIN 和 `--dtmf-sequence`。电话可以正常，而会议拒绝或忽略不正确的 DTMF 序列。

Google Meet 将 Meet DTMF 序列和介绍文本传递给 `voicecall.start`。对于 Twilio 通话，Voice Call 先发送 DTMF TwiML，重定向回 webhook，然后打开实时媒体流，因此在电话参与者加入会议后生成保存的介绍。

使用 `openclaw logs --follow` 获取实时阶段跟踪。健康的 Twilio Meet 加入日志顺序如下：

- Google Meet 将 Twilio 加入委托给 Voice Call。
- Voice Call 存储预连接 DTMF TwiML。
- Twilio 初始 TwiML 在实时处理之前被消费和提供。
- Voice Call 为 Twilio 通话提供实时 TwiML。
- 实时桥接以初始问候排队启动。

`openclaw voicecall tail` 仍然显示持久化的通话记录；它对通话状态和转录很有用，但不是每个 webhook/实时过渡都出现在那里。

### 实时通话没有语音

确认只有一种音频模式启用。`realtime.enabled` 和 `streaming.enabled` 不能同时为 true。

对于实时 Twilio 通话，还要验证：

- 实时提供商插件已加载并注册。
- `realtime.provider` 未设置或命名了已注册的提供商。
- 提供商 API 密钥对 Gateway 进程可用。
- `openclaw logs --follow` 显示已提供实时 TwiML、实时桥接已启动和初始问候已排队。

## 相关文档

- [Talk 模式](/nodes/talk)
- [文本转语音](/tools/tts)
- [语音唤醒](/nodes/voicewake)
