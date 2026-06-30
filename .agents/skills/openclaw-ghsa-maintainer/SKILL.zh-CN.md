---
name: openclaw-ghsa-maintainer
description: GitHub 安全通报检查、补丁和发布工作流。当用户需要处理 GHSA、安全公告或漏洞修复流程时激活。
user-invocable: false
---

# OpenClaw GHSA 维护者技能

用于处理 GitHub 安全通报（GHSA）的完整工作流，包括审查、补丁和发布。

## 何时激活

- 用户提及 GHSA、安全公告或漏洞
- 需要处理安全相关的 PR 或 issue
- 发布包含安全修复的版本

## 工作流

### 1. 审查通报

```bash
# 列出待处理的 GHSA
gh api graphql -f query='{ securityAdvisories(first: 10) { nodes { ghsaId summary severity } } }'

# 查看特定 GHSA
gh api /repos/openclaw/openclaw/security-advisories/<GHSA-ID>
```

### 2. 影响评估

在开始修补之前：

- 确认漏洞的实际可利用性
- 评估影响范围（哪些版本受影响）
- 检查是否已有公开修复或缓解措施
- 核实上游依赖的状态

### 3. 补丁流程

对于依赖漏洞：

```bash
# 检查当前版本
pnpm list <package-name>

# 更新到安全版本
pnpm update <package-name>@<safe-version>

# 运行检查以确保无破坏性变更
pnpm check:changed
```

对于代码漏洞：

- 在功能分支上修复
- 添加回归测试
- 在提交信息中引用 GHSA ID

### 4. 发布流程

安全修复通常需要快速发布：

1. 确保补丁已合并到 `main`
2. 触发修补版本发布
3. 更新 CHANGELOG（标注安全修复）
4. 发布 GHSA 通报（包含修复版本信息）

```bash
# 发布通报
gh api /repos/openclaw/openclaw/security-advisories/<GHSA-ID> \
  -X PATCH \
  -f state=published
```

### 5. 通知

- 在 `#security` 频道发布简洁通知
- 对于高危/严重漏洞，单独 ping Peter

## 安全边界

- 绝不公开披露尚未修补的漏洞详情
- 协调披露：先私下修复，再公开发布
- 对于 CVSS 7.0+ 的漏洞，在合并前需要 Peter 审查

## 关闭标准

在关闭 GHSA issue 前，确认：

1. 修补版本已发布到 npm
2. GHSA 通报已更新（包含修复版本）
3. 受影响用户有明确的升级路径
4. 相关 CVE 已更新（如适用）
