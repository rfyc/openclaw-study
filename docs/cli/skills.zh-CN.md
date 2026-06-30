---
summary: "`openclaw skills` 的 CLI 参考（search/install/update/list/info/check）"
read_when:
  - 你想查看哪些技能可用且已准备好运行时
  - 你想从 ClawHub 搜索、安装或更新技能时
  - 你想调试技能的缺失二进制文件/环境/配置时
title: "Skills"
---

# `openclaw skills`

检查本地技能，并从 ClawHub 安装/更新技能。

相关：

- 技能系统：[Skills](/tools/skills)
- 技能配置：[Skills config](/tools/skills-config)
- ClawHub 安装：[ClawHub](/tools/clawhub)

## 命令

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install <slug> --force
openclaw skills install <slug> --agent <id>
openclaw skills update <slug>
openclaw skills update --all
openclaw skills update --all --agent <id>
openclaw skills list
openclaw skills list --eligible
openclaw skills list --json
openclaw skills list --verbose
openclaw skills list --agent <id>
openclaw skills info <name>
openclaw skills info <name> --json
openclaw skills info <name> --agent <id>
openclaw skills check
openclaw skills check --agent <id>
openclaw skills check --json
```

`search`/`install`/`update` 直接使用 ClawHub 并安装到活跃工作空间的 `skills/` 目录中。`list`/`info`/`check` 仍然检查当前工作空间和配置可见的本地技能。工作空间支持的命令从 `--agent <id>` 解析目标工作空间，然后是当前工作目录位于已配置的代理工作空间内时，最后是默认代理。

此 CLI `install` 命令从 ClawHub 下载技能文件夹。从入门引导或技能设置触发的 Gateway 支持的技能依赖项安装改用单独的 `skills.install` 请求路径。

注意：

- `search [query...]` 接受可选的查询；省略它以浏览默认的 ClawHub 搜索源。
- `search --limit <n>` 限制返回的结果数。
- `install --force` 覆盖相同 slug 的现有工作空间技能文件夹。
- `--agent <id>` 针对一个已配置的代理工作空间并覆盖当前工作目录推断。
- `update --all` 仅更新活跃工作空间中已跟踪的 ClawHub 安装。
- `check --agent <id>` 检查所选代理的工作空间，并报告哪些就绪的技能实际上对该代理的提示或命令界面可见。
- `list` 是未提供子命令时的默认操作。
- `list`、`info` 和 `check` 将其渲染输出写入 stdout。使用 `--json` 时，这意味着机器可读的有效负载保留在 stdout 上以供管道和脚本使用。

## 相关

- [CLI 参考](/cli)
- [技能](/tools/skills)
