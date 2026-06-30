---
summary: "通过 Moonshot 网络搜索的 Kimi 网络搜索"
read_when:
  - 您想使用 Kimi 进行 web_search
  - 您需要 KIMI_API_KEY 或 MOONSHOT_API_KEY
title: "Kimi 搜索"
---

OpenClaw 支持将 Kimi 作为 `web_search` 提供商，使用 Moonshot 网络搜索生成带引用的 AI 合成答案。

## 获取 API 密钥

<Steps>
  <Step title="创建密钥">
    从 [Moonshot AI](https://platform.moonshot.cn/) 获取 API 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway 环境中设置 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`，或通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

在 `openclaw onboard` 或 `openclaw configure --section web` 中选择 **Kimi** 时，OpenClaw 还可以询问：

- Moonshot API 地区：
  - `https://api.moonshot.ai/v1`
  - `https://api.moonshot.cn/v1`
- 默认 Kimi 网络搜索模型（默认为 `kimi-k2.6`）

## 配置

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // 如果设置了 KIMI_API_KEY 或 MOONSHOT_API_KEY 则可选
            baseUrl: "https://api.moonshot.ai/v1",
            model: "kimi-k2.6",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "kimi",
      },
    },
  },
}
```

如果您使用中国 API 主机进行聊天（`models.providers.moonshot.baseUrl`：`https://api.moonshot.cn/v1`），当省略 `tools.web.search.kimi.baseUrl` 时，OpenClaw 重用相同的主机进行 Kimi `web_search`，因此来自 [platform.moonshot.cn](https://platform.moonshot.cn/) 的密钥不会错误地访问国际端点（通常返回 HTTP 401）。当您需要不同的搜索基础 URL 时，请使用 `tools.web.search.kimi.baseUrl` 覆盖。

**环境替代方案：** 在 Gateway 环境中设置 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`。对于 gateway 安装，请将其放入 `~/.openclaw/.env`。

如果省略 `baseUrl`，OpenClaw 默认使用 `https://api.moonshot.ai/v1`。如果省略 `model`，OpenClaw 默认使用 `kimi-k2.6`。

## 工作原理

Kimi 使用 Moonshot 网络搜索合成带有内联引用的答案，类似于 Gemini 和 Grok 的 grounded 响应方法。

OpenClaw 仅在 Moonshot 返回原生网络搜索 grounding 证据（如可重放的 `$web_search` 工具有效载荷、`search_results` 或引用 URL）后才将 Kimi `web_search` 视为成功。如果 Kimi 以"我无法浏览互联网"之类的纯聊天答案立即停止，且没有 grounding 证据，OpenClaw 将返回结构化的 `kimi_web_search_ungrounded` 错误，而不是将该文本包装为搜索结果。重试查询、切换到 Brave 等结构化提供商，或在您已有目标 URL 时使用 `web_fetch` / 浏览器工具。

## 支持的参数

Kimi 搜索支持 `query`。

`count` 被接受用于共享的 `web_search` 兼容性，但 Kimi 仍然返回一个带引用的合成答案，而不是 N 个结果的列表。

目前不支持提供商特定的过滤器。

## 相关

- [Web 搜索概览](/tools/web) -- 所有提供商和自动检测
- [Moonshot AI](/providers/moonshot) -- Moonshot 模型 + Kimi Coding 提供商文档
- [Gemini 搜索](/tools/gemini-search) -- 通过 Google grounding 的 AI 合成答案
- [Grok 搜索](/tools/grok-search) -- 通过 xAI grounding 的 AI 合成答案
