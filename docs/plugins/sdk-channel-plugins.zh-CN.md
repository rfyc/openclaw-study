---
summary: "为 OpenClaw 构建消息频道插件的分步指南"
title: "构建频道插件"
sidebarTitle: "频道插件"
read_when:
  - 你正在构建新的消息频道插件
  - 你希望将 OpenClaw 连接到消息平台
  - 你需要了解 ChannelPlugin 适配器接口
---

本指南介绍如何构建将 OpenClaw 连接到消息平台的频道插件。完成后，你将拥有一个支持 DM 安全、配对、回复线程和出站消息的完整工作频道。

<Info>
  如果你之前从未构建过 OpenClaw 插件，请先阅读
  [入门指南](/plugins/building-plugins)，了解基本的包结构和清单设置。
</Info>

## 频道插件的工作原理

频道插件不需要自己的发送/编辑/回应工具。OpenClaw 在核心中保留了一个共享的 `message` 工具。你的插件拥有：

- **配置** — 账户解析和设置向导
- **安全** — DM 策略和允许列表
- **配对** — DM 审批流程
- **会话语法** — 提供商特定对话 id 如何映射到基础聊天、线程 id 和父级回退
- **出站** — 向平台发送文本、媒体和投票
- **线程** — 如何进行回复线程化
- **心跳打字** — 心跳传递目标的可选打字/忙碌信号

核心拥有共享消息工具、提示词连接、外层会话键形状、通用 `:thread:` 记录和调度。

如果你的频道支持入站回复之外的打字指示器，请在频道插件上公开 `heartbeat.sendTyping(...)`。核心在心跳模型运行开始之前用解析的心跳传递目标调用它，并使用共享的打字保活/清理生命周期。当平台需要显式停止信号时，添加 `heartbeat.clearTyping(...)`。

如果你的频道添加了携带媒体来源的消息工具参数，请通过 `describeMessageTool(...).mediaSourceParams` 公开这些参数名称。核心使用该显式列表进行沙盒路径规范化和出站媒体访问策略，因此插件不需要针对提供商特定的头像、附件或封面图片参数进行共享核心特殊处理。
优先返回以操作为键的映射，如 `{ "set-profile": ["avatarUrl", "avatarPath"] }`，以免不相关的操作继承另一个操作的媒体参数。对于故意跨所有公开操作共享的参数，平面数组仍然有效。

如果你的平台在对话 id 中存储了额外的作用域，请在插件中使用 `messaging.resolveSessionConversation(...)` 保留该解析。这是将 `rawId` 映射到基础对话 id、可选线程 id、显式 `baseConversationId` 和任何 `parentConversationCandidates` 的规范钩子。
当你返回 `parentConversationCandidates` 时，请按从最窄父级到最宽/基础对话的顺序排列。

当插件代码需要规范化路由类字段、将子线程与其父路由比较，或从 `{ channel, to, accountId, threadId }` 构建稳定的去重键时，请使用 `openclaw/plugin-sdk/channel-route`。该助手与核心以相同方式规范化数字线程 id，因此插件应优先使用它，而不是临时的 `String(threadId)` 比较。
具有提供商特定目标语法的插件可以将其解析器注入 `resolveChannelRouteTargetWithParser(...)` 并仍然获得核心使用的相同路由目标形状和线程回退语义。

在频道注册表启动之前需要相同解析的捆绑插件也可以公开带有匹配 `resolveSessionConversation(...)` 导出的顶级 `session-key-api.ts` 文件。核心仅在运行时插件注册表尚不可用时使用该引导安全接口。

当插件仅需要在通用/原始 id 之上的父回退时，`messaging.resolveParentConversationCandidates(...)` 仍然作为旧版兼容性回退可用。如果两个钩子都存在，核心首先使用 `resolveSessionConversation(...).parentConversationCandidates`，仅当规范钩子省略它们时才回退到 `resolveParentConversationCandidates(...)`。

## 审批和频道能力

大多数频道插件不需要审批特定的代码。

