---
name: compaction-notifier
description: "在会话压缩开始和完成时发送可见的聊天通知。"
metadata:
  {
    "openclaw":
      {
        "emoji": "🧹",
        "events": ["session:compact:before", "session:compact:after"],
        "always": true,
      },
  }
---

# 压缩通知器

当 OpenClaw 压缩会话对话记录时，向用户发送简短的可见状态消息。通过以下命令启用：

```bash
openclaw hooks enable compaction-notifier
```

这在聊天界面上非常有用，因为较长的回合在上下文摘要期间可能看起来像卡住了。
