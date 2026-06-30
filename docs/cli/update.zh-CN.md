---
summary: "`openclaw update` 的 CLI 参考（安全的源更新 + gateway 自动重启）"
read_when:
  - 你想安全地更新源检出时
  - 你在调试 `openclaw update` 输出或选项时
  - 你需要了解 `--update` 简写行为时
title: "Update"
---

# `openclaw update`

安全地更新 OpenClaw 并在稳定/beta/dev 频道之间切换。

如果你通过 **npm/pnpm/bun** 安装（全局安装，没有 git 元数据），更新通过[更新](/install/updating)中的包管理器流程进行。

## 用法

```bash
openclaw update
openclaw update status
openclaw update wizard
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag beta
openclaw update --tag main
openclaw update --dry-run
openclaw update --no-restart
openclaw update --yes
openclaw update --json
openclaw --update
```

## 选项

- `--no-restart`：成功更新后跳过重启 Gateway 服务。确实重启 Gateway 的包管理器更新在命令成功之前验证重启的服务报告了预期的更新版本。
- `--channel <stable|beta|dev>`：设置更新频道（git + npm；持久化在配置中）。
- `--tag <dist-tag|version|spec>`：仅为此次更新覆盖包目标。对于包安装，`main` 映射到 `github:openclaw/openclaw#main`。
- `--dry-run`：预览计划的更新操作（频道/标签/目标/重启流程），不写入配置、安装、同步插件或重启。
- `--json`：打印机器可读的 `UpdateRunResult` JSON，包括在更新后插件同步期间检测到 npm 插件构件漂移时的 `postUpdate.plugins.integrityDrifts`。
- `--timeout <seconds>`：每步超时（默认 1800 秒）。
- `--yes`：跳过确认提示（例如降级确认）。

`openclaw update` 没有 `--verbose` 标志。使用 `--dry-run` 预览计划的频道/标签/安装/重启操作，`--json` 获取机器可读结果，`openclaw update status --json` 仅获取频道和可用性详情。如果你在更新前后调试 Gateway 日志，控制台详细程度和文件日志级别是独立的：Gateway `--verbose` 影响终端/WebSocket 输出，而文件日志需要配置中的 `logging.level: "debug"` 或 `"trace"`。请参阅 [Gateway 日志记录](/gateway/logging)。

<Warning>
降级需要确认，因为旧版本可能破坏配置。
</Warning>

## `update status`

显示活跃的更新频道 + git 标签/分支/SHA（对于源检出），以及更新可用性。

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

选项：

- `--json`：打印机器可读的状态 JSON。
- `--timeout <seconds>`：检查的超时（默认 3 秒）。

## `update wizard`

交互式流程，选择更新频道并确认是否在更新后重启 Gateway（默认重启）。如果你在没有 git 检出的情况下选择 `dev`，它会提供创建一个。

选项：

- `--timeout <seconds>`：每个更新步骤的超时（默认 `1800`）

## 工作原理

当你明确切换频道（`--channel ...`）时，OpenClaw 还会保持安装方法一致：

- `dev` → 确保 git 检出（默认：`~/openclaw`，用 `OPENCLAW_GIT_DIR` 覆盖），更新它，并从该检出安装全局 CLI。
- `stable` → 使用 `latest` 从 npm 安装。
- `beta` → 优先使用 npm dist-tag `beta`，但在 beta 缺失或比当前稳定版本旧时回退到 `latest`。

Gateway 核心自动更新器（通过配置启用时）在实时 Gateway 请求处理程序之外启动 CLI 更新路径。控制平面 `update.run` 包管理器更新在包交换后强制非延迟、无冷却时间的更新重启，因为旧的 Gateway 进程可能仍然有指向新包删除的文件的内存中块。

对于包管理器安装，`openclaw update` 在调用包管理器之前解析目标包版本。npm 全局安装使用分阶段安装：OpenClaw 将新包安装到临时 npm 前缀，在那里验证打包的 `dist` 清单，然后将干净的包树交换到真实的全局前缀。如果验证失败，更新后的 doctor、插件同步和重启工作不会从可疑树中运行。即使已安装的版本已经与目标匹配，命令也会刷新全局包安装，然后运行插件同步、核心命令完成刷新和重启工作。这使打包的附属程序和频道拥有的插件记录与已安装的 OpenClaw 构建保持一致，同时将完整的插件命令完成重建留给明确的 `openclaw completion --write-state` 运行。

