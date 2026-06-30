---
summary: "为 Codex 模式 OpenClaw agent 设置 Codex Computer Use"
title: "Codex Computer Use"
read_when:
  - 你希望 Codex 模式 OpenClaw agent 使用 Codex Computer Use
  - 你正在 Codex Computer Use、PeekabooBridge 和直接 cua-driver MCP 之间做决定
  - 你正在 Codex Computer Use 和直接 cua-driver MCP 设置之间做决定
  - 你正在为捆绑 Codex 插件配置 computerUse
  - 你正在排查 /codex computer-use status 或 install 问题
---

Computer Use 是用于本地桌面控制的 Codex 原生 MCP 插件。OpenClaw 不自行提供桌面应用、执行桌面操作或绕过 Codex 权限。捆绑的 `codex` 插件只负责准备 Codex app-server：启用 Codex 插件支持，查找或安装配置的 Codex Computer Use 插件，检查 `computer-use` MCP 服务器是否可用，然后让 Codex 在 Codex 模式轮次中拥有原生 MCP 工具调用。

当 OpenClaw 已经在使用原生 Codex 线束时使用此页面。有关运行时设置本身，请参见 [Codex 线束](/plugins/codex-harness)。

## OpenClaw.app 和 Peekaboo

OpenClaw.app 的 Peekaboo 集成与 Codex Computer Use 是分开的。macOS 应用可以托管一个 PeekabooBridge 套接字，以便 `peekaboo` CLI 可以为 Peekaboo 自己的自动化工具复用应用的本地辅助功能和屏幕录制授权。该桥接不安装或代理 Codex Computer Use，Codex Computer Use 也不通过 PeekabooBridge 套接字调用。

当你希望 OpenClaw.app 成为 Peekaboo CLI 自动化的权限感知宿主时，使用 [Peekaboo 桥接](/platforms/mac/peekaboo)。当 Codex 模式 OpenClaw agent 应在轮次开始前具备 Codex 原生 `computer-use` MCP 插件时，使用本页面。

## iOS 应用

iOS 应用与 Codex Computer Use 是分开的。它不安装或代理 Codex `computer-use` MCP 服务器，也不是桌面控制后端。相反，iOS 应用作为 OpenClaw 节点连接，并通过节点命令（如 `canvas.*`、`camera.*`、`screen.*`、`location.*` 和 `talk.*`）暴露移动功能。

当你希望 agent 通过 Gateway 驱动 iPhone 节点时，使用 [iOS](/platforms/ios)。当 Codex 模式 agent 应通过 Codex 的原生 Computer Use 插件控制本地 macOS 桌面时，使用本页面。

## 直接 cua-driver MCP

Codex Computer Use 并非暴露桌面控制的唯一方式。如果你希望 OpenClaw 管理的运行时直接调用 TryCua 的驱动程序，请通过 OpenClaw 的 MCP 注册表使用上游 `cua-driver mcp` 服务器，而非 Codex 特定的市场流程。

安装 `cua-driver` 后，要么请求其提供 OpenClaw 命令：

```bash
cua-driver mcp-config --client openclaw
```

要么自行注册 stdio 服务器：

```bash
openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'
```

该路径保持上游 MCP 工具接口完整，包括驱动程序模式和结构化 MCP 响应。当你希望 CUA 驱动程序作为普通 OpenClaw MCP 服务器可用时使用它。当 Codex app-server 应拥有插件安装、MCP 重载和 Codex 模式轮次中的原生工具调用时，使用本页面上的 Codex Computer Use 设置。

CUA 的驱动程序是 macOS 特定的，仍需要其应用提示的本地 macOS 权限，例如辅助功能和屏幕录制。OpenClaw 不安装 `cua-driver`、授予这些权限或绕过上游驱动程序的安全模型。

## 快速设置

