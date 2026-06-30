---
summary: "插件架构内部：加载管道、注册表、运行时钩子、HTTP 路由和参考表"
read_when:
  - 实现提供商运行时钩子、频道生命周期或包集合
  - 调试插件加载顺序或注册表状态
  - 添加新的插件能力或上下文引擎插件
title: "插件架构内部"
---

有关公共能力模型、插件形状和所有权/执行合约，请参见[插件架构](/plugins/architecture)。本页面是内部机制的参考：加载管道、注册表、运行时钩子、Gateway HTTP 路由、导入路径和 schema 表。

## 加载管道

在启动时，OpenClaw 大致执行以下操作：

1. 发现候选插件根目录
2. 读取原生或兼容的包清单和包元数据
3. 拒绝不安全的候选
4. 规范化插件配置（`plugins.enabled`、`allow`、`deny`、`entries`、`slots`、`load.paths`）
5. 决定每个候选的启用状态
6. 加载已启用的原生模块：构建的捆绑模块使用原生加载器；第三方本地源 TypeScript 使用紧急 Jiti 回退
7. 调用原生 `register(api)` 钩子并将注册收集到插件注册表中
8. 将注册表公开给命令/运行时界面

<Note>
`activate` 是 `register` 的旧版别名——加载器解析哪个存在（`def.register ?? def.activate`）并在同一点调用它。所有捆绑插件使用 `register`；新插件优先使用 `register`。
</Note>

安全门在运行时执行**之前**发生。当入口逃离插件根目录、路径是全局可写的，或路径所有权对于非捆绑插件看起来可疑时，候选被阻止。

被阻止的候选仍然与其插件 id 绑定以进行诊断。如果配置仍然引用该 id，验证将插件报告为存在但被阻止，并指向路径安全警告，而不是将配置条目视为过期。

### 清单优先行为

清单是控制平面的事实来源。OpenClaw 使用它来：

- 识别插件
- 发现声明的频道/技能/配置 schema 或包能力
- 验证 `plugins.entries.<id>.config`
- 增强控制 UI 标签/占位符
- 显示安装/目录元数据
- 在不加载插件运行时的情况下保留廉价的激活和设置描述符

对于原生插件，运行时模块是数据平面部分。它注册实际行为，如钩子、工具、命令或提供商流程。

可选的清单 `activation` 和 `setup` 块保留在控制平面上。它们是仅用于激活规划和设置发现的元数据描述符；它们不替换运行时注册、`register(...)` 或 `setupEntry`。第一批实时激活消费者现在使用清单命令、频道和提供商提示来在更广泛的注册表具体化之前缩小插件加载范围：

- CLI 加载缩小到拥有所请求主命令的插件
- 频道设置/插件解析缩小到拥有所请求频道 id 的插件
- 显式提供商设置/运行时解析缩小到拥有所请求提供商 id 的插件
- Gateway 启动规划使用 `activation.onStartup` 进行显式启动导入和启动退出；没有启动元数据的插件仅通过更窄的激活触发器加载

请求时运行时预加载（请求宽泛 `all` 范围）仍然从配置、启动规划、已配置频道、插槽和自动启用规则派生显式的有效插件 id 集合。如果该派生集合为空，OpenClaw 加载空运行时注册表，而不是扩展到每个可发现的插件。

激活规划器公开了现有调用者的仅 ids API 和新诊断的计划 API。计划条目报告插件被选择的原因，将显式的 `activation.*` 规划器提示与清单所有权回退（如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和钩子）分开。该原因分割是兼容性边界：现有插件元数据保持工作，而新代码可以检测宽泛提示或回退行为而不更改运行时加载语义。

设置发现现在优先使用描述符拥有的 id（如 `setup.providers` 和 `setup.cliBackends`）来在候选插件中缩小范围，然后再回退到仍需要设置时运行时钩子的插件的 `setup-api`。提供商设置列表使用清单 `providerAuthChoices`、描述符派生的设置选项和安装目录元数据，而不加载提供商运行时。显式 `setup.requiresRuntime: false` 是仅描述符的截止点；省略的 `requiresRuntime` 保留旧版 setup-api 回退以进行兼容性。如果多个发现的插件声明相同的规范化设置提供商或 CLI 后端 id，设置查找拒绝模糊的所有者，而不是依赖发现顺序。当设置运行时确实执行时，注册表诊断报告 `setup.providers` / `setup.cliBackends` 与 setup-api 注册的提供商或 CLI 后端之间的漂移，而不阻止旧版插件。

### 插件缓存边界

OpenClaw 不会在时钟窗口后面缓存插件发现结果或直接清单注册表数据。安装、清单编辑和加载路径更改必须在下一次显式元数据读取或快照重建时变为可见。清单文件解析器可能保留以打开的清单路径、inode、大小和时间戳为键的有界文件签名缓存；该缓存只避免重新解析未更改的字节，不得缓存发现、注册表、所有者或策略答案。

安全的元数据快速路径是显式对象所有权，而不是隐藏缓存。Gateway 启动热路径应该通过调用链传递当前的 `PluginMetadataSnapshot`、派生的 `PluginLookUpTable` 或显式清单注册表。配置验证、启动自动启用、插件引导和提供商选择可以在它们代表当前配置和插件清单时复用这些对象。设置查找仍然按需重建清单元数据，除非特定设置路径接收显式清单注册表；将其保留为冷路径回退而不是添加隐藏查找缓存。当输入更改时，重建并替换快照，而不是修改它或保留历史副本。活跃插件注册表和捆绑频道引导助手的视图应该从当前注册表/根重新计算。短暂映射在一次调用内对去重工作或保护重入是可以的；它们不得成为进程元数据缓存。

对于插件加载，持久缓存层是运行时加载。它可能在代码或已安装制品实际加载时复用加载器状态，例如：

- `PluginLoaderCacheState` 和兼容的活跃运行时注册表
- jiti/模块缓存和公共界面加载器缓存，用于避免重复导入相同的运行时界面
- 已安装插件制品的文件系统缓存
- 用于路径规范化或重复解析的短暂每次调用映射

