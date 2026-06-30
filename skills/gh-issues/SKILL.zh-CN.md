---
name: gh-issues
description: "获取 GitHub Issues，委托子代理修复，开启 PR，监控审查，或运行 /gh-issues 工作流。"
user-invocable: true
metadata:
  {
    "openclaw":
      {
        "requires": { "bins": ["curl", "git", "gh"] },
        "primaryEnv": "GH_TOKEN",
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "gh",
              "bins": ["gh"],
              "label": "Install GitHub CLI (brew)",
            },
          ],
      },
  }
---

# gh-issues — 使用并行子代理自动修复 GitHub Issues

你是一个编排器。严格按照以下 6 个阶段执行，不得跳过任何阶段。

重要说明 — 无 `gh` CLI 依赖。本技能专门使用 curl + GitHub REST API。OpenClaw 已注入 GH_TOKEN 环境变量。所有 API 调用中将其作为 Bearer token 传入：

```
curl -s -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" ...
```

---

## 阶段 1 — 解析参数

解析 /gh-issues 后面提供的参数字符串。

位置参数：

- owner/repo — 可选。这是要获取 issues 的源仓库。如果省略，则从当前 git remote 检测：
  `git remote get-url origin`
  从 URL 中提取 owner/repo（同时支持 HTTPS 和 SSH 格式）。
  - HTTPS: https://github.com/owner/repo.git → owner/repo
  - SSH: git@github.com:owner/repo.git → owner/repo
    如果不在 git 仓库中或未找到 remote，则停止并报错，要求用户指定 owner/repo。

标志（均可选）：
| 标志 | 默认值 | 描述 |
|------|---------|-------------|
| --label | _(无)_ | 按标签过滤（例如 bug、`enhancement`） |
| --limit | 10 | 每次轮询最多获取的 issues 数量 |
| --milestone | _(无)_ | 按里程碑标题过滤 |
| --assignee | _(无)_ | 按指派人过滤（`@me` 表示自己） |
| --state | open | Issue 状态：open、closed、all |
| --fork | _(无)_ | 你的 fork（`user/repo`），用于推送分支和开启 PR。Issues 从源仓库获取；代码推送到 fork；PR 从 fork 开向源仓库。 |
| --watch | false | 每批处理后持续轮询新 issues 和 PR 审查 |
| --interval | 5 | 轮询间隔（分钟，仅与 `--watch` 配合使用） |
| --dry-run | false | 仅获取并显示 — 不启动子代理 |
| --yes | false | 跳过确认，自动处理所有过滤后的 issues |
| --reviews-only | false | 跳过 issue 处理（阶段 2-5）。仅运行阶段 6 — 检查开放的 PR 是否有审查评论并处理。 |
| --cron | false | Cron 安全模式：获取 issues 并派生子代理，不等待结果直接退出。 |
| --model | _(无)_ | 子代理使用的模型（例如 `glm-5`、`zai/glm-5`）。未指定时使用代理的默认模型。 |
| --notify-channel | _(无)_ | 发送最终 PR 汇总的 Telegram 频道 ID（例如 -1002381931352）。仅发送含 PR 链接的最终结果，不发送状态更新。 |

存储解析后的值以供后续阶段使用。

派生值：

- SOURCE_REPO = 位置参数中的 owner/repo（issues 所在地）
- PUSH_REPO = --fork 值（如提供），否则与 SOURCE_REPO 相同
- FORK_MODE = --fork 已提供时为 true，否则为 false

**如果设置了 `--reviews-only`：** 直接跳到阶段 6。先运行 token 解析（来自阶段 2），然后跳转到阶段 6。

**如果设置了 `--cron`：**

- 强制启用 `--yes`（跳过确认）
- 如果同时设置了 `--reviews-only`，则运行 token 解析后跳转到阶段 6（cron 审查模式）
- 否则，正常执行阶段 2-5，但激活 cron 模式行为

---

## 阶段 2 — 获取 Issues

**Token 解析：**
首先确保 GH_TOKEN 可用。检查环境变量：

```
echo $GH_TOKEN
```

如果为空，从配置读取：

```
CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/openclaw.json}"
cat "$CONFIG_PATH" | jq -r '.skills.entries["gh-issues"].apiKey // empty'
```

如果仍为空，检查 `/data/.clawdbot/openclaw.json`：

```
cat /data/.clawdbot/openclaw.json | jq -r '.skills.entries["gh-issues"].apiKey // empty'
```

导出为 GH_TOKEN 供后续命令使用：

```
export GH_TOKEN="<token>"
```

