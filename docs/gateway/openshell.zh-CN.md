---
summary: "使用 OpenShell 作为 OpenClaw 代理的托管沙盒后端"
title: OpenShell
read_when:
  - 你想要云托管沙盒而不是本地 Docker
  - 你正在设置 OpenShell 插件
  - 你需要在镜像和远程工作区模式之间选择
---

OpenShell 是 OpenClaw 的托管沙盒后端。OpenClaw 将沙盒生命周期委托给 `openshell` CLI，而不是在本地运行 Docker 容器，该 CLI 通过基于 SSH 的命令执行提供远程环境。

OpenShell 插件重用与通用 [SSH 后端](/gateway/sandboxing#ssh-backend) 相同的核心 SSH 传输和远程文件系统桥接。它添加了 OpenShell 特定的生命周期（`sandbox create/get/delete`、`sandbox ssh-config`）和可选的 `mirror` 工作区模式。

## 前提条件

- `openshell` CLI 已安装并在 `PATH` 上（或通过 `plugins.entries.openshell.config.command` 设置自定义路径）
- 具有沙盒访问权限的 OpenShell 账户
- 在主机上运行的 OpenClaw 网关

## 快速入门

1. 启用插件并设置沙盒后端：

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
          mode: "remote",
        },
      },
    },
  },
}
```

2. 重启网关。在下一个代理轮次，OpenClaw 创建一个 OpenShell 沙盒并通过它路由工具执行。

3. 验证：

```bash
openclaw sandbox list
openclaw sandbox explain
```

## 工作区模式

这是使用 OpenShell 时最重要的决定。

### `mirror`

当你想要**本地工作区保持规范**时，使用 `plugins.entries.openshell.config.mode: "mirror"`。

行为：

- 在 `exec` 之前，OpenClaw 将本地工作区同步到 OpenShell 沙盒。
- 在 `exec` 之后，OpenClaw 将远程工作区同步回本地工作区。
- 文件工具仍然通过沙盒桥接操作，但本地工作区在轮次之间保持为真实来源。

最适合：

- 你在 OpenClaw 外部本地编辑文件，并希望这些更改在沙盒中自动可见。
- 你希望 OpenShell 沙盒的行为尽可能像 Docker 后端。
- 你希望主机工作区在每次 exec 轮次后反映沙盒写入。

权衡：每次 exec 前后额外的同步成本。

### `remote`

当你想要 **OpenShell 工作区成为规范**时，使用 `plugins.entries.openshell.config.mode: "remote"`。

行为：

- 当沙盒首次创建时，OpenClaw 从本地工作区一次性填充远程工作区。
- 之后，`exec`、`read`、`write`、`edit` 和 `apply_patch` 直接针对远程 OpenShell 工作区操作。
- OpenClaw **不**将远程更改同步回本地工作区。
- 提示时媒体读取仍然有效，因为文件和媒体工具通过沙盒桥接读取。

最适合：

- 沙盒应主要存在于远程端。
- 你想要更低的每轮次同步开销。
- 你不希望主机本地编辑悄悄覆盖远程沙盒状态。

<Warning>
如果你在初始填充后在 OpenClaw 外部的主机上编辑文件，远程沙盒**不会**看到这些更改。使用 `openclaw sandbox recreate` 重新填充。
</Warning>

### 选择模式

|                    | `mirror`            | `remote`             |
| ------------------ | ------------------- | -------------------- |
| **规范工作区**     | 本地主机            | 远程 OpenShell       |
| **同步方向**       | 双向（每次 exec）   | 一次性填充           |
| **每轮次开销**     | 较高（上传 + 下载） | 较低（直接远程操作） |
| **本地编辑可见？** | 是，下一次 exec 时  | 不，直到重新创建     |
| **最适合**         | 开发工作流          | 长期运行代理、CI     |

## 配置参考

所有 OpenShell 配置位于 `plugins.entries.openshell.config` 下：

| 键                        | 类型                     | 默认值        | 描述                                           |
| ------------------------- | ------------------------ | ------------- | ---------------------------------------------- |
| `mode`                    | `"mirror"` 或 `"remote"` | `"mirror"`    | 工作区同步模式                                 |
| `command`                 | `string`                 | `"openshell"` | `openshell` CLI 的路径或名称                   |
| `from`                    | `string`                 | `"openclaw"`  | 首次创建的沙盒来源                             |
| `gateway`                 | `string`                 | —             | OpenShell 网关名称（`--gateway`）              |
| `gatewayEndpoint`         | `string`                 | —             | OpenShell 网关端点 URL（`--gateway-endpoint`） |
| `policy`                  | `string`                 | —             | 用于沙盒创建的 OpenShell 策略 ID               |
| `providers`               | `string[]`               | `[]`          | 创建沙盒时附加的提供商名称                     |
| `gpu`                     | `boolean`                | `false`       | 请求 GPU 资源                                  |
| `autoProviders`           | `boolean`                | `true`        | 沙盒创建期间传递 `--auto-providers`            |
| `remoteWorkspaceDir`      | `string`                 | `"/sandbox"`  | 沙盒内主要可写工作区                           |
| `remoteAgentWorkspaceDir` | `string`                 | `"/agent"`    | 代理工作区挂载路径（用于只读访问）             |
| `timeoutSeconds`          | `number`                 | `120`         | `openshell` CLI 操作的超时时间                 |

沙盒级设置（`mode`、`scope`、`workspaceAccess`）在 `agents.defaults.sandbox` 下配置，与任何后端相同。请参阅[沙盒](/gateway/sandboxing)了解完整矩阵。

## 示例

### 最小远程设置

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
        },
      },
    },
  },
}
```

