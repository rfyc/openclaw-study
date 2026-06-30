---
summary: "OpenClaw 中实验性标志的含义以及当前已记录的标志"
title: "实验性功能"
read_when:
  - 你看到 `.experimental` 配置键，想知道它是否稳定
  - 你想尝试预览运行时功能，但不想与普通默认值混淆
  - 你想在一个地方找到当前已记录的实验性标志
---

OpenClaw 中的实验性功能是**选择加入的预览接口**。它们隐藏在显式标志之后，因为它们仍然需要真实的使用里程，然后才值得拥有稳定的默认值或长期的公共合同。

将其与普通配置区别对待：

- 除非相关文档告诉你尝试某个，否则**默认保持关闭**。
- 预期**形状和行为比稳定配置变化更快**。
- 如果稳定路径已经存在，优先使用稳定路径。
- 如果你正在广泛推出 OpenClaw，在将实验性标志纳入共享基线之前，先在较小的环境中测试它们。

## 当前已记录的标志

| 接口           | 键                                                        | 使用时机                                                                      | 更多                                                                        |
| -------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 本地模型运行时 | `agents.defaults.experimental.localModelLean`             | 较小或更严格的本地后端无法处理 OpenClaw 的完整默认工具接口                    | [本地模型](/gateway/local-models)                                           |
| 记忆搜索       | `agents.defaults.memorySearch.experimental.sessionMemory` | 你希望 `memory_search` 索引之前的会话记录，并接受额外的存储/索引成本          | [记忆配置参考](/reference/memory-config#session-memory-search-experimental) |
| 结构化计划工具 | `tools.experimental.planTool`                             | 你希望在兼容的运行时和 UI 中公开用于多步骤工作追踪的结构化 `update_plan` 工具 | [网关配置参考](/gateway/config-tools#toolsexperimental)                     |

## 本地模型精简模式

`agents.defaults.experimental.localModelLean: true` 是较弱本地模型设置的压力释放阀。启用后，OpenClaw 在每次轮次中从智能体的工具接口中删除三个默认工具——`browser`、`cron` 和 `message`。其他所有内容不变。

### 为什么是这三个工具

这三个工具在默认 OpenClaw 运行时中拥有最大的描述和最多的参数形式。在小上下文或更严格的 OpenAI 兼容后端上，这是以下差异：

- 工具模式干净地适合提示 vs. 挤压对话历史。
- 模型选择正确的工具 vs. 因为有太多外观相似的模式而发出格式错误的工具调用。
- Chat Completions 适配器保持在服务器结构化输出限制内 vs. 在工具调用有效载荷大小上触发 400 错误。

删除它们不会静默地重新连接 OpenClaw——它只是使工具列表更短。模型仍然有 `read`、`write`、`edit`、`exec`、`apply_patch`、网页搜索/获取（配置时）、记忆以及会话/智能体工具可用。

### 何时开启

当你已经证明模型可以与网关通信，但完整的智能体轮次表现不佳时，启用精简模式。典型的信号链是：

1. `openclaw infer model run --gateway --model <ref> --prompt "Reply with exactly: pong"` 成功。
2. 普通智能体轮次因格式错误的工具调用、过大的提示或模型忽略其工具而失败。
3. 切换 `localModelLean: true` 消除了失败。

### 何时保持关闭

如果你的后端干净地处理完整的默认运行时，保持关闭。精简模式是变通方法，不是默认值。它的存在是因为一些本地堆栈需要更小的工具接口才能正常运行；托管模型和资源充足的本地设备不需要。

精简模式也不能替代 `tools.profile`、`tools.allow`/`tools.deny` 或模型 `compat.supportsTools: false` 逃生舱。如果你需要特定智能体的永久较窄工具接口，优先使用这些稳定旋钮而不是实验性标志。

### 启用

```json5
{
  agents: {
    defaults: {
      experimental: {
        localModelLean: true,
      },
    },
  },
}
```

更改标志后重启网关，然后确认截短的工具列表：

```bash
openclaw status --deep
```

深度状态输出列出活跃的智能体工具；当精简模式开启时，`browser`、`cron` 和 `message` 应该不存在。

## 实验性不意味着隐藏

如果一个功能是实验性的，OpenClaw 应该在文档和配置路径本身中明确说明。它**不**应该做的是将预览行为偷偷放入看起来稳定的默认旋钮，并假装这是正常的。这就是配置接口变得混乱的方式。

## 相关

- [功能](/concepts/features)
- [发布渠道](/install/development-channels)
