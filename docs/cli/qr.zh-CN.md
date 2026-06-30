---
summary: "`openclaw qr` 的 CLI 参考（生成移动配对 QR 码 + 设置码）"
read_when:
  - 你想快速将移动节点应用与 gateway 配对时
  - 你需要用于远程/手动分享的设置码输出时
title: "QR"
---

# `openclaw qr`

从当前 Gateway 配置生成移动配对 QR 码和设置码。

## 用法

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## 选项

- `--remote`：优先使用 `gateway.remote.url`；如果未设置，`gateway.tailscale.mode=serve|funnel` 仍然可以提供远程公共 URL
- `--url <url>`：覆盖有效负载中使用的 gateway URL
- `--public-url <url>`：覆盖有效负载中使用的公共 URL
- `--token <token>`：覆盖引导流程认证的 gateway 令牌
- `--password <password>`：覆盖引导流程认证的 gateway 密码
- `--setup-code-only`：仅打印设置码
- `--no-ascii`：跳过 ASCII QR 渲染
- `--json`：输出 JSON（`setupCode`、`gatewayUrl`、`auth`、`urlSource`）

## 注意

- `--token` 和 `--password` 是互斥的。
- 设置码本身现在携带一个不透明的短期 `bootstrapToken`，而不是共享的 gateway 令牌/密码。
- 在内置的节点/操作员引导流程中，主节点令牌仍然以 `scopes: []` 落地。
- 如果引导切换也发出操作员令牌，它保持限制在引导允许列表：`operator.approvals`、`operator.read`、`operator.talk.secrets`、`operator.write`。
- 引导范围检查带有角色前缀。该操作员允许列表仅满足操作员请求；非操作员角色仍然需要其自身角色前缀下的范围。
- 对于 Tailscale/公共 `ws://` gateway URL，移动配对失败关闭。仍然支持私有 LAN `ws://`，但 Tailscale/公共移动路由应使用 Tailscale Serve/Funnel 或 `wss://` gateway URL。
- 使用 `--remote` 时，OpenClaw 需要 `gateway.remote.url` 或 `gateway.tailscale.mode=serve|funnel`。
- 使用 `--remote` 时，如果有效活跃的远程凭据被配置为 SecretRef 且你没有传递 `--token` 或 `--password`，命令从活跃的 gateway 快照中解析它们。如果 gateway 不可用，命令快速失败。
- 不使用 `--remote` 时，当没有传递 CLI 认证覆盖时解析本地 gateway 认证 SecretRef：
  - 当令牌认证可以获胜时（明确的 `gateway.auth.mode="token"` 或没有密码来源获胜的推断模式），解析 `gateway.auth.token`。
  - 当密码认证可以获胜时（明确的 `gateway.auth.mode="password"` 或没有来自认证/环境的获胜令牌的推断模式），解析 `gateway.auth.password`。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRef）且 `gateway.auth.mode` 未设置，设置码解析将失败直到明确设置模式。
- Gateway 版本偏差注意：此命令路径需要支持 `secrets.resolve` 的 gateway；较旧的 gateway 返回未知方法错误。
- 扫描后，使用以下命令批准设备配对：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

## 相关

- [CLI 参考](/cli)
- [配对](/cli/pairing)