通过 exec 构建并运行对 GitHub Issues API 的 curl 请求：

```
curl -s -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{SOURCE_REPO}/issues?per_page={limit}&state={state}&{query_params}"
```

其中 {query_params} 由以下内容构建：

- labels={label}（如提供了 --label）
- milestone={milestone}（如提供了 --milestone；注意 API 期望里程碑*编号*，若用户提供标题，先通过 GET /repos/{SOURCE_REPO}/milestones 解析匹配）
- assignee={assignee}（如提供了 --assignee；若为 @me，先通过 `GET /user` 解析用户名）

重要：GitHub Issues API 也会返回 pull request。需过滤掉 — 排除响应对象中存在 pull_request 键的条目。

监听模式下：同时过滤掉之前批次中已在 PROCESSED_ISSUES 集合中的 issue 编号。

错误处理：

- 如果 curl 返回 HTTP 401 或 403 → 停止并告知用户：
  > "GitHub 身份验证失败。请检查 OpenClaw 仪表盘或活跃 OpenClaw 配置路径（`$OPENCLAW_CONFIG_PATH`，默认 `~/.openclaw/openclaw.json`）下 `skills.entries.gh-issues` 中的 apiKey。"
- 如果响应为空数组（过滤后）→ 报告"未找到符合过滤条件的 issues"并停止（监听模式下则循环回去）。
- 如果 curl 失败或返回其他错误 → 原样报告错误并停止。

解析 JSON 响应。对每个 issue 提取：number、title、body、labels（标签名数组）、assignees、html_url。

---

## 阶段 3 — 展示与确认

显示获取到的 issues 的 Markdown 表格：

| #   | 标题                          | 标签          |
| --- | ----------------------------- | ------------- |
| 42  | Fix null pointer in parser    | bug, critical |
| 37  | Add retry logic for API calls | enhancement   |

如果 FORK_MODE 已激活，还需显示：

> "Fork 模式：分支将推送到 {PUSH_REPO}，PR 将目标指向 `{SOURCE_REPO}`"

如果 `--dry-run` 已激活：

- 显示表格后停止。不继续阶段 4。

如果 `--yes` 已激活：

- 显示表格（供查阅）
- 自动处理所有列出的 issues，无需确认
- 直接进入阶段 4

否则：
请用户确认要处理哪些 issues：

- "all" — 处理所有列出的 issues
- 逗号分隔的编号（例如 `42, 37`）— 仅处理那些
- "cancel" — 完全取消

等待用户回应后再继续。

监听模式说明：在首次轮询时，始终向用户确认（除非设置了 --yes）。在后续轮询中，自动处理所有新 issues 无需再次确认（用户已选择加入）。仍然显示表格让其了解正在处理的内容。

---

## 阶段 4 — 预检

通过 exec 按顺序运行以下检查：

1. **工作树脏状态检查：**

   ```
   git status --porcelain
   ```

   如果输出非空，警告用户：

   > "工作树有未提交的更改。子代理将从 HEAD 创建分支 — 未提交的更改将不会包含在内。是否继续？"
   > 等待确认。如果拒绝则停止。

2. **记录基础分支：**

   ```
   git rev-parse --abbrev-ref HEAD
   ```

   存储为 BASE_BRANCH。

3. **验证远程访问：**
   如果是 FORK_MODE：
   - 验证 fork remote 是否存在。检查名为 `fork` 的 git remote：
     ```
     git remote get-url fork
     ```
     如果不存在则添加：
     ```
     git remote add fork https://x-access-token:$GH_TOKEN@github.com/{PUSH_REPO}.git
     ```
   - 同时验证 origin（源仓库）是否可达：
     ```
     git ls-remote --exit-code origin HEAD
     ```

   如果不是 FORK_MODE：

   ```
   git ls-remote --exit-code origin HEAD
   ```

   如果失败，停止并显示："无法连接到远程 origin。请检查网络和 git 配置。"

4. **验证 GH_TOKEN 有效性：**

   ```
   curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $GH_TOKEN" https://api.github.com/user
   ```

   如果 HTTP 状态码不是 200，停止并显示：

   > "GitHub 身份验证失败。请检查 OpenClaw 仪表盘或活跃 OpenClaw 配置路径（`$OPENCLAW_CONFIG_PATH`，默认 `~/.openclaw/openclaw.json`）下 `skills.entries.gh-issues` 中的 apiKey。"

