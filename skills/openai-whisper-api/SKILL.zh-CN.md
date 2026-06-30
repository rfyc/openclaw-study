---
name: openai-whisper-api
description: 通过 OpenAI 音频转录 API（Whisper）转录音频。
homepage: https://platform.openai.com/docs/guides/speech-to-text
metadata:
  {
    "openclaw":
      {
        "emoji": "🌐",
        "requires": { "bins": ["curl"], "env": ["OPENAI_API_KEY"] },
        "primaryEnv": "OPENAI_API_KEY",
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "curl",
              "bins": ["curl"],
              "label": "Install curl (brew)",
            },
          ],
      },
  }
---

# OpenAI Whisper API（curl）

通过 OpenAI 的 `/v1/audio/transcriptions` 端点转录音频文件。设置 `OPENAI_BASE_URL` 可使用兼容 OpenAI 的代理或本地 gateway。

## 快速开始

```bash
{baseDir}/scripts/transcribe.sh /path/to/audio.m4a
```

默认值：

- 模型：`whisper-1`
- 输出：`<input>.txt`

## 常用标志

```bash
{baseDir}/scripts/transcribe.sh /path/to/audio.ogg --model whisper-1 --out /tmp/transcript.txt
{baseDir}/scripts/transcribe.sh /path/to/audio.m4a --language en
{baseDir}/scripts/transcribe.sh /path/to/audio.m4a --prompt "Speaker names: Peter, Daniel"
{baseDir}/scripts/transcribe.sh /path/to/audio.m4a --json --out /tmp/transcript.json
```

## API 密钥

设置 `OPENAI_API_KEY`，或在活跃的 OpenClaw 配置文件（`$OPENCLAW_CONFIG_PATH`，默认 `~/.openclaw/openclaw.json`）中配置。可选设置 `OPENAI_BASE_URL`（例如 `http://127.0.0.1:51805/v1`）以使用兼容 OpenAI 的代理或本地 gateway：

```json5
{
  skills: {
    "openai-whisper-api": {
      apiKey: "OPENAI_KEY_HERE",
    },
  },
}
```
