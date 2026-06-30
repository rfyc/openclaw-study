---
summary: "definePluginEntry、defineChannelPluginEntry 和 defineSetupPluginEntry 的参考文档"
title: "插件入口点"
sidebarTitle: "入口点"
read_when:
  - 你需要 definePluginEntry 或 defineChannelPluginEntry 的确切类型签名
  - 你想了解注册模式（full vs setup vs CLI metadata）
  - 你正在查找入口点选项
---

每个插件都导出一个默认入口对象。SDK 提供了三个助手来创建它们。

对于已安装的插件，`package.json` 在可用时应将运行时加载指向构建的 JavaScript：

```json
{
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"],
    "setupEntry": "./src/setup-entry.ts",
    "runtimeSetupEntry": "./dist/setup-entry.js"
  }
}
```

`extensions` 和 `setupEntry` 对于工作区和 git 检出开发仍然是有效的源入口。当 OpenClaw 加载已安装的包并让 npm 包避免运行时 TypeScript 编译时，首选 `runtimeExtensions` 和 `runtimeSetupEntry`。显式运行时入口是必需的：`runtimeSetupEntry` 需要 `setupEntry`，缺少 `runtimeExtensions` 或 `runtimeSetupEntry` 工件会导致安装/发现失败，而不是静默回退到源。如果已安装的包只声明了 TypeScript 源入口，OpenClaw 将在存在匹配的构建 `dist/*.js` 对等时使用它，然后回退到 TypeScript 源。

所有入口路径必须保留在插件包目录内。运行时入口和推断的构建 JavaScript 对等不使转义的 `extensions` 或 `setupEntry` 源路径有效。

<Tip>
  **寻找演练？** 请参见[频道插件](/plugins/sdk-channel-plugins)
  或[提供商插件](/plugins/sdk-provider-plugins)，了解分步指南。
</Tip>

## `definePluginEntry`

**导入：** `openclaw/plugin-sdk/plugin-entry`

用于提供商插件、工具插件、钩子插件以及**不是**
消息频道的任何东西。

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  description: "Short summary",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
  },
});
```

| 字段           | 类型                                                             | 必需 | 默认值     |
| -------------- | ---------------------------------------------------------------- | ---- | ---------- |
| `id`           | `string`                                                         | 是   | —          |
| `name`         | `string`                                                         | 是   | —          |
| `description`  | `string`                                                         | 是   | —          |
| `kind`         | `string`                                                         | 否   | —          |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空对象模式 |
| `register`     | `(api: OpenClawPluginApi) => void`                               | 是   | —          |

- `id` 必须与你的 `openclaw.plugin.json` 清单匹配。
- `kind` 用于独占槽：`"memory"` 或 `"context-engine"`。
- `configSchema` 可以是用于懒加载的函数。
- OpenClaw 在首次访问时解析并记忆该模式，因此昂贵的模式
  构建器只运行一次。

## `defineChannelPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

用频道特定的连接包装 `definePluginEntry`。自动调用
`api.registerChannel({ plugin })`，公开可选的根帮助 CLI 元数据
接口，并在注册模式上门控 `registerFull`。

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "Short summary",
  plugin: myChannelPlugin,
  setRuntime: setMyRuntime,
  registerCliMetadata(api) {
    api.registerCli(/* ... */);
  },
  registerFull(api) {
    api.registerGatewayMethod(/* ... */);
  },
});
```

| 字段                  | 类型                                                             | 必需 | 默认值     |
| --------------------- | ---------------------------------------------------------------- | ---- | ---------- |
| `id`                  | `string`                                                         | 是   | —          |
| `name`                | `string`                                                         | 是   | —          |
| `description`         | `string`                                                         | 是   | —          |
| `plugin`              | `ChannelPlugin`                                                  | 是   | —          |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空对象模式 |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | 否   | —          |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | 否   | —          |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | 否   | —          |

- `setRuntime` 在注册期间调用，以便你可以存储运行时引用
  （通常通过 `createPluginRuntimeStore`）。在 CLI 元数据
  捕获期间跳过。
- `registerCliMetadata` 在 `api.registrationMode === "cli-metadata"`、
  `api.registrationMode === "discovery"` 和
  `api.registrationMode === "full"` 时运行。
  将其用作频道拥有的 CLI 描述符的规范位置，以便根帮助
  保持非激活状态，发现快照包含静态命令元数据，并且
  正常的 CLI 命令注册与完整插件加载保持兼容。
- 发现注册是非激活的，不是无导入的。OpenClaw 可以
  评估受信任的插件入口和频道插件模块来构建
  快照，因此保持顶级导入无副作用并将套接字、
  客户端、工作者和服务置于 `"full"` 专属路径后面。
- 仅当 `api.registrationMode === "full"` 时才运行 `registerFull`。在
  仅设置加载期间跳过。
- 与 `definePluginEntry` 一样，`configSchema` 可以是懒加载工厂，OpenClaw
  在首次访问时记忆解析的模式。
- 对于插件拥有的根 CLI 命令，当你希望命令保持懒加载而不从
  根 CLI 解析树消失时，优先使用 `api.registerCli(..., { descriptors: [...] })`。
  对于频道插件，优先从 `registerCliMetadata(...)` 注册这些描述符
  并保持 `registerFull(...)` 专注于仅运行时的工作。
- 如果 `registerFull(...)` 还注册了网关 RPC 方法，请将它们保留在
  插件特定前缀上。保留的核心管理员命名空间（`config.*`、
  `exec.approvals.*`、`wizard.*`、`update.*`）始终被强制为
  `operator.admin`。

## `defineSetupPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

