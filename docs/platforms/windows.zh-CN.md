---
summary: "Windows 支持：原生和 WSL2 安装路径、守护进程和当前注意事项"
read_when:
  - 在 Windows 上安装 OpenClaw
  - 在原生 Windows 和 WSL2 之间选择
  - 查找 Windows 伴侣应用状态
title: "Windows"
---

OpenClaw 同时支持**原生 Windows** 和 **WSL2**。WSL2 是更
稳定的路径，推荐用于完整体验——CLI、Gateway 和
工具在 Linux 内部运行，完全兼容。原生 Windows 适用于
核心 CLI 和 Gateway 使用，有一些下面提到的注意事项。

原生 Windows 伴侣应用在计划中。

## WSL2（推荐）

- [入门指南](/start/getting-started)（在 WSL 内部使用）
- [安装与更新](/install/updating)
- 官方 WSL2 指南（Microsoft）：[https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## 原生 Windows 状态

原生 Windows CLI 流程正在改善，但 WSL2 仍然是推荐路径。

原生 Windows 今天工作良好的内容：

- 通过 `install.ps1` 的网站安装程序
- 本地 CLI 使用，如 `openclaw --version`、`openclaw doctor` 和 `openclaw plugins list --json`
- 嵌入的本地智能体/提供商冒烟测试，如：

```powershell
openclaw agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

当前注意事项：

- `openclaw onboard --non-interactive` 仍然期望一个可访问的本地网关，除非你传递 `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` 和 `openclaw gateway install` 首先尝试 Windows 计划任务
- 如果计划任务创建被拒绝，OpenClaw 回退到每用户启动文件夹登录项并立即启动网关
- 如果 `schtasks` 本身挂起或停止响应，OpenClaw 现在会快速中止该路径并回退，而不是永远挂起
- 计划任务在可用时仍然优先，因为它们提供更好的监督状态

如果你只想要原生 CLI，不需要网关服务安装，使用以下之一：

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

如果你确实想要原生 Windows 上的托管启动：

```powershell
openclaw gateway install
openclaw gateway status --json
```

如果计划任务创建被阻止，回退服务模式仍然在登录后通过当前用户的启动文件夹自动启动。

## Gateway

- [Gateway 运行手册](/gateway)
- [配置](/gateway/configuration)

## Gateway 服务安装（CLI）

在 WSL2 内部：

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

## Windows 登录前的 Gateway 自动启动

对于无头设置，确保即使没有人登录 Windows 也能运行完整的启动链。

### 1) 不登录时保持用户服务运行

在 WSL 内部：

```bash
sudo loginctl enable-linger "$(whoami)"
```

### 2) 安装 OpenClaw 网关用户服务

在 WSL 内部：

```bash
openclaw gateway install
```

### 3) 在 Windows 启动时自动启动 WSL

以管理员身份在 PowerShell 中：

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec /bin/true" /sc onstart /ru SYSTEM
```

将 `Ubuntu` 替换为以下命令中的你的发行版名称：

```powershell
wsl --list --verbose
```

### 验证启动链

重启后（Windows 登录之前），从 WSL 检查：

```bash
systemctl --user is-enabled openclaw-gateway.service
systemctl --user status openclaw-gateway.service --no-pager
```

## 高级：通过 LAN 暴露 WSL 服务（portproxy）

WSL 有自己的虚拟网络。如果另一台机器需要访问在 **WSL 内部**运行的服务（SSH、本地 TTS 服务器或 Gateway），你必须将 Windows 端口转发到当前 WSL IP。WSL IP 在重启后会改变，因此你可能需要刷新转发规则。

示例（以**管理员身份** PowerShell）：

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "WSL IP not found." }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

允许端口通过 Windows 防火墙（一次性）：

```powershell
New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

WSL 重启后刷新 portproxy：

```powershell
netsh interface portproxy delete v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 `
  connectaddress=$WslIp connectport=$TargetPort | Out-Null
```

注意：

- 从另一台机器 SSH 的目标是 **Windows 主机 IP**（示例：`ssh user@windows-host -p 2222`）。
- 远程节点必须指向**可访问的** Gateway URL（不是 `127.0.0.1`）；使用
  `openclaw status --all` 确认。
- 对于 LAN 访问使用 `listenaddress=0.0.0.0`；`127.0.0.1` 仅保持本地。
- 如果你想自动化，注册一个计划任务在登录时运行刷新
  步骤。

## 逐步 WSL2 安装

### 1) 安装 WSL2 + Ubuntu

打开 PowerShell（管理员）：

```powershell
wsl --install
# 或显式选择发行版：
wsl --list --online
wsl --install -d Ubuntu-24.04
```

如果 Windows 要求则重启。

### 2) 启用 systemd（网关安装必需）

在你的 WSL 终端中：

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

然后从 PowerShell：

```powershell
wsl --shutdown
```

重新打开 Ubuntu，然后验证：

```bash
systemctl --user status
```

### 3) 安装 OpenClaw（在 WSL 内部）

对于 WSL 内部的正常首次设置，按照 Linux 入门流程：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build
pnpm openclaw onboard --install-daemon
```

如果你是从源代码开发而不是首次引导，使用[设置](/start/setup)中的源代码开发循环：

```bash
pnpm install
# 仅首次运行（或重置本地 OpenClaw 配置/工作区后）
pnpm openclaw setup
pnpm gateway:watch
```

完整指南：[入门指南](/start/getting-started)

## Windows 伴侣应用

我们还没有 Windows 伴侣应用。如果你想帮助实现它，欢迎贡献。

## 相关

- [安装概览](/install)
- [平台](/platforms)
