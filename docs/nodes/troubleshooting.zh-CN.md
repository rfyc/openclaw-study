---
summary: "排除节点配对、前台要求、权限和工具失败问题"
read_when:
  - 节点已连接但摄像头/画布/屏幕/执行工具失败
  - 需要了解节点配对与批准的思维模型
title: "节点故障排除"
---

当节点在状态中可见但节点工具失败时，请使用此页面。

## 命令梯度

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然后运行节点特定检查：

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
```

健康信号：

- 节点已连接并为角色 `node` 配对。
- `nodes describe` 包含你正在调用的功能。
- 执行批准显示预期的模式/允许列表。

## 前台要求

在 iOS/Android 节点上，`canvas.*`、`camera.*` 和 `screen.*` 仅限前台。

快速检查和修复：

```bash
openclaw nodes describe --node <idOrNameOrIp>
openclaw nodes canvas snapshot --node <idOrNameOrIp>
openclaw logs --follow
```

如果你看到 `NODE_BACKGROUND_UNAVAILABLE`，将节点应用切换到前台并重试。

## 权限矩阵

| 功能                         | iOS                          | Android                      | macOS 节点应用               | 典型失败代码                   |
| ---------------------------- | ---------------------------- | ---------------------------- | ---------------------------- | ------------------------------ |
| `camera.snap`、`camera.clip` | 摄像头（+ 剪辑音频的麦克风） | 摄像头（+ 剪辑音频的麦克风） | 摄像头（+ 剪辑音频的麦克风） | `*_PERMISSION_REQUIRED`        |
| `screen.record`              | 屏幕录制（+ 可选麦克风）     | 屏幕捕获提示（+ 可选麦克风） | 屏幕录制                     | `*_PERMISSION_REQUIRED`        |
| `location.get`               | 使用期间或始终（取决于模式） | 基于模式的前台/后台位置      | 位置权限                     | `LOCATION_PERMISSION_REQUIRED` |
| `system.run`                 | 不适用（节点主机路径）       | 不适用（节点主机路径）       | 需要执行批准                 | `SYSTEM_RUN_DENIED`            |

## 配对与批准的区别

这是不同的门控：

1. **设备配对**：此节点是否可以连接到网关？
2. **网关节点命令策略**：RPC 命令 ID 是否被 `gateway.nodes.allowCommands` / `denyCommands` 和平台默认值允许？
3. **执行批准**：此节点是否可以在本地运行特定的 shell 命令？

快速检查：

```bash
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

如果缺少配对，首先批准节点设备。
如果 `nodes describe` 缺少命令，检查网关节点命令策略以及节点是否在连接时实际声明了该命令。
如果配对正常但 `system.run` 失败，修复该节点上的执行批准/允许列表。

节点配对是身份/信任门控，而不是每命令批准接口。对于 `system.run`，每节点策略存在于该节点的执行批准文件中（`openclaw approvals get --node ...`），而不在网关配对记录中。

对于批准支持的 `host=node` 运行，网关还将执行绑定到
准备好的规范 `systemRunPlan`。如果后续调用者在批准的运行被转发之前
修改了 command/cwd 或会话元数据，网关会将运行拒绝为批准不匹配，
而不是信任编辑后的载荷。

## 常见节点错误代码

- `NODE_BACKGROUND_UNAVAILABLE` → 应用处于后台；将其切换到前台。
- `CAMERA_DISABLED` → 节点设置中摄像头开关已禁用。
- `*_PERMISSION_REQUIRED` → 操作系统权限缺失/被拒绝。
- `LOCATION_DISABLED` → 位置模式已关闭。
- `LOCATION_PERMISSION_REQUIRED` → 请求的位置模式未获授权。
- `LOCATION_BACKGROUND_UNAVAILABLE` → 应用处于后台但仅存在"使用期间"权限。
- `SYSTEM_RUN_DENIED: approval required` → 执行请求需要显式批准。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被允许列表模式阻止。
  在允许列表模式下，Windows 节点主机上类似 `cmd.exe /c ...` 的 shell 包装器形式被视为允许列表未命中，除非通过询问流程批准。

## 快速恢复循环

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
```

如果仍然卡住：

- 重新批准设备配对。
- 重新打开节点应用（前台）。
- 重新授予操作系统权限。
- 重新创建/调整执行批准策略。

相关：

- [/nodes/index](/nodes/index)
- [/nodes/camera](/nodes/camera)
- [/nodes/location-command](/nodes/location-command)
- [/tools/exec-approvals](/tools/exec-approvals)
- [/gateway/pairing](/gateway/pairing)

## 相关

- [节点概览](/nodes)
- [Gateway 故障排除](/gateway/troubleshooting)
- [频道故障排除](/channels/troubleshooting)
