---
summary: "Tlon/Urbit 支持状态、功能和配置"
read_when:
  - 开发 Tlon/Urbit 频道功能
title: "Tlon"
---

Tlon 是一个建立在 Urbit 上的去中心化即时通讯工具。OpenClaw 连接到您的 Urbit 飞船，可以响应私信和群组聊天消息。群组回复默认需要 @ 提及，并且可以通过白名单进一步限制。

状态：捆绑插件。支持私信、群组提及、线程回复、富文本格式和图像上传。暂不支持反应和投票。

## 捆绑插件

Tlon 作为当前 OpenClaw 发行版中的捆绑插件提供，因此正常打包构建不需要单独安装。

如果您使用的是旧版构建或不包含 Tlon 的自定义安装，请安装当前的 npm 包：

通过 CLI 安装（npm 注册表）：

```bash
openclaw plugins install @openclaw/tlon
```

使用裸包以跟随当前的官方发行标签。仅在需要可重现安装时才固定精确版本。

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/tlon-plugin
```

详情：[插件](/tools/plugin)

## 设置

1. 确保 Tlon 插件可用。
   - 当前打包的 OpenClaw 发行版已捆绑它。
   - 旧版/自定义安装可以使用上述命令手动添加。
2. 收集您的飞船 URL 和登录代码。
3. 配置 `channels.tlon`。
4. 重启网关。
5. 给机器人发私信或在群组频道中提及它。

最小配置（单账户）：

```json5
{
  channels: {
    tlon: {
      enabled: true,
      ship: "~sampel-palnet",
      url: "https://your-ship-host",
      code: "lidlut-tabwed-pillex-ridrup",
      ownerShip: "~your-main-ship", // 推荐：您的飞船，始终被允许
    },
  },
}
```

## 私有/局域网飞船

默认情况下，OpenClaw 为 SSRF 保护阻止私有/内部主机名和 IP 范围。
如果您的飞船在私有网络（localhost、局域网 IP 或内部主机名）上运行，
您必须显式选择加入：

```json5
{
  channels: {
    tlon: {
      url: "http://localhost:8080",
      allowPrivateNetwork: true,
    },
  },
}
```

这适用于以下 URL：

- `http://localhost:8080`
- `http://192.168.x.x:8080`
- `http://my-ship.local:8080`

⚠️ 仅在您信任本地网络时启用此功能。此设置禁用对飞船 URL 请求的 SSRF 保护。

## 群组频道

默认启用自动发现。您也可以手动固定频道：

```json5
{
  channels: {
    tlon: {
      groupChannels: ["chat/~host-ship/general", "chat/~host-ship/support"],
    },
  },
}
```

禁用自动发现：

```json5
{
  channels: {
    tlon: {
      autoDiscoverChannels: false,
    },
  },
}
```

## 访问控制

私信白名单（空 = 不允许私信，使用 `ownerShip` 进行审批流程）：

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"],
    },
  },
}
```

群组授权（默认受限）：

```json5
{
  channels: {
    tlon: {
      defaultAuthorizedShips: ["~zod"],
      authorization: {
        channelRules: {
          "chat/~host-ship/general": {
            mode: "restricted",
            allowedShips: ["~zod", "~nec"],
          },
          "chat/~host-ship/announcements": {
            mode: "open",
          },
        },
      },
    },
  },
}
```

## 所有者和审批系统

设置所有者飞船，以便在未授权用户尝试互动时接收审批请求：

```json5
{
  channels: {
    tlon: {
      ownerShip: "~your-main-ship",
    },
  },
}
```

所有者飞船**在所有地方自动被授权** — 私信邀请自动接受，
频道消息始终被允许。您不需要将所有者添加到 `dmAllowlist` 或
`defaultAuthorizedShips`。

设置后，所有者将收到以下私信通知：

- 不在白名单中的飞船的私信请求
- 没有授权的频道中的提及
- 群组邀请请求

## 自动接受设置

自动接受私信邀请（适用于 dmAllowlist 中的飞船）：

```json5
{
  channels: {
    tlon: {
      autoAcceptDmInvites: true,
    },
  },
}
```

自动接受来自受信任飞船的群组邀请：

```json5
{
  channels: {
    tlon: {
      autoAcceptGroupInvites: true,
      groupInviteAllowlist: ["~zod"],
    },
  },
}
```

当 `groupInviteAllowlist` 为空时，`autoAcceptGroupInvites` 失败关闭。将白名单设置为应该自动接受其群组邀请的飞船。

## 投递目标（CLI/定时任务）

在 `openclaw message send` 或定时任务投递中使用这些：

- 私信：`~sampel-palnet` 或 `dm/~sampel-palnet`
- 群组：`chat/~host-ship/channel` 或 `group:~host-ship/channel`

## 捆绑技能

Tlon 插件包含一个捆绑技能（[`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill)），
提供对 Tlon 操作的 CLI 访问：

