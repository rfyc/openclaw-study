# Gateway 服务器方法说明

- Pi 会话对话记录是 `parentId` 链/DAG；永远不要通过原始 JSONL 写入追加 Pi `type: "message"` 条目（缺少 `parentId` 会切断叶子路径并破坏压缩/历史记录）。始终通过 `SessionManager.appendMessage(...)` （或使用它的包装器）写入对话记录消息。
