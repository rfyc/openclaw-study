---
name: apple-reminders
description: 通过 remindctl 列出、添加、编辑、完成或删除 Apple 提醒事项和提醒列表。
homepage: https://github.com/steipete/remindctl
metadata:
  {
    "openclaw":
      {
        "emoji": "⏰",
        "os": ["darwin"],
        "requires": { "bins": ["remindctl"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "steipete/tap/remindctl",
              "bins": ["remindctl"],
              "label": "Install remindctl via Homebrew",
            },
          ],
      },
  }
---

# Apple 提醒事项 CLI（remindctl）

使用 `remindctl` 直接从终端管理 Apple 提醒事项。

## 适用场景

✅ **以下情况请使用此技能：**

- 用户明确提到"提醒"或"提醒事项应用"
- 创建带截止日期且同步到 iOS 的个人待办事项
- 管理 Apple 提醒事项列表
- 用户希望任务出现在 iPhone/iPad 提醒事项应用中

## 不适用场景

❌ **以下情况请勿使用此技能：**

- 调度 OpenClaw 任务或提醒 → 使用带 systemEvent 的 `cron` 工具
- 日历事件或约会 → 使用 Apple 日历
- 项目/工作任务管理 → 使用 Notion、GitHub Issues 或任务队列
- 一次性通知 → 使用 `cron` 工具处理定时提醒
- 用户说"提醒我"但意指 OpenClaw 提醒 → 先澄清

## 设置

- 安装：`brew install steipete/tap/remindctl`
- 仅限 macOS；提示时授予提醒事项访问权限
- 检查状态：`remindctl status`
- 请求访问权限：`remindctl authorize`

## 常用命令

### 查看提醒事项

```bash
remindctl                    # 今天的提醒
remindctl today              # 今天
remindctl tomorrow           # 明天
remindctl week               # 本周
remindctl overdue            # 已逾期
remindctl all                # 全部
remindctl 2026-01-04         # 特定日期
```

### 管理列表

```bash
remindctl list               # 列出所有列表
remindctl list Work          # 显示特定列表
remindctl list Projects --create    # 创建列表
remindctl list Work --delete        # 删除列表
```

### 创建提醒事项

```bash
remindctl add "买牛奶"
remindctl add --title "给妈妈打电话" --list Personal --due tomorrow
remindctl add --title "准备会议" --due "2026-02-15 09:00"
```

### 完成/删除

```bash
remindctl complete 1 2 3     # 按 ID 标记完成
remindctl delete 4A83 --force  # 按 ID 删除
```

### 输出格式

```bash
remindctl today --json       # 用于脚本的 JSON 格式
remindctl today --plain      # TSV 格式
remindctl today --quiet      # 仅显示数量
```

## 日期格式

`--due` 和日期筛选器接受以下格式：

- `today`、`tomorrow`、`yesterday`
- `YYYY-MM-DD`
- `YYYY-MM-DD HH:mm`
- ISO 8601（`2026-01-04T12:34:56Z`）

## 示例：澄清用户意图

用户："提醒我 2 小时后检查部署情况"

**询问：**"你希望这条提醒出现在 Apple 提醒事项中（同步到手机）还是作为 OpenClaw 提醒（我在这里给你发消息）？"

- Apple 提醒事项 → 使用此技能
- OpenClaw 提醒 → 使用带 systemEvent 的 `cron` 工具
