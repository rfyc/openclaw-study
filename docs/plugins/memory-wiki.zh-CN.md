---
summary: "memory-wiki：带来源追溯、声明、仪表板和桥接模式的编译知识库"
read_when:
  - 你希望超越纯 MEMORY.md 笔记的持久知识
  - 你正在配置内置 memory-wiki 插件
  - 你想了解 wiki_search、wiki_get 或桥接模式
title: "Memory wiki"
---

`memory-wiki` 是一个内置插件，将持久记忆转变为经编译的知识库。

它**不**替代主动内存插件。主动内存插件仍然负责召回、提升、索引和做梦。`memory-wiki` 位于其旁边，将持久知识编译成带有确定性页面、结构化声明、来源追溯、仪表板和机器可读摘要的可导航 wiki。

当你希望记忆表现得更像维护好的知识层而不是一堆 Markdown 文件时，可以使用它。

## 它增加了什么

- 带确定性页面布局的专用 wiki 知识库
- 结构化声明和证据元数据，而不仅仅是散文
- 页面级来源追溯、置信度、矛盾和未解决问题
- 用于 agent/运行时消费者的编译摘要
- wiki 原生搜索/获取/应用/检查工具
- 可选的桥接模式，从主动内存插件导入公共工件
- 可选的 Obsidian 友好渲染模式和 CLI 集成

## 它如何与记忆配合

可以这样理解这种分层：

| 层                                            | 负责                                                              |
| --------------------------------------------- | ----------------------------------------------------------------- |
| 主动内存插件（`memory-core`、QMD、Honcho 等） | 召回、语义搜索、提升、做梦、内存运行时                            |
| `memory-wiki`                                 | 编译 wiki 页面、带来源追溯的综合、仪表板、wiki 专属搜索/获取/应用 |

如果主动内存插件暴露了共享召回工件，OpenClaw 可以通过 `memory_search corpus=all` 在一次传递中同时搜索两个层。

当你需要 wiki 特定的排序、来源追溯或直接页面访问时，请改用 wiki 原生工具。

## 推荐的混合模式

本地优先配置的强大默认方案是：

- QMD 作为主动内存后端，用于召回和广泛语义搜索
- `memory-wiki` 以 `bridge` 模式用于持久综合知识页面

这种分层效果很好，因为每个层都保持专注：

- QMD 保持原始笔记、会话导出和额外集合的可搜索性
- `memory-wiki` 编译稳定的实体、声明、仪表板和来源页面

实用规则：

- 当你想要一次广泛的记忆召回时，使用 `memory_search`
- 当你想要带来源追溯的 wiki 结果时，使用 `wiki_search` 和 `wiki_get`
- 当你希望共享搜索跨越两个层时，使用 `memory_search corpus=all`

如果桥接模式报告导出的工件为零，说明主动内存插件当前尚未暴露公共桥接输入。先运行 `openclaw wiki doctor`，然后确认主动内存插件支持公共工件。

当桥接模式处于活动状态且 `bridge.readMemoryArtifacts` 已启用时，`openclaw wiki status`、`openclaw wiki doctor` 和 `openclaw wiki bridge import` 会通过运行中的 Gateway 进行读取。这样 CLI 桥接检查就与运行时内存插件上下文保持一致。如果桥接被禁用或工件读取被关闭，这些命令将保持其本地/离线行为。

## 知识库模式

`memory-wiki` 支持三种知识库模式：

### `isolated`

独立知识库，独立来源，不依赖 `memory-core`。

当你希望 wiki 成为其自身的精心策划知识存储时使用。

### `bridge`

通过公共插件 SDK 接口，从主动内存插件读取公共内存工件和内存事件。

当你希望 wiki 在不访问私有插件内部的情况下，编译和组织内存插件导出的工件时使用。

桥接模式可以索引：

- 导出的内存工件
- 做梦报告
- 每日笔记
- 内存根文件
- 内存事件日志

### `unsafe-local`

显式的同机器本地私有路径转义门。

