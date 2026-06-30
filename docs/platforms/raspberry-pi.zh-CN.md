---
summary: "OpenClaw 在 Raspberry Pi 上（低成本自托管设置）"
read_when:
  - 在 Raspberry Pi 上设置 OpenClaw
  - 在 ARM 设备上运行 OpenClaw
  - 构建廉价的始终在线个人 AI
title: "Raspberry Pi（平台）"
---

# OpenClaw 在 Raspberry Pi 上

## 目标

在 Raspberry Pi 上运行持久化的、始终在线的 OpenClaw Gateway，**一次性成本约 $35-80**（无月费）。

非常适合：

- 24/7 个人 AI 助手
- 家庭自动化中心
- 低功耗、始终可用的 Telegram/WhatsApp 机器人

## 硬件要求

| Pi 型号         | 内存    | 是否可用 | 备注                         |
| --------------- | ------- | -------- | ---------------------------- |
| **Pi 5**        | 4GB/8GB | 最佳     | 最快，推荐                   |
| **Pi 4**        | 4GB     | 良好     | 大多数用户的最佳选择         |
| **Pi 4**        | 2GB     | 可用     | 可以工作，添加交换空间       |
| **Pi 4**        | 1GB     | 较紧     | 带交换空间可能工作，最小配置 |
| **Pi 3B+**      | 1GB     | 较慢     | 可以工作但缓慢               |
| **Pi Zero 2 W** | 512MB   | 不推荐   | 不推荐                       |

**最低规格：** 1GB RAM，1 核，500MB 磁盘
**推荐：** 2GB+ RAM，64 位操作系统，16GB+ SD 卡（或 USB SSD）

## 所需物品

- Raspberry Pi 4 或 5（推荐 2GB+）
- MicroSD 卡（16GB+）或 USB SSD（更好的性能）
- 电源（推荐官方 Pi 电源）
- 网络连接（以太网或 WiFi）
- 约 30 分钟

## 1) 烧录操作系统

使用 **Raspberry Pi OS Lite（64 位）** — 无头服务器不需要桌面。

1. 下载 [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. 选择操作系统：**Raspberry Pi OS Lite（64 位）**
3. 点击齿轮图标（⚙️）预配置：
   - 设置主机名：`gateway-host`
   - 启用 SSH
   - 设置用户名/密码
   - 配置 WiFi（如果不使用以太网）
4. 烧录到 SD 卡 / USB 驱动器
5. 插入并启动 Pi

## 2) 通过 SSH 连接

```bash
ssh user@gateway-host
# 或使用 IP 地址
ssh user@192.168.x.x
```

## 3) 系统设置

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必需包
sudo apt install -y git curl build-essential

# 设置时区（对定时/提醒很重要）
sudo timedatectl set-timezone America/Chicago  # 改为你的时区
```

## 4) 安装 Node.js 24（ARM64）

```bash
# 通过 NodeSource 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# 验证
node --version  # 应显示 v24.x.x
npm --version
```

## 5) 添加交换空间（对 2GB 或更少内存很重要）

交换空间可防止内存不足崩溃：

```bash
# 创建 2GB 交换文件
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 使永久生效
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 为低内存优化（减少交换倾向）
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 6) 安装 OpenClaw

### 选项 A：标准安装（推荐）

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

### 选项 B：可修改安装（用于研究）

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
npm run build
npm link
```

可修改安装让你直接访问日志和代码——对于调试 ARM 特定问题很有用。

## 7) 运行引导程序

```bash
openclaw onboard --install-daemon
```

按照向导操作：

1. **Gateway 模式：** 本地
2. **认证：** 推荐 API 密钥（OAuth 在无头 Pi 上可能有问题）
3. **频道：** Telegram 最容易开始
4. **守护进程：** 是（systemd）

## 8) 验证安装

```bash
# 检查状态
openclaw status

# 检查服务（标准安装 = systemd 用户单元）
systemctl --user status openclaw-gateway.service

# 查看日志
journalctl --user -u openclaw-gateway.service -f
```

## 9) 访问 OpenClaw 仪表板

将 `user@gateway-host` 替换为你的 Pi 用户名和主机名或 IP 地址。

在你的电脑上，要求 Pi 打印一个新的仪表板 URL：

```bash
ssh user@gateway-host 'openclaw dashboard --no-open'
```

命令打印 `Dashboard URL:`。根据 `gateway.auth.token`
的配置，URL 可能是普通的 `http://127.0.0.1:18789/` 链接，或包含 `#token=...` 的链接。

在你电脑的另一个终端中，创建 SSH 隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

然后在本地浏览器中打开打印的仪表板 URL。

如果 UI 要求共享密钥认证，将配置的令牌或密码粘贴到控制 UI 设置中。对于令牌认证，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。

要始终在线的远程访问，参见 [Tailscale](/gateway/tailscale)。

---

## 性能优化

### 使用 USB SSD（巨大改善）

SD 卡速度慢且会磨损。USB SSD 显著提高性能：

```bash
# 检查是否从 USB 启动
lsblk
```

参见 [Pi USB 启动指南](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot) 进行设置。

### 加速 CLI 启动（模块编译缓存）

在功率较低的 Pi 主机上，启用 Node 的模块编译缓存，以便重复的 CLI 运行更快：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

注意：

