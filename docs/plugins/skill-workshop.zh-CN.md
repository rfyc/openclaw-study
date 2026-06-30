---
summary: "将可复用过程实验性地捕获为工作区技能，支持审查、批准、隔离和热技能刷新"
title: "Skill workshop 插件"
read_when:
  - 你希望 agent 将修正或可复用过程转化为工作区技能
  - 你正在配置过程性技能记忆
  - 你正在调试 skill_workshop 工具行为
  - 你正在决定是否启用自动技能创建
---

Skill Workshop 是**实验性**的。它默认禁用，其捕获启发式和审查者提示可能在不同版本之间更改，自动写入应仅在受信任的工作区中使用，并且在此之前应先审查待处理模式的输出。

Skill Workshop 是工作区技能的过程性记忆。它让 agent 将可复用的工作流、用户修正、来之不易的修复和反复出现的问题转化为以下位置的 `SKILL.md` 文件：

```text
<workspace>/skills/<skill-name>/SKILL.md
```

这与长期记忆不同：

- **记忆**存储事实、偏好、实体和过去的上下文。
- **技能**存储 agent 在未来任务中应遵循的可复用过程。
- **Skill Workshop** 是从有用的轮次到持久工作区技能的桥梁，具有安全检查和可选的批准机制。

Skill Workshop 在 agent 学习以下过程时非常有用：

- 如何验证外部来源的动画 GIF 资产
- 如何替换截图资产并验证尺寸
- 如何运行特定于仓库的 QA 场景
- 如何调试反复出现的提供商故障
- 如何修复过期的本地工作流笔记

不适用于：

- "用户喜欢蓝色"之类的事实
- 广泛的自传式记忆
- 原始转录存档
- 密钥、凭据或隐藏的提示文本
- 不会重复的一次性指令

## 默认状态

捆绑插件是**实验性**的，除非在 `plugins.entries.skill-workshop` 中明确启用，否则**默认禁用**。

插件清单不设置 `enabledByDefault: true`。插件配置 schema 内部的 `enabled: true` 默认值仅在插件入口已被选择和加载后才适用。

实验性意味着：

- 插件的支持足以进行选择性测试和自我测试
- 提案存储、审查者阈值和捕获启发式可以演化
- 待处理批准是推荐的起始模式
- 自动应用适用于受信任的个人/工作区设置，不适用于共享或输入密集型环境

## 启用

最小安全配置：

```json5
{
  plugins: {
    entries: {
      "skill-workshop": {
        enabled: true,
        config: {
          autoCapture: true,
          approvalPolicy: "pending",
          reviewMode: "hybrid",
        },
      },
    },
  },
}
```

使用此配置：

- `skill_workshop` 工具可用
- 明确的可复用修正作为待处理提案排队
- 基于阈值的审查者通过可以提议技能更新
- 在待处理提案被应用之前，不会写入任何技能文件

仅在受信任的工作区中使用自动写入：

```json5
{
  plugins: {
    entries: {
      "skill-workshop": {
        enabled: true,
        config: {
          autoCapture: true,
          approvalPolicy: "auto",
          reviewMode: "hybrid",
        },
      },
    },
  },
}
```

`approvalPolicy: "auto"` 仍然使用相同的扫描器和隔离路径。它不会应用具有严重发现的提案。

## 配置

