# OTEL 追踪冒烟测试

```yaml qa-scenario
id: otel-trace-smoke
title: OTEL trace smoke
surface: telemetry
coverage:
  primary:
    - telemetry.otel
  secondary:
    - harness.qa-lab
objective: 验证 QA-lab gateway 运行通过 diagnostics-otel 插件发出有界 OpenTelemetry 追踪 span。
successCriteria:
  - diagnostics-otel 插件以启用追踪导出的方式启动。
  - 最小化 QA-channel 代理轮次完成。
  - 追踪中包含所选代理 harness 生命周期 span。
  - 运行发出低基数 OpenTelemetry 追踪 span，不含内容或原始诊断标识符。
plugins:
  - diagnostics-otel
gatewayConfigPatch:
  diagnostics:
    enabled: true
    otel:
      enabled: true
      protocol: http/protobuf
      traces: true
      metrics: false
      logs: false
      sampleRate: 1
      captureContent:
        enabled: false
docsRefs:
  - docs/gateway/opentelemetry.md
  - docs/concepts/qa-e2e-automation.md
codeRefs:
  - extensions/diagnostics-otel/src/service.ts
  - src/agents/harness/v2.ts
  - extensions/qa-lab/src/suite.ts
execution:
  kind: flow
  summary: 在启用 diagnostics-otel 的情况下发出最小化 QA-lab 追踪。
  config:
    prompt: Reply exactly OTEL-QA-OK.
```

```yaml qa-flow
steps:
  - name: emits a traced qa-channel turn
    actions:
      - call: waitForGatewayHealthy
        args:
          - ref: env
          - 60000
      - call: waitForQaChannelReady
        args:
          - ref: env
          - 60000
      - call: reset
      - set: startCursor
        value:
          expr: state.getSnapshot().messages.length
      - call: runAgentPrompt
        args:
          - ref: env
          - sessionKey: agent:qa:otel-trace-smoke
            message:
              expr: config.prompt
            timeoutMs:
              expr: liveTurnTimeoutMs(env, 30000)
      - call: waitForCondition
        saveAs: outbound
        args:
          - lambda:
              expr: "state.getSnapshot().messages.slice(startCursor).filter((candidate) => candidate.direction === 'outbound' && candidate.conversation.id === 'qa-operator' && String(candidate.text ?? '').trim().length > 0).at(-1)"
          - expr: liveTurnTimeoutMs(env, 30000)
          - expr: "env.providerMode === 'mock-openai' ? 100 : 250"
      - assert:
          expr: "String(outbound.text ?? '').trim().length > 0"
          message: "expected non-empty qa output"
```
