---
summary: "Together AI 设置（认证 + 模型选择）"
title: "Together AI"
read_when:
  - 你想在 OpenClaw 中使用 Together AI
  - 你需要 API 密钥环境变量或 CLI 认证选择
---

[Together AI](https://together.ai) 通过统一 API 提供对 Llama、DeepSeek、Kimi 等领先开源模型的访问。

| 属性     | 值                            |
| -------- | ----------------------------- |
| 提供商   | `together`                    |
| 认证     | `TOGETHER_API_KEY`            |
| API      | OpenAI 兼容                   |
| 基础 URL | `https://api.together.xyz/v1` |

## 快速开始

<Steps>
  <Step title="获取 API 密钥">
    在 [api.together.ai/settings/api-keys](https://api.together.ai/settings/api-keys) 创建 API 密钥。
  </Step>
  <Step title="运行引导程序">
    ```bash
    openclaw onboard --auth-choice together-api-key
    ```
  </Step>
  <Step title="设置默认模型">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "together/moonshotai/Kimi-K2.5" },
        },
      },
    }
    ```
  </Step>
</Steps>

### 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice together-api-key \
  --together-api-key "$TOGETHER_API_KEY"
```

<Note>
引导预设将 `together/moonshotai/Kimi-K2.5` 设置为默认模型。
</Note>

## 内置目录

OpenClaw 附带以下捆绑的 Together 目录：

| 模型引用                                                     | 名称                                   | 输入        | 上下文     | 备注               |
| ------------------------------------------------------------ | -------------------------------------- | ----------- | ---------- | ------------------ |
| `together/moonshotai/Kimi-K2.5`                              | Kimi K2.5                              | text、image | 262,144    | 默认模型；启用推理 |
| `together/zai-org/GLM-4.7`                                   | GLM 4.7 Fp8                            | text        | 202,752    | 通用文本模型       |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo`           | Llama 3.3 70B Instruct Turbo           | text        | 131,072    | 快速指令模型       |
| `together/meta-llama/Llama-4-Scout-17B-16E-Instruct`         | Llama 4 Scout 17B 16E Instruct         | text、image | 10,000,000 | 多模态             |
| `together/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | Llama 4 Maverick 17B 128E Instruct FP8 | text、image | 20,000,000 | 多模态             |
| `together/deepseek-ai/DeepSeek-V3.1`                         | DeepSeek V3.1                          | text        | 131,072    | 通用文本模型       |
| `together/deepseek-ai/DeepSeek-R1`                           | DeepSeek R1                            | text        | 131,072    | 推理模型           |
| `together/moonshotai/Kimi-K2-Instruct-0905`                  | Kimi K2-Instruct 0905                  | text        | 262,144    | 次选 Kimi 文本模型 |

## 视频生成

捆绑的 `together` 插件还通过共享的 `video_generate` 工具注册了视频生成功能。

| 属性         | 值                                |
| ------------ | --------------------------------- |
| 默认视频模型 | `together/Wan-AI/Wan2.2-T2V-A14B` |
| 模式         | 文本转视频、单张图像参考          |
| 支持的参数   | `aspectRatio`、`resolution`       |

将 Together 设置为默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "together/Wan-AI/Wan2.2-T2V-A14B",
      },
    },
  },
}
```

<Tip>
有关共享工具参数、提供商选择和故障转移行为，请参见[视频生成](/tools/video-generation)。
</Tip>

<AccordionGroup>
  <Accordion title="环境说明">
    如果 Gateway 作为守护进程（launchd/systemd）运行，请确保 `TOGETHER_API_KEY` 对该进程可用（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Warning>
    仅在交互式 shell 中设置的密钥对守护进程管理的网关进程不可见。请使用 `~/.openclaw/.env` 或 `env.shellEnv` 配置以实现持久可用性。
    </Warning>

  </Accordion>

  <Accordion title="故障排查">
    - 验证密钥是否有效：`openclaw models list --provider together`
    - 如果模型未出现，请确认 API 密钥已在 Gateway 进程的正确环境中设置。
    - 模型引用格式为 `together/<model-id>`。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    提供商规则、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频生成工具参数和提供商选择。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包含提供商设置的完整配置架构。
  </Card>
  <Card title="Together AI" href="https://together.ai" icon="arrow-up-right-from-square">
    Together AI 控制台、API 文档和定价。
  </Card>
</CardGroup>