- `NODE_COMPILE_CACHE` 加速后续运行（`status`、`health`、`--help`）。
- `/var/tmp` 比 `/tmp` 在重启后更持久。
- `OPENCLAW_NO_RESPAWN=1` 避免 CLI 自我重生的额外启动成本。
- 第一次运行预热缓存；后续运行受益最多。

### systemd 启动调优（可选）

如果此 Pi 主要运行 OpenClaw，添加一个服务 drop-in 以减少重启
抖动并保持启动环境稳定：

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

然后应用：

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw-gateway.service
```

如果可能，将 OpenClaw 状态/缓存保存在 SSD 支持的存储上，以避免
冷启动期间的 SD 卡随机 I/O 瓶颈。

如果这是无头 Pi，一次性启用 lingering 以便用户服务在
注销后继续存活：

```bash
sudo loginctl enable-linger "$(whoami)"
```

`Restart=` 策略如何帮助自动恢复：
[systemd 可以自动化服务恢复](https://www.redhat.com/en/blog/systemd-automate-recovery)。

### 减少内存使用

```bash
# 禁用 GPU 内存分配（无头模式）
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt

# 如果不需要，禁用蓝牙
sudo systemctl disable bluetooth
```

### 监控资源

```bash
# 检查内存
free -h

# 检查 CPU 温度
vcgencmd measure_temp

# 实时监控
htop
```

---

## ARM 特定说明

### 二进制兼容性

大多数 OpenClaw 功能在 ARM64 上工作，但某些外部二进制文件可能需要 ARM 构建：

| 工具               | ARM64 状态 | 备注                                |
| ------------------ | ---------- | ----------------------------------- |
| Node.js            | 可用       | 工作良好                            |
| WhatsApp (Baileys) | 可用       | 纯 JS，没有问题                     |
| Telegram           | 可用       | 纯 JS，没有问题                     |
| gog (Gmail CLI)    | 需检查     | 检查 ARM 版本                       |
| Chromium（浏览器） | 可用       | `sudo apt install chromium-browser` |

如果某个技能失败，检查其二进制文件是否有 ARM 构建。许多 Go/Rust 工具有；某些没有。

### 32 位与 64 位

**始终使用 64 位操作系统。** Node.js 和许多现代工具需要它。检查方法：

```bash
uname -m
# 应显示：aarch64（64 位）而不是 armv7l（32 位）
```

---

## 推荐模型设置

由于 Pi 只是 Gateway（模型在云中运行），使用基于 API 的模型：

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-6",
        "fallbacks": ["openai/gpt-5.4-mini"]
      }
    }
  }
}
```

**不要尝试在 Pi 上运行本地 LLM** — 即使是小模型也太慢了。让 Claude/GPT 做繁重的工作。

---

## 开机自动启动

引导程序已设置此功能，但要验证：

```bash
# 检查服务是否已启用
systemctl --user is-enabled openclaw-gateway.service

# 如果没有则启用
systemctl --user enable openclaw-gateway.service

# 开机启动
systemctl --user start openclaw-gateway.service
```

---

## 故障排除

### 内存不足（OOM）

```bash
# 检查内存
free -h

# 添加更多交换空间（参见第 5 步）
# 或减少在 Pi 上运行的服务
```

### 性能缓慢

- 使用 USB SSD 而不是 SD 卡
- 禁用未使用的服务：`sudo systemctl disable cups bluetooth avahi-daemon`
- 检查 CPU 节流：`vcgencmd get_throttled`（应返回 `0x0`）

### 服务无法启动

```bash
# 检查日志
journalctl --user -u openclaw-gateway.service --no-pager -n 100

# 常见修复：重建
cd ~/openclaw  # 如果使用可修改安装
npm run build
systemctl --user restart openclaw-gateway.service
```

### ARM 二进制文件问题

如果某个技能以"exec format error"失败：

1. 检查二进制文件是否有 ARM64 构建
2. 尝试从源代码构建
3. 或使用支持 ARM 的 Docker 容器

### WiFi 掉线

对于 WiFi 上的无头 Pi：

```bash
# 禁用 WiFi 电源管理
sudo iwconfig wlan0 power off

# 使永久生效
echo 'wireless-power off' | sudo tee -a /etc/network/interfaces
```

---

## 成本比较

| 设置           | 一次性成本 | 月费     | 备注               |
| -------------- | ---------- | -------- | ------------------ |
| **Pi 4 (2GB)** | 约 $45     | $0       | + 电费（约 $5/年） |
| **Pi 4 (4GB)** | 约 $55     | $0       | 推荐               |
| **Pi 5 (4GB)** | 约 $60     | $0       | 最佳性能           |
| **Pi 5 (8GB)** | 约 $80     | $0       | 过剩但面向未来     |
| DigitalOcean   | $0         | $6/月    | $72/年             |
| Hetzner        | $0         | €3.79/月 | 约 $50/年          |

**回本时间：** Pi 与云 VPS 相比约 6-12 个月回本。

---

## 相关

- [Linux 指南](/platforms/linux) — 通用 Linux 设置
- [DigitalOcean 指南](/platforms/digitalocean) — 云替代方案
- [Hetzner 指南](/install/hetzner) — Docker 设置
- [Tailscale](/gateway/tailscale) — 远程访问
- [节点](/nodes) — 将你的笔记本电脑/手机与 Pi 网关配对