| 键                   | 默认值      | 范围 / 值                                   | 含义                                             |
| -------------------- | ----------- | ------------------------------------------- | ------------------------------------------------ |
| `enabled`            | `true`      | boolean                                     | 插件入口加载后启用插件。                         |
| `autoCapture`        | `true`      | boolean                                     | 在成功的 agent 轮次后启用后续轮次捕获/审查。     |
| `approvalPolicy`     | `"pending"` | `"pending"`, `"auto"`                       | 将提案排队或自动写入安全提案。                   |
| `reviewMode`         | `"hybrid"`  | `"off"`, `"heuristic"`, `"llm"`, `"hybrid"` | 选择明确的修正捕获、LLM 审查者、两者，或都不选。 |
| `reviewInterval`     | `15`        | `1..200`                                    | 每经过这么多成功轮次后运行审查者。               |
| `reviewMinToolCalls` | `8`         | `1..500`                                    | 每观察到这么多工具调用后运行审查者。             |
| `reviewTimeoutMs`    | `45000`     | `5000..180000`                              | 嵌入式审查者运行的超时时间。                     |
| `maxPending`         | `50`        | `1..200`                                    | 每个工作区保留的最大待处理/隔离提案数。          |
| `maxSkillBytes`      | `40000`     | `1024..200000`                              | 生成的技能/支持文件的最大大小。                  |

推荐配置文件：

```json5
// Conservative: explicit tool use only, no automatic capture.
{
  autoCapture: false,
  approvalPolicy: "pending",
  reviewMode: "off",
}
```

```json5
// Review-first: capture automatically, but require approval.
{
  autoCapture: true,
  approvalPolicy: "pending",
  reviewMode: "hybrid",
}
```

```json5
// Trusted automation: write safe proposals immediately.
{
  autoCapture: true,
  approvalPolicy: "auto",
  reviewMode: "hybrid",
}
```

```json5
// Low-cost: no reviewer LLM call, only explicit correction phrases.
{
  autoCapture: true,
  approvalPolicy: "pending",
  reviewMode: "heuristic",
}
```

## 捕获路径

Skill Workshop 有三种捕获路径。

### 工具建议

当模型看到可复用过程或用户要求其保存/更新技能时，它可以直接调用 `skill_workshop`。

这是最明确的路径，即使在 `autoCapture: false` 的情况下也有效。

### 启发式捕获

当 `autoCapture` 启用且 `reviewMode` 为 `heuristic` 或 `hybrid` 时，插件扫描成功的轮次以查找明确的用户修正短语：

- `next time`
- `from now on`
- `remember to`
- `make sure to`
- `always ... use/check/verify/record/save/prefer`
- `prefer ... when/for/instead/use`
- `when asked`

启发式方法从最新匹配的用户指令创建提案。它使用主题提示为常见工作流选择技能名称：

- 动画 GIF 任务 -> `animated-gif-workflow`
- 截图或资产任务 -> `screenshot-asset-workflow`
- QA 或场景任务 -> `qa-scenario-workflow`
- GitHub PR 任务 -> `github-pr-workflow`
- 回退 -> `learned-workflows`

启发式捕获有意地保持狭窄。它适用于明确的修正和可重复的过程说明，不适用于一般的转录摘要。

### LLM 审查者

当 `autoCapture` 启用且 `reviewMode` 为 `llm` 或 `hybrid` 时，插件在达到阈值后运行紧凑的嵌入式审查者。

审查者接收：

- 最近的转录文本，上限为最后 12,000 个字符
- 最多 12 个现有工作区技能
- 每个现有技能最多 2,000 个字符
- 仅 JSON 指令

审查者没有工具：

- `disableTools: true`
- `toolsAllow: []`
- `disableMessageTool: true`

审查者返回 `{ "action": "none" }` 或一个提案。`action` 字段为 `create`、`append` 或 `replace` — 当相关技能已存在时优先使用 `append`/`replace`；仅当没有现有技能适合时才使用 `create`。

`create` 示例：

```json
{
  "action": "create",
  "skillName": "media-asset-qa",
  "title": "Media Asset QA",
  "reason": "Reusable animated media acceptance workflow",
  "description": "Validate externally sourced animated media before product use.",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution.\n- Store a local approved copy.\n- Verify in product UI before final reply."
}
```

`append` 添加 `section` + `body`。`replace` 将命名技能中的 `oldText` 替换为 `newText`。

## 提案生命周期

每个生成的更新都成为具有以下属性的提案：

