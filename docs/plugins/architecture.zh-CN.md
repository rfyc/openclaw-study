---
summary: "插件内部机制：能力模型、所有权、合约、加载流水线和运行时帮助函数"
read_when:
  - 构建或调试原生 OpenClaw 插件
  - 理解插件能力模型或所有权边界
  - 研究插件加载流水线或注册表
  - 实现提供商运行时钩子或频道插件
title: "插件内部机制"
sidebarTitle: "内部机制"
---

这是 OpenClaw 插件系统的**深度架构参考**。如需实践指南，请从以下专题页面开始。

<CardGroup cols={2}>
  <Card title="安装和使用插件" icon="plug" href="/tools/plugin">
    面向终端用户的添加、启用和排查插件问题指南。
  </Card>
  <Card title="构建插件" icon="rocket" href="/plugins/building-plugins">
    包含最小可用清单的第一个插件教程。
  </Card>
  <Card title="频道插件" icon="comments" href="/plugins/sdk-channel-plugins">
    构建消息频道插件。
  </Card>
  <Card title="提供商插件" icon="microchip" href="/plugins/sdk-provider-plugins">
    构建模型提供商插件。
  </Card>
  <Card title="SDK 概览" icon="book" href="/plugins/sdk-overview">
    导入映射和注册 API 参考。
  </Card>
</CardGroup>

## 公开能力模型

能力是 OpenClaw 内部公开的**原生插件**模型。每个原生 OpenClaw 插件都会针对一种或多种能力类型进行注册：

