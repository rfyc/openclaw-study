---
summary: "为工作区和身份文件播种的智能体引导仪式"
read_when:
  - 了解智能体首次运行时发生的情况
  - 解释引导文件的位置
  - 调试入门身份设置
title: "智能体引导"
sidebarTitle: "引导"
---

引导是**首次运行**仪式，用于准备智能体工作区并收集身份详情。它在入门之后、智能体首次启动时发生。

## 引导做了什么

在智能体首次运行时，OpenClaw 引导工作区（默认为 `~/.openclaw/workspace`）：

- 播种 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`。
- 运行简短的问答仪式（每次一个问题）。
- 将身份 + 偏好写入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成后删除 `BOOTSTRAP.md`，使其只运行一次。

对于嵌入式/本地模型运行，OpenClaw 将 `BOOTSTRAP.md` 置于特权系统上下文之外。在主要交互式首次运行时，它仍然在用户提示中传递文件内容，以便不能可靠调用 `read` 工具的模型能够完成仪式。如果当前运行无法安全访问工作区，智能体将获得有限的引导说明，而非通用的欢迎语。

## 跳过引导

要跳过预先播种工作区的引导，运行 `openclaw onboard --skip-bootstrap`。

## 运行位置

引导始终在 **gateway 宿主机**上运行。如果 macOS 应用连接到远程 Gateway，工作区和引导文件位于该远程机器上。

<Note>
当 Gateway 在另一台机器上运行时，请在 gateway 宿主机上编辑工作区文件（例如，`user@gateway-host:~/.openclaw/workspace`）。
</Note>

## 相关文档

- macOS 应用入门：[入门](/start/onboarding)
- 工作区布局：[智能体工作区](/concepts/agent-workspace)
