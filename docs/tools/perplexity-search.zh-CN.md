---
summary: "用于 web_search 的 Perplexity Search API 和 Sonar/OpenRouter 兼容性"
read_when:
  - 你想使用 Perplexity Search 进行 web 搜索
  - 你需要 PERPLEXITY_API_KEY 或 OPENROUTER_API_KEY 设置
title: "Perplexity 搜索"
---

# Perplexity Search API

OpenClaw 支持 Perplexity Search API 作为 `web_search` 提供商。它返回带有 `title`、`url` 和 `snippet` 字段的结构化结果。

为了兼容性，OpenClaw 也支持旧版的 Perplexity Sonar/OpenRouter 设置。如果你使用 `OPENROUTER_API_KEY`、`plugins.entries.perplexity.config.webSearch.apiKey` 中的 `sk-or-...` 密钥，或者设置了 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`，提供商会切换到聊天完成路径，返回带引用的 AI 合成答案而非结构化搜索 API 结果。

## 获取 Perplexity API 密钥

1. 在 [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) 创建 Perplexity 账户
2. 在控制台生成 API 密钥
3. 将密钥存储在配置中或在网关环境中设置 `PERPLEXITY_API_KEY`。

## OpenRouter 兼容性

如果你之前已经使用 OpenRouter 进行 Perplexity Sonar，保持 `provider: "perplexity"` 并在网关环境中设置 `OPENROUTER_API_KEY`，或者在 `plugins.entries.perplexity.config.webSearch.apiKey` 中存储 `sk-or-...` 密钥。

可选的兼容性控制：

- `plugins.entries.perplexity.config.webSearch.baseUrl`
- `plugins.entries.perplexity.config.webSearch.model`

## 配置示例

### 原生 Perplexity Search API

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "pplx-...",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "perplexity",
      },
    },
  },
}
```

### OpenRouter / Sonar 兼容性

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "<openrouter-api-key>",
            baseUrl: "https://openrouter.ai/api/v1",
            model: "perplexity/sonar-pro",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "perplexity",
      },
    },
  },
}
```

## 设置密钥的位置

**通过配置：** 运行 `openclaw configure --section web`。它将密钥存储在 `~/.openclaw/openclaw.json` 的 `plugins.entries.perplexity.config.webSearch.apiKey` 下。该字段也接受 SecretRef 对象。

**通过环境变量：** 在网关进程环境中设置 `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`。对于网关安装，将其放在 `~/.openclaw/.env`（或你的服务环境）中。参阅[环境变量](/help/faq#env-vars-and-env-loading)。

如果配置了 `provider: "perplexity"` 且 Perplexity 密钥 SecretRef 无法解析且没有环境回退，启动/重载会快速失败。

## 工具参数

这些参数适用于原生 Perplexity Search API 路径。

<ParamField path="query" type="string" required>
搜索查询。
</ParamField>

<ParamField path="count" type="number" default="5">
返回的结果数量（1–10）。
</ParamField>

<ParamField path="country" type="string">
2 字母 ISO 国家代码（例如 `US`、`DE`）。
</ParamField>

<ParamField path="language" type="string">
ISO 639-1 语言代码（例如 `en`、`de`、`fr`）。
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
时间过滤器——`day` 表示 24 小时。
</ParamField>

<ParamField path="date_after" type="string">
仅返回此日期之后发布的结果（`YYYY-MM-DD`）。
</ParamField>

<ParamField path="date_before" type="string">
仅返回此日期之前发布的结果（`YYYY-MM-DD`）。
</ParamField>

<ParamField path="domain_filter" type="string[]">
域名白名单/黑名单数组（最多 20 个）。
</ParamField>

<ParamField path="max_tokens" type="number" default="25000">
总内容预算（最大 1000000）。
</ParamField>

<ParamField path="max_tokens_per_page" type="number" default="2048">
每页的 token 限制。
</ParamField>

对于旧版 Sonar/OpenRouter 兼容路径：

- 接受 `query`、`count` 和 `freshness`
- `count` 在那里仅用于兼容性；响应仍然是一个带引用的合成答案而非 N 条结果列表
- 仅 Search API 的过滤器如 `country`、`language`、`date_after`、`date_before`、`domain_filter`、`max_tokens` 和 `max_tokens_per_page` 会返回明确的错误

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

// 域名过滤（白名单）
await web_search({
  query: "climate research",
  domain_filter: ["nature.com", "science.org", ".edu"],
});

// 域名过滤（黑名单 - 加前缀 -）
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});

// 更多内容提取
await web_search({
  query: "detailed AI research",
  max_tokens: 50000,
  max_tokens_per_page: 4096,
});
```

### 域名过滤规则

- 每个过滤器最多 20 个域名
- 不能在同一请求中混合白名单和黑名单
- 使用 `-` 前缀表示黑名单条目（例如 `["-reddit.com"]`）

## 注意事项

- Perplexity Search API 返回结构化 web 搜索结果（`title`、`url`、`snippet`）
- OpenRouter 或显式的 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model` 将 Perplexity 切回 Sonar 聊天完成以保持兼容性
- Sonar/OpenRouter 兼容性返回一个带引用的合成答案，而非结构化结果行
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）

## 相关链接

- [Web 搜索概览](/tools/web) -- 所有提供商和自动检测
- [Perplexity Search API 文档](https://docs.perplexity.ai/docs/search/quickstart) -- 官方 Perplexity 文档
- [Brave 搜索](/tools/brave-search) -- 带国家/语言过滤器的结构化结果
- [Exa 搜索](/tools/exa-search) -- 带内容提取的神经搜索
