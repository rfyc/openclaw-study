---
summary: "在 OpenClaw 中使用 StepFun 模型"
read_when:
  - 你想在 OpenClaw 中使用 StepFun 模型
  - 你需要 StepFun 设置指南
title: "StepFun"
---

OpenClaw 包含一个捆绑的 StepFun 提供商插件，具有两个提供商 id：

- `stepfun` 用于标准端点
- `stepfun-plan` 用于 Step Plan 端点

<Warning>
标准和 Step Plan 是**独立的提供商**，具有不同的端点和模型引用前缀（`stepfun/...` 与 `stepfun-plan/...`）。请在 `.com` 端点使用中国密钥，在 `.ai` 端点使用全球密钥。
</Warning>

## 地区和端点概述

| 端点      | 中国（`.com`）                         | 全球（`.ai`）                         |
| --------- | -------------------------------------- | ------------------------------------- |
| 标准      | `https://api.stepfun.com/v1`           | `https://api.stepfun.ai/v1`           |
| Step Plan | `https://api.stepfun.com/step_plan/v1` | `https://api.stepfun.ai/step_plan/v1` |

认证环境变量：`STEPFUN_API_KEY`

## 内置目录

标准（`stepfun`）：

| 模型引用                 | 上下文  | 最大输出 | 备注         |
| ------------------------ | ------- | -------- | ------------ |
| `stepfun/step-3.5-flash` | 262,144 | 65,536   | 默认标准模型 |

Step Plan（`stepfun-plan`）：

| 模型引用                           | 上下文  | 最大输出 | 备注                |
| ---------------------------------- | ------- | -------- | ------------------- |
| `stepfun-plan/step-3.5-flash`      | 262,144 | 65,536   | 默认 Step Plan 模型 |
| `stepfun-plan/step-3.5-flash-2603` | 262,144 | 65,536   | 附加 Step Plan 模型 |

## 快速开始

选择你的提供商类型并按步骤设置。

<Tabs>
  <Tab title="标准">
    **适合：** 通过标准 StepFun 端点进行通用使用。

    <Steps>
      <Step title="选择端点区域">
        | 认证选择                         | 端点                             | 地区          |
        | -------------------------------- | -------------------------------- | ------------- |
        | `stepfun-standard-api-key-intl`  | `https://api.stepfun.ai/v1`     | 国际          |
        | `stepfun-standard-api-key-cn`    | `https://api.stepfun.com/v1`    | 中国          |
      </Step>
      <Step title="运行引导程序">
        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-intl
        ```

        或使用中国端点：

        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-cn
        ```
      </Step>
      <Step title="非交互式替代方案">
        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-intl \
          --stepfun-api-key "$STEPFUN_API_KEY"
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider stepfun
        ```
      </Step>
    </Steps>

    ### 模型引用

    - 默认模型：`stepfun/step-3.5-flash`

  </Tab>

  <Tab title="Step Plan">
    **适合：** Step Plan 推理端点。

    <Steps>
      <Step title="选择端点区域">
        | 认证选择                     | 端点                                    | 地区          |
        | ---------------------------- | --------------------------------------- | ------------- |
        | `stepfun-plan-api-key-intl`  | `https://api.stepfun.ai/step_plan/v1`  | 国际          |
        | `stepfun-plan-api-key-cn`    | `https://api.stepfun.com/step_plan/v1` | 中国          |
      </Step>
      <Step title="运行引导程序">
        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-intl
        ```

        或使用中国端点：

        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-cn
        ```
      </Step>
      <Step title="非交互式替代方案">
        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-intl \
          --stepfun-api-key "$STEPFUN_API_KEY"
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider stepfun-plan
        ```
      </Step>
    </Steps>

    ### 模型引用

    - 默认模型：`stepfun-plan/step-3.5-flash`
    - 备用模型：`stepfun-plan/step-3.5-flash-2603`

  </Tab>
</Tabs>

## 高级配置

<AccordionGroup>
  <Accordion title="完整配置：标准提供商">
    ```json5
    {
      env: { STEPFUN_API_KEY: "your-key" },
      agents: { defaults: { model: { primary: "stepfun/step-3.5-flash" } } },
      models: {
        mode: "merge",
        providers: {
          stepfun: {
            baseUrl: "https://api.stepfun.ai/v1",
            api: "openai-completions",
            apiKey: "${STEPFUN_API_KEY}",
            models: [
              {
                id: "step-3.5-flash",
                name: "Step 3.5 Flash",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="完整配置：Step Plan 提供商">
    ```json5
    {
      env: { STEPFUN_API_KEY: "your-key" },
      agents: { defaults: { model: { primary: "stepfun-plan/step-3.5-flash" } } },
      models: {
        mode: "merge",
        providers: {
          "stepfun-plan": {
            baseUrl: "https://api.stepfun.ai/step_plan/v1",
            api: "openai-completions",
            apiKey: "${STEPFUN_API_KEY}",
            models: [
              {
                id: "step-3.5-flash",
                name: "Step 3.5 Flash",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 65536,
              },
              {
                id: "step-3.5-flash-2603",
                name: "Step 3.5 Flash 2603",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="说明">
    - 该提供商已与 OpenClaw 捆绑，无需单独的插件安装步骤。
    - `step-3.5-flash-2603` 目前仅在 `stepfun-plan` 上提供。
    - 单次认证流程会为 `stepfun` 和 `stepfun-plan` 写入区域匹配的配置文件，因此两个接口可以一起被发现。
    - 使用 `openclaw models list` 和 `openclaw models set <provider/model>` 查看或切换模型。

  </Accordion>
</AccordionGroup>

<Note>
有关更广泛的提供商概述，请参见[模型提供商](/concepts/model-providers)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为概述。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    提供商、模型和插件的完整配置架构。
  </Card>
  <Card title="模型选择" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="StepFun 平台" href="https://platform.stepfun.com" icon="globe">
    StepFun API 密钥管理和文档。
  </Card>
</CardGroup>