当安装了本地托管的 Gateway 服务且重启已启用时，包管理器更新在替换包树之前停止运行中的服务，然后从更新的安装中刷新服务元数据，重启服务，并在报告成功之前验证重启的 Gateway 报告了预期版本。在 macOS 上，更新后检查还验证活跃配置文件的 LaunchAgent 已加载/运行，且已配置的回环端口健康。如果 plist 已安装但 launchd 未监督它，OpenClaw 自动重新引导 LaunchAgent，然后重新运行健康/版本/频道就绪检查。全新的引导直接加载 RunAtLoad 作业，因此更新恢复不会立即 `kickstart -k` 新生成的 Gateway。如果 Gateway 仍然不变得健康，命令以非零退出并打印重启日志路径以及明确的重启、重新安装和包回滚说明。使用 `--no-restart` 时，包替换仍然运行，但托管服务不会停止或重启，因此运行中的 Gateway 可能保持旧代码直到你手动重启它。

## Git 检出流程

### 频道选择

- `stable`：检出最新的非 beta 标签，然后构建和 doctor。
- `beta`：优先使用最新的 `-beta` 标签，但在 beta 缺失或比最新稳定标签旧时回退。
- `dev`：检出 `main`，然后 fetch 和 rebase。

### 更新步骤

<Steps>
  <Step title="验证干净的工作树">
    要求没有未提交的更改。
  </Step>
  <Step title="切换频道">
    切换到所选频道（标签或分支）。
  </Step>
  <Step title="获取上游">
    仅 dev。
  </Step>
  <Step title="预检构建（仅 dev）">
    在临时工作树中运行 lint 和 TypeScript 构建。如果顶端失败，最多回退 10 个提交以找到最新的干净构建。
  </Step>
  <Step title="Rebase">
    Rebase 到所选提交（仅 dev）。
  </Step>
  <Step title="安装依赖项">
    使用仓库包管理器。对于 pnpm 检出，更新器按需引导 `pnpm`（通过 `corepack` 首先，然后是临时的 `npm install pnpm@10` 回退），而不是在 pnpm 工作空间内运行 `npm run build`。
  </Step>
  <Step title="构建 Control UI">
    构建 gateway 和 Control UI。
  </Step>
  <Step title="运行 doctor">
    `openclaw doctor` 作为最终安全更新检查运行。
  </Step>
  <Step title="同步插件">
    将插件同步到活跃频道。Dev 使用捆绑插件；stable 和 beta 使用 npm。更新跟踪的插件安装。
  </Step>
</Steps>

在 beta 更新频道上，遵循默认/最新线的跟踪 npm 和 ClawHub 插件安装首先尝试插件 `@beta` 版本。如果插件没有 beta 版本，OpenClaw 回退到记录的默认/最新规范。精确版本和明确的标签不会被重写。

<Warning>
如果精确锁定的 npm 插件更新解析到完整性与存储的安装记录不同的构件，`openclaw update` 会中止该插件构件更新而不是安装它。仅在验证你信任新构件后才明确重新安装或更新插件。
</Warning>

<Note>
更新后插件同步失败会使更新结果失败，并停止重启后续工作。修复插件安装或更新错误，然后重新运行 `openclaw update`。

更新后的 Gateway 启动时，插件加载仅用于验证：启动不运行包管理器或改变依赖树。包管理器 `update.run` 重启会绕过正常的空闲延迟和重启冷却时间（在包树已交换之后），以使旧进程无法继续懒加载已删除的块。

如果 pnpm 引导仍然失败，更新器会提前停止，并显示包管理器特定的错误，而不是在检出内尝试 `npm run build`。
</Note>

## `--update` 简写

`openclaw --update` 重写为 `openclaw update`（对 shell 和启动器脚本有用）。

## 相关

- `openclaw doctor`（在 git 检出中提供先运行更新）
- [开发频道](/install/development-channels)
- [更新](/install/updating)
- [CLI 参考](/cli)
