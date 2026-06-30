---
summary: "用可选的内置插件压缩嘈杂的 exec 和 bash 工具结果"
title: "Tokenjuice"
read_when:
  - 你想要 OpenClaw 中更短的 `exec` 或 `bash` 工具结果
  - 你想启用内置 tokenjuice 插件
  - 你需要了解 tokenjuice 更改了什么以及保留了什么原始内容
---

`tokenjuice` 是一个可选的内置插件，在命令运行后压缩嘈杂的 `exec` 和 `bash` 工具结果。

它更改返回的 `tool_result`，而非命令本身。Tokenjuice 不重写 shell 输入、不重新运行命令，也不更改退出码。

目前这适用于 PI 嵌入式运行和 Codex 应用服务器工具中的 OpenClaw 动态工具。Tokenjuice 钩入 OpenClaw 的工具结果中间件，并在输出返回到活动工具会话之前修剪输出。

## 启用插件

快速路径：

```bash
openclaw config set plugins.entries.tokenjuice.enabled true
```

等效命令：

```bash
openclaw plugins enable tokenjuice
```

OpenClaw 已附带该插件。不需要单独的 `plugins install` 或 `tokenjuice install openclaw` 步骤。

如果你更喜欢直接编辑配置：

```json5
{
  plugins: {
    entries: {
      tokenjuice: {
        enabled: true,
      },
    },
  },
}
```

## Tokenjuice 更改了什么

- 在将嘈杂的 `exec` 和 `bash` 结果反馈到会话之前压缩它们。
- 保持原始命令执行不变。
- 保留精确的文件内容读取以及 tokenjuice 应保留原始内容的其他命令。
- 保持选择加入：如果你想在所有地方使用逐字输出，请禁用该插件。

## 验证它是否在工作

1. 启用插件。
2. 启动一个可以调用 `exec` 的会话。
3. 运行嘈杂的命令，如 `git status`。
4. 检查返回的工具结果是否比原始 shell 输出更短且更结构化。

## 禁用插件

```bash
openclaw config set plugins.entries.tokenjuice.enabled false
```

或：

```bash
openclaw plugins disable tokenjuice
```

## 相关链接

- [Exec 工具](/tools/exec)
- [思考级别](/tools/thinking)
- [上下文引擎](/concepts/context-engine)
