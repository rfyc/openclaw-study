---
summary: "仓库脚本：用途、范围和安全说明"
read_when:
  - 从仓库运行脚本
  - 添加或更改 ./scripts 下的脚本
title: "脚本"
---

`scripts/` 目录包含用于本地工作流和运维任务的辅助脚本。
当任务明确与脚本相关时，使用这些脚本；否则优先使用 CLI。

## 约定

- 脚本是**可选的**，除非在文档或发布清单中有引用。
- 当 CLI 界面存在时，优先使用（例如：身份验证监控使用 `openclaw models status --check`）。
- 假设脚本是特定于主机的；在新机器上运行之前先阅读它们。

## 身份验证监控脚本

身份验证监控在[身份验证](/gateway/authentication)中有介绍。`scripts/` 下的脚本是 systemd/Termux 手机工作流的可选附加功能。

## GitHub 读取辅助工具

当你希望 `gh` 使用 GitHub App 安装令牌进行仓库范围的读取调用，同时将普通 `gh` 保留在你的个人登录用于写入操作时，使用 `scripts/gh-read`。

必需的环境变量：

- `OPENCLAW_GH_READ_APP_ID`
- `OPENCLAW_GH_READ_PRIVATE_KEY_FILE`

可选的环境变量：

- `OPENCLAW_GH_READ_INSTALLATION_ID`：当你想跳过基于仓库的安装查找时
- `OPENCLAW_GH_READ_PERMISSIONS`：作为逗号分隔的覆盖，用于请求的读取权限子集

仓库解析顺序：

- `gh ... -R owner/repo`
- `GH_REPO`
- `git remote origin`

示例：

- `scripts/gh-read pr view 123`
- `scripts/gh-read run list -R openclaw/openclaw`
- `scripts/gh-read api repos/openclaw/openclaw/pulls/123`

## 添加脚本时

- 保持脚本集中且有文档记录。
- 在相关文档中添加简短条目（如果缺少则创建一个）。

## 相关链接

- [测试](/help/testing)
- [实时测试](/help/testing-live)
