---
summary: "在 OpenClaw 中使用 OpenCode Zen 和 Go 目录"
read_when:
  - 你想访问 OpenCode 托管的模型
  - 你想在 Zen 和 Go 目录之间进行选择
title: "OpenCode"
---

OpenCode 在 OpenClaw 中提供两个托管目录：

| 目录    | 前缀              | 运行时提供商  |
| ------- | ----------------- | ------------- |
| **Zen** | `opencode/...`    | `opencode`    |
| **Go**  | `opencode-go/...` | `opencode-go` |

两个目录使用相同的 OpenCode API 密钥。OpenClaw 保持运行时提供商 id 分离，以确保上游逐模型路由正确，但引导程序和文档将它们视为一个 OpenCode 设置。

## 快速开始

<Tabs>
  <Tab title="Zen 目录">
    **适合：** 精选的 OpenCode 多模型代理（Claude、GPT、Gemini）。

    <Steps>
      <Step title="运行引导程序">
        ```bash
        openclaw onboard --auth-choice opencode-zen
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="将 Zen 模型设置为默认">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode/claude-opus-4-6"
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider opencode
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Go 目录">
    **适合：** OpenCode 托管的 Kimi、GLM 和 MiniMax 系列。

    <Steps>
      <Step title="运行引导程序">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="将 Go 模型设置为默认">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.6"
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 配置示例

```json5
{
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

## 内置目录

### Zen

| 属性         | 值                                                                      |
| ------------ | ----------------------------------------------------------------------- |
| 运行时提供商 | `opencode`                                                              |
| 示例模型     | `opencode/claude-opus-4-6`、`opencode/gpt-5.5`、`opencode/gemini-3-pro` |

### Go

| 属性         | 值                                                                       |
| ------------ | ------------------------------------------------------------------------ |
| 运行时提供商 | `opencode-go`                                                            |
| 示例模型     | `opencode-go/kimi-k2.6`、`opencode-go/glm-5`、`opencode-go/minimax-m2.5` |

## 高级配置

<AccordionGroup>
  <Accordion title="API 密钥别名">
    `OPENCODE_ZEN_API_KEY` 也支持作为 `OPENCODE_API_KEY` 的别名。
  </Accordion>

  <Accordion title="共享凭据">
    在设置过程中输入一个 OpenCode 密钥会为两个运行时提供商存储凭据。你无需分别为每个目录进行引导。
  </Accordion>

  <Accordion title="账单和控制台">
    你在 OpenCode 中登录，添加账单详情，并复制你的 API 密钥。账单和目录可用性通过 OpenCode 控制台管理。
  </Accordion>

  <Accordion title="Gemini 重放行为">
    Gemini 支持的 OpenCode 引用保留在代理 Gemini 路径上，因此 OpenClaw 在那里保留 Gemini 思考签名净化，而不启用原生 Gemini 重放验证或引导重写。
  </Accordion>

  <Accordion title="非 Gemini 重放行为">
    非 Gemini 的 OpenCode 引用保留最小化的 OpenAI 兼容重放策略。
  </Accordion>
</AccordionGroup>

<Tip>
在设置过程中输入一个 OpenCode 密钥会为 Zen 和 Go 两个运行时提供商存储凭据，因此你只需引导一次。
</Tip>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>
