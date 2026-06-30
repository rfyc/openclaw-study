---
summary: "图像、视频、音乐、语音及媒体理解功能一览"
read_when:
  - 查找 OpenClaw 媒体能力概览
  - 决定配置哪个媒体提供商
  - 了解异步媒体生成的工作原理
title: "媒体概览"
sidebarTitle: "媒体概览"
---

OpenClaw 可以生成图像、视频和音乐，理解入站媒体（图像、音频、视频），并通过文字转语音大声朗读回复。所有媒体能力都是工具驱动的：代理根据对话决定何时使用它们，每个工具只在至少有一个支持的提供商被配置时才会出现。

## 能力

<CardGroup cols={2}>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    通过 `image_generate` 从文本提示或参考图像创建和编辑图像。同步——与回复内联完成。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    通过 `video_generate` 实现文本转视频、图像转视频和视频转视频。异步——在后台运行并在就绪时发布结果。
  </Card>
  <Card title="音乐生成" href="/tools/music-generation" icon="music">
    通过 `music_generate` 生成音乐或音频曲目。共享提供商上是异步的；ComfyUI 工作流路径同步运行。
  </Card>
  <Card title="文字转语音" href="/tools/tts" icon="microphone">
    通过 `tts` 工具加 `messages.tts` 配置将出站回复转换为语音音频。同步。
  </Card>
  <Card title="媒体理解" href="/nodes/media-understanding" icon="eye">
    使用具有视觉能力的模型提供商和专用媒体理解插件来摘要入站图像、音频和视频。
  </Card>
  <Card title="语音转文字" href="/nodes/audio" icon="ear-listen">
    通过批量 STT 或语音通话流式 STT 提供商转录入站语音消息。
  </Card>
</CardGroup>

## 提供商能力矩阵

| 提供商      | 图像 | 视频 | 音乐 | TTS | STT | 实时语音 | 媒体理解 |
| ----------- | :--: | :--: | :--: | :-: | :-: | :------: | :------: |
| Alibaba     |      |  ✓   |      |     |     |          |          |
| BytePlus    |      |  ✓   |      |     |     |          |          |
| ComfyUI     |  ✓   |  ✓   |  ✓   |     |     |          |          |
| DeepInfra   |  ✓   |  ✓   |      |  ✓  |  ✓  |          |    ✓     |
| Deepgram    |      |      |      |     |  ✓  |    ✓     |          |
| ElevenLabs  |      |      |      |  ✓  |  ✓  |          |          |
| fal         |  ✓   |  ✓   |      |     |     |          |          |
| Google      |  ✓   |  ✓   |  ✓   |  ✓  |     |    ✓     |    ✓     |
| Gradium     |      |      |      |  ✓  |     |          |          |
| Local CLI   |      |      |      |  ✓  |     |          |          |
| Microsoft   |      |      |      |  ✓  |     |          |          |
| MiniMax     |  ✓   |  ✓   |  ✓   |  ✓  |     |          |          |
| Mistral     |      |      |      |     |  ✓  |          |          |
| OpenAI      |  ✓   |  ✓   |      |  ✓  |  ✓  |    ✓     |    ✓     |
| OpenRouter  |  ✓   |  ✓   |      |  ✓  |     |          |    ✓     |
| Qwen        |      |  ✓   |      |     |     |          |          |
| Runway      |      |  ✓   |      |     |     |          |          |
| SenseAudio  |      |      |      |     |  ✓  |          |          |
| Together    |      |  ✓   |      |     |     |          |          |
| Vydra       |  ✓   |  ✓   |      |  ✓  |     |          |          |
| xAI         |  ✓   |  ✓   |      |  ✓  |  ✓  |          |    ✓     |
| Xiaomi MiMo |  ✓   |      |      |  ✓  |     |          |    ✓     |

<Note>
媒体理解使用你提供商配置中注册的任何具有视觉能力或音频能力的模型。上面的矩阵列出了具有专用媒体理解支持的提供商；大多数多模态 LLM 提供商（Anthropic、Google、OpenAI 等）在配置为活动回复模型时也可以理解入站媒体。
</Note>

## 异步与同步

| 能力            | 模式 | 原因                                          |
| --------------- | ---- | --------------------------------------------- |
| 图像            | 同步 | 提供商响应在几秒内返回；与回复内联完成。      |
| 文字转语音      | 同步 | 提供商响应在几秒内返回；附加到回复音频。      |
| 视频            | 异步 | 提供商处理需要 30 秒到几分钟。                |
| 音乐（共享）    | 异步 | 与视频相同的提供商处理特性。                  |
| 音乐（ComfyUI） | 同步 | 本地工作流针对配置的 ComfyUI 服务器内联运行。 |

对于异步工具，OpenClaw 将请求提交给提供商，立即返回任务 ID，并在任务台账中跟踪任务。代理在任务运行期间继续响应其他消息。当提供商完成后，OpenClaw 唤醒代理，以便它可以将完成的媒体发布回原始频道。

## 语音转文字和语音通话

Deepgram、DeepInfra、ElevenLabs、Mistral、OpenAI、SenseAudio 和 xAI 在配置时都可以通过批量 `tools.media.audio` 路径转录入站音频。预检语音消息用于提及门控或命令解析的频道插件会在入站上下文中标记转录的附件，因此共享的媒体理解过程会重用该转录，而不是对同一音频进行第二次 STT 调用。

Deepgram、ElevenLabs、Mistral、OpenAI 和 xAI 还注册了语音通话流式 STT 提供商，因此实时电话音频可以在不等待完整录音的情况下转发给所选供应商。

## 提供商映射（供应商如何跨表面分布）

<AccordionGroup>
  <Accordion title="Google">
    图像、视频、音乐、批量 TTS、后端实时语音和媒体理解表面。
  </Accordion>
  <Accordion title="OpenAI">
    图像、视频、批量 TTS、批量 STT、语音通话流式 STT、后端实时语音和记忆嵌入表面。
  </Accordion>
  <Accordion title="DeepInfra">
    聊天/模型路由、图像生成/编辑、文本转视频、批量 TTS、批量 STT、图像媒体理解和记忆嵌入表面。DeepInfra 原生的重排/分类/目标检测模型在 OpenClaw 为这些类别建立专用提供商合约之前不会注册。
  </Accordion>
  <Accordion title="xAI">
    图像、视频、搜索、代码执行、批量 TTS、批量 STT 和语音通话流式 STT。xAI 实时语音是上游能力，但在共享实时语音合约能够表示它之前不会在 OpenClaw 中注册。
  </Accordion>
</AccordionGroup>

## 相关链接

- [图像生成](/tools/image-generation)
- [视频生成](/tools/video-generation)
- [音乐生成](/tools/music-generation)
- [文字转语音](/tools/tts)
- [媒体理解](/nodes/media-understanding)
- [音频节点](/nodes/audio)
