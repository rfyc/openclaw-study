---
summary: "Crestodian 的 CLI 参考和安全模型——无配置安全的设置和修复辅助工具"
read_when:
  - 你不带命令运行 openclaw 并想了解 Crestodian
  - 你需要一种无配置安全的方式来检查或修复 OpenClaw
  - 你正在设计或启用消息频道救援模式
title: "Crestodian"
---

# `openclaw crestodian`

Crestodian 是 OpenClaw 的本地设置、修复和配置辅助工具。它被设计为在正常 agent 路径中断时仍然可以访问。

不带命令运行 `openclaw` 会在交互式终端中启动 Crestodian。
运行 `openclaw crestodian` 会显式启动同样的辅助工具。

## Crestodian 显示的内容

启动时，交互式 Crestodian 会打开与 `openclaw tui` 使用的同样的 TUI shell，使用 Crestodian 聊天后端。聊天日志以简短的问候语开始：

- 何时启动 Crestodian
- Crestodian 实际使用的模型或确定性规划器路径
- 配置有效性和默认 agent
- 首次启动探测后的 Gateway 可达性
- Crestodian 接下来可以采取的调试操作

它不会仅为启动就转储密钥或加载插件 CLI 命令。TUI 仍然提供正常的标题、聊天日志、状态行、页脚、自动完成和编辑器控件。

使用 `status` 获取详细清单，包括配置路径、文档/源路径、本地 CLI 探测、API 密钥存在性、agent、模型和 Gateway 详情。

Crestodian 使用与普通 agent 相同的 OpenClaw 参考发现。在 Git 检出中，它将自身指向本地 `docs/` 和本地源树。在 npm 包安装中，它使用捆绑的包文档并链接到 [https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)，并在文档不足时明确指导查看源代码。

## 示例

```bash
openclaw
openclaw crestodian
openclaw crestodian --json
openclaw crestodian --message "models"
openclaw crestodian --message "validate config"
openclaw crestodian --message "setup workspace ~/Projects/work model openai/gpt-5.5" --yes
openclaw crestodian --message "set default model openai/gpt-5.5" --yes
openclaw onboard --modern
```

在 Crestodian TUI 内部：

```text
status
health
doctor
doctor fix
validate config
setup
setup workspace ~/Projects/work model openai/gpt-5.5
config set gateway.port 19001
config set-ref gateway.auth.token env OPENCLAW_GATEWAY_TOKEN
gateway status
restart gateway
agents
create agent work workspace ~/Projects/work
models
set default model openai/gpt-5.5
plugins list
plugins search slack
plugin install clawhub:openclaw-codex-app-server
plugin uninstall openclaw-codex-app-server
talk to work agent
talk to agent for ~/Projects/work
audit
quit
```

## 安全启动

Crestodian 的启动路径故意很小。它可以在以下情况下运行：

- `openclaw.json` 缺失
- `openclaw.json` 无效
- Gateway 已宕机
- 插件命令注册不可用
- 尚未配置任何 agent

`openclaw --help` 和 `openclaw --version` 仍然使用正常的快速路径。
非交互式 `openclaw` 退出时显示简短消息，而不是打印根帮助，因为无命令产品就是 Crestodian。

## 操作和审批

Crestodian 使用类型化操作，而不是临时编辑配置。

只读操作可以立即运行：

- 显示概览
- 列出 agent
- 列出已安装的插件
- 搜索 ClawHub 插件
- 显示模型/后端状态
- 运行状态或健康检查
- 检查 Gateway 可达性
- 无交互修复地运行 doctor
- 验证配置
- 显示审计日志路径

持久性操作在交互式模式下需要对话审批，除非你对直接命令传递 `--yes`：

- 写入配置
- 运行 `config set`
- 通过 `config set-ref` 设置支持的 SecretRef 值
- 运行设置/引导初始化
- 更改默认模型
- 启动、停止或重启 Gateway
- 创建 agent
- 从 ClawHub 或 npm 安装插件
- 卸载插件
- 运行重写配置或状态的 doctor 修复

已应用的写入记录在：

```text
~/.openclaw/audit/crestodian.jsonl
```

发现不会被审计。只记录已应用的操作和写入。

`openclaw onboard --modern` 将 Crestodian 作为现代引导预览启动。
普通的 `openclaw onboard` 仍然运行经典引导。

## 设置初始化

`setup` 是以聊天为首的引导初始化。它仅通过类型化配置操作写入，并首先请求审批。

```text
setup
setup workspace ~/Projects/work
setup workspace ~/Projects/work model openai/gpt-5.5
```

当没有配置模型时，setup 按此顺序选择第一个可用的后端并告知你它的选择：

- 现有的显式模型（如果已配置）
- `OPENAI_API_KEY` -> `openai/gpt-5.5`
- `ANTHROPIC_API_KEY` -> `anthropic/claude-opus-4-7`
- Claude Code CLI -> `claude-cli/claude-opus-4-7`
- Codex CLI -> `codex-cli/gpt-5.5`

如果没有任何可用，setup 仍然会写入默认工作区，并保留模型未设置。安装或登录 Codex/Claude Code，或暴露 `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`，然后再次运行 setup。

## 模型辅助规划器

Crestodian 始终以确定性模式启动。对于确定性解析器不理解的模糊命令，本地 Crestodian 可以通过 OpenClaw 的正常运行时路径进行一次有限的规划器回合。它首先使用配置的 OpenClaw 模型。如果还没有可用的配置模型，它可以回退到机器上已存在的本地运行时：

