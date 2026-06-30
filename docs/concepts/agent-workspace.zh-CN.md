---
summary: "Agent 工作空间：位置、布局与备份策略"
read_when:
  - 需要解释 agent 工作空间或其文件布局时
  - 需要备份或迁移 agent 工作空间时
title: "Agent 工作空间"
sidebarTitle: "Agent 工作空间"
---

工作空间是 agent 的家园。它是文件工具和工作空间上下文所使用的唯一工作目录。请保持私密，并将其视为记忆存储。

这与 `~/.openclaw/` 不同，后者存储配置、凭据和会话。

<Warning>
工作空间是**默认 cwd**，而非硬隔离的沙箱。工具将相对路径解析到工作空间内，但绝对路径仍可访问主机上的其他位置，除非启用了沙箱。如果需要隔离，请使用 [`agents.defaults.sandbox`](/gateway/sandboxing)（和/或每个 agent 的沙箱配置）。

当沙箱启用且 `workspaceAccess` 不是 `"rw"` 时，工具在 `~/.openclaw/sandboxes` 下的沙箱工作空间内运行，而非你的主机工作空间。
</Warning>

## 默认位置

- 默认值：`~/.openclaw/workspace`
- 若 `OPENCLAW_PROFILE` 已设置且不为 `"default"`，默认值变为 `~/.openclaw/workspace-<profile>`。
- 在 `~/.openclaw/openclaw.json` 中覆盖：

```json5
{
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
    },
  },
}
```

`openclaw onboard`、`openclaw configure` 或 `openclaw setup` 会在工作空间不存在时创建它并填充引导文件。

<Note>
沙箱种子复制只接受工作空间内的普通文件；解析到源工作空间之外的符号链接/硬链接会被忽略。
</Note>

如果你已自行管理工作空间文件，可以禁用引导文件创建：

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## 额外工作空间文件夹

旧版安装可能创建了 `~/openclaw`。保留多个工作空间目录可能会导致令人困惑的认证或状态漂移，因为同一时间只有一个工作空间处于活跃状态。

<Note>
**建议：** 只保留一个活跃工作空间。如果不再使用额外的文件夹，请将其归档或移至废纸篓（例如 `trash ~/openclaw`）。如果你刻意保留多个工作空间，请确保 `agents.defaults.workspace` 指向活跃的那个。

当 `openclaw doctor` 检测到额外的工作空间目录时会发出警告。
</Note>

## 工作空间文件清单

以下是 OpenClaw 在工作空间内期望存在的标准文件：

<AccordionGroup>
  <Accordion title="AGENTS.md — 操作指令">
    agent 的操作指令以及如何使用记忆的说明。每次会话开始时加载。适合存放规则、优先级和"如何行为"的细节。
  </Accordion>
  <Accordion title="SOUL.md — 人格与语气">
    人格、语气和边界。每次会话加载。指南：[SOUL.md 人格指南](/concepts/soul)。
  </Accordion>
  <Accordion title="USER.md — 用户信息">
    用户是谁以及如何称呼他们。每次会话加载。
  </Accordion>
  <Accordion title="IDENTITY.md — 名称、风格、emoji">
    agent 的名称、风格和 emoji。在引导仪式期间创建/更新。
  </Accordion>
  <Accordion title="TOOLS.md — 本地工具约定">
    关于你本地工具和约定的说明。不控制工具可用性；仅作为指导。
  </Accordion>
  <Accordion title="HEARTBEAT.md — 心跳检查清单">
    可选的心跳运行小型检查清单。保持简短以避免消耗过多 token。
  </Accordion>
  <Accordion title="BOOT.md — 启动检查清单">
    可选的启动检查清单，在 gateway 重启时自动运行（当启用[内部钩子](/automation/hooks)时）。保持简短；发送外部消息时使用 message 工具。
  </Accordion>
  <Accordion title="BOOTSTRAP.md — 首次运行仪式">
    一次性的首次运行仪式。仅为全新工作空间创建。完成仪式后删除它。
  </Accordion>
  <Accordion title="memory/YYYY-MM-DD.md — 每日记忆日志">
    每日记忆日志（每天一个文件）。建议在会话开始时加载今天和昨天的记录。
  </Accordion>
  <Accordion title="MEMORY.md — 精选长期记忆（可选）">
    精选的长期记忆。仅在主要的私人会话中加载（不适用于共享/群组场景）。工作流程和自动记忆刷新见 [记忆](/concepts/memory)。
  </Accordion>
  <Accordion title="skills/ — 工作空间技能（可选）">
    工作空间专属技能。该工作空间中优先级最高的技能位置。当名称冲突时，覆盖项目 agent 技能、个人 agent 技能、托管技能、内置技能和 `skills.load.extraDirs`。
  </Accordion>
  <Accordion title="canvas/ — Canvas UI 文件（可选）">
    用于节点显示的 Canvas UI 文件（例如 `canvas/index.html`）。
  </Accordion>
