---
summary: "OpenClaw 的可选 Docker 设置和入门"
read_when:
  - 您希望使用容器化网关而非本地安装
  - 您正在验证 Docker 流程
title: "Docker"
---

Docker 是**可选的**。仅在您希望容器化网关或验证 Docker 流程时使用它。

## Docker 适合我吗？

- **是**：您希望一个隔离的、可丢弃的网关环境，或在没有本地安装的主机上运行 OpenClaw。
- **否**：您在自己的机器上运行，只想要最快的开发循环。请改用正常安装流程。
- **沙箱注意事项**：默认沙箱后端在启用沙箱时使用 Docker，但沙箱默认**关闭**，**不**要求整个网关在 Docker 中运行。SSH 和 OpenShell 沙箱后端也可用。请参见 [沙箱化](/gateway/sandboxing)。

## 前提条件

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 镜像构建至少需要 2 GB RAM（`pnpm install` 在 1 GB 主机上可能因 exit 137 被 OOM 终止）
- 足够的磁盘空间用于镜像和日志
- 如果在 VPS/公共主机上运行，请查看 [网络暴露的安全加固](/gateway/security)，特别是 Docker `DOCKER-USER` 防火墙策略。

## 容器化网关

<Steps>
  <Step title="构建镜像">
    从仓库根目录运行设置脚本：

    ```bash
    ./scripts/docker/setup.sh
    ```

    这在本地构建网关镜像。要改用预构建镜像：

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    预构建镜像发布在
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw)。
    常见标签：`main`、`latest`、`<version>`（例如 `2026.2.26`）。

  </Step>

  <Step title="完成入门">
    设置脚本自动运行入门。它将：

    - 提示输入提供商 API 密钥
    - 生成网关令牌并写入 `.env`
    - 通过 Docker Compose 启动网关

    在设置期间，启动前的入门和配置写入通过 `openclaw-gateway` 直接运行。`openclaw-cli` 用于网关容器已存在后运行的命令。

  </Step>

  <Step title="打开 Control UI">
    在浏览器中打开 `http://127.0.0.1:18789/`，并将配置的共享密钥粘贴到设置中。设置脚本默认将令牌写入 `.env`；如果您将容器配置切换为密码认证，请改用该密码。

    需要再次获取 URL？

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

  </Step>

  <Step title="配置频道（可选）">
    使用 CLI 容器添加消息频道：

    ```bash
    # WhatsApp (QR)
    docker compose run --rm openclaw-cli channels login

    # Telegram
    docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"

    # Discord
    docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
    ```

    文档：[WhatsApp](/channels/whatsapp)、[Telegram](/channels/telegram)、[Discord](/channels/discord)

  </Step>
</Steps>

### 手动流程

如果您更喜欢自己运行每个步骤而不是使用设置脚本：

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"},{"path":"gateway.controlUi.allowedOrigins","value":["http://localhost:18789","http://127.0.0.1:18789"]}]'
docker compose up -d openclaw-gateway
```

<Note>
从仓库根目录运行 `docker compose`。如果您启用了 `OPENCLAW_EXTRA_MOUNTS` 或 `OPENCLAW_HOME_VOLUME`，设置脚本会写入 `docker-compose.extra.yml`；使用 `-f docker-compose.yml -f docker-compose.extra.yml` 包含它。
</Note>

<Note>
由于 `openclaw-cli` 与 `openclaw-gateway` 共享网络命名空间，它是一个启动后工具。在 `docker compose up -d openclaw-gateway` 之前，通过 `openclaw-gateway` 使用 `--no-deps --entrypoint node` 运行入门和设置时间配置写入。
</Note>

### 环境变量

设置脚本接受这些可选环境变量：

| 变量                                       | 用途                                                    |
| ------------------------------------------ | ------------------------------------------------------- |
| `OPENCLAW_IMAGE`                           | 使用远程镜像而非本地构建                                |
| `OPENCLAW_DOCKER_APT_PACKAGES`             | 在构建时安装额外的 apt 包（空格分隔）                   |
| `OPENCLAW_EXTENSIONS`                      | 在构建时包含选定的捆绑插件辅助工具                      |
| `OPENCLAW_EXTRA_MOUNTS`                    | 额外的主机绑定挂载（逗号分隔的 `source:target[:opts]`） |
| `OPENCLAW_HOME_VOLUME`                     | 在命名 Docker 卷中持久化 `/home/node`                   |
| `OPENCLAW_SANDBOX`                         | 选择加入沙箱引导（`1`、`true`、`yes`、`on`）            |
| `OPENCLAW_SKIP_ONBOARDING`                 | 跳过交互式入门步骤（`1`、`true`、`yes`、`on`）          |
| `OPENCLAW_DOCKER_SOCKET`                   | 覆盖 Docker socket 路径                                 |
| `OPENCLAW_DISABLE_BONJOUR`                 | 禁用 Bonjour/mDNS 广播（Docker 默认为 `1`）             |
| `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS` | 禁用捆绑插件源绑定挂载覆盖                              |
| `OTEL_EXPORTER_OTLP_ENDPOINT`              | OpenTelemetry 导出的共享 OTLP/HTTP 收集器端点           |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT`            | 用于追踪、指标或日志的信号特定 OTLP 端点                |
| `OTEL_EXPORTER_OTLP_PROTOCOL`              | OTLP 协议覆盖。目前仅支持 `http/protobuf`               |
| `OTEL_SERVICE_NAME`                        | 用于 OpenTelemetry 资源的服务名称                       |
| `OTEL_SEMCONV_STABILITY_OPT_IN`            | 选择加入最新的实验性 GenAI 语义属性                     |
| `OPENCLAW_OTEL_PRELOADED`                  | 当已预加载一个时跳过启动第二个 OpenTelemetry SDK        |

