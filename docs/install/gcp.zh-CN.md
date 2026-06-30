---
summary: "在 GCP Compute Engine 虚拟机（Docker）上全天候运行 OpenClaw Gateway，并保持持久状态"
read_when:
  - 您希望在 GCP 上全天候运行 OpenClaw
  - 您希望在自己的虚拟机上运行生产级别的始终在线 Gateway
  - 您希望完全控制持久化、二进制文件和重启行为
title: "GCP"
---

# GCP Compute Engine 上的 OpenClaw（Docker，生产 VPS 指南）

## 目标

使用 Docker 在 GCP Compute Engine 虚拟机上运行持久的 OpenClaw Gateway，具有持久状态、内置二进制文件和安全的重启行为。

如果您想要"约 $5-12/月的全天候 OpenClaw"，这是在 Google Cloud 上的可靠设置。
定价因机器类型和区域而异；选择适合您工作负载的最小虚拟机，如果遇到 OOM 则扩展。

## 我们在做什么（简单说明）？

- 创建 GCP 项目并启用计费
- 创建 Compute Engine 虚拟机
- 安装 Docker（隔离的应用运行时）
- 在 Docker 中启动 OpenClaw Gateway
- 将 `~/.openclaw` + `~/.openclaw/workspace` 持久化在主机上（在重启/重建后仍然存在）
- 通过 SSH 隧道从您的笔记本电脑访问 Control UI

挂载的 `~/.openclaw` 状态包括 `openclaw.json`、每个代理的
`agents/<agentId>/agent/auth-profiles.json` 和 `.env`。

Gateway 可以通过以下方式访问：

- 从您的笔记本电脑进行 SSH 端口转发
- 如果您自己管理防火墙和令牌，则直接端口暴露

本指南在 GCP Compute Engine 上使用 Debian。
Ubuntu 也可以；相应地映射包。
有关通用 Docker 流程，请参见 [Docker](/install/docker)。

---

## 快速路径（有经验的操作员）

1. 创建 GCP 项目 + 启用 Compute Engine API
2. 创建 Compute Engine 虚拟机（e2-small，Debian 12，20GB）
3. SSH 进入虚拟机
4. 安装 Docker
5. 克隆 OpenClaw 仓库
6. 创建持久主机目录
7. 配置 `.env` 和 `docker-compose.yml`
8. 烘焙必要的二进制文件，构建并启动

---

## 您需要的东西

- GCP 账户（e2-micro 符合免费层资格）
- 已安装 gcloud CLI（或使用 Cloud Console）
- 从笔记本电脑访问 SSH
- 基本熟悉 SSH + 复制/粘贴
- 约 20-30 分钟
- Docker 和 Docker Compose
- 模型认证凭据
- 可选的提供商凭据
  - WhatsApp QR
  - Telegram 机器人令牌
  - Gmail OAuth

---

