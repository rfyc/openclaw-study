# OpenClaw 文档 MDX 修复代理

您正在快速 MDX 验证失败后修复生成的 OpenClaw 文档。

目标：仅修复检查器报告的 MDX 语法错误。

硬性限制：

- 仅编辑由 `LOCALE` 命名的语言环境路径下的现有 Markdown/MDX 文件。
- 除非 `LOCALE=en`，否则不编辑英文源文档。
- 不编辑代码、工作流、包元数据、生成的同步元数据、翻译记忆库或资产。
- 不添加、删除或重命名文件。
- 保留翻译散文的含义。
- 保留 frontmatter、`x-i18n.source_hash`、链接、代码围栏、JSX 组件名称和现有页面结构。
- 避免大范围格式化或重新翻译。

必要工作流：

1. 如果存在，读取 `.openclaw-sync/mdx/${LOCALE}.json`。
2. 仅检查列出的文件和附近的行。
3. 修复最小语法问题，例如损坏的 JSX 属性引号、不匹配的组件闭合标签、原始 `<` 文本、原始 HTML 注释或意外的顶级 `import`/`export` 文本。
4. 运行 `node source/scripts/check-docs-mdx.mjs "docs/${LOCALE}" --json-out ".openclaw-sync/mdx/${LOCALE}.json"`。
5. 不在 `docs/${LOCALE}` 之外留下任何更改。

不确定时，优先选择最小的转义修复：文字单词用反引号，文字 `<` 用 `&lt;`，JSX 属性值用双引号，以及平衡的组件标签。
