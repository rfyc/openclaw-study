---
summary: "在 OpenClaw 中使用 Kilo Gateway 的统一 API 访问众多模型"
title: "Kilocode"
read_when:
  - 您想用单一 API 密钥访问众多 LLM
  - 您想通过 Kilo Gateway 在 OpenClaw 中运行模型
---

# Kilo Gateway

Kilo Gateway 提供一个**统一 API**，通过单一端点和 API 密钥将请求路由到众多模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 只需切换基础 URL 即可使用。

| 属性     | 值                                 |
| -------- | ---------------------------------- |
| 提供商   | `kilocode`                         |
| 认证     | `KILOCODE_API_KEY`                 |
| API      | OpenAI 兼容                        |
| 基础 URL | `https://api.kilo.ai/api/gateway/` |

## 快速开始

<Steps>
  <Step title="创建账户">
    前往 [app.kilo.ai](https://app.kilo.ai)，登录或创建账户，然后导航至 API Keys 并生成新密钥。
  </Step>
  <Step title="运行引导程序">
    ```bash
    openclaw onboard --auth-choice kilocode-api-key
    ```

    或直接设置环境变量：

    ```bash
    export KILOCODE_API_KEY="<your-kilocode-api-key>" # pragma: allowlist secret
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider kilocode
    ```
  </Step>
</Steps>

## 默认模型

默认模型为 `kilocode/kilo/auto`，这是由 Kilo Gateway 管理的提供商自有智能路由模型。

<Note>
OpenClaw 将 `kilocode/kilo/auto` 视为稳定的默认引用，但不会公布该路由背后任务到上游模型的映射。`kilocode/kilo/auto` 背后的确切上游路由由 Kilo Gateway 拥有，而非在 OpenClaw 中硬编码。
</Note>

## 内置目录

OpenClaw 在启动时从 Kilo Gateway 动态发现可用模型。使用 `/models kilocode` 查看您账户可用的完整模型列表。

网关上任何可用的模型都可以使用 `kilocode/` 前缀：

| 模型引用                               | 说明                             |
| -------------------------------------- | -------------------------------- |
| `kilocode/kilo/auto`                   | 默认——智能路由                   |
| `kilocode/anthropic/claude-sonnet-4`   | 通过 Kilo 的 Anthropic           |
| `kilocode/openai/gpt-5.5`              | 通过 Kilo 的 OpenAI              |
| `kilocode/google/gemini-3-pro-preview` | 通过 Kilo 的 Google              |
| ...以及更多                            | 使用 `/models kilocode` 列出全部 |

<Tip>
在启动时，OpenClaw 查询 `GET https://api.kilo.ai/api/gateway/models` 并将已发现的模型合并到静态回退目录之前。内置回退始终包含 `kilocode/kilo/auto`（`Kilo Auto`），具有 `input: ["text", "image"]`、`reasoning: true`、`contextWindow: 1000000` 和 `maxTokens: 128000`。
</Tip>

## 配置示例

```json5
{
  env: { KILOCODE_API_KEY: "<your-kilocode-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "kilocode/kilo/auto" },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="传输和兼容性">
    Kilo Gateway 在源代码中记录为 OpenRouter 兼容，因此它保持在代理式 OpenAI 兼容路径上，而非原生 OpenAI 请求格式。

    - Gemini 支持的 Kilo 引用保持在代理 Gemini 路径上，因此 OpenClaw 在那里保持 Gemini 思考签名清理，而不启用原生 Gemini 重播验证或引导重写。
    - Kilo Gateway 在底层使用您的 API 密钥作为 Bearer token。

  </Accordion>

  <Accordion title="流包装器和推理">
    Kilo 的共享流包装器添加了提供商应用标头，并为受支持的具体模型引用规范化代理推理载荷。

    <Warning>
    `kilocode/kilo/auto` 和其他代理推理不支持的提示会跳过推理注入。如果您需要推理支持，请使用具体的模型引用，例如 `kilocode/anthropic/claude-sonnet-4`。
    </Warning>

  </Accordion>

  <Accordion title="故障排查">
    - 如果启动时模型发现失败，OpenClaw 回退到包含 `kilocode/kilo/auto` 的内置静态目录。
    - 确认您的 API 密钥有效，且您的 Kilo 账户已启用所需的模型。
    - 当网关作为守护进程运行时，请确保 `KILOCODE_API_KEY` 对该进程可用（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

  </Accordion>
</AccordionGroup>

## 相关链接

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 配置参考。
  </Card>
  <Card title="Kilo Gateway" href="https://app.kilo.ai" icon="arrow-up-right-from-square">
    Kilo Gateway 控制台、API 密钥和账户管理。
  </Card>
</CardGroup>
