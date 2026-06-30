---
summary: "将 Codex、Claude 和 Cursor 包作为 OpenClaw 插件安装和使用"
read_when:
  - 你想安装 Codex、Claude 或 Cursor 兼容包
  - 你需要了解 OpenClaw 如何将包内容映射到原生功能
  - 你正在调试包检测或缺失能力
title: "插件包"
---

OpenClaw 可以从三个外部生态系统安装插件：**Codex**、**Claude** 和 **Cursor**。这些被称为**包**——OpenClaw 将其内容和元数据映射到技能、钩子和 MCP 工具等原生功能的内容包。

<Info>
  包与原生 OpenClaw 插件**不同**。原生插件在进程内运行，可以注册任何能力。包是内容包，具有选择性功能映射和更窄的信任边界。
</Info>

## 包存在的原因

许多有用的插件以 Codex、Claude 或 Cursor 格式发布。OpenClaw 无需要求作者将它们重写为原生 OpenClaw 插件，而是检测这些格式并将其支持的内容映射到原生功能集。这意味着你可以安装 Claude 命令包或 Codex 技能包并立即使用。

## 安装包

<Steps>
  <Step title="从目录、存档或市场安装">
    ```bash
    # 本地目录
    openclaw plugins install ./my-bundle

    # 存档
    openclaw plugins install ./my-bundle.tgz

    # Claude 市场
    openclaw plugins marketplace list <marketplace-name>
    openclaw plugins install <plugin-name>@<marketplace-name>
    ```

  </Step>

  <Step title="验证检测">
    ```bash
    openclaw plugins list
    openclaw plugins inspect <id>
    ```

    包显示为 `Format: bundle`，子类型为 `codex`、`claude` 或 `cursor`。

  </Step>

  <Step title="重启并使用">
    ```bash
    openclaw gateway restart
    ```

    映射的功能（技能、钩子、MCP 工具、LSP 默认值）在下一个会话中可用。

  </Step>
</Steps>

## OpenClaw 从包中映射的内容

并非每个包功能今天都在 OpenClaw 中运行。以下是有效的内容和检测到但尚未连接的内容。

### 当前支持

| 功能       | 映射方式                                                                | 适用于         |
| ---------- | ----------------------------------------------------------------------- | -------------- |
| 技能内容   | 包技能根作为普通 OpenClaw 技能加载                                      | 所有格式       |
| 命令       | `commands/` 和 `.cursor/commands/` 被视为技能根                         | Claude、Cursor |
| 钩子包     | OpenClaw 风格的 `HOOK.md` + `handler.ts` 布局                           | Codex          |
| MCP 工具   | 包 MCP 配置合并到嵌入式 Pi 设置；支持的 stdio 和 HTTP 服务器加载        | 所有格式       |
| LSP 服务器 | Claude `.lsp.json` 和清单声明的 `lspServers` 合并到嵌入式 Pi LSP 默认值 | Claude         |
| 设置       | Claude `settings.json` 作为嵌入式 Pi 默认值导入                         | Claude         |

#### 技能内容

- 包技能根作为普通 OpenClaw 技能根加载
- Claude `commands` 根被视为额外的技能根
- Cursor `.cursor/commands` 根被视为额外的技能根

这意味着 Claude Markdown 命令文件通过普通 OpenClaw 技能加载器工作。Cursor 命令 Markdown 通过相同路径工作。

#### 钩子包

- 包钩子根**仅**在使用普通 OpenClaw 钩子包布局时有效。今天主要是 Codex 兼容的情况：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### Pi 的 MCP

- 启用的包可以贡献 MCP 服务器配置
- OpenClaw 将包 MCP 配置合并到有效的嵌入式 Pi 设置中，作为 `mcpServers`
- OpenClaw 通过启动 stdio 服务器或连接到 HTTP 服务器，在嵌入式 Pi agent 轮次中暴露支持的包 MCP 工具
- `coding` 和 `messaging` 工具配置文件默认包含包 MCP 工具；使用 `tools.deny: ["bundle-mcp"]` 为 agent 或 gateway 选择退出
- 项目本地 Pi 设置在包默认值之后仍适用，因此工作区设置可以在需要时覆盖包 MCP 条目
- 包 MCP 工具目录在注册前确定性排序，以避免上游 `listTools()` 顺序变化导致提示缓存工具块抖动

##### 传输方式

MCP 服务器可以使用 stdio 或 HTTP 传输：

**Stdio** 启动子进程：

```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "command": "node",
        "args": ["server.js"],
        "env": { "PORT": "3000" }
      }
    }
  }
}
```

**HTTP** 默认通过 `sse` 连接到运行中的 MCP 服务器，请求时使用 `streamable-http`：

```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "url": "http://localhost:3100/mcp",
        "transport": "streamable-http",
        "headers": {
          "Authorization": "Bearer ${MY_SECRET_TOKEN}"
        },
        "connectionTimeoutMs": 30000
      }
    }
  }
}
```

- `transport` 可以设置为 `"streamable-http"` 或 `"sse"`；省略时，OpenClaw 使用 `sse`
- `type: "http"` 是 CLI 原生下游形态；在 OpenClaw 配置中使用 `transport: "streamable-http"`。`openclaw mcp set` 和 `openclaw doctor --fix` 规范化常见别名。
- 仅允许 `http:` 和 `https:` URL 方案
- `headers` 值支持 `${ENV_VAR}` 插值
- 同时包含 `command` 和 `url` 的服务器条目会被拒绝
- URL 凭据（用户信息和查询参数）从工具描述和日志中删除
- `connectionTimeoutMs` 覆盖 stdio 和 HTTP 传输的默认 30 秒连接超时

##### 工具命名

