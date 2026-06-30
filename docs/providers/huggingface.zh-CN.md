---
summary: "Hugging Face Inference 设置（认证 + 模型选择）"
read_when:
  - 您想在 OpenClaw 中使用 Hugging Face Inference
  - 您需要 HF token 环境变量或 CLI 认证选项
title: "Hugging Face（推理）"
---

[Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers) 通过单一路由 API 提供 OpenAI 兼容的聊天补全。您可以用一个 token 访问众多模型（DeepSeek、Llama 等）。OpenClaw 使用**OpenAI 兼容端点**（仅聊天补全）；对于文本转图像、嵌入或语音，请直接使用 [HF 推理客户端](https://huggingface.co/docs/api-inference/quicktour)。

- 提供商：`huggingface`
- 认证：`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`（具有**调用推理提供商**权限的细粒度 token）
- API：OpenAI 兼容（`https://router.huggingface.co/v1`）
- 计费：单一 HF token；[定价](https://huggingface.co/docs/inference-providers/pricing)遵循提供商费率，有免费层级。

## 快速开始

<Steps>
  <Step title="创建细粒度 token">
    前往 [Hugging Face 设置 Token](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) 并创建新的细粒度 token。

    <Warning>
    该 token 必须启用**调用推理提供商**权限，否则 API 请求将被拒绝。
    </Warning>

  </Step>
  <Step title="运行引导程序">
    在提供商下拉列表中选择 **Hugging Face**，然后在提示时输入您的 API 密钥：

    ```bash
    openclaw onboard --auth-choice huggingface-api-key
    ```

  </Step>
  <Step title="选择默认模型">
    在**默认 Hugging Face 模型**下拉列表中选择您想要的模型。当您有有效 token 时，列表从 Inference API 加载；否则显示内置列表。您的选择将保存为默认模型。

    您也可以在配置中稍后设置或更改默认模型：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "huggingface/deepseek-ai/DeepSeek-R1" },
        },
      },
    }
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider huggingface
    ```
  </Step>
</Steps>

### 非交互式设置

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice huggingface-api-key \
  --huggingface-api-key "$HF_TOKEN"
```

这将把 `huggingface/deepseek-ai/DeepSeek-R1` 设置为默认模型。

## 模型 ID

模型引用使用 `huggingface/<org>/<model>` 格式（Hub 风格 ID）。以下列表来自 **GET** `https://router.huggingface.co/v1/models`；您的目录可能包含更多。

| 模型                   | 引用（前缀 `huggingface/`）         |
| ---------------------- | ----------------------------------- |
| DeepSeek R1            | `deepseek-ai/DeepSeek-R1`           |
| DeepSeek V3.2          | `deepseek-ai/DeepSeek-V3.2`         |
| Qwen3 8B               | `Qwen/Qwen3-8B`                     |
| Qwen2.5 7B Instruct    | `Qwen/Qwen2.5-7B-Instruct`          |
| Qwen3 32B              | `Qwen/Qwen3-32B`                    |
| Llama 3.3 70B Instruct | `meta-llama/Llama-3.3-70B-Instruct` |
| Llama 3.1 8B Instruct  | `meta-llama/Llama-3.1-8B-Instruct`  |
| GPT-OSS 120B           | `openai/gpt-oss-120b`               |
| GLM 4.7                | `zai-org/GLM-4.7`                   |
| Kimi K2.5              | `moonshotai/Kimi-K2.5`              |

