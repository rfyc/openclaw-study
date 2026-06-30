---
summary: "Fireworks 设置（认证 + 模型选择）"
title: "Fireworks"
read_when:
  - 您想在 OpenClaw 中使用 Fireworks
  - 您需要 Fireworks API 密钥环境变量或默认模型 ID
---

[Fireworks](https://fireworks.ai) 通过 OpenAI 兼容 API 提供开放权重和路由模型。OpenClaw 内置了 Fireworks 提供商插件。

| 属性     | 值                                                     |
| -------- | ------------------------------------------------------ |
| 提供商   | `fireworks`                                            |
| 认证     | `FIREWORKS_API_KEY`                                    |
| API      | OpenAI 兼容聊天/补全                                   |
| 基础 URL | `https://api.fireworks.ai/inference/v1`                |
| 默认模型 | `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` |

## 快速开始

<Steps>
  <Step title="通过引导程序设置 Fireworks 认证">
    ```bash
    openclaw onboard --auth-choice fireworks-api-key
    ```

    这会将您的 Fireworks 密钥存储到 OpenClaw 配置中，并将 Fire Pass 入门模型设置为默认值。

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider fireworks
    ```
  </Step>
</Steps>

## 非交互式示例

对于脚本化或 CI 设置，在命令行中传入所有值：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## 内置目录

| 模型引用                                               | 名称                         | 输入       | 上下文  | 最大输出 | 说明                                                                                                      |
| ------------------------------------------------------ | ---------------------------- | ---------- | ------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `fireworks/accounts/fireworks/models/kimi-k2p6`        | Kimi K2.6                    | 文本、图像 | 262,144 | 262,144  | Fireworks 上最新的 Kimi 模型。Fireworks K2.6 请求禁用思考；如需 Kimi 思考输出，请直接通过 Moonshot 路由。 |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo（Fire Pass） | 文本、图像 | 256,000 | 256,000  | Fireworks 上默认的内置入门模型                                                                            |

<Tip>
如果 Fireworks 发布了更新的模型（例如全新的 Qwen 或 Gemma 版本），您可以直接使用其 Fireworks 模型 ID，无需等待内置目录更新。
</Tip>

## 自定义 Fireworks 模型 ID

OpenClaw 也接受动态 Fireworks 模型 ID。使用 Fireworks 显示的确切模型或路由器 ID，并在前面加上 `fireworks/`。

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/routers/kimi-k2p5-turbo",
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="模型 ID 前缀的工作原理">
    OpenClaw 中的每个 Fireworks 模型引用均以 `fireworks/` 开头，后跟来自 Fireworks 平台的确切 ID 或路由器路径。例如：

    - 路由器模型：`fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`
    - 直接模型：`fireworks/accounts/fireworks/models/<model-name>`

    OpenClaw 在构建 API 请求时会去掉 `fireworks/` 前缀，并将剩余路径发送到 Fireworks 端点。

  </Accordion>

  <Accordion title="环境说明">
    如果网关在您的交互式 shell 之外运行，请确保 `FIREWORKS_API_KEY` 对该进程也可用。

    <Warning>
    仅在 `~/.profile` 中设置的密钥对 launchd/systemd 守护进程没有帮助，除非该环境也被导入到那里。请在 `~/.openclaw/.env` 中设置密钥或通过 `env.shellEnv` 确保网关进程可以读取它。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相关链接

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    通用故障排查和常见问题。
  </Card>
</CardGroup>
