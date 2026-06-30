---
summary: "社区维护的 OpenClaw 插件：浏览、安装和提交你自己的插件"
read_when:
  - 你想找到第三方 OpenClaw 插件
  - 你想发布或列出你自己的插件
title: "社区插件"
---

社区插件是第三方包，通过新频道、工具、提供商或其他能力扩展 OpenClaw。它们由社区构建和维护，通常发布在 [ClawHub](/tools/clawhub) 上，可以用一条命令安装。在 ClawHub 包安装推出期间，Npm 仍是裸包规范的发布默认值。

ClawHub 是社区插件的规范发现接口。不要只是为了在这里添加你的插件以提高可发现性而开启仅文档 PR；改为在 ClawHub 上发布。

```bash
openclaw plugins install clawhub:<package-name>
```

对于 npm 托管的包，使用 `openclaw plugins install <package-name>`。

## 已列出的插件

### Apify

使用 20,000+ 现成爬虫从任何网站抓取数据。让你的 agent 只需询问就能从 Instagram、Facebook、TikTok、YouTube、Google Maps、Google Search、电子商务网站等提取数据。

- **npm：** `@apify/apify-openclaw-plugin`
- **仓库：** [github.com/apify/apify-openclaw-plugin](https://github.com/apify/apify-openclaw-plugin)

```bash
openclaw plugins install @apify/apify-openclaw-plugin
```

### Codex App Server Bridge

独立的 OpenClaw Codex App Server 对话桥接。将聊天绑定到 Codex 线程，用纯文本与其交流，并使用聊天原生命令进行恢复、规划、审查、模型选择、压缩等操作。

- **npm：** `openclaw-codex-app-server`
- **仓库：** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

使用 Stream 模式的企业机器人集成。通过任何 DingTalk 客户端支持文本、图像和文件消息。

- **npm：** `@largezhou/ddingtalk`
- **仓库：** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

OpenClaw 的无损上下文管理插件。基于 DAG 的对话摘要与增量压缩——在减少令牌使用量的同时保留完整上下文保真度。

- **npm：** `@martian-engineering/lossless-claw`
- **仓库：** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

将 agent 轨迹导出到 Opik 的官方插件。监控 agent 行为、成本、令牌、错误等。

- **npm：** `@opik/opik-openclaw`
- **仓库：** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### Prometheus Avatar

为你的 OpenClaw agent 提供带有实时口型同步、情感表情和文字转语音的 Live2D 虚拟形象。包括用于 AI 资产生成的创作工具和一键部署到 Prometheus Marketplace。目前处于 alpha 阶段。

- **npm：** `@prometheusavatar/openclaw-plugin`
- **仓库：** [github.com/myths-labs/prometheus-avatar](https://github.com/myths-labs/prometheus-avatar)

```bash
openclaw plugins install @prometheusavatar/openclaw-plugin
```

### QQbot

通过 QQ Bot API 将 OpenClaw 连接到 QQ。支持私聊、群聊 @ 提及、频道消息以及包括语音、图像、视频和文件在内的富媒体。

当前 OpenClaw 版本捆绑了 QQ Bot。对于正常安装，请使用 [QQ Bot](/channels/qqbot) 中的捆绑设置；仅当你有意想要 Tencent 维护的独立包时才安装此外部插件。

- **npm：** `@tencent-connect/openclaw-qqbot`
- **仓库：** [github.com/tencent-connect/openclaw-qqbot](https://github.com/tencent-connect/openclaw-qqbot)

```bash
openclaw plugins install @tencent-connect/openclaw-qqbot
```

### wecom

Tencent WeCom 团队为 OpenClaw 开发的 WeCom 频道插件。由 WeCom Bot WebSocket 持久连接提供支持，支持私信和群聊、流式回复、主动消息、图像/文件处理、Markdown 格式化、内置访问控制以及文档/会议/消息技能。

- **npm：** `@wecom/wecom-openclaw-plugin`
- **仓库：** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

### Yuanbao

Tencent Yuanbao 团队为 OpenClaw 开发的 Yuanbao 频道插件。由 WebSocket 持久连接提供支持，支持私信和群聊、流式回复、主动消息、图像/文件/音频/视频处理、Markdown 格式化、内置访问控制以及斜杠命令菜单。

- **npm：** `openclaw-plugin-yuanbao`
- **仓库：** [github.com/YuanbaoTeam/yuanbao-openclaw-plugin](https://github.com/YuanbaoTeam/yuanbao-openclaw-plugin)

```bash
openclaw plugins install openclaw-plugin-yuanbao
```

## 提交你的插件

我们欢迎有用、有文档且可安全操作的社区插件。

<Steps>
  <Step title="发布到 ClawHub 或 npm">
    你的插件必须可通过 `openclaw plugins install \<package-name\>` 安装。
    除非你特别需要仅 npm 分发，否则发布到 [ClawHub](/tools/clawhub)。
    完整指南请参见[构建插件](/plugins/building-plugins)。

  </Step>

  <Step title="托管在 GitHub 上">
    源代码必须在具有设置文档和问题跟踪器的公共仓库中。

  </Step>

  <Step title="仅对源文档更改使用文档 PR">
    你不需要仅为了使插件可被发现而开启文档 PR。改为在 ClawHub 上发布它。

    仅当 OpenClaw 的源文档需要实际内容更改时才开启文档 PR，例如更正安装指导或添加属于主文档集的跨仓库文档。

  </Step>
</Steps>

## 质量标准

| 要求                     | 原因                                         |
| ------------------------ | -------------------------------------------- |
| 发布在 ClawHub 或 npm 上 | 用户需要 `openclaw plugins install` 能够工作 |
| 公开的 GitHub 仓库       | 源码审查、问题跟踪、透明度                   |
| 设置和使用文档           | 用户需要知道如何配置它                       |
| 积极维护                 | 最近更新或响应式问题处理                     |

低质量包装器、所有权不明或未维护的包可能被拒绝。

## 相关文档

- [安装和配置插件](/tools/plugin) — 如何安装任何插件
- [构建插件](/plugins/building-plugins) — 创建你自己的插件
- [插件清单](/plugins/manifest) — 清单模式
