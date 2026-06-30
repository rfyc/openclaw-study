# 飞书块类型参考

飞书文档块类型的完整参考。与 `feishu_doc_list_blocks`、`feishu_doc_update_block` 和 `feishu_doc_delete_block` 一起使用。

## 块类型表

| block_type | 名称            | 描述               | 可编辑 |
| ---------- | --------------- | ------------------ | ------ |
| 1          | Page            | 文档根（包含标题） | 否     |
| 2          | Text            | 纯文本段落         | 是     |
| 3          | Heading1        | H1 标题            | 是     |
| 4          | Heading2        | H2 标题            | 是     |
| 5          | Heading3        | H3 标题            | 是     |
| 6          | Heading4        | H4 标题            | 是     |
| 7          | Heading5        | H5 标题            | 是     |
| 8          | Heading6        | H6 标题            | 是     |
| 9          | Heading7        | H7 标题            | 是     |
| 10         | Heading8        | H8 标题            | 是     |
| 11         | Heading9        | H9 标题            | 是     |
| 12         | Bullet          | 无序列表项         | 是     |
| 13         | Ordered         | 有序列表项         | 是     |
| 14         | Code            | 代码块             | 是     |
| 15         | Quote           | 块引用             | 是     |
| 16         | Equation        | LaTeX 公式         | 部分   |
| 17         | Todo            | 复选框 / 任务项    | 是     |
| 18         | Bitable         | 多维表格           | 否     |
| 19         | Callout         | 高亮块             | 是     |
| 20         | ChatCard        | 聊天卡片嵌入       | 否     |
| 21         | Diagram         | 图表嵌入           | 否     |
| 22         | Divider         | 水平分割线         | 否     |
| 23         | File            | 文件附件           | 否     |
| 24         | Grid            | 网格布局容器       | 否     |
| 25         | GridColumn      | 网格列             | 否     |
| 26         | Iframe          | 嵌入式 iframe      | 否     |
| 27         | Image           | 图片               | 部分   |
| 28         | ISV             | 第三方小组件       | 否     |
| 29         | MindnoteBlock   | 思维导图嵌入       | 否     |
| 30         | Sheet           | 电子表格嵌入       | 否     |
| 31         | Table           | 表格               | 部分   |
| 32         | TableCell       | 表格单元格         | 是     |
| 33         | View            | 视图嵌入           | 否     |
| 34         | Undefined       | 未知类型           | 否     |
| 35         | QuoteContainer  | 引用容器           | 否     |
| 36         | Task            | Lark 任务集成      | 否     |
| 37         | OKR             | OKR 集成           | 否     |
| 38         | OKRObjective    | OKR 目标           | 否     |
| 39         | OKRKeyResult    | OKR 关键结果       | 否     |
| 40         | OKRProgress     | OKR 进度           | 否     |
| 41         | AddOns          | 插件块             | 否     |
| 42         | JiraIssue       | Jira 问题嵌入      | 否     |
| 43         | WikiCatalog     | Wiki 目录          | 否     |
| 44         | Board           | 看板嵌入           | 否     |
| 45         | Agenda          | 议程块             | 否     |
| 46         | AgendaItem      | 议程项             | 否     |
| 47         | AgendaItemTitle | 议程项标题         | 否     |
| 48         | SyncedBlock     | 同步块引用         | 否     |

## 编辑指南

### 基于文本的块（2-17、19）

使用 `feishu_doc_update_block` 更新文本内容：

```json
{
  "doc_token": "ABC123",
  "block_id": "block_xxx",
  "content": "新文本内容"
}
```

### 图片块（27）

图片无法通过 `update_block` 直接更新。使用带有 Markdown 的 `feishu_doc_write` 或 `feishu_doc_append` 添加新图片。

### 表格块（31）

**重要：** 表格块无法通过 `documentBlockChildren.create` API 创建（错误 1770029）。这影响 `feishu_doc_write` 和 `feishu_doc_append`——Markdown 表格将被跳过并显示警告。

表格只能被读取（通过 `list_blocks`），单个单元格（类型 32）可以被更新，但无法通过 Markdown 以编程方式插入新表格。

### 容器块（24、25、35）

Grid 和 QuoteContainer 是布局容器。编辑其子块。

## 常见模式

### 替换特定段落

1. `feishu_doc_list_blocks`——找到 block_id
2. `feishu_doc_update_block`——更新其内容

### 在特定位置插入内容

目前，API 仅支持追加到文档末尾。对于在特定位置插入，考虑：

1. 读取现有内容
2. 删除受影响的块
3. 以所需顺序重新写入新内容

### 删除多个块

块必须逐一删除。先删除子块，再删除父容器。