维护者可以通过将一个插件源目录挂载到其打包源路径上来测试捆绑插件源与打包镜像，例如
`OPENCLAW_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro`。
该挂载的源目录会覆盖同一插件 id 的匹配编译后的 `/app/dist/extensions/synology-chat` 包。

### 可观测性

OpenTelemetry 导出是从 Gateway 容器向外传出到您的 OTLP 收集器。它不需要发布的 Docker 端口。如果您本地构建镜像并希望捆绑的 OpenTelemetry 导出器在镜像内可用，请包含其运行时依赖项：

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export OTEL_SERVICE_NAME="openclaw-gateway"
./scripts/docker/setup.sh
```

在启用导出之前，在打包的 Docker 安装中从 ClawHub 安装官方 `@openclaw/diagnostics-otel` 插件。自定义源构建的镜像仍然可以使用 `OPENCLAW_EXTENSIONS=diagnostics-otel` 包含本地插件源。要启用导出，在配置中允许并启用 `diagnostics-otel` 插件，然后设置 `diagnostics.otel.enabled=true` 或使用 [OpenTelemetry 导出](/gateway/opentelemetry) 中的配置示例。收集器认证标头通过 `diagnostics.otel.headers` 配置，而非通过 Docker 环境变量。

Prometheus 指标使用已发布的 Gateway 端口。安装 `clawhub:@openclaw/diagnostics-prometheus`，启用 `diagnostics-prometheus` 插件，然后抓取：

```text
http://<gateway-host>:18789/api/diagnostics/prometheus
```

该路由受 Gateway 认证保护。不要暴露单独的公共 `/metrics` 端口或未经认证的反向代理路径。请参见 [Prometheus 指标](/gateway/prometheus)。

### 健康检查

容器探针端点（无需认证）：

```bash
curl -fsS http://127.0.0.1:18789/healthz   # 存活探针
curl -fsS http://127.0.0.1:18789/readyz     # 就绪探针
```

Docker 镜像包含内置的 `HEALTHCHECK`，用于 ping `/healthz`。如果检查持续失败，Docker 将容器标记为 `unhealthy`，编排系统可以重启或替换它。

经过认证的深度健康快照：

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### LAN 与回环

`scripts/docker/setup.sh` 默认将 `OPENCLAW_GATEWAY_BIND=lan`，以便主机访问 `http://127.0.0.1:18789` 与 Docker 端口发布一起工作。

- `lan`（默认）：主机浏览器和主机 CLI 可以访问已发布的网关端口。
- `loopback`：只有容器网络命名空间内的进程才能直接访问网关。

<Note>
在 `gateway.bind` 中使用绑定模式值（`lan` / `loopback` / `custom` / `tailnet` / `auto`），而不是主机别名如 `0.0.0.0` 或 `127.0.0.1`。
</Note>

### 主机本地提供商

当 OpenClaw 在 Docker 中运行时，容器内的 `127.0.0.1` 是容器本身，而不是您的主机。使用 `host.docker.internal` 访问在主机上运行的 AI 提供商：

| 提供商    | 主机默认 URL             | Docker 设置 URL                     |
| --------- | ------------------------ | ----------------------------------- |
| LM Studio | `http://127.0.0.1:1234`  | `http://host.docker.internal:1234`  |
| Ollama    | `http://127.0.0.1:11434` | `http://host.docker.internal:11434` |

捆绑的 Docker 设置使用这些主机 URL 作为 LM Studio 和 Ollama 入门默认值，`docker-compose.yml` 将 `host.docker.internal` 映射到 Linux Docker Engine 的 Docker 主机网关。Docker Desktop 在 macOS 和 Windows 上已经提供相同的主机名。

