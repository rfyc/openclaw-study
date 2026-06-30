---
summary: "多代理沙箱和工具限制的按代理配置、优先级规则及示例"
title: "多代理沙箱与工具"
sidebarTitle: "多代理沙箱与工具"
read_when: "你想在多代理网关中配置按代理沙箱或按代理工具允许/拒绝策略。"
status: active
---

多代理设置中的每个代理都可以覆盖全局沙箱和工具策略。本页介绍按代理配置、优先级规则和示例。

<CardGroup cols={3}>
  <Card title="沙箱" href="/gateway/sandboxing">
    后端和模式——完整的沙箱参考。
  </Card>
  <Card title="沙箱 vs 工具策略 vs 提升" href="/gateway/sandbox-vs-tool-policy-vs-elevated">
    调试"为什么被阻止？"
  </Card>
  <Card title="提升模式" href="/tools/elevated">
    为受信任发件人提升执行权限。
  </Card>
</CardGroup>

<Warning>
认证按代理作用域：每个代理在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 处有自己的 `agentDir` 认证存储。切勿在代理间重用 `agentDir`。代理在没有本地配置文件时可以读取默认/主代理的认证配置文件，但 OAuth 刷新令牌不会被克隆到辅助代理存储中。如果手动复制凭据，只复制可携带的静态 `api_key` 或 `token` 配置文件。
</Warning>

---

## 配置示例

<AccordionGroup>
  <Accordion title="示例 1：个人 + 受限家庭代理">
    ```json
    {
      "agents": {
        "list": [
          {
            "id": "main",
            "default": true,
            "name": "Personal Assistant",
            "workspace": "~/.openclaw/workspace",
            "sandbox": { "mode": "off" }
          },
          {
            "id": "family",
            "name": "Family Bot",
            "workspace": "~/.openclaw/workspace-family",
            "sandbox": {
              "mode": "all",
              "scope": "agent"
            },
            "tools": {
              "allow": ["read"],
              "deny": ["exec", "write", "edit", "apply_patch", "process", "browser"]
            }
          }
        ]
      },
      "bindings": [
        {
          "agentId": "family",
          "match": {
            "provider": "whatsapp",
            "accountId": "*",
            "peer": {
              "kind": "group",
              "id": "120363424282127706@g.us"
            }
          }
        }
      ]
    }
    ```

    **结果：**

    - `main` 代理：在主机上运行，完全工具访问权限。
    - `family` 代理：在 Docker 中运行（每个代理一个容器），只有 `read` 工具。

  </Accordion>
  <Accordion title="示例 2：具有共享沙箱的工作代理">
    ```json
    {
      "agents": {
        "list": [
          {
            "id": "personal",
            "workspace": "~/.openclaw/workspace-personal",
            "sandbox": { "mode": "off" }
          },
          {
            "id": "work",
            "workspace": "~/.openclaw/workspace-work",
            "sandbox": {
              "mode": "all",
              "scope": "shared",
              "workspaceRoot": "/tmp/work-sandboxes"
            },
            "tools": {
              "allow": ["read", "write", "apply_patch", "exec"],
              "deny": ["browser", "gateway", "discord"]
            }
          }
        ]
      }
    }
    ```
  </Accordion>
  <Accordion title="示例 2b：全局编程配置文件 + 仅消息代理">
    ```json
    {
      "tools": { "profile": "coding" },
      "agents": {
        "list": [
          {
            "id": "support",
            "tools": { "profile": "messaging", "allow": ["slack"] }
          }
        ]
      }
    }
    ```

    **结果：**

    - 默认代理获得编程工具。
    - `support` 代理仅限消息（+ Slack 工具）。

  </Accordion>
  <Accordion title="示例 3：每个代理使用不同的沙箱模式">
    ```json
    {
      "agents": {
        "defaults": {
          "sandbox": {
            "mode": "non-main",
            "scope": "session"
          }
        },
        "list": [
          {
            "id": "main",
            "workspace": "~/.openclaw/workspace",
            "sandbox": {
              "mode": "off"
            }
          },
          {
            "id": "public",
            "workspace": "~/.openclaw/workspace-public",
            "sandbox": {
              "mode": "all",
              "scope": "agent"
            },
            "tools": {
              "allow": ["read"],
              "deny": ["exec", "write", "edit", "apply_patch"]
            }
          }
        ]
      }
    }
    ```
  </Accordion>
