---
summary: "Matrix 支持状态、设置和配置示例"
read_when:
  - 在 OpenClaw 中设置 Matrix
  - 配置 Matrix E2EE 和验证
title: "Matrix"
---

Matrix 是 OpenClaw 的可下载频道插件。
它使用官方 `matrix-js-sdk`，支持私信、房间、线程、媒体、反应、投票、位置和 E2EE。

## 安装

在配置频道之前安装 Matrix：

```bash
openclaw plugins install @openclaw/matrix
```

从本地检出安装：

```bash
openclaw plugins install ./path/to/local/matrix-plugin
```

`plugins install` 注册并启用插件，因此不需要单独的 `openclaw plugins enable matrix` 步骤。在您配置以下频道之前，插件不会执行任何操作。请参阅[插件](/tools/plugin)了解一般插件行为和安装规则。

## 设置

1. 在您的 homeserver 上创建 Matrix 账户。
2. 使用 `homeserver` + `accessToken`，或 `homeserver` + `userId` + `password` 配置 `channels.matrix`。
3. 重启网关。
4. 与机器人开始私信，或邀请它加入房间（请参阅[自动加入](#auto-join)——新邀请只有在 `autoJoin` 允许时才会生效）。

### 交互式设置

```bash
openclaw channels add
openclaw configure --section channels
```

向导询问：homeserver URL、认证方式（访问令牌或密码）、用户 ID（仅密码认证）、可选设备名称、是否启用 E2EE，以及是否配置房间访问和自动加入。

如果匹配的 `MATRIX_*` 环境变量已经存在且所选账户没有保存的认证，向导会提供环境变量快捷方式。要在保存白名单之前解析房间名称，请运行 `openclaw channels resolve --channel matrix "Project Room"`。当启用 E2EE 时，向导写入配置并运行与 [`openclaw matrix encryption setup`](#encryption-and-verification) 相同的引导。

### 最小配置

基于令牌：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      dm: { policy: "pairing" },
    },
  },
}
```

基于密码（第一次登录后令牌被缓存）：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      userId: "@bot:example.org",
      password: "replace-me", // pragma: allowlist secret
      deviceName: "OpenClaw Gateway",
    },
  },
}
```

### 自动加入

`channels.matrix.autoJoin` 默认为 `off`。使用默认值时，机器人在新的房间或新邀请的私信中不会出现，直到您手动加入。

OpenClaw 在邀请时无法判断被邀请的房间是私信还是群组，因此所有邀请——包括私信类型的邀请——都首先通过 `autoJoin`。`dm.policy` 只在机器人已加入并对房间进行分类后才适用。

<Warning>
设置 `autoJoin: "allowlist"` 加上 `autoJoinAllowlist` 以限制机器人接受哪些邀请，或 `autoJoin: "always"` 以接受每个邀请。

`autoJoinAllowlist` 只接受稳定目标：`!roomId:server`、`#alias:server` 或 `*`。纯粹的房间名称被拒绝；别名条目针对 homeserver 解析，而不是针对被邀请房间声明的状态。
</Warning>

```json5
{
  channels: {
    matrix: {
      autoJoin: "allowlist",
      autoJoinAllowlist: ["!ops:example.org", "#support:example.org"],
      groups: {
        "!ops:example.org": { requireMention: true },
      },
    },
  },
}
```

要接受每个邀请，请使用 `autoJoin: "always"`。

### 白名单目标格式

私信和房间白名单最好用稳定 ID 填充：

- 私信（`dm.allowFrom`、`groupAllowFrom`、`groups.<room>.users`）：使用 `@user:server`。显示名称仅在 homeserver 目录返回唯一匹配时解析。
- 房间（`groups`、`autoJoinAllowlist`）：使用 `!room:server` 或 `#alias:server`。名称针对已加入的房间尽力解析；运行时无法解析的条目将被忽略。

### 账户 ID 规范化

向导将友好名称转换为规范化账户 ID。例如，`Ops Bot` 变为 `ops-bot`。标点符号在范围内的环境变量名称中转义，以防止两个账户冲突：`-` → `_X2D_`，因此 `ops-prod` 映射到 `MATRIX_OPS_X2D_PROD_*`。

### 缓存的凭据

Matrix 将缓存的凭据存储在 `~/.openclaw/credentials/matrix/` 下：

- 默认账户：`credentials.json`
- 命名账户：`credentials-<account>.json`

当缓存的凭据存在时，即使访问令牌不在配置文件中，OpenClaw 也会将 Matrix 视为已配置——这涵盖设置、`openclaw doctor` 和频道状态探测。

### 环境变量

当等效配置键未设置时使用。默认账户使用无前缀名称；命名账户在后缀前插入账户 ID。

