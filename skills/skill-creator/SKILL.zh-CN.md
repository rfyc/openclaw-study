---
name: skill-creator
description: 创建、编辑、改进、整理、审查、审计或重构 AgentSkill 和 SKILL.md 文件。
---

# Skill 创建工具

本 skill 为创建高效 skill 提供指导。

## 关于 Skill

Skill 是模块化、自包含的软件包，通过提供专业知识、工作流程和工具来扩展 Codex 的能力。可将其理解为特定领域或任务的"入职指南"——它们将 Codex 从通用智能体转变为装备了任何模型都难以完全具备的程序性知识的专业智能体。

### Skill 提供什么

1. 专业工作流程 —— 针对特定领域的多步骤流程
2. 工具集成 —— 处理特定文件格式或 API 的说明
3. 领域专业知识 —— 公司特定知识、数据结构、业务逻辑
4. 捆绑资源 —— 用于复杂和重复任务的脚本、参考资料和资产

## 核心原则

### 简洁为王

上下文窗口是公共资源。Skill 需与 Codex 其他所需内容共享上下文窗口：系统提示、对话历史、其他 Skill 的元数据以及实际用户请求。

**默认假设：Codex 已经非常聪明。** 只添加 Codex 尚不具备的上下文。质疑每条信息："Codex 真的需要这个解释吗？"以及"这段内容值得它所占用的 token 成本吗？"

优先使用简洁示例而非冗长说明。

### 设置适当的自由度

根据任务的脆弱性和可变性匹配具体程度：

**高自由度（基于文本的说明）**：适用于多种方法均有效、决策依赖上下文或启发式方法指导路径的情况。

**中等自由度（伪代码或带参数的脚本）**：适用于存在首选模式、可接受一定变化或配置影响行为的情况。

**低自由度（具体脚本，少量参数）**：适用于操作易出错、一致性至关重要或必须遵循特定顺序的情况。

可将 Codex 想象成在探索路径：悬崖上的窄桥需要具体护栏（低自由度），而开阔地带则允许多条路线（高自由度）。

### Skill 结构

每个 skill 由一个必需的 SKILL.md 文件和可选的捆绑资源组成：

```
skill-name/
├── SKILL.md（必需）
│   ├── YAML frontmatter 元数据（必需）
│   │   ├── name:（必需）
│   │   └── description:（必需）
│   └── Markdown 说明（必需）
└── 捆绑资源（可选）
    ├── scripts/          - 可执行代码（Python/Bash 等）
    ├── references/       - 按需加载到上下文的文档
    └── assets/           - 输出中使用的文件（模板、图标、字体等）
```

#### SKILL.md（必需）

每个 SKILL.md 包含：

- **Frontmatter**（YAML）：包含 `name` 和 `description` 字段。这些是 Codex 决定何时使用该 skill 时唯一读取的字段，因此清晰、全面地描述 skill 的内容及使用时机至关重要。
- **正文**（Markdown）：使用该 skill 的说明和指导。仅在 skill 触发后加载（如果有的话）。

#### 捆绑资源（可选）

##### 脚本（`scripts/`）

用于需要确定性可靠性或反复重写的任务的可执行代码（Python/Bash 等）。

- **何时包含**：当相同代码被反复重写或需要确定性可靠性时
- **示例**：用于 PDF 旋转任务的 `scripts/rotate_pdf.py`
- **优点**：节省 token，确定性，可在不加载到上下文窗口的情况下执行
- **注意**：脚本可能仍需要 Codex 读取以进行修补或特定环境调整

##### 参考资料（`references/`）

文档和参考材料，旨在按需加载到上下文中，为 Codex 的过程和思考提供信息。

- **何时包含**：当 Codex 在工作时应参考的文档时
- **示例**：财务数据结构的 `references/finance.md`，公司 NDA 模板的 `references/mnda.md`，公司政策的 `references/policies.md`，API 规范的 `references/api_docs.md`
- **用途**：数据库结构、API 文档、领域知识、公司政策、详细工作流程指南
- **优点**：保持 SKILL.md 精简，仅在 Codex 认为需要时加载
- **最佳实践**：如果文件较大（超过 10k 字），在 SKILL.md 中包含 grep 搜索模式
- **避免重复**：信息应存在于 SKILL.md 或参考文件中，而非两者都有。除非是 skill 的核心内容，否则优先将详细信息放在参考文件中——这样既能保持 SKILL.md 精简，又能在不占用上下文窗口的情况下使信息可被发现。SKILL.md 中只保留基本的程序说明和工作流程指南；将详细参考材料、数据结构和示例移至参考文件。

