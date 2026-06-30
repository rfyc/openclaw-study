---
summary: "进度草稿：在智能体运行时更新的一条可见的进行中消息"
read_when:
  - 为长时间运行的聊天轮次配置可见的进度更新
  - 在局部、块和进度流式传输模式之间做选择
  - 解释 OpenClaw 如何在工作进行时更新一条频道消息
  - 排查进度草稿、独立进度消息或最终化回退问题
title: "进度草稿"
---

进度草稿让长时间运行的智能体轮次在聊天中感觉是活跃的，而不会将对话变成一堆临时的状态回复。

当启用进度草稿时，OpenClaw 只有在轮次证明它在做真正的工作之后才创建一条可见的进行中消息，在智能体读取、计划、调用工具或等待审批时更新它，然后在频道可以安全地做到这一点时将该草稿变成最终答案。

```text
Shelling...
📖 Read: from docs/concepts/progress-drafts.md
🔎 Web Search: for "discord edit message"
🛠️ Exec: run tests
```

当你想要在工具密集型工作期间有一条整洁的状态消息，以及在轮次完成后有最终答案时，使用进度草稿。

## 快速入门

使用 `streaming.mode: "progress"` 按频道启用进度草稿：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
      },
    },
  },
}
```

这通常就足够了。OpenClaw 会选择一个自动的单词标签，等待工作至少持续五秒钟或发出第二个工作事件，在有用的工作发生时添加紧凑的进度行，并为该轮次抑制重复的独立进度聊天。

## 用户看到的内容

进度草稿有两个部分：

| 部分   | 目的                                               |
| ------ | -------------------------------------------------- |
| 标签   | 短标题，如 `Thinking...` 或 `Shelling...`。        |
| 进度行 | 使用与详细输出相同的工具标签和图标的紧凑运行更新。 |

在智能体开始有意义的工作并且要么持续忙碌五秒钟，要么发出第二个工作事件后，标签才出现。纯文本回复不显示进度草稿。进度行只在智能体发出有用的工作更新时添加，例如 `🛠️ Exec`、`🔎 Web Search` 或 `✍️ Write: to /tmp/file`。默认情况下它们使用与 `/verbose` 相同的紧凑解释模式；在调试且你还想追加原始命令/详情时，设置 `agents.defaults.toolProgressDetail: "raw"`。最终答案在可能的情况下替换草稿；否则 OpenClaw 正常发送最终答案，并根据频道的传输清理或停止更新草稿。

## 选择模式

`channels.<channel>.streaming.mode` 控制可见的进行中行为：

| 模式       | 最适合                     | 聊天中出现的内容               |
| ---------- | -------------------------- | ------------------------------ |
| `off`      | 安静的频道                 | 只有最终答案。                 |
| `partial`  | 观察答案文本出现           | 一个以最新答案文本编辑的草稿。 |
| `block`    | 更大的答案预览块           | 一个以更大块更新或追加的预览。 |
| `progress` | 工具密集或长时间运行的轮次 | 一个状态草稿，然后是最终答案。 |

当用户更关心"正在发生什么"而不是观察答案文本逐令牌流式传输时，选择 `progress`。

当答案本身就是进度信号时，选择 `partial`。

当你想要在更大文本块中进行草稿预览更新时，选择 `block`。在 Discord 和 Telegram 上，`streaming.mode: "block"` 仍然是预览流式传输，而不是正常的块投递。当你想要正常的块回复时，使用 `streaming.block.enabled` 或遗留的 `blockStreaming`。

## 配置标签

进度标签位于 `channels.<channel>.streaming.progress` 下。

默认标签是 `auto`，从 OpenClaw 的内置单词带省略号标签池中选择：

```text
Thinking...
Shelling...
Scuttling...
Clawing...
Pinching...
Molting...
Bubbling...
Tiding...
Reefing...
Cracking...
Sifting...
Brining...
Nautiling...
Krilling...
Barnacling...
Lobstering...
Tidepooling...
Pearling...
Snapping...
Surfacing...
```

使用固定标签：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "Investigating",
        },
      },
    },
  },
}
```

使用你自己的自动标签池：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto",
          labels: ["Checking", "Reading", "Testing", "Finishing"],
        },
      },
    },
  },
}
```

隐藏标签，只显示进度行：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: false,
        },
      },
    },
  },
}
```

## 控制进度行

进度行在进度模式下默认启用。它们来自真实的运行事件：工具开始、项目更新、任务计划、审批、命令输出、补丁摘要以及类似的智能体活动。

OpenClaw 对进度草稿和 `/verbose` 使用相同的格式化器：

```json5
{
  agents: {
    defaults: {
      toolProgressDetail: "explain", // explain | raw
    },
  },
}
```

