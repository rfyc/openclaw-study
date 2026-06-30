---
summary: "用于频道插件的语义消息卡片、按钮、选择菜单、降级文本和交付提示"
title: "消息呈现"
read_when:
  - 添加或修改消息卡片、按钮或选择菜单渲染
  - 构建支持富文本出站消息的频道插件
  - 更改消息工具呈现或交付能力
  - 调试特定提供商的卡片/块/组件渲染回归
---

消息呈现是 OpenClaw 的共享合约，用于富文本出站聊天界面。它让 agent、CLI 命令、审批流和插件只需描述一次消息意图，而每个频道插件会渲染出其能支持的最佳原生形式。

将呈现用于可移植的消息界面：

- 文本段落
- 小型上下文/页脚文本
- 分隔线
- 按钮
- 选择菜单
- 卡片标题和语调

不要向共享消息工具添加新的提供商原生字段，例如 Discord `components`、Slack `blocks`、Telegram `buttons`、Teams `card` 或 Feishu `card`。这些是频道插件拥有的渲染输出。

## 合约

插件作者从以下路径导入公共合约：

```ts
import type {
  MessagePresentation,
  ReplyPayloadDelivery,
} from "openclaw/plugin-sdk/interactive-runtime";
```

形状：

```ts
type MessagePresentation = {
  title?: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
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

按钮语义：

- `value` 是一个应用程序操作值，当频道支持可点击控件时，会通过频道的现有交互路径路由回来。
- `url` 是链接按钮，可以不包含 `value`。
- `label` 是必需的，也用于文本降级。
- `style` 是建议性的。渲染器应将不支持的样式映射到安全的默认值，而不是使发送失败。

选择菜单语义：

- `options[].value` 是所选的应用程序值。
- `placeholder` 是建议性的，可能被不支持原生选择菜单的频道忽略。
- 如果频道不支持选择菜单，降级文本会列出标签。

## 生产者示例

简单卡片：

```json
{
  "title": "Deploy approval",
  "tone": "warning",
  "blocks": [
    { "type": "text", "text": "Canary is ready to promote." },
    { "type": "context", "text": "Build 1234, staging passed." },
    {
      "type": "buttons",
      "buttons": [
        { "label": "Approve", "value": "deploy:approve", "style": "success" },
        { "label": "Decline", "value": "deploy:decline", "style": "danger" }
      ]
    }
  ]
}
```

仅 URL 链接按钮：

```json
{
  "blocks": [
    { "type": "text", "text": "Release notes are ready." },
    {
      "type": "buttons",
      "buttons": [{ "label": "Open notes", "url": "https://example.com/release" }]
    }
  ]
}
```

选择菜单：

```json
{
  "title": "Choose environment",
  "blocks": [
    {
      "type": "select",
      "placeholder": "Environment",
      "options": [
        { "label": "Canary", "value": "env:canary" },
        { "label": "Production", "value": "env:prod" }
      ]
    }
  ]
}
```

CLI 发送：

```bash
openclaw message send --channel slack \
  --target channel:C123 \
  --message "Deploy approval" \
  --presentation '{"title":"Deploy approval","tone":"warning","blocks":[{"type":"text","text":"Canary is ready."},{"type":"buttons","buttons":[{"label":"Approve","value":"deploy:approve","style":"success"},{"label":"Decline","value":"deploy:decline","style":"danger"}]}]}'
```

固定交付：

```bash
openclaw message send --channel telegram \
  --target -1001234567890 \
  --message "Topic opened" \
  --pin
