# QA 场景扩展 - 第二轮

在当前种子套件之后新增的十个基于仓库的候选场景。

## 1. 频道上下文中的按需记忆工具

- 目标：验证当频道消息中询问先前笔记时，智能体使用 `memory_search` 加 `memory_get`，而不是凭空捏造。
- 流程：
  - 在 `MEMORY.md` 或 `memory/*.md` 中预置一个当前对话记录中不存在的事实。
  - 在频道线程中询问该事实。
  - 验证工具使用情况及最终答案的准确性。
- 通过标准：
  - `memory_search` 先运行。
  - `memory_get` 缩小到正确的行。
  - 最终答案正确引用了记住的事实，且无跨会话泄漏。
- 文档：`docs/concepts/memory.md`、`docs/concepts/memory-search.md`
- 代码：`extensions/memory-core/src/tools.ts`、`extensions/memory-core/src/prompt-section.ts`

## 2. 记忆故障回退

- 目标：验证当嵌入/搜索不可用时，记忆故障能够优雅降级。
- 流程：
  - 禁用或破坏基于嵌入的记忆路径。
  - 请求召回先前笔记。
  - 验证智能体表达不确定性并给出下一步行动，而不是产生幻觉。
- 通过标准：
  - 工具故障不会导致运行崩溃。
  - 智能体表示已检查但无法确认。
  - 报告包含修复建议提示。
- 文档：`docs/concepts/memory.md`、`docs/help/faq.md`
- 代码：`extensions/memory-core/src/tools.shared.ts`、`extensions/memory-core/src/tools.citations.test.ts`

## 3. 带工具连续性的模型切换

- 目标：验证模型切换时不仅保留纯文本连续性，还保留会话上下文和工具可用性。
- 流程：
  - 从某个模型开始。
  - 切换到另一个已配置的模型。
  - 请求需要使用工具的后续操作，例如文件读取或记忆查找。
- 通过标准：
  - 切换在运行时状态中得到体现。
  - 切换后工具调用仍然成功。
  - 最终答案保留了先前的上下文。
- 文档：`docs/help/testing.md`、`docs/concepts/model-failover.md`
- 代码：`extensions/qa-lab/src/suite.ts`、`docs/web/webchat.md`

## 4. 通过 QMD/mcporter 的 MCP 召回

- 目标：验证 MCP 支持的工具路径端到端正常工作，而不仅仅是核心工具。
- 流程：
  - 启用 `memory.qmd.mcporter`。
  - 请求应通过 QMD MCP 桥路由的召回。
  - 验证响应及捕获的 MCP 执行路径。
- 通过标准：
  - 使用了 MCP 支持的搜索路径。
  - 返回的片段与正确的笔记匹配。
  - 若守护进程/工具缺失，失败模式是明确的。
- 文档：`docs/gateway/secrets.md`、`docs/concepts/memory-qmd.md`
- 代码：`extensions/memory-core/src/memory/qmd-manager.ts`、`extensions/memory-core/src/memory/qmd-manager.test.ts`

## 5. 技能可见性与调用

- 目标：验证智能体能看到工作区/项目技能并实际使用它。
- 流程：
  - 添加一个简单的工作区或 `.agents` 技能。
  - 通过运行时清单确认技能可见性。
  - 请求一个应触发该技能的任务。
- 通过标准：
  - 技能出现在 `skills.status` 中。
  - 智能体调用结果反映了已安装的技能指令。
  - 遵守每个智能体的允许列表行为。
- 文档：`docs/tools/skills.md`、`docs/gateway/protocol.md`、`docs/gateway/configuration.md`
- 代码：`.agents/skills/openclaw-qa-testing/SKILL.md`、`docs/gateway/protocol.md`

## 6. 技能安装与热可用性

- 目标：验证新安装的技能在没有中间损坏状态的情况下可立即使用。
- 流程：
  - 安装一个 ClawHub 或 gateway 管理的技能。
  - 重新检查技能清单。
  - 请求智能体执行该技能支持的任务。
- 通过标准：
  - 安装成功。
  - `skills.status` 或 `skills.bins` 反映了新技能。
  - 智能体可以立即使用该技能，或在预期的重载路径之后使用。
- 文档：`docs/tools/skills.md`、`docs/cli/skills.md`、`docs/gateway/protocol.md`
- 代码：`docs/gateway/protocol.md`、`docs/tools/skills.md`

## 7. 原生图像生成

- 目标：验证 `image_generate` 仅在已配置时出现，并返回真实的附件/工件。
- 流程：
  - 配置 `agents.defaults.imageGenerationModel.primary`。
  - 请求生成一张简单的图像。
  - 验证生成的媒体是否在回复路径中返回。
- 通过标准：
  - `image_generate` 在有效工具集中。
  - 使用已配置的提供商/模型成功完成生成。
  - 输出已附加，且智能体对创建内容进行了总结。
- 文档：`docs/tools/image-generation.md`、`docs/providers/openai.md`
- 代码：`src/agents/openclaw-tools.image-generation.test.ts`、`src/image-generation/runtime.ts`

## 8. 配置补丁禁用技能

- 目标：验证 `config.patch` 能够禁用工作区技能，并且重启后的 gateway 能清晰地暴露禁用状态。
- 流程：
  - 添加一个工作区技能并验证其符合条件。
  - 使用 `config.patch` 禁用该技能。
  - 等待 gateway 重启，再次读取 `skills.status`。
- 通过标准：
  - 补丁成功。
  - Gateway 干净地重启。
  - 技能从符合条件变为禁用状态。
- 文档：`docs/gateway/configuration.md`、`docs/gateway/protocol.md`
- 代码：`docs/gateway/configuration.md`、`docs/web/control-ui.md`

## 9. 需要重启的配置应用与唤醒

- 目标：验证需要重启的配置更改能干净地重启并唤醒会话。
- 流程：
  - 对需要重启的表面使用 `config.apply` 或 `update.run`。
  - 提供 `sessionKey`，以便操作者在重启后收到 ping。
  - 重启后继续任务。
- 通过标准：
  - 重启只发生一次。
  - 会话唤醒 ping 送达。
  - 智能体在重启后在同一逻辑工作流中继续。
- 文档：`docs/gateway/configuration.md`、`docs/web/control-ui.md`
- 代码：`docs/gateway/configuration.md`、`docs/gateway/protocol.md`

## 10. 运行时清单漂移检查

- 目标：验证报告的工具和技能清单在配置/插件更改后与智能体实际可用的内容一致。
- 流程：
  - 读取 `tools.effective` 和 `skills.status`。
  - 请求智能体使用一个已启用的项目和一个已禁用的项目。
  - 将实际行为与报告的清单进行比较。
- 通过标准：
  - 已启用的项目可调用。
  - 已禁用的项目不存在或因正确原因被阻止。
  - 清单与运行时行为保持同步。
- 文档：`docs/gateway/protocol.md`、`docs/web/webchat.md`
- 代码：`docs/gateway/protocol.md`、`docs/web/control-ui.md`

## 优先加入可执行套件的候选

如果只立即推进三个：

1. 频道上下文中的按需记忆工具
2. 原生图像生成
3. 配置补丁禁用技能
