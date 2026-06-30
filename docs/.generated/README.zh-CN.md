# 生成的文档构件

SHA-256 哈希文件是用于追踪漂移检测的构件。完整的 JSON
基准文件在本地生成（已被 gitignore），仅供检查使用。

**已追踪（提交到 git）：**

- `config-baseline.sha256` — 配置基准 JSON 构件的哈希值。
- `plugin-sdk-api-baseline.sha256` — 插件 SDK API 基准构件的哈希值。

**仅限本地（已被 gitignore）：**

- `config-baseline.json`、`config-baseline.core.json`、`config-baseline.channel.json`、`config-baseline.plugin.json`
- `plugin-sdk-api-baseline.json`、`plugin-sdk-api-baseline.jsonl`

请勿手动编辑以上任何文件。

- 重新生成配置基准：`pnpm config:docs:gen`
- 验证配置基准：`pnpm config:docs:check`
- 重新生成插件 SDK API 基准：`pnpm plugin-sdk:api:gen`
- 验证插件 SDK API 基准：`pnpm plugin-sdk:api:check`