| 能力         | 注册方法                                         | 示例插件                             |
| ------------ | ------------------------------------------------ | ------------------------------------ |
| 文本推理     | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| CLI 推理后端 | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                |
| 语音         | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`            |
| 实时转录     | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| 实时语音     | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| 媒体理解     | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                   |
| 图像生成     | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| 音乐生成     | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| 视频生成     | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| Web 抓取     | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| Web 搜索     | `api.registerWebSearchProvider(...)`             | `google`                             |
| 频道 / 消息  | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |
| Gateway 发现 | `api.registerGatewayDiscoveryService(...)`       | `bonjour`                            |

<Note>
注册零个能力但提供钩子、工具、发现服务或后台服务的插件是**传统仅钩子**插件。该模式仍受到完整支持。
</Note>

### 外部兼容性立场

能力模型目前已落地于核心并由捆绑/原生插件使用，但外部插件兼容性仍需要比"已导出即冻结"更严格的标准。

| 插件情况             | 指南                                                                   |
| -------------------- | ---------------------------------------------------------------------- |
| 现有外部插件         | 保持基于钩子的集成正常工作；这是兼容性基线。                           |
| 新的捆绑/原生插件    | 相比特定供应商的直接访问或新的仅钩子设计，更倾向于显式能力注册。       |
| 外部插件采用能力注册 | 允许，但除非文档标记为稳定，否则将特定能力的辅助接口视为演化中的接口。 |

能力注册是预期的发展方向。传统钩子在过渡期间仍是外部插件最安全的无破坏路径。导出的辅助子路径并非同等重要——相比附带的辅助导出，更倾向于使用文档明确的窄合约。

### 插件形态

OpenClaw 根据插件实际的注册行为（而非静态元数据）将每个已加载的插件归类为一种形态：

<AccordionGroup>
  <Accordion title="plain-capability">
    仅注册一种能力类型（例如仅提供商插件 `mistral`）。
  </Accordion>
  <Accordion title="hybrid-capability">
    注册多种能力类型（例如 `openai` 拥有文本推理、语音、媒体理解和图像生成）。
  </Accordion>
  <Accordion title="hook-only">
    仅注册钩子（有类型或自定义），无能力、工具、命令或服务。
  </Accordion>
  <Accordion title="non-capability">
    注册工具、命令、服务或路由，但无能力。
  </Accordion>
</AccordionGroup>

使用 `openclaw plugins inspect <id>` 查看插件的形态和能力分解。详情请见 [CLI 参考](/cli/plugins#inspect)。

### 传统钩子

`before_agent_start` 钩子作为仅钩子插件的兼容路径仍受支持。现实世界中的传统插件仍依赖它。

方向：

- 保持其正常工作
- 将其标记为传统
- 模型/提供商覆盖工作倾向于使用 `before_model_resolve`
- 提示词修改工作倾向于使用 `before_prompt_build`
- 仅在实际使用量下降且固定测试覆盖证明迁移安全后才移除

### 兼容性信号

当运行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 时，可能会看到以下标签之一：

| 信号                       | 含义                                           |
| -------------------------- | ---------------------------------------------- |
| **config valid**           | 配置解析正常，插件解析成功                     |
| **compatibility advisory** | 插件使用受支持但较旧的模式（例如 `hook-only`） |
| **legacy warning**         | 插件使用了已弃用的 `before_agent_start`        |
| **hard error**             | 配置无效或插件加载失败                         |

`hook-only` 和 `before_agent_start` 今天都不会破坏你的插件：`hook-only` 是建议性的，`before_agent_start` 只触发警告。这些信号也出现在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架构概览

OpenClaw 的插件系统有四个层次：

<Steps>
  <Step title="清单 + 发现">
    OpenClaw 从配置的路径、工作区根目录、全局插件根目录和捆绑插件中查找候选插件。发现首先读取原生 `openclaw.plugin.json` 清单以及受支持的包清单。
  </Step>
  <Step title="启用 + 验证">
    核心决定已发现的插件是启用、禁用、阻止还是被选入独占槽位（如内存）。
  </Step>
  <Step title="运行时加载">
    原生 OpenClaw 插件在进程内加载，并将能力注册到中央注册表。打包的 JavaScript 通过原生 `require` 加载；第三方本地源 TypeScript 是紧急 Jiti 回退。兼容包被规范化为注册表记录，无需导入运行时代码。
  </Step>
  <Step title="接口消费">
    OpenClaw 的其余部分读取注册表以暴露工具、频道、提供商设置、钩子、HTTP 路由、CLI 命令和服务。
  </Step>
</Steps>

对于插件 CLI，根命令发现分为两个阶段：

- 解析时元数据来自 `registerCli(..., { descriptors: [...] })`
- 实际插件 CLI 模块可以保持惰性，在首次调用时注册

这使插件专属的 CLI 代码保留在插件内部，同时仍允许 OpenClaw 在解析之前保留根命令名称。

重要设计边界：

- 清单/配置验证应从**清单/模式元数据**工作，而无需执行插件代码
- 原生能力发现可以加载受信任的插件入口代码以构建非激活注册表快照
- 原生运行时行为来自插件模块的 `register(api)` 路径，其中 `api.registrationMode === "full"`

这种分离使 OpenClaw 能在完整运行时激活之前验证配置、解释缺失/禁用插件，并构建 UI/模式提示。

### 插件元数据快照和查找表

Gateway 启动时为当前配置快照构建一个 `PluginMetadataSnapshot`。快照仅包含元数据：存储已安装插件索引、清单注册表、清单诊断、所有者映射、插件 id 规范化器和清单记录。不保存已加载的插件模块、提供商 SDK、包内容或运行时导出。

插件感知的配置验证、启动自动启用和 Gateway 插件引导使用该快照，而非独立重建清单/索引元数据。`PluginLookUpTable` 从同一快照派生，并添加当前运行时配置的启动插件计划。

启动后，Gateway 将当前元数据快照保持为可替换的运行时产品。重复的运行时提供商发现可以借用该快照，而不是为每次提供商目录传递重新构建已安装索引和清单注册表。当不存在兼容的当前快照时，快照在 Gateway 关闭、配置/插件清单更改和已安装索引写入时清除或替换；调用方回退到冷清单/索引路径。兼容性检查必须包含插件发现根，例如 `plugins.load.paths` 和默认 agent 工作区，因为工作区插件是元数据范围的一部分。

快照和查找表将重复的启动决策保持在快速路径上：

- 频道所有权
- 延迟频道启动
- 启动插件 id
- 提供商和 CLI 后端所有权
- 设置提供商、命令别名、模型目录提供商和清单合约所有权
- 插件配置模式和频道配置模式验证
- 启动自动启用决策

安全边界是快照替换，而不是突变。在配置、插件清单、安装记录或持久化索引策略更改时重建快照。不要将其视为广泛的可变全局注册表，也不要保留无限制的历史快照。运行时插件加载与元数据快照保持分离，以防止过时的运行时状态隐藏在元数据缓存后面。

缓存规则记录在[插件架构内部机制](/plugins/architecture-internals#plugin-cache-boundary)中：清单和发现元数据是新鲜的，除非调用方持有当前流程的显式快照、查找表或清单注册表。隐藏的元数据缓存和挂钟 TTL 不是插件加载的一部分。只有运行时加载器、模块和依赖构件缓存可以在代码或已安装构件实际加载后持久存在。

一些冷路径调用方仍直接从持久化已安装插件索引重建清单注册表，而非接收 Gateway `PluginLookUpTable`。该路径现在按需重建注册表；当调用方已有查找表或显式清单注册表时，倾向于在运行时流中传递当前查找表。

### 激活规划

激活规划是控制平面的一部分。调用方可以在加载更广泛的运行时注册表之前询问哪些插件与具体命令、提供商、频道、路由、agent 线束或能力相关。

规划器保持当前清单行为兼容：

- `activation.*` 字段是显式规划器提示
- `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和钩子保留为清单所有权回退
- 仅 id 的规划器 API 对现有调用方保持可用
- 计划 API 报告原因标签，以便诊断可以区分显式提示和所有权回退

