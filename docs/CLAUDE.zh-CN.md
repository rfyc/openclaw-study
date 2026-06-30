# 文档指南

本目录负责文档编写、Mintlify 链接规则和文档 i18n 策略。

## Mintlify 规则

- 文档托管在 Mintlify（`https://docs.openclaw.ai`）上。
- `docs/**/*.md` 中的内部文档链接必须保持根相对路径，且不带 `.md` 或 `.mdx` 后缀（例如：`[配置](/gateway/configuration)`）。
- 章节交叉引用应在根相对路径上使用锚点（例如：`[Hooks](/gateway/configuration-reference#hooks)`）。
- 文档标题应避免使用破折号和撇号，因为 Mintlify 的锚点生成在这些地方容易出错。
- README 和其他 GitHub 渲染的文档应保留绝对文档 URL，以便链接在 Mintlify 之外也能正常工作。
- 文档内容必须保持通用性：不包含个人设备名称、主机名或本地路径；请使用 `user@gateway-host` 等占位符。

## 文档内容规则

- 对于文档、UI 文案和选择器列表，除非该部分明确描述运行时顺序或自动检测顺序，否则应按字母顺序排列服务/提供商。
- 保持捆绑插件命名与根 `AGENTS.md` 中仓库范围的插件术语规则一致。

## 文档 i18n

- 外语文档不在本仓库中维护。生成的发布输出存放在单独的 `openclaw/docs` 仓库中（通常在本地克隆为 `../openclaw-docs`）。
- 请勿在此处添加或编辑 `docs/<locale>/**` 下的本地化文档。
- 将本仓库中的英文文档与词汇表文件视为事实来源。
- 流程：在此处更新英文文档，根据需要更新 `docs/.i18n/glossary.<locale>.json`，然后让发布仓库的同步和 `scripts/docs-i18n` 在 `openclaw/docs` 中运行。
- 在重新运行 `scripts/docs-i18n` 之前，为任何新的技术术语、页面标题或必须保留英文或使用固定翻译的简短导航标签添加词汇表条目。
- `pnpm docs:check-i18n-glossary` 是用于检查已更改的英文文档标题和简短内部文档标签的守卫。
- 翻译记忆存放在发布仓库中生成的 `docs/.i18n/*.tm.jsonl` 文件中。
- 参见 `docs/.i18n/README.md`。