这些缓存是数据平面实现细节。除非调用者故意请求运行时加载，否则它们不得回答控制平面问题，如"哪个插件拥有这个提供商？"。

不要为以下内容添加持久或时钟缓存：

- 发现结果
- 直接清单注册表
- 从已安装插件索引重建的清单注册表
- 提供商所有者查找、模型抑制、提供商策略或公共制品元数据
- 清单派生答案中，更改的清单、已安装索引或加载路径应该在下一次元数据读取时可见的任何内容

从持久化已安装插件索引重建清单元数据的调用者按需重建该注册表。已安装索引是持久的源平面状态；它不是隐藏的进程内元数据缓存。

## 注册表模型

已加载的插件不直接修改随机核心全局变量。它们注册到中央插件注册表中。

注册表跟踪：

- 插件记录（身份、源、来源、状态、诊断）
- 工具
- 旧版钩子和类型化钩子
- 频道
- 提供商
- 网关 RPC 处理器
- HTTP 路由
- CLI 注册器
- 后台服务
- 插件拥有的命令

核心功能然后从该注册表读取，而不是直接与插件模块交互。这保持加载的单向性：

- 插件模块 -> 注册表注册
- 核心运行时 -> 注册表消费

这种分离对可维护性很重要。这意味着大多数核心界面只需要一个集成点："读取注册表"，而不是"为每个插件模块添加特殊处理"。

## 会话绑定回调

绑定会话的插件可以在批准解析时做出反应。

使用 `api.onConversationBindingResolved(...)` 在绑定请求被批准或拒绝后接收回调：

```ts
export default {
  id: "my-plugin",
  register(api) {
    api.onConversationBindingResolved(async (event) => {
      if (event.status === "approved") {
        // A binding now exists for this plugin + conversation.
        console.log(event.binding?.conversationId);
        return;
      }

      // The request was denied; clear any local pending state.
      console.log(event.request.conversation.conversationId);
    });
  },
};
```

回调有效载荷字段：

- `status`：`"approved"` 或 `"denied"`
- `decision`：`"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`：批准请求的已解析绑定
- `request`：原始请求摘要、分离提示、发送方 id 和会话元数据

此回调仅用于通知。它不更改谁被允许绑定会话，并且在核心批准处理完成后运行。

## 提供商运行时钩子

提供商插件有三层：

