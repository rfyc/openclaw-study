---
summary: "`openclaw status` 的 CLI 参考（诊断、探测、使用量快照）"
read_when:
  - 你想快速诊断频道健康状况 + 最近的会话收件人时
  - 你想获取用于调试的"all"状态时
title: "Status"
---

# `openclaw status`

频道 + 会话的诊断。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

注意：

- `--deep` 运行实时探测（WhatsApp Web + Telegram + Discord + Slack + Signal）。
- 普通 `openclaw status` 保持在快速只读路径上，当跳过记忆检查时将记忆标记为 `not checked` 而不是不可用。繁重的安全审计、插件兼容性和记忆向量探测留给 `openclaw status --all`、`openclaw status --deep`、`openclaw security audit` 和 `openclaw memory status --deep`。
- `status --json --all` 从 `plugins.slots.memory` 选择的活跃记忆插件运行时报告记忆详情。自定义记忆插件可以让内置的 `agents.defaults.memorySearch.enabled` 禁用，同时仍然报告其自己的文件、块、向量和 FTS 状态。
- `--usage` 将规范化的提供商使用窗口打印为 `X% left`。
- 会话状态输出将 `Execution:` 与 `Runtime:` 分开。`Execution` 是沙箱路径（`direct`、`docker/*`），而 `Runtime` 告诉你会话是否使用 `OpenClaw Pi Default`、`OpenAI Codex`、CLI 后端或 ACP 后端（如 `codex (acp/acpx)`）。请参阅[代理运行时](/concepts/agent-runtimes)了解提供商/模型/运行时区别。
- MiniMax 的原始 `usage_percent` / `usagePercent` 字段是剩余配额，因此 OpenClaw 在显示前反转它们；基于数量的字段在存在时优先。`model_remains` 响应优先使用聊天模型条目，在需要时从时间戳派生窗口标签，并在计划标签中包含模型名称。
- 当当前会话快照稀疏时，`/status` 可以从最近的转录使用日志中回填令牌和缓存计数器。现有的非零实时值仍然优先于转录回退值。
- 当实时会话条目缺少活跃运行时模型标签时，转录回退也可以恢复它。如果该转录模型与所选模型不同，状态会针对恢复的运行时模型而不是所选模型解析上下文窗口。
- 对于提示大小核算，当会话元数据缺失或更小时，转录回退优先使用更大的面向提示的总数，因此自定义提供商会话不会折叠到 `0` 令牌显示。
- 当配置了多个代理时，输出包含每个代理的会话存储。
- 概览在可用时包含 Gateway + 节点主机服务安装/运行时状态。
- 概览包含更新频道 + git SHA（对于源检出）。
- 更新信息显示在概览中；如果有更新可用，状态会打印运行 `openclaw update` 的提示（请参阅[更新](/install/updating)）。
- 只读状态界面（`status`、`status --json`、`status --all`）在可能时为其目标配置路径解析受支持的 SecretRef。
- 如果支持的频道 SecretRef 已配置但在当前命令路径中不可用，状态保持只读并报告降级输出而不是崩溃。人类输出显示警告，如"在此命令路径中配置的令牌不可用"，JSON 输出包含 `secretDiagnostics`。
- 当命令本地 SecretRef 解析成功时，状态优先使用解析的快照，并从最终输出中清除暂时性的"密钥不可用"频道标记。
- `status --all` 包含密钥概览行和诊断部分，该部分总结密钥诊断（为可读性而截断）而不停止报告生成。

## 相关

- [CLI 参考](/cli)
- [Doctor](/gateway/doctor)
