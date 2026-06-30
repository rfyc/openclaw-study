---
summary: "使用 Ollama 运行 OpenClaw（云端和本地模型）"
read_when:
  - 你想通过 Ollama 使用云端或本地模型运行 OpenClaw
  - 你需要 Ollama 的设置和配置指引
  - 你想使用 Ollama 视觉模型进行图像理解
title: "Ollama"
---

OpenClaw 集成了 Ollama 的原生 API（`/api/chat`），支持托管云端模型和本地/自托管 Ollama 服务器。你可以三种模式使用 Ollama：通过可访问的 Ollama 主机实现`云端 + 本地`，针对 `https://ollama.com` 的`仅云端`，或针对可访问 Ollama 主机的`仅本地`。

<Warning>
**远程 Ollama 用户**：请勿在 OpenClaw 中使用 `/v1` OpenAI 兼容 URL（`http://host:11434/v1`）。这会导致工具调用失败，模型可能将原始工具 JSON 作为纯文本输出。请使用原生 Ollama API URL：`baseUrl: "http://host:11434"`（不含 `/v1`）。
</Warning>

Ollama 提供商配置使用 `baseUrl` 作为规范键。OpenClaw 也接受 `baseURL` 以与 OpenAI SDK 风格示例兼容，但新配置应优先使用 `baseUrl`。

## 认证规则

<AccordionGroup>
  <Accordion title="本地和局域网主机">
    本地和局域网 Ollama 主机不需要真实的 Bearer 令牌。OpenClaw 仅对环回、私有网络、`.local` 和裸主机名 Ollama 基础 URL 使用本地 `ollama-local` 标记。
  </Accordion>
  <Accordion title="远程和 Ollama Cloud 主机">
    远程公共主机和 Ollama Cloud（`https://ollama.com`）需要通过 `OLLAMA_API_KEY`、认证配置或提供商的 `apiKey` 提供真实凭据。
  </Accordion>
  <Accordion title="自定义提供商 ID">
    设置 `api: "ollama"` 的自定义提供商 ID 遵循相同规则。例如，指向私有局域网 Ollama 主机的 `ollama-remote` 提供商可以使用 `apiKey: "ollama-local"`，子代理会通过 Ollama 提供商钩子解析该标记，而不是将其视为缺失凭据。记忆搜索也可以将 `agents.defaults.memorySearch.provider` 设置为该自定义提供商 ID，以便嵌入使用对应的 Ollama 端点。
  </Accordion>
  <Accordion title="认证配置">
    `auth-profiles.json` 存储提供商 ID 的凭据。将端点设置（`baseUrl`、`api`、模型 ID、请求头、超时）放在 `models.providers.<id>` 中。旧版扁平认证配置文件（如 `{ "ollama-windows": { "apiKey": "ollama-local" } }`）不是运行时格式；运行 `openclaw doctor --fix` 将其重写为规范的带备份的 `ollama-windows:default` API 密钥配置。该文件中的 `baseUrl` 是兼容性噪音，应移至提供商配置。
  </Accordion>
  <Accordion title="记忆嵌入范围">
    当 Ollama 用于记忆嵌入时，Bearer 认证的范围限于声明它的主机：

    - 提供商级别的密钥只发送到该提供商的 Ollama 主机。
    - `agents.*.memorySearch.remote.apiKey` 只发送到其远程嵌入主机。
    - 纯 `OLLAMA_API_KEY` 环境值被视为 Ollama Cloud 约定，默认不发送到本地或自托管主机。

  </Accordion>
</AccordionGroup>

## 快速开始

选择你偏好的设置方法和模式。