5. **检查现有 PR：**
   对每个已确认的 issue 编号 N，运行：

   ```
   curl -s -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
     "https://api.github.com/repos/{SOURCE_REPO}/pulls?head={PUSH_REPO_OWNER}:fix/issue-{N}&state=open&per_page=1"
   ```

   （其中 PUSH_REPO_OWNER 是 `PUSH_REPO` 的所有者部分）
   如果响应数组非空，从处理列表中移除该 issue 并报告：

   > "跳过 #{N} — PR 已存在：{html_url}"

   如果所有 issues 都被跳过，报告后停止（监听模式下则循环回去）。

6. **检查进行中的分支（尚无 PR = 子代理仍在工作）：**
   对每个剩余的 issue 编号 N（未被步骤 5 跳过），检查 **推送仓库**（可能是 fork，不是 origin）上是否存在 `fix/issue-{N}` 分支：

   ```
   curl -s -o /dev/null -w "%{http_code}" \
     -H "Authorization: Bearer $GH_TOKEN" \
     "https://api.github.com/repos/{PUSH_REPO}/branches/fix/issue-{N}"
   ```

   如果 HTTP 200 → 分支在推送仓库上存在但步骤 5 中未找到对应的开放 PR。跳过该 issue：

   > "跳过 #{N} — 分支 fix/issue-{N} 已存在于 {PUSH_REPO}，修复可能正在进行中"

   此检查使用 GitHub API 而非 `git ls-remote`，因此在 fork 模式下也能正确工作（分支推送到 fork，而非 origin）。

   如果所有 issues 在此检查后都被跳过，报告后停止（监听模式下则循环回去）。

7. **基于声明的进行中追踪：**
   这可以防止在上一次 cron 运行的子代理仍在工作但尚未推送分支或开启 PR 时重复处理。

   读取声明文件（如缺失则创建空的 `{}`）：

   ```
   CLAIMS_FILE="/data/.clawdbot/gh-issues-claims.json"
   if [ ! -f "$CLAIMS_FILE" ]; then
     mkdir -p /data/.clawdbot
     echo '{}' > "$CLAIMS_FILE"
   fi
   ```

   解析声明文件。对每个条目，检查声明时间戳是否超过 2 小时。如果是，移除（已过期 — 子代理可能已完成或静默失败）。写回清理后的文件：

   ```
   CLAIMS=$(cat "$CLAIMS_FILE")
   CUTOFF=$(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-2H +%Y-%m-%dT%H:%M:%SZ)
   CLAIMS=$(echo "$CLAIMS" | jq --arg cutoff "$CUTOFF" 'to_entries | map(select(.value > $cutoff)) | from_entries')
   echo "$CLAIMS" > "$CLAIMS_FILE"
   ```

   对每个剩余的 issue 编号 N（未被步骤 5 或 6 跳过），检查声明文件中是否存在 `{SOURCE_REPO}#{N}` 作为键。

   如果已声明且未过期 → 跳过：

   > "跳过 #{N} — 子代理在 {minutes} 分钟前声明了此 issue，仍在超时窗口内"

   其中 `{minutes}` 从声明时间戳计算至今。

   如果所有 issues 在此检查后都被跳过，报告后停止（监听模式下则循环回去）。

---

## 阶段 5 — 派生子代理（并行）

**Cron 模式（`--cron` 已激活）：**

- **顺序游标追踪：** 使用游标文件追踪下一个要处理的 issue：

  ```
  CURSOR_FILE="/data/.clawdbot/gh-issues-cursor-{SOURCE_REPO_SLUG}.json"
  # SOURCE_REPO_SLUG = 将斜杠替换为连字符的 owner-repo（例如 openclaw-openclaw）
  ```

  读取游标文件（如缺失则创建）：

  ```
  if [ ! -f "$CURSOR_FILE" ]; then
    echo '{"last_processed": null, "in_progress": null}' > "$CURSOR_FILE"
  fi
  ```

  - `last_processed`：上次完成处理的 issue 编号（若无则为 null）
  - `in_progress`：当前正在处理的 issue 编号（若无则为 null）

- **选择下一个 issue：** 过滤已获取的 issues 列表，找到第一个满足以下条件的 issue：
  - Issue 编号 > last_processed（如果 last_processed 已设置）
  - 且 issue 不在声明文件中（不在进行中）
  - 且 issue 没有 PR（在阶段 4 步骤 5 中检查）
  - 且推送仓库上没有分支（在阶段 4 步骤 6 中检查）
- 如果在 last_processed 游标之后找不到合适的 issue，则绕回到开头（从最旧的合适 issue 开始）。

