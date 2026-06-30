---
summary: "浏览器自动化的手动登录 + X/Twitter 发帖"
read_when:
  - 您需要登录网站进行浏览器自动化
  - 您想在 X/Twitter 上发布更新
title: "浏览器登录"
---

# 浏览器登录 + X/Twitter 发帖

## 手动登录（推荐）

当网站需要登录时，请在**主机**浏览器配置文件（OpenClaw 浏览器）中**手动登录**。

**不要**将您的凭据提供给模型。自动登录通常会触发防机器人防御并可能锁定账户。

返回主要浏览器文档：[浏览器](/tools/browser)。

## 使用哪个 Chrome 配置文件？

OpenClaw 控制一个**专用的 Chrome 配置文件**（命名为 `openclaw`，橙色调 UI）。这与您的日常浏览器配置文件是分开的。

对于代理浏览器工具调用：

- 默认选择：代理应使用其隔离的 `openclaw` 浏览器。
- 仅当现有的已登录会话很重要，且用户在电脑旁可以点击/批准任何附加提示时，才使用 `profile="user"`。
- 如果您有多个用户浏览器配置文件，请明确指定配置文件，而不是猜测。

访问它的两种简便方法：

1. **让代理打开浏览器**，然后自己登录。
2. **通过 CLI 打开**：

```bash
openclaw browser start
openclaw browser open https://x.com
```

如果您有多个配置文件，请传递 `--browser-profile <name>`（默认为 `openclaw`）。

## X/Twitter：推荐流程

- **阅读/搜索/线程：** 使用**主机**浏览器（手动登录）。
- **发布更新：** 使用**主机**浏览器（手动登录）。

## 沙箱 + 主机浏览器访问

沙箱浏览器会话**更可能**触发机器人检测。对于 X/Twitter（以及其他严格的网站），请优先使用**主机**浏览器。

如果代理被沙箱隔离，浏览器工具默认使用沙箱。要允许主机控制：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        browser: {
          allowHostControl: true,
        },
      },
    },
  },
}
```

然后定位主机浏览器：

```bash
openclaw browser open https://x.com --browser-profile openclaw --target host
```

或者为发布更新的代理禁用沙箱。

## 相关

- [浏览器](/tools/browser)
- [浏览器 Linux 故障排除](/tools/browser-linux-troubleshooting)
- [浏览器 WSL2 故障排除](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
