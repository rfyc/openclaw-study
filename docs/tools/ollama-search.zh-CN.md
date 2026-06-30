---
summary: "通过本地 Ollama 主机或托管 Ollama API 进行 Ollama Web 搜索"
read_when:
  - 你想使用 Ollama 进行 web_search
  - 你想要一个无需密钥的 web_search 提供商
  - 你想使用带有 OLLAMA_API_KEY 的托管 Ollama Web 搜索
  - 你需要 Ollama Web 搜索设置指南
title: "Ollama web 搜索"
---

OpenClaw 支持 **Ollama Web 搜索**作为内置的 `web_search` 提供商。它使用 Ollama 的 web 搜索 API，返回带有标题、URL 和摘要的结构化结果。

对于本地或自托管的 Ollama，此设置默认不需要 API 密钥。它需要：

- 一个可从 OpenClaw 访问的 Ollama 主机
- 运行 `ollama signin`

对于直接托管搜索，将 Ollama 提供商基础 URL 设置为 `https://ollama.com` 并提供真实的 `OLLAMA_API_KEY`。

## 设置

<Steps>
  <Step title="启动 Ollama">
    确保 Ollama 已安装并运行。
  </Step>
  <Step title="登录">
    运行：

    ```bash
    ollama signin
    ```

  </Step>
  <Step title="选择 Ollama Web 搜索">
    运行：

    ```bash
    openclaw configure --section web
    ```

    然后选择 **Ollama Web Search** 作为提供商。

  </Step>
</Steps>

如果你已经将 Ollama 用于模型，Ollama Web 搜索会复用相同配置的主机。

## 配置

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

可选的 Ollama 主机覆盖：

```json5
{
  plugins: {
    entries: {
      ollama: {
        config: {
          webSearch: {
            baseUrl: "http://ollama-host:11434",
          },
        },
      },
    },
  },
}
```

如果你已经将 Ollama 配置为模型提供商，web 搜索提供商可以复用该主机：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
      },
    },
  },
}
```

Ollama 模型提供商使用 `baseUrl` 作为规范键。web 搜索提供商也接受 `models.providers.ollama` 上的 `baseURL`，以兼容 OpenAI SDK 风格的配置示例。

如果没有设置显式的 Ollama 基础 URL，OpenClaw 使用 `http://127.0.0.1:11434`。

如果你的 Ollama 主机需要 bearer 认证，当请求发往配置的主机时，OpenClaw 会复用 `models.providers.ollama.apiKey`（或匹配的环境支持的提供商认证）。

直接托管的 Ollama Web 搜索：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "https://ollama.com",
        apiKey: "OLLAMA_API_KEY",
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

## 注意事项

- 此提供商不需要特定的 web 搜索 API 密钥字段。
- 如果 Ollama 主机受认证保护，当存在时 OpenClaw 会复用正常的 Ollama 提供商 API 密钥。
- 如果 `baseUrl` 是 `https://ollama.com`，OpenClaw 会直接调用 `https://ollama.com/api/web_search` 并发送配置的 Ollama API 密钥作为 bearer 认证。
- 如果配置的主机不支持 web 搜索且设置了 `OLLAMA_API_KEY`，OpenClaw 可以回退到 `https://ollama.com/api/web_search` 而不将该环境密钥发送到本地主机。
- 如果 Ollama 无法访问或未登录，OpenClaw 会在设置时发出警告，但不会阻止选择。
- 运行时自动检测可以在没有配置更高优先级的凭据提供商时回退到 Ollama Web 搜索。
- 本地 Ollama 守护进程主机使用本地代理端点 `/api/experimental/web_search`，对 Ollama Cloud 进行签名和转发。
- `https://ollama.com` 主机直接使用公共托管端点 `/api/web_search` 进行 bearer API 密钥认证。

## 相关链接

- [Web 搜索概览](/tools/web) -- 所有提供商和自动检测
- [Ollama](/providers/ollama) -- Ollama 模型设置和云端/本地模式
