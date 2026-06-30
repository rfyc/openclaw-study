---
summary: "安全更新 OpenClaw（全局安装或源码），以及回滚策略"
read_when:
  - 更新 OpenClaw
  - 更新后出现故障
title: "更新"
---

保持 OpenClaw 最新。

## 推荐：`openclaw update`

最快的更新方式。它会检测您的安装类型（npm 或 git），获取最新版本，运行 `openclaw doctor`，并重启网关。

```bash
openclaw update
```

切换频道或指定特定版本：

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag main
openclaw update --dry-run   # 预览而不应用
```

`openclaw update` 不接受 `--verbose`。如需更新诊断，使用 `--dry-run` 预览计划的操作，使用 `--json` 获取结构化结果，或使用 `openclaw update status --json` 检查频道和可用性状态。安装程序有自己的 `--verbose` 标志，但该标志不是 `openclaw update` 的一部分。

`--channel beta` 优先选择 beta，但当 beta 标签缺失或旧于最新稳定版本时，运行时会回退到稳定版/最新版。如果您想使用原始的 npm beta dist-tag 进行一次性包更新，请使用 `--tag beta`。

参见[开发频道](/install/development-channels)了解频道语义。

## 在 npm 和 git 安装之间切换

当您想更改安装类型时，请使用频道。更新程序会保留您在 `~/.openclaw` 中的状态、配置、凭据和工作区；它只改变 CLI 和网关使用的 OpenClaw 代码安装。

```bash
# npm 包安装 -> 可编辑的 git 检出
openclaw update --channel dev

# git 检出 -> npm 包安装
openclaw update --channel stable
```

先用 `--dry-run` 预览确切的安装模式切换：

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

`dev` 频道确保 git 检出，构建它，并从该检出安装全局 CLI。`stable` 和 `beta` 频道使用包安装。如果网关已安装，`openclaw update` 会刷新服务元数据并重启它，除非您传递 `--no-restart`。

## 备选：重新运行安装程序

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

添加 `--no-onboard` 可跳过入门向导。要通过安装程序强制指定安装类型，传递 `--install-method git --no-onboard` 或 `--install-method npm --no-onboard`。

如果 `openclaw update` 在 npm 包安装阶段后失败，请重新运行安装程序。安装程序不调用旧的更新程序；它直接运行全局包安装，可以恢复部分更新的 npm 安装。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

要将恢复固定到特定版本或 dist-tag，添加 `--version`：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## 备选：手动 npm、pnpm 或 bun

```bash
npm i -g openclaw@latest
```

对于有监督的安装，优先使用 `openclaw update`，因为它可以协调包替换与运行中的网关服务。如果在托管网关运行时手动更新，请在包管理器完成后立即重启网关，以免旧进程继续从已替换的包文件提供服务。

当 `openclaw update` 管理全局 npm 安装时，它首先将目标安装到临时 npm 前缀，验证打包的 `dist` 清单，然后将干净的包树替换到真实的全局前缀。这样可以避免 npm 将新包叠加到旧包的残留文件上。如果安装命令失败，OpenClaw 会使用 `--omit=optional` 重试一次。这种重试可以帮助原生可选依赖项无法编译的宿主机，同时在回退也失败时保留原始错误信息。

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### 高级 npm 安装主题

<AccordionGroup>
  <Accordion title="只读包树">
    OpenClaw 在运行时将打包的全局安装视为只读，即使当前用户对全局包目录具有写权限。插件包安装位于用户配置目录下 OpenClaw 自有的 npm/git 根目录中，网关启动不会修改 OpenClaw 包树。

    某些 Linux npm 设置将全局包安装在 root 拥有的目录下，例如 `/usr/lib/node_modules/openclaw`。OpenClaw 支持这种布局，因为插件安装/更新命令在该全局包目录之外写入。

  </Accordion>
  <Accordion title="强化的 systemd 单元">
    为 OpenClaw 提供对其配置/状态根目录的写权限，以便显式插件安装、插件更新和 doctor 清理能够持久化更改：

    ```ini
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

  </Accordion>
  <Accordion title="磁盘空间预检">
    在包更新和显式插件安装之前，OpenClaw 会对目标卷进行尽力而为的磁盘空间检查。空间不足会产生带有检查路径的警告，但不会阻止更新，因为文件系统配额、快照和网络卷在检查后可能会发生变化。实际的包管理器安装和安装后验证仍是权威依据。
  </Accordion>
</AccordionGroup>

## 自动更新程序

自动更新程序默认关闭。在 `~/.openclaw/openclaw.json` 中启用：

```json5
{
  update: {
    channel: "stable",
    auto: {
      enabled: true,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

| 频道     | 行为                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| `stable` | 等待 `stableDelayHours`，然后在 `stableJitterHours` 内应用确定性抖动（分散推送）。 |
| `beta`   | 每 `betaCheckIntervalHours`（默认每小时）检查一次并立即应用。                      |
| `dev`    | 不自动应用。手动使用 `openclaw update`。                                           |

网关也会在启动时记录更新提示（使用 `update.checkOnStart: false` 禁用）。对于降级或事故恢复，在网关环境中设置 `OPENCLAW_NO_AUTO_UPDATE=1` 可阻止自动应用，即使已配置 `update.auto.enabled`。除非同时禁用 `update.checkOnStart`，否则启动更新提示仍然会运行。

通过实时网关控制平面处理程序请求的包管理器更新会在包替换后强制触发非延迟、无冷却时间的更新重启。这样可以避免旧的内存进程在运行足够长时间后从已被替换的包树延迟加载块。shell `openclaw update` 仍然是有监督安装的首选路径，因为它可以在更新周围停止和重启服务。

## 更新后

<Steps>

### 运行 doctor

```bash
openclaw doctor
```

迁移配置、审计 DM 策略并检查网关健康状况。详情：[Doctor](/gateway/doctor)

### 重启网关

```bash
openclaw gateway restart
```

### 验证

```bash
openclaw health
```

</Steps>

## 回滚

### 固定版本（npm）

```bash
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

<Tip>
`npm view openclaw version` 显示当前发布的版本。
</Tip>

### 固定提交（源码）

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

要返回最新版本：`git checkout main && git pull`。

## 如果您遇到困难

- 再次运行 `openclaw doctor` 并仔细阅读输出。
- 对于源码检出的 `openclaw update --channel dev`，更新程序在需要时会自动引导 `pnpm`。如果您看到 pnpm/corepack 引导错误，请手动安装 `pnpm`（或重新启用 `corepack`）并重新运行更新。
- 查看：[故障排除](/gateway/troubleshooting)
- 在 Discord 上提问：[https://discord.gg/clawd](https://discord.gg/clawd)

## 相关

- [安装概述](/install)：所有安装方法。
- [Doctor](/gateway/doctor)：更新后的健康检查。
- [迁移](/install/migrating)：主要版本迁移指南。
