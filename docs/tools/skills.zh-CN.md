---
summary: "技能：托管技能与工作区技能、门控规则、代理允许列表和配置接线"
read_when:
  - 添加或修改技能
  - 更改技能门控、允许列表或加载规则
  - 了解技能优先级和快照行为
title: "技能"
sidebarTitle: "技能"
---

OpenClaw 使用**[AgentSkills](https://agentskills.io) 兼容**的技能文件夹来教代理如何使用工具。每个技能都是一个包含带 YAML frontmatter 和说明的 `SKILL.md` 的目录。OpenClaw 加载内置技能以及可选的本地覆盖，并在加载时根据环境、配置和二进制文件存在情况对其进行过滤。

## 位置和优先级

OpenClaw 从这些来源加载技能，**最高优先级优先**：

| #   | 来源           | 路径                            |
| --- | -------------- | ------------------------------- |
| 1   | 工作区技能     | `<workspace>/skills`            |
| 2   | 项目代理技能   | `<workspace>/.agents/skills`    |
| 3   | 个人代理技能   | `~/.agents/skills`              |
| 4   | 托管/本地技能  | `~/.openclaw/skills`            |
| 5   | 内置技能       | 随安装包附带                    |
| 6   | 额外技能文件夹 | `skills.load.extraDirs`（配置） |

如果技能名称冲突，优先级最高的来源胜出。

Codex CLI 的原生 `$CODEX_HOME/skills` 目录不是 OpenClaw 的技能根目录之一。在 Codex 工具模式中，本地应用服务器启动使用隔离的每代理 Codex 主目录，因此个人 Codex CLI 技能不会被隐式加载。使用 `openclaw migrate codex --dry-run` 进行盘点，使用 `openclaw migrate codex` 通过交互式复选框提示选择技能目录后复制到当前 OpenClaw 代理工作区。对于非交互式运行，重复 `--skill <name>` 指定要复制的确切技能。

## 每代理技能与共享技能

在**多代理**设置中，每个代理都有自己的工作区：

| 范围          | 路径                                  | 对谁可见           |
| ------------- | ------------------------------------- | ------------------ |
| 每代理        | `<workspace>/skills`                  | 仅该代理           |
| 项目代理      | `<workspace>/.agents/skills`          | 仅该工作区的代理   |
| 个人代理      | `~/.agents/skills`                    | 该机器上的所有代理 |
| 共享托管/本地 | `~/.openclaw/skills`                  | 该机器上的所有代理 |
| 共享额外目录  | `skills.load.extraDirs`（优先级最低） | 该机器上的所有代理 |

多处同名 → 最高来源胜出。工作区胜过项目代理，胜过个人代理，胜过托管/本地，胜过内置，胜过额外目录。

## 代理技能允许列表

技能**位置**和技能**可见性**是独立的控制项。位置/优先级决定同名技能的哪个副本胜出；代理允许列表决定代理实际上可以使用哪些技能。

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // 继承 github, weather
      { id: "docs", skills: ["docs-search"] }, // 替换默认值
      { id: "locked-down", skills: [] }, // 无技能
    ],
  },
}
```

<AccordionGroup>
  <Accordion title="允许列表规则">
    - 省略 `agents.defaults.skills` 默认不限制技能。
    - 省略 `agents.list[].skills` 继承 `agents.defaults.skills`。
    - 设置 `agents.list[].skills: []` 表示无技能。
    - 非空的 `agents.list[].skills` 列表是该代理的**最终**集合——它不与默认值合并。
    - 有效允许列表适用于提示构建、技能 slash 命令发现、沙盒同步和技能快照。
  </Accordion>
</AccordionGroup>

## 插件和技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录（相对于插件根的路径）来附带自己的技能。启用插件时加载插件技能。这是放置对于工具描述来说太长但每当安装插件时都应该可用的特定工具操作指南的合适位置——例如，浏览器插件附带了用于多步骤浏览器控制的 `browser-automation` 技能。

插件技能目录与 `skills.load.extraDirs` 合并到相同的低优先级路径，因此同名的内置、托管、代理或工作区技能会覆盖它们。你可以通过插件配置条目上的 `metadata.openclaw.requires.config` 对其进行门控。

参阅[插件](/tools/plugin)了解发现/配置，参阅[工具](/tools)了解这些技能教授的工具界面。

## 技能工坊

可选的实验性**技能工坊**插件可以从代理工作期间观察到的可重用过程中创建或更新工作区技能。默认禁用，必须通过 `plugins.entries.skill-workshop` 显式启用。

技能工坊仅写入 `<workspace>/skills`，扫描生成的内容，支持待批准或自动安全写入，隔离不安全的提案，并在成功写入后刷新技能快照，使新技能无需重启 Gateway 即可使用。

将其用于纠正，如*"下次，验证 GIF 归因"*或来之不易的工作流，如媒体 QA 检查清单。从待批准开始；仅在查看其提案后在受信任的工作区中使用自动写入。完整指南：[技能工坊插件](/plugins/skill-workshop)。

## ClawHub（安装和同步）

[ClawHub](https://clawhub.ai) 是 OpenClaw 的公共技能注册表。使用原生 `openclaw skills` 命令进行发现/安装/更新，或使用单独的 `clawhub` CLI 进行发布/同步工作流。完整指南：[ClawHub](/tools/clawhub)。

| 操作                    | 命令                                   |
| ----------------------- | -------------------------------------- |
| 将技能安装到工作区      | `openclaw skills install <skill-slug>` |
| 更新所有已安装的技能    | `openclaw skills update --all`         |
| 同步（扫描 + 发布更新） | `clawhub sync --all`                   |

原生 `openclaw skills install` 安装到活动工作区的 `skills/` 目录中。单独的 `clawhub` CLI 也安装到当前工作目录（或回退到配置的 OpenClaw 工作区）下的 `./skills` 中。OpenClaw 在下一个会话中将其作为 `<workspace>/skills` 获取。配置的技能根目录还支持一个分组级别，如 `skills/<group>/<skill>/SKILL.md`，这样相关的第三方技能就可以放在共享文件夹下，而无需广泛的递归扫描。

ClawHub 技能页面在安装前显示最新的安全扫描状态，包含 VirusTotal、ClawScan 和静态分析的扫描器详细页面。`openclaw skills install <slug>` 仍然只是安装路径；发布者通过 ClawHub 控制面板或 `clawhub skill rescan <slug>` 恢复误报。

## 安全性

<Warning>
将第三方技能视为**不受信任的代码**。启用前请先阅读。对于不受信任的输入和高风险工具，建议使用沙盒运行。参阅[沙盒化](/gateway/sandboxing)了解代理端控制。
</Warning>

- 工作区和额外目录技能发现仅接受其解析后的实际路径保持在配置根目录内的技能根目录和 `SKILL.md` 文件。
- Gateway 支持的技能依赖安装（`skills.install`、引导和技能设置 UI）在执行安装程序元数据之前运行内置的危险代码扫描器。`critical` 发现默认会被阻止，除非调用方明确设置危险覆盖；`suspicious` 发现仍然只会警告。
- `openclaw skills install <slug>` 是不同的——它将 ClawHub 技能文件夹下载到工作区中，不使用上述安装程序元数据路径。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 将密钥注入该代理轮次的**主机**进程（而非沙盒）。将密钥排除在提示和日志之外。

有关更广泛的威胁模型和检查清单，参阅[安全性](/gateway/security)。

## SKILL.md 格式

`SKILL.md` 至少必须包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw 遵循 AgentSkills 规范的布局/意图。嵌入代理使用的解析器仅支持**单行** frontmatter 键；`metadata` 应为**单行 JSON 对象**。在说明中使用 `{baseDir}` 引用技能文件夹路径。

### 可选的 frontmatter 键

<ParamField path="homepage" type="string">
  在 macOS 技能 UI 中显示为"网站"的 URL。也可通过 `metadata.openclaw.homepage` 支持。
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  为 `true` 时，将技能暴露为用户 slash 命令。
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  为 `true` 时，OpenClaw 将技能的说明排除在代理的正常提示之外。当 `user-invocable` 也为 `true` 时，技能仍然已安装，并且仍然可以作为 slash 命令显式运行。
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  设置为 `tool` 时，slash 命令绕过模型并直接分发到工具。
</ParamField>
<ParamField path="command-tool" type="string">
  设置 `command-dispatch: tool` 时要调用的工具名称。
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  对于工具分发，将原始参数字符串转发到工具（无核心解析）。工具以 `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }` 调用。
</ParamField>

## 门控（加载时过滤）

OpenClaw 在加载时使用 `metadata`（单行 JSON）过滤技能：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata:
  {
    "openclaw":
      {
        "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] },
        "primaryEnv": "GEMINI_API_KEY",
      },
  }
---
```

