---
summary: "在本地 LLM 上运行 OpenClaw（LM Studio、vLLM、LiteLLM、自定义 OpenAI 端点）"
title: "本地模型"
read_when:
  - 你想从自己的 GPU 机器提供模型
  - 你正在连接 LM Studio 或 OpenAI 兼容代理
  - 你需要最安全的本地模型指南
---

本地模型是可行的。它们也提高了对硬件、上下文大小和提示注入防御的要求 — 小型或激进量化的卡截断上下文并泄露安全性。本页是针对高端本地堆栈和自定义 OpenAI 兼容本地服务器的有观点指南。如果你想要最低阻力的入门，从 [LM Studio](/providers/lmstudio) 或 [Ollama](/providers/ollama) 开始，并运行 `openclaw onboard`。

## 硬件下限

目标要高：**≥2 台最大配置的 Mac Studio 或同等 GPU 设备（~3 万美元+）**，以获得舒适的代理循环。单个 **24 GB** GPU 仅在较高延迟下适用于较轻的提示。始终运行**你能托管的最大/全尺寸变体**；小型或大量量化的检查点会提高提示注入风险（参见[安全](/gateway/security)）。

## 选择后端

| 后端                                         | 使用场景                                               |
| -------------------------------------------- | ------------------------------------------------------ |
| [LM Studio](/providers/lmstudio)             | 首次本地设置、GUI 加载器、原生 Responses API           |
| [Ollama](/providers/ollama)                  | CLI 工作流、模型库、免手动操作 systemd 服务            |
| MLX / vLLM / SGLang                          | 使用 OpenAI 兼容 HTTP 端点的高吞吐量自托管服务         |
| LiteLLM / OAI-proxy / 自定义 OpenAI 兼容代理 | 你在另一个模型 API 前面，需要 OpenClaw 将其视为 OpenAI |

当后端支持时使用 Responses API（`api: "openai-responses"`）（LM Studio 支持）。否则坚持使用 Chat Completions（`api: "openai-completions"`）。