##### 资产（`assets/`）

不打算加载到上下文中、而是用于 Codex 产生的输出的文件。

- **何时包含**：当 skill 需要将用于最终输出的文件时
- **示例**：品牌资产的 `assets/logo.png`，PowerPoint 模板的 `assets/slides.pptx`，HTML/React 样板的 `assets/frontend-template/`，排版字体的 `assets/font.ttf`
- **用途**：模板、图像、图标、样板代码、字体、被复制或修改的示例文档
- **优点**：将输出资源与文档分离，使 Codex 无需将文件加载到上下文中即可使用

#### 不应包含在 Skill 中的内容

skill 只应包含直接支持其功能的必要文件。**不要**创建无关文档或辅助文件，包括：

- README.md
- INSTALLATION_GUIDE.md
- QUICK_REFERENCE.md
- CHANGELOG.md
- 等等

skill 应仅包含 AI 智能体完成手头工作所需的信息，不应包含关于创建过程、设置和测试流程、面向用户的文档等辅助上下文。创建额外文档文件只会增加混乱和困惑。

### 渐进式披露设计原则

Skill 使用三级加载系统来高效管理上下文：

1. **元数据（名称 + 描述）** —— 始终在上下文中（约 100 字）
2. **SKILL.md 正文** —— 当 skill 触发时（< 5k 字）
3. **捆绑资源** —— 按需由 Codex 加载（无限制，因为脚本可在不读取到上下文窗口的情况下执行）

#### 渐进式披露模式

保持 SKILL.md 正文精简，不超过 500 行，以减少上下文膨胀。接近此限制时，将内容拆分到单独的文件中。将内容拆分到其他文件时，务必在 SKILL.md 中引用它们并清楚描述何时读取，以确保 skill 读者知道它们的存在和使用时机。

**关键原则：** 当 skill 支持多种变体、框架或选项时，在 SKILL.md 中只保留核心工作流程和选择指导。将特定变体的详细信息（模式、示例、配置）移至单独的参考文件中。

**模式 1：带参考资料的高层次指南**

```markdown
# PDF 处理

## 快速入门

使用 pdfplumber 提取文本：
[代码示例]

## 高级功能

- **表单填写**：完整指南见 [FORMS.md](FORMS.md)
- **API 参考**：所有方法见 [REFERENCE.md](REFERENCE.md)
- **示例**：常见模式见 [EXAMPLES.md](EXAMPLES.md)
```

Codex 仅在需要时加载 FORMS.md、REFERENCE.md 或 EXAMPLES.md。

**模式 2：领域特定的组织**

对于具有多个领域的 Skill，按领域组织内容，避免加载无关上下文：

```
bigquery-skill/
├── SKILL.md（概述和导航）
└── reference/
    ├── finance.md（收入、账单指标）
    ├── sales.md（机会、销售漏斗）
    ├── product.md（API 使用量、功能）
    └── marketing.md（营销活动、归因）
```

当用户询问销售指标时，Codex 只读取 sales.md。

类似地，对于支持多个框架或变体的 skill，按变体组织：

```
cloud-deploy/
├── SKILL.md（工作流程 + 提供商选择）
└── references/
    ├── aws.md（AWS 部署模式）
    ├── gcp.md（GCP 部署模式）
    └── azure.md（Azure 部署模式）
```

当用户选择 AWS 时，Codex 只读取 aws.md。

**模式 3：条件性详细信息**

显示基本内容，链接到高级内容：

```markdown
# DOCX 处理

## 创建文档

对新文档使用 docx-js。参见 [DOCX-JS.md](DOCX-JS.md)。

## 编辑文档

对于简单编辑，直接修改 XML。

**对于修订跟踪**：参见 [REDLINING.md](REDLINING.md)
**对于 OOXML 详情**：参见 [OOXML.md](OOXML.md)
```

Codex 仅在用户需要这些功能时才读取 REDLINING.md 或 OOXML.md。

