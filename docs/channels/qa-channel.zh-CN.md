---
summary: "用于确定性 OpenClaw QA 场景的合成 Slack 类频道插件"
title: "QA 频道"
read_when:
  - 您正在将合成 QA 传输接入本地或 CI 测试运行
  - 您需要捆绑的 qa-channel 配置界面
  - 您正在迭代端到端 QA 自动化
---

`qa-channel` 是用于自动化 OpenClaw QA 的捆绑合成消息传输。它不是生产频道——它的存在是为了使用真实传输所使用的相同频道插件边界，同时保持状态确定性且完全可检查。

## 它的功能

- Slack 类目标语法：
  - `dm:<user>`
  - `channel:<room>`
  - `group:<room>`
  - `thread:<room>/<thread>`
- 共享的 `channel:` 和 `group:` 对话作为群组/频道房间轮次呈现给智能体，因此它们使用与 Discord、Slack、Telegram 和类似传输相同的可见回复和消息工具路由策略。
- HTTP 支持的合成总线，用于入站消息注入、出站转录捕获、线程创建、反应、编辑、删除和搜索/读取操作。
- 主机端自我检查运行器，将 Markdown 报告写入 `.artifacts/qa-e2e/`。

## 配置

```json
{
  "channels": {
    "qa-channel": {
      "baseUrl": "http://127.0.0.1:43123",
      "botUserId": "openclaw",
      "botDisplayName": "OpenClaw QA",
      "allowFrom": ["*"],
      "pollTimeoutMs": 1000
    }
  }
}
```

账户键：

- `enabled` — 此账户的主开关。
- `name` — 可选的显示标签。
- `baseUrl` — 合成总线 URL。
- `botUserId` — 目标语法中使用的 Matrix 风格机器人用户 id。
- `botDisplayName` — 出站消息的显示名称。
- `pollTimeoutMs` — 长轮询等待窗口。100 到 30000 之间的整数。
- `allowFrom` — 发送者白名单（用户 ID 或 `"*"`）。
- `defaultTo` — 未提供时的回退目标。
- `actions.messages` / `actions.reactions` / `actions.search` / `actions.threads` — 每操作工具门控。

顶层多账户键：

- `accounts` — 按账户 ID 键控的命名每账户覆盖记录。
- `defaultAccount` — 配置了多个账户时的首选账户 ID。

## 运行器

主机端自我检查（在 `.artifacts/qa-e2e/` 下写入 Markdown 报告）：

```bash
pnpm qa:e2e
```

这通过 `qa-lab` 路由，启动仓库内 QA 总线，引导捆绑的 `qa-channel` 运行时切片，并运行确定性自我检查。

完整的仓库支持场景套件：

```bash
pnpm openclaw qa suite
```

针对 QA 网关通道并行运行场景。请参阅 [QA 概述](/concepts/qa-e2e-automation)了解场景、配置文件和提供商模式。

Docker 支持的 QA 站点（一个堆栈中的网关 + QA Lab 调试器 UI）：

```bash
pnpm qa:lab:up
```

构建 QA 站点，启动 Docker 支持的网关 + QA Lab 堆栈，并打印 QA Lab URL。从那里您可以选择场景、选择模型通道、启动单独的运行并实时观看结果。QA Lab 调试器与随附的控制 UI 包分开。

## 相关文档

- [QA 概述](/concepts/qa-e2e-automation) — 整体堆栈、传输适配器、场景编写
- [Matrix QA](/concepts/qa-matrix) — 驱动真实频道的实时传输运行器示例
- [配对](/channels/pairing)
- [群组](/channels/groups)
- [频道概述](/channels)
