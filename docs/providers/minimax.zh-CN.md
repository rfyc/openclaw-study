---
summary: "在 OpenClaw 中使用 MiniMax 模型"
read_when:
  - 你想在 OpenClaw 中使用 MiniMax 模型
  - 你需要 MiniMax 的设置指引
title: "MiniMax"
---

OpenClaw 的 MiniMax 提供商默认使用 **MiniMax M2.7**。

MiniMax 还提供：

- 通过 T2A v2 提供捆绑语音合成
- 通过 `MiniMax-VL-01` 提供捆绑图像理解
- 通过 `music-2.6` 提供捆绑音乐生成
- 通过 MiniMax Token Plan 搜索 API 提供捆绑的 `web_search`

提供商拆分：

| 提供商 ID        | 认证     | 功能                                                         |
| ---------------- | -------- | ------------------------------------------------------------ |
| `minimax`        | API 密钥 | 文本、图像生成、音乐生成、视频生成、图像理解、语音、网络搜索 |
| `minimax-portal` | OAuth    | 文本、图像生成、音乐生成、视频生成、图像理解、语音           |

## 内置目录

| 模型                     | 类型         | 说明                   |
| ------------------------ | ------------ | ---------------------- |
| `MiniMax-M2.7`           | 对话（推理） | 默认托管推理模型       |
| `MiniMax-M2.7-highspeed` | 对话（推理） | 更快的 M2.7 推理层级   |
| `MiniMax-VL-01`          | 视觉         | 图像理解模型           |
| `image-01`               | 图像生成     | 文生图和图像编辑       |
| `music-2.6`              | 音乐生成     | 默认音乐模型           |
| `music-2.5`              | 音乐生成     | 上一代音乐生成层级     |
| `music-2.0`              | 音乐生成     | 旧版音乐生成层级       |
| `MiniMax-Hailuo-2.3`     | 视频生成     | 文生视频和图像参考流程 |

## 快速开始

选择你偏好的认证方式并按步骤设置。

