---
summary: 将语义消息呈现与频道原生 UI 渲染器解耦。
title: 频道呈现重构计划
read_when:
  - 重构频道消息 UI、交互式有效载荷或原生频道渲染器时
  - 更改消息工具功能、交付提示或跨上下文标记时
  - 调试 Discord Carbon 导入扇出或频道插件运行时延迟加载时
---

## 状态

已为共享代理、CLI、插件功能和出站交付界面实现：

- `ReplyPayload.presentation` 携带语义消息 UI。
- `ReplyPayload.delivery.pin` 携带已发送消息的固定请求。
- 共享消息操作公开 `presentation`、`delivery` 和 `pin`，而不是提供商原生的 `components`、`blocks`、`buttons` 或 `card`。
- Core 通过插件声明的出站功能渲染或自动降级呈现。
- Discord、Slack、Telegram、Mattermost、MS Teams 和 Feishu 渲染器使用通用合约。
- Discord 频道控制平面代码不再导入 Carbon 支持的 UI 容器。

规范文档现在位于[消息呈现](/plugins/message-presentation)中。
将此计划保留为历史实现上下文；对于合约、渲染器或回退行为更改，请更新规范指南。

## 问题

频道 UI 目前跨多个不兼容的界面拆分：

- Core 通过 `buildCrossContextComponents` 拥有一个 Discord 形状的跨上下文渲染器 hook。
- Discord `channel.ts` 可以通过 `DiscordUiContainer` 导入原生 Carbon UI，这将运行时 UI 依赖项拉入频道插件控制平面。
- 代理和 CLI 公开原生有效载荷逃生出口，例如 Discord `components`、Slack `blocks`、Telegram 或 Mattermost `buttons`，以及 Teams 或 Feishu `card`。
- `ReplyPayload.channelData` 携带传输提示和原生 UI 信封。
- 通用 `interactive` 模型存在，但它比 Discord、Slack、Teams、Feishu、LINE、Telegram 和 Mattermost 已经使用的更丰富的布局更窄。

这使 Core 意识到原生 UI 形状，削弱了插件运行时延迟加载，并给代理提供了太多提供商特定的方式来表达相同的消息意图。

## 目标

- Core 根据声明的功能决定消息的最佳语义呈现。
- 扩展声明功能并将语义呈现渲染为原生传输有效载荷。
- Web Control UI 与聊天原生 UI 保持分离。
- 原生频道有效载荷不通过共享代理或 CLI 消息界面公开。
- 不支持的呈现功能自动降级为最佳文本表示。
- 固定已发送消息等交付行为是通用的交付元数据，而非呈现。

## 非目标

- `buildCrossContextComponents` 没有向后兼容的填充层。
- `components`、`blocks`、`buttons` 或 `card` 没有公共原生逃生出口。
- 没有频道原生 UI 库的 Core 导入。
- 捆绑频道没有提供商特定的 SDK 接缝。

## 目标模型

为 `ReplyPayload` 添加 Core 自有的 `presentation` 字段。

```ts
type MessagePresentationTone = "neutral" | "info" | "success" | "warning" | "danger";

type MessagePresentation = {
  tone?: MessagePresentationTone;
  title?: string;
  blocks: MessagePresentationBlock[];
};

type MessagePresentationBlock =
  | { type: "text"; text: string }
  | { type: "context"; text: string }
  | { type: "divider" }
  | { type: "buttons"; buttons: MessagePresentationButton[] }
  | { type: "select"; placeholder?: string; options: MessagePresentationOption[] };

type MessagePresentationButton = {
  label: string;
  value?: string;
  url?: string;
  style?: "primary" | "secondary" | "success" | "danger";
};

type MessagePresentationOption = {
  label: string;
  value: string;
};
```

`interactive` 在迁移过程中成为 `presentation` 的子集：

- `interactive` 文本块映射到 `presentation.blocks[].type = "text"`。
- `interactive` 按钮块映射到 `presentation.blocks[].type = "buttons"`。
- `interactive` 选择块映射到 `presentation.blocks[].type = "select"`。

外部代理和 CLI 模式现在使用 `presentation`；`interactive` 保留为现有回复生产者的内部旧版解析器/渲染辅助工具。

## 交付元数据

为非 UI 的发送行为添加 Core 自有的 `delivery` 字段。

```ts
type ReplyPayloadDelivery = {
  pin?:
    | boolean
    | {
        enabled: boolean;
        notify?: boolean;
        required?: boolean;
      };
};
```

语义：

- `delivery.pin = true` 表示固定第一条成功交付的消息。
- `notify` 默认为 `false`。
- `required` 默认为 `false`；不支持的频道或固定失败会通过继续交付自动降级。
- 现有消息的手动 `pin`、`unpin` 和 `list-pins` 消息操作保留。

当前 Telegram ACP 话题绑定应该从 `channelData.telegram.pin = true` 迁移到 `delivery.pin = true`。

## 运行时功能合约

将呈现和交付渲染 hook 添加到运行时出站适配器，而不是控制平面频道插件。

