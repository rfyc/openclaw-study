---
name: crabbox
description: Crabbox 是用于 CI 对等验证的远程 Linux 工具，默认使用 Blacksmith Testbox 后端。当用户请求远程验证、CI 测试或需要 Linux 环境时触发。
user-invocable: true
---

# Crabbox 技能

Crabbox 为 OpenClaw 提供远程 Linux 验证能力。默认后端为 Blacksmith Testbox；在 Blacksmith 不可用时可回退到直接使用 Blacksmith 或 AWS/Hetzner。

## 何时使用

当以下情况发生时使用 Crabbox：

- 用户请求 "在 Linux 上运行"、"验证 CI"、"在 Testbox 中运行"
- 需要 CI 对等测试（完整测试套件、构建检查、打包验证）
- 本地测试不可行（Docker、E2E、实时测试）
- 需要跨平台验证

## 默认后端：Blacksmith Testbox

```bash
# 预热 Testbox（尽早执行，以便后续复用）
blacksmith testbox warmup ci-check-testbox.yml --ref main --idle-timeout 90

# 复用返回的 tbx_... ID
blacksmith testbox run --id <tbx_id> "<command>"

# 完成后停止（提交前执行）
blacksmith testbox stop --id <tbx_id>
```

### 超时配置

| 场景          | 超时时间    |
| ------------- | ----------- |
| 默认/标准运行 | `90` 分钟   |
| 多小时任务    | `240` 分钟  |
| 全天任务      | `720` 分钟  |
| 过夜任务      | `1440` 分钟 |

超过 1440 分钟的任务需要明确批准并确保清理。

### 完整测试套件配置

```bash
blacksmith testbox run --id <ID> "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test"
```

### 可安装包验证

对于可安装包的验证，优先使用 GitHub `Package Acceptance` 工作流，而非临时 Testbox 命令。

## 后备后端

### 直接使用 Blacksmith

当 Testbox API 不可用但 Blacksmith 基础设施可访问时：

```bash
blacksmith run <command>
```

### AWS/Hetzner

当 Blacksmith 完全不可用时：

- 使用 `scripts/remote-run.sh` 或等效脚本
- 参考 `docs/install/hetzner.md` 获取 Hetzner 设置说明
- 参考 `docs/install/fly.md` 获取 Fly.io 配置

## 常用命令

```bash
# 标准检查（changed lanes）
pnpm check:changed

# 完整生产检查
pnpm check

# 测试套件
pnpm test
pnpm test:changed

# 构建验证
pnpm build

# 包验证（优先使用 GitHub 工作流）
# gh workflow run "Package Acceptance" --ref <branch>
```

## 规则

- 在维护者机器上，广泛/共享验证默认使用 Testbox
- 不要在本地运行可能扩展为广泛检查的命令
- 尽早预热 Testbox（在对话开始时），以减少等待时间
- 对所有 `run`/`download` 命令复用同一个 `tbx_...` ID
- 移交前停止你创建的 Testbox
- 如果 Testbox 超出控制范围，停止并向 Testbox 移交广泛检查

## 输出

运行后报告：

- 使用的命令
- 退出状态码
- 相关错误（失败时）
- Testbox ID（如使用）
- 运行时长
