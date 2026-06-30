---
summary: "实时（触及网络）测试：模型矩阵、CLI 后端、ACP、媒体提供商、凭证"
read_when:
  - 运行实时模型矩阵 / CLI 后端 / ACP / 媒体提供商冒烟测试
  - 调试实时测试凭证解析
  - 为新的特定提供商添加实时测试
title: "测试：实时套件"
sidebarTitle: "实时测试"
---

有关快速入门、QA 运行器、单元/集成套件和 Docker 流程，请参阅[测试](/help/testing)。本页涵盖**实时**（触及网络）测试套件：模型矩阵、CLI 后端、ACP 和媒体提供商实时测试，以及凭证处理。

## 实时：本地配置文件冒烟命令

在临时实时检查之前，先加载 `~/.profile`，以便提供商密钥和本地工具路径与你的 shell 匹配：

```bash
source ~/.profile
```

安全媒体冒烟：

```bash
pnpm openclaw infer tts convert --local --json \
  --text "OpenClaw live smoke." \
  --output /tmp/openclaw-live-smoke.mp3
```

安全语音呼叫就绪冒烟：

```bash
pnpm openclaw voicecall setup --json
pnpm openclaw voicecall smoke --to "+15555550123"
```

`voicecall smoke` 是干运行，除非还附加了 `--yes`。只有在你有意进行真实通知呼叫时才使用 `--yes`。对于 Twilio、Telnyx 和 Plivo，成功的就绪检查需要公共 Webhook URL；本地只有环回/私有回退在设计上会被拒绝。

## 实时：Android 节点功能扫描

- 测试：`src/gateway/android-node.capabilities.live.test.ts`
- 脚本：`pnpm android:test:integration`
- 目标：调用**已连接 Android 节点当前通告的每个命令**并断言命令合同行为。
- 范围：
  - 预条件/手动设置（套件不安装/运行/配对应用）。
  - 为所选 Android 节点逐命令验证网关 `node.invoke`。
- 必需的预设置：
  - Android 应用已连接并配对到网关。
  - 应用保持在前台。
  - 已为你期望通过的功能授予权限/捕获同意。
- 可选目标覆盖：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 设置详情：[Android 应用](/platforms/android)

## 实时：模型冒烟（配置文件密钥）

实时测试分为两层，以便我们可以隔离失败：

- "直接模型"告诉我们提供商/模型是否可以使用给定的密钥完全回答。
- "Gateway 冒烟"告诉我们该模型的完整 Gateway+代理管道是否有效（会话、历史、工具、沙箱策略等）。

### 第 1 层：直接模型完成（无 Gateway）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举已发现的模型
  - 使用 `getApiKeyForModel` 选择你有凭证的模型
  - 每个模型运行一次小型完成（以及在需要时针对性的回归）
- 启用方式：
  - `pnpm test:live`（或直接调用 Vitest 时使用 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，是 modern 的别名）以实际运行此套件；否则会跳过，以保持 `pnpm test:live` 专注于 Gateway 冒烟
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern`：运行现代白名单（Opus/Sonnet 4.6+、GPT-5.2 + Codex、Gemini 3、DeepSeek V4、GLM 4.7、MiniMax M2.7、Grok 4.3）
  - `OPENCLAW_LIVE_MODELS=all` 是现代白名单的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.5,openai-codex/gpt-5.5,anthropic/claude-opus-4-6,..."`（逗号白名单）
  - 现代/全扫默认为精选的高信号上限；设置 `OPENCLAW_LIVE_MAX_MODELS=0` 进行详尽的现代扫描，或设置正数进行较小的上限。
  - 详尽扫描使用 `OPENCLAW_LIVE_TEST_TIMEOUT_MS` 作为整个直接模型测试超时。默认：60 分钟。
  - 直接模型探针默认以 20 路并行运行；设置 `OPENCLAW_LIVE_MODEL_CONCURRENCY` 以覆盖。
- 如何选择提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗号白名单）
- 密钥来自哪里：
  - 默认：配置文件存储和环境变量回退
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以仅强制**配置文件存储**
- 为什么存在：
  - 将"提供商 API 损坏/密钥无效"与"Gateway 代理管道损坏"分开
  - 包含针对已知错误的小型隔离回归（例如：OpenAI Responses/Codex Responses 推理重放 + 工具调用流程）

### 第 2 层：Gateway + 开发代理冒烟（"@openclaw"实际执行的内容）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动进程内 Gateway
  - 创建/修补 `agent:dev:*` 会话（每次运行的模型覆盖）
  - 迭代有密钥的模型并断言：
    - "有意义"的响应（无工具）
    - 真实的工具调用有效（读取探针）
    - 可选的额外工具探针（exec+读取探针）
    - OpenAI 回归路径（仅工具调用 → 跟进）保持有效
- 探针详情（以便你可以快速解释失败）：
  - `read` 探针：测试在工作区写入一个 nonce 文件，并要求代理 `read` 它并回显 nonce。
  - `exec+read` 探针：测试要求代理 `exec`-写入一个 nonce 到临时文件，然后 `read` 它返回。
  - 图像探针：测试附加一个生成的 PNG（猫 + 随机化代码），并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 启用方式：
  - `pnpm test:live`（或直接调用 Vitest 时使用 `OPENCLAW_LIVE_TEST=1`）
