---
summary: "OpenClaw 的高级设置和开发工作流"
read_when:
  - 设置新机器
  - 您希望获得"最新最好的"而不破坏个人设置
title: "设置"
---

<Note>
如果您是第一次设置，请从[入门](/start/getting-started)开始。
有关入门详情，请参见[入门（CLI）](/start/wizard)。
</Note>

## 简要说明

根据您希望更新频率和是否要自己运行 Gateway 来选择设置工作流：

- **个性化定制在仓库之外：** 将您的配置和工作区保存在 `~/.openclaw/openclaw.json` 和 `~/.openclaw/workspace/` 中，这样仓库更新不会影响它们。
- **稳定工作流（大多数人推荐）：** 安装 macOS 应用，让它运行捆绑的 Gateway。
- **前沿工作流（开发）：** 通过 `pnpm gateway:watch` 自行运行 Gateway，然后让 macOS 应用在本地模式下连接。

## 从源代码安装的前提条件

- 推荐 Node 24（Node 22 LTS，目前 `22.14+`，仍受支持）
- 源代码检出需要 `pnpm`。OpenClaw 在开发模式下从 `extensions/*` pnpm 工作区包加载捆绑插件，因此根目录 `npm install` 不会准备完整的源代码树。
- Docker（可选；仅用于容器化设置/e2e——参见 [Docker](/install/docker)）

## 定制策略（使更新不会造成损害）

如果您想要"100% 为我定制"*并且*方便更新，请将您的定制保存在：

- **配置：** `~/.openclaw/openclaw.json`（JSON/JSON5 格式）
- **工作区：** `~/.openclaw/workspace`（技能、提示、记忆；将其设为私有 git 仓库）

一次性引导：

```bash
openclaw setup
```

在此仓库内部，使用本地 CLI 入口：

```bash
openclaw setup
```

如果您还没有全局安装，通过 `pnpm openclaw setup` 运行。

## 从此仓库运行 Gateway

`pnpm build` 之后，您可以直接运行打包的 CLI：

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## 稳定工作流（macOS 应用优先）

1. 安装并启动 **OpenClaw.app**（菜单栏）。
2. 完成入门/权限检查清单（TCC 提示）。
3. 确保 Gateway 为**本地**并运行（应用负责管理）。
4. 链接渠道（示例：WhatsApp）：

```bash
openclaw channels login
```

5. 健全性检查：

```bash
openclaw health
```

如果您的构建中没有入门：

- 运行 `openclaw setup`，然后 `openclaw channels login`，然后手动启动 Gateway（`openclaw gateway`）。

## 前沿工作流（终端中的 Gateway）

目标：在 TypeScript Gateway 上工作，获得热重载，让 macOS 应用 UI 保持连接。

### 0）（可选）也从源代码运行 macOS 应用

如果您也想让 macOS 应用保持在前沿：

```bash
./scripts/restart-mac.sh
```

### 1）启动开发 Gateway

```bash
pnpm install
# 仅首次运行（或重置本地 OpenClaw 配置/工作区后）
pnpm openclaw setup
pnpm gateway:watch
```

`gateway:watch` 在命名的 tmux 会话中启动或重启 Gateway 监视进程，并从交互式终端自动连接。非交互式 shell 保持分离并打印 `tmux attach -t openclaw-gateway-watch-main`；使用 `OPENCLAW_GATEWAY_WATCH_ATTACH=0 pnpm gateway:watch` 使交互式运行保持分离，或使用 `pnpm gateway:watch:raw` 进行前台监视模式。监视器在相关源、配置和捆绑插件元数据更改时重新加载。如果被监视的 Gateway 在启动期间退出，`gateway:watch` 会运行 `openclaw doctor --fix --non-interactive` 一次然后重试；设置 `OPENCLAW_GATEWAY_WATCH_AUTO_DOCTOR=0` 可禁用该仅开发的修复过程。`pnpm openclaw setup` 是全新检出的一次性本地配置/工作区初始化步骤。`pnpm gateway:watch` 不会重建 `dist/control-ui`，因此在 `ui/` 更改后重新运行 `pnpm ui:build`，或在开发 Control UI 时使用 `pnpm ui:dev`。

### 2）将 macOS 应用指向您运行的 Gateway

在 **OpenClaw.app** 中：

- 连接模式：**本地**
  应用将连接到配置端口上运行的 gateway。

### 3）验证

- 应用内 Gateway 状态应显示 **"使用现有 gateway ……"**
- 或通过 CLI：

```bash
openclaw health
```

### 常见陷阱

- **错误端口：** Gateway WS 默认为 `ws://127.0.0.1:18789`；让应用和 CLI 保持在同一端口。
- **状态所在位置：**
  - 渠道/提供商状态：`~/.openclaw/credentials/`
  - 模型认证配置文件：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - 会话：`~/.openclaw/agents/<agentId>/sessions/`
  - 日志：`/tmp/openclaw/`

## 凭据存储映射

调试认证或决定备份内容时使用此映射：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram 机器人令牌**：配置/环境或 `channels.telegram.tokenFile`（仅普通文件；拒绝符号链接）
- **Discord 机器人令牌**：配置/环境或 SecretRef（env/file/exec 提供商）
- **Slack 令牌**：配置/环境（`channels.slack.*`）
- **配对允许列表**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（默认账户）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非默认账户）
- **模型认证配置文件**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **文件支持的秘密有效载荷（可选）**：`~/.openclaw/secrets.json`
- **旧版 OAuth 导入**：`~/.openclaw/credentials/oauth.json`
  更多详情：[安全](/gateway/security#credential-storage-map)。

## 更新（不破坏您的设置）

- 将 `~/.openclaw/workspace` 和 `~/.openclaw/` 作为"您的东西"；不要将个人提示/配置放入 `openclaw` 仓库。
- 更新源代码：`git pull` + `pnpm install` + 继续使用 `pnpm gateway:watch`。

## Linux（systemd 用户服务）

Linux 安装使用 systemd **用户**服务。默认情况下，systemd 在注销/空闲时停止用户服务，这会终止 Gateway。入门尝试为您启用延迟（可能提示输入 sudo）。如果仍然关闭，运行：

```bash
sudo loginctl enable-linger $USER
```

对于始终在线或多用户服务器，考虑使用**系统**服务而非用户服务（不需要延迟）。有关 systemd 说明，请参见 [Gateway 运行手册](/gateway)。

## 相关文档

- [Gateway 运行手册](/gateway)（标志、监督、端口）
- [Gateway 配置](/gateway/configuration)（配置模式 + 示例）
- [Discord](/channels/discord) 和 [Telegram](/channels/telegram)（回复标签 + replyToMode 设置）
- [OpenClaw 助手设置](/start/openclaw)
- [macOS 应用](/platforms/macos)（gateway 生命周期）
