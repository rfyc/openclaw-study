---
summary: "在廉价的 Hetzner VPS（Docker）上全天候运行 OpenClaw Gateway，具有持久状态和内置二进制文件"
read_when:
  - 您希望在云 VPS（而非笔记本电脑）上全天候运行 OpenClaw
  - 您希望在自己的 VPS 上运行生产级别的始终在线 Gateway
  - 您希望完全控制持久化、二进制文件和重启行为
  - 您在 Hetzner 或类似提供商上的 Docker 中运行 OpenClaw
title: "Hetzner"
---

# Hetzner 上的 OpenClaw（Docker，生产 VPS 指南）

## 目标

使用 Docker 在 Hetzner VPS 上运行持久的 OpenClaw Gateway，具有持久状态、内置二进制文件和安全的重启行为。

如果您想要"约 $5 的全天候 OpenClaw"，这是最简单可靠的设置。
Hetzner 定价会变化；选择最小的 Debian/Ubuntu VPS，如果遇到 OOM 则扩展。

安全模型提醒：

- 当所有人都在同一信任边界且运行时仅用于业务时，公司共享代理是可以的。
- 保持严格分离：专用 VPS/运行时 + 专用账户；该主机上不保存个人 Apple/Google/浏览器/密码管理器配置文件。
- 如果用户之间存在对抗关系，按 gateway/主机/OS 用户分隔。

请参见 [安全](/gateway/security) 和 [VPS 托管](/vps)。

## 我们在做什么（简单说明）？

- 租用小型 Linux 服务器（Hetzner VPS）
- 安装 Docker（隔离的应用运行时）
- 在 Docker 中启动 OpenClaw Gateway
- 将 `~/.openclaw` + `~/.openclaw/workspace` 持久化在主机上（在重启/重建后仍然存在）
- 通过 SSH 隧道从您的笔记本电脑访问 Control UI

挂载的 `~/.openclaw` 状态包括 `openclaw.json`、每个代理的
`agents/<agentId>/agent/auth-profiles.json` 和 `.env`。

Gateway 可以通过以下方式访问：

- 从您的笔记本电脑进行 SSH 端口转发
- 如果您自己管理防火墙和令牌，则直接端口暴露

本指南假设 Hetzner 上使用 Ubuntu 或 Debian。
如果您使用其他 Linux VPS，相应地映射包。
有关通用 Docker 流程，请参见 [Docker](/install/docker)。

---

## 快速路径（有经验的操作员）

1. 配置 Hetzner VPS
2. 安装 Docker
3. 克隆 OpenClaw 仓库
4. 创建持久主机目录
5. 配置 `.env` 和 `docker-compose.yml`
6. 将必需的二进制文件烘焙到镜像中
7. `docker compose up -d`
8. 验证持久化和 Gateway 访问

---

## 您需要的东西

- 具有 root 访问权限的 Hetzner VPS
- 从笔记本电脑访问 SSH
- 基本熟悉 SSH + 复制/粘贴
- 约 20 分钟
- Docker 和 Docker Compose
- 模型认证凭据
- 可选的提供商凭据
  - WhatsApp QR
  - Telegram 机器人令牌
  - Gmail OAuth

---

