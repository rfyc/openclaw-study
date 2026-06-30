# OpenClaw iOS 版本管理

OpenClaw iOS 使用**固定的 CalVer 发布版本**，而非每次构建时自动读取当前网关版本。

## 目标

- 在迭代期间保持 TestFlight 提交使用一个稳定的应用版本
- 在正常 TestFlight 迭代期间只更改 `CFBundleVersion`
- 仅当维护者选择时才将 iOS 发布版本提升到当前网关版本
- 保持 Apple bundle 字段对 App Store Connect 有效
- 从 iOS 专属变更日志生成 App Store 发布说明

## 版本模型

固定的 iOS 发布版本存储在 `apps/ios/version.json` 中。

支持的固定格式：

- `YYYY.M.D`

示例：

- `2026.4.6`
- `2026.4.10`

`package.json` 中的根网关版本可能仍然是以下之一：

- `YYYY.M.D`
- `YYYY.M.D-beta.N`
- `YYYY.M.D-N`

当你从网关版本固定 iOS 时，iOS 工具会去除网关后缀，只保留基础 CalVer。

示例：

- 网关 `2026.4.10` -> iOS `2026.4.10`
- 网关 `2026.4.10-beta.3` -> iOS `2026.4.10`
- 网关 `2026.4.10-2` -> iOS `2026.4.10`

## Apple bundle 映射

固定的 iOS 版本 `2026.4.10` 映射到：

- `CFBundleShortVersionString = 2026.4.10`
- `CFBundleVersion = 仅数字版本号`

`CFBundleShortVersionString` 在 TestFlight 系列中保持固定，直到你有意固定一个更新的 iOS 发布版本。

## 真实来源和生成文件

### 源文件

- `apps/ios/version.json`
  - 固定的 iOS 发布版本
- `apps/ios/CHANGELOG.md`
  - iOS 专属变更日志和发布说明来源
- `apps/ios/VERSIONING.md`
  - 工作流程和约束

### 生成或派生的文件

- `apps/ios/Config/Version.xcconfig`
  - 从 `apps/ios/version.json` 派生的已检入默认值
- `apps/ios/fastlane/metadata/en-US/release_notes.txt`
  - 从 `apps/ios/CHANGELOG.md` 生成
- `apps/ios/build/Version.xcconfig`
  - 每次构建或 Beta 准备时生成的本地 gitignored 构建覆盖

## 工具界面

### 版本解析和同步工具

- `scripts/lib/ios-version.ts`
  - 验证固定的 iOS CalVer
  - 将网关版本规范化 -> 固定的 iOS CalVer
  - 渲染已检入的 xcconfig 和发布说明
- `scripts/ios-version.ts`
  - 用于 JSON、Shell 或单字段版本读取的 CLI
- `scripts/ios-sync-versioning.ts`
  - 从固定的 iOS 版本同步已检入的派生文件
- `scripts/ios-pin-version.ts`
  - 明确将 iOS 固定到所选发布版本或当前网关版本

### 构建和 Beta 流程

- `scripts/ios-write-version-xcconfig.sh`
  - 读取固定的 iOS 版本
  - 将本地数字版本覆盖文件写入 `apps/ios/build/Version.xcconfig`
- `scripts/ios-beta-prepare.sh`
  - 针对固定的 iOS 版本准备 Beta 签名和 bundle 设置
- `apps/ios/fastlane/Fastfile`
  - 从固定的 iOS 辅助工具解析版本元数据
  - 为固定的短版本递增 TestFlight 版本号

## 发布说明解析顺序

生成 `apps/ios/fastlane/metadata/en-US/release_notes.txt` 时，工具按以下顺序读取第一个可用的变更日志章节：

1. 精确固定版本，例如 `## 2026.4.10`
2. `## Unreleased`

推荐工作流程：

- 在 TestFlight 系列上迭代时，将待发布的说明保留在 `## Unreleased` 下
- 在生产发布前，将最终说明移动或复制到 `## <固定版本>` 下，然后再次运行同步

## 常用命令

```bash
pnpm ios:version
pnpm ios:version:check
pnpm ios:version:sync
pnpm ios:version:pin -- --from-gateway
pnpm ios:version:pin -- --version 2026.4.10
```

## 正常 TestFlight 迭代工作流程

1. 保持 `apps/ios/version.json` 固定到当前 TestFlight 系列版本
2. 在 `apps/ios/CHANGELOG.md` 的 `## Unreleased` 下进行迭代更新
3. 使用常规流程上传更多 Beta 版本
4. 让 Fastlane 仅递增 `CFBundleVersion`

这在审核过程中保持 TestFlight 版本稳定。

## 新版本推广工作流程

当你希望下一个生产 iOS 版本与当前网关版本对齐时：

1. 从根网关版本固定 iOS：

```bash
pnpm ios:version:pin -- --from-gateway
```

2. 检查以下生成的更改：
   - `apps/ios/version.json`
   - `apps/ios/Config/Version.xcconfig`
   - `apps/ios/fastlane/metadata/en-US/release_notes.txt`
3. 如有需要，更新 `apps/ios/CHANGELOG.md` 以适应新版本
4. 如果变更日志已更改，再次运行 `pnpm ios:version:sync`
5. 为该新固定版本提交第一个 TestFlight 构建
6. 仅通过版本号持续迭代，直到发布候选版本准备好
7. 将经过审查的 TestFlight 构建发布到生产环境

## 重要不变量

Fastlane 和 Xcode 应只从 `apps/ios/version.json` 使用固定的 iOS 版本。

单独更改 `package.json.version` 不得更改 iOS 应用版本，直到维护者明确运行固定步骤。
