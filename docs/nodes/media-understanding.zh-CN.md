---
summary: "入站图像/音频/视频理解（可选），支持提供商 + CLI 回退"
read_when:
  - 设计或重构媒体理解
  - 调优入站音频/视频/图像预处理
title: "媒体理解"
sidebarTitle: "媒体理解"
---

OpenClaw 可以在回复管道运行之前**摘要入站媒体**（图像/音频/视频）。当本地工具或提供商密钥可用时会自动检测，也可以禁用或自定义。如果理解功能关闭，模型仍会正常接收原始文件/URL。

供应商特定的媒体行为由供应商插件注册，而 OpenClaw 核心拥有共享的 `tools.media` 配置、回退顺序和回复管道集成。

## 目标

- 可选：将入站媒体预先消化为简短文本，以实现更快的路由 + 更好的命令解析。
- 始终保留原始媒体传递给模型。
- 支持**提供商 API** 和 **CLI 回退**。
- 允许多个模型进行有序回退（错误/大小/超时）。

## 高级行为

<Steps>
  <Step title="收集附件">
    收集入站附件（`MediaPaths`、`MediaUrls`、`MediaTypes`）。
  </Step>
  <Step title="按功能选择">
    对于每个启用的功能（图像/音频/视频），按策略选择附件（默认：**第一个**）。
  </Step>
  <Step title="选择模型">
    选择第一个符合条件的模型条目（大小 + 功能 + 认证）。
  </Step>
  <Step title="失败时回退">
    如果模型失败或媒体太大，**回退到下一个条目**。
  </Step>
  <Step title="应用成功块">
    成功时：

    - `Body` 变为 `[Image]`、`[Audio]` 或 `[Video]` 块。
    - 音频设置 `{{Transcript}}`；命令解析在存在说明文本时使用说明文本，否则使用转录文本。
    - 说明保留为块内的 `User text:`。

  </Step>
</Steps>

如果理解失败或被禁用，**回复流程继续**使用原始正文 + 附件。

## 配置概览

`tools.media` 支持**共享模型**以及按功能的覆盖：

<AccordionGroup>
  <Accordion title="顶层键">
    - `tools.media.models`：共享模型列表（使用 `capabilities` 进行门控）。
    - `tools.media.image` / `tools.media.audio` / `tools.media.video`：
      - 默认值（`prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`）
      - 提供商覆盖（`baseUrl`、`headers`、`providerOptions`）
      - 通过 `tools.media.audio.providerOptions.deepgram` 提供 Deepgram 音频选项
      - 音频转录回显控件（`echoTranscript`，默认 `false`；`echoFormat`）
      - 可选的**每功能 `models` 列表**（优先于共享模型）
      - `attachments` 策略（`mode`、`maxAttachments`、`prefer`）
      - `scope`（按频道/chatType/会话键的可选门控）
    - `tools.media.concurrency`：最大并发功能运行数（默认 **2**）。

  </Accordion>
</AccordionGroup>

```json5
{
  tools: {
    media: {
      models: [
        /* 共享列表 */
      ],
      image: {
        /* 可选覆盖 */
      },
      audio: {
        /* 可选覆盖 */
        echoTranscript: true,
        echoFormat: '📝 "{transcript}"',
      },
      video: {
        /* 可选覆盖 */
      },
    },
  },
}
```

### 模型条目

每个 `models[]` 条目可以是**提供商**或 **CLI**：

<Tabs>
  <Tab title="提供商条目">
    ```json5
    {
      type: "provider", // 省略时默认
      provider: "openai",
      model: "gpt-5.5",
      prompt: "Describe the image in <= 500 chars.",
      maxChars: 500,
      maxBytes: 10485760,
      timeoutSeconds: 60,
      capabilities: ["image"], // 可选，用于多模态条目
      profile: "vision-profile",
      preferredProfile: "vision-fallback",
    }
    ```
  </Tab>
  <Tab title="CLI 条目">
    ```json5
    {
      type: "cli",
      command: "gemini",
      args: [
        "-m",
        "gemini-3-flash",
        "--allowed-tools",
        "read_file",
        "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
      ],
      maxChars: 500,
      maxBytes: 52428800,
      timeoutSeconds: 120,
      capabilities: ["video", "image"],
    }
    ```

    CLI 模板还可以使用：

    - `{{MediaDir}}`（包含媒体文件的目录）
    - `{{OutputDir}}`（为此次运行创建的暂存目录）
    - `{{OutputBase}}`（暂存文件基础路径，无扩展名）

  </Tab>
