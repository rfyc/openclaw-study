---
summary: "`openclaw health` 的 CLI 参考（通过 RPC 获取 gateway 健康快照）"
read_when:
  - 你想快速检查运行中 Gateway 的健康状态
title: "Health"
---

# `openclaw health`

从运行中的 Gateway 获取健康状态。

选项：

- `--json`：机器可读输出
- `--timeout <ms>`：连接超时（毫秒，默认 `10000`）
- `--verbose`：详细日志
- `--debug`：`--verbose` 的别名

示例：

```bash
openclaw health
openclaw health --json
openclaw health --timeout 2500
openclaw health --verbose
openclaw health --debug
```

备注：

- 默认 `openclaw health` 向运行中的 gateway 请求其健康快照。当 gateway 已有新鲜的缓存快照时，它可以返回该缓存有效载荷并在后台刷新。
- `--verbose` 强制实时探测，打印 gateway 连接详情，并在所有已配置账户和 agent 上展开人类可读输出。
- 配置了多个 agent 时，输出包含每个 agent 的会话存储。

## 相关

- [CLI 参考](/cli)
- [Gateway 健康](/gateway/health)
