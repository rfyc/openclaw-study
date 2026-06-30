---
role: antipatterns
summary: |
  OpenProse 程序中常见的错误和应避免的模式。
  读取此文件以识别和修复有问题的代码模式。
see-also:
  - prose.md: 执行语义，如何运行程序
  - compiler.md: 完整语法文法，验证规则
  - patterns.md: 推荐的设计模式
---

# OpenProse 反模式

本文档收录了导致程序脆弱、昂贵、缓慢或难以维护的模式。每个反模式包含识别标准和修复指导。

---

## 结构性反模式

#### god-session（上帝 session）

单个 session 试图做所有事情。上帝 session 难以调试，无法并行化，产生不一致的结果。

```prose
# Bad: One session doing too much
session """
  Read all the code in the repository.
  Identify security vulnerabilities.
  Find performance bottlenecks.
  Check for style violations.
  Generate a comprehensive report.
  Suggest fixes for each issue.
  Prioritize by severity.
  Create a remediation plan.
"""
```

**为何有问题**：session 没有明确的完成标准，混合了可以并行化的关注点，任何地方失败都会导致全部失败。

**修复方案**：分解为有针对性的 session：

```prose
# Good: Focused sessions
parallel:
  security = session "Identify security vulnerabilities"
  perf = session "Find performance bottlenecks"
  style = session "Check for style violations"

session "Synthesize findings and prioritize by severity"
  context: { security, perf, style }

session "Create remediation plan"
```

#### sequential-when-parallel（本可并行却顺序执行）

当独立操作可以并发运行时却顺序执行，浪费实际时钟时间。

```prose
# Bad: Sequential independent work
let market = session "Research market"
let tech = session "Research technology"
let competition = session "Research competition"

session "Synthesize"
  context: [market, tech, competition]
```

**为何有问题**：总时间是所有研究时间之和，每个 session 都无谓地等待前一个。

**修复方案**：并行化独立工作：

```prose
# Good: Parallel independent work
parallel:
  market = session "Research market"
  tech = session "Research technology"
  competition = session "Research competition"

session "Synthesize"
  context: { market, tech, competition }
```

#### spaghetti-context（意大利面上下文）

上下文随意传递，没有清晰的数据流，使程序难以理解和修改。

```prose
# Bad: Unclear what context is actually used
let a = session "Step A"
let b = session "Step B"
  context: a
let c = session "Step C"
  context: [a, b]
let d = session "Step D"
  context: [a, b, c]
let e = session "Step E"
  context: [a, c, d]  # Why not b?
let f = session "Step F"
  context: [a, b, c, d, e]  # Everything?
```

**为何有问题**：不清楚哪些 session 依赖哪些输出，难以并行化或重构。

**修复方案**：将上下文最小化为实际依赖项：

```prose
# Good: Clear, minimal dependencies
let research = session "Research"
let analysis = session "Analyze"
  context: research
let recommendations = session "Recommend"
  context: analysis  # Only needs analysis, not research
let report = session "Report"
  context: recommendations
```

#### parallel-then-synthesize（并行后综合）

为相关的分析工作生成并行代理，然后综合，而单个有针对性的代理可以更高效地完成整个工作。

```prose
# Antipattern: Parallel investigation + synthesis
parallel:
  code = session "Analyze code path"
  logs = session "Analyze logs"
  context = session "Analyze execution context"

synthesis = session "Synthesize all findings"
  context: { code, logs, context }
# 4 LLM calls, coordination overhead, fragmented context
```

**为何有问题**：对于最终合并为一个结论的相关分析，协调开销和上下文碎片化往往超过了并行化的好处，每个并行代理只能看到全局的一部分。

**修复方案**：使用单个有针对性的代理，带有多步指令：

```prose
# Good: Single comprehensive investigator
diagnosis = session "Investigate the error"
  prompt: """Analyze comprehensively:
  1. Check the code path that produced the error
  2. Examine logs for timing and state
  3. Review execution context
  Synthesize into a unified diagnosis."""
# 1 LLM call, full context, no coordination
```

**并行化确实合适的情况**：当分析真正独立时（安全性 vs 性能），当你需要不应相互影响的不同视角时，或当工作量大到确实能从分工中受益时。

#### copy-paste-workflows（复制粘贴工作流）

重复 session 序列而不使用块，导致不一致的更改和维护负担。

```prose
# Bad: Duplicated workflow
session "Security review of module A"
session "Performance review of module A"
session "Synthesize reviews of module A"

session "Security review of module B"
session "Performance review of module B"
session "Synthesize reviews of module B"

session "Security review of module C"
session "Performance review of module C"
session "Synthesize reviews of module C"
```

