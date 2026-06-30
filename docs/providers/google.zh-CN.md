---
summary: "Google Gemini 设置（API 密钥 + OAuth、图像生成、媒体理解、TTS、网络搜索）"
title: "Google（Gemini）"
read_when:
  - 您想在 OpenClaw 中使用 Google Gemini 模型
  - 您需要 API 密钥或 OAuth 认证流程
---

Google 插件通过 Google AI Studio 提供对 Gemini 模型的访问，以及图像生成、媒体理解（图像/音频/视频）、文本转语音和通过 Gemini Grounding 进行网络搜索功能。

- 提供商：`google`
- 认证：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API：Google Gemini API
- 运行时选项：`agents.defaults.agentRuntime.id: "google-gemini-cli"` 复用 Gemini CLI OAuth，同时保持模型引用规范为 `google/*`。

## 快速开始

选择您偏好的认证方式并按步骤设置。

<Tabs>
  <Tab title="API 密钥">
    **适合：** 通过 Google AI Studio 进行标准 Gemini API 访问。

    <Steps>
      <Step title="运行引导程序">
        ```bash
        openclaw onboard --auth-choice gemini-api-key
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --non-interactive \
          --mode local \
          --auth-choice gemini-api-key \
          --gemini-api-key "$GEMINI_API_KEY"
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "google/gemini-3.1-pro-preview" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    <Tip>
    环境变量 `GEMINI_API_KEY` 和 `GOOGLE_API_KEY` 均被接受。使用您已配置的任意一个即可。
    </Tip>

  </Tab>

  <Tab title="Gemini CLI（OAuth）">
    **适合：** 通过 PKCE OAuth 复用现有的 Gemini CLI 登录，无需单独的 API 密钥。

    <Warning>
    `google-gemini-cli` 提供商是非官方集成。部分用户反映以这种方式使用 OAuth 时账户受到限制。请自行承担风险使用。
    </Warning>

    <Steps>
      <Step title="安装 Gemini CLI">
        本地的 `gemini` 命令必须在 `PATH` 中可用。

        ```bash
        # Homebrew
        brew install gemini-cli

        # 或 npm
        npm install -g @google/gemini-cli
        ```

        OpenClaw 支持 Homebrew 安装和全局 npm 安装，包括常见的 Windows/npm 布局。
      </Step>
      <Step title="通过 OAuth 登录">
        ```bash
        openclaw models auth login --provider google-gemini-cli --set-default
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    - 默认模型：`google/gemini-3.1-pro-preview`
    - 运行时：`google-gemini-cli`
    - 别名：`gemini-cli`

    Gemini 3.1 Pro 的 Gemini API 模型 ID 为 `gemini-3.1-pro-preview`。OpenClaw 接受较短的 `google/gemini-3.1-pro` 作为便捷别名，并在提供商调用前进行规范化。

    **环境变量：**

    - `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
    - `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

    （或 `GEMINI_CLI_*` 变体。）

    <Note>
    如果登录后 Gemini CLI OAuth 请求失败，请在网关主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID` 并重试。
    </Note>

    <Note>
    如果登录在浏览器流程开始之前失败，请确保本地 `gemini` 命令已安装并在 `PATH` 中。
    </Note>

    `google-gemini-cli/*` 模型引用是旧版兼容别名。新配置应使用 `google/*` 模型引用，并在需要本地 Gemini CLI 执行时使用 `google-gemini-cli` 运行时。

  </Tab>
</Tabs>

## 功能

| 功能                  | 是否支持                      |
| --------------------- | ----------------------------- |
| 聊天补全              | 是                            |
| 图像生成              | 是                            |
| 音乐生成              | 是                            |
| 文本转语音            | 是                            |
| 实时语音              | 是（Google Live API）         |
| 图像理解              | 是                            |
| 音频转录              | 是                            |
| 视频理解              | 是                            |
| 网络搜索（Grounding） | 是                            |
| 思考/推理             | 是（Gemini 2.5+ / Gemini 3+） |
| Gemma 4 模型          | 是                            |

## 网络搜索

内置的 `gemini` 网络搜索提供商使用 Gemini Google 搜索 Grounding。在 `plugins.entries.google.config.webSearch` 下配置专用搜索密钥，或让其在 `GEMINI_API_KEY` 之后复用 `models.providers.google.apiKey`：

```json5
{
  plugins: {
    entries: {
      google: {
        config: {
          webSearch: {
            apiKey: "AIza...", // 如果设置了 GEMINI_API_KEY 或 models.providers.google.apiKey，则可选
            baseUrl: "https://generativelanguage.googleapis.com/v1beta", // 回退到 models.providers.google.baseUrl
            model: "gemini-2.5-flash",
          },
        },
      },
    },
  },
}
```

凭据优先级：专用 `webSearch.apiKey`，然后是 `GEMINI_API_KEY`，然后是 `models.providers.google.apiKey`。`webSearch.baseUrl` 是可选的，适用于运营商代理或兼容的 Gemini API 端点；省略时，Gemini 网络搜索复用 `models.providers.google.baseUrl`。有关提供商特定工具行为，请参见 [Gemini 搜索](/tools/gemini-search)。

<Tip>
Gemini 3 模型使用 `thinkingLevel` 而非 `thinkingBudget`。OpenClaw 将 Gemini 3、Gemini 3.1 和 `gemini-*-latest` 别名的推理控制映射到 `thinkingLevel`，使默认/低延迟运行不会发送已禁用的 `thinkingBudget` 值。

`/think adaptive` 保持 Google 的动态思考语义，而非选择固定的 OpenClaw 级别。Gemini 3 和 Gemini 3.1 省略固定的 `thinkingLevel`，让 Google 自行选择级别；Gemini 2.5 发送 Google 的动态哨兵值 `thinkingBudget: -1`。

Gemma 4 模型（例如 `gemma-4-26b-a4b-it`）支持思考模式。OpenClaw 将 `thinkingBudget` 重写为 Gemma 4 支持的 Google `thinkingLevel`。将思考设置为 `off` 会保持思考禁用，而不是映射到 `MINIMAL`。
</Tip>

## 图像生成

内置的 `google` 图像生成提供商默认使用 `google/gemini-3.1-flash-image-preview`。

- 也支持 `google/gemini-3-pro-image-preview`
- 生成：每次请求最多 4 张图像
- 编辑模式：已启用，最多 5 张输入图像
- 几何控制：`size`、`aspectRatio` 和 `resolution`

要将 Google 设置为默认图像提供商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "google/gemini-3.1-flash-image-preview",
      },
    },
  },
}
```

<Note>
共享工具参数、提供商选择和故障转移行为，请参见[图像生成](/tools/image-generation)。
</Note>

## 视频生成

内置的 `google` 插件还通过共享 `video_generate` 工具注册了视频生成。

- 默认视频模型：`google/veo-3.1-fast-generate-preview`
- 模式：文本转视频、图像转视频和单视频参考流程
- 支持 `aspectRatio`、`resolution` 和 `audio`
- 当前时长限制：**4 到 8 秒**

要将 Google 设置为默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
      },
    },
  },
}
```

<Note>
共享工具参数、提供商选择和故障转移行为，请参见[视频生成](/tools/video-generation)。
</Note>

## 音乐生成

内置的 `google` 插件还通过共享 `music_generate` 工具注册了音乐生成。

- 默认音乐模型：`google/lyria-3-clip-preview`
- 也支持 `google/lyria-3-pro-preview`
- 提示控制：`lyrics` 和 `instrumental`
- 输出格式：默认 `mp3`，`google/lyria-3-pro-preview` 还支持 `wav`
- 参考输入：最多 10 张图像
- 会话支持的运行通过共享任务/状态流程分离，包括 `action: "status"`

要将 Google 设置为默认音乐提供商：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
      },
    },
  },
}
```

<Note>
共享工具参数、提供商选择和故障转移行为，请参见[音乐生成](/tools/music-generation)。
</Note>

## 文本转语音

内置的 `google` 语音提供商使用 Gemini API TTS 路径，基于 `gemini-3.1-flash-tts-preview`。

- 默认语音：`Kore`
- 认证：`messages.tts.providers.google.apiKey`、`models.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- 输出：常规 TTS 附件使用 WAV，语音备注目标使用 Opus，Talk/电话通信使用 PCM
- 语音备注输出：Google PCM 被包装为 WAV，并使用 `ffmpeg` 转码为 48 kHz Opus

要将 Google 设置为默认 TTS 提供商：

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "google",
      providers: {
        google: {
          model: "gemini-3.1-flash-tts-preview",
          voiceName: "Kore",
          audioProfile: "Speak professionally with a calm tone.",
        },
      },
    },
  },
}
```

Gemini API TTS 使用自然语言提示进行风格控制。设置 `audioProfile` 可在朗读文本前添加可复用的风格提示。当提示文本引用命名发言者时，请设置 `speakerName`。

Gemini API TTS 还接受文本中的表达方括号音频标签，例如 `[whispers]` 或 `[laughs]`。要将标签排除在可见聊天回复之外，同时将其发送给 TTS，请将其放在 `[[tts:text]]...[[/tts:text]]` 块内：

```text
这是干净的回复文本。

[[tts:text]][whispers] 这是朗读版本。[[/tts:text]]
```

<Note>
限制为 Gemini API 的 Google Cloud Console API 密钥对该提供商有效。这不是单独的 Cloud 文本转语音 API 路径。
</Note>

## 实时语音

内置的 `google` 插件注册了一个由 Gemini Live API 支持的实时语音提供商，适用于语音通话和 Google Meet 等后端音频桥接。

| 设置           | 配置路径                                                            | 默认值                                                                        |
| -------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 模型           | `plugins.entries.voice-call.config.realtime.providers.google.model` | `gemini-2.5-flash-native-audio-preview-12-2025`                               |
| 语音           | `...google.voice`                                                   | `Kore`                                                                        |
| 温度           | `...google.temperature`                                             | （未设置）                                                                    |
| VAD 开始灵敏度 | `...google.startSensitivity`                                        | （未设置）                                                                    |
| VAD 结束灵敏度 | `...google.endSensitivity`                                          | （未设置）                                                                    |
| 静音时长       | `...google.silenceDurationMs`                                       | （未设置）                                                                    |
| 活动处理       | `...google.activityHandling`                                        | Google 默认，`start-of-activity-interrupts`                                   |
| 轮次覆盖       | `...google.turnCoverage`                                            | Google 默认，`only-activity`                                                  |
| 禁用自动 VAD   | `...google.automaticActivityDetectionDisabled`                      | `false`                                                                       |
| 会话恢复       | `...google.sessionResumption`                                       | `true`                                                                        |
| 上下文压缩     | `...google.contextWindowCompression`                                | `true`                                                                        |
| API 密钥       | `...google.apiKey`                                                  | 回退到 `models.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY` |

语音通话实时配置示例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          realtime: {
            enabled: true,
            provider: "google",
            providers: {
              google: {
                model: "gemini-2.5-flash-native-audio-preview-12-2025",
                voice: "Kore",
                activityHandling: "start-of-activity-interrupts",
                turnCoverage: "only-activity",
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
Google Live API 通过 WebSocket 使用双向音频和函数调用。OpenClaw 将电话/Meet 桥接音频适配为 Gemini 的 PCM Live API 流，并在共享的实时语音合约上保持工具调用。除非需要采样变化，否则不要设置 `temperature`；OpenClaw 会省略非正值，因为 Google Live 对 `temperature: 0` 可能返回无音频的转录。在此 API 路径上，Gemini API 转录不带 `languageCodes` 启用；当前 Google SDK 拒绝此 API 路径上的语言代码提示。
</Note>

<Note>
Control UI Talk 支持带有受限单次使用 token 的 Google Live 浏览器会话。仅后端的实时语音提供商也可以通过通用 Gateway 中继传输运行，将提供商凭据保留在 Gateway 上。
</Note>

如需维护人员实时验证，运行 `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`。Google 分支铸造与 Control UI Talk 使用的相同受限 Live API token 形状，打开浏览器 WebSocket 端点，发送初始设置载荷，并等待 `setupComplete`。

## 高级配置

<AccordionGroup>
  <Accordion title="直接 Gemini 缓存复用">
    对于直接 Gemini API 运行（`api: "google-generative-ai"`），OpenClaw 将配置的 `cachedContent` 句柄传递给 Gemini 请求。

    - 通过 `cachedContent` 或旧版 `cached_content` 配置每模型或全局参数
    - 如果两者都存在，`cachedContent` 优先
    - 示例值：`cachedContents/prebuilt-context`
    - Gemini 缓存命中使用情况从上游 `cachedContentTokenCount` 规范化为 OpenClaw `cacheRead`

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "google/gemini-2.5-pro": {
              params: {
                cachedContent: "cachedContents/prebuilt-context",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Gemini CLI JSON 使用说明">
    使用 `google-gemini-cli` OAuth 提供商时，OpenClaw 按如下方式规范化 CLI JSON 输出：

    - 回复文本来自 CLI JSON 的 `response` 字段。
    - 当 CLI 的 `usage` 为空时，使用情况回退到 `stats`。
    - `stats.cached` 规范化为 OpenClaw `cacheRead`。
    - 如果 `stats.input` 缺失，OpenClaw 从 `stats.input_tokens - stats.cached` 推导输入 token。

  </Accordion>

  <Accordion title="环境和守护进程设置">
    如果网关作为守护进程运行（launchd/systemd），请确保 `GEMINI_API_KEY` 对该进程可用（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相关链接

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="音乐生成" href="/tools/music-generation" icon="music">
    共享音乐工具参数和提供商选择。
  </Card>
</CardGroup>
