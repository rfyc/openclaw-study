---
role: best-practices
summary: |
  用于构建健壮、高效、可维护的 OpenProse 程序的设计模式。
  编写新程序或审查现有程序时阅读此文件。
see-also:
  - prose.md: 执行语义，如何运行程序
  - compiler.md: 完整语法文法，验证规则
  - antipatterns.md: 应避免的模式
---

# OpenProse 设计模式

本文档收录了有效编排 AI 代理的成熟模式。每个模式针对特定关注点：健壮性、成本效率、速度、可维护性或自我改进能力。

---

## 结构模式

#### parallel-independent-work（并行独立工作）

当任务没有数据依赖关系时，并发执行。这最大化了吞吐量，最小化了实际时钟时间。

```prose
# Good: Independent research runs in parallel
parallel:
  market = session "Research market trends"
  tech = session "Research technology landscape"
  competition = session "Analyze competitor products"

session "Synthesize findings"
  context: { market, tech, competition }
```

综合 session 等待所有分支，但总时间等于最长分支的时间，而不是所有分支的总和。

#### fan-out-fan-in（扇出-扇入）

处理集合时，扇出到并行工作者，然后收集结果。使用 `parallel for` 而不是手动并行分支。

```prose
let topics = ["AI safety", "interpretability", "alignment", "robustness"]

parallel for topic in topics:
  session "Deep dive research on {topic}"

session "Create unified report from all research"
```

这随集合大小自然扩展，并保持代码简洁。

#### pipeline-composition（流水线组合）

使用管道运算符链接转换，以获得可读的数据流。每个阶段有单一职责。

```prose
let candidates = session "Generate 10 startup ideas"

let result = candidates
  | filter:
      session "Is this idea technically feasible? yes/no"
        context: item
  | map:
      session "Expand this idea into a one-page pitch"
        context: item
  | reduce(best, current):
      session "Compare these two pitches, return the stronger one"
        context: [best, current]
```

#### agent-specialization（代理专业化）

定义具有专注专业知识的代理，专业化代理比通用提示产生更好的结果。

```prose
agent security-reviewer:
  model: sonnet
  prompt: """
    You are a security expert. Focus exclusively on:
    - Authentication and authorization flaws
    - Injection vulnerabilities
    - Data exposure risks
    Ignore style, performance, and other concerns.
  """

agent performance-reviewer:
  model: sonnet
  prompt: """
    You are a performance engineer. Focus exclusively on:
    - Algorithmic complexity
    - Memory usage patterns
    - I/O bottlenecks
    Ignore security, style, and other concerns.
  """
```

#### reusable-blocks（可重用块）

将重复的工作流提取为参数化的块。块是 OpenProse 的函数。

```prose
block review-and-revise(artifact, criteria):
  let feedback = session "Review {artifact} against {criteria}"
  session "Revise {artifact} based on feedback"
    context: feedback

# Reuse the pattern
do review-and-revise("the architecture doc", "clarity and completeness")
do review-and-revise("the API design", "consistency and usability")
do review-and-revise("the test plan", "coverage and edge cases")
```

---

## 健壮性模式

#### bounded-iteration（有界迭代）

始终使用 `max:` 约束循环，防止失控执行。即使精心设计的条件也可能无法终止。

```prose
# Good: Explicit upper bound
loop until **all tests pass** (max: 20):
  session "Identify and fix the next failing test"

# The program will terminate even if tests never fully pass
```

#### graceful-degradation（优雅降级）

当部分结果可接受时使用 `on-fail: "continue"`。尽量收集结果而不是完全失败。

```prose
parallel (on-fail: "continue"):
  primary = session "Query primary data source"
  backup = session "Query backup data source"
  cache = session "Check local cache"

# Continue with whatever succeeded
session "Merge available data"
  context: { primary, backup, cache }
```

#### retry-with-backoff（带退避的重试）

外部服务会出现暂时性故障，使用指数退避进行重试以处理速率限制和临时中断。

```prose
session "Call external API"
  retry: 5
  backoff: "exponential"
```

对关键路径，将重试与回退结合：

```prose
try:
  session "Call primary API"
    retry: 3
    backoff: "exponential"
catch:
  session "Use fallback data source"
```

#### error-context-capture（错误上下文捕获）

为智能恢复捕获错误上下文，错误变量提供诊断或修复 session 所需的信息。

```prose
try:
  session "Deploy to production"
catch as err:
  session "Analyze deployment failure and suggest fixes"
    context: err
  session "Attempt automatic remediation"
    context: err
```

#### defensive-context（防御性上下文）

在昂贵操作之前验证假设，廉价检查可以防止浪费计算。

