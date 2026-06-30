---
name: openclaw-testing
description: 选择、运行、重新运行或调试 OpenClaw 测试、CI 检查、Docker E2E 通道、发布验证以及最便宜的安全验证路径。
---

# OpenClaw 测试

在决定测试什么、调试失败、重新运行 CI 或验证变更而不浪费数小时时，使用此技能。

## 先阅读

- `docs/reference/test.md`：本地测试命令。
- `docs/ci.md`：CI 范围、发布检查、Docker 块和运行器行为。
- 在编辑子树下的代码之前，先阅读范围内的 `AGENTS.md` 文件。

## 默认规则

首先证明被修改的表面。不要反射性地运行整个套件。

1. 检查 diff 并分类被修改的表面：
   - 源代码：`pnpm changed:lanes --json`，然后 `pnpm check:changed`
   - 仅测试：`pnpm test:changed`
   - 一个失败文件：`pnpm test <path-or-filter> -- --reporter=verbose`
   - 仅工作流：`git diff --check`，工作流语法/lint
   - 仅文档：`pnpm docs:list`，仅在文档工具改变或请求时进行文档格式化/lint
2. 在修复之前进行窄范围复现。
3. 修复根本原因。
4. 重新运行相同的窄范围验证。
5. 仅在修改后的合约要求时才扩大范围。

## 护栏

- 不要终止无关的进程或测试。如果某些东西在其他地方运行，将其视为用户或另一个智能体拥有的。
- 除非用户要求或变更确实需要，否则不要运行昂贵的本地 Docker、完整发布检查、完整 `pnpm test` 或完整 `pnpm check`。
- 当工作流已有准备好的镜像和密钥时，优先使用 GitHub Actions 进行发布/Docker 证明。
- 提交时使用 `scripts/committer "<msg>" <paths...>`；只暂存你的文件。
- 如果缺少依赖，运行 `pnpm install`，重试一次，然后报告第一个可操作的错误。

## 本地测试快捷方式

```bash
pnpm changed:lanes --json
pnpm check:changed       # 更改的类型检查/lint/守卫；不运行 Vitest
pnpm test:changed        # 便宜的智能更改 Vitest 目标
OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed
pnpm test <path-or-filter> -- --reporter=verbose
OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test <path-or-filter>
```

尽可能使用有针对性的文件路径。避免原始 `vitest`；使用仓库 `pnpm test` 封装器，使项目路由、工作进程和设置保持正确。

## 命令语义

- `pnpm check` 和 `pnpm check:changed` 不运行 Vitest 测试。它们用于类型检查、lint 和守卫证明。
- `pnpm test` 和 `pnpm test:changed` 运行 Vitest 测试。
- `pnpm test:changed` 默认故意很廉价：直接测试编辑、兄弟测试、显式源映射和导入图依赖项。
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` 是对确实需要它的框架/配置/包编辑的显式宽泛回退。

## CI 调试

从当前运行状态开始，而不是查看所有日志：

```bash
gh run list --branch main --limit 10
gh run view <run-id> --json status,conclusion,headSha,url,jobs
gh run view <run-id> --job <job-id> --log
```

- 检查精确的 SHA。除非被要求，否则忽略较新的无关 `main`。
- 对于取消的同分支运行，确认是否有较新的运行取代了它。
- 只获取失败或相关作业的完整日志。

## GitHub 发布工作流

使用能证明当前风险的最小工作流。完整的总体工作流可用，但通常是在更窄的证明之后的最后一步，而不是针对性补丁后的第一次重新运行。

### 完整发布验证

`Full Release Validation`（`.github/workflows/full-release-validation.yml`）是手动"发布前的一切"总体工作流。

仅在验证实际发布候选项、广泛共享 CI 或发布编排变更之后，或在明确要求时运行：

```bash
gh workflow run full-release-validation.yml \
  --repo openclaw/openclaw \
  --ref main \
  -f ref=<branch-or-sha> \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable
```

### 包验收

当问题是"这个可安装包作为产品是否有效？"而不是"这个源代码差异是否通过 Vitest？"时，使用手动 `Package Acceptance` 工作流。

良好的默认设置：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f workflow_ref=main \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

## Docker

Docker 很昂贵。首先在不运行 Docker 的情况下检查调度器：

```bash
OPENCLAW_DOCKER_ALL_DRY_RUN=1 pnpm test:docker:all
```

只有在明确要求或 GitHub 不可用时，才在本地运行一个失败的通道。

## 失败工作流

1. 识别确切的失败作业、SHA、通道和产物路径。
2. 读取 `failures.json`、`summary.json` 和失败的通道日志尾部。
3. 使用 `pnpm test:docker:rerun <run-id|failures.json>` 生成目标 GitHub 重新运行命令。
4. 如果通道有 `rerunCommand`，仅将其用作本地起点。
5. 对于 Docker 发布失败，在考虑本地 Docker 之前，在 GitHub 上调度目标 `docker_lanes=<failed-lane>`。
6. 进行窄范围修补，然后仅重新运行失败的文件/通道。
7. 仅在隔离证明通过后才扩大到 `pnpm check:changed` 或 CI。

## 何时升级

- 公共 SDK/插件合约变更：运行更改的门控加上相关的扩展验证。
- 构建输出、惰性导入、包边界或已发布表面：包括 `pnpm build`。
- 工作流编辑：运行 `pnpm check:workflows`。
- 发布分支或标签验证：使用发布文档和 GitHub 工作流；除非 Peter 明确要求，否则避免本地 Docker。
