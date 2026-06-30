---
summary: "摄像头拍摄（iOS/Android 节点 + macOS 应用）供智能体使用：照片（jpg）和短视频剪辑（mp4）"
read_when:
  - 在 iOS/Android 节点或 macOS 上添加或修改摄像头拍摄功能
  - 扩展智能体可访问的 MEDIA 临时文件工作流
title: "摄像头拍摄"
---

OpenClaw 支持用于智能体工作流的**摄像头拍摄**功能：

- **iOS 节点**（通过 Gateway 配对）：通过 `node.invoke` 拍摄**照片**（`jpg`）或**短视频剪辑**（`mp4`，可选音频）。
- **Android 节点**（通过 Gateway 配对）：通过 `node.invoke` 拍摄**照片**（`jpg`）或**短视频剪辑**（`mp4`，可选音频）。
- **macOS 应用**（通过 Gateway 的节点）：通过 `node.invoke` 拍摄**照片**（`jpg`）或**短视频剪辑**（`mp4`，可选音频）。

所有摄像头访问都受**用户控制设置**的限制。

## iOS 节点

### 用户设置（默认开启）

- iOS 设置标签页 → **摄像头** → **允许摄像头**（`camera.enabled`）
  - 默认：**开启**（缺失键视为已启用）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### 命令（通过 Gateway `node.invoke`）

- `camera.list`
  - 响应载荷：
    - `devices`：`{ id, name, position, deviceType }` 数组

- `camera.snap`
  - 参数：
    - `facing`：`front|back`（默认：`front`）
    - `maxWidth`：数字（可选；iOS 节点默认 `1600`）
    - `quality`：`0..1`（可选；默认 `0.9`）
    - `format`：目前为 `jpg`
    - `delayMs`：数字（可选；默认 `0`）
    - `deviceId`：字符串（可选；来自 `camera.list`）
  - 响应载荷：
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`、`height`
  - 载荷保护：照片会被重新压缩以将 base64 载荷保持在 5MB 以下。

- `camera.clip`
  - 参数：
    - `facing`：`front|back`（默认：`front`）
    - `durationMs`：数字（默认 `3000`，最大限制为 `60000`）
    - `includeAudio`：布尔值（默认 `true`）
    - `format`：目前为 `mp4`
    - `deviceId`：字符串（可选；来自 `camera.list`）
  - 响应载荷：
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### 前台要求

与 `canvas.*` 一样，iOS 节点只允许在**前台**使用 `camera.*` 命令。后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`。

### CLI 辅助工具（临时文件 + MEDIA）

获取附件最简单的方法是通过 CLI 辅助工具，它会将解码后的媒体写入临时文件并打印 `MEDIA:<path>`。

示例：

```bash
openclaw nodes camera snap --node <id>               # 默认：前后置各一张（2 行 MEDIA）
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

注意：

- `nodes camera snap` 默认拍摄**两个**方向以便智能体获取两个视角。
- 输出文件是临时的（在操作系统临时目录中），除非你构建自己的包装器。

## Android 节点

### Android 用户设置（默认开启）

- Android 设置面板 → **摄像头** → **允许摄像头**（`camera.enabled`）
  - 默认：**开启**（缺失键视为已启用）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### 权限

- Android 需要运行时权限：
  - `CAMERA`：用于 `camera.snap` 和 `camera.clip`。
  - `RECORD_AUDIO`：用于 `includeAudio=true` 时的 `camera.clip`。

如果缺少权限，应用会在可能时提示；如果被拒绝，`camera.*` 请求将以
`*_PERMISSION_REQUIRED` 错误失败。

### Android 前台要求

与 `canvas.*` 一样，Android 节点只允许在**前台**使用 `camera.*` 命令。后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`。

### Android 命令（通过 Gateway `node.invoke`）

- `camera.list`
  - 响应载荷：
    - `devices`：`{ id, name, position, deviceType }` 数组

### 载荷保护

照片会被重新压缩以将 base64 载荷保持在 5MB 以下。

## macOS 应用

### 用户设置（默认关闭）

macOS 伴侣应用提供一个复选框：

- **设置 → 通用 → 允许摄像头**（`openclaw.cameraEnabled`）
  - 默认：**关闭**
  - 关闭时：摄像头请求返回"用户已禁用摄像头"。

### CLI 辅助工具（节点调用）

使用主 `openclaw` CLI 在 macOS 节点上调用摄像头命令。

示例：

```bash
openclaw nodes camera list --node <id>            # 列出摄像头 ID
openclaw nodes camera snap --node <id>            # 打印 MEDIA:<path>
openclaw nodes camera snap --node <id> --max-width 1280
openclaw nodes camera snap --node <id> --delay-ms 2000
openclaw nodes camera snap --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --duration 10s          # 打印 MEDIA:<path>
openclaw nodes camera clip --node <id> --duration-ms 3000      # 打印 MEDIA:<path>（旧版标志）
openclaw nodes camera clip --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --no-audio
```

注意：

- `openclaw nodes camera snap` 默认 `maxWidth=1600`，除非被覆盖。
- 在 macOS 上，`camera.snap` 在捕捉前等待 `delayMs`（默认 2000ms）以完成预热/曝光稳定。
- 照片载荷会被重新压缩以将 base64 保持在 5MB 以下。

## 安全 + 实际限制

- 摄像头和麦克风访问会触发通常的操作系统权限提示（并需要 Info.plist 中的使用说明字符串）。
- 视频剪辑被限制（目前 `<= 60s`）以避免节点载荷过大（base64 开销 + 消息限制）。

## macOS 屏幕视频（操作系统级别）

对于*屏幕*视频（不是摄像头），使用 macOS 伴侣应用：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # 打印 MEDIA:<path>
```

注意：

- 需要 macOS **屏幕录制**权限（TCC）。

## 相关

- [图像和媒体支持](/nodes/images)
- [媒体理解](/nodes/media-understanding)
- [位置命令](/nodes/location-command)