<Warning>
不要将 `activation` 视为生命周期钩子或 `register(...)` 的替代品。它是用于缩小加载范围的元数据。当所有权字段已描述该关系时优先使用所有权字段；仅将 `activation` 用于额外的规划器提示。
</Warning>

### 频道插件和共享消息工具

频道插件不需要为正常聊天操作注册单独的发送/编辑/反应工具。OpenClaw 在核心中保留一个共享的 `message` 工具，频道插件在其背后拥有频道特定的发现和执行。

当前边界为：

- 核心拥有共享 `message` 工具宿主、提示词连接、会话/线程记录和执行调度
- 频道插件拥有作用域操作发现、能力发现以及任何频道特定的模式片段
- 频道插件拥有提供商特定的会话对话语法，例如对话 id 如何编码线程 id 或继承自父对话
- 频道插件通过其操作适配器执行最终操作

对于频道插件，SDK 接口是 `ChannelMessageActionAdapter.describeMessageTool(...)`。该统一发现调用让插件同时返回其可见操作、能力和模式贡献，使这些部分不会发生漂移。

当频道特定的消息工具参数携带媒体源（如本地路径或远程媒体 URL）时，插件还应从 `describeMessageTool(...)` 返回 `mediaSourceParams`。核心使用该显式列表来应用沙盒路径规范化和出站媒体访问提示，而无需硬编码插件拥有的参数名称。优先使用操作范围的映射，而非一个频道宽泛的平面列表，以避免仅属于 profile 的媒体参数在不相关的操作（如 `send`）上被规范化。

核心将运行时作用域传递到该发现步骤中。重要字段包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 受信任的入站 `requesterSenderId`

这对上下文敏感的插件非常重要。频道可以根据活跃账号、当前房间/线程/消息或受信任的请求者身份隐藏或暴露消息操作，而无需在核心 `message` 工具中硬编码频道特定的分支。

这就是为什么嵌入式运行器路由更改仍是插件工作：运行器负责将当前聊天/会话身份转发到插件发现边界，以便共享 `message` 工具为当前轮次暴露正确的频道拥有接口。

