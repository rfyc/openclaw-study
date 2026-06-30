---
name: sherpa-onnx-tts
description: 通过 sherpa-onnx 实现本地文字转语音（离线，无需云端）
metadata:
  {
    "openclaw":
      {
        "emoji": "🔉",
        "os": ["darwin", "linux", "win32"],
        "requires": { "env": ["SHERPA_ONNX_RUNTIME_DIR", "SHERPA_ONNX_MODEL_DIR"] },
        "install":
          [
            {
              "id": "download-runtime-macos",
              "kind": "download",
              "os": ["darwin"],
              "url": "https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.23/sherpa-onnx-v1.12.23-osx-universal2-shared.tar.bz2",
              "archive": "tar.bz2",
              "extract": true,
              "stripComponents": 1,
              "targetDir": "runtime",
              "label": "Download sherpa-onnx runtime (macOS)",
            },
            {
              "id": "download-runtime-linux-x64",
              "kind": "download",
              "os": ["linux"],
              "url": "https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.23/sherpa-onnx-v1.12.23-linux-x64-shared.tar.bz2",
              "archive": "tar.bz2",
              "extract": true,
              "stripComponents": 1,
              "targetDir": "runtime",
              "label": "Download sherpa-onnx runtime (Linux x64)",
            },
            {
              "id": "download-runtime-win-x64",
              "kind": "download",
              "os": ["win32"],
              "url": "https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.23/sherpa-onnx-v1.12.23-win-x64-shared.tar.bz2",
              "archive": "tar.bz2",
              "extract": true,
              "stripComponents": 1,
              "targetDir": "runtime",
              "label": "Download sherpa-onnx runtime (Windows x64)",
            },
            {
              "id": "download-model-lessac",
              "kind": "download",
              "url": "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-lessac-high.tar.bz2",
              "archive": "tar.bz2",
              "extract": true,
              "targetDir": "models",
              "label": "Download Piper en_US lessac (high)",
            },
          ],
      },
  }
---

# sherpa-onnx-tts

使用 sherpa-onnx 离线 CLI 实现本地 TTS。

## 安装

1. 下载适用于你操作系统的运行时（解压到 `$OPENCLAW_STATE_DIR/tools/sherpa-onnx-tts/runtime`，默认 `~/.openclaw/tools/sherpa-onnx-tts/runtime`）
2. 下载语音模型（解压到 `$OPENCLAW_STATE_DIR/tools/sherpa-onnx-tts/models`，默认 `~/.openclaw/tools/sherpa-onnx-tts/models`）

首先解析活跃状态目录：

```bash
STATE_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
```

然后将解析后的路径写入活跃的 OpenClaw 配置文件（`$OPENCLAW_CONFIG_PATH`，默认 `~/.openclaw/openclaw.json`）：

```json5
{
  skills: {
    entries: {
      "sherpa-onnx-tts": {
        env: {
          SHERPA_ONNX_RUNTIME_DIR: "/path/to/your/state-dir/tools/sherpa-onnx-tts/runtime",
          SHERPA_ONNX_MODEL_DIR: "/path/to/your/state-dir/tools/sherpa-onnx-tts/models/vits-piper-en_US-lessac-high",
        },
      },
    },
  },
}
```

包装器位于本技能文件夹中。直接运行，或将包装器添加到 PATH：

```bash
export PATH="{baseDir}/bin:$PATH"
```

## 用法

```bash
{baseDir}/bin/sherpa-onnx-tts -o ./tts.wav "Hello from local TTS."
```

注意事项：

- 如需其他语音，从 sherpa-onnx `tts-models` 发布版选择不同的模型。
- 如果模型目录有多个 `.onnx` 文件，设置 `SHERPA_ONNX_MODEL_FILE` 或传入 `--model-file`。
- 也可以传入 `--tokens-file` 或 `--data-dir` 来覆盖默认值。
- Windows：运行 `node {baseDir}\\bin\\sherpa-onnx-tts -o tts.wav "Hello from local TTS."`
