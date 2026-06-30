# 前沿测试框架计划

在小模型测试之前，对前沿模型进行框架调优时使用本文档。

## 目标

- 验证在短暂确认轮次中优先调用工具的行为
- 验证模型切换不会中断工具调用
- 验证仓库阅读/发现功能能够完成并生成具体报告
- 验证在压缩压力下，变更性操作明确保持回放不安全标记
- 收集个性相关的人工备注，确保风格问题不掩盖执行回归

## 前沿子集

每次调整框架时，先运行此子集：

- `approval-turn-tool-followthrough`
- `model-switch-tool-continuity`
- `source-docs-discovery-report`

之后进行较长的抽样检查：

- `compaction-retry-mutating-tool`
- `subagent-handoff`

## 基准顺序

1. 先跑 GPT，以此作为主要调优参考。
2. 再跑 Claude。如果 Claude 单独出现回归，优先采用 Anthropic 覆盖修复，而不是重写共享提示。
3. 再跑 Gemini，将其作为操作直接性检查。
4. 只有在前沿子集稳定后，才运行完整种子套件。

## 命令

GPT 基准：

```bash
pnpm openclaw qa suite \
  --provider-mode live-frontier \
  --model openai/gpt-5.5 \
  --alt-model openai/gpt-5.5 \
  --fast \
  --scenario approval-turn-tool-followthrough \
  --scenario model-switch-tool-continuity \
  --scenario source-docs-discovery-report
```

Claude 扫描：

```bash
pnpm openclaw qa suite \
  --provider-mode live-frontier \
  --model anthropic/claude-sonnet-4-6 \
  --alt-model anthropic/claude-opus-4-6 \
  --scenario approval-turn-tool-followthrough \
  --scenario model-switch-tool-continuity \
  --scenario source-docs-discovery-report
```

Gemini 扫描：

```bash
pnpm openclaw qa suite \
  --provider-mode live-frontier \
  --model <google-pro-model-ref> \
  --alt-model <google-pro-model-ref> \
  --scenario approval-turn-tool-followthrough \
  --scenario model-switch-tool-continuity \
  --scenario source-docs-discovery-report
```

使用 QA Lab 运行器目录或 `openclaw models list --all` 选取当前的 Google Pro 模型引用。

## 调优循环

1. 运行 GPT 子集并保存报告路径。
2. 每次只修改一个框架想法。
3. 立即重新运行相同的 GPT 子集。
4. 若 GPT 有所改善，再运行 Claude 子集。
5. 若 Claude 没有问题，再运行 Gemini 子集。
6. 若仅某个模型家族出现回归，先修复该提供商的覆盖配置，再修改共享提示。

## 评分维度

- `ok do it` 之后的工具承诺执行情况
- 空洞承诺率
- 模型切换后的工具连续性
- 发现报告的完整性与具体性
- 变更性写入后的回放安全真值
- 范围漂移：无关场景更新、大而化之的总结，或虚构的完成计数
- 延迟 / 明显的停滞行为
- 若某次修改让提示明显变重，需记录 token 成本备注

## 人工个性评测通道

在可执行子集之后运行，而不是之前：

```text
read QA_KICKOFF_TASK.md, tell me what feels half-baked about this qa mission, and keep it to two short sentences
```

GPT 人工评测通道：

```bash
pnpm openclaw qa manual \
  --provider-mode live-frontier \
  --model openai/gpt-5.5 \
  --alt-model openai/gpt-5.5 \
  --fast \
  --message "read QA_KICKOFF_TASK.md, tell me what feels half-baked about this qa mission, and keep it to two short sentences"
```

Claude 人工评测通道：

```bash
pnpm openclaw qa manual \
  --provider-mode live-frontier \
  --model anthropic/claude-sonnet-4-6 \
  --alt-model anthropic/claude-opus-4-6 \
  --message "read QA_KICKOFF_TASK.md, tell me what feels half-baked about this qa mission, and keep it to two short sentences"
```

评分标准：

- 是否先进行了阅读
- 是否给出了具体内容而非通用套话
- 智能体在完成有用工作的同时是否保持了自身风格
- 是否保持在有限范围内而没有扩展成套件总结或虚假完成声明

## 延期事项

- 确定性模拟压缩触发机制仍处于延期状态；当前的回放安全通道是一个以实时前沿为优先的可执行场景