主机服务还必须监听 Docker 可访问的地址：

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

如果您使用自己的 Compose 文件或 `docker run` 命令，请自己添加相同的主机映射，例如
`--add-host=host.docker.internal:host-gateway`。

### Bonjour / mDNS

Docker 桥接网络通常不能可靠地转发 Bonjour/mDNS 多播（`224.0.0.251:5353`）。因此捆绑的 Compose 设置默认 `OPENCLAW_DISABLE_BONJOUR=1`，这样 Gateway 在桥接丢弃多播流量时不会崩溃循环或反复重启广播。

对于 Docker 主机，使用已发布的 Gateway URL、Tailscale 或广域 DNS-SD。仅在使用主机网络、macvlan 或已知 mDNS 多播可以工作的其他网络时才设置 `OPENCLAW_DISABLE_BONJOUR=0`。

有关注意事项和故障排除，请参见 [Bonjour 发现](/gateway/bonjour)。

### 存储和持久化

Docker Compose 将 `OPENCLAW_CONFIG_DIR` 绑定挂载到 `/home/node/.openclaw`，将 `OPENCLAW_WORKSPACE_DIR` 绑定挂载到 `/home/node/.openclaw/workspace`，因此这些路径在容器替换后仍然存在。当任一变量未设置时，捆绑的 `docker-compose.yml` 回退到 `${HOME}/.openclaw`（工作区挂载使用 `${HOME}/.openclaw/workspace`），或在 `HOME` 也缺失时使用 `/tmp/.openclaw`。这防止 `docker compose up` 在裸环境中发出空源卷规格。

挂载的配置目录是 OpenClaw 保存以下内容的地方：

- `openclaw.json` 用于行为配置
- `agents/<agentId>/agent/auth-profiles.json` 用于存储的提供商 OAuth/API 密钥认证
- `.env` 用于环境变量支持的运行时密钥，如 `OPENCLAW_GATEWAY_TOKEN`

已安装的可下载插件将其包状态存储在挂载的 OpenClaw 主目录下，因此插件安装记录和包根目录在容器替换后仍然存在。Gateway 启动不会生成捆绑插件依赖树。