- 如果找到合适的 issue：
  1. 在游标文件中标记为 in_progress
  2. 为该单个 issue 派生一个子代理，`cleanup: "keep"` 且 `runTimeoutSeconds: 3600`
  3. 如果提供了 `--model`，在派生配置中包含 `model: "{MODEL}"`
  4. 如果提供了 `--notify-channel`，在任务中包含频道，以便子代理可以发送通知
  5. 不等待子代理结果 — 即发即忘
  6. **写入声明：** 派生后，读取声明文件，添加带当前 ISO 时间戳的 `{SOURCE_REPO}#{N}`，然后写回
  7. 立即报告："已为 #{N} 派生修复代理 — 完成后将创建 PR"
  8. 退出技能。不继续结果收集或阶段 6。

- 如果找不到合适的 issue（所有 issues 都有 PR、分支或正在进行中），报告"没有可处理的合适 issues — 所有 issues 都有 PR/分支或正在处理中"并退出。

**正常模式（`--cron` 未激活）：**
对每个已确认的 issue，使用 sessions_spawn 派生子代理。最多同时启动 8 个（对应 `subagents.maxConcurrent: 8`）。如果超过 8 个 issues，分批处理 — 每完成一个代理后启动下一个。

**写入声明：** 在派生每个子代理后，读取声明文件，添加带当前 ISO 时间戳的 `{SOURCE_REPO}#{N}`，然后写回（与 cron 模式相同的步骤）。这涵盖了监听模式可能与 cron 运行重叠的交互式使用情况。

### 子代理任务提示

对每个 issue，构建以下提示并传递给 sessions_spawn。要注入模板的变量：

- {SOURCE_REPO} — issue 所在的上游仓库
- {PUSH_REPO} — 推送分支的仓库（fork 模式下与 SOURCE_REPO 不同）
- {FORK_MODE} — true/false
- {PUSH_REMOTE} — FORK_MODE 时为 `fork`，否则为 `origin`
- {number}、{title}、{url}、{labels}、{body} — 来自 issue
- {BASE_BRANCH} — 来自阶段 4
- {notify_channel} — 通知用的 Telegram 频道 ID（未设置则为空）。将下面模板中的 {notify_channel} 替换为 `--notify-channel` 标志的值（未提供则留空字符串）。

构建任务时，替换所有模板变量包括 {notify_channel}。

```
You are a focused code-fix agent. Your task is to fix a single GitHub issue and open a PR.

IMPORTANT: Do NOT use the gh CLI — it is not installed. Use curl with the GitHub REST API for all GitHub operations.

First, ensure GH_TOKEN is set. Check: `echo $GH_TOKEN`. If empty, read from config:
CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/openclaw.json}"
GH_TOKEN=$(cat "$CONFIG_PATH" 2>/dev/null | jq -r '.skills.entries["gh-issues"].apiKey // empty') || GH_TOKEN=$(cat /data/.clawdbot/openclaw.json 2>/dev/null | jq -r '.skills.entries["gh-issues"].apiKey // empty')

Use the token in all GitHub API calls:
curl -s -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" ...

<config>
Source repo (issues): {SOURCE_REPO}
Push repo (branches + PRs): {PUSH_REPO}
Fork mode: {FORK_MODE}
Push remote name: {PUSH_REMOTE}
Base branch: {BASE_BRANCH}
Notify channel: {notify_channel}
</config>

<issue>
Repository: {SOURCE_REPO}
Issue: #{number}
Title: {title}
URL: {url}
Labels: {labels}
Body: {body}
</issue>

<instructions>
Follow these steps in order. If any step fails, report the failure and stop.

0. SETUP — Ensure GH_TOKEN is available:
```

export GH_TOKEN=$(node -e "const fs=require('fs'); const c=JSON.parse(fs.readFileSync('/data/.clawdbot/openclaw.json','utf8')); console.log(c.skills?.entries?.['gh-issues']?.apiKey || '')")

```
If that fails, also try:
```

export CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/openclaw.json}"
export GH_TOKEN=$(cat "$CONFIG_PATH" 2>/dev/null | node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));console.log(d.skills?.entries?.['gh-issues']?.apiKey||'')")

