---
name: openclaw-parallels-smoke
description: Parallels 安装/冒烟测试，适用于 macOS/Windows/Linux 访客操作系统（需要访问 Parallels 机器）。处理 macOS、Windows 和 Linux 访客的安装、配置和 OpenClaw 端到端测试。
user-invocable: false
---

# OpenClaw Parallels 冒烟测试技能

在 Parallels 虚拟机（macOS/Windows/Linux）上运行 OpenClaw 安装和冒烟测试。

## 前置条件

- 需要访问配置了 Parallels 的维护者机器
- 需要已配置的 Parallels 虚拟机（macOS、Windows、Linux）
- 需要在宿主机上安装 `prlctl` CLI

## 虚拟机管理

### 列出可用虚拟机

```bash
prlctl list -a
```

### 启动/停止虚拟机

```bash
prlctl start "<VM名称>"
prlctl stop "<VM名称>"
prlctl suspend "<VM名称>"
```

### 在虚拟机中执行命令

```bash
prlctl exec "<VM名称>" <命令>
```

## 测试矩阵

### macOS 访客

测试 macOS 上的 `.dmg` 安装包：

```bash
# 在 macOS 访客中安装
prlctl exec "macOS-Guest" open /path/to/OpenClaw.dmg

# 验证安装
prlctl exec "macOS-Guest" /Applications/OpenClaw.app/Contents/MacOS/openclaw --version

# 运行冒烟测试
prlctl exec "macOS-Guest" /Applications/OpenClaw.app/Contents/MacOS/openclaw health
```

### Windows 访客

测试 Windows 上的 `.exe` 安装包：

```bash
# 在 Windows 访客中安装
prlctl exec "Windows-Guest" powershell -Command "Start-Process 'C:\\path\\to\\OpenClaw-Setup.exe' -ArgumentList '/S' -Wait"

# 验证安装
prlctl exec "Windows-Guest" "C:\\Program Files\\OpenClaw\\openclaw.exe" --version

# 运行冒烟测试
prlctl exec "Windows-Guest" "C:\\Program Files\\OpenClaw\\openclaw.exe" health
```

### Linux 访客

测试 Linux 上的安装（`.deb`/`.rpm`/tar.gz）：

```bash
# 在 Linux 访客中安装（Debian/Ubuntu）
prlctl exec "Ubuntu-Guest" sudo dpkg -i /path/to/openclaw.deb

# 验证安装
prlctl exec "Ubuntu-Guest" openclaw --version

# 运行冒烟测试
prlctl exec "Ubuntu-Guest" openclaw health
```

## 冒烟测试清单

每个平台的测试必须涵盖：

- [ ] 安装无错误完成
- [ ] `openclaw --version` 返回正确版本
- [ ] `openclaw health` 返回 `ok`
- [ ] Gateway 成功启动
- [ ] 基本的 AI 提示响应正常

## Discord 往返测试

对于完整的 Discord 往返测试：

```bash
# 参考 parallels-discord-roundtrip 技能
# 该测试验证：消息发送 → Discord → OpenClaw 处理 → 响应返回
```

## 报告格式

```
## Parallels 冒烟测试报告
日期：<ISO 8601>
版本：<OpenClaw 版本>
提交 SHA：<SHA>

### 测试结果
| 平台 | 操作系统版本 | 状态 | 备注 |
|------|-------------|------|------|
| macOS | 14.x | ✅ 通过 | |
| Windows | 11 | ✅ 通过 | |
| Ubuntu | 22.04 LTS | ✅ 通过 | |

### 问题
[如有，在此列出问题]
```

## 失败处理

- 记录失败截图或日志
- 检查虚拟机是否需要更新
- 向 Peter 报告跨平台兼容性问题
- 对于阻塞性问题，在发布前暂停

## 注意事项

- 测试前确保访客虚拟机已是最新状态
- 在真实设备上测试 iOS/Android（不用模拟器）
- 对于 macOS 测试，签名行为与生产环境不同——使用生产签名的构建版本
