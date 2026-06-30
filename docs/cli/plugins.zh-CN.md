---
summary: "`openclaw plugins` 的 CLI 参考（列出、安装、市场、卸载、启用/禁用、doctor）"
read_when:
  - 你想安装或管理 Gateway 插件或兼容包时
  - 你想调试插件加载失败时
title: "Plugins"
sidebarTitle: "Plugins"
---

管理 Gateway 插件、hook 包和兼容包。

<CardGroup cols={2}>
  <Card title="插件系统" href="/tools/plugin">
    安装、启用和排除插件故障的最终用户指南。
  </Card>
  <Card title="管理插件" href="/plugins/manage-plugins">
    安装、列出、更新、卸载和发布的快速示例。
  </Card>
  <Card title="插件包" href="/plugins/bundles">
    包兼容性模型。
  </Card>
  <Card title="插件清单" href="/plugins/manifest">
    清单字段和配置架构。
  </Card>
  <Card title="安全" href="/gateway/security">
    插件安装的安全加固。
  </Card>
</CardGroup>

## 命令

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search <query>
openclaw plugins search <query> --limit 20
openclaw plugins search <query> --json
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
openclaw plugins marketplace list <marketplace> --json
```

对于缓慢的安装、检查、卸载或注册表刷新调查，使用 `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1` 运行命令。跟踪将阶段计时写入 stderr 并保持 JSON 输出可解析。请参阅[调试](/help/debugging#plugin-lifecycle-trace)。

<Note>
捆绑的插件随 OpenClaw 一起提供。某些默认启用（例如捆绑的模型提供商、捆绑的语音提供商和捆绑的浏览器插件）；其他需要 `plugins enable`。

原生 OpenClaw 插件必须附带带有内联 JSON Schema 的 `openclaw.plugin.json`（`configSchema`，即使为空）。兼容包使用自己的包清单。

`plugins list` 显示 `Format: openclaw` 或 `Format: bundle`。详细列表/信息输出还显示包子类型（`codex`、`claude` 或 `cursor`）以及检测到的包功能。
</Note>

### 安装

```bash
openclaw plugins search "calendar"                   # 搜索 ClawHub 插件
openclaw plugins install <package>                      # 默认从 npm 安装
openclaw plugins install clawhub:<package>              # 仅 ClawHub
openclaw plugins install npm:<package>                  # 仅 npm
openclaw plugins install git:github.com/<owner>/<repo>  # git 仓库
openclaw plugins install git:github.com/<owner>/<repo>@<ref>
openclaw plugins install <package> --force              # 覆盖现有安装
openclaw plugins install <package> --pin                # 锁定版本
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # 本地路径
openclaw plugins install <plugin>@<marketplace>         # 市场
openclaw plugins install <plugin> --marketplace <name>  # 市场（明确）
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

<Warning>
在发布切换期间，裸包名称默认从 npm 安装。对于 ClawHub 使用 `clawhub:<package>`。将插件安装视为运行代码。优先使用锁定版本。
</Warning>

`plugins search` 查询 ClawHub 以获取可安装的插件包，并打印即装可用的包名称。它搜索代码插件和包插件，不搜索技能。对于 ClawHub 技能使用 `openclaw skills search`。

