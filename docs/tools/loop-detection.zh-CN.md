---
summary: "如何启用和调整检测重复工具调用循环的防护机制"
title: "工具循环检测"
read_when:
  - 用户反映代理陷入重复工具调用的循环
  - 你需要调整重复调用保护
  - 你正在编辑代理工具/运行时策略
---

OpenClaw 可以防止代理陷入重复工具调用模式。此防护机制**默认禁用**。

只在需要的地方启用，因为严格设置可能会阻止合法的重复调用。

## 为什么需要它

- 检测不能取得进展的重复序列。
- 检测高频无结果循环（相同工具、相同输入、重复错误）。
- 检测已知轮询工具的特定重复调用模式。

## 配置块

全局默认值：

```json5
{
  tools: {
    loopDetection: {
      enabled: false,
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

按代理覆盖（可选）：

```json5
{
  agents: {
    list: [
      {
        id: "safe-runner",
        tools: {
          loopDetection: {
            enabled: true,
            warningThreshold: 8,
            criticalThreshold: 16,
          },
        },
      },
    ],
  },
}
```

### 字段行为

- `enabled`：主开关。`false` 表示不执行循环检测。
- `historySize`：保留用于分析的最近工具调用数量。
- `warningThreshold`：将模式分类为仅警告的阈值。
- `criticalThreshold`：阻止重复循环模式的阈值。
- `globalCircuitBreakerThreshold`：全局无进展断路器阈值。
- `detectors.genericRepeat`：检测相同工具 + 相同参数的重复模式。
- `detectors.knownPollNoProgress`：检测已知的类轮询模式（无状态变化）。
- `detectors.pingPong`：检测交替的乒乓模式。

对于 `exec`，无进展检查会比较稳定的命令结果，忽略易变的运行时元数据（如持续时间、PID、会话 ID 和工作目录）。当有运行 ID 可用时，最近的工具调用历史仅在该运行范围内评估，以防止定时心跳周期和新运行继承早期运行的旧循环计数。

## 推荐设置

- 对于较小的模型，从 `enabled: true` 开始，保持默认值不变。旗舰模型很少需要循环检测，可以保持禁用。
- 保持阈值顺序：`warningThreshold < criticalThreshold < globalCircuitBreakerThreshold`。
- 如果出现误报：
  - 提高 `warningThreshold` 和/或 `criticalThreshold`
  - （可选）提高 `globalCircuitBreakerThreshold`
  - 仅禁用导致问题的检测器
  - 减小 `historySize` 以减少严格的历史上下文

## 日志和预期行为

当检测到循环时，OpenClaw 报告循环事件，并根据严重程度阻止或抑制下一个工具周期。这保护用户免受失控的 token 消耗和锁定，同时保留正常的工具访问。

- 优先使用警告和临时抑制。
- 仅在重复证据积累时才升级。

## 注意事项

- `tools.loopDetection` 与代理级别覆盖合并。
- 按代理配置完全覆盖或扩展全局值。
- 如果不存在配置，防护机制保持关闭。

## 相关链接

- [执行审批](/tools/exec-approvals)
- [思考级别](/tools/thinking)
- [子代理](/tools/subagents)
