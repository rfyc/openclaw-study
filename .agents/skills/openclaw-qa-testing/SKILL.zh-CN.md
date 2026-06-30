---
name: openclaw-qa-testing
description: QA 测试：qa-lab/qa-channel 场景、实时/模拟提供者、字符评估。在运行 QA 场景、测试提供者集成或执行字符评估时激活。
user-invocable: false
---

# OpenClaw QA 测试技能

用于 qa-lab 和 qa-channel 场景的质量保证测试，支持实时和模拟提供者，以及字符评估。

## 测试场景

### QA Lab 测试

```bash
# 运行所有 QA lab 场景
pnpm test:qa-lab

# 运行特定场景
pnpm test:qa-lab --filter <场景名称>
```

### QA Channel 测试

```bash
# 在指定频道运行 QA 测试
pnpm test:qa-channel --channel <频道名称>
```

## 提供者配置

### 实时提供者

```bash
# 使用实时 OpenAI 提供者（需要 API 密钥）
OPENCLAW_LIVE_TEST=1 pnpm test:live

# 静默模式（减少日志输出）
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live
```

### 模拟提供者

默认情况下，测试使用模拟提供者以避免 API 调用：

- 测试示例模型：`sonnet-4.6`、`gpt-5.5`
- GPT 测试优先使用 5.5，5.4 也可接受
- 不使用 GPT-4.x 作为智能体冒烟测试的默认模型

## 字符评估

字符评估测试 OpenClaw 在不同角色扮演场景下的行为一致性：

```bash
# 运行字符评估
pnpm test:character-eval

# 针对特定字符运行
pnpm test:character-eval --character <字符名称>
```

### 评估标准

- 角色语气一致性
- 功能回调正确性
- 边界情况处理
- 错误恢复行为

## 测试矩阵

| 场景类型     | 提供者         | 环境       |
| ------------ | -------------- | ---------- |
| 基本对话     | 模拟/实时      | qa-lab     |
| 工具调用     | 模拟           | qa-lab     |
| 频道集成     | 实时（如可用） | qa-channel |
| 字符角色扮演 | 模拟/实时      | qa-lab     |

## CI 集成

QA 测试在以下工作流中运行：

- `QA-Lab - All Lanes`（仅在明确触发时）
- `Scheduled Live And E2E`（按计划）

这些工作流属于"仅限明确/界面触发"类别——不要自动等待它们。

## 测试报告

```
## QA 测试报告
日期：<ISO 8601>
场景：<场景名称>
提供者：<实时/模拟>

### 结果摘要
- 通过：N
- 失败：N
- 跳过：N

### 失败详情
[每个失败场景的详细信息]

### 字符评估
[每个字符评估的结果]
```

## 注意事项

- 避免编写依赖工作流/文档字符串来检查运营策略的脆弱测试
- 优先测试可执行行为，而非配置策略
- 测试后清理定时器、环境变量、全局状态和临时目录
