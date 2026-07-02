---
name: push-openclaw
description: 两个功能：1) 把 Claude Code 对话历史同步到 .claude/chat-history/ 脱敏后提交推送；2) 把项目当前所有更改提交并推送到远程分支。当用户说 "push openclaw"、"推送项目"、"同步聊天记录"、"提交推送"、"push chat history" 时触发。
---

# Push OpenClaw

两个独立功能，根据用户意图单独或组合执行。

---

## 功能一：同步 Claude 对话历史

将本机最新的 Claude Code 对话历史复制到 `.claude/chat-history/`，脱敏后提交推送。

### 步骤

**1. 复制最新历史文件**

```bash
PROJECT_KEY=$(pwd | sed 's|/|-|g')
cp ~/.claude/projects/$PROJECT_KEY/*.jsonl .claude/chat-history/
```

**2. 脱敏处理**

```bash
bash .claude/sanitize-history.sh
```

替换以下敏感内容：

- `ghp_*` / `github_pat_*` → `[REDACTED_PAT]`
- `sk-ant-*` → `[REDACTED_ANTHROPIC]`
- `sk-proj-*` / `sk-*` → `[REDACTED_OPENAI]`
- `300000189:*` → `[REDACTED_APIKEY]`

**3. 提交推送**

```bash
git add .claude/chat-history/
git diff --cached --quiet || git commit -m "chore: sync claude code chat history"
git push origin main
```

---

## 功能二：提交项目全部更改

将项目当前所有未提交的更改暂存、提交并推送到远程分支。

### 步骤

**1. 查看当前变更**

```bash
git status --short
git diff --stat
```

**2. 暂存全部更改**

```bash
git add -A
```

**3. 生成提交信息**

根据变更内容生成符合 conventional commits 规范的提交信息，例如：

- `feat: add xxx`
- `fix: resolve xxx`
- `chore: update xxx`

**4. 提交并推送**

```bash
git commit -m "<生成的提交信息>"
git push origin main
```

---

## 组合执行顺序

当用户同时需要两个功能时，按以下顺序执行：

1. 同步对话历史（功能一）
2. 提交项目全部更改（功能二，包含步骤一产生的 chat-history 变更）

## 注意事项

- Push 被 GitHub Push Protection 拒绝时，停止并提示用户检查 sanitize-history.sh 是否覆盖了新的 token 格式
- Push 报 403 时，提示用户检查 `.git/config` 中 remote URL 的 token 是否有效
- 不提交 `.claude/settings.json` 等非 chat-history / skills 的 `.claude/` 内部文件
