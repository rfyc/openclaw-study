---
summary: "插件清单 + JSON 模式要求（严格配置验证）"
read_when:
  - 你正在构建一个 OpenClaw 插件
  - 你需要发布插件配置模式或调试插件验证错误
title: "插件清单"
---

此页面仅适用于**原生 OpenClaw 插件清单**。

有关兼容包布局，请参见[插件包](/plugins/bundles)。

兼容包格式使用不同的清单文件：

- Codex 包：`.codex-plugin/plugin.json`
- Claude 包：`.claude-plugin/plugin.json` 或不带清单的默认 Claude 组件布局
- Cursor 包：`.cursor-plugin/plugin.json`

OpenClaw 也会自动检测这些包布局，但它们不会根据此处描述的 `openclaw.plugin.json` 模式进行验证。

对于兼容包，OpenClaw 目前读取包元数据加上声明的技能根目录、Claude 命令根目录、Claude 包 `settings.json` 默认值、Claude 包 LSP 默认值，以及当布局符合 OpenClaw 运行时期望时支持的钩子包。

每个原生 OpenClaw 插件**必须**在**插件根目录**中提供 `openclaw.plugin.json` 文件。OpenClaw 使用此清单**在不执行插件代码的情况下**验证配置。缺失或无效的清单被视为插件错误，并阻止配置验证。