- 核心拥有同聊天 `/approve`、共享审批按钮载荷和通用回退传递。
- 当频道需要审批特定行为时，优先在频道插件上使用一个 `approvalCapability` 对象。
- `ChannelPlugin.approvals` 已被移除。将审批传递/原生/渲染/认证事实放在 `approvalCapability` 上。
- `plugin.auth` 仅用于登录/注销；核心不再从该对象读取审批认证钩子。
- `approvalCapability.authorizeActorAction` 和 `approvalCapability.getActionAvailabilityState` 是规范的审批认证接口。
- 使用 `approvalCapability.getActionAvailabilityState` 进行同聊天审批认证可用性。
- 如果你的频道公开了原生 exec 审批，当发起面/原生客户端状态与同聊天审批认证不同时，使用 `approvalCapability.getExecInitiatingSurfaceState`。核心使用该 exec 专用钩子来区分 `enabled` 与 `disabled`，决定发起频道是否支持原生 exec 审批，并将频道包含在原生客户端回退指南中。`createApproverRestrictedNativeApprovalCapability(...)` 为常见情况填充此内容。
- 使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload` 处理频道特定的载荷生命周期行为，如隐藏重复的本地审批提示或在传递之前发送打字指示器。
- 仅将 `approvalCapability.delivery` 用于原生审批路由或回退抑制。
- 将 `approvalCapability.nativeRuntime` 用于频道拥有的原生审批事实。在热频道入口点使用 `createLazyChannelApprovalNativeRuntimeAdapter(...)` 使其懒加载，它可以按需导入你的运行时模块，同时仍让核心组装审批生命周期。
- 仅当频道确实需要自定义审批载荷而不是共享渲染器时，才使用 `approvalCapability.render`。
- 当频道希望禁用路径回复解释启用原生 exec 审批所需的确切配置旋钮时，使用 `approvalCapability.describeExecApprovalSetup`。该钩子接收 `{ channel, channelLabel, accountId }`；命名账户频道应呈现账户范围的路径，如 `channels.<channel>.accounts.<id>.execApprovals.*` 而不是顶级默认值。
- 如果频道可以从现有配置推断稳定的所有者类 DM 身份，请使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createResolvedApproverActionAuthAdapter` 来限制同聊天 `/approve`，而无需添加审批特定的核心逻辑。
- 如果频道需要原生审批传递，请让频道代码专注于目标规范化加上传输/呈现事实。使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createChannelExecApprovalProfile`、`createChannelNativeOriginTargetResolver`、`createChannelApproverDmTargetResolver` 和 `createApproverRestrictedNativeApprovalCapability`。将频道特定的事实放在 `approvalCapability.nativeRuntime` 后面，最好通过 `createChannelApprovalNativeRuntimeAdapter(...)` 或 `createLazyChannelApprovalNativeRuntimeAdapter(...)`，以便核心可以组装处理器并拥有请求过滤、路由、去重、过期、网关订阅和路由到其他地方的通知。`nativeRuntime` 分为几个较小的接口：
- `createChannelNativeOriginTargetResolver` 默认对 `{ to, accountId, threadId }` 目标使用共享频道路由匹配器。仅当频道具有提供商特定的等价规则（如 Slack 时间戳前缀匹配）时才传递 `targetsMatch`。
- 将 `normalizeTargetForMatch` 传递给 `createChannelNativeOriginTargetResolver`，当频道需要在默认路由匹配器或自定义 `targetsMatch` 回调运行之前规范化提供商 id，同时保留传递的原始目标时。仅当解析的传递目标本身应该规范化时才使用 `normalizeTarget`。
- `availability` — 账户是否已配置以及是否应处理请求
- `presentation` — 将共享审批视图模型映射到挂起/已解析/已过期的原生载荷或最终操作
- `transport` — 准备目标加上发送/更新/删除原生审批消息
- `interactions` — 原生按钮或反应的可选绑定/解绑/清除操作钩子
- `observe` — 可选的传递诊断钩子
- 如果频道需要运行时拥有的对象（如客户端、令牌、Bolt 应用或 webhook 接收器），请通过 `openclaw/plugin-sdk/channel-runtime-context` 注册它们。通用运行时上下文注册表让核心可以在不添加审批特定包装胶水的情况下，从频道启动状态引导能力驱动的处理器。
- 仅当能力驱动接口还不够表达时，才使用较低级别的 `createChannelApprovalHandler` 或 `createChannelNativeApprovalRuntime`。
- 原生审批频道必须通过这些助手路由 `accountId` 和 `approvalKind`。`accountId` 使多账户审批策略限定在正确的机器人账户范围内，`approvalKind` 使 exec 与插件审批行为对频道可用，而无需核心中的硬编码分支。
- 核心现在也拥有审批重路由通知。频道插件不应从 `createChannelNativeApprovalRuntime` 发送自己的"审批已转到 DM / 另一个频道"后续消息；相反，通过共享审批能力助手公开准确的来源 + 审批者 DM 路由，让核心在将任何通知发布回发起聊天之前聚合实际传递。
- 端到端保留传递的审批 id 类型。原生客户端不应从频道本地状态猜测或重写 exec 与插件审批路由。
- 不同的审批类型可以故意公开不同的原生接口。当前捆绑示例：
  - Slack 为 exec 和插件 id 保持原生审批路由可用。
  - Matrix 为 exec 和插件审批保持相同的原生 DM/频道路由和反应 UX，同时仍允许按审批类型进行不同的认证。
- `createApproverRestrictedNativeApprovalAdapter` 仍然作为兼容性包装器存在，但新代码应优先使用能力构建器并在插件上公开 `approvalCapability`。

对于热频道入口点，当你只需要该族的一部分时，优先使用更窄的运行时子路径：

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

同样，当你不需要更广泛的伞形接口时，优先使用 `openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/setup-adapter-runtime`、
`openclaw/plugin-sdk/reply-runtime`、
`openclaw/plugin-sdk/reply-dispatch-runtime`、
`openclaw/plugin-sdk/reply-reference` 和
`openclaw/plugin-sdk/reply-chunking`。

对于 setup 特别说明：

- `openclaw/plugin-sdk/setup-runtime` 涵盖运行时安全的设置助手：
  导入安全的设置补丁适配器（`createPatchedAccountSetupAdapter`、
  `createEnvPatchedAccountSetupAdapter`、
  `createSetupInputPresenceValidator`）、查找笔记输出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 和委托
  设置代理构建器
- `openclaw/plugin-sdk/setup-adapter-runtime` 是用于
  `createEnvPatchedAccountSetupAdapter` 的窄环境感知适配器接口
- `openclaw/plugin-sdk/channel-setup` 涵盖可选安装设置
  构建器加上一些设置安全原语：
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`

