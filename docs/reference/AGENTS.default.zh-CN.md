---
summary: "OpenClaw 智能助手默认说明与技能列表，适用于个人助手配置"
title: "默认 AGENTS.md"
read_when:
  - 启动新的 OpenClaw 智能助手会话时
  - 启用或审计默认技能时
---

# AGENTS.md - OpenClaw 个人助手（默认）

## 首次运行（推荐）

OpenClaw 为智能助手使用专用工作区目录。默认路径：`~/.openclaw/workspace`（可通过 `agents.defaults.workspace` 配置）。

1. 创建工作区（如果尚不存在）：

```bash
mkdir -p ~/.openclaw/workspace
```

2. 将默认工作区模板复制到工作区：

```bash
cp docs/reference/templates/AGENTS.md ~/.openclaw/workspace/AGENTS.md
cp docs/reference/templates/SOUL.md ~/.openclaw/workspace/SOUL.md
cp docs/reference/templates/TOOLS.md ~/.openclaw/workspace/TOOLS.md
```

3. 可选：如果需要个人助手技能列表，将 AGENTS.md 替换为此文件：

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. 可选：通过设置 `agents.defaults.workspace` 选择不同的工作区（支持 `~`）：

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## 安全默认设置

- 不要将目录或密钥信息转储到对话中。
- 除非明确要求，不要运行破坏性命令。
- 不要向外部消息界面发送部分/流式回复（仅发送最终回复）。

## 会话开始（必要）

- 读取 `SOUL.md`、`USER.md`，以及 `memory/` 中今天和昨天的记录。
- 存在 `MEMORY.md` 时读取它。
- 在回复之前完成上述操作。

## 灵魂（必要）

- `SOUL.md` 定义身份、语气和界限。保持其最新状态。
- 如果修改了 `SOUL.md`，请告知用户。
- 每次会话都是新实例；连续性保存在这些文件中。

## 共享空间（推荐）

- 你不是用户的代言人；在群聊或公开频道中请谨慎。
- 不要分享私人数据、联系方式或内部备注。

## 记忆系统（推荐）

- 每日日志：`memory/YYYY-MM-DD.md`（如需创建 `memory/` 目录）。
- 长期记忆：`MEMORY.md` 用于存储持久性事实、偏好和决策。
- 小写 `memory.md` 仅作为旧版修复输入；不要同时在根目录保留两个文件。
- 会话开始时，读取今天、昨天以及存在时的 `MEMORY.md`。
- 记录：决策、偏好、约束、未完成的事项。
- 除非明确要求，避免记录密钥。

## 工具与技能

- 工具保存在技能中；需要时请遵循各技能的 `SKILL.md`。
- 将特定环境的说明保存在 `TOOLS.md`（技能备注）中。

## 备份建议（推荐）

如果将此工作区视为 Clawd 的"记忆"，请将其设为 git 仓库（最好是私有的），以便备份 `AGENTS.md` 和记忆文件。

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md
git commit -m "Add Clawd workspace"
# 可选：添加私有远程仓库并推送
```

## OpenClaw 的功能

- 运行 WhatsApp 网关 + Pi 编程智能助手，使助手可以通过宿主 Mac 读写聊天记录、获取上下文并运行技能。
- macOS 应用管理权限（屏幕录制、通知、麦克风），并通过其捆绑的二进制文件提供 `openclaw` CLI。
- 直接聊天默认合并到智能助手的 `main` 会话；群组保持隔离，使用 `agent:<agentId>:<channel>:group:<id>`（房间/频道：`agent:<agentId>:<channel>:channel:<id>`）；心跳使后台任务保持活跃。

## 核心技能（在"设置 → 技能"中启用）

- **mcporter** — 用于管理外部技能后端的工具服务器运行时/CLI。
- **Peekaboo** — 快速 macOS 截图，支持可选 AI 视觉分析。
- **camsnap** — 从 RTSP/ONVIF 安全摄像头捕获帧、片段或运动提醒。
- **oracle** — 带会话回放和浏览器控制的 OpenAI 兼容智能助手 CLI。
- **eightctl** — 从终端控制您的睡眠。
- **imsg** — 发送、读取、流式传输 iMessage 和 SMS。
- **wacli** — WhatsApp CLI：同步、搜索、发送。
- **discord** — Discord 操作：表情回应、贴纸、投票。使用 `user:<id>` 或 `channel:<id>` 作为目标（单纯的数字 id 存在歧义）。
- **gog** — Google Suite CLI：Gmail、日历、Drive、联系人。
- **spotify-player** — 终端 Spotify 客户端，用于搜索/排队/控制播放。
- **sag** — 带 mac 风格 say 用户体验的 ElevenLabs 语音；默认流式传输到扬声器。
- **Sonos CLI** — 通过脚本控制 Sonos 扬声器（发现/状态/播放/音量/分组）。
- **blucli** — 通过脚本播放、分组和自动化 BluOS 播放器。
- **OpenHue CLI** — 飞利浦 Hue 灯光控制，用于场景和自动化。
- **OpenAI Whisper** — 本地语音转文字，用于快速听写和语音邮件转录。
- **Gemini CLI** — 终端中的 Google Gemini 模型，用于快速问答。
- **agent-tools** — 自动化和辅助脚本的实用工具包。

## 使用说明

- 优先使用 `openclaw` CLI 进行脚本编写；mac 应用处理权限。
- 从"技能"选项卡安装；如果二进制文件已存在，它会隐藏安装按钮。
- 保持心跳启用，以便助手可以安排提醒、监控收件箱并触发摄像头捕获。
- Canvas UI 以全屏方式运行，带有原生叠加层。避免将关键控件放置在左上/右上/底部边缘；在布局中添加明确的边距，不要依赖安全区域嵌入。
- 对于浏览器驱动的验证，使用 `openclaw browser`（选项卡/状态/截图），配合 OpenClaw 管理的 Chrome 配置文件。
- 对于 DOM 检查，使用 `openclaw browser eval|query|dom|snapshot`（需要机器输出时使用 `--json`/`--out`）。
- 对于交互，使用 `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run`（click/type 需要快照引用；使用 `evaluate` 处理 CSS 选择器）。

## 相关链接

- [智能助手工作区](/concepts/agent-workspace)
- [智能助手运行时](/concepts/agent)
