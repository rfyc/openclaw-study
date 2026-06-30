---
summary: "安装、列出、卸载、更新和发布 OpenClaw 插件的快速示例"
read_when:
  - 你想要快速的插件安装、列出、更新或卸载示例
  - 你想在 ClawHub 和 npm 插件分发之间做选择
  - 你正在发布一个插件包
title: "管理插件"
sidebarTitle: "管理插件"
---

大多数插件工作流只需几条命令：搜索、安装、重启 Gateway、验证，以及在不再需要时卸载插件。

## 列出插件

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

使用 `--json` 进行脚本操作。它包含注册表诊断信息以及当插件包声明了 `dependencies` 或 `optionalDependencies` 时每个插件的静态 `dependencyStatus`。

```bash
openclaw plugins list --json \
  | jq '.plugins[] | {id, enabled, format, source, dependencyStatus}'
```

`plugins list` 是冷库存检查。它显示 OpenClaw 可以从配置、清单和插件注册表发现的内容；它不能证明已运行的 Gateway 进程导入了插件运行时。

## 安装插件

```bash
# 在 ClawHub 上搜索插件包。
openclaw plugins search "calendar"

# 裸包规范首先尝试 ClawHub，然后回退到 npm。
openclaw plugins install <package>

# 强制指定来源。
openclaw plugins install clawhub:<package>
openclaw plugins install npm:<package>

# 安装特定版本或 dist-tag。
openclaw plugins install clawhub:<package>@1.2.3
openclaw plugins install clawhub:<package>@beta
openclaw plugins install npm:@scope/openclaw-plugin@1.2.3
openclaw plugins install npm:@openclaw/codex

# 从 git 或本地开发检出安装。
openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0
openclaw plugins install ./my-plugin
openclaw plugins install --link ./my-plugin
```

安装插件代码后，重启服务你频道的 Gateway：

```bash
openclaw gateway restart
openclaw plugins inspect <plugin-id> --runtime --json
```

当你需要证明插件注册了运行时表面（如工具、钩子、服务、Gateway 方法或插件自有的 CLI 命令）时，使用 `inspect --runtime`。

## 更新插件

```bash
openclaw plugins update <plugin-id>
openclaw plugins update <npm-package-or-spec>
openclaw plugins update --all
```

如果插件是从 npm dist-tag（如 `@beta`）安装的，后续 `update <plugin-id>` 调用会重用该记录的标签。传入显式的 npm 规范会将跟踪的安装切换到该规范以用于将来的更新。

```bash
openclaw plugins update @scope/openclaw-plugin@beta
openclaw plugins update @scope/openclaw-plugin
```

第二条命令在插件之前被固定到某个确切版本或标签时，将其移回注册表的默认发布线。

当 `openclaw update` 在 beta 频道上运行时，默认线 npm 和 ClawHub 插件记录首先尝试匹配的插件 `@beta` 版本。如果该 beta 版本不存在，OpenClaw 回退到记录的默认/最新规范。精确版本和显式标签（如 `@rc` 或 `@beta`）会被保留。

## 卸载插件

```bash
openclaw plugins uninstall <plugin-id> --dry-run
openclaw plugins uninstall <plugin-id>
openclaw plugins uninstall <plugin-id> --keep-files
openclaw gateway restart
```

卸载会删除插件的配置条目、插件索引记录、允许/拒绝列表条目，以及适用时的链接加载路径。托管安装目录会被删除，除非你传入 `--keep-files`。

## 发布插件

你可以将外部插件发布到 [ClawHub](https://clawhub.ai)、npmjs.com 或两者。

### 发布到 ClawHub

ClawHub 是 OpenClaw 插件的主要公共发现表面。它为用户提供可搜索的元数据、版本历史和安装前的注册表扫描结果。

```bash
npm i -g clawhub
clawhub login
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

用户可以通过以下方式从 ClawHub 安装：

```bash
openclaw plugins install clawhub:<package>
openclaw plugins install <package>
```

裸形式仍然首先检查 ClawHub。

### 发布到 npmjs.com

原生 npm 插件必须包含插件清单和 `package.json` OpenClaw 入口点元数据。

```json package.json
{
  "name": "@acme/openclaw-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

```bash
npm publish --access public
```

用户仅通过 npm 安装：

```bash
openclaw plugins install npm:@acme/openclaw-plugin
openclaw plugins install npm:@acme/openclaw-plugin@beta
openclaw plugins install npm:@acme/openclaw-plugin@1.0.0
```

如果同一个包也在 ClawHub 上可用，`npm:` 会跳过 ClawHub 查找并强制 npm 解析。

## 来源选择

- **ClawHub**：当你想要 OpenClaw 原生发现、扫描摘要、版本和安装提示时使用。
- **npmjs.com**：当你已经发布 JavaScript 包或需要 npm dist-tags/私有注册表工作流时使用。
- **Git**：当你想直接从分支、标签或提交安装时使用。
- **本地路径**：当你在同一台机器上开发或测试插件时使用。

## 相关

- [插件](/tools/plugin) - 概述和故障排除
- [`openclaw plugins`](/cli/plugins) - 完整 CLI 参考
- [ClawHub](/tools/clawhub) - 发布和注册表操作
- [构建插件](/plugins/building-plugins) - 创建插件包
- [插件清单](/plugins/manifest) - 清单和包元数据