</AccordionGroup>

---

## 配置优先级

当全局（`agents.defaults.*`）和代理特定（`agents.list[].*`）配置同时存在时：

### 沙箱配置

代理特定设置覆盖全局设置：

```
agents.list[].sandbox.mode > agents.defaults.sandbox.mode
agents.list[].sandbox.scope > agents.defaults.sandbox.scope
agents.list[].sandbox.workspaceRoot > agents.defaults.sandbox.workspaceRoot
agents.list[].sandbox.workspaceAccess > agents.defaults.sandbox.workspaceAccess
agents.list[].sandbox.docker.* > agents.defaults.sandbox.docker.*
agents.list[].sandbox.browser.* > agents.defaults.sandbox.browser.*
agents.list[].sandbox.prune.* > agents.defaults.sandbox.prune.*
```

<Note>
`agents.list[].sandbox.{docker,browser,prune}.*` 为该代理覆盖 `agents.defaults.sandbox.{docker,browser,prune}.*`（当沙箱范围解析为 `"shared"` 时忽略）。
</Note>

### 工具限制

过滤顺序为：

<Steps>
  <Step title="工具配置文件">
    `tools.profile` 或 `agents.list[].tools.profile`。
  </Step>
  <Step title="提供商工具配置文件">
    `tools.byProvider[provider].profile` 或 `agents.list[].tools.byProvider[provider].profile`。
  </Step>
  <Step title="全局工具策略">
    `tools.allow` / `tools.deny`。
  </Step>
  <Step title="提供商工具策略">
    `tools.byProvider[provider].allow/deny`。
  </Step>
  <Step title="代理特定工具策略">
    `agents.list[].tools.allow/deny`。
  </Step>
  <Step title="代理提供商策略">
    `agents.list[].tools.byProvider[provider].allow/deny`。
  </Step>
  <Step title="沙箱工具策略">
    `tools.sandbox.tools` 或 `agents.list[].tools.sandbox.tools`。
  </Step>
  <Step title="子代理工具策略">
    `tools.subagents.tools`（如适用）。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="优先级规则">
    - 每个级别都可以进一步限制工具，但不能恢复早期级别拒绝的工具。
    - 如果设置了 `agents.list[].tools.sandbox.tools`，它会替换该代理的 `tools.sandbox.tools`。
    - 如果设置了 `agents.list[].tools.profile`，它会覆盖该代理的 `tools.profile`。
    - 提供商工具键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.4`）。

  </Accordion>
  <Accordion title="空白名单行为">
    如果该链中的任何显式白名单使运行没有可调用的工具，OpenClaw 会在将提示提交给模型之前停止。这是有意为之：配置了缺失工具（如 `agents.list[].tools.allow: ["query_db"]`）的代理应该大声报错，直到注册 `query_db` 的插件被启用，而不是继续作为纯文本代理。
  </Accordion>
</AccordionGroup>

工具策略支持 `group:*` 简写，可扩展为多个工具。完整列表请参阅[工具组](/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands)。

按代理提升覆盖（`agents.list[].tools.elevated`）可以进一步限制特定代理的提升执行权限。详情请参阅[提升模式](/tools/elevated)。

---

## 从单代理迁移

<Tabs>
  <Tab title="迁移前（单代理）">
    ```json
    {
      "agents": {
        "defaults": {
          "workspace": "~/.openclaw/workspace",
          "sandbox": {
            "mode": "non-main"
          }
        }
      },
      "tools": {
        "sandbox": {
          "tools": {
            "allow": ["read", "write", "apply_patch", "exec"],
            "deny": []
          }
        }
      }
    }
    ```
  </Tab>
  <Tab title="迁移后（多代理）">
    ```json
    {
      "agents": {
        "list": [
          {
            "id": "main",
            "default": true,
            "workspace": "~/.openclaw/workspace",
            "sandbox": { "mode": "off" }
          }
        ]
      }
    }
    ```
  </Tab>
</Tabs>

<Note>
旧版 `agent.*` 配置由 `openclaw doctor` 迁移；今后优先使用 `agents.defaults` + `agents.list`。
</Note>

---

## 工具限制示例

<Tabs>
  <Tab title="只读代理">
    ```json
    {
      "tools": {
        "allow": ["read"],
        "deny": ["exec", "write", "edit", "apply_patch", "process"]
      }
    }
    ```
  </Tab>
  <Tab title="安全执行（无文件修改）">
    ```json
    {
      "tools": {
        "allow": ["read", "exec", "process"],
        "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
      }
    }
    ```
  </Tab>
  <Tab title="仅通信">
    ```json
    {
      "tools": {
        "sessions": { "visibility": "tree" },
        "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
        "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
      }
    }
    ```

    此配置文件中的 `sessions_history` 仍然返回有限的、经过清理的召回视图，而不是原始的转录本转储。助理召回会去除思考标签、`<relevant-memories>` 脚手架、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及截断的工具调用块）、降级的工具调用脚手架、泄露的 ASCII/全角模型控制令牌，以及在修订/截断之前的格式错误的 MiniMax 工具调用 XML。

  </Tab>
</Tabs>

---

## 常见陷阱："non-main"

<Warning>
`agents.defaults.sandbox.mode: "non-main"` 基于 `session.mainKey`（默认为 `"main"`），而非代理 ID。群组/频道会话始终获得自己的密钥，因此被视为非主会话并将被沙箱化。如果你希望某个代理从不沙箱化，请设置 `agents.list[].sandbox.mode: "off"`。
</Warning>

---

## 测试

配置多代理沙箱和工具后：

<Steps>
  <Step title="检查代理解析">
    ```bash
    openclaw agents list --bindings
    ```
  </Step>
  <Step title="验证沙箱容器">
    ```bash
    docker ps --filter "name=openclaw-sbx-"
    ```
  </Step>
  <Step title="测试工具限制">
    - 发送需要受限工具的消息。
    - 验证代理无法使用被拒绝的工具。

  </Step>
  <Step title="监控日志">
    ```bash
    tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
    ```
  </Step>
</Steps>

---

## 故障排除

<AccordionGroup>
  <Accordion title="尽管设置了 `mode: 'all'` 但代理未被沙箱化">
    - 检查是否有全局 `agents.defaults.sandbox.mode` 覆盖了它。
    - 代理特定配置优先，因此设置 `agents.list[].sandbox.mode: "all"`。

  </Accordion>
  <Accordion title="尽管有拒绝列表，工具仍然可用">
    - 检查工具过滤顺序：全局 → 代理 → 沙箱 → 子代理。
    - 每个级别只能进一步限制，不能恢复。
    - 通过日志验证：`[tools] filtering tools for agent:${agentId}`。

  </Accordion>
  <Accordion title="容器未按代理隔离">
    - 在代理特定沙箱配置中设置 `scope: "agent"`。
    - 默认是 `"session"`，每个会话创建一个容器。

  </Accordion>
</AccordionGroup>

---

## 相关链接

- [提升模式](/tools/elevated)
- [多代理路由](/concepts/multi-agent)
- [沙箱配置](/gateway/config-agents#agentsdefaultssandbox)
- [沙箱 vs 工具策略 vs 提升](/gateway/sandbox-vs-tool-policy-vs-elevated) — 调试"为什么被阻止？"
- [沙箱](/gateway/sandboxing) — 完整的沙箱参考（模式、范围、后端、镜像）
- [会话管理](/concepts/session)
