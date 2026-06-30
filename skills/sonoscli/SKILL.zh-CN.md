---
name: sonoscli
description: 控制 Sonos 音响（发现/状态/播放/音量/分组）。
homepage: https://sonoscli.sh
metadata:
  {
    "openclaw":
      {
        "emoji": "🔊",
        "requires": { "bins": ["sonos"] },
        "install":
          [
            {
              "id": "go",
              "kind": "go",
              "module": "github.com/steipete/sonoscli/cmd/sonos@latest",
              "bins": ["sonos"],
              "label": "Install sonoscli (go)",
            },
          ],
      },
  }
---

# Sonos CLI

使用 `sonos` 控制本地网络中的 Sonos 音响。

## 快速入门

- `sonos discover`
- `sonos status --name "Kitchen"`
- `sonos play|pause|stop --name "Kitchen"`
- `sonos volume set 15 --name "Kitchen"`

## 常用任务

- 分组：`sonos group status|join|unjoin|party|solo`
- 收藏夹：`sonos favorites list|open`
- 队列：`sonos queue list|play|clear`
- Spotify 搜索（通过 SMAPI）：`sonos smapi search --service "Spotify" --category tracks "query"`

## 说明

- 如果 SSDP 失败，请指定 `--ip <speaker-ip>`。
- Spotify Web API 搜索为可选功能，需要 `SPOTIFY_CLIENT_ID/SECRET`。
- 如果出现错误，请检查故障排除部分，若有合适的匹配则提供建议。

## 故障排除

### `sonos discover` - `no route to host`

- 出现错误 `Error: write udp4 0.0.0.0:64326->239.255.255.250:1900: sendto: no route to host (Command exited with code 1)` 时
  - 注意 `0.0.0.0:` 后面的端口号是临时的，会发生变化，子网掩码也可能不完全匹配
  - `sendto: no route to host` 错误信息应保持一致
- 告知用户，在 Mac OS 上以 `direct` 模式（无 Docker 沙盒）运行时，需要在"设置 -> 隐私与安全 -> 本地网络"中为 Gateway 的顶层宿主进程启用权限
  - 通过 `launchd` 运行时为 `node`
  - 在终端直接运行 gateway 时为 `Terminal`
  - 在 VS Code 的终端中运行时为 `Visual Studio Code`
- 另一个选项是使用允许该沙盒访问网络的 `sandbox`（docker 容器）

### `sonos discover` - `bind: operation not permitted`

- 出现错误 `Error: listen udp4 0.0.0.0:0: bind: operation not permitted` 时
- 告知用户，他们可能在不允许网络访问的 Codex 或其他沙盒中运行（可以通过在启用沙盒且不批准升级请求的 Codex CLI 会话中运行 `sonos discover` 来复现此问题）
