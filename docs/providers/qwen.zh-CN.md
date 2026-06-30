---
summary: "通过 OpenClaw 捆绑的 qwen 提供商使用 Qwen Cloud"
read_when:
  - 你想在 OpenClaw 中使用 Qwen
  - 你之前使用过 Qwen OAuth
title: "Qwen"
---

<Warning>

**Qwen OAuth 已被移除。** 使用 `portal.qwen.ai` 端点的免费层 OAuth 集成（`qwen-portal`）不再可用。
详情请参见 [Issue #49557](https://github.com/openclaw/openclaw/issues/49557)。

</Warning>

OpenClaw 现在将 Qwen 视为正式捆绑的一级提供商，规范 id 为 `qwen`。捆绑的提供商面向 Qwen Cloud / 阿里云 DashScope 和 Coding Plan 端点，并将旧版 `modelstudio` id 作为兼容别名保留使用。

- 提供商：`qwen`
- 首选环境变量：`QWEN_API_KEY`
- 兼容接受：`MODELSTUDIO_API_KEY`、`DASHSCOPE_API_KEY`
- API 风格：OpenAI 兼容

<Tip>
如果你想使用 `qwen3.6-plus`，优先选择**标准（按量付费）**端点。Coding Plan 支持可能落后于公开目录。
</Tip>

## 快速开始

选择你的套餐类型并按步骤设置。

<Tabs>
  <Tab title="Coding Plan（订阅制）">
    **适合：** 通过 Qwen Coding Plan 进行订阅制访问。

    <Steps>
      <Step title="获取 API 密钥">
        在 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 创建或复制 API 密钥。
      </Step>
      <Step title="运行引导程序">
        对于**全球**端点：

        ```bash
        openclaw onboard --auth-choice qwen-api-key
        ```

        对于**中国**端点：

        ```bash
        openclaw onboard --auth-choice qwen-api-key-cn
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    旧版 `modelstudio-*` 认证选择 id 和 `modelstudio/...` 模型引用仍可作为兼容别名使用，但新设置流程应优先使用规范的 `qwen-*` 认证选择 id 和 `qwen/...` 模型引用。如果你使用其他 `api` 值定义了精确的自定义 `models.providers.modelstudio` 条目，则该自定义提供商拥有 `modelstudio/...` 引用而非 Qwen 兼容别名。
    </Note>

  </Tab>

  <Tab title="标准（按量付费）">
    **适合：** 通过标准 Model Studio 端点按量付费访问，包括 Coding Plan 可能不提供的 `qwen3.6-plus` 等模型。

    <Steps>
      <Step title="获取 API 密钥">
        在 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 创建或复制 API 密钥。
      </Step>
      <Step title="运行引导程序">
        对于**全球**端点：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key
        ```

        对于**中国**端点：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key-cn
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    旧版 `modelstudio-*` 认证选择 id 和 `modelstudio/...` 模型引用仍可作为兼容别名使用，但新设置流程应优先使用规范的 `qwen-*` 认证选择 id 和 `qwen/...` 模型引用。如果你使用其他 `api` 值定义了精确的自定义 `models.providers.modelstudio` 条目，则该自定义提供商拥有 `modelstudio/...` 引用而非 Qwen 兼容别名。
    </Note>

  </Tab>
</Tabs>

## 套餐类型和端点

| 套餐                  | 地区 | 认证选择                   | 端点                                             |
| --------------------- | ---- | -------------------------- | ------------------------------------------------ |
| 标准（按量付费）      | 中国 | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| 标准（按量付费）      | 全球 | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Coding Plan（订阅制） | 中国 | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan（订阅制） | 全球 | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

提供商根据你的认证选择自动选择端点。规范选择使用 `qwen-*` 系列；`modelstudio-*` 仅保留兼容性。你可以在配置中使用自定义 `baseUrl` 进行覆盖。

<Tip>
**管理密钥：** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) |
**文档：** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)
</Tip>

## 内置目录

OpenClaw 目前附带以下捆绑的 Qwen 目录。配置的目录能感知端点：Coding Plan 配置会省略已知仅在标准端点上运行的模型。

| 模型引用                    | 输入        | 上下文    | 备注                         |
| --------------------------- | ----------- | --------- | ---------------------------- |
| `qwen/qwen3.5-plus`         | text、image | 1,000,000 | 默认模型                     |
| `qwen/qwen3.6-plus`         | text、image | 1,000,000 | 需要此模型时优先选择标准端点 |
| `qwen/qwen3-max-2026-01-23` | text        | 262,144   | Qwen Max 系列                |
| `qwen/qwen3-coder-next`     | text        | 262,144   | 编程                         |
| `qwen/qwen3-coder-plus`     | text        | 1,000,000 | 编程                         |
| `qwen/MiniMax-M2.5`         | text        | 1,000,000 | 启用推理                     |
| `qwen/glm-5`                | text        | 202,752   | GLM                          |
| `qwen/glm-4.7`              | text        | 202,752   | GLM                          |
| `qwen/kimi-k2.5`            | text、image | 262,144   | 通过阿里云的 Moonshot AI     |

