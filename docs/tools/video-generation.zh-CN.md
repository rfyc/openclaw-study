---
summary: "通过 video_generate 从文本、图像或视频参考跨 16 个提供商后端生成视频"
read_when:
  - 通过代理生成视频
  - 配置视频生成提供商和模型
  - 了解 video_generate 工具参数
title: "视频生成"
sidebarTitle: "视频生成"
---

OpenClaw 代理可以从文本提示、参考图像或现有视频生成视频。支持十六个提供商后端，每个都有不同的模型选项、输入模式和功能集。代理根据你的配置和可用的 API 密钥自动选择正确的提供商。

<Note>
`video_generate` 工具仅在至少一个视频生成提供商可用时出现。如果你在代理工具中看不到它，请设置提供商 API 密钥或配置 `agents.defaults.videoGenerationModel`。
</Note>

OpenClaw 将视频生成视为三种运行时模式：

- `generate` — 没有参考媒体的文字转视频请求。
- `imageToVideo` — 请求包含一个或多个参考图像。
- `videoToVideo` — 请求包含一个或多个参考视频。

提供商可以支持这些模式的任何子集。工具在提交之前验证活动模式，并在 `action=list` 中报告支持的模式。

## 快速开始

<Steps>
  <Step title="配置认证">
    为任何支持的提供商设置 API 密钥：

    ```bash
    export GEMINI_API_KEY="your-key"
    ```

  </Step>
  <Step title="选择默认模型（可选）">
    ```bash
    openclaw config set agents.defaults.videoGenerationModel.primary "google/veo-3.1-fast-generate-preview"
    ```
  </Step>
  <Step title="询问代理">
    > Generate a 5-second cinematic video of a friendly lobster surfing at sunset.

    代理自动调用 `video_generate`。不需要工具允许列表。

  </Step>
</Steps>

## 异步生成工作原理

视频生成是异步的。当代理在会话中调用 `video_generate` 时：

1. OpenClaw 将请求提交给提供商并立即返回任务 id。
2. 提供商在后台处理任务（通常需要 30 秒到 5 分钟，具体取决于提供商和分辨率）。
3. 视频准备就绪后，OpenClaw 用内部完成事件唤醒同一会话。
4. 代理将完成的视频发布回原始对话。

当任务正在进行时，同一会话中重复的 `video_generate` 调用返回当前任务状态，而不是开始另一个生成。使用 `openclaw tasks list` 或 `openclaw tasks show <taskId>` 从 CLI 检查进度。

在非会话支持的代理运行之外（例如直接工具调用），工具回退到内联生成并在同一轮次中返回最终媒体路径。

生成的视频文件在提供商返回字节时保存在 OpenClaw 托管的媒体存储下。默认的生成视频保存上限遵循视频媒体限制，`agents.defaults.mediaMaxMb` 为较大的渲染提高它。当提供商还返回托管输出 URL 时，如果本地持久化拒绝过大的文件，OpenClaw 可以提供该 URL 而不是使任务失败。

### 任务生命周期

| 状态        | 含义                                                                  |
| ----------- | --------------------------------------------------------------------- |
| `queued`    | 任务已创建，等待提供商接受。                                          |
| `running`   | 提供商正在处理（通常需要 30 秒到 5 分钟，具体取决于提供商和分辨率）。 |
| `succeeded` | 视频已准备好；代理唤醒并将其发布到对话中。                            |
| `failed`    | 提供商错误或超时；代理唤醒并带有错误详情。                            |

从 CLI 检查状态：

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

如果当前会话已有 `queued` 或 `running` 的视频任务，`video_generate` 返回现有任务状态而不是开始新的生成。使用 `action: "status"` 显式检查而不触发新的生成。

## 支持的提供商

