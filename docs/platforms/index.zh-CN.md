---
summary: "平台支持概览（Gateway + 伴侣应用）"
read_when:
  - 查找操作系统支持或安装路径
  - 决定在哪里运行 Gateway
title: "平台"
---

OpenClaw 核心使用 TypeScript 编写。**Node 是推荐的运行时**。
Bun 不推荐用于 Gateway——已知的 WhatsApp 和
Telegram 频道问题；详情请参见 [Bun（实验性）](/install/bun)。

macOS（菜单栏应用）和移动节点（iOS/Android）有伴侣应用。Windows 和
Linux 伴侣应用在计划中，但今天 Gateway 已完全支持。
Windows 的原生伴侣应用也在计划中；推荐通过 WSL2 使用 Gateway。

## 选择你的操作系统

- macOS：[macOS](/platforms/macos)
- iOS：[iOS](/platforms/ios)
- Android：[Android](/platforms/android)
- Windows：[Windows](/platforms/windows)
- Linux：[Linux](/platforms/linux)

## VPS 与托管

- VPS 中心：[VPS 托管](/vps)
- Fly.io：[Fly.io](/install/fly)
- Hetzner（Docker）：[Hetzner](/install/hetzner)
- GCP（Compute Engine）：[GCP](/install/gcp)
- Azure（Linux VM）：[Azure](/install/azure)
- exe.dev（VM + HTTPS 代理）：[exe.dev](/install/exe-dev)

## 常用链接

- 安装指南：[入门指南](/start/getting-started)
- Gateway 运行手册：[Gateway](/gateway)
- Gateway 配置：[配置](/gateway/configuration)
- 服务状态：`openclaw gateway status`

## Gateway 服务安装（CLI）

使用以下任意一种（均支持）：

- 向导（推荐）：`openclaw onboard --install-daemon`
- 直接安装：`openclaw gateway install`
- 配置流程：`openclaw configure` → 选择 **Gateway 服务**
- 修复/迁移：`openclaw doctor`（提供安装或修复服务的选项）

服务目标取决于操作系统：

- macOS：LaunchAgent（`ai.openclaw.gateway` 或 `ai.openclaw.<profile>`；旧版 `com.openclaw.*`）
- Linux/WSL2：systemd 用户服务（`openclaw-gateway[-<profile>].service`）
- 原生 Windows：计划任务（`OpenClaw Gateway` 或 `OpenClaw Gateway (<profile>)`），如果任务创建被拒绝则回退到每用户启动文件夹登录项

## 相关

- [安装概览](/install)
- [macOS 应用](/platforms/macos)
- [iOS 应用](/platforms/ios)
