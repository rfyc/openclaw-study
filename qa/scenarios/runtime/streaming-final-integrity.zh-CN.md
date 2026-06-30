# 流式传输最终完整性

```yaml qa-scenario
id: streaming-final-integrity
title: Streaming final integrity
surface: runtime
coverage:
  primary:
    - channels.streaming
  secondary:
    - runtime.fallback-delivery
    - runtime.delivery
objective: 验证频道可见的流式传输最终稳定为一条连贯的最终消息，不产生 token 增量噪音。
successCriteria:
  - 代理产生最终标记回复。
  - QA 频道记录中同一轮次不包含多个局部出站 token 消息。
  - 任何 edit/chunk 事件最终只留下一条包含标记的出站消息。
docsRefs:
  - docs/concepts/streaming.md
  - docs/channels/qa-channel.md
codeRefs:
  - src/agents/pi-embedded-runner/run/incomplete-turn.ts
  - extensions/qa-lab/src/bus-state.ts
  - extensions/qa-lab/src/suite-runtime-transport.ts
execution:
  kind: flow
  summary: 验证流式输出以一条频道可见的最终回复呈现。
  config:
    prompt: "Streaming final integrity marker. Reply exactly: STREAMING-FINAL-OK"
    expectedReply: STREAMING-FINAL-OK
```

```yaml qa-flow
steps:
  - name: delivers one final marker without token-delta chatter
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
      - set: startIndex
        value:
          expr: state.getSnapshot().messages.length
      - call: runAgentPrompt
        args:
          - ref: env
          - sessionKey:
              expr: "`agent:qa:streaming-final:${randomUUID().slice(0, 8)}`"
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
          - sinceIndex:
              ref: startIndex
      - set: newOutbounds
        value:
          expr: "state.getSnapshot().messages.slice(startIndex).filter((candidate) => candidate.direction === 'outbound' && candidate.conversation.id === 'qa-operator')"
      - set: markerOutbounds
        value:
          expr: "newOutbounds.filter((candidate) => candidate.text.includes(config.expectedReply))"
      - set: tokenDeltaLike
        value:
          expr: "newOutbounds.filter((candidate) => /^\\s*(?:STREAMING|STREAMING-|STREAMING-FINAL-)\\s*$/.test(candidate.text) && !candidate.text.includes(config.expectedReply))"
      - assert:
          expr: "markerOutbounds.length === 1"
          message:
            expr: "`expected one final streaming marker, got ${markerOutbounds.length}; transcript=${formatTransportTranscript(state, { conversationId: 'qa-operator' })}`"
      - assert:
          expr: "tokenDeltaLike.length === 0"
          message:
            expr: "`channel exposed token-delta-like partials: ${JSON.stringify(tokenDeltaLike)}`"
    detailsExpr: outbound.text
```
