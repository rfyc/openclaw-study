---
summary: "入站音频/语音消息如何被下载、转录并注入回复"
read_when:
  - 修改音频转录或媒体处理
title: "音频与语音消息"
---

# 音频 / 语音消息 (2026-01-17)

## 支持的功能

- **媒体理解（音频）**：如果启用了音频理解（或自动检测），OpenClaw 将：
  1. 定位第一个音频附件（本地路径或 URL），如需则下载。
  2. 在发送给每个模型条目之前强制执行 `maxBytes` 限制。
  3. 按顺序运行第一个符合条件的模型条目（提供商或 CLI）。
  4. 如果失败或跳过（大小/超时），则尝试下一个条目。
  5. 成功后，将 `Body` 替换为 `[Audio]` 块并设置 `{{Transcript}}`。
- **命令解析**：转录成功后，`CommandBody`/`RawBody` 会被设置为转录文本，使斜杠命令仍然可用。
- **详细日志**：在 `--verbose` 模式下，当转录运行和替换正文时会记录日志。

## 自动检测（默认）

如果你**没有配置模型**且 `tools.media.audio.enabled` **未**设置为 `false`，
OpenClaw 按以下顺序自动检测，在第一个可用选项处停止：

1. **当前回复模型**（当其提供商支持音频理解时）
2. **本地 CLI**（如已安装）
   - `sherpa-onnx-offline`（需要 `SHERPA_ONNX_MODEL_DIR` 包含 encoder/decoder/joiner/tokens）
   - `whisper-cli`（来自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或内置的 tiny 模型）
   - `whisper`（Python CLI；自动下载模型）
3. **Gemini CLI**（`gemini`）使用 `read_many_files`
4. **提供商认证**
   - 已配置的支持音频的 `models.providers.*` 条目优先尝试
   - 内置回退顺序：OpenAI → Groq → xAI → Deepgram → Google → SenseAudio → ElevenLabs → Mistral

如需禁用自动检测，设置 `tools.media.audio.enabled: false`。
如需自定义，设置 `tools.media.audio.models`。
注意：二进制检测在 macOS/Linux/Windows 上为尽力而为；确保 CLI 在 `PATH` 上（我们会展开 `~`），或为 CLI 模型设置完整命令路径。

## 配置示例

### 提供商 + CLI 回退（OpenAI + Whisper CLI）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        maxBytes: 20971520,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          {
            type: "cli",
            command: "whisper",
            args: ["--model", "base", "{{MediaPath}}"],
            timeoutSeconds: 45,
          },
        ],
      },
    },
  },
}
```

### 仅提供商并设置范围限制

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        scope: {
          default: "allow",
          rules: [{ action: "deny", match: { chatType: "group" } }],
        },
        models: [{ provider: "openai", model: "gpt-4o-mini-transcribe" }],
      },
    },
  },
}
```

### 仅提供商（Deepgram）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3" }],
      },
    },
  },
}
```

### 仅提供商（Mistral Voxtral）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}
```

### 仅提供商（SenseAudio）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "senseaudio", model: "senseaudio-asr-pro-1.5-260319" }],
      },
    },
  },
}
```

### 回显转录到聊天（可选启用）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        echoTranscript: true, // 默认为 false
        echoFormat: '📝 "{transcript}"', // 可选，支持 {transcript}
        models: [{ provider: "openai", model: "gpt-4o-mini-transcribe" }],
      },
    },
  },
}
```

## 注意事项与限制

