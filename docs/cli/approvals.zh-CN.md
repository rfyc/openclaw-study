---
summary: "`openclaw approvals` 和 `openclaw exec-policy` 的 CLI 参考"
read_when:
  - 你想从 CLI 编辑执行审批
  - 你需要管理 gateway 或节点主机上的允许列表
title: "Approvals"
---

# `openclaw approvals`

管理**本地主机**、**gateway 主机**或**节点主机**的执行审批。
默认情况下，命令以磁盘上的本地审批文件为目标。使用 `--gateway` 定向 gateway，或使用 `--node` 定向特定节点。

别名：`openclaw exec-approvals`

相关：

- 执行审批：[Exec approvals](/tools/exec-approvals)
- 节点：[Nodes](/nodes)

## `openclaw exec-policy`

`openclaw exec-policy` 是一个本地便捷命令，用于一步保持请求的
`tools.exec.*` 配置与本地主机审批文件对齐。

以下情况使用它：

- 检查本地请求的策略、主机审批文件和合并后的有效结果
- 应用本地预设，如 YOLO 或拒绝所有
- 同步本地 `tools.exec.*` 和本地 `~/.openclaw/exec-approvals.json`

示例：

```bash
openclaw exec-policy show
openclaw exec-policy show --json

openclaw exec-policy preset yolo
openclaw exec-policy preset cautious --json

openclaw exec-policy set --host gateway --security full --ask off --ask-fallback full
```

输出模式：

- 无 `--json`：打印人类可读的表格视图
- `--json`：打印机器可读的结构化输出

当前范围：

- `exec-policy` 仅限**本地**
- 它同时更新本地配置文件和本地审批文件
- 它**不会**将策略推送到 gateway 主机或节点主机
- 此命令拒绝 `--host node`，因为节点执行审批是在运行时从节点获取的，必须通过以节点为目标的审批命令来管理
- `openclaw exec-policy show` 将 `host=node` 范围标记为运行时由节点管理，而不是从本地审批文件派生有效策略

如果你需要直接编辑远程主机审批，请继续使用 `openclaw approvals set --gateway`
或 `openclaw approvals set --node <id|name|ip>`。

## 常用命令

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

`openclaw approvals get` 现在显示本地、gateway 和节点目标的有效执行策略：

- 请求的 `tools.exec` 策略
- 主机审批文件策略
- 应用优先级规则后的有效结果

优先级是有意为之的：

- 主机审批文件是可执行的真相来源
- 请求的 `tools.exec` 策略可以缩小或扩大意图，但有效结果仍然来源于主机规则
- `--node` 将节点主机审批文件与 gateway `tools.exec` 策略结合，因为两者在运行时都适用
- 如果 gateway 配置不可用，CLI 会回退到节点审批快照，并注明无法计算最终运行时策略

## 从文件替换审批

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --stdin <<'EOF'
{ version: 1, defaults: { security: "full", ask: "off" } }
EOF
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

`set` 接受 JSON5，而不仅仅是严格的 JSON。使用 `--file` 或 `--stdin`，不能同时使用两者。

## "永不提示" / YOLO 示例

对于永远不应在执行审批上停止的主机，将主机审批默认值设置为 `full` + `off`：

```bash
openclaw approvals set --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

节点变体：

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

这仅更改**主机审批文件**。要保持请求的 OpenClaw 策略一致，还需设置：

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
```

为何此示例使用 `tools.exec.host=gateway`：

- `host=auto` 仍然意味着"沙箱可用时使用沙箱，否则使用 gateway"。
- YOLO 关乎审批，而不是路由。
- 如果你希望即使配置了沙箱也使用主机执行，请用 `gateway` 或 `/exec host=gateway` 明确选择主机。

这与当前主机默认的 YOLO 行为相符。如果你需要审批，请收紧。

本地快捷方式：

```bash
openclaw exec-policy preset yolo
```

该本地快捷方式同时更新请求的本地 `tools.exec.*` 配置和本地审批默认值。它在意图上等同于上述手动两步设置，但仅适用于本地机器。

## 允许列表辅助工具

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## 常用选项

`get`、`set` 和 `allowlist add|remove` 都支持：

- `--node <id|name|ip>`
- `--gateway`
- 共享节点 RPC 选项：`--url`、`--token`、`--timeout`、`--json`

目标说明：

- 无目标标志表示磁盘上的本地审批文件
- `--gateway` 定向 gateway 主机审批文件
- `--node` 在解析 ID、名称、IP 或 ID 前缀后定向一个节点主机

`allowlist add|remove` 还支持：

- `--agent <id>`（默认为 `*`）

## 备注

- `--node` 使用与 `openclaw nodes` 相同的解析器（ID、名称、IP 或 ID 前缀）。
- `--agent` 默认为 `"*"`，适用于所有 agent。
- 节点主机必须公布 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。
- 审批文件按主机存储在 `~/.openclaw/exec-approvals.json`。

## 相关

- [CLI 参考](/cli)
- [执行审批](/tools/exec-approvals)
