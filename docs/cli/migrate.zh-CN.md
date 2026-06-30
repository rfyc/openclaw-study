---
summary: "`openclaw migrate` 的 CLI 参考（从其他代理系统导入状态）"
read_when:
  - 你想从 Hermes 或其他代理系统迁移到 OpenClaw 时
  - 你正在添加插件拥有的迁移提供商时
title: "Migrate"
---

# `openclaw migrate`

通过插件拥有的迁移提供商从另一个代理系统导入状态。捆绑的提供商涵盖 Codex CLI 状态、[Claude](/install/migrating-claude) 和 [Hermes](/install/migrating-hermes)；第三方插件可以注册额外的提供商。

<Tip>
有关面向用户的演练，请参阅[从 Claude 迁移](/install/migrating-claude)和[从 Hermes 迁移](/install/migrating-hermes)。[迁移中心](/install/migrating)列出了所有路径。
</Tip>

## 命令

```bash
openclaw migrate list
openclaw migrate claude --dry-run
openclaw migrate codex --dry-run
openclaw migrate codex --skill gog-vault77-google-workspace
openclaw migrate hermes --dry-run
openclaw migrate hermes
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes
openclaw migrate apply claude --yes
openclaw migrate apply hermes --yes
openclaw migrate apply hermes --include-secrets --yes
openclaw onboard --flow import
openclaw onboard --import-from claude --import-source ~/.claude
openclaw onboard --import-from hermes --import-source ~/.hermes
```

<ParamField path="<provider>" type="string">
  已注册迁移提供商的名称，例如 `hermes`。运行 `openclaw migrate list` 查看已安装的提供商。
</ParamField>
<ParamField path="--dry-run" type="boolean">
  构建计划并退出，不更改状态。
</ParamField>
<ParamField path="--from <path>" type="string">
  覆盖源状态目录。Hermes 默认为 `~/.hermes`。
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  导入支持的凭据。默认关闭。
</ParamField>
<ParamField path="--overwrite" type="boolean">
  当计划报告冲突时，允许应用替换现有目标。
</ParamField>
<ParamField path="--yes" type="boolean">
  跳过确认提示。在非交互模式下必填。
</ParamField>
<ParamField path="--skill <name>" type="string">
  按技能名称或条目 ID 选择一个技能复制项。重复该标志以迁移多个技能。省略时，交互式 Codex 迁移显示复选框选择器，非交互式迁移保留所有计划的技能。
</ParamField>
<ParamField path="--no-backup" type="boolean">
  跳过应用前备份。当本地 OpenClaw 状态存在时需要 `--force`。
</ParamField>
<ParamField path="--force" type="boolean">
  当应用否则会拒绝跳过备份时，需要与 `--no-backup` 一起使用。
</ParamField>
<ParamField path="--json" type="boolean">
  将计划或应用结果打印为 JSON。使用 `--json` 且没有 `--yes` 时，apply 打印计划且不改变状态。
</ParamField>

## 安全模型

`openclaw migrate` 优先预览。

<AccordionGroup>
  <Accordion title="应用前预览">
    提供商在任何内容改变之前返回一个逐项计划，包括冲突、跳过的项目和敏感项目。JSON 计划、应用输出和迁移报告会编辑嵌套的密钥类键，如 API 密钥、令牌、授权头、cookie 和密码。

    `openclaw migrate apply <provider>` 预览计划并在更改状态之前提示，除非设置了 `--yes`。在非交互模式下，apply 需要 `--yes`。

  </Accordion>
  <Accordion title="备份">
    Apply 在应用迁移之前创建并验证 OpenClaw 备份。如果本地尚不存在 OpenClaw 状态，备份步骤将被跳过，迁移可以继续。要在状态存在时跳过备份，同时传递 `--no-backup` 和 `--force`。
  </Accordion>
  <Accordion title="冲突">
    当计划有冲突时，Apply 拒绝继续。查看计划，如果故意替换现有目标，则使用 `--overwrite` 重新运行。提供商仍然可以在迁移报告目录中为被覆盖的文件写入条目级备份。
  </Accordion>
  <Accordion title="密钥">
    默认情况下永远不导入密钥。使用 `--include-secrets` 导入支持的凭据。
  </Accordion>
</AccordionGroup>

## Claude 提供商

捆绑的 Claude 提供商默认检测 `~/.claude` 中的 Claude Code 状态。使用 `--from <path>` 导入特定的 Claude Code 主目录或项目根目录。

<Tip>
有关面向用户的演练，请参阅[从 Claude 迁移](/install/migrating-claude)。
</Tip>

### Claude 导入的内容

- 将项目 `CLAUDE.md` 和 `.claude/CLAUDE.md` 导入 OpenClaw 代理工作空间。
- 将用户 `~/.claude/CLAUDE.md` 附加到工作空间 `USER.md`。
- 来自项目 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop `claude_desktop_config.json` 的 MCP 服务器定义。
- 包含 `SKILL.md` 的 Claude 技能目录。
- 转换为仅手动调用的 OpenClaw 技能的 Claude 命令 Markdown 文件。

### 归档和手动审查状态

