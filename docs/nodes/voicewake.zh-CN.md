---
summary: "全局语音唤醒词（网关拥有）及其跨节点同步方式"
read_when:
  - 更改语音唤醒词行为或默认值
  - 添加需要唤醒词同步的新节点平台
title: "语音唤醒"
---

OpenClaw 将**唤醒词视为由 **Gateway** 拥有的单一全局列表**。

- **没有每节点自定义唤醒词**。
- **任何节点/应用 UI 都可以编辑**该列表；更改由 Gateway 持久化并广播给所有人。
- macOS 和 iOS 保留本地**语音唤醒启用/禁用**切换（本地 UX + 权限不同）。
- Android 目前保持语音唤醒关闭，在语音标签页中使用手动麦克风流程。

## 存储（Gateway 主机）

唤醒词存储在网关机器上：

- `~/.openclaw/settings/voicewake.json`

格式：

```json
{ "triggers": ["openclaw", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## 协议

### 方法

- `voicewake.get` → `{ triggers: string[] }`
- `voicewake.set` 参数 `{ triggers: string[] }` → `{ triggers: string[] }`

注意：

- 触发词被规范化（去除空白，删除空项）。空列表回退到默认值。
- 为安全起见强制执行限制（数量/长度上限）。

### 路由方法（触发词 → 目标）

- `voicewake.routing.get` → `{ config: VoiceWakeRoutingConfig }`
- `voicewake.routing.set` 参数 `{ config: VoiceWakeRoutingConfig }` → `{ config: VoiceWakeRoutingConfig }`

`VoiceWakeRoutingConfig` 格式：

```json
{
  "version": 1,
  "defaultTarget": { "mode": "current" },
  "routes": [{ "trigger": "robot wake", "target": { "sessionKey": "agent:main:main" } }],
  "updatedAtMs": 1730000000000
}
```

路由目标支持以下之一：

- `{ "mode": "current" }`
- `{ "agentId": "main" }`
- `{ "sessionKey": "agent:main:main" }`

### 事件

- `voicewake.changed` 载荷 `{ triggers: string[] }`
- `voicewake.routing.changed` 载荷 `{ config: VoiceWakeRoutingConfig }`

接收者：

- 所有 WebSocket 客户端（macOS 应用、WebChat 等）
- 所有已连接的节点（iOS/Android），以及节点连接时作为初始"当前状态"推送。

## 客户端行为

### macOS 应用

- 使用全局列表对 `VoiceWakeRuntime` 触发器进行门控。
- 在语音唤醒设置中编辑"触发词"会调用 `voicewake.set`，然后依赖广播保持其他客户端同步。

### iOS 节点

- 使用全局列表进行 `VoiceWakeManager` 触发器检测。
- 在设置中编辑唤醒词会调用 `voicewake.set`（通过 Gateway WS）并保持本地唤醒词检测响应。

### Android 节点

- 语音唤醒在 Android 运行时/设置中目前已禁用。
- Android 语音在语音标签页中使用手动麦克风捕获，而不是唤醒词触发器。

## 相关

- [Talk 模式](/nodes/talk)
- [音频与语音消息](/nodes/audio)
- [媒体理解](/nodes/media-understanding)
