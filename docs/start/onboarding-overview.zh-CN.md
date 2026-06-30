---
summary: "OpenClaw 入门选项和流程概述"
read_when:
  - 选择入门路径
  - 设置新环境
title: "入门概述"
sidebarTitle: "入门概述"
---

OpenClaw 有两种入门路径。两者都配置认证、Gateway 和可选的聊天渠道——只是交互方式不同。

## 我应该使用哪条路径？

|            | CLI 入门                             | macOS 应用入门       |
| ---------- | ------------------------------------ | -------------------- |
| **平台**   | macOS、Linux、Windows（原生或 WSL2） | 仅 macOS             |
| **界面**   | 终端向导                             | 应用内引导 UI        |
| **最适合** | 服务器、无头模式、完全控制           | Mac 桌面、可视化设置 |
| **自动化** | `--non-interactive` 用于脚本         | 仅手动               |
| **命令**   | `openclaw onboard`                   | 启动应用             |

大多数用户应从 **CLI 入门**开始——它在任何地方都适用，并且给您最多控制权。

## 入门配置的内容

无论您选择哪条路径，入门都会设置：

1. **模型提供商和认证** — 您选择的提供商的 API 密钥、OAuth 或设置令牌
2. **工作区** — 智能体文件、引导模板和记忆的目录
3. **Gateway** — 端口、绑定地址、认证模式
4. **渠道**（可选）— 内置和捆绑的聊天渠道，如 BlueBubbles、Discord、Feishu、Google Chat、Mattermost、Microsoft Teams、Telegram、WhatsApp 等
5. **守护进程**（可选）— 后台服务，使 Gateway 自动启动

## CLI 入门

在任何终端中运行：

```bash
openclaw onboard
```

添加 `--install-daemon` 可一步安装后台服务。

完整参考：[入门（CLI）](/start/wizard)
CLI 命令文档：[`openclaw onboard`](/cli/onboard)

## macOS 应用入门

打开 OpenClaw 应用。首次运行向导将以可视界面引导您完成相同的步骤。

完整参考：[入门（macOS 应用）](/start/onboarding)

## 自定义或未列出的提供商

如果您的提供商未在入门中列出，请选择**自定义提供商**并输入：

- API 兼容模式（OpenAI 兼容、Anthropic 兼容或自动检测）
- 基础 URL 和 API 密钥
- 模型 ID 和可选别名

多个自定义端点可以共存——每个端点都有自己的端点 ID。

## 相关

- [入门](/start/getting-started)
- [CLI 设置参考](/start/wizard-cli-reference)
