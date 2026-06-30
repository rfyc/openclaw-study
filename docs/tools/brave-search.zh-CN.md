---
summary: "用于 web_search 的 Brave Search API 设置"
read_when:
  - 您想将 Brave Search 用于 web_search
  - 您需要 BRAVE_API_KEY 或套餐详情
title: "Brave 搜索"
---

# Brave Search API

OpenClaw 支持将 Brave Search API 作为 `web_search` 提供商。

## 获取 API 密钥

1. 在 [https://brave.com/search/api/](https://brave.com/search/api/) 创建 Brave Search API 账户
2. 在控制台中选择 **Search** 套餐并生成 API 密钥。
3. 将密钥存储在配置中或在 Gateway 环境中设置 `BRAVE_API_KEY`。

## 配置示例

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "BRAVE_API_KEY_HERE",
            mode: "web", // 或 "llm-context"
            baseUrl: "https://api.search.brave.com", // 可选代理/基础 URL 覆盖
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "brave",
        maxResults: 5,
        timeoutSeconds: 30,
      },
    },
  },
}
```

提供商特定的 Brave 搜索设置现在位于 `plugins.entries.brave.config.webSearch.*` 下。遗留的 `tools.web.search.apiKey` 仍通过兼容性垫片加载，但不再是规范配置路径。

`webSearch.mode` 控制 Brave 传输方式：

- `web`（默认）：带有标题、URL 和摘要的普通 Brave 网页搜索
- `llm-context`：带有预提取文本块和来源的 Brave LLM 上下文 API，用于接地

`webSearch.baseUrl` 可以将 Brave 请求指向受信任的 Brave 兼容代理或网关。OpenClaw 将 `/res/v1/web/search` 或 `/res/v1/llm/context` 附加到配置的基础 URL，并在缓存密钥中保留基础 URL。公共端点必须使用 `https://`；`http://` 仅接受受信任的回环或私有网络代理主机。

## 工具参数

<ParamField path="query" type="string" required>
搜索查询。
</ParamField>

<ParamField path="count" type="number" default="5">
返回的结果数（1-10）。
</ParamField>

<ParamField path="country" type="string">
2 位 ISO 国家代码（例如 `US`、`DE`）。
</ParamField>

<ParamField path="language" type="string">
搜索结果的 ISO 639-1 语言代码（例如 `en`、`de`、`fr`）。
</ParamField>

<ParamField path="search_lang" type="string">
Brave 搜索语言代码（例如 `en`、`en-gb`、`zh-hans`）。
</ParamField>

<ParamField path="ui_lang" type="string">
UI 元素的 ISO 语言代码。
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
时间过滤器——`day` 为 24 小时。
</ParamField>

<ParamField path="date_after" type="string">
仅返回此日期之后发布的结果（`YYYY-MM-DD`）。
</ParamField>

<ParamField path="date_before" type="string">
仅返回此日期之前发布的结果（`YYYY-MM-DD`）。
</ParamField>

**示例：**

```javascript
// 国家和语言特定搜索
await web_search({
  query: "renewable energy",
  country: "DE",
  language: "de",
});

// 最近结果（过去一周）
await web_search({
  query: "AI news",
  freshness: "week",
});

// 日期范围搜索
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});
```

## 说明

- OpenClaw 使用 Brave **Search** 套餐。如果您有旧版订阅（例如每月 2,000 次查询的原始免费套餐），它仍然有效，但不包含 LLM 上下文或更高速率限制等新功能。
- 每个 Brave 套餐包含**每月 \$5 的免费额度**（每月更新）。Search 套餐每 1,000 次请求收费 \$5，因此该额度涵盖每月 1,000 次查询。在 Brave 控制台中设置使用限制以避免意外费用。请参阅 [Brave API 门户](https://brave.com/search/api/) 了解当前套餐。
- Search 套餐包含 LLM 上下文端点和 AI 推理权利。将结果存储用于训练或调整模型需要具有明确存储权利的套餐。参阅 Brave [服务条款](https://api-dashboard.search.brave.com/terms-of-service)。
- `llm-context` 模式返回有接地来源条目而不是普通网页搜索摘要形式。
- `llm-context` 模式支持 `freshness` 和有界的 `date_after` + `date_before` 范围。它不支持 `ui_lang`；没有 `date_after` 的 `date_before` 会被拒绝，因为 Brave 要求自定义新鲜度范围包含开始和结束日期。
- `ui_lang` 必须包含区域子标签，如 `en-US`。
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）。
- 自定义 `webSearch.baseUrl` 值包含在 Brave 缓存标识中，因此代理特定的响应不会发生冲突。
- 启用 `brave.http` 诊断标志可在故障排除时记录 Brave 请求 URL/查询参数、响应状态/时间以及搜索缓存命中/未命中/写入事件。该标志从不记录 API 密钥或响应体，但搜索查询可能很敏感。

## 相关

- [Web 搜索概览](/tools/web) -- 所有提供商和自动检测
- [Perplexity 搜索](/tools/perplexity-search) -- 带域名过滤的结构化结果
- [Exa 搜索](/tools/exa-search) -- 带内容提取的神经网络搜索
