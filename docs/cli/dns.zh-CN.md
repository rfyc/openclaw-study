---
summary: "`openclaw dns` 的 CLI 参考（广域发现辅助工具）"
read_when:
  - 你想通过 Tailscale + CoreDNS 进行广域发现（DNS-SD）
  - 你正在为自定义发现域（例如：openclaw.internal）设置分裂 DNS
title: "DNS"
---

# `openclaw dns`

用于广域发现（Tailscale + CoreDNS）的 DNS 辅助工具。目前专注于 macOS + Homebrew CoreDNS。

相关：

- Gateway 发现：[Discovery](/gateway/discovery)
- 广域发现配置：[Configuration](/gateway/configuration)

## 设置

```bash
openclaw dns setup
openclaw dns setup --domain openclaw.internal
openclaw dns setup --apply
```

## `dns setup`

为单播 DNS-SD 发现规划或应用 CoreDNS 设置。

选项：

- `--domain <domain>`：广域发现域（例如 `openclaw.internal`）
- `--apply`：安装或更新 CoreDNS 配置并重启服务（需要 sudo；仅限 macOS）

显示的内容：

- 已解析的发现域
- 区域文件路径
- 当前 tailnet IP
- 推荐的 `openclaw.json` 发现配置
- 需要设置的 Tailscale 分裂 DNS 名称服务器/域值

备注：

- 不带 `--apply` 时，命令仅作为规划辅助工具并打印推荐设置。
- 如果省略 `--domain`，OpenClaw 使用配置中的 `discovery.wideArea.domain`。
- `--apply` 目前仅支持 macOS 并期望 Homebrew CoreDNS。
- `--apply` 在需要时引导区域文件，确保 CoreDNS 导入节点存在，并重启 `coredns` brew 服务。

## 相关

- [CLI 参考](/cli)
- [Discovery](/gateway/discovery)