此模式是故意实验性和不可移植的。仅当你了解信任边界并特别需要桥接模式无法提供的本地文件系统访问时才使用。

## 知识库布局

插件初始化知识库如下：

```text
<vault>/
  AGENTS.md
  WIKI.md
  index.md
  inbox.md
  entities/
  concepts/
  syntheses/
  sources/
  reports/
  _attachments/
  _views/
  .openclaw-wiki/
```

托管内容保留在生成的块中。人工笔记块会被保留。

主要页面组包括：

- `sources/`，用于导入的原始材料和桥接支持的页面
- `entities/`，用于持久事物、人员、系统、项目和对象
- `concepts/`，用于想法、抽象、模式和策略
- `syntheses/`，用于编译摘要和维护的汇总
- `reports/`，用于生成的仪表板

## 结构化声明和证据

页面可以携带结构化的 `claims` frontmatter，而不仅仅是自由文本。

每个声明可以包括：

- `id`
- `text`
- `status`
- `confidence`
- `evidence[]`
- `updatedAt`

证据条目可以包括：

- `kind`
- `sourceId`
- `path`
- `lines`
- `weight`
- `confidence`
- `privacyTier`
- `note`
- `updatedAt`

这就是让 wiki 表现得更像信念层而不是被动笔记堆的原因。声明可以被追踪、评分、争议，并追溯到来源。

## 面向 Agent 的实体元数据

实体页面还可以携带用于 agent 使用的路由元数据。这是通用 frontmatter，因此适用于人员、团队、系统、项目或任何其他实体类型。

常用字段包括：

- `entityType`：例如 `person`、`team`、`system` 或 `project`
- `canonicalId`：在别名和导入中使用的稳定标识键
- `aliases`：应解析到同一页面的名称、句柄或标签
- `privacyTier`：`public`、`local-private`、`sensitive` 或 `confirm-before-use`
- `bestUsedFor` / `notEnoughFor`：紧凑的路由提示
- `lastRefreshedAt`：与页面编辑时间分开的来源刷新时间戳
- `personCard`：可选的人员特定路由卡，包含句柄、社交媒体、邮件、时区、通道、可询问事项、避免询问事项、置信度和隐私
- `relationships`：到相关页面的类型化边，包含目标、种类、权重、置信度、证据类型、隐私级别和备注

对于人员 wiki，agent 通常应从 `reports/person-agent-directory.md` 开始，然后在使用联系详情或推断事实之前用 `wiki_get` 打开人员页面。

示例：

```yaml
pageType: entity
entityType: person
id: entity.brad-groux
canonicalId: maintainer.brad-groux
aliases:
  - Brad
  - bgroux
privacyTier: local-private
bestUsedFor:
  - Microsoft Teams and Azure routing
notEnoughFor:
  - legal approval
lastRefreshedAt: "2026-04-29T00:00:00.000Z"
personCard:
  handles:
    - "@bgroux"
  socials:
    - "https://x.example/bgroux"
  emails:
    - brad@example.com
  timezone: America/Chicago
  lane: Microsoft ecosystem
  askFor:
    - Teams rollout questions
  avoidAskingFor:
    - unrelated billing decisions
  confidence: 0.8
  privacyTier: confirm-before-use
relationships:
  - targetId: entity.alice
    targetTitle: Alice
    kind: collaborates-with
    confidence: 0.7
    evidenceKind: discrawl-stat
claims:
  - id: claim.brad.teams
    text: Brad is useful for Microsoft Teams routing.
    status: supported
    confidence: 0.9
    evidence:
      - kind: maintainer-whois
        sourceId: source.maintainers
        privacyTier: local-private
```

## 编译流水线

编译步骤读取 wiki 页面，规范化摘要，并在以下位置输出稳定的机器端工件：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

这些摘要的存在是为了让 agent 和运行时代码不必抓取 Markdown 页面。

编译输出还支持：

- 搜索/获取流程的首次 wiki 索引
- 声明 id 到拥有页面的回溯查找
- 紧凑的提示词补充
- 报告/仪表板生成

