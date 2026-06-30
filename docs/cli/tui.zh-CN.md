---
summary: "`openclaw tui` 的 CLI 参考（Gateway 支持或本地嵌入式终端 UI）"
read_when:
  - 你想要 Gateway 的终端 UI（远程友好）时
  - 你想从脚本传递 url/token/session 时
  - 你想在不使用 Gateway 的情况下在本地嵌入式模式中运行 TUI 时
  - 你想使用 openclaw chat 或 openclaw tui --local 时
title: "TUI"
---

# `openclaw tui`

打开连接到 Gateway 的终端 UI，或在本地嵌入式模式下运行它。

相关：

- TUI 指南：[TUI](/web/tui)

注意：

- `chat` 和 `terminal` 是 `openclaw tui --local` 的别名。
- `--local` 不能与 `--url`、`--token` 或 `--password` 结合使用。
- 在可能时，`tui` 为令牌/密码认证解析已配置的 gateway 认证 SecretRef（`env`/`file`/`exec` 提供商）。
- 从已配置的代理工作空间目录内启动时，TUI 自动为会话键默认选择该代理（除非 `--session` 明确为 `agent:<id>:...`）。
- 本地模式直接使用嵌入式代理运行时。大多数本地工具可用，但仅 Gateway 的功能不可用。
- 本地模式在 TUI 命令界面内添加 `/auth [provider]`。
- 插件审批门控在本地模式下仍然适用。需要审批的工具在终端中提示决定；没有任何内容因为 Gateway 未参与而被静默自动批准。

## 示例

```bash
openclaw chat
openclaw tui --local
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
openclaw chat --message "Compare my config to the docs and tell me what to fix"
# 在代理工作空间内运行时，自动推断该代理
openclaw tui --session bugfix
```

## 配置修复循环

当当前配置已经验证通过，你想让嵌入式代理检查它、与文档进行比较并帮助从同一终端修复它时，使用本地模式：

如果 `openclaw config validate` 已经失败，请先使用 `openclaw configure` 或 `openclaw doctor --fix`。`openclaw chat` 不绕过无效配置保护。

```bash
openclaw chat
```

然后在 TUI 内：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

使用 `openclaw config set` 或 `openclaw configure` 应用有针对性的修复，然后重新运行 `openclaw config validate`。请参阅 [TUI](/web/tui) 和 [Config](/cli/config)。

## 相关

- [CLI 参考](/cli)
- [TUI](/web/tui)
