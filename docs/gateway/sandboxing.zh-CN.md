---
summary: "OpenClaw 沙盒工作原理：模式、范围、工作区访问和镜像"
title: "沙盒"
sidebarTitle: "沙盒"
read_when: "你想要沙盒的专门说明或需要调整 agents.defaults.sandbox。"
status: active
---

OpenClaw 可以在**沙盒后端内运行工具**以减少爆炸半径。这是**可选的**，由配置控制（`agents.defaults.sandbox` 或 `agents.list[].sandbox`）。如果沙盒关闭，工具在主机上运行。网关保持在主机上；启用时工具执行在隔离的沙盒中运行。

<Note>
这不是完美的安全边界，但当模型做了蠢事时，它实质上限制了文件系统和进程访问。
</Note>

## 什么被沙盒化

- 工具执行（`exec`、`read`、`write`、`edit`、`apply_patch`、`process` 等）。
- 可选的沙盒浏览器（`agents.defaults.sandbox.browser`）。

<AccordionGroup>
  <Accordion title="沙盒浏览器详情">
    - 默认情况下，当浏览器工具需要时，沙盒浏览器自动启动（确保 CDP 可达）。通过 `agents.defaults.sandbox.browser.autoStart` 和 `agents.defaults.sandbox.browser.autoStartTimeoutMs` 配置。
    - 默认情况下，沙盒浏览器容器使用专用 Docker 网络（`openclaw-sandbox-browser`）而不是全局 `bridge` 网络。使用 `agents.defaults.sandbox.browser.network` 配置。
    - 可选的 `agents.defaults.sandbox.browser.cdpSourceRange` 使用 CIDR 允许列表（例如 `172.21.0.1/32`）限制容器边缘的 CDP 入口。
    - noVNC 观察器访问默认受密码保护；OpenClaw 发出一个短期令牌 URL，提供本地引导页面并在 URL 片段中包含密码打开 noVNC（不在查询/标头日志中）。
    - `agents.defaults.sandbox.browser.allowHostControl` 允许沙盒会话明确针对主机浏览器。
    - 可选的允许列表控制 `target: "custom"`：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。

  </Accordion>
</AccordionGroup>

不沙盒化：

- 网关进程本身。
- 任何明确允许在沙盒外运行的工具（例如 `tools.elevated`）。
  - **提升的 exec 绕过沙盒化并使用配置的逃逸路径（默认为 `gateway`，或当 exec 目标为 `node` 时为 `node`）。**
  - 如果沙盒关闭，`tools.elevated` 不更改执行（已在主机上）。参见[提升模式](/tools/elevated)。

## 模式

`agents.defaults.sandbox.mode` 控制**何时**使用沙盒：

<Tabs>
  <Tab title="off">
    无沙盒化。
  </Tab>
  <Tab title="non-main">
    仅沙盒化**非主**会话（如果你想在主机上进行正常聊天，这是默认值）。

    `"non-main"` 基于 `session.mainKey`（默认 `"main"`），而不是代理 id。群组/渠道会话使用它们自己的键，所以它们算作非主会话并将被沙盒化。

  </Tab>
  <Tab title="all">
    每个会话都在沙盒中运行。
  </Tab>
</Tabs>

## 范围

`agents.defaults.sandbox.scope` 控制创建**多少个容器**：

- `"agent"`（默认）：每个代理一个容器。
- `"session"`：每个会话一个容器。
- `"shared"`：所有沙盒会话共享一个容器。

## 后端

`agents.defaults.sandbox.backend` 控制沙盒由**哪个运行时**提供：

- `"docker"`（启用沙盒时默认）：本地 Docker 支持的沙盒运行时。
- `"ssh"`：通用 SSH 支持的远程沙盒运行时。
- `"openshell"`：OpenShell 支持的沙盒运行时。

SSH 特定配置位于 `agents.defaults.sandbox.ssh` 下。OpenShell 特定配置位于 `plugins.entries.openshell.config` 下。

### 选择后端

