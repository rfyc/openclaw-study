---
summary: "使用 WebSocket 监听器绑定的网关单例保护"
title: "网关锁"
read_when:
  - 运行或调试网关进程
  - 调查单实例强制执行
---

## 原因

- 确保在同一主机上每个基础端口只运行一个网关实例；额外的网关必须使用隔离的配置文件和唯一的端口。
- 在崩溃/SIGKILL 后存活而不留下过时的锁文件。
- 当控制端口已被占用时，以清晰的错误快速失败。

## 机制

- 网关首先在状态锁目录下获取每配置的锁文件，并探测配置的端口是否有现有监听器。
- 如果记录的锁所有者消失、端口空闲或锁过时，启动会重新获取锁并继续。
- 网关然后使用独占 TCP 监听器绑定 HTTP/WebSocket 监听器（默认 `ws://127.0.0.1:18789`）。
- 如果绑定因 `EADDRINUSE` 失败，启动抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 关闭时，网关关闭 HTTP/WebSocket 服务器并删除锁文件。

## 错误面

- 如果另一个进程持有该端口，启动抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 其他绑定失败显示为 `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`。

## 操作说明

- 如果端口被*另一个*进程占用，错误是相同的；释放端口或用 `openclaw gateway --port <port>` 选择另一个。
- 在服务监督程序下，看到现有健康 `/healthz` 响应者的新网关进程让该进程保持控制。在 systemd 上，重复启动程序以代码 78 退出，因此默认 `RestartPreventExitStatus=78` 阻止 `Restart=always` 在锁或 `EADDRINUSE` 冲突上循环。如果现有进程从未变得健康，重试是有界的，启动以清晰的锁错误失败而不是永远循环。
- macOS 应用在生成网关之前仍维护其自己的轻量级 PID 保护；运行时锁由锁文件加 HTTP/WebSocket 绑定强制执行。

## 相关链接

- [多网关](/gateway/multiple-gateways) — 使用唯一端口运行多个实例
- [故障排除](/gateway/troubleshooting) — 诊断 `EADDRINUSE` 和端口冲突
