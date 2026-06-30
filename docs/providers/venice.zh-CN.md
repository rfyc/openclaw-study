---
summary: "在 OpenClaw 中使用 Venice AI 隐私优先模型"
read_when:
  - 你想在 OpenClaw 中进行隐私优先的推理
  - 你想获取 Venice AI 设置指南
title: "Venice AI"
---

Venice AI 提供**隐私优先的 AI 推理**，支持无审查模型，并通过其匿名化代理访问主要专有模型。所有推理默认为私密——不使用你的数据进行训练，不记录日志。

## 在 OpenClaw 中使用 Venice 的理由

- 开源模型的**私密推理**（不记录日志）。
- 需要时可使用**无审查模型**。
- 当质量重要时，可**匿名访问**专有模型（Opus/GPT/Gemini）。
- OpenAI 兼容的 `/v1` 端点。

## 隐私模式

Venice 提供两种隐私级别——了解这一点是选择模型的关键：

| 模式       | 说明                                                                                           | 模型                                                       |
| ---------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **私密**   | 完全私密。提示/响应**从不存储或记录**。临时性的。                                              | Llama、Qwen、DeepSeek、Kimi、MiniMax、Venice Uncensored 等 |
| **匿名化** | 通过 Venice 代理，去除元数据。底层提供商（OpenAI、Anthropic、Google、xAI）看到的是匿名化请求。 | Claude、GPT、Gemini、Grok                                  |

<Warning>
匿名化模型**并非**完全私密。Venice 在转发前会去除元数据，但底层提供商（OpenAI、Anthropic、Google、xAI）仍会处理请求。当需要完全隐私时，请选择**私密**模型。
</Warning>

## 功能

- **隐私优先**：在"私密"（完全私密）和"匿名化"（代理）模式之间选择
- **无审查模型**：访问无内容限制的模型
- **主要模型访问**：通过 Venice 的匿名化代理使用 Claude、GPT、Gemini 和 Grok
- **OpenAI 兼容 API**：标准 `/v1` 端点，易于集成
- **流式传输**：所有模型均支持
- **函数调用**：部分模型支持（查看模型功能）
- **视觉**：支持具有视觉能力的模型
- **无硬性速率限制**：极端使用情况下可能适用公平使用限制

## 快速开始

