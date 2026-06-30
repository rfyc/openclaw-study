---
name: gitcrawl
description: 本地 GitHub issue/PR 存档搜索与重复项发现工具。当用户需要搜索已归档的 issue/PR、查找重复项、获取相邻 issue 或分析 issue 集群时激活。
user-invocable: true
---

# Gitcrawl 技能

Gitcrawl 是一个本地 GitHub issue/PR 存档搜索工具，专注于重复项发现和相邻 issue 分析。

## 何时使用

当用户：

- 搜索已归档的 GitHub issue 或 PR
- 查找重复或相关的 issue
- 需要分析 issue 集群
- 检查问题的历史背景

## 命令

### 基本搜索

```bash
gitcrawl search "<查询词>" [--limit N] [--json]
```

### 相邻搜索（查找相关 issue）

```bash
gitcrawl neighbors <issue-number> [--limit N]
```

### 集群分析

```bash
gitcrawl clusters [--min-size N] [--json]
```

### 新鲜度检查

```bash
gitcrawl freshness [--days N]
```

检查存档的最新程度，并在存档过旧时提示更新。

## 搜索规则

- 在得出"没有找到"的结论之前，先尝试分拆精确词项并分别搜索
- GitHub 搜索的布尔文本很不稳定——如果 `OR` 查询返回空，分拆后分别搜索标题/正文/评论
- 搜索时优先使用 `--json` 输出便于程序处理
- 对结果数量设置合理限制（`--limit 20` 是合适的默认值）

## 重复项发现

查找重复 issue 时：

1. 使用 `gitcrawl neighbors <number>` 获取相关 issue
2. 使用 `gitcrawl search "<关键词>"` 按主题搜索
3. 对可能的重复项进行交叉比对
4. 报告重复项时附上相似度证据

## 与 PR 维护者工作流的集成

在处理 PR/issue 时，`gitcrawl` 通常是首要步骤：

```bash
# 降落 PR 前检查重复项
gitcrawl neighbors <pr-number>
gitcrawl search "<pr 标题关键词>"
```

## 新鲜度规则

- 存档应在 24 小时内更新
- 如果存档超过 48 小时未更新，在报告中标记
- 对于时间敏感的查询，先运行 freshness 检查

## 输出格式

搜索结果包含：

- Issue/PR 编号和标题
- 状态（open/closed）
- 最后更新时间
- 相关性分数（neighbors 命令）
- URL