<Note>
ClawHub 是大多数插件的主要发行和发现平台。npm 仍然是受支持的回退和直接安装路径。OpenClaw 拥有的 `@openclaw/*` 插件包再次在 npm 上发布；请参阅 [npmjs.com/org/openclaw](https://www.npmjs.com/org/openclaw) 上的当前列表或[插件清单](/plugins/plugin-inventory)。稳定安装使用 `latest`。Beta 频道安装和更新在该标签可用时优先使用 npm `beta` dist-tag，然后回退到 `latest`。
</Note>

<AccordionGroup>
  <Accordion title="配置包含和无效配置修复">
    如果你的 `plugins` 部分由单文件 `$include` 支持，`plugins install/update/enable/disable/uninstall` 会写入该包含文件并保持 `openclaw.json` 不变。根包含、包含数组和具有兄弟覆盖的包含会失败关闭而不是展平。有关支持的形状，请参阅[配置包含](/gateway/configuration)。

    如果安装期间配置无效，`plugins install` 通常会失败关闭并告诉你先运行 `openclaw doctor --fix`。在 Gateway 启动和热重载期间，无效的插件配置像任何其他无效配置一样失败关闭；`openclaw doctor --fix` 可以隔离无效的插件条目。唯一有文档记录的安装时例外是针对明确选择加入 `openclaw.install.allowInvalidConfigRecovery` 的插件的窄捆绑插件恢复路径。

  </Accordion>
  <Accordion title="--force 和重新安装与更新">
    `--force` 重用现有的安装目标，并覆盖已安装的插件或 hook 包。当你有意从新的本地路径、存档、ClawHub 包或 npm 构件重新安装相同 ID 时使用它。对于已跟踪的 npm 插件的例行升级，优先使用 `openclaw plugins update <id-or-npm-spec>`。

    如果你对已安装的插件 ID 运行 `plugins install`，OpenClaw 会停止并指向 `plugins update <id-or-npm-spec>` 进行正常升级，或者当你真正想从不同来源覆盖当前安装时指向 `plugins install <package> --force`。

  </Accordion>
  <Accordion title="--pin 范围">
    `--pin` 仅适用于 npm 安装。不支持 `git:` 安装；当你想要锁定来源时，使用明确的 git ref，如 `git:github.com/acme/plugin@v1.2.3`。不支持 `--marketplace`，因为市场安装持久化市场来源元数据而不是 npm 规范。
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 是内置危险代码扫描器误报的应急选项。它允许安装继续，即使内置扫描器报告 `critical` 发现，但它**不**绕过插件 `before_install` hook 策略阻止，**不**绕过扫描失败。

    此 CLI 标志适用于插件安装/更新流程。Gateway 支持的技能依赖项安装使用匹配的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍然是单独的 ClawHub 技能下载/安装流程。

    如果你在 ClawHub 上发布的插件被注册表扫描阻止，请使用 [ClawHub](/tools/clawhub) 中的发布者步骤。

  </Accordion>
  <Accordion title="Hook 包和 npm 规范">
    `plugins install` 也是在 `package.json` 中公开 `openclaw.hooks` 的 hook 包的安装界面。使用 `openclaw hooks` 进行过滤的 hook 可见性和每 hook 启用，而不是包安装。

    npm 规范是**仅注册表**（包名 + 可选的**精确版本**或 **dist-tag**）。git/URL/文件规范和语义版本范围被拒绝。依赖项安装以项目本地方式使用 `--ignore-scripts` 运行，即使你的 shell 有全局 npm 安装设置。

    当你想使 npm 解析明确时使用 `npm:<package>`。在发布切换期间，裸包规范也直接从 npm 安装。

    裸规范和 `@latest` 保持在稳定轨道上。OpenClaw 日期标记的更正版本（如 `2026.5.3-1`）是此检查的稳定版本。如果 npm 将其中任何一个解析为预发布版本，OpenClaw 会停止并要求你使用预发布标签（如 `@beta`/`@rc`）或精确的预发布版本（如 `@1.2.3-beta.4`）明确选择加入。

    如果裸安装规范与官方插件 ID 匹配（例如 `diffs`），OpenClaw 直接安装目录条目。要安装同名的 npm 包，使用明确的作用域规范（例如 `@scope/diffs`）。

  </Accordion>
  <Accordion title="Git 仓库">
    使用 `git:<repo>` 直接从 git 仓库安装。支持的形式包括 `git:github.com/owner/repo`、`git:owner/repo`、完整的 `https://`、`ssh://`、`git://`、`file://` 和 `git@host:owner/repo.git` 克隆 URL。添加 `@<ref>` 或 `#<ref>` 在安装前检出分支、标签或提交。

    git 安装克隆到临时目录，存在请求的 ref 时检出它，然后使用正常的插件目录安装程序。这意味着清单验证、危险代码扫描、包管理器安装工作和安装记录的行为类似于 npm 安装。记录的 git 安装包括来源 URL/ref 加上解析的提交，以便 `openclaw plugins update` 以后可以重新解析来源。

    从 git 安装后，使用 `openclaw plugins inspect <id> --runtime --json` 验证运行时注册，如 gateway 方法和 CLI 命令。如果插件使用 `api.registerCli` 注册了 CLI 根，直接通过 OpenClaw 根 CLI 执行该命令，例如 `openclaw demo-plugin ping`。

  </Accordion>
  <Accordion title="存档">
    支持的存档：`.zip`、`.tgz`、`.tar.gz`、`.tar`。原生 OpenClaw 插件存档必须在提取的插件根目录中包含有效的 `openclaw.plugin.json`；仅包含 `package.json` 的存档在 OpenClaw 写入安装记录之前被拒绝。

    也支持 Claude 市场安装。

  </Accordion>
</AccordionGroup>

ClawHub 安装使用明确的 `clawhub:<package>` 定位器：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

裸 npm 安全的插件规范在发布切换期间默认从 npm 安装：

```bash
openclaw plugins install openclaw-codex-app-server
```

使用 `npm:` 使 npm 专用解析明确：

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw 在安装之前检查广告的插件 API / 最低 gateway 兼容性。当所选 ClawHub 版本发布 ClawPack 构件时，OpenClaw 下载版本化的 npm-pack `.tgz`，验证 ClawHub 摘要头和构件摘要，然后通过正常存档路径安装它。没有 ClawPack 元数据的旧 ClawHub 版本仍然通过遗留包存档验证路径安装。记录的安装保留其 ClawHub 来源元数据、构件类型、npm 完整性、npm shasum、tarball 名称和 ClawPack 摘要事实以供以后更新。
未版本化的 ClawHub 安装保留未版本化的记录规范，以便 `openclaw plugins update` 可以跟踪更新的 ClawHub 版本；明确的版本或标签选择器（如 `clawhub:pkg@1.2.3` 和 `clawhub:pkg@beta`）保持锁定到该选择器。

#### 市场简写

当市场名称存在于 Claude 的本地注册表缓存 `~/.claude/plugins/known_marketplaces.json` 中时，使用 `plugin@marketplace` 简写：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

当你想明确传递市场来源时使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

<Tabs>
  <Tab title="市场来源">
    - 来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知市场名称
    - 本地市场根目录或 `marketplace.json` 路径
    - GitHub 仓库简写，如 `owner/repo`
    - GitHub 仓库 URL，如 `https://github.com/owner/repo`
    - git URL

  </Tab>
  <Tab title="远程市场规则">
    对于从 GitHub 或 git 加载的远程市场，插件条目必须保留在克隆的市场仓库内。OpenClaw 接受来自该仓库的相对路径来源，并拒绝来自远程清单的 HTTP(S)、绝对路径、git、GitHub 和其他非路径插件来源。
  </Tab>
</Tabs>

对于本地路径和存档，OpenClaw 自动检测：

- 原生 OpenClaw 插件（`openclaw.plugin.json`）
- Codex 兼容包（`.codex-plugin/plugin.json`）
- Claude 兼容包（`.claude-plugin/plugin.json` 或默认 Claude 组件布局）
- Cursor 兼容包（`.cursor-plugin/plugin.json`）

<Note>
兼容包安装到正常的插件根目录，并参与相同的列表/信息/启用/禁用流程。目前，支持包技能、Claude 命令技能、Claude `settings.json` 默认值、Claude `.lsp.json` / 清单声明的 `lspServers` 默认值、Cursor 命令技能和兼容的 Codex hook 目录；其他检测到的包功能在诊断/信息中显示，但尚未连接到运行时执行。
</Note>

### 列出

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search <query>
openclaw plugins search <query> --limit 20
openclaw plugins search <query> --json
```

<ParamField path="--enabled" type="boolean">
  仅显示已启用的插件。
</ParamField>
<ParamField path="--verbose" type="boolean">
  从表格视图切换到每插件详情行，包含来源/版本/激活元数据。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读的清单加上注册表诊断和包依赖项安装状态。
</ParamField>

<Note>
`plugins list` 首先读取持久化的本地插件注册表，当注册表缺失或无效时有清单派生的回退。它对于检查插件是否已安装、启用和对冷启动计划可见很有用，但它不是对已运行 Gateway 进程的实时运行时探测。更改插件代码、启用状态、hook 策略或 `plugins.load.paths` 后，在期望新的 `register(api)` 代码或 hook 运行之前，重新启动服务该频道的 Gateway。对于远程/容器部署，验证你正在重新启动实际的 `openclaw gateway run` 子进程，而不仅仅是包装器进程。

`plugins list --json` 包含每个插件来自 `package.json` `dependencies` 和 `optionalDependencies` 的 `dependencyStatus`。OpenClaw 检查这些包名是否沿插件的正常 Node `node_modules` 查找路径存在；它不导入插件运行时代码、运行包管理器或修复缺失的依赖项。
</Note>

`plugins search` 是远程 ClawHub 目录查找。它不检查本地状态、变更配置、安装包或加载插件运行时代码。搜索结果包括 ClawHub 包名、家族、频道、版本、摘要和安装提示，如 `openclaw plugins install clawhub:<package>`。

对于打包的 Docker 镜像内的捆绑插件工作，将插件来源目录绑定挂载到匹配的打包来源路径上，如 `/app/extensions/synology-chat`。OpenClaw 将在 `/app/dist/extensions/synology-chat` 之前发现该挂载的来源覆盖；纯复制的来源目录保持不活跃，因此正常打包的安装仍然使用编译的 dist。

对于运行时 hook 调试：

- `openclaw plugins inspect <id> --runtime --json` 显示来自模块加载检查过程的已注册 hook 和诊断。运行时检查从不安装依赖项；使用 `openclaw doctor --fix` 清理遗留依赖项状态或安装缺失的已配置可下载插件。
- `openclaw gateway status --deep --require-rpc` 确认可达的 Gateway、服务/进程提示、配置路径和 RPC 健康状况。
- 非捆绑的对话 hook（`llm_input`、`llm_output`、`before_agent_finalize`、`agent_end`）需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。

使用 `--link` 避免复制本地目录（添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

<Note>
`--force` 不支持 `--link`，因为链接安装重用来源路径而不是复制到托管的安装目标。

在 npm 安装上使用 `--pin` 以在托管的插件索引中保存解析的精确规范（`name@version`），同时保持默认行为未锁定。
</Note>

### 插件索引

插件安装元数据是机器管理的状态，不是用户配置。安装和更新将其写入活跃 OpenClaw 状态目录下的 `plugins/installs.json`。其顶层 `installRecords` 映射是安装元数据的持久来源，包括损坏或缺失插件清单的记录。`plugins` 数组是清单派生的冷注册表缓存。该文件包含禁止编辑警告，并由 `openclaw plugins update`、卸载、诊断和冷插件注册表使用。

当 OpenClaw 在配置中看到已发布的遗留 `plugins.installs` 记录时，它将它们移入插件索引并删除配置键；如果任一写入失败，则保留配置记录以避免丢失安装元数据。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 从 `plugins.entries`、持久化的插件索引、插件允许/拒绝列表条目和适用时的链接 `plugins.load.paths` 条目中删除插件记录。除非设置了 `--keep-files`，卸载还会在托管安装目录位于 OpenClaw 插件扩展根目录内时删除它。对于活跃的记忆插件，记忆槽重置为 `memory-core`。

<Note>
`--keep-config` 作为 `--keep-files` 的已弃用别名受支持。
</Note>

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新适用于托管插件索引中跟踪的插件安装和 `hooks.internal.installs` 中跟踪的 hook 包安装。

<AccordionGroup>
  <Accordion title="解析插件 ID 与 npm 规范">
    当你传递插件 ID 时，OpenClaw 重用该插件的记录安装规范。这意味着以前存储的 dist-tag（如 `@beta`）和精确锁定版本在以后的 `update <id>` 运行中继续使用。

    对于 npm 安装，你还可以传递带有 dist-tag 或精确版本的明确 npm 包规范。OpenClaw 将该包名解析回跟踪的插件记录，更新该已安装的插件，并记录新的 npm 规范以供未来基于 ID 的更新使用。

    传递不带版本或标签的 npm 包名也会解析回跟踪的插件记录。当插件被锁定到精确版本且你想将其移回注册表的默认发布线时使用此方法。

  </Accordion>
  <Accordion title="Beta 频道更新">
    `openclaw plugins update` 重用跟踪的插件规范，除非你传递新规范。`openclaw update` 额外知道活跃的 OpenClaw 更新频道：在 beta 频道上，默认线的 npm 和 ClawHub 插件记录首先尝试 `@beta`，如果不存在 beta 版本则回退到记录的默认/最新规范。精确版本和明确的标签保持锁定到该选择器。

  </Accordion>
  <Accordion title="版本检查和完整性漂移">
    在实时 npm 更新之前，OpenClaw 对照 npm 注册表元数据检查已安装的包版本。如果已安装的版本和记录的构件标识已经与解析的目标匹配，则跳过更新，不下载、重新安装或重写 `openclaw.json`。

    当存储的完整性哈希存在且获取的构件哈希更改时，OpenClaw 将其视为 npm 构件漂移。交互式 `openclaw plugins update` 命令打印预期和实际哈希，并在继续之前要求确认。非交互式更新助手除非调用者提供明确的继续策略，否则失败关闭。

  </Accordion>
  <Accordion title="更新时的 --dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 在 `plugins update` 上也作为插件更新期间内置危险代码扫描误报的应急覆盖可用。它仍然不绕过插件 `before_install` 策略阻止或扫描失败阻止，并且只适用于插件更新，不适用于 hook 包更新。
  </Accordion>
</AccordionGroup>

### 检查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
```

检查显示身份、加载状态、来源、清单功能、策略标志、诊断、安装元数据、包功能以及任何检测到的 MCP 或 LSP 服务器支持，默认不导入插件运行时。添加 `--runtime` 以加载插件模块并包括已注册的 hook、工具、命令、服务、gateway 方法和 HTTP 路由。运行时检查直接报告缺失的插件依赖项；安装和修复保留在 `openclaw plugins install`、`openclaw plugins update` 和 `openclaw doctor --fix` 中。

插件拥有的 CLI 命令作为根 `openclaw` 命令组安装。`inspect --runtime` 在 `cliCommands` 下显示命令后，作为 `openclaw <command> ...` 运行它；例如注册 `demo-git` 的插件可以通过 `openclaw demo-git ping` 验证。

每个插件根据其在运行时实际注册的内容分类：

- **plain-capability** — 一种功能类型（例如，仅提供商的插件）
- **hybrid-capability** — 多种功能类型（例如，文本 + 语音 + 图像）
- **hook-only** — 仅 hook，无功能或界面
- **non-capability** — 工具/命令/服务但无功能

有关功能模型的更多信息，请参阅[插件形状](/plugins/architecture#plugin-shapes)。

<Note>
`--json` 标志输出适合脚本和审计的机器可读报告。`inspect --all` 渲染带有形状、功能类型、兼容性通知、包功能和 hook 摘要列的全舰队表格。`info` 是 `inspect` 的别名。
</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` 报告插件加载错误、清单/发现诊断和兼容性通知。当一切正常时，它打印 `No plugin issues detected.`

如果已配置的插件在磁盘上存在但被加载器的路径安全检查阻止，配置会保留插件条目并将其报告为 `present but blocked`。修复前面的被阻止插件诊断，例如路径所有权或世界可写权限，而不是删除 `plugins.entries.<id>` 或 `plugins.allow` 配置。

对于模块形状失败，如缺失 `register`/`activate` 导出，使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新运行，以在诊断输出中包含紧凑的导出形状摘要。

### 注册表

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

本地插件注册表是 OpenClaw 持久化的已安装插件身份、启用状态、来源元数据和贡献所有权的冷读取模型。正常启动、提供商所有者查找、频道设置分类和插件清单可以在不导入插件运行时模块的情况下读取它。

使用 `plugins registry` 检查持久化的注册表是否存在、当前或过时。使用 `--refresh` 从持久化的插件索引、配置策略和清单/包元数据重建它。这是修复路径，不是运行时激活路径。

`openclaw doctor --fix` 还修复注册表相邻的托管 npm 漂移：如果托管插件 npm 根下的孤立或恢复的 `@openclaw/*` 包遮蔽了捆绑的插件，doctor 会删除该过时的包并重建注册表，以便启动对捆绑的清单进行验证。

<Warning>
`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` 是注册表读取失败的已弃用应急兼容开关。优先使用 `plugins registry --refresh` 或 `openclaw doctor --fix`；环境回退仅用于迁移推出期间的紧急启动恢复。
</Warning>

### 市场

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

市场列表接受本地市场路径、`marketplace.json` 路径、GitHub 简写（如 `owner/repo`）、GitHub 仓库 URL 或 git URL。`--json` 打印解析的来源标签以及解析的市场清单和插件条目。

## 相关

- [构建插件](/plugins/building-plugins)
- [CLI 参考](/cli)
- [社区插件](/plugins/community)
