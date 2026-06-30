---
summary: "web_search、x_search 和 web_fetch——搜索网络、搜索 X 帖子或获取页面内容"
title: "Web 搜索"
sidebarTitle: "Web 搜索"
read_when:
  - 你想启用或配置 web_search
  - 你想启用或配置 x_search
  - 你需要选择搜索提供商
  - 你想了解自动检测和提供商回退
---

`web_search` 工具使用你配置的提供商搜索网络并返回结果。结果按查询缓存 15 分钟（可配置）。

OpenClaw 还包括用于 X（前 Twitter）帖子的 `x_search` 和用于轻量级 URL 获取的 `web_fetch`。在此阶段，`web_fetch` 保持本地，而 `web_search` 和 `x_search` 可以在底层使用 xAI Responses。

<Info>
  `web_search` 是轻量级 HTTP 工具，而非浏览器自动化。对于 JS 密集型网站或需要登录的页面，使用 [Web 浏览器](/tools/browser)。对于获取特定 URL，使用 [Web Fetch](/tools/web-fetch)。
</Info>

## 快速开始

<Steps>
  <Step title="选择提供商">
    选择一个提供商并完成任何必要的设置。一些提供商不需要密钥，而另一些使用 API 密钥。参阅下面的提供商页面了解详情。
  </Step>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    ```
    这存储提供商和任何必要的凭据。你也可以设置环境变量（例如 `BRAVE_API_KEY`）并跳过 API 支持提供商的这一步。
  </Step>
  <Step title="使用它">
    代理现在可以调用 `web_search`：

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

    对于 X 帖子，使用：

    ```javascript
    await x_search({ query: "dinner recipes" });
    ```

  </Step>
</Steps>

## 选择提供商

<CardGroup cols={2}>
  <Card title="Brave 搜索" icon="shield" href="/tools/brave-search">
    带摘要的结构化结果。支持 `llm-context` 模式、国家/语言过滤器。有免费套餐。
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/tools/duckduckgo-search">
    无需密钥的回退。无需 API 密钥。非官方的基于 HTML 的集成。
  </Card>
  <Card title="Exa" icon="brain" href="/tools/exa-search">
    带内容提取的神经 + 关键词搜索（高亮、文本、摘要）。
  </Card>
  <Card title="Firecrawl" icon="flame" href="/tools/firecrawl">
    结构化结果。最佳搭配 `firecrawl_search` 和 `firecrawl_scrape` 进行深度提取。
  </Card>
  <Card title="Gemini" icon="sparkles" href="/tools/gemini-search">
    通过 Google 搜索基础的带引用的 AI 合成答案。
  </Card>
  <Card title="Grok" icon="zap" href="/tools/grok-search">
    通过 xAI 网络基础的带引用的 AI 合成答案。
  </Card>
  <Card title="Kimi" icon="moon" href="/tools/kimi-search">
    通过 Moonshot 网络搜索的带引用的 AI 合成答案；无基础的聊天回退明确失败。
  </Card>
  <Card title="MiniMax 搜索" icon="globe" href="/tools/minimax-search">
    通过 MiniMax Token Plan 搜索 API 的结构化结果。
  </Card>
  <Card title="Ollama Web 搜索" icon="globe" href="/tools/ollama-search">
    通过已登录的本地 Ollama 主机或托管 Ollama API 搜索。
  </Card>
  <Card title="Perplexity" icon="search" href="/tools/perplexity-search">
    带内容提取控制和域名过滤的结构化结果。
  </Card>
  <Card title="SearXNG" icon="server" href="/tools/searxng-search">
    自托管元搜索。无需 API 密钥。聚合 Google、Bing、DuckDuckGo 等。
  </Card>
  <Card title="Tavily" icon="globe" href="/tools/tavily">
    带搜索深度、主题过滤和 URL 提取的 `tavily_extract` 的结构化结果。
  </Card>
</CardGroup>

### 提供商对比

| 提供商                                  | 结果样式                                 | 过滤器                               | API 密钥                                                                   |
| --------------------------------------- | ---------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------- |
| [Brave](/tools/brave-search)            | 结构化摘要                               | 国家、语言、时间、`llm-context` 模式 | `BRAVE_API_KEY`                                                            |
| [DuckDuckGo](/tools/duckduckgo-search)  | 结构化摘要                               | --                                   | 无（无需密钥）                                                             |
| [Exa](/tools/exa-search)                | 结构化 + 提取                            | 神经/关键词模式、日期、内容提取      | `EXA_API_KEY`                                                              |
| [Firecrawl](/tools/firecrawl)           | 结构化摘要                               | 通过 `firecrawl_search` 工具         | `FIRECRAWL_API_KEY`                                                        |
| [Gemini](/tools/gemini-search)          | AI 合成 + 引用                           | --                                   | `GEMINI_API_KEY`                                                           |
| [Grok](/tools/grok-search)              | AI 合成 + 引用                           | --                                   | `XAI_API_KEY`                                                              |
| [Kimi](/tools/kimi-search)              | AI 合成 + 引用；无基础的聊天回退明确失败 | --                                   | `KIMI_API_KEY` / `MOONSHOT_API_KEY`                                        |
| [MiniMax 搜索](/tools/minimax-search)   | 结构化摘要                               | 地区（`global` / `cn`）              | `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN` |
| [Ollama Web 搜索](/tools/ollama-search) | 结构化摘要                               | --                                   | 已登录本地主机不需要；直接 `https://ollama.com` 搜索需要 `OLLAMA_API_KEY`  |
| [Perplexity](/tools/perplexity-search)  | 结构化摘要                               | 国家、语言、时间、域名、内容限制     | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY`                                |
| [SearXNG](/tools/searxng-search)        | 结构化摘要                               | 类别、语言                           | 无（自托管）                                                               |
| [Tavily](/tools/tavily)                 | 结构化摘要                               | 通过 `tavily_search` 工具            | `TAVILY_API_KEY`                                                           |

## 自动检测

## 原生 OpenAI 网络搜索

当 OpenClaw 网络搜索启用且没有固定管理提供商时，直接 OpenAI Responses 模型自动使用 OpenAI 托管的 `web_search` 工具。这是内置 OpenAI 插件中的提供商拥有行为，仅适用于原生 OpenAI API 流量，不适用于 OpenAI 兼容代理基础 URL 或 Azure 路由。将 `tools.web.search.provider` 设置为其他提供商（如 `brave`）以为 OpenAI 模型保留管理的 `web_search` 工具，或设置 `tools.web.search.enabled: false` 禁用托管搜索和原生 OpenAI 搜索。

## 原生 Codex 网络搜索

Codex 能力模型可以选择性地使用提供商原生的 Responses `web_search` 工具，而非 OpenClaw 的托管 `web_search` 函数。

- 在 `tools.web.search.openaiCodex` 下配置
- 它仅对 Codex 能力模型（`openai-codex/*` 或使用 `api: "openai-codex-responses"` 的提供商）激活
- 管理的 `web_search` 仍然适用于非 Codex 模型
- `mode: "cached"` 是默认值和推荐设置
- `tools.web.search.enabled: false` 禁用托管搜索和原生搜索

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        openaiCodex: {
          enabled: true,
          mode: "cached",
          allowedDomains: ["example.com"],
          contextSize: "high",
          userLocation: {
            country: "US",
            city: "New York",
            timezone: "America/New_York",
          },
        },
      },
    },
  },
}
```

如果启用了原生 Codex 搜索但当前模型不具备 Codex 能力，OpenClaw 保持正常的管理 `web_search` 行为。

## 网络安全

管理的 `web_search` 提供商调用使用 OpenClaw 的守卫获取路径。对于受信任的提供商 API 主机，OpenClaw 仅允许该提供商主机名使用 `198.18.0.0/15` 和 `fc00::/7` 中的 Surge、Clash 和 sing-box 假 IP DNS 答案。其他私有、回环、链路本地和元数据目的地仍然被阻止。

这种自动允许不适用于任意的 `web_fetch` URL。对于 `web_fetch`，仅当你的受信任代理拥有这些合成范围时才显式启用 `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` 和 `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange`。

## 设置网络搜索

文档和设置流程中的提供商列表按字母顺序排列。自动检测保持独立的优先级顺序。

如果没有设置 `provider`，OpenClaw 按此顺序检查提供商并使用第一个就绪的：

API 支持的提供商优先：

1. **Brave** — `BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`（顺序 10）
2. **MiniMax 搜索** — `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN` / `MINIMAX_API_KEY` 或 `plugins.entries.minimax.config.webSearch.apiKey`（顺序 15）
3. **Gemini** — `plugins.entries.google.config.webSearch.apiKey`、`GEMINI_API_KEY` 或 `models.providers.google.apiKey`（顺序 20）
4. **Grok** — `XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`（顺序 30）
5. **Kimi** — `KIMI_API_KEY` / `MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`（顺序 40）
6. **Perplexity** — `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`（顺序 50）
7. **Firecrawl** — `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`（顺序 60）
8. **Exa** — `EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey`；可选的 `plugins.entries.exa.config.webSearch.baseUrl` 覆盖 Exa 端点（顺序 65）
9. **Tavily** — `TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`（顺序 70）

之后是无需密钥的回退：

10. **DuckDuckGo** — 无需账户或 API 密钥的无需密钥 HTML 回退（顺序 100）
11. **Ollama Web 搜索** — 当可达且通过 `ollama signin` 登录时通过你配置的本地 Ollama 主机的无需密钥回退；当主机需要时可以复用 Ollama 提供商 bearer 认证，并在配置了 `OLLAMA_API_KEY` 时可以调用直接 `https://ollama.com` 搜索（顺序 110）
12. **SearXNG** — `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`（顺序 200）

如果没有检测到提供商，回退到 Brave（你会收到一个缺失密钥错误，提示你配置一个）。

<Note>
  所有提供商密钥字段都支持 SecretRef 对象。`plugins.entries.<plugin>.config.webSearch.apiKey` 下的插件范围 SecretRef 会为内置 API 支持的网络搜索提供商（包括 Brave、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax、Perplexity 和 Tavily）解析，无论是通过 `tools.web.search.provider` 显式选择还是通过自动检测选择。在自动检测模式下，OpenClaw 只解析所选提供商密钥——未选择的 SecretRef 保持非活动状态，因此你可以保持多个提供商配置而无需为未使用的那些支付解析成本。
</Note>

## 配置

```json5
{
  tools: {
    web: {
      search: {
        enabled: true, // 默认：true
        provider: "brave", // 或省略以自动检测
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

提供商特定配置（API 密钥、基础 URL、模式）位于 `plugins.entries.<plugin>.config.webSearch.*` 下。Gemini 还可以将 `models.providers.google.apiKey` 和 `models.providers.google.baseUrl` 用作其专用网络搜索配置和 `GEMINI_API_KEY` 之后的低优先级回退。参阅提供商页面了解示例。

`tools.web.search.provider` 根据内置和已安装插件清单声明的网络搜索提供商 id 进行验证。像 `"brvae"` 这样的拼写错误会使配置验证失败，而非静默回退到自动检测。如果配置的提供商只有过时的插件证据，例如卸载第三方插件后剩余的 `plugins.entries.<plugin>` 块，OpenClaw 保持启动弹性并报告警告，这样你就可以重新安装插件或运行 `openclaw doctor --fix` 清理过时的配置。

`web_fetch` 回退提供商选择是独立的：

- 使用 `tools.web.fetch.provider` 选择它
- 或省略该字段让 OpenClaw 从可用凭据自动检测第一个就绪的网络获取提供商
- 非沙盒化的 `web_fetch` 可以使用声明 `contracts.webFetchProviders` 的已安装插件提供商；沙盒化的获取仅限内置
- 今天内置的网络获取提供商是 Firecrawl，在 `plugins.entries.firecrawl.config.webFetch.*` 下配置

当你在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 **Kimi** 时，OpenClaw 还可以询问：

- Moonshot API 区域（`https://api.moonshot.ai/v1` 或 `https://api.moonshot.cn/v1`）
- 默认 Kimi 网络搜索模型（默认为 `kimi-k2.6`）

对于 `x_search`，在 `plugins.entries.xai.config.xSearch.*` 下配置。它使用与 Grok 网络搜索相同的 `XAI_API_KEY` 回退。旧版 `tools.web.x_search.*` 配置由 `openclaw doctor --fix` 自动迁移。当你在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 Grok 时，OpenClaw 还可以使用相同的密钥提供可选的 `x_search` 设置。这是 Grok 路径内的独立后续步骤，而非独立的顶级网络搜索提供商选择。如果你选择另一个提供商，OpenClaw 不显示 `x_search` 提示。

### 存储 API 密钥

<Tabs>
  <Tab title="配置文件">
    运行 `openclaw configure --section web` 或直接设置密钥：

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "YOUR_KEY", // pragma: allowlist secret
              },
            },
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="环境变量">
    在 Gateway 进程环境中设置提供商环境变量：

    ```bash
    export BRAVE_API_KEY="YOUR_KEY"
    ```

    对于 gateway 安装，将其放在 `~/.openclaw/.env` 中。参阅[环境变量](/help/faq#env-vars-and-env-loading)。

  </Tab>
</Tabs>

## 工具参数

| 参数                  | 描述                                          |
| --------------------- | --------------------------------------------- |
| `query`               | 搜索查询（必填）                              |
| `count`               | 返回结果数（1-10，默认：5）                   |
| `country`             | 2 字母 ISO 国家代码（例如 "US"、"DE"）        |
| `language`            | ISO 639-1 语言代码（例如 "en"、"de"）         |
| `search_lang`         | 搜索语言代码（仅限 Brave）                    |
| `freshness`           | 时间过滤器：`day`、`week`、`month` 或 `year`  |
| `date_after`          | 此日期后的结果（YYYY-MM-DD）                  |
| `date_before`         | 此日期前的结果（YYYY-MM-DD）                  |
| `ui_lang`             | UI 语言代码（仅限 Brave）                     |
| `domain_filter`       | 域名允许/拒绝列表数组（仅限 Perplexity）      |
| `max_tokens`          | 总内容预算，默认 25000（仅限 Perplexity）     |
| `max_tokens_per_page` | 每页 token 限制，默认 2048（仅限 Perplexity） |

<Warning>
  并非所有参数都适用于所有提供商。Brave `llm-context` 模式拒绝 `ui_lang`；`date_before` 也需要 `date_after`，因为 Brave 自定义新鲜度范围需要开始和结束日期。Gemini、Grok 和 Kimi 返回带引用的一个合成答案。它们接受 `count` 用于共享工具兼容性，但它不改变基础答案形状。Gemini 通过将 `freshness`、`date_after` 和 `date_before` 转换为 Google 搜索基础时间范围来支持它们。当你使用 Sonar/OpenRouter 兼容路径时，Perplexity 的行为方式相同（`plugins.entries.perplexity.config.webSearch.baseUrl` / `model` 或 `OPENROUTER_API_KEY`）。SearXNG 仅对受信任的私有网络或回环主机接受 `http://`；公共 SearXNG 端点必须使用 `https://`。Firecrawl 和 Tavily 通过 `web_search` 仅支持 `query` 和 `count`——使用其专用工具获取高级选项。
</Warning>

## x_search

`x_search` 使用 xAI 查询 X（前 Twitter）帖子，并返回带引用的 AI 合成答案。它接受自然语言查询和可选的结构化过滤器。OpenClaw 仅在处理此工具调用的请求上启用内置 xAI `x_search` 工具。

<Note>
  xAI 文档记录 `x_search` 支持关键词搜索、语义搜索、用户搜索和线程获取。对于每帖参与统计（如转发、回复、书签或浏览量），建议针对确切的帖子 URL 或状态 ID 进行定向查找。广泛的关键词搜索可能会找到正确的帖子，但返回的每帖元数据较少。一个好的模式是：先定位帖子，然后运行专注于该确切帖子的第二个 `x_search` 查询。
</Note>

### x_search 配置

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          xSearch: {
            enabled: true,
            model: "grok-4-1-fast-non-reasoning",
            baseUrl: "https://api.x.ai/v1", // 可选，覆盖 webSearch.baseUrl
            inlineCitations: false,
            maxTurns: 2,
            timeoutSeconds: 30,
            cacheTtlMinutes: 15,
          },
          webSearch: {
            apiKey: "xai-...", // 如果设置了 XAI_API_KEY 则可选
            baseUrl: "https://api.x.ai/v1", // 可选的共享 xAI Responses 基础 URL
          },
        },
      },
    },
  },
}
```

当设置了 `plugins.entries.xai.config.xSearch.baseUrl` 时，`x_search` 发布到 `<baseUrl>/responses`。如果省略该字段，它回退到 `plugins.entries.xai.config.webSearch.baseUrl`，然后是旧版 `tools.web.search.grok.baseUrl`，最后是公共 xAI 端点。

### x_search 参数

| 参数                         | 描述                                   |
| ---------------------------- | -------------------------------------- |
| `query`                      | 搜索查询（必填）                       |
| `allowed_x_handles`          | 将结果限制为特定 X 账号                |
| `excluded_x_handles`         | 排除特定 X 账号                        |
| `from_date`                  | 仅包含此日期或之后的帖子（YYYY-MM-DD） |
| `to_date`                    | 仅包含此日期或之前的帖子（YYYY-MM-DD） |
| `enable_image_understanding` | 让 xAI 检查匹配帖子中附加的图片        |
| `enable_video_understanding` | 让 xAI 检查匹配帖子中附加的视频        |

### x_search 示例

```javascript
await x_search({
  query: "dinner recipes",
  allowed_x_handles: ["nytfood"],
  from_date: "2026-03-01",
});
```

```javascript
// 每帖统计：尽可能使用确切的状态 URL 或状态 ID
await x_search({
  query: "https://x.com/huntharo/status/1905678901234567890",
});
```

## 示例

```javascript
// 基本搜索
await web_search({ query: "OpenClaw plugin SDK" });

// 德国特定搜索
await web_search({ query: "TV online schauen", country: "DE", language: "de" });

// 最近结果（过去一周）
await web_search({ query: "AI developments", freshness: "week" });

// 日期范围
await web_search({
  query: "climate research",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// 域名过滤（仅限 Perplexity）
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});
```

## 工具配置文件

如果你使用工具配置文件或允许列表，请添加 `web_search`、`x_search` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_search", "x_search"],
    // 或：allow: ["group:web"]（包括 web_search、x_search 和 web_fetch）
  },
}
```

## 相关链接

- [Web Fetch](/tools/web-fetch) — 获取 URL 并提取可读内容
- [Web 浏览器](/tools/browser) — 用于 JS 密集型网站的完整浏览器自动化
- [Grok 搜索](/tools/grok-search) — Grok 作为 `web_search` 提供商
- [Ollama Web 搜索](/tools/ollama-search) — 通过你的 Ollama 主机的无需密钥网络搜索
