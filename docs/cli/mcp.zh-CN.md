---
summary: "通过 MCP 公开 OpenClaw 频道对话，并管理已保存的 MCP 服务器定义"
read_when:
  - 将 Codex、Claude Code 或其他 MCP 客户端连接到 OpenClaw 支持的频道时
  - 运行 `openclaw mcp serve` 时
  - 管理 OpenClaw 保存的 MCP 服务器定义时
title: "MCP"
sidebarTitle: "MCP"
---

`openclaw mcp` 有两个用途：

- 通过 `openclaw mcp serve` 将 OpenClaw 作为 MCP 服务器运行
- 通过 `list`、`show`、`set` 和 `unset` 管理 OpenClaw 拥有的出站 MCP 服务器定义

换句话说：

- `serve` 是 OpenClaw 充当 MCP 服务器
- `list` / `show` / `set` / `unset` 是 OpenClaw 充当其运行时后续可能消费的其他 MCP 服务器的客户端注册表

当 OpenClaw 需要自行托管编码 harness 会话并通过 ACP 路由该运行时时，请使用 [`openclaw acp`](/cli/acp)。

## OpenClaw 作为 MCP 服务器

这是 `openclaw mcp serve` 路径。

### 何时使用 `serve`

在以下情况下使用 `openclaw mcp serve`：

- Codex、Claude Code 或其他 MCP 客户端需要直接与 OpenClaw 支持的频道对话
- 你已经有一个本地或远程 OpenClaw Gateway，并有路由的会话
- 你希望有一个可跨 OpenClaw 频道后端工作的 MCP 服务器，而不是运行各自独立的频道桥接

当 OpenClaw 需要自行托管编码运行时并将代理会话保留在 OpenClaw 内部时，请改用 [`openclaw acp`](/cli/acp)。

### 工作原理

`openclaw mcp serve` 启动一个 stdio MCP 服务器。MCP 客户端拥有该进程。当客户端保持 stdio 会话打开时，桥接通过 WebSocket 连接到本地或远程 OpenClaw Gateway，并通过 MCP 公开路由的频道对话。

<Steps>
  <Step title="客户端生成桥接">
    MCP 客户端生成 `openclaw mcp serve`。
  </Step>
  <Step title="桥接连接到 Gateway">
    桥接通过 WebSocket 连接到 OpenClaw Gateway。
  </Step>
  <Step title="会话成为 MCP 对话">
    路由的会话成为 MCP 对话和转录/历史工具。
  </Step>
  <Step title="实时事件入队">
    当桥接连接时，实时事件在内存中排队。
  </Step>
  <Step title="可选的 Claude 推送">
    如果启用了 Claude 频道模式，同一会话还可以接收 Claude 特定的推送通知。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="重要行为">
    - 实时队列状态在桥接连接时开始
    - 较旧的转录历史通过 `messages_read` 读取
    - Claude 推送通知仅在 MCP 会话存活期间存在
    - 当客户端断开连接时，桥接退出并且实时队列消失
    - 一次性代理入口点（如 `openclaw agent` 和 `openclaw infer model run`）在回复完成时会退出其打开的任何捆绑 MCP 运行时，因此重复脚本运行不会积累 stdio MCP 子进程
    - 由 OpenClaw 启动的 stdio MCP 服务器（捆绑的或用户配置的）在关闭时作为进程树被销毁，因此服务器启动的子进程在父 stdio 客户端退出后不会存活
    - 删除或重置会话会通过共享的运行时清理路径处置该会话的 MCP 客户端，因此不会有与已删除会话绑定的遗留 stdio 连接

  </Accordion>
</AccordionGroup>

### 选择客户端模式

以两种不同方式使用相同的桥接：

<Tabs>
  <Tab title="通用 MCP 客户端">
    仅使用标准 MCP 工具。使用 `conversations_list`、`messages_read`、`events_poll`、`events_wait`、`messages_send` 和审批工具。
  </Tab>
  <Tab title="Claude Code">
    标准 MCP 工具加上 Claude 特定的频道适配器。启用 `--claude-channel-mode on` 或保留默认的 `auto`。
  </Tab>
</Tabs>

<Note>
目前，`auto` 的行为与 `on` 相同。尚无客户端能力检测。
</Note>

### `serve` 公开的内容

桥接使用现有的 Gateway 会话路由元数据来公开频道支持的对话。当 OpenClaw 已经有带有已知路由的会话状态时，对话会出现，例如：

- `channel`
- 收件人或目标元数据
- 可选的 `accountId`
- 可选的 `threadId`

这为 MCP 客户端提供了一个地方：

- 列出最近路由的对话
- 读取最近的转录历史
- 等待新的入站事件
- 通过相同路由发送回复
- 查看桥接连接时收到的审批请求

