---
summary: "从命令行运行代理轮次并可选地将回复交付到频道"
read_when:
  - 您想从脚本或命令行触发代理运行
  - 您需要以编程方式将代理回复交付到聊天频道
title: "代理发送"
---

`openclaw agent` 无需入站聊天消息即可从命令行运行单个代理轮次。用于脚本工作流、测试和编程交付。

## 快速开始

<Steps>
  <Step title="运行简单的代理轮次">
    ```bash
    openclaw agent --message "今天天气怎么样？"
    ```

    这将通过 Gateway 发送消息并打印回复。

  </Step>

  <Step title="定位特定代理或会话">
    ```bash
    # 定位特定代理
    openclaw agent --agent ops --message "Summarize logs"

    # 定位电话号码（推导会话密钥）
    openclaw agent --to +15555550123 --message "Status update"

    # 重用现有会话
    openclaw agent --session-id abc123 --message "Continue the task"
    ```

  </Step>

  <Step title="将回复交付到频道">
    ```bash
    # 交付到 WhatsApp（默认频道）
    openclaw agent --to +15555550123 --message "Report ready" --deliver

    # 交付到 Slack
    openclaw agent --agent ops --message "Generate report" \
      --deliver --reply-channel slack --reply-to "#reports"
    ```

  </Step>
</Steps>

## 标志

| 标志                          | 描述                                              |
| ----------------------------- | ------------------------------------------------- |
| `--message \<text\>`          | 要发送的消息（必填）                              |
| `--to \<dest\>`               | 从目标推导会话密钥（电话、聊天 id）               |
| `--agent \<id\>`              | 定位已配置的代理（使用其 `main` 会话）            |
| `--session-id \<id\>`         | 通过 id 重用现有会话                              |
| `--local`                     | 强制使用本地嵌入式运行时（跳过 Gateway）          |
| `--deliver`                   | 将回复发送到聊天频道                              |
| `--channel \<name\>`          | 交付频道（whatsapp、telegram、discord、slack 等） |
| `--reply-to \<target\>`       | 交付目标覆盖                                      |
| `--reply-channel \<name\>`    | 交付频道覆盖                                      |
| `--reply-account \<id\>`      | 交付账户 id 覆盖                                  |
| `--thinking \<level\>`        | 为所选模型配置文件设置思考级别                    |
| `--verbose \<on\|full\|off\>` | 设置详细级别                                      |
| `--timeout \<seconds\>`       | 覆盖代理超时                                      |
| `--json`                      | 输出结构化 JSON                                   |

## 行为

- 默认情况下，CLI **通过 Gateway** 运行。添加 `--local` 以强制在当前机器上使用嵌入式运行时。
- 如果 Gateway 无法访问，CLI **回退**到本地嵌入式运行。
- 会话选择：`--to` 推导会话密钥（群组/频道目标保持隔离；直接聊天折叠到 `main`）。
- 思考和详细标志会持久化到会话存储中。
- 输出：默认为纯文本，或使用 `--json` 获取结构化负载 + 元数据。

## 示例

```bash
# 带 JSON 输出的简单轮次
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json

# 带思考级别的轮次
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium

# 交付到不同于会话的频道
openclaw agent --agent ops --message "Alert" --deliver --reply-channel telegram --reply-to "@admin"
```

## 相关

- [代理 CLI 参考](/cli/agent)
- [子代理](/tools/subagents) — 后台子代理生成
- [会话](/concepts/session) — 会话密钥的工作方式
