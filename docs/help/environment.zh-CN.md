---
summary: "OpenClaw 加载环境变量的位置及优先级顺序"
read_when:
  - 需要了解加载哪些环境变量及其加载顺序
  - 在调试 Gateway 中缺失的 API 密钥
  - 正在记录提供商身份验证或部署环境
title: "环境变量"
---

OpenClaw 从多个来源获取环境变量。规则是**永不覆盖已有值**。

## 优先级（从高到低）

1. **进程环境**（Gateway 进程已从父 shell/守护进程获取的内容）。
2. **当前工作目录中的 `.env`**（dotenv 默认；不覆盖）。
3. **全局 `.env`**，位于 `~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`；不覆盖）。
4. **`~/.openclaw/openclaw.json` 中的配置 `env` 块**（仅在缺失时应用）。
5. **可选的登录 shell 导入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），仅对缺失的预期密钥应用。

在使用默认状态目录的 Ubuntu 全新安装中，OpenClaw 还将 `~/.config/openclaw/gateway.env` 视为全局 `.env` 之后的兼容性回退。如果两个文件都存在且不一致，OpenClaw 保留 `~/.openclaw/.env` 并打印警告。

如果配置文件完全缺失，则跳过第 4 步；如果启用了 shell 导入，它仍然会运行。

## 配置 `env` 块

设置内联环境变量的两种等效方式（两者都不会覆盖）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
  },
}
```

## Shell 环境导入

`env.shellEnv` 运行你的登录 shell，并仅导入**缺失的**预期密钥：

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

等效的环境变量：

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## 运行时注入的环境变量

OpenClaw 还会向派生的子进程注入上下文标记：

- `OPENCLAW_SHELL=exec`：为通过 `exec` 工具运行的命令设置。
- `OPENCLAW_SHELL=acp`：为 ACP 运行时后端进程生成（例如 `acpx`）设置。
- `OPENCLAW_SHELL=acp-client`：为 `openclaw acp client` 生成 ACP 桥接进程时设置。
- `OPENCLAW_SHELL=tui-local`：为本地 TUI `!` shell 命令设置。

这些是运行时标记（不需要用户配置）。它们可用于 shell/配置文件逻辑中，以应用特定上下文的规则。

## UI 环境变量

- `OPENCLAW_THEME=light`：当你的终端具有浅色背景时，强制使用浅色 TUI 调色板。
- `OPENCLAW_THEME=dark`：强制使用深色 TUI 调色板。
- `COLORFGBG`：如果你的终端导出了它，OpenClaw 使用背景颜色提示自动选择 TUI 调色板。

## 配置中的环境变量替换

你可以在配置字符串值中使用 `${VAR_NAME}` 语法直接引用环境变量：

```json5
{
  models: {
    providers: {
      "vercel-gateway": {
        apiKey: "${VERCEL_GATEWAY_API_KEY}",
      },
    },
  },
}
```

有关完整详情，请参阅[配置：环境变量替换](/gateway/configuration-reference#env-var-substitution)。

## 密钥引用与 `${ENV}` 字符串

OpenClaw 支持两种环境驱动的模式：

- 配置值中的 `${VAR}` 字符串替换。
- SecretRef 对象（`{ source: "env", provider: "default", id: "VAR" }`），用于支持密钥引用的字段。

两者都在激活时从进程环境中解析。SecretRef 详细信息记录在[密钥管理](/gateway/secrets)中。

## 路径相关的环境变量

| 变量                     | 用途                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`          | 覆盖用于所有内部路径解析的主目录（`~/.openclaw/`、代理目录、会话、凭证）。在以专用服务用户身份运行 OpenClaw 时很有用。 |
| `OPENCLAW_STATE_DIR`     | 覆盖状态目录（默认为 `~/.openclaw`）。                                                                                 |
| `OPENCLAW_CONFIG_PATH`   | 覆盖配置文件路径（默认为 `~/.openclaw/openclaw.json`）。                                                               |
| `OPENCLAW_INCLUDE_ROOTS` | 允许 `$include` 指令解析配置目录之外的文件的目录路径列表（默认：无——`$include` 限于配置目录）。支持波浪号展开。        |

## 日志记录

| 变量                 | 用途                                                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | 覆盖文件和控制台的日志级别（例如 `debug`、`trace`）。优先于配置中的 `logging.level` 和 `logging.consoleLevel`。无效值会被忽略并显示警告。 |

### `OPENCLAW_HOME`

设置后，`OPENCLAW_HOME` 会替换系统主目录（`$HOME` / `os.homedir()`）用于所有内部路径解析。这使无头服务账户能够实现完整的文件系统隔离。

**优先级：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**示例**（macOS LaunchDaemon）：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` 也可以设置为波浪号路径（例如 `~/svc`），使用前会通过 `$HOME` 展开。

## nvm 用户：web_fetch TLS 失败

如果 Node.js 是通过 **nvm** 安装的（而不是系统包管理器），则内置的 `fetch()` 使用 nvm 的捆绑 CA 存储，该存储可能缺少现代根 CA（Let's Encrypt 的 ISRG Root X1/X2、DigiCert Global Root G2 等）。这会导致 `web_fetch` 在大多数 HTTPS 站点上失败，报错 `"fetch failed"`。

在 Linux 上，OpenClaw 会自动检测 nvm 并在实际启动环境中应用修复：

- `openclaw gateway install` 将 `NODE_EXTRA_CA_CERTS` 写入 systemd 服务环境
- `openclaw` CLI 入口点在 Node 启动之前使用 `NODE_EXTRA_CA_CERTS` 设置重新执行自身

**手动修复（适用于旧版本或直接 `node ...` 启动）：**

在启动 OpenClaw 之前导出变量：

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

不要仅依赖写入 `~/.openclaw/.env` 来设置此变量；Node 在进程启动时读取 `NODE_EXTRA_CA_CERTS`。

## 旧版环境变量

OpenClaw 只读取 `OPENCLAW_*` 环境变量。旧版本中的 `CLAWDBOT_*` 和 `MOLTBOT_*` 前缀会被静默忽略。

如果这些变量仍在 Gateway 进程启动时设置，OpenClaw 会发出一个 Node 废弃警告（`OPENCLAW_LEGACY_ENV_VARS`），列出检测到的前缀和总数量。通过将旧前缀替换为 `OPENCLAW_` 来重命名每个值（例如 `CLAWDBOT_GATEWAY_TOKEN` → `OPENCLAW_GATEWAY_TOKEN`）；旧名称不会生效。

## 相关链接

- [Gateway 配置](/gateway/configuration)
- [FAQ：环境变量和 .env 加载](/help/faq#env-vars-and-env-loading)
- [模型概述](/concepts/models)
