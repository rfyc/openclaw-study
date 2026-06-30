---
summary: "在 Linux 服务器或云 VPS 上运行 OpenClaw——提供商选择、架构和调优"
read_when:
  - 想要在 Linux 服务器或云 VPS 上运行网关时
  - 需要托管指南的快速地图时
  - 想要 OpenClaw 的通用 Linux 服务器调优时
title: "Linux 服务器"
sidebarTitle: "Linux 服务器"
---

在任何 Linux 服务器或云 VPS 上运行 OpenClaw 网关。本页面帮助你选择提供商，说明云部署的工作原理，并介绍适用于所有环境的通用 Linux 调优。

## 选择提供商

<CardGroup cols={2}>
  <Card title="Railway" href="/install/railway">一键式，浏览器设置</Card>
  <Card title="Northflank" href="/install/northflank">一键式，浏览器设置</Card>
  <Card title="DigitalOcean" href="/install/digitalocean">简单付费 VPS</Card>
  <Card title="Oracle Cloud" href="/install/oracle">永久免费 ARM 层级</Card>
  <Card title="Fly.io" href="/install/fly">Fly Machines</Card>
  <Card title="Hetzner" href="/install/hetzner">Hetzner VPS 上的 Docker</Card>
  <Card title="Hostinger" href="/install/hostinger">带一键设置的 VPS</Card>
  <Card title="GCP" href="/install/gcp">Compute Engine</Card>
  <Card title="Azure" href="/install/azure">Linux VM</Card>
  <Card title="exe.dev" href="/install/exe-dev">带 HTTPS 代理的 VM</Card>
  <Card title="Raspberry Pi" href="/install/raspberry-pi">ARM 自托管</Card>
</CardGroup>

**AWS（EC2 / Lightsail / 免费层级）** 也可以正常运行。
社区视频演示可在
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
获取（社区资源——可能变得不可用）。

## 云设置的工作原理

- **网关在 VPS 上运行**，拥有状态 + 工作区。
- 你从笔记本电脑或手机通过 **Control UI** 或 **Tailscale/SSH** 连接。
- 将 VPS 视为可信来源，并定期**备份**状态 + 工作区。
- 安全默认：将网关保留在回环上，通过 SSH 隧道或 Tailscale Serve 访问它。
  如果绑定到 `lan` 或 `tailnet`，请要求 `gateway.auth.token` 或 `gateway.auth.password`。

相关页面：[网关远程访问](/gateway/remote)、[平台中心](/platforms)。

## 首先加固管理访问

在公共 VPS 上安装 OpenClaw 之前，决定如何管理服务器本身。

- 如果想要仅 Tailnet 的管理访问，首先安装 Tailscale，将 VPS 加入你的 tailnet，通过 Tailscale IP 或 MagicDNS 名称验证第二个 SSH 会话，然后限制公共 SSH。
- 如果不使用 Tailscale，在暴露更多服务之前，对你的 SSH 路径应用等效的加固。
- 这与网关访问是分开的。你仍然可以将 OpenClaw 绑定到回环，并使用 SSH 隧道或 Tailscale Serve 用于仪表盘。

Tailscale 特定的网关选项在 [Tailscale](/gateway/tailscale) 中。

## VPS 上的共享公司代理

当每个用户都在相同的信任边界内且代理仅用于业务时，为团队运行单个代理是有效的设置。

- 将其保留在专用运行时上（VPS/VM/容器 + 专用 OS 用户/账户）。
- 不要将该运行时登录到个人 Apple/Google 账户或个人浏览器/密码管理器配置文件。
- 如果用户之间存在敌对关系，按网关/主机/OS 用户拆分。

安全模型详情：[安全性](/gateway/security)。

## 在 VPS 上使用节点

你可以将网关保留在云中，并在本地设备（Mac/iOS/Android/无头）上配对**节点**。节点提供本地屏幕/摄像头/canvas 和 `system.run` 功能，而网关保留在云中。

文档：[节点](/nodes)、[节点 CLI](/cli/nodes)。

## 小型 VM 和 ARM 主机的启动调优

如果 CLI 命令在低功耗 VM（或 ARM 主机）上感觉缓慢，请启用 Node 的模块编译缓存：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` 改善重复命令的启动时间。
- `OPENCLAW_NO_RESPAWN=1` 避免自我重生路径的额外启动开销。
- 第一次命令运行预热缓存；后续运行更快。
- 有关 Raspberry Pi 的具体内容，请参阅 [Raspberry Pi](/install/raspberry-pi)。

### systemd 调优清单（可选）

对于使用 `systemd` 的 VM 主机，考虑：

- 为稳定的启动路径添加服务环境变量：
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 保持重启行为明确：
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- 优先使用 SSD 支持的磁盘用于状态/缓存路径，以减少随机 I/O 冷启动惩罚。

对于标准的 `openclaw onboard --install-daemon` 路径，编辑用户单元：

```bash
systemctl --user edit openclaw-gateway.service
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

如果你故意安装了系统单元，请通过 `sudo systemctl edit openclaw-gateway.service` 编辑 `openclaw-gateway.service`。

`Restart=` 策略如何帮助自动恢复：
[systemd 可以自动化服务恢复](https://www.redhat.com/en/blog/systemd-automate-recovery)。

有关 Linux OOM 行为、子进程受害者选择和 `exit 137` 诊断，请参阅 [Linux 内存压力和 OOM 终止](/platforms/linux#memory-pressure-and-oom-kills)。

## 相关

- [安装概览](/install)
- [DigitalOcean](/install/digitalocean)
- [Fly.io](/install/fly)
- [Hetzner](/install/hetzner)
