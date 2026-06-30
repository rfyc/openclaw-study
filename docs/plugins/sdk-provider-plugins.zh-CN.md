---
summary: "为 OpenClaw 构建模型提供商插件的分步指南"
title: "构建提供商插件"
sidebarTitle: "提供商插件"
read_when:
  - 你正在构建新的模型提供商插件
  - 你希望向 OpenClaw 添加 OpenAI 兼容代理或自定义 LLM
  - 你需要了解提供商认证、目录和运行时钩子
---

本指南介绍如何构建向 OpenClaw 添加模型提供商（LLM）的提供商插件。完成后，你将拥有一个带有模型目录、API 密钥认证和动态模型解析的提供商。

<Info>
  如果你之前从未构建过 OpenClaw 插件，请先阅读
  [入门指南](/plugins/building-plugins)，了解基本的包结构和清单设置。
</Info>

<Tip>
  提供商插件将模型添加到 OpenClaw 的正常推理循环中。如果模型必须通过拥有线程、压缩或工具事件的原生 agent 守护进程运行，请将提供商与 [agent 执行器](/plugins/sdk-agent-harness)配对，而不是将守护进程协议细节放入核心。
</Tip>

## 演练

<Steps>
  <Step title="包和清单">
    ### 步骤 1：包和清单

    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-ai",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "providers": ["acme-ai"],
        "compat": {
          "pluginApi": ">=2026.3.24-beta.2",
          "minGatewayVersion": "2026.3.24-beta.2"
        },
        "build": {
          "openclawVersion": "2026.3.24-beta.2",
          "pluginSdkVersion": "2026.3.24-beta.2"
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-ai",
      "name": "Acme AI",
      "description": "Acme AI model provider",
      "providers": ["acme-ai"],
      "modelSupport": {
        "modelPrefixes": ["acme-"]
      },
      "providerAuthEnvVars": {
        "acme-ai": ["ACME_AI_API_KEY"]
      },
      "providerAuthAliases": {
        "acme-ai-coding": "acme-ai"
      },
      "providerAuthChoices": [
        {
          "provider": "acme-ai",
          "method": "api-key",
          "choiceId": "acme-ai-api-key",
          "choiceLabel": "Acme AI API key",
          "groupId": "acme-ai",
          "groupLabel": "Acme AI",
          "cliFlag": "--acme-ai-api-key",
          "cliOption": "--acme-ai-api-key <key>",
          "cliDescription": "Acme AI API key"
        }
      ],
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    清单声明 `providerAuthEnvVars`，以便 OpenClaw 可以在不加载你的插件运行时的情况下检测凭据。当提供商变体应该重用另一个提供商 id 的认证时添加 `providerAuthAliases`。`modelSupport` 是可选的，让 OpenClaw 在运行时钩子存在之前从简写模型 id（如 `acme-large`）自动加载你的提供商插件。如果你在 ClawHub 上发布提供商，`package.json` 中需要那些 `openclaw.compat` 和 `openclaw.build` 字段。

  </Step>

  <Step title="注册提供商">
    最小提供商需要 `id`、`label`、`auth` 和 `catalog`：

    ```typescript index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import { createProviderApiKeyAuthMethod } from "openclaw/plugin-sdk/provider-auth";

    export default definePluginEntry({
      id: "acme-ai",
      name: "Acme AI",
      description: "Acme AI model provider",
      register(api) {
        api.registerProvider({
          id: "acme-ai",
          label: "Acme AI",
          docsPath: "/providers/acme-ai",
          envVars: ["ACME_AI_API_KEY"],

          auth: [
            createProviderApiKeyAuthMethod({
              providerId: "acme-ai",
              methodId: "api-key",
              label: "Acme AI API key",
              hint: "API key from your Acme AI dashboard",
              optionKey: "acmeAiApiKey",
              flagName: "--acme-ai-api-key",
              envVar: "ACME_AI_API_KEY",
              promptMessage: "Enter your Acme AI API key",
              defaultModel: "acme-ai/acme-large",
            }),
          ],

          catalog: {
            order: "simple",
            run: async (ctx) => {
              const apiKey =
                ctx.resolveProviderApiKey("acme-ai").apiKey;
              if (!apiKey) return null;
              return {
                provider: {
                  baseUrl: "https://api.acme-ai.com/v1",
                  apiKey,
                  api: "openai-completions",
                  models: [
                    {
                      id: "acme-large",
                      name: "Acme Large",
                      reasoning: true,
                      input: ["text", "image"],
                      cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
                      contextWindow: 200000,
                      maxTokens: 32768,
                    },
                    {
                      id: "acme-small",
                      name: "Acme Small",
                      reasoning: false,
                      input: ["text"],
                      cost: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
                      contextWindow: 128000,
                      maxTokens: 8192,
                    },
                  ],
                },
              };
            },
          },
        });
      },
    });
    ```

    这是一个可工作的提供商。用户现在可以
    `openclaw onboard --acme-ai-api-key <key>` 并选择
    `acme-ai/acme-large` 作为他们的模型。

    如果上游提供商使用的控制令牌与 OpenClaw 不同，请添加
    一个小型双向文本变换，而不是替换流路径：

    ```typescript
    api.registerTextTransforms({
      input: [
        { from: /red basket/g, to: "blue basket" },
        { from: /paper ticket/g, to: "digital ticket" },
        { from: /left shelf/g, to: "right shelf" },
      ],
      output: [
        { from: /blue basket/g, to: "red basket" },
        { from: /digital ticket/g, to: "paper ticket" },
        { from: /right shelf/g, to: "left shelf" },
      ],
    });
    ```

    `input` 在传输之前重写最终系统提示和文本消息内容。`output` 在 OpenClaw 解析自己的控制标记或频道传递之前重写助手文本增量和最终文本。

    对于仅使用 API 密钥认证加上单目录支持的运行时注册一个文本提供商的捆绑提供商，优先使用更窄的 `defineSingleProviderPluginEntry(...)` 助手：

    ```typescript
    import { defineSingleProviderPluginEntry } from "openclaw/plugin-sdk/provider-entry";

    export default defineSingleProviderPluginEntry({
      id: "acme-ai",
      name: "Acme AI",
      description: "Acme AI model provider",
      provider: {
        label: "Acme AI",
        docsPath: "/providers/acme-ai",
        auth: [
          {
            methodId: "api-key",
            label: "Acme AI API key",
            hint: "API key from your Acme AI dashboard",
            optionKey: "acmeAiApiKey",
            flagName: "--acme-ai-api-key",
            envVar: "ACME_AI_API_KEY",
            promptMessage: "Enter your Acme AI API key",
            defaultModel: "acme-ai/acme-large",
          },
        ],
        catalog: {
          buildProvider: () => ({
            api: "openai-completions",
            baseUrl: "https://api.acme-ai.com/v1",
            models: [{ id: "acme-large", name: "Acme Large" }],
          }),
          buildStaticProvider: () => ({
            api: "openai-completions",
            baseUrl: "https://api.acme-ai.com/v1",
            models: [{ id: "acme-large", name: "Acme Large" }],
          }),
        },
      },
    });
    ```

    `buildProvider` 是在 OpenClaw 可以解析真实提供商认证时使用的实时目录路径。它可以执行提供商特定的发现。仅将 `buildStaticProvider` 用于在配置认证之前可以安全显示的离线行；它不得需要凭据或发出网络请求。
    OpenClaw 的 `models list --all` 显示目前仅为捆绑的提供商插件执行静态目录，使用空配置、空环境和没有 agent/工作区路径。

    如果你的认证流程还需要在加入期间修补 `models.providers.*`、别名和 agent 默认模型，请使用 `openclaw/plugin-sdk/provider-onboard` 中的预设助手。最窄的助手是 `createDefaultModelPresetAppliers(...)`、`createDefaultModelsPresetAppliers(...)` 和 `createModelCatalogPresetAppliers(...)`。

    当提供商的原生端点在正常的 `openai-completions` 传输上支持流式使用块时，优先使用 `openclaw/plugin-sdk/provider-catalog-shared` 中的共享目录助手，而不是硬编码提供商 id 检查。`supportsNativeStreamingUsageCompat(...)` 和 `applyProviderNativeStreamingUsageCompat(...)` 从端点能力映射检测支持，因此即使插件使用自定义提供商 id，原生 Moonshot/DashScope 风格端点仍然可以选择加入。

  </Step>

  <Step title="添加动态模型解析">
    如果你的提供商接受任意模型 ID（如代理或路由器），
    添加 `resolveDynamicModel`：

    ```typescript
    api.registerProvider({
      // ... id, label, auth, catalog from above

      resolveDynamicModel: (ctx) => ({
        id: ctx.modelId,
        name: ctx.modelId,
        provider: "acme-ai",
        api: "openai-completions",
        baseUrl: "https://api.acme-ai.com/v1",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 8192,
      }),
    });
    ```

    如果解析需要网络调用，使用 `prepareDynamicModel` 进行异步
    预热 — `resolveDynamicModel` 在完成后再次运行。

  </Step>

  <Step title="添加运行时钩子（按需）">
    大多数提供商只需要 `catalog` + `resolveDynamicModel`。根据
    你的提供商的需求逐步添加钩子。

    共享助手构建器现在涵盖了最常见的重放/工具兼容
    族，因此插件通常不需要逐个手动连接每个钩子：

    ```typescript
    import { buildProviderReplayFamilyHooks } from "openclaw/plugin-sdk/provider-model-shared";
    import { buildProviderStreamFamilyHooks } from "openclaw/plugin-sdk/provider-stream";
    import { buildProviderToolCompatFamilyHooks } from "openclaw/plugin-sdk/provider-tools";

    const GOOGLE_FAMILY_HOOKS = {
      ...buildProviderReplayFamilyHooks({ family: "google-gemini" }),
      ...buildProviderStreamFamilyHooks("google-thinking"),
      ...buildProviderToolCompatFamilyHooks("gemini"),
    };

    api.registerProvider({
      id: "acme-gemini-compatible",
      // ...
      ...GOOGLE_FAMILY_HOOKS,
    });
    ```

    当前可用的重放族：

    | 族 | 连接内容 | 捆绑示例 |
    | --- | --- | --- |
    | `openai-compatible` | 用于 OpenAI 兼容传输的共享 OpenAI 风格重放策略，包括工具调用 id 净化、助手优先排序修复和需要时的通用 Gemini 轮次验证 | `moonshot`、`ollama`、`xai`、`zai` |
    | `anthropic-by-model` | 按 `modelId` 选择的 Claude 感知重放策略，以便 Anthropic 消息传输只在解析的模型实际上是 Claude id 时获得 Claude 特定的思考块清理 | `amazon-bedrock`、`anthropic-vertex` |
    | `google-gemini` | 原生 Gemini 重放策略加上引导重放净化和标记推理输出模式 | `google`、`google-gemini-cli` |
    | `passthrough-gemini` | 通过 OpenAI 兼容代理传输运行的 Gemini 模型的 Gemini 思维签名净化；不启用原生 Gemini 重放验证或引导重写 | `openrouter`、`kilocode`、`opencode`、`opencode-go` |
    | `hybrid-anthropic-openai` | 在一个插件中混合 Anthropic 消息和 OpenAI 兼容模型接口的提供商的混合策略；可选的仅 Claude 思考块丢弃保持局限于 Anthropic 端 | `minimax` |

    当前可用的流族：

    | 族 | 连接内容 | 捆绑示例 |
    | --- | --- | --- |
    | `google-thinking` | 共享流路径上的 Gemini 思考载荷规范化 | `google`、`google-gemini-cli` |
    | `kilocode-thinking` | 共享代理流路径上的 Kilo 推理包装器，`kilo/auto` 和不支持的代理推理 id 跳过注入的思考 | `kilocode` |
    | `moonshot-thinking` | 来自配置 + `/think` 级别的 Moonshot 二进制原生思考载荷映射 | `moonshot` |
    | `minimax-fast-mode` | 共享流路径上的 MiniMax 快速模式模型重写 | `minimax`、`minimax-portal` |
    | `openai-responses-defaults` | 共享原生 OpenAI/Codex 响应包装器：归因头、`/fast`/`serviceTier`、文本详细度、原生 Codex 网络搜索、推理兼容载荷塑形和响应上下文管理 | `openai`、`openai-codex` |
    | `openrouter-thinking` | 代理路由的 OpenRouter 推理包装器，不支持的模型/`auto` 跳过集中处理 | `openrouter` |
    | `tool-stream-default-on` | 默认开启的 `tool_stream` 包装器，用于像 Z.AI 这样希望工具流除非显式禁用的提供商 | `zai` |

    <Accordion title="支持族构建器的 SDK 接口">
      每个族构建器由从同一包导出的低级公共助手组合而成，当提供商需要偏离常见模式时，你可以使用这些助手：

      - `openclaw/plugin-sdk/provider-model-shared` — `ProviderReplayFamily`、`buildProviderReplayFamilyHooks(...)` 和原始重放构建器（`buildOpenAICompatibleReplayPolicy`、`buildAnthropicReplayPolicyForModel`、`buildGoogleGeminiReplayPolicy`、`buildHybridAnthropicOrOpenAIReplayPolicy`）。还导出 Gemini 重放助手（`sanitizeGoogleGeminiReplayHistory`、`resolveTaggedReasoningOutputMode`）和端点/模型助手（`resolveProviderEndpoint`、`normalizeProviderId`、`normalizeGooglePreviewModelId`、`normalizeNativeXaiModelId`）。
      - `openclaw/plugin-sdk/provider-stream` — `ProviderStreamFamily`、`buildProviderStreamFamilyHooks(...)`、`composeProviderStreamWrappers(...)`，加上共享的 OpenAI/Codex 包装器（`createOpenAIAttributionHeadersWrapper`、`createOpenAIFastModeWrapper`、`createOpenAIServiceTierWrapper`、`createOpenAIResponsesContextManagementWrapper`、`createCodexNativeWebSearchWrapper`）、DeepSeek V4 OpenAI 兼容包装器（`createDeepSeekV4OpenAICompatibleThinkingWrapper`）、Anthropic Messages 思考前填充清理（`createAnthropicThinkingPrefillPayloadWrapper`）和共享代理/提供商包装器（`createOpenRouterWrapper`、`createToolStreamWrapper`、`createMinimaxFastModeWrapper`）。
      - `openclaw/plugin-sdk/provider-tools` — `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks("gemini")`、底层 Gemini 模式助手（`normalizeGeminiToolSchemas`、`inspectGeminiToolSchemas`）和 xAI 兼容助手（`resolveXaiModelCompatPatch()`、`applyXaiModelCompat(model)`）。捆绑的 xAI 插件将 `normalizeResolvedModel` + `contributeResolvedModelCompat` 与这些一起使用，以保持 xAI 规则由提供商拥有。

      一些流助手故意保留在提供商本地。`@openclaw/anthropic-provider` 在其自己的公共 `api.ts` / `contract-api.ts` 接口中保留 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、`resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 和低级 Anthropic 包装器构建器，因为它们编码了 Claude OAuth beta 处理和 `context1m` 门控。xAI 插件类似地在其自己的 `wrapStreamFn` 中保留原生 xAI 响应塑形（`/fast` 别名、默认 `tool_stream`、不支持的严格工具清理、xAI 特定的推理载荷移除）。

      相同的包根模式还支持 `@openclaw/openai-provider`（提供商构建器、默认模型助手、实时提供商构建器）和 `@openclaw/openrouter-provider`（提供商构建器加上加入/配置助手）。
    </Accordion>

    <Tabs>
      <Tab title="令牌交换">
        对于在每次推理调用之前需要令牌交换的提供商：

        ```typescript
        prepareRuntimeAuth: async (ctx) => {
          const exchanged = await exchangeToken(ctx.apiKey);
          return {
            apiKey: exchanged.token,
            baseUrl: exchanged.baseUrl,
            expiresAt: exchanged.expiresAt,
          };
        },
        ```
      </Tab>
      <Tab title="自定义头">
        对于需要自定义请求头或正文修改的提供商：

        ```typescript
        // wrapStreamFn returns a StreamFn derived from ctx.streamFn
        wrapStreamFn: (ctx) => {
          if (!ctx.streamFn) return undefined;
          const inner = ctx.streamFn;
          return async (params) => {
            params.headers = {
              ...params.headers,
              "X-Acme-Version": "2",
            };
            return inner(params);
          };
        },
        ```
      </Tab>
      <Tab title="原生传输身份">
        对于在通用 HTTP 或 WebSocket 传输上需要原生请求/会话头或元数据的提供商：

        ```typescript
        resolveTransportTurnState: (ctx) => ({
          headers: {
            "x-request-id": ctx.turnId,
          },
          metadata: {
            session_id: ctx.sessionId ?? "",
            turn_id: ctx.turnId,
          },
        }),
        resolveWebSocketSessionPolicy: (ctx) => ({
          headers: {
            "x-session-id": ctx.sessionId ?? "",
          },
          degradeCooldownMs: 60_000,
        }),
        ```
      </Tab>
      <Tab title="使用量和计费">
        对于公开使用量/计费数据的提供商：

        ```typescript
        resolveUsageAuth: async (ctx) => {
          const auth = await ctx.resolveOAuthToken();
          return auth ? { token: auth.token } : null;
        },
        fetchUsageSnapshot: async (ctx) => {
          return await fetchAcmeUsage(ctx.token, ctx.timeoutMs);
        },
        ```
      </Tab>
    </Tabs>

    <Accordion title="所有可用的提供商钩子">
      OpenClaw 按以下顺序调用钩子。大多数提供商只使用 2-3 个：
      OpenClaw 不再调用的仅兼容性提供商字段，如 `ProviderPlugin.capabilities` 和 `suppressBuiltInModel`，此处未列出。

      | # | 钩子 | 何时使用 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型目录或基础 URL 默认值 |
      | 2 | `applyConfigDefaults` | 配置物化期间提供商拥有的全局默认值 |
      | 3 | `normalizeModelId` | 查找之前的旧版/预览模型 id 别名清理 |
      | 4 | `normalizeTransport` | 通用模型组装之前的提供商族 `api` / `baseUrl` 清理 |
      | 5 | `normalizeConfig` | 规范化 `models.providers.<id>` 配置 |
      | 6 | `applyNativeStreamingUsageCompat` | 配置提供商的原生流式使用兼容重写 |
      | 7 | `resolveConfigApiKey` | 提供商拥有的环境标记认证解析 |
      | 8 | `resolveSyntheticAuth` | 本地/自托管或配置支持的合成认证 |
      | 9 | `shouldDeferSyntheticProfileAuth` | 将合成存储配置文件占位符放在环境/配置认证之后 |
      | 10 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 11 | `prepareDynamicModel` | 解析之前的异步元数据获取 |
      | 12 | `normalizeResolvedModel` | 运行器之前的传输重写 |
      | 13 | `contributeResolvedModelCompat` | 另一个兼容传输后面的供应商模型的兼容标志 |
      | 14 | `normalizeToolSchemas` | 注册之前提供商拥有的工具模式清理 |
      | 15 | `inspectToolSchemas` | 提供商拥有的工具模式诊断 |
      | 16 | `resolveReasoningOutputMode` | 标记与原生推理输出合约 |
      | 17 | `prepareExtraParams` | 默认请求参数 |
      | 18 | `createStreamFn` | 完全自定义的 StreamFn 传输 |
      | 19 | `wrapStreamFn` | 正常流路径上的自定义头/正文包装器 |
      | 20 | `resolveTransportTurnState` | 原生每轮次头/元数据 |
      | 21 | `resolveWebSocketSessionPolicy` | 原生 WS 会话头/冷却时间 |
      | 22 | `formatApiKey` | 自定义运行时令牌形状 |
      | 23 | `refreshOAuth` | 自定义 OAuth 刷新 |
      | 24 | `buildAuthDoctorHint` | 认证修复指导 |
      | 25 | `matchesContextOverflowError` | 提供商拥有的溢出检测 |
      | 26 | `classifyFailoverReason` | 提供商拥有的速率限制/过载分类 |
      | 27 | `isCacheTtlEligible` | 提示缓存 TTL 门控 |
      | 28 | `buildMissingAuthMessage` | 自定义缺少认证提示 |
      | 29 | `augmentModelCatalog` | 合成前向兼容行 |
      | 30 | `resolveThinkingProfile` | 模型特定的 `/think` 选项集 |
      | 31 | `isBinaryThinking` | 二进制思考开/关兼容性 |
      | 32 | `supportsXHighThinking` | `xhigh` 推理支持兼容性 |
      | 33 | `resolveDefaultThinkingLevel` | 默认 `/think` 策略兼容性 |
      | 34 | `isModernModelRef` | 实时/冒烟模型匹配 |
      | 35 | `prepareRuntimeAuth` | 推理前的令牌交换 |
      | 36 | `resolveUsageAuth` | 自定义使用量凭据解析 |
      | 37 | `fetchUsageSnapshot` | 自定义使用量端点 |
      | 38 | `createEmbeddingProvider` | 提供商拥有的内存/搜索嵌入适配器 |
      | 39 | `buildReplayPolicy` | 自定义转录重放/压缩策略 |
      | 40 | `sanitizeReplayHistory` | 通用清理后的提供商特定重放重写 |
      | 41 | `validateReplayTurns` | 嵌入式运行器之前的严格重放轮次验证 |
      | 42 | `onModelSelected` | 选择后回调（如遥测） |

      运行时回退说明：

      - `normalizeConfig` 首先检查匹配的提供商，然后检查其他具有钩子能力的提供商插件，直到有一个实际更改配置。如果没有提供商钩子重写支持的 Google 族配置条目，捆绑的 Google 配置规范化器仍然适用。
      - `resolveConfigApiKey` 在公开时使用提供商钩子。捆绑的 `amazon-bedrock` 路径在这里也有内置的 AWS 环境标记解析器，即使 Bedrock 运行时认证本身仍然使用 AWS SDK 默认链。
      - `resolveSystemPromptContribution` 让提供商为模型族注入缓存感知的系统提示指导。当行为属于一个提供商/模型族并且应该保留稳定/动态缓存分割时，优先使用它而不是 `before_prompt_build`。

      有关详细描述和真实世界示例，请参见[内部：提供商运行时钩子](/plugins/architecture-internals#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="添加额外能力（可选）">
    ### 步骤 5：添加额外能力

    提供商插件可以在文本推理旁边注册语音、实时转录、实时语音、媒体理解、图像生成、视频生成、Web 获取和 Web 搜索。OpenClaw 将此分类为**混合能力**插件 — 公司插件的推荐模式（每个供应商一个插件）。请参见
    [内部：能力所有权](/plugins/architecture#capability-ownership-model)。

    在现有 `api.registerProvider(...)` 调用旁边的 `register(api)` 内部注册每个能力。只选择你需要的标签：

    <Tabs>
      <Tab title="语音（TTS）">
        ```typescript
        import {
          assertOkOrThrowProviderError,
          postJsonRequest,
        } from "openclaw/plugin-sdk/provider-http";

        api.registerSpeechProvider({
          id: "acme-ai",
          label: "Acme Speech",
          isConfigured: ({ config }) => Boolean(config.messages?.tts),
          synthesize: async (req) => {
            const { response, release } = await postJsonRequest({
              url: "https://api.example.com/v1/speech",
              headers: new Headers({ "Content-Type": "application/json" }),
              body: { text: req.text },
              timeoutMs: req.timeoutMs,
              fetchFn: fetch,
              auditContext: "acme speech",
            });
            try {
              await assertOkOrThrowProviderError(response, "Acme Speech API error");
              return {
                audioBuffer: Buffer.from(await response.arrayBuffer()),
                outputFormat: "mp3",
                fileExtension: ".mp3",
                voiceCompatible: false,
              };
            } finally {
              await release();
            }
          },
        });
        ```

        使用 `assertOkOrThrowProviderError(...)` 处理提供商 HTTP 失败，以便插件共享有上限的错误正文读取、JSON 错误解析和请求 id 后缀。
      </Tab>
      <Tab title="实时转录">
        优先使用 `createRealtimeTranscriptionWebSocketSession(...)` — 共享助手处理代理捕获、重连退避、关闭刷新、就绪握手、音频排队和关闭事件诊断。你的插件只需映射上游事件。

        ```typescript
        api.registerRealtimeTranscriptionProvider({
          id: "acme-ai",
          label: "Acme Realtime Transcription",
          isConfigured: () => true,
          createSession: (req) => {
            const apiKey = String(req.providerConfig.apiKey ?? "");
            return createRealtimeTranscriptionWebSocketSession({
              providerId: "acme-ai",
              callbacks: req,
              url: "wss://api.example.com/v1/realtime-transcription",
              headers: { Authorization: `Bearer ${apiKey}` },
              onMessage: (event, transport) => {
                if (event.type === "session.created") {
                  transport.sendJson({ type: "session.update" });
                  transport.markReady();
                  return;
                }
                if (event.type === "transcript.final") {
                  req.onTranscript?.(event.text);
                }
              },
              sendAudio: (audio, transport) => {
                transport.sendJson({
                  type: "audio.append",
                  audio: audio.toString("base64"),
                });
              },
              onClose: (transport) => {
                transport.sendJson({ type: "audio.end" });
              },
            });
          },
        });
        ```

        POST 多部分音频的批处理 STT 提供商应该使用 `openclaw/plugin-sdk/provider-http` 中的 `buildAudioTranscriptionFormData(...)`。该助手规范化上传文件名，包括需要 M4A 风格文件名以用于兼容转录 API 的 AAC 上传。
      </Tab>
      <Tab title="实时语音">
        ```typescript
        api.registerRealtimeVoiceProvider({
          id: "acme-ai",
          label: "Acme Realtime Voice",
          isConfigured: ({ providerConfig }) => Boolean(providerConfig.apiKey),
          createBridge: (req) => ({
            // Set this only if the provider accepts multiple tool responses for
            // one call, for example an immediate "working" response followed by
            // the final result.
            supportsToolResultContinuation: false,
            connect: async () => {},
            sendAudio: () => {},
            setMediaTimestamp: () => {},
            handleBargeIn: () => {},
            submitToolResult: () => {},
            acknowledgeMark: () => {},
            close: () => {},
            isConnected: () => true,
          }),
        });
        ```

        当传输可以检测到人类正在中断助手播放并且提供商支持截断或清除活动音频响应时，实现 `handleBargeIn`。
      </Tab>
      <Tab title="媒体理解">
        ```typescript
        api.registerMediaUnderstandingProvider({
          id: "acme-ai",
          capabilities: ["image", "audio"],
          describeImage: async (req) => ({ text: "A photo of..." }),
          transcribeAudio: async (req) => ({ text: "Transcript..." }),
        });
        ```
      </Tab>
      <Tab title="图像和视频生成">
        视频能力使用**模式感知**形状：`generate`、
        `imageToVideo` 和 `videoToVideo`。平面聚合字段（如
        `maxInputImages` / `maxInputVideos` / `maxDurationSeconds`）不足以
        干净地宣传变换模式支持或禁用的模式。
        音乐生成遵循相同的模式，带有显式的 `generate` / `edit` 块。

        ```typescript
        api.registerImageGenerationProvider({
          id: "acme-ai",
          label: "Acme Images",
          generate: async (req) => ({ /* image result */ }),
        });

        api.registerVideoGenerationProvider({
          id: "acme-ai",
          label: "Acme Video",
          capabilities: {
            generate: { maxVideos: 1, maxDurationSeconds: 10, supportsResolution: true },
            imageToVideo: {
              enabled: true,
              maxVideos: 1,
              maxInputImages: 1,
              maxInputImagesByModel: { "acme/reference-to-video": 9 },
              maxDurationSeconds: 5,
            },
            videoToVideo: { enabled: false },
          },
          generateVideo: async (req) => ({ videos: [] }),
        });
        ```
      </Tab>
      <Tab title="Web 获取和搜索">
        ```typescript
        api.registerWebFetchProvider({
          id: "acme-ai-fetch",
          label: "Acme Fetch",
          hint: "Fetch pages through Acme's rendering backend.",
          envVars: ["ACME_FETCH_API_KEY"],
          placeholder: "acme-...",
          signupUrl: "https://acme.example.com/fetch",
          credentialPath: "plugins.entries.acme.config.webFetch.apiKey",
          getCredentialValue: (fetchConfig) => fetchConfig?.acme?.apiKey,
          setCredentialValue: (fetchConfigTarget, value) => {
            const acme = (fetchConfigTarget.acme ??= {});
            acme.apiKey = value;
          },
          createTool: () => ({
            description: "Fetch a page through Acme Fetch.",
            parameters: {},
            execute: async (args) => ({ content: [] }),
          }),
        });

        api.registerWebSearchProvider({
          id: "acme-ai-search",
          label: "Acme Search",
          search: async (req) => ({ content: [] }),
        });
        ```
      </Tab>
    </Tabs>

  </Step>

  <Step title="测试">
    ### 步骤 6：测试

    ```typescript src/provider.test.ts
    import { describe, it, expect } from "vitest";
    // Export your provider config object from index.ts or a dedicated file
    import { acmeProvider } from "./provider.js";

    describe("acme-ai provider", () => {
      it("resolves dynamic models", () => {
        const model = acmeProvider.resolveDynamicModel!({
          modelId: "acme-beta-v3",
        } as any);
        expect(model.id).toBe("acme-beta-v3");
        expect(model.provider).toBe("acme-ai");
      });

      it("returns catalog when key is available", async () => {
        const result = await acmeProvider.catalog!.run({
          resolveProviderApiKey: () => ({ apiKey: "test-key" }),
        } as any);
        expect(result?.provider?.models).toHaveLength(2);
      });

      it("returns null catalog when no key", async () => {
        const result = await acmeProvider.catalog!.run({
          resolveProviderApiKey: () => ({ apiKey: undefined }),
        } as any);
        expect(result).toBeNull();
      });
    });
    ```

  </Step>
</Steps>

## 发布到 ClawHub

提供商插件的发布方式与任何其他外部代码插件相同：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

不要在这里使用旧版仅技能发布别名；插件包应该使用 `clawhub package publish`。

## 文件结构

```
<bundled-plugin-root>/acme-ai/
├── package.json              # openclaw.providers metadata
├── openclaw.plugin.json      # Manifest with provider auth metadata
├── index.ts                  # definePluginEntry + registerProvider
└── src/
    ├── provider.test.ts      # Tests
    └── usage.ts              # Usage endpoint (optional)
```

## 目录顺序参考

`catalog.order` 控制你的目录相对于内置提供商的合并时间：

| 顺序      | 何时         | 使用场景                     |
| --------- | ------------ | ---------------------------- |
| `simple`  | 第一轮       | 普通 API 密钥提供商          |
| `profile` | simple 之后  | 在认证配置文件上门控的提供商 |
| `paired`  | profile 之后 | 合成多个相关条目             |
| `late`    | 最后一轮     | 覆盖现有提供商（碰撞时优先） |

## 后续步骤

- [频道插件](/plugins/sdk-channel-plugins) — 如果你的插件还提供频道
- [SDK 运行时](/plugins/sdk-runtime) — `api.runtime` 助手（TTS、搜索、子 agent）
- [SDK 概览](/plugins/sdk-overview) — 完整子路径导入参考
- [插件内部](/plugins/architecture-internals#provider-runtime-hooks) — 钩子详情和捆绑示例

## 相关文档

- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
- [构建频道插件](/plugins/sdk-channel-plugins)
