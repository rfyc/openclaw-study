# replay-safe 读操作后 reasoning-only 的恢复

```yaml qa-scenario
id: reasoning-only-recovery-replay-safe-read
title: Reasoning-only recovery after replay-safe read
surface: runtime
coverage:
  primary:
    - runtime.reasoning-only-recovery
  secondary:
    - runtime.retry-policy
objective: 验证 GPT 风格的 reasoning-only 轮次在执行 replay-safe 读操作后自动继续并产生可见答案。
successCriteria:
  - 该场景仅限 mock-openai，不会被 live 通道隐式拾取。
  - 代理在 reasoning-only 轮次之前执行 replay-safe 读操作。
  - 运行时在 reasoning-only 轮次之后注入可见答案的继续指令。
  - 最终可见回复包含精确的恢复标记。
docsRefs:
  - docs/help/testing.md
codeRefs:
  - extensions/qa-lab/src/mock-openai-server.ts
  - src/agents/pi-embedded-runner/run/incomplete-turn.ts
execution:
  kind: flow
  summary: 验证 reasoning-only OpenAI 轮次在 replay-safe 读操作后可以恢复。
  config:
    requiredProvider: mock-openai
    promptSnippet: Reasoning-only continuation QA check
    prompt: "Reasoning-only continuation QA check: read QA_KICKOFF_TASK.md, then answer with exactly REASONING-RECOVERED-OK."
    expectedReply: REASONING-RECOVERED-OK
    retryNeedle: recorded reasoning but did not produce a user-visible answer
```

```yaml qa-flow
steps:
  - name: retries a replay-safe read into a visible answer
    actions:
      - assert:
          expr: "env.providerMode === 'mock-openai'"
          message: this seeded scenario is mock-openai only
      - call: waitForGatewayHealthy
        args:
          - ref: env
          - 60000
      - call: reset
      - set: requestCountBefore
        value:
          expr: "env.mock ? (await fetchJson(`${env.mock.baseUrl}/debug/requests`)).length : 0"
      - set: sessionKey
        value:
          expr: "`agent:qa:reasoning-only-recovery:${randomUUID().slice(0, 8)}`"
      - call: runAgentPrompt
        args:
          - ref: env
          - sessionKey:
              ref: sessionKey
            message:
              expr: config.prompt
            timeoutMs:
              expr: liveTurnTimeoutMs(env, 45000)
      - call: waitForOutboundMessage
        saveAs: outbound
        args:
          - ref: state
          - lambda:
              params: [candidate]
              expr: "candidate.conversation.id === 'qa-operator' && candidate.text.includes(config.expectedReply)"
          - expr: liveTurnTimeoutMs(env, 30000)
      - assert:
          expr: "outbound.text.includes(config.expectedReply)"
          message:
            expr: "`missing recovery marker: ${outbound.text}`"
      - if:
          expr: "Boolean(env.mock)"
          then:
            - set: scenarioRequests
              value:
                expr: "(await fetchJson(`${env.mock.baseUrl}/debug/requests`)).slice(requestCountBefore)"
            - assert:
                expr: "scenarioRequests.some((request) => String(request.allInputText ?? '').includes(config.promptSnippet) && request.plannedToolName === 'read')"
                message: expected replay-safe read request in mock trace
            - assert:
                expr: "scenarioRequests.some((request) => String(request.allInputText ?? '').includes(config.retryNeedle))"
                message: expected reasoning-only retry instruction in mock trace
    detailsExpr: "env.mock ? `${outbound.text}\\nrequests=${String(scenarioRequests?.length ?? 0)}` : outbound.text"
```
