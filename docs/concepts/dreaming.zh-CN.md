---
summary: "后台记忆整合，包含轻度、深度和 REM 阶段，以及梦境日记"
title: "做梦"
sidebarTitle: "做梦"
read_when:
  - 你想让记忆提升自动运行
  - 你想了解每个做梦阶段的作用
  - 你想调整整合而不污染 MEMORY.md
---

做梦是 `memory-core` 中的后台记忆整合系统。它帮助 OpenClaw 将强烈的短期信号转移到持久记忆中，同时保持过程可解释和可审查。

<Note>
做梦功能是**选择加入**的，默认禁用。
</Note>

## 做梦写入的内容

做梦保留两种输出：

- `memory/.dreams/` 中的**机器状态**（召回存储、阶段信号、摄取检查点、锁）。
- `DREAMS.md`（或现有的 `dreams.md`）和 `memory/dreaming/<phase>/YYYY-MM-DD.md` 下的可选阶段报告文件中的**人类可读输出**。

长期提升仍然只写入 `MEMORY.md`。

## 阶段模型

做梦使用三个协作阶段：

| 阶段 | 用途                     | 持久写入          |
| ---- | ------------------------ | ----------------- |
| 轻度 | 排序和暂存近期短期材料   | 否                |
| 深度 | 评分和提升持久候选项     | 是（`MEMORY.md`） |
| REM  | 反思主题和反复出现的想法 | 否                |

这些阶段是内部实现细节，不是用户可以单独配置的"模式"。

<AccordionGroup>
  <Accordion title="轻度阶段">
    轻度阶段摄取近期每日记忆信号和召回追踪，去重，并暂存候选行。

    - 从短期召回状态、近期每日记忆文件和可用时的已编辑会话记录中读取。
    - 当存储包括内联输出时，写入一个托管的 `## Light Sleep` 块。
    - 记录强化信号供后续深度排名使用。
    - 从不写入 `MEMORY.md`。

  </Accordion>
  <Accordion title="深度阶段">
    深度阶段决定什么成为长期记忆。

    - 使用加权评分和阈值门控对候选项进行排名。
    - 需要通过 `minScore`、`minRecallCount` 和 `minUniqueQueries`。
    - 在写入之前从实时每日文件重新水化片段，因此跳过过时/已删除的片段。
    - 将提升的条目附加到 `MEMORY.md`。
    - 将 `## Deep Sleep` 摘要写入 `DREAMS.md`，并可选地写入 `memory/dreaming/deep/YYYY-MM-DD.md`。

  </Accordion>
  <Accordion title="REM 阶段">
    REM 阶段提取模式和反思信号。

    - 从近期短期追踪中构建主题和反思摘要。
    - 当存储包括内联输出时，写入一个托管的 `## REM Sleep` 块。
    - 记录深度排名使用的 REM 强化信号。
    - 从不写入 `MEMORY.md`。

  </Accordion>
</AccordionGroup>

## 会话记录摄取

做梦可以将已编辑的会话记录摄取到做梦语料库中。当记录可用时，它们与每日记忆信号和召回追踪一起被送入轻度阶段。个人和敏感内容在摄取之前被编辑。

## 梦境日记

做梦还在 `DREAMS.md` 中保留一个叙事性**梦境日记**。在每个阶段积累足够的材料后，`memory-core` 运行一个尽力而为的后台子智能体轮次，并附加一个简短的日记条目。它使用默认运行时模型，除非配置了 `dreaming.model`。如果配置的模型不可用，梦境日记使用会话默认模型重试一次。

<Note>
该日记供人类在 Dreams UI 中阅读，不是提升来源。做梦生成的日记/报告产物被排除在短期提升之外。只有有根据的记忆片段有资格提升到 `MEMORY.md`。
</Note>

还有一个有根据的历史回填通道，用于审查和恢复工作：

<AccordionGroup>
  <Accordion title="回填命令">
    - `memory rem-harness --path ... --grounded` 预览来自历史 `YYYY-MM-DD.md` 笔记的有根据的日记输出。
    - `memory rem-backfill --path ...` 将可逆的有根据的日记条目写入 `DREAMS.md`。
    - `memory rem-backfill --path ... --stage-short-term` 将有根据的持久候选项暂存到正常深度阶段已经使用的相同短期证据存储中。
    - `memory rem-backfill --rollback` 和 `--rollback-short-term` 删除这些暂存的回填产物，而不触及普通日记条目或实时短期召回。

  </Accordion>
</AccordionGroup>

Control UI 公开了相同的日记回填/重置流程，因此你可以在决定是否让有根据的候选项值得提升之前在 Dreams 场景中检查结果。该场景还显示一个独特的有根据通道，这样你可以看到哪些暂存的短期条目来自历史重播、哪些提升的项目是有根据领导的，以及只清除有根据的暂存条目而不触及普通实时短期状态。

