---
summary: "DuckDuckGo 网页搜索 -- 无需密钥的回退提供商（实验性，基于 HTML）"
read_when:
  - 您想要不需要 API 密钥的网页搜索提供商
  - 您想使用 DuckDuckGo 进行 web_search
  - 您需要零配置的搜索回退
title: "DuckDuckGo 搜索"
---

OpenClaw 支持将 DuckDuckGo 作为**无需密钥**的 `web_search` 提供商。不需要 API 密钥或账户。

<Warning>
  DuckDuckGo 是一个**实验性的、非官方**集成，从 DuckDuckGo 的非 JavaScript 搜索页面提取结果——而不是官方 API。预计偶尔会因机器人挑战页面或 HTML 更改而出现故障。
</Warning>

## 设置

不需要 API 密钥——只需将 DuckDuckGo 设置为您的提供商：

<Steps>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    # 选择 "duckduckgo" 作为提供商
    ```
  </Step>
</Steps>

## 配置

```json5
{
  tools: {
    web: {
      search: {
        provider: "duckduckgo",
      },
    },
  },
}
```

用于地区和安全搜索的可选插件级别设置：

```json5
{
  plugins: {
    entries: {
      duckduckgo: {
        config: {
          webSearch: {
            region: "us-en", // DuckDuckGo 地区代码
            safeSearch: "moderate", // "strict"、"moderate" 或 "off"
          },
        },
      },
    },
  },
}
```

## 工具参数

<ParamField path="query" type="string" required>
搜索查询。
</ParamField>

<ParamField path="count" type="number" default="5">
返回的结果数（1-10）。
</ParamField>

<ParamField path="region" type="string">
DuckDuckGo 地区代码（例如 `us-en`、`uk-en`、`de-de`）。
</ParamField>

<ParamField path="safeSearch" type="'strict' | 'moderate' | 'off'" default="moderate">
安全搜索级别。
</ParamField>

地区和安全搜索也可以在插件配置中设置（见上文）——工具参数按每次查询覆盖配置值。

## 说明

- **无需 API 密钥** — 开箱即用，零配置
- **实验性** — 从 DuckDuckGo 的非 JavaScript HTML 搜索页面收集结果，不是官方 API 或 SDK
- **机器人挑战风险** — 在大量或自动化使用下，DuckDuckGo 可能提供验证码或阻止请求
- **HTML 解析** — 结果取决于页面结构，该结构可能在不通知的情况下更改
- **自动检测顺序** — DuckDuckGo 是自动检测中第一个无需密钥的回退（顺序 100）。配置了密钥的 API 支持提供商先运行，然后是 Ollama Web Search（顺序 110），然后是 SearXNG（顺序 200）
- **安全搜索默认为中等**，未配置时

<Tip>
  对于生产使用，请考虑 [Brave Search](/tools/brave-search)（有免费层）或其他 API 支持的提供商。
</Tip>

## 相关

- [Web 搜索概览](/tools/web) -- 所有提供商和自动检测
- [Brave Search](/tools/brave-search) -- 带免费层的结构化结果
- [Exa Search](/tools/exa-search) -- 带内容提取的神经网络搜索
