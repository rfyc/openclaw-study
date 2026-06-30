---
summary: "通过 xAI 网络 grounded 响应的 Grok 网络搜索"
read_when:
  - 您想使用 Grok 进行 web_search
  - 您需要用于网络搜索的 XAI_API_KEY
title: "Grok 搜索"
---

OpenClaw 支持将 Grok 作为 `web_search` 提供商，使用 xAI 网络 grounded 响应生成带有实时搜索结果和引用的 AI 合成答案。

同一个 `XAI_API_KEY` 也可以驱动内置的 `x_search` 工具，用于 X（前身为 Twitter）帖子搜索。如果您将密钥存储在 `plugins.entries.xai.config.webSearch.apiKey` 下，OpenClaw 现在将其作为捆绑的 xAI 模型提供商的回退重用。

对于帖子级别的 X 指标（如转发、回复、书签或查看量），优先使用带有精确帖子 URL 或状态 ID 的 `x_search`，而不是广泛的搜索查询。

## 入门引导和配置

如果您在以下过程中选择 **Grok**：

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw 可以显示一个单独的后续步骤，使用相同的 `XAI_API_KEY` 启用 `x_search`。该后续步骤：

- 仅在您选择 Grok 作为 `web_search` 后出现
- 不是单独的顶级 web 搜索提供商选择
- 可以在同一流程中可选地设置 `x_search` 模型

如果您跳过它，可以稍后在配置中启用或更改 `x_search`。

## 获取 API 密钥

<Steps>
  <Step title="创建密钥">
    从 [xAI](https://console.x.ai/) 获取 API 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway 环境中设置 `XAI_API_KEY`，或通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## 配置

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...", // 如果设置了 XAI_API_KEY 则可选
            baseUrl: "https://api.x.ai/v1", // 可选 Responses API 代理/基础 URL 覆盖
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "grok",
      },
    },
  },
}
```

**环境替代方案：** 在 Gateway 环境中设置 `XAI_API_KEY`。对于 gateway 安装，请将其放入 `~/.openclaw/.env`。

## 工作原理

Grok 使用 xAI 网络 grounded 响应来合成带有内联引用的答案，类似于 Gemini 的 Google Search grounding 方法。

## 支持的参数

Grok 搜索支持 `query`。

`count` 被接受用于共享的 `web_search` 兼容性，但 Grok 仍然返回一个带引用的合成答案，而不是 N 个结果的列表。

目前不支持提供商特定的过滤器。

Grok 使用提供商特定的 60 秒默认超时，因为 xAI Responses 网络 grounded 搜索可能比共享的 `web_search` 默认值运行更长时间。设置 `tools.web.search.timeoutSeconds` 来覆盖它。

## 基础 URL 覆盖

当 Grok 网络搜索应通过操作员代理或 xAI 兼容的 Responses 端点路由时，请设置 `plugins.entries.xai.config.webSearch.baseUrl`。OpenClaw 在修剪尾部斜杠后发布到 `<baseUrl>/responses`。`x_search` 使用相同的 `webSearch.baseUrl` 回退，除非设置了 `plugins.entries.xai.config.xSearch.baseUrl`。

## 相关

- [Web 搜索概览](/tools/web) -- 所有提供商和自动检测
- [Web 搜索中的 x_search](/tools/web#x_search) -- 通过 xAI 的一级 X 搜索
- [Gemini 搜索](/tools/gemini-search) -- 通过 Google grounding 的 AI 合成答案