有关 VM 部署的完整持久化详情，请参见
[Docker VM 运行时 - 持久化内容](/install/docker-vm-runtime#what-persists-where)。

**磁盘增长热点：** 注意 `media/`、会话 JSONL 文件、`cron/runs/*.jsonl`、已安装插件包根目录以及 `/tmp/openclaw/` 下的滚动文件日志。

### Shell 辅助工具（可选）

为了更方便的日常 Docker 管理，安装 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果您从旧的 `scripts/shell-helpers/clawdock-helpers.sh` 原始路径安装了 ClawDock，请重新运行上面的安装命令，使您的本地辅助文件跟踪新位置。

然后使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等命令。运行 `clawdock-help` 查看所有命令。
完整辅助指南请参见 [ClawDock](/install/clawdock)。

<AccordionGroup>
  <Accordion title="为 Docker 网关启用代理沙箱">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    自定义 socket 路径（例如无根 Docker）：

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    脚本仅在沙箱先决条件通过后才挂载 `docker.sock`。如果沙箱设置无法完成，脚本将 `agents.defaults.sandbox.mode` 重置为 `off`。

  </Accordion>

  <Accordion title="自动化/CI（非交互式）">
    使用 `-T` 禁用 Compose 伪 TTY 分配：

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

  <Accordion title="共享网络安全注意事项">
    `openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，因此 CLI 命令可以通过 `127.0.0.1` 访问网关。将其视为共享信任边界。compose 配置在 `openclaw-cli` 上删除 `NET_RAW`/`NET_ADMIN` 并启用 `no-new-privileges`。
  </Accordion>

  <Accordion title="权限和 EACCES">
    镜像以 `node`（uid 1000）身份运行。如果您在 `/home/node/.openclaw` 上看到权限错误，请确保您的主机绑定挂载由 uid 1000 拥有：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

  </Accordion>

  <Accordion title="更快的重建">
    排列您的 Dockerfile 以便缓存依赖层。这样除非锁文件更改，否则可以避免重新运行 `pnpm install`：

    ```dockerfile
    FROM node:24-bookworm
    RUN curl -fsSL https://bun.sh/install | bash
    ENV PATH="/root/.bun/bin:${PATH}"
    RUN corepack enable
    WORKDIR /app
    COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
    COPY ui/package.json ./ui/package.json
    COPY scripts ./scripts
    RUN pnpm install --frozen-lockfile
    COPY . .
    RUN pnpm build
    RUN pnpm ui:install
    RUN pnpm ui:build
    ENV NODE_ENV=production
    CMD ["node","dist/index.js"]
    ```

  </Accordion>

  <Accordion title="高级用户容器选项">
    默认镜像以安全为先，以非 root `node` 身份运行。要获得功能更全面的容器：

    1. **持久化 `/home/node`**：`export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **烘焙系统依赖**：`export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"`
    3. **安装 Playwright 浏览器**：
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    4. **持久化浏览器下载**：设置
       `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` 并使用
       `OPENCLAW_HOME_VOLUME` 或 `OPENCLAW_EXTRA_MOUNTS`。

  </Accordion>

  <Accordion title="OpenAI Codex OAuth（无头 Docker）">
    如果您在向导中选择 OpenAI Codex OAuth，它会打开一个浏览器 URL。在 Docker 或无头设置中，复制您登陆的完整重定向 URL，并将其粘贴回向导以完成认证。
  </Accordion>

  <Accordion title="基础镜像元数据">
    主 Docker 运行时镜像使用 `node:24-bookworm-slim`，并发布 OCI 基础镜像注释，包括 `org.opencontainers.image.base.name`、`org.opencontainers.image.source` 等。Node 基础摘要通过 Dependabot Docker 基础镜像 PR 刷新；发布构建不运行发行版升级层。请参见
    [OCI 镜像注释](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

### 在 VPS 上运行？

有关共享 VM 部署步骤（包括二进制文件烘焙、持久化和更新），请参见 [Hetzner（Docker VPS）](/install/hetzner) 和
[Docker VM 运行时](/install/docker-vm-runtime)。

## 代理沙箱

当 `agents.defaults.sandbox` 通过 Docker 后端启用时，网关在隔离的 Docker 容器内运行代理工具执行（shell、文件读/写等），而网关本身保留在主机上。这在不容器化整个网关的情况下，为不受信任或多租户代理会话提供了一道硬墙。

沙箱范围可以是每代理（默认）、每会话或共享。每个范围在 `/workspace` 挂载有自己的工作区。您还可以配置允许/拒绝工具策略、网络隔离、资源限制和浏览器容器。

有关完整配置、镜像、安全注意事项和多代理配置文件，请参见：

- [沙箱化](/gateway/sandboxing) -- 完整沙箱参考
- [OpenShell](/gateway/openshell) -- 对沙箱容器的交互式 shell 访问
- [多代理沙箱和工具](/tools/multi-agent-sandbox-tools) -- 每代理覆盖

### 快速启用

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared
      },
    },
  },
}
```

构建默认沙箱镜像（从源代码检出）：

```bash
scripts/sandbox-setup.sh
```

对于没有源代码检出的 npm 安装，请参见 [沙箱化 § 镜像和设置](/gateway/sandboxing#images-and-setup) 以获取内联 `docker build` 命令。

## 故障排除

<AccordionGroup>
  <Accordion title="镜像缺失或沙箱容器未启动">
    使用
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    构建沙箱镜像（源代码检出）或从 [沙箱化 § 镜像和设置](/gateway/sandboxing#images-and-setup) 使用内联 `docker build` 命令（npm 安装），
    或将 `agents.defaults.sandbox.docker.image` 设置为您的自定义镜像。
    容器按需自动为每个会话创建。
  </Accordion>

  <Accordion title="沙箱中的权限错误">
    将 `docker.user` 设置为与挂载工作区所有权匹配的 UID:GID，或 chown 工作区文件夹。
  </Accordion>

  <Accordion title="沙箱中找不到自定义工具">
    OpenClaw 使用 `sh -lc`（登录 shell）运行命令，它会获取 `/etc/profile` 并可能重置 PATH。设置 `docker.env.PATH` 以在前面添加您的自定义工具路径，或在 Dockerfile 的 `/etc/profile.d/` 下添加脚本。
  </Accordion>

  <Accordion title="镜像构建期间 OOM 终止（exit 137）">
    虚拟机至少需要 2 GB RAM。使用更大的机器规格并重试。
  </Accordion>

  <Accordion title="Control UI 中出现未授权或需要配对">
    获取新的仪表板链接并批准浏览器设备：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多详情：[仪表板](/web/dashboard)、[设备](/cli/devices)。

  </Accordion>

  <Accordion title="网关目标显示 ws://172.x.x.x 或来自 Docker CLI 的配对错误">
    重置网关模式和绑定：

    ```bash
    docker compose run --rm openclaw-cli config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"}]'
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

## 相关

- [安装概述](/install) — 所有安装方法
- [Podman](/install/podman) — Docker 的 Podman 替代品
- [ClawDock](/install/clawdock) — Docker Compose 社区设置
- [更新](/install/updating) — 保持 OpenClaw 最新
- [配置](/gateway/configuration) — 安装后的网关配置
