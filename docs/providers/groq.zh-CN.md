---
summary: "Groq 设置（认证 + 模型选择）"
title: "Groq"
read_when:
  - 您想在 OpenClaw 中使用 Groq
  - 您需要 API 密钥环境变量或 CLI 认证选项
---

[Groq](https://groq.com) 使用定制 LPU 硬件为开源模型（Llama、Gemma、Mistral 等）提供超快推理服务。OpenClaw 通过其 OpenAI 兼容 API 连接到 Groq。

| 属性   | 值             |
| ------ | -------------- |
| 提供商 | `groq`         |
| 认证   | `GROQ_API_KEY` |
| API    | OpenAI 兼容    |

## 快速开始

<Steps>
  <Step title="获取 API 密钥">
    在 [console.groq.com/keys](https://console.groq.com/keys) 创建 API 密钥。
  </Step>
  <Step title="设置 API 密钥">
    ```bash
    export GROQ_API_KEY="gsk_..."
    ```
  </Step>
  <Step title="设置默认模型">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "groq/llama-3.3-70b-versatile" },
        },
      },
    }
    ```
  </Step>
</Steps>

### 配置文件示例

```json5
{
  env: { GROQ_API_KEY: "gsk_..." },
  agents: {
    defaults: {
      model: { primary: "groq/llama-3.3-70b-versatile" },
    },
  },
}
```

## 内置目录

OpenClaw 为 Groq 提供了基于 manifest 的目录，支持快速的提供商筛选模型列表。运行 `openclaw models list --all --provider groq` 查看内置行，或访问 [console.groq.com/docs/models](https://console.groq.com/docs/models)。

| 模型                        | 说明                 |
| --------------------------- | -------------------- |
| **Llama 3.3 70B Versatile** | 通用型，大上下文     |
| **Llama 3.1 8B Instant**    | 快速，轻量级         |
| **Gemma 2 9B**              | 紧凑，高效           |
| **Mixtral 8x7B**            | MoE 架构，推理能力强 |

<Tip>
使用 `openclaw models list --all --provider groq` 查看此 OpenClaw 版本已知的基于 manifest 的 Groq 行。
</Tip>

## 推理模型

OpenClaw 将其共享的 `/think` 级别映射到 Groq 模型特定的 `reasoning_effort` 值。对于 `qwen/qwen3-32b`，禁用思考发送 `none`，启用思考发送 `default`。对于 Groq GPT-OSS 推理模型，OpenClaw 发送 `low`、`medium` 或 `high`；禁用思考时省略 `reasoning_effort`，因为这些模型不支持禁用值。

## 音频转录

Groq 还提供快速的基于 Whisper 的音频转录。当配置为媒体理解提供商时，OpenClaw 使用 Groq 的 `whisper-large-v3-turbo` 模型通过共享的 `tools.media.audio` 接口转录语音消息。

```json5
{
  tools: {
    media: {
      audio: {
        models: [{ provider: "groq" }],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="音频转录详情">
    | 属性 | 值 |
    |----------|-------|
    | 共享配置路径 | `tools.media.audio` |
    | 默认基础 URL | `https://api.groq.com/openai/v1` |
    | 默认模型     | `whisper-large-v3-turbo` |
    | API 端点     | OpenAI 兼容 `/audio/transcriptions` |
  </Accordion>

  <Accordion title="环境说明">
    如果网关作为守护进程运行（launchd/systemd），请确保 `GROQ_API_KEY` 对该进程可用（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Warning>
    仅在您的交互式 shell 中设置的密钥对守护进程管理的网关进程不可见。请使用 `~/.openclaw/.env` 或 `env.shellEnv` 配置来确保持久可用性。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相关链接

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包含提供商和音频设置的完整配置 schema。
  </Card>
  <Card title="Groq Console" href="https://console.groq.com" icon="arrow-up-right-from-square">
    Groq 控制台、API 文档和定价。
  </Card>
  <Card title="Groq 模型列表" href="https://console.groq.com/docs/models" icon="list">
    官方 Groq 模型目录。
  </Card>
</CardGroup>
