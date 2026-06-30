---
summary: "在 OpenClaw 中通过 API 密钥或 Codex 订阅使用 OpenAI"
read_when:
  - 你想在 OpenClaw 中使用 OpenAI 模型
  - 你想使用 Codex 订阅认证而非 API 密钥
  - 你需要更严格的 GPT-5 代理执行行为
title: "OpenAI"
---

OpenAI 为 GPT 模型提供开发者 API，Codex 也可作为 ChatGPT 计划编程代理通过 OpenAI 的 Codex 客户端使用。OpenClaw 将这两个界面分开，以使配置保持可预测性。

OpenClaw 支持三种 OpenAI 家族路由。大多数希望 Codex 行为的 ChatGPT/Codex 订阅用户应使用原生 Codex 应用服务器运行时。模型前缀选择提供商/模型名称；单独的运行时设置选择谁执行嵌入的代理循环：

- **API 密钥** — 直接 OpenAI 平台访问，按使用量计费（`openai/*` 模型）
- **带原生 Codex 运行时的 Codex 订阅** — ChatGPT/Codex 登录加 Codex 应用服务器执行（`openai/*` 模型加 `agents.defaults.agentRuntime.id: "codex"`）
- **通过 PI 的 Codex 订阅** — 带普通 OpenClaw PI 运行器的 ChatGPT/Codex 登录（`openai-codex/*` 模型）

OpenAI 在外部工具和工作流（如 OpenClaw）中明确支持订阅 OAuth 使用。

提供商、模型、运行时和频道是独立的层。如果这些标签混在一起，请在更改配置前阅读[代理运行时](/concepts/agent-runtimes)。

## 快速选择

| 目标                                     | 使用                                           | 备注                                                                     |
| ---------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| 带原生 Codex 运行时的 ChatGPT/Codex 订阅 | `openai/gpt-5.5` 加 `agentRuntime.id: "codex"` | 大多数用户推荐的 Codex 设置。使用 `openai-codex` 认证登录。              |
| 直接 API 密钥计费                        | `openai/gpt-5.5`                               | 设置 `OPENAI_API_KEY` 或运行 OpenAI API 密钥引导。                       |
| 通过 PI 的 ChatGPT/Codex 订阅认证        | `openai-codex/gpt-5.5`                         | 仅在你有意使用普通 PI 运行器时使用。                                     |
| 图像生成或编辑                           | `openai/gpt-image-2`                           | 适用于 `OPENAI_API_KEY` 或 OpenAI Codex OAuth。                          |
| 透明背景图像                             | `openai/gpt-image-1.5`                         | 使用 `outputFormat=png` 或 `webp` 以及 `openai.background=transparent`。 |

## 命名映射

这些名称相似但不可互换：

| 你看到的名称                       | 层级         | 含义                                                                        |
| ---------------------------------- | ------------ | --------------------------------------------------------------------------- |
| `openai`                           | 提供商前缀   | 直接 OpenAI 平台 API 路由。                                                 |
| `openai-codex`                     | 提供商前缀   | 通过普通 OpenClaw PI 运行器的 OpenAI Codex OAuth/订阅路由。                 |
| `codex` 插件                       | 插件         | 捆绑的 OpenClaw 插件，提供原生 Codex 应用服务器运行时和 `/codex` 对话控制。 |
| `agentRuntime.id: codex`           | 代理运行时   | 强制使用原生 Codex 应用服务器框架进行嵌入轮次。                             |
| `/codex ...`                       | 对话命令集   | 从对话绑定/控制 Codex 应用服务器线程。                                      |
| `runtime: "acp", agentId: "codex"` | ACP 会话路由 | 通过 ACP/acpx 运行 Codex 的显式回退路径。                                   |

这意味着配置可以同时包含 `openai-codex/*` 和 `codex` 插件。当你想通过 PI 使用 Codex OAuth 并且同时希望原生 `/codex` 对话控制可用时，这是有效的。`openclaw doctor` 会警告该组合，以便你确认是有意为之；不会自动重写。

<Note>
GPT-5.5 可通过直接 OpenAI 平台 API 密钥访问和订阅/OAuth 路由使用。对于 ChatGPT/Codex 订阅加原生 Codex 执行，使用 `openai/gpt-5.5` 加 `agentRuntime.id: "codex"`。仅在通过 PI 使用 Codex OAuth 时使用 `openai-codex/gpt-5.5`，或在不带 Codex 运行时覆盖的直接 `OPENAI_API_KEY` 流量时使用 `openai/gpt-5.5`。
</Note>