请参阅完整插件系统指南：[插件](/tools/plugin)。
有关原生能力模型和当前外部兼容性指南：[能力模型](/plugins/architecture#public-capability-model)。

## 此文件的作用

`openclaw.plugin.json` 是 OpenClaw 在**加载插件代码之前**读取的元数据。以下所有内容必须足够轻量，可以在不启动插件运行时的情况下检查。

**用于：**

- 插件标识、配置验证和配置 UI 提示
- 认证、引导和设置元数据（别名、自动启用、提供商环境变量、认证选项）
- 控制平面表面的激活提示
- 速记模型族所有权
- 静态能力所有权快照（`contracts`）
- 共享 `openclaw qa` 主机可以检查的 QA 运行器元数据
- 合并到目录和验证表面的频道特定配置元数据

**不用于：**注册运行时行为、声明代码入口点或 npm 安装元数据。这些属于插件代码和 `package.json`。

## 最小示例

```json
{
  "id": "voice-call",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

## 完整示例

```json
{
  "id": "openrouter",
  "name": "OpenRouter",
  "description": "OpenRouter provider plugin",
  "version": "1.0.0",
  "providers": ["openrouter"],
  "modelSupport": {
    "modelPrefixes": ["router-"]
  },
  "modelIdNormalization": {
    "providers": {
      "openrouter": {
        "prefixWhenBare": "openrouter"
      }
    }
  },
  "providerEndpoints": [
    {
      "endpointClass": "openrouter",
      "hostSuffixes": ["openrouter.ai"]
    }
  ],
  "providerRequest": {
    "providers": {
      "openrouter": {
        "family": "openrouter"
      }
    }
  },
  "cliBackends": ["openrouter-cli"],
  "syntheticAuthRefs": ["openrouter-cli"],
  "providerAuthEnvVars": {
    "openrouter": ["OPENROUTER_API_KEY"]
  },
  "providerAuthAliases": {
    "openrouter-coding": "openrouter"
  },
  "channelEnvVars": {
    "openrouter-chatops": ["OPENROUTER_CHATOPS_TOKEN"]
  },
  "providerAuthChoices": [
    {
      "provider": "openrouter",
      "method": "api-key",
      "choiceId": "openrouter-api-key",
      "choiceLabel": "OpenRouter API key",
      "groupId": "openrouter",
      "groupLabel": "OpenRouter",
      "optionKey": "openrouterApiKey",
      "cliFlag": "--openrouter-api-key",
      "cliOption": "--openrouter-api-key <key>",
      "cliDescription": "OpenRouter API key",
      "onboardingScopes": ["text-inference"]
    }
  ],
  "uiHints": {
    "apiKey": {
      "label": "API key",
      "placeholder": "sk-or-v1-...",
      "sensitive": true
    }
  },
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": {
        "type": "string"
      }
    }
  }
}
```

## 顶级字段参考

| 字段                                 | 必填 | 类型                             | 含义                                                                                                                                                             |
| ------------------------------------ | ---- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | 是   | `string`                         | 规范插件 id。这是 `plugins.entries.<id>` 中使用的 id。                                                                                                           |
| `configSchema`                       | 是   | `object`                         | 此插件配置的内联 JSON 模式。                                                                                                                                     |
| `enabledByDefault`                   | 否   | `true`                           | 将捆绑插件标记为默认启用。省略此项或设置任何非 `true` 值，则插件默认禁用。                                                                                       |
| `enabledByDefaultOnPlatforms`        | 否   | `string[]`                       | 仅在列出的 Node.js 平台上将捆绑插件标记为默认启用，例如 `["darwin"]`。显式配置仍然优先。                                                                         |
| `legacyPluginIds`                    | 否   | `string[]`                       | 规范化为此规范插件 id 的旧 id。                                                                                                                                  |
| `autoEnableWhenConfiguredProviders`  | 否   | `string[]`                       | 当认证、配置或模型引用提到这些提供商 id 时应自动启用此插件的提供商 id。                                                                                          |
| `kind`                               | 否   | `"memory"` \| `"context-engine"` | 声明 `plugins.slots.*` 使用的独占插件类型。                                                                                                                      |
| `channels`                           | 否   | `string[]`                       | 此插件拥有的频道 id。用于发现和配置验证。                                                                                                                        |
| `providers`                          | 否   | `string[]`                       | 此插件拥有的提供商 id。                                                                                                                                          |
| `providerDiscoveryEntry`             | 否   | `string`                         | 轻量级提供商发现模块路径，相对于插件根目录，用于可以在不激活完整插件运行时的情况下加载的清单范围内提供商目录元数据。                                             |
| `modelSupport`                       | 否   | `object`                         | 清单拥有的速记模型族元数据，在运行时之前用于自动加载插件。                                                                                                       |
| `modelCatalog`                       | 否   | `object`                         | 此插件拥有的提供商的声明式模型目录元数据。这是未来只读列表、引导、模型选择器、别名和无需加载插件运行时即可抑制的控制平面合约。                                   |
| `modelPricing`                       | 否   | `object`                         | 提供商拥有的外部定价查找策略。使用它将本地/自托管提供商退出远程定价目录，或在不将提供商 id 硬编码到核心中的情况下将提供商引用映射到 OpenRouter/LiteLLM 目录 id。 |
| `modelIdNormalization`               | 否   | `object`                         | 提供商拥有的模型 id 别名/前缀清理，必须在提供商运行时加载之前运行。                                                                                              |
| `providerEndpoints`                  | 否   | `object[]`                       | 清单拥有的端点主机/baseUrl 元数据，用于核心在提供商运行时加载之前必须分类的提供商路由。                                                                          |
| `providerRequest`                    | 否   | `object`                         | 通用请求策略在提供商运行时加载之前使用的廉价提供商族和请求兼容性元数据。                                                                                         |
| `cliBackends`                        | 否   | `string[]`                       | 此插件拥有的 CLI 推理后端 id。用于从显式配置引用进行启动自动激活。                                                                                               |
| `syntheticAuthRefs`                  | 否   | `string[]`                       | 提供商或 CLI 后端引用，其插件拥有的合成认证钩子应在运行时加载之前在冷模型发现期间探测。                                                                          |
| `nonSecretAuthMarkers`               | 否   | `string[]`                       | 捆绑插件拥有的占位 API 密钥值，代表非秘密的本地、OAuth 或环境凭证状态。                                                                                          |
| `commandAliases`                     | 否   | `object[]`                       | 此插件拥有的命令名称，在运行时加载之前应产生插件感知的配置和 CLI 诊断。                                                                                          |
| `providerAuthEnvVars`                | 否   | `Record<string, string[]>`       | 用于提供商认证/状态查找的弃用兼容性环境元数据。对于新插件，优先使用 `setup.providers[].envVars`；OpenClaw 在弃用窗口期间仍然读取此项。                           |
| `providerAuthAliases`                | 否   | `Record<string, string>`         | 应为认证查找重用另一个提供商 id 的提供商 id，例如共享基础提供商 API 密钥和认证配置文件的编码提供商。                                                             |
| `channelEnvVars`                     | 否   | `Record<string, string[]>`       | OpenClaw 可以在不加载插件代码的情况下检查的廉价频道环境元数据。将其用于通用启动/配置助手应看到的环境驱动的频道设置或认证表面。                                   |
| `providerAuthChoices`                | 否   | `object[]`                       | 用于引导选择器、首选提供商解析和简单 CLI 标志连接的廉价认证选项元数据。                                                                                          |
| `activation`                         | 否   | `object`                         | 用于启动、提供商、命令、频道、路由和能力触发加载的廉价激活规划器元数据。仅元数据；插件运行时仍然拥有实际行为。                                                   |
| `setup`                              | 否   | `object`                         | 发现和设置表面可以在不加载插件运行时的情况下检查的廉价设置/引导描述符。                                                                                          |
| `qaRunners`                          | 否   | `object[]`                       | 共享 `openclaw qa` 主机在插件运行时加载之前使用的廉价 QA 运行器描述符。                                                                                          |
| `contracts`                          | 否   | `object`                         | 用于外部认证钩子、语音、实时转录、实时语音、媒体理解、图像生成、音乐生成、视频生成、网络获取、网络搜索和工具所有权的静态能力所有权快照。                         |
| `mediaUnderstandingProviderMetadata` | 否   | `Record<string, object>`         | `contracts.mediaUnderstandingProviders` 中声明的提供商 id 的廉价媒体理解默认值。                                                                                 |
| `imageGenerationProviderMetadata`    | 否   | `Record<string, object>`         | `contracts.imageGenerationProviders` 中声明的提供商 id 的廉价图像生成认证元数据，包括提供商拥有的认证别名和 base-url 守卫。                                      |
| `videoGenerationProviderMetadata`    | 否   | `Record<string, object>`         | `contracts.videoGenerationProviders` 中声明的提供商 id 的廉价视频生成认证元数据，包括提供商拥有的认证别名和 base-url 守卫。                                      |
| `musicGenerationProviderMetadata`    | 否   | `Record<string, object>`         | `contracts.musicGenerationProviders` 中声明的提供商 id 的廉价音乐生成认证元数据，包括提供商拥有的认证别名和 base-url 守卫。                                      |
| `toolMetadata`                       | 否   | `Record<string, object>`         | `contracts.tools` 中声明的插件拥有工具的廉价可用性元数据。当工具不应在配置、环境或认证证据存在之前加载运行时时使用它。                                           |
| `channelConfigs`                     | 否   | `Record<string, object>`         | 在运行时加载之前合并到发现和验证表面的清单拥有的频道配置元数据。                                                                                                 |
| `skills`                             | 否   | `string[]`                       | 要加载的技能目录，相对于插件根目录。                                                                                                                             |
| `name`                               | 否   | `string`                         | 人类可读的插件名称。                                                                                                                                             |
| `description`                        | 否   | `string`                         | 在插件表面显示的简短摘要。                                                                                                                                       |
| `version`                            | 否   | `string`                         | 信息性插件版本。                                                                                                                                                 |
| `uiHints`                            | 否   | `Record<string, object>`         | 配置字段的 UI 标签、占位符和敏感度提示。                                                                                                                         |

## 生成提供商元数据参考

生成提供商元数据字段描述在匹配的 `contracts.*GenerationProviders` 列表中声明的提供商的静态认证信号。OpenClaw 在提供商运行时加载之前读取这些字段，以便核心工具可以在不导入每个提供商插件的情况下决定生成提供商是否可用。

这些字段仅用于廉价的声明性事实。传输、请求转换、令牌刷新、凭证验证和实际生成行为保留在插件运行时中。

```json
{
  "contracts": {
    "imageGenerationProviders": ["example-image"]
  },
  "imageGenerationProviderMetadata": {
    "example-image": {
      "aliases": ["example-image-oauth"],
      "authProviders": ["example-image"],
      "configSignals": [
        {
          "rootPath": "plugins.entries.example-image.config",
          "overlayPath": "image",
          "mode": {
            "path": "mode",
            "default": "local",
            "allowed": ["local"]
          },
          "requiredAny": ["workflow", "workflowPath"],
          "required": ["promptNodeId"]
        }
      ],
      "authSignals": [
        {
          "provider": "example-image"
        },
        {
          "provider": "example-image-oauth",
          "providerBaseUrl": {
            "provider": "example-image",
            "defaultBaseUrl": "https://api.example.com/v1",
            "allowedBaseUrls": ["https://api.example.com/v1"]
          }
        }
      ]
    }
  }
}
```

每个元数据条目支持：

| 字段            | 必填 | 类型       | 含义                                                                                           |
| --------------- | ---- | ---------- | ---------------------------------------------------------------------------------------------- |
| `aliases`       | 否   | `string[]` | 应算作生成提供商静态认证别名的额外提供商 id。                                                  |
| `authProviders` | 否   | `string[]` | 其已配置认证配置文件应算作此生成提供商认证的提供商 id。                                        |
| `configSignals` | 否   | `object[]` | 用于无需认证配置文件或环境变量即可配置的本地或自托管提供商的廉价仅配置可用性信号。             |
| `authSignals`   | 否   | `object[]` | 显式认证信号。如果存在，这些信号替换来自提供商 id、`aliases` 和 `authProviders` 的默认信号集。 |

每个 `configSignals` 条目支持：

| 字段          | 必填 | 类型       | 含义                                                                                                       |
| ------------- | ---- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| `rootPath`    | 是   | `string`   | 要检查的插件拥有配置对象的点路径，例如 `plugins.entries.example.config`。                                  |
| `overlayPath` | 否   | `string`   | 根配置内其对象在评估信号之前应覆盖根对象的点路径。将其用于特定能力的配置，如 `image`、`video` 或 `music`。 |
| `required`    | 否   | `string[]` | 有效配置中必须具有已配置值的点路径。字符串必须非空；对象和数组不得为空。                                   |
| `requiredAny` | 否   | `string[]` | 有效配置中至少一个必须具有已配置值的点路径。                                                               |
| `mode`        | 否   | `object`   | 有效配置中可选的字符串模式守卫。当仅配置可用性适用于一种模式时使用此项。                                   |

每个 `mode` 守卫支持：

| 字段         | 必填 | 类型       | 含义                                             |
| ------------ | ---- | ---------- | ------------------------------------------------ |
| `path`       | 否   | `string`   | 有效配置中的点路径。默认为 `mode`。              |
| `default`    | 否   | `string`   | 配置省略路径时使用的模式值。                     |
| `allowed`    | 否   | `string[]` | 如果存在，仅当有效模式是其中一个值时信号才通过。 |
| `disallowed` | 否   | `string[]` | 如果存在，当有效模式是其中一个值时信号失败。     |

每个 `authSignals` 条目支持：

| 字段              | 必填 | 类型     | 含义                                                                                                      |
| ----------------- | ---- | -------- | --------------------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string` | 在已配置认证配置文件中检查的提供商 id。                                                                   |
| `providerBaseUrl` | 否   | `object` | 可选守卫，使信号仅在引用的已配置提供商使用允许的 base URL 时计数。当认证别名仅对某些 API 有效时使用此项。 |

每个 `providerBaseUrl` 守卫支持：

