---
summary: "通过 WKWebView + 自定义 URL 方案嵌入的智能体控制画布面板"
read_when:
  - 实现 macOS 画布面板
  - 为可视化工作区添加智能体控件
  - 调试 WKWebView 画布加载
title: "画布"
---

macOS 应用使用 `WKWebView` 嵌入智能体控制的**画布面板**。它
是 HTML/CSS/JS、A2UI 和小型交互式 UI 界面的轻量级可视化工作区。

## 画布的位置

画布状态存储在应用支持目录下：

- `~/Library/Application Support/OpenClaw/canvas/<session>/...`

画布面板通过**自定义 URL 方案**提供这些文件：

- `openclaw-canvas://<session>/<path>`

示例：

- `openclaw-canvas://main/` → `<canvasRoot>/main/index.html`
- `openclaw-canvas://main/assets/app.css` → `<canvasRoot>/main/assets/app.css`
- `openclaw-canvas://main/widgets/todo/` → `<canvasRoot>/main/widgets/todo/index.html`

如果根目录不存在 `index.html`，应用显示**内置脚手架页面**。

## 面板行为

- 无边框、可调整大小的面板，锚定在菜单栏附近（或鼠标光标处）。
- 记住每个会话的大小/位置。
- 当本地画布文件更改时自动重新加载。
- 一次只有一个画布面板可见（根据需要切换会话）。

可以从设置 → **允许画布**禁用画布。禁用后，画布
节点命令返回 `CANVAS_DISABLED`。

## 智能体 API 接口

画布通过 **Gateway WebSocket** 暴露，因此智能体可以：

- 显示/隐藏面板
- 导航到路径或 URL
- 执行 JavaScript
- 捕获快照图像

CLI 示例：

```bash
openclaw nodes canvas present --node <id>
openclaw nodes canvas navigate --node <id> --url "/"
openclaw nodes canvas eval --node <id> --js "document.title"
openclaw nodes canvas snapshot --node <id>
```

注意：

- `canvas.navigate` 接受**本地画布路径**、`http(s)` URL 和 `file://` URL。
- 如果传入 `"/"`，画布显示本地脚手架或 `index.html`。

## 画布中的 A2UI

A2UI 由 Gateway 画布主机托管并在画布面板内渲染。
当 Gateway 通告画布主机时，macOS 应用首次打开时自动
导航到 A2UI 主机页面。

默认 A2UI 主机 URL：

```
http://<gateway-host>:18789/__openclaw__/a2ui/
```

### A2UI 命令（v0.8）

画布目前接受 **A2UI v0.8** 服务器→客户端消息：

- `beginRendering`
- `surfaceUpdate`
- `dataModelUpdate`
- `deleteSurface`

不支持 `createSurface`（v0.9）。

CLI 示例：

```bash
cat > /tmp/a2ui-v0.8.jsonl <<'EOFA2'
{"surfaceUpdate":{"surfaceId":"main","components":[{"id":"root","component":{"Column":{"children":{"explicitList":["title","content"]}}}},{"id":"title","component":{"Text":{"text":{"literalString":"Canvas (A2UI v0.8)"},"usageHint":"h1"}}},{"id":"content","component":{"Text":{"text":{"literalString":"If you can read this, A2UI push works."},"usageHint":"body"}}}]}}
{"beginRendering":{"surfaceId":"main","root":"root"}}
EOFA2

openclaw nodes canvas a2ui push --jsonl /tmp/a2ui-v0.8.jsonl --node <id>
```

快速烟雾测试：

```bash
openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"
```

## 从画布触发智能体运行

画布可以通过深度链接触发新的智能体运行：

- `openclaw://agent?...`

示例（在 JS 中）：

```js
window.location.href = "openclaw://agent?message=Review%20this%20design";
```

除非提供了有效的密钥，否则应用会提示确认。

## 安全说明

- 画布方案阻止目录遍历；文件必须位于会话根目录下。
- 本地画布内容使用自定义方案（不需要环回服务器）。
- 仅当显式导航时才允许外部 `http(s)` URL。

## 相关

- [macOS 应用](/platforms/macos)
- [WebChat](/web/webchat)
