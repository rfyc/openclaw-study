---
name: openclaw-release-maintainer
description: 准备或验证 OpenClaw 稳定版/Beta 版发布、变更日志、发布说明、发布命令和产物。
---

# OpenClaw 发布维护者

使用此技能处理发布和发布时的工作流。普通的开发变更和 GHSA 特定的安全通报工作不在此技能范围内。

## 遵守发布护栏

- 未经运营者明确批准，不得更改版本号。
- 在执行任何 npm 发布或发布步骤之前须征得许可。
- 此技能应足以驱动正常发布流程的端到端操作。
- 使用私有维护者发布文档获取凭据、恢复步骤和 mac 签名/公证细节，使用 `docs/reference/RELEASING.md` 获取公开政策。
- 核心 `openclaw` 发布是手动的 `workflow_dispatch`；创建或推送标签本身不会触发发布。
- 正常发布工作在从 `main` 切出的分支上进行，而不是直接在 `main` 上。使用 `release/YYYY.M.D` 作为分支名。
- 如果运营者要求发布但未指明稳定版/完整版，默认仅发布 Beta。仅当运营者明确要求完整发布或自动化 Beta 加稳定版流程时，才从 Beta 推进到稳定版。
- 在创建发布分支之前，拉取最新的 `main` 并确认当前 `main` CI 为绿色状态。然后从该提交创建分支，以便在发布验证进行时，常规开发可以继续在 `main` 上进行。
- 在创建发布分支之前，将脏文件按逻辑分组提交，推送，拉取/变基，然后在 `main` 上运行 `/changelog` 并立即提交/推送/拉取该变更日志重写，然后再创建发布分支。
- 在发布规划期间，在创建分支之前和最终发布之前，检查 `src/plugins/compat/registry.ts` 和 `src/commands/doctor/shared/deprecation-compat.ts`。对于每个已废弃或待移除的兼容性记录，其 `removeAfter` 日期在发布日期当天或之前，要么在安全的情况下移除兼容路径并验证受影响的测试，要么记录为何移除被阻止，并在发布已过期的兼容路径之前获得维护者的明确批准。
- 移除废弃的运行时/配置兼容性时，保留受支持升级路径仍然需要的任何 doctor 迁移、修复或提示。Doctor 端的兼容性应继续在 `src/commands/doctor/shared/deprecation-compat.ts` 中跟踪，直到维护者确认不再需要该修复。
- 在发布规划期间重新验证兼容性替换文本。随着插件所有权、外部化和配置占用的变化，推荐的替换可能会改变，因此不要盲目地将过时的替换注释复制到发布说明中。
- 在匹配的 npm 包发布后，不要删除或重写 Beta 标签。如果推送的 Beta 标签在 npm 发布之前的预检中失败，请在修复后的提交处删除并重新创建标签和预发布，以保持 npm 预发布版本的连续性。如果已发布的 Beta 需要修复，在发布分支上提交修复，并递增到下一个 `-beta.N`。
- 对于 Beta 发布流程，先运行快速本地预检，将 Beta 发布到 npm `beta`，然后运行专注于安装/更新/Docker/Parallels/NPM Telegram 的昂贵的已发布包检查。如果任何步骤失败，在发布分支上修复，提交/推送/拉取，递增 Beta 号，然后重试。在稳定版/latest 推广之前至少运行一次完整的昂贵检查；对于后续 Beta 尝试，仅重新运行证据已变更的流程，除非修复涉及广泛的发布、安装/更新、插件、Docker、Parallels 或实时 QA 行为。每次 Beta 发布后，扫描当前 `main` 一次，查找在发布分支切出后落地的关键修复，仅回移重要的低风险修复。运营者最多可授权 4 次自主 Beta 尝试；超过 4 次失败的 Beta 尝试后，停止并报告。
- 在版本/标签准备之前使用 `/changelog`，以便顶部变更日志部分按用户影响排序去重。
- 不要创建 Beta 特定的 `CHANGELOG.md` 标题。Beta 发布使用稳定基础版本部分，例如 `v2026.4.20-beta.1` 使用 `## 2026.4.20` 发布说明。
- 当任何 Beta 或稳定版发布上线时，使用 Peter 的 `.profile` 中的 bot 令牌尽力在 Discord 上发布公告；如果公告失败，不要阻止或回滚发布。
- 当被要求在 X 上发布公告时，使用 `~/Projects/bird/bird` 并遵循以下发布推文风格。

