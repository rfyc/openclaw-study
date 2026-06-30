---
summary: "具有 BM25、向量搜索、重排序和查询扩展的本地优先搜索辅助进程"
title: "QMD 记忆引擎"
read_when:
  - 你想将 QMD 设置为记忆后端
  - 你想要高级记忆功能，如重排序或额外的索引路径
---

[QMD](https://github.com/tobi/qmd) 是一个与 OpenClaw 并行运行的本地优先搜索辅助进程。它在单个二进制文件中结合了 BM25、向量搜索和重排序，并且可以索引工作区记忆文件之外的内容。

## 相比内置引擎的优势

- **重排序和查询扩展**以获得更好的召回效果。
- **索引额外目录** -- 项目文档、团队笔记、磁盘上的任何内容。
- **索引会话记录** -- 召回早期对话。
- **完全本地** -- 使用可选的 node-llama-cpp 运行时包运行，并自动下载 GGUF 模型。
- **自动回退** -- 如果 QMD 不可用，OpenClaw 无缝回退到内置引擎。

## 入门

### 前提条件

- 安装 QMD：`npm install -g @tobilu/qmd` 或 `bun install -g @tobilu/qmd`
- 允许扩展的 SQLite 构建（macOS 上使用 `brew install sqlite`）。
- QMD 必须在网关的 `PATH` 上。
- macOS 和 Linux 开箱即用。Windows 最好通过 WSL2 支持。

### 启用

```json5
{
  memory: {
    backend: "qmd",
  },
}
```

OpenClaw 在 `~/.openclaw/agents/<agentId>/qmd/` 下创建一个自包含的 QMD 主目录，并自动管理辅助进程生命周期 -- 集合、更新和嵌入运行都为你处理。它优先使用当前的 QMD 集合和 MCP 查询形状，但在需要时仍回退到备用集合模式标志和旧的 MCP 工具名称。启动时的协调也会在旧的同名 QMD 集合仍然存在时，将其重新创建回规范模式。

## 辅助进程工作原理

- OpenClaw 从工作区记忆文件和任何配置的 `memory.qmd.paths` 创建集合，然后在 QMD 管理器打开时运行 `qmd update`，之后定期运行（默认每 5 分钟）。这些刷新通过 QMD 子进程运行，而不是进程内文件系统爬取。语义模式还运行 `qmd embed`。
- 默认工作区集合追踪 `MEMORY.md` 加上 `memory/` 树。小写的 `memory.md` 不作为根记忆文件被索引。
- QMD 自己的扫描器忽略隐藏路径和常见的依赖/构建目录，如 `.git`、`.cache`、`node_modules`、`vendor`、`dist` 和 `build`。网关启动默认不初始化 QMD，因此在记忆首次使用之前，冷启动避免导入记忆运行时或创建长期监视器。
- 如果你无论如何都想要网关启动刷新，将 `memory.qmd.update.startup` 设置为 `idle` 或 `immediate`。选择加入的启动刷新使用一次性 QMD 子进程路径，而不是创建完整的长期进程内监视器。
- 搜索使用配置的 `searchMode`（默认：`search`；也支持 `vsearch` 和 `query`）。`search` 仅使用 BM25，因此 OpenClaw 在该模式下跳过语义向量就绪探测和嵌入维护。如果模式失败，OpenClaw 使用 `qmd query` 重试。
- 对于宣传多集合过滤器的 QMD 版本，OpenClaw 将同源集合分组到一个 QMD 搜索调用中。旧版 QMD 保持兼容的每集合回退。
- 如果 QMD 完全失败，OpenClaw 回退到内置 SQLite 引擎。重复的聊天轮次尝试在打开失败后短暂退避，这样缺少的二进制或损坏的辅助进程依赖不会造成重试风暴；`openclaw memory status` 和一次性 CLI 探测仍然直接重检 QMD。

<Info>
第一次搜索可能很慢 -- QMD 在第一次 `qmd query` 运行时自动下载用于重排序和查询扩展的 GGUF 模型（约 2 GB）。
</Info>

## 搜索性能和兼容性

OpenClaw 保持 QMD 搜索路径与当前和旧版 QMD 安装兼容。

启动时，OpenClaw 每个管理器检查一次已安装的 QMD 帮助文本。如果二进制宣传支持多个集合过滤器，OpenClaw 用一个命令搜索所有同源集合：

```bash
qmd search "router notes" --json -n 10 -c memory-root-main -c memory-dir-main
```

这避免了为每个持久记忆集合启动一个 QMD 子进程。会话记录集合保留在它们自己的源组中，因此混合的 `memory` + `sessions` 搜索仍然给结果多样化器提供两个来源的输入。

旧版 QMD 构建只接受一个集合过滤器。当 OpenClaw 检测到这些构建之一时，它保持兼容性路径，在合并和去重结果之前单独搜索每个集合。

要手动检查已安装的合约，运行：

```bash
qmd --help | grep -i collection
```

当前 QMD 帮助说集合过滤器可以针对一个或多个集合。旧版帮助通常描述单个集合。

## 模型覆盖

QMD 模型环境变量从网关进程原样传递，因此你可以全局调整 QMD 而无需添加新的 OpenClaw 配置：

```bash
export QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
export QMD_RERANK_MODEL="/absolute/path/to/reranker.gguf"
export QMD_GENERATE_MODEL="/absolute/path/to/generator.gguf"
```

更改嵌入模型后，重新运行嵌入以使索引与新的向量空间匹配。

## 索引额外路径

将 QMD 指向其他目录以使其可搜索：

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      paths: [{ name: "docs", path: "~/notes", pattern: "**/*.md" }],
    },
  },
}
```

来自额外路径的片段在搜索结果中显示为 `qmd/<collection>/<relative-path>`。`memory_get` 理解此前缀并从正确的集合根读取。

## 索引会话记录

启用会话索引以召回早期对话：

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      sessions: { enabled: true },
    },
  },
}
```

