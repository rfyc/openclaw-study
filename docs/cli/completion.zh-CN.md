---
summary: "`openclaw completion` 的 CLI 参考（生成/安装 shell 补全脚本）"
read_when:
  - 你想为 zsh/bash/fish/PowerShell 启用 shell 补全
  - 你需要在 OpenClaw 状态目录下缓存补全脚本
title: "Completion"
---

# `openclaw completion`

生成 shell 补全脚本，并可选择将其安装到你的 shell 配置文件中。

## 用法

```bash
openclaw completion
openclaw completion --shell zsh
openclaw completion --install
openclaw completion --shell fish --install
openclaw completion --write-state
openclaw completion --shell bash --write-state
```

## 选项

- `-s, --shell <shell>`：shell 目标（`zsh`、`bash`、`powershell`、`fish`；默认：`zsh`）
- `-i, --install`：通过在 shell 配置文件中添加 source 行来安装补全
- `--write-state`：将补全脚本写入 `$OPENCLAW_STATE_DIR/completions`，不打印到 stdout
- `-y, --yes`：跳过安装确认提示

## 备注

- `--install` 会在你的 shell 配置文件中写入一个小型的"OpenClaw Completion"块，并将其指向缓存的脚本。
- 不带 `--install` 或 `--write-state` 时，命令将脚本打印到 stdout。
- 补全生成会主动加载命令树，以便包含嵌套子命令。

## 相关

- [CLI 参考](/cli)
