---
summary: "代理的只读差异查看器和文件渲染器（可选插件工具）"
title: "差异"
sidebarTitle: "差异"
read_when:
  - 您希望代理将代码或 Markdown 编辑显示为差异
  - 您需要画布就绪的查看器 URL 或渲染的差异文件
  - 您需要具有安全默认值的受控、临时差异工件
---

`diffs` 是一个可选的插件工具，具有内置的简短系统指导和配套技能，可将更改内容转换为代理的只读差异工件。

它接受：

- `before` 和 `after` 文本
- 统一的 `patch`

它可以返回：

- 用于画布演示的 Gateway 查看器 URL
- 用于消息传递的渲染文件路径（PNG 或 PDF）
- 单次调用中的两种输出

启用后，插件将简洁的使用指导前置到系统提示空间中，并在代理需要更完整说明的情况下暴露详细技能。

## 快速开始

<Steps>
  <Step title="安装插件">
    ```bash
    openclaw plugins install diffs
    ```
  </Step>
  <Step title="启用插件">
    ```json5
    {
      plugins: {
        entries: {
          diffs: {
            enabled: true,
          },
        },
      },
    }
    ```
  </Step>
  <Step title="选择模式">
    <Tabs>
      <Tab title="view">
        画布优先流程：代理使用 `mode: "view"` 调用 `diffs`，并使用 `canvas present` 打开 `details.viewerUrl`。
      </Tab>
      <Tab title="file">
        聊天文件传递：代理使用 `mode: "file"` 调用 `diffs`，并使用 `path` 或 `filePath` 通过 `message` 发送 `details.filePath`。
      </Tab>
      <Tab title="both">
        组合模式：代理使用 `mode: "both"` 调用 `diffs`，在单次调用中获得两种工件。
      </Tab>
    </Tabs>
  </Step>
</Steps>

## 禁用内置系统指导