记录被导出为净化的 User/Assistant 轮次，到 `~/.openclaw/agents/<id>/qmd/sessions/` 下的专用 QMD 集合中。

## 搜索范围

默认情况下，QMD 搜索结果在直接和频道会话（非群组）中展示。配置 `memory.qmd.scope` 以更改：

```json5
{
  memory: {
    qmd: {
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
    },
  },
}
```

当范围拒绝搜索时，OpenClaw 记录一个带有派生频道和聊天类型的警告，以便更容易调试空结果。

## 引用

当 `memory.citations` 为 `auto` 或 `on` 时，搜索片段包含 `Source: <path#line>` 页脚。设置 `memory.citations = "off"` 以省略页脚，同时仍将路径内部传递给智能体。

## 使用时机

当你需要以下内容时选择 QMD：

- 重排序以获得更高质量的结果。
- 搜索工作区外的项目文档或笔记。
- 召回过去的会话对话。
- 无需 API 密钥的完全本地搜索。

对于更简单的设置，[内置引擎](/concepts/memory-builtin)无需额外依赖即可很好地工作。

## 故障排除

**找不到 QMD？** 确保二进制文件在网关的 `PATH` 上。如果 OpenClaw 作为服务运行，创建一个符号链接：
`sudo ln -s ~/.bun/bin/qmd /usr/local/bin/qmd`。

如果 `qmd --version` 在你的 shell 中工作，但 OpenClaw 仍然报告 `spawn qmd ENOENT`，网关进程的 `PATH` 可能与你的交互式 shell 不同。显式指定二进制路径：

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      command: "/absolute/path/to/qmd",
    },
  },
}
```

在安装了 QMD 的环境中使用 `command -v qmd`，然后用 `openclaw memory status --deep` 重新检查。

**第一次搜索很慢？** QMD 在首次使用时下载 GGUF 模型。使用 OpenClaw 使用的相同 XDG 目录通过 `qmd query "test"` 预热。

**搜索期间有很多 QMD 子进程？** 如果可能，更新 QMD。只有当已安装的 QMD 宣传支持多个 `-c` 过滤器时，OpenClaw 才对同源多集合搜索使用一个进程；否则它保持旧的每集合回退以保证正确性。

**仅 BM25 的 QMD 仍在尝试构建 llama.cpp？** 设置 `memory.qmd.searchMode = "search"`。OpenClaw 将该模式视为纯词法，不运行 QMD 向量状态探测或嵌入维护，并将语义就绪检查留给 `vsearch` 或 `query` 设置。

**搜索超时？** 增加 `memory.qmd.limits.timeoutMs`（默认：4000ms）。对于较慢的硬件设置为 `120000`。

**群聊中空结果？** 检查 `memory.qmd.scope` -- 默认只允许直接和频道会话。

**根记忆搜索突然变得太宽泛？** 重启网关或等待下次启动协调。OpenClaw 在检测到同名冲突时将过时的托管集合重新创建回规范的 `MEMORY.md` 和 `memory/` 模式。

**工作区可见的临时仓库导致 `ENAMETOOLONG` 或索引损坏？** QMD 遍历目前遵循底层 QMD 扫描器行为，而不是 OpenClaw 的内置符号链接规则。在 QMD 公开循环安全遍历或显式排除控制之前，将临时 monorepo 检出保存在隐藏目录如 `.tmp/` 下或索引的 QMD 根之外。

## 配置

有关完整的配置界面（`memory.qmd.*`）、搜索模式、更新间隔、范围规则和所有其他配置项，参见[记忆配置参考](/reference/memory-config)。

## 相关

- [记忆概述](/concepts/memory)
- [内置记忆引擎](/concepts/memory-builtin)
- [Honcho 记忆](/concepts/memory-honcho)
