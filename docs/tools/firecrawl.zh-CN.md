---
summary: "Firecrawl 搜索、抓取和 web_fetch 回退"
read_when:
  - 您想要 Firecrawl 支持的网络提取
  - 您需要 Firecrawl API 密钥
  - 您想要将 Firecrawl 作为 web_search 提供商
  - 您想要将 Firecrawl 作为 web_fetch 的反机器人提取
title: "Firecrawl"
---

OpenClaw 可以通过三种方式使用 **Firecrawl**：

- 作为 `web_search` 提供商
- 作为显式插件工具：`firecrawl_search` 和 `firecrawl_scrape`
- 作为 `web_fetch` 的回退提取器

它是一个托管的提取/搜索服务，支持机器人绕过和缓存，这对于 JS 密集型网站或阻止纯 HTTP 获取的页面很有帮助。

## 获取 API 密钥

1. 创建 Firecrawl 账户并生成 API 密钥。
2. 将其存储在配置中或在 gateway 环境中设置 `FIRECRAWL_API_KEY`。

## 配置 Firecrawl 搜索

```json5
{
  tools: {
    web: {
      search: {
        provider: "firecrawl",
      },
    },
  },
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webSearch: {
            apiKey: "FIRECRAWL_API_KEY_HERE",
            baseUrl: "https://api.firecrawl.dev",
          },
        },
      },
    },
  },
}
```

注意：

- 在入门引导或 `openclaw configure --section web` 中选择 Firecrawl 会自动启用捆绑的 Firecrawl 插件。
- 带有 Firecrawl 的 `web_search` 支持 `query` 和 `count`。
- 对于 Firecrawl 特定的控制（如 `sources`、`categories` 或结果抓取），请使用 `firecrawl_search`。
- `baseUrl` 默认为托管的 Firecrawl `https://api.firecrawl.dev`。自托管覆盖只允许用于私有/内部端点；仅为这些私有目标接受 HTTP。
- `FIRECRAWL_BASE_URL` 是 Firecrawl 搜索和抓取基础 URL 的共享环境变量回退。

## 配置 Firecrawl 抓取 + web_fetch 回退

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webFetch: {
            apiKey: "FIRECRAWL_API_KEY_HERE",
            baseUrl: "https://api.firecrawl.dev",
            onlyMainContent: true,
            maxAgeMs: 172800000,
            timeoutSeconds: 60,
          },
        },
      },
    },
  },
}
```

注意：

- 仅当 API 密钥可用时（`plugins.entries.firecrawl.config.webFetch.apiKey` 或 `FIRECRAWL_API_KEY`），Firecrawl 回退尝试才会运行。
- `maxAgeMs` 控制缓存结果的最大年龄（ms）。默认值为 2 天。
- 旧版 `tools.web.fetch.firecrawl.*` 配置由 `openclaw doctor --fix` 自动迁移。
- Firecrawl 抓取/基础 URL 覆盖遵循与搜索相同的托管/私有规则：公开托管流量使用 `https://api.firecrawl.dev`；自托管覆盖必须解析为私有/内部端点。
- `firecrawl_scrape` 在将明显的私有、回环、元数据和非 HTTP(S) 目标 URL 转发到 Firecrawl 之前会拒绝它们，匹配显式 Firecrawl 抓取调用的 `web_fetch` 目标安全合同。

`firecrawl_scrape` 重用相同的 `plugins.entries.firecrawl.config.webFetch.*` 设置和环境变量。

### 自托管 Firecrawl

当您自行运行 Firecrawl 时，请设置 `plugins.entries.firecrawl.config.webSearch.baseUrl`、`plugins.entries.firecrawl.config.webFetch.baseUrl` 或 `FIRECRAWL_BASE_URL`。OpenClaw 仅对回环、私有网络、`.local`、`.internal` 或 `.localhost` 目标接受 `http://`。公共自定义主机被拒绝，以防止 Firecrawl API 密钥意外发送到任意端点。

## Firecrawl 插件工具

### `firecrawl_search`

当您想要 Firecrawl 特定的搜索控制而不是通用的 `web_search` 时，请使用此工具。

核心参数：

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

对于普通 `web_fetch` 较弱的 JS 密集型或受机器人保护的页面，请使用此工具。

核心参数：

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## 隐身 / 机器人绕过

Firecrawl 公开了一个用于机器人绕过的**代理模式**参数（`basic`、`stealth` 或 `auto`）。OpenClaw 始终对 Firecrawl 请求使用 `proxy: "auto"` 加上 `storeInCache: true`。如果省略代理，Firecrawl 默认为 `auto`。`auto` 在基本尝试失败时使用隐身代理重试，这可能比仅基本抓取使用更多积分。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 提取顺序：

1. Readability（本地）
2. Firecrawl（如果被选择或自动检测为活动的 web-fetch 回退）
3. 基本 HTML 清理（最后的回退）

选择旋钮是 `tools.web.fetch.provider`。如果省略它，OpenClaw 从可用凭证中自动检测第一个就绪的 web-fetch 提供商。目前捆绑的提供商是 Firecrawl。

## 相关

- [Web 搜索概览](/tools/web) -- 所有提供商和自动检测
- [Web Fetch](/tools/web-fetch) -- 带 Firecrawl 回退的 web_fetch 工具
- [Tavily](/tools/tavily) -- 搜索 + 提取工具
