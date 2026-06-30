---
name: sag
description: ElevenLabs 文字转语音，具有 mac 风格的 say 用户体验。
homepage: https://sag.sh
metadata:
  {
    "openclaw":
      {
        "emoji": "🔊",
        "requires": { "bins": ["sag"], "env": ["ELEVENLABS_API_KEY"] },
        "primaryEnv": "ELEVENLABS_API_KEY",
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "steipete/tap/sag",
              "bins": ["sag"],
              "label": "Install sag (brew)",
            },
          ],
      },
  }
---

# sag

使用 `sag` 通过 ElevenLabs TTS 进行本地播放。

API 密钥（必需）

- `ELEVENLABS_API_KEY`（首选）
- CLI 也支持 `SAG_API_KEY`

快速开始

- `sag "Hello there"`
- `sag speak -v "Roger" "Hello"`
- `sag voices`
- `sag prompting`（模型专用提示）

模型说明

- 默认：`eleven_v3`（富有表现力）
- 稳定：`eleven_multilingual_v2`
- 快速：`eleven_flash_v2_5`

发音 + 语调规则

- 首选修复：重新拼写（如 "key-note"），添加连字符，调整大小写。
- 数字/单位/URL：`--normalize auto`（或 `off` 如果它影响名称）。
- 语言偏置：`--lang en|de|fr|...` 以引导规范化。
- v3：不支持 SSML `<break>`；使用 `[pause]`、`[short pause]`、`[long pause]`。
- v2/v2.5：支持 SSML `<break time="1.5s" />`；`sag` 中不暴露 `<phoneme>`。

v3 音频标签（放在行首）

- `[whispers]`、`[shouts]`、`[sings]`
- `[laughs]`、`[starts laughing]`、`[sighs]`、`[exhales]`
- `[sarcastic]`、`[curious]`、`[excited]`、`[crying]`、`[mischievously]`
- 示例：`sag "[whispers] keep this quiet. [short pause] ok?"`

语音默认值

- `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`

长输出前请确认语音和说话人。

## 聊天语音回复

当用户要求"语音"回复时（如"用疯狂科学家的声音"、"用语音解释"），生成音频并发送：

```bash
# 生成音频文件
sag -v Clawd -o /tmp/voice-reply.mp3 "Your message here"

# 然后在回复中包含：
# MEDIA:/tmp/voice-reply.mp3
```

语音角色提示：

- 疯狂科学家：使用 `[excited]` 标签，戏剧性停顿 `[short pause]`，变化强度
- 平静：使用 `[whispers]` 或较慢节奏
- 戏剧性：少量使用 `[sings]` 或 `[shouts]`

Clawd 默认语音：`lj2rcrvANS3gaWWnczSX`（或直接使用 `-v Clawd`）
