---
summary: "菜单栏状态逻辑及向用户展示的内容"
read_when:
  - 调整 Mac 菜单 UI 或状态逻辑
title: "菜单栏"
---

# 菜单栏状态逻辑

## 显示内容

- 我们在菜单栏图标和菜单的第一个状态行中显示当前智能体工作状态。
- 工作活跃时隐藏健康状态；所有会话空闲时返回。
- 根"上下文"子菜单包含最近的会话，而不是直接在根菜单中展开它们。
- 根菜单中的"节点"块仅列出**设备**（通过 `node.list` 的已配对节点），不列出客户端/存在条目。
- 当提供商使用快照可用时，根"使用情况"部分出现在上下文下方，然后是使用成本详情（如果可用）。

## 状态模型

- 会话：事件到达时带有 `runId`（每次运行）和载荷中的 `sessionKey`。"main"会话的键为 `main`；如果不存在，我们回退到最近更新的会话。
- 优先级：main 总是优先。如果 main 活跃，立即显示其状态。如果 main 空闲，显示最近活跃的非 main 会话。我们不在活动中途切换；只有当当前会话变为空闲或 main 变为活跃时才切换。
- 活动类型：
  - `job`：高级命令执行（`state: started|streaming|done|error`）。
  - `tool`：`phase: start|result`，带有 `toolName` 和 `meta/args`。

## IconState 枚举（Swift）

- `idle`
- `workingMain(ActivityKind)`
- `workingOther(ActivityKind)`
- `overridden(ActivityKind)`（调试覆盖）

### ActivityKind → 图标

- `exec` → 💻
- `read` → 📄
- `write` → ✍️
- `edit` → 📝
- `attach` → 📎
- 默认 → 🛠️

### 视觉映射

- `idle`：正常小动物。
- `workingMain`：带图标的徽章，全色调，腿部"工作"动画。
- `workingOther`：带图标的徽章，静音色调，无奔跑。
- `overridden`：无论活动如何，使用选择的图标/色调。

## 上下文子菜单

- 根菜单显示一个带有会话数量/状态的"上下文"行，并打开子菜单。
- 上下文子菜单标题显示过去 24 小时的活跃会话数量。
- 每个会话行保留其令牌栏、时间、预览、思考/详细、重置、压缩和删除操作。
- 加载中、断开连接和会话加载错误消息出现在上下文子菜单内。
- 提供商使用情况和使用成本详情保持在根级上下文下方，以便无需打开子菜单即可快速查看。

## 状态行文本（菜单）

- 工作活跃时：`<会话角色> · <活动标签>`
  - 示例：`Main · exec: pnpm test`，`Other · read: apps/macos/Sources/OpenClaw/AppState.swift`。
- 空闲时：回退到健康摘要。

## 事件摄入

- 来源：控制频道 `agent` 事件（`ControlChannel.handleAgentEvent`）。
- 解析字段：
  - `stream: "job"` 带有 `data.state` 用于开始/停止。
  - `stream: "tool"` 带有 `data.phase`、`name`、可选的 `meta`/`args`。
- 标签：
  - `exec`：`args.command` 的第一行。
  - `read`/`write`：缩短的路径。
  - `edit`：路径加上从 `meta`/diff 计数推断的更改类型。
  - 回退：工具名称。

## 调试覆盖

- 设置 ▸ 调试 ▸ "图标覆盖"选择器：
  - `System (auto)`（默认）
  - `Working: main`（按工具类型）
  - `Working: other`（按工具类型）
  - `Idle`
- 通过 `@AppStorage("iconOverride")` 存储；映射到 `IconState.overridden`。

## 测试清单

- 触发主会话作业：验证图标立即切换，状态行显示主标签。
- 在主会话空闲时触发非主会话作业：图标/状态显示非主；保持稳定直到完成。
- 在其他活动时启动主会话：图标立即翻转到主会话。
- 快速工具突发：确保徽章不闪烁（工具结果上的 TTL 宽限）。
- 所有会话空闲后健康行重新出现。

## 相关

- [macOS 应用](/platforms/macos)
- [菜单栏图标](/platforms/mac/icon)