<Tabs>
  <Tab title="OAuth（Coding Plan）">
    **适合：** 通过 OAuth 使用 MiniMax Coding Plan 快速设置，无需 API 密钥。

    <Tabs>
      <Tab title="国际版">
        <Steps>
          <Step title="运行引导程序">
            ```bash
            openclaw onboard --auth-choice minimax-global-oauth
            ```

            这将对 `api.minimax.io` 进行认证。
          </Step>
          <Step title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="中国版">
        <Steps>
          <Step title="运行引导程序">
            ```bash
            openclaw onboard --auth-choice minimax-cn-oauth
            ```

            这将对 `api.minimaxi.com` 进行认证。
          </Step>
          <Step title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    <Note>
    OAuth 方式使用 `minimax-portal` 提供商 ID。模型引用格式为 `minimax-portal/MiniMax-M2.7`。
    </Note>

    <Tip>
    MiniMax Coding Plan 推荐链接（九折优惠）：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
    </Tip>

  </Tab>

  <Tab title="API 密钥">
    **适合：** 使用 Anthropic 兼容 API 的托管 MiniMax。

    <Tabs>
      <Tab title="国际版">
        <Steps>
          <Step title="运行引导程序">
            ```bash
            openclaw onboard --auth-choice minimax-global-api
            ```

            这将把 `api.minimax.io` 配置为基础 URL。
          </Step>
          <Step title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="中国版">
        <Steps>
          <Step title="运行引导程序">
            ```bash
            openclaw onboard --auth-choice minimax-cn-api
            ```

            这将把 `api.minimaxi.com` 配置为基础 URL。
          </Step>
          <Step title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    ### 配置示例

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "minimax/MiniMax-M2.7" } } },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "MiniMax-M2.7",
                name: "MiniMax M2.7",
                reasoning: true,
                input: ["text"],
                cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
              {
                id: "MiniMax-M2.7-highspeed",
                name: "MiniMax M2.7 Highspeed",
                reasoning: true,
                input: ["text"],
                cost: { input: 0.6, output: 2.4, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    <Warning>
    在 Anthropic 兼容流式传输路径上，除非你明确设置了 `thinking`，OpenClaw 默认会禁用 MiniMax 的思考功能。MiniMax 的流式端点会以 OpenAI 风格的 delta 块发出 `reasoning_content`，如果隐式启用可能会将内部推理泄漏到可见输出中。
    </Warning>

    <Note>
    API 密钥方式使用 `minimax` 提供商 ID。模型引用格式为 `minimax/MiniMax-M2.7`。
    </Note>

  </Tab>
</Tabs>

## 通过 `openclaw configure` 进行配置

使用交互式配置向导设置 MiniMax，无需手动编辑 JSON：

<Steps>
  <Step title="启动向导">
    ```bash
    openclaw configure
    ```
  </Step>
  <Step title="选择模型/认证">
    从菜单中选择 **Model/auth**。
  </Step>
  <Step title="选择 MiniMax 认证选项">
    选择一个可用的 MiniMax 选项：

    | 认证选项 | 说明 |
    | --- | --- |
    | `minimax-global-oauth` | 国际版 OAuth（Coding Plan） |
    | `minimax-cn-oauth` | 中国版 OAuth（Coding Plan） |
    | `minimax-global-api` | 国际版 API 密钥 |
    | `minimax-cn-api` | 中国版 API 密钥 |

  </Step>
  <Step title="选择默认模型">
    在提示时选择你的默认模型。
  </Step>
</Steps>

## 功能

### 图像生成

MiniMax 插件为 `image_generate` 工具注册了 `image-01` 模型。它支持：

- **文生图**，可控制宽高比
- **图像编辑**（主体参考），可控制宽高比
- 每次请求最多 **9 张**输出图像
- 每次编辑请求最多 **1 张**参考图像
- 支持的宽高比：`1:1`、`16:9`、`4:3`、`3:2`、`2:3`、`3:4`、`9:16`、`21:9`

要使用 MiniMax 进行图像生成，将其设置为图像生成提供商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

该插件使用与文本模型相同的 `MINIMAX_API_KEY` 或 OAuth 认证。如果 MiniMax 已设置，无需额外配置。

`minimax` 和 `minimax-portal` 都用相同的 `image-01` 模型注册了 `image_generate`。API 密钥方式使用 `MINIMAX_API_KEY`；OAuth 方式可使用捆绑的 `minimax-portal` 认证路径。

图像生成始终使用 MiniMax 的专用图像端点（`/v1/image_generation`），并忽略 `models.providers.minimax.baseUrl`，因为该字段用于配置对话/Anthropic 兼容的基础 URL。设置 `MINIMAX_API_HOST=https://api.minimaxi.com` 可将图像生成路由到中国端点；默认全球端点为 `https://api.minimax.io`。

当引导程序或 API 密钥设置写入了显式的 `models.providers.minimax` 条目时，OpenClaw 会将 `MiniMax-M2.7` 和 `MiniMax-M2.7-highspeed` 实例化为纯文本对话模型。图像理解通过插件拥有的 `MiniMax-VL-01` 媒体提供商单独暴露。

<Note>
参见[图像生成](/tools/image-generation)了解共享工具参数、提供商选择和故障转移行为。
</Note>

### 文字转语音

捆绑的 `minimax` 插件将 MiniMax T2A v2 注册为 `messages.tts` 的语音提供商。

- 默认 TTS 模型：`speech-2.8-hd`
- 默认声音：`English_expressive_narrator`
- 支持的捆绑模型 ID 包括 `speech-2.8-hd`、`speech-2.8-turbo`、`speech-2.6-hd`、`speech-2.6-turbo`、`speech-02-hd`、`speech-02-turbo`、`speech-01-hd` 和 `speech-01-turbo`。
- 认证解析顺序：`messages.tts.providers.minimax.apiKey`，然后是 `minimax-portal` OAuth/令牌认证配置，再是 Token Plan 环境变量（`MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`），最后是 `MINIMAX_API_KEY`。
- 如果未配置 TTS 主机，OpenClaw 将复用已配置的 `minimax-portal` OAuth 主机，并去除 Anthropic 兼容路径后缀（如 `/anthropic`）。
- 普通音频附件保持 MP3 格式。
- 飞书和 Telegram 等语音备忘录目标会通过 `ffmpeg` 将 MiniMax MP3 转码为 48kHz Opus，因为飞书/Lark 文件 API 仅接受 `file_type: "opus"` 格式的原生音频消息。
- MiniMax T2A 接受小数形式的 `speed` 和 `vol`，但 `pitch` 以整数形式发送；OpenClaw 在 API 请求前会截断小数形式的 `pitch` 值。

| 设置                                     | 环境变量               | 默认值                        | 说明                      |
| ---------------------------------------- | ---------------------- | ----------------------------- | ------------------------- |
| `messages.tts.providers.minimax.baseUrl` | `MINIMAX_API_HOST`     | `https://api.minimax.io`      | MiniMax T2A API 主机。    |
| `messages.tts.providers.minimax.model`   | `MINIMAX_TTS_MODEL`    | `speech-2.8-hd`               | TTS 模型 ID。             |
| `messages.tts.providers.minimax.voiceId` | `MINIMAX_TTS_VOICE_ID` | `English_expressive_narrator` | 语音输出使用的声音 ID。   |
| `messages.tts.providers.minimax.speed`   |                        | `1.0`                         | 播放速度，`0.5..2.0`。    |
| `messages.tts.providers.minimax.vol`     |                        | `1.0`                         | 音量，`(0, 10]`。         |
| `messages.tts.providers.minimax.pitch`   |                        | `0`                           | 整数音调偏移，`-12..12`。 |

### 音乐生成

捆绑的 MiniMax 插件通过共享的 `music_generate` 工具为 `minimax` 和 `minimax-portal` 注册了音乐生成功能。

- 默认音乐模型：`minimax/music-2.6`
- OAuth 音乐模型：`minimax-portal/music-2.6`
- 同时支持 `minimax/music-2.5` 和 `minimax/music-2.0`
- 提示词控制：`lyrics`、`instrumental`、`durationSeconds`
- 输出格式：`mp3`
- 会话支持的运行通过共享任务/状态流（包括 `action: "status"`）分离

要将 MiniMax 设为默认音乐提供商：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "minimax/music-2.6",
      },
    },
  },
}
```

<Note>
参见[音乐生成](/tools/music-generation)了解共享工具参数、提供商选择和故障转移行为。
</Note>

### 视频生成

捆绑的 MiniMax 插件通过共享的 `video_generate` 工具为 `minimax` 和 `minimax-portal` 注册了视频生成功能。

- 默认视频模型：`minimax/MiniMax-Hailuo-2.3`
- OAuth 视频模型：`minimax-portal/MiniMax-Hailuo-2.3`
- 模式：文生视频和单图参考流程
- 支持 `aspectRatio` 和 `resolution`

要将 MiniMax 设为默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "minimax/MiniMax-Hailuo-2.3",
      },
    },
  },
}
```