| 默认账户              | 命名账户（`<ID>` 是规范化账户 ID） |
| --------------------- | ---------------------------------- |
| `MATRIX_HOMESERVER`   | `MATRIX_<ID>_HOMESERVER`           |
| `MATRIX_ACCESS_TOKEN` | `MATRIX_<ID>_ACCESS_TOKEN`         |
| `MATRIX_USER_ID`      | `MATRIX_<ID>_USER_ID`              |
| `MATRIX_PASSWORD`     | `MATRIX_<ID>_PASSWORD`             |
| `MATRIX_DEVICE_ID`    | `MATRIX_<ID>_DEVICE_ID`            |
| `MATRIX_DEVICE_NAME`  | `MATRIX_<ID>_DEVICE_NAME`          |
| `MATRIX_RECOVERY_KEY` | `MATRIX_<ID>_RECOVERY_KEY`         |

对于账户 `ops`，名称变为 `MATRIX_OPS_HOMESERVER`、`MATRIX_OPS_ACCESS_TOKEN` 等。恢复密钥环境变量由恢复感知的 CLI 流程（`verify backup restore`、`verify device`、`verify bootstrap`）在通过 `--recovery-key-stdin` 管道输入密钥时读取。

`MATRIX_HOMESERVER` 不能从工作区 `.env` 设置；请参阅[工作区 `.env` 文件](/gateway/security)。

## 配置示例

