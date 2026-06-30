---
summary: "OpenClaw 如何跨会话记住内容"
title: "记忆概述"
read_when:
  - 你想了解记忆如何工作
  - 你想知道应该写什么记忆文件
---

OpenClaw 通过在智能体工作区写入**纯 Markdown 文件**来记住内容。模型只"记住"保存到磁盘的内容 -- 没有隐藏状态。

## 工作原理

你的智能体有三个与记忆相关的文件：

- **`MEMORY.md`** — 长期记忆。持久的事实、偏好和决策。在每个私信会话开始时加载。
- **`memory/YYYY-MM-DD.md`** — 每日笔记。运行上下文和观察。今天和昨天的笔记会自动加载。
- **`DREAMS.md`**（可选）— 梦境日记和做梦扫描摘要，供人工审查，包括有根据的历史回填条目。

这些文件存在于智能体工作区（默认 `~/.openclaw/workspace`）中。

<Tip>
如果你想让智能体记住某些内容，只需问它："记住我更喜欢 TypeScript。"它会将其写入适当的文件。
</Tip>

## 推断的承诺

一些未来的跟进不是持久的事实。如果你提到明天有面试，有用的记忆可能是"面试后检查一下"，而不是"永久存储在 `MEMORY.md` 中"。

[承诺](/concepts/commitments)是针对该情况的选择加入的短期跟进记忆。OpenClaw 在隐藏的后台传递中推断它们，将它们限定在同一智能体和频道，并通过心跳交付到期的检查。明确的提醒仍然使用[计划任务](/automation/cron-jobs)。

## 记忆工具

智能体有两个用于处理记忆的工具：

- **`memory_search`** — 使用语义搜索找到相关笔记，即使措辞与原文不同。
- **`memory_get`** — 读取特定的记忆文件或行范围。

两个工具都由活跃的记忆插件提供（默认：`memory-core`）。

## 记忆 Wiki 伴侣插件

如果你想让持久记忆表现得更像一个维护的知识库，而不是原始笔记，使用捆绑的 `memory-wiki` 插件。

`memory-wiki` 将持久知识编译成一个具有以下特性的 wiki 保险库：

- 确定性页面结构
- 结构化声明和证据
- 矛盾和新鲜度追踪
- 生成的仪表板
- 为智能体/运行时消费者编译的摘要
- wiki 原生工具，如 `wiki_search`、`wiki_get`、`wiki_apply` 和 `wiki_lint`

它不替代主动记忆插件。主动记忆插件仍然拥有召回、提升和做梦。`memory-wiki` 在其旁边添加了一个丰富来源的知识层。

参见[记忆 Wiki](/plugins/memory-wiki)。

## 记忆搜索

当配置了嵌入提供商时，`memory_search` 使用**混合搜索** — 结合向量相似性（语义含义）和关键字匹配（精确词条如 ID 和代码符号）。一旦你拥有任何受支持提供商的 API 密钥，这就会立即生效。

<Info>
OpenClaw 从可用的 API 密钥自动检测你的嵌入提供商。如果你配置了 OpenAI、Gemini、Voyage 或 Mistral 密钥，记忆搜索会自动启用。
</Info>

有关搜索工作原理、调整选项和提供商设置的详细信息，参见[记忆搜索](/concepts/memory-search)。

## 记忆后端

<CardGroup cols={3}>
<Card title="内置（默认）" icon="database" href="/concepts/memory-builtin">
基于 SQLite。开箱即用，支持关键字搜索、向量相似性和混合搜索。无需额外依赖。
</Card>
<Card title="QMD" icon="search" href="/concepts/memory-qmd">
本地优先辅助进程，具有重排序、查询扩展，以及索引工作区外目录的能力。
</Card>
<Card title="Honcho" icon="brain" href="/concepts/memory-honcho">
AI 原生跨会话记忆，具有用户建模、语义搜索和多智能体感知。需要插件安装。
</Card>
<Card title="LanceDB" icon="layers" href="/plugins/memory-lancedb">
捆绑的基于 LanceDB 的记忆，具有 OpenAI 兼容嵌入、自动召回、自动捕获和本地 Ollama 嵌入支持。
</Card>
</CardGroup>

