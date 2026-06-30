---
name: ordercli
description: 专用于 Foodora 的 CLI，用于查看历史订单和活跃订单状态（Deliveroo 开发中）。
homepage: https://ordercli.sh
metadata:
  {
    "openclaw":
      {
        "emoji": "🛵",
        "requires": { "bins": ["ordercli"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "steipete/tap/ordercli",
              "bins": ["ordercli"],
              "label": "Install ordercli (brew)",
            },
            {
              "id": "go",
              "kind": "go",
              "module": "github.com/steipete/ordercli/cmd/ordercli@latest",
              "bins": ["ordercli"],
              "label": "Install ordercli (go)",
            },
          ],
      },
  }
---

# ordercli

使用 `ordercli` 查看历史订单和追踪活跃订单状态（目前仅支持 Foodora）。

快速开始（Foodora）

- `ordercli foodora countries`
- `ordercli foodora config set --country AT`
- `ordercli foodora login --email you@example.com --password-stdin`
- `ordercli foodora orders`
- `ordercli foodora history --limit 20`
- `ordercli foodora history show <orderCode>`

订单

- 活跃列表（预计到达/状态）：`ordercli foodora orders`
- 监听：`ordercli foodora orders --watch`
- 活跃订单详情：`ordercli foodora order <orderCode>`
- 历史详情 JSON：`ordercli foodora history show <orderCode> --json`

重新下单（添加到购物车）

- 预览：`ordercli foodora reorder <orderCode>`
- 确认：`ordercli foodora reorder <orderCode> --confirm`
- 指定地址：`ordercli foodora reorder <orderCode> --confirm --address-id <id>`

Cloudflare / 机器人保护

- 浏览器登录：`ordercli foodora login --email you@example.com --password-stdin --browser`
- 复用配置文件：`--browser-profile "$HOME/Library/Application Support/ordercli/browser-profile"`
- 导入 Chrome Cookie：`ordercli foodora cookies chrome --profile "Default"`

会话导入（无需密码）

- `ordercli foodora session chrome --url https://www.foodora.at/ --profile "Default"`
- `ordercli foodora session refresh --client-id android`

Deliveroo（开发中，暂不可用）

- 需要 `DELIVEROO_BEARER_TOKEN`（可选 `DELIVEROO_COOKIE`）。
- `ordercli deliveroo config set --market uk`
- `ordercli deliveroo history`

注意事项

- 测试时使用 `--config /tmp/ordercli.json`。
- 任何重新下单或更改购物车的操作前请先确认。