## 深度排名信号

深度排名使用六个加权基础信号加上阶段强化：

| 信号       | 权重 | 描述                          |
| ---------- | ---- | ----------------------------- |
| 频率       | 0.24 | 条目积累了多少短期信号        |
| 相关性     | 0.30 | 条目的平均检索质量            |
| 查询多样性 | 0.15 | 浮现该条目的不同查询/天上下文 |
| 新近性     | 0.15 | 时间衰减的新鲜度评分          |
| 整合度     | 0.10 | 多日重现强度                  |
| 概念丰富度 | 0.06 | 来自片段/路径的概念标签密度   |

轻度和 REM 阶段命中从 `memory/.dreams/phase-signals.json` 添加一个小的时间衰减提升。

## 调度

启用时，`memory-core` 自动管理一个完整做梦扫描的 cron 任务。每次扫描按顺序运行阶段：轻度 → REM → 深度。

扫描包括主运行时工作区和任何配置的智能体工作区，按路径去重，这样子智能体工作区扇出就不会排除主智能体的 `DREAMS.md` 和记忆状态。

默认节奏行为：

| 设置                 | 默认值      |
| -------------------- | ----------- |
| `dreaming.frequency` | `0 3 * * *` |
| `dreaming.model`     | 默认模型    |

## 快速开始

<Tabs>
  <Tab title="启用做梦">
    ```json
    {
      "plugins": {
        "entries": {
          "memory-core": {
            "config": {
              "dreaming": {
                "enabled": true
              }
            }
          }
        }
      }
    }
    ```
  </Tab>
  <Tab title="自定义扫描节奏">
    ```json
    {
      "plugins": {
        "entries": {
          "memory-core": {
            "config": {
              "dreaming": {
                "enabled": true,
                "timezone": "America/Los_Angeles",
                "frequency": "0 */6 * * *"
              }
            }
          }
        }
      }
    }
    ```
  </Tab>
</Tabs>

## 斜线命令

```
/dreaming status
/dreaming on
/dreaming off
/dreaming help
```

## CLI 工作流

<Tabs>
  <Tab title="提升预览 / 应用">
    ```bash
    openclaw memory promote
    openclaw memory promote --apply
    openclaw memory promote --limit 5
    openclaw memory status --deep
    ```

    手动 `memory promote` 默认使用深度阶段阈值，除非用 CLI 标志覆盖。

  </Tab>
  <Tab title="解释提升">
    解释特定候选项为什么会或不会提升：

    ```bash
    openclaw memory promote-explain "router vlan"
    openclaw memory promote-explain "router vlan" --json
    ```

  </Tab>
  <Tab title="REM 测试工具预览">
    预览 REM 反思、候选真相和深度提升输出，不写入任何内容：

    ```bash
    openclaw memory rem-harness
    openclaw memory rem-harness --json
    ```

  </Tab>
</Tabs>

## 关键默认值

所有设置都在 `plugins.entries.memory-core.config.dreaming` 下。

<ParamField path="enabled" type="boolean" default="false">
  启用或禁用做梦扫描。
</ParamField>
<ParamField path="frequency" type="string" default="0 3 * * *">
  完整做梦扫描的 Cron 节奏。
</ParamField>
<ParamField path="model" type="string">
  可选的梦境日记子智能体模型覆盖。在同时设置子智能体 `allowedModels` 白名单时，使用规范的 `provider/model` 值。
</ParamField>

<Warning>
`dreaming.model` 需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`。要限制它，还要设置 `plugins.entries.memory-core.subagent.allowedModels`。信任或白名单失败保持可见，而不是静默回退；重试只覆盖模型不可用错误。
</Warning>

<Note>
阶段策略、阈值和存储行为是内部实现细节（不是用户可见的配置）。参见[记忆配置参考](/reference/memory-config#dreaming)了解完整键列表。
</Note>

## Dreams UI

启用后，网关 **Dreams** 标签页显示：

- 当前做梦启用状态
- 阶段级状态和托管扫描存在
- 短期、有根据、信号和今天提升的计数
- 下次计划运行时间
- 暂存历史重播条目的独特有根据场景通道
- 由 `doctor.memory.dreamDiary` 支持的可展开梦境日记阅读器

## 做梦从不运行：状态显示为阻塞

如果 `openclaw memory status` 报告 `Dreaming status: blocked`，托管 cron 存在但默认智能体心跳没有触发。检查心跳是否为默认智能体启用，以及其目标是否不是 `none`，然后在下一个心跳间隔后再次运行 `openclaw memory status --deep`。

## 相关

- [记忆](/concepts/memory)
- [记忆 CLI](/cli/memory)
- [记忆配置参考](/reference/memory-config)
- [记忆搜索](/concepts/memory-search)
