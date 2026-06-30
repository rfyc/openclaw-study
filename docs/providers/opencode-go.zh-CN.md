---
summary: "使用 OpenCode Zen 共享设置中的 OpenCode Go 目录"
read_when:
  - 你想使用 OpenCode Go 目录
  - 你需要 Go 托管模型的运行时模型引用
title: "OpenCode Go"
---

OpenCode Go 是 [OpenCode](/providers/opencode) 中的 Go 目录。
它使用与 Zen 目录相同的 `OPENCODE_API_KEY`，但保留运行时提供商 id `opencode-go`，以确保上游的逐模型路由正确无误。

| 属性         | 值                              |
| ------------ | ------------------------------- |
| 运行时提供商 | `opencode-go`                   |
| 认证         | `OPENCODE_API_KEY`              |
| 父级设置     | [OpenCode](/providers/opencode) |

## 内置目录

OpenClaw 从捆绑的 pi 模型注册表中获取大多数 Go 目录条目，并在注册表追赶上游时补充当前上游条目。运行 `openclaw models list --provider opencode-go` 查看当前模型列表。

该提供商包含：

| 模型引用                        | 名称                 |
| ------------------------------- | -------------------- |
| `opencode-go/glm-5`             | GLM-5                |
| `opencode-go/glm-5.1`           | GLM-5.1              |
| `opencode-go/kimi-k2.5`         | Kimi K2.5            |
| `opencode-go/kimi-k2.6`         | Kimi K2.6（3倍限额） |
| `opencode-go/deepseek-v4-pro`   | DeepSeek V4 Pro      |
| `opencode-go/deepseek-v4-flash` | DeepSeek V4 Flash    |
| `opencode-go/mimo-v2-omni`      | MiMo V2 Omni         |
| `opencode-go/mimo-v2-pro`       | MiMo V2 Pro          |
| `opencode-go/minimax-m2.5`      | MiniMax M2.5         |
| `opencode-go/minimax-m2.7`      | MiniMax M2.7         |
| `opencode-go/qwen3.5-plus`      | Qwen3.5 Plus         |
| `opencode-go/qwen3.6-plus`      | Qwen3.6 Plus         |

## 快速开始

<Tabs>
  <Tab title="交互式">
    <Steps>
      <Step title="运行引导程序">
        ```bash
        openclaw onboard --auth-choice opencode-go
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

  <Tab title="非交互式">
    <Steps>
      <Step title="直接传入密钥">
        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
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
  env: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.6" } } },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="路由行为">
    当模型引用使用 `opencode-go/...` 时，OpenClaw 会自动处理逐模型路由。无需额外的提供商配置。
  </Accordion>

  <Accordion title="运行时引用约定">
    运行时引用保持明确：Zen 使用 `opencode/...`，Go 使用 `opencode-go/...`。
    这可以确保两个目录中上游的逐模型路由正确无误。
  </Accordion>

  <Accordion title="共享凭据">
    Zen 和 Go 目录使用相同的 `OPENCODE_API_KEY`。在设置过程中输入密钥会为两个运行时提供商存储凭据。
  </Accordion>
</AccordionGroup>

<Tip>
有关共享引导程序概述和完整的 Zen + Go 目录参考，请参见 [OpenCode](/providers/opencode)。
</Tip>

## 相关内容

<CardGroup cols={2}>
  <Card title="OpenCode（父级）" href="/providers/opencode" icon="server">
    共享引导程序、目录概述和高级说明。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
</CardGroup>
