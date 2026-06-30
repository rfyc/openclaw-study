# 子智能体任务移交

```yaml qa-scenario
id: subagent-handoff
title: Subagent handoff
surface: subagents
coverage:
  primary:
    - agents.subagents
objective: Verify the agent can delegate a bounded task to a subagent and fold the result back into the main thread.
successCriteria:
  - Agent launches a bounded subagent task.
  - Subagent result is acknowledged in the main flow.
  - Final answer attributes delegated work clearly.
docsRefs:
  - docs/tools/subagents.md
  - docs/help/testing.md
codeRefs:
  - src/agents/system-prompt.ts
  - extensions/qa-lab/src/report.ts
execution:
  kind: flow
  summary: Verify the agent can delegate a bounded task to a subagent and fold the result back into the main thread.
  config:
    prompt: "Delegate one bounded QA task to a subagent. Wait for the subagent to finish. Then reply with three labeled sections exactly once: Delegated task, Result, Evidence. Include the child result itself, not 'waiting'."
```

```yaml qa-flow
steps:
  - name: delegates a bounded task and reports the result
    actions:
      - call: reset
      - call: runAgentPrompt
        args:
          - ref: env
          - sessionKey: agent:qa:subagent
            message:
              expr: config.prompt
            timeoutMs:
              expr: liveTurnTimeoutMs(env, 90000)
      - call: waitForCondition
        saveAs: outbound
        args:
          - lambda:
              expr: "state.getSnapshot().messages.filter((candidate) => candidate.direction === 'outbound' && candidate.conversation.id === 'qa-operator' && (() => { const lower = normalizeLowercaseStringOrEmpty(candidate.text); return lower.includes('delegated task') && lower.includes('result') && lower.includes('evidence') && !lower.includes('waiting'); })()).at(-1)"
          - expr: liveTurnTimeoutMs(env, 45000)
          - expr: "env.providerMode === 'mock-openai' ? 100 : 250"
      - assert:
          expr: "!['failed to delegate','could not delegate','subagent unavailable'].some((needle) => normalizeLowercaseStringOrEmpty(outbound.text).includes(needle))"
          message:
            expr: "`subagent handoff reported failure: ${outbound.text}`"
      - set: subagentDebugRequests
        value:
          expr: "env.mock ? [...(await fetchJson(`${env.mock.baseUrl}/debug/requests`))] : []"
      - assert:
          expr: "!env.mock || subagentDebugRequests.some((request) => !request.toolOutput && /delegate one bounded qa task/i.test(String(request.allInputText ?? '')) && request.plannedToolName === 'sessions_spawn')"
          message:
            expr: "`expected sessions_spawn tool call during subagent handoff scenario, saw plannedToolNames=${JSON.stringify(subagentDebugRequests.map((request) => request.plannedToolName ?? null))}`"
    detailsExpr: outbound.text
```
