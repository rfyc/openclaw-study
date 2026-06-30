---
summary: "`openclaw nodes` 的 CLI 参考（状态、配对、调用、摄像头/画布/屏幕）"
read_when:
  - 你在管理配对节点（摄像头、屏幕、画布）时
  - 你需要批准请求或调用节点命令时
title: "Nodes"
---

# `openclaw nodes`

管理配对节点（设备）并调用节点功能。

相关：

- 节点概述：[Nodes](/nodes)
- 摄像头：[Camera nodes](/nodes/camera)
- 图像：[Image nodes](/nodes/images)

通用选项：

- `--url`、`--token`、`--timeout`、`--json`

## 常用命令

```bash
openclaw nodes list
openclaw nodes list --connected
openclaw nodes list --last-connected 24h
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name <displayName>
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
```

`nodes list` 打印待处理/已配对表。已配对行包括最近连接时间（Last Connect）。
使用 `--connected` 仅显示当前已连接的节点。使用 `--last-connected <duration>` 过滤在指定时间段内连接的节点（例如 `24h`、`7d`）。
使用 `nodes remove --node <id|name|ip>` 删除过时的 gateway 拥有的节点配对记录。

批准说明：

- `openclaw nodes pending` 仅需要配对范围。
- `gateway.nodes.pairing.autoApproveCidrs` 仅对明确受信任的首次 `role: node` 设备配对跳过待处理步骤。默认关闭，不批准升级。
- `openclaw nodes approve <requestId>` 从待处理请求中继承额外的范围要求：
  - 无命令请求：仅配对
  - 非执行节点命令：配对 + 写入
  - `system.run` / `system.run.prepare` / `system.which`：配对 + 管理员

## 调用

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
```

调用标志：

- `--params <json>`：JSON 对象字符串（默认 `{}`）。
- `--invoke-timeout <ms>`：节点调用超时（默认 `15000`）。
- `--idempotency-key <key>`：可选的幂等性键。
- `system.run` 和 `system.run.prepare` 在此处被阻止；使用带有 `host=node` 的 `exec` 工具进行 shell 执行。

对于节点上的 shell 执行，使用带有 `host=node` 的 `exec` 工具而不是 `openclaw nodes run`。
`nodes` CLI 现在以功能为中心：通过 `nodes invoke` 的直接 RPC，以及配对、摄像头、屏幕、位置、画布和通知。

## 相关

- [CLI 参考](/cli)
- [节点](/nodes)
