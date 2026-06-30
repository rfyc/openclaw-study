# update run 包自升级

```yaml qa-scenario
id: update-run-package-self-upgrade
title: Update run package self-upgrade
surface: runtime
coverage:
  primary:
    - runtime.update-run
  secondary:
    - runtime.gateway-restart
    - runtime.package-update
objective: 验证代理可以通过 gateway update.run 动作将已安装的 OpenClaw 包从 2026.4.26 自升级到最新版本，并在强制重启后成功恢复。
successCriteria:
  - 代理被明确指示使用 gateway 工具动作 update.run，而非 shell 包管理器命令。
  - 更新请求携带重启后可观察的重启注释标记。
  - update.run 重启进程后，Gateway 和 qa-channel 恢复健康状态。
docsRefs:
  - docs/cli/update.md
  - docs/install/updating.md
  - docs/gateway/protocol.md
codeRefs:
  - src/agents/tools/gateway-tool.ts
  - src/gateway/server-methods/update.ts
  - src/infra/restart.ts
execution:
  kind: flow
  summary: "可选破坏性包更新通道：要求代理通过 gateway 动作 update.run 将 2026.4.26 安装更新到最新版本，并在恢复后验证重启标记。"
  config:
    requiredProviderMode: live-frontier
    sourceVersion: "2026.4.26"
    targetTag: latest
    allowEnv: OPENCLAW_QA_ALLOW_UPDATE_RUN_SELF
    channelId: qa-room
```

```yaml qa-flow
steps:
  - name: asks the agent to self-update through update.run
    actions:
      - if:
          expr: "env.gateway.runtimeEnv[config.allowEnv] !== '1'"
          then:
            - assert: "true"
          else:
            - call: waitForGatewayHealthy
              args:
                - ref: env
                - 60000
            - call: waitForQaChannelReady
              args:
                - ref: env
                - 60000
            - call: reset
            - set: sessionKey
              value:
                expr: "buildAgentSessionKey({ agentId: 'qa', channel: 'qa-channel', peer: { kind: 'channel', id: config.channelId } })"
            - call: createSession
              args:
                - ref: env
                - Update run package self-upgrade
                - ref: sessionKey
            - call: readEffectiveTools
              saveAs: tools
              args:
                - ref: env
                - ref: sessionKey
            - assert:
                expr: "tools.has('gateway')"
                message: gateway tool not present for update.run self-upgrade scenario
            - set: startIndex
              value:
                expr: state.getSnapshot().messages.length
            - set: marker
              value:
                expr: "`QA-UPDATE-RUN-${randomUUID().slice(0, 8)}`"
            - call: startAgentRun
              saveAs: started
              args:
                - ref: env
                - sessionKey:
                    ref: sessionKey
                  to:
                    expr: "`channel:${config.channelId}`"
                  message:
                    expr: |-
                      `Update-run self-upgrade QA check. The OpenClaw package under test was installed from openclaw@${config.sourceVersion} and must update itself to openclaw@${config.targetTag}. Use the gateway tool with action=update.run. Do not run npm, pnpm, bun, git pull, or shell package-manager commands yourself. Set note exactly to "${marker} update.run complete" and restartDelayMs to 0 so the post-restart channel message proves recovery.`
                  timeoutMs:
                    expr: liveTurnTimeoutMs(env, 180000)
            - call: waitForGatewayHealthy
              args:
                - ref: env
                - 180000
            - call: waitForQaChannelReady
              args:
                - ref: env
                - 180000
            - call: waitForOutboundMessage
              saveAs: outbound
              args:
                - ref: state
                - lambda:
                    params: [candidate]
                    expr: "candidate.text.includes(marker)"
                - expr: liveTurnTimeoutMs(env, 180000)
                - sinceIndex:
                    ref: startIndex
            - call: env.gateway.call
              saveAs: updateStatus
              args:
                - update.status
                - {}
                - timeoutMs: 30000
            - assert:
                expr: "Boolean(updateStatus?.sentinel)"
                message:
                  expr: "`update.status did not report a restart sentinel after update.run: ${JSON.stringify(updateStatus)}`"
    detailsExpr: "env.gateway.runtimeEnv[config.allowEnv] !== '1' ? `skipped destructive package self-update; set ${config.allowEnv}=1 to run` : `runId=${started.runId} marker=${marker} outbound=${outbound.text}`"
```
