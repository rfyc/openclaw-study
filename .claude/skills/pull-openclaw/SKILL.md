---
name: pull-openclaw
description: 两个功能：1) 从远端分支拉取最新代码；2) 执行 restore-history.sh 恢复 Claude 对话历史到本机。当用户说 "pull openclaw"、"拉取代码"、"恢复历史"、"restore history"、"同步远端" 时触发。
---

# Pull OpenClaw

两个独立功能，根据用户意图单独或组合执行。

---

## 功能一：拉取远端代码

从远端分支拉取最新代码，保持本地与远端同步。

### 步骤

**1. 查看当前状态**

```bash
git status --short
git log --oneline -3
```

**2. 拉取远端代码**

```bash
git pull origin main
```

若本地有未提交的更改导致冲突，提示用户先执行 `push-openclaw` 提交本地变更，再拉取。

---

## 功能二：恢复 Claude 对话历史

将仓库中 `.claude/chat-history/` 下的历史文件还原到本机 Claude Code 的历史目录，使本机可以查看历史对话。

### 步骤

**1. 执行恢复脚本**

```bash
bash .claude/restore-history.sh
```

脚本会自动：

- 根据当前项目路径生成 Claude Code 的历史目录（`~/.claude/projects/<project-key>/`）
- 将 `.claude/chat-history/*.jsonl` 复制到该目录

**2. 确认结果**

```bash
ls ~/.claude/projects/$(pwd | sed 's|/|-|g')/
```

---

## 组合执行顺序

当用户同时需要两个功能时，按以下顺序执行：

1. 拉取远端代码（功能一）—— 确保拿到最新的 chat-history
2. 恢复对话历史（功能二）—— 将最新历史还原到本机

## 注意事项

- 拉取前若本地有未提交变更，优先提示用户使用 `push-openclaw` 提交，避免冲突
- `restore-history.sh` 会覆盖本机同名历史文件，执行前确认用户已知晓
- 若项目克隆路径与原机器不同，Claude Code 会视为新项目，历史仍可用但不会自动关联旧会话