如果您想保持 `diffs` 工具启用但禁用其内置的系统提示指导，请将 `plugins.entries.diffs.hooks.allowPromptInjection` 设置为 `false`：

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        hooks: {
          allowPromptInjection: false,
        },
      },
    },
  },
}
```

这会阻止 diffs 插件的 `before_prompt_build` 钩子，同时保持插件、工具和配套技能可用。

如果您想同时禁用指导和工具，请改为禁用插件。

## 典型代理工作流

<Steps>
  <Step title="调用 diffs">
    代理使用输入调用 `diffs` 工具。
  </Step>
  <Step title="读取详情">
    代理从响应中读取 `details` 字段。
  </Step>
  <Step title="呈现">
    代理使用 `canvas present` 打开 `details.viewerUrl`，使用 `path` 或 `filePath` 通过 `message` 发送 `details.filePath`，或两者都做。
  </Step>
</Steps>

## 输入示例

<Tabs>
  <Tab title="前后对比">
    ```json
    {
      "before": "# Hello\n\nOne",
      "after": "# Hello\n\nTwo",
      "path": "docs/example.md",
      "mode": "view"
    }
    ```
  </Tab>
  <Tab title="补丁">
    ```json
    {
      "patch": "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1 +1 @@\n-const x = 1;\n+const x = 2;\n",
      "mode": "both"
    }
    ```
  </Tab>
</Tabs>

## 工具输入参考

除非注明，否则所有字段都是可选的。

<ParamField path="before" type="string">
  原始文本。省略 `patch` 时与 `after` 一起必填。
</ParamField>
<ParamField path="after" type="string">
  更新后的文本。省略 `patch` 时与 `before` 一起必填。
</ParamField>
<ParamField path="patch" type="string">
  统一差异文本。与 `before` 和 `after` 互斥。
</ParamField>
<ParamField path="path" type="string">
  前后对比模式的显示文件名。
</ParamField>
<ParamField path="lang" type="string">
  前后对比模式的语言覆盖提示。未知值回退到纯文本。
</ParamField>
<ParamField path="title" type="string">
  查看器标题覆盖。
</ParamField>
<ParamField path="mode" type='"view" | "file" | "both"'>
  输出模式。默认为插件默认值 `defaults.mode`。已弃用别名：`"image"` 的行为与 `"file"` 相同，仍然被接受以保持向后兼容性。
</ParamField>
<ParamField path="theme" type='"light" | "dark"'>
  查看器主题。默认为插件默认值 `defaults.theme`。
</ParamField>
<ParamField path="layout" type='"unified" | "split"'>
  差异布局。默认为插件默认值 `defaults.layout`。
</ParamField>
<ParamField path="expandUnchanged" type="boolean">
  当完整上下文可用时展开未更改的部分。仅限每次调用选项（不是插件默认键）。
</ParamField>
<ParamField path="fileFormat" type='"png" | "pdf"'>
  渲染文件格式。默认为插件默认值 `defaults.fileFormat`。
</ParamField>
<ParamField path="fileQuality" type='"standard" | "hq" | "print"'>
  PNG 或 PDF 渲染的质量预设。
</ParamField>
<ParamField path="fileScale" type="number">
  设备比例覆盖（`1`-`4`）。
</ParamField>
<ParamField path="fileMaxWidth" type="number">
  CSS 像素中的最大渲染宽度（`640`-`2400`）。
</ParamField>
<ParamField path="ttlSeconds" type="number" default="1800">
  查看器和独立文件输出的工件 TTL（秒）。最大 21600。
</ParamField>
<ParamField path="baseUrl" type="string">
  查看器 URL 来源覆盖。覆盖插件 `viewerBaseUrl`。必须是 `http` 或 `https`，不含查询/hash。
</ParamField>

<AccordionGroup>
  <Accordion title="旧版输入别名">
    仍然接受以保持向后兼容性：

    - `format` -> `fileFormat`
    - `imageFormat` -> `fileFormat`
    - `imageQuality` -> `fileQuality`
    - `imageScale` -> `fileScale`
    - `imageMaxWidth` -> `fileMaxWidth`

  </Accordion>
  <Accordion title="验证和限制">
    - `before` 和 `after` 各最大 512 KiB。
    - `patch` 最大 2 MiB。
    - `path` 最大 2048 字节。
    - `lang` 最大 128 字节。
    - `title` 最大 1024 字节。
    - 补丁复杂度上限：最多 128 个文件和 120000 总行数。
    - `patch` 和 `before` 或 `after` 一起使用会被拒绝。
    - 渲染文件安全限制（适用于 PNG 和 PDF）：
      - `fileQuality: "standard"`：最大 8 MP（8,000,000 渲染像素）。
      - `fileQuality: "hq"`：最大 14 MP（14,000,000 渲染像素）。
      - `fileQuality: "print"`：最大 24 MP（24,000,000 渲染像素）。
      - PDF 另有最多 50 页的限制。

  </Accordion>
</AccordionGroup>

## 输出详情合同

工具在 `details` 下返回结构化元数据。

<AccordionGroup>
  <Accordion title="查看器字段">
    创建查看器的模式的共享字段：

    - `artifactId`
    - `viewerUrl`
    - `viewerPath`
    - `title`
    - `expiresAt`
    - `inputKind`
    - `fileCount`
    - `mode`
    - `context`（可用时为 `agentId`、`sessionId`、`messageChannel`、`agentAccountId`）

  </Accordion>
  <Accordion title="文件字段">
    渲染 PNG 或 PDF 时的文件字段：

    - `artifactId`
    - `expiresAt`
    - `filePath`
    - `path`（与 `filePath` 相同，用于消息工具兼容性）
    - `fileBytes`
    - `fileFormat`
    - `fileQuality`
    - `fileScale`
    - `fileMaxWidth`

  </Accordion>
  <Accordion title="兼容性别名">
    也为现有调用者返回：

    - `format`（与 `fileFormat` 相同）
    - `imagePath`（与 `filePath` 相同）
    - `imageBytes`（与 `fileBytes` 相同）
    - `imageQuality`（与 `fileQuality` 相同）
    - `imageScale`（与 `fileScale` 相同）
    - `imageMaxWidth`（与 `fileMaxWidth` 相同）

  </Accordion>
</AccordionGroup>

模式行为摘要：

| 模式     | 返回内容                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------- |
| `"view"` | 仅查看器字段。                                                                                  |
| `"file"` | 仅文件字段，无查看器工件。                                                                      |
| `"both"` | 查看器字段加文件字段。如果文件渲染失败，查看器仍会返回，带有 `fileError` 和 `imageError` 别名。 |

## 折叠的未更改部分

- 查看器可以显示像 `N unmodified lines` 这样的行。
- 这些行上的展开控件是有条件的，不保证对每种输入类型都可用。
- 展开控件在渲染的差异具有可展开的上下文数据时出现，这对于前后对比输入是典型的。
- 对于许多统一补丁输入，省略的上下文主体在已解析的补丁块中不可用，因此行可能出现而没有展开控件。这是预期行为。
- `expandUnchanged` 仅在存在可展开上下文时适用。

## 插件默认值

在 `~/.openclaw/openclaw.json` 中设置全局插件默认值：

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          defaults: {
            fontFamily: "Fira Code",
            fontSize: 15,
            lineSpacing: 1.6,
            layout: "unified",
            showLineNumbers: true,
            diffIndicators: "bars",
            wordWrap: true,
            background: true,
            theme: "dark",
            fileFormat: "png",
            fileQuality: "standard",
            fileScale: 2,
            fileMaxWidth: 960,
            mode: "both",
          },
        },
      },
    },
  },
}
```

