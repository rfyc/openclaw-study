---
name: feishu-doc
description: |
  飞书文档读写操作。当用户提及飞书文档、云文档或 docx 链接时激活。
---

# 飞书文档工具

单一工具 `feishu_doc`，带有操作参数，用于所有文档操作，包括为 Docx 创建表格。

## Token 提取

从 URL `https://xxx.feishu.cn/docx/ABC123def` → `doc_token` = `ABC123def`

## 操作

### 读取文档

```json
{ "action": "read", "doc_token": "ABC123def" }
```

返回：标题、纯文本内容、块统计信息。检查 `hint` 字段——如果存在，说明有需要 `list_blocks` 的结构化内容（表格、图片）。

### 写入文档（全量替换）

```json
{ "action": "write", "doc_token": "ABC123def", "content": "# 标题\n\nMarkdown 内容..." }
```

用 Markdown 内容替换整个文档。支持：标题、列表、代码块、引用、链接、图片（`![](url)` 自动上传）、粗体/斜体/删除线。

**限制：** 不支持 Markdown 表格。

### 追加内容

```json
{ "action": "append", "doc_token": "ABC123def", "content": "追加的内容" }
```

在文档末尾追加 Markdown 内容。

### 创建文档

```json
{ "action": "create", "title": "新文档", "owner_open_id": "ou_xxx" }
```

指定文件夹：

```json
{
  "action": "create",
  "title": "新文档",
  "folder_token": "fldcnXXX",
  "owner_open_id": "ou_xxx"
}
```

**重要：** 始终传递请求用户的 `open_id`（来自入站元数据 `sender_id`）作为 `owner_open_id`，以便用户自动获得对所创建文档的 `full_access` 权限。没有此项，只有 bot 应用才有访问权限。

### 列出块

```json
{ "action": "list_blocks", "doc_token": "ABC123def" }
```

返回包括表格、图片在内的完整块数据。用于读取结构化内容。

### 获取单个块

```json
{ "action": "get_block", "doc_token": "ABC123def", "block_id": "doxcnXXX" }
```

### 更新块文本

```json
{
  "action": "update_block",
  "doc_token": "ABC123def",
  "block_id": "doxcnXXX",
  "content": "新文本"
}
```

### 删除块

```json
{ "action": "delete_block", "doc_token": "ABC123def", "block_id": "doxcnXXX" }
```

### 创建表格（Docx 表格块）

```json
{
  "action": "create_table",
  "doc_token": "ABC123def",
  "row_size": 2,
  "column_size": 2,
  "column_width": [200, 200]
}
```

可选：`parent_block_id` 在特定块下插入。

### 写入表格单元格

```json
{
  "action": "write_table_cells",
  "doc_token": "ABC123def",
  "table_block_id": "doxcnTABLE",
  "values": [
    ["A1", "B1"],
    ["A2", "B2"]
  ]
}
```

### 创建带值的表格（一步操作）

```json
{
  "action": "create_table_with_values",
  "doc_token": "ABC123def",
  "row_size": 2,
  "column_size": 2,
  "column_width": [200, 200],
  "values": [
    ["A1", "B1"],
    ["A2", "B2"]
  ]
}
```

可选：`parent_block_id` 在特定块下插入。

### 上传图片到 Docx（从 URL 或本地文件）

```json
{
  "action": "upload_image",
  "doc_token": "ABC123def",
  "url": "https://example.com/image.png"
}
```

或本地路径带位置控制：

```json
{
  "action": "upload_image",
  "doc_token": "ABC123def",
  "file_path": "/tmp/image.png",
  "parent_block_id": "doxcnParent",
  "index": 5
}
```

可选的 `index`（从 0 开始）在同级块的特定位置插入图片。省略则追加到末尾。

**注意：** 图片显示大小由上传图片的像素尺寸决定。对于小图片（例如 480x270 GIF），上传前缩放到 800px+ 宽度以确保正常显示。

### 上传文件附件到 Docx（从 URL 或本地文件）

```json
{
  "action": "upload_file",
  "doc_token": "ABC123def",
  "url": "https://example.com/report.pdf"
}
```

或本地路径：

```json
{
  "action": "upload_file",
  "doc_token": "ABC123def",
  "file_path": "/tmp/report.pdf",
  "filename": "Q1-report.pdf"
}
```

规则：

- `url` / `file_path` 恰好一个
- 可选的 `filename` 覆盖
- 可选的 `parent_block_id`

## 读取工作流

1. 从 `action: "read"` 开始——获取纯文本 + 统计信息
2. 检查响应中的 `block_types`，查找表格、图片、代码等
3. 如果存在结构化内容，使用 `action: "list_blocks"` 获取完整数据

## 配置

```yaml
channels:
  feishu:
    tools:
      doc: true # 默认：true
```

**注意：** `feishu_wiki` 依赖此工具——Wiki 页面内容通过 `feishu_doc` 读写。

## 权限

必需：`docx:document`、`docx:document:readonly`、`docx:document.block:convert`、`drive:drive`
