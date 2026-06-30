---
name: gifgrep
description: 使用 CLI/TUI 搜索 GIF 提供商，下载结果，并提取静帧/帧网格图。
homepage: https://gifgrep.com
metadata:
  {
    "openclaw":
      {
        "emoji": "🧲",
        "requires": { "bins": ["gifgrep"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "steipete/tap/gifgrep",
              "bins": ["gifgrep"],
              "label": "Install gifgrep (brew)",
            },
            {
              "id": "go",
              "kind": "go",
              "module": "github.com/steipete/gifgrep/cmd/gifgrep@latest",
              "bins": ["gifgrep"],
              "label": "Install gifgrep (go)",
            },
          ],
      },
  }
---

# gifgrep

使用 `gifgrep` 搜索 GIF 提供商（Tenor/Giphy），在 TUI 中浏览，下载结果，并提取静帧或帧网格图。

GIF 抓取工作流（gifgrep workflow）

- 搜索 → 预览 → 下载 → 提取（静帧/帧网格）以便快速查阅和分享。

快速开始

- `gifgrep cats --max 5`
- `gifgrep cats --format url | head -n 5`
- `gifgrep search --json cats | jq '.[0].url'`
- `gifgrep tui "office handshake"`
- `gifgrep cats --download --max 1 --format url`

TUI + 预览

- TUI：`gifgrep tui "query"`
- CLI 静帧预览：`--thumbs`（仅 Kitty/Ghostty；静止帧）

下载 + 查看

- `--download` 保存到 `~/Downloads`
- `--reveal` 在 Finder 中显示最后下载的文件

静帧 + 帧网格

- `gifgrep still ./clip.gif --at 1.5s -o still.png`
- `gifgrep sheet ./clip.gif --frames 9 --cols 3 -o sheet.png`
- 帧网格 = 采样帧的单张 PNG 网格（非常适合快速查阅、文档、PR、聊天）。
- 调整：`--frames`（帧数）、`--cols`（网格宽度）、`--padding`（间距）。

提供商

- `--source auto|tenor|giphy`
- `--source giphy` 需要 `GIPHY_API_KEY`
- `TENOR_API_KEY` 可选（未设置时使用 Tenor 演示密钥）

输出

- `--json` 打印结果数组（`id`、`title`、`url`、`preview_url`、`tags`、`width`、`height`）
- `--format` 用于管道友好的字段输出（例如 `url`）

GIF 资源规范

- 在推荐或使用动态 GIF URL 之前，请验证其能成功解析、`Content-Type` 为 `image/gif`，且确实是动画（多帧或循环元数据；可用 `file`、`identify` 或小脚本检查）。
- 随资产记录版权归属/许可/来源 URL。
- 需要本地资产时不要直接引用外链：请下载/复制到项目中并引用本地文件。

环境变量调整

- `GIFGREP_SOFTWARE_ANIM=1` 强制使用软件动画
- `GIFGREP_CELL_ASPECT=0.5` 调整预览几何形状