| 字段              | 必填 | 类型       | 含义                                                                                          |
| ----------------- | ---- | ---------- | --------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string`   | 应检查其 `baseUrl` 的提供商配置 id。                                                          |
| `defaultBaseUrl`  | 否   | `string`   | 提供商配置省略 `baseUrl` 时假定的 base URL。                                                  |
| `allowedBaseUrls` | 是   | `string[]` | 此认证信号允许的 base URL。当配置的或默认的 base URL 与这些规范化值之一不匹配时，信号被忽略。 |

## 工具元数据参考

`toolMetadata` 使用与生成提供商元数据相同的 `configSignals` 和 `authSignals` 形状，以工具名称为键。`contracts.tools` 声明所有权。`toolMetadata` 声明廉价可用性证据，以便 OpenClaw 可以避免导入插件运行时仅为了让其工具工厂返回 `null`。

```json
{
  "providerAuthEnvVars": {
    "example": ["EXAMPLE_API_KEY"]
  },
  "contracts": {
    "tools": ["example_search"]
  },
  "toolMetadata": {
    "example_search": {
      "authSignals": [
        {
          "provider": "example"
        }
      ],
      "configSignals": [
        {
          "rootPath": "plugins.entries.example.config",
          "overlayPath": "search",
          "required": ["apiKey"]
        }
      ]
    }
  }
}
```

如果工具没有 `toolMetadata`，OpenClaw 保留现有行为，当工具合约与策略匹配时加载拥有插件。对于其工厂依赖认证/配置的热路径工具，插件作者应声明 `toolMetadata`，而不是让核心导入运行时来询问。

## providerAuthChoices 参考

每个 `providerAuthChoices` 条目描述一个引导或认证选项。OpenClaw 在提供商运行时加载之前读取此项。提供商设置列表使用这些清单选项、描述符派生的设置选项和安装目录元数据，而无需加载提供商运行时。

| 字段                  | 必填 | 类型                                            | 含义                                                                  |
| --------------------- | ---- | ----------------------------------------------- | --------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                        | 此选项所属的提供商 id。                                               |
| `method`              | 是   | `string`                                        | 要派发到的认证方法 id。                                               |
| `choiceId`            | 是   | `string`                                        | 引导和 CLI 流程使用的稳定认证选项 id。                                |
| `choiceLabel`         | 否   | `string`                                        | 面向用户的标签。如果省略，OpenClaw 回退到 `choiceId`。                |
| `choiceHint`          | 否   | `string`                                        | 选择器的简短帮助文本。                                                |
| `assistantPriority`   | 否   | `number`                                        | 较低的值在助手驱动的交互式选择器中排在前面。                          |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                  | 在允许手动 CLI 选择的同时从助手选择器中隐藏选项。                     |
| `deprecatedChoiceIds` | 否   | `string[]`                                      | 应将用户重定向到此替换选项的旧选项 id。                               |
| `groupId`             | 否   | `string`                                        | 用于分组相关选项的可选分组 id。                                       |
| `groupLabel`          | 否   | `string`                                        | 该分组的面向用户的标签。                                              |
| `groupHint`           | 否   | `string`                                        | 分组的简短帮助文本。                                                  |
| `optionKey`           | 否   | `string`                                        | 简单单标志认证流程的内部选项键。                                      |
| `cliFlag`             | 否   | `string`                                        | CLI 标志名称，例如 `--openrouter-api-key`。                           |
| `cliOption`           | 否   | `string`                                        | 完整 CLI 选项形状，例如 `--openrouter-api-key <key>`。                |
| `cliDescription`      | 否   | `string`                                        | CLI 帮助中使用的描述。                                                |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation">` | 此选项应出现在哪些引导表面中。如果省略，默认为 `["text-inference"]`。 |

## commandAliases 参考

当插件拥有用户可能错误地放在 `plugins.allow` 中或尝试作为根 CLI 命令运行的运行时命令名称时，使用 `commandAliases`。OpenClaw 使用此元数据进行诊断，而不导入插件运行时代码。

```json
{
  "commandAliases": [
    {
      "name": "dreaming",
      "kind": "runtime-slash",
      "cliCommand": "memory"
    }
  ]
}
```

| 字段         | 必填 | 类型              | 含义                                         |
| ------------ | ---- | ----------------- | -------------------------------------------- |
| `name`       | 是   | `string`          | 属于此插件的命令名称。                       |
| `kind`       | 否   | `"runtime-slash"` | 将别名标记为聊天斜杠命令而非根 CLI 命令。    |
| `cliCommand` | 否   | `string`          | 如果存在，为 CLI 操作建议的相关根 CLI 命令。 |

## activation 参考

当插件可以廉价地声明哪些控制平面事件应将其包含在激活/加载计划中时，使用 `activation`。

此块是规划器元数据，而非生命周期 API。它不注册运行时行为，不替换 `register(...)`，也不承诺插件代码已执行。激活规划器在回退到现有清单所有权元数据（如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和钩子）之前，使用这些字段缩小候选插件范围。

优先使用最能描述所有权的最窄元数据。当这些字段表达关系时，使用 `providers`、`channels`、`commandAliases`、设置描述符或 `contracts`。对于无法通过这些所有权字段表示的额外规划器提示，使用 `activation`。对于 CLI 运行时别名（如 `claude-cli`、`codex-cli` 或 `google-gemini-cli`），使用顶级 `cliBackends`；`activation.onAgentHarnesses` 仅用于尚没有所有权字段的嵌入式 agent harness id。

此块仅是元数据。它不注册运行时行为，也不替换 `register(...)`、`setupEntry` 或其他运行时/插件入口点。当前消费者在更广泛的插件加载之前将其用作缩小提示，因此缺失的非启动激活元数据通常只会损失性能；在清单所有权回退仍然存在的情况下，它不应改变正确性。

每个插件应该有意地设置 `activation.onStartup`。仅当插件必须在 Gateway 启动期间运行时才将其设置为 `true`。当插件在启动时是惰性的且应仅从更窄的触发器加载时，将其设置为 `false`。省略 `onStartup` 不再隐式地在启动时加载插件；对启动、频道、配置、agent-harness、内存或其他更窄的激活触发器使用显式激活元数据。

```json
{
  "activation": {
    "onStartup": false,
    "onProviders": ["openai"],
    "onCommands": ["models"],
    "onChannels": ["web"],
    "onRoutes": ["gateway-webhook"],
    "onConfigPaths": ["browser"],
    "onCapabilities": ["provider", "tool"]
  }
}
```

| 字段               | 必填 | 类型                                                 | 含义                                                                                                                           |
| ------------------ | ---- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `onStartup`        | 否   | `boolean`                                            | 显式 Gateway 启动激活。每个插件都应设置此项。`true` 在启动期间导入插件；`false` 保持启动惰性，除非另一个匹配的触发器需要加载。 |
| `onProviders`      | 否   | `string[]`                                           | 应在激活/加载计划中包含此插件的提供商 id。                                                                                     |
| `onAgentHarnesses` | 否   | `string[]`                                           | 应在激活/加载计划中包含此插件的嵌入式 agent harness 运行时 id。对 CLI 后端别名使用顶级 `cliBackends`。                         |
| `onCommands`       | 否   | `string[]`                                           | 应在激活/加载计划中包含此插件的命令 id。                                                                                       |
| `onChannels`       | 否   | `string[]`                                           | 应在激活/加载计划中包含此插件的频道 id。                                                                                       |
| `onRoutes`         | 否   | `string[]`                                           | 应在激活/加载计划中包含此插件的路由类型。                                                                                      |
| `onConfigPaths`    | 否   | `string[]`                                           | 当路径存在且未显式禁用时，应在启动/加载计划中包含此插件的根相对配置路径。                                                      |
| `onCapabilities`   | 否   | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 控制平面激活规划使用的广泛能力提示。尽可能优先使用更窄的字段。                                                                 |

当前活动消费者：

- Gateway 启动规划使用 `activation.onStartup` 进行显式启动导入
- 命令触发的 CLI 规划回退到旧版 `commandAliases[].cliCommand` 或 `commandAliases[].name`
- agent 运行时启动规划使用 `activation.onAgentHarnesses` 用于嵌入式 harness，使用顶级 `cliBackends[]` 用于 CLI 运行时别名
- 频道触发的设置/频道规划在缺少显式频道激活元数据时回退到旧版 `channels[]` 所有权
- 启动插件规划使用 `activation.onConfigPaths` 用于非频道根配置表面，例如捆绑浏览器插件的 `browser` 块
- 提供商触发的设置/运行时规划在缺少显式提供商激活元数据时回退到旧版 `providers[]` 和顶级 `cliBackends[]` 所有权