<Note>
启用 OpenAI 插件或选择 `openai-codex/*` 模型不会启用捆绑的 Codex 应用服务器插件。只有当你使用 `agentRuntime.id: "codex"` 明确选择原生 Codex 框架，或使用旧版 `codex/*` 模型引用时，OpenClaw 才会启用该插件。如果捆绑的 `codex` 插件已启用但 `openai-codex/*` 仍通过 PI 解析，`openclaw doctor` 会发出警告并保持路由不变。
</Note>

## OpenClaw 功能覆盖

| OpenAI 功能          | OpenClaw 界面                                            | 状态                                 |
| -------------------- | -------------------------------------------------------- | ------------------------------------ |
| 对话 / Responses     | `openai/<model>` 模型提供商                              | 是                                   |
| Codex 订阅模型       | 带 `openai-codex` OAuth 的 `openai-codex/<model>`        | 是                                   |
| Codex 应用服务器框架 | 带 `agentRuntime.id: codex` 的 `openai/<model>`          | 是                                   |
| 服务器端网络搜索     | 原生 OpenAI Responses 工具                               | 是，当网络搜索已启用且未固定提供商时 |
| 图像                 | `image_generate`                                         | 是                                   |
| 视频                 | `video_generate`                                         | 是                                   |
| 文字转语音           | `messages.tts.provider: "openai"` / `tts`                | 是                                   |
| 批量语音转文字       | `tools.media.audio` / 媒体理解                           | 是                                   |
| 流式语音转文字       | 语音通话 `streaming.provider: "openai"`                  | 是                                   |
| 实时语音             | 语音通话 `realtime.provider: "openai"` / Control UI Talk | 是                                   |
| 嵌入                 | 记忆嵌入提供商                                           | 是                                   |

## 记忆嵌入