## 仪表板和健康报告

当启用 `render.createDashboards` 时，编译会在 `reports/` 下维护仪表板。

内置报告包括：

- `reports/open-questions.md`
- `reports/contradictions.md`
- `reports/low-confidence.md`
- `reports/claim-health.md`
- `reports/stale-pages.md`
- `reports/person-agent-directory.md`
- `reports/relationship-graph.md`
- `reports/provenance-coverage.md`
- `reports/privacy-review.md`

这些报告跟踪的内容包括：

- 矛盾笔记集群
- 竞争声明集群
- 缺少结构化证据的声明
- 低置信度页面和声明
- 陈旧或未知新鲜度
- 有未解决问题的页面
- 人员/实体路由卡
- 结构化关系边
- 证据类别覆盖
- 在使用前需要审查的非公开隐私级别

## 搜索和检索

`memory-wiki` 支持两种搜索后端：

- `shared`：在可用时使用共享内存搜索流
- `local`：在本地搜索 wiki

它还支持三种语料库：

- `wiki`
- `memory`
- `all`

重要行为：

- `wiki_search` 和 `wiki_get` 尽可能以编译摘要作为首次传递
- 声明 id 可以解析回拥有页面
- 有争议/陈旧/新鲜声明会影响排名
- 来源标签可以保留到结果中
- 搜索模式可以针对人员查找、问题路由、来源证据或原始声明进行排名偏置

实用规则：

- 使用 `memory_search corpus=all` 进行一次广泛的召回传递
- 当你关注 wiki 特定排名、来源追溯或页面级信念结构时，使用 `wiki_search` + `wiki_get`

搜索模式：

- `auto`：均衡的默认值
- `find-person`：提升人员类实体、别名、句柄、社交媒体和规范 ID
- `route-question`：提升 agent 卡、可询问提示、最佳用途提示和关系上下文
- `source-evidence`：提升来源页面和结构化证据元数据
- `raw-claim`：提升匹配的结构化声明，并在结果中返回声明/证据元数据

当结果与结构化声明匹配时，`wiki_search` 可以在其详情载荷中返回 `matchedClaimId`、`matchedClaimStatus`、`matchedClaimConfidence`、`evidenceKinds` 和 `evidenceSourceIds`。文本输出在可用时还包含紧凑的 `Claim:` 和 `Evidence:` 行。

## Agent 工具

插件注册这些工具：

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

功能说明：

- `wiki_status`：当前知识库模式、健康状况、Obsidian CLI 可用性
- `wiki_search`：搜索 wiki 页面，以及在已配置时搜索共享内存语料库；接受 `mode` 参数，用于人员查找、问题路由、来源证据或原始声明钻取
- `wiki_get`：通过 id/路径读取 wiki 页面，或回退到共享内存语料库
- `wiki_apply`：窄范围的综合/元数据变更，无需自由格式的页面修改
- `wiki_lint`：结构检查、来源缺口、矛盾、未解决问题

该插件还注册了一个非排他性内存语料库补充，因此当主动内存插件支持语料库选择时，共享的 `memory_search` 和 `memory_get` 可以访问 wiki。

## 提示词和上下文行为

当 `context.includeCompiledDigestPrompt` 启用时，内存提示词部分会从 `agent-digest.json` 附加一个紧凑的编译快照。

该快照刻意保持小巧和高信噪比：

- 仅顶级页面
- 仅顶级声明
- 矛盾数量
- 问题数量
- 置信度/新鲜度限定符

这是可选的，因为它会改变提示词形状，主要对显式消费内存补充的上下文引擎或遗留提示词组装有用。

## 配置

将配置放在 `plugins.entries.memory-wiki.config` 下：