```prose
let prereqs = session "Check all prerequisites: API keys, permissions, dependencies"

if **prerequisites are not met**:
  session "Report missing prerequisites and exit"
    context: prereqs
  throw "Prerequisites not satisfied"

# Expensive operations only run if prereqs pass
session "Execute main workflow"
```

---

## 成本效率模式

#### model-tiering（模型分层）

将模型能力与任务复杂度匹配：

| 模型           | 最适合                           | 示例                             |
| -------------- | -------------------------------- | -------------------------------- |
| **Sonnet 4.5** | 编排、控制流、协调               | VM 执行、船长椅、工作流路由      |
| **Opus 4.5**   | 需要深度推理的困难工作           | 复杂分析、战略决策、新颖问题解决 |
| **Haiku**      | 简单、不言而喻的任务（谨慎使用） | 分类、摘要、格式化               |

**核心洞见：** Sonnet 4.5 擅长*编排*代理和管理控制流——它是 OpenProse VM 本身和协调工作的"船长"代理的理想模型。Opus 4.5 应保留给真正在做困难智识工作的代理。Haiku 可以处理简单任务，但在质量重要的地方一般应避免使用。

**详细的任务到模型映射：**

| 任务类型                 | 模型   | 理由                       |
| ------------------------ | ------ | -------------------------- |
| 编排、路由、协调         | Sonnet | 快速，善于遵循结构         |
| 调查、调试、诊断         | Sonnet | 结构化分析，检查表式工作   |
| 分诊、分类、分类         | Sonnet | 明确标准，确定性决策       |
| 代码审查、验证（检查表） | Sonnet | 遵循定义的审查标准         |
| 简单实现、修复           | Sonnet | 应用已知模式               |
| 复杂多文件综合           | Opus   | 需要在上下文中保持很多内容 |
| 新型架构、战略规划       | Opus   | 需要创造性问题解决         |
| 模糊问题、不明确需求     | Opus   | 需要推理不确定性           |

**经验法则：** 如果你能为任务写一份检查表，Sonnet 就能做到。如果任务需要真正的创造力或驾驭模糊性，使用 Opus。

```prose
agent captain:
  model: sonnet  # Orchestration and coordination
  persist: true  # Execution-scoped (dies with run)
  prompt: "You coordinate the team and review work"

agent researcher:
  model: opus  # Hard analytical work
  prompt: "You perform deep research and analysis"

agent formatter:
  model: haiku  # Simple transformation (use sparingly)
  prompt: "You format text into consistent structure"

agent preferences:
  model: sonnet
  persist: user  # User-scoped (survives across projects)
  prompt: "You remember user preferences and patterns"

# Captain orchestrates, specialists do the hard work
session: captain
  prompt: "Plan the research approach"

let findings = session: researcher
  prompt: "Investigate the technical architecture"

resume: captain
  prompt: "Review findings and determine next steps"
  context: findings
```

#### context-minimization（上下文最小化）

只传递相关上下文，大上下文会减慢处理速度并增加成本。

```prose
# Bad: Passing everything
session "Write executive summary"
  context: [raw_data, analysis, methodology, appendices, references]

# Good: Pass only what's needed
let key_findings = session "Extract key findings from analysis"
  context: analysis

session "Write executive summary"
  context: key_findings
```

#### early-termination（提前终止）

一旦达成目标就退出循环，不要做不必要的迭代。

```prose
# The condition is checked each iteration
loop until **solution found and verified** (max: 10):
  session "Generate potential solution"
  session "Verify solution correctness"
# Exits immediately when condition is met, not after max iterations
```

#### early-signal-exit（提前信号退出）

观察或监控时，一旦有明确答案就退出——不要等待完整的观察窗口。

```prose
# Good: Exit on signal
let observation = session: observer
  prompt: "Watch the stream. Signal immediately if you detect a blocking error."
  timeout: 120s
  early_exit: **blocking_error detected**

# Bad: Fixed observation window
loop 30 times:
  resume: observer
    prompt: "Keep watching..."  # Even if error was obvious at iteration 2
```

这在信号到达时就进行处理，而不是等待任意超时。

#### defaults-over-prompts（默认值优于提示）

对于标准配置，使用常量或环境变量，只在真正可变时才提示。

```prose
# Good: Sensible defaults
const API_URL = "https://api.example.com"
const TEST_PROGRAM = "# Simple test\nsession 'Hello'"

# Slower: Prompting for known values
let api_url = input "Enter API URL"  # Usually the same value
let program = input "Enter test program"  # Usually the same value
```

如果 90% 的运行使用相同的值，就将其硬编码。如果需要，让用户通过 CLI 参数覆盖。

#### race-for-speed（竞速求快）

当任何有效结果都足够时，同时运行多种方法并取第一个成功的。

