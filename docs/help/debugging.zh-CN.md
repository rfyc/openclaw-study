---
summary: "调试工具：监视模式、原始模型流及推理泄漏追踪"
read_when:
  - 需要检查原始模型输出中的推理泄漏问题
  - 希望在迭代时以监视模式运行 Gateway
  - 需要可重复的调试工作流
title: "调试"
---

流式输出的调试辅助工具，尤其适用于当服务提供商将推理混入普通文本的情况。

## 运行时调试覆盖

在聊天中使用 `/debug` 设置**仅限运行时**的配置覆盖（存储在内存中，不写入磁盘）。
`/debug` 默认禁用；通过 `commands.debug: true` 启用。
当你需要切换一些不常用设置而无需编辑 `openclaw.json` 时，此功能非常方便。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 清除所有覆盖，恢复到磁盘上的配置。

## 会话追踪输出

当你希望在一个会话中查看插件专属的追踪/调试行，同时不开启完整的详细模式时，使用 `/trace`。

示例：

```text
/trace
/trace on
/trace off
```

使用 `/trace` 进行插件诊断，例如 Active Memory 调试摘要。
继续使用 `/verbose` 查看普通的详细状态/工具输出，使用 `/debug` 进行仅限运行时的配置覆盖。

## 插件生命周期追踪

当插件生命周期命令感觉很慢，并且你需要对插件元数据、发现、注册表、运行时镜像、配置修改和刷新工作进行内置阶段分解时，使用 `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1`。该追踪为可选功能，输出到 stderr，因此 JSON 命令输出仍可正常解析。

示例：

```bash
OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1 openclaw plugins install tokenjuice --force
```

输出示例：

```text
[plugins:lifecycle] phase="config read" ms=6.83 status=ok command="install"
[plugins:lifecycle] phase="slot selection" ms=94.31 status=ok command="install" pluginId="tokenjuice"
[plugins:lifecycle] phase="registry refresh" ms=51.56 status=ok command="install" reason="source-changed"
```

在使用 CPU 分析器之前，先用此功能进行插件生命周期调查。
如果命令从源代码检出运行，则更倾向于在 `pnpm build` 后通过 `node dist/entry.js ...` 测量已构建的运行时；`pnpm openclaw ...` 也会测量源代码运行器的开销。

## CLI 启动和命令性能分析

当命令感觉很慢时，使用代码库中内置的启动基准测试：

```bash
pnpm test:startup:bench:smoke
pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --runs 3
pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu
```

对于通过普通源代码运行器进行的一次性性能分析，设置 `OPENCLAW_RUN_NODE_CPU_PROF_DIR`：

```bash
OPENCLAW_RUN_NODE_CPU_PROF_DIR=.artifacts/cli-cpu pnpm openclaw status
```

源代码运行器会添加 Node CPU 性能分析标志，并为该命令写入 `.cpuprofile` 文件。在向命令代码添加临时仪表化之前，请先使用此方法。

## Gateway 监视模式

如需快速迭代，请在文件监视器下运行 Gateway：

```bash
pnpm gateway:watch
```

默认情况下，这会启动或重启名为 `openclaw-gateway-watch-main` 的 tmux 会话（或特定于配置文件/端口的变体，如 `openclaw-gateway-watch-dev-19001`），并在交互式终端中自动附加。非交互式 shell、CI 和代理 exec 调用保持分离，并打印附加说明。需要时手动附加：

```bash
tmux attach -t openclaw-gateway-watch-main
```

tmux 窗格运行原始监视器：

```bash
node scripts/watch-node.mjs gateway --force
```

当不需要 tmux 时，使用前台模式：

```bash
pnpm gateway:watch:raw
# 或
OPENCLAW_GATEWAY_WATCH_TMUX=0 pnpm gateway:watch
```

在保持 tmux 管理的同时禁用自动附加：

```bash
OPENCLAW_GATEWAY_WATCH_ATTACH=0 pnpm gateway:watch
```

在调试启动/运行时热点时分析受监视的 Gateway CPU 时间：

```bash
pnpm gateway:watch --benchmark
```

监视包装器在调用 Gateway 之前消耗 `--benchmark`，并在 `.artifacts/gateway-watch-profiles/` 下为每次 Gateway 子进程退出写入一个 V8 `.cpuprofile`。停止或重启受监视的 Gateway 以刷新当前配置文件，然后使用 Chrome DevTools 或 Speedscope 打开它：

```bash
npx speedscope .artifacts/gateway-watch-profiles/*.cpuprofile
```

当你希望将配置文件保存到其他位置时，使用 `--benchmark-dir <path>`。
当你希望被基准测试的子进程跳过默认的 `--force` 端口清理，并在 Gateway 端口已被使用时快速失败时，使用 `--benchmark-no-force`。

