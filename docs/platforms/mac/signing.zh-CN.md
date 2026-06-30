---
summary: "打包脚本生成的 macOS 调试构建的签名步骤"
read_when:
  - 构建或签名 Mac 调试构建
title: "macOS 签名"
---

# Mac 签名（调试构建）

此应用通常从 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 构建，该脚本现在：

- 设置稳定的调试捆绑包标识符：`ai.openclaw.mac.debug`
- 用该捆绑包 ID 写入 Info.plist（通过 `BUNDLE_ID=...` 覆盖）
- 调用 [`scripts/codesign-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/codesign-mac-app.sh) 对主二进制文件和应用包进行签名，使 macOS 将每次重建视为相同的签名包，并保持 TCC 权限（通知、辅助功能、屏幕录制、麦克风、语音）。对于稳定的权限，使用真实的签名身份；临时签名是可选的且不稳定（参见 [macOS 权限](/platforms/mac/permissions)）。
- 默认使用 `CODESIGN_TIMESTAMP=auto`；它为 Developer ID 签名启用可信时间戳。设置 `CODESIGN_TIMESTAMP=off` 跳过时间戳（离线调试构建）。
- 将构建元数据注入 Info.plist：`OpenClawBuildTimestamp`（UTC）和 `OpenClawGitCommit`（短哈希），以便"关于"面板可以显示构建、git 和调试/发布频道。
- **打包默认使用 Node 24**：脚本运行 TS 构建和控制 UI 构建。Node 22 LTS，当前 `22.14+`，仍支持兼容性。
- 从环境读取 `SIGN_IDENTITY`。将 `export SIGN_IDENTITY="Apple Development: Your Name (TEAMID)"`（或你的 Developer ID Application 证书）添加到你的 shell rc 以始终用你的证书签名。临时签名需要通过 `ALLOW_ADHOC_SIGNING=1` 或 `SIGN_IDENTITY="-"` 显式选择加入（不推荐用于权限测试）。
- 签名后运行 Team ID 审计，如果应用包内的任何 Mach-O 由不同的 Team ID 签名则失败。设置 `SKIP_TEAM_ID_CHECK=1` 绕过。

## 用法

```bash
# 从仓库根目录
scripts/package-mac-app.sh               # 自动选择身份；如果没有找到则报错
SIGN_IDENTITY="Developer ID Application: Your Name" scripts/package-mac-app.sh   # 真实证书
ALLOW_ADHOC_SIGNING=1 scripts/package-mac-app.sh    # 临时（权限不会保留）
SIGN_IDENTITY="-" scripts/package-mac-app.sh        # 显式临时（同样注意事项）
DISABLE_LIBRARY_VALIDATION=1 scripts/package-mac-app.sh   # 仅开发者 Sparkle Team ID 不匹配解决方案
```

### 临时签名说明

使用 `SIGN_IDENTITY="-"`（临时）签名时，脚本自动禁用**强化运行时**（`--options runtime`）。这是为了防止应用尝试加载没有相同 Team ID 的嵌入式框架（如 Sparkle）时崩溃。临时签名还会破坏 TCC 权限持久性；恢复步骤请参见 [macOS 权限](/platforms/mac/permissions)。

## 关于页面的构建元数据

`package-mac-app.sh` 用以下内容标记包：

- `OpenClawBuildTimestamp`：打包时的 ISO8601 UTC
- `OpenClawGitCommit`：短 git 哈希（或 `unknown`，如果不可用）

"关于"标签页读取这些键以显示版本、构建日期、git 提交以及是否是调试构建（通过 `#if DEBUG`）。更改代码后运行打包器以刷新这些值。

## 原因

TCC 权限与捆绑包标识符*和*代码签名绑定。具有变化 UUID 的未签名调试构建导致 macOS 在每次重建后忘记授权。签名二进制文件（默认临时签名）并保持固定的捆绑包 ID/路径（`dist/OpenClaw.app`）可在构建之间保留授权，与 VibeTunnel 方法一致。

## 相关

- [macOS 应用](/platforms/macos)
- [macOS 权限](/platforms/mac/permissions)
