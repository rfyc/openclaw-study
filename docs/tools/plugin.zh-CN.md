---
summary: "安装、配置和管理 OpenClaw 插件"
read_when:
  - 安装或配置插件
  - 了解插件发现和加载规则
  - 使用 Codex/Claude 兼容插件包
title: "插件"
sidebarTitle: "安装与配置"
---

插件为 OpenClaw 扩展了新的能力：频道、模型提供商、代理框架、工具、技能、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、web 抓取、web 搜索等。部分插件是**核心插件**（随 OpenClaw 一起发布），其他是**外部插件**。大多数外部插件通过 [ClawHub](/tools/clawhub) 发布和发现。Npm 仍然支持直接安装和在迁移完成之前的一组 OpenClaw 自有插件包。

## 快速开始

关于复制粘贴安装、列出、卸载、更新和发布示例，请参阅[管理插件](/plugins/manage-plugins)。

<Steps>
  <Step title="查看已加载内容">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="安装插件">
    ```bash
    # 搜索 ClawHub 插件
    openclaw plugins search "calendar"

    # 从 ClawHub
    openclaw plugins install clawhub:openclaw-codex-app-server

    # 从 npm
    openclaw plugins install npm:@acme/openclaw-plugin

    # 从 git
    openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0

    # 从本地目录或压缩包
    openclaw plugins install ./my-plugin
    openclaw plugins install ./my-plugin.tgz
    ```

  </Step>

  <Step title="重启网关">
    ```bash
    openclaw gateway restart
    ```

    然后在配置文件的 `plugins.entries.\<id\>.config` 下进行配置。

  </Step>

  <Step title="聊天原生管理">
    在运行的网关中，仅所有者可用的 `/plugins enable` 和 `/plugins disable` 会触发网关配置重新加载。网关在进程中重新加载插件运行时表面，新的代理轮次会从刷新的注册表重建工具列表。`/plugins install` 会更改插件源代码，因此网关会请求重启，而不是假装当前进程可以安全地重新加载已导入的模块。

  </Step>

  <Step title="验证插件">
    ```bash
    openclaw plugins inspect <plugin-id> --runtime --json

    # 如果插件注册了 CLI 根命令，从该根命令运行一个命令。
    openclaw <plugin-command> --help
    ```

    当你需要证明已注册的工具、服务、网关方法、钩子或插件自有 CLI 命令时，使用 `--runtime`。普通的 `inspect` 是冷的清单/注册表检查，有意避免导入插件运行时。

  </Step>
</Steps>

如果你更喜欢聊天原生控制，启用 `commands.plugins: true` 并使用：

```text
/plugin install clawhub:<package>
/plugin show <plugin-id>
/plugin enable <plugin-id>
```

安装路径使用与 CLI 相同的解析器：本地路径/压缩包、显式 `clawhub:<pkg>`、显式 `npm:<pkg>`、显式 `git:<repo>`，或通过 npm 的裸包规范。

如果配置无效，安装通常会失败关闭并指向 `openclaw doctor --fix`。唯一的恢复例外是选择加入 `openclaw.install.allowInvalidConfigRecovery` 的插件的窄捆绑插件重新安装路径。在网关启动期间，无效的插件配置会像任何其他无效配置一样失败关闭。运行 `openclaw doctor --fix` 通过禁用该插件条目并移除其无效配置负载来隔离坏的插件配置；正常的配置备份会保留之前的值。当频道配置引用一个不再可发现但相同的陈旧插件 id 仍在插件配置或安装记录中时，网关启动会记录警告并跳过该频道而不阻止其他所有频道。运行 `openclaw doctor --fix` 删除陈旧的频道/插件条目；没有陈旧插件证据的未知频道键仍然会验证失败，以便拼写错误保持可见。如果设置了 `plugins.enabled: false`，陈旧的插件引用会被视为惰性：网关启动会跳过插件发现/加载工作，`openclaw doctor` 会保留禁用的插件配置而不是自动删除。如果你希望删除陈旧的插件 id，请在运行 doctor 清理之前重新启用插件。

