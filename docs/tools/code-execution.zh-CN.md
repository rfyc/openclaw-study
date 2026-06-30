---
summary: "code_execution -- 使用 xAI 运行沙箱远程 Python 分析"
read_when:
  - 您想启用或配置 code_execution
  - 您想要不需要本地 shell 访问的远程分析
  - 您想将 x_search 或 web_search 与远程 Python 分析结合使用
title: "代码执行"
---

`code_execution` 在 xAI 的 Responses API 上运行沙箱远程 Python 分析。
这与本地 [`exec`](/tools/exec) 不同：

- `exec` 在您的机器或节点上运行 shell 命令
- `code_execution` 在 xAI 的远程沙箱中运行 Python

使用 `code_execution` 用于：

- 计算
- 制表
- 快速统计
- 图表样式分析
- 分析 `x_search` 或 `web_search` 返回的数据

当您需要本地文件、您的 shell、您的代码库或配对设备时，**不要**使用它。对于这些情况，请使用 [`exec`](/tools/exec)。

## 设置

您需要一个 xAI API 密钥。以下任意一种都有效：

- `XAI_API_KEY`
- `plugins.entries.xai.config.webSearch.apiKey`

示例：

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...",
          },
          codeExecution: {
            enabled: true,
            model: "grok-4-1-fast",
            maxTurns: 2,
            timeoutSeconds: 30,
          },
        },
      },
    },
  },
}
```

## 如何使用

自然地询问并明确分析意图：

```text
Use code_execution to calculate the 7-day moving average for these numbers: ...
```

```text
Use x_search to find posts mentioning OpenClaw this week, then use code_execution to count them by day.
```

```text
Use web_search to gather the latest AI benchmark numbers, then use code_execution to compare percent changes.
```

该工具内部接受单个 `task` 参数，因此代理应在一个提示中发送完整的分析请求和任何内联数据。

## 限制

- 这是远程 xAI 执行，不是本地进程执行。
- 应将其视为临时分析，而非持久笔记本。
- 不要假设可以访问本地文件或您的工作区。
- 对于新鲜的 X 数据，请先使用 [`x_search`](/tools/web#x_search)。

## 相关

- [Exec 工具](/tools/exec)
- [Exec 批准](/tools/exec-approvals)
- [apply_patch 工具](/tools/apply-patch)
- [Web 工具](/tools/web)
- [xAI](/providers/xai)
