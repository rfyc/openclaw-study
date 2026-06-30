---
name: browser-automation
description: 在使用 OpenClaw 浏览器工具控制网页时使用，特别是多步骤流程、登录检查、标签页管理或从过期引用/超时中恢复。
user-invocable: false
---

# 浏览器自动化

当你需要 `browser` 工具进行超出单页检查的任何操作时，使用此技能。

## 操作循环

1. 在操作之前检查浏览器状态：
   - 当浏览器/插件设置本身可能损坏时，使用 `openclaw browser doctor` 或 `action="status"`。
   - `action="status"` 用于检查可用性。
   - `action="profiles"` 当登录状态或配置文件选择很重要时。
   - `action="tabs"` 在打开新标签页之前，如果重试/超时可能留下了多余窗口。
2. 优先使用稳定的标签页句柄：
   - 用 `label` 打开重要标签页，例如 `label="meet"`。
   - 在后续调用中使用 `t1` 等 `tabId` 句柄或 `meet` 等标签作为 `targetId`。
   - 避免依赖原始 DevTools `targetId`，除非工具刚刚返回它。
3. 点击之前先读取：
   - 在预期的 `targetId` 上使用 `action="snapshot"`。
   - 对后续操作使用相同的 `targetId`，以便引用保持在同一标签页上。
   - 对于持久的 Playwright 引用，在支持时请求 `refs="aria"`。如果从 `snapshotFormat="aria"` 收到 `axN` 引用，请仅在同一快照调用之后使用它们；过期或未绑定的 `axN` 引用会快速失败，需要重新快照。
   - 当链接文本不明确或直接导航目标可以避免脆性点击时，使用 `urls=true`。
   - 在快照或截图中使用 `labels=true`，当视觉位置很重要时。
4. 精确操作：
   - 优先使用带有最新快照引用的 `action="act"`。
   - 导航、模态变化或表单提交后，在下一个操作之前再次快照。
   - 避免盲目等待。尽可能等待可见的 UI 状态。
5. 报告真实的阻塞：
   - 如果页面需要登录、权限、验证码、双重验证、摄像头/麦克风批准或其他手动步骤，停下来并明确告诉用户需要什么。
   - 不要仅因为当前页面显示权限或引导对话框就声称浏览器未登录。先检查可见的 UI。

## 标签页卫生

在为命名任务创建标签页之前，列出标签页并在仍可用时重用具有匹配标签或 URL 的现有标签页。

示例：

```json
{ "action": "tabs" }
```

如果没有合适的标签页：

```json
{ "action": "open", "url": "https://example.com", "label": "task" }
```

然后通过标签定位它：

```json
{ "action": "snapshot", "targetId": "task", "refs": "aria" }
```

如果重试创建了重复标签页，通过 `tabId` 关闭多余的：

```json
{ "action": "close", "targetId": "t3" }
```

不要将裸数字如 `"2"` 作为 `targetId` 传递。数字标签页位置仅用于 CLI `openclaw browser tab select 2` 辅助命令；浏览器工具调用需要 `suggestedTargetId`、标签、`tabId` 或原始目标 id。

## 过期引用恢复

如果操作因引用缺失或过期而失败：

1. 再次对同一 `targetId` 进行快照。
2. 找到当前可见的控件。
3. 用新引用重试一次。
4. 如果 UI 移动到阻塞状态，报告阻塞而不是循环。

## 现有用户浏览器

仅当现有 cookies/登录状态重要时使用 `profile="user"`。这会附加到用户正在运行的基于 Chromium 的浏览器。

对于 `profile="user"` 和其他现有会话配置文件，在 `act:type`、`evaluate`、`hover`、`scrollIntoView`、`drag`、`select` 和 `fill` 上省略 `timeoutMs`；该驱动程序拒绝对这些操作进行每次调用的超时覆盖。

## Google Meet 说明

创建或加入 Meet 时：

- 将摄像头/麦克风权限屏幕视为进展，而不是登录失败。
- 如果被问及人们是否能听到你，当需要语音时点击麦克风选项。
- 如果 Google 要求登录、双重验证、账号选择确认或需要用户批准的权限，报告确切的手动操作。
- 每个会议流程使用一个带标签的标签页，例如 `label="meet"`，并在重试时复用它。