支持的默认值：

- `fontFamily`
- `fontSize`
- `lineSpacing`
- `layout`
- `showLineNumbers`
- `diffIndicators`
- `wordWrap`
- `background`
- `theme`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`
- `mode`

显式工具参数覆盖这些默认值。

### 持久化查看器 URL 配置

<ParamField path="viewerBaseUrl" type="string">
  当工具调用不传递 `baseUrl` 时，插件拥有的返回查看器链接的回退。必须是 `http` 或 `https`，不含查询/hash。
</ParamField>

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          viewerBaseUrl: "https://gateway.example.com/openclaw",
        },
      },
    },
  },
}
```

## 安全配置

<ParamField path="security.allowRemoteViewer" type="boolean" default="false">
  `false`：拒绝对查看器路由的非回环请求。`true`：如果令牌化路径有效，则允许远程查看器。
</ParamField>

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          security: {
            allowRemoteViewer: false,
          },
        },
      },
    },
  },
}
```

## 工件生命周期和存储

- 工件存储在临时子文件夹下：`$TMPDIR/openclaw-diffs`。
- 查看器工件元数据包含：
  - 随机工件 ID（20 个十六进制字符）
  - 随机令牌（48 个十六进制字符）
  - `createdAt` 和 `expiresAt`
  - 存储的 `viewer.html` 路径
- 未指定时，默认工件 TTL 为 30 分钟。
- 最大接受的查看器 TTL 为 6 小时。
- 清理在工件创建后适时运行。
- 已过期的工件被删除。
- 当元数据缺失时，回退清理会删除超过 24 小时的过期文件夹。

## 查看器 URL 和网络行为

查看器路由：

- `/plugins/diffs/view/{artifactId}/{token}`

查看器资产：

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

查看器文档相对于查看器 URL 解析这些资产，因此可选的 `baseUrl` 路径前缀也会为两个资产请求保留。

URL 构建行为：

- 如果提供了工具调用 `baseUrl`，经过严格验证后使用它。
- 否则，如果配置了插件 `viewerBaseUrl`，则使用它。
- 没有任何一种覆盖时，查看器 URL 默认为回环 `127.0.0.1`。
- 如果 Gateway 绑定模式为 `custom` 且设置了 `gateway.customBindHost`，则使用该主机。

`baseUrl` 规则：

- 必须是 `http://` 或 `https://`。
- 查询和 hash 会被拒绝。
- 允许来源加上可选基础路径。

## 安全模型

