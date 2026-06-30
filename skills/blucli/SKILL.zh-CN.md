---
name: blucli
description: 用于发现、播放控制、分组和音量调节的 BluOS CLI（blu）。
homepage: https://blucli.sh
metadata:
  {
    "openclaw":
      {
        "emoji": "🫐",
        "requires": { "bins": ["blu"] },
        "install":
          [
            {
              "id": "go",
              "kind": "go",
              "module": "github.com/steipete/blucli/cmd/blu@latest",
              "bins": ["blu"],
              "label": "Install blucli (go)",
            },
          ],
      },
  }
---

# blucli（blu）

使用 `blu` 控制 Bluesound/NAD 播放器。

快速开始

- `blu devices`（选择目标设备）
- `blu --device <id> status`
- `blu play|pause|stop`
- `blu volume set 15`

目标选择（按优先级顺序）

- `--device <id|name|alias>`
- `BLU_DEVICE`
- 配置默认值（如已设置）

常见任务

- 分组：`blu group status|add|remove`
- TuneIn 搜索/播放：`blu tunein search "关键词"`、`blu tunein play "关键词"`

脚本中优先使用 `--json`。更改播放状态前请确认目标设备。
