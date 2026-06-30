---
name: node-connect
description: 诊断 OpenClaw Android、iOS 或 macOS 节点配对、QR/设置码、路由、身份验证和连接故障。
---

# 节点连接

目标：找到从节点到 gateway 的唯一真实路由，验证 OpenClaw 正在宣告该路由，然后修复配对/身份验证问题。

## 首先确定网络拓扑

在提出修复建议之前，先确定你所在的情况：

- 同一台机器 / 模拟器 / USB 隧道
- 同一局域网 / 本地 Wi-Fi
- 同一 Tailscale tailnet
- 公网 URL / 反向代理

不要混淆这些情况。

- 本地 Wi-Fi 问题：除非确实需要远程访问，否则不要切换到 Tailscale。
- VPS / 远程 gateway 问题：不要继续调试 `localhost` 或局域网 IP。

## 如有疑问，先询问

如果设置不清楚或故障报告含糊，在诊断之前先提出简短的澄清性问题。

询问：

- 他们打算使用哪种路由：同一台机器、同一局域网、Tailscale tailnet 还是公网 URL
- 是否使用了 QR/设置码或手动主机/端口
- 应用程序显示的确切文字/状态/错误，尽可能原样引用
- `openclaw devices list` 是否显示待处理的配对请求

不要从"无法连接"中猜测原因。

## 标准检查

优先使用 `openclaw qr --json`。它使用与 Android 扫描相同的设置码载荷。

```bash
openclaw config get gateway.mode
openclaw config get gateway.bind
openclaw config get gateway.tailscale.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
openclaw config get gateway.auth.allowTailscale
openclaw config get plugins.entries.device-pair.config.publicUrl
openclaw qr --json
openclaw devices list
openclaw nodes status
```

如果此 OpenClaw 实例指向远程 gateway，还要运行：

```bash
openclaw qr --remote --json
```

如果 Tailscale 是方案的一部分：

```bash
tailscale status --json
```

## 读取结果，而非猜测

`openclaw qr --json` 成功意味着：

- `gatewayUrl`：这是应用程序应使用的实际端点。
- `urlSource`：这告诉你哪个配置路径生效了。

常见的正确来源：

- `gateway.bind=lan`：仅限同一 Wi-Fi / 局域网
- `gateway.bind=tailnet`：直接 tailnet 访问
- `gateway.tailscale.mode=serve` 或 `gateway.tailscale.mode=funnel`：Tailscale 路由
- `plugins.entries.device-pair.config.publicUrl`：明确的公网/反向代理路由
- `gateway.remote.url`：远程 gateway 路由

## 根本原因映射

如果 `openclaw qr --json` 提示 `Gateway is only bound to loopback`：

- 远程节点尚无法连接
- 修复路由，然后生成新的设置码
- 即使有效 QR 路由仍是 loopback，`gateway.bind=auto` 也不够
- 同一局域网：使用 `gateway.bind=lan`
- 同一 tailnet：优先使用 `gateway.tailscale.mode=serve` 或 `gateway.bind=tailnet`
- 公网：设置真实的 `plugins.entries.device-pair.config.publicUrl` 或 `gateway.remote.url`

如果 `gateway.bind=tailnet set, but no tailnet IP was found`：

- gateway 主机实际上不在 Tailscale 上

如果 `qr --remote requires gateway.remote.url`：

- 远程模式配置不完整

如果应用程序提示 `pairing required`：

- 网络路由和身份验证已成功
- 审批待处理的设备

```bash
openclaw devices list
openclaw devices approve --latest
```

如果应用程序提示 `bootstrap token invalid or expired`：

- 设置码已过期
- 生成新设置码并重新扫描
- URL/身份验证修复后也需要执行此操作

如果应用程序提示 `unauthorized`：

- token/密码错误，或 Tailscale 预期不符
- 对于 Tailscale Serve，`gateway.auth.allowTailscale` 必须与预期流程匹配
- 否则使用明确的 token/密码

## 快速启发式规则

- 同一 Wi-Fi 设置 + gateway 宣告 `127.0.0.1`、`localhost` 或仅 loopback 配置：错误。
- 远程设置 + 设置/手动使用私有局域网 IP：错误。
- Tailnet 设置 + gateway 宣告局域网 IP 而非 MagicDNS / tailnet 路由：错误。
- 公网 URL 已设置但 QR 仍宣告其他内容：检查 `urlSource`；配置不是你想的那样。
- `openclaw devices list` 显示待处理请求：停止更改网络配置，先审批。

## 修复风格

回复时给出一个具体的诊断和一条路由建议。

如果信号不足，询问设置 + 应用程序确切文字，而非猜测。

好的示例：

- `gateway 仍然只绑定到 loopback，因此另一个网络上的节点永远无法访问它。启用 Tailscale Serve，重启 gateway，再次运行 openclaw qr，重新扫描，然后审批待处理的设备配对。`

差的示例：

- `也许是局域网，也许是 Tailscale，也许是端口转发，也许是公网 URL。`