<Tabs>
  <Tab title="引导程序（推荐）">
    **适合：** 快速完成 Ollama 云端或本地设置。

    <Steps>
      <Step title="运行引导程序">
        ```bash
        openclaw onboard
        ```

        从提供商列表中选择 **Ollama**。
      </Step>
      <Step title="选择模式">
        - **云端 + 本地** — 本地 Ollama 主机加上通过该主机路由的云端模型
        - **仅云端** — 通过 `https://ollama.com` 使用托管 Ollama 模型
        - **仅本地** — 仅使用本地模型

      </Step>
      <Step title="选择模型">
        `仅云端`会提示输入 `OLLAMA_API_KEY` 并建议托管云端默认值。`云端 + 本地`和`仅本地`会询问 Ollama 基础 URL，发现可用模型，并在所选本地模型尚未下载时自动拉取。当 Ollama 报告已安装的 `:latest` 标签（如 `gemma4:latest`）时，设置会只显示该已安装模型一次，而不是同时显示 `gemma4` 和 `gemma4:latest` 或再次拉取裸别名。`云端 + 本地`还会检查该 Ollama 主机是否已登录云端访问。
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider ollama
        ```
      </Step>
    </Steps>

    ### 非交互模式

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --accept-risk
    ```

    可选择指定自定义基础 URL 或模型：

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --custom-base-url "http://ollama-host:11434" \
      --custom-model-id "qwen3.5:27b" \
      --accept-risk
    ```

  </Tab>

  <Tab title="手动设置">
    **适合：** 完全控制云端或本地设置。

    <Steps>
      <Step title="选择云端或本地">
        - **云端 + 本地**：安装 Ollama，使用 `ollama signin` 登录，并通过该主机路由云端请求
        - **仅云端**：使用 `https://ollama.com` 和 `OLLAMA_API_KEY`
        - **仅本地**：从 [ollama.com/download](https://ollama.com/download) 安装 Ollama

      </Step>
      <Step title="拉取本地模型（仅本地）">
        ```bash
        ollama pull gemma4
        # 或
        ollama pull gpt-oss:20b
        # 或
        ollama pull llama3.3
        ```
      </Step>
      <Step title="为 OpenClaw 启用 Ollama">
        对于`仅云端`，使用真实的 `OLLAMA_API_KEY`。对于主机支持的设置，任何占位符值都可以：

        ```bash
        # 云端
        export OLLAMA_API_KEY="your-ollama-api-key"

        # 仅本地
        export OLLAMA_API_KEY="ollama-local"

        # 或在配置文件中配置
        openclaw config set models.providers.ollama.apiKey "OLLAMA_API_KEY"
        ```
      </Step>
      <Step title="检查并设置模型">
        ```bash
        openclaw models list
        openclaw models set ollama/gemma4
        ```

        或在配置中设置默认值：

        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "ollama/gemma4" },
            },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 云端模型

<Tabs>
  <Tab title="云端 + 本地">
    `云端 + 本地`使用可访问的 Ollama 主机作为本地和云端模型的控制点。这是 Ollama 推荐的混合流程。

    在设置时选择**云端 + 本地**。OpenClaw 会提示输入 Ollama 基础 URL，从该主机发现本地模型，并通过 `ollama signin` 检查主机是否已登录云端访问。当主机已登录时，OpenClaw 还会建议托管云端默认值，如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud` 和 `glm-5.1:cloud`。

    如果主机尚未登录，OpenClaw 会保持仅本地设置，直到你运行 `ollama signin`。

  </Tab>

  <Tab title="仅云端">
    `仅云端`在 `https://ollama.com` 的托管 API 上运行。

    在设置时选择**仅云端**。OpenClaw 会提示输入 `OLLAMA_API_KEY`，设置 `baseUrl: "https://ollama.com"`，并初始化托管云端模型列表。此路径**不**需要本地 Ollama 服务器或 `ollama signin`。

    `openclaw onboard` 期间显示的云端模型列表从 `https://ollama.com/api/tags` 实时获取，上限 500 条，因此选择器反映当前托管目录而非静态种子。如果设置时 `ollama.com` 不可访问或未返回模型，OpenClaw 会回退到之前的硬编码建议，以便引导程序仍可完成。

  </Tab>

  <Tab title="仅本地">
    在仅本地模式下，OpenClaw 从已配置的 Ollama 实例发现模型。此路径适用于本地或自托管 Ollama 服务器。

    OpenClaw 目前建议将 `gemma4` 作为本地默认值。

  </Tab>
</Tabs>

## 模型发现（隐式提供商）

当你设置了 `OLLAMA_API_KEY`（或认证配置）且**未**定义 `models.providers.ollama` 或另一个使用 `api: "ollama"` 的自定义远程提供商时，OpenClaw 从 `http://127.0.0.1:11434` 的本地 Ollama 实例发现模型。

| 行为     | 详情                                                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 目录查询 | 查询 `/api/tags`                                                                                                             |
| 能力检测 | 使用尽力而为的 `/api/show` 查找来读取 `contextWindow`、扩展的 `num_ctx` Modelfile 参数，以及包括视觉/工具在内的能力          |
| 视觉模型 | 由 `/api/show` 报告具有 `vision` 能力的模型会被标记为支持图像（`input: ["text", "image"]`），OpenClaw 会自动将图像注入提示词 |
| 推理检测 | 在可用时使用 `/api/show` 能力（包括 `thinking`）；当 Ollama 省略能力时，回退到模型名称启发式（`r1`、`reasoning`、`think`）   |
| 令牌限制 | 将 `maxTokens` 设置为 OpenClaw 使用的默认 Ollama 最大令牌上限                                                                |
| 成本     | 将所有成本设置为 `0`                                                                                                         |

这样可以避免手动输入模型条目，同时使目录与本地 Ollama 实例保持一致。你可以在本地 `infer model run` 中使用如 `ollama/<pulled-model>:latest` 的完整引用；OpenClaw 无需手写 `models.json` 条目即可从 Ollama 的实时目录解析该已安装模型。

