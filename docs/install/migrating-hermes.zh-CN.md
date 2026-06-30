---
summary: "通过预览、可逆的导入从 Hermes 迁移到 OpenClaw"
read_when:
  - 您来自 Hermes，希望保留模型配置、提示、记忆和技能
  - 您想知道 OpenClaw 自动导入的内容和仅存档的内容
  - 您需要干净的、脚本化的迁移路径（CI、新笔记本电脑、自动化）
title: "从 Hermes 迁移"
---

OpenClaw 通过内置的迁移提供程序导入 Hermes 状态。该提供程序在更改状态之前预览所有内容，在计划和报告中编辑密钥，并在应用之前创建已验证的备份。

<Note>
导入需要全新的 OpenClaw 设置。如果您已有本地 OpenClaw 状态，请先重置配置、凭据、会话和工作区，或在查看计划后直接使用带 `--overwrite` 的 `openclaw migrate`。
</Note>

## 两种导入方式

<Tabs>
  <Tab title="入门向导">
    最快的路径。向导检测 `~/.hermes` 处的 Hermes 并在应用前显示预览。

    ```bash
    openclaw onboard --flow import
    ```

    或指向特定来源：

    ```bash
    openclaw onboard --import-from hermes --import-source ~/.hermes
    ```

  </Tab>
  <Tab title="CLI">
    使用 `openclaw migrate` 进行脚本化或可重复运行。完整参考请参见 [`openclaw migrate`](/cli/migrate)。

    ```bash
    openclaw migrate hermes --dry-run    # 仅预览
    openclaw migrate apply hermes --yes  # 跳过确认应用
    ```

    当 Hermes 位于 `~/.hermes` 之外时，添加 `--from <path>`。

  </Tab>
</Tabs>

## 导入的内容

<AccordionGroup>
  <Accordion title="模型配置">
    - 来自 Hermes `config.yaml` 的默认模型选择。
    - 来自 `providers` 和 `custom_providers` 的已配置模型提供商和自定义 OpenAI 兼容端点。

  </Accordion>
  <Accordion title="MCP 服务器">
    来自 `mcp_servers` 或 `mcp.servers` 的 MCP 服务器定义。
  </Accordion>
  <Accordion title="工作区文件">
    - `SOUL.md` 和 `AGENTS.md` 被复制到 OpenClaw 代理工作区。
    - `memories/MEMORY.md` 和 `memories/USER.md` 被**追加**到匹配的 OpenClaw 记忆文件，而非覆盖。

  </Accordion>
  <Accordion title="记忆配置">
    OpenClaw 文件记忆的记忆配置默认值。外部记忆提供程序（如 Honcho）记录为存档或手动审查项目，以便您可以有意识地移动它们。
  </Accordion>
  <Accordion title="技能">
    `skills/<name>/` 下具有 `SKILL.md` 文件的技能被复制，以及来自 `skills.config` 的每个技能配置值。
  </Accordion>
  <Accordion title="API 密钥（可选）">
    设置 `--include-secrets` 以导入支持的 `.env` 密钥：`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`OPENROUTER_API_KEY`、`GOOGLE_API_KEY`、`GEMINI_API_KEY`、`GROQ_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`DEEPSEEK_API_KEY`。不带此标志时，密钥永远不会被复制。
  </Accordion>
</AccordionGroup>

## 仅存档的内容

提供程序将这些内容复制到迁移报告目录以供手动审查，但**不会**将其加载到实时 OpenClaw 配置或凭据中：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `auth.json`
- `state.db`

OpenClaw 拒绝自动执行或信任此状态，因为格式和信任假设可能在系统之间漂移。在查看存档后手动移动您需要的内容。

## 推荐流程

<Steps>
  <Step title="预览计划">
    ```bash
    openclaw migrate hermes --dry-run
    ```

    计划列出所有将要更改的内容，包括冲突、跳过的项目和任何敏感项目。计划输出编辑嵌套的看起来像密钥的键。

  </Step>
  <Step title="备份后应用">
    ```bash
    openclaw migrate apply hermes --yes
    ```

    OpenClaw 在应用之前创建并验证备份。如果您需要导入 API 密钥，添加 `--include-secrets`。

  </Step>
  <Step title="运行 doctor">
    ```bash
    openclaw doctor
    ```

    [Doctor](/gateway/doctor) 重新应用任何待处理的配置迁移并检查导入期间引入的问题。

  </Step>
  <Step title="重启并验证">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    确认网关运行正常，您导入的模型、记忆和技能已加载。

  </Step>
</Steps>

## 冲突处理

当计划报告冲突（目标处已存在文件或配置值）时，应用拒绝继续。

<Warning>
仅当打算替换现有目标时才使用 `--overwrite` 重新运行。提供程序仍可能在迁移报告目录中为覆盖的文件写入项目级备份。
</Warning>

对于全新的 OpenClaw 安装，冲突是不常见的。它们通常在您对已有用户编辑的设置重新运行导入时出现。

如果冲突在应用中途出现（例如，配置文件上的意外竞争），Hermes 将剩余的依赖配置项标记为 `skipped`，原因为 `blocked by earlier apply conflict`，而不是部分写入它们。迁移报告记录每个被阻止的项目，以便您可以解决原始冲突并重新运行导入。

## 密钥

默认情况下密钥永远不会被导入。

- 先运行 `openclaw migrate apply hermes --yes` 以导入非密钥状态。
- 如果您也想复制支持的 `.env` 密钥，使用 `--include-secrets` 重新运行。
- 对于 SecretRef 管理的凭据，在导入完成后配置 SecretRef 来源。

## 自动化的 JSON 输出

```bash
openclaw migrate hermes --dry-run --json
openclaw migrate apply hermes --json --yes
```

使用 `--json` 且不带 `--yes` 时，应用打印计划但不改变状态。这是 CI 和共享脚本最安全的模式。

## 故障排除

<AccordionGroup>
  <Accordion title="应用因冲突拒绝">
    检查计划输出。每个冲突都标识来源路径和现有目标。逐项决定是跳过、编辑目标还是使用 `--overwrite` 重新运行。
  </Accordion>
  <Accordion title="Hermes 存储在 ~/.hermes 之外">
    传递 `--from /actual/path`（CLI）或 `--import-source /actual/path`（入门）。
  </Accordion>
  <Accordion title="入门拒绝在现有设置上导入">
    入门导入需要全新设置。要么重置状态并重新入门，要么直接使用 `openclaw migrate apply hermes`，它支持 `--overwrite` 和明确的备份控制。
  </Accordion>
  <Accordion title="API 密钥未导入">
    需要 `--include-secrets`，并且只识别上面列出的密钥。`.env` 中的其他变量被忽略。
  </Accordion>
</AccordionGroup>

## 相关

- [`openclaw migrate`](/cli/migrate)：完整 CLI 参考、插件合同和 JSON 形状。
- [入门](/cli/onboard)：向导流程和非交互式标志。
- [迁移](/install/migrating)：在机器之间迁移 OpenClaw 安装。
- [Doctor](/gateway/doctor)：迁移后健康检查。
- [代理工作区](/concepts/agent-workspace)：`SOUL.md`、`AGENTS.md` 和记忆文件的存储位置。
