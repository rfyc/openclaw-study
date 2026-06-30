# 写操作后 reasoning-only 不自动重试

```yaml qa-scenario
id: reasoning-only-no-auto-retry-after-write
title: Reasoning-only no-auto-retry after write
surface: runtime
coverage:
  primary:
    - runtime.reasoning-only-recovery
  secondary:
    - runtime.retry-policy
objective: 验证 GPT 风格的 reasoning-only 轮次在发生可变写操作之后保持 replay-unsafe 状态，不会自动重试。
successCriteria:
  - 该场景仅限 mock-openai，不会被 live 通道隐式拾取。
  - 代理执行种子中的可变写操作。
  - Mock 追踪中不包含自动 reasoning-only 重试指令。
  - Mock 追踪在写操作侧 reasoning-only 终止轮次后停止，不尝试继续。
docsRefs:
  - docs/help/testing.md
  - docs/help/gpt55-codex-agentic-parity.md
codeRefs:
  - extensions/qa-lab/src/mock-openai-server.ts
  - src/agents/pi-embedded-runner/run/incomplete-turn.ts
execution:
  kind: flow
  summary: 验证写操作之后的 reasoning-only 轮次不会自动重试。
  config:
    requiredProvider: mock-openai
    promptSnippet: Reasoning-only after write safety check
    prompt: "Reasoning-only after write safety check: write reasoning-only-side-effect.txt, then answer with exactly SIDE-EFFECT-GUARD-OK."
    retryNeedle: recorded reasoning but did not produce a user-visible answer
    outputFile: reasoning-only-side-effect.txt
```

```yaml qa-flow
steps:
  - name: keeps replay-unsafety explicit after a mutating write
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
          expr: "`agent:qa:reasoning-only-write:${randomUUID().slice(0, 8)}`"
      - call: startAgentRun
        saveAs: started
        args:
          - ref: env
          - sessionKey:
              ref: sessionKey
            message:
              expr: config.prompt
            timeoutMs:
              expr: liveTurnTimeoutMs(env, 45000)
      - set: waited
        value:
          expr: "await env.gateway.call('agent.wait', { runId: started.runId, timeoutMs: liveTurnTimeoutMs(env, 45000) }, { timeoutMs: liveTurnTimeoutMs(env, 50000) })"
      - assert:
          expr: "waited?.status === 'ok'"
          message:
            expr: "`agent.wait returned ${String(waited?.status ?? 'unknown')}: ${String(waited?.error ?? '')}`"
      - call: fs.readFile
        saveAs: sideEffect
        args:
          - expr: "path.join(env.gateway.workspaceDir, config.outputFile)"
          - utf8
      - assert:
          expr: "sideEffect.includes('side effects already happened')"
          message:
            expr: "`side-effect file missing expected contents: ${sideEffect}`"
      - if:
          expr: "Boolean(env.mock)"
          then:
            - set: scenarioRequests
              value:
                expr: "(await fetchJson(`${env.mock.baseUrl}/debug/requests`)).slice(requestCountBefore)"
            - assert:
                expr: "scenarioRequests.some((request) => String(request.allInputText ?? '').includes(config.promptSnippet) && request.plannedToolName === 'write')"
                message: expected mutating write request in mock trace
            - assert:
                expr: "!scenarioRequests.some((request) => String(request.allInputText ?? '').includes(config.retryNeedle))"
                message: reasoning-only retry instruction should not be injected after a write
            - assert:
                expr: "scenarioRequests.filter((request) => String(request.allInputText ?? '').includes(config.promptSnippet)).length === 2"
                message: expected exactly the write request plus the reasoning-only terminal request
    detailsExpr: "env.mock ? `requests=${String(scenarioRequests?.length ?? 0)} sideEffect=${sideEffect.trim()}` : sideEffect"
```