</Tabs>

## 默认值和限制

推荐默认值：

- `maxChars`：图像/视频为 **500**（简短，适合命令）
- `maxChars`：音频**不设置**（完整转录，除非设置限制）
- `maxBytes`：
  - 图像：**10MB**
  - 音频：**20MB**
  - 视频：**50MB**

<AccordionGroup>
  <Accordion title="规则">
    - 如果媒体超过 `maxBytes`，该模型被跳过，**尝试下一个模型**。
    - 小于 **1024 字节**的音频文件被视为空/损坏，在提供商/CLI 转录之前跳过；入站回复上下文接收确定性的占位符转录，以便智能体知道消息太小。
    - 如果模型返回超过 `maxChars` 的内容，输出将被截断。
    - `prompt` 默认为简单的"描述 {media}。"加上 `maxChars` 指导（仅限图像/视频）。
    - 如果活跃的主图像模型已原生支持视觉，OpenClaw 会跳过 `[Image]` 摘要块，而是将原始图像传入模型。
    - 如果 Gateway/WebChat 主模型是纯文本的，图像附件被保留为卸载的 `media://inbound/*` 引用，以便图像/PDF 工具或配置的图像模型仍可检查它们，而不是丢失附件。
    - 显式的 `openclaw infer image describe --model <provider/model>` 请求不同：它们直接运行该图像能力提供商/模型，包括 Ollama 引用，例如 `ollama/qwen2.5vl:7b`。
    - 如果 `<capability>.enabled: true` 但未配置模型，OpenClaw 在其提供商支持该功能时尝试**活跃的回复模型**。

  </Accordion>
</AccordionGroup>

### 自动检测媒体理解（默认）

如果 `tools.media.<capability>.enabled` **未**设置为 `false` 且未配置模型，OpenClaw 按以下顺序自动检测，**在第一个可用选项处停止**：