对于已登录的 Ollama 主机，一些 `:cloud` 模型可能在出现在 `/api/tags` 之前就可通过 `/api/chat` 和 `/api/show` 使用。当你明确选择完整的 `ollama/<model>:cloud` 引用时，OpenClaw 会通过 `/api/show` 验证该缺失的模型，并且仅在 Ollama 确认模型元数据时才将其添加到运行时目录。拼写错误仍会因未知模型而失败，而不是自动创建。

```bash
# 查看可用模型
ollama list
openclaw models list
```

对于避免完整代理工具界面的窄文本生成冒烟测试，使用带完整 Ollama 模型引用的本地 `infer model run`：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/llama3.2:latest \
    --prompt "Reply with exactly: pong" \
    --json
```

该路径仍使用 OpenClaw 配置的提供商、认证和原生 Ollama 传输，但不会启动对话代理轮次或加载 MCP/工具上下文。如果此操作成功但正常代理回复失败，请接下来排查模型的代理提示/工具能力。

对于在同一精简路径上的视觉模型冒烟测试，向 `infer model run` 添加一个或多个图像文件。这会直接将提示词和图像发送给选定的 Ollama 视觉模型，而不加载对话工具、记忆或之前的会话上下文：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/qwen2.5vl:7b \
    --prompt "Describe this image in one sentence." \
    --file ./photo.jpg \
    --json
```

`model run --file` 接受检测为 `image/*` 的文件，包括常见的 PNG、JPEG 和 WebP 输入。非图像文件在调用 Ollama 之前会被拒绝。对于语音识别，请使用 `openclaw infer audio transcribe`。

当你通过 `/model ollama/<model>` 切换对话时，OpenClaw 将其视为明确的用户选择。如果配置的 Ollama `baseUrl` 不可访问，下一个回复会因提供商错误而失败，而不是静默地使用另一个已配置的回退模型。

隔离的定时任务在启动代理轮次前会进行额外的本地安全检查。如果所选模型解析为本地、私有网络或 `.local` Ollama 提供商，且 `/api/tags` 不可访问，OpenClaw 会将该定时任务记录为 `skipped`，错误文本中包含所选的 `ollama/<model>`。端点预检缓存 5 分钟，因此多个指向同一已停止 Ollama 守护进程的定时任务不会都发起失败的模型请求。

使用以下命令对本地 Ollama 进行实时验证文本路径、原生流式路径和嵌入：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 \
  pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

要添加新模型，只需用 Ollama 拉取它：

```bash
ollama pull mistral
```

新模型将被自动发现并可供使用。

<Note>
如果你显式设置了 `models.providers.ollama`，或配置了使用 `api: "ollama"` 的自定义远程提供商（如 `models.providers.ollama-cloud`），则会跳过自动发现，你必须手动定义模型。像 `http://127.0.0.2:11434` 这样的环回自定义提供商仍被视为本地。请参见下方的显式配置部分。
</Note>

## 视觉和图像描述

捆绑的 Ollama 插件将 Ollama 注册为支持图像的媒体理解提供商。这使 OpenClaw 可以通过本地或托管 Ollama 视觉模型路由明确的图像描述请求和配置的图像模型默认值。

对于本地视觉，拉取支持图像的模型：

```bash
ollama pull qwen2.5vl:7b
export OLLAMA_API_KEY="ollama-local"
```

然后用 infer CLI 验证：

```bash
openclaw infer image describe \
  --file ./photo.jpg \
  --model ollama/qwen2.5vl:7b \
  --json
```

`--model` 必须是完整的 `<provider/model>` 引用。设置后，`openclaw infer image describe` 会直接运行该模型，而不是因为模型支持原生视觉而跳过描述。

当你想要 OpenClaw 的图像理解提供商流程、已配置的 `agents.defaults.imageModel` 和图像描述输出形状时，使用 `infer image describe`。当你想要带自定义提示词和一个或多个图像的原始多模态模型探测时，使用 `infer model run --file`。

要使 Ollama 成为入站媒体的默认图像理解模型，配置 `agents.defaults.imageModel`：

```json5
{
  agents: {
    defaults: {
      imageModel: {
        primary: "ollama/qwen2.5vl:7b",
      },
    },
  },
}
```

优先使用完整的 `ollama/<model>` 引用。如果同一模型在 `models.providers.ollama.models` 中带有 `input: ["text", "image"]` 列出，且没有其他已配置的图像提供商暴露该裸模型 ID，OpenClaw 也会将裸 `imageModel` 引用（如 `qwen2.5vl:7b`）标准化为 `ollama/qwen2.5vl:7b`。如果多个已配置的图像提供商具有相同的裸 ID，请明确使用提供商前缀。