`metadata.openclaw` 下的字段：

<ParamField path="always" type="boolean">
  为 `true` 时，始终包含技能（跳过其他门控）。
</ParamField>
<ParamField path="emoji" type="string">
  macOS 技能 UI 使用的可选 emoji。
</ParamField>
<ParamField path="homepage" type="string">
  在 macOS 技能 UI 中显示为"网站"的可选 URL。
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  可选的平台列表。如果设置，技能仅在这些操作系统上有资格。
</ParamField>
<ParamField path="requires.bins" type="string[]">
  每个都必须存在于 `PATH` 上。
</ParamField>
<ParamField path="requires.anyBins" type="string[]">
  至少一个必须存在于 `PATH` 上。
</ParamField>
<ParamField path="requires.env" type="string[]">
  环境变量必须存在或在配置中提供。
</ParamField>
<ParamField path="requires.config" type="string[]">
  必须为真值的 `openclaw.json` 路径列表。
</ParamField>
<ParamField path="primaryEnv" type="string">
  与 `skills.entries.<name>.apiKey` 关联的环境变量名称。
</ParamField>
<ParamField path="install" type="object[]">
  macOS 技能 UI 使用的可选安装程序规范（brew/node/go/uv/download）。
</ParamField>

如果没有 `metadata.openclaw`，技能始终有资格（除非在配置中禁用或内置技能被 `skills.allowBundled` 阻止）。