规划器诊断可以区分显式激活提示和清单所有权回退。例如，`activation-command-hint` 表示 `activation.onCommands` 匹配，而 `manifest-command-alias` 表示规划器使用了 `commandAliases` 所有权。这些原因标签用于主机诊断和测试；插件作者应继续声明最能描述所有权的元数据。

## qaRunners 参考

当插件在共享的 `openclaw qa` 根目录下提供一个或多个传输运行器时，使用 `qaRunners`。保持此元数据廉价和静态；插件运行时仍然通过导出 `qaRunnerCliRegistrations` 的轻量级 `runtime-api.ts` 表面拥有实际 CLI 注册。

```json
{
  "qaRunners": [
    {
      "commandName": "matrix",
      "description": "Run the Docker-backed Matrix live QA lane against a disposable homeserver"
    }
  ]
}
```

| 字段          | 必填 | 类型     | 含义                                             |
| ------------- | ---- | -------- | ------------------------------------------------ |
| `commandName` | 是   | `string` | 挂载在 `openclaw qa` 下的子命令，例如 `matrix`。 |
| `description` | 否   | `string` | 共享主机需要存根命令时使用的回退帮助文本。       |

## setup 参考

当设置和引导表面在运行时加载之前需要廉价的插件拥有元数据时，使用 `setup`。

```json
{
  "setup": {
    "providers": [
      {
        "id": "openai",
        "authMethods": ["api-key"],
        "envVars": ["OPENAI_API_KEY"],
        "authEvidence": [
          {
            "type": "local-file-with-env",
            "fileEnvVar": "OPENAI_CREDENTIALS_FILE",
            "requiresAllEnv": ["OPENAI_PROJECT"],
            "credentialMarker": "openai-local-credentials",
            "source": "openai local credentials"
          }
        ]
      }
    ],
    "cliBackends": ["openai-cli"],
    "configMigrations": ["legacy-openai-auth"],
    "requiresRuntime": false
  }
}
```

顶级 `cliBackends` 仍然有效，继续描述 CLI 推理后端。`setup.cliBackends` 是应保持仅元数据的控制平面/设置流程的设置特定描述符表面。

如果存在，`setup.providers` 和 `setup.cliBackends` 是设置发现的首选描述符优先查找表面。如果描述符仅缩小候选插件范围，而设置仍需要更丰富的设置时运行时钩子，则设置 `requiresRuntime: true` 并将 `setup-api` 保留为回退执行路径。

OpenClaw 还在通用提供商认证和环境变量查找中包含 `setup.providers[].envVars`。`providerAuthEnvVars` 在弃用窗口期间通过兼容性适配器仍受支持，但仍然使用它的非捆绑插件会收到清单诊断。新插件应将设置/状态环境元数据放在 `setup.providers[].envVars` 上。

当没有可用的设置条目时，或当 `setup.requiresRuntime: false` 声明设置运行时不必要时，OpenClaw 也可以从 `setup.providers[].authMethods` 派生简单的设置选项。显式的 `providerAuthChoices` 条目仍然优先用于自定义标签、CLI 标志、引导范围和助手元数据。

仅当这些描述符对于设置表面足够时，才将 `requiresRuntime` 设置为 `false`。OpenClaw 将显式的 `false` 视为仅描述符合约，不会为设置查找执行 `setup-api` 或 `openclaw.setupEntry`。如果仅描述符插件仍然提供这些设置运行时入口之一，OpenClaw 报告附加诊断并继续忽略它。省略 `requiresRuntime` 保留旧版回退行为，以便添加了描述符而没有该标志的现有插件不会中断。

由于设置查找可以执行插件拥有的 `setup-api` 代码，规范化的 `setup.providers[].id` 和 `setup.cliBackends[]` 值在发现的插件中必须保持唯一。模糊的所有权失败关闭，而不是从发现顺序中选择赢家。

当设置运行时确实执行时，如果 `setup-api` 注册了清单描述符未声明的提供商或 CLI 后端，或者描述符没有匹配的运行时注册，设置注册表诊断会报告描述符漂移。这些诊断是附加的，不拒绝旧版插件。

### setup.providers 参考

| 字段           | 必填 | 类型       | 含义                                                      |
| -------------- | ---- | ---------- | --------------------------------------------------------- |
| `id`           | 是   | `string`   | 设置或引导期间暴露的提供商 id。保持规范化 id 在全局唯一。 |
| `authMethods`  | 否   | `string[]` | 此提供商支持的无需加载完整运行时的设置/认证方法 id。      |
| `envVars`      | 否   | `string[]` | 通用设置/状态表面在插件运行时加载之前可以检查的环境变量。 |
| `authEvidence` | 否   | `object[]` | 可以通过非秘密标记认证的提供商的廉价本地认证证据检查。    |

`authEvidence` 适用于可以在不加载运行时代码的情况下验证的提供商拥有的本地凭证标记。这些检查必须保持廉价和本地：无网络调用、无钥匙串或秘密管理器读取、无 shell 命令，以及无提供商 API 探测。

支持的证据条目：

| 字段               | 必填 | 类型       | 含义                                                                                   |
| ------------------ | ---- | ---------- | -------------------------------------------------------------------------------------- |
| `type`             | 是   | `string`   | 目前为 `local-file-with-env`。                                                         |
| `fileEnvVar`       | 否   | `string`   | 包含显式凭证文件路径的环境变量。                                                       |
| `fallbackPaths`    | 否   | `string[]` | 当 `fileEnvVar` 不存在或为空时检查的本地凭证文件路径。支持 `${HOME}` 和 `${APPDATA}`。 |
| `requiresAnyEnv`   | 否   | `string[]` | 在证据有效之前，至少一个列出的环境变量必须非空。                                       |
| `requiresAllEnv`   | 否   | `string[]` | 在证据有效之前，每个列出的环境变量都必须非空。                                         |
| `credentialMarker` | 是   | `string`   | 证据存在时返回的非秘密标记。                                                           |
| `source`           | 否   | `string`   | 认证/状态输出的面向用户的来源标签。                                                    |

### setup 字段

| 字段               | 必填 | 类型       | 含义                                                              |
| ------------------ | ---- | ---------- | ----------------------------------------------------------------- |
| `providers`        | 否   | `object[]` | 设置和引导期间暴露的提供商设置描述符。                            |
| `cliBackends`      | 否   | `string[]` | 描述符优先设置查找使用的设置时后端 id。保持规范化 id 在全局唯一。 |
| `configMigrations` | 否   | `string[]` | 此插件设置表面拥有的配置迁移 id。                                 |
| `requiresRuntime`  | 否   | `boolean`  | 设置在描述符查找之后是否仍需要 `setup-api` 执行。                 |

## uiHints 参考

`uiHints` 是从配置字段名称到小渲染提示的映射。

```json
{
  "uiHints": {
    "apiKey": {
      "label": "API key",
      "help": "Used for OpenRouter requests",
      "placeholder": "sk-or-v1-...",
      "sensitive": true
    }
  }
}
```

每个字段提示可以包括：

| 字段          | 类型       | 含义                     |
| ------------- | ---------- | ------------------------ |
| `label`       | `string`   | 面向用户的字段标签。     |
| `help`        | `string`   | 简短帮助文本。           |
| `tags`        | `string[]` | 可选 UI 标签。           |
| `advanced`    | `boolean`  | 将字段标记为高级。       |
| `sensitive`   | `boolean`  | 将字段标记为秘密或敏感。 |
| `placeholder` | `string`   | 表单输入的占位符文本。   |

## contracts 参考

仅对 OpenClaw 可以在不导入插件运行时的情况下读取的静态能力所有权元数据使用 `contracts`。