<Note>
即使模型存在于捆绑目录中，可用性仍可能因端点和账单套餐而有所不同。
</Note>

## 思考控制

对于启用推理的 Qwen Cloud 模型，捆绑的提供商将 OpenClaw 的思考级别映射到 DashScope 的顶层 `enable_thinking` 请求标志。禁用思考发送 `enable_thinking: false`；其他思考级别发送 `enable_thinking: true`。

## 多模态附加功能

`qwen` 插件还在**标准** DashScope 端点（非 Coding Plan 端点）上提供多模态功能：

- 通过 `qwen-vl-max-latest` 进行**视频理解**
- 通过 `wan2.6-t2v`（默认）、`wan2.6-i2v`、`wan2.6-r2v`、`wan2.6-r2v-flash`、`wan2.7-r2v` 进行 **Wan 视频生成**

将 Qwen 设置为默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "qwen/wan2.6-t2v" },
    },
  },
}
```

<Note>
有关共享工具参数、提供商选择和故障转移行为，请参见[视频生成](/tools/video-generation)。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="图像和视频理解">
    捆绑的 Qwen 插件在**标准** DashScope 端点（非 Coding Plan 端点）上注册了图像和视频的媒体理解功能。

    | 属性           | 值                    |
    | ------------- | --------------------- |
    | 模型           | `qwen-vl-max-latest`  |
    | 支持的输入     | 图像、视频            |

    媒体理解会从已配置的 Qwen 认证自动解析——无需额外配置。请确保你使用的是标准（按量付费）端点以支持媒体理解。

  </Accordion>

  <Accordion title="Qwen 3.6 Plus 可用性">
    `qwen3.6-plus` 在标准（按量付费）Model Studio 端点上可用：

    - 中国：`dashscope.aliyuncs.com/compatible-mode/v1`
    - 全球：`dashscope-intl.aliyuncs.com/compatible-mode/v1`

    如果 Coding Plan 端点为 `qwen3.6-plus` 返回"不支持的模型"错误，请切换到标准（按量付费）端点而非 Coding Plan 端点/密钥组合。

    OpenClaw 捆绑的 Qwen 目录不在 Coding Plan 端点上宣传 `qwen3.6-plus`，但在 `models.providers.qwen.models` 下明确配置的 `qwen/qwen3.6-plus` 条目在 Coding Plan baseUrl 上仍会被遵守，因此如果阿里云在你的订阅中启用了该模型，你可以选择加入。上游 API 最终决定调用是否成功。

  </Accordion>

  <Accordion title="功能规划">
    `qwen` 插件正在被定位为完整 Qwen Cloud 功能面的供应商首选，而不仅限于编程/文本模型。

    - **文本/聊天模型：** 现已捆绑
    - **工具调用、结构化输出、思考：** 继承自 OpenAI 兼容传输
    - **图像生成：** 计划在提供商插件层实现
    - **图像/视频理解：** 现已在标准端点上捆绑
    - **语音/音频：** 计划在提供商插件层实现
    - **内存嵌入/重排序：** 计划通过嵌入适配器接口实现
    - **视频生成：** 现已通过共享视频生成功能捆绑

  </Accordion>

  <Accordion title="视频生成详情">
    对于视频生成，OpenClaw 在提交作业之前将配置的 Qwen 地区映射到对应的 DashScope AIGC 主机：

    - 全球/国际：`https://dashscope-intl.aliyuncs.com`
    - 中国：`https://dashscope.aliyuncs.com`

    这意味着指向 Coding Plan 或标准 Qwen 主机的正常 `models.providers.qwen.baseUrl` 仍会将视频生成保持在正确的区域 DashScope 视频端点上。

    当前捆绑的 Qwen 视频生成限制：

    - 每次请求最多 **1** 个输出视频
    - 最多 **1** 张输入图像
    - 最多 **4** 个输入视频
    - 最长 **10 秒**时长
    - 支持 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark`
    - 参考图像/视频模式目前需要**远程 http(s) URL**。由于 DashScope 视频端点不接受这些引用的本地文件缓冲区上传，本地文件路径会被提前拒绝。

  </Accordion>

  <Accordion title="流式使用量兼容性">
    原生 Model Studio 端点在共享的 `openai-completions` 传输上声明流式使用量兼容性。OpenClaw 现在根据端点能力来确定这一点，因此面向相同原生主机的 DashScope 兼容自定义提供商 id 继承相同的流式使用量行为，而不需要专门使用内置的 `qwen` 提供商 id。

    原生流式使用量兼容性适用于 Coding Plan 主机和标准 DashScope 兼容主机：

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="多模态端点区域">
    多模态功能（视频理解和 Wan 视频生成）使用**标准** DashScope 端点，而非 Coding Plan 端点：

    - 全球/国际标准基础 URL：`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - 中国标准基础 URL：`https://dashscope.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="环境和守护进程设置">
    如果 Gateway 作为守护进程（launchd/systemd）运行，请确保 `QWEN_API_KEY` 对该进程可用（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="Alibaba（ModelStudio）" href="/providers/alibaba" icon="cloud">
    旧版 ModelStudio 提供商和迁移说明。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    通用故障排查和常见问题解答。
  </Card>
</CardGroup>
