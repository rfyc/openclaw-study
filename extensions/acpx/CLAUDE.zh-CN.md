# ACPX 插件说明

此文件适用于 `extensions/acpx/` 下的工作。

## 目的

ACPX 插件是对已发布的 `acpx` 包的一个精简 OpenClaw 封装。将可复用的 ACP 运行时逻辑保留在 `openclaw/acpx` 中，而不是在此插件中。

## 默认版本策略

- `extensions/acpx/package.json` 默认应指向已发布的 npm 版本。
- 一旦 ACPX 版本发布，不要将插件固定在临时 GitHub 提交或本地检出上。
- 切换回已发布的 ACPX 包后，不要留下临时的 pnpm 构建脚本允许列表例外。

## 未发布的 ACPX 开发流程

当 OpenClaw 在 ACPX 版本发布之前需要未发布的 ACPX 更改时，使用此流程。

1. 首先在 `openclaw/acpx` 仓库中进行 ACPX 代码更改。
2. 在 OpenClaw 中，将 `extensions/acpx/package.json` 临时指向所需的 ACPX GitHub 提交。
3. 如果 pnpm 阻止该临时 GitHub 来源包的 ACPX 生命周期/构建脚本，临时将 `acpx` 添加到 `package.json` 和 `pnpm-workspace.yaml` 中的 `onlyBuiltDependencies`。
4. 刷新根工作区锁文件：
   - `pnpm install --lockfile-only --filter ./extensions/acpx`
5. 刷新插件本地 npm 锁以获取安装元数据：
   - `cd extensions/acpx && npm install --package-lock-only --ignore-scripts`
6. 在进行实时 ACP 验证之前，重新构建 OpenClaw 并重启网关。
7. 一旦 ACPX 发布，将 `extensions/acpx/package.json` 切换回已发布的 npm 版本，并再次刷新相同的锁文件。
8. 删除仅为 GitHub 来源开发固定版本所需的临时 `acpx` 构建脚本允许列表条目。

## 锁文件说明

- `pnpm-lock.yaml` 是跟踪的工作区锁文件，必须与 `extensions/acpx/package.json` 引用的 ACPX 版本匹配。
- `extensions/acpx/package-lock.json` 是插件包的有用本地安装元数据。
- 如果 `extensions/acpx/package-lock.json` 在此仓库状态中被 gitignore 忽略，重新生成它对于本地验证仍然有用，但不会出现在 `git status` 中。

## 本地运行时验证

当此处 ACPX 集成发生更改时，优先使用以下序列：

1. `pnpm install --filter ./extensions/acpx`
2. `pnpm test:extension acpx`
3. `pnpm build`
4. 如果 ACP 运行时行为或打包插件连接发生变化，重启本地网关。
5. 如果更改影响聊天中的直接 ACP 行为，在重启后运行真实的 ACP 冒烟测试。

## 直接 ACPX 二进制策略

- 优先使用 `extensions/acpx/node_modules/.bin/acpx` 下的插件本地 ACPX 二进制文件。
- 不要依赖全局安装的 `acpx` 二进制文件进行 OpenClaw ACP 验证。
- 如果插件本地 ACPX 二进制文件缺失或版本错误，请从 `extensions/acpx/package.json` 中固定的版本重新安装。

## 边界规则

如果某项更改感觉像是共享 ACP 运行时行为而不是 OpenClaw 特定的粘合代码，请将其移至 `openclaw/acpx` 并从这里使用，而不是在 `extensions/acpx` 内重新实现。
