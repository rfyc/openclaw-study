---
name: openclaw-secret-scanning-maintainer
description: 分类、编辑、清理和解决 issue 或 PR 中的 OpenClaw GitHub 秘密扫描警报。
---

# OpenClaw 秘密扫描维护者

**仅限维护者。** 此技能需要仓库管理员/维护者权限，以编辑或删除其他用户的评论并解决秘密扫描警报。

在处理来自 `https://github.com/openclaw/openclaw/security/secret-scanning` 的警报时使用此技能。

**语言规则：** 所有通知评论和替换评论必须用英文撰写。

## 脚本

所有机械操作（API 调用、临时文件管理、安全执行）由以下脚本处理：

```
$REPO_ROOT/.agents/skills/openclaw-secret-scanning-maintainer/scripts/secret-scanning.mjs
```

该脚本执行以下安全规范：

- 所有警报获取使用 `hide_secret=true`（stdout 中无明文秘密）
- 所有临时文件使用带随机 UUID 的 `mktemp`
- 所有正文上传使用 `-F body=@file`（无内联 shell 引用）
- 通知模板按位置类型分支
- 从不将 `.secret` 或 `.body` 打印到 stdout

## 总体流程

支持单个或多个警报。对于多个警报，按升序处理。

对于每个警报：

1. **识别** — `fetch-alert` + `fetch-content` 获取元数据和正文
2. **决策** — 智能体读取正文文件，识别所有秘密，生成编辑版本
3. **编辑** — 对 issue/PR 正文使用 `redact-body`；评论直接跳过删除
4. **清除** — 评论使用 `delete-comment` + `recreate-comment`；正文历史无法清除
5. **通知** — `notify` 根据位置类型发布正确的模板
6. **解决** — `resolve` 关闭警报
7. **摘要** — `summary` 打印格式化结果

## 第 1 步：识别

```bash
# 列出所有开放警报
node secret-scanning.mjs list-open

# 获取特定警报元数据 + 位置
node secret-scanning.mjs fetch-alert <NUMBER>

# 为每个位置获取内容（将正文保存到临时文件）
node secret-scanning.mjs fetch-content '<location-json>'
```

`fetch-content` 输出包含：

- `body_file`：包含完整正文内容的临时文件路径
- `author`：发布者
- `issue_number` / `pr_number`：位置
- `edit_history_count`：现有编辑次数
- `type`：路由的位置类型

### 位置类型路由

| 类型                          | 流程                               |
| ----------------------------- | ---------------------------------- |
| `issue_comment`               | 评论：删除+重新创建                |
| `pull_request_comment`        | 评论：删除+重新创建                |
| `pull_request_review_comment` | 评论：删除+重新创建                |
| `discussion_comment`          | 讨论评论：删除+重新创建（GraphQL） |
| `issue_body`                  | 正文：就地编辑                     |
| `pull_request_body`           | 正文：就地编辑                     |
| `commit`                      | 仅通知                             |
| 其他                          | 跳过并报告                         |

## 第 2 步：决策（智能体）

智能体读取 `fetch-content` 输出的正文文件，然后：

1. 识别内容中的所有秘密（可能比警报标记的更多）
2. 将每个秘密替换为 `[REDACTED <secret_type>]` — **无部分值，无前缀/后缀**
3. 将编辑内容保存到新的临时文件

这是唯一需要语义理解的步骤。其余所有步骤都是机械的。

## 第 3 步：编辑

### 对于评论（issue_comment / PR 评论）

**不要编辑。** 直接跳到第 4 步（删除 + 重新创建）。在删除之前 PATCH 会创建不必要的编辑历史记录。

### 对于 issue_body / pull_request_body

```bash
node secret-scanning.mjs redact-body <issue|pr> <NUMBER> <redacted-body-file>
```

## 第 4 步：清除编辑历史

### 评论 — 删除和重新创建

```bash
# 删除原始评论（所有编辑历史消失）
node secret-scanning.mjs delete-comment <COMMENT_ID>

# 用编辑内容重新创建
node secret-scanning.mjs recreate-comment <ISSUE_NUMBER> <body-file>
```

重新创建的评论应遵循此格式：

```
> **Note:** The original comment by @<AUTHOR> has been removed due to secret leakage. Below is the redacted version of the original content.

---

<编辑后的原始内容>
```

### issue_body / pull_request_body — 无法清除

编辑会创建带有编辑前明文的编辑历史记录。这无法通过 API 清除。

**仅输出到维护者终端（绝不在公开评论中）：**

```
⚠️ Issue/PR 正文编辑历史仍包含明文秘密。
联系 GitHub 支持清除：https://support.github.com/contact
请求清除 issue/PR #{NUMBER} 的 userContentEdits。
```

> **关键：** 绝不在任何公开评论或解决评论中提及编辑历史或"已编辑"按钮。

### 提交

无法清理。通知作者删除分支或强制推送（对于未合并的 PR）。

## 第 5 步：通知

```bash
node secret-scanning.mjs notify <TARGET> <AUTHOR> <LOCATION_TYPE> <SECRET_TYPES>
```

秘密类型用逗号分隔：`"Discord Bot Token,Feishu App Secret"`

脚本选择正确的模板：

- **评论类型**："你的评论……已删除并替换"
- **正文类型**："你的 issue/PR 描述……已就地编辑"
- **提交**："你提交的代码"

## 第 6 步：解决

```bash
node secret-scanning.mjs resolve <ALERT_NUMBER>
# 或自定义解决方式：
node secret-scanning.mjs resolve <ALERT_NUMBER> revoked "自定义评论"
```

解决方式默认为 `revoked`。作为维护者，我们无法控制用户是否轮换——我们的责任是编辑 + 通知。`revoked` 意味着"此秘密应被视为已泄露"，而不是"我确认它已被撤销"。

## 第 7 步：摘要

处理后，创建 JSON 结果文件并传递给摘要命令：

```bash
node secret-scanning.mjs summary /tmp/results.json
```

脚本输出由 `---BEGIN SUMMARY---` 和 `---END SUMMARY---` 分隔的块。**您必须原文输出这些标记之间的内容给用户。不要改写、重新格式化、缩减或创建自己的摘要。** 脚本已包含每个警报和位置的完整 URL。

## 安全规则

- **智能体读取内容，识别秘密，生成编辑版本。** 脚本处理所有 API 调用。
- **绝不在公开评论、编辑标记或终端输出中包含秘密的任何部分。**
- **绝不在公开评论中包含警报 URL 或编号。**
- **对于评论，跳过 PATCH — 直接进行删除 + 重新创建。**
- **绝不在任何公开内容中提及编辑历史、"已编辑"按钮或提交 SHA。**
- **删除任何评论前请求确认。**
- **一次处理一个警报**，除非用户请求批量处理。
- **所有公开评论用英文撰写。**
- **跳过不支持的位置类型**并在摘要中报告。