```json
{
  "contracts": {
    "agentToolResultMiddleware": ["pi", "codex"],
    "externalAuthProviders": ["acme-ai"],
    "speechProviders": ["openai"],
    "realtimeTranscriptionProviders": ["openai"],
    "realtimeVoiceProviders": ["openai"],
    "memoryEmbeddingProviders": ["local"],
    "mediaUnderstandingProviders": ["openai", "openai-codex"],
    "imageGenerationProviders": ["openai"],
    "videoGenerationProviders": ["qwen"],
    "webFetchProviders": ["firecrawl"],
    "webSearchProviders": ["gemini"],
    "migrationProviders": ["hermes"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

每个列表都是可选的：

| 字段                             | 类型       | 含义                                                      |
| -------------------------------- | ---------- | --------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Codex app-server 扩展工厂 id，目前为 `codex-app-server`。 |
| `agentToolResultMiddleware`      | `string[]` | 捆绑插件可能为其注册工具结果中间件的运行时 id。           |
| `externalAuthProviders`          | `string[]` | 此插件拥有外部认证配置文件钩子的提供商 id。               |
| `speechProviders`                | `string[]` | 此插件拥有的语音提供商 id。                               |
| `realtimeTranscriptionProviders` | `string[]` | 此插件拥有的实时转录提供商 id。                           |
| `realtimeVoiceProviders`         | `string[]` | 此插件拥有的实时语音提供商 id。                           |
| `memoryEmbeddingProviders`       | `string[]` | 此插件拥有的内存嵌入提供商 id。                           |
| `mediaUnderstandingProviders`    | `string[]` | 此插件拥有的媒体理解提供商 id。                           |
| `imageGenerationProviders`       | `string[]` | 此插件拥有的图像生成提供商 id。                           |
| `videoGenerationProviders`       | `string[]` | 此插件拥有的视频生成提供商 id。                           |
| `webFetchProviders`              | `string[]` | 此插件拥有的网络获取提供商 id。                           |
| `webSearchProviders`             | `string[]` | 此插件拥有的网络搜索提供商 id。                           |
| `migrationProviders`             | `string[]` | 此插件为 `openclaw migrate` 拥有的导入提供商 id。         |
| `tools`                          | `string[]` | 此插件拥有的 agent 工具名称。                             |

`contracts.embeddedExtensionFactories` 保留用于捆绑的 Codex app-server 专属扩展工厂。捆绑的工具结果转换应声明 `contracts.agentToolResultMiddleware` 并用 `api.registerAgentToolResultMiddleware(...)` 注册。外部插件无法注册工具结果中间件，因为该接缝可以在模型看到之前重写高信任度的工具输出。

运行时 `api.registerTool(...)` 注册必须与 `contracts.tools` 匹配。工具发现使用此列表仅加载可以拥有所请求工具的插件运行时。

实现 `resolveExternalAuthProfiles` 的提供商插件应声明 `contracts.externalAuthProviders`。没有声明的插件仍然通过弃用的兼容性回退运行，但该回退速度较慢，并将在迁移窗口后删除。

捆绑的内存嵌入提供商应为其暴露的每个适配器 id 声明 `contracts.memoryEmbeddingProviders`，包括内置适配器（如 `local`）。独立 CLI 路径在完整 Gateway 运行时注册提供商之前使用此清单合约仅加载拥有插件。

## mediaUnderstandingProviderMetadata 参考

当媒体理解提供商具有通用核心助手在运行时加载之前需要的默认模型、自动认证回退优先级或原生文档支持时，使用 `mediaUnderstandingProviderMetadata`。键也必须在 `contracts.mediaUnderstandingProviders` 中声明。

```json
{
  "contracts": {
    "mediaUnderstandingProviders": ["example"]
  },
  "mediaUnderstandingProviderMetadata": {
    "example": {
      "capabilities": ["image", "audio"],
      "defaultModels": {
        "image": "example-vision-latest",
        "audio": "example-transcribe-latest"
      },
      "autoPriority": {
        "image": 40
      },
      "nativeDocumentInputs": ["pdf"]
    }
  }
}
```

每个提供商条目可以包括：

| 字段                   | 类型                                | 含义                                             |
| ---------------------- | ----------------------------------- | ------------------------------------------------ |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | 此提供商暴露的媒体能力。                         |
| `defaultModels`        | `Record<string, string>`            | 配置未指定模型时使用的能力到模型默认值。         |
| `autoPriority`         | `Record<string, number>`            | 较低的数字在自动凭证驱动的提供商回退中排在前面。 |
| `nativeDocumentInputs` | `"pdf"[]`                           | 提供商支持的原生文档输入。                       |

## channelConfigs 参考

当频道插件在运行时加载之前需要廉价的配置元数据时，使用 `channelConfigs`。当没有可用的设置条目时，或当 `setup.requiresRuntime: false` 声明设置运行时不必要时，只读频道设置/状态发现可以直接使用此元数据用于已配置的外部频道。

`channelConfigs` 是插件清单元数据，不是新的顶级用户配置节。用户仍然在 `channels.<channel-id>` 下配置频道实例。OpenClaw 读取清单元数据，以便在插件运行时代码执行之前决定哪个插件拥有该已配置的频道。

对于频道插件，`configSchema` 和 `channelConfigs` 描述不同的路径：

- `configSchema` 验证 `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` 验证 `channels.<channel-id>`

声明 `channels[]` 的非捆绑插件也应声明匹配的 `channelConfigs` 条目。没有它们，OpenClaw 仍然可以加载插件，但冷路径配置模式、设置和 Control UI 表面在插件运行时执行之前无法知道频道拥有的选项形状。

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` 和 `nativeSkillsAutoEnabled` 可以为在频道运行时加载之前运行的命令配置检查声明静态 `auto` 默认值。捆绑频道也可以通过 `package.json#openclaw.channel.commands` 以及其他包拥有的频道目录元数据发布相同的默认值。

```json
{
  "channelConfigs": {
    "matrix": {
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "homeserverUrl": { "type": "string" }
        }
      },
      "uiHints": {
        "homeserverUrl": {
          "label": "Homeserver URL",
          "placeholder": "https://matrix.example.com"
        }
      },
      "label": "Matrix",
      "description": "Matrix homeserver connection",
      "commands": {
        "nativeCommandsAutoEnabled": true,
        "nativeSkillsAutoEnabled": true
      },
      "preferOver": ["matrix-legacy"]
    }
  }
}
```

每个频道条目可以包括：

| 字段          | 类型                     | 含义                                                         |
| ------------- | ------------------------ | ------------------------------------------------------------ |
| `schema`      | `object`                 | `channels.<id>` 的 JSON 模式。每个声明的频道配置条目都需要。 |
| `uiHints`     | `Record<string, object>` | 该频道配置节的可选 UI 标签/占位符/敏感提示。                 |
| `label`       | `string`                 | 在运行时元数据未准备好时合并到选择器和检查表面的频道标签。   |
| `description` | `string`                 | 检查和目录表面的简短频道描述。                               |
| `commands`    | `object`                 | 用于预运行时配置检查的静态原生命令和原生技能自动默认值。     |
| `preferOver`  | `string[]`               | 此频道在选择表面中应优先于的旧版或低优先级插件 id。          |

### 替换另一个频道插件

当你的插件是另一个插件也可以提供的频道 id 的首选所有者时，使用 `preferOver`。常见情况是重命名的插件 id、取代捆绑插件的独立插件，或保持相同频道 id 以实现配置兼容性的维护分支。

```json
{
  "id": "acme-chat",
  "channels": ["chat"],
  "channelConfigs": {
    "chat": {
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "webhookUrl": { "type": "string" }
        }
      },
      "preferOver": ["chat"]
    }
  }
}
```

当配置了 `channels.chat` 时，OpenClaw 同时考虑频道 id 和首选插件 id。如果低优先级插件仅因为被捆绑或默认启用而被选中，OpenClaw 在有效运行时配置中禁用它，以便一个插件拥有频道及其工具。显式用户选择仍然优先：如果用户显式启用两个插件，OpenClaw 保留该选择，并报告重复的频道/工具诊断，而不是悄悄地更改请求的插件集。

将 `preferOver` 限制在真正可以提供相同频道的插件 id 上。它不是通用优先级字段，也不会重命名用户配置键。

## modelSupport 参考

