---
summary: "OpenClaw 在频道、路由、媒体和用户体验方面的能力。"
read_when:
  - 你想要 OpenClaw 支持内容的完整列表
title: "功能"
---

## 亮点

<Columns>
  <Card title="频道" icon="message-square" href="/channels">
    通过单个网关支持 Discord、iMessage、Signal、Slack、Telegram、WhatsApp、WebChat 等。
  </Card>
  <Card title="插件" icon="plug" href="/tools/plugin">
    内置插件在普通当前发布版本中无需单独安装即可添加 Matrix、Nextcloud Talk、Nostr、Twitch、Zalo 等。
  </Card>
  <Card title="路由" icon="route" href="/concepts/multi-agent">
    具有隔离会话的多智能体路由。
  </Card>
  <Card title="媒体" icon="image" href="/nodes/images">
    图像、音频、视频、文档和图像/视频生成。
  </Card>
  <Card title="应用和 UI" icon="monitor" href="/web/control-ui">
    Web Control UI 和 macOS 伴侣应用。
  </Card>
  <Card title="移动节点" icon="smartphone" href="/nodes">
    iOS 和 Android 节点，支持配对、语音/聊天和丰富的设备命令。
  </Card>
</Columns>

## 完整列表

**频道：**

- 内置频道包括 Discord、Google Chat、iMessage（遗留）、IRC、Signal、Slack、Telegram、WebChat 和 WhatsApp
- 内置插件频道包括 BlueBubbles for iMessage、Feishu、LINE、Matrix、Mattermost、Microsoft Teams、Nextcloud Talk、Nostr、QQ Bot、Synology Chat、Tlon、Twitch、Zalo 和 Zalo Personal
- 可选单独安装的频道插件包括语音通话和第三方软件包如微信
- 第三方频道插件可以进一步扩展网关，如微信
- 支持基于提及激活的群聊
- 带白名单和配对的私信安全

**智能体：**

- 带工具流式传输的嵌入式智能体运行时
- 每个工作区或发送者具有隔离会话的多智能体路由
- 会话：私信折叠到共享 `main`；群组是隔离的
- 长回复的流式传输和分块

**认证和提供商：**

- 35+ 个模型提供商（Anthropic、OpenAI、Google 等）
- 通过 OAuth 的订阅认证（例如 OpenAI Codex）
- 自定义和自托管提供商支持（vLLM、SGLang、Ollama，以及任何 OpenAI 兼容或 Anthropic 兼容端点）

**媒体：**

- 图像、音频、视频和文档的输入输出
- 共享的图像生成和视频生成能力接口
- 语音备注转录
- 多提供商文字转语音

**应用和界面：**

- WebChat 和浏览器 Control UI
- macOS 菜单栏伴侣应用
- iOS 节点，支持配对、Canvas、摄像头、屏幕录制、位置和语音
- Android 节点，支持配对、聊天、语音、Canvas、摄像头和设备命令

**工具和自动化：**

- 浏览器自动化、exec、沙箱化
- 网页搜索（Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG、Tavily）
- 定时任务和心跳调度
- 技能、插件和工作流管道（Lobster）

## 相关

- [实验性功能](/concepts/experimental-features)
- [智能体运行时](/concepts/agent)
