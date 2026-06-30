---
summary: "向多个智能体广播 WhatsApp 消息"
read_when:
  - 配置广播组
  - 调试 WhatsApp 中多智能体回复问题
status: experimental
title: "广播组"
sidebarTitle: "广播组"
---

<Note>
**状态：** 实验性功能。在 2026.1.9 版本中添加。
</Note>

## 概述

广播组允许多个智能体同时处理并响应同一条消息。这使您可以在单个 WhatsApp 群组或私信中创建专门的智能体团队——全部使用一个手机号码。

当前范围：**仅限 WhatsApp**（网页频道）。

广播组在频道白名单和群组激活规则之后进行评估。在 WhatsApp 群组中，这意味着当 OpenClaw 正常情况下会回复时（例如：根据您的群组设置，在被@提及时）才会触发广播。

## 使用场景

<AccordionGroup>
  <Accordion title="1. 专业智能体团队">
    部署具有原子化、聚焦职责的多个智能体：

    ```
    群组：「开发团队」
    智能体：
      - 代码审查员（审查代码片段）
      - 文档机器人（生成文档）
      - 安全审计员（检查漏洞）
      - 测试生成器（建议测试用例）
    ```

    每个智能体处理同一条消息并提供其专业视角。

  </Accordion>
  <Accordion title="2. 多语言支持">
    ```
    群组：「国际支持」
    智能体：
      - Agent_EN（用英语回复）
      - Agent_DE（用德语回复）
      - Agent_ES（用西班牙语回复）
    ```
  </Accordion>
  <Accordion title="3. 质量保证工作流">
    ```
    群组：「客户支持」
    智能体：
      - 支持智能体（提供答案）
      - QA 智能体（审查质量，仅在发现问题时回复）
    ```
  </Accordion>
  <Accordion title="4. 任务自动化">
    ```
    群组：「项目管理」
    智能体：
      - 任务追踪器（更新任务数据库）
      - 时间记录器（记录花费时间）
      - 报告生成器（创建摘要）
    ```
  </Accordion>
</AccordionGroup>

## 配置

### 基本设置

在顶层添加 `broadcast` 部分（与 `bindings` 并列）。键为 WhatsApp 对等 ID：

- 群组聊天：群组 JID（例如 `120363403215116621@g.us`）
- 私信：E.164 手机号码（例如 `+15551234567`）

```json
{
  "broadcast": {
    "120363403215116621@g.us": ["alfred", "baerbel", "assistant3"]
  }
}
```

**结果：** 当 OpenClaw 将在此聊天中回复时，它将运行全部三个智能体。

### 处理策略

控制智能体处理消息的方式：

<Tabs>
  <Tab title="parallel（默认）">
    所有智能体同时处理：

    ```json
    {
      "broadcast": {
        "strategy": "parallel",
        "120363403215116621@g.us": ["alfred", "baerbel"]
      }
    }
    ```

  </Tab>
  <Tab title="sequential">
    智能体按顺序处理（一个等前一个完成后才开始）：

    ```json
    {
      "broadcast": {
        "strategy": "sequential",
        "120363403215116621@g.us": ["alfred", "baerbel"]
      }
    }
    ```

  </Tab>
</Tabs>

### 完整示例

```json
{
  "agents": {
    "list": [
      {
        "id": "code-reviewer",
        "name": "Code Reviewer",
        "workspace": "/path/to/code-reviewer",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "security-auditor",
        "name": "Security Auditor",
        "workspace": "/path/to/security-auditor",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "docs-generator",
        "name": "Documentation Generator",
        "workspace": "/path/to/docs-generator",
        "sandbox": { "mode": "all" }
      }
    ]
  },
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["code-reviewer", "security-auditor", "docs-generator"],
    "120363424282127706@g.us": ["support-en", "support-de"],
    "+15555550123": ["assistant", "logger"]
  }
}
```

## 工作原理

### 消息流程

<Steps>
  <Step title="收到传入消息">
    WhatsApp 群组或私信消息到达。
  </Step>
  <Step title="广播检查">
    系统检查对等 ID 是否在 `broadcast` 中。
  </Step>
  <Step title="如果在广播列表中">
    - 所有列出的智能体处理该消息。
    - 每个智能体有自己的会话密钥和隔离上下文。
    - 智能体并行处理（默认）或按顺序处理。

  </Step>
  <Step title="如果不在广播列表中">
    应用正常路由（匹配到的第一个绑定）。
  </Step>
