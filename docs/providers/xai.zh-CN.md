---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - 你想在 OpenClaw 中使用 Grok 模型
  - 你正在配置 xAI 认证或模型 id
title: "xAI"
---

OpenClaw 为 Grok 模型附带了捆绑的 `xai` 提供商插件。

## 快速开始

<Steps>
  <Step title="创建 API 密钥">
    在 [xAI 控制台](https://console.x.ai/) 创建 API 密钥。
  </Step>
  <Step title="设置 API 密钥">
    设置 `XAI_API_KEY`，或运行：

    ```bash
    openclaw onboard --auth-choice xai-api-key
    ```

  </Step>
  <Step title="选择模型">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4.3" } } },
    }
    ```
  </Step>
</Steps>

<Note>
OpenClaw 使用 xAI Responses API 作为捆绑的 xAI 传输方式。同一 `XAI_API_KEY` 还可以驱动 Grok 支持的 `web_search`、一流的 `x_search` 和远程 `code_execution`。
如果你将 xAI 密钥存储在 `plugins.entries.xai.config.webSearch.apiKey` 下，捆绑的 xAI 模型提供商也会将该密钥作为备用。
设置 `plugins.entries.xai.config.webSearch.baseUrl` 可以通过运营商 xAI Responses 代理路由 Grok `web_search` 以及默认情况下的 `x_search`。
`code_execution` 调整位于 `plugins.entries.xai.config.codeExecution` 下。
</Note>

## 内置目录

OpenClaw 开箱即包含以下 xAI 模型系列：

| 系列           | 模型 id                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| Grok 3         | `grok-3`、`grok-3-fast`、`grok-3-mini`、`grok-3-mini-fast`               |
| Grok 4.3       | `grok-4.3`                                                               |
| Grok 4         | `grok-4`、`grok-4-0709`                                                  |
| Grok 4 Fast    | `grok-4-fast`、`grok-4-fast-non-reasoning`                               |
| Grok 4.1 Fast  | `grok-4-1-fast`、`grok-4-1-fast-non-reasoning`                           |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`、`grok-4.20-beta-latest-non-reasoning` |
| Grok Code      | `grok-code-fast-1`                                                       |

当新的 `grok-4*` 和 `grok-code-fast*` id 遵循相同 API 形态时，插件还会前向解析它们。

<Tip>
`grok-4.3`、`grok-4-fast`、`grok-4-1-fast` 和 `grok-4.20-beta-*` 变体是捆绑目录中当前支持图像的 Grok 引用。
</Tip>

## OpenClaw 功能覆盖

捆绑的插件将 xAI 当前公开 API 接口映射到 OpenClaw 的共享提供商和工具合约。不符合共享合约的功能（例如流式 TTS 和实时语音）未被暴露——见下表。

| xAI 功能         | OpenClaw 接口                          | 状态                                             |
| ---------------- | -------------------------------------- | ------------------------------------------------ |
| 聊天 / Responses | `xai/<model>` 模型提供商               | 是                                               |
| 服务端网络搜索   | `web_search` 提供商 `grok`             | 是                                               |
| 服务端 X 搜索    | `x_search` 工具                        | 是                                               |
| 服务端代码执行   | `code_execution` 工具                  | 是                                               |
| 图像             | `image_generate`                       | 是                                               |
| 视频             | `video_generate`                       | 是                                               |
| 批量文本转语音   | `messages.tts.provider: "xai"` / `tts` | 是                                               |
| 流式 TTS         | —                                      | 未暴露；OpenClaw 的 TTS 合约返回完整的音频缓冲区 |
| 批量语音转文字   | `tools.media.audio` / 媒体理解         | 是                                               |
| 流式语音转文字   | 语音通话 `streaming.provider: "xai"`   | 是                                               |
| 实时语音         | —                                      | 尚未暴露；不同的会话/WebSocket 合约              |
| 文件 / 批处理    | 仅通用模型 API 兼容性                  | 非 OpenClaw 一流工具                             |

<Note>
OpenClaw 使用 xAI 的 REST 图像/视频/TTS/STT API 进行媒体生成、语音和批量转录，使用 xAI 流式 STT WebSocket 进行实时语音通话转录，以及 Responses API 用于模型、搜索和代码执行工具。需要不同 OpenClaw 合约的功能（如实时语音会话）在此以上游功能记录，而非隐藏的插件行为。
</Note>

### 快速模式映射

`/fast on` 或 `agents.defaults.models["xai/<model>"].params.fastMode: true` 按如下方式重写原生 xAI 请求：

| 源模型        | 快速模式目标       |
| ------------- | ------------------ |
| `grok-3`      | `grok-3-fast`      |
| `grok-3-mini` | `grok-3-mini-fast` |
| `grok-4`      | `grok-4-fast`      |
| `grok-4-0709` | `grok-4-fast`      |

### 旧版兼容别名

旧版别名仍规范化为捆绑的规范 id：

