---
name: wiki-maintainer
description: 维护带有确定性页面、托管块和来源支持更新的 OpenClaw 记忆 Wiki 库。
---

在记忆 Wiki 库中工作时使用此技能。

- 当需要了解库模式、路径或 Obsidian CLI 可用性时，优先先使用 `wiki_status`。
- 当共享记忆工具可用且你想要跨持久记忆和编译 Wiki 进行一次召回传递时，优先使用带 `corpus=all` 的 `memory_search`。
- 使用 `wiki_search` 在需要 Wiki 特定排名/来源溯源时发现候选页面，然后使用 `wiki_get` 在编辑或引用之前检查确切的页面。
- 当工具级别的变更足够时，使用 `wiki_apply` 进行精确的合成归档和元数据更新。
- 在有意义的 Wiki 更新后运行 `wiki_lint`，以便在信任库之前暴露矛盾、来源缺口和开放问题。
- 使用 `openclaw wiki ingest`、`openclaw wiki compile` 和 `openclaw wiki lint` 作为默认维护循环。
- 在 `bridge` 模式中，如果需要拉入最新的公共记忆工件，在依赖搜索结果之前运行 `openclaw wiki bridge import`。
- 在 `unsafe-local` 模式中，仅在用户明确选择加入私有本地路径访问时使用 `openclaw wiki unsafe-local import`。
- 将生成的部分保留在托管标记内。不要覆盖人工笔记块。
- 将原始来源、记忆工件和每日笔记视为证据。不要让 Wiki 页面成为新声明的唯一事实来源。
- 保持页面标识稳定。倾向于更新现有实体和概念，而不是生成名称略有不同的重复项。
- 创建或刷新索引时，如果库渲染模式为 `obsidian`，保留 Obsidian 友好的 Wikilinks。
