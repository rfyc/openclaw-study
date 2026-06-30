---
name: obsidian
description: 管理 Obsidian 知识库（纯 Markdown 笔记）并通过 obsidian-cli 自动化操作。
homepage: https://help.obsidian.md
metadata:
  {
    "openclaw":
      {
        "emoji": "💎",
        "requires": { "bins": ["obsidian-cli"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "yakitrak/yakitrak/obsidian-cli",
              "bins": ["obsidian-cli"],
              "label": "Install obsidian-cli (brew)",
            },
          ],
      },
  }
---

# Obsidian

Obsidian 知识库 = 磁盘上的普通文件夹。

知识库结构（典型）

- 笔记：`*.md`（纯文本 Markdown；可用任何编辑器编辑）
- 配置：`.obsidian/`（工作空间 + 插件设置；通常不通过脚本修改）
- 画布：`*.canvas`（JSON 格式）
- 附件：你在 Obsidian 设置中选择的文件夹（图片/PDF 等）

## 找到活跃知识库

Obsidian 桌面端在此处追踪知识库（权威来源）：

- `~/Library/Application Support/obsidian/obsidian.json`

`obsidian-cli` 从该文件解析知识库；知识库名称通常是**文件夹名称**（路径后缀）。

快速查询"哪个知识库处于活跃状态/笔记在哪里？"

- 如果已设置默认值：`obsidian-cli print-default --path-only`
- 否则，读取 `~/Library/Application Support/obsidian/obsidian.json` 并使用带有 `"open": true` 的知识库条目。

注意事项

- 多个知识库很常见（iCloud vs `~/Documents`、工作/个人等）。不要猜测；读取配置。
- 避免在脚本中写入硬编码的知识库路径；优先读取配置或使用 `print-default`。

## obsidian-cli 快速开始

选择默认知识库（一次性）：

- `obsidian-cli set-default "<vault-folder-name>"`
- `obsidian-cli print-default` / `obsidian-cli print-default --path-only`

搜索

- `obsidian-cli search "query"`（笔记名称）
- `obsidian-cli search-content "query"`（笔记内容；显示片段 + 行号）

创建

- `obsidian-cli create "Folder/New note" --content "..." --open`
- 需要 Obsidian URI 处理器（`obsidian://…`）正常工作（已安装 Obsidian）。
- 避免通过 URI 在"隐藏"点文件夹（如 `.something/...`）下创建笔记；Obsidian 可能拒绝。

移动/重命名（安全重构）

- `obsidian-cli move "old/path/note" "new/path/note"`
- 更新知识库中的 `[[wikilinks]]` 和常见 Markdown 链接（这是相比 `mv` 的主要优势）。

删除

- `obsidian-cli delete "path/note"`

适时优先直接编辑：打开 `.md` 文件并修改；Obsidian 会自动检测到变化。
