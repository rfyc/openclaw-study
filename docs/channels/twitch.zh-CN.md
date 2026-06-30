---
summary: "Twitch 聊天机器人配置和设置"
read_when:
  - 为 OpenClaw 设置 Twitch 聊天集成
title: "Twitch"
sidebarTitle: "Twitch"
---

通过 IRC 连接支持 Twitch 聊天。OpenClaw 作为 Twitch 用户（机器人账户）连接，以在频道中接收和发送消息。

## 捆绑插件

<Note>
Twitch 作为当前 OpenClaw 发行版中的捆绑插件提供，因此正常打包构建不需要单独安装。
</Note>

如果您使用的是旧版构建或不包含 Twitch 的自定义安装，请直接安装 npm 包：

<Tabs>
  <Tab title="npm 注册表">
    ```bash
    openclaw plugins install @openclaw/twitch
    ```
  </Tab>
  <Tab title="本地检出">
    ```bash
    openclaw plugins install ./path/to/local/twitch-plugin
    ```
  </Tab>
</Tabs>

使用裸包以跟随当前的官方发行标签。仅在需要可重现安装时才固定精确版本。

详情：[插件](/tools/plugin)

## 快速设置（初学者）

<Steps>
  <Step title="确保插件可用">
    当前打包的 OpenClaw 发行版已捆绑它。旧版/自定义安装可以使用上述命令手动添加。
  </Step>
  <Step title="创建 Twitch 机器人账户">
    为机器人创建一个专用的 Twitch 账户（或使用现有账户）。
  </Step>
  <Step title="生成凭据">
    使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：

    - 选择 **Bot Token**
    - 验证已选中 `chat:read` 和 `chat:write` 权限范围
    - 复制 **Client ID** 和 **Access Token**

  </Step>
  <Step title="查找您的 Twitch 用户 ID">
    使用 [https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) 将用户名转换为 Twitch 用户 ID。
  </Step>
  <Step title="配置 Token">
    - 环境变量：`OPENCLAW_TWITCH_ACCESS_TOKEN=...`（仅限默认账户）
    - 或配置：`channels.twitch.accessToken`

    如果两者都设置，配置优先（环境变量回退仅限默认账户）。

  </Step>
  <Step title="启动网关">
    使用配置的频道启动网关。
  </Step>
</Steps>

<Warning>
添加访问控制（`allowFrom` 或 `allowedRoles`）以防止未授权用户触发机器人。`requireMention` 默认为 `true`。
</Warning>