<Warning>
**WSL2 + Ollama + NVIDIA/CUDA 用户：** 官方 Ollama Linux 安装程序使用 `Restart=always` 启用 systemd 服务。在 WSL2 GPU 设置上，自动启动可能在启动时重新加载最后的模型并固定主机内存。如果你的 WSL2 VM 在启用 Ollama 后反复重启，参见 [WSL2 崩溃循环](/providers/ollama#wsl2-crash-loop-repeated-reboots)。
</Warning>

## 推荐：LM Studio + 大型本地模型（Responses API）

当前最佳本地堆栈。在 LM Studio 中加载大型模型（例如全尺寸的 Qwen、DeepSeek 或 Llama 构建），启用本地服务器（默认 `http://127.0.0.1:1234`），并使用 Responses API 将推理与最终文本分开。

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "lmstudio/my-local-model": { alias: "Local" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

**设置清单**

- 安装 LM Studio：[https://lmstudio.ai](https://lmstudio.ai)
- 在 LM Studio 中，下载**可用的最大模型构建**（避免"小型"/大量量化的变体），启动服务器，确认 `http://127.0.0.1:1234/v1/models` 列出它。
- 将 `my-local-model` 替换为 LM Studio 中显示的实际模型 ID。
- 保持模型已加载；冷加载会增加启动延迟。
- 如果你的 LM Studio 构建不同，调整 `contextWindow`/`maxTokens`。
- 对于 WhatsApp，坚持使用 Responses API，这样只发送最终文本。

即使在本地运行时，也要保留已配置的托管模型；使用 `models.mode: "merge"` 使回退保持可用。

### 混合配置：托管主要，本地回退

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["lmstudio/my-local-model", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "lmstudio/my-local-model": { alias: "Local" },
        "anthropic/claude-opus-4-6": { alias: "Opus" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

### 本地优先，托管安全网

交换主要和回退顺序；保留相同的提供商块和 `models.mode: "merge"`，以便在本地机器宕机时可以回退到 Sonnet 或 Opus。

### 区域托管 / 数据路由

- 托管的 MiniMax/Kimi/GLM 变体也在 OpenRouter 上存在，带有区域固定的端点（例如美国托管）。在那里选择区域变体以将流量保持在你选择的司法管辖区，同时仍使用 `models.mode: "merge"` 用于 Anthropic/OpenAI 回退。
- 仅本地仍然是最强的隐私路径；当你需要提供商功能但想控制数据流时，托管区域路由是中间选择。

## 其他 OpenAI 兼容本地代理

MLX（`mlx_lm.server`）、vLLM、SGLang、LiteLLM、OAI-proxy 或自定义网关如果它们暴露 OpenAI 风格的 `/v1/chat/completions` 端点则可以工作。除非后端明确记录 `/v1/responses` 支持，否则使用 Chat Completions 适配器。将上面的提供商块替换为你的端点和模型 ID：

```json5
{
  agents: {
    defaults: {
      model: { primary: "local/my-local-model" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "sk-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 120000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

如果在带有 `baseUrl` 的自定义提供商上省略了 `api`，OpenClaw 默认为 `openai-completions`。诸如 `127.0.0.1` 的环回端点自动受信任；LAN、tailnet 和私有 DNS 端点仍然需要 `request.allowPrivateNetwork: true`。

`models.providers.<id>.models[].id` 值是提供商本地的。不要在那里包含提供商前缀。例如，使用 `mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` 启动的 MLX 服务器应使用此目录 id 和模型引用：

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

在本地或代理的视觉模型上设置 `input: ["text", "image"]`，以便图像附件被注入代理轮次。交互式自定义提供商入门推断常见的视觉模型 ID，并只询问未知名称。非交互式入门使用相同的推断；对于未知的视觉 ID，使用 `--custom-image-input`；或者当已知外观的模型在你的端点后面是纯文本时，使用 `--custom-text-input`。

保留 `models.mode: "merge"` 使托管模型作为回退保持可用。对于慢速本地或远程模型服务器，使用 `models.providers.<id>.timeoutSeconds`，然后再提高 `agents.defaults.timeoutSeconds`。提供商超时仅适用于模型 HTTP 请求，包括连接、标头、正文流和总守护获取中止。

<Note>
对于自定义 OpenAI 兼容提供商，当 `baseUrl` 解析到环回、私有 LAN、`.local` 或裸主机名时，持久化非秘密本地标记如 `apiKey: "ollama-local"` 是被接受的。OpenClaw 将其视为有效的本地凭据而不是报告缺少的密钥。对于接受公共主机名的任何提供商，使用真实值。
</Note>

本地/代理 `/v1` 后端的行为说明：

- OpenClaw 将这些视为代理风格的 OpenAI 兼容路由，而不是原生 OpenAI 端点
- 原生 OpenAI 专用的请求整形在这里不适用：没有 `service_tier`、没有 Responses `store`、没有 OpenAI 推理兼容有效载荷整形，也没有提示缓存提示
- 隐藏的 OpenClaw 归因标头（`originator`、`version`、`User-Agent`）不会注入到这些自定义代理 URL 上

更严格的 OpenAI 兼容后端的兼容性说明：

- 某些服务器在 Chat Completions 上只接受字符串 `messages[].content`，而不是结构化内容部分数组。对于这些端点，设置 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 某些本地模型将独立的括号工具请求作为文本发出，例如 `[tool_name]` 后跟 JSON 和 `[END_TOOL_REQUEST]`。只有当名称与该轮次的注册工具完全匹配时，OpenClaw 才会将这些提升为真实的工具调用；否则块被视为不支持的文本并从用户可见的回复中隐藏。
- 如果模型发出看起来像工具调用的 JSON、XML 或 ReAct 风格文本，但提供商没有发出结构化调用，OpenClaw 将其保留为文本并在可用时记录带有运行 id、提供商/模型、检测到的模式和工具名称的警告。将其视为提供商/模型工具调用不兼容，而不是已完成的工具运行。
- 如果工具显示为助手文本而不是运行，例如原始 JSON、XML、ReAct 语法或提供商响应中的空 `tool_calls` 数组，首先验证服务器是否使用支持工具调用的聊天模板/解析器。对于仅在强制工具使用时解析器工作的 OpenAI 兼容 Chat Completions 后端，设置每个模型的请求覆盖而不是依赖文本解析：

  ```json5
  {
    agents: {
      defaults: {
        models: {
          "local/my-local-model": {
            params: {
              extra_body: {
                tool_choice: "required",
              },
            },
          },
        },
      },
    },
  }
  ```

  仅对每个正常轮次都应调用工具的模型/会话使用此选项。它覆盖 OpenClaw 默认的代理值 `tool_choice: "auto"`。将 `local/my-local-model` 替换为 `openclaw models list` 显示的确切提供商/模型引用。

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- 如果自定义 OpenAI 兼容模型接受内置配置文件之外的 OpenAI 推理努力程度，在模型兼容块上声明它们。在这里添加 `"xhigh"` 使 `/think xhigh`、会话选择器、网关验证和 `llm-task` 验证为该配置的提供商/模型引用公开该级别：

  ```json5
  {
    models: {
      providers: {
        local: {
          baseUrl: "http://127.0.0.1:8000/v1",
          apiKey: "sk-local",
          api: "openai-responses",
          models: [
            {
              id: "gpt-5.4",
              name: "GPT 5.4 via local proxy",
              reasoning: true,
              input: ["text"],
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
              contextWindow: 196608,
              maxTokens: 8192,
              compat: {
                supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
                reasoningEffortMap: { xhigh: "xhigh" },
              },
            },
          ],
        },
      },
    },
  }
  ```

## 更小或更严格的后端

如果模型加载正常但完整的代理轮次行为异常，自上而下工作 — 先确认传输，然后缩小范围。

1. **确认本地模型本身响应。** 无工具，无代理上下文：

   ```bash
   openclaw infer model run --local --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

2. **确认网关路由。** 仅发送提供的提示 — 跳过转录、AGENTS 引导、上下文引擎组装、工具和捆绑的 MCP 服务器，但仍然测试网关路由、认证和提供商选择：

   ```bash
   openclaw infer model run --gateway --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

3. **尝试精简模式。** 如果两个探测都通过但真实代理轮次在格式错误的工具调用或过大的提示上失败，启用 `agents.defaults.experimental.localModelLean: true`。它删除三个最重的默认工具（`browser`、`cron`、`message`），使提示形状更小且更不脆弱。参见[实验性功能 → 本地模型精简模式](/concepts/experimental-features#local-model-lean-mode)了解完整解释、使用时机和确认方法。

4. **作为最后手段完全禁用工具。** 如果精简模式不够，对该模型条目设置 `models.providers.<provider>.models[].compat.supportsTools: false`。代理然后在该模型上无工具调用地操作。

5. **超过这个点，瓶颈在上游。** 如果在精简模式和 `supportsTools: false` 后后端仍然仅在较大的 OpenClaw 运行上失败，剩余的问题通常是上游模型或服务器容量 — 上下文窗口、GPU 内存、kv 缓存驱逐或后端错误。那时不是 OpenClaw 的传输层问题。

## 故障排除

- 网关可以到达代理？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型已卸载？重新加载；冷启动是常见的"挂起"原因。
- 本地服务器说 `terminated`、`ECONNRESET` 或在轮次中关闭流？OpenClaw 在诊断中记录低基数的 `model.call.error.failureKind` 加上 OpenClaw 进程 RSS/堆快照。对于 LM Studio/Ollama 内存压力，将该时间戳与服务器日志或 macOS 崩溃/jetsam 日志进行比对，以确认模型服务器是否被杀死。
- OpenClaw 从检测到的模型窗口派生上下文窗口预检阈值，或当 `agents.defaults.contextTokens` 降低有效窗口时从未限制的模型窗口派生。它在 **8k** 底限以下的 20% 时发出警告。硬阻塞使用 10% 阈值，具有 **4k** 底限，限制为有效上下文窗口，因此过大的模型元数据不能拒绝其他有效的用户上限。如果你碰到预检，提高服务器/模型上下文限制或选择更大的模型。
- 上下文错误？降低 `contextWindow` 或提高你的服务器限制。
- OpenAI 兼容服务器返回 `messages[].content ... expected a string`？在该模型条目上添加 `compat.requiresStringContent: true`。
- 直接的小型 `/v1/chat/completions` 调用有效，但 `openclaw infer model run --local` 在 Gemma 或另一个本地模型上失败？首先检查提供商 URL、模型引用、认证标记和服务器日志；本地 `model run` 不包含代理工具。如果本地 `model run` 成功但较大的代理轮次失败，使用 `localModelLean` 或 `compat.supportsTools: false` 减少代理工具面。
- 工具调用显示为原始 JSON/XML/ReAct 文本，或提供商返回空的 `tool_calls` 数组？不要添加盲目将助手文本转换为工具执行的代理。首先修复服务器聊天模板/解析器。如果模型仅在强制工具使用时工作，添加上面的每个模型 `params.extra_body.tool_choice: "required"` 覆盖，并仅将该模型条目用于每次轮次都期望工具调用的会话。
- 安全：本地模型跳过提供商端过滤器；保持代理范围狭窄并启用压缩以限制提示注入爆炸半径。

## 相关链接

- [配置参考](/gateway/configuration-reference)
- [模型故障转移](/concepts/model-failover)