对于频道拥有的执行帮助函数，捆绑插件应将执行运行时保留在其自己的扩展模块中。核心不再在 `src/agents/tools` 下拥有 Discord、Slack、Telegram 或 WhatsApp 消息操作运行时。我们不发布单独的 `plugin-sdk/*-action-runtime` 子路径，捆绑插件应直接从其扩展拥有的模块导入自己的本地运行时代码。

同样的边界适用于核心中一般的提供商命名 SDK 接口：核心不应为 Slack、Discord、Signal、WhatsApp 或类似扩展导入频道特定的便利桶。如果核心需要某种行为，要么消费捆绑插件自己的 `api.ts` / `runtime-api.ts` 桶，要么将需求提升为共享 SDK 中的窄通用能力。

捆绑插件遵循同样的规则。捆绑插件的 `runtime-api.ts` 不应重新导出其自己的品牌化 `openclaw/plugin-sdk/<plugin-id>` 外观。这些品牌外观仍是外部插件和旧消费方的兼容垫片，但捆绑插件应使用本地导出加上窄通用 SDK 子路径，如 `openclaw/plugin-sdk/channel-policy`、`openclaw/plugin-sdk/runtime-store` 或 `openclaw/plugin-sdk/webhook-ingress`。除非现有外部生态系统的兼容边界需要，否则新代码不应添加插件 id 特定的 SDK 外观。

对于投票，有两种执行路径：

- `outbound.sendPoll` 是适合常见投票模型的频道的共享基线
- `actions.handleAction("poll")` 是频道特定投票语义或额外投票参数的首选路径

核心现在推迟共享投票解析，直到插件投票调度拒绝该操作之后，以便插件拥有的投票处理程序可以接受频道特定的投票字段，而不会先被通用投票解析器阻止。

有关完整启动序列，请参见[插件架构内部机制](/plugins/architecture-internals)。

## 能力所有权模型

OpenClaw 将原生插件视为**公司**或**功能**的所有权边界，而非不相关集成的杂包。

这意味着：

- 公司插件通常应拥有该公司所有面向 OpenClaw 的接口
- 功能插件通常应拥有其引入的完整功能接口
- 频道应消费共享核心能力，而非临时重新实现提供商行为

<AccordionGroup>
  <Accordion title="供应商多能力">
    `openai` 拥有文本推理、语音、实时语音、媒体理解和图像生成。`google` 拥有文本推理加上媒体理解、图像生成和 Web 搜索。`qwen` 拥有文本推理加上媒体理解和视频生成。
  </Accordion>
  <Accordion title="供应商单一能力">
    `elevenlabs` 和 `microsoft` 拥有语音；`firecrawl` 拥有 Web 抓取；`minimax` / `mistral` / `moonshot` / `zai` 拥有媒体理解后端。
  </Accordion>
  <Accordion title="功能插件">
    `voice-call` 拥有通话传输、工具、CLI、路由和 Twilio 媒体流桥接，但消费共享语音、实时转录和实时语音能力，而非直接导入供应商插件。
  </Accordion>
</AccordionGroup>

预期的最终状态是：

- OpenAI 存在于一个插件中，即使它跨越文本模型、语音、图像和未来的视频
- 其他供应商可以为其自己的接口区域做同样的事情
- 频道不关心哪个供应商插件拥有提供商；它们消费核心暴露的共享能力合约

这是关键区别：

- **插件** = 所有权边界
- **能力** = 多个插件可以实现或消费的核心合约

因此，如果 OpenClaw 添加视频等新领域，第一个问题不是"哪个提供商应该硬编码视频处理？"第一个问题是"核心视频能力合约是什么？"一旦该合约存在，供应商插件可以注册实现，频道/功能插件可以消费它。

如果能力尚不存在，正确的做法通常是：

<Steps>
  <Step title="定义能力">
    在核心中定义缺失的能力。
  </Step>
  <Step title="通过 SDK 暴露">
    以类型化方式通过插件 API/运行时暴露它。
  </Step>
  <Step title="连接消费方">
    将频道/功能连接到该能力。
  </Step>
  <Step title="供应商实现">
    让供应商插件注册实现。
  </Step>