OpenClaw 以 `serverName__toolName` 的形式注册具有提供商安全名称的包 MCP 工具。例如，键为 `"vigil-harbor"` 的服务器暴露的 `memory_search` 工具注册为 `vigil-harbor__memory_search`。

- `A-Za-z0-9_-` 之外的字符替换为 `-`
- 服务器前缀限制为 30 个字符
- 完整工具名称限制为 64 个字符
- 空服务器名称回退为 `mcp`
- 冲突的清理名称用数字后缀消除歧义
- 最终暴露的工具顺序按安全名称确定性排列，以保持重复 Pi 轮次的缓存稳定性
- 配置文件过滤将一个包 MCP 服务器的所有工具视为由 `bundle-mcp` 插件拥有，因此配置文件允许列表和拒绝列表可以包含单个暴露的工具名称或 `bundle-mcp` 插件键

#### 嵌入式 Pi 设置

- 包启用时，Claude `settings.json` 作为默认嵌入式 Pi 设置导入
- OpenClaw 在应用之前清理 shell 覆盖键

清理的键：

- `shellPath`
- `shellCommandPrefix`

#### 嵌入式 Pi LSP

- 启用的 Claude 包可以贡献 LSP 服务器配置
- OpenClaw 加载 `.lsp.json` 加上任何清单声明的 `lspServers` 路径
- 包 LSP 配置合并到有效的嵌入式 Pi LSP 默认值中
- 今天只有支持的 stdio 支持的 LSP 服务器可运行；不支持的传输仍会出现在 `openclaw plugins inspect <id>` 中

### 已检测但未执行

这些已被识别并显示在诊断中，但 OpenClaw 不会运行它们：

- Claude `agents`、`hooks.json` 自动化、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- Codex 超出能力报告的内联/应用元数据

## 包格式

<AccordionGroup>
  <Accordion title="Codex 包">
    标记：`.codex-plugin/plugin.json`

    可选内容：`skills/`、`hooks/`、`.mcp.json`、`.app.json`

    当 Codex 包使用技能根和 OpenClaw 风格的钩子包目录（`HOOK.md` + `handler.ts`）时，最适合 OpenClaw。

  </Accordion>

  <Accordion title="Claude 包">
    两种检测模式：

    - **基于清单：** `.claude-plugin/plugin.json`
    - **无清单：** 默认 Claude 布局（`skills/`、`commands/`、`agents/`、`hooks/`、`.mcp.json`、`.lsp.json`、`settings.json`）

    Claude 特定行为：

    - `commands/` 被视为技能内容
    - `settings.json` 导入到嵌入式 Pi 设置（shell 覆盖键被清理）
    - `.mcp.json` 将支持的 stdio 工具暴露给嵌入式 Pi
    - `.lsp.json` 加上清单声明的 `lspServers` 路径加载到嵌入式 Pi LSP 默认值中
    - `hooks/hooks.json` 被检测但不执行
    - 清单中的自定义组件路径是附加的（它们扩展默认值，而非替换）

  </Accordion>

  <Accordion title="Cursor 包">
    标记：`.cursor-plugin/plugin.json`

    可选内容：`skills/`、`.cursor/commands/`、`.cursor/agents/`、`.cursor/rules/`、`.cursor/hooks.json`、`.mcp.json`

    - `.cursor/commands/` 被视为技能内容
    - `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 仅检测

  </Accordion>
</AccordionGroup>

## 检测优先级

OpenClaw 首先检查原生插件格式：

1. `openclaw.plugin.json` 或带有 `openclaw.extensions` 的有效 `package.json`——视为**原生插件**
2. 包标记（`.codex-plugin/`、`.claude-plugin/` 或默认 Claude/Cursor 布局）——视为**包**

如果目录同时包含两者，OpenClaw 使用原生路径。这防止双格式包被部分安装为包。

## 运行时依赖和清理

- 第三方兼容包在启动时不会进行 `npm install` 修复。它们应通过 `openclaw plugins install` 安装，并将所需的一切随包含在已安装的插件目录中。
- OpenClaw 拥有的捆绑插件要么在核心中轻量级发布，要么通过插件安装程序下载。Gateway 启动从不为它们运行包管理器。
- `openclaw doctor --fix` 删除旧版暂存依赖目录，并可以安装本地插件索引中缺少的已配置可下载插件。

## 安全

包的信任边界比原生插件更窄：

- OpenClaw **不**在进程内加载任意包运行时模块
- 技能和钩子包路径必须保持在插件根内（经过边界检查）
- 设置文件以相同的边界检查读取
- 支持的 stdio MCP 服务器可以作为子进程启动

这使包默认情况下更安全，但你仍应将第三方包视为其暴露功能的受信任内容。

## 故障排除

<AccordionGroup>
  <Accordion title="包被检测到但能力未运行">
    运行 `openclaw plugins inspect <id>`。如果某个能力列出但标记为未连接，这是产品限制——而非安装中断。
  </Accordion>

  <Accordion title="Claude 命令文件未出现">
    确保包已启用，且 Markdown 文件位于检测到的 `commands/` 或 `skills/` 根内。
  </Accordion>

  <Accordion title="Claude 设置未应用">
    只支持来自 `settings.json` 的嵌入式 Pi 设置。OpenClaw 不将包设置视为原始配置补丁。
  </Accordion>

  <Accordion title="Claude 钩子未执行">
    `hooks/hooks.json` 仅供检测。如果需要可运行的钩子，使用 OpenClaw 钩子包布局或发布原生插件。
  </Accordion>
</AccordionGroup>

## 相关文档

- [安装和配置插件](/tools/plugin)
- [构建插件](/plugins/building-plugins) — 创建原生插件
- [插件清单](/plugins/manifest) — 原生清单模式
