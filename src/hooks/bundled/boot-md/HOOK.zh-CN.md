---
name: boot-md
description: "在 gateway 启动时运行 BOOT.md"
homepage: https://docs.openclaw.ai/automation/hooks#boot-md
metadata:
  {
    "openclaw":
      {
        "emoji": "🚀",
        "events": ["gateway:startup"],
        "requires": { "config": ["workspace.dir"] },
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with OpenClaw" }],
      },
  }
---

# 启动清单 Hook

在 gateway 启动时，为每个已配置的智能体范围运行 `BOOT.md`（如果该文件存在于该智能体解析的工作区中）。