| 提供商                | 默认模型                        | 文字 | 图像参考                                  | 视频参考                         | 认证                                     |
| --------------------- | ------------------------------- | :--: | ----------------------------------------- | -------------------------------- | ---------------------------------------- |
| Alibaba               | `wan2.6-t2v`                    |  ✓   | 是（远程 URL）                            | 是（远程 URL）                   | `MODELSTUDIO_API_KEY`                    |
| BytePlus (1.0)        | `seedance-1-0-pro-250528`       |  ✓   | 最多 2 张图像（仅 I2V 模型；首帧 + 末帧） | —                                | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 1.5 | `seedance-1-5-pro-251215`       |  ✓   | 最多 2 张图像（通过角色首帧 + 末帧）      | —                                | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 2.0 | `dreamina-seedance-2-0-260128`  |  ✓   | 最多 9 张参考图像                         | 最多 3 个视频                    | `BYTEPLUS_API_KEY`                       |
| ComfyUI               | `workflow`                      |  ✓   | 1 张图像                                  | —                                | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| DeepInfra             | `Pixverse/Pixverse-T2V`         |  ✓   | —                                         | —                                | `DEEPINFRA_API_KEY`                      |
| fal                   | `fal-ai/minimax/video-01-live`  |  ✓   | 1 张图像；Seedance 参考转视频最多 9 张    | Seedance 参考转视频最多 3 个视频 | `FAL_KEY`                                |
| Google                | `veo-3.1-fast-generate-preview` |  ✓   | 1 张图像                                  | 1 个视频                         | `GEMINI_API_KEY`                         |
| MiniMax               | `MiniMax-Hailuo-2.3`            |  ✓   | 1 张图像                                  | —                                | `MINIMAX_API_KEY` 或 MiniMax OAuth       |
| OpenAI                | `sora-2`                        |  ✓   | 1 张图像                                  | 1 个视频                         | `OPENAI_API_KEY`                         |
| OpenRouter            | `google/veo-3.1-fast`           |  ✓   | 最多 4 张图像（首帧/末帧或参考）          | —                                | `OPENROUTER_API_KEY`                     |
| Qwen                  | `wan2.6-t2v`                    |  ✓   | 是（远程 URL）                            | 是（远程 URL）                   | `QWEN_API_KEY`                           |
| Runway                | `gen4.5`                        |  ✓   | 1 张图像                                  | 1 个视频                         | `RUNWAYML_API_SECRET`                    |
| Together              | `Wan-AI/Wan2.2-T2V-A14B`        |  ✓   | 1 张图像                                  | —                                | `TOGETHER_API_KEY`                       |
| Vydra                 | `veo3`                          |  ✓   | 1 张图像（`kling`）                       | —                                | `VYDRA_API_KEY`                          |
| xAI                   | `grok-imagine-video`            |  ✓   | 1 张首帧图像或最多 7 张 `reference_image` | 1 个视频                         | `XAI_API_KEY`                            |