- 提供商认证遵循标准模型认证顺序（认证配置文件、环境变量、`models.providers.*.apiKey`）。
- Groq 设置详情：[Groq](/providers/groq)。
- 使用 `provider: "deepgram"` 时，Deepgram 会读取 `DEEPGRAM_API_KEY`。
- Deepgram 设置详情：[Deepgram（音频转录）](/providers/deepgram)。
- Mistral 设置详情：[Mistral](/providers/mistral)。
- 使用 `provider: "senseaudio"` 时，SenseAudio 会读取 `SENSEAUDIO_API_KEY`。
- SenseAudio 设置详情：[SenseAudio](/providers/senseaudio)。
- 音频提供商可通过 `tools.media.audio` 覆盖 `baseUrl`、`headers` 和 `providerOptions`。
- 默认大小上限为 20MB（`tools.media.audio.maxBytes`）。超出大小的音频会为该模型跳过并尝试下一个条目。
- 小于 1024 字节的微小/空音频文件在提供商/CLI 转录之前会被跳过。
- 音频的默认 `maxChars` **未设置**（完整转录）。设置 `tools.media.audio.maxChars` 或每条目的 `maxChars` 来截断输出。
- OpenAI 自动默认为 `gpt-4o-mini-transcribe`；设置 `model: "gpt-4o-transcribe"` 以获得更高精度。
- 使用 `tools.media.audio.attachments` 处理多个语音消息（`mode: "all"` + `maxAttachments`）。
- 转录文本可在模板中通过 `{{Transcript}}` 使用。
- `tools.media.audio.echoTranscript` 默认关闭；启用后，在智能体处理前会将转录确认发送回原始聊天。
- `tools.media.audio.echoFormat` 自定义回显文本（占位符：`{transcript}`）。
- CLI 标准输出有上限（5MB）；保持 CLI 输出简洁。
- CLI `args` 应使用 `{{MediaPath}}` 作为本地音频文件路径。运行 `openclaw doctor --fix` 以迁移旧版 `audio.transcription.command` 配置中已弃用的 `{input}` 占位符。

### 代理环境支持

基于提供商的音频转录遵循标准的出站代理环境变量：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

如果没有设置代理环境变量，则使用直接出站。如果代理配置格式不正确，OpenClaw 会记录警告并回退到直接获取。

## 群组中的提及检测

当为群聊设置 `requireMention: true` 时，OpenClaw 现在会在检查提及**之前**先转录音频。这允许即使语音消息中包含提及也能正常处理。

**工作原理：**

1. 如果语音消息没有文本正文且群组需要提及，OpenClaw 会执行"预检"转录。
2. 检查转录文本中的提及模式（例如 `@BotName`、表情触发词）。
3. 如果找到提及，消息将进入完整的回复流程。
4. 转录文本用于提及检测，以便语音消息可以通过提及门控。

**回退行为：**

- 如果预检期间转录失败（超时、API 错误等），则仅基于文本进行提及检测来处理消息。
- 这确保混合消息（文本 + 音频）不会被错误地丢弃。

**按 Telegram 群组/话题退出：**

- 设置 `channels.telegram.groups.<chatId>.disableAudioPreflight: true` 以跳过该群组的预检转录提及检查。
- 设置 `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` 以按话题覆盖（`true` 跳过，`false` 强制启用）。
- 默认为 `false`（当提及门控条件匹配时启用预检）。

**示例：** 用户在设置了 `requireMention: true` 的 Telegram 群组中发送语音消息"嘿 @Claude，今天天气怎么样？"。语音消息被转录，检测到提及，智能体进行回复。

## 注意事项

- 范围规则使用第一条匹配优先。`chatType` 被标准化为 `direct`、`group` 或 `room`。
- 确保你的 CLI 以 0 退出并打印纯文本；JSON 需要通过 `jq -r .text` 处理。
- 对于 `parakeet-mlx`，如果你传递 `--output-dir`，当 `--output-format` 为 `txt`（或省略）时，OpenClaw 读取 `<output-dir>/<media-basename>.txt`；非 `txt` 输出格式回退到标准输出解析。
- 保持超时合理（`timeoutSeconds`，默认 60s）以避免阻塞回复队列。
- 预检转录仅处理**第一个**音频附件用于提及检测。其他音频在主要媒体理解阶段处理。

## 相关

- [媒体理解](/nodes/media-understanding)
- [Talk 模式](/nodes/talk)
- [语音唤醒](/nodes/voicewake)
