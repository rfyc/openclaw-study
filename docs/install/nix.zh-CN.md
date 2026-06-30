---
summary: "使用 Nix 声明式安装 OpenClaw"
read_when:
  - 您希望可重现、可回滚的安装
  - 您已经在使用 Nix/NixOS/Home Manager
  - 您希望所有内容都被固定并以声明方式管理
title: "Nix"
---

使用 **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** 声明式安装 OpenClaw——一个功能齐全的 Home Manager 模块。

<Info>
[nix-openclaw](https://github.com/openclaw/nix-openclaw) 仓库是 Nix 安装的权威来源。本页面是快速概述。
</Info>

## 您将获得的内容

- Gateway + macOS 应用 + 工具（whisper、spotify、cameras）-- 全部固定
- 在重启后仍然存在的 launchd 服务
- 具有声明式配置的插件系统
- 即时回滚：`home-manager switch --rollback`

## 快速开始

<Steps>
  <Step title="安装 Determinate Nix">
    如果尚未安装 Nix，请按照 [Determinate Nix 安装程序](https://github.com/DeterminateSystems/nix-installer) 的说明进行操作。
  </Step>
  <Step title="创建本地 flake">
    使用 nix-openclaw 仓库中的代理优先模板：
    ```bash
    mkdir -p ~/code/openclaw-local
    # 从 nix-openclaw 仓库复制 templates/agent-first/flake.nix
    ```
  </Step>
  <Step title="配置密钥">
    设置您的消息机器人令牌和模型提供商 API 密钥。`~/.secrets/` 中的普通文件即可。
  </Step>
  <Step title="填写模板占位符并切换">
    ```bash
    home-manager switch
    ```
  </Step>
  <Step title="验证">
    确认 launchd 服务正在运行，您的机器人响应消息。
  </Step>
</Steps>

完整的模块选项和示例，请参见 [nix-openclaw README](https://github.com/openclaw/nix-openclaw)。

## Nix 模式运行时行为

当设置 `OPENCLAW_NIX_MODE=1` 时（使用 nix-openclaw 自动设置），OpenClaw 进入禁用自动安装流程的确定性模式。

您也可以手动设置：

```bash
export OPENCLAW_NIX_MODE=1
```

在 macOS 上，GUI 应用不会自动继承 shell 环境变量。通过 defaults 启用 Nix 模式：

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### Nix 模式中的变化

- 自动安装和自我修改流程被禁用
- 缺少依赖项会显示 Nix 特定的修复消息
- UI 显示只读 Nix 模式横幅

### 配置和状态路径

OpenClaw 从 `OPENCLAW_CONFIG_PATH` 读取 JSON5 配置，并将可变数据存储在 `OPENCLAW_STATE_DIR` 中。在 Nix 下运行时，明确设置这些到 Nix 管理的位置，以便运行时状态和配置远离不可变存储。

| 变量                   | 默认值                                  |
| ---------------------- | --------------------------------------- |
| `OPENCLAW_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `OPENCLAW_STATE_DIR`   | `~/.openclaw`                           |
| `OPENCLAW_CONFIG_PATH` | `$OPENCLAW_STATE_DIR/openclaw.json`     |

### 服务 PATH 发现

launchd/systemd 网关服务自动发现 Nix 配置文件中的二进制文件，使
插件和工具在调用 `nix` 安装的可执行文件时无需手动设置 PATH：

- 当设置 `NIX_PROFILES` 时，每个条目按从右到左的优先级添加到服务 PATH（与 Nix shell 优先级匹配——最右侧优先）。
- 当未设置 `NIX_PROFILES` 时，`~/.nix-profile/bin` 作为回退被添加。

这适用于 macOS launchd 和 Linux systemd 服务环境。

## 相关

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) -- 完整设置指南
- [向导](/start/wizard) -- 非 Nix CLI 设置
- [Docker](/install/docker) -- 容器化设置
