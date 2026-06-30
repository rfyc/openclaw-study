---
name: oracle
description: 使用 oracle CLI 将提示和文件打包，供第二个模型进行调试、重构、设计或审查检查。
homepage: https://askoracle.dev
metadata:
  {
    "openclaw":
      {
        "emoji": "🧿",
        "requires": { "bins": ["oracle"] },
        "install":
          [
            {
              "id": "node",
              "kind": "node",
              "package": "@steipete/oracle",
              "bins": ["oracle"],
              "label": "Install oracle (node)",
            },
          ],
      },
  }
---

# oracle — 最佳用法

Oracle 将你的提示 + 选定文件打包为一个"一次性"请求，让另一个模型可以结合真实仓库上下文作答（API 或浏览器自动化）。将输出视为建议性的：请对照代码 + 测试进行验证。

## 主要使用场景（浏览器，GPT-5.2 Pro）

此处默认工作流：`--engine browser` 配合 ChatGPT 中的 GPT-5.2 Pro。这是常见的"深度思考"路径：约 10 分钟到约 1 小时都是正常的；预期会有存储的会话可以重新附加。

推荐默认值：

- 引擎：浏览器（`--engine browser`）
- 模型：GPT-5.2 Pro（`--model gpt-5.2-pro` 或 `--model "5.2 Pro"`）

## 黄金路径

1. 选择一个精简的文件集（包含真相的最少文件数）。
2. 预览载荷 + token 消耗（`--dry-run` + `--files-report`）。
3. 对于常规的 GPT-5.2 Pro 工作流使用浏览器模式；仅在明确需要时才使用 API。
4. 如果运行断开/超时：重新附加到存储的会话（不要重新运行）。

## 命令（首选）

- 帮助：
  - `oracle --help`
  - 如果未安装二进制文件：`npx -y @steipete/oracle --help`（此处避免使用 `pnpx`；sqlite 绑定问题）。

- 预览（不消耗 token）：
  - `oracle --dry-run summary -p "<task>" --file "src/**" --file "!**/*.test.*"`
  - `oracle --dry-run full -p "<task>" --file "src/**"`

- Token 检查：
  - `oracle --dry-run summary --files-report -p "<task>" --file "src/**"`

- 浏览器运行（主路径；长时间运行是正常的）：
  - `oracle --engine browser --model gpt-5.2-pro -p "<task>" --file "src/**"`

- 手动粘贴备用方案：
  - `oracle --render --copy -p "<task>" --file "src/**"`
  - 注意：`--copy` 是 `--copy-markdown` 的隐藏别名。

## 附加文件（`--file`）

`--file` 接受文件、目录和 glob。可多次传入；条目可用逗号分隔。

- 包含：
  - `--file "src/**"`
  - `--file src/index.ts`
  - `--file docs --file README.md`

- 排除：
  - `--file "src/**" --file "!src/**/*.test.ts" --file "!**/*.snap"`

- 默认值（实现行为）：
  - 默认忽略的目录：`node_modules`、`dist`、`coverage`、`.git`、`.turbo`、`.next`、`build`、`tmp`（除非明确作为字面目录/文件传入，否则跳过）。
  - 展开 glob 时遵循 `.gitignore`。
  - 不跟随符号链接。
  - 除非通过模式选择加入（如 `--file ".github/**"`），否则过滤点文件。
  - 超过 1 MB 的文件被拒绝。

## 引擎（API vs 浏览器）

- 自动选择：设置了 `OPENAI_API_KEY` 时使用 `api`；否则使用 `browser`。
- 浏览器仅支持 GPT + Gemini；对于 Claude/Grok/Codex 或多模型运行使用 `--engine api`。
- 浏览器附件：
  - `--browser-attachments auto|never|always`（auto 模式下内联粘贴最多约 6 万字符，然后上传）。
- 远程浏览器主机：
  - 主机端：`oracle serve --host 0.0.0.0 --port 9473 --token <secret>`
  - 客户端：`oracle --engine browser --remote-host <host:port> --remote-token <secret> -p "<task>" --file "src/**"`

## 会话 + slug

- 存储在 `~/.oracle/sessions` 下（可通过 `ORACLE_HOME_DIR` 覆盖）。
- 运行可能断开或耗时较长（浏览器 + GPT-5.2 Pro 经常如此）。如果 CLI 超时：不要重新运行；重新附加。
  - 列表：`oracle status --hours 72`
  - 附加：`oracle session <id> --render`
- 使用 `--slug "<3-5个词>"` 保持会话 ID 可读性。
- 存在重复提示保护；仅在确实需要全新运行时才使用 `--force`。

## 高信号提示模板

Oracle 开始时对你的项目一无所知。假设模型无法推断你的技术栈、构建工具、约定或"显而易见"的路径。包含：

- 项目简介（技术栈 + 构建/测试命令 + 平台约束）。
- "功能所在位置"（关键目录、入口点、配置文件、边界）。
- 确切问题 + 你尝试过的方法 + 错误文字（原文）。
- 约束条件（"不要更改 X"、"必须保持公共 API"等）。
- 期望的输出（"返回补丁计划 + 测试"、"给出带权衡的 3 个选项"）。

## 安全性

- 默认不附加密钥（`.env`、密钥文件、身份验证 token）。积极脱敏；仅共享必要的内容。

## "穷举提示"恢复模式

对于长期调查，编写一个独立的提示 + 文件集，以便几天后重新运行：

- 6-30 句的项目简介 + 目标。
- 复现步骤 + 精确错误 + 你尝试过的方法。
- 附加所有需要的上下文文件（入口点、配置、关键模块、文档）。

Oracle 运行是一次性的；模型不记得之前的运行。"恢复上下文"意味着使用相同的提示 + `--file …` 集重新运行（或重新附加仍在运行的存储会话）。