如果你的频道支持环境驱动的设置或认证，并且通用启动/配置流程在运行时加载之前应该了解这些环境名称，请在插件清单中用 `channelEnvVars` 声明它们。仅将频道运行时 `envVars` 或本地常量用于面向运营商的副本。

如果你的频道可以在插件运行时启动之前出现在 `status`、`channels list`、`channels status` 或 SecretRef 扫描中，请在 `package.json` 中添加 `openclaw.setupEntry`。该入口点应该在只读命令路径中导入是安全的，并应返回这些摘要所需的频道元数据、设置安全配置适配器、状态适配器和频道密钥目标元数据。不要从设置入口启动客户端、监听器或传输运行时。

同样保持主频道入口导入路径的窄化。发现可以评估入口和频道插件模块以注册能力而不激活频道。像 `channel-plugin-api.ts` 这样的文件应该导出频道插件对象，而不导入设置向导、传输客户端、套接字监听器、子进程启动器或服务启动模块。将这些运行时部分放在从 `registerFull(...)` 加载的模块、运行时设置器或懒加载能力适配器中。

`createOptionalChannelSetupWizard`、`DEFAULT_ACCOUNT_ID`、
`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled` 和
`splitSetupEntries`

- 仅当你还需要更重的共享设置/配置助手时才使用更广泛的 `openclaw/plugin-sdk/setup` 接口，如
  `moveSingleAccountChannelSectionToDefaultAccount(...)`

如果你的频道只想在设置界面中宣传"先安装此插件"，请优先使用 `createOptionalChannelSetupSurface(...)`。生成的适配器/向导对配置写入和最终化关闭失败，并在验证、最终化和文档链接副本中重用相同的安装必需消息。

