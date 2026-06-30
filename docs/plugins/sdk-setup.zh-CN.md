---
summary: "Setup wizards、setup-entry.ts、配置 schemas 和 package.json 元数据"
title: "插件设置和配置"
sidebarTitle: "设置和配置"
read_when:
  - 你正在向插件添加设置向导
  - 你需要了解 setup-entry.ts 与 index.ts 的区别
  - 你正在定义插件配置 schemas 或 package.json openclaw 元数据
---

插件打包（`package.json` 元数据）、清单（`openclaw.plugin.json`）、设置入口和配置 schemas 的参考文档。

<Tip>
**寻找演练？** 操作指南在上下文中涵盖打包内容：[频道插件](/plugins/sdk-channel-plugins#step-1-package-and-manifest)和[提供商插件](/plugins/sdk-provider-plugins#step-1-package-and-manifest)。
</Tip>

## 包元数据

你的 `package.json` 需要一个 `openclaw` 字段来告诉插件系统你的插件提供什么：

<Tabs>
  <Tab title="频道插件">
    ```json
    {
      "name": "@myorg/openclaw-my-channel",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "setupEntry": "./setup-entry.ts",
        "channel": {
          "id": "my-channel",
          "label": "My Channel",
          "blurb": "Short description of the channel."
        }
      }
    }
    ```
  </Tab>
  <Tab title="提供商插件 / ClawHub 基准">
    ```json openclaw-clawhub-package.json
    {
      "name": "@myorg/openclaw-my-plugin",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "compat": {
          "pluginApi": ">=2026.3.24-beta.2",
          "minGatewayVersion": "2026.3.24-beta.2"
        },
        "build": {
          "openclawVersion": "2026.3.24-beta.2",
          "pluginSdkVersion": "2026.3.24-beta.2"
        }
      }
    }
    ```
  </Tab>
</Tabs>

<Note>
如果你在 ClawHub 上外部发布插件，则 `compat` 和 `build` 字段是必需的。规范的发布代码片段位于 `docs/snippets/plugin-publish/`。
</Note>

### `openclaw` 字段

<ParamField path="extensions" type="string[]">
  入口点文件（相对于包根目录）。
</ParamField>
<ParamField path="setupEntry" type="string">
  轻量级仅设置入口（可选）。
</ParamField>
<ParamField path="channel" type="object">
  用于设置、选择器、快速开始和状态界面的频道目录元数据。
</ParamField>
<ParamField path="providers" type="string[]">
  此插件注册的提供商 id 列表。
</ParamField>
<ParamField path="install" type="object">
  安装提示：`npmSpec`、`localPath`、`defaultChoice`、`minHostVersion`、`expectedIntegrity`、`allowInvalidConfigRecovery`。
</ParamField>
<ParamField path="startup" type="object">
  启动行为标志。
</ParamField>

### `openclaw.channel`

`openclaw.channel` 是在运行时加载之前用于频道发现和设置界面的廉价包元数据。

| 字段                                   | 类型       | 含义                                                 |
| -------------------------------------- | ---------- | ---------------------------------------------------- |
| `id`                                   | `string`   | 规范频道 id。                                        |
| `label`                                | `string`   | 主要频道标签。                                       |
| `selectionLabel`                       | `string`   | 选择器/设置标签（当应与 `label` 不同时使用）。       |
| `detailLabel`                          | `string`   | 用于更丰富频道目录和状态界面的辅助详细标签。         |
| `docsPath`                             | `string`   | 用于设置和选择链接的文档路径。                       |
| `docsLabel`                            | `string`   | 文档链接的覆盖标签（当应与频道 id 不同时使用）。     |
| `blurb`                                | `string`   | 简短的引导/目录描述。                                |
| `order`                                | `number`   | 频道目录中的排序顺序。                               |
| `aliases`                              | `string[]` | 用于频道选择的额外查找别名。                         |
| `preferOver`                           | `string[]` | 此频道应优先于的低优先级插件/频道 id。               |
| `systemImage`                          | `string`   | 用于频道 UI 目录的可选图标/系统图像名称。            |
| `selectionDocsPrefix`                  | `string`   | 在选择界面中文档链接前的前缀文本。                   |
| `selectionDocsOmitLabel`               | `boolean`  | 在选择文案中直接显示文档路径而不是带标签的文档链接。 |
| `selectionExtras`                      | `string[]` | 附加在选择文案中的额外短字符串。                     |
| `markdownCapable`                      | `boolean`  | 将频道标记为 markdown 兼容，用于出站格式化决策。     |
| `exposure`                             | `object`   | 用于设置、已配置列表和文档界面的频道可见性控制。     |
| `quickstartAllowFrom`                  | `boolean`  | 将此频道纳入标准快速开始 `allowFrom` 设置流程。      |
| `forceAccountBinding`                  | `boolean`  | 即使只有一个账户存在，也需要显式账户绑定。           |
| `preferSessionLookupForAnnounceTarget` | `boolean`  | 在解析此频道的公告目标时优先使用会话查找。           |

示例：

```json
{
  "openclaw": {
    "channel": {
      "id": "my-channel",
      "label": "My Channel",
      "selectionLabel": "My Channel (self-hosted)",
      "detailLabel": "My Channel Bot",
      "docsPath": "/channels/my-channel",
      "docsLabel": "my-channel",
      "blurb": "Webhook-based self-hosted chat integration.",
      "order": 80,
      "aliases": ["mc"],
      "preferOver": ["my-channel-legacy"],
      "selectionDocsPrefix": "Guide:",
      "selectionExtras": ["Markdown"],
      "markdownCapable": true,
      "exposure": {
        "configured": true,
        "setup": true,
        "docs": true
      },
      "quickstartAllowFrom": true
    }
  }
}
```

`exposure` 支持：

- `configured`：将频道包含在已配置/状态样式的列表界面中
- `setup`：将频道包含在交互式设置/配置选择器中
- `docs`：在文档/导航界面中将频道标记为面向公众

<Note>
`showConfigured` 和 `showInSetup` 作为旧版别名仍受支持。优先使用 `exposure`。
</Note>

### `openclaw.install`

`openclaw.install` 是包元数据，不是清单元数据。

| 字段                         | 类型                                | 含义                                                                 |
| ---------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `clawhubSpec`                | `string`                            | 用于安装/更新和引导按需安装流程的规范 ClawHub 规范。                 |
| `npmSpec`                    | `string`                            | 用于安装/更新回退流程的规范 npm 规范。                               |
| `localPath`                  | `string`                            | 本地开发或捆绑安装路径。                                             |
| `defaultChoice`              | `"clawhub"` \| `"npm"` \| `"local"` | 当多个源可用时首选的安装源。                                         |
| `minHostVersion`             | `string`                            | 支持的最低 OpenClaw 版本，格式为 `>=x.y.z` 或 `>=x.y.z-prerelease`。 |
| `expectedIntegrity`          | `string`                            | 预期的 npm 分发完整性字符串，通常为 `sha512-...`，用于固定安装。     |
| `allowInvalidConfigRecovery` | `boolean`                           | 让捆绑插件重装流程从特定的过期配置失败中恢复。                       |

<AccordionGroup>
  <Accordion title="引导行为">
    交互式引导也使用 `openclaw.install` 进行按需安装界面。如果你的插件在运行时加载之前公开了提供商认证选项或频道设置/目录元数据，引导可以显示该选项，提示 ClawHub、npm 或本地安装，安装或启用插件，然后继续所选流程。ClawHub 引导选项使用 `clawhubSpec`，当存在时优先使用；npm 选项需要带有注册表 `npmSpec` 的受信任目录元数据；确切版本和 `expectedIntegrity` 是可选的 npm 固定。如果存在 `expectedIntegrity`，安装/更新流程会对 npm 强制执行它。将"显示什么"元数据放在 `openclaw.plugin.json` 中，将"如何安装"元数据放在 `package.json` 中。
  </Accordion>
  <Accordion title="minHostVersion 强制执行">
    如果设置了 `minHostVersion`，安装和非捆绑清单注册表加载都会强制执行它。较旧的宿主跳过外部插件；无效的版本字符串会被拒绝。假设捆绑源插件与宿主检出版本一致。
  </Accordion>
  <Accordion title="固定 npm 安装">
    对于固定的 npm 安装，在 `npmSpec` 中保留确切版本并添加预期的制品完整性：

    ```json
    {
      "openclaw": {
        "install": {
          "npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3",
          "expectedIntegrity": "sha512-REPLACE_WITH_NPM_DIST_INTEGRITY",
          "defaultChoice": "npm"
        }
      }
    }
    ```

  </Accordion>
  <Accordion title="allowInvalidConfigRecovery 范围">
    `allowInvalidConfigRecovery` 不是对损坏配置的通用旁路。它仅用于狭义的捆绑插件恢复，因此重新安装/设置可以修复同一插件的已知升级遗留问题，如缺少捆绑插件路径或过期的 `channels.<id>` 条目。如果配置因无关原因损坏，安装仍然会失败关闭并告知运营商运行 `openclaw doctor --fix`。
  </Accordion>
</AccordionGroup>

### 延迟完整加载

频道插件可以通过以下方式选择延迟加载：

```json
{
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

启用后，即使对于已配置的频道，OpenClaw 在监听前启动阶段也只加载 `setupEntry`。完整入口在网关开始监听后加载。

<Warning>
仅当你的 `setupEntry` 在网关开始监听之前注册了网关所需的所有内容（频道注册、HTTP 路由、网关方法）时才启用延迟加载。如果完整入口拥有所需的启动能力，请保留默认行为。
</Warning>

如果你的设置/完整入口注册了网关 RPC 方法，请将它们保留在插件特定前缀上。保留的核心管理员命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）始终归核心所有，并始终解析为 `operator.admin`。

## 插件清单

每个原生插件都必须在包根目录中提供 `openclaw.plugin.json`。OpenClaw 使用它来验证配置而不执行插件代码。

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "Adds My Plugin capabilities to OpenClaw",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "webhookSecret": {
        "type": "string",
        "description": "Webhook verification secret"
      }
    }
  }
}
```

对于频道插件，添加 `kind` 和 `channels`：

```json
{
  "id": "my-channel",
  "kind": "channel",
  "channels": ["my-channel"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

即使没有配置的插件也必须提供 schema。空 schema 是有效的：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

有关完整的 schema 参考，请参见[插件清单](/plugins/manifest)。

## ClawHub 发布

对于插件包，使用特定于包的 ClawHub 命令：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

<Note>
旧版仅技能发布别名适用于技能。插件包应始终使用 `clawhub package publish`。
</Note>

## 设置入口

`setup-entry.ts` 文件是 `index.ts` 的轻量级替代，OpenClaw 在只需要设置界面时加载它（引导、配置修复、禁用频道检查）。

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

这避免了在设置流程中加载繁重的运行时代码（加密库、CLI 注册、后台服务）。

将设置安全的导出保留在辅助模块中的捆绑工作区频道可以使用 `openclaw/plugin-sdk/channel-entry-contract` 中的 `defineBundledChannelSetupEntry(...)` 代替 `defineSetupPluginEntry(...)`。该捆绑合约还支持可选的 `runtime` 导出，以便设置时运行时连接可以保持轻量级和显式。

<AccordionGroup>
  <Accordion title="OpenClaw 何时使用 setupEntry 代替完整入口">
    - 频道已禁用但需要设置/引导界面。
    - 频道已启用但未配置。
    - 已启用延迟加载（`deferConfiguredChannelFullLoadUntilAfterListen`）。

  </Accordion>
  <Accordion title="setupEntry 必须注册什么">
    - 频道插件对象（通过 `defineSetupPluginEntry`）。
    - 网关监听之前所需的任何 HTTP 路由。
    - 启动期间需要的任何网关方法。

    这些启动网关方法仍应避免保留的核心管理员命名空间，如 `config.*` 或 `update.*`。

  </Accordion>
  <Accordion title="setupEntry 不应包含什么">
    - CLI 注册。
    - 后台服务。
    - 繁重的运行时导入（加密、SDK）。
    - 仅在启动后需要的网关方法。

  </Accordion>
</AccordionGroup>

### 窄设置助手导入

对于热设置专用路径，当你只需要部分设置界面时，优先使用窄设置助手接口而不是更宽的 `plugin-sdk/setup` 伞形接口：

| 导入路径                           | 用途                                                   | 关键导出                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime`         | 在 `setupEntry` / 延迟频道启动中可用的设置时运行时助手 | `createPatchedAccountSetupAdapter`、`createEnvPatchedAccountSetupAdapter`、`createSetupInputPresenceValidator`、`noteChannelLookupFailure`、`noteChannelLookupSummary`、`promptResolvedAllowFrom`、`splitSetupEntries`、`createAllowlistSetupWizardProxy`、`createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-adapter-runtime` | 环境感知账户设置适配器                                 | `createEnvPatchedAccountSetupAdapter`                                                                                                                                                                                                                                                        |
| `plugin-sdk/setup-tools`           | 设置/安装 CLI/存档/文档助手                            | `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR`                                                                                                                                                                                |

当你需要完整的共享设置工具箱（包括配置补丁助手如 `moveSingleAccountChannelSectionToDefaultAccount(...)`）时，使用更宽的 `plugin-sdk/setup` 接口。

设置补丁适配器在导入时保持热路径安全。它们的捆绑单账户提升合约界面查找是惰性的，因此导入 `plugin-sdk/setup-runtime` 不会在适配器实际使用之前急切地加载捆绑合约界面发现。

### 频道拥有的单账户提升

当频道从单账户顶级配置升级到 `channels.<id>.accounts.*` 时，默认共享行为是将提升的账户范围值移动到 `accounts.default`。

捆绑频道可以通过其设置合约界面缩小或覆盖该提升：

- `singleAccountKeysToMove`：应移入提升账户的额外顶级键
- `namedAccountPromotionKeys`：当命名账户已经存在时，只有这些键移入提升账户；共享策略/传递键保留在频道根
- `resolveSingleAccountPromotionTarget(...)`：选择哪个现有账户接收提升的值

<Note>
Matrix 是当前的捆绑示例。如果恰好存在一个命名 Matrix 账户，或者 `defaultAccount` 指向现有的非规范键（如 `Ops`），提升会保留该账户而不是创建新的 `accounts.default` 条目。
</Note>

## 配置 schema

插件配置根据清单中的 JSON Schema 进行验证。用户通过以下方式配置插件：

```json5
{
  plugins: {
    entries: {
      "my-plugin": {
        config: {
          webhookSecret: "abc123",
        },
      },
    },
  },
}
```

你的插件在注册期间通过 `api.pluginConfig` 接收此配置。

对于特定于频道的配置，改用频道配置部分：

```json5
{
  channels: {
    "my-channel": {
      token: "bot-token",
      allowFrom: ["user1", "user2"],
    },
  },
}
```

### 构建频道配置 schemas

使用 `buildChannelConfigSchema` 将 Zod schema 转换为插件拥有的配置制品使用的 `ChannelConfigSchema` 包装器：

```typescript
import { z } from "zod";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk/channel-config-schema";

const accountSchema = z.object({
  token: z.string().optional(),
  allowFrom: z.array(z.string()).optional(),
  accounts: z.object({}).catchall(z.any()).optional(),
  defaultAccount: z.string().optional(),
});

const configSchema = buildChannelConfigSchema(accountSchema);
```

如果你已经以 JSON Schema 或 TypeBox 编写合约，使用直接助手，这样 OpenClaw 可以在元数据路径上跳过 Zod 到 JSON Schema 的转换：

```typescript
import { Type } from "typebox";
import { buildJsonChannelConfigSchema } from "openclaw/plugin-sdk/channel-config-schema";

const configSchema = buildJsonChannelConfigSchema(
  Type.Object({
    token: Type.Optional(Type.String()),
    allowFrom: Type.Optional(Type.Array(Type.String())),
  }),
);
```

对于第三方插件，冷路径合约仍然是插件清单：将生成的 JSON Schema 镜像到 `openclaw.plugin.json#channelConfigs` 中，以便配置 schema、设置和 UI 界面可以在不加载运行时代码的情况下检查 `channels.<id>`。

## 设置向导

频道插件可以为 `openclaw onboard` 提供交互式设置向导。向导是 `ChannelPlugin` 上的 `ChannelSetupWizard` 对象：

```typescript
import type { ChannelSetupWizard } from "openclaw/plugin-sdk/channel-setup";

const setupWizard: ChannelSetupWizard = {
  channel: "my-channel",
  status: {
    configuredLabel: "Connected",
    unconfiguredLabel: "Not configured",
    resolveConfigured: ({ cfg }) => Boolean((cfg.channels as any)?.["my-channel"]?.token),
  },
  credentials: [
    {
      inputKey: "token",
      providerHint: "my-channel",
      credentialLabel: "Bot token",
      preferredEnvVar: "MY_CHANNEL_BOT_TOKEN",
      envPrompt: "Use MY_CHANNEL_BOT_TOKEN from environment?",
      keepPrompt: "Keep current token?",
      inputPrompt: "Enter your bot token:",
      inspect: ({ cfg, accountId }) => {
        const token = (cfg.channels as any)?.["my-channel"]?.token;
        return {
          accountConfigured: Boolean(token),
          hasConfiguredValue: Boolean(token),
        };
      },
    },
  ],
};
```

`ChannelSetupWizard` 类型支持 `credentials`、`textInputs`、`dmPolicy`、`allowFrom`、`groupAccess`、`prepare`、`finalize` 等更多内容。完整示例请参见捆绑插件包（例如 Discord 插件 `src/channel.setup.ts`）。

<AccordionGroup>
  <Accordion title="共享 allowFrom 提示">
    对于只需要标准 `note -> prompt -> parse -> merge -> patch` 流程的 DM 允许列表提示，优先使用 `openclaw/plugin-sdk/setup` 中的共享设置助手：`createPromptParsedAllowFromForAccount(...)`、`createTopLevelChannelParsedAllowFromPrompt(...)` 和 `createNestedChannelParsedAllowFromPrompt(...)`。
  </Accordion>
  <Accordion title="标准频道设置状态">
    对于仅在标签、分数和可选额外行上有所不同的频道设置状态块，优先使用 `openclaw/plugin-sdk/setup` 中的 `createStandardChannelSetupStatus(...)` 而不是在每个插件中手动构建相同的 `status` 对象。
  </Accordion>
  <Accordion title="可选频道设置界面">
    对于只应在某些上下文中出现的可选设置界面，使用 `openclaw/plugin-sdk/channel-setup` 中的 `createOptionalChannelSetupSurface`：

    ```typescript
    import { createOptionalChannelSetupSurface } from "openclaw/plugin-sdk/channel-setup";

    const setupSurface = createOptionalChannelSetupSurface({
      channel: "my-channel",
      label: "My Channel",
      npmSpec: "@myorg/openclaw-my-channel",
      docsPath: "/channels/my-channel",
    });
    // Returns { setupAdapter, setupWizard }
    ```

    `plugin-sdk/channel-setup` 还公开了低级 `createOptionalChannelSetupAdapter(...)` 和 `createOptionalChannelSetupWizard(...)` 构建器，当你只需要该可选安装界面的一半时使用。

    生成的可选适配器/向导在真实配置写入时失败关闭。它们在 `validateInput`、`applyAccountConfig` 和 `finalize` 中重用一个需要安装的消息，并在设置了 `docsPath` 时附加文档链接。

  </Accordion>
  <Accordion title="二进制支持的设置助手">
    对于二进制支持的设置 UI，优先使用共享委托助手而不是将相同的二进制/状态粘合代码复制到每个频道：

    - `createDetectedBinaryStatus(...)` 用于仅在标签、提示、分数和二进制检测上有所不同的状态块
    - `createCliPathTextInput(...)` 用于路径支持的文本输入
    - `createDelegatedSetupWizardStatusResolvers(...)`、`createDelegatedPrepare(...)`、`createDelegatedFinalize(...)` 和 `createDelegatedResolveConfigured(...)` 当 `setupEntry` 需要懒惰地转发到更重的完整向导时
    - `createDelegatedTextInputShouldPrompt(...)` 当 `setupEntry` 只需要委托 `textInputs[*].shouldPrompt` 决策时

  </Accordion>
</AccordionGroup>

## 发布和安装

**外部插件：**发布到 [ClawHub](/tools/clawhub)，然后安装：

<Tabs>
  <Tab title="npm">
    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    裸包规范在启动切换期间从 npm 安装。

  </Tab>
  <Tab title="仅 ClawHub">
    ```bash
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```
  </Tab>
  <Tab title="npm 包规范">
    当包尚未迁移到 ClawHub 时，或者在迁移期间需要直接 npm 安装路径时，使用 npm：

    ```bash
    openclaw plugins install npm:@myorg/openclaw-my-plugin
    ```

  </Tab>
</Tabs>

**仓库内插件：**放置在捆绑插件工作区树下，它们在构建期间会自动被发现。

**用户可以安装：**

```bash
openclaw plugins install <package-name>
```

<Info>
对于 npm 来源的安装，`openclaw plugins install` 在 `~/.openclaw/npm` 下安装包，并禁用生命周期脚本。保持插件依赖树为纯 JS/TS，避免需要 `postinstall` 构建的包。
</Info>

<Note>
网关启动不安装插件依赖项。npm/git/ClawHub 安装流程拥有依赖收敛；本地插件必须已经安装好依赖项。
</Note>

捆绑包元数据是显式的，不是在网关启动时从构建的 JavaScript 推断的。运行时依赖项属于拥有它们的插件包；已打包的 OpenClaw 启动从不修复或镜像插件依赖项。

## 相关文档

- [构建插件](/plugins/building-plugins) — 分步入门指南
- [插件清单](/plugins/manifest) — 完整清单 schema 参考
- [SDK 入口点](/plugins/sdk-entrypoints) — `definePluginEntry` 和 `defineChannelPluginEntry`
