---
summary: "`openclaw docs` 的 CLI 参考（搜索实时文档索引）"
read_when:
  - 你想从终端搜索实时 OpenClaw 文档
title: "Docs"
---

# `openclaw docs`

搜索实时文档索引。

参数：

- `[query...]`：发送到实时文档索引的搜索词

示例：

```bash
openclaw docs
openclaw docs browser existing-session
openclaw docs sandbox allowHostControl
openclaw docs gateway token secretref
```

备注：

- 不带查询时，`openclaw docs` 打开实时文档搜索入口。
- 多词查询作为一个搜索请求传递。

## 相关

- [CLI 参考](/cli)