</Steps>

<Note>
广播组不会绕过频道白名单或群组激活规则（@提及/命令等）。它们只改变当消息符合处理条件时_哪些智能体运行_。
</Note>

### 会话隔离

广播组中的每个智能体维护完全独立的：

- **会话密钥**（`agent:alfred:whatsapp:group:120363...` 与 `agent:baerbel:whatsapp:group:120363...`）
- **对话历史**（智能体看不到其他智能体的消息）
- **工作区**（如果配置了，则使用独立沙盒）
- **工具访问**（不同的允许/拒绝列表）
- **记忆/上下文**（独立的 IDENTITY.md、SOUL.md 等）
- **群组上下文缓冲区**（用于上下文的近期群组消息）按对等方共享，因此所有广播智能体在触发时看到相同的上下文

这允许每个智能体拥有：

- 不同的人格
- 不同的工具访问权限（例如，只读 vs. 读写）
- 不同的模型（例如，opus vs. sonnet）
- 不同的已安装技能

### 示例：隔离的会话

在群组 `120363403215116621@g.us` 中，智能体为 `["alfred", "baerbel"]`：

<Tabs>
  <Tab title="Alfred 的上下文">
    ```
    会话：agent:alfred:whatsapp:group:120363403215116621@g.us
    历史：[用户消息，alfred 的之前回复]
    工作区：/Users/user/openclaw-alfred/
    工具：read、write、exec
    ```
  </Tab>
  <Tab title="Bärbel 的上下文">
    ```
    会话：agent:baerbel:whatsapp:group:120363403215116621@g.us
    历史：[用户消息，baerbel 的之前回复]
    工作区：/Users/user/openclaw-baerbel/
    工具：只读
    ```
  </Tab>
</Tabs>

## 最佳实践

<AccordionGroup>
  <Accordion title="1. 保持智能体专注">
    设计每个智能体只有单一、明确的职责：

    ```json
    {
      "broadcast": {
        "DEV_GROUP": ["formatter", "linter", "tester"]
      }
    }
    ```

    ✅ **好的做法：** 每个智能体只负责一项工作。❌ **不好的做法：** 一个通用的 "dev-helper" 智能体。

  </Accordion>
  <Accordion title="2. 使用描述性名称">
    清楚地表明每个智能体的职责：

    ```json
    {
      "agents": {
        "security-scanner": { "name": "Security Scanner" },
        "code-formatter": { "name": "Code Formatter" },
        "test-generator": { "name": "Test Generator" }
      }
    }
    ```

  </Accordion>
  <Accordion title="3. 配置不同的工具访问权限">
    只给智能体所需的工具：

    ```json
    {
      "agents": {
        "reviewer": {
          "tools": { "allow": ["read", "exec"] }
        },
        "fixer": {
          "tools": { "allow": ["read", "write", "edit", "exec"] }
        }
      }
    }
    ```

    `reviewer` 是只读的，`fixer` 可以读写。

  </Accordion>
  <Accordion title="4. 监控性能">
    对于多个智能体，请考虑：

    - 使用 `"strategy": "parallel"`（默认）提升速度
    - 将每组广播智能体数量限制在 5-10 个
    - 对较简单的智能体使用更快的模型

  </Accordion>
  <Accordion title="5. 优雅处理失败">
    智能体独立失败。一个智能体的错误不会阻止其他智能体：

    ```
    消息 → [智能体 A ✓，智能体 B ✗ 出错，智能体 C ✓]
    结果：智能体 A 和 C 回复，智能体 B 记录错误
    ```

  </Accordion>
</AccordionGroup>

## 兼容性

### 供应商

广播组目前支持：

- ✅ WhatsApp（已实现）
- 🚧 Telegram（计划中）
- 🚧 Discord（计划中）
- 🚧 Slack（计划中）

### 路由

广播组与现有路由协同工作：

```json
{
  "bindings": [
    {
      "match": { "channel": "whatsapp", "peer": { "kind": "group", "id": "GROUP_A" } },
      "agentId": "alfred"
    }
  ],
  "broadcast": {
    "GROUP_B": ["agent1", "agent2"]
  }
}
```

- `GROUP_A`：只有 alfred 回复（正常路由）。
- `GROUP_B`：agent1 和 agent2 都回复（广播）。

