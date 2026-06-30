---
name: obsidian-vault-maintainer
description: 维护具有 Wikilinks、frontmatter 和官方 Obsidian CLI 感知的 Obsidian 友好记忆 Wiki 库。
---

当记忆 Wiki 库渲染模式为 `obsidian` 或用户希望 Wiki 与 Obsidian 良好配合时，使用此技能。

- 从 `openclaw wiki status` 开始以确认库模式以及官方 Obsidian CLI 是否可用。
- 在执行 Shell 命令之前使用 `openclaw wiki obsidian status`，然后优先使用专用辅助工具，如 `openclaw wiki obsidian search`、`openclaw wiki obsidian open`、`openclaw wiki obsidian command` 和 `openclaw wiki obsidian daily`。
- 优先使用 `[[Wikilinks]]`、稳定的文件名以及适用于 Obsidian 仪表板和 Dataview 样式查询的 frontmatter。
- 保持生成的部分确定性，以便 Obsidian 用户可以安全地在其周围添加手写笔记。
- 如果官方 Obsidian CLI 已启用，在依赖它之前先探测它。不要假设应用程序已安装、正在运行或已配置。
- 避免破坏性重命名，除非你也有链接修复计划。