</AccordionGroup>

<Note>
若引导文件缺失，OpenClaw 会向会话注入"文件缺失"标记并继续运行。大型引导文件在注入时会被截断；可通过 `agents.defaults.bootstrapMaxChars`（默认：12000）和 `agents.defaults.bootstrapTotalMaxChars`（默认：60000）调整限制。`openclaw setup` 可在不覆盖现有文件的情况下重新创建缺失的默认文件。
</Note>

## 不在工作空间中的内容

以下内容位于 `~/.openclaw/` 下，**不应**提交到工作空间仓库：

- `~/.openclaw/openclaw.json`（配置文件）
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（模型认证配置：OAuth + API 密钥）
- `~/.openclaw/agents/<agentId>/agent/codex-home/`（每个 agent 的 Codex 运行时账户、配置、技能、插件和原生线程状态）
- `~/.openclaw/credentials/`（渠道/提供商状态及旧版 OAuth 导入数据）
- `~/.openclaw/agents/<agentId>/sessions/`（会话记录 + 元数据）
- `~/.openclaw/skills/`（托管技能）

如需迁移会话或配置，请单独复制，并不要将其纳入版本控制。

## Git 备份（推荐，私有）

将工作空间视为私人记忆。将其放入**私有** git 仓库以便备份和恢复。

在运行 Gateway 的机器上执行以下步骤（工作空间就在那里）。

<Steps>
  <Step title="初始化仓库">
    如果安装了 git，全新工作空间会自动初始化。如果此工作空间还不是仓库，请运行：

    ```bash
    cd ~/.openclaw/workspace
    git init
    git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
    git commit -m "Add agent workspace"
    ```

  </Step>
  <Step title="添加私有远程仓库">
    <Tabs>
      <Tab title="GitHub 网页界面">
        1. 在 GitHub 上创建一个**私有**仓库。
        2. 不要用 README 初始化（避免合并冲突）。
        3. 复制 HTTPS 远程 URL。
        4. 添加远程仓库并推送：

        ```bash
        git branch -M main
        git remote add origin <https-url>
        git push -u origin main
        ```
      </Tab>
      <Tab title="GitHub CLI (gh)">
        ```bash
        gh auth login
        gh repo create openclaw-workspace --private --source . --remote origin --push
        ```
      </Tab>
      <Tab title="GitLab 网页界面">
        1. 在 GitLab 上创建一个**私有**仓库。
        2. 不要用 README 初始化（避免合并冲突）。
        3. 复制 HTTPS 远程 URL。
        4. 添加远程仓库并推送：

        ```bash
        git branch -M main
        git remote add origin <https-url>
        git push -u origin main
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="持续更新">
    ```bash
    git status
    git add .
    git commit -m "Update memory"
    git push
    ```
  </Step>
</Steps>

## 不要提交密钥

<Warning>
即使在私有仓库中，也应避免在工作空间中存储密钥：

- API 密钥、OAuth token、密码或私有凭据。
- `~/.openclaw/` 下的任何内容。
- 聊天记录的原始转储或敏感附件。

如果必须存储敏感引用，请使用占位符，将真实密钥保存在其他地方（密码管理器、环境变量或 `~/.openclaw/`）。
</Warning>

建议的 `.gitignore` 起始模板：

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## 将工作空间迁移到新机器

<Steps>
  <Step title="克隆仓库">
    将仓库克隆到目标路径（默认为 `~/.openclaw/workspace`）。
  </Step>
  <Step title="更新配置">
    在 `~/.openclaw/openclaw.json` 中将 `agents.defaults.workspace` 设置为该路径。
  </Step>
  <Step title="填充缺失文件">
    运行 `openclaw setup --workspace <path>` 填充任何缺失的文件。
  </Step>
  <Step title="复制会话（可选）">
    如果需要会话记录，请从旧机器单独复制 `~/.openclaw/agents/<agentId>/sessions/`。
  </Step>
</Steps>

## 高级说明

- 多 agent 路由可以为每个 agent 使用不同的工作空间。路由配置见 [渠道路由](/channels/channel-routing)。
- 如果启用了 `agents.defaults.sandbox`，非主会话可以使用 `agents.defaults.sandbox.workspaceRoot` 下的每会话沙箱工作空间。

## 相关文档

- [心跳](/gateway/heartbeat) —— HEARTBEAT.md 工作空间文件
- [沙箱](/gateway/sandboxing) —— 沙箱环境中的工作空间访问
- [会话](/concepts/session) —— 会话存储路径
- [常驻指令](/automation/standing-orders) —— 工作空间文件中的持久指令
