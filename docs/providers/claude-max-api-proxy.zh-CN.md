---
summary: "社区代理，将 Claude 订阅凭据公开为 OpenAI 兼容端点"
read_when:
  - 您想将 Claude Max 订阅与 OpenAI 兼容工具一起使用
  - 您想要一个本地 API 服务器来包装 Claude Code CLI
  - 您想评估基于订阅的 Anthropic 访问与 API 密钥方式的差异
title: "Claude Max API 代理"
---

**claude-max-api-proxy** 是一个社区工具，将您的 Claude Max/Pro 订阅公开为 OpenAI 兼容的 API 端点。这使您可以将订阅与任何支持 OpenAI API 格式的工具一起使用。

<Warning>
此路径仅用于技术兼容性。Anthropic 过去曾封锁过在 Claude Code 之外使用订阅的部分方式。您必须自行决定是否使用，并在依赖此方式之前验证 Anthropic 的当前条款。
</Warning>

## 为什么使用此代理？

| 方式            | 费用                                                 | 适合                       |
| --------------- | ---------------------------------------------------- | -------------------------- |
| Anthropic API   | 按 token 计费（约 $15/百万输入，$75/百万输出，Opus） | 生产应用、高流量           |
| Claude Max 订阅 | 每月 $200 固定费用                                   | 个人使用、开发、无限制使用 |

如果您有 Claude Max 订阅并希望与 OpenAI 兼容工具一起使用，此代理可能降低某些工作流的成本。API 密钥仍然是生产使用最清晰的政策路径。

## 工作原理

```
您的应用 → claude-max-api-proxy → Claude Code CLI → Anthropic（通过订阅）
（OpenAI 格式）           （转换格式）            （使用您的登录）
```

该代理：

1. 在 `http://localhost:3456/v1/chat/completions` 接受 OpenAI 格式请求
2. 将其转换为 Claude Code CLI 命令
3. 以 OpenAI 格式返回响应（支持流式传输）

## 快速开始

<Steps>
  <Step title="安装代理">
    需要 Node.js 20+ 和 Claude Code CLI。

    ```bash
    npm install -g claude-max-api-proxy

    # 验证 Claude CLI 已通过认证
    claude --version
    ```

  </Step>
  <Step title="启动服务器">
    ```bash
    claude-max-api
    # 服务器运行在 http://localhost:3456
    ```
  </Step>
  <Step title="测试代理">
    ```bash
    # 健康检查
    curl http://localhost:3456/health

    # 列出模型
    curl http://localhost:3456/v1/models

    # 聊天补全
    curl http://localhost:3456/v1/chat/completions \
      -H "Content-Type: application/json" \
      -d '{
        "model": "claude-opus-4",
        "messages": [{"role": "user", "content": "Hello!"}]
      }'
    ```

  </Step>
  <Step title="配置 OpenClaw">
    将 OpenClaw 指向代理作为自定义 OpenAI 兼容端点：

    ```json5
    {
      env: {
        OPENAI_API_KEY: "not-needed",
        OPENAI_BASE_URL: "http://localhost:3456/v1",
      },
      agents: {
        defaults: {
          model: { primary: "openai/claude-opus-4" },
        },
      },
    }
    ```

  </Step>
</Steps>

## 内置目录

| 模型 ID           | 映射到          |
| ----------------- | --------------- |
| `claude-opus-4`   | Claude Opus 4   |
| `claude-sonnet-4` | Claude Sonnet 4 |
| `claude-haiku-4`  | Claude Haiku 4  |

## 高级配置

<AccordionGroup>
  <Accordion title="代理式 OpenAI 兼容说明">
    此路径使用与其他自定义 `/v1` 后端相同的代理式 OpenAI 兼容路由：

    - 不适用原生 OpenAI 专属请求格式
    - 无 `service_tier`、无 Responses `store`、无提示词缓存提示，也无 OpenAI 推理兼容载荷格式
    - 代理 URL 上不注入隐藏的 OpenClaw 归因标头（`originator`、`version`、`User-Agent`）

  </Accordion>

  <Accordion title="在 macOS 上使用 LaunchAgent 自动启动">
    创建 LaunchAgent 以自动运行代理：

    ```bash
    cat > ~/Library/LaunchAgents/com.claude-max-api.plist << 'EOF'
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
      <key>Label</key>
      <string>com.claude-max-api</string>
      <key>RunAtLoad</key>
      <true/>
      <key>KeepAlive</key>
      <true/>
      <key>ProgramArguments</key>
      <array>
        <string>/usr/local/bin/node</string>
        <string>/usr/local/lib/node_modules/claude-max-api-proxy/dist/server/standalone.js</string>
      </array>
      <key>EnvironmentVariables</key>
      <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:~/.local/bin:/usr/bin:/bin</string>
      </dict>
    </dict>
    </plist>
    EOF

    launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.claude-max-api.plist
    ```

  </Accordion>
</AccordionGroup>

## 链接

- **npm：** [https://www.npmjs.com/package/claude-max-api-proxy](https://www.npmjs.com/package/claude-max-api-proxy)
- **GitHub：** [https://github.com/atalovesyou/claude-max-api-proxy](https://github.com/atalovesyou/claude-max-api-proxy)
- **问题反馈：** [https://github.com/atalovesyou/claude-max-api-proxy/issues](https://github.com/atalovesyou/claude-max-api-proxy/issues)

## 说明

- 这是一个**社区工具**，Anthropic 或 OpenClaw 均不提供官方支持
- 需要有效的 Claude Max/Pro 订阅，且 Claude Code CLI 已完成认证
- 代理在本地运行，不会将数据发送到任何第三方服务器
- 完全支持流式响应

<Note>
如需与 Claude CLI 或 API 密钥的原生 Anthropic 集成，请参见 [Anthropic 提供商](/providers/anthropic)。如需 OpenAI/Codex 订阅，请参见 [OpenAI 提供商](/providers/openai)。
</Note>

## 相关链接

<CardGroup cols={2}>
  <Card title="Anthropic 提供商" href="/providers/anthropic" icon="bolt">
    通过 Claude CLI 或 API 密钥的原生 OpenClaw 集成。
  </Card>
  <Card title="OpenAI 提供商" href="/providers/openai" icon="robot">
    适用于 OpenAI/Codex 订阅。
  </Card>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为概述。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>
