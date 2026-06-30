---
name: bear-notes
description: 通过 grizzly CLI 创建、搜索和管理 Bear 笔记。
homepage: https://bear.app
metadata:
  {
    "openclaw":
      {
        "emoji": "🐻",
        "os": ["darwin"],
        "requires": { "bins": ["grizzly"] },
        "install":
          [
            {
              "id": "go",
              "kind": "go",
              "module": "github.com/tylerwince/grizzly/cmd/grizzly@latest",
              "bins": ["grizzly"],
              "label": "Install grizzly (go)",
            },
          ],
      },
  }
---

# Bear 笔记

使用 `grizzly` 在 macOS 的 Bear 中创建、读取和管理笔记。

系统要求

- 已安装并运行 Bear 应用
- 某些操作（add-text、tags、open-note --selected）需要 Bear 应用 token（存储在 `~/.config/grizzly/token` 中）

## 获取 Bear Token

对于需要 token 的操作（add-text、tags、open-note --selected），你需要认证 token：

1. 打开 Bear → 帮助 → API Token → 复制 Token
2. 保存：`echo "YOUR_TOKEN" > ~/.config/grizzly/token`

## 常用命令

创建笔记

```bash
echo "笔记内容" | grizzly create --title "我的笔记" --tag work
grizzly create --title "快速笔记" --tag inbox < /dev/null
```

通过 ID 打开/读取笔记

```bash
grizzly open-note --id "NOTE_ID" --enable-callback --json
```

向笔记追加文本

```bash
echo "附加内容" | grizzly add-text --id "NOTE_ID" --mode append --token-file ~/.config/grizzly/token
```

列出所有标签

```bash
grizzly tags --enable-callback --json --token-file ~/.config/grizzly/token
```

通过标签搜索笔记

```bash
grizzly open-tag --name "work" --enable-callback --json
```

## 选项

常用标志：

- `--dry-run`——预览 URL 而不执行
- `--print-url`——显示 x-callback-url
- `--enable-callback`——等待 Bear 的响应（读取数据时需要）
- `--json`——以 JSON 格式输出（使用回调时）
- `--token-file PATH`——Bear API token 文件的路径

## 配置

Grizzly 按以下优先级顺序读取配置：

1. CLI 标志
2. 环境变量（`GRIZZLY_TOKEN_FILE`、`GRIZZLY_CALLBACK_URL`、`GRIZZLY_TIMEOUT`）
3. 当前目录中的 `.grizzly.toml`
4. `~/.config/grizzly/config.toml`

`~/.config/grizzly/config.toml` 示例：

```toml
token_file = "~/.config/grizzly/token"
callback_url = "http://127.0.0.1:42123/success"
timeout = "5s"
```

## 注意事项

- Bear 必须正在运行才能使用命令
- 笔记 ID 是 Bear 的内部标识符（可在笔记信息中查看或通过回调获取）
- 读取 Bear 数据时使用 `--enable-callback`
- 某些操作需要有效的 token（add-text、tags、open-note --selected）