**重要指南：**

- **避免深度嵌套引用** —— 保持引用从 SKILL.md 起最多一层深。所有参考文件应直接从 SKILL.md 链接。
- **结构化较长的参考文件** —— 对于超过 100 行的文件，在顶部包含目录，以便 Codex 在预览时能看到完整范围。

## Skill 创建流程

Skill 创建涉及以下步骤：

1. 通过具体示例理解 skill
2. 规划可复用的 skill 内容（脚本、参考资料、资产）
3. 初始化 skill（运行 init_skill.py）
4. 编辑 skill（实现资源并编写 SKILL.md）
5. 打包 skill（运行 package_skill.py）
6. 根据实际使用情况迭代

按顺序执行这些步骤，仅在有明确理由时才跳过不适用的步骤。

### Skill 命名

- 仅使用小写字母、数字和连字符；将用户提供的标题规范化为连字符形式（例如，"Plan Mode" -> `plan-mode`）。
- 生成名称时，生成长度不超过 64 个字符（字母、数字、连字符）的名称。
- 优先使用简短的动词短语来描述操作。
- 当有助于清晰度或触发时，按工具命名空间（例如，`gh-address-comments`、`linear-address-issue`）。
- skill 文件夹名称与 skill 名称完全一致。

### 第 1 步：通过具体示例理解 Skill

仅当 skill 的使用模式已经清晰理解时才跳过此步骤。即使在处理现有 skill 时，此步骤仍有价值。

要创建有效的 skill，需清楚理解 skill 将如何使用的具体示例。这种理解可以来自用户直接提供的示例，也可以来自经过用户反馈验证的生成示例。

例如，在构建 image-editor skill 时，相关问题包括：

- "image-editor skill 应该支持哪些功能？编辑、旋转，还有其他的吗？"
- "你能举一些这个 skill 会如何使用的例子吗？"
- "我可以想象用户会请求'去除这张图片的红眼'或'旋转这张图片'。你还能想到其他使用方式吗？"
- "用户说什么话应该触发这个 skill？"

为避免让用户不知所措，避免在单条消息中提问过多。从最重要的问题开始，根据需要进行跟进以提高效果。

当对 skill 应支持的功能有清晰认识时，结束此步骤。

### 第 2 步：规划可复用的 Skill 内容

要将具体示例转化为有效的 skill，通过以下方式分析每个示例：

1. 考虑如何从头开始执行该示例
2. 确定在重复执行这些工作流程时哪些脚本、参考资料和资产会有帮助

示例：在构建 `pdf-editor` skill 来处理"帮我旋转这个 PDF"等查询时，分析显示：

1. 旋转 PDF 每次都需要重写相同的代码
2. 将 `scripts/rotate_pdf.py` 脚本存储在 skill 中会有帮助

示例：在设计 `frontend-webapp-builder` skill 来处理"帮我构建一个待办事项应用"或"帮我构建一个跟踪步数的仪表板"等查询时，分析显示：

1. 每次编写前端 Web 应用都需要相同的 HTML/React 样板
2. 包含 HTML/React 样板项目文件的 `assets/hello-world/` 模板存储在 skill 中会有帮助

示例：在构建 `big-query` skill 来处理"今天有多少用户登录？"等查询时，分析显示：

1. 查询 BigQuery 每次都需要重新发现表结构和关系
2. 记录表结构的 `references/schema.md` 文件存储在 skill 中会有帮助

为确定 skill 的内容，分析每个具体示例，创建要包含的可复用资源列表：脚本、参考资料和资产。

### 第 3 步：初始化 Skill

此时，是时候实际创建 skill 了。

仅当正在开发的 skill 已经存在且需要迭代或打包时才跳过此步骤。在这种情况下，继续下一步。

从头开始创建新 skill 时，始终运行 `init_skill.py` 脚本。该脚本会方便地生成一个新的模板 skill 目录，自动包含 skill 所需的一切，使 skill 创建过程更加高效和可靠。

用法：

```bash
scripts/init_skill.py <skill-name> --path <output-directory> [--resources scripts,references,assets] [--examples]
```

示例：

```bash
scripts/init_skill.py my-skill --path skills/public
scripts/init_skill.py my-skill --path skills/public --resources scripts,references
scripts/init_skill.py my-skill --path skills/public --resources scripts --examples
```

