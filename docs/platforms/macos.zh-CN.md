---
summary: "OpenClaw macOS 伴侣应用（菜单栏 + 网关代理）"
read_when:
  - 实现 macOS 应用功能
  - 在 macOS 上更改网关生命周期或节点桥接
title: "macOS 应用"
---

macOS 应用是 OpenClaw 的**菜单栏伴侣应用**。它拥有权限，
在本地管理/连接到 Gateway（launchd 或手动），并将 macOS
功能作为节点暴露给智能体。

## 功能

- 在菜单栏显示原生通知和状态。
- 拥有 TCC 提示（通知、辅助功能、屏幕录制、麦克风、
  语音识别、自动化/AppleScript）。
- 运行或连接到 Gateway（本地或远程）。
- 暴露 macOS 专属工具（画布、摄像头、屏幕录制、`system.run`）。
- 在**远程**模式下启动本地节点主机服务（launchd），在**本地**模式下停止它。
- 可选托管 **PeekabooBridge** 用于 UI 自动化。
- 通过 npm、pnpm 或 bun 按请求安装全局 CLI（`openclaw`）（应用优先 npm，然后 pnpm，然后 bun；Node 仍然是推荐的 Gateway 运行时）。

## 本地模式与远程模式

- **本地**（默认）：如果存在正在运行的本地 Gateway，应用连接到它；
  否则通过 `openclaw gateway install` 启用 launchd 服务。
- **远程**：应用通过 SSH/Tailscale 连接到 Gateway，从不启动
  本地进程。
  应用启动本地**节点主机服务**以便远程 Gateway 可以访问此 Mac。
  应用不将 Gateway 作为子进程启动。
  Gateway 发现现在优先使用 Tailscale MagicDNS 名称而不是原始尾网 IP，
  因此当尾网 IP 更改时 Mac 应用恢复更可靠。

## Launchd 控制

应用管理标记为 `ai.openclaw.gateway` 的每用户 LaunchAgent
（使用 `--profile`/`OPENCLAW_PROFILE` 时为 `ai.openclaw.<profile>`；旧版 `com.openclaw.*` 仍然卸载）。

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

运行命名配置文件时，将标签替换为 `ai.openclaw.<profile>`。

如果 LaunchAgent 未安装，从应用启用它或运行
`openclaw gateway install`。

## 节点功能（Mac）

macOS 应用将自己呈现为节点。常用命令：

- 画布：`canvas.present`、`canvas.navigate`、`canvas.eval`、`canvas.snapshot`、`canvas.a2ui.*`
- 摄像头：`camera.snap`、`camera.clip`
- 屏幕：`screen.snapshot`、`screen.record`
- 系统：`system.run`、`system.notify`

节点报告 `permissions` 映射以便智能体可以决定什么是允许的。

节点服务 + 应用 IPC：

- 当无头节点主机服务运行时（远程模式），它作为节点连接到 Gateway WS。
- `system.run` 在 macOS 应用（UI/TCC 上下文）中通过本地 Unix 套接字执行；提示 + 输出保留在应用内。

图表（SCI）：

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## 执行批准（system.run）

`system.run` 由 macOS 应用中的**执行批准**控制（设置 → 执行批准）。
安全 + 询问 + 允许列表在 Mac 本地存储在：

```
~/.openclaw/exec-approvals.json
```

示例：

```json
{
  "version": 1,
  "defaults": {
    "security": "deny",
    "ask": "on-miss"
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "allowlist": [{ "pattern": "/opt/homebrew/bin/rg" }]
    }
  }
}
```

注意：

- `allowlist` 条目是已解析二进制路径的 glob 模式，或 PATH 调用命令的裸命令名。
- 包含 shell 控制或扩展语法（`&&`、`||`、`;`、`|`、`` ` ``、`$`、`<`、`>`、`(`、`)`）的原始 shell 命令文本被视为允许列表未命中，需要显式批准（或将 shell 二进制文件加入允许列表）。
- 在提示中选择"始终允许"将该命令添加到允许列表。
- `system.run` 环境覆盖被过滤（丢弃 `PATH`、`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`），然后与应用的环境合并。
- 对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围的环境覆盖被减少到一个小型显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 对于允许列表模式下的始终允许决策，已知的调度包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）持久化内部可执行文件路径而不是包装器路径。如果解包不安全，则不会自动持久化允许列表条目。

## 深度链接

应用为本地操作注册 `openclaw://` URL 方案。

