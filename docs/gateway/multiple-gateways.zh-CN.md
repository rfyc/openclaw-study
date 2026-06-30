---
summary: "在同一主机上运行多个 OpenClaw 网关（隔离、端口和配置文件）"
read_when:
  - 在同一台机器上运行多个网关
  - 你需要每个网关具有独立的配置/状态/端口
title: "多网关"
---

大多数设置应使用一个网关，因为单个网关可以处理多个消息连接和代理。如果你需要更强的隔离或冗余（例如救援机器人），请使用隔离的配置文件/端口运行独立的网关。

## 最佳推荐设置

对于大多数用户，最简单的救援机器人设置是：

- 让主机器人保持在默认配置文件上
- 在 `--profile rescue` 上运行救援机器人
- 为救援账户使用完全独立的 Telegram 机器人
- 让救援机器人使用不同的基础端口，例如 `19789`

这使救援机器人与主机器人隔离，以便在主机器人宕机时可以调试或应用配置更改。在基础端口之间至少留 20 个端口，以确保派生的浏览器/canvas/CDP 端口永不冲突。

## 救援机器人快速入门

除非你有充分的理由做其他事情，否则将此作为默认路径：

```bash
# 救援机器人（独立的 Telegram 机器人，独立的配置文件，端口 19789）
openclaw --profile rescue onboard
openclaw --profile rescue gateway install --port 19789
```

如果你的主机器人已经在运行，这通常就是你所需要的全部。

在 `openclaw --profile rescue onboard` 期间：

- 使用独立的 Telegram 机器人令牌
- 保持 `rescue` 配置文件
- 使用比主机器人至少高 20 的基础端口
- 接受默认的救援工作区，除非你已经自己管理一个

如果入门程序已经为你安装了救援服务，则不需要最后的 `gateway install`。

## 为什么这样有效

救援机器人保持独立，因为它有自己的：

- 配置文件/配置
- 状态目录
- 工作区
- 基础端口（加上派生端口）
- Telegram 机器人令牌

对于大多数设置，为救援配置文件使用完全独立的 Telegram 机器人：

- 易于保持仅操作员访问
- 独立的机器人令牌和身份
- 独立于主机器人的渠道/应用安装
- 当主机器人损坏时简单的基于 DM 的恢复路径

## `--profile rescue onboard` 的更改内容

`openclaw --profile rescue onboard` 使用正常的入门流程，但它将所有内容写入独立的配置文件。

实际上，这意味着救援机器人获得自己的：

- 配置文件
- 状态目录
- 工作区（默认为 `~/.openclaw/workspace-rescue`）
- 托管服务名称

其他提示与正常入门相同。

## 通用多网关设置

上面的救援机器人布局是最简单的默认设置，但相同的隔离模式适用于同一主机上的任何一对或一组网关。

对于更通用的设置，为每个额外的网关提供其自己的命名配置文件和自己的基础端口：

```bash
# 主网关（默认配置文件）
openclaw setup
openclaw gateway --port 18789

# 额外网关
openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

如果你希望两个网关都使用命名配置文件，这也可以：

```bash
openclaw --profile main setup
openclaw --profile main gateway --port 18789

openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

服务遵循相同的模式：

```bash
openclaw gateway install
openclaw --profile ops gateway install --port 19789
```

当你想要备用操作员通道时，使用救援机器人快速入门。当你想要多个长期运行的网关用于不同渠道、租户、工作区或操作角色时，使用通用配置文件模式。

## 隔离清单

每个网关实例保持这些唯一：

- `OPENCLAW_CONFIG_PATH` — 每实例配置文件
- `OPENCLAW_STATE_DIR` — 每实例会话、凭据、缓存
- `agents.defaults.workspace` — 每实例工作区根目录
- `gateway.port`（或 `--port`）— 每实例唯一
- 派生的浏览器/canvas/CDP 端口

如果这些是共享的，你将遇到配置竞争和端口冲突。

## 端口映射（派生）

基础端口 = `gateway.port`（或 `OPENCLAW_GATEWAY_PORT` / `--port`）。

- 浏览器控制服务端口 = 基础端口 + 2（仅环回）
- canvas 主机在网关 HTTP 服务器上提供服务（与 `gateway.port` 相同端口）
- 浏览器配置文件 CDP 端口从 `browser.controlPort + 9 .. + 108` 自动分配

如果你在配置或环境变量中覆盖这些，你必须保持每实例唯一。

## 浏览器/CDP 注意事项（常见陷阱）

- **不要**将 `browser.cdpUrl` 固定为多个实例上的相同值。
- 每个实例需要自己的浏览器控制端口和 CDP 范围（从其网关端口派生）。
- 如果你需要明确的 CDP 端口，每实例设置 `browser.profiles.<name>.cdpPort`。
- 远程 Chrome：使用 `browser.profiles.<name>.cdpUrl`（每配置文件，每实例）。

## 手动环境变量示例

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/main.json \
OPENCLAW_STATE_DIR=~/.openclaw \
openclaw gateway --port 18789

OPENCLAW_CONFIG_PATH=~/.openclaw/rescue.json \
OPENCLAW_STATE_DIR=~/.openclaw-rescue \
openclaw gateway --port 19789
```

## 快速检查

```bash
openclaw gateway status --deep
openclaw --profile rescue gateway status --deep
openclaw --profile rescue gateway probe
openclaw status
openclaw --profile rescue status
openclaw --profile rescue browser status
```

说明：

- `gateway status --deep` 有助于发现旧安装中过时的 launchd/systemd/schtasks 服务。
- `gateway probe` 警告文本如 `multiple reachable gateways detected` 仅在你有意运行多个隔离网关时才是预期的。

## 相关链接

- [网关运行手册](/gateway)
- [网关锁](/gateway/gateway-lock)
- [配置](/gateway/configuration)