该脚本会：

- 在指定路径创建 skill 目录
- 生成带有正确 frontmatter 和 TODO 占位符的 SKILL.md 模板
- 根据 `--resources` 可选创建资源目录
- 设置 `--examples` 时可选添加示例文件

初始化后，根据需要自定义 SKILL.md 并添加资源。如果使用了 `--examples`，请替换或删除占位符文件。

### 第 4 步：编辑 Skill

编辑（新生成或现有的）skill 时，请记住该 skill 是为 Codex 的另一个实例使用而创建的。包含对 Codex 有益且非显而易见的信息。考虑哪些程序性知识、领域特定细节或可复用资产会帮助另一个 Codex 实例更有效地执行这些任务。

#### 学习经过验证的设计模式

根据 skill 的需求查阅以下有用指南：

- **多步骤流程**：参见 references/workflows.md 了解顺序工作流程和条件逻辑
- **特定输出格式或质量标准**：参见 references/output-patterns.md 了解模板和示例模式

这些文件包含有效 skill 设计的既定最佳实践。

#### 从可复用 Skill 内容开始

要开始实现，从上面确定的可复用资源开始：`scripts/`、`references/` 和 `assets/` 文件。请注意，此步骤可能需要用户输入。例如，在实现 `brand-guidelines` skill 时，用户可能需要提供存储在 `assets/` 中的品牌资产或模板，或存储在 `references/` 中的文档。

添加的脚本必须通过实际运行来测试，以确保没有错误且输出符合预期。如果有许多类似的脚本，只需测试具有代表性的样本，以确保在平衡完成时间的同时对所有脚本都有信心。

如果使用了 `--examples`，删除 skill 不需要的任何占位符文件。只创建实际需要的资源目录。

#### 更新 SKILL.md

**写作指南：** 始终使用命令式/不定式形式。

##### Frontmatter

编写带有 `name` 和 `description` 的 YAML frontmatter：

- `name`：skill 名称
- `description`：这是 skill 的主要触发机制，帮助 Codex 理解何时使用该 skill。
  - 包含 skill 做什么以及何时使用的具体触发条件/上下文。
  - 将所有"何时使用"信息放在这里——而不是正文中。正文仅在触发后加载，因此正文中的"何时使用此 Skill"部分对 Codex 没有帮助。
  - `docx` skill 的示例描述："全面的文档创建、编辑和分析，支持修订跟踪、注释、格式保留和文本提取。当 Codex 需要处理专业文档（.docx 文件）时使用：(1) 创建新文档，(2) 修改或编辑内容，(3) 处理修订跟踪，(4) 添加注释，或任何其他文档任务"

不要在 YAML frontmatter 中包含任何其他字段。

##### 正文

编写使用该 skill 及其捆绑资源的说明。

### 第 5 步：打包 Skill

skill 开发完成后，必须将其打包为可分发的 .skill 文件与用户共享。打包过程会自动先验证 skill 以确保符合所有要求：

```bash
scripts/package_skill.py <path/to/skill-folder>
```

可选指定输出目录：

```bash
scripts/package_skill.py <path/to/skill-folder> ./dist
```

打包脚本将：

1. **验证** skill，自动检查：
   - YAML frontmatter 格式和必填字段
   - Skill 命名约定和目录结构
   - 描述的完整性和质量
   - 文件组织和资源引用

2. **打包** 验证通过的 skill，创建以 skill 命名的 .skill 文件（例如，`my-skill.skill`），包含所有文件并保持正确的目录结构以供分发。.skill 文件是带有 .skill 扩展名的 zip 文件。

   安全限制：符号链接将被拒绝，存在任何符号链接时打包将失败。

如果验证失败，脚本将报告错误并在不创建包的情况下退出。修复所有验证错误后重新运行打包命令。

### 第 6 步：迭代

测试 skill 后，用户可能会请求改进。通常这发生在使用 skill 之后不久，此时对 skill 的表现还有新鲜的上下文。

**迭代工作流程：**

1. 在实际任务中使用 skill
2. 注意困难或低效之处
3. 确定应如何更新 SKILL.md 或捆绑资源
4. 实施更改并再次测试