<Note>
当 `metadata.openclaw` 不存在时，旧版 `metadata.clawdbot` 块仍被接受，因此较旧的已安装技能保留其依赖项门控和安装程序提示。新的和更新的技能应使用 `metadata.openclaw`。
</Note>

### 沙盒化说明

- `requires.bins` 在技能加载时在**主机**上检查。
- 如果代理是沙盒化的，二进制文件也必须存在于**容器内部**。通过 `agents.defaults.sandbox.docker.setupCommand`（或自定义镜像）安装它。`setupCommand` 在容器创建后运行一次。包安装还需要网络出口、可写根文件系统和沙盒中的 root 用户。
- 示例：`summarize` 技能（`skills/summarize/SKILL.md`）需要沙盒容器中的 `summarize` CLI 才能在那里运行。

### 安装程序规范

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata:
  {
    "openclaw":
      {
        "emoji": "♊️",
        "requires": { "bins": ["gemini"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "gemini-cli",
              "bins": ["gemini"],
              "label": "Install Gemini CLI (brew)",
            },
          ],
      },
  }
---
```

<AccordionGroup>
  <Accordion title="安装程序选择规则">
    - 如果列出了多个安装程序，gateway 选择单个首选选项（可用时选 brew，否则选 node）。
    - 如果所有安装程序都是 `download`，OpenClaw 列出每个条目以便你可以看到可用的工件。
    - 安装程序规范可以包含 `os: ["darwin"|"linux"|"win32"]` 按平台过滤选项。
    - Node 安装遵循 `openclaw.json` 中的 `skills.install.nodeManager`（默认：npm；选项：npm/pnpm/yarn/bun）。这只影响技能安装；Gateway 运行时仍应为 Node——不建议 WhatsApp/Telegram 使用 Bun。
    - Gateway 支持的安装程序选择是基于偏好的：当安装规范混合种类时，当 `skills.install.preferBrew` 启用且 `brew` 存在时 OpenClaw 优先选择 Homebrew，然后 `uv`，然后配置的节点管理器，然后其他回退如 `go` 或 `download`。
    - 如果每个安装规范都是 `download`，OpenClaw 显示所有下载选项而非折叠为一个首选安装程序。

  </Accordion>
  <Accordion title="每种安装程序的详细信息">
    - **Go 安装：**如果 `go` 缺失且 `brew` 可用，gateway 首先通过 Homebrew 安装 Go，并在可能时将 `GOBIN` 设置为 Homebrew 的 `bin`。
    - **下载安装：**`url`（必填），`archive`（`tar.gz` | `tar.bz2` | `zip`），`extract`（默认：检测到存档时自动），`stripComponents`，`targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

  </Accordion>
</AccordionGroup>

## 配置覆盖

内置和托管技能可以在 `~/.openclaw/openclaw.json` 中的 `skills.entries` 下切换并提供环境值：

```json5
{
  skills: {
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // 或纯文本字符串
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
        config: {
          endpoint: "https://example.invalid",
          model: "nano-pro",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

<ParamField path="enabled" type="boolean">
  `false` 禁用技能，即使它是内置或已安装的。内置 `coding-agent` 技能是选择加入的：在将其暴露给代理之前设置 `skills.entries.coding-agent.enabled: true`，然后确保安装并认证了 `claude`、`codex`、`opencode` 或 `pi` 之一用于其自己的 CLI。
</ParamField>
<ParamField path="apiKey" type='string | { source, provider, id }'>
  声明 `metadata.openclaw.primaryEnv` 的技能的便捷项。支持纯文本或 SecretRef。
</ParamField>
<ParamField path="env" type="Record<string, string>">
  仅在进程中尚未设置该变量时注入。
</ParamField>
<ParamField path="config" type="object">
  自定义每技能字段的可选容器。自定义键必须放在这里。
</ParamField>
<ParamField path="allowBundled" type="string[]">
  仅**内置**技能的可选允许列表。如果设置，只有列表中的内置技能才有资格（托管/工作区技能不受影响）。
</ParamField>

如果技能名称包含连字符，请引用键（JSON5 允许引用键）。配置键默认匹配**技能名称**——如果技能定义了 `metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

