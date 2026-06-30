---
summary: "Mac 应用如何嵌入网关 WebChat 以及如何调试它"
read_when:
  - 调试 Mac WebChat 视图或环回端口
title: "WebChat（macOS）"
---

macOS 菜单栏应用将 WebChat UI 嵌入为原生 SwiftUI 视图。它
连接到 Gateway 并默认为所选智能体的**主会话**（带有其他会话的会话切换器）。

- **本地模式**：直接连接到本地 Gateway WebSocket。
- **远程模式**：通过 SSH 转发 Gateway 控制端口并使用该
  隧道作为数据平面。

## 启动与调试

- 手动：菜单 → "打开聊天"。
- 自动打开用于测试：

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- 日志：`./scripts/clawlog.sh`（子系统 `ai.openclaw`，类别 `WebChatSwiftUI`）。

## 连接方式

- 数据平面：Gateway WS 方法 `chat.history`、`chat.send`、`chat.abort`、
  `chat.inject` 和事件 `chat`、`agent`、`presence`、`tick`、`health`。
- `chat.history` 返回显示规范化的转录行：内联指令
  标签从可见文本中剥离，纯文本工具调用 XML 载荷
  （包括 `<tool_call>...</tool_call>`、
  `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
  `<function_calls>...</function_calls>` 和截断的工具调用块）和
  泄露的 ASCII/全宽模型控制令牌被剥离，纯
  静默令牌助手行如精确的 `NO_REPLY` / `no_reply` 被
  省略，超大行可被占位符替换。
- 会话：默认为主要会话（`main`，或范围为
  全局时为 `global`）。UI 可以在会话间切换。
- 引导程序使用专用会话，使首次运行设置与其他内容分开。

## 安全接口

- 远程模式仅通过 SSH 转发 Gateway WebSocket 控制端口。

## 已知限制

- UI 针对聊天会话优化（不是完整的浏览器沙箱）。

## 相关

- [WebChat](/web/webchat)
- [macOS 应用](/platforms/macos)