## 保持发布渠道命名一致

- `stable`：仅限标签版本，默认发布到 npm `beta`；运营者可以明确指定 npm `latest` 或稍后推广
- `beta`：预发布标签如 `vYYYY.M.D-beta.N`，npm dist-tag 为 `beta`
- 优先使用 `-beta.N`；不要创建新的 `-1` 或 `-2` Beta 后缀
- `dev`：`main` 上的移动头
- 使用 Beta Git 标签时，使用匹配的 Beta 版本后缀发布 npm，以免普通版本被占用或阻止

## 一致处理版本和发布文件

- 版本位置包括：
  - `package.json`
  - `apps/android/app/build.gradle.kts`
  - `apps/ios/Sources/Info.plist`
  - `apps/ios/Tests/Info.plist`
  - `apps/macos/Sources/OpenClaw/Resources/Info.plist`
  - `docs/install/updating.md`
  - Peekaboo Xcode 项目和 plist 版本字段
- 在创建发布标签之前，使上述每个版本位置与该标签编码的版本匹配。
- 对于像 `vYYYY.M.D-N` 这样的备用修正标签，仓库版本位置仍保持在 `YYYY.M.D`。
- "在所有地方更新版本"是指上述所有版本位置，但不包括 `appcast.xml`。
- 发布签名和公证凭据存储在私有维护者文档中，不在仓库内。
- 每个稳定的 OpenClaw 发布同时发布 npm 包和 macOS 应用。Beta 版本通常先发布 npm/包产物，除非运营者要求 mac Beta 验证，否则跳过 mac 应用构建/签名/公证。
- 一旦 npm 预检通过，不要让较慢的 macOS 签名/公证路径阻塞 npm 发布。保持 mac 验证/发布并行运行，从成功的 npm 预检发布 npm，然后在 mac 产物继续进行时启动已发布 npm 的安装/更新、Docker 和 Parallels 验证。

## 构建基于变更日志的发布说明

- 在创建发布分支或标签之前，从提交历史重写目标 `CHANGELOG.md` 部分，而不仅仅是从现有说明：扫描自上一个可达发布标签以来的提交，添加遗漏的用户可见变更，去除重叠条目，并将每个部分从对用户最有趣到最不有趣排序。
- 变更日志条目应面向用户，而非内部发布流程说明。
- GitHub 发布和预发布正文必须使用完整匹配的 `CHANGELOG.md` 版本部分，而非摘要或摘录。创建或编辑发布时，从 `## YYYY.M.D` 提取到下一个二级标题之前的行，并使用该完整块作为发布说明。

## 编写发布推文

使用 OpenClaw 账户现有的发布帖子风格：

- 格式：`OpenClaw YYYY.M.D 🦞` 或 `🦞 OpenClaw YYYY.M.D is live`，空行，然后 3-4 个带表情符号的要点，空行，一个简短的结语，然后是发布链接。
- Beta 版：说 `OpenClaw YYYY.M.D-beta.N 🦞` 或 `OpenClaw YYYY.M.D beta N is live`；保持明确为 Beta 版，避免暗示稳定版推广。
- 以用户可见的功能为主，然后是重要的集成，然后是可靠性/安全性/安装修复。将"大量修复"压缩为一个可读的要点。
- 起草前阅读完整的变更日志部分。不要以覆盖率、CI、验证或内部发布机制为主，除非发布明确是关于这些方面的。Peter 偏爱具体的用户成果：功能、集成、工作流改进和实际的可靠性修复。
- 语调：高信号，略带俏皮，自信，不刻板。一个玩笑就够了。避免贬低、侮辱用户或承诺未经验证的内容。

