---
summary: "通过 inferrs（OpenAI 兼容本地服务器）运行 OpenClaw"
read_when:
  - 您想在本地 inferrs 服务器上运行 OpenClaw
  - 您正在通过 inferrs 提供 Gemma 或其他模型
  - 您需要 inferrs 的精确 OpenClaw 兼容标志
title: "Inferrs"
---

[inferrs](https://github.com/ericcurtin/inferrs) 可以在 OpenAI 兼容的 `/v1` API 后面提供本地模型。OpenClaw 通过通用的 `openai-completions` 路径与 `inferrs` 配合使用。

`inferrs` 目前最好被视为自定义的自托管 OpenAI 兼容后端，而非专用的 OpenClaw 提供商插件。

## 快速开始

<Steps>
  <Step title="使用模型启动 inferrs">
    ```bash
    inferrs serve google/gemma-4-E2B-it \
      --host 127.0.0.1 \
      --port 8080 \
      --device metal
    ```
  </Step>
  <Step title="验证服务器是否可达">
    ```bash
    curl http://127.0.0.1:8080/health
    curl http://127.0.0.1:8080/v1/models
    ```
  </Step>
  <Step title="添加 OpenClaw 提供商条目">
    添加显式提供商条目并将默认模型指向它。请参见下方的完整配置示例。
  </Step>
</Steps>

## 完整配置示例

此示例在本地 `inferrs` 服务器上使用 Gemma 4。

```json5
{
  agents: {
    defaults: {
      model: { primary: "inferrs/google/gemma-4-E2B-it" },
      models: {
        "inferrs/google/gemma-4-E2B-it": {
          alias: "Gemma 4 (inferrs)",
        },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      inferrs: {
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "inferrs-local",
        api: "openai-completions",
        models: [
          {
            id: "google/gemma-4-E2B-it",
            name: "Gemma 4 E2B (inferrs)",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 4096,
            compat: {
              requiresStringContent: true,
            },
          },
        ],
      },
    },
  },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="requiresStringContent 的重要性">
    某些 `inferrs` 聊天补全路由只接受字符串类型的 `messages[].content`，而不接受结构化内容部分数组。

    <Warning>
    如果 OpenClaw 运行失败，出现如下错误：

    ```text
    messages[1].content: invalid type: sequence, expected a string
    ```

    请在您的模型条目中设置 `compat.requiresStringContent: true`。
    </Warning>

    ```json5
    compat: {
      requiresStringContent: true
    }
    ```

    OpenClaw 会在发送请求前将纯文本内容部分展平为纯字符串。

  </Accordion>

  <Accordion title="Gemma 和工具 schema 注意事项">
    某些当前的 `inferrs` + Gemma 组合可以接受小型直接的 `/v1/chat/completions` 请求，但在完整的 OpenClaw 代理运行时轮次中仍然失败。

    如果发生这种情况，请首先尝试：

    ```json5
    compat: {
      requiresStringContent: true,
      supportsTools: false
    }
    ```

    这会为该模型禁用 OpenClaw 的工具 schema 接口，可以减少对更严格的本地后端的提示压力。

    如果微小的直接请求仍然有效，但正常的 OpenClaw 代理轮次继续在 `inferrs` 内部崩溃，则剩余问题通常是上游模型/服务器行为，而非 OpenClaw 的传输层问题。

  </Accordion>

  <Accordion title="手动冒烟测试">
    配置完成后，测试两个层：

    ```bash
    curl http://127.0.0.1:8080/v1/chat/completions \
      -H 'content-type: application/json' \
      -d '{"model":"google/gemma-4-E2B-it","messages":[{"role":"user","content":"What is 2 + 2?"}],"stream":false}'
    ```

    ```bash
    openclaw infer model run \
      --model inferrs/google/gemma-4-E2B-it \
      --prompt "What is 2 + 2? Reply with one short sentence." \
      --json
    ```

    如果第一条命令有效但第二条失败，请查看下方的故障排查部分。

  </Accordion>

  <Accordion title="代理式行为">
    `inferrs` 被视为代理式 OpenAI 兼容 `/v1` 后端，而非原生 OpenAI 端点。

    - 不适用原生 OpenAI 专属请求格式
    - 无 `service_tier`、无 Responses `store`、无提示词缓存提示，也无 OpenAI 推理兼容载荷格式
    - 自定义 `inferrs` 基础 URL 上不注入隐藏的 OpenClaw 归因标头（`originator`、`version`、`User-Agent`）

  </Accordion>
</AccordionGroup>

## 故障排查

<AccordionGroup>
  <Accordion title="curl /v1/models 失败">
    `inferrs` 未运行、不可达，或未绑定到预期的主机/端口。请确保服务器已启动并在您配置的地址上监听。
  </Accordion>

  <Accordion title="messages[].content 预期为字符串">
    在模型条目中设置 `compat.requiresStringContent: true`。有关详细信息，请参见上方的 `requiresStringContent` 部分。
  </Accordion>

  <Accordion title="直接 /v1/chat/completions 调用通过但 openclaw infer model run 失败">
    尝试设置 `compat.supportsTools: false` 以禁用工具 schema 接口。请参见上方的 Gemma 工具 schema 注意事项。
  </Accordion>

  <Accordion title="inferrs 在较大的代理轮次中仍然崩溃">
    如果 OpenClaw 不再收到 schema 错误，但 `inferrs` 在较大的代理轮次中仍然崩溃，请将其视为上游 `inferrs` 或模型的限制。减少提示压力或切换到不同的本地后端或模型。
  </Accordion>
</AccordionGroup>

<Tip>
如需通用帮助，请参见[故障排查](/help/troubleshooting)和[常见问题](/help/faq)。
</Tip>

## 相关链接

<CardGroup cols={2}>
  <Card title="本地模型" href="/gateway/local-models" icon="server">
    在本地模型服务器上运行 OpenClaw。
  </Card>
  <Card title="网关故障排查" href="/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="wrench">
    调试通过直接探测但代理运行失败的本地 OpenAI 兼容后端。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为概述。
  </Card>
</CardGroup>