用于轻量级 `setup-entry.ts` 文件。返回只有 `{ plugin }` 的对象，没有
运行时或 CLI 连接。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

当频道被禁用、未配置或启用了延迟加载时，OpenClaw 加载此而不是完整入口。请参见
[设置和配置](/plugins/sdk-setup#setup-entry) 了解何时重要。

在实践中，将 `defineSetupPluginEntry(...)` 与窄设置助手族配对：

- `openclaw/plugin-sdk/setup-runtime` 用于运行时安全的设置助手，如
  导入安全的设置补丁适配器、查找笔记输出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 和委托设置代理
- `openclaw/plugin-sdk/channel-setup` 用于可选安装设置界面
- `openclaw/plugin-sdk/setup-tools` 用于设置/安装 CLI/存档/文档助手

将重型 SDK、CLI 注册和长期运行时服务保留在完整入口中。

将设置和运行时界面分开的捆绑工作区频道可以改用
`openclaw/plugin-sdk/channel-entry-contract` 中的 `defineBundledChannelSetupEntry(...)`。
该合约让设置入口保持设置安全的插件/密钥导出，同时仍然公开
运行时设置器：

```typescript
import { defineBundledChannelSetupEntry } from "openclaw/plugin-sdk/channel-entry-contract";

export default defineBundledChannelSetupEntry({
  importMetaUrl: import.meta.url,
  plugin: {
    specifier: "./channel-plugin-api.js",
    exportName: "myChannelPlugin",
  },
  runtime: {
    specifier: "./runtime-api.js",
    exportName: "setMyChannelRuntime",
  },
});
```

仅当设置流程在完整频道入口加载之前确实需要轻量级运行时
设置器时才使用该捆绑合约。

## 注册模式

`api.registrationMode` 告诉你的插件它是如何加载的：

| 模式              | 何时                    | 注册什么                                                                          |
| ----------------- | ----------------------- | --------------------------------------------------------------------------------- |
| `"full"`          | 正常网关启动            | 所有内容                                                                          |
| `"discovery"`     | 只读能力发现            | 频道注册加上静态 CLI 描述符；入口代码可以加载，但跳过套接字、工作者、客户端和服务 |
| `"setup-only"`    | 禁用/未配置频道         | 仅频道注册                                                                        |
| `"setup-runtime"` | 有运行时可用的设置流程  | 频道注册加上完整入口加载之前所需的轻量级运行时                                    |
| `"cli-metadata"`  | 根帮助 / CLI 元数据捕获 | 仅 CLI 描述符                                                                     |

`defineChannelPluginEntry` 自动处理此分割。如果你对频道直接使用
`definePluginEntry`，请自己检查模式：

```typescript
register(api) {
  if (
    api.registrationMode === "cli-metadata" ||
    api.registrationMode === "discovery" ||
    api.registrationMode === "full"
  ) {
    api.registerCli(/* ... */);
    if (api.registrationMode === "cli-metadata") return;
  }

  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // Heavy runtime-only registrations
  api.registerService(/* ... */);
}
```

发现模式构建非激活的注册表快照。它仍然可以评估
插件入口和频道插件对象，以便 OpenClaw 可以注册频道
能力和静态 CLI 描述符。将发现中的模块评估视为
受信任但轻量级的：顶层不得有网络客户端、子进程、监听器、数据库
连接、后台工作者、凭据读取或其他活动运行时副作用。

将 `"setup-runtime"` 视为仅设置启动接口必须在不重新进入完整捆绑频道运行时的情况下存在的窗口。好的选择是频道注册、设置安全的 HTTP 路由、设置安全的网关方法和委托设置助手。重型后台服务、CLI 注册器和提供商/客户端 SDK 引导仍然属于 `"full"`。

对于 CLI 注册器特别说明：

- 当注册器拥有一个或多个根命令并且你希望 OpenClaw 在首次调用时懒加载真实 CLI 模块时使用 `descriptors`
- 确保这些描述符涵盖注册器公开的每个顶级命令根
- 将描述符命令名称保留为字母、数字、连字符和下划线，以字母或数字开头；OpenClaw 拒绝该形状之外的描述符名称，并在渲染帮助之前从描述中去除终端控制序列
- 仅对急加载兼容性路径单独使用 `commands`

## 插件形状

OpenClaw 按注册行为对已加载的插件进行分类：

| 形状                  | 描述                            |
| --------------------- | ------------------------------- |
| **plain-capability**  | 一种能力类型（如仅提供商）      |
| **hybrid-capability** | 多种能力类型（如提供商 + 语音） |
| **hook-only**         | 仅钩子，无能力                  |
| **non-capability**    | 工具/命令/服务但无能力          |

使用 `openclaw plugins inspect <id>` 查看插件的形状。

## 相关文档

- [SDK 概览](/plugins/sdk-overview) — 注册 API 和子路径参考
- [运行时助手](/plugins/sdk-runtime) — `api.runtime` 和 `createPluginRuntimeStore`
- [设置和配置](/plugins/sdk-setup) — 清单、设置入口、延迟加载
- [频道插件](/plugins/sdk-channel-plugins) — 构建 `ChannelPlugin` 对象
- [提供商插件](/plugins/sdk-provider-plugins) — 提供商注册和钩子
