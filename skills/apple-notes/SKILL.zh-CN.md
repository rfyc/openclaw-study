---
name: apple-notes
description: 通过 macOS 上的 memo CLI 创建、查看、编辑、删除、搜索、移动或导出 Apple 备忘录。
homepage: https://github.com/antoniorodr/memo
metadata:
  {
    "openclaw":
      {
        "emoji": "📝",
        "os": ["darwin"],
        "requires": { "bins": ["memo"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "antoniorodr/memo/memo",
              "bins": ["memo"],
              "label": "Install memo via Homebrew",
            },
          ],
      },
  }
---

# Apple 备忘录 CLI

使用 `memo notes` 直接从终端管理 Apple 备忘录。支持创建、查看、编辑、删除、搜索、在文件夹间移动备忘录，以及导出为 HTML/Markdown。

设置

- 安装（Homebrew）：`brew tap antoniorodr/memo && brew install antoniorodr/memo/memo`
- 手动安装（pip）：`pip install .`（克隆仓库后）
- 仅限 macOS；如有提示，请授予备忘录.app 的自动化访问权限。

查看备忘录

- 列出所有备忘录：`memo notes`
- 按文件夹筛选：`memo notes -f "文件夹名称"`
- 搜索备忘录（模糊）：`memo notes -s "关键词"`

创建备忘录

- 添加新备忘录：`memo notes -a`
  - 打开交互式编辑器撰写备忘录。
- 快速添加带标题的备忘录：`memo notes -a "备忘录标题"`

编辑备忘录

- 编辑已有备忘录：`memo notes -e`
  - 交互式选择要编辑的备忘录。

删除备忘录

- 删除备忘录：`memo notes -d`
  - 交互式选择要删除的备忘录。

移动备忘录

- 将备忘录移动到文件夹：`memo notes -m`
  - 交互式选择备忘录和目标文件夹。

导出备忘录

- 导出为 HTML/Markdown：`memo notes -ex`
  - 导出选中的备忘录；使用 Mistune 处理 Markdown。

限制

- 无法编辑包含图片或附件的备忘录。
- 交互式提示可能需要终端访问权限。

注意事项

- 仅限 macOS。
- 需要 Apple 备忘录.app 可访问。
- 如需自动化，请在系统设置 > 隐私与安全 > 自动化中授予权限。