带私信配对、房间白名单和 E2EE 的实用基线：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      encryption: true,

      dm: {
        policy: "pairing",
        sessionScope: "per-room",
        threadReplies: "off",
      },

      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": { requireMention: true },
      },

      autoJoin: "allowlist",
      autoJoinAllowlist: ["!roomid:example.org"],
      threadReplies: "inbound",
      replyToMode: "off",
      streaming: "partial",
    },
  },
}
```

## 流式预览

Matrix 回复流式传输是可选的。`streaming` 控制 OpenClaw 如何投递进行中的助手回复；`blockStreaming` 控制每个已完成的块是否作为自己的 Matrix 消息保留。

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

要保持实时答案预览但隐藏中间工具/进度行，请使用对象形式：

```json5
{
  channels: {
    matrix: {
      streaming: {
        mode: "partial",
        preview: {
          toolProgress: false,
        },
      },
    },
  },
}
```

| `streaming`     | 行为                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| `"off"`（默认） | 等待完整回复，发送一次。`true` ↔ `"partial"`，`false` ↔ `"off"`。                                             |
| `"partial"`     | 随着模型写入当前块，就地编辑一条普通文本消息。普通 Matrix 客户端可能在第一次预览时通知，而不是在最终编辑时。  |
| `"quiet"`       | 与 `"partial"` 相同，但消息是非通知通知。只有当每用户推送规则与最终编辑匹配时，接收者才会收到通知（见下文）。 |

`blockStreaming` 独立于 `streaming`：

| `streaming`             | `blockStreaming: true`                   | `blockStreaming: false`（默认） |
| ----------------------- | ---------------------------------------- | ------------------------------- |
| `"partial"` / `"quiet"` | 当前块的实时草稿，已完成的块作为消息保留 | 当前块的实时草稿，就地完成      |
| `"off"`                 | 每个完成块一条通知 Matrix 消息           | 完整回复一条通知 Matrix 消息    |

说明：

- 如果预览超过 Matrix 每事件大小限制，OpenClaw 停止预览流式传输并回退到仅最终投递。
- 媒体回复总是正常发送附件。如果陈旧的预览无法安全重用，OpenClaw 在发送最终媒体回复之前对其进行编辑删除。
- Matrix 预览流式传输处于活动状态时，默认启用工具进度预览更新。设置 `streaming.preview.toolProgress: false` 以保持答案文本的预览编辑，但将工具进度保留在正常投递路径上。
- 预览编辑消耗额外的 Matrix API 调用。如果您想要最保守的速率限制配置，请保持 `streaming: "off"`。

## 审批元数据

Matrix 原生审批提示是带有 OpenClaw 特定自定义事件内容（在 `com.openclaw.approval` 下）的普通 `m.room.message` 事件。Matrix 允许自定义事件内容键，因此普通客户端仍然渲染文本正文，而 OpenClaw 感知的客户端可以读取结构化审批 id、类型、状态、可用决策和执行/插件详情。

当审批提示太长无法放入一个 Matrix 事件时，OpenClaw 将可见文本分块，并仅将 `com.openclaw.approval` 附加到第一个块。允许/拒绝决策的反应绑定到该第一个事件，因此长提示与单事件提示保持相同的审批目标。

### 安静最终预览的自托管推送规则

`streaming: "quiet"` 只在块或轮次完成后才通知接收者——每用户推送规则必须匹配最终预览标记。请参阅[安静预览的 Matrix 推送规则](/channels/matrix-push-rules)了解完整方法（接收者令牌、推送器检查、规则安装、每个 homeserver 的说明）。

## 机器人间房间

默认情况下，来自其他已配置 OpenClaw Matrix 账户的 Matrix 消息将被忽略。

当您有意需要智能体间 Matrix 流量时，使用 `allowBots`：

```json5
{
  channels: {
    matrix: {
      allowBots: "mentions", // true | "mentions"
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

- `allowBots: true` 在允许的房间和私信中接受来自其他已配置 Matrix 机器人账户的消息。
- `allowBots: "mentions"` 仅在这些消息在房间中可见地提及此机器人时才接受它们。私信仍然被允许。
- `groups.<room>.allowBots` 覆盖一个房间的账户级别设置。
- OpenClaw 仍然忽略来自相同 Matrix 用户 ID 的消息以避免自回复循环。
- Matrix 在这里不暴露原生机器人标志；OpenClaw 将"机器人撰写"视为"由此 OpenClaw 网关上的另一个已配置 Matrix 账户发送"。

在共享房间中启用机器人间流量时，请使用严格的房间白名单和提及要求。

## 加密和验证

在加密（E2EE）房间中，出站图像事件使用 `thumbnail_file`，以便图像预览与完整附件一起加密。未加密的房间仍然使用普通 `thumbnail_url`。无需配置——插件自动检测 E2EE 状态。

所有 `openclaw matrix` 命令都接受 `--verbose`（完整诊断）、`--json`（机器可读输出）和 `--account <id>`（多账户设置）。默认情况下，输出简洁，内部 SDK 日志安静。以下示例显示规范形式；根据需要添加标志。

### 启用加密

```bash
openclaw matrix encryption setup
```

引导秘密存储和交叉签名，根据需要创建房间密钥备份，然后打印状态和后续步骤。有用的标志：

- `--recovery-key <key>` 在引导之前应用恢复密钥（首选下面记录的 stdin 形式）
- `--force-reset-cross-signing` 丢弃当前交叉签名身份并创建新身份（谨慎使用）

对于新账户，在创建时启用 E2EE：

```bash
openclaw matrix account add \
  --homeserver https://matrix.example.org \
  --access-token syt_xxx \
  --enable-e2ee
```

`--encryption` 是 `--enable-e2ee` 的别名。

手动配置等效：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      encryption: true,
      dm: { policy: "pairing" },
    },
  },
}
```

### 状态和信任信号

```bash
openclaw matrix verify status
openclaw matrix verify status --include-recovery-key --json
```

`verify status` 报告三个独立的信任信号（`--verbose` 显示所有信号）：

- `Locally trusted`：仅受此客户端信任
- `Cross-signing verified`：SDK 通过交叉签名报告验证
- `Signed by owner`：由您自己的自签名密钥签名（仅诊断）

`Verified by owner` 只有在 `Cross-signing verified` 为 `yes` 时才变为 `yes`。仅本地信任或所有者签名是不够的。

`--allow-degraded-local-state` 无需先准备 Matrix 账户即可返回尽力诊断；对于离线或部分配置的探测很有用。

### 使用恢复密钥验证此设备

恢复密钥是敏感的——通过 stdin 管道传递，而不是在命令行上传递。设置 `MATRIX_RECOVERY_KEY`（或命名账户的 `MATRIX_<ID>_RECOVERY_KEY`）：

```bash
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
```

命令报告三种状态：

- `Recovery key accepted`：Matrix 接受了密钥用于秘密存储或设备信任。
- `Backup usable`：房间密钥备份可以用受信任的恢复材料加载。
- `Device verified by owner`：此设备具有完整的 Matrix 交叉签名身份信任。

即使恢复密钥解锁了备份材料，当完整身份信任不完整时，它也会以非零退出。在这种情况下，从另一个 Matrix 客户端完成自我验证：

```bash
openclaw matrix verify self
```

`verify self` 等待 `Cross-signing verified: yes` 才成功退出。使用 `--timeout-ms <ms>` 调整等待时间。

字面密钥形式 `openclaw matrix verify device "<recovery-key>"` 也被接受，但密钥会出现在您的 shell 历史中。

### 引导或修复交叉签名

```bash
openclaw matrix verify bootstrap
```

`verify bootstrap` 是加密账户的修复和设置命令。按顺序，它：

- 引导秘密存储，尽可能重用现有恢复密钥
- 引导交叉签名并上传缺失的公钥
- 标记并交叉签名当前设备
- 如果服务器端房间密钥备份不存在，则创建一个

如果 homeserver 需要 UIA 来上传交叉签名密钥，OpenClaw 首先尝试无认证，然后尝试 `m.login.dummy`，然后尝试 `m.login.password`（需要 `channels.matrix.password`）。

有用的标志：

- `--recovery-key-stdin`（与 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | …` 配对）或 `--recovery-key <key>`
- `--force-reset-cross-signing` 丢弃当前交叉签名身份（谨慎使用）

### 房间密钥备份

```bash
openclaw matrix verify backup status
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
```

`backup status` 显示服务器端备份是否存在以及此设备是否可以解密它。`backup restore` 将备份的房间密钥导入本地加密存储；如果恢复密钥已在磁盘上，您可以省略 `--recovery-key-stdin`。

用新的基线替换损坏的备份（接受丢失无法恢复的旧历史；如果当前备份密钥不可加载，也可以重新创建秘密存储）：

```bash
openclaw matrix verify backup reset --yes
```

只有在您有意希望之前的恢复密钥停止解锁新备份基线时才添加 `--rotate-recovery-key`。

### 列出、请求和响应验证

```bash
openclaw matrix verify list
```

列出所选账户的待处理验证请求。

```bash
openclaw matrix verify request --own-user
openclaw matrix verify request --user-id @ops:example.org --device-id ABCDEF
```

