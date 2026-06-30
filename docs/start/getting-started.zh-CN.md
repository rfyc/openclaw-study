---
summary: "在几分钟内安装 OpenClaw 并进行第一次对话。"
read_when:
  - 第一次从零开始设置
  - 您想要最快速的方式开始使用
title: "入门"
---

安装 OpenClaw、运行入门向导，并与您的 AI 助手聊天——全程约 5 分钟。完成后，您将拥有一个正在运行的 Gateway、配置好的认证和一个可用的聊天会话。

## 所需条件

- **Node.js** — 推荐 Node 24（也支持 Node 22.14+）
- 来自模型提供商（Anthropic、OpenAI、Google 等）的 **API 密钥**——入门向导会提示您输入

<Tip>
使用 `node --version` 检查您的 Node 版本。
**Windows 用户：** 支持原生 Windows 和 WSL2。WSL2 更稳定，推荐用于完整体验。参见 [Windows](/platforms/windows)。
需要安装 Node？参见 [Node 设置](/install/node)。
</Tip>

## 快速设置

<Steps>
  <Step title="安装 OpenClaw">
    <Tabs>
      <Tab title="macOS / Linux">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
        <img
  src="/assets/install-script.svg"
  alt="安装脚本流程"
  className="rounded-lg"
/>
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>

    <Note>
    其他安装方式（Docker、Nix、npm）：[安装](/install)。
    </Note>

  </Step>
  <Step title="运行入门向导">
    ```bash
    openclaw onboard --install-daemon
    ```

    向导将引导您选择模型提供商、设置 API 密钥并配置 Gateway。大约需要 2 分钟。

    完整参考请参见[入门（CLI）](/start/wizard)。

  </Step>
  <Step title="验证 Gateway 是否正在运行">
    ```bash
    openclaw gateway status
    ```

    您应该看到 Gateway 正在监听端口 18789。

  </Step>
  <Step title="打开仪表盘">
    ```bash
    openclaw dashboard
    ```

    这将在您的浏览器中打开 Control UI。如果它加载成功，则一切正常。

  </Step>
  <Step title="发送您的第一条消息">
    在 Control UI 聊天中输入消息，您应该会收到 AI 回复。

    想从手机聊天？最快设置的渠道是 [Telegram](/channels/telegram)（只需一个机器人令牌）。参见[渠道](/channels)了解所有选项。

  </Step>
</Steps>

<Accordion title="高级：挂载自定义 Control UI 构建">
  如果您维护本地化或自定义的仪表盘构建，请将
  `gateway.controlUi.root` 指向包含您构建的静态资源和 `index.html` 的目录。

```bash
mkdir -p "$HOME/.openclaw/control-ui-custom"
# 将您构建的静态文件复制到该目录中。
```

然后设置：

```json
{
  "gateway": {
    "controlUi": {
      "enabled": true,
      "root": "$HOME/.openclaw/control-ui-custom"
    }
  }
}
```

重启 gateway 并重新打开仪表盘：

```bash
openclaw gateway restart
openclaw dashboard
```

</Accordion>

## 下一步

<Columns>
  <Card title="连接渠道" href="/channels" icon="message-square">
    Discord、Feishu、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo 等更多渠道。
  </Card>
  <Card title="配对和安全" href="/channels/pairing" icon="shield">
    控制谁可以向您的智能体发送消息。
  </Card>
  <Card title="配置 Gateway" href="/gateway/configuration" icon="settings">
    模型、工具、沙箱和高级设置。
  </Card>
  <Card title="浏览工具" href="/tools" icon="wrench">
    浏览器、exec、网络搜索、技能和插件。
  </Card>
</Columns>

<Accordion title="高级：环境变量">
  如果您以服务账户身份运行 OpenClaw 或希望自定义路径：

- `OPENCLAW_HOME` — 内部路径解析的主目录
- `OPENCLAW_STATE_DIR` — 覆盖状态目录
- `OPENCLAW_CONFIG_PATH` — 覆盖配置文件路径

完整参考：[环境变量](/help/environment)。
</Accordion>

## 相关

- [安装概述](/install)
- [渠道概述](/channels)
- [设置](/start/setup)