```ts
type ChannelPresentationCapabilities = {
  supported: boolean;
  buttons?: boolean;
  selects?: boolean;
  context?: boolean;
  divider?: boolean;
  tones?: MessagePresentationTone[];
};

type ChannelDeliveryCapabilities = {
  pinSentMessage?: boolean;
};

type ChannelOutboundAdapter = {
  presentationCapabilities?: ChannelPresentationCapabilities;

  renderPresentation?: (params: {
    payload: ReplyPayload;
    presentation: MessagePresentation;
    ctx: ChannelOutboundSendContext;
  }) => ReplyPayload | null;

  deliveryCapabilities?: ChannelDeliveryCapabilities;

  pinDeliveredMessage?: (params: {
    cfg: OpenClawConfig;
    accountId?: string | null;
    to: string;
    threadId?: string | number | null;
    messageId: string;
    notify: boolean;
  }) => Promise<void>;
};
```

Core 行为：

- 解析目标频道和运行时适配器。
- 询问呈现功能。
- 在渲染之前降级不支持的块。
- 调用 `renderPresentation`。
- 如果不存在渲染器，将呈现转换为文本回退。
- 成功发送后，当请求 `delivery.pin` 且受支持时，调用 `pinDeliveredMessage`。

## 频道映射

Discord：

- 在仅运行时模块中将 `presentation` 渲染为 components v2 和 Carbon 容器。
- 在轻量模块中保留强调色辅助工具。
- 从频道插件控制平面代码中删除 `DiscordUiContainer` 导入。

Slack：

- 将 `presentation` 渲染为 Block Kit。
- 删除代理和 CLI `blocks` 输入。

Telegram：

- 将文本、上下文和分割线渲染为文本。
- 在配置并允许目标界面时，将操作和选择渲染为内联键盘。
- 禁用内联按钮时使用文本回退。
- 将 ACP 话题固定迁移到 `delivery.pin`。

Mattermost：

- 在配置时将操作渲染为交互式按钮。
- 将其他块渲染为文本回退。

MS Teams：

- 将 `presentation` 渲染为自适应卡片。
- 保留手动 pin/unpin/list-pins 操作。
- 如果 Graph 支持对目标对话可靠，可以选择实现 `pinDeliveredMessage`。

Feishu：

- 将 `presentation` 渲染为交互式卡片。
- 保留手动 pin/unpin/list-pins 操作。
- 如果 API 行为对已发送消息固定可靠，可以选择实现 `pinDeliveredMessage`。

LINE：

- 在可能的地方将 `presentation` 渲染为 Flex 或模板消息。
- 对不支持的块回退到文本。
- 从 `channelData` 中删除 LINE UI 有效载荷。

纯文本或有限频道：

- 使用保守格式将呈现转换为文本。

## 重构步骤

1. 重新应用将 `ui-colors.ts` 从 Carbon 支持的 UI 中拆分并从 `extensions/discord/src/channel.ts` 中删除 `DiscordUiContainer` 的 Discord 发布修复。
2. 将 `presentation` 和 `delivery` 添加到 `ReplyPayload`、出站有效载荷规范化、交付摘要和 hook 有效载荷。
3. 在窄 SDK/运行时子路径中添加 `MessagePresentation` 模式和解析器辅助工具。
4. 用语义呈现功能替换消息功能 `buttons`、`cards`、`components` 和 `blocks`。
5. 为呈现渲染和交付固定添加运行时出站适配器 hook。
6. 用 `buildCrossContextPresentation` 替换跨上下文组件构建。
7. 删除 `src/infra/outbound/channel-adapters.ts` 并从频道插件类型中删除 `buildCrossContextComponents`。
8. 将 `maybeApplyCrossContextMarker` 改为附加 `presentation` 而不是原生参数。
9. 更新插件调度发送路径，仅使用语义呈现和交付元数据。
10. 删除代理和 CLI 原生有效载荷参数：`components`、`blocks`、`buttons` 和 `card`。
11. 删除创建原生消息工具模式的 SDK 辅助工具，用呈现模式辅助工具替换它们。
12. 从 `channelData` 中删除 UI/原生信封；仅保留传输元数据，直到审查每个剩余字段。
13. 迁移 Discord、Slack、Telegram、Mattermost、MS Teams、Feishu 和 LINE 渲染器。
14. 更新消息 CLI、频道页面、插件 SDK 和功能指南的文档。
15. 运行 Discord 和受影响频道入口点的导入扇出分析。

步骤 1-11 和 13-14 已在此次重构中为共享代理、CLI、插件功能和出站适配器合约实现。步骤 12 仍然是提供商私有 `channelData` 传输信封的更深层内部清理阶段。步骤 15 仍然是后续验证工作，如果我们想要超出类型/测试门控的量化导入扇出数字。

## 测试

添加或更新：

- 呈现规范化测试。
- 不支持块的呈现自动降级测试。
- 插件调度和 Core 交付路径的跨上下文标记测试。
- Discord、Slack、Telegram、Mattermost、MS Teams、Feishu、LINE 和文本回退的频道渲染矩阵测试。
- 证明原生字段已消失的消息工具模式测试。
- 证明原生标志已消失的 CLI 测试。
- 覆盖 Carbon 的 Discord 入口点导入延迟加载回归。
- 覆盖 Telegram 和通用回退的交付固定测试。

## 开放问题

- `delivery.pin` 是在第一个阶段仅针对 Telegram 实现，还是也针对 Discord、Slack、MS Teams 和 Feishu？
- `delivery` 最终是否应该吸收现有字段（如 `replyToId`、`replyToCurrent`、`silent` 和 `audioAsVoice`），还是专注于发送后行为？
- 呈现是否应该直接支持图像或文件引用，还是媒体目前应该与 UI 布局分开保持？

## 相关

- [频道概览](/channels)
- [消息呈现](/plugins/message-presentation)