从此 OpenClaw 账户发送验证请求。`--own-user` 请求自我验证（您在同一用户的另一个 Matrix 客户端接受提示）；`--user-id`/`--device-id`/`--room-id` 针对其他人。`--own-user` 不能与其他定向标志组合。

对于较低级别的生命周期处理——通常在从另一个客户端遮蔽入站请求时——这些命令对特定请求 `<id>` 进行操作（由 `verify list` 和 `verify request` 打印）：

| 命令                                       | 目的                                                         |
| ------------------------------------------ | ------------------------------------------------------------ |
| `openclaw matrix verify accept <id>`       | 接受入站请求                                                 |
| `openclaw matrix verify start <id>`        | 启动 SAS 流程                                                |
| `openclaw matrix verify sas <id>`          | 打印 SAS 表情符号或十进制数                                  |
| `openclaw matrix verify confirm-sas <id>`  | 确认 SAS 与另一个客户端显示的匹配                            |
| `openclaw matrix verify mismatch-sas <id>` | 当表情符号或十进制数不匹配时拒绝 SAS                         |
| `openclaw matrix verify cancel <id>`       | 取消；接受可选的 `--reason <text>` 和 `--code <matrix-code>` |

`accept`、`start`、`sas`、`confirm-sas`、`mismatch-sas` 和 `cancel` 都接受 `--user-id` 和 `--room-id` 作为 DM 后续提示，当验证锚定到特定的直接消息房间时。

### 多账户说明

没有 `--account <id>` 时，Matrix CLI 命令使用隐式默认账户。如果您有多个命名账户且未设置 `channels.matrix.defaultAccount`，它们将拒绝猜测并要求您选择。当 E2EE 对命名账户禁用或不可用时，错误指向该账户的配置键，例如 `channels.matrix.accounts.assistant.encryption`。

<AccordionGroup>
  <Accordion title="启动行为">
    当 `encryption: true` 时，`startupVerification` 默认为 `"if-unverified"`。在启动时，未验证的设备在另一个 Matrix 客户端中请求自我验证，跳过重复项并应用冷却时间（默认 24 小时）。使用 `startupVerificationCooldownHours` 调整或使用 `startupVerification: "off"` 禁用。

    启动还运行保守的加密引导通道，重用当前秘密存储和交叉签名身份。如果引导状态损坏，即使没有 `channels.matrix.password`，OpenClaw 也会尝试受保护的修复；如果 homeserver 需要密码 UIA，启动记录警告并保持非致命。已有所有者签名的设备被保留。

    请参阅 [Matrix 迁移](/channels/matrix-migration) 了解完整的升级流程。

  </Accordion>

  <Accordion title="验证通知">
    Matrix 将验证生命周期通知作为 `m.notice` 消息发布到严格的 DM 验证房间：请求、就绪（带"通过表情符号验证"指南）、启动/完成以及可用时的 SAS（表情符号/十进制）详情。

    来自另一个 Matrix 客户端的入站请求被跟踪并自动接受。对于自我验证，一旦表情符号验证可用，OpenClaw 自动启动 SAS 流程并确认自己的一侧——您仍需要在您的 Matrix 客户端中比较并确认"它们匹配"。

    验证系统通知不会转发到智能体聊天管道。

  </Accordion>

  <Accordion title="已删除或无效的 Matrix 设备">
    如果 `verify status` 表明当前设备不再在 homeserver 上列出，请创建一个新的 OpenClaw Matrix 设备。对于密码登录：

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --user-id '@assistant:example.org' \
  --password '<password>' \
  --device-name OpenClaw-Gateway
```

    对于令牌认证，在您的 Matrix 客户端或管理员 UI 中创建新的访问令牌，然后更新 OpenClaw：

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --access-token '<token>'
```

    将 `assistant` 替换为失败命令中的账户 ID，或省略 `--account` 用于默认账户。

  </Accordion>

  <Accordion title="设备清理">
    旧的 OpenClaw 管理设备可能会积累。列出并清理：

```bash
openclaw matrix devices list
openclaw matrix devices prune-stale
```

  </Accordion>

  <Accordion title="加密存储">
    Matrix E2EE 使用官方 `matrix-js-sdk` Rust 加密路径，以 `fake-indexeddb` 作为 IndexedDB 垫片。加密状态持久化到 `crypto-idb-snapshot.json`（限制性文件权限）。

    加密运行时状态位于 `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 下，包括同步存储、加密存储、恢复密钥、IDB 快照、线程绑定和启动验证状态。当令牌更改但账户身份保持相同时，OpenClaw 重用最佳现有根，以便先前状态保持可见。

  </Accordion>
</AccordionGroup>

## 资料管理

更新所选账户的 Matrix 自我资料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

您可以在一次调用中传递两个选项。Matrix 直接接受 `mxc://` 头像 URL；当您传递 `http://` 或 `https://` 时，OpenClaw 首先上传文件并将解析的 `mxc://` URL 存储到 `channels.matrix.avatarUrl`（或每账户覆盖）中。

## 线程

Matrix 支持自动回复和消息工具发送的原生 Matrix 线程。两个独立的旋钮控制行为：