在受限硬件上，慢速本地视觉模型可能需要比云端模型更长的图像理解超时。当 Ollama 试图分配完整的已公布视觉上下文时，模型也可能崩溃或停止运行。设置能力超时，并在模型条目上限制 `num_ctx`（当你只需要正常的图像描述轮次时）：

```json5
{
  models: {
    providers: {
      ollama: {
        models: [
          {
            id: "qwen2.5vl:7b",
            name: "qwen2.5vl:7b",
            input: ["text", "image"],
            params: { num_ctx: 2048, keep_alive: "1m" },
          },
        ],
      },
    },
  },
  tools: {
    media: {
      image: {
        timeoutSeconds: 180,
        models: [{ provider: "ollama", model: "qwen2.5vl:7b", timeoutSeconds: 300 }],
      },
    },
  },
}
```

此超时适用于入站图像理解以及代理在轮次中可以调用的显式 `image` 工具。提供商级别的 `models.providers.ollama.timeoutSeconds` 仍然控制正常模型调用的底层 Ollama HTTP 请求保护。

使用以下命令对本地 Ollama 进行实时验证显式图像工具：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
```

如果你手动定义 `models.providers.ollama.models`，请标记支持图像输入的视觉模型：

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

OpenClaw 会拒绝未标记为支持图像的模型的图像描述请求。通过隐式发现，当 `/api/show` 报告视觉能力时，OpenClaw 会从 Ollama 读取此信息。

## 配置

<Tabs>
  <Tab title="基础（隐式发现）">
    最简单的仅本地启用路径是通过环境变量：

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果设置了 `OLLAMA_API_KEY`，可以在提供商条目中省略 `apiKey`，OpenClaw 会为可用性检查填充它。
    </Tip>

  </Tab>

  <Tab title="显式（手动模型）">
    当你需要托管云端设置、Ollama 在另一台主机/端口上运行、希望强制指定特定的上下文窗口或模型列表，或希望完全手动定义模型时，使用显式配置。

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "https://ollama.com",
            apiKey: "OLLAMA_API_KEY",
            api: "ollama",
            models: [
              {
                id: "kimi-k2.5:cloud",
                name: "kimi-k2.5:cloud",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 128000,
                maxTokens: 8192
              }
            ]
          }
        }
      }
    }
    ```

  </Tab>

  <Tab title="自定义基础 URL">
    如果 Ollama 在不同的主机或端口上运行（显式配置会禁用自动发现，因此需要手动定义模型）：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            apiKey: "ollama-local",
            baseUrl: "http://ollama-host:11434", // 不加 /v1 - 使用原生 Ollama API URL
            api: "ollama", // 明确设置以确保原生工具调用行为
            timeoutSeconds: 300, // 可选：给冷启动本地模型更长的连接和流式传输时间
            models: [
              {
                id: "qwen3:32b",
                name: "qwen3:32b",
                params: {
                  keep_alive: "15m", // 可选：在轮次之间保持模型加载
                },
              },
            ],
          },
        },
      },
    }
    ```

    <Warning>
    不要在 URL 中添加 `/v1`。`/v1` 路径使用 OpenAI 兼容模式，该模式下工具调用不可靠。使用不带路径后缀的基础 Ollama URL。
    </Warning>

  </Tab>
</Tabs>

## 常见配方

将这些用作起点，并用 `ollama list` 或 `openclaw models list --provider ollama` 的精确名称替换模型 ID。

<AccordionGroup>
  <Accordion title="带自动发现的本地模型">
    当 Ollama 与 Gateway 在同一台机器上运行，且你希望 OpenClaw 自动发现已安装的模型时使用此配方。

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    此路径使配置保持最小化。除非你想手动定义模型，否则不要添加 `models.providers.ollama` 块。

  </Accordion>

  <Accordion title="带手动模型的局域网 Ollama 主机">
    对局域网主机使用原生 Ollama URL。不要添加 `/v1`。

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 300,
            contextWindow: 32768,
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                reasoning: true,
                input: ["text"],
                params: {
                  num_ctx: 32768,
                  thinking: false,
                  keep_alive: "15m",
                },
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "ollama/qwen3.5:9b" },
        },
      },
    }
    ```

    `contextWindow` 是 OpenClaw 端的上下文预算。`params.num_ctx` 在请求时发送给 Ollama。当你的硬件无法运行模型的完整公告上下文时，请保持它们对齐。

  </Accordion>

  <Accordion title="仅 Ollama Cloud">
    当你不运行本地守护进程且想直接使用托管 Ollama 模型时使用此配方。

    ```bash
    export OLLAMA_API_KEY="your-ollama-api-key"
    ```

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "https://ollama.com",
            apiKey: "OLLAMA_API_KEY",
            api: "ollama",
            models: [
              {
                id: "kimi-k2.5:cloud",
                name: "kimi-k2.5:cloud",
                reasoning: false,
                input: ["text", "image"],
                contextWindow: 128000,
                maxTokens: 8192,
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "ollama/kimi-k2.5:cloud" },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="通过已登录守护进程的云端加本地">
    当本地或局域网 Ollama 守护进程已通过 `ollama signin` 登录，且应同时提供本地模型和 `:cloud` 模型时使用此配方。

    ```bash
    ollama signin
    ollama pull gemma4
    ```

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 300,
            models: [
              { id: "gemma4", name: "gemma4", input: ["text"] },
              { id: "kimi-k2.5:cloud", name: "kimi-k2.5:cloud", input: ["text", "image"] },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "ollama/gemma4",
            fallbacks: ["ollama/kimi-k2.5:cloud"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="多个 Ollama 主机">
    当你有多台 Ollama 服务器时，使用自定义提供商 ID。每个提供商有自己的主机、模型、认证、超时和模型引用。

    ```json5
    {
      models: {
        providers: {
          "ollama-fast": {
            baseUrl: "http://mini.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            contextWindow: 32768,
            models: [{ id: "gemma4", name: "gemma4", input: ["text"] }],
          },
          "ollama-large": {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 420,
            contextWindow: 131072,
            maxTokens: 16384,
            models: [{ id: "qwen3.5:27b", name: "qwen3.5:27b", input: ["text"] }],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "ollama-fast/gemma4",
            fallbacks: ["ollama-large/qwen3.5:27b"],
          },
        },
      },
    }
    ```

    当 OpenClaw 发送请求时，活动提供商前缀会被去除，因此 `ollama-large/qwen3.5:27b` 到达 Ollama 时为 `qwen3.5:27b`。

  </Accordion>

  <Accordion title="精简本地模型配置">
    一些本地模型可以回答简单的提示，但在完整的代理工具界面上会遇到困难。在更改全局运行时设置之前，首先限制工具和上下文。

    ```json5
    {
      agents: {
        defaults: {
          experimental: {
            localModelLean: true,
          },
          model: { primary: "ollama/gemma4" },
        },
      },
      models: {
        providers: {
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            apiKey: "ollama-local",
            api: "ollama",
            contextWindow: 32768,
            models: [
              {
                id: "gemma4",
                name: "gemma4",
                input: ["text"],
                params: { num_ctx: 32768 },
                compat: { supportsTools: false },
              },
            ],
          },
        },
      },
    }
    ```

    仅当模型或服务器在工具架构上持续失败时才使用 `compat.supportsTools: false`。这会以代理能力换取稳定性。`localModelLean` 从代理界面中移除浏览器、定时任务和消息工具，但不会更改 Ollama 的运行时上下文或思考模式。对于在隐藏推理上循环或花费响应预算的小型 Qwen 风格思考模型，请将其与显式的 `params.num_ctx` 和 `params.thinking: false` 配合使用。

  </Accordion>
</AccordionGroup>

### 模型选择

配置完成后，所有 Ollama 模型都可用：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/gpt-oss:20b",
        fallbacks: ["ollama/llama3.3", "ollama/qwen2.5-coder:32b"],
      },
    },
  },
}
```

自定义 Ollama 提供商 ID 也受支持。当模型引用使用活动提供商前缀时（如 `ollama-spark/qwen3:32b`），OpenClaw 只会去除该前缀后调用 Ollama，服务器收到的是 `qwen3:32b`。

对于慢速本地模型，在提高整个代理运行时超时之前，优先进行提供商范围的请求调整：

```json5
{
  models: {
    providers: {
      ollama: {
        timeoutSeconds: 300,
        models: [
          {
            id: "gemma4:26b",
            name: "gemma4:26b",
            params: { keep_alive: "15m" },
          },
        ],
      },
    },
  },
}
```

`timeoutSeconds` 适用于模型 HTTP 请求，包括连接设置、请求头、body 流式传输和总的受保护拉取中止。当首次轮次加载时间是瓶颈时，按模型设置 `params.keep_alive` 并将其转发给 Ollama 作为原生 `/api/chat` 请求上的顶级 `keep_alive`。

### 快速验证

```bash
# 此机器可见的 Ollama 守护进程
curl http://127.0.0.1:11434/api/tags