**为何有问题**：如果工作流需要更改，必须在每处都更改，容易遗漏。

**修复方案**：提取为块：

```prose
# Good: Reusable block
block review-module(module):
  parallel:
    sec = session "Security review of {module}"
    perf = session "Performance review of {module}"
  session "Synthesize reviews of {module}"
    context: { sec, perf }

do review-module("module A")
do review-module("module B")
do review-module("module C")
```

---

## 健壮性反模式

#### unbounded-loop（无界循环）

没有最大迭代次数的循环，如果条件永远不满足可能永远运行。

```prose
# Bad: No escape hatch
loop until **the code is perfect**:
  session "Improve the code"
```

**为何有问题**："完美"可能永远无法实现，程序可能无限运行消耗资源。

**修复方案**：始终指定 `max:`：

```prose
# Good: Bounded iteration
loop until **the code is perfect** (max: 10):
  session "Improve the code"
```

#### optimistic-execution（乐观执行）

假设一切都会成功，对可能失败的操作不进行错误处理。

```prose
# Bad: No error handling
session "Call external API"
session "Process API response"
session "Store results in database"
session "Send notification"
```

**为何有问题**：如果 API 失败，后续 session 没有有效的输入，导致静默损坏。

**修复方案**：显式处理失败：

```prose
# Good: Error handling
try:
  let response = session "Call external API"
    retry: 3
    backoff: "exponential"
  session "Process API response"
    context: response
catch as err:
  session "Handle API failure gracefully"
    context: err
```

#### ignored-errors（忽略错误）

在错误实际重要时使用 `on-fail: "ignore"`，掩盖了应该暴露的问题。

```prose
# Bad: Ignoring failures that matter
parallel (on-fail: "ignore"):
  session "Charge customer credit card"
  session "Ship the product"
  session "Send confirmation email"

session "Order complete!"  # But was it really?
```

**为何有问题**：即使支付失败，订单也可能被标记为完成。

**修复方案**：使用适当的失败策略：

```prose
# Good: Fail-fast for critical operations
parallel:  # Default: fail-fast
  payment = session "Charge customer credit card"
  inventory = session "Reserve inventory"

# Only ship if both succeeded
session "Ship the product"
  context: { payment, inventory }

# Email can fail without blocking
try:
  session "Send confirmation email"
catch:
  session "Queue email for retry"
```

#### vague-discretion（模糊的自由裁量）

自由裁量条件模糊或无法衡量。

```prose
# Bad: What does "good enough" mean?
loop until **the output is good enough**:
  session "Improve output"

# Bad: Highly subjective
if **the user will be happy**:
  session "Ship it"
```

**为何有问题**：VM 没有明确的评估标准，结果不可预测。

**修复方案**：提供具体、可评估的标准：

```prose
# Good: Specific criteria
loop until **all tests pass and code coverage exceeds 80%** (max: 10):
  session "Improve test coverage"

# Good: Observable conditions
if **the response contains valid JSON with all required fields**:
  session "Process the response"
```

#### catch-and-swallow（捕获并吞噬）

捕获错误却没有有意义的处理，隐藏问题而不解决。

```prose
# Bad: Silent swallow
try:
  session "Critical operation"
catch:
  # Nothing here - error disappears
```

**为何有问题**：错误消失了，没有恢复、没有日志、没有可见性。

**修复方案**：有意义地处理错误：

```prose
# Good: Meaningful handling
try:
  session "Critical operation"
catch as err:
  session "Log error for investigation"
    context: err
  session "Execute fallback procedure"
  # Or rethrow if unrecoverable:
  throw
```

---

## 成本反模式

#### opus-for-everything（所有事情都用 opus）

对所有任务使用最强大（最昂贵）的模型，包括微不足道的任务。

```prose
# Bad: Opus for simple classification
agent classifier:
  model: opus
  prompt: "Categorize items as: spam, not-spam"

# Expensive for a binary classification
for email in emails:
  session: classifier
    prompt: "Classify: {email}"
```

**为何有问题**：opus 比 haiku 贵很多，简单任务不会从高级推理中获益。

**修复方案**：将模型与任务复杂度匹配：

```prose
# Good: Haiku for simple tasks
agent classifier:
  model: haiku
  prompt: "Categorize items as: spam, not-spam"
```

#### context-bloat（上下文膨胀）

传递 session 不需要的过多上下文。

