---
name: bootstrap-extra-files
description: "通过 glob/路径模式注入额外的工作区启动文件"
homepage: https://docs.openclaw.ai/automation/hooks#bootstrap-extra-files
metadata:
  {
    "openclaw":
      {
        "emoji": "📎",
        "events": ["agent:bootstrap"],
        "requires": { "config": ["workspace.dir"] },
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with OpenClaw" }],
      },
  }
---

# 额外启动文件 Hook

在 `agent:bootstrap` 期间将额外的启动文件加载到 `Project Context`（项目上下文）中。

## 用途

当你的工作区有多个上下文根目录（例如 monorepo）且你想在不更改工作区根目录的情况下包含额外的 `AGENTS.md`/`TOOLS.md` 类文件时，使用此 hook。

## 配置

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": ["packages/*/AGENTS.md", "packages/*/TOOLS.md"]
        }
      }
    }
  }
}
```

## 选项

- `paths`（string[]）：首选的 glob/路径模式列表。
- `patterns`（string[]）：`paths` 的别名。
- `files`（string[]）：`paths` 的别名。

所有路径从工作区解析，且必须保持在工作区内（包括 realpath 检查）。
只加载已识别的启动文件基名（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、
`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`、`MEMORY.md`）。
