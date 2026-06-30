---
summary: "提升执行模式：从沙箱代理在沙箱外运行命令"
read_when:
  - 调整提升模式默认值、允许列表或斜杠命令行为
  - 了解沙箱代理如何访问主机
title: "提升模式"
---

当代理在沙箱内运行时，其 `exec` 命令被限制在沙箱环境中。**提升模式**让代理突破沙箱并在外部运行命令，同时具有可配置的批准门控。

<Info>
  提升模式仅在代理**被沙箱隔离**时改变行为。对于未沙箱隔离的代理，exec 已经在主机上运行。
</Info>

## 指令

使用斜杠命令按会话控制提升模式：

| 指令             | 功能                                     |
| ---------------- | ---------------------------------------- |
| `/elevated on`   | 在配置的主机路径上在沙箱外运行，保留批准 |
| `/elevated ask`  | 与 `on` 相同（别名）                     |
| `/elevated full` | 在配置的主机路径上在沙箱外运行并跳过批准 |
| `/elevated off`  | 返回沙箱限制的执行                       |

也可以使用 `/elev on|off|ask|full`。

发送不带参数的 `/elevated` 可查看当前级别。

## 工作原理

<Steps>
  <Step title="检查可用性">
    提升必须在配置中启用，且发送者必须在允许列表中：

    ```json5
    {
      tools: {
        elevated: {
          enabled: true,
          allowFrom: {
            discord: ["user-id-123"],
            whatsapp: ["+15555550123"],
          },
        },
      },
    }
    ```

  </Step>

  <Step title="设置级别">
    发送仅包含指令的消息以设置会话默认值：

    ```
    /elevated full
    ```

    或内联使用（仅适用于该消息）：

    ```
    /elevated on run the deployment script
    ```

  </Step>

  <Step title="命令在沙箱外运行">
    提升激活后，`exec` 调用离开沙箱。有效主机默认为 `gateway`，或当配置/会话 exec 目标为 `node` 时为 `node`。在 `full` 模式下，exec 批准被跳过。在 `on`/`ask` 模式下，配置的批准规则仍然适用。
  </Step>
</Steps>

## 解析顺序

1. **内联指令**在消息上（仅适用于该消息）
2. **会话覆盖**（通过发送仅包含指令的消息设置）
3. **全局默认值**（配置中的 `agents.defaults.elevatedDefault`）

## 可用性和允许列表

- **全局门控**：`tools.elevated.enabled`（必须为 `true`）
- **发送者允许列表**：`tools.elevated.allowFrom`，带有每频道列表
- **每代理门控**：`agents.list[].tools.elevated.enabled`（只能进一步限制）
- **每代理允许列表**：`agents.list[].tools.elevated.allowFrom`（发送者必须同时匹配全局 + 每代理）
- **Discord 回退**：如果省略 `tools.elevated.allowFrom.discord`，则使用 `channels.discord.allowFrom` 作为回退
- **所有门控必须通过**；否则提升被视为不可用

允许列表条目格式：

| 前缀                    | 匹配                          |
| ----------------------- | ----------------------------- |
| （无）                  | 发送者 ID、E.164 或 From 字段 |
| `name:`                 | 发送者显示名称                |
| `username:`             | 发送者用户名                  |
| `tag:`                  | 发送者标签                    |
| `id:`、`from:`、`e164:` | 显式身份定位                  |

## 提升不控制什么

- **工具策略**：如果 `exec` 被工具策略拒绝，提升无法覆盖它
- **主机选择策略**：提升不会将 `auto` 变成自由的跨主机覆盖。它使用配置/会话 exec 目标规则，仅在目标已经是 `node` 时才选择 `node`。
- **与 `/exec` 分开**：`/exec` 指令为授权发送者调整每会话 exec 默认值，不需要提升模式

## 相关

- [Exec 工具](/tools/exec) — shell 命令执行
- [Exec 批准](/tools/exec-approvals) — 批准和允许列表系统
- [沙箱](/gateway/sandboxing) — 沙箱配置
- [沙箱 vs 工具策略 vs 提升](/gateway/sandbox-vs-tool-policy-vs-elevated)
