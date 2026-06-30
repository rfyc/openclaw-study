---
summary: "OpenClaw 如何压缩长对话以保持在模型限制内"
read_when:
  - 你想了解自动压缩和 /compact
  - 你正在调试触及上下文限制的长会话
title: "压缩"
---

每个模型都有一个上下文窗口：它可以处理的最大令牌数。当对话接近该限制时，OpenClaw 会将较旧的消息**压缩**成摘要，以便聊天可以继续。

## 工作原理

1. 旧的对话轮次被压缩成一个紧凑的条目。
2. 摘要保存在会话记录中。
3. 最近的消息保持完整。

当 OpenClaw 将历史分割成压缩块时，它保持助手工具调用与对应的 `toolResult` 条目配对。如果分割点落在工具块内，OpenClaw 移动边界使这对保持在一起，并保留当前未压缩的尾部。

完整的对话历史保留在磁盘上。压缩只改变模型在下一轮次看到的内容。

## 自动压缩

自动压缩默认开启。当会话接近上下文限制时运行，或者当模型返回上下文溢出错误时（此时 OpenClaw 压缩并重试）。

你会看到：

- 在详细模式下显示 `🧹 Auto-compaction complete`。
- `/status` 显示 `🧹 Compactions: <count>`。

<Info>
在压缩之前，OpenClaw 会自动提醒智能体将重要笔记保存到[记忆](/concepts/memory)文件中。这可以防止上下文丢失。
</Info>

<AccordionGroup>
  <Accordion title="已识别的溢出特征">
    OpenClaw 从以下提供商错误模式中检测上下文溢出：

    - `request_too_large`
    - `context length exceeded`
    - `input exceeds the maximum number of tokens`
    - `input token count exceeds the maximum number of input tokens`
    - `input is too long for the model`
    - `ollama error: context length exceeded`

  </Accordion>
</AccordionGroup>

## 手动压缩

在任何聊天中输入 `/compact` 以强制压缩。添加指令来引导摘要：

```
/compact Focus on the API design decisions
```

当设置了 `agents.defaults.compaction.keepRecentTokens` 时，手动压缩会遵守该 Pi 截点并在重建的上下文中保留最近的尾部。没有显式保留预算时，手动压缩作为硬检查点，仅从新摘要继续。

## 配置

在 `openclaw.json` 中的 `agents.defaults.compaction` 下配置压缩。下面列出了最常用的旋钮；完整参考参见[会话管理深入探讨](/reference/session-management-compaction)。

### 使用不同的模型

默认情况下，压缩使用智能体的主模型。设置 `agents.defaults.compaction.model` 将摘要委托给更强大或更专业的模型。该覆盖接受任何 `provider/model-id` 字符串：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "openrouter/anthropic/claude-sonnet-4-6"
      }
    }
  }
}
```

这也适用于本地模型，例如专用于摘要的第二个 Ollama 模型：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "ollama/llama3.1:8b"
      }
    }
  }
}
```

未设置时，压缩从活跃会话模型开始。如果摘要因符合模型回退条件的提供商错误而失败，OpenClaw 通过会话现有的模型回退链重试该压缩尝试。回退选择是临时的，不会写回会话状态。显式的 `agents.defaults.compaction.model` 覆盖保持精确，不继承会话回退链。

### 标识符保留

压缩摘要默认保留不透明标识符（`identifierPolicy: "strict"`）。使用 `identifierPolicy: "off"` 禁用，或使用 `identifierPolicy: "custom"` 加 `identifierInstructions` 提供自定义指导。

### 活跃记录字节守卫

当设置了 `agents.defaults.compaction.maxActiveTranscriptBytes` 时，如果活跃 JSONL 达到该大小，OpenClaw 在运行之前触发正常的本地压缩。这对于提供商端上下文管理可能保持模型上下文健康但本地记录持续增长的长期运行会话很有用。它不分割原始 JSONL 字节；它要求正常的压缩管道创建语义摘要。

<Warning>
字节守卫需要 `truncateAfterCompaction: true`。如果没有记录轮换，活跃文件不会缩小，守卫保持不活跃。
</Warning>

### 后继记录

当启用 `agents.defaults.compaction.truncateAfterCompaction` 时，OpenClaw 不会就地重写现有记录。它从压缩摘要、保留的状态和未压缩的尾部创建一个新的活跃后继记录，然后将之前的 JSONL 保留为存档检查点源。后继记录还会删除在短重试窗口内到达的完全相同的长用户轮次，这样频道重试风暴就不会在压缩后被带入下一个活跃记录。

只要预压缩检查点保持在 OpenClaw 的检查点大小上限以下，就会保留它们；过大的活跃记录仍然会压缩，但 OpenClaw 会跳过大型调试快照，而不是使磁盘使用量翻倍。

### 压缩通知

默认情况下，压缩静默运行。设置 `notifyUser` 以在压缩开始和完成时显示简短状态消息：

```json5
{
  agents: {
    defaults: {
      compaction: {
        notifyUser: true,
      },
    },
  },
}
```

### 记忆刷新

在压缩之前，OpenClaw 可以运行**静默记忆刷新**轮次，将持久笔记存储到磁盘。当此清理轮次应使用本地模型而不是活跃对话模型时，设置 `agents.defaults.compaction.memoryFlush.model`：

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

记忆刷新模型覆盖是精确的，不继承活跃会话回退链。详情和配置参见[记忆](/concepts/memory)。

## 可插拔压缩提供商

插件可以通过插件 API 上的 `registerCompactionProvider()` 注册自定义压缩提供商。当提供商注册并配置后，OpenClaw 将摘要委托给它，而不是内置的 LLM 管道。

要使用注册的提供商，在配置中设置其 id：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "provider": "my-provider"
      }
    }
  }
}
```

设置 `provider` 会自动强制 `mode: "safeguard"`。提供商接收与内置路径相同的压缩指令和标识符保留策略，OpenClaw 在提供商输出后仍然保留最近轮次和分割轮次后缀上下文。

<Note>
如果提供商失败或返回空结果，OpenClaw 会回退到内置的 LLM 摘要。
</Note>

## 压缩 vs 修剪

|              | 压缩               | 修剪                     |
| ------------ | ------------------ | ------------------------ |
| **做什么**   | 压缩旧的对话       | 修剪旧的工具结果         |
| **已保存？** | 是（在会话记录中） | 否（仅内存中，每次请求） |
| **范围**     | 整个对话           | 仅工具结果               |

[会话修剪](/concepts/session-pruning)是一个更轻量级的补充，修剪工具输出而不进行摘要。

## 故障排除

**压缩太频繁？** 模型的上下文窗口可能较小，或工具输出可能较大。尝试启用[会话修剪](/concepts/session-pruning)。

**压缩后上下文感觉过时？** 使用 `/compact Focus on <topic>` 来引导摘要，或启用[记忆刷新](/concepts/memory)，以便笔记能存活下来。

**需要全新开始？** `/new` 启动一个新会话，不进行压缩。

关于高级配置（预留令牌、标识符保留、自定义上下文引擎、OpenAI 服务器端压缩），参见[会话管理深入探讨](/reference/session-management-compaction)。

## 相关

- [会话](/concepts/session)：会话管理和生命周期。
- [会话修剪](/concepts/session-pruning)：修剪工具结果。
- [上下文](/concepts/context)：如何为智能体轮次构建上下文。
- [钩子](/automation/hooks)：压缩生命周期钩子（`before_compaction`、`after_compaction`）。
