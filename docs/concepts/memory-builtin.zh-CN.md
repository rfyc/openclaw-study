---
summary: "默认的基于 SQLite 的记忆后端，支持关键字、向量和混合搜索"
title: "内置记忆引擎"
read_when:
  - 你想了解默认的记忆后端
  - 你想配置嵌入提供商或混合搜索
---

内置引擎是默认的记忆后端。它将记忆索引存储在每个智能体的 SQLite 数据库中，无需额外依赖即可开始使用。

## 提供的功能

- 通过 FTS5 全文索引的**关键字搜索**（BM25 评分）。
- 通过任何受支持提供商的嵌入进行**向量搜索**。
- 结合两者以获得最佳结果的**混合搜索**。
- 通过三元组标记化对中文、日文和韩文的 **CJK 支持**。
- 用于数据库内向量查询的 **sqlite-vec 加速**（可选）。

## 入门

如果你有 OpenAI、Gemini、Voyage、Mistral 或 DeepInfra 的 API 密钥，内置引擎会自动检测并启用向量搜索。无需配置。

要显式设置提供商：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
      },
    },
  },
}
```

没有嵌入提供商时，只有关键字搜索可用。

要强制使用内置本地嵌入提供商，在 OpenClaw 旁边安装可选的 `node-llama-cpp` 运行时包，然后将 `local.modelPath` 指向 GGUF 文件：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "local",
        fallback: "none",
        local: {
          modelPath: "~/.node-llama-cpp/models/embeddinggemma-300m-qat-Q8_0.gguf",
        },
      },
    },
  },
}
```

## 支持的嵌入提供商

| 提供商    | ID          | 自动检测   | 说明                           |
| --------- | ----------- | ---------- | ------------------------------ |
| OpenAI    | `openai`    | 是         | 默认：`text-embedding-3-small` |
| Gemini    | `gemini`    | 是         | 支持多模态（图像 + 音频）      |
| Voyage    | `voyage`    | 是         |                                |
| Mistral   | `mistral`   | 是         |                                |
| DeepInfra | `deepinfra` | 是         | 默认：`BAAI/bge-m3`            |
| Ollama    | `ollama`    | 否         | 本地，需显式设置               |
| Local     | `local`     | 是（优先） | 可选的 `node-llama-cpp` 运行时 |

自动检测按所示顺序选择第一个可以解析 API 密钥的提供商。设置 `memorySearch.provider` 以覆盖。

## 索引工作原理

OpenClaw 将 `MEMORY.md` 和 `memory/*.md` 索引为块（约400个令牌，80个令牌重叠），并将其存储在每个智能体的 SQLite 数据库中。

- **索引位置：** `~/.openclaw/memory/<agentId>.sqlite`
- **存储维护：** SQLite WAL 旁文件通过定期和关机检查点进行限制。
- **文件监视：** 记忆文件的更改触发防抖重新索引（1.5秒）。
- **自动重新索引：** 当嵌入提供商、模型或分块配置更改时，整个索引自动重建。
- **按需重新索引：** `openclaw memory index --force`

<Info>
你也可以使用 `memorySearch.extraPaths` 索引工作区外的 Markdown 文件。参见[配置参考](/reference/memory-config#additional-memory-paths)。
</Info>

## 使用时机

内置引擎是大多数用户的正确选择：

- 无需额外依赖即可开箱即用。
- 很好地处理关键字和向量搜索。
- 支持所有嵌入提供商。
- 混合搜索结合了两种检索方法的最佳效果。

如果你需要重排序、查询扩展，或想要索引工作区外的目录，考虑切换到 [QMD](/concepts/memory-qmd)。

如果你想要具有自动用户建模的跨会话记忆，考虑使用 [Honcho](/concepts/memory-honcho)。

## 故障排除

**记忆搜索已禁用？** 检查 `openclaw memory status`。如果没有检测到提供商，显式设置一个或添加 API 密钥。

**本地提供商未检测到？** 确认本地路径存在并运行：

```bash
openclaw memory status --deep --agent main
openclaw memory index --force --agent main
```

独立 CLI 命令和网关都使用相同的 `local` 提供商 id。如果提供商设置为 `auto`，只有当 `memorySearch.local.modelPath` 指向现有的本地文件时，本地嵌入才被优先考虑。

**结果过时？** 运行 `openclaw memory index --force` 重建。在极少数情况下，监视器可能错过更改。

**sqlite-vec 未加载？** OpenClaw 自动回退到进程内余弦相似度。`openclaw memory status --deep` 分别报告本地向量存储和嵌入提供商，因此 `Vector store: unavailable` 指向 sqlite-vec 加载，而 `Embeddings: unavailable` 指向提供商/认证或模型就绪状态。检查日志以获取具体的加载错误。

## 配置

关于嵌入提供商设置、混合搜索调优（权重、MMR、时间衰减）、批量索引、多模态记忆、sqlite-vec、额外路径和所有其他配置旋钮，参见[记忆配置参考](/reference/memory-config)。

## 相关

- [记忆概述](/concepts/memory)
- [记忆搜索](/concepts/memory-search)
- [主动记忆](/concepts/active-memory)