- **联系人**：获取/更新个人资料，列出联系人
- **频道**：列出、创建、发布消息、获取历史
- **群组**：列出、创建、管理成员
- **私信**：发送消息、对消息做出反应
- **反应**：对帖子和私信添加/删除 emoji 反应
- **设置**：通过斜杠命令管理插件权限

插件安装后技能自动可用。

## 功能

| 功能      | 状态                              |
| --------- | --------------------------------- |
| 直接消息  | ✅ 支持                           |
| 群组/频道 | ✅ 支持（默认需要提及）           |
| 线程      | ✅ 支持（在线程中自动回复）       |
| 富文本    | ✅ Markdown 转换为 Tlon 格式      |
| 图像      | ✅ 上传到 Tlon 存储               |
| 反应      | ✅ 通过[捆绑技能](#bundled-skill) |
| 投票      | ❌ 尚不支持                       |
| 原生命令  | ✅ 支持（默认仅限所有者）         |

## 故障排查

首先运行此梯形诊断：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

常见故障：

- **私信被忽略**：发件人不在 `dmAllowlist` 中，且未配置 `ownerShip` 用于审批流程。
- **群组消息被忽略**：频道未被发现或发件人未被授权。
- **连接错误**：检查飞船 URL 是否可达；为本地飞船启用 `allowPrivateNetwork`。
- **认证错误**：验证登录码是否最新（代码会轮换）。

## 配置参考

完整配置：[配置](/gateway/configuration)

提供者选项：

- `channels.tlon.enabled`：启用/禁用频道启动。
- `channels.tlon.ship`：机器人的 Urbit 飞船名称（例如 `~sampel-palnet`）。
- `channels.tlon.url`：飞船 URL（例如 `https://sampel-palnet.tlon.network`）。
- `channels.tlon.code`：飞船登录码。
- `channels.tlon.allowPrivateNetwork`：允许 localhost/局域网 URL（SSRF 绕过）。
- `channels.tlon.ownerShip`：审批系统的所有者飞船（始终被授权）。
- `channels.tlon.dmAllowlist`：允许私信的飞船（空 = 无）。
- `channels.tlon.autoAcceptDmInvites`：自动接受来自白名单飞船的私信。
- `channels.tlon.autoAcceptGroupInvites`：自动接受来自白名单飞船的群组邀请。
- `channels.tlon.groupInviteAllowlist`：其群组邀请可以自动接受的飞船。
- `channels.tlon.autoDiscoverChannels`：自动发现群组频道（默认：true）。
- `channels.tlon.groupChannels`：手动固定的频道嵌套。
- `channels.tlon.defaultAuthorizedShips`：所有频道中被授权的飞船。
- `channels.tlon.authorization.channelRules`：每频道认证规则。
- `channels.tlon.showModelSignature`：在消息中附加模型名称。

## 说明

- 群组回复需要提及（例如 `~your-bot-ship`）才能响应。
- 线程回复：如果入站消息在线程中，OpenClaw 在线程内回复。
- 富文本：Markdown 格式（粗体、斜体、代码、标题、列表）转换为 Tlon 的原生格式。
- 图像：URL 上传到 Tlon 存储并作为图像块嵌入。

## 相关

- [频道概述](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私信认证和配对流程
- [群组](/channels/groups) — 群组聊天行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和安全加固