### 会话路由（`sessionScope`）

`dm.sessionScope` 决定 Matrix 私信房间如何映射到 OpenClaw 会话：

- `"per-user"`（默认）：与相同路由对等方的所有私信房间共享一个会话。
- `"per-room"`：每个 Matrix 私信房间获得自己的会话键，即使对等方相同。

显式对话绑定总是优先于 `sessionScope`，因此绑定的房间和线程保持其选择的目标会话。

### 回复线程（`threadReplies`）

`threadReplies` 决定机器人在哪里发布回复：

- `"off"`：回复是顶级的。入站线程消息保持在父会话上。
- `"inbound"`：仅当入站消息已经在该线程中时，才在线程内回复。
- `"always"`：在以触发消息为根的线程内回复；该对话从第一次触发起就通过匹配的线程范围会话路由。

`dm.threadReplies` 仅覆盖私信的此设置——例如，保持房间线程隔离同时保持私信平坦。

### 线程继承和斜杠命令

- 入站线程消息将线程根消息包含为额外的智能体上下文。
- 消息工具发送在针对同一房间（或同一私信用户目标）时自动继承当前 Matrix 线程，除非提供了显式的 `threadId`。
- 私信用户目标重用仅在当前会话元数据证明同一 Matrix 账户上的相同私信对等方时触发；否则 OpenClaw 回退到正常的用户范围路由。
- `/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 和线程绑定的 `/acp spawn` 都在 Matrix 房间和私信中有效。
- 顶级 `/focus` 在启用 `threadBindings.spawnSessions` 时创建新的 Matrix 线程并将其绑定到目标会话。
- 在现有 Matrix 线程内运行 `/focus` 或 `/acp spawn --thread here` 将该线程就地绑定。

当 OpenClaw 检测到一个 Matrix 私信房间与同一共享会话上的另一个私信房间冲突时，它在该房间中发布一次性 `m.notice`，指向 `/focus` 逃脱出口并建议更改 `dm.sessionScope`。该通知仅在启用线程绑定时出现。

## ACP 对话绑定

Matrix 房间、私信和现有 Matrix 线程可以在不更改聊天界面的情况下转变为持久 ACP 工作区。

快速操作员流程：

- 在您想要继续使用的 Matrix 私信、房间或现有线程中运行 `/acp spawn codex --bind here`。
- 在顶级 Matrix 私信或房间中，当前私信/房间保持聊天界面，未来消息路由到生成的 ACP 会话。
- 在现有 Matrix 线程内，`--bind here` 就地绑定该当前线程。
- `/new` 和 `/reset` 就地重置同一绑定 ACP 会话。
- `/acp close` 关闭 ACP 会话并移除绑定。

说明：

- `--bind here` 不创建子 Matrix 线程。
- `threadBindings.spawnSessions` 控制 `/acp spawn --thread auto|here`，其中 OpenClaw 需要创建或绑定子 Matrix 线程。

### 线程绑定配置

Matrix 从 `session.threadBindings` 继承全局默认值，还支持每频道覆盖：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSessions`
- `threadBindings.defaultSpawnContext`

Matrix 线程绑定会话生成默认开启：

- 设置 `threadBindings.spawnSessions: false` 以阻止顶级 `/focus` 和 `/acp spawn --thread auto|here` 创建/绑定 Matrix 线程。
- 设置 `threadBindings.defaultSpawnContext: "isolated"` 当原生子智能体线程生成不应派生父记录时。

## 反应

Matrix 支持出站反应、入站反应通知和确认反应。

出站反应工具由 `channels.matrix.actions.reactions` 控制：

- `react` 向 Matrix 事件添加反应。
- `reactions` 列出 Matrix 事件的当前反应摘要。
- `emoji=""` 移除该事件上机器人自己的反应。
- `remove: true` 仅从机器人移除指定的表情符号反应。

**解析顺序**（第一个定义的值获胜）：

| 设置                    | 顺序                                                                  |
| ----------------------- | --------------------------------------------------------------------- |
| `ackReaction`           | 每账户 → 频道 → `messages.ackReaction` → 智能体身份表情符号回退       |
| `ackReactionScope`      | 每账户 → 频道 → `messages.ackReactionScope` → 默认 `"group-mentions"` |
| `reactionNotifications` | 每账户 → 频道 → 默认 `"own"`                                          |

`reactionNotifications: "own"` 在 `m.reaction` 事件针对机器人撰写的 Matrix 消息时转发它们；`"off"` 禁用反应系统事件。反应移除不会被合成为系统事件，因为 Matrix 将其作为编辑删除而不是独立的 `m.reaction` 移除来显示。

## 历史上下文

- `channels.matrix.historyLimit` 控制当 Matrix 房间消息触发智能体时，作为 `InboundHistory` 包含的最近房间消息数量。回退到 `messages.groupChat.historyLimit`；如果两者都未设置，有效默认值为 `0`。设置 `0` 禁用。
- Matrix 房间历史仅限房间。私信继续使用普通会话历史。
- Matrix 房间历史是仅待处理的：OpenClaw 缓冲尚未触发回复的房间消息，然后在提及或其他触发到达时快照该窗口。
- 当前触发消息不包含在 `InboundHistory` 中；它保留在该轮次的主入站正文中。
- 同一 Matrix 事件的重试重用原始历史快照，而不是向前漂移到更新的房间消息。