```prose
parallel ("first"):
  session "Try algorithm A"
  session "Try algorithm B"
  session "Try algorithm C"

# Continues as soon as any approach completes
session "Use winning result"
```

#### batch-similar-work（批量相似工作）

将相似操作分组以分摊开销，一个带结构化输出的 session 胜过许多小 session。

```prose
# Inefficient: Many small sessions
for file in files:
  session "Analyze {file}"

# Efficient: Batch analysis
session "Analyze all files and return structured findings for each"
  context: files
```

---

## 自我改进模式

#### self-verification-in-prompt（提示内自我验证）

对于本来需要单独验证器的任务，将验证作为提示中的最后一步包含进去，节省了往返同时保持了严格性。

```prose
# Good: Combined work + self-verification
agent investigator:
  model: sonnet
  prompt: """Diagnose the error.
  1. Examine code paths
  2. Check logs and state
  3. Form hypothesis
  4. BEFORE OUTPUTTING: Verify your evidence supports your conclusion.

  Output only if confident. If uncertain, state what's missing."""

# Slower: Separate verifier agent
let diagnosis = session: researcher
  prompt: "Investigate the error"
let verification = session: verifier
  prompt: "Verify this diagnosis"  # Extra round-trip
  context: diagnosis
```

当你需要真正的对抗性审查（不同视角）时使用单独的验证器，但对于自一致性检查，将验证嵌入到提示中。

#### iterative-refinement（迭代精炼）

使用反馈循环逐步改进输出，每次迭代都在前一次的基础上构建。

```prose
let draft = session "Create initial draft"

loop until **draft meets quality bar** (max: 5):
  let critique = session "Critically evaluate this draft"
    context: draft
  draft = session "Improve draft based on critique"
    context: [draft, critique]

session "Finalize and publish"
  context: draft
```

#### multi-perspective-review（多视角审查）

在综合之前收集不同观点，不同视角能发现不同问题。

```prose
parallel:
  user_perspective = session "Evaluate from end-user viewpoint"
  tech_perspective = session "Evaluate from engineering viewpoint"
  business_perspective = session "Evaluate from business viewpoint"

session "Synthesize feedback and prioritize improvements"
  context: { user_perspective, tech_perspective, business_perspective }
```

#### adversarial-validation（对抗性验证）

使用一个代理挑战另一个代理的工作，对抗性压力提高了健壮性。

```prose
let proposal = session "Generate proposal"

let critique = session "Find flaws and weaknesses in this proposal"
  context: proposal

let defense = session "Address each critique with evidence or revisions"
  context: [proposal, critique]

session "Produce final proposal incorporating valid critiques"
  context: [proposal, critique, defense]
```

#### consensus-building（共识构建）

对关键决策，要求独立评估者之间达成共识。

```prose
parallel:
  eval1 = session "Independently evaluate the solution"
  eval2 = session "Independently evaluate the solution"
  eval3 = session "Independently evaluate the solution"

loop until **evaluators agree** (max: 3):
  session "Identify points of disagreement"
    context: { eval1, eval2, eval3 }
  parallel:
    eval1 = session "Reconsider position given other perspectives"
      context: { eval1, eval2, eval3 }
    eval2 = session "Reconsider position given other perspectives"
      context: { eval1, eval2, eval3 }
    eval3 = session "Reconsider position given other perspectives"
      context: { eval1, eval2, eval3 }

session "Document consensus decision"
  context: { eval1, eval2, eval3 }
```

---

## 可维护性模式

#### descriptive-agent-names（描述性代理名称）

按角色而不是实现命名代理，名称应传达目的。

```prose
# Good: Role-based naming
agent code-reviewer:
agent technical-writer:
agent data-analyst:

# Bad: Implementation-based naming
agent opus-agent:
agent session-1-handler:
agent helper:
```

#### prompt-as-contract（提示作为契约）

编写指定预期输入和输出的提示，清晰的契约防止误解。

```prose
agent json-extractor:
  model: haiku
  prompt: """
    Extract structured data from text.

    Input: Unstructured text containing entity information
    Output: JSON object with fields: name, date, amount, status

    If a field cannot be determined, use null.
    Never invent information not present in the input.
  """
```

#### separation-of-concerns（关注点分离）

每个 session 应该做好一件事，组合简单的 session 而不是创建复杂的 session。

```prose
# Good: Single responsibility per session
let data = session "Fetch and validate input data"
let analysis = session "Analyze data for patterns"
  context: data
let recommendations = session "Generate recommendations from analysis"
  context: analysis
session "Format recommendations as report"
  context: recommendations

# Bad: God session
session "Fetch data, analyze it, generate recommendations, and format a report"
```

#### explicit-context-flow（显式上下文流）