插件依赖项安装仅在显式安装/更新或 doctor 修复流程中发生。网关启动、配置重新加载和运行时检查不会运行包管理器或修复依赖树。本地插件必须已经安装了其依赖项，而 npm、git 和 ClawHub 插件安装在 OpenClaw 管理的插件根下。npm 依赖项可能在 OpenClaw 管理的 npm 根中被提升；安装/更新会在信任之前扫描该管理根，卸载会通过 npm 删除 npm 管理的包。外部插件和自定义加载路径仍然必须通过 `openclaw plugins install` 安装。使用 `openclaw plugins list --json` 查看每个可见插件的静态 `dependencyStatus`，而无需导入运行时代码或修复依赖项。请参阅[插件依赖解析](/plugins/dependency-resolution)获取安装时生命周期。

对于 npm 安装，可变的选择器（如 `latest` 或 dist-tag）在安装之前会被解析，然后固定到 OpenClaw 管理的 npm 根中已验证的确切版本。npm 完成后，OpenClaw 会验证安装的 `package-lock.json` 条目是否仍与已解析的版本和完整性匹配。如果 npm 写入不同的包元数据，安装会失败，管理的包会回滚，而不是接受不同的插件工件。

源码检出是 pnpm 工作区。如果你克隆 OpenClaw 来修改捆绑的插件，运行 `pnpm install`；OpenClaw 然后从 `extensions/<id>` 加载捆绑的插件，以便直接使用编辑和包本地依赖项。普通的 npm 根安装适用于打包的 OpenClaw，而不是源码检出开发。

## 插件类型

OpenClaw 识别两种插件格式：

| 格式     | 工作原理                                           | 示例                                                   |
| -------- | -------------------------------------------------- | ------------------------------------------------------ |
| **原生** | `openclaw.plugin.json` + 运行时模块；在进程中执行  | 官方插件、社区 npm 包                                  |
| **包**   | Codex/Claude/Cursor 兼容布局；映射到 OpenClaw 功能 | `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/` |

两者都出现在 `openclaw plugins list` 下。有关包详情，请参阅[插件包](/plugins/bundles)。

如果你在编写原生插件，请从[构建插件](/plugins/building-plugins)和[插件 SDK 概览](/plugins/sdk-overview)开始。

## 包入口点

原生插件 npm 包必须在 `package.json` 中声明 `openclaw.extensions`。每个条目必须保持在包目录内，并解析为可读的运行时文件，或解析为带有推断的构建 JavaScript 对等文件（如 `src/index.ts` 到 `dist/index.js`）的 TypeScript 源文件。打包安装必须附带该 JavaScript 运行时输出。TypeScript 源回退适用于源码检出和本地开发路径，而不是安装到 OpenClaw 管理插件根的 npm 包。

当发布的运行时文件不在与源条目相同的路径时，使用 `openclaw.runtimeExtensions`。当存在时，`runtimeExtensions` 必须为每个 `extensions` 条目包含恰好一个条目。列表不匹配会导致安装和插件发现失败，而不是悄默地回退到源路径。如果你还发布了 `openclaw.setupEntry`，则使用 `openclaw.runtimeSetupEntry` 作为其构建的 JavaScript 对等文件；声明时该文件是必需的。

```json
{
  "name": "@acme/openclaw-plugin",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"]
  }
}
```

## 官方插件

### 迁移期间 OpenClaw 自有的 npm 包

ClawHub 是大多数插件的主要发布路径。当前打包的 OpenClaw 版本已经捆绑了许多官方插件，因此在正常设置中不需要单独的 npm 安装。在每个 OpenClaw 自有的插件迁移到 ClawHub 之前，OpenClaw 仍然为旧版/自定义安装和直接 npm 工作流在 npm 上发布一些 `@openclaw/*` 插件包。

如果 npm 将 `@openclaw/*` 插件包报告为已弃用，该包版本来自旧版的外部包列车。在发布更新的 npm 包之前，使用当前 OpenClaw 的捆绑插件或本地检出。

