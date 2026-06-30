---
summary: "OpenClaw 如何安装插件包和解析插件依赖"
read_when:
  - 你正在调试插件包安装
  - 你正在更改插件启动、doctor 或包管理器安装行为
  - 你正在维护打包的 OpenClaw 安装或捆绑插件清单
title: "插件依赖解析"
sidebarTitle: "依赖"
---

# 插件依赖解析

OpenClaw 将插件依赖工作保留在安装/更新时。运行时加载不运行包管理器、修复依赖树或改变 OpenClaw 包目录。

## 职责划分

插件包拥有其依赖图：

- 运行时依赖位于插件包的 `dependencies` 或 `optionalDependencies` 中
- SDK/核心导入是对等或由 OpenClaw 提供的导入
- 本地开发插件携带其自己已安装的依赖
- npm 和 git 插件被安装到 OpenClaw 拥有的包根目录中

OpenClaw 只拥有插件生命周期：

- 发现插件来源
- 在明确请求时安装或更新包
- 记录安装元数据
- 加载插件入口点
- 依赖缺失时提供可操作的错误信息

## 安装根目录

OpenClaw 使用稳定的每来源根目录：

- npm 包安装在 `~/.openclaw/npm` 下
- git 包克隆在 `~/.openclaw/git` 下
- 本地/路径/存档安装在不进行依赖修复的情况下被复制或引用

npm 安装在 npm 根目录中运行：

```bash
npm install --prefix ~/.openclaw/npm <spec> --omit=dev --ignore-scripts --no-audit --no-fund
```

npm 可能将传递依赖提升到插件包旁边的 `~/.openclaw/npm/node_modules`。OpenClaw 在信任安装之前扫描托管的 npm 根目录，并在卸载期间使用 npm 删除 npm 管理的包，因此提升的运行时依赖保留在托管清理边界内。

git 安装克隆或刷新仓库，然后运行：

```bash
npm install --omit=dev --ignore-scripts --no-audit --no-fund
```

安装的插件然后从该包目录加载，因此包本地和父 `node_modules` 解析与普通 Node 包的工作方式相同。

## 本地插件

本地插件被视为开发者控制的目录。OpenClaw 不为它们运行 `npm install`、`pnpm install` 或依赖修复。如果本地插件有依赖，在加载之前在该插件中安装它们。

第三方 TypeScript 本地插件可以使用紧急 Jiti 路径。打包的 JavaScript 插件和捆绑的内部插件通过原生 import/require 加载，而非 Jiti。

## 启动和重载

Gateway 启动和配置重载从不安装插件依赖。它们读取插件安装记录，计算入口点，然后加载它。

如果运行时缺少依赖，插件加载失败，错误应将运营商指向明确的修复：

```bash
openclaw plugins update <id>
openclaw plugins install <source>
openclaw doctor --fix
```

`doctor --fix` 可以清理旧版 OpenClaw 生成的依赖状态，并安装本地安装记录中缺少的已配置可下载插件。它不修复已安装本地插件的依赖。

## 捆绑插件

轻量级和核心关键的捆绑插件作为 OpenClaw 的一部分发布。它们应该没有沉重的运行时依赖树，或者被移到 ClawHub/npm 上的可下载包。

有关当前在核心包中发布、外部安装或仅保留源码的插件的生成列表，请参见[插件清单](/plugins/plugin-inventory)。

捆绑插件清单不得请求依赖暂存。大型或可选的插件功能应打包为普通插件，并通过与第三方插件相同的 npm/git/ClawHub 路径安装。

在源码检出中，OpenClaw 将仓库视为 pnpm monorepo。`pnpm install` 后，捆绑插件从 `extensions/<id>` 加载，因此包本地工作区依赖可用，编辑被直接拾取。源码检出开发仅支持 pnpm；在仓库根目录运行普通 `npm install` 不是准备捆绑插件依赖的受支持方式。

| 安装形态                       | 捆绑插件位置                      | 依赖所有者                                 |
| ------------------------------ | --------------------------------- | ------------------------------------------ |
| `npm install -g openclaw`      | 包内构建的运行时树                | OpenClaw 包和显式插件安装/更新/doctor 流程 |
| Git 检出加 `pnpm install`      | `extensions/<id>` 工作区包        | pnpm 工作区，包括每个插件包自己的依赖      |
| `openclaw plugins install ...` | 托管的 npm/git/ClawHub 插件根目录 | 插件安装/更新流程                          |

## 旧版清理

较旧的 OpenClaw 版本在启动时或在 doctor 修复期间生成了捆绑插件依赖根目录。当使用 `--fix` 时，当前的 doctor 清理删除这些过时目录和符号链接，包括旧版 `plugin-runtime-deps` 根目录、指向已修剪 `plugin-runtime-deps` 目标的全局 Node 前缀包符号链接、`.openclaw-runtime-deps*` 清单、生成的插件 `node_modules`、安装暂存目录和包本地 pnpm 存储。打包的 postinstall 也在修剪旧版目标根目录之前删除这些全局符号链接，以防升级留下悬挂的 ESM 包导入。

这些路径仅是旧版遗留物。新安装不应创建它们。