<Note>
参见[视频生成](/tools/video-generation)了解共享工具参数、提供商选择和故障转移行为。
</Note>

### 图像理解

MiniMax 插件将图像理解与文本目录分开注册：

| 提供商 ID        | 默认图像模型    |
| ---------------- | --------------- |
| `minimax`        | `MiniMax-VL-01` |
| `minimax-portal` | `MiniMax-VL-01` |

这就是为什么即使捆绑的文本提供商目录中仍显示纯文本 M2.7 对话引用，自动媒体路由也可以使用 MiniMax 图像理解。

### 网络搜索

MiniMax 插件还通过 MiniMax Token Plan 搜索 API 注册了 `web_search`。

- 提供商 ID：`minimax`
- 结构化结果：标题、URL、摘要、相关查询
- 首选环境变量：`MINIMAX_CODE_PLAN_KEY`
- 接受的环境变量别名：`MINIMAX_CODING_API_KEY`、`MINIMAX_OAUTH_TOKEN`
- 兼容性回退：当 `MINIMAX_API_KEY` 已指向令牌计划凭据时使用
- 区域复用：`plugins.entries.minimax.config.webSearch.region`，然后是 `MINIMAX_API_HOST`，再是 MiniMax 提供商基础 URL
- 搜索保持在提供商 ID `minimax`；OAuth 中国/全球设置可通过 `models.providers.minimax-portal.baseUrl` 间接控制区域，并可通过 `MINIMAX_OAUTH_TOKEN` 提供 Bearer 认证

配置位于 `plugins.entries.minimax.config.webSearch.*` 下。

