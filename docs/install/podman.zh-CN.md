---
summary: "在无根 Podman 容器中运行 OpenClaw"
read_when:
  - 您想用 Podman 而非 Docker 运行容器化网关
title: "Podman"
---

在无根 Podman 容器中运行 OpenClaw 网关，由当前非 root 用户管理。

预期模型如下：

- Podman 运行网关容器。
- 宿主机上的 `openclaw` CLI 是控制平面。
- 持久状态默认存储在宿主机的 `~/.openclaw` 下。
- 日常管理使用 `openclaw --container <name> ...` 而非 `sudo -u openclaw`、`podman exec` 或独立的服务用户。

## 前提条件

- 无根模式的 **Podman**
- 宿主机上已安装 **OpenClaw CLI**
- **可选：** `systemd --user`（如需 Quadlet 管理的自动启动）
- **可选：** `sudo`（仅在无头宿主机上需要 `loginctl enable-linger "$(whoami)"` 以实现开机持久化）

## 快速开始

<Steps>
  <Step title="一次性设置">
    从仓库根目录运行 `./scripts/podman/setup.sh`。
  </Step>

  <Step title="启动网关容器">
    使用 `./scripts/run-openclaw-podman.sh launch` 启动容器。
  </Step>

  <Step title="在容器内运行入门向导">
    运行 `./scripts/run-openclaw-podman.sh launch setup`，然后打开 `http://127.0.0.1:18789/`。
  </Step>

  <Step title="从宿主机 CLI 管理运行中的容器">
    设置 `OPENCLAW_CONTAINER=openclaw`，然后从宿主机使用普通的 `openclaw` 命令。
  </Step>
</Steps>

设置详情：

- `./scripts/podman/setup.sh` 默认在您的无根 Podman 存储中构建 `openclaw:local`，如果设置了 `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE` 则使用该镜像。
- 如果 `~/.openclaw/openclaw.json` 不存在，它会创建并设置 `gateway.mode: "local"`。
- 如果 `~/.openclaw/.env` 不存在，它会创建并写入 `OPENCLAW_GATEWAY_TOKEN`。
- 对于手动启动，辅助脚本仅从 `~/.openclaw/.env` 读取少量 Podman 相关键，并将显式运行时环境变量传递给容器；它不会将整个 env 文件交给 Podman。

Quadlet 管理的设置：

```bash
./scripts/podman/setup.sh --quadlet
```

Quadlet 仅适用于 Linux，因为它依赖 systemd 用户服务。

您也可以设置 `OPENCLAW_PODMAN_QUADLET=1`。

可选的构建/设置环境变量：

- `OPENCLAW_IMAGE` 或 `OPENCLAW_PODMAN_IMAGE` -- 使用现有/拉取的镜像而非构建 `openclaw:local`
- `OPENCLAW_DOCKER_APT_PACKAGES` -- 在镜像构建期间安装额外的 apt 包
- `OPENCLAW_EXTENSIONS` -- 在构建时预安装插件依赖项
- `OPENCLAW_INSTALL_BROWSER` -- 预安装 Chromium 和 Xvfb 用于浏览器自动化（设置为 `1` 以启用）

启动容器：

```bash
./scripts/run-openclaw-podman.sh launch
```

该脚本以您当前的 uid/gid 启动容器，使用 `--userns=keep-id` 并将您的 OpenClaw 状态绑定挂载到容器中。

入门向导：

```bash
./scripts/run-openclaw-podman.sh launch setup
```

然后打开 `http://127.0.0.1:18789/` 并使用 `~/.openclaw/.env` 中的令牌。

宿主机 CLI 默认值：

```bash
export OPENCLAW_CONTAINER=openclaw
```

然后以下命令将自动在该容器内运行：

```bash
openclaw dashboard --no-open
openclaw gateway status --deep   # 包含额外的服务扫描
openclaw doctor
openclaw channels login
```