某些提供商接受额外或替代的 API 密钥环境变量。详见各个[提供商页面](#related)。

运行 `video_generate action=list` 在运行时检查可用的提供商、模型和运行时模式。

### 能力矩阵

`video_generate`、合约测试和共享实时扫描使用的显式模式合约：

| 提供商     | `generate` | `imageToVideo` | `videoToVideo` | 今天共享的实时通道                                                                                               |
| ---------- | :--------: | :------------: | :------------: | ---------------------------------------------------------------------------------------------------------------- |
| Alibaba    |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；`videoToVideo` 跳过，因为此提供商需要远程 `http(s)` 视频 URL                         |
| BytePlus   |     ✓      |       ✓        |       —        | `generate`、`imageToVideo`                                                                                       |
| ComfyUI    |     ✓      |       ✓        |       —        | 不在共享扫描中；工作流特定覆盖与 Comfy 测试一起                                                                  |
| DeepInfra  |     ✓      |       —        |       —        | `generate`；捆绑合约中的原生 DeepInfra 视频模式是文字转视频                                                      |
| fal        |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；`videoToVideo` 仅在使用 Seedance 参考转视频时                                        |
| Google     |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；共享 `videoToVideo` 跳过，因为当前缓冲支持的 Gemini/Veo 扫描不接受该输入             |
| MiniMax    |     ✓      |       ✓        |       —        | `generate`、`imageToVideo`                                                                                       |
| OpenAI     |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；共享 `videoToVideo` 跳过，因为此组织/输入路径当前需要提供商端 inpaint/remix 访问权限 |
| OpenRouter |     ✓      |       ✓        |       —        | `generate`、`imageToVideo`                                                                                       |
| Qwen       |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；`videoToVideo` 跳过，因为此提供商需要远程 `http(s)` 视频 URL                         |
| Runway     |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；`videoToVideo` 仅在选定模型为 `runway/gen4_aleph` 时运行                             |
| Together   |     ✓      |       ✓        |       —        | `generate`、`imageToVideo`                                                                                       |
| Vydra      |     ✓      |       ✓        |       —        | `generate`；共享 `imageToVideo` 跳过，因为捆绑的 `veo3` 仅文字转视频，捆绑的 `kling` 需要远程图像 URL            |
| xAI        |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；`videoToVideo` 跳过，因为此提供商当前需要远程 MP4 URL                                |

## 工具参数

### 必需

<ParamField path="prompt" type="string" required>
  要生成的视频的文字描述。`action: "generate"` 时必需。
</ParamField>

### 内容输入

<ParamField path="image" type="string">单个参考图像（路径或 URL）。</ParamField>
<ParamField path="images" type="string[]">多个参考图像（最多 9 个）。</ParamField>
<ParamField path="imageRoles" type="string[]">
与合并图像列表并行的可选每位置角色提示。
规范值：`first_frame`、`last_frame`、`reference_image`。
</ParamField>
<ParamField path="video" type="string">单个参考视频（路径或 URL）。</ParamField>
<ParamField path="videos" type="string[]">多个参考视频（最多 4 个）。</ParamField>
<ParamField path="videoRoles" type="string[]">
与合并视频列表并行的可选每位置角色提示。
规范值：`reference_video`。
</ParamField>
<ParamField path="audioRef" type="string">
单个参考音频（路径或 URL）。当提供商支持音频输入时，用于背景音乐或语音参考。
</ParamField>
<ParamField path="audioRefs" type="string[]">多个参考音频（最多 3 个）。</ParamField>
<ParamField path="audioRoles" type="string[]">
与合并音频列表并行的可选每位置角色提示。
规范值：`reference_audio`。
</ParamField>

<Note>
角色提示按原样转发给提供商。规范值来自 `VideoGenerationAssetRole` 联合，但提供商可以接受额外的角色字符串。`*Roles` 数组不能有比对应参考列表更多的条目；一一对应的错误会报告清晰的错误。使用空字符串让一个槽位未设置。对于 xAI，将每个图像角色设置为 `reference_image` 以使用其 `reference_images` 生成模式；省略角色或使用 `first_frame` 进行单图像图像转视频。
</Note>

### 风格控制

<ParamField path="aspectRatio" type="string">
  `1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9` 或 `adaptive`。
</ParamField>
<ParamField path="resolution" type="string">`480P`、`720P`、`768P` 或 `1080P`。</ParamField>
<ParamField path="durationSeconds" type="number">
  目标时长（秒）（四舍五入到最近的提供商支持值）。
</ParamField>
<ParamField path="size" type="string">提供商支持时的尺寸提示。</ParamField>
<ParamField path="audio" type="boolean">
  支持时在输出中启用生成的音频。与 `audioRef*`（输入）不同。
</ParamField>
<ParamField path="watermark" type="boolean">支持时切换提供商水印。</ParamField>

`adaptive` 是提供商特定的标记：它按原样转发给在其能力中声明 `adaptive` 的提供商（例如 BytePlus Seedance 使用它从输入图像尺寸自动检测比例）。未声明它的提供商通过工具结果中的 `details.ignoredOverrides` 报告该值，以便丢弃可见。

### 高级

<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` 返回当前会话任务；`"list"` 检查提供商。
</ParamField>
<ParamField path="model" type="string">提供商/模型覆盖（例如 `runway/gen4.5`）。</ParamField>
<ParamField path="filename" type="string">输出文件名提示。</ParamField>
<ParamField path="timeoutMs" type="number">可选的提供商请求超时（毫秒）。</ParamField>
<ParamField path="providerOptions" type="object">
  提供商特定选项，作为 JSON 对象（例如 `{"seed": 42, "draft": true}`）。
  声明类型化模式的提供商验证键和类型；未知
  键或类型不匹配在回退期间跳过候选。没有
  声明模式的提供商按原样接收选项。运行 `video_generate action=list`
  查看每个提供商接受什么。
</ParamField>

<Note>
并非所有提供商都支持所有参数。OpenClaw 将时长规范化为最接近的提供商支持值，并在回退提供商暴露不同控制界面时重新映射翻译的几何提示（如尺寸转纵横比）。真正不支持的覆盖在尽力而为的基础上被忽略，并在工具结果中报告为警告。硬能力限制（如太多参考输入）在提交之前失败。工具结果报告应用的设置；`details.normalization` 捕获任何请求到应用的转换。
</Note>

参考输入选择运行时模式：

- 无参考媒体 → `generate`
- 任何图像参考 → `imageToVideo`
- 任何视频参考 → `videoToVideo`
- 参考音频输入**不**改变解析的模式；它们叠加在图像/视频参考选择的任何模式之上，仅适用于声明 `maxInputAudios` 的提供商。

混合图像和视频参考不是稳定的共享能力界面。每个请求最好使用一种参考类型。

#### 回退和类型化选项

某些能力检查在回退层而非工具边界应用，因此超过主要提供商限制的请求仍然可以在有能力的回退上运行：

- 未声明 `maxInputAudios`（或 `0`）的活动候选在请求包含音频参考时被跳过；尝试下一个候选。
- 活动候选的 `maxDurationSeconds` 低于请求的 `durationSeconds` 且未声明 `supportedDurationSeconds` 列表 → 跳过。
- 请求包含 `providerOptions` 且活动候选显式声明类型化 `providerOptions` 模式 → 如果提供的键不在模式中或值类型不匹配则跳过。没有声明模式的提供商按原样接收选项（向后兼容的传递）。提供商可以通过声明空模式（`capabilities.providerOptions: {}`）来退出所有提供商选项，这会导致与类型不匹配相同的跳过。

请求中的第一个跳过原因以 `warn` 级别记录，以便运营商看到其主要提供商何时被跳过；后续跳过以 `debug` 记录，以保持长回退链的安静。如果每个候选都被跳过，聚合错误包含每个候选的跳过原因。

## 操作

| 操作       | 功能                                                     |
| ---------- | -------------------------------------------------------- |
| `generate` | 默认。从给定提示和可选参考输入创建视频。                 |
| `status`   | 检查当前会话的飞行中视频任务的状态，无需开始另一个生成。 |
| `list`     | 显示可用的提供商、模型及其能力。                         |

## 模型选择

OpenClaw 按此顺序解析模型：

1. **`model` 工具参数** — 如果代理在调用中指定了一个。
2. 配置中的 **`videoGenerationModel.primary`**。
3. 按顺序的 **`videoGenerationModel.fallbacks`**。
4. **自动检测** — 具有有效认证的提供商，从当前默认提供商开始，然后按字母顺序排列剩余提供商。

如果提供商失败，自动尝试下一个候选。如果所有候选都失败，错误包含每次尝试的详情。

将 `agents.defaults.mediaGenerationAutoProviderFallback: false` 设置为仅使用显式 `model`、`primary` 和 `fallbacks` 条目。

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
        fallbacks: ["runway/gen4.5", "qwen/wan2.6-t2v"],
      },
    },
  },
}
```

## 提供商说明

<AccordionGroup>
  <Accordion title="Alibaba">
    使用 DashScope / Model Studio 异步端点。参考图像和视频必须是远程 `http(s)` URL。
  </Accordion>
  <Accordion title="BytePlus (1.0)">
    提供商 id：`byteplus`。

    模型：`seedance-1-0-pro-250528`（默认）、
    `seedance-1-0-pro-t2v-250528`、`seedance-1-0-pro-fast-251015`、
    `seedance-1-0-lite-t2v-250428`、`seedance-1-0-lite-i2v-250428`。

    T2V 模型（`*-t2v-*`）不接受图像输入；I2V 模型和
    通用 `*-pro-*` 模型支持单个参考图像（首帧）。按位置传递图像或设置 `role: "first_frame"`。
    当提供图像时，T2V 模型 ID 自动切换到对应的 I2V 变体。

    支持的 `providerOptions` 键：`seed`（数字）、`draft`（布尔值——强制 480p）、`camera_fixed`（布尔值）。

  </Accordion>
  <Accordion title="BytePlus Seedance 1.5">
    需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark)
    插件。提供商 id：`byteplus-seedance15`。模型：
    `seedance-1-5-pro-251215`。

    使用统一的 `content[]` API。最多支持 2 个输入图像
    （`first_frame` + `last_frame`）。所有输入必须是远程 `https://`
    URL。在每个图像上设置 `role: "first_frame"` / `"last_frame"`，或按位置传递图像。

    `aspectRatio: "adaptive"` 从输入图像自动检测比例。
    `audio: true` 映射到 `generate_audio`。`providerOptions.seed`
    （数字）被转发。

  </Accordion>
  <Accordion title="BytePlus Seedance 2.0">
    需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark)
    插件。提供商 id：`byteplus-seedance2`。模型：
    `dreamina-seedance-2-0-260128`、
    `dreamina-seedance-2-0-fast-260128`。

    使用统一的 `content[]` API。支持最多 9 个参考图像、
    3 个参考视频和 3 个参考音频。所有输入必须是远程
    `https://` URL。在每个资产上设置 `role`——支持的值：
    `"first_frame"`、`"last_frame"`、`"reference_image"`、
    `"reference_video"`、`"reference_audio"`。

    `aspectRatio: "adaptive"` 从输入图像自动检测比例。
    `audio: true` 映射到 `generate_audio`。`providerOptions.seed`
    （数字）被转发。

  </Accordion>
  <Accordion title="ComfyUI">
    工作流驱动的本地或云执行。通过配置的图形支持文字转视频和图像转视频。
  </Accordion>
  <Accordion title="fal">
    使用队列支持的流程处理长时间运行的任务。大多数 fal 视频模型接受单个图像参考。Seedance 2.0 参考转视频模型接受最多 9 张图像、3 个视频和 3 个音频参考，总参考文件最多 12 个。
  </Accordion>
  <Accordion title="Google（Gemini / Veo）">
    支持一个图像或一个视频参考。
  </Accordion>
  <Accordion title="MiniMax">
    仅支持单个图像参考。
  </Accordion>
  <Accordion title="OpenAI">
    仅转发 `size` 覆盖。其他风格覆盖
    （`aspectRatio`、`resolution`、`audio`、`watermark`）被忽略并带有警告。
  </Accordion>
  <Accordion title="OpenRouter">
    使用 OpenRouter 的异步 `/videos` API。OpenClaw 提交任务，轮询 `polling_url`，并下载 `unsigned_urls` 或记录的任务内容端点。捆绑的 `google/veo-3.1-fast` 默认声明 4/6/8 秒时长、`720P`/`1080P` 分辨率和 `16:9`/`9:16` 纵横比。
  </Accordion>
  <Accordion title="Qwen">
    与 Alibaba 相同的 DashScope 后端。参考输入必须是远程 `http(s)` URL；本地文件会被预先拒绝。
  </Accordion>
  <Accordion title="Runway">
    通过数据 URI 支持本地文件。视频转视频需要 `runway/gen4_aleph`。纯文本运行暴露 `16:9` 和 `9:16` 纵横比。
  </Accordion>
  <Accordion title="Together">
    仅支持单个图像参考。
  </Accordion>
  <Accordion title="Vydra">
    直接使用 `https://www.vydra.ai/api/v1` 以避免认证丢弃的重定向。`veo3` 仅捆绑为文字转视频；`kling` 需要远程图像 URL。
  </Accordion>
  <Accordion title="xAI">
    支持文字转视频、单首帧图像转视频、通过 xAI `reference_images` 最多 7 个 `reference_image` 输入，以及远程视频编辑/扩展流。
  </Accordion>