```
Verify: echo "Token: ${GH_TOKEN:0:10}..."

1. CONFIDENCE CHECK — Before implementing, assess whether this issue is actionable:
- Read the issue body carefully. Is the problem clearly described?
- Search the codebase (grep/find) for the relevant code. Can you locate it?
- Is the scope reasonable? (single file/function = good, whole subsystem = bad)
- Is a specific fix suggested or is it a vague complaint?

Rate your confidence (1-10). If confidence < 7, STOP and report:
> "Skipping #{number}: Low confidence (score: N/10) — [reason: vague requirements | cannot locate code | scope too large | no clear fix suggested]"

Only proceed if confidence >= 7.

1. UNDERSTAND — Read the issue carefully. Identify what needs to change and where.

2. BRANCH — Create a feature branch from the base branch:
git checkout -b fix/issue-{number} {BASE_BRANCH}

3. ANALYZE — Search the codebase to find relevant files:
- Use grep/find via exec to locate code related to the issue
- Read the relevant files to understand the current behavior
- Identify the root cause

4. IMPLEMENT — Make the minimal, focused fix:
- Follow existing code style and conventions
- Change only what is necessary to fix the issue
- Do not add unrelated changes or new dependencies without justification

5. TEST — Discover and run the existing test suite if one exists:
- Look for package.json scripts, Makefile targets, pytest, cargo test, etc.
- Run the relevant tests
- If tests fail after your fix, attempt ONE retry with a corrected approach
- If tests still fail, report the failure

6. COMMIT — Stage and commit your changes:
git add {changed_files}
git commit -m "fix: {short_description}

Fixes {SOURCE_REPO}#{number}"

7. PUSH — Push the branch:
First, ensure the push remote uses token auth and disable credential helpers:
git config --global credential.helper ""
git remote set-url {PUSH_REMOTE} https://x-access-token:$GH_TOKEN@github.com/{PUSH_REPO}.git
Then push:
GIT_ASKPASS=true git push -u {PUSH_REMOTE} fix/issue-{number}

8. PR — Create a pull request using the GitHub API:

If FORK_MODE is true, the PR goes from your fork to the source repo:
- head = "{PUSH_REPO_OWNER}:fix/issue-{number}"
- base = "{BASE_BRANCH}"
- PR is created on {SOURCE_REPO}

If FORK_MODE is false:
- head = "fix/issue-{number}"
- base = "{BASE_BRANCH}"
- PR is created on {SOURCE_REPO}

curl -s -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/{SOURCE_REPO}/pulls \
  -d '{
    "title": "fix: {title}",
    "head": "{head_value}",
    "base": "{BASE_BRANCH}",
    "body": "## Summary\n\n{one_paragraph_description_of_fix}\n\n## Changes\n\n{bullet_list_of_changes}\n\n## Testing\n\n{what_was_tested_and_results}\n\nFixes {SOURCE_REPO}#{number}"
  }'

Extract the `html_url` from the response — this is the PR link.

9. REPORT — Send back a summary:
- PR URL (the html_url from step 8)
- Files changed (list)
- Fix summary (1-2 sentences)
- Any caveats or concerns

10. NOTIFY (if notify_channel is set) — If {notify_channel} is not empty, send a notification to the Telegram channel:
```

Use the message tool with:

- action: "send"
- channel: "telegram"
- target: "{notify_channel}"
- message: "✅ PR Created: {SOURCE_REPO}#{number}

{title}

{pr_url}

Files changed: {files_changed_list}"

```
</instructions>

<constraints>
- No force-push, no modifying the base branch
- No unrelated changes or gratuitous refactoring
- No new dependencies without strong justification
- If the issue is unclear or too complex to fix confidently, report your analysis instead of guessing
- Do NOT use the gh CLI — it is not available. Use curl + GitHub REST API for all GitHub operations.
- GH_TOKEN is already in the environment — do NOT prompt for auth
- Time limit: you have 60 minutes max. Be thorough — analyze properly, test your fix, don't rush.
</constraints>
```

### 每个子代理的派生配置：

- runTimeoutSeconds: 3600（60 分钟）
- cleanup: "keep"（保留转录以供审查）
- 如果提供了 `--model`，在派生配置中包含 `model: "{MODEL}"`

### 超时处理

如果子代理超过 60 分钟，记录为：

> "#{N} — 已超时（issue 可能过于复杂无法自动修复）"

---

## 结果收集

**如果 `--cron` 已激活：** 完全跳过本节 — 编排器在阶段 5 派生后已退出。

等待所有子代理完成（或超时）后，收集结果。将成功开启的 PR 列表存储在 `OPEN_PRS` 中（PR 编号、分支名、issue 编号、PR URL）以供阶段 6 使用。

呈现汇总表格：

| Issue                 | 状态      | PR                             | 备注                 |
| --------------------- | --------- | ------------------------------ | -------------------- |
| #42 Fix null pointer  | PR 已开启 | https://github.com/.../pull/99 | 3 个文件已更改       |
| #37 Add retry logic   | 失败      | --                             | 无法识别目标代码     |
| #15 Update docs       | 超时      | --                             | 过于复杂无法自动修复 |
| #8 Fix race condition | 已跳过    | --                             | PR 已存在            |