```prose
# Bad: Passing everything
let full_codebase = session "Read entire codebase"
let all_docs = session "Read all documentation"
let history = session "Get full git history"

session "Fix the typo in the README"
  context: [full_codebase, all_docs, history]  # Massive overkill
```

**为何有问题**：大上下文会减慢处理速度，增加成本，并可能以无关信息干扰模型。

**修复方案**：传递最小相关上下文：

```prose
# Good: Minimal context
let readme = session "Read the README file"

session "Fix the typo in the README"
  context: readme
```

#### unnecessary-iteration（不必要的迭代）

在单个 session 就能完成时使用循环。

```prose
# Bad: Loop for what could be one call
let items = ["apple", "banana", "cherry"]
for item in items:
  session "Describe {item}"
```

**为何有问题**：三个 session 当一个就能处理所有项目，session 开销被放大。

**修复方案**：尽可能批量处理：

```prose
# Good: Batch processing
let items = ["apple", "banana", "cherry"]
session "Describe each of these items: {items}"
```

#### redundant-computation（冗余计算）

多次计算相同的内容。

```prose
# Bad: Redundant research
session "Research AI safety for security review"
session "Research AI safety for ethics review"
session "Research AI safety for compliance review"
```

**为何有问题**：相同的研究以略微不同的框架做了三次。

**修复方案**：计算一次，多次使用：

```prose
# Good: Compute once
let research = session "Comprehensive research on AI safety"

parallel:
  session "Security review"
    context: research
  session "Ethics review"
    context: research
  session "Compliance review"
    context: research
```

---

## 性能反模式

#### eager-over-computation（急切过度计算）

提前计算所有内容，即使只需要部分结果。

```prose
# Bad: Compute all branches even if only one is needed
parallel:
  simple_analysis = session "Simple analysis"
    model: haiku
  detailed_analysis = session "Detailed analysis"
    model: sonnet
  deep_analysis = session "Deep analysis"
    model: opus

# Then only use one based on some criterion
choice **appropriate depth**:
  option "Simple":
    session "Use simple"
      context: simple_analysis
  option "Detailed":
    session "Use detailed"
      context: detailed_analysis
  option "Deep":
    session "Use deep"
      context: deep_analysis
```

**为何有问题**：所有三个分析都会运行，即使只使用其中一个。

**修复方案**：懒惰求值：

```prose
# Good: Only compute what's needed
let initial = session "Initial assessment"
  model: haiku

choice **appropriate depth based on initial assessment**:
  option "Simple":
    session "Simple analysis"
      model: haiku
  option "Detailed":
    session "Detailed analysis"
      model: sonnet
  option "Deep":
    session "Deep analysis"
      model: opus
```

#### over-parallelization（过度并行化）

过于激进地并行化，使得开销占主导或资源耗尽。

```prose
# Bad: 100 parallel sessions
parallel for item in large_collection:  # 100 items
  session "Process {item}"
```

**为何有问题**：可能使系统不堪重负，协调开销可能超过并行化带来的好处。

**修复方案**：批量处理或限制并发：

```prose
# Good: Process in batches
for batch in batches(large_collection, 10):
  parallel for item in batch:
    session "Process {item}"
```

#### premature-parallelization（过早并行化）

对微小任务进行并行化，而顺序执行既简单又够快。

```prose
# Bad: Parallel overkill for simple tasks
parallel:
  a = session "Add 2 + 2"
  b = session "Add 3 + 3"
  c = session "Add 4 + 4"
```

**为何有问题**：协调开销超过任务时间，顺序执行更简单且可能更快。

**修复方案**：保持简单：

```prose
# Good: Sequential for trivial tasks
session "Add 2+2, 3+3, and 4+4"
```

#### synchronous-fire-and-forget（同步即发即弃）

等待不需要其结果的操作。

```prose
# Bad: Waiting for logging
session "Do important work"
session "Log the result"  # Don't need to wait for this
session "Continue with next important work"
```

**为何有问题**：主工作流被非关键操作阻塞。

**修复方案**：对即发即弃操作使用适当模式，或批量记录日志：

```prose
# Better: Batch non-critical work
session "Do important work"
session "Continue with next important work"
# ... more important work ...

# Log everything at the end or async
session "Log all operations"
```

---

## 可维护性反模式

#### magic-strings（魔法字符串）

在程序中重复硬编码的提示。

```prose
# Bad: Same prompt in multiple places
session "You are a helpful assistant. Analyze this code for bugs."
# ... later ...
session "You are a helpful assistant. Analyze this code for bugs."
# ... even later ...
session "You are a helpful assistent. Analyze this code for bugs."  # Typo!
```

