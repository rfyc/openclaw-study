---
name: wacli
description: 通过 wacli 发送第三方 WhatsApp 消息或同步/搜索 WhatsApp 历史记录，不用于普通的活跃聊天。
homepage: https://wacli.sh
metadata:
  {
    "openclaw":
      {
        "emoji": "📱",
        "requires": { "bins": ["wacli"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "steipete/tap/wacli",
              "bins": ["wacli"],
              "label": "Install wacli (brew)",
            },
            {
              "id": "go",
              "kind": "go",
              "module": "github.com/steipete/wacli/cmd/wacli@latest",
              "bins": ["wacli"],
              "label": "Install wacli (go)",
            },
          ],
      },
  }
---

# wacli

仅在用户明确要求通过 WhatsApp 联系他人，或请求同步/搜索 WhatsApp 历史记录时，才使用 `wacli`。
不要将 `wacli` 用于普通用户聊天；OpenClaw 会自动路由 WhatsApp 对话。
如果用户在 WhatsApp 上与你聊天，除非他们要求你联系第三方，否则不应使用此工具。

安全须知

- 需要明确的收件人 + 消息内容。
- 发送前确认收件人 + 消息内容。
- 如有任何不明确之处，请提问澄清。

认证 + 同步

- `wacli auth`（二维码登录 + 初始同步）
- `wacli sync --follow`（持续同步）
- `wacli doctor`

查找聊天 + 消息

- `wacli chats list --limit 20 --query "name or number"`
- `wacli messages search "query" --limit 20 --chat <jid>`
- `wacli messages search "invoice" --after 2025-01-01 --before 2025-12-31`

历史记录补充

- `wacli history backfill --chat <jid> --requests 2 --count 50`

发送

- 文本：`wacli send text --to "+14155551212" --message "Hello! Are you free at 3pm?"`
- 群组：`wacli send text --to "1234567890-123456789@g.us" --message "Running 5 min late."`
- 文件：`wacli send file --to "+14155551212" --file /path/agenda.pdf --caption "Agenda"`

说明

- 存储目录：`~/.wacli`（使用 `--store` 可覆盖）。
- 解析时使用 `--json` 获取机器可读输出。
- 历史补充需要手机在线；结果为尽力而为。
- WhatsApp CLI 不用于常规用户聊天；它用于联系其他人。
- JID 格式：直接聊天形如 `<number>@s.whatsapp.net`；群组形如 `<id>@g.us`（使用 `wacli chats list` 查找）。