| 插件            | 包                         | 文档                                       |
| --------------- | -------------------------- | ------------------------------------------ |
| BlueBubbles     | `@openclaw/bluebubbles`    | [BlueBubbles](/channels/bluebubbles)       |
| Discord         | `@openclaw/discord`        | [Discord](/channels/discord)               |
| Feishu          | `@openclaw/feishu`         | [Feishu](/channels/feishu)                 |
| Matrix          | `@openclaw/matrix`         | [Matrix](/channels/matrix)                 |
| Mattermost      | `@openclaw/mattermost`     | [Mattermost](/channels/mattermost)         |
| Microsoft Teams | `@openclaw/msteams`        | [Microsoft Teams](/channels/msteams)       |
| Nextcloud Talk  | `@openclaw/nextcloud-talk` | [Nextcloud Talk](/channels/nextcloud-talk) |
| Nostr           | `@openclaw/nostr`          | [Nostr](/channels/nostr)                   |
| Synology Chat   | `@openclaw/synology-chat`  | [Synology Chat](/channels/synology-chat)   |
| Tlon            | `@openclaw/tlon`           | [Tlon](/channels/tlon)                     |
| WhatsApp        | `@openclaw/whatsapp`       | [WhatsApp](/channels/whatsapp)             |
| Zalo            | `@openclaw/zalo`           | [Zalo](/channels/zalo)                     |
| Zalo Personal   | `@openclaw/zalouser`       | [Zalo Personal](/plugins/zalouser)         |

### 核心（随 OpenClaw 发布）

<AccordionGroup>
  <Accordion title="模型提供商（默认启用）">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

  <Accordion title="内存插件">
    - `memory-core` — 捆绑的内存搜索（通过 `plugins.slots.memory` 默认使用）
    - `memory-lancedb` — 基于 LanceDB 的长期记忆，支持自动召回/捕获（设置 `plugins.slots.memory = "memory-lancedb"`）

    OpenAI 兼容嵌入设置、Ollama 示例、召回限制和故障排除请参阅 [Memory LanceDB](/plugins/memory-lancedb)。

  </Accordion>

  <Accordion title="语音提供商（默认启用）">
    `elevenlabs`, `microsoft`
  </Accordion>

  <Accordion title="其他">
    - `browser` — 用于浏览器工具、`openclaw browser` CLI、`browser.request` 网关方法、浏览器运行时和默认浏览器控制服务的捆绑浏览器插件（默认启用；在替换之前先禁用）
    - `copilot-proxy` — VS Code Copilot 代理桥（默认禁用）

  </Accordion>
</AccordionGroup>

寻找第三方插件？请参阅[社区插件](/plugins/community)。

## 配置

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

| 字段             | 描述                                           |
| ---------------- | ---------------------------------------------- |
| `enabled`        | 主开关（默认：`true`）                         |
| `allow`          | 插件白名单（可选）                             |
| `deny`           | 插件黑名单（可选；黑名单优先）                 |
| `load.paths`     | 额外的插件文件/目录                            |
| `slots`          | 独占槽选择器（例如 `memory`、`contextEngine`） |
| `entries.\<id\>` | 每插件开关 + 配置                              |

`plugins.allow` 是独占的。当它非空时，只有列出的插件才能加载或暴露工具，即使 `tools.allow` 包含 `"*"` 或特定的插件自有工具名称。如果工具白名单引用了插件工具，请将拥有的插件 id 添加到 `plugins.allow` 或删除 `plugins.allow`；`openclaw doctor` 会对此形状发出警告。

通过 `/plugins enable` 或 `/plugins disable` 进行的配置更改会触发进程内网关插件重载。新的代理轮次会从刷新的插件注册表重建工具列表。安装、更新和卸载等更改源的操作仍然会重启网关进程，因为已导入的插件模块不能安全地在原地替换。

`openclaw plugins list` 是本地插件注册表/配置快照。`enabled` 插件表示持久化注册表和当前配置允许插件参与。这并不证明已运行的远程网关已重新加载或重启到相同的插件代码。在具有包装进程的 VPS/容器设置中，向实际的 `openclaw gateway run` 进程发送重启或触发重新加载写入，或在重载报告失败时对运行的网关使用 `openclaw gateway restart`。

<Accordion title="插件状态：已禁用 vs 缺失 vs 无效">
  - **已禁用**：插件存在但启用规则将其关闭。配置被保留。
  - **缺失**：配置引用了发现未找到的插件 id。
  - **无效**：插件存在但其配置与声明的模式不匹配。网关启动仅跳过该插件；`openclaw doctor --fix` 可以通过禁用它并删除其配置负载来隔离无效条目。