```json5
{
  plugins: {
    entries: {
      "memory-wiki": {
        enabled: true,
        config: {
          vaultMode: "isolated",
          vault: {
            path: "~/.openclaw/wiki/main",
            renderMode: "obsidian",
          },
          obsidian: {
            enabled: true,
            useOfficialCli: true,
            vaultName: "OpenClaw Wiki",
            openAfterWrites: false,
          },
          bridge: {
            enabled: false,
            readMemoryArtifacts: true,
            indexDreamReports: true,
            indexDailyNotes: true,
            indexMemoryRoot: true,
            followMemoryEvents: true,
          },
          ingest: {
            autoCompile: true,
            maxConcurrentJobs: 1,
            allowUrlIngest: true,
          },
          search: {
            backend: "shared",
            corpus: "wiki",
          },
          context: {
            includeCompiledDigestPrompt: false,
          },
          render: {
            preserveHumanBlocks: true,
            createBacklinks: true,
            createDashboards: true,
          },
        },
      },
    },
  },
}
```

关键开关：

- `vaultMode`：`isolated`、`bridge`、`unsafe-local`
- `vault.renderMode`：`native` 或 `obsidian`
- `bridge.readMemoryArtifacts`：导入主动内存插件的公共工件
- `bridge.followMemoryEvents`：在桥接模式中包含事件日志
- `search.backend`：`shared` 或 `local`
- `search.corpus`：`wiki`、`memory` 或 `all`
- `context.includeCompiledDigestPrompt`：向内存提示词部分附加紧凑摘要快照
- `render.createBacklinks`：生成确定性相关块
- `render.createDashboards`：生成仪表板页面

### 示例：QMD + 桥接模式

当你希望 QMD 用于召回，`memory-wiki` 用于维护的知识层时，请使用此配置：

```json5
{
  memory: {
    backend: "qmd",
  },
  plugins: {
    entries: {
      "memory-wiki": {
        enabled: true,
        config: {
          vaultMode: "bridge",
          bridge: {
            enabled: true,
            readMemoryArtifacts: true,
            indexDreamReports: true,
            indexDailyNotes: true,
            indexMemoryRoot: true,
            followMemoryEvents: true,
          },
          search: {
            backend: "shared",
            corpus: "all",
          },
          context: {
            includeCompiledDigestPrompt: false,
          },
        },
      },
    },
  },
}
```

这样保持：

- QMD 负责主动内存召回
- `memory-wiki` 专注于编译页面和仪表板
- 提示词形状不变，直到你有意启用编译摘要提示词

## CLI

`memory-wiki` 还暴露了顶级 CLI 接口：

```bash
openclaw wiki status
openclaw wiki doctor
openclaw wiki init
openclaw wiki ingest ./notes/alpha.md
openclaw wiki compile
openclaw wiki lint
openclaw wiki search "alpha"
openclaw wiki get entity.alpha
openclaw wiki apply synthesis "Alpha Summary" --body "..." --source-id source.alpha
openclaw wiki bridge import
openclaw wiki obsidian status
```

完整命令参考请参见 [CLI: wiki](/cli/wiki)。

## Obsidian 支持

当 `vault.renderMode` 为 `obsidian` 时，插件会写入 Obsidian 友好的 Markdown，并可以选择使用官方 `obsidian` CLI。

支持的工作流包括：

- 状态探测
- 知识库搜索
- 打开页面
- 调用 Obsidian 命令
- 跳转到每日笔记

这是可选的。wiki 在原生模式下无需 Obsidian 也能正常工作。

## 推荐工作流

1. 保留主动内存插件用于召回/提升/做梦。
2. 启用 `memory-wiki`。
3. 除非明确需要桥接模式，否则从 `isolated` 模式开始。
4. 当来源追溯重要时，使用 `wiki_search` / `wiki_get`。
5. 使用 `wiki_apply` 进行窄范围综合或元数据更新。
6. 在有意义的更改后运行 `wiki_lint`。
7. 如果需要陈旧/矛盾可见性，请开启仪表板。

## 相关文档

- [内存概览](/concepts/memory)
- [CLI: memory](/cli/memory)
- [CLI: wiki](/cli/wiki)
- [插件 SDK 概览](/plugins/sdk-overview)