最小配置：

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw", // 机器人的 Twitch 账户
      accessToken: "oauth:abc123...", // OAuth Access Token（或使用 OPENCLAW_TWITCH_ACCESS_TOKEN 环境变量）
      clientId: "xyz789...", // Token Generator 的 Client ID
      channel: "vevisk", // 要加入哪个 Twitch 频道的聊天（必填）
      allowFrom: ["123456789"], // （推荐）仅您的 Twitch 用户 ID - 从 https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/ 获取
    },
  },
}
```

## 它是什么

- 一个由网关拥有的 Twitch 频道。
- 确定性路由：回复始终返回到 Twitch。
- 每个账户映射到独立的会话键 `agent:<agentId>:twitch:<accountName>`。
- `username` 是机器人账户（进行认证的人），`channel` 是要加入的聊天室。

## 设置（详细）

### 生成凭据

使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：

- 选择 **Bot Token**
- 验证已选中 `chat:read` 和 `chat:write` 权限范围
- 复制 **Client ID** 和 **Access Token**

<Note>
不需要手动应用注册。Token 在几小时后过期。
</Note>

### 配置机器人

<Tabs>
  <Tab title="环境变量（仅限默认账户）">
    ```bash
    OPENCLAW_TWITCH_ACCESS_TOKEN=oauth:abc123...
    ```
  </Tab>
  <Tab title="配置文件">
    ```json5
    {
      channels: {
        twitch: {
          enabled: true,
          username: "openclaw",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "vevisk",
        },
      },
    }
    ```
  </Tab>
</Tabs>

如果环境变量和配置都已设置，配置优先。

### 访问控制（推荐）

```json5
{
  channels: {
    twitch: {
      allowFrom: ["123456789"], // （推荐）仅您的 Twitch 用户 ID
    },
  },
}
```

推荐使用 `allowFrom` 作为硬白名单。如果您想要基于角色的访问，请改用 `allowedRoles`。

**可用角色：** `"moderator"`、`"owner"`、`"vip"`、`"subscriber"`、`"all"`。

<Note>
**为什么使用用户 ID？** 用户名可以更改，允许冒充。用户 ID 是永久的。

查找您的 Twitch 用户 ID：[https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/)（将您的 Twitch 用户名转换为 ID）
</Note>

## Token 刷新（可选）

来自 [Twitch Token Generator](https://twitchtokengenerator.com/) 的 Token 无法自动刷新 — 过期时重新生成。

对于自动 Token 刷新，请在 [Twitch 开发者控制台](https://dev.twitch.tv/console)创建您自己的 Twitch 应用并添加到配置中：

```json5
{
  channels: {
    twitch: {
      clientSecret: "your_client_secret",
      refreshToken: "your_refresh_token",
    },
  },
}
```

机器人在过期前自动刷新 Token 并记录刷新事件。

## 多账户支持

在 `channels.twitch.accounts` 下使用每账户 Token。共享模式请参阅[配置](/gateway/configuration)。

示例（一个机器人账户在两个频道）：

```json5
{
  channels: {
    twitch: {
      accounts: {
        channel1: {
          username: "openclaw",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "vevisk",
        },
        channel2: {
          username: "openclaw",
          accessToken: "oauth:def456...",
          clientId: "uvw012...",
          channel: "secondchannel",
        },
      },
    },
  },
}
```

<Note>
每个账户需要自己的 Token（每频道一个 Token）。
</Note>

## 访问控制

<Tabs>
  <Tab title="用户 ID 白名单（最安全）">
    ```json5
    {
      channels: {
        twitch: {
          accounts: {
            default: {
              allowFrom: ["123456789", "987654321"],
            },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="基于角色">
    ```json5
    {
      channels: {
        twitch: {
          accounts: {
            default: {
              allowedRoles: ["moderator", "vip"],
            },
          },
        },
      },
    }
    ```

    `allowFrom` 是硬白名单。设置后，只有那些用户 ID 被允许。如果您想要基于角色的访问，请保持 `allowFrom` 未设置并改为配置 `allowedRoles`。

  </Tab>
  <Tab title="禁用 @提及 要求">
    默认情况下，`requireMention` 为 `true`。要禁用并响应所有消息：

    ```json5
    {
      channels: {
        twitch: {
          accounts: {
            default: {
              requireMention: false,
            },
          },
        },
      },
    }
    ```

  </Tab>
</Tabs>

## 故障排查

首先运行诊断命令：

```bash
openclaw doctor
openclaw channels status --probe
```

<AccordionGroup>
  <Accordion title="机器人不响应消息">
    - **检查访问控制：** 确保您的用户 ID 在 `allowFrom` 中，或临时删除 `allowFrom` 并设置 `allowedRoles: ["all"]` 进行测试。
    - **检查机器人是否在频道中：** 机器人必须加入 `channel` 中指定的频道。

  </Accordion>
  <Accordion title="Token 问题">
    "Failed to connect"或认证错误：

    - 验证 `accessToken` 是 OAuth 访问 Token 值（通常以 `oauth:` 前缀开头）
    - 检查 Token 是否具有 `chat:read` 和 `chat:write` 权限范围
    - 如果使用 Token 刷新，验证 `clientSecret` 和 `refreshToken` 是否已设置

  </Accordion>
  <Accordion title="Token 刷新不起作用">
    检查日志中的刷新事件：

    ```
    Using env token source for mybot
    Access token refreshed for user 123456 (expires in 14400s)
    ```

    如果您看到"token refresh disabled (no refresh token)"：

    - 确保已提供 `clientSecret`
    - 确保已提供 `refreshToken`

  </Accordion>
</AccordionGroup>

## 配置

### 账户配置

<ParamField path="username" type="string">
  机器人用户名。
</ParamField>
<ParamField path="accessToken" type="string">
  具有 `chat:read` 和 `chat:write` 的 OAuth 访问 Token。
</ParamField>
<ParamField path="clientId" type="string">
  Twitch Client ID（来自 Token Generator 或您的应用）。
</ParamField>
<ParamField path="channel" type="string" required>
  要加入的频道。
</ParamField>
<ParamField path="enabled" type="boolean" default="true">
  启用此账户。
</ParamField>
<ParamField path="clientSecret" type="string">
  可选：用于自动 Token 刷新。
</ParamField>
<ParamField path="refreshToken" type="string">
  可选：用于自动 Token 刷新。
</ParamField>
<ParamField path="expiresIn" type="number">
  Token 有效期（秒）。
</ParamField>
<ParamField path="obtainmentTimestamp" type="number">
  Token 获取时间戳。
</ParamField>
<ParamField path="allowFrom" type="string[]">
  用户 ID 白名单。
</ParamField>
<ParamField path="allowedRoles" type='Array<"moderator" | "owner" | "vip" | "subscriber" | "all">'>
  基于角色的访问控制。
</ParamField>
<ParamField path="requireMention" type="boolean" default="true">
  需要 @ 提及。
</ParamField>

### 提供者选项

- `channels.twitch.enabled` - 启用/禁用频道启动
- `channels.twitch.username` - 机器人用户名（简化的单账户配置）
- `channels.twitch.accessToken` - OAuth 访问 Token（简化的单账户配置）
- `channels.twitch.clientId` - Twitch Client ID（简化的单账户配置）
- `channels.twitch.channel` - 要加入的频道（简化的单账户配置）
- `channels.twitch.accounts.<accountName>` - 多账户配置（所有上述账户字段）

完整示例：

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw",
      accessToken: "oauth:abc123...",
      clientId: "xyz789...",
      channel: "vevisk",
      clientSecret: "secret123...",
      refreshToken: "refresh456...",
      allowFrom: ["123456789"],
      allowedRoles: ["moderator", "vip"],
      accounts: {
        default: {
          username: "mybot",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "your_channel",
          enabled: true,
          clientSecret: "secret123...",
          refreshToken: "refresh456...",
          expiresIn: 14400,
          obtainmentTimestamp: 1706092800000,
          allowFrom: ["123456789", "987654321"],
          allowedRoles: ["moderator"],
        },
      },
    },
  },
}
```

## 工具操作

智能体可以调用 `twitch` 并指定操作：

- `send` - 向频道发送消息

示例：

```json5
{
  action: "twitch",
  params: {
    message: "Hello Twitch!",
    to: "#mychannel",
  },
}
```

## 安全和运维

- **将 Token 视为密码** — 永远不要将 Token 提交到 git。
- **对长期运行的机器人使用自动 Token 刷新**。
- **使用用户 ID 白名单** 而不是用户名进行访问控制。
- **监控日志** 以获取 Token 刷新事件和连接状态。
- **最小化 Token 权限** — 只请求 `chat:read` 和 `chat:write`。
- **如果卡住**：确认没有其他进程拥有会话后重启网关。

## 限制

- 每条消息 **500 个字符**（在词边界处自动分块）。
- 分块前去除 Markdown。
- 无速率限制（使用 Twitch 的内置速率限制）。

## 相关

- [频道路由](/channels/channel-routing) — 消息的会话路由
- [频道概述](/channels) — 所有支持的频道
- [群组](/channels/groups) — 群组聊天行为和提及门控
- [配对](/channels/pairing) — 私信认证和配对流程
- [安全性](/gateway/security) — 访问模型和安全加固