### 用法

<Tabs>
  <Tab title="本地 Gateway">
    ```bash
    openclaw mcp serve
    ```
  </Tab>
  <Tab title="远程 Gateway（令牌）">
    ```bash
    openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
    ```
  </Tab>
  <Tab title="远程 Gateway（密码）">
    ```bash
    openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password
    ```
  </Tab>
  <Tab title="详细输出 / 关闭 Claude">
    ```bash
    openclaw mcp serve --verbose
    openclaw mcp serve --claude-channel-mode off
    ```
  </Tab>
</Tabs>

### 桥接工具

当前桥接公开以下 MCP 工具：

<AccordionGroup>
  <Accordion title="conversations_list">
    列出在 Gateway 会话状态中已有路由元数据的最近会话支持的对话。

    有用的过滤器：

    - `limit`
    - `search`
    - `channel`
    - `includeDerivedTitles`
    - `includeLastMessage`

  </Accordion>
  <Accordion title="conversation_get">
    通过直接 Gateway 会话查找，按 `session_key` 返回一个对话。
  </Accordion>
  <Accordion title="messages_read">
    读取一个会话支持的对话的最近转录消息。
  </Accordion>
  <Accordion title="attachments_fetch">
    从一条转录消息中提取非文本消息内容块。这是对转录内容的元数据视图，不是独立的持久附件 blob 存储。
  </Accordion>
  <Accordion title="events_poll">
    从数字游标读取排队的实时事件。
  </Accordion>
  <Accordion title="events_wait">
    长轮询直到下一个匹配的排队事件到达或超时过期。

    当通用 MCP 客户端需要近实时交付而无需 Claude 特定推送协议时使用此功能。

  </Accordion>
  <Accordion title="messages_send">
    通过会话上已记录的相同路由发送文本。

    当前行为：

    - 需要现有的对话路由
    - 使用会话的频道、收件人、账户 ID 和线程 ID
    - 仅发送文本

  </Accordion>
  <Accordion title="permissions_list_open">
    列出桥接自连接到 Gateway 以来观察到的待处理执行/插件审批请求。
  </Accordion>
  <Accordion title="permissions_respond">
    使用以下方式解决一个待处理的执行/插件审批请求：

    - `allow-once`
    - `allow-always`
    - `deny`

  </Accordion>
</AccordionGroup>

### 事件模型

桥接在连接时保持内存中的事件队列。

当前事件类型：

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

<Warning>
- 队列仅为实时；它在 MCP 桥接启动时开始
- `events_poll` 和 `events_wait` 本身不会重播旧的 Gateway 历史
- 持久积压应通过 `messages_read` 读取

</Warning>

### Claude 频道通知

桥接还可以公开 Claude 特定的频道通知。这是 OpenClaw 等效于 Claude Code 频道适配器的功能：标准 MCP 工具仍然可用，但实时入站消息也可以作为 Claude 特定的 MCP 通知到达。

<Tabs>
  <Tab title="off">
    `--claude-channel-mode off`：仅标准 MCP 工具。
  </Tab>
  <Tab title="on">
    `--claude-channel-mode on`：启用 Claude 频道通知。
  </Tab>
  <Tab title="auto（默认）">
    `--claude-channel-mode auto`：当前默认；与 `on` 相同的桥接行为。
  </Tab>
</Tabs>

当 Claude 频道模式启用时，服务器会宣传 Claude 实验性功能并可发出：

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

当前桥接行为：

- 入站 `user` 转录消息作为 `notifications/claude/channel` 转发
- 通过 MCP 收到的 Claude 权限请求在内存中跟踪
- 如果链接的对话后来发送 `yes abcde` 或 `no abcde`，桥接将其转换为 `notifications/claude/channel/permission`
- 这些通知仅限于实时会话；如果 MCP 客户端断开连接，则没有推送目标

这是有意针对特定客户端的。通用 MCP 客户端应依赖标准轮询工具。

### MCP 客户端配置

stdio 客户端配置示例：

```json
{
  "mcpServers": {
    "openclaw": {
      "command": "openclaw",
      "args": [
        "mcp",
        "serve",
        "--url",
        "wss://gateway-host:18789",
        "--token-file",
        "/path/to/gateway.token"
      ]
    }
  }
}
```

对于大多数通用 MCP 客户端，从标准工具界面开始并忽略 Claude 模式。仅对实际理解 Claude 特定通知方法的客户端开启 Claude 模式。

### 选项

`openclaw mcp serve` 支持：

<ParamField path="--url" type="string">
  Gateway WebSocket URL。
</ParamField>
<ParamField path="--token" type="string">
  Gateway 令牌。
