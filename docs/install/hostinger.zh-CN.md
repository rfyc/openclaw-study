---
summary: "在 Hostinger 上托管 OpenClaw"
read_when:
  - 在 Hostinger 上设置 OpenClaw
  - 寻找 OpenClaw 的托管 VPS
  - 使用 Hostinger 一键 OpenClaw
title: "Hostinger"
---

通过**一键**托管部署或 **VPS** 安装，在 [Hostinger](https://www.hostinger.com/openclaw) 上运行持久的 OpenClaw Gateway。

## 前提条件

- Hostinger 账户（[注册](https://www.hostinger.com/openclaw)）
- 约 5-10 分钟

## 选项 A：一键 OpenClaw

最快的入门方式。Hostinger 处理基础设施、Docker 和自动更新。

<Steps>
  <Step title="购买并启动">
    1. 从 [Hostinger OpenClaw 页面](https://www.hostinger.com/openclaw)，选择托管 OpenClaw 计划并完成结账。

    <Note>
    在结账时，您可以选择**即用型 AI** 积分，这些积分已预购并立即集成在 OpenClaw 内——无需来自其他提供商的外部账户或 API 密钥。您可以立即开始聊天。或者，在设置时提供您自己的 Anthropic、OpenAI、Google Gemini 或 xAI 密钥。
    </Note>

  </Step>

  <Step title="选择消息频道">
    选择一个或多个要连接的频道：

    - **WhatsApp** -- 扫描设置向导中显示的 QR 码。
    - **Telegram** -- 粘贴来自 [BotFather](https://t.me/BotFather) 的机器人令牌。

  </Step>

  <Step title="完成安装">
    点击**完成**以部署实例。准备就绪后，从 hPanel 中的 **OpenClaw Overview** 访问 OpenClaw 仪表板。
  </Step>

</Steps>

## 选项 B：VPS 上的 OpenClaw

对服务器有更多控制权。Hostinger 通过 Docker 在您的 VPS 上部署 OpenClaw，您通过 hPanel 中的 **Docker Manager** 进行管理。

<Steps>
  <Step title="购买 VPS">
    1. 从 [Hostinger OpenClaw 页面](https://www.hostinger.com/openclaw)，选择 VPS 上的 OpenClaw 计划并完成结账。

    <Note>
    您可以在结账时选择**即用型 AI** 积分——这些积分已预购并立即集成在 OpenClaw 内，因此您无需任何外部账户或其他提供商的 API 密钥即可开始聊天。
    </Note>

  </Step>

  <Step title="配置 OpenClaw">
    VPS 配置好后，填写配置字段：

    - **网关令牌** -- 自动生成；保存以备后用。
    - **WhatsApp 号码** -- 您的带国家代码的号码（可选）。
    - **Telegram 机器人令牌** -- 来自 [BotFather](https://t.me/BotFather)（可选）。
    - **API 密钥** -- 仅在结账时未选择即用型 AI 积分时需要。

  </Step>

  <Step title="启动 OpenClaw">
    点击**部署**。运行后，点击 hPanel 中的 **Open** 打开 OpenClaw 仪表板。
  </Step>

</Steps>

日志、重启和更新直接从 hPanel 中的 Docker Manager 界面管理。要更新，请在 Docker Manager 中按**更新**，这将拉取最新镜像。

## 验证您的设置

在您连接的频道上向助手发送"Hi"。OpenClaw 会回复并引导您完成初始偏好设置。

## 故障排除

**仪表板无法加载** -- 等待几分钟让容器完成配置。检查 hPanel 中的 Docker Manager 日志。

**Docker 容器持续重启** -- 打开 Docker Manager 日志并查找配置错误（缺少令牌、无效 API 密钥）。

**Telegram 机器人不响应** -- 直接在您的 OpenClaw 聊天中作为消息发送您的配对码消息以完成连接。

## 后续步骤

- [频道](/channels) -- 连接 Telegram、WhatsApp、Discord 等
- [Gateway 配置](/gateway/configuration) -- 所有配置选项

## 相关

- [安装概述](/install)
- [VPS 托管](/vps)
- [DigitalOcean](/install/digitalocean)
