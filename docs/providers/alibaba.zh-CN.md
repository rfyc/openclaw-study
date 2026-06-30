---
summary: "在 OpenClaw 中使用阿里巴巴模型工作室 Wan 视频生成"
title: "阿里巴巴模型工作室"
read_when:
  - 您想在 OpenClaw 中使用阿里巴巴 Wan 视频生成
  - 您需要为视频生成配置模型工作室或 DashScope API 密钥
---

OpenClaw 内置了 `alibaba` 视频生成提供商，用于在阿里巴巴模型工作室 / DashScope 上运行 Wan 模型。

- 提供商：`alibaba`
- 首选认证：`MODELSTUDIO_API_KEY`
- 也接受：`DASHSCOPE_API_KEY`、`QWEN_API_KEY`
- API：DashScope / 模型工作室异步视频生成

## 快速开始

<Steps>
  <Step title="设置 API 密钥">
    ```bash
    openclaw onboard --auth-choice qwen-standard-api-key
    ```
  </Step>
  <Step title="设置默认视频模型">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "alibaba/wan2.6-t2v",
          },
        },
      },
    }
    ```
  </Step>
  <Step title="验证提供商是否可用">
    ```bash
    openclaw models list --provider alibaba
    ```
  </Step>
</Steps>

<Note>
任何已接受的认证密钥（`MODELSTUDIO_API_KEY`、`DASHSCOPE_API_KEY`、`QWEN_API_KEY`）均可使用。`qwen-standard-api-key` 引导选项会配置共享的 DashScope 凭据。
</Note>

## 内置 Wan 模型

内置的 `alibaba` 提供商当前注册了以下模型：

| 模型引用                   | 模式               |
| -------------------------- | ------------------ |
| `alibaba/wan2.6-t2v`       | 文本转视频         |
| `alibaba/wan2.6-i2v`       | 图像转视频         |
| `alibaba/wan2.6-r2v`       | 参考转视频         |
| `alibaba/wan2.6-r2v-flash` | 参考转视频（快速） |
| `alibaba/wan2.7-r2v`       | 参考转视频         |

## 当前限制

| 参数           | 限制                                                      |
| -------------- | --------------------------------------------------------- |
| 输出视频       | 每次请求最多 **1** 个                                     |
| 输入图像       | 最多 **1** 个                                             |
| 输入视频       | 最多 **4** 个                                             |
| 时长           | 最长 **10 秒**                                            |
| 支持的控制参数 | `size`、`aspectRatio`、`resolution`、`audio`、`watermark` |
| 参考图像/视频  | 仅支持远程 `http(s)` URL                                  |

<Warning>
参考图像/视频模式目前需要**远程 http(s) URL**。参考输入不支持本地文件路径。
</Warning>

## 高级配置

<AccordionGroup>
  <Accordion title="与 Qwen 的关系">
    内置的 `qwen` 提供商也使用阿里巴巴托管的 DashScope 端点进行 Wan 视频生成。使用：

    - `qwen/...`：当您需要规范的 Qwen 提供商接口时
    - `alibaba/...`：当您需要直接的供应商原生 Wan 视频接口时

    更多详情请参见 [Qwen 提供商文档](/providers/qwen)。

  </Accordion>

  <Accordion title="认证密钥优先级">
    OpenClaw 按以下顺序检查认证密钥：

    1. `MODELSTUDIO_API_KEY`（首选）
    2. `DASHSCOPE_API_KEY`
    3. `QWEN_API_KEY`

    以上任意密钥均可用于认证 `alibaba` 提供商。

  </Accordion>
</AccordionGroup>

## 相关链接

<CardGroup cols={2}>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="Qwen" href="/providers/qwen" icon="microchip">
    Qwen 提供商设置和 DashScope 集成。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值和模型配置。
  </Card>
</CardGroup>