</AccordionGroup>

## 提供商能力模式

共享视频生成合约支持模式特定能力，而不仅仅是扁平聚合限制。新的提供商实现应优先使用显式模式块：

```typescript
capabilities: {
  generate: {
    maxVideos: 1,
    maxDurationSeconds: 10,
    supportsResolution: true,
  },
  imageToVideo: {
    enabled: true,
    maxVideos: 1,
    maxInputImages: 1,
    maxInputImagesByModel: { "provider/reference-to-video": 9 },
    maxDurationSeconds: 5,
  },
  videoToVideo: {
    enabled: true,
    maxVideos: 1,
    maxInputVideos: 1,
    maxDurationSeconds: 5,
  },
}
```

`maxInputImages` 和 `maxInputVideos` 等扁平聚合字段**不足以**声明转换模式支持。提供商应显式声明 `generate`、`imageToVideo` 和 `videoToVideo`，以便实时测试、合约测试和共享 `video_generate` 工具可以确定性地验证模式支持。

当提供商中的某个模型比其余模型具有更广泛的参考输入支持时，使用 `maxInputImagesByModel`、`maxInputVideosByModel` 或 `maxInputAudiosByModel`，而不是提高模式范围的限制。

## 实时测试

共享捆绑提供商的选择加入实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

仓库包装器：

