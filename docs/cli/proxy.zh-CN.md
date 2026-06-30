---
summary: "`openclaw proxy` 的 CLI 参考，包括运营商管理的代理验证和本地调试代理捕获检查器"
read_when:
  - 你需要在部署前验证运营商管理的代理路由时
  - 你需要在本地捕获 OpenClaw 传输流量进行调试时
  - 你想检查调试代理会话、blob 或内置查询预设时
title: "Proxy"
---

# `openclaw proxy`

验证运营商管理的代理路由，或运行本地显式调试代理并检查捕获的流量。

使用 `validate` 在启用 OpenClaw 代理路由之前对运营商管理的正向代理进行预检。其他命令是传输级调查的调试工具：它们可以启动本地代理、使用捕获功能运行子命令、列出捕获会话、查询常见流量模式、读取捕获的 blob，以及清除本地捕获数据。

## 命令

```bash
openclaw proxy start [--host <host>] [--port <port>]
openclaw proxy run [--host <host>] [--port <port>] -- <cmd...>
openclaw proxy validate [--json] [--proxy-url <url>] [--allowed-url <url>] [--denied-url <url>] [--apns-reachable] [--apns-authority <url>] [--timeout-ms <ms>]
openclaw proxy coverage
openclaw proxy sessions [--limit <count>]
openclaw proxy query --preset <name> [--session <id>]
openclaw proxy blob --id <blobId>
openclaw proxy purge
```

## 验证

`openclaw proxy validate` 从 `--proxy-url`、配置或 `OPENCLAW_PROXY_URL` 检查有效的运营商管理代理 URL。当未启用和配置代理时报告配置问题；在更改配置之前使用 `--proxy-url` 进行一次性预检。默认情况下，它验证公共目标可以通过代理成功，并且代理无法访问临时回环金丝雀。自定义拒绝的目标是失败关闭的：HTTP 响应和模糊的传输失败都会失败，除非你可以单独验证部署特定的拒绝信号。添加 `--apns-reachable` 以通过代理打开 APNs HTTP/2 CONNECT 隧道并确认沙盒 APNs 响应；探测使用有意无效的提供商令牌，因此 APNs `403 InvalidProviderToken` 响应是成功的可达性信号。

选项：

- `--json`：打印机器可读 JSON。
- `--proxy-url <url>`：验证此代理 URL 而不是配置或环境变量。
- `--allowed-url <url>`：添加预期通过代理成功的目标。重复以检查多个目标。
- `--denied-url <url>`：添加预期被代理阻止的目标。重复以检查多个目标。
- `--apns-reachable`：也验证沙盒 APNs HTTP/2 是否可通过代理访问。
- `--apns-authority <url>`：用 `--apns-reachable` 探测的 APNs 机构（默认 `https://api.sandbox.push.apple.com`；生产为 `https://api.push.apple.com`）。
- `--timeout-ms <ms>`：每个请求的超时（毫秒）。

有关部署指南和拒绝语义，请参阅[网络代理](/security/network-proxy)。

## 查询预设

`openclaw proxy query --preset <name>` 接受：

- `double-sends`
- `retry-storms`
- `cache-busting`
- `ws-duplicate-frames`
- `missing-ack`
- `error-bursts`

## 注意

- `start` 默认为 `127.0.0.1`，除非设置了 `--host`。
- `run` 启动本地调试代理，然后在 `--` 之后运行命令。
- 调试代理的直接上游转发为诊断打开上游套接字。当 OpenClaw 托管代理模式处于活跃状态时，代理请求和 CONNECT 隧道的直接转发默认被禁用；仅在经批准的本地诊断中设置 `OPENCLAW_DEBUG_PROXY_ALLOW_DIRECT_CONNECT_WITH_MANAGED_PROXY=1`。
- 当代理配置或目标检查失败时，`validate` 以代码 1 退出。
- 捕获是本地调试数据；完成后使用 `openclaw proxy purge`。

## 相关

- [CLI 参考](/cli)
- [网络代理](/security/network-proxy)
- [受信任的代理认证](/gateway/trusted-proxy-auth)