## 知识 Wiki 层

<CardGroup cols={1}>
<Card title="记忆 Wiki" icon="book" href="/plugins/memory-wiki">
将持久记忆编译成具有声明、仪表板、桥接模式和 Obsidian 友好工作流的丰富来源 wiki 保险库。
</Card>
</CardGroup>

## 自动记忆刷新

在[压缩](/concepts/compaction)摘要你的对话之前，OpenClaw 运行一个静默轮次，提醒智能体将重要上下文保存到记忆文件。这是默认开启的 -- 你不需要配置任何内容。

要将该整理轮次保留在本地模型上，设置精确的记忆刷新模型覆盖：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "memoryFlush": {
          "model": "ollama/qwen3:8b"
        }
      }
    }
  }
}
```

该覆盖仅应用于记忆刷新轮次，不继承活跃会话回退链。

<Tip>
记忆刷新防止压缩期间的上下文丢失。如果你的智能体在对话中有尚未写入文件的重要事实，它们将在摘要发生之前自动保存。
</Tip>

## 做梦

做梦是记忆的可选后台整合传递。它收集短期信号，对候选进行评分，并仅将合格的项目提升到长期记忆（`MEMORY.md`）。

它的设计是为了保持长期记忆的高质量信号：

- **选择加入**：默认禁用。
- **计划**：启用后，`memory-core` 自动管理一个用于完整做梦扫描的周期性 cron 任务。
- **阈值**：提升必须通过评分、召回频率和查询多样性门槛。
- **可审查**：阶段摘要和日记条目写入 `DREAMS.md` 供人工审查。

有关阶段行为、评分信号和梦境日记详情，参见[做梦](/concepts/dreaming)。

## 有根据的回填和实时提升

做梦系统现在有两个密切相关的审查通道：

- **实时做梦**从 `memory/.dreams/` 下的短期做梦存储工作，这是正常深度阶段在决定什么可以升入 `MEMORY.md` 时使用的。
- **有根据的回填**将历史 `memory/YYYY-MM-DD.md` 笔记作为独立的日文件读取，并将结构化审查输出写入 `DREAMS.md`。

当你想重放旧笔记并检查系统认为是持久的内容而无需手动编辑 `MEMORY.md` 时，有根据的回填很有用。

当你使用：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

有根据的持久候选不会直接提升。它们被暂存到正常深度阶段已经使用的相同短期做梦存储中。这意味着：

- `DREAMS.md` 保持人工审查界面。
- 短期存储保持机器面向的排名界面。
- `MEMORY.md` 仍然只由深度提升写入。

如果你决定重放没有用，你可以删除暂存的产物，而不会触碰普通日记条目或正常召回状态：

```bash
openclaw memory rem-backfill --rollback
openclaw memory rem-backfill --rollback-short-term
```

## CLI

```bash
openclaw memory status          # 检查索引状态和提供商
openclaw memory search "query"  # 从命令行搜索
openclaw memory index --force   # 重建索引
```

## 延伸阅读

- [内置记忆引擎](/concepts/memory-builtin)：默认 SQLite 后端。
- [QMD 记忆引擎](/concepts/memory-qmd)：高级本地优先辅助进程。
- [Honcho 记忆](/concepts/memory-honcho)：AI 原生跨会话记忆。
- [记忆 LanceDB](/plugins/memory-lancedb)：具有 OpenAI 兼容嵌入的 LanceDB 支持插件。
- [记忆 Wiki](/plugins/memory-wiki)：编译的知识保险库和 wiki 原生工具。
- [记忆搜索](/concepts/memory-search)：搜索管道、提供商和调整。
- [做梦](/concepts/dreaming)：从短期召回到长期记忆的后台提升。
- [记忆配置参考](/reference/memory-config)：所有配置项。
- [压缩](/concepts/compaction)：压缩如何与记忆交互。

## 相关

- [主动记忆](/concepts/active-memory)
- [记忆搜索](/concepts/memory-search)
- [内置记忆引擎](/concepts/memory-builtin)
- [Honcho 记忆](/concepts/memory-honcho)
- [记忆 LanceDB](/plugins/memory-lancedb)
- [承诺](/concepts/commitments)
