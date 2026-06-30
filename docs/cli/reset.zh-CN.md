---
summary: "`openclaw reset` 的 CLI 参考（重置本地状态/配置）"
read_when:
  - 你想在保留 CLI 安装的同时清除本地状态时
  - 你想预演将删除的内容时
title: "Reset"
---

# `openclaw reset`

重置本地配置/状态（保留 CLI 已安装）。

选项：

- `--scope <scope>`：`config`、`config+creds+sessions` 或 `full`
- `--yes`：跳过确认提示
- `--non-interactive`：禁用提示；需要 `--scope` 和 `--yes`
- `--dry-run`：打印操作而不删除文件

示例：

```bash
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config --yes --non-interactive
openclaw reset --scope config+creds+sessions --yes --non-interactive
openclaw reset --scope full --yes --non-interactive
```

注意：

- 如果你想在删除本地状态之前获得可恢复的快照，请先运行 `openclaw backup create`。
- 如果省略 `--scope`，`openclaw reset` 使用交互式提示选择要删除的内容。
- `--non-interactive` 仅在同时设置 `--scope` 和 `--yes` 时有效。

## 相关

- [CLI 参考](/cli)
