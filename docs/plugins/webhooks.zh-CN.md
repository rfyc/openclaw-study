---
summary: "Webhooks 插件：为可信外部自动化提供经过身份验证的 TaskFlow 入口"
read_when:
  - 你希望从外部系统触发或驱动 TaskFlow
  - 你正在配置内置 webhooks 插件
title: "Webhooks 插件"
---

# Webhooks（插件）

Webhooks 插件添加了经过身份验证的 HTTP 路由，将外部自动化绑定到 OpenClaw TaskFlow。

当你希望受信任的系统（如 Zapier、n8n、CI 作业或内部服务）在无需先编写自定义插件的情况下创建和驱动托管 TaskFlow 时，可以使用此插件。

## 运行位置

Webhooks 插件在 Gateway 进程内运行。

如果你的 Gateway 运行在另一台机器上，请在该 Gateway 主机上安装和配置插件，然后重启 Gateway。

## 配置路由

在 `plugins.entries.webhooks.config` 下设置配置：

```json5
{
  plugins: {
    entries: {
      webhooks: {
        enabled: true,
        config: {
          routes: {
            zapier: {
              path: "/plugins/webhooks/zapier",
              sessionKey: "agent:main:main",
              secret: {
                source: "env",
                provider: "default",
                id: "OPENCLAW_WEBHOOK_SECRET",
              },
              controllerId: "webhooks/zapier",
              description: "Zapier TaskFlow bridge",
            },
          },
        },
      },
    },
  },
}
```

路由字段：

- `enabled`：可选，默认为 `true`
- `path`：可选，默认为 `/plugins/webhooks/<routeId>`
- `sessionKey`：必需，拥有绑定 TaskFlow 的会话
- `secret`：必需的共享密钥或 SecretRef
- `controllerId`：可选，用于创建的托管流的控制器 id
- `description`：可选的运营商备注

支持的 `secret` 输入：

- 纯字符串
- 带 `source: "env" | "file" | "exec"` 的 SecretRef

如果密钥支持的路由在启动时无法解析其密钥，插件会跳过该路由并记录警告，而不是暴露一个损坏的端点。

## 安全模型

每个路由都被信任以其配置的 `sessionKey` 的 TaskFlow 权限进行操作。

这意味着路由可以检查和修改该会话拥有的 TaskFlow，因此你应该：

- 每个路由使用唯一的强密钥
- 优先使用密钥引用而不是内联明文密钥
- 将路由绑定到适合工作流的最窄会话
- 只暴露你需要的特定 webhook 路径

插件应用：

- 共享密钥身份验证
- 请求体大小和超时守卫
- 固定窗口速率限制
- 飞行中请求限制
- 通过 `api.runtime.tasks.managedFlows.bindSession(...)` 实现的所有者绑定 TaskFlow 访问

## 请求格式

使用以下内容发送 `POST` 请求：

- `Content-Type: application/json`
- `Authorization: Bearer <secret>` 或 `x-openclaw-webhook-secret: <secret>`

示例：

```bash
curl -X POST https://gateway.example.com/plugins/webhooks/zapier \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SHARED_SECRET' \
  -d '{"action":"create_flow","goal":"Review inbound queue"}'
```

## 支持的操作

插件当前接受这些 JSON `action` 值：

- `create_flow`
- `get_flow`
- `list_flows`
- `find_latest_flow`
- `resolve_flow`
- `get_task_summary`
- `set_waiting`
- `resume_flow`
- `finish_flow`
- `fail_flow`
- `request_cancel`
- `cancel_flow`
- `run_task`

### `create_flow`

为路由的绑定会话创建一个托管 TaskFlow。

示例：

```json
{
  "action": "create_flow",
  "goal": "Review inbound queue",
  "status": "queued",
  "notifyPolicy": "done_only"
}
```

### `run_task`

在现有托管 TaskFlow 中创建一个托管子任务。

允许的运行时为：

- `subagent`
- `acp`

示例：

```json
{
  "action": "run_task",
  "flowId": "flow_123",
  "runtime": "acp",
  "childSessionKey": "agent:main:acp:worker",
  "task": "Inspect the next message batch"
}
```

## 响应形状

成功的响应返回：

```json
{
  "ok": true,
  "routeId": "zapier",
  "result": {}
}
```

被拒绝的请求返回：

```json
{
  "ok": false,
  "routeId": "zapier",
  "code": "not_found",
  "error": "TaskFlow not found.",
  "result": {}
}
```

插件故意从 webhook 响应中清除所有者/会话元数据。

## 相关文档

- [插件运行时 SDK](/plugins/sdk-runtime)
- [钩子和 webhooks 概览](/automation/hooks)
- [CLI webhooks](/cli/webhooks)
