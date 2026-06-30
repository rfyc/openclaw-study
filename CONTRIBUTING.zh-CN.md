# 为 OpenClaw 做贡献

欢迎来到龙虾罐！🦞

## 快速链接

- **GitHub:** https://github.com/openclaw/openclaw
- **愿景:** [`VISION.md`](VISION.md)
- **Discord:** https://discord.gg/clawd
- **X/Twitter:** [@steipete](https://x.com/steipete) / [@openclaw](https://x.com/openclaw)

## 维护者

- **Peter Steinberger** - 仁慈独裁者
  - GitHub: [@steipete](https://github.com/steipete) · X: [@steipete](https://x.com/steipete)

- **Shadow** - Discord 子系统，Discord 管理，Clawhub，所有社区管理
  - GitHub: [@thewilloftheshadow](https://github.com/thewilloftheshadow) · X: [@4shadowed](https://x.com/4shadowed)

- **Vignesh** - 内存 (QMD)，形式建模，TUI，IRC，以及 Lobster
  - GitHub: [@vignesh07](https://github.com/vignesh07) · X: [@\_vgnsh](https://x.com/_vgnsh)

- **Jos** - Telegram，API，Nix 模式
  - GitHub: [@joshp123](https://github.com/joshp123) · X: [@jjpcodes](https://x.com/jjpcodes)

- **Ayaan Zaidi** - Telegram 子系统，Android 应用
  - GitHub: [@obviyus](https://github.com/obviyus) · X: [@obviyus](https://x.com/obviyus)

- **Tyler Yust** - 代理/子代理，cron，BlueBubbles，macOS 应用
  - GitHub: [@tyler6204](https://github.com/tyler6204) · X: [@tyleryust](https://x.com/tyleryust)

- **Mariano Belinky** - iOS 应用，安全
  - GitHub: [@mbelinky](https://github.com/mbelinky) · X: [@belimad](https://x.com/belimad)

- **Nimrod Gutman** - iOS 应用，macOS 应用和甲壳类功能
  - GitHub: [@ngutman](https://github.com/ngutman) · X: [@theguti](https://x.com/theguti)

- **Vincent Koc** - 代理，遥测，钩子，安全
  - GitHub: [@vincentkoc](https://github.com/vincentkoc) · X: [@vincent_koc](https://x.com/vincent_koc)

- **Val Alexander** - UI/UX，文档，以及代理开发体验
  - GitHub: [@BunsDev](https://github.com/BunsDev) · X: [@BunsDev](https://x.com/BunsDev)

- **Seb Slight** - 文档，代理可靠性，运行时加固
  - GitHub: [@sebslight](https://github.com/sebslight) · X: [@sebslig](https://x.com/sebslig)

- **Christoph Nakazawa** - JS 基础设施
  - GitHub: [@cpojer](https://github.com/cpojer) · X: [@cnakazawa](https://x.com/cnakazawa)

- **Gustavo Madeira Santana** - 多代理，CLI，性能，插件，Matrix
  - GitHub: [@gumadeiras](https://github.com/gumadeiras) · X: [@gumadeiras](https://x.com/gumadeiras)

- **Onur Solmaz** - 代理，开发工作流，ACP 集成，MS Teams
  - GitHub: [@onutc](https://github.com/onutc), [@osolmaz](https://github.com/osolmaz) · X: [@onusoz](https://x.com/onusoz)

- **Josh Avant** - 核心，CLI，网关，安全，代理
  - GitHub: [@joshavant](https://github.com/joshavant) · X: [@joshavant](https://x.com/joshavant)

- **Jonathan Taylor** - ACP 子系统，网关功能/bug，Gog/Mog/Sog CLI，SEDMAT
  - GitHub [@visionik](https://github.com/visionik) · X: [@visionik](https://x.com/visionik)

- **Josh Lehman** - 压缩，上下文引擎
  - GitHub [@jalehman](https://github.com/jalehman) · X: [@jlehman\_](https://x.com/jlehman_)

- **Radek Sienkiewicz** - 文档，控制 UI
  - GitHub [@velvet-shark](https://github.com/velvet-shark) · X: [@velvet_shark](https://twitter.com/velvet_shark)

- **Muhammed Mukhthar** - Mattermost，CLI
  - GitHub [@mukhtharcm](https://github.com/mukhtharcm) · X: [@mukhtharcm](https://x.com/mukhtharcm)

- **Altay** - 代理，CLI，错误处理
  - GitHub [@altaywtf](https://github.com/altaywtf) · X: [@altaywtf](https://x.com/altaywtf)

- **Robin Waslander** - 安全，PR 分类，bug 修复
  - GitHub: [@hydro13](https://github.com/hydro13) · X: [@Robin_waslander](https://x.com/Robin_waslander)

- **Tengji (George) Zhang** - 中国模型 API，云，pi
  - GitHub: [@odysseus0](https://github.com/odysseus0) · X: [@odysseus0z](https://x.com/odysseus0z)

- **Sliverp** - 中文频道：QQ，微信，企业微信，元宝，钉钉，飞书
  - GitHub: [@sliverp](https://github.com/sliverp) · X: [@sliver01234](https://x.com/sliver01234)

- **Mason Huang** - 稳定性，安全，速度
  - GitHub: [@hxy91819](https://github.com/hxy91819) · X: [@chenjingtalk](https://x.com/chenjingtalk)

## 如何贡献

1. **Bug 和小修复** → 开一个 PR！
2. **新功能/架构** → 首先在 [GitHub Issue](https://github.com/openclaw/openclaw/issues/new/choose) 中提出或在 Discord 上询问。大多数功能不被接受，应该作为第三方插件使用我们的插件 SDK。
3. **仅重构 PR** → 不要开 PR。除非维护者明确要求作为具体修复的一部分，我们不接受仅重构的变更。
4. **针对已知 `main` 失败的仅测试/CI PR** → 不要开 PR。维护者团队已经在跟踪这些失败，仅调整测试或 CI 来追逐它们的 PR 将被关闭，除非需要验证新修复。
5. **问题** → Discord [#help](https://discord.com/channels/1456350064065904867/1459642797895319552) / [#users-helping-users](https://discord.com/channels/1456350064065904867/1459007081603403828)

## PR 限制

我们将每位作者的**开放 PR 上限设为 20 个**。如果超过此限制，将添加 `r: too-many-prs` 标签，您的 PR 将被自动关闭。这是一个硬性限制。

对于真正需要超过 20 个 PR 的协调变更集，请先在 Discord 中加入 **#clawtributors** 频道并与维护者交流。

## PR 之前

- 使用您的 OpenClaw 实例在本地测试
- 运行测试：`pnpm build && pnpm check && pnpm test`
- 对于迭代本地提交，`scripts/committer --fast "message" <files...>` 通过 `FAST_COMMIT=1` 传递到预提交钩子，使其跳过仓库范围的 `pnpm check`。仅在已对触及表面运行等效有针对性验证时使用。
- 对于扩展/插件变更，首先运行快速本地通道：
  - `pnpm test:extension <extension-name>`
  - `pnpm test:extension --list` 查看有效的扩展 id
  - 如果更改了共享插件或频道表面，运行 `pnpm test:contracts`
  - 对于有针对性的共享表面工作，使用 `pnpm test:contracts:channels` 或 `pnpm test:contracts:plugins`
  - 这些命令还涵盖默认单元通道跳过的共享接缝/冒烟文件
  - 如果更改了更广泛的运行时行为，在请求审查之前仍然运行相关的更宽通道（`pnpm test:extensions`、`pnpm test:channels` 或 `pnpm test`）
- 如果在共享代码中触及了捆绑插件边界，运行匹配的清单：
  - `node scripts/check-src-extension-import-boundary.mjs --json` 用于 `src/**`
  - `node scripts/check-sdk-package-extension-import-boundary.mjs --json` 用于 `src/plugin-sdk/**` 和 `packages/**`
  - `node scripts/check-test-helper-extension-import-boundary.mjs --json` 用于 `test/helpers/**`
- 共享测试辅助函数必须使用 `src/test-utils/bundled-plugin-public-surface.ts` 而非仓库相对 `extensions/**` 导入。保持特定于插件的深度模拟在拥有的捆绑插件包内。
- 如果您有 Codex 访问权限，在打开或更新 PR 之前在本地运行 `codex review --base origin/main`。将其视为当前最高标准的 AI 审查，即使 GitHub Codex 审查也在运行。
- 不要提交仅重构的 PR，除非维护者明确为了活跃的修复或可交付成果而请求该重构。
- 不要为已在主 CI 上出现红色的失败提交测试或 CI 配置修复。如果失败已在 [主分支 CI 运行](https://github.com/openclaw/openclaw/actions) 中可见，这是维护者团队正在跟踪的已知问题，仅解决这些失败的 PR 将被自动关闭。如果您发现主 CI 中尚未显示的*新*回归，请先作为 issue 报告。
- 不要提交仅尝试使已知 `main` CI 失败通过的仅测试 PR。当测试变更需要验证同一 PR 中的新修复或覆盖新行为时，它们是可以接受的。
- 确保 CI 检查通过
- 保持 PR 有针对性（每个 PR 一件事；不要混合无关关注点）
- 描述内容和原因
- 在再次请求审查之前，回复或解决您已处理的机器人审查对话
- **包含截图** — 一张显示问题/之前，一张显示修复/之后（用于 UI 或视觉变更）
- 在代码、注释、文档和 UI 字符串中使用美式英语拼写和语法
- 不要编辑被 `CODEOWNERS` 安全所有权覆盖的文件，除非列出的所有者明确要求变更或已在与您一起审查它。将这些路径视为受限审查表面，而非机会性清理目标。

## 审查对话由作者拥有

如果审查机器人在您的 PR 上留下审查对话，您应该负责跟进：

- 一旦代码或解释完全解决了机器人的关注点，自己解决对话
- 仅在需要维护者或审阅者判断时回复并保持开放
- 不要将"已修复"的机器人审查对话留给维护者清理
- 如果 Codex 留下评论，处理每一个相关的评论，或在不适用于您的变更时用简短解释解决它
- 如果 GitHub Codex 审查因某种原因没有触发，仍然在本地运行 `codex review --base origin/main` 并将该输出视为必要的审查工作

这适用于人类编写和 AI 辅助的 PR。

## 控制 UI 装饰器

控制 UI 使用 Lit 与**旧版**装饰器（当前 Rollup 解析不支持标准装饰器所需的 `accessor` 字段）。添加响应式字段时，保持旧版风格：

```ts
@state() foo = "bar";
@property({ type: Number }) count = 0;
```

根 `tsconfig.json` 配置为旧版装饰器（`experimentalDecorators: true`），`useDefineForClassFields: false`。除非您也在更新 UI 构建工具以支持标准装饰器，否则避免翻转这些设置。

## AI/Vibe 编码 PR 欢迎！🤖

用 Codex、Claude 或其他 AI 工具构建的？**很棒 - 只需标记它！**

请在您的 PR 中包含：

- [ ] 在 PR 标题或描述中标记为 AI 辅助
- [ ] 注明测试程度（未测试/轻度测试/完整测试）
- [ ] 如果可能，包含提示或会话日志（非常有帮助！）
- [ ] 确认您理解代码的功能
- [ ] 如果您有 Codex 访问权限，在请求审查之前在本地运行 `codex review --base origin/main` 并处理发现
- [ ] 解决或回复您已处理的机器人审查对话

AI PR 在这里是一等公民。我们只是想要透明度，以便审阅者知道要寻找什么。如果您使用 LLM 编码代理，指示它解决已处理的机器人审查对话，而不是将其留给维护者。

## 当前重点与路线图 🗺

我们目前正在优先考虑：

- **稳定性**：修复频道连接（WhatsApp/Telegram）中的边界情况。
- **用户体验**：改进入门向导和错误消息。
- **技能**：对于技能贡献，前往 [ClawHub](https://clawhub.ai/) — OpenClaw 技能的社区中心。
- **性能**：优化令牌使用和压缩逻辑。

查看 [GitHub Issues](https://github.com/openclaw/openclaw/issues) 中的
["good first issue"](https://github.com/openclaw/openclaw/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
标签。如果没有开放的，选择一个小文档或 bug issue，留下快速评论说您想处理它。

## 维护者

我们正在有选择地扩大维护者团队。
如果您是一位有经验的贡献者，想要帮助塑造 OpenClaw 的方向——无论是通过代码、文档还是社区——我们很乐意听到您的声音。

成为维护者是一种责任，而不是荣誉头衔。我们期望积极、持续的参与——分类问题、审查 PR 以及帮助推进项目前进。

还有兴趣？发送邮件到 contributing@openclaw.ai，包含：

- 您在 OpenClaw 上的 PR 链接（如果没有，先从那里开始）
- 您维护或积极贡献的开源项目链接
- 您的 GitHub、Discord 和 X/Twitter 账号
- 简短介绍：背景、经验和感兴趣的领域
- 您会说的语言以及您所在的地方
- 您能真实投入多少时间

我们欢迎各种技能的人——工程、文档、社区管理等。
我们仔细审查每一份完全由人类撰写的申请，并慢慢且有意地添加维护者。
请允许几周时间等待回复。

## 报告漏洞

我们认真对待安全报告。直接向问题所在的仓库报告漏洞：

- **核心 CLI 和网关** — [openclaw/openclaw](https://github.com/openclaw/openclaw)
- **macOS 桌面应用** — [openclaw/openclaw](https://github.com/openclaw/openclaw)（apps/macos）
- **iOS 应用** — [openclaw/openclaw](https://github.com/openclaw/openclaw)（apps/ios）
- **Android 应用** — [openclaw/openclaw](https://github.com/openclaw/openclaw)（apps/android）
- **ClawHub** — [openclaw/clawhub](https://github.com/openclaw/clawhub)
- **信任和威胁模型** — [openclaw/trust](https://github.com/openclaw/trust)

对于不适合特定仓库的问题，或者如果您不确定，请发送邮件到 **security@openclaw.ai**，我们会路由它。

### 报告中需要包含

1. **标题**
2. **严重性评估**
3. **影响**
4. **受影响的组件**
5. **技术重现**
6. **已证明的影响**
7. **环境**
8. **修复建议**

没有重现步骤、已证明影响和修复建议的报告将被降低优先级。鉴于 AI 生成的扫描仪发现量，我们必须确保我们收到来自理解问题的研究人员的经过验证的报告。
