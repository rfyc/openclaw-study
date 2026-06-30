---
summary: "web_fetch 工具——带可读内容提取的 HTTP 获取"
read_when:
  - 你想获取 URL 并提取可读内容
  - 你需要配置 web_fetch 或其 Firecrawl 回退
  - 你想了解 web_fetch 的限制和缓存
title: "Web Fetch"
sidebarTitle: "Web Fetch"
---

`web_fetch` 工具执行普通的 HTTP GET 并提取可读内容（HTML 转换为 markdown 或文本）。它**不**执行 JavaScript。

对于 JS 密集型网站或需要登录的页面，请改用 [Web 浏览器](/tools/browser)。

## 快速开始

`web_fetch` **默认启用**——无需配置。代理可以立即调用它：

```javascript
await web_fetch({ url: "https://example.com/article" });
```

## 工具参数

<ParamField path="url" type="string" required>
要获取的 URL。仅限 `http(s)`。
</ParamField>

<ParamField path="extractMode" type="'markdown' | 'text'" default="markdown">
主内容提取后的输出格式。
</ParamField>

<ParamField path="maxChars" type="number">
将输出截断到此字符数。
</ParamField>

## 工作原理

<Steps>
  <Step title="获取">
    使用类 Chrome 的 User-Agent 和 `Accept-Language` 头发送 HTTP GET。阻止私有/内部主机名并重新检查重定向。
  </Step>
  <Step title="提取">
    在 HTML 响应上运行 Readability（主内容提取）。
  </Step>
  <Step title="回退（可选）">
    如果 Readability 失败且配置了 Firecrawl，通过 Firecrawl API 以机器人规避模式重试。
  </Step>
  <Step title="缓存">
    结果缓存 15 分钟（可配置）以减少对相同 URL 的重复获取。
  </Step>
</Steps>

## 配置

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true, // 默认：true
        provider: "firecrawl", // 可选；省略则自动检测
        maxChars: 50000, // 最大输出字符数
        maxCharsCap: 50000, // maxChars 参数的硬上限
        maxResponseBytes: 2000000, // 截断前最大下载大小
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        useTrustedEnvProxy: false, // 让受信任的 HTTP(S) 环境代理解析 DNS
        readability: true, // 使用 Readability 提取
        userAgent: "Mozilla/5.0 ...", // 覆盖 User-Agent
        ssrfPolicy: {
          allowRfc2544BenchmarkRange: true, // 对使用 198.18.0.0/15 的受信任假 IP 代理选择加入
          allowIpv6UniqueLocalRange: true, // 对使用 fc00::/7 的受信任假 IP 代理选择加入
        },
      },
    },
  },
}
```

## Firecrawl 回退

如果 Readability 提取失败，`web_fetch` 可以回退到 [Firecrawl](/tools/firecrawl) 进行机器人规避和更好的提取：

```json5
{
  tools: {
    web: {
      fetch: {
        provider: "firecrawl", // 可选；省略则从可用凭据自动检测
      },
    },
  },
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webFetch: {
            apiKey: "fc-...", // 如果设置了 FIRECRAWL_API_KEY 则可选
            baseUrl: "https://api.firecrawl.dev",
            onlyMainContent: true,
            maxAgeMs: 86400000, // 缓存持续时间（1 天）
            timeoutSeconds: 60,
          },
        },
      },
    },
  },
}
```

`plugins.entries.firecrawl.config.webFetch.apiKey` 支持 SecretRef 对象。旧版 `tools.web.fetch.firecrawl.*` 配置由 `openclaw doctor --fix` 自动迁移。

<Note>
  如果启用了 Firecrawl 且其 SecretRef 未解析且没有 `FIRECRAWL_API_KEY` 环境回退，gateway 启动会快速失败。
</Note>

<Note>
  Firecrawl `baseUrl` 覆盖受到限制：托管流量使用 `https://api.firecrawl.dev`；自托管覆盖必须针对私有或内部端点，对这些私有目标仅接受 `http://`。
</Note>

当前运行时行为：

- `tools.web.fetch.provider` 显式选择获取回退提供商。
- 如果省略 `provider`，OpenClaw 从可用凭据自动检测第一个就绪的网络获取提供商。非沙盒化的 `web_fetch` 可以使用声明 `contracts.webFetchProviders` 并在运行时注册匹配提供商的已安装插件。今天内置提供商是 Firecrawl。
- 沙盒化的 `web_fetch` 调用仅限于内置提供商。
- 如果禁用了 Readability，`web_fetch` 直接跳到所选提供商回退。如果没有可用的提供商，它关闭失败。

## 受信任的环境代理

如果你的部署需要 `web_fetch` 通过受信任的出站 HTTP(S) 代理，设置 `tools.web.fetch.useTrustedEnvProxy: true`。

在此模式下，OpenClaw 在发送请求之前仍然应用基于主机名的 SSRF 检查，但让代理解析 DNS 而非进行本地 DNS 固定。仅当代理是操作者控制的且在 DNS 解析后强制执行出站策略时才启用此功能。

<Note>
  如果没有配置 HTTP(S) 代理环境变量，或目标主机被 `NO_PROXY` 排除，`web_fetch` 回退到带有本地 DNS 固定的正常严格路径。
</Note>

## 限制和安全性

- `maxChars` 被限制到 `tools.web.fetch.maxCharsCap`
- 响应体在解析前被限制到 `maxResponseBytes`；超大响应被截断并显示警告
- 私有/内部主机名被阻止
- `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` 和 `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange` 是受信任假 IP 代理栈的窄选择加入；除非你的代理拥有这些合成范围并在其后强制执行自己的目的地策略，否则保持未设置
- 重定向被检查并受 `maxRedirects` 限制
- `useTrustedEnvProxy` 是明确的选择加入，仅应为 DNS 解析后仍然强制执行出站策略的操作者控制代理启用
- `web_fetch` 是尽力而为的——某些网站需要 [Web 浏览器](/tools/browser)

## 工具配置文件

如果你使用工具配置文件或允许列表，请添加 `web_fetch` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_fetch"],
    // 或：allow: ["group:web"]（包括 web_fetch、web_search 和 x_search）
  },
}
```

## 相关链接

- [Web 搜索](/tools/web) — 使用多个提供商搜索网络
- [Web 浏览器](/tools/browser) — 用于 JS 密集型网站的完整浏览器自动化
- [Firecrawl](/tools/firecrawl) — Firecrawl 搜索和抓取工具