`"explain"` 是默认值，并保持草稿稳定，带有简洁的标签，如 `🛠️ Exec: check JS syntax for /tmp/app.js`。`"raw"` 在可用时追加底层命令/详情，这在调试时很有用，但在聊天中更嘈杂。

例如，相同的命令根据详细模式显示不同：

| 模式      | 进度行                                                               |
| --------- | -------------------------------------------------------------------- |
| `explain` | `🛠️ Exec: check JS syntax for /tmp/app.js`                           |
| `raw`     | `🛠️ Exec: check JS syntax for /tmp/app.js, node --check /tmp/app.js` |

限制保持可见的行数：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          maxLines: 4,
        },
      },
    },
  },
}
```

进度行会自动压缩，以减少草稿编辑时的聊天气泡重排。

OpenClaw 默认截断长进度行，以便重复的草稿编辑不会在每次更新时以不同方式换行。前缀保持可读，长的详情（如路径或原始命令）用省略号缩短。

Slack 可以将进度行渲染为结构化的 Block Kit 字段，而不是单个文本体：

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "progress",
        progress: {
          render: "rich",
        },
      },
    },
  },
}
```

富渲染保持相同的纯文本回退，以便不支持更丰富形状的频道和客户端仍然可以显示紧凑的进度文本。

保留单个进度草稿但隐藏工具和任务行：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          toolProgress: false,
        },
      },
    },
  },
}
```

使用 `toolProgress: false`，OpenClaw 仍然为该轮次抑制旧的独立工具进度消息。频道在最终答案之前保持视觉安静，除非配置了标签。

## 频道行为

每个频道使用它支持的最干净的传输：

| 频道            | 进度传输                    | 注意                                             |
| --------------- | --------------------------- | ------------------------------------------------ |
| Discord         | 发送一条消息，然后编辑它。  | 当最终文本适合一条安全预览消息时，在原位编辑。   |
| Matrix          | 发送一个事件，然后编辑它。  | 账户级流式传输配置控制账户级草稿。               |
| Microsoft Teams | 个人聊天中的原生 Teams 流。 | `streaming.mode: "block"` 映射到 Teams 块投递。  |
| Slack           | 原生流或可编辑草稿帖子。    | 线程可用性影响是否可以使用原生流式传输。         |
| Telegram        | 发送一条消息，然后编辑它。  | 旧的可见草稿可能被替换，以便最终时间戳保持有用。 |
| Mattermost      | 可编辑草稿帖子。            | 工具活动折叠到相同的草稿式帖子中。               |

没有安全编辑支持的频道通常回退到输入指示器或仅最终投递。

## 最终化

当最终答案准备好时，OpenClaw 尝试保持聊天干净：

- 如果草稿可以安全地成为最终答案，OpenClaw 在原位编辑它。
- 如果频道使用原生进度流式传输，当原生传输接受最终文本时，OpenClaw 最终化该流。
- 如果最终答案有媒体、审批提示、显式回复目标、太多块或编辑/发送失败，OpenClaw 通过正常频道投递路径发送最终答案。

回退路径是有意的。发送新的最终答案比丢失文本、错误线程化回复或用频道无法安全表示的有效载荷覆盖草稿要好。

## 故障排除

**我只看到最终答案。**

检查 `channels.<channel>.streaming.mode` 是否为处理消息的账户或频道设置为 `progress`。当频道无法安全编辑正确的消息时，某些群组或引用回复路径可能会为轮次禁用草稿预览。

**我看到标签但没有工具行。**

检查 `streaming.progress.toolProgress`。如果它是 `false`，OpenClaw 保持单个草稿行为，但隐藏工具和任务进度行。

**我看到新的最终消息而不是编辑的草稿。**

这是安全回退。它可能发生在媒体回复、长答案、显式回复目标、旧的 Telegram 草稿、缺少的 Slack 线程目标、删除的预览消息或失败的原生流最终化时。

**我仍然看到独立的进度消息。**

进度模式在草稿活跃时抑制默认的独立工具进度消息。如果独立消息仍然出现，请验证该轮次是否实际上使用进度模式，而不是 `streaming.mode: "off"` 或无法为该消息创建草稿的频道路径。

**Teams 与 Discord 或 Telegram 的行为不同。**

Microsoft Teams 在个人聊天中使用原生流，而不是通用的发送并编辑预览传输。Teams 还将 `streaming.mode: "block"` 视为 Teams 块投递，因为它没有 Discord 和 Telegram 使用的相同草稿预览块模式。

## 相关

- [流式传输和分块](/concepts/streaming)
- [消息](/concepts/messages)
- [频道配置](/gateway/config-channels)
- [Discord](/channels/discord)
- [Matrix](/channels/matrix)
- [Microsoft Teams](/channels/msteams)
- [Slack](/channels/slack)
- [Telegram](/channels/telegram)