|                | Docker                       | SSH                   | OpenShell                    |
| -------------- | ---------------------------- | --------------------- | ---------------------------- |
| **运行位置**   | 本地容器                     | 任何 SSH 可访问的主机 | OpenShell 托管沙盒           |
| **设置**       | `scripts/sandbox-setup.sh`   | SSH 密钥 + 目标主机   | 启用 OpenShell 插件          |
| **工作区模型** | 绑定挂载或复制               | 远程规范（一次填充）  | `mirror` 或 `remote`         |
| **网络控制**   | `docker.network`（默认：无） | 取决于远程主机        | 取决于 OpenShell             |
| **浏览器沙盒** | 支持                         | 不支持                | 尚不支持                     |
| **绑定挂载**   | `docker.binds`               | 不适用                | 不适用                       |
| **最适合**     | 本地开发、完全隔离           | 卸载到远程机器        | 带可选双向同步的托管远程沙盒 |

### Docker 后端

沙盒默认关闭。如果你启用沙盒且不选择后端，OpenClaw 使用 Docker 后端。它通过 Docker 守护进程套接字（`/var/run/docker.sock`）在本地执行工具和沙盒浏览器。沙盒容器隔离由 Docker 命名空间决定。

要向 Docker 沙盒暴露主机 GPU，设置 `agents.defaults.sandbox.docker.gpus` 或每代理 `agents.list[].sandbox.docker.gpus` 覆盖。该值作为单独参数传递给 Docker 的 `--gpus` 标志，例如 `"all"` 或 `"device=GPU-uuid"`，需要兼容的主机运行时，如 NVIDIA Container Toolkit。

<Warning>
**Docker-out-of-Docker（DooD）约束**

如果你将 OpenClaw 网关本身部署为 Docker 容器，它使用主机的 Docker 套接字（DooD）编排兄弟沙盒容器。这引入了特定的路径映射约束：

- **配置需要主机路径**：`openclaw.json` `workspace` 配置必须包含**主机的绝对路径**（例如 `/home/user/.openclaw/workspaces`），而不是内部网关容器路径。当 OpenClaw 要求 Docker 守护进程生成沙盒时，守护进程相对于主机操作系统命名空间评估路径，而不是网关命名空间。
- **FS 桥接奇偶性（相同的卷映射）**：OpenClaw 网关原生进程也将心跳和桥接文件写入 `workspace` 目录。由于网关在其自己的容器化环境中评估完全相同的字符串（主机路径），网关部署必须包含原生链接主机命名空间的相同卷映射（`-v /home/user/.openclaw:/home/user/.openclaw`）。

如果你在没有绝对主机奇偶性的情况下在内部映射路径，OpenClaw 原生地抛出 `EACCES` 权限错误，因为在容器环境中尝试写入心跳时完全限定的路径字符串不存在。
</Warning>

### SSH 后端

