---
summary: "配置内置 LanceDB 内存插件，包括本地 Ollama 兼容的嵌入向量"
read_when:
  - 你正在配置内置的 memory-lancedb 插件
  - 你希望使用基于 LanceDB 的长期记忆，并启用自动召回或自动捕获
  - 你正在使用本地 OpenAI 兼容的嵌入向量，例如 Ollama
title: "Memory LanceDB"
sidebarTitle: "Memory LanceDB"
---

`memory-lancedb` 是一个内置内存插件，将长期记忆存储在 LanceDB 中，并使用嵌入向量进行召回。它可以在模型轮次之前自动召回相关记忆，并在响应之后自动捕获重要事实。

当你需要一个本地向量数据库来存储记忆、需要 OpenAI 兼容的嵌入向量端点，或希望将记忆数据库保存在默认内置内存存储之外时，可以使用此插件。

<Note>
`memory-lancedb` 是一个主动内存插件。通过设置 `plugins.slots.memory = "memory-lancedb"` 来选择内存槽以启用它。伴随插件（如 `memory-wiki`）可以与其并行运行，但只有一个插件拥有主动内存槽。
</Note>

## 快速开始

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "openai",
            model: "text-embedding-3-small",
          },
          autoRecall: true,
          autoCapture: false,
        },
      },
    },
  },
}
```

更改插件配置后重启 Gateway：

```bash
openclaw gateway restart
```

然后验证插件已加载：

```bash
openclaw plugins list
```

## 提供商支持的嵌入向量

`memory-lancedb` 可以使用与 `memory-core` 相同的内存嵌入向量提供商适配器。设置 `embedding.provider` 并省略 `embedding.apiKey` 即可使用提供商配置的认证配置、环境变量或 `models.providers.<provider>.apiKey`。

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "openai",
            model: "text-embedding-3-small",
          },
          autoRecall: true,
        },
      },
    },
  },
}
```

此路径适用于暴露嵌入向量凭据的提供商认证配置。例如，当 Copilot 配置文件/计划支持嵌入向量时，可以使用 GitHub Copilot：

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "github-copilot",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

OpenAI Codex / ChatGPT OAuth（`openai-codex`）不是 OpenAI Platform 的嵌入向量凭据。要使用 OpenAI 嵌入向量，请使用 OpenAI API 密钥认证配置、`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`。仅使用 OAuth 的用户可以使用其他支持嵌入向量的提供商，例如 GitHub Copilot 或 Ollama。

## Ollama 嵌入向量

对于 Ollama 嵌入向量，建议使用内置的 Ollama 嵌入向量提供商。它使用原生 Ollama `/api/embed` 端点，并遵循与 [Ollama](/providers/ollama) 提供商文档中相同的认证/基础 URL 规则。

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "ollama",
            baseUrl: "http://127.0.0.1:11434",
            model: "mxbai-embed-large",
            dimensions: 1024,
          },
          recallMaxChars: 400,
          autoRecall: true,
          autoCapture: false,
        },
      },
    },
  },
}
```

对于非标准嵌入向量模型，请设置 `dimensions`。OpenClaw 知道 `text-embedding-3-small` 和 `text-embedding-3-large` 的维度；自定义模型需要在配置中填写该值，以便 LanceDB 可以创建向量列。

对于小型本地嵌入向量模型，如果看到来自本地服务器的上下文长度错误，请降低 `recallMaxChars`。

## OpenAI 兼容提供商

某些 OpenAI 兼容的嵌入向量提供商会拒绝 `encoding_format` 参数，而其他提供商则会忽略该参数并始终返回 `number[]` 向量。因此 `memory-lancedb` 在嵌入向量请求中省略了 `encoding_format`，并同时接受浮点数组响应和 base64 编码的 float32 响应。

如果你有一个原始的 OpenAI 兼容嵌入向量端点但没有内置的提供商适配器，请省略 `embedding.provider`（或保留为 `openai`），并设置 `embedding.apiKey` 和 `embedding.baseUrl`。这将保留直接的 OpenAI 兼容客户端路径。

对于维度未内置的提供商，请设置 `embedding.dimensions`。例如，智谱 `embedding-3` 使用 `2048` 维度：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            apiKey: "${ZHIPU_API_KEY}",
            baseUrl: "https://open.bigmodel.cn/api/paas/v4",
            model: "embedding-3",
            dimensions: 2048,
          },
        },
      },
    },
  },
}
```

## 召回与捕获限制

`memory-lancedb` 有两个独立的文本限制：

| 设置              | 默认值 | 范围      | 应用于                            |
| ----------------- | ------ | --------- | --------------------------------- |
| `recallMaxChars`  | `1000` | 100-10000 | 发送到嵌入向量 API 用于召回的文本 |
| `captureMaxChars` | `500`  | 100-10000 | 符合自动捕获条件的助手消息长度    |

