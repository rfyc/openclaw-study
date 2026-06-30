---
summary: "稳定版、beta 版和开发版频道：语义、切换、固定和标签"
read_when:
  - 您想在稳定版/beta 版/开发版之间切换
  - 您想固定特定版本、标签或 SHA
  - 您正在标记或发布预发布版本
title: "发布频道"
sidebarTitle: "发布频道"
---

# 开发频道

OpenClaw 提供三个更新频道：

- **stable（稳定版）**：npm dist-tag `latest`。推荐大多数用户使用。
- **beta（测试版）**：npm dist-tag `beta`（当前版本）；如果 beta 缺失或比最新稳定版本旧，更新流程将回退到 `latest`。
- **dev（开发版）**：`main`（git）的移动头。npm dist-tag：`dev`（发布时）。`main` 分支用于实验和积极开发，可能包含不完整的功能或重大更改。不要在生产网关中使用它。

通常先将稳定版本发布到 **beta**，在那里测试，然后运行明确的推广步骤，将经过验证的版本移动到 `latest` 而不更改版本号。维护者在需要时也可以直接将稳定版本发布到 `latest`。Dist-tags 是 npm 安装的权威来源。

## 切换频道

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` 将您的选择持久化在配置中（`update.channel`）并对齐安装方法：

- **`stable`**（包安装）：通过 npm dist-tag `latest` 更新。
- **`beta`**（包安装）：优先选择 npm dist-tag `beta`，但当 `beta` 缺失或比当前稳定标签旧时回退到 `latest`。
- **`stable`**（git 安装）：检出最新的稳定 git 标签。
- **`beta`**（git 安装）：优先选择最新的 beta git 标签，但当 beta 缺失或旧时回退到最新的稳定 git 标签。
- **`dev`**：确保 git 检出（默认 `~/openclaw`，通过 `OPENCLAW_GIT_DIR` 覆盖），切换到 `main`，在上游进行 rebase，构建并从该检出安装全局 CLI。

<Tip>
如果您想同时使用稳定版和开发版，保留两个克隆并将您的网关指向稳定版。
</Tip>

## 一次性版本或标签定向

使用 `--tag` 定向特定的 dist-tag、版本或包规格，进行单次更新，**不**更改持久化的频道：

```bash
# 安装特定版本
openclaw update --tag 2026.4.1-beta.1

# 从 beta dist-tag 安装（一次性，不持久化）
openclaw update --tag beta

# 从 GitHub main 分支安装（npm tarball）
openclaw update --tag main

# 安装特定的 npm 包规格
openclaw update --tag openclaw@2026.4.1-beta.1
```

注意事项：

- `--tag` **仅适用于包（npm）安装**。git 安装会忽略它。
- 标签不会持久化。您的下一次 `openclaw update` 将像往常一样使用您配置的频道。
- 降级保护：如果目标版本比当前版本旧，OpenClaw 会提示确认（使用 `--yes` 跳过）。
- `--channel beta` 与 `--tag beta` 不同：频道流在 beta 缺失或旧时可以回退到稳定版/latest，而 `--tag beta` 针对该次运行的原始 `beta` dist-tag。

## 试运行

预览 `openclaw update` 将要做的事情，而不进行任何更改：

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.4.1-beta.1 --dry-run
openclaw update --dry-run --json
```

试运行显示有效频道、目标版本、计划的操作，以及是否需要降级确认。

## 插件和频道

当您使用 `openclaw update` 切换频道时，OpenClaw 也会同步插件源：

- `dev` 优先使用来自 git 检出的捆绑插件。
- `stable` 和 `beta` 恢复 npm 安装的插件包。
- npm 安装的插件在核心更新完成后更新。

## 检查当前状态

```bash
openclaw update status
```

显示活动频道、安装类型（git 或包）、当前版本和来源（配置、git 标签、git 分支或默认值）。

## 标签最佳实践

- 标记您希望 git 检出落在的版本（稳定版使用 `vYYYY.M.D`，beta 版使用 `vYYYY.M.D-beta.N`）。
- `vYYYY.M.D.beta.N` 也被识别为向后兼容，但优先使用 `-beta.N`。
- 遗留的 `vYYYY.M.D-<patch>` 标签仍然被识别为稳定版（非 beta）。
- 保持标签不可变：永远不要移动或重用标签。
- npm dist-tags 仍然是 npm 安装的权威来源：
  - `latest` -> 稳定版
  - `beta` -> 候选版本或 beta 优先稳定版本
  - `dev` -> main 快照（可选）

## macOS 应用可用性

Beta 版和开发版构建**可能不**包含 macOS 应用发布。这没关系：

- git 标签和 npm dist-tag 仍然可以发布。
- 在发布说明或更新日志中注明"此 beta 版无 macOS 构建"。

## 相关

- [更新](/install/updating)
- [安装程序内部机制](/install/installer)