当你想要 OpenClaw 在任意 SSH 可访问的机器上沙盒化 `exec`、文件工具和媒体读取时，使用 `backend: "ssh"`。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        scope: "session",
        workspaceAccess: "rw",
        ssh: {
          target: "user@gateway-host:22",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // 或使用 SecretRefs / 内联内容而不是本地文件：
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="工作原理">
    - OpenClaw 在 `sandbox.ssh.workspaceRoot` 下创建每范围的远程根。
    - 在创建或重新创建后首次使用时，OpenClaw 从本地工作区一次性填充远程工作区。
    - 之后，`exec`、`read`、`write`、`edit`、`apply_patch`、提示时媒体读取和入站媒体暂存通过 SSH 直接针对远程工作区运行。
    - OpenClaw 不自动将远程更改同步回本地工作区。

  </Accordion>
  <Accordion title="认证材料">
    - `identityFile`、`certificateFile`、`knownHostsFile`：使用现有的本地文件并通过 OpenSSH 配置传递它们。
    - `identityData`、`certificateData`、`knownHostsData`：使用内联字符串或 SecretRefs。OpenClaw 通过正常的密钥运行时快照解析它们，以 `0600` 写入临时文件，并在 SSH 会话结束时删除它们。
    - 如果同一项的 `*File` 和 `*Data` 都设置了，该 SSH 会话的 `*Data` 优先。

  </Accordion>
  <Accordion title="远程规范的后果">
    这是**远程规范**模型。初始填充后，远程 SSH 工作区成为真实的沙盒状态。

    - 填充步骤后在 OpenClaw 外部的主机上进行的本地编辑在重新创建沙盒之前不会远程可见。
    - `openclaw sandbox recreate` 删除每范围的远程根，并在下次使用时从本地重新填充。
    - SSH 后端不支持浏览器沙盒。
    - `sandbox.docker.*` 设置不适用于 SSH 后端。

  </Accordion>
</AccordionGroup>

### OpenShell 后端

当你想要 OpenClaw 在 OpenShell 管理的远程环境中沙盒化工具时，使用 `backend: "openshell"`。有关完整的设置指南、配置参考和工作区模式比较，请参阅专用的 [OpenShell 页面](/gateway/openshell)。

OpenShell 重用与通用 SSH 后端相同的核心 SSH 传输和远程文件系统桥接，并添加了 OpenShell 特定的生命周期（`sandbox create/get/delete`、`sandbox ssh-config`）以及可选的 `mirror` 工作区模式。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "session",
        workspaceAccess: "rw",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote", // mirror | remote
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
        },
      },
    },
  },
}
```

OpenShell 模式：

- `mirror`（默认）：本地工作区保持规范。OpenClaw 在 exec 之前将本地文件同步到 OpenShell，并在 exec 之后将远程工作区同步回来。
- `remote`：创建沙盒后 OpenShell 工作区是规范的。OpenClaw 从本地工作区一次性填充远程工作区，然后文件工具和 exec 直接针对远程沙盒运行，不将更改同步回来。

<AccordionGroup>
  <Accordion title="远程传输详情">
    - OpenClaw 通过 `openshell sandbox ssh-config <name>` 向 OpenShell 请求沙盒特定的 SSH 配置。
    - 核心将该 SSH 配置写入临时文件，打开 SSH 会话，并重用与 `backend: "ssh"` 相同的远程文件系统桥接。
    - 在 `mirror` 模式下，只有生命周期不同：exec 前将本地同步到远程，然后在 exec 后同步回来。

  </Accordion>
  <Accordion title="当前 OpenShell 限制">
    - 尚不支持沙盒浏览器
    - OpenShell 后端不支持 `sandbox.docker.binds`
    - `sandbox.docker.*` 下的 Docker 特定运行时旋钮仍然只适用于 Docker 后端

  </Accordion>
</AccordionGroup>

#### 工作区模式

OpenShell 有两种工作区模型。这在实践中最重要。

<Tabs>
  <Tab title="mirror（本地规范）">
    当你想要**本地工作区保持规范**时，使用 `plugins.entries.openshell.config.mode: "mirror"`。

    行为：

    - 在 `exec` 之前，OpenClaw 将本地工作区同步到 OpenShell 沙盒。
    - 在 `exec` 之后，OpenClaw 将远程工作区同步回本地工作区。
    - 文件工具仍然通过沙盒桥接操作，但本地工作区在轮次之间保持为真实来源。

    在以下情况使用：

    - 你在 OpenClaw 外部本地编辑文件，并希望这些更改自动出现在沙盒中
    - 你希望 OpenShell 沙盒的行为尽可能像 Docker 后端
    - 你希望主机工作区在每次 exec 轮次后反映沙盒写入

    权衡：exec 前后额外的同步成本。

  </Tab>
  <Tab title="remote（OpenShell 规范）">
    当你想要 **OpenShell 工作区成为规范**时，使用 `plugins.entries.openshell.config.mode: "remote"`。

    行为：

    - 当沙盒首次创建时，OpenClaw 从本地工作区一次性填充远程工作区。
    - 之后，`exec`、`read`、`write`、`edit` 和 `apply_patch` 直接针对远程 OpenShell 工作区操作。
    - OpenClaw exec 后**不**将远程更改同步回本地工作区。
    - 提示时媒体读取仍然有效，因为文件和媒体工具通过沙盒桥接读取，而不是假设本地主机路径。
    - 传输是 SSH 进入 `openshell sandbox ssh-config` 返回的 OpenShell 沙盒。

    重要后果：

    - 如果你在填充步骤后在 OpenClaw 外部的主机上编辑文件，远程沙盒将**不会**自动看到这些更改。
    - 如果重新创建沙盒，远程工作区再次从本地工作区填充。
    - 使用 `scope: "agent"` 或 `scope: "shared"` 时，该远程工作区以相同的范围共享。

    在以下情况使用：

    - 沙盒应主要存在于远程 OpenShell 端
    - 你想要更低的每轮次同步开销
    - 你不希望主机本地编辑悄悄覆盖远程沙盒状态

  </Tab>
</Tabs>

如果你将沙盒视为临时执行环境，选择 `mirror`。如果你将沙盒视为真实工作区，选择 `remote`。

#### OpenShell 生命周期

OpenShell 沙盒仍然通过正常的沙盒生命周期管理：

- `openclaw sandbox list` 显示 OpenShell 运行时以及 Docker 运行时
- `openclaw sandbox recreate` 删除当前运行时，让 OpenClaw 在下次使用时重新创建
- 清理逻辑也是后端感知的

对于 `remote` 模式，重新创建尤为重要：

- 重新创建删除该范围的规范远程工作区
- 下次使用时从本地工作区填充新的远程工作区

对于 `mirror` 模式，重新创建主要重置远程执行环境，因为本地工作区仍然是规范的。

## 工作区访问

`agents.defaults.sandbox.workspaceAccess` 控制**沙盒可以看到什么**：

<Tabs>
  <Tab title="none（默认）">
    工具看到 `~/.openclaw/sandboxes` 下的沙盒工作区。
  </Tab>
  <Tab title="ro">
    在 `/agent` 以只读方式挂载代理工作区（禁用 `write`/`edit`/`apply_patch`）。
  </Tab>
  <Tab title="rw">
    在 `/workspace` 以读/写方式挂载代理工作区。
  </Tab>
</Tabs>

使用 OpenShell 后端时：

- `mirror` 模式仍然使用本地工作区作为 exec 轮次之间的规范来源
- `remote` 模式在初始填充后使用远程 OpenShell 工作区作为规范来源
- `workspaceAccess: "ro"` 和 `"none"` 仍然以相同方式限制写入行为

入站媒体被复制到活跃的沙盒工作区（`media/inbound/*`）。

<Note>
**技能注意事项**：`read` 工具以沙盒为根。使用 `workspaceAccess: "none"` 时，OpenClaw 将符合条件的技能镜像到沙盒工作区（`.../skills`）以便可以读取。使用 `"rw"` 时，工作区技能可以从 `/workspace/skills` 读取。
</Note>

## 自定义绑定挂载

`agents.defaults.sandbox.docker.binds` 将额外的主机目录挂载到容器中。格式：`host:container:mode`（例如 `"/home/user/source:/source:rw"`）。

全局和每代理绑定**合并**（不替换）。在 `scope: "shared"` 下，忽略每代理绑定。

`agents.defaults.sandbox.browser.binds` 仅将额外的主机目录挂载到**沙盒浏览器**容器中。

- 设置时（包括 `[]`），它替换浏览器容器的 `agents.defaults.sandbox.docker.binds`。
- 省略时，浏览器容器回退到 `agents.defaults.sandbox.docker.binds`（向后兼容）。

示例（只读源 + 额外的数据目录）：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          binds: ["/home/user/source:/source:ro", "/var/data/myapp:/data:ro"],
        },
      },
    },
    list: [
      {
        id: "build",
        sandbox: {
          docker: {
            binds: ["/mnt/cache:/cache:rw"],
          },
        },
      },
    ],
  },
}
```

<Warning>
**绑定安全性**

- 绑定绕过沙盒文件系统：它们以你设置的模式（`:ro` 或 `:rw`）暴露主机路径。
- OpenClaw 阻止危险的绑定源（例如：`docker.sock`、`/etc`、`/proc`、`/sys`、`/dev` 以及会暴露它们的父挂载）。
- OpenClaw 还阻止常见的主目录凭据根，如 `~/.aws`、`~/.cargo`、`~/.config`、`~/.docker`、`~/.gnupg`、`~/.netrc`、`~/.npm` 和 `~/.ssh`。
- 绑定验证不仅仅是字符串匹配。OpenClaw 规范化源路径，然后通过最深现有祖先再次解析，然后重新检查阻止的路径和允许的根。
- 这意味着即使最终叶不存在，符号链接父目录逃逸仍然失败关闭。示例：如果 `run-link` 指向那里，`/workspace/run-link/new-file` 仍然解析为 `/var/run/...`。
- 允许的源根以相同方式规范化，因此符号链接解析之前看起来在允许列表内的路径仍然被拒绝为`在允许根之外`。
- 敏感挂载（密钥、SSH 密钥、服务凭据）应为 `:ro`，除非绝对必要。
- 如果你只需要对工作区的读取访问，结合使用 `workspaceAccess: "ro"`；绑定模式保持独立。
- 有关绑定如何与工具策略和提升的 exec 交互，参见[沙盒 vs 工具策略 vs 提升权限](/gateway/sandbox-vs-tool-policy-vs-elevated)。

</Warning>

## 镜像和设置

默认 Docker 镜像：`openclaw-sandbox:bookworm-slim`

<Note>
**源代码检出 vs npm 安装**

`scripts/sandbox-setup.sh`、`scripts/sandbox-common-setup.sh` 和 `scripts/sandbox-browser-setup.sh` 辅助脚本仅在从[源代码检出](https://github.com/openclaw/openclaw)运行时可用。它们不包含在 npm 包中。

如果你通过 `npm install -g openclaw` 安装了 OpenClaw，请改用下面显示的内联 `docker build` 命令。
</Note>

<Steps>
  <Step title="构建默认镜像">
    从源代码检出：

    ```bash
    scripts/sandbox-setup.sh
    ```

    从 npm 安装（不需要源代码检出）：

    ```bash
    docker build -t openclaw-sandbox:bookworm-slim - <<'DOCKERFILE'
    FROM debian:bookworm-slim
    ENV DEBIAN_FRONTEND=noninteractive
    RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git jq python3 ripgrep \
      && rm -rf /var/lib/apt/lists/*
    RUN useradd --create-home --shell /bin/bash sandbox
    USER sandbox
    WORKDIR /home/sandbox
    CMD ["sleep", "infinity"]
    DOCKERFILE
    ```

    默认镜像**不**包含 Node。如果技能需要 Node（或其他运行时），要么烘焙自定义镜像，要么通过 `sandbox.docker.setupCommand` 安装（需要网络出口 + 可写根 + root 用户）。

    当 `openclaw-sandbox:bookworm-slim` 缺失时，OpenClaw 不会悄悄替换为普通的 `debian:bookworm-slim`。针对默认镜像的沙盒运行会快速失败并给出构建指令，直到你构建它，因为捆绑的镜像携带用于沙盒写入/编辑助手的 `python3`。

  </Step>
  <Step title="可选：构建通用镜像">
    对于具有通用工具（例如 `curl`、`jq`、`nodejs`、`python3`、`git`）的更功能性沙盒镜像：

    从源代码检出：

    ```bash
    scripts/sandbox-common-setup.sh
    ```

    从 npm 安装，首先构建默认镜像（参见上文），然后使用仓库中的 [`scripts/docker/sandbox/Dockerfile.common`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.common) 在其上构建通用镜像。

    然后将 `agents.defaults.sandbox.docker.image` 设置为 `openclaw-sandbox-common:bookworm-slim`。

  </Step>
  <Step title="可选：构建沙盒浏览器镜像">
    从源代码检出：

    ```bash
    scripts/sandbox-browser-setup.sh
    ```

    从 npm 安装，使用仓库中的 [`scripts/docker/sandbox/Dockerfile.browser`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.browser) 构建。

  </Step>
</Steps>

默认情况下，Docker 沙盒容器以**无网络**运行。使用 `agents.defaults.sandbox.docker.network` 覆盖。

<AccordionGroup>
  <Accordion title="沙盒浏览器 Chromium 默认值">
    捆绑的沙盒浏览器镜像还为容器化工作负载应用了保守的 Chromium 启动默认值。当前容器默认值包括：

    - `--remote-debugging-address=127.0.0.1`
    - `--remote-debugging-port=<从 OPENCLAW_BROWSER_CDP_PORT 派生>`
    - `--user-data-dir=${HOME}/.chrome`
    - `--no-first-run`
    - `--no-default-browser-check`
    - `--disable-3d-apis`
    - `--disable-gpu`
    - `--disable-dev-shm-usage`
    - `--disable-background-networking`
    - `--disable-extensions`
    - `--disable-features=TranslateUI`
    - `--disable-breakpad`
    - `--disable-crash-reporter`
    - `--disable-software-rasterizer`
    - `--no-zygote`
    - `--metrics-recording-only`
    - `--renderer-process-limit=2`
    - 启用 `noSandbox` 时 `--no-sandbox`。
    - 三个图形加固标志（`--disable-3d-apis`、`--disable-software-rasterizer`、`--disable-gpu`）是可选的，当容器缺少 GPU 支持时很有用。如果你的工作负载需要 WebGL 或其他 3D/浏览器功能，设置 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
    - `--disable-extensions` 默认启用，可以使用 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 禁用以用于依赖扩展的流程。
    - `--renderer-process-limit=2` 由 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 保留 Chromium 的默认值。

    如果你需要不同的运行时配置文件，使用自定义浏览器镜像并提供你自己的入口点。对于本地（非容器）Chromium 配置文件，使用 `browser.extraArgs` 追加额外的启动标志。

  </Accordion>
  <Accordion title="网络安全默认值">
    - `network: "host"` 被阻止。
    - `network: "container:<id>"` 默认被阻止（命名空间连接绕过风险）。
    - 应急覆盖：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

  </Accordion>
</AccordionGroup>

Docker 安装和容器化网关在这里：[Docker](/install/docker)

对于 Docker 网关部署，`scripts/docker/setup.sh` 可以引导沙盒配置。设置 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以启用该路径。你可以使用 `OPENCLAW_DOCKER_SOCKET` 覆盖套接字位置。完整设置和环境参考：[Docker](/install/docker#agent-sandbox)。

## setupCommand（一次性容器设置）

`setupCommand` 在沙盒容器创建后**一次性**运行（不是每次运行都运行）。它通过 `sh -lc` 在容器内执行。

路径：

- 全局：`agents.defaults.sandbox.docker.setupCommand`
- 每代理：`agents.list[].sandbox.docker.setupCommand`

<AccordionGroup>
  <Accordion title="常见陷阱">
    - 默认 `docker.network` 是 `"none"`（没有出口），所以包安装会失败。
    - `docker.network: "container:<id>"` 需要 `dangerouslyAllowContainerNamespaceJoin: true`，仅限应急使用。
    - `readOnlyRoot: true` 阻止写入；设置 `readOnlyRoot: false` 或烘焙自定义镜像。
    - `user` 对于包安装必须是 root（省略 `user` 或设置 `user: "0:0"`）。
    - 沙盒 exec **不**继承主机 `process.env`。使用 `agents.defaults.sandbox.docker.env`（或自定义镜像）用于技能 API 密钥。

  </Accordion>
</AccordionGroup>

## 工具策略和逃生舱口

工具允许/拒绝策略在沙盒规则之前仍然适用。如果工具被全局或每代理拒绝，沙盒不会带回它。

`tools.elevated` 是一个明确的逃生舱口，在沙盒外运行 `exec`（默认为 `gateway`，或当 exec 目标为 `node` 时为 `node`）。`/exec` 指令只对授权发送者适用并按会话持久化；要硬禁用 `exec`，使用工具策略拒绝（参见[沙盒 vs 工具策略 vs 提升权限](/gateway/sandbox-vs-tool-policy-vs-elevated)）。

调试：

- 使用 `openclaw sandbox explain` 检查有效的沙盒模式、工具策略和修复配置键。
- 有关"为什么这被阻止？"的心理模型，参见[沙盒 vs 工具策略 vs 提升权限](/gateway/sandbox-vs-tool-policy-vs-elevated)。

保持它锁定。

## 多代理覆盖

每个代理可以覆盖沙盒 + 工具：`agents.list[].sandbox` 和 `agents.list[].tools`（以及 `agents.list[].tools.sandbox.tools` 用于沙盒工具策略）。有关优先级，参见[多代理沙盒和工具](/tools/multi-agent-sandbox-tools)。

## 最小启用示例

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none",
      },
    },
  },
}
```

## 相关链接

- [多代理沙盒和工具](/tools/multi-agent-sandbox-tools) — 每代理覆盖和优先级
- [OpenShell](/gateway/openshell) — 托管沙盒后端设置、工作区模式和配置参考
- [沙盒配置](/gateway/config-agents#agentsdefaultssandbox)
- [沙盒 vs 工具策略 vs 提升权限](/gateway/sandbox-vs-tool-policy-vs-elevated) — 调试"为什么这被阻止？"
- [安全](/gateway/security)