```

显式 JSON 固定交付：

```json
{
  "pin": {
    "enabled": true,
    "notify": true,
    "required": false
  }
}
```

## 渲染器合约

频道插件在其出站适配器上声明渲染支持：

```ts
const adapter: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  presentationCapabilities: {
    supported: true,
    buttons: true,
    selects: true,
    context: true,
    divider: true,
  },
  deliveryCapabilities: {
    pin: true,
  },
  renderPresentation({ payload, presentation, ctx }) {
    return renderNativePayload(payload, presentation, ctx);
  },
  async pinDeliveredMessage({ target, messageId, pin }) {
    await pinNativeMessage(target, messageId, { notify: pin.notify === true });
  },
};
```

能力字段是故意简单的布尔值。它们描述的是渲染器能使什么具有交互性，而不是每个原生平台的限制。渲染器仍然拥有平台特定的限制，例如最大按钮数量、块数量和卡片大小。

## 核心渲染流程

当 `ReplyPayload` 或消息操作包含 `presentation` 时，核心会：

1. 规范化呈现载荷。
2. 解析目标频道的出站适配器。
3. 读取 `presentationCapabilities`。
4. 当适配器能渲染载荷时调用 `renderPresentation`。
5. 当适配器不存在或无法渲染时，降级到保守文本。
6. 通过正常频道交付路径发送结果载荷。
7. 在第一条成功发送的消息后应用交付元数据，例如 `delivery.pin`。

核心拥有降级行为，因此生产者可以保持频道无关性。频道插件拥有原生渲染和交互处理。

## 降级规则

呈现必须能安全地在有限频道上发送。

降级文本包括：

- `title` 作为第一行
- `text` 块作为普通段落
- `context` 块作为紧凑上下文行
- `divider` 块作为视觉分隔符
- 按钮标签，包括链接按钮的 URL
- 选择选项标签

不支持的原生控件应该降级而不是让整个发送失败。示例：

- 禁用内联按钮的 Telegram 发送文本降级内容。
- 不支持选择菜单的频道将选择选项列为文本。
- 仅 URL 按钮变成原生链接按钮或降级 URL 行。
- 可选的固定失败不会导致已交付消息失败。

主要例外是 `delivery.pin.required: true`；如果固定是必需的但频道无法固定已发送消息，交付会报告失败。

## 提供商映射

当前内置渲染器：

| 频道            | 原生渲染目标   | 备注                                                                                                       |
| --------------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| Discord         | 组件和组件容器 | 为现有提供商原生载荷生产者保留旧版 `channelData.discord.components`，但新的共享发送应使用 `presentation`。 |
| Slack           | Block Kit      | 为现有提供商原生载荷生产者保留旧版 `channelData.slack.blocks`，但新的共享发送应使用 `presentation`。       |
| Telegram        | 文本加内联键盘 | 按钮/选择菜单需要目标表面的内联按钮能力；否则使用文本降级。                                                |
| Mattermost      | 文本加交互属性 | 其他块降级为文本。                                                                                         |
| Microsoft Teams | Adaptive Cards | 当两者都提供时，纯 `message` 文本会包含在卡片中。                                                          |
| Feishu          | 互动卡片       | 卡片标题可使用 `title`；正文避免重复该标题。                                                               |
| 普通频道        | 文本降级       | 没有渲染器的频道仍然获得可读输出。                                                                         |

提供商原生载荷兼容性是现有响应生产者的过渡支持。这不是向共享消息操作架构添加新共享原生字段的理由。

## 呈现 vs InteractiveReply

`InteractiveReply` 是审批和交互帮助器使用的旧版内部子集。它支持：

- 文本
- 按钮
- 选择菜单

`MessagePresentation` 是规范的共享发送合约。它添加了：

- 标题
- 语调
- 上下文
- 分隔线
- 仅 URL 按钮
- 通过 `ReplyPayload.delivery` 的通用交付元数据

在桥接旧代码时使用 `openclaw/plugin-sdk/interactive-runtime` 中的帮助器：

```ts
import {
  interactiveReplyToPresentation,
  normalizeMessagePresentation,
  presentationToInteractiveReply,
  renderMessagePresentationFallbackText,
} from "openclaw/plugin-sdk/interactive-runtime";
```

新代码应直接接受或生成 `MessagePresentation`。

## 交付固定

固定是交付行为，而不是呈现。使用 `delivery.pin` 而不是 `channelData.telegram.pin` 等提供商原生字段。

语义：

- `pin: true` 固定第一条成功交付的消息。
- `pin.notify` 默认为 `false`。
- `pin.required` 默认为 `false`。
- 可选的固定失败会降级并保持已发送消息完整。
- 必需的固定失败会导致交付失败。
- 分块消息固定第一个交付的块，而不是尾部块。

手动 `pin`、`unpin` 和 `pins` 消息操作仍然存在，用于提供商支持这些操作的现有消息。

## 插件作者检查清单

- 当频道能渲染或安全降级语义呈现时，从 `describeMessageTool(...)` 声明 `presentation`。
- 向运行时出站适配器添加 `presentationCapabilities`。
- 在运行时代码中实现 `renderPresentation`，而不是在控制平面插件设置代码中。
- 将原生 UI 库排除在热设置/目录路径之外。
- 在渲染器和测试中保留平台限制。
- 为不支持的按钮、选择菜单、URL 按钮、标题/文本重复以及混合 `message` 加 `presentation` 发送添加降级测试。
- 仅当提供商能固定已发送消息 id 时，通过 `deliveryCapabilities.pin` 和 `pinDeliveredMessage` 添加交付固定支持。
- 不要通过共享消息操作架构暴露新的提供商原生卡片/块/组件/按钮字段。

## 相关文档

- [消息 CLI](/cli/message)
- [插件 SDK 概览](/plugins/sdk-overview)
- [插件架构](/plugins/architecture-internals#message-tool-schemas)
- [频道呈现重构计划](/plan/ui-channels)
