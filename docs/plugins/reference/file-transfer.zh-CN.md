---
summary: "通过专用节点命令在配对节点上获取、列出和写入文件。针对最大 16 MB 的二进制文件，通过 node.invoke 使用 base64 传输，绕过 bash stdout 截断限制。"
read_when:
  - 您正在安装、配置或审计 file-transfer 插件
title: "File Transfer 插件"
---

# File Transfer 插件

通过专用节点命令在配对节点上获取、列出和写入文件。针对最大 16 MB 的二进制文件，通过 `node.invoke` 使用 base64 传输，绕过 bash stdout 截断限制。

## 发行版本

- 包名：`@openclaw/file-transfer`
- 安装方式：包含于 OpenClaw 中

## 功能面

contracts: tools
