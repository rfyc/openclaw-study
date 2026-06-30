---
summary: "OpenClaw 工具和插件概览：代理能做什么以及如何扩展它"
read_when:
  - 您想了解 OpenClaw 提供哪些工具
  - 您需要配置、允许或拒绝工具
  - 您在内置工具、技能和插件之间做决定
title: "工具和插件"
---

代理在生成文本之外做的一切都通过**工具**来实现。工具是代理读取文件、运行命令、浏览网页、发送消息以及与设备交互的方式。

## 工具、技能和插件

OpenClaw 有三个协同工作的层：

<Steps>
  <Step title="工具是代理调用的内容">
    工具是代理可以调用的带类型的函数（例如 `exec`、`browser`、`web_search`、`message`）。OpenClaw 附带一套**内置工具**，插件可以注册额外的工具。

    代理将工具视为发送给模型 API 的结构化函数定义。

  </Step>

  <Step title="技能教代理何时和如何使用工具">
    技能是注入到系统提示中的 Markdown 文件（`SKILL.md`）。技能为代理提供有效使用工具的上下文、约束和逐步指导。技能存在于您的工作区、共享文件夹中，或者随插件一起发布。

    [技能参考](/tools/skills) | [创建技能](/tools/creating-skills)

  </Step>

  <Step title="插件将一切打包在一起">
    插件是可以注册任意功能组合的包：频道、模型提供商、工具、技能、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、网络获取、网络搜索等。有些插件是**核心**（随 OpenClaw 一起发布），其他的是**外部**（由社区在 npm 上发布）。

    [安装和配置插件](/tools/plugin) | [构建您自己的插件](/plugins/building-plugins)

  </Step>
</Steps>

## 内置工具

这些工具随 OpenClaw 一起发布，无需安装任何插件即可使用：

| 工具                                       | 功能                                         | 页面                                                    |
| ------------------------------------------ | -------------------------------------------- | ------------------------------------------------------- |
| `exec` / `process`                         | 运行 shell 命令，管理后台进程                | [Exec](/tools/exec)，[Exec 批准](/tools/exec-approvals) |
| `code_execution`                           | 运行沙箱化的远程 Python 分析                 | [代码执行](/tools/code-execution)                       |
| `browser`                                  | 控制 Chromium 浏览器（导航、点击、截图）     | [浏览器](/tools/browser)                                |
| `web_search` / `x_search` / `web_fetch`    | 搜索网络、搜索 X 帖子、获取页面内容          | [Web](/tools/web)，[Web Fetch](/tools/web-fetch)        |
| `read` / `write` / `edit`                  | 工作区中的文件 I/O                           |                                                         |
| `apply_patch`                              | 多块文件补丁                                 | [Apply Patch](/tools/apply-patch)                       |
| `message`                                  | 跨所有频道发送消息                           | [代理发送](/tools/agent-send)                           |
| `canvas`                                   | 驱动节点 Canvas（呈现、评估、快照）          |                                                         |
| `nodes`                                    | 发现和定位配对设备                           |                                                         |
| `cron` / `gateway`                         | 管理计划作业；检查、修补、重启或更新 gateway |                                                         |
| `image` / `image_generate`                 | 分析或生成图像                               | [图像生成](/tools/image-generation)                     |
| `music_generate`                           | 生成音乐曲目                                 | [音乐生成](/tools/music-generation)                     |
| `video_generate`                           | 生成视频                                     | [视频生成](/tools/video-generation)                     |
| `tts`                                      | 一次性文本到语音转换                         | [TTS](/tools/tts)                                       |
| `sessions_*` / `subagents` / `agents_list` | 会话管理、状态和子代理编排                   | [子代理](/tools/subagents)                              |
| `session_status`                           | 轻量级 `/status` 风格的回读和会话模型覆盖    | [会话工具](/concepts/session-tool)                      |

对于图像工作，使用 `image` 进行分析，使用 `image_generate` 进行生成或编辑。如果您的目标是 `openai/*`、`google/*`、`fal/*` 或其他非默认图像提供商，请先配置该提供商的身份验证/API 密钥。

对于音乐工作，使用 `music_generate`。如果您的目标是 `google/*`、`minimax/*` 或其他非默认音乐提供商，请先配置该提供商的身份验证/API 密钥。

对于视频工作，使用 `video_generate`。如果您的目标是 `qwen/*` 或其他非默认视频提供商，请先配置该提供商的身份验证/API 密钥。

对于工作流驱动的音频生成，当 ComfyUI 等插件注册它时，使用 `music_generate`。这与 `tts`（文本到语音）是分开的。

`session_status` 是会话组中的轻量级状态/回读工具。它回答关于当前会话的 `/status` 风格的问题，并且可以选择性地设置每会话的模型覆盖；`model=default` 清除该覆盖。与 `/status` 一样，它可以从最新的转录使用条目中回填稀疏的令牌/缓存计数器和活动运行时模型标签。

`gateway` 是 gateway 操作的仅所有者运行时工具：

- `config.schema.lookup` 用于编辑之前一个路径范围内的配置子树
- `config.get` 用于当前配置快照 + 哈希
- `config.patch` 用于带重启的部分配置更新
- `config.apply` 仅用于完整配置替换

对于部分更改，优先使用 `config.schema.lookup` 然后 `config.patch`。仅当您有意替换整个配置时才使用 `config.apply`。有关更广泛的配置文档，请阅读 [配置](/gateway/configuration) 和 [配置参考](/gateway/configuration-reference)。该工具还拒绝更改 `tools.exec.ask` 或 `tools.exec.security`；旧版 `tools.bash.*` 别名规范化为相同的受保护 exec 路径。

