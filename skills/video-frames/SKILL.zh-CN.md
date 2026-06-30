---
name: video-frames
description: 使用 ffmpeg 从视频中提取帧或短片段。
homepage: https://ffmpeg.org
metadata:
  {
    "openclaw":
      {
        "emoji": "🎬",
        "requires": { "bins": ["ffmpeg"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "ffmpeg",
              "bins": ["ffmpeg"],
              "label": "Install ffmpeg (brew)",
            },
          ],
      },
  }
---

# 视频帧（ffmpeg）

从视频中提取单帧，或创建快速缩略图以供查看。

## 快速入门

提取第一帧：

```bash
{baseDir}/scripts/frame.sh /path/to/video.mp4 --out /tmp/frame.jpg
```

指定时间点：

```bash
{baseDir}/scripts/frame.sh /path/to/video.mp4 --time 00:00:10 --out /tmp/frame-10s.jpg
```

## 说明

- 使用 `--time` 查看"这里发生了什么？"。
- 快速分享使用 `.jpg`；UI 截图使用 `.png` 以获得更清晰的画面。