**为何有问题**：更新时不一致，错别字没有被注意到。

**修复方案**：使用代理：

```prose
# Good: Single source of truth
agent code-analyst:
  model: sonnet
  prompt: "You are a helpful assistant. Analyze code for bugs."

session: code-analyst
  prompt: "Analyze the auth module"
session: code-analyst
  prompt: "Analyze the payment module"
```

#### opaque-workflow（晦涩的工作流）

没有结构或注释说明正在发生什么。

```prose
# Bad: What is this doing?
let x = session "A"
let y = session "B"
  context: x
parallel:
  z = session "C"
    context: y
  w = session "D"
session "E"
  context: [z, w]
```

**为何有问题**：无法理解、调试或修改。

**修复方案**：使用有意义的名称和结构：

```prose
# Good: Clear intent
# Phase 1: Research
let research = session "Gather background information"

# Phase 2: Analysis
let analysis = session "Analyze research findings"
  context: research

# Phase 3: Parallel evaluation
parallel:
  technical_eval = session "Technical feasibility assessment"
    context: analysis
  business_eval = session "Business viability assessment"
    context: analysis

# Phase 4: Synthesis
session "Create final recommendation"
  context: { technical_eval, business_eval }
```

#### implicit-dependencies（隐式依赖）

依赖对话历史而不是显式上下文。

```prose
# Bad: Implicit state
session "Set the project name to Acme"
session "Set the deadline to Friday"
session "Now create a project plan"  # Hopes previous info is remembered
```

**为何有问题**：依赖 VM 实现细节，重构时容易出错。

**修复方案**：显式上下文：

```prose
# Good: Explicit state
let config = session "Define project: name=Acme, deadline=Friday"

session "Create a project plan"
  context: config
```

#### mixed-concerns-agent（关注点混合的代理）

代理的提示涵盖太多责任。

```prose
# Bad: Jack of all trades
agent super-agent:
  model: opus
  prompt: """
    You are an expert in:
    - Security analysis
    - Performance optimization
    - Code review
    - Documentation
    - Testing
    - DevOps
    - Project management
    - Customer communication
    When asked, perform any of these tasks.
  """
```

**为何有问题**：没有焦点意味着各方面的结果都平庸，无法优化模型选择。

**修复方案**：专业化代理：

```prose
# Good: Focused expertise
agent security-expert:
  model: sonnet
  prompt: "You are a security analyst. Focus only on security concerns."

agent performance-expert:
  model: sonnet
  prompt: "You are a performance engineer. Focus only on optimization."

agent technical-writer:
  model: haiku
  prompt: "You write clear technical documentation."
```

---

## 逻辑反模式

#### infinite-refinement（无限精炼）

永远无法满足退出条件的循环。

```prose
# Bad: Perfection is impossible
loop until **the code has zero bugs**:
  session "Find and fix bugs"
```

**为何有问题**：零 bug 是无法实现的，循环运行到最大值（如已指定）或永远运行。

**修复方案**：使用可实现的条件：

```prose
# Good: Achievable condition
loop until **all known bugs are fixed** (max: 20):
  session "Find and fix the next bug"

# Or: Diminishing returns
loop until **no significant bugs found in last iteration** (max: 10):
  session "Search for bugs"
```

#### assertion-as-action（将断言作为行动）

将条件用作行动——检查某事却不对结果采取行动。

```prose
# Bad: Check but don't use result
session "Check if the system is healthy"
session "Deploy to production"  # Deploys regardless!
```

**为何有问题**：健康检查的结果没有被使用，部署无条件发生。

**修复方案**：使用条件执行：

```prose
# Good: Act on the check
let health = session "Check if the system is healthy"

if **system is healthy**:
  session "Deploy to production"
else:
  session "Alert on-call and skip deployment"
    context: health
```

#### false-parallelism（虚假并行）

在并行块中放置顺序依赖的操作。

```prose
# Bad: These aren't independent!
parallel:
  data = session "Fetch data"
  processed = session "Process the data"  # Needs data!
    context: data
  stored = session "Store processed data"  # Needs processed!
    context: processed
```

**为何有问题**：尽管在并行块中，由于依赖关系这些必须顺序运行。

**修复方案**：诚实对待依赖关系：

```prose
# Good: Sequential where needed
let data = session "Fetch data"
let processed = session "Process the data"
  context: data
session "Store processed data"
  context: processed
```

#### exception-as-flow-control（异常作为流控制）

对预期条件而非异常错误使用 try/catch。