<Note>
参见 [MiniMax 搜索](/tools/minimax-search)了解完整的网络搜索配置和用法。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="配置选项">
    | 选项 | 说明 |
    | --- | --- |
    | `models.providers.minimax.baseUrl` | 推荐使用 `https://api.minimax.io/anthropic`（Anthropic 兼容）；`https://api.minimax.io/v1` 可用于 OpenAI 兼容载荷 |
    | `models.providers.minimax.api` | 推荐使用 `anthropic-messages`；`openai-completions` 可用于 OpenAI 兼容载荷 |
    | `models.providers.minimax.apiKey` | MiniMax API 密钥（`MINIMAX_API_KEY`） |
    | `models.providers.minimax.models` | 定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost` |
    | `agents.defaults.models` | 为你想加入允许列表的模型设置别名 |
    | `models.mode` | 如果要在内置模型旁添加 MiniMax，保持 `merge` |
  </Accordion>

  <Accordion title="思考默认值">
    在 `api: "anthropic-messages"` 模式下，除非在参数/配置中已明确设置了 thinking，OpenClaw 会注入 `thinking: { type: "disabled" }`。

    这可防止 MiniMax 的流式端点以 OpenAI 风格的 delta 块发出 `reasoning_content`，否则可能将内部推理泄漏到可见输出中。

  </Accordion>

  <Accordion title="快速模式">
    `/fast on` 或 `params.fastMode: true` 会在 Anthropic 兼容流式路径上将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
  </Accordion>

  <Accordion title="故障转移示例">
    **适合：** 将最强的最新一代模型作为主要模型，故障转移到 MiniMax M2.7。以下示例使用 Opus 作为具体的主要模型；请替换为你偏好的最新一代主要模型。

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-..." },
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": { alias: "primary" },
            "minimax/MiniMax-M2.7": { alias: "minimax" },
          },
          model: {
            primary: "anthropic/claude-opus-4-6",
            fallbacks: ["minimax/MiniMax-M2.7"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Coding Plan 使用详情">
    - Coding Plan 用量 API：`https://api.minimaxi.com/v1/token_plan/remains` 或 `https://api.minimax.io/v1/token_plan/remains`（需要 Coding Plan 密钥）。
    - 用量轮询从已配置的 `models.providers.minimax-portal.baseUrl` 或 `models.providers.minimax.baseUrl` 中获取主机，因此使用 `https://api.minimax.io/anthropic` 的全球设置会轮询 `api.minimax.io`。缺失或格式错误的基础 URL 将保留中国回退以保持兼容性。
    - OpenClaw 将 MiniMax Coding Plan 用量标准化为与其他提供商相同的 `% 剩余` 显示格式。MiniMax 原始的 `usage_percent` / `usagePercent` 字段表示剩余配额而非已消耗配额，因此 OpenClaw 会对其取反。存在基于计数的字段时优先使用计数字段。
    - 当 API 返回 `model_remains` 时，OpenClaw 优先选择对话模型条目，必要时从 `start_time` / `end_time` 派生窗口标签，并在计划标签中包含所选模型名称，以便更容易区分 Coding Plan 窗口。
    - 用量快照将 `minimax`、`minimax-cn` 和 `minimax-portal` 视为同一 MiniMax 配额界面，并优先使用已存储的 MiniMax OAuth 凭据，然后回退到 Coding Plan 密钥环境变量。

  </Accordion>
</AccordionGroup>

## 注意事项

- 模型引用遵循认证路径：
  - API 密钥设置：`minimax/<model>`
  - OAuth 设置：`minimax-portal/<model>`
- 默认对话模型：`MiniMax-M2.7`
- 备用对话模型：`MiniMax-M2.7-highspeed`
- 引导程序和直接 API 密钥设置会为两个 M2.7 变体写入纯文本模型定义
- 图像理解使用插件拥有的 `MiniMax-VL-01` 媒体提供商
- 如需精确成本追踪，请在 `models.json` 中更新定价值
- 使用 `openclaw models list` 确认当前提供商 ID，然后通过 `openclaw models set minimax/MiniMax-M2.7` 或 `openclaw models set minimax-portal/MiniMax-M2.7` 进行切换

<Tip>
MiniMax Coding Plan 推荐链接（九折优惠）：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
</Tip>

<Note>
参见[模型提供商](/concepts/model-providers)了解提供商规则。
</Note>

## 故障排除

<AccordionGroup>
  <Accordion title='"未知模型：minimax/MiniMax-M2.7"'>
    这通常意味着 **MiniMax 提供商未配置**（未找到匹配的提供商条目和 MiniMax 认证配置/环境密钥）。此检测问题已在 **2026.1.12** 中修复。解决方法：

    - 升级至 **2026.1.12**（或从源码 `main` 分支运行），然后重启 gateway。
    - 运行 `openclaw configure` 并选择 **MiniMax** 认证选项，或
    - 手动添加对应的 `models.providers.minimax` 或 `models.providers.minimax-portal` 配置块，或
    - 设置 `MINIMAX_API_KEY`、`MINIMAX_OAUTH_TOKEN` 或 MiniMax 认证配置，以便注入匹配的提供商。

    确保模型 ID **区分大小写**：

    - API 密钥路径：`minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`
    - OAuth 路径：`minimax-portal/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7-highspeed`

    然后通过以下命令重新检查：

    ```bash
    openclaw models list
    ```

  </Accordion>
</AccordionGroup>

<Note>
更多帮助：[故障排除](/help/troubleshooting)和 [FAQ](/help/faq)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="音乐生成" href="/tools/music-generation" icon="music">
    共享音乐工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="MiniMax 搜索" href="/tools/minimax-search" icon="magnifying-glass">
    通过 MiniMax Token Plan 进行网络搜索配置。
  </Card>
  <Card title="故障排除" href="/help/troubleshooting" icon="wrench">
    通用故障排除和 FAQ。
  </Card>
</CardGroup>