### 带 GPU 的镜像模式

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "agent",
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
          mode: "mirror",
          gpu: true,
          providers: ["openai"],
          timeoutSeconds: 180,
        },
      },
    },
  },
}
```

### 使用自定义网关的每代理 OpenShell

```json5
{
  agents: {
    defaults: {
      sandbox: { mode: "off" },
    },
    list: [
      {
        id: "researcher",
        sandbox: {
          mode: "all",
          backend: "openshell",
          scope: "agent",
          workspaceAccess: "rw",
        },
      },
    ],
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
          gateway: "lab",
          gatewayEndpoint: "https://lab.example",
          policy: "strict",
        },
      },
    },
  },
}
```

## 生命周期管理

OpenShell 沙盒通过正常的沙盒 CLI 管理：

```bash
# 列出所有沙盒运行时（Docker + OpenShell）
openclaw sandbox list

# 检查有效策略
openclaw sandbox explain

# 重新创建（删除远程工作区，下次使用时重新填充）
openclaw sandbox recreate --all
```

对于 `remote` 模式，**重新创建尤为重要**：它删除该范围的规范远程工作区。下次使用时从本地工作区填充新的远程工作区。

对于 `mirror` 模式，重新创建主要重置远程执行环境，因为本地工作区仍然是规范的。

### 何时重新创建

在更改以下任何设置后重新创建：

- `agents.defaults.sandbox.backend`
- `plugins.entries.openshell.config.from`
- `plugins.entries.openshell.config.mode`
- `plugins.entries.openshell.config.policy`

```bash
openclaw sandbox recreate --all
```

## 安全加固

OpenShell 固定工作区根 fd 并在每次读取之前重新检查沙盒身份，因此符号链接交换或重新挂载的工作区无法将读取重定向到预期远程工作区之外。

## 当前限制

- 沙盒浏览器在 OpenShell 后端上不受支持。
- `sandbox.docker.binds` 不适用于 OpenShell。
- `sandbox.docker.*` 下的 Docker 特定运行时旋钮仅适用于 Docker 后端。

## 工作原理

1. OpenClaw 调用 `openshell sandbox create`（根据配置使用 `--from`、`--gateway`、`--policy`、`--providers`、`--gpu` 标志）。
2. OpenClaw 调用 `openshell sandbox ssh-config <name>` 获取沙盒的 SSH 连接详情。
3. 核心将 SSH 配置写入临时文件，并使用与通用 SSH 后端相同的远程文件系统桥接打开 SSH 会话。
4. 在 `mirror` 模式下：exec 前将本地同步到远程，运行，exec 后同步回来。
5. 在 `remote` 模式下：创建时一次性填充，然后直接对远程工作区操作。

## 相关链接

- [沙盒](/gateway/sandboxing) — 模式、范围和后端比较
- [沙盒 vs 工具策略 vs 提升权限](/gateway/sandbox-vs-tool-policy-vs-elevated) — 调试被阻止的工具
- [多代理沙盒和工具](/tools/multi-agent-sandbox-tools) — 每代理覆盖
- [沙盒 CLI](/cli/sandbox) — `openclaw sandbox` 命令
