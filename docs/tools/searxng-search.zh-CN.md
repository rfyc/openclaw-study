---
summary: "SearXNG 网络搜索——自托管、无需密钥的元搜索提供商"
read_when:
  - 你想要一个自托管的网络搜索提供商
  - 你想使用 SearXNG 进行 web_search
  - 你需要一个注重隐私或离线搜索选项
title: "SearXNG 搜索"
---

OpenClaw 支持 [SearXNG](https://docs.searxng.org/) 作为**自托管、无需密钥**的 `web_search` 提供商。SearXNG 是一个开源元搜索引擎，聚合来自 Google、Bing、DuckDuckGo 等来源的结果。

优点：

- **免费且无限制** — 无需 API 密钥或商业订阅
- **隐私/离线** — 查询永远不会离开你的网络
- **随处可用** — 无商业搜索 API 的地区限制

## 设置

<Steps>
  <Step title="运行 SearXNG 实例">
    ```bash
    docker run -d -p 8888:8080 searxng/searxng
    ```

    或者使用你有权访问的任何现有 SearXNG 部署。参阅 [SearXNG 文档](https://docs.searxng.org/)了解生产环境设置。

  </Step>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    # 选择 "searxng" 作为提供商
    ```

    或者设置环境变量并让自动检测找到它：

    ```bash
    export SEARXNG_BASE_URL="http://localhost:8888"
    ```

  </Step>
</Steps>

## 配置

```json5
{
  tools: {
    web: {
      search: {
        provider: "searxng",
      },
    },
  },
}
```

SearXNG 实例的插件级设置：

```json5
{
  plugins: {
    entries: {
      searxng: {
        config: {
          webSearch: {
            baseUrl: "http://localhost:8888",
            categories: "general,news", // 可选
            language: "en", // 可选
          },
        },
      },
    },
  },
}
```

`baseUrl` 字段也接受 SecretRef 对象。

传输规则：

- `https://` 适用于公共或私有 SearXNG 主机
- `http://` 仅接受受信任的私有网络或回环主机
- 公共 SearXNG 主机必须使用 `https://`
- 私有/内部主机使用自托管网络守卫；公共 `https://` 主机保持严格的网络搜索守卫，不能重定向到私有地址

## 环境变量

设置 `SEARXNG_BASE_URL` 作为配置的替代方案：

```bash
export SEARXNG_BASE_URL="http://localhost:8888"
```

设置 `SEARXNG_BASE_URL` 且未配置显式提供商时，自动检测会自动选择 SearXNG（优先级最低——任何有密钥的 API 支持提供商优先）。

## 插件配置参考

| 字段         | 描述                                              |
| ------------ | ------------------------------------------------- |
| `baseUrl`    | SearXNG 实例的基础 URL（必填）                    |
| `categories` | 逗号分隔的类别，如 `general`、`news` 或 `science` |
| `language`   | 结果的语言代码，如 `en`、`de` 或 `fr`             |

## 注意事项

- **JSON API** — 使用 SearXNG 的原生 `format=json` 端点，而非 HTML 抓取
- **图片结果 URL** — 当 SearXNG 返回直接图片 URL 时，图片类别结果包含 `img_src`
- **无 API 密钥** — 可与任何 SearXNG 实例开箱即用
- **基础 URL 验证** — `baseUrl` 必须是有效的 `http://` 或 `https://` URL；公共主机必须使用 `https://`
- **网络守卫** — 私有/内部 SearXNG 端点选择加入私有网络访问；公共 `https://` SearXNG 端点保持严格的 SSRF 防护
- **自动检测顺序** — SearXNG 在自动检测中排在最后（顺序 200）。配置了密钥的 API 支持提供商优先运行，然后是 DuckDuckGo（顺序 100），然后是 Ollama Web Search（顺序 110）
- **自托管** — 你控制实例、查询和上游搜索引擎
- **类别**未配置时默认为 `general`
- **类别回退** — 如果非 `general` 类别请求成功但返回零结果，OpenClaw 会在返回空结果集之前用 `general` 重试一次相同查询

<Tip>
  要使 SearXNG JSON API 工作，请确保你的 SearXNG 实例在其 `settings.yml` 的 `search.formats` 下启用了 `json` 格式。
</Tip>

## 相关链接

- [Web 搜索概览](/tools/web) — 所有提供商和自动检测
- [DuckDuckGo 搜索](/tools/duckduckgo-search) — 另一个无需密钥的备用选项
- [Brave 搜索](/tools/brave-search) — 带免费套餐的结构化结果