```prose
# Bad: Exceptions for normal flow
try:
  session "Find the optional config file"
catch:
  session "Use default configuration"
```

**为何有问题**：缺少配置是预期的，不是异常的，掩盖了实际错误。

**修复方案**：对预期情况使用条件语句：

```prose
# Good: Conditional for expected case
let config_exists = session "Check if config file exists"

if **config file exists**:
  session "Load configuration from file"
else:
  session "Use default configuration"
```

#### excessive-user-checkpoints（过多用户检查点）

对有明显或可预测答案的决策提示用户。

```prose
# Antipattern: Asking the obvious
input "Blocking error detected. Investigate?"  # Always yes
input "Diagnosis complete. Proceed to triage?"  # Always yes
input "Tests pass. Deploy?"  # Almost always yes
```

**为何有问题**：每个检查点都需要等待用户输入的往返。如果 90% 的情况下答案是可预测的，你就在无谓地增加延迟。

**修复方案**：对明显情况自动进行，只在真正模糊时才提示：

```prose
# Good: Auto-proceed with escape hatches for edge cases
if observation.blocking_error:
  # Auto-investigate (don't ask - of course we investigate errors)
  let diagnosis = do investigate(...)

  # Only ask if genuinely ambiguous
  if diagnosis.confidence == "low":
    input "Low confidence diagnosis. Proceed anyway?"

  # Auto-deploy if tests pass (but log for audit)
  if fix.tests_pass:
    do deploy(...)
```

**检查点确实合适的情况**：不可逆行动（对关键系统的生产部署）、昂贵操作（长时间运行的任务），或用户偏好不可预测的真正决策点。

#### fixed-observation-window（固定观察窗口）

等待预定的持续时间，即使信号已提前到达。

```prose
# Antipattern: Fixed window regardless of findings
loop 30 times (wait: 2s each):  # Always 60 seconds
  resume: observer
    prompt: "Keep watching the stream"
# Runs all 30 iterations even if blocking error detected on iteration 1
```

**为何有问题**：当答案已知时浪费时间。如果观察者在 +5 秒检测到致命错误，为何还要等另外 55 秒？

**修复方案**：使用信号驱动的退出条件：

```prose
# Good: Exit on significant signal
loop until **blocking error OR completion** (max: 30):
  resume: observer
    prompt: "Watch the stream. Signal IMMEDIATELY on blocking errors."
# Exits as soon as something significant happens
```

或者如果你的运行时支持，使用 `early_exit`：

```prose
# Good: Explicit early exit
let observation = session: observer
  prompt: "Monitor for errors. Signal immediately if found."
  timeout: 120s
  early_exit: **blocking_error detected**
```

---

## 安全反模式

#### unvalidated-input（未验证的输入）

将外部输入直接传递给 session 而不进行验证。

```prose
# Bad: Direct injection
let user_input = external_source

session "Execute this command: {user_input}"
```

**为何有问题**：用户可能注入恶意提示或命令。

**修复方案**：先验证和净化：

```prose
# Good: Validate first
let user_input = external_source
let validated = session "Validate this input is a safe search query"
  context: user_input

if **input is valid and safe**:
  session "Search for: {validated}"
else:
  throw "Invalid input rejected"
```

#### overprivileged-agents（特权过度的代理）

代理拥有超出所需的权限。

```prose
# Bad: Full access for simple task
agent file-reader:
  permissions:
    read: ["**/*"]
    write: ["**/*"]
    bash: allow
    network: allow

session: file-reader
  prompt: "Read the README.md file"
```

**为何有问题**：任务只需要读取一个文件，却拥有完整系统访问权限。

**修复方案**：最小权限原则：

```prose
# Good: Minimal permissions
agent file-reader:
  permissions:
    read: ["README.md"]
    write: []
    bash: deny
    network: deny
```

---

## 总结

反模式源于：

1. **懒惰**：复制粘贴而不是抽象，隐式而不是显式
2. **过度工程**：并行化所有事情，对所有任务使用 opus
3. **工程不足**：没有错误处理，无界循环，模糊条件
4. **思路不清**：上帝 session，混合关注点，意大利面上下文

审查 OpenProse 程序时，问以下问题：

- 独立工作能并行化吗？
- 循环是有界的吗？
- 错误处理了吗？
- 上下文最小化且显式吗？
- 模型与任务复杂度匹配吗？
- 代理是专注且可重用的吗？
- 陌生人能理解这段代码吗？

尽早修复反模式，随着时间推移它们会积累成难以维护的系统。
