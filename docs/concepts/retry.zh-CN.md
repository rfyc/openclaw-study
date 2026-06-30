---
summary: "出站提供商调用的重试策略"
read_when:
  - 更新提供商重试行为或默认值
  - 调试提供商发送错误或速率限制
title: "重试策略"
---

## 目标

- 按 HTTP 请求重试，而不是按多步骤流程重试。
- 通过仅重试当前步骤来保持顺序。
- 避免重复非幂等操作。

## 默认值

- 尝试次数：3
- 最大延迟上限：30000 毫秒
- 抖动：0.1（10%）
- 提供商默认值：
  - Telegram 最小延迟：400 毫秒
  - Discord 最小延迟：500 毫秒

## 行为

### 模型提供商

- OpenClaw 让提供商 SDK 处理正常的短重试。
- 对于基于 Stainless 的 SDK（如 Anthropic 和 OpenAI），可重试的响应（`408`、`409`、`429` 和 `5xx`）可以包含 `retry-after-ms` 或 `retry-after`。当该等待时间超过 60 秒时，OpenClaw 注入 `x-should-retry: false`，以便 SDK 立即返回错误，而模型故障转移可以轮换到另一个身份验证配置文件或备用模型。
- 使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS=<seconds>` 覆盖上限。将其设置为 `0`、`false`、`off`、`none` 或 `disabled` 以让 SDK 在内部遵守较长的 `Retry-After` 睡眠。

### Discord

- 在速率限制错误（HTTP 429）、请求超时、HTTP 5xx 响应以及 DNS 查找失败、连接重置、套接字关闭和获取失败等瞬时传输故障时重试。
- 可用时使用 Discord `retry_after`，否则使用指数退避。

### Telegram

- 在瞬时错误（429、超时、连接/重置/关闭、暂时不可用）时重试。
- 可用时使用 `retry_after`，否则使用指数退避。
- Markdown 解析错误不重试；它们回退到纯文本。

## 配置

在 `~/.openclaw/openclaw.json` 中按提供商设置重试策略：

```json5
{
  channels: {
    telegram: {
      retry: {
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
    discord: {
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
  },
}
```

## 注意事项

- 重试适用于每个请求（消息发送、媒体上传、反应、轮询、贴纸）。
- 复合流程不重试已完成的步骤。

## 相关

- [模型故障转移](/concepts/model-failover)
- [命令队列](/concepts/queue)