<Steps>
  <Step title="活跃的回复模型">
    活跃的回复模型（当其提供商支持该功能时）。
  </Step>
  <Step title="agents.defaults.imageModel">
    `agents.defaults.imageModel` 主要/回退引用（仅限图像）。
    优先使用 `provider/model` 引用。仅当匹配唯一时，裸引用才从已配置的图像能力提供商模型条目中限定。
  </Step>
  <Step title="本地 CLI（仅限音频）">
    本地 CLI（如已安装）：

    - `sherpa-onnx-offline`（需要 `SHERPA_ONNX_MODEL_DIR` 包含 encoder/decoder/joiner/tokens）
    - `whisper-cli`（`whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或内置的 tiny 模型）
    - `whisper`（Python CLI；自动下载模型）

  </Step>
  <Step title="Gemini CLI">
    使用 `read_many_files` 的 `gemini`。
  </Step>
  <Step title="提供商认证">
    - 已配置的支持该功能的 `models.providers.*` 条目在内置回退顺序之前尝试。
    - 具有图像能力模型的仅图像配置提供商会自动注册用于媒体理解，即使它们不是内置供应商插件。
    - 当通过 `agents.defaults.imageModel` 或 `openclaw infer image describe --model ollama/<vision-model>` 显式选择时，Ollama 图像理解可用。

    内置回退顺序：

    - 音频：OpenAI → Groq → xAI → Deepgram → Google → SenseAudio → ElevenLabs → Mistral
    - 图像：OpenAI → Anthropic → Google → MiniMax → MiniMax Portal → Z.AI
    - 视频：Google → Qwen → Moonshot

  </Step>
</Steps>

如需禁用自动检测，设置：

```json5
{
  tools: {
    media: {
      audio: {
        enabled: false,
      },
    },
  },
}
```

<Note>
二进制检测在 macOS/Linux/Windows 上为尽力而为；确保 CLI 在 `PATH` 上（我们会展开 `~`），或为 CLI 模型设置带完整命令路径的显式条目。
</Note>

### 代理环境支持（提供商模型）

当启用基于提供商的**音频**和**视频**媒体理解时，OpenClaw 为提供商 HTTP 调用遵循标准的出站代理环境变量：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

如果没有设置代理环境变量，媒体理解使用直接出站。如果代理值格式不正确，OpenClaw 会记录警告并回退到直接获取。

## 功能（可选）

如果设置了 `capabilities`，该条目仅对那些媒体类型运行。对于共享列表，OpenClaw 可以推断默认值：

- `openai`、`anthropic`、`minimax`：**图像**
- `minimax-portal`：**图像**
- `moonshot`：**图像 + 视频**
- `openrouter`：**图像**
- `google`（Gemini API）：**图像 + 音频 + 视频**
- `qwen`：**图像 + 视频**
- `mistral`：**音频**
- `zai`：**图像**
- `groq`：**音频**
- `xai`：**音频**
- `deepgram`：**音频**
- 任何具有图像能力模型的 `models.providers.<id>.models[]` 目录：**图像**

对于 CLI 条目，**显式设置 `capabilities`** 以避免意外匹配。如果省略 `capabilities`，该条目符合其所在列表的条件。

## 提供商支持矩阵（OpenClaw 集成）

| 功能 | 提供商集成                                                                                                             | 注意                                                                                                                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 图像 | OpenAI、OpenAI Codex OAuth、Codex app-server、OpenRouter、Anthropic、Google、MiniMax、Moonshot、Qwen、Z.AI、配置提供商 | 供应商插件注册图像支持；`openai-codex/*` 使用 OAuth 提供商配置；`codex/*` 使用有限的 Codex app-server 轮次；MiniMax 和 MiniMax OAuth 都使用 `MiniMax-VL-01`；具有图像能力的配置提供商自动注册。 |
| 音频 | OpenAI、Groq、xAI、Deepgram、Google、SenseAudio、ElevenLabs、Mistral                                                   | 提供商转录（Whisper/Groq/xAI/Deepgram/Gemini/SenseAudio/Scribe/Voxtral）。                                                                                                                      |
| 视频 | Google、Qwen、Moonshot                                                                                                 | 通过供应商插件的提供商视频理解；Qwen 视频理解使用标准 DashScope 端点。                                                                                                                          |

<Note>
**MiniMax 注意事项**

- `minimax` 和 `minimax-portal` 图像理解来自插件拥有的 `MiniMax-VL-01` 媒体提供商。
- 内置的 MiniMax 文本目录仍从纯文本开始；显式的 `models.providers.minimax` 条目会具体化支持图像的 M2.7 聊天引用。

</Note>

## 模型选择指南

- 在质量和安全性重要时，优先使用每种媒体功能最强的最新一代模型。
- 对于处理不受信任输入的工具启用智能体，避免使用较旧/较弱的媒体模型。
- 为每种功能保留至少一个回退以确保可用性（质量模型 + 更快/更便宜的模型）。
- CLI 回退（`whisper-cli`、`whisper`、`gemini`）在提供商 API 不可用时很有用。
- `parakeet-mlx` 注意：使用 `--output-dir` 时，当输出格式为 `txt`（或未指定）时 OpenClaw 读取 `<output-dir>/<media-basename>.txt`；非 `txt` 格式回退到标准输出。

## 附件策略

每功能的 `attachments` 控制处理哪些附件：

<ParamField path="mode" type='"first" | "all"' default="first">
  是处理第一个选定的附件还是所有附件。
</ParamField>
<ParamField path="maxAttachments" type="number" default="1">
  限制处理的数量。
</ParamField>
<ParamField path="prefer" type='"first" | "last" | "path" | "url"'>
  候选附件之间的选择偏好。
</ParamField>

当 `mode: "all"` 时，输出标记为 `[Image 1/2]`、`[Audio 2/2]` 等。

<AccordionGroup>
  <Accordion title="文件附件提取行为">
    - 提取的文件文本在附加到媒体提示之前被包装为**不受信任的外部内容**。
    - 注入的块使用显式边界标记，如 `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` / `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>` 并包含 `Source: External` 元数据行。
    - 此附件提取路径有意省略长 `SECURITY NOTICE:` 横幅以避免膨胀媒体提示；边界标记和元数据仍然保留。
    - 如果文件没有可提取的文本，OpenClaw 注入 `[No extractable text]`。
    - 如果 PDF 在此路径中回退到渲染的页面图像，媒体提示保留占位符 `[PDF content rendered to images; images not forwarded to model]`，因为此附件提取步骤转发文本块，而不是渲染的 PDF 图像。

  </Accordion>
</AccordionGroup>

## 配置示例

<Tabs>
  <Tab title="共享模型 + 覆盖">
    ```json5
    {
      tools: {
        media: {
          models: [
            { provider: "openai", model: "gpt-5.5", capabilities: ["image"] },
            {
              provider: "google",
              model: "gemini-3-flash-preview",
              capabilities: ["image", "audio", "video"],
            },
            {
              type: "cli",
              command: "gemini",
              args: [
                "-m",
                "gemini-3-flash",
                "--allowed-tools",
                "read_file",
                "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
              ],
              capabilities: ["image", "video"],
            },
          ],
          audio: {
            attachments: { mode: "all", maxAttachments: 2 },
          },
          video: {
            maxChars: 500,
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="仅音频 + 视频">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [
              { provider: "openai", model: "gpt-4o-mini-transcribe" },
              {
                type: "cli",
                command: "whisper",
                args: ["--model", "base", "{{MediaPath}}"],
              },
            ],
          },
          video: {
            enabled: true,
            maxChars: 500,
            models: [
              { provider: "google", model: "gemini-3-flash-preview" },
              {
                type: "cli",
                command: "gemini",
                args: [
                  "-m",
                  "gemini-3-flash",
                  "--allowed-tools",
                  "read_file",
                  "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
                ],
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="仅图像">
    ```json5
    {
      tools: {
        media: {
          image: {
            enabled: true,
            maxBytes: 10485760,
            maxChars: 500,
            models: [
              { provider: "openai", model: "gpt-5.5" },
              { provider: "anthropic", model: "claude-opus-4-6" },
              {
                type: "cli",
                command: "gemini",
                args: [
                  "-m",
                  "gemini-3-flash",
                  "--allowed-tools",
                  "read_file",
                  "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
                ],
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="多模态单条目">
    ```json5
    {
      tools: {
        media: {
          image: {
            models: [
              {
                provider: "google",
                model: "gemini-3.1-pro-preview",
                capabilities: ["image", "video", "audio"],
              },
            ],
          },
          audio: {
            models: [
              {
                provider: "google",
                model: "gemini-3.1-pro-preview",
                capabilities: ["image", "video", "audio"],
              },
            ],
          },
          video: {
            models: [
              {
                provider: "google",
                model: "gemini-3.1-pro-preview",
                capabilities: ["image", "video", "audio"],
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

## 状态输出

当媒体理解运行时，`/status` 包含一行简短摘要：

```
📎 Media: image ok (openai/gpt-5.4) · audio skipped (maxBytes)
```

这显示每个功能的结果以及适用时选择的提供商/模型。

## 注意事项

- 理解是**尽力而为**的。错误不会阻止回复。
- 即使禁用理解，附件仍会传递给模型。
- 使用 `scope` 限制理解运行的位置（例如仅限私信）。

## 相关

- [配置](/gateway/configuration)
- [图像与媒体支持](/nodes/images)
