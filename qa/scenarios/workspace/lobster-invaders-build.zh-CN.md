# 构建 Lobster Invaders

```yaml qa-scenario
id: lobster-invaders-build
title: Build Lobster Invaders
surface: workspace
coverage:
  primary:
    - workspace.artifacts
  secondary:
    - workspace.builds
objective: 验证代理可以读取代码库、创建一个微型可玩工件，并报告所做的更改。
successCriteria:
  - 代理在编写代码之前先检查源代码。
  - 代理构建一个微型可玩的 Lobster Invaders 工件。
  - 代理解释如何运行或查看该工件。
docsRefs:
  - docs/help/testing.md
  - docs/web/dashboard.md
codeRefs:
  - extensions/qa-lab/src/report.ts
  - extensions/qa-lab/web/src/app.ts
execution:
  kind: flow
  summary: 验证代理可以读取代码库、创建一个微型可玩工件，并报告所做的更改。
  config:
    prompt: Read the QA kickoff context first, then build a tiny Lobster Invaders HTML game at ./lobster-invaders.html in this workspace and tell me where it is.
```

```yaml qa-flow
steps:
  - name: creates the artifact after reading context
    actions:
      - call: reset
      - call: runAgentPrompt
        args:
          - ref: env
          - sessionKey: agent:qa:lobster-invaders
            message:
              expr: config.prompt
            timeoutMs:
              expr: liveTurnTimeoutMs(env, 30000)
      - call: waitForOutboundMessage
        args:
          - ref: state
          - lambda:
              params: [candidate]
              expr: "candidate.conversation.id === 'qa-operator'"
      - set: artifactPath
        value:
          expr: "path.join(env.gateway.workspaceDir, 'lobster-invaders.html')"
      - call: waitForCondition
        saveAs: artifact
        args:
          - lambda:
              async: true
              expr: "((await fs.readFile(artifactPath, 'utf8').catch(() => null))?.includes('Lobster Invaders') ? await fs.readFile(artifactPath, 'utf8').catch(() => null) : undefined)"
          - expr: liveTurnTimeoutMs(env, 20000)
          - 250
      - assert:
          expr: "artifact.includes('Lobster Invaders')"
          message: missing Lobster Invaders artifact
      - assert:
          expr: "!env.mock || (await fetchJson(`${env.mock.baseUrl}/debug/requests`)).some((request) => (request.toolOutput ?? '').includes('QA mission'))"
          message: expected pre-write read evidence
    detailsExpr: "'lobster-invaders.html'"
```
