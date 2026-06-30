# AGENTS.MD

电报风格。仅根目录规则。在子树工作前阅读范围内的 `AGENTS.md`。

## 开始

- 仓库：`https://github.com/openclaw/openclaw`
- 回复：仅使用仓库根相对路径引用：`extensions/telegram/src/index.ts:80`。不使用绝对路径，不使用 `~/`。
- 首先运行文档列表：如果可用，运行 `pnpm docs:list`；仅阅读相关文档。
- 修复/分类时仅提供高置信度答案：在决定前验证源代码、测试、已发布/当前行为和依赖合约。
- 依赖支持的行为：首先阅读上游依赖项文档/源代码/类型。不假设 API、默认值、错误、时序或运行时行为。
- 可行时进行实时验证。在假设实时测试被阻止之前检查 env/`~/.profile` 中的密钥；保持机密输出已脱敏。
- 缺少依赖项：`pnpm install`，重试一次，然后报告第一个可操作错误。
- CODEOWNERS：维护/重构/测试可以。更大的行为/产品/安全/所有权变更：请向所有者请求/审查。
- 措辞：产品/文档/UI/变更日志使用"plugin/plugins"；`extensions/` 是内部词汇。
- 新频道/插件/应用/文档表面：更新 `.github/labeler.yml` + GH 标签。
- 新 `AGENTS.md`：添加同级 `CLAUDE.md` 符号链接。

## 地图

- 核心 TS：`src/`、`ui/`、`packages/`；插件：`extensions/`；SDK：`src/plugin-sdk/*`；频道：`src/channels/*`；加载器：`src/plugins/*`；协议：`src/gateway/protocol/*`；文档/应用：`docs/`、`apps/`。
- 安装程序：同级 `../openclaw.ai`。
- 范围指南存在于：`extensions/`、`src/{plugin-sdk,channels,plugins,gateway,gateway/protocol,agents}/`、`test/helpers*/`、`docs/`、`ui/`、`scripts/`。

（此文件内容与 AGENTS.md 相同 — 这是一个符号链接）