</Steps>

这在保持所有权明确的同时，避免了依赖单一供应商或一次性插件特定代码路径的核心行为。

### 能力分层

使用以下思维模型决定代码归属：

<Tabs>
  <Tab title="核心能力层">
    共享编排、策略、回退、配置合并规则、交付语义和类型化合约。
  </Tab>
  <Tab title="供应商插件层">
    供应商特定的 API、认证、模型目录、语音合成、图像生成、未来视频后端、使用量端点。
  </Tab>
  <Tab title="频道/功能插件层">
    消费核心能力并在接口上呈现它们的 Slack / Discord / voice-call 等集成。
  </Tab>
</Tabs>

例如，TTS 遵循以下形态：

- 核心拥有回复时 TTS 策略、回退顺序、偏好和频道交付
- `openai`、`elevenlabs` 和 `microsoft` 拥有合成实现
- `voice-call` 消费电话 TTS 运行时帮助函数

同样的模式应用于未来的能力。

### 多能力公司插件示例

公司插件从外部看应该是一个整体。如果 OpenClaw 对模型、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、Web 抓取和 Web 搜索有共享合约，供应商可以在一个地方拥有其所有接口：

```ts
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk/plugin-entry";
import {
  describeImageWithModel,
  transcribeOpenAiCompatibleAudio,
} from "openclaw/plugin-sdk/media-understanding";

const plugin: OpenClawPluginDefinition = {
  id: "exampleai",
  name: "ExampleAI",
  register(api) {
    api.registerProvider({
      id: "exampleai",
      // auth/model catalog/runtime hooks
    });

    api.registerSpeechProvider({
      id: "exampleai",
      // vendor speech config — implement the SpeechProviderPlugin interface directly
    });

    api.registerMediaUnderstandingProvider({
      id: "exampleai",
      capabilities: ["image", "audio", "video"],
      async describeImage(req) {
        return describeImageWithModel({
          provider: "exampleai",
          model: req.model,
          input: req.input,
        });
      },
      async transcribeAudio(req) {
        return transcribeOpenAiCompatibleAudio({
          provider: "exampleai",
          model: req.model,
          input: req.input,
        });
      },
    });

    api.registerWebSearchProvider(
      createPluginBackedWebSearchProvider({
        id: "exampleai-search",
        // credential + fetch logic
      }),
    );
  },
};

export default plugin;
```

重要的不是确切的帮助函数名称，而是形态：

- 一个插件拥有供应商接口
- 核心仍拥有能力合约
- 频道和功能插件消费 `api.runtime.*` 帮助函数，而非供应商代码
- 合约测试可以断言插件注册了其声称拥有的能力

### 能力示例：视频理解

OpenClaw 已将图像/音频/视频理解视为一种共享能力。同样的所有权模型适用于此：

<Steps>
  <Step title="核心定义合约">
    核心定义媒体理解合约。
  </Step>
  <Step title="供应商插件注册">
    供应商插件根据适用情况注册 `describeImage`、`transcribeAudio` 和 `describeVideo`。
  </Step>
  <Step title="消费方使用共享行为">
    频道和功能插件消费共享核心行为，而非直接连接到供应商代码。
  </Step>
</Steps>

这避免了将某一提供商的视频假设硬编码到核心中。插件拥有供应商接口；核心拥有能力合约和回退行为。

视频生成已使用同样的序列：核心拥有类型化能力合约和运行时帮助函数，供应商插件针对其注册 `api.registerVideoGenerationProvider(...)` 实现。

需要具体的推出清单？请参见[能力食谱](/tools/capability-cookbook)。

## 合约与强制执行

插件 API 接口有意在 `OpenClawPluginApi` 中类型化且集中化。该合约定义了受支持的注册点以及插件可以依赖的运行时帮助函数。

重要原因：

- 插件作者获得一个稳定的内部标准
- 核心可以拒绝重复所有权，例如两个插件注册相同的提供商 id
- 启动可以对格式错误的注册提供可操作的诊断
- 合约测试可以强制执行捆绑插件所有权并防止静默漂移