# OpenClaw 目录和选定模型
openclaw models list --provider ollama
openclaw models status

# 直接模型冒烟测试
openclaw infer model run \
  --model ollama/gemma4 \
  --prompt "Reply with exactly: ok"
```

对于远程主机，将 `127.0.0.1` 替换为 `baseUrl` 中使用的主机。如果 `curl` 可以工作但 OpenClaw 不行，请检查 Gateway 是否在不同的机器、容器或服务账户上运行。

## Ollama 网络搜索

OpenClaw 支持将 **Ollama 网络搜索**作为捆绑的 `web_search` 提供商。

| 属性 | 详情                                                                                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 主机 | 使用已配置的 Ollama 主机（如果已设置则使用 `models.providers.ollama.baseUrl`，否则使用 `http://127.0.0.1:11434`）；`https://ollama.com` 直接使用托管 API |
| 认证 | 已登录本地 Ollama 主机无需密钥；`OLLAMA_API_KEY` 或已配置的提供商认证用于直接 `https://ollama.com` 搜索或需要认证的主机                                  |
| 要求 | 本地/自托管主机必须正在运行并通过 `ollama signin` 登录；直接托管搜索需要 `baseUrl: "https://ollama.com"` 加上真实的 Ollama API 密钥                      |

在 `openclaw onboard` 或 `openclaw configure --section web` 时选择 **Ollama 网络搜索**，或设置：

