---
summary: "跨信封、提示词、工具和连接器的日期时间处理"
read_when:
  - 更改时间戳向模型或用户显示方式时
  - 调试消息或系统提示词输出中的时间格式时
title: "日期和时间"
---

# 日期与时间

OpenClaw 默认使用**主机本地时间作为传输时间戳**，并**仅在系统提示词中使用用户时区**。
提供商时间戳被保留，以便工具保留其原生语义（当前时间可通过 `session_status` 获取）。

## 消息信封（默认本地时间）

入站消息会附加时间戳（分钟精度）包装：

```
[Provider ... 2026-01-05 16:26 PST] message text
```

此信封时间戳**默认为主机本地时间**，与提供商时区无关。

你可以覆盖此行为：

```json5
{
  agents: {
    defaults: {
      envelopeTimezone: "local", // "utc" | "local" | "user" | IANA 时区
      envelopeTimestamp: "on", // "on" | "off"
      envelopeElapsed: "on", // "on" | "off"
    },
  },
}
```

- `envelopeTimezone: "utc"` 使用 UTC。
- `envelopeTimezone: "local"` 使用主机时区。
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（回退到主机时区）。
- 使用显式 IANA 时区（例如，`"America/Chicago"`）以固定时区。
- `envelopeTimestamp: "off"` 从信封头中删除绝对时间戳。
- `envelopeElapsed: "off"` 删除经过时间后缀（`+2m` 样式）。

### 示例

**本地时间（默认）：**

```
[WhatsApp +1555 2026-01-18 00:19 PST] hello
```

**用户时区：**

```
[WhatsApp +1555 2026-01-18 00:19 CST] hello
```

**启用经过时间：**

```
[WhatsApp +1555 +30s 2026-01-18T05:19Z] follow-up
```

## 系统提示词：当前日期和时间

如果用户时区已知，系统提示词包含专用的**当前日期和时间**部分，其中仅包含**时区**（无时钟/时间格式），以保持提示词缓存稳定：

```
Time zone: America/Chicago
```

当代理需要当前时间时，使用 `session_status` 工具；状态卡包含时间戳行。

## 系统事件行（默认本地时间）

插入到代理上下文中的排队系统事件以时间戳为前缀，使用与消息信封相同的时区选择（默认：主机本地时间）。

```
System: [2026-01-12 12:19:17 PST] Model switched.
```

### 配置用户时区 + 格式

```json5
{
  agents: {
    defaults: {
      userTimezone: "America/Chicago",
      timeFormat: "auto", // auto | 12 | 24
    },
  },
}
```

- `userTimezone` 设置提示词上下文的**用户本地时区**。
- `timeFormat` 控制提示词中的 **12/24 小时显示**。`auto` 遵循操作系统偏好。

## 时间格式检测（auto）

当 `timeFormat: "auto"` 时，OpenClaw 检查操作系统偏好（macOS/Windows）并回退到区域格式。检测到的值**每个进程缓存一次**，以避免重复系统调用。

## 工具有效载荷 + 连接器（原始提供商时间 + 规范化字段）

频道工具返回**提供商原生时间戳**并添加规范化字段以保持一致性：

- `timestampMs`：纪元毫秒（UTC）
- `timestampUtc`：ISO 8601 UTC 字符串

原始提供商字段被保留，不会丢失任何信息。

- Slack：来自 API 的类纪元字符串
- Discord：UTC ISO 时间戳
- Telegram/WhatsApp：提供商特定的数字/ISO 时间戳

如果需要本地时间，请使用已知时区在下游进行转换。

## 相关文档

- [系统提示词](/concepts/system-prompt)
- [时区](/concepts/timezone)
- [消息](/concepts/messages)
