---
summary: "社区构建的由 OpenClaw 驱动的项目和集成"
title: "展示"
description: "来自社区的真实 OpenClaw 项目"
read_when:
  - 寻找真实的 OpenClaw 使用示例
  - 更新社区项目精选
---

OpenClaw 项目不是玩具演示。人们正在从他们已经使用的渠道——基于聊天的 Telegram、WhatsApp、Discord 和终端构建——发布 PR 审查循环、移动应用、家庭自动化、语音系统、开发工具和内存密集型工作流；无需等待 API 即可实现真实的预订、购物和支持自动化；以及与打印机、吸尘器、摄像头和家庭系统的物理世界集成。

<Info>
**想要被收录？** 在 [Discord 的 #self-promotion 频道](https://discord.gg/clawd)分享您的项目，或在 [X 上 @openclaw](https://x.com/openclaw)。
</Info>

## 视频

如果您想以最短的路径从"这是什么？"到"好的，我明白了"，请从这里开始。

<CardGroup cols={3}>

<Card title="完整设置演练" href="https://www.youtube.com/watch?v=SaWSPZoPX34">
  VelvetShark，28 分钟。从头到尾安装、入门并获得第一个可用的助手。
</Card>

<Card title="社区展示精选" href="https://www.youtube.com/watch?v=mMSKQvlmFuQ">
  快速浏览围绕 OpenClaw 构建的真实项目、界面和工作流。
</Card>

<Card title="实际项目" href="https://www.youtube.com/watch?v=5kkIJNUGFho">
  来自社区的示例，从基于聊天的编码循环到硬件和个人自动化。
</Card>

</CardGroup>

## Discord 最新动态

编码、开发工具、移动和基于聊天的产品构建方面的近期亮点。

<CardGroup cols={2}>

<Card title="PR 审查到 Telegram 反馈" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`

OpenCode 完成更改，打开 PR，OpenClaw 审查差异并在 Telegram 中回复建议以及明确的合并结论。

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="OpenClaw PR 审查反馈在 Telegram 中传递" />
</Card>

<Card title="几分钟内完成酒窖技能" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

请求"Robby"（@openclaw）提供本地酒窖技能。它请求一个示例 CSV 导出和存储路径，然后构建并测试技能（示例中有 962 瓶）。

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClaw 从 CSV 构建本地酒窖技能" />
</Card>

<Card title="Tesco 购物自动驾驶" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

每周饮食计划、常规商品、预订配送时段、确认订单。无需 API，只需浏览器控制。

  <img src="/assets/showcase/tesco-shop.jpg" alt="通过聊天自动化 Tesco 购物" />
</Card>

<Card title="SNAG 截图转 Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

热键截取屏幕区域，Gemini 视觉，即时 Markdown 复制到剪贴板。

  <img src="/assets/showcase/snag.png" alt="SNAG 截图转 Markdown 工具" />
</Card>

<Card title="Agents UI" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

用于在 Agents、Claude、Codex 和 OpenClaw 之间管理技能和命令的桌面应用。

  <img src="/assets/showcase/agents-ui.jpg" alt="Agents UI 应用" />
</Card>

<Card title="Telegram 语音便条（papla.media）" icon="microphone" href="https://papla.media/docs">
  **社区** • `voice` `tts` `telegram`

包装 papla.media TTS 并将结果作为 Telegram 语音便条发送（无烦人的自动播放）。

  <img src="/assets/showcase/papla-tts.jpg" alt="TTS 的 Telegram 语音便条输出" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.ai/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`

Homebrew 安装的帮助工具，用于列出、检查和监视本地 OpenAI Codex 会话（CLI + VS Code）。

  <img src="/assets/showcase/codexmonitor.png" alt="ClawHub 上的 CodexMonitor" />
</Card>

<Card title="Bambu 3D 打印机控制" icon="print" href="https://clawhub.ai/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

控制和排查 BambuLab 打印机：状态、任务、摄像头、AMS、校准等。

  <img src="/assets/showcase/bambu-cli.png" alt="ClawHub 上的 Bambu CLI 技能" />
</Card>

<Card title="维也纳交通（Wiener Linien）" icon="train" href="https://clawhub.ai/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

维也纳公共交通的实时出发、中断、电梯状态和路线。

  <img src="/assets/showcase/wienerlinien.png" alt="ClawHub 上的 Wiener Linien 技能" />
</Card>

<Card title="ParentPay 学校餐食" icon="utensils">
  **@George5562** • `automation` `browser` `parenting`

通过 ParentPay 自动化英国学校餐食预订。使用鼠标坐标进行可靠的表格单元格点击。
</Card>

<Card title="R2 上传（Send Me My Files）" icon="cloud-arrow-up" href="https://clawhub.ai/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

上传到 Cloudflare R2/S3 并生成安全的预签名下载链接。对远程 OpenClaw 实例很有用。
</Card>

<Card title="通过 Telegram 开发 iOS 应用" icon="mobile">
  **@coard** • `ios` `xcode` `testflight`

完全通过 Telegram 聊天构建了一个带有地图和语音录制的完整 iOS 应用，并部署到 TestFlight。

  <img src="/assets/showcase/ios-testflight.jpg" alt="TestFlight 上的 iOS 应用" />
</Card>

<Card title="Oura 戒指健康助手" icon="heart-pulse">
  **@AS** • `health` `oura` `calendar`

个人 AI 健康助手，将 Oura 戒指数据与日历、预约和健身计划集成。

  <img src="/assets/showcase/oura-health.png" alt="Oura 戒指健康助手" />
</Card>

<Card title="Kev 的梦之队（14+ 智能体）" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration`

一个 gateway 下有 14+ 智能体，由 Opus 4.5 协调器委派给 Codex 工作者。参见[技术写作](https://github.com/adam91holt/orchestrated-ai-articles)和 [Clawdspace](https://github.com/adam91holt/clawdspace)了解智能体沙箱。
</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli`

与智能体工作流（Claude Code、OpenClaw）集成的 Linear CLI。从终端管理 issues、项目和工作流。
</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli`

通过 Beeper Desktop 读取、发送和存档消息。使用 Beeper 本地 MCP API，让智能体可以在一个地方管理所有聊天（iMessage、WhatsApp 等）。
</Card>

</CardGroup>

## 自动化和工作流

调度、浏览器控制、支持循环，以及产品的"帮我完成任务"那一面。

<CardGroup cols={2}>

<Card title="Winix 空气净化器控制" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code 发现并确认了净化器控制，然后 OpenClaw 接管以管理室内空气质量。

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="通过 OpenClaw 控制 Winix 空气净化器" />
</Card>

<Card title="漂亮的天空摄像头拍摄" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill`

由屋顶摄像头触发：让 OpenClaw 在天空看起来好看时拍摄天空照片。它设计了一个技能并拍摄了照片。

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="OpenClaw 捕获的屋顶摄像头天空快照" />
</Card>

<Card title="视觉早间简报场景" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `telegram`

计划提示每天早上通过 OpenClaw 角色生成一个场景图片（天气、任务、日期、喜欢的帖子或引言）。
</Card>

<Card title="板球场预订" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli`

Playtomic 可用性检查器和预订 CLI。再也不会错过空场了。

  <img src="/assets/showcase/padel-screenshot.jpg" alt="padel-cli 截图" />
</Card>

<Card title="会计收件" icon="file-invoice-dollar">
  **社区** • `automation` `email` `pdf`

从电子邮件收集 PDF，为税务顾问准备文件。每月会计自动运行。
</Card>

<Card title="躺平开发模式" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `migration` `astro`

在看 Netflix 时完全通过 Telegram 重建了整个个人网站——Notion 到 Astro，迁移了 18 篇文章，DNS 迁移到 Cloudflare。从未打开笔记本电脑。
</Card>

<Card title="求职智能体" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

搜索职位列表，与简历关键词匹配，并返回带链接的相关机会。使用 JSearch API 在 30 分钟内构建完成。
</Card>

<Card title="Jira 技能构建器" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `jira` `skill` `devtools`

OpenClaw 连接到 Jira，然后动态生成了一个新技能（在 ClawHub 上还不存在时）。
</Card>

<Card title="通过 Telegram 使用 Todoist 技能" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `todoist` `skill` `telegram`

自动化 Todoist 任务，并让 OpenClaw 直接在 Telegram 聊天中生成技能。
</Card>

<Card title="TradingView 分析" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

通过浏览器自动化登录 TradingView，截取图表，并按需进行技术分析。无需 API——只需浏览器控制。
</Card>

<Card title="Slack 自动支持" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

监视公司 Slack 频道，提供有用的回应，并将通知转发到 Telegram。在没有被要求的情况下自主修复了部署应用中的生产 bug。
</Card>

</CardGroup>

## 知识和记忆

索引、搜索、记忆和推理个人或团队知识的系统。

<CardGroup cols={2}>

<Card title="xuezh 中文学习" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill`

通过 OpenClaw 提供发音反馈和学习流程的中文学习引擎。

  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="xuezh 发音反馈" />
</Card>

<Card title="WhatsApp 记忆金库" icon="vault">
  **社区** • `memory` `transcription` `indexing`

摄取完整的 WhatsApp 导出，转录 1k+ 语音便条，与 git 日志交叉检查，输出链接的 Markdown 报告。
</Card>

<Card title="Karakeep 语义搜索" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks`

使用 Qdrant 加上 OpenAI 或 Ollama embeddings 为 Karakeep 书签添加向量搜索。
</Card>

<Card title="Inside-Out-2 记忆" icon="brain">
  **社区** • `memory` `beliefs` `self-model`

独立的记忆管理器，将会话文件转变为记忆，然后是信念，然后是不断演进的自我模型。
</Card>

</CardGroup>

## 语音和电话

以语音为主的入口点、电话桥接和转录密集型工作流。

<CardGroup cols={2}>

<Card title="Clawdia 电话桥接" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge`

Vapi 语音助手到 OpenClaw HTTP 桥接。与您的智能体进行近实时电话通话。
</Card>

<Card title="OpenRouter 转录" icon="microphone" href="https://clawhub.ai/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

通过 OpenRouter（Gemini 等）进行多语言音频转录。在 ClawHub 上可用。
</Card>

</CardGroup>

## 基础设施和部署

使 OpenClaw 更容易运行和扩展的打包、部署和集成。

<CardGroup cols={2}>

<Card title="Home Assistant 插件" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi`

在 Home Assistant OS 上运行的 OpenClaw gateway，支持 SSH 隧道和持久状态。
</Card>

<Card title="Home Assistant 技能" icon="toggle-on" href="https://clawhub.ai/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation`

通过自然语言控制和自动化 Home Assistant 设备。
</Card>

<Card title="Nix 打包" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment`

用于可重现部署的包含电池的 nixified OpenClaw 配置。
</Card>

<Card title="CalDAV 日历" icon="calendar" href="https://clawhub.ai/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill`

使用 khal 和 vdirsyncer 的日历技能。自托管日历集成。
</Card>

</CardGroup>

## 家庭和硬件

OpenClaw 的物理世界方面：家庭、传感器、摄像头、吸尘器和其他设备。

<CardGroup cols={2}>

<Card title="GoHome 自动化" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana`

以 OpenClaw 为界面的 Nix 原生家庭自动化，加上 Grafana 仪表盘。

  <img src="/assets/showcase/gohome-grafana.png" alt="GoHome Grafana 仪表盘" />
</Card>

<Card title="Roborock 吸尘器" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin`

通过自然对话控制您的 Roborock 机器人吸尘器。

  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Roborock 状态" />
</Card>

</CardGroup>

## 社区项目

超越单一工作流成长为更广泛产品或生态系统的事物。

<CardGroup cols={2}>

<Card title="StarSwap 市场" icon="star" href="https://star-swap.com/">
  **社区** • `marketplace` `astronomy` `webapp`

完整的天文设备市场。使用 OpenClaw 生态系统构建。
</Card>

</CardGroup>

## 提交您的项目

<Steps>
  <Step title="分享它">
    在 [Discord 的 #self-promotion 频道](https://discord.gg/clawd)发帖或[在 X 上 @openclaw](https://x.com/openclaw)。
  </Step>
  <Step title="包含详情">
    告诉我们它是做什么的，链接到仓库或演示，如果有截图请分享。
  </Step>
  <Step title="被收录">
    我们会将突出的项目添加到此页面。
  </Step>
</Steps>

## 相关

- [入门](/start/getting-started)
- [OpenClaw](/start/openclaw)
