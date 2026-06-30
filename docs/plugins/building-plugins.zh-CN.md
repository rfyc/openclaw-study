---
summary: "几分钟内创建你的第一个 OpenClaw 插件"
title: "构建插件"
sidebarTitle: "入门"
read_when:
  - 你想创建一个新的 OpenClaw 插件
  - 你需要插件开发的快速入门
  - 你正在为 OpenClaw 添加新频道、提供商、工具或其他能力
---

插件通过新能力扩展 OpenClaw：频道、模型提供商、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、Web 抓取、Web 搜索、agent 工具，或以上任意组合。

你不需要将插件添加到 OpenClaw 仓库。发布到 [ClawHub](/tools/clawhub)，用户使用 `openclaw plugins install clawhub:<package-name>` 安装即可。在发布切换期间，裸包规范仍从 npm 安装。

## 前提条件

- Node >= 22 和包管理器（npm 或 pnpm）
- 熟悉 TypeScript (ESM)
- 对于仓库内插件：克隆仓库并完成 `pnpm install`。源码检出插件开发仅支持 pnpm，因为 OpenClaw 从 `extensions/*` 工作区包加载捆绑插件。

## 要构建哪种插件？

<CardGroup cols={3}>
  <Card title="频道插件" icon="messages-square" href="/plugins/sdk-channel-plugins">
    将 OpenClaw 连接到消息平台（Discord、IRC 等）
  </Card>
  <Card title="提供商插件" icon="cpu" href="/plugins/sdk-provider-plugins">
    添加模型提供商（LLM、代理或自定义端点）
  </Card>
  <Card title="工具 / 钩子插件" icon="wrench" href="/plugins/hooks">
    注册 agent 工具、事件钩子或服务——继续阅读下文
  </Card>
</CardGroup>

对于不能保证在引导/设置运行时已安装的频道插件，使用 `openclaw/plugin-sdk/channel-setup` 中的 `createOptionalChannelSetupSurface(...)`。它生成一个设置适配器 + 向导对，宣传安装要求，并在插件安装之前对真实配置写入失败关闭。

## 快速入门：工具插件

本演练创建一个注册 agent 工具的最小插件。频道和提供商插件有上方链接的专属指南。

<Steps>
  <Step title="创建包和清单">
    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-my-plugin",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
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
      "id": "my-plugin",
      "name": "My Plugin",
      "description": "Adds a custom tool to OpenClaw",
      "contracts": {
        "tools": ["my_tool"]
      },
      "activation": {
        "onStartup": true
      },
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    每个插件都需要清单，即使没有配置也是如此。运行时注册的工具必须在 `contracts.tools` 中列出，以便 OpenClaw 可以在不加载每个插件运行时的情况下发现拥有插件。插件还应有意声明 `activation.onStartup`。此示例将其设置为 `true`。完整模式请参见[清单](/plugins/manifest)。规范的 ClawHub 发布片段位于 `docs/snippets/plugin-publish/`。

  </Step>

  <Step title="编写入口点">

    ```typescript
    // index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import { Type } from "@sinclair/typebox";

    export default definePluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Adds a custom tool to OpenClaw",
      register(api) {
        api.registerTool({
          name: "my_tool",
          description: "Do a thing",
          parameters: Type.Object({ input: Type.String() }),
          async execute(_id, params) {
            return { content: [{ type: "text", text: `Got: ${params.input}` }] };
          },
        });
      },
    });
    ```

    `definePluginEntry` 用于非频道插件。对于频道，使用 `defineChannelPluginEntry`——参见[频道插件](/plugins/sdk-channel-plugins)。完整入口点选项请参见[入口点](/plugins/sdk-entrypoints)。

  </Step>

  <Step title="测试和发布">

    **外部插件：** 使用 ClawHub 验证和发布，然后安装：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    在发布切换期间，`@myorg/openclaw-my-plugin` 等裸包规范从 npm 安装。使用 `clawhub:` 时进行 ClawHub 解析。

    **仓库内插件：** 放置在捆绑插件工作区树下——自动发现。

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## 插件能力

