---
summary: "在 OpenClaw 中使用 Vydra 图像、视频和语音"
read_when:
  - 你想在 OpenClaw 中使用 Vydra 媒体生成
  - 你需要 Vydra API 密钥设置指南
title: "Vydra"
---

捆绑的 Vydra 插件添加了：

- 通过 `vydra/grok-imagine` 进行图像生成
- 通过 `vydra/veo3` 和 `vydra/kling` 进行视频生成
- 通过 Vydra 的 ElevenLabs 支持的 TTS 路由进行语音合成

OpenClaw 对所有三种功能使用相同的 `VYDRA_API_KEY`。

<Warning>
请使用 `https://www.vydra.ai/api/v1` 作为基础 URL。

Vydra 的顶级域名主机（`https://vydra.ai/api/v1`）当前重定向到 `www`。某些 HTTP 客户端在该跨主机重定向时会丢弃 `Authorization`，导致有效的 API 密钥产生误导性的认证失败。捆绑的插件直接使用 `www` 基础 URL 以避免这种情况。
</Warning>

## 设置

<Steps>
  <Step title="运行交互式引导程序">
    ```bash
    openclaw onboard --auth-choice vydra-api-key
    ```

    或直接设置环境变量：

    ```bash
    export VYDRA_API_KEY="vydra_live_..."
    ```

  </Step>
  <Step title="选择默认功能">
    从下方选择一种或多种功能（图像、视频或语音），并应用相应的配置。
  </Step>
</Steps>

## 功能

<AccordionGroup>
  <Accordion title="图像生成">
    默认图像模型：

    - `vydra/grok-imagine`

    将其设置为默认图像提供商：

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "vydra/grok-imagine",
          },
        },
      },
    }
    ```

    当前捆绑支持仅限文本转图像。Vydra 的托管编辑路由需要远程图像 URL，且捆绑插件尚未添加 Vydra 特定的上传桥接。

    <Note>
    有关共享工具参数、提供商选择和故障转移行为，请参见[图像生成](/tools/image-generation)。
    </Note>

  </Accordion>

  <Accordion title="视频生成">
    已注册的视频模型：

    - `vydra/veo3` 用于文本转视频
    - `vydra/kling` 用于图像转视频

    将 Vydra 设置为默认视频提供商：

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "vydra/veo3",
          },
        },
      },
    }
    ```

    说明：

    - `vydra/veo3` 捆绑为仅文本转视频。
    - `vydra/kling` 目前需要远程图像 URL 引用。本地文件上传会被提前拒绝。
    - Vydra 当前的 `kling` HTTP 路由在是否需要 `image_url` 或 `video_url` 方面一直不一致；捆绑的提供商将同一远程图像 URL 映射到两个字段中。
    - 捆绑的插件保持保守，不转发未记录的样式旋钮，如宽高比、分辨率、水印或生成的音频。

    <Note>
    有关共享工具参数、提供商选择和故障转移行为，请参见[视频生成](/tools/video-generation)。
    </Note>

  </Accordion>

  <Accordion title="视频实时测试">
    提供商特定的实时覆盖：

    ```bash
    OPENCLAW_LIVE_TEST=1 \
    OPENCLAW_LIVE_VYDRA_VIDEO=1 \
    pnpm test:live -- extensions/vydra/vydra.live.test.ts
    ```

    捆绑的 Vydra 实时文件现在涵盖：

    - `vydra/veo3` 文本转视频
    - `vydra/kling` 使用远程图像 URL 进行图像转视频

    需要时覆盖远程图像固定资源：

    ```bash
    export OPENCLAW_LIVE_VYDRA_KLING_IMAGE_URL="https://example.com/reference.png"
    ```

  </Accordion>

  <Accordion title="语音合成">
    将 Vydra 设置为语音提供商：

    ```json5
    {
      messages: {
        tts: {
          provider: "vydra",
          providers: {
            vydra: {
              apiKey: "${VYDRA_API_KEY}",
              voiceId: "21m00Tcm4TlvDq8ikWAM",
            },
          },
        },
      },
    }
    ```

    默认值：

    - 模型：`elevenlabs/tts`
    - 语音 id：`21m00Tcm4TlvDq8ikWAM`

    捆绑的插件目前提供一个已知良好的默认语音，并返回 MP3 音频文件。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="提供商目录" href="/providers/index" icon="list">
    浏览所有可用的提供商。
  </Card>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值和模型配置。
  </Card>
</CardGroup>
