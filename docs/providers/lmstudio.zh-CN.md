---
summary: "在 OpenClaw 中运行 LM Studio"
read_when:
  - 您想通过 LM Studio 在 OpenClaw 中运行开源模型
  - 您想设置和配置 LM Studio
title: "LM Studio"
---

LM Studio 是一个友好而强大的应用程序，用于在您自己的硬件上运行开放权重模型。它支持 llama.cpp（GGUF）或 MLX 模型（Apple Silicon），提供图形界面包或无头守护进程（`llmster`）。产品和设置文档，请参见 [lmstudio.ai](https://lmstudio.ai/)。

## 快速开始

1. 安装 LM Studio（桌面版）或 `llmster`（无头版），然后启动本地服务器：

```bash
curl -fsSL https://lmstudio.ai/install.sh | bash
```

2. 启动服务器

确保您已启动桌面应用或使用以下命令运行守护进程：

```bash
lms daemon up
```

```bash
lms server start --port 1234
```

如果您使用应用程序，请确保启用 JIT 以获得流畅体验。更多信息请参见 [LM Studio JIT 和 TTL 指南](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict)。

3. 如果启用了 LM Studio 认证，请设置 `LM_API_TOKEN`：

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

如果禁用了 LM Studio 认证，您可以在交互式 OpenClaw 设置期间将 API 密钥留空。

有关 LM Studio 认证设置详情，请参见 [LM Studio 认证](https://lmstudio.ai/docs/developer/core/authentication)。

4. 运行引导程序并选择 `LM Studio`：

```bash
openclaw onboard
```

5. 在引导程序中，使用`默认模型`提示选择您的 LM Studio 模型。

您也可以稍后设置或更改：

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

LM Studio 模型键使用 `author/model-name` 格式（例如 `qwen/qwen3.5-9b`）。OpenClaw 模型引用在前面添加提供商名称：`lmstudio/qwen/qwen3.5-9b`。您可以通过运行 `curl http://localhost:1234/api/v1/models` 并查看 `key` 字段来找到模型的确切键。

## 非交互式引导

当您需要脚本化设置（CI、配置、远程引导）时，请使用非交互式引导：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio
```

或指定基础 URL、模型和可选的 API 密钥：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio \
  --custom-base-url http://localhost:1234/v1 \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --custom-model-id qwen/qwen3.5-9b
```

`--custom-model-id` 接受 LM Studio 返回的模型键（例如 `qwen/qwen3.5-9b`），不带 `lmstudio/` 提供商前缀。

对于已认证的 LM Studio 服务器，请传入 `--lmstudio-api-key` 或设置 `LM_API_TOKEN`。
对于未认证的 LM Studio 服务器，请省略密钥；OpenClaw 会存储本地非秘密标记。

`--custom-api-key` 仍支持兼容性，但 LM Studio 推荐使用 `--lmstudio-api-key`。

这会写入 `models.providers.lmstudio` 并将默认模型设置为 `lmstudio/<custom-model-id>`。当您提供 API 密钥时，设置也会写入 `lmstudio:default` 认证配置文件。

交互式设置可以提示输入可选的首选加载上下文长度，并将其应用于保存到配置中的已发现 LM Studio 模型。
LM Studio 插件配置信任已配置的 LM Studio 端点用于模型请求，包括本地回环、局域网和 tailnet 主机。您可以通过设置 `models.providers.lmstudio.request.allowPrivateNetwork: false` 来选择退出。

## 配置

### 流式传输使用兼容性

LM Studio 兼容流式传输使用。当它不发出 OpenAI 格式的 `usage` 对象时，OpenClaw 会从 llama.cpp 风格的 `timings.prompt_n` / `timings.predicted_n` 元数据中恢复 token 计数。

以下 OpenAI 兼容的本地后端具有相同的流式传输使用行为：

- vLLM
- SGLang
- llama.cpp
- LocalAI
- Jan
- TabbyAPI
- text-generation-webui

### 思考兼容性

当 LM Studio 的 `/api/v1/models` 发现报告特定模型的推理选项时，OpenClaw 会在模型兼容元数据中公开匹配的 OpenAI 兼容 `reasoning_effort` 值。当前的 LM Studio 版本可以宣传二进制 UI 选项（如 `allowed_options: ["off", "on"]`），同时在 `/v1/chat/completions` 上拒绝这些值；OpenClaw 在发送请求之前将该二进制发现形式规范化为 `none`、`minimal`、`low`、`medium`、`high` 和 `xhigh`。加载目录时，包含 `off`/`on` 推理映射的旧版已保存 LM Studio 配置也会以相同方式规范化。

### 显式配置

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "${LM_API_TOKEN}",
        api: "openai-completions",
        models: [
          {
            id: "qwen/qwen3-coder-next",
            name: "Qwen 3 Coder Next",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## 故障排查

### LM Studio 未被检测到

确保 LM Studio 正在运行。如果启用了认证，还需设置 `LM_API_TOKEN`：

```bash
# 通过桌面应用启动，或无头版：
lms server start --port 1234
```

验证 API 是否可访问：

```bash
curl http://localhost:1234/api/v1/models
```

### 认证错误（HTTP 401）

如果设置报告 HTTP 401，请验证您的 API 密钥：

- 检查 `LM_API_TOKEN` 是否与 LM Studio 中配置的密钥匹配。
- 有关 LM Studio 认证设置详情，请参见 [LM Studio 认证](https://lmstudio.ai/docs/developer/core/authentication)。
- 如果您的服务器不需要认证，请在设置期间将密钥留空。

### 即时模型加载

LM Studio 支持即时（JIT）模型加载，在首次请求时加载模型。OpenClaw 默认通过 LM Studio 的原生加载端点预加载模型，这在禁用 JIT 时很有帮助。要让 LM Studio 的 JIT、空闲 TTL 和自动清除行为管理模型生命周期，请禁用 OpenClaw 的预加载步骤：

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        api: "openai-completions",
        params: { preload: false },
        models: [{ id: "qwen/qwen3.5-9b" }],
      },
    },
  },
}
```

### 局域网或 tailnet LM Studio 主机

使用 LM Studio 主机的可达地址，保留 `/v1`，并确保 LM Studio 在该机器上绑定到回环地址以外的地址：

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://gpu-box.local:1234/v1",
        apiKey: "lmstudio",
        api: "openai-completions",
        models: [{ id: "qwen/qwen3.5-9b" }],
      },
    },
  },
}
```

与通用 OpenAI 兼容提供商不同，`lmstudio` 自动信任其已配置的本地/私有端点用于受保护的模型请求。自定义的本地回环提供商 ID（如 `localhost` 或 `127.0.0.1`）也会自动受信任；对于局域网、tailnet 或私有 DNS 的自定义提供商 ID，请显式设置 `models.providers.<id>.request.allowPrivateNetwork: true`。

## 相关链接

- [模型选择](/concepts/model-providers)
- [Ollama](/providers/ollama)
- [本地模型](/gateway/local-models)
