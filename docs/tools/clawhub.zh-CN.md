---
summary: "ClawHub：OpenClaw 技能和插件的公共注册表、原生安装流程以及 clawhub CLI"
read_when:
  - 搜索、安装或更新技能或插件
  - 将技能或插件发布到注册表
  - 配置 clawhub CLI 或其环境变量覆盖
title: "ClawHub"
sidebarTitle: "ClawHub"
---

ClawHub 是 **OpenClaw 技能和插件**的公共注册表。

- 使用原生 `openclaw` 命令搜索、安装和更新技能，以及从 ClawHub 安装插件。
- 使用独立的 `clawhub` CLI 进行注册表认证、发布、删除/取消删除和同步工作流。

网站：[clawhub.ai](https://clawhub.ai)

## 快速开始

<Steps>
  <Step title="搜索">
    ```bash
    openclaw skills search "calendar"
    ```
  </Step>
  <Step title="安装">
    ```bash
    openclaw skills install <skill-slug>
    ```
  </Step>
  <Step title="使用">
    开始新的 OpenClaw 会话——它会自动加载新技能。
  </Step>
  <Step title="发布（可选）">
    对于注册表认证的工作流（发布、同步、管理），请安装独立的 `clawhub` CLI：

    ```bash
    npm i -g clawhub
    # 或
    pnpm add -g clawhub
    ```

  </Step>
</Steps>

## 原生 OpenClaw 流程

<Tabs>
  <Tab title="技能">
    ```bash
    openclaw skills search "calendar"
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生 `openclaw` 命令安装到您的活动工作区，并持久化源元数据，以便后续 `update` 调用可以保持在 ClawHub 上。

  </Tab>
  <Tab title="插件">
    ```bash
    openclaw plugins search "calendar"
    openclaw plugins install clawhub:<package>
    openclaw plugins update --all
    ```

    `plugins search` 查询 ClawHub 插件目录并打印可立即安装的包名称。当您想要 ClawHub 解析时使用 `clawhub:<package>`。裸 npm 安全的插件规格在发布切换期间从 npm 安装：

    ```bash
    openclaw plugins install openclaw-codex-app-server
    ```

    `npm:<package>` 也是仅 npm 的，当规格可能存在歧义时很有用：

    ```bash
    openclaw plugins install npm:openclaw-codex-app-server
    ```

    插件安装在归档安装运行之前验证通告的 `pluginApi` 和 `minGatewayVersion` 兼容性，因此不兼容的主机会提前失败关闭，而不是部分安装包。当包版本发布 ClawPack 工件时，OpenClaw 优先使用精确上传的 npm-pack `.tgz`，验证 ClawHub 摘要标头和下载字节，并记录工件类型、npm 完整性、npm shasum、tarball 名称和 ClawPack 摘要元数据以供后续更新使用。没有 ClawPack 元数据的旧版包仍使用旧版包归档验证路径。

  </Tab>
</Tabs>

<Note>
`openclaw plugins install clawhub:...` 只接受可安装的插件系列。如果 ClawHub 包实际上是一个技能，OpenClaw 会停止并指向您使用 `openclaw skills install <slug>`。

匿名 ClawHub 插件安装对私有包也会失败关闭。社区或其他非官方频道仍然可以安装，但 OpenClaw 会警告运营者在启用之前审查来源和验证。
</Note>

## ClawHub 是什么

- OpenClaw 技能和插件的公共注册表。
- 技能包和元数据的版本化存储。
- 用于搜索、标签和使用信号的发现界面。

典型的技能是一个版本化的文件包，包括：

- 包含主要描述和使用说明的 `SKILL.md` 文件。
- 技能使用的可选配置、脚本或支持文件。
- 标签、摘要和安装要求等元数据。

ClawHub 使用元数据来支持发现并安全地暴露技能能力。注册表跟踪使用信号（星标、下载）以改善排名和可见性。每次发布都会创建一个新的语义版本，注册表保留版本历史，以便用户可以审计更改。

## 工作区和技能加载

独立的 `clawhub` CLI 也会将技能安装到当前工作目录下的 `./skills` 中。如果配置了 OpenClaw 工作区，`clawhub` 会回退到该工作区，除非您覆盖 `--workdir`（或 `CLAWHUB_WORKDIR`）。OpenClaw 从 `<workspace>/skills` 加载工作区技能，并在**下一个**会话中加载它们。

如果您已经使用 `~/.openclaw/skills` 或捆绑技能，工作区技能具有优先权。有关技能如何加载、共享和控制的更多详情，请参阅[技能](/tools/skills)。

## 服务功能

| 功能               | 说明                                               |
| ------------------ | -------------------------------------------------- |
| 公开浏览           | 技能及其 `SKILL.md` 内容可公开查看。               |
| 搜索               | 嵌入驱动（向量搜索），不仅仅是关键词。             |
| 版本控制           | 语义版本、变更日志和标签（包括 `latest`）。        |
| 下载               | 每个版本的 ZIP 文件。                              |
| 星标和评论         | 社区反馈。                                         |
| 安全扫描摘要       | 详细页面在安装或下载前显示最新扫描状态。           |
| 扫描器详情页       | VirusTotal、ClawScan 和静态分析结果有深层链接。    |
| 所有者恢复控制台   | 发布者可以从 `/dashboard` 查看扫描保留的已有内容。 |
| 所有者请求重新扫描 | 所有者可以为误报恢复请求有限次重新扫描。           |
| 审核               | 审批和审计。                                       |
| 适合 CLI 的 API    | 适用于自动化和脚本编写。                           |

## 安全和审核

ClawHub 默认开放——任何人都可以上传技能，但 GitHub 账户必须**至少一周**才能发布。这减缓了滥用而不阻止合法贡献者。

<AccordionGroup>
  <Accordion title="安全扫描">
    ClawHub 对发布的技能和插件版本运行自动安全检查。公开详情页总结当前结果，扫描器行链接到 VirusTotal、ClawScan 和静态分析的专用详情页。

    扫描保留或阻止的版本可能在公开目录和安装界面上不可用，但所有者仍可在 `/dashboard` 中看到它们。

  </Accordion>
  <Accordion title="举报">
    - 任何已登录用户都可以举报技能。
    - 举报原因是必填的并被记录。
    - 每个用户一次最多可以有 20 个活跃举报。
    - 超过 3 个唯一举报的技能默认自动隐藏。

  </Accordion>
  <Accordion title="审核">
    - 审核员可以查看隐藏的技能、取消隐藏、删除它们或封禁用户。
    - 滥用举报功能可能导致账户封禁。
    - 有兴趣成为审核员？在 OpenClaw Discord 中询问并联系审核员或维护者。

  </Accordion>
</AccordionGroup>

## ClawHub CLI

您只需要此工具用于注册表认证的工作流，如发布/同步。

### 全局选项

<ParamField path="--workdir <dir>" type="string">
  工作目录。默认：当前目录；回退到 OpenClaw 工作区。
</ParamField>
<ParamField path="--dir <dir>" type="string" default="skills">
  技能目录，相对于 workdir。
</ParamField>
<ParamField path="--site <url>" type="string">
  网站基础 URL（浏览器登录）。
</ParamField>
<ParamField path="--registry <url>" type="string">
  注册表 API 基础 URL。
</ParamField>
<ParamField path="--no-input" type="boolean">
  禁用提示（非交互式）。
</ParamField>
<ParamField path="-V, --cli-version" type="boolean">
  打印 CLI 版本。
</ParamField>

### 命令

<AccordionGroup>
  <Accordion title="认证（login / logout / whoami）">
    ```bash
    clawhub login              # 浏览器流程
    clawhub login --token <token>
    clawhub logout
    clawhub whoami
    ```

    登录选项：

    - `--token <token>` — 粘贴 API 令牌。
    - `--label <label>` — 为浏览器登录令牌存储的标签（默认：`CLI token`）。
    - `--no-browser` — 不打开浏览器（需要 `--token`）。

  </Accordion>
  <Accordion title="搜索">
    ```bash
    clawhub search "query"
    ```

    搜索技能。对于插件/包发现，请使用 `clawhub package explore`。

    - `--limit <n>` — 最大结果数。

  </Accordion>
  <Accordion title="浏览/检查插件">
    ```bash
    clawhub package explore --family code-plugin
    clawhub package explore "episodic-claw" --family code-plugin
    clawhub package inspect episodic-claw
    ```

    `package explore` 和 `package inspect` 是 ClawHub CLI 用于插件/包发现和元数据检查的界面。原生 OpenClaw 安装仍使用 `openclaw plugins install clawhub:<package>`。

    选项：

    - `--family skill|code-plugin|bundle-plugin` — 过滤包系列。
    - `--official` — 仅显示官方包。
    - `--executes-code` — 仅显示执行代码的包。
    - `--version <version>` / `--tag <tag>` — 检查特定包版本。
    - `--versions`、`--files`、`--file <path>` — 检查包历史记录和文件。
    - `--json` — 机器可读输出。

  </Accordion>
  <Accordion title="安装/更新/列出">
    ```bash
    clawhub install <slug>
    clawhub update <slug>
    clawhub update --all
    clawhub list
    ```

    选项：

    - `--version <version>` — 安装或更新到特定版本（`update` 时仅限单个 slug）。
    - `--force` — 如果文件夹已存在则覆盖，或当本地文件与任何已发布版本不匹配时。
    - `clawhub list` 读取 `.clawhub/lock.json`。

  </Accordion>
  <Accordion title="发布技能">
    ```bash
    clawhub skill publish <path>
    ```

    选项：

    - `--slug <slug>` — 技能 slug。
    - `--name <name>` — 显示名称。
    - `--version <version>` — 语义版本。
    - `--changelog <text>` — 变更日志文本（可以为空）。
    - `--tags <tags>` — 逗号分隔的标签（默认：`latest`）。

  </Accordion>
  <Accordion title="发布插件">
    ```bash
    clawhub package publish <source>
    ```

    `<source>` 可以是本地文件夹、`owner/repo`、`owner/repo@ref` 或 GitHub URL。

    选项：

    - `--dry-run` — 构建精确的发布计划而不上传任何内容。
    - `--json` — 为 CI 输出机器可读内容。
    - `--source-repo`、`--source-commit`、`--source-ref` — 当自动检测不够时的可选覆盖。

  </Accordion>
  <Accordion title="请求重新扫描">
    ```bash
    clawhub skill rescan <slug>
    clawhub skill rescan <slug> --yes --json

    clawhub package rescan <name>
    clawhub package rescan <name> --yes --json
    ```

    重新扫描命令需要已登录的所有者令牌，并针对最新发布的技能版本或插件版本。在非交互式运行中，传递 `--yes`。

    JSON 响应包括目标类型、名称、版本、重新扫描状态以及该版本或版本的剩余/最大请求计数。

  </Accordion>
  <Accordion title="删除/取消删除（所有者或管理员）">
    ```bash
    clawhub delete <slug> --yes
    clawhub undelete <slug> --yes
    ```
  </Accordion>
  <Accordion title="同步（扫描本地 + 发布新的或已更新的）">
    ```bash
    clawhub sync
    ```

    选项：

    - `--root <dir...>` — 额外的扫描根目录。
    - `--all` — 无提示上传所有内容。
    - `--dry-run` — 显示将上传的内容。
    - `--bump <type>` — 更新的 `patch|minor|major`（默认：`patch`）。
    - `--changelog <text>` — 非交互式更新的变更日志。
    - `--tags <tags>` — 逗号分隔的标签（默认：`latest`）。
    - `--concurrency <n>` — 注册表检查（默认：`4`）。

  </Accordion>
</AccordionGroup>

## 常见工作流

<Tabs>
  <Tab title="搜索">
    ```bash
    clawhub search "postgres backups"
    ```
  </Tab>
  <Tab title="查找插件">
    ```bash
    clawhub package explore --family code-plugin
    clawhub package explore "memory" --family code-plugin
    clawhub package inspect episodic-claw
    ```
  </Tab>
  <Tab title="安装">
    ```bash
    clawhub install my-skill-pack
    ```
  </Tab>
  <Tab title="更新全部">
    ```bash
    clawhub update --all
    ```
  </Tab>
  <Tab title="发布单个技能">
    ```bash
    clawhub skill publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
    ```
  </Tab>
  <Tab title="同步多个技能">
    ```bash
    clawhub sync --all
    ```
  </Tab>
  <Tab title="从 GitHub 发布插件">
    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    clawhub package publish your-org/your-plugin@v1.0.0
    clawhub package publish https://github.com/your-org/your-plugin
    ```
  </Tab>
</Tabs>

### 插件包元数据

代码插件必须在 `package.json` 中包含所需的 OpenClaw 元数据：

```json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"],
    "compat": {
      "pluginApi": ">=2026.3.24-beta.2",
      "minGatewayVersion": "2026.3.24-beta.2"
    },
    "build": {
      "openclawVersion": "2026.3.24-beta.2",
      "pluginSdkVersion": "2026.3.24-beta.2"
    }
  }
}
```

已发布的包应附带**构建好的 JavaScript**，并将 `runtimeExtensions` 指向该输出。Git 检出安装在没有构建文件时仍可以回退到 TypeScript 源文件，但构建好的运行时条目在启动、doctor 和插件加载路径中可以避免运行时 TypeScript 编译。

## 版本控制、锁文件和遥测

<AccordionGroup>
  <Accordion title="版本控制和标签">
    - 每次发布都会创建一个新的**语义版本** `SkillVersion`。
    - 标签（如 `latest`）指向一个版本；移动标签可让您回滚。
    - 变更日志按版本附加，在同步或发布更新时可以为空。

  </Accordion>
  <Accordion title="本地更改 vs 注册表版本">
    更新使用内容哈希比较本地技能内容与注册表版本。如果本地文件与任何已发布版本不匹配，CLI 会在覆盖前询问（或在非交互式运行中需要 `--force`）。
  </Accordion>
  <Accordion title="同步扫描和回退根目录">
    `clawhub sync` 首先扫描您的当前 workdir。如果没有找到技能，它会回退到已知的旧版位置（例如 `~/openclaw/skills` 和 `~/.openclaw/skills`）。这旨在无需额外标志即可找到旧版技能安装。
  </Accordion>
  <Accordion title="存储和锁文件">
    - 已安装的技能记录在您的 workdir 下的 `.clawhub/lock.json` 中。
    - 认证令牌存储在 ClawHub CLI 配置文件中（通过 `CLAWHUB_CONFIG_PATH` 覆盖）。

  </Accordion>
  <Accordion title="遥测（安装计数）">
    当您在已登录的情况下运行 `clawhub sync` 时，CLI 会发送最小快照以计算安装计数。您可以完全禁用此功能：

    ```bash
    export CLAWHUB_DISABLE_TELEMETRY=1
    ```

  </Accordion>
</AccordionGroup>

## 环境变量

| 变量                          | 效果                           |
| ----------------------------- | ------------------------------ |
| `CLAWHUB_SITE`                | 覆盖网站 URL。                 |
| `CLAWHUB_REGISTRY`            | 覆盖注册表 API URL。           |
| `CLAWHUB_CONFIG_PATH`         | 覆盖 CLI 存储令牌/配置的位置。 |
| `CLAWHUB_WORKDIR`             | 覆盖默认 workdir。             |
| `CLAWHUB_DISABLE_TELEMETRY=1` | 在 `sync` 时禁用遥测。         |

## 相关

- [社区插件](/plugins/community)
- [插件](/tools/plugin)
- [技能](/tools/skills)
