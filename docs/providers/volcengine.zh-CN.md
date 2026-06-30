---
summary: "火山引擎设置（Doubao 模型、编程端点和 Seed Speech TTS）"
title: "Volcengine（Doubao）"
read_when:
  - 你想在 OpenClaw 中使用火山引擎或 Doubao 模型
  - 你需要 Volcengine API 密钥设置
  - 你想使用火山引擎语音文本转语音
---

火山引擎提供商提供对 Doubao 模型和火山引擎托管的第三方模型的访问，针对通用和编程工作负载提供独立端点。同一捆绑插件还可以将火山引擎 Speech 注册为 TTS 提供商。

| 详情     | 值                                                         |
| -------- | ---------------------------------------------------------- |
| 提供商   | `volcengine`（通用 + TTS）+ `volcengine-plan`（编程）      |
| 模型认证 | `VOLCANO_ENGINE_API_KEY`                                   |
| TTS 认证 | `VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY` |
| API      | OpenAI 兼容模型、BytePlus Seed Speech TTS                  |

## 快速开始

<Steps>
  <Step title="设置 API 密钥">
    运行交互式引导程序：

    ```bash
    openclaw onboard --auth-choice volcengine-api-key
    ```

    这会从单个 API 密钥注册通用（`volcengine`）和编程（`volcengine-plan`）两个提供商。

  </Step>
  <Step title="设置默认模型">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "volcengine-plan/ark-code-latest" },
        },
      },
    }
    ```
  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider volcengine
    openclaw models list --provider volcengine-plan
    ```
  </Step>
</Steps>

<Tip>
对于非交互式设置（CI、脚本），直接传入密钥：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice volcengine-api-key \
  --volcengine-api-key "$VOLCANO_ENGINE_API_KEY"
```

</Tip>

## 提供商和端点

| 提供商            | 端点                                      | 使用场景 |
| ----------------- | ----------------------------------------- | -------- |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | 通用模型 |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | 编程模型 |

<Note>
两个提供商均从单个 API 密钥配置。设置会自动注册两者。
</Note>

## 内置目录

<Tabs>
  <Tab title="通用（volcengine）">
    | 模型引用                                     | 名称                            | 输入        | 上下文  |
    | -------------------------------------------- | ------------------------------- | ----------- | ------- |
    | `volcengine/doubao-seed-1-8-251228`          | Doubao Seed 1.8                 | text、image | 256,000 |
    | `volcengine/doubao-seed-code-preview-251028` | doubao-seed-code-preview-251028 | text、image | 256,000 |
    | `volcengine/kimi-k2-5-260127`                | Kimi K2.5                       | text、image | 256,000 |
    | `volcengine/glm-4-7-251222`                  | GLM 4.7                         | text、image | 200,000 |
    | `volcengine/deepseek-v3-2-251201`            | DeepSeek V3.2                   | text、image | 128,000 |
  </Tab>
  <Tab title="编程（volcengine-plan）">
    | 模型引用                                          | 名称                     | 输入 | 上下文  |
    | ------------------------------------------------- | ------------------------ | ----- | ------- |
    | `volcengine-plan/ark-code-latest`                 | Ark Coding Plan          | text  | 256,000 |
    | `volcengine-plan/doubao-seed-code`                | Doubao Seed Code         | text  | 256,000 |
    | `volcengine-plan/glm-4.7`                         | GLM 4.7 Coding           | text  | 200,000 |
    | `volcengine-plan/kimi-k2-thinking`                | Kimi K2 Thinking         | text  | 256,000 |
    | `volcengine-plan/kimi-k2.5`                       | Kimi K2.5 Coding         | text  | 256,000 |
    | `volcengine-plan/doubao-seed-code-preview-251028` | Doubao Seed Code Preview | text  | 256,000 |
  </Tab>
</Tabs>

## 文本转语音

火山引擎 TTS 使用 BytePlus Seed Speech HTTP API，与 OpenAI 兼容的 Doubao 模型 API 密钥分开配置。在 BytePlus 控制台中，打开 Seed Speech > 设置 > API Keys，复制 API 密钥，然后设置：

```bash
export VOLCENGINE_TTS_API_KEY="byteplus_seed_speech_api_key"
export VOLCENGINE_TTS_RESOURCE_ID="seed-tts-1.0"
```

然后在 `openclaw.json` 中启用它：

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "volcengine",
      providers: {
        volcengine: {
          apiKey: "byteplus_seed_speech_api_key",
          voice: "en_female_anna_mars_bigtts",
          speedRatio: 1.0,
        },
      },
    },
  },
}
```

对于语音消息目标，OpenClaw 向 Volcengine 请求提供商原生的 `ogg_opus`。对于普通音频附件，它请求 `mp3`。提供商别名 `bytedance` 和 `doubao` 也解析到相同的语音提供商。

默认资源 id 为 `seed-tts-1.0`，因为这是 BytePlus 在默认项目中为新创建的 Seed Speech API 密钥授予的权限。如果你的项目有 TTS 2.0 权限，请设置 `VOLCENGINE_TTS_RESOURCE_ID=seed-tts-2.0`。

<Warning>
`VOLCANO_ENGINE_API_KEY` 用于 ModelArk/Doubao 模型端点，不是 Seed Speech API 密钥。TTS 需要从 BytePlus Speech 控制台获取的 Seed Speech API 密钥，或旧版 Speech 控制台 AppID/token 对。
</Warning>

旧版 AppID/token 认证对于较旧的 Speech 控制台应用程序仍然支持：

```bash
export VOLCENGINE_TTS_APPID="speech_app_id"
export VOLCENGINE_TTS_TOKEN="speech_access_token"
export VOLCENGINE_TTS_CLUSTER="volcano_tts"
```

## 高级配置

<AccordionGroup>
  <Accordion title="引导后的默认模型">
    `openclaw onboard --auth-choice volcengine-api-key` 目前将 `volcengine-plan/ark-code-latest` 设置为默认模型，同时还注册通用的 `volcengine` 目录。
  </Accordion>

  <Accordion title="模型选择器回退行为">
    在引导/配置模型选择期间，Volcengine 认证选择优先选择 `volcengine/*` 和 `volcengine-plan/*` 行。如果这些模型尚未加载，OpenClaw 会回退到未过滤的目录，而不是显示空的提供商范围选择器。
  </Accordion>

  <Accordion title="守护进程的环境变量">
    如果 Gateway 作为守护进程（launchd/systemd）运行，请确保模型和 TTS 环境变量（如 `VOLCANO_ENGINE_API_KEY`、`VOLCENGINE_TTS_API_KEY`、`BYTEPLUS_SEED_SPEECH_API_KEY`、`VOLCENGINE_TTS_APPID` 和 `VOLCENGINE_TTS_TOKEN`）对该进程可用（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

<Warning>
将 OpenClaw 作为后台服务运行时，交互式 shell 中设置的环境变量不会自动继承。请参见上方的守护进程说明。
</Warning>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
  <Card title="常见问题解答" href="/help/faq" icon="circle-question">
    关于 OpenClaw 设置的常见问题解答。
  </Card>
</CardGroup>
