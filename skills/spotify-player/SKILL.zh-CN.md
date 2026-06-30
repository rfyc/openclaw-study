---
name: spotify-player
description: 通过 spogo（首选）或 spotify_player 在终端控制 Spotify 播放/搜索。
homepage: https://www.spotify.com
metadata:
  {
    "openclaw":
      {
        "emoji": "🎵",
        "requires": { "anyBins": ["spogo", "spotify_player"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "spogo",
              "tap": "steipete/tap",
              "bins": ["spogo"],
              "label": "Install spogo (brew)",
            },
            {
              "id": "brew",
              "kind": "brew",
              "formula": "spotify_player",
              "bins": ["spotify_player"],
              "label": "Install spotify_player (brew)",
            },
          ],
      },
  }
---

# spogo / spotify_player

使用 `spogo` **（首选）** 控制 Spotify 播放/搜索。如有需要可回退到 `spotify_player`。

前提条件

- Spotify Premium 账户。
- 已安装 `spogo` 或 `spotify_player`。

spogo 设置

- 导入 cookies：`spogo auth import --browser chrome`

常用 CLI 命令

- 搜索：`spogo search track "query"`
- 播放控制：`spogo play|pause|next|prev`
- 设备管理：`spogo device list`，`spogo device set "<name|id>"`
- 状态：`spogo status`

spotify_player 命令（回退方案）

- 搜索：`spotify_player search "query"`
- 播放控制：`spotify_player playback play|pause|next|previous`
- 连接设备：`spotify_player connect`
- 收藏歌曲：`spotify_player like`

说明

- 配置目录：`~/.config/spotify-player`（例如 `app.toml`）。
- 如需 Spotify Connect 集成，在配置中设置用户 `client_id`。
- 在应用中可通过 `?` 查看 TUI 快捷键。