在 macOS 上，Podman machine 可能会让浏览器对网关显示为非本地。
如果启动后 Control UI 报告设备认证错误，请参照 [Podman + Tailscale](#podman--tailscale) 中的指导。

<a id="podman--tailscale"></a>

## Podman + Tailscale

对于 HTTPS 或远程浏览器访问，请参阅主要的 Tailscale 文档。

Podman 特定注意事项：

- 保持 Podman 发布主机为 `127.0.0.1`。
- 优先使用宿主机管理的 `tailscale serve` 而非 `openclaw gateway --tailscale serve`。
- 在 macOS 上，如果本地浏览器设备认证上下文不可靠，请使用 Tailscale 访问而非临时的本地隧道方案。

参见：

- [Tailscale](/gateway/tailscale)
- [Control UI](/web/control-ui)

## Systemd（Quadlet，可选）

如果您运行了 `./scripts/podman/setup.sh --quadlet`，设置会在以下位置安装 Quadlet 文件：

```bash
~/.config/containers/systemd/openclaw.container
```

常用命令：

- **启动：** `systemctl --user start openclaw.service`
- **停止：** `systemctl --user stop openclaw.service`
- **状态：** `systemctl --user status openclaw.service`
- **日志：** `journalctl --user -u openclaw.service -f`

编辑 Quadlet 文件后：

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw.service
```

对于 SSH/无头宿主机的开机持久化，为当前用户启用 lingering：

```bash
sudo loginctl enable-linger "$(whoami)"
```

## 配置、环境变量和存储

- **配置目录：** `~/.openclaw`
- **工作区目录：** `~/.openclaw/workspace`
- **令牌文件：** `~/.openclaw/.env`
- **启动辅助脚本：** `./scripts/run-openclaw-podman.sh`

启动脚本和 Quadlet 将宿主机状态绑定挂载到容器中：

- `OPENCLAW_CONFIG_DIR` -> `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR` -> `/home/node/.openclaw/workspace`

默认情况下这些是宿主机目录，而非匿名的容器状态，因此 `openclaw.json`、每个代理的 `auth-profiles.json`、频道/提供商状态、会话和工作区在容器替换后仍然存在。Podman 设置还为发布网关端口上的 `127.0.0.1` 和 `localhost` 设置了 `gateway.controlUi.allowedOrigins`，以便本地仪表板与容器的非回环绑定配合工作。

手动启动器的有用环境变量：

- `OPENCLAW_PODMAN_CONTAINER` -- 容器名称（默认为 `openclaw`）
- `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` -- 要运行的镜像
- `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` -- 映射到容器 `18789` 的宿主机端口
- `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` -- 映射到容器 `18790` 的宿主机端口
- `OPENCLAW_PODMAN_PUBLISH_HOST` -- 发布端口的宿主机接口；默认为 `127.0.0.1`
- `OPENCLAW_GATEWAY_BIND` -- 容器内的网关绑定模式；默认为 `lan`
- `OPENCLAW_PODMAN_USERNS` -- `keep-id`（默认）、`auto` 或 `host`

手动启动器在确定容器/镜像默认值之前会读取 `~/.openclaw/.env`，因此您可以在该文件中持久化这些配置。

如果您使用了非默认的 `OPENCLAW_CONFIG_DIR` 或 `OPENCLAW_WORKSPACE_DIR`，请在 `./scripts/podman/setup.sh` 和后续的 `./scripts/run-openclaw-podman.sh launch` 命令中设置相同的变量。仓库本地启动器不会跨 shell 持久化自定义路径覆盖。

Quadlet 注意事项：

- 生成的 Quadlet 服务有意保持固定的、经过强化的默认形状：`127.0.0.1` 发布端口、容器内 `--bind lan`，以及 `keep-id` 用户命名空间。
- 它固定 `OPENCLAW_NO_RESPAWN=1`、`Restart=on-failure` 和 `TimeoutStartSec=300`。
- 它发布 `127.0.0.1:18789:18789`（网关）和 `127.0.0.1:18790:18790`（桥接）。
- 它将 `~/.openclaw/.env` 作为运行时 `EnvironmentFile` 读取，用于 `OPENCLAW_GATEWAY_TOKEN` 等值，但不使用手动启动器的 Podman 特定覆盖允许列表。
- 如果您需要自定义发布端口、发布主机或其他容器运行标志，请使用手动启动器或直接编辑 `~/.config/containers/systemd/openclaw.container`，然后重新加载并重启服务。

## 常用命令

- **容器日志：** `podman logs -f openclaw`
- **停止容器：** `podman stop openclaw`
- **删除容器：** `podman rm -f openclaw`
- **从宿主机 CLI 打开仪表板 URL：** `openclaw dashboard --no-open`
- **通过宿主机 CLI 进行健康/状态检查：** `openclaw gateway status --deep`（RPC 探测 + 额外服务扫描）

## 故障排除

- **配置或工作区权限被拒绝（EACCES）：** 容器默认以 `--userns=keep-id` 和 `--user <your uid>:<your gid>` 运行。确保宿主机配置/工作区路径由您当前的用户拥有。
- **网关启动被阻止（缺少 `gateway.mode=local`）：** 确保 `~/.openclaw/openclaw.json` 存在并设置了 `gateway.mode="local"`。`scripts/podman/setup.sh` 会在缺失时创建此文件。
- **容器 CLI 命令命中了错误目标：** 使用 `openclaw --container <name> ...` 显式指定，或在 shell 中导出 `OPENCLAW_CONTAINER=<name>`。
- **`openclaw update` 在使用 `--container` 时失败：** 这是预期行为。重新构建/拉取镜像，然后重启容器或 Quadlet 服务。
- **Quadlet 服务无法启动：** 运行 `systemctl --user daemon-reload`，然后 `systemctl --user start openclaw.service`。在无头系统上您可能还需要 `sudo loginctl enable-linger "$(whoami)"`。
- **SELinux 阻止绑定挂载：** 保留默认挂载行为；启动器在 SELinux 为 enforcing 或 permissive 模式时会在 Linux 上自动添加 `:Z`。

## 相关

- [Docker](/install/docker)
- [网关后台进程](/gateway/background-process)
- [网关故障排除](/gateway/troubleshooting)