- `id`
- `createdAt`
- `updatedAt`
- `workspaceDir`
- 可选的 `agentId`
- 可选的 `sessionId`
- `skillName`
- `title`
- `reason`
- `source`：`tool`、`agent_end` 或 `reviewer`
- `status`
- `change`
- 可选的 `scanFindings`
- 可选的 `quarantineReason`

提案状态：

- `pending` - 等待批准
- `applied` - 已写入 `<workspace>/skills`
- `rejected` - 被运营商/模型拒绝
- `quarantined` - 被严重扫描器发现阻止

状态按工作区存储在 Gateway 状态目录下：

```text
<stateDir>/skill-workshop/<workspace-hash>.json
```

待处理和隔离的提案按技能名称和变更有效载荷去重。存储最多保留 `maxPending` 个最新的待处理/隔离提案。

## 工具参考

插件注册一个 agent 工具：

```text
skill_workshop
```

### `status`

统计活跃工作区的提案状态。

```json
{ "action": "status" }
```

结果形状：

```json
{
  "workspaceDir": "/path/to/workspace",
  "pending": 1,
  "quarantined": 0,
  "applied": 3,
  "rejected": 0
}
```

### `list_pending`

列出待处理提案。

```json
{ "action": "list_pending" }
```

要列出其他状态：

```json
{ "action": "list_pending", "status": "applied" }
```

有效的 `status` 值：

- `pending`
- `applied`
- `rejected`
- `quarantined`

### `list_quarantine`

列出隔离的提案。

```json
{ "action": "list_quarantine" }
```

当自动捕获似乎什么都不做且日志提到 `skill-workshop: quarantined <skill>` 时使用此操作。

### `inspect`

通过 id 获取提案。

```json
{
  "action": "inspect",
  "id": "proposal-id"
}
```

### `suggest`

创建提案。使用 `approvalPolicy: "pending"`（默认值）时，这会排队而不是写入。

```json
{
  "action": "suggest",
  "skillName": "animated-gif-workflow",
  "title": "Animated GIF Workflow",
  "reason": "User established reusable GIF validation rules.",
  "description": "Validate animated GIF assets before using them.",
  "body": "## Workflow\n\n- Verify the URL resolves to image/gif.\n- Confirm it has multiple frames.\n- Record attribution and license.\n- Avoid hotlinking when a local asset is needed."
}
```

<AccordionGroup>
  <Accordion title="强制安全写入 (apply: true)">

```json
{
  "action": "suggest",
  "apply": true,
  "skillName": "animated-gif-workflow",
  "description": "Validate animated GIF assets before using them.",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution."
}
```

  </Accordion>

  <Accordion title="在自动策略下强制待处理 (apply: false)">

```json
{
  "action": "suggest",
  "apply": false,
  "skillName": "screenshot-asset-workflow",
  "description": "Screenshot replacement workflow.",
  "body": "## Workflow\n\n- Verify dimensions.\n- Optimize the PNG.\n- Run the relevant gate."
}
```

  </Accordion>

  <Accordion title="追加到命名部分">

```json
{
  "action": "suggest",
  "skillName": "qa-scenario-workflow",
  "section": "Workflow",
  "description": "QA scenario workflow.",
  "body": "- For media QA, verify generated assets render and pass final assertions."
}
```

  </Accordion>

  <Accordion title="替换精确文本">

```json
{
  "action": "suggest",
  "skillName": "github-pr-workflow",
  "oldText": "- Check the PR.",
  "newText": "- Check unresolved review threads, CI status, linked issues, and changed files before deciding."
}
```

  </Accordion>
</AccordionGroup>

### `apply`

应用待处理提案。

```json
{
  "action": "apply",
  "id": "proposal-id"
}
```

`apply` 拒绝隔离的提案：

```text
quarantined proposal cannot be applied
```

### `reject`

将提案标记为已拒绝。

```json
{
  "action": "reject",
  "id": "proposal-id"
}
```

### `write_support_file`

在现有或提议的技能目录内写入支持文件。