通过显式上下文传递使数据流可见，避免依赖隐式对话历史。

```prose
# Good: Explicit flow
let step1 = session "First step"
let step2 = session "Second step"
  context: step1
let step3 = session "Third step"
  context: [step1, step2]

# Bad: Implicit flow (relies on conversation state)
session "First step"
session "Second step using previous results"
session "Third step using all previous"
```

---

## 性能模式

#### lazy-evaluation（懒惰求值）

将昂贵操作推迟到需要其结果时，不要计算可能不会被使用的内容。

```prose
session "Assess situation"

if **detailed analysis needed**:
  # Expensive operations only when necessary
  parallel:
    deep_analysis = session "Perform deep analysis"
      model: opus
    historical = session "Gather historical comparisons"
  session "Comprehensive report"
    context: { deep_analysis, historical }
else:
  session "Quick summary"
    model: haiku
```

#### progressive-disclosure（渐进式揭示）

从快速廉价的操作开始，只在需要时升级到昂贵的操作。

```prose
# Tier 1: Fast screening (haiku)
let initial = session "Quick assessment"
  model: haiku

if **needs deeper review**:
  # Tier 2: Moderate analysis (sonnet)
  let detailed = session "Detailed analysis"
    model: sonnet
    context: initial

  if **needs expert review**:
    # Tier 3: Deep reasoning (opus)
    session "Expert-level analysis"
      model: opus
      context: [initial, detailed]
```

#### work-stealing（工作窃取）

使用 `parallel ("any", count: N)` 从一个工作者池中尽快获取结果。

```prose
# Get 3 good ideas as fast as possible from 5 parallel attempts
parallel ("any", count: 3, on-fail: "ignore"):
  session "Generate creative solution approach 1"
  session "Generate creative solution approach 2"
  session "Generate creative solution approach 3"
  session "Generate creative solution approach 4"
  session "Generate creative solution approach 5"

session "Select best from the first 3 completed"
```

---

## 组合模式

#### workflow-template（工作流模板）

创建编码完整工作流模式的块，使用不同参数实例化。

```prose
block research-report(topic, depth):
  let research = session "Research {topic} at {depth} level"
  let analysis = session "Analyze findings about {topic}"
    context: research
  let report = session "Write {depth}-level report on {topic}"
    context: [research, analysis]

# Instantiate for different needs
do research-report("market trends", "executive")
do research-report("technical architecture", "detailed")
do research-report("competitive landscape", "comprehensive")
```

#### middleware-pattern（中间件模式）

使用日志、计时或验证等横切关注点包装 session。

```prose
block with-validation(task, validator):
  let result = session "{task}"
  let valid = session "{validator}"
    context: result
  if **validation failed**:
    throw "Validation failed for: {task}"

do with-validation("Generate SQL query", "Check SQL for injection vulnerabilities")
do with-validation("Generate config file", "Validate config syntax")
```

#### circuit-breaker（熔断器）

多次失败后，停止尝试并快速失败，防止级联故障。

```prose
let failures = 0
let max_failures = 3

loop while **service needed and failures < max_failures** (max: 10):
  try:
    session "Call external service"
    # Reset on success
    failures = 0
  catch:
    failures = failures + 1
    if **failures >= max_failures**:
      session "Circuit open - using fallback"
      throw "Service unavailable"
```

---

## 可观测性模式

#### checkpoint-narration（检查点叙述）

对于长工作流，发出进度标记，有助于调试和监控。

```prose
session "Phase 1: Data Collection"
# ... collection work ...

session "Phase 2: Analysis"
# ... analysis work ...

session "Phase 3: Report Generation"
# ... report work ...

session "Phase 4: Quality Assurance"
# ... QA work ...
```

#### structured-output-contracts（结构化输出契约）

请求可靠解析和验证的结构化输出。

```prose
agent structured-reviewer:
  model: sonnet
  prompt: """
    Always respond with this exact JSON structure:
    {
      "verdict": "pass" | "fail" | "needs_review",
      "issues": [{"severity": "high"|"medium"|"low", "description": "..."}],
      "suggestions": ["..."]
    }
  """

let review = session: structured-reviewer
  prompt: "Review this code for security issues"
```

---

## 总结

最有效的 OpenProse 程序综合运用这些模式：

1. **结构**：并行化独立工作，使用块实现重用
2. **健壮性**：约束循环，处理错误，重试暂时性故障
3. **效率**：分层使用模型，最小化上下文，提前终止
4. **质量**：迭代，获取多个视角，对抗性验证
5. **可维护性**：命名清晰，分离关注点，使流程显式

根据具体约束选择模式。快速原型优先考虑速度而非健壮性。生产工作流优先考虑可靠性而非成本。研究探索优先考虑彻底性而非效率。