## 上下文可见性

Matrix 支持补充房间上下文的共享 `contextVisibility` 控制，例如获取的回复文本、线程根和待处理历史。

- `contextVisibility: "all"` 是默认值。补充上下文按接收保留。
- `contextVisibility: "allowlist"` 将补充上下文过滤为活动房间/用户白名单检查允许的发送者。
- `contextVisibility: "allowlist_quote"` 的行为类似 `allowlist`，但仍然保留一个显式引用的回复。

此设置影响补充上下文可见性，而不是入站消息本身是否可以触发回复。
触发授权仍然来自 `groupPolicy`、`groups`、`groupAllowFrom` 和私信策略设置。

## 私信和房间策略

```json5
{
  channels: {
    matrix: {
      dm: {
        policy: "allowlist",
        allowFrom: ["@admin:example.org"],
        threadReplies: "off",
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": { requireMention: true },
      },
    },
  },
}
```

要在保持房间工作的同时完全静默私信，请设置 `dm.enabled: false`：

```json5
{
  channels: {
    matrix: {
      dm: { enabled: false },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
    },
  },
}
```

请参阅[群组](/channels/groups)了解提及门控和白名单行为。

Matrix 私信的配对示例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未批准的 Matrix 用户在批准之前持续发送消息，OpenClaw 重用相同的待处理配对码，并可能在短暂冷却后发送提醒回复，而不是铸造新码。

请参阅[配对](/channels/pairing)了解共享的私信配对流程和存储布局。

## 直接房间修复

如果直接消息状态漂移不同步，OpenClaw 可能会出现陈旧的 `m.direct` 映射，指向旧的单人房间而不是实时私信。检查对等方的当前映射：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

修复它：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

两个命令都接受 `--account <id>` 用于多账户设置。修复流程：

- 优先选择已在 `m.direct` 中映射的严格 1:1 私信
- 回退到与该用户的任何当前已加入的严格 1:1 私信
- 如果没有健康的私信存在，创建新的直接房间并重写 `m.direct`

它不会自动删除旧房间。它选择健康的私信并更新映射，以便未来的 Matrix 发送、验证通知和其他直接消息流以正确的房间为目标。

## 执行审批

Matrix 可以充当原生审批客户端。在 `channels.matrix.execApprovals` 下配置（或 `channels.matrix.accounts.<account>.execApprovals` 用于每账户覆盖）：

- `enabled`：通过 Matrix 原生提示投递审批。未设置或 `"auto"` 时，一旦至少一个审批者可以解析，Matrix 自动启用。显式设置 `false` 禁用。
- `approvers`：允许批准执行请求的 Matrix 用户 ID（`@owner:example.org`）。可选——回退到 `channels.matrix.dm.allowFrom`。
- `target`：提示去哪里。`"dm"`（默认）发送到审批者私信；`"channel"` 发送到原始 Matrix 房间或私信；`"both"` 发送到两者。
- `agentFilter` / `sessionFilter`：可选的白名单，控制哪些智能体/会话触发 Matrix 投递。

两种审批类型的授权略有不同：

- **执行审批**使用 `execApprovals.approvers`，回退到 `dm.allowFrom`。
- **插件审批**仅通过 `dm.allowFrom` 授权。

两种类型共享 Matrix 反应快捷方式和消息更新。审批者在主审批消息上看到反应快捷方式：

- `✅` 允许一次
- `❌` 拒绝
- `♾️` 始终允许（当有效执行策略允许时）

回退斜杠命令：`/approve <id> allow-once`、`/approve <id> allow-always`、`/approve <id> deny`。

只有已解析的审批者可以批准或拒绝。执行审批的频道投递包含命令文本——仅在受信任的房间中启用 `channel` 或 `both`。

相关：[执行审批](/tools/exec-approvals)。

## 斜杠命令

斜杠命令（`/new`、`/reset`、`/model`、`/focus`、`/unfocus`、`/agents`、`/session`、`/acp`、`/approve` 等）直接在私信中有效。在房间中，OpenClaw 还识别以机器人自己的 Matrix 提及为前缀的命令，因此 `@bot:server /new` 触发命令路径而无需自定义提及正则表达式。这使机器人在 Element 和类似客户端在用户制表补全机器人后键入命令时发出的房间风格 `@mention /command` 帖子中保持响应。

授权规则仍然适用：命令发送者必须满足与普通消息相同的私信或房间白名单/所有者策略。

## 多账户

```json5
{
  channels: {
    matrix: {
      enabled: true,
      defaultAccount: "assistant",
      dm: { policy: "pairing" },
      accounts: {
        assistant: {
          homeserver: "https://matrix.example.org",
          accessToken: "syt_assistant_xxx",
          encryption: true,
        },
        alerts: {
          homeserver: "https://matrix.example.org",
          accessToken: "syt_alerts_xxx",
          dm: {
            policy: "allowlist",
            allowFrom: ["@ops:example.org"],
            threadReplies: "off",
          },
        },
      },
    },
  },
}
```

