---
name: imsg
description: iMessage/SMS CLI，通过 Messages.app 列出聊天、查看历史记录和发送消息。
homepage: https://imsg.to
metadata:
  {
    "openclaw":
      {
        "emoji": "📨",
        "os": ["darwin"],
        "requires": { "bins": ["imsg"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "steipete/tap/imsg",
              "bins": ["imsg"],
              "label": "Install imsg (brew)",
            },
          ],
      },
  }
---

# imsg

使用 `imsg` 通过 macOS Messages.app 读取和发送 iMessage/SMS。

## 适用场景

适合使用本技能的情况：

- 用户明确要求发送 iMessage 或 SMS
- 读取 iMessage 对话历史
- 查看 Messages.app 最近的聊天
- 发送到电话号码或 Apple ID

## 不适用场景

不适合使用本技能的情况：

- Telegram 消息 → 使用 `message` 工具并设置 `channel:telegram`
- Signal 消息 → 使用已配置的 Signal 频道
- WhatsApp 消息 → 使用已配置的 WhatsApp 频道
- Discord 消息 → 使用 `message` 工具并设置 `channel:discord`
- Slack 消息 → 使用 `slack` 技能
- 群组聊天管理（添加/移除成员）→ 不支持
- 批量消息 → 始终先与用户确认
- 在当前对话中回复 → 直接回复即可（OpenClaw 自动路由）

## 要求

- 已登录 Messages.app 的 macOS
- 终端具有完全磁盘访问权限
- Messages.app 的自动化权限（用于发送）

## 常用命令

### 列出聊天

```bash
imsg chats --limit 10 --json
```

### 查看历史记录

```bash
# 按聊天 ID
imsg history --chat-id 1 --limit 20 --json

# 包含附件信息
imsg history --chat-id 1 --limit 20 --attachments --json
```

### 监听新消息

```bash
imsg watch --chat-id 1 --attachments
```

### 发送消息

```bash
# 仅文本
imsg send --to "+14155551212" --text "Hello!"

# 带附件
imsg send --to "+14155551212" --text "Check this out" --file /path/to/image.jpg

# 指定服务
imsg send --to "+14155551212" --text "Hi" --service imessage
imsg send --to "+14155551212" --text "Hi" --service sms
```

## 服务选项

- `--service imessage` — 强制使用 iMessage（需要收件人有 iMessage）
- `--service sms` — 强制使用 SMS（绿色气泡）
- `--service auto` — 让 Messages.app 决定（默认）

## 安全规则

1. **始终在发送前确认收件人和消息内容**
2. **未经用户明确批准，不向未知号码发送消息**
3. **谨慎处理附件** — 确认文件路径存在
4. **控制发送频率** — 不要滥发

## 示例工作流

用户："发短信给妈妈说我会晚点到"

```bash
# 1. 找到妈妈的聊天
imsg chats --limit 20 --json | jq '.[] | select(.displayName | contains("Mom"))'

# 2. 向用户确认
# "找到 Mom，号码为 +1555123456。通过 iMessage 发送'I'll be late'吗？"

# 3. 确认后发送
imsg send --to "+1555123456" --text "I'll be late"
```