**状态值：**

- **PR 已开启** — 成功，链接到 PR
- **失败** — 子代理无法完成（在备注中注明原因）
- **超时** — 超过 60 分钟限制
- **已跳过** — 预检时检测到现有 PR

以一行总结结束：

> "已处理 {N} 个 issues：{success} 个 PR 已开启，{failed} 个失败，{skipped} 个已跳过。"

**向频道发送通知（如果设置了 --notify-channel）：**
如果提供了 `--notify-channel`，使用 `message` 工具向该 Telegram 频道发送最终汇总：

```
Use the message tool with:
- action: "send"
- channel: "telegram"
- target: "{notify-channel}"
- message: "✅ GitHub Issues Processed

Processed {N} issues: {success} PRs opened, {failed} failed, {skipped} skipped.

{PR_LIST}"

Where PR_LIST includes only successfully opened PRs in format:
• #{issue_number}: {PR_url} ({notes})
```

然后进入阶段 6。

---

## 阶段 6 — PR 审查处理器

本阶段监控开放的 PR（由本技能创建或已有的 `fix/issue-*` PR）是否有审查评论，并派生子代理处理。

**本阶段运行时机：**

- 结果收集后（阶段 2-5 已完成）— 检查刚开启的 PR
- 设置了 `--reviews-only` 标志时 — 完全跳过阶段 2-5，仅运行本阶段
- 监听模式下 — 每次轮询检查新 issues 后运行

**Cron 审查模式（`--cron --reviews-only`）：**
同时设置了 `--cron` 和 `--reviews-only` 时：

1. 运行 token 解析（阶段 2 token 部分）
2. 发现开放的 `fix/issue-*` PR（步骤 6.1）
3. 获取审查评论（步骤 6.2）
4. **分析评论内容的可操作性**（步骤 6.3）
5. 如果找到可操作的评论，为第一个有未处理评论的 PR 派生一个审查修复子代理 — 即发即忘（不等待结果）
   - 使用 `cleanup: "keep"` 且 `runTimeoutSeconds: 3600`
   - 如果提供了 `--model`，在派生配置中包含 `model: "{MODEL}"`
6. 报告："已为 PR #{N} 派生审查处理器 — 完成后将推送修复"
7. 立即退出技能。不继续步骤 6.5（审查结果）。

如果没有找到可操作的评论，报告"未发现可操作的审查评论"并退出。

**正常模式（非 cron）继续如下：**

### 步骤 6.1 — 发现要监控的 PR

收集要检查审查评论的 PR：

**如果来自阶段 5：** 使用结果收集中的 `OPEN_PRS` 列表。

**如果是 `--reviews-only` 或后续监听轮询：** 获取所有符合 `fix/issue-` 分支模式的开放 PR：

```
curl -s -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{SOURCE_REPO}/pulls?state=open&per_page=100"
```

过滤仅保留 `head.ref` 以 `fix/issue-` 开头的 PR。

对每个 PR 提取：`number`（PR 编号）、`head.ref`（分支名）、`html_url`、`title`、`body`。

如果未找到 PR，报告"没有开放的 fix/ PR 可监控"并停止（监听模式下则循环回去）。

### 步骤 6.2 — 获取所有审查来源

对每个 PR，从多个来源获取审查：

**获取 PR 审查：**

```
curl -s -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{SOURCE_REPO}/pulls/{pr_number}/reviews"
```

**获取 PR 审查评论（行内/文件级别）：**

```
curl -s -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{SOURCE_REPO}/pulls/{pr_number}/comments"
```

**获取 PR Issue 评论（常规对话）：**

```
curl -s -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{SOURCE_REPO}/issues/{pr_number}/comments"
```

**获取 PR 正文中嵌入的审查：**
某些审查工具（如 Greptile）直接在 PR 正文中嵌入反馈。检查以下内容：

- `<!-- greptile_comment -->` 标记
- PR 正文中其他结构化审查部分

```
curl -s -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{SOURCE_REPO}/pulls/{pr_number}"
```

提取 `body` 字段并解析嵌入的审查内容。

### 步骤 6.3 — 分析评论的可操作性

**确定 Bot 自身用户名**以进行过滤：

```
curl -s -H "Authorization: Bearer $GH_TOKEN" https://api.github.com/user | jq -r '.login'
```

存储为 `BOT_USERNAME`。排除 `user.login` 等于 `BOT_USERNAME` 的任何评论。

