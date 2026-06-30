---
summary: "`openclaw doctor` 的 CLI 参考（健康检查 + 引导修复）"
read_when:
  - 你遇到连接/认证问题并想要引导修复
  - 你更新后想进行健全性检查
title: "Doctor"
---

# `openclaw doctor`

Gateway 和频道的健康检查 + 快速修复。

相关：

- 故障排除：[Troubleshooting](/gateway/troubleshooting)
- 安全审计：[Security](/gateway/security)

## 示例

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
openclaw doctor --repair --non-interactive
openclaw doctor --generate-gateway-token
```

## 选项

- `--no-workspace-suggestions`：禁用工作区记忆/搜索建议
- `--yes`：不提示直接接受默认值
- `--repair`：无需提示应用推荐的非服务修复；Gateway 服务安装和重写仍需要交互式确认或显式 gateway 命令
- `--fix`：`--repair` 的别名
- `--force`：应用积极的修复，包括在需要时覆盖自定义服务配置
- `--non-interactive`：无提示运行；仅安全迁移和非服务修复
- `--generate-gateway-token`：生成并配置 gateway 令牌
- `--deep`：扫描系统服务以查找额外的 gateway 安装

备注：

- 交互式提示（如密钥链/OAuth 修复）仅在 stdin 为 TTY 且**未**设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）将跳过提示。
- 性能：非交互式 `doctor` 运行跳过主动插件加载，以便无头健康检查保持快速。交互式会话在检查需要插件贡献时仍然完全加载插件。
- `--fix`（`--repair` 的别名）将备份写入 `~/.openclaw/openclaw.json.bak` 并删除未知配置键，列出每次删除。
- `doctor --fix --non-interactive` 报告缺失或陈旧的 gateway 服务定义，但不在更新修复模式之外安装或重写它们。运行 `openclaw gateway install` 处理缺失的服务，或在你有意想替换启动器时运行 `openclaw gateway install --force`。
- 状态完整性检查现在检测会话目录中的孤立对话记录文件。将其归档为 `.deleted.<timestamp>` 需要交互式确认；`--fix`、`--yes` 和无头运行会保留它们原地。
- Doctor 还扫描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的遗留 cron 作业形状，并可以在调度器在运行时自动规范化它们之前就地重写它们。
- 在 Linux 上，当用户的 crontab 仍然运行遗留的 `~/.openclaw/bin/ensure-whatsapp.sh` 时，doctor 会发出警告；该脚本不再维护，当 cron 缺少 systemd 用户总线环境时可能会记录虚假的 WhatsApp gateway 中断。
- Doctor 清理由旧版 OpenClaw 创建的遗留插件依赖暂存状态。它还在注册表可以解析时修复缺失的已配置可下载插件，2026.5.2 doctor 遍历会自动安装旧版配置已使用的可下载插件，然后再将配置标记为该版本已触及。如果下载失败，doctor 报告安装错误并保留已配置的插件条目以供下次修复尝试。
- Doctor 通过从 `plugins.allow`/`plugins.entries` 中删除缺失的插件 ID，以及在插件发现健康时删除匹配的悬空频道配置、心跳目标和频道模型覆盖，来修复陈旧的插件配置。
- Doctor 通过禁用受影响的 `plugins.entries.<id>` 条目并删除其无效的 `config` 有效载荷来隔离无效的插件配置。Gateway 启动已经仅跳过那个坏插件，以便其他插件和频道可以继续运行。
- 当另一个监督器拥有 gateway 生命周期时，设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。Doctor 仍然报告 gateway/服务健康并应用非服务修复，但跳过服务安装/启动/重启/引导和遗留服务清理。
- 在 Linux 上，doctor 忽略非活动的额外类似 gateway 的 systemd 单元，并在修复期间不重写运行中的 systemd gateway 服务的命令/入口点元数据。如果你有意想替换活动启动器，请先停止服务或使用 `openclaw gateway install --force`。
- Doctor 自动迁移遗留的扁平 Talk 配置（`talk.voiceId`、`talk.modelId` 等）到 `talk.provider` + `talk.providers.<provider>`。
- 重复的 `doctor --fix` 运行不再在唯一差异是对象键顺序时报告/应用 Talk 规范化。
- Doctor 包含记忆搜索就绪检查，当缺少嵌入凭证时可以推荐 `openclaw configure --section model`。
- 当没有配置命令所有者时，Doctor 会发出警告。命令所有者是允许运行所有者专属命令和审批危险操作的人类操作员账户。DM 配对只允许某人与机器人对话；如果你在首个所有者引导存在之前审批了一个发件人，请显式设置 `commands.ownerAllowFrom`。
- 当配置了 Codex 模式 agent 且操作员的 Codex home 中存在个人 Codex CLI 资产时，Doctor 会发出警告。本地 Codex app-server 启动使用每个 agent 隔离的 home，因此使用 `openclaw migrate codex --dry-run` 来清点应该有意提升的资产。
- 当默认 agent 允许的技能由于 bin、env 变量、配置或 OS 要求缺失而在当前运行时环境中不可用时，Doctor 会发出警告。`doctor --fix` 可以用 `skills.entries.<skill>.enabled=false` 禁用那些不可用的技能；当你想保留技能活跃时，请安装/配置缺少的要求。
- 如果沙箱模式已启用但 Docker 不可用，doctor 会报告高信号警告并提供修复方案（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果存在遗留沙箱注册表文件（`~/.openclaw/sandbox/containers.json` 或 `~/.openclaw/sandbox/browsers.json`），doctor 会报告它们；`openclaw doctor --fix` 会将有效条目迁移到分片注册表目录，并隔离无效的遗留文件。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理且在当前命令路径中不可用，doctor 会报告只读警告，并且不会写入明文回退凭证。
- 如果修复路径中的频道 SecretRef 检查失败，doctor 继续运行并报告警告，而不是提前退出。
- 在状态目录迁移后，当启用的默认 Telegram 或 Discord 账户依赖 env 回退且 `TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN` 对 doctor 进程不可用时，doctor 会发出警告。
- Telegram `allowFrom` 用户名自动解析（`doctor --fix`）需要当前命令路径中的可解析 Telegram 令牌。如果令牌检查不可用，doctor 会报告警告并跳过该遍历的自动解析。

## macOS：`launchctl` env 覆盖

如果你之前运行了 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），该值会覆盖你的配置文件并可能导致持久的"未授权"错误。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## 相关

- [CLI 参考](/cli)
- [Gateway doctor](/gateway/doctor)
