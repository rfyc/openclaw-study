---
name: feishu-drive
description: |
  飞书云存储文件管理。当用户提及云空间、文件夹、网盘时激活。
---

# 飞书网盘工具

单一工具 `feishu_drive` 用于云存储操作。

## Token 提取

从 URL `https://xxx.feishu.cn/drive/folder/ABC123` → `folder_token` = `ABC123`

## 操作

### 列出文件夹内容

```json
{ "action": "list" }
```

根目录（无 folder_token）。

```json
{ "action": "list", "folder_token": "fldcnXXX" }
```

返回：带有 token、名称、类型、url、时间戳的文件。

### 获取文件信息

```json
{ "action": "info", "file_token": "ABC123", "type": "docx" }
```

在根目录中搜索文件。注意：文件必须在根目录中，或者先使用 `list` 浏览文件夹。

`type`：`doc`、`docx`、`sheet`、`bitable`、`folder`、`file`、`mindnote`、`shortcut`

### 创建文件夹

```json
{ "action": "create_folder", "name": "新文件夹" }
```

在父文件夹中创建：

```json
{ "action": "create_folder", "name": "新文件夹", "folder_token": "fldcnXXX" }
```

### 移动文件

```json
{ "action": "move", "file_token": "ABC123", "type": "docx", "folder_token": "fldcnXXX" }
```

### 删除文件

```json
{ "action": "delete", "file_token": "ABC123", "type": "docx" }
```

## 文件类型

| 类型       | 描述       |
| ---------- | ---------- |
| `doc`      | 旧格式文档 |
| `docx`     | 新格式文档 |
| `sheet`    | 电子表格   |
| `bitable`  | 多维表格   |
| `folder`   | 文件夹     |
| `file`     | 已上传文件 |
| `mindnote` | 思维导图   |
| `shortcut` | 快捷方式   |

## 配置

```yaml
channels:
  feishu:
    tools:
      drive: true # 默认：true
```

## 权限

- `drive:drive` - 完全访问（创建、移动、删除）
- `drive:drive:readonly` - 只读（列出、查看信息）

## 已知限制

- **机器人没有根文件夹**：飞书机器人使用 `tenant_access_token`，没有自己的"我的空间"。根文件夹概念仅存在于用户账户中。这意味着：
  - 不带 `folder_token` 的 `create_folder` 会失败（400 错误）
  - 机器人只能访问**已与其共享**的文件/文件夹
  - **解决方案**：用户必须首先手动创建文件夹并与机器人共享，然后机器人才能在其中创建子文件夹
