# 中等游戏规划 Codex harness

```yaml qa-scenario
id: medium-game-plan-codex-harness
title: Medium game plan Codex harness
surface: workspace
coverage:
  primary:
    - workspace.planning
  secondary:
    - models.codex-cli
objective: 验证 Codex app-server harness 能够规划并构建一个中等复杂度的独立浏览器游戏。
successCriteria:
  - 除非所选主模型为 openai/gpt-5.5 并强制使用 Codex harness，否则 live-frontier 运行会快速失败。
  - 场景强制使用 Codex 嵌入式 harness。
  - 提示明确要求代理在编辑前进入规划模式。
  - 代理写出包含 canvas 循环、控制、计分、波次、暂停和重启的独立 HTML 游戏。
docsRefs:
  - docs/plugins/sdk-agent-harness.md
  - docs/gateway/configuration-reference.md
  - docs/help/testing.md
codeRefs:
  - extensions/codex/harness.ts
  - src/agents/harness/selection.ts
  - extensions/qa-lab/src/suite.ts
execution:
  kind: flow
  summary: 使用 `pnpm openclaw qa suite --provider-mode live-frontier --model openai/gpt-5.5 --alt-model openai/gpt-5.5 --fast --thinking medium --scenario medium-game-plan-codex-harness` 运行。
  config:
    requiredProvider: codex
    requiredModel: gpt-5.5
    harnessRuntime: codex
    artifactFile: star-garden-defenders-codex.html
    gameTitle: Star Garden Defenders
    minBytes: 5000
    buildPrompt: |-
      Enter plan mode first and write a short implementation plan before editing.

      Then build a medium-complex, self-contained browser game at ./star-garden-defenders-codex.html.

      Game: Star Garden Defenders.
      Requirements:
      - one HTML file only; no external assets, fonts, scripts, or network calls
      - canvas-based arcade loop with requestAnimationFrame
      - keyboard controls and mouse or pointer support
      - player movement, enemy waves, collectibles or power-ups, collision handling
      - score, lives or health, wave number, pause, restart, and game-over state
      - polished inline CSS and clear on-screen controls
      - after writing the file, reply with the filename and the main systems implemented
```

```yaml qa-flow
steps:
  - name: confirms GPT-5.5 Codex harness target
    actions:
      - set: selected
        value:
          expr: splitModelRef(env.primaryModel)
      - assert:
          expr: "env.providerMode !== 'live-frontier' || selected?.provider === config.requiredProvider"
          message:
            expr: "`expected live primary provider ${config.requiredProvider}, got ${env.primaryModel}`"
      - assert:
          expr: "env.providerMode !== 'live-frontier' || selected?.model === config.requiredModel"
          message:
            expr: "`expected live primary model ${config.requiredModel}, got ${env.primaryModel}`"
      - if:
          expr: "env.providerMode !== 'live-frontier'"
          then:
            - assert: "true"
          else:
            - call: patchConfig
              saveAs: patchResult
              args:
                - env:
                    ref: env
                  patch:
                    agents:
                      defaults:
                        agentRuntime:
                          id:
                            expr: config.harnessRuntime
            - call: waitForGatewayHealthy
              args:
                - ref: env
                - 60000
            - call: waitForQaChannelReady
              args:
                - ref: env
                - 60000
            - call: readConfigSnapshot
              saveAs: snapshot
              args:
                - ref: env
            - assert:
                expr: "snapshot.config.agents?.defaults?.agentRuntime?.id === config.harnessRuntime"
                message:
                  expr: "`expected agentRuntime.id=${config.harnessRuntime}, got ${JSON.stringify(snapshot.config.agents?.defaults?.agentRuntime)}`"
    detailsExpr: "env.providerMode === 'live-frontier' ? `provider=${selected?.provider} model=${selected?.model} runtime=${snapshot.config.agents?.defaults?.agentRuntime?.id}` : `mock mode: parsed ${scenario.id}`"
  - name: builds the medium game artifact
    actions:
      - if:
          expr: "env.providerMode !== 'live-frontier'"
          then:
            - assert: "true"
          else:
            - call: reset
            - call: runAgentPrompt
              args:
                - ref: env
                - sessionKey: agent:qa:medium-game-codex
                  message:
                    expr: config.buildPrompt
                  provider:
                    expr: selected?.provider
                  model:
                    expr: selected?.model
                  timeoutMs:
                    expr: resolveQaLiveTurnTimeoutMs(env, 420000, env.primaryModel)
            - call: waitForOutboundMessage
              saveAs: outbound
              args:
                - ref: state
                - lambda:
                    params: [candidate]
                    expr: "candidate.conversation.id === 'qa-operator' && candidate.text.includes(config.artifactFile)"
                - expr: resolveQaLiveTurnTimeoutMs(env, 60000, env.primaryModel)
            - set: artifactPath
              value:
                expr: "path.join(env.gateway.workspaceDir, config.artifactFile)"
            - call: waitForCondition
              saveAs: artifact
              args:
                - lambda:
                    async: true
                    expr: "((await fs.readFile(artifactPath, 'utf8').catch(() => '')).includes(config.gameTitle) ? await fs.readFile(artifactPath, 'utf8').catch(() => '') : undefined)"
                - expr: resolveQaLiveTurnTimeoutMs(env, 60000, env.primaryModel)
                - 500
            - set: artifactLower
              value:
                expr: normalizeLowercaseStringOrEmpty(artifact)
            - assert:
                expr: "artifact.length >= config.minBytes"
                message:
                  expr: "`expected medium game artifact >= ${config.minBytes} bytes, got ${artifact.length}`"
            - assert:
                expr: "artifactLower.includes('star garden defenders') && artifactLower.includes('<canvas') && artifactLower.includes('requestanimationframe')"
                message: missing title, canvas, or animation loop
            - assert:
                expr: "artifactLower.includes('keydown') || artifactLower.includes('keyup')"
                message: missing keyboard controls
            - assert:
                expr: "artifactLower.includes('score') && artifactLower.includes('wave') && artifactLower.includes('pause') && artifactLower.includes('restart')"
                message: missing score, wave, pause, or restart systems
            - assert:
                expr: "outbound.text.includes(config.artifactFile)"
                message:
                  expr: "`final reply did not mention ${config.artifactFile}: ${outbound.text}`"
    detailsExpr: "env.providerMode !== 'live-frontier' ? 'mock mode: skipped live medium-game build' : `${config.artifactFile} bytes=${artifact.length}`"
```
