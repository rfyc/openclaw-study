---
summary: "使用 Kustomize 将 OpenClaw Gateway 部署到 Kubernetes 集群"
read_when:
  - 您想在 Kubernetes 集群上运行 OpenClaw
  - 您想在 Kubernetes 环境中测试 OpenClaw
title: "Kubernetes"
---

# Kubernetes 上的 OpenClaw

在 Kubernetes 上运行 OpenClaw 的最小起点——并非生产就绪的部署。它涵盖核心资源，旨在适应您的环境。

## 为什么不用 Helm？

OpenClaw 是一个具有一些配置文件的单容器。有趣的自定义在于代理内容（markdown 文件、技能、配置覆盖），而非基础设施模板。Kustomize 处理覆盖层而无需 Helm 图表的开销。如果您的部署变得更复杂，可以在这些清单之上叠加 Helm 图表。

## 您需要的东西

- 运行中的 Kubernetes 集群（AKS、EKS、GKE、k3s、kind、OpenShift 等）
- `kubectl` 已连接到您的集群
- 至少一个模型提供商的 API 密钥

## 快速开始

```bash
# 将 <PROVIDER> 替换为您的提供商：ANTHROPIC、GEMINI、OPENAI 或 OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh

kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

检索 Control UI 配置的共享密钥。此部署脚本默认创建令牌认证：

```bash
kubectl get secret openclaw-secrets -n openclaw -o jsonpath='{.data.OPENCLAW_GATEWAY_TOKEN}' | base64 -d
```

对于本地调试，`./scripts/k8s/deploy.sh --show-token` 在部署后打印令牌。

## 使用 Kind 进行本地测试

如果您没有集群，使用 [Kind](https://kind.sigs.k8s.io/) 在本地创建一个：

```bash
./scripts/k8s/create-kind.sh           # 自动检测 docker 或 podman
./scripts/k8s/create-kind.sh --delete  # 拆除
```

然后像往常一样使用 `./scripts/k8s/deploy.sh` 部署。

## 逐步操作

### 1) 部署

**选项 A** — 环境中的 API 密钥（一步）：

```bash
# 将 <PROVIDER> 替换为您的提供商：ANTHROPIC、GEMINI、OPENAI 或 OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh
```

脚本创建带有 API 密钥和自动生成网关令牌的 Kubernetes Secret，然后部署。如果 Secret 已存在，它保留当前网关令牌和任何未被更改的提供商密钥。

**选项 B** — 单独创建密钥：

```bash
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

如果想要令牌打印到标准输出用于本地测试，对两个命令都使用 `--show-token`。

### 2) 访问网关

```bash
kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

## 部署了什么

```
命名空间: openclaw（可通过 OPENCLAW_NAMESPACE 配置）
├── Deployment/openclaw        # 单个 pod，init 容器 + 网关
├── Service/openclaw           # 端口 18789 上的 ClusterIP
├── PersistentVolumeClaim      # 10Gi 用于代理状态和配置
├── ConfigMap/openclaw-config  # openclaw.json + AGENTS.md
└── Secret/openclaw-secrets    # 网关令牌 + API 密钥
```

## 自定义

### 代理指令

编辑 `scripts/k8s/manifests/configmap.yaml` 中的 `AGENTS.md` 并重新部署：

```bash
./scripts/k8s/deploy.sh
```

### 网关配置

编辑 `scripts/k8s/manifests/configmap.yaml` 中的 `openclaw.json`。完整参考请参见 [Gateway 配置](/gateway/configuration)。

### 添加提供商

导出额外密钥后重新运行：

```bash
export ANTHROPIC_API_KEY="..."
export OPENAI_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

除非您覆盖，否则现有提供商密钥保留在 Secret 中。

或直接修补 Secret：

```bash
kubectl patch secret openclaw-secrets -n openclaw \
  -p '{"stringData":{"<PROVIDER>_API_KEY":"..."}}'
kubectl rollout restart deployment/openclaw -n openclaw
```

### 自定义命名空间

```bash
OPENCLAW_NAMESPACE=my-namespace ./scripts/k8s/deploy.sh
```

### 自定义镜像

编辑 `scripts/k8s/manifests/deployment.yaml` 中的 `image` 字段：

```yaml
image: ghcr.io/openclaw/openclaw:latest # 或固定到 https://github.com/openclaw/openclaw/releases 中的特定版本
```

### 超出端口转发的暴露

默认清单将网关绑定到 pod 内的回环地址。这适用于 `kubectl port-forward`，但不适用于需要访问 pod IP 的 Kubernetes `Service` 或 Ingress 路径。

如果您想通过 Ingress 或负载均衡器暴露网关：

- 将 `scripts/k8s/manifests/configmap.yaml` 中的网关绑定从 `loopback` 更改为与您的部署模型匹配的非回环绑定
- 保持网关认证启用，并使用适当的 TLS 终止入口点
- 使用支持的 Web 安全模型配置 Control UI 以进行远程访问（例如，在需要时使用 HTTPS/Tailscale Serve 和明确允许的来源）

## 重新部署

```bash
./scripts/k8s/deploy.sh
```

这将应用所有清单并重启 pod 以接收任何配置或密钥更改。

## 拆除

```bash
./scripts/k8s/deploy.sh --delete
```

这将删除命名空间及其中的所有资源，包括 PVC。

## 架构注意事项

- 网关默认绑定到 pod 内的回环地址，因此包含的设置适用于 `kubectl port-forward`
- 无集群范围的资源——一切都在单个命名空间中
- 安全性：`readOnlyRootFilesystem`、`drop: ALL` 功能、非 root 用户（UID 1000）
- 默认配置将 Control UI 保持在更安全的本地访问路径：回环绑定加 `kubectl port-forward` 到 `http://127.0.0.1:18789`
- 如果您超越本地主机访问，使用支持的远程模型：HTTPS/Tailscale 加上适当的网关绑定和 Control UI 来源设置
- 密钥在临时目录中生成并直接应用到集群——没有密钥材料写入仓库检出

## 文件结构

```
scripts/k8s/
├── deploy.sh                   # 创建命名空间 + 密钥，通过 kustomize 部署
├── create-kind.sh              # 本地 Kind 集群（自动检测 docker/podman）
└── manifests/
    ├── kustomization.yaml      # Kustomize 基础
    ├── configmap.yaml          # openclaw.json + AGENTS.md
    ├── deployment.yaml         # 具有安全加固的 Pod 规格
    ├── pvc.yaml                # 10Gi 持久存储
    └── service.yaml            # 18789 上的 ClusterIP
```

## 相关

- [Docker](/install/docker)
- [Docker VM 运行时](/install/docker-vm-runtime)
- [安装概述](/install)
