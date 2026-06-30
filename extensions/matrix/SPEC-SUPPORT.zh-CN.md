# Matrix 规范支持

为打包的 Matrix 插件追踪当前 Matrix 规范/事件支持情况。

范围：

- 仅代码支持的当前状态
- 仅插件行为；不声称完整的 Matrix 规范覆盖
- 添加或删除 Matrix 事件/规范支持时更新此文件

图例：

- `in`：入站处理
- `out`：出站发送/编辑/发出
- `tools`：基于该表面构建的 CLI/操作/运行时工具

## 支持矩阵

| 表面              | 规范 / 事件 ID                                                                                     | 支持         | 备注                                              | 证据                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 核心消息          | `m.room.message`                                                                                   | in/out/tools | 基础文本/媒体消息表面                             | `src/matrix/send/types.ts`, `src/matrix/actions/messages.ts`                                                               |
| 富文本            | `org.matrix.custom.html`                                                                           | out          | Markdown 渲染为 Matrix HTML                       | `src/matrix/send/formatting.ts`                                                                                            |
| 回复              | `m.in_reply_to`                                                                                    | in/out       | 回复关系支持                                      | `src/matrix/send/formatting.ts`                                                                                            |
| 编辑              | `m.replace`                                                                                        | in/out/tools | Matrix 编辑流程；编辑正文使用 `* <text>` 回退格式 | `src/matrix/send/types.ts`, `src/matrix/draft-stream.test.ts`                                                              |
| 线程              | `m.thread`                                                                                         | in/out/tools | 线程发送、路由、会话/线程策略                     | `src/matrix/send/types.ts`, `src/matrix/monitor/types.ts`, `src/matrix/monitor/threads.test.ts`                            |
| 直接房间          | `m.direct`                                                                                         | in/out/tools | DM 路由、缓存、修复、出站目标选择                 | `src/matrix/send/types.ts`, `src/matrix/sdk.ts`, `src/matrix/send/targets.test.ts`, `src/matrix/direct-management.test.ts` |
| 反应              | `m.reaction`, `m.annotation`                                                                       | in/out/tools | 发送、汇总、入站反应路由                          | `src/matrix/reaction-common.ts`, `src/matrix/monitor/reaction-events.test.ts`                                              |
| 已读回执          | `m.read`                                                                                           | out          | 在入站消息接收时发送                              | `src/matrix/sdk.ts`, `src/matrix/monitor/handler.ts`                                                                       |
| 正在输入          | 输入 API                                                                                           | out          | 回复运行时保持输入存活                            | `src/matrix/sdk.ts`, `src/matrix/send.ts`, `src/matrix/monitor/handler.ts`                                                 |
| 提及              | `m.mentions`                                                                                       | in/out/tools | 发送/编辑/媒体标题/投票回退文本上的稳定提及元数据 | `src/matrix/send/formatting.ts`, `src/matrix/monitor/mentions.ts`, `src/matrix/send.test.ts`                               |
| 提及链接兼容      | `https://matrix.to/#/...`                                                                          | in/out       | 在格式化 HTML 中发出 + 验证可见标签提及           | `src/matrix/format.ts`, `src/matrix/monitor/mentions.ts`                                                                   |
| 投票              | `m.poll.start`, `m.poll.response`, `m.poll.end`                                                    | in/out/tools | 稳定的投票创建/读取/投票/摘要流程                 | `src/matrix/poll-types.ts`, `src/matrix/actions/polls.ts`, `src/matrix/poll-summary.ts`                                    |
| 投票兼容          | `org.matrix.msc3381.poll.start`, `org.matrix.msc3381.poll.response`, `org.matrix.msc3381.poll.end` | in/out       | 不稳定投票兼容仍在需要时发出/解析                 | `src/matrix/poll-types.ts`, `src/matrix/send.test.ts`                                                                      |
| 投票关系          | `m.reference`                                                                                      | in/out/tools | 投票/结果链接到根投票事件                         | `src/matrix/poll-types.ts`, `src/matrix/actions/polls.ts`, `src/matrix/poll-summary.ts`                                    |
| 可扩展文本回退    | `org.matrix.msc1767.text`                                                                          | in/out       | 投票文本回退/兼容                                 | `src/matrix/poll-types.ts`                                                                                                 |
| 语音消息          | `org.matrix.msc3245.voice`                                                                         | out          | 兼容音频发送上的语音气泡标记                      | `src/matrix/send/media.ts`, `src/matrix/send/types.ts`                                                                     |
| 语音音频元数据    | `org.matrix.msc1767.audio`                                                                         | out          | 语音发送的持续时间元数据                          | `src/matrix/send/media.ts`, `src/matrix/send/types.ts`                                                                     |
| 位置              | `m.location`, `geo:`                                                                               | in           | 解析到文本/上下文的入站；此处未追踪出站位置发送   | `src/matrix/monitor/types.ts`, `src/matrix/monitor/location.ts`, `src/matrix/monitor/handler.ts`                           |
| E2EE 房间事件     | `m.room.encrypted`                                                                                 | in/out/tools | 加密事件水化、解密、加密媒体发送                  | `src/matrix/monitor/types.ts`, `src/matrix/sdk.ts`, `docs/channels/matrix.md`                                              |
| 加密媒体预览      | `file`, `thumbnail_file`                                                                           | out          | 加密图像事件的加密缩略图                          | `src/matrix/send/media.ts`, `docs/channels/matrix.md`                                                                      |
| 设备验证          | `m.key.verification.*`, `m.key.verification.request`                                               | in/tools     | 请求/就绪/开始/SAS/完成/取消通知和 CLI 流程       | `src/matrix/monitor/verification-utils.ts`, `src/matrix/monitor/events.test.ts`, `docs/channels/matrix.md`                 |
| 流式传输/实时标记 | `org.matrix.msc4357.live`                                                                          | out          | 用于部分流式传输的实时草稿/编辑标记               | `src/matrix/send/types.ts`, `src/matrix/send.ts`, `src/matrix/draft-stream.ts`                                             |

