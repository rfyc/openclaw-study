---
summary: "管理沙箱运行时并检查有效的沙箱策略"
title: Sandbox CLI
read_when: "你在管理沙箱运行时或调试沙箱/工具策略行为时。"
status: active
---

管理用于隔离代理执行的沙箱运行时。

## 概述

OpenClaw 可以在隔离的沙箱运行时中运行代理以保证安全。`sandbox` 命令帮助你在更新或配置更改后检查和重建这些运行时。

目前通常意味着：

- Docker 沙箱容器
- `agents.defaults.sandbox.backend = "ssh"` 时的 SSH 沙箱运行时
- `agents.defaults.sandbox.backend = "openshell"` 时的 OpenShell 沙箱运行时

对于 `ssh` 和 OpenShell `remote`，重建比 Docker 更重要：

- 远程工作空间在初始种子后是规范的
- `openclaw sandbox recreate` 删除所选范围的规范远程工作空间
- 下次使用时从当前本地工作空间重新种子

## 命令

### `openclaw sandbox explain`

检查**有效的**沙箱模式/范围/工作空间访问、沙箱工具策略和提升的门控（以及修复配置键路径）。

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

列出所有沙箱运行时及其状态和配置。

```bash
openclaw sandbox list
openclaw sandbox list --browser  # 仅列出浏览器容器
openclaw sandbox list --json     # JSON 输出
```

**输出包括：**

- 运行时名称和状态
- 后端（`docker`、`openshell` 等）
- 配置标签以及是否与当前配置匹配
- 时间（自创建以来）
- 空闲时间（自上次使用以来）
- 关联的会话/代理

### `openclaw sandbox recreate`

删除沙箱运行时以强制使用更新的配置重新创建。

```bash
openclaw sandbox recreate --all                # 重建所有容器
openclaw sandbox recreate --session main       # 特定会话
openclaw sandbox recreate --agent mybot        # 特定代理
openclaw sandbox recreate --browser            # 仅浏览器容器
openclaw sandbox recreate --all --force        # 跳过确认
```

**选项：**

- `--all`：重建所有沙箱容器
- `--session <key>`：为特定会话重建容器
- `--agent <id>`：为特定代理重建容器
- `--browser`：仅重建浏览器容器
- `--force`：跳过确认提示

<Note>
运行时在下次使用代理时自动重建。
</Note>

## 使用场景

### 更新 Docker 镜像后

```bash
# 拉取新镜像
docker pull openclaw-sandbox:latest
docker tag openclaw-sandbox:latest openclaw-sandbox:bookworm-slim

# 更新配置以使用新镜像
# 编辑配置：agents.defaults.sandbox.docker.image（或 agents.list[].sandbox.docker.image）

# 重建容器
openclaw sandbox recreate --all
```

### 更改沙箱配置后

```bash
# 编辑配置：agents.defaults.sandbox.*（或 agents.list[].sandbox.*）

# 重建以应用新配置
openclaw sandbox recreate --all
```

### 更改 SSH 目标或 SSH 认证材料后

```bash
# 编辑配置：
# - agents.defaults.sandbox.backend
# - agents.defaults.sandbox.ssh.target
# - agents.defaults.sandbox.ssh.workspaceRoot
# - agents.defaults.sandbox.ssh.identityFile / certificateFile / knownHostsFile
# - agents.defaults.sandbox.ssh.identityData / certificateData / knownHostsData

openclaw sandbox recreate --all
```

对于核心 `ssh` 后端，重建会删除 SSH 目标上的每范围远程工作空间根。下次运行时从本地工作空间重新种子。

### 更改 OpenShell 来源、策略或模式后

```bash
# 编辑配置：
# - agents.defaults.sandbox.backend
# - plugins.entries.openshell.config.from
# - plugins.entries.openshell.config.mode
# - plugins.entries.openshell.config.policy

openclaw sandbox recreate --all
```

对于 OpenShell `remote` 模式，重建会删除该范围的规范远程工作空间。下次运行时从本地工作空间重新种子。

### 更改 setupCommand 后

```bash
openclaw sandbox recreate --all
# 或仅一个代理：
openclaw sandbox recreate --agent family
```

### 仅针对特定代理

```bash
# 仅更新一个代理的容器
openclaw sandbox recreate --agent alfred
```

## 为什么需要这样做

当你更新沙箱配置时：

- 现有运行时继续以旧设置运行。
- 运行时仅在 24 小时不活动后被清除。
- 定期使用的代理无限期保持旧运行时处于活跃状态。

使用 `openclaw sandbox recreate` 强制删除旧运行时。当需要时，它们会自动以当前设置重新创建。

<Tip>
优先使用 `openclaw sandbox recreate` 而不是手动后端特定清理。它使用 Gateway 的运行时注册表，并在范围或会话键更改时避免不匹配。
</Tip>

## 注册表迁移

OpenClaw 将沙箱运行时元数据存储为沙箱状态目录下每个容器/浏览器条目的一个 JSON 分片。旧版安装可能仍然有整体遗留文件：

- `~/.openclaw/sandbox/containers.json`
- `~/.openclaw/sandbox/browsers.json`

定期的沙箱运行时读取不会重写这些文件。运行 `openclaw doctor --fix` 将有效的遗留条目迁移到分片注册表目录。无效的遗留文件被隔离，以防一个损坏的旧注册表隐藏当前的运行时条目。

## 配置

沙箱设置位于 `~/.openclaw/openclaw.json` 下的 `agents.defaults.sandbox`（每代理覆盖在 `agents.list[].sandbox` 中）：

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // off, non-main, all
        "backend": "docker", // docker, ssh, openshell
        "scope": "agent", // session, agent, shared
        "docker": {
          "image": "openclaw-sandbox:bookworm-slim",
          "containerPrefix": "openclaw-sbx-",
          // ... 更多 Docker 选项
        },
        "prune": {
          "idleHours": 24, // 24 小时空闲后自动清除
          "maxAgeDays": 7, // 7 天后自动清除
        },
      },
    },
  },
}
```

## 相关

- [CLI 参考](/cli)
- [沙箱化](/gateway/sandboxing)
- [代理工作空间](/concepts/agent-workspace)
- [Doctor](/gateway/doctor)：检查沙箱设置。