对于其他热频道路径，优先使用窄助手而不是更广泛的旧版接口：

- `openclaw/plugin-sdk/account-core`、
  `openclaw/plugin-sdk/account-id`、
  `openclaw/plugin-sdk/account-resolution` 和
  `openclaw/plugin-sdk/account-helpers` 用于多账户配置和
  默认账户回退
- `openclaw/plugin-sdk/inbound-envelope` 和
  `openclaw/plugin-sdk/inbound-reply-dispatch` 用于入站路由/信封和
  记录与调度连接
- `openclaw/plugin-sdk/messaging-targets` 用于目标解析/匹配
- `openclaw/plugin-sdk/outbound-media` 和
  `openclaw/plugin-sdk/outbound-runtime` 用于媒体加载加上出站
  身份/发送委托和载荷规划
- 当出站路由应该保留显式的 `replyToId`/`threadId` 或在基础会话键仍然匹配后恢复当前的 `:thread:` 会话时，从
  `openclaw/plugin-sdk/channel-core` 使用 `buildThreadAwareOutboundSessionRoute(...)`。提供商插件可以在其平台具有原生线程传递语义时覆盖优先级、后缀行为和线程 id 规范化。
- `openclaw/plugin-sdk/thread-bindings-runtime` 用于线程绑定生命周期
  和适配器注册
- 仅当仍然需要旧版 agent/媒体载荷字段布局时才使用 `openclaw/plugin-sdk/agent-media-payload`
- `openclaw/plugin-sdk/telegram-command-config` 用于 Telegram 自定义命令
  规范化、重复/冲突验证和回退稳定的命令配置合约

仅认证的频道通常可以在默认路径停止：核心处理审批，插件只公开出站/认证能力。原生审批频道（如 Matrix、Slack、Telegram 和自定义聊天传输）应使用共享原生助手，而不是滚动自己的审批生命周期。

## 入站提及策略

将入站提及处理分成两层：

- 插件拥有的证据收集
- 共享策略评估

使用 `openclaw/plugin-sdk/channel-mention-gating` 进行提及策略决策。
仅当你需要更广泛的入站帮助桶时才使用 `openclaw/plugin-sdk/channel-inbound`。

适合插件本地逻辑的：

- 机器人回复检测
- 引用机器人检测
- 线程参与检查
- 服务/系统消息排除
- 证明机器人参与所需的平台原生缓存

适合共享助手的：

- `requireMention`
- 显式提及结果
- 隐式提及允许列表
- 命令绕过
- 最终跳过决定

首选流程：

1. 计算本地提及事实。
2. 将这些事实传递到 `resolveInboundMentionDecision({ facts, policy })`。
3. 在你的入站门中使用 `decision.effectiveWasMentioned`、`decision.shouldBypassMention` 和 `decision.shouldSkip`。

```typescript
import {
  implicitMentionKindWhen,
  matchesMentionWithExplicit,
  resolveInboundMentionDecision,
} from "openclaw/plugin-sdk/channel-inbound";

const mentionMatch = matchesMentionWithExplicit(text, {
  mentionRegexes,
  mentionPatterns,
});

const facts = {
  canDetectMention: true,
  wasMentioned: mentionMatch.matched,
  hasAnyMention: mentionMatch.hasExplicitMention,
  implicitMentionKinds: [
    ...implicitMentionKindWhen("reply_to_bot", isReplyToBot),
    ...implicitMentionKindWhen("quoted_bot", isQuoteOfBot),
  ],
};

const decision = resolveInboundMentionDecision({
  facts,
  policy: {
    isGroup,
    requireMention,
    allowedImplicitMentionKinds: requireExplicitMention ? [] : ["reply_to_bot", "quoted_bot"],
    allowTextCommands,
    hasControlCommand,
    commandAuthorized,
  },
});

if (decision.shouldSkip) return;
```

`api.runtime.channel.mentions` 为已经依赖运行时注入的捆绑频道插件公开相同的共享提及助手：

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