<Tip>
您可以在任何模型 ID 后附加 `:fastest` 或 `:cheapest`。在[推理提供商设置](https://hf.co/settings/inference-providers)中设置您的默认顺序；完整列表请参见[推理提供商](https://huggingface.co/docs/inference-providers)和 **GET** `https://router.huggingface.co/v1/models`。
</Tip>

## 高级配置

<AccordionGroup>
  <Accordion title="模型发现和引导程序下拉列表">
    OpenClaw 通过直接调用**推理端点**发现模型：

    ```bash
    GET https://router.huggingface.co/v1/models
    ```

    （可选：发送 `Authorization: Bearer $HUGGINGFACE_HUB_TOKEN` 或 `$HF_TOKEN` 获取完整列表；部分端点在无认证时返回子集。）响应为 OpenAI 风格的 `{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`。

    当您配置了 Hugging Face API 密钥（通过引导程序、`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`）时，OpenClaw 使用此 GET 发现可用的聊天补全模型。**交互式设置**期间，输入 token 后您会看到从该列表（或请求失败时的内置目录）填充的**默认 Hugging Face 模型**下拉列表。在运行时（例如网关启动），当密钥存在时，OpenClaw 再次调用 **GET** `https://router.huggingface.co/v1/models` 刷新目录。该列表与内置目录合并（用于元数据，如上下文窗口和成本）。如果请求失败或未设置密钥，则仅使用内置目录。

  </Accordion>

  <Accordion title="模型名称、别名和策略后缀">
    - **来自 API 的名称：** 当 API 返回 `name`、`title` 或 `display_name` 时，模型显示名称从 **GET /v1/models** **水化**；否则从模型 ID 派生（例如 `deepseek-ai/DeepSeek-R1` 变为 "DeepSeek R1"）。
    - **覆盖显示名称：** 您可以在配置中为每个模型设置自定义标签，使其在 CLI 和 UI 中按您想要的方式显示：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1 (fast)" },
            "huggingface/deepseek-ai/DeepSeek-R1:cheapest": { alias: "DeepSeek R1 (cheap)" },
          },
        },
      },
    }
    ```

    - **策略后缀：** OpenClaw 内置的 Hugging Face 文档和帮助程序当前将这两个后缀视为内置策略变体：
      - **`:fastest`** — 最高吞吐量。
      - **`:cheapest`** — 每输出 token 成本最低。

      您可以将这些作为单独条目添加到 `models.providers.huggingface.models` 中，或在 `model.primary` 中设置带后缀的值。您也可以在[推理提供商设置](https://hf.co/settings/inference-providers)中设置默认提供商顺序（无后缀 = 使用该顺序）。

    - **配置合并：** `models.providers.huggingface.models` 中的现有条目（例如在 `models.json` 中）在配置合并时会被保留。因此，您在那里设置的任何自定义 `name`、`alias` 或模型选项都会被保留。

  </Accordion>

  <Accordion title="环境和守护进程设置">
    如果网关作为守护进程运行（launchd/systemd），请确保 `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN` 对该进程可用（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Note>
    OpenClaw 接受 `HUGGINGFACE_HUB_TOKEN` 和 `HF_TOKEN` 两个环境变量别名。任意一个均可使用；如果两者都设置，`HUGGINGFACE_HUB_TOKEN` 优先。
    </Note>

  </Accordion>

  <Accordion title="配置：DeepSeek R1 带 Qwen 回退">
    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "huggingface/deepseek-ai/DeepSeek-R1",
            fallbacks: ["huggingface/Qwen/Qwen3-8B"],
          },
          models: {
            "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1" },
            "huggingface/Qwen/Qwen3-8B": { alias: "Qwen3 8B" },
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="配置：Qwen 带最便宜和最快变体">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "huggingface/Qwen/Qwen3-8B" },
          models: {
            "huggingface/Qwen/Qwen3-8B": { alias: "Qwen3 8B" },
            "huggingface/Qwen/Qwen3-8B:cheapest": { alias: "Qwen3 8B (cheapest)" },
            "huggingface/Qwen/Qwen3-8B:fastest": { alias: "Qwen3 8B (fastest)" },
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="配置：DeepSeek + Llama + GPT-OSS 带别名">
    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "huggingface/deepseek-ai/DeepSeek-V3.2",
            fallbacks: [
              "huggingface/meta-llama/Llama-3.3-70B-Instruct",
              "huggingface/openai/gpt-oss-120b",
            ],
          },
          models: {
            "huggingface/deepseek-ai/DeepSeek-V3.2": { alias: "DeepSeek V3.2" },
            "huggingface/meta-llama/Llama-3.3-70B-Instruct": { alias: "Llama 3.3 70B" },
            "huggingface/openai/gpt-oss-120b": { alias: "GPT-OSS 120B" },
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="配置：多个 Qwen 和 DeepSeek 带策略后缀">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest" },
          models: {
            "huggingface/Qwen/Qwen2.5-7B-Instruct": { alias: "Qwen2.5 7B" },
            "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest": { alias: "Qwen2.5 7B (cheap)" },
            "huggingface/deepseek-ai/DeepSeek-R1:fastest": { alias: "DeepSeek R1 (fast)" },
            "huggingface/meta-llama/Llama-3.1-8B-Instruct": { alias: "Llama 3.1 8B" },
          },
        },
      },
    }
    ```
  </Accordion>
</AccordionGroup>

## 相关链接

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为概述。
  </Card>
  <Card title="模型选择" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="推理提供商文档" href="https://huggingface.co/docs/inference-providers" icon="book">
    Hugging Face 推理提供商官方文档。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>
