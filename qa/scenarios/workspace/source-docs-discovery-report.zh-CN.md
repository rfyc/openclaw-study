# 源代码与文档发现报告

```yaml qa-scenario
id: source-docs-discovery-report
title: Source and docs discovery report
surface: discovery
coverage:
  primary:
    - workspace.repo-discovery
  secondary:
    - docs.discovery
objective: 验证代理可以读取代码库文档和源代码、扩展 QA 计划，并发布已完成或未完成的报告。
successCriteria:
  - 代理在提出更多测试之前先读取文档和源代码。
  - 代理识别出种子列表之外的额外候选场景。
  - 代理以已完成或失败的 QA 报告结尾。
docsRefs:
  - docs/help/testing.md
  - docs/web/dashboard.md
  - docs/channels/qa-channel.md
codeRefs:
  - extensions/qa-lab/src/report.ts
  - extensions/qa-lab/src/self-check.ts
  - src/agents/system-prompt.ts
execution:
  kind: flow
  summary: 验证代理可以读取代码库文档和源代码、扩展 QA 计划，并发布已完成或未完成的报告。
  config:
    requiredFiles:
      - repo/qa/scenarios/index.md
      - repo/extensions/qa-lab/src/suite.ts
      - repo/docs/help/testing.md
    prompt: Read the seeded docs and source plan. The full repo is mounted under ./repo/. Explicitly inspect repo/qa/scenarios/index.md, repo/extensions/qa-lab/src/suite.ts, and repo/docs/help/testing.md, then report grouped into Worked, Failed, Blocked, and Follow-up. Mention at least two extra QA scenarios beyond the seed list.
```

```yaml qa-flow
steps:
  - name: reads seeded material and emits a protocol report
    actions:
      - call: reset
      - call: runAgentPrompt
        args:
          - ref: env
          - sessionKey: agent:qa:discovery
            message:
              expr: config.prompt
            timeoutMs:
              expr: liveTurnTimeoutMs(env, 30000)
      - call: waitForCondition
        saveAs: outbound
        args:
          - lambda:
              expr: "state.getSnapshot().messages.filter((candidate) => candidate.direction === 'outbound' && candidate.conversation.id === 'qa-operator' && hasDiscoveryLabels(candidate.text)).at(-1)"
          - expr: liveTurnTimeoutMs(env, 20000)
          - expr: "env.providerMode === 'mock-openai' ? 100 : 250"
      - assert:
          expr: "!reportsMissingDiscoveryFiles(outbound.text)"
          message:
            expr: "`discovery report still missed repo files: ${outbound.text}`"
      - assert:
          expr: "!reportsDiscoveryScopeLeak(outbound.text)"
          message:
            expr: "`discovery report drifted beyond scope: ${outbound.text}`"
      # 奇偶性门控条件 2（无虚假进度/虚假工具完成）：
      # 要求在散文报告之前有实际的读取工具调用。若无此要求，
      # 模型可能在未接触提示所指定的代码库文件的情况下伪造一份
      # 合理的 Worked/Failed/Blocked/Follow-up 报告。
      # 调试请求日志一次性获取后可被两个断言复用。
      # 每个请求的 allInputText 在匹配时被内联小写（真实提示写作
      # "Worked, Failed, Blocked"），因此 contains 检查不区分大小写。
      - set: discoveryDebugRequests
        value:
          expr: "env.mock ? [...(await fetchJson(`${env.mock.baseUrl}/debug/requests`))] : []"
      - assert:
          expr: "!env.mock || discoveryDebugRequests.some((request) => String(request.allInputText ?? '').toLowerCase().includes('worked, failed, blocked') && request.plannedToolName === 'read')"
          message:
            expr: "`expected at least one read tool call during discovery report scenario, saw plannedToolNames=${JSON.stringify(discoveryDebugRequests.map((request) => request.plannedToolName ?? null))}`"
    detailsExpr: outbound.text
```
