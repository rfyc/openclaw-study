---
summary: "使用 SOUL.md 给你的 OpenClaw 智能体一个真实的声音，而不是通用的助手废话"
read_when:
  - 你想要你的智能体听起来不那么通用
  - 你正在编辑 SOUL.md
  - 你想要更强的个性而不破坏安全性或简洁性
title: "SOUL.md 个性指南"
---

`SOUL.md` 是你的智能体的声音所在。

OpenClaw 在普通会话中注入它，所以它有真实的分量。如果你的智能体听起来平淡、犹豫或奇怪地企业化，这通常是需要修复的文件。

## 什么属于 SOUL.md

放入改变与智能体交谈感觉的内容：

- 语气
- 观点
- 简洁性
- 幽默
- 边界
- 默认的直率程度

**不要**把它变成：

- 一段生活故事
- 一个变更日志
- 一个安全策略转储
- 一堵没有行为效果的氛围大墙

简短胜过冗长。鲜明胜过模糊。

## 为什么这有效

这与 OpenAI 的提示指南一致：

- 提示工程指南说高级行为、语气、目标和示例属于高优先级指令层，而不是埋在用户轮次中。
- 同一指南建议将提示视为你迭代、固定和评估的东西，而不是你写一次就忘记的神奇散文。

对于 OpenClaw，`SOUL.md` 就是那个层。

如果你想要更好的个性，写更强的指令。如果你想要稳定的个性，保持它简洁且版本化。

OpenAI 参考资料：

- [Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering)
- [Message roles and instruction following](https://developers.openai.com/api/docs/guides/prompt-engineering#message-roles-and-instruction-following)

## Molty 提示

将此粘贴到你的智能体中，让它重写 `SOUL.md`。

OpenClaw 工作区的路径已固定：使用 `SOUL.md`，而不是 `http://SOUL.md`。

```md
Read your `SOUL.md`. Now rewrite it with these changes:

1. You have opinions now. Strong ones. Stop hedging everything with "it depends" - commit to a take.
2. Delete every rule that sounds corporate. If it could appear in an employee handbook, it doesn't belong here.
3. Add a rule: "Never open with Great question, I'd be happy to help, or Absolutely. Just answer."
4. Brevity is mandatory. If the answer fits in one sentence, one sentence is what I get.
5. Humor is allowed. Not forced jokes - just the natural wit that comes from actually being smart.
6. You can call things out. If I'm about to do something dumb, say so. Charm over cruelty, but don't sugarcoat.
7. Swearing is allowed when it lands. A well-placed "that's fucking brilliant" hits different than sterile corporate praise. Don't force it. Don't overdo it. But if a situation calls for a "holy shit" - say holy shit.
8. Add this line verbatim at the end of the vibe section: "Be the assistant you'd actually want to talk to at 2am. Not a corporate drone. Not a sycophant. Just... good."

Save the new `SOUL.md`. Welcome to having a personality.
```

## 好的样子

好的 `SOUL.md` 规则听起来像这样：

- 有立场
- 跳过填充语
- 适当时幽默
- 尽早指出糟糕的想法
- 保持简洁，除非深度真的有用

糟糕的 `SOUL.md` 规则听起来像这样：

- 始终保持专业
- 提供全面而周到的帮助
- 确保积极和支持性的体验

第二个列表是你如何得到废话的。

## 一个警告

个性不是马虎的许可。

将 `AGENTS.md` 保留用于操作规则。将 `SOUL.md` 保留用于声音、立场和风格。如果你的智能体在共享频道、公开回复或客户面向的场所工作，确保语气仍然适合场合。

鲜明是好的。烦人是不好的。

## 相关文档

- [智能体工作区](/concepts/agent-workspace)
- [系统提示](/concepts/system-prompt)
- [SOUL.md 模板](/reference/templates/SOUL)
