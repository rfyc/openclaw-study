---
summary: "`openclaw wiki` 的 CLI 参考（memory-wiki 库状态、搜索、编译、lint、apply、bridge 和 Obsidian 助手）"
read_when:
  - 你想使用 memory-wiki CLI 时
  - 你在记录或更改 `openclaw wiki` 时
title: "Wiki"
---

# `openclaw wiki`

检查和维护 `memory-wiki` 库。

由捆绑的 `memory-wiki` 插件提供。

相关：

- [Memory Wiki 插件](/plugins/memory-wiki)
- [记忆概述](/concepts/memory)
- [CLI: memory](/cli/memory)

## 用途

在以下情况下使用 `openclaw wiki`：你想要一个带有以下功能的编译知识库：

- wiki 原生搜索和页面读取
- 富含来源的综合
- 矛盾和新鲜度报告
- 从活跃记忆插件的桥接导入
- 可选的 Obsidian CLI 助手

## 常用命令

```bash
openclaw wiki status
openclaw wiki doctor
openclaw wiki init
openclaw wiki ingest ./notes/alpha.md
openclaw wiki compile
openclaw wiki lint
openclaw wiki search "alpha"
openclaw wiki search "who should I ask about Teams?" --mode route-question
openclaw wiki get entity.alpha --from 1 --lines 80

openclaw wiki apply synthesis "Alpha Summary" \
  --body "Short synthesis body" \
  --source-id source.alpha

openclaw wiki apply metadata entity.alpha \
  --source-id source.alpha \
  --status review \
  --question "Still active?"

openclaw wiki bridge import
openclaw wiki unsafe-local import

openclaw wiki obsidian status
openclaw wiki obsidian search "alpha"
openclaw wiki obsidian open syntheses/alpha-summary.md
openclaw wiki obsidian command workspace:quick-switcher
openclaw wiki obsidian daily
```

## 命令

### `wiki status`

检查当前库模式、健康状况和 Obsidian CLI 可用性。

当你不确定库是否已初始化、桥接模式是否健康或 Obsidian 集成是否可用时，首先使用此命令。

当桥接模式处于活跃状态并配置为读取记忆构件时，此命令会查询运行中的 Gateway，以便看到与代理/运行时记忆相同的活跃记忆插件上下文。

### `wiki doctor`

运行 wiki 健康检查并显示配置或库问题。

当桥接模式处于活跃状态并配置为读取记忆构件时，此命令在构建报告之前查询运行中的 Gateway。禁用桥接导入和不读取记忆构件的桥接配置保持本地/离线。

典型问题包括：

- 在没有公共记忆构件的情况下启用桥接模式
- 无效或缺失的库布局
- 期望 Obsidian 模式时缺少外部 Obsidian CLI

### `wiki init`

创建 wiki 库布局和入门页面。

这初始化根结构，包括顶级索引和缓存目录。

### `wiki ingest <path-or-url>`

将内容导入 wiki 来源层。

注意：

- URL 摄取由 `ingest.allowUrlIngest` 控制
- 导入的来源页面在 frontmatter 中保留来源信息
- 启用时，摄取后可以运行自动编译

### `wiki compile`

重建索引、相关块、仪表板和编译摘要。

这在以下位置写入稳定的机器面向构件：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

如果启用了 `render.createDashboards`，compile 还会刷新报告页面。

### `wiki lint`

对库进行 lint 并报告：

- 结构问题
- 来源差距
- 矛盾
- 开放问题
- 低置信度页面/声明
- 过时的页面/声明

在有意义的 wiki 更新后运行此命令。

### `wiki search <query>`

搜索 wiki 内容。

行为取决于配置：

- `search.backend`：`shared` 或 `local`
- `search.corpus`：`wiki`、`memory` 或 `all`
- `--mode`：`auto`、`find-person`、`route-question`、`source-evidence` 或 `raw-claim`

当你想要 wiki 特定的排名或来源详情时使用 `wiki search`。
对于一次广泛的共享召回，当活跃记忆插件公开共享搜索时，优先使用 `openclaw memory search`。

搜索模式帮助代理选择正确的界面：

- `find-person`：别名、句柄、社交媒体、规范 ID 和人员页面
- `route-question`：询问/最适合用于提示和关系上下文
- `source-evidence`：来源页面和结构化证据字段
- `raw-claim`：带有声明/证据元数据的结构化声明文本

示例：

```bash
openclaw wiki search "bgroux" --mode find-person
openclaw wiki search "who knows Teams rollout?" --mode route-question
openclaw wiki search "maintainer-whois" --mode source-evidence
openclaw wiki search "strong route Teams" --mode raw-claim --json
```

文本输出在结果匹配结构化声明时包含 `Claim:` 和 `Evidence:` 行。JSON 输出还为代理侧深入研究公开 `matchedClaimId`、`matchedClaimStatus`、`matchedClaimConfidence`、`evidenceKinds` 和 `evidenceSourceIds`。

### `wiki get <lookup>`

按 ID 或相对路径读取 wiki 页面。

示例：

```bash
openclaw wiki get entity.alpha
openclaw wiki get syntheses/alpha-summary.md --from 1 --lines 80
```

### `wiki apply`

在不进行自由形式页面手术的情况下应用窄突变。

支持的流程包括：

- 创建/更新综合页面
- 更新页面元数据
- 附加来源 ID
- 添加问题
- 添加矛盾
- 更新置信度/状态
- 写入结构化声明

此命令的存在是为了让 wiki 可以安全演进，而无需手动编辑托管块。

### `wiki bridge import`

将公共记忆构件从活跃记忆插件导入到桥接支持的来源页面。

在 `bridge` 模式下，当你想要将最新导出的记忆构件拉入 wiki 库时使用此命令。

对于活跃的桥接构件读取，CLI 通过 Gateway RPC 路由导入，以便导入使用运行时记忆插件上下文。如果桥接导入被禁用或构件读取被关闭，命令保持本地/离线的零导入行为。

### `wiki unsafe-local import`

从 `unsafe-local` 模式中明确配置的本地路径导入。

这是有意实验性的，仅限同一机器。

### `wiki obsidian ...`

在 Obsidian 友好模式下运行的库的 Obsidian 助手命令。

子命令：

- `status`
- `search`
- `open`
- `command`
- `daily`

当启用 `obsidian.useOfficialCli` 时，这些需要 `PATH` 上的官方 `obsidian` CLI。

## 实用使用指南

- 当来源和页面身份重要时，使用 `wiki search` + `wiki get`。
- 使用 `wiki apply` 而不是手动编辑托管的生成部分。
- 在信任矛盾或低置信度内容之前使用 `wiki lint`。
- 在批量导入或来源更改后，当你希望立即获得新鲜的仪表板和编译摘要时，使用 `wiki compile`。
- 当桥接模式依赖于新导出的记忆构件时，使用 `wiki bridge import`。

## 配置关联

`openclaw wiki` 行为由以下因素决定：

- `plugins.entries.memory-wiki.config.vaultMode`
- `plugins.entries.memory-wiki.config.search.backend`
- `plugins.entries.memory-wiki.config.search.corpus`
- `plugins.entries.memory-wiki.config.bridge.*`
- `plugins.entries.memory-wiki.config.obsidian.*`
- `plugins.entries.memory-wiki.config.render.*`
- `plugins.entries.memory-wiki.config.context.includeCompiledDigestPrompt`

有关完整的配置模型，请参阅 [Memory Wiki 插件](/plugins/memory-wiki)。

## 相关

- [CLI 参考](/cli)
- [记忆 wiki](/plugins/memory-wiki)
