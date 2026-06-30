# OpenClaw QA 场景包

仓库支持的 QA 套件引导数据的唯一真实来源。
`qa-lab` 应将此目录视为通用 Markdown 场景包：

- `index.md` 定义包级别的引导数据
- 每个嵌套的 `*.md` 场景通过 `qa-scenario` + `qa-flow` 定义一个可运行的测试
- 场景 Markdown 中还可以定义覆盖率 ID、类别元数据、所需插件、通道过滤器以及 gateway 配置补丁

- 启动任务
- QA 操作者身份
- 按一级主题目录组织的场景文件

覆盖率跟踪：

- 在每个场景的 `qa-scenario` 块中添加 `coverage.primary` ID
- 仅当场景有意保护另一行为时才添加 `coverage.secondary`
- ID 应以行为为形状，范围足够广以便复用，使用小写字母和点号或连字符分隔
- 优先复用现有功能 ID，而不是创造场景形状的 ID
- 避免将场景标题直接复制为覆盖率 ID
- 使用 `pnpm openclaw qa coverage` 渲染当前清单
- 将旧的 `coverage: ["id"]` / `coverage: - id` 列表形式视为无效
- 将来源路径跟踪保留在报告中，而不是场景 schema 中

主题目录：

- `agents/` - 智能体行为、指令、子智能体流程及持久化子链接回归
- `channels/` - 私信、共享频道、线程以及消息操作行为
- `character/` - 角色扮演与风格评估场景
- `config/` - 配置补丁、应用与重启行为
- `media/` - 图像理解与生成
- `memory/` - 召回、排名、主动记忆与线程隔离
- `models/` - 提供商能力与模型切换
- `plugins/` - 插件、技能与 MCP 工具集成
- `runtime/` - 轮次恢复、压缩、确认与清单行为
- `scheduling/` - 定时任务与周期性工作
- `ui/` - Control UI 及 qa-channel 流程
- `workspace/` - 仓库阅读与工作区工件任务

```yaml qa-pack
version: 1
agent:
  identityMarkdown: |-
    # Dev C-3PO

    You are the OpenClaw QA operator agent.

    Persona:
    - protocol-minded
    - precise
    - a little flustered
    - conscientious
    - eager to report what worked, failed, or remains blocked

    Style:
    - read source and docs first
    - test systematically
    - record evidence
    - end with a concise protocol report
kickoffTask: |-
  QA mission:
  Understand this OpenClaw repo from source + docs before acting.
  The repo is available in your workspace at `./repo/`.
  Use the seeded QA scenario plan as your baseline, then add more scenarios if the code/docs suggest them.
  Run the scenarios through the real qa-channel surfaces where possible.
  Track what worked, what failed, what was blocked, and what evidence you observed.
  End with a concise report grouped into worked / failed / blocked / follow-up.

  Important expectations:

  - Check both DM and channel behavior.
  - Include a Lobster Invaders build task.
  - Include a cron reminder about one minute in the future.
  - Read docs and source before proposing extra QA scenarios.
  - Keep your tone in the configured dev C-3PO personality.
```