<Note>
**优先级：** `broadcast` 优先于 `bindings`。
</Note>

## 故障排查

<AccordionGroup>
  <Accordion title="智能体没有回复">
    **检查：**

    1. 智能体 ID 存在于 `agents.list` 中。
    2. 对等 ID 格式正确（例如 `120363403215116621@g.us`）。
    3. 智能体不在拒绝列表中。

    **调试：**

    ```bash
    tail -f ~/.openclaw/logs/gateway.log | grep broadcast
    ```

  </Accordion>
  <Accordion title="只有一个智能体回复">
    **原因：** 对等 ID 可能在 `bindings` 中而不在 `broadcast` 中。

    **解决方法：** 添加到广播配置或从绑定中删除。

  </Accordion>
  <Accordion title="性能问题">
    如果多个智能体导致速度慢：

    - 减少每组的智能体数量。
    - 使用更轻量的模型（用 sonnet 代替 opus）。
    - 检查沙盒启动时间。

  </Accordion>
</AccordionGroup>

## 示例

<AccordionGroup>
  <Accordion title="示例 1：代码审查团队">
    ```json
    {
      "broadcast": {
        "strategy": "parallel",
        "120363403215116621@g.us": [
          "code-formatter",
          "security-scanner",
          "test-coverage",
          "docs-checker"
        ]
      },
      "agents": {
        "list": [
          {
            "id": "code-formatter",
            "workspace": "~/agents/formatter",
            "tools": { "allow": ["read", "write"] }
          },
          {
            "id": "security-scanner",
            "workspace": "~/agents/security",
            "tools": { "allow": ["read", "exec"] }
          },
          {
            "id": "test-coverage",
            "workspace": "~/agents/testing",
            "tools": { "allow": ["read", "exec"] }
          },
          { "id": "docs-checker", "workspace": "~/agents/docs", "tools": { "allow": ["read"] } }
        ]
      }
    }
    ```

    **用户发送：** 代码片段。

    **响应：**

    - code-formatter：「已修复缩进并添加了类型提示」
    - security-scanner：「⚠️ 第 12 行存在 SQL 注入漏洞」
    - test-coverage：「覆盖率为 45%，缺少错误用例的测试」
    - docs-checker：「函数 `process_data` 缺少文档字符串」

  </Accordion>
  <Accordion title="示例 2：多语言支持">
    ```json
    {
      "broadcast": {
        "strategy": "sequential",
        "+15555550123": ["detect-language", "translator-en", "translator-de"]
      },
      "agents": {
        "list": [
          { "id": "detect-language", "workspace": "~/agents/lang-detect" },
          { "id": "translator-en", "workspace": "~/agents/translate-en" },
          { "id": "translator-de", "workspace": "~/agents/translate-de" }
        ]
      }
    }
    ```
  </Accordion>
</AccordionGroup>

## API 参考

### 配置模式

```typescript
interface OpenClawConfig {
  broadcast?: {
    strategy?: "parallel" | "sequential";
    [peerId: string]: string[];
  };
}
```

### 字段

<ParamField path="strategy" type='"parallel" | "sequential"' default='"parallel"'>
  处理智能体的方式。`parallel` 同时运行所有智能体；`sequential` 按数组顺序依次运行。
</ParamField>
<ParamField path="[peerId]" type="string[]">
  WhatsApp 群组 JID、E.164 号码或其他对等 ID。值是应处理消息的智能体 ID 数组。
</ParamField>

## 限制

1. **最大智能体数：** 没有硬性限制，但超过 10 个智能体可能会很慢。
2. **共享上下文：** 智能体看不到彼此的回复（这是设计上的考量）。
3. **消息排序：** 并行回复可能以任意顺序到达。
4. **速率限制：** 所有智能体都计入 WhatsApp 速率限制。

## 未来增强

计划中的功能：

- [ ] 共享上下文模式（智能体可以看到彼此的回复）
- [ ] 智能体协调（智能体可以相互发送信号）
- [ ] 动态智能体选择（根据消息内容选择智能体）
- [ ] 智能体优先级（某些智能体优先于其他智能体回复）

## 相关文档

- [频道路由](/channels/channel-routing)
- [群组](/channels/groups)
- [多智能体沙盒工具](/tools/multi-agent-sandbox-tools)
- [配对](/channels/pairing)
- [会话管理](/concepts/session)
