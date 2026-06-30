---
summary: "腾讯云 TokenHub 设置，用于 Hy3 preview"
title: "Tencent Cloud（TokenHub）"
read_when:
  - 你想在 OpenClaw 中使用腾讯 Hy3 preview
  - 你需要 TokenHub API 密钥设置
---

# Tencent Cloud TokenHub

腾讯云作为 OpenClaw 中的**捆绑提供商插件**提供。它通过 TokenHub 端点（`tencent-tokenhub`）提供对腾讯 Hy3 preview 的访问。

该提供商使用 OpenAI 兼容 API。

| 属性     | 值                                         |
| -------- | ------------------------------------------ |
| 提供商   | `tencent-tokenhub`                         |
| 默认模型 | `tencent-tokenhub/hy3-preview`             |
| 认证     | `TOKENHUB_API_KEY`                         |
| API      | OpenAI 兼容聊天补全                        |
| 基础 URL | `https://tokenhub.tencentmaas.com/v1`      |
| 全球 URL | `https://tokenhub-intl.tencentmaas.com/v1` |

## 快速开始

<Steps>
  <Step title="创建 TokenHub API 密钥">
    在腾讯云 TokenHub 中创建 API 密钥。如果你为密钥选择有限访问范围，请在允许的模型中包含 **Hy3 preview**。
  </Step>
  <Step title="运行引导程序">
    ```bash
    openclaw onboard --auth-choice tokenhub-api-key
    ```
  </Step>
  <Step title="验证模型">
    ```bash
    openclaw models list --provider tencent-tokenhub
    ```
  </Step>
</Steps>

## 非交互式设置

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY" \
  --skip-health \
  --accept-risk
```

## 内置目录

| 模型引用                       | 名称                    | 输入 | 上下文  | 最大输出 | 备注           |
| ------------------------------ | ----------------------- | ---- | ------- | -------- | -------------- |
| `tencent-tokenhub/hy3-preview` | Hy3 preview（TokenHub） | text | 256,000 | 64,000   | 默认；启用推理 |

Hy3 preview 是腾讯混元的大型 MoE 语言模型，用于推理、长上下文指令跟随、代码和代理工作流。腾讯的 OpenAI 兼容示例使用 `hy3-preview` 作为模型 id，支持标准的聊天补全工具调用和 `reasoning_effort`。

<Tip>
模型 id 为 `hy3-preview`。请勿将其与腾讯的 `HY-3D-*` 模型混淆，后者是 3D 生成 API，不是此提供商配置的 OpenClaw 聊天模型。
</Tip>

## 端点覆盖

OpenClaw 默认使用腾讯云的 `https://tokenhub.tencentmaas.com/v1` 端点。腾讯还提供了国际 TokenHub 端点：

```bash
openclaw config set models.providers.tencent-tokenhub.baseUrl "https://tokenhub-intl.tencentmaas.com/v1"
```

仅当你的 TokenHub 账户或地区需要时才覆盖端点。

## 说明

- TokenHub 模型引用使用 `tencent-tokenhub/<modelId>`。
- 捆绑目录目前包含 `hy3-preview`。
- 插件将 Hy3 preview 标记为支持推理和流式使用量。
- 插件附带分层的 Hy3 定价元数据，因此无需手动覆盖定价即可填充成本估算。
- 仅在需要时才在 `models.providers` 中覆盖定价、上下文或端点元数据。

## 环境说明

如果 Gateway 作为守护进程（launchd/systemd）运行，请确保 `TOKENHUB_API_KEY` 对该进程可用（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

## 相关文档

- [OpenClaw 配置](/gateway/configuration)
- [模型提供商](/concepts/model-providers)
- [腾讯 TokenHub 产品页面](https://cloud.tencent.com/product/tokenhub)
- [腾讯 TokenHub 文本生成](https://cloud.tencent.com/document/product/1823/130079)
- [腾讯 TokenHub 为 Hy3 preview 设置 Cline](https://cloud.tencent.com/document/product/1823/130932)
- [腾讯 Hy3 preview 模型卡片](https://huggingface.co/tencent/Hy3-preview)