<AccordionGroup>
  <Accordion title="查看器加固">
    - 默认仅限回环。
    - 带有严格 ID 和令牌验证的令牌化查看器路径。
    - 查看器响应 CSP：
      - `default-src 'none'`
      - 脚本和资产仅来自 self
      - 无出站 `connect-src`
    - 启用远程访问时的远程未命中限流：
      - 每 60 秒 40 次失败
      - 60 秒锁定（`429 Too Many Requests`）

  </Accordion>
  <Accordion title="文件渲染加固">
    - 截图浏览器请求路由默认拒绝。
    - 仅允许来自 `http://127.0.0.1/plugins/diffs/assets/*` 的本地查看器资产。
    - 外部网络请求被阻止。

  </Accordion>
</AccordionGroup>

## 文件模式的浏览器要求

`mode: "file"` 和 `mode: "both"` 需要兼容 Chromium 的浏览器。

解析顺序：

<Steps>
  <Step title="配置">
    OpenClaw 配置中的 `browser.executablePath`。
  </Step>
  <Step title="环境变量">
    - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
    - `BROWSER_EXECUTABLE_PATH`
    - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`

  </Step>
  <Step title="平台回退">
    平台命令/路径发现回退。
  </Step>
</Steps>

常见失败文本：

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

通过安装 Chrome、Chromium、Edge 或 Brave，或设置上述可执行路径选项之一来修复。

## 故障排除

<AccordionGroup>
  <Accordion title="输入验证错误">
    - `Provide patch or both before and after text.` — 同时包含 `before` 和 `after`，或提供 `patch`。
    - `Provide either patch or before/after input, not both.` — 不要混合输入模式。
    - `Invalid baseUrl: ...` — 使用 `http(s)` 来源加上可选路径，不含查询/hash。
    - `{field} exceeds maximum size (...)` — 减少负载大小。
    - 大型补丁拒绝 — 减少补丁文件计数或总行数。

  </Accordion>
  <Accordion title="查看器可访问性">
    - 查看器 URL 默认解析到 `127.0.0.1`。
    - 对于远程访问场景，请：
      - 设置插件 `viewerBaseUrl`，或
      - 每次工具调用传递 `baseUrl`，或
      - 使用 `gateway.bind=custom` 和 `gateway.customBindHost`
    - 如果 `gateway.trustedProxies` 包含用于同主机代理（例如 Tailscale Serve）的回环，没有转发客户端 IP 标头的原始回环查看器请求会按设计失败关闭。
    - 对于该代理拓扑：
      - 仅需要附件时优先使用 `mode: "file"` 或 `mode: "both"`，或
      - 当您需要可共享的查看器 URL 时，有意启用 `security.allowRemoteViewer` 并设置插件 `viewerBaseUrl` 或传递代理/公开 `baseUrl`
    - 仅在打算外部查看器访问时才启用 `security.allowRemoteViewer`。

  </Accordion>
  <Accordion title="未修改行没有展开按钮">
    当补丁不带可展开上下文时，补丁输入可能发生这种情况。这是预期行为，不表示查看器失败。
  </Accordion>
  <Accordion title="未找到工件">
    - 工件因 TTL 过期。
    - 令牌或路径已更改。
    - 清理删除了过期数据。

  </Accordion>
</AccordionGroup>

## 操作指导

- 优先使用 `mode: "view"` 在画布中进行本地交互审查。
- 优先使用 `mode: "file"` 用于需要附件的出站聊天频道。
- 保持 `allowRemoteViewer` 禁用，除非您的部署需要远程查看器 URL。
- 对敏感差异设置明确的短 `ttlSeconds`。
- 不必要时避免在差异输入中发送机密。
- 如果您的频道积极压缩图像（例如 Telegram 或 WhatsApp），请优先使用 PDF 输出（`fileFormat: "pdf"`）。

<Note>
差异渲染引擎由 [Diffs](https://diffs.com) 提供支持。
</Note>

## 相关

- [浏览器](/tools/browser)
- [插件](/tools/plugin)
- [工具概览](/tools)
