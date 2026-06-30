---
summary: "OpenClaw 日志：滚动诊断文件日志 + 统一日志隐私标志"
read_when:
  - 捕获 macOS 日志或调查私有数据日志
  - 调试语音唤醒/会话生命周期问题
title: "macOS 日志"
---

# 日志（macOS）

## 滚动诊断文件日志（调试窗格）

OpenClaw 通过 swift-log（默认统一日志）路由 macOS 应用日志，并可以在需要持久捕获时将本地滚动文件日志写入磁盘。

- 详细级别：**调试窗格 → 日志 → 应用日志 → 详细级别**
- 启用：**调试窗格 → 日志 → 应用日志 → "写入滚动诊断日志（JSONL）"**
- 位置：`~/Library/Logs/OpenClaw/diagnostics.jsonl`（自动滚动；旧文件后缀为 `.1`、`.2`、……）
- 清除：**调试窗格 → 日志 → 应用日志 → "清除"**

注意：

- 这**默认关闭**。仅在主动调试时启用。
- 将文件视为敏感内容；未经审查不要分享。

## macOS 上的统一日志私有数据

统一日志会编辑大多数载荷，除非子系统选择 `privacy -off`。根据 Peter 关于 macOS [日志隐私问题](https://steipete.me/posts/2025/logging-privacy-shenanigans)（2025）的文章，这由 `/Library/Preferences/Logging/Subsystems/` 中以子系统名称为键的 plist 控制。只有新的日志条目才会采用该标志，因此在重现问题之前启用它。

## 为 OpenClaw（`ai.openclaw`）启用

- 首先将 plist 写入临时文件，然后以 root 身份原子安装：

```bash
cat <<'EOF' >/tmp/ai.openclaw.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>DEFAULT-OPTIONS</key>
    <dict>
        <key>Enable-Private-Data</key>
        <true/>
    </dict>
</dict>
</plist>
EOF
sudo install -m 644 -o root -g wheel /tmp/ai.openclaw.plist /Library/Preferences/Logging/Subsystems/ai.openclaw.plist
```

- 不需要重启；logd 会快速注意到文件，但只有新的日志行才会包含私有载荷。
- 使用现有辅助工具查看更丰富的输出，例如 `./scripts/clawlog.sh --category WebChat --last 5m`。

## 调试后禁用

- 删除覆盖：`sudo rm /Library/Preferences/Logging/Subsystems/ai.openclaw.plist`。
- 可选运行 `sudo log config --reload` 强制 logd 立即丢弃覆盖。
- 记住此接口可能包含电话号码和消息正文；仅在需要额外详情时保留 plist。

## 相关

- [macOS 应用](/platforms/macos)
- [Gateway 日志](/gateway/logging)