允许的顶级支持目录：

- `references/`
- `templates/`
- `scripts/`
- `assets/`

示例：

```json
{
  "action": "write_support_file",
  "skillName": "release-workflow",
  "relativePath": "references/checklist.md",
  "body": "# Release Checklist\n\n- Run release docs.\n- Verify changelog.\n"
}
```

支持文件是工作区范围的、经过路径检查的、由 `maxSkillBytes` 限制字节数的、经过扫描的，并以原子方式写入。

## 技能写入

Skill Workshop 仅在以下位置写入：

```text
<workspace>/skills/<normalized-skill-name>/
```

技能名称经过规范化：

- 小写化
- 非 `[a-z0-9_-]` 的序列变为 `-`
- 前导/尾随非字母数字字符被删除
- 最大长度为 80 个字符
- 最终名称必须匹配 `[a-z0-9][a-z0-9_-]{1,79}`

对于 `create`：

- 如果技能不存在，Skill Workshop 写入新的 `SKILL.md`
- 如果已存在，Skill Workshop 将正文追加到 `## Workflow`

对于 `append`：

- 如果技能存在，Skill Workshop 追加到请求的部分
- 如果不存在，Skill Workshop 先创建最小技能然后追加

对于 `replace`：

- 技能必须已存在
- `oldText` 必须精确存在
- 只替换第一个精确匹配

所有写入都是原子的，并立即刷新内存中的技能快照，因此新的或更新的技能可以在不重启 Gateway 的情况下变为可见。

## 安全模型

Skill Workshop 对生成的 `SKILL.md` 内容和支持文件有一个安全扫描器。

严重发现会隔离提案：

| 规则 id                                | 阻止的内容...                                   |
| -------------------------------------- | ----------------------------------------------- |
| `prompt-injection-ignore-instructions` | 告诉 agent 忽略先前/更高指令                    |
| `prompt-injection-system`              | 引用系统提示、开发者消息或隐藏指令              |
| `prompt-injection-tool`                | 鼓励绕过工具权限/批准                           |
| `shell-pipe-to-shell`                  | 包含 `curl`/`wget` 管道到 `sh`、`bash` 或 `zsh` |
| `secret-exfiltration`                  | 似乎通过网络发送环境/进程环境数据               |

警告发现会被保留但本身不会阻止：

| 规则 id              | 警告内容...                |
| -------------------- | -------------------------- |
| `destructive-delete` | 广泛的 `rm -rf` 风格命令   |
| `unsafe-permissions` | `chmod 777` 风格的权限使用 |

隔离的提案：

- 保留 `scanFindings`
- 保留 `quarantineReason`
- 出现在 `list_quarantine` 中
- 无法通过 `apply` 应用

要从隔离的提案中恢复，请创建删除了不安全内容的新安全提案。不要手动编辑存储 JSON。

## 提示指导

启用后，Skill Workshop 注入一个简短的提示部分，告诉 agent 使用 `skill_workshop` 进行持久的过程性记忆。

指导强调：

- 过程，而非事实/偏好
- 用户修正
- 不明显的成功过程
- 反复出现的问题
- 通过追加/替换修复过期/薄弱/错误的技能
- 在长时间工具循环或困难修复后保存可复用过程
- 简短的命令式技能文本
- 无转录转储

写入模式文本随 `approvalPolicy` 变化：

- 待处理模式：排队建议；仅在明确批准后才应用
- 自动模式：当明显可复用时应用安全的工作区技能更新

## 成本和运行时行为

启发式捕获不调用模型。

LLM 审查在活跃/默认 agent 模型上使用嵌入式运行。它基于阈值，因此默认不会在每次轮次上运行。

审查者：

- 在可用时使用相同的已配置提供商/模型上下文
- 回退到运行时 agent 默认值
- 有 `reviewTimeoutMs`
- 使用轻量级引导上下文
- 没有工具
- 不直接写入任何内容
- 只能发出通过正常扫描器和批准/隔离路径的提案

