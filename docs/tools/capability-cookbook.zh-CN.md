---
summary: "为 OpenClaw 插件系统添加新共享能力的贡献者指南"
read_when:
  - 添加新的核心能力和插件注册界面
  - 决定代码属于核心、供应商插件还是功能插件
  - 为频道或工具连接新的运行时助手
title: "添加能力（贡献者指南）"
sidebarTitle: "添加能力"
---

<Info>
  这是面向 OpenClaw 核心开发者的**贡献者指南**。如果您在构建外部插件，请参阅[构建插件](/plugins/building-plugins)。
</Info>

当 OpenClaw 需要新领域（如图像生成、视频生成或某些未来的供应商支持功能区域）时，请使用此指南。

规则：

- 插件 = 所有权边界
- 能力 = 共享核心合同

这意味着您不应该从将供应商直接接入频道或工具开始。先定义能力。

## 何时创建能力

当以下所有条件都满足时，创建新能力：

1. 可以想象有多个供应商实现它
2. 频道、工具或功能插件应该无需关心供应商即可使用它
3. 核心需要拥有回退、策略、配置或交付行为

如果工作仅限于某个供应商且尚不存在共享合同，请先停下来定义合同。

## 标准流程

1. 定义类型化的核心合同。
2. 为该合同添加插件注册。
3. 添加共享运行时助手。
4. 接入一个真实的供应商插件作为验证。
5. 将功能/频道消费者迁移到运行时助手上。
6. 添加合同测试。
7. 记录面向运营者的配置和所有权模型。

## 代码放置位置

核心：

- 请求/响应类型
- 提供商注册表 + 解析
- 回退行为
- 配置模式以及在嵌套对象、通配符、数组项和组合节点上传播的 `title` / `description` 文档元数据
- 运行时助手界面

供应商插件：

- 供应商 API 调用
- 供应商认证处理
- 供应商特定请求规范化
- 能力实现的注册

功能/频道插件：

- 调用 `api.runtime.*` 或匹配的 `plugin-sdk/*-runtime` 助手
- 永远不直接调用供应商实现

## 提供商和运行时接缝

当行为属于模型提供商合同而非通用代理循环时，使用提供商钩子。示例包括传输选择后的提供商特定请求参数、认证配置文件偏好、提示叠加以及模型/配置文件故障转移后的后续回退路由。

当行为属于执行轮次的运行时时，使用代理运行时钩子。运行时可以对成功但不可用的尝试结果（如空、仅推理或仅规划响应）进行分类，以便外部模型回退策略可以做出重试决定。

保持两个接缝都很窄：

- 核心拥有重试/回退策略
- 提供商插件拥有特定于提供商的请求/认证/路由提示
- 运行时插件拥有特定于运行时的尝试分类
- 第三方插件返回提示，而不是直接改变核心状态

## 文件检查清单

对于新能力，预计需要修改以下区域：

- `src/<capability>/types.ts`
- `src/<capability>/...registry/runtime.ts`
- `src/plugins/types.ts`
- `src/plugins/registry.ts`
- `src/plugins/captured-registration.ts`
- `src/plugins/contracts/registry.ts`
- `src/plugins/runtime/types-core.ts`
- `src/plugins/runtime/index.ts`
- `src/plugin-sdk/<capability>.ts`
- `src/plugin-sdk/<capability>-runtime.ts`
- 一个或多个捆绑插件包
- 配置/文档/测试

## 示例：图像生成

图像生成遵循标准形式：

1. 核心定义 `ImageGenerationProvider`
2. 核心暴露 `registerImageGenerationProvider(...)`
3. 核心暴露 `runtime.imageGeneration.generate(...)`
4. `openai`、`google`、`fal` 和 `minimax` 插件注册供应商支持的实现
5. 未来的供应商可以注册相同的合同，而无需更改频道/工具

配置键与视觉分析路由分开：

- `agents.defaults.imageModel` = 分析图像
- `agents.defaults.imageGenerationModel` = 生成图像

保持这些分离，以便回退和策略保持明确。

## 审查检查清单

在发布新能力之前，请验证：

- 没有频道/工具直接导入供应商代码
- 运行时助手是共享路径
- 至少有一个合同测试断言捆绑所有权
- 配置文档命名新的模型/配置键
- 插件文档解释所有权边界

如果 PR 跳过能力层并将供应商行为硬编码到频道/工具中，请退回并先定义合同。

## 相关

- [插件](/tools/plugin)
- [创建技能](/tools/creating-skills)
- [工具和插件](/tools)
