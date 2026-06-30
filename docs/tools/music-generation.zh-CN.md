---
summary: "通过 music_generate 在 Google Lyria、MiniMax 和 ComfyUI 工作流中生成音乐"
read_when:
  - 通过代理生成音乐或音频
  - 配置音乐生成提供商和模型
  - 了解 music_generate 工具参数
title: "音乐生成"
sidebarTitle: "音乐生成"
---

`music_generate` 工具让代理可以通过共享的音乐生成能力以及配置的提供商（目前支持 Google、MiniMax 和通过工作流配置的 ComfyUI）来创建音乐或音频。

对于会话支持的代理运行，OpenClaw 将音乐生成作为后台任务启动，在任务台账中追踪，当音轨就绪后再次唤醒代理，以便代理将完成的音频发布回原始频道。

<Note>
内置的共享工具仅在至少有一个音乐生成提供商可用时才会出现。如果你在代理工具中看不到 `music_generate`，请配置 `agents.defaults.musicGenerationModel` 或设置提供商 API 密钥。
</Note>

## 快速开始

<Tabs>
  <Tab title="共享提供商支持">
    <Steps>
      <Step title="配置认证">
        为至少一个提供商设置 API 密钥——例如
        `GEMINI_API_KEY` 或 `MINIMAX_API_KEY`。
      </Step>
      <Step title="选择默认模型（可选）">
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
      </Step>
      <Step title="询问代理">
        _"生成一首关于霓虹城市夜晚驾车的欢快电子流行音乐。"_

        代理会自动调用 `music_generate`。无需进行工具白名单设置。
      </Step>
    </Steps>

    对于没有会话支持的直接同步上下文，内置工具仍然会回退到内联生成，并在工具结果中返回最终媒体路径。

  </Tab>
  <Tab title="ComfyUI 工作流">
    <Steps>
      <Step title="配置工作流">
        使用工作流 JSON 和提示/输出节点配置 `plugins.entries.comfy.config.music`。
      </Step>
      <Step title="云端认证（可选）">
        对于 Comfy Cloud，设置 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`。
      </Step>
      <Step title="调用工具">
        ```text
        /tool music_generate prompt="带有柔和磁带纹理的温暖氛围合成音效循环"
        ```
      </Step>
    </Steps>
  </Tab>
</Tabs>

示例提示：

```text
Generate a cinematic piano track with soft strings and no vocals.
```

```text
Generate an energetic chiptune loop about launching a rocket at sunrise.
```

## 支持的提供商

| 提供商  | 默认模型               | 参考输入       | 支持的控制                                                | 认证                                   |
| ------- | ---------------------- | -------------- | --------------------------------------------------------- | -------------------------------------- |
| ComfyUI | `workflow`             | 最多 1 张图片  | 工作流定义的音乐或音频                                    | `COMFY_API_KEY`, `COMFY_CLOUD_API_KEY` |
| Google  | `lyria-3-clip-preview` | 最多 10 张图片 | `lyrics`, `instrumental`, `format`                        | `GEMINI_API_KEY`, `GOOGLE_API_KEY`     |
| MiniMax | `music-2.6`            | 无             | `lyrics`, `instrumental`, `durationSeconds`, `format=mp3` | `MINIMAX_API_KEY` 或 MiniMax OAuth     |

### 能力矩阵

`music_generate`、合约测试和共享实时扫描使用的显式模式合约：

| 提供商  | `generate` | `edit` | 编辑限制  | 共享实时通道                                                  |
| ------- | :--------: | :----: | --------- | ------------------------------------------------------------- |
| ComfyUI |     ✓      |   ✓    | 1 张图片  | 不在共享扫描中；由 `extensions/comfy/comfy.live.test.ts` 覆盖 |
| Google  |     ✓      |   ✓    | 10 张图片 | `generate`, `edit`                                            |
| MiniMax |     ✓      |   —    | 无        | `generate`                                                    |

使用 `action: "list"` 在运行时检查可用的共享提供商和模型：

```text
/tool music_generate action=list
```

使用 `action: "status"` 检查活跃的会话支持音乐任务：

```text
/tool music_generate action=status
```

直接生成示例：

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## 工具参数

<ParamField path="prompt" type="string" required>
  音乐生成提示。`action: "generate"` 时必填。
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` 返回当前会话任务；`"list"` 检查提供商。
</ParamField>
<ParamField path="model" type="string">
  提供商/模型覆盖（例如 `google/lyria-3-pro-preview`、`comfy/workflow`）。
</ParamField>
<ParamField path="lyrics" type="string">
  当提供商支持显式歌词输入时的可选歌词。
</ParamField>
<ParamField path="instrumental" type="boolean">
  当提供商支持时，请求仅器乐输出。
</ParamField>
<ParamField path="image" type="string">
  单个参考图片路径或 URL。
</ParamField>
<ParamField path="images" type="string[]">
  多个参考图片（支持的提供商最多 10 张）。
</ParamField>
<ParamField path="durationSeconds" type="number">
  当提供商支持时间提示时的目标时长（秒）。
</ParamField>
<ParamField path="format" type='"mp3" | "wav"'>
  当提供商支持时的输出格式提示。
</ParamField>
<ParamField path="filename" type="string">输出文件名提示。</ParamField>
<ParamField path="timeoutMs" type="number">可选的提供商请求超时时间（毫秒）。低于 10000ms 的值会被提高到 10000ms 并在工具结果中报告。</ParamField>

<Note>
并非所有提供商都支持所有参数。OpenClaw 在提交前仍会验证硬性限制，例如输入数量。当提供商支持时长但最大值小于请求值时，OpenClaw 会将其限制到最接近的支持时长。当所选提供商或模型无法满足时，真正不支持的可选提示会被忽略并附带警告。工具结果报告已应用的设置；`details.normalization` 记录任何请求到应用的映射。
</Note>

