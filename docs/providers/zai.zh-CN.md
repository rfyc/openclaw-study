---
summary: "在 OpenClaw 中使用 Z.AI（GLM 模型）"
read_when:
  - 你想在 OpenClaw 中使用 Z.AI / GLM 模型
  - 你需要简单的 ZAI_API_KEY 设置
title: "Z.AI"
---

Z.AI 是 **GLM** 模型的 API 平台。它提供 GLM 的 REST API，并使用 API 密钥进行认证。在 Z.AI 控制台中创建你的 API 密钥。OpenClaw 使用带有 Z.AI API 密钥的 `zai` 提供商。

- 提供商：`zai`
- 认证：`ZAI_API_KEY`
- API：Z.AI Chat Completions（Bearer 认证）

## 快速开始

<Tabs>
  <Tab title="自动检测端点">
    **适合：** 大多数用户。OpenClaw 根据密钥检测匹配的 Z.AI 端点，并自动应用正确的基础 URL。

    <Steps>
      <Step title="运行引导程序">
        ```bash
        openclaw onboard --auth-choice zai-api-key
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          env: { ZAI_API_KEY: "sk-..." },
          agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
        }
        ```
      </Step>
      <Step title="验证模型是否已列出">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="显式区域端点">
    **适合：** 想要强制指定 Coding Plan 或通用 API 接口的用户。

    <Steps>
      <Step title="选择正确的引导选择">
        ```bash
        # Coding Plan 全球（推荐 Coding Plan 用户）
        openclaw onboard --auth-choice zai-coding-global

        # Coding Plan CN（中国地区）
        openclaw onboard --auth-choice zai-coding-cn

        # 通用 API
        openclaw onboard --auth-choice zai-global

        # 通用 API CN（中国地区）
        openclaw onboard --auth-choice zai-cn
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          env: { ZAI_API_KEY: "sk-..." },
          agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
        }
        ```
      </Step>
      <Step title="验证模型是否已列出">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 内置目录

OpenClaw 在插件清单中附带捆绑的 `zai` 提供商目录，因此无需加载提供商运行时即可显示已知的 GLM 行：

```bash
openclaw models list --all --provider zai
```

清单支持的目录目前包含：

| 模型引用             | 备注     |
| -------------------- | -------- |
| `zai/glm-5.1`        | 默认模型 |
| `zai/glm-5`          |          |
| `zai/glm-5-turbo`    |          |
| `zai/glm-5v-turbo`   |          |
| `zai/glm-4.7`        |          |
| `zai/glm-4.7-flash`  |          |
| `zai/glm-4.7-flashx` |          |
| `zai/glm-4.6`        |          |
| `zai/glm-4.6v`       |          |
| `zai/glm-4.5`        |          |
| `zai/glm-4.5-air`    |          |
| `zai/glm-4.5-flash`  |          |
| `zai/glm-4.5v`       |          |

<Tip>
GLM 模型以 `zai/<model>` 形式提供（例如：`zai/glm-5`）。默认捆绑的模型引用为 `zai/glm-5.1`。
</Tip>

## 高级配置

<AccordionGroup>
  <Accordion title="前向解析未知 GLM-5 模型">
    未知的 `glm-5*` id 在捆绑的提供商路径上仍然前向解析，当 id 匹配当前 GLM-5 家族形态时，会从 `glm-4.7` 模板合成提供商拥有的元数据。
  </Accordion>

  <Accordion title="工具调用流式传输">
    `tool_stream` 默认为 Z.AI 工具调用流式传输启用。要禁用它：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "zai/<model>": {
              params: { tool_stream: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="思考和保留思考">
    Z.AI 思考遵循 OpenClaw 的 `/think` 控制。思考关闭时，OpenClaw 发送 `thinking: { type: "disabled" }` 以避免响应在可见文本之前将输出预算用于 `reasoning_content`。

    保留思考是可选加入的，因为 Z.AI 要求重放完整的历史 `reasoning_content`，这会增加提示令牌。按模型启用它：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "zai/glm-5.1": {
              params: { preserveThinking: true },
            },
          },
        },
      },
    }
    ```

    启用且思考开启时，OpenClaw 发送 `thinking: { type: "enabled", clear_thinking: false }` 并为相同的 OpenAI 兼容转录重放之前的 `reasoning_content`。

    高级用户仍然可以用 `params.extra_body.thinking` 覆盖确切的提供商负载。

  </Accordion>

  <Accordion title="图像理解">
    捆绑的 Z.AI 插件注册了图像理解功能。

    | 属性          | 值          |
    | ------------- | ----------- |
    | 模型           | `glm-4.6v`  |

    图像理解会从已配置的 Z.AI 认证自动解析——无需额外配置。

  </Accordion>

  <Accordion title="认证详情">
    - Z.AI 使用带有 API 密钥的 Bearer 认证。
    - `zai-api-key` 引导选择会根据密钥前缀自动检测匹配的 Z.AI 端点。
    - 当你想强制指定特定 API 接口时，使用显式区域选择（`zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`）。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="GLM 模型系列" href="/providers/glm" icon="microchip">
    GLM 模型系列概述。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
</CardGroup>
