---
summary: "`openclaw pairing` 的 CLI 参考（批准/列出配对请求）"
read_when:
  - 你在使用配对模式 DM 并需要批准发件人时
title: "Pairing"
---

# `openclaw pairing`

批准或检查 DM 配对请求（适用于支持配对的频道）。

相关：

- 配对流程：[Pairing](/channels/pairing)

## 命令

```bash
openclaw pairing list telegram
openclaw pairing list --channel telegram --account work
openclaw pairing list telegram --json

openclaw pairing approve <code>
openclaw pairing approve telegram <code>
openclaw pairing approve --channel telegram --account work <code> --notify
```

## `pairing list`

列出一个频道的待处理配对请求。

选项：

- `[channel]`：位置频道 ID
- `--channel <channel>`：明确的频道 ID
- `--account <accountId>`：多账户频道的账户 ID
- `--json`：机器可读输出

注意：

- 如果配置了多个支持配对的频道，你必须通过位置参数或 `--channel` 提供频道。
- 只要频道 ID 有效，允许使用扩展频道。

## `pairing approve`

批准待处理的配对码并允许该发件人。

用法：

- `openclaw pairing approve <channel> <code>`
- `openclaw pairing approve --channel <channel> <code>`
- 当配置了恰好一个支持配对的频道时：`openclaw pairing approve <code>`

选项：

- `--channel <channel>`：明确的频道 ID
- `--account <accountId>`：多账户频道的账户 ID
- `--notify`：在同一频道向请求者发送确认

所有者引导：

- 当你批准配对码时，如果 `commands.ownerAllowFrom` 为空，OpenClaw 还会将批准的发件人记录为命令所有者，使用频道范围的条目，如 `telegram:123456789`。
- 这只引导第一个所有者。后来的配对批准不会替换或扩展 `commands.ownerAllowFrom`。
- 命令所有者是被允许运行仅所有者命令并批准危险操作的人工操作员账户，例如 `/diagnostics`、`/export-trajectory`、`/config` 和执行审批。

## 注意

- 频道输入：通过位置传递（`pairing list telegram`）或通过 `--channel <channel>`。
- `pairing list` 支持多账户频道的 `--account <accountId>`。
- `pairing approve` 支持 `--account <accountId>` 和 `--notify`。
- 如果只配置了一个支持配对的频道，允许 `pairing approve <code>`。
- 如果你在此引导存在之前批准了发件人，运行 `openclaw doctor`；它会在未配置命令所有者时发出警告，并显示修复它的 `openclaw config set commands.ownerAllowFrom ...` 命令。

## 相关

- [CLI 参考](/cli)
- [频道配对](/channels/pairing)