推文示例（供参考）：

```text
OpenClaw 2026.4.20-beta.1 🦞

🐳 Docker 安装/更新冒烟
🖥️ Parallels 升级检查
🔧 包验证收紧

先 Beta。通过后进行稳定版。
<发布链接>
```

## 运行发布前验证

在标记或发布之前，运行：

```bash
pnpm check:architecture
pnpm build
pnpm ui:build
pnpm qa:otel:smoke
pnpm release:check
pnpm test:install:smoke
```

发布 npm 后，运行：

```bash
node --import tsx scripts/openclaw-npm-postpublish-verify.ts <published-version>
```

## 运行发布序列

1. 确认运营者明确想要切出发布。
2. 选择确切的目标版本和 git 标签。
3. 将脏文件分组提交，推送，拉取/变基，并验证工作树是干净的。
4. 拉取最新的 `main` 并确认当前 `main` CI 为绿色状态。
5. 在 `main` 上为稳定基础目标版本运行 `/changelog`，立即提交变更日志重写，推送，拉取/变基。对于 Beta 发布，保持变更日志标题为 `## YYYY.M.D`，而不是 `## YYYY.M.D-beta.N`。
6. 从该发布后的 `main` 提交创建 `release/YYYY.M.D`。
7. 在创建 Beta 标签之前，使所有仓库版本位置与该 Beta 标签匹配。
8. 在发布分支上提交发布准备变更并推送分支。
9. 在任何 npm 预检或发布之前，从发布分支运行快速本地 Beta 预检。
10. 对于 Beta 发布，除非 Beta 范围或发布阻塞问题专门需要，否则跳过 mac 应用构建/签名/公证。
11. 确认目标 npm 版本尚未发布。
12. 从发布分支创建并推送 git 标签。
13. 创建或刷新匹配的 GitHub 发布。
14. 针对发布标签调度 Actions > `QA-Lab - All Lanes`，并等待通过。
15. 从发布分支启动 `.github/workflows/openclaw-npm-release.yml`，使用 `preflight_only=true`，然后等待通过。
16. 对于稳定版发布，启动 `.github/workflows/macos-release.yml` 并等待通过。
17. 对于稳定版发布，启动私有 mac 验证流程并等待通过。
18. 对于稳定版发布，使用 `preflight_only=true` 启动私有 mac 预检并等待通过。
19. 如果任何预检或验证运行失败，在新提交上修复问题，删除标签和匹配的 GitHub 发布，从修复后的提交重新创建它们，并在继续之前从头重新运行所有相关预检。
20. 从同一分支使用同一标签启动实际发布的 `.github/workflows/openclaw-npm-release.yml`。
21. 等待 `@openclaw/openclaw-release-managers` 对 `npm-release` 环境的批准。
22. 运行发布后验证：`node --import tsx scripts/openclaw-npm-postpublish-verify.ts <published-version>`。
23. 运行已发布 Beta 后验证检查清单。
24. 使用 Peter 的 `.profile` 中的 bot 令牌尽力在 Discord 上宣布 Beta/稳定版发布。
25. 如果运营者只请求 Beta，在 Beta 验证和公告后停止。
26. 如果稳定版发布到 `beta`，使用轻量稳定版推广检查清单，然后启动私有 dist-tag 工作流，将该稳定版从 `beta` 推广到 `latest`。
27. 对于稳定版发布，验证 mac 构建、签名和公证均已完成，且 `appcast.xml` 已更新。
28. 发布后，验证 npm 和附加的发布产物。

## GHSA 安全通报工作

- 使用 `openclaw-ghsa-maintainer` 进行 GHSA 安全通报检查、补丁/发布流程、私有分支验证和 GHSA API 特定发布检查。