当 OpenClaw 应该在插件运行时加载之前从速记模型 id（如 `gpt-5.5` 或 `claude-sonnet-4.6`）推断你的提供商插件时，使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 应用此优先级：

- 显式的 `provider/model` 引用使用拥有的 `providers` 清单元数据
- `modelPatterns` 优先于 `modelPrefixes`
- 如果一个非捆绑插件和一个捆绑插件都匹配，非捆绑插件获胜
- 其余的模糊性被忽略，直到用户或配置指定提供商

字段：

| 字段            | 类型       | 含义                                                   |
| --------------- | ---------- | ------------------------------------------------------ |
| `modelPrefixes` | `string[]` | 用 `startsWith` 与速记模型 id 匹配的前缀。             |
| `modelPatterns` | `string[]` | 在配置文件后缀移除后与速记模型 id 匹配的正则表达式源。 |

## modelCatalog 参考

当 OpenClaw 应该在加载插件运行时之前知道提供商模型元数据时，使用 `modelCatalog`。这是固定目录行、提供商别名、抑制规则和发现模式的清单拥有来源。运行时刷新仍然属于提供商运行时代码，但清单告诉核心何时需要运行时。

```json
{
  "providers": ["openai"],
  "modelCatalog": {
    "providers": {
      "openai": {
        "baseUrl": "https://api.openai.com/v1",
        "api": "openai-responses",
        "models": [
          {
            "id": "gpt-5.4",
            "name": "GPT-5.4",
            "input": ["text", "image"],
            "reasoning": true,
            "contextWindow": 256000,
            "maxTokens": 128000,
            "cost": {
              "input": 1.25,
              "output": 10,
              "cacheRead": 0.125
            },
            "status": "available",
            "tags": ["default"]
          }
        ]
      }
    },
    "aliases": {
      "azure-openai-responses": {
        "provider": "openai",
        "api": "azure-openai-responses"
      }
    },
    "suppressions": [
      {
        "provider": "azure-openai-responses",
        "model": "gpt-5.3-codex-spark",
        "reason": "not available on Azure OpenAI Responses"
      }
    ],
    "discovery": {
      "openai": "static"
    }
  }
}
```

顶级字段：

| 字段           | 类型                                                     | 含义                                                              |
| -------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| `providers`    | `Record<string, object>`                                 | 此插件拥有的提供商 id 的目录行。键也应出现在顶级 `providers` 中。 |
| `aliases`      | `Record<string, object>`                                 | 应解析为目录或抑制规划的拥有提供商的提供商别名。                  |
| `suppressions` | `object[]`                                               | 此插件为特定提供商原因抑制的来自另一来源的模型行。                |
| `discovery`    | `Record<string, "static" \| "refreshable" \| "runtime">` | 提供商目录是否可以从清单元数据读取、刷新到缓存，或需要运行时。    |

`aliases` 参与模型目录规划的提供商所有权查找。别名目标必须是同一插件拥有的顶级提供商。当提供商过滤列表使用别名时，OpenClaw 可以读取拥有清单并在不加载提供商运行时的情况下应用别名 API/base URL 覆盖。别名不扩展未过滤的目录列表；广泛列表仅发出拥有的规范提供商行。

`suppressions` 替换旧的提供商运行时 `suppressBuiltInModel` 钩子。仅当提供商由插件拥有或声明为以拥有提供商为目标的 `modelCatalog.aliases` 键时，才遵守抑制条目。在模型解析期间不再调用运行时抑制钩子。

提供商字段：

| 字段      | 类型                     | 含义                                      |
| --------- | ------------------------ | ----------------------------------------- |
| `baseUrl` | `string`                 | 此提供商目录中模型的可选默认 base URL。   |
| `api`     | `ModelApi`               | 此提供商目录中模型的可选默认 API 适配器。 |
| `headers` | `Record<string, string>` | 适用于此提供商目录的可选静态头部。        |
| `models`  | `object[]`               | 必需的模型行。没有 `id` 的行被忽略。      |

模型字段：

| 字段            | 类型                                                           | 含义                                                    |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| `id`            | `string`                                                       | 不带 `provider/` 前缀的提供商本地模型 id。              |
| `name`          | `string`                                                       | 可选显示名称。                                          |
| `api`           | `ModelApi`                                                     | 可选的每模型 API 覆盖。                                 |
| `baseUrl`       | `string`                                                       | 可选的每模型 base URL 覆盖。                            |
| `headers`       | `Record<string, string>`                                       | 可选的每模型静态头部。                                  |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | 模型接受的模态。                                        |
| `reasoning`     | `boolean`                                                      | 模型是否暴露推理行为。                                  |
| `contextWindow` | `number`                                                       | 原生提供商上下文窗口。                                  |
| `contextTokens` | `number`                                                       | 与 `contextWindow` 不同时的可选有效运行时上下文上限。   |
| `maxTokens`     | `number`                                                       | 已知时的最大输出令牌数。                                |
| `cost`          | `object`                                                       | 可选的每百万令牌 USD 定价，包括可选的 `tieredPricing`。 |
| `compat`        | `object`                                                       | 匹配 OpenClaw 模型配置兼容性的可选兼容性标志。          |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | 列表状态。仅在行根本不应出现时抑制。                    |
| `statusReason`  | `string`                                                       | 非可用状态显示的可选原因。                              |
| `replaces`      | `string[]`                                                     | 此模型取代的旧提供商本地模型 id。                       |
| `replacedBy`    | `string`                                                       | 已弃用行的替换提供商本地模型 id。                       |
| `tags`          | `string[]`                                                     | 选择器和过滤器使用的稳定标签。                          |

抑制字段：

| 字段                       | 类型       | 含义                                                            |
| -------------------------- | ---------- | --------------------------------------------------------------- |
| `provider`                 | `string`   | 要抑制的上游行的提供商 id。必须由此插件拥有或声明为拥有的别名。 |
| `model`                    | `string`   | 要抑制的提供商本地模型 id。                                     |
| `reason`                   | `string`   | 直接请求被抑制行时显示的可选消息。                              |
| `when.baseUrlHosts`        | `string[]` | 抑制生效之前所需的有效提供商 base URL 主机的可选列表。          |
| `when.providerConfigApiIn` | `string[]` | 抑制生效之前所需的精确提供商配置 `api` 值的可选列表。           |

不要在 `modelCatalog` 中放置仅运行时数据。仅当清单行对于提供商过滤列表和选择器表面足以跳过注册表/运行时发现时，才使用 `static`。当清单行是有用的可列出种子或补充但稍后刷新/缓存可以添加更多行时，使用 `refreshable`；可刷新行本身不具有权威性。当 OpenClaw 必须加载提供商运行时才能知道列表时，使用 `runtime`。

## modelIdNormalization 参考

对于在提供商运行时加载之前必须发生的廉价提供商拥有的模型 id 清理，使用 `modelIdNormalization`。这将别名（如短模型名称、提供商本地旧 id 和代理前缀规则）保留在拥有插件清单中，而不是在核心模型选择表中。

```json
{
  "providers": ["anthropic", "openrouter"],
  "modelIdNormalization": {
    "providers": {
      "anthropic": {
        "aliases": {
          "sonnet-4.6": "claude-sonnet-4-6"
        }
      },
      "openrouter": {
        "prefixWhenBare": "openrouter"
      }
    }
  }
}
```

提供商字段：

| 字段                                 | 类型                    | 含义                                                                |
| ------------------------------------ | ----------------------- | ------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | 不区分大小写的精确模型 id 别名。值按原样返回。                      |
| `stripPrefixes`                      | `string[]`              | 别名查找之前要删除的前缀，对旧版提供商/模型重复有用。               |
| `prefixWhenBare`                     | `string`                | 规范化的模型 id 尚未包含 `/` 时要添加的前缀。                       |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | 别名查找后的条件裸 id 前缀规则，以 `modelPrefix` 和 `prefix` 为键。 |

## providerEndpoints 参考

对于通用请求策略在提供商运行时加载之前必须知道的端点分类，使用 `providerEndpoints`。核心仍然拥有每个 `endpointClass` 的含义；插件清单拥有主机和 base URL 元数据。