<Steps>
  <Step title="安装 gcloud CLI（或使用 Console）">
    **选项 A：gcloud CLI**（推荐用于自动化）

    从 [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install) 安装

    初始化并认证：

    ```bash
    gcloud init
    gcloud auth login
    ```

    **选项 B：Cloud Console**

    所有步骤都可以通过 [https://console.cloud.google.com](https://console.cloud.google.com) 的 Web UI 完成

  </Step>

  <Step title="创建 GCP 项目">
    **CLI：**

    ```bash
    gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
    gcloud config set project my-openclaw-project
    ```

    在 [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing) 启用计费（Compute Engine 需要）。

    启用 Compute Engine API：

    ```bash
    gcloud services enable compute.googleapis.com
    ```

    **Console：**

    1. 转到 IAM & Admin > Create Project
    2. 命名并创建
    3. 为项目启用计费
    4. 导航到 APIs & Services > Enable APIs > 搜索"Compute Engine API"> 启用

  </Step>

  <Step title="创建虚拟机">
    **机器类型：**

    | 类型 | 规格 | 费用 | 备注 |
    | --------- | ------------------------ | ------------------ | -------------------------------------------- |
    | e2-medium | 2 vCPU，4GB RAM | 约 $25/月 | 本地 Docker 构建最可靠 |
    | e2-small | 2 vCPU，2GB RAM | 约 $12/月 | Docker 构建的最低推荐规格 |
    | e2-micro | 2 vCPU（共享），1GB RAM | 符合免费层资格 | 通常因 Docker 构建 OOM（exit 137）失败 |

    **CLI：**

    ```bash
    gcloud compute instances create openclaw-gateway \
      --zone=us-central1-a \
      --machine-type=e2-small \
      --boot-disk-size=20GB \
      --image-family=debian-12 \
      --image-project=debian-cloud
    ```

    **Console：**

    1. 转到 Compute Engine > VM instances > Create instance
    2. 名称：`openclaw-gateway`
    3. 区域：`us-central1`，可用区：`us-central1-a`
    4. 机器类型：`e2-small`
    5. 启动磁盘：Debian 12，20GB
    6. 创建

  </Step>

  <Step title="SSH 进入虚拟机">
    **CLI：**

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
    ```

    **Console：**

    在 Compute Engine 仪表板中点击虚拟机旁边的"SSH"按钮。

    注意：SSH 密钥传播在虚拟机创建后可能需要 1-2 分钟。如果连接被拒绝，请等待并重试。

  </Step>

  <Step title="安装 Docker（在虚拟机上）">
    ```bash
    sudo apt-get update
    sudo apt-get install -y git curl ca-certificates
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    ```

    退出并重新登录以使组更改生效：

    ```bash
    exit
    ```

    然后重新 SSH 进入：

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
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
    mkdir -p ~/.openclaw
    mkdir -p ~/.openclaw/workspace
    ```

  </Step>

  <Step title="配置环境变量">
    在仓库根目录创建 `.env`。

    ```bash
    OPENCLAW_IMAGE=openclaw:latest
    OPENCLAW_GATEWAY_TOKEN=
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/home/$USER/.openclaw
    OPENCLAW_WORKSPACE_DIR=/home/$USER/.openclaw/workspace

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
          # 推荐：在虚拟机上保持 Gateway 仅回环；通过 SSH 隧道访问。
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

  <Step title="GCP 特定启动注意事项">
    在 GCP 上，如果构建在 `pnpm install --frozen-lockfile` 期间失败并显示 `Killed` 或 `exit code 137`，说明虚拟机内存不足。使用 `e2-small` 最低规格，或 `e2-medium` 以获得更可靠的首次构建。

    绑定到 LAN（`OPENCLAW_GATEWAY_BIND=lan`）时，在继续之前配置受信任的浏览器来源：

    ```bash
    docker compose run --rm openclaw-cli config set gateway.controlUi.allowedOrigins '["http://127.0.0.1:18789"]' --strict-json
    ```

    如果您更改了网关端口，请将 `18789` 替换为您配置的端口。

  </Step>

  <Step title="从您的笔记本电脑访问">
    创建 SSH 隧道以转发 Gateway 端口：

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
    ```

    在浏览器中打开：

    `http://127.0.0.1:18789/`

    重新打印干净的仪表板链接：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

    如果 UI 提示共享密钥认证，将配置的令牌或密码粘贴到 Control UI 设置中。此 Docker 流程默认写入令牌；如果您将容器配置切换为密码认证，请改用该密码。

    如果 Control UI 显示 `unauthorized` 或 `disconnected (1008): pairing required`，批准浏览器设备：

    ```bash
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    再次需要共享持久化和更新参考？
    请参见 [Docker VM 运行时](/install/docker-vm-runtime#what-persists-where) 和 [Docker VM 运行时更新](/install/docker-vm-runtime#updates)。

  </Step>
</Steps>

---

## 故障排除

**SSH 连接被拒绝**

SSH 密钥传播在虚拟机创建后可能需要 1-2 分钟。请等待并重试。

**OS Login 问题**

检查您的 OS Login 配置文件：

```bash
gcloud compute os-login describe-profile
```

确保您的账户具有所需的 IAM 权限（Compute OS Login 或 Compute OS Admin Login）。

**内存不足（OOM）**

如果 Docker 构建失败并显示 `Killed` 和 `exit code 137`，说明虚拟机被 OOM 终止。升级到 e2-small（最低）或 e2-medium（推荐用于可靠的本地构建）：

```bash
# 先停止虚拟机
gcloud compute instances stop openclaw-gateway --zone=us-central1-a

# 更改机器类型
gcloud compute instances set-machine-type openclaw-gateway \
  --zone=us-central1-a \
  --machine-type=e2-small

# 启动虚拟机
gcloud compute instances start openclaw-gateway --zone=us-central1-a
```

---

## 服务账户（安全最佳实践）

对于个人使用，您的默认用户账户即可正常工作。

对于自动化或 CI/CD 管道，创建具有最小权限的专用服务账户：

1. 创建服务账户：

   ```bash
   gcloud iam service-accounts create openclaw-deploy \
     --display-name="OpenClaw Deployment"
   ```

2. 授予 Compute Instance Admin 角色（或更窄的自定义角色）：

   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

避免对自动化使用 Owner 角色。遵循最小权限原则。

有关 IAM 角色详情，请参见 [https://cloud.google.com/iam/docs/understanding-roles](https://cloud.google.com/iam/docs/understanding-roles)。

---

## 后续步骤

- 设置消息频道：[频道](/channels)
- 将本地设备配对为节点：[节点](/nodes)
- 配置 Gateway：[Gateway 配置](/gateway/configuration)

## 相关

- [安装概述](/install)
- [Azure](/install/azure)
- [VPS 托管](/vps)