**对每条评论/审查，分析内容确定是否需要操作：**

**不可操作（跳过）：**

- 纯批准或"LGTM"且无建议
- 仅提供信息的 Bot 评论（CI 状态、没有具体请求的自动生成摘要）
- 已处理的评论（检查 Bot 是否已回复"Addressed in commit..."）
- 无行内请求更改评论的 `APPROVED` 状态审查

**可操作（需要关注）：**

- 状态为 `CHANGES_REQUESTED` 的审查
- 状态为 `COMMENTED` 且包含具体请求的审查：
  - "this test needs to be updated"
  - "please fix"、"change this"、"update"、"can you"、"should be"、"needs to"
  - "will fail"、"will break"、"causes an error"
  - 提及具体代码问题（bug、缺少错误处理、边缘情况）
- 指出代码问题的行内审查评论
- PR 正文中嵌入的审查，标识：
  - 关键问题或破坏性更改
  - 预期测试失败
  - 需要关注的具体代码
  - 有担忧的置信度评分

**解析嵌入的审查内容（如 Greptile）：**
查找标有 `<!-- greptile_comment -->` 或类似标记的部分。提取：

- 摘要文本
- 提及"Critical issue"、"needs attention"、"will fail"、"test needs to be updated"的内容
- 低于 4/5 的置信度评分（表示有担忧）

**构建 actionable_comments 列表**，包含：

- 来源（审查、行内评论、PR 正文等）
- 作者
- 正文文本
- 对于行内：文件路径和行号
- 识别出的具体行动项目

如果在所有 PR 中都未找到可操作的评论，报告"未发现可操作的审查评论"并停止（监听模式下则循环回去）。

### 步骤 6.4 — 展示审查评论

显示有待处理可操作评论的 PR 表格：

```
| PR | 分支 | 可操作评论 | 来源 |
|----|--------|---------------------|---------|
| #99 | fix/issue-42 | 2 条评论 | @reviewer1, greptile |
| #101 | fix/issue-37 | 1 条评论 | @reviewer2 |
```

如果未设置 `--yes` 且不是后续监听轮询：询问用户确认要处理哪些 PR（"all"、逗号分隔的 PR 编号，或"skip"）。

### 步骤 6.5 — 派生审查修复子代理（并行）

对每个有可操作评论的 PR，派生子代理。最多同时启动 8 个。

**审查修复子代理提示：**

```
You are a PR review handler agent. Your task is to address review comments on a pull request by making the requested changes, pushing updates, and replying to each comment.

IMPORTANT: Do NOT use the gh CLI — it is not installed. Use curl with the GitHub REST API for all GitHub operations.

First, ensure GH_TOKEN is set. Check: echo $GH_TOKEN. If empty, read from config:
CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/openclaw.json}"
GH_TOKEN=$(cat "$CONFIG_PATH" 2>/dev/null | jq -r '.skills.entries["gh-issues"].apiKey // empty') || GH_TOKEN=$(cat /data/.clawdbot/openclaw.json 2>/dev/null | jq -r '.skills.entries["gh-issues"].apiKey // empty')

<config>
Repository: {SOURCE_REPO}
Push repo: {PUSH_REPO}
Fork mode: {FORK_MODE}
Push remote: {PUSH_REMOTE}
PR number: {pr_number}
PR URL: {pr_url}
Branch: {branch_name}
</config>

<review_comments>
{json_array_of_actionable_comments}

Each comment has:
- id: comment ID (for replying)
- user: who left it
- body: the comment text
- path: file path (for inline comments)
- line: line number (for inline comments)
- diff_hunk: surrounding diff context (for inline comments)
- source: where the comment came from (review, inline, pr_body, greptile, etc.)
</review_comments>

<instructions>
Follow these steps in order:

0. SETUP — Ensure GH_TOKEN is available:
```

export GH_TOKEN=$(node -e "const fs=require('fs'); const c=JSON.parse(fs.readFileSync('/data/.clawdbot/openclaw.json','utf8')); console.log(c.skills?.entries?.['gh-issues']?.apiKey || '')")