### `openclaw://agent`

触发 Gateway `agent` 请求。

```bash
open 'openclaw://agent?message=Hello%20from%20deep%20link'
```

查询参数：

- `message`（必需）
- `sessionKey`（可选）
- `thinking`（可选）
- `deliver` / `to` / `channel`（可选）
- `timeoutSeconds`（可选）
- `key`（可选无人值守模式密钥）

安全：

- 没有 `key` 时，应用提示确认。
- 没有 `key` 时，应用对确认提示强制执行短消息限制，并忽略 `deliver` / `to` / `channel`。
- 有有效的 `key` 时，运行是无人值守的（用于个人自动化）。

## 引导流程（典型）

1. 安装并启动 **OpenClaw.app**。
2. 完成权限清单（TCC 提示）。
3. 确保**本地**模式已活跃且 Gateway 正在运行。
4. 如果需要终端访问，安装 CLI。

## 状态目录位置（macOS）

避免将 OpenClaw 状态目录放在 iCloud 或其他云同步文件夹中。
同步支持的路径可能会增加延迟，偶尔会导致
会话和凭据的文件锁/同步竞争。

优先使用本地未同步的状态路径，例如：

```bash
OPENCLAW_STATE_DIR=~/.openclaw
```

如果 `openclaw doctor` 在以下位置检测到状态：

- `~/Library/Mobile Documents/com~apple~CloudDocs/...`
- `~/Library/CloudStorage/...`

它将警告并建议移回本地路径。

## 构建与开发工作流（原生）

- `cd apps/macos && swift build`
- `swift run OpenClaw`（或 Xcode）
- 打包应用：`scripts/package-mac-app.sh`

## 调试网关连接（macOS CLI）

使用调试 CLI 来练习 macOS 应用使用的相同 Gateway WebSocket 握手和发现
逻辑，无需启动应用。

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

连接选项：

- `--url <ws://host:port>`：覆盖配置
- `--mode <local|remote>`：从配置解析（默认：配置或本地）
- `--probe`：强制进行新的健康探测
- `--timeout <ms>`：请求超时（默认：`15000`）
- `--json`：用于对比的结构化输出

发现选项：

- `--include-local`：包括会被过滤为"本地"的网关
- `--timeout <ms>`：整体发现窗口（默认：`2000`）
- `--json`：用于对比的结构化输出

<Tip>
与 `openclaw gateway discover --json` 比较，查看 macOS 应用的发现管道（`local.` 加上配置的广域域，带有广域和 Tailscale Serve 回退）是否与 Node CLI 基于 `dns-sd` 的发现不同。
</Tip>

## 远程连接管道（SSH 隧道）

macOS 应用在**远程**模式下运行时，打开 SSH 隧道以便本地 UI
组件可以像访问本地主机一样访问远程 Gateway。

### 控制隧道（Gateway WebSocket 端口）

- **用途：** 健康检查、状态、Web Chat、配置和其他控制平面调用。
- **本地端口：** Gateway 端口（默认 `18789`），始终稳定。
- **远程端口：** 远程主机上的相同 Gateway 端口。
- **行为：** 无随机本地端口；应用重用现有的健康隧道
  或在需要时重启它。
- **SSH 形状：** `ssh -N -L <local>:127.0.0.1:<remote>` 带有 BatchMode +
  ExitOnForwardFailure + keepalive 选项。
- **IP 报告：** SSH 隧道使用环回，因此网关将看到节点
  IP 为 `127.0.0.1`。如果你想要真实的客户端 IP 出现，使用**直连（ws/wss）**
  传输（参见 [macOS 远程访问](/platforms/mac/remote)）。

设置步骤，参见 [macOS 远程访问](/platforms/mac/remote)。协议
详情，参见 [Gateway 协议](/gateway/protocol)。

## 相关文档

- [Gateway 运行手册](/gateway)
- [Gateway（macOS）](/platforms/mac/bundled-gateway)
- [macOS 权限](/platforms/mac/permissions)
- [画布](/platforms/mac/canvas)