<Note>
对于 OpenClaw 内部的标准图像生成/编辑，使用核心 `image_generate` 工具加上 `agents.defaults.imageGenerationModel` 而非内置技能。此处的技能示例适用于自定义或第三方工作流。对于原生图像分析，使用 `image` 工具加上 `agents.defaults.imageModel`。如果你选择 `openai/*`、`google/*`、`fal/*` 或其他提供商特定的图像模型，也要添加该提供商的认证/API 密钥。
</Note>

## 环境注入

当代理运行开始时，OpenClaw：

1. 读取技能元数据。
2. 将 `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 应用到 `process.env`。
3. 使用**合格**技能构建系统提示。
4. 运行结束后恢复原始环境。

环境注入的**范围限于代理运行**，而非全局 shell 环境。

对于内置 `claude-cli` 后端，OpenClaw 还将同样的合格快照作为临时 Claude Code 插件实现，并通过 `--plugin-dir` 传递。Claude Code 可以使用其原生技能解析器，而 OpenClaw 仍拥有优先级、每代理允许列表、门控和 `skills.entries.*` 环境/API 密钥注入。其他 CLI 后端仅使用提示目录。

## 快照和刷新

OpenClaw 在**会话开始时**快照合格技能，并在同一会话的后续轮次中重用该列表。技能或配置的更改在下一个新会话中生效。

技能可以在两种情况下在会话中刷新：

- 技能监视器已启用。
- 出现新的合格远程节点。

可以将其理解为**热重载**：刷新后的列表在下一个代理轮次中被获取。如果该会话的有效代理技能允许列表发生变化，OpenClaw 会刷新快照，使可见技能与当前代理保持一致。

### 技能监视器

默认情况下，OpenClaw 监视技能文件夹，并在 `SKILL.md` 文件更改时更新技能快照。在 `skills.load` 下配置：

```json5
{
  skills: {
    load: {
      watch: true,
      watchDebounceMs: 250,
    },
  },
}
```

### 远程 macOS 节点（Linux gateway）

如果 Gateway 在 Linux 上运行，但连接了一个允许 `system.run` 的**macOS 节点**（Exec 审批安全设置未设置为 `deny`），当所需二进制文件存在于该节点上时，OpenClaw 可以将仅限 macOS 的技能视为合格。代理应通过带 `host=node` 的 `exec` 工具执行这些技能。

这依赖于节点报告其命令支持以及通过 `system.which` 或 `system.run` 进行的二进制探测。离线节点**不会**使仅远程的技能可见。如果已连接的节点停止响应二进制探测，OpenClaw 会清除其缓存的二进制匹配，代理不再看到当前无法在那里运行的技能。

## Token 影响

当技能合格时，OpenClaw 将可用技能的紧凑 XML 列表注入系统提示（通过 `pi-coding-agent` 中的 `formatSkillsForPrompt`）。成本是确定性的：

- **基本开销**（仅当 ≥1 个技能时）：195 个字符。
- **每个技能：**97 个字符 + XML 转义后的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符数）：

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

XML 转义将 `& < > " '` 扩展为实体（`&amp;`、`&lt;` 等），增加长度。Token 数量因模型 tokenizer 而异。粗略的 OpenAI 风格估计是约 4 个字符/token，因此**每个技能约 97 个字符 ≈ 24 个 token** 加上你的实际字段长度。

## 托管技能生命周期

OpenClaw 随安装包（npm 包或 OpenClaw.app）附带一组基础技能作为**内置技能**。`~/.openclaw/skills` 用于本地覆盖——例如，固定或修补技能而不更改内置副本。工作区技能归用户所有，并在名称冲突时覆盖两者。

## 寻找更多技能？

浏览 [https://clawhub.ai](https://clawhub.ai)。完整配置模式：[技能配置](/tools/skills-config)。

## 相关链接

- [ClawHub](/tools/clawhub) — 公共技能注册表
- [创建技能](/tools/creating-skills) — 构建自定义技能
- [插件](/tools/plugin) — 插件系统概览
- [技能工坊插件](/plugins/skill-workshop) — 从代理工作生成技能
- [技能配置](/tools/skills-config) — 技能配置参考
- [Slash 命令](/tools/slash-commands) — 所有可用 slash 命令