## 当前使用的显式 MSC

这些 MSC 今天在插件中被明确引用：

- `MSC3381`：投票
- `MSC1767`：用于投票和语音元数据的可扩展事件回退字段
- `MSC3245`：语音消息标记
- `MSC4357`：实时流式传输标记

证据：

- `src/matrix/poll-types.ts`
- `src/matrix/send/media.ts`
- `src/matrix/send/types.ts`
- `src/matrix/draft-stream.ts`

## 非目标

此文件不声称：

- 完整的客户端-服务器 API 覆盖
- 从 `matrix-js-sdk` 继承的完整房间状态/事件覆盖
- 上面未列出的任何表面的出站支持

如果新的 Matrix 功能落地，添加一行包含：

1. 确切的事件/规范 ID
2. 支持形状（`in`、`out`、`tools`）
3. 至少一个证明它的代码路径

## 缺失 / 候选规范

按用户可见价值和与当前代码的接近程度排列的推荐下一步添加项：

| 优先级 | 表面                    | 规范 / 事件 ID                                  | 为何添加                                                         | 当前缺口                                                    |
| ------ | ----------------------- | ----------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| 高     | 贴纸消息                | `m.sticker`                                     | 稳定规范；常见客户端表面；我们已经在读取路径上对贴纸附件进行分类 | 没有明确的入站 `m.sticker` 事件处理，也没有出站贴纸发送路径 |
| 高     | 出站位置消息            | `m.location`, `geo_uri`                         | 稳定规范；文档已说明 Matrix 支持位置，但当前实现仅为入站         | 没有出站位置发送/操作 API                                   |
| 中     | 私有 + 更丰富的已读标记 | `m.read.private`, `m.fully_read`                | 稳定规范；比仅公共 `m.read` 有更好的隐私和更清晰的已读状态行为   | 当前代码仅发送公共 `m.read` 回执                            |
| 中     | 线程感知回执            | 带 `thread_id` 的 `m.read`                      | 稳定规范；与 Matrix 线程 UX 更好对齐                             | 当前回执发送路径不支持 `thread_id`                          |
| 中     | 未读标记                | `m.marked_unread`                               | 稳定规范；对操作员工作流和房间分类工具有用                       | 未读标记没有房间账户数据支持                                |
| 低     | 表情消息                | `m.emote`                                       | 稳定规范；bot/操作工具的简单等价胜利                             | 没有明确的发送/操作支持                                     |
| 低     | 投票关闭等价            | `m.poll.end`, `org.matrix.msc3381.poll.end`     | 在我们已经解析的表面上完成投票生命周期                           | 插件解析投票结束事件但不公开出站关闭流程                    |
| 低     | 动画媒体元数据          | `m.image` / `m.sticker` 上的 `info.is_animated` | 较新的稳定元数据；帮助客户端决定是否获取/渲染动画原件            | 媒体信息构建器不填充动画元数据                              |

### 为何列出这些

- `m.sticker` 是最新 Matrix 客户端-服务器 API 中的稳定规范表面，插件已在消息摘要中具有部分贴纸感知。
- `m.location` 是最新 Matrix 客户端-服务器 API 中的稳定规范表面。插件当前从 `geo_uri` 解析入站位置事件，但不发送它们。
- `m.read.private`、`m.fully_read` 和线程回执是最新 Matrix 客户端-服务器 API 中的稳定已读标记/已读回执表面。插件目前仅发布普通 `m.read` 回执。
- `m.marked_unread` 是最新 Matrix 客户端-服务器 API 中稳定的房间账户数据表面，如果 Matrix 操作增加更多操作员/客户端类房间分类控件将很有用。
- `m.emote` 是稳定的消息类型，与上面的项目相比是相对较小的添加。
- `m.poll.end` 已在本地投票类型中表示，因此公开关闭投票发送/工具流程是一个有限的后续工作。
- `info.is_animated` 是较小的元数据等价项，但一旦存在贴纸支持就很容易遗漏。

### 可能不值得在此优先处理

- VoIP / `m.call.*`：有效的 Matrix 规范区域，在此处是合理的未来方向，但相对于消息、回执和房间状态缺口，不是近期优先事项。

### 缺口证据

- 仅部分贴纸：`src/matrix/media-text.ts`
- 仅入站位置：`src/matrix/monitor/location.ts`、`src/matrix/monitor/handler.ts`
- 仅公共回执：`src/matrix/sdk.ts`、`src/matrix/send.ts`、`src/matrix/monitor/handler.ts`
- 仅投票结束常量：`src/matrix/poll-types.ts`
- 无动画元数据发出：`src/matrix/send/media.ts`

### 外部规范参考

- 最新 Matrix 客户端-服务器 API：<https://spec.matrix.org/latest/client-server-api/index.html>
- `m.sticker`：<https://spec.matrix.org/latest/client-server-api/#msticker>
- `m.location`：<https://spec.matrix.org/latest/client-server-api/#mlocation>
- 回执和已读标记（`m.read.private`、`m.fully_read`、`m.marked_unread`）：<https://spec.matrix.org/latest/client-server-api/#receipts>
