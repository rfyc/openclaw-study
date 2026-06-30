---
summary: "macOS 权限持久性（TCC）和签名要求"
read_when:
  - 调试缺失或卡住的 macOS 权限提示
  - 打包或签名 macOS 应用
  - 更改捆绑包 ID 或应用安装路径
title: "macOS 权限"
---

macOS 权限授予很脆弱。TCC 将权限授予与应用的代码签名、捆绑包标识符和磁盘路径关联。如果其中任何一个发生变化，macOS 会将应用视为新的，并可能丢弃或隐藏提示。

## 稳定权限的要求

- 相同路径：从固定位置运行应用（对于 OpenClaw，为 `dist/OpenClaw.app`）。
- 相同捆绑包标识符：更改捆绑包 ID 会创建新的权限身份。
- 已签名应用：未签名或临时签名的构建不会持久化权限。
- 一致签名：使用真实的 Apple Development 或 Developer ID 证书
  以便签名在重建之间保持稳定。

临时签名每次构建生成新的身份。macOS 会忘记之前的
授予，提示可能在清除过期条目之前完全消失。

## 提示消失时的恢复清单

1. 退出应用。
2. 在系统设置 -> 隐私与安全中删除应用条目。
3. 从同一路径重新启动应用并重新授予权限。
4. 如果提示仍然不出现，使用 `tccutil` 重置 TCC 条目并重试。
5. 某些权限只有在完全重启 macOS 后才会重新出现。

示例重置（根据需要替换捆绑包 ID）：

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## 文件和文件夹权限（桌面/文稿/下载）

macOS 还可能对终端/后台进程的桌面、文稿和下载目录进行门控。如果文件读取或目录列表挂起，请向执行文件操作的同一进程上下文授予访问权限（例如终端/iTerm、LaunchAgent 启动的应用或 SSH 进程）。

解决方法：如果想避免每个文件夹的授权，将文件移到 OpenClaw 工作区（`~/.openclaw/workspace`）。

如果你正在测试权限，始终使用真实证书签名。临时
构建只适用于权限不重要的快速本地运行。

## 相关

- [macOS 应用](/platforms/macos)
- [macOS 签名](/platforms/mac/signing)