Claude hooks、权限、环境默认值、本地记忆、路径范围规则、子代理、缓存、计划和项目历史保存在迁移报告中或作为手动审查项目报告。OpenClaw 不会自动执行 hooks、复制广泛的允许列表或导入 OAuth/Desktop 凭据状态。

## Codex 提供商

捆绑的 Codex 提供商默认检测 `~/.codex` 中的 Codex CLI 状态，或者
在设置了 `CODEX_HOME` 环境变量时检测该路径。使用 `--from <path>` 清点特定的 Codex 主目录。

当移动到 OpenClaw Codex harness 并且你想有意提升有用的个人 Codex CLI 资产时，使用此提供商。本地 Codex 应用服务器启动使用每代理 `CODEX_HOME` 和 `HOME` 目录，因此默认情况下它们不读取你的个人 Codex CLI 状态。

在交互终端中运行 `openclaw migrate codex` 会预览完整计划，然后在最终 apply 确认之前为技能复制项目打开复选框选择器。所有技能默认选中；取消选中你不想复制到此代理的任何技能。对于脚本化或精确运行，每次技能使用一次 `--skill <name>`，例如：

```bash
openclaw migrate codex --dry-run --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
```

### Codex 导入的内容

- `$CODEX_HOME/skills` 下的 Codex CLI 技能目录，不包括 Codex 的 `.system` 缓存。
- `$HOME/.agents/skills` 下的个人 AgentSkills，当你想要每代理所有权时，复制到当前 OpenClaw 代理工作空间。

### 手动审查的 Codex 状态

Codex 原生插件、`config.toml` 和原生 `hooks/hooks.json` 不会自动激活。插件可能会公开 MCP 服务器、应用、hooks 或其他可执行行为，因此提供商报告它们以供审查，而不是将它们加载到 OpenClaw 中。配置和 hook 文件被复制到迁移报告中以供手动审查。

## Hermes 提供商

捆绑的 Hermes 提供商默认检测 `~/.hermes` 中的状态。当 Hermes 位于其他位置时，使用 `--from <path>`。

### Hermes 导入的内容

- 来自 `config.yaml` 的默认模型配置。
- 来自 `providers` 和 `custom_providers` 的已配置模型提供商和自定义 OpenAI 兼容端点。
- 来自 `mcp_servers` 或 `mcp.servers` 的 MCP 服务器定义。
- 将 `SOUL.md` 和 `AGENTS.md` 导入 OpenClaw 代理工作空间。
- 将 `memories/MEMORY.md` 和 `memories/USER.md` 附加到工作空间记忆文件。
- OpenClaw 文件记忆的记忆配置默认值，以及外部记忆提供商（如 Honcho）的归档或手动审查项目。
- `skills/<name>/` 下包含 `SKILL.md` 文件的技能。
- 来自 `skills.config` 的每技能配置值。
- 来自 `.env` 的支持的 API 密钥，仅使用 `--include-secrets`。

### 支持的 `.env` 密钥

`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`OPENROUTER_API_KEY`、`GOOGLE_API_KEY`、`GEMINI_API_KEY`、`GROQ_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`DEEPSEEK_API_KEY`。

### 仅归档状态

OpenClaw 无法安全解释的 Hermes 状态被复制到迁移报告中供手动审查，但不加载到实时 OpenClaw 配置或凭据中。这保留了不透明或不安全的状态，而不假装 OpenClaw 可以自动执行或信任它：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `auth.json`
- `state.db`

### 应用后

```bash
openclaw doctor
```

## 插件合同

迁移源是插件。插件在 `openclaw.plugin.json` 中声明其提供商 ID：

```json
{
  "contracts": {
    "migrationProviders": ["hermes"]
  }
}
```

在运行时，插件调用 `api.registerMigrationProvider(...)`。提供商实现 `detect`、`plan` 和 `apply`。核心拥有 CLI 编排、备份策略、提示、JSON 输出和冲突预检。核心将审查后的计划传递给 `apply(ctx, plan)`，提供商仅在该参数缺失时才可以重建计划以保持兼容性。

提供商插件可以使用 `openclaw/plugin-sdk/migration` 进行条目构建和摘要计数，以及 `openclaw/plugin-sdk/migration-runtime` 用于冲突感知文件复制、仅归档报告复制、缓存的配置运行时包装器和迁移报告。

## 入门集成

当提供商检测到已知来源时，入门可以提供迁移。`openclaw onboard --flow import` 和 `openclaw setup --wizard --import-from hermes` 都使用相同的插件迁移提供商，并且在应用之前仍然显示预览。

<Note>
入门导入需要全新的 OpenClaw 设置。如果你已经有本地状态，请先重置配置、凭据、会话和工作空间。备份加覆盖或合并导入对于现有设置是功能门控的。
</Note>

## 相关

- [从 Hermes 迁移](/install/migrating-hermes)：面向用户的演练。
- [从 Claude 迁移](/install/migrating-claude)：面向用户的演练。
- [迁移](/install/migrating)：将 OpenClaw 移动到新机器。
- [Doctor](/gateway/doctor)：应用迁移后的健康检查。
- [插件](/tools/plugin)：插件安装和注册。
