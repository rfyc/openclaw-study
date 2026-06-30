---
summary: "在 OpenClaw 中使用 NVIDIA 的 OpenAI 兼容 API"
read_when:
  - 你想在 OpenClaw 中免费使用开源模型
  - 你需要 NVIDIA_API_KEY 设置
title: "NVIDIA"
---

NVIDIA 在 `https://integrate.api.nvidia.com/v1` 提供 OpenAI 兼容 API，可免费使用开源模型。通过 [build.nvidia.com](https://build.nvidia.com/settings/api-keys) 获取 API 密钥进行认证。

## 快速开始

<Steps>
  <Step title="获取 API 密钥">
    在 [build.nvidia.com](https://build.nvidia.com/settings/api-keys) 创建 API 密钥。
  </Step>
  <Step title="导出密钥并运行引导程序">
    ```bash
    export NVIDIA_API_KEY="nvapi-..."
    openclaw onboard --auth-choice nvidia-api-key
    ```
  </Step>
  <Step title="设置 NVIDIA 模型">
    ```bash
    openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b
    ```
  </Step>
</Steps>

<Warning>
如果你使用 `--nvidia-api-key` 而非环境变量，该值会出现在 shell 历史记录和 `ps` 输出中。请尽可能使用 `NVIDIA_API_KEY` 环境变量。
</Warning>

对于非交互式设置，也可以直接传入密钥：

```bash
openclaw onboard --auth-choice nvidia-api-key --nvidia-api-key "nvapi-..."
```

## 配置示例

```json5
{
  env: { NVIDIA_API_KEY: "nvapi-..." },
  models: {
    providers: {
      nvidia: {
        baseUrl: "https://integrate.api.nvidia.com/v1",
        api: "openai-completions",
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "nvidia/nvidia/nemotron-3-super-120b-a12b" },
    },
  },
}
```

## 内置目录

| 模型引用                                   | 名称                         | 上下文  | 最大输出 |
| ------------------------------------------ | ---------------------------- | ------- | -------- |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144 | 8,192    |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144 | 8,192    |
| `nvidia/minimaxai/minimax-m2.5`            | Minimax M2.5                 | 196,608 | 8,192    |
| `nvidia/z-ai/glm5`                         | GLM 5                        | 202,752 | 8,192    |

## 高级配置

<AccordionGroup>
  <Accordion title="自动启用行为">
    当 `NVIDIA_API_KEY` 环境变量已设置时，提供商自动启用。除密钥外无需显式提供商配置。
  </Accordion>

  <Accordion title="目录和定价">
    内置目录是静态的。由于 NVIDIA 目前对所列模型提供免费 API 访问，源码中成本默认为 `0`。
  </Accordion>

  <Accordion title="OpenAI 兼容端点">
    NVIDIA 使用标准的 `/v1` completions 端点。任何 OpenAI 兼容工具都可以直接通过 NVIDIA 基础 URL 工作。
  </Accordion>
</AccordionGroup>

<Tip>
NVIDIA 模型目前免费使用。请访问 [build.nvidia.com](https://build.nvidia.com/) 查看最新的可用性和速率限制详情。
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