如果你只需要 `implicitMentionKindWhen` 和
`resolveInboundMentionDecision`，请从
`openclaw/plugin-sdk/channel-mention-gating` 导入，以避免加载不相关的入站
运行时助手。

较旧的 `resolveMentionGating*` 助手在
`openclaw/plugin-sdk/channel-inbound` 上仍然作为兼容性导出。新代码
应使用 `resolveInboundMentionDecision({ facts, policy })`。

## 演练

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="包和清单">
    创建标准插件文件。`package.json` 中的 `channel` 字段是
    使这成为频道插件的关键。有关完整的包元数据接口，
    请参见 [插件设置和配置](/plugins/sdk-setup#openclaw-channel)：

    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-chat",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "setupEntry": "./setup-entry.ts",
        "channel": {
          "id": "acme-chat",
          "label": "Acme Chat",
          "blurb": "Connect OpenClaw to Acme Chat."
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-chat",
      "kind": "channel",
      "channels": ["acme-chat"],
      "name": "Acme Chat",
      "description": "Acme Chat channel plugin",
      "configSchema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {}
      },
      "channelConfigs": {
        "acme-chat": {
          "schema": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "token": { "type": "string" },
              "allowFrom": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          },
          "uiHints": {
            "token": {
              "label": "Bot token",
              "sensitive": true
            }
          }
        }
      }
    }
    ```
    </CodeGroup>

    `configSchema` 验证 `plugins.entries.acme-chat.config`。将其用于
    插件拥有的不属于频道账户配置的设置。`channelConfigs`
    验证 `channels.acme-chat`，是配置在插件运行时加载之前由
    模式、设置和 UI 界面使用的冷路径来源。

  </Step>

  <Step title="构建频道插件对象">
    `ChannelPlugin` 接口有许多可选的适配器接口。从
    最小值开始 — `id` 和 `setup` — 并根据需要添加适配器。

    创建 `src/channel.ts`：

    ```typescript src/channel.ts
    import {
      createChatChannelPlugin,
      createChannelPluginBase,
    } from "openclaw/plugin-sdk/channel-core";
    import type { OpenClawConfig } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatApi } from "./client.js"; // your platform API client

    type ResolvedAccount = {
      accountId: string | null;
      token: string;
      allowFrom: string[];
      dmPolicy: string | undefined;
    };

    function resolveAccount(
      cfg: OpenClawConfig,
      accountId?: string | null,
    ): ResolvedAccount {
      const section = (cfg.channels as Record<string, any>)?.["acme-chat"];
      const token = section?.token;
      if (!token) throw new Error("acme-chat: token is required");
      return {
        accountId: accountId ?? null,
        token,
        allowFrom: section?.allowFrom ?? [],
        dmPolicy: section?.dmSecurity,
      };
    }

    export const acmeChatPlugin = createChatChannelPlugin<ResolvedAccount>({
      base: createChannelPluginBase({
        id: "acme-chat",
        setup: {
          resolveAccount,
          inspectAccount(cfg, accountId) {
            const section =
              (cfg.channels as Record<string, any>)?.["acme-chat"];
            return {
              enabled: Boolean(section?.token),
              configured: Boolean(section?.token),
              tokenStatus: section?.token ? "available" : "missing",
            };
          },
        },
      }),

      // DM security: who can message the bot
      security: {
        dm: {
          channelKey: "acme-chat",
          resolvePolicy: (account) => account.dmPolicy,
          resolveAllowFrom: (account) => account.allowFrom,
          defaultPolicy: "allowlist",
        },
      },

      // Pairing: approval flow for new DM contacts
      pairing: {
        text: {
          idLabel: "Acme Chat username",
          message: "Send this code to verify your identity:",
          notify: async ({ target, code }) => {
            await acmeChatApi.sendDm(target, `Pairing code: ${code}`);
          },
        },
      },

      // Threading: how replies are delivered
      threading: { topLevelReplyToMode: "reply" },

      // Outbound: send messages to the platform
      outbound: {
        attachedResults: {
          sendText: async (params) => {
            const result = await acmeChatApi.sendMessage(
              params.to,
              params.text,
            );
            return { messageId: result.id };
          },
        },
        base: {
          sendMedia: async (params) => {
            await acmeChatApi.sendFile(params.to, params.filePath);
          },
        },
      },
    });
    ```

    对于同时接受规范顶级 DM 键和旧版嵌套键的频道，使用 `plugin-sdk/channel-config-helpers` 中的助手：`resolveChannelDmAccess`、`resolveChannelDmPolicy`、`resolveChannelDmAllowFrom` 和 `normalizeChannelDmPolicy` 保持账户本地值优先于继承的根值。通过 `normalizeLegacyDmAliases` 将相同的解析器与医生修复配对，以便运行时和迁移读取相同的合约。

    <Accordion title="createChatChannelPlugin 为你做什么">
      无需手动实现低级适配器接口，你传递
      声明式选项，构建器会为你组合它们：

      | 选项 | 连接内容 |
      | --- | --- |
      | `security.dm` | 来自配置字段的作用域 DM 安全解析器 |
      | `pairing.text` | 带代码交换的基于文本的 DM 配对流 |
      | `threading` | 回复模式解析器（固定、账户范围或自定义） |
      | `outbound.attachedResults` | 返回结果元数据（消息 ID）的发送函数 |

      如果需要完全控制，你也可以传递原始适配器对象
      而不是声明式选项。

      原始出站适配器可以定义 `chunker(text, limit, ctx)` 函数。
      可选的 `ctx.formatting` 携带传递时的格式化决策，
      如 `maxLinesPerMessage`；在发送之前应用它，以便回复线程化
      和块边界由共享出站传递解析一次。
      当解析了原生回复目标时，发送上下文还包括 `replyToIdSource`（`implicit` 或 `explicit`），
      因此载荷助手可以保留显式回复标签，而不消耗隐式的一次性回复槽。
    </Accordion>

  </Step>

  <Step title="连接入口点">
    创建 `index.ts`：

    ```typescript index.ts
    import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineChannelPluginEntry({
      id: "acme-chat",
      name: "Acme Chat",
      description: "Acme Chat channel plugin",
      plugin: acmeChatPlugin,
      registerCliMetadata(api) {
        api.registerCli(
          ({ program }) => {
            program
              .command("acme-chat")
              .description("Acme Chat management");
          },
          {
            descriptors: [
              {
                name: "acme-chat",
                description: "Acme Chat management",
                hasSubcommands: false,
              },
            ],
          },
        );
      },
      registerFull(api) {
        api.registerGatewayMethod(/* ... */);
      },
    });
    ```

    将频道拥有的 CLI 描述符放在 `registerCliMetadata(...)` 中，以便 OpenClaw
    可以在不激活完整频道运行时的情况下在根帮助中显示它们，
    而正常的完整加载仍然会为真实命令注册选取相同的描述符。将 `registerFull(...)` 保留用于仅运行时的工作。
    如果 `registerFull(...)` 注册了网关 RPC 方法，请使用
    插件特定的前缀。核心管理员命名空间（`config.*`、
    `exec.approvals.*`、`wizard.*`、`update.*`）保持保留，并始终
    解析到 `operator.admin`。
    `defineChannelPluginEntry` 自动处理注册模式分割。请参见
    [入口点](/plugins/sdk-entrypoints#definechannelpluginentry) 了解所有
    选项。

  </Step>

  <Step title="添加设置入口">
    创建 `setup-entry.ts` 用于加入时的轻量级加载：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    当频道被禁用或未配置时，OpenClaw 加载此而不是完整入口。
    它避免在设置流程中引入重型运行时代码。
    请参见 [设置和配置](/plugins/sdk-setup#setup-entry) 了解详情。

    将设置安全导出拆分到附属模块中的捆绑工作区频道
    可以在还需要显式设置时运行时设置器时使用
    `openclaw/plugin-sdk/channel-entry-contract` 中的 `defineBundledChannelSetupEntry(...)`。

  </Step>

  <Step title="处理入站消息">
    你的插件需要从平台接收消息并将其转发到
    OpenClaw。典型模式是一个验证请求并通过
    你的频道入站处理器调度的 webhook：

    ```typescript
    registerFull(api) {
      api.registerHttpRoute({
        path: "/acme-chat/webhook",
        auth: "plugin", // plugin-managed auth (verify signatures yourself)
        handler: async (req, res) => {
          const event = parseWebhookPayload(req);

          // Your inbound handler dispatches the message to OpenClaw.
          // The exact wiring depends on your platform SDK —
          // see a real example in the bundled Microsoft Teams or Google Chat plugin package.
          await handleAcmeChatInbound(api, event);

          res.statusCode = 200;
          res.end("ok");
          return true;
        },
      });
    }
    ```

    <Note>
      入站消息处理是频道特定的。每个频道插件拥有
      自己的入站管道。查看捆绑的频道插件
      （例如 Microsoft Teams 或 Google Chat 插件包）以获取真实模式。
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="测试">
在 `src/channel.test.ts` 中编写同级测试：

    ```typescript src/channel.test.ts
    import { describe, it, expect } from "vitest";
    import { acmeChatPlugin } from "./channel.js";

    describe("acme-chat plugin", () => {
      it("resolves account from config", () => {
        const cfg = {
          channels: {
            "acme-chat": { token: "test-token", allowFrom: ["user1"] },
          },
        } as any;
        const account = acmeChatPlugin.setup!.resolveAccount(cfg, undefined);
        expect(account.token).toBe("test-token");
      });

      it("inspects account without materializing secrets", () => {
        const cfg = {
          channels: { "acme-chat": { token: "test-token" } },
        } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(true);
        expect(result.tokenStatus).toBe("available");
      });

      it("reports missing config", () => {
        const cfg = { channels: {} } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(false);
      });
    });
    ```

    ```bash
    pnpm test -- <bundled-plugin-root>/acme-chat/
    ```

    有关共享测试助手，请参见 [测试](/plugins/sdk-testing)。

</Step>
</Steps>

## 文件结构

```
<bundled-plugin-root>/acme-chat/
├── package.json              # openclaw.channel metadata
├── openclaw.plugin.json      # Manifest with config schema
├── index.ts                  # defineChannelPluginEntry
├── setup-entry.ts            # defineSetupPluginEntry
├── api.ts                    # Public exports (optional)
├── runtime-api.ts            # Internal runtime exports (optional)
└── src/
    ├── channel.ts            # ChannelPlugin via createChatChannelPlugin
    ├── channel.test.ts       # Tests
    ├── client.ts             # Platform API client
    └── runtime.ts            # Runtime store (if needed)