</ParamField>
<ParamField path="--token-file" type="string">
  从文件读取令牌。
</ParamField>
<ParamField path="--password" type="string">
  Gateway 密码。
</ParamField>
<ParamField path="--password-file" type="string">
  从文件读取密码。
</ParamField>
<ParamField path="--claude-channel-mode" type='"auto" | "on" | "off"'>
  Claude 通知模式。
</ParamField>
<ParamField path="-v, --verbose" type="boolean">
  在 stderr 上输出详细日志。
</ParamField>

<Tip>
尽可能优先使用 `--token-file` 或 `--password-file`，而不是内联密钥。
</Tip>

### 安全和信任边界

桥接不会发明路由。它只公开 Gateway 已知如何路由的对话。

这意味着：

- 发件人允许列表、配对和频道级别信任仍属于底层 OpenClaw 频道配置
- `messages_send` 只能通过现有的存储路由回复
- 审批状态对于当前桥接会话来说是实时/内存中的
- 桥接认证应使用与你信任任何其他远程 Gateway 客户端相同的 Gateway 令牌或密码控制

如果 `conversations_list` 中缺少对话，通常原因不是 MCP 配置。而是底层 Gateway 会话中缺少或不完整的路由元数据。

### 测试

OpenClaw 为此桥接提供了确定性的 Docker 冒烟测试：

```bash
pnpm test:docker:mcp-channels
```

该冒烟测试：

- 启动一个带有种子数据的 Gateway 容器
- 启动一个第二个容器，生成 `openclaw mcp serve`
- 验证对话发现、转录读取、附件元数据读取、实时事件队列行为和出站发送路由
- 通过真实的 stdio MCP 桥接验证 Claude 风格的频道和权限通知

这是在不将真实的 Telegram、Discord 或 iMessage 账户接入测试运行的情况下证明桥接工作的最快方式。

有关更广泛的测试背景，请参阅[测试](/help/testing)。

### 故障排除

<AccordionGroup>
  <Accordion title="未返回对话">
    通常意味着 Gateway 会话尚不可路由。确认底层会话已存储频道/提供商、收件人和可选的账户/线程路由元数据。
  </Accordion>
  <Accordion title="events_poll 或 events_wait 错过旧消息">
    预期行为。实时队列在桥接连接时开始。使用 `messages_read` 读取旧的转录历史。
  </Accordion>
  <Accordion title="Claude 通知不显示">
    检查以下所有内容：

    - 客户端保持 stdio MCP 会话打开
    - `--claude-channel-mode` 为 `on` 或 `auto`
    - 客户端实际上理解 Claude 特定的通知方法
    - 入站消息发生在桥接连接之后

  </Accordion>
  <Accordion title="审批丢失">
    `permissions_list_open` 仅显示在桥接连接期间观察到的审批请求。它不是持久的审批历史 API。
  </Accordion>
</AccordionGroup>

## OpenClaw 作为 MCP 客户端注册表

这是 `openclaw mcp list`、`show`、`set` 和 `unset` 路径。

这些命令不会通过 MCP 公开 OpenClaw。它们管理 OpenClaw 配置中 `mcp.servers` 下 OpenClaw 拥有的 MCP 服务器定义。

这些保存的定义用于 OpenClaw 稍后启动或配置的运行时，例如嵌入式 Pi 和其他运行时适配器。OpenClaw 集中存储定义，这样这些运行时就不需要保留自己的重复 MCP 服务器列表。

<AccordionGroup>
  <Accordion title="重要行为">
    - 这些命令仅读取或写入 OpenClaw 配置
    - 它们不连接到目标 MCP 服务器
    - 它们不验证命令、URL 或远程传输现在是否可达
    - 运行时适配器在执行时决定它们实际支持哪些传输形状
    - 嵌入式 Pi 在正常 `coding` 和 `messaging` 工具配置文件中公开已配置的 MCP 工具；`minimal` 仍然隐藏它们，`tools.deny: ["bundle-mcp"]` 明确禁用它们
    - 会话范围的捆绑 MCP 运行时在 `mcp.sessionIdleTtlMs` 毫秒的空闲时间后被回收（默认 10 分钟；设置 `0` 禁用），一次性嵌入式运行在运行结束时清理它们

  </Accordion>
</AccordionGroup>

运行时适配器可能会将此共享注册表规范化为其下游客户端期望的形状。例如，嵌入式 Pi 直接使用 OpenClaw `transport` 值，而 Claude Code 和 Gemini 接收 CLI 原生 `type` 值，如 `http`、`sse` 或 `stdio`。

### 已保存的 MCP 服务器定义

OpenClaw 还在配置中存储了一个轻量级 MCP 服务器注册表，供需要 OpenClaw 管理 MCP 定义的界面使用。

