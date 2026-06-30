---
name: mcporter
description: 通过 HTTP 或 stdio 列出、配置、验证、调用和检查 MCP 服务器/工具。
homepage: http://mcporter.dev
metadata:
  {
    "openclaw":
      {
        "emoji": "📦",
        "requires": { "bins": ["mcporter"] },
        "install":
          [
            {
              "id": "node",
              "kind": "node",
              "package": "mcporter",
              "bins": ["mcporter"],
              "label": "Install mcporter (node)",
            },
          ],
      },
  }
---

# mcporter

使用 `mcporter` 直接与 MCP 服务器交互。

快速开始

- `mcporter list`
- `mcporter list <server> --schema`
- `mcporter call <server.tool> key=value`

调用工具

- 选择器：`mcporter call linear.list_issues team=ENG limit:5`
- 函数语法：`mcporter call "linear.create_issue(title: \"Bug\")"`
- 完整 URL：`mcporter call https://api.example.com/mcp.fetch url:https://example.com`
- Stdio：`mcporter call --stdio "bun run ./server.ts" scrape url=https://example.com`
- JSON 载荷：`mcporter call <server.tool> --args '{"limit":5}'`

身份验证 + 配置

- OAuth：`mcporter auth <server | url> [--reset]`
- 配置：`mcporter config list|get|add|remove|import|login|logout`

守护进程

- `mcporter daemon start|status|stop|restart`

代码生成

- CLI：`mcporter generate-cli --server <name>` 或 `--command <url>`
- 检查：`mcporter inspect-cli <path> [--json]`
- TS：`mcporter emit-ts <server> --mode client|types`

注意事项

- 默认配置文件：`./config/mcporter.json`（可通过 `--config` 覆盖）。
- 机器可读结果优先使用 `--output json`。
