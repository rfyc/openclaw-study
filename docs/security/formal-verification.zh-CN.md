---
summary: OpenClaw 最高风险路径的机器检查安全模型。
title: 形式化验证（安全模型）
read_when:
  - 审查形式化安全模型的保证或局限
  - 复现或更新 TLA+/TLC 安全模型检查
permalink: /security/formal-verification/
---

本页面跟踪 OpenClaw 的**形式化安全模型**（目前使用 TLA+/TLC；根据需要会添加更多）。

> 注意：某些旧链接可能引用了之前的项目名称。

**目标（北极星）：** 提供机器验证的论据，证明 OpenClaw 在明确的假设下执行其预期的安全策略（授权、会话隔离、工具门控和错误配置安全性）。

**当前状态：** 一个可执行的、攻击者驱动的**安全回归套件**：

- 每个声明都有一个在有限状态空间上可运行的模型检查。
- 许多声明都配有**负面模型**，可为现实漏洞类别生成反例跟踪。

**尚未实现（目前）：** "OpenClaw 在所有方面都安全"的证明，或完整 TypeScript 实现正确性的证明。

## 模型存放位置

模型维护在单独的仓库中：[vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models)。

## 重要注意事项

- 这些是**模型**，而非完整的 TypeScript 实现。模型与代码之间可能存在偏差。
- 结果受 TLC 探索的状态空间限制；"绿色"并不意味着超出建模假设和边界的安全性。
- 某些声明依赖于明确的环境假设（例如，正确的部署、正确的配置输入）。

## 复现结果

目前，通过在本地克隆模型仓库并运行 TLC 来复现结果（见下文）。未来迭代可能提供：

- 带有公共制品（反例跟踪、运行日志）的 CI 运行模型
- 用于小型有界检查的托管"运行此模型"工作流

入门：

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# 需要 Java 11+（TLC 在 JVM 上运行）。
# 仓库提供了固定版本的 `tla2tools.jar`（TLA+ 工具）以及 `bin/tlc` + Make 目标。

make <target>
```

### Gateway 暴露和开放 gateway 错误配置

**声明：** 在没有认证的情况下绑定到回环地址之外可能使远程攻陷成为可能 / 增加暴露面；token/password 可屏蔽未认证攻击者（根据模型假设）。

- 绿色运行：
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- 红色（预期）：
  - `make gateway-exposure-v2-negative`

另请参见模型仓库中的 `docs/gateway-exposure-matrix.md`。

### 节点执行管道（最高风险能力）

**声明：** `exec host=node` 需要 (a) 节点命令允许列表加上已声明的命令，以及 (b) 配置时的实时批准；批准经过令牌化以防止重放（在模型中）。

- 绿色运行：
  - `make nodes-pipeline`
  - `make approvals-token`
- 红色（预期）：
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### 配对存储（DM 门控）

**声明：** 配对请求遵守 TTL 和待处理请求上限。

- 绿色运行：
  - `make pairing`
  - `make pairing-cap`
- 红色（预期）：
  - `make pairing-negative`
  - `make pairing-cap-negative`

### 入口门控（提及 + 控制命令绕过）

**声明：** 在需要提及的群组上下文中，未经授权的"控制命令"无法绕过提及门控。

- 绿色：
  - `make ingress-gating`
- 红色（预期）：
  - `make ingress-gating-negative`

### 路由/会话键隔离

**声明：** 来自不同对等方的 DM 不会合并到同一会话中，除非明确链接/配置。

- 绿色：
  - `make routing-isolation`
- 红色（预期）：
  - `make routing-isolation-negative`

## v1++：额外的有界模型（并发、重试、跟踪正确性）

这些是后续模型，可以更精确地模拟真实世界故障模式（非原子更新、重试和消息扇出）。

### 配对存储并发 / 幂等性

**声明：** 配对存储应在交错执行下（即"检查然后写入"必须是原子/锁定的；刷新不应创建重复项）执行 `MaxPending` 和幂等性。

含义：

- 在并发请求下，不能超过一个渠道的 `MaxPending`。
- 同一 `(channel, sender)` 的重复请求/刷新不应创建重复的实时待处理行。

- 绿色运行：
  - `make pairing-race`（原子/锁定的上限检查）
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- 红色（预期）：
  - `make pairing-race-negative`（非原子开始/提交上限竞争）
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### 入口跟踪关联 / 幂等性

**声明：** 摄取应在扇出中保持跟踪关联，并在提供商重试下保持幂等性。

含义：

- 当一个外部事件变成多个内部消息时，每个部分都保留相同的跟踪/事件身份。
- 重试不会导致双重处理。
- 如果提供商事件 ID 缺失，去重回退到安全键（例如跟踪 ID）以避免丢弃不同事件。

- 绿色：
  - `make ingress-trace`
  - `make ingress-trace2`
  - `make ingress-idempotency`
  - `make ingress-dedupe-fallback`
- 红色（预期）：
  - `make ingress-trace-negative`
  - `make ingress-trace2-negative`
  - `make ingress-idempotency-negative`
  - `make ingress-dedupe-fallback-negative`

### 路由 dmScope 优先级 + identityLinks

**声明：** 路由必须默认保持 DM 会话隔离，仅在明确配置时才合并会话（渠道优先级 + 身份链接）。

含义：

- 特定渠道的 dmScope 覆盖必须优先于全局默认值。
- identityLinks 只应在明确的链接组内合并，而不是跨不相关的对等方。

- 绿色：
  - `make routing-precedence`
  - `make routing-identitylinks`
- 红色（预期）：
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`

## 相关

- [威胁模型](/security/THREAT-MODEL-ATLAS)
- [为威胁模型贡献内容](/security/CONTRIBUTING-THREAT-MODEL)
