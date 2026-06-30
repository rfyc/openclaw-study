---
summary: "将 Claude Code 和 Claude Desktop 的本地状态导入 OpenClaw，并预览导入内容"
read_when:
  - 您来自 Claude Code 或 Claude Desktop，希望保留指令、MCP 服务器和技能
  - 您需要了解 OpenClaw 自动导入的内容和仅存档的内容
title: "从 Claude 迁移"
---

OpenClaw 通过内置的 Claude 迁移提供程序导入本地 Claude 状态。该提供程序在更改状态之前预览每个项目，在计划和报告中编辑密钥，并在应用之前创建已验证的备份。

<Note>
入门导入需要全新的 OpenClaw 设置。如果您已有本地 OpenClaw 状态，请先重置配置、凭据、会话和工作区，或在查看计划后直接使用带 `--overwrite` 的 `openclaw migrate`。
</Note>

## 两种导入方式

<Tabs>
  <Tab title="入门向导">
    向导在检测到本地 Claude 状态时提供 Claude 迁移。

    ```bash
    openclaw onboard --flow import
    ```

    或指向特定来源：

    ```bash
    openclaw onboard --import-from claude --import-source ~/.claude
    ```

  </Tab>
  <Tab title="CLI">
    使用 `openclaw migrate` 进行脚本化或可重复运行。完整参考请参见 [`openclaw migrate`](/cli/migrate)。

    ```bash
    openclaw migrate claude --dry-run
    openclaw migrate apply claude --yes
    ```

    添加 `--from <path>` 以导入特定的 Claude Code 主目录或项目根目录。

  </Tab>
</Tabs>

## 导入的内容

<AccordionGroup>
  <Accordion title="指令和记忆">
    - 项目 `CLAUDE.md` 和 `.claude/CLAUDE.md` 内容被复制或追加到 OpenClaw 代理工作区的 `AGENTS.md`。
    - 用户 `~/.claude/CLAUDE.md` 内容被追加到工作区的 `USER.md`。

  </Accordion>
  <Accordion title="MCP 服务器">
    MCP 服务器定义从项目 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop `claude_desktop_config.json`（如果存在）导入。
  </Accordion>
  <Accordion title="技能和命令">
    - 具有 `SKILL.md` 文件的 Claude 技能被复制到 OpenClaw 工作区技能目录。
    - `.claude/commands/` 或 `~/.claude/commands/` 下的 Claude 命令 Markdown 文件被转换为带有 `disable-model-invocation: true` 的 OpenClaw 技能。

  </Accordion>
</AccordionGroup>

## 仅存档的内容

提供程序将这些内容复制到迁移报告以供手动审查，但**不会**将其加载到实时 OpenClaw 配置中：

- Claude 钩子
- Claude 权限和宽泛的工具允许列表
- Claude 环境默认值
- `CLAUDE.local.md`
- `.claude/rules/`
- `.claude/agents/` 或 `~/.claude/agents/` 下的 Claude 子代理
- Claude Code 缓存、计划和项目历史目录
- Claude Desktop 扩展和操作系统存储的凭据

OpenClaw 拒绝自动执行钩子、信任权限允许列表或解码不透明的 OAuth 和 Desktop 凭据状态。在查看存档后手动移动您需要的内容。

## 来源选择

不使用 `--from` 时，OpenClaw 检查 `~/.claude` 的默认 Claude Code 主目录、采样的 Claude Code `~/.claude.json` 状态文件以及 macOS 上的 Claude Desktop MCP 配置。

当 `--from` 指向项目根目录时，OpenClaw 仅导入该项目的 Claude 文件，如 `CLAUDE.md`、`.claude/settings.json`、`.claude/commands/`、`.claude/skills/` 和 `.mcp.json`。在项目根目录导入期间不读取您的全局 Claude 主目录。

## 推荐流程

<Steps>
  <Step title="预览计划">
    ```bash
    openclaw migrate claude --dry-run
    ```

    计划列出所有将要更改的内容，包括冲突、跳过的项目以及从嵌套 MCP `env` 或 `headers` 字段中编辑的敏感值。

  </Step>
  <Step title="备份后应用">
    ```bash
    openclaw migrate apply claude --yes
    ```

    OpenClaw 在应用之前创建并验证备份。

  </Step>
  <Step title="运行 doctor">
    ```bash
    openclaw doctor
    ```

    [Doctor](/gateway/doctor) 在导入后检查配置或状态问题。

  </Step>
  <Step title="重启并验证">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    确认网关运行正常，您导入的指令、MCP 服务器和技能已加载。

  </Step>
</Steps>

## 冲突处理

当计划报告冲突（目标处已存在文件或配置值）时，应用拒绝继续。

<Warning>
仅当打算替换现有目标时才使用 `--overwrite` 重新运行。提供程序仍可能在迁移报告目录中为覆盖的文件写入项目级备份。
</Warning>

对于全新的 OpenClaw 安装，冲突是不常见的。它们通常在您对已有用户编辑的设置重新运行导入时出现。

## 自动化的 JSON 输出

```bash
openclaw migrate claude --dry-run --json
openclaw migrate apply claude --json --yes
```

使用 `--json` 且不带 `--yes` 时，应用打印计划但不改变状态。这是 CI 和共享脚本最安全的模式。

## 故障排除

<AccordionGroup>
  <Accordion title="Claude 状态存储在 ~/.claude 之外">
    传递 `--from /actual/path`（CLI）或 `--import-source /actual/path`（入门）。
  </Accordion>
  <Accordion title="入门拒绝在现有设置上导入">
    入门导入需要全新设置。要么重置状态并重新入门，要么直接使用 `openclaw migrate apply claude`，它支持 `--overwrite` 和明确的备份控制。
  </Accordion>
  <Accordion title="来自 Claude Desktop 的 MCP 服务器未导入">
    Claude Desktop 从特定于平台的路径读取 `claude_desktop_config.json`。如果 OpenClaw 未自动检测到它，请将 `--from` 指向该文件的目录。
  </Accordion>
  <Accordion title="Claude 命令变成了禁用模型调用的技能">
    这是设计如此。Claude 命令是用户触发的，因此 OpenClaw 将其导入为带有 `disable-model-invocation: true` 的技能。如果您希望代理自动调用它们，请编辑每个技能的 frontmatter。
  </Accordion>
</AccordionGroup>

## 相关

- [`openclaw migrate`](/cli/migrate)：完整 CLI 参考、插件合同和 JSON 形状。
- [迁移指南](/install/migrating)：所有迁移路径。
- [从 Hermes 迁移](/install/migrating-hermes)：另一个跨系统导入路径。
- [入门](/cli/onboard)：向导流程和非交互式标志。
- [Doctor](/gateway/doctor)：迁移后健康检查。
- [代理工作区](/concepts/agent-workspace)：`AGENTS.md`、`USER.md` 和技能的存储位置。
