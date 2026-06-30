# Canvas 技能

在已连接的 OpenClaw 节点（Mac 应用、iOS、Android）上显示 HTML 内容。

## 概述

canvas 工具可让你在任意已连接节点的画布视图上呈现 Web 内容。适用于：

- 显示游戏、可视化图表、仪表盘
- 展示生成的 HTML 内容
- 交互式演示

## 工作原理

### 架构

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Canvas Host    │────▶│   Node Bridge    │────▶│  Node App   │
│  (HTTP Server)  │     │  (TCP Server)    │     │ (Mac/iOS/   │
│  Port 18793     │     │  Port 18790      │     │  Android)   │
└─────────────────┘     └──────────────────┘     └─────────────┘
```

1. **Canvas Host 服务器**：从 `canvasHost.root` 目录提供静态 HTML/CSS/JS 文件
2. **Node Bridge**：将画布 URL 传递给已连接的节点
3. **Node 应用**：在 WebView 中渲染内容

### Tailscale 集成

canvas host 服务器根据 `gateway.bind` 设置绑定：

| 绑定模式   | 服务器绑定地址 | Canvas URL 使用地址        |
| ---------- | -------------- | -------------------------- |
| `loopback` | 127.0.0.1      | localhost（仅本地）        |
| `lan`      | LAN 接口       | LAN IP 地址                |
| `tailnet`  | Tailscale 接口 | Tailscale 主机名           |
| `auto`     | 最佳可用接口   | Tailscale > LAN > loopback |

**关键点：** `canvasHostHostForBridge` 派生自 `bridgeHost`。绑定到 Tailscale 时，节点收到的 URL 形如：

```
http://<tailscale-hostname>:18793/__openclaw__/canvas/<file>.html
```

这就是为什么 localhost URL 无法使用——节点从 bridge 接收的是 Tailscale 主机名！

## 动作

| 动作       | 描述                     |
| ---------- | ------------------------ |
| `present`  | 显示画布（可选目标 URL） |
| `hide`     | 隐藏画布                 |
| `navigate` | 导航到新 URL             |
| `eval`     | 在画布中执行 JavaScript  |
| `snapshot` | 截取画布截图             |

## 配置

在活跃的 OpenClaw 配置文件（`$OPENCLAW_CONFIG_PATH`，默认 `~/.openclaw/openclaw.json`）中：

```json
{
  "canvasHost": {
    "enabled": true,
    "port": 18793,
    "root": "/Users/you/clawd/canvas",
    "liveReload": true
  },
  "gateway": {
    "bind": "auto"
  }
}
```

### 实时重载

当 `liveReload: true`（默认值）时，canvas host 会：

- 监视根目录的变更（通过 chokidar）
- 向 HTML 文件注入 WebSocket 客户端
- 文件变更时自动重载已连接的画布

非常适合开发使用！

## 工作流

### 1. 创建 HTML 内容

将文件放入画布根目录（默认 `~/clawd/canvas/`）：

```bash
cat > ~/clawd/canvas/my-game.html << 'HTML'
<!DOCTYPE html>
<html>
<head><title>My Game</title></head>
<body>
  <h1>Hello Canvas!</h1>
</body>
</html>
HTML
```

### 2. 查找 canvas host URL

检查 gateway 的绑定方式：

```bash
CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/openclaw.json}"
cat "$CONFIG_PATH" | jq '.gateway.bind'
```

然后构建 URL：

- **loopback**：`http://127.0.0.1:18793/__openclaw__/canvas/<file>.html`
- **lan/tailnet/auto**：`http://<hostname>:18793/__openclaw__/canvas/<file>.html`

查找 Tailscale 主机名：

```bash
tailscale status --json | jq -r '.Self.DNSName' | sed 's/\.$//'
```

### 3. 查找已连接的节点

```bash
openclaw nodes list
```

查找具有画布功能的 Mac/iOS/Android 节点。

### 4. 呈现内容

```
canvas action:present node:<node-id> target:<full-url>
```

**示例：**

```
canvas action:present node:mac-63599bc4-b54d-4392-9048-b97abd58343a target:http://peters-mac-studio-1.sheep-coho.ts.net:18793/__openclaw__/canvas/snake.html
```

### 5. 导航、截图或隐藏

```
canvas action:navigate node:<node-id> url:<new-url>
canvas action:snapshot node:<node-id>
canvas action:hide node:<node-id>
```

## 调试

### 白屏/内容无法加载

**原因：** 服务器绑定与节点期望的 URL 不匹配。

**调试步骤：**

1. 检查服务器绑定：`CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/openclaw.json}"; cat "$CONFIG_PATH" | jq '.gateway.bind'`
2. 检查 canvas 端口：`lsof -i :18793`
3. 直接测试 URL：`curl http://<hostname>:18793/__openclaw__/canvas/<file>.html`

**解决方案：** 使用与绑定模式匹配的完整主机名，而非 localhost。

### "node required" 错误

始终指定 `node:<node-id>` 参数。

### "node not connected" 错误

节点已离线。使用 `openclaw nodes list` 查找在线节点。

### 内容未更新

如果实时重载不起作用：

1. 检查配置中是否有 `liveReload: true`
2. 确保文件在画布根目录中
3. 检查日志中是否有监视器错误

## URL 路径结构

canvas host 从 `/__openclaw__/canvas/` 前缀提供服务：

```
http://<host>:18793/__openclaw__/canvas/index.html  → ~/clawd/canvas/index.html
http://<host>:18793/__openclaw__/canvas/games/snake.html → ~/clawd/canvas/games/snake.html
```

`/__openclaw__/canvas/` 前缀由 `CANVAS_HOST_PATH` 常量定义。

## 技巧

- 保持 HTML 自包含（内联 CSS/JS）效果最佳
- 使用默认 index.html 作为测试页面（包含 bridge 诊断）
- 画布会持续显示，直到你 `hide` 或导航离开
- 实时重载加快开发速度——只需保存，即可自动更新！
- A2UI JSON 推送功能正在开发中——目前请使用 HTML 文件
