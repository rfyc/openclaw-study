---
summary: "修复 Linux 上 OpenClaw 浏览器控制的 Chrome/Brave/Edge/Chromium CDP 启动问题"
read_when: "浏览器控制在 Linux 上失败，尤其是使用 snap Chromium 时"
title: "浏览器故障排除"
---

## 问题：「Failed to start Chrome CDP on port 18800」

OpenClaw 的浏览器控制服务器无法启动 Chrome/Brave/Edge/Chromium，出现如下错误：

```
{"error":"Error: Failed to start Chrome CDP on port 18800 for profile \"openclaw\"."}
```

### 根本原因

在 Ubuntu（以及许多 Linux 发行版）上，默认的 Chromium 安装是 **snap 包**。Snap 的 AppArmor 限制会干扰 OpenClaw 生成和监控浏览器进程的方式。

`apt install chromium` 命令安装的是一个重定向到 snap 的存根包：

```
Note, selecting 'chromium-browser' instead of 'chromium'
chromium-browser is already the newest version (2:1snap1-0ubuntu2).
```

这**不是**真正的浏览器——它只是一个包装器。

其他常见的 Linux 启动失败：

- `The profile appears to be in use by another Chromium process` 意味着 Chrome 在托管配置文件目录中发现了过期的 `Singleton*` 锁文件。当锁文件指向已停止或不同主机的进程时，OpenClaw 会移除这些锁并重试一次。
- `Missing X server or $DISPLAY` 意味着在没有桌面会话的主机上明确请求了可见浏览器。默认情况下，当 `DISPLAY` 和 `WAYLAND_DISPLAY` 均未设置时，本地托管配置文件现在会在 Linux 上自动回退到无头模式。如果您设置了 `OPENCLAW_BROWSER_HEADLESS=0`、`browser.headless: false` 或 `browser.profiles.<name>.headless: false`，请移除该有头覆盖，设置 `OPENCLAW_BROWSER_HEADLESS=1`，启动 `Xvfb`，运行 `openclaw browser start --headless` 进行一次性托管启动，或在真实的桌面会话中运行 OpenClaw。

### 解决方案 1：安装 Google Chrome（推荐）

安装官方 Google Chrome `.deb` 包，它不受 snap 沙箱限制：

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y  # 如果有依赖错误
```

然后更新您的 OpenClaw 配置（`~/.openclaw/openclaw.json`）：

```json
{
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/google-chrome-stable",
    "headless": true,
    "noSandbox": true
  }
}
```

### 解决方案 2：使用仅附加模式的 Snap Chromium

如果您必须使用 snap Chromium，请将 OpenClaw 配置为附加到手动启动的浏览器：

1. 更新配置：

```json
{
  "browser": {
    "enabled": true,
    "attachOnly": true,
    "headless": true,
    "noSandbox": true
  }
}
```

2. 手动启动 Chromium：

```bash
chromium-browser --headless --no-sandbox --disable-gpu \
  --remote-debugging-port=18800 \
  --user-data-dir=$HOME/.openclaw/browser/openclaw/user-data \
  about:blank &
```

3. 可选创建 systemd 用户服务以自动启动 Chrome：

```ini
# ~/.config/systemd/user/openclaw-browser.service
[Unit]
Description=OpenClaw Browser (Chrome CDP)
After=network.target

[Service]
ExecStart=/snap/bin/chromium --headless --no-sandbox --disable-gpu --remote-debugging-port=18800 --user-data-dir=%h/.openclaw/browser/openclaw/user-data about:blank
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

使用以下命令启用：`systemctl --user enable --now openclaw-browser.service`

### 验证浏览器工作正常

检查状态：

```bash
curl -s http://127.0.0.1:18791/ | jq '{running, pid, chosenBrowser}'
```

测试浏览：

```bash
curl -s -X POST http://127.0.0.1:18791/start
curl -s http://127.0.0.1:18791/tabs
```

### 配置参考

| 选项                             | 描述                                                               | 默认值                                           |
| -------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| `browser.enabled`                | 启用浏览器控制                                                     | `true`                                           |
| `browser.executablePath`         | 基于 Chromium 的浏览器二进制文件路径（Chrome/Brave/Edge/Chromium） | 自动检测（当系统默认浏览器基于 Chromium 时优先） |
| `browser.headless`               | 无 GUI 运行                                                        | `false`                                          |
| `OPENCLAW_BROWSER_HEADLESS`      | 本地托管浏览器无头模式的每进程覆盖                                 | 未设置                                           |
| `browser.noSandbox`              | 添加 `--no-sandbox` 标志（某些 Linux 设置需要）                    | `false`                                          |
| `browser.attachOnly`             | 不启动浏览器，只附加到现有浏览器                                   | `false`                                          |
| `browser.cdpPort`                | Chrome DevTools Protocol 端口                                      | `18800`                                          |
| `browser.localLaunchTimeoutMs`   | 本地托管 Chrome 发现超时                                           | `15000`                                          |
| `browser.localCdpReadyTimeoutMs` | 本地托管启动后 CDP 就绪超时                                        | `8000`                                           |

在 Raspberry Pi、较旧的 VPS 主机或慢速存储上，当 Chrome 需要更多时间暴露其 CDP HTTP 端点时，请增大 `browser.localLaunchTimeoutMs`。当启动成功但 `openclaw browser start` 仍报告 `not reachable after start` 时，请增大 `browser.localCdpReadyTimeoutMs`。值必须是不超过 `120000` ms 的正整数；无效的配置值会被拒绝。

### 问题：「No Chrome tabs found for profile="user"」

您正在使用 `existing-session` / Chrome MCP 配置文件。OpenClaw 可以看到本地 Chrome，但没有可附加的已打开标签页。

修复选项：

1. **使用托管浏览器：** `openclaw browser start --browser-profile openclaw`（或设置 `browser.defaultProfile: "openclaw"`）。
2. **使用 Chrome MCP：** 确保本地 Chrome 运行时至少有一个已打开的标签页，然后使用 `--browser-profile user` 重试。

注意：

- `user` 仅限主机。对于 Linux 服务器、容器或远程主机，请优先使用 CDP 配置文件。
- `user` / 其他 `existing-session` 配置文件保持当前 Chrome MCP 的限制：基于引用的操作、一次文件上传钩子、无对话框超时覆盖、无 `wait --load networkidle`，以及无 `responsebody`、PDF 导出、下载拦截或批量操作。
- 本地 `openclaw` 配置文件自动分配 `cdpPort`/`cdpUrl`；仅为远程 CDP 设置这些。
- 远程 CDP 配置文件接受 `http://`、`https://`、`ws://` 和 `wss://`。对于 `/json/version` 发现使用 HTTP(S)，或者当您的浏览器服务提供直接 DevTools socket URL 时使用 WS(S)。

## 相关

- [浏览器](/tools/browser)
- [浏览器登录](/tools/browser-login)
- [浏览器 WSL2 故障排除](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
