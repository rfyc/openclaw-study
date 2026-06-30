---
name: security-triage
description: 对 OpenClaw 安全公告、草稿和 GHSA 报告进行分类，并提供已发布标签和信任模型证明。
---

# 安全分类

在审查 OpenClaw 安全公告、草稿或 GHSA 报告时使用。

目标：在不过度关闭真实问题或发布不必要回归的情况下，实现高置信度的维护者分类。

## 关闭标准

只有以下情况之一为真时才关闭：

- 与现有公告或已修复问题重复
- 与已发布行为不符
- 不在 `SECURITY.md` 的范围内
- 在任何受影响的发布/标签之前已修复

不要仅仅因为 `main` 上已修复就关闭。如果最新发布的标签或 npm 版本受影响，请保持开放直到以正确状态发布或发布。

## 必读内容

在回答之前：

1. 阅读 `SECURITY.md`。
2. 使用 `gh api /repos/openclaw/openclaw/security-advisories/<GHSA>` 读取 GHSA 正文。
3. 检查具体涉及的代码路径。
4. 验证已发布状态：
   - `git tag --sort=-creatordate | head`
   - `npm view openclaw version --userconfig "$(mktemp)"`
   - `git tag --contains <fix-commit>`
   - 如需要：`git show <tag>:path/to/file`
5. 搜索规范重叠：
   - 现有已发布的 GHSA
   - 较旧的已修复 bug
   - `SECURITY.md` 中已涵盖的相同信任模型类别

## 审查方法

对于每个公告，决定：

- `close`（关闭）
- `keep open`（保持开放）
- `keep open but narrow`（保持开放但缩小范围）

当涉及评论/关闭时，默认每次处理一个公告：

1. 仅审查一个 GHSA。
2. 首先打印 GHSA URL。
3. 总结决定和证据以供讨论。
4. 起草一条维护者就绪的评论。
5. 仅将那一条评论复制到剪贴板。
6. 停止并等待 Peter 发布/讨论后再进行下一个 GHSA。

除非 Peter 明确要求批量处理，否则不要批量关闭多条评论。

按以下顺序检查：

1. 信任模型
   - 先决条件是否已在受信任的宿主/本地/插件/操作员状态内？
   - `SECURITY.md` 是否明确将此类别列为超出范围或仅限加固？
2. 已发布行为
   - 最新发布的标签或 npm 版本中是否存在该 bug？
   - 是否在发布之前已修复？
3. 利用路径
   - 报告是否展示了真实的边界绕过，而不仅仅是提示注入、本地同用户控制或辅助级语义？
   - 如果数据仅在 `SECURITY.md` 中提到的受信任工作空间内存文件之间移动，不要仅凭"注入标记"将其视为安全 bug。
   - 在这种情况下，仅在能保留预期内存工作流的前提下，将清理作为可选加固建议。
4. 功能权衡
   - 如果加固变更会减少预期用户功能，在建议之前说明这一点。
   - 优先选择保留用户工作流的修复，而非默认拒绝的回归，除非边界要求如此。
5. 加固跟进
   - 即使 GHSA 应该关闭，也要询问是否有狭窄的加固变更能减少问题，而不改变已记录的信任边界。
   - 将加固与漏洞状态分开。将其表述为"不是 GHSA 关闭所必需的，但值得考虑"。
   - 仅在加固具体、低风险且保留预期维护者/操作员工作流时才提出。
   - 如果加固需要产品/安全模型变更，明确说明，不要暗示这是关闭所必需的修复。

## 响应格式

准备维护者就绪的关闭回复时：

1. 首先打印 GHSA URL。
2. 然后起草维护者可以发布的详细回复。
3. 包含：
   - 关闭的确切原因
   - 确切的代码引用
   - 确切的已发布标签/版本事实
   - 适用时的确切修复提交或规范重复 GHSA
   - 仅在值得且保留功能的情况下，提供可选的加固说明

保持语气坚定、具体、不防御性。

## 讨论模式

当 Peter 手动发布 GHSA 评论时，使用此流程：

1. 显示 URL。
2. 给出简洁的判断（`close`、`keep open` 或 `keep open but narrow`）。
3. 列出最有力的证据要点。
4. 将任何可选的加固跟进与关闭原因分开陈述。
5. 使用 `pbcopy` 复制拟议的评论正文。
6. 在一个公告之后结束回复。不要在 Peter 说继续之前进行下一个公告。

如果 GitHub API 无法对私有公告发表评论，说明一次并继续使用剪贴板/UI 粘贴。

## 剪贴板步骤

为当前公告起草最终发布正文后，复制它：

```bash
pbcopy <<'EOF'
<最终响应>
EOF
```

告知用户剪贴板中现在包含该公告的拟议回复。

## 有用命令

```bash
gh api /repos/openclaw/openclaw/security-advisories/<GHSA>
gh api /repos/openclaw/openclaw/security-advisories --paginate
git tag --sort=-creatordate | head -n 20
npm view openclaw version --userconfig "$(mktemp)"
git tag --contains <commit>
git show <tag>:<path>
gh search issues --repo openclaw/openclaw --match title,body,comments -- "<terms>"
gh search prs --repo openclaw/openclaw --match title,body,comments -- "<terms>"
```

## 决策说明

- "在 main 上已修复，未发布"通常不是关闭的理由。
- "需要攻击者控制受信任的本地状态优先"通常超出范围。
- "同一宿主、同一用户的进程已经可以读/写本地状态"通常超出范围。
- "受信任的工作空间内存推广/重新索引受信任的工作空间内存"通常超出范围，除非它跨越了文档化的边界。
- "辅助函数的行为与文档化的配置语义不同"通常无效。
- 如果只是严重性错误但 bug 是真实的，保持开放并在回复中缩小影响范围。
