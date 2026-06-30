# 变更日志

文档：https://docs.openclaw.ai

> 注意：此变更日志包含大量版本更新条目，以下保留原文中的技术条目内容不翻译（功能名称、命令名、参数等），仅翻译结构性标题。

## 未发布版本

### 亮点

- Plugins/file-transfer: add bundled file-transfer plugin with `file_fetch`, `dir_list`, `dir_fetch`, and `file_write` agent tools for binary file ops on paired nodes; default-deny per-node path policy under `plugins.entries.file-transfer.config.nodes` with operator approval, symlink traversal refused by default (opt-in `followSymlinks`), and a 16 MB byte ceiling per round-trip. (#74742) Thanks @omarshahine.
- Google Meet/Voice Call: make Twilio dial-in joins speak through the realtime Gemini voice bridge with paced audio streaming, backpressure-aware buffering, barge-in queue clearing, and no TwiML fallback during realtime speech, giving Meet participants a much snappier OpenClaw voice agent. (#77064) Thanks @scoootscooob.

### 变更

- Models/auth: add `openclaw models auth list [--provider <id>] [--json]` so users can inspect saved per-agent auth profiles without dumping secrets or hitting the old "too many arguments" path. Thanks @vincentkoc.
- Control UI/header: show the active agent name in dashboard breadcrumbs without adding the current session key, keeping non-chat views oriented without crowding the topbar.
- Control UI/cron: make the New Job sidebar collapsible so the jobs list can reclaim space while keeping the form one click away. Thanks @BunsDev.
- Gateway/startup: keep model-catalog test helpers, run-session lookup code, QR pairing helpers, and TypeBox memory-tool schema construction out of hot startup import paths, reducing default gateway benchmark plugin-load and memory pressure.
- Control UI/performance: record browser long animation frame or long task entries in the debug event log when supported, making slow dashboard renders easier to attribute from the UI.
- Channels/streaming: add unified `streaming.mode: "progress"` drafts with auto single-word status labels and shared progress configuration across Discord, Telegram, Matrix, Slack, and Microsoft Teams.
- Slack/streaming: add `streaming.progress.render: "rich"` for Block Kit progress drafts backed by structured progress line data.
- Slack/streaming: keep the newest rich progress lines when Block Kit limits trim long progress drafts. Thanks @vincentkoc.
- Channels/streaming: cap progress-draft tool lines by default so edited progress boxes avoid jumpy reflow from long wrapped lines.
- Agents/verbose: use compact explain-mode tool summaries for `/verbose` and progress drafts by default, with `agents.defaults.toolProgressDetail: "raw"` and per-agent overrides for debugging raw command/detail output.
- Agents/commands: add `/steer <message>` for queue-independent steering of the active current-session run without starting a new turn when the session is idle. (#76934)
- Control UI/chat: add an agent-first filter to the chat session picker, keep chat controls/composer responsive across phone/tablet/desktop widths, keep desktop chat controls on one row, avoid duplicate avatar refreshes during initial chat load, and hide that row while scrolling down the transcript. Thanks @BunsDev.
- Control UI/chat: collapse consecutive duplicate text messages into one bubble with a count so no-op heartbeat acknowledgements stay compact without hiding nearby context.
- Agents/subagents: preserve every grouped child result when direct completion fallback has to bypass the requester-agent announce turn. Thanks @vincentkoc.
- TTS/telephony: honor provider voice/model overrides in telephony synthesis providers so Google Meet agent speech logs match the backend that actually produced the audio. Thanks @vincentkoc.
- Voice Call/realtime: bound the paced Twilio audio queue and close overloaded realtime streams before provider audio can pile up behind the websocket backpressure guard. Thanks @vincentkoc.
- Tools/BTW: add `/side` as a text and native slash-command alias for `/btw` side questions.
- Doctor/config: `doctor --fix` now commits safe legacy migrations even when unrelated validation issues (e.g. a missing plugin) prevent full validation from passing, so `agents.defaults.llm` and other known-legacy keys are always cleaned up by `doctor --fix` regardless of other config problems. Fixes #76798. (#76800) Thanks @hclsys.

### 修复

- Gateway/status: label Linux managed gateway services as `systemd user`, making status output explicit about the user-service scope instead of implying a system-level unit. Thanks @vincentkoc.
- Plugins/install: remove the previous managed plugin directory when a reinstall switches sources, so stale ClawHub and npm copies no longer keep duplicate plugin ids in discovery after the new install wins. Thanks @vincentkoc.
