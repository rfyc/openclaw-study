---
summary: "网关客户端的操作员角色、范围和审批时检查"
read_when:
  - 调试缺少操作员范围错误
  - 审查设备或节点配对审批
  - 添加或分类网关 RPC 方法
title: "操作员范围"
---

操作员范围定义了网关客户端在认证后可以做什么。它们是一个受信任网关操作员域内的控制平面护栏，而不是针对敌意的多租户隔离。如果你需要人员、团队或机器之间的强隔离，请在独立的操作系统用户或主机下运行独立的网关。

相关链接：[安全](/gateway/security)、[网关协议](/gateway/protocol)、[网关配对](/gateway/pairing)、[设备 CLI](/cli/devices)。

## 角色

网关 WebSocket 客户端以一种角色连接：

- `operator`：控制平面客户端，如 CLI、Control UI、自动化和受信任的辅助进程。
- `node`：能力主机，如 macOS、iOS、Android 或无头节点，通过 `node.invoke` 暴露命令。

操作员 RPC 方法需要 `operator` 角色。节点发起的方法需要 `node` 角色。

## 范围级别

| 范围                    | 含义                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `operator.read`         | 只读状态、列表、目录、日志、会话读取和其他非变更控制平面调用。                                             |
| `operator.write`        | 正常的变更操作员操作，如发送消息、调用工具、更新 talk/voice 设置和节点命令中继。也满足 `operator.read`。   |
| `operator.admin`        | 管理控制平面访问。满足每个 `operator.*` 范围。配置变更、更新、原生钩子、敏感保留命名空间和高风险审批所需。 |
| `operator.pairing`      | 设备和节点配对管理，包括列出、批准、拒绝、移除、轮换和撤销配对记录或设备令牌。                             |
| `operator.approvals`    | Exec 和插件审批 API。                                                                                      |
| `operator.talk.secrets` | 读取包含密钥的 Talk 配置。                                                                                 |

未知的未来 `operator.*` 范围需要精确匹配，除非调用者有 `operator.admin`。

## 方法范围只是第一道关卡

每个网关 RPC 都有最小权限方法范围。该方法范围决定请求是否可以到达处理程序。然后一些处理程序根据正在批准或变更的具体内容应用更严格的审批时检查。

示例：

- `device.pair.approve` 可以用 `operator.pairing` 访问，但批准操作员设备只能铸造或保留调用者已经拥有的范围。
- `node.pair.approve` 可以用 `operator.pairing` 访问，然后从待处理节点命令列表派生额外的审批范围。
- `chat.send` 通常是写范围方法，但持久的 `/config set` 和 `/config unset` 在命令级别需要 `operator.admin`。

这让较低范围的操作员可以执行低风险配对操作，而不必将所有配对审批变为仅限管理员。

## 设备配对审批

设备配对记录是已批准角色和范围的持久来源。已配对设备不会悄悄获得更广泛的访问权限：要求更广泛角色或更广泛范围的重新连接会创建新的待处理升级请求。

批准设备请求时：

- 没有操作员角色的请求不需要操作员令牌范围批准。
- 请求 `operator.read`、`operator.write`、`operator.approvals`、`operator.pairing` 或 `operator.talk.secrets` 需要调用者持有这些范围，或 `operator.admin`。
- 请求 `operator.admin` 需要 `operator.admin`。
- 没有明确范围的修复请求可以继承现有的操作员令牌范围。如果该现有令牌是管理员范围的，批准仍然需要 `operator.admin`。

对于配对设备令牌会话，管理是自范围的，除非调用者也有 `operator.admin`：非管理员调用者只能看到自己的配对条目，只能批准或拒绝自己的待处理请求，只能轮换、撤销或移除自己的设备条目。

## 节点配对审批

旧版 `node.pair.*` 使用独立的网关拥有的节点配对存储。WS 节点使用带 `role: node` 的设备配对，但适用相同的审批级词汇。

`node.pair.approve` 使用待处理请求命令列表来派生额外的必需范围：

- 无命令请求：`operator.pairing`
- 非 exec 节点命令：`operator.pairing` + `operator.write`
- `system.run`、`system.run.prepare` 或 `system.which`：`operator.pairing` + `operator.admin`

节点配对建立身份和信任。它不取代节点自己的 `system.run` exec 审批策略。

## 共享密钥认证

共享网关令牌/密码认证被视为该网关的受信任操作员访问。OpenAI 兼容 HTTP 接口和 `/tools/invoke` 为共享密钥 bearer 认证恢复正常的完整操作员默认范围集，即使调用者发送了更窄的声明范围。

身份承载模式，如受信任代理认证或私有入口 `none`，仍然可以遵守明确声明的范围。对于真正的信任边界隔离，请使用独立的网关。
