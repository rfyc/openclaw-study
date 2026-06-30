---
summary: "通过 Honcho 插件实现的 AI 原生跨会话记忆"
title: "Honcho 记忆"
read_when:
  - 你希望跨会话和频道持久化记忆
  - 你希望使用 AI 驱动的召回和用户建模
---

[Honcho](https://honcho.dev) 为 OpenClaw 添加了 AI 原生记忆。它将对话持久化到专用服务，并随时间为用户和智能体建立模型，使你的智能体获得超越工作区 Markdown 文件的跨会话上下文。

## 提供的功能

- **跨会话记忆** -- 每次轮次后对话都会持久化，因此上下文可以跨会话重置、压缩和频道切换保留。
- **用户建模** -- Honcho 为每个用户（偏好、事实、沟通风格）和智能体（个性、学到的行为）维护一个档案。
- **语义搜索** -- 搜索过去对话中的观察，而不仅仅是当前会话。
- **多智能体感知** -- 父智能体自动追踪派生的子智能体，父智能体作为观察者被添加到子会话中。

## 可用工具

Honcho 注册了智能体在对话中可以使用的工具：

**数据检索（快速，无 LLM 调用）：**

| 工具                        | 功能                                 |
| --------------------------- | ------------------------------------ |
| `honcho_context`            | 跨会话的完整用户表示                 |
| `honcho_search_conclusions` | 对存储结论的语义搜索                 |
| `honcho_search_messages`    | 跨会话查找消息（按发送者、日期过滤） |
| `honcho_session`            | 当前会话历史和摘要                   |

**问答（LLM 驱动）：**

| 工具         | 功能                                                                |
| ------------ | ------------------------------------------------------------------- |
| `honcho_ask` | 询问有关用户的问题。`depth='quick'` 用于事实，`'thorough'` 用于综合 |

## 入门

安装插件并运行设置：

```bash
openclaw plugins install @honcho-ai/openclaw-honcho
openclaw honcho setup
openclaw gateway --force
```

设置命令会提示输入 API 凭证，写入配置，并可选地迁移现有工作区记忆文件。

<Info>
Honcho 可以完全在本地运行（自托管）或通过 `api.honcho.dev` 上的托管 API 运行。自托管选项不需要外部依赖。
</Info>

## 配置

设置位于 `plugins.entries["openclaw-honcho"].config` 下：

```json5
{
  plugins: {
    entries: {
      "openclaw-honcho": {
        config: {
          apiKey: "your-api-key", // 自托管时省略
          workspaceId: "openclaw", // 记忆隔离
          baseUrl: "https://api.honcho.dev",
        },
      },
    },
  },
}
```

对于自托管实例，将 `baseUrl` 指向你的本地服务器（例如 `http://localhost:8000`）并省略 API 密钥。

## 迁移现有记忆

如果你有现有的工作区记忆文件（`USER.md`、`MEMORY.md`、`IDENTITY.md`、`memory/`、`canvas/`），`openclaw honcho setup` 会检测并提供迁移它们。

<Info>
迁移是非破坏性的 -- 文件被上传到 Honcho。原始文件永远不会被删除或移动。
</Info>

## 工作原理

每次 AI 轮次后，对话都会持久化到 Honcho。用户和智能体消息都被观察，使 Honcho 能够随时间构建和完善其模型。

在对话过程中，Honcho 工具在 `before_prompt_build` 阶段查询服务，在模型看到提示之前注入相关上下文。这确保了准确的轮次边界和相关召回。

## Honcho 与内置记忆的比较

|              | 内置 / QMD              | Honcho                 |
| ------------ | ----------------------- | ---------------------- |
| **存储**     | 工作区 Markdown 文件    | 专用服务（本地或托管） |
| **跨会话**   | 通过记忆文件            | 自动内置               |
| **用户建模** | 手动（写入 MEMORY.md）  | 自动档案               |
| **搜索**     | 向量 + 关键字（混合）   | 对观察的语义搜索       |
| **多智能体** | 未追踪                  | 父子感知               |
| **依赖**     | 无（内置）或 QMD 二进制 | 插件安装               |

Honcho 和内置记忆系统可以协同工作。当配置了 QMD 时，可以使用额外的工具来搜索本地 Markdown 文件以及 Honcho 的跨会话记忆。

## CLI 命令

```bash
openclaw honcho setup                        # 配置 API 密钥并迁移文件
openclaw honcho status                       # 检查连接状态
openclaw honcho ask <question>               # 向 Honcho 询问有关用户的问题
openclaw honcho search <query> [-k N] [-d D] # 对记忆进行语义搜索
```

## 延伸阅读

- [插件源代码](https://github.com/plastic-labs/openclaw-honcho)
- [Honcho 文档](https://docs.honcho.dev)
- [Honcho OpenClaw 集成指南](https://docs.honcho.dev/v3/guides/integrations/openclaw)
- [记忆](/concepts/memory) -- OpenClaw 记忆概述
- [上下文引擎](/concepts/context-engine) -- 插件上下文引擎如何工作

## 相关

- [记忆概述](/concepts/memory)
- [内置记忆引擎](/concepts/memory-builtin)
- [QMD 记忆引擎](/concepts/memory-qmd)
