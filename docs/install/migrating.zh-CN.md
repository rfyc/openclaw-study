---
summary: "迁移中心：跨系统导入、机器间迁移和插件升级"
read_when:
  - 您正在将 OpenClaw 迁移到新笔记本电脑或服务器
  - 您来自另一个代理系统，希望保留状态
  - 您正在就地升级插件
title: "迁移指南"
---

OpenClaw 支持三种迁移路径：从另一个代理系统导入、将现有安装迁移到新机器，以及就地升级插件。

## 从另一个代理系统导入

使用内置的迁移提供程序将指令、MCP 服务器、技能、模型配置和（可选）API 密钥导入 OpenClaw。计划在任何更改之前进行预览，报告中编辑密钥，应用有已验证的备份支持。

<CardGroup cols={2}>
  <Card title="从 Claude 迁移" href="/install/migrating-claude" icon="brain">
    导入 Claude Code 和 Claude Desktop 状态，包括 `CLAUDE.md`、MCP 服务器、技能和项目命令。
  </Card>
  <Card title="从 Hermes 迁移" href="/install/migrating-hermes" icon="feather">
    导入 Hermes 配置、提供商、MCP 服务器、记忆、技能和支持的 `.env` 密钥。
  </Card>
</CardGroup>

CLI 入口点是 [`openclaw migrate`](/cli/migrate)。入门在检测到已知来源时也可以提供迁移（`openclaw onboard --flow import`）。

## 将 OpenClaw 迁移到新机器

复制**状态目录**（默认 `~/.openclaw/`）和您的**工作区**以保留：

- **配置** — `openclaw.json` 和所有网关设置。
- **认证** — 每个代理的 `auth-profiles.json`（API 密钥加 OAuth），以及 `credentials/` 下的任何频道或提供商状态。
- **会话** — 对话历史和代理状态。
- **频道状态** — WhatsApp 登录、Telegram 会话等。
- **工作区文件** — `MEMORY.md`、`USER.md`、技能和提示。

<Tip>
在旧机器上运行 `openclaw status` 以确认您的状态目录路径。自定义配置文件使用 `~/.openclaw-<profile>/` 或通过 `OPENCLAW_STATE_DIR` 设置的路径。
</Tip>

### 迁移步骤

<Steps>
  <Step title="停止网关并备份">
    在**旧**机器上，停止网关以便文件在复制过程中不会改变，然后归档：

    ```bash
    openclaw gateway stop
    cd ~
    tar -czf openclaw-state.tgz .openclaw
    ```

    如果您使用多个配置文件（例如 `~/.openclaw-work`），分别归档每个。

  </Step>

  <Step title="在新机器上安装 OpenClaw">
    在新机器上[安装](/install) CLI（如果需要，还要安装 Node）。入门创建全新的 `~/.openclaw/` 是可以的。您接下来将覆盖它。
  </Step>

  <Step title="复制状态目录和工作区">
    通过 `scp`、`rsync -a` 或外部驱动器传输归档，然后提取：

    ```bash
    cd ~
    tar -xzf openclaw-state.tgz
    ```

    确保包含了隐藏目录，文件所有权与将运行网关的用户匹配。

  </Step>

  <Step title="运行 doctor 并验证">
    在新机器上，运行 [Doctor](/gateway/doctor) 以应用配置迁移并修复服务：

    ```bash
    openclaw doctor
    openclaw gateway restart
    openclaw status
    ```

  </Step>
</Steps>

如果 Telegram 或 Discord 使用默认环境变量回退（`TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN`），在不打印密钥值的情况下验证迁移的状态目录 `.env` 包含这些密钥：

```bash
awk -F= '/^(TELEGRAM_BOT_TOKEN|DISCORD_BOT_TOKEN)=/ { print $1 "=present" }' ~/.openclaw/.env
```

当启用的默认 Telegram 或 Discord 账户没有配置的令牌，且匹配的环境变量对 doctor 进程不可用时，`openclaw doctor` 也会发出警告。

### 常见陷阱

<AccordionGroup>
  <Accordion title="配置文件或状态目录不匹配">
    如果旧网关使用了 `--profile` 或 `OPENCLAW_STATE_DIR`，而新网关没有，频道将显示为已注销，会话将为空。使用与您迁移时相同的配置文件或状态目录启动网关，然后重新运行 `openclaw doctor`。
  </Accordion>

  <Accordion title="仅复制 openclaw.json">
    仅配置文件是不够的。模型认证配置文件存储在 `agents/<agentId>/agent/auth-profiles.json` 下，频道和提供商状态存储在 `credentials/` 下。始终迁移**整个**状态目录。
  </Accordion>

  <Accordion title="权限和所有权">
    如果您以 root 身份复制或切换了用户，网关可能无法读取凭据。确保状态目录和工作区由运行网关的用户拥有。
  </Accordion>

  <Accordion title="远程模式">
    如果您的 UI 指向**远程**网关，远程主机拥有会话和工作区。迁移网关主机本身，而非您的本地笔记本电脑。请参见 [FAQ](/help/faq#where-things-live-on-disk)。
  </Accordion>

  <Accordion title="备份中的密钥">
    状态目录包含认证配置文件、频道凭据和其他提供商状态。将备份加密存储，避免不安全的传输渠道，如果怀疑泄露则轮换密钥。
  </Accordion>
</AccordionGroup>

### 验证清单

在新机器上确认：

- [ ] `openclaw status` 显示网关正在运行。
- [ ] 频道仍然已连接（无需重新配对）。
- [ ] 仪表板打开并显示现有会话。
- [ ] 工作区文件（记忆、配置）存在。

## 就地升级插件

就地插件升级保留相同的插件 ID 和配置键，但可能会将磁盘状态移动到当前布局中。插件特定的升级指南与其频道一起存储：

- [Matrix 迁移](/channels/matrix-migration)：加密状态恢复限制、自动快照行为和手动恢复命令。

## 相关

- [`openclaw migrate`](/cli/migrate)：跨系统导入的 CLI 参考。
- [安装概述](/install)：所有安装方法。
- [Doctor](/gateway/doctor)：迁移后健康检查。
- [卸载](/install/uninstall)：干净地删除 OpenClaw。
