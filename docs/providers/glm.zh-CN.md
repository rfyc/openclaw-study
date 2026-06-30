---
summary: "GLM 模型系列概述 + 在 OpenClaw 中的使用方法"
read_when:
  - 您想在 OpenClaw 中使用 GLM 模型
  - 您需要了解模型命名规范和设置方法
title: "GLM（智谱）"
---

# GLM 模型

GLM 是一个**模型系列**（而非公司），可通过 Z.AI 平台访问。在 OpenClaw 中，GLM 模型通过 `zai` 提供商访问，模型 ID 如 `zai/glm-5`。

## 快速开始

<Steps>
  <Step title="选择认证路由并运行引导程序">
    选择与您的 Z.AI 套餐和地区匹配的引导选项：

    | 认证选项            | 适合                            |
    | ----------- | -------- |
    | `zai-api-key` | 带有端点自动检测的通用 API 密钥设置 |
    | `zai-coding-global` | 编程套餐用户（全球）            |
    | `zai-coding-cn` | 编程套餐用户（中国区）          |
    | `zai-global` | 通用 API（全球）                |
    | `zai-cn` | 通用 API（中国区）              |

    ```bash
    # 示例：通用自动检测
    openclaw onboard --auth-choice zai-api-key

    # 示例：编程套餐全球版
    openclaw onboard --auth-choice zai-coding-global
    ```

  </Step>
  <Step title="将 GLM 设置为默认模型">
    ```bash
    openclaw config set agents.defaults.model.primary "zai/glm-5.1"
    ```
  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider zai
    ```
  </Step>
</Steps>

## 配置示例

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

<Tip>
`zai-api-key` 让 OpenClaw 从密钥中检测匹配的 Z.AI 端点并自动应用正确的基础 URL。当您需要强制使用特定的编程套餐或通用 API 接口时，请使用明确的地区选项。
</Tip>

## 内置目录

OpenClaw 当前为内置的 `zai` 提供商预置了以下 GLM 引用：

| 模型            | 模型             |
| --------------- | ---------------- |
| `glm-5.1`       | `glm-4.7`        |
| `glm-5`         | `glm-4.7-flash`  |
| `glm-5-turbo`   | `glm-4.7-flashx` |
| `glm-5v-turbo`  | `glm-4.6`        |
| `glm-4.5`       | `glm-4.6v`       |
| `glm-4.5-air`   |                  |
| `glm-4.5-flash` |                  |
| `glm-4.5v`      |                  |

<Note>
默认内置模型引用为 `zai/glm-5.1`。GLM 版本和可用性可能会变化；请查看 Z.AI 文档了解最新信息。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="端点自动检测">
    使用 `zai-api-key` 认证选项时，OpenClaw 会检查密钥格式以确定正确的 Z.AI 基础 URL。显式地区选项（`zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`）会覆盖自动检测并直接固定端点。
  </Accordion>

  <Accordion title="提供商详情">
    GLM 模型由 `zai` 运行时提供商提供服务。有关完整的提供商配置、地区端点和其他功能，请参见 [Z.AI 提供商文档](/providers/zai)。
  </Accordion>
</AccordionGroup>

## 相关链接

<CardGroup cols={2}>
  <Card title="Z.AI 提供商" href="/providers/zai" icon="server">
    完整的 Z.AI 提供商配置和地区端点。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
</CardGroup>
