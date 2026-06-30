---
summary: "`openclaw directory` 的 CLI 参考（自我、同伴、群组）"
read_when:
  - 你想查找某个频道的联系人/群组/自身 ID
  - 你正在开发频道目录适配器
title: "Directory"
---

# `openclaw directory`

支持该功能的频道的目录查找（联系人/同伴、群组和"我"）。

## 常用标志

- `--channel <name>`：频道 ID/别名（配置了多个频道时必填；只配置了一个时自动推断）
- `--account <id>`：账户 ID（默认：频道默认值）
- `--json`：输出 JSON

## 备注

- `directory` 旨在帮助你找到可以粘贴到其他命令中的 ID（特别是 `openclaw message send --target ...`）。
- 对于许多频道，结果基于配置（允许列表/已配置的群组），而不是实时提供商目录。
- 已安装的频道插件仍然可能省略目录支持；在这种情况下，命令会报告不支持的目录操作，而不是重新安装插件。
- 默认输出是由制表符分隔的 `id`（有时还有 `name`）；使用 `--json` 用于脚本编写。

## 将结果与 `message send` 一起使用

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## ID 格式（按频道）

- WhatsApp：`+15551234567`（DM）、`1234567890-1234567890@g.us`（群组）、`120363123456789@newsletter`（频道/新闻稿出站目标）
- Telegram：`@username` 或数字聊天 ID；群组是数字 ID
- Slack：`user:U…` 和 `channel:C…`
- Discord：`user:<id>` 和 `channel:<id>`
- Matrix（插件）：`user:@user:server`、`room:!roomId:server` 或 `#alias:server`
- Microsoft Teams（插件）：`user:<id>` 和 `conversation:<id>`
- Zalo（插件）：用户 ID（Bot API）
- Zalo Personal / `zalouser`（插件）：来自 `zca` 的线程 ID（DM/群组）（`me`、`friend list`、`group list`）

## 自我（"me"）

```bash
openclaw directory self --channel zalouser
```

## 同伴（联系人/用户）

```bash
openclaw directory peers list --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory peers list --channel zalouser --limit 50
```

## 群组

```bash
openclaw directory groups list --channel zalouser
openclaw directory groups list --channel zalouser --query "work"
openclaw directory groups members --channel zalouser --group-id <id>
```

## 相关

- [CLI 参考](/cli)