```bash
pnpm test:live:media video
```

此实时文件从 `~/.profile` 加载缺失的提供商环境变量，默认优先使用实时/环境 API 密钥而非存储的认证配置文件，并默认运行发布安全冒烟：

- 扫描中每个非 FAL 提供商的 `generate`。
- 一秒龙虾提示。
- 来自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS`（默认 `180000`）的每提供商操作上限。

FAL 是选择加入的，因为提供商端队列延迟可能主导发布时间：

```bash
pnpm test:live:media video --video-providers fal
```

设置 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 还运行共享扫描可以使用本地媒体安全演练的已声明转换模式：

- 当 `capabilities.imageToVideo.enabled` 时 `imageToVideo`。
- 当 `capabilities.videoToVideo.enabled` 且提供商/模型在共享扫描中接受缓冲支持的本地视频输入时 `videoToVideo`。

目前，仅当你选择 `runway/gen4_aleph` 时，共享 `videoToVideo` 实时通道覆盖 `runway`。

## 配置

在你的 OpenClaw 配置中设置默认视频生成模型：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "qwen/wan2.6-t2v",
        fallbacks: ["qwen/wan2.6-r2v-flash"],
      },
    },
  },
}
```

或通过 CLI：

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "qwen/wan2.6-t2v"
```

## 相关链接

- [Alibaba Model Studio](/providers/alibaba)
- [后台任务](/automation/tasks) — 异步视频生成的任务跟踪
- [BytePlus](/concepts/model-providers#byteplus-international)
- [ComfyUI](/providers/comfy)
- [配置参考](/gateway/config-agents#agent-defaults)
- [fal](/providers/fal)
- [Google (Gemini)](/providers/google)
- [MiniMax](/providers/minimax)
- [模型](/concepts/models)
- [OpenAI](/providers/openai)
- [Qwen](/providers/qwen)
- [Runway](/providers/runway)
- [Together AI](/providers/together)
- [工具概述](/tools)
- [Vydra](/providers/vydra)
- [xAI](/providers/xai)