**继承：**

- 顶级 `channels.matrix` 值作为命名账户的默认值，除非账户覆盖它们。
- 使用 `groups.<room>.account` 将继承的房间条目限定到特定账户。没有 `account` 的条目在账户之间共享；当默认账户在顶级配置时，`account: "default"` 仍然有效。

**默认账户选择：**

- 设置 `defaultAccount` 以选择隐式路由、探测和 CLI 命令偏好的命名账户。
- 如果您有多个账户且其中一个字面上名为 `default`，即使 `defaultAccount` 未设置，OpenClaw 也会隐式使用它。
- 如果您有多个命名账户且未选择默认值，CLI 命令拒绝猜测——设置 `defaultAccount` 或传递 `--account <id>`。
- 顶级 `channels.matrix.*` 块仅在其认证完整时（`homeserver` + `accessToken`，或 `homeserver` + `userId` + `password`）被视为隐式 `default` 账户。一旦缓存的凭据覆盖认证，命名账户可以从 `homeserver` + `userId` 发现。

**提升：**

- 当 OpenClaw 在修复或设置期间将单账户配置提升为多账户时，如果存在命名账户或 `defaultAccount` 已指向某个账户，它将保留现有的命名账户。只有 Matrix 认证/引导键移入提升的账户；共享的投递策略键保留在顶级。

