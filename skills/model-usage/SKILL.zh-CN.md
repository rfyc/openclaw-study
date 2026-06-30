---
name: model-usage
description: 按模型汇总 CodexBar 本地成本日志，支持 Codex 或 Claude，包括当前或完整使用明细。
metadata:
  {
    "openclaw":
      {
        "emoji": "📊",
        "os": ["darwin"],
        "requires": { "bins": ["codexbar"] },
        "install":
          [
            {
              "id": "brew-cask",
              "kind": "brew",
              "formula": "steipete/tap/codexbar",
              "bins": ["codexbar"],
              "label": "Install CodexBar (brew cask)",
            },
          ],
      },
  }
---

# 模型使用情况

## 概述

从 CodexBar 的本地成本日志中获取每个模型的使用成本。支持查看"当前模型"（最近的每日条目）或 Codex/Claude 的"所有模型"汇总。

TODO：待 CodexBar CLI 在 Linux 上的安装路径文档完善后，添加 Linux CLI 支持说明。

## 快速开始

1. 通过 CodexBar CLI 获取成本 JSON，或传入 JSON 文件。
2. 使用内置脚本按模型汇总。

```bash
python {baseDir}/scripts/model_usage.py --provider codex --mode current
python {baseDir}/scripts/model_usage.py --provider codex --mode all
python {baseDir}/scripts/model_usage.py --provider claude --mode all --format json --pretty
```

## 当前模型逻辑

- 使用含 `modelBreakdowns` 的最近每日行。
- 选取该行中成本最高的模型。
- 当 breakdowns 缺失时，回退到 `modelsUsed` 中的最后一个条目。
- 需要指定模型时，使用 `--model <name>` 覆盖。

## 输入

- 默认：运行 `codexbar cost --format json --provider <codex|claude>`。
- 文件或 stdin：

```bash
codexbar cost --provider codex --format json > /tmp/cost.json
python {baseDir}/scripts/model_usage.py --input /tmp/cost.json --mode all
cat /tmp/cost.json | python {baseDir}/scripts/model_usage.py --input - --mode current
```

## 输出

- 文本（默认）或 JSON（`--format json --pretty`）。
- 值仅为每个模型的成本；CodexBar 输出中 token 不按模型拆分。

## 参考文档

- 阅读 `references/codexbar-cli.md` 了解 CLI 标志和成本 JSON 字段。
