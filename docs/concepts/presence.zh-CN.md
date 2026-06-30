---
summary: "OpenClaw 在线状态条目如何生成、合并和显示"
read_when:
  - 调试实例标签页
  - 调查重复或陈旧的实例行
  - 更改网关 WS 连接或系统事件信标
title: "在线状态"
---

OpenClaw "在线状态"是以下内容的轻量级、尽力而为的视图：

- **网关**本身，以及
- **连接到网关的客户端**（macOS 应用、WebChat、CLI 等）

在线状态主要用于渲染 macOS 应用的**实例**标签页，并提供快速的运营可见性。

## 在线状态字段（显示的内容）

在线状态条目是结构化对象，包含以下字段：

- `instanceId`（可选但强烈建议）：稳定的客户端标识（通常是 `connect.client.instanceId`）
- `host`：人类友好的主机名
- `ip`：尽力而为的 IP 地址
- `version`：客户端版本字符串
- `deviceFamily` / `modelIdentifier`：硬件提示
- `mode`：`ui`、`webchat`、`cli`、`backend`、`probe`、`test`、`node` 等
- `lastInputSeconds`："距上次用户输入的秒数"（如果已知）
- `reason`：`self`、`connect`、`node-connected`、`periodic` 等
- `ts`：最后更新时间戳（自纪元以来的毫秒）

## 生产者（在线状态的来源）

在线状态条目由多个来源生成并**合并**。

### 1）网关自身条目

网关在启动时始终播种一个"self"条目，以便 UI 在任何客户端连接之前也显示网关主机。

### 2）WebSocket 连接

每个 WS 客户端以 `connect` 请求开始。握手成功后，网关为该连接插入一个在线状态条目。

#### 为什么一次性 CLI 命令不显示

CLI 经常为短暂的一次性命令连接。为了避免垃圾邮件般的实例列表，`client.mode === "cli"` **不**转换为在线状态条目。

### 3）`system-event` 信标

客户端可以通过 `system-event` 方法发送更丰富的周期性信标。macOS 应用使用此方式报告主机名、IP 和 `lastInputSeconds`。

### 4）节点连接（角色：node）

当节点通过网关 WebSocket 以 `role: node` 连接时，网关为该节点插入一个在线状态条目（与其他 WS 客户端的流程相同）。

## 合并 + 去重规则（为什么 `instanceId` 重要）

在线状态条目存储在单个内存映射中：

- 条目以**在线状态键**为键。
- 最佳键是稳定的 `instanceId`（来自 `connect.client.instanceId`），在重启后仍然有效。
- 键不区分大小写。

如果客户端在没有稳定 `instanceId` 的情况下重新连接，它可能显示为**重复**行。

## TTL 和有界大小

在线状态是有意短暂的：

- **TTL：** 超过 5 分钟的条目被修剪
- **最大条目数：** 200（最旧的先删除）

这保持列表新鲜并避免无界内存增长。

## 远程/隧道注意事项（回环 IP）

当客户端通过 SSH 隧道/本地端口转发连接时，网关可能看到远程地址为 `127.0.0.1`。为了避免覆盖良好的客户端报告的 IP，回环远程地址被忽略。

## 消费者

### macOS 实例标签页

macOS 应用渲染 `system-presence` 的输出，并根据最后更新的年龄应用一个小状态指示器（活跃/空闲/陈旧）。

## 调试技巧

- 要查看原始列表，对网关调用 `system-presence`。
- 如果你看到重复项：
  - 确认客户端在握手中发送稳定的 `client.instanceId`
  - 确认周期性信标使用相同的 `instanceId`
  - 检查连接派生的条目是否缺少 `instanceId`（预期会有重复项）

## 相关

- [输入指示器](/concepts/typing-indicators)
- [流式传输和分块](/concepts/streaming)