请参阅[配置参考](/gateway/config-channels#multi-account-all-channels)了解共享的多账户模式。

## 私有/LAN homeserver

默认情况下，OpenClaw 阻止私有/内部 Matrix homeserver 以防止 SSRF，除非您按账户显式选择。

如果您的 homeserver 在 localhost、LAN/Tailscale IP 或内部主机名上运行，请为该 Matrix 账户启用 `network.dangerouslyAllowPrivateNetwork`：

```json5
{
  channels: {
    matrix: {
      homeserver: "http://matrix-synapse:8008",
      network: {
        dangerouslyAllowPrivateNetwork: true,
      },
      accessToken: "syt_internal_xxx",
    },
  },
}
```

CLI 设置示例：

```bash
openclaw matrix account add \
  --account ops \
  --homeserver http://matrix-synapse:8008 \
  --allow-private-network \
  --access-token syt_ops_xxx
```

此选择只允许受信任的私有/内部目标。公共明文 homeserver（如 `http://matrix.example.org:8008`）仍然被阻止。尽可能首选 `https://`。

## 代理 Matrix 流量

如果您的 Matrix 部署需要显式的出站 HTTP(S) 代理，请设置 `channels.matrix.proxy`：

```json5
{
  channels: {
    matrix: {
      homeserver: "https://matrix.example.org",
      accessToken: "syt_bot_xxx",
      proxy: "http://127.0.0.1:7890",
    },
  },
}
```

命名账户可以使用 `channels.matrix.accounts.<id>.proxy` 覆盖顶级默认值。
OpenClaw 对运行时 Matrix 流量和账户状态探测使用相同的代理设置。

## 目标解析

Matrix 在 OpenClaw 要求您提供房间或用户目标的任何地方都接受这些目标形式：

- 用户：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房间：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 别名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

Matrix 房间 ID 区分大小写。在配置显式投递目标、cron 作业、绑定或白名单时，使用 Matrix 中的确切房间 ID 大小写。
OpenClaw 保持内部会话键规范用于存储，因此这些小写键不是 Matrix 投递 ID 的可靠来源。

实时目录查找使用已登录的 Matrix 账户：

- 用户查找查询该 homeserver 上的 Matrix 用户目录。
- 房间查找直接接受显式房间 ID 和别名，然后回退到搜索该账户的已加入房间名称。
- 已加入房间名称查找是尽力的。如果房间名称无法解析为 ID 或别名，运行时白名单解析将忽略它。

## 配置参考

白名单样式字段（`groupAllowFrom`、`dm.allowFrom`、`groups.<room>.users`）接受完整 Matrix 用户 ID（最安全）。确切目录匹配在启动时以及监视器运行时白名单更改时解析；运行时无法解析的条目将被忽略。出于同样原因，房间白名单首选房间 ID 或别名。

### 账户和连接

- `enabled`：启用或禁用频道。
- `name`：账户的可选显示标签。
- `defaultAccount`：配置了多个 Matrix 账户时的首选账户 ID。
- `accounts`：命名的每账户覆盖。顶级 `channels.matrix` 值作为默认值继承。
- `homeserver`：homeserver URL，例如 `https://matrix.example.org`。
- `network.dangerouslyAllowPrivateNetwork`：允许此账户连接到 `localhost`、LAN/Tailscale IP 或内部主机名。
- `proxy`：Matrix 流量的可选 HTTP(S) 代理 URL。支持每账户覆盖。
- `userId`：完整 Matrix 用户 ID（`@bot:example.org`）。
- `accessToken`：基于令牌认证的访问令牌。支持跨 env/file/exec 提供商的明文和 SecretRef 值（[密钥管理](/gateway/secrets)）。
- `password`：基于密码登录的密码。支持明文和 SecretRef 值。
- `deviceId`：显式 Matrix 设备 ID。
- `deviceName`：密码登录时使用的设备显示名称。
- `avatarUrl`：存储的用于资料同步和 `profile set` 更新的自我头像 URL。
- `initialSyncLimit`：启动同步期间获取的最大事件数。

### 加密

- `encryption`：启用 E2EE。默认：`false`。
- `startupVerification`：`"if-unverified"`（E2EE 开启时的默认值）或 `"off"`。当此设备未验证时，在启动时自动请求自我验证。
- `startupVerificationCooldownHours`：下一次自动启动请求之前的冷却时间。默认：`24`。

### 访问和策略

- `groupPolicy`：`"open"`、`"allowlist"` 或 `"disabled"`。默认：`"allowlist"`。
- `groupAllowFrom`：房间流量的用户 ID 白名单。
- `dm.enabled`：当 `false` 时，忽略所有私信。默认：`true`。
- `dm.policy`：`"pairing"`（默认）、`"allowlist"`、`"open"` 或 `"disabled"`。在机器人加入并将房间分类为私信后适用；不影响邀请处理。
- `dm.allowFrom`：私信流量的用户 ID 白名单。
- `dm.sessionScope`：`"per-user"`（默认）或 `"per-room"`。
- `dm.threadReplies`：仅私信的回复线程覆盖（`"off"`、`"inbound"`、`"always"`）。
- `allowBots`：接受来自其他已配置 Matrix 机器人账户的消息（`true` 或 `"mentions"`）。
- `allowlistOnly`：当 `true` 时，强制所有活动私信策略（除 `"disabled"` 外）和 `"open"` 群组策略为 `"allowlist"`。不更改 `"disabled"` 策略。
- `autoJoin`：`"always"`、`"allowlist"` 或 `"off"`。默认：`"off"`。适用于每个 Matrix 邀请，包括私信类型的邀请。
- `autoJoinAllowlist`：`autoJoin` 为 `"allowlist"` 时允许的房间/别名。别名条目针对 homeserver 解析，而不是针对被邀请房间声明的状态。
- `contextVisibility`：补充上下文可见性（`"all"` 默认，`"allowlist"`，`"allowlist_quote"`）。

### 回复行为

- `replyToMode`：`"off"`、`"first"`、`"all"` 或 `"batched"`。
- `threadReplies`：`"off"`、`"inbound"` 或 `"always"`。
- `threadBindings`：线程绑定会话路由和生命周期的每频道覆盖。
- `streaming`：`"off"`（默认）、`"partial"`、`"quiet"` 或对象形式 `{ mode, preview: { toolProgress } }`。`true` ↔ `"partial"`，`false` ↔ `"off"`。
- `blockStreaming`：当 `true` 时，已完成的助手块作为单独的进度消息保留。
- `markdown`：出站文本的可选 Markdown 渲染配置。
- `responsePrefix`：出站回复前面可选的字符串。
- `textChunkLimit`：`chunkMode: "length"` 时的出站块大小（字符）。默认：`4000`。
- `chunkMode`：`"length"`（默认，按字符数分割）或 `"newline"`（按行边界分割）。
- `historyLimit`：当房间消息触发智能体时，作为 `InboundHistory` 包含的最近房间消息数。回退到 `messages.groupChat.historyLimit`；有效默认值 `0`（禁用）。
- `mediaMaxMb`：出站发送和入站处理的媒体大小上限（MB）。

### 反应设置

- `ackReaction`：此频道/账户的确认反应覆盖。
- `ackReactionScope`：范围覆盖（`"group-mentions"` 默认，`"group-all"`，`"direct"`，`"all"`，`"none"`，`"off"`）。
- `reactionNotifications`：入站反应通知模式（`"own"` 默认，`"off"`）。

### 工具和每房间覆盖

- `actions`：每操作工具门控（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。
- `groups`：每房间策略映射。会话标识在解析后使用稳定房间 ID。（`rooms` 是旧版别名。）
  - `groups.<room>.account`：将一个继承的房间条目限制到特定账户。
  - `groups.<room>.allowBots`：频道级别设置的每房间覆盖（`true` 或 `"mentions"`）。
  - `groups.<room>.users`：每房间发送者白名单。
  - `groups.<room>.tools`：每房间工具允许/拒绝覆盖。
  - `groups.<room>.autoReply`：每房间提及门控覆盖。`true` 禁用该房间的提及要求；`false` 强制恢复。
  - `groups.<room>.skills`：每房间技能过滤器。
  - `groups.<room>.systemPrompt`：每房间系统提示片段。

### 执行审批设置

- `execApprovals.enabled`：通过 Matrix 原生提示投递执行审批。
- `execApprovals.approvers`：允许批准的 Matrix 用户 ID。回退到 `dm.allowFrom`。
- `execApprovals.target`：`"dm"`（默认）、`"channel"` 或 `"both"`。
- `execApprovals.agentFilter` / `execApprovals.sessionFilter`：投递的可选智能体/会话白名单。

## 相关文档

- [频道概述](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私信认证和配对流程
- [群组](/channels/groups) — 群组聊天行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和安全加固