当 Codex 模式轮次必须在线程开始前具备 Computer Use 时，设置 `plugins.entries.codex.config.computerUse`：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          computerUse: {
            autoInstall: true,
          },
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
      },
    },
  },
}
```

使用此配置，OpenClaw 在每次 Codex 模式轮次之前检查 Codex app-server。如果 Computer Use 缺失但 Codex app-server 已经发现了可安装的市场，OpenClaw 会要求 Codex app-server 安装或重新启用插件并重新加载 MCP 服务器。在 macOS 上，当没有匹配的市场已注册且标准 Codex 应用包存在时，OpenClaw 还会尝试在失败之前从 `/Applications/Codex.app/Contents/Resources/plugins/openai-bundled` 注册捆绑的 Codex 市场。如果设置仍无法使 MCP 服务器可用，轮次在线程开始之前失败。

现有会话保持其运行时和 Codex 线程绑定。更改 `agentRuntime` 或 Computer Use 配置后，在测试之前在受影响的聊天中使用 `/new` 或 `/reset`。

## 命令

在 `codex` 插件命令接口可用的任何聊天接口中使用 `/codex computer-use` 命令。这些是 OpenClaw 聊天/运行时命令，而非 `openclaw codex ...` CLI 子命令：

```text
/codex computer-use status
/codex computer-use install
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
/codex computer-use install --marketplace <name>
```

`status` 是只读的。它不添加市场来源、安装插件或启用 Codex 插件支持。

`install` 启用 Codex app-server 插件支持，可选地添加已配置的市场来源，通过 Codex app-server 安装或重新启用已配置的插件，重新加载 MCP 服务器，并验证 MCP 服务器是否暴露工具。

## 市场选择

OpenClaw 使用 Codex 自身暴露的相同 app-server API。市场字段选择 Codex 应在哪里找到 `computer-use`。

| 字段                | 使用场景                                       | 安装支持                                       |
| ------------------- | ---------------------------------------------- | ---------------------------------------------- |
| 无市场字段          | 你希望 Codex app-server 使用它已知的市场。     | 是，当 app-server 返回本地市场时。             |
| `marketplaceSource` | 你有一个 Codex 市场来源，app-server 可以添加。 | 是，用于明确的 `/codex computer-use install`。 |
| `marketplacePath`   | 你已经知道宿主上的本地市场文件路径。           | 是，用于明确安装和轮次开始时的自动安装。       |
| `marketplaceName`   | 你想通过名称选择一个已注册的市场。             | 仅当所选市场有本地路径时。                     |

新鲜的 Codex 主目录可能需要短暂时间来播种其官方市场。在安装期间，OpenClaw 最多等待 `marketplaceDiscoveryTimeoutMs` 毫秒轮询 `plugin/list`。默认值为 60 秒。

如果多个已知市场包含 Computer Use，OpenClaw 优先使用 `openai-bundled`，然后是 `openai-curated`，然后是 `local`。未知的歧义匹配失败关闭，并要求你设置 `marketplaceName` 或 `marketplacePath`。

## 捆绑的 macOS 市场

最近的 Codex 桌面版本在此捆绑了 Computer Use：

```text
/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/computer-use
```

当 `computerUse.autoInstall` 为 true 且没有包含 `computer-use` 的市场已注册时，OpenClaw 尝试自动添加标准捆绑市场根：

```text
/Applications/Codex.app/Contents/Resources/plugins/openai-bundled
```

你也可以使用 Codex 从 shell 显式注册它：

```bash
codex plugin marketplace add /Applications/Codex.app/Contents/Resources/plugins/openai-bundled
```

如果你使用非标准 Codex 应用路径，将 `computerUse.marketplacePath` 设置为本地市场文件路径，或运行一次 `/codex computer-use install --source <marketplace-source>`。

## 远程目录限制

Codex app-server 可以列出和读取仅远程目录条目，但目前不支持远程 `plugin/install`。这意味着 `marketplaceName` 可以选择仅远程市场进行状态检查，但安装和重新启用仍需要通过 `marketplaceSource` 或 `marketplacePath` 的本地市场。

如果状态显示插件在远程 Codex 市场中可用但不支持远程安装，请使用本地来源或路径运行安装：

```text
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
```

## 配置参考

| 字段                            | 默认值         | 含义                                                             |
| ------------------------------- | -------------- | ---------------------------------------------------------------- |
| `enabled`                       | 推断           | 需要 Computer Use。当设置了其他 Computer Use 字段时默认为 true。 |
| `autoInstall`                   | false          | 在轮次开始时从已发现的市场安装或重新启用。                       |
| `marketplaceDiscoveryTimeoutMs` | 60000          | 安装等待 Codex app-server 市场发现的时间。                       |
| `marketplaceSource`             | 未设置         | 传递给 Codex app-server `marketplace/add` 的来源字符串。         |
| `marketplacePath`               | 未设置         | 包含插件的本地 Codex 市场文件路径。                              |
| `marketplaceName`               | 未设置         | 要选择的已注册 Codex 市场名称。                                  |
| `pluginName`                    | `computer-use` | Codex 市场插件名称。                                             |
| `mcpServerName`                 | `computer-use` | 已安装插件暴露的 MCP 服务器名称。                                |

轮次开始时的自动安装有意拒绝已配置的 `marketplaceSource` 值。添加新来源是一个明确的设置操作，因此先运行一次 `/codex computer-use install --source <marketplace-source>`，然后让 `autoInstall` 处理从已发现的本地市场进行的未来重新启用。轮次开始时的自动安装可以使用已配置的 `marketplacePath`，因为这已经是宿主上的本地路径。

## OpenClaw 检查的内容

OpenClaw 在内部报告稳定的设置原因，并为聊天格式化面向用户的状态：

| 原因                         | 含义                                     | 下一步                                          |
| ---------------------------- | ---------------------------------------- | ----------------------------------------------- |
| `disabled`                   | `computerUse.enabled` 解析为 false。     | 设置 `enabled` 或其他 Computer Use 字段。       |
| `marketplace_missing`        | 没有匹配的市场可用。                     | 配置来源、路径或市场名称。                      |
| `plugin_not_installed`       | 市场存在，但插件未安装。                 | 运行安装或启用 `autoInstall`。                  |
| `plugin_disabled`            | 插件已安装但在 Codex 配置中被禁用。      | 运行安装以重新启用它。                          |
| `remote_install_unsupported` | 所选市场仅限远程。                       | 使用 `marketplaceSource` 或 `marketplacePath`。 |
| `mcp_missing`                | 插件已启用，但 MCP 服务器不可用。        | 检查 Codex Computer Use 和 OS 权限。            |
| `ready`                      | 插件和 MCP 工具可用。                    | 开始 Codex 模式轮次。                           |
| `check_failed`               | 状态检查期间 Codex app-server 请求失败。 | 检查 app-server 连接和日志。                    |
| `auto_install_blocked`       | 轮次开始时的设置需要添加新来源。         | 先运行明确安装。                                |

聊天输出包括插件状态、MCP 服务器状态、市场、工具（可用时）以及失败设置步骤的具体消息。

## macOS 权限

Computer Use 是 macOS 特定的。Codex 拥有的 MCP 服务器在检查或控制应用之前可能需要本地 OS 权限。如果 OpenClaw 报告 Computer Use 已安装但 MCP 服务器不可用，请先验证 Codex 端的 Computer Use 设置：

- Codex app-server 在应进行桌面控制的同一宿主上运行。
- Computer Use 插件在 Codex 配置中已启用。
- `computer-use` MCP 服务器出现在 Codex app-server MCP 状态中。
- macOS 已为桌面控制应用授予所需权限。
- 当前宿主会话可以访问被控制的桌面。

当 `computerUse.enabled` 为 true 时，OpenClaw 有意失败关闭。Codex 模式轮次不应在没有配置所需的原生桌面工具的情况下静默继续。

## 故障排除

**状态显示未安装。** 运行 `/codex computer-use install`。如果市场未被发现，传递 `--source` 或 `--marketplace-path`。

**状态显示已安装但被禁用。** 再次运行 `/codex computer-use install`。Codex app-server 安装将插件配置写回为已启用。

**状态显示不支持远程安装。** 使用本地市场来源或路径。仅远程目录条目可以通过当前 app-server API 检查但无法安装。

**状态显示 MCP 服务器不可用。** 重新运行一次安装以便 MCP 服务器重新加载。如果仍不可用，修复 Codex Computer Use 应用、Codex app-server MCP 状态或 macOS 权限。

**状态或探测在 `computer-use.list_apps` 上超时。** 插件和 MCP 服务器存在，但本地 Computer Use 桥接没有响应。退出或重启 Codex Computer Use，如有需要重新启动 Codex Desktop，然后在新的 OpenClaw 会话中重试。

**Computer Use 工具显示 `Native hook relay unavailable`。** Codex 原生工具钩子无法通过本地桥接或 Gateway 回退到达活跃的 OpenClaw 中继。使用 `/new` 或 `/reset` 开始新的 OpenClaw 会话。如果持续发生，重启 Gateway 以删除旧的 app-server 线程和钩子注册，然后重试。

**轮次开始时的自动安装拒绝来源。** 这是有意为之。先通过明确的 `/codex computer-use install --source <marketplace-source>` 添加来源，然后未来轮次开始时的自动安装可以使用已发现的本地市场。