```

## 高级主题

<CardGroup cols={2}>
  <Card title="线程选项" icon="git-branch" href="/plugins/sdk-entrypoints#registration-mode">
    固定、账户范围或自定义回复模式
  </Card>
  <Card title="消息工具集成" icon="puzzle" href="/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool 和动作发现
  </Card>
  <Card title="目标解析" icon="crosshair" href="/plugins/architecture-internals#channel-target-resolution">
    inferTargetChatType、looksLikeId、resolveTarget
  </Card>
  <Card title="运行时助手" icon="settings" href="/plugins/sdk-runtime">
    通过 api.runtime 使用 TTS、STT、媒体、子 agent
  </Card>
  <Card title="频道轮次内核" icon="bolt" href="/plugins/sdk-channel-turn">
    共享入站轮次生命周期：ingest、resolve、record、dispatch、finalize
  </Card>
</CardGroup>

<Note>
一些捆绑助手接口仍然存在用于捆绑插件维护和
兼容性。它们不是新频道插件的推荐模式；
优先使用公共 SDK 接口中的通用频道/设置/回复/运行时子路径，
除非你正在直接维护该捆绑插件族。
</Note>

## 后续步骤

- [提供商插件](/plugins/sdk-provider-plugins) — 如果你的插件还提供模型
- [SDK 概览](/plugins/sdk-overview) — 完整的子路径导入参考
- [SDK 测试](/plugins/sdk-testing) — 测试工具和合约测试
- [插件清单](/plugins/manifest) — 完整清单模式

## 相关文档

- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
- [Agent 执行器插件](/plugins/sdk-agent-harness)
