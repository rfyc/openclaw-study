---
summary: "Exa AI 搜索 -- 带内容提取的神经网络和关键词搜索"
read_when:
  - 您想使用 Exa 进行 web_search
  - 您需要 EXA_API_KEY
  - 您想要神经网络搜索或内容提取
title: "Exa 搜索"
---

OpenClaw 支持将 [Exa AI](https://exa.ai/) 作为 `web_search` 提供商。Exa 提供神经网络、关键词和混合搜索模式，以及内置的内容提取（摘要、文本、摘要）。

## 获取 API 密钥

<Steps>
  <Step title="创建账户">
    在 [exa.ai](https://exa.ai/) 注册并从您的控制台生成 API 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway 环境中设置 `EXA_API_KEY`，或通过以下方式配置：

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
      exa: {
        config: {
          webSearch: {
            apiKey: "exa-...", // 如果设置了 EXA_API_KEY 则可选
            baseUrl: "https://api.exa.ai", // 可选；OpenClaw 附加 /search
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "exa",
      },
    },
  },
}
```

**环境替代方案：** 在 Gateway 环境中设置 `EXA_API_KEY`。
对于 Gateway 安装，将其放入 `~/.openclaw/.env`。

## 基础 URL 覆盖

当 Exa 搜索请求应通过兼容代理或备用 Exa 端点时，请设置 `plugins.entries.exa.config.webSearch.baseUrl`。OpenClaw 通过前置 `https://` 规范化裸主机，并附加 `/search`（除非路径已以此结尾）。解析的端点包含在搜索缓存键中，因此来自不同 Exa 端点的结果不会共享。

## 工具参数

<ParamField path="query" type="string" required>
搜索查询。
</ParamField>

<ParamField path="count" type="number">
返回的结果数（1-100）。
</ParamField>

<ParamField path="type" type="'auto' | 'neural' | 'fast' | 'deep' | 'deep-reasoning' | 'instant'">
搜索模式。
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
时间过滤器。
</ParamField>

<ParamField path="date_after" type="string">
此日期之后的结果（`YYYY-MM-DD`）。
</ParamField>

<ParamField path="date_before" type="string">
此日期之前的结果（`YYYY-MM-DD`）。
</ParamField>

<ParamField path="contents" type="object">
内容提取选项（见下文）。
</ParamField>

### 内容提取

Exa 可以随搜索结果一起返回提取的内容。传递 `contents` 对象以启用：

```javascript
await web_search({
  query: "transformer architecture explained",
  type: "neural",
  contents: {
    text: true, // 完整页面文本
    highlights: { numSentences: 3 }, // 关键句子
    summary: true, // AI 摘要
  },
});
```

| 内容选项     | 类型                                                                  | 描述             |
| ------------ | --------------------------------------------------------------------- | ---------------- |
| `text`       | `boolean \| { maxCharacters }`                                        | 提取完整页面文本 |
| `highlights` | `boolean \| { maxCharacters, query, numSentences, highlightsPerUrl }` | 提取关键句子     |
| `summary`    | `boolean \| { query }`                                                | AI 生成摘要      |

### 搜索模式

| 模式             | 描述                     |
| ---------------- | ------------------------ |
| `auto`           | Exa 选择最佳模式（默认） |
| `neural`         | 基于语义/含义的搜索      |
| `fast`           | 快速关键词搜索           |
| `deep`           | 彻底的深度搜索           |
| `deep-reasoning` | 带推理的深度搜索         |
| `instant`        | 最快结果                 |

## 说明

- 如果没有提供 `contents` 选项，Exa 默认为 `{ highlights: true }`，因此结果包含关键句子摘录
- 结果在可用时保留来自 Exa API 响应的 `highlightScores` 和 `summary` 字段
- 结果描述从摘要优先解析，然后是摘要，然后是全文——以可用的为准
- `freshness` 和 `date_after`/`date_before` 不能组合——使用一种时间过滤模式
- 每次查询最多可以返回 100 个结果（受 Exa 搜索类型限制）
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）
- Exa 是带有结构化 JSON 响应的官方 API 集成

## 相关

- [Web 搜索概览](/tools/web) -- 所有提供商和自动检测
- [Brave Search](/tools/brave-search) -- 带国家/语言过滤器的结构化结果
- [Perplexity Search](/tools/perplexity-search) -- 带域名过滤的结构化结果
