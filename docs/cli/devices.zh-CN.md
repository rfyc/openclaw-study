---
summary: "`openclaw devices` 的 CLI 参考（设备配对 + 令牌轮换/撤销）"
read_when:
  - 你正在审批设备配对请求
  - 你需要轮换或撤销设备令牌
title: "Devices"
---

# `openclaw devices`

管理设备配对请求和设备范围的令牌。

## 命令

### `openclaw devices list`

列出待处理的配对请求和已配对的设备。

```
openclaw devices list
openclaw devices list --json
```

待处理请求输出会在设备已配对时，在设备的当前已审批访问权限旁边显示请求的访问权限。这使范围/角色升级明确，而不是看起来像配对丢失了。

### `openclaw devices remove <deviceId>`

删除一个已配对的设备条目。

当你使用已配对的设备令牌认证时，非管理员调用者只能删除**自己的**设备条目。删除其他设备需要 `operator.admin`。

```
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

### `openclaw devices clear --yes [--pending]`

批量清除已配对的设备。

```
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

### `openclaw devices approve [requestId] [--latest]`

通过精确的 `requestId` 审批待处理的设备配对请求。如果省略 `requestId` 或传递 `--latest`，OpenClaw 只打印选定的待处理请求并退出；请在验证详情后使用精确的请求 ID 重新运行审批。

<Note>
如果设备以更改的认证详情（角色、范围或公钥）重试配对，OpenClaw 会取代之前的待处理条目并发出新的 `requestId`。在审批之前运行 `openclaw devices list` 以使用当前 ID。
</Note>

如果设备已配对并请求更广泛的范围或更广泛的角色，OpenClaw 会保留现有审批不变，并创建新的待处理升级请求。在审批之前，查看 `openclaw devices list` 中的 `Requested` 与 `Approved` 列，或使用 `openclaw devices approve --latest` 预览确切的升级。

如果 Gateway 明确配置了 `gateway.nodes.pairing.autoApproveCidrs`，来自匹配客户端 IP 的首次 `role: node` 请求可以在出现在此列表之前被审批。该策略默认禁用，且从不适用于操作员/浏览器客户端或升级请求。

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

### `openclaw devices reject <requestId>`

拒绝待处理的设备配对请求。

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

为特定角色轮换设备令牌（可选更新范围）。
目标角色必须已存在于该设备的已审批配对契约中；轮换不能铸造新的未审批角色。
如果省略 `--scope`，使用存储的轮换令牌的后续重连会重用该令牌的缓存已审批范围。如果传递显式的 `--scope` 值，这些将成为未来缓存令牌重连的存储范围集。
非管理员已配对设备调用者只能轮换**自己的**设备令牌。
目标令牌范围集必须在调用者会话自身的操作员范围内；轮换不能铸造或保留比调用者已有的更广泛的操作员令牌。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

以 JSON 格式返回轮换元数据。如果调用者在使用该设备令牌认证时轮换自己的令牌，响应还包括替换令牌，以便客户端在重连之前可以持久化它。共享/管理员轮换不回显承载令牌。

### `openclaw devices revoke --device <id> --role <role>`

撤销特定角色的设备令牌。

非管理员已配对设备调用者只能撤销**自己的**设备令牌。
撤销其他设备的令牌需要 `operator.admin`。
目标令牌范围集也必须在调用者会话自身的操作员范围内；仅配对的调用者不能撤销管理员/写入操作员令牌。

```
openclaw devices revoke --device <deviceId> --role node
```

以 JSON 格式返回撤销结果。

## 常用选项

- `--url <url>`：Gateway WebSocket URL（配置了 `gateway.remote.url` 时默认使用该值）。
- `--token <token>`：Gateway 令牌（如需要）。
- `--password <password>`：Gateway 密码（密码认证）。
- `--timeout <ms>`：RPC 超时时间。
- `--json`：JSON 输出（建议用于脚本）。

<Warning>
当你设置 `--url` 时，CLI 不会回退到配置或环境凭证。请显式传递 `--token` 或 `--password`。缺少显式凭证是错误。
</Warning>

## 备注

- 令牌轮换返回新令牌（敏感）。像处理密钥一样对待它。
- 这些命令需要 `operator.pairing`（或 `operator.admin`）范围。某些审批还要求调用者持有目标设备将铸造或继承的操作员范围；参见 [操作员范围](/gateway/operator-scopes)。
- `gateway.nodes.pairing.autoApproveCidrs` 是针对新鲜节点设备配对的可选 Gateway 策略；它不改变 CLI 审批权限。
- 令牌轮换和撤销保持在该设备的已审批配对角色集和已审批范围基线内。杂乱的缓存令牌条目不会授予令牌管理目标。
- 对于已配对设备令牌会话，跨设备管理仅限管理员：`remove`、`rotate` 和 `revoke` 仅限自己，除非调用者有 `operator.admin`。
- 令牌变更也受调用者范围限制：仅配对会话无法轮换或撤销当前携带 `operator.admin` 或 `operator.write` 的令牌。
- `devices clear` 故意通过 `--yes` 进行门控。
- 如果本地回环上的配对范围不可用（且没有传递显式的 `--url`），list/approve 可以使用本地配对回退。
- `devices approve` 在铸造令牌之前需要显式的请求 ID；省略 `requestId` 或传递 `--latest` 只预览最新的待处理请求。

## 令牌漂移恢复检查列表

当控制界面或其他客户端持续以 `AUTH_TOKEN_MISMATCH` 或 `AUTH_DEVICE_TOKEN_MISMATCH` 失败时使用此列表。

1. 确认当前 gateway 令牌来源：

```bash
openclaw config get gateway.auth.token
```

2. 列出已配对设备并识别受影响的设备 ID：

```bash
openclaw devices list
```

3. 为受影响的设备轮换操作员令牌：

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. 如果轮换不够，删除陈旧的配对并重新审批：

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. 使用当前共享令牌/密码重试客户端连接。

备注：

- 正常重连认证优先级是：显式共享令牌/密码优先，然后是显式 `deviceToken`，然后是存储的设备令牌，然后是引导令牌。
- 受信任的 `AUTH_TOKEN_MISMATCH` 恢复可以临时在一次有限的重试中同时发送共享令牌和存储的设备令牌。

相关：

- [Dashboard 认证故障排除](/web/dashboard#if-you-see-unauthorized-1008)
- [Gateway 故障排除](/gateway/troubleshooting#dashboard-control-ui-connectivity)

## 相关

- [CLI 参考](/cli)
- [Nodes](/nodes)