`recallMaxChars` 控制自动召回、`memory_recall` 工具、`memory_forget` 查询路径以及 `openclaw ltm search`。自动召回优先使用轮次中最新的用户消息，当没有用户消息时才回退到完整提示词。这样可以避免将频道元数据和大型提示词块发送到嵌入向量请求中。

`captureMaxChars` 控制响应是否足够短以被考虑用于自动捕获。它不会限制召回查询嵌入向量。

## 命令

当 `memory-lancedb` 是活动内存插件时，它会注册 `ltm` CLI 命名空间：

```bash
openclaw ltm list
openclaw ltm search "project preferences"
openclaw ltm stats
```

该插件还扩展了 `openclaw memory`，添加了一个非向量 `query` 子命令，直接针对 LanceDB 表运行：

```bash
openclaw memory query --cols id,text,createdAt --limit 20
openclaw memory query --filter "category = 'preference'" --order-by createdAt:desc
```

- `--cols <columns>`：列允许列表，以逗号分隔（默认为 `id`、`text`、`importance`、`category`、`createdAt`）。
- `--filter <condition>`：SQL 风格的 WHERE 子句；限制为 200 个字符，仅允许字母数字、比较运算符、引号、括号和一小组安全标点符号。
- `--limit <n>`：正整数；默认 `10`。
- `--order-by <column>:<asc|desc>`：过滤后应用的内存排序；排序列会自动包含在投影中。

Agent 也会从活动内存插件获得 LanceDB 内存工具：

- `memory_recall`，用于基于 LanceDB 的召回
- `memory_store`，用于保存重要事实、偏好、决策和实体
- `memory_forget`，用于删除匹配的记忆

## 存储

默认情况下，LanceDB 数据存储在 `~/.openclaw/memory/lancedb` 下。使用 `dbPath` 覆盖路径：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          dbPath: "~/.openclaw/memory/lancedb",
          embedding: {
            apiKey: "${OPENAI_API_KEY}",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

`storageOptions` 接受字符串键值对，用于配置 LanceDB 存储后端，并支持 `${ENV_VAR}` 扩展：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          dbPath: "s3://memory-bucket/openclaw",
          storageOptions: {
            access_key: "${AWS_ACCESS_KEY_ID}",
            secret_key: "${AWS_SECRET_ACCESS_KEY}",
            endpoint: "${AWS_ENDPOINT_URL}",
          },
          embedding: {
            apiKey: "${OPENAI_API_KEY}",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

## 运行时依赖

`memory-lancedb` 依赖原生 `@lancedb/lancedb` 包。打包的 OpenClaw 将该包视为插件包的一部分。Gateway 启动时不会修复插件依赖；如果依赖缺失，请重新安装或更新插件包并重启 Gateway。

如果旧版安装在插件加载时记录了缺少 `dist/package.json` 或缺少 `@lancedb/lancedb` 的错误，请升级 OpenClaw 并重启 Gateway。

如果插件记录了 `darwin-x64` 上 LanceDB 不可用的日志，请在该机器上使用默认内存后端，将 Gateway 迁移到受支持的平台，或禁用 `memory-lancedb`。

## 故障排除

### 输入长度超过上下文长度

这通常意味着嵌入向量模型拒绝了召回查询：

```text
memory-lancedb: recall failed: Error: 400 the input length exceeds the context length
```

降低 `recallMaxChars`，然后重启 Gateway：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        config: {
          recallMaxChars: 400,
        },
      },
    },
  },
}
```

对于 Ollama，还需验证嵌入向量服务器可从 Gateway 主机访问：

```bash
curl http://127.0.0.1:11434/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"mxbai-embed-large","input":"hello"}'
```

### 不支持的嵌入向量模型

如果没有 `dimensions`，则只有内置的 OpenAI 嵌入向量维度是已知的。对于本地或自定义嵌入向量模型，将 `embedding.dimensions` 设置为该模型报告的向量大小。

### 插件已加载但没有记忆出现

检查 `plugins.slots.memory` 是否指向 `memory-lancedb`，然后运行：

```bash
openclaw ltm stats
openclaw ltm search "recent preference"
```

如果禁用了 `autoCapture`，插件将召回现有记忆，但不会自动存储新记忆。如果需要自动捕获，请使用 `memory_store` 工具或启用 `autoCapture`。

## 相关文档

- [内存概览](/concepts/memory)
- [主动内存](/concepts/active-memory)
- [内存搜索](/concepts/memory-search)
- [Memory Wiki](/plugins/memory-wiki)
- [Ollama](/providers/ollama)
