---
name: diffs
description: 使用 diffs 工具生成真实的可共享差异（查看器 URL、文件工件或两者），而不是手动编辑摘要。
---

当需要将编辑显示为真实差异时，优先使用 `diffs` 工具，而不是编写手动摘要。

`diffs` 工具接受 `before` + `after` 文本，或统一的 `patch` 字符串。

当你想要交互式网关托管查看器时使用 `mode=view`。工具返回后，通过 `canvas present` 或 `canvas navigate` 将 `details.viewerUrl` 与画布工具一起使用。
如果部署使用回环可信代理（例如使用带有 `gateway.trustedProxies` 包含 `127.0.0.1` 的 Tailscale Serve），没有转发客户端 IP 头的原始回环查看器请求可能会关闭失败。在这种拓扑中，优先使用 `mode=file` / `mode=both`，或者在需要可共享查看器 URL 时使用配置的 `viewerBaseUrl` / 明确的代理/公共 `baseUrl`。

当需要渲染文件工件时使用 `mode=file`。设置 `fileFormat=png`（默认）或 `fileFormat=pdf`。工具结果包括 `details.filePath`。

对于大型或高保真文件，使用 `fileQuality`（`standard`|`hq`|`print`）并可选地覆盖 `fileScale`/`fileMaxWidth`。

当需要将渲染文件传递给用户或频道时，不要依赖原始工具结果渲染器。而是调用 `message` 工具，并通过 `path` 或 `filePath` 传递 `details.filePath`。

当想要网关查看器 URL 和渲染工件时使用 `mode=both`。

如果用户已配置 diffs 插件默认值，优先省略 `mode`、`theme`、`layout` 和相关呈现选项，除非需要为此特定差异覆盖它们。

当你知道文件名时，在 before/after 文本中包含 `path`。
