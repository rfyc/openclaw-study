---
summary: "使用 apply_patch 工具应用多文件补丁"
read_when:
  - 您需要跨多个文件进行结构化文件编辑
  - 您想记录或调试基于补丁的编辑
title: "apply_patch 工具"
---

使用结构化补丁格式应用文件更改。这非常适合多文件或多块编辑，因为单个 `edit` 调用可能很脆弱。

该工具接受一个包含一个或多个文件操作的 `input` 字符串：

```
*** Begin Patch
*** Add File: path/to/file.txt
+line 1
+line 2
*** Update File: src/app.ts
@@
-old line
+new line
*** Delete File: obsolete.txt
*** End Patch
```

## 参数

- `input`（必填）：包含 `*** Begin Patch` 和 `*** End Patch` 的完整补丁内容。

## 说明

- 补丁路径支持相对路径（从工作区目录）和绝对路径。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（仅限工作区）。仅在您有意希望 `apply_patch` 在工作区目录外写入/删除时才将其设置为 `false`。
- 在 `*** Update File:` 块中使用 `*** Move to:` 重命名文件。
- `*** End of File` 在需要时标记仅 EOF 插入。
- 默认对 OpenAI 和 OpenAI Codex 模型可用。设置 `tools.exec.applyPatch.enabled: false` 可禁用它。
- 可选地通过 `tools.exec.applyPatch.allowModels` 按模型限制。
- 配置仅在 `tools.exec` 下。

## 示例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

## 相关

- [差异](/tools/diffs)
- [Exec 工具](/tools/exec)
- [代码执行](/tools/code-execution)