- 如何选择模型：
  - 默认：现代白名单（Opus/Sonnet 4.6+、GPT-5.2 + Codex、Gemini 3、DeepSeek V4、GLM 4.7、MiniMax M2.7、Grok 4.3）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是现代白名单的别名
  - 或设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号列表）来缩小范围
  - 现代/全 Gateway 扫描默认为精选的高信号上限；设置 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 进行详尽的现代扫描，或设置正数进行较小的上限。
- 如何选择提供商（避免"OpenRouter 所有内容"）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号白名单）
- 工具 + 图像探针在此实时测试中始终开启：
  - `read` 探针 + `exec+read` 探针（工具压力）
  - 当模型通告图像输入支持时，运行图像探针

<Tip>
要查看你的机器上可以测试什么（以及精确的 `provider/model` ID），运行：

```bash
openclaw models list
openclaw models list --json
```

</Tip>

## 实时：CLI 后端冒烟（Claude、Codex、Gemini 或其他本地 CLI）

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 CLI 后端验证 Gateway + 代理管道，而不影响你的默认配置。
- 后端特定冒烟默认值与拥有者插件的 `cli-backend.ts` 定义一起存放。
- 启用：
  - `pnpm test:live`（或直接调用 Vitest 时使用 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 默认值：
  - 默认提供商/模型：`claude-cli/claude-sonnet-4-6`
  - 命令/参数/图像行为来自拥有者 CLI 后端插件元数据。
- 覆盖（可选）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.5"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - 各种其他 `OPENCLAW_LIVE_CLI_BACKEND_*` 选项（详见原始文档）

示例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.5" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Docker 配方：

```bash
pnpm test:docker:live-cli-backend
```

单提供商 Docker 配方：

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

## 实时：APNs HTTP/2 代理可达性

- 测试：`src/infra/push-apns-http2.live.test.ts`
- 启用：
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_APNS_REACHABILITY=1 pnpm test:live src/infra/push-apns-http2.live.test.ts`

## 实时：ACP 绑定冒烟（`/acp spawn ... --bind here`）

- 测试：`src/gateway/gateway-acp-bind.live.test.ts`
- 启用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`

示例：

```bash
OPENCLAW_LIVE_ACP_BIND=1 \
  OPENCLAW_LIVE_ACP_BIND_AGENT=claude \
  pnpm test:live src/gateway/gateway-acp-bind.live.test.ts
```

Docker 配方：

```bash
pnpm test:docker:live-acp-bind
```

单代理 Docker 配方：

```bash
pnpm test:docker:live-acp-bind:claude
pnpm test:docker:live-acp-bind:codex
pnpm test:docker:live-acp-bind:droid
pnpm test:docker:live-acp-bind:gemini
pnpm test:docker:live-acp-bind:opencode
```

## 实时：Codex 应用服务器测试框架冒烟

- 目标：通过正常的 Gateway `agent` 方法验证插件拥有的 Codex 测试框架
- 测试：`src/gateway/gateway-codex-harness.live.test.ts`
- 启用：`OPENCLAW_LIVE_CODEX_HARNESS=1`
- 默认模型：`openai/gpt-5.5`

本地配方：

```bash
source ~/.profile
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/gpt-5.5 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Docker 配方：

```bash
source ~/.profile
pnpm test:docker:live-codex-harness
```

### 推荐的实时配方

窄的、明确的白名单最快且最不容易出错：

- 单一模型，直接（无 Gateway）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.5" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单一模型，Gateway 冒烟：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供商的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,openai-codex/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

## 实时：模型矩阵（我们覆盖的内容）

没有固定的"CI 模型列表"（实时是可选的），但这些是在有密钥的开发机器上建议定期覆盖的**推荐**模型。

### 现代冒烟集（工具调用 + 图像）

这是我们期望保持工作的"常用模型"运行：

- OpenAI（非 Codex）：`openai/gpt-5.5`
- OpenAI Codex OAuth：`openai-codex/gpt-5.5`
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google（Gemini API）：`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview`
- Google（Antigravity）：`google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- DeepSeek：`deepseek/deepseek-v4-flash` 和 `deepseek/deepseek-v4-pro`
- Z.AI（GLM）：`zai/glm-5.1`
- MiniMax：`minimax/MiniMax-M2.7`

使用工具 + 图像运行 Gateway 冒烟：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,openai-codex/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

## 凭证（永远不要提交）

实时测试以与 CLI 相同的方式发现凭证。实际含义：

- 如果 CLI 有效，实时测试应该找到相同的密钥。
- 如果实时测试说"没有凭证"，以与 `openclaw models list` / 模型选择相同的方式调试。

## Deepgram 实时（音频转录）

- 测试：`extensions/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live extensions/deepgram/audio.live.test.ts`

## BytePlus 编码计划实时

- 测试：`extensions/byteplus/live.test.ts`
- 启用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`

## 图像生成实时

- 测试：`test/image-generation.runtime.live.test.ts`
- 命令：`pnpm test:live test/image-generation.runtime.live.test.ts`
- 测试框架：`pnpm test:live:media image`

## 音乐生成实时

- 测试：`extensions/music-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 测试框架：`pnpm test:live:media music`

## 视频生成实时

- 测试：`extensions/video-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 测试框架：`pnpm test:live:media video`

## 媒体实时测试框架

- 命令：`pnpm test:live:media`
- 用途：
  - 通过一个仓库原生入口点运行共享的图像、音乐和视频实时套件
  - 从 `~/.profile` 自动加载缺失的提供商环境变量
  - 默认情况下将每个套件自动缩窄到当前有可用验证的提供商
- 示例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## 相关链接

- [测试](/help/testing) — 单元、集成、QA 和 Docker 套件
