---
summary: "Linux 支持 + 伴侣应用状态"
read_when:
  - 查找 Linux 伴侣应用状态
  - 规划平台覆盖或贡献
  - 在 VPS 或容器上调试 Linux OOM 终止或退出码 137
title: "Linux 应用"
---

Gateway 在 Linux 上完全支持。**Node 是推荐的运行时**。
Bun 不推荐用于 Gateway（WhatsApp/Telegram 问题）。

原生 Linux 伴侣应用在计划中。如果你想帮助构建，欢迎贡献。

## 初学者快速路径（VPS）

1. 安装 Node 24（推荐；Node 22 LTS，当前 `22.14+`，仍支持兼容性）
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 从你的笔记本电脑：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 打开 `http://127.0.0.1:18789/` 并使用配置的共享密钥认证（默认令牌；如果设置了 `gateway.auth.mode: "password"` 则使用密码）

完整 Linux 服务器指南：[Linux 服务器](/vps)。逐步 VPS 示例：[exe.dev](/install/exe-dev)

## 安装

- [入门指南](/start/getting-started)
- [安装与更新](/install/updating)
- 可选流程：[Bun（实验性）](/install/bun)、[Nix](/install/nix)、[Docker](/install/docker)

## Gateway

- [Gateway 运行手册](/gateway)
- [配置](/gateway/configuration)

## Gateway 服务安装（CLI）

使用以下任意一种：

```
openclaw onboard --install-daemon
```

或：

```
openclaw gateway install
```

或：

```
openclaw configure
```

在提示时选择 **Gateway 服务**。

修复/迁移：

```
openclaw doctor
```

## 系统控制（systemd 用户单元）

OpenClaw 默认安装 systemd **用户**服务。对于共享或始终运行的服务器，使用**系统**
服务。`openclaw gateway install` 和
`openclaw onboard --install-daemon` 已经为你生成当前的规范单元；
仅当需要自定义系统/服务管理器设置时才手动编写。完整的服务指南在 [Gateway 运行手册](/gateway) 中。

最小设置：

创建 `~/.config/systemd/user/openclaw-gateway[-<profile>].service`：

```
[Unit]
Description=OpenClaw Gateway (profile: <profile>, v<version>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group

[Install]
WantedBy=default.target
```

启用它：

```
systemctl --user enable --now openclaw-gateway[-<profile>].service
```

## 内存压力和 OOM 终止

在 Linux 上，当主机、VM 或容器 cgroup 内存耗尽时，内核选择一个 OOM 受害者。Gateway 可能是一个糟糕的受害者，因为它拥有长期会话和频道连接。因此，OpenClaw 尽可能偏向于让临时子进程在 Gateway 之前被终止。

对于符合条件的 Linux 子进程启动，OpenClaw 通过一个简短的
`/bin/sh` 包装器启动子进程，将子进程自身的 `oom_score_adj` 提升到 `1000`，然后
`exec` 真正的命令。这是一个无特权操作，因为子进程只是提高其自身被 OOM 终止的可能性。

覆盖的子进程接口包括：

- supervisor 管理的命令子进程，
- PTY shell 子进程，
- MCP stdio 服务器子进程，
- OpenClaw 启动的浏览器/Chrome 进程。

该包装器仅适用于 Linux，当 `/bin/sh` 不可用时跳过。如果子进程环境设置了 `OPENCLAW_CHILD_OOM_SCORE_ADJ=0`、`false`、
`no` 或 `off`，也会跳过。

验证子进程：

```bash
cat /proc/<child-pid>/oom_score_adj
```

覆盖的子进程期望值为 `1000`。Gateway 进程应保持其正常分数，通常为 `0`。

这不能替代正常的内存调优。如果 VPS 或容器反复
终止子进程，增加内存限制、减少并发，或添加更强的
资源控制，如 systemd `MemoryMax=` 或容器级内存限制。

## 相关

- [安装概览](/install)
- [Linux 服务器](/vps)
- [Raspberry Pi](/platforms/raspberry-pi)