- **清单元数据**用于廉价的运行时前查找：`setup.providers[].envVars`、已弃用的兼容性 `providerAuthEnvVars`、`providerAuthAliases`、`providerAuthChoices` 和 `channelEnvVars`。
- **配置时钩子**：`catalog`（旧版 `discovery`）加上 `applyConfigDefaults`。
- **运行时钩子**：40+ 个可选钩子，覆盖认证、模型解析、流包装、思考级别、重放策略和使用端点。请参见[钩子顺序和使用](#hook-order-and-usage)下的完整列表。

OpenClaw 仍然拥有通用 agent 循环、故障转移、转录处理和工具策略。这些钩子是特定于提供商的行为的扩展界面，不需要完整的自定义推理传输。

当提供商具有通用认证/状态/模型选择器路径应该在不加载插件运行时的情况下看到的基于环境的凭据时，使用清单 `setup.providers[].envVars`。已弃用的 `providerAuthEnvVars` 在弃用窗口期间仍由兼容性适配器读取，使用它的非捆绑插件会收到清单诊断。当一个提供商 id 应该复用另一个提供商 id 的环境变量、认证配置文件、配置支持的认证和 API 密钥引导选项时，使用清单 `providerAuthAliases`。当引导/认证选择 CLI 界面应该在不加载提供商运行时的情况下知道提供商的选项 id、组标签和简单的单标志认证连接时，使用清单 `providerAuthChoices`。保留提供商运行时 `envVars` 用于面向运营商的提示，如引导标签或 OAuth 客户端 id/客户端密钥设置变量。

当频道具有通用 shell 环境回退、配置/状态检查或设置提示应该在不加载频道运行时的情况下看到的环境驱动认证或设置时，使用清单 `channelEnvVars`。

### 钩子顺序和使用

对于模型/提供商插件，OpenClaw 大致按此顺序调用钩子。"何时使用"列是快速决策指南。OpenClaw 不再调用的兼容性专用提供商字段（如 `ProviderPlugin.capabilities` 和 `suppressBuiltInModel`）故意不在此处列出。

| #   | 钩子                              | 作用                                                                                        | 何时使用                                                                                          |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | 在 `models.json` 生成期间将提供商配置发布到 `models.providers`                              | 提供商拥有目录或基础 URL 默认值                                                                   |
| 2   | `applyConfigDefaults`             | 在配置具体化期间应用提供商拥有的全局配置默认值                                              | 默认值取决于认证模式、环境或提供商模型系列语义                                                    |
| --  | _(内置模型查找)_                  | OpenClaw 首先尝试正常的注册表/目录路径                                                      | _(不是插件钩子)_                                                                                  |
| 3   | `normalizeModelId`                | 在查找之前规范化旧版或预览模型 id 别名                                                      | 提供商在规范模型解析之前拥有别名清理                                                              |
| 4   | `normalizeTransport`              | 在通用模型组装之前规范化提供商系列 `api` / `baseUrl`                                        | 提供商在同一传输系列中拥有自定义提供商 id 的传输清理                                              |
| 5   | `normalizeConfig`                 | 在运行时/提供商解析之前规范化 `models.providers.<id>`                                       | 提供商需要应该与插件一起存在的配置清理；捆绑的 Google 系列助手也支持受支持的 Google 配置条目      |
| 6   | `applyNativeStreamingUsageCompat` | 将原生流使用兼容性重写应用于配置提供商                                                      | 提供商需要端点驱动的原生流使用元数据修复                                                          |
| 7   | `resolveConfigApiKey`             | 在运行时认证加载之前解析配置提供商的环境标记认证                                            | 提供商具有提供商拥有的环境标记 API 密钥解析；`amazon-bedrock` 在此处也有内置的 AWS 环境标记解析器 |
| 8   | `resolveSyntheticAuth`            | 在不持久化明文的情况下呈现本地/自托管或配置支持的认证                                       | 提供商可以使用合成/本地凭据标记运行                                                               |
| 9   | `resolveExternalAuthProfiles`     | 叠加提供商拥有的外部认证配置文件；默认 `persistence` 对 CLI/应用拥有的凭据是 `runtime-only` | 提供商复用外部认证凭据而不持久化复制的刷新令牌；在清单中声明 `contracts.externalAuthProviders`    |
| 10  | `shouldDeferSyntheticProfileAuth` | 将存储的合成配置文件占位符降低到环境/配置支持的认证之后                                     | 提供商存储不应获得优先权的合成占位符配置文件                                                      |
| 11  | `resolveDynamicModel`             | 尚未在本地注册表中的提供商拥有的模型 id 的同步回退                                          | 提供商接受任意上游模型 id                                                                         |
| 12  | `prepareDynamicModel`             | 异步预热，然后再次运行 `resolveDynamicModel`                                                | 提供商在解析未知 id 之前需要网络元数据                                                            |
| 13  | `normalizeResolvedModel`          | 在嵌入式运行器使用解析的模型之前进行最终重写                                                | 提供商需要传输重写但仍使用核心传输                                                                |
| 14  | `contributeResolvedModelCompat`   | 为另一个兼容传输背后的供应商模型贡献兼容标志                                                | 提供商在代理传输上识别其自己的模型而不接管提供商                                                  |
| 15  | `normalizeToolSchemas`            | 在嵌入式运行器看到工具 schemas 之前规范化它们                                               | 提供商需要传输系列 schema 清理                                                                    |
| 16  | `inspectToolSchemas`              | 规范化后呈现提供商拥有的 schema 诊断                                                        | 提供商希望关键字警告而不教核心提供商特定规则                                                      |
| 17  | `resolveReasoningOutputMode`      | 选择原生与标记推理输出合约                                                                  | 提供商需要标记的推理/最终输出而不是原生字段                                                       |
| 18  | `prepareExtraParams`              | 在通用流选项包装器之前的请求参数规范化                                                      | 提供商需要默认请求参数或每提供商参数清理                                                          |
| 19  | `createStreamFn`                  | 用自定义传输完全替换正常的流路径                                                            | 提供商需要自定义线路协议，而不仅仅是包装器                                                        |
| 20  | `wrapStreamFn`                    | 应用通用包装器后的流包装器                                                                  | 提供商需要请求头/正文/模型兼容性包装器而不需要自定义传输                                          |
| 21  | `resolveTransportTurnState`       | 附加原生每轮传输头或元数据                                                                  | 提供商希望通用传输发送提供商原生轮次身份                                                          |
| 22  | `resolveWebSocketSessionPolicy`   | 附加原生 WebSocket 头或会话冷却策略                                                         | 提供商希望通用 WS 传输调整会话头或回退策略                                                        |
| 23  | `formatApiKey`                    | 认证配置文件格式化器：存储的配置文件变为运行时 `apiKey` 字符串                              | 提供商存储额外的认证元数据并需要自定义运行时令牌形状                                              |
| 24  | `refreshOAuth`                    | 自定义刷新端点或刷新失败策略的 OAuth 刷新覆盖                                               | 提供商不适合共享的 `pi-ai` 刷新器                                                                 |
| 25  | `buildAuthDoctorHint`             | OAuth 刷新失败时附加的修复提示                                                              | 提供商需要刷新失败后的提供商拥有的认证修复指南                                                    |
| 26  | `matchesContextOverflowError`     | 提供商拥有的上下文窗口溢出匹配器                                                            | 提供商有通用启发式会遗漏的原始溢出错误                                                            |
| 27  | `classifyFailoverReason`          | 提供商拥有的故障转移原因分类                                                                | 提供商可以将原始 API/传输错误映射到速率限制/过载等                                                |
| 28  | `isCacheTtlEligible`              | 代理/回程提供商的提示缓存策略                                                               | 提供商需要代理特定的缓存 TTL 门控                                                                 |
| 29  | `buildMissingAuthMessage`         | 替换通用的缺少认证恢复消息                                                                  | 提供商需要提供商特定的缺少认证恢复提示                                                            |
| 30  | `augmentModelCatalog`             | 发现后附加的合成/最终目录行                                                                 | 提供商需要 `models list` 和选择器中的合成前向兼容行                                               |
| 31  | `resolveThinkingProfile`          | 模型特定的 `/think` 级别集、显示标签和默认值                                                | 提供商为所选模型公开自定义思考梯级或二进制标签                                                    |
| 32  | `isBinaryThinking`                | 开/关推理切换兼容性钩子                                                                     | 提供商仅公开二进制思考开/关                                                                       |
| 33  | `supportsXHighThinking`           | `xhigh` 推理支持兼容性钩子                                                                  | 提供商希望 `xhigh` 仅在模型子集上                                                                 |
| 34  | `resolveDefaultThinkingLevel`     | 默认 `/think` 级别兼容性钩子                                                                | 提供商拥有模型系列的默认 `/think` 策略                                                            |
| 35  | `isModernModelRef`                | 用于实时配置文件过滤器和冒烟选择的现代模型匹配器                                            | 提供商拥有实时/冒烟首选模型匹配                                                                   |
| 36  | `prepareRuntimeAuth`              | 在推理之前将配置的凭据交换为实际的运行时令牌/密钥                                           | 提供商需要令牌交换或短期请求凭据                                                                  |
| 37  | `resolveUsageAuth`                | 解析 `/usage` 和相关状态界面的使用/计费凭据                                                 | 提供商需要自定义使用/配额令牌解析或不同的使用凭据                                                 |
| 38  | `fetchUsageSnapshot`              | 在认证解析后获取和规范化提供商特定的使用/配额快照                                           | 提供商需要提供商特定的使用端点或有效载荷解析器                                                    |
| 39  | `createEmbeddingProvider`         | 为内存/搜索构建提供商拥有的嵌入适配器                                                       | 内存嵌入行为属于提供商插件                                                                        |
| 40  | `buildReplayPolicy`               | 返回控制提供商转录处理的重放策略                                                            | 提供商需要自定义转录策略（例如，思考块剥离）                                                      |
| 41  | `sanitizeReplayHistory`           | 通用转录清理后重写重放历史                                                                  | 提供商需要超出共享压缩助手的提供商特定重放重写                                                    |
| 42  | `validateReplayTurns`             | 嵌入式运行器之前的最终重放轮次验证或重塑                                                    | 提供商传输在通用清理后需要更严格的轮次验证                                                        |
| 43  | `onModelSelected`                 | 运行提供商拥有的后选择副作用                                                                | 提供商在模型变为活跃时需要遥测或提供商拥有的状态                                                  |

`normalizeModelId`、`normalizeTransport` 和 `normalizeConfig` 首先检查匹配的提供商插件，然后回退到其他支持钩子的提供商插件，直到一个实际更改模型 id 或传输/配置。这使别名/兼容提供商垫片在不要求调用者知道哪个捆绑插件拥有重写的情况下工作。如果没有提供商钩子重写受支持的 Google 系列配置条目，捆绑的 Google 配置规范化器仍然应用该兼容性清理。

如果提供商需要完全自定义的线路协议或自定义请求执行器，那是不同类别的扩展。这些钩子适用于仍然在 OpenClaw 正常推理循环上运行的提供商行为。

### 提供商示例

```ts
api.registerProvider({
  id: "example-proxy",
  label: "Example Proxy",
  auth: [],
  catalog: {
    order: "simple",
    run: async (ctx) => {
      const apiKey = ctx.resolveProviderApiKey("example-proxy").apiKey;
      if (!apiKey) {
        return null;
      }
      return {
        provider: {
          baseUrl: "https://proxy.example.com/v1",
          apiKey,
          api: "openai-completions",
          models: [{ id: "auto", name: "Auto" }],
        },
      };
    },
  },
  resolveDynamicModel: (ctx) => ({
    id: ctx.modelId,
    name: ctx.modelId,
    provider: "example-proxy",
    api: "openai-completions",
    baseUrl: "https://proxy.example.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  }),
  prepareRuntimeAuth: async (ctx) => {
    const exchanged = await exchangeToken(ctx.apiKey);
    return {
      apiKey: exchanged.token,
      baseUrl: exchanged.baseUrl,
      expiresAt: exchanged.expiresAt,
    };
  },
  resolveUsageAuth: async (ctx) => {
    const auth = await ctx.resolveOAuthToken();
    return auth ? { token: auth.token } : null;
  },
  fetchUsageSnapshot: async (ctx) => {
    return await fetchExampleProxyUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn);
  },
});
```

### 内置示例

捆绑的提供商插件组合上面的钩子以满足每个供应商的目录、认证、思考、重放和使用需求。权威的钩子集与每个插件一起位于 `extensions/` 下；本页面说明形状而不是镜像列表。

<AccordionGroup>
  <Accordion title="透传目录提供商">
    OpenRouter、Kilocode、Z.AI、xAI 注册 `catalog` 加上 `resolveDynamicModel` / `prepareDynamicModel`，以便它们可以在 OpenClaw 的静态目录之前呈现上游模型 id。
  </Accordion>
  <Accordion title="OAuth 和使用端点提供商">
    GitHub Copilot、Gemini CLI、ChatGPT Codex、MiniMax、Xiaomi、z.ai 将 `prepareRuntimeAuth` 或 `formatApiKey` 与 `resolveUsageAuth` + `fetchUsageSnapshot` 配对，以拥有令牌交换和 `/usage` 集成。
  </Accordion>
  <Accordion title="重放和转录清理系列">
    共享的命名系列（`google-gemini`、`passthrough-gemini`、`anthropic-by-model`、`hybrid-anthropic-openai`）让提供商通过 `buildReplayPolicy` 选择转录策略，而不是每个插件重新实现清理。
  </Accordion>
  <Accordion title="仅目录提供商">
    `byteplus`、`cloudflare-ai-gateway`、`huggingface`、`kimi-coding`、`nvidia`、`qianfan`、`synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine` 仅注册 `catalog` 并使用共享推理循环。
  </Accordion>
  <Accordion title="Anthropic 特定流助手">
    Beta 头、`/fast` / `serviceTier` 和 `context1m` 位于 Anthropic 插件的公共 `api.ts` / `contract-api.ts` 接口（`wrapAnthropicProviderStream`、`resolveAnthropicBetas`、`resolveAnthropicFastMode`、`resolveAnthropicServiceTier`）内，而不是在通用 SDK 中。
  </Accordion>
</AccordionGroup>

## 运行时助手

插件可以通过 `api.runtime` 访问选定的核心助手。对于 TTS：

```ts
const clip = await api.runtime.tts.textToSpeech({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const voices = await api.runtime.tts.listVoices({
  provider: "elevenlabs",
  cfg: api.config,
});
```

说明：

- `textToSpeech` 返回用于文件/语音备注界面的正常核心 TTS 输出有效载荷。
- 使用核心 `messages.tts` 配置和提供商选择。
- 返回 PCM 音频缓冲区 + 采样率。插件必须为提供商重新采样/编码。
- `listVoices` 对每个提供商是可选的。将其用于供应商拥有的语音选择器或设置流程。
- 语音列表可以包含更丰富的元数据，如区域设置、性别和个性标签，用于供应商感知的选择器。
- OpenAI 和 ElevenLabs 今天支持电话。Microsoft 不支持。

插件还可以通过 `api.registerSpeechProvider(...)` 注册语音提供商。

```ts
api.registerSpeechProvider({
  id: "acme-speech",
  label: "Acme Speech",
  isConfigured: ({ config }) => Boolean(config.messages?.tts),
  synthesize: async (req) => {
    return {
      audioBuffer: Buffer.from([]),
      outputFormat: "mp3",
      fileExtension: ".mp3",
      voiceCompatible: false,
    };
  },
});
```

说明：

- 在核心中保留 TTS 策略、回退和回复传递。
- 将语音提供商用于供应商拥有的合成行为。
- 旧版 Microsoft `edge` 输入被规范化为 `microsoft` 提供商 id。
- 首选的所有权模型是面向公司的：一个供应商插件可以拥有文本、语音、图像和 OpenClaw 添加的未来媒体提供商，作为这些能力合约。

对于图像/音频/视频理解，插件注册一个类型化的媒体理解提供商，而不是通用的键/值包：

```ts
api.registerMediaUnderstandingProvider({
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: async (req) => ({ text: "..." }),
  transcribeAudio: async (req) => ({ text: "..." }),
  describeVideo: async (req) => ({ text: "..." }),
});
```

说明：

- 在核心中保留编排、回退、配置和频道连接。
- 在提供商插件中保留供应商行为。
- 加法扩展应该保持类型化：新的可选方法、新的可选结果字段、新的可选能力。
- 视频生成已经遵循相同的模式：
  - 核心拥有能力合约和运行时助手
  - 供应商插件注册 `api.registerVideoGenerationProvider(...)`
  - 功能/频道插件消费 `api.runtime.videoGeneration.*`

对于媒体理解运行时助手，插件可以调用：

```ts
const image = await api.runtime.mediaUnderstanding.describeImageFile({
  filePath: "/tmp/inbound-photo.jpg",
  cfg: api.config,
  agentDir: "/tmp/agent",
});

const video = await api.runtime.mediaUnderstanding.describeVideoFile({
  filePath: "/tmp/inbound-video.mp4",
  cfg: api.config,
});
```

对于音频转录，插件可以使用媒体理解运行时或更旧的 STT 别名：

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

说明：

- `api.runtime.mediaUnderstanding.*` 是用于图像/音频/视频理解的首选共享界面。
- 使用核心媒体理解音频配置（`tools.media.audio`）和提供商回退顺序。
- 当没有转录输出时（例如跳过/不支持的输入）返回 `{ text: undefined }`。
- `api.runtime.stt.transcribeAudioFile(...)` 保留作为兼容性别名。

插件还可以通过 `api.runtime.subagent` 启动后台子 agent 运行：

```ts
const result = await api.runtime.subagent.run({
  sessionKey: "agent:main:subagent:search-helper",
  message: "Expand this query into focused follow-up searches.",
  provider: "openai",
  model: "gpt-4.1-mini",
  deliver: false,
});
```

说明：

- `provider` 和 `model` 是每次运行的可选覆盖，而不是持久的会话更改。
- OpenClaw 只对受信任的调用者履行这些覆盖字段。
- 对于插件拥有的回退运行，运营商必须使用 `plugins.entries.<id>.subagent.allowModelOverride: true` 选择加入。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 将受信任的插件限制到特定的规范 `provider/model` 目标，或使用 `"*"` 明确允许任何目标。
- 不受信任的插件子 agent 运行仍然有效，但覆盖请求被拒绝，而不是静默回退。
- 插件创建的子 agent 会话被标记为创建插件 id。回退的 `api.runtime.subagent.deleteSession(...)` 只能删除这些拥有的会话；任意会话删除仍然需要管理员范围的 Gateway 请求。

对于 Web 搜索，插件可以消费共享运行时助手，而不是直接进入 agent 工具连接：

```ts
const providers = api.runtime.webSearch.listProviders({
  config: api.config,
});

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: {
    query: "OpenClaw plugin runtime helpers",
    count: 5,
  },
});
```

插件还可以通过 `api.registerWebSearchProvider(...)` 注册 Web 搜索提供商。

说明：

- 在核心中保留提供商选择、凭据解析和共享请求语义。
- 将 Web 搜索提供商用于供应商特定的搜索传输。
- `api.runtime.webSearch.*` 是需要搜索行为而不依赖 agent 工具包装器的功能/频道插件的首选共享界面。

### `api.runtime.imageGeneration`

```ts
const result = await api.runtime.imageGeneration.generate({
  config: api.config,
  args: { prompt: "A friendly lobster mascot", size: "1024x1024" },
});

const providers = api.runtime.imageGeneration.listProviders({
  config: api.config,
});
```

- `generate(...)`：使用已配置的图像生成提供商链生成图像。
- `listProviders(...)`：列出可用的图像生成提供商及其能力。

## Gateway HTTP 路由

插件可以使用 `api.registerHttpRoute(...)` 公开 HTTP 端点。

```ts
api.registerHttpRoute({
  path: "/acme/webhook",
  auth: "plugin",
  match: "exact",
  handler: async (_req, res) => {
    res.statusCode = 200;
    res.end("ok");
    return true;
  },
});
```

路由字段：

- `path`：网关 HTTP 服务器下的路由路径。
- `auth`：必需。使用 `"gateway"` 要求正常的网关认证，或使用 `"plugin"` 进行插件管理的认证/webhook 验证。
- `match`：可选。`"exact"`（默认）或 `"prefix"`。
- `replaceExisting`：可选。允许同一插件替换其自己的现有路由注册。
- `handler`：当路由处理了请求时返回 `true`。

说明：

- `api.registerHttpHandler(...)` 已被删除，将导致插件加载错误。改用 `api.registerHttpRoute(...)`。
- 插件路由必须显式声明 `auth`。
- 精确的 `path + match` 冲突会被拒绝，除非 `replaceExisting: true`，且一个插件不能替换另一个插件的路由。
- 具有不同 `auth` 级别的重叠路由会被拒绝。只在相同的 auth 级别上保留 `exact`/`prefix` 回退链。
- `auth: "plugin"` 路由不会自动接收运营商运行时范围。它们用于插件管理的 webhooks/签名验证，而不是特权 Gateway 助手调用。
- `auth: "gateway"` 路由在 Gateway 请求运行时范围内运行，但该范围是有意保守的：
  - 共享密钥 bearer 认证（`gateway.auth.mode = "token"` / `"password"`）将插件路由运行时范围固定在 `operator.write`，即使调用者发送 `x-openclaw-scopes`
  - 受信任的身份持有 HTTP 模式（例如 `trusted-proxy` 或私有入口上的 `gateway.auth.mode = "none"`）仅在头显式存在时才遵循 `x-openclaw-scopes`
  - 如果 `x-openclaw-scopes` 在这些身份持有的插件路由请求上不存在，运行时范围回退到 `operator.write`
- 实际规则：不要假设网关认证插件路由是隐式的管理员界面。如果你的路由需要仅管理员行为，要求身份持有认证模式并记录显式的 `x-openclaw-scopes` 头合约。

## 插件 SDK 导入路径

编写新插件时，使用窄 SDK 子路径而不是整体的 `openclaw/plugin-sdk` 根桶。核心子路径：

| 子路径                              | 用途                                              |
| ----------------------------------- | ------------------------------------------------- |
| `openclaw/plugin-sdk/plugin-entry`  | 插件注册原语                                      |
| `openclaw/plugin-sdk/channel-core`  | 频道入口/构建助手                                 |
| `openclaw/plugin-sdk/core`          | 通用共享助手和伞形合约                            |
| `openclaw/plugin-sdk/config-schema` | 根 `openclaw.json` Zod schema（`OpenClawSchema`） |

频道插件从一系列窄接口中选择——`channel-setup`、`setup-runtime`、`setup-adapter-runtime`、`setup-tools`、`channel-pairing`、`channel-contract`、`channel-feedback`、`channel-inbound`、`channel-lifecycle`、`channel-reply-pipeline`、`command-auth`、`secret-input`、`webhook-ingress`、`channel-targets` 和 `channel-actions`。审批行为应该在一个 `approvalCapability` 合约上整合，而不是跨不相关的插件字段混合。请参见[频道插件](/plugins/sdk-channel-plugins)。

运行时和配置助手位于匹配的专注 `*-runtime` 子路径下（`approval-runtime`、`agent-runtime`、`lazy-runtime`、`directory-runtime`、`text-runtime`、`runtime-store`、`system-event-runtime`、`heartbeat-runtime`、`channel-activity-runtime` 等）。优先使用 `config-types`、`plugin-config-runtime`、`runtime-config-snapshot` 和 `config-mutation`，而不是宽泛的 `config-runtime` 兼容性桶。

<Info>
`openclaw/plugin-sdk/channel-runtime`、`openclaw/plugin-sdk/config-runtime` 和 `openclaw/plugin-sdk/infra-runtime` 是旧版插件的已弃用兼容性垫片。新代码应导入更窄的通用原语。
</Info>

仓库内部入口点（每个捆绑插件包根目录）：

- `index.js` — 捆绑插件入口
- `api.js` — 助手/类型桶
- `runtime-api.js` — 仅运行时桶
- `setup-entry.js` — 设置插件入口

外部插件应只导入 `openclaw/plugin-sdk/*` 子路径。永远不要从核心或其他插件导入另一个插件包的 `src/*`。门面加载的入口点优先使用活跃的运行时配置快照（如果存在），然后回退到磁盘上已解析的配置文件。

特定于能力的子路径（如 `image-generation`、`media-understanding` 和 `speech`）存在是因为捆绑插件今天使用它们。它们不是自动长期冻结的外部合约——在依赖它们时请检查相关的 SDK 参考页面。

## 消息工具 schemas

插件应该拥有频道特定的 `describeMessageTool(...)` schema 贡献，用于非消息原语，如反应、已读和投票。共享的发送呈现应该使用通用的 `MessagePresentation` 合约，而不是提供商原生的按钮、组件、块或卡片字段。有关合约、回退规则、提供商映射和插件作者检查清单，请参见[消息呈现](/plugins/message-presentation)。

具有发送能力的插件通过消息能力声明它们可以渲染什么：

- `presentation` 用于语义呈现块（`text`、`context`、`divider`、`buttons`、`select`）
- `delivery-pin` 用于固定传递请求

核心决定是原生渲染呈现还是降级为文本。不要从通用消息工具公开提供商原生的 UI 逃逸孵化器。旧版原生 schemas 的已弃用 SDK 助手保留用于现有第三方插件，但新插件不应使用它们。

## 频道目标解析

频道插件应该拥有特定于频道的目标语义。保持共享出站宿主通用，并使用消息传递适配器界面来处理提供商规则：

- `messaging.inferTargetChatType({ to })` 在目录查找之前决定规范化目标是否应被视为 `direct`、`group` 或 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告诉核心输入是否应该跳过直接进行类似 id 的解析，而不是目录搜索。
- `messaging.targetResolver.resolveTarget(...)` 是在规范化或目录未命中后核心需要最终提供商拥有的解析时的插件回退。
- `messaging.resolveOutboundSessionRoute(...)` 在目标解析后拥有提供商特定的会话路由构建。

推荐的分割：

- 将 `inferTargetChatType` 用于在搜索对等/组之前应该发生的类别决策。
- 将 `looksLikeId` 用于"将此视为显式/原生目标 id"检查。
- 将 `resolveTarget` 用于提供商特定的规范化回退，而不是广泛的目录搜索。
- 将提供商原生 id（如聊天 id、线程 id、JID、句柄和房间 id）保留在 `target` 值或提供商特定参数中，而不是通用 SDK 字段中。

## 配置支持的目录

从配置派生目录条目的插件应将该逻辑保留在插件中，并复用 `openclaw/plugin-sdk/directory-runtime` 中的共享助手。

当频道需要配置支持的对等/组时使用此方法，例如：

- 允许列表驱动的 DM 对等
- 已配置的频道/组映射
- 账户范围的静态目录回退

`directory-runtime` 中的共享助手只处理通用操作：

- 查询过滤
- 限制应用
- 去重/规范化助手
- 构建 `ChannelDirectoryEntry[]`

特定于频道的账户检查和 id 规范化应保留在插件实现中。

## 提供商目录

提供商插件可以使用 `registerProvider({ catalog: { run(...) { ... } } })` 为推理定义模型目录。

`catalog.run(...)` 返回与 OpenClaw 写入 `models.providers` 相同的形状：

- `{ provider }` 用于一个提供商条目
- `{ providers }` 用于多个提供商条目

当插件拥有提供商特定的模型 id、基础 URL 默认值或认证门控的模型元数据时，使用 `catalog`。

`catalog.order` 控制插件目录相对于 OpenClaw 内置隐式提供商的合并时间：

- `simple`：普通 API 密钥或环境驱动的提供商
- `profile`：当认证配置文件存在时出现的提供商
- `paired`：合成多个相关提供商条目的提供商
- `late`：最后一步，在其他隐式提供商之后

后面的提供商在键冲突时获胜，因此插件可以故意用相同的提供商 id 覆盖内置的提供商条目。

兼容性：

- `discovery` 仍然作为旧版别名有效
- 如果 `catalog` 和 `discovery` 都注册了，OpenClaw 使用 `catalog`

## 只读频道检查

如果你的插件注册了一个频道，优先在 `resolveAccount(...)` 旁边实现 `plugin.config.inspectAccount(cfg, accountId)`。

原因：

- `resolveAccount(...)` 是运行时路径。它被允许假设凭据已完全具体化，并在所需密钥缺失时快速失败。
- 只读命令路径（如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve` 和 doctor/配置修复流程）不应该仅仅为了描述配置而需要具体化运行时凭据。

推荐的 `inspectAccount(...)` 行为：

- 仅返回描述性账户状态。
- 保留 `enabled` 和 `configured`。
- 在相关时包含凭据来源/状态字段，例如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`、`signingSecretStatus`
- 你不需要返回原始令牌值来报告只读可用性。返回 `tokenStatus: "available"`（以及匹配的来源字段）对于状态样式命令已经足够。
- 当凭据通过 SecretRef 配置但在当前命令路径中不可用时，使用 `configured_unavailable`。

这让只读命令报告"已配置但在此命令路径中不可用"，而不是崩溃或错误报告账户未配置。

## 包集合

插件目录可以包含带有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每个条目成为一个插件。如果集合列出了多个扩展，插件 id 变为 `name/<fileBase>`。

如果你的插件导入 npm 依赖项，请在该目录中安装它们，以便 `node_modules` 可用（`npm install` / `pnpm install`）。

安全护栏：每个 `openclaw.extensions` 条目在符号链接解析后必须保留在插件目录内。逃离包目录的条目会被拒绝。

安全说明：`openclaw plugins install` 使用项目本地的 `npm install --omit=dev --ignore-scripts`（无生命周期脚本，运行时无开发依赖）安装插件依赖项，忽略继承的全局 npm 安装设置。保持插件依赖树为"纯 JS/TS"，避免需要 `postinstall` 构建的包。

可选：`openclaw.setupEntry` 可以指向轻量级的仅设置模块。当 OpenClaw 需要禁用频道插件的设置界面，或当频道插件已启用但仍未配置时，它加载 `setupEntry` 而不是完整的插件入口。当你的主插件入口还连接工具、钩子或其他仅运行时代码时，这使启动和设置更轻量。

可选：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` 可以让频道插件在网关的监听前启动阶段选择相同的 `setupEntry` 路径，即使频道已经配置。

仅当 `setupEntry` 完全覆盖网关开始监听之前必须存在的启动界面时才使用此方法。实际上，这意味着设置入口必须注册每个启动依赖的频道拥有能力，例如：

- 频道注册本身
- 网关开始监听之前必须可用的任何 HTTP 路由
- 在同一窗口期间必须存在的任何网关方法、工具或服务

如果你的完整入口仍然拥有任何必需的启动能力，不要启用此标志。保持插件的默认行为并让 OpenClaw 在启动期间加载完整入口。

捆绑频道还可以发布仅设置的合约界面助手，核心可以在加载完整频道运行时之前咨询这些助手。当前的设置提升界面是：

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

核心在需要将旧版单账户频道配置提升到 `channels.<id>.accounts.*` 而不加载完整插件入口时使用该界面。Matrix 是当前的捆绑示例：当命名账户已经存在时，它只将认证/引导密钥移动到命名的提升账户中，并且它可以保留已配置的非规范默认账户密钥，而不是始终创建 `accounts.default`。

这些设置补丁适配器保持捆绑合约界面发现的惰性。导入时间保持轻量；提升界面仅在首次使用时加载，而不是在模块导入时重新进入捆绑频道启动。

当这些启动界面包含网关 RPC 方法时，请将它们保留在插件特定前缀上。核心管理员命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）保持保留并始终解析为 `operator.admin`，即使插件请求更窄的范围。

示例：

```json
{
  "name": "@scope/my-channel",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

### 频道目录元数据

频道插件可以通过 `openclaw.channel` 宣传设置/发现元数据，通过 `openclaw.install` 宣传安装提示。这使核心目录无数据。

示例：

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (self-hosted)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Self-hosted chat via Nextcloud Talk webhook bots.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "<bundled-plugin-local-path>",
      "defaultChoice": "npm"
    }
  }
}
```

最小示例之外有用的 `openclaw.channel` 字段：

- `detailLabel`：用于更丰富目录/状态界面的辅助标签
- `docsLabel`：覆盖文档链接的链接文本
- `preferOver`：此目录条目应优于的低优先级插件/频道 id
- `selectionDocsPrefix`、`selectionDocsOmitLabel`、`selectionExtras`：选择界面复制控制
- `markdownCapable`：将频道标记为出站格式化决策的 markdown 兼容
- `exposure.configured`：设置为 `false` 时从已配置频道列表界面隐藏频道
- `exposure.setup`：设置为 `false` 时从交互式设置/配置选择器隐藏频道
- `exposure.docs`：将频道标记为文档导航界面的内部/私有
- `showConfigured` / `showInSetup`：仍接受的旧版别名以保持兼容性；优先使用 `exposure`
- `quickstartAllowFrom`：将频道纳入标准快速开始 `allowFrom` 流程
- `forceAccountBinding`：即使只有一个账户存在也需要显式账户绑定
- `preferSessionLookupForAnnounceTarget`：在解析公告目标时优先使用会话查找

OpenClaw 还可以合并**外部频道目录**（例如，MPM 注册表导出）。将 JSON 文件放在以下位置之一：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或将 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一个或多个 JSON 文件（逗号/分号/`PATH` 分隔）。每个文件应包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器还接受 `"packages"` 或 `"plugins"` 作为 `"entries"` 键的旧版别名。

生成的频道目录条目和提供商安装目录条目在原始 `openclaw.install` 块旁边公开规范化的安装源事实。规范化的事实识别 npm 规范是精确版本还是浮动选择器，是否存在预期的完整性元数据，以及是否也有本地源路径可用。当目录/包身份已知时，规范化的事实警告解析的 npm 包名是否从该身份漂移。当 `defaultChoice` 无效或指向不可用的源，以及当 npm 完整性元数据存在但没有有效的 npm 源时，它们也会发出警告。消费者应将 `installSource` 视为加法可选字段，因此手动构建的条目和目录垫片不必合成它。这让引导和诊断在不导入插件运行时的情况下解释源平面状态。

官方外部 npm 条目应优先使用精确的 `npmSpec` 加 `expectedIntegrity`。裸包名和 dist 标签仍然有效以保持兼容性，但它们会在目录可以朝着固定的、完整性检查的安装转移而不破坏现有插件时产生源平面警告。当引导从本地目录路径安装时，它记录一个带有 `source: "path"` 和工作区相对 `sourcePath`（如果可能）的托管插件插件索引条目。绝对操作加载路径保留在 `plugins.load.paths` 中；安装记录避免将本地工作站路径复制到长期配置中。这使本地开发安装对源平面诊断可见，而不添加第二个原始文件系统路径公开界面。持久化的 `plugins/installs.json` 插件索引是安装的事实来源，可以在不加载插件运行时模块的情况下刷新。其 `installRecords` 映射即使当插件清单缺失或无效时也是持久的；其 `plugins` 数组是一个可重建的清单视图。

## 上下文引擎插件

上下文引擎插件拥有用于摄取、组装和压缩的会话上下文编排。使用 `api.registerContextEngine(id, factory)` 从你的插件注册它们，然后使用 `plugins.slots.contextEngine` 选择活跃引擎。

当你的插件需要替换或扩展默认上下文管道而不仅仅是添加内存搜索或钩子时使用此方法。

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", (ctx) => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

工厂 `ctx` 公开可选的 `config`、`agentDir` 和 `workspaceDir` 值用于构建时初始化。

如果你的引擎**不**拥有压缩算法，保持 `compact()` 实现并显式委托它：

```ts
import {
  buildMemorySystemPromptAddition,
  delegateCompactionToRuntime,
} from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("my-memory-engine", (ctx) => ({
    info: {
      id: "my-memory-engine",
      name: "My Memory Engine",
      ownsCompaction: false,
    },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact(params) {
      return await delegateCompactionToRuntime(params);
    },
  }));
}
```

## 添加新能力

当插件需要当前 API 不适合的行为时，不要通过私有渗透绕过插件系统。添加缺少的能力。

推荐的顺序：

1. 定义核心合约
   决定核心应该拥有什么共享行为：策略、回退、配置合并、生命周期、面向频道的语义和运行时助手形状。
2. 添加类型化的插件注册/运行时界面
   使用最小有用的类型化能力界面扩展 `OpenClawPluginApi` 和/或 `api.runtime`。
3. 连接核心 + 频道/功能消费者
   频道和功能插件应该通过核心消费新能力，而不是直接导入供应商实现。
4. 注册供应商实现
   供应商插件然后针对该能力注册其后端。
5. 添加合约覆盖
   添加测试，使所有权和注册形状随时间保持明确。

这就是 OpenClaw 保持固执己见而不变得硬编码到一个提供商世界观的方式。有关具体的文件检查清单和已完成的示例，请参见[能力食谱](/tools/capability-cookbook)。

### 能力检查清单

当你添加新能力时，实现通常应该同时触及这些界面：

- `src/<capability>/types.ts` 中的核心合约类型
- `src/<capability>/runtime.ts` 中的核心运行器/运行时助手
- `src/plugins/types.ts` 中的插件 API 注册界面
- `src/plugins/registry.ts` 中的插件注册表连接
- `src/plugins/runtime/*` 中的插件运行时公开（当功能/频道插件需要消费它时）
- `src/test-utils/plugin-registration.ts` 中的捕获/测试助手
- `src/plugins/contracts/registry.ts` 中的所有权/合约断言
- `docs/` 中的运营商/插件文档

如果缺少其中一个界面，通常表示该能力还未完全集成。

### 能力模板

最小模式：

```ts
// core contract
export type VideoGenerationProviderPlugin = {
  id: string;
  label: string;
  generateVideo: (req: VideoGenerationRequest) => Promise<VideoGenerationResult>;
};

// plugin API
api.registerVideoGenerationProvider({
  id: "openai",
  label: "OpenAI",
  async generateVideo(req) {
    return await generateOpenAiVideo(req);
  },
});

// shared runtime helper for feature/channel plugins
const clip = await api.runtime.videoGeneration.generate({
  prompt: "Show the robot walking through the lab.",
  cfg,
});
```

合约测试模式：

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

这使规则保持简单：

- 核心拥有能力合约 + 编排
- 供应商插件拥有供应商实现
- 功能/频道插件消费运行时助手
- 合约测试使所有权保持明确

## 相关文档

- [插件架构](/plugins/architecture) — 公共能力模型和形状
- [插件 SDK 子路径](/plugins/sdk-subpaths)
- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