tmux 包装器会将常见的非敏感运行时选择器（如 `OPENCLAW_PROFILE`、`OPENCLAW_CONFIG_PATH`、`OPENCLAW_STATE_DIR`、`OPENCLAW_GATEWAY_PORT` 和 `OPENCLAW_SKIP_CHANNELS`）携带到窗格中。将提供商凭证放在你的普通配置文件/配置中，或使用原始前台模式处理一次性的临时密钥。
如果受监视的 Gateway 在启动过程中退出，监视器会运行一次 `openclaw doctor --fix --non-interactive` 并重启 Gateway 子进程。
当你希望保留原始启动失败而不进行仅限开发的修复时，使用 `OPENCLAW_GATEWAY_WATCH_AUTO_DOCTOR=0`。
受管理的 tmux 窗格默认使用彩色 Gateway 日志以提高可读性；启动 `pnpm gateway:watch` 时设置 `FORCE_COLOR=0` 可禁用 ANSI 输出。

监视器会在 `src/` 下的构建相关文件、插件源文件、插件 `package.json` 和 `openclaw.plugin.json` 元数据、`tsconfig.json`、`package.json` 以及 `tsdown.config.ts` 发生变化时重启。插件元数据变化会在不强制 `tsdown` 重新构建的情况下重启 Gateway；源代码和配置变化仍会先重新构建 `dist`。

在 `gateway:watch` 后添加任何 Gateway CLI 标志，它们将在每次重启时传递。重新运行相同的监视命令会重新生成命名的 tmux 窗格，原始监视器仍保持其单监视器锁，因此重复的监视器父进程会被替换而不是堆叠。

## 开发配置文件 + 开发 Gateway (--dev)

使用开发配置文件隔离状态，并为调试启动安全、可丢弃的设置。有**两个** `--dev` 标志：

- **全局 `--dev`（配置文件）：** 将状态隔离在 `~/.openclaw-dev` 下，并将 Gateway 端口默认为 `19001`（派生端口随之偏移）。
- **`gateway --dev`：告诉 Gateway 在缺失时自动创建默认配置和工作区**（并跳过 BOOTSTRAP.md）。

推荐工作流（开发配置文件 + 开发引导）：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果你还没有全局安装，通过 `pnpm openclaw ...` 运行 CLI。

该工作流的作用：

1. **配置文件隔离**（全局 `--dev`）
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001`（浏览器/画布相应偏移）

2. **开发引导**（`gateway --dev`）
   - 如果缺失则写入最小配置（`gateway.mode=local`，绑定环回）。
   - 将 `agent.workspace` 设置为开发工作区。
   - 设置 `agent.skipBootstrap=true`（无 BOOTSTRAP.md）。
   - 如果缺失则播种工作区文件：`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`。
   - 默认身份：**C3‑PO**（协议机器人）。
   - 在开发模式下跳过频道提供商（`OPENCLAW_SKIP_CHANNELS=1`）。

重置工作流（全新开始）：

```bash
pnpm gateway:dev:reset
```

<Note>
`--dev` 是**全局**配置文件标志，某些运行器可能会吃掉它。如果需要明确指定，请使用环境变量形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

</Note>

`--reset` 清除配置、凭证、会话和开发工作区（使用 `trash`，而非 `rm`），然后重新创建默认开发设置。

<Tip>
如果非开发 Gateway 已在运行（launchd 或 systemd），请先停止它：

```bash
openclaw gateway stop
```

</Tip>

## 原始流日志（OpenClaw）

OpenClaw 可以在任何过滤/格式化之前记录**原始助手流**。
这是查看推理是否以纯文本 delta（或作为独立的思考块）形式到达的最佳方式。

通过 CLI 启用：

```bash
pnpm gateway:watch --raw-stream
```

可选路径覆盖：

```bash
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

等效的环境变量：

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

默认文件：

`~/.openclaw/logs/raw-stream.jsonl`

## 原始块日志（pi-mono）

要在将**原始 OpenAI 兼容块**解析为块之前捕获它们，pi-mono 提供了单独的记录器：

```bash
PI_RAW_STREAM=1
```

可选路径：

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

默认文件：

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> 注意：这仅由使用 pi-mono 的 `openai-completions` 提供商的进程发出。

## 安全注意事项

- 原始流日志可能包含完整的提示、工具输出和用户数据。
- 将日志保存在本地，并在调试后删除。
- 如果需要共享日志，请先清除其中的密钥和个人信息。

## 相关链接

- [故障排除](/help/troubleshooting)
- [FAQ](/help/faq)
