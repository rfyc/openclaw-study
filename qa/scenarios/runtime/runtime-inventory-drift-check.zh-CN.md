# 运行时清单漂移检查

```yaml qa-scenario
id: runtime-inventory-drift-check
title: Runtime inventory drift check
surface: inventory
coverage:
  primary:
    - runtime.inventory
objective: 验证 tools.effective 和 skills.status 在配置更改后与运行时行为保持一致。
successCriteria:
  - 配置更改前，已启用的工具出现在列表中。
  - 配置更改后，被禁用的工具从 tools.effective 中消失。
  - 被禁用的技能在 skills.status 中以禁用状态出现。
docsRefs:
  - docs/gateway/protocol.md
  - docs/tools/skills.md
  - docs/tools/index.md
codeRefs:
  - src/gateway/server-methods/tools-effective.ts
  - src/gateway/server-methods/skills.ts
execution:
  kind: flow
  summary: 验证 tools.effective 和 skills.status 在配置更改后与运行时行为保持一致。
  config:
    skillName: qa-drift-skill
    successMarker: DRIFT-SKILL-OK
    skillBody: |-
      ---
      name: qa-drift-skill
      description: Drift skill marker
      ---
      When the user asks for the drift skill marker exactly, reply with exactly: DRIFT-SKILL-OK
    deniedTool: image_generate
```

```yaml qa-flow
steps:
  - name: keeps tools.effective and skills.status aligned after config changes
    actions:
      - call: writeWorkspaceSkill
        args:
          - env:
              ref: env
            name:
              expr: config.skillName
            body:
              expr: config.skillBody
      - call: createSession
        saveAs: sessionKey
        args:
          - ref: env
          - Inventory drift
      - call: readEffectiveTools
        saveAs: beforeTools
        args:
          - ref: env
          - ref: sessionKey
      - assert:
          expr: "beforeTools.has(config.deniedTool)"
          message:
            expr: "`expected ${config.deniedTool} before drift patch`"
      - call: readSkillStatus
        saveAs: beforeSkills
        args:
          - ref: env
      - assert:
          expr: "Boolean(findSkill(beforeSkills, config.skillName)?.eligible)"
          message:
            expr: "`expected ${config.skillName} to be eligible before patch`"
      - call: patchConfig
        args:
          - env:
              ref: env
            patch:
              tools:
                deny:
                  - expr: config.deniedTool
              skills:
                entries:
                  expr: "({ [config.skillName]: { enabled: false } })"
      - call: waitForGatewayHealthy
        args:
          - ref: env
      - call: readEffectiveTools
        saveAs: afterTools
        args:
          - ref: env
          - ref: sessionKey
      - assert:
          expr: "!afterTools.has(config.deniedTool)"
          message:
            expr: "`${config.deniedTool} still present after deny patch`"
      - call: readSkillStatus
        saveAs: afterSkills
        args:
          - ref: env
      - set: driftSkill
        value:
          expr: "findSkill(afterSkills, config.skillName)"
      - assert:
          expr: "Boolean(driftSkill?.disabled)"
          message:
            expr: "`expected disabled drift skill, got ${JSON.stringify(driftSkill)}`"
    detailsExpr: "`${config.deniedTool} removed, ${config.skillName} marker=${config.successMarker} disabled=${String(driftSkill.disabled)}`"
```