如果审查者失败、超时或返回无效 JSON，插件会记录警告/调试消息并跳过该审查通过。

## 操作模式

在以下情况下使用 Skill Workshop：

- "next time, do X"
- "from now on, prefer Y"
- "make sure to verify Z"
- "save this as a workflow"
- "this took a while; remember the process"
- "update the local skill for this"

好的技能文本：

```markdown
## Workflow

- Verify the GIF URL resolves to `image/gif`.
- Confirm the file has multiple frames.
- Record source URL, license, and attribution.
- Store a local copy when the asset will ship with the product.
- Verify the local asset renders in the target UI before final reply.
```

差的技能文本：

```markdown
The user asked about a GIF and I searched two websites. Then one was blocked by
Cloudflare. The final answer said to check attribution.
```

差版本不应保存的原因：

- 转录形式
- 不是命令式
- 包含嘈杂的一次性细节
- 不告诉下一个 agent 该做什么

## 调试

检查插件是否已加载：

```bash
openclaw plugins list --enabled
```

从 agent/工具上下文检查提案计数：

```json
{ "action": "status" }
```

检查待处理提案：

```json
{ "action": "list_pending" }
```

检查隔离的提案：

```json
{ "action": "list_quarantine" }
```

常见症状：

| 症状                       | 可能原因                                               | 检查方法                                                            |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| 工具不可用                 | 插件入口未启用                                         | `plugins.entries.skill-workshop.enabled` 和 `openclaw plugins list` |
| 没有自动提案出现           | `autoCapture: false`、`reviewMode: "off"` 或未达到阈值 | 配置、提案状态、Gateway 日志                                        |
| 启发式未捕获               | 用户措辞与修正模式不匹配                               | 使用明确的 `skill_workshop.suggest` 或启用 LLM 审查者               |
| 审查者未创建提案           | 审查者返回 `none`、无效 JSON 或超时                    | Gateway 日志、`reviewTimeoutMs`、阈值                               |
| 提案未被应用               | `approvalPolicy: "pending"`                            | `list_pending`，然后 `apply`                                        |
| 提案从待处理中消失         | 重复提案被重用、最大待处理修剪，或已被应用/拒绝/隔离   | `status`、带状态过滤器的 `list_pending`、`list_quarantine`          |
| 技能文件存在但模型未检测到 | 技能快照未刷新或技能门控将其排除                       | `openclaw skills` 状态和工作区技能资格                              |

相关日志：

- `skill-workshop: queued <skill>`
- `skill-workshop: applied <skill>`
- `skill-workshop: quarantined <skill>`
- `skill-workshop: heuristic capture skipped: ...`
- `skill-workshop: reviewer skipped: ...`
- `skill-workshop: reviewer found no update`

## QA 场景

仓库支持的 QA 场景：

- `qa/scenarios/plugins/skill-workshop-animated-gif-autocreate.md`
- `qa/scenarios/plugins/skill-workshop-pending-approval.md`
- `qa/scenarios/plugins/skill-workshop-reviewer-autonomous.md`

运行确定性覆盖：

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-animated-gif-autocreate \
  --scenario skill-workshop-pending-approval \
  --concurrency 1
```

运行审查者覆盖：

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-reviewer-autonomous \
  --concurrency 1
```

审查者场景故意分开，因为它启用 `reviewMode: "llm"` 并执行嵌入式审查者通过。

## 何时不启用自动应用

在以下情况下避免使用 `approvalPolicy: "auto"`：

- 工作区包含敏感过程
- agent 正在处理不受信任的输入
- 技能在广泛的团队中共享
- 你仍在调整提示或扫描器规则
- 模型经常处理恶意 Web/电子邮件内容

先使用待处理模式。仅在审查 agent 在该工作区中提出的技能类型之后才切换到自动模式。

## 相关文档

- [技能](/tools/skills)
- [插件](/tools/plugin)
- [测试](/reference/test)