```json5
{
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

对于通过 Ollama Cloud 的直接托管搜索：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "https://ollama.com",
        apiKey: "OLLAMA_API_KEY",
        api: "ollama",
        models: [{ id: "kimi-k2.5:cloud", name: "kimi-k2.5:cloud", input: ["text"] }],
      },
    },
  },
  tools: {
    web: {
      search: { provider: "ollama" },
    },
  },
}
```

对于已登录的本地守护进程，OpenClaw 使用守护进程的 `/api/experimental/web_search` 代理。对于 `https://ollama.com`，直接调用托管的 `/api/web_search` 端点。

<Note>
有关完整设置和行为详情，请参见 [Ollama 网络搜索](/tools/ollama-search)。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="旧版 OpenAI 兼容模式">
    <Warning>
    **工具调用在 OpenAI 兼容模式下不可靠。** 只有在需要代理 OpenAI 格式且不依赖原生工具调用行为时才使用此模式。
    </Warning>

    如果需要使用 OpenAI 兼容端点（例如，在只支持 OpenAI 格式的代理后面），明确设置 `api: "openai-completions"`：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434/v1",
            api: "openai-completions",
            injectNumCtxForOpenAICompat: true, // 默认：true
            apiKey: "ollama-local",
            models: [...]
          }
        }
      }
    }
    ```

    此模式可能不同时支持流式传输和工具调用。你可能需要在模型配置中禁用流式传输：`params: { streaming: false }`。

    当 `api: "openai-completions"` 与 Ollama 一起使用时，OpenClaw 默认注入 `options.num_ctx`，以防止 Ollama 静默回退到 4096 上下文窗口。如果你的代理/上游拒绝未知的 `options` 字段，请禁用此行为：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434/v1",
            api: "openai-completions",
            injectNumCtxForOpenAICompat: false,
            apiKey: "ollama-local",
            models: [...]
          }
        }
      }
    }
    ```

  </Accordion>

  <Accordion title="上下文窗口">
    对于自动发现的模型，OpenClaw 使用 Ollama 报告的上下文窗口（当可用时），包括来自自定义 Modelfile 的较大 `PARAMETER num_ctx` 值。否则回退到 OpenClaw 使用的默认 Ollama 上下文窗口。

    你可以为该 Ollama 提供商下的每个模型设置提供商级别的 `contextWindow`、`contextTokens` 和 `maxTokens` 默认值，然后在需要时按模型覆盖。`contextWindow` 是 OpenClaw 的提示词和压缩预算。原生 Ollama 请求不设置 `options.num_ctx`，除非你明确配置了 `params.num_ctx`，因此 Ollama 可以应用其自己的模型、`OLLAMA_CONTEXT_LENGTH` 或基于 VRAM 的默认值。要限制或强制 Ollama 的每请求运行时上下文而不重建 Modelfile，设置 `params.num_ctx`；无效、零、负数和非有限值会被忽略。OpenAI 兼容 Ollama 适配器仍然默认从配置的 `params.num_ctx` 或 `contextWindow` 注入 `options.num_ctx`；如果你的上游拒绝 `options`，用 `injectNumCtxForOpenAICompat: false` 禁用它。

    原生 Ollama 模型条目也接受 `params` 下常见的 Ollama 运行时选项，包括 `temperature`、`top_p`、`top_k`、`min_p`、`num_predict`、`stop`、`repeat_penalty`、`num_batch`、`num_thread` 和 `use_mmap`。OpenClaw 只转发 Ollama 请求键，所以 `streaming` 等 OpenClaw 运行时参数不会泄漏给 Ollama。使用 `params.think` 或 `params.thinking` 发送顶级 Ollama `think`；`false` 会禁用 Qwen 风格思考模型的 API 级别思考。

    ```json5
    {
      models: {
        providers: {
          ollama: {
            contextWindow: 32768,
            models: [
              {
                id: "llama3.3",
                contextWindow: 131072,
                maxTokens: 65536,
                params: {
                  num_ctx: 32768,
                  temperature: 0.7,
                  top_p: 0.9,
                  thinking: false,
                },
              }
            ]
          }
        }
      }
    }
    ```

    每模型的 `agents.defaults.models["ollama/<model>"].params.num_ctx` 也有效。如果两者都配置了，显式提供商模型条目优先于代理默认值。

  </Accordion>

  <Accordion title="思考控制">
    对于原生 Ollama 模型，OpenClaw 按 Ollama 期望的方式转发思考控制：顶级的 `think`，而非 `options.think`。`/api/show` 响应中包含 `thinking` 能力的自动发现模型会暴露 `/think low`、`/think medium`、`/think high` 和 `/think max`；非思考模型只暴露 `/think off`。

    ```bash
    openclaw agent --model ollama/gemma4 --thinking off
    openclaw agent --model ollama/gemma4 --thinking low
    ```

    你也可以设置模型默认值：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "ollama/gemma4": {
              thinking: "low",
            },
          },
        },
      },
    }
    ```

    每模型的 `params.think` 或 `params.thinking` 可以禁用或强制特定已配置模型的 Ollama API 思考。当活动运行只有隐式默认 `off` 时，OpenClaw 保留这些显式模型参数；非 off 运行时命令（如 `/think medium`）仍然覆盖活动运行。

  </Accordion>

  <Accordion title="推理模型">
    OpenClaw 默认将名称包含 `deepseek-r1`、`reasoning` 或 `think` 的模型视为具备推理能力。

    ```bash
    ollama pull deepseek-r1:32b
    ```

    无需额外配置。OpenClaw 会自动标记它们。

  </Accordion>

  <Accordion title="模型成本">
    Ollama 是免费的本地运行，因此所有模型成本都设置为 $0。这适用于自动发现和手动定义的模型。
  </Accordion>

  <Accordion title="记忆嵌入">
    捆绑的 Ollama 插件为[记忆搜索](/concepts/memory)注册了记忆嵌入提供商。它使用已配置的 Ollama 基础 URL 和 API 密钥，调用 Ollama 当前的 `/api/embed` 端点，并在可能时将多个记忆块批处理为一个 `input` 请求。

    | 属性      | 值               |
    | ------------- | ------------------- |
    | 默认模型 | `nomic-embed-text`  |
    | 自动拉取     | 是 — 如果本地不存在，嵌入模型会自动拉取 |

    查询时嵌入对需要或推荐检索前缀的模型使用检索前缀，包括 `nomic-embed-text`、`qwen3-embedding` 和 `mxbai-embed-large`。记忆文档批次保持原始格式，以避免现有索引需要格式迁移。

    要选择 Ollama 作为记忆搜索嵌入提供商：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            remote: {
              // Ollama 的默认值。在较大主机上，如果重新索引太慢，可以提高此值。
              nonBatchConcurrency: 1,
            },
          },
        },
      },
    }
    ```

    对于远程嵌入主机，将认证范围限制在该主机：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            model: "nomic-embed-text",
            remote: {
              baseUrl: "http://gpu-box.local:11434",
              apiKey: "ollama-local",
              nonBatchConcurrency: 2,
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="流式传输配置">
    OpenClaw 的 Ollama 集成默认使用**原生 Ollama API**（`/api/chat`），完全支持同时进行流式传输和工具调用。无需特殊配置。

    对于原生 `/api/chat` 请求，OpenClaw 也直接向 Ollama 转发思考控制：`/think off` 和 `openclaw agent --thinking off` 会发送顶级 `think: false`，除非配置了显式的模型 `params.think`/`params.thinking` 值，而 `/think low|medium|high` 则发送匹配的顶级 `think` 努力字符串。`/think max` 映射到 Ollama 的最高原生努力，即 `think: "high"`。

    <Tip>
    如果需要使用 OpenAI 兼容端点，请参见上方的"旧版 OpenAI 兼容模式"部分。在该模式下，流式传输和工具调用可能无法同时工作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="WSL2 崩溃循环（反复重启）">
    在带有 NVIDIA/CUDA 的 WSL2 上，官方 Ollama Linux 安装程序会创建一个带有 `Restart=always` 的 `ollama.service` systemd 单元。如果该服务在 WSL2 启动时自动启动并加载 GPU 支持的模型，Ollama 可能会在模型加载时固定主机内存。Hyper-V 内存回收有时无法回收这些固定的页面，导致 Windows 终止 WSL2 VM，systemd 再次启动 Ollama，循环重复。

    常见迹象：

    - WSL2 从 Windows 端反复重启或终止
    - WSL2 启动后不久 `app.slice` 或 `ollama.service` 中 CPU 使用率高
    - 来自 systemd 的 SIGTERM 而不是 Linux OOM killer 事件

    当 OpenClaw 检测到 WSL2、带 `Restart=always` 的 `ollama.service` 以及可见的 CUDA 标记时，会记录启动警告。

    缓解措施：

    ```bash
    sudo systemctl disable ollama
    ```

    在 Windows 端的 `%USERPROFILE%\.wslconfig` 中添加以下内容，然后运行 `wsl --shutdown`：

    ```ini
    [experimental]
    autoMemoryReclaim=disabled
    ```

    在 Ollama 服务环境中设置较短的保活时间，或只在需要时手动启动 Ollama：

    ```bash
    export OLLAMA_KEEP_ALIVE=5m
    ollama serve
    ```

    参见 [ollama/ollama#11317](https://github.com/ollama/ollama/issues/11317)。

  </Accordion>

  <Accordion title="未检测到 Ollama">
    确保 Ollama 正在运行，且你已设置 `OLLAMA_API_KEY`（或认证配置），并且你**未**定义显式的 `models.providers.ollama` 条目：

    ```bash
    ollama serve
    ```

    验证 API 是否可访问：

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="没有可用模型">
    如果你的模型未列出，请在本地拉取模型或在 `models.providers.ollama` 中明确定义它。

    ```bash
    ollama list  # 查看已安装的内容
    ollama pull gemma4
    ollama pull gpt-oss:20b
    ollama pull llama3.3     # 或其他模型
    ```

  </Accordion>

  <Accordion title="连接被拒绝">
    检查 Ollama 是否在正确的端口上运行：

    ```bash
    # 检查 Ollama 是否正在运行
    ps aux | grep ollama

    # 或重启 Ollama
    ollama serve
    ```

  </Accordion>

  <Accordion title="远程主机用 curl 可以但 OpenClaw 不行">
    从运行 Gateway 的同一台机器和运行时进行验证：

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    常见原因：

    - `baseUrl` 指向 `localhost`，但 Gateway 在 Docker 或另一台主机上运行。
    - URL 使用了 `/v1`，这会选择 OpenAI 兼容行为而不是原生 Ollama。
    - 远程主机需要在 Ollama 端进行防火墙或局域网绑定更改。
    - 模型存在于你的笔记本守护进程上，但不在远程守护进程上。

  </Accordion>

  <Accordion title="模型将工具 JSON 作为文本输出">
    这通常意味着提供商正在使用 OpenAI 兼容模式，或模型无法处理工具架构。

    优先使用原生 Ollama 模式：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434",
            api: "ollama",
          },
        },
      },
    }
    ```

    如果小型本地模型在工具架构上仍然失败，在该模型条目上设置 `compat.supportsTools: false` 并重新测试。

  </Accordion>

  <Accordion title="Kimi 或 GLM 返回乱码符号">
    被托管的 Kimi/GLM 响应中长串非语言符号被视为失败的提供商输出，而不是成功的助手回答。这让正常的重试、回退或错误处理能够接管，而不会将损坏的文本持久化到会话中。

    如果反复发生，请记录原始模型名称、当前会话文件，以及运行使用的是`云端 + 本地`还是`仅云端`，然后尝试新会话和回退模型：

    ```bash
    openclaw infer model run --model ollama/kimi-k2.5:cloud --prompt "Reply with exactly: ok" --json
    openclaw models set ollama/gemma4
    ```

  </Accordion>

  <Accordion title="冷启动本地模型超时">
    大型本地模型在流式传输开始前可能需要很长的首次加载时间。将超时范围限制在 Ollama 提供商，并可选择要求 Ollama 在轮次之间保持模型加载：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            timeoutSeconds: 300,
            models: [
              {
                id: "gemma4:26b",
                name: "gemma4:26b",
                params: { keep_alive: "15m" },
              },
            ],
          },
        },
      },
    }
    ```

    如果主机本身连接较慢，`timeoutSeconds` 也会延长该提供商的受保护 Undici 连接超时。

  </Accordion>

  <Accordion title="大上下文模型太慢或内存不足">
    许多 Ollama 模型公布的上下文超出了你的硬件可以舒适运行的范围。原生 Ollama 使用 Ollama 自己的运行时上下文默认值，除非你设置了 `params.num_ctx`。当你想要可预期的首个令牌延迟时，同时限制 OpenClaw 的预算和 Ollama 的请求上下文：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            contextWindow: 32768,
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                params: { num_ctx: 32768, thinking: false },
              },
            ],
          },
        },
      },
    }
    ```

    如果 OpenClaw 发送的提示词过多，先降低 `contextWindow`。如果 Ollama 加载的运行时上下文对机器来说太大，降低 `params.num_ctx`。如果生成时间过长，降低 `maxTokens`。

  </Accordion>
</AccordionGroup>

<Note>
更多帮助：[故障排除](/help/troubleshooting)和 [FAQ](/help/faq)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为概述。
  </Card>
  <Card title="模型选择" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="Ollama 网络搜索" href="/tools/ollama-search" icon="magnifying-glass">
    Ollama 驱动的网络搜索的完整设置和行为详情。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>
