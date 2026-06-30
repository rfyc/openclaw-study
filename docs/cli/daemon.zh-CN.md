---
summary: "`openclaw daemon` 的 CLI 参考（Gateway 服务管理的旧版别名）"
read_when:
  - 你的脚本中仍使用 `openclaw daemon ...`
  - 你需要服务生命周期命令（安装/启动/停止/重启/状态）
title: "Daemon"
---

# `openclaw daemon`

Gateway 服务管理命令的旧版别名。

`openclaw daemon ...` 映射到与 `openclaw gateway ...` 服务命令相同的服务控制界面。

## 用法

```bash
openclaw daemon status
openclaw daemon install
openclaw daemon start
openclaw daemon stop
openclaw daemon restart
openclaw daemon uninstall
```

## 子命令

- `status`：显示服务安装状态并探测 Gateway 健康
- `install`：安装服务（`launchd`/`systemd`/`schtasks`）
- `uninstall`：删除服务
- `start`：启动服务
- `stop`：停止服务
- `restart`：重启服务

## 常用选项

- `status`：`--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
- `install`：`--port`、`--runtime <node|bun>`、`--token`、`--force`、`--json`
- `restart`：`--force`、`--wait <duration>`、`--json`
- 生命周期（`uninstall|start|stop`）：`--json`

备注：

- `status` 在可能时解析已配置的认证 SecretRef 用于探测认证。
- 如果必需的认证 SecretRef 在此命令路径中未解析，当探测连接性/认证失败时，`daemon status --json` 报告 `rpc.authWarning`；请显式传递 `--token`/`--password` 或先解析密钥来源。
- 如果探测成功，未解析的认证引用警告会被抑制，以避免误报。
- `status --deep` 添加尽力而为的系统级服务扫描。当它找到其他类似 gateway 的服务时，人类输出会打印清理提示，并警告每台机器一个 gateway 仍然是正常建议。
- 在 Linux systemd 安装中，`status` 令牌漂移检查同时包括 `Environment=` 和 `EnvironmentFile=` 单元来源。
- 漂移检查使用合并的运行时 env（服务命令 env 优先，然后是进程 env 回退）解析 `gateway.auth.token` SecretRef。
- 如果令牌认证没有有效激活（明确的 `gateway.auth.mode` 为 `password`/`none`/`trusted-proxy`，或模式未设置且密码可以获胜且没有令牌候选可以获胜），令牌漂移检查会跳过配置令牌解析。
- 当令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`install` 会验证 SecretRef 是否可解析，但不会将解析后的令牌持久化到服务环境元数据中。
- 如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，安装会关闭失败。
- 如果 `gateway.auth.token` 和 `gateway.auth.password` 都已配置且 `gateway.auth.mode` 未设置，安装会被阻止直到明确设置模式。
- 在 macOS 上，`install` 保持 LaunchAgent plists 为所有者专用，并通过所有者专用文件和包装器加载托管服务环境值，而不是将 API 密钥或认证配置文件 env 引用序列化到 `EnvironmentVariables` 中。
- 如果你有意在一台主机上运行多个 gateway，请隔离端口、配置/状态和工作区；请参阅 [/gateway#multiple-gateways-same-host](/gateway#multiple-gateways-same-host)。

## 建议使用

使用 [`openclaw gateway`](/cli/gateway) 获取当前文档和示例。

## 相关

- [CLI 参考](/cli)
- [Gateway 运行手册](/gateway)