## 异步行为

会话支持的音乐生成作为后台任务运行：

- **后台任务：** `music_generate` 创建后台任务，立即返回已启动/任务响应，并在稍后的后续代理消息中发布完成的音轨。
- **防重复：** 当任务处于 `queued` 或 `running` 状态时，同一会话中后续的 `music_generate` 调用会返回任务状态而非开始另一次生成。使用 `action: "status"` 进行显式检查。
- **状态查询：** `openclaw tasks list` 或 `openclaw tasks show <taskId>` 检查排队、运行中和终止状态。
- **完成唤醒：** OpenClaw 将内部完成事件注入同一会话，以便模型可以自行撰写面向用户的后续消息。
- **提示提示：** 同一会话中后续的用户/手动轮次会在音乐任务已在进行中时获得一个小的运行时提示，以防止模型盲目再次调用 `music_generate`。
- **无会话回退：** 没有真实代理会话的直接/本地上下文会内联运行，并在同一轮次返回最终音频结果。

### 任务生命周期

| 状态        | 含义                                                            |
| ----------- | --------------------------------------------------------------- |
| `queued`    | 任务已创建，等待提供商接受。                                    |
| `running`   | 提供商正在处理（通常需要 30 秒到 3 分钟，取决于提供商和时长）。 |
| `succeeded` | 音轨就绪；代理唤醒并将其发布到对话中。                          |
| `failed`    | 提供商错误或超时；代理唤醒并附带错误详情。                      |

通过 CLI 检查状态：

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

## 配置

### 模型选择

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
        fallbacks: ["minimax/music-2.6"],
      },
    },
  },
}
```

### 提供商选择顺序

OpenClaw 按以下顺序尝试提供商：

1. 工具调用中的 `model` 参数（如果代理指定了）。
2. 配置中的 `musicGenerationModel.primary`。
3. 按顺序使用 `musicGenerationModel.fallbacks`。
4. 仅使用认证支持的提供商默认值自动检测：
   - 首先是当前默认提供商；
   - 然后按提供商 id 顺序排列剩余已注册的音乐生成提供商。

如果提供商失败，会自动尝试下一个候选。如果全部失败，错误会包含每次尝试的详情。

将 `agents.defaults.mediaGenerationAutoProviderFallback: false` 设置为仅使用显式的 `model`、`primary` 和 `fallbacks` 条目。

## 提供商说明

<AccordionGroup>
  <Accordion title="ComfyUI">
    工作流驱动，依赖配置的图形加上提示/输出字段的节点映射。捆绑的 `comfy` 插件通过音乐生成提供商注册表接入共享的 `music_generate` 工具。
  </Accordion>
  <Accordion title="Google（Lyria 3）">
    使用 Lyria 3 批量生成。当前捆绑的流程支持提示、可选的歌词文本和可选的参考图片。
  </Accordion>
  <Accordion title="MiniMax">
    使用批量 `music_generation` 端点。通过 `minimax` API 密钥认证或 `minimax-portal` OAuth，支持提示、可选歌词、器乐模式、时长引导和 mp3 输出。
  </Accordion>
</AccordionGroup>

## 选择合适的路径

- **共享提供商支持**：当你想要模型选择、提供商故障转移和内置的异步任务/状态流程时使用。
- **插件路径（ComfyUI）**：当你需要自定义工作流图或不在共享捆绑音乐能力中的提供商时使用。

如果你在调试 ComfyUI 特定行为，请参阅 [ComfyUI](/providers/comfy)。如果你在调试共享提供商行为，请从 [Google (Gemini)](/providers/google) 或 [MiniMax](/providers/minimax) 开始。

## 提供商能力模式

共享音乐生成合约支持显式模式声明：

- `generate` 用于纯提示生成。
- `edit` 用于请求包含一个或多个参考图片的情况。

新的提供商实现应优先使用显式模式块：

```typescript
capabilities: {
  generate: {
    maxTracks: 1,
    supportsLyrics: true,
    supportsFormat: true,
  },
  edit: {
    enabled: true,
    maxTracks: 1,
    maxInputImages: 1,
    supportsFormat: true,
  },
}
```

`maxInputImages`、`supportsLyrics` 和 `supportsFormat` 等旧式平面字段**不足以**声明编辑支持。提供商应明确声明 `generate` 和 `edit`，以便实时测试、合约测试和共享 `music_generate` 工具可以确定性地验证模式支持。

## 实时测试

共享捆绑提供商的可选实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

仓库包装器：

```bash
pnpm test:live:media music
```

此实时文件从 `~/.profile` 加载缺失的提供商环境变量，默认优先使用实时/环境 API 密钥而非存储的认证配置文件，并在提供商启用编辑模式时运行 `generate` 和声明的 `edit` 覆盖。当前覆盖：

- `google`：`generate` 加上 `edit`
- `minimax`：仅 `generate`
- `comfy`：单独的 Comfy 实时覆盖，不在共享提供商扫描中

捆绑 ComfyUI 音乐路径的可选实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

Comfy 实时文件在配置了相关部分时还覆盖 Comfy 图像和视频工作流。

## 相关链接

- [后台任务](/automation/tasks) — 分离的 `music_generate` 运行的任务追踪
- [ComfyUI](/providers/comfy)
- [配置参考](/gateway/config-agents#agent-defaults) — `musicGenerationModel` 配置
- [Google (Gemini)](/providers/google)
- [MiniMax](/providers/minimax)
- [模型](/concepts/models) — 模型配置和故障转移
- [工具概览](/tools)
