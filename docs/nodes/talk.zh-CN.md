---
summary: "Talk 模式：使用配置的 TTS 提供商进行连续语音对话"
read_when:
  - 在 macOS/iOS/Android 上实现 Talk 模式
  - 更改语音/TTS/中断行为
title: "Talk 模式"
---

Talk 模式是一个连续语音对话循环：

1. 监听语音
2. 将转录文本发送给模型（主会话，chat.send）
3. 等待响应
4. 通过配置的 Talk 提供商朗读（`talk.speak`）

## 行为（macOS）

- Talk 模式启用时**始终显示叠加层**。
- **监听 → 思考 → 说话**阶段转换。
- 在**短暂停顿**（静音窗口）时，发送当前转录文本。
- 回复**写入 WebChat**（与打字相同）。
- **语音中断**（默认开启）：如果用户在助手说话时开始说话，我们停止播放并在下一个提示中记录中断时间戳。

## 回复中的语音指令

助手可以在其回复前加上一行 **JSON** 来控制语音：

```json
{ "voice": "<voice-id>", "once": true }
```

规则：

- 仅第一个非空行。
- 未知键被忽略。
- `once: true` 仅适用于当前回复。
- 没有 `once` 时，语音成为 Talk 模式的新默认值。
- JSON 行在 TTS 播放前被剥离。

支持的键：

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`、`rate`（WPM）、`stability`、`similarity`、`style`、`speakerBoost`
- `seed`、`normalize`、`lang`、`output_format`、`latency_tier`
- `once`

## 配置（`~/.openclaw/openclaw.json`）

```json5
{
  talk: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "elevenlabs_voice_id",
        modelId: "eleven_v3",
        outputFormat: "mp3_44100_128",
        apiKey: "elevenlabs_api_key",
      },
      mlx: {
        modelId: "mlx-community/Soprano-80M-bf16",
      },
      system: {},
    },
    speechLocale: "ru-RU",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

默认值：

- `interruptOnSpeech`：true
- `silenceTimeoutMs`：未设置时，Talk 在发送转录文本之前保持平台默认的停顿窗口（`macOS 和 Android 上为 700ms，iOS 上为 900ms`）
- `provider`：选择活跃的 Talk 提供商。使用 `elevenlabs`、`mlx` 或 `system` 作为 macOS 本地播放路径。
- `providers.<provider>.voiceId`：对于 ElevenLabs 回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`（或 API 密钥可用时的第一个 ElevenLabs 语音）。
- `providers.elevenlabs.modelId`：未设置时默认为 `eleven_v3`。
- `providers.mlx.modelId`：未设置时默认为 `mlx-community/Soprano-80M-bf16`。
- `providers.elevenlabs.apiKey`：回退到 `ELEVENLABS_API_KEY`（或网关 shell 配置文件，如果可用）。
- `speechLocale`：iOS/macOS 上设备 Talk 语音识别的可选 BCP 47 区域设置 ID。不设置则使用设备默认值。
- `outputFormat`：在 macOS/iOS 上默认为 `pcm_44100`，在 Android 上默认为 `pcm_24000`（设置 `mp3_*` 以强制 MP3 流式传输）

## macOS UI

- 菜单栏切换：**Talk**
- 配置标签页：**Talk 模式**组（语音 ID + 中断切换）
- 叠加层：
  - **监听**：云状脉冲与麦克风级别
  - **思考**：下沉动画
  - **说话**：辐射环
  - 点击云：停止说话
  - 点击 X：退出 Talk 模式

## Android UI

- 语音标签页切换：**Talk**
- 手动**麦克风**和 **Talk** 是互斥的运行时捕获模式。
- 手动麦克风在应用离开前台或用户离开语音标签页时停止。
- Talk 模式持续运行直到被关闭或 Android 节点断开连接，并在活动期间使用 Android 的麦克风前台服务类型。

## 注意事项

- 需要语音 + 麦克风权限。
- 对会话键 `main` 使用 `chat.send`。
- 网关通过 `talk.speak` 使用活跃的 Talk 提供商解析 Talk 播放。仅当该 RPC 不可用时，Android 才回退到本地系统 TTS。
- macOS 本地 MLX 播放在存在内置 `openclaw-mlx-tts` 辅助工具时使用它，或使用 `PATH` 上的可执行文件。在开发期间设置 `OPENCLAW_MLX_TTS_BIN` 指向自定义辅助工具二进制文件。
- `eleven_v3` 的 `stability` 验证为 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- 设置时 `latency_tier` 验证为 `0..4`。
- Android 支持 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 输出格式，用于低延迟 AudioTrack 流式传输。

## 相关

- [语音唤醒](/nodes/voicewake)
- [音频与语音消息](/nodes/audio)
- [媒体理解](/nodes/media-understanding)