</Accordion>

## 发现和优先级

OpenClaw 按以下顺序扫描插件（先找到的优先）：

<Steps>
  <Step title="配置路径">
    `plugins.load.paths` — 显式的文件或目录路径。指向 OpenClaw 自身打包的捆绑插件目录的路径会被忽略；运行 `openclaw doctor --fix` 删除这些陈旧的别名。
  </Step>

  <Step title="工作区插件">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` 和 `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="全局插件">
    `~/.openclaw/<plugin-root>/*.ts` 和 `~/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="捆绑插件">
    随 OpenClaw 发布。许多默认启用（模型提供商、语音）。其他需要显式启用。
  </Step>
</Steps>

打包安装和 Docker 镜像通常从编译的 `dist/extensions` 树解析捆绑的插件。如果捆绑的插件源目录挂载在匹配的打包源路径上，例如 `/app/extensions/synology-chat`，OpenClaw 会将该挂载的源目录视为捆绑的源覆盖，并在打包的 `/app/dist/extensions/synology-chat` 包之前发现它。这使维护者容器循环正常工作，而无需将每个捆绑的插件切换回 TypeScript 源。设置 `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS=1` 以强制使用打包的 dist 包，即使源覆盖挂载存在。

### 启用规则

- `plugins.enabled: false` 禁用所有插件并跳过插件发现/加载工作
- `plugins.deny` 总是优先于 allow
- `plugins.entries.\<id\>.enabled: false` 禁用该插件
- 工作区来源的插件**默认禁用**（必须显式启用）
- 捆绑的插件遵循内置的默认开启集，除非覆盖
- 独占槽可以强制启用该槽选择的插件
- 一些捆绑的可选插件在配置命名插件自有表面（如提供商模型引用、频道配置或框架运行时）时会自动启用
- 当 `plugins.enabled: false` 处于活跃状态时，陈旧的插件配置会被保留；如果你希望删除陈旧的 id，请在运行 doctor 清理之前重新启用插件
- OpenAI 系列 Codex 路由保持单独的插件边界：`openai-codex/*` 属于 OpenAI 插件，而捆绑的 Codex 应用服务器插件通过 `agentRuntime.id: "codex"` 或旧版 `codex/*` 模型引用选择

## 排查运行时钩子

如果插件出现在 `plugins list` 中但 `register(api)` 副作用或钩子在实时聊天流量中不运行，请先检查以下内容：

- 运行 `openclaw gateway status --deep --require-rpc` 并确认活跃的网关 URL、配置文件、配置路径和进程是你正在编辑的那些。
- 在插件安装/配置/代码更改后重启实时网关。在包装容器中，PID 1 可能只是一个监督者；重启或向子 `openclaw gateway run` 进程发送信号。
- 使用 `openclaw plugins inspect <id> --runtime --json` 确认钩子注册和诊断。非捆绑的会话钩子如 `llm_input`、`llm_output`、`before_agent_finalize` 和 `agent_end` 需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。
- 对于模型切换，优先使用 `before_model_resolve`。它在代理轮次的模型解析之前运行；`llm_output` 仅在模型尝试产生助手输出后运行。
- 对于有效会话模型的证明，使用 `openclaw sessions` 或网关会话/状态表面，在调试提供商负载时，使用 `--raw-stream --raw-stream-path <path>` 启动网关。

### 慢速插件工具设置

如果代理轮次在准备工具时似乎停滞，启用追踪日志并检查插件工具工厂计时行：

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

查找：

```text
[trace:plugin-tools] factory timings ...
```

摘要列出总工厂时间和最慢的插件工具工厂，包括插件 id、声明的工具名称、结果形状以及工具是否可选。当单个工厂至少需要 1s 或总插件工具工厂准备时间至少需要 5s 时，慢速行会升级为警告。

OpenClaw 为具有相同有效请求上下文的重复解析缓存成功的插件工具工厂结果。缓存键包括有效的运行时配置、工作区、代理/会话 id、沙箱策略、浏览器设置、交付上下文、请求者身份和所有权状态，因此当上下文更改时，依赖这些受信任字段的工厂会重新运行。

如果一个插件占据了计时的主导地位，检查其运行时注册：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

然后更新、重新安装或禁用该插件。插件作者应该将昂贵的依赖加载移动到工具执行路径之后，而不是在工具工厂内执行。

### 重复的频道或工具所有权

症状：

- `channel already registered: <channel-id> (<plugin-id>)`
- `channel setup already registered: <channel-id> (<plugin-id>)`
- `plugin tool name conflict (<plugin-id>): <tool-name>`

这意味着多个启用的插件在尝试拥有相同的频道、设置流程或工具名称。最常见的原因是外部频道插件安装在现在提供相同频道 id 的捆绑插件旁边。

调试步骤：

- 运行 `openclaw plugins list --enabled --verbose` 查看每个启用的插件及来源。
- 对每个可疑的插件运行 `openclaw plugins inspect <id> --runtime --json`，比较 `channels`、`channelConfigs`、`tools` 和诊断。
- 安装或删除插件包后运行 `openclaw plugins registry --refresh`，以便持久化元数据反映当前安装。
- 安装、注册表或配置更改后重启网关。

修复选项：

- 如果一个插件有意替换另一个插件的相同频道 id，首选的插件应该声明 `channelConfigs.<channel-id>.preferOver`，使用较低优先级的插件 id。请参阅 [/plugins/manifest#replacing-another-channel-plugin](/plugins/manifest#replacing-another-channel-plugin)。
- 如果重复是意外的，用 `plugins.entries.<plugin-id>.enabled: false` 禁用一侧或删除陈旧的插件安装。
- 如果你明确启用了两个插件，OpenClaw 会保留该请求并报告冲突。选择频道的一个所有者或重命名插件自有工具，使运行时表面明确无误。

## 插件槽（独占类别）

某些类别是独占的（一次只能有一个处于活跃状态）：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // 或 "none" 来禁用
      contextEngine: "legacy", // 或插件 id
    },
  },
}
```

| 槽              | 控制内容         | 默认             |
| --------------- | ---------------- | ---------------- |
| `memory`        | 活跃的内存插件   | `memory-core`    |
| `contextEngine` | 活跃的上下文引擎 | `legacy`（内置） |

## CLI 参考

```bash
openclaw plugins list                       # 紧凑清单
openclaw plugins list --enabled            # 仅启用的插件
openclaw plugins list --verbose            # 每插件详细行
openclaw plugins list --json               # 机器可读的清单
openclaw plugins search <query>            # 搜索 ClawHub 插件目录
openclaw plugins inspect <id>              # 静态详情
openclaw plugins inspect <id> --runtime    # 已注册的钩子/工具/CLI/网关方法
openclaw plugins inspect <id> --json       # 机器可读
openclaw plugins inspect --all             # 全面表格
openclaw plugins info <id>                 # inspect 别名
openclaw plugins doctor                    # 诊断
openclaw plugins registry                  # 检查持久化的注册表状态
openclaw plugins registry --refresh        # 重建持久化的注册表
openclaw doctor --fix                      # 修复插件注册表状态

openclaw plugins install <package>         # 默认从 npm 安装
openclaw plugins install clawhub:<pkg>     # 仅从 ClawHub 安装
openclaw plugins install npm:<pkg>         # 仅从 npm 安装
openclaw plugins install git:<repo>        # 从 git 安装
openclaw plugins install git:<repo>@<ref>  # 从 git ref 安装
openclaw plugins install <spec> --force    # 覆盖现有安装
openclaw plugins install <path>            # 从本地路径安装
openclaw plugins install -l <path>         # 链接（不复制）用于开发
openclaw plugins install <plugin> --marketplace <source>
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <spec> --pin      # 记录精确解析的 npm 规范
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id-or-npm-spec> # 更新一个插件
openclaw plugins update <id-or-npm-spec> --dangerously-force-unsafe-install
openclaw plugins update --all            # 更新所有插件
openclaw plugins uninstall <id>          # 删除配置和插件索引记录
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

# 安装后验证运行时注册。
openclaw plugins inspect <id> --runtime --json

# 直接从 OpenClaw 根 CLI 运行插件自有 CLI 命令。
openclaw <plugin-command> --help

openclaw plugins enable <id>
openclaw plugins disable <id>
```

捆绑的插件随 OpenClaw 一起发布。许多默认启用（例如捆绑的模型提供商、捆绑的语音提供商和捆绑的浏览器插件）。其他捆绑的插件仍需要 `openclaw plugins enable <id>`。

`--force` 会原地覆盖现有的已安装插件或钩子包。对于已追踪的 npm 插件的常规升级，使用 `openclaw plugins update <id-or-npm-spec>`。它不支持 `--link`，后者会复用源路径而不是覆盖管理的安装目标。

当已设置 `plugins.allow` 时，`openclaw plugins install` 会在启用之前将安装的插件 id 添加到白名单。如果相同的插件 id 存在于 `plugins.deny` 中，安装会删除该陈旧的拒绝条目，以便显式安装在重启后立即可加载。

OpenClaw 将持久化的本地插件注册表作为插件清单、贡献所有权和启动规划的冷读模型。安装、更新、卸载、启用和禁用流程在更改插件状态后刷新该注册表。相同的 `plugins/installs.json` 文件在顶级 `installRecords` 中保存持久的安装元数据，在 `plugins` 中保存可重建的清单元数据。如果注册表丢失、过时或无效，`openclaw plugins registry --refresh` 会从安装记录、配置策略和清单/包元数据重建其清单视图，而无需加载插件运行时模块。`openclaw plugins update <id-or-npm-spec>` 适用于已追踪的安装。传递带有 dist-tag 或确切版本的 npm 包规范会将包名解析回已追踪的插件记录并记录新规范供将来更新。传递不带版本的包名会将精确固定的安装移回注册表的默认发布线。如果安装的 npm 插件已经与解析的版本和记录的工件标识匹配，OpenClaw 会跳过更新而不下载、重新安装或重写配置。当 `openclaw update` 在 beta 频道上运行时，默认行的 npm 和 ClawHub 插件记录会先尝试 `@beta`，当没有插件 beta 版本时回退到默认/最新。精确版本和显式标签保持固定。

`--pin` 仅适用于 npm。它不支持 `--marketplace`，因为市场安装会持久化市场源元数据而不是 npm 规范。

`--dangerously-force-unsafe-install` 是对内置危险代码扫描器误报的紧急覆盖。它允许插件安装和插件更新继续通过内置的 `critical` 发现，但它仍然不绕过插件 `before_install` 策略阻止或扫描失败阻止。安装扫描会忽略常见的测试文件和目录，如 `tests/`、`__tests__/`、`*.test.*` 和 `*.spec.*`，以避免阻止打包的测试模拟；即使声明的插件运行时入口点使用其中一个名称，也仍然会被扫描。

此 CLI 标志仅适用于插件安装/更新流程。网关支持的技能依赖安装使用匹配的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍然是单独的 ClawHub 技能下载/安装流程。

如果你在 ClawHub 上发布的插件被隐藏或被扫描阻止，打开 ClawHub 控制台或运行 `clawhub package rescan <name>` 请求 ClawHub 再次检查它。`--dangerously-force-unsafe-install` 只影响你自己机器上的安装；它不会请求 ClawHub 重新扫描插件或使被阻止的版本公开。

兼容的包参与相同的插件列表/检查/启用/禁用流程。当前运行时支持包括包技能、Claude 命令技能、Claude `settings.json` 默认值、Claude `.lsp.json` 和清单声明的 `lspServers` 默认值、Cursor 命令技能和兼容的 Codex 钩子目录。

`openclaw plugins inspect <id>` 还报告检测到的包能力以及包支持的插件的支持或不支持的 MCP 和 LSP 服务器条目。

市场源可以是来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知市场名称、本地市场根或 `marketplace.json` 路径、GitHub 简写如 `owner/repo`、GitHub 仓库 URL 或 git URL。对于远程市场，插件条目必须保持在克隆的市场仓库内并仅使用相对路径源。

有关完整详情，请参阅 [`openclaw plugins` CLI 参考](/cli/plugins)。

## 插件 API 概览

原生插件导出一个暴露 `register(api)` 的入口对象。旧版插件可能仍然使用 `activate(api)` 作为旧版别名，但新插件应该使用 `register`。

```typescript
export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
    api.registerChannel({
      /* ... */
    });
  },
});
```

OpenClaw 加载入口对象并在插件激活期间调用 `register(api)`。加载器仍然回退到旧版插件的 `activate(api)`，但捆绑的插件和新的外部插件应将 `register` 视为公共合约。

`api.registrationMode` 告诉插件为什么要加载其入口：

| 模式            | 含义                                                                             |
| --------------- | -------------------------------------------------------------------------------- |
| `full`          | 运行时激活。注册工具、钩子、服务、命令、路由和其他实时副作用。                   |
| `discovery`     | 只读能力发现。注册提供商和元数据；可信的插件入口代码可能加载，但跳过实时副作用。 |
| `setup-only`    | 通过轻量级设置入口加载频道设置元数据。                                           |
| `setup-runtime` | 还需要运行时入口的频道设置加载。                                                 |
| `cli-metadata`  | 仅 CLI 命令元数据收集。                                                          |

打开套接字、数据库、后台工作者或长期客户端的插件入口应使用 `api.registrationMode === "full"` 保护这些副作用。发现加载与激活加载分开缓存，不替换正在运行的网关注册表。发现是非激活的，不是无导入的：OpenClaw 可能会评估受信任的插件入口或频道插件模块来构建快照。保持模块顶层轻量且无副作用，并将网络客户端、子进程、监听器、凭据读取和服务启动移到完整运行时路径之后。

常见的注册方法：

| 方法                                    | 注册内容            |
| --------------------------------------- | ------------------- |
| `registerProvider`                      | 模型提供商（LLM）   |
| `registerChannel`                       | 聊天频道            |
| `registerTool`                          | 代理工具            |
| `registerHook` / `on(...)`              | 生命周期钩子        |
| `registerSpeechProvider`                | 文字转语音 / STT    |
| `registerRealtimeTranscriptionProvider` | 流式 STT            |
| `registerRealtimeVoiceProvider`         | 双工实时语音        |
| `registerMediaUnderstandingProvider`    | 图像/音频分析       |
| `registerImageGenerationProvider`       | 图像生成            |
| `registerMusicGenerationProvider`       | 音乐生成            |
| `registerVideoGenerationProvider`       | 视频生成            |
| `registerWebFetchProvider`              | Web 抓取/爬取提供商 |
| `registerWebSearchProvider`             | Web 搜索            |
| `registerHttpRoute`                     | HTTP 端点           |
| `registerCommand` / `registerCli`       | CLI 命令            |
| `registerContextEngine`                 | 上下文引擎          |
| `registerService`                       | 后台服务            |

类型化生命周期钩子的钩子守卫行为：

- `before_tool_call`: `{ block: true }` 是终止的；低优先级处理器被跳过。
- `before_tool_call`: `{ block: false }` 是空操作，不会清除较早的阻止。
- `before_install`: `{ block: true }` 是终止的；低优先级处理器被跳过。
- `before_install`: `{ block: false }` 是空操作，不会清除较早的阻止。
- `message_sending`: `{ cancel: true }` 是终止的；低优先级处理器被跳过。
- `message_sending`: `{ cancel: false }` 是空操作，不会清除较早的取消。

原生 Codex 应用服务器将 Codex 原生工具事件桥接回该钩子表面。插件可以通过 `before_tool_call` 阻止原生 Codex 工具，通过 `after_tool_call` 观察结果，并参与 Codex `PermissionRequest` 审批。该桥接尚未重写 Codex 原生工具参数。确切的 Codex 运行时支持边界在 [Codex 框架 v1 支持合约](/plugins/codex-harness#v1-support-contract) 中。

有关完整类型化钩子行为，请参阅 [SDK 概览](/plugins/sdk-overview#hook-decision-semantics)。

## 相关链接

- [构建插件](/plugins/building-plugins) — 创建自己的插件
- [插件包](/plugins/bundles) — Codex/Claude/Cursor 包兼容性
- [插件清单](/plugins/manifest) — 清单模式
- [注册工具](/plugins/building-plugins#registering-agent-tools) — 在插件中添加代理工具
- [插件内部](/plugins/architecture) — 能力模型和加载管道
- [社区插件](/plugins/community) — 第三方列表