- Claude Code CLI：`claude-cli/claude-opus-4-7`
- Codex app-server 执行器：`openai/gpt-5.5`，带 `agentRuntime.id: "codex"`
- Codex CLI：`codex-cli/gpt-5.5`

模型辅助规划器无法直接修改配置。它必须将请求转换为 Crestodian 的一个类型化命令，然后应用正常的审批和审计规则。Crestodian 在运行任何内容之前会打印它使用的模型和解释的命令。无配置回退规划器回合是临时的，在运行时支持的情况下禁用工具，并使用临时工作区/会话。

消息频道救援模式不使用模型辅助规划器。远程救援保持确定性，这样损坏或被入侵的正常 agent 路径就不能被用作配置编辑器。

## 切换到 agent

使用自然语言选择器离开 Crestodian 并打开正常的 TUI：

```text
talk to agent
talk to work agent
switch to main agent
```

`openclaw tui`、`openclaw chat` 和 `openclaw terminal` 仍然直接打开正常的 agent TUI。它们不启动 Crestodian。

切换到正常的 TUI 后，使用 `/crestodian` 返回 Crestodian。
你可以包含后续请求：

```text
/crestodian
/crestodian restart gateway
```

TUI 内的 agent 切换会留下 `/crestodian` 可用的痕迹。

## 消息救援模式

消息救援模式是 Crestodian 的消息频道入口点。适用于正常 agent 已死亡，但受信任的频道（如 WhatsApp）仍然接收命令的情况。

支持的文本命令：

- `/crestodian <request>`

操作员流程：

```text
你，在受信任的所有者 DM 中: /crestodian status
OpenClaw: Crestodian rescue mode. Gateway reachable: no. Config valid: no.
你: /crestodian restart gateway
OpenClaw: Plan: restart the Gateway. Reply /crestodian yes to apply.
你: /crestodian yes
OpenClaw: Applied. Audit entry written.
```

Agent 创建也可以从本地提示或救援模式排队：

```text
create agent work workspace ~/Projects/work model openai/gpt-5.5
/crestodian create agent work workspace ~/Projects/work
```

远程救援模式是一个管理界面。它必须像远程配置修复一样对待，而不是像普通聊天。

远程救援的安全契约：

- 当沙箱处于活动状态时禁用。如果 agent/会话被沙箱化，Crestodian 必须拒绝远程救援并解释需要本地 CLI 修复。
- 默认有效状态是 `auto`：仅在受信任的 YOLO 操作中允许远程救援，在该操作中，运行时已经具有无沙箱的本地权限。
- 需要明确的所有者身份。救援不得接受通配符发件人规则、开放组策略、未认证的 webhook 或匿名频道。
- 默认仅限所有者 DM。群组/频道救援需要明确选择加入。
- 插件搜索和列表是只读的。插件安装默认仅限本地，因为它会下载可执行代码。当救援策略允许持久写入时，插件卸载可以作为已审批的修复操作允许。
- 远程救援无法打开本地 TUI 或切换到交互式 agent 会话。使用本地 `openclaw` 进行 agent 切换。
- 持久写入仍然需要审批，即使在救援模式下。
- 审计每个已应用的救援操作。消息频道救援记录频道、账户、发件人和源地址元数据。配置变更操作还记录变更前后的配置哈希。
- 永远不回显密钥。SecretRef 检查应报告可用性，而不是值。
- 如果 Gateway 处于活动状态，优先使用 Gateway 类型化操作。如果 Gateway 已死亡，仅使用不依赖正常 agent 循环的最小本地修复界面。

配置形状：

```jsonc
{
  "crestodian": {
    "rescue": {
      "enabled": "auto",
      "ownerDmOnly": true,
    },
  },
}
```

`enabled` 应接受：

- `"auto"`：默认值。仅当有效运行时为 YOLO 且沙箱关闭时允许。
- `false`：永不允许消息频道救援。
- `true`：当所有者/频道检查通过时明确允许救援。这仍然不得绕过沙箱拒绝。

默认的 `"auto"` YOLO 姿态是：

- 沙箱模式解析为 `off`
- `tools.exec.security` 解析为 `full`
- `tools.exec.ask` 解析为 `off`

远程救援由 Docker 通道覆盖：

```bash
pnpm test:docker:crestodian-rescue
```

无配置本地规划器回退由以下覆盖：

```bash
pnpm test:docker:crestodian-planner
```

通过救援处理器的可选实时频道命令界面冒烟检查 `/crestodian status` 加上持久审批往返：

```bash
pnpm test:live:crestodian-rescue-channel
```

通过 Crestodian 进行的全新无配置设置由以下覆盖：

```bash
pnpm test:docker:crestodian-first-run
```

该通道以空状态目录开始，将裸 `openclaw` 路由到 Crestodian，设置默认模型，创建额外的 agent，通过插件启用加令牌 SecretRef 配置 Discord，验证配置，并检查审计日志。QA Lab 也有同样 Ring 0 流程的 repo 支持场景：

```bash
pnpm openclaw qa suite --scenario crestodian-ring-zero-setup
```

## 相关

- [CLI 参考](/cli)
- [Doctor](/cli/doctor)
- [TUI](/cli/tui)
- [Sandbox](/cli/sandbox)
- [Security](/cli/security)
