---
summary: "`openclaw setup` 的 CLI 参考（初始化配置 + 工作空间）"
read_when:
  - 你在没有完整 CLI 入门引导的情况下进行首次运行设置时
  - 你想设置默认工作空间路径时
title: "Setup"
---

# `openclaw setup`

初始化 `~/.openclaw/openclaw.json` 和代理工作空间。

相关：

- 入门指南：[Getting started](/start/getting-started)
- CLI 入门引导：[Onboarding (CLI)](/start/wizard)

## 示例

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## 选项

- `--workspace <dir>`：代理工作空间目录（存储为 `agents.defaults.workspace`）
- `--wizard`：运行入门引导
- `--non-interactive`：在没有提示的情况下运行入门引导
- `--mode <local|remote>`：入门引导模式
- `--import-from <provider>`：在入门引导期间运行的迁移提供商
- `--import-source <path>`：`--import-from` 的源代理主目录
- `--import-secrets`：在入门引导迁移期间导入支持的密钥
- `--remote-url <url>`：远程 Gateway WebSocket URL
- `--remote-token <token>`：远程 Gateway 令牌

通过 setup 运行入门引导：

```bash
openclaw setup --wizard
```

注意：

- 普通 `openclaw setup` 初始化配置 + 工作空间，不进行完整的入门引导流程。
- 普通 setup 后，运行 `openclaw configure` 选择模型、频道、Gateway、插件、技能或健康检查。
- 当任何入门引导标志存在时，入门引导会自动运行（`--wizard`、`--non-interactive`、`--mode`、`--import-from`、`--import-source`、`--import-secrets`、`--remote-url`、`--remote-token`）。
- 如果检测到 Hermes 状态，交互式入门引导可以自动提供迁移。导入入门引导需要全新的设置；对于入门引导之外的预演计划、备份和覆盖模式，使用 [Migrate](/cli/migrate)。

## 相关

- [CLI 参考](/cli)
- [安装概述](/install)
