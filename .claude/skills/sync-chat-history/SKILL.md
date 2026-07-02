---
name: sync-chat-history
description: 把 Claude Code 对话历史同步到 .claude/chat-history/，脱敏后提交并推送到远程。当用户说"同步对话历史"、"推送聊天记录"、"sync chat history"、"更新历史记录"时触发。
---

# Sync Chat History

将本机 Claude Code 对话历史同步到项目仓库，经脱敏处理后提交推送到 GitHub。

## 执行步骤

### 1. 确定历史文件目录

Claude Code 的历史文件存储在：

```
~/.claude/projects/<project-key>/
```

其中 `<project-key>` 是项目绝对路径将 `/` 替换为 `-` 后的字符串。

用以下命令确认：

```bash
PROJECT_KEY=$(pwd | sed 's|/|-|g')
ls ~/.claude/projects/$PROJECT_KEY/*.jsonl
```

### 2. 复制最新历史文件

```bash
cp ~/.claude/projects/$PROJECT_KEY/*.jsonl .claude/chat-history/
```

### 3. 脱敏处理

```bash
bash .claude/sanitize-history.sh
```

脚本会替换以下格式的敏感内容：

- `ghp_*` / `github_pat_*` → `[REDACTED_PAT]`
- `sk-ant-*` → `[REDACTED_ANTHROPIC]`
- `sk-proj-*` / `sk-*` → `[REDACTED_OPENAI]`
- `300000189:*` → `[REDACTED_APIKEY]`

### 4. 检查是否有变更

```bash
git status --short .claude/chat-history/
```

若无变更则直接结束，不创建空提交。

### 5. 提交并推送

```bash
git add .claude/chat-history/
git commit -m "chore: sync claude code chat history"
git push origin main
```

若 `git push` 因 GitHub Push Protection 拒绝（含 Secret 字样），停止并告知用户需要运行 sanitize-history.sh 再重试。

## 注意事项

- 每次 push 前必须先执行脱敏，禁止跳过步骤 3
- 若 push 因 token 失效报 403，提示用户在 `.git/config` 中更新 remote URL 的 token
- 不要提交 `.claude/` 下除 `chat-history/`、`restore-history.sh`、`sanitize-history.sh`、`skills/` 之外的文件