端点字段：

| 字段                           | 类型       | 含义                                                                      |
| ------------------------------ | ---------- | ------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | 已知的核心端点类，如 `openrouter`、`moonshot-native` 或 `google-vertex`。 |
| `hosts`                        | `string[]` | 映射到端点类的精确主机名。                                                |
| `hostSuffixes`                 | `string[]` | 映射到端点类的主机后缀。以 `.` 为前缀用于仅域后缀匹配。                   |
| `baseUrls`                     | `string[]` | 映射到端点类的精确规范化 HTTP(S) base URL。                               |
| `googleVertexRegion`           | `string`   | 精确全局主机的静态 Google Vertex 区域。                                   |
| `googleVertexRegionHostSuffix` | `string`   | 从匹配主机中剥离以暴露 Google Vertex 区域前缀的后缀。                     |

## providerRequest 参考

对于通用请求策略在不加载提供商运行时的情况下需要的廉价请求兼容性元数据，使用 `providerRequest`。将特定于行为的有效载荷重写保留在提供商运行时钩子或共享提供商族助手中。

```json
{
  "providers": ["vllm"],
  "providerRequest": {
    "providers": {
      "vllm": {
        "family": "vllm",
        "openAICompletions": {
          "supportsStreamingUsage": true
        }
      }
    }
  }
}
```

提供商字段：

| 字段                  | 类型         | 含义                                                         |
| --------------------- | ------------ | ------------------------------------------------------------ |
| `family`              | `string`     | 通用请求兼容性决策和诊断使用的提供商族标签。                 |
| `compatibilityFamily` | `"moonshot"` | 共享请求助手的可选提供商族兼容性存储桶。                     |
| `openAICompletions`   | `object`     | OpenAI 兼容的完成请求标志，目前为 `supportsStreamingUsage`。 |

## modelPricing 参考

当提供商在运行时加载之前需要控制平面定价行为时，使用 `modelPricing`。Gateway 定价缓存读取此元数据，而不导入提供商运行时代码。

```json
{
  "providers": ["ollama", "openrouter"],
  "modelPricing": {
    "providers": {
      "ollama": {
        "external": false
      },
      "openrouter": {
        "openRouter": {
          "passthroughProviderModel": true
        },
        "liteLLM": false
      }
    }
  }
}
```

提供商字段：

| 字段         | 类型              | 含义                                                                           |
| ------------ | ----------------- | ------------------------------------------------------------------------------ |
| `external`   | `boolean`         | 将本地/自托管提供商设置为 `false`，以防止它们获取 OpenRouter 或 LiteLLM 定价。 |
| `openRouter` | `false \| object` | OpenRouter 定价查找映射。`false` 禁用此提供商的 OpenRouter 查找。              |
| `liteLLM`    | `false \| object` | LiteLLM 定价查找映射。`false` 禁用此提供商的 LiteLLM 查找。                    |

来源字段：

| 字段                       | 类型               | 含义                                                                                    |
| -------------------------- | ------------------ | --------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | 与 OpenClaw 提供商 id 不同时的外部目录提供商 id，例如用于 `zai` 提供商的 `z-ai`。       |
| `passthroughProviderModel` | `boolean`          | 将包含斜杠的模型 id 视为嵌套的 provider/model 引用，对代理提供商（如 OpenRouter）有用。 |
| `modelIdTransforms`        | `"version-dots"[]` | 额外的外部目录模型 id 变体。`version-dots` 尝试点版本 id，如 `claude-opus-4.6`。        |

### OpenClaw 提供商索引

OpenClaw 提供商索引是 OpenClaw 拥有的预览元数据，用于可能尚未安装其插件的提供商。它不是插件清单的一部分。插件清单仍然是已安装插件的权威。提供商索引是未来可安装提供商和预安装模型选择器表面在未安装提供商插件时将消费的内部回退合约。

目录权威顺序：

1. 用户配置。
2. 已安装的插件清单 `modelCatalog`。
3. 来自显式刷新的模型目录缓存。
4. OpenClaw 提供商索引预览行。

提供商索引不得包含秘密、启用状态、运行时钩子或实时账户特定的模型数据。其预览目录使用与插件清单相同的 `modelCatalog` 提供商行形状，但除非运行时适配器字段（如 `api`、`baseUrl`、定价或兼容性标志）有意与已安装插件清单保持一致，否则应限制在稳定的显示元数据上。具有实时 `/models` 发现的提供商应通过显式模型目录缓存路径写入刷新的行，而不是让普通列表或引导调用提供商 API。

提供商索引条目还可以携带已从核心迁出或尚未安装的提供商的可安装插件元数据。此元数据反映频道目录模式：包名、npm 安装规范、预期完整性和廉价认证选项标签足以显示可安装的设置选项。一旦插件安装完成，其清单获胜，该提供商的提供商索引条目被忽略。

旧版顶级能力键已被弃用。使用 `openclaw doctor --fix` 将 `speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders` 和 `webSearchProviders` 移到 `contracts` 下；正常清单加载不再将这些顶级字段视为能力所有权。

## 清单与 package.json

这两个文件服务于不同的工作：

| 文件                   | 用途                                                                             |
| ---------------------- | -------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 在插件代码运行之前必须存在的发现、配置验证、认证选项元数据和 UI 提示             |
| `package.json`         | npm 元数据、依赖安装，以及用于入口点、安装门控、设置或目录元数据的 `openclaw` 块 |

如果你不确定某段元数据属于哪里，请使用此规则：

- 如果 OpenClaw 必须在加载插件代码之前知道它，将其放在 `openclaw.plugin.json` 中
- 如果它是关于打包、入口文件或 npm 安装行为的，将其放在 `package.json` 中

### 影响发现的 package.json 字段

一些预运行时插件元数据故意存在于 `package.json` 的 `openclaw` 块中，而不是 `openclaw.plugin.json` 中。`openclaw.bundle` 和 `openclaw.bundle.json` 不是 OpenClaw 插件合约；原生插件必须使用 `openclaw.plugin.json` 加上下面支持的 `package.json#openclaw` 字段。

重要示例：

| 字段                                                                                       | 含义                                                                                                    |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                                                      | 声明原生插件入口点。必须保持在插件包目录内。                                                            |
| `openclaw.runtimeExtensions`                                                               | 声明已安装包的构建 JavaScript 运行时入口点。必须保持在插件包目录内。                                    |
| `openclaw.setupEntry`                                                                      | 在引导、延迟频道启动和只读频道状态/SecretRef 发现期间使用的轻量级仅设置入口点。必须保持在插件包目录内。 |
| `openclaw.runtimeSetupEntry`                                                               | 声明已安装包的构建 JavaScript 设置入口点。需要 `setupEntry`，必须存在，且必须保持在插件包目录内。       |
| `openclaw.channel`                                                                         | 廉价频道目录元数据，如标签、文档路径、别名和选择文案。                                                  |
| `openclaw.channel.commands`                                                                | 在频道运行时加载之前由配置、审计和命令列表表面使用的静态原生命令和原生技能自动默认元数据。              |
| `openclaw.channel.configuredState`                                                         | 轻量级已配置状态检查器元数据，可以在不加载完整频道运行时的情况下回答"仅环境设置是否已存在？"            |
| `openclaw.channel.persistedAuthState`                                                      | 轻量级持久认证状态检查器元数据，可以在不加载完整频道运行时的情况下回答"是否有任何内容已登录？"          |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | 捆绑和外部发布插件的安装/更新提示。                                                                     |
| `openclaw.install.defaultChoice`                                                           | 当多个安装来源可用时的首选安装路径。                                                                    |
| `openclaw.install.minHostVersion`                                                          | 最低支持的 OpenClaw 主机版本，使用 semver 下限，如 `>=2026.3.22` 或 `>=2026.5.1-beta.1`。               |
| `openclaw.install.expectedIntegrity`                                                       | 预期的 npm dist 完整性字符串，如 `sha512-...`；安装和更新流程根据它验证获取的工件。                     |
| `openclaw.install.allowInvalidConfigRecovery`                                              | 允许在配置无效时通过窄的捆绑插件重新安装恢复路径。                                                      |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | 让仅设置的频道表面在启动期间在完整频道插件之前加载。                                                    |

