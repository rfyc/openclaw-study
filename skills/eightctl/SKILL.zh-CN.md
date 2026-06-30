---
name: eightctl
description: 控制 Eight Sleep 智能床垫（状态、温度、闹钟、计划）。
homepage: https://eightctl.sh
metadata:
  {
    "openclaw":
      {
        "emoji": "🛌",
        "requires": { "bins": ["eightctl"] },
        "install":
          [
            {
              "id": "go",
              "kind": "go",
              "module": "github.com/steipete/eightctl/cmd/eightctl@latest",
              "bins": ["eightctl"],
              "label": "Install eightctl (go)",
            },
          ],
      },
  }
---

# eightctl

使用 `eightctl` 控制 Eight Sleep 智能床垫。需要身份验证。

身份验证

- 配置文件：`~/.config/eightctl/config.yaml`
- 环境变量：`EIGHTCTL_EMAIL`、`EIGHTCTL_PASSWORD`

快速开始

- `eightctl status`
- `eightctl on|off`
- `eightctl temp 20`

常用任务

- 闹钟：`eightctl alarm list|create|dismiss`
- 计划：`eightctl schedule list|create|update`
- 音频：`eightctl audio state|play|pause`
- 底座：`eightctl base info|angle`

注意事项

- API 为非官方接口且有速率限制；避免频繁登录。
- 更改温度或闹钟前请先确认。
