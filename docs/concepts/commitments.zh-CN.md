---
summary: "针对非精确提醒的推断式跟进记忆"
title: "推断式承诺"
sidebarTitle: "承诺"
read_when:
  - 你希望 OpenClaw 记住自然的跟进事项
  - 你想了解推断式签到与提醒的区别
  - 你想查看或忽略跟进承诺
---

承诺是短暂的跟进记忆。启用后，OpenClaw 可以注意到一次对话创建了一个未来的签到机会，并记住之后将其带回来。

示例：

- 你提到明天有面试。OpenClaw 可能之后签到询问结果。
- 你说你精疲力竭。OpenClaw 可能之后询问你是否睡好了。
- 智能体说某事改变后会跟进。OpenClaw 可能追踪这个未了结的环节。

承诺不是像 `MEMORY.md` 那样的持久事实，也不是精确的提醒。它们介于记忆和自动化之间：OpenClaw 记住了一个对话绑定的义务，然后在到期时通过心跳投递。

## 启用承诺

承诺默认关闭。在配置中启用：

```bash
openclaw config set commitments.enabled true
openclaw config set commitments.maxPerDay 3
```

等效的 `openclaw.json`：

```json
{
  "commitments": {
    "enabled": true,
    "maxPerDay": 3
  }
}
```

`commitments.maxPerDay` 限制每天每个智能体会话中可以投递多少个推断式跟进。默认值为 `3`。

## 工作原理

在智能体回复之后，OpenClaw 可能在单独的上下文中运行一个隐藏的后台提取过程。该过程只寻找推断式跟进承诺。它不写入可见对话，也不要求主智能体对提取进行推理。

当它找到高置信度的候选时，OpenClaw 存储一个带有以下信息的承诺：

- 智能体 id
- 会话键
- 原始频道和投递目标
- 到期时间窗口
- 简短的建议签到内容
- 供心跳决定是否发送的非指令性元数据

投递通过心跳进行。当承诺到期时，心跳将承诺添加到同一智能体和频道范围的心跳轮次中。模型可以发送一个自然的签到或回复 `HEARTBEAT_OK` 来忽略它。如果心跳配置了 `target: "none"`，到期的承诺保持内部状态，不发送外部签到。承诺投递提示不重放原始对话文本，到期承诺的心跳轮次在没有 OpenClaw 工具的情况下运行。

OpenClaw 从不在写入承诺后立即投递推断式承诺。到期时间至少被限制在承诺创建后一个心跳间隔之后，这样跟进就不会在推断出的同一时刻回显。

## 范围

承诺的范围限定在创建它们的确切智能体和频道上下文。在 Discord 上与一个智能体交谈时推断的跟进不会由另一个智能体、另一个频道或不相关的会话投递。

这个范围是功能的一部分。自然的签到应该感觉像是同一对话的继续，而不像全局提醒系统。

## 承诺 vs 提醒

| 需求                                     | 使用                              |
| ---------------------------------------- | --------------------------------- |
| "下午3点提醒我"                          | [计划任务](/automation/cron-jobs) |
| "20分钟后通知我"                         | [计划任务](/automation/cron-jobs) |
| "每个工作日运行这个报告"                 | [计划任务](/automation/cron-jobs) |
| "我明天有面试"                           | 承诺                              |
| "我熬了一整夜"                           | 承诺                              |
| "如果我没有回复这个未了结的线程，跟进我" | 承诺                              |

精确的用户请求已属于调度器路径。承诺只用于推断式跟进：用户没有要求提醒，但对话明显创建了一个有用的未来签到机会的时刻。

## 管理承诺

使用 CLI 检查和清除存储的承诺：

```bash
openclaw commitments
openclaw commitments --all
openclaw commitments --agent main
openclaw commitments --status snoozed
openclaw commitments dismiss cm_abc123
```

参见 [`openclaw commitments`](/cli/commitments) 了解命令参考。

## 隐私和成本

承诺提取使用 LLM 过程，因此启用它会在符合条件的轮次之后增加后台模型使用量。该过程对用户可见对话是隐藏的，但它可以读取决定是否存在跟进所需的近期交换内容。

存储的承诺是本地 OpenClaw 状态。它们是操作性记忆，不是长期记忆。通过以下方式禁用该功能：

```bash
openclaw config set commitments.enabled false
```

## 故障排除

如果预期的跟进没有出现：

- 确认 `commitments.enabled` 为 `true`。
- 检查 `openclaw commitments --all` 中是否有待处理、已忽略、已推迟或已过期的记录。
- 确保心跳正在为该智能体运行。
- 检查 `commitments.maxPerDay` 是否已经达到了该智能体会话的限制。
- 记住精确的提醒会被承诺提取跳过，应该出现在[计划任务](/automation/cron-jobs)下。

## 相关

- [记忆概述](/concepts/memory)
- [主动记忆](/concepts/active-memory)
- [心跳](/gateway/heartbeat)
- [计划任务](/automation/cron-jobs)
- [`openclaw commitments`](/cli/commitments)
- [配置参考](/gateway/configuration-reference#commitments)