OpenClaw 可以使用 OpenAI 或 OpenAI 兼容的嵌入端点进行 `memory_search` 索引和查询嵌入：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
        model: "text-embedding-3-small",
      },
    },
  },
}
```

对于需要非对称嵌入标签的 OpenAI 兼容端点，在 `memorySearch` 下设置 `queryInputType` 和 `documentInputType`。OpenClaw 将它们作为提供商特定的 `input_type` 请求字段转发：查询嵌入使用 `queryInputType`；索引的记忆块和批量索引使用 `documentInputType`。完整示例请参见[记忆配置参考](/reference/memory-config#provider-specific-config)。

## 快速开始

选择你偏好的认证方式并按步骤设置。

<Tabs>
  <Tab title="API 密钥（OpenAI 平台）">
    **适合：** 直接 API 访问和按使用量计费。

    <Steps>
      <Step title="获取 API 密钥">
        从 [OpenAI 平台控制台](https://platform.openai.com/api-keys)创建或复制 API 密钥。
      </Step>
      <Step title="运行引导程序">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --openai-api-key "$OPENAI_API_KEY"
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider openai
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | 模型引用              | 运行时配置             | 路由                       | 认证             |
    | ---------------------- | -------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`       | 省略 / `agentRuntime.id: "pi"`    | 直接 OpenAI 平台 API  | `OPENAI_API_KEY` |
    | `openai/gpt-5.4-mini`  | 省略 / `agentRuntime.id: "pi"`    | 直接 OpenAI 平台 API  | `OPENAI_API_KEY` |
    | `openai/gpt-5.5`       | `agentRuntime.id: "codex"`           | Codex 应用服务器框架    | Codex 应用服务器 |

    <Note>
    `openai/*` 是直接 OpenAI API 密钥路由，除非你明确强制使用 Codex 应用服务器框架。对于通过默认 PI 运行器的 Codex OAuth，使用 `openai-codex/*`；或使用带 `agentRuntime.id: "codex"` 的 `openai/gpt-5.5` 进行原生 Codex 应用服务器执行。
    </Note>

    ### 配置示例

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```

    <Warning>
    OpenClaw **不**暴露 `openai/gpt-5.3-codex-spark`。实时 OpenAI API 请求拒绝该模型，当前 Codex 目录也不暴露它。
    </Warning>

  </Tab>

  <Tab title="Codex 订阅">
    **适合：** 使用 ChatGPT/Codex 订阅进行原生 Codex 应用服务器执行，而不需要单独的 API 密钥。Codex 云端需要 ChatGPT 登录。

    <Steps>
      <Step title="运行 Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        或直接运行 OAuth：

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        对于无头或回调不友好的设置，添加 `--device-code` 以使用 ChatGPT 设备代码流而非本地浏览器回调进行登录：

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="使用原生 Codex 运行时">
        ```bash
        openclaw config set plugins.entries.codex '{"enabled":true}' --strict-json --merge
        openclaw config set agents.defaults.model.primary openai/gpt-5.5
        openclaw config set agents.defaults.agentRuntime '{"id":"codex"}' --strict-json
        ```
      </Step>
      <Step title="验证 Codex 认证是否可用">
        ```bash
        openclaw models list --provider openai-codex
        ```

        Gateway 运行后，在对话中发送 `/codex status` 或 `/codex models` 来验证原生应用服务器运行时。
      </Step>
    </Steps>

    ### 路由摘要

    | 模型引用 | 运行时配置 | 路由 | 认证 |
    |-----------|----------------|-------|------|
    | `openai/gpt-5.5` | `agentRuntime.id: "codex"` | 原生 Codex 应用服务器框架 | Codex 登录或选定的 `openai-codex` 配置 |
    | `openai-codex/gpt-5.5` | 省略 / `runtime: "pi"` | 通过 PI 的 ChatGPT/Codex OAuth | Codex 登录 |
    | `openai-codex/gpt-5.4-mini` | 省略 / `runtime: "pi"` | 通过 PI 的 ChatGPT/Codex OAuth | Codex 登录 |
    | `openai-codex/gpt-5.5` | `runtime: "auto"` | 除非插件明确声明 `openai-codex`，否则仍为 PI | Codex 登录 |

    <Note>
    继续使用 `openai-codex` 提供商 ID 进行认证/配置命令。`openai-codex/*` 模型前缀也是 Codex OAuth 的显式 PI 路由。它不会选择或自动启用捆绑的 Codex 应用服务器框架。对于常见的订阅加原生运行时设置，使用 `openai-codex` 登录，但保持模型引用为 `openai/gpt-5.5` 并设置 `agentRuntime.id: "codex"`。
    </Note>

    ### 配置示例

    ```json5
    {
      plugins: { entries: { codex: { enabled: true } } },
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.5" },
          agentRuntime: { id: "codex" },
        },
      },
    }
    ```

    要改为在普通 PI 运行器上保留 Codex OAuth，使用 `openai-codex/gpt-5.5` 并省略 Codex 运行时覆盖。

    <Note>
    引导程序不再从 `~/.codex` 导入 OAuth 材料。使用浏览器 OAuth（默认）或上方的设备代码流登录 — OpenClaw 在其自己的代理认证存储中管理生成的凭据。
    </Note>

    ### 状态指示器

    对话 `/status` 显示当前会话的活动模型运行时。默认 PI 框架显示为 `Runtime: OpenClaw Pi Default`。当选择了捆绑的 Codex 应用服务器框架时，`/status` 显示 `Runtime: OpenAI Codex`。现有会话保留其记录的框架 ID，因此更改 `agentRuntime` 后，如果想让 `/status` 反映新的 PI/Codex 选择，请使用 `/new` 或 `/reset`。

    ### Doctor 警告

    如果捆绑的 `codex` 插件已启用而选择了 `openai-codex/*` 路由，`openclaw doctor` 会警告该模型仍通过 PI 解析。仅当该 PI 订阅认证路由是有意为之时，才保持配置不变。当你想要原生 Codex 应用服务器执行时，切换到 `openai/<model>` 加 `agentRuntime.id: "codex"`。

    ### 上下文窗口上限

    OpenClaw 将模型元数据和运行时上下文上限视为独立值。

    对于通过 Codex OAuth 的 `openai-codex/gpt-5.5`：

    - 原生 `contextWindow`：`1000000`
    - 默认运行时 `contextTokens` 上限：`272000`

    实践中较小的默认上限具有更好的延迟和质量特性。用 `contextTokens` 覆盖：

    ```json5
    {
      models: {
        providers: {
          "openai-codex": {
            models: [{ id: "gpt-5.5", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    使用 `contextWindow` 声明原生模型元数据。使用 `contextTokens` 限制运行时上下文预算。
    </Note>

    ### 目录恢复

    OpenClaw 在存在时使用 `gpt-5.5` 的上游 Codex 目录元数据。如果实时 Codex 发现在账户已认证时省略了 `openai-codex/gpt-5.5` 行，OpenClaw 会合成该 OAuth 模型行，以使 cron、子代理和已配置的默认模型运行不会因 `Unknown model` 失败。

  </Tab>
</Tabs>

## 原生 Codex 应用服务器认证

原生 Codex 应用服务器框架使用 `openai/*` 模型引用加 `agentRuntime.id: "codex"`，但其认证仍基于账户。OpenClaw 按以下顺序选择认证：

1. 绑定到代理的显式 OpenClaw `openai-codex` 认证配置。
2. 应用服务器的现有账户，如本地 Codex CLI ChatGPT 登录。
3. 仅对本地 stdio 应用服务器启动，当应用服务器未报告账户且仍需要 OpenAI 认证时，使用 `CODEX_API_KEY`，然后是 `OPENAI_API_KEY`。

这意味着本地 ChatGPT/Codex 订阅登录不会仅因为 gateway 进程也有 `OPENAI_API_KEY`（用于直接 OpenAI 模型或嵌入）就被替换。环境 API 密钥回退仅适用于本地 stdio 无账户路径；不会发送到 WebSocket 应用服务器连接。当选择了订阅风格的 Codex 配置时，OpenClaw 也会在启动的 stdio 应用服务器子进程中排除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`，并通过应用服务器登录 RPC 发送所选凭据。

## 图像生成

捆绑的 `openai` 插件通过 `image_generate` 工具注册了图像生成。它同时支持 OpenAI API 密钥图像生成和通过相同 `openai/gpt-image-2` 模型引用的 Codex OAuth 图像生成。

| 功能               | OpenAI API 密钥             | Codex OAuth                 |
| ------------------ | --------------------------- | --------------------------- |
| 模型引用           | `openai/gpt-image-2`        | `openai/gpt-image-2`        |
| 认证               | `OPENAI_API_KEY`            | OpenAI Codex OAuth 登录     |
| 传输               | OpenAI Images API           | Codex Responses 后端        |
| 每次请求最大图像数 | 4                           | 4                           |
| 编辑模式           | 已启用（最多 5 张参考图像） | 已启用（最多 5 张参考图像） |
| 尺寸覆盖           | 支持，包括 2K/4K 尺寸       | 支持，包括 2K/4K 尺寸       |
| 宽高比 / 分辨率    | 不转发给 OpenAI Images API  | 安全时映射到支持的尺寸      |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>
参见[图像生成](/tools/image-generation)了解共享工具参数、提供商选择和故障转移行为。
</Note>

`gpt-image-2` 是 OpenAI 文生图和图像编辑的默认模型。`gpt-image-1.5`、`gpt-image-1` 和 `gpt-image-1-mini` 仍可作为显式模型覆盖使用。使用 `openai/gpt-image-1.5` 输出透明背景 PNG/WebP；当前 `gpt-image-2` API 拒绝 `background: "transparent"`。

对于透明背景请求，代理应使用 `model: "openai/gpt-image-1.5"`、`outputFormat: "png"` 或 `"webp"` 以及 `background: "transparent"` 调用 `image_generate`；旧版 `openai.background` 提供商选项仍被接受。OpenClaw 还通过将默认的 `openai/gpt-image-2` 透明请求重写为 `gpt-image-1.5` 来保护公共 OpenAI 和 OpenAI Codex OAuth 路由；Azure 和自定义 OpenAI 兼容端点保留其已配置的部署/模型名称。

对于无头 CLI 运行，也提供相同的设置：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

从输入文件开始时，在 `openclaw infer image edit` 中使用相同的 `--output-format` 和 `--background` 标志。`--openai-background` 仍可作为 OpenAI 特定别名使用。

对于 Codex OAuth 安装，保持相同的 `openai/gpt-image-2` 引用。当配置了 `openai-codex` OAuth 配置时，OpenClaw 解析已存储的 OAuth 访问令牌并通过 Codex Responses 后端发送图像请求。它不会首先尝试 `OPENAI_API_KEY` 或静默地对该请求回退到 API 密钥。当你想要直接 OpenAI Images API 路由时，使用 API 密钥、自定义基础 URL 或 Azure 端点显式配置 `models.providers.openai`。如果该自定义图像端点位于受信任的局域网/私有地址，也需要设置 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`；OpenClaw 默认阻止私有/内部 OpenAI 兼容图像端点，除非存在此选择加入。

生成：

```
/tool image_generate model=openai/gpt-image-2 prompt="A polished launch poster for OpenClaw on macOS" size=3840x2160 count=1
```

生成透明 PNG：

```
/tool image_generate model=openai/gpt-image-1.5 prompt="A simple red circle sticker on a transparent background" outputFormat=png background=transparent
```

编辑：

```
/tool image_generate model=openai/gpt-image-2 prompt="Preserve the object shape, change the material to translucent glass" image=/path/to/reference.png size=1024x1536
```

## 视频生成

捆绑的 `openai` 插件通过 `video_generate` 工具注册了视频生成。

| 功能     | 值                                                                       |
| -------- | ------------------------------------------------------------------------ |
| 默认模型 | `openai/sora-2`                                                          |
| 模式     | 文生视频、图生视频、单视频编辑                                           |
| 参考输入 | 1 张图像或 1 段视频                                                      |
| 尺寸覆盖 | 支持                                                                     |
| 其他覆盖 | `aspectRatio`、`resolution`、`audio`、`watermark` 会被忽略并给出工具警告 |

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>
参见[视频生成](/tools/video-generation)了解共享工具参数、提供商选择和故障转移行为。
</Note>

## GPT-5 提示词贡献

OpenClaw 为跨提供商的 GPT-5 家族运行添加了共享的 GPT-5 提示词贡献。它按模型 ID 应用，因此 `openai-codex/gpt-5.5`、`openai/gpt-5.5`、`openrouter/openai/gpt-5.5`、`opencode/gpt-5.5` 和其他兼容的 GPT-5 引用收到相同的覆盖。旧版 GPT-4.x 模型不适用。

捆绑的原生 Codex 框架通过 Codex 应用服务器开发者指令使用相同的 GPT-5 行为和心跳覆盖，因此通过 `agentRuntime.id: "codex"` 强制使用 `openai/gpt-5.x` 的会话即使在 Codex 拥有其余框架提示词的情况下，也保持相同的跟进和主动心跳指导。

GPT-5 贡献为角色持久性、执行安全、工具规范、输出形状、完成检查和验证添加了标记行为契约。频道特定的回复和静默消息行为保留在共享的 OpenClaw 系统提示词和出站交付策略中。GPT-5 指导对匹配的模型始终启用。友好交互风格层是独立的，可配置的。

| 值                   | 效果                |
| -------------------- | ------------------- |
| `"friendly"`（默认） | 启用友好交互风格层  |
| `"on"`               | `"friendly"` 的别名 |
| `"off"`              | 仅禁用友好风格层    |

<Tabs>
  <Tab title="配置">
    ```json5
    {
      agents: {
        defaults: {
          promptOverlays: {
            gpt5: { personality: "friendly" },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="CLI">
    ```bash
    openclaw config set agents.defaults.promptOverlays.gpt5.personality off
    ```
  </Tab>
</Tabs>

<Tip>
值在运行时不区分大小写，因此 `"Off"` 和 `"off"` 都会禁用友好风格层。
</Tip>

<Note>
旧版 `plugins.entries.openai.config.personality` 在未设置共享的 `agents.defaults.promptOverlays.gpt5.personality` 设置时，仍作为兼容性回退读取。
</Note>

## 语音和语音功能

<AccordionGroup>
  <Accordion title="语音合成（TTS）">
    捆绑的 `openai` 插件为 `messages.tts` 界面注册了语音合成。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | 声音 | `messages.tts.providers.openai.voice` | `coral` |
    | 速度 | `messages.tts.providers.openai.speed` | （未设置） |
    | 指令 | `messages.tts.providers.openai.instructions` | （未设置，仅 `gpt-4o-mini-tts`） |
    | 格式 | `messages.tts.providers.openai.responseFormat` | 语音备忘录为 `opus`，文件为 `mp3` |
    | API 密钥 | `messages.tts.providers.openai.apiKey` | 回退到 `OPENAI_API_KEY` |
    | 基础 URL | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |
    | 额外 body | `messages.tts.providers.openai.extraBody` / `extra_body` | （未设置） |

    可用模型：`gpt-4o-mini-tts`、`tts-1`、`tts-1-hd`。可用声音：`alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`fable`、`juniper`、`marin`、`onyx`、`nova`、`sage`、`shimmer`、`verse`。

    `extraBody` 在 OpenClaw 生成的字段之后合并到 `/audio/speech` 请求 JSON 中，因此将其用于需要额外键（如 `lang`）的 OpenAI 兼容端点。原型键会被忽略。

    ```json5
    {
      messages: {
        tts: {
          providers: {
            openai: { model: "gpt-4o-mini-tts", voice: "coral" },
          },
        },
      },
    }
    ```

    <Note>
    设置 `OPENAI_TTS_BASE_URL` 可覆盖 TTS 基础 URL，而不影响对话 API 端点。
    </Note>

  </Accordion>

  <Accordion title="语音转文字">
    捆绑的 `openai` 插件通过 OpenClaw 的媒体理解转录界面注册了批量语音转文字。

    - 默认模型：`gpt-4o-transcribe`
    - 端点：OpenAI REST `/v1/audio/transcriptions`
    - 输入路径：多部分音频文件上传
    - 在 OpenClaw 使用 `tools.media.audio` 的任何地方都受支持，包括 Discord 语音频道片段和频道音频附件

    要强制 OpenAI 进行入站音频转录：

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "openai",
                model: "gpt-4o-transcribe",
              },
            ],
          },
        },
      },
    }
    ```

    语言和提示词提示在由共享音频媒体配置或每次调用转录请求提供时，会被转发给 OpenAI。

  </Accordion>

  <Accordion title="实时转录">
    捆绑的 `openai` 插件为语音通话插件注册了实时转录。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | 语言 | `...openai.language` | （未设置） |
    | 提示词 | `...openai.prompt` | （未设置） |
    | 静音持续时间 | `...openai.silenceDurationMs` | `800` |
    | VAD 阈值 | `...openai.vadThreshold` | `0.5` |
    | API 密钥 | `...openai.apiKey` | 回退到 `OPENAI_API_KEY` |

    <Note>
    使用 WebSocket 连接到 `wss://api.openai.com/v1/realtime`，采用 G.711 u-law（`g711_ulaw` / `audio/pcmu`）音频。此流式提供商适用于语音通话的实时转录路径；Discord 语音目前录制短片段并使用批量 `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="实时语音">
    捆绑的 `openai` 插件为语音通话插件注册了实时语音。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-1.5` |
    | 声音 | `...openai.voice` | `alloy` |
    | 温度 | `...openai.temperature` | `0.8` |
    | VAD 阈值 | `...openai.vadThreshold` | `0.5` |
    | 静音持续时间 | `...openai.silenceDurationMs` | `500` |
    | API 密钥 | `...openai.apiKey` | 回退到 `OPENAI_API_KEY` |

    <Note>
    支持通过 `azureEndpoint` 和 `azureDeployment` 配置键的 Azure OpenAI 后端实时桥接。支持双向工具调用。使用 G.711 u-law 音频格式。
    </Note>

    <Note>
    Control UI Talk 使用 OpenAI 浏览器实时会话，带有 Gateway 铸造的临时客户端密钥和直接浏览器 WebRTC SDP 与 OpenAI 实时 API 的交换。维护者实时验证可通过 `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` 进行；OpenAI 端在 Node 中铸造客户端密钥，使用虚假麦克风媒体生成浏览器 SDP offer，将其 POST 给 OpenAI，并应用 SDP 答案，而不记录密钥。
    </Note>

  </Accordion>
</AccordionGroup>

## Azure OpenAI 端点

捆绑的 `openai` 提供商可以通过覆盖基础 URL 来针对 Azure OpenAI 资源进行图像生成。在图像生成路径上，OpenClaw 检测 `models.providers.openai.baseUrl` 上的 Azure 主机名，并自动切换到 Azure 的请求形状。

<Note>
实时语音使用单独的配置路径（`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`），不受 `models.providers.openai.baseUrl` 影响。有关其 Azure 设置，请参见[语音和语音功能](#voice-and-speech)下的**实时语音**手风琴。
</Note>

在以下情况下使用 Azure OpenAI：

- 你已有 Azure OpenAI 订阅、配额或企业协议
- 你需要 Azure 提供的区域数据驻留或合规控制
- 你想在现有 Azure 租户内保持流量

### 配置

对于通过捆绑 `openai` 提供商的 Azure 图像生成，将 `models.providers.openai.baseUrl` 指向你的 Azure 资源，并将 `apiKey` 设置为 Azure OpenAI 密钥（不是 OpenAI 平台密钥）：

```json5
{
  models: {
    providers: {
      openai: {
        baseUrl: "https://<your-resource>.openai.azure.com",
        apiKey: "<azure-openai-api-key>",
      },
    },
  },
}
```

OpenClaw 识别以下 Azure 主机后缀用于 Azure 图像生成路由：

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

对于已识别 Azure 主机上的图像生成请求，OpenClaw：

- 发送 `api-key` 请求头而非 `Authorization: Bearer`
- 使用部署范围的路径（`/openai/deployments/{deployment}/...`）
- 为每个请求附加 `?api-version=...`
- Azure 图像生成调用使用 600 秒默认请求超时。每次调用的 `timeoutMs` 值仍会覆盖此默认值。

其他基础 URL（公共 OpenAI、OpenAI 兼容代理）保留标准 OpenAI 图像请求形状。

<Note>
`openai` 提供商图像生成路径的 Azure 路由需要 OpenClaw 2026.4.22 或更高版本。早期版本将任何自定义 `openai.baseUrl` 视为公共 OpenAI 端点，将无法对 Azure 图像部署使用。
</Note>

### API 版本

设置 `AZURE_OPENAI_API_VERSION` 以固定 Azure 图像生成路径的特定 Azure 预览或 GA 版本：

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

变量未设置时默认为 `2024-12-01-preview`。

### 模型名称即部署名称

Azure OpenAI 将模型绑定到部署。对于通过捆绑 `openai` 提供商路由的 Azure 图像生成请求，OpenClaw 中的 `model` 字段必须是你在 Azure 门户中配置的**Azure 部署名称**，而不是公共 OpenAI 模型 ID。

如果你创建了一个名为 `gpt-image-2-prod` 的部署来服务 `gpt-image-2`：

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

相同的部署名称规则适用于通过捆绑 `openai` 提供商路由的图像生成调用。

### 区域可用性

Azure 图像生成目前仅在部分区域可用（例如 `eastus2`、`swedencentral`、`polandcentral`、`westus3`、`uaenorth`）。在创建部署之前检查 Microsoft 当前的区域列表，并确认特定模型在你的区域中提供。

### 参数差异

Azure OpenAI 和公共 OpenAI 并不总是接受相同的图像参数。Azure 可能拒绝公共 OpenAI 允许的选项（例如 `gpt-image-2` 上的某些 `background` 值），或仅在特定模型版本上暴露它们。这些差异来自 Azure 和底层模型，而非 OpenClaw。如果 Azure 请求因验证错误失败，请在 Azure 门户中检查你的特定部署和 API 版本支持的参数集。

<Note>
Azure OpenAI 使用原生传输和兼容行为，但不接收 OpenClaw 的隐藏归属请求头 — 请参见[高级配置](#advanced-configuration)下的**原生 vs OpenAI 兼容路由**手风琴。

对于 Azure 上的对话或 Responses 流量（超出图像生成之外），使用引导流程或专用 Azure 提供商配置 — 单独的 `openai.baseUrl` 不会采用 Azure API/认证形状。存在一个单独的 `azure-openai-responses/*` 提供商；请参见下方的服务器端压缩手风琴。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="传输（WebSocket vs SSE）">
    OpenClaw 对 `openai/*` 和 `openai-codex/*` 都使用 WebSocket 优先加 SSE 回退（`"auto"`）。

    在 `"auto"` 模式下，OpenClaw：
    - 在回退到 SSE 之前重试一次早期 WebSocket 失败
    - 失败后，将 WebSocket 标记为降级约 60 秒，并在冷却期间使用 SSE
    - 为重试和重连附加稳定的会话和轮次身份请求头
    - 跨传输变体标准化使用量计数器（`input_tokens` / `prompt_tokens`）

    | 值 | 行为 |
    |-------|----------|
    | `"auto"`（默认） | WebSocket 优先，SSE 回退 |
    | `"sse"` | 强制仅 SSE |
    | `"websocket"` | 强制仅 WebSocket |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: { transport: "auto" },
            },
            "openai-codex/gpt-5.5": {
              params: { transport: "auto" },
            },
          },
        },
      },
    }
    ```

    相关 OpenAI 文档：
    - [使用 WebSocket 的实时 API](https://platform.openai.com/docs/guides/realtime-websocket)
    - [流式 API 响应（SSE）](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="WebSocket 预热">
    OpenClaw 默认为 `openai/*` 和 `openai-codex/*` 启用 WebSocket 预热，以减少首轮延迟。

    ```json5
    // 禁用预热
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: { openaiWsWarmup: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="快速模式">
    OpenClaw 为 `openai/*` 和 `openai-codex/*` 提供了共享的快速模式开关：

    - **对话/UI：** `/fast status|on|off`
    - **配置：** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    启用时，OpenClaw 将快速模式映射到 OpenAI 优先处理（`service_tier = "priority"`）。现有的 `service_tier` 值被保留，快速模式不会重写 `reasoning` 或 `text.verbosity`。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { fastMode: true } },
          },
        },
      },
    }
    ```

    <Note>
    会话覆盖优先于配置。在会话 UI 中清除会话覆盖会将会话恢复为配置的默认值。
    </Note>

  </Accordion>

  <Accordion title="优先处理（service_tier）">
    OpenAI 的 API 通过 `service_tier` 暴露优先处理。在 OpenClaw 中按模型设置：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { serviceTier: "priority" } },
          },
        },
      },
    }
    ```

    支持的值：`auto`、`default`、`flex`、`priority`。

    <Warning>
    `serviceTier` 仅转发给原生 OpenAI 端点（`api.openai.com`）和原生 Codex 端点（`chatgpt.com/backend-api`）。如果你通过代理路由任一提供商，OpenClaw 会保持 `service_tier` 不变。
    </Warning>

  </Accordion>

  <Accordion title="服务器端压缩（Responses API）">
    对于直接 OpenAI Responses 模型（`api.openai.com` 上的 `openai/*`），OpenAI 插件的 Pi 框架流包装器会自动启用服务器端压缩：

    - 强制 `store: true`（除非模型兼容设置 `supportsStore: false`）
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 默认 `compact_threshold`：`contextWindow` 的 70%（不可用时为 `80000`）

    这适用于内置 Pi 框架路径和嵌入运行使用的 OpenAI 提供商钩子。原生 Codex 应用服务器框架通过 Codex 管理其自己的上下文，并通过 `agents.defaults.agentRuntime.id` 单独配置。

    <Tabs>
      <Tab title="显式启用">
        适用于 Azure OpenAI Responses 等兼容端点：

        ```json5
        {
          agents: {
            defaults: {
              models: {
                "azure-openai-responses/gpt-5.5": {
                  params: { responsesServerCompaction: true },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="自定义阈值">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.5": {
                  params: {
                    responsesServerCompaction: true,
                    responsesCompactThreshold: 120000,
                  },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="禁用">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.5": {
                  params: { responsesServerCompaction: false },
                },
              },
            },
          },
        }
        ```
      </Tab>
    </Tabs>

    <Note>
    `responsesServerCompaction` 只控制 `context_management` 注入。直接 OpenAI Responses 模型仍然强制 `store: true`，除非兼容设置了 `supportsStore: false`。
    </Note>

  </Accordion>

  <Accordion title="严格代理 GPT 模式">
    对于 `openai/*` 上的 GPT-5 家族运行，OpenClaw 可以使用更严格的嵌入执行契约：

    ```json5
    {
      agents: {
        defaults: {
          embeddedPi: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    使用 `strict-agentic` 时，OpenClaw：
    - 当工具操作可用时，不再将仅计划轮次视为成功进展
    - 使用立即执行引导重试该轮次
    - 为实质性工作自动启用 `update_plan`
    - 如果模型持续计划而不执行，则暴露显式的阻塞状态

    <Note>
    仅限于 OpenAI 和 Codex GPT-5 家族运行。其他提供商和旧版模型家族保持默认行为。
    </Note>

  </Accordion>

  <Accordion title="原生 vs OpenAI 兼容路由">
    OpenClaw 对直接 OpenAI、Codex 和 Azure OpenAI 端点与通用 OpenAI 兼容 `/v1` 代理的处理方式不同：

    **原生路由**（`openai/*`、Azure OpenAI）：
    - 仅对支持 OpenAI `none` 努力的模型保留 `reasoning: { effort: "none" }`
    - 对拒绝 `reasoning.effort: "none"` 的模型或代理省略禁用的推理
    - 默认将工具架构设为严格模式
    - 仅在已验证的原生主机上附加隐藏归属请求头
    - 保留 OpenAI 专有请求形状（`service_tier`、`store`、推理兼容、提示词缓存提示）

    **代理/兼容路由：**
    - 使用更宽松的兼容行为
    - 从非原生 `openai-completions` 载荷中去除 Completions `store`
    - 接受高级的 `params.extra_body`/`params.extraBody` 传透 JSON 用于 OpenAI 兼容 Completions 代理
    - 接受 `params.chat_template_kwargs` 用于 OpenAI 兼容 Completions 代理（如 vLLM）
    - 不强制严格工具架构或仅原生请求头

    Azure OpenAI 使用原生传输和兼容行为，但不接收隐藏归属请求头。

  </Accordion>
</AccordionGroup>

## 相关内容

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
  <Card title="OAuth 和认证" href="/gateway/authentication" icon="key">
    认证详情和凭据复用规则。
  </Card>
</CardGroup>
