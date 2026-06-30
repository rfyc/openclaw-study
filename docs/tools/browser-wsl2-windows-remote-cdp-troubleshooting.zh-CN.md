---
summary: "分层排查 WSL2 Gateway + Windows Chrome 远程 CDP 问题"
read_when:
  - 在 WSL2 中运行 OpenClaw Gateway，而 Chrome 在 Windows 上
  - 看到跨 WSL2 和 Windows 的浏览器/控制 UI 错误重叠
  - 在分离主机设置中决定使用主机本地 Chrome MCP 还是原始远程 CDP
title: "WSL2 + Windows + 远程 Chrome CDP 故障排除"
---

在常见的分离主机设置中，OpenClaw Gateway 在 WSL2 内部运行，Chrome 在 Windows 上运行，浏览器控制必须跨越 WSL2 和 Windows 边界。来自 [issue #39369](https://github.com/openclaw/openclaw/issues/39369) 的分层失败模式意味着多个独立问题可能同时出现，这使得错误的层级首先看起来像是故障。

## 首先选择正确的浏览器模式

您有两种有效的模式：

### 选项 1：从 WSL2 到 Windows 的原始远程 CDP

使用从 WSL2 指向 Windows Chrome CDP 端点的远程浏览器配置文件。

选择此方案的条件：

- Gateway 保持在 WSL2 内部
- Chrome 在 Windows 上运行
- 您需要浏览器控制跨越 WSL2/Windows 边界

### 选项 2：主机本地 Chrome MCP

仅当 Gateway 本身与 Chrome 在同一主机上运行时，才使用 `existing-session` / `user`。

选择此方案的条件：

- OpenClaw 和 Chrome 在同一台机器上
- 您想要本地已登录的浏览器状态
- 您不需要跨主机浏览器传输
- 您不需要高级托管/原始 CDP 专用路由，如 `responsebody`、PDF 导出、下载拦截或批量操作

对于 WSL2 Gateway + Windows Chrome，优先使用原始远程 CDP。Chrome MCP 是主机本地的，不是 WSL2 到 Windows 的桥接。

## 工作架构

参考形状：

- WSL2 在 `127.0.0.1:18789` 上运行 Gateway
- Windows 在 `http://127.0.0.1:18789/` 上以普通浏览器打开控制 UI
- Windows Chrome 在端口 `9222` 上暴露 CDP 端点
- WSL2 可以到达该 Windows CDP 端点
- OpenClaw 将浏览器配置文件指向从 WSL2 可到达的地址

## 为什么这个设置会造成混淆

几个失败可能会重叠：

- WSL2 无法到达 Windows CDP 端点
- 控制 UI 从非安全来源打开
- `gateway.controlUi.allowedOrigins` 与页面来源不匹配
- 令牌或配对缺失
- 浏览器配置文件指向错误的地址

因此，修复一层仍然可能留下不同的错误可见。

## 控制 UI 的关键规则

当 UI 从 Windows 打开时，除非您有故意的 HTTPS 设置，否则使用 Windows localhost。

使用：

`http://127.0.0.1:18789/`

不要对控制 UI 默认使用 LAN IP。LAN 或 tailnet 地址上的纯 HTTP 可能触发与 CDP 本身无关的不安全来源/设备认证行为。参见[控制 UI](/web/control-ui)。

## 逐层验证

从上到下工作。不要跳过步骤。

### 第 1 层：验证 Chrome 在 Windows 上提供 CDP

在 Windows 上启用远程调试启动 Chrome：

```powershell
chrome.exe --remote-debugging-port=9222
```

从 Windows 先验证 Chrome 本身：

```powershell
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list
```

如果在 Windows 上失败，则问题还不在 OpenClaw。

### 第 2 层：验证 WSL2 可以到达该 Windows 端点

从 WSL2 测试您计划在 `cdpUrl` 中使用的确切地址：

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

成功结果：

- `/json/version` 返回带有浏览器/协议版本元数据的 JSON
- `/json/list` 返回 JSON（如果没有打开的页面，空数组没问题）

如果失败：

- Windows 尚未向 WSL2 暴露该端口
- WSL2 端的地址错误
- 防火墙/端口转发/本地代理仍然缺失

在修改 OpenClaw 配置之前先解决这个问题。

### 第 3 层：配置正确的浏览器配置文件

对于原始远程 CDP，将 OpenClaw 指向从 WSL2 可到达的地址：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "remote",
    profiles: {
      remote: {
        cdpUrl: "http://WINDOWS_HOST_OR_IP:9222",
        attachOnly: true,
        color: "#00AA00",
      },
    },
  },
}
```

注意：

- 使用 WSL2 可到达的地址，而不是仅在 Windows 上有效的地址
- 对于外部托管的浏览器保持 `attachOnly: true`
- `cdpUrl` 可以是 `http://`、`https://`、`ws://` 或 `wss://`
- 当您希望 OpenClaw 发现 `/json/version` 时使用 HTTP(S)
- 仅当浏览器提供商给您直接 DevTools socket URL 时使用 WS(S)
- 在期望 OpenClaw 成功之前，先用 `curl` 测试相同的 URL