<Steps>
  <Step title="获取 API 密钥">
    1. 在 [venice.ai](https://venice.ai) 注册
    2. 前往**设置 > API 密钥 > 创建新密钥**
    3. 复制你的 API 密钥（格式：`vapi_xxxxxxxxxxxx`）
  </Step>
  <Step title="配置 OpenClaw">
    选择你偏好的设置方式：

    <Tabs>
      <Tab title="交互式（推荐）">
        ```bash
        openclaw onboard --auth-choice venice-api-key
        ```

        这将：
        1. 提示输入你的 API 密钥（或使用现有的 `VENICE_API_KEY`）
        2. 显示所有可用的 Venice 模型
        3. 让你选择默认模型
        4. 自动配置提供商
      </Tab>
      <Tab title="环境变量">
        ```bash
        export VENICE_API_KEY="vapi_xxxxxxxxxxxx"
        ```
      </Tab>
      <Tab title="非交互式">
        ```bash
        openclaw onboard --non-interactive \
          --auth-choice venice-api-key \
          --venice-api-key "vapi_xxxxxxxxxxxx"
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="验证设置">
    ```bash
    openclaw agent --model venice/kimi-k2-5 --message "Hello, are you working?"
    ```
  </Step>
</Steps>

## 模型选择

设置完成后，OpenClaw 会显示所有可用的 Venice 模型。根据需求选择：

- **默认模型**：`venice/kimi-k2-5`，提供强大的私密推理加视觉能力。
- **高能力选项**：`venice/claude-opus-4-6`，最强大的 Venice 匿名化路径。
- **隐私**：选择"私密"模型进行完全私密推理。
- **能力**：选择"匿名化"模型通过 Venice 代理访问 Claude、GPT、Gemini。

随时更改默认模型：

```bash
openclaw models set venice/kimi-k2-5
openclaw models set venice/claude-opus-4-6
```

列出所有可用模型：

```bash
openclaw models list --all --provider venice
```

你也可以运行 `openclaw configure`，选择**模型/认证**，然后选择 **Venice AI**。

<Tip>
使用下表为你的使用场景选择合适的模型。

| 使用场景             | 推荐模型                         | 原因                           |
| -------------------- | -------------------------------- | ------------------------------ |
| **通用聊天（默认）** | `kimi-k2-5`                      | 强大的私密推理加视觉能力       |
| **最佳综合质量**     | `claude-opus-4-6`                | 最强大的 Venice 匿名化选项     |
| **隐私 + 编程**      | `qwen3-coder-480b-a35b-instruct` | 大上下文的私密编程模型         |
| **私密视觉**         | `kimi-k2-5`                      | 不离开私密模式的视觉支持       |
| **快速且低成本**     | `qwen3-4b`                       | 轻量推理模型                   |
| **复杂私密任务**     | `deepseek-v3.2`                  | 强大推理，但无 Venice 工具支持 |
| **无审查**           | `venice-uncensored`              | 无内容限制                     |

</Tip>

## DeepSeek V4 重放行为

如果 Venice 提供了 DeepSeek V4 模型，如 `venice/deepseek-v4-pro` 或 `venice/deepseek-v4-flash`，当代理省略时，OpenClaw 会在助手消息上填充所需的 DeepSeek V4 `reasoning_content` 重放占位符。Venice 拒绝 DeepSeek 的原生顶层 `thinking` 控制，因此 OpenClaw 将该提供商特定的重放修复与原生 DeepSeek 提供商的思考控制分开。

## 内置目录（共 41 个）

<AccordionGroup>
  <Accordion title="私密模型（26 个）— 完全私密，不记录日志">
    | 模型 ID                                | 名称                                | 上下文 | 功能                   |
    | -------------------------------------- | ----------------------------------- | ------- | -------------------------- |
    | `kimi-k2-5`                            | Kimi K2.5                           | 256k    | 默认、推理、视觉           |
    | `kimi-k2-thinking`                     | Kimi K2 Thinking                    | 256k    | 推理                       |
    | `llama-3.3-70b`                        | Llama 3.3 70B                       | 128k    | 通用                       |
    | `llama-3.2-3b`                         | Llama 3.2 3B                        | 128k    | 通用                       |
    | `hermes-3-llama-3.1-405b`              | Hermes 3 Llama 3.1 405B            | 128k    | 通用，工具已禁用           |
    | `qwen3-235b-a22b-thinking-2507`        | Qwen3 235B Thinking                | 128k    | 推理                       |
    | `qwen3-235b-a22b-instruct-2507`        | Qwen3 235B Instruct                | 128k    | 通用                       |
    | `qwen3-coder-480b-a35b-instruct`       | Qwen3 Coder 480B                   | 256k    | 编程                       |
    | `qwen3-coder-480b-a35b-instruct-turbo` | Qwen3 Coder 480B Turbo             | 256k    | 编程                       |
    | `qwen3-5-35b-a3b`                      | Qwen3.5 35B A3B                    | 256k    | 推理、视觉                 |
    | `qwen3-next-80b`                       | Qwen3 Next 80B                     | 256k    | 通用                       |
    | `qwen3-vl-235b-a22b`                   | Qwen3 VL 235B（视觉）              | 256k    | 视觉                       |
    | `qwen3-4b`                             | Venice Small（Qwen3 4B）           | 32k     | 快速、推理                 |
    | `deepseek-v3.2`                        | DeepSeek V3.2                      | 160k    | 推理，工具已禁用           |
    | `venice-uncensored`                    | Venice Uncensored（Dolphin-Mistral）| 32k    | 无审查，工具已禁用         |
    | `mistral-31-24b`                       | Venice Medium（Mistral）           | 128k    | 视觉                       |
    | `google-gemma-3-27b-it`                | Google Gemma 3 27B Instruct        | 198k    | 视觉                       |
    | `openai-gpt-oss-120b`                  | OpenAI GPT OSS 120B               | 128k    | 通用                       |
    | `nvidia-nemotron-3-nano-30b-a3b`       | NVIDIA Nemotron 3 Nano 30B         | 128k    | 通用                       |
    | `olafangensan-glm-4.7-flash-heretic`   | GLM 4.7 Flash Heretic              | 128k    | 推理                       |
    | `zai-org-glm-4.6`                      | GLM 4.6                            | 198k    | 通用                       |
    | `zai-org-glm-4.7`                      | GLM 4.7                            | 198k    | 推理                       |
    | `zai-org-glm-4.7-flash`                | GLM 4.7 Flash                      | 128k    | 推理                       |
    | `zai-org-glm-5`                        | GLM 5                              | 198k    | 推理                       |
    | `minimax-m21`                          | MiniMax M2.1                       | 198k    | 推理                       |
    | `minimax-m25`                          | MiniMax M2.5                       | 198k    | 推理                       |
  </Accordion>

  <Accordion title="匿名化模型（15 个）— 通过 Venice 代理">
    | 模型 ID                         | 名称                           | 上下文 | 功能                      |
    | ------------------------------- | ------------------------------ | ------- | ------------------------- |
    | `claude-opus-4-6`               | Claude Opus 4.6（经 Venice）   | 1M      | 推理、视觉                |
    | `claude-opus-4-5`               | Claude Opus 4.5（经 Venice）   | 198k    | 推理、视觉                |
    | `claude-sonnet-4-6`             | Claude Sonnet 4.6（经 Venice） | 1M      | 推理、视觉                |
    | `claude-sonnet-4-5`             | Claude Sonnet 4.5（经 Venice） | 198k    | 推理、视觉                |
    | `openai-gpt-54`                 | GPT-5.4（经 Venice）           | 1M      | 推理、视觉                |
    | `openai-gpt-53-codex`           | GPT-5.3 Codex（经 Venice）     | 400k    | 推理、视觉、编程          |
    | `openai-gpt-52`                 | GPT-5.2（经 Venice）           | 256k    | 推理                      |
    | `openai-gpt-52-codex`           | GPT-5.2 Codex（经 Venice）     | 256k    | 推理、视觉、编程          |
    | `openai-gpt-4o-2024-11-20`      | GPT-4o（经 Venice）            | 128k    | 视觉                      |
    | `openai-gpt-4o-mini-2024-07-18` | GPT-4o Mini（经 Venice）       | 128k    | 视觉                      |
    | `gemini-3-1-pro-preview`        | Gemini 3.1 Pro（经 Venice）    | 1M      | 推理、视觉                |
    | `gemini-3-pro-preview`          | Gemini 3 Pro（经 Venice）      | 198k    | 推理、视觉                |
    | `gemini-3-flash-preview`        | Gemini 3 Flash（经 Venice）    | 256k    | 推理、视觉                |
    | `grok-41-fast`                  | Grok 4.1 Fast（经 Venice）     | 1M      | 推理、视觉                |
    | `grok-code-fast-1`              | Grok Code Fast 1（经 Venice）  | 256k    | 推理、编程                |
  </Accordion>
</AccordionGroup>

## 模型发现

OpenClaw 附带基于清单的 Venice 种子目录，用于只读模型列表。运行时刷新仍然可以从 Venice API 发现模型，如果 API 不可达则回退到清单目录。

`/models` 端点是公开的（列出不需要认证），但推理需要有效的 API 密钥。

## 流式传输和工具支持

| 功能          | 支持                                                  |
| ------------- | ----------------------------------------------------- |
| **流式传输**  | 所有模型                                              |
| **函数调用**  | 大多数模型（查看 API 中的 `supportsFunctionCalling`） |
| **视觉/图像** | 标有"视觉"功能的模型                                  |
| **JSON 模式** | 通过 `response_format` 支持                           |

## 定价

Venice 使用基于积分的系统。查看 [venice.ai/pricing](https://venice.ai/pricing) 了解当前费率：

- **私密模型**：通常成本较低
- **匿名化模型**：与直接 API 定价相近 + 小额 Venice 费用

### Venice（匿名化）与直接 API 对比

| 方面     | Venice（匿名化）     | 直接 API       |
| -------- | -------------------- | -------------- |
| **隐私** | 元数据已去除，匿名化 | 与你的账户关联 |
| **延迟** | +10-50ms（代理）     | 直连           |
| **功能** | 大多数功能支持       | 完整功能       |
| **计费** | Venice 积分          | 提供商计费     |

## 使用示例

```bash
# 使用默认私密模型
openclaw agent --model venice/kimi-k2-5 --message "Quick health check"

# 通过 Venice 使用 Claude Opus（匿名化）
openclaw agent --model venice/claude-opus-4-6 --message "Summarize this task"

# 使用无审查模型
openclaw agent --model venice/venice-uncensored --message "Draft options"

# 使用视觉模型处理图像
openclaw agent --model venice/qwen3-vl-235b-a22b --message "Review attached image"

# 使用编程模型
openclaw agent --model venice/qwen3-coder-480b-a35b-instruct --message "Refactor this function"
```

## 故障排查

<AccordionGroup>
  <Accordion title="API 密钥无法识别">
    ```bash
    echo $VENICE_API_KEY
    openclaw models list | grep venice
    ```

    确保密钥以 `vapi_` 开头。

  </Accordion>

  <Accordion title="模型不可用">
    Venice 模型目录是动态更新的。运行 `openclaw models list` 查看当前可用的模型。某些模型可能暂时下线。
  </Accordion>

  <Accordion title="连接问题">
    Venice API 地址为 `https://api.venice.ai/api/v1`。确保你的网络允许 HTTPS 连接。
  </Accordion>
</AccordionGroup>

<Note>
更多帮助：[故障排查](/help/troubleshooting) 和 [常见问题解答](/help/faq)。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="配置文件示例">
    ```json5
    {
      env: { VENICE_API_KEY: "vapi_..." },
      agents: { defaults: { model: { primary: "venice/kimi-k2-5" } } },
      models: {
        mode: "merge",
        providers: {
          venice: {
            baseUrl: "https://api.venice.ai/api/v1",
            apiKey: "${VENICE_API_KEY}",
            api: "openai-completions",
            models: [
              {
                id: "kimi-k2-5",
                name: "Kimi K2.5",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 256000,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Venice AI" href="https://venice.ai" icon="globe">
    Venice AI 主页和账号注册。
  </Card>
  <Card title="API 文档" href="https://docs.venice.ai" icon="book">
    Venice API 参考和开发者文档。
  </Card>
  <Card title="定价" href="https://venice.ai/pricing" icon="credit-card">
    当前 Venice 积分费率和套餐。
  </Card>
</CardGroup>
