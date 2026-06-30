---
summary: "`openclaw backup` 的 CLI 参考（创建本地备份归档）"
read_when:
  - 你想为本地 OpenClaw 状态创建一级备份归档
  - 你想在重置或卸载之前预览哪些路径会被包含
title: "Backup"
---

# `openclaw backup`

为 OpenClaw 的状态、配置、认证配置文件、频道/提供商凭证、会话以及可选的工作区创建本地备份归档。

```bash
openclaw backup create
openclaw backup create --output ~/Backups
openclaw backup create --dry-run --json
openclaw backup create --verify
openclaw backup create --no-include-workspace
openclaw backup create --only-config
openclaw backup verify ./2026-03-09T00-00-00.000Z-openclaw-backup.tar.gz
```

## 备注

- 归档包含一个 `manifest.json` 文件，其中包含已解析的源路径和归档布局。
- 默认输出是当前工作目录中带时间戳的 `.tar.gz` 归档。
- 如果当前工作目录在已备份的源树内，OpenClaw 会回退到你的主目录作为默认归档位置。
- 现有归档文件永远不会被覆盖。
- 位于源状态/工作区树内的输出路径会被拒绝，以避免自包含。
- `openclaw backup verify <archive>` 验证归档是否恰好包含一个根清单，拒绝遍历式归档路径，并检查清单中声明的每个有效载荷是否存在于 tarball 中。
- `openclaw backup create --verify` 在写入归档后立即运行该验证。
- `openclaw backup create --only-config` 仅备份活动 JSON 配置文件。

## 什么会被备份

`openclaw backup create` 从你的本地 OpenClaw 安装中规划备份源：

- OpenClaw 本地状态解析器返回的状态目录，通常是 `~/.openclaw`
- 活动配置文件路径
- 当凭证目录存在于状态目录之外时，解析到的 `credentials/` 目录
- 从当前配置中发现的工作区目录，除非你传递 `--no-include-workspace`

模型认证配置文件已经是状态目录的一部分（位于
`agents/<agentId>/agent/auth-profiles.json`），因此它们通常由状态备份条目覆盖。

如果你使用 `--only-config`，OpenClaw 会跳过状态、凭证目录和工作区发现，仅归档活动配置文件路径。

OpenClaw 在构建归档之前会规范化路径。如果配置、凭证目录或工作区已经位于状态目录内，它们不会作为单独的顶级备份源重复。缺失的路径会被跳过。

归档有效载荷存储来自这些源树的文件内容，嵌入的 `manifest.json` 记录了已解析的绝对源路径以及每个资产使用的归档布局。

状态目录 `extensions/` 树下已安装的插件源文件和清单文件会被包含，但它们嵌套的 `node_modules/` 依赖树会被跳过。这些依赖是可重建的安装工件；恢复归档后，当已恢复的插件报告缺少依赖时，使用 `openclaw plugins update <id>` 或用 `openclaw plugins install <spec> --force` 重新安装该插件。

## 无效配置行为

`openclaw backup` 故意绕过正常配置预检，以便在恢复期间仍然可以提供帮助。由于工作区发现依赖于有效配置，当配置文件存在但无效且工作区备份仍然启用时，`openclaw backup create` 现在会快速失败。

如果你仍然想在这种情况下进行部分备份，请重新运行：

```bash
openclaw backup create --no-include-workspace
```

这会将状态、配置和外部凭证目录保留在范围内，同时完全跳过工作区发现。

如果你只需要配置文件本身的副本，当配置格式错误时 `--only-config` 也有效，因为它不依赖于解析配置进行工作区发现。

## 大小和性能

OpenClaw 不强制执行内置的最大备份大小或每文件大小限制。

实际限制来自本地机器和目标文件系统：

- 临时归档写入加上最终归档的可用空间
- 遍历大型工作区树并将其压缩成 `.tar.gz` 所需的时间
- 如果你使用 `openclaw backup create --verify` 或运行 `openclaw backup verify`，重新扫描归档所需的时间
- 目标路径的文件系统行为。OpenClaw 优先采用无覆盖的硬链接发布步骤，在不支持硬链接时回退到独占复制

大型工作区通常是归档大小的主要驱动因素。如果你想要更小或更快的备份，请使用 `--no-include-workspace`。

如需最小归档，请使用 `--only-config`。

## 相关

- [CLI 参考](/cli)