### 第 4 层：单独验证控制 UI 层

从 Windows 打开 UI：

`http://127.0.0.1:18789/`

然后验证：

- 页面来源与 `gateway.controlUi.allowedOrigins` 期望的内容匹配
- 令牌认证或配对已正确配置
- 您没有在将控制 UI 认证问题误诊为浏览器问题

有用的页面：

- [控制 UI](/web/control-ui)

### 第 5 层：验证端到端浏览器控制

从 WSL2：

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

成功结果：

- 标签页在 Windows Chrome 中打开
- `openclaw browser tabs` 返回目标
- 后续操作（`snapshot`、`screenshot`、`navigate`）从同一配置文件工作

## 常见的误导性错误

将每条消息视为特定层的线索：

- `control-ui-insecure-auth`
  - UI 来源/安全上下文问题，不是 CDP 传输问题
- `token_missing`
  - 认证配置问题
- `pairing required`
  - 设备批准问题
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 无法到达配置的 `cdpUrl`
- `Browser attachOnly is enabled and CDP websocket for profile "remote" is not reachable`
  - HTTP 端点已响应，但 DevTools WebSocket 仍然无法打开
- 远程会话后过期的视口/深色模式/区域设置/离线覆盖
  - 运行 `openclaw browser stop --browser-profile remote`
  - 这会关闭活动控制会话并释放 Playwright/CDP 模拟状态，而无需重启 Gateway 或外部浏览器
- `gateway timeout after 1500ms`
  - 通常仍然是 CDP 可达性问题或缓慢/无法到达的远程端点
- `No Chrome tabs found for profile="user"`
  - 选择了本地 Chrome MCP 配置文件，但没有可用的主机本地标签页

## 快速分类检查清单

1. Windows：`curl http://127.0.0.1:9222/json/version` 是否有效？
2. WSL2：`curl http://WINDOWS_HOST_OR_IP:9222/json/version` 是否有效？
3. OpenClaw 配置：`browser.profiles.<name>.cdpUrl` 是否使用了该精确的 WSL2 可到达地址？
4. 控制 UI：您是否使用 `http://127.0.0.1:18789/` 而不是 LAN IP？
5. 您是否尝试在 WSL2 和 Windows 之间使用 `existing-session`，而不是原始远程 CDP？

## 实际结论

该设置通常是可行的。困难在于浏览器传输、控制 UI 来源安全以及令牌/配对可能各自独立失败，但从用户角度看起来相似。

当不确定时：

- 首先在本地验证 Windows Chrome 端点
- 然后从 WSL2 验证同一端点
- 只有这样才调试 OpenClaw 配置或控制 UI 认证

## 相关

- [浏览器](/tools/browser)
- [浏览器登录](/tools/browser-login)
- [浏览器 Linux 故障排除](/tools/browser-linux-troubleshooting)
