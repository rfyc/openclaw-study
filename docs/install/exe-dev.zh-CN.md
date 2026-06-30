---
summary: "在 exe.dev 上运行 OpenClaw Gateway（虚拟机 + HTTPS 代理）以实现远程访问"
read_when:
  - 您希望为 Gateway 提供一个廉价的始终在线 Linux 主机
  - 您希望无需运行自己的 VPS 即可远程访问 Control UI
title: "exe.dev"
---

目标：OpenClaw Gateway 在 exe.dev 虚拟机上运行，可通过以下地址从您的笔记本电脑访问：`https://<vm-name>.exe.xyz`

本页面假设使用 exe.dev 的默认 **exeuntu** 镜像。如果您选择了不同的发行版，请相应地映射包。

## 初学者快速路径

1. [https://exe.new/openclaw](https://exe.new/openclaw)
2. 根据需要填写您的认证密钥/令牌
3. 点击虚拟机旁边的"Agent"，等待 Shelley 完成配置
4. 打开 `https://<vm-name>.exe.xyz/` 并使用配置的共享密钥进行认证（本指南默认使用令牌认证，但如果您切换 `gateway.auth.mode`，密码认证也可以）
5. 使用 `openclaw devices approve <requestId>` 批准任何待处理的设备配对请求

## 您需要的东西

- exe.dev 账户
- `ssh exe.dev` 访问 [exe.dev](https://exe.dev) 虚拟机（可选）

## 使用 Shelley 自动安装

[exe.dev](https://exe.dev) 的代理 Shelley 可以使用我们的提示即时安装 OpenClaw。使用的提示如下：

```
Set up OpenClaw (https://docs.openclaw.ai/install) on this VM. Use the non-interactive and accept-risk flags for openclaw onboarding. Add the supplied auth or token as needed. Configure nginx to forward from the default port 18789 to the root location on the default enabled site config, making sure to enable Websocket support. Pairing is done by "openclaw devices list" and "openclaw devices approve <request id>". Make sure the dashboard shows that OpenClaw's health is OK. exe.dev handles forwarding from port 8000 to port 80/443 and HTTPS for us, so the final "reachable" should be <vm-name>.exe.xyz, without port specification.
```

## 手动安装

## 1) 创建虚拟机

从您的设备：

```bash
ssh exe.dev new
```

然后连接：

```bash
ssh <vm-name>.exe.xyz
```

<Tip>
保持此虚拟机**有状态**。OpenClaw 将 `openclaw.json`、每个代理的 `auth-profiles.json`、会话和频道/提供商状态存储在 `~/.openclaw/` 下，工作区存储在 `~/.openclaw/workspace/` 下。
</Tip>

## 2) 安装前提条件（在虚拟机上）

```bash
sudo apt-get update
sudo apt-get install -y git curl jq ca-certificates openssl
```

## 3) 安装 OpenClaw

运行 OpenClaw 安装脚本：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

## 4) 设置 nginx 将 OpenClaw 代理到端口 8000

编辑 `/etc/nginx/sites-enabled/default`：

```
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 8000;
    listen [::]:8000;

    server_name _;

    location / {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;

        # WebSocket 支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 标准代理标头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 长连接超时设置
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

覆盖转发标头而不是保留客户端提供的链。
OpenClaw 仅信任来自明确配置的代理的转发 IP 元数据，
追加式 `X-Forwarded-For` 链被视为安全加固风险。

## 5) 访问 OpenClaw 并授予权限

访问 `https://<vm-name>.exe.xyz/`（参见入门时的 Control UI 输出）。如果提示认证，粘贴虚拟机中配置的共享密钥。本指南使用令牌认证，因此使用 `openclaw config get gateway.auth.token` 获取 `gateway.auth.token`（或使用 `openclaw doctor --generate-gateway-token` 生成一个）。如果您将网关更改为密码认证，请改用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`。
使用 `openclaw devices list` 和 `openclaw devices approve <requestId>` 批准设备。如有疑问，从浏览器使用 Shelley！

## 远程频道设置

对于远程主机，优先使用一次 `config patch` 调用而非多次 SSH `config set` 调用。将真实令牌保存在虚拟机环境或 `~/.openclaw/.env` 中，只在 `openclaw.json` 中放置 SecretRefs。

在虚拟机上，使服务环境包含其需要的密钥：

```bash
cat >> ~/.openclaw/.env <<'EOF'
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
DISCORD_BOT_TOKEN=...
OPENAI_API_KEY=sk-...
EOF
```

从您的本地机器，创建一个补丁文件并通过管道传输到虚拟机：

```json5
// openclaw.remote.patch.json5
{
  secrets: {
    providers: {
      default: { source: "env" },
    },
  },
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      groupPolicy: "open",
      requireMention: false,
    },
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
      dmPolicy: "disabled",
      dm: { enabled: false },
      groupPolicy: "allowlist",
    },
  },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.5" },
      models: {
        "openai/gpt-5.5": { params: { fastMode: true } },
      },
    },
  },
}
```

```bash
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin --dry-run' < ./openclaw.remote.patch.json5
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin' < ./openclaw.remote.patch.json5
ssh <vm-name>.exe.xyz 'openclaw gateway restart && openclaw health'
```

当嵌套的允许列表应成为确切的补丁值时，使用 `--replace-path`，例如替换 Discord 频道允许列表：

```bash
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin --replace-path "channels.discord.guilds[\"123\"].channels"' < ./discord.patch.json5
```

## 远程访问

远程访问由 [exe.dev](https://exe.dev) 的认证处理。默认情况下，来自端口 8000 的 HTTP 流量被转发到 `https://<vm-name>.exe.xyz` 并进行电子邮件认证。

## 更新

```bash
npm i -g openclaw@latest
openclaw doctor
openclaw gateway restart
openclaw health
```

指南：[更新](/install/updating)

## 相关

- [远程网关](/gateway/remote)
- [安装概述](/install)