### 插件提供的工具

插件可以注册额外的工具。一些示例：

- [Diffs](/tools/diffs) — 差异查看器和渲染器
- [LLM Task](/tools/llm-task) — 用于结构化输出的仅 JSON LLM 步骤
- [Lobster](/tools/lobster) — 带可恢复批准的带类型工作流运行时
- [Music Generation](/tools/music-generation) — 带工作流支持的提供商的共享 `music_generate` 工具
- [OpenProse](/prose) — Markdown 优先的工作流编排
- [Tokenjuice](/tools/tokenjuice) — 压缩嘈杂的 `exec` 和 `bash` 工具结果

插件工具仍然使用 `api.registerTool(...)` 创作并在插件清单的 `contracts.tools` 列表中声明。OpenClaw 在发现过程中捕获经过验证的工具描述符并按插件来源和合约缓存它，因此后续的工具规划可以跳过插件运行时加载。工具执行仍然加载拥有该工具的插件并调用实时注册的实现。

## 工具配置

### 允许和拒绝列表

通过配置中的 `tools.allow` / `tools.deny` 控制代理可以调用哪些工具。拒绝总是优先于允许。

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

当显式允许列表解析为没有可调用工具时，OpenClaw 以失败关闭。例如，`tools.allow: ["query_db"]` 仅在已加载的插件实际注册了 `query_db` 时才有效。如果没有内置、插件或捆绑的 MCP 工具匹配允许列表，运行在模型调用之前停止，而不是作为可能会幻觉工具结果的仅文本运行继续。

### 工具配置文件

`tools.profile` 在应用 `allow`/`deny` 之前设置基础允许列表。每代理覆盖：`agents.list[].tools.profile`。

| 配置文件    | 包含内容                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`      | 所有核心和可选插件工具；用于更广泛命令/控制访问的无限制基准                                                                                       |
| `coding`    | `group:fs`、`group:runtime`、`group:web`、`group:sessions`、`group:memory`、`cron`、`image`、`image_generate`、`music_generate`、`video_generate` |
| `messaging` | `group:messaging`、`sessions_list`、`sessions_history`、`sessions_send`、`session_status`                                                         |
| `minimal`   | 仅 `session_status`                                                                                                                               |

<Note>
`tools.profile: "messaging"` 对于以频道为中心的代理有意较窄。它省略了更广泛的命令/控制工具，如文件系统、运行时、浏览器、canvas、节点、cron 和 gateway 控制。使用 `tools.profile: "full"` 作为更广泛命令/控制访问的无限制基准，然后在需要时使用 `tools.allow` / `tools.deny` 修剪访问权限。
</Note>

`coding` 包含轻量级 web 工具（`web_search`、`web_fetch`、`x_search`），但不包含完整的浏览器控制工具。浏览器自动化可以驱动真实会话和已登录的配置文件，因此使用 `tools.alsoAllow: ["browser"]` 或每代理 `agents.list[].tools.alsoAllow: ["browser"]` 显式添加它。

<Note>
在限制性配置文件（`messaging`、`minimal`）下配置 `tools.exec` 或 `tools.fs` 不会隐式扩大配置文件的允许列表。当您希望限制性配置文件使用这些配置部分时，请添加显式的 `tools.alsoAllow` 条目（例如，exec 的 `["exec", "process"]`，或 fs 的 `["read", "write", "edit"]`）。当配置部分存在但没有匹配的 `alsoAllow` 授权时，OpenClaw 记录启动警告。
</Note>

`coding` 和 `messaging` 配置文件还允许插件键 `bundle-mcp` 下配置的捆绑 MCP 工具。当您希望配置文件保留其正常内置工具但隐藏所有配置的 MCP 工具时，请添加 `tools.deny: ["bundle-mcp"]`。`minimal` 配置文件不包含捆绑的 MCP 工具。

示例（默认情况下最广泛的工具界面）：

```json5
{
  tools: {
    profile: "full",
  },
}
```

### 工具组

在允许/拒绝列表中使用 `group:*` 缩写：

| 组                 | 工具                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec、process、code_execution（`bash` 作为 `exec` 的别名被接受）                                          |
| `group:fs`         | read、write、edit、apply_patch                                                                            |
| `group:sessions`   | sessions_list、sessions_history、sessions_send、sessions_spawn、sessions_yield、subagents、session_status |
| `group:memory`     | memory_search、memory_get                                                                                 |
| `group:web`        | web_search、x_search、web_fetch                                                                           |
| `group:ui`         | browser、canvas                                                                                           |
| `group:automation` | cron、gateway                                                                                             |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:agents`     | agents_list                                                                                               |
| `group:media`      | image、image_generate、music_generate、video_generate、tts                                                |
| `group:openclaw`   | 所有内置 OpenClaw 工具（不包括插件工具）                                                                  |

`sessions_history` 返回有界的、经过安全过滤的回顾视图。它从助手文本中过滤思考标签、`<relevant-memories>` 脚手架、纯文本工具调用 XML 有效载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截断的工具调用块）、降级的工具调用脚手架、泄漏的 ASCII/全角模型控制令牌以及格式错误的 MiniMax 工具调用 XML，然后应用编辑/截断和可能的超大行占位符，而不是作为原始转录转储。

### 特定于提供商的限制

使用 `tools.byProvider` 为特定提供商限制工具，而不改变全局默认值：

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
    },
  },
}
```
