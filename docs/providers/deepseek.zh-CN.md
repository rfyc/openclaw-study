---
summary: "DeepSeek 设置（认证 + 模型选择）"
title: "DeepSeek"
read_when:
  - 您想在 OpenClaw 中使用 DeepSeek
  - 您需要 API 密钥环境变量或 CLI 认证选项
---

[DeepSeek](https://www.deepseek.com) 通过 OpenAI 兼容 API 提供强大的 AI 模型。

| 属性     | 值                         |
| -------- | -------------------------- |
| 提供商   | `deepseek`                 |
| 认证     | `DEEPSEEK_API_KEY`         |
| API      | OpenAI 兼容                |
| 基础 URL | `https://api.deepseek.com` |

## 快速开始

<Steps>
  <Step title="获取 API 密钥">
    在 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 创建 API 密钥。
  </Step>
  <Step title="运行引导程序">
    ```bash
    openclaw onboard --auth-choice deepseek-api-key
    ```

    这将提示您输入 API 密钥，并将 `deepseek/deepseek-v4-flash` 设置为默认模型。

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider deepseek
    ```

    要在不需要运行 Gateway 的情况下检查内置静态目录，请使用：

    ```bash
    openclaw models list --all --provider deepseek
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="非交互式设置">
    对于脚本化或无头安装，直接传入所有标志：

    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice deepseek-api-key \
      --deepseek-api-key "$DEEPSEEK_API_KEY" \
      --skip-health \
      --accept-risk
    ```

  </Accordion>
</AccordionGroup>

<Warning>
如果网关作为守护进程运行（launchd/systemd），请确保 `DEEPSEEK_API_KEY` 对该进程可用（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
</Warning>

## 内置目录

| 模型引用                     | 名称              | 输入 | 上下文    | 最大输出 | 说明                            |
| ---------------------------- | ----------------- | ---- | --------- | -------- | ------------------------------- |
| `deepseek/deepseek-v4-flash` | DeepSeek V4 Flash | 文本 | 1,000,000 | 384,000  | 默认模型；V4 支持思考功能的接口 |
| `deepseek/deepseek-v4-pro`   | DeepSeek V4 Pro   | 文本 | 1,000,000 | 384,000  | V4 支持思考功能的接口           |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | 文本 | 131,072   | 8,192    | DeepSeek V3.2 非思考接口        |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | 文本 | 131,072   | 65,536   | 启用推理的 V3.2 接口            |

<Tip>
V4 模型支持 DeepSeek 的 `thinking` 控制。OpenClaw 还会在后续轮次中重播 DeepSeek `reasoning_content`，使带有工具调用的思考会话可以继续进行。
使用 `/think xhigh` 或 `/think max` 配合 DeepSeek V4 模型可请求 DeepSeek 的最大 `reasoning_effort`。
</Tip>

## 思考与工具

DeepSeek V4 思考会话比大多数 OpenAI 兼容提供商有更严格的重播合约：在启用思考的轮次使用工具后，DeepSeek 要求在后续请求中，重播的来自该轮次的助手消息包含 `reasoning_content`。OpenClaw 在 DeepSeek 插件内处理这一问题，因此正常的多轮工具使用可以与 `deepseek/deepseek-v4-flash` 和 `deepseek/deepseek-v4-pro` 一起工作。

如果您将现有会话从另一个 OpenAI 兼容提供商切换到 DeepSeek V4 模型，较旧的助手工具调用轮次可能没有原生的 DeepSeek `reasoning_content`。OpenClaw 会在 DeepSeek V4 思考请求的重播助手消息中填充这个缺失字段，使提供商可以接受历史记录而无需使用 `/new`。

当 OpenClaw 中的思考被禁用时（包括 UI 中的**无**选择），OpenClaw 会发送 DeepSeek `thinking: { type: "disabled" }` 并从传出历史中去除重播的 `reasoning_content`。这使禁用思考的会话保持在 DeepSeek 的非思考路径上。

使用 `deepseek/deepseek-v4-flash` 作为默认快速路径。当您需要更强的 V4 模型且可以接受更高成本或延迟时，使用 `deepseek/deepseek-v4-pro`。

## 实时测试

直接实时模型套件包括 DeepSeek V4 在现代模型集中。要仅运行 DeepSeek V4 直接模型检查：

```bash
OPENCLAW_LIVE_PROVIDERS=deepseek \
OPENCLAW_LIVE_MODELS="deepseek/deepseek-v4-flash,deepseek/deepseek-v4-pro" \
pnpm test:live src/agents/models.profiles.live.test.ts
```

该实时检查验证两个 V4 模型均可完成，以及思考/工具后续轮次保留 DeepSeek 所需的重播载荷。

## 配置示例

```json5
{
  env: { DEEPSEEK_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "deepseek/deepseek-v4-flash" },
    },
  },
}
```

## 相关链接

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>
