---
name: openclaw-pr-maintainer
description: GitHub PR/issue 维护者工作流：gitcrawl 搜索、分类标签、证据要求。在处理 PR 审查、issue 分类或 PR 维护工作流时激活。
user-invocable: false
---

# OpenClaw PR 维护者技能

用于 GitHub PR/issue 的完整维护工作流，包括分类、重复检测和合并决策。

## 核心原则

- 先列出，再水化（list first, hydrate few）
- 每次操作都需要有证据支撑
- 绝不在未经 Peter 明确请求的情况下评论、关闭、标记或合并维护者拥有的 PR
- 不发表未经请求的 PR 评论或审查

## PR 分类工作流

### 1. 扫描开放 PR

```bash
gh pr list --state open --json number,title,author,updatedAt,labels --limit 50
```

### 2. 深度查看候选 PR

```bash
gh pr view <number> --json number,title,body,closingIssuesReferences,files,statusCheckRollup,reviewDecision
```

### 3. Gitcrawl 重复检测

在处理 PR 之前，检查重复项：

```bash
gitcrawl neighbors <pr-number>
gitcrawl search "<pr 标题关键词>"
```

### 4. 分类决策

基于以下因素做出决策：

- CI 状态（全绿 vs 有失败）
- 代码所有权（核心 vs 插件）
- 破坏性变更影响
- 重复/相关 PR

## Issue 分类工作流

### 搜索

```bash
# 优先使用有界查询
gh search issues 'repo:openclaw/openclaw is:open <关键词>' \
  --json number,title,state,updatedAt --limit 20
```

### 关闭重复项

在关闭前：

1. 在 issue 中评论说明原因及规范链接
2. 添加 `duplicate` 标签
3. 关闭并引用原始 issue

```bash
gh issue comment <number> --body-file /tmp/dup-comment.md
gh issue close <number> --reason duplicate
```

### 已修复的 issue

如果 issue 已在 `main` 上修复：

1. 评论并附上修复证据（提交 SHA、PR 链接）
2. 关闭 issue

## 证据要求

在合并或关闭 PR 前，必须验证：

- [ ] 所要修复的 bug/行为是什么
- [ ] 影响的 PR/issue URL 和端点/界面
- [ ] 这是否是最佳修复方案（附有充分证据）
- [ ] 代码、测试、CI 和已发布行为的高置信度证据

## 标签操作

```bash
# 添加标签
gh pr edit <number> --add-label "bug,needs-review"

# 移除标签
gh pr edit <number> --remove-label "needs-triage"
```

## PR 合并

满足以下所有条件才可合并：

1. CI 全绿（精确 SHA）
2. 审查已批准（如需要）
3. 无未解决的冲突
4. 合并后已验证受影响的功能面

```bash
gh pr merge <number> --squash --subject "<提交消息>"
```

## 批量操作限制

- 批量关闭/重新开放超过 5 个 PR/issue：先询问用户确认范围和数量
- 绝不批量操作维护者拥有的 PR

## 合并后检查

合并后：

- 搜索重复的开放 issue/PR
- 在相关项目上评论（包含规范的提交/PR/版本链接）
- 关闭已被此合并解决的 issue

## 始终以 GitHub URL 结尾

处理 PR/issue 时，最终回复必须以完整的 GitHub URL 结尾。