命令：

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp unset <name>`

注意：

- `list` 对服务器名称排序。
- `show` 不带名称时打印完整配置的 MCP 服务器对象。
- `set` 期望命令行上有一个 JSON 对象值。
- 对于 Streamable HTTP MCP 服务器，使用 `transport: "streamable-http"`。`openclaw mcp set` 还会将 CLI 原生 `type: "http"` 规范化为相同的规范配置形状以保持兼容性。
- 如果命名的服务器不存在，`unset` 会失败。

示例：

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp set docs '{"url":"https://mcp.example.com","transport":"streamable-http"}'
openclaw mcp unset context7
```

示例配置形状：

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "command": "uvx",
        "args": ["context7-mcp"]
      },
      "docs": {
        "url": "https://mcp.example.com",
        "transport": "streamable-http"
      }
    }
  }
}
```

### Stdio 传输

启动本地子进程并通过 stdin/stdout 通信。

| 字段                       | 描述                       |
| -------------------------- | -------------------------- |
| `command`                  | 要生成的可执行文件（必填） |
| `args`                     | 命令行参数数组             |
| `env`                      | 额外的环境变量             |
| `cwd` / `workingDirectory` | 进程的工作目录             |

<Warning>
**Stdio 环境安全过滤器**

OpenClaw 会拒绝可能在第一次 RPC 之前改变 stdio MCP 服务器启动方式的解释器启动环境键，即使它们出现在服务器的 `env` 块中。被阻止的键包括 `NODE_OPTIONS`、`PYTHONSTARTUP`、`PYTHONPATH`、`PERL5OPT`、`RUBYOPT`、`SHELLOPTS`、`PS4` 和类似的运行时控制变量。启动时会以配置错误拒绝这些键，以防止它们注入隐式前奏、交换解释器或针对 stdio 进程启用调试器。普通的凭据、代理和服务器特定的环境变量（`GITHUB_TOKEN`、`HTTP_PROXY`、自定义 `*_API_KEY` 等）不受影响。

如果你的 MCP 服务器确实需要其中一个被阻止的变量，请在 gateway 主机进程上设置它，而不是在 stdio 服务器的 `env` 下设置。
</Warning>

### SSE / HTTP 传输

通过 HTTP Server-Sent Events 连接到远程 MCP 服务器。

| 字段                  | 描述                                   |
| --------------------- | -------------------------------------- |
| `url`                 | 远程服务器的 HTTP 或 HTTPS URL（必填） |
| `headers`             | 可选的 HTTP 头键值映射（例如认证令牌） |
| `connectionTimeoutMs` | 每个服务器的连接超时（毫秒，可选）     |

示例：

```json
{
  "mcp": {
    "servers": {
      "remote-tools": {
        "url": "https://mcp.example.com",
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

`url`（用户信息）和 `headers` 中的敏感值在日志和状态输出中会被编辑。

### Streamable HTTP 传输

`streamable-http` 是除 `sse` 和 `stdio` 之外的另一种传输选项。它使用 HTTP 流与远程 MCP 服务器进行双向通信。

| 字段                  | 描述                                                               |
| --------------------- | ------------------------------------------------------------------ |
| `url`                 | 远程服务器的 HTTP 或 HTTPS URL（必填）                             |
| `transport`           | 设置为 `"streamable-http"` 选择此传输；省略时，OpenClaw 使用 `sse` |
| `headers`             | 可选的 HTTP 头键值映射（例如认证令牌）                             |
| `connectionTimeoutMs` | 每个服务器的连接超时（毫秒，可选）                                 |

OpenClaw 配置使用 `transport: "streamable-http"` 作为规范拼写。通过 `openclaw mcp set` 保存时接受 CLI 原生 MCP `type: "http"` 值，并通过现有配置中的 `openclaw doctor --fix` 修复，但 `transport` 是嵌入式 Pi 直接消费的。

示例：

```json
{
  "mcp": {
    "servers": {
      "streaming-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "connectionTimeoutMs": 10000,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

<Note>
这些命令仅管理已保存的配置。它们不启动频道桥接，不打开实时 MCP 客户端会话，也不证明目标服务器是否可达。
</Note>

## 当前限制

此页面记录了今天发布的桥接。

当前限制：

- 对话发现依赖于现有的 Gateway 会话路由元数据
- 除 Claude 特定适配器外，没有通用推送协议
- 尚无消息编辑或反应工具
- HTTP/SSE/streamable-http 传输连接到单个远程服务器；尚无多路复用上游
- `permissions_list_open` 仅包含桥接连接时观察到的审批

## 相关

- [CLI 参考](/cli)
- [插件](/cli/plugins)