有两层强制执行：

<AccordionGroup>
  <Accordion title="运行时注册强制执行">
    插件注册表在插件加载时验证注册。例如：重复的提供商 id、重复的语音提供商 id 和格式错误的注册会产生插件诊断而不是未定义行为。
  </Accordion>
  <Accordion title="合约测试">
    捆绑插件在测试运行期间被捕获到合约注册表中，以便 OpenClaw 可以明确断言所有权。目前用于模型提供商、语音提供商、Web 搜索提供商和捆绑注册所有权。
  </Accordion>
</AccordionGroup>

实际效果是 OpenClaw 预先知道哪个插件拥有哪个接口。这让核心和频道可以无缝组合，因为所有权是声明的、类型化的且可测试的，而非隐式的。

### 合约中应包含什么

<Tabs>
  <Tab title="好的合约">
    - 类型化
    - 小型
    - 能力特定
    - 由核心拥有
    - 可被多个插件复用
    - 可被频道/功能在不了解供应商的情况下消费

  </Tab>
  <Tab title="差的合约">
    - 隐藏在核心中的供应商特定策略
    - 绕过注册表的一次性插件逃逸舱口
    - 频道代码直接访问供应商实现
    - 不属于 `OpenClawPluginApi` 或 `api.runtime` 的临时运行时对象

  </Tab>
</Tabs>

有疑问时，提高抽象级别：先定义能力，然后让插件接入它。

## 执行模型

原生 OpenClaw 插件**在进程内**与 Gateway 一起运行。它们不受沙盒限制。已加载的原生插件具有与核心代码相同的进程级信任边界。

<Warning>
原生插件含义：插件可以注册工具、网络处理程序、钩子和服务；插件错误可能导致 Gateway 崩溃或不稳定；恶意原生插件相当于在 OpenClaw 进程内的任意代码执行。
</Warning>

兼容包在默认情况下更安全，因为 OpenClaw 目前将其视为元数据/内容包。在当前版本中，这主要指捆绑技能。

对非捆绑插件使用允许列表和显式安装/加载路径。将工作区插件视为开发时代码，而非生产默认值。

对于捆绑工作区包名称，将插件 id 锚定在 npm 名称中：默认情况下为 `@openclaw/<id>`，或在包有意暴露更窄插件角色时使用经批准的类型后缀，如 `-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`。

<Note>
**信任说明：** `plugins.allow` 信任**插件 id**，而非源头出处。当工作区插件被启用/允许时，与捆绑插件具有相同 id 的工作区插件有意覆盖捆绑副本。这对于本地开发、补丁测试和热修复是正常且有用的。捆绑插件信任从源快照解析——加载时磁盘上的清单和代码——而非从安装元数据解析。损坏或替换的安装记录无法静默地将捆绑插件的信任面扩展到实际源声明之外。
</Note>

## 导出边界

OpenClaw 导出能力，而非实现便利性。

保持能力注册公开。精简非合约辅助导出：

- 捆绑插件特定的辅助子路径
- 不打算作为公共 API 的运行时管道子路径
- 供应商特定的便利帮助函数
- 属于实现细节的设置/引导帮助函数

保留的捆绑插件辅助子路径已从生成的 SDK 导出映射中退役。将所有者特定的帮助函数保留在拥有插件包内；只将可复用的宿主行为提升到通用 SDK 合约中，如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和 `plugin-sdk/plugin-config-runtime`。

## 内部机制与参考

有关加载流水线、注册表模型、提供商运行时钩子、Gateway HTTP 路由、消息工具模式、频道目标解析、提供商目录、上下文引擎插件以及添加新能力的指南，请参见[插件架构内部机制](/plugins/architecture-internals)。

## 相关文档

- [构建插件](/plugins/building-plugins)
- [插件清单](/plugins/manifest)
- [插件 SDK 设置](/plugins/sdk-setup)