<Steps>
  <Step title="配置 VPS">
    在 Hetzner 中创建 Ubuntu 或 Debian VPS。

    以 root 连接：

    ```bash
    ssh root@YOUR_VPS_IP
    ```

    本指南假设 VPS 是有状态的。
    不要将其视为一次性基础设施。

  </Step>

  <Step title="安装 Docker（在 VPS 上）">
    ```bash
    apt-get update
    apt-get install -y git curl ca-certificates
    curl -fsSL https://get.docker.com | sh
    ```

    验证：

    ```bash
    docker --version
    docker compose version
    ```

  </Step>

  <Step title="克隆 OpenClaw 仓库">
    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    ```

    本指南假设您将构建自定义镜像以保证二进制文件持久化。

  </Step>

  <Step title="创建持久主机目录">
    Docker 容器是临时的。
    所有长期状态必须存储在主机上。

    ```bash
    mkdir -p /root/.openclaw/workspace

    # 设置所有权为容器用户（uid 1000）：
    chown -R 1000:1000 /root/.openclaw
    ```

  </Step>

  <Step title="配置环境变量">
    在仓库根目录创建 `.env`。

    ```bash
    OPENCLAW_IMAGE=openclaw:latest
    OPENCLAW_GATEWAY_TOKEN=
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/root/.openclaw
    OPENCLAW_WORKSPACE_DIR=/root/.openclaw/workspace

    GOG_KEYRING_PASSWORD=
    XDG_CONFIG_HOME=/home/node/.openclaw
    ```

    除非您明确希望通过 `.env` 管理 `OPENCLAW_GATEWAY_TOKEN`，否则将其留空；OpenClaw 在首次启动时会将随机网关令牌写入配置。生成密钥环密码并粘贴到 `GOG_KEYRING_PASSWORD`：

    ```bash
    openssl rand -hex 32
    ```

    **不要提交此文件。**

    此 `.env` 文件用于容器/运行时环境，如 `OPENCLAW_GATEWAY_TOKEN`。
    存储的提供商 OAuth/API 密钥认证存储在挂载的
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中。

  </Step>

  <Step title="Docker Compose 配置">
    创建或更新 `docker-compose.yml`。

    ```yaml
    services:
      openclaw-gateway:
        image: ${OPENCLAW_IMAGE}
        build: .
        restart: unless-stopped
        env_file:
          - .env
        environment:
          - HOME=/home/node
          - NODE_ENV=production
          - TERM=xterm-256color
          - OPENCLAW_GATEWAY_BIND=${OPENCLAW_GATEWAY_BIND}
          - OPENCLAW_GATEWAY_PORT=${OPENCLAW_GATEWAY_PORT}
          - OPENCLAW_GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN}
          - GOG_KEYRING_PASSWORD=${GOG_KEYRING_PASSWORD}
          - XDG_CONFIG_HOME=${XDG_CONFIG_HOME}
          - PATH=/home/linuxbrew/.linuxbrew/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
        volumes:
          - ${OPENCLAW_CONFIG_DIR}:/home/node/.openclaw
          - ${OPENCLAW_WORKSPACE_DIR}:/home/node/.openclaw/workspace
        ports:
          # 推荐：在 VPS 上保持 Gateway 仅回环；通过 SSH 隧道访问。
          # 要公开暴露，请删除 `127.0.0.1:` 前缀并相应地设置防火墙。
          - "127.0.0.1:${OPENCLAW_GATEWAY_PORT}:18789"
        command:
          [
            "node",
            "dist/index.js",
            "gateway",
            "--bind",
            "${OPENCLAW_GATEWAY_BIND}",
            "--port",
            "${OPENCLAW_GATEWAY_PORT}",
            "--allow-unconfigured",
          ]
    ```

    `--allow-unconfigured` 仅用于引导便利，它不能替代适当的网关配置。仍然需要设置认证（`gateway.auth.token` 或密码）并为您的部署使用安全的绑定设置。

  </Step>

  <Step title="共享 Docker VM 运行时步骤">
    使用共享运行时指南进行常见的 Docker 主机流程：

    - [将必需的二进制文件烘焙到镜像中](/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [构建和启动](/install/docker-vm-runtime#build-and-launch)
    - [持久化内容](/install/docker-vm-runtime#what-persists-where)
    - [更新](/install/docker-vm-runtime#updates)

  </Step>

  <Step title="Hetzner 特定访问">
    完成共享构建和启动步骤后，完成以下设置以打开隧道：

    **前提条件：** 确保您的 VPS sshd 配置允许 TCP 转发。如果您已加固 SSH 配置，请检查 `/etc/ssh/sshd_config` 并设置：

    ```
    AllowTcpForwarding local
    ```

    `local` 允许从您的笔记本电脑进行 `ssh -L` 本地转发，同时阻止来自服务器的远程转发。设置为 `no` 将使隧道失败并显示：
    `channel 3: open failed: administratively prohibited: open failed`

    确认 TCP 转发已启用后，重启 SSH 服务
    （`systemctl restart ssh`）并从您的笔记本电脑运行隧道：

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
    ```

    打开：

    `http://127.0.0.1:18789/`

    粘贴配置的共享密钥。本指南默认使用网关令牌；如果您切换到密码认证，请改用该密码。

  </Step>
</Steps>

共享持久化映射位于 [Docker VM 运行时](/install/docker-vm-runtime#what-persists-where)。

## 基础设施即代码（Terraform）

对于喜欢基础设施即代码工作流的团队，一个社区维护的 Terraform 设置提供：

- 具有远程状态管理的模块化 Terraform 配置
- 通过 cloud-init 自动配置
- 部署脚本（引导、部署、备份/恢复）
- 安全加固（防火墙、UFW、仅 SSH 访问）
- 网关访问的 SSH 隧道配置

**仓库：**

- 基础设施：[openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- Docker 配置：[openclaw-docker-config](https://github.com/andreesg/openclaw-docker-config)

这种方法通过可重现的部署、版本控制的基础设施和自动灾难恢复来补充上面的 Docker 设置。

<Note>
社区维护。有关问题或贡献，请参见上面的仓库链接。
</Note>

## 后续步骤

- 设置消息频道：[频道](/channels)
- 配置 Gateway：[Gateway 配置](/gateway/configuration)
- 保持 OpenClaw 最新：[更新](/install/updating)

## 相关

- [安装概述](/install)
- [Fly.io](/install/fly)
- [Docker](/install/docker)
- [VPS 托管](/vps)
