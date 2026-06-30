---
summary: "OpenClaw 的首次运行设置流程（macOS 应用）"
read_when:
  - 设计 macOS 入门助手
  - 实现认证或身份设置
title: "入门（macOS 应用）"
sidebarTitle: "入门：macOS 应用"
---

本文档描述了**当前**的首次运行设置流程。目标是流畅的"第 0 天"体验：选择 Gateway 运行位置、连接认证、运行向导，然后让智能体自行引导。
有关入门路径的一般概述，请参见[入门概述](/start/onboarding-overview)。

<Steps>
<Step title="批准 macOS 警告">
<Frame>
<img src="/assets/macos-onboarding/01-macos-warning.jpeg" alt="" />
</Frame>
</Step>
<Step title="批准查找本地网络">
<Frame>
<img src="/assets/macos-onboarding/02-local-networks.jpeg" alt="" />
</Frame>
</Step>
<Step title="欢迎和安全通知">
<Frame caption="阅读显示的安全通知并据此决定">
<img src="/assets/macos-onboarding/03-security-notice.png" alt="" />
</Frame>

安全信任模型：

- 默认情况下，OpenClaw 是个人智能体：一个受信任的运营商边界。
- 共享/多用户设置需要锁定（分离信任边界、保持工具访问最小化，并遵循[安全](/gateway/security)指南）。
- 本地入门现在默认将新配置设置为 `tools.profile: "coding"`，因此全新的本地设置可以保留文件系统/运行时工具，而无需强制使用不受限的 `full` 配置文件。
- 如果启用了 hooks/webhooks 或其他不受信任的内容源，请使用强大的现代模型层并保持严格的工具策略/沙箱。

</Step>
<Step title="本地 vs 远程">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

**Gateway** 在哪里运行？

- **此 Mac（仅本地）：** 入门可以在本地配置认证并写入凭据。
- **远程（通过 SSH/Tailnet）：** 入门**不**配置本地认证；凭据必须存在于 gateway 宿主机上。
- **稍后配置：** 跳过设置，保持应用未配置状态。

<Tip>
**Gateway 认证提示：**

- 即使对于回环，向导现在也会生成**令牌**，因此本地 WS 客户端必须进行认证。
- 如果您禁用认证，任何本地进程都可以连接；仅在完全受信任的机器上使用该选项。
- 对于多机访问或非回环绑定，使用**令牌**。

</Tip>
</Step>
<Step title="权限">
<Frame caption="选择您要授予 OpenClaw 的权限">
<img src="/assets/macos-onboarding/05-permissions.png" alt="" />
</Frame>

入门请求以下 TCC 权限：

- 自动化（AppleScript）
- 通知
- 辅助功能
- 屏幕录制
- 麦克风
- 语音识别
- 摄像头
- 位置

</Step>
<Step title="CLI">
  <Info>此步骤是可选的</Info>
  应用可以通过 npm、pnpm 或 bun 安装全局 `openclaw` CLI。
  它优先选择 npm，然后是 pnpm，如果 bun 是唯一检测到的包管理器则使用 bun。
  对于 Gateway 运行时，Node 仍然是推荐的路径。
</Step>
<Step title="入门聊天（专用会话）">
  设置完成后，应用会打开一个专用的入门聊天会话，让智能体可以自我介绍并指导后续步骤。这使首次运行指导与您的正常对话分开。有关 gateway 宿主机上首次智能体运行时发生的情况，请参见[引导](/start/bootstrapping)。
</Step>
</Steps>

## 相关

- [入门概述](/start/onboarding-overview)
- [入门](/start/getting-started)
