# OpenClaw 文档 i18n 资源

本文件夹存储源文档仓库的翻译配置。

生成的语言树和实时翻译记忆现已迁移到发布仓库：

- 仓库：`openclaw/docs`
- 本地检出：`~/Projects/openclaw-docs`

## 事实来源

- 英文文档在 `openclaw/openclaw` 中编写。
- 源文档树位于 `docs/` 下。
- 源仓库不再保留已提交的生成语言树，例如 `docs/zh-CN/**`、`docs/zh-TW/**`、`docs/ja-JP/**`、`docs/es/**`、`docs/pt-BR/**`、`docs/ko/**`、`docs/de/**`、`docs/fr/**`、`docs/ar/**`、`docs/it/**`、`docs/vi/**`、`docs/nl/**`、`docs/fa/**`、`docs/tr/**`、`docs/uk/**`、`docs/id/**`、`docs/pl/**` 或 `docs/th/**`。

## 端到端流程

1. 在 `openclaw/openclaw` 中编辑英文文档。
2. 推送到 `main`。
3. `openclaw/openclaw/.github/workflows/docs-sync-publish.yml` 将文档树镜像到 `openclaw/docs`。
4. 同步脚本重写发布仓库的 `docs/docs.json`，使生成的语言选择器块存在于该仓库中，即使它们不再提交到源仓库。
5. `openclaw/docs/.github/workflows/translate-zh-cn.yml` 每日、按需以及在源仓库发布调度后刷新 `docs/zh-CN/**`。
6. `openclaw/docs/.github/workflows/translate-zh-tw.yml` 和 `translate-ja-jp.yml` 对 `docs/zh-TW/**` 和 `docs/ja-JP/**` 执行相同操作。
7. `openclaw/docs/.github/workflows/translate-es.yml`、`translate-pt-br.yml`、`translate-ko.yml`、`translate-de.yml`、`translate-fr.yml`、`translate-ar.yml`、`translate-it.yml`、`translate-vi.yml`、`translate-nl.yml`、`translate-fa.yml`、`translate-tr.yml`、`translate-uk.yml`、`translate-id.yml`、`translate-pl.yml` 和 `translate-th.yml` 分别对 `docs/es/**`、`docs/pt-BR/**`、`docs/ko/**`、`docs/de/**`、`docs/fr/**`、`docs/ar/**`、`docs/it/**`、`docs/vi/**`、`docs/nl/**`、`docs/fa/**`、`docs/tr/**`、`docs/uk/**`、`docs/id/**`、`docs/pl/**` 和 `docs/th/**` 执行相同操作。

## 为何采用拆分方式

- 将生成的语言输出从主产品仓库中分离出来。
- 让 Mintlify 保持在单一发布文档树上。
- 通过让发布仓库拥有生成的语言树，保留 Mintlify 对受支持生成语言的内置语言切换器。
- 保留生成的泰文（`th`）和波斯文（`fa`）文档及翻译记忆，即使 Mintlify 目前不接受这些代码用于 `navigation.languages`。它们不出现在内置文档语言选择器中是宿主限制，而非翻译运行失败。

## 语言可见性

- Control UI 支持 `en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`、`ja-JP`、`ko`、`fr`、`ar`、`it`、`tr`、`uk`、`id`、`pl`、`th`、`vi`、`nl` 和 `fa`。
- 文档翻译工作流在 `openclaw/docs` 中生成相同的非英语语言集。
- Mintlify 文档语言选择器只能公开 Mintlify `navigation.languages` 接受的语言；目前包括越南文（`vi`）和荷兰文（`nl`），但不包括泰文（`th`）或波斯文（`fa`）。
- 不要将生成的 `docs/docs.json` 中缺少 `th` 或 `fa` 条目视为流水线失败。请改为在 `openclaw/docs` 中验证其生成的文件夹。

## 本文件夹中的文件

- `glossary.<lang>.json` — 用作提示词指引的首选术语映射。
- `zh-Hans-navigation.json` — 在同步期间重新插入发布仓库的精心策划的 zh-Hans Mintlify 语言导航。
- `ar-navigation.json`、`de-navigation.json`、`es-navigation.json`、`fr-navigation.json`、`id-navigation.json`、`it-navigation.json`、`ja-navigation.json`、`ko-navigation.json`、`pl-navigation.json`、`pt-BR-navigation.json` 和 `tr-navigation.json` — 与源仓库一同保存的初始语言元数据，但发布同步现在会为克隆英文语言的各语言克隆完整的英文导航树，使翻译后的页面在 Mintlify 中可见，无需手动维护各语言的导航 JSON。
- `<lang>.tm.jsonl` — 按工作流 + 模型 + 文本哈希值作为键的翻译记忆。

在本仓库中，生成的语言翻译记忆文件（如 `docs/.i18n/zh-CN.tm.jsonl`、`docs/.i18n/zh-TW.tm.jsonl`、`docs/.i18n/ja-JP.tm.jsonl`、`docs/.i18n/es.tm.jsonl`、`docs/.i18n/pt-BR.tm.jsonl`、`docs/.i18n/ko.tm.jsonl`、`docs/.i18n/de.tm.jsonl`、`docs/.i18n/fr.tm.jsonl`、`docs/.i18n/ar.tm.jsonl`、`docs/.i18n/it.tm.jsonl`、`docs/.i18n/vi.tm.jsonl`、`docs/.i18n/nl.tm.jsonl`、`docs/.i18n/fa.tm.jsonl`、`docs/.i18n/tr.tm.jsonl`、`docs/.i18n/uk.tm.jsonl`、`docs/.i18n/id.tm.jsonl`、`docs/.i18n/pl.tm.jsonl` 和 `docs/.i18n/th.tm.jsonl`）已被有意地不再提交。

## 词汇表格式

`glossary.<lang>.json` 是一个条目数组：

```json
{
  "source": "troubleshooting",
  "target": "故障排除"
}
```

字段说明：

- `source`：首选的英文（或源语言）短语。
- `target`：首选的翻译输出。

## 翻译机制

- `scripts/docs-i18n` 仍然负责翻译生成。
- 文档模式将 `x-i18n.source_hash` 写入每个翻译页面。
- 每个发布工作流通过比较当前英文源哈希与存储的语言 `x-i18n.source_hash` 来预计算待处理文件列表。
- 如果待处理数量为 `0`，则完全跳过昂贵的翻译步骤。
- 如果存在待处理文件，则工作流仅翻译这些文件。
- 发布工作流会重试短暂的模型格式失败，但未更改的文件会被跳过，因为相同的哈希检查在每次重试时都会运行。
- 在发布 GitHub 版本后，源仓库还会调度 zh-CN、zh-TW、ja-JP、es、pt-BR、ko、de、fr、ar、it、vi、nl、fa、tr、uk、id、pl 和 th 的刷新，以便发布文档无需等待每日计划任务即可更新。

## 操作注意事项

- 同步元数据写入发布仓库中的 `.openclaw-sync/source.json`。
- 源仓库密钥：`OPENCLAW_DOCS_SYNC_TOKEN`
- 发布仓库密钥：`OPENCLAW_DOCS_I18N_OPENAI_API_KEY`
- 如果语言输出看起来过时，请先检查 `openclaw/docs` 中对应的 `Translate <locale>` 工作流。
