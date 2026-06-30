---
name: feishu-wiki
description: |
  飞书知识库导航。当用户提及知识库、Wiki 或 Wiki 链接时激活。
---

# 飞书 Wiki 工具

单一工具 `feishu_wiki` 用于知识库操作。

## Token 提取

从 URL `https://xxx.feishu.cn/wiki/ABC123def` → `token` = `ABC123def`

## 操作

### 列出知识空间

```json
{ "action": "spaces" }
```

返回所有可访问的 Wiki 空间。

### 列出节点

```json
{ "action": "nodes", "space_id": "7xxx" }
```

带父节点：

```json
{ "action": "nodes", "space_id": "7xxx", "parent_node_token": "wikcnXXX" }
```

### 获取节点详情

```json
{ "action": "get", "token": "ABC123def" }
```

返回：`node_token`、`obj_token`、`obj_type` 等。使用 `obj_token` 与 `feishu_doc` 一起读写文档。

### 创建节点

```json
{ "action": "create", "space_id": "7xxx", "title": "新页面" }
```

指定类型和父节点：

```json
{
  "action": "create",
  "space_id": "7xxx",
  "title": "表格",
  "obj_type": "sheet",
  "parent_node_token": "wikcnXXX"
}
```

`obj_type`：`docx`（默认）、`sheet`、`bitable`、`mindnote`、`file`、`doc`、`slides`

### 移动节点

```json
{ "action": "move", "space_id": "7xxx", "node_token": "wikcnXXX" }
```

移动到不同位置：

```json
{
  "action": "move",
  "space_id": "7xxx",
  "node_token": "wikcnXXX",
  "target_space_id": "7yyy",
  "target_parent_token": "wikcnYYY"
}
```

### 重命名节点

```json
{ "action": "rename", "space_id": "7xxx", "node_token": "wikcnXXX", "title": "新标题" }
```

## Wiki-Doc 工作流

编辑 Wiki 页面：

1. 获取节点：`{ "action": "get", "token": "wiki_token" }` → 返回 `obj_token`
2. 读取文档：`feishu_doc { "action": "read", "doc_token": "obj_token" }`
3. 写入文档：`feishu_doc { "action": "write", "doc_token": "obj_token", "content": "..." }`

## 配置

```yaml
channels:
  feishu:
    tools:
      wiki: true # 默认：true
      doc: true # 必需 - Wiki 内容使用 feishu_doc
```

**依赖：** 此工具需要启用 `feishu_doc`。Wiki 页面是文档——使用 `feishu_wiki` 导航，然后使用 `feishu_doc` 读取/编辑内容。

## 权限

必需：`wiki:wiki` 或 `wiki:wiki:readonly`
