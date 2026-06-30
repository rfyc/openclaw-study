---
summary: "在 Fly.io 上逐步部署 OpenClaw，具有持久存储和 HTTPS"
title: Fly.io
read_when:
  - 在 Fly.io 上部署 OpenClaw
  - 设置 Fly 卷、密钥和首次运行配置
---

# Fly.io 部署

**目标：** OpenClaw Gateway 在 [Fly.io](https://fly.io) 机器上运行，具有持久存储、自动 HTTPS 和 Discord/频道访问。

## 您需要的东西

- 已安装 [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Fly.io 账户（免费层可用）
- 模型认证：所选模型提供商的 API 密钥
- 频道凭据：Discord 机器人令牌、Telegram 令牌等

## 初学者快速路径

1. 克隆仓库 → 自定义 `fly.toml`
2. 创建应用 + 卷 → 设置密钥
3. 使用 `fly deploy` 部署
4. SSH 进入创建配置或使用 Control UI

<Steps>
  <Step title="创建 Fly 应用">
    ```bash
    # 克隆仓库
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw

    # 创建新的 Fly 应用（选择您自己的名称）
    fly apps create my-openclaw

    # 创建持久卷（1GB 通常足够）
    fly volumes create openclaw_data --size 1 --region iad
    ```

    **提示：** 选择距您最近的区域。常见选项：`lhr`（伦敦）、`iad`（弗吉尼亚）、`sjc`（圣何塞）。

  </Step>

  <Step title="配置 fly.toml">
    编辑 `fly.toml` 以匹配您的应用名称和要求。

    **安全注意事项：** 默认配置暴露公共 URL。如需无公共 IP 的加固部署，请参见 [私有部署](#private-deployment-hardened) 或使用 `deploy/fly.private.toml`。

    ```toml
    app = "my-openclaw"  # 您的应用名称
    primary_region = "iad"

    [build]
      dockerfile = "Dockerfile"

    [env]
      NODE_ENV = "production"
      OPENCLAW_PREFER_PNPM = "1"
      OPENCLAW_STATE_DIR = "/data"
      NODE_OPTIONS = "--max-old-space-size=1536"

    [processes]
      app = "node dist/index.js gateway --allow-unconfigured --port 3000 --bind lan"

    [http_service]
      internal_port = 3000
      force_https = true
      auto_stop_machines = false
      auto_start_machines = true
      min_machines_running = 1
      processes = ["app"]

    [[vm]]
      size = "shared-cpu-2x"
      memory = "2048mb"

    [mounts]
      source = "openclaw_data"
      destination = "/data"
    ```

    **关键设置：**

    | 设置 | 原因 |
    | ------------------------------ | --------------------------------------------------------------------------- |
    | `--bind lan` | 绑定到 `0.0.0.0`，使 Fly 的代理可以访问网关 |
    | `--allow-unconfigured` | 在没有配置文件的情况下启动（之后您将创建一个） |
    | `internal_port = 3000` | 必须与 `--port 3000`（或 `OPENCLAW_GATEWAY_PORT`）匹配，用于 Fly 健康检查 |
    | `memory = "2048mb"` | 512MB 太小；推荐 2GB |
    | `OPENCLAW_STATE_DIR = "/data"` | 在卷上持久化状态 |

  </Step>

  <Step title="设置密钥">
    ```bash
    # 必需：网关令牌（用于非回环绑定）
    fly secrets set OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)

    # 模型提供商 API 密钥
    fly secrets set ANTHROPIC_API_KEY=sk-ant-...

    # 可选：其他提供商
    fly secrets set OPENAI_API_KEY=sk-...
    fly secrets set GOOGLE_API_KEY=...

    # 频道令牌
    fly secrets set DISCORD_BOT_TOKEN=MTQ...
    ```

    **注意事项：**

    - 非回环绑定（`--bind lan`）需要有效的网关认证路径。此 Fly.io 示例使用 `OPENCLAW_GATEWAY_TOKEN`，但 `gateway.auth.password` 或正确配置的非回环 `trusted-proxy` 部署也满足要求。
    - 像密码一样对待这些令牌。
    - **优先使用环境变量而非配置文件**处理所有 API 密钥和令牌。这样可以防止密钥出现在 `openclaw.json` 中，避免意外暴露或记录。

  </Step>

  <Step title="部署">
    ```bash
    fly deploy
    ```

    首次部署构建 Docker 镜像（约 2-3 分钟）。后续部署更快。

    部署后验证：

    ```bash
    fly status
    fly logs
    ```

    您应该看到：

    ```
    [gateway] listening on ws://0.0.0.0:3000 (PID xxx)
    [discord] logged in to discord as xxx
    ```

  </Step>

  <Step title="创建配置文件">
    SSH 进入机器创建适当的配置：

    ```bash
    fly ssh console
    ```

    创建配置目录和文件：

    ```bash
    mkdir -p /data
    cat > /data/openclaw.json << 'EOF'
    {
      "agents": {
        "defaults": {
          "model": {
            "primary": "anthropic/claude-opus-4-6",
            "fallbacks": ["anthropic/claude-sonnet-4-6", "openai/gpt-5.4"]
          },
          "maxConcurrent": 4
        },
        "list": [
          {
            "id": "main",
            "default": true
          }
        ]
      },
      "auth": {
        "profiles": {
          "anthropic:default": { "mode": "token", "provider": "anthropic" },
          "openai:default": { "mode": "token", "provider": "openai" }
        }
      },
      "bindings": [
        {
          "agentId": "main",
          "match": { "channel": "discord" }
        }
      ],
      "channels": {
        "discord": {
          "enabled": true,
          "groupPolicy": "allowlist",
          "guilds": {
            "YOUR_GUILD_ID": {
              "channels": { "general": { "allow": true } },
              "requireMention": false
            }
          }
        }
      },
      "gateway": {
        "mode": "local",
        "bind": "auto",
        "controlUi": {
          "allowedOrigins": [
            "https://my-openclaw.fly.dev",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
          ]
        }
      },
      "meta": {}
    }
    EOF
    ```

    **注意：** 使用 `OPENCLAW_STATE_DIR=/data` 时，配置路径为 `/data/openclaw.json`。

    **注意：** 将 `https://my-openclaw.fly.dev` 替换为您真实的 Fly 应用来源。Gateway 启动时从运行时 `--bind` 和 `--port` 值中填充本地 Control UI 来源，因此首次启动可以在配置存在之前进行，但通过 Fly 的浏览器访问仍然需要 `gateway.controlUi.allowedOrigins` 中列出的精确 HTTPS 来源。

    **注意：** Discord 令牌可以来自以下任一来源：

    - 环境变量：`DISCORD_BOT_TOKEN`（推荐用于密钥）
    - 配置文件：`channels.discord.token`

    如果使用环境变量，无需在配置中添加令牌。网关自动读取 `DISCORD_BOT_TOKEN`。

    重启以应用：

    ```bash
    exit
    fly machine restart <machine-id>
    ```

  </Step>

  <Step title="访问 Gateway">
    ### Control UI

    在浏览器中打开：

    ```bash
    fly open
    ```

    或访问 `https://my-openclaw.fly.dev/`

    使用配置的共享密钥进行认证。本指南使用 `OPENCLAW_GATEWAY_TOKEN` 中的网关令牌；如果您切换到密码认证，请改用该密码。

    ### 日志

    ```bash
    fly logs              # 实时日志
    fly logs --no-tail    # 近期日志
    ```

    ### SSH 控制台

    ```bash
    fly ssh console
    ```

  </Step>
</Steps>

## 故障排除

### "App is not listening on expected address"

网关绑定到 `127.0.0.1` 而不是 `0.0.0.0`。

**修复：** 在 `fly.toml` 的进程命令中添加 `--bind lan`。

### 健康检查失败/连接拒绝

Fly 无法在配置的端口上访问网关。

**修复：** 确保 `internal_port` 与网关端口匹配（设置 `--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`）。

### OOM/内存问题

容器持续重启或被终止。迹象：`SIGABRT`、`v8::internal::Runtime_AllocateInYoungGeneration` 或静默重启。

**修复：** 在 `fly.toml` 中增加内存：

```toml
[[vm]]
  memory = "2048mb"
```

或更新现有机器：

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**注意：** 512MB 太小。1GB 可能有效，但在负载下或详细日志时可能 OOM。**推荐 2GB。**

### 网关锁问题

网关拒绝启动并显示"already running"错误。

当容器重启但 PID 锁文件在卷上持久存在时会发生这种情况。

**修复：** 删除锁文件：

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

锁文件位于 `/data/gateway.*.lock`（不在子目录中）。

### 配置未被读取

`--allow-unconfigured` 仅绕过启动保护。它不创建或修复 `/data/openclaw.json`，因此当您想要正常的本地网关启动时，请确保您的真实配置存在并包含 `gateway.mode="local"`。

验证配置是否存在：

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### 通过 SSH 写入配置

`fly ssh console -C` 命令不支持 shell 重定向。要写入配置文件：

```bash
# 使用 echo + tee（从本地通过管道传输到远程）
echo '{"your":"config"}' | fly ssh console -C "tee /data/openclaw.json"

# 或使用 sftp
fly sftp shell
> put /local/path/config.json /data/openclaw.json
```

**注意：** 如果文件已存在，`fly sftp` 可能会失败。先删除：

```bash
fly ssh console --command "rm /data/openclaw.json"
```

### 状态不持久

如果重启后丢失认证配置文件、频道/提供商状态或会话，说明状态目录正在写入容器文件系统。

**修复：** 确保 `OPENCLAW_STATE_DIR=/data` 在 `fly.toml` 中设置并重新部署。

## 更新

```bash
# 拉取最新更改
git pull

# 重新部署
fly deploy

# 检查健康状态
fly status
fly logs
```

### 更新机器命令

如果您需要在不完整重新部署的情况下更改启动命令：

```bash
# 获取机器 ID
fly machines list

# 更新命令
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# 或同时增加内存
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**注意：** `fly deploy` 之后，机器命令可能会重置为 `fly.toml` 中的内容。如果您进行了手动更改，请在部署后重新应用它们。

## 私有部署（加固版）

默认情况下，Fly 分配公共 IP，使您的网关可通过 `https://your-app.fly.dev` 访问。这很方便，但意味着您的部署可被互联网扫描器（Shodan、Censys 等）发现。

对于**无公共暴露**的加固部署，使用私有模板。

### 何时使用私有部署

- 您只进行**出站**呼叫/消息（无入站 webhooks）
- 您使用 **ngrok 或 Tailscale** 隧道进行 webhook 回调
- 您通过 **SSH、代理或 WireGuard** 而非浏览器访问网关
- 您希望部署对互联网扫描器**隐藏**

### 设置

使用 `deploy/fly.private.toml` 而非标准配置：

```bash
# 使用私有配置部署
fly deploy -c deploy/fly.private.toml
```

或转换现有部署：

```bash
# 列出当前 IP
fly ips list -a my-openclaw

# 释放公共 IP
fly ips release <public-ipv4> -a my-openclaw
fly ips release <public-ipv6> -a my-openclaw

# 切换到私有配置以防止未来部署重新分配公共 IP
# （删除 [http_service] 或使用私有模板部署）
fly deploy -c deploy/fly.private.toml

# 分配仅私有 IPv6
fly ips allocate-v6 --private -a my-openclaw
```

之后，`fly ips list` 应只显示 `private` 类型的 IP：

```
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### 访问私有部署

由于没有公共 URL，使用以下方法之一：

**选项 1：本地代理（最简单）**

```bash
# 将本地端口 3000 转发到应用
fly proxy 3000:3000 -a my-openclaw

# 然后在浏览器中打开 http://localhost:3000
```

**选项 2：WireGuard VPN**

```bash
# 创建 WireGuard 配置（一次性）
fly wireguard create

# 导入到 WireGuard 客户端，然后通过内部 IPv6 访问
# 示例：http://[fdaa:x:x:x:x::x]:3000
```

**选项 3：仅 SSH**

```bash
fly ssh console -a my-openclaw
```

### 私有部署的 Webhooks

如果您需要 webhook 回调（Twilio、Telnyx 等）而不暴露公开：

1. **ngrok 隧道** - 在容器内或作为 sidecar 运行 ngrok
2. **Tailscale Funnel** - 通过 Tailscale 暴露特定路径
3. **仅出站** - 某些提供商（Twilio）无需 webhooks 即可正常进行出站呼叫

使用 ngrok 的示例语音呼叫配置：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          tunnel: { provider: "ngrok" },
          webhookSecurity: {
            allowedHosts: ["example.ngrok.app"],
          },
        },
      },
    },
  },
}
```

ngrok 隧道在容器内运行，提供公共 webhook URL，而不暴露 Fly 应用本身。将 `webhookSecurity.allowedHosts` 设置为公共隧道主机名，以便接受转发的 host 标头。

### 安全优势

| 方面            | 公共   | 私有     |
| --------------- | ------ | -------- |
| 互联网扫描器    | 可发现 | 隐藏     |
| 直接攻击        | 可能   | 阻止     |
| Control UI 访问 | 浏览器 | 代理/VPN |
| Webhook 传递    | 直接   | 通过隧道 |

## 注意事项

- Fly.io 使用 **x86 架构**（非 ARM）
- Dockerfile 兼容两种架构
- 对于 WhatsApp/Telegram 入门，使用 `fly ssh console`
- 持久数据存储在 `/data` 上的卷中
- Signal 需要 Java + signal-cli；使用自定义镜像并保持内存在 2GB 以上。

## 费用

使用推荐配置（`shared-cpu-2x`，2GB RAM）：

- 约 $10-15/月，具体取决于使用情况
- 免费层包含一些配额

详情请参见 [Fly.io 定价](https://fly.io/docs/about/pricing/)。

## 后续步骤

- 设置消息频道：[频道](/channels)
- 配置 Gateway：[Gateway 配置](/gateway/configuration)
- 保持 OpenClaw 最新：[更新](/install/updating)

## 相关

- [安装概述](/install)
- [Hetzner](/install/hetzner)
- [Docker](/install/docker)
- [VPS 托管](/vps)
