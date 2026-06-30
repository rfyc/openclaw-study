---
summary: "macOS 技能设置 UI 和网关支持的状态"
read_when:
  - 更新 macOS 技能设置 UI
  - 更改技能门控或安装行为
title: "技能（macOS）"
---

macOS 应用通过网关呈现 OpenClaw 技能；它不在本地解析技能。

## 数据来源

- `skills.status`（网关）返回所有技能及其资格和缺失要求
  （包括内置技能的允许列表阻止）。
- 要求来自每个 `SKILL.md` 中的 `metadata.openclaw.requires`。

## 安装操作

- `metadata.openclaw.install` 定义安装选项（brew/node/go/uv）。
- 应用调用 `skills.install` 在网关主机上运行安装程序。
- 内置的危险代码 `critical` 发现默认阻止 `skills.install`；可疑的发现仍然只警告。危险覆盖存在于网关请求上，但默认应用流程保持失败关闭。
- 如果每个安装选项都是 `download`，网关展示所有下载
  选项。
- 否则，网关使用当前安装偏好和主机二进制文件选择一个首选安装器：当
  `skills.install.preferBrew` 启用且 `brew` 存在时首先使用 Homebrew，然后 `uv`，然后
  来自 `skills.install.nodeManager` 的配置节点管理器，然后
  后续回退如 `go` 或 `download`。
- Node 安装标签反映配置的节点管理器，包括 `yarn`。

## 环境变量/API 密钥

- 应用在 `skills.entries.<skillKey>` 下将密钥存储在 `~/.openclaw/openclaw.json` 中。
- `skills.update` 修补 `enabled`、`apiKey` 和 `env`。

## 远程模式

- 安装 + 配置更新在网关主机上进行（不在本地 Mac 上）。

## 相关

- [技能](/tools/skills)
- [macOS 应用](/platforms/macos)
