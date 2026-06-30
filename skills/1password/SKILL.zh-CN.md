---
name: 1password
description: 设置并使用 1Password CLI 进行登录、桌面集成以及读取或注入密钥。
homepage: https://developer.1password.com/docs/cli/get-started/
metadata:
  {
    "openclaw":
      {
        "emoji": "🔐",
        "requires": { "bins": ["op"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "1password-cli",
              "bins": ["op"],
              "label": "Install 1Password CLI (brew)",
            },
          ],
      },
  }
---

# 1Password CLI

请按照官方 CLI 入门步骤操作。不要猜测安装命令。

## 参考资料

- `references/get-started.md`（安装 + 应用集成 + 登录流程）
- `references/cli-examples.md`（真实 `op` 示例）

## 工作流

1. 检查操作系统和 shell。
2. 验证 CLI 是否存在：`op --version`。
3. 确认桌面应用集成已启用（参见入门指南）且应用已解锁。
4. **必须**：为所有 `op` 命令创建一个全新的 tmux 会话（不得在 tmux 外直接调用 `op`）。
5. 在 tmux 内登录/授权：`op signin`（预期会触发应用提示）。
6. 在 tmux 内验证访问权限：`op whoami`（在读取任何密钥前必须成功）。
7. 如有多个账户：使用 `--account` 或 `OP_ACCOUNT`。

## 必须使用 tmux 会话（T-Max）

shell 工具每条命令使用全新 TTY。为避免重复提示和失败，始终在具有全新 socket/会话名称的专用 tmux 会话中运行 `op`。

示例（socket 约定参见 `tmux` 技能，不要重用旧会话名称）：

```bash
SOCKET_DIR="${OPENCLAW_TMUX_SOCKET_DIR:-${TMPDIR:-/tmp}/openclaw-tmux-sockets}"
mkdir -p "$SOCKET_DIR"
SOCKET="$SOCKET_DIR/openclaw-op.sock"
SESSION="op-auth-$(date +%Y%m%d-%H%M%S)"

tmux -S "$SOCKET" new -d -s "$SESSION" -n shell
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -- "op signin --account my.1password.com" Enter
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -- "op whoami" Enter
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -- "op vault list" Enter
tmux -S "$SOCKET" capture-pane -p -J -t "$SESSION":0.0 -S -200
tmux -S "$SOCKET" kill-session -t "$SESSION"
```

## 安全守则

- 切勿将密钥粘贴到日志、聊天或代码中。
- 优先使用 `op run` / `op inject`，而非将密钥写入磁盘。
- 如果需要在无应用集成的情况下登录，使用 `op account add`。
- 如果命令返回"账户未登录"，在 tmux 内重新运行 `op signin` 并在应用中授权。
- 不要在 tmux 外运行 `op`；如果 tmux 不可用，停止并询问用户。
