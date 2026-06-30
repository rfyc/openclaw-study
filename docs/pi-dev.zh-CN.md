---
summary: "Pi 集成的开发者工作流：构建、测试和实时验证"
title: "Pi 开发工作流"
read_when:
  - 处理 Pi 集成代码或测试时
  - 运行 Pi 特定的 lint、类型检查和实时测试流时
---

在 OpenClaw 中处理 Pi 集成的合理工作流。

## 类型检查和 lint

- 默认本地门控：`pnpm check`
- 构建门控：当更改可能影响构建输出、打包或延迟加载/模块边界时，运行 `pnpm build`
- Pi 密集型更改的完整落地门控：`pnpm check && pnpm test`

## 运行 Pi 测试

直接使用 Vitest 运行 Pi 专注测试集：

```bash
pnpm test \
  "src/agents/pi-*.test.ts" \
  "src/agents/pi-embedded-*.test.ts" \
  "src/agents/pi-tools*.test.ts" \
  "src/agents/pi-settings.test.ts" \
  "src/agents/pi-tool-definition-adapter*.test.ts" \
  "src/agents/pi-hooks/**/*.test.ts"
```

要包含实时提供商练习：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test src/agents/pi-embedded-runner-extraparams.live.test.ts
```

这涵盖了主要的 Pi 单元套件：

- `src/agents/pi-*.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-tool-definition-adapter.test.ts`
- `src/agents/pi-hooks/*.test.ts`

## 手动测试

推荐流程：

- 在开发模式下运行网关：
  - `pnpm gateway:dev`
- 直接触发代理：
  - `pnpm openclaw agent --message "Hello" --thinking low`
- 使用 TUI 进行交互式调试：
  - `pnpm tui`

对于工具调用行为，提示进行 `read` 或 `exec` 操作，以便查看工具流式传输和有效载荷处理。

## 全新重置

状态位于 OpenClaw 状态目录下。默认为 `~/.openclaw`。如果设置了 `OPENCLAW_STATE_DIR`，则使用该目录。

要重置所有内容：

- `openclaw.json` 用于配置
- `agents/<agentId>/agent/auth-profiles.json` 用于模型认证配置文件（API 密钥 + OAuth）
- `credentials/` 用于仍然位于认证配置文件存储之外的提供商/频道状态
- `agents/<agentId>/sessions/` 用于代理会话历史
- `agents/<agentId>/sessions/sessions.json` 用于会话索引
- `sessions/`（如果存在旧版路径）
- `workspace/`（如果想要空白工作区）

如果只想重置会话，删除该代理的 `agents/<agentId>/sessions/`。如果想保留认证，保留 `agents/<agentId>/agent/auth-profiles.json` 和 `credentials/` 下的任何提供商状态。

## 参考

- [测试](/help/testing)
- [快速开始](/start/getting-started)

## 相关

- [Pi 集成架构](/pi)