清单元数据在运行时加载之前决定哪些提供商/频道/设置选项出现在引导中。`package.json#openclaw.install` 告诉引导在用户选择其中一个选项时如何获取或启用该插件。不要将安装提示移到 `openclaw.plugin.json` 中。

`openclaw.install.minHostVersion` 在安装期间和非捆绑插件来源的清单注册表加载期间强制执行。无效值被拒绝；有效的更新版本在旧主机上跳过外部插件。捆绑来源插件假定与主机检出同版本。

官方按需安装元数据在插件发布在 ClawHub 上时应使用 `clawhubSpec`；引导将其视为首选远程来源，并在安装后记录 ClawHub 工件事实。`npmSpec` 仍然是尚未迁移到 ClawHub 的包的兼容性回退。

精确的 npm 版本固定已在 `npmSpec` 中，例如 `"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`。官方外部目录条目应将精确规范与 `expectedIntegrity` 配对，以便在获取的 npm 工件不再匹配固定版本时更新流程失败关闭。交互式引导仍然提供受信任的注册表 npm 规范，包括裸包名称和 dist-tags，以实现兼容性。目录诊断可以区分精确、浮动、完整性固定、缺少完整性、包名不匹配和无效默认选择来源。当 `expectedIntegrity` 存在但没有有效的 npm 来源可以固定时，它们也会警告。当 `expectedIntegrity` 存在时，安装/更新流程强制执行它；当省略时，注册表解析在没有完整性固定的情况下记录。

当状态、频道列表或 SecretRef 扫描需要在不加载完整运行时的情况下识别已配置账户时，频道插件应提供 `openclaw.setupEntry`。设置入口应暴露频道元数据加上设置安全的配置、状态和秘密适配器；将网络客户端、Gateway 监听器和传输运行时保留在主扩展入口点中。

运行时入口点字段不会覆盖源入口点字段的包边界检查。例如，`openclaw.runtimeExtensions` 无法使逃逸的 `openclaw.extensions` 路径可加载。

`openclaw.install.allowInvalidConfigRecovery` 故意设计得很窄。它不会使任意损坏的配置可安装。目前它只允许安装流程从特定的陈旧捆绑插件升级失败中恢复，例如缺少捆绑插件路径或同一捆绑插件的陈旧 `channels.<id>` 条目。不相关的配置错误仍然阻止安装，并将运营商发送到 `openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是一个微小检查器模块的包元数据：

```json
{
  "openclaw": {
    "channel": {
      "id": "whatsapp",
      "persistedAuthState": {
        "specifier": "./auth-presence",
        "exportName": "hasAnyWhatsAppAuth"
      }
    }
  }
}
```

当设置、doctor、状态或只读存在流程在完整频道插件加载之前需要廉价的是/否认证探测时，使用它。持久认证状态不是已配置的频道状态：不要使用此元数据自动启用插件、修复运行时依赖或决定频道运行时是否应该加载。目标导出应该是仅读取持久状态的小函数；不要通过完整的频道运行时桶路由它。

`openclaw.channel.configuredState` 遵循相同的形状用于廉价的仅环境配置检查：

```json
{
  "openclaw": {
    "channel": {
      "id": "telegram",
      "configuredState": {
        "specifier": "./configured-state",
        "exportName": "hasTelegramConfiguredState"
      }
    }
  }
}
```

当频道可以从环境或其他微小非运行时输入回答已配置状态时，使用它。如果检查需要完整的配置解析或真实的频道运行时，将该逻辑保留在插件 `config.hasConfiguredState` 钩子中。

## 发现优先级（重复插件 id）

OpenClaw 从几个根目录（捆绑、全局安装、工作区、显式配置选定路径）发现插件。如果两个发现共享相同的 `id`，只保留**最高优先级**的清单；低优先级的重复项被丢弃，而不是加载在它旁边。

优先级从高到低：

1. **配置选定** — 显式固定在 `plugins.entries.<id>` 中的路径
2. **捆绑** — 随 OpenClaw 一起提供的插件
3. **全局安装** — 安装到全局 OpenClaw 插件根目录的插件
4. **工作区** — 相对于当前工作区发现的插件

含义：

- 工作区中捆绑插件的分叉或陈旧副本不会遮蔽捆绑构建。
- 要实际用本地插件覆盖捆绑插件，通过 `plugins.entries.<id>` 固定它，以便它通过优先级获胜，而不是依赖工作区发现。
- 重复项丢弃被记录日志，以便 Doctor 和启动诊断可以指向被丢弃的副本。
- 配置选定的重复覆盖在诊断中措辞为显式覆盖，但仍然发出警告，以便陈旧分叉和意外遮蔽保持可见。

## JSON 模式要求

- **每个插件都必须提供 JSON 模式**，即使它不接受任何配置。
- 空模式是可接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- 模式在配置读/写时验证，而不是在运行时。
- 当使用新配置键扩展或分叉捆绑插件时，同时更新该插件的 `openclaw.plugin.json` `configSchema`。捆绑插件模式是严格的，因此在用户配置中添加 `plugins.entries.<id>.config.myNewKey` 而不在 `configSchema.properties` 中添加 `myNewKey` 将在插件运行时加载之前被拒绝。

模式扩展示例：

```json
{
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "myNewKey": {
        "type": "string"
      }
    }
  }
}
```

## 验证行为

- 未知的 `channels.*` 键是**错误**，除非频道 id 由插件清单声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*` 必须引用**可发现的**插件 id。未知 id 是**错误**。
- 如果插件已安装但具有损坏或缺失的清单或模式，验证失败，Doctor 报告插件错误。
- 如果插件配置存在但插件**已禁用**，配置被保留，Doctor 和日志中显示**警告**。

有关完整的 `plugins.*` 模式，请参见[配置参考](/gateway/configuration)。

## 注意事项

- 清单**对于原生 OpenClaw 插件是必需的**，包括本地文件系统加载。运行时仍然单独加载插件模块；清单仅用于发现和验证。
- 原生清单使用 JSON5 解析，因此注释、尾随逗号和未引号键都是可接受的，只要最终值仍然是一个对象。
- 清单加载器只读取文档化的清单字段。避免自定义顶级键。
- 当插件不需要时，`channels`、`providers`、`cliBackends` 和 `skills` 都可以省略。
- `providerDiscoveryEntry` 必须保持轻量级，不应导入广泛的运行时代码；将其用于静态提供商目录元数据或窄发现描述符，而不是请求时执行。
- 独占插件类型通过 `plugins.slots.*` 选择：`kind: "memory"` 通过 `plugins.slots.memory`，`kind: "context-engine"` 通过 `plugins.slots.contextEngine`（默认 `legacy`）。
- 在此清单中声明独占插件类型。运行时入口 `OpenClawPluginDefinition.kind` 已被弃用，仅作为旧版插件的兼容性回退保留。
- 环境变量元数据（`setup.providers[].envVars`、已弃用的 `providerAuthEnvVars` 和 `channelEnvVars`）仅是声明性的。状态、审计、cron 交付验证和其他只读表面在将环境变量视为已配置之前仍然应用插件信任和有效激活策略。
- 有关需要提供商代码的运行时向导元数据，请参见[提供商运行时钩子](/plugins/architecture-internals#provider-runtime-hooks)。
- 如果你的插件依赖于原生模块，请记录构建步骤和任何包管理器允许列表要求（例如，pnpm `allow-build-scripts` + `pnpm rebuild <package>`）。

## 相关

<CardGroup cols={3}>
  <Card title="构建插件" href="/plugins/building-plugins" icon="rocket">
    插件入门。
  </Card>
  <Card title="插件架构" href="/plugins/architecture" icon="diagram-project">
    内部架构和能力模型。
  </Card>
  <Card title="SDK 概述" href="/plugins/sdk-overview" icon="book">
    插件 SDK 参考和子路径导入。
  </Card>
</CardGroup>
