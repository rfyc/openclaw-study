---
summary: "Zalo 个人版插件：通过原生 zca-js 进行 QR 登录和消息发送（插件安装 + 频道配置 + 工具）"
read_when:
  - 你希望在 OpenClaw 中使用 Zalo 个人版（非官方）
  - 你正在配置或开发 zalouser 插件
title: "Zalo 个人版插件"
---

# Zalo 个人版（插件）

通过插件为 OpenClaw 提供 Zalo 个人版支持，使用原生 `zca-js` 自动化普通 Zalo 用户账户。

<Warning>
非官方自动化可能导致账户被暂停或封禁。使用需自行承担风险。
</Warning>

## 命名说明

频道 id 为 `zalouser`，以明确表示这是自动化**个人 Zalo 用户账户**（非官方）。我们保留 `zalo` 用于潜在的未来官方 Zalo API 集成。

## 运行位置

此插件在 **Gateway 进程内**运行。

如果你使用远程 Gateway，请在**运行 Gateway 的机器**上安装/配置它，然后重启 Gateway。

无需外部 `zca`/`openzca` CLI 二进制文件。

## 安装

### 方案 A：从 npm 安装

```bash
openclaw plugins install @openclaw/zalouser
```

使用裸包名称以跟随当前官方发布标签。只有在需要可重现安装时才固定精确版本。

安装后重启 Gateway。

### 方案 B：从本地文件夹安装（开发）

```bash
PLUGIN_SRC=./path/to/local/zalouser-plugin
openclaw plugins install "$PLUGIN_SRC"
cd "$PLUGIN_SRC" && pnpm install
```

安装后重启 Gateway。

## 配置

频道配置位于 `channels.zalouser` 下（而不是 `plugins.entries.*`）：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

## CLI

```bash
openclaw channels login --channel zalouser
openclaw channels logout --channel zalouser
openclaw channels status --probe
openclaw message send --channel zalouser --target <threadId> --message "Hello from OpenClaw"
openclaw directory peers list --channel zalouser --query "name"
```

## Agent 工具

工具名称：`zalouser`

操作：`send`、`image`、`link`、`friends`、`groups`、`me`、`status`

频道消息操作还支持 `react` 用于消息表情回应。

## 相关文档

- [构建插件](/plugins/building-plugins)
- [社区插件](/plugins/community)
