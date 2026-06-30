---
summary: "使用 Ansible、Tailscale VPN 和防火墙隔离进行自动化、加固的 OpenClaw 安装"
read_when:
  - 您希望通过安全加固实现自动化服务器部署
  - 您需要具有 VPN 访问权限的防火墙隔离设置
  - 您正在部署到远程 Debian/Ubuntu 服务器
title: "Ansible"
---

# Ansible 安装

使用 **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** 将 OpenClaw 部署到生产服务器——这是一个具有安全优先架构的自动化安装程序。

<Info>
[openclaw-ansible](https://github.com/openclaw/openclaw-ansible) 仓库是 Ansible 部署的权威来源。本页面是快速概述。
</Info>

## 前提条件

| 要求         | 详情                            |
| ------------ | ------------------------------- |
| **操作系统** | Debian 11+ 或 Ubuntu 20.04+     |
| **访问权限** | root 或 sudo 权限               |
| **网络**     | 用于包安装的互联网连接          |
| **Ansible**  | 2.14+（由快速启动脚本自动安装） |

## 您将获得的内容

- **防火墙优先安全** -- UFW + Docker 隔离（仅 SSH + Tailscale 可访问）
- **Tailscale VPN** -- 安全远程访问，无需公开暴露服务
- **Docker** -- 隔离的沙箱容器，仅绑定本地地址
- **纵深防御** -- 4 层安全架构
- **Systemd 集成** -- 开机自启并进行加固
- **一键设置** -- 几分钟内完成完整部署

## 快速开始

一键安装：

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

## 安装了什么

Ansible playbook 安装并配置：

1. **Tailscale** -- 用于安全远程访问的 mesh VPN
2. **UFW 防火墙** -- 仅开放 SSH + Tailscale 端口
3. **Docker CE + Compose V2** -- 用于默认代理沙箱后端
4. **Node.js 24 + pnpm** -- 运行时依赖（Node 22 LTS，当前 `22.14+`，仍受支持）
5. **OpenClaw** -- 基于主机运行，非容器化
6. **Systemd 服务** -- 带安全加固的自动启动

<Note>
网关直接在主机上运行（不在 Docker 中）。代理沙箱化是可选的；此 playbook 安装 Docker 是因为它是默认的沙箱后端。详情和其他后端请参见 [沙箱化](/gateway/sandboxing)。
</Note>

## 安装后设置

<Steps>
  <Step title="切换到 openclaw 用户">
    ```bash
    sudo -i -u openclaw
    ```
  </Step>
  <Step title="运行入门向导">
    安装后脚本将引导您完成 OpenClaw 设置配置。
  </Step>
  <Step title="连接消息提供商">
    登录 WhatsApp、Telegram、Discord 或 Signal：
    ```bash
    openclaw channels login
    ```
  </Step>
  <Step title="验证安装">
    ```bash
    sudo systemctl status openclaw
    sudo journalctl -u openclaw -f
    ```
  </Step>
  <Step title="连接到 Tailscale">
    加入您的 VPN mesh 以实现安全远程访问。
  </Step>
</Steps>

### 快速命令

```bash
# 检查服务状态
sudo systemctl status openclaw

# 查看实时日志
sudo journalctl -u openclaw -f

# 重启网关
sudo systemctl restart openclaw

# 提供商登录（以 openclaw 用户身份运行）
sudo -i -u openclaw
openclaw channels login
```

## 安全架构

部署使用 4 层防御模型：

1. **防火墙（UFW）** -- 公开仅暴露 SSH (22) + Tailscale (41641/udp)
2. **VPN（Tailscale）** -- 网关仅通过 VPN mesh 访问
3. **Docker 隔离** -- DOCKER-USER iptables 链防止外部端口暴露
4. **Systemd 加固** -- NoNewPrivileges、PrivateTmp、非特权用户

验证您的外部攻击面：

```bash
nmap -p- YOUR_SERVER_IP
```

只有端口 22（SSH）应该开放。所有其他服务（网关、Docker）均已锁定。

Docker 用于代理沙箱（隔离的工具执行），而非运行网关本身。沙箱配置请参见 [多代理沙箱和工具](/tools/multi-agent-sandbox-tools)。

## 手动安装

如果您希望手动控制而非使用自动化：

<Steps>
  <Step title="安装前提条件">
    ```bash
    sudo apt update && sudo apt install -y ansible git
    ```
  </Step>
  <Step title="克隆仓库">
    ```bash
    git clone https://github.com/openclaw/openclaw-ansible.git
    cd openclaw-ansible
    ```
  </Step>
  <Step title="安装 Ansible 集合">
    ```bash
    ansible-galaxy collection install -r requirements.yml
    ```
  </Step>
  <Step title="运行 playbook">
    ```bash
    ./run-playbook.sh
    ```

    或者，直接运行然后手动执行设置脚本：
    ```bash
    ansible-playbook playbook.yml --ask-become-pass
    # 然后运行：/tmp/openclaw-setup.sh
    ```

  </Step>
</Steps>

## 更新

Ansible 安装程序将 OpenClaw 设置为手动更新。标准更新流程请参见 [更新](/install/updating)。

要重新运行 Ansible playbook（例如，用于配置更改）：

```bash
cd openclaw-ansible
./run-playbook.sh
```

这是幂等的，可以安全地多次运行。

## 故障排除

<AccordionGroup>
  <Accordion title="防火墙阻止了我的连接">
    - 首先确保您可以通过 Tailscale VPN 访问
    - SSH 访问（端口 22）始终允许
    - 按设计，网关只能通过 Tailscale 访问

  </Accordion>
  <Accordion title="服务无法启动">
    ```bash
    # 检查日志
    sudo journalctl -u openclaw -n 100

    # 验证权限
    sudo ls -la /opt/openclaw

    # 测试手动启动
    sudo -i -u openclaw
    cd ~/openclaw
    openclaw gateway run
    ```

  </Accordion>
  <Accordion title="Docker 沙箱问题">
    ```bash
    # 验证 Docker 是否在运行
    sudo systemctl status docker

    # 检查沙箱镜像
    sudo docker images | grep openclaw-sandbox

    # 如果镜像缺失则构建（需要源代码检出）
    cd /opt/openclaw/openclaw
    sudo -u openclaw ./scripts/sandbox-setup.sh
    # 对于没有源代码检出的 npm 安装，请参见
    # https://docs.openclaw.ai/gateway/sandboxing#images-and-setup
    ```

  </Accordion>
  <Accordion title="提供商登录失败">
    确保您以 `openclaw` 用户身份运行：
    ```bash
    sudo -i -u openclaw
    openclaw channels login
    ```
  </Accordion>
</AccordionGroup>

## 高级配置

有关详细的安全架构和故障排除，请参见 openclaw-ansible 仓库：

- [安全架构](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [技术细节](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [故障排除指南](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## 相关

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) -- 完整部署指南
- [Docker](/install/docker) -- 容器化网关设置
- [沙箱化](/gateway/sandboxing) -- 代理沙箱配置
- [多代理沙箱和工具](/tools/multi-agent-sandbox-tools) -- 每代理隔离