```
Verify: echo "Token: ${GH_TOKEN:0:10}..."

1. CHECKOUT — Switch to the PR branch:
git fetch {PUSH_REMOTE} {branch_name}
git checkout {branch_name}
git pull {PUSH_REMOTE} {branch_name}

2. UNDERSTAND — Read ALL review comments carefully. Group them by file. Understand what each reviewer is asking for.

3. IMPLEMENT — For each comment, make the requested change:
- Read the file and locate the relevant code
- Make the change the reviewer requested
- If the comment is vague or you disagree, still attempt a reasonable fix but note your concern
- If the comment asks for something impossible or contradictory, skip it and explain why in your reply

4. TEST — Run existing tests to make sure your changes don't break anything:
- If tests fail, fix the issue or revert the problematic change
- Note any test failures in your replies

5. COMMIT — Stage and commit all changes in a single commit:
git add {changed_files}
git commit -m "fix: address review comments on PR #{pr_number}

Addresses review feedback from {reviewer_names}"

6. PUSH — Push the updated branch:
git config --global credential.helper ""
git remote set-url {PUSH_REMOTE} https://x-access-token:$GH_TOKEN@github.com/{PUSH_REPO}.git
GIT_ASKPASS=true git push {PUSH_REMOTE} {branch_name}

7. REPLY — For each addressed comment, post a reply:

For inline review comments (have a path/line), reply to the comment thread:
curl -s -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/{SOURCE_REPO}/pulls/{pr_number}/comments/{comment_id}/replies \
  -d '{"body": "Addressed in commit {short_sha} — {brief_description_of_change}"}'

For general PR comments (issue comments), reply on the PR:
curl -s -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/{SOURCE_REPO}/issues/{pr_number}/comments \
  -d '{"body": "Addressed feedback from @{reviewer}:\n\n{summary_of_changes_made}\n\nUpdated in commit {short_sha}"}'

For comments you could NOT address, reply explaining why:
"Unable to address this comment: {reason}. This may need manual review."

8. REPORT — Send back a summary:
- PR URL
- Number of comments addressed vs skipped
- Commit SHA
- Files changed
- Any comments that need manual attention
</instructions>

<constraints>
- Only modify files relevant to the review comments
- Do not make unrelated changes
- Do not force-push — always regular push
- If a comment contradicts another comment, address the most recent one and flag the conflict
- Do NOT use the gh CLI — use curl + GitHub REST API
- GH_TOKEN is already in the environment — do not prompt for auth
- Time limit: 60 minutes max
</constraints>
```

**每个子代理的派生配置：**

- runTimeoutSeconds: 3600（60 分钟）
- cleanup: "keep"（保留转录以供审查）
- 如果提供了 `--model`，在派生配置中包含 `model: "{MODEL}"`

### 步骤 6.6 — 审查结果

所有审查子代理完成后，呈现汇总：

```
| PR | 已处理评论 | 已跳过评论 | 提交 | 状态 |
|----|-------------------|-----------------|--------|--------|
| #99 fix/issue-42 | 3 | 0 | abc123f | 全部已处理 |
| #101 fix/issue-37 | 1 | 1 | def456a | 1 条需人工审查 |
```

将本批次的评论 ID 添加到 `ADDRESSED_COMMENTS` 集合以防止重复处理。

---

## 监听模式（如果 --watch 已激活）

展示当前批次的结果后：

1. 将本批次的所有 issue 编号添加到运行中的 PROCESSED_ISSUES 集合。
2. 将所有已处理的评论 ID 添加到 ADDRESSED_COMMENTS。
3. 告知用户：
   > "将在 {interval} 分钟后进行下次轮询…（说'stop'以结束监听模式）"
4. 休眠 {interval} 分钟。
5. 返回 **阶段 2 — 获取 Issues**。获取操作将自动过滤：
   - 已在 PROCESSED_ISSUES 中的 issues
   - 已有 fix/issue-{N} PR 的 issues（在阶段 4 预检中捕获）
6. 完成阶段 2-5 后（或无新 issues），运行**阶段 6**检查所有被追踪的 PR（包括新创建的和之前开启的）是否有新审查评论。
7. 如果没有新 issues 且没有新的可操作审查评论 → 报告"暂无新活动。将在 {interval} 分钟后再次轮询…"并循环回步骤 4。
8. 用户可随时说"stop"退出监听模式。停止时，呈现所有批次的最终累计汇总 — 包括已处理的 issues 和已处理的审查评论。

**轮询间的上下文清理 — 重要：**
轮询周期之间仅保留：

- PROCESSED_ISSUES（issue 编号集合）
- ADDRESSED_COMMENTS（评论 ID 集合）
- OPEN_PRS（被追踪的 PR 列表：编号、分支、URL）
- 累计结果（每个 issue 一行 + 每次审查批次一行）
- 阶段 1 的已解析参数
- BASE_BRANCH、SOURCE_REPO、PUSH_REPO、FORK_MODE、BOT_USERNAME
  不要在轮询间保留 issue 正文、评论正文、子代理转录或代码库分析。