| 旧版别名                  | 规范 id                               |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## 功能

<AccordionGroup>
  <Accordion title="网络搜索">
    捆绑的 `grok` 网络搜索提供商也使用 `XAI_API_KEY`：

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="视频生成">
    捆绑的 `xai` 插件通过共享的 `video_generate` 工具注册视频生成。

    - 默认视频模型：`xai/grok-imagine-video`
    - 模式：文本转视频、图像转视频、参考图像生成、远程视频编辑和远程视频延伸
    - 宽高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`
    - 分辨率：`480P`、`720P`
    - 时长：生成/图像转视频为 1-15 秒，使用 `reference_image` 角色时为 1-10 秒，延伸为 2-10 秒
    - 参考图像生成：将每张提供图像的 `imageRoles` 设置为 `reference_image`；xAI 最多接受 7 张此类图像

    <Warning>
    不接受本地视频缓冲区。视频编辑/延伸输入请使用远程 `http(s)` URL。图像转视频接受本地图像缓冲区，因为 OpenClaw 可以将其编码为 xAI 的数据 URL。
    </Warning>

    将 xAI 设置为默认视频提供商：

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "xai/grok-imagine-video",
          },
        },
      },
    }
    ```

    <Note>
    有关共享工具参数、提供商选择和故障转移行为，请参见[视频生成](/tools/video-generation)。
    </Note>

  </Accordion>

  <Accordion title="图像生成">
    捆绑的 `xai` 插件通过共享的 `image_generate` 工具注册图像生成。

    - 默认图像模型：`xai/grok-imagine-image`
    - 附加模型：`xai/grok-imagine-image-pro`
    - 模式：文本转图像和参考图像编辑
    - 参考输入：1 张 `image` 或最多 5 张 `images`
    - 宽高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 分辨率：`1K`、`2K`
    - 数量：最多 4 张图像

    OpenClaw 向 xAI 请求 `b64_json` 图像响应，以便生成的媒体可以通过正常的频道附件路径存储和交付。本地参考图像转换为数据 URL；远程 `http(s)` 引用直接传递。

    将 xAI 设置为默认图像提供商：

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "xai/grok-imagine-image",
          },
        },
      },
    }
    ```

    <Note>
    xAI 还记录了 `quality`、`mask`、`user` 以及额外的原生比例如 `1:2`、`2:1`、`9:20` 和 `20:9`。OpenClaw 目前只通过 `image_generate` 转发共享的跨提供商图像控制；不支持的仅原生旋钮有意不暴露。
    </Note>

  </Accordion>

  <Accordion title="文本转语音">
    捆绑的 `xai` 插件通过共享的 `tts` 提供商接口注册文本转语音。

    - 语音：`eve`、`ara`、`rex`、`sal`、`leo`、`una`
    - 默认语音：`eve`
    - 格式：`mp3`、`wav`、`pcm`、`mulaw`、`alaw`
    - 语言：BCP-47 代码或 `auto`
    - 速度：提供商原生速度覆盖
    - 不支持原生 Opus 语音消息格式

    将 xAI 设置为默认 TTS 提供商：

    ```json5
    {
      messages: {
        tts: {
          provider: "xai",
          providers: {
            xai: {
              voiceId: "eve",
            },
          },
        },
      },
    }
    ```

    <Note>
    OpenClaw 使用 xAI 的批量 `/v1/tts` 端点。xAI 还提供 WebSocket 流式 TTS，但 OpenClaw 语音提供商合约目前期望在回复交付前有完整的音频缓冲区。
    </Note>

  </Accordion>

  <Accordion title="语音转文字">
    捆绑的 `xai` 插件通过 OpenClaw 的媒体理解转录接口注册批量语音转文字。

    - 默认模型：`grok-stt`
    - 端点：xAI REST `/v1/stt`
    - 输入路径：多部分音频文件上传
    - OpenClaw 中凡使用 `tools.media.audio` 的入站音频转录均支持，包括 Discord 语音频道片段和频道音频附件

    强制 xAI 用于入站音频转录：

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "xai",
                model: "grok-stt",
              },
            ],
          },
        },
      },
    }
    ```

    语言可以通过共享音频媒体配置或每次调用的转录请求提供。共享 OpenClaw 接口接受提示提示，但 xAI REST STT 集成只转发文件、模型和语言，因为这些映射清晰地对应到当前公开的 xAI 端点。

  </Accordion>

  <Accordion title="流式语音转文字">
    捆绑的 `xai` 插件还为实时语音通话音频注册了实时转录提供商。

    - 端点：xAI WebSocket `wss://api.x.ai/v1/stt`
    - 默认编码：`mulaw`
    - 默认采样率：`8000`
    - 默认端点检测：`800ms`
    - 中间转录：默认启用

    语音通话的 Twilio 媒体流发送 G.711 µ-law 音频帧，因此 xAI 提供商可以直接转发这些帧而无需转码：

    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              streaming: {
                enabled: true,
                provider: "xai",
                providers: {
                  xai: {
                    apiKey: "${XAI_API_KEY}",
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

    提供商拥有的配置位于 `plugins.entries.voice-call.config.streaming.providers.xai` 下。支持的键为 `apiKey`、`baseUrl`、`sampleRate`、`encoding`（`pcm`、`mulaw` 或 `alaw`）、`interimResults`、`endpointingMs` 和 `language`。

    <Note>
    此流式提供商用于语音通话的实时转录路径。Discord 语音目前录制短片段，并使用批量 `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="x_search 配置">
    捆绑的 xAI 插件将 `x_search` 暴露为 OpenClaw 工具，用于通过 Grok 搜索 X（前 Twitter）内容。

    配置路径：`plugins.entries.xai.config.xSearch`

    | 键                 | 类型    | 默认值             | 说明                                 |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | —                  | 启用或禁用 x_search                  |
    | `model`            | string  | `grok-4-1-fast`    | x_search 请求使用的模型              |
    | `baseUrl`          | string  | —                  | xAI Responses 基础 URL 覆盖          |
    | `inlineCitations`  | boolean | —                  | 在结果中包含内联引用                 |
    | `maxTurns`         | number  | —                  | 最大对话轮数                         |
    | `timeoutSeconds`   | number  | —                  | 请求超时（秒）                       |
    | `cacheTtlMinutes`  | number  | —                  | 缓存生存时间（分钟）                 |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4-1-fast",
                baseUrl: "https://api.x.ai/v1",
                inlineCitations: true,
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="代码执行配置">
    捆绑的 xAI 插件将 `code_execution` 暴露为 OpenClaw 工具，用于在 xAI 的沙箱环境中远程执行代码。

    配置路径：`plugins.entries.xai.config.codeExecution`

    | 键               | 类型    | 默认值                    | 说明                                 |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true`（如果密钥可用）    | 启用或禁用代码执行               |
    | `model`           | string  | `grok-4-1-fast`    | 代码执行请求使用的模型           |
    | `maxTurns`        | number  | —                  | 最大对话轮数                         |
    | `timeoutSeconds`  | number  | —                  | 请求超时（秒）                       |

    <Note>
    这是远程 xAI 沙箱执行，而非本地 [`exec`](/tools/exec)。
    </Note>

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4-1-fast",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="已知限制">
    - 目前认证仅限 API 密钥。OpenClaw 中尚无 xAI OAuth 或设备码流程。
    - `grok-4.20-multi-agent-experimental-beta-0304` 在普通 xAI 提供商路径上不受支持，因为它需要与标准 OpenClaw xAI 传输不同的上游 API 接口。
    - xAI 实时语音尚未注册为 OpenClaw 提供商。它需要与批量 STT 或流式转录不同的双向语音会话合约。
    - xAI 图像 `quality`、图像 `mask` 和额外的仅原生宽高比尚未暴露，直到共享的 `image_generate` 工具有相应的跨提供商控制。
  </Accordion>

  <Accordion title="高级说明">
    - OpenClaw 在共享运行器路径上自动应用 xAI 特定的工具架构和工具调用兼容性修复。
    - 原生 xAI 请求默认 `tool_stream: true`。将 `agents.defaults.models["xai/<model>"].params.tool_stream` 设置为 `false` 可禁用它。
    - 捆绑的 xAI 包装器在发送原生 xAI 请求之前会去除不支持的严格工具架构标志和推理负载键。
    - `web_search`、`x_search` 和 `code_execution` 作为 OpenClaw 工具暴露。OpenClaw 在每个工具请求中启用它需要的特定 xAI 内置工具，而不是将所有原生工具附加到每个聊天轮次。
    - Grok `web_search` 读取 `plugins.entries.xai.config.webSearch.baseUrl`。`x_search` 读取 `plugins.entries.xai.config.xSearch.baseUrl`，然后回退到 Grok 网络搜索基础 URL。
    - `x_search` 和 `code_execution` 由捆绑的 xAI 插件拥有，而非硬编码到核心模型运行时。
    - `code_execution` 是远程 xAI 沙箱执行，而非本地 [`exec`](/tools/exec)。
  </Accordion>
</AccordionGroup>

## 实时测试

xAI 媒体路径由单元测试和可选加入的实时套件覆盖。实时命令在探测 `XAI_API_KEY` 之前从你的登录 shell（包括 `~/.profile`）加载密钥。

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

提供商特定的实时文件综合测试普通 TTS、电话友好的 PCM TTS、通过 xAI 批量 STT 转录音频、通过 xAI 实时 STT 流式传输相同的 PCM、生成文本转图像输出并编辑参考图像。共享图像实时文件通过 OpenClaw 的运行时选择、回退、规范化和媒体附件路径验证相同的 xAI 提供商。

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="所有提供商" href="/providers/index" icon="grid-2">
    更广泛的提供商概述。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常见问题和修复方案。
  </Card>
</CardGroup>