单个插件可以通过 `api` 对象注册任意数量的能力：

| 能力           | 注册方法                                         | 详细指南                                                                  |
| -------------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| 文本推理 (LLM) | `api.registerProvider(...)`                      | [提供商插件](/plugins/sdk-provider-plugins)                               |
| CLI 推理后端   | `api.registerCliBackend(...)`                    | [CLI 后端](/gateway/cli-backends)                                         |
| 频道 / 消息    | `api.registerChannel(...)`                       | [频道插件](/plugins/sdk-channel-plugins)                                  |
| 语音 (TTS/STT) | `api.registerSpeechProvider(...)`                | [提供商插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 实时转录       | `api.registerRealtimeTranscriptionProvider(...)` | [提供商插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 实时语音       | `api.registerRealtimeVoiceProvider(...)`         | [提供商插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒体理解       | `api.registerMediaUnderstandingProvider(...)`    | [提供商插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 图像生成       | `api.registerImageGenerationProvider(...)`       | [提供商插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 音乐生成       | `api.registerMusicGenerationProvider(...)`       | [提供商插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 视频生成       | `api.registerVideoGenerationProvider(...)`       | [提供商插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Web 抓取       | `api.registerWebFetchProvider(...)`              | [提供商插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Web 搜索       | `api.registerWebSearchProvider(...)`             | [提供商插件](/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 工具结果中间件 | `api.registerAgentToolResultMiddleware(...)`     | [SDK 概览](/plugins/sdk-overview#registration-api)                        |
| Agent 工具     | `api.registerTool(...)`                          | 下文                                                                      |
| 自定义命令     | `api.registerCommand(...)`                       | [入口点](/plugins/sdk-entrypoints)                                        |
| 插件钩子       | `api.on(...)`                                    | [插件钩子](/plugins/hooks)                                                |
| 内部事件钩子   | `api.registerHook(...)`                          | [入口点](/plugins/sdk-entrypoints)                                        |
| HTTP 路由      | `api.registerHttpRoute(...)`                     | [内部机制](/plugins/architecture-internals#gateway-http-routes)           |
| CLI 子命令     | `api.registerCli(...)`                           | [入口点](/plugins/sdk-entrypoints)                                        |

完整注册 API 请参见 [SDK 概览](/plugins/sdk-overview#registration-api)。

当捆绑插件需要在模型看到输出之前进行异步工具结果重写时，可以使用 `api.registerAgentToolResultMiddleware(...)`。在 `contracts.agentToolResultMiddleware` 中声明目标运行时，例如 `["pi", "codex"]`。这是受信任的捆绑插件接缝；外部插件应优先使用常规 OpenClaw 插件钩子，除非 OpenClaw 为此能力增加了明确的信任策略。

如果你的插件注册自定义 Gateway RPC 方法，请将它们保留在插件特定的前缀上。核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）保持保留状态，始终解析为 `operator.admin`，即使插件请求更窄的范围。

需要注意的钩子守卫语义：

- `before_tool_call`：`{ block: true }` 是终止性的，停止优先级较低的处理程序。
- `before_tool_call`：`{ block: false }` 被视为无决定。
- `before_tool_call`：`{ requireApproval: true }` 暂停 agent 执行并通过 exec 审批覆盖、Telegram 按钮、Discord 交互或任意频道上的 `/approve` 命令提示用户审批。
- `before_install`：`{ block: true }` 是终止性的，停止优先级较低的处理程序。
- `before_install`：`{ block: false }` 被视为无决定。
- `message_sending`：`{ cancel: true }` 是终止性的，停止优先级较低的处理程序。
- `message_sending`：`{ cancel: false }` 被视为无决定。
- `message_received`：需要入站线程/话题路由时，优先使用类型化的 `threadId` 字段。将 `metadata` 保留用于频道特定的额外信息。
- `message_sending`：优先使用类型化的 `replyToId` / `threadId` 路由字段，而非频道特定的元数据键。

`/approve` 命令处理 exec 和插件审批，具有有界回退：当未找到 exec 审批 id 时，OpenClaw 通过插件审批重试相同的 id。插件审批转发可通过配置中的 `approvals.plugin` 独立配置。

如果自定义审批管道需要检测同样的有界回退情况，优先使用 `openclaw/plugin-sdk/error-runtime` 中的 `isApprovalNotFoundError`，而非手动匹配审批过期字符串。

示例和钩子参考请参见[插件钩子](/plugins/hooks)。

## 注册 agent 工具

工具是 LLM 可以调用的类型化函数。它们可以是必需的（始终可用）或可选的（用户选择启用）：

```typescript
register(api) {
  // 必需工具——始终可用
  api.registerTool({
    name: "my_tool",
    description: "Do a thing",
    parameters: Type.Object({ input: Type.String() }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });

  // 可选工具——用户必须添加到允许列表
  api.registerTool(
    {
      name: "workflow_tool",
      description: "Run a workflow",
      parameters: Type.Object({ pipeline: Type.String() }),
      async execute(_id, params) {
        return { content: [{ type: "text", text: params.pipeline }] };
      },
    },
    { optional: true },
  );
}
```

使用 `api.registerTool(...)` 注册的每个工具还必须在插件清单中声明：

```json
{
  "contracts": {
    "tools": ["my_tool", "workflow_tool"]
  },
  "toolMetadata": {
    "workflow_tool": {
      "optional": true
    }
  }
}
```

OpenClaw 从注册工具中捕获并缓存经过验证的描述符，因此插件不必在清单中重复 `description` 或模式数据。清单合约只声明所有权和发现；执行仍调用实时注册的工具实现。对于使用 `api.registerTool(..., { optional: true })` 注册的工具，设置 `toolMetadata.<tool>.optional: true`，以便 OpenClaw 可以避免在工具被明确允许之前加载该插件运行时。

用户在配置中启用可选工具：

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- 工具名称不能与核心工具冲突（冲突会被跳过）
- 注册对象格式错误（包括缺少 `parameters`）的工具会被跳过，并在插件诊断中报告，而不会中断 agent 运行
- 对有副作用或有额外二进制要求的工具使用 `optional: true`
- 用户可以通过将插件 id 添加到 `tools.allow` 来启用插件的所有工具

## 注册 CLI 命令

插件可以使用 `api.registerCli` 添加根 `openclaw` 命令组。为每个顶级命令根提供 `descriptors`，以便 OpenClaw 可以显示和路由命令，而无需急切地加载每个插件运行时。

```typescript
register(api) {
  api.registerCli(
    ({ program }) => {
      const demo = program
        .command("demo-plugin")
        .description("Run demo plugin commands");

      demo
        .command("ping")
        .description("Check that the plugin CLI is executable")
        .action(() => {
          console.log("demo-plugin:pong");
        });
    },
    {
      descriptors: [
        {
          name: "demo-plugin",
          description: "Run demo plugin commands",
          hasSubcommands: true,
        },
      ],
    },
  );
}
```

安装后，验证运行时注册并执行命令：

```bash
openclaw plugins inspect demo-plugin --runtime --json
openclaw demo-plugin ping
```

## 导入约定

始终从专注的 `openclaw/plugin-sdk/<subpath>` 路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// 错误：单体根（已弃用，将被移除）
import { ... } from "openclaw/plugin-sdk";
```

完整子路径参考请参见 [SDK 概览](/plugins/sdk-overview)。

在你的插件中，使用本地桶文件（`api.ts`、`runtime-api.ts`）进行内部导入——永远不要通过 SDK 路径导入自己的插件。

对于提供商插件，将提供商特定的帮助函数保留在这些包根桶中，除非接缝是真正通用的。当前捆绑示例：

- Anthropic：Claude 流包装器和 `service_tier` / beta 帮助函数
- OpenAI：提供商构建器、默认模型帮助函数、实时提供商
- OpenRouter：提供商构建器加上引导/配置帮助函数

如果帮助函数只在一个捆绑提供商包内有用，将其保留在该包根接缝上，而不是提升到 `openclaw/plugin-sdk/*`。

一些生成的 `openclaw/plugin-sdk/<bundled-id>` 帮助接缝在具有跟踪的所有者使用时仍存在于捆绑插件维护中。将这些视为保留接口，而非新第三方插件的默认模式。

## 提交前检查清单

<Check>**package.json** 有正确的 `openclaw` 元数据</Check>
<Check>**openclaw.plugin.json** 清单存在且有效</Check>
<Check>入口点使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有导入使用专注的 `plugin-sdk/<subpath>` 路径</Check>
<Check>内部导入使用本地模块，而非 SDK 自导入</Check>
<Check>测试通过（`pnpm test -- <bundled-plugin-root>/my-plugin/`）</Check>
<Check>`pnpm check` 通过（仓库内插件）</Check>

## Beta 版本测试

1. 关注 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 发布标签，并通过 `Watch` > `Releases` 订阅。Beta 标签格式如 `v2026.3.N-beta.1`。也可以关注官方 OpenClaw X 账号 [@openclaw](https://x.com/openclaw) 获取发布公告。
2. 一旦 Beta 标签出现，立即针对它测试你的插件。稳定版本之前的窗口通常只有几个小时。
3. 在 `plugin-forum` Discord 频道中你的插件帖子里发布测试结果，写 `all good` 或说明哪里出了问题。如果你还没有帖子，请创建一个。
4. 如果有问题，开启或更新一个标题为 `Beta blocker: <plugin-name> - <summary>` 的 issue 并添加 `beta-blocker` 标签。将 issue 链接放在你的帖子中。
5. 开启一个标题为 `fix(<plugin-id>): beta blocker - <summary>` 的 PR 到 `main`，并在 PR 和 Discord 帖子中链接 issue。贡献者无法为 PR 添加标签，因此标题是维护者和自动化的 PR 端信号。有 PR 的阻塞问题会被合并；没有 PR 的阻塞问题可能直接发布。维护者在 Beta 测试期间会关注这些帖子。
6. 沉默意味着通过。如果错过了窗口，你的修复可能会在下一个周期中落地。

## 后续步骤

<CardGroup cols={2}>
  <Card title="频道插件" icon="messages-square" href="/plugins/sdk-channel-plugins">
    构建消息频道插件
  </Card>
  <Card title="提供商插件" icon="cpu" href="/plugins/sdk-provider-plugins">
    构建模型提供商插件
  </Card>
  <Card title="SDK 概览" icon="book-open" href="/plugins/sdk-overview">
    导入映射和注册 API 参考
  </Card>
  <Card title="运行时帮助函数" icon="settings" href="/plugins/sdk-runtime">
    通过 api.runtime 使用 TTS、搜索、subagent
  </Card>
  <Card title="测试" icon="test-tubes" href="/plugins/sdk-testing">
    测试工具和模式
  </Card>
  <Card title="插件清单" icon="file-json" href="/plugins/manifest">
    完整清单模式参考
  </Card>
</CardGroup>

## 相关文档

- [插件架构](/plugins/architecture) — 内部架构深度解析
- [SDK 概览](/plugins/sdk-overview) — 插件 SDK 参考
- [清单](/plugins/manifest) — 插件清单格式
- [频道插件](/plugins/sdk-channel-plugins) — 构建频道插件
- [提供商插件](/plugins/sdk-provider-plugins) — 构建提供商插件
