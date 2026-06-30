---
summary: "为 OpenClaw 安装和配置 Node.js——版本要求、安装选项和 PATH 故障排除"
title: "Node.js"
read_when:
  - "您需要在安装 OpenClaw 之前安装 Node.js"
  - "您已安装 OpenClaw，但 `openclaw` 命令找不到"
  - "npm install -g 因权限或 PATH 问题失败"
---

OpenClaw 需要 **Node 22.14 或更高版本**。**Node 24 是安装、CI 和发布工作流的默认推荐运行时**。Node 22 通过活跃的 LTS 系列仍然受支持。[安装脚本](/install#alternative-install-methods)将自动检测并安装 Node——当您想自己设置 Node 并确保一切正确连接（版本、PATH、全局安装）时，请参阅本页面。

## 检查您的版本

```bash
node -v
```

如果这打印 `v24.x.x` 或更高，您使用的是推荐的默认版本。如果打印 `v22.14.x` 或更高，您使用的是受支持的 Node 22 LTS 路径，但我们仍然建议在方便时升级到 Node 24。如果 Node 未安装或版本太旧，请在下面选择一种安装方法。

## 安装 Node

<Tabs>
  <Tab title="macOS">
    **Homebrew**（推荐）：

    ```bash
    brew install node
    ```

    或从 [nodejs.org](https://nodejs.org/) 下载 macOS 安装程序。

  </Tab>
  <Tab title="Linux">
    **Ubuntu / Debian：**

    ```bash
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

    **Fedora / RHEL：**

    ```bash
    sudo dnf install nodejs
    ```

    或使用版本管理器（见下文）。

  </Tab>
  <Tab title="Windows">
    **winget**（推荐）：

    ```powershell
    winget install OpenJS.NodeJS.LTS
    ```

    **Chocolatey：**

    ```powershell
    choco install nodejs-lts
    ```

    或从 [nodejs.org](https://nodejs.org/) 下载 Windows 安装程序。

  </Tab>
</Tabs>

<Accordion title="使用版本管理器（nvm、fnm、mise、asdf）">
  版本管理器让您可以轻松切换 Node 版本。流行的选项：

- [**fnm**](https://github.com/Schniz/fnm) — 快速、跨平台
- [**nvm**](https://github.com/nvm-sh/nvm) — 在 macOS/Linux 上广泛使用
- [**mise**](https://mise.jdx.dev/) — 多语言（Node、Python、Ruby 等）

fnm 示例：

```bash
fnm install 24
fnm use 24
```

  <Warning>
  确保您的版本管理器在 shell 启动文件（`~/.zshrc` 或 `~/.bashrc`）中初始化。如果没有，`openclaw` 在新终端会话中可能找不到，因为 PATH 不包含 Node 的 bin 目录。
  </Warning>
</Accordion>

## 故障排除

### `openclaw: command not found`

这几乎总是意味着 npm 的全局 bin 目录不在您的 PATH 中。

<Steps>
  <Step title="找到您的全局 npm 前缀">
    ```bash
    npm prefix -g
    ```
  </Step>
  <Step title="检查它是否在您的 PATH 中">
    ```bash
    echo "$PATH"
    ```

    在输出中查找 `<npm-prefix>/bin`（macOS/Linux）或 `<npm-prefix>`（Windows）。

  </Step>
  <Step title="将其添加到您的 shell 启动文件">
    <Tabs>
      <Tab title="macOS / Linux">
        添加到 `~/.zshrc` 或 `~/.bashrc`：

        ```bash
        export PATH="$(npm prefix -g)/bin:$PATH"
        ```

        然后打开新终端（或在 zsh 中运行 `rehash` / 在 bash 中运行 `hash -r`）。
      </Tab>
      <Tab title="Windows">
        通过设置 → 系统 → 环境变量，将 `npm prefix -g` 的输出添加到系统 PATH。
      </Tab>
    </Tabs>

  </Step>
</Steps>

### `npm install -g` 的权限错误（Linux）

如果您看到 `EACCES` 错误，将 npm 的全局前缀切换到用户可写目录：

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

将 `export PATH=...` 行添加到您的 `~/.bashrc` 或 `~/.zshrc` 以使其永久生效。

## 相关

- [安装概述](/install) — 所有安装方法
- [更新](/install/updating) — 保持 OpenClaw 最新
- [入门](/start/getting-started) — 安装后的第一步
