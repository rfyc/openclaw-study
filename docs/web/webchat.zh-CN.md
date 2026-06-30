---
summary: "回环 WebChat 静态主机和用于聊天 UI 的 Gateway WS 使用"
read_when:
  - 调试或配置 WebChat 访问
title: "WebChat"
---

状态：macOS/iOS SwiftUI 聊天 UI 直接与 Gateway WebSocket 通信。

## 它是什么

- 一个原生聊天 UI，用于 gateway（无嵌入式浏览器，无本地静态服务器）。
- 使用与其他频道相同的会话和路由规则。
- 确定性路由：回复始终返回到 WebChat。

## 快速开始

1. 启动 gateway。
2. 打开 WebChat UI（macOS/iOS 应用）或控制 UI 聊天标签页。
3. 确保配置了有效的 gateway 认证路径（默认情况下是共享密钥，即使在回环上）。

## 工作原理（行为）

- UI 连接到 Gateway WebSocket 并使用 `chat.history`、`chat.send` 和 `chat.inject`。
- `chat.history` 有界以确保稳定性：Gateway 可能截断长文本字段、省略重元数据，并用 `[chat.history omitted: message too large]` 替换过大的条目。
- `chat.history` 遵循现代仅追加会话文件的活动转录本分支，因此废弃的重写分支和被取代的提示副本不在 WebChat 中渲染。
- 压缩条目渲染为显式的已压缩历史分隔符。分隔符解释早期轮次保留在检查点中，并链接到会话检查点控件，操作员在权限允许时可以在那里分支或恢复压缩前视图。
- 控制 UI 记住 `chat.history` 返回的后备 Gateway `sessionId`，并将其包含在后续 `chat.send` 调用中，因此重新连接和页面刷新继续相同的存储对话，除非用户启动或重置会话。
- 控制 UI 在同一会话、消息和附件的重复飞行中提交之前合并它们，然后再生成新的 `chat.send` 运行 id；如果重复请求重用相同的幂等键，Gateway 仍然会去重。
- 工作区启动文件和待处理的 `BOOTSTRAP.md` 指令通过代理系统提示的项目上下文提供，不复制到 WebChat 用户消息中。引导截断仅添加简洁的系统提示恢复通知；详细计数和配置旋钮保留在诊断界面上。
- `chat.history` 也进行显示规范化：运行时专用的 OpenClaw 上下文、入站信封包装器、内联交付指令标签（如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截断的工具调用块），以及泄漏的 ASCII/全宽模型控制令牌从可见文本中剥离，整个可见文本仅为精确静默令牌 `NO_REPLY` / `no_reply` 的助手条目被省略。
- 推理标记的回复载荷（`isReasoning: true`）从 WebChat 助手内容、转录本重放文本和音频内容块中排除，因此仅思考载荷不作为可见助手消息或可播放音频显示。
- `chat.inject` 直接将助手注释附加到转录本并广播到 UI（无代理运行）。
- 中止的运行可以在 UI 中保持部分助手输出可见。
- 当缓冲输出存在时，Gateway 将中止的部分助手文本持久化到转录本历史中，并用中止元数据标记这些条目。
- 历史始终从 gateway 获取（无本地文件监视）。
- 如果 gateway 不可达，WebChat 是只读的。

### 转录本和交付模型

WebChat 有两条独立的数据路径：

- 会话 JSONL 文件是持久的模型/运行时转录本。对于普通代理运行，Pi 通过其会话管理器持久化模型可见的 `user`、`assistant` 和 `toolResult` 消息。WebChat 不将任意交付、状态或助手文本写入该转录本。
- Gateway `ReplyPayload` 事件是实时交付投影。它们可以为 WebChat/频道显示、块流、指令标签、媒体嵌入、TTS/音频标志和 UI 回退行为进行规范化。它们本身不是规范会话日志。
- 仅当 Gateway 拥有正常 Pi 助手轮次之外的显示消息时，WebChat 才注入助手转录本条目：`chat.inject`、非代理命令回复、中止的部分输出和 WebChat 管理的媒体转录本补充。
- `chat.history` 读取存储的会话转录本并应用 WebChat 显示投影。如果实时助手文本在运行期间出现但在历史重新加载后消失，首先检查原始 JSONL 是否包含助手文本，然后检查 `chat.history` 投影是否剥离了它，再检查控制 UI 乐观尾部合并是否用持久化快照替换了本地交付状态。

正常代理运行的最终答案应该是持久的，因为 Pi 写入助手 `message_end`。将交付的最终载荷镜像到转录本的任何回退必须首先避免复制 Pi 已经写入的助手轮次。

## 控制 UI 代理工具面板

- 控制 UI `/agents` 工具面板有两个独立视图：
  - **立即可用** 使用 `tools.effective(sessionKey=...)` 并显示当前会话在运行时实际可以使用的内容，包括核心、插件和频道拥有的工具。
  - **工具配置** 使用 `tools.catalog` 并专注于配置文件、覆盖和目录语义。
- 运行时可用性是会话范围的。在同一代理上切换会话可以更改**立即可用**列表。
- 配置编辑器不暗示运行时可用性；有效访问仍然遵循策略优先级（`allow`/`deny`、每代理和提供商/频道覆盖）。

## 远程使用

- 远程模式通过 SSH/Tailscale 隧道传输 gateway WebSocket。
- 你不需要运行单独的 WebChat 服务器。

## 配置参考（WebChat）

完整配置：[配置](/gateway/configuration)

WebChat 选项：

- `gateway.webchat.chatHistoryMaxChars`：`chat.history` 响应中文本字段的最大字符数。当转录本条目超过此限制时，Gateway 截断长文本字段，并可能用占位符替换过大的消息。客户端还可以发送每请求 `maxChars` 来覆盖单个 `chat.history` 调用的此默认值。

相关全局选项：

- `gateway.port`、`gateway.bind`：WebSocket 主机/端口。
- `gateway.auth.mode`、`gateway.auth.token`、`gateway.auth.password`：共享密钥 WebSocket 认证。
- `gateway.auth.allowTailscale`：启用时，浏览器控制 UI 聊天标签页可以使用 Tailscale Serve 身份标头。
- `gateway.auth.mode: "trusted-proxy"`：位于身份感知**非回环**代理源后面的浏览器客户端的反向代理认证（参阅[可信代理认证](/gateway/trusted-proxy-auth)）。
- `gateway.remote.url`、`gateway.remote.token`、`gateway.remote.password`：远程 gateway 目标。
- `session.*`：会话存储和主键默认值。

## 相关链接

- [控制 UI](/web/control-ui)
- [仪表盘](/web/dashboard)
